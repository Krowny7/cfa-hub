import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";
const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 7 (Topics in Long-Term Liabilities and Equity)",
    difficulty: 2,
    questions: [
      [
        "ABC Company loue un équipement de production pour cinq ans, avec des paiements annuels de 20 000 $. L'entreprise rendra l'équipement au bailleur à la fin du contrat. La durée du contrat de location est égale à la durée de vie utile de l'équipement. Sous US GAAP, l'entreprise va :",
        [
          "présenter le contrat comme une location simple (operating lease).",
          "comptabiliser un droit d'utilisation (right-of-use asset) au bilan.",
          "comptabiliser une charge d'amortissement égale au remboursement de principal de chaque période.",
        ],
        1,
        "L'entreprise présentera une location financement (finance lease) car la durée du contrat équivaut à la durée de vie utile de l'actif. Avec une location financement, l'entreprise comptabilise la valeur actualisée des paiements de location au bilan sous forme de droit d'utilisation, amorti linéairement sur la durée du contrat.",
      ],
      [
        "Une compagnie aérienne loue un nouvel avion auprès de son fabricant pour 10 ans. Pour sa communication financière, la compagnie aérienne doit comptabiliser un actif et un passif à son bilan :",
        [
          "uniquement si le contrat est une location financement.",
          "uniquement si le contrat est une location simple.",
          "que le contrat soit une location financement ou une location simple.",
        ],
        2,
        "Pour les locations financement comme pour les locations simples, les IFRS et les US GAAP exigent qu'un actif et un passif soient comptabilisés au bilan du preneur, sauf exception pour les contrats de courte durée ou (sous IFRS) pour les actifs de faible valeur.",
      ],
      [
        "Un employeur propose un régime de retraite à prestations définies et un régime à cotisations définies. Le bilan de l'employeur est le plus vraisemblablement susceptible de présenter un actif ou un passif lié :",
        ["au régime à prestations définies.", "au régime à cotisations définies.", "aux deux régimes de retraite."],
        0,
        "Seul un régime à prestations définies possède un statut de financement (funded status) qui apparaît au bilan sous forme d'actif ou de passif. Les versements de l'employeur dans un régime à cotisations définies sont comptabilisés en charges de la période où ils sont engagés, sans créer d'actif ou de passif au bilan.",
      ],
      [
        "Sous quels référentiels comptables la rémunération en actions (share-based compensation) est-elle passée en charges au compte de résultat sur la période d'acquisition des droits (vesting period) ?",
        ["Les IFRS, mais pas les US GAAP.", "Les US GAAP, mais pas les IFRS.", "Les IFRS et les US GAAP."],
        2,
        "Les IFRS et les US GAAP exigent tous deux que les entreprises estiment la juste valeur de la rémunération en actions à la date d'attribution et la passent en charges au compte de résultat sur la période d'acquisition des droits.",
      ],
      [
        "Pour un preneur (lessee), la portion d'un paiement de location qui représente le remboursement du principal constitue un flux de trésorerie :",
        ["d'exploitation.", "de financement.", "d'investissement."],
        1,
        "La portion principal d'un paiement de location est un flux sortant de financement dans le tableau des flux de trésorerie du preneur. La portion intérêt est un flux sortant d'exploitation sous US GAAP, et peut être traitée comme exploitation ou financement sous IFRS.",
      ],
      [
        "Laquelle des affirmations suivantes est la moins susceptible d'être un objectif des annexes exigées par IAS 19 concernant les régimes à prestations définies ?",
        [
          "Expliquer les caractéristiques et les risques du régime à prestations définies de l'entreprise.",
          "Identifier les montants dans les états financiers liés aux régimes à prestations définies.",
          "Décrire comment les régimes à prestations définies affectent les montants, le calendrier et les incertitudes liées au résultat net futur.",
        ],
        2,
        "Bien que les régimes à prestations définies aient un impact sur le résultat net futur, l'objectif fixé par IAS 19 est de décrire comment ces régimes affectent les montants, le calendrier et les incertitudes liées aux flux de trésorerie futurs (et non au résultat net). Les deux autres options sont bien des objectifs explicites d'IAS 19.",
      ],
      [
        "La différence entre la juste valeur des actifs d'un régime de retraite à prestations définies et son obligation de prestations estimée est comptabilisée :",
        [
          "comme un ajustement actuariel dans les autres éléments du résultat global.",
          "au bilan comme un actif ou un passif net de retraite.",
          "au compte de résultat comme charge de retraite.",
        ],
        1,
        "Un actif net de retraite ou un passif net de retraite correspond à la différence entre la juste valeur des actifs du régime et l'obligation de prestations estimée. Un régime avec un actif net est dit surfinancé, et un régime avec un passif net est dit sous-financé.",
      ],
      [
        "Pour une location simple (operating lease), l'actif physique loué apparaît au bilan :",
        ["ni du bailleur ni du preneur.", "du bailleur.", "du preneur."],
        1,
        "Avec une location simple, l'actif loué reste sur le bilan du bailleur, qui continue à en comptabiliser l'amortissement. Le preneur, lui, est tenu de comptabiliser un actif et un passif égaux à la valeur actualisée des paiements de location promis, mais l'actif physique sous-jacent reste au bilan du bailleur.",
      ],
      [
        "Lorsque les risques liés à la propriété d'un actif ne sont pas substantiellement transférés au preneur, un contrat de location est le plus vraisemblablement présenté comme :",
        ["une location financement.", "une location simple.", "une location d'investissement."],
        1,
        "Le preneur comme le bailleur présentent un contrat de location comme une location simple lorsque les risques liés à la propriété de l'actif ne sont pas substantiellement transférés au preneur — c'est le critère distinctif entre location simple et location financement.",
      ],
      [
        "Pour un contrat de location long terme, le montant initialement comptabilisé par le preneur en tant que passif est :",
        [
          "la valeur actualisée des paiements de location.",
          "le total des paiements de location.",
          "la juste valeur de l'actif loué.",
        ],
        0,
        "Avec une location financement, le preneur comptabilise à la fois un actif et un passif au bilan, tous deux égaux à la valeur actualisée des paiements de location promis — et non le total non actualisé des paiements, ni nécessairement la juste valeur de l'actif sous-jacent.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Financial Statement Analysis Page 7...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
