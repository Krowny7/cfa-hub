// Référentiel des notions : la seule partie écrite à la main (et relue).
// Une notion = un Learning Module (LM) du programme CFA Niveau I 2026, 93 en
// tout. Pour chaque matière : la clé (celle de lib/practiceTopics.ts), le
// slug du cours complet (lib/courses.ts : un chapitre par LM, dans l'ordre),
// les numéros de reading de chaque LM dans les deux numérotations du
// contenu, et le libellé court français de chaque LM (ce que lit le joueur).
//
// Deux numérotations circulent dans le dépôt :
//   - « banque » : la banque de practice exams (dossiers « Reading N … »),
//     les titres des QCM « … — QCM (R59–R61) », les commentaires des drills
//     « (officielle, Reading 58) ». Portfolio Risk and Return I et II y sont
//     rangés en 20 et 21, avant Corporate Issuers.
//   - « schweser » : les livres Schweser et les anciens lots (titres Fixed
//     Income v1 « (R47–R51) », sources des calculs « Schweser R83 »).
// Les deux vont de 1 à 93 et se chevauchent : un numéro seul ne dit rien sans
// sa numérotation. scripts/notions/build.mjs vérifie que chaque reading tombe
// sur un seul LM et que les titres de la banque suivent les chapitres des cours.

export const MATIERES = [
  {
    cle: "ethics",
    cours: "ethics",
    banque: [89, 90, 91, 92, 93],
    schweser: [89, 90, 91, 92, 93],
    courts: ["Éthique et confiance", "Code et Standards", "Standards I à VII", "GIPS", "Cas d'éthique"],
  },
  {
    cle: "quant",
    cours: "quantitative-methods",
    banque: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    schweser: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    courts: [
      "Taux et rendements",
      "Valeur temps de l'argent",
      "Statistiques des rendements",
      "Arbres de probabilités",
      "Mathématiques du portefeuille",
      "Simulation",
      "Estimation et inférence",
      "Tests d'hypothèse",
      "Tests d'indépendance",
      "Régression linéaire",
      "Big data et fintech",
    ],
  },
  {
    cle: "economics",
    cours: "economics",
    banque: [12, 13, 14, 15, 16, 17, 18, 19],
    schweser: [12, 13, 14, 15, 16, 17, 18, 19],
    courts: [
      "Structures de marché",
      "Cycles économiques",
      "Politique budgétaire",
      "Politique monétaire",
      "Géopolitique",
      "Commerce international",
      "Flux de capitaux et change",
      "Calculs de change",
    ],
  },
  {
    cle: "corporate",
    cours: "corporate-issuers",
    banque: [22, 23, 24, 25, 26, 27, 28],
    schweser: [20, 21, 22, 23, 24, 25, 26],
    courts: [
      "Formes d'entreprise",
      "Parties prenantes",
      "Gouvernance",
      "Fonds de roulement",
      "Choix d'investissement",
      "Structure du capital",
      "Modèles d'affaires",
    ],
  },
  {
    cle: "fsa",
    cours: "financial-statement-analysis",
    banque: [29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40],
    schweser: [27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38],
    courts: [
      "Cadre de l'analyse financière",
      "Compte de résultat",
      "Bilan",
      "Tableau des flux I",
      "Tableau des flux II",
      "Stocks",
      "Actifs long terme",
      "Passifs long terme",
      "Impôts sur le résultat",
      "Qualité de l'information",
      "Ratios financiers",
      "Modélisation financière",
    ],
    // paquets de flashcards (titres exacts) et les LM qu'ils couvrent
    flashcards: [
      { titre: "Financial Statement Analysis — Flashcards 1/4 (Cadre d'analyse, résultat & bilan)", lm: [1, 2, 3] },
      { titre: "Financial Statement Analysis — Flashcards 2/4 (Flux de trésorerie & stocks)", lm: [4, 5, 6] },
      { titre: "Financial Statement Analysis — Flashcards 3/4 (Actifs & passifs long terme, impôts)", lm: [7, 8, 9] },
      { titre: "Financial Statement Analysis — Flashcards 4/4 (Qualité de l'information, techniques & modélisation)", lm: [10, 11, 12] },
    ],
  },
  {
    cle: "equity",
    cours: "equity",
    banque: [41, 42, 43, 44, 45, 46, 47, 48],
    schweser: [39, 40, 41, 42, 43, 44, 45, 46],
    courts: [
      "Organisation des marchés",
      "Indices boursiers",
      "Efficience des marchés",
      "Types d'actions",
      "Analyse d'entreprise",
      "Analyse sectorielle",
      "Prévisions d'entreprise",
      "Valorisation des actions",
    ],
  },
  {
    cle: "fixed_income",
    cours: "fixed-income",
    banque: [49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67],
    schweser: [47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65],
    courts: [
      "Caractéristiques des obligations",
      "Flux et types d'obligations",
      "Émission et négociation",
      "Dette des entreprises",
      "Dette publique",
      "Prix et rendement",
      "Rendements et spreads (taux fixe)",
      "Taux variables et monétaire",
      "Courbe des taux",
      "Risque de taux",
      "Duration",
      "Convexité",
      "Duration effective et empirique",
      "Risque de crédit",
      "Crédit des émetteurs publics",
      "Crédit des entreprises",
      "Titrisation",
      "ABS",
      "MBS",
    ],
  },
  {
    cle: "derivatives",
    cours: "derivatives",
    banque: [68, 69, 70, 71, 72, 73, 74, 75, 76, 77],
    schweser: [66, 67, 68, 69, 70, 71, 72, 73, 74, 75],
    // fiche d'un seul tenant (app/fiches/derivatives) : une ancre #r<n> par
    // reading, en numérotation Schweser
    ficheParReading: "derivatives",
    courts: [
      "Marchés dérivés",
      "Engagements fermes et droits conditionnels",
      "Usages des dérivés",
      "Arbitrage et coût de portage",
      "Forwards",
      "Futures",
      "Swaps",
      "Options",
      "Parité put-call",
      "Modèle binomial",
    ],
  },
  {
    cle: "alternatives",
    cours: "alternative-investments",
    banque: [78, 79, 80, 81, 82, 83, 84],
    schweser: [76, 77, 78, 79, 80, 81, 82],
    courts: [
      "Structures des alternatifs",
      "Rendements et frais des alternatifs",
      "Private equity et dette privée",
      "Immobilier et infrastructures",
      "Ressources naturelles",
      "Hedge funds",
      "Actifs numériques",
    ],
  },
  {
    cle: "portfolio",
    cours: "portfolio-management",
    banque: [20, 21, 85, 86, 87, 88],
    schweser: [83, 84, 85, 86, 87, 88],
    courts: [
      "Risque et diversification",
      "CAPM et bêta",
      "Processus de gestion",
      "IPS et allocation",
      "Biais comportementaux",
      "Gestion des risques",
    ],
  },
];

