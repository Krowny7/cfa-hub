import type { DuelPlayerCard } from "@/lib/duels";
// Données reçues par les composants de l'espace Classement (props
// sérialisables : la page serveur les charge, la page d'aperçu les invente).
import type { DuelSummary, RatingEvent } from "@/lib/rating";
import type { StyleBanniere, StyleProfil } from "@/lib/profil/catalogue";

export type BoardRow = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  elo: number;
  gamesPlayed: number;
  rank: number;
  /** maîtrise du programme 0–100, null si inconnue */
  mastery: number | null;
  /** variation d'ELO au dernier match, null si aucun */
  lastDelta: number | null;
  isMe: boolean;
  /** image de bannière du profil (chargée pour les trois premiers seulement : le podium) */
  bannerUrl?: string | null;
  /** le titre porté, lisible (« Copiste ») : le podium seulement */
  titre?: string | null;
  /**
   * la bannière verticale du podium (les trois premiers seulement ; absents : pas de personnage, le filet d'encre) :
   * l'adresse du personnage, sa taille (50 à 160, 100 : sa taille de base), sa position verticale (0 à 100, 50 : à sa place)
   * et la clé nue de l'ornement porté — à dessiner avec cadragePerso (lib/profil/perso.ts)
   */
  perso?: string | null;
  persoTaille?: number;
  persoPos?: number;
  ornement?: string;
};

export type NextExam = {
  id: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  questionCount: number;
  status: "draft" | "open" | "closed";
  registered: boolean;
  /** nombre d'inscrits (null si inconnu) */
  registrants: number | null;
  /** la fenêtre de passage est ouverte en ce moment */
  windowOpen: boolean;
  windowEnd: string;
};

/** Examen blanc classé terminé (onglet « Examens classés »). */
export type PastExam = {
  id: string;
  title: string;
  scheduledAt: string;
  questionCount: number;
  /** mon score (null si je n'ai pas passé l'examen) */
  score: number | null;
  total: number | null;
  /** variation d'ELO reçue à la clôture (null si pas appliquée) */
  delta: number | null;
};

export type MyRank = {
  elo: number;
  gamesPlayed: number;
  /** maîtrise du programme 0–100 */
  mastery: number;
  /** place au classement (1 = premier), null si pas encore de ligne */
  leaderboardRank: number | null;
  /** joueurs au classement, null si inconnu */
  totalPlayers: number | null;
};

/** Une ligne de l'onglet « Amis » (un ami, ou toi : `isMe`). */
export type AmiRow = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  elo: number;
  gamesPlayed: number;
  /** place générale (1 = premier), null si inconnue */
  rank: number | null;
  /** maîtrise du programme 0–100, null si inconnue (pas de verrou sur l'insigne) */
  mastery: number | null;
  isMe: boolean;
};

export type ClassementData = {
  /** aperçus seulement : les joueurs que la bande de recherche propose, sans base */
  joueursExemple?: DuelPlayerCard[];
  me: MyRank;
  history: RatingEvent[];
  board: BoardRow[];
  /** ma ligne si je ne suis pas dans `board` */
  meRow: BoardRow | null;
  exam: NextExam | null;
  /** examens classés terminés, du plus récent au plus ancien */
  pastExams: PastExam[];
  openDuels: DuelSummary[];
  recentDuels: DuelSummary[];
  /** l'onglet « Amis » : tes amis et toi, classés par place générale ; null ou absent : lecture indisponible (état vide) */
  amis?: AmiRow[] | null;
  /** « Ton plus grand rival » : null ou absent, la carte ne s'affiche pas */
  rival?: RivalData | null;
  /** « Les maîtres de chaque matière » : null ou absent, la carte ne s'affiche pas */
  maitres?: MaitreMatiere[] | null;
};

/** Les épreuves où deux joueurs se croisent : duels, les 30 du jour, les 5 du jour, examens blancs classés. */
export type EpreuveRival = "duel" | "trente" | "cinq" | "examen";

/** Le bilan face à un joueur dans une épreuve : rencontres, qui a fait mieux, égalités. */
export type BilanEpreuve = {
  epreuve: EpreuveRival;
  /** nombre de rencontres dans cette épreuve (moi + lui + nuls) */
  rencontres: number;
  /** fois où j'ai fait mieux */
  moi: number;
  /** fois où il a fait mieux */
  lui: number;
  nuls: number;
};

/**
 * « Ton plus grand rival » : le joueur le plus croisé, toutes épreuves
 * confondues (components/classement/rival.ts), avec ce qu'il faut pour sa
 * carte (bannière, sceau, insigne, rang). `null` côté données : pas de clé
 * admin, rien de joué ensemble → la carte ne s'affiche pas.
 */
export type RivalData = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  elo: number;
  gamesPlayed: number;
  /** place générale, null si inconnue */
  rank: number | null;
  /** maîtrise du programme 0–100, null si inconnue (pas de verrou sur l'insigne) */
  mastery: number | null;
  niveau: number;
  /** la bannière et le sceau ; le personnage, son cadrage et l'ornement (StyleBanniere) quand la carte les dessine */
  style: Pick<StyleProfil, "banner" | "bannerUrl" | "bannerPos" | "accent" | "frame"> & Partial<StyleBanniere>;
  /** rencontres, toutes épreuves confondues */
  rencontres: number;
  /** bilan cumulé : fois où j'ai fait mieux / où il a fait mieux (les égalités ne comptent ni pour l'un ni pour l'autre) */
  moi: number;
  lui: number;
  /** le détail par épreuve, seulement celles où ils se sont croisés (ordre fixe : duels, 30, 5, examens) */
  epreuves: BilanEpreuve[];
};

/** Un joueur classé dans une matière (le maître, ou toi). */
export type MaitreJoueur = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  /** sa maîtrise de la matière, 0–100 */
  pct: number;
  elo: number;
  gamesPlayed: number;
  /** maîtrise du programme 0–100, null si inconnue */
  mastery: number | null;
  /** place générale (pour le Top 10), null si inconnue */
  rank: number | null;
};

/** Une matière du programme : son maître et ta position. */
export type MaitreMatiere = {
  /** clé de lib/practiceTopics.ts (« fixed_income ») */
  cle: string;
  /** libellé court (« Fixed Income ») */
  court: string;
  /** le meilleur joueur de la matière ; null : personne d'assez qualifié */
  maitre: MaitreJoueur | null;
  /** c'est toi le maître */
  cestToi: boolean;
  /** ta maîtrise dans la matière (null : moins de 5 questions, pas mesurée) */
  moiPct: number | null;
  /** ta place parmi les joueurs classés de la matière ; null : pas classé (pas assez de réponses) */
  moiPlace: number | null;
  /** tes réponses dans la matière (séances ciblées) */
  moiReponses: number;
};
