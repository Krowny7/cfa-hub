// La disposition d'un profil : la page sous l'en-tête, en rangées. Chaque
// rangée a un modèle (comme les dispositions d'ancrage de Windows : pleine
// largeur, deux moitiés, deux tiers et un tiers, trois colonnes, un grand et
// deux petits empilés, grille de quatre…) et autant de cases, chacune avec
// un bloc (chiffres clés, radar, amis…) ou un média du joueur : ses images
// et sa vidéo (un edit court, type TikTok, enregistré sur son téléphone),
// ou des GIF choisis dans la banque KLIPY (affichés depuis son serveur).
// Un bloc absent de toutes les cases est masqué.
// Images et vidéos sont envoyées par le navigateur dans deux buckets
// publics (`profil-medias`, `profil-videos`), dans le dossier du joueur ;
// la base borne le poids de chaque fichier, les types permis et le nombre
// de fichiers par joueur (migration_profil_medias.sql). Le serveur revalide
// tout à l'écriture et supprime les fichiers qui ne servent plus.
// L'ancienne forme (une liste de blocs, pleins ou en demi-largeur) est
// convertie à la lecture.
// Module neutre (client et serveur).

import { URL_KLIPY } from "@/lib/profil/gifs";

export const BLOCS = [
  { k: "vitrine", nom: "Chiffres clés" },
  { k: "radar", nom: "Radar des matières" },
  { k: "amis", nom: "Amis" },
  { k: "reponses", nom: "Questions répondues" },
  { k: "trophees", nom: "Trophées" },
  { k: "progression", nom: "Progression" },
] as const;
export type CleBloc = (typeof BLOCS)[number]["k"];

export type BlocFixe = { k: CleBloc };
export type BlocMedia = {
  k: "media";
  id: string;
  type: "image" | "video";
  url: string;
  /** largeur / hauteur, pour réserver la place avant le chargement */
  ratio: number;
  legende: string | null;
  /** « klipy » : un GIF de la banque, servi par KLIPY (sinon : envoyé par le joueur) */
  source?: "klipy";
  /** largeur réelle en pixels (GIF de la banque, souvent petits : jamais agrandis) */
  px?: number;
  /** taille d'affichage : petite, moyenne, grande (défaut : moyenne pour un GIF ou une vidéo, grande pour une image) */
  t?: TailleMedia;
};
export type TailleMedia = "s" | "m" | "l";
export const TAILLES_MEDIA: { key: TailleMedia; nom: string; largeur: number | null; hauteur: number }[] = [
  { key: "s", nom: "petite", largeur: 300, hauteur: 300 },
  { key: "m", nom: "moyenne", largeur: 480, hauteur: 460 },
  { key: "l", nom: "grande", largeur: null, hauteur: 640 },
];
export type Bloc = BlocFixe | BlocMedia;

// ── Les modèles de rangée ──────────────────────────────────────────────
export type ModeleRangee = "plein" | "deux" | "grand-petit" | "petit-grand" | "trois" | "grand-pile" | "pile-grand" | "quatre";
export const MODELES: { key: ModeleRangee; nom: string; cases: number }[] = [
  { key: "plein", nom: "Pleine largeur", cases: 1 },
  { key: "deux", nom: "Deux moitiés", cases: 2 },
  { key: "grand-petit", nom: "Deux tiers, un tiers", cases: 2 },
  { key: "petit-grand", nom: "Un tiers, deux tiers", cases: 2 },
  { key: "trois", nom: "Trois colonnes", cases: 3 },
  { key: "grand-pile", nom: "Un grand, deux empilés", cases: 3 },
  { key: "pile-grand", nom: "Deux empilés, un grand", cases: 3 },
  { key: "quatre", nom: "Grille de quatre", cases: 4 },
];
export const casesDe = (m: ModeleRangee) => MODELES.find((x) => x.key === m)?.cases ?? 1;

/** Une case : un bloc, ou rien (case vide). */
export type Case = Bloc | null;
export type Rangee = { m: ModeleRangee; c: Case[] };
export type Disposition = Rangee[];

export const RANGEES_MAX = 12;

