// Seed script — quiz de "drill" associé à la page 1 de la fiche PDF Portfolio
// Management (Portfolio Risk and Return: Part I). Structure : 5 concepts clés
// de la page, chacun en 3 questions : 1 question officielle
// (banque de pratique CFA, "Reading 20 Portfolio Risk and Return Part I",
// corrigé vérifié contre "- Answers.pdf", recopiée à l'identique) + 1 variante
// "angle différent" (même notion, jamais un simple changement de chiffres
// menant au même raisonnement) + 1 variante "plus difficile" (raisonnement à
// plusieurs étapes / pièges combinés / donnée-piège / notion connexe de la
// page). Voir memory regle-drill-variantes-cfa-hub. Questions en anglais,
// explications en français. Remis au cadre le 3 octobre 2026 (l'ancienne
// version, en français, ne suivait pas ce modèle).
// Ramené à 5 concepts (15 questions) le 5 octobre 2026, à la demande de
// l'utilisateur : concepts d'origine 2, 4, 8 retirés de la fiche, leurs
// questions rangées dans « Réserve — <titre> » (syncQuizSets, rien d'effacé).
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

      // Concept 2 — CAL et théorème de séparation en deux fonds (officielle)
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

      // Concept 3 — Écart-type d'un portefeuille de deux actifs (officielle)
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

      // Concept 4 — Corrélation et diversification (officielle)
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

      // Concept 5 — Frontière efficiente, minimum-variance frontier et GMV (officielle)
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
