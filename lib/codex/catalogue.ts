// Le Codex : le contenu. Toutes les quêtes sont des données ; les branches
// de matière sont générées depuis le catalogue des matières (une fiche, un
// drill ou un cours ajoutés là ajoutent leurs étapes tout seuls). Les
// identifiants sont stables : ne jamais renommer un id publié (la
// progression des joueurs s'y accroche), en créer un autre.
// La bible : docs/codex/CONCEPTION.md. Module neutre (client et serveur).

import { TOPICS } from "@/lib/practiceTopics";
import { xpNeededForLevelUp } from "@/lib/leveling";
import { SCEAUX, SCEAUX_BASE } from "@/lib/profil/sceaux";
import { condition as conditionSceau, nomSceau } from "@/lib/voice-profil";
import { de } from "@/lib/codex/elision";
import { contenuDuProgramme } from "@/lib/codex/programmes/cfa-l1";
import { actesGeneriques } from "@/lib/codex/programmes/generique";
import { ID_MAX, PROGRAMME_GLOBAL, PROGRAMME_HISTORIQUE, cleLocale, estGlobal, slugDe, slugDeId } from "@/lib/codex/programmes/ids";
import type { DefinitionProgramme } from "@/lib/codex/programmes";
import type {
  Acte, Chaine, ChampDe, CosmetiqueCodex, Devoilement, EtapeBranche, Fenetre, Filtre, FiltreMesure, Objectif, ObjectifCompteur,
  ObjectifMesure, ModeleContrat, Outil, Phase, Prerequis, Quete, SourceDonnee, TypeEvenement, TypeMesure,
} from "@/lib/codex/types";

/** Le programme de cet arbre (lib/domains.ts : domaine/programme) ; les autres sont au registre (lib/codex/programmes.ts). */
export const PROGRAMME = PROGRAMME_HISTORIQUE;

// le contenu de CFA I vit avec sa définition (lib/codex/programmes/cfa-l1.ts) ; gardé ici pour les appelants
export { contenuDuProgramme };

// ── Sources du moteur ──────────────────────────────────────────────────
// Où le moteur lit chaque événement et chaque mesure. branche : false = pas
// encore suivi en base ; les quêtes qui en dépendent restent masquées
// (optionnelles, jamais bloquantes) jusqu'au branchement.

export const EVENEMENTS: Record<TypeEvenement, SourceDonnee> = {
  question_repondue: { libelle: "Une réponse", source: "vue : quiz_answer_log + duel_answers + daily_answers + mock_exam_results.answers + practice_session_results (détail) + ateliers.reponses + eclair_series + calc_attempts ; matière/notion via quiz_questions.notion (lib/answer-stats.ts fait déjà ce recoupement)", branche: true },
  session_terminee: { libelle: "Une séance complète", source: "practice_session_results (topics, score, total, completed_at) ; practice_sessions (QCM) ; quiz_attempts ; une page de fiche (quiz_answer_log par run_id)", branche: true },
  drill_page_terminee: { libelle: "Une page de drill", source: "quiz_answer_log (mode = 'page', par run_id) ⨝ quiz_sets.title « <Matière> — Drill Fiche Page N »", branche: true },
  defi_rendu: { libelle: "Les 30 du jour", source: "daily_attempts (finished_at, score, total) ⨝ daily_challenges (hors 5 du jour)", branche: true },
  cinq_rendu: { libelle: "Les 5 du jour", source: "daily_attempts du défi « cinq » (score, seconds) ; rang : cinq_leaderboard", branche: true },
  eclair_rendue: { libelle: "Une série éclair", source: "eclair_series (finished_at, score, total)", branche: true },
  duel_termine: { libelle: "Un duel", source: "duels (status = 'finished', winner_id, *_elo_before) ⨝ friendships ⨝ duel_mentions", branche: true },
  examen_blanc_rendu: { libelle: "Un examen blanc", source: "mock_exam_results + mock_exam_attempts (score, total, completed_at) ; officiels : quiz_attempts du dossier « Mocks Officiels (Système) »", branche: true },
  seance_atelier: { libelle: "Une séance d'Atelier", source: "ateliers (finished_at, score, total, notions, reponses)", branche: true },
  rature_rayee: { libelle: "Une rature rayée", source: "ratures (rayee_le non nul ; misses ; first_missed_at) ⨝ quiz_questions.notion", branche: true },
  calcul_repondu: { libelle: "Un calcul", source: "calc_attempts (topic, type_key, correct, answered_at)", branche: true },
  cours_ecoute: { libelle: "Minutes de cours écoutées", source: "codex_evenements (CourseAudioPlayer, par paquets de 5 minutes)", branche: true },
  flashcards_revues: { libelle: "Cartes révisées", source: "codex_evenements (FlashcardReview, par paquets de 10 cartes)", branche: true },
  fiche_ouverte: { libelle: "Fiche ouverte", source: "codex_evenements (FicheOuverte, page Derivatives)", branche: true },
  palier_atteint: { libelle: "Un palier de classement", source: "rating_events (elo_after) → rankFor", branche: true },
  jour_encre: { libelle: "Un jour d'encre", source: "serie_encre / _serie_reponses_jour (≥ 10 questions par jour de Paris)", branche: true },
  question_marquee: { libelle: "Une question marquée", source: "question_flags (created_at)", branche: true },
  ami_ajoute: { libelle: "Un ami", source: "friendships (acceptée)", branche: true },
};

export const MESURES: Record<TypeMesure, SourceDonnee> = {
  maitrise: { libelle: "Maîtrise d'une matière", source: "getTopicMastery (lib/mastery.ts) ; mesurée dès 40 questions (MAITRISE_MIN_QUESTIONS)", branche: true },
  maitrise_programme: { libelle: "Maîtrise du programme", source: "programMastery (lib/mastery.ts)", branche: true },
  matieres_au_dessus: { libelle: "Matières au-dessus d'un seuil", source: "getTopicMastery", branche: true },
  notions_vues: { libelle: "Notions vues", source: "question_repondue groupé par notion (≥ 5 réponses)", branche: true },
  notions_vues_pct: { libelle: "Part des notions vues", source: "notions_vues / notionsDeMatiere (lib/notions.ts)", branche: true },
  drill_pages_restantes: { libelle: "Pages de drill à passer", source: "quiz_sets du préfixe de drill − pages passées (drill_page_terminee)", branche: true },
  drill_pages_reussies: { libelle: "Pages de drill réussies", source: "meilleur pct par page (drill_page_terminee)", branche: true },
  elo: { libelle: "ELO", source: "ratings.elo", branche: true },
  pic_palier: { libelle: "Meilleur palier atteint", source: "ProfilStats.picAtteint (lib/profil/donnees.ts)", branche: true },
  niveau: { libelle: "Niveau", source: "levelInfoFromXp(profiles.xp_total)", branche: true },
  serie: { libelle: "Série d'encre", source: "serie_encre.serie (serie_encre_statut)", branche: true },
  meilleure_serie: { libelle: "Meilleure série", source: "serie_encre.meilleure (get_serie_meilleure)", branche: true },
  ratures_ouvertes: { libelle: "Ratures en cours", source: "ratures (rayee_le null, removed_at null, visible_from ≤ now)", branche: true },
  ratures_rayees: { libelle: "Ratures rayées", source: "ratures (rayee_le non nul)", branche: true },
  semaines_actives: { libelle: "Semaines actives", source: "jours d'encre groupés par semaine ISO (Paris)", branche: true },
  semaines_objectif_tenu: { libelle: "Semaines au rythme", source: "construireTrajectoire (lib/objectif-calc.ts) : questions de la semaine ≥ rythme prévu", branche: true },
  rappels_espaces: { libelle: "Rappels espacés", source: "question_repondue (juste et ecartJours ≥ n)", branche: true },
  matieres_remontees: { libelle: "Matières remontées", source: "practice_session_results mono-matière : maîtrise actuelle − maîtrise des 40 premières questions", branche: true },
  types_calcul_tenus: { libelle: "Types de calcul tenus", source: "calc_attempts : ≥ 5 justes sur les 6 derniers essais d'un type_key", branche: true },
  examens_blancs_au_dessus: { libelle: "Examens blancs réussis", source: "mock_exam_results + mock_exam_attempts (score/total)", branche: true },
  sceau: { libelle: "Palier d'un sceau", source: "sceaux (palier) ou sceauxDe (lib/profil/sceaux.ts)", branche: true },
  jour_j_fixe: { libelle: "Jour J fixé", source: "user_metadata.rl_objectif (lireObjectifMeta) ou profiles.exam_date", branche: true },
  visite_vue: { libelle: "Visite de Léonard vue", source: "user_metadata.rl_visite (visiteVue, lib/presentation.ts)", branche: true },
  questions_total: { libelle: "Questions posées", source: "ProfilStats.questions", branche: true },
  duels_joues: { libelle: "Duels joués", source: "ProfilStats.duelsJoues", branche: true },
  amis: { libelle: "Amis", source: "friendships (acceptées)", branche: true },
  quetes_terminees: { libelle: "Quêtes terminées", source: "codex_progression (termine_le non nul)", branche: true },
  branches_etape: { libelle: "Branches à une étape", source: "codex_progression des quêtes branche:*:<etape>", branche: true },
  branches_etape_pct: { libelle: "Part des branches à une étape", source: "branches_etape / branches du programme (une branche sans l'étape compte faite)", branche: true },
};

/** Les prédicats spéciaux (ObjectifSpecial) : à coder un par un dans le moteur. */
export const SPECIAUX: Record<string, string> = {
  serie_bonnes: "plus longue suite de bonnes réponses d'affilée dans une même séance (seuil)",
  serie_calculs: "plus longue suite de calculs justes d'affilée (calc_attempts, ordre answered_at)",
  phenix: "les 30 du jour ratés (< 50 %) un jour, puis réussis à ≥ 80 % le lendemain",
  retour: "un jour à ≥ 20 questions après au moins 14 jours sans aucune réponse",
  aube: "10 questions répondues avant 7 h (Paris) le même jour",
  justes_sur_20_matiere: "bonnes réponses parmi les 20 dernières de la matière de la quête (l'étape « serie » d'une branche sans séance ciblée)",
};

// ── Barème ─────────────────────────────────────────────────────────────
// Calé sur lib/leveling.ts (100 XP au niveau 1, +15 % par niveau ; une
// bonne réponse neuve rapporte 10 à 20 XP). Une quête ne fait jamais sauter
// un niveau : le moteur plafonne chaque récompense à la moitié du niveau en
// cours. Les valeurs
// ci-dessous sont visées pour le niveau où la quête tombe d'ordinaire ;
// l'XP versée (et affichée) est min(xp, plafondQuete(niveau)).

export const XP = {
  contrat: 30,
  /** les trois contrats du jour faits */
  contratTrio: 50,
  hebdo: 120,
} as const;

