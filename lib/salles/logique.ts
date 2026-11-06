// Salles : la logique pure (code de salle, horloge de la partie, score,
// validation des réglages, classement). Aucun accès réseau ni base : testé par
// scripts/salles/test-salles.ts. Module neutre (pas de "use client").
//
// Les règles d'horloge, de score et de réglages sont aussi écrites en SQL
// (migration_salles.sql : _salle_horloge, repondre_salle, _salle_params ;
// migration_salles_chrono_global.sql : _salle_horloge_partie pour le chrono
// global) : le serveur fait foi, ce module sert à afficher, à caler les
// compteurs et à valider avant l'envoi. Garder les deux d'accord.

import { TOPICS } from "@/lib/practiceTopics";
import type {
  EtatSalle,
  MockDisponible,
  SalleChrono,
  SalleDifficulte,
  SalleMock,
  SalleMockOrdre,
  SalleMockVersion,
  SalleParams,
  SalleParamsStockes,
  SallePhase,
  SalleSource,
  SalleType,
  TopicKey,
} from "./types";

// ---------------------------------------------------------------------------
// Constantes (les mêmes en SQL)

export const SALLE_NOMBRE_MIN = 5;
export const SALLE_NOMBRE_MAX = 50;
/** Les nombres de questions proposés : 5, 10, 15 … 50. */
export const SALLE_NOMBRES: number[] = Array.from({ length: SALLE_NOMBRE_MAX / 5 }, (_, i) => 5 * (i + 1));
export const SALLE_TEMPS_MIN = 15;
export const SALLE_TEMPS_MAX = 120;
export const SALLE_TEMPS_DEFAUT = 45;
/** Les temps proposés par défaut dans l'écran de réglages (secondes). */
export const SALLE_TEMPS_PROPOSES = [15, 20, 30, 45, 60, 90, 120];
export const SALLE_PART_CALCULS_MIN = 10;
export const SALLE_PART_CALCULS_MAX = 90;
export const SALLE_PART_CALCULS_DEFAUT = 40;
/** Pause entre deux questions : on y montre la correction et le classement. */
export const SALLE_PAUSE_S = 5;
/** Décompte entre le lancement et la première question. */
export const SALLE_DECOMPTE_S = 30;
/** Marge de latence réseau : une réponse est encore acceptée 2 s après la fin du temps (0 point de rapidité), et la correction n'est publique qu'ensuite. */
export const SALLE_MARGE_S = 2;
/** Une question est révélée 2 s avant son ouverture (le temps de l'afficher chez tout le monde). */
export const SALLE_APERCU_S = 2;
export const SALLE_POINTS_MAX = 1000;
/** Une bonne réponse rapporte au moins la moitié des points. */
export const SALLE_POINTS_MIN = 500;
export const SALLE_NOM_MIN = 2;
export const SALLE_NOM_MAX = 40;
export const SALLE_DESCRIPTION_MAX = 120;
/** Rythme de lecture de l'état pendant une partie (ms). */
export const SALLE_LECTURE_MS = 2500;
/** En chrono global, rien ne presse : seul l'avancement des autres joueurs change. Chaque lecture compte dans les quotas de Supabase. */
export const SALLE_LECTURE_EXAMEN_MS = 8000;

export const SALLE_TYPES: SalleType[] = ["questions", "calculs", "mixte"];
/** Par question (une à la fois, correction tout de suite) ou global (comme les 30 du jour, correction à la fin). */
export const SALLE_CHRONOS: SalleChrono[] = ["question", "global"];
/** Chrono global : chaque bonne réponse vaut 1 000 points, le temps cumulé départage. */
export const SALLE_POINTS_GLOBAL = 1000;
export const SALLE_SOURCES: SalleSource[] = ["banque", "mocks", "examen"];
/** Mocks officiels : jusqu'à 600 questions (toutes les sessions, variantes comprises). */
export const SALLE_NOMBRE_MAX_MOCK = 600;

/** Une partie se découpe en 10 rounds au plus, de 3 questions au moins (le serveur applique la même règle). */
export const SALLE_ROUNDS_MAX = 10;
export const SALLE_ROUND_MIN_QUESTIONS = 3;
export const SALLE_ROUNDS_PROPOSES = [1, 2, 3, 4, 5, 6, 8, 10];

/** Le plus de rounds possible pour ce nombre de questions. */
export const roundsMax = (nombre: number): number => Math.max(1, Math.min(SALLE_ROUNDS_MAX, Math.floor(nombre / SALLE_ROUND_MIN_QUESTIONS)));

