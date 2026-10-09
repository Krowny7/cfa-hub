// Voix « Le Trait », morceau Profil : l'en-tête, les onglets, les Sceaux et
// le Face-à-face du profil d'un joueur. Même esprit que lib/voice.ts : un
// mot par chose, toujours le chiffre, pas d'emphase. Module neutre (ni
// « use client » ni serveur).

import { NBSP, nombre, pct, pluriel, signe } from "@/lib/voice";
import { subjectByKey } from "@/components/reviser/catalog";
import { MAITRISE_MIN_QUESTIONS, type DefSceau, type EtatSceau, type Famille, type Unite } from "@/lib/profil/sceaux";

// ---------------------------------------------------------------------------
// L'en-tête

export const ENTETE = {
  /** « pic Platine » : le meilleur palier atteint */
  pic: (palier: string) => `pic ${palier}`,
  /** le bouton du téléphone (« Défier Theo » sur un écran plus large) */
  defier: "Défier",
  /** « 1 312 ELO · 14e » */
  eloPlace: (elo: number, place: string | null) => `${nombre(elo)}${NBSP}ELO${place ? ` · ${place}` : ""}`,
  plus: "plus",
  moins: "moins",
  posesAide: "Ses 3 plus hauts sceaux, posés d'office",
  posesAideMoi: "Tes 3 plus hauts sceaux, posés d'office",
} as const;

// ---------------------------------------------------------------------------
// Les onglets

export const ONGLETS = {
  nav: "Sections du profil",
  profil: "Profil",
  sceaux: "Sceaux",
  journal: "Journal",
  faceAFace: "Face-à-face",
} as const;

/** La case vide de la page par défaut (sur son profil seulement). */
export const CASE_VIDE = {
  titre: "Ajoute une image",
  texte: "Une image, un GIF ou ta vidéo : cette case est à toi.",
} as const;

// ---------------------------------------------------------------------------
// Les Sceaux

/** le nom de chaque palier (0 : pas encore gagné) */
export const PALIERS = ["gaufré", "encre", "vermillon", "dorure"] as const;

export const FAMILLES_NOMS: Record<Famille, string> = {
  regularite: "Régularité",
  duels: "Duels",
  calculs: "Calculs",
  examens: "Examens",
  matieres: "Matières",
};

const NOMS: Record<string, string> = {
  assiduite: "Assiduité",
  "copie-pleine": "Copie pleine",
  "defi-tenu": "Défi tenu",
  duelliste: "Duelliste",
  calculateur: "Calculateur",
  "examen-blanc": "Examen blanc",
};

/** « Duelliste », « FSA » */
export const nomSceau = (d: DefSceau) => (d.matiere ? (subjectByKey(d.matiere)?.short ?? d.matiere) : (NOMS[d.cle] ?? d.cle));

const SOUS: Record<Unite, (n: number) => string> = {
  jours: (n) => (n > 1 ? "JOURS" : "JOUR"),
  questions: () => "QUESTIONS",
  defis: (n) => (n > 1 ? "DÉFIS" : "DÉFI"),
  victoires: (n) => (n > 1 ? "VICTOIRES" : "VICTOIRE"),
  calculs: (n) => (n > 1 ? "JUSTES" : "JUSTE"),
  examens: (n) => (n > 1 ? "EXAMENS" : "EXAMEN"),
  maitrise: () => "MAÎTRISE",
};

// Le nom gravé dans la pointe de l'hexagone : 9 lettres au plus, sinon il
// devient illisible. Les noms plus longs ont leur forme courte ; une matière
// au nom long, son code (« FI », « DER »).
const GRAVURES: Record<string, string> = { "copie-pleine": "COPIE", "defi-tenu": "DÉFI", calculateur: "CALCUL", "examen-blanc": "EXAMEN" };
const GRAVURE_MAX = 9;
function gravure(d: DefSceau): string {
  if (d.matiere) {
    const m = subjectByKey(d.matiere);
    const court = m?.short ?? d.matiere;
    return (court.length <= GRAVURE_MAX ? court : (m?.code ?? court)).toUpperCase();
  }
  return GRAVURES[d.cle] ?? nomSceau(d).toUpperCase();
}

/** Ce qui est gravé sur le sceau : le nom en haut, le chiffre au centre, l'unité en bas. */
export function inscription(d: DefSceau, seuil: number): { sur: string; texte: string; sous: string } {
  return { sur: gravure(d), texte: d.unite === "maitrise" ? pct(seuil) : nombre(seuil), sous: SOUS[d.unite](seuil) };
}

