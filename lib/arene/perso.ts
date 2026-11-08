// Ce que le joueur règle pour ses parties : le fond et le trait de sa bannière
// de VS, sa vidéo de victoire. Tout vit dans une colonne jsonb,
// profile_style.arene (migration_arene.sql), lue d'ici ; tant qu'elle manque,
// chacun a les réglages de départ. Les fichiers sont dans le bucket public
// « arene-medias », à part de ceux du profil : le ménage d'« Enregistrer »
// (app/moi/profil/actions.ts) supprime dans profil-videos tout ce que la page
// n'utilise pas, et ce bucket n'y garde que 2 vidéos par joueur.
// Module neutre (client et serveur) : pas d'accès à la base ici.

export const BUCKET_ARENE = "arene-medias";
/** Une vidéo de victoire dure 40 secondes au plus (choix de Théo, 2026-11-08 ; 15 avant) (le poids et les types sont ceux des vidéos du profil). */
export const VICTOIRE_MAX_SECONDES = 40;
/** Le maximum d'un fichier sur le forfait gratuit de Supabase. Même valeur dans migration_arene.sql. */
export const VICTOIRE_MAX_OCTETS = 50 * 1024 * 1024;

/** Les peintures du site proposées en fond (`y` : le cadrage vertical qui garde les personnages). */
export const FONDS = [
  { key: "desert", src: "/illustrations/classement-duels.webp", y: "72%" },
  { key: "glace", src: "/illustrations/practice-studiolo.webp", y: "66%" },
  { key: "colisee", src: "/illustrations/duel-lice.webp", y: "78%" },
  { key: "forteresse", src: "/illustrations/classement-grande-salle.webp", y: "74%" },
  { key: "vallee", src: "/illustrations/accueil-trente-du-jour.webp", y: "40%" },
] as const;
export type FondCle = (typeof FONDS)[number]["key"];

/** La couleur du trait ; « peinture » : le trait se remplit de la peinture choisie (habillage 3B). */
export const TRAITS = [
  { key: "peinture", couleur: "#1a120b" },
  { key: "encre", couleur: "#1a120b" },
  { key: "bronze", couleur: "#6e5124" },
  { key: "vermillon", couleur: "#b4371f" },
] as const;
export type TraitCle = (typeof TRAITS)[number]["key"];

export type VideoVictoire = {
  url: string;
  /** largeur sur hauteur */
  ratio: number;
  /** en secondes */
  duree: number | null;
  /** le nom du fichier envoyé */
  nom: string | null;
  /** en octets */
  poids: number | null;
  /** le cadre choisi par le joueur ; absent : celui qui suit la vidéo */
  format?: FormatVideo | null;
  /** le recadrage dans ce cadre ; absent : centré, sans zoom */
  cadre?: Cadre | null;
};

export const FORMATS_VIDEO = ["paysage", "carre", "vertical"] as const;
export type FormatVideo = (typeof FORMATS_VIDEO)[number];
/** x, y : le point gardé (0 à 100, comme object-position) ; z : le zoom, de 1 à 3. */
export type Cadre = { x: number; y: number; z: number };
export const CADRE_CENTRE: Cadre = { x: 50, y: 50, z: 1 };
export const ZOOM_MAX = 3;

const borne = (n: unknown, a: number, b: number): number | null => (typeof n === "number" && Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : null);

/** Un recadrage lu en base ; une valeur étrangère : null (centré). */
export function cadreDepuis(raw: unknown): Cadre | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  const x = borne(c.x, 0, 100), y = borne(c.y, 0, 100), z = borne(c.z, 1, ZOOM_MAX);
  return x === null || y === null || z === null ? null : { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, z: Math.round(z * 100) / 100 };
}

export type Arene = {
  /** une peinture, « image » (son image) ; null : celle que lui donne son identifiant */
  fond: FondCle | "image" | null;
  image: string | null;
  trait: TraitCle;
  video: VideoVictoire | null;
};

export const ARENE_VIDE: Arene = { fond: null, image: null, trait: "peinture", video: null };

const DOSSIER = `^https?:[/][/][A-Za-z0-9.:-]+[/]storage[/]v1[/]object[/]public[/]${BUCKET_ARENE}[/][0-9a-f-]{36}[/]`;
const ADRESSE_VIDEO = new RegExp(`${DOSSIER}victoire-[0-9]{9,16}[.](?:mp4|mov|webm)$`, "i");
const ADRESSE_IMAGE = new RegExp(`${DOSSIER}vs-[0-9]{9,16}[.](?:jpe?g|png|webp)$`, "i");

const adresse = (raw: unknown, re: RegExp): string | null => (typeof raw === "string" && raw.length <= 500 && re.test(raw) ? raw : null);
const positif = (raw: unknown): number | null => (typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : null);

/** Les réglages lus en base ou venus d'un brouillon ; une valeur étrangère revient au départ, une adresse hors du bucket est ignorée. */
export function areneDepuis(raw: unknown): Arene {
  let o: unknown = raw;
  if (typeof o === "string") {
    try {
      o = JSON.parse(o);
    } catch {
      return ARENE_VIDE;
    }
  }
  if (!o || typeof o !== "object" || Array.isArray(o)) return ARENE_VIDE;
  const r = o as Record<string, unknown>;
  const image = adresse(r.image, ADRESSE_IMAGE);
  const fond = r.fond === "image" ? (image ? "image" : null) : (FONDS.find((f) => f.key === r.fond)?.key ?? null);
  const v = r.video && typeof r.video === "object" ? (r.video as Record<string, unknown>) : null;
  const url = adresse(v?.url, ADRESSE_VIDEO);
  const ratio = positif(v?.ratio);
  const nom = v?.nom;
  return {
    fond,
    image,
    trait: TRAITS.find((t) => t.key === r.trait)?.key ?? ARENE_VIDE.trait,
    video:
      url && ratio
        ? {
            url,
            ratio,
            duree: positif(v?.duree),
            nom: typeof nom === "string" ? nom.slice(0, 120) : null,
            poids: positif(v?.poids),
            format: FORMATS_VIDEO.find((f) => f === v?.format) ?? null,
            cadre: cadreDepuis(v?.cadre),
          }
        : null,
  };
}

/** Les réglages à enregistrer : comme à la lecture, et les fichiers doivent venir du dossier du joueur (`prefixe`). */
export function areneValide(raw: unknown, prefixe: string): Arene {
  const a = areneDepuis(raw);
  const image = a.image?.startsWith(prefixe) ? a.image : null;
  return { ...a, image, fond: a.fond === "image" && !image ? null : a.fond, video: a.video?.url.startsWith(prefixe) ? a.video : null };
}

/** Les fichiers de son dossier dont ses réglages se servent : le ménage garde ceux-là. */
export function fichiersArene(a: Arene): Set<string> {
  const noms = [a.image, a.video?.url].flatMap((u) => (u ? [u.split("/").pop() ?? ""] : []));
  return new Set(noms.filter(Boolean));
}

/** La peinture de départ d'un joueur : toujours la même pour lui, et rarement la même que son adversaire. */
function fondDeDepart(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return FONDS[h % FONDS.length];
}

/** Ce qui remplit sa bannière : son image, la peinture choisie, sinon celle de départ. */
export function fondDe(a: Arene, id: string): { src: string; y: string } {
  if (a.fond === "image" && a.image) return { src: a.image, y: "50%" };
  return FONDS.find((f) => f.key === a.fond) ?? fondDeDepart(id);
}

export const couleurTrait = (t: TraitCle): string => TRAITS.find((x) => x.key === t)?.couleur ?? TRAITS[0].couleur;