/** La taille de chaque round : les premiers prennent les questions en plus. */
export function tailleRounds(nombre: number, rounds: number): number[] {
  const n = Math.max(1, rounds);
  return Array.from({ length: n }, (_, i) => Math.floor(nombre / n) + (i < nombre % n ? 1 : 0));
}
export const SALLE_MOCK_VERSIONS: SalleMockVersion[] = ["base", "variantes", "tout"];
export const SALLE_MOCK_ORDRES: SalleMockOrdre[] = ["examen", "melange"];
/** « Mock A — Session 1 », « Variantes 1 — Session 1 », « Variantes inverses 1 — Session 1 » : le nom d'une session (même motif qu'en SQL). */
export const MOCK_EXAMEN_RE = /^(Mock [A-Z]|Variantes( inverses)? [0-9]) — Session [0-9]$/;
export const SALLE_DIFFICULTES: SalleDifficulte[] = ["facile", "moyen", "difficile", "melange"];

export const SALLE_TYPE_LABELS: Record<SalleType, string> = {
  questions: "Questions",
  calculs: "Calculs",
  mixte: "Questions et calculs",
};
export const SALLE_SOURCE_LABELS: Record<SalleSource, string> = {
  banque: "Banque complète",
  mocks: "Questions d'examen (mocks)",
  examen: "Mock exam officiel",
};
export const SALLE_DIFFICULTE_LABELS: Record<SalleDifficulte, string> = {
  facile: "Facile",
  moyen: "Moyen",
  difficile: "Difficile",
  melange: "Mélangé",
};

/** Les clés des matières, dans l'ordre du programme. */
export const SALLE_TOPIC_KEYS: TopicKey[] = TOPICS.map((t) => t.key);

// ---------------------------------------------------------------------------
// Code de salle : 6 caractères sans ambiguïté

/** A-H J K M N P-Z et 2-9 : ni 0/O, ni 1/I/L (31 caractères). */
export const SALLE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const SALLE_CODE_LONGUEUR = 6;
const CODE_RE = /^[A-HJKMNP-Z2-9]{6}$/;

