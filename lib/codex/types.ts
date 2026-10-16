// Le Codex : la grammaire des quêtes. Tout ce qui fait une quête est une
// donnée (lib/codex/catalogue.ts) ; le moteur (à venir, côté serveur) ne
// connaît que cette grammaire : des événements datés, des mesures d'état,
// des prérequis, des récompenses. Une nouvelle fonctionnalité déclare son
// type d'événement (ou de mesure) ici, ses quêtes dans le catalogue, et
// rien d'autre ne bouge. La bible : docs/codex/CONCEPTION.md.
// Module neutre (client et serveur), sans dépendance.

// ── Événements ─────────────────────────────────────────────────────────
// Le journal d'événements normalisé : d'abord une vue SQL qui assemble les
// tables existantes (sources dans EVENEMENTS, lib/codex/catalogue.ts),
// ensuite, pour ce qui n'est suivi nulle part, une table codex_evenements.

/** clé de matière (lib/practiceTopics.ts, components/reviser/catalog.ts) */
export type Matiere = string;
/** id de notion (lib/notions.ts : « fixed_income:11 ») */
export type NotionId = string;

/** D'où vient une réponse (mêmes mots que ratures.sources et lib/answer-stats.ts). */
export type SourceReponse = "fiche" | "ciblee" | "qcm" | "defi" | "cinq" | "eclair" | "duel" | "blanc" | "examen" | "atelier" | "rature" | "calc";

export type ResultatDuel = "victoire" | "defaite" | "nul";

/** Les champs de chaque type d'événement (ce que le moteur peut filtrer). */
export interface ChampsEvenement {
  /** une réponse, toutes sources (jamais comptée deux fois, comme lib/answer-stats.ts) */
  question_repondue: {
    source: SourceReponse;
    matiere: Matiere | null;
    notion: NotionId | null;
    juste: boolean;
    question: string;
    /** première réponse du joueur à cette question */
    premiere: boolean;
    /** jours depuis la réponse précédente du joueur à la même question (null : première) */
    ecartJours: number | null;
  };
  /** une séance complète (session ciblée, QCM, page de fiche, Atelier…) */
  session_terminee: {
    source: SourceReponse;
    /** null : plusieurs matières */
    matiere: Matiere | null;
    questions: number;
    justes: number;
    /** 0–100 */
    pct: number;
  };
  /** une page de drill de fiche passée en entier (quiz_answer_log, mode page) */
  drill_page_terminee: { matiere: Matiere; fiche: string; page: number; questions: number; justes: number; pct: number };
  /** les 30 du jour rendus */
  defi_rendu: { questions: number; justes: number; pct: number };
  /** les 5 du jour rendus */
  cinq_rendu: { justes: number; secondes: number | null; rang: number | null };
  /** une série éclair (5 questions) close */
  eclair_rendue: { questions: number; justes: number };
  duel_termine: {
    resultat: ResultatDuel;
    /** paliers d'écart avec l'adversaire avant le duel (positif : il était au-dessus) */
    ecartPaliers: number;
    /** l'adversaire est un ami (friendships) */
    ami: boolean;
    /** mention gagnée (duel_mentions), null sinon */
    mention: string | null;
  };
  examen_blanc_rendu: { questions: number; justes: number; pct: number; officiel: boolean; reprise: boolean };
  seance_atelier: { questions: number; justes: number; notions: number; rayees: number };
  /** une rature rayée par une bonne réponse en reprise (ratures.rayee_le) */
  rature_rayee: { matiere: Matiere | null; notion: NotionId | null; ageJours: number; erreurs: number };
  calcul_repondu: { matiere: Matiere | null; type: string; juste: boolean };
  /** ⚠ à suivre en base (aujourd'hui : localStorage du lecteur) */
  cours_ecoute: { matiere: Matiere; minutes: number };
  /** ⚠ à suivre en base (aujourd'hui : localStorage, lib/srs.ts) */
  flashcards_revues: { matiere: Matiere | null; cartes: number };
  /** ⚠ à suivre en base (ouverture du PDF d'une fiche) */
  fiche_ouverte: { matiere: Matiere; fiche: string };
  /** passage d'un palier de classement (rating_events) */
  palier_atteint: { palier: number };
  /** un jour d'encre validé (10 questions ; serie_encre) */
  jour_encre: { serie: number; joker: boolean };
  question_marquee: { matiere: Matiere | null };
  ami_ajoute: Record<string, never>;
}