/** XP maximale d'une quête pour un joueur de ce niveau (la moitié du niveau). */
export const plafondQuete = (niveau: number) => Math.floor(xpNeededForLevelUp(niveau) / 2);
/** XP rétroactive maximale, au lancement, pour un compte existant (un niveau entier). */
export const plafondRetro = (niveau: number) => xpNeededForLevelUp(niveau);

// ── Cosmétiques du Codex ───────────────────────────────────────────────
// « Ce qui est fixe est libre, ce qui brille se gagne » : le Codex ne donne
// que des pièces qui bougent, et des titres (une ligne sous le pseudo). À
// brancher dans lib/profil/catalogue.ts (Condition { k: "codex"; quete }).

export const COSMETIQUES_CODEX: CosmetiqueCodex[] = [
  { cle: "banniere:carnet", type: "banniere", nom: "Carnet de Léonard", description: "Des croquis à la plume qui se dessinent et s'effacent dans la marge.", anime: true },
  { cle: "banniere:florence", type: "banniere", nom: "Florence à l'aube", description: "Le Duomo sort de la brume, la lumière monte sur le papier.", anime: true },
  { cle: "banniere:imola", type: "banniere", nom: "Plan d'Imola", description: "La carte ronde de Léonard, tracée rue après rue.", anime: true },
  { cle: "banniere:machine-volante", type: "banniere", nom: "Machine volante", description: "L'ornithoptère bat des ailes au-dessus des collines.", anime: true },
  { cle: "cadre:sanguine", type: "cadre", nom: "Sanguine", description: "Un trait de craie rouge qui fait le tour du sceau.", anime: true },
  { cle: "cadre:sfumato", type: "cadre", nom: "Sfumato", description: "Un contour qui se fond et revient, comme une fumée.", anime: true },
  { cle: "cadre:encre-fidele", type: "cadre", nom: "Encre fidèle", description: "Une goutte d'encre qui coule doucement autour du sceau.", anime: true },
  { cle: "cadre:laurier", type: "cadre", nom: "Laurier", description: "Une couronne de laurier qui pousse feuille à feuille.", anime: true },
  { cle: "cadre:vitruve", type: "cadre", nom: "Vitruve", description: "Le cercle et le carré de l'Homme de Vitruve, qui tournent lentement.", anime: true },
  { cle: "titre:apprenti", type: "titre", nom: "Apprenti", description: "A passé la porte de la bottega." },
  { cle: "titre:garzone", type: "titre", nom: "Garzone", description: "A broyé ses couleurs et touché aux dix pigments." },
  { cle: "titre:compagnon", type: "titre", nom: "Compagnon", description: "A honoré sa première commande." },
  { cle: "titre:guilde", type: "titre", nom: "Peintre de la guilde", description: "A passé l'épreuve de la guilde de Saint-Luc." },
  { cle: "titre:maitre-bottega", type: "titre", nom: "Maître de bottega", description: "A signé son chef-d'œuvre." },
  { cle: "titre:jour-j", type: "titre", nom: "Prêt pour le jour J", description: "A mené sa préparation jusqu'à la veille." },
  { cle: "titre:compas-or", type: "titre", nom: "Compas d'or", description: "80 % de maîtrise sur tout le programme." },
  { cle: "titre:polymathe", type: "titre", nom: "Polymathe", description: "Huit matières à 70 % ou plus." },
  { cle: "titre:commande", type: "titre", nom: "Commande honorée", description: "Un examen blanc à 80 % ou plus." },
  { cle: "titre:duelliste", type: "titre", nom: "Duelliste de la guilde", description: "A atteint le palier Diamant." },
  { cle: "titre:codex", type: "titre", nom: "Codex Atlanticus", description: "Cent quêtes du Codex terminées." },
  // « Maître de <matière> » : un titre par branche, généré (titreMaitre)
];

const titreMaitre = (matiere: string) => `titre:maitre:${matiere}`;

// ── Petits constructeurs ───────────────────────────────────────────────

function compte<E extends TypeEvenement>(
  evenement: E,
  seuil: number,
  filtre?: Filtre<E>,
  o: { fenetre?: Fenetre; distinct?: ChampDe<E> | "jour"; somme?: ChampDe<E> } = {},
): ObjectifCompteur {
  return { k: "compteur", evenement, seuil, ...(filtre ? { filtre } : {}), ...o } as unknown as ObjectifCompteur;
}

const mesure = (m: TypeMesure, seuil: number, filtre?: FiltreMesure, sens: ">=" | "<=" = ">="): ObjectifMesure => ({
  k: "mesure",
  mesure: m,
  seuil,
  ...(filtre ? { filtre } : {}),
  ...(sens === "<=" ? { sens } : {}),
});
const tous = (...objectifs: Objectif[]): Objectif => ({ k: "tous", objectifs });
const unDe = (...objectifs: Objectif[]): Objectif => ({ k: "unDe", objectifs });
const apres = (id: string): Prerequis => ({ k: "quete", id });
const acteClos = (id: string): Prerequis => ({ k: "acte", id });

type Base = Omit<Quete, "programme" | "prerequis" | "repetition" | "visibilite"> & Partial<Pick<Quete, "prerequis" | "repetition" | "visibilite">>;
const quete = (q: Base): Quete => ({ programme: PROGRAMME, prerequis: [], repetition: "unique", visibilite: "visible", ...q });

// ── La trame ───────────────────────────────────────────────────────────

export const ACTES: Acte[] = [
  {
    id: "prologue",
    numero: 0,
    titre: "La porte de la bottega",
    sousTitre: "Florence, un matin. L'atelier sent l'huile de lin et le papier neuf.",
    but: "Poser ses premiers traits et fixer son jour J.",
    ouverture: { texte: "Entre. Ici, on broie des couleurs avant de peindre des Joconde. Toi, ce sera des questions avant le CFA.", pose: "base" },
    cloture: { texte: "Premier trait posé. Verrocchio a mis des années à me dire bravo. Moi je suis généreux : bravo.", pose: "fier" },
    recompense: { xp: 50, cosmetique: "titre:apprenti" },
  },
  {
    id: "acte1",
    numero: 1,
    titre: "Broyer les couleurs",
    sousTitre: "Avant le pinceau, l'apprenti apprend ses outils.",
    but: "Essayer chaque outil du site une fois : fiche, 5 du jour, rature, Atelier, duel, calcul.",
    parallele: true,
    ouverture: { texte: "Un bon apprenti connaît chaque pot de l'atelier. Ouvre-les tous, même celui qui sent bizarre.", pose: "moqueur" },
    cloture: { texte: "Tu connais la maison. Maintenant, on va salir des pinceaux pour de vrai.", pose: "fier" },
    recompense: { xp: 120 },
  },
  {
    id: "acte2",
    numero: 2,
    titre: "Les dix pigments",
    sousTitre: "Dix pots sur l'établi, un par matière du programme.",
    but: "Toucher aux dix matières et réussir une première séance ciblée.",
    ouverture: { texte: "Dix pigments sur la palette. On ne peint pas un ciel avec un seul bleu, ni un CFA avec la seule FSA.", pose: "base" },
    cloture: { texte: "Les dix pots sont ouverts. Ça sent la peinture et un peu l'Éthique : c'est normal.", pose: "fier" },
    recompense: { xp: 200, cosmetique: "banniere:carnet", titre: "titre:garzone" },
  },
  {
    id: "acte3",
    numero: 3,
    titre: "Les carnets",
    sousTitre: "Léonard notait tout. Sept mille pages, en miroir.",
    but: "Couvrir le programme notion par notion, et faire tenir ce qu'on apprend.",
    ouverture: { texte: "J'ai rempli sept mille pages de carnets. Je ne t'en demande pas tant. Juste toutes les notions.", pose: "moqueur" },
    cloture: { texte: "Tes carnets se remplissent, et ce qui est dedans reste. Le reste, c'est de l'encre perdue.", pose: "fier" },
    recompense: { xp: 250 },
  },
  {
    id: "acte4",
    numero: 4,
    titre: "La première commande",
    sousTitre: "Un mécène frappe à la porte : il veut voir ce que tu vaux.",
    but: "Rendre un premier examen blanc et tenir un rythme sur plusieurs semaines.",
    ouverture: { texte: "Un client ! Il paie en florins et il juge sur pièce. Comme le CFA Institute, en moins poli.", pose: "etonne" },
    cloture: { texte: "Commande livrée. Le mécène a hoché la tête. Chez les Médicis, c'est un triomphe.", pose: "fier" },
    recompense: { xp: 300, cosmetique: "cadre:sanguine", titre: "titre:compagnon" },
  },
  {
    id: "acte5",
    numero: 5,
    titre: "L'épreuve de la guilde",
    sousTitre: "La Compagnie de Saint-Luc n'admet que ceux qui maîtrisent tout l'art.",
    but: "Toutes les matières ont passé leur séance ciblée : place au programme entier.",
    ouverture: { texte: "Toutes tes branches ont tenu leur épreuve. La guilde t'attend. Tiens-toi droit, ils regardent les mains.", pose: "base" },
    cloture: { texte: "Admis à la guilde. J'y suis entré en 1472. Toi, aujourd'hui. On a presque le même parcours.", pose: "fier" },
    recompense: { xp: 400, cosmetique: "banniere:florence", titre: "titre:guilde" },
  },
  {
    id: "acte6",
    numero: 6,
    titre: "Le chef-d'œuvre",
    sousTitre: "Le tableau qu'on signe. Celui qu'on montre le jour J.",
    but: "Le niveau de l'examen, partout : 70 % de maîtrise, des examens blancs réussis, l'Éthique solide.",
    ouverture: { texte: "La Joconde m'a pris seize ans. Toi, tu as jusqu'au jour J. Pas de pression.", pose: "moqueur" },
    cloture: { texte: "Signé. Encadré. Je le mettrais bien au Louvre, mais il paraît que la place est prise.", pose: "fier" },
    recompense: { xp: 600, cosmetique: "cadre:laurier", titre: "titre:maitre-bottega" },
  },
  {
    id: "epilogue",
    numero: 99,
    titre: "Le jour J",
    sousTitre: "Le dernier mois. Le calendrier compte à rebours, la bottega aussi.",
    but: "Un dernier mois calé sur ta date : examen blanc, carnet propre, Éthique, puis repos.",
    ouverture: { texte: "Trente jours. On ne commence plus de fresque : on reprend les retouches.", pose: "base" },
    cloture: { texte: "Pose le pinceau. Dors. Même moi je dormais, parfois. Rarement, mais quand même.", pose: "fier" },
    recompense: { xp: 300, titre: "titre:jour-j" },
  },
];

