"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronDown, Clapperboard, EyeOff, GripVertical, ImagePlay, ImagePlus, MoreHorizontal, Plus, SlidersHorizontal, Trash2, X } from "lucide-react";
import { GrilleProfil } from "@/components/profil/GrilleProfil";
import { BlocProfil, ICONE_BLOC, couvertureDe } from "@/components/profil/BlocsProfil";
import { BanqueGifs } from "@/components/profil/BanqueGifs";
import { Feuille } from "@/components/ui/Feuille";
import type { GifBanque } from "@/lib/profil/gifs";
import type { DonneesBlocs } from "@/lib/profil/blocs-donnees";
import { VITRINE, VITRINE_MAX, type VitrineKey } from "@/lib/profil/catalogue";
import {
  BLOCS,
  FORMATS,
  FORMAT_DEFAUT,
  LEGENDE_MAX,
  VIDEO_MAX_SECONDES,
  blocsDe,
  cleDe,
  estLibre,
  estMedia,
  formatsDe,
  genreDe,
  nomBloc,
  nomFormat,
  nouvelId,
  placesVides,
  portee,
  raisonRefus,
  rangees,
  type Bloc,
  type BlocMedia,
  type CaseGrille,
  type CleBloc,
  type Disposition,
  type Format,
  type PlaceVide,
} from "@/lib/profil/disposition";
import { ajouter, blocsMasques, changerFormat, deplacer, deplacerA, deplacerVers, echanger, fermerPlace, mettreALaPlace, peutAjouterMedia, remplirPlace, retirer } from "@/lib/profil/page-edition";
import { Refus, envoyerMedia, estFichierVideo } from "@/lib/profil/envoi-media";
import { EDITEUR_PAGE as T } from "@/lib/voice-editeur";
import s from "./EditeurPage.module.css";

// Personnaliser · Ta page : la vraie page, en direct, éditable sur place
// (variante B, « grille modulaire »). La page est une liste ordonnée de
// blocs, chacun à l'un des 3 formats du site (tuile, héros, bande) ; les
// rangées se forment seules (GrilleProfil). Chaque bloc porte UNE barre
// d'outils de hauteur fixe, la même dans tous les formats : la poignée et
// le nom · « Format ▾ » (ordinateur ; un format refusé dit pourquoi) · les
// réglages du bloc (chiffres clés, légende, cadrage, couverture, folio,
// Journal) · « ⋯ » (avant / après, mettre un autre bloc à la place ou
// échanger, masquer ou retirer). Une place libre (ordinateur) propose
// « + Choisir un module » ; dessous, « Ajouter à ta page ».
// Déplacer marche au doigt comme à la souris (événements pointeur, pas le
// glisser HTML5, muet sur téléphone) : appui long sur la poignée, puis
// glisser sur un autre bloc (échange) ou sur une place libre ; à la souris,
// il suffit de tirer. Sur téléphone, une colonne : pas de format ni de
// place libre, les flèches deviennent ↑ ↓ et les outils font 44 px.
// Les opérations sont dans lib/profil/page-edition.ts, les envois dans
// lib/profil/envoi-media.ts ; rien n'est écrit ici : Personnaliser
// enregistre (le serveur revalide la liste).

/** l'appui long qui soulève un bloc au doigt */
const APPUI_LONG_MS = 380;
/** près du bord de l'écran, la page défile pendant qu'on tire */
const BORD_PX = 90;

/** où l'on pose un bloc tenu : un élément de la liste (bloc ou place libre), ou la fin d'une rangée */
type Cible = { type: "case"; i: number } | { type: "place"; rangee: number };
/** le menu ouvert : son genre et le bloc (sa clé) */
type Menu = { type: "format" | "reglages" | "plus"; cle: string };

/** La vignette d'un format : 12 colonnes, sa portée en plein. */
function Vignette({ f }: { f: Format }) {
  const p = portee(f);
  return (
    <span aria-hidden className={s.vignette}>
      <span className={s.plein} style={{ gridColumn: `span ${p}` }} />
      {p < 12 && <span style={{ gridColumn: `span ${12 - p}` }} />}
    </span>
  );
}

/** Ordinateur (dès 1 024 px) : les formats et les places libres jouent. */
const grandEcran = () => window.matchMedia("(min-width: 1024px)").matches;

/** ce qui prend le focus dans un menu de la barre */
const FOCALISABLES = 'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * Un menu de la barre, posé par-dessus la page sous son bouton (au-dessus
 * s'il manque de place) : hors de la grille, dont les cases enferment ce
 * qu'elles contiennent. Il suit son bouton (défilement, redimensionnement),
 * se ferme au clic dehors et à Échap. Au clavier, c'est une petite fenêtre
 * (il porte des champs, des liens, un curseur : pas un role="menu") : à
 * l'ouverture, le focus y entre (le choix en cours, sinon le premier) ; Tab
 * y tourne ; à la fermeture, le focus revient à son bouton.
 */
