// Textes de la page Vidéos résumé (app/videos).
const virgule = (n: number) => String(n).replace(".", ",");

export const VIDEOS_TXT = {
  retour: "Réviser",
  titre: "Vidéos résumé",
  sous: "Trois heures de cours filmé pour repasser les 10 matières avant l'examen. La voix explique, l'écran montre les formules et les schémas.",
  lesVideos: "Les trois vidéos",
  serie: (n: number) => `Vidéo ${n}`,
  enPreparation: "En préparation",
  enLecture: "En lecture",
  pasCommencee: "Pas commencée",
  vue: (pct: number) => (pct >= 100 ? "Vue en entier" : `Vue à ${pct} %`),
  reste: (duree: string) => `encore ${duree}`,
  parties: (n: number) => `${n} parties`,
  partie: (i: number, n: number) => `Partie ${i} sur ${n}`,
  programme: "Au programme",
  frise: "La vidéo en entier, matière par matière",
  allerPartie: (i: number, titre: string) => `Partie ${i} : ${titre}`,
  precedente: "Partie précédente",
  suivante: "Partie suivante",
  vitesse: (r: number) => `${virgule(r)}×`,
  vitesseAide: (r: number) => `Vitesse de lecture : ${virgule(r)}×. Appuie pour changer.`,
  reprise: (h: string) => `Reprise à ${h}, là où tu t'étais arrêté.`,
  partieVue: "Vue",
  indisponible: "La vidéo ne se charge pas pour le moment. Réessaie dans un instant.",
  aucune: "Les vidéos arrivent bientôt.",
} as const;

export const minutesDe = (secondes: number): number => Math.max(1, Math.round(secondes / 60));

/** « 1 h 04 » à partir d'une heure, « 32 min » en dessous. */
export const dureeTexte = (secondes: number): string => {
  const m = Math.round(secondes / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${Math.max(1, m)} min`;
};

export const horodatage = (s: number): string => {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), r = t % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
};