export type TypeEvenement = keyof ChampsEvenement;
export type ChampDe<E extends TypeEvenement> = keyof ChampsEvenement[E] & string;

/** Un paramètre de modèle, remplacé à l'instanciation (contrats, branches). */
export type Param = { param: "matiere" | "notion" | "fiche" };

/** Comparaison d'un champ : égalité, liste de valeurs, intervalle, ou paramètre. */
export type Comparaison = string | number | boolean | null | Param | readonly (string | number)[] | { min?: number; max?: number };

export type Filtre<E extends TypeEvenement> = { [K in ChampDe<E>]?: Comparaison };

/** Sur quelle période les événements comptent (jours de Paris). */
export type Fenetre =
  | "toujours"
  /** le jour de Paris en cours (contrats du jour) */
  | "jour"
  /** la semaine en cours, du lundi au dimanche */
  | "semaine"
  /** depuis l'ouverture de la quête (prérequis remplis) : pas de rétroactivité */
  | "depuisOuverture"
  | { jours: number };

// ── Mesures ────────────────────────────────────────────────────────────
// Un état lu à l'instant (une maîtrise, un ELO, un compte de ratures).

export type TypeMesure =
  /** maîtrise d'une matière, 0–100 (lib/mastery.ts ; mesurée à partir de 40 questions, comme les sceaux) */
  | "maitrise"
  /** maîtrise du programme : moyenne des 10, les non travaillées à 0 (programMastery) */
  | "maitrise_programme"
  /** nombre de matières dont la maîtrise ≥ filtre.pct */
  | "matieres_au_dessus"
  /** notions « vues » : ≥ 5 réponses (filtre.matiere : dans cette matière) */
  | "notions_vues"
  /** part des notions vues, 0–100 (filtre.matiere possible) */
  | "notions_vues_pct"
  /** pages de drill de la fiche jamais passées en entier (0 : drill complet) */
  | "drill_pages_restantes"
  /** pages de drill passées à ≥ filtre.pct */
  | "drill_pages_reussies"
  | "elo"
  /** meilleur palier jamais atteint (ProfilStats.picAtteint, index dans TIERS) */
  | "pic_palier"
  | "niveau"
  /** série d'encre en cours / la meilleure */
  | "serie"
  | "meilleure_serie"
  /** ratures en cours (filtre.matiere possible) */
  | "ratures_ouvertes"
  | "ratures_rayees"
  /** semaines (lun.–dim.) avec ≥ filtre.n jours d'encre */
  | "semaines_actives"
  /** semaines où le rythme vers l'objectif (lib/objectif-calc.ts) a été tenu */
  | "semaines_objectif_tenu"
  /** bonnes réponses à une question déjà vue il y a ≥ filtre.n jours (révision espacée) */
  | "rappels_espaces"
  /** matières remontées de ≥ filtre.n points (maîtrise actuelle − maîtrise de ses 40 premières questions) */
  | "matieres_remontees"
  /** types de calcul tenus : ≥ 5 justes sur les 6 derniers essais */
  | "types_calcul_tenus"
  /** examens blancs rendus à ≥ filtre.pct (filtre.questions : taille minimale) */
  | "examens_blancs_au_dessus"
  /** palier d'un sceau (filtre.cle), 0–3 (lib/profil/sceaux.ts) */
  | "sceau"
  /** jour J fixé (1) ou non (0) — user_metadata rl_objectif */
  | "jour_j_fixe"
  /** visite guidée de Léonard vue (1) ou non (0) — user_metadata rl_visite */
  | "visite_vue"
  | "questions_total"
  | "duels_joues"
  | "amis"
  /** quêtes terminées d'une famille (filtre.famille) ou d'une chaîne (filtre.chaine) */
  | "quetes_terminees"
  /** branches de matière qui ont passé l'étape filtre.etape (nombre) */
  | "branches_etape"
  /** la même chose en part des branches du programme, 0–100 */
  | "branches_etape_pct";

