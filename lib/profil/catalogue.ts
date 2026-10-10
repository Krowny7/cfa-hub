// Le profil de joueur : ce qui se personnalise, ce qui se gagne, et la
// validation d'un style avant écriture. La règle : ce qui est fixe est
// libre (l'image de la bannière ou un motif fixe, la couleur, la vitrine, le
// radar, la bio, le nom) ; ce qui bouge ou qui brille se gagne (les cadres
// de métal au nombre de questions ; les cadres liquides et l'aura au pic de
// palier ; le cadre « Dorure » et les bannières vivantes aux sceaux). Pas
// d'inventaire : ce qu'on possède se déduit de ce qu'on a fait (Acquis).
// Rien ne s'achète, et une pièce portée ne se reprend pas.
// Module neutre (client et serveur) : le serveur revalide tout avant
// d'écrire (app/moi/profil/actions.ts).

import { TIERS } from "@/lib/ranks";
import type { DatePalier, EtatSceau } from "@/lib/profil/sceaux";
import { DISPOSITION_DEFAUT, blocsDe, dispositionDepuis, validerDisposition, type Disposition, type Prefixes } from "@/lib/profil/disposition";

/** Ce que le joueur a accompli (vitrine, cadres). */
export type ProfilStats = {
  /** questions posées, toutes sources */
  questions: number;
  /** plus longue série de jours avec au moins une question */
  meilleureSerie: number;
  /** série en cours (jusqu'à hier si rien aujourd'hui) */
  serie: number;
  /** questions posées aujourd'hui (Paris) : le dernier jour du carnet du Journal */
  duJour?: number;
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

// ── Ce qui se gagne ────────────────────────────────────────────────────
/** La condition d'une pièce gagnée. */
export type Condition =
  | { k: "questions"; n: number }
  /** avoir atteint ce palier (index dans TIERS) au moins une fois */
  | { k: "pic"; palier: number }
  /** n sceaux à la dorure */
  | { k: "dorures"; n: number }
  /** un sceau à ce palier au moins (1 encre, 2 vermillon, 3 dorure) */
  | { k: "sceau"; cle: string; palier: number };

/** Ce que le joueur a fait : de quoi ouvrir les pièces gagnées. */
export type Acquis = {
  questions: number;
  /** meilleur palier atteint (index dans TIERS) */
  pic: number;
  /** ses sceaux (paliers, et dates avec la base) */
  sceaux: EtatSceau[];
  /** la date du premier passage à chaque palier (index dans TIERS) ; null : inconnue */
  datesPic: (string | null)[];
};

export const acquisDe = (s: ProfilStats, sceaux: EtatSceau[] = [], datesPic: (string | null)[] = []): Acquis => ({ questions: s.questions, pic: s.palierMax, sceaux, datesPic });

/** Le palier d'un sceau (0 : pas gagné). */
const palierSceau = (a: Acquis, cle: string): number => a.sceaux.find((e) => e.def.cle === cle)?.palier ?? 0;
/** Les sceaux à la dorure. */
export const dorures = (a: Acquis) => a.sceaux.filter((e) => e.palier === 3).length;

/** La condition est remplie (null : pièce libre). */
export function remplie(c: Condition | null, a: Acquis): boolean {
  if (!c) return true;
  switch (c.k) {
    case "questions":
      return a.questions >= c.n;
    case "pic":
      return a.pic >= c.palier;
    case "dorures":
      return dorures(a) >= c.n;
    case "sceau":
      return palierSceau(a, c.cle) >= c.palier;
  }
}

/** Le jour où la condition a été remplie, s'il est connu (le pic : rating_events ; les sceaux : la base). */
export function dateGagnee(c: Condition | null, a: Acquis): DatePalier | null {
  if (!c || !remplie(c, a)) return null;
  switch (c.k) {
    case "pic": {
      const iso = a.datesPic[c.palier];
      return iso ? { iso, avant: false } : null;
    }
    case "sceau":
      return a.sceaux.find((e) => e.def.cle === c.cle)?.dates?.[c.palier - 1] ?? null;
    case "dorures": {
      // la n-ième dorure, si toutes sont datées
      const dates = a.sceaux.filter((e) => e.palier === 3).map((e) => e.dates?.[2] ?? null);
      if (dates.some((d) => !d)) return null;
      return (dates as DatePalier[]).sort((x, y) => x.iso.localeCompare(y.iso))[c.n - 1] ?? null;
    }
    case "questions":
      return null;
  }
}

// ── Bannières : une image à soi, ou un motif ───────────────────────────
// (les motifs fixes sont libres, « Feuille d'or » et « Éclat de diamant »
// compris ; leurs versions vivantes se gagnent aux sceaux)
export type Motif = {
  key: string;
  nom: string;
  /** ce qu'il faut pour la gagner (absente : libre) */
  condition?: Condition;
  /** elle bouge (boucle légère, figée en mouvement réduit) */
  anime?: true;
};
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
  { key: "encre-vivante", nom: "Encre vivante", condition: { k: "sceau", cle: "assiduite", palier: 2 }, anime: true },
  { key: "or-vivant", nom: "Or vivant", condition: { k: "sceau", cle: "copie-pleine", palier: 3 }, anime: true },
];
export const motifDe = (key: string | null | undefined) => MOTIFS.find((m) => m.key === key) ?? null;
export const motifDebloque = (m: Motif, a: Acquis) => remplie(m.condition ?? null, a);

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

