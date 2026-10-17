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
    /** secondes par question (durée de la séance / questions ; journal v3, séance ciblée seulement) */
    secondesParQuestion?: number | null;
  };
  /**
   * une séance réussie qui a fait travailler du neuf ou du dû (journal v3, V3 §8.5) :
   * `fraiches` = part (%) des réponses à des questions neuves, ou déjà vues il y a un jour ou plus.
   * Pages de fiche, séances ciblées, séries éclair et « À revoir », les 30 du jour, Atelier ; pas les QCM.
   */
  seance_juste: { source: SourceReponse | "revoir"; pct: number; questions: number; fraiches: number };
  /** une page de drill de fiche passée en entier (quiz_answer_log, mode page) */
  drill_page_terminee: { matiere: Matiere; fiche: string; page: number; questions: number; justes: number; pct: number };
  /** les 30 du jour rendus */
  defi_rendu: { questions: number; justes: number; pct: number };
  /** les 5 du jour rendus */
  cinq_rendu: { justes: number; secondes: number | null; rang: number | null };
  /** une série éclair (5 questions) close ; journal v3 : sans les « À revoir » (eclair_series.genre) */
  eclair_rendue: { questions: number; justes: number };
  /** une séance « À revoir » rendue en entier (journal v3, eclair_series.genre = 'revoir' ; pas celle close d'office) */
  revoir_rendue: { questions: number; justes: number; pct: number };
  duel_termine: {
    resultat: ResultatDuel;
    /** paliers d'écart avec l'adversaire avant le duel (positif : il était au-dessus) */
    ecartPaliers: number;
    /** l'adversaire est un ami (friendships) */
    ami: boolean;
    /** mention gagnée (duel_mentions), null sinon */
    mention: string | null;
  };
  /** secondesParQuestion : journal v3 (durée du blanc / questions) */
  examen_blanc_rendu: { questions: number; justes: number; pct: number; officiel: boolean; reprise: boolean; secondesParQuestion?: number | null };
  /** le débrief d'un examen blanc (blanc_debrief, migration_v3_profil.sql §5 ; journal v3), daté du dernier classement ; part = classées / erreurs, en % */
  blanc_debriefe: { source: "blanc" | "officiel"; ref: string; erreurs: number; classees: number; part: number };
  seance_atelier: { questions: number; justes: number; notions: number; rayees: number };
  /** une rature rayée par une bonne réponse en reprise (ratures.rayee_le) */
  rature_rayee: { matiere: Matiere | null; notion: NotionId | null; ageJours: number; erreurs: number };
  /** une rature scellée : réussie de nouveau 7 jours au moins après son rayage (journal v3, ratures.scellee_le) ; ageJours depuis la première erreur */
  rature_scellee: { matiere: Matiere | null; notion: NotionId | null; ageJours: number };
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
  | "branches_etape_pct"
  // ── v3 (codex_mesures_v3, migration_codex_v3.sql §4 ; inconnues sans elle) ──
  /** jours à 10 questions ou plus, à vie, tous programmes */
  | "jours_encre_total"
  /** branches menées jusqu'à « Maître de… » (quêtes *branche:*:maitre récompensées), tous programmes */
  | "maitres_total"
  /** programmes menés (codex_programmes_joueur, statut « mene ») */
  | "programmes_menes"
  /** trophées de palier ≥ filtre.palier (bronze par défaut), de la source filtre.source si donnée (V3 §2.5) */
  | "trophees"
  /** pièces de collection possédées, hors pièces libres (compterPiecesCodex, lib/codex/fil-rouge.ts ; calculée par le moteur) */
  | "pieces_possedees"
  /** semaines (lun.–dim.) à 2 jours d'encre ou plus après l'examen (calculée par le moteur) */
  | "semaines_entretien"
  /** sources de trophées où l'on en a au moins un de palier ≥ filtre.palier (bronze par défaut) */
  | "trophees_sources"
  /** notions « tenues » : 5 réponses au moins, dont 3 justes sur les 5 dernières (filtre.matiere possible ; V3 §8.5) */
  | "notions_tenues"
  /** la part des notions tenues, 0–100 : dans la matière du filtre, sinon pondérée par le poids des matières */
  | "notions_tenues_pct"
  /** la malle de l'examen prête : 5 cases cochées ou plus (user_metadata.rl_malle, V3 §7.3) */
  | "malle_faite"
  /** examens blancs rendus depuis 7 jours ou moins, classés à moins de 80 % (blanc_debrief, V3 §7.6) */
  | "blancs_a_debriefer"
  /** la file « À revoir » du jour : ratures sèches et rappels dus, 25 au plus (revisions_dues, V3 §5.1) */
  | "revisions_dues"
  /** ratures scellées : réussies de nouveau 7 jours au moins après leur rayage (V3 §5.3) */
  | "ratures_scellees"
  /** la préparation, 0–100 : la maîtrise des matières pondérée par leur poids, les non mesurées à 0 (lib/codex/cap.ts, V3 §4.6) */
  | "preparation";

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
  /** trophées : palier minimal (« 1 or » = or ou mieux) et source (lib/trophees.ts, V3 §2.5) */
  palier?: "bronze" | "argent" | "or" | "diamant";
  source?: string;
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
export type ObjectifSpecial = {
  k: "special";
  cle: string;
  seuil?: number;
  /** la variante par matière d'un spécial (serie_bonnes_matiere, serie_calculs_matiere : V3 §8.7) */
  matiere?: Matiere;
};

export type Objectif = ObjectifCompteur | ObjectifMesure | ObjectifSpecial | { k: "tous"; objectifs: Objectif[] } | { k: "unDe"; objectifs: Objectif[] };

// ── Quêtes ─────────────────────────────────────────────────────────────