export type FiltreMesure = {
  matiere?: Matiere | Param;
  notion?: NotionId | Param;
  /** seuil intermédiaire (matieres_au_dessus, drill_pages_reussies, examens_blancs_au_dessus) */
  pct?: number;
  /** nombre intermédiaire (jours, réponses) */
  n?: number;
  /** taille minimale (examens blancs) */
  questions?: number;
  /** clé de sceau */
  cle?: string;
  famille?: Famille;
  chaine?: string;
  etape?: EtapeBranche;
};

// ── Objectifs ──────────────────────────────────────────────────────────

/** « Fais N fois ceci » : un compteur d'événements filtrés. */
export type ObjectifCompteur = {
  [E in TypeEvenement]: {
    k: "compteur";
    evenement: E;
    filtre?: Filtre<E>;
    seuil: number;
    fenetre?: Fenetre;
    /** compter les valeurs distinctes d'un champ (pages, matières, jours…) au lieu des événements */
    distinct?: ChampDe<E> | "jour";
    /** additionner un champ (minutes, cartes) au lieu de compter */
    somme?: ChampDe<E>;
  };
}[TypeEvenement];

/** « Atteins cet état » : une mesure comparée à un seuil. */
export type ObjectifMesure = { k: "mesure"; mesure: TypeMesure; filtre?: FiltreMesure; seuil: number; sens?: ">=" | "<=" };

/**
 * Un prédicat nommé, codé à part dans le moteur, pour ce que la grammaire ne
 * dit pas (« 10 bonnes d'affilée », « revenir après 14 jours ») : à garder rare.
 */
export type ObjectifSpecial = { k: "special"; cle: string; seuil?: number };

export type Objectif = ObjectifCompteur | ObjectifMesure | ObjectifSpecial | { k: "tous"; objectifs: Objectif[] } | { k: "unDe"; objectifs: Objectif[] };

// ── Quêtes ─────────────────────────────────────────────────────────────

export type Famille = "trame" | "branche" | "longcours" | "contrat" | "exploit";

/** Les étapes d'une branche de matière (voir genererBranches). */
export type EtapeBranche = "entree" | "cours" | "fiche" | "drill" | "flashcards" | "ciblee" | "tour" | "maitrise60" | "maitrise75" | "maitre";

export type Prerequis =
  | { k: "quete"; id: string }
  /** un acte de la trame est clos (toutes ses quêtes non optionnelles faites) */
  | { k: "acte"; id: string }
  /** nœud de convergence : chaque branche du programme a passé cette étape (une branche sans l'étape compte pour faite) */
  | { k: "toutesBranches"; etape: EtapeBranche }
  /** au moins n branches ont passé cette étape */
  | { k: "branches"; etape: EtapeBranche; n: number }
  /** fenêtre calée sur le jour J du joueur (sans jour J : jamais ouverte) */
  | { k: "joursAvantExamen"; max: number; min?: number }
  | { k: "unDe"; prerequis: Prerequis[] };

export type Repetition = "unique" | "quotidienne" | "hebdomadaire";

export type Visibilite =
  /** visible dès que sa famille est dévoilée, même verrouillée (on voit le chemin) */
  | "visible"
  /** visible seulement quand ses prérequis sont remplis */
  | "ouverte"
  /** invisible jusqu'à l'obtention (exploits) */
  | "cachee"
  /** cachée, mais une énigme est lisible (champ indice) */
  | "indice";

/** Une pièce cosmétique gagnée (COSMETIQUES_CODEX) ; jamais du contenu de révision. */
export type Recompense = { xp: number; cosmetique?: string; titre?: string };

export type Quete = {
  /** stable, jamais réutilisé : « trame:prologue:dix », « branche:fsa:drill », « longcours:carte:3 » */
  id: string;
  famille: Famille;
  /** « finance/cfa-l1 » : l'arbre est par programme (lib/domains.ts) */
  programme: string;
  titre: string;
  /** la consigne, une phrase, à l'impératif */
  consigne: string;
  /** pourquoi c'est utile pour l'examen (affiché en petit) */
  pourquoi?: string;
  objectif: Objectif;
  prerequis: Prerequis[];
  recompense: Recompense;
  repetition: Repetition;
  visibilite: Visibilite;
  /** l'énigme d'un exploit en visibilité « indice » */
  indice?: string;
  /** ne bloque rien : une étape bonus (cours, flashcards) */
  optionnelle?: true;
  /** retirée : plus proposée ni affichée, mais la progression gardée (on ne supprime jamais un id publié) */
  retiree?: true;
  /** où la faire (href du site), si un seul endroit s'impose */
  lien?: string;
  /** durée estimée, en minutes (recommandation : on préfère ≤ 45) */
  duree?: number;
  acte?: string;
  chaine?: string;
  /** rang dans la chaîne (1, 2, 3…) */
  palier?: number;
  matiere?: Matiere;
  etape?: EtapeBranche;
  /** ordre d'affichage dans sa famille */
  ordre: number;
};

