// Seed script — quiz de "drill" associé à la page 6 de la fiche PDF Portfolio
// Management (Introduction to Risk Management). 5 concepts clés,
// chacun en 3 questions — 1 question officielle (banque de pratique CFA,
// Reading 88 « Introduction to Risk Management », bonne réponse vérifiée dans
// le corrigé « - Answers.pdf ») + 1 variante "angle différent" (même notion,
// jamais un simple changement de chiffres ou de formulation) + 1 variante
// "plus difficile" (plusieurs étapes / pièges combinés).
// Voir memory regle-drill-variantes-cfa-hub. Questions en anglais,
// explications en français.
// Remis au cadre le 3 octobre 2026 : l'ancienne version (énoncés traduits en
// français) est remplacée. Les QCM imprimés dans le PDF ne sont pas repris,
// sauf la question sur l'assurance (concept 7) : c'est la seule question
// officielle de la banque sur la modification des expositions.
// syncQuizSets met le set à jour en place et garde l'historique de réponses
// de tout énoncé inchangé (comparaison sur le texte exact).
// Ramené à 5 concepts (15 questions) le 5 octobre 2026, à la demande de
// l'utilisateur : concepts d'origine 2, 5 retirés de la fiche, leurs
// questions rangées dans « Réserve — <titre> » (syncQuizSets, rien d'effacé).
// Usage: node scripts/seed-pm-drill-page6.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Portfolio Management (Système)";

