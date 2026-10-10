// Les Sceaux du profil : des sceaux à trois paliers (encre, vermillon,
// dorure). Les 16 premiers se calculent depuis ProfilStats (statsProfil,
// lib/profil/donnees.ts). Avec migration_profil_sceaux.sql, 6 de plus
// (SCEAUX_BASE : les quatre mentions de duel, Coup d'éclat, Mise au
// propre, mesurés par lib/profil/sceaux-base.ts), et chaque palier gagné
// est gardé en base avec sa date : il ne se perd plus. Sans la migration,
// les 16 seuls, dérivés (une maîtrise qui baisse retire le palier).
// Les seuils ne vivent qu'ici (comme CADRES dans lib/profil/catalogue.ts) :
// le serveur s'en sert pour attribuer. Module neutre (client et serveur).

import type { ProfilStats } from "@/lib/profil/catalogue";
import type { MentionDuel } from "@/components/adn/Sceau";
import { SUBJECTS } from "@/components/reviser/catalog";

/** 0 : pas encore gagné (gaufré) ; 1 encre ; 2 vermillon ; 3 dorure */
export type Palier = 0 | 1 | 2 | 3;

export type Famille = "regularite" | "duels" | "calculs" | "examens" | "mentions" | "ratures" | "matieres";
// dans cet ordre, les petites familles tiennent sur deux rangées de 6 colonnes (Collection)
export const FAMILLES: Famille[] = ["regularite", "duels", "calculs", "examens", "mentions", "ratures", "matieres"];

/** ce que compte un sceau (le libellé vient de lib/voice-profil.ts) */
export type Unite = "jours" | "questions" | "defis" | "victoires" | "calculs" | "examens" | "maitrise" | "mentions" | "ecart" | "rayees";

export type DefSceau = {
  /** « assiduite », « matiere:fsa » */
  cle: string;
  famille: Famille;
  unite: Unite;
  /** seuils de l'encre, du vermillon et de la dorure */
  seuils: readonly [number, number, number];
  /**
   * À palier égal, l'ordre des sceaux posés d'office quand la rareté n'est
   * pas mesurée : la difficulté estimée du palier (plus haut : plus rare).
   */
  difficulte: number;
  /** la matière (clé de lib/practiceTopics.ts) d'un sceau de maîtrise */
  matiere?: string;
  /** la mention de duel comptée (famille Mentions) */
  mention?: MentionDuel;
};

/** une matière n'est mesurée qu'à partir de 40 questions */
export const MAITRISE_MIN_QUESTIONS = 40;

export const SCEAUX: DefSceau[] = [
  { cle: "assiduite", famille: "regularite", unite: "jours", seuils: [7, 30, 100], difficulte: 4 },
  { cle: "copie-pleine", famille: "regularite", unite: "questions", seuils: [500, 2500, 10000], difficulte: 2 },
  { cle: "defi-tenu", famille: "regularite", unite: "defis", seuils: [7, 30, 100], difficulte: 3 },
  { cle: "duelliste", famille: "duels", unite: "victoires", seuils: [1, 25, 100], difficulte: 5 },
  { cle: "calculateur", famille: "calculs", unite: "calculs", seuils: [50, 250, 1000], difficulte: 3 },
  { cle: "examen-blanc", famille: "examens", unite: "examens", seuils: [1, 3, 10], difficulte: 4 },
  ...SUBJECTS.map((m): DefSceau => ({ cle: `matiere:${m.key}`, famille: "matieres", unite: "maitrise", seuils: [60, 75, 90], difficulte: 1, matiere: m.key })),
];

/**
 * Les sceaux qui n'existent qu'avec la base (migration_profil_sceaux.sql) :
 * les mentions de duel (duel_mentions, calculées au règlement), Coup d'éclat
 * (battre un joueur d'un palier, puis de deux paliers au-dessus, puis un
 * joueur du Top 10 : le seuil est l'écart battu, 3 pour le Top 10) et Mise
 * au propre (ratures rayées par une bonne réponse).
 */