/** La condition d'un palier, en clair : « 25 victoires en duel ». */
export function condition(d: DefSceau, seuil: number): string {
  switch (d.unite) {
    case "jours":
      return `série record de ${pluriel(seuil, "jour", "jours")}`;
    case "questions":
      return pluriel(seuil, "question posée", "questions posées");
    case "defis":
      return pluriel(seuil, "défi du jour rendu", "défis du jour rendus");
    case "victoires":
      return `${pluriel(seuil, "victoire", "victoires")} en duel`;
    case "calculs":
      return pluriel(seuil, "calcul juste", "calculs justes");
    case "examens":
      return pluriel(seuil, "examen blanc rendu", "examens blancs rendus");
    case "maitrise":
      return `maîtrise de ${pct(seuil)} en ${nomSceau(d)}`;
  }
}

/** Ce que le sceau atteste, sans seuil (la fiche d'un sceau pas encore gagné : les seuils sont dans ses paliers). */
export function atteste(d: DefSceau): string {
  switch (d.unite) {
    case "jours":
      return "la série record de jours";
    case "questions":
      return "les questions posées";
    case "defis":
      return "les défis du jour rendus";
    case "victoires":
      return "les victoires en duel";
    case "calculs":
      return "les calculs justes";
    case "examens":
      return "les examens blancs rendus";
    case "maitrise":
      return `la maîtrise en ${nomSceau(d)}`;
  }
}

/** L'avancée vers le palier suivant : « 21/25 », « 84/90 % », « 28/40 questions » ; null en dorure. */
export function progres(e: EtatSceau): string | null {
  if (e.prochain === null) return null;
  if (e.def.unite === "maitrise" && (e.questions ?? 0) < MAITRISE_MIN_QUESTIONS) return `${nombre(e.questions ?? 0)}/${MAITRISE_MIN_QUESTIONS} questions`;
  if (e.def.unite === "maitrise") return `${e.valeur}/${e.prochain}${NBSP}%`;
  if (e.def.unite === "jours") return `${nombre(e.valeur)}/${nombre(e.prochain)}${NBSP}j`;
  return `${nombre(e.valeur)}/${nombre(e.prochain)}`;
}

/** « Duelliste · vermillon » ; un sceau pas encore gagné : le palier visé. */
export const titreSceau = (e: EtatSceau) => `${nomSceau(e.def)} · ${PALIERS[Math.max(1, e.palier)]}`;

export const SCEAUX_TXT = {
  titre: "Sceaux",
  aPortee: "À portée",
  aPorteeAide: "Les 3 paliers les plus proches. Toi seul les vois.",
  totalLong: (n: number, max: number) => `${pluriel(n, "sceau gagné", "sceaux gagnés")} sur ${nombre(max)}`,
  aGagner: "à gagner",
  tous: "Tous",
  vide: "Pas encore de sceau.",
  videMoi: "Pas encore de sceau. Le premier vient vite : 7 jours de suite, ou un duel gagné.",
  paliers: "Les trois paliers",
  atteint: "atteint",
  /** les sceaux de matière suivent la maîtrise du jour (pas encore gardés en base) */
  provisoire: "La maîtrise est celle du jour : si elle baisse, le palier baisse avec elle.",
  voir: (titre: string) => `Voir le sceau ${titre}`,
  fermer: "Fermer",
  /** les 40 questions qu'il faut pour mesurer une matière */
  mesure: `Une matière se mesure à partir de ${MAITRISE_MIN_QUESTIONS} questions.`,
} as const;

// ---------------------------------------------------------------------------
// Le Face-à-face

/** « 3 oct. » (jour de Paris : même rendu au serveur et dans le navigateur) */
export function dateCourte(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }).format(d);
}

export const FACE = {
  titre: "Face-à-face",
  toi: "Toi",
  /** « Toi 3–2 » (le bouton de l'en-tête) */
  court: (moi: number, lui: number) => `Toi ${nombre(moi)}–${nombre(lui)}`,
  /** lu à voix haute : « Toi 3, Theo 2 » */
  bilanDit: (moi: number, lui: number, nom: string, nuls: number) => `Face-à-face : toi ${nombre(moi)}, ${nom} ${nombre(lui)}${nuls ? `, ${pluriel(nuls, "nul", "nuls")}` : ""}`,
  nuls: (n: number) => pluriel(n, "nul", "nuls"),
  derniers: (n: number) => (n > 1 ? `${nombre(n)} derniers duels` : "Dernier duel"),
  dernier: "Dernier",
  issue: { victoire: "gagné", defaite: "perdu", nulle: "nul" } as const,
  /** « enjeu +18 / −14 » */
  enjeu: (gain: number, perte: number) => `enjeu ${signe(gain)} / ${signe(perte)}`,
  enjeuAide: "Ce que ton ELO gagne ou perd au prochain duel contre ce joueur.",
  revanche: "Revanche",
  reprendre: "Reprendre le duel",
  enCours: "Un duel est ouvert entre vous.",
  premier: "Premier duel ?",
  premierTexte: (nom: string) => `Toi et ${nom} ne vous êtes jamais affrontés.`,
  revoir: "Revoir",
  /** « Theo te devance : » (deux-points jamais seuls en début de ligne) */
  teDevance: (nom: string) => `${nom} te devance${NBSP}:`,
  tuDevances: (nom: string) => `Tu devances ${nom}${NBSP}:`,
  /** « FSA +14 », d'un seul tenant : l'écart ne part jamais seul à la ligne */
  ecart: (matiere: string, points: number) => `${matiere.replace(/ /g, NBSP)}${NBSP}${signe(points)}`,
  nullePart: "nulle part",
  rienEnCommun: "Aucune matière mesurée en commun pour l'instant.",
  /** le repli sous le radar superposé : les barres matière par matière */
  detail: "Le détail par matière",
  voir: "Face-à-face",
} as const;

