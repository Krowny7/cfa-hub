import type { StatutMaitrise } from "@/lib/maitrise";
import type { VersDivision } from "@/lib/ranks";
import type { LigneTrophee, PalierTrophee, SourceTrophee } from "@/lib/trophees";

// Le contrat de la page Moi « La synthèse » (maquette D) : tout ce que les
// cartes affichent, en données simples (aucune fonction : ce qui passe du
// serveur à un îlot client doit se sérialiser). Chaque bloc vaut `T | null`,
// jamais une valeur inventée : une source absente (migration non collée, pas
// de clé de service) laisse le bloc à null et la carte se masque ou se
// simplifie (plan d'intégration, « règle de repli »). Les dates arrivent déjà
// formatées quand elles s'affichent telles quelles (le serveur les écrit, pas
// le navigateur : pas d'écart d'hydratation).

/** Rouge sous 50 %, ambre de 50 à 69, vert (acquis) à 70 et plus. */
export type Zone = "r" | "a" | "e";

// ── Le joueur ──────────────────────────────────────────────────────────────

export type RangSynthese = {
  /** index du palier dans TIERS (0 = Bronze … 7 = Top 10) */
  tier: number;
  /** « III », « II », « I », ou null (Top 10, placement) */
  division: string | null;
  /** « Platine II », « Top 10 », « Placement » */
  palier: string;
  elo: number;
  /** la place au classement du programme (null : pas de ligne) et le nombre de joueurs classés */
  place: number | null;
  joueurs: number | null;
  /** maîtrise du programme (ancienne mesure, 0–100) : le halo de l'insigne */
  maitrise: number;
  placement: boolean;
  /** parties classées jouées */
  jouees: number;
  /** où mène la barre : division suivante, verrou de maîtrise, sommet, placement */
  vers: VersDivision;
};

export type TempsSynthese = {
  /** « 34 h 20 » */
  total: string;
  /** « 4 h 10 » : les 7 derniers jours */
  semaine: string;
  /** « 16 juin » : depuis quand court le total ; null si inconnu */
  depuis: string | null;
};

export type CodexSynthese = { faites: number; xp: number; aRecuperer: number };

/** Les marquées : null pour une source absente (table non collée). */
export type MarqueesSynthese = { questions: number | null; cartes: number | null };

export type JoueurSynthese = {
  /** l'identifiant du joueur (le lien « Personnaliser » mène à sa page) */
  id: string;
  nom: string;
  avatar: string | null;
  /** « J-110 », « Jour J » ; null sans date d'examen ou une fois passée */
  jn: string | null;
  rang: RangSynthese;
  temps: TempsSynthese | null;
  /** les questions corrigées aujourd'hui (Paris), toutes sources, et les justes ; null si la lecture échoue */
  reussite: { n: number; justes: number } | null;
  /** null sans Codex lisible : la ligne disparaît (et la cible de Léonard avec elle) */
  codex: CodexSynthese | null;
  marquees: MarqueesSynthese | null;
};

// ── L'objectif ─────────────────────────────────────────────────────────────

export type StatutPlanSynthese = "actif" | "atteint" | "passe";

/** Un point de la trajectoire : le jour (AAAA-MM-JJ) et le cumul de questions à la fin de ce jour. */
export type PointCumul = { day: string; cumul: number };

export type ObjectifPlan = {
  etat: "plan";
  /** le jour de l'examen et celui d'aujourd'hui (AAAA-MM-JJ, Paris) */
  examen: string;
  aujourdhui: string;
  total: number;
  /** questions posées avant aujourd'hui, et aujourd'hui */
  avant: number;
  jour: number;
  statut: StatutPlanSynthese;
  /** objectif du jour (0 si le plan n'est plus actif) et jours qui restent, l'examen exclu */
  quotidien: number;
  joursRestants: number;
  /** questions par jour, moyenne des 14 derniers jours */
  rythme: number;
  /** cumul attendu ce matin sur la droite de l'objectif */
  ideal: number;
  /** cumul projeté le jour de l'examen au rythme récent */
  projection: number;
  /** le cumul jour par jour, sous-échantillonné (7 points au plus, le dernier étant aujourd'hui) */
  serie: PointCumul[];
  /** le bouton de la quête : une séance ciblée sur ta matière mesurée la plus faible ; null si le plan n'est plus actif */
  hrefQuete: string | null;
};