function MenuFlottant({ ancre, largeur, label, onFermer, children }: { ancre: string; largeur: number; label: string; onFermer: () => void; children: React.ReactNode }) {
  const [pos, setPos] = useState<React.CSSProperties | null>(null);
  const fermer = useRef(onFermer);
  const placer = useRef<() => void>(() => undefined);
  const panneau = useRef<HTMLDivElement | null>(null);
  const voile = useRef<HTMLButtonElement | null>(null);
  const entre = useRef(false);
  // le focus entre dans le menu dès qu'il est posé (une fois)
  useEffect(() => {
    const p = panneau.current;
    if (!pos || !p || entre.current) return;
    entre.current = true;
    (p.querySelector<HTMLElement>('[aria-pressed="true"]:not([disabled])') ?? p.querySelector<HTMLElement>(FOCALISABLES) ?? p).focus();
  }, [pos]);
  // à la fermeture (Échap, clic dehors, un choix fait) : le focus revient au bouton du menu, s'il était dedans
  useLayoutEffect(
    () => () => {
      const a = document.activeElement;
      if (a && a !== document.body && !panneau.current?.contains(a) && a !== voile.current) return;
      document.querySelector<HTMLElement>(`[data-ancre="${ancre}"]`)?.focus();
    },
    [ancre],
  );
  /** Tab tourne dans le menu (le voile retient la page derrière). */
  const tourner = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !panneau.current) return;
    const f = Array.from(panneau.current.querySelectorAll<HTMLElement>(FOCALISABLES));
    if (!f.length) return e.preventDefault();
    const premier = f[0];
    const dernier = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === premier || document.activeElement === panneau.current)) {
      e.preventDefault();
      dernier.focus();
    } else if (!e.shiftKey && document.activeElement === dernier) {
      e.preventDefault();
      premier.focus();
    }
  };
  // à chaque rendu (le bloc a pu changer de rangée) : le menu sous son bouton, au-dessus s'il manque de
  // place ; seulement s'il a bougé. Sans bouton (bloc retiré), le menu se ferme.
  useLayoutEffect(() => {
    fermer.current = onFermer;
    placer.current = () => {
      const el = document.querySelector<HTMLElement>(`[data-ancre="${ancre}"]`);
      if (!el) return fermer.current();
      const r = el.getBoundingClientRect();
      const w = Math.min(largeur, window.innerWidth - 16);
      const left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8));
      const bas = window.innerHeight - r.bottom - 12;
      const haut = r.top - 12;
      const p: React.CSSProperties =
        bas >= 280 || bas >= haut
          ? { left, width: w, top: r.bottom + 6, maxHeight: Math.max(160, bas - 6) }
          : { left, width: w, bottom: window.innerHeight - r.top + 6, maxHeight: Math.max(160, haut - 6) };
      setPos((v) => (JSON.stringify(v) === JSON.stringify(p) ? v : p));
    };
    placer.current();
  });
  useLayoutEffect(() => {
    const placerIci = () => placer.current();
    const echap = (e: KeyboardEvent) => e.key === "Escape" && fermer.current();
    window.addEventListener("resize", placerIci);
    window.addEventListener("scroll", placerIci, true);
    window.addEventListener("keydown", echap);
    return () => {
      window.removeEventListener("resize", placerIci);
      window.removeEventListener("scroll", placerIci, true);
      window.removeEventListener("keydown", echap);
    };
  }, []);
  return createPortal(
    <>
      {/* le voile : pour la souris et le doigt (au clavier, Échap) */}
      <button ref={voile} type="button" tabIndex={-1} aria-hidden className={s.voile} onClick={() => fermer.current()} />
      <div ref={panneau} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className={s.menu} style={pos ?? { visibility: "hidden" }} onKeyDown={tourner}>
        {children}
      </div>
    </>,
    document.body,
  );
}

