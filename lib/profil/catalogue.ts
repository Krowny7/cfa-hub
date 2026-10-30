// Le profil de joueur : ce qui se personnalise et ce qui se gagne. La règle : ce qui est fixe est
// libre (l'image de la bannière ou un motif fixe, la couleur, la vitrine, le
// radar, la bio, le nom) ; ce qui bouge ou qui brille se gagne (les cadres
// de métal au nombre de questions ; les cadres liquides et l'aura au pic de
// palier ; le cadre « Dorure » et les bannières vivantes aux sceaux). Pas
// d'inventaire : ce qu'on possède se déduit de ce qu'on a fait (Acquis).
// Rien ne s'achète, et une pièce portée ne se reprend pas.
// Module neutre (client et serveur). La lecture d'un style en base et sa
// validation avant écriture vivent dans lib/profil/styles.ts : elles
// connaissent toutes les pièces (lib/profil/pieces.ts, qui part d'ici).

import { TIERS } from "@/lib/ranks";
import type { EtatSceau } from "@/lib/profil/sceaux";
import type { StatutMaitrise } from "@/lib/maitrise";
import { champsBaseVides, remplie, type Acquis, type ConditionProfil } from "@/lib/profil/acquis";
import { DISPOSITION_DEFAUT, type Disposition } from "@/lib/profil/disposition";
import { PERSO_POS_DEFAUT, PERSO_TAILLE_DEFAUT } from "@/lib/profil/perso";
import type { Composition } from "@/lib/profil/banniere";

/** Ce que le joueur a accompli (vitrine, cadres). */
export type ProfilStats = {
  /** questions posées, toutes sources */
  questions: number;
  /** plus longue série d'encre (jours d'affilée à 10 questions, avec joker ; au moins une question par jour sans la migration) */
  meilleureSerie: number;
  /** série en cours (jusqu'à hier si rien aujourd'hui) */
  serie: number;
  /** meilleureSerie et serie suivent la série d'encre (migration_serie_encre.sql collée), pas l'ancien calcul */
  serieEncre?: boolean;
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
  /**
   * le palier le plus haut que l'ELO ait atteint depuis toujours, sans le
   * verrou de maîtrise (inconnue à l'époque ; le Top 10 : tant qu'on y est).
   * Il ouvre les cadres liquides et l'aura, et ne se perd pas.
   */
  picAtteint: number;
  top10: boolean;
  /** maîtrise par matière (maîtrise unique, réponses ; statut : non mesurée, provisoire, mesurée) */
  matieres: { key: string; pct: number | null; answered: number; statut?: StatutMaitrise }[];
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
  picAtteint: 0,
  top10: false,
  matieres: [],
};

// ── Ce qui se gagne ────────────────────────────────────────────────────
// Les conditions, l'Acquis, remplie et dateGagnee vivent dans
// lib/profil/acquis.ts (toutes les pièces de collection, lib/profil/pieces.ts) ;
// ils restent importables d'ici. Les cadres et les motifs n'emploient que les
// conditions du profil (questions, pic, sceaux).
export { dateGagnee, dorures, remplie, sceauxGagnes, type Acquis } from "@/lib/profil/acquis";
/** La condition d'un cadre ou d'un motif (toutes les conditions : lib/profil/pieces.ts). */
export type Condition = ConditionProfil;

/** L'Acquis de ce que le profil sait déjà ; les champs du Codex, des trophées et des programmes restent vides (lireAcquis les lit). */
export const acquisDe = (s: ProfilStats, sceaux: EtatSceau[] = [], datesPic: (string | null)[] = []): Acquis => ({ questions: s.questions, pic: s.picAtteint, sceaux, datesPic, ...champsBaseVides() });

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
  { key: "examens", nom: "Examens blancs" },
] as const;
export type VitrineKey = (typeof VITRINE)[number]["key"];
export const VITRINE_MAX = 3;

/** les pièces d'une vitrine vide : aucune ne répète un chiffre du bandeau « Rapport de force » */
export const PIECES_DEFAUT: readonly VitrineKey[] = ["matiere", "duels", "defis"];
/** les pièces que le bandeau « Rapport de force » montre déjà, juste au-dessus de la grille */
const DANS_LE_RAPPORT: readonly VitrineKey[] = ["questions", "serie"];
/** celles qui les remplacent alors, dans cet ordre */
const RELEVE: readonly VitrineKey[] = ["matiere", "duels", "defis", "examens", "calculs"];
/**
 * Les pièces montrées par le bloc Chiffres clés : celles du joueur ; chez un
 * autre (le bandeau est affiché), une pièce que le bandeau répète cède sa
 * place à la suivante de la relève qu'il n'a pas choisie (pas deux fois
 * « 3 412 » l'un sous l'autre). Le serveur lit les comptes du visiteur
 * d'après elles (besoinsVisiteur).
 */
