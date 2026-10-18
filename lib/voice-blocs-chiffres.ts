// Les textes des blocs Chiffres clés, Questions répondues et Trophées de la
// page de profil (components/profil/blocs/Chiffres.tsx, Reponses.tsx,
// Trophees.tsx). La grammaire commune des écarts (infobulle d'un jeton,
// rattrapage, aperçu, « Le détail ») reste dans lib/voice-blocs.ts. Jamais
// « il » ni « elle » pour le joueur : son prénom. Module neutre.

import { nombre } from "@/lib/voice";

export const BLOCS_CHIFFRES = {
  // ── Chiffres clés ──
  chiffres: "Chiffres clés",
  questions: "Questions",
  serie: "Série",
  duels: "Duels",
  duelsGagnes: "Duels gagnés",
  meilleure: "Meilleure matière",
  /** l'étiquette de la meilleure matière : « En FSA » */
  enMatiere: (code: string) => `En ${code}`,
  /** l'infobulle de la meilleure matière : « Sa meilleure matière : Financial Statement Analysis » */
  saMeilleure: (nom: string) => `Sa meilleure matière : ${nom}`,
  defis: "Défis du jour",
  calculs: "Calculs justes",
  examens: "Examens blancs",
  /** « 23 j » */
  jours: (n: number) => `${nombre(n)} j`,
  /** « 23 j (record 41 j) » */
  joursRecord: (n: number, record: number) => `${nombre(n)} j (record ${nombre(record)} j)`,
  /** « 41 sur 60 » */
  surTotal: (n: number, total: number) => `${nombre(n)} sur ${nombre(total)}`,
  /** « 4/6 » : trop peu de duels pour un taux */
  fraction: (n: number, total: number) => `${nombre(n)}/${nombre(total)}`,
  tropPeuDuels: "Trop peu de duels pour comparer",
  // les petites lignes, chez soi seulement
  dontAujourdhui: (n: number) => `dont ${nombre(n)} aujourd'hui`,
  record: (n: number) => `record ${nombre(n)} j`,
  provisoire: "provisoire",
  pasMesuree: "pas encore mesurée",

  // ── Questions répondues ──
  reponses: "Questions répondues",
  /** l'infobulle d'une ligne par matière : « Questions en FSA » */
  questionsEn: (matiere: string) => `Questions en ${matiere}`,
  parMatiere: "Questions par matière",
  /** la cellule de la demi-bande, chez soi : « Le détail » (vers Moi › Statistiques) */
  leDetailCourt: "Le détail",

  // ── Trophées ──
  trophees: "Trophées",
  comparaisonIncomplete: "Comparaison incomplète",
  parPalier: "Trophées par palier",
  // les textes de la Salle des trophées, quand il n'y a rien
  aucunMoiComplet: "Aucun trophée pour l'instant : 5/5 aux 5 du jour, ou une séance d'entraînement ciblé réussie à 70 %, et le premier est à toi.",
  aucunMoi: "Aucun trophée pour l'instant : réussis une séance d'entraînement ciblé à 70 % pour gagner le premier.",
  /** l'infobulle d'un métal sans comparaison : « Or · Inès 4 » */
  metalSeul: (metal: string, nom: string, n: number) => `${metal} · ${nom} ${nombre(n)}`,
} as const;