// ── Cadres du sceau ────────────────────────────────────────────────────
// De métal, gagnés au nombre de questions posées ; liquides (le liquide
// marbré du palier, comme son insigne), gagnés au pic de palier atteint une
// fois ; l'aura électrique au pic Grand Maître ; la « Dorure » à 3 sceaux
// dorés. Ces trois familles bougent (components/profil/CadreVivant.tsx).
export type Cadre = {
  key: string;
  nom: string;
  /** ce qu'il faut pour le gagner (null : libre) */
  condition: Condition | null;
  metal: [string, string, string] | null;
  /** il bouge : le liquide d'un palier, l'aura électrique, le reflet de la dorure */
  anime?: "liquide" | "aura" | "dorure";
  /** le palier (index dans TIERS) dont il prend le liquide */
  palier?: number;
};
const metal = (key: string) => TIERS.find((t) => t.key === key)?.metal ?? null;
const questions = (n: number): Condition => ({ k: "questions", n });
/** les paliers qui ont leur cadre liquide : de Platine au Top 10 */
const PALIERS_LIQUIDES = [3, 4, 5, 6, 7];
export const CADRES: Cadre[] = [
  { key: "aucun", nom: "Sans cadre", condition: null, metal: null },
  { key: "pinceau", nom: "Pinceau", condition: null, metal: null },
  { key: "bronze", nom: "Bronze", condition: questions(100), metal: metal("bronze") },
  { key: "argent", nom: "Argent", condition: questions(250), metal: metal("argent") },
  { key: "or", nom: "Or", condition: questions(500), metal: metal("or") },
  { key: "platine", nom: "Platine", condition: questions(1000), metal: metal("platine") },
  { key: "diamant", nom: "Diamant", condition: questions(2500), metal: metal("diamant") },
  { key: "maitre", nom: "Maître", condition: questions(5000), metal: metal("maitre") },
  { key: "grand-maitre", nom: "Grand Maître", condition: questions(10000), metal: metal("grand-maitre") },
  ...PALIERS_LIQUIDES.map((i): Cadre => ({ key: `liquide-${TIERS[i].key}`, nom: `Liquide ${TIERS[i].name}`, condition: { k: "pic", palier: i }, metal: TIERS[i].metal, anime: "liquide", palier: i })),
  { key: "aura", nom: "Aura", condition: { k: "pic", palier: 6 }, metal: metal("grand-maitre"), anime: "aura", palier: 6 },
  { key: "dorure", nom: "Dorure", condition: { k: "dorures", n: 3 }, metal: ["#FFF3C4", "#DDAE45", "#6F4C0E"], anime: "dorure" },
];
export const cadreDe = (key: string | null | undefined) => CADRES.find((c) => c.key === key) ?? CADRES[0];
export const cadreDebloque = (c: Cadre, a: Acquis) => remplie(c.condition, a);