export function EditeurPage({
  disposition,
  onChange,
  donnees,
  showcase,
  onShowcase,
  supabase,
  banqueGifs = false,
  onEnvoi,
}: {
  disposition: Disposition;
  onChange: (d: Disposition) => void;
  /** ce que les blocs montrent (la couleur et les chiffres clés du brouillon) */
  donnees: DonneesBlocs;
  showcase: VitrineKey[];
  onShowcase: (v: VitrineKey[]) => void;
  supabase: SupabaseClient;
  /** la banque de GIF est branchée (clé KLIPY présente sur le serveur) */
  banqueGifs?: boolean;
  /** un envoi est en cours (l'enregistrement attend) */
  onEnvoi?: (enCours: boolean) => void;
}) {
  const d = disposition;
  const [choisi, setChoisi] = useState<string | null>(d.length ? cleDe(d[0], 0) : null);
  const [menu, setMenu] = useState<Menu | null>(null);
  // la feuille « Choisir un module » : ouverte depuis une place vide (destination), ou pour la fin de la page (null)
  const [feuille, setFeuille] = useState<{ destination: PlaceVide | null } | null>(null);
  const [banque, setBanque] = useState(false);
  const [envoi, setEnvoi] = useState<{ enCours: boolean; texte: string } | null>(null);
  const [tire, setTire] = useState<number | null>(null);
  const [cible, setCible] = useState<Cible | null>(null);
  const [fantome, setFantome] = useState<{ x: number; y: number; nom: string } | null>(null);
  // où ira le prochain média (envoi ou GIF), et la liste la plus récente (l'envoi prend du temps)
  const destination = useRef<PlaceVide | null>(null);
  const courante = useRef(d);
  useEffect(() => {
    courante.current = d;
  });

  const lignes = rangees(d);
  const blocs = blocsDe(d);
  const masques = blocsMasques(d);
  const medias = blocs.filter(estMedia).length;
  const permisImage = peutAjouterMedia(d, false);
  const permisVideo = peutAjouterMedia(d, true);
  const raisonVideo = permisVideo.raison === T.refusVideo ? T.videoPrise : permisVideo.raison;
  const occupe = !!envoi?.enCours;

  /** Applique une opération ; une opération refusée (même liste) ne change rien. */
  const appliquer = (l: Disposition) => {
    if (l !== d) onChange(l);
  };
  const basculer = (m: Menu) => setMenu((v) => (v && v.type === m.type && v.cle === m.cle ? null : m));

  /** La place vide d'un élément « libre », ou de la fin d'une rangée. */
  const placeDe = (c: Cible, l: Disposition): PlaceVide | null => {
    const rs = rangees(l);
    if (c.type === "place") return rs[c.rangee] ? (placesVides(rs[c.rangee], c.rangee).find((p) => p.i === null) ?? null) : null;
    for (let k = 0; k < rs.length; k++) {
      const p = placesVides(rs[k], k).find((x) => x.i === c.i);
      if (p) return p;
    }
    return null;
  };

  // ── le glisser au pointeur : l'appui (long au doigt), le fantôme qui suit, la place visée sous le doigt ──
  const deposer = (i: number, c: Cible) => {
    const l = courante.current;
    if (c.type === "case") {
      if (c.i === i || !l[c.i]) return;
      if (estLibre(l[c.i])) {
        const p = placeDe(c, l);
        if (p) appliquer(deplacerVers(l, i, p));
      }
      // sur un autre bloc : sur ordinateur, ils échangent place et format ; au téléphone (une colonne,
      // où l'on ne voit pas les formats), il vient à sa place et chacun garde son format
      else appliquer(grandEcran() ? echanger(l, i, c.i) : deplacerA(l, i, c.i));
      return;
    }
    const p = placeDe(c, l);
    if (p) appliquer(deplacerVers(l, i, p));
  };
  const appui = useRef<{ i: number; nom: string; x: number; y: number; souris: boolean; leve: boolean; minuteur: number } | null>(null);
  const cibleRef = useRef<Cible | null>(null);
  const deposerRef = useRef(deposer);
  const leverRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    deposerRef.current = deposer;
  });
  useEffect(() => {
    let vitesse = 0;
    let boucle = 0;
    const viser = (x: number, y: number) => {
      const a = appui.current;
      if (!a) return;
      const el = document.elementFromPoint(x, y);
      let c: Cible | null = null;
      const k = el?.closest<HTMLElement>("[data-case]")?.dataset.case;
      const r = el?.closest<HTMLElement>("[data-place]")?.dataset.place;
      if (k !== undefined) c = { type: "case", i: Number(k) };
      else if (r !== undefined) c = { type: "place", rangee: Number(r) };
      cibleRef.current = c;
      setCible(c);
    };
    const defiler = () => {
      boucle = 0;
      const a = appui.current;
      if (!vitesse || !a?.leve) return;
      window.scrollBy(0, vitesse);
      viser(a.x, a.y);
      boucle = requestAnimationFrame(defiler);
    };
    const finir = () => {
      const a = appui.current;
      if (a) window.clearTimeout(a.minuteur);
      appui.current = null;
      cibleRef.current = null;
      vitesse = 0;
      if (boucle) cancelAnimationFrame(boucle);
      boucle = 0;
      setTire(null);
      setCible(null);
      setFantome(null);
    };
    const lever = () => {
      const a = appui.current;
      if (!a || a.leve) return;
      a.leve = true;
      setTire(a.i);
      setMenu(null);
      setFantome({ x: a.x, y: a.y, nom: a.nom });
      if (!a.souris) navigator.vibrate?.(12);
    };
    const bouge = (e: PointerEvent) => {
      const a = appui.current;
      if (!a) return;
      if (!a.leve) {
        const dist = Math.hypot(e.clientX - a.x, e.clientY - a.y);
        // au doigt, bouger avant l'appui long, c'est faire défiler la page
        if (!a.souris) {
          if (dist > 10) finir();
          return;
        }
        if (dist < 4) return;
        lever();
      }
      a.x = e.clientX;
      a.y = e.clientY;
      setFantome({ x: a.x, y: a.y, nom: a.nom });
      viser(a.x, a.y);
      vitesse = a.y < BORD_PX ? -12 : a.y > window.innerHeight - BORD_PX - 60 ? 12 : 0;
      if (vitesse && !boucle) boucle = requestAnimationFrame(defiler);
    };
    const lache = () => {
      const a = appui.current;
      if (a?.leve && cibleRef.current) deposerRef.current(a.i, cibleRef.current);
      finir();
    };
    // le doigt qui tient un bloc ne fait pas défiler la page
    const tient = (e: TouchEvent) => {
      if (appui.current?.leve) e.preventDefault();
    };
    leverRef.current = lever;
    window.addEventListener("pointermove", bouge);
    window.addEventListener("pointerup", lache);
    window.addEventListener("pointercancel", finir);
    document.addEventListener("touchmove", tient, { passive: false });
    return () => {
      finir();
      window.removeEventListener("pointermove", bouge);
      window.removeEventListener("pointerup", lache);
      window.removeEventListener("pointercancel", finir);
      document.removeEventListener("touchmove", tient);
    };
  }, []);
  /** L'appui sur une poignée : à la souris, on tire tout de suite ; au doigt, après l'appui long. */
  const saisir = (i: number, nom: string) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const souris = e.pointerType === "mouse";
    appui.current = { i, nom, x: e.clientX, y: e.clientY, souris, leve: false, minuteur: souris ? 0 : window.setTimeout(() => leverRef.current(), APPUI_LONG_MS) };
  };

  // ── les ajouts : un bloc masqué, un GIF de la banque, une image ou une vidéo envoyée ──
  /** Pose un bloc : dans la place visée si elle sert encore, sinon à la fin de la page. */
  const poser = (b: Bloc, ou: PlaceVide | null) => {
    const l = courante.current;
    const dans = ou ? remplirPlace(l, ou, b) : l;
    const fin = dans === l ? ajouter(l, ou ? { ...b, f: FORMAT_DEFAUT[genreDe(b)] } : b) : dans;
    if (fin === l) return false;
    onChange(fin);
    setChoisi(cleDe(b, 0));
    return true;
  };
  const choisirBloc = (k: CleBloc) => {
    const ou = feuille?.destination ?? null;
    setFeuille(null);
    poser({ k, f: FORMAT_DEFAUT[k] }, ou);
  };
  const ouvrirBanque = (ou: PlaceVide | null) => {
    destination.current = ou;
    setFeuille(null);
    setBanque(true);
  };
  // un GIF de la banque : affiché depuis KLIPY, rien à envoyer
  const choisirGif = (g: GifBanque) => {
    setBanque(false);
    const ou = destination.current;
    destination.current = null;
    const p = peutAjouterMedia(courante.current, false);
    if (!p.ok) return setEnvoi({ enCours: false, texte: p.raison ?? "" });
    setEnvoi(null);
    poser({ k: "media", id: nouvelId(), type: "image", url: g.plein.url, ratio: Math.round((g.plein.w / g.plein.h) * 1000) / 1000, legende: null, source: "klipy", px: g.plein.w, f: FORMAT_DEFAUT.gif }, ou);
  };
  const pourDestination = (ou: PlaceVide | null) => () => {
    destination.current = ou;
  };
  async function envoyer(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setFeuille(null);
    const ou = destination.current;
    destination.current = null;
    const video = estFichierVideo(file);
    const p = peutAjouterMedia(courante.current, video);
    if (!p.ok) return setEnvoi({ enCours: false, texte: p.raison ?? "" });
    setEnvoi({ enCours: true, texte: video ? T.envoiVideo : T.envoiImage });
    onEnvoi?.(true);
    try {
      const b = await envoyerMedia(supabase, file);
      // la page a pu changer pendant l'envoi : poser repart de la liste la plus récente
      if (!poser(b, ou)) setEnvoi({ enCours: false, texte: peutAjouterMedia(courante.current, video).raison ?? T.envoiRate });
      else setEnvoi(null);
    } catch (e) {
      setEnvoi({ enCours: false, texte: e instanceof Refus ? e.message : T.envoiRate });
    } finally {
      onEnvoi?.(false);
    }
  }

  /** Les choix d'un média (image, GIF, vidéo), pour une place ou pour la fin de la page ; `id` : les champs de fichier propres à cet endroit. */
  const choixMedias = (ou: PlaceVide | null, id: string, ligne: boolean) => {
    const cls = ligne ? s.ligne : "btn btn-secondary btn-sm";
    const grise = (ok: boolean) => (ok && !occupe ? "" : " pointer-events-none opacity-50");
    return (
      <>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" id={`${id}-image`} onChange={(e) => envoyer(e.currentTarget)} />
        <input type="file" accept="video/*" className="sr-only" id={`${id}-video`} onChange={(e) => envoyer(e.currentTarget)} />
        <label htmlFor={`${id}-image`} onClick={pourDestination(ou)} aria-disabled={!permisImage.ok || occupe} title={permisImage.raison ?? undefined} className={cls + " cursor-pointer" + grise(permisImage.ok)}>
          <ImagePlus size={15} aria-hidden /> {T.image}
          {ligne && !permisImage.ok && <span className="t-micro ml-auto font-normal">{permisImage.raison}</span>}
        </label>
        {banqueGifs && (
          <button type="button" className={cls} disabled={!permisImage.ok || occupe} title={permisImage.raison ?? undefined} onClick={() => ouvrirBanque(ou)}>
            <ImagePlay size={15} aria-hidden /> {ligne ? T.gif : T.gifBanque}
          </button>
        )}
        <label htmlFor={`${id}-video`} onClick={pourDestination(ou)} aria-disabled={!permisVideo.ok || occupe} title={raisonVideo ?? undefined} className={cls + " cursor-pointer" + grise(permisVideo.ok)}>
          <Clapperboard size={15} aria-hidden /> {T.video}
          {ligne && !permisVideo.ok && <span className="t-micro ml-auto font-normal">{raisonVideo}</span>}
        </label>
      </>
    );
  };

  // ── un bloc dans la grille : sa barre, puis le vrai bloc, inerte ──
  const caseEdition = (c: CaseGrille) => {
    const b = c.e as Bloc;
    const i = c.i;
    const cle = cleDe(b, i);
    const genre = genreDe(b);
    const nom = nomBloc(b);
    const media = estMedia(b) ? b : null;
    const permis = formatsDe(b);
    const aReglages = b.k === "vitrine" || b.k === "folio" || b.k === "journal" || !!media;
    const ouvert = (t: Menu["type"]) => menu?.type === t && menu.cle === cle;
    const vise = cible?.type === "case" && cible.i === i && tire !== i;
    const majMedia = (champs: Partial<BlocMedia>) => onChange(d.map((x, j) => (j === i ? ({ ...x, ...champs } as BlocMedia) : x)));
    const fermer = () => setMenu(null);
    return (
      <div
        className={(cle === choisi ? s.caseChoisie : s.caseEdition) + (tire === i ? " " + s.caseTiree : "") + (vise ? " " + s.caseVisee : "")}
        onClickCapture={() => setChoisi(cle)}
        role="group"
        aria-label={nom}
      >
        {/* la barre d'outils du bloc : une ligne, la même hauteur partout */}
        <div className={s.barre}>
          <span
            className={"inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-[10px] pl-1 text-[13px] font-semibold " + s.poignee}
            onPointerDown={saisir(i, nom)}
            onContextMenu={(e) => e.preventDefault()}
            title={T.deplacerAide}
            aria-label={T.deplacer(nom)}
          >
            <GripVertical size={15} aria-hidden className="shrink-0 text-muted" />
            <span className="shrink-0">{ICONE_BLOC[genre]}</span>
            <span className="truncate">{nom}</span>
          </span>

          {/* le format (ordinateur seulement) */}
          <button
            type="button"
            data-ancre={`format:${cle}`}
            className={"btn btn-secondary btn-sm gap-1.5 " + s.grandSeul}
            aria-haspopup="dialog"
            aria-expanded={ouvert("format")}
            aria-label={T.formatDe(nom, nomFormat(b.f))}
            onClick={() => basculer({ type: "format", cle })}
          >
            <Vignette f={b.f} /> {nomFormat(b.f)} <ChevronDown size={13} aria-hidden />
          </button>
          {ouvert("format") && (
            <MenuFlottant ancre={`format:${cle}`} largeur={270} label={T.formatTitre} onFermer={fermer}>
              <span className="t-micro px-2.5 py-1.5">{T.formatTitre}</span>
              {FORMATS.map((f) => {
                const ok = permis.includes(f.key);
                const sur = b.f === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={sur}
                    disabled={!ok}
                    title={ok ? T.formatPart(f.nom, f.part) : raisonRefus(b, f.key)}
                    onClick={() => {
                      appliquer(changerFormat(d, i, f.key));
                      fermer();
                    }}
                    className={s.ligne + " flex-wrap py-1.5" + (sur ? " " + s.ligneSur : "")}
                  >
                    <Vignette f={f.key} /> {f.nom}
                    <span className="t-micro ml-auto" style={sur ? { color: "inherit" } : undefined}>
                      {f.part}
                    </span>
                    {!ok && <span className="t-micro basis-full pl-9 font-normal">{raisonRefus(b, f.key)}</span>}
                  </button>
                );
              })}
            </MenuFlottant>
          )}

          {/* les réglages propres au bloc */}
          {aReglages && (
            <button
              type="button"
              data-ancre={`reglages:${cle}`}
              className={"btn btn-secondary btn-sm px-2.5 " + s.outil}
              aria-label={T.reglages}
              title={T.reglages}
              aria-haspopup="dialog"
              aria-expanded={ouvert("reglages")}
              onClick={() => basculer({ type: "reglages", cle })}
            >
              <SlidersHorizontal size={14} aria-hidden />
            </button>
          )}
          {ouvert("reglages") && (
            <MenuFlottant ancre={`reglages:${cle}`} largeur={300} label={T.reglages} onFermer={fermer}>
              <div className="flex flex-col gap-2 p-1">
                {b.k === "vitrine" && (
                  <>
                    <span className="t-micro px-1.5 pt-1">{T.vitrineAide}</span>
                    <span className="flex flex-wrap gap-1.5 px-1 pb-1">
                      {VITRINE.map((v) => {
                        const n = showcase.indexOf(v.key);
                        const plein = n < 0 && showcase.length >= VITRINE_MAX;
                        return (
                          <button
                            key={v.key}
                            type="button"
                            aria-pressed={n >= 0}
                            disabled={plein}
                            className={"chip chip-sm " + (n >= 0 ? "chip-active" : "") + (plein ? " opacity-50" : "")}
                            onClick={() => onShowcase(n >= 0 ? showcase.filter((x) => x !== v.key) : [...showcase, v.key])}
                          >
                            {n >= 0 ? `${n + 1}. ` : ""}
                            {v.nom}
                          </button>
                        );
                      })}
                    </span>
                  </>
                )}
                {media && (
                  <label className="flex flex-col gap-1 px-1.5">
                    <span className="t-micro">{T.legende}</span>
                    <input className="input min-h-[36px] text-[13.5px]" maxLength={LEGENDE_MAX} placeholder={T.legendeAide} value={media.legende ?? ""} onChange={(e) => majMedia({ legende: e.target.value || null })} />
                  </label>
                )}
                {media && genre === "image" && (
                  <span className="flex flex-col gap-1 px-1.5 pb-1">
                    <span className="t-micro">{T.cadrage}</span>
                    <span className="seg" role="radiogroup" aria-label={T.cadrage}>
                      {T.CADRAGES.map((x) => {
                        const sur = (media.y ?? 50) === x.y;
                        return (
                          <button key={x.nom} type="button" role="radio" aria-checked={sur} className={s.ligne + " justify-center" + (sur ? " " + s.ligneSur : "")} onClick={() => majMedia({ y: x.y })}>
                            {x.nom}
                          </button>
                        );
                      })}
                    </span>
                  </span>
                )}
                {media && genre === "video" && (
                  <label className="flex flex-col gap-1 px-1.5 pb-1">
                    <span className="t-micro">{T.couverture(couvertureDe(media))}</span>
                    {/* sans durée (vidéo d'avant) : la borne de la validation, une minute */}
                    <input
                      type="range"
                      min={0}
                      max={Math.floor((media.duree ?? VIDEO_MAX_SECONDES) * 2) / 2}
                      step={0.5}
                      value={couvertureDe(media)}
                      onChange={(e) => majMedia({ couverture: Number(e.target.value) })}
                    />
                    <span className="t-micro">{T.couvertureAide}</span>
                  </label>
                )}
                {/* des liens ordinaires (pas next/link) : quitter la page avec des modifications, le navigateur demande */}
                {b.k === "folio" && (
                  <a href="/moi?onglet=pieces" className={s.ligne}>
                    {T.folio}
                    <span className="t-micro ml-auto font-normal">{T.folioAide}</span>
                  </a>
                )}
                {b.k === "journal" && (
                  <a href="/moi?onglet=reglages" className={s.ligne + " flex-wrap py-1.5"}>
                    {T.journal(T.VISIBILITE[donnees.visibiliteJournal])}
                    <span className="t-micro basis-full font-normal">{T.journalAide}</span>
                  </a>
                )}
              </div>
            </MenuFlottant>
          )}

          {/* le reste : déplacer, mettre à la place (ou échanger), masquer ou retirer */}
          <button
            type="button"
            data-ancre={`plus:${cle}`}
            className={"btn btn-secondary btn-sm px-2.5 " + s.outil}
            aria-label={T.plus}
            title={T.plusAide}
            aria-haspopup="dialog"
            aria-expanded={ouvert("plus")}
            onClick={() => basculer({ type: "plus", cle })}
          >
            <MoreHorizontal size={15} aria-hidden />
          </button>
          {ouvert("plus") && (
            <MenuFlottant ancre={`plus:${cle}`} largeur={270} label={T.plusAide} onFermer={fermer}>
              <span className="flex gap-1.5 p-1">
                <button type="button" className={"btn btn-secondary btn-sm flex-1 " + s.outil} onClick={() => appliquer(deplacer(d, i, -1))} disabled={i === 0}>
                  <ArrowLeft size={14} aria-hidden className="max-lg:hidden" />
                  <ArrowUp size={14} aria-hidden className="lg:hidden" /> {T.avant}
                </button>
                <button type="button" className={"btn btn-secondary btn-sm flex-1 " + s.outil} onClick={() => appliquer(deplacer(d, i, 1))} disabled={i === d.length - 1}>
                  {T.apres} <ArrowRight size={14} aria-hidden className="max-lg:hidden" />
                  <ArrowDown size={14} aria-hidden className="lg:hidden" />
                </button>
              </span>
              <span className="t-micro px-2.5 pb-1 pt-2">{T.mettreALaPlace}</span>
              {/* un média remplacé par un bloc neuf est retiré : son fichier part, comme avec « Retirer ce média » */}
              {media && <span className="t-micro px-2.5 pb-1 font-normal">{T.remplacerMediaAide}</span>}
              {BLOCS.filter((x) => x.k !== b.k).map((x) => (
                <button
                  key={x.k}
                  type="button"
                  className={s.ligne}
                  onClick={() => {
                    // déjà posé : au téléphone, il vient à cette place sans toucher aux formats (sur ordinateur, ils échangent place et format)
                    const ailleurs = d.findIndex((e) => e.k === x.k);
                    appliquer(ailleurs >= 0 && !grandEcran() ? deplacerA(d, ailleurs, i) : mettreALaPlace(d, i, x.k));
                    setChoisi(x.k);
                    fermer();
                  }}
                >
                  {ICONE_BLOC[x.k]} {x.nom}
                  {d.some((e) => e.k === x.k) ? <span className="t-micro ml-auto">{T.pose}</span> : "neuf" in x && x.neuf ? <span className="t-micro ml-auto">{T.nouveau}</span> : null}
                </button>
              ))}
              <span className="my-1 border-t border-line" />
              <button
                type="button"
                className={s.ligne + " flex-wrap py-1.5"}
                onClick={() => {
                  appliquer(retirer(d, i));
                  fermer();
                }}
              >
                {media ? <Trash2 size={14} aria-hidden /> : <EyeOff size={14} aria-hidden />} {media ? T.retirerMedia : T.masquer}
                <span className="t-micro ml-auto font-normal">{media ? T.retirerMediaAide : T.masquerAide}</span>
              </button>
            </MenuFlottant>
          )}
        </div>

        {/* le vrai bloc, inerte : on range, on ne clique pas dedans */}
        <div inert className={"flex min-w-0 flex-1 select-none flex-col " + s.remplit}>
          <BlocProfil bloc={b} f={b.f} d={donnees} edition />
        </div>
      </div>
    );
  };

  // ── une place vide (élément « libre » ou fin de rangée), ordinateur seulement ──
  const placeEdition = (p: PlaceVide) => {
    const f = p.portee === 8 ? "heros" : "tuile";
    const vise = tire !== null && (p.i !== null ? cible?.type === "case" && cible.i === p.i : cible?.type === "place" && cible.rangee === p.rangee);
    return (
      <div className={s.caseLibre + " " + s.grandSeul + (vise ? " " + s.libreVisee : "")}>
        <div className="flex flex-col items-center gap-2 p-5 text-center">
          <button type="button" className="btn btn-secondary" onClick={() => setFeuille({ destination: p })}>
            <Plus size={16} aria-hidden /> {T.choisirModule}
          </button>
          <span className="t-micro">{T.placeLibre(f)}</span>
          {p.i !== null && (
            <button type="button" className="t-micro inline-flex min-h-[32px] items-center gap-1 rounded-full px-2 hover:text-white" onClick={() => appliquer(fermerPlace(d, p.i as number))}>
              <X size={12} aria-hidden /> {T.fermerPlace}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {/* la carte « Ta page » : le compte, la règle, et le plan */}
      <div className="card-quiet flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4">
        <div className="min-w-0 flex-[1_1_300px]">
          <p className="t-eyebrow m-0">{T.carteTitre}</p>
          <p className="m-0 text-[15px] font-semibold">{T.compte(blocs.length, lignes.length)}</p>
          <p className={"t-small m-0 " + s.grandSeul}>{T.aideOrdinateur}</p>
          <p className={"t-small m-0 " + s.petitSeul}>{T.aideTelephone}</p>
        </div>
        <div className={"flex w-[180px] flex-col gap-[3px] " + s.grandSeul} role="img" aria-label={T.plan}>
          {lignes.map((r, k) => (
            <div key={k} className={s.plan}>
              {r.cases.map((c) =>
                estLibre(c.e) ? (
                  <span key={cleDe(c.e, c.i)} className={s.planLibre} style={{ gridColumn: `span ${portee(c.f)}` }} title={T.planLibre} />
                ) : (
                  <span
                    key={cleDe(c.e, c.i)}
                    className={s.planCase + (cleDe(c.e, c.i) === choisi ? " " + s.planChoisi : "")}
                    style={{ gridColumn: `span ${portee(c.f)}` }}
                    title={T.planCase(nomBloc(c.e as Bloc), nomFormat(c.f))}
                  />
                ),
              )}
              {r.libre > 0 && <span className={s.planLibre} style={{ gridColumn: `span ${r.libre}` }} title={T.planLibre} />}
            </div>
          ))}
        </div>
      </div>

      {/* la page elle-même */}
      <div aria-label={T.grille} role="region">
        <GrilleProfil edition disposition={d} rendre={caseEdition} libre={placeEdition} />
      </div>

      {/* ajouter à la page : les blocs masqués, une image, un GIF, une vidéo */}
      <section className="flex flex-col gap-3 rounded-[18px] border border-dashed border-line-2 p-5" aria-label={T.ajouter}>
        <p className="t-eyebrow m-0">{T.ajouter}</p>
        <div className="flex flex-wrap gap-2">
          {masques.map((x) => (
            <button key={x.k} type="button" className="btn btn-secondary btn-sm" onClick={() => poser({ k: x.k, f: FORMAT_DEFAUT[x.k] }, null)}>
              <Plus size={14} aria-hidden /> {x.nom}
              {"neuf" in x && x.neuf && <span className="t-micro">· {T.nouveau}</span>}
            </button>
          ))}
          {choixMedias(null, "rl-page", false)}
        </div>
        {envoi && (
          <p role="status" className={"m-0 text-[12.5px] font-medium " + (envoi.enCours ? "" : "text-pen")}>
            {envoi.texte}
          </p>
        )}
        <p className="t-micro m-0">{T.medias(medias)}</p>
      </section>

      {/* la feuille « Choisir un module » : pour une place vide, ou pour la fin de la page */}
      <Feuille ouvert={feuille !== null} onFermer={() => setFeuille(null)} titre={T.choisirModule} apercu>
        <div className="flex flex-col gap-5 pt-2">
          <section className="flex flex-col gap-1" aria-label={T.masques}>
            <p className="t-eyebrow m-0 pb-1">{T.masques}</p>
            {masques.length ? (
              masques.map((x) => (
                <button key={x.k} type="button" className={s.ligne} onClick={() => choisirBloc(x.k)}>
                  {ICONE_BLOC[x.k]} {x.nom}
                  {"neuf" in x && x.neuf && <span className="t-micro ml-auto">{T.nouveau}</span>}
                </button>
              ))
            ) : (
              <p className="t-small m-0">{T.aucunMasque}</p>
            )}
          </section>
          <section className="flex flex-col gap-1" aria-label={T.unMedia}>
            <p className="t-eyebrow m-0 pb-1">{T.unMedia}</p>
            {choixMedias(feuille?.destination ?? null, "rl-feuille", true)}
            <p className="t-micro m-0 pt-1">{T.medias(medias)}</p>
          </section>
        </div>
      </Feuille>

      {/* le bloc tenu suit le doigt (ou la souris) */}
      {fantome && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[150%] rounded-full border border-white bg-[var(--surface)] px-3.5 py-2 text-[13px] font-semibold shadow-[var(--shadow-3)]"
          style={{ left: fantome.x, top: fantome.y }}
        >
          {fantome.nom}
        </div>
      )}
      {banqueGifs && (
        <BanqueGifs
          ouvert={banque}
          onFermer={() => {
            setBanque(false);
            destination.current = null;
          }}
          onChoisir={choisirGif}
        />
      )}
    </div>
  );
}