// La page d'un joueur qui n'a rien composé : chiffres clés, radar, amis, et
// une case vide à côté des amis, que son propriétaire voit « ajoute une
// image ». Les trophées vivent dans les Sceaux : la clé reste lisible dans
// les dispositions enregistrées, mais n'est plus dans celle-ci.
export const DISPOSITION_DEFAUT: Disposition = [
  { m: "plein", c: [{ k: "vitrine" }] },
  { m: "plein", c: [{ k: "radar" }] },
  { m: "grand-petit", c: [{ k: "amis" }, null] },
];

export const BUCKET_MEDIAS = "profil-medias";
export const BUCKET_VIDEOS = "profil-videos";
/** médias sur la page (images, GIF, vidéo) */
export const MEDIAS_MAX = 6;
/** poids d'une image envoyée (la base refuse au-delà) */
export const MEDIA_MAX_OCTETS = 8 * 1024 * 1024;
/** la vidéo : une par page, une minute et 30 Mo au plus (la base refuse au-delà de 30 Mo) */
export const VIDEOS_MAX = 1;
export const VIDEO_MAX_SECONDES = 60;
export const VIDEO_MAX_OCTETS = 30 * 1024 * 1024;
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
export const LEGENDE_MAX = 80;
/** côté le plus long d'une image, après réduction dans le navigateur */
export const IMAGE_MAX_PX = 2400;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const EXT_IMAGE = /[.](jpe?g|png|webp|gif)$/i;
const EXT_VIDEO = /[.](mp4|mov|webm)$/i;

export const estMedia = (b: Bloc): b is BlocMedia => b.k === "media";
export const estGif = (b: BlocMedia) => b.source === "klipy" || /[.]gif$/i.test(b.url);
export const estVideo = (b: Bloc) => estMedia(b) && b.type === "video";
export const infoBloc = (k: CleBloc) => BLOCS.find((b) => b.k === k)!;
/** Tous les blocs de la page, dans l'ordre de lecture (rangée par rangée, case par case). */
export const blocsDe = (d: Disposition): Bloc[] => d.flatMap((r) => r.c.filter((b): b is Bloc => !!b));

/** Une légende : une ligne, sans caractères de contrôle, 80 caractères. */
export function nettoyerLegende(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LEGENDE_MAX);
  return s || null;
}

const bornerRatio = (r: unknown) => {
  const n = Number(r);
  return Number.isFinite(n) && n > 0 ? Math.max(0.25, Math.min(4, Math.round(n * 1000) / 1000)) : 16 / 9;
};

/** Les adresses publiques des dossiers du joueur (images, vidéos). */
export type Prefixes = { images: string; videos: string };

/**
 * L'ancienne forme (une liste de blocs, `w` : plein ou demi) en rangées :
 * un bloc plein, une rangée pleine ; deux demi-blocs qui se suivent, une
 * rangée de deux moitiés (un demi-bloc seul : une moitié vide à côté).
 */
function depuisListe(liste: Record<string, unknown>[]): unknown[] {
  const out: { m: ModeleRangee; c: unknown[] }[] = [];
  let demi: { m: ModeleRangee; c: unknown[] } | null = null;
  for (const b of liste) {
    if (b.w === "demi") {
      if (demi && demi.c.length < 2) demi.c.push(b);
      else {
        demi = { m: "deux", c: [b] };
        out.push(demi);
      }
    } else {
      demi = null;
      out.push({ m: "plein", c: [b] });
    }
  }
  return out;
}

/**
 * Valide une disposition : rangées de modèles connus (douze au plus), cases
 * au bon nombre, blocs connus (une fois chacun), médias venus des dossiers
 * du joueur (`prefixes` ; null : aucun envoi accepté ; « lecture » : relu
 * de la base, déjà vérifié à l'écriture, seul le bucket est contrôlé) ou
 * GIF de la banque KLIPY (adresse en klipy.com) ; six médias au plus, dont
 * une vidéo. Les rangées sans aucun bloc sont retirées. L'ancienne forme
 * (liste de blocs) est acceptée et convertie.
 */