export const QUETES_TRAME: Quete[] = [
  // Prologue : la première séance
  quete({ id: "trame:prologue:premier-trait", famille: "trame", acte: "prologue", ordre: 1, titre: "Le premier trait", consigne: "Réponds à ta toute première question.", objectif: compte("question_repondue", 1), recompense: { xp: 20 }, lien: "/defi/cinq", duree: 2 }),
  quete({ id: "trame:prologue:jour-j", famille: "trame", acte: "prologue", ordre: 2, titre: "La date sur le chevalet", consigne: "Fixe ton jour J et ton objectif de questions.", pourquoi: "Tout le Codex se cale sur ta date : le rythme, les contrats, le dernier mois.", objectif: mesure("jour_j_fixe", 1), recompense: { xp: 20 }, lien: "/moi", duree: 1 }),
  quete({ id: "trame:prologue:dix", famille: "trame", acte: "prologue", ordre: 3, titre: "Dix coups de pinceau", consigne: "Réponds à 10 questions, où tu veux.", objectif: compte("question_repondue", 10), prerequis: [apres("trame:prologue:premier-trait")], recompense: { xp: 30 }, duree: 8 }),
  quete({ id: "trame:prologue:premiere-seance", famille: "trame", acte: "prologue", ordre: 4, titre: "Une séance jusqu'au bout", consigne: "Termine une séance entière : une page de drill, une session ciblée ou les 5 du jour.", objectif: unDe(compte("session_terminee", 1), compte("drill_page_terminee", 1), compte("cinq_rendu", 1)), prerequis: [apres("trame:prologue:premier-trait")], recompense: { xp: 40 }, duree: 15 }),
  quete({ id: "trame:prologue:visite", famille: "trame", acte: "prologue", ordre: 5, optionnelle: true, titre: "Le tour du propriétaire", consigne: "Suis la visite de Léonard jusqu'au bout.", objectif: mesure("visite_vue", 1), recompense: { xp: 20 }, duree: 3 }),

  // Acte I : un outil après l'autre
  ...([
    ["fiche", "La première fiche", "Lis une page de fiche et passe son drill de 15 questions.", compte("drill_page_terminee", 1), 40, "/fiches", 20],
    ["cinq", "Les 5 du jour", "Rends les 5 du jour.", compte("cinq_rendu", 1), 30, "/defi/cinq", 5],
    ["rature", "Gratter le vélin", "Reprends une question ratée et réussis-la : ta première rature rayée.", compte("rature_rayee", 1), 40, undefined, 5],
    ["atelier", "Une demi-heure à l'Atelier", "Fais une séance d'Atelier sur tes points faibles.", compte("seance_atelier", 1), 50, "/atelier", 30],
    ["duel", "Croiser le fer", "Joue ton premier duel.", compte("duel_termine", 1), 40, "/duel", 10],
    ["calcul", "La règle et le compas", "Réponds juste à 5 calculs.", compte("calcul_repondu", 5, { juste: true }), 30, "/calculs", 10],
  ] as const).map(([cle, titre, consigne, objectif, xp, lien, duree], i) =>
    quete({ id: `trame:a1:${cle}`, famille: "trame", acte: "acte1", ordre: 10 + i, titre, consigne, objectif, prerequis: [apres("trame:prologue:premier-trait")], recompense: { xp }, ...(lien ? { lien } : {}), duree }),
  ),
  quete({ id: "trame:a1:cours", famille: "trame", acte: "acte1", ordre: 16, optionnelle: true, titre: "L'oreille du maître", consigne: "Écoute 15 minutes d'un cours complet.", objectif: compte("cours_ecoute", 15, undefined, { somme: "minutes" }), prerequis: [apres("trame:prologue:premier-trait")], recompense: { xp: 30 }, lien: "/reviser", duree: 15 }),

  // Acte II : les dix matières
  quete({ id: "trame:a2:trois", famille: "trame", acte: "acte2", ordre: 20, titre: "Trois pigments", consigne: "Fais le premier pas (10 questions) dans trois matières.", objectif: mesure("branches_etape", 3, { etape: "entree" }), prerequis: [acteClos("prologue")], recompense: { xp: 50 } }),
  quete({ id: "trame:a2:dix", famille: "trame", acte: "acte2", ordre: 21, titre: "Les dix pigments", consigne: "Fais le premier pas dans toutes les matières du programme.", pourquoi: "Le CFA interroge les dix matières : aucune ne peut rester un pot fermé.", objectif: mesure("branches_etape_pct", 100, { etape: "entree" }), prerequis: [apres("trame:a2:trois")], recompense: { xp: 100 } }),
  quete({ id: "trame:a2:ciblee", famille: "trame", acte: "acte2", ordre: 22, titre: "Une matière, une séance", consigne: "Réussis une session ciblée d'une seule matière, 15 questions au moins (format 180), à 70 % ou plus.", objectif: compte("session_terminee", 1, { source: "ciblee", questions: { min: 15 }, pct: { min: 70 } }), prerequis: [acteClos("prologue")], recompense: { xp: 60 }, lien: "/practice?format=180", duree: 25 }),
  quete({ id: "trame:a2:serie", famille: "trame", acte: "acte2", ordre: 23, titre: "Trois jours d'encre", consigne: "Tiens trois jours d'encre d'affilée (10 questions par jour).", objectif: mesure("meilleure_serie", 3), prerequis: [acteClos("prologue")], recompense: { xp: 50 } }),
  quete({ id: "trame:a2:drill", famille: "trame", acte: "acte2", ordre: 24, titre: "Une fiche de bout en bout", consigne: "Passe toutes les pages de drill d'une fiche.", objectif: mesure("branches_etape", 1, { etape: "drill" }), prerequis: [acteClos("prologue")], recompense: { xp: 80 }, lien: "/fiches" }),

  // Acte III : couvrir et retenir
  quete({ id: "trame:a3:notions", famille: "trame", acte: "acte3", ordre: 30, titre: "Vingt-cinq carnets ouverts", consigne: "Vois 25 notions du programme (5 réponses au moins dans chacune).", objectif: mesure("notions_vues", 25), prerequis: [acteClos("acte2")], recompense: { xp: 100 } }),
  quete({ id: "trame:a3:maitrises", famille: "trame", acte: "acte3", ordre: 31, titre: "Trois couleurs qui tiennent", consigne: "Monte trois matières à 60 % de maîtrise.", objectif: mesure("matieres_au_dessus", 3, { pct: 60 }), prerequis: [acteClos("acte2")], recompense: { xp: 120 } }),
  quete({ id: "trame:a3:ratures", famille: "trame", acte: "acte3", ordre: 32, titre: "Le grattoir", consigne: "Raye 20 ratures en les réussissant en reprise.", objectif: mesure("ratures_rayees", 20), prerequis: [acteClos("acte2")], recompense: { xp: 80 } }),
  quete({ id: "trame:a3:rappels", famille: "trame", acte: "acte3", ordre: 33, titre: "Ce qui reste après une semaine", consigne: "Réussis 20 questions que tu avais vues il y a plus de 7 jours.", pourquoi: "Ce qu'on retrouve après une semaine, on le retrouvera le jour J.", objectif: mesure("rappels_espaces", 20, { n: 7 }), prerequis: [acteClos("acte2")], recompense: { xp: 100 } }),
  quete({ id: "trame:a3:atelier", famille: "trame", acte: "acte3", ordre: 34, titre: "Trois passages à l'Atelier", consigne: "Termine trois séances d'Atelier.", objectif: compte("seance_atelier", 3), prerequis: [acteClos("acte2")], recompense: { xp: 80 }, lien: "/atelier" }),

  // Acte IV : la première commande
  quete({ id: "trame:a4:blanc", famille: "trame", acte: "acte4", ordre: 40, titre: "La commande", consigne: "Rends ton premier examen blanc.", objectif: compte("examen_blanc_rendu", 1), prerequis: [acteClos("acte3")], recompense: { xp: 150 }, lien: "/mock-exams" }),
  quete({ id: "trame:a4:semaines", famille: "trame", acte: "acte4", ordre: 41, titre: "Un mois d'atelier", consigne: "Tiens quatre semaines à 4 jours d'encre ou plus.", pourquoi: "La régularité bat le bachotage : quatre semaines, c'est une habitude.", objectif: mesure("semaines_actives", 4, { n: 4 }), prerequis: [acteClos("acte3")], recompense: { xp: 150 } }),
  quete({ id: "trame:a4:defis", famille: "trame", acte: "acte4", ordre: 42, titre: "La trentaine", consigne: "Rends cinq fois les 30 du jour.", objectif: compte("defi_rendu", 5), prerequis: [acteClos("acte3")], recompense: { xp: 100 }, lien: "/defi" }),
  quete({ id: "trame:a4:moitie", famille: "trame", acte: "acte4", ordre: 43, titre: "La moitié du tableau", consigne: "Atteins 50 % de maîtrise sur tout le programme.", objectif: mesure("maitrise_programme", 50), prerequis: [acteClos("acte3")], recompense: { xp: 150 } }),
  quete({ id: "trame:a4:remontee", famille: "trame", acte: "acte4", ordre: 44, titre: "Reprendre une couleur ratée", consigne: "Remonte une matière de 10 points par rapport à tes débuts.", objectif: mesure("matieres_remontees", 1, { n: 10 }), prerequis: [acteClos("acte3")], recompense: { xp: 120 } }),

  // Acte V : la guilde (nœud de convergence : toutes les branches ont passé leur séance ciblée)
  ...([
    ["blanc", "La guilde juge", "Réussis un examen blanc à 60 % ou plus.", mesure("examens_blancs_au_dessus", 1, { pct: 60 }), 200],
    ["programme", "Six dixièmes du tableau", "Atteins 60 % de maîtrise sur tout le programme.", mesure("maitrise_programme", 60), 250],
    ["notions", "Les trois quarts de la carte", "Vois 75 % des notions du programme.", mesure("notions_vues_pct", 75), 200],
    ["carnet", "Un carnet lisible", "Descends sous 50 ratures en cours.", mesure("ratures_ouvertes", 50, undefined, "<="), 150],
  ] as const).map(([cle, titre, consigne, objectif, xp], i) =>
    quete({ id: `trame:a5:${cle}`, famille: "trame", acte: "acte5", ordre: 50 + i, titre, consigne, objectif, prerequis: [acteClos("acte4"), { k: "toutesBranches", etape: "ciblee" }], recompense: { xp } }),
  ),

  // Acte VI : le chef-d'œuvre
  ...([
    ["programme", "Le niveau de l'examen", "Atteins 70 % de maîtrise sur tout le programme.", mesure("maitrise_programme", 70), 300, undefined],
    ["blancs", "Deux commandes honorées", "Réussis deux examens blancs à 70 % ou plus.", mesure("examens_blancs_au_dessus", 2, { pct: 70 }), 300, undefined],
    ["palette", "Aucun pigment pâle", "Monte les dix matières à 65 % ou plus.", mesure("matieres_au_dessus", 10, { pct: 65 }), 300, undefined],
    ["ethique", "La règle d'or", "Monte l'Éthique à 75 % de maîtrise.", mesure("maitrise", 75, { matiere: "ethics" }), 250, "Près d'une question sur cinq au CFA I, et elle départage les candidats au seuil."],
  ] as const).map(([cle, titre, consigne, objectif, xp, pourquoi], i) =>
    quete({ id: `trame:a6:${cle}`, famille: "trame", acte: "acte6", ordre: 60 + i, titre, consigne, objectif, prerequis: [acteClos("acte5")], recompense: { xp }, ...(pourquoi ? { pourquoi } : {}) }),
  ),

  // Épilogue : calé sur le jour J (ouvert à tous ceux qui ont une date, quel que soit leur acte)
  quete({ id: "trame:ep:blanc", famille: "trame", acte: "epilogue", ordre: 90, titre: "La répétition générale", consigne: "Rends un examen blanc complet (90 questions ou plus) dans le dernier mois.", objectif: compte("examen_blanc_rendu", 1, { questions: { min: 90 } }, { fenetre: "depuisOuverture" }), prerequis: [{ k: "joursAvantExamen", max: 30, min: 3 }], recompense: { xp: 200 }, visibilite: "ouverte", lien: "/mock-exams" }),
  quete({ id: "trame:ep:carnet", famille: "trame", acte: "epilogue", ordre: 91, titre: "Nettoyer le carnet", consigne: "Descends sous 20 ratures en cours avant la dernière semaine.", objectif: mesure("ratures_ouvertes", 20, undefined, "<="), prerequis: [{ k: "joursAvantExamen", max: 21, min: 3 }], recompense: { xp: 200 }, visibilite: "ouverte" }),
  quete({ id: "trame:ep:ethique", famille: "trame", acte: "epilogue", ordre: 92, titre: "Relire les Standards", consigne: "Réponds à 40 questions d'Éthique dans les deux dernières semaines.", objectif: compte("question_repondue", 40, { matiere: "ethics" }, { fenetre: "depuisOuverture" }), prerequis: [{ k: "joursAvantExamen", max: 14, min: 1 }], recompense: { xp: 150 }, visibilite: "ouverte" }),
  quete({ id: "trame:ep:veille", famille: "trame", acte: "epilogue", ordre: 93, titre: "La veille", consigne: "Une dernière série éclair ou les 5 du jour, puis pose le crayon.", objectif: unDe(compte("eclair_rendue", 1, undefined, { fenetre: "jour" }), compte("cinq_rendu", 1, undefined, { fenetre: "jour" })), prerequis: [{ k: "joursAvantExamen", max: 3, min: 1 }], recompense: { xp: 100 }, visibilite: "ouverte", duree: 5 }),
];

