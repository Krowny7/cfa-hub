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
  posesAide: "Ses 3 sceaux les plus rares, posés d'office",
  posesAideMoi: "Tes 3 sceaux les plus rares, posés d'office",
  posesChoisis: "Les sceaux qu'il a posés",
  posesChoisisMoi: "Les sceaux que tu as posés",
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
  mentions: "Mentions",
  ratures: "Ratures",
  matieres: "Matières",
};

const NOMS: Record<string, string> = {
  assiduite: "Assiduité",
  "copie-pleine": "Copie pleine",
  "defi-tenu": "Défi tenu",
  duelliste: "Duelliste",
  calculateur: "Calculateur",
  "examen-blanc": "Examen blanc",
  "coup-d-eclat": "Coup d'éclat",
  remontada: "Remontada",
  "sans-faute": "Sans faute",
  eclair: "Éclair",
  "sang-froid": "Sang-froid",
  "mise-au-propre": "Mise au propre",
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
  mentions: (n) => (n > 1 ? "DUELS" : "DUEL"),
  ecart: (n) => (n >= 3 ? "BATTU" : n > 1 ? "PALIERS" : "PALIER"),
  rayees: (n) => (n > 1 ? "RAYÉES" : "RAYÉE"),
};

// Le nom gravé dans la pointe de l'hexagone : 9 lettres au plus, sinon il
// devient illisible. Les noms plus longs ont leur forme courte ; une matière
// au nom long, son code (« FI », « DER »).
const GRAVURES: Record<string, string> = {
  "copie-pleine": "COPIE",
  "defi-tenu": "DÉFI",
  calculateur: "CALCUL",
  "examen-blanc": "EXAMEN",
  "coup-d-eclat": "COUP",
  "mise-au-propre": "PROPRE",
};
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
  // Coup d'éclat : l'écart battu (« +2 »), ou le Top 10 au dernier palier
  const texte = d.unite === "maitrise" ? pct(seuil) : d.unite === "ecart" ? (seuil >= 3 ? "T10" : `+${seuil}`) : nombre(seuil);
  return { sur: gravure(d), texte, sous: SOUS[d.unite](seuil) };
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
    case "mentions":
      return `${pluriel(seuil, "duel", "duels")} avec la mention ${nomSceau(d)}`;
    case "ecart":
      return seuil >= 3 ? "battre en duel un joueur du Top 10" : seuil > 1 ? "battre en duel un joueur de deux paliers au-dessus" : "battre en duel un joueur d'un palier au-dessus";
    case "rayees":
      return pluriel(seuil, "rature mise au propre", "ratures mises au propre");
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
    case "mentions":
      return `la mention ${nomSceau(d)} en duel`;
    case "ecart":
      return "les victoires en duel contre plus haut classé";
    case "rayees":
      return "les ratures mises au propre (reprises justes)";
  }
}

/** L'avancée vers le palier suivant : « 21/25 », « 84/90 % », « 28/40 questions » ; null en dorure, pour Coup d'éclat (il se gagne d'un coup) ou sans mesure. */
export function progres(e: EtatSceau): string | null {
  if (e.prochain === null || e.def.unite === "ecart" || e.inconnu) return null;
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
  /** avec la base : un palier gagné se garde */
  garde: "Un palier gagné se garde, même si la maîtrise baisse ensuite.",
  /** « obtenu le 3 oct. », ou « avant le 9 oct. » pour ce qui a été repris après coup */
  obtenu: (date: string, avant: boolean) => (avant ? `obtenu avant le ${date}` : `obtenu le ${date}`),
  /** la date dans la liste des paliers */
  le: (date: string, avant: boolean) => (avant ? `avant le ${date}` : date),
  /** « 12 % des joueurs » (joueurs actifs sur 90 jours) */
  rarete: (part: number) => (part > 0 && part < 0.01 ? `moins de ${pct(1)} des joueurs` : `${pct(part * 100)} des joueurs`),
  rareteAide: "Part des joueurs actifs sur 90 jours qui ont ce palier.",
  // poser sur son profil
  poser: "Poser sur mon profil",
  retirer: "Retirer de mon profil",
  pose: "Posé sur ton profil",
  remplacer: "Les 3 places sont prises. Poser à la place de :",
  poserAide: "3 sceaux au plus, dans l'en-tête de ton profil. Sans choix, les plus rares.",
  poserErreur: "Impossible pour l'instant. Réessaie dans un instant.",
} as const;

// ---------------------------------------------------------------------------
// La cérémonie d'obtention (fin de session, de duel, de défi)

export const CEREMONIE = {
  titre: "Sceau gagné",
  /** « Duelliste · vermillon » ; « et 2 autres » */
  autres: (n: number) => `et ${pluriel(n, "autre", "autres")}`,
  voir: "Voir ma collection",
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

/** « 3 oct. » (ou « 13 oct. 2025 » avec l'année) pour une clé de jour (AAAA-MM-JJ) : même rendu partout. */
export function jourCourt(jour: string, annee = false): string {
  const d = new Date(jour + "T12:00:00Z");
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", ...(annee ? { year: "numeric" } : {}), timeZone: "UTC" }).format(d);
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
  /** un sceau gagné : « Sceau Duelliste · vermillon » */
  sceau: (titre: string) => `Sceau ${titre}`,
  // la visibilité du Journal (réglée dans Moi › Réglages)
  ferme: "Journal fermé",
  fermeAmis: (nom: string) => `${nom} montre son Journal à ses amis seulement.`,
  fermePrive: (nom: string) => `${nom} garde son Journal pour lui.`,
  /** sur son profil, vu comme les autres : ce qu'ils voient */
  fermeApercu: "Les autres joueurs voient ce message à la place de ton Journal.",
  /** la date d'une entrée, dans le navigateur : « aujourd'hui », « hier », « il y a 3 j » ; null au-delà d'une semaine */
  ilYa: (jours: number): string | null => (jours <= 0 ? "aujourd'hui" : jours === 1 ? "hier" : jours < 7 ? `il y a ${nombre(jours)}${NBSP}j` : null),
} as const;

// ---------------------------------------------------------------------------
// Le réglage du Journal (Moi › Réglages › Confidentialité)

export const REGLAGE_JOURNAL = {
  titre: "Qui voit mon Journal",
  choix: [
    { key: "public", label: "Tous", aide: "Tous les joueurs voient ta courbe d'ELO, ton carnet de jours et ton fil." },
    { key: "friends", label: "Amis", aide: "Seuls tes amis voient ton Journal." },
    { key: "private", label: "Moi seul", aide: "Ton Journal est gardé pour toi." },
  ],
  bientot: "Bientôt disponible.",
  erreur: "Réglage impossible à lire pour l'instant.",
  reessayer: "Réessayer",
  echec: "Pas enregistré. Réessaie dans un instant.",
} as const;
