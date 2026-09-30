// Seed script — quiz de "drill" associé à la page 1 de la fiche PDF FSA
// (Introduction to Financial Statement Analysis). Structure : pour chacun
// des 5 concepts clés de la page, 1 question officielle (banque CFA,
// qcm_data/fsa_raw.txt) + 1 variante "angle différent" (même notion, mais
// jamais un simple changement de chiffres menant au même raisonnement) +
// 1 variante "plus difficile" (raisonnement à plusieurs étapes / pièges
// combinés). Voir memory regle-drill-variantes-cfa-hub. Questions en
// anglais, explications en français.
// Usage: node scripts/seed-fsa-drill-page1.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 1 (Introduction to Financial Statement Analysis)",
    difficulty: 1,
    questions: [
      // Concept 1 — Le framework d'analyse en 6 étapes (officielle)
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
      // Variante angle différent — le "pourquoi" de l'ordre, pas la liste
      [
        "Which of the following best explains why \"state the objective and context\" must occur before \"gather data\" in the financial statement analysis framework?",
        [
          "Because ratios and common-size statements cannot be computed without first collecting data.",
          "Because the scope, sources, and depth of data to collect depend on the purpose of the analysis.",
          "Because analysts must obtain audited financial statements before defining any objective.",
        ],
        1,
        "L'étape 1 détermine QUOI collecter et OÙ chercher à l'étape 2 : sans objectif défini, on ne sait pas si l'analyse porte sur la solvabilité, la valorisation, ou autre chose, ni quelles données seront pertinentes. L'ordre n'a rien à voir avec la disponibilité de ratios ou d'états audités.",
      ],
      // Variante plus difficile — mapper une série d'actions décrites aux étapes du framework
      [
        "An analyst has defined the purpose of a valuation report, obtained five years of audited financial statements and industry data, and computed common-size statements and key ratios comparing the company to its peers. Which step of the financial statement analysis framework should the analyst complete next?",
        ["Process the data.", "Analyze and interpret the data.", "Update the analysis."],
        1,
        "Définir l'objectif = étape 1 ; obtenir les données = étape 2 ; calculer ratios et common-size = étape 3 (traitement), déjà faite. L'étape suivante est donc l'analyse et l'interprétation de ces résultats (étape 4) — il faut suivre la chronologie des actions décrites pour identifier où l'analyste en est réellement.",
      ],

      // Concept 2 — Assurance raisonnable de l'auditeur (officielle)
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
      // Variante angle différent — cas du paragraphe explicatif (going concern)
      [
        "If an auditor identifies a material uncertainty about a company's ability to continue as a going concern, but still believes the financial statements are otherwise fairly presented, the auditor's opinion will most likely be:",
        [
          "unqualified, with no mention of the uncertainty.",
          "unqualified, but with an added explanatory paragraph highlighting the uncertainty.",
          "adverse, since any going-concern doubt invalidates the financial statements.",
        ],
        1,
        "Une incertitude significative sur la continuité d'exploitation n'empêche pas une opinion sans réserve si les états sont par ailleurs fidèlement présentés — mais elle impose un paragraphe explicatif supplémentaire attirant l'attention du lecteur. Une opinion adverse serait disproportionnée pour une simple incertitude correctement divulguée.",
      ],
      // Variante plus difficile — distinguer qualified/disclaimer/unqualified sur un cas nuancé
      [
        "An auditor discovers that a client's inventory valuation method, while technically compliant with the applicable accounting standard, has been applied inconsistently between the current and prior reporting periods, and management has not disclosed this change or its effect. The auditor is most likely to issue a report that is:",
        [
          "unqualified, since the method itself remains compliant with the standard.",
          "qualified, because of the undisclosed inconsistency, which represents a departure from required presentation.",
          "a disclaimer of opinion, since the auditor cannot verify any balance on the financial statements.",
        ],
        1,
        "La méthode reste conforme à la norme, mais le changement non divulgué en viole les exigences de présentation (cohérence et transparence) — ce qui appelle une opinion avec réserve (qualified), pas une opinion sans réserve. Un disclaimer serait excessif : l'auditeur peut ici vérifier le reste des comptes, un seul point pose problème.",
      ],

      // Concept 3 — Contenu obligatoire du MD&A (officielle)
      [
        "For publicly traded firms in the United States, the Management Discussion and Analysis (MD&A) portion of the financial disclosure is least likely required to discuss:",
        ["capital resources and liquidity.", "results of operations.", "unusual or infrequent items."],
        2,
        "Le MD&A américain doit obligatoirement couvrir les résultats des opérations, les ressources en capital et la liquidité. La discussion des éléments inhabituels ou peu fréquents peut y figurer mais n'est pas une obligation réglementaire, contrairement aux deux autres points.",
      ],
      // Variante angle différent — contraste avec un autre document (proxy statement)
      [
        "Which of the following disclosures would an analyst most likely expect to find in a company's proxy statement, but NOT as a required component of its MD&A?",
        ["Discussion of results of operations.", "Details of executive compensation.", "Discussion of capital resources and liquidity."],
        1,
        "La rémunération des dirigeants est divulguée dans le proxy statement (document de vote des actionnaires), pas dans le MD&A, dont le contenu obligatoire porte sur les résultats des opérations et les ressources en capital/liquidité.",
      ],
      // Variante plus difficile — évaluer la conformité d'un MD&A décrit, avec piège
      [
        "A company's MD&A discusses a revenue increase driven by favorable currency translation, without quantifying its effect, but does not mention a major product recall during the period that reduced unit sales. An analyst reviewing this MD&A for compliance with U.S. disclosure requirements would most likely conclude that it is:",
        [
          "fully compliant, since quantifying currency effects and discussing product recalls are both optional.",
          "deficient, because known trends or events materially affecting results — such as the recall — must be discussed.",
          "deficient only with respect to the currency translation disclosure, which must always be quantified.",
        ],
        1,
        "Le MD&A doit discuter les tendances et événements connus ayant un effet matériel sur les résultats — un rappel de produit affectant les ventes en fait clairement partie et son omission rend la divulgation déficiente. La quantification précise de l'effet de change n'est en revanche pas une obligation stricte.",
      ],

      // Concept 4 — Signal de suspicion pour une nouvelle transaction (officielle)
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
      // Variante angle différent — inverse la logique : qu'est-ce qui NE serait PAS suspect
      [
        "Which of the following would LEAST likely raise an analyst's suspicion about a new, material transaction entered into by a firm?",
        [
          "The transaction's business purpose is clearly explained and documented by management.",
          "The transaction significantly boosted reported earnings with no apparent change to the firm's underlying operations.",
          "The transaction was structured just before the end of the reporting period.",
        ],
        0,
        "Une finalité économique clairement expliquée et documentée est précisément ce qui RASSURE l'analyste — c'est l'absence d'explication, pas sa présence, qui doit inquiéter. Une transaction gonflant les résultats sans changement opérationnel réel, ou réalisée juste avant la clôture, sont au contraire des signaux d'alerte classiques.",
      ],
      // Variante plus difficile — synthétiser plusieurs signaux combinés
      [
        "An analyst notices that a firm recognized a large, one-time gain from a transaction with a counterparty whose management includes a former executive of the firm, that this gain allowed the firm to narrowly beat its quarterly earnings target, and that no similar transaction has occurred in the firm's history. Which of the following best describes what should most concern the analyst?",
        [
          "Only the related-party nature of the counterparty.",
          "The combination of a related-party counterparty, an unprecedented transaction type, and a conveniently timed earnings effect.",
          "Only the fact that this is the first transaction of its kind for the firm.",
        ],
        1,
        "Pris isolément, chacun de ces éléments pourrait avoir une explication bénigne ; c'est leur combinaison — partie liée, transaction inédite, et effet opportun sur les résultats juste au bon moment — qui constitue un faisceau d'indices bien plus préoccupant qu'un seul facteur pris seul.",
      ],

      // Concept 5 — Contenu disponible sur EDGAR (officielle)
      [
        "Which of the following is least likely to be available on EDGAR (Electronic Data Gathering, Analysis, and Retrieval System)?",
        ["Corporate press releases.", "Form 10Q.", "SEC filings."],
        0,
        "EDGAR (www.sec.gov) héberge les dépôts officiels auprès de la SEC, comme les rapports annuels (10-K) et trimestriels (10-Q). Les communiqués de presse sont rédigés par la direction elle-même et ne constituent pas des dépôts réglementaires SEC.",
      ],
      // Variante angle différent — identifier le bon type de dépôt pour un besoin précis
      [
        "An analyst wants to determine whether a company has recently amended its corporate bylaws or changed its auditor. Which SEC filing type, available on EDGAR, would most likely disclose this kind of material event?",
        ["Form 10-K.", "Form 8-K.", "Form 10-Q."],
        1,
        "Le formulaire 8-K (« current report ») est utilisé pour divulguer sans délai des événements matériels ponctuels, comme un changement d'auditeur ou une modification des statuts — contrairement aux 10-K et 10-Q, qui sont des rapports périodiques (annuel/trimestriel), pas événementiels.",
      ],
      // Variante plus difficile — distinguer ce qui est public/filed de ce qui ne l'est pas
      [
        "An analyst wants to compare a private equity fund's internal, non-public valuation memo for one of its portfolio companies against that portfolio company's own public disclosures. Which of the following is most accurate?",
        [
          "Both documents would be available on EDGAR, since EDGAR aggregates all company-related filings, public or private.",
          "Only the portfolio company's own SEC filings, if it is itself a reporting company, would be available on EDGAR; the fund's internal memo would not.",
          "Neither document would be available on EDGAR, since private equity funds and their portfolio companies are exempt from all SEC disclosure.",
        ],
        1,
        "EDGAR ne contient que les dépôts réglementaires officiels des émetteurs soumis à cette obligation — pas les documents internes d'un fonds, qui ne sont jamais publics. Si la société du portefeuille est elle-même cotée et soumise à la SEC, SES dépôts (10-K, 10-Q, etc.) y figurent, mais jamais le mémo interne du fonds.",
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
