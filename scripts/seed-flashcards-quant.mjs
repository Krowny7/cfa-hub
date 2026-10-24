// Seed script — flashcards "Système" Quantitative Methods.
// 4 paquets de 15 cartes (60), à réviser en une nuit avec le one-pager Quant :
// rendements et valeur temps, statistiques et probabilités, loi normale,
// échantillons et tests, choix du test, régression et big data.
// Chaque carte se comprend seule (cartes mélangées) : phrases en français,
// termes techniques en anglais. Verso au format « trois cases » : l'idée à
// retenir (≤ 12 mots, ==surligné== ou formule), puis « En clair : », puis
// « Piège : » s'il y a un vrai piège d'examen.
// Cartes de calcul : « Formule de … ? Application : … » ; « À retenir » = la
// formule générale en bloc, « En clair » = l'application chiffrée.
// Recto à deux questions ou comparaison « A vs B » : « À retenir » en liste
// « a · b », un surligné par élément.
// Formules KaTeX ($$...$$ seul sur sa ligne = bloc, $...$ = en ligne),
// rendues par components/RichText.tsx. Vérifié sur Schweser Book 1 (R1–11),
// chaque mini-calcul recalculé.
// Usage: node scripts/seed-flashcards-quant.mjs
import { pathToFileURL } from "node:url";
import { getOwnerId, ensureFolder, seedFlashcardSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Quantitative Methods (Système)";

// Anciens titres à supprimer s'ils ont changé (les 4 titres actuels sont gardés).
const oldTitles = [];

export const SETS = [
  {
    title: "Quantitative Methods — Flashcards 1/4 (Rendements et valeur temps)",
    cards: [
      [
        "De quoi se compose l'interest rate exigé sur un titre risqué ?",
        "Real risk-free rate : ==time preference== · Expected inflation : ==pouvoir d'achat== · Default risk premium : ==défaut== · Liquidity premium : ==revente difficile== · Maturity premium : ==échéance longue==\nEn clair : Le taux exigé est la somme des cinq. Les deux premiers forment le nominal risk-free rate, celui d'un T-bill (Treasury bill), sans default, liquidity ni maturity premium.",
      ],
      [
        "Formule du holding period return (HPR) ? Application : action achetée 40, revendue 46 un an plus tard, avec 2 de dividendes reçus.",
        "$$\\text{HPR} = \\dfrac{P_1 - P_0 + D_1}{P_0}$$\nEn clair : (46 − 40 + 2) / 40 = 8 / 40 = 20 %, où $P_0$ = prix d'achat, $P_1$ = prix de vente, $D_1$ = dividendes reçus sur la période.\nPiège : Oublier le dividende donne 6 / 40 = 15 %.",
      ],
      [
        "Formules de l'arithmetic mean return et du geometric mean return ? Application : un fonds fait +50 % la 1re année puis −50 % la 2e.",
        "$$\\bar{R}_A = \\dfrac{R_1 + R_2 + \\cdots + R_n}{n}$$\n$$R_G = \\left[(1+R_1)(1+R_2)\\cdots(1+R_n)\\right]^{1/n} - 1$$\nEn clair : Arithmetic : (50 − 50) / 2 = 0 %. Geometric : √(1,5 × 0,5) − 1 = −13,4 % par an, car 100 devient 150 puis 75. $R_i$ = rendement de l'année i.\nPiège : Geometric ≤ arithmetic mean, toujours (égales seulement si tous les rendements sont égaux).",
      ],
      [
        "Money-weighted return (MWR) vs time-weighted return (TWR) : un client apporte beaucoup d'argent juste avant une très bonne année. Laquelle sera la plus élevée ?",
        "MWR : ==pèse l'argent investi== · TWR : ==ignore apports et retraits== · Ici : ==MWR > TWR==\nEn clair : La MWR est l'IRR (internal rate of return) des flux du compte, $\\sum_t CF_t/(1+\\text{MWR})^t = 0$ : la très bonne année, la plus investie, pèse plus.\nPiège : Pour juger le gérant, on prend la TWR. La MWR seulement s'il contrôle les flux.",
      ],
      [
        "Formule de la time-weighted return (TWR) annualisée ? Application : un portefeuille fait +20 % la 1re année et −10 % la 2e, avec un gros apport entre les deux.",
        "$$\\text{TWR} = \\left[(1+\\text{HPR}_1)(1+\\text{HPR}_2)\\cdots(1+\\text{HPR}_n)\\right]^{1/N} - 1$$\nEn clair : TWR = √(1,20 × 0,90) − 1 = 3,92 % par an, où $\\text{HPR}_i$ = holding period return de chaque sous-période (coupée à chaque apport ou retrait), N = nombre d'années.\nPiège : L'apport ne change rien à la TWR : elle mesure le gérant, pas le timing du client.",
      ],
      [
        "Formule pour annualiser un holding period return (HPR) ? Application : rendement de 2 % obtenu sur un trimestre.",
        "$$R_{\\text{annual}} = (1+\\text{HPR})^{365/\\text{days}} - 1$$\nEn clair : 1,02⁴ − 1 = 8,24 % par an, car un trimestre donne 365 / days = 4. Même logique pour l'EAR (effective annual rate) : $(1 + r/m)^m - 1$, où r = stated annual rate, m = périodes par an.\nPiège : 2 % × 4 = 8 % oublie la composition.",
      ],
      [
        "Formule du continuously compounded return ? Application : une action passe de 50 à 40 en un an.",
        "$$r_{cc} = \\ln(1+\\text{HPR}) = \\ln\\left(\\dfrac{P_1}{P_0}\\right)$$\nEn clair : $r_{cc}$ = ln(40 / 50) = ln 0,8 = −22,31 %, où $P_0$, $P_1$ = prix de début et de fin, HPR = holding period return (ici −20 %). Inverse : $\\text{HPR} = e^{r_{cc}} - 1$.\nPiège : Les $r_{cc}$ s'additionnent dans le temps, alors que les HPR se composent.",
      ],
      [
        "Formule exacte du real return ? Application : nominal return de 7 % et inflation de 2 %.",
        "$$1 + r_{\\text{real}} = \\dfrac{1 + r_{\\text{nominal}}}{1 + \\pi}$$\nEn clair : 1,07 / 1,02 − 1 = 4,90 % de gain de pouvoir d'achat, où π = inflation. 7 % − 2 % = 5 % n'est qu'une approximation.\nPiège : Gross return = après commissions de trading, mais avant management fees. Net return = après ces fees.",
      ],
      [
        "Formule du leveraged return ? Application : un fonds investit sa mise de 100 plus 50 empruntés à 6 %, le tout rapportant 10 %.",
        "$$r_L = r + \\dfrac{V_B}{V_0}\\,(r - r_B)$$\nEn clair : 10 % + (50 / 100) × (10 % − 6 %) = 12 %, où r = rendement de l'actif, $V_0$ = mise propre, $V_B$ = montant emprunté, $r_B$ = coût de l'emprunt.\nPiège : Si r < $r_B$, le levier fait baisser le rendement ; si r < 0, il amplifie la perte.",
      ],
      [
        "Formule de la present value (PV) d'une ordinary annuity ? Application : 5 versements annuels de 1 000, le premier dans un an, taux de 8 %.",
        "$$PV = PMT \\times \\dfrac{1 - (1+r)^{-N}}{r}$$\nEn clair : 1 000 × (1 − 1,08⁻⁵) / 0,08 = 3 992,71, où PMT = versement, r = taux par période, N = nombre de versements. En mensuel : r / 12 et N × 12.\nPiège : Annuity due (1er versement aujourd'hui, mode BGN) : PV × (1 + r) = 4 312,13.",
      ],
      [
        "Formule de la present value (PV) d'une perpetuity ? Application : 100 par an pour toujours, premier versement dans 4 ans, taux de 10 %.",
        "$$PV = \\dfrac{PMT}{r}$$\nEn clair : 100 / 0,10 = 1 000 à t = 3, un an avant le 1er versement. Puis 1 000 / 1,10³ = 751,31 aujourd'hui. PMT = versement, r = taux.\nPiège : PMT / r donne la valeur une période AVANT le 1er versement : on actualise sur 3 ans, pas 4.",
      ],
      [
        "Formule du Gordon growth model ? Application : dernier dividende versé $D_0$ = 2, croissance g = 4 % pour toujours, required return on equity $k_e$ = 9 %.",
        "$$V_0 = \\dfrac{D_1}{k_e - g} = \\dfrac{D_0\\,(1+g)}{k_e - g}$$\nEn clair : $D_1$ = 2 × 1,04 = 2,08, puis $V_0$ = 2,08 / (0,09 − 0,04) = 41,60, où $V_0$ = valeur de l'action (il faut $k_e > g$). Implied return : $k_e = D_1/P_0 + g$, où $P_0$ = prix de marché.\nPiège : On prend $D_1$, le dividende de l'an prochain : 2 / 0,05 = 40 est faux.",
      ],
      [
        "Formule du forward rate 1y1y (prêt d'un an qui démarre dans un an) tiré des spot rates ? Application : spot rates de 4 % à 1 an et de 6 % à 2 ans.",
        "$$\\text{1y1y} = \\dfrac{(1+S_2)^2}{1+S_1} - 1$$\nEn clair : 1,06² / 1,04 − 1 = 8,04 %, où $S_1$, $S_2$ = spot rates à 1 et 2 ans. Placer 2 ans d'un coup ou 1 an puis 1 an doit rapporter pareil (no-arbitrage).\nPiège : 2 × 6 % − 4 % = 8 % n'est qu'une approximation.",
      ],
      [
        "Formule du forward exchange rate sans arbitrage ? Application : spot 1,2000 USD/EUR, risk-free rates à 1 an de 5 % en USD et de 2 % en EUR.",
        "$$F = S \\times \\dfrac{1 + r_{\\text{price}}}{1 + r_{\\text{base}}}$$\nEn clair : 1,2000 × 1,05 / 1,02 = 1,2353 USD/EUR, où S, F = spot et forward cotés price/base, r = risk-free rates. Ici USD = price currency, EUR = base currency.\nPiège : La devise au taux le plus élevé (ici USD) vaut moins à terme : F > S.",
      ],
      [
        "Formules du hedge ratio et de la valeur d'un call dans un binomial model à une période ? Application : action à 50 qui vaudra 60 ou 40, strike 50, risk-free rate 5 %.",
        "$$h = \\dfrac{c^+ - c^-}{S^+ - S^-}$$\n$$c_0 = h\\,S_0 - \\dfrac{h\\,S^- - c^-}{1 + R_f}$$\nEn clair : Hedge ratio h = (10 − 0) / (60 − 40) = 0,5. Puis $c_0$ = 0,5 × 50 − (0,5 × 40 − 0) / 1,05 = 5,95, où c = call, S = action, + / − = hausse / baisse.\nPiège : Les vraies probabilités de hausse et de baisse n'entrent pas dans le calcul.",
      ],
    ],
  },
  {
    title: "Quantitative Methods — Flashcards 2/4 (Statistiques, probabilités et portefeuille)",
    cards: [
      [
        "Formule de l'harmonic mean ? Application : 1 000 investis chaque mois en actions, au prix de 10 puis de 15. Quel coût moyen par action ?",
        "$$\\bar{X}_H = \\dfrac{N}{\\sum_{i=1}^{N} 1/X_i}$$\nEn clair : 2 / (1/10 + 1/15) = 12 par action, où N = nombre d'achats, $X_i$ = prix payés. À montant fixe, on achète plus d'actions quand le prix est bas (cost averaging).\nPiège : Harmonic ≤ geometric ≤ arithmetic mean : ici 12 < 12,25 < 12,5.",
      ],
      [
        "Mean, median, trimmed mean, winsorized mean : lesquelles résistent aux outliers, et comment ?",
        "Mean : ==tirée par les outliers== · Median : ==valeur du milieu, résiste== · Trimmed mean : ==retire les extrêmes== · Winsorized mean : ==remplace les extrêmes==\nEn clair : Une 1 % trimmed mean retire 0,5 % des observations de chaque côté. Une 90 % winsorized mean remplace les 5 % de chaque bout par les 5e et 95e percentiles.",
      ],
      [
        "Formule de la position d'un percentile dans un échantillon trié ? Application : 3e quartile (Q3, 75e percentile) d'un échantillon de 19 observations.",
        "$$L_y = (n+1)\\,\\dfrac{y}{100}$$\nEn clair : (19 + 1) × 75 / 100 = 15 : Q3 est la 15e observation, où n = nombre d'observations, y = percentile visé. Position non entière : on interpole.\nPiège : Quartile = 4 parts, quintile = 5, decile = 10, percentile = 100 ; IQR (interquartile range) = Q3 − Q1.",
      ],
      [
        "Formules de la sample variance et de la sample standard deviation ? Application : rendements de 2 %, 4 % et 9 %.",
        "$$s^2 = \\dfrac{\\sum_{i=1}^{n} (X_i - \\bar{X})^2}{n-1}$$\n$$s = \\sqrt{s^2}$$\nEn clair : $\\bar{X}$ = mean = 5 %, écarts −3, −1 et +4 : s² = (9 + 1 + 16) / (3 − 1) = 13 (%²), donc s = √13 = 3,61 %, où n = nombre d'observations.\nPiège : Pour un échantillon, on divise par n − 1, pas par n (sinon la variance est sous-estimée).",
      ],
      [
        "Formule de la mean absolute deviation (MAD) ? Application : rendements de 2 %, 4 % et 9 %.",
        "$$\\text{MAD} = \\dfrac{\\sum_{i=1}^{n} |X_i - \\bar{X}|}{n}$$\nEn clair : $\\bar{X}$ = mean = 5 %, écarts absolus 3, 1 et 4 : MAD = (3 + 1 + 4) / 3 = 2,67 %. Les valeurs absolues évitent que les écarts s'annulent.\nPiège : La MAD divise par n, pas par n − 1 comme la sample variance.",
      ],
      [
        "Formule du coefficient of variation (CV) ? Application : fonds A (mean 10 %, standard deviation 15 %) et B (mean 6 %, standard deviation 12 %). Lequel a le moins de risque par unité de rendement ?",
        "$$\\text{CV} = \\dfrac{s}{\\bar{X}}$$\nEn clair : Fonds A : 15 / 10 = 1,5. Fonds B : 12 / 6 = 2,0. Le CV le plus bas l'emporte : fonds A. Ici s = standard deviation, $\\bar{X}$ = mean.\nPiège : B a la plus petite standard deviation, mais le plus de risque par unité de rendement.",
      ],
      [
        "Formule de la target downside deviation ? Application : rendements −4 %, 2 %, 6 % et 8 %, cible B = 3 %.",
        "$$s_{\\text{target}} = \\sqrt{\\dfrac{\\sum_{X_i < B} (X_i - B)^2}{n-1}}$$\nEn clair : Seuls −4 % et 2 % sont sous B : √[((−7)² + (−1)²) / (4 − 1)] = √16,67 = 4,08 %, où B = target, n = nombre total d'observations.\nPiège : On divise par n − 1 avec TOUTES les observations (4 − 1 = 3), pas seulement celles sous B.",
      ],
      [
        "Distribution à positive skew (longue queue à droite) : dans quel ordre sont la mean, la median et le mode ?",
        "==Mode < median < mean== : la mean est tirée vers la queue\nEn clair : En negative skew (queue à gauche), c'est l'inverse : mean < median < mode. Une skewness supérieure à 0,5 en valeur absolue est jugée significative.",
      ],
      [
        "Une distribution de rendements a une excess kurtosis de +1,5. Comment s'appelle-t-elle, et qu'est-ce que ça change pour le risque ?",
        "Nom : ==leptokurtic== (fat tails) · Risque : ==plus de rendements extrêmes==\nEn clair : Excess kurtosis = kurtosis − 3, car une normal distribution a une kurtosis de 3. Un modèle normal sous-estime donc les grosses pertes. Excess kurtosis négative : platykurtic, thin tails.\nPiège : On compare la kurtosis à 3, mais l'excess kurtosis à 0.",
      ],
      [
        "Formules de l'expected value et de la variance d'un modèle de probabilités ? Application : rendement de 20 % avec une probabilité de 0,3, et de 5 % avec une probabilité de 0,7.",
        "$$E(X) = \\sum P(x_i)\\,x_i$$\n$$\\sigma^2 = \\sum P(x_i)\\,[x_i - E(X)]^2$$\nEn clair : E(R) = 0,3 × 20 + 0,7 × 5 = 9,5 %. σ² = 0,3 × 10,5² + 0,7 × 4,5² = 47,25 (%²), donc σ = 6,87 %, où $P(x_i)$ = probabilité de l'issue $x_i$.\nPiège : Avec des probabilités, on pondère par P : aucune division par n − 1.",
      ],
      [
        "Formule de l'expected value par la total probability rule ? Application : expected return de 30 % si l'entreprise est rachetée (probabilité 40 %), de 10 % sinon.",
        "$$E(X) = \\sum_i E(X \\mid S_i)\\,P(S_i)$$\nEn clair : 0,4 × 30 % + 0,6 × 10 % = 18 %, où $S_i$ = scénarios exclusifs et exhaustifs (rachat ou non), $E(X \\mid S_i)$ = expected value si $S_i$ se réalise.\nPiège : Dans un probability tree, la probabilité d'un chemin = produit de ses branches, pas leur somme.",
      ],
      [
        "Formule de Bayes (Bayes' formula) ? Application : prior de défaut de 30 % ; un signal d'alerte touche 80 % des entreprises en défaut et 10 % des autres. Signal observé : probabilité de défaut ?",
        "$$P(A \\mid B) = \\dfrac{P(B \\mid A)\\,P(A)}{P(B)}$$\n$$P(B) = P(B \\mid A)\\,P(A) + P(B \\mid A^c)\\,P(A^c)$$\nEn clair : A = défaut, $A^c$ = pas de défaut, B = signal. P(B) = 0,8 × 0,3 + 0,1 × 0,7 = 0,31, puis P(A | B) = 0,24 / 0,31 = 77,4 % : le prior de 30 % devient ce posterior.\nPiège : On divise par P(B), la probabilité totale du signal, pas par P(A).",
      ],
      [
        "Formule de la covariance dans un modèle de probabilités ? Application : deux scénarios de probabilité 0,5 : A rend 20 % et B 10 %, ou A rend 0 % et B 4 %.",
        "$$\\text{Cov}_{AB} = \\sum_s P(s)\\,[R_{A,s} - E(R_A)]\\,[R_{B,s} - E(R_B)]$$\nEn clair : $E(R_A)$ = 10 %, $E(R_B)$ = 7 %, donc 0,5 × 10 × 3 + 0,5 × (−10) × (−3) = 30 (%²), soit 0,0030, où P(s) = probabilité du scénario s. Positive : A et B montent ensemble.\nPiège : Sur données historiques, $s_{XY} = \\sum(X - \\bar{X})(Y - \\bar{Y})/(n-1)$, sans probabilités.",
      ],
      [
        "Formule du coefficient de correlation ? Application : covariance Cov(A, B) = 0,006, standard deviations $\\sigma_A$ = 20 % et $\\sigma_B$ = 10 %.",
        "$$\\rho_{AB} = \\dfrac{\\text{Cov}_{AB}}{\\sigma_A\\,\\sigma_B}$$\nEn clair : 0,006 / (0,20 × 0,10) = 0,30. La correlation mesure le lien linéaire, sans unité, entre −1 et +1. La covariance, non bornée, ne donne que le sens.\nPiège : Correlation ≠ causalité (spurious correlation), et ρ = 0 n'exclut pas un lien non linéaire.",
      ],
      [
        "Formule de la variance d'un portefeuille de deux actifs ? Application : 50 % A (σ = 20 %) et 50 % B (σ = 10 %), correlation 0,5. Quelle standard deviation du portefeuille ?",
        "$$\\sigma_p^2 = w_A^2\\sigma_A^2 + w_B^2\\sigma_B^2 + 2\\,w_A w_B\\,\\rho_{AB}\\,\\sigma_A\\sigma_B$$\nEn clair : 0,25 × 0,04 + 0,25 × 0,01 + 2 × 0,25 × 0,5 × 0,02 = 0,0175, donc $\\sigma_p$ = 13,2 %, sous la moyenne des σ (15 %), où w = poids, ρ = correlation.\nPiège : L'expected return, lui, est la simple moyenne pondérée $\\sum w_i E(R_i)$, sans effet de diversification.",
      ],
    ],
  },
  {
    title: "Quantitative Methods — Flashcards 3/4 (Loi normale, échantillons et tests)",
    cards: [
      [
        "Formule du z-score d'une normal distribution ? Application : mean μ = 10 %, standard deviation σ = 15 % ; probabilité d'un rendement inférieur à −5 % ? (N(1) = 0,8413)",
        "$$z = \\dfrac{x - \\mu}{\\sigma}$$\nEn clair : Ici z = (−5 − 10) / 15 = −1, donc P = N(−1) = 1 − 0,8413 = 15,87 % (loi symétrique). z compte les σ entre x et la mean.\nPiège : N(z) = probabilité d'être SOUS z. Au-dessus de z : 1 − N(z).",
      ],
      [
        "Quelles z critical values retenir en two-tailed à 10 %, 5 % et 1 %, et en one-tailed à 5 % et 1 % ?",
        "Two-tailed 10 % : ==±1,645== · Two-tailed 5 % : ==±1,96== · Two-tailed 1 % : ==±2,58== · One-tailed 5 % : ==1,645== · One-tailed 1 % : ==2,33==\nEn clair : En one-tailed à 10 %, c'est 1,28. En two-tailed, chaque queue reçoit α/2 (α = significance level).\nPiège : 1,645 sert deux fois : two-tailed à 10 % et one-tailed à 5 %.",
      ],
      [
        "Formule du Roy's safety-first ratio (SFRatio) ? Application : rendement minimum $R_L$ = 4 % ; A : expected return 10 %, σ = 12 % ; B : expected return 8 %, σ = 6 %. Lequel choisir ?",
        "$$\\text{SFRatio} = \\dfrac{E(R_p) - R_L}{\\sigma_p}$$\nEn clair : A : (10 − 4) / 12 = 0,50. B : (8 − 4) / 6 = 0,67, donc on choisit B. Le plus grand SFRatio minimise le shortfall risk $P(R_p < R_L)$.\nPiège : On prend le plus grand SFRatio, pas le plus grand E(R). Si $R_L$ = risk-free rate, c'est le Sharpe ratio.",
      ],
      [
        "Pourquoi modélise-t-on les prix d'actifs avec une lognormal distribution plutôt qu'une normal distribution ?",
        "Lognormal : ==jamais négative== et skewed à droite, comme un prix\nEn clair : Si les continuously compounded returns sont normaux et i.i.d. (independent, identically distributed), le prix $P_T = P_0 e^{r_{0,T}}$ est lognormal.\nPiège : C'est le prix qui est lognormal. Les continuously compounded returns, eux, sont normaux.",
      ],
      [
        "Monte Carlo simulation : comment fonctionne-t-elle, et quelles sont ses limites ?",
        "Principe : ==tirages des risk factors== · Limites : ==complexe, dépend des hypothèses==\nEn clair : On tire des milliers de scénarios et on valorise à chaque fois : on obtient une distribution de valeurs. Usages : titres complexes, VaR (value at risk).\nPiège : Ses inputs ne sont pas limités aux données passées, contrairement au bootstrap.",
      ],
      [
        "Bootstrap vs jackknife : comment chacun ré-échantillonne-t-il, et à quoi ça sert ?",
        "Bootstrap : ==tirages avec remise== · Jackknife : ==une observation retirée== · But : ==estimer la standard error==\nEn clair : Bootstrap : beaucoup d'échantillons de taille n. Jackknife : n échantillons de taille n − 1. La standard deviation de leurs means = standard error.\nPiège : Le bootstrap demande le plus de calcul ; le jackknife peut réduire le biais.",
      ],
      [
        "Stratified random sampling vs cluster sampling : quelle différence, et lequel sert à répliquer un bond index ?",
        "Stratified : ==tirage dans chaque strate== · Cluster : ==tirage de quelques groupes== · Bond index : ==stratified==\nEn clair : Stratified : un tirage au hasard dans chaque strate (rating, maturity…), au prorata. Cluster : les groupes tirés sont pris en entier (one-stage) ou re-tirés (two-stage).\nPiège : Cluster = moins cher, mais plus de sampling error (two-stage > one-stage).",
      ],
      [
        "Qu'est-ce que la sampling error, et pourquoi le convenience sampling et le judgmental sampling peuvent-ils l'augmenter ?",
        "Sampling error : ==statistic − parameter== · Convenience, judgmental : ==moins de hasard==\nEn clair : Par exemple, x̄ − μ est une sampling error. Convenience (données faciles d'accès) et judgmental (choix du chercheur) sont moins aléatoires, donc souvent moins représentatifs.\nPiège : Mélanger deux régimes (avant et après 2008) fausse l'échantillon, même tiré au hasard.",
      ],
      [
        "Que dit le central limit theorem (CLT) ?",
        "n ≥ 30 : x̄ ≈ ==normale==, de mean μ et variance σ²/n\nEn clair : C'est vrai quelle que soit la loi de la population, si sa variance est finie (μ, σ² = mean et variance de la population, x̄ = sample mean). Le CLT fonde les tests z et t.\nPiège : Le CLT porte sur la distribution de x̄, pas sur celle de la population.",
      ],
      [
        "Formules de la standard error (SE) de la sample mean et du confidence interval (CI) ? Application : 36 rendements mensuels, mean 1,5 %, standard deviation 6 %, CI à 95 %.",
        "$$s_{\\bar{x}} = \\dfrac{s}{\\sqrt{n}}$$\n$$\\text{CI} = \\bar{x} \\pm z_{\\alpha/2} \\times s_{\\bar{x}}$$\nEn clair : SE = 6 % / √36 = 1 %, puis CI = 1,5 % ± 1,96 × 1 % = [−0,46 % ; 3,46 %], où s = sample standard deviation, $z_{\\alpha/2}$ = 1,96 à 95 %. Si σ est connue, SE = σ / √n.\nPiège : σ inconnue et petit n : remplacer 1,96 par un t à n − 1 degrees of freedom.",
      ],
      [
        "Hypothesis testing : que met-on dans la null hypothesis (H₀) et dans l'alternative hypothesis (Hₐ) ?",
        "H₀ : ==l'égalité== (=, ≤, ≥) · Hₐ : ==ce qu'on veut démontrer==\nEn clair : On teste H₀ en espérant la rejeter. Two-tailed : Hₐ : μ ≠ μ₀. One-tailed : Hₐ : μ > μ₀ (ou <), avec tout α (significance level) dans une seule queue.\nPiège : On ne dit jamais « accept H₀ », mais « fail to reject H₀ ».",
      ],
      [
        "Formule du test statistic d'un test sur une moyenne ? Application : n = 100, x̄ = 7 %, s = 10 % ; H₀ : μ = 5 % contre Hₐ : μ ≠ 5 %, α = 5 % (t critique 1,98). Décision ?",
        "$$t = \\dfrac{\\bar{x} - \\mu_0}{s / \\sqrt{n}}$$\nEn clair : (7 % − 5 %) / (10 % / √100) = 2,0 > 1,98 : on rejette H₀ (null hypothesis), où $\\mu_0$ = valeur testée. σ inconnue : t-test à n − 1 = 99 degrees of freedom.\nPiège : Le z-test (1,96) suppose la σ de la population connue. Ici, même décision.",
      ],
      [
        "Type I error vs Type II error : que sont-elles, et quelle probabilité mesure chacune ?",
        "Type I : rejeter H₀ ==vraie== · Type II : garder H₀ ==fausse== · Probabilités : ==α et β==\nEn clair : H₀ = null hypothesis, α = significance level = P(Type I error), β = P(Type II error). Conclure qu'un gérant sans talent bat « significativement » le marché = Type I error.",
      ],
      [
        "Power of a test : qu'est-ce que c'est, et comment l'augmenter sans augmenter le risque de Type I error ?",
        "Power = ==1 − β== · Sans toucher α : ==augmenter n==\nEn clair : La power est la probabilité de rejeter H₀ (null hypothesis) quand elle est fausse. β = P(Type II error), α = significance level, n = taille de l'échantillon.\nPiège : À n donné, baisser α augmente β, donc baisse la power. Seul n ↑ réduit les deux.",
      ],
      [
        "Qu'est-ce que la p-value d'un test, et quelle règle de décision donne-t-elle ?",
        "p-value : ==α minimal pour rejeter== · Rejet si : ==p-value < α==\nEn clair : La p-value est le plus petit significance level (α) auquel on rejette H₀ (null hypothesis). Ex. : p-value = 0,03 ⇒ rejet à 5 %, pas à 1 %.",
      ],
    ],
  },
  {
    title: "Quantitative Methods — Flashcards 4/4 (Choix du test, régression et big data)",
    cards: [
      [
        "Comparer les rendements moyens de deux actions sur les mêmes mois : difference in means test ou paired comparisons test ?",
        "Paired comparisons : ==échantillons dépendants== · Difference in means : ==échantillons indépendants== · Ici : ==paired comparisons test==\nEn clair : Mêmes mois = observations liées : t-test sur la mean des différences, à n − 1 degrees of freedom. Difference in means : pooled variance, $n_1 + n_2 - 2$ degrees of freedom.",
      ],
      [
        "Quel test pour comparer une variance à une valeur, et quel test pour comparer les variances de deux populations ?",
        "Une variance : ==chi-square== · Deux variances : ==F-test==\n$$\\chi^2 = \\dfrac{(n-1)\\,s^2}{\\sigma_0^2}$$\n$$F = \\dfrac{s_1^2}{s_2^2}$$\nEn clair : Le chi-square test compare la sample variance s² à la variance testée $\\sigma_0^2$, à n − 1 degrees of freedom. Le F-test a $n_1 - 1$ et $n_2 - 1$ degrees of freedom. Les deux supposent des populations normales.\nPiège : F-test : la plus grande variance au numérateur.",
      ],
      [
        "Dans quels cas utilise-t-on un nonparametric test plutôt qu'un parametric test (z, t, χ², F) ?",
        "Petit n, loi ==non normale== · Données en ==rangs== · Question ne portant ==sur aucun paramètre==\nEn clair : Exemples : classement de fonds par decile, runs test (une série est-elle aléatoire ?). Spearman rank correlation : $r_s = 1 - 6\\sum d^2/[n(n^2-1)]$, où d = écart de rangs, n = nombre de paires.",
      ],
      [
        "Formule du t-statistic d'un test de significativité d'une correlation ? Application : r = 0,5 sur n = 27 observations, test two-tailed à 5 % (t critique 2,06).",
        "$$t = \\dfrac{r\\,\\sqrt{n-2}}{\\sqrt{1-r^2}}$$\nEn clair : 0,5 × √25 / √0,75 = 2,89 > 2,06 (n − 2 = 25 degrees of freedom) : on rejette la null hypothesis ρ = 0, la correlation est significative. r = sample correlation.\nPiège : Le t monte avec |r| ET avec n : un petit r devient significatif sur un grand échantillon.",
      ],
      [
        "Formules du chi-square test d'indépendance sur une contingency table et de ses degrees of freedom ? Application : table de 3 lignes et 4 colonnes.",
        "$$\\chi^2 = \\sum_{i,j} \\dfrac{(O_{ij} - E_{ij})^2}{E_{ij}}$$\n$$\\text{df} = (r-1)(c-1)$$\nEn clair : (3 − 1)(4 − 1) = 6 degrees of freedom, où r, c = nombre de lignes et de colonnes, O = effectif observé, $E_{ij}$ = total ligne × total colonne / total général.\nPiège : On rejette l'indépendance (H₀) si χ² > valeur critique : queue de droite seulement.",
      ],
      [
        "Formules de la slope et de l'intercept estimés d'une simple linear regression ? Application : covariance Cov(X, Y) = 12, variance Var(X) = 8, X̄ = 4, Ȳ = 10.",
        "$$\\hat{b}_1 = \\dfrac{\\text{Cov}(X,Y)}{\\text{Var}(X)}$$\n$$\\hat{b}_0 = \\bar{Y} - \\hat{b}_1\\,\\bar{X}$$\nEn clair : Slope = 12 / 8 = 1,5 : Y gagne 1,5 quand X gagne 1. Intercept = 10 − 1,5 × 4 = 4. La droite OLS (ordinary least squares) passe par (X̄, Ȳ).\nPiège : On divise par Var(X), la variance de l'independent variable, pas par Var(Y).",
      ],
      [
        "Quelles sont les 4 hypothèses de la simple linear regression ?",
        "==Linearity== · ==Homoskedasticity== · Résidus ==independent== · Résidus ==normally distributed==\nEn clair : Homoskedasticity = variance des résidus constante (sinon heteroskedasticity). Un residual plot révèle les violations.\nPiège : Une grosse erreur chaque décembre (saisonnalité) : résidus non independent.",
      ],
      [
        "Formule du R² (coefficient of determination) à partir de la table ANOVA (analysis of variance) d'une régression ? Application : SSR = 60, SSE = 40.",
        "$$R^2 = \\dfrac{\\text{SSR}}{\\text{SST}} = \\dfrac{\\text{SSR}}{\\text{SSR} + \\text{SSE}}$$\nEn clair : 60 / (60 + 40) = 0,60 : X explique 60 % de la variation de Y. SSR = regression sum of squares, SSE = sum of squared errors, SST = total sum of squares.\nPiège : R² = r² (r = correlation de X et Y) en régression simple seulement : ici r = ±0,77.",
      ],
      [
        "Formules du SEE (standard error of estimate) et du F-statistic d'une simple linear regression ? Application : n = 22 observations, SSR = 60, SSE = 40.",
        "$$\\text{SEE} = \\sqrt{\\text{MSE}} = \\sqrt{\\dfrac{\\text{SSE}}{n-2}}$$\n$$F = \\dfrac{\\text{MSR}}{\\text{MSE}} = \\dfrac{\\text{SSR}/1}{\\text{SSE}/(n-2)}$$\nEn clair : MSE (mean squared error) = 40 / 20 = 2, donc SEE = √2 = 1,41 et F = 60 / 2 = 30, où SSR = regression sum of squares, SSE = sum of squared errors.\nPiège : Le F-test (1 et n − 2 degrees of freedom) teste H₀ : $b_1 = 0$, dans la queue de droite.",
      ],
      [
        "Formule du t-statistic de la slope d'une simple linear regression ? Application : slope estimée 0,64, standard error de la slope 0,20, n = 32, two-tailed à 5 % (t critique 2,04).",
        "$$t = \\dfrac{\\hat{b}_1 - B_1}{s_{\\hat{b}_1}}$$\nEn clair : (0,64 − 0) / 0,20 = 3,2 > 2,04 (n − 2 = 30 degrees of freedom) : slope significative, où $B_1$ = valeur testée (0), $s_{\\hat{b}_1}$ = standard error de la slope.\nPiège : En régression simple seulement, F = t² (ici 3,2² = 10,24).",
      ],
      [
        "Formule du prediction interval d'une régression ? Application : Ŷ = 1 + 0,5X, X = 10, $s_f$ (standard error of forecast) = 2, t critique = 2,05 (95 %).",
        "$$\\hat{Y} \\pm t_c \\times s_f$$\nEn clair : Prévision : Ŷ = 1 + 0,5 × 10 = 6, puis 6 ± 2,05 × 2 = [1,9 ; 10,1], où $t_c$ = t critique à n − 2 degrees of freedom, $s_f$ = standard error of forecast.\nPiège : $s_f$ grandit quand X s'éloigne de sa mean X̄ : l'intervalle s'élargit loin du centre des données.",
      ],
      [
        "Log-lin, lin-log ou log-log : quelle functional form de régression choisir si Y croît à taux constant (ex. +8 % par an) avec le temps X ?",
        "==Log-lin model== : ln Y = b₀ + b₁X\nEn clair : Dans un log-lin, une variation absolue de X donne une variation relative (en %) de Y. Lin-log : Y = b₀ + b₁ ln X. Log-log : ln Y = b₀ + b₁ ln X (slope = élasticité).\nPiège : Log-lin = log sur Y (la dependent variable), pas sur X.",
      ],
      [
        "Quelles sont les trois caractéristiques du Big Data, les « trois V » ?",
        "==Volume== : quantité · ==Velocity== : vitesse, low latency · ==Variety== : de structured à unstructured\nEn clair : Le Big Data mêle sources classiques et alternative data : corporate exhaust, IoT (Internet of Things). On s'en sert en text analytics, NLP (natural language processing), algorithmic trading.",
      ],
      [
        "Data science : quelles sont les cinq étapes du data processing ?",
        "Capture : ==collecter== · Curation : ==contrôle qualité== · Storage : ==archiver== · Search : ==trouver== · Transfer : ==déplacer==\nEn clair : La curation corrige les données fausses ou manquantes. Ensuite vient la visualization (word cloud, mind map).\nPiège : Ajuster deux indices pour leurs jours fériés différents = curation, pas capture.",
      ],
      [
        "Machine learning : quelle différence entre supervised learning et unsupervised learning ?",
        "Supervised : données ==labeled==, output connu · Unsupervised : ==non labeled==, structure cachée\nEn clair : Supervised : prédire l'output à partir des inputs. Unsupervised : trouver une structure. Le deep learning (neural networks en couches) sert aux deux.\nPiège : Overfitting = trop complexe, apprend le bruit. Underfitting = trop simple.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "flashcards");
  console.log("Flashcards — Système Quantitative Methods (4 paquets × 15)...");
  const total = await seedFlashcardSets({ ownerId, folderId, sets: SETS, oldTitles });
  console.log(`\n✅ Terminé. ${total} cartes ajoutées.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  });
}