/** Majuscules, sans espace, tiret ni ponctuation : « k7m-x2q » devient « K7MX2Q ». */
export function normaliserCode(brut: string): string {
  return String(brut ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export const codeValide = (code: string) => CODE_RE.test(code);

/** « K7MX2Q » devient « K7M-X2Q » (affichage). */
export function formaterCode(code: string): string {
  const c = normaliserCode(code);
  return c.length === SALLE_CODE_LONGUEUR ? `${c.slice(0, 3)}-${c.slice(3)}` : c;
}

/**
 * Lit un code tapé à la main. Renvoie le code normalisé, ou l'erreur à afficher
 * (les caractères ambigus sont nommés : le joueur a sans doute confondu).
 */
export function analyserCode(brut: string): { ok: true; code: string } | { ok: false; erreur: string } {
  const code = normaliserCode(brut);
  if (!code) return { ok: false, erreur: "Tape le code de la salle (6 caractères)." };
  if (/[01ILO]/.test(code)) {
    return { ok: false, erreur: "Un code n'a ni 0, ni 1, ni lettre O, I ou L : vérifie ta saisie." };
  }
  if (code.length < SALLE_CODE_LONGUEUR) return { ok: false, erreur: "Un code de salle compte 6 caractères." };
  if (code.length > SALLE_CODE_LONGUEUR) return { ok: false, erreur: "Un code de salle compte 6 caractères, pas plus." };
  return { ok: true, code };
}

/**
 * Un code tiré au hasard. Illustratif (tests, maquettes) : les vrais codes sont
 * générés par le serveur (_salle_nouveau_code), qui vérifie qu'ils sont libres.
 */
export function genererCode(rand: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < SALLE_CODE_LONGUEUR; i++) s += SALLE_CODE_ALPHABET[Math.floor(rand() * SALLE_CODE_ALPHABET.length) % SALLE_CODE_ALPHABET.length];
  return s;
}

// ---------------------------------------------------------------------------
// Horloge de la partie
//
// Chrono par question : la question i s'ouvre à started_at + i × (temps +
// pause). Chrono global : toutes les questions s'ouvrent à started_at, la
// partie finit à started_at + nb × temps (pas de pause), rien n'est clos avant
// la fin. Tous les calculs sont faits en millisecondes entières, à partir
// d'une heure « serveur » : voir decalageHorloge pour caler le navigateur sur
// le serveur.

/** Ce qu'il faut savoir d'une partie pour lire l'horloge. */
export type ClockSession = {
  /** instant d'ouverture de la question 1 (ms depuis 1970, heure du serveur) */
  startedAt: number;
  /** secondes par question */
  temps: number;
  /** secondes de pause */
  pause: number;
  nb: number;
  /** arrêtée par l'admin (ou finie) : la partie est terminée quelle que soit l'heure */
  terminee?: boolean;
  /** chrono global : toutes les questions ouvertes d'un coup, un seul chrono de nb × temps */
  global?: boolean;
};

export type Horloge = {
  phase: SallePhase;
  /** -1 pendant le décompte, 0..nb-1, nb une fois finie */
  index: number;
  /** questions closes : la correction est publique et les points comptent */
  nbFermees: number;
  /** questions dont l'énoncé est révélé */
  nbVisibles: number;
  /** pendant « question » : ms restantes pour répondre (chrono global : sur le chrono de la partie) ; sinon 0 */
  restantMs: number;
  /** ms avant le prochain changement de phase (ouverture, fin du temps, fin de partie) ; null une fois finie */
  avantProchainMs: number | null;
};

const msCycle = (s: ClockSession) => (s.temps + s.pause) * 1000;

/** Instant d'ouverture de la question `i` (chrono global : le départ, pour toutes). */
export const ouvertureQuestion = (s: ClockSession, i: number) => (s.global ? s.startedAt : s.startedAt + i * msCycle(s));
/** Instant où le temps de la question `i` est écoulé (le compteur arrive à 0 ; chrono global : la fin de la partie). */
export const finTempsQuestion = (s: ClockSession, i: number) => (s.global ? finPartie(s) : ouvertureQuestion(s, i) + s.temps * 1000);
/** Instant où la correction de la question `i` devient publique (chrono global : à la fin de la partie, pour toutes). */
export const revelationQuestion = (s: ClockSession, i: number) => (s.global ? finPartie(s) : finTempsQuestion(s, i) + SALLE_MARGE_S * 1000);
/** Fin de la partie : fin de la dernière pause ; chrono global : départ + nb × temps. */
export function finPartie(s: ClockSession): number {
  return s.global ? s.startedAt + Math.max(0, Math.floor(s.nb)) * s.temps * 1000 : s.startedAt + s.nb * msCycle(s);
}

/**
 * L'état d'une partie en chrono global. Miroir de _salle_horloge_partie :
 * décompte (index -1 ; tous les énoncés révélés 2 s avant le départ), puis
 * « question » (index 0, toutes visibles, aucune close) jusqu'à la fin
 * (départ + nb × temps), puis « fin » (tout est clos d'un coup).
 */
function horlogeGlobale(s: ClockSession, maintenant: number, nb: number): Horloge {
  const fin = finPartie(s);
  if (s.terminee || maintenant >= fin) return { phase: "fin", index: nb, nbFermees: nb, nbVisibles: nb, restantMs: 0, avantProchainMs: null };
  const e = maintenant - s.startedAt;
  if (e < 0) {
    return { phase: "decompte", index: -1, nbFermees: 0, nbVisibles: e + SALLE_APERCU_S * 1000 >= 0 ? nb : 0, restantMs: 0, avantProchainMs: -e };
  }
  return { phase: "question", index: 0, nbFermees: 0, nbVisibles: nb, restantMs: fin - maintenant, avantProchainMs: fin - maintenant };
}

/** L'état de la partie à l'heure `maintenant` (ms, heure du serveur). Miroir de _salle_horloge (et de _salle_horloge_partie en chrono global). */
export function horlogeSession(s: ClockSession, maintenant: number): Horloge {
  const nb = Math.max(0, Math.floor(s.nb));
  if (s.global) return horlogeGlobale(s, maintenant, nb);
  if (s.terminee) return { phase: "fin", index: nb, nbFermees: nb, nbVisibles: nb, restantMs: 0, avantProchainMs: null };
  const cycle = msCycle(s);
  const e = maintenant - s.startedAt;
  if (e >= nb * cycle) return { phase: "fin", index: nb, nbFermees: nb, nbVisibles: nb, restantMs: 0, avantProchainMs: null };

  const margeMs = SALLE_MARGE_S * 1000;
  const apercuMs = SALLE_APERCU_S * 1000;
  const tempsMs = s.temps * 1000;
  const nbFermees = e >= tempsMs + margeMs ? Math.min(nb, Math.floor((e - tempsMs - margeMs) / cycle) + 1) : 0;
  const nbVisibles = e + apercuMs >= 0 ? Math.min(nb, Math.floor((e + apercuMs) / cycle) + 1) : 0;

  if (e < 0) {
    return { phase: "decompte", index: -1, nbFermees, nbVisibles, restantMs: 0, avantProchainMs: -e };
  }
  const index = Math.floor(e / cycle);
  const dans = e - index * cycle;
  if (dans < tempsMs) {
    return { phase: "question", index, nbFermees, nbVisibles, restantMs: tempsMs - dans, avantProchainMs: tempsMs - dans };
  }
  // la correction : jusqu'à l'ouverture de la question suivante (ou la fin)
  return { phase: "revelation", index, nbFermees, nbVisibles, restantMs: 0, avantProchainMs: cycle - dans };
}

/**
 * Dans combien de ms relire l'état ? Le rythme de base (2,5 s), raccourci pour
 * tomber juste sur un instant qui change ce qu'on doit afficher : un énoncé qui
 * se révèle (2 s avant l'ouverture), l'ouverture, la fin du temps, la
 * correction publique (fin du temps + 2 s), la fin de la partie. Jamais moins
 * de 300 ms.
 */
export function delaiAvantLecture(s: ClockSession, maintenant: number, baseMs: number = SALLE_LECTURE_MS): number {
  if (s.terminee || maintenant >= finPartie(s)) return baseMs;
  let plusProche = Infinity;
  const considerer = (t: number) => {
    const d = t - maintenant;
    if (d > 0 && d < plusProche) plusProche = d;
  };
  considerer(s.startedAt);
  // chrono global : les énoncés (2 s avant le départ), le départ, la fin ; le
  // rythme de base suffit pour l'avancement des autres joueurs
  if (s.global) considerer(s.startedAt - SALLE_APERCU_S * 1000);
  for (let i = 0; i < (s.global ? 0 : s.nb); i++) {
    considerer(ouvertureQuestion(s, i) - SALLE_APERCU_S * 1000);
    considerer(ouvertureQuestion(s, i));
    considerer(finTempsQuestion(s, i));
    considerer(revelationQuestion(s, i));
  }
  considerer(finPartie(s));
  // un peu après l'instant visé, pour que le serveur l'ait dépassé
  return Math.max(300, Math.min(baseMs, plusProche + 120));
}

/**
 * Décalage entre l'horloge du serveur et celle du navigateur, en ms (à ajouter
 * à Date.now() pour avoir l'heure du serveur). `envoyeMs` et `recuMs` : l'heure
 * du navigateur quand la requête est partie et quand la réponse est arrivée ;
 * l'heure du serveur est prise à mi-trajet. 0 si l'heure du serveur est illisible.
 */
export function decalageHorloge(serverNowIso: string, envoyeMs: number, recuMs: number): number {
  const serveur = Date.parse(serverNowIso);
  if (!Number.isFinite(serveur) || !Number.isFinite(envoyeMs) || !Number.isFinite(recuMs)) return 0;
  return Math.round(serveur - (envoyeMs + recuMs) / 2);
}

/** L'heure du serveur maintenant, d'après le décalage mesuré. */
export const heureServeur = (decalageMs: number, maintenantClient: number = Date.now()) => maintenantClient + decalageMs;

/** Lit une partie telle que le serveur la décrit (dates ISO, durées en secondes, chrono par question ou global). */
export function clockDe(session: { startedAt: string; temps: number; pause: number; nb: number; statut?: string; chrono?: SalleChrono }): ClockSession {
  return {
    startedAt: Date.parse(session.startedAt),
    temps: session.temps,
    pause: session.pause,
    nb: session.nb,
    terminee: session.statut === "terminee",
    global: session.chrono === "global",
  };
}

// ---------------------------------------------------------------------------
// Score

/**
 * Points d'une bonne réponse : 1000 × (0,5 + 0,5 × temps restant / temps),
 * arrondi au demi supérieur (de 500 à la dernière seconde à 1000 à la
 * première). `temps` en secondes, `restantMs` : ce qui restait quand on a
 * répondu (borné entre 0 et le temps). Une mauvaise réponse, ou pas de
 * réponse, vaut 0 : ne pas appeler cette fonction. Calcul en entiers (pas
 * d'erreur d'arrondi flottant), identique à repondre_salle.
 */
export function pointsReponse(temps: number, restantMs: number): number {
  const T = Math.round(temps * 1000);
  if (!(T > 0)) return 0;
  const R = Math.min(T, Math.max(0, Math.floor(Number.isFinite(restantMs) ? restantMs : 0)));
  return Math.floor((SALLE_POINTS_MAX * (T + R) + T) / (2 * T));
}

/** Les points qu'une réponse donnée à l'instant `maintenant` (heure du serveur) rapporterait, si elle est juste (chrono global : toujours 1 000). */
export function pointsAu(s: ClockSession, position: number, maintenant: number): number {
  if (s.global) return SALLE_POINTS_GLOBAL;
  return pointsReponse(s.temps, finTempsQuestion(s, position) - maintenant);
}

// ---------------------------------------------------------------------------
// Classement

export type LigneScore = { userId: string; points: number; bonnes: number; tempsMs: number; username?: string | null };

/**
 * Classe des joueurs comme le serveur : points, puis bonnes réponses, puis
 * temps cumulé sur les bonnes réponses (le plus court d'abord) ; égalité
 * parfaite : même rang (1, 2, 2, 4…), puis ordre alphabétique pour l'affichage.
 */
export function classer<T extends LigneScore>(lignes: T[]): (T & { rang: number })[] {
  const tri = [...lignes].sort(
    (a, b) =>
      b.points - a.points ||
      b.bonnes - a.bonnes ||
      a.tempsMs - b.tempsMs ||
      String(a.username ?? "").localeCompare(String(b.username ?? ""), "fr") ||
      a.userId.localeCompare(b.userId),
  );
  const egal = (a: T, b: T) => a.points === b.points && a.bonnes === b.bonnes && a.tempsMs === b.tempsMs;
  const out: (T & { rang: number })[] = [];
  tri.forEach((l, i) => {
    const rang = i > 0 && egal(tri[i - 1], l) ? out[i - 1].rang : i + 1;
    out.push({ ...l, rang });
  });
  return out;
}

// ---------------------------------------------------------------------------
// Réglages : valeurs par défaut, validation, répartition

export function paramsParDefaut(): SalleParams {
  return {
    type: "questions",
    nombre: 10,
    source: "banque",
    topics: [...SALLE_TOPIC_KEYS],
    difficulte: "melange",
    temps: SALLE_TEMPS_DEFAUT,
    partCalculs: 0,
    chrono: "question",
  };
}

export type ParamsErreur = { champ: keyof SalleParams; message: string };

/** Un entier lu dans un nombre ou une chaîne de chiffres ; null sinon (12,5 et « abc » ne passent pas). */
function entier(v: unknown): number | null {
  if (typeof v === "number") return Number.isInteger(v) ? v : null;
  if (typeof v === "string" && /^[0-9]{1,4}$/.test(v.trim())) return Number(v.trim());
  return null;
}

/**
 * Valide et normalise des réglages (venant d'un formulaire, d'une adresse…).
 * Mêmes règles que _salle_params en SQL : type, nombre de 5 à 50, source
 * (banque par défaut, ignorée pour les calculs), au moins une matière connue
 * (sans doublon, dans l'ordre du programme), difficulté (mélangée par défaut),
 * temps de 15 à 120 s (45 par défaut), part des calculs de 10 à 90 % pour un
 * mélange (0 pour des questions seules, 100 pour des calculs seuls), chrono
 * par question (défaut) ou global.
 */
export function validerParams(brut: unknown): { ok: true; params: SalleParams } | { ok: false; erreurs: ParamsErreur[] } {
  const erreurs: ParamsErreur[] = [];
  const r = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;

  const type = SALLE_TYPES.includes(r.type as SalleType) ? (r.type as SalleType) : null;
  if (!type) erreurs.push({ champ: "type", message: "Choisis le type de partie : questions, calculs ou les deux mêlés." });

  const surMock = r.source === "examen";
  const nombre = entier(r.nombre);
  if (nombre === null) erreurs.push({ champ: "nombre", message: "Indique le nombre de questions (de 5 à 50)." });
  else if (surMock) {
    if (nombre < 1 || nombre > SALLE_NOMBRE_MAX_MOCK) erreurs.push({ champ: "nombre", message: "Le nombre de questions va de 5 à 600 pour un mock." });
  } else if (nombre < SALLE_NOMBRE_MIN || nombre > SALLE_NOMBRE_MAX) erreurs.push({ champ: "nombre", message: "Le nombre de questions va de 5 à 50." });

  let temps = SALLE_TEMPS_DEFAUT;
  if (r.temps !== undefined && r.temps !== null && r.temps !== "") {
    const t = entier(r.temps);
    if (t === null || t < SALLE_TEMPS_MIN || t > SALLE_TEMPS_MAX) erreurs.push({ champ: "temps", message: "Le temps par question va de 15 à 120 secondes." });
    else temps = t;
  }

  let source: SalleSource = "banque";
  if (r.source !== undefined && r.source !== null && r.source !== "") {
    if (SALLE_SOURCES.includes(r.source as SalleSource)) source = r.source as SalleSource;
    else erreurs.push({ champ: "source", message: "La source des questions est la banque complète ou les mocks." });
  }

  let chrono: SalleChrono = "question";
  if (r.chrono !== undefined && r.chrono !== null && r.chrono !== "") {
    if (SALLE_CHRONOS.includes(r.chrono as SalleChrono)) chrono = r.chrono as SalleChrono;
    else erreurs.push({ champ: "chrono", message: "Le chrono est par question ou global." });
  }

  let difficulte: SalleDifficulte = "melange";
  if (r.difficulte !== undefined && r.difficulte !== null && r.difficulte !== "") {
    if (SALLE_DIFFICULTES.includes(r.difficulte as SalleDifficulte)) difficulte = r.difficulte as SalleDifficulte;
    else erreurs.push({ champ: "difficulte", message: "La difficulté est facile, moyen, difficile ou mélangée." });
  }

  const demandes = Array.isArray(r.topics) ? new Set(r.topics.map((t) => String(t))) : new Set<string>();
  const topics = SALLE_TOPIC_KEYS.filter((k) => demandes.has(k));
  if (!topics.length) erreurs.push({ champ: "topics", message: "Choisis au moins une matière." });

  let partCalculs = type === "calculs" ? 100 : 0;
  if (type === "mixte") {
    const p = r.partCalculs === undefined || r.partCalculs === null || r.partCalculs === "" ? SALLE_PART_CALCULS_DEFAUT : entier(r.partCalculs);
    if (p === null || p < SALLE_PART_CALCULS_MIN || p > SALLE_PART_CALCULS_MAX) {
      erreurs.push({ champ: "partCalculs", message: "La part de calculs va de 10 à 90 %." });
    } else partCalculs = p;
  }

  // un mock officiel : des questions seulement, sessions choisies (lues à plat
  // depuis le JSON du serveur, ou dans `mock` depuis le formulaire)
  let mock: SalleMock | undefined;
  if (source === "examen") {
    const m = (r.mock && typeof r.mock === "object" ? r.mock : r) as Record<string, unknown>;
    const examens = Array.isArray(m.examens) ? [...new Set(m.examens.map((e) => String(e)).filter((e) => MOCK_EXAMEN_RE.test(e)))].sort() : [];
    if (!examens.length) erreurs.push({ champ: "mock", message: "Choisis au moins une session de mock." });
    const version = m.version === undefined || m.version === null || m.version === "" ? "base" : m.version;
    if (!SALLE_MOCK_VERSIONS.includes(version as SalleMockVersion)) erreurs.push({ champ: "mock", message: "Choisis les questions d'origine, les variantes ou les deux." });
    const ordre = m.ordre === undefined || m.ordre === null || m.ordre === "" ? "examen" : m.ordre;
    if (!SALLE_MOCK_ORDRES.includes(ordre as SalleMockOrdre)) erreurs.push({ champ: "mock", message: "L'ordre est celui de l'examen ou mélangé." });
    const complet = m.complet === undefined || m.complet === null ? true : m.complet === true || m.complet === "true";
    if (!complet && nombre !== null && nombre < SALLE_NOMBRE_MIN) erreurs.push({ champ: "nombre", message: "Le nombre de questions va de 5 à 600 pour un mock." });
    mock = { examens, version: version as SalleMockVersion, complet, ordre: ordre as SalleMockOrdre };
  }

  let rounds = 1;
  if (r.rounds !== undefined && r.rounds !== null && r.rounds !== "") {
    const n = entier(r.rounds);
    if (n === null || n < 1 || n > SALLE_ROUNDS_MAX) erreurs.push({ champ: "rounds", message: "Le nombre de rounds va de 1 à 10." });
    else rounds = n;
  }

  // le choix par notion et les rounds traversent tels quels : c'est par ici que part le lancement
  const textes = (x: unknown) => (Array.isArray(x) ? x.filter((e): e is string => typeof e === "string") : []);
  const notions = textes(r.notions);
  const concepts = textes(r.concepts);
  const options: Pick<SalleParams, "notions" | "concepts" | "rounds"> = {
    ...(notions.length + concepts.length > 0 ? { notions, concepts } : {}),
    ...(rounds > 1 ? { rounds } : {}),
  };

  if (erreurs.length || !type || nombre === null) return { ok: false, erreurs };
  if (mock) {
    return { ok: true, params: { type: "questions", nombre, source: "examen", topics, difficulte: "melange", temps, partCalculs: 0, mock, chrono, ...options } };
  }
  return {
    ok: true,
    params: { type, nombre, source: type === "calculs" ? "banque" : source, topics, difficulte, temps, partCalculs, chrono, ...options },
  };
}

/** « Mock A — Session 1 » → « Mock A · S1 ». */
export function examenCourt(examen: string): string {
  const m = examen.match(/^(Mock [A-Z]|Variantes(?: inverses)? [0-9]) — Session ([0-9])$/);
  return m ? `${m[1]} · S${m[2]}` : examen;
}

/** Combien de questions offre une sélection de mocks, dans les matières cochées ; null : pas encore lu. */
export function disponiblesMock(dispos: MockDisponible[] | null | undefined, mock: SalleMock, topics: TopicKey[]): number | null {
  if (!dispos) return null;
  return dispos
    .filter((d) => mock.examens.includes(d.examen) && topics.includes(d.topic))
    .reduce((t, d) => t + (mock.version === "base" ? d.base : mock.version === "variantes" ? d.variantes : d.base + d.variantes), 0);
}

/** Ce qu'offre une session de mock, toutes matières confondues. */
export type SessionMock = { examen: string; base: number; variantes: number };

/** Les sessions de mock proposées, dans l'ordre : leurs questions d'origine et leurs variantes. */
export function sessionsMock(dispos: MockDisponible[] | null | undefined): SessionMock[] {
  const parExamen = new Map<string, SessionMock>();
  for (const d of dispos ?? []) {
    const s = parExamen.get(d.examen) ?? { examen: d.examen, base: 0, variantes: 0 };
    s.base += d.base;
    s.variantes += d.variantes;
    parExamen.set(d.examen, s);
  }
  return [...parExamen.values()].sort((a, b) => a.examen.localeCompare(b.examen));
}

/** Une session se joue-t-elle dans cette version ? Les variantes (seules ou avec l'origine) n'existent que sur certaines sessions. */
export const sessionJouable = (s: SessionMock, version: SalleMockVersion) => (version === "base" ? s.base > 0 : s.variantes > 0);

/** Ce qu'une session offre dans une version. */
export const questionsSession = (s: SessionMock, version: SalleMockVersion) => (version === "base" ? s.base : version === "variantes" ? s.variantes : s.base + s.variantes);

/**
 * Ramène une sélection de mocks à ce qui existe : la version « variantes » ou
 * « les deux » retombe sur l'origine si aucune session n'a de variante, et les
 * sessions qui ne se jouent pas dans la version sortent de la sélection. Si
 * rien n'en reste, la première session jouable la remplace ; une sélection
 * vidée à la main reste vide. Sans la liste des mocks (null : pas encore lue),
 * la sélection ne change pas.
 */
export function ajusterMock(mock: SalleMock, dispos: MockDisponible[] | null | undefined): SalleMock {
  if (!dispos) return mock;
  const sessions = sessionsMock(dispos);
  const version = mock.version !== "base" && !sessions.some((s) => s.variantes > 0) ? "base" : mock.version;
  const jouables = sessions.filter((s) => sessionJouable(s, version)).map((s) => s.examen);
  const examens = mock.examens.filter((e) => jouables.includes(e));
  return { ...mock, version, examens: examens.length || !mock.examens.length ? examens : jouables.slice(0, 1) };
}

/**
 * Combien de questions et de calculs demander. Un mélange donne au moins un de
 * chaque ; la part est arrondie au demi supérieur (entiers, comme en SQL).
 */
export function repartirNombre(p: Pick<SalleParams, "type" | "nombre" | "partCalculs">): { questions: number; calculs: number } {
  if (p.type === "questions") return { questions: p.nombre, calculs: 0 };
  if (p.type === "calculs") return { questions: 0, calculs: p.nombre };
  const voulus = Math.floor((p.nombre * p.partCalculs + 50) / 100);
  const calculs = Math.min(p.nombre - 1, Math.max(1, voulus));
  return { questions: p.nombre - calculs, calculs };
}

/** Le chrono d'une partie en chrono global, en secondes : nombre × temps moyen par question. */
export const chronoGlobalS = (p: Pick<SalleParams, "nombre" | "temps">) => p.nombre * p.temps;

/**
 * Durée d'une partie en secondes, du décompte à la dernière correction (sans
 * la pause finale) ; chrono global : décompte + nombre × temps.
 */
export function dureeEstimee(p: Pick<SalleParams, "nombre" | "temps" | "chrono">, pause: number = SALLE_PAUSE_S): number {
  if (p.chrono === "global") return SALLE_DECOMPTE_S + chronoGlobalS(p);
  return SALLE_DECOMPTE_S + p.nombre * (p.temps + pause) - pause;
}

/** « 12 min 30 s », « 45 s », « 1 h 05 ». */
export function libelleDuree(secondes: number): string {
  const s = Math.max(0, Math.round(secondes));
  if (s < 60) return `${s} s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")}`;
  return r ? `${m} min ${r} s` : `${m} min`;
}

/**
 * Une ligne qui résume les réglages : « 20 questions · mocks · 3 matières ·
 * difficile · 45 s » ; en chrono global, le temps devient « chrono global
 * 15 min » (nombre × temps).
 */
export function libelleParams(p: Pick<SalleParams, "type" | "nombre" | "source" | "topics" | "difficulte" | "temps" | "mock" | "chrono" | "rounds" | "notions" | "concepts">): string {
  const nbNotions = (p.notions?.length ?? 0) + (p.concepts?.length ?? 0);
  const notions = nbNotions > 0 ? [`${nbNotions} notion${nbNotions > 1 ? "s" : ""}`] : [];
  const temps = p.chrono === "global" ? `chrono global ${libelleDuree(chronoGlobalS(p))}` : `${p.temps} s`;
  const quoi = p.type === "calculs" ? "calculs" : p.type === "mixte" ? "questions et calculs" : "questions";
  const matieres = p.topics.length === SALLE_TOPIC_KEYS.length ? "toutes les matières" : `${p.topics.length} matière${p.topics.length > 1 ? "s" : ""}`;
  if (p.source === "examen" && p.mock) {
    const version = p.mock.version === "base" ? "questions d'origine" : p.mock.version === "variantes" ? "variantes" : "origine + variantes";
    return [
      `${p.nombre} questions${p.mock.complet ? " (tout)" : ""}`,
      p.mock.examens.map(examenCourt).join(", ") || "aucune session",
      version,
      p.mock.ordre === "examen" ? "ordre de l'examen" : "mélangées",
      ...notions,
      temps,
      ...(p.rounds ? [`${p.rounds} rounds`] : []),
    ].join(" · ");
  }
  const parts = [`${p.nombre} ${quoi}`];
  if (p.type !== "calculs") parts.push(p.source === "mocks" ? "mocks" : "banque complète");
  parts.push(matieres, ...notions, p.difficulte === "melange" ? "difficulté mélangée" : p.difficulte, temps);
  if (p.rounds) parts.push(`${p.rounds} rounds`);
  return parts.join(" · ");
}

// ---------------------------------------------------------------------------
// Passage du JSON du serveur (snake_case) aux réglages, et retour

/** Les réglages au format attendu par lancer_session. */
export function paramsVersJson(p: SalleParams): Record<string, unknown> {
  const json: Record<string, unknown> = {
    type: p.type,
    nombre: p.nombre,
    source: p.source,
    topics: p.topics,
    difficulte: p.difficulte,
    temps: p.temps,
    part_calculs: p.partCalculs,
    chrono: p.chrono ?? "question",
  };
  if (p.source === "examen" && p.mock) {
    json.examens = p.mock.examens;
    json.version = p.mock.version;
    json.complet = p.mock.complet;
    json.ordre = p.mock.ordre;
  }
  if (p.notions?.length || p.concepts?.length) {
    json.notions = p.notions ?? [];
    json.concepts = p.concepts ?? [];
  }
  if (p.rounds && p.rounds > 1) json.rounds = p.rounds;
  return json;
}

/** Les réglages gardés par le serveur (salle_sessions.params, chrono compris), avec les nombres effectivement tirés. */
export function paramsDepuisJson(raw: unknown): SalleParamsStockes {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const v = validerParams({ ...r, partCalculs: r.part_calculs ?? r.partCalculs });
  const base = v.ok ? v.params : paramsParDefaut();
  const n = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : Number(x) || 0);
  const rep = repartirNombre(base);
  // une partie d'avant le réglage (sans clé « chrono ») se jouait par question :
  // chrono laissé absent (absent = par question), pour que les réglages de la
  // partie suivante puissent proposer le chrono global (reglagesDeDepart)
  const lus: SalleParams = { ...base };
  if (r.chrono === undefined || r.chrono === null || r.chrono === "") delete lus.chrono;
  return {
    ...lus,
    nbQuestions: r.nb_questions === undefined ? rep.questions : n(r.nb_questions),
    nbCalculs: r.nb_calculs === undefined ? rep.calculs : n(r.nb_calculs),
    ...(r.round === undefined || r.round === null ? {} : { round: n(r.round) }),
  };
}

