"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronDown, Clapperboard, EyeOff, GripVertical, ImagePlay, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { PERSO } from "@/lib/voice-profil";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MediaProfil } from "@/components/profil/Blocs";
import { BanqueGifs } from "@/components/profil/BanqueGifs";
import { GRILLE, SchemaModele, placeDe } from "@/components/profil/Rangees";
import type { GifBanque } from "@/lib/profil/gifs";
import { ImageIllisible, preparerImage } from "@/lib/profil/image";
import {
  BLOCS,
  BUCKET_MEDIAS,
  BUCKET_VIDEOS,
  IMAGE_MAX_PX,
  LEGENDE_MAX,
  MEDIAS_MAX,
  MODELES,
  RANGEES_MAX,
  TAILLES_MEDIA,
  VIDEOS_MAX,
  VIDEO_MAX_OCTETS,
  VIDEO_MAX_SECONDES,
  VIDEO_TYPES,
  blocsDe,
  casesDe,
  estGif,
  estMedia,
  estVideo,
  infoBloc,
  nouvelId,
  tailleDe,
  type Bloc,
  type BlocFixe,
  type BlocMedia,
  type Case,
  type CleBloc,
  type Disposition,
  type ModeleRangee,
  type TailleMedia,
} from "@/lib/profil/disposition";

// La page du joueur, éditable sur place (l'aperçu de l'éditeur du profil),
// en rangées, comme les dispositions d'ancrage de Windows : chaque rangée a
// son modèle (bouton en haut à gauche de la rangée : pleine largeur, deux
// moitiés, deux tiers et un tiers, trois colonnes, un grand et deux
// empilés, grille de quatre), et ses cases reçoivent les blocs. Dans une
// case : le vrai bloc (inerte : on range, on ne clique pas dedans) et sa
// barre d'outils (nom et poignée pour le glisser sur une autre case, case
// précédente / suivante, taille P/M/G d'un média, masquer ou retirer). Une
// case vide propose ce qu'on peut y mettre. Dessous : « Ajouter à ta
// page » (nouvelle rangée, GIF, image, vidéo, blocs masqués).
// Déplacer marche au doigt comme à la souris (événements pointeur, pas le
// glisser HTML5, muet sur téléphone) : appui long sur le nom d'un bloc (ou
// la poignée d'une rangée), puis glisser sur une autre place ; à la souris,
// il suffit de tirer. Sur téléphone, où les cases passent l'une sous
// l'autre, les flèches deviennent ↑ ↓ et les outils font 44 px.
// Les envois : une image (telle quelle si elle est raisonnable, sinon
// réduite à 2 400 px sans perte visible) ; une vidéo, un edit court type
// TikTok enregistré sur son téléphone (une par page, une minute et 30 Mo au
// plus, envoyée telle quelle), dans le dossier du joueur.

const Mo = (n: number) => `${Math.round(n / (1024 * 1024))} Mo`;

class Refus extends Error {}

/** Proportion et durée d'une vidéo, lues dans le navigateur. */
function lireVideo(file: File): Promise<{ duree: number; ratio: number }> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    const fin = () => URL.revokeObjectURL(url);
    v.onloadedmetadata = () => {
      const r = { duree: v.duration, ratio: v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 9 / 16 };
      fin();
      res(r);
    };
    v.onerror = () => {
      fin();
      rej(new Refus("Cette vidéo ne se lit pas dans ton navigateur : choisis un MP4."));
    };
    v.src = url;
  });
}

/** Une image prête à l'envoi : telle quelle, ou réduite (2 400 px au plus). */
async function reduireImage(file: File) {
  try {
    return await preparerImage(file, { maxLargeur: IMAGE_MAX_PX, maxHauteur: IMAGE_MAX_PX });
  } catch (e) {
    if (e instanceof ImageIllisible) throw new Refus("Image illisible : choisis un JPEG, un PNG ou un WebP.");
    throw e;
  }
}

