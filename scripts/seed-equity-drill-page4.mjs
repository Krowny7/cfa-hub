// Seed script — quiz de "drill" associé à la page 4 de la fiche PDF Equity
// (Overview of Equity Securities). Questions officielles sélectionnées
// depuis la banque de pratique (Reading 44), corrigé vérifié contre le PDF
// "- Answers.pdf" correspondant — jamais recalculé/inventé.
// Usage: node scripts/seed-equity-drill-page4.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Equity (Système)";

const QUIZ_SETS = [
  {
    title: "Equity — Drill Fiche Page 4 (Overview of Equity Securities)",
    difficulty: 1,
    questions: [
      [
        "With which of the following types of equity shares does the investor typically have the greatest voting power?",
        ["Common shares.", "Participating preference shares.", "Unsponsored depository receipts."],
        0,
        "Les actions ordinaires (common shares) confèrent généralement des droits de vote, contrairement aux actions préférentielles qui n'en ont généralement pas. Pour les certificats de dépôt non parrainés (unsponsored depositary receipts), c'est la banque dépositaire qui conserve le droit de vote sur les actions sous-jacentes, pas l'investisseur.",
      ],
      [
        "The book value of equity is equal to a firm's assets:",
        ["plus its accumulated other comprehensive income.", "plus its retained earnings.", "minus its liabilities."],
        2,
        "La valeur comptable des capitaux propres correspond aux actifs du bilan moins les passifs (Actif − Passif = Capitaux propres). Les réponses A et B ne représentent que des composantes de la variation des capitaux propres, pas la formule complète du bilan.",
      ],
      [
        "A basket of listed depository receipts (BLDR) is best described as a(n):",
        ["exchange traded fund of depository receipts.", "index of global depository receipts that trade on a specific exchange.", "special purpose vehicle for issuing depository receipts in multiple countries."],
        0,
        "Un BLDR est un fonds négocié en bourse (ETF) qui représente un portefeuille de certificats de dépôt. Ce n'est ni un indice (B) ni un véhicule spécial d'émission (C).",
      ],
      [
        "Preference shares will have the most risk for the investor if the shares are:",
        ["callable and cumulative.", "callable and non-cumulative.", "non-callable and non-cumulative."],
        1,
        "Les actions rachetables (callable) limitent le potentiel de gain en capital car l'émetteur peut les racheter à un prix fixé, et les actions non cumulatives sont plus risquées que les cumulatives car les dividendes omis ne sont pas dus ultérieurement. La combinaison callable + non-cumulative cumule donc le plus de risque pour l'investisseur.",
      ],
      [
        "Compared to a publicly traded firm, a private equity firm is most likely to:",
        ["disclose less financial information.", "exhibit stronger corporate governance.", "be more concerned with short-term results."],
        0,
        "Les sociétés de capital-investissement ne sont pas soumises aux mêmes obligations de publication d'informations financières que les sociétés cotées, ce qui les amène à divulguer moins d'informations. À l'inverse, avec moins de pression du marché public, elles sont généralement davantage orientées vers le long terme.",
      ],
      [
        "The primary reason for a firm to issue equity securities is to:",
        ["acquire the assets necessary to carry out its operations.", "improve its solvency ratios.", "increase publicity for the firm's products."],
        0,
        "La raison principale d'émettre des actions est de lever les capitaux nécessaires à l'acquisition des actifs d'exploitation. L'amélioration des ratios de solvabilité et la publicité ne sont que des effets secondaires possibles, pas la raison première.",
      ],
      [
        "Hodges Fund provides mezzanine stage financing to private companies. In which type of private equity investing is Hodges Fund most likely involved?",
        ["Leveraged buyout.", "Private investment in public equity.", "Venture capital."],
        2,
        "Le financement de stade « mezzanine » est une étape du capital-risque (venture capital), qui comprend les stades seed, early stage et mezzanine. Un LBO rachète la totalité des capitaux propres d'une société publique pour la retirer de la cote, et un PIPE est un investissement privé dans une société déjà cotée — ni l'un ni l'autre ne correspond au financement mezzanine d'une société privée.",
      ],
      [
        "In a period when U.S. equity prices are increasing and the U.S. dollar is depreciating, which of the following investors in U.S. equities is most likely to earn the highest return in the investor's local currency?",
        ["Non-U.S. investor who does not reinvest dividends.", "Non-U.S. investor who reinvests dividends.", "U.S. investor who reinvests dividends."],
        2,
        "Réinvestir les dividendes accroît le rendement dans un marché haussier par rapport à ne pas les réinvestir. Mais comme le dollar se déprécie, l'investisseur non américain subit une perte de change qui réduit son rendement en devise locale — c'est donc l'investisseur américain qui réinvestit les dividendes (sans risque de change) qui réalise le meilleur rendement.",
      ],
      [
        "Two seats on a board of directors are to be elected. A voting system in which the owner of 100 shares may cast 100 votes in each of the board elections is a:",
        ["cumulative voting system.", "proportional voting system.", "statutory voting system."],
        2,
        "Dans un système de vote statutaire (statutory voting), l'actionnaire vote avec la totalité de ses actions pour chaque poste soumis à élection séparément (ici 100 voix à chacune des deux élections). Dans un système de vote cumulatif, l'actionnaire pourrait au contraire concentrer l'ensemble de ses voix (200 dans cet exemple) sur un seul candidat.",
      ],
      [
        "A security that represents an equity share in a foreign firm and for which the voting rights are retained by the depository bank, is a(n):",
        ["American depository share.", "global registered share.", "unsponsored depository receipt."],
        2,
        "Dans un certificat de dépôt non parrainé, c'est la banque dépositaire qui conserve les droits de vote des actions sous-jacentes, et non l'investisseur. Une American depositary share est le titre sous-jacent négocié sur le marché domestique de l'émetteur, et une global registered share se négocie directement dans les devises locales sur des bourses du monde entier — ni l'une ni l'autre ne correspond à la description donnée.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");

  console.log("Drill QCM — Fiche Equity Page 4...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });

  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
