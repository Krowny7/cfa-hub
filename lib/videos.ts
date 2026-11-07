// Vidéos résumé : un cours filmé (voix « Rémy » des cours complets, écran façon one-pager, formules en KaTeX).
// Chaque vidéo est une suite de parties (un sujet de 4 à 6 min par fichier, sous la limite d'envoi de Supabase),
// jouées à la suite comme un seul film. Fichiers dans le bucket privé "courses" sous `<fichier>.mp4` et
// `<fichier>.jpg` (affiche) ; envoi : scripts/upload-video.mjs. Fabrication hors dépôt (atelier cfa-work/videos).

export type ChapitreVideo = { titre: string; debut: number };
export type PartieVideo = {
  titre: string;
  /** chemin dans le bucket "courses", sans extension */
  fichier: string;
  secondes: number;
  chapitres: ChapitreVideo[];
};
export type VideoResume = {
  slug: string;
  /** numéro de la série d'une heure, null pour l'exemple */
  numero: number | null;
  titre: string;
  matieres: string[];
  etat: "en-ligne" | "a-venir";
  parties: PartieVideo[];
};

export const VIDEOS: VideoResume[] = [
  {
    slug: "exemple",
    numero: null,
    titre: "Duration et convexité",
    matieres: ["Fixed Income"],
    etat: "en-ligne",
    parties: [
      {
        titre: "Duration et convexité",
        fichier: "videos/exemple-duration-convexite",
        secondes: 298,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Prix et taux", debut: 18.1 },
          { titre: "Macaulay duration", debut: 55.3 },
          { titre: "Modified duration", debut: 91.8 },
          { titre: "Convexité", debut: 132.9 },
          { titre: "Ce qui allonge la duration", debut: 194.1 },
          { titre: "Pièges d'examen", debut: 218.6 },
          { titre: "À retenir", debut: 266.3 },
        ],
      },
    ],
  },
  { slug: "video-1", numero: 1, titre: "Éthique, quantitatif, économie", matieres: ["Ethics", "Quantitative Methods", "Economics"], etat: "a-venir", parties: [] },
  { slug: "video-2", numero: 2, titre: "États financiers, entreprises, actions", matieres: ["Financial Statement Analysis", "Corporate Issuers", "Equity"], etat: "a-venir", parties: [] },
  {
    slug: "video-3",
    numero: 3,
    titre: "Taux, dérivés, alternatifs, portefeuille",
    matieres: ["Fixed Income", "Derivatives", "Alternative Investments", "Portfolio Management"],
    etat: "a-venir",
    parties: [],
  },
];

export const dureeVideo = (v: VideoResume): number => v.parties.reduce((t, p) => t + p.secondes, 0);
export const videosEnLigne = (): VideoResume[] => VIDEOS.filter((v) => v.etat === "en-ligne" && v.parties.length > 0);