/** Prépare et envoie un fichier ; renvoie le bloc média (en demi-largeur). */
async function envoyerMedia(supabase: SupabaseClient, file: File): Promise<BlocMedia> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Refus("Connecte-toi pour ajouter un média.");
  const id = nouvelId();
  let blob: Blob, ratio: number, ext: string, contentType: string;
  const video = file.type.startsWith("video/") || /[.](mp4|mov|webm)$/i.test(file.name);
  if (video) {
    // la vidéo part telle quelle : seules sa durée et son poids sont bornés
    const type = file.type || (/[.]mov$/i.test(file.name) ? "video/quicktime" : /[.]webm$/i.test(file.name) ? "video/webm" : "video/mp4");
    if (!VIDEO_TYPES.includes(type)) throw new Refus("Vidéo MP4, MOV ou WebM seulement.");
    if (file.size > VIDEO_MAX_OCTETS) throw new Refus(`Vidéo trop lourde : ${Mo(VIDEO_MAX_OCTETS)} au plus. Raccourcis-la, ou enregistre-la en 720p.`);
    const m = await lireVideo(file);
    if (Number.isFinite(m.duree) && m.duree > VIDEO_MAX_SECONDES + 0.5) throw new Refus(`Vidéo trop longue : ${VIDEO_MAX_SECONDES} secondes au plus.`);
    blob = file;
    ratio = m.ratio;
    contentType = type;
    ext = type === "video/quicktime" ? "mov" : type === "video/webm" ? "webm" : "mp4";
  } else if (file.type.startsWith("image/") || /[.]hei[cf]$/i.test(file.name)) {
    if (file.size > 30 * 1024 * 1024) throw new Refus("Image trop lourde (30 Mo au plus avant réduction).");
    ({ blob, ratio, ext, contentType } = await reduireImage(file));
  } else {
    throw new Refus("Choisis une image ou une vidéo.");
  }
  const bucket = video ? BUCKET_VIDEOS : BUCKET_MEDIAS;
  const path = `${auth.user.id}/${id}.${ext}`;
  const up = await supabase.storage.from(bucket).upload(path, blob, { contentType, upsert: false });
  if (up.error) {
    const m = up.error.message || "";
    if (/bucket not found/i.test(m)) throw new Refus(video ? "Les vidéos arrivent bientôt : la base n'est pas encore prête." : "Les images arrivent bientôt : la base n'est pas encore prête.");
    if (/row-level security|policy/i.test(m))
      throw new Refus(video ? "Une vidéo est déjà en attente : enregistre ton profil (l'ancienne sera supprimée), puis réessaie." : "Trop de fichiers en attente : enregistre ton profil (les images retirées seront supprimées), puis réessaie.");
    if (/size|too large|exceed/i.test(m)) throw new Refus(`Fichier trop lourd : ${Mo(video ? VIDEO_MAX_OCTETS : 8 * 1024 * 1024)} au plus.`);
    throw new Error(m);
  }
  const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  return { k: "media", id, type: video ? "video" : "image", url, ratio, legende: null };
}


type Pos = { r: number; c: number };
const memePos = (a: Pos | null, b: Pos) => !!a && a.r === b.r && a.c === b.c;
/** ce qu'on déplace, et où on le pose : une case, ou une rangée entière */
type Glisse = { type: "case"; p: Pos } | { type: "rangee"; r: number };
/** l'appui long qui soulève un bloc au doigt */
const APPUI_LONG_MS = 380;
/** près du bord de l'écran, la page défile pendant qu'on tire */
const BORD_PX = 90;
const LETTRE: Record<TailleMedia, string> = { s: "P", m: "M", l: "G" };
const SUIVANTE: Record<TailleMedia, TailleMedia> = { s: "m", m: "l", l: "s" };

/** Un petit bouton rond de barre d'outils. */
function Outil({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid h-11 w-11 place-items-center rounded-full text-[var(--ink-2)] transition-colors hover:bg-[var(--well)] hover:text-white disabled:pointer-events-none disabled:opacity-35 lg:h-7 lg:w-7"
    >
      {children}
    </button>
  );
}

