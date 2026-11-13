// Les vidéos du site (page /videos, la télé : components/videos/VideosView). Trois rangements, qui sont les trois
// chaînes de la télé (Théo, 2026-11-13) :
//  1. « intro » (Introduction) : le déblayage d'un sujet, des vidéos moyennement courtes qui donnent le point de
//     vue global sans entrer dans le détail ;
//  2. « cours » (Cours) : les cours vraiment complets, dans le détail, plus nombreux ;
//  3. « resume » (Résumé) : la synthèse de tout, pour les jours qui précèdent l'examen (les trois vidéos d'une heure).
// Ajouter une vidéo = ajouter une entrée à VIDEOS avec sa `categorie` ; une chaîne sans vidéo en ligne montre
// « bientôt » à l'écran.
//
// Une vidéo est un cours filmé (voix « Rémy » des cours complets, écran façon one-pager, formules en KaTeX).
// Chaque vidéo est une suite de parties (un sujet de 4 à 6 min par fichier, sous la limite d'envoi de Supabase),
// jouées à la suite comme un seul film. Fichiers dans le bucket privé "courses" sous `<fichier>.mp4` et
// `<fichier>.jpg` (affiche) ; envoi : scripts/upload-video.mjs. Fabrication hors dépôt (atelier cfa-work/videos,
// dont moteur/publier.py écrit les blocs `parties`). La vidéo d'exemple de 5 min (duration et convexité) a été
// retirée de la page : son contenu est devenu le sujet 3 de Fixed Income dans la vidéo 3.

export type ChapitreVideo = { titre: string; debut: number };
export type PartieVideo = {
  titre: string;
  /** chemin dans le bucket "courses", sans extension */
  fichier: string;
  secondes: number;
  chapitres: ChapitreVideo[];
};
/** Le rangement d'une vidéo, c'est-à-dire sa chaîne sur la télé de /videos. */
export type CategorieVideo = "intro" | "cours" | "resume";

export type VideoResume = {
  slug: string;
  /** la chaîne : intro (déblayage), cours (complet), resume (synthèse avant l'examen) */
  categorie: CategorieVideo;
  /** numéro de la vidéo dans sa chaîne */
  numero: number;
  titre: string;
  matieres: string[];
  etat: "en-ligne" | "a-venir";
  parties: PartieVideo[];
};

