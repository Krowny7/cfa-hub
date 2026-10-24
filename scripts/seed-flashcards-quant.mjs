// Seed script — flashcards "Système" Quantitative Methods.
// 4 paquets de 15 cartes (60), à réviser en une nuit avec le one-pager Quant :
// rendements et valeur temps, statistiques et probabilités, loi normale,
// échantillons et tests, choix du test, régression et big data.
// Chaque carte se comprend seule (cartes mélangées) : phrases en français,
// termes techniques en anglais. Verso au format « trois cases » : l'idée à
// retenir (≤ 12 mots, ==surligné== ou formule), puis « En clair : », puis
// « Piège : » s'il y a un vrai piège d'examen.
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
        "==Real risk-free rate== + inflation + default + liquidity + maturity premiums\nEn clair : real risk-free rate = pure time preference, sans inflation ni défaut. Chaque premium rémunère un risque de plus.\nPiège : un T-bill (Treasury bill) rapporte le nominal risk-free rate = real risk-free rate + inflation premium.",
      ],
      [
        "Holding period return (HPR) : action achetée 40, revendue 46 un an plus tard, avec 2 de dividendes reçus. Quel HPR ?",
        "HPR = ==20 %==\n$$\\text{HPR} = \\dfrac{P_1 - P_0 + D_1}{P_0}$$\nEn clair : (46 − 40 + 2) / 40 = 8 / 40, où $P_0$, $P_1$ = prix d'achat et de vente, $D_1$ = revenus reçus. Sur plusieurs périodes : $(1+R_1)(1+R_2)\\cdots - 1$.\nPiège : oublier le dividende donne 6 / 40 = 15 %.",
      ],
      [
        "Un fonds fait +50 % la 1re année puis −50 % la 2e. Quels arithmetic mean et geometric mean de ses rendements annuels ?",
        "Arithmetic 0 % ; geometric ==−13,4 %==\n$$R_G = \\left[(1+R_1)(1+R_2)\\cdots(1+R_n)\\right]^{1/n} - 1$$\nEn clair : √(1,5 × 0,5) − 1 = −13,4 %, où n = nombre de périodes : 100 devient 150 puis 75. Le geometric mean est le vrai taux composé.\nPiège : geometric ≤ arithmetic mean, toujours (égaux seulement si tous les rendements sont égaux).",
      ],
      [
        "Money-weighted return (MWR) vs time-weighted return (TWR) : un client apporte beaucoup d'argent juste avant une très bonne année. Laquelle sera la plus élevée ?",
        "==MWR > TWR== : la MWR pèse plus l'année la plus chargée\nEn clair : MWR = IRR (internal rate of return) des flux du compte : $\\sum_t CF_t/(1+\\text{MWR})^t = 0$. La TWR ignore le calendrier des apports et retraits.\nPiège : pour juger le gérant, on prend la TWR ; la MWR seulement s'il contrôle les flux.",
      ],
      [
        "Time-weighted return (TWR) : un portefeuille fait +20 % la 1re année et −10 % la 2e, avec un gros apport entre les deux. Quelle TWR annualisée ?",
        "TWR annualisée = ==3,92 %==\n$$\\text{TWR} = \\left[(1+\\text{HPR}_1)\\cdots(1+\\text{HPR}_n)\\right]^{1/\\text{années}} - 1$$\nEn clair : √(1,20 × 0,90) − 1 = 3,92 %. On coupe à chaque apport ou retrait, puis on compose les HPR (holding period returns) des sous-périodes.\nPiège : l'apport ne change rien à la TWR : elle mesure le gérant, pas le timing du client.",
      ],
      [
        "Comment annualise-t-on un rendement de 2 % obtenu sur un trimestre ?",
        "On compose : 1,02⁴ − 1 = ==8,24 %== par an\nEn clair : $R_{\\text{annual}} = (1+\\text{HPR})^{365/\\text{days}} - 1$, HPR = holding period return. C'est aussi l'EAR (effective annual rate) d'un stated rate de 8 % composé m = 4 fois : $(1 + r/m)^m - 1$.\nPiège : 2 % × 4 = 8 % oublie la composition.",
      ],
      [
        "Une action passe de 50 à 40 en un an. Quel continuously compounded return ?",
        "$r_{cc}$ = ln(40 / 50) = ==−22,31 %==\nEn clair : $r_{cc} = \\ln(1+\\text{HPR}) = \\ln(P_1/P_0)$ et $\\text{HPR} = e^{r_{cc}} - 1$ (HPR = holding period return). En continu : FV (future value) = PV (present value) × $e^{rN}$.\nPiège : les $r_{cc}$ s'additionnent dans le temps ; les HPR, eux, se composent.",
      ],
      [
        "Real return : nominal return de 7 % et inflation de 2 %. Quel real return exact ?",
        "Real return = 1,07 / 1,02 − 1 = ==4,90 %==\nEn clair : $1 + r_{\\text{real}} = (1 + r_{\\text{nominal}})/(1 + \\pi)$, où π = inflation. Il mesure le gain de pouvoir d'achat ; 7 % − 2 % = 5 % n'est qu'une approximation.\nPiège : gross return = avant management et administration fees (trading costs déduits) ; net return = après.",
      ],
      [
        "Leveraged return : un fonds investit sa mise de 100 plus 50 empruntés à 6 %, le tout rapportant 10 %. Quel rendement sur sa mise ?",
        "$r_L$ = 10 % + 0,5 × (10 % − 6 %) = ==12 %==\nEn clair : $r_L = r + (V_B/V_0)(r - r_B)$, où r = rendement de l'actif, $V_0$ = mise, $V_B$ = montant emprunté, $r_B$ = coût de l'emprunt. Vérif : (150 × 10 % − 50 × 6 %) / 100.\nPiège : le levier amplifie aussi les pertes dès que r < $r_B$.",
      ],
      [
        "Present value (PV) d'une ordinary annuity : 5 versements annuels de 1 000, le premier dans un an, taux de 8 %. Quelle PV ?",
        "PV = ==3 992,71==\n$$PV = PMT \\times \\dfrac{1 - (1+r)^{-N}}{r}$$\nEn clair : 1 000 × (1 − 1,08⁻⁵) / 0,08, où PMT = versement, r = taux par période, N = nombre de versements. Mensuel : r / 12 et N × 12. Un amortizing bond est une annuity.\nPiège : annuity due (1er versement aujourd'hui, mode BGN) : PV × (1 + r) = 4 312,13.",
      ],
      [
        "Une perpetuity verse 100 par an, le premier versement dans 4 ans. Taux de 10 %. Quelle present value (PV) aujourd'hui ?",
        "PV = 1 000 / 1,10³ = ==751,31==\nEn clair : $PV = PMT/r$ (PMT = versement, r = taux) = 100 / 0,10 = 1 000, valeur en t = 3. Une preferred stock à dividende fixe est une perpetuity : 5 / 8 % = 62,50.\nPiège : PMT / r vaut une période AVANT le 1er versement : actualiser sur 3 ans, pas 4.",
      ],
      [
        "Gordon growth model : dernier dividende versé $D_0$ = 2, croissance g = 4 % pour toujours, required return on equity $k_e$ = 9 %. Quelle valeur de l'action ?",
        "$V_0$ = 2,08 / (0,09 − 0,04) = ==41,60==\nEn clair : $V_0 = D_1/(k_e - g)$ avec $D_1 = D_0(1+g)$ = 2,08 et $k_e > g$. Retourné : $k_e = D_1/P_0 + g$ (dividend yield + growth), où $P_0$ = prix actuel.\nPiège : on prend $D_1$, le dividende de l'an prochain : 2 / 0,05 = 40 est faux.",
      ],
      [
        "Spot rates : 4 % à 1 an et 6 % à 2 ans. Quel forward rate 1y1y (prêt d'un an qui démarre dans un an) ?",
        "1y1y = 1,06² / 1,04 − 1 = ==8,04 %==\nEn clair : $(1+S_2)^2 = (1+S_1)(1+\\text{1y1y})$, où $S_1$, $S_2$ = spot rates : placer 2 ans d'un coup ou 1 an puis 1 an rapporte pareil (cash flow additivity, no-arbitrage).\nPiège : 2 × 6 % − 4 % = 8 % n'est qu'une approximation.",
      ],
      [
        "Forward exchange rate : spot 1,2000 USD/EUR, risk-free rates à 1 an de 5 % en USD et de 2 % en EUR. Quel forward à 1 an ?",
        "F = 1,2000 × 1,05 / 1,02 = ==1,2353 USD/EUR==\nEn clair : $F = S \\times (1 + r_{\\text{price}})/(1 + r_{\\text{base}})$, S = spot coté price/base (USD = price currency, EUR = base currency). Tout autre F permettrait un arbitrage.\nPiège : la devise au taux le plus élevé (ici USD) vaut moins à terme : F > S.",
      ],
      [
        "Binomial model à une période : action à 50 qui vaudra 60 ou 40, call de strike 50, risk-free rate 5 %. Que vaut le call aujourd'hui ?",
        "$c_0$ = 0,5 × 50 − 20 / 1,05 = ==5,95==\nEn clair : hedge ratio $h = (c_u - c_d)/(S_u - S_d)$ = 10 / 20 (c = call, S = action, u/d = hausse/baisse). Long h actions + short 1 call vaut 20 dans les deux cas : sans risque, on l'actualise à $r_f$.\nPiège : les vraies probabilités de hausse et de baisse n'entrent pas dans le calcul.",
      ],
    ],
  },
  {
    title: "Quantitative Methods — Flashcards 2/4 (Statistiques, probabilités et portefeuille)",
    cards: [
      [
        "Un investisseur achète pour 1 000 d'actions chaque mois, au prix de 10 puis de 15. Quel coût moyen par action (harmonic mean) ?",
        "Harmonic mean = ==12== par action\n$$\\bar{X}_H = \\dfrac{N}{\\sum_{i=1}^{N} 1/X_i}$$\nEn clair : 2 / (1/10 + 1/15) = 12, où N = nombre d'achats, $X_i$ = prix payés. À montant fixe, on achète plus d'actions quand le prix est bas (cost averaging).\nPiège : harmonic ≤ geometric ≤ arithmetic mean (ici 12,5) ; égalité seulement sans dispersion.",
      ],
      [
        "Mean, median, trimmed mean, winsorized mean : lesquelles résistent aux outliers, et comment ?",
        "==Median, trimmed et winsorized mean== ; la mean subit les outliers\nEn clair : trimmed : on retire les extrêmes (1 % trimmed = 0,5 % de chaque côté). Winsorized : on les remplace (90 % winsorized : par les 5e et 95e percentiles).\nPiège : trimmed retire les extrêmes, winsorized les remplace : ne pas inverser.",
      ],
      [
        "Quantiles : dans un échantillon trié de 19 observations, à quelle position se trouve le 3e quartile (Q3, 75e percentile) ?",
        "$L_y$ = (19 + 1) × 75 / 100 = ==15e observation==\nEn clair : $L_y = (n+1) \\times y/100$, où n = nombre d'observations, y = percentile visé ; position non entière : on interpole. IQR (interquartile range) = Q3 − Q1.\nPiège : quartile = 4 parts, quintile = 5, decile = 10, percentile = 100.",
      ],
      [
        "Échantillon de rendements : 2 %, 4 % et 9 %. Quels sample variance et sample standard deviation ?",
        "s² = 26 / 2 = 13 (%²) ; s = ==3,61 %==\nEn clair : $s^2 = \\sum(X_i - \\bar{X})^2/(n-1)$ : mean = 5 %, écarts −3, −1, +4, carrés 9 + 1 + 16 = 26. La standard deviation est dans l'unité des données.\nPiège : pour un échantillon, on divise par n − 1, pas par n (sinon la variance est sous-estimée).",
      ],
      [
        "Rendements 2 %, 4 % et 9 % : quelle mean absolute deviation (MAD) ?",
        "MAD = (3 + 1 + 4) / 3 = ==2,67 %==\nEn clair : $\\text{MAD} = \\sum|X_i - \\bar{X}|/n$, où $\\bar{X}$ = mean (5 %). On prend les valeurs absolues car la somme des écarts bruts à la mean vaut toujours 0.\nPiège : la MAD divise par n, pas par n − 1 comme la sample variance.",
      ],
      [
        "Coefficient of variation (CV) : fonds A, mean 10 % et standard deviation 15 % ; fonds B, mean 6 % et standard deviation 12 %. Lequel a le moins de risque par unité de rendement ?",
        "==Fonds A== : CV de 1,5 contre 2,0 pour B\nEn clair : CV = s / $\\bar{X}$ (standard deviation / mean) : A 15 / 10 = 1,5 ; B 12 / 6 = 2,0. Plus le CV est bas, moins il y a de risque par unité de rendement.\nPiège : B a la plus petite standard deviation, mais le plus de risque par unité de rendement.",
      ],
      [
        "Target downside deviation : rendements −4 %, 2 %, 6 % et 8 %, cible B = 3 %. Quelle valeur ?",
        "Target downside deviation = ==4,08 %==\nEn clair : seuls −4 % et 2 % sont sous B : √[((−7)² + (−1)²) / (4 − 1)] = √16,67. Elle ne mesure que le risque de baisse sous la cible.\nPiège : on divise par n − 1 avec TOUTES les observations (4 − 1 = 3), pas seulement celles sous B.",
      ],
      [
        "Distribution à positive skew (longue queue à droite) : dans quel ordre sont la mean, la median et le mode ?",
        "==Mode < median < mean== : la mean est tirée vers la queue\nEn clair : negative skew (queue à gauche) : mean < median < mode. Mode = valeur la plus fréquente (modal interval si données continues). Skewness > 0,5 en valeur absolue : significative.",
      ],
      [
        "Une distribution de rendements a une excess kurtosis de +1,5. Comment s'appelle-t-elle, et qu'est-ce que ça change pour le risque ?",
        "==Leptokurtic== : fat tails, plus de rendements extrêmes que la normale\nEn clair : excess kurtosis = kurtosis − 3 (normal distribution = 3) ; < 0 : platykurtic, thin tails. Un modèle normal sous-estime alors les grosses pertes, surtout avec un skew négatif.\nPiège : on compare la kurtosis à 3, l'excess kurtosis à 0.",
      ],
      [
        "Rendement de 20 % avec une probabilité de 0,3, et de 5 % avec une probabilité de 0,7. Quels expected return et standard deviation ?",
        "E(R) = ==9,5 %== ; σ = 6,87 %\n$$E(X) = \\sum P(x_i)\\,x_i \\qquad \\sigma^2 = \\sum P(x_i)\\,[x_i - E(X)]^2$$\nEn clair : 0,3 × 20 + 0,7 × 5 = 9,5 ; σ² = 0,3 × 10,5² + 0,7 × 4,5² = 47,25 (%²), σ = √47,25. $P(x_i)$ = probabilité de l'issue $x_i$.\nPiège : modèle de probabilités : on pondère par P, aucune division par n − 1.",
      ],
      [
        "Total probability rule : si l'entreprise est rachetée (probabilité 40 %), l'expected return est de 30 % ; sinon, de 10 %. Quel expected return global ?",
        "E(R) = 0,4 × 30 % + 0,6 × 10 % = ==18 %==\nEn clair : $E(X) = \\sum_i E(X \\mid S_i)\\,P(S_i)$, où $E(X \\mid S_i)$ = conditional expected value du scénario $S_i$, révisée quand une information arrive.\nPiège : dans un probability tree, probabilité d'un chemin = produit de ses branches, pas leur somme.",
      ],
      [
        "Bayes' formula : prior de 30 % qu'une entreprise fasse défaut. Un signal d'alerte apparaît chez 80 % des entreprises qui font défaut et chez 10 % des autres. Signal observé : probabilité de défaut ?",
        "P(défaut | signal) = ==77,4 %==\n$$P(A \\mid B) = \\dfrac{P(B \\mid A)\\,P(A)}{P(B)}$$\nEn clair : A = défaut, B = signal. P(B) = 0,3 × 0,8 + 0,7 × 0,1 = 0,31 ; 0,24 / 0,31 = 77,4 %. Le prior (30 %) devient un posterior.\nPiège : on divise par P(B), la probabilité totale du signal, pas par P(A).",
      ],
      [
        "Deux scénarios de probabilité 0,5 : A rend 20 % et B 10 %, ou A rend 0 % et B 4 %. Quelle covariance entre A et B ?",
        "Cov(A, B) = ==30 (%²), soit 0,0030==\n$$\\text{Cov}_{AB} = \\sum_s P(s)\\,[R_{A,s} - E(R_A)]\\,[R_{B,s} - E(R_B)]$$\nEn clair : $E(R_A)$ = 10 %, $E(R_B)$ = 7 % ; 0,5 × 10 × 3 + 0,5 × (−10) × (−3) = 30. Covariance > 0 : A et B montent ensemble.\nPiège : sur données historiques, $s_{XY} = \\sum(X - \\bar{X})(Y - \\bar{Y})/(n-1)$, sans probabilités.",
      ],
      [
        "Correlation : covariance Cov(A, B) = 0,006, standard deviations $\\sigma_A$ = 20 % et $\\sigma_B$ = 10 %. Quel coefficient de correlation ?",
        "ρ = 0,006 / (0,20 × 0,10) = ==0,30==\nEn clair : $\\rho_{AB} = \\text{Cov}_{AB}/(\\sigma_A\\sigma_B)$ mesure le lien linéaire : sans unité, entre −1 et +1. La covariance, non bornée, ne donne que le sens.\nPiège : correlation ≠ causalité (spurious correlation : hasard ou 3e variable) ; ρ = 0 n'exclut pas un lien non linéaire.",
      ],
      [
        "Portefeuille 50 % A (σ = 20 %) et 50 % B (σ = 10 %), correlation 0,5. Quelle standard deviation du portefeuille ?",
        "$\\sigma_p$ = √0,0175 = ==13,2 %==, sous la moyenne des σ (15 %)\nEn clair : $\\sigma_p^2 = w_A^2\\sigma_A^2 + w_B^2\\sigma_B^2 + 2w_Aw_B\\rho\\sigma_A\\sigma_B$ = 0,01 + 0,0025 + 0,005 (w = poids, ρ = correlation). Dès que ρ < 1, la diversification réduit le risque.\nPiège : l'expected return, lui, est la simple moyenne pondérée $\\sum w_i E(R_i)$.",
      ],
    ],
  },
  {
    title: "Quantitative Methods — Flashcards 3/4 (Loi normale, échantillons et tests)",
    cards: [
      [
        "Quelles sont les propriétés clés de la normal distribution ?",
        "Décrite par ==μ et σ== ; symétrique : mean = median = mode\nEn clair : μ = mean, σ = standard deviation ; skewness = 0, kurtosis = 3. ≈ 68 % des valeurs à ±1σ, 95 % à ±1,96σ, 99 % à ±2,58σ. N(−z) = 1 − N(z), N(z) = probabilité d'être sous z.\nPiège : la kurtosis de la normale vaut 3 ; c'est l'excess kurtosis qui vaut 0.",
      ],
      [
        "Quelles z critical values retenir pour un test two-tailed et pour un test one-tailed, à 10 %, 5 % et 1 % ?",
        "Two-tailed 10 % : ==±1,645== · Two-tailed 5 % : ==±1,96== · Two-tailed 1 % : ==±2,58== · One-tailed 5 % : ==1,645== · One-tailed 1 % : ==2,33==\nEn clair : one-tailed 10 % : 1,28. En two-tailed, α (significance level) est coupé en deux : 2,5 % par queue à 5 %.\nPiège : 1,645 sert deux fois : two-tailed à 10 % et one-tailed à 5 %.",
      ],
      [
        "Roy's safety-first criterion : rendement minimum $R_L$ = 4 %. Portefeuille A : expected return 10 %, σ = 12 %. Portefeuille B : expected return 8 %, σ = 6 %. Lequel choisir ?",
        "==Portefeuille B== : SFRatio 0,67 contre 0,50 pour A\nEn clair : SFRatio (safety-first ratio) = $[E(R_p) - R_L]/\\sigma_p$ : B (8 − 4) / 6, A (10 − 4) / 12. Le plus grand minimise le shortfall risk $P(R_p < R_L)$ = N(−SFRatio) si normale.\nPiège : on prend le plus grand SFRatio, pas le plus grand E(R). Si $R_L$ = risk-free rate, c'est le Sharpe ratio.",
      ],
      [
        "Pourquoi modélise-t-on les prix d'actifs avec une lognormal distribution plutôt qu'une normal distribution ?",
        "Lognormal : ==jamais négative==, skew positif, comme un prix\nEn clair : si x est normal, $e^x$ est lognormal : $P_T = P_0 e^{r_{0,T}}$, où $r_{0,T}$ = somme des continuously compounded returns, normaux et i.i.d. (independent, identically distributed).",
      ],
      [
        "Monte Carlo simulation : comment fonctionne-t-elle, et quelles sont ses limites ?",
        "==Tirages aléatoires== des facteurs de risque → distribution des valeurs\nEn clair : usages : titres complexes, VaR (value at risk), scénarios jamais vus. Limites : complexe, ne vaut que ses hypothèses, statistique et non analytique.\nPiège : ses inputs ne sont pas limités aux données passées, contrairement au bootstrap.",
      ],
      [
        "Bootstrap vs jackknife : comment chacun ré-échantillonne-t-il, et à quoi ça sert ?",
        "Bootstrap : tirages ==avec remise== ; jackknife : une observation retirée\nEn clair : bootstrap : beaucoup d'échantillons de taille n ; jackknife : n échantillons de n − 1. La standard deviation de leurs means estime la standard error.\nPiège : le jackknife, simple, réduit le biais ; le bootstrap demande plus de calcul.",
      ],
      [
        "Stratified random sampling vs cluster sampling : quelle différence, et lequel sert à répliquer un bond index ?",
        "==Stratified== (bond indexing) : chaque strate ; cluster : quelques clusters\nEn clair : stratified : tirage au hasard dans chaque strate, au prorata. Cluster : clusters pris en entier (one-stage) ou re-tirés au hasard (two-stage).\nPiège : cluster = moins cher et plus rapide, mais plus de sampling error (two-stage > one-stage).",
      ],
      [
        "Qu'est-ce que la sampling error, et pourquoi le convenience sampling et le judgmental sampling l'augmentent-ils ?",
        "Sampling error = ==sample statistic − population parameter== (x̄ − μ)\nEn clair : convenience (données faciles d'accès), judgmental (choix d'expert) : nonprobability sampling, sans hasard. Probability : simple random, systematic (1 sur k).\nPiège : ne pas mélanger deux régimes (avant et après 2008) dans un même échantillon.",
      ],
      [
        "Que dit le central limit theorem (CLT) ?",
        "n ≥ 30 : x̄ ≈ ==normale==, de mean μ et variance σ²/n\nEn clair : quelle que soit la loi de la population (si sa variance est finie) ; μ, σ² = mean et variance de la population, x̄ = sample mean. Il fonde les tests z et t sur une moyenne.\nPiège : le CLT porte sur la distribution de x̄, pas sur celle de la population.",
      ],
      [
        "Échantillon de 36 rendements mensuels, mean 1,5 %, standard deviation 6 %. Standard error (SE) de la sample mean et confidence interval (CI) à 95 % ?",
        "SE = 6 % / √36 = 1 % ; CI = ==[−0,46 % ; 3,46 %]==\nEn clair : $s_{\\bar{x}} = s/\\sqrt{n}$ (σ/√n si la σ de la population est connue) ; CI = 1,5 % ± 1,96 × 1 %. n ↑ ⇒ SE ↓ ⇒ intervalle plus étroit.\nPiège : σ inconnue et petit n : remplacer 1,96 par un t à n − 1 degrees of freedom.",
      ],
      [
        "Hypothesis testing : que met-on dans la null hypothesis (H₀) et dans l'alternative hypothesis (Hₐ) ?",
        "H₀ contient ==l'égalité== (=, ≤ ou ≥) : c'est ce qu'on veut rejeter\nEn clair : Hₐ = ce qu'on cherche à démontrer. Two-tailed : Hₐ : μ ≠ μ₀, α/2 par queue ; one-tailed : Hₐ : μ > μ₀ (ou <), α dans une queue (α = significance level).\nPiège : on ne dit jamais « accept H₀ » mais « fail to reject H₀ ».",
      ],
      [
        "Test sur une moyenne : n = 100, x̄ = 7 %, s = 10 %. H₀ : μ = 5 % contre Hₐ : μ ≠ 5 %, α = 5 %. Quel test statistic et quelle décision ?",
        "z = 2 / 1 = 2,0 > 1,96 : ==on rejette H₀==\nEn clair : test statistic = (sample statistic − hypothesized value) / standard error = (7 % − 5 %) / (10 % / √100). H₀ = null hypothesis.\nPiège : σ inconnue : t-test à 99 degrees of freedom, t critique ≈ 1,98, même décision.",
      ],
      [
        "Type I error vs Type II error : que sont-elles, et quelle probabilité mesure chacune ?",
        "Type I : rejeter H₀ ==vraie== (α) ; Type II : garder H₀ fausse (β)\nEn clair : H₀ = null hypothesis ; α = significance level. Ex. : conclure qu'un gérant sans talent bat « significativement » le marché = Type I error.",
      ],
      [
        "Power of a test : qu'est-ce que c'est, et comment l'augmenter sans augmenter le risque de Type I error ?",
        "Power = 1 − β ; sans toucher à α : ==augmenter n==\nEn clair : power = probabilité de rejeter H₀ (null hypothesis) quand elle est fausse ; β = P(Type II error), α = significance level, n = taille de l'échantillon. β = 15 % ⇒ power = 85 %.\nPiège : à n donné, baisser α augmente β, donc baisse la power ; seul n ↑ réduit les deux.",
      ],
      [
        "Qu'est-ce que la p-value d'un test, et quelle règle de décision donne-t-elle ?",
        "Plus petit α qui rejette H₀ : ==rejet si p-value < α==\nEn clair : α = significance level, H₀ = null hypothesis. Ex. : p-value = 0,03 ⇒ rejet à 5 %, pas à 1 %. Plus elle est petite, plus la preuve contre H₀ est forte.",
      ],
    ],
  },
  {
    title: "Quantitative Methods — Flashcards 4/4 (Choix du test, régression et big data)",
    cards: [
      [
        "Comparer les rendements moyens de deux actions sur les mêmes mois : difference in means test ou paired comparisons test ?",
        "==Paired comparisons test== : mêmes dates, échantillons dépendants\nEn clair : paired : t-test sur la mean des différences, n − 1 degrees of freedom. Difference in means : échantillons indépendants, pooled variance, $n_1 + n_2 - 2$ degrees of freedom.",
      ],
      [
        "Quel test pour comparer une variance à une valeur, et quel test pour comparer les variances de deux populations ?",
        "Une variance : ==chi-square== ; deux : F-test\n$$\\chi^2 = \\dfrac{(n-1)\\,s^2}{\\sigma_0^2} \\qquad F = \\dfrac{s_1^2}{s_2^2}$$\nEn clair : s² = sample variance, $\\sigma_0^2$ = variance testée ; χ² à n − 1 degrees of freedom, F à $n_1 - 1$ et $n_2 - 1$. Lois asymétriques, bornées à 0 ; populations normales requises.\nPiège : F-test : la plus grande variance au numérateur.",
      ],
      [
        "Dans quels cas utilise-t-on un nonparametric test plutôt qu'un parametric test (z, t, χ², F) ?",
        "Petit n, loi ==non normale== · Données en ==rangs== · Hypothèse ==hors paramètre==\nEn clair : ex. : classement de fonds par decile ; runs test (une série est-elle aléatoire ?). Spearman rank correlation : $r_s = 1 - 6\\sum d^2/[n(n^2-1)]$, d = écart de rangs, n = paires.",
      ],
      [
        "Test de significativité d'une correlation : r = 0,5 sur n = 27 observations. Quel t-statistic et quelle décision à 5 % (two-tailed) ?",
        "t = 2,89 > 2,06 : ==rejet de H₀== (ρ = 0)\nEn clair : $t = r\\sqrt{n-2}/\\sqrt{1-r^2}$ = 0,5 × √25 / √0,75, à n − 2 = 25 degrees of freedom ; r = sample correlation, H₀ = null hypothesis.\nPiège : le t monte avec |r| ET avec n : un petit r devient significatif sur un grand échantillon.",
      ],
      [
        "Comment teste-t-on l'indépendance de deux caractéristiques avec une contingency table de 3 lignes et 4 colonnes ?",
        "Chi-square test à (3 − 1)(4 − 1) = ==6 degrees of freedom==\nEn clair : H₀ (null hypothesis) : indépendance. $\\chi^2 = \\sum (O_{ij} - E_{ij})^2/E_{ij}$, où O = effectif observé, $E_{ij}$ = total ligne × total colonne / total général.\nPiège : on rejette (pas indépendantes) si χ² > valeur critique : queue de droite seulement.",
      ],
      [
        "Simple linear regression : covariance Cov(X, Y) = 12, variance Var(X) = 8, X̄ = 4, Ȳ = 10. Quels slope et intercept estimés ?",
        "Slope = 12 / 8 = ==1,5== ; intercept = 10 − 1,5 × 4 = 4\nEn clair : $\\hat{b}_1 = \\text{Cov}(X,Y)/\\text{Var}(X)$, $\\hat{b}_0 = \\bar{Y} - \\hat{b}_1\\bar{X}$ : la droite OLS (ordinary least squares, qui minimise la SSE, sum of squared errors) passe par (X̄, Ȳ).\nPiège : on divise par Var(X), la variance de l'independent variable, pas par Var(Y).",
      ],
      [
        "Quelles sont les 4 hypothèses de la simple linear regression ?",
        "==Linearity== · ==Homoskedasticity== · Résidus ==independent== · Résidus ==normally distributed==\nEn clair : homoskedasticity = variance des résidus constante, sinon heteroskedasticity. Un residual plot révèle les violations.\nPiège : une grosse erreur chaque décembre (saisonnalité) : résidus non independent.",
      ],
      [
        "Table ANOVA (analysis of variance) d'une simple linear regression : SSR = 60, SSE = 40. Quel R² (coefficient of determination) ?",
        "R² = 60 / 100 = ==0,60== : X explique 60 % de la variation de Y\nEn clair : R² = SSR / SST, où SST (total sum of squares) = SSR (regression sum of squares, part expliquée) + SSE (sum of squared errors, part non expliquée).\nPiège : R² = r² (r = correlation de X et Y) en régression simple seulement : ici r = ±0,77.",
      ],
      [
        "Simple linear regression sur n = 22 observations : SSR = 60, SSE = 40. Quels MSE, SEE (standard error of estimate) et F-statistic ?",
        "MSE = 2 ; SEE = 1,41 ; F-statistic = ==30==\nEn clair : MSE (mean squared error) = SSE (sum of squared errors) / (n − 2) = 40 / 20 ; SEE = √MSE ; F = MSR / MSE, où MSR = SSR (regression sum of squares) / 1 = 60.\nPiège : le F-test (1 et n − 2 degrees of freedom) teste H₀ : $b_1 = 0$ dans la queue de droite.",
      ],
      [
        "Simple linear regression : slope estimée 0,64, standard error de la slope 0,20, n = 32. La slope est-elle significative à 5 % (two-tailed) ?",
        "t = 0,64 / 0,20 = 3,2 > 2,04 : ==slope significative==\nEn clair : $t = (\\hat{b}_1 - B_1)/s_{\\hat{b}_1}$, où $B_1$ = valeur testée (0), $s_{\\hat{b}_1}$ = standard error de la slope, n − 2 = 30 degrees of freedom : on rejette H₀ (null hypothesis) : $b_1 = 0$.\nPiège : en régression simple seulement, F = t² (ici 10,24).",
      ],
      [
        "Régression Ŷ = 1 + 0,5X : prévision pour X = 10, avec $s_f$ (standard error of forecast) = 2 et t critique = 2,05. Quel prediction interval à 95 % ?",
        "Ŷ = 6 ; intervalle = 6 ± 2,05 × 2 = ==[1,9 ; 10,1]==\nEn clair : Ŷ = 1 + 0,5 × 10 ; prediction interval = $\\hat{Y} \\pm t_c \\times s_f$, où $t_c$ = t critique à n − 2 degrees of freedom, $s_f$ = standard error of forecast.\nPiège : $s_f$ grandit quand X s'éloigne de sa mean X̄ : l'intervalle s'élargit loin du centre des données.",
      ],
      [
        "Log-lin, lin-log ou log-log : quelle functional form de régression choisir si Y croît à taux constant (ex. +8 % par an) avec le temps X ?",
        "==Log-lin model== : ln Y = b₀ + b₁X\nEn clair : variation relative de Y pour une variation absolue de X. Lin-log : Y = b₀ + b₁ ln X ; log-log : ln Y = b₀ + b₁ ln X (slope = élasticité). On compare R², SEE (standard error of estimate) et F.\nPiège : log-lin = log sur Y (la dependent variable), pas sur X.",
      ],
      [
        "Quelles sont les 3 caractéristiques du Big Data, les « 3 V » ?",
        "==Volume== : quantité · ==Velocity== : vitesse, low latency · ==Variety== : types de données\nEn clair : variety : structured à unstructured, dont l'alternative data (corporate exhaust, IoT, Internet of Things). Usages : text analytics, NLP (natural language processing), algorithmic trading.",
      ],
      [
        "Data science : quelles sont les 5 étapes du data processing d'un Big Data ?",
        "Capture : ==collecter== · Curation : ==qualité== · Storage : ==archiver== · Search : ==trouver== · Transfer : ==déplacer==\nEn clair : curation = corriger les données fausses ou manquantes. Pour visualiser ensuite : word cloud, mind map.\nPiège : ajuster deux indices pour leurs jours fériés différents = curation, pas capture.",
      ],
      [
        "Machine learning : quelle différence entre supervised learning et unsupervised learning ?",
        "Supervised : données ==labeled== ; unsupervised : non labeled\nEn clair : supervised : prédire un output à partir des inputs ; unsupervised : décrire la structure. Deep learning (neural networks en couches) : l'un ou l'autre.\nPiège : overfitting = trop complexe, apprend le bruit, rate le test dataset ; underfitting = trop simple.",
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