/** Les pièces qu'un sceau ouvre (la fiche du sceau : « Débloque : … »). */
export const piecesDuSceau = (cle: string): { type: "cadre" | "banniere"; nom: string; palier: number }[] => [
  ...CADRES.flatMap((c) => (c.condition?.k === "sceau" && c.condition.cle === cle ? [{ type: "cadre" as const, nom: c.nom, palier: c.condition.palier }] : [])),
  ...MOTIFS.flatMap((m) => (m.condition?.k === "sceau" && m.condition.cle === cle ? [{ type: "banniere" as const, nom: m.nom, palier: m.condition.palier }] : [])),
];
/** Le cadre qui compte les sceaux dorés (« Dorure ») et combien il en faut. */
export const CADRE_DORURES = CADRES.flatMap((c) => (c.condition?.k === "dorures" ? [{ nom: c.nom, n: c.condition.n }] : []))[0] ?? null;

// ── Vitrine ────────────────────────────────────────────────────────────
// (le rang n'y figure plus : il est déjà en grand dans l'en-tête ; un
// « rang » enregistré est remplacé par une autre pièce, voir vitrineDepuis)
export const VITRINE = [
  { key: "questions", nom: "Questions posées" },
  { key: "serie", nom: "Série" },
  { key: "duels", nom: "Duels" },
  { key: "matiere", nom: "Meilleure matière" },
  { key: "defis", nom: "Défis du jour" },
  { key: "calculs", nom: "Calculs" },
] as const;
export type VitrineKey = (typeof VITRINE)[number]["key"];
export const VITRINE_MAX = 3;

/** Les pièces de vitrine d'une liste brute : connues, sans doublon, 3 au plus ; « rang » devient une autre pièce. */
export function vitrineDepuis(liste: unknown): VitrineKey[] {
  const connues = new Set<string>(VITRINE.map((v) => v.key));
  const brute = Array.isArray(liste) ? liste.filter((k): k is string => typeof k === "string") : [];
  const out: VitrineKey[] = [];
  for (const k of brute) {
    let cle = k;
    if (k === "rang") cle = (["matiere", "duels", "defis", "calculs", "serie", "questions"] as const).find((x) => !brute.includes(x) && !out.includes(x)) ?? "";
    if (connues.has(cle) && !out.includes(cle as VitrineKey)) out.push(cle as VitrineKey);
  }
  return out.slice(0, VITRINE_MAX);
}

// ── Ambiance de la page et hauteur de la bannière ──────────────────────
export type Ambiance = "aucune" | "teinte" | "banniere";
export const AMBIANCES: { key: Ambiance; nom: string; aide: string }[] = [
  { key: "aucune", nom: "Sobre", aide: "Le papier du site, rien de plus." },
  { key: "teinte", nom: "Teinte", aide: "Un voile de ta couleur en haut de la page." },
  { key: "banniere", nom: "Bannière floutée", aide: "Ton image, floutée, en fond de page." },
];
export type HauteurBanniere = "fine" | "normale" | "haute";
export const HAUTEURS: { key: HauteurBanniere; nom: string }[] = [
  { key: "fine", nom: "Fine" },
  { key: "normale", nom: "Normale" },
  { key: "haute", nom: "Haute" },
];

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
  /** le radar des matières sur le profil (suit la disposition) */
  radar: boolean;
  bio: string | null;
  /** l'ordre, la largeur et les médias des blocs sous l'en-tête */
  disposition: Disposition;
  /** le fond de la page : sobre, teinté de sa couleur, ou sa bannière floutée */
  ambiance: Ambiance;
  bannerH: HauteurBanniere;
};

export const STYLE_DEFAUT: StyleProfil = {
  banner: "lavis",
  bannerUrl: null,
  bannerPos: 50,
  accent: COULEUR_ENCRE,
  frame: "aucun",
  showcase: ["questions", "serie", "matiere"],
  radar: true,
  bio: null,
  disposition: DISPOSITION_DEFAUT,
  ambiance: "aucune",
  bannerH: "normale",
};
export const BIO_MAX = 160;
export const NOM_MAX = 60;

export type Visibilite = "public" | "friends" | "private";
export type LienProfil = { linkedin: string | null; visibilite: Visibilite };
export const LIEN_DEFAUT: LienProfil = { linkedin: null, visibilite: "friends" };

/** Prénom et nom sous le pseudo : pour tous, ou pour les amis. */
export type NomProfil = { nom: string | null; visibilite: "public" | "friends" };
export const NOM_DEFAUT: NomProfil = { nom: null, visibilite: "friends" };