export const VIDEOS: VideoResume[] = [
  {
    slug: "video-1",
    categorie: "resume",
    numero: 1,
    titre: "Éthique, quantitatif, économie",
    matieres: ["Ethics", "Quantitative Methods", "Economics"],
    etat: "en-ligne",
    parties: [
      {
        titre: "Le Code, les Standards et le Standard I",
        fichier: "videos/v1-e1-code-et-standard-1",
        secondes: 330,
        chapitres: [
          { titre: "Vidéo 1", debut: 0 },
          { titre: "Ethics", debut: 17.4 },
          { titre: "Le Code", debut: 42.4 },
          { titre: "7 Standards", debut: 76.2 },
          { titre: "Discipline", debut: 118.9 },
          { titre: "I(A) La loi", debut: 161.2 },
          { titre: "I(B) Cadeaux", debut: 203.6 },
          { titre: "I(C) à I(E)", debut: 251.1 },
          { titre: "À retenir", debut: 302.3 },
        ],
      },
      {
        titre: "Standard II : l'intégrité des marchés",
        fichier: "videos/v1-e2-standard-2-marches",
        secondes: 308,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "II(A) MNPI", debut: 18.2 },
          { titre: "Que faire ?", debut: 62.1 },
          { titre: "Mosaïque", debut: 101.6 },
          { titre: "Firewalls", debut: 149.6 },
          { titre: "II(B) Cours", debut: 178.7 },
          { titre: "Cas", debut: 236.2 },
          { titre: "À retenir", debut: 280.8 },
        ],
      },
      {
        titre: "Standard III : les devoirs envers les clients",
        fichier: "videos/v1-e3-standard-3-clients",
        secondes: 313,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "III(A) Loyauté", debut: 18.5 },
          { titre: "III(B) Équité", debut: 66.2 },
          { titre: "III(C) IPS", debut: 106.9 },
          { titre: "III(D) Perf.", debut: 160.8 },
          { titre: "III(E) Secret", debut: 199.5 },
          { titre: "Cas", debut: 236.6 },
          { titre: "À retenir", debut: 279.9 },
        ],
      },
      {
        titre: "Standards IV et V : employeurs et analyse",
        fichier: "videos/v1-e4-standards-4-5",
        secondes: 317,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Loyalty", debut: 15.9 },
          { titre: "Rémunération", debut: 64 },
          { titre: "Superviseurs", debut: 111.1 },
          { titre: "Diligence", debut: 149.1 },
          { titre: "Communication", debut: 182.5 },
          { titre: "Archives", debut: 215.6 },
          { titre: "Cas", debut: 241.8 },
          { titre: "À retenir", debut: 286.5 },
        ],
      },
      {
        titre: "Standards VI et VII : conflits et programme CFA",
        fichier: "videos/v1-e5-standards-6-7",
        secondes: 317,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Conflits", debut: 14.3 },
          { titre: "Priorité", debut: 49.2 },
          { titre: "Front-running", debut: 76.4 },
          { titre: "Referral fees", debut: 116.1 },
          { titre: "L'examen", debut: 149.2 },
          { titre: "Le titre CFA", debut: 184.9 },
          { titre: "Cas", debut: 232 },
          { titre: "À retenir", debut: 285.7 },
        ],
      },
      {
        titre: "GIPS et la prise de décision éthique",
        fichier: "videos/v1-e6-gips-et-decision",
        secondes: 313,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Confiance", debut: 16.2 },
          { titre: "Décider", debut: 55.2 },
          { titre: "GIPS", debut: 95.6 },
          { titre: "Composites", debut: 140.8 },
          { titre: "Conformité", debut: 188.9 },
          { titre: "Pièges", debut: 228 },
          { titre: "À retenir", debut: 266.8 },
          { titre: "Synthèse", debut: 287.8 },
        ],
      },
      {
        titre: "Rendements et valeur temps",
        fichier: "videos/v1-q1-rendements-et-valeur-temps",
        secondes: 320,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "HPR", debut: 20.4 },
          { titre: "Moyennes", debut: 48.3 },
          { titre: "MWR et TWR", debut: 95.6 },
          { titre: "Annualiser", debut: 136.7 },
          { titre: "Valeur temps", debut: 180.8 },
          { titre: "Annuités", debut: 218.9 },
          { titre: "Pièges", debut: 257 },
          { titre: "À retenir", debut: 294.2 },
        ],
      },
      {
        titre: "Statistiques, probabilités et portefeuille",
        fichier: "videos/v1-q2-statistiques-probabilites",
        secondes: 371,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Dispersion", debut: 19.4 },
          { titre: "Forme", debut: 58.6 },
          { titre: "Portefeuille", debut: 98.2 },
          { titre: "Bayes", debut: 154.5 },
          { titre: "Normale · Roy", debut: 210.8 },
          { titre: "Échantillon", debut: 259 },
          { titre: "Pièges", debut: 309.8 },
          { titre: "À retenir", debut: 341.5 },
        ],
      },
      {
        titre: "Tests d'hypothèses et régression",
        fichier: "videos/v1-q3-tests-et-regression",
        secondes: 325,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Hypothèses", debut: 9.9 },
          { titre: "Erreurs", debut: 43.6 },
          { titre: "Test t", debut: 74.8 },
          { titre: "Corrélation", debut: 117.5 },
          { titre: "Droite OLS", debut: 143.2 },
          { titre: "ANOVA", debut: 173.6 },
          { titre: "Tester", debut: 213.1 },
          { titre: "Résidus", debut: 256.6 },
          { titre: "À retenir", debut: 278.6 },
          { titre: "Synthèse Quant", debut: 301.1 },
        ],
      },
      {
        titre: "Firmes et structures de marché",
        fichier: "videos/v1-ec1-firmes-et-marches",
        secondes: 316,
        chapitres: [
          { titre: "Economics", debut: 0 },
          { titre: "Élasticités", debut: 25.5 },
          { titre: "Seuils", debut: 70.9 },
          { titre: "4 marchés", debut: 114 },
          { titre: "Oligopole", debut: 153.2 },
          { titre: "Monopole", debut: 187.2 },
          { titre: "Concentration", debut: 224 },
          { titre: "Pièges", debut: 257.9 },
          { titre: "À retenir", debut: 289.9 },
        ],
      },
      {
        titre: "Cycles, politique monétaire et budgétaire",
        fichier: "videos/v1-ec2-cycles-et-politiques",
        secondes: 325,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Phases", debut: 20.3 },
          { titre: "Indicateurs", debut: 66.9 },
          { titre: "Monétaire", debut: 104.2 },
          { titre: "Taux neutre", debut: 141 },
          { titre: "Multiplicateur", debut: 181.5 },
          { titre: "Déficits", debut: 228.8 },
          { titre: "Dosage", debut: 270.1 },
          { titre: "À retenir", debut: 298.1 },
        ],
      },
      {
        titre: "Change, commerce et géopolitique",
        fichier: "videos/v1-ec3-change-et-commerce",
        secondes: 316,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Cotations", debut: 20.6 },
          { titre: "Forward", debut: 68.6 },
          { titre: "Taux réel", debut: 120.1 },
          { titre: "Commerce", debut: 163.6 },
          { titre: "Géopolitique", debut: 214.1 },
          { titre: "À retenir", debut: 252.3 },
          { titre: "Synthèse", debut: 272.1 },
          { titre: "Fin vidéo 1", debut: 294.1 },
        ],
      },
    ],
  },
  {
    slug: "video-2",
    categorie: "resume",
    numero: 2,
    titre: "États financiers, entreprises, actions",
    matieres: ["Financial Statement Analysis", "Corporate Issuers", "Equity"],
    etat: "en-ligne",
    parties: [
      {
        titre: "Le cadre et le compte de résultat",
        fichier: "videos/v2-f1-cadre-et-resultat",
        secondes: 307,
        chapitres: [
          { titre: "Vidéo 2", debut: 0 },
          { titre: "FSA", debut: 18 },
          { titre: "IFRS · GAAP", debut: 38.9 },
          { titre: "Revenu", debut: 78 },
          { titre: "Charges · OCI", debut: 119.3 },
          { titre: "Basic EPS", debut: 160.2 },
          { titre: "Diluted EPS", debut: 193.9 },
          { titre: "Pièges", debut: 246.6 },
          { titre: "À retenir", debut: 279.4 },
        ],
      },
      {
        titre: "Bilan et flux de trésorerie",
        fichier: "videos/v2-f2-bilan-et-flux",
        secondes: 280,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Bilan", debut: 18.3 },
          { titre: "Évaluation", debut: 57.2 },
          { titre: "CFO CFI CFF", debut: 90.2 },
          { titre: "Indirecte", debut: 129.7 },
          { titre: "FCFF · FCFE", debut: 171.8 },
          { titre: "Pièges", debut: 214.4 },
          { titre: "À retenir", debut: 248.5 },
        ],
      },
      {
        titre: "Stocks et actifs long terme",
        fichier: "videos/v2-f3-stocks-et-actifs",
        secondes: 288,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "FIFO · LIFO", debut: 15.5 },
          { titre: "LIFO reserve", debut: 60.6 },
          { titre: "NRV", debut: 94.2 },
          { titre: "Capitaliser", debut: 125.1 },
          { titre: "Amortir", debut: 155.7 },
          { titre: "Impairment", debut: 184.1 },
          { titre: "Réévaluation", debut: 225.9 },
          { titre: "À retenir", debut: 257.9 },
        ],
      },
      {
        titre: "Impôts, dettes et engagements",
        fichier: "videos/v2-f4-impots-dettes-leases",
        secondes: 292,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Impôts diff.", debut: 16 },
          { titre: "Taux effectif", debut: 63.5 },
          { titre: "Coût amorti", debut: 108.5 },
          { titre: "Leases", debut: 149.5 },
          { titre: "Retraites", debut: 196.1 },
          { titre: "Pièges", debut: 235 },
          { titre: "À retenir", debut: 263.7 },
        ],
      },
      {
        titre: "Ratios et qualité de l'information",
        fichier: "videos/v2-f5-ratios-et-qualite",
        secondes: 288,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Activité", debut: 14.8 },
          { titre: "Liquidité", debut: 51.9 },
          { titre: "DuPont 3", debut: 89.1 },
          { titre: "DuPont 5", debut: 124.3 },
          { titre: "Qualité", debut: 164.6 },
          { titre: "Signaux", debut: 203.5 },
          { titre: "À retenir", debut: 235.6 },
          { titre: "Synthèse FSA", debut: 257.4 },
        ],
      },
      {
        titre: "Gouvernance et parties prenantes",
        fichier: "videos/v2-c1-gouvernance",
        secondes: 268,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Parties", debut: 19.6 },
          { titre: "Principal-agent", debut: 49.9 },
          { titre: "Contrôle", debut: 93.4 },
          { titre: "Conseil", debut: 121.6 },
          { titre: "Mécanismes", debut: 156.6 },
          { titre: "ESG", debut: 182.5 },
          { titre: "Business model", debut: 211.6 },
          { titre: "À retenir", debut: 235.8 },
        ],
      },
      {
        titre: "Investir et financer",
        fichier: "videos/v2-c2-investir-et-financer",
        secondes: 284,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Quels flux", debut: 10.3 },
          { titre: "NPV et IRR", debut: 33.3 },
          { titre: "Conflit, options", debut: 77 },
          { titre: "WACC", debut: 112.9 },
          { titre: "WACC chiffré", debut: 145.9 },
          { titre: "Modigliani-Miller", debut: 186.3 },
          { titre: "Trade-off", debut: 219.5 },
          { titre: "À retenir", debut: 248.1 },
        ],
      },
      {
        titre: "Liquidité, fonds de roulement et levier",
        fichier: "videos/v2-c3-liquidite-et-levier",
        secondes: 261,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Cycle de cash", debut: 11.8 },
          { titre: "Exemple CCC", debut: 38.4 },
          { titre: "Sources", debut: 69.6 },
          { titre: "Crédit fournisseur", debut: 102.9 },
          { titre: "Leviers", debut: 135.9 },
          { titre: "Exemple levier", debut: 158.5 },
          { titre: "Point mort", debut: 196.8 },
          { titre: "À retenir", debut: 211 },
          { titre: "Synthèse Corp.", debut: 233.1 },
        ],
      },
      {
        titre: "Marchés, positions et ordres",
        fichier: "videos/v2-eq1-marches-et-ordres",
        secondes: 271,
        chapitres: [
          { titre: "Equity", debut: 0 },
          { titre: "Positions", debut: 21.3 },
          { titre: "Marge, levier", debut: 52.6 },
          { titre: "Appel de marge", debut: 101.1 },
          { titre: "Ordres", debut: 133.8 },
          { titre: "Primaire · Second.", debut: 173.3 },
          { titre: "Pièges", debut: 210.5 },
          { titre: "À retenir", debut: 243.7 },
        ],
      },
      {
        titre: "Les indices",
        fichier: "videos/v2-eq2-indices",
        secondes: 261,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Price · Total", debut: 16.1 },
          { titre: "Pondérations", debut: 42 },
          { titre: "Exemple", debut: 81.5 },
          { titre: "Diviseur", debut: 135 },
          { titre: "Construire", debut: 174 },
          { titre: "Pièges", debut: 202.3 },
          { titre: "À retenir", debut: 232.7 },
        ],
      },
      {
        titre: "Efficience des marchés et titres de propriété",
        fichier: "videos/v2-eq3-efficience-et-titres",
        secondes: 266,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Efficient", debut: 19.5 },
          { titre: "Trois formes", debut: 54.1 },
          { titre: "Anomalies", debut: 86.4 },
          { titre: "Ordinaires · Pref.", debut: 115.2 },
          { titre: "ADR · Risque", debut: 144.7 },
          { titre: "ROE", debut: 171.6 },
          { titre: "Pièges", debut: 209.7 },
          { titre: "À retenir", debut: 243.7 },
        ],
      },
      {
        titre: "Analyse sectorielle et d'entreprise",
        fichier: "videos/v2-eq4-analyse-sectorielle",
        secondes: 279,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Classification", debut: 19.5 },
          { titre: "Croissance · cycle", debut: 49.4 },
          { titre: "Concentration", debut: 85.6 },
          { titre: "Cinq forces", debut: 117.8 },
          { titre: "Stratégies", debut: 149.8 },
          { titre: "L'entreprise", debut: 179.7 },
          { titre: "Pièges", debut: 223.2 },
          { titre: "À retenir", debut: 253 },
        ],
      },
      {
        titre: "Valoriser une action",
        fichier: "videos/v2-eq5-valorisation",
        secondes: 329,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Gordon", debut: 19.2 },
          { titre: "Multi-étapes", debut: 60.1 },
          { titre: "Préf. · FCFE", debut: 101.4 },
          { titre: "Multiples", debut: 136.8 },
          { titre: "EV · Actifs", debut: 189.8 },
          { titre: "Pièges", debut: 238 },
          { titre: "À retenir", debut: 267.6 },
          { titre: "Synthèse Equity", debut: 285.8 },
          { titre: "Fin vidéo 2", debut: 308.7 },
        ],
      },
    ],
  },
  {
    slug: "video-3",
    categorie: "resume",
    numero: 3,
    titre: "Taux, dérivés, alternatifs, portefeuille",
    matieres: ["Fixed Income", "Derivatives", "Alternative Investments", "Portfolio Management"],
    etat: "en-ligne",
    parties: [
      {
        titre: "Les obligations et leurs marchés",
        fichier: "videos/v3-fi1-obligations-et-marches",
        secondes: 316,
        chapitres: [
          { titre: "Vidéo 3", debut: 0 },
          { titre: "Fixed Income", debut: 19.5 },
          { titre: "Caractéristiques", debut: 37.8 },
          { titre: "Covenants", debut: 80.3 },
          { titre: "Flux", debut: 111.3 },
          { titre: "Options", debut: 156.5 },
          { titre: "Marchés", debut: 207.7 },
          { titre: "Pièges", debut: 249.5 },
          { titre: "À retenir", debut: 285.4 },
        ],
      },
      {
        titre: "Prix, rendements et courbe des taux",
        fichier: "videos/v3-fi2-prix-rendements-courbe",
        secondes: 329,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Prix et YTM", debut: 17.1 },
          { titre: "Coupon couru", debut: 58.3 },
          { titre: "Rendements", debut: 99.8 },
          { titre: "Spreads", debut: 138 },
          { titre: "Courbes", debut: 179.1 },
          { titre: "FRN, monétaire", debut: 225.5 },
          { titre: "Pièges", debut: 270 },
          { titre: "À retenir", debut: 298.8 },
        ],
      },
      {
        titre: "Duration et convexité",
        fichier: "videos/v3-fi3-duration-convexite",
        secondes: 298,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Prix et taux", debut: 18.2 },
          { titre: "Macaulay", debut: 55.4 },
          { titre: "Modified", debut: 91.9 },
          { titre: "Convexité", debut: 133 },
          { titre: "Réflexes", debut: 194.1 },
          { titre: "Pièges", debut: 218.6 },
          { titre: "À retenir", debut: 266.3 },
        ],
      },
      {
        titre: "Crédit et titrisation",
        fichier: "videos/v3-fi4-credit-et-titrisation",
        secondes: 306,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Perte attendue", debut: 15.5 },
          { titre: "Notations", debut: 49.4 },
          { titre: "Spreads, rang", debut: 88.1 },
          { titre: "Titrisation", debut: 123.1 },
          { titre: "MBS et CMO", debut: 167.5 },
          { titre: "Pièges", debut: 219.7 },
          { titre: "À retenir", debut: 250.6 },
          { titre: "Fixed Income", debut: 272.9 },
        ],
      },
      {
        titre: "Forwards, futures et swaps",
        fichier: "videos/v3-d1-forwards-futures-swaps",
        secondes: 343,
        chapitres: [
          { titre: "Derivatives", debut: 0 },
          { titre: "Dérivés", debut: 21.6 },
          { titre: "Prix forward", debut: 73 },
          { titre: "Portage", debut: 119.3 },
          { titre: "Valeur forward", debut: 149.4 },
          { titre: "Futures", debut: 185.1 },
          { titre: "Swaps", debut: 241.8 },
          { titre: "Pièges", debut: 282.1 },
          { titre: "À retenir", debut: 319.1 },
        ],
      },
      {
        titre: "Les options",
        fichier: "videos/v3-d2-options",
        secondes: 328,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Payoffs", debut: 16.5 },
          { titre: "Moneyness", debut: 56.3 },
          { titre: "Facteurs", debut: 92.4 },
          { titre: "Parité", debut: 123.8 },
          { titre: "Binomial", debut: 183.2 },
          { titre: "Pièges", debut: 234.1 },
          { titre: "À retenir", debut: 273.8 },
          { titre: "Synthèse", debut: 297.6 },
        ],
      },
      {
        titre: "Panorama, structures et frais",
        fichier: "videos/v3-a1-structures-et-frais",
        secondes: 271,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Traits", debut: 20.6 },
          { titre: "Structures", debut: 46.5 },
          { titre: "Frais", debut: 75.5 },
          { titre: "Calcul", debut: 109.2 },
          { titre: "Cascade", debut: 153.6 },
          { titre: "Rendements", debut: 190.1 },
          { titre: "Pièges", debut: 213.9 },
          { titre: "À retenir", debut: 248 },
        ],
      },
      {
        titre: "Private capital, immobilier et infrastructures",
        fichier: "videos/v3-a2-private-immobilier-infra",
        secondes: 252,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Private equity", debut: 20.1 },
          { titre: "Venture, sorties", debut: 50.1 },
          { titre: "Private debt", debut: 76.1 },
          { titre: "Immobilier", debut: 105.3 },
          { titre: "Évaluation", debut: 128.9 },
          { titre: "Infrastructures", debut: 163.5 },
          { titre: "Pièges", debut: 191.1 },
          { titre: "À retenir", debut: 222.6 },
        ],
      },
      {
        titre: "Hedge funds, matières premières et actifs numériques",
        fichier: "videos/v3-a3-hedge-funds-commodities",
        secondes: 254,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Hedge funds", debut: 18.5 },
          { titre: "Future", debut: 63.8 },
          { titre: "Contango", debut: 90.7 },
          { titre: "Terres, crypto", debut: 122.3 },
          { titre: "Biais", debut: 153.1 },
          { titre: "Pièges", debut: 179.9 },
          { titre: "À retenir", debut: 206.7 },
          { titre: "Synthèse", debut: 224.5 },
        ],
      },
      {
        titre: "Risque, rendement et frontière efficiente",
        fichier: "videos/v3-p1-risque-rendement-frontiere",
        secondes: 322,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Utilité", debut: 20.3 },
          { titre: "Indifférence", debut: 65.9 },
          { titre: "Corrélation", debut: 104.2 },
          { titre: "Frontière", debut: 162.4 },
          { titre: "CAL et optimum", debut: 203 },
          { titre: "Pièges", debut: 254.4 },
          { titre: "À retenir", debut: 294 },
        ],
      },
      {
        titre: "CAPM, bêta et mesures de performance",
        fichier: "videos/v3-p2-capm-et-performance",
        secondes: 334,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "Deux risques", debut: 21 },
          { titre: "Bêta", debut: 67.8 },
          { titre: "CML et SML", debut: 114 },
          { titre: "CAPM", debut: 156.2 },
          { titre: "Performance", debut: 192.1 },
          { titre: "Quand l'utiliser", debut: 261.2 },
          { titre: "Pièges", debut: 281.8 },
          { titre: "À retenir", debut: 308.3 },
        ],
      },
      {
        titre: "IPS, gestion des risques et finance comportementale",
        fichier: "videos/v3-p3-ips-risques-biais",
        secondes: 335,
        chapitres: [
          { titre: "Ouverture", debut: 0 },
          { titre: "IPS", debut: 16 },
          { titre: "Allocation", debut: 73.1 },
          { titre: "Risques", debut: 106.5 },
          { titre: "VaR", debut: 152.4 },
          { titre: "Biais", debut: 204.4 },
          { titre: "À retenir", debut: 259.4 },
          { titre: "Synthèse", debut: 282.8 },
          { titre: "Fin de série", debut: 310.5 },
        ],
      },
    ],
  },
];

