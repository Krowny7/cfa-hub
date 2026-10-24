// Seed script — flashcards "Système" Portfolio Management.
// 4 paquets de 15 cartes (60), à réviser en une nuit avec le one-pager Portfolio Management.
// Format « trois cases » : À retenir (≤ 12 mots, ==surligné==, ou formule, ou liste « · »),
// puis « En clair : … », puis « Piège : … » s'il y a un vrai piège.
// Chaque carte se comprend seule (cartes mélangées) : phrases en français, termes techniques en anglais.
// Cartes de calcul : formule générale dans « À retenir », application chiffrée dans « En clair ».
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
        "Juger un titre par sa ==contribution au portefeuille==, pas isolément\nEn clair : Si la correlation est inférieure à +1, diversifier baisse le risque sans forcément baisser l'expected return. Le risque propre d'un titre détenu seul n'est pas rémunéré.",
      ],
      [
        "Que montrent les données historiques US depuis 1926 sur le risque et le rendement des major asset classes ?",
        "Plus de rendement moyen = ==plus de standard deviation==\nEn clair : Les small caps ont rendement et standard deviation les plus hauts, les T-bills (Treasury bills) les plus bas. La liquidity compte (emerging markets, low-quality bonds).\nPiège : Rendements non normaux (skew < 0, kurtosis > 3) : mean et variance ne suffisent pas.",
      ],
      [
        "Formule de la sample covariance de deux actifs, à partir de T rendements historiques ?",
        "Sample covariance\n$$\\text{Cov}_{1,2} = \\dfrac{\\sum_t (R_{1,t} - \\bar{R}_1)(R_{2,t} - \\bar{R}_2)}{T - 1}$$\nEn clair : On somme les produits des écarts à la moyenne ($R_{1,t}$ = rendement de l'actif 1 en t, $\\bar{R}_1$ = sa moyenne). Cov > 0 : les deux actifs bougent ensemble ; unité %², sans borne.\nPiège : Sample : ÷ (T − 1) ; population : ÷ T.",
      ],
      [
        "Formule de la correlation de deux actifs à partir de leur covariance ? Application : variance de A = 0,09, variance de B = 0,04, covariance = 0,006.",
        "Correlation\n$$\\rho_{A,B} = \\dfrac{\\text{Cov}_{A,B}}{\\sigma_A\\,\\sigma_B}$$\nEn clair : Ici $\\sigma_A$ = √0,09 = 0,30 et $\\sigma_B$ = √0,04 = 0,20, donc ρ = 0,006 / (0,30 × 0,20) = 0,10. Cov = covariance, σ = standard deviation ; ρ, sans unité, va de −1 à +1.\nPiège : Diviser par les standard deviations (0,30 × 0,20), pas par les variances (0,09 × 0,04).",
      ],
      [
        "Formule de la variance d'un portefeuille de deux actifs risqués ? Application : standard deviation (σ) si 30 % en actions (σ = 20 %), 70 % en obligations (σ = 12 %), correlation 0,6.",
        "Two-asset portfolio variance\n$$\\sigma_p^2 = w_1^2 \\sigma_1^2 + w_2^2 \\sigma_2^2 + 2 w_1 w_2 \\rho_{1,2} \\sigma_1 \\sigma_2$$\nEn clair : 0,3² × 0,2² + 0,7² × 0,12² + 2 × 0,3 × 0,7 × 0,6 × 0,2 × 0,12 = 0,0167, donc σp ≈ 12,9 % (14,4 % si ρ = +1). Ici w = poids, σ = standard deviation, ρ = correlation.\nPiège : La formule donne la variance : prendre la racine pour obtenir σp.",
      ],
      [
        "Formule de la sample standard deviation de T rendements historiques ? Application : rendements annuels 5 %, −3 %, −4 %, 2 %, 6 %.",
        "Sample standard deviation\n$$s = \\sqrt{\\dfrac{\\sum_{t=1}^{T} (R_t - \\bar{R})^2}{T - 1}}$$\nEn clair : Moyenne $\\bar{R}$ = 6 / 5 = 1,2 %. Carrés des écarts : 14,44 + 17,64 + 27,04 + 0,64 + 23,04 = 82,8 ; 82,8 / 4 = 20,7, donc s = √20,7 ≈ 4,55 %.\nPiège : Population : ÷ T, soit √(82,8 / 5) ≈ 4,07 % ; un échantillon se divise par T − 1.",
      ],
      [
        "Comment la correlation entre deux actifs change-t-elle la standard deviation (σ) d'un portefeuille ?",
        "Correlation plus basse ⇒ ==standard deviation du portefeuille plus basse==\nEn clair : Si ρ (correlation) = +1, σp est la moyenne pondérée des σ : aucun gain. Si ρ = 0, le terme de covariance disparaît. Seul ρ = −1 permet une variance nulle.\nPiège : En crise (2008), les correlations montent : la diversification protège moins.",
      ],
      [
        "Formule du diversification ratio ? Application : portefeuille équipondéré à σ = 18 %, titre pris au hasard à σ = 25 %.",
        "Diversification ratio (plus bas = mieux)\n$$\\text{Diversification ratio} = \\dfrac{\\sigma_{\\text{EW portfolio}}}{\\sigma_{\\text{random security}}}$$\nEn clair : Ici 18 % / 25 % = 0,72 : 28 % de risque en moins. EW = equally weighted (équipondéré), σ = standard deviation ; un ratio de 1 = aucun gain.\nPiège : L'équipondéré n'est pas forcément le portefeuille le moins risqué.",
      ],
      [
        "Pile : 100 USD, face : 0 USD, ou bien 50 USD certains. Que choisissent un investisseur risk-averse, risk-neutral et risk-seeking ?",
        "Risk-averse : ==50 USD certains== · Risk-neutral : ==indifférent== · Risk-seeking : ==le pari==\nEn clair : Le pari a la même expected value : 0,5 × 100 + 0,5 × 0 = 50 USD. Les modèles financiers supposent des investisseurs risk-averse : ils ne prennent du risque que s'il est payé.",
      ],
      [
        "Formule de l'utility d'un investissement ? Application : risk aversion coefficient A = 4, expected return 10 %, standard deviation 20 %.",
        "Utility\n$$U = E(R) - \\tfrac{1}{2} A \\sigma^2$$\nEn clair : Ici 0,10 − ½ × 4 × 0,20² = 0,10 − 0,08 = 0,02. E(R) = expected return, σ = standard deviation, A = risk aversion coefficient (> 0 averse, 0 neutral, < 0 seeking).\nPiège : Tout en décimales (0,20² = 0,04), jamais en %.",
      ],
      [
        "Que représente une indifference curve dans le plan risque–rendement, et que traduit une courbe plus pentue ?",
        "Indifference curve : ==même utility== · Plus pentue : ==plus risk-averse==\nEn clair : Une indifference curve relie les couples (standard deviation, expected return) de même utility ; on préfère la plus haute. Moins risk-averse : courbe plus plate, plus d'actif risqué.",
      ],
      [
        "Minimum-variance frontier, global minimum-variance portfolio et efficient frontier : comment les distinguer ?",
        "Minimum-variance frontier : ==σ minimal== · GMV : ==extrémité gauche== · Efficient frontier : ==au-dessus du GMV==\nEn clair : La minimum-variance frontier donne le plus petit σ (standard deviation) par expected return. Sous le GMV (global minimum-variance portfolio), tout est dominé.\nPiège : Le GMV appartient à l'efficient frontier.",
      ],
      [
        "Portefeuilles (expected return, standard deviation) : A (6 %, 10 %), B (9 %, 16 %), C (8 %, 18 %), D (12 %, 25 %). Lequel ne peut pas être sur l'efficient frontier ?",
        "==C est dominé== : B rapporte plus pour moins de risque\nEn clair : B offre un expected return de 9 % (> 8 %) pour une standard deviation de 16 % (< 18 %). A, B et D peuvent être efficients : chaque gain de rendement y coûte du risque.",
      ],
      [
        "Formules de l'expected return et de la standard deviation (σ) d'un mix risky portfolio + risk-free asset ? Application : 60 % en risqué (expected return 10 %, σ 8 %), 40 % à 5 % (risk-free rate).",
        "Mix risky portfolio + risk-free asset\n$$E(R_p) = w\\,E(R_{\\text{risky}}) + (1 - w)\\,R_f$$\n$$\\sigma_p = w\\,\\sigma_{\\text{risky}}$$\nEn clair : Ici E(R) = 0,6 × 10 % + 0,4 × 5 % = 8 % et σ = 0,6 × 8 % = 4,8 %. w = poids du risqué ; le risk-free asset a σ = 0 et Cov = 0. Ces mix forment la CAL (capital allocation line).",
      ],
      [
        "Avec un risk-free asset, comment un investisseur choisit-il son optimal portfolio (two-fund separation theorem) ?",
        "==Même risky portfolio pour tous== (homogeneous expectations), dosé selon la risk aversion\nEn clair : Chacun combine le risk-free asset et l'optimal risky portfolio, tangent à la CAL (capital allocation line) la plus pentue. La plus haute indifference curve qui touche cette CAL fixe le dosage.",
      ],
    ],
  },
  {
    title: "Portfolio Management — Flashcards 2/4 (CML, CAPM & performance)",
    cards: [
      [
        "Qu'est-ce que la CML (capital market line), et quelle est son équation ?",
        "CML = CAL vers le ==market portfolio==\n$$E(R_p) = R_f + \\dfrac{E(R_M) - R_f}{\\sigma_M}\\,\\sigma_p$$\nEn clair : La CML est la CAL (capital allocation line) passant par le market portfolio M. Pente = Sharpe ratio de M ; E(R) = expected return, σ = standard deviation, $R_f$ = risk-free rate.",
      ],
      [
        "Sur la CML (capital market line), que sont les portefeuilles à gauche et à droite du market portfolio ?",
        "Gauche : ==lending portfolios== · Droite : ==borrowing portfolios==\nEn clair : À gauche, une partie est prêtée au risk-free rate. À droite, on emprunte au risk-free rate pour investir plus de 100 % dans le market portfolio (buying on margin).",
      ],
      [
        "Systematic risk vs unsystematic risk : lequel est rémunéré par un expected return plus élevé, et pourquoi ?",
        "Systematic (market) : ==rémunéré== · Unsystematic : ==non rémunéré, diversifiable gratuitement==\nEn clair : L'unsystematic (firm-specific) risk s'élimine sans coût, donc personne ne le paie. Total risk = systematic + unsystematic.\nPiège : Une biotech à standard deviation énorme mais beta faible a un expected return faible.",
      ],
      [
        "Combien de titres faut-il pour bien diversifier un portefeuille d'actions, et que devient chaque type de risque quand on en ajoute ?",
        "Nombre : ==12–18 titres== · Unsystematic risk : ==baisse vers zéro== · Systematic risk : ==non diversifiable==\nEn clair : 12 à 18 titres donnent 90 % du gain de diversification. Vers 30 titres, le risque total plafonne au niveau du systematic risk.\nPiège : Le beta du portefeuille peut monter ou baisser selon les titres ajoutés.",
      ],
      [
        "Qu'est-ce qu'un multifactor model (un type de return generating model), et quels types de facteurs utilise-t-il ?",
        "Multifactor model : facteurs ==macroeconomic, fundamental, statistical==\n$$E(R_i) - R_f = \\beta_{i1} E(F_1) + \\dots + \\beta_{ik} E(F_k)$$\nEn clair : L'excess return (au-delà du risk-free rate $R_f$) est la somme des factor sensitivities $\\beta_{ik}$ × expected value $E(F_k)$. Fama-French : market, size, book-to-market ; Carhart + momentum.\nPiège : Les facteurs statistical sont suspects de data mining.",
      ],
      [
        "Qu'est-ce que le market model, et comment s'en sert-on pour estimer le beta et l'abnormal return ?",
        "Market model : ==pente = beta==\n$$R_i = \\alpha_i + \\beta_i R_m + e_i$$\nEn clair : On régresse le rendement du titre $R_i$ sur celui du marché $R_m$ : la pente $\\beta_i$ est le beta, $\\alpha_i$ l'intercept, le résidu $e_i$ l'abnormal return. En excess returns, c'est la SCL (security characteristic line).",
      ],
      [
        "Formule du beta d'un titre ? Application : covariance titre–marché = 0,005, standard deviation du marché = 5 %.",
        "Beta\n$$\\beta_i = \\dfrac{\\text{Cov}_{i,m}}{\\sigma_m^2} = \\dfrac{\\rho_{i,m}\\,\\sigma_i}{\\sigma_m}$$\nEn clair : Ici 0,005 / 0,05² = 0,005 / 0,0025 = 2,0. Cov = covariance, σ = standard deviation, ρ = correlation, m = marché ; le beta du marché vaut 1.\nPiège : Diviser par la variance du marché ($\\sigma_m^2$), pas par $\\sigma_m$.",
      ],
      [
        "Formule du CAPM (capital asset pricing model) ? Application : risk-free rate 2 %, expected market return 8 %, beta 1,2.",
        "CAPM (required return)\n$$E(R_i) = R_f + \\beta_i\\,[E(R_M) - R_f]$$\nEn clair : Ici 2 % + 1,2 × (8 % − 2 %) = 9,2 %. $R_f$ = risk-free rate, $E(R_M) - R_f$ = market risk premium, $\\beta_i$ = beta ; son graphique est la SML (security market line).\nPiège : Si l'énoncé donne la market risk premium, ne pas retrancher $R_f$ une 2e fois.",
      ],
      [
        "Quelles sont les hypothèses du CAPM (capital asset pricing model) ?",
        "==Risk-averse== · ==Frictionless== markets · ==One-period== horizon · ==Homogeneous expectations== · ==Price takers==\nEn clair : Le CAPM suppose aussi utility maximization et actifs divisibles. Homogeneous expectations : tous voient le même market portfolio.\nPiège : Risk-neutral ou horizons différents : pas des hypothèses du CAPM.",
      ],
      [
        "CML (capital market line) vs SML (security market line) : quel axe de risque, et quels actifs se placent dessus ?",
        "CML : ==axe σ, portefeuilles efficients== · SML : ==axe beta, chaque titre==\nEn clair : La CML mesure le total risk (σ = standard deviation), la SML le systematic risk. Un titre seul est donc sous la CML, mais sur la SML s'il est bien évalué.",
      ],
      [
        "Formules pour juger si une action est sous-évaluée (CAPM) ? Application : cours 20, prix attendu 22 dans un an, dividende 1, beta 1,5, risk-free rate 4 %, expected market return 10 %.",
        "Sous-évaluée si forecast > required return\n$$\\text{Forecast return} = \\dfrac{P_1 - P_0 + D_1}{P_0}$$\n$$\\text{Required return} = R_f + \\beta\\,[E(R_M) - R_f]$$\nEn clair : Forecast = (22 − 20 + 1) / 20 = 15 % ($P_0$ cours, $P_1$ prix attendu, $D_1$ dividende). Required (CAPM, capital asset pricing model) = 4 % + 1,5 × 6 % = 13 % < 15 % : l'action est sous-évaluée, on achète.\nPiège : Au-dessus de la SML (security market line) = sous-évalué ; ne pas oublier le dividende $D_1$.",
      ],
      [
        "Formule du Sharpe ratio ? Application : rendement 12 %, risk-free rate 4 %, standard deviation 16 %.",
        "Sharpe ratio\n$$\\text{Sharpe} = \\dfrac{R_p - R_f}{\\sigma_p}$$\nEn clair : Ici (12 % − 4 %) / 16 % = 0,50 : l'excess return par unité de total risk, pente de la CAL (capital allocation line). $R_p$ = rendement, $R_f$ = risk-free rate, $\\sigma_p$ = standard deviation.\nPiège : Le Sharpe ratio utilise σ, pas le beta (le beta, c'est Treynor).",
      ],
      [
        "Formule du M² (M-squared) ? Application (M² et M² alpha) : portefeuille 10 % (standard deviation 20 %), marché 11 % (standard deviation 30 %), risk-free rate 5 %.",
        "M² : rendement au σ du marché\n$$M^2 = (R_p - R_f)\\,\\dfrac{\\sigma_M}{\\sigma_p} + R_f$$\n$$M^2\\ \\text{alpha} = M^2 - R_M$$\nEn clair : Ici Sharpe ratio = (10 − 5) / 20 = 0,25, donc M² = 0,25 × 30 % + 5 % = 12,5 % et M² alpha = 12,5 − 11 = +1,5 %. Indices p, M, f = portefeuille, marché, risk-free.\nPiège : M² classe les portefeuilles comme le Sharpe ratio, mais en %.",
      ],
      [
        "Formule du Treynor measure, et quand le préférer au Sharpe ratio ?",
        "Treynor : pour ==portefeuilles bien diversifiés==\n$$\\text{Treynor} = \\dfrac{R_p - R_f}{\\beta_p}$$\nEn clair : Le Treynor measure est l'excess return par unité de systematic risk ($R_p$ = rendement, $R_f$ = risk-free rate, $\\beta_p$ = beta). Pour un seul gérant peu diversifié : Sharpe ratio ou M².",
      ],
      [
        "Formule du Jensen's alpha ? Application : rendement du portefeuille 12 %, beta 1,2, risk-free rate 3 %, market return 9 %.",
        "Jensen's alpha\n$$\\alpha_p = R_p - [R_f + \\beta_p (R_M - R_f)]$$\nEn clair : Ici 12 % − [3 % + 1,2 × (9 % − 3 %)] = 12 % − 10,2 % = +1,8 %. C'est le rendement réalisé moins le required return du CAPM (capital asset pricing model).\nPiège : α > 0 = au-dessus de la SML (security market line), pas de la CML.",
      ],
    ],
  },
  {
    title: "Portfolio Management — Flashcards 3/4 (Processus, clients & IPS)",
    cards: [
      [
        "Quelles sont les 3 étapes du portfolio management process ?",
        "==Planning== · ==Execution== · ==Feedback==\nEn clair : Planning : client, IPS (investment policy statement), benchmark. Execution : asset allocation (top-down) puis security selection (bottom-up). Feedback : monitoring, rebalancing, performance.",
      ],
      [
        "Quels investisseurs ont une risk tolerance faible et des liquidity needs élevés : banks, insurance companies, endowments, foundations ou DB (defined benefit) pension plans ?",
        "==Banks et insurance companies== : risk tolerance faible, liquidity needs élevés\nEn clair : Endowments, foundations et DB pension plans sont l'inverse : risk tolerance élevée, horizon long, peu de liquidity needs.\nPiège : Horizon long en life insurance, court pour banks et P&C (property and casualty).",
      ],
      [
        "Defined benefit plan vs defined contribution plan : qui supporte l'investment risk ?",
        "DC : ==l'employé== porte le risque · DB : ==l'employeur== porte le risque\nEn clair : Un DC (defined contribution) plan fixe seulement la cotisation. Un DB (defined benefit) plan promet une rente (2 % × 20 ans × salaire final 100 000 = 40 000 par an) que l'employeur doit financer.",
      ],
      [
        "Active management vs passive management : quel objectif pour chacune ?",
        "Passive : ==répliquer un indice== · Active : ==battre un benchmark==\nEn clair : En capital market theory : passive = index fund + risk-free asset ; active = surpondérer les undervalued. Le passive pèse ≈ 1/5 des AUM (assets under management), en hausse.\nPiège : Un fonds smart beta (indice construit sur un facteur) reste passive.",
      ],
      [
        "Asset management industry : qu'est-ce qu'un full-service, un specialist et un multi-boutique asset manager ?",
        "Full-service : ==toutes asset classes== · Specialist : ==une seule spécialité== · Multi-boutique : ==holding de specialists==\nEn clair : Tous sont buy-side, à l'inverse des broker-dealers (sell-side). Le big data rend l'IT coûteuse ; les robo-advisors abaissent les barrières à l'entrée.\nPiège : Plusieurs filiales spécialisées = multi-boutique.",
      ],
      [
        "Open-end fund, closed-end fund, ETF (exchange-traded fund) : à quel prix s'échangent les parts par rapport au NAV (net asset value) ?",
        "Open-end : ==au NAV== · Closed-end : ==cours ≠ NAV== · ETF : ==≈ NAV==\nEn clair : Un closed-end fund a un nombre fixe de parts, d'où un premium ou un discount. Un ETF cote en continu ; l'arbitrage creation/redemption tient son prix, short et marge possibles.\nPiège : ETF : brokerage costs ; open-end fund : aucun, on traite avec le fonds.",
      ],
      [
        "SMA (separately managed account), hedge fund, private equity / venture capital fund : en quoi diffèrent-ils d'un mutual fund ?",
        "SMA : ==un seul investisseur== · Hedge fund : ==qualified investors== · PE/VC : ==co-gèrent les sociétés==\nEn clair : Un SMA, sur mesure, n'émet aucune part. Un hedge fund est peu réglementé (minimum 250 000 à 1 million USD) ; PE (private equity) et VC (venture capital) aident à gérer, puis revendent les sociétés.",
      ],
      [
        "Qu'est-ce que l'IPS (investment policy statement), et que contient-il ?",
        "IPS = ==plan écrit== des objectives et constraints du client\nEn clair : L'IPS contient aussi purpose, duties, procedures, guidelines (actifs permis, levier), evaluation and review (benchmark), appendices (SAA = strategic asset allocation).\nPiège : Revu chaque année et à chaque grand changement, pas selon la performance récente.",
      ],
      [
        "Risk et return objectives d'un IPS (investment policy statement) : objectif absolu vs relatif, quelle différence ?",
        "Absolu : ==un chiffre fixe== · Relatif : ==écart à un benchmark==\nEn clair : Exemples absolus : « 6 % par an », « au plus 10 % de perte sur un an ». Exemples relatifs : « S&P 500 + 2 % », « au plus 5 % de chances de finir 4 % sous le MSCI World ».\nPiège : Un peer group n'est pas investissable, donc mauvais benchmark.",
      ],
      [
        "Ability vs willingness to take risk : d'où vient chacune, et que retenir si elles divergent ?",
        "Ability : ==capacité financière== · Willingness : ==psychologie== · Divergence : ==retenir la plus faible==\nEn clair : L'ability (capacity) dépend de l'horizon, de la richesse face aux besoins et de la stabilité du revenu. Si la willingness est trop basse, le conseiller peut éduquer le client.",
      ],
      [
        "Quelles sont les 5 investment constraints d'un IPS (investment policy statement) ?",
        "==Time horizon== · ==Tax== · ==Liquidity== · ==Legal and regulatory== · ==Unique circumstances==\nEn clair : Mnémo RRTTLLU : Risk et Return sont les objectives, les 5 autres les constraints. Unique : refus du tabac. Legal : dirigeant bridé sur les titres de sa firme.\nPiège : La risk tolerance est un objective, pas une constraint.",
      ],
      [
        "Pour une asset allocation, comment définir les asset classes en termes de correlations ?",
        "Correlation ==forte dedans, faible entre== asset classes\nEn clair : Chaque classe reste homogène ; la faible correlation entre classes réduit le risque. Le point de leur efficient frontier adapté à l'IPS (investment policy statement) = strategic asset allocation.",
      ],
      [
        "Strategic asset allocation (SAA) vs tactical asset allocation (TAA) vs security selection : quelle différence ?",
        "SAA : ==cibles long terme== · TAA : ==écart court terme== · Security selection : ==choisir les titres==\nEn clair : La SAA fixe les poids par asset class à partir de l'IPS (investment policy statement). Exemple de TAA : actions de 40 % à 35 % car chères ; TAA et security selection ajoutent de l'active risk.",
      ],
      [
        "Qu'est-ce que l'approche core-satellite, et quels problèmes de l'active management règle-t-elle ?",
        "Core : ==indexé (passive)== · Satellites : ==stratégies actives== · Gain : ==moins de paris annulés==\nEn clair : La majorité du portefeuille (core) est indexée, une petite part (satellites) est gérée activement. Plusieurs gérants actifs ne s'annulent plus entre eux ; trading et impôts baissent.",
      ],
      [
        "Quelles sont les approches pour intégrer l'ESG (environmental, social, governance) dans un portefeuille ?",
        "==Negative== screening · ==Positive== screening · ==Thematic, impact== · ==Engagement== · ==ESG integration==\nEn clair : On exclut des secteurs, choisit les best-in-class, vise un thème ou un impact, vote (active ownership) ou intègre l'ESG partout.\nPiège : Negative screening : benchmark = indice qui exclut les mêmes entreprises.",
      ],
    ],
  },
  {
    title: "Portfolio Management — Flashcards 4/4 (Biais & gestion des risques)",
    cards: [
      [
        "Cognitive errors vs emotional biases : d'où viennent-ils, et comment les traiter ?",
        "Cognitive errors : ==raisonnement faux, corrigeable== · Emotional biases : ==sentiments, à accommoder==\nEn clair : Les cognitive errors viennent d'un raisonnement défaillant : l'info les corrige. Les emotional biases, spontanés, se corrigent mal : on s'y adapte.\nPiège : Biais mixte : on agit d'abord sur sa part cognitive.",
      ],
      [
        "Quels sont les 5 belief perseverance biases (cognitive errors) ?",
        "==Conservatism== · ==Confirmation== · ==Representativeness== · ==Illusion of control== · ==Hindsight==\nEn clair : Conservatism : réviser trop peu. Confirmation : chercher ce qui confirme. Representativeness : juger par ressemblance. Hindsight : « je le savais ».\nPiège : Base-rate et sample-size neglect = representativeness.",
      ],
      [
        "Quels sont les 4 information-processing biases (cognitive errors) ?",
        "==Anchoring== · ==Mental accounting== · ==Framing== · ==Availability==\nEn clair : Anchoring : coller au chiffre de départ. Mental accounting : traiter l'argent selon sa source. Framing : la présentation change le choix. Availability : croire probable ce qui vient vite à l'esprit.",
      ],
      [
        "Quels sont les 6 emotional biases ?",
        "==Loss aversion== · ==Overconfidence== · ==Self-control== · ==Status quo, endowment== · ==Regret aversion==\nEn clair : Overconfidence : se surestimer. Self-control : préférer le présent. Status quo, endowment, regret aversion : ne rien changer, surévaluer ce qu'on a, fuir le regret.\nPiège : L'overconfidence, mi-cognitive, est classée emotional.",
      ],
      [
        "Loss aversion vs risk aversion : quelle différence, et que fait un investisseur loss-averse face à une perte ?",
        "Risk aversion : ==le moins risqué== · Loss aversion : ==pertes plus douloureuses== · Réflexe : ==garder ses perdants==\nEn clair : Le risk-averse choisit, à rendement égal, le moins risqué. Le loss-averse prend du risque pour ne pas réaliser sa perte : il garde ses perdants et vend ses gagnants trop tôt.",
      ],
      [
        "À quels biais la behavioral finance associe-t-elle les bubbles et les crashes ?",
        "==Overconfidence== · ==Confirmation== · ==Anchoring== · ==Regret aversion==\nEn clair : Overconfidence (aidée par self-attribution, hindsight) : overtrading. Confirmation : ignorer les signaux de baisse. Anchoring : croire rationnels les sommets récents. Regret aversion : rester investi.",
      ],
      [
        "Comment explique-t-on la value vs growth anomaly et le home bias ?",
        "Value/growth : ==risque ou halo effect== · Home bias : ==familiarité==\nEn clair : Risque : les facteurs size et book-to-market de Fama-French expliquent la value premium. Halo effect (representativeness) : on surpaie les growth stocks. Home bias : on surpondère son pays.",
      ],
      [
        "Le but du risk management est-il de minimiser le risque, et que couvre un risk management framework ?",
        "But : ==optimal bundle of risks== · Framework : ==governance, tolerance, mesure, monitoring…==\nEn clair : On ne vise pas le risque zéro mais les risques payants, selon la risk tolerance. Le risk management framework couvre aussi gestion, communication, strategic risk analysis.\nPiège : Les position limits ne font pas partie du framework.",
      ],
      [
        "Qui fixe la risk tolerance d'une organisation (risk governance), et de quels facteurs dépend-elle ?",
        "Qui : ==le senior management== · Facteurs : ==métier, chocs, regulation, solidité==\nEn clair : La risk governance se fait au niveau de toute l'entreprise. Facteurs : expertise métier, résistance aux chocs, regulatory environment, financial strength.\nPiège : Risk tolerance basse ≠ tout réduire : on choisit les risques à garder.",
      ],
      [
        "Qu'est-ce que le risk budgeting ?",
        "Risk budgeting = ==répartir le risque total== accepté\nEn clair : On alloue le risque toléré entre asset classes, stratégies ou risk factors, là où il rapporte le plus. Le budget peut tenir en une mesure : beta, VaR (value at risk), duration.",
      ],
      [
        "Financial risks vs non-financial risks : lesquels sont lesquels ?",
        "Financial : ==market, credit, liquidity== · Non-financial : ==operational, solvency, model, legal…==\nEn clair : Les deux types interagissent : un hedge par options crée un credit risk, puis legal, liquidity et solvency risk. Individus : mortality risk → life insurance, longevity risk → annuity.\nPiège : Solvency et settlement risk sont non-financial.",
      ],
      [
        "Quelle mesure de risque pour un actif seul, une action en portefeuille diversifié, une obligation et un derivative ?",
        "Actif seul : ==σ== · Action en portefeuille : ==beta== · Obligation : ==duration== · Derivative : ==Greeks==\nEn clair : Greeks : delta (prix du sous-jacent), gamma (variation du delta), vega (volatility), rho (risk-free rate). Tail risk : VaR (value at risk), CVaR (conditional VaR). σ = standard deviation.",
      ],
      [
        "VaR (value at risk) mensuelle de 1 million à 5 % : que signifie-t-elle, et que mesure la CVaR (conditional VaR) ?",
        "VaR : ==perte minimale==, pas maximale · CVaR : ==moyenne des pertes au-delà==\nEn clair : Une perte d'au moins 1 million arrive 5 % des mois. La CVaR (conditional VaR) est la perte moyenne quand la perte dépasse 1 million ; le résultat dépend beaucoup du modèle.",
      ],
      [
        "Stress testing vs scenario analysis : quelle différence ?",
        "Stress testing : ==une variable extrême== · Scenario analysis : ==plusieurs variables ensemble==\nEn clair : Un stress test choque une variable clé (taux, change) ; une scenario analysis change plusieurs variables à la fois (taux + pétrole + change). Les deux complètent la VaR (value at risk).",
      ],
      [
        "Quelles sont les 4 façons de modifier une exposition au risque, et quelle différence entre risk transfer et risk shifting ?",
        "==Avoid== · ==Accept== · ==Transfer (insurance)== · ==Shift (derivatives)==\nEn clair : Le transfer confie le risque à un tiers (insurance, surety ou fidelity bond). Le shifting change la distribution des résultats (put = plancher). Accept = self-insurance.\nPiège : Insurance = transfer ; derivatives = shifting, pas l'inverse.",
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
