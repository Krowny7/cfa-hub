// Seed script — quiz de "drill" associé à la page 1 de la fiche PDF Portfolio
// Management (Portfolio Risk and Return: Part I). Structure : 8 concepts clés
// de la page (page dense), chacun en 3 questions : 1 question officielle
// (banque de pratique CFA, "Reading 20 Portfolio Risk and Return Part I",
// corrigé vérifié contre "- Answers.pdf", recopiée à l'identique) + 1 variante
// "angle différent" (même notion, jamais un simple changement de chiffres
// menant au même raisonnement) + 1 variante "plus difficile" (raisonnement à
// plusieurs étapes / pièges combinés / donnée-piège / notion connexe de la
// page). Voir memory regle-drill-variantes-cfa-hub. Questions en anglais,
// explications en français. Remis au cadre le 3 octobre 2026 (l'ancienne
// version, en français, ne suivait pas ce modèle).
// Usage: node scripts/seed-pm-drill-page1.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Portfolio Management (Système)";

const QUIZ_SETS = [
  {
    title: "Portfolio Management — Drill Fiche Page 1 (Portfolio Risk and Return: Part I)",
    difficulty: 2,
    questions: [
      // Concept 1 — Aversion au risque et fonction d'utilité (officielle)
      [
        "A stock has an expected return of 4% with a standard deviation of returns of 6%. A bond has an expected return of 4% with a standard deviation of 7%. An investor who prefers to invest in the stock rather than the bond is best described as:",
        ["risk averse.", "risk neutral.", "risk seeking."],
        0,
        "À rendement attendu identique (4 %), préférer le titre dont l'écart-type est le plus faible (6 % pour l'action contre 7 % pour l'obligation) est la définition même de l'aversion au risque : avec U = E(R) − ½ × A × σ² et A > 0, à E(R) égal, le σ le plus faible donne l'utilité la plus haute. B est faux : un investisseur risk-neutral (A = 0) ne regarde que E(R) ; il serait indifférent entre les deux titres. C est faux : un risk-seeker (A < 0) préférerait l'obligation, plus volatile. Piège : la classe d'actif ne compte pas — ici, c'est l'action qui est le titre le moins risqué ; seul le σ compte.",
      ],
      // Variante angle différent — cas limite : l'actif sans risque (σ = 0) pour trois profils
      [
        "Three investors have risk aversion coefficients of A = 4, A = 0, and A = −2, and each uses the utility function U = E(R) − 0.5Aσ². They all evaluate a Treasury bill that offers a certain return of 3%. Which of the following statements is most accurate?",
        [
          "The investor with A = 4 assigns the T-bill the lowest utility, because she is the most risk averse.",
          "All three investors assign the T-bill the same utility, equal to 3%.",
          "The investor with A = −2 assigns the T-bill a utility above 3%, because a risk seeker gains utility from risk.",
        ],
        1,
        "Cas limite de la fonction d'utilité : un T-bill a un rendement certain, donc σ = 0 et le terme 0,5 × A × σ² vaut 0 quel que soit A. Pour les trois investisseurs, U = E(R) = 3 %. A est faux : l'aversion au risque pénalise le RISQUE, pas le rendement ; sans risque, il n'y a rien à pénaliser. C est faux pour la même raison : le « bonus » qu'un risk-seeker (A < 0) tire du risque, −0,5 × A × σ², n'existe que si σ > 0. C'est pourquoi l'actif sans risque est le point de départ commun de toutes les CAL, quel que soit le profil de l'investisseur.",
      ],
      // Variante plus difficile — classer trois portefeuilles par l'utilité + choix d'un investisseur risk-neutral
      [
        "An investor with a risk aversion coefficient of A = 4 uses the utility function U = E(R) − 0.5Aσ², with returns and standard deviations expressed in decimals. She must choose one of three portfolios: X (expected return 12%, standard deviation 25%), Y (expected return 9%, standard deviation 15%), and Z (expected return 4.5%, standard deviation 4%). Which portfolio does she prefer, and which portfolio would a risk-neutral investor prefer?",
        [
          "She prefers Z; a risk-neutral investor prefers X.",
          "She prefers Y; a risk-neutral investor prefers Z.",
          "She prefers Y; a risk-neutral investor prefers X.",
        ],
        2,
        "Étape 1 — utilité avec A = 4, soit U = E(R) − 2σ² : X = 0,12 − 2 × 0,0625 = −0,0050 ; Y = 0,09 − 2 × 0,0225 = 0,0450 ; Z = 0,045 − 2 × 0,0016 = 0,0418. Y l'emporte (4,50 % contre 4,18 % pour Z et −0,50 % pour X). Étape 2 — investisseur risk-neutral : A = 0, donc U = E(R) ; il choisit le rendement le plus élevé, X (12 %). A est le piège des erreurs de formule : oublier le ½ (U = E(R) − 4σ² : X = −0,13 ; Y = 0 ; Z = 0,0386) ou utiliser σ au lieu de σ² (X = −0,38 ; Y = −0,21 ; Z = −0,035) font tous deux gagner Z, le portefeuille le moins risqué. B confond risk-neutral et « minimum de risque » : un investisseur neutre ignore σ, il ne le minimise pas. Noter que Y n'est ni le plus rentable ni le moins risqué : l'optimum d'un investisseur averse au risque est un arbitrage.",
      ],

      // Concept 2 — Courbes d'indifférence : pente et aversion au risque (officielle)
      [
        "Smith has more steeply sloped risk-return indifference curves than Jones. Assuming these investors have the same expectations, which of the following best describes their risk preferences and the characteristics of their optimal portfolios? Smith is:",
        [
          "less risk averse than Jones and will choose an optimal portfolio with a lower expected return.",
          "more risk averse than Jones and will choose an optimal portfolio with a higher expected return.",
          "more risk averse than Jones and will choose an optimal portfolio with a lower expected return.",
        ],
        2,
        "Une courbe d'indifférence plus raide signifie que Smith exige un supplément de rendement plus important pour accepter une unité de risque en plus : il est donc plus averse au risque que Jones. Face aux mêmes opportunités (mêmes anticipations), il retient un portefeuille optimal moins risqué, donc à rendement attendu plus faible. A est faux : des courbes plus raides traduisent plus d'aversion, pas moins. B est faux : plus d'aversion au risque mène à moins de risque et donc à un rendement attendu plus BAS — on ne peut pas réduire le risque et augmenter le rendement en même temps le long de la frontière efficiente. Ce qui distingue les deux investisseurs, c'est la pente de leurs courbes.",
      ],
      // Variante angle différent — cas limite : la forme des courbes d'un investisseur risk-neutral
      [
        "On a graph with standard deviation on the horizontal axis and expected return on the vertical axis, the indifference curves of a risk-neutral investor are best described as:",
        [
          "upward-sloping and convex, but flatter than those of a risk-averse investor.",
          "horizontal straight lines.",
          "downward-sloping curves.",
        ],
        1,
        "Cas limite de la règle « pente = aversion au risque ». Pour un investisseur risk-neutral, A = 0 et U = E(R) : son utilité ne dépend que du rendement attendu. Tous les portefeuilles de même E(R) lui sont indifférents, quel que soit σ : chaque courbe d'indifférence est une droite horizontale (pente nulle). A décrit un investisseur peu averse au risque mais toujours averse (A > 0, petit) : il exige encore un peu de rendement en plus pour chaque unité de risque. C décrit un risk-seeker (A < 0) : prêt à renoncer à du rendement pour avoir plus de risque, il a des courbes décroissantes. La pente passe donc de positive (averse) à nulle (neutre) puis négative (seeker).",
      ],
      // Variante plus difficile — courbe inaccessible / tangente / sécante, puis hausse de l'aversion au risque
      [
        "In the Markowitz framework (no risk-free asset), an investor's indifference curve I1 lies entirely above the efficient frontier, I2 is tangent to the frontier at Portfolio T, and I3 crosses the frontier at two points. If the investor later becomes more risk averse while his expectations stay the same, which of the following statements is most accurate?",
        [
          "Portfolio T remains his optimal portfolio, because the efficient frontier itself has not changed.",
          "He should move to the lower-risk point where I3 crosses the frontier, because that portfolio is attainable and less risky than T.",
          "His new optimal portfolio lies on the efficient frontier below and to the left of T, at the point of tangency with one of his new, steeper indifference curves.",
        ],
        2,
        "Deux étapes. (1) Situation initiale : I1 donnerait la plus grande utilité mais aucun portefeuille ne l'atteint (inaccessible) ; I3 est accessible mais offre une utilité plus faible que I2 ; l'optimum est donc T, point de tangence entre la frontière et la courbe la plus haute accessible. (2) Hausse de l'aversion au risque : la frontière ne bouge pas (elle ne dépend que des anticipations), mais les courbes d'indifférence deviennent plus raides ; le nouveau point de tangence glisse le long de la frontière vers le bas et la gauche (moins de σ, moins de E(R)). A oublie que le point optimal dépend aussi des préférences, pas seulement de la frontière. B mélange deux cartes de préférences : I3 appartient à l'ancienne carte, et un point où une courbe COUPE la frontière n'est jamais optimal (une courbe plus haute reste accessible entre les deux intersections) ; le nouvel optimum est un point de TANGENCE avec une nouvelle courbe, plus raide.",
      ],

      // Concept 3 — CAL et théorème de séparation en deux fonds (officielle)
      [
        "A line that represents the possible portfolios that combine a risky asset and a risk free asset is most accurately described as a:",
        ["capital allocation line.", "capital market line.", "characteristic line."],
        0,
        "La droite qui représente toutes les combinaisons d'un actif (ou portefeuille) risqué et de l'actif sans risque est une capital allocation line (CAL) : E(Rp) = w × E(R risqué) + (1 − w) × Rf et σp = w × σ risqué. B est trop étroit : la capital market line (CML) est le cas particulier où le portefeuille risqué est le portefeuille de MARCHÉ (sous l'hypothèse d'anticipations homogènes) ; toute CML est une CAL, mais pas l'inverse. C est faux : la characteristic line est la droite de régression des rendements excédentaires d'un titre sur ceux du marché ; sa pente estime le bêta.",
      ],
      // Variante angle différent — calcul inversé sur la CAL : du rendement visé au risque
      [
        "An investor allocates her wealth between a risk-free asset yielding 3% and an optimal risky portfolio with an expected return of 11% and a standard deviation of 20%. To achieve an expected return of 9%, the standard deviation of her complete portfolio must be closest to:",
        ["5.0%.", "15.0%.", "16.4%."],
        1,
        "Calcul inversé : on part du rendement visé pour retrouver le poids, puis le risque. (1) Sur la CAL, E(Rp) = Rf + w × [E(R risqué) − Rf] : 9 % = 3 % + w × 8 %, donc w = 6 / 8 = 0,75 dans le portefeuille risqué (25 % dans l'actif sans risque). (2) L'actif sans risque a un σ nul et une corrélation nulle avec le portefeuille risqué, donc σp = w × σ risqué = 0,75 × 20 % = 15,0 %. C (16,4 %) ignore le rendement de l'actif sans risque : w = 9 / 11 = 0,818, puis 0,818 × 20 %. A (5,0 %) inverse les poids : il applique les 25 % placés sans risque au σ du portefeuille risqué.",
      ],
      // Variante plus difficile — deux investisseurs sur la même CAL (prêteur / emprunteur) + séparation en deux fonds
      [
        "Two investors with identical expectations face the same capital allocation line, built from a risk-free rate of 4% and an optimal risky portfolio P with an expected return of 12% and a standard deviation of 16%. Investor 1 puts 60% of her wealth in P and the rest in the risk-free asset. Investor 2 borrows at the risk-free rate to invest 150% of his wealth in P. Which of the following statements is most accurate?",
        [
          "Investor 1's portfolio has an expected return of 8.8% and a standard deviation of 9.6%; both investors hold the same risky portfolio and earn the same expected excess return per unit of risk.",
          "Investor 2's portfolio has an expected return of 18% and a standard deviation of 24%, so it offers a higher expected excess return per unit of risk than Investor 1's portfolio.",
          "Investor 1 is more risk averse, so her risky holdings should be tilted toward the global minimum-variance portfolio rather than invested in portfolio P.",
        ],
        0,
        "(1) Investisseur 1 : E = 0,6 × 12 % + 0,4 × 4 % = 8,8 % ; σ = 0,6 × 16 % = 9,6 %. (2) Investisseur 2 : poids de −50 % dans l'actif sans risque (emprunt), E = 1,5 × 12 % − 0,5 × 4 % = 16 % ; σ = 1,5 × 16 % = 24 %. (3) Rendement excédentaire par unité de risque (pente de la CAL) : (8,8 − 4) / 9,6 = 0,50 et (16 − 4) / 24 = 0,50, comme pour P, (12 − 4) / 16 = 0,50 — normal, ils sont sur la même droite. B oublie le coût de l'emprunt (1,5 × 12 % = 18 % au lieu de 16 %) et en tire à tort une meilleure rémunération du risque. C contredit le théorème de séparation en deux fonds : tous les investisseurs détiennent le MÊME portefeuille risqué optimal (le point de tangence) ; l'aversion au risque ne change que le dosage entre P et l'actif sans risque, pas la composition de la partie risquée.",
      ],

      // Concept 4 — Covariance et corrélation (officielle)
      [
        "An analyst gathers the following data about the returns for two stocks. Stock A: E(R) = 0.04, σ² = 0.0025. Stock B: E(R) = 0.09, σ² = 0.0064. CovA,B = 0.001. The correlation between the returns of Stock A and Stock B is closest to:",
        ["0.25.", "0.50.", "0.63."],
        0,
        "ρA,B = CovA,B / (σA × σB). Les données sont des VARIANCES : il faut d'abord en prendre la racine, σA = √0,0025 = 0,05 et σB = √0,0064 = 0,08. D'où ρ = 0,001 / (0,05 × 0,08) = 0,001 / 0,004 = 0,25. Diviser par le produit des variances donnerait 0,001 / 0,000016 = 62,5, valeur impossible puisqu'une corrélation est bornée entre −1 et +1. B (0,50) correspond à une racine prise une fois de trop (√0,25) ; C (0,63) au simple rapport σA / σB = 0,05 / 0,08, qui ignore la covariance. Les rendements attendus (0,04 et 0,09) sont inutiles ici.",
      ],
      // Variante angle différent — comparer deux paires : covariance élevée ne veut pas dire relation forte
      [
        "Pair 1 consists of two stocks with standard deviations of 20% and 25% and a covariance of returns of 0.0040. Pair 2 consists of two stocks with standard deviations of 5% and 6% and a covariance of returns of 0.0020. Which of the following statements is most accurate?",
        [
          "Pair 1 has the stronger linear relationship, because its covariance is twice as large.",
          "The two pairs cannot be compared, because covariance is expressed in squared return units.",
          "Pair 2 has the stronger linear relationship, with a correlation of about 0.67 versus 0.08 for Pair 1.",
        ],
        2,
        "La covariance indique le sens du co-mouvement, mais sa taille dépend aussi de la volatilité des titres : seule, elle ne mesure pas la FORCE de la relation. Il faut la standardiser : Paire 1, ρ = 0,0040 / (0,20 × 0,25) = 0,0040 / 0,05 = 0,08 ; Paire 2, ρ = 0,0020 / (0,05 × 0,06) = 0,0020 / 0,003 ≈ 0,67. La paire à la plus petite covariance est de loin la plus corrélée. A tombe dans le piège : la covariance de la Paire 1 est grande parce que ses titres sont très volatils, pas parce qu'ils évoluent ensemble. B part d'un constat juste (la covariance s'exprime en unités de rendement au carré) mais en tire une mauvaise conclusion : on compare justement via la corrélation, sans unité et bornée entre −1 et +1.",
      ],
      // Variante plus difficile — corrélation à partir de données historiques (moyennes, écarts, n − 1)
      [
        "Over four years, Stock X returned 10%, 2%, 6%, and −2%, while Stock Y returned 8%, 2%, 4%, and 2% in the same years. Using sample statistics, the correlation between the returns of X and Y is closest to:",
        ["0.68.", "0.91.", "1.22."],
        1,
        "(1) Moyennes : X = (10 + 2 + 6 − 2) / 4 = 4 % ; Y = (8 + 2 + 4 + 2) / 4 = 4 %. (2) Écarts à la moyenne : X = 6, −2, 2, −6 ; Y = 4, −2, 0, −2. (3) Somme des produits croisés = 24 + 4 + 0 + 12 = 40, d'où une covariance d'échantillon de 40 / (4 − 1) = 13,33 (%²). (4) Variances d'échantillon : X = (36 + 4 + 4 + 36) / 3 = 26,67, soit σX = 5,16 % ; Y = (16 + 4 + 0 + 4) / 3 = 8, soit σY = 2,83 %. (5) ρ = 13,33 / (5,16 × 2,83) ≈ 0,91. A (0,68) mélange les conventions : covariance divisée par n = 4 (soit 10) avec des écarts-types d'échantillon : 10 / 14,61. C (1,22) fait l'inverse : covariance d'échantillon (13,33) avec des écarts-types de population (divisés par 4 : 4,47 % et 2,45 %) ; le résultat dépasse 1, ce qui est impossible pour une corrélation. Astuce : tant que la même convention est utilisée partout, le diviseur s'annule — ρ = 40 / √(80 × 24) ≈ 0,91.",
      ],

      // Concept 5 — Écart-type d'un portefeuille de deux actifs (officielle)
      [
        "Assets A (with a variance of 0.25) and B (with a variance of 0.40) are perfectly positively correlated. If an investor creates a portfolio using only these two assets with 40% invested in A, the portfolio standard deviation is closest to:",
        ["0.3400.", "0.3742.", "0.5795."],
        2,
        "Avec une corrélation de +1, il n'y a aucun bénéfice de diversification : l'écart-type du portefeuille est la moyenne pondérée des écarts-types. Les données sont des variances, il faut d'abord les convertir : σA = √0,25 = 0,50 et σB = √0,40 = 0,6325. σp = 0,4 × 0,50 + 0,6 × 0,6325 = 0,20 + 0,3795 = 0,5795 (même résultat avec la formule complète : [0,16 × 0,25 + 0,36 × 0,40 + 2 × 0,4 × 0,6 × 1 × 0,50 × 0,6325]^0,5). A (0,34) est la moyenne pondérée des VARIANCES (0,4 × 0,25 + 0,6 × 0,40), pas des écarts-types. B (0,3742) est inférieur à la moyenne pondérée des σ : impossible avec ρ = +1, cas où le risque est maximal pour des poids donnés.",
      ],
      // Variante angle différent — calcul inversé : retrouver la corrélation à partir du σ du portefeuille
      [
        "A portfolio is invested 50% in Asset X (standard deviation 20%) and 50% in Asset Y (standard deviation 30%). If the portfolio's standard deviation is 20%, the correlation between the returns of X and Y is closest to:",
        ["0.25.", "0.50.", "−0.83."],
        0,
        "Calcul inversé : on connaît σp, on cherche ρ. σp² = w²σX² + w²σY² + 2w²ρσXσY : 0,04 = 0,25 × 0,04 + 0,25 × 0,09 + 2 × 0,25 × ρ × 0,20 × 0,30 = 0,0100 + 0,0225 + 0,03ρ, donc 0,03ρ = 0,0075 et ρ = 0,25. Contrôle intuitif : la moyenne pondérée des σ vaut 25 % ; un σp de 20 %, inférieur, implique ρ < +1 (bénéfice de diversification), sans exiger une corrélation négative. B (0,50) oublie le facteur 2 du terme croisé (0,015ρ = 0,0075). C (−0,83) oublie d'élever les poids au carré dans les deux premiers termes (0,04 = 0,5 × 0,04 + 0,5 × 0,09 + 0,03ρ).",
      ],
      // Variante plus difficile — risque total avec données-pièges (bêtas, σ du marché) et corrélation intermédiaire
      [
        "A portfolio is invested 50% in a stock fund and 50% in a bond fund. The stock fund has a standard deviation of 20% and a beta of 1.1; the bond fund has a standard deviation of 8% and a beta of 0.2. The correlation between the two funds' returns is 0.2, and the market's standard deviation is 16%. The portfolio's standard deviation is closest to:",
        ["10.4%.", "11.5%.", "14.0%."],
        1,
        "(1) Les bêtas et le σ du marché sont des données-pièges : le risque total d'un portefeuille de deux actifs se calcule avec les σ, les poids et la corrélation. (2) Covariance = 0,2 × 0,20 × 0,08 = 0,0032. (3) σp² = 0,25 × 0,04 + 0,25 × 0,0064 + 2 × 0,5 × 0,5 × 0,0032 = 0,0100 + 0,0016 + 0,0016 = 0,0132, d'où σp = √0,0132 ≈ 11,5 %. A (10,4 %) multiplie le bêta du portefeuille (0,5 × 1,1 + 0,5 × 0,2 = 0,65) par le σ du marché : cela ne mesure que la part systématique du risque, pas le risque total. C (14,0 %) est la moyenne pondérée des σ (0,5 × 20 % + 0,5 × 8 %), valable seulement si ρ = +1 ; avec ρ = 0,2, la diversification abaisse le risque. Oublier le terme de covariance donnerait √0,0116 ≈ 10,8 %.",
      ],

      // Concept 6 — Corrélation et diversification (officielle)
      [
        "Which one of the following statements about correlation is NOT correct?",
        [
          "Potential benefits from diversification arise when correlation is less than +1.",
          "If the correlation coefficient were 0, a zero variance portfolio could be constructed.",
          "If the correlation coefficient were -1, a zero variance portfolio could be constructed.",
        ],
        1,
        "Une corrélation nulle signifie l'absence de relation LINÉAIRE entre les rendements : le terme de covariance disparaît, mais les deux termes de variance pondérée restent positifs, donc la variance du portefeuille ne peut pas tomber à zéro. L'affirmation B est donc fausse. A est vraie : dès que ρ < +1, le σ du portefeuille est inférieur à la moyenne pondérée des σ. C est vraie : avec ρ = −1, on peut choisir des poids qui annulent totalement le risque (w1 = σ2 / (σ1 + σ2)).",
      ],
      // Variante angle différent — passer de 2 à N actifs : vers quoi tend la variance
      [
        "For an equally weighted portfolio of N risky assets, as N becomes very large, the portfolio's variance approaches:",
        [
          "zero, because diversification eventually eliminates all risk.",
          "the average variance of the individual assets.",
          "the average covariance between the assets.",
        ],
        2,
        "Passage de 2 à N actifs. Pour un portefeuille équipondéré, σp² = (variance moyenne) / N + [(N − 1) / N] × (covariance moyenne). Quand N augmente, le premier terme tend vers 0 (la contribution des variances individuelles s'efface), tandis que le coefficient du second tend vers 1 : la variance converge vers la covariance moyenne, qui finit par dominer. A est faux : la covariance moyenne (le risque commun, systématique) ne se diversifie pas ; elle ne serait nulle que si les actifs étaient en moyenne non corrélés. B inverse les rôles : c'est justement la contribution des variances individuelles qui disparaît.",
      ],
      // Variante plus difficile — hausse des corrélations en crise sur un portefeuille de 30 titres
      [
        "An equally weighted portfolio holds 30 stocks, each with a standard deviation of returns of 30%. During a market crisis, the average correlation between the stocks rises from 0.2 to 0.6, while individual standard deviations are unchanged. The portfolio's standard deviation most likely:",
        [
          "rises from about 14.3% to about 23.5%.",
          "rises from about 14.3% to about 42.8%.",
          "rises from about 6.0% to about 18.0%.",
        ],
        0,
        "(1) Covariance moyenne = ρ × σ² : 0,2 × 0,09 = 0,018 avant, 0,6 × 0,09 = 0,054 pendant la crise. (2) σp² = σ² / N + [(N − 1) / N] × covariance moyenne. Avant : 0,09 / 30 + (29 / 30) × 0,018 = 0,0030 + 0,0174 = 0,0204, soit σp ≈ 14,3 %. Pendant : 0,0030 + (29 / 30) × 0,054 = 0,0030 + 0,0522 = 0,0552, soit σp ≈ 23,5 %. Le bénéfice de diversification fond justement quand on en a le plus besoin. B multiplie σp par 3, comme ρ, alors que c'est la variance (pas l'écart-type) qui suit à peu près la covariance : l'écart-type n'est multiplié que par environ √(0,0552 / 0,0204) ≈ 1,6. C prend ρ × σ (0,2 × 30 % puis 0,6 × 30 %) au lieu de passer par la variance, et oublie la part résiduelle de risque individuel σ² / N.",
      ],

      // Concept 7 — Frontière efficiente, minimum-variance frontier et GMV (officielle)
      [
        "Of the six attainable portfolios listed, which portfolios are not on the efficient frontier? Portfolio A: expected return 26%, standard deviation 28%. Portfolio B: expected return 23%, standard deviation 34%. Portfolio C: expected return 14%, standard deviation 23%. Portfolio D: expected return 18%, standard deviation 14%. Portfolio E: expected return 11%, standard deviation 8%. Portfolio F: expected return 18%, standard deviation 16%.",
        ["A, B, and C.", "B, C, and F.", "C, D, and E."],
        1,
        "Un portefeuille n'est pas efficient s'il est dominé, c'est-à-dire s'il existe un autre portefeuille offrant au moins autant de rendement pour moins de risque (ou plus de rendement pour un risque au plus égal). B est dominé par A (23 % < 26 % de rendement pour 34 % > 28 % de risque). C est dominé par D (14 % < 18 % pour 23 % > 14 %). F est dominé par D (même rendement de 18 %, mais 16 % de risque contre 14 %). E, D et A ne sont dominés par aucun autre : E est le moins risqué, A le plus rentable. Les choix A et C citent chacun au moins un portefeuille efficient (A, D ou E).",
      ],
      // Variante angle différent — cas limite : un portefeuille sur la MVF mais sous le GMV
      [
        "Portfolio K lies on the minimum-variance frontier of risky assets, below the global minimum-variance portfolio. Which of the following statements about Portfolio K is most accurate?",
        [
          "It is efficient, because no other portfolio with the same expected return has a lower standard deviation.",
          "It is inefficient, because another portfolio on the frontier with the same standard deviation offers a higher expected return.",
          "It could be optimal for a highly risk-averse investor, because it lies on the minimum-variance frontier.",
        ],
        1,
        "Trois objets à distinguer : la minimum-variance frontier (MVF) réunit, pour chaque niveau de E(R), le portefeuille de σ minimal ; le global minimum-variance portfolio (GMV) est son point le plus à gauche ; la frontière efficiente n'est que la partie SUPÉRIEURE de la MVF, au-dessus du GMV. K est bien de variance minimale pour son rendement (le début de A est vrai), mais ce n'est pas le critère d'efficience : sur la branche haute, un portefeuille de même σ offre un rendement supérieur, donc K est dominé. C est faux : même très averse au risque, un investisseur rationnel ne descend jamais sous le GMV — le GMV lui-même offre à la fois moins de risque et plus de rendement que K.",
      ],
      // Variante plus difficile — repérer le portefeuille dominé puis choisir le portefeuille risqué de la meilleure CAL
      [
        "An analyst has identified four portfolios of risky assets: P (expected return 6%, standard deviation 8%), Q (expected return 9%, standard deviation 12%), R (expected return 12%, standard deviation 20%), and S (expected return 8%, standard deviation 14%). The risk-free rate is 3%. Which portfolio is inefficient, and which portfolio should be combined with the risk-free asset to form the best capital allocation line?",
        [
          "P is inefficient, because it has the lowest expected return; Q forms the best CAL.",
          "S is inefficient; R forms the best CAL, because it has the highest expected return.",
          "S is inefficient; Q forms the best CAL.",
        ],
        2,
        "(1) Efficience : S est dominé par Q (8 % < 9 % de rendement pour 14 % > 12 % de risque). P n'est dominé par aucun autre : c'est le moins risqué, et un rendement faible ne suffit pas à rendre un portefeuille inefficient — A tombe dans ce piège. (2) Meilleure CAL : celle de pente maximale, (E(R) − Rf) / σ. P : (6 − 3) / 8 = 0,375 ; Q : (9 − 3) / 12 = 0,50 ; R : (12 − 3) / 20 = 0,45. Q offre la CAL la plus pentue : c'est le portefeuille risqué optimal, et même un investisseur offensif a intérêt à combiner Q avec l'actif sans risque (en empruntant au besoin) plutôt que de détenir R. B confond le portefeuille le plus rentable avec le portefeuille risqué optimal. Rappel : le taux sans risque n'intervient pas pour tracer la frontière efficiente, seulement pour la CAL.",
      ],

      // Concept 8 — Classes d'actifs : données historiques et liquidité (officielle)
      [
        "Over long periods of time, compared to fixed income securities, equities have tended to exhibit:",
        [
          "higher average annual returns and higher standard deviation of returns.",
          "higher average annual returns and lower standard deviation of returns.",
          "lower average annual returns and higher standard deviation of returns.",
        ],
        0,
        "Sur longue période (données américaines 1926-2017, résultats similaires sur les autres marchés), les actions ont offert des rendements annuels moyens plus élevés que les obligations, avec une volatilité plus élevée : c'est l'arbitrage risque-rendement. Parmi les grandes classes, les small caps ont le rendement et le σ les plus élevés, les T-bills les plus faibles. B est faux : un rendement supérieur avec moins de risque contredirait cet arbitrage. C est faux : les actions ont été plus rentables, pas moins.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : réel vs nominal, small caps, distributions
      [
        "Which of the following statements about the historical returns of major asset classes is least accurate?",
        [
          "Because inflation varied widely from year to year, real returns have been more volatile than nominal returns.",
          "Small-capitalization stocks have had both the highest average returns and the highest standard deviation of returns.",
          "Return distributions have been negatively skewed, with fatter tails than a normal distribution.",
        ],
        0,
        "On cherche l'affirmation FAUSSE. A inverse la conclusion : c'est justement parce que l'inflation a beaucoup fluctué d'une année à l'autre que les rendements RÉELS ont été bien plus stables que les rendements nominaux, qui intègrent ces variations d'inflation. B est vrai : sur les données américaines 1926-2017, les small caps sont en tête en rendement comme en risque, les T-bills en queue. C est vrai : les distributions de rendements ne sont pas normales — skewness négative (grandes baisses plus fréquentes) et excès de kurtosis (queues épaisses) —, ce qui limite une analyse fondée sur la seule moyenne et la seule variance.",
      ],
      // Variante plus difficile — liquidité : spread, prix et rendement attendu, avec une commission-piège
      [
        "An investor compares two corporate bonds with identical credit quality, coupon, and maturity. Bond L trades infrequently in an emerging market, while Bond H trades actively in a developed market. Her broker charges the same negotiated commission on both trades. Compared with Bond H, Bond L is most likely to have:",
        [
          "a wider bid-ask spread, but the same price and expected return, because illiquidity affects only trading costs.",
          "the same bid-ask spread, price, and expected return, because the commission paid on both trades is identical.",
          "a wider bid-ask spread and a lower price, and therefore a higher expected return.",
        ],
        2,
        "Trois canaux à distinguer. (1) Le bid-ask spread : un titre peu échangé est plus difficile à revendre, les teneurs de marché exigent un écart plus large. (2) Le prix : les investisseurs réclament une compensation pour cette illiquidité ; ils paient donc Bond L moins cher, ce qui relève son rendement attendu (prime de liquidité). (3) La commission de courtage : elle se négocie directement avec le broker et ne dépend pas de la liquidité du titre — l'énoncé la fixe d'ailleurs identique, c'est une donnée-piège. A reconnaît l'effet sur le spread mais oublie que la liquidité affecte aussi le PRIX, donc le rendement attendu. B réduit le coût de l'illiquidité à la seule commission. La liquidité est une caractéristique à part entière des classes d'actifs, cruciale sur les marchés émergents et pour les titres peu échangés comme les obligations de faible qualité.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Portfolio Management Page 1...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