// ---------------------------------------------------------------------------
// Le Journal : la courbe d'ELO, le carnet de jours, le fil. Des jours, jamais
// d'heures.

/** « 3 oct. » (ou « 13 oct. 2025 » avec l'année, « 1er déc. » le premier du mois) pour une clé de jour (AAAA-MM-JJ) : même rendu partout. */
export function jourCourt(jour: string, annee = false): string {
  const d = new Date(jour + "T12:00:00Z");
  if (Number.isNaN(d.getTime())) return "";
  const texte = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", ...(annee ? { year: "numeric" } : {}), timeZone: "UTC" }).format(d);
  return d.getUTCDate() === 1 ? texte.replace(/^1(?=\s)/, "1er") : texte;
}

export const JOURNAL = {
  titre: "Journal",
  // la courbe
  courbe: "ELO · 90 jours",
  /** « pic Or III · 1 263 » : le meilleur ELO atteint */
  pic: (rang: string, elo: number) => `pic ${rang} · ${nombre(elo)}`,
  /** lu à voix haute */
  courbeDit: (depart: number, fin: number, matchs: number) =>
    `ELO sur 90 jours : de ${nombre(depart)} à ${nombre(fin)}, ${pluriel(matchs, "match classé", "matchs classés")}`,
  source: { duel: "Duel", mock_exam: "Examen blanc classé", placement: "Placement" } as Record<string, string>,
  /** l'infobulle : « +18 → 1 263 » */
  variation: (delta: number, apres: number) => `${signe(delta)} → ${nombre(apres)}`,
  calme: "Aucun match classé sur 90 jours.",
  courbeVide: "Pas encore de match classé.",
  courbeVideTexte: "L'ELO bouge avec les duels et les examens blancs classés.",
  // le carnet
  carnet: "Carnet de jours",
  /** « série 12 jours · record 34 jours » */
  serie: (n: number) => `série ${pluriel(n, "jour", "jours")}`,
  record: (n: number) => `record ${pluriel(n, "jour", "jours")}`,
  /** « 41 jours d'encre sur 52 semaines » */
  actifs: (n: number, semaines: number) => `${pluriel(n, "jour d'encre", "jours d'encre")} sur ${nombre(semaines)} semaines`,
  /** l'infobulle d'une case : « 3 oct. · 42 traits » */
  case: (jour: string, n: number) => `${jourCourt(jour)} · ${pluriel(n, "trait", "traits")}`,
  legende: (objectif: number) => `Une case par jour. Encre pleine : ${pluriel(objectif, "trait", "traits")} ou plus.`,
  moins: "moins",
  plus: "plus",
  carnetVide: "Pas encore de jour d'encre.",
  // le fil
  fil: "Fil",
  /** « 4 entrées · 90 jours » */
  filCompte: (n: number) => `${pluriel(n, "entrée", "entrées")} · 90 jours`,
  victoireContre: "Victoire contre",
  /** l'adversaire lit le Journal du vainqueur */
  victoireContreToi: "Victoire contre toi",
  victoireSans: "Victoire en duel",
  /** « 23–19 » */
  score: (a: number, b: number) => `${nombre(a)}–${nombre(b)}`,
  palier: (palier: string) => `Monte en ${palier}`,
  palierTexte: "Nouveau palier, jamais atteint avant.",
  serieNotable: (n: number) => `${nombre(n)} jours d'encre de suite`,
  serieTexte: (n: number) => (n >= 100 ? "Cent jours sans trou." : n >= 30 ? "Un mois d'encre." : "Une semaine d'encre."),
  autres: (n: number) => `Voir ${pluriel(n, "autre entrée", "autres entrées")}`,
  filVide: "Rien de notable sur 90 jours.",
  filVideMoi: "Une victoire en duel, un nouveau palier ou 7 jours de suite s'inscrivent ici.",
  /** la date d'une entrée, dans le navigateur : « aujourd'hui », « hier », « il y a 3 j » ; null au-delà d'une semaine */
  ilYa: (jours: number): string | null => (jours <= 0 ? "aujourd'hui" : jours === 1 ? "hier" : jours < 7 ? `il y a ${nombre(jours)}${NBSP}j` : null),
} as const;