/** Pas d'objectif ou pas de date d'examen : la carte invite à les fixer. */
export type ObjectifSans = { etat: "sans" };

export type ObjectifSynthese = ObjectifPlan | ObjectifSans;

/** La note estimée « si l'examen était aujourd'hui » ; la carte la masque sous 50 % de programme mesuré (`couverture`). */
export type NoteSynthese = { estimee: number; couverture: number; seuil: 70 };

// ── Les matières et les notions (cartes des lots suivants) ─────────────────

/** Une valeur pour chaque comparaison du sélecteur : il y a 3, 30, 60 et 90 jours. */
export type ParComparaison<T> = { 3: T; 30: T; 60: T; 90: T };

export type MatiereSynthese = {
  cle: string;
  nom: string;
  court: string;
  mini: string;
  poids: number;
  pct: number | null;
  statut: StatutMaitrise;
  n: number;
  total: number;
  /** la maîtrise il y a 3, 30, 60 et 90 jours (null : pas mesurée à la date) ; null en bloc sans l'historique */
  ilYa: ParComparaison<number | null> | null;
  /** les réponses données depuis chacune de ces dates (0 : aucune) ; null sans activite_depuis */
  reponses: ParComparaison<number> | null;
  /** la moyenne des joueurs (même règle) ; null sous 5 joueurs */
  moyJoueurs: number | null;
  /** les points de préparation à gagner en remontant à 70 % */
  gain: number;
  hrefReviser: string;
  hrefEntrainer: string;
};

/** La maîtrise globale aujourd'hui et il y a 3, 30, 60, 90 jours ; les réponses depuis chaque date, toutes matières (null sans activite_depuis). */
export type GlobaleSynthese = { auj: number; ilYa: ParComparaison<number | null> | null; reponses: ParComparaison<number> | null };

export type EtatNotion = "r" | "a" | "e" | "encours" | "jamais";

/** Une notion du catalogue, en objet court (la liste part dans deux îlots). */
export type NotionSynthese = {
  id: string;
  /** index de la matière dans `matieres` */
  m: number;
  court: string;
  pct: number | null;
  n: number;
  etat: EtatNotion;
  href: string;
};

// ── Les cartes à sources nouvelles (lots suivants) ─────────────────────────

export type CalculSynthese = {
  /** moyenne pondérée sur les seules matières mesurées des deux côtés ; null sous 3 matières */
  global: { avec: number; sans: number } | null;
  matieres: { cle: string; court: string; avec: number | null; sans: number | null }[];
};

export type RythmeSynthese = {
  /** secondes par question, toutes copies chronométrées ; null sous 20 questions */
  global: number | null;
  questions: number;
  matieres: { cle: string; court: string; secondes: number; n: number }[];
};

export type ProgressionSynthese = {
  /** la préparation à chaque date (la dernière est aujourd'hui) */
  points: number[];
  /** les dates, déjà formatées par le serveur */
  dates: string[];
  /** une série par matière (10), même longueur que `points` */
  matieres: (number | null)[][];
  /** le jour d'aujourd'hui (AAAA-MM-JJ, Paris) : il date la projection */
  aujourdhui: string;
  /** le jour de l'examen (AAAA-MM-JJ) ; null sans date ou une fois passé */
  examen: string | null;
};

export type TropheesSynthese = {
  total: number;
  parPalier: Record<PalierTrophee, number>;
  lignes: LigneTrophee[];
  /** false : seul l'entraînement ciblé est compté (sans migration_v3_profil.sql §2) */
  complet: boolean;
  dernier: { source: SourceTrophee; palier: PalierTrophee; nom: string; regle: string | null } | null;
};

export type SyntheseMoi = {
  joueur: JoueurSynthese;
  objectif: ObjectifSynthese;
  note: NoteSynthese | null;
  matieres: MatiereSynthese[] | null;
  globale: GlobaleSynthese | null;
  notions: NotionSynthese[] | null;
  /** d'où viennent les notions : « unique » (20 réponses, sans limite de date), « 90j » (repli), null (carte masquée) */
  sourceNotions: "unique" | "90j" | null;
  calcul: CalculSynthese | null;
  rythme: RythmeSynthese | null;
  progression: ProgressionSynthese | null;
  trophees: TropheesSynthese | null;
};
