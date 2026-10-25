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
        "Risk-averse : ==préfère le gain certain== → 50 USD · Risk-neutral : ==ne regarde que l'expected value== → indifférent · Risk-seeking : ==préfère le pari risqué==\nEn clair : Le pari a la même expected value : 0,5 × 100 + 0,5 × 0 = 50 USD. Les modèles financiers supposent des investisseurs risk-averse : ils ne prennent du risque que s'il est payé.",
      ],
      [
        "Formule de l'utility d'un investissement ? Application : risk aversion coefficient A = 4, expected return 10 %, standard deviation 20 %.",
        "Utility\n$$U = E(R) - \\tfrac{1}{2} A \\sigma^2$$\nEn clair : Ici 0,10 − ½ × 4 × 0,20² = 0,10 − 0,08 = 0,02. E(R) = expected return, σ = standard deviation, A = risk aversion coefficient (> 0 averse, 0 neutral, < 0 seeking).\nPiège : Tout en décimales (0,20² = 0,04), jamais en %.",
      ],
      [
        "Que représente une indifference curve dans le plan risque–rendement, et que traduit une courbe plus pentue ?",
        "Indifference curve : ==couples risque–rendement de même utility== · Plus pentue : ==investisseur plus risk-averse==\nEn clair : Le risque est la standard deviation ; on préfère la plus haute courbe. Plus elle est pentue, plus il faut de rendement pour accepter un peu plus de risque.",
      ],
      [
        "Minimum-variance frontier, global minimum-variance portfolio et efficient frontier : comment les distinguer ?",
        "Minimum-variance frontier : ==σ minimal à chaque expected return== · GMV : ==le portefeuille de σ le plus bas== · Efficient frontier : ==meilleur expected return à chaque σ==\nEn clair : L'efficient frontier part du GMV (global minimum-variance portfolio) et monte. σ = standard deviation.\nPiège : Le GMV appartient à l'efficient frontier.",
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
        "Lending (gauche) : ==une part prêtée au risk-free rate== · Borrowing (droite) : ==emprunt pour investir plus de 100 %==\nEn clair : Les lending portfolios mêlent risk-free asset et market portfolio. Les borrowing portfolios empruntent au risk-free rate pour acheter plus de market portfolio (buying on margin).",
      ],
      [
        "Systematic risk vs unsystematic risk : lequel est rémunéré par un expected return plus élevé, et pourquoi ?",
        "Systematic : ==risque de marché, non diversifiable== → rémunéré · Unsystematic : ==risque propre au titre, diversifiable== → non rémunéré\nEn clair : L'unsystematic risk s'élimine sans coût, donc personne ne le paie. Total risk = systematic + unsystematic.\nPiège : Une biotech à standard deviation énorme mais beta faible a un expected return faible.",
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
        "Investisseurs : ==risk-averse, maximisent leur utility== · Markets : ==frictionless, sans coûts ni impôts== · Horizon : ==one-period, le même pour tous== · Expectations : ==homogeneous, mêmes prévisions== · Price takers : ==nul ne fait les prix==\nEn clair : Le CAPM suppose aussi des actifs divisibles.\nPiège : Risk-neutral ou horizons différents : pas des hypothèses du CAPM.",
      ],
      [
        "CML (capital market line) vs SML (security market line) : quel axe de risque, et quels actifs se placent dessus ?",
        "CML : ==expected return des portefeuilles efficients selon σ== · SML : ==required return de chaque titre selon beta==\nEn clair : La CML mesure le total risk (σ = standard deviation), la SML le systematic risk. Un titre seul est donc sous la CML, mais sur la SML s'il est bien évalué.",
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
        "Planning : ==analyser le client, écrire l'IPS== · Execution : ==asset allocation, puis security selection== · Feedback : ==monitoring, rebalancing, mesure de performance==\nEn clair : L'IPS (investment policy statement) fixe objectives, constraints et benchmark. L'asset allocation se fait top-down, la security selection bottom-up.",
      ],
      [
        "Quels investisseurs ont une risk tolerance faible et des liquidity needs élevés : banks, insurance companies, endowments, foundations ou DB (defined benefit) pension plans ?",
        "==Banks et insurance companies== : risk tolerance faible, liquidity needs élevés\nEn clair : Endowments, foundations et DB pension plans sont l'inverse : risk tolerance élevée, horizon long, peu de liquidity needs.\nPiège : Horizon long en life insurance, court pour banks et P&C (property and casualty).",
      ],
      [
        "Defined benefit plan vs defined contribution plan : qui supporte l'investment risk ?",
        "DB : ==rente fixée d'avance== → risque pour l'employeur · DC : ==cotisation fixée, rente incertaine== → risque pour l'employé\nEn clair : Un DB (defined benefit) plan promet par ex. 2 % × 20 ans × salaire final 100 000 = 40 000 par an. Dans un DC (defined contribution) plan, la rente dépend des placements.",
      ],
      [
        "Active management vs passive management : quel objectif pour chacune ?",
        "Passive : ==répliquer un indice== · Active : ==battre un benchmark==\nEn clair : En capital market theory : passive = index fund + risk-free asset ; active = surpondérer les undervalued. Le passive pèse ≈ 1/5 des AUM (assets under management), en hausse.\nPiège : Un fonds smart beta (indice construit sur un facteur) reste passive.",
      ],
      [
        "Asset management industry : qu'est-ce qu'un full-service, un specialist et un multi-boutique asset manager ?",
        "Full-service : ==nombreux styles et asset classes== · Specialist : ==un seul style ou une asset class== · Multi-boutique : ==holding de plusieurs specialists==\nEn clair : Tous sont buy-side, à l'inverse des broker-dealers (sell-side). Le big data rend l'IT coûteuse ; les robo-advisors abaissent les barrières à l'entrée.\nPiège : Plusieurs filiales spécialisées = multi-boutique.",
      ],
      [
        "Open-end fund, closed-end fund, ETF (exchange-traded fund) : à quel prix s'échangent les parts par rapport au NAV (net asset value) ?",
        "Open-end : ==parts créées et rachetées au NAV== · Closed-end : ==parts en nombre fixe, cotées== → cours ≠ NAV · ETF : ==coté en continu, arbitrage creation/redemption== → ≈ NAV\nEn clair : Un closed-end fund cote avec un premium ou un discount. Un ETF peut aussi se vendre à découvert ou s'acheter sur marge.\nPiège : ETF : brokerage costs ; open-end fund : aucun, on traite avec le fonds.",
      ],
      [
        "SMA (separately managed account), hedge fund, private equity / venture capital fund : en quoi diffèrent-ils d'un mutual fund ?",
        "SMA : ==portefeuille géré pour un seul investisseur== · Hedge fund : ==peu régulé, réservé aux qualified investors== · PE/VC : ==achètent des sociétés, aident à les gérer==\nEn clair : Un SMA n'émet aucune part. Un hedge fund exige 250 000 à 1 million USD minimum. PE (private equity) et VC (venture capital) revendent ensuite les sociétés.",
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
        "Ability : ==ce que ses finances permettent de risquer== · Willingness : ==le risque accepté psychologiquement== · Divergence : ==retenir la plus faible==\nEn clair : L'ability (capacity) dépend de l'horizon, de la richesse face aux besoins et de la stabilité du revenu. Si la willingness est trop basse, le conseiller peut éduquer le client.",
      ],
      [
        "Quelles sont les 5 investment constraints d'un IPS (investment policy statement) ?",
        "Time horizon : ==durée du placement== · Tax : ==impôts sur revenus et gains== · Liquidity : ==besoins de cash== · Legal and regulatory : ==règles imposées de l'extérieur== · Unique circumstances : ==préférences propres, ex. pas de tabac==\nEn clair : Mnémo RRTTLLU : Risk et Return sont les objectives, les 5 autres les constraints.\nPiège : La risk tolerance est un objective, pas une constraint.",
      ],
      [
        "Pour une asset allocation, comment définir les asset classes en termes de correlations ?",
        "Correlation ==forte dedans, faible entre== asset classes\nEn clair : Chaque classe reste homogène ; la faible correlation entre classes réduit le risque. Le point de leur efficient frontier adapté à l'IPS (investment policy statement) = strategic asset allocation.",
      ],
      [
        "Strategic asset allocation (SAA) vs tactical asset allocation (TAA) vs security selection : quelle différence ?",
        "SAA : ==poids cibles de long terme== · TAA : ==écart de court terme à la SAA== · Security selection : ==choix des titres dans chaque classe==\nEn clair : La SAA découle de l'IPS (investment policy statement). Exemple de TAA : actions de 40 % à 35 % car chères ; TAA et security selection ajoutent de l'active risk.",
      ],
      [
        "Qu'est-ce que l'approche core-satellite, et quels problèmes de l'active management règle-t-elle ?",
        "Core : ==la majeure partie, indexée (passive)== · Satellites : ==petites poches en gestion active== · Gain : ==moins de paris actifs qui s'annulent==\nEn clair : Les paris de plusieurs gérants actifs ne s'annulent plus entre eux. Le trading et les impôts baissent aussi.",
      ],
      [
        "Quelles sont les approches pour intégrer l'ESG (environmental, social, governance) dans un portefeuille ?",
        "Negative screening : ==exclure des secteurs== · Positive screening : ==choisir les meilleures pratiques ESG== · Thematic/impact : ==viser un objectif ESG précis== · Engagement : ==voter pour améliorer l'ESG== · ESG integration : ==ESG dans toute l'analyse==\nEn clair : L'engagement s'appelle aussi active ownership.\nPiège : Negative screening : benchmark = indice qui exclut les mêmes entreprises.",
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
        "Conservatism : ==sous-réagir aux infos nouvelles== · Confirmation : ==chercher ce qui confirme son avis== · Representativeness : ==juger par ressemblance== · Illusion of control : ==se croire maître du résultat== · Hindsight : ==« je le savais » après coup==\nEn clair : Ce sont des cognitive errors : on s'accroche à ses croyances.\nPiège : Base-rate et sample-size neglect = representativeness.",
      ],
      [
        "Quels sont les 4 information-processing biases (cognitive errors) ?",
        "Anchoring : ==rester collé au chiffre de départ== · Mental accounting : ==traiter l'argent selon sa source== · Framing : ==la présentation change la décision== · Availability : ==juger probable ce qui vient à l'esprit==\nEn clair : Exemple de mental accounting : miser une prime surprise sur une biotech risquée.",
      ],
      [
        "Quels sont les 6 emotional biases ?",
        "Loss aversion : ==pertes pèsent plus que gains== · Overconfidence : ==surestimer son jugement== · Self-control : ==le présent avant le long terme== · Status quo, endowment : ==garder, surévaluer ce qu'on a== · Regret aversion : ==inaction par peur de se tromper==\nEn clair : Venus des sentiments, ils se corrigent mal : on s'y adapte.\nPiège : L'overconfidence, mi-cognitive, est classée emotional.",
      ],
      [
        "Loss aversion vs risk aversion : quelle différence, et que fait un investisseur loss-averse face à une perte ?",
        "Risk-averse : ==préfère le moins risqué à rendement égal== · Loss-averse : ==une perte pèse plus qu'un gain== · Réflexe : ==garder ses perdants==\nEn clair : Le loss-averse prend du risque pour ne pas réaliser sa perte : il garde ses perdants et vend ses gagnants trop tôt.",
      ],
      [
        "À quels biais la behavioral finance associe-t-elle les bubbles et les crashes ?",
        "Overconfidence : ==overtrading, risque sous-estimé== · Confirmation : ==ignorer les signaux de baisse== · Anchoring : ==croire rationnels les sommets récents== · Regret aversion : ==rester investi malgré ses doutes==\nEn clair : Self-attribution et hindsight bias nourrissent l'overconfidence. Ces biais accompagnent les bubbles sans les expliquer entièrement.",
      ],
      [
        "Comment explique-t-on la value vs growth anomaly et le home bias ?",
        "Value/growth : ==value > growth, par risque ou halo effect== · Home bias : ==surpondérer son pays, par familiarité==\nEn clair : Version risque : les facteurs size et book-to-market de Fama-French expliquent la value premium. Version halo effect (representativeness) : on surpaie les growth stocks.",
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
        "Financial : ==issus des marchés== (market, credit, liquidity) · Non-financial : ==opérations et sources externes== (operational, model, legal…)\nEn clair : Les deux types interagissent : un hedge par options crée un credit risk. Individus : mortality risk → life insurance, longevity risk → annuity.\nPiège : Solvency et settlement risk sont non-financial.",
      ],
      [
        "Quelle mesure de risque pour un actif seul, une action en portefeuille diversifié, une obligation et un derivative ?",
        "Actif seul : ==σ== · Action en portefeuille : ==beta== · Obligation : ==duration== · Derivative : ==Greeks==\nEn clair : Greeks : delta (prix du sous-jacent), gamma (variation du delta), vega (volatility), rho (risk-free rate). Tail risk : VaR (value at risk), CVaR (conditional VaR). σ = standard deviation.",
      ],
      [
        "VaR (value at risk) mensuelle de 1 million à 5 % : que signifie-t-elle, et que mesure la CVaR (conditional VaR) ?",
        "VaR : ==perte minimale des 5 % pires cas== · CVaR : ==perte moyenne au-delà de la VaR==\nEn clair : Ici, une perte d'au moins 1 million arrive 5 % des mois : ce n'est pas la perte maximale. La CVaR est la perte moyenne quand elle dépasse 1 million.",
      ],
      [
        "Stress testing vs scenario analysis : quelle différence ?",
        "Stress testing : ==choc extrême sur une variable clé== · Scenario analysis : ==what-if sur plusieurs variables ensemble==\nEn clair : Ex. : un stress test choque les taux ou le change ; une scenario analysis combine taux, pétrole et change. Les deux complètent la VaR (value at risk).",
      ],
      [
        "Quelles sont les 4 façons de modifier une exposition au risque, et quelle différence entre risk transfer et risk shifting ?",
        "Avoid : ==ne pas faire l'activité risquée== · Accept : ==garder le risque (self-insurance)== · Transfer : ==un tiers prend le risque (insurance)== · Shift : ==changer la distribution des résultats (derivatives)==\nEn clair : Autres transfers : surety bond, fidelity bond. Un put (shift) met un plancher aux pertes.\nPiège : Insurance = transfer ; derivatives = shifting, pas l'inverse.",
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