const QUIZ_SETS = [
  {
    title: "Portfolio Management — Drill Fiche Page 6 (Introduction to Risk Management)",
    difficulty: 2,
    questions: [
      // Concept 1 — Définir le risk management : ni minimiser ni éliminer (officielle, Reading 88 Q5)
      [
        "An objective of the risk management process is to:",
        [
          "eliminate the risks faced by an organization.",
          "identify the risks faced by an organization.",
          "minimize the risks faced by an organization.",
        ],
        1,
        "Le processus de risk management consiste à (1) identifier la tolérance au risque de l'organisation, (2) identifier et mesurer les risques auxquels elle fait face, (3) les modifier et les surveiller. Le but n'est ni de les éliminer (A) ni de les minimiser (C) : on ne gagne un rendement supérieur au taux sans risque qu'en prenant des risques, et l'organisation peut même AUGMENTER son exposition aux risques qu'elle sait bien gérer. L'objectif est d'ajuster les risques pris au « bundle » optimal compte tenu de la tolérance.",
      ],
      // Variante angle différent — le POURQUOI : une décision qui augmente un risque peut être du bon risk management
      [
        "After a detailed review, a firm decides to increase its exposure to a risk that it understands and manages better than its competitors, while hedging a currency risk that it is poorly placed to manage. This decision is best described as:",
        [
          "consistent with risk management, whose aim is the optimal bundle of risks given the firm's risk tolerance, not the lowest possible level of risk.",
          "inconsistent with risk management, because any decision that increases an exposure raises the firm's total risk.",
          "consistent with risk management only if the increase in the first exposure is exactly offset by the reduction in the second.",
        ],
        0,
        "Le risk management ne cherche pas le niveau de risque le plus bas, mais le « bundle » de risques optimal compte tenu de la tolérance au risque. Augmenter une exposition que l'entreprise gère mieux que ses concurrents tout en couvrant un risque qu'elle maîtrise mal est exactement la démarche attendue. B confond risk management et minimisation du risque : une hausse d'une exposition, voire du risque total, n'est pas contraire au risk management tant qu'elle reste dans la tolérance. C invente une contrainte de neutralité : rien n'oblige les variations d'exposition à se compenser ; ce qui compte est que le profil final soit cohérent avec la tolérance.",
      ],
      // Variante plus difficile — trois affirmations à trier : rendement non contrôlé, bonne définition, piège « minimiser »
      [
        "A board member makes three statements about risk management: (1) “Our risk managers should be held accountable for achieving the portfolio's target return.” (2) “Risk management means deciding which risks to take, which to reduce, and which to avoid, consistent with our risk tolerance.” (3) “A well-run risk management process should drive our total risk as low as possible.” Which statement(s) is (are) correct?",
        ["Statements 1 and 2 only.", "Statements 2 and 3 only.", "Statement 2 only."],
        2,
        "(1) est faux : le risk management contrôle les RISQUES pris, pas le rendement, qui n'est sous le contrôle de personne sur une période donnée — on ne peut pas rendre les risk managers responsables d'un rendement cible. (2) est la bonne définition : identifier la tolérance, puis décider quels risques prendre, réduire ou éviter pour atteindre le bundle optimal. (3) est le piège classique : le risk management ne vise pas à minimiser le risque total (« ni minimiser ni éliminer »). Seule (2) est correcte : A ajoute (1), B ajoute (3).",
      ],

      // Concept 2 — Tolérance au risque et risk budgeting (officielle, Reading 88 Q4)
      [
        "Which of the following statements about an organization's risk tolerance is most accurate?",
        [
          "An organization with low risk tolerance should take steps to reduce each of the risks it identifies.",
          "Risk tolerance is the degree to which an organization is able to bear the various risks that may arise from outside the organization.",
          "The financial strength of an organization is one of the factors it should consider when determining its risk tolerance.",
        ],
        2,
        "La solidité financière fait partie des déterminants de la tolérance au risque, car elle mesure la capacité de l'organisation à absorber des pertes. Les autres déterminants : l'expertise dans ses métiers, la capacité à réagir à des événements extérieurs défavorables et l'environnement réglementaire (la taille, elle, n'en fait pas partie). A est faux : même avec une tolérance faible, une organisation peut choisir de porter certains risques cohérents avec ses objectifs — il ne s'agit pas de réduire systématiquement chaque risque. B est trop restrictif : la tolérance au risque porte sur les risques nés à l'intérieur de l'organisation comme sur ceux venant de l'extérieur.",
      ],
      // Variante angle différent — le lien tolérance → budgeting : ordre de la séquence et rôle du budget
      [
        "Which of the following best describes the role of risk budgeting relative to risk tolerance?",
        [
          "Risk budgeting allocates the total risk the organization is willing to bear (its risk tolerance) across assets or activities, forcing trade-offs among them; the budget can be expressed with a measure such as beta, VaR, or duration.",
          "Risk budgeting comes first: the organization's risk tolerance is then obtained by adding up the risk budgets requested by its business units.",
          "Risk budgeting sets the target return that each unit must achieve, and the risk tolerance is then adjusted so that these targets can be reached.",
        ],
        0,
        "La séquence est : tolérance au risque → risk budgeting → expositions. Le risk budgeting répartit le risque total que l'organisation accepte (sa tolérance, fixée en amont par la gouvernance) entre les actifs, classes d'actifs ou facteurs de risque, ce qui oblige à arbitrer : consommer du budget ici, c'est en avoir moins ailleurs. Il peut s'exprimer par une seule mesure (bêta, VaR, duration, variance) ou par facteur de risque. B inverse la séquence : la tolérance n'est pas la somme des budgets demandés par les unités, elle est fixée d'abord. C attribue au risk budgeting un rôle qu'il n'a pas : il ne fixe pas de rendement cible, et la tolérance n'est pas ajustée pour rendre un objectif de rendement atteignable.",
      ],
      // Variante plus difficile — appliquer un budget de bêta : allocation maximale et rendement qui en découle (piège : oublier le bêta des obligations)
      [
        "A foundation's board sets its risk tolerance, and the investment committee translates it into a risk budget: the portfolio's beta must not exceed 0.80. The portfolio can be invested in an equity fund (beta 1.20, expected return 9%) and a bond fund (beta 0.20, expected return 4%). The committee wants the highest expected return that stays within the risk budget. The equity allocation and the portfolio's expected return are closest to:",
        [
          "80% equity; expected return of 8.0%.",
          "60% equity; expected return of 7.0%.",
          "67% equity; expected return of 7.3%.",
        ],
        1,
        "Le bêta d'un portefeuille est la moyenne pondérée des bêtas : β = w × 1,20 + (1 − w) × 0,20 = 0,20 + w. Le budget impose 0,20 + w ≤ 0,80, donc w ≤ 60 % d'actions (le rendement espéré des actions étant plus élevé, on sature le budget). Rendement espéré = 0,60 × 9 % + 0,40 × 4 % = 5,4 % + 1,6 % = 7,0 %. C (67 %) divise le budget par le bêta des actions (0,80 / 1,20 = 66,7 %) en oubliant que les obligations consomment aussi du budget : le bêta réel serait 0,20 + 0,667 = 0,867, au-delà de la limite. A (80 %) confond le niveau du budget de bêta avec le poids des actions : bêta = 0,20 + 0,80 = 1,00. Le rendement espéré n'est pas fixé par le budget : c'est la conséquence du meilleur usage du risque autorisé.",
      ],

      // Concept 3 — Risques financiers vs non financiers (officielle, Reading 88 Q1)
      [
        "Which of the following risks is most accurately classified as a non-financial risk?",
        ["Liquidity risk.", "Model risk.", "Credit risk."],
        1,
        "Le risque de modèle (le risque que les valorisations produites par les modèles analytiques de l'organisation soient fausses) est un risque NON financier, comme le risque opérationnel, de solvabilité, réglementaire, politique ou fiscal, juridique, le tail risk ou le risque comptable. Les risques financiers sont ceux qui naissent de l'exposition aux marchés financiers : risque de liquidité (A), de crédit (C) et de marché.",
      ],
      // Variante angle différent — à l'envers : partir d'une situation et retrouver le risque et sa catégorie
      [
        "During a market panic, a fund must sell a large position in corporate bonds. Bid-ask spreads widen sharply and the fund can sell only well below the bonds' fair value. The resulting loss is best described as arising from:",
        ["solvency risk, a non-financial risk.", "credit risk, a financial risk.", "liquidity risk, a financial risk."],
        2,
        "Le risque de liquidité est le risque de perte lorsqu'on doit vendre un actif à un moment où les conditions de marché imposent un prix inférieur à sa juste valeur — l'écartement des fourchettes bid-ask en est le symptôme. C'est un risque FINANCIER. A (solvabilité) est le risque que l'organisation ne puisse plus fonctionner faute de liquidités : rien n'indique que le fonds soit à court de cash, il subit une décote à la vente. B (crédit) suppose qu'une contrepartie ne respecte pas ses engagements ; ici, aucun émetteur n'a fait défaut, c'est le marché des obligations qui s'est asséché.",
      ],
      // Variante plus difficile — six événements à classer, avec les pièges du risque de modèle et du risque réglementaire
      [
        "A company's risk report lists six events: (1) a major customer defaults on a large receivable; (2) the company can sell an asset only well below its fair value because the market for it has dried up; (3) an exchange rate move reduces the value of its foreign holdings; (4) a new regulation raises its capital requirements; (5) an employee's data-entry error in a trading system causes a large loss; (6) an internal valuation model misprices its derivatives book. How many of these events reflect financial risks?",
        ["Three.", "Four.", "Five."],
        0,
        "Risques financiers (nés de l'exposition aux marchés financiers) : (1) défaut d'un client → risque de crédit ; (2) vente forcée sous la juste valeur sur un marché asséché → risque de liquidité ; (3) mouvement de change → risque de marché. Soit trois. Les trois autres sont non financiers : (4) nouvelle réglementation → risque réglementaire ; (5) erreur humaine dans un système → risque opérationnel ; (6) modèle de valorisation défaillant → risque de modèle. B (quatre) compte à tort le risque de modèle comme financier parce qu'il porte sur des dérivés : c'est la source du risque (un modèle interne faux) qui compte, pas l'actif concerné. C (cinq) ajoute en plus le risque réglementaire parce qu'il touche les exigences de capital.",
      ],

      // Concept 4 — Mesurer l'exposition : sensibilités, VaR / CVaR, stress test vs scenario analysis (officielle, Reading 88 Q11)
      [
        "Measures of interest rate sensitivity least likely include:",
        ["beta.", "duration.", "rho."],
        0,
        "Le bêta mesure le risque de marché d'une action ou d'un portefeuille d'actions (sensibilité au marché), pas la sensibilité aux taux. La duration (B) mesure la sensibilité du prix d'une obligation ou d'un portefeuille obligataire aux variations de taux, et le rho (C) la sensibilité de la valeur d'un dérivé au taux sans risque : ce sont deux mesures de sensibilité aux taux.",
      ],
      // Variante angle différent — choisir la bonne mesure selon le contexte de détention (stand-alone vs diversifié), et pourquoi
      [
        "An investor holds a stock as one of 200 positions in a well-diversified portfolio. Which measure best captures the stock's contribution to the portfolio's risk?",
        [
          "Beta, because it measures the stock's market risk, which is the part of its risk that diversification cannot remove.",
          "Standard deviation, because it measures the total volatility of the stock's returns.",
          "Vega, because it measures the stock's sensitivity to the volatility of the market.",
        ],
        0,
        "Pour un titre détenu parmi 200 lignes dans un portefeuille bien diversifié, le risque spécifique est diversifié : ce qui compte est la part de risque qui reste, le risque de marché, mesurée par le bêta. B décrit l'écart-type, qui mesure la volatilité totale du titre sur une base autonome (stand-alone) : adapté à un actif détenu seul, il surestime la contribution du titre au risque d'un portefeuille diversifié. C : le vega est un « Greek » qui mesure la sensibilité de la valeur d'un DÉRIVÉ à la volatilité de son sous-jacent ; il ne s'applique pas à une action détenue en direct.",
      ],
      // Variante plus difficile — interpréter VaR et CVaR, puis distinguer stress test et scenario analysis
      [
        "A risk manager makes three statements: (1) “Our one-day VaR of $2 million at a 1% probability means we should expect a loss of at least $2 million on about 1% of trading days.” (2) “Our conditional VaR, the probability-weighted average of the losses beyond the VaR, must therefore be $2 million or less.” (3) “Estimating the effect on our portfolio of a 200 basis point rise in interest rates combined with a 15% drop in oil prices is a stress test.” Which statement(s) is (are) correct?",
        ["Statements 1 and 2 only.", "Statement 1 only.", "Statements 1 and 3 only."],
        1,
        "(1) est correct : la VaR est une perte MINIMALE associée à une probabilité — une perte d'au moins 2 M$ est attendue environ 1 % des jours ; ce n'est pas une perte maximale. (2) est faux : la CVaR est la moyenne pondérée des pertes AU-DELÀ de la VaR, c'est-à-dire de pertes d'au moins 2 M$ ; elle est donc forcément supérieure ou égale à 2 M$, jamais inférieure. (3) est faux : faire varier simultanément plusieurs facteurs (taux ET prix du pétrole), c'est une scenario analysis ; un stress test examine l'effet d'un changement extrême d'une seule variable. Seule (1) est correcte : A ajoute (2), C ajoute (3).",
      ],

      // Concept 5 — Modifier l'exposition : avoidance, prevention, acceptance, transfer, shifting (officielle, Reading 88 Q6 — seule officielle disponible, aussi imprimée dans le PDF)
      [
        "Buying insurance is best described as a method for an organization to:",
        ["prevent a risk.", "shift a risk.", "transfer a risk."],
        2,
        "Acheter une assurance TRANSFÈRE le risque à l'assureur, qui le prend en charge contre une prime (et le mutualise sur de nombreux assurés). B : « shifter » un risque, c'est modifier la distribution des résultats possibles, typiquement avec des dérivés (forwards, futures, swaps, options). A : prévenir un risque, c'est agir pour réduire sa probabilité ou son impact, par exemple en renforçant les procédures de sécurité.",
      ],
      // Variante angle différent — le cas limite de l'assurance avec franchise : deux méthodes combinées
      [
        "A company buys property insurance on its warehouse with a $500,000 deductible. With respect to fire losses, the company is best described as:",
        [
          "transferring the entire fire risk to the insurer.",
          "shifting the risk, because the deductible changes the distribution of its possible outcomes.",
          "accepting (self-insuring) losses up to $500,000 and transferring losses above that amount to the insurer.",
        ],
        2,
        "Avec une franchise de 500 000 $, l'entreprise supporte elle-même les pertes jusqu'à ce montant (acceptation, ou self-insurance) et ne transfère à l'assureur que la partie des pertes au-delà. A oublie la franchise : le transfert n'est que partiel. B confond transfert et shifting : dans la terminologie CFA, le risk shifting désigne la modification de la distribution des résultats par des dérivés ; une assurance, avec ou sans franchise, est un transfert.",
      ],
      // Variante plus difficile — classer quatre actions et dire comment choisir entre les méthodes (aucune n'est systématiquement supérieure)
      [
        "A manufacturer takes four actions: (1) it decides not to build a plant in a country with a high risk of expropriation; (2) it installs sprinklers and tightens safety procedures in its existing plants; (3) it buys put options on its large equity portfolio; (4) it sets aside a reserve fund to pay small product-liability claims. Which statement is most accurate?",
        [
          "The actions are prevention, avoidance, shifting, and transfer, respectively; insurance-type methods are generally superior because they remove the risk entirely.",
          "The actions are avoidance, prevention, shifting, and acceptance (self-insurance), respectively; the choice among methods should rest on a comparison of their costs and benefits given the firm's risk tolerance.",
          "The actions are avoidance, prevention, transfer, and acceptance (self-insurance), respectively; transfer and shifting are interchangeable terms for hedging with derivatives.",
        ],
        1,
        "(1) Ne pas construire l'usine : on ne s'engage pas dans l'activité → avoidance. (2) Sprinklers et procédures de sécurité : on réduit la probabilité ou l'impact du sinistre → prevention. (3) Puts sur le portefeuille d'actions : un dérivé qui crée un plancher, donc modifie la distribution des résultats → shifting. (4) Fonds de réserve pour les petits sinistres : l'entreprise porte elle-même le risque → acceptance (self-insurance). Le choix entre méthodes repose toujours sur une comparaison coûts/bénéfices au regard de la tolérance au risque : aucune méthode n'a d'avantage systématique. A intervertit (1) et (2), traite le fonds de réserve comme un transfert (alors qu'aucun tiers ne prend le risque) et prétend à tort qu'une méthode domine. C qualifie les puts de transfert et assimile transfert et shifting : le transfert fait porter le risque par un tiers (assurance, surety bond), le shifting modifie la distribution des résultats via des dérivés.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Portfolio Management Page 6...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
