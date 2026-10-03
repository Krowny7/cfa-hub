// Seed script — quiz de "drill" associé à la page 5 de la fiche PDF Equity
// (Company Analysis: Past, Present & Forecasting). Structure : 5 concepts ×
// (1 question officielle + 1 variante "angle différent" + 1 variante "plus
// difficile"). Voir memory regle-drill-variantes-cfa-hub. Questions en
// anglais, explications en français. Questions officielles recopiées à
// l'identique (historique de réponses conservé par syncQuizSets), corrigés
// vérifiés contre les PDF "- Answers.pdf" (Readings 45 et 47).
// Usage: node scripts/seed-equity-drill-page5.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Equity (Système)";

const QUIZ_SETS = [
  {
    title: "Equity — Drill Fiche Page 5 (Company Analysis: Past, Present & Forecasting)",
    difficulty: 2,
    questions: [
      // Concept 1 — Rapport initial vs rapport subséquent (officielle, Reading 45)
      [
        "Items in an initial research report on a company that are most likely to also appear in subsequent reports include a(n):",
        ["industry overview and analysis of the company's competitive position.", "description of the company's business model and strategy.", "rationale for the investment recommendation."],
        2,
        "Les rapports initiaux et les rapports subséquents incluent tous deux une recommandation (achat/conservation/vente) ainsi que sa justification. En revanche, la description de l'entreprise et la vue d'ensemble du secteur figurent dans le rapport initial mais ne sont généralement pas répétées dans les rapports suivants, sauf si de nouvelles informations sont apparues.",
      ],
      // Variante angle différent — le cas limite « sauf si une information nouvelle est apparue »
      [
        "Last year, an analyst initiated coverage of a company with a full report that described its business model. The company has since sold its main division and now generates most of its revenue from a different activity. In her next report on the company, the analyst should most appropriately:",
        [
          "leave out the business model, because it was already described in the initial report.",
          "update the description of the business model, because significant new information has emerged.",
          "publish only a revised target price, because subsequent reports do not explain the recommendation.",
        ],
        1,
        "En règle générale, un rapport subséquent ne répète pas la description de l'entreprise ni celle du secteur… sauf si une information nouvelle et importante est apparue. Ici, la cession de la division principale change le business model : l'analyste doit en mettre à jour la description. La réponse A applique la règle « pas de répétition » de façon mécanique, sans voir l'exception. La réponse C est fausse : tout rapport, initial ou subséquent, contient la recommandation ET sa justification, ainsi que le résumé de ce qui a changé (prévisions, valorisation, risques).",
      ],
      // Variante plus difficile — construire le plan complet d'un rapport subséquent (front matter + changements + justification)
      [
        "Six months after initiating coverage, an analyst lowers her target price on a company after it missed earnings expectations. The industry structure, the company's business model, and its management team are unchanged. Which outline is most appropriate for her subsequent report?",
        [
          "Front matter with the updated recommendation and target price; a summary of the changes to her forecasts, valuation, and risks; and the rationale for the recommendation.",
          "The same sections as the initial report (business model, industry overview, ownership and management, ESG), each updated with the latest figures, followed by the new target price.",
          "Front matter with the new target price only; the rationale for the recommendation is omitted because it was explained in the initial report.",
        ],
        0,
        "Un rapport subséquent se concentre sur ce qui a changé : le front matter (émetteur, recommandation, prix cible), un résumé des changements de prévisions, de valorisation et de risques, et la justification de la recommandation — élément présent dans TOUS les rapports, comme le montre la question officielle. La réponse B reproduit la structure complète d'un rapport initial alors que ni le secteur, ni le business model, ni la direction n'ont changé : rien ne justifie de répéter ces sections. La réponse C oublie que la justification de la recommandation figure aussi bien dans le rapport initial que dans les rapports subséquents.",
      ],

      // Concept 2 — Levier opérationnel : DOL et coûts fixes (officielle, Reading 45)
      [
        "During a period of increasing sales, compared to firms with lower operating leverage, earnings growth for firms with high operating leverage will be:",
        ["higher.", "unaffected.", "lower."],
        0,
        "Un levier opérationnel élevé signifie qu'une variation relativement faible des ventes entraîne une variation plus importante du résultat opérationnel. Donc en période de hausse des ventes, une entreprise à levier opérationnel élevé (coûts fixes élevés) verra sa croissance des bénéfices être supérieure à celle d'une entreprise à levier opérationnel plus faible.",
      ],
      // Variante angle différent — le levier joue aussi à la baisse, et il vient des coûts fixes
      [
        "Firms X and Y have the same sales and the same operating profit this year. Firm X's operating costs are mostly fixed, while Firm Y's are mostly variable. If both firms' sales fall by 10% next year, which statement is most accurate?",
        [
          "Both firms' operating profit will fall by about 10%, since their sales fall by the same percentage.",
          "Firm Y's operating profit will fall by more, since variable costs make up a larger share of its total costs.",
          "Firm X's operating profit will fall by more, since its fixed costs do not decline when sales fall.",
        ],
        2,
        "Le levier opérationnel vient des coûts fixes : DOL = %Δ résultat opérationnel / %Δ ventes, d'autant plus élevé que la part de coûts fixes est grande. Il joue dans les deux sens : quand les ventes baissent, les coûts fixes de X restent les mêmes, donc son résultat opérationnel chute plus que proportionnellement — plus que celui de Y. La réponse A ignore le levier opérationnel (elle ne serait vraie que si tous les coûts étaient variables, DOL = 1). La réponse B inverse le mécanisme : des coûts variables baissent avec les ventes et amortissent la chute du résultat.",
      ],
      // Variante plus difficile — résultat opérationnel = Q×(P−VC)−FC, le volume s'applique aux deux côtés, contrôle par le DOL
      [
        "A company sells 30,000 units a year at a price of $50 per unit. Its variable cost is $30 per unit and its annual fixed costs are $400,000. If unit volume rises by 10% next year, with the unit price, unit variable cost, and total fixed costs unchanged, the company's operating profit will be closest to:",
        ["$220,000.", "$260,000.", "$350,000."],
        1,
        "Résultat opérationnel = Q × (P − VC) − FC. Aujourd'hui : 30 000 × (50 − 30) − 400 000 = 600 000 − 400 000 = 200 000 $. L'an prochain : 33 000 × 20 − 400 000 = 660 000 − 400 000 = 260 000 $, soit +30 % pour +10 % de volume. Contrôle par le DOL : marge sur coûts variables / résultat opérationnel = 600 000 / 200 000 = 3,0, et 3,0 × 10 % = +30 %. 220 000 $ applique simplement +10 % au résultat (200 000 × 1,10), comme si le DOL valait 1 : c'est oublier les coûts fixes. 350 000 $ fait croître le chiffre d'affaires de 10 % (1 650 000 $) mais laisse les coûts variables à 900 000 $ ; or le volume s'applique aux deux côtés : les coûts variables passent à 990 000 $ (1 650 000 − 990 000 − 400 000 = 260 000 $).",
      ],

      // Concept 3 — Rendements levés (ROE) vs non levés (ROA, ROIC) (officielle, Reading 45)
      [
        "Which of the following ratios should an analyst use who wishes to evaluate the returns a company generates based on the amount of financial leverage?",
        ["Return on equity (ROE).", "Return on invested capital (ROIC).", "Return on assets (ROA)."],
        0,
        "Le ROE intègre l'effet du levier financier, puisqu'il est égal au ROA multiplié par le ratio de levier financier (actif/capitaux propres). Le ROA et le ROIC servent au contraire à exprimer des rendements non affectés par le levier (« unlevered returns »).",
      ],
      // Variante angle différent — comparer deux entreprises identiques sauf le financement : quel ratio bouge, lequel non
      [
        "Companies A and B have identical operating assets, sales, and operating income. Company A is financed entirely with equity; Company B is financed 50% with debt whose after-tax cost is lower than the return generated on its assets. Compared with Company A, Company B most likely has a:",
        ["higher ROIC and a higher ROE.", "similar ROIC and a higher ROE.", "similar ROIC and a similar ROE."],
        1,
        "Le ROIC est un rendement non levé : il rapporte le résultat opérationnel après impôt à l'ensemble du capital investi (dettes + capitaux propres), il est donc indépendant du mode de financement — identique pour A et B. Le ROE est un rendement levé (ROE = ROA × actif/capitaux propres, DuPont) : B finance la moitié de ses actifs avec une dette qui coûte moins que ce que rapportent ces actifs, donc le rendement par euro de capitaux propres augmente. Exemple : actif 1 000, EBIT 100, impôt 25 % → A : ROE = 75/1 000 = 7,5 % ; B (500 de dette à 4 %) : résultat net = (100 − 20) × 0,75 = 60, ROE = 60/500 = 12 % ; ROIC = 75/1 000 = 7,5 % pour les deux. La réponse A suppose à tort que la dette améliore la performance opérationnelle ; la réponse C ignore l'effet du levier financier sur le ROE.",
      ],
      // Variante plus difficile — ROE par DuPont + DFL, avec une donnée-piège (variation des ventes → DOL)
      [
        "A company has total assets of $800 million and shareholders' equity of $320 million, and its return on assets (ROA) is 5%. Next year, sales are expected to rise by 5%, operating income from $90 million to $99 million, and net income from $40 million to $46 million. Which pair correctly gives the company's current return on equity (ROE) and its degree of financial leverage (DFL)?",
        ["ROE of 12.5%; DFL of 2.0.", "ROE of 2.0%; DFL of 1.5.", "ROE of 12.5%; DFL of 1.5."],
        2,
        "ROE = ROA × (actif / capitaux propres) = 5 % × (800 / 320) = 5 % × 2,5 = 12,5 % (contrôle : 40 / 320 = 12,5 %). DFL = %Δ résultat net / %Δ résultat opérationnel = (46/40 − 1) / (99/90 − 1) = 15 % / 10 % = 1,5. La hausse des ventes de 5 % est une donnée-piège : 10 % / 5 % = 2,0 est le DOL (levier opérationnel), pas le DFL — d'où la réponse A. La réponse B divise le ROA par le multiplicateur de capitaux propres (5 % / 2,5 = 2,0 %) au lieu de le multiplier : le levier financier augmente le ROE, il ne le réduit pas.",
      ],

      // Concept 4 — Approches de prévision : la guidance de la direction et ses biais (officielle, Reading 47 Q21, hors set précédent)
      [
        "An analyst attends a management call where the CEO projects revenue and operating expense growth of 4%–6% next year, respectively. Understanding the natural tendency of management when communicating these numbers, an analyst will most likely project which of the following?",
        ["Revenue growth of 5%–7%.", "Operating expense growth of 4%–6%.", "Operating expense growth of 5%–7%."],
        0,
        "La direction a tendance à communiquer des prévisions prudentes (« padding ») : croissance des revenus sous-estimée et croissance des charges surestimée, pour pouvoir ensuite « battre » sa propre guidance. L'analyste corrige ce biais : il projette une croissance des revenus plus élevée (5 %–7 %) et une croissance des charges opérationnelles plus faible que la guidance. La réponse B reprend la guidance telle quelle, sans la corriger ; la réponse C va dans le mauvais sens (des charges encore plus élevées qu'une guidance déjà prudente).",
      ],
      // Variante angle différent — pour quels postes la guidance est-elle une donnée utile (contrôle direct vs macro)
      [
        "For which of the following forecast items is management guidance most likely to be a useful input for an analyst?",
        [
          "Next year's revenue for a company whose sales closely track GDP growth.",
          "Capital expenditures for a new plant that the company's board has already approved.",
          "The effect of exchange rate movements on the company's foreign sales.",
        ],
        1,
        "La guidance de la direction est pertinente pour les postes que celle-ci contrôle directement — typiquement les dépenses d'investissement (capex) déjà décidées, comme une usine approuvée par le conseil. Elle l'est beaucoup moins pour ce qui dépend de variables macroéconomiques hors de son contrôle. La réponse A porte sur des ventes qui suivent le PIB : la direction n'a pas d'avantage d'information sur la macro (et sa guidance de revenus est souvent prudente). La réponse C porte sur les fluctuations de change, imprévisibles et hors du contrôle de la direction.",
      ],
      // Variante plus difficile — choisir l'approche adaptée à trois profils, avec le piège des capex sans schéma régulier
      [
        "An analyst covers three companies: (1) a mature, non-cyclical utility with stable results; (2) a recently listed company in an established industry with many listed peers, whose management provides no guidance; (3) a cyclical chemicals producer undergoing a major restructuring, with no guidance and an irregular capital expenditure history. Which set of forecasting approaches is most appropriate?",
        [
          "(1) historical base rates and convergence; (2) management guidance; (3) historical results averaged over a full business cycle.",
          "(1) historical results; (2) analyst discretion; (3) historical results, with capital expenditures set at their historical average.",
          "(1) historical results; (2) historical base rates and convergence; (3) analyst discretion, with capital expenditures based on the capacity utilization of its PP&E.",
        ],
        2,
        "(1) Entreprise mature, non cyclique, aux résultats stables → les résultats historiques sont le meilleur point de départ. (2) Industrie établie avec des comparables cotés, historique propre court et pas de guidance → convergence vers les taux de base du secteur (moyennes ou médianes des pairs). (3) Entreprise cyclique en pleine restructuration, sans guidance → son passé n'est pas représentatif : discrétion de l'analyste ; et comme ses capex n'ont ni schéma régulier ni guidance, on les projette à partir du taux d'utilisation de la capacité des immobilisations (PP&E), jamais à partir d'une moyenne historique ou sectorielle. La réponse A propose la guidance pour (2) alors qu'il n'y en a pas, et une moyenne de cycle pour (3) alors que la restructuration rend le passé inutilisable. La réponse B tombe exactement dans le piège des capex à la moyenne historique pour (3), et néglige pour (2) les comparables disponibles.",
      ],

      // Concept 5 — Prévoir les coûts avec le bon moteur : SG&A, COGS/marge brute, BFR (officielle, Reading 47)
      [
        "Pam Jones, CFA, creates pro forma financial statements for a company she is analyzing. In developing the income statements, she needs to forecast growth for the selling, general, and administrative (SG&A) line item. Her forecasted number will most likely be driven by:",
        ["inflation forecasts for fixed SG&A, and sales growth for variable SG&A.", "sales growth for fixed SG&A, and inflation forecasts for variable SG&A.", "sales growth for both fixed and variable SG&A."],
        0,
        "Les SG&A comportent une composante fixe et une composante variable. La partie fixe est peu affectée par les ventes et doit être projetée avec un taux d'inflation ; la partie variable est plus corrélée aux ventes et doit être projetée avec la croissance des ventes — c'est l'inverse de la réponse B.",
      ],
      // Variante angle différent — marge brute : le volume touche les deux côtés, le prix et le coût unitaire un seul
      [
        "An analyst forecasts a manufacturer's gross margin, assuming cost of goods sold is entirely variable. All else equal, which of the following changes would leave the forecasted gross margin percentage unchanged?",
        ["A 6% increase in the average selling price.", "A 6% decrease in raw material cost per unit.", "A 6% increase in the number of units sold."],
        2,
        "Revenu = volume × prix et COGS = volume × coût unitaire. Le volume s'applique aux deux côtés : ventes et COGS augmentent tous deux de 6 %, le ratio COGS/ventes ne bouge pas, donc la marge brute en % reste identique (seule la marge brute en dollars augmente de 6 %). Le prix de vente (A) ne touche que le revenu et le coût unitaire (B) ne touche que le COGS : dans les deux cas la marge brute s'améliore. Exemple : prix 100, coût 60, marge 40 % → prix +6 % : (106 − 60)/106 ≈ 43,4 % ; coût −6 % : (100 − 56,4)/100 = 43,6 %. Même logique que pour les SG&A de la question officielle : chaque poste se projette avec son propre moteur.",
      ],
      // Variante plus difficile — COGS par la marge brute, puis créances/stocks/fournisseurs avec la bonne base, et CCC négatif
      [
        "For next year, an analyst forecasts a company's revenue at $730 million and its gross margin at 40%. She also forecasts days of sales outstanding (DSO) of 30, days of inventory on hand (DOH) of 50, and days payables outstanding (DPO) of 95. Using a 365-day year, which statement about her forecast is most accurate?",
        [
          "Trade working capital (receivables + inventory - payables) is about -$30 million, and the cash conversion cycle of -15 days signals a liquidity problem.",
          "Trade working capital (receivables + inventory - payables) is about +$6 million, and the cash conversion cycle of -15 days indicates that suppliers' credit finances the operating cycle.",
          "Trade working capital (receivables + inventory - payables) is about -$18 million, and the cash conversion cycle is +175 days.",
        ],
        1,
        "Étape 1 : COGS prévu = (1 − 40 %) × 730 = 438 M$. Étape 2 : créances = DSO × revenu/365 = 30 × 2,0 = 60 M$ ; stocks = DOH × COGS/365 = 50 × 1,2 = 60 M$ ; fournisseurs = DPO × COGS/365 = 95 × 1,2 = 114 M$ ; BFR d'exploitation = 60 + 60 − 114 = +6 M$. Étape 3 : CCC = DOH + DSO − DPO = 50 + 30 − 95 = −15 jours : un CCC négatif signifie que le crédit fournisseurs finance le cycle d'exploitation, ce qui est plutôt un signe favorable, pas un problème de liquidité. CCC négatif et BFR positif coexistent ici parce que les créances se calculent sur le revenu, alors que stocks et fournisseurs se calculent sur le COGS. La réponse A calcule à tort stocks et fournisseurs sur le revenu (50 × 2 = 100 et 95 × 2 = 190 → 60 + 100 − 190 = −30) et interprète mal le CCC négatif. La réponse C calcule les créances sur le COGS (30 × 1,2 = 36 → 36 + 60 − 114 = −18) et additionne le DPO au lieu de le soustraire (50 + 30 + 95 = 175).",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Equity Page 5...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
