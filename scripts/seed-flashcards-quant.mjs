// Seed script — flashcards "Système" Quantitative Methods.
// 4 paquets de 15 cartes (60), à réviser en une nuit avec le one-pager Quant :
// rendements et valeur temps, statistiques et probabilités, loi normale,
// échantillons et tests, choix du test, régression et big data.
// Chaque carte se comprend seule (cartes mélangées) : phrases en français,
// termes techniques en anglais, réponse directe en gras en tête du verso.
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
        "**Interest rate = real risk-free rate + inflation premium + default risk premium + liquidity premium + maturity premium**\nReal risk-free rate = pure time preference (ni inflation, ni défaut). Real risk-free rate + inflation premium = nominal risk-free rate, celui d'un T-bill (Treasury bill).\nUn interest rate se lit aussi comme un required rate of return, un discount rate ou l'opportunity cost de consommer aujourd'hui.",
      ],
      [
        "Holding period return (HPR) : action achetée 40, revendue 46 un an plus tard, avec 2 de dividendes reçus. Quel HPR ?",
        "**HPR = (46 − 40 + 2) / 40 = 20 %**\n$$\\text{HPR} = \\dfrac{P_1 - P_0 + D_1}{P_0}$$\noù $P_0$ = prix d'achat, $P_1$ = prix de vente, $D_1$ = revenus reçus (dividendes, coupons).\nSur plusieurs périodes, les HPR se composent : $(1+R_1)(1+R_2)\\cdots(1+R_n) - 1$.",
      ],
      [
        "Un fonds fait +50 % la 1re année puis −50 % la 2e. Quels arithmetic mean et geometric mean de ses rendements annuels ?",
        "**Arithmetic mean = 0 % ; geometric mean = √(1,5 × 0,5) − 1 = −13,4 %**\n$$R_G = \\left[(1+R_1)(1+R_2)\\cdots(1+R_n)\\right]^{1/n} - 1$$\noù $R_t$ = rendement de la période t, n = nombre de périodes.\nLe geometric mean est le vrai taux composé : 100 devient 75. Il est toujours ≤ arithmetic mean (égal seulement si tous les rendements sont égaux).",
      ],
      [
        "Un client ajoute beaucoup d'argent juste avant une très bonne année. Money-weighted return (MWR) ou time-weighted return (TWR) : laquelle sera la plus élevée ?",
        "**La MWR sera plus élevée que la TWR.**\nMWR = IRR (internal rate of return) de tous les flux du compte : elle donne plus de poids aux périodes où il y a plus d'argent. La TWR ignore le calendrier des apports et retraits.\nD'où l'usage : la TWR juge le gérant (il ne contrôle pas les flux du client) ; la MWR convient si le gérant contrôle les flux.\nApport juste avant une mauvaise année : MWR < TWR.",
      ],
      [
        "Time-weighted return (TWR) : un portefeuille fait +20 % la 1re année et −10 % la 2e, avec un gros apport entre les deux. Quelle TWR annualisée ?",
        "**TWR annualisée = √(1,20 × 0,90) − 1 = 3,92 %**\nOn coupe la période à chaque apport ou retrait, on calcule le HPR (holding period return) de chaque sous-période, puis on les compose :\n$$\\text{TWR} = \\left[(1+\\text{HPR}_1)(1+\\text{HPR}_2)\\cdots\\right]^{1/\\text{années}} - 1$$\nL'apport ne change rien au résultat : la TWR mesure le gérant, pas le timing du client.",
      ],
      [
        "Comment annualise-t-on un rendement de 2 % obtenu sur un trimestre ?",
        "**On le compose : 1,02⁴ − 1 = 8,24 % (et non 2 % × 4 = 8 %)**\n$$R_{\\text{annual}} = (1 + \\text{HPR})^{365/\\text{days}} - 1$$\noù HPR = holding period return, days = durée en jours (exposant 4 pour un trimestre, 12 pour un mois).\nC'est aussi l'EAR (effective annual rate) d'un stated rate de 8 % composé 4 fois par an. Plus le compounding est fréquent, plus l'EAR est élevé.",
      ],
      [
        "Une action passe de 50 à 40 en un an. Quel continuously compounded return ?",
        "**$r_{cc}$ = ln(40 / 50) = ln 0,8 = −22,31 %**\n$$r_{cc} = \\ln(1 + \\text{HPR}) = \\ln\\left(\\dfrac{P_1}{P_0}\\right) \\qquad \\text{HPR} = e^{r_{cc}} - 1$$\noù HPR = holding period return, $P_0$ et $P_1$ = prix de début et de fin.\nLes continuously compounded returns s'additionnent dans le temps (les HPR se composent). En continu, FV (future value) = PV (present value) × $e^{rN}$, et un stated rate de 8 % donne un EAR de $e^{0{,}08} - 1$ = 8,33 %.",
      ],
      [
        "Real return : nominal return de 7 % et inflation de 2 %. Quel real return exact ?",
        "**Real return = 1,07 / 1,02 − 1 = 4,90 % (≈ 7 % − 2 % = 5 %)**\n$$1 + r_{\\text{real}} = \\dfrac{1 + r_{\\text{nominal}}}{1 + \\pi}$$\noù π = taux d'inflation. Le real return mesure le gain de pouvoir d'achat.\nÀ ne pas confondre : gross return = avant management fees et administration fees (mais après trading costs) ; net return = après ces frais.",
      ],
      [
        "Leveraged return : un fonds investit sa mise de 100 plus 50 empruntés à 6 %, le tout rapportant 10 %. Quel rendement sur sa mise ?",
        "**$r_L$ = 10 % + (50 / 100) × (10 % − 6 %) = 12 %**\n$$r_L = r + \\dfrac{V_B}{V_0}\\,(r - r_B)$$\noù r = rendement de l'actif, $V_0$ = mise de l'investisseur, $V_B$ = montant emprunté, $r_B$ = coût de l'emprunt.\nVérif : (150 × 10 % − 50 × 6 %) / 100 = 12 %. Le levier amplifie le rendement si $r > r_B$, et les pertes sinon.",
      ],
      [
        "Present value d'une ordinary annuity : 5 versements annuels de 1 000, le premier dans un an, taux de 8 %. Quelle present value (PV) ?",
        "**PV = 1 000 × [1 − 1,08⁻⁵] / 0,08 = 3 992,71**\n$$PV = PMT \\times \\dfrac{1 - (1+r)^{-N}}{r}$$\noù PMT = versement, r = taux par période, N = nombre de versements.\nAnnuity due (1er versement aujourd'hui, mode BGN, « begin », de la calculatrice) : PV × (1 + r) = 4 312,13. Versements mensuels : r = taux annuel / 12, N = années × 12. Un prêt ou un amortizing bond à échéances constantes est une annuity.",
      ],
      [
        "Une perpetuity verse 100 par an, le premier versement dans 4 ans. Taux de 10 %. Quelle present value aujourd'hui ?",
        "**PV (present value) = (100 / 0,10) / 1,10³ = 1 000 / 1,331 = 751,31**\n$$PV_{\\text{perpetuity}} = \\dfrac{PMT}{r}$$\noù PMT = versement constant, r = taux par période.\nPiège : PMT / r donne une valeur une période AVANT le 1er versement (ici en t = 3), d'où l'actualisation sur 3 ans.\nUne preferred stock à dividende fixe est une perpetuity : dividende 5, required return 8 % ⇒ 62,50.",
      ],
      [
        "Gordon growth model : dernier dividende versé $D_0$ = 2, croissance g = 4 % pour toujours, required return on equity $k_e$ = 9 %. Quelle valeur de l'action ?",
        "**$V_0$ = 2 × 1,04 / (0,09 − 0,04) = 2,08 / 0,05 = 41,60**\n$$V_0 = \\dfrac{D_1}{k_e - g} \\qquad D_1 = D_0\\,(1+g)$$\noù $V_0$ = valeur de l'action, $k_e$ = required return on equity, g = croissance constante des dividendes ($k_e > g$).\nPiège : on prend $D_1$ (dividende de l'an prochain), pas $D_0$. Retourné : $k_e = D_1/P_0 + g$, où $P_0$ = prix actuel (dividend yield + growth).",
      ],
      [
        "Spot rates : 4 % à 1 an et 6 % à 2 ans. Quel forward rate 1y1y (prêt d'un an qui démarre dans un an) ?",
        "**1y1y = 1,06² / 1,04 − 1 = 8,04 %**\n$$(1+S_2)^2 = (1+S_1)\\,(1+\\text{1y1y})$$\noù $S_1$, $S_2$ = spot rates à 1 et 2 ans.\nCash flow additivity : placer 2 ans d'un coup ou 1 an puis encore 1 an doit rapporter pareil, sinon il y a un arbitrage (no-arbitrage principle, law of one price).",
      ],
      [
        "Forward exchange rate : spot 1,2000 USD/EUR, taux sans risque à 1 an de 5 % en USD et de 2 % en EUR. Quel forward à 1 an ?",
        "**F = 1,2000 × 1,05 / 1,02 = 1,2353 USD/EUR**\n$$F = S \\times \\dfrac{1 + r_{\\text{price}}}{1 + r_{\\text{base}}}$$\noù S = spot rate coté price/base (ici USD = price currency, EUR = base currency).\nLa devise au taux le plus élevé (USD) vaut moins à terme : F > S, d'environ l'écart de taux (≈ 3 %). Tout autre F permettrait un arbitrage.",
      ],
      [
        "Binomial model à une période : action à 50 qui vaudra 60 ou 40, call de strike 50, risk-free rate 5 %. Que vaut le call aujourd'hui ?",
        "**h = (10 − 0) / (60 − 40) = 0,5 ; $c_0$ = 0,5 × 50 − 20 / 1,05 = 5,95**\n$$h = \\dfrac{c_u - c_d}{S_u - S_d} \\qquad c_0 = h\\,S_0 - \\dfrac{V_1}{1+r_f}$$\noù h = hedge ratio, $c_u$, $c_d$ = valeur du call et $S_u$, $S_d$ = prix de l'action après hausse ou baisse, $V_1$ = valeur certaine du portefeuille (0,5 × 40 = 20).\nLong h actions + short 1 call = portefeuille sans risque, qui doit rapporter $r_f$ (no-arbitrage).",
      ],
    ],
  },
  {
    title: "Quantitative Methods — Flashcards 2/4 (Statistiques, probabilités et portefeuille)",
    cards: [
      [
        "Un investisseur achète pour 1 000 d'actions chaque mois, au prix de 10 puis de 15. Quel coût moyen par action (harmonic mean) ?",
        "**Harmonic mean = 2 / (1/10 + 1/15) = 12, sous l'arithmetic mean de 12,5**\n$$\\bar{X}_H = \\dfrac{N}{\\sum_{i=1}^{N} 1/X_i}$$\noù N = nombre d'achats, $X_i$ = prix payé à chaque achat.\nToujours harmonic ≤ geometric ≤ arithmetic mean (égalité si toutes les valeurs sont égales). Arithmetic : moyenne simple ; geometric : taux composé ; harmonic : coût moyen à montant fixe (cost averaging).",
      ],
      [
        "Mean, median, trimmed mean, winsorized mean : lesquelles résistent aux outliers, et comment ?",
        "**Median, trimmed mean et winsorized mean ; la mean (arithmetic) subit tout l'effet des outliers.**\nMedian = valeur du milieu des données triées. Trimmed mean : on retire les extrêmes (1 % trimmed = 0,5 % de chaque côté). Winsorized mean : on les remplace (90 % winsorized : sous le 5e percentile P5 → P5, au-dessus du 95e P95 → P95).\nMode = valeur la plus fréquente ; pour des données continues, on parle de modal interval.",
      ],
      [
        "Quantiles : dans un échantillon trié de 19 observations, à quelle position se trouve le 3e quartile (Q3, 75e percentile) ?",
        "**Position = (19 + 1) × 75 / 100 = 15e observation**\n$$L_y = (n+1) \\times \\dfrac{y}{100}$$\noù n = nombre d'observations triées par ordre croissant, y = percentile visé. Position non entière : on interpole entre les deux voisines.\nIQR (interquartile range) = Q3 − Q1 (Q1 = 25e percentile) = la boîte du box and whisker plot. Quartile = 4 parts, quintile = 5, decile = 10, percentile = 100.",
      ],
      [
        "Échantillon de rendements : 2 %, 4 % et 9 %. Quels sample variance et sample standard deviation ?",
        "**s² = (9 + 1 + 16) / (3 − 1) = 13 (en %²) ; s = √13 = 3,61 %**\n$$s^2 = \\dfrac{\\sum_{i=1}^{n}(X_i - \\bar{X})^2}{n-1}$$\noù $\\bar{X}$ = sample mean (ici 5 %), n = nombre d'observations.\nPiège : on divise par n − 1 pour un échantillon (diviser par n sous-estimerait la variance de la population). La standard deviation est dans l'unité des données.",
      ],
      [
        "Rendements 2 %, 4 % et 9 % : quelle mean absolute deviation (MAD) ?",
        "**MAD = (3 + 1 + 4) / 3 = 2,67 %**\n$$\\text{MAD} = \\dfrac{\\sum_{i=1}^{n}|X_i - \\bar{X}|}{n}$$\noù $\\bar{X}$ = mean des données (ici 5 %), n = nombre d'observations.\nOn prend les valeurs absolues car la somme des écarts bruts à la mean vaut toujours 0. Ici on divise par n, pas par n − 1.",
      ],
      [
        "Coefficient of variation (CV) : fonds A, mean 10 % et standard deviation 15 % ; fonds B, mean 6 % et standard deviation 12 %. Lequel a le moins de risque par unité de rendement ?",
        "**Le fonds A : CV = 15 / 10 = 1,5, contre 12 / 6 = 2,0 pour B**\n$$CV = \\dfrac{s}{\\bar{X}}$$\noù s = standard deviation, $\\bar{X}$ = mean.\nLe CV mesure le risque par unité de rendement : plus il est bas, mieux c'est. Il sert à comparer des séries de moyennes différentes.",
      ],
      [
        "Target downside deviation : rendements −4 %, 2 %, 6 % et 8 %, cible B = 3 %. Quelle valeur ?",
        "**√[((−4 − 3)² + (2 − 3)²) / (4 − 1)] = √16,67 = 4,08 %**\n$$s_{\\text{target}} = \\sqrt{\\dfrac{\\sum_{X_i < B}(X_i - B)^2}{n-1}}$$\noù B = target return, $X_i$ = rendements, n = nombre total d'observations.\nElle ne mesure que le risque de baisse (sous la cible). Piège : le dénominateur reste n − 1 avec toutes les observations, pas seulement celles sous la cible.",
      ],
      [
        "Distribution à positive skew (longue queue à droite) : dans quel ordre sont la mean, la median et le mode ?",
        "**Mode < median < mean : la mean est tirée vers la queue de droite par les gros outliers positifs.**\nNegative skew (queue à gauche) : mean < median < mode. Distribution symétrique : mean = median = mode.\nUne sample skewness supérieure à 0,5 en valeur absolue est jugée significative.",
      ],
      [
        "Une distribution de rendements a une excess kurtosis de +1,5. Comment s'appelle-t-elle, et qu'est-ce que ça change pour le risque ?",
        "**Leptokurtic : fat tails, donc plus de rendements extrêmes qu'avec une normal distribution.**\nExcess kurtosis = kurtosis − 3 (la normale a une kurtosis de 3). Leptokurtic : plus de petits écarts ET plus de très grands écarts à la mean. Platykurtic : excess kurtosis < 0, thin tails.\nUn modèle normal sous-estime alors les grosses pertes, encore plus avec un skew négatif.",
      ],
      [
        "Rendement de 20 % avec une probabilité de 0,3, et de 5 % avec une probabilité de 0,7. Quels expected return et standard deviation ?",
        "**E(R) = 0,3 × 20 + 0,7 × 5 = 9,5 % ; σ = √(0,3 × 10,5² + 0,7 × 4,5²) = √47,25 = 6,87 %**\n$$E(X) = \\sum P(x_i)\\,x_i \\qquad \\sigma^2 = \\sum P(x_i)\\,[x_i - E(X)]^2$$\noù $P(x_i)$ = probabilité de l'issue $x_i$.\nPiège : dans un modèle de probabilités, on pondère par P ; aucune division par n − 1.",
      ],
      [
        "Total probability rule : si l'entreprise est rachetée (probabilité 40 %), l'expected return est de 30 % ; sinon, de 10 %. Quel expected return global ?",
        "**E(R) = 0,4 × 30 % + 0,6 × 10 % = 18 %**\n$$E(X) = E(X \\mid S)\\,P(S) + E(X \\mid S^c)\\,P(S^c)$$\noù S = le scénario (rachat), $S^c$ = son contraire, $E(X \\mid S)$ = conditional expected value.\nOn révise une conditional expected value quand une information arrive. Dans un probability tree, la probabilité d'un chemin = produit de ses branches.",
      ],
      [
        "Bayes' formula : prior de 30 % qu'une entreprise fasse défaut. Un signal d'alerte apparaît chez 80 % des entreprises qui font défaut et chez 10 % des autres. Signal observé : probabilité de défaut ?",
        "**P(défaut | signal) = 0,24 / 0,31 = 77,4 %**\n$$P(A \\mid B) = \\dfrac{P(B \\mid A)\\,P(A)}{P(B)}$$\noù A = défaut, B = signal, P(B) = probabilité totale du signal = 0,3 × 0,8 + 0,7 × 0,1 = 0,31.\nOn divise la joint probability du chemin (0,24) par la somme des chemins où le signal apparaît. Le prior (30 %) devient un posterior (77,4 %).",
      ],
      [
        "Deux scénarios de probabilité 0,5 : A rend 20 % et B 10 %, ou A rend 0 % et B 4 %. Quelle covariance entre A et B ?",
        "**Cov(A, B) = 0,5 × (10 × 3) + 0,5 × (−10) × (−3) = 30 (en %²), soit 0,0030**\n$$\\text{Cov}_{AB} = \\sum_s P(s)\\,[R_{A,s} - E(R_A)]\\,[R_{B,s} - E(R_B)]$$\noù P(s) = probabilité du scénario s ; ici $E(R_A)$ = 10 % et $E(R_B)$ = 7 %.\nD'abord les espérances, puis les produits des écarts pondérés par P. Covariance > 0 : A et B montent ensemble.",
      ],
      [
        "Correlation : Cov(A, B) = 0,006, $\\sigma_A$ = 20 %, $\\sigma_B$ = 10 %. Quel coefficient de correlation, et que ne mesure-t-il pas ?",
        "**ρ = 0,006 / (0,20 × 0,10) = 0,30 : lien linéaire positif mais faible**\n$$\\rho_{AB} = \\dfrac{\\text{Cov}_{AB}}{\\sigma_A\\,\\sigma_B}$$\noù σ = standard deviation. ρ est sans unité, entre −1 et +1 ; la covariance (non bornée) ne donne que le sens.\nPiège : correlation ≠ causalité (spurious correlation : hasard ou 3e variable commune). ρ = 0 n'exclut pas un lien non linéaire.",
      ],
      [
        "Portefeuille 50 % A (σ = 20 %) et 50 % B (σ = 10 %), correlation 0,5. Quelle standard deviation du portefeuille ?",
        "**$\\sigma_p$ = √(0,01 + 0,0025 + 0,005) = √0,0175 = 13,2 %, sous la moyenne pondérée des σ (15 %)**\n$$\\sigma_p^2 = w_A^2\\sigma_A^2 + w_B^2\\sigma_B^2 + 2\\,w_A w_B\\,\\rho_{AB}\\,\\sigma_A\\sigma_B$$\noù w = poids, σ = standard deviation, ρ = correlation ($\\rho_{AB}\\sigma_A\\sigma_B$ = covariance).\nDès que ρ < 1, la diversification réduit le risque. L'expected return, lui, est la simple moyenne pondérée.",
      ],
    ],
  },
  {
    title: "Quantitative Methods — Flashcards 3/4 (Loi normale, échantillons et tests)",
    cards: [
      [
        "Quelles sont les propriétés clés de la normal distribution ?",
        "**Elle est entièrement décrite par sa mean μ et sa variance σ² ; symétrique, donc mean = median = mode.**\nSkewness = 0, kurtosis = 3 (excess kurtosis = 0).\nSymétrie : N(−z) = 1 − N(z), où N(z) = probabilité d'être sous z. Environ 68 % des valeurs à ±1σ, 95 % à ±1,96σ, 99 % à ±2,58σ.",
      ],
      [
        "Quelles z critical values retenir pour un test two-tailed et pour un test one-tailed, à 10 %, 5 % et 1 % ?",
        "**Two-tailed : ±1,645 (10 %), ±1,96 (5 %), ±2,58 (1 %). One-tailed : 1,28 (10 %), 1,645 (5 %), 2,33 (1 %).**\nEn two-tailed, le significance level α est coupé en deux : à 5 %, 2,5 % dans chaque queue, d'où 1,96.\nPiège : 1,645 sert deux fois, en two-tailed à 10 % et en one-tailed à 5 %.",
      ],
      [
        "Roy's safety-first criterion : rendement minimum $R_L$ = 4 %. Portefeuille A : E(R) = 10 %, σ = 12 %. Portefeuille B : E(R) = 8 %, σ = 6 %. Lequel choisir ?",
        "**B : SFRatio (safety-first ratio) = (8 − 4) / 6 = 0,67, contre (10 − 4) / 12 = 0,50 pour A**\n$$\\text{SFRatio} = \\dfrac{E(R_p) - R_L}{\\sigma_p}$$\noù $R_L$ = threshold return (rendement minimum), $\\sigma_p$ = standard deviation du portefeuille.\nLe plus grand SFRatio minimise le shortfall risk $P(R_p < R_L)$ = N(−SFRatio) si les rendements sont normaux. Avec $R_L$ = risk-free rate, c'est le Sharpe ratio.",
      ],
      [
        "Pourquoi modélise-t-on les prix d'actifs avec une lognormal distribution plutôt qu'une normal distribution ?",
        "**Parce qu'une variable lognormal ne peut pas être négative et a un skew positif, comme un prix.**\nSi x est normal, $e^x$ est lognormal. Prix futur : $P_T = P_0\\,e^{r_{0,T}}$, où $r_{0,T}$ = continuously compounded return, somme des rendements continus de chaque sous-période.\nSi ces rendements continus sont normaux et i.i.d. (independent : le passé ne prédit rien ; identically distributed : mean et variance stables), le prix est lognormal.",
      ],
      [
        "Monte Carlo simulation : comment fonctionne-t-elle, et quelles sont ses limites ?",
        "**On suppose une loi pour chaque facteur de risque, on tire des milliers de scénarios au hasard et on obtient une distribution de valeurs.**\nUsages : valoriser des titres complexes (options), estimer une VaR (value at risk), tester des scénarios jamais observés.\nLimites : complexe, jamais meilleure que ses hypothèses, et méthode statistique (pas analytique) : elle n'explique pas les liens de cause à effet.",
      ],
      [
        "Bootstrap vs jackknife : comment chacun ré-échantillonne-t-il, et à quoi ça sert ?",
        "**Bootstrap : beaucoup d'échantillons de taille n tirés AVEC remise. Jackknife : n échantillons de taille n − 1, en retirant une observation à chaque fois.**\nDans les deux cas, la standard deviation des moyennes obtenues estime la standard error de la sample mean.\nLe jackknife réduit le biais ; le bootstrap est plus précis mais demande plus de calcul. Contrairement au Monte Carlo, le bootstrap n'utilise que les données observées.",
      ],
      [
        "Stratified random sampling vs cluster sampling : quelle différence, et lequel sert à répliquer un bond index ?",
        "**Stratified : on tire au hasard dans CHAQUE strate, au prorata de sa taille ; c'est lui qui sert au bond indexing. Cluster : on ne tire que CERTAINS clusters.**\nOne-stage cluster : les clusters tirés sont pris en entier ; two-stage : on tire encore au hasard dans ces clusters.\nCluster sampling = moins cher et plus rapide, mais plus de sampling error (two-stage > one-stage).",
      ],
      [
        "Qu'est-ce que la sampling error, et pourquoi le convenience sampling et le judgmental sampling l'augmentent-ils ?",
        "**Sampling error = sample statistic − vrai paramètre de la population (ex. x̄ − μ).**\nConvenience (données faciles d'accès) et judgmental (choix de l'expert) sont des nonprobability sampling : la sélection n'est pas aléatoire, l'échantillon représente moins bien la population.\nProbability sampling : simple random (même chance pour tous), systematic (1 élément sur k).\nPiège : ne pas mélanger deux régimes différents (avant et après 2008).",
      ],
      [
        "Que dit le central limit theorem (CLT) ?",
        "**Pour n ≥ 30, la sample mean x̄ suit à peu près une normal distribution de moyenne μ et de variance σ²/n, quelle que soit la loi de la population (si sa variance est finie).**\nμ et σ² = mean et variance de la population ; la moyenne de toutes les sample means = μ.\nC'est ce qui permet les tests z et t sur une moyenne, même si la population n'est pas normale.",
      ],
      [
        "Échantillon de 36 rendements mensuels, mean 1,5 %, standard deviation 6 %. Standard error de la sample mean et confidence interval à 95 % ?",
        "**Standard error = 6 % / √36 = 1 % ; confidence interval = 1,5 % ± 1,96 × 1 % = [−0,46 % ; 3,46 %]**\n$$s_{\\bar{x}} = \\dfrac{s}{\\sqrt{n}}$$\noù s = sample standard deviation, n = taille de l'échantillon ($\\sigma/\\sqrt{n}$ si la σ de la population est connue).\nn ↑ ⇒ standard error ↓ ⇒ intervalle plus étroit. σ inconnue et petit n : on remplace 1,96 par un t à n − 1 degrees of freedom.",
      ],
      [
        "Hypothesis testing : que met-on dans la null hypothesis (H₀) et dans l'alternative hypothesis (Hₐ) ?",
        "**H₀ contient toujours l'égalité (=, ≤ ou ≥) : c'est ce qu'on veut rejeter. Hₐ = ce qu'on cherche à démontrer.**\nTwo-tailed : Hₐ : μ ≠ μ₀, α/2 dans chaque queue. One-tailed : Hₐ : μ > μ₀ (ou μ < μ₀), α dans une seule queue (α = significance level).\nOn ne dit jamais « accept H₀ » mais « fail to reject H₀ ».",
      ],
      [
        "Test sur une moyenne : n = 100, x̄ = 7 %, s = 10 %. H₀ : μ = 5 % contre Hₐ : μ ≠ 5 %, α = 5 %. Quel test statistic et quelle décision ?",
        "**z = (7 % − 5 %) / (10 % / √100) = 2,0 > 1,96 : on rejette H₀ (null hypothesis)**\n$$\\text{test statistic} = \\dfrac{\\text{sample statistic} - \\text{hypothesized value}}{\\text{standard error}}$$\nIci la standard error = s / √n = 1 %. Variance de la population inconnue : t-test à n − 1 = 99 degrees of freedom, t critique ≈ 1,98, même décision. Le z sert si σ est connue ou n grand.",
      ],
      [
        "Type I error vs Type II error : que sont-elles, et quelle probabilité mesure chacune ?",
        "**Type I : rejeter H₀ alors qu'elle est vraie (probabilité α, le significance level). Type II : ne pas rejeter H₀ alors qu'elle est fausse (probabilité β).**\nH₀ = null hypothesis.\nExemple : conclure qu'un gérant sans talent bat « significativement » le marché = Type I error.",
      ],
      [
        "Power of a test : qu'est-ce que c'est, et comment l'augmenter sans augmenter le risque de Type I error ?",
        "**Power = 1 − β = probabilité de rejeter H₀ quand elle est fausse ; pour l'augmenter sans toucher à α, on augmente la taille de l'échantillon n.**\nβ = P(Type II error), α = significance level = P(Type I error), H₀ = null hypothesis.\nÀ n donné, baisser α augmente β, donc baisse la power. Seul n ↑ réduit les deux erreurs. Ex. : β = 15 % ⇒ power = 85 %.",
      ],
      [
        "Qu'est-ce que la p-value d'un test, et quelle règle de décision donne-t-elle ?",
        "**La p-value est le plus petit significance level (α) auquel on rejetterait H₀ : on rejette si p-value < α.**\nEx. : p-value = 0,03 ⇒ rejet à 5 %, mais pas à 1 %.\nPlus la p-value est petite, plus le test statistic est loin dans la queue, donc plus la preuve contre la null hypothesis (H₀) est forte.",
      ],
    ],
  },
  {
    title: "Quantitative Methods — Flashcards 4/4 (Choix du test, régression et big data)",
    cards: [
      [
        "Comparer les rendements moyens de deux actions sur les mêmes mois : difference in means test ou paired comparisons test ?",
        "**Paired comparisons test : les deux séries dépendent du même facteur (le marché, les mêmes dates), donc les échantillons sont dépendants.**\nPaired : t-test sur la mean des différences, n − 1 degrees of freedom.\nDifference in means : échantillons indépendants, variances supposées égales (pooled variance), $n_1 + n_2 - 2$ degrees of freedom.\nLes deux supposent des populations normales.",
      ],
      [
        "Quel test pour comparer une variance à une valeur, et quel test pour comparer les variances de deux populations ?",
        "**Une variance : chi-square test (χ²), n − 1 degrees of freedom. Deux variances : F-test, la plus grande variance au numérateur.**\n$$\\chi^2 = \\dfrac{(n-1)\\,s^2}{\\sigma_0^2} \\qquad F = \\dfrac{s_1^2}{s_2^2}$$\noù s² = sample variance, $\\sigma_0^2$ = variance testée ; F a $n_1 - 1$ et $n_2 - 1$ degrees of freedom.\nχ² et F sont asymétriques et bornés à 0. Populations normales requises.",
      ],
      [
        "Dans quels cas utilise-t-on un nonparametric test plutôt qu'un parametric test (z, t, χ², F) ?",
        "**Quand les hypothèses du parametric test ne tiennent pas, quand les données sont des rangs, ou quand l'hypothèse ne porte pas sur un paramètre.**\n1. Petit échantillon tiré d'une loi non normale. 2. Données ordinales (ex. classement de fonds par decile). 3. Runs test : une série est-elle aléatoire ?\nPour une correlation sur des rangs : le Spearman rank correlation test.",
      ],
      [
        "Test de significativité d'une correlation : r = 0,5 sur n = 27 observations. Quel t-statistic et quelle décision à 5 % (two-tailed) ?",
        "**t = 0,5 × √25 / √(1 − 0,25) = 2,89 > 2,06 : on rejette H₀ (null hypothesis) : ρ = 0**\n$$t = \\dfrac{r\\,\\sqrt{n-2}}{\\sqrt{1-r^2}}$$\noù r = sample correlation, n = nombre d'observations, n − 2 degrees of freedom (ici 25).\nLe t monte avec |r| et avec n. Spearman rank correlation (sur les rangs) : même t si n > 30.",
      ],
      [
        "Comment teste-t-on l'indépendance de deux caractéristiques avec une contingency table de 3 lignes et 4 colonnes ?",
        "**Chi-square test (χ²) à (3 − 1)(4 − 1) = 6 degrees of freedom ; H₀ (null hypothesis) : les deux caractéristiques sont indépendantes.**\n$$\\chi^2 = \\sum \\dfrac{(O_{ij} - E_{ij})^2}{E_{ij}} \\qquad E_{ij} = \\dfrac{\\text{total ligne } i \\times \\text{total colonne } j}{\\text{total général}}$$\noù O = effectif observé, E = effectif attendu si indépendance.\nOn rejette (pas indépendantes) si χ² > valeur critique, dans la queue de droite.",
      ],
      [
        "Simple linear regression : Cov(X, Y) = 12, Var(X) = 8, X̄ = 4, Ȳ = 10. Quels slope et intercept estimés ?",
        "**Slope = 12 / 8 = 1,5 ; intercept = 10 − 1,5 × 4 = 4**\n$$\\hat{b}_1 = \\dfrac{\\text{Cov}(X,Y)}{\\text{Var}(X)} \\qquad \\hat{b}_0 = \\bar{Y} - \\hat{b}_1\\bar{X}$$\nSlope : variation de Y (dependent variable) pour +1 de X (independent variable). Intercept : Y quand X = 0.\nOLS (ordinary least squares) minimise la SSE (sum of squared errors) ; la droite passe par (X̄, Ȳ).",
      ],
      [
        "Quelles sont les 4 hypothèses de la simple linear regression ?",
        "**1. Linearity · 2. Homoskedasticity (variance des résidus constante) · 3. Résidus independent · 4. Résidus normally distributed**\nHeteroskedasticity : la dispersion des résidus change, par ex. elle s'élargit quand X augmente. Grosse erreur chaque décembre : résidus pas indépendants (saisonnalité).\nUn residual plot (résidus contre X ou contre le temps) révèle ces violations.",
      ],
      [
        "Table ANOVA (analysis of variance) d'une simple linear regression : SSR = 60, SSE = 40. Quel R² (coefficient of determination) ?",
        "**R² = SSR / SST = 60 / (60 + 40) = 0,60 : X explique 60 % de la variation de Y**\n$$R^2 = \\dfrac{\\text{SSR}}{\\text{SST}} = 1 - \\dfrac{\\text{SSE}}{\\text{SST}}$$\nSST (total sum of squares) = SSR (regression, la part expliquée) + SSE (sum of squared errors, la part non expliquée).\nEn régression simple seulement, R² = r² (r = correlation entre X et Y) : ici r = ±0,77.",
      ],
      [
        "Simple linear regression sur n = 22 observations : SSR = 60, SSE = 40. Quels MSE, SEE (standard error of estimate) et F-statistic ?",
        "**MSE = 40 / (22 − 2) = 2 ; SEE = √2 = 1,41 ; F = MSR / MSE = 60 / 2 = 30**\nMSR (mean square regression) = SSR / 1 (une seule variable X) ; MSE (mean squared error) = SSE / (n − 2).\nSEE = standard deviation des résidus : plus il est bas, meilleur est le fit. Le F-test (1 et n − 2 degrees of freedom, queue de droite) teste la null hypothesis H₀ : $b_1 = 0$ (slope nulle).",
      ],
      [
        "Simple linear regression : slope estimée 0,64, standard error de la slope 0,20, n = 32. La slope est-elle significative à 5 % (two-tailed) ?",
        "**t = (0,64 − 0) / 0,20 = 3,2 > 2,04 : on rejette H₀ (null hypothesis) : $b_1 = 0$, X est significatif**\n$$t = \\dfrac{\\hat{b}_1 - B_1}{s_{\\hat{b}_1}}$$\noù $B_1$ = valeur testée (souvent 0), $s_{\\hat{b}_1}$ = standard error de la slope, n − 2 = 30 degrees of freedom.\nEn régression simple seulement : F = t² (ici 10,24), et ce t est celui du test de correlation.",
      ],
      [
        "Régression Ŷ = 1 + 0,5X : prévision pour X = 10, avec $s_f$ (standard error of forecast) = 2 et t critique = 2,05. Quel prediction interval à 95 % ?",
        "**Ŷ = 1 + 0,5 × 10 = 6 ; intervalle = 6 ± 2,05 × 2 = [1,9 ; 10,1]**\n$$\\hat{Y} \\pm t_c \\times s_f$$\noù $t_c$ = t critique à n − 2 degrees of freedom, $s_f$ = standard error of forecast.\n$s_f$ grandit quand X s'éloigne de sa moyenne X̄ : l'intervalle s'élargit loin du centre des données.",
      ],
      [
        "Log-lin, lin-log ou log-log : quelle functional form de régression choisir si Y croît à taux constant (ex. +8 % par an) avec le temps X ?",
        "**Le log-lin model : ln Y = b₀ + b₁X (la slope donne une variation relative de Y pour une variation absolue de X).**\nLin-log : Y = b₀ + b₁ ln X (absolue pour Y, relative pour X). Log-log : ln Y = b₀ + b₁ ln X (relative pour relative : la slope est une élasticité).\nOn compare les formes par R², SEE (standard error of estimate), F-statistic et résidus.",
      ],
      [
        "Quelles sont les 3 caractéristiques du Big Data, les « 3 V » ?",
        "**Volume (quantité : terabytes, petabytes), velocity (vitesse : temps réel = low latency), variety (structured, semistructured, unstructured).**\nAlternative data : individus (réseaux sociaux, avis), entreprises (corporate exhaust : relevés bancaires, données de caisse), capteurs (Internet of Things).\nData science : capture, curation (qualité, données manquantes), storage, search, transfer ; visualisation : word cloud, mind map.",
      ],
      [
        "Machine learning : quelle différence entre supervised learning et unsupervised learning ?",
        "**Supervised : données étiquetées (labeled), la machine apprend à prédire un output à partir des inputs. Unsupervised : données non étiquetées, la machine en décrit la structure.**\nDeep learning : couches de neural networks (images, voix), supervised ou unsupervised. Processus : training → validation → test dataset.\nApplications : text analytics, NLP (natural language processing), risk governance, algorithmic trading.",
      ],
      [
        "Machine learning : que signifient overfitting et underfitting ?",
        "**Overfitting : modèle trop complexe, il apprend le bruit comme si c'était un vrai lien. Underfitting : modèle trop simple, il rate de vrais liens.**\nUn modèle overfit colle parfaitement au training dataset mais prédit mal sur des données nouvelles (test dataset).\nAutre limite du machine learning : la black box, des résultats difficiles à expliquer.",
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