export function piecesVues(cles: readonly VitrineKey[], rapport: boolean): VitrineKey[] {
  if (!rapport) return [...cles];
  const libres = RELEVE.filter((k) => !cles.includes(k));
  return cles.map((k) => (DANS_LE_RAPPORT.includes(k) ? (libres.shift() ?? k) : k));
}

/** Les pièces de vitrine d'une liste brute : connues, sans doublon, 3 au plus ; « rang » devient une autre pièce. */
export function vitrineDepuis(liste: unknown): VitrineKey[] {
  const connues = new Set<string>(VITRINE.map((v) => v.key));
  const brute = Array.isArray(liste) ? liste.filter((k): k is string => typeof k === "string") : [];
  const out: VitrineKey[] = [];
  for (const k of brute) {
    let cle = k;
    if (k === "rang") cle = (["matiere", "duels", "defis", "calculs", "examens", "serie", "questions"] as const).find((x) => !brute.includes(x) && !out.includes(x)) ?? "";
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
  /** le titre porté sous le pseudo (clé nue d'une pièce « titre », « maitre:fsa ») ; null : aucun */
  titre: string | null;
  /** le folio posé sur la page (clé nue d'une pièce « folio », « mains ») ; null : aucun */
  folio: string | null;
  /**
   * Le personnage de la bannière verticale : l'image que le joueur envoie (un PNG détouré de préférence : il sort
   * du cadre), adresse d'un fichier de son dossier du bucket profil-medias (lib/profil/perso.ts) ; null : aucun.
   * Colonne profile_style.perso_url (migration_bannieres_perso.sql) ; null tant qu'elle manque.
   */
  perso: string | null;
  /**
   * La bannière composée par le joueur (lib/profil/banniere.ts) : fond, personnage, pièces du haut et du bas, ordre
   * d'empilement et panneau de gauche. null : pas de composition enregistrée (l'ancien personnage, s'il y en a un,
   * reste le seul calque : compositionDe). Colonne profile_style.banniere (migration_bannieres_composees.sql) ; null
   * tant qu'elle manque.
   */
  banniere: Composition | null;
  /** sa taille, en % de la taille de base : 50 à 160, 100 par défaut (profile_style.perso_taille) */
  persoTaille: number;
  /** sa position verticale : 0 remonté, 50 posé à sa place, 100 descendu (profile_style.perso_pos) */
  persoPos: number;
  /**
   * L'ornement porté, le cadre ornemental de la bannière verticale : la clé nue d'une pièce « ornement »
   * (« filet », « cartouche », « laurier », « fronton » ; lib/profil/pieces.ts). Le filet d'encre est le défaut,
   * libre pour tous (profile_style.ornement : null ou absent veut dire le filet).
   */
  ornement: string;
};

/** Ce que la bannière verticale lit du style, en plus de sa bannière : le personnage, son cadrage et l'ornement (podium, carte joueur, profil). */
export type StyleBanniere = Pick<StyleProfil, "perso" | "persoTaille" | "persoPos" | "ornement" | "banniere">;

/** L'ornement de départ, libre pour tous : le filet d'encre. */
export const ORNEMENT_DEFAUT = "filet";

export const STYLE_DEFAUT: StyleProfil = {
  banner: "lavis",
  bannerUrl: null,
  bannerPos: 50,
  accent: COULEUR_ENCRE,
  frame: "aucun",
  // la meilleure matière, les duels, les défis : rien qui répète le Rapport de force (ELO, maîtrise, questions, série)
  showcase: ["matiere", "duels", "defis"],
  radar: true,
  bio: null,
  disposition: DISPOSITION_DEFAUT,
  ambiance: "aucune",
  bannerH: "normale",
  titre: null,
  folio: null,
  perso: null,
  banniere: null,
  persoTaille: PERSO_TAILLE_DEFAUT,
  persoPos: PERSO_POS_DEFAUT,
  ornement: ORNEMENT_DEFAUT,
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
