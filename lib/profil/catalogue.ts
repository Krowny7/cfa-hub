// Le profil de joueur : ce qui se personnalise, ce qui se gagne, et la
// validation d'un style avant écriture. Tout est libre (l'image de la
// bannière ou un motif, la couleur, la vitrine, le radar, la bio, le nom),
// sauf les cadres du sceau, qui se gagnent au nombre de questions posées.
// Module neutre (client et serveur) : le serveur revalide tout avant
// d'écrire (app/moi/profil/actions.ts).

import { TIERS } from "@/lib/ranks";
import { nombre } from "@/lib/voice";

/** Ce que le joueur a accompli (vitrine, cadres). */
export type ProfilStats = {
  /** questions posées, toutes sources */
  questions: number;
  /** plus longue série de jours avec au moins une question */
  meilleureSerie: number;
  /** série en cours (jusqu'à hier si rien aujourd'hui) */
  serie: number;
  duelsGagnes: number;
  duelsJoues: number;
  defisRendus: number;
  calculsJustes: number;
  examensBlancs: number;
  niveau: number;
  /** palier actuel et meilleur palier atteint (index dans TIERS) */
  palier: number;
  palierMax: number;
  top10: boolean;
  /** maîtrise par matière (précision, questions) */
  matieres: { key: string; pct: number | null; answered: number }[];
};

export const STATS_VIDES: ProfilStats = {
  questions: 0,
  meilleureSerie: 0,
  serie: 0,
  duelsGagnes: 0,
  duelsJoues: 0,
  defisRendus: 0,
  calculsJustes: 0,
  examensBlancs: 0,
  niveau: 1,
  palier: 0,
  palierMax: 0,
  top10: false,
  matieres: [],
};

// ── Bannières : une image à soi, ou un motif ───────────────────────────
export type Motif = { key: string; nom: string };
export const MOTIFS: Motif[] = [
  { key: "lavis", nom: "Lavis" },
  { key: "papier", nom: "Papier" },
  { key: "hachures", nom: "Hachures" },
  { key: "registre", nom: "Registre" },
  { key: "trame", nom: "Trame" },
  { key: "enso", nom: "Ensō" },
  { key: "nuit", nom: "Encre de nuit" },
  { key: "feuille-or", nom: "Feuille d'or" },
  { key: "diamant", nom: "Éclat de diamant" },
];

// ── Couleur : libre (quelques teintes proposées, ou n'importe laquelle) ─
export const COULEUR_ENCRE = "encre";
export const TEINTES: { key: string; nom: string }[] = [
  { key: "encre", nom: "Encre" },
  { key: "#b4412f", nom: "Vermillon" },
  { key: "#4f5bd5", nom: "Indigo" },
  { key: "#2b7bd8", nom: "Azur" },
  { key: "#1f8a5b", nom: "Émeraude" },
  { key: "#c8962b", nom: "Or" },
  { key: "#e0674b", nom: "Corail" },
  { key: "#7a3e9d", nom: "Prune" },
];
const HEX = /^#[0-9a-f]{6}$/i;
export const estCouleur = (v: unknown): v is string => v === COULEUR_ENCRE || (typeof v === "string" && HEX.test(v));
/** La valeur CSS d'une couleur de profil (l'encre suit le thème clair ou nuit). */
export const couleurCss = (accent: string | null | undefined) => (accent && accent !== COULEUR_ENCRE && HEX.test(accent) ? accent : "var(--ink)");

// ── Cadres du sceau : gagnés au nombre de questions posées ─────────────
export type Cadre = {
  key: string;
  nom: string;
  /** questions à poser pour le débloquer (0 : libre) */
  seuil: number;
  metal: [string, string, string] | null;
};
const metal = (key: string) => TIERS.find((t) => t.key === key)?.metal ?? null;
export const CADRES: Cadre[] = [
  { key: "aucun", nom: "Sans cadre", seuil: 0, metal: null },
  { key: "pinceau", nom: "Pinceau", seuil: 0, metal: null },
  { key: "bronze", nom: "Bronze", seuil: 100, metal: metal("bronze") },
  { key: "argent", nom: "Argent", seuil: 250, metal: metal("argent") },
  { key: "or", nom: "Or", seuil: 500, metal: metal("or") },
  { key: "platine", nom: "Platine", seuil: 1000, metal: metal("platine") },
  { key: "diamant", nom: "Diamant", seuil: 2500, metal: metal("diamant") },
  { key: "maitre", nom: "Maître", seuil: 5000, metal: metal("maitre") },
  { key: "grand-maitre", nom: "Grand Maître", seuil: 10000, metal: metal("grand-maitre") },
];
export const cadreDe = (key: string | null | undefined) => CADRES.find((c) => c.key === key) ?? CADRES[0];
export const cadreDebloque = (c: Cadre, s: ProfilStats) => s.questions >= c.seuil;
/** « 632/1 000 » pour un cadre pas encore gagné, null sinon */
export const cadreProgres = (c: Cadre, s: ProfilStats) => (cadreDebloque(c, s) ? null : `${nombre(s.questions)}/${nombre(c.seuil)}`);

// ── Vitrine ────────────────────────────────────────────────────────────
export const VITRINE = [
  { key: "rang", nom: "Rang" },
  { key: "questions", nom: "Questions posées" },
  { key: "serie", nom: "Série" },
  { key: "duels", nom: "Duels" },
  { key: "matiere", nom: "Meilleure matière" },
  { key: "defis", nom: "Défis du jour" },
  { key: "calculs", nom: "Calculs" },
] as const;
export type VitrineKey = (typeof VITRINE)[number]["key"];
export const VITRINE_MAX = 3;

