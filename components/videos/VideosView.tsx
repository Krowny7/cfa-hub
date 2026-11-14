"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type SyntheticEvent } from "react";
import { Check, SkipBack, SkipForward } from "lucide-react";
import { CHAINES, dureeVideo, groupesDeMatiere, numeroDeChaine, type CategorieVideo, type VideoResume } from "@/lib/videos";
import { CHAINES_TXT, VIDEOS_TXT as T, dureeTexte, horodatage } from "@/lib/voice-videos";
import { RETOUR } from "@/lib/voice-reviser";
import { EnTeteSousPage, Etiquette, Scene, SousPage } from "@/components/ui/SousPage";
import s from "./Videos.module.css";

export type SourceVideo = { src: string | null; affiche: string | null };

// La page des vidéos (direction « le lieu, puis l'objet », 2026-11-13) : une télé cathodique, et ses trois chaînes
// (lib/videos : 1 Introduction, 2 Cours, 3 Résumé). Le lecteur joue dans le verre bombé de l'écran ; sous l'écran, sur
// le meuble : la plaque (la partie à l'écran et son titre), la frise de la vidéo matière par matière, puis la console
// (le compteur de la vidéo entière, les touches des chaînes, les trois boutons ronds : partie précédente, vitesse,
// partie suivante ; la grille du haut-parleur sur grand écran). Sous la télé, le guide des programmes de la chaîne ;
// à droite (dessous au téléphone), le programme de la vidéo à l'écran (ses parties rangées par matière, la partie en
// cours ouverte sur ses chapitres). Une chaîne vide montre une neige fixe et ce qu'elle diffusera ; la colonne de
// droite y montre le guide de la chaîne qui a des vidéos.
// Une vidéo est une suite de parties jouées à la suite : à la fin d'une partie, la suivante démarre seule.
// L'appareil garde, pour chaque vidéo, l'endroit où on s'est arrêté et ce qu'on a déjà vu (rl_video_<slug>), la
// vitesse (rl_video_vitesse) et la dernière vidéo lancée (rl_video_derniere) ; tout est lu après le montage (le
// serveur rend la page sans historique). L'écran s'allume une fois à l'arrivée, comme un tube (en CSS, sans attendre
// le script), et s'éteint dès qu'on zappe (touche, fiche du guide), le temps que la page suivante arrive.

const VITESSES = [1, 1.25, 1.5, 1.75, 2];
const CLE_VITESSE = "rl_video_vitesse";
const CLE_DERNIERE = "rl_video_derniere";
const cle = (slug: string) => `rl_video_${slug}`;
/** i : la partie, t : la position dans la partie, vu : les secondes vraiment regardées de chaque partie */
type Suivi = { i: number; t: number; vu: number[] };
/** ce que le guide dit d'une vidéo : la part vue (%) et l'endroit où reprendre (secondes depuis le début), s'il y en a un */
type Etat = { pct: number; reprise: number | null };

const enLigne = (v: VideoResume) => v.etat === "en-ligne" && v.parties.length > 0;

function lireSuivi(v: VideoResume): Suivi | null {
  try {
    const x = JSON.parse(localStorage.getItem(cle(v.slug)) ?? "null") as Partial<Suivi> | null;
    if (!x || typeof x.i !== "number" || !v.parties.length) return null;
    const vu = v.parties.map((p, k) => Math.min(p.secondes, Number(x.vu?.[k]) || 0));
    return { i: Math.min(Math.max(0, x.i), v.parties.length - 1), t: Number(x.t) || 0, vu };
  } catch {
    return null;
  }
}

function ecrireSuivi(slug: string, x: Suivi) {
  try {
    localStorage.setItem(cle(slug), JSON.stringify({ i: x.i, t: Math.round(x.t), vu: x.vu.map((m) => Math.round(m)) }));
  } catch {}
}

/** Part de la vidéo déjà vue, en % (le temps vraiment regardé : un saut en avant ne compte pas). */
function partVue(v: VideoResume, vu: number[]): number {
  const total = dureeVideo(v);
  if (!total) return 0;
  const s = v.parties.reduce((x, p, k) => x + Math.min(vu[k] ?? 0, p.secondes), 0);
  return Math.min(100, Math.round((s / total) * 100));
}

