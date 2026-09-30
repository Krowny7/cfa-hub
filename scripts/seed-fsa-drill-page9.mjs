// Seed script — quiz de "drill" associé à la page 9 de la fiche PDF FSA
// (Financial Reporting Quality). Structure Fixed Income : 5 concepts × 3
// variantes (questions en anglais ; explications en français). Concept 1
// = question officielle du PDF imprimé (qcm_data/fsa_raw.txt) ; variantes
// 2-3 testent le même concept différemment.
// Usage: node scripts/seed-fsa-drill-page9.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 9 (Financial Reporting Quality)",
    difficulty: 2,
    questions: [
      // Concept 1 — Le spectre de qualité de la communication financière
      [
        "On a spectrum for assessing financial reporting quality, which of the following represents the highest quality?",
        [
          "Reporting is compliant with GAAP and decision useful but earnings are not sustainable.",
          "Reporting is compliant with GAAP but reporting choices and estimates are biased.",
          "Reporting is not compliant with GAAP but the numbers presented reflect the company's actual activities.",
        ],
        0,
        "Une entreprise peut avoir une communication financière de haute qualité même si la qualité de ses résultats est faible (résultats non durables mais clairement identifiés). Des choix comptables biaisés et une non-conformité au GAAP représentent une communication de moindre qualité.",
      ],
      [
        "Which of the following best describes financial reports that would be placed at the highest-quality end of the financial reporting quality spectrum?",
        [
          "Compliant with GAAP, decision-useful, and reflecting sustainable, adequate earnings.",
          "Compliant with GAAP but reflecting earnings management within the bounds of GAAP.",
          "Non-compliant with GAAP but reflecting the company's true economic activities.",
        ],
        0,
        "Le sommet du spectre combine les deux dimensions : une communication financière de haute qualité (conforme, utile à la décision) ET des résultats de haute qualité (durables, adéquats).",
      ],
      [
        "On the spectrum of financial reporting quality, reports that are compliant with GAAP and decision-useful, but reflect non-sustainable or inadequate earnings, would most likely be ranked:",
        [
          "at the very highest end of the spectrum.",
          "just below GAAP-compliant reports with high-quality, sustainable earnings.",
          "at the very lowest end of the spectrum, equivalent to fraudulent reporting.",
        ],
        1,
        "Une communication financière conforme et utile, mais avec des résultats non durables, se situe juste en dessous du sommet du spectre — la qualité de la communication est là, mais la qualité des résultats fait défaut.",
      ],
      // Concept 2 — Opportunité / motivation / rationalisation
      [
        "Conditions that may cause firms to issue low-quality financial reports are best described as:",
        [
          "opportunity, motivation, and rationalization.",
          "unstable organizational structure and deficient internal controls.",
          "inappropriate ethical standards and failing to correct known reportable conditions.",
        ],
        0,
        "Les trois conditions classiques conduisant à une communication financière de mauvaise qualité sont l'opportunité, la motivation, et la rationalisation.",
      ],
      [
        "A company's weak internal controls and lack of independent board oversight are most closely associated with which condition that can lead to low-quality financial reporting?",
        ["Motivation.", "Opportunity.", "Rationalization."],
        1,
        "Des contrôles internes faibles et une gouvernance déficiente créent l'opportunité de manipuler les comptes — c'est un environnement propice, pas une incitation (motivation) ni une justification morale (rationalisation).",
      ],
      [
        "A CFO under pressure to meet an aggressive earnings target convinces herself that inflating revenue this quarter is acceptable because the shortfall will be \"made up\" next quarter. This best illustrates which condition associated with low-quality financial reporting?",
        ["Opportunity.", "Motivation.", "Rationalization."],
        2,
        "Se convaincre que l'acte est acceptable ou temporaire est l'essence même de la rationalisation — la justification morale que se donne la personne pour agir malgré la mauvaise qualité de l'information produite.",
      ],
      // Concept 3 — Capitalisation = CFO plus élevé
      [
        "Compared to a firm that appropriately expenses recurring maintenance costs, a firm that capitalizes these costs will report greater cash flow from:",
        ["operating activities.", "financing activities.", "investing activities."],
        0,
        "Capitaliser classe la sortie de trésorerie en investissement (CFI) plutôt qu'en exploitation (CFO), ce qui donne un CFO plus élevé comparé à la passation en charges des mêmes coûts.",
      ],
      [
        "Compared to a firm that expenses recurring maintenance costs as incurred, a firm that capitalizes the same costs will report lower cash flow from:",
        ["operating activities.", "investing activities.", "financing activities."],
        1,
        "La trésorerie sortante liée aux coûts capitalisés apparaît en investissement (CFI), pas en exploitation — donc le CFI est plus faible (plus de sorties) et le CFO est plus élevé, comparé à la passation en charges.",
      ],
      [
        "A firm's decision to capitalize, rather than expense, a recurring cash cost will most likely result in:",
        [
          "higher CFO and lower CFI, relative to expensing the same cost.",
          "lower CFO and higher CFI, relative to expensing the same cost.",
          "no change in CFO or CFI, only in net income.",
        ],
        0,
        "Capitaliser déplace la sortie de trésorerie de la section exploitation vers la section investissement : le CFO augmente (moins de sorties d'exploitation) et le CFI diminue (plus de sorties d'investissement), comparé à la passation en charges.",
      ],
      // Concept 4 — Hausse des délais fournisseurs = signal d'alerte
      [
        "A significant increase in days payables above historical levels is most likely associated with:",
        [
          "an increase in net working capital.",
          "an unsustainable increase in reported earnings.",
          "low quality of the cash flow statement.",
        ],
        2,
        "Une forte hausse des délais fournisseurs peut indiquer un « étirement » des paiements, gonflant le CFO de façon non durable et remettant en cause la qualité du tableau des flux. Cela n'affecte pas les résultats et diminue, plutôt qu'augmente, le fonds de roulement net.",
      ],
      [
        "An analyst notices that a company's days payable outstanding has increased sharply compared to prior years and industry peers. This is most likely a signal of:",
        [
          "improved supplier relationships and negotiating power.",
          "potential low quality of the operating cash flow.",
          "an increase in the company's net working capital.",
        ],
        1,
        "Un allongement soudain et marqué des délais fournisseurs est un signal d'alerte classique sur la qualité (et la durabilité) du flux de trésorerie d'exploitation, pas une bonne nouvelle en soi.",
      ],
      [
        "Which of the following would most likely raise a red flag about the sustainability of a company's reported operating cash flow?",
        [
          "A stable days sales outstanding (DSO) over time.",
          "A significant, sudden increase in days payables outstanding.",
          "A gradual decrease in days inventory on hand.",
        ],
        1,
        "Seule la hausse soudaine des délais fournisseurs est un signal d'alerte typique ; un DSO stable et une baisse progressive des jours de stock sont au contraire des signes de gestion normale, voire positive.",
      ],
      // Concept 5 — Action la moins susceptible d'augmenter les résultats
      [
        "Which of the following actions is least likely to increase earnings for the current period?",
        [
          "Decreasing the salvage value of depreciable assets.",
          "Recognizing revenue before fulfilling the terms of a sale.",
          "Selling more inventory than is purchased or produced.",
        ],
        0,
        "Diminuer la valeur résiduelle augmente la charge d'amortissement et réduit donc les résultats de la période — c'est l'inverse d'une manipulation à la hausse, contrairement aux deux autres pratiques agressives.",
      ],
      [
        "Which of the following accounting choices would most likely decrease a firm's reported earnings in the current period?",
        [
          "Increasing the estimated useful life of depreciable assets.",
          "Decreasing the estimated salvage value of depreciable assets.",
          "Recognizing revenue earlier than is appropriate.",
        ],
        1,
        "Diminuer la valeur résiduelle estimée augmente la base amortissable et donc la charge d'amortissement de la période, ce qui réduit le résultat — contrairement aux deux autres choix, qui l'augmentent.",
      ],
      [
        "A firm wants to aggressively boost its reported earnings for the current period. Which of the following actions would be LEAST effective in achieving this goal?",
        [
          "Increasing the estimated useful life of depreciable assets.",
          "Decreasing the estimated salvage value of depreciable assets.",
          "Capitalizing costs that should properly be expensed.",
        ],
        1,
        "Diminuer la valeur résiduelle va dans le sens opposé de l'objectif recherché : elle augmente la charge d'amortissement et réduit le résultat, alors que les deux autres actions augmentent bien les résultats publiés.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Financial Statement Analysis Page 9...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