export const SCEAUX_BASE: DefSceau[] = [
  { cle: "coup-d-eclat", famille: "duels", unite: "ecart", seuils: [1, 2, 3], difficulte: 6 },
  { cle: "remontada", famille: "mentions", unite: "mentions", seuils: [1, 10, 25], difficulte: 5, mention: "remontada" },
  { cle: "sans-faute", famille: "mentions", unite: "mentions", seuils: [1, 10, 25], difficulte: 2, mention: "sansFaute" },
  { cle: "eclair", famille: "mentions", unite: "mentions", seuils: [1, 10, 25], difficulte: 3, mention: "eclair" },
  { cle: "sang-froid", famille: "mentions", unite: "mentions", seuils: [1, 10, 25], difficulte: 3, mention: "sangFroid" },
  { cle: "mise-au-propre", famille: "ratures", unite: "rayees", seuils: [50, 250, 1000], difficulte: 3 },
];

/** Le catalogue : les 16, plus les 6 de la base quand elle est prête. */
export const catalogueSceaux = (base: boolean): DefSceau[] => (base ? [...SCEAUX, ...SCEAUX_BASE] : SCEAUX);

/** Un sceau du catalogue, par sa clé. */
export const defSceau = (cle: string): DefSceau | null => SCEAUX.find((d) => d.cle === cle) ?? SCEAUX_BASE.find((d) => d.cle === cle) ?? null;

/** Ce que mesure la base pour ses 6 sceaux (lib/profil/sceaux-base.ts). */
export type MesuresBase = {
  mentions: Partial<Record<MentionDuel, number>>;
  /** le meilleur écart battu en duel : 1 ou 2 paliers au-dessus, 3 un joueur du Top 10 */
  coupDeclat: number;
  /** ratures rayées par une bonne réponse */
  rayees: number;
};

/** Un sceau gardé en base (table sceaux) : son palier et la date de chacun. */
export type SceauGarde = {
  cle: string;
  palier: Palier;
  /** une par palier, au jour de Paris (jamais l'heure) */
  dates: DatePalier[];
  /** attribué au premier calcul (ses premières dates sont des « avant le ») */
  retro: boolean;
  /** cérémonie déjà jouée */
  vu: boolean;
};

/** La rareté : joueurs actifs sur 90 jours, et combien d'entre eux ont atteint chaque palier. */
export type Rarete = { actifs: number; paliers: Record<string, [number, number, number]> };

/** En dessous, la rareté n'a pas de sens : on ne l'affiche pas. */
export const RARETE_MIN_ACTIFS = 30;

/** Ce que la base ajoute au calcul des sceaux. */
export type BaseSceaux = {
  /** null : mesures indisponibles ; les paliers gardés font foi */
  mesures: MesuresBase | null;
  gardes: SceauGarde[];
  rarete: Rarete | null;
};

/** La date d'obtention d'un palier ; `iso` : le jour (AAAA-MM-JJ) ; `avant` : rétroactive (« obtenu avant le … »). */
export type DatePalier = { iso: string; avant: boolean };

export type EtatSceau = {
  def: DefSceau;
  palier: Palier;
  /** la mesure du sceau (jours, questions…, ou % de maîtrise) */
  valeur: number;
  /** matière : questions répondues (la maîtrise compte à partir de 40) */
  questions: number | null;
  /** seuil du palier suivant (null : dorure) */
  prochain: number | null;
  /** avancée vers le palier suivant, de 0 à 1 (1 : dorure) */
  avance: number;
  /** la mesure n'est pas connue (sceau de la base sans ses mesures, ou vu par un autre joueur) : pas d'avancée à montrer */
  inconnu?: boolean;
  /** la base est prête : un palier gagné se garde (et peut se poser sur le profil) */
  enBase?: true;
  /** la date de chaque palier gardé en base (index : palier − 1) */
  dates?: DatePalier[];
  /** part des joueurs actifs qui ont chaque palier (null : pas assez de joueurs actifs) */
  raretes?: (number | null)[];
};

