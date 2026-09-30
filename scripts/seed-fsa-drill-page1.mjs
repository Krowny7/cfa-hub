// Seed script — quiz de "drill" associé à la page 1 de la fiche PDF FSA
// (Introduction to Financial Statement Analysis). Même structure que les
// fiches Fixed Income : 5 concepts × 3 variantes (questions en anglais,
// terminologie de l'examen ; explications en français). Le concept 1 de
// chaque groupe est la question officielle déjà utilisée dans le PDF
// imprimé (source : banque officielle, cf. qcm_data/fsa_raw.txt) ; les
// variantes 2 et 3 sont rédigées pour tester le même concept sous un
// angle différent.
// Usage: node scripts/seed-fsa-drill-page1.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 1 (Introduction to Financial Statement Analysis)",
    difficulty: 1,
    questions: [
      // Concept 1 — Le framework d'analyse en 6 étapes
      [
        "Which of the following is the best description of the financial statement analysis framework?",
        [
          "Gather data, analyze and interpret the data, process the conclusions, assess the context, report the recommendations, update the analysis.",
          "State the objective and context, gather data, process the data, analyze and interpret the data, report the conclusions or recommendations, update the analysis.",
          "Gather data, analyze and interpret the data, determine the context, report the conclusions, update the analysis.",
        ],
        1,
        "Le framework compte 6 étapes dans cet ordre précis : (1) énoncer l'objectif et le contexte, (2) collecter les données, (3) traiter les données, (4) analyser et interpréter, (5) rapporter les conclusions/recommandations, (6) mettre à jour l'analyse. Les options A et C mélangent l'ordre et omettent l'étape de traitement des données.",
      ],
      [
        "In the financial statement analysis framework, which step immediately follows \"gather data\"?",
        ["Analyze and interpret the data.", "Process the data.", "State the objective and context."],
        1,
        "L'ordre est : objectif et contexte → collecte des données → traitement des données → analyse et interprétation → conclusions → mise à jour. Après la collecte vient donc le traitement (calcul de ratios, ajustements), pas directement l'analyse ni le retour en arrière vers l'objectif.",
      ],
      [
        "Which of the following is correctly the very first step of the financial statement analysis framework?",
        ["Gather data.", "State the objective and context of the analysis.", "Process the data."],
        1,
        "La toute première étape consiste à définir l'objectif et le contexte de l'analyse (pourquoi fait-on cette analyse, pour qui, avec quelles contraintes) — c'est ce cadrage qui détermine ensuite quelles données collecter, pas l'inverse.",
      ],
      // Concept 2 — Ce que garantit le rapport d'audit standard
      [
        "The standard auditor's report is most likely required to:",
        [
          "provide an \"unqualified\" opinion if material uncertainties exist.",
          "provide reasonable assurance that management is reliable.",
          "provide reasonable assurance that the financial statements contain no material errors.",
        ],
        2,
        "L'audit est mené selon les normes d'audit généralement acceptées, qui offrent une assurance raisonnable (jamais absolue) que les états financiers sont exempts d'erreurs matérielles. L'auditeur ne se prononce jamais sur la fiabilité de la direction, et une opinion sans réserve suppose l'absence d'incertitude matérielle significative.",
      ],
      [
        "Which of the following best describes what a standard, unqualified auditor's report confirms?",
        [
          "That the financial statements are completely free of any error, material or not.",
          "That the financial statements are, in all material respects, fairly presented in accordance with the applicable accounting standards.",
          "That management's strategic decisions and business plan are sound.",
        ],
        1,
        "L'opinion sans réserve porte sur la présentation fidèle des états financiers dans leurs aspects significatifs (« in all material respects »), selon le référentiel comptable applicable — jamais sur l'absence totale d'erreur (même mineure) ni sur la qualité des décisions de gestion.",
      ],
      [
        "An auditor's report most likely provides:",
        [
          "absolute assurance that no fraud has occurred anywhere in the company.",
          "reasonable assurance that the financial statements are free from material misstatement.",
          "an opinion on the appropriateness of management's compensation.",
        ],
        1,
        "L'assurance fournie par l'auditeur est toujours raisonnable, jamais absolue — un audit ne peut garantir l'absence totale de fraude (notamment en cas de collusion), et il ne porte jamais sur la rémunération des dirigeants, qui n'entre pas dans le champ de l'opinion d'audit.",
      ],
      // Concept 3 — Contenu obligatoire du MD&A (US)
      [
        "For publicly traded firms in the United States, the Management Discussion and Analysis (MD&A) portion of the financial disclosure is least likely required to discuss:",
        ["capital resources and liquidity.", "results of operations.", "unusual or infrequent items."],
        2,
        "Le MD&A américain doit obligatoirement couvrir les résultats des opérations, les ressources en capital et la liquidité. La discussion des éléments inhabituels ou peu fréquents peut y figurer mais n'est pas une obligation réglementaire, contrairement aux deux autres points.",
      ],
      [
        "Which of the following is a required component of the MD&A section for a U.S. publicly traded company?",
        [
          "A discussion of the company's results of operations.",
          "A discussion of unusual or infrequent items, if any occurred during the period.",
          "A complete, separately audited set of financial statements.",
        ],
        0,
        "Les résultats des opérations sont l'un des trois volets obligatoires du MD&A (avec les ressources en capital/liquidité et les tendances connues). Les éléments inhabituels ne sont pas systématiquement exigés, et le MD&A n'est lui-même pas audité, encore moins un jeu séparé d'états financiers.",
      ],
      [
        "Under U.S. disclosure requirements, a firm's MD&A section is required to address all of the following EXCEPT:",
        [
          "the company's capital resources and liquidity.",
          "known trends and uncertainties likely to affect future results.",
          "a detailed listing of specific transactions with related parties.",
        ],
        2,
        "Le détail des transactions avec parties liées relève des annexes aux états financiers (footnotes), pas spécifiquement du MD&A. Les ressources en capital/liquidité et les tendances/incertitudes connues sont, elles, des volets obligatoires du MD&A.",
      ],
      // Concept 4 — Signal de suspicion pour une nouvelle transaction
      [
        "A firm engages in a new type of financial transaction that has a material effect on its earnings. An analyst should most likely be suspicious of the new transaction if:",
        [
          "management has not explained its business purpose.",
          "no accounting standard exists that applies to the transaction.",
          "the transaction is not governed by existing regulations.",
        ],
        0,
        "Une transaction nouvelle peut légitimement échapper aux normes comptables ou à la réglementation existantes simplement parce qu'elle est inédite. Ce qui doit alerter l'analyste, c'est l'incapacité de la direction à en expliquer la finalité économique.",
      ],
      [
        "An analyst notes that a company has entered into several complex transactions with related entities. Which of the following would most likely increase the analyst's level of concern about these transactions?",
        [
          "The transactions were fully disclosed in the footnotes to the financial statements.",
          "The transactions appear to have no clear business purpose other than improving reported earnings.",
          "The transactions were reviewed and approved by the company's audit committee.",
        ],
        1,
        "L'absence de finalité économique claire, au-delà de l'amélioration des résultats publiés, est précisément le signal d'alerte classique. La divulgation en annexe et l'approbation par le comité d'audit sont au contraire des signes positifs de gouvernance, pas des signaux d'alerte.",
      ],
      [
        "Which of the following is the best reason for an analyst to be suspicious of a new type of transaction that materially affects a firm's reported earnings?",
        [
          "The transaction falls outside the scope of any existing accounting standard.",
          "The transaction appears structured specifically to achieve a particular accounting or tax outcome, without a clear underlying economic rationale.",
          "The transaction was disclosed in a footnote rather than directly on the face of the financial statements.",
        ],
        1,
        "Une transaction conçue avant tout pour produire un effet comptable ou fiscal précis, sans rationalité économique sous-jacente, est le signal classique de manipulation potentielle — contrairement au simple fait de tomber hors du champ des normes existantes ou d'être divulguée en annexe, qui sont des situations normales et non suspectes en soi.",
      ],
      // Concept 5 — Ce qui est disponible sur EDGAR
      [
        "Which of the following is least likely to be available on EDGAR (Electronic Data Gathering, Analysis, and Retrieval System)?",
        ["Corporate press releases.", "Form 10Q.", "SEC filings."],
        0,
        "EDGAR (www.sec.gov) héberge les dépôts officiels auprès de la SEC, comme les rapports annuels (10-K) et trimestriels (10-Q). Les communiqués de presse sont rédigés par la direction elle-même et ne constituent pas des dépôts réglementaires SEC.",
      ],
      [
        "Which of the following is most likely to be found on EDGAR?",
        [
          "A company's internal budget forecasts and strategic plans.",
          "A company's annual report filed on Form 10-K.",
          "Third-party analyst commentary and earnings estimates.",
        ],
        1,
        "Le formulaire 10-K est un dépôt réglementaire obligatoire auprès de la SEC et se trouve donc sur EDGAR. Les prévisions budgétaires internes et les commentaires d'analystes tiers ne sont pas des dépôts SEC et n'apparaissent pas sur EDGAR.",
      ],
      [
        "An analyst wants to find a company's quarterly report filed with U.S. regulators. This filing, along with the company's annual report, would most likely be found on:",
        [
          "the company's own investor relations webpage only.",
          "EDGAR.",
          "a private financial data vendor's proprietary database only.",
        ],
        1,
        "Les dépôts réglementaires obligatoires (10-K annuel, 10-Q trimestriel) sont centralisés sur EDGAR, la base de données publique de la SEC — c'est la source de référence, même si certaines entreprises republient aussi ces documents sur leur propre site.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Financial Statement Analysis Page 1...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
