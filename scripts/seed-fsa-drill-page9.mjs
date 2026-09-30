// Seed script — quiz de "drill" associé à la page 9 de la fiche PDF FSA
// (Financial Reporting Quality). Structure : 5 concepts × (1 question
// officielle + 1 variante "angle différent" + 1 variante "plus
// difficile"). Voir memory regle-drill-variantes-cfa-hub. Questions en
// anglais, explications en français.
// Usage: node scripts/seed-fsa-drill-page9.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 9 (Financial Reporting Quality)",
    difficulty: 2,
    questions: [
      // Concept 1 — Le spectre de qualité de la communication financière (officielle)
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
      // Variante angle différent — un point DIFFÉRENT du spectre (pas le sommet)
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
      // Variante plus difficile — classer TROIS scénarios simultanément sur l'ensemble du spectre
      [
        "Rank the following three financial reporting scenarios from HIGHEST to LOWEST financial reporting quality: (1) GAAP-compliant, with biased (but not fraudulent) accounting estimates; (2) not compliant with GAAP, but the numbers presented reflect the company's actual economic activities; (3) GAAP-compliant, decision-useful, with unbiased estimates, but earnings that are not sustainable.",
        ["3 > 1 > 2.", "1 > 3 > 2.", "3 > 2 > 1."],
        0,
        "Le scénario 3 (conforme, utile, non biaisé, juste des résultats non durables) se situe juste sous le sommet. Le scénario 1 (conforme mais biaisé) est plus bas, car le biais dégrade la fidélité de la présentation. Le scénario 2 (non conforme au GAAP) se situe encore plus bas sur le spectre, même si les chiffres reflètent la réalité économique — la non-conformité pèse lourd.",
      ],

      // Concept 2 — Opportunité / motivation / rationalisation (officielle)
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
      // Variante angle différent — identifier UNE condition à partir d'un scénario narratif
      [
        "A CFO under pressure to meet an aggressive earnings target convinces herself that inflating revenue this quarter is acceptable because the shortfall will be \"made up\" next quarter. This best illustrates which condition associated with low-quality financial reporting?",
        ["Opportunity.", "Motivation.", "Rationalization."],
        2,
        "Se convaincre que l'acte est acceptable ou temporaire est l'essence même de la rationalisation — la justification morale que se donne la personne pour agir malgré la mauvaise qualité de l'information produite.",
      ],
      // Variante plus difficile — associer TROIS faits aux TROIS conditions simultanément
      [
        "A company's CEO compensation is heavily weighted toward stock price performance; its board of directors lacks independent oversight and rarely challenges management; and the CEO has stated that \"everyone in the industry manages earnings somewhat, so it's not really dishonest.\" Matching each fact, in order, to the condition it illustrates among opportunity, motivation, and rationalization gives:",
        [
          "Motivation, Opportunity, Rationalization.",
          "Opportunity, Motivation, Rationalization.",
          "Rationalization, Motivation, Opportunity.",
        ],
        0,
        "La rémunération liée au cours de bourse crée une incitation à manipuler (motivation). Un conseil d'administration peu indépendant crée les conditions permettant à la manipulation de passer inaperçue (opportunité). La croyance que « tout le monde le fait » est une justification morale (rationalisation). Il faut faire correspondre les trois faits aux trois conditions simultanément, pas une seule à la fois.",
      ],

      // Concept 3 — Capitalisation = CFO plus élevé (officielle)
      [
        "Compared to a firm that appropriately expenses recurring maintenance costs, a firm that capitalizes these costs will report greater cash flow from:",
        ["operating activities.", "financing activities.", "investing activities."],
        0,
        "Capitaliser classe la sortie de trésorerie en investissement (CFI) plutôt qu'en exploitation (CFO), ce qui donne un CFO plus élevé comparé à la passation en charges des mêmes coûts.",
      ],
      // Variante angle différent — effet combiné sur CFO ET CFI, pas seulement le CFO
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
      // Variante plus difficile — retraiter un CFO ET un résultat net à partir d'une capitalisation contestée
      [
        "A company capitalizes $2 million of costs that most analysts believe should have been expensed under a more conservative interpretation of the standard. The company's reported CFO was $15 million and its reported net income was $8 million for the year, with none of the $2 million yet amortized. If an analyst restates the financials by expensing the $2 million instead (ignore tax effects), the analyst's \"normalized\" CFO and net income would be closest to:",
        [
          "CFO $13 million, net income $6 million.",
          "CFO $17 million, net income $10 million.",
          "CFO $13 million, net income $8 million.",
        ],
        0,
        "Repasser les 2 M$ de capitalisation en charges déplace cette sortie de trésorerie de l'investissement vers l'exploitation : le CFO retraité baisse à 13 M$ (15−2). Le résultat net baisse du même montant puisque la charge, auparavant capitalisée (donc non déduite cette année), impacte désormais directement le résultat : 8−2=6 M$. Il faut retraiter les DEUX indicateurs ensemble, pas seulement le CFO.",
      ],

      // Concept 4 — Hausse des délais fournisseurs = signal d'alerte (officielle)
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
      // Variante angle différent — comparer la hausse des délais fournisseurs à d'autres signaux
      [
        "Which of the following would most likely raise a red flag about the sustainability of a company's reported operating cash flow?",
        ["A stable days sales outstanding (DSO) over time.", "A significant, sudden increase in days payables outstanding.", "A gradual decrease in days inventory on hand."],
        1,
        "Seule la hausse soudaine des délais fournisseurs est un signal d'alerte typique ; un DSO stable et une baisse progressive des jours de stock sont au contraire des signes de gestion normale, voire positive.",
      ],
      // Variante plus difficile — synthétiser DEUX signaux opposés (DPO en hausse, DSO en baisse)
      [
        "A company's days payables outstanding increased from 45 to 75 days this year, while its days sales outstanding decreased from 60 to 40 days, and days inventory on hand remained stable. Which of the following is the most appropriate interpretation of the company's improved operating cash flow this year?",
        [
          "The improvement is entirely genuine, since faster customer collections more than offset slower supplier payments.",
          "The improvement in CFO is partly or fully attributable to stretching supplier payments, which is not sustainable, regardless of the genuine improvement in collections.",
          "The change in days payables outstanding has no effect on operating cash flow, only on financing cash flow.",
        ],
        1,
        "Même si le DSO en baisse reflète une vraie amélioration de la collecte, l'analyste doit isoler et rester prudent sur la part du CFO due à l'étirement des délais fournisseurs (DPO en forte hausse), qui n'est pas durable — un bon signal ne compense pas, ni n'efface, un signal d'alerte distinct.",
      ],

      // Concept 5 — Action la moins susceptible d'augmenter les résultats (officielle)
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
      // Variante angle différent — quel choix comptable DIMINUE les résultats (reformulation positive)
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
      // Variante plus difficile — calculer l'augmentation de charge d'amortissement suite à un changement d'estimation
      [
        "A company depreciates an asset with an original cost of $500,000, straight-line over 10 years, with an original salvage value estimate of $50,000. After 4 years of depreciation, management revises the salvage value estimate down to $20,000, with the remaining useful life unchanged at 6 years. The resulting INCREASE in annual depreciation expense going forward is closest to:",
        ["$3,000.", "$5,000.", "$8,000."],
        1,
        "Amortissement annuel d'origine = (500 000 − 50 000)/10 = 45 000 $/an. Valeur comptable après 4 ans = 500 000 − 4×45 000 = 320 000 $. Nouvel amortissement annuel = (320 000 − 20 000)/6 ans restantes = 50 000 $/an. Augmentation = 50 000 − 45 000 = 5 000 $. Ce changement d'estimation s'applique de façon PROSPECTIVE, sur la valeur comptable et la durée restantes — un calcul à plusieurs étapes bien plus exigeant que la question conceptuelle officielle.",
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
