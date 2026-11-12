"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type SyntheticEvent } from "react";
import { Check, Clapperboard, Play, SkipBack, SkipForward } from "lucide-react";
import { dureeVideo, groupesDeMatiere, matiereDe, type VideoResume } from "@/lib/videos";
import { VIDEOS_TXT as T, dureeTexte, horodatage } from "@/lib/voice-videos";
import s from "./Videos.module.css";
import { EnTeteSousPage, SousPage } from "@/components/ui/SousPage";

export type SourceVideo = { src: string | null; affiche: string | null };

// Page des vidéos résumé. En haut, les trois vidéos (affiche, durée, part déjà vue). Puis le lecteur, avec sous
// l'image la partie en cours, ses commandes (partie précédente, vitesse, partie suivante) et la frise de l'heure
// entière, matière par matière ; à droite, le programme rangé par matière, les chapitres de la partie en cours
// ouverts. Une vidéo d'une heure est une suite de parties jouées à la suite : à la fin d'une partie, la suivante
// démarre seule. L'appareil garde, pour chaque vidéo, l'endroit où on s'est arrêté et ce qu'on a déjà vu
// (localStorage, lu après le montage : le serveur rend la page sans historique).

const VITESSES = [1, 1.25, 1.5, 1.75, 2];
const CLE_VITESSE = "rl_video_vitesse";
const cle = (slug: string) => `rl_video_${slug}`;
/** i : la partie, t : la position dans la partie, vu : les secondes vraiment regardées de chaque partie */
type Suivi = { i: number; t: number; vu: number[] };

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

const partieVue = (vu: number, secondes: number) => vu >= secondes * 0.9;