// ── Les quêtes au long cours ───────────────────────────────────────────

export const CHAINES: Chaine[] = [
  { id: "carte", titre: "La carte du programme", axe: "couverture", pourquoi: "Une notion jamais vue, c'est une question donnée au hasard le jour J." },
  { id: "compas", titre: "Le compas", axe: "maitrise", pourquoi: "La maîtrise du programme entier, celle qui verrouille les rangs du haut." },
  { id: "metier", titre: "Le métier", axe: "maitrise", pourquoi: "Des matières solides une à une, pas une moyenne qui cache un trou." },
  { id: "memoire", titre: "La mémoire longue", axe: "memoire", pourquoi: "Réussir une question revue une semaine plus tard : c'est ça, savoir." },
  { id: "carnet", titre: "Le carnet propre", axe: "memoire", pourquoi: "Beaucoup répondre et garder peu d'erreurs ouvertes : apprendre de ses ratures." },
  { id: "commandes", titre: "Les commandes", axe: "examens", pourquoi: "L'examen se gagne aussi à l'endurance : 180 questions, deux sessions.", requiert: ["blancs"] },
  { id: "encre", titre: "L'encre fidèle", axe: "regularite", pourquoi: "Quatre jours par semaine pendant des mois valent mieux que sept jours en mai." },
  { id: "justesse", titre: "La justesse", axe: "methode", pourquoi: "Des séances réussies, pas des séances longues." },
  { id: "remontee", titre: "La remontée", axe: "maitrise", pourquoi: "Transformer un point faible en point fort, matière par matière." },
  { id: "calculs", titre: "Le calcul juste", axe: "methode", pourquoi: "Les formules à la calculatrice, sans hésiter : du temps gagné pour le reste.", requiert: ["calculs"] },
  { id: "sources", titre: "Les sources", axe: "couverture", pourquoi: "Les fiches et leurs drills, page après page : la base du cours.", requiert: ["drill"] },
  { id: "atelier", titre: "L'Atelier", axe: "methode", pourquoi: "Trente minutes sur ce qui coince, et des ratures qui tombent.", requiert: ["atelier"] },
  { id: "trentaine", titre: "La trentaine", axe: "examens", pourquoi: "Les 30 du jour, chronométrés : le rythme de l'examen en petit.", requiert: ["trente"] },
  { id: "rythme", titre: "Le rythme", axe: "regularite", pourquoi: "Tenir la cadence prévue jusqu'à ta date, semaine après semaine." },
  { id: "joute", titre: "La joute", axe: "competition", pourquoi: "La compétition qui fait réviser : les paliers du haut demandent de la maîtrise.", requiert: ["duels"] },
];

type Palier = { titre: string; consigne: string; objectif: Objectif; xp: number; cosmetique?: string; titreGagne?: string };

/** Une chaîne : chaque palier ouvre le suivant. */
function chaine(id: string, paliers: Palier[], prerequis: Prerequis[] = []): Quete[] {
  return paliers.map((p, i) =>
    quete({
      id: `longcours:${id}:${i + 1}`,
      famille: "longcours",
      chaine: id,
      palier: i + 1,
      ordre: i + 1,
      titre: p.titre,
      consigne: p.consigne,
      objectif: p.objectif,
      prerequis: i === 0 ? prerequis : [apres(`longcours:${id}:${i}`)],
      recompense: { xp: p.xp, ...(p.cosmetique ? { cosmetique: p.cosmetique } : {}), ...(p.titreGagne ? { titre: p.titreGagne } : {}) },
    }),
  );
}

const pctNotions = (n: number, titre: string, xp: number, extra: Partial<Palier> = {}): Palier => ({ titre, consigne: `Vois ${n} % des notions du programme (5 réponses au moins dans chacune).`, objectif: mesure("notions_vues_pct", n), xp, ...extra });
const maitriseProg = (n: number, titre: string, xp: number, extra: Partial<Palier> = {}): Palier => ({ titre, consigne: `Atteins ${n} % de maîtrise sur tout le programme.`, objectif: mesure("maitrise_programme", n), xp, ...extra });
const matieres70 = (n: number, titre: string, xp: number, extra: Partial<Palier> = {}): Palier => ({ titre, consigne: n === 1 ? "Monte une matière à 70 % de maîtrise." : `Monte ${n} matières à 70 % de maîtrise.`, objectif: mesure("matieres_au_dessus", n, { pct: 70 }), xp, ...extra });
const rappels = (n: number, titre: string, xp: number, extra: Partial<Palier> = {}): Palier => ({ titre, consigne: `Réussis ${n} questions revues au moins 7 jours après la précédente.`, objectif: mesure("rappels_espaces", n, { n: 7 }), xp, ...extra });
const semaines = (n: number, titre: string, xp: number, extra: Partial<Palier> = {}): Palier => ({ titre, consigne: `Tiens ${n} semaines à 4 jours d'encre ou plus.`, objectif: mesure("semaines_actives", n, { n: 4 }), xp, ...extra });
const seances = (n: number, titre: string, xp: number): Palier => ({ titre, consigne: `Réussis ${n} séances de 20 questions ou plus à 70 % ou mieux.`, objectif: compte("session_terminee", n, { questions: { min: 20 }, pct: { min: 70 } }), xp });