/** « fil » : le fil rouge, commun à tous les programmes (lib/codex/fil-rouge.ts, V3 §1.5). */
export type Famille = "trame" | "branche" | "longcours" | "contrat" | "exploit" | "fil";

/** Les étapes d'une branche de matière (voir genererBranches ; « serie » remplace « ciblee » dans un programme sans séance ciblée). */
export type EtapeBranche = "entree" | "cours" | "fiche" | "drill" | "flashcards" | "ciblee" | "serie" | "tour" | "carte" | "maitrise60" | "maitrise75" | "signature" | "maitre";

export type Prerequis =
  /** souple : conseillée, elle ne bloque qu'une fois l'examen derrière le joueur (apresExamen, V3 §8.5) */
  | { k: "quete"; id: string; souple?: true }
  /** un acte de la trame est clos (toutes ses quêtes non optionnelles faites, ou Acte.closAvec) */
  | { k: "acte"; id: string }
  /** nœud de convergence : chaque branche du programme a passé cette étape (une branche sans l'étape compte pour faite) */
  | { k: "toutesBranches"; etape: EtapeBranche }
  /** au moins n branches ont passé cette étape */
  | { k: "branches"; etape: EtapeBranche; n: number }
  /** fenêtre calée sur le jour J du joueur (sans jour J : jamais ouverte) */
  | { k: "joursAvantExamen"; max: number; min?: number }
  /** l'examen est derrière le joueur : un programme mené, ou le jour J du programme actif passé (V3 §1.6) */
  | { k: "apresExamen" }
  /** un état mesuré atteint (mesure ≥ seuil) ; une mesure inconnue ne l'ouvre pas (V3 §7.6) */
  | { k: "etat"; mesure: TypeMesure; seuil: number }
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

/**
 * Une pièce cosmétique gagnée (COSMETIQUES_CODEX) ; jamais du contenu de révision.
 * `folio` : une planche du carnet, en plus (V3 §3.7) ; elle n'a pas de colonne
 * dans codex_progression : la posséder, c'est avoir la quête (ou l'acte) récompensée.
 */
export type Recompense = { xp: number; cosmetique?: string; titre?: string; folio?: string };

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
  /**
   * le doublon exact d'une autre quête, celle qui paie (son id) : affiché, il se
   * tamponne avec elle (ou sur son objectif, le même, si elle n'est pas encore
   * ouverte) mais ne verse ni XP ni pièce, sans fanfare (V3 §8.2)
   */
  miroir?: string;
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
  /** ce que la base doit savoir faire (V3 §1.8) : sinon la quête n'est pas branchée à l'exécution (masquée, ignorée par la clôture d'acte et les prérequis) */
  requiert?: Requis[];
  /** parue avec la v3 du Codex : au premier calcul v3, déjà remplie, elle est rattrapée en rétro (V3 §1.9) */
  nouvelle?: "v3";
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
  /** récompense de clôture (toutes ses quêtes non optionnelles faites, ou closAvec) */
  recompense: Recompense;
  /** l'acte se clôt avec n de ses quêtes, optionnelles comprises (l'acte I : 4 outils sur 7, V3 §8.3) */
  closAvec?: { n: number };
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
  /** les outils sans lesquels un programme n'a pas cette chaîne (genererArbre, lib/codex/programmes.ts) */
  requiert?: Outil[];
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
  /** les outils sans lesquels un programme ne tire jamais ce modèle (modelesContrats, lib/codex/programmes.ts) */
  requiert?: Outil[];
};

/** Une pièce cosmétique que seul le Codex donne (à brancher dans lib/profil/catalogue.ts). */
export type CosmetiqueCodex = {
  cle: string;
  /** « folio » : une planche du carnet (V3 §3.7) */
  type: "cadre" | "banniere" | "titre" | "folio";
  nom: string;
  description: string;
  /** elle bouge (« ce qui brille se gagne ») */
  anime?: true;
  /**
   * un folio : l'œuvre (un dessin de Léonard, domaine public) et son image
   * (public/folios/<clé nue>.webp) ; image null et provisoire tant qu'elle
   * manque : la carte « papier » affiche le nom de l'œuvre à la plume (V3 §3.7)
   */
  folio?: { oeuvre: string; image: string | null; provisoire: boolean };
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

/** Un outil du site (ce qu'ouvre le bouton « Y aller » d'une quête ; ce qu'un programme sait faire). */
export type Outil = "ciblee" | "fiche" | "drill" | "cours" | "flashcards" | "atelier" | "calculs" | "blancs" | "trente" | "cinq" | "eclair" | "duels" | "revoir";

/** Les sources d'un type d'événement ou de mesure (pour le moteur). */
export type SourceDonnee = { libelle: string; source: string; branche: boolean };

/** Ce que la base sait faire (V3 §1.8), lu à l'exécution par codex_mesures_v3 : tant
 *  que le SQL n'est pas collé, tout est faux et le moteur n'écrit, ne paie et
 *  n'exige rien qui en dépende. */
/** « mesures » : codex_mesures_v3 rend les mesures nouvelles (notions tenues, spéciaux par matière, trophées) ; la §4 est collée. */
export type Capacite = "fil" | "mesures" | "seances" | "revoir" | "maitrise" | "trophees" | "debrief" | "ratures_seches";
/** journal : 2 (codex_journal d'origine) ou 3 (événements v3, marqueur _codex_journal_v3). */
export type Capacites = Record<Capacite, boolean> & { journal: 2 | 3 };
/** Ce qu'une quête peut exiger de la base (Quete.requiert) : une capacité, ou le journal v3. */
export type Requis = Capacite | "journal3";

/** Le temps que le joueur se donne aujourd'hui (« J'ai 30 min »), en minutes. */
export type Budget = 15 | 30 | 60 | 90;