export function validerDisposition(raw: unknown, prefixes: Prefixes | null | "lecture"): { disposition: Disposition; refus: string[] } {
  const refus: string[] = [];
  const out: Disposition = [];
  const vus = new Set<string>();
  let medias = 0;
  let videos = 0;
  let mediaRefuse = false;

  const bloc = (x: unknown): Bloc | null => {
    if (!x || typeof x !== "object") return null;
    const b = x as Record<string, unknown>;
    if (b.k === "media") {
      const id = typeof b.id === "string" && /^[a-z0-9]{6,24}$/.test(b.id) ? b.id : null;
      const type = b.type === "image" ? "image" : b.type === "video" ? "video" : null;
      const url = typeof b.url === "string" ? b.url.trim() : "";
      const klipy = type === "image" && URL_KLIPY.test(url);
      const bucket = type === "video" ? BUCKET_VIDEOS : BUCKET_MEDIAS;
      const dossierOk =
        klipy ||
        (prefixes === "lecture"
          ? new RegExp(`^https:[/][/][^/]+[/]storage[/]v1[/]object[/]public[/]${bucket}[/]`).test(url)
          : !!prefixes && url.startsWith(type === "video" ? prefixes.videos : prefixes.images));
      const ok =
        id && type && dossierOk && url.length <= 500 && /^[A-Za-z0-9:/._%-]+$/.test(url) && (type === "video" ? EXT_VIDEO : EXT_IMAGE).test(url) && !vus.has("m:" + id);
      if (!ok || medias >= MEDIAS_MAX || (type === "video" && videos >= VIDEOS_MAX)) {
        mediaRefuse = true;
        return null;
      }
      vus.add("m:" + id);
      medias++;
      if (type === "video") videos++;
      const px = Math.round(Number(b.px));
      return {
        k: "media",
        id,
        type,
        url,
        ratio: bornerRatio(b.ratio),
        legende: nettoyerLegende(b.legende),
        ...(klipy ? { source: "klipy" as const, ...(px >= 16 && px <= 4000 ? { px } : {}) } : {}),
        ...(b.t === "s" || b.t === "m" || b.t === "l" ? { t: b.t } : {}),
      };
    }
    const info = BLOCS.find((i) => i.k === b.k);
    if (!info || vus.has(info.k)) return null;
    vus.add(info.k);
    return { k: info.k };
  };

  let liste: unknown[] = Array.isArray(raw) ? raw.slice(0, 40) : [];
  // l'ancienne forme : une liste de blocs
  if (liste.length && liste.every((x) => x && typeof x === "object" && "k" in (x as object))) liste = depuisListe(liste as Record<string, unknown>[]);

  for (const x of liste) {
    if (out.length >= RANGEES_MAX) break;
    if (!x || typeof x !== "object") continue;
    const r = x as { m?: unknown; c?: unknown };
    const modele = MODELES.find((m) => m.key === r.m);
    if (!modele) continue;
    const cases = (Array.isArray(r.c) ? r.c : []).slice(0, modele.cases).map(bloc);
    while (cases.length < modele.cases) cases.push(null);
    if (cases.some((c) => c)) out.push({ m: modele.key, c: cases });
  }
  if (mediaRefuse) refus.push("un ou plusieurs médias");
  return { disposition: out, refus };
}

/**
 * La disposition lue en base. Sans disposition enregistrée : celle par
 * défaut (sans le radar si le joueur l'avait masqué, comme avant).
 */
export function dispositionDepuis(raw: unknown, radar: boolean): Disposition {
  if (Array.isArray(raw)) return validerDisposition(raw, "lecture").disposition;
  return radar ? DISPOSITION_DEFAUT : DISPOSITION_DEFAUT.filter((r) => r.c[0]?.k !== "radar");
}

/** La taille d'un média (celle choisie, sinon : moyenne pour un GIF ou une vidéo, grande pour une image). */
export const tailleDe = (b: BlocMedia): TailleMedia => b.t ?? (b.type === "video" || b.source === "klipy" ? "m" : "l");

/**
 * La largeur maximale d'affichage d'un média : celle de sa taille, bornée
 * pour que sa hauteur ne dépasse pas celle de la taille, et jamais au-delà
 * de sa largeur réelle (un GIF agrandi devient flou). null : toute la place.
 */
export function largeurMedia(b: BlocMedia): number | null {
  const t = TAILLES_MEDIA.find((x) => x.key === tailleDe(b))!;
  const bornes = [t.hauteur * b.ratio, ...(t.largeur ? [t.largeur] : []), ...(b.px ? [b.px] : [])];
  const l = Math.round(Math.min(...bornes));
  return !t.largeur && !b.px && l >= 1400 ? null : l;
}

/** Un identifiant de média (minuscules et chiffres). */
export const nouvelId = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).slice(0, 16);