export const QUETES_LONG_COURS: Quete[] = [
  ...chaine("carte", [
    pctNotions(10, "Le premier croquis", 60),
    pctNotions(25, "Les contours", 120),
    pctNotions(50, "La moitié de la carte", 200),
    pctNotions(75, "Les marges", 300),
    pctNotions(100, "La carte entière", 450, { cosmetique: "banniere:imola" }),
  ]),
  ...chaine("compas", [
    maitriseProg(30, "Ouvrir le compas", 60),
    maitriseProg(45, "Le premier cercle", 120),
    maitriseProg(60, "Le cercle juste", 220),
    maitriseProg(70, "Le cercle de l'examen", 350),
    maitriseProg(80, "Le compas d'or", 500, { titreGagne: "titre:compas-or" }),
  ]),
  ...chaine("metier", [
    matieres70(1, "Une couleur franche", 80),
    matieres70(3, "Trois couleurs franches", 150),
    matieres70(5, "La moitié de la palette", 220),
    matieres70(8, "Le polymathe", 400, { titreGagne: "titre:polymathe" }),
  ]),
  ...chaine("memoire", [
    rappels(10, "Le souvenir", 50),
    rappels(50, "La mémoire de travail", 120),
    rappels(150, "La mémoire longue", 200),
    rappels(400, "Le palais de mémoire", 300),
    rappels(1000, "Sfumato", 450, { cosmetique: "cadre:sfumato" }),
  ]),
  ...chaine("carnet", [
    { titre: "Un carnet tenu", consigne: "Avec 500 questions posées ou plus, garde 100 ratures en cours au plus.", objectif: tous(mesure("questions_total", 500), mesure("ratures_ouvertes", 100, undefined, "<=")), xp: 120 },
    { titre: "Un carnet clair", consigne: "Avec 1 000 questions posées ou plus, garde 60 ratures en cours au plus.", objectif: tous(mesure("questions_total", 1000), mesure("ratures_ouvertes", 60, undefined, "<=")), xp: 220 },
    { titre: "Un carnet net", consigne: "Avec 2 000 questions posées ou plus, garde 30 ratures en cours au plus.", objectif: tous(mesure("questions_total", 2000), mesure("ratures_ouvertes", 30, undefined, "<=")), xp: 350 },
  ]),
  ...chaine(
    "commandes",
    [
      { titre: "Le premier mécène", consigne: "Rends un examen blanc.", objectif: mesure("examens_blancs_au_dessus", 1, { pct: 0 }), xp: 100 },
      { titre: "Trois commandes", consigne: "Rends trois examens blancs.", objectif: mesure("examens_blancs_au_dessus", 3, { pct: 0 }), xp: 200 },
      { titre: "Une commande réussie", consigne: "Réussis un examen blanc à 70 % ou plus.", objectif: mesure("examens_blancs_au_dessus", 1, { pct: 70 }), xp: 250 },
      { titre: "La main du maître", consigne: "Réussis trois examens blancs à 70 % ou plus.", objectif: mesure("examens_blancs_au_dessus", 3, { pct: 70 }), xp: 400 },
      { titre: "Commande honorée", consigne: "Réussis un examen blanc à 80 % ou plus.", objectif: mesure("examens_blancs_au_dessus", 1, { pct: 80 }), xp: 500, titreGagne: "titre:commande" },
    ],
    [acteClos("acte2")],
  ),
  ...chaine("encre", [
    semaines(2, "Deux semaines d'encre", 60),
    semaines(4, "Un mois d'encre", 120),
    semaines(8, "Deux mois d'encre", 200),
    semaines(12, "Une saison d'encre", 300),
    semaines(20, "L'encre fidèle", 450, { cosmetique: "cadre:encre-fidele" }),
  ]),
  ...chaine("justesse", [seances(5, "Cinq séances justes", 60), seances(15, "Quinze séances justes", 140), seances(40, "Quarante séances justes", 250), seances(100, "Cent séances justes", 400)]),
  ...chaine("remontee", [
    { titre: "La reprise", consigne: "Remonte une matière de 10 points par rapport à ses 40 premières questions.", objectif: mesure("matieres_remontees", 1, { n: 10 }), xp: 120 },
    { titre: "Trois reprises", consigne: "Remonte trois matières de 10 points.", objectif: mesure("matieres_remontees", 3, { n: 10 }), xp: 250 },
    { titre: "Le repentir", consigne: "Remonte cinq matières de 10 points.", objectif: mesure("matieres_remontees", 5, { n: 10 }), xp: 400 },
  ]),
  ...chaine("calculs", [
    { titre: "Cinq formules en main", consigne: "Tiens 5 types de calcul (5 justes sur les 6 derniers essais).", objectif: mesure("types_calcul_tenus", 5), xp: 80 },
    { titre: "Quinze formules en main", consigne: "Tiens 15 types de calcul.", objectif: mesure("types_calcul_tenus", 15), xp: 180 },
    { titre: "La calculatrice dans la main", consigne: "Tiens 30 types de calcul.", objectif: mesure("types_calcul_tenus", 30), xp: 320 },
  ]),
  ...chaine("sources", [
    { titre: "Cinq pages propres", consigne: "Réussis 5 pages de drill à 80 % ou plus.", objectif: mesure("drill_pages_reussies", 5, { pct: 80 }), xp: 60 },
    { titre: "Quinze pages propres", consigne: "Réussis 15 pages de drill à 80 % ou plus.", objectif: mesure("drill_pages_reussies", 15, { pct: 80 }), xp: 150 },
    { titre: "Toutes les sources", consigne: "Réussis 30 pages de drill à 80 % ou plus.", objectif: mesure("drill_pages_reussies", 30, { pct: 80 }), xp: 300 },
  ]),
  ...chaine("atelier", [
    { titre: "L'établi", consigne: "Termine 3 séances d'Atelier qui rayent au moins une rature.", objectif: compte("seance_atelier", 3, { rayees: { min: 1 } }), xp: 60 },
    { titre: "Le compagnonnage", consigne: "Termine 10 séances d'Atelier qui rayent au moins une rature.", objectif: compte("seance_atelier", 10, { rayees: { min: 1 } }), xp: 150 },
    { titre: "Le maître d'atelier", consigne: "Termine 25 séances d'Atelier qui rayent au moins une rature.", objectif: compte("seance_atelier", 25, { rayees: { min: 1 } }), xp: 300 },
  ]),
  ...chaine("trentaine", [
    { titre: "Cinq trentaines", consigne: "Rends les 30 du jour à 60 % ou plus, cinq fois.", objectif: compte("defi_rendu", 5, { pct: { min: 60 } }), xp: 60 },
    { titre: "Vingt trentaines", consigne: "Rends les 30 du jour à 60 % ou plus, vingt fois.", objectif: compte("defi_rendu", 20, { pct: { min: 60 } }), xp: 150 },
    { titre: "Cinquante trentaines", consigne: "Rends les 30 du jour à 60 % ou plus, cinquante fois.", objectif: compte("defi_rendu", 50, { pct: { min: 60 } }), xp: 300 },
  ]),
  ...chaine(
    "rythme",
    [
      { titre: "Une semaine au rythme", consigne: "Tiens ton rythme de questions vers ton objectif une semaine.", objectif: mesure("semaines_objectif_tenu", 1), xp: 60 },
      { titre: "Un mois au rythme", consigne: "Tiens ton rythme quatre semaines.", objectif: mesure("semaines_objectif_tenu", 4), xp: 150 },
      { titre: "Deux mois au rythme", consigne: "Tiens ton rythme huit semaines.", objectif: mesure("semaines_objectif_tenu", 8), xp: 250 },
      { titre: "La cadence", consigne: "Tiens ton rythme seize semaines.", objectif: mesure("semaines_objectif_tenu", 16), xp: 400 },
    ],
    [apres("trame:prologue:jour-j")],
  ),
  ...chaine("joute", [
    { titre: "Cinq duels", consigne: "Joue cinq duels.", objectif: mesure("duels_joues", 5), xp: 50 },
    { titre: "Vingt-cinq duels", consigne: "Joue vingt-cinq duels.", objectif: mesure("duels_joues", 25), xp: 120 },
    { titre: "L'or", consigne: "Atteins le palier Or.", objectif: mesure("pic_palier", 2), xp: 150 },
    { titre: "Le platine", consigne: "Atteins le palier Platine.", objectif: mesure("pic_palier", 3), xp: 250 },
    { titre: "Le diamant", consigne: "Atteins le palier Diamant (il demande 60 % de maîtrise).", objectif: mesure("pic_palier", 4), xp: 400, titreGagne: "titre:duelliste" },
  ]),
];

// ── Les exploits ───────────────────────────────────────────────────────
// Unifiés avec les sceaux : les 22 sceaux sont les exploits connus (visibles
// dans la Collection, leurs paliers et cosmétiques inchangés) ; le Codex
// leur ajoute une petite XP au premier palier. Les exploits nouveaux sont
// cachés, et se gardent dans la même table sceaux (clé « exploit:<id> »,
// palier 1) : une seule Collection, une seule cérémonie.
// Ils sont communs à tous les programmes (programme « global », ids inchangés).

const exploit = (q: Base): Quete => ({ ...quete(q), programme: PROGRAMME_GLOBAL });

const EXPLOITS_SCEAUX: Quete[] = [...SCEAUX, ...SCEAUX_BASE].map((s, i) =>
  exploit({
    id: `exploit:sceau:${s.cle}`,
    famille: "exploit",
    ordre: i + 1,
    titre: `Sceau ${nomSceau(s)}`,
    consigne: `Gagne le sceau ${nomSceau(s)} à l'encre : ${conditionSceau(s, s.seuils[0])}.`,
    objectif: mesure("sceau", 1, { cle: s.cle }),
    recompense: { xp: 50 },
  }),
);

type Exploit = [cle: string, titre: string, consigne: string, objectif: Objectif, xp: number, indice: string | null, cosmetique?: string, titre_?: string];
const EXPLOITS_NOUVEAUX: Exploit[] = [
  ["joconde", "La Joconde", "100 % à une séance de 20 questions ou plus.", compte("session_terminee", 1, { questions: { min: 20 }, pct: { min: 100 } }), 150, "Un sourire parfait, sans une retouche."],
  ["main-sure", "La main sûre", "15 bonnes réponses d'affilée dans une séance.", { k: "special", cle: "serie_bonnes", seuil: 15 }, 100, null],
  ["page-propre", "Pas une tache", "15 sur 15 à une page de drill.", compte("drill_page_terminee", 1, { pct: { min: 100 } }), 80, null],
  ["phenix", "Le phénix", "Rater les 30 du jour sous 50 %, puis les réussir à 80 % le lendemain.", { k: "special", cle: "phenix" }, 120, "On renaît de ses cendres. Le lendemain, de préférence."],
  ["retour-de-milan", "Retour de Milan", "Revenir après deux semaines d'absence et répondre à 20 questions dans la journée.", { k: "special", cle: "retour" }, 100, null],
  ["uomo-universale", "Uomo universale", "Répondre dans les dix matières la même semaine.", compte("question_repondue", 10, undefined, { fenetre: "semaine", distinct: "matiere" }), 120, "Peintre, ingénieur, anatomiste… et toi, en une semaine ?"],
  ["vitruve", "L'Homme de Vitruve", "80 % de maîtrise dans les dix matières.", mesure("matieres_au_dessus", 10, { pct: 80 }), 300, "Le cercle et le carré, parfaitement remplis.", "cadre:vitruve"],
  ["machine-volante", "La machine volante", "5 sur 5 aux 5 du jour en moins d'une minute.", compte("cinq_rendu", 1, { justes: 5, secondes: { max: 60 } }), 150, "Cinq sur cinq, et tu décolles avant la minute.", "banniere:machine-volante"],
  ["miroir", "L'écriture en miroir", "Rayer une rature ratée trois fois ou plus.", compte("rature_rayee", 1, { erreurs: { min: 3 } }), 80, "Ce qui t'a résisté trois fois, lu enfin à l'endroit."],
  ["vieille-rature", "Le repentir", "Rayer une rature vieille de plus de 30 jours.", compte("rature_rayee", 1, { ageJours: { min: 30 } }), 80, null],
  ["entre-amis", "Entre amis", "Gagner un duel contre un ami.", compte("duel_termine", 1, { resultat: "victoire", ami: true }), 60, null],
  ["premier-sur-l-echafaudage", "Premier sur l'échafaudage", "Finir premier aux 5 du jour.", compte("cinq_rendu", 1, { rang: 1 }), 120, "Être en haut de l'échafaudage avant tout le monde."],
  ["velin-immacule", "Vélin immaculé", "Aucune rature en cours, avec 1 000 questions posées ou plus.", tous(mesure("questions_total", 1000), mesure("ratures_ouvertes", 0, undefined, "<=")), 250, "Pas une tache sur le vélin. Pas une."],
  ["codex-atlanticus", "Codex Atlanticus", "Terminer cent quêtes du Codex.", mesure("quetes_terminees", 100), 300, null, undefined, "titre:codex"],
  ["aube", "L'aube sur le Duomo", "10 questions avant 7 h du matin.", { k: "special", cle: "aube" }, 60, "Le premier rayon sur le Duomo."],
  ["calcul-plume", "Le calcul à la plume", "20 calculs justes d'affilée.", { k: "special", cle: "serie_calculs", seuil: 20 }, 100, null],
];