// ---------------------------------------------------------------------------
// Lecture incrémentale de l'état : ne redemander que ce qui est nouveau

/**
 * Le paramètre `p_depuis` à passer à etat_salle : le nombre de corrections déjà
 * reçues pour la partie affichée (les énoncés, eux, sont renvoyés à partir de
 * là, ce qui couvre la question en cours et la suivante). 0 sans état.
 *
 * Chrono global : aucune correction n'arrive avant la fin, et etat_salle
 * renverrait alors tous les énoncés à chaque lecture (lourd pour un mock de 90
 * à 180 questions). Tant que la partie court et que tous les énoncés sont là,
 * on demande à partir de `nb` : rien de nouveau, seulement la session,
 * l'avancement et mes réponses. Dès que la partie est finie (phase « fin »),
 * on repart de la première correction manquante : les nb corrections arrivent
 * d'un coup.
 */
export function prochainDepuis(prev: EtatSalle | null): number {
  const s = prev?.session;
  if (!prev || !s) return 0;
  const nb = Math.max(0, Math.floor(s.nb));
  if (s.chrono === "global" && s.phase !== "fin" && s.statut !== "terminee" && prev.corrections.length === 0 && nb > 0 && prev.items.length >= nb) return nb;
  return prev.corrections.length;
}

function parPosition<T extends { position: number }>(a: T[], b: T[]): T[] {
  const m = new Map<number, T>();
  for (const x of a) m.set(x.position, x);
  for (const x of b) m.set(x.position, x);
  return [...m.values()].sort((x, y) => x.position - y.position);
}

/**
 * Ajoute à l'état précédent ce qu'une lecture incrémentale apporte (énoncés et
 * corrections par position). Une autre partie, ou pas d'état précédent : le
 * nouvel état tel quel (il doit alors avoir été lu depuis 0).
 */
export function fusionnerEtat(prev: EtatSalle | null, next: EtatSalle): EtatSalle {
  if (!prev?.session || !next.session || prev.session.id !== next.session.id) return next;
  return { ...next, items: parPosition(prev.items, next.items), corrections: parPosition(prev.corrections, next.corrections) };
}