function mesure(def: DefSceau, s: ProfilStats, m: MesuresBase | null): { valeur: number; questions: number | null } {
  if (def.mention) return { valeur: m?.mentions[def.mention] ?? 0, questions: null };
  switch (def.cle) {
    case "coup-d-eclat":
      return { valeur: m?.coupDeclat ?? 0, questions: null };
    case "mise-au-propre":
      return { valeur: m?.rayees ?? 0, questions: null };
    case "assiduite":
      return { valeur: s.meilleureSerie, questions: null };
    case "copie-pleine":
      return { valeur: s.questions, questions: null };
    case "defi-tenu":
      return { valeur: s.defisRendus, questions: null };
    case "duelliste":
      return { valeur: s.duelsGagnes, questions: null };
    case "calculateur":
      return { valeur: s.calculsJustes, questions: null };
    case "examen-blanc":
      return { valeur: s.examensBlancs, questions: null };
    default: {
      const m = s.matieres.find((x) => x.key === def.matiere);
      return { valeur: m && m.pct !== null ? Math.round(m.pct) : 0, questions: m ? m.answered : 0 };
    }
  }
}

/** Le palier que donnent les mesures du jour. */
function palierMesure(def: DefSceau, valeur: number, questions: number | null): Palier {
  const mesuree = questions === null || questions >= MAITRISE_MIN_QUESTIONS;
  return (mesuree ? def.seuils.filter((x) => valeur >= x).length : 0) as Palier;
}

/** La part des joueurs actifs qui ont chaque palier d'un sceau. */
function raretesDe(cle: string, r: Rarete): (number | null)[] {
  const n = r.paliers[cle] ?? [0, 0, 0];
  // 0 : le joueur montré ne compte pas parmi les actifs calculés ; on ne dit pas « 0 % » d'un sceau qu'il a
  return n.map((x) => (r.actifs >= RARETE_MIN_ACTIFS && x > 0 ? Math.min(1, x / r.actifs) : null));
}

/**
 * L'état d'un sceau pour un joueur. Avec la base : le palier gardé compte
 * (il ne descend jamais), ses dates et sa rareté suivent.
 */
export function etatSceau(def: DefSceau, s: ProfilStats, base: BaseSceaux | null = null): EtatSceau {
  const inconnu = !!base && !base.mesures && SCEAUX_BASE.includes(def);
  const { valeur, questions } = mesure(def, s, base?.mesures ?? null);
  const mesuree = questions === null || questions >= MAITRISE_MIN_QUESTIONS;
  const garde = base?.gardes.find((g) => g.cle === def.cle) ?? null;
  const palier = Math.max(inconnu ? 0 : palierMesure(def, valeur, questions), garde?.palier ?? 0) as Palier;
  const prochain: number | null = palier < 3 ? (def.seuils as readonly number[])[palier] : null;
  let avance = 1;
  if (prochain !== null) {
    if (inconnu || def.unite === "ecart") avance = 0; // Coup d'éclat se gagne d'un coup
    else if (!mesuree) avance = (questions ?? 0) / MAITRISE_MIN_QUESTIONS;
    else {
      // une maîtrise part de 40 % (le hasard en fait déjà 33) ; un compte, de 0
      const depart = palier > 0 ? def.seuils[palier - 1] : def.unite === "maitrise" ? 40 : 0;
      avance = Math.max(0, Math.min(1, (valeur - depart) / Math.max(1, prochain - depart)));
    }
  }
  return {
    def,
    palier,
    valeur,
    questions,
    prochain,
    avance: Math.min(1, avance),
    ...(inconnu ? { inconnu } : {}),
    ...(base ? { enBase: true as const } : {}),
    ...(garde ? { dates: garde.dates } : {}),
    ...(base?.rarete ? { raretes: raretesDe(def.cle, base.rarete) } : {}),
  };
}

