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

/** Ce qui est gravé sur le sceau : le nom en haut, le chiffre au centre, l'unité en bas. */
export function inscription(d: DefSceau, seuil: number): { sur: string; texte: string; sous: string } {
  return { sur: nomSceau(d).toUpperCase(), texte: d.unite === "maitrise" ? pct(seuil) : nombre(seuil), sous: SOUS[d.unite](seuil) };
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
  aPorteeAide: "Les 3 marches les plus proches. Toi seul les vois.",
  totalLong: (n: number, max: number) => `${pluriel(n, "marche gagnée", "marches gagnées")} sur ${nombre(max)}`,
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
  teDevance: (nom: string) => `${nom} te devance`,
  tuDevances: (nom: string) => `Tu devances ${nom}`,
  /** « FSA +14 » */
  ecart: (matiere: string, points: number) => `${matiere} ${signe(points)}`,
  nullePart: "nulle part",
  rienEnCommun: "Aucune matière mesurée en commun pour l'instant.",
  voir: "Face-à-face",
} as const;