/**
 * Une adresse LinkedIn de profil, normalisée (https://www.linkedin.com/in/…),
 * ou null si invalide. Les accents sont permis (LinkedIn les accepte dans
 * l'adresse d'un profil) : ils sont encodés (« théo » → « th%C3%A9o »).
 */
export function normaliserLinkedin(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const m = /^(?:https?:[/][/])?(?:([a-z]{2,3}|www)[.])?linkedin[.]com[/]in[/]([^/?#\s]{2,200})[/]?(?:[?#].*)?$/i.exec(s);
  if (!m) return null;
  let slug = m[2];
  try {
    slug = decodeURIComponent(slug);
  } catch {
    return null;
  }
  if (!/^[\p{L}\p{M}\p{N}_-]{2,100}$/u.test(slug)) return null;
  const enc = encodeURIComponent(slug);
  return enc.length <= 100 ? `https://www.linkedin.com/in/${enc}/` : null;
}

/** L'adresse LinkedIn lisible (accents décodés), pour le champ de saisie. */
export function linkedinLisible(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
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
 * stockage ; une image ailleurs est refusée. `prefixesMedias` : de même pour
 * les images et la vidéo de la disposition (buckets profil-medias et
 * profil-videos).
 */
export function validerStyle(
  input: Partial<StyleProfil>,
  a: Acquis,
  prefixeImage: string | null,
  prefixesMedias: Prefixes | null = null,
  porte: Pick<StyleProfil, "frame" | "banner"> | null = null,
): { style: StyleProfil; refus: string[] } {
  const refus: string[] = [];
  // gagné, ou déjà porté (on ne reprend rien : un pic de Top 10 perdu garde son cadre)
  const c = CADRES.find((x) => x.key === input.frame);
  let frame = STYLE_DEFAUT.frame;
  if (c) {
    if (cadreDebloque(c, a) || c.key === porte?.frame) frame = c.key;
    else refus.push(`le cadre ${c.nom}`);
  }
  const m = motifDe(input.banner);
  let banner = STYLE_DEFAUT.banner;
  if (m) {
    if (motifDebloque(m, a) || m.key === porte?.banner) banner = m.key;
    else refus.push(`la bannière ${m.nom}`);
  }
  const url = typeof input.bannerUrl === "string" ? input.bannerUrl.trim() : "";
  const bannerUrl = url && prefixeImage && url.startsWith(prefixeImage) && /^[A-Za-z0-9:/._%-]+$/.test(url) && url.length <= 500 ? url : null;
  if (url && !bannerUrl) refus.push("l'image de bannière");
  const keys = new Set<string>(VITRINE.map((v) => v.key));
  const disp = Array.isArray(input.disposition) ? validerDisposition(input.disposition, prefixesMedias) : null;
  if (disp) refus.push(...disp.refus);
  const disposition = disp ? disp.disposition : dispositionDepuis(null, input.radar !== false);
  return {
    style: {
      banner,
      bannerUrl,
      bannerPos: Math.max(0, Math.min(100, Math.round(Number(input.bannerPos ?? 50)) || 0)),
      accent: estCouleur(input.accent) ? input.accent.toLowerCase() : STYLE_DEFAUT.accent,
      frame,
      showcase: vitrineDepuis(input.showcase),
      radar: blocsDe(disposition).some((b) => b.k === "radar"),
      bio: nettoyerBio(input.bio),
      disposition,
      ambiance: AMBIANCES.some((a) => a.key === input.ambiance) ? (input.ambiance as Ambiance) : STYLE_DEFAUT.ambiance,
      bannerH: HAUTEURS.some((h) => h.key === input.bannerH) ? (input.bannerH as HauteurBanniere) : STYLE_DEFAUT.bannerH,
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
    showcase: Array.isArray(row.showcase) ? vitrineDepuis(row.showcase) : STYLE_DEFAUT.showcase,
    radar: row.show_radar !== false,
    bio: typeof row.bio === "string" ? nettoyerBio(row.bio) : null,
    disposition: dispositionDepuis(row.layout, row.show_radar !== false),
    ambiance: AMBIANCES.some((a) => a.key === row.ambiance) ? (row.ambiance as Ambiance) : STYLE_DEFAUT.ambiance,
    bannerH: HAUTEURS.some((h) => h.key === row.banner_h) ? (row.banner_h as HauteurBanniere) : STYLE_DEFAUT.bannerH,
  };
}
