// Seed script — flashcards "Système" Portfolio Management.
// 4 paquets de 15 cartes (60), à réviser en une nuit avec le one-pager Portfolio Management.
// Format « trois cases » : À retenir (≤ 12 mots, ==surligné==, ou formule, ou liste « · »),
// puis « En clair : … », puis « Piège : … » s'il y a un vrai piège.
// Chaque carte se comprend seule (cartes mélangées) : phrases en français, termes techniques en anglais.
// Formules KaTeX ($$...$$ seul sur sa ligne = bloc, $...$ = en ligne), rendues par components/RichText.tsx.
// Vérifié sur Schweser Book 4 (R83–88).
// Usage: node scripts/seed-flashcards-portfolio-management.mjs
import { pathToFileURL } from "node:url";
import { getOwnerId, ensureFolder, seedFlashcardSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Portfolio Management (Système)";

// Anciens titres à supprimer s'ils ont changé (les 4 titres actuels sont gardés).
const oldTitles = [];

export const SETS = [
  {
    title: "Portfolio Management — Flashcards 1/4 (Diversification & frontière efficiente)",
    cards: [
      [
        "Que dit le portfolio approach (portfolio perspective) de Markowitz sur la façon de juger un investissement ?",
        "Juger un titre par sa ==contribution au portefeuille==, pas isolément\nEn clair : si la correlation est < +1, diversifier baisse le risque sans forcément baisser l'expected return. Le risque propre d'un titre détenu seul n'est pas payé.",
      ],
      [
        "Que montrent les données historiques (US, 1926–2017) sur le risque et le rendement des major asset classes ?",
        "Plus de rendement moyen = ==plus de standard deviation==\nEn clair : small caps : rendement et standard deviation les plus hauts ; T-bills (Treasury bills) : les plus bas. Emerging markets, low-quality corporate bonds : liquidity risk en plus.\nPiège : rendements non normaux (negative skew, kurtosis > 3) : mean et standard deviation ne suffisent pas.",
      ],
      [
        "Comment calcule-t-on la sample covariance de deux actifs à partir de T rendements historiques ?",
        "Sample covariance\n$$\\text{Cov}_{1,2} = \\dfrac{\\sum_t (R_{1,t} - \\bar{R}_1)(R_{2,t} - \\bar{R}_2)}{T - 1}$$\nEn clair : somme des produits des écarts à la moyenne ; $R_{1,t}$ = rendement de l'actif 1 en t, $\\bar{R}_1$ = sa moyenne. Cov > 0 : ils bougent ensemble ; unité %², non bornée.\nPiège : sample ÷ (T − 1), population ÷ T ; même règle pour la variance.",
      ],
      [
        "Correlation : comment la déduit-on de la covariance ? Mini-calcul : variance de A = 0,09, variance de B = 0,04, covariance = 0,006.",
        "Correlation (ici ==ρ = 0,10==)\n$$\\rho_{A,B} = \\dfrac{\\text{Cov}_{A,B}}{\\sigma_A\\,\\sigma_B}$$\nEn clair : Cov = covariance ; σ = standard deviation = √variance : σA = 0,30, σB = 0,20. ρ = 0,006 / (0,30 × 0,20) = 0,10. Sans unité, entre −1 et +1.\nPiège : diviser par les variances (0,09 × 0,04) au lieu des standard deviations (0,30 × 0,20).",
      ],
      [
        "Quelles sont les formules de l'expected return et de la standard deviation d'un portefeuille de deux actifs risqués ?",
        "Two-asset portfolio variance\n$$\\sigma_p^2 = w_1^2 \\sigma_1^2 + w_2^2 \\sigma_2^2 + 2 w_1 w_2 \\rho_{1,2} \\sigma_1 \\sigma_2$$\nEn clair : w = poids ($w_2 = 1 - w_1$), σ = standard deviation, ρ = correlation ; $\\rho_{1,2}\\sigma_1\\sigma_2$ = covariance. Expected return = moyenne pondérée : $E(R_p) = w_1 E(R_1) + w_2 E(R_2)$.\nPiège : la formule donne σp² (la variance) ; ne pas oublier la racine pour obtenir σp.",
      ],
      [
        "Portefeuille : 30 % en actions (σ = 20 %) et 70 % en obligations (σ = 12 %), correlation 0,6. Quelle standard deviation (σ) du portefeuille ?",
        "σp = √0,0167 ≈ ==12,9 %== (14,4 % si correlation = +1)\nEn clair : variance = 0,3² × 0,20² + 0,7² × 0,12² + 2 × 0,3 × 0,7 × 0,6 × 0,20 × 0,12 = 0,0036 + 0,0071 + 0,0060. Si correlation = +1 : 0,3 × 20 % + 0,7 × 12 % = 14,4 %.",
      ],
      [
        "Comment la correlation entre deux actifs change-t-elle la standard deviation (σ) d'un portefeuille ?",
        "Correlation plus basse ⇒ ==standard deviation du portefeuille plus basse==\nEn clair : ρ (correlation) = +1 : σp = moyenne pondérée des σ, aucun gain. ρ = 0 : terme croisé nul. Seul ρ = −1 permet une variance nulle.\nPiège : ρ = 0 ne suffit pas pour un risque nul ; et en crise (2008), les correlations montent.",
      ],
      [
        "Qu'est-ce que le diversification ratio ? Calcule-le si un portefeuille équipondéré a σ = 18 % et un titre pris au hasard σ = 25 %.",
        "Diversification ratio = ==σ portefeuille équipondéré ÷ σ d'un titre==\nEn clair : σ = standard deviation ; titre pris au hasard. Ici 18 % / 25 % = 0,72 : 28 % de risque en moins. Plus il est bas, plus la diversification aide ; 1 = aucun gain.\nPiège : l'équipondéré n'est pas forcément le portefeuille le moins risqué.",
      ],
      [
        "Pile : 100 USD, face : 0 USD, ou bien 50 USD certains. Que choisissent un investisseur risk-averse, risk-neutral et risk-seeking ?",
        "Risk-averse : ==50 USD certains== · risk-neutral : indifférent · risk-seeking : le pari\nEn clair : le pari a aussi une expected value de 50 USD. Les modèles financiers supposent des investisseurs risk-averse : ils prennent du risque seulement s'il est payé.",
      ],
      [
        "Quelle formule donne l'utility d'un investissement ? Calcule-la pour un risk aversion coefficient A = 4, un expected return de 10 % et une standard deviation de 20 %.",
        "Utility (ici ==U = 0,02==)\n$$U =E(R) - \\tfrac{1}{2} A \\sigma^2$$\nEn clair : E(R) = expected return, σ = standard deviation, A = risk aversion coefficient (> 0 averse, 0 neutral, < 0 seeking). Ici : 0,10 − ½ × 4 × 0,20² = 0,10 − 0,08 = 0,02.\nPiège : tout en décimales (0,20² = 0,04), jamais en %.",
      ],
      [
        "Que représente une indifference curve dans le plan risque–rendement, et que traduit une courbe plus pentue ?",
        "Indifference curve = ==même utility== ; plus pentue = plus risk-averse\nEn clair : elle relie les couples (standard deviation, expected return) de même utility ; la plus haute est préférée. Moins risk-averse : courbes plus plates, donc plus de poids dans le risky portfolio sur la CAL (capital allocation line).",
      ],
      [
        "Minimum-variance frontier, global minimum-variance portfolio et efficient frontier : comment les distinguer ?",
        "Efficient frontier = ==branche haute de la minimum-variance frontier==, dès le GMV\nEn clair : minimum-variance frontier = pour chaque expected return, le portefeuille de risque minimal. Son point le plus à gauche = GMV (global minimum-variance portfolio). La branche sous le GMV est dominée.\nPiège : le GMV fait partie de l'efficient frontier (c'est son point de départ).",
      ],
      [
        "Portefeuilles (expected return, standard deviation) : A (6 %, 10 %), B (9 %, 16 %), C (8 %, 18 %), D (12 %, 25 %). Lequel ne peut pas être sur l'efficient frontier ?",
        "==C est dominé== : B rapporte plus pour moins de risque\nEn clair : B : expected return 9 % > 8 % pour une standard deviation 16 % < 18 %. A, B et D peuvent être efficients : chaque gain de rendement y coûte du risque.",
      ],
      [
        "Investisseur : 60 % dans un portefeuille risqué (expected return 10 %, standard deviation 8 %) et 40 % dans le risk-free asset à 5 %. Expected return et standard deviation du total ?",
        "σ = ==poids risqué × σ risqué== (ici 4,8 %) ; E(R) = 8 %\nEn clair : σ = standard deviation, E(R) = expected return. Le risk-free asset a σ = 0 et Cov = 0. E(R) = 0,6 × 10 % + 0,4 × 5 % = 8 % ; σ = 0,6 × 8 % = 4,8 %. Ces mix forment la CAL (capital allocation line).",
      ],
      [
        "Avec un risk-free asset, comment un investisseur choisit-il son optimal portfolio (two-fund separation theorem) ?",
        "==Même risky portfolio pour tous== (homogeneous expectations), dosé selon la risk aversion\nEn clair : risk-free asset + optimal risky portfolio, point où la CAL (capital allocation line) la plus pentue touche l'efficient frontier. Optimum : la plus haute indifference curve touche cette CAL.",
      ],
    ],
  },
  {
    title: "Portfolio Management — Flashcards 2/4 (CML, CAPM & performance)",
    cards: [
      [
        "Qu'est-ce que la CML (capital market line), et quelle est son équation ?",
        "CML = CAL vers le ==market portfolio==\n$$E(R_p) = R_f + \\dfrac{E(R_M) - R_f}{\\sigma_M}\\,\\sigma_p$$\nEn clair : CAL (capital allocation line) dont le risky portfolio est M, le même pour tous (homogeneous expectations). E(R) = expected return, $R_f$ = risk-free rate, σ = standard deviation ; pente = Sharpe ratio de M.",
      ],
      [
        "Sur la CML (capital market line), que sont les portefeuilles à gauche et à droite du market portfolio ?",
        "Gauche : ==lending portfolios== · droite : borrowing portfolios\nEn clair : lending : une partie placée au risk-free rate. Borrowing : on emprunte au risk-free rate pour mettre plus de 100 % dans le market portfolio (buying on margin).",
      ],
      [
        "Systematic risk vs unsystematic risk : lequel est rémunéré par un expected return plus élevé, et pourquoi ?",
        "Seul le ==systematic risk== est rémunéré\nEn clair : l'unsystematic risk (firm-specific) se diversifie gratuitement, donc personne ne le paie. Total risk = systematic (market risk) + unsystematic.\nPiège : une biotech à standard deviation énorme mais beta faible a un expected return faible.",
      ],
      [
        "Combien de titres faut-il pour bien diversifier un portefeuille d'actions, et que devient chaque type de risque quand on en ajoute ?",
        "Plus de titres : ==moins d'unsystematic risk== ; 90 % du gain dès 12–18 titres\nEn clair : l'unsystematic risk (firm-specific) baisse de moins en moins vite ; vers 30 titres, il ne reste que le systematic risk (market risk).\nPiège : le beta du portefeuille (son systematic risk) peut monter ou baisser selon les titres ajoutés.",
      ],
      [
        "Qu'est-ce qu'un multifactor model (un type de return generating model), et quels types de facteurs utilise-t-il ?",
        "Multifactor model : facteurs ==macroeconomic, fundamental, statistical==\n$$E(R_i) - R_f = \\beta_{i1} E(F_1) + \\dots + \\beta_{ik} E(F_k)$$\nEn clair : excess return (au-delà du risk-free rate $R_f$) = somme des factor sensitivities $\\beta_{ik}$ × expected value $E(F_k)$ de chaque facteur. Fama-French : market, size, book-to-market ; Carhart + momentum.\nPiège : facteurs statistical : suspects de data mining.",
      ],
      [
        "Qu'est-ce que le market model, et comment s'en sert-on pour estimer le beta et l'abnormal return ?",
        "Market model : ==pente = beta==\n$$R_i = \\alpha_i + \\beta_i R_m + e_i$$\nEn clair : on régresse le rendement du titre $R_i$ sur celui du marché $R_m$ : pente $\\beta_i$ = beta, $\\alpha_i$ = intercept, résidu $e_i$ = abnormal return. En excess returns : la SCL (security characteristic line).",
      ],
      [
        "Quelle est la formule du beta d'un titre ? Calcule-le si la covariance titre–marché vaut 0,005 et la standard deviation du marché 5 %.",
        "Beta (ici ==β = 2,0==)\n$$\\beta_i = \\dfrac{\\text{Cov}_{i,m}}{\\sigma_m^2} = \\dfrac{\\rho_{i,m}\\,\\sigma_i}{\\sigma_m}$$\nEn clair : Cov = covariance, σ = standard deviation, ρ = correlation, m = marché. Ici : 0,005 / 0,05² = 0,005 / 0,0025 = 2,0. Beta du marché = 1.\nPiège : diviser par la variance du marché ($\\sigma_m^2$), pas par $\\sigma_m$.",
      ],
      [
        "Quelle est la formule du CAPM (capital asset pricing model) ? Calcule le required return pour un risk-free rate de 2 %, un expected market return de 8 % et un beta de 1,2.",
        "CAPM (ici ==9,2 %==)\n$$E(R_i) = R_f + \\beta_i\\,[E(R_M) - R_f]$$\nEn clair : $R_f$ = risk-free rate, $E(R_M) - R_f$ = market risk premium, $\\beta_i$ = beta. Ici : 2 % + 1,2 × 6 % = 9,2 %. Son graphique : la SML (security market line).\nPiège : si l'énoncé donne la market risk premium, ne pas retrancher Rf une 2e fois.",
      ],
      [
        "Quelles sont les hypothèses du CAPM (capital asset pricing model) ?",
        "Risk-averse · frictionless markets · one-period horizon · ==homogeneous expectations== · price takers\nEn clair : aussi utility maximization, actifs divisibles. Homogeneous expectations : mêmes estimations pour tous, donc même market portfolio.\nPiège : risk-neutral ou horizons différents ne sont pas des hypothèses du CAPM.",
      ],
      [
        "CML (capital market line) vs SML (security market line) : quel axe de risque, et quels actifs se placent dessus ?",
        "CML : axe ==σ (total risk)== · SML : axe beta (systematic risk)\nEn clair : σ = standard deviation. Sur la CML, seuls les portefeuilles efficients ; sur la SML, tous les titres bien évalués. Un titre seul est sous la CML mais sur la SML.",
      ],
      [
        "Action à 20, prix attendu 22 dans un an, dividende 1. Beta 1,5, risk-free rate 4 %, expected market return 10 %. Surévaluée ou sous-évaluée ?",
        "==Sous-évaluée== : rendement prévu 15 % > required return 13 %\nEn clair : prévu = (22 − 20 + 1) / 20 = 15 %. Required (CAPM, capital asset pricing model) = 4 % + 1,5 × (10 % − 4 %) = 13 %. Au-dessus de la SML (security market line) : on achète.\nPiège : au-dessus de la SML = sous-évalué ; et ne pas oublier le dividende.",
      ],
      [
        "Quelle est la formule du Sharpe ratio ? Calcule-le pour un rendement de 12 %, un risk-free rate de 4 % et une standard deviation de 16 %.",
        "Sharpe ratio (ici ==0,50==)\n$$\\text{Sharpe} = \\dfrac{R_p - R_f}{\\sigma_p}$$\nEn clair : excess return par unité de total risk ; $R_p$ = rendement, $R_f$ = risk-free rate, $\\sigma_p$ = standard deviation. Pente de la CAL (capital allocation line). Ici : (12 % − 4 %) / 16 % = 0,50.\nPiège : Sharpe utilise σ, pas beta (le beta, c'est Treynor).",
      ],
      [
        "Qu'est-ce que le M² (M-squared) ? Calcule M² et M² alpha : portefeuille 10 % (standard deviation 20 %), marché 11 % (standard deviation 30 %), risk-free rate 5 %.",
        "M² = rendement ==au risque du marché==\n$$M^2 = (R_p - R_f)\\,\\dfrac{\\sigma_M}{\\sigma_p} + R_f$$\nEn clair : σ = standard deviation ; $R_p$, $R_M$, $R_f$ = portefeuille, marché, risk-free. Ici : Sharpe (10 % − 5 %)/20 % = 0,25 ; 0,25 × 30 % + 5 % = 12,5 % ; M² alpha = 12,5 % − 11 % = +1,5 %.\nPiège : M² classe les portefeuilles comme le Sharpe ratio, mais en %.",
      ],
      [
        "Quelle est la formule du Treynor measure, et quand le préférer au Sharpe ratio ?",
        "Treynor : pour ==portefeuilles bien diversifiés==\n$$\\text{Treynor} = \\dfrac{R_p - R_f}{\\beta_p}$$\nEn clair : excess return par unité de systematic risk ($R_p$ = rendement, $R_f$ = risk-free rate, $\\beta_p$ = beta). Un seul gérant, portefeuille concentré : Sharpe ratio ou M², fondés sur la standard deviation.",
      ],
      [
        "Comment calcule-t-on le Jensen's alpha ? Mini-calcul : rendement du portefeuille 12 %, beta 1,2, risk-free rate 3 %, market return 9 %.",
        "Jensen's alpha (ici ==+1,8 %==)\n$$\\alpha_p = R_p - [R_f + \\beta_p (R_M - R_f)]$$\nEn clair : rendement réalisé $R_p$ moins required return du CAPM (capital asset pricing model) : 12 % − [3 % + 1,2 × (9 % − 3 %)] = 12 % − 10,2 %. α > 0 : au-dessus de la SML (security market line).",
      ],
    ],
  },
  {
    title: "Portfolio Management — Flashcards 3/4 (Processus, clients & IPS)",
    cards: [
      [
        "Quelles sont les 3 étapes du portfolio management process ?",
        "==Planning== · Execution · Feedback\nEn clair : planning : client, IPS (investment policy statement), benchmark. Execution : asset allocation (top-down) puis security selection (bottom-up). Feedback : monitoring, rebalancing, performance.",
      ],
      [
        "Risk tolerance, horizon et liquidity needs typiques : banks, insurance companies, endowments, foundations, DB (defined benefit) pension plans, SWF (sovereign wealth funds) ?",
        "Banks, insurance : ==risque faible, liquidité élevée== ; endowments, foundations, DB, SWF : l'inverse\nEn clair : l'inverse = risque élevé, horizon long, liquidité faible. Horizon court : banks, P&C (property and casualty) insurance ; long : life insurance. Mutual funds : liquidité élevée, le reste varie.",
      ],
      [
        "Defined benefit plan vs defined contribution plan : qui supporte l'investment risk ?",
        "DC : ==l'employé== supporte le risque ; DB : l'employeur\nEn clair : DC (defined contribution) : seule la cotisation est fixée. DB (defined benefit) : rente promise (2 % × 20 ans × salaire final 100 000 = 40 000 par an) ; l'employeur comble si les placements déçoivent.",
      ],
      [
        "Active management vs passive management : quel objectif pour chacune, et comment la capital market theory les traduit-elle ?",
        "Passive : ==répliquer un indice== · active : battre un benchmark\nEn clair : en capital market theory, passive = index fund + risk-free asset ; active = surpondérer les titres undervalued, sous-pondérer les overvalued.\nPiège : un fonds smart beta (indice construit sur un facteur) reste passive.",
      ],
      [
        "Quelles 3 tendances transforment l'asset management industry (les firmes buy-side) ?",
        "==Passive en hausse== · explosion des données · robo-advisors\nEn clair : passive ≈ 1/5 des AUM (assets under management), frais bas. Données : big data, IT coûteuse. Robo-advisors : conseil automatisé pour petits portefeuilles, barrières à l'entrée plus basses.",
      ],
      [
        "Open-end fund, closed-end fund, ETF (exchange-traded fund) : à quel prix s'échangent les parts par rapport au NAV (net asset value) ?",
        "Open-end : au NAV · closed-end : ==cours ≠ NAV== · ETF : ≈ NAV\nEn clair : NAV = net asset value. Closed-end : parts en nombre fixe, premium ou discount. ETF : coté en continu, prix tenu par l'arbitrage creation/redemption ; short et marge possibles, moins d'impôt.",
      ],
      [
        "SMA (separately managed account), hedge fund, private equity / venture capital fund : en quoi diffèrent-ils d'un mutual fund ?",
        "SMA : ==un seul investisseur== · hedge fund : qualified investors · PE/VC : rôle actif\nEn clair : SMA : sur mesure, sans parts. Hedge fund : peu réglementé, minimum 250 000 à 1 million USD. PE (private equity) buyout : beaucoup de leverage. VC (venture capital) : equity de start-ups, peu de leverage.",
      ],
      [
        "Qu'est-ce que l'IPS (investment policy statement), et que contient-il ?",
        "IPS = ==plan écrit== des objectives et constraints du client\nEn clair : contient aussi purpose, duties, procedures, guidelines (actifs permis, levier), evaluation and review (benchmark), appendices (SAA, strategic asset allocation).\nPiège : revu chaque année et à chaque grand changement, pas selon la performance récente.",
      ],
      [
        "Risk et return objectives d'un IPS (investment policy statement) : objectif absolu vs relatif, quelle différence ? Donne un exemple de chaque.",
        "Absolu : ==un chiffre fixe== · relatif : écart à un benchmark\nEn clair : absolu : « 6 % par an », « pas plus de 10 % de perte sur un an ». Relatif : « S&P 500 + 2 % », « au plus 5 % de chances de finir 4 % sous le MSCI World ».\nPiège : un peer group n'est pas investissable, donc mauvais benchmark.",
      ],
      [
        "Ability vs willingness to take risk : d'où vient chacune, et que retenir si elles divergent ?",
        "Si elles divergent, retenir ==la plus faible des deux==\nEn clair : ability (capacity) = finances : horizon, richesse face aux besoins, revenu stable. Willingness = psychologie. Willingness trop basse : le conseiller peut éduquer le client.",
      ],
      [
        "Quelles sont les 5 investment constraints d'un IPS (investment policy statement) ?",
        "Time horizon · tax · liquidity · legal and regulatory · unique circumstances\nEn clair : RRTTLLU : Risk et Return = objectives, puis Time horizon, Tax, Liquidity, Legal, Unique. Ex. unique : refus du tabac ; legal : dirigeant interdit de trader ses titres.\nPiège : la risk tolerance est un objective, pas une constraint.",
      ],
      [
        "Pour une asset allocation, comment définir les asset classes en termes de correlations ?",
        "Correlation ==forte dedans, faible entre== asset classes\nEn clair : chaque classe reste homogène ; la faible correlation entre classes réduit le risque. Le point de leur efficient frontier qui colle à l'IPS (investment policy statement) = strategic asset allocation.",
      ],
      [
        "Strategic asset allocation (SAA) vs tactical asset allocation (TAA) vs security selection : quelle différence ?",
        "SAA : ==cibles long terme== · TAA : écart court terme · security selection : dans une classe\nEn clair : SAA : poids par asset class tirés de l'IPS (investment policy statement). TAA : ex. actions de 40 % à 35 % car chères. TAA et security selection ajoutent de l'active risk.",
      ],
      [
        "Qu'est-ce que l'approche core-satellite, et quels problèmes de l'active management règle-t-elle ?",
        "==Core passif==, satellites actifs\nEn clair : la majorité (core) est indexée, une petite part (satellites) suit des stratégies actives. Évite que plusieurs gérants actifs annulent leurs paris ; limite le trading et les impôts.",
      ],
      [
        "Quelles sont les approches pour intégrer l'ESG (environmental, social, governance) dans un portefeuille ?",
        "Negative screening · positive screening · thematic, impact · engagement · ESG integration\nEn clair : exclure des secteurs ; choisir les best-in-class ; viser un thème ou un impact positif ; voter (active ownership) ; intégrer l'ESG partout.\nPiège : negative screening : benchmark = indice qui exclut les mêmes entreprises.",
      ],
    ],
  },
  {
    title: "Portfolio Management — Flashcards 4/4 (Biais & gestion des risques)",
    cards: [
      [
        "Cognitive errors vs emotional biases : d'où viennent-ils, et comment les traiter ?",
        "Cognitive : ==corriger par l'info== ; emotional : s'y adapter\nEn clair : cognitive errors = raisonnement défaillant (belief perseverance, information-processing). Emotional biases = sentiments, impulsions : difficiles à corriger, on les accommodate.\nPiège : biais mixte : on agit d'abord sur sa part cognitive.",
      ],
      [
        "Quels sont les 5 belief perseverance biases (cognitive errors) ?",
        "Conservatism · confirmation · representativeness · illusion of control · hindsight\nEn clair : conservatism : trop peu ajuster sa vue. Confirmation : chercher ce qui confirme. Representativeness : juger par ressemblance. Illusion of control : croire influencer. Hindsight : « je le savais ».\nPiège : base-rate neglect et sample-size neglect sont deux formes de representativeness.",
      ],
      [
        "Quels sont les 4 information-processing biases (cognitive errors) ?",
        "Anchoring · mental accounting · framing · availability\nEn clair : anchoring : trop peu s'écarter du chiffre de départ. Mental accounting : l'argent rangé selon son origine. Framing : la présentation change le choix. Availability : ce qui vient vite à l'esprit.",
      ],
      [
        "Quels sont les 6 emotional biases ?",
        "Loss aversion · overconfidence · self-control · ==status quo, endowment, regret aversion==\nEn clair : overconfidence : surestimer son savoir. Self-control : préférer le présent. Les 3 derniers figent : ne rien changer, surévaluer ce qu'on a, ne pas agir par peur du regret.\nPiège : l'overconfidence, mi-cognitive, est classée emotional.",
      ],
      [
        "Loss aversion vs risk aversion : quelle différence, et que fait un investisseur loss-averse face à une perte ?",
        "Loss-averse : ==garde ses perdants==, vend ses gagnants trop tôt\nEn clair : risk aversion : à rendement égal, préférer le moins risqué. Loss aversion : une perte fait plus mal qu'un gain égal ne fait plaisir ; on prend du risque pour ne pas réaliser la perte.",
      ],
      [
        "À quels biais la behavioral finance associe-t-elle les bubbles et les crashes ?",
        "Overconfidence · confirmation · anchoring · regret aversion\nEn clair : overconfidence : overtrading, risque sous-estimé. Confirmation : ignorer les signaux de baisse. Anchoring : croire rationnels les sommets récents. Regret : rester investi pour ne pas rater la hausse.",
      ],
      [
        "Comment explique-t-on la value vs growth anomaly et le home bias ?",
        "Value > growth : ==risk premium ou halo effect== ; home bias : familiarité\nEn clair : risk premium : facteurs size et book-to-market de Fama-French. Halo effect (representativeness) : growth stocks surpayés. Home bias : surpondérer son pays, par impression de mieux s'informer.",
      ],
      [
        "Le but du risk management est-il de minimiser le risque ?",
        "Non : viser le ==bon ensemble de risques==, pas zéro\nEn clair : l'optimal bundle of risks, compatible avec la risk tolerance. Étapes : fixer la tolerance, identifier et mesurer les risques, les modifier, les suivre.\nPiège : on contrôle le risque pris, pas les rendements.",
      ],
      [
        "À quel niveau se décide la risk governance, et que couvre un risk management framework ?",
        "Risk governance : ==senior management, vue entreprise==\nEn clair : le framework couvre governance, risk tolerance, identification et mesure, gestion, monitoring, communication, strategic risk analysis.\nPiège : fixer des position limits relève de l'exécution, pas du framework.",
      ],
      [
        "Qu'est-ce que le risk budgeting ?",
        "Risk budgeting = ==répartir le risque total== accepté\nEn clair : on alloue la risk tolerance entre actifs, stratégies ou facteurs (strategic, tactical asset allocation, security selection), là où le risque rapporte le plus. Mesures : beta, VaR (value at risk), duration.",
      ],
      [
        "Financial risks vs non-financial risks : lesquels sont lesquels, et comment interagissent-ils ?",
        "Financial : ==market, credit, liquidity== ; non-financial : operational, solvency, model, legal…\nEn clair : ils interagissent : couvrir un market risk par options crée un credit risk de contrepartie, puis legal, liquidity, solvency risk. Individus : mortality risk (→ life insurance), longevity risk (→ annuity).\nPiège : solvency risk et settlement risk sont non-financial, pas financial.",
      ],
      [
        "Quelle mesure de risque pour un actif seul, une action en portefeuille diversifié, une obligation et un derivative ?",
        "Actif seul : σ · action en portefeuille : beta · obligation : duration · derivative : Greeks\nEn clair : σ = standard deviation. Greeks : delta (prix du sous-jacent), gamma (variation du delta), vega (volatility), rho (risk-free rate). Tail risk : VaR (value at risk), CVaR (conditional VaR).",
      ],
      [
        "VaR (value at risk) mensuelle de 1 million à 5 % : que signifie-t-elle, et que mesure la CVaR (conditional VaR) ?",
        "VaR = ==perte minimale== dans 5 % des cas, pas maximale\nEn clair : une perte d'au moins 1 million arrive 5 % des mois. CVaR (conditional VaR) = perte moyenne sachant que la perte dépasse la VaR. Résultat très sensible au modèle.",
      ],
      [
        "Stress testing vs scenario analysis : quelle différence ?",
        "Stress test : ==une variable extrême== ; scenario : plusieurs ensemble\nEn clair : stress testing : choc extrême sur une variable clé (taux, change). Scenario analysis : plusieurs variables changées à la fois (taux + pétrole + change). Les deux complètent la VaR (value at risk).",
      ],
      [
        "Quelles sont les 4 façons de modifier une exposition au risque, et quelle différence entre risk transfer et risk shifting ?",
        "Avoid · accept · transfer (insurance) · ==shift (derivatives)==\nEn clair : transfer : un tiers prend le risque (insurance, surety bond, fidelity bond). Shift : on change la distribution des résultats (un put fixe un prix plancher). Accept : self-insurance.\nPiège : insurance = transfer ; derivatives = shifting, pas l'inverse.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "flashcards");
  console.log("Flashcards — Système Portfolio Management (4 paquets × 15)...");
  const total = await seedFlashcardSets({ ownerId, folderId, sets: SETS, oldTitles });
  console.log(`\n✅ Terminé. ${total} cartes ajoutées.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  });
}