// ── Le style d'un profil ───────────────────────────────────────────────
export type StyleProfil = {
  /** motif de la bannière (sous l'image, ou seul) */
  banner: string;
  /** image de la bannière (envoyée par le joueur), sinon le motif */
  bannerUrl: string | null;
  /** cadrage vertical de l'image : 0 = haut, 100 = bas */
  bannerPos: number;
  /** « encre » ou une couleur #rrggbb */
  accent: string;
  frame: string;
  showcase: VitrineKey[];
  /** le radar des matières sur le profil */
  radar: boolean;
  bio: string | null;
};

export const STYLE_DEFAUT: StyleProfil = {
  banner: "lavis",
  bannerUrl: null,
  bannerPos: 50,
  accent: COULEUR_ENCRE,
  frame: "aucun",
  showcase: ["rang", "questions", "serie"],
  radar: true,
  bio: null,
};
export const BIO_MAX = 160;
export const NOM_MAX = 60;

export type Visibilite = "public" | "friends" | "private";
export type LienProfil = { linkedin: string | null; visibilite: Visibilite };
export const LIEN_DEFAUT: LienProfil = { linkedin: null, visibilite: "friends" };

/** Prénom et nom sous le pseudo : pour tous, ou pour les amis. */
export type NomProfil = { nom: string | null; visibilite: "public" | "friends" };
export const NOM_DEFAUT: NomProfil = { nom: null, visibilite: "friends" };

/** Une adresse LinkedIn de profil, normalisée (https://www.linkedin.com/in/…), ou null si invalide. */
export function normaliserLinkedin(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const m = /^(?:https?:[/][/])?(?:([a-z]{2,3}|www)[.])?linkedin[.]com[/]in[/]([A-Za-z0-9_%-]{2,100})[/]?(?:[?#].*)?$/i.exec(s);
  return m ? `https://www.linkedin.com/in/${m[2]}/` : null;
}

/** Nettoie une bio : espaces resserrés, deux retours à la ligne au plus, 160 caractères. */
export function nettoyerBio(raw: string | null | undefined): string | null {
  const s = (raw ?? "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, BIO_MAX);
  return s || null;
}

/** Nettoie un prénom et nom : lettres, espaces, tirets, apostrophes, points ; 60 caractères. */
export function nettoyerNom(raw: string | null | undefined): string | null {
  const s = (raw ?? "")
    .replace(/[^\p{L}\p{M} '’.-]/gu, "")
    .replace(/ +/g, " ")
    .trim()
    .slice(0, NOM_MAX);
  return s || null;
}

/**
 * Ne garde que des valeurs connues et des cadres gagnés (le reste revient au
 * défaut). `prefixeImage` : l'adresse publique du dossier du joueur dans le
 * stockage ; une image ailleurs est refusée.
 */
export function validerStyle(input: Partial<StyleProfil>, s: ProfilStats, prefixeImage: string | null): { style: StyleProfil; refus: string[] } {
  const refus: string[] = [];
  const c = CADRES.find((x) => x.key === input.frame);
  let frame = STYLE_DEFAUT.frame;
  if (c) {
    if (cadreDebloque(c, s)) frame = c.key;
    else refus.push(`le cadre ${c.nom}`);
  }
  const url = typeof input.bannerUrl === "string" ? input.bannerUrl.trim() : "";
  const bannerUrl = url && prefixeImage && url.startsWith(prefixeImage) && /^[A-Za-z0-9:/._%-]+$/.test(url) && url.length <= 500 ? url : null;
  if (url && !bannerUrl) refus.push("l'image de bannière");
  const keys = new Set<string>(VITRINE.map((v) => v.key));
  return {
    style: {
      banner: MOTIFS.some((m) => m.key === input.banner) ? (input.banner as string) : STYLE_DEFAUT.banner,
      bannerUrl,
      bannerPos: Math.max(0, Math.min(100, Math.round(Number(input.bannerPos ?? 50)) || 0)),
      accent: estCouleur(input.accent) ? input.accent.toLowerCase() : STYLE_DEFAUT.accent,
      frame,
      showcase: [...new Set((input.showcase ?? []).filter((k) => keys.has(k)))].slice(0, VITRINE_MAX) as VitrineKey[],
      radar: input.radar !== false,
      bio: nettoyerBio(input.bio),
    },
    refus,
  };
}

/** Un style lu en base (colonnes de profile_style), valeurs inconnues ramenées au défaut. */
export function styleDepuis(row: Record<string, unknown> | null | undefined): StyleProfil {
  if (!row) return STYLE_DEFAUT;
  const keys = new Set<string>(VITRINE.map((v) => v.key));
  return {
    banner: MOTIFS.some((m) => m.key === row.banner) ? (row.banner as string) : STYLE_DEFAUT.banner,
    bannerUrl: typeof row.banner_url === "string" && row.banner_url ? row.banner_url : null,
    bannerPos: Number.isFinite(Number(row.banner_pos)) ? Math.max(0, Math.min(100, Number(row.banner_pos))) : 50,
    accent: estCouleur(row.accent) ? (row.accent as string) : STYLE_DEFAUT.accent,
    frame: CADRES.some((c) => c.key === row.frame) ? (row.frame as string) : STYLE_DEFAUT.frame,
    showcase: Array.isArray(row.showcase) ? (row.showcase.filter((k) => typeof k === "string" && keys.has(k)).slice(0, VITRINE_MAX) as VitrineKey[]) : STYLE_DEFAUT.showcase,
    radar: row.show_radar !== false,
    bio: typeof row.bio === "string" ? nettoyerBio(row.bio) : null,
  };
}