export const dureeVideo = (v: VideoResume): number => v.parties.reduce((t, p) => t + p.secondes, 0);
export const videosEnLigne = (): VideoResume[] => VIDEOS.filter((v) => v.etat === "en-ligne" && v.parties.length > 0);

/** Les trois chaînes de la télé, dans l'ordre des touches (1, 2, 3). */
export const CHAINES: { categorie: CategorieVideo; numero: number }[] = [
  { categorie: "intro", numero: 1 },
  { categorie: "cours", numero: 2 },
  { categorie: "resume", numero: 3 },
];
export const estCategorie = (x: unknown): x is CategorieVideo => x === "intro" || x === "cours" || x === "resume";
export const numeroDeChaine = (c: CategorieVideo): number => CHAINES.find((x) => x.categorie === c)?.numero ?? 0;
/** Toutes les vidéos d'une chaîne (en ligne ou à venir), dans l'ordre de leur numéro. */
export const videosDeChaine = (c: CategorieVideo): VideoResume[] => VIDEOS.filter((v) => v.categorie === c).sort((a, b) => a.numero - b.numero);
/** Les vidéos d'une chaîne qu'on peut regarder. */
export const videosEnLigneDeChaine = (c: CategorieVideo): VideoResume[] => videosDeChaine(c).filter((v) => v.etat === "en-ligne" && v.parties.length > 0);
/** La chaîne ouverte d'office : la première qui a une vidéo en ligne (le Résumé tant que les autres sont vides). */
export const chaineParDefaut = (): CategorieVideo => CHAINES.find((c) => videosEnLigneDeChaine(c.categorie).length > 0)?.categorie ?? "resume";

