// Les textes des blocs Chiffres clés, Questions répondues et Trophées de la
// page de profil (components/profil/blocs/Chiffres.tsx, Reponses.tsx,
// Trophees.tsx). Ces trois blocs ne comparent plus : un seul dessin pour
// tous. Jamais « il » ni « elle » pour le joueur : son prénom. Module neutre.

import { nombre } from "@/lib/voice";

export const BLOCS_CHIFFRES = {
  // ── Chiffres clés ──
  chiffres: "Chiffres clés",
  questions: "Questions",
  serie: "Série",
  duels: "Duels",
  meilleure: "Meilleure matière",
  /** l'étiquette de la meilleure matière : « En FSA » */
  enMatiere: (code: string) => `En ${code}`,
  defis: "Défis du jour",
  calculs: "Calculs justes",
  examens: "Examens blancs",
  /** « 23 j » */
  jours: (n: number) => `${nombre(n)} j`,
  /** « 4/6 » : trop peu de duels pour un taux */
  fraction: (n: number, total: number) => `${nombre(n)}/${nombre(total)}`,
  /** l'infobulle des duels : « 18 duels gagnés sur 27 » */
  detailDuels: (gagnes: number, joues: number) => `${nombre(gagnes)} duel${gagnes > 1 ? "s" : ""} gagné${gagnes > 1 ? "s" : ""} sur ${nombre(joues)}`,
  // ce que le chiffre compte, en toutes lettres : « 3 412 questions posées · 12 j de série · 82 % en FSA »
  legendeQuestions: "questions posées",
  legendeSerie: "de série",
  legendeDuels: "de victoires en duel",
  legendeDuelsFraction: "duels gagnés",
  legendeDuelsAucun: "aucun duel joué",
  /** « en FSA » */
  legendeMatiere: (code: string) => `en ${code}`,
  legendeMatiereAucune: "meilleure matière, pas encore mesurée",
  provisoire: "provisoire",
  legendeDefis: "défis du jour rendus",
  legendeCalculs: "calculs justes",
  legendeExamens: "examens blancs",
  // la même légende, plus courte, quand la pièce n'est pas en grand (« 12 j de série · 82 % en FSA » tient sur une ligne)
  courtDuels: "de victoires",
  courtDuelsAucun: "aucun duel",
  courtMatiereAucune: "meilleure matière",
  courtDefis: "défis rendus",

  // ── Questions répondues ──
  reponses: "Questions répondues",
  /** sous le total, à côté de l'anneau : « questions » */
  questionsLegende: "questions",
  /** après le nombre de bonnes réponses : « 2 184 justes » (« 1 juste ») */
  justes: (n: number) => (n > 1 ? "justes" : "juste"),
  /** le nom accessible de l'anneau : « 64 % de réponses justes » */
  anneau: (p: number) => `${nombre(p)} % de réponses justes`,
  justesEtiquette: "Justes",
  precision: "Précision",
  /** la cellule de la demi-bande, chez soi : « Le détail » (vers Moi › Statistiques) */
  leDetailCourt: "Le détail",
  /** le nom accessible de la liste des sources */
  parSource: "Questions par source",

  // ── Trophées ──
  trophees: "Trophées",
  parPalier: "Trophées par palier",
  // les textes de la Salle des trophées, quand il n'y a rien
  aucunMoiComplet: "Aucun trophée pour l'instant : 5/5 aux 5 du jour, ou une séance d'entraînement ciblé réussie à 70 %, et le premier est à toi.",
  aucunMoi: "Aucun trophée pour l'instant : réussis une séance d'entraînement ciblé à 70 % pour gagner le premier.",
  /** l'infobulle d'un métal : « Or · Inès 4 » */
  metalSeul: (metal: string, nom: string, n: number) => `${metal} · ${nom} ${nombre(n)}`,
} as const;