/** L'endroit où reprendre une vidéo (depuis son début), ou null : pas commencée, ou finie. */
function repriseDe(v: VideoResume, x: Suivi | null): number | null {
  if (!x) return null;
  const finie = x.i === v.parties.length - 1 && x.t >= v.parties[x.i].secondes - 5;
  if (finie || (x.i === 0 && x.t <= 5)) return null;
  return v.parties.slice(0, x.i).reduce((a, q) => a + q.secondes, 0) + x.t;
}

const partieVue = (vu: number, secondes: number) => vu >= secondes * 0.9;
const mouvementReduit = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/** un clic simple (pas d'ouverture dans un autre onglet) : la page va vraiment changer ici */
const clicSimple = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

export function VideosView({
  videos,
  chaine,
  video,
  sources,
  choix = "video",
  base = "/videos",
}: {
  videos: VideoResume[];
  /** la chaîne à l'écran */
  chaine: CategorieVideo;
  /** la vidéo à l'écran (null : la chaîne n'a rien à l'antenne) */
  video: VideoResume | null;
  sources: SourceVideo[];
  /** ce que l'adresse demandait : une vidéo (?v=), une chaîne (?chaine=) ou rien ; sans vidéo demandée, la télé
   *  passe après le montage à la dernière vidéo lancée sur l'appareil */
  choix?: "video" | "chaine" | "auto";
  /** l'adresse de la page (une route d'essai en donne une autre) */
  base?: string;
}) {
  const router = useRouter();
  const ref = useRef<HTMLVideoElement>(null);
  const liste = useRef<HTMLOListElement>(null);
  const tele = useRef<HTMLDivElement>(null);
  const derniere = useRef(0);
  const dernierT = useRef<number | null>(null);
  const [partie, setPartie] = useState(0);
  const [saut, setSaut] = useState<{ t: number; jouer: boolean } | null>(null);
  const [t, setT] = useState(0);
  const [vitesse, setVitesse] = useState(1);
  const [vu, setVu] = useState<number[]>([]);
  const [reprise, setReprise] = useState<number | null>(null);
  /** l'état des autres vidéos de la chaîne, lu sur l'appareil après le montage (null avant) */
  const [etats, setEtats] = useState<Record<string, Etat> | null>(null);
  /** la dernière vidéo lancée sur l'appareil (la touche de sa chaîne y mène tout droit) */
  const [derniereVue, setDerniereVue] = useState<string | null>(null);
  /** la télé passe à une autre vidéo (la dernière lancée) : l'écran reste noir le temps du changement */
  const [zappe, setZappe] = useState(false);
  /** la vidéo joue : les effets du verre s'effacent à moitié, pour lire les formules */
  const [enLecture, setEnLecture] = useState(false);

  const n = video?.parties.length ?? 0;
  const p = video?.parties[partie] ?? null;
  const source = sources[partie] ?? null;
  // décalage de chaque partie dans la vidéo entière, pour des horaires continus
  const decalages = video ? video.parties.map((_, i) => video.parties.slice(0, i).reduce((x, q) => x + q.secondes, 0)) : [];
  const numero = numeroDeChaine(chaine);
  const nomChaine = CHAINES_TXT[chaine];
  const programmes = videos.filter((v) => v.categorie === chaine).sort((a, b) => a.numero - b.numero);
  const aLAntenne = programmes.filter(enLigne);

  // après le montage : la vitesse de l'appareil, la reprise de cette vidéo, l'état des autres vidéos de la chaîne ;
  // puis, si l'adresse ne demandait pas une vidéo précise, la dernière vidéo lancée
  useEffect(() => {
    try {
      const r = Number(localStorage.getItem(CLE_VITESSE));
      if (VITESSES.includes(r)) setVitesse(r);
    } catch {}
    // toutes les vidéos en ligne : celles de la chaîne, et celles du guide montré à côté d'une chaîne vide
    setEtats(Object.fromEntries(videos.filter(enLigne).map((v) => {
      const x = lireSuivi(v);
      return [v.slug, { pct: x ? partVue(v, x.vu) : 0, reprise: repriseDe(v, x) }] as [string, Etat];
    })));
    let dern: VideoResume | undefined;
    try {
      const d = localStorage.getItem(CLE_DERNIERE);
      dern = videos.find((v) => v.slug === d && enLigne(v));
    } catch {}
    if (dern) setDerniereVue(dern.slug);
    if (video) {
      const x = lireSuivi(video);
      setVu(x?.vu ?? video.parties.map(() => 0));
      const r = repriseDe(video, x);
      if (x && r !== null) {
        setPartie(x.i);
        setT(x.t);
        setSaut({ t: x.t, jouer: false });
        setReprise(r);
      }
    }
    if (choix !== "video" && dern && dern.slug !== video?.slug && (choix === "auto" || dern.categorie === chaine)) {
      // l'écran s'éteint le temps de passer à cette vidéo
      setZappe(true);
      router.replace(`${base}?v=${dern.slug}`, { scroll: false });
    }
    // une seule fois : la vue est remontée (key) à chaque vidéo ou chaîne
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // se placer au bon moment (changement de partie, reprise), puis lire si demandé
  useEffect(() => {
    const v = ref.current;
    if (!v || !saut) return;
    const aller = () => {
      v.currentTime = saut.t;
      if (saut.jouer) void v.play().catch(() => {});
      setSaut(null);
    };
    if (v.readyState >= 1) aller();
    else v.addEventListener("loadedmetadata", aller, { once: true });
    return () => v.removeEventListener("loadedmetadata", aller);
  }, [saut, partie]);

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = vitesse;
  }, [vitesse]);

  // garder la position toutes les 4 s (et à la pause, plus bas) ; rien avant la lecture de l'appareil
  useEffect(() => {
    if (!video || !vu.length) return;
    const now = Date.now();
    if (now - derniere.current < 4000) return;
    derniere.current = now;
    ecrireSuivi(video.slug, { i: partie, t, vu });
  }, [video, partie, t, vu]);

  // le programme suit la partie en cours (dans sa propre zone de défilement, sans bouger la page), seulement
  // quand elle n'y est pas déjà visible
  useEffect(() => {
    const ol = liste.current;
    if (!ol || ol.scrollHeight <= ol.clientHeight + 4) return;
    const el = ol.querySelector<HTMLElement>(`[data-partie="${partie}"]`);
    if (!el) return;
    const haut = el.offsetTop;
    if (haut >= ol.scrollTop + 8 && haut + el.offsetHeight <= ol.scrollTop + ol.clientHeight - 8) return;
    ol.scrollTo({ top: Math.max(0, haut - 44), behavior: mouvementReduit() ? "auto" : "smooth" });
  }, [partie]);

  /** `depuisListe` : l'appel vient du programme ; au téléphone (programme sous la télé), la télé revient à l'écran */
  function allerA(i: number, debut: number, jouer = true, depuisListe = false) {
    setReprise(null);
    dernierT.current = null;
    if (i !== partie) {
      setPartie(i);
      setT(debut);
      setSaut({ t: debut, jouer });
      setEnLecture(false);
    } else if (ref.current) {
      ref.current.currentTime = debut;
      setT(debut);
      if (jouer) void ref.current.play().catch(() => {});
    }
    const el = tele.current;
    if (depuisListe && el && window.matchMedia("(max-width: 979px)").matches) {
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ block: "start", behavior: mouvementReduit() ? "auto" : "smooth" });
    }
  }

  /** zapper (touche d'une autre chaîne, fiche d'une autre vidéo) : l'écran s'éteint et le son se coupe tout de suite
   *  (la pause garde l'endroit) ; le remontage de la vue rallume l'écran */
  const zapper = (e: MouseEvent) => {
    if (!clicSimple(e)) return;
    ref.current?.pause();
    setZappe(true);
  };

  // le temps regardé : l'écart entre deux mises à jour pendant la lecture (un saut remet le compteur à zéro)
  function surTemps(e: SyntheticEvent<HTMLVideoElement>) {
    const v = e.currentTarget;
    const tt = v.currentTime;
    setT(tt);
    const avant = dernierT.current;
    dernierT.current = tt;
    if (avant === null || v.paused || v.seeking || !p) return;
    const d = tt - avant;
    if (d <= 0 || d > 1.5 * Math.max(1, v.playbackRate)) return;
    const plafond = p.secondes;
    setVu((m) => {
      if (!m.length) return m;
      const x = m.slice();
      x[partie] = Math.min(plafond, (x[partie] ?? 0) + d);
      return x;
    });
  }

  function surFin() {
    if (!video || !p) return;
    if (vu.length) ecrireSuivi(video.slug, { i: partie < n - 1 ? partie + 1 : partie, t: partie < n - 1 ? 0 : p.secondes, vu });
    if (partie < n - 1) allerA(partie + 1, 0);
  }

  function changerVitesse() {
    const r = VITESSES[(VITESSES.indexOf(vitesse) + 1) % VITESSES.length];
    setVitesse(r);
    try {
      localStorage.setItem(CLE_VITESSE, String(r));
    } catch {}
  }

  let chapActif = -1;
  if (p) p.chapitres.forEach((c, k) => t >= c.debut && (chapActif = k));
  const groupes = video ? groupesDeMatiere(video) : [];
  const pct = video ? partVue(video, vu) : 0;
  const total = video ? dureeVideo(video) : 0;
  // l'appareil lu (le suivi arrive après le montage) : avant, le chiffre-héros, la ligne et les parts vues restent invisibles
  const lu = etats !== null && (!video || vu.length > 0);
  const voile = { className: s.voile, style: { opacity: lu ? 1 : 0 } };
  const etatDe = (v: VideoResume): Etat | null => (v.slug === video?.slug ? (lu ? { pct, reprise: null } : null) : (etats?.[v.slug] ?? null));

  // la chaîne entière : ce qu'il en reste à voir, combien de vidéos entamées et vues
  const parts = aLAntenne.map((v) => ({ v, pct: etatDe(v)?.pct ?? 0 }));
  const dureeChaine = aLAntenne.reduce((x, v) => x + dureeVideo(v), 0);
  const resteChaine = parts.reduce((x, { v, pct: q }) => x + dureeVideo(v) * (1 - q / 100), 0);
  const entamees = parts.filter((x) => x.pct > 0 && x.pct < 100).length;
  const vues = parts.filter((x) => x.pct >= 100).length;
  const heros = !aLAntenne.length
    ? null
    : vues === aLAntenne.length
      ? { valeur: T.herosFini(vues), legende: vues > 1 ? T.herosVue : T.herosVueUne }
      : entamees + vues > 0
        ? { valeur: T.heures(resteChaine / 60), legende: T.herosReste }
        : { valeur: T.heures(dureeChaine / 60), legende: T.herosNeuve };
  // une chaîne vide : la chaîne qui a des vidéos, dont le guide remplit la colonne de droite
  const ailleurs = video ? undefined : CHAINES.find((c) => c.categorie !== chaine && videos.some((v) => v.categorie === c.categorie && enLigne(v)));
  const programmesAilleurs = ailleurs ? videos.filter((v) => v.categorie === ailleurs.categorie).sort((a, b) => a.numero - b.numero) : [];
  // la ligne d'état : la chaîne à l'écran (l'endroit où reprendre est sur le compteur de la télé, pas ici) ; une chaîne
  // vide n'en a pas (l'écran dit « Bientôt », la colonne de droite montre ce qui est à l'antenne ailleurs)
  const ligne = aLAntenne.length ? (
    <i {...voile}>
      {[
        T.nbVideos(aLAntenne.length),
        entamees + vues === 0 ? T.aucuneCommencee(aLAntenne.length) : null,
        entamees > 0 ? T.entamees(entamees) : null,
        // tout vu : le chiffre-héros le dit déjà (« 3/3 »)
        vues > 0 && vues < aLAntenne.length ? T.vues(vues) : null,
      ]
        .filter(Boolean)
        .join(" · ")}
    </i>
  ) : null;
  // la touche d'une autre chaîne : tout droit à la dernière vidéo lancée si elle y est, sinon la chaîne (la touche
  // allumée n'est pas un lien : elle ne change jamais le programme)
  const lienChaine = (c: CategorieVideo) => {
    const d = derniereVue ? videos.find((v) => v.slug === derniereVue) : undefined;
    return d && d.categorie === c ? `${base}?v=${d.slug}` : `${base}?chaine=${c}`;
  };
  const position = video ? (decalages[partie] ?? 0) + t : 0;
  const lecteur = !!(video && source?.src);

  // une fiche du guide : la vidéo à l'écran n'est pas un lien (rien à recharger) ; les autres zappent
  const fiche = (v: VideoResume) => {
    const courante = v.slug === video?.slug;
    const e = etatDe(v);
    const dv = dureeVideo(v);
    // deux lignes : la durée et la part vue, puis ce qu'il en reste (à l'écran) ou l'endroit où reprendre
    const vueTxt = e && e.pct > 0 ? ` · ${T.vue(e.pct)}` : "";
    const suite = !e ? null : courante ? (e.pct > 0 && e.pct < 100 ? T.reste(dureeTexte(dv * (1 - e.pct / 100))) : null) : e.reprise !== null ? T.repriseCourte(horodatage(e.reprise)) : null;
    const corps = (
      <>
        <span className={s.emNum}>{v.numero}</span>
        <span className={s.emCorps}>
          <span className={s.emTitre}>{v.titre}</span>
          <span className={s.emMeta}>
            {enLigne(v) ? dureeTexte(dv) : T.enPreparation}
            <i {...voile}>{vueTxt}</i>
          </span>
          {suite && (
            <span className={s.emMeta} data-suite="1">
              <i {...voile}>{suite}</i>
            </span>
          )}
          {enLigne(v) && (
            <span className={s.emBarre} aria-hidden>
              <i style={{ "--part": lu ? (e?.pct ?? 0) : 0 } as CSSProperties} />
            </span>
          )}
        </span>
        {courante && <span className={s.antenne}>{T.aLEcran}</span>}
      </>
    );
    return (
      <li key={v.slug}>
        {courante ? (
          <span className={s.emission} data-actif="1" aria-current="page">
            {corps}
          </span>
        ) : enLigne(v) ? (
          <Link href={`${base}?v=${v.slug}`} scroll={false} className={s.emission + " rl-presse"} onClick={zapper}>
            {corps}
          </Link>
        ) : (
          <span className={s.emission} data-avenir="1">
            {corps}
          </span>
        )}
      </li>
    );
  };

  return (
    <SousPage
      className={s.page}
      entete={
        <EnTeteSousPage
          retour={RETOUR.reviser}
          illustration={{ nom: "reviser-salon", position: "50% 30%" }}
          titre={T.titre}
          ligne={ligne}
          heros={heros ? { valeur: <i {...voile}>{heros.valeur}</i>, legende: <i {...voile}>{heros.legende}</i> } : null}
        />
      }
    >
      <Scene>
        <div className={s.salon}>
          <div className={s.gauche}>
            {/* ——— la télé ——— */}
            <div ref={tele} className={s.poste}>
              <section className={s.meuble} aria-label={T.tele}>
                <div className={s.masque}>
                  <div className={s.verre} data-ecran={lecteur ? "video" : "neige"} data-lecture={enLecture ? "1" : undefined} data-zappe={zappe ? "1" : undefined}>
                    {lecteur && source?.src ? (
                      <video
                        ref={ref}
                        key={source.src}
                        src={source.src}
                        poster={source.affiche ?? undefined}
                        controls
                        playsInline
                        preload="metadata"
                        onLoadedMetadata={(e) => {
                          e.currentTarget.defaultPlaybackRate = vitesse;
                          e.currentTarget.playbackRate = vitesse;
                        }}
                        onPlay={() => {
                          setEnLecture(true);
                          // relancée : le compteur ne dit plus « reprise »
                          setReprise(null);
                          try {
                            if (video) localStorage.setItem(CLE_DERNIERE, video.slug);
                          } catch {}
                        }}
                        onTimeUpdate={surTemps}
                        onSeeking={() => (dernierT.current = null)}
                        onPause={(e) => {
                          setEnLecture(false);
                          if (video && vu.length) ecrireSuivi(video.slug, { i: partie, t: e.currentTarget.currentTime, vu });
                        }}
                        onEnded={() => {
                          setEnLecture(false);
                          surFin();
                        }}
                      />
                    ) : (
                      <div className={s.neige}>
                        <p className={s.carton}>
                          <b>{video ? T.incrustation(numero, nomChaine.court) : T.bientot}</b>
                          <span>{video ? T.indisponible : nomChaine.promesse}</span>
                        </p>
                      </div>
                    )}
                    {lecteur && (
                      <span className={s.incruste} aria-hidden>
                        {T.incrustation(numero, nomChaine.court)}
                      </span>
                    )}
                    <span className={s.vitre} aria-hidden />
                    <span className={s.noir} aria-hidden />
                  </div>
                </div>

                {/* la plaque : ce qui passe, écrit sur le meuble */}
                <p className={s.plaque}>
                  {video && p ? (
                    <>
                      <b>{T.partieCourte(partie + 1, n)}</b>
                      <span title={p.titre}>{p.titre}</span>
                    </>
                  ) : (
                    <>
                      <b>{T.chaineCourte(numero)}</b>
                      <span>{nomChaine.nom}</span>
                    </>
                  )}
                </p>

                <div className={s.panneau}>
                  <div className={s.cadran} role="group" aria-label={T.compteur}>
                    <b>{video ? horodatage(position) : T.compteurVide}</b>
                    <span data-reprise={video && reprise !== null ? "1" : undefined}>
                      {video ? (reprise !== null ? T.cadranReprise : T.cadranTotal(horodatage(total))) : T.cadranTotalVide}
                    </span>
                  </div>
                  <nav className={s.touches} aria-label={T.chaines}>
                    {CHAINES.map((c) => {
                      const contenu = (
                        <>
                          <i className={s.lampe} aria-hidden />
                          <b>{c.numero}</b>
                          <span>{CHAINES_TXT[c.categorie].court}</span>
                        </>
                      );
                      return c.categorie === chaine ? (
                        <span key={c.categorie} className={s.touche} aria-current="page" title={T.chaine(c.numero, CHAINES_TXT[c.categorie].nom)}>
                          {contenu}
                        </span>
                      ) : (
                        <Link
                          key={c.categorie}
                          href={lienChaine(c.categorie)}
                          scroll={false}
                          className={s.touche}
                          onClick={zapper}
                          aria-label={T.chaine(c.numero, CHAINES_TXT[c.categorie].nom)}
                          title={CHAINES_TXT[c.categorie].nom}
                        >
                          {contenu}
                        </Link>
                      );
                    })}
                  </nav>
                  <div className={s.boutons}>
                    <button type="button" className={s.rond} disabled={!video || partie === 0} onClick={() => allerA(partie - 1, 0)} aria-label={T.precedente} title={T.precedente}>
                      <SkipBack size={15} aria-hidden />
                    </button>
                    <button type="button" className={s.rond + " " + s.vitesse} disabled={!video} onClick={changerVitesse} aria-label={T.vitesseAide(vitesse)} title={T.vitesseAide(vitesse)}>
                      {T.vitesse(vitesse)}
                    </button>
                    <button type="button" className={s.rond} disabled={!video || partie === n - 1} onClick={() => allerA(partie + 1, 0)} aria-label={T.suivante} title={T.suivante}>
                      <SkipForward size={15} aria-hidden />
                    </button>
                  </div>
                  <span className={s.grille} aria-hidden />
                </div>

                <div className={s.frise} role="group" aria-label={T.frise}>
                  {video ? (
                    groupes.map((g) => (
                      <div key={g.matiere + g.parties[0].i} className={s.friseGroupe} style={{ flexGrow: g.secondes }}>
                        <span className={s.friseMatiere}>{g.matiere}</span>
                        <span className={s.friseParties}>
                          {g.parties.map(({ partie: q, i }) => {
                            const part = Math.min(1, (vu[i] ?? 0) / q.secondes);
                            return (
                              <button
                                key={i}
                                type="button"
                                className={s.segment}
                                data-actif={i === partie ? "1" : undefined}
                                style={{ flexGrow: q.secondes, "--vu": part, "--tete": i === partie ? t / q.secondes : 0 } as CSSProperties}
                                onClick={() => allerA(i, 0)}
                                aria-label={T.allerPartie(i + 1, q.titre)}
                                title={q.titre}
                              />
                            );
                          })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className={s.friseVide} aria-hidden />
                  )}
                </div>
              </section>
              {/* quatre pieds de console, évasés : les deux de derrière, plus courts et dans l'ombre */}
              <div className={s.pieds} aria-hidden>
                <i data-pied="arriere" />
                <i data-pied="arriere" />
                <i />
                <i />
              </div>
            </div>

            {/* ——— sous la télé, le guide des programmes de la chaîne (rien pour une chaîne sans programme) ——— */}
            {programmes.length > 0 && (
              <section className={s.zone} aria-label={T.guide(numero, nomChaine.nom)}>
                <Etiquette as="h2">{T.guide(numero, nomChaine.nom)}</Etiquette>
                <ol className={s.guide}>{programmes.map(fiche)}</ol>
              </section>
            )}
          </div>

          {/* ——— à droite (dessous au téléphone), le programme de la vidéo à l'écran ; sur une chaîne vide, le guide
                de la chaîne qui a des vidéos (la télé ne bouge pas quand on zappe) ——— */}
          {!video && ailleurs && (
            <section className={s.zone} aria-label={T.guide(ailleurs.numero, CHAINES_TXT[ailleurs.categorie].nom)}>
              <Etiquette as="h2">{T.guide(ailleurs.numero, CHAINES_TXT[ailleurs.categorie].nom)}</Etiquette>
              <ol className={s.guide + " " + s.guideColonne}>{programmesAilleurs.map(fiche)}</ol>
            </section>
          )}
          {video && (
            <section className={s.zone + " " + s.colonne} aria-label={T.programme}>
              <Etiquette as="h2">{T.programme}</Etiquette>
              <ol ref={liste} className={s.programme}>
                {groupes.map((g) => (
                  <li key={g.matiere + g.parties[0].i}>
                    <p className={s.groupeTitre}>
                      <span>{g.matiere}</span>
                      <span className={s.groupeDuree}>{dureeTexte(g.secondes)}</span>
                    </p>
                    <ol>
                      {g.parties.map(({ partie: q, i }) => {
                        const courante = i === partie;
                        const vue = partieVue(vu[i] ?? 0, q.secondes);
                        return (
                          <li key={i} data-partie={i}>
                            <button type="button" className={s.ligne} data-actif={courante ? "1" : undefined} aria-current={courante ? "true" : undefined} onClick={() => allerA(i, 0, true, true)}>
                              <span className={s.num} data-vue={vue && !courante ? "1" : undefined}>
                                {vue && !courante ? <Check size={13} strokeWidth={3} aria-label={T.partieVue} /> : String(i + 1).padStart(2, "0")}
                              </span>
                              <span className={s.ligneTitre}>{q.titre}</span>
                              <span className={s.heure}>{horodatage(decalages[i])}</span>
                            </button>
                            {courante && (
                              <ol className={s.chapitres}>
                                {q.chapitres.map((c, k) => (
                                  <li key={k}>
                                    <button type="button" className={s.chapitre} data-actif={k === chapActif ? "1" : undefined} aria-current={k === chapActif ? "true" : undefined} onClick={() => allerA(i, c.debut, true, true)}>
                                      <span className={s.heure}>{horodatage(decalages[i] + c.debut)}</span>
                                      <span className="min-w-0 flex-1">{c.titre}</span>
                                    </button>
                                  </li>
                                ))}
                              </ol>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </Scene>
    </SousPage>
  );
}
