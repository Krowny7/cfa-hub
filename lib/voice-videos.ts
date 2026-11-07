// Textes de la page Vidéos résumé (app/videos).
export const VIDEOS_TXT = {
  retour: "Réviser",
  titre: "Vidéos résumé",
  sous: "Le cours filmé : l'essentiel de l'examen, expliqué à voix haute, formules et schémas à l'écran.",
  auProgramme: "Au programme",
  toutes: "Toutes les vidéos",
  exemple: "Exemple",
  serie: (n: number) => `Vidéo ${n}`,
  enPreparation: "En préparation",
  enCours: "En lecture",
  minutes: (m: number) => `${m} min`,
  indisponible: "La vidéo ne se charge pas pour le moment. Réessaie dans un instant.",
  aucune: "Les vidéos arrivent bientôt.",
  partie: (i: number, n: number) => `Partie ${i} sur ${n}`,
} as const;

export const minutesDe = (secondes: number): number => Math.max(1, Math.round(secondes / 60));
export const horodatage = (s: number): string => {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), r = t % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
};