/**
 * Ce que la télé montre pour une adresse : ?v=<slug> joue cette vidéo (et règle sa chaîne) ; ?chaine=… ouvre la
 * première vidéo de la chaîne ; sinon, la chaîne par défaut. `choix` dit ce qui a été demandé : la page peut ensuite,
 * après le montage, passer à la dernière vidéo regardée sur l'appareil (jamais quand une vidéo est demandée).
 */
export function choisirVideo(v?: string, c?: string): { chaine: CategorieVideo; video: VideoResume | null; choix: "video" | "chaine" | "auto" } {
  const demandee = videosEnLigne().find((x) => x.slug === v) ?? null;
  if (demandee) return { chaine: demandee.categorie, video: demandee, choix: "video" };
  const chaine = estCategorie(c) ? c : chaineParDefaut();
  return { chaine, video: videosEnLigneDeChaine(chaine)[0] ?? null, choix: estCategorie(c) ? "chaine" : "auto" };
}

/** La matière d'une partie, lue dans le nom de son fichier (`videos/v1-q2-…` : q = Quantitative Methods). */
const MATIERES: Record<string, string> = {
  e: "Ethics",
  q: "Quant",
  ec: "Economics",
  f: "FSA",
  c: "Corporate",
  eq: "Equity",
  fi: "Fixed Income",
  d: "Derivatives",
  a: "Alternatives",
  p: "Portfolio",
};
export const matiereDe = (p: PartieVideo): string => MATIERES[/^videos\/v\d+-([a-z]+)\d/.exec(p.fichier)?.[1] ?? ""] ?? "";

/** Les parties d'une vidéo regroupées par matière, dans l'ordre, avec leur rang dans la vidéo. */
export function groupesDeMatiere(v: VideoResume): { matiere: string; secondes: number; parties: { partie: PartieVideo; i: number }[] }[] {
  const groupes: { matiere: string; secondes: number; parties: { partie: PartieVideo; i: number }[] }[] = [];
  v.parties.forEach((partie, i) => {
    const m = matiereDe(partie);
    const g = groupes[groupes.length - 1];
    if (g && g.matiere === m) {
      g.parties.push({ partie, i });
      g.secondes += partie.secondes;
    } else groupes.push({ matiere: m, secondes: partie.secondes, parties: [{ partie, i }] });
  });
  return groupes;
}