/** Le choix d'un modèle de rangée : les vignettes, comme les dispositions d'ancrage de Windows. */
function ChoixModele({ actuel, onChoisir, onFermer }: { actuel?: ModeleRangee; onChoisir: (m: ModeleRangee) => void; onFermer: () => void }) {
  useEffect(() => {
    const echap = (e: KeyboardEvent) => e.key === "Escape" && onFermer();
    window.addEventListener("keydown", echap);
    return () => window.removeEventListener("keydown", echap);
  }, [onFermer]);
  return (
    <>
      <button type="button" aria-label="Fermer le choix du modèle" className="fixed inset-0 z-20 cursor-default" onClick={onFermer} />
      <div role="menu" aria-label="Modèle de la rangée" className="absolute left-0 top-[calc(100%+8px)] z-30 w-[292px] rounded-[18px] border border-line-2 bg-[var(--surface)] p-3 shadow-[var(--shadow-3)]">
        <div className="grid grid-cols-4 gap-2">
          {MODELES.map((m) => (
            <button
              key={m.key}
              type="button"
              role="menuitemradio"
              aria-checked={actuel === m.key}
              aria-label={m.nom}
              title={m.nom}
              onClick={() => onChoisir(m.key)}
              className={"grid place-items-center rounded-[12px] border p-2 transition-colors " + (actuel === m.key ? "border-white bg-[var(--well)] text-white" : "border-line-2 text-[var(--ink-2)] hover:border-white hover:text-white")}
            >
              <SchemaModele m={m.key} className="h-[34px] w-[48px]" />
            </button>
          ))}
        </div>
        <p className="t-micro m-0 mt-2.5">Les blocs en trop passent dans une nouvelle rangée, en dessous.</p>
      </div>
    </>
  );
}