// Sous-parties de la banque pour Guidance for Standards I–VII (Ethics LM 3) :
// un fichier par standard, qui sert de concept pour ces questions.
export const SOUS_PARTIES = {
  "91.1": "Standards I(A) et I(B)",
  "91.2": "Standards I(C) et I(D)",
  "91.3": "Standard II",
  "91.4": "Standards III(A) et III(B)",
  "91.5": "Standards III(C), III(D) et III(E)",
  "91.6": "Standard IV",
  "91.7": "Standard V",
  "91.8": "Standard VI",
  "91.9": "Standard VII",
};

// R91.1 (« Guidance for Standards I(A) and I(B) », 104 questions contre 19 à
// 54 pour les autres) sert de fourre-tout : beaucoup de ses questions portent
// sur d'autres standards. Pour lui seul, le concept se lit dans l'explication
// de la banque : l'étiquette « LOS 91: I(A) », sinon le premier standard cité,
// par son numéro (« Standard III(B) ») ou par son nom (« the Standard on fair
// dealing ») ; il est ramené à sa sous-partie, et à défaut il n'y a pas de
// concept. Les autres sous-parties ne citent que leurs propres standards.
export const SOUS_PARTIE_FOURRE_TOUT = "91.1";

// Noms des standards tels que les explications de la banque les citent
// (« Standard on … », « Standard concerning … », « Standard of … »).
export const NOMS_DES_STANDARDS = {
  "knowledge of the law": "I(A)",
  "independence and objectivity": "I(B)",
  misrepresentation: "I(C)",
  misconduct: "I(D)",
  "material nonpublic information": "II(A)",
  "market manipulation": "II(B)",
  "loyalty, prudence, and care": "III(A)",
  "fair dealing": "III(B)",
  suitability: "III(C)",
  "performance presentation": "III(D)",
  "preservation of confidentiality": "III(E)",
  loyalty: "IV(A)",
  "additional compensation": "IV(B)",
  "responsibilities of supervisors": "IV(C)",
  "supervisory responsibilities": "IV(C)",
  "diligence and reasonable basis": "V(A)",
  "communication with clients": "V(B)",
  "record retention": "V(C)",
  "disclosure of conflicts": "VI(A)",
  "priority of transactions": "VI(B)",
  "referral fees": "VI(C)",
  "conduct as participants": "VII(A)",
  "reference to cfa institute": "VII(B)",
};