/** Les sceaux d'un joueur, dans l'ordre du catalogue (16, ou 22 avec la base). */
export function sceauxDe(s: ProfilStats, base: BaseSceaux | null = null): EtatSceau[] {
  return catalogueSceaux(!!base).map((d) => etatSceau(d, s, base));
}

/**
 * Les sceaux tels qu'un autre joueur les reçoit : le palier, ses jours et
 * sa rareté, sans la mesure ni l'avancée (le nombre de Remontada, de
 * ratures rayées, la maîtrise exacte restent au serveur).
 */
export const vusParUnAutre = (etats: EtatSceau[]): EtatSceau[] =>
  etats.map(({ def, palier, prochain, enBase, dates, raretes }) => ({
    def,
    palier,
    valeur: 0,
    questions: null,
    prochain,
    avance: prochain === null ? 1 : 0,
    inconnu: true,
    ...(enBase ? { enBase } : {}),
    ...(dates ? { dates } : {}),
    ...(raretes ? { raretes } : {}),
  }));

/** Les paliers du jour, à attribuer en base : { duelliste: 2, … } (paliers gagnés seulement). */
export function paliersMesures(s: ProfilStats, m: MesuresBase): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of catalogueSceaux(true)) {
    const { valeur, questions } = mesure(d, s, m);
    const p = palierMesure(d, valeur, questions);
    if (p > 0) out[d.cle] = p;
  }
  return out;
}

/** Sceaux gagnés, quel que soit leur palier (7 sur 16). */
export const sceauxGagnes = (etats: EtatSceau[]) => etats.filter((e) => e.palier > 0).length;

/** La date du palier atteint (null : pas gardé en base). */
export const dateObtenu = (e: EtatSceau): DatePalier | null => (e.palier > 0 ? (e.dates?.[e.palier - 1] ?? null) : null);

/** La part des joueurs actifs qui ont ce palier (null : pas affichée). */
export const rareteDe = (e: EtatSceau, palier: number = e.palier): number | null => (palier > 0 ? (e.raretes?.[palier - 1] ?? null) : null);

/**
 * Les 3 paliers les plus proches (sur son propre profil) : les mieux
 * avancés, hors dorures ; ni Coup d'éclat (il se gagne d'un coup), ni un
 * sceau dont la mesure manque.
 */
export function aPortee(etats: EtatSceau[], n = 3): EtatSceau[] {
  return etats
    .filter((e) => e.prochain !== null && e.avance < 1 && e.def.unite !== "ecart" && !e.inconnu)
    .sort((a, b) => b.avance - a.avance || b.palier - a.palier || b.def.difficulte - a.def.difficulte)
    .slice(0, n);
}

/**
 * Les 3 sceaux posés dans l'en-tête : ceux que le joueur a choisis (pins),
 * s'il les a encore ; sinon, d'office, les plus rares (la rareté mesurée, à
 * défaut le palier le plus haut puis la difficulté estimée), une famille
 * différente d'abord, pour que trois matières ne prennent pas toute la place.
 */
export function posesDe(etats: EtatSceau[], pins: string[] | null = null, n = 3): EtatSceau[] {
  const gagnes = etats.filter((e) => e.palier > 0);
  const choisis = (pins ?? []).map((c) => gagnes.find((e) => e.def.cle === c)).filter((e): e is EtatSceau => !!e);
  if (choisis.length) return choisis.slice(0, n);
  const rare = (e: EtatSceau) => rareteDe(e) ?? 2;
  gagnes.sort((a, b) => rare(a) - rare(b) || b.palier - a.palier || b.def.difficulte - a.def.difficulte);
  const out: EtatSceau[] = [];
  for (const e of gagnes) if (out.length < n && !out.some((x) => x.def.famille === e.def.famille)) out.push(e);
  for (const e of gagnes) if (out.length < n && !out.includes(e)) out.push(e);
  return out;
}

/** Le seuil affiché sur un sceau : celui de son palier, ou de l'encre s'il est encore gaufré. */
export const seuilAffiche = (e: EtatSceau) => e.def.seuils[Math.max(0, e.palier - 1)];