// ── Regroupements ──────────────────────────────────────────────────────

/** Une réplique de Léonard (mêmes poses que lib/leonard/repliques.ts). */
export type RepliqueCodex = { texte: string; pose: "base" | "fier" | "moqueur" | "decu" | "etonne" };

/** Un acte de la trame : un titre, un fil, deux répliques. */
export type Acte = {
  id: string;
  /** 0 : prologue ; 99 : épilogue */
  numero: number;
  titre: string;
  /** une ligne d'ambiance (Florence, la bottega) */
  sousTitre: string;
  /** ce que l'acte apprend au joueur, en clair */
  but: string;
  ouverture: RepliqueCodex;
  cloture: RepliqueCodex;
  /** récompense de clôture (toutes ses quêtes non optionnelles faites) */
  recompense: Recompense;
  /** à côté du fil (l'acte I, les outils) : jamais l'acte courant tant qu'un acte du fil reste ouvert, et sa clôture n'annonce pas de rideau */
  parallele?: true;
};

/** Une quête au long cours : une chaîne de paliers sur des semaines. */
export type Chaine = {
  id: string;
  titre: string;
  /** l'axe de préparation qu'elle sert */
  axe: "couverture" | "maitrise" | "memoire" | "examens" | "regularite" | "competition" | "methode";
  pourquoi: string;
};

/** Emplacement d'un contrat dans les 3 du jour. */
export type Emplacement = "faiblesse" | "entretien" | "variete";

/** Phase de préparation, calée sur le jour J (« apres » : l'examen est passé, le Codex continue). */
export type Phase = "fondations" | "consolidation" | "repetition" | "veillee" | "apres";

/** Un modèle de contrat du jour, instancié chaque jour avec ses paramètres. */
export type ModeleContrat = {
  /** l'instance du jour aura l'id « contrat:<id>:<AAAA-MM-JJ> » */
  id: string;
  emplacement: Emplacement;
  /** {matiere}, {notion}, {fiche} remplacés à l'instanciation */
  titre: string;
  consigne: string;
  objectif: Objectif;
  /** paramètres à choisir (la matière la plus faible, la notion la plus faible…) ; un modèle dont l'événement n'est pas branché (EVENEMENTS) n'est jamais tiré */
  params: Param["param"][];
  /** conditions pour être tiré au sort (mesures du joueur) */
  eligible: ObjectifMesure[];
  /** poids de tirage par phase (0 : jamais dans cette phase) */
  poids: Record<Phase, number>;
  duree: number;
  lien?: string;
};

/** Une pièce cosmétique que seul le Codex donne (à brancher dans lib/profil/catalogue.ts). */
export type CosmetiqueCodex = {
  cle: string;
  type: "cadre" | "banniere" | "titre";
  nom: string;
  description: string;
  /** elle bouge (« ce qui brille se gagne ») */
  anime?: true;
};

/** Le dévoilement progressif d'un nouveau compte. */
export type Declencheur =
  | { k: "quete"; id: string }
  /** minutes passées sur le site depuis l'inscription (présence) */
  | { k: "minutes"; n: number }
  /** n-ième jour de visite (2 : le lendemain) */
  | { k: "visite"; n: number }
  /** le bouton « Tout montrer » */
  | { k: "manuel" };

export type Devoilement = {
  id: string;
  /** ce qui apparaît : un onglet du menu, une famille du Codex, un bloc */
  quoi: string;
  libelle: string;
  /** le premier déclencheur rempli dévoile */
  quand: Declencheur[];
  /** réplique de Léonard au dévoilement */
  replique: string;
};

/** Les sources d'un type d'événement ou de mesure (pour le moteur). */
export type SourceDonnee = { libelle: string; source: string; branche: boolean };