export function EditeurDisposition({
  disposition,
  onChange,
  rendus,
  supabase,
  onEnvoi,
  banqueGifs = false,
}: {
  disposition: Disposition;
  onChange: (d: Disposition) => void;
  /** le contenu réel de chaque bloc (null : rien à montrer pour l'instant) */
  rendus: Partial<Record<CleBloc, React.ReactNode>>;
  supabase: SupabaseClient;
  /** la banque de GIF est branchée (clé KLIPY présente sur le serveur) */
  banqueGifs?: boolean;
  /** un envoi est en cours (l'enregistrement attend) */
  onEnvoi?: (enCours: boolean) => void;
}) {
  const fichier = useRef<HTMLInputElement | null>(null);
  const fichierVideo = useRef<HTMLInputElement | null>(null);
  const [envoi, setEnvoi] = useState<{ enCours: boolean; texte: string } | null>(null);
  const [tire, setTire] = useState<Glisse | null>(null);
  const [cible, setCible] = useState<Glisse | null>(null);
  const [fantome, setFantome] = useState<{ x: number; y: number; nom: string } | null>(null);
  const [menu, setMenu] = useState<Pos | null>(null); // le menu d'une case vide
  const [destination, setDestination] = useState<Pos | null>(null); // où ira le prochain média
  const [modeles, setModeles] = useState<number | "nouvelle" | null>(null);
  const [banque, setBanque] = useState(false);

  const blocs = blocsDe(disposition);
  const medias = blocs.filter(estMedia).length;
  const videoPrise = blocs.filter(estVideo).length >= VIDEOS_MAX;
  const pleinMedias = medias >= MEDIAS_MAX || !!envoi?.enCours;
  const masques = BLOCS.filter((b) => !blocs.some((x) => x.k === b.k));

  // toute modification part d'une copie des rangées
  const maj = (fn: (d: Disposition) => void) => {
    const d = disposition.map((r) => ({ m: r.m, c: [...r.c] }));
    fn(d);
    onChange(d);
  };
  const echanger = (a: Pos, b: Pos) =>
    maj((d) => {
      const x = d[a.r].c[a.c];
      d[a.r].c[a.c] = d[b.r].c[b.c];
      d[b.r].c[b.c] = x;
    });
  const positions = disposition.flatMap((r, ri) => r.c.map((_, ci) => ({ r: ri, c: ci })));
  const voisin = (p: Pos, delta: number): Pos | null => positions[positions.findIndex((x) => memePos(x, p)) + delta] ?? null;
  const changerModele = (ri: number, m: ModeleRangee) =>
    maj((d) => {
      const n = casesDe(m);
      const c: Case[] = d[ri].c.slice(0, n);
      const enTrop = d[ri].c.slice(n).filter((b): b is Bloc => !!b);
      for (let i = 0; i < n && enTrop.length; i++) if (!c[i]) c[i] = enTrop.shift()!;
      while (c.length < n) c.push(null);
      d[ri] = { m, c };
      enTrop.forEach((b, j) => d.splice(ri + 1 + j, 0, { m: "plein", c: [b] }));
    });
  /** Pose un bloc : dans la case visée si elle est libre, sinon dans une nouvelle rangée pleine à la fin. */
  const placer = (b: Bloc, ou: Pos | null) =>
    maj((d) => {
      if (ou && d[ou.r] && !d[ou.r].c[ou.c]) d[ou.r].c[ou.c] = b;
      else d.push({ m: "plein", c: [b] });
    });
  const deposer = (g: Glisse, c: Glisse) => {
    if (g.type === "case" && c.type === "case" && !memePos(g.p, c.p)) echanger(g.p, c.p);
    if (g.type === "rangee" && c.type === "rangee" && g.r !== c.r)
      maj((d) => {
        const [x] = d.splice(g.r, 1);
        d.splice(c.r, 0, x);
      });
  };

  // le déplacement au pointeur : l'appui (long au doigt), le fantôme qui suit, la place visée sous le doigt
  const appui = useRef<{ g: Glisse; nom: string; x: number; y: number; souris: boolean; leve: boolean; minuteur: number } | null>(null);
  const cibleRef = useRef<Glisse | null>(null);
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
      let c: Glisse | null = null;
      if (a.g.type === "case") {
        const k = el?.closest<HTMLElement>("[data-case]")?.dataset.case;
        if (k) {
          const [r, ci] = k.split(":").map(Number);
          c = { type: "case", p: { r, c: ci } };
        }
      } else {
        const k = el?.closest<HTMLElement>("[data-rangee]")?.dataset.rangee;
        if (k !== undefined) c = { type: "rangee", r: Number(k) };
      }
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
      setTire(a.g);
      setFantome({ x: a.x, y: a.y, nom: a.nom });
      if (!a.souris) navigator.vibrate?.(12);
    };
    const bouge = (e: PointerEvent) => {
      const a = appui.current;
      if (!a) return;
      if (!a.leve) {
        const d = Math.hypot(e.clientX - a.x, e.clientY - a.y);
        // au doigt, bouger avant l'appui long, c'est faire défiler la page
        if (!a.souris) {
          if (d > 10) finir();
          return;
        }
        if (d < 4) return;
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
      if (a?.leve && cibleRef.current) deposerRef.current(a.g, cibleRef.current);
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
  const saisir = (g: Glisse, nom: string) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const souris = e.pointerType === "mouse";
    appui.current = { g, nom, x: e.clientX, y: e.clientY, souris, leve: false, minuteur: souris ? 0 : window.setTimeout(() => leverRef.current(), APPUI_LONG_MS) };
  };
  const tireCase = tire?.type === "case" ? tire.p : null;
  const viseCase = cible?.type === "case" ? cible.p : null;

  // un GIF de la banque : affiché depuis KLIPY, rien à envoyer
  const choisirGif = (g: GifBanque) => {
    setBanque(false);
    setMenu(null);
    if (medias >= MEDIAS_MAX) {
      setEnvoi({ enCours: false, texte: `${MEDIAS_MAX} médias au plus sur ta page.` });
      return;
    }
    setEnvoi(null);
    placer({ k: "media", id: nouvelId(), type: "image", url: g.plein.url, ratio: g.plein.w / g.plein.h, legende: null, source: "klipy", px: g.plein.w }, destination);
    setDestination(null);
  };

  async function ajouter(file: File | undefined) {
    if (!file) return;
    setMenu(null);
    if (medias >= MEDIAS_MAX) {
      setEnvoi({ enCours: false, texte: `${MEDIAS_MAX} médias au plus sur ta page.` });
      return;
    }
    const estUneVideo = file.type.startsWith("video/");
    if (estUneVideo && videoPrise) {
      setEnvoi({ enCours: false, texte: "Une vidéo par page : retire l'actuelle pour en mettre une autre." });
      return;
    }
    const ou = destination;
    setEnvoi({ enCours: true, texte: estUneVideo ? "Envoi de la vidéo… (quelques secondes à une minute)" : "Envoi de l'image…" });
    onEnvoi?.(true);
    try {
      const b = await envoyerMedia(supabase, file);
      placer(b, ou);
      setEnvoi(null);
    } catch (e) {
      setEnvoi({ enCours: false, texte: e instanceof Refus ? e.message : "Le fichier n'a pas pu être envoyé. Réessaie dans un instant." });
    } finally {
      onEnvoi?.(false);
      setDestination(null);
      if (fichier.current) fichier.current.value = "";
      if (fichierVideo.current) fichierVideo.current.value = "";
    }
  }

  /** Une case pleine : le vrai bloc, et sa barre d'outils en haut. */
  const caseBloc = (b: Bloc, p: Pos) => {
    const media = estMedia(b) ? b : null;
    const nom = media ? (media.type === "video" ? "Vidéo" : estGif(media) ? "GIF" : "Image") : infoBloc((b as BlocFixe).k).nom;
    const cle = `${p.r}:${p.c}`;
    const contenu = media ? (
      <MediaProfil b={{ ...media, legende: null }} />
    ) : (
      (rendus[(b as BlocFixe).k] ?? (
        <div className="card-quiet grid min-h-[96px] place-items-center p-5 text-center">
          <span className="t-small">
            <b className="font-semibold">{nom}</b> : rien à montrer pour l&apos;instant. Le bloc apparaîtra sur ta page dès qu&apos;il aura du contenu.
          </span>
        </div>
      ))
    );
    const avant = voisin(p, -1);
    const apres = voisin(p, 1);
    return (
      <div
        role="listitem"
        aria-label={nom}
        data-case={cle}
        className={
          "@container relative min-w-0 rounded-[18px] transition-[outline-color,opacity] " +
          (memePos(tireCase, p) ? "opacity-40 " : "") +
          (memePos(viseCase, p) && !memePos(tireCase, p) ? "outline outline-2 outline-offset-4 outline-[var(--ink)]" : "")
        }
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] flex items-center justify-between gap-2">
          <span
            className="pointer-events-auto inline-flex min-h-[44px] min-w-0 cursor-grab select-none items-center gap-1 rounded-full border border-line-2 bg-[var(--surface)] py-1 pl-1.5 pr-3 text-[12px] font-semibold shadow-[var(--shadow-1)] [-webkit-touch-callout:none] active:cursor-grabbing lg:min-h-0"
            onPointerDown={saisir({ type: "case", p }, nom)}
            onContextMenu={(e) => e.preventDefault()}
            title={PERSO.deplacerAide}
            aria-label={PERSO.deplacer(nom)}
          >
            <GripVertical size={14} aria-hidden className="shrink-0 text-muted" />
            <span className="truncate">{nom}</span>
          </span>
          <span className="pointer-events-auto inline-flex shrink-0 items-center rounded-full border border-line-2 bg-[var(--surface)] p-0.5 shadow-[var(--shadow-1)]">
            {/* sur téléphone les cases sont l'une sous l'autre : ↑ ↓ ; sur ordinateur, côte à côte : ← → */}
            <Outil label={`Case précédente : ${nom}`} onClick={() => avant && echanger(p, avant)} disabled={!avant}>
              <ArrowUp size={14} aria-hidden className="lg:hidden" />
              <ArrowLeft size={14} aria-hidden className="max-lg:hidden" />
            </Outil>
            <Outil label={`Case suivante : ${nom}`} onClick={() => apres && echanger(p, apres)} disabled={!apres}>
              <ArrowDown size={14} aria-hidden className="lg:hidden" />
              <ArrowRight size={14} aria-hidden className="max-lg:hidden" />
            </Outil>
            {media && (
              <Outil
                label={`Taille ${TAILLES_MEDIA.find((t) => t.key === tailleDe(media))!.nom} (changer) : ${nom}`}
                onClick={() => maj((d) => void (d[p.r].c[p.c] = { ...media, t: SUIVANTE[tailleDe(media)] }))}
              >
                <span className="font-mono text-[11.5px] font-bold leading-none">{LETTRE[tailleDe(media)]}</span>
              </Outil>
            )}
            <Outil label={media ? `Retirer : ${nom}` : `Masquer : ${nom}`} onClick={() => maj((d) => void (d[p.r].c[p.c] = null))}>
              {media ? <Trash2 size={14} aria-hidden /> : <EyeOff size={14} aria-hidden />}
            </Outil>
          </span>
        </div>
        {/* le vrai bloc, inerte : on range, on ne clique pas dedans */}
        <div inert className="select-none pt-[52px] lg:pt-11">
          {contenu}
        </div>
        {media && (
          <>
            <label className="sr-only" htmlFor={`leg-${media.id}`}>
              Légende
            </label>
            <input
              id={`leg-${media.id}`}
              className="input mt-2.5 !h-9 !text-[13px]"
              maxLength={LEGENDE_MAX}
              placeholder="Une légende (facultatif)"
              value={media.legende ?? ""}
              onChange={(e) => maj((d) => void (d[p.r].c[p.c] = { ...media, legende: e.target.value || null }))}
            />
          </>
        )}
      </div>
    );
  };

  /** Une case vide : ce qu'on peut y mettre. */
  const caseVide = (p: Pos) => {
    const ouvert = memePos(menu, p);
    return (
      <div
        role="listitem"
        aria-label="Case vide"
        data-case={`${p.r}:${p.c}`}
        className={
          "grid min-h-[160px] place-items-center rounded-[18px] border-2 border-dashed p-3 transition-colors " +
          (memePos(viseCase, p) ? "border-white bg-[var(--well)]" : "border-line-2")
        }
      >
        {ouvert ? (
          <div className="flex w-full flex-col items-center gap-2">
            <div className="flex w-full items-center justify-between">
              <span className="t-eyebrow">Mettre ici</span>
              <Outil label="Fermer" onClick={() => setMenu(null)}>
                <X size={14} aria-hidden />
              </Outil>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {banqueGifs && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={pleinMedias}
                  onClick={() => {
                    setDestination(p);
                    setBanque(true);
                  }}
                >
                  <ImagePlay size={14} aria-hidden /> Un GIF
                </button>
              )}
              <label htmlFor="rl-media" onClick={() => setDestination(p)} className={"btn btn-secondary btn-sm cursor-pointer " + (pleinMedias ? "pointer-events-none opacity-50" : "")}>
                <ImagePlus size={14} aria-hidden /> Une image
              </label>
              <label
                htmlFor="rl-video"
                onClick={() => setDestination(p)}
                className={"btn btn-secondary btn-sm cursor-pointer " + (pleinMedias || videoPrise ? "pointer-events-none opacity-50" : "")}
              >
                <Clapperboard size={14} aria-hidden /> Une vidéo
              </label>
              {masques.map((b) => (
                <button
                  key={b.k}
                  type="button"
                  className="btn btn-ghost btn-sm border border-dashed border-line-2"
                  onClick={() => {
                    placer({ k: b.k }, p);
                    setMenu(null);
                  }}
                >
                  <Plus size={13} aria-hidden /> {b.nom}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setMenu(p)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-muted hover:text-white">
            <Plus size={15} aria-hidden /> Ajouter ici
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5" role="list" aria-label="Les rangées de ta page">
        {disposition.map((r, ri) => {
          const modele = MODELES.find((m) => m.key === r.m)!;
          return (
            <div
              key={ri}
              role="none"
              data-rangee={ri}
              className={
                "relative rounded-[24px] border border-dashed p-3 transition-[opacity,border-color] sm:p-4 " +
                (tire?.type === "rangee" && tire.r === ri ? "border-line-2 opacity-40" : cible?.type === "rangee" && cible.r === ri && tire?.type === "rangee" ? "border-white bg-[var(--well)]" : "border-line-2")
              }
            >
              {/* la rangée : son modèle, et la déplacer ou la supprimer */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="relative">
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={modeles === ri}
                    onClick={() => setModeles(modeles === ri ? null : ri)}
                    className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-[var(--surface)] py-1 pl-2 pr-2.5 text-[12.5px] font-semibold shadow-[var(--shadow-1)] hover:border-white"
                  >
                    <SchemaModele m={r.m} className="h-[16px] w-[24px] text-[var(--ink-2)]" />
                    {modele.nom}
                    <ChevronDown size={14} aria-hidden className="text-muted" />
                  </button>
                  {modeles === ri && (
                    <ChoixModele
                      actuel={r.m}
                      onChoisir={(m) => {
                        changerModele(ri, m);
                        setModeles(null);
                      }}
                      onFermer={() => setModeles(null)}
                    />
                  )}
                </div>
                <span className="inline-flex items-center rounded-full border border-line-2 bg-[var(--surface)] p-0.5 shadow-[var(--shadow-1)]">
                  {disposition.length > 1 && (
                    <span
                      role="img"
                      aria-label={PERSO.deplacerRangee}
                      title={PERSO.deplacerAide}
                      onPointerDown={saisir({ type: "rangee", r: ri }, `${PERSO.deplacerRangee} · ${modele.nom}`)}
                      onContextMenu={(e) => e.preventDefault()}
                      className="grid h-11 w-11 cursor-grab select-none place-items-center rounded-full text-[var(--ink-2)] [-webkit-touch-callout:none] hover:bg-[var(--well)] hover:text-white active:cursor-grabbing lg:h-7 lg:w-7"
                    >
                      <GripVertical size={14} aria-hidden />
                    </span>
                  )}
                  <Outil label="Monter la rangée" onClick={() => maj((d) => void ([d[ri - 1], d[ri]] = [d[ri], d[ri - 1]]))} disabled={ri === 0}>
                    <ArrowUp size={14} aria-hidden />
                  </Outil>
                  <Outil label="Descendre la rangée" onClick={() => maj((d) => void ([d[ri + 1], d[ri]] = [d[ri], d[ri + 1]]))} disabled={ri === disposition.length - 1}>
                    <ArrowDown size={14} aria-hidden />
                  </Outil>
                  <Outil label="Supprimer la rangée (ses blocs sont masqués)" onClick={() => maj((d) => void d.splice(ri, 1))}>
                    <Trash2 size={14} aria-hidden />
                  </Outil>
                </span>
              </div>
              <div className={`grid items-start gap-x-5 gap-y-5 ${GRILLE[r.m]}`}>
                {r.c.map((b, ci) => (
                  <div key={b ? (estMedia(b) ? b.id : b.k) : `v${ci}`} className={`min-w-0 ${placeDe(r.m, ci)}`}>
                    {b ? caseBloc(b, { r: ri, c: ci }) : caseVide({ r: ri, c: ci })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ajouter : une rangée, un GIF, une image, une vidéo, les blocs masqués */}
      <div className="flex flex-col gap-3 rounded-[22px] border border-dashed border-line-2 p-4 sm:p-5">
        <p className="t-eyebrow m-0">Ajouter à ta page</p>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fichier} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" id="rl-media" onChange={(e) => ajouter(e.target.files?.[0])} />
          <input ref={fichierVideo} type="file" accept="video/*" className="sr-only" id="rl-video" onChange={(e) => ajouter(e.target.files?.[0])} />
          <div className="relative">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={disposition.length >= RANGEES_MAX}
              aria-haspopup="menu"
              aria-expanded={modeles === "nouvelle"}
              onClick={() => setModeles(modeles === "nouvelle" ? null : "nouvelle")}
            >
              <Plus size={15} aria-hidden /> Nouvelle rangée
            </button>
            {modeles === "nouvelle" && (
              <ChoixModele
                onChoisir={(m) => {
                  maj((d) => void d.push({ m, c: Array.from({ length: casesDe(m) }, () => null) }));
                  setModeles(null);
                }}
                onFermer={() => setModeles(null)}
              />
            )}
          </div>
          {banqueGifs && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={pleinMedias}
              onClick={() => {
                setDestination(null);
                setBanque(true);
              }}
            >
              <ImagePlay size={15} aria-hidden /> Ajouter un GIF
            </button>
          )}
          <label htmlFor="rl-media" onClick={() => setDestination(null)} aria-disabled={pleinMedias} className={"btn btn-secondary btn-sm cursor-pointer " + (pleinMedias ? "pointer-events-none opacity-50" : "")}>
            <ImagePlus size={15} aria-hidden /> Une image
          </label>
          <label
            htmlFor="rl-video"
            onClick={() => setDestination(null)}
            aria-disabled={pleinMedias || videoPrise}
            title={videoPrise ? "Une vidéo par page" : undefined}
            className={"btn btn-secondary btn-sm cursor-pointer " + (pleinMedias || videoPrise ? "pointer-events-none opacity-50" : "")}
          >
            <Clapperboard size={15} aria-hidden /> Une vidéo
          </label>
          {masques.map((b) => (
            <button key={b.k} type="button" className="btn btn-ghost btn-sm border border-dashed border-line-2" onClick={() => placer({ k: b.k }, null)}>
              <Plus size={14} aria-hidden /> {b.nom}
            </button>
          ))}
        </div>
        {envoi && (
          <p role="status" className={"m-0 text-[12.5px] font-medium " + (envoi.enCours ? "" : "text-pen")}>
            {envoi.texte}
          </p>
        )}
        <p className="t-micro m-0">
          {medias}/{MEDIAS_MAX} médias. Chaque rangée a son modèle (bouton en haut à gauche de la rangée) ; un bloc se déplace avec les flèches, ou par un appui long sur son nom puis en le glissant sur une autre case. Une vidéo par page :
          un edit enregistré sur ton téléphone (TikTok…), {VIDEO_MAX_SECONDES} secondes et {Mo(VIDEO_MAX_OCTETS)} au plus.
        </p>
      </div>
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
            setDestination(null);
          }}
          onChoisir={choisirGif}
        />
      )}
    </div>
  );
}