export const QUETES_EXPLOITS: Quete[] = [
  ...EXPLOITS_SCEAUX,
  ...EXPLOITS_NOUVEAUX.map(([cle, titre, consigne, objectif, xp, indice, cosmetique, titreGagne], i) =>
    exploit({
      id: `exploit:${cle}`,
      famille: "exploit",
      ordre: 100 + i,
      titre,
      consigne,
      objectif,
      recompense: { xp, ...(cosmetique ? { cosmetique } : {}), ...(titreGagne ? { titre: titreGagne } : {}) },
      visibilite: indice ? "indice" : "cachee",
      ...(indice ? { indice } : {}),
    }),
  ),
];

// ── La séance ciblée : sa taille réelle ────────────────────────────────
// Une session ciblée d'une seule matière compte round(poids × format)
// questions (generate_practice_session, migration_practice_sessions.sql ;
// formats de components/PracticeSession.tsx). En 180, Quant, Economics et
// Corporate n'en ont que 14, Derivatives 12 : le seuil d'une quête ou d'un
// contrat de séance ciblée est la taille la plus grande possible, plafonnée
// à 15, et le lien ouvre le plus petit format qui l'atteint.

/** Les formats de l'entraînement ciblé (questions d'un examen entier). */
export const FORMATS_CIBLEE = [90, 180] as const;
export type FormatCiblee = (typeof FORMATS_CIBLEE)[number];
/** Le seuil visé d'une séance ciblée (s'il est possible dans la matière). */
export const SEUIL_CIBLEE = 15;
/** Questions d'une matière dans une session ciblée de ce format (même arrondi que la base). */
export const questionsCiblee = (poids: number, format: number) => Math.round((poids * format) / 100);
/** La plus grande séance ciblée possible dans une matière (son plus grand format) : 14 en Quant, 12 en Derivatives. */
export const tailleMaxCiblee = (poids: number) => Math.max(...FORMATS_CIBLEE.map((f) => questionsCiblee(poids, f)));
/** Le seuil d'une séance ciblée pour une matière, et le plus petit format qui l'atteint. */
export function cibleeDe(poids: number): { questions: number; format: FormatCiblee } {
  const max = tailleMaxCiblee(poids);
  const questions = Math.max(1, Math.min(SEUIL_CIBLEE, max));
  return { questions, format: FORMATS_CIBLEE.find((f) => questionsCiblee(poids, f) >= questions) ?? FORMATS_CIBLEE[FORMATS_CIBLEE.length - 1] };
}
/** Le lien d'une séance ciblée : la matière cochée, le format choisi. */
export const lienCiblee = (matiere: string, format: FormatCiblee) => `/practice?topic=${encodeURIComponent(matiere)}${format !== FORMATS_CIBLEE[0] ? `&format=${format}` : ""}`;
/** « (format 180) » dans une consigne, rien pour le format par défaut. */
export const formatCiblee = (format: FormatCiblee) => (format !== FORMATS_CIBLEE[0] ? ` (format ${format})` : "");

/** Un objectif de séance ciblée ramené à la taille possible dans la matière (contrats : la matière vient des paramètres). */
export function ajusterCiblee(o: Objectif, poids: number): Objectif {
  if (o.k === "tous" || o.k === "unDe") return { ...o, objectifs: o.objectifs.map((x) => ajusterCiblee(x, poids)) };
  if (o.k !== "compteur" || o.evenement !== "session_terminee") return o;
  const f = o.filtre as Record<string, unknown> | undefined;
  const q = f?.questions as { min?: number } | undefined;
  if (!f || f.source !== "ciblee" || typeof q?.min !== "number") return o;
  return { ...o, filtre: { ...f, questions: { ...q, min: Math.min(q.min, cibleeDe(poids).questions) } } } as Objectif;
}
/** L'objectif est-il une séance ciblée ? */
export const estCiblee = (o: Objectif): boolean =>
  o.k === "tous" || o.k === "unDe" ? o.objectifs.some(estCiblee) : o.k === "compteur" && o.evenement === "session_terminee" && (o.filtre as Record<string, unknown> | undefined)?.source === "ciblee";

// ── Contrats ───────────────────────────────────────────────────────────
// Trois par jour, un par emplacement, choisis pour le joueur (voir
// CONCEPTION.md) ; le trio tient en 30 à 45 minutes. Plus des contrats de
// la semaine, qui sont des quêtes ordinaires à répétition hebdomadaire.

const toutes = (n: number): Record<Phase, number> => ({ fondations: n, consolidation: n, repetition: n, veillee: n, apres: n });

export const MODELES_CONTRATS: ModeleContrat[] = [
  // faiblesse : ce qui coince le plus, pondéré par le poids à l'examen
  { id: "notion-faible", emplacement: "faiblesse", titre: "Sur la notion : {notion}", consigne: "Décroche 8 bonnes réponses sur {notion}, où tu veux (l'Atelier s'y prête bien).", objectif: compte("question_repondue", 8, { notion: { param: "notion" }, juste: true }, { fenetre: "jour" }), params: ["notion"], eligible: [], poids: { fondations: 3, consolidation: 4, repetition: 4, veillee: 2, apres: 2 }, duree: 15 },
  { id: "matiere-faible", emplacement: "faiblesse", titre: "Séance de {matiere}", consigne: "Réussis une session ciblée de {questions} questions en {matiere}{format} à 65 % ou plus.", objectif: compte("session_terminee", 1, { source: "ciblee", matiere: { param: "matiere" }, questions: { min: SEUIL_CIBLEE }, pct: { min: 65 } }, { fenetre: "jour" }), params: ["matiere"], eligible: [], poids: toutes(3), duree: 25, lien: "/practice", requiert: ["ciblee"] },
  { id: "drill-page", emplacement: "faiblesse", titre: "Une page de {fiche}", consigne: "Passe une page de drill de la fiche {fiche} à 70 % ou plus.", objectif: compte("drill_page_terminee", 1, { fiche: { param: "fiche" }, pct: { min: 70 } }, { fenetre: "jour" }), params: ["fiche"], eligible: [], poids: { fondations: 4, consolidation: 2, repetition: 1, veillee: 0, apres: 2 }, duree: 20, lien: "/fiches", requiert: ["drill"] },
  { id: "atelier", emplacement: "faiblesse", titre: "Une séance d'Atelier", consigne: "Termine une séance d'Atelier.", objectif: compte("seance_atelier", 1, undefined, { fenetre: "jour" }), params: [], eligible: [mesure("ratures_ouvertes", 3)], poids: { fondations: 2, consolidation: 3, repetition: 3, veillee: 1, apres: 2 }, duree: 30, lien: "/atelier", requiert: ["atelier"] },
  { id: "calculs", emplacement: "faiblesse", titre: "Les calculs de {matiere}", consigne: "Réponds juste à 10 calculs de {matiere}.", objectif: compte("calcul_repondu", 10, { matiere: { param: "matiere" }, juste: true }, { fenetre: "jour" }), params: ["matiere"], eligible: [], poids: toutes(1), duree: 10, lien: "/calculs", requiert: ["calculs"] },
  // entretien : ne pas laisser filer ce qu'on sait
  { id: "ratures", emplacement: "entretien", titre: "Gratter cinq ratures", consigne: "Raye 5 ratures en les réussissant.", objectif: compte("rature_rayee", 5, undefined, { fenetre: "jour" }), params: [], eligible: [mesure("ratures_ouvertes", 5)], poids: { fondations: 3, consolidation: 3, repetition: 4, veillee: 4, apres: 2 }, duree: 10 },
  { id: "ratures-vieilles", emplacement: "entretien", titre: "Les vieilles ratures", consigne: "Raye 3 ratures de plus de 7 jours.", objectif: compte("rature_rayee", 3, { ageJours: { min: 7 } }, { fenetre: "jour" }), params: [], eligible: [mesure("ratures_ouvertes", 10)], poids: toutes(2), duree: 10 },
  { id: "rappel", emplacement: "entretien", titre: "La mémoire longue", consigne: "Réussis 10 questions vues il y a plus de 7 jours.", objectif: compte("question_repondue", 10, { juste: true, ecartJours: { min: 7 } }, { fenetre: "jour" }), params: [], eligible: [mesure("questions_total", 200)], poids: { fondations: 1, consolidation: 3, repetition: 3, veillee: 2, apres: 3 }, duree: 15 },
  { id: "matiere-oubliee", emplacement: "entretien", titre: "{matiere} prend la poussière", consigne: "Réponds à 15 questions de {matiere} : tu n'y as pas touché depuis 10 jours au moins.", objectif: compte("question_repondue", 15, { matiere: { param: "matiere" } }, { fenetre: "jour" }), params: ["matiere"], eligible: [], poids: toutes(2), duree: 15 },
  { id: "cours", emplacement: "entretien", titre: "Le cours de {matiere}", consigne: "Écoute 20 minutes du cours de {matiere}.", objectif: compte("cours_ecoute", 20, { matiere: { param: "matiere" } }, { fenetre: "jour", somme: "minutes" }), params: ["matiere"], eligible: [], poids: { fondations: 2, consolidation: 1, repetition: 0, veillee: 0, apres: 1 }, duree: 20, requiert: ["cours"] },
  { id: "flashcards", emplacement: "entretien", titre: "Le paquet de cartes", consigne: "Révise 30 flashcards.", objectif: compte("flashcards_revues", 30, undefined, { fenetre: "jour", somme: "cartes" }), params: [], eligible: [], poids: toutes(1), duree: 10, lien: "/flashcards", requiert: ["flashcards"] },
  // variété : un format qu'on n'a pas fait récemment, calé sur la phase
  { id: "cinq", emplacement: "variete", titre: "Les 5 du jour à 4/5", consigne: "Rends les 5 du jour avec 4 bonnes réponses ou plus.", objectif: compte("cinq_rendu", 1, { justes: { min: 4 } }, { fenetre: "jour" }), params: [], eligible: [], poids: toutes(3), duree: 5, lien: "/defi/cinq", requiert: ["cinq"] },
  { id: "eclair", emplacement: "variete", titre: "Deux séries éclair", consigne: "Réussis deux séries éclair à 4/5 ou plus.", objectif: compte("eclair_rendue", 2, { justes: { min: 4 } }, { fenetre: "jour" }), params: [], eligible: [], poids: toutes(2), duree: 10, lien: "/eclair", requiert: ["eclair"] },
  { id: "duel", emplacement: "variete", titre: "Un duel", consigne: "Joue un duel.", objectif: compte("duel_termine", 1, undefined, { fenetre: "jour" }), params: [], eligible: [], poids: { fondations: 2, consolidation: 2, repetition: 1, veillee: 0, apres: 2 }, duree: 10, lien: "/duel", requiert: ["duels"] },
  { id: "defi", emplacement: "variete", titre: "Les 30 du jour", consigne: "Rends les 30 du jour.", objectif: compte("defi_rendu", 1, undefined, { fenetre: "jour" }), params: [], eligible: [mesure("questions_total", 100)], poids: { fondations: 1, consolidation: 2, repetition: 4, veillee: 1, apres: 1 }, duree: 40, lien: "/defi", requiert: ["trente"] },
];