// Les titres de séries qui suivent la numérotation Schweser (anciens lots,
// remplacés en base mais encore cités par d'anciens historiques). Tout autre
// titre « (Rn) » suit la numérotation de la banque.
export const TITRES_SCHWESER = [
  "Fixed-Income Instruments & Markets — QCM (R47–R51)",
  "Bond Valuation & Yield Measures — QCM (R52–R54)",
  "Term Structure of Interest Rates — QCM (R55)",
  "Interest Rate Risk: Duration & Convexity — QCM (R56–R59)",
  "Credit Analysis — QCM (R60–R62)",
  "Securitization, ABS & MBS — QCM (R63–R65)",
  "Fixed-Income Instruments & Markets (R47–R51)",
  "Bond Valuation & Yield Measures (R52–R54)",
  "Term Structure of Interest Rates (R55)",
  "Interest Rate Risk: Duration & Convexity (R56–R59)",
  "Credit Analysis (R60–R62)",
  "Securitization, ABS & MBS (R63–R65)",
];

// Questions qu'aucune règle ne range (à la frontière de deux readings d'un
// QCM, texte du PDF illisible), tranchées à la lecture de l'énoncé :
// empreinte de l'énoncé (scripts/notions/commun.mjs) → reading de la banque.
export const ARBITRAGES = {
  // « As of December 31: Company A - price $25, 20,000 shares outstanding… » (QCM R41–R42) :
  // pondération d'un indice par le prix ou la capitalisation → Security Market Indexes
  "28f163dbb74b331e": { reading: "42" },
};

// Pages de fiche mises en tête des liens d'une notion, avant celles que
// donnent les drills (une page compte quand la question officielle d'un de
// ses concepts est rangée dans le reading de la notion) : la page qui traite
// la notion sans qu'aucune officielle n'y soit rangée, ou celle qui la traite
// le mieux quand la banque range ailleurs ses officielles.
export const FICHES_EN_TETE = {
  // page 1 « Bond Features & Valuation Basics »
  "fixed_income:1": { fiche: "fixed-income", pages: [1] },
  // page 1 « Bond Features » avant la page 7 : la banque range en R50 deux
  // officielles de la titrisation (SPE, bankruptcy remoteness)
  "fixed_income:2": { fiche: "fixed-income", pages: [1] },
  // page 4 « Interest Rate Risk & Duration » : convexité par bump, ajustement de convexité
  "fixed_income:12": { fiche: "fixed-income", pages: [4] },
};

// Dossiers « (Système) » → matière (les QCM de la banque et les drills)
export const DOSSIERS = {
  "Éthique et Standards Professionnels (Système)": "ethics",
  "Méthodes Quantitatives (Système)": "quant",
  "Économie (Système)": "economics",
  "Finance d'Entreprise (Système)": "corporate",
  "Analyse des États Financiers (Système)": "fsa",
  "Financial Statement Analysis (Système)": "fsa",
  "Investissements en Actions (Système)": "equity",
  "Equity (Système)": "equity",
  "Fixed Income (Système)": "fixed_income",
  "Instruments Dérivés (Système)": "derivatives",
  "Investissements Alternatifs (Système)": "alternatives",
  "Gestion de Portefeuille (Système)": "portfolio",
  "Portfolio Management (Système)": "portfolio",
};

// Préfixe des titres de drill « <préfixe> — Drill Fiche Page N » → matière et fiche
export const DRILLS = {
  "Financial Statement Analysis": { matiere: "fsa", fiche: "financial-statement-analysis", script: "fsa" },
  Equity: { matiere: "equity", fiche: "equity", script: "equity" },
  "Fixed Income": { matiere: "fixed_income", fiche: "fixed-income", script: "fixed-income" },
  "Portfolio Management": { matiere: "portfolio", fiche: "portfolio-management", script: "pm" },
};
