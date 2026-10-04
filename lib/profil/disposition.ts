// La disposition d'un profil : l'ordre des blocs sous l'en-tête, leur
// largeur (toute la ligne, ou une demi-ligne côte à côte), ceux qu'on
// masque, et les médias du joueur (images, vidéos courtes).
// Les médias sont envoyés par le navigateur dans le bucket public
// `profil-medias`, dans le dossier du joueur ; la base borne le poids de
// chaque fichier, les types permis et le nombre de fichiers par joueur
// (migration_profil_medias.sql). Le serveur revalide tout à l'écriture et
// supprime les fichiers qui ne servent plus.
// Module neutre (client et serveur).

export type Largeur = "plein" | "demi";

export const BLOCS = [
  { k: "vitrine", nom: "Vitrine", demi: true },
  { k: "radar", nom: "Radar des matières", demi: true },
  { k: "amis", nom: "Amis", demi: true },
  { k: "reponses", nom: "Questions répondues", demi: false },
  { k: "trophees", nom: "Trophées", demi: false },
  { k: "progression", nom: "Progression", demi: false },
] as const;
export type CleBloc = (typeof BLOCS)[number]["k"];

export type BlocFixe = { k: CleBloc; w: Largeur };
export type BlocMedia = {
  k: "media";
  id: string;
  type: "image" | "video";
  url: string;
  /** largeur / hauteur, pour réserver la place avant le chargement */
  ratio: number;
  legende: string | null;
  w: Largeur;
};
export type Bloc = BlocFixe | BlocMedia;
export type Disposition = Bloc[];

export const DISPOSITION_DEFAUT: Disposition = BLOCS.map((b) => ({ k: b.k, w: "plein" }));

export const BUCKET_MEDIAS = "profil-medias";
/** médias sur la page */
export const MEDIAS_MAX = 6;
/** poids d'un fichier envoyé (la base refuse au-delà) */
export const MEDIA_MAX_OCTETS = 8 * 1024 * 1024;
export const VIDEO_MAX_SECONDES = 30;
export const LEGENDE_MAX = 80;
/** côté le plus long d'une image, après réduction dans le navigateur */
export const IMAGE_MAX_PX = 2400;

export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const EXT_IMAGE = /[.](jpe?g|png|webp|gif)$/i;
const EXT_VIDEO = /[.](mp4|webm|mov)$/i;

export const estMedia = (b: Bloc): b is BlocMedia => b.k === "media";
export const infoBloc = (k: CleBloc) => BLOCS.find((b) => b.k === k)!;
/** Un bloc peut-il se mettre en demi-largeur ? (les médias : toujours) */
export const peutDemi = (b: Bloc) => estMedia(b) || infoBloc(b.k).demi;

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

/**
 * Valide une disposition : blocs connus (une fois chacun), largeur permise,
 * médias venus du dossier du joueur (`prefixe` : l'adresse publique de ce
 * dossier ; null : aucun média accepté ; « lecture » : relu de la base,
 * déjà vérifié à l'écriture, seul le bucket est contrôlé), six au plus.
 */
export function validerDisposition(raw: unknown, prefixe: string | null | "lecture"): { disposition: Disposition; refus: string[] } {
  const refus: string[] = [];
  const out: Disposition = [];
  const vus = new Set<string>();
  let medias = 0;
  let mediaRefuse = false;
  for (const x of Array.isArray(raw) ? raw.slice(0, 24) : []) {
    if (!x || typeof x !== "object") continue;
    const b = x as Record<string, unknown>;
    const w: Largeur = b.w === "demi" ? "demi" : "plein";
    if (b.k === "media") {
      const id = typeof b.id === "string" && /^[a-z0-9]{6,24}$/.test(b.id) ? b.id : null;
      const type = b.type === "video" ? "video" : b.type === "image" ? "image" : null;
      const url = typeof b.url === "string" ? b.url.trim() : "";
      const dossierOk = prefixe === "lecture" ? /^https:[/][/][^/]+[/]storage[/]v1[/]object[/]public[/]profil-medias[/]/.test(url) : !!prefixe && url.startsWith(prefixe);
      const ok =
        id && type && dossierOk && url.length <= 500 && /^[A-Za-z0-9:/._%-]+$/.test(url) && (type === "image" ? EXT_IMAGE : EXT_VIDEO).test(url) && !vus.has("m:" + id);
      if (!ok || medias >= MEDIAS_MAX) {
        mediaRefuse = true;
        continue;
      }
      vus.add("m:" + id);
      medias++;
      out.push({ k: "media", id, type, url, ratio: bornerRatio(b.ratio), legende: nettoyerLegende(b.legende), w });
      continue;
    }
    const info = BLOCS.find((i) => i.k === b.k);
    if (!info || vus.has(info.k)) continue;
    vus.add(info.k);
    out.push({ k: info.k, w: info.demi ? w : "plein" });
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
  return radar ? DISPOSITION_DEFAUT : DISPOSITION_DEFAUT.filter((b) => b.k !== "radar");
}

/** Un identifiant de média (minuscules et chiffres). */
export const nouvelId = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).slice(0, 16);