export const QUETES_CONTRATS_HEBDO: Quete[] = [
  quete({ id: "contrat:hebdo:encre", famille: "contrat", repetition: "hebdomadaire", ordre: 1, titre: "La semaine d'encre", consigne: "Valide 5 jours d'encre cette semaine.", objectif: compte("jour_encre", 5, undefined, { fenetre: "semaine" }), recompense: { xp: XP.hebdo } }),
  quete({ id: "contrat:hebdo:pigments", famille: "contrat", repetition: "hebdomadaire", ordre: 2, titre: "Le tour des pigments", consigne: "Réponds juste dans 6 matières différentes cette semaine.", objectif: compte("question_repondue", 6, { juste: true }, { fenetre: "semaine", distinct: "matiere" }), recompense: { xp: 100 } }),
  quete({ id: "contrat:hebdo:commande", famille: "contrat", repetition: "hebdomadaire", ordre: 3, titre: "La commande de la semaine", consigne: "Rends un examen blanc cette semaine.", objectif: compte("examen_blanc_rendu", 1, undefined, { fenetre: "semaine" }), prerequis: [{ k: "joursAvantExamen", max: 60 }], visibilite: "ouverte", recompense: { xp: 150 }, lien: "/mock-exams" }),
];

// ── Les phases (calées sur le jour J) ──────────────────────────────────

/** `sansDate` : la réplique d'une phase atteinte par l'avancement, sans jour J (aucune durée à annoncer). */
export const PHASES: { phase: Phase; nom: string; depuis: number; replique: string; sansDate?: string }[] = [
  { phase: "fondations", nom: "Les fondations", depuis: Infinity, replique: "On pose les murs avant la fresque : tout le programme, une fois." },
  { phase: "consolidation", nom: "La consolidation", depuis: 90, replique: "Trois mois. On reprend ce qui s'efface et on bouche les trous.", sansDate: "On reprend ce qui s'efface et on bouche les trous." },
  { phase: "repetition", nom: "La répétition générale", depuis: 30, replique: "Un mois. Examens blancs, ratures, rythme de l'épreuve.", sansDate: "On répète : examens blancs, ratures, rythme de l'épreuve." },
  { phase: "veillee", nom: "La veillée", depuis: 7, replique: "Une semaine. On entretient, on ne commence plus rien." },
  { phase: "apres", nom: "Après l'épreuve", depuis: -Infinity, replique: "L'examen est passé. La bottega reste ouverte : on garde la main, et on prépare la suite." },
];

/** Sans jour J (V3 §1.4) : le programme du joueur, ses actes clos, et s'il a déjà l'examen derrière lui (un programme mené). */
export type ContextePhase = { def: Pick<DefinitionProgramme, "cle" | "court" | "nom" | "examen" | "trame">; actesClos: Iterable<string>; apresExamen: boolean };

/**
 * Les actes qui font le fil d'une trame, dans l'ordre : ni les actes
 * parallèles (l'acte I, les outils) ni l'épilogue (calé sur le jour J).
 */
export function filDesActes(def: ContextePhase["def"]): Acte[] {
  const actes = def.trame === "generique" ? actesGeneriques(def) : def.trame.actes;
  return actes.filter((a) => !a.parallele && a.numero !== 99).sort((a, b) => a.numero - b.numero);
}

/**
 * La phase d'un joueur. Avec un jour J (programme daté) : selon les jours
 * restants (passé → après). Sans jour J ou sans examen, et avec `ctx` : par
 * l'avancement de la trame — fondations tant que le 2e acte du fil (l'acte II
 * de CFA I, l'acte 1 générique) n'est pas clos, consolidation jusqu'à la
 * clôture de l'avant-dernier, répétition jusqu'au dernier, après ensuite ;
 * jamais de veillée sans date. Sans `ctx` : fondations (l'ancien comportement).
 */
export function phaseDe(joursAvant: number | null, ctx?: ContextePhase): Phase {
  if (joursAvant !== null && (!ctx || ctx.def.examen)) {
    if (joursAvant < 0) return "apres";
    if (joursAvant <= 7) return "veillee";
    if (joursAvant <= 30) return "repetition";
    if (joursAvant <= 90) return "consolidation";
    return "fondations";
  }
  if (!ctx) return "fondations";
  if (ctx.apresExamen) return "apres";
  const clos = new Set(ctx.actesClos);
  const fil = filDesActes(ctx.def);
  const estClos = (i: number) => i >= 0 && i < fil.length && clos.has(fil[i].id);
  if (fil.length < 2 || !estClos(1)) return "fondations";
  if (!estClos(fil.length - 2)) return "consolidation";
  if (!estClos(fil.length - 1)) return "repetition";
  return "apres";
}

// ── La recommandation (la « prochaine quête ») ─────────────────────────
// score = importance × faiblesse × urgence × continuité × durée (CONCEPTION.md §8)

export const RECOMMANDATION = {
  /** poids de la matière la plus lourde (Ethics, 17,5 %) : importance = poids / ce maximum */
  poidsMax: Math.max(...TOPICS.map((t) => t.weight)),
  /** importance d'une quête sans matière */
  importanceSansMatiere: 0.6,
  /** faiblesse d'une matière jamais mesurée */
  faiblesseInconnue: 0.8,
  /** quête déjà entamée / à moitié faite */
  continuite: 1.3,
  continuiteMoitie: 1.5,
  /** même matière que la dernière séance */
  memeMatiere: 1.15,
  /** quête de l'acte en cours */
  acteCourant: 1.2,
  /** plus longue que le budget du jour (budgetDuJour, moteur), la quête est moins proposée */
  horsDuree: 0.7,
  /** urgence par phase et par axe de chaîne */
  urgence: {
    fondations: { couverture: 1.3, maitrise: 1, memoire: 0.9, examens: 0.6, regularite: 1.1, competition: 0.8, methode: 1 },
    consolidation: { couverture: 1.1, maitrise: 1.2, memoire: 1.2, examens: 1, regularite: 1, competition: 0.8, methode: 1 },
    repetition: { couverture: 0.8, maitrise: 1.2, memoire: 1.3, examens: 1.5, regularite: 1, competition: 0.5, methode: 1 },
    veillee: { couverture: 0.5, maitrise: 1, memoire: 1.4, examens: 1.1, regularite: 1, competition: 0.3, methode: 0.8 },
    apres: { couverture: 1, maitrise: 1, memoire: 1.2, examens: 0.6, regularite: 1.1, competition: 1, methode: 1 },
  } satisfies Record<Phase, Record<Chaine["axe"], number>>,
} as const;

// ── Le dévoilement progressif (nouveau compte) ─────────────────────────
// Tout est accessible dès la première séance : au pire 45 minutes de
// présence, le deuxième jour de visite ou le bouton « Tout montrer ».
// Un lien direct marche toujours (rien n'est verrouillé, seulement rangé).
// Comptes existants (inscrits avant le Codex, ou 50 questions et plus) : tout visible.

const filet = (minutes: number): Devoilement["quand"] => [{ k: "minutes", n: minutes }, { k: "visite", n: 2 }, { k: "manuel" }];

export const DECOUVERTE: Devoilement[] = [
  { id: "reviser", quoi: "menu:reviser", libelle: "Réviser", quand: [{ k: "quete", id: "trame:prologue:premier-trait" }, ...filet(10)], replique: "La bibliothèque est ouverte : fiches, cours, flashcards. Sers-toi." },
  { id: "branches", quoi: "codex:branches", libelle: "Les branches de matière", quand: [{ k: "quete", id: "trame:prologue:premier-trait" }, ...filet(10)], replique: "Dix branches, une par matière. Chacune pousse à son rythme." },
  { id: "entrainer", quoi: "menu:entrainer", libelle: "S'entraîner", quand: [{ k: "quete", id: "trame:prologue:dix" }, ...filet(15)], replique: "La salle d'entraînement. Tes points faibles s'y afficheront dès qu'ils existent." },
  { id: "contrats", quoi: "codex:contrats", libelle: "Les contrats du jour", quand: [{ k: "quete", id: "trame:prologue:premiere-seance" }, ...filet(20)], replique: "Trois contrats par jour, taillés pour toi. Trois quarts d'heure, pas plus." },
  { id: "longcours", quoi: "codex:longcours", libelle: "Les quêtes au long cours", quand: [{ k: "quete", id: "trame:prologue:premiere-seance" }, ...filet(30)], replique: "Les grands chantiers. Ceux qui se comptent en semaines." },
  { id: "classement", quoi: "menu:classement", libelle: "Classement", quand: [{ k: "quete", id: "trame:a1:duel" }, { k: "quete", id: "trame:a1:cinq" }, ...filet(30)], replique: "Les duels, les examens blancs et le classement. Que les meilleurs gagnent, et les autres révisent." },
  { id: "exploits", quoi: "codex:exploits", libelle: "Les exploits", quand: [{ k: "quete", id: "trame:prologue:premiere-seance" }, ...filet(45)], replique: "Certains exploits sont cachés. Je ne dirai rien. Enfin, presque rien." },
];

// ── Les branches de matière (générées) ─────────────────────────────────

/** Ce qui existe pour une matière (la page Réviser peut affiner flashcards et cours depuis la base). */
export type ContenuMatiere = {
  key: string;
  /** nom français (lib/practiceTopics.ts) */
  nom: string;
  /** libellé court (« FSA ») */
  court: string;
  /** poids à l'examen, en % */
  poids: number;
  fiche: string | null;
  /** la fiche a des pages de drill */
  drill: boolean;
  cours: string | null;
  flashcards: boolean;
  notions: number;
  /** ce qui existe pour CETTE matière (fiche, drill, cours, flashcards) : une étape de branche sans son outil n'est pas générée */
  outils: Outil[];
};

/** Les étapes d'une branche, dans l'ordre d'affichage (« serie » : à la place de « ciblee » sans séance ciblée). */
export const ETAPES: EtapeBranche[] = ["entree", "cours", "fiche", "drill", "flashcards", "ciblee", "serie", "tour", "maitrise60", "maitrise75", "maitre"];

/** Les titres « Maître de <matière> » (cosmétiques générés). */
export const titresMaitres = (contenu: ContenuMatiere[] = contenuDuProgramme()): CosmetiqueCodex[] =>
  contenu.map((m) => ({ cle: titreMaitre(m.key), type: "titre", nom: `Maître ${de(m.court)}`, description: `A mené la branche ${m.nom} à son terme.` }));