export function VideosView({
  videos,
  video,
  sources,
  affiches,
}: {
  videos: VideoResume[];
  video: VideoResume | null;
  sources: SourceVideo[];
  /** l'affiche de la première partie de chaque vidéo en ligne, par slug */
  affiches: Record<string, string | null>;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const liste = useRef<HTMLOListElement>(null);
  const derniere = useRef(0);
  const dernierT = useRef<number | null>(null);
  const [partie, setPartie] = useState(0);
  const [saut, setSaut] = useState<{ t: number; jouer: boolean } | null>(null);
  const [t, setT] = useState(0);
  const [vitesse, setVitesse] = useState(1);
  const [vu, setVu] = useState<number[]>([]);
  const [reprise, setReprise] = useState<number | null>(null);
  const [progres, setProgres] = useState<Record<string, number>>({});

  const n = video?.parties.length ?? 0;
  const p = video?.parties[partie] ?? null;
  const source = sources[partie] ?? null;
  // décalage de chaque partie dans la vidéo entière, pour des horaires continus
  const decalages = video ? video.parties.map((_, i) => video.parties.slice(0, i).reduce((x, q) => x + q.secondes, 0)) : [];

  // après le montage : la vitesse de l'appareil, la part vue de chaque vidéo, et la reprise de celle-ci
  useEffect(() => {
    try {
      const r = Number(localStorage.getItem(CLE_VITESSE));
      if (VITESSES.includes(r)) setVitesse(r);
    } catch {}
    const pr: Record<string, number> = {};
    for (const v of videos) {
      const x = lireSuivi(v);
      if (x) pr[v.slug] = partVue(v, x.vu);
    }
    setProgres(pr);
    if (!video) return;
    const x = lireSuivi(video);
    setVu(x?.vu ?? video.parties.map(() => 0));
    const finie = x && x.i === video.parties.length - 1 && x.t >= video.parties[x.i].secondes - 5;
    if (x && !finie && (x.i > 0 || x.t > 5)) {
      const off = video.parties.slice(0, x.i).reduce((a, q) => a + q.secondes, 0);
      setPartie(x.i);
      setT(x.t);
      setSaut({ t: x.t, jouer: false });
      setReprise(off + x.t);
    }
  }, [video, videos]);

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

  // le programme suit la partie en cours (dans sa propre zone de défilement, sans bouger la page)
  useEffect(() => {
    const ol = liste.current;
    if (!ol || ol.scrollHeight <= ol.clientHeight + 4) return;
    const el = ol.querySelector<HTMLElement>(`[data-partie="${partie}"]`);
    if (el) ol.scrollTo({ top: Math.max(0, el.offsetTop - 44), behavior: "smooth" });
  }, [partie]);

  function allerA(i: number, debut: number, jouer = true) {
    setReprise(null);
    dernierT.current = null;
    if (i !== partie) {
      setPartie(i);
      setT(debut);
      setSaut({ t: debut, jouer });
    } else if (ref.current) {
      ref.current.currentTime = debut;
      setT(debut);
      if (jouer) void ref.current.play().catch(() => {});
    }
  }

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

  return (
    <SousPage className={s.page} entete={<EnTeteSousPage retour={{ href: "/reviser", label: T.retour }} illustration={{ nom: "reviser-bibliotheque" }} titre={T.titre} ligne={T.sous} />}>

      <section aria-label={T.lesVideos}>
        <ul className={s.rail}>
          {videos.map((v) => {
            const enLigne = v.etat === "en-ligne" && v.parties.length > 0;
            const courante = v.slug === video?.slug;
            const pct = progres[v.slug];
            const affiche = affiches[v.slug] ?? null;
            const corps = (
              <>
                <span className={s.vignette}>
                  {affiche ? <img src={affiche} alt="" loading="lazy" decoding="async" /> : <Clapperboard size={20} aria-hidden />}
                  {courante && (
                    <span className={s.badge}>
                      <Play size={10} fill="currentColor" aria-hidden /> {T.enLecture}
                    </span>
                  )}
                </span>
                <span className={s.railTexte}>
                  <span className="t-eyebrow">{T.serie(v.numero)}</span>
                  <span className={"font-brand " + s.railTitre}>{v.titre}</span>
                  <span className={s.railMeta}>{enLigne ? `${dureeTexte(dureeVideo(v))} · ${T.parties(v.parties.length)}` : T.enPreparation}</span>
                  {enLigne && (
                    <>
                      <span className={s.jauge} aria-hidden>
                        <span style={{ width: `${pct ?? 0}%` }} />
                      </span>
                      <span className={s.railEtat}>{pct ? (pct < 100 ? `${T.vue(pct)} · ${T.reste(dureeTexte(dureeVideo(v) * (1 - pct / 100)))}` : T.vue(pct)) : T.pasCommencee}</span>
                    </>
                  )}
                </span>
              </>
            );
            return (
              <li key={v.slug} className="min-w-0">
                {enLigne ? (
                  <Link href={`/videos?v=${v.slug}`} aria-current={courante ? "page" : undefined} data-actif={courante ? "1" : undefined} className={s.railCarte}>
                    {corps}
                  </Link>
                ) : (
                  <div className={s.railCarte} data-avenir="1">
                    {corps}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {video && p ? (
        <div className={s.scene}>
          <section className="min-w-0" aria-label={video.titre}>
            <div className={s.ecran}>
              {source?.src ? (
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
                  onTimeUpdate={surTemps}
                  onSeeking={() => (dernierT.current = null)}
                  onPause={(e) => {
                    if (video && vu.length) ecrireSuivi(video.slug, { i: partie, t: e.currentTarget.currentTime, vu });
                  }}
                  onEnded={surFin}
                />
              ) : (
                <div className={s.indispo}>
                  <p>{T.indisponible}</p>
                </div>
              )}
            </div>

            <div className={s.infos}>
              <div className="min-w-0">
                <p className="t-eyebrow">
                  {matiereDe(p)} · {T.partie(partie + 1, n)}
                </p>
                <h2 className="t-h2 mt-1">{p.titre}</h2>
              </div>
              <div className={s.commandes}>
                <button type="button" className="icon-btn" disabled={partie === 0} onClick={() => allerA(partie - 1, 0)} aria-label={T.precedente} title={T.precedente}>
                  <SkipBack size={16} aria-hidden />
                </button>
                <button type="button" className={"btn btn-ghost btn-sm " + s.vitesse} onClick={changerVitesse} aria-label={T.vitesseAide(vitesse)} title={T.vitesseAide(vitesse)}>
                  {T.vitesse(vitesse)}
                </button>
                <button type="button" className="icon-btn" disabled={partie === n - 1} onClick={() => allerA(partie + 1, 0)} aria-label={T.suivante} title={T.suivante}>
                  <SkipForward size={16} aria-hidden />
                </button>
              </div>
            </div>

            <div className={s.frise} role="group" aria-label={T.frise}>
              {groupes.map((g) => (
                <div key={g.matiere + g.parties[0].i} className={s.friseGroupe} style={{ flexGrow: g.secondes }}>
                  <span className={s.friseMatiere}>
                    {g.matiere}
                    <span>{dureeTexte(g.secondes)}</span>
                  </span>
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
              ))}
            </div>
            {reprise !== null && <p className={s.reprise}>{T.reprise(horodatage(reprise))}</p>}
          </section>

          <aside aria-label={T.programme} className={s.programme}>
            <p className={"t-eyebrow " + s.programmeTitre}>
              {T.programme} · {dureeTexte(dureeVideo(video))}
            </p>
            <ol ref={liste} className={s.programmeListe}>
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
                          <button type="button" className={s.ligne} data-actif={courante ? "1" : undefined} aria-current={courante ? "true" : undefined} onClick={() => allerA(i, 0)}>
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
                                  <button type="button" className={s.chapitre} data-actif={k === chapActif ? "1" : undefined} aria-current={k === chapActif ? "true" : undefined} onClick={() => allerA(i, c.debut)}>
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
          </aside>
        </div>
      ) : (
        <div className={s.vide}>
          <Clapperboard size={20} aria-hidden />
          <p className="t-small mt-3">{T.aucune}</p>
        </div>
      )}
    </SousPage>
  );
}