/**
 * Une branche par matière. Le tronc : premier pas → (fiche → drill) →
 * séance ciblée à 70 % (le jalon de la guilde) → maîtrise 60 % → 75 % →
 * « Maître de … », avec le tour des notions en parallèle. Cours et
 * flashcards sont des étapes bonus (jamais bloquantes). Une matière sans
 * fiche n'a pas d'étape fiche ; une fiche sans drill n'a pas d'étape drill.
 * `outils` : ceux du programme (absent : tous). Une étape dont l'outil manque
 * au programme ou à la matière n'est pas générée ; sans séance ciblée, le
 * jalon devient « serie » (15 justes sur les 20 dernières réponses de la
 * matière). Les ids sont LOCAUX, sur la clé nue de la matière
 * (« branche:fsa:entree ») : genererArbre (lib/codex/programmes.ts) les
 * préfixe hors CFA I ; filtres et titre de maître gardent la clé qualifiée.
 */
export function genererBranches(contenu: ContenuMatiere[] = contenuDuProgramme(), programme = PROGRAMME, outils?: ReadonlySet<Outil>): Quete[] {
  const duProgramme = (o: Outil) => !outils || outils.has(o);
  const jalon: EtapeBranche = duProgramme("ciblee") ? "ciblee" : "serie";
  return contenu.flatMap((m) => {
    const id = (e: EtapeBranche) => `branche:${cleLocale(m.key)}:${e}`;
    const a = (o: Outil) => duProgramme(o) && m.outils.includes(o);
    const dm = { matiere: m.key };
    const b = (etape: EtapeBranche, q: Omit<Base, "id" | "famille" | "ordre" | "matiere" | "etape">): Quete =>
      ({ ...quete({ ...q, id: id(etape), famille: "branche", ordre: ETAPES.indexOf(etape) + 1, matiere: m.key, etape }), programme });
    const out: Quete[] = [b("entree", { titre: `Premier pas en ${m.court}`, consigne: `Réponds à 10 questions ${de(m.nom)}.`, objectif: compte("question_repondue", 10, dm), recompense: { xp: 30 }, duree: 8 })];
    if (m.cours && a("cours"))
      out.push(b("cours", { optionnelle: true, titre: "L'oreille du maître", consigne: `Écoute 30 minutes du cours complet ${de(m.nom)}.`, objectif: compte("cours_ecoute", 30, dm, { somme: "minutes" }), recompense: { xp: 40 }, lien: `/courses/${m.cours}`, duree: 30 }));
    const drill = !!m.fiche && m.drill && a("fiche") && a("drill");
    if (drill) {
      out.push(b("fiche", { titre: `La fiche ${m.court}`, consigne: "Lis une page de la fiche et passe son drill de 15 questions.", objectif: compte("drill_page_terminee", 1, dm), recompense: { xp: 40 }, lien: `/fiches/${m.fiche}`, duree: 20 }));
      out.push(b("drill", { titre: "Le drill complet", consigne: `Passe toutes les pages de drill de la fiche ${m.court}.`, pourquoi: "La fiche couvre le cours entier : chaque page passée, c'est un thème vu une fois au moins.", objectif: mesure("drill_pages_restantes", 0, dm, "<="), prerequis: [apres(id("fiche"))], recompense: { xp: 100 }, lien: `/fiches/${m.fiche}` }));
    } else if (m.fiche && a("fiche")) {
      out.push(b("fiche", { optionnelle: true, titre: `La fiche ${m.court}`, consigne: `Ouvre la fiche ${m.court} et lis-la.`, objectif: compte("fiche_ouverte", 1, dm), recompense: { xp: 30 }, lien: `/fiches/${m.fiche}`, duree: 20 }));
    }
    if (m.flashcards && a("flashcards"))
      out.push(b("flashcards", { optionnelle: true, titre: "Le paquet de cartes", consigne: `Révise 40 flashcards ${de(m.nom)}.`, objectif: compte("flashcards_revues", 40, dm, { somme: "cartes" }), recompense: { xp: 30 }, lien: "/flashcards", duree: 15 }));
    const cib = cibleeDe(m.poids);
    out.push(
      jalon === "ciblee"
        ? b("ciblee", {
            titre: "La séance ciblée",
            consigne: `Réussis une session ciblée ${de(m.nom)}, ${cib.questions} questions au moins${formatCiblee(cib.format)}, à 70 % ou plus.`,
            pourquoi: "C'est l'épreuve de la branche : celle que la guilde attend de chaque matière.",
            objectif: compte("session_terminee", 1, { source: "ciblee", matiere: m.key, questions: { min: cib.questions }, pct: { min: 70 } }),
            prerequis: [apres(drill ? id("drill") : id("entree"))],
            recompense: { xp: 120 },
            lien: lienCiblee(m.key, cib.format),
            duree: 25,
          })
        : b("serie", {
            titre: "La série juste",
            consigne: `Réussis 15 des 20 dernières questions ${de(m.nom)}.`,
            pourquoi: "C'est l'épreuve de la branche : une matière qui tient sur vingt questions de suite.",
            objectif: { k: "special", cle: "justes_sur_20_matiere", seuil: 15 },
            prerequis: [apres(drill ? id("drill") : id("entree"))],
            recompense: { xp: 120 },
            duree: 20,
          }),
      b("tour", {
        titre: `Le tour ${de(m.court)}`,
        consigne: `Vois chacune des ${m.notions} notions ${de(m.nom)} (5 réponses au moins dans chacune).`,
        pourquoi: "Une notion jamais vue, c'est une question jouée à pile ou face.",
        objectif: mesure("notions_vues_pct", 100, dm),
        prerequis: [apres(id("entree"))],
        recompense: { xp: Math.min(150, 60 + 5 * m.notions) },
      }),
      b("maitrise60", { titre: "Le pigment tient", consigne: `Monte ${m.nom} à 60 % de maîtrise.`, pourquoi: "60 % : la zone où l'on commence à réussir le CFA.", objectif: mesure("maitrise", 60, dm), prerequis: [apres(id(jalon))], recompense: { xp: 180 } }),
      b("maitrise75", { titre: "La couleur juste", consigne: `Monte ${m.nom} à 75 % de maîtrise.`, objectif: mesure("maitrise", 75, dm), prerequis: [apres(id("maitrise60"))], recompense: { xp: 260 } }),
      b("maitre", {
        titre: `Maître ${de(m.court)}`,
        consigne: `85 % de maîtrise en ${m.nom}, toutes ses notions vues et 5 ratures en cours au plus.`,
        objectif: tous(mesure("maitrise", 85, dm), mesure("notions_vues_pct", 100, dm), mesure("ratures_ouvertes", 5, dm, "<=")),
        prerequis: [apres(id("maitrise75")), apres(id("tour"))],
        recompense: { xp: 400, titre: titreMaitre(m.key) },
      }),
    );
    return out;
  });
}

// ── Le catalogue complet ───────────────────────────────────────────────

/** Toutes les quêtes uniques et hebdomadaires du programme (les contrats du jour sont des modèles). */
export function catalogueCodex(contenu: ContenuMatiere[] = contenuDuProgramme()): Quete[] {
  return [...QUETES_TRAME, ...genererBranches(contenu), ...QUETES_LONG_COURS, ...QUETES_EXPLOITS, ...QUETES_CONTRATS_HEBDO];
}

/** Les incohérences du catalogue de CFA I (ids en double, prérequis vers rien, cosmétiques inconnus) ; [] : tout va bien. */
export function verifierCatalogue(contenu: ContenuMatiere[] = contenuDuProgramme()): string[] {
  return verifierQuetes(catalogueCodex(contenu), { actes: ACTES, cosmetiques: [...COSMETIQUES_CODEX, ...titresMaitres(contenu)], decouverte: DECOUVERTE });
}

/**
 * Les incohérences d'un lot de quêtes, quel que soit son programme : ids en
 * double, trop longs (120) ou contenant « | » (le séparateur des clés du
 * panneau), préfixe d'id qui ne correspond pas au programme de la quête,
 * prérequis vers rien, cosmétiques inconnus.
 */
export function verifierQuetes(qs: Quete[], o: { actes: Acte[]; cosmetiques: CosmetiqueCodex[]; decouverte?: Devoilement[] }): string[] {
  const ids = new Set<string>();
  const erreurs: string[] = [];
  const actes = new Set(o.actes.map((a) => a.id));
  const cosmetiques = new Set(o.cosmetiques.map((c) => c.cle));
  for (const q of qs) {
    if (ids.has(q.id)) erreurs.push(`id en double : ${q.id}`);
    ids.add(q.id);
    if (q.id.length > ID_MAX) erreurs.push(`${q.id} : id de plus de ${ID_MAX} caractères`);
    if (q.id.includes("|")) erreurs.push(`${q.id} : « | » interdit dans un id`);
    const attendu = q.programme === PROGRAMME_HISTORIQUE || q.programme === PROGRAMME_GLOBAL ? "" : slugDe(q.programme);
    if (slugDeId(q.id) !== attendu) erreurs.push(`${q.id} : préfixe incohérent avec le programme ${q.programme}`);
    if (estGlobal(q.id) !== (q.programme === PROGRAMME_GLOBAL)) erreurs.push(`${q.id} : quête commune hors du programme « global » (ou l'inverse)`);
  }
  const verifPre = (q: Quete, p: Prerequis) => {
    if (p.k === "quete" && !ids.has(p.id)) erreurs.push(`${q.id} : prérequis inconnu ${p.id}`);
    if (p.k === "acte" && !actes.has(p.id)) erreurs.push(`${q.id} : acte inconnu ${p.id}`);
    if (p.k === "unDe") p.prerequis.forEach((x) => verifPre(q, x));
  };
  for (const q of qs) {
    q.prerequis.forEach((p) => verifPre(q, p));
    if (q.acte && !actes.has(q.acte)) erreurs.push(`${q.id} : acte inconnu ${q.acte}`);
    for (const c of [q.recompense.cosmetique, q.recompense.titre]) if (c && !cosmetiques.has(c)) erreurs.push(`${q.id} : cosmétique inconnu ${c}`);
  }
  for (const a of o.actes) for (const c of [a.recompense.cosmetique, a.recompense.titre]) if (c && !cosmetiques.has(c)) erreurs.push(`acte ${a.id} : cosmétique inconnu ${c}`);
  for (const d of o.decouverte ?? []) for (const w of d.quand) if (w.k === "quete" && !ids.has(w.id)) erreurs.push(`dévoilement ${d.id} : quête inconnue ${w.id}`);
  return erreurs;
}

/** Les quêtes dont un événement n'est pas encore suivi en base (à masquer tant que branche = false). */
export function evenementsDe(o: Objectif): TypeEvenement[] {
  if (o.k === "compteur") return [o.evenement];
  if (o.k === "tous" || o.k === "unDe") return o.objectifs.flatMap(evenementsDe);
  return [];
}
export const queteBranchee = (q: Pick<Quete, "objectif">) => evenementsDe(q.objectif).every((e) => EVENEMENTS[e].branche);
