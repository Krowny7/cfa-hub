// Seed script — quiz de "drill" associé à la page 2 de la fiche PDF Derivatives
// (Option Payoffs · Benefits, Risks & Uses, Readings 67 (options) et 68 de la
// fiche, soit les Readings 69 et 70 de la banque de pratique : décalage de +2).
// Structure : pour chacun des 5 concepts clés de la page, 1 question officielle
// (banque de pratique Derivatives, corrigé vérifié contre "- Answers.pdf") +
// 1 variante "angle différent" (même notion, mais jamais un simple changement
// de chiffres menant au même raisonnement) + 1 variante "plus difficile"
// (raisonnement à plusieurs étapes / pièges combinés / notion connexe de la
// page). Voir memory regle-drill-variantes-cfa-hub. Questions en anglais,
// explications en français.
// Les 5 questions officielles ne sont PAS celles imprimées dans le PDF
// (R69 Q7, Q10 et Q15, R70 Q2 et Q6) : l'utilisateur les a déjà sur papier.
// Usage: node scripts/seed-derivatives-drill-page2.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Derivatives (Système)";

const QUIZ_SETS = [
  {
    title: "Derivatives — Drill Fiche Page 2 (Option Payoffs · Benefits, Risks & Uses)",
    difficulty: 1,
    questions: [
      // Concept 1 — Call et put : droit d'acheter, droit de vendre (officielle — R69 Q5)
      [
        "An agreement that gives the holder the right, but not the obligation, to sell an asset at a specified price on a specific future date is a:",
        ["call option.", "put option.", "swap."],
        1,
        "Le put donne à son détenteur le droit, sans obligation, de vendre l'underlying au prix d'exercice. B est donc correct. A est faux : le call donne le droit d'acheter. C est faux : un swap est un forward commitment, obligatoire pour les deux parties ; ce n'est pas un droit.",
      ],
      // Variante angle différent — exposition à l'underlying des quatre positions (long call et short put = long)
      [
        "Which of the following pairs of option positions both give the investor long exposure to the underlying asset?",
        ["Long call and long put.", "Long call and short put.", "Short call and long put."],
        1,
        "Le long call gagne quand le cours monte (droit d'acheter à X) ; le short put aussi : le writer garde la premium si le cours reste au-dessus de X et perd s'il chute. Les deux positions sont donc longues sur l'underlying : B est correct. A est faux : le long put gagne quand le cours baisse, c'est une exposition short. C est faux : short call et long put sont les deux positions courtes, qui gagnent à la baisse. Moyen mnémotechnique : acheter le droit d'acheter ou s'obliger à acheter = long ; acheter le droit de vendre ou s'obliger à vendre = short.",
      ],
      // Variante plus difficile — profil complet d'un short call (gain max, perte max, breakeven, exposition), pièges croisés avec le put
      [
        "An investor writes a call option with an exercise price of $60 and receives a premium of $5. Which of the following statements about her position is most accurate?",
        [
          "Her maximum loss is $55, and she has long exposure to the underlying.",
          "Her maximum gain is unlimited, and she breaks even at a stock price of $55 at expiration.",
          "Her maximum gain is $5, and she breaks even at a stock price of $65 at expiration.",
        ],
        2,
        "Le writer d'un call encaisse la premium (5 $) et s'oblige à vendre à 60 $ si le call est exercé. Gain maximal = premium = 5 $ (si le cours finit à 60 $ ou moins). Breakeven = X + c0 = 65 $ : au-delà, le payoff négatif −(S_T − 60) dépasse la premium. Perte maximale : illimitée, car le cours peut monter sans limite. C est donc correct. A est faux : une perte maximale de 55 $ (X − premium) est celle du writer d'un put, et le short call est une exposition short (il perd à la hausse). B est faux : un gain illimité est le profil du long call, et 55 $ (X − premium) serait le breakeven d'un put, pas d'un call.",
      ],

      // Concept 2 — Profit du writer d'un put (officielle — R69 Q13)
      [
        "Al Steadman receives a premium of $3.80 for writing a put option with an exercise price of $64. If the stock price at expiration is $84, Steadman's profit or loss from the options position is:",
        ["$3.80.", "$16.20.", "$23.80."],
        0,
        "À 84 $, le put (X = 64 $) est hors de la monnaie : max(0 ; 64 − 84) = 0, il n'est pas exercé. Le writer garde toute la prime : profit = +3,80 $, qui est son gain maximal. A est donc correct. B est faux : 16,20 $ = 20 − 3,80 traite le put comme un call. C est faux : 23,80 $ = 20 + 3,80 ajoute l'écart de cours, alors que le writer d'un put ne gagne jamais plus que la prime.",
      ],
      // Variante angle différent — calcul inversé : retrouver la premium à partir de la perte nette
      [
        "A trader wrote a put option with an exercise price of $55. At expiration, the stock price is $49 and her net loss on the position, including the premium, is $2.40. The premium she received was closest to:",
        ["$2.40.", "$3.60.", "$8.40."],
        1,
        "Profit du writer d'un put = premium − max(0 ; X − S_T). Ici, le put est dans la monnaie : payoff pour le writer = −(55 − 49) = −6 $. Perte nette de 2,40 $ : −6 + p0 = −2,40, donc p0 = 3,60 $. B est donc correct. A est faux : 2,40 $ est la perte nette, pas la premium. C est faux : 8,40 $ = 6 + 2,40 ajoute la perte au payoff au lieu de la retrancher ; avec une premium de 8,40 $, le writer aurait gagné 2,40 $. Vérification : breakeven du writer = X − p0 = 55 − 3,60 = 51,40 $, et 49 $ est en dessous, d'où une perte.",
      ],
      // Variante plus difficile — position combinée short put + long call (deux premiums, donnée-piège du cours actuel)
      [
        "A trader writes a put option with an exercise price of $64 for a premium of $3.80 and buys a call option with an exercise price of $70 for a premium of $1.50, both on the same stock and with the same expiration date. The stock currently trades at $66. If the stock price at expiration is $58, the trader's total profit per share is closest to:",
        ["-$2.20.", "+$2.30.", "-$3.70."],
        2,
        "Short put (X = 64) : à 58 $, le put est exercé contre le trader, payoff −(64 − 58) = −6 $, plus la premium encaissée de 3,80 $, soit −2,20 $. Long call (X = 70) : à 58 $, il expire sans valeur, d'où la perte de la premium payée, −1,50 $. Total : −2,20 − 1,50 = −3,70 $ par action. C est donc correct. A est faux : −2,20 $ oublie la premium du call, perdue même si on n'exerce pas. B est faux : +2,30 $ = 3,80 − 1,50 évalue les options au cours actuel de 66 $ (où aucune n'est exercée) au lieu du cours à l'échéance ; le cours de 66 $ est une donnée-piège. Short put et long call donnent tous deux une exposition longue : la position perd à la baisse.",
      ],

      // Concept 3 — Benefits : information discovery (volatilité implicite) (officielle — R70 Q3)
      [
        "In the context of determining option prices, which factor is not directly observable?",
        ["Volatility of the underlying.", "Exercise price.", "Risk-free rate."],
        0,
        "Le prix d'exercice, le taux sans risque, le cours de l'underlying et la durée sont observables ; la volatilité future ne l'est pas. On l'estime à partir des prix d'options cotés : c'est la volatilité implicite, exemple d'information discovery apportée par les dérivés. A est donc correct. B est faux : le prix d'exercice est fixé dans le contrat. C est faux : le taux sans risque se lit sur le marché.",
      ],
      // Variante angle différent — ce qui N'EST PAS de l'information discovery (avantage opérationnel)
      [
        "Which of the following is least likely an example of the information discovery benefit of derivatives?",
        [
          "Option prices reveal the volatility the market expects for the underlying.",
          "Interest rate futures prices indicate how many central bank rate changes the market anticipates.",
          "Short positions are easier and cheaper to establish with futures than in the cash market.",
        ],
        2,
        "L'information discovery, c'est ce que les prix des dérivés révèlent des anticipations du marché : la volatilité implicite tirée des prix d'options (A) et le nombre de changements de taux directeurs anticipés tiré des futures de taux (B). C n'en est pas un exemple : la facilité à vendre à découvert, avec des coûts de transaction bas, relève des avantages opérationnels (operational advantages), aux côtés du levier et de la liquidité. C est donc la réponse. A et B sont de vrais exemples d'information discovery.",
      ],
      // Variante plus difficile — lire deux signaux de marché à la fois (volatilité implicite sans direction, futures de taux)
      [
        "Over one day, the level of an equity index and interest rates are unchanged, but the prices of both calls and puts on the index rise sharply. Short-term interest rate futures imply a policy rate six months from now that is 50 basis points below the current rate. Which conclusion is most appropriate?",
        [
          "Market participants expect the index to fall and anticipate about two 25 bp increases in the policy rate.",
          "Market participants expect higher volatility of the index and anticipate about two 25 bp cuts in the policy rate.",
          "The options are now overpriced, so writing them while buying the index is a riskless arbitrage.",
        ],
        1,
        "Le niveau de l'indice et les taux sont inchangés : si calls et puts renchérissent ensemble, c'est que l'input non observable, la volatilité, a monté. La volatilité implicite révèle que le marché attend des variations plus fortes, sans indiquer de direction. Les futures de taux impliquent un taux directeur inférieur de 50 pb dans six mois, soit environ deux baisses de 25 pb. B est donc correct. A est faux deux fois : à niveau d'indice et taux inchangés, la direction anticipée ne modifie pas le prix de non-arbitrage des options, et seule une volatilité implicite plus forte explique la hausse simultanée des calls et des puts ; de plus, un taux implicite plus bas annonce des baisses de taux, pas des hausses. C est faux : une volatilité implicite plus élevée n'est pas un mispricing, et vendre les options en achetant l'indice laisse un risque (une forte baisse de l'indice fait perdre sur l'indice et sur les puts vendus) : ce n'est pas un arbitrage.",
      ],

      // Concept 4 — Hedge accounting : net investment hedge, cash flow hedge, fair value hedge (officielle — R70 Q4)
      [
        "Hedge accounting with a net investment hedge most likely refers to a company that is using derivatives to reduce the volatility of:",
        ["the value of a foreign subsidiary.", "its net working capital.", "a balance sheet liability."],
        0,
        "Le net investment hedge couvre, avec des forwards ou des futures de change, la valeur (en monnaie domestique) de l'equity d'une filiale étrangère. A est donc correct. C est faux : couvrir la valeur d'un passif au bilan, par exemple une dette à taux fixe, relève du fair value hedge. B est faux : le besoin en fonds de roulement n'est l'objet d'aucun des trois types de hedge accounting.",
      ],
      // Variante angle différent — un autre cas de la catégorie avec le « pourquoi » : dette flottante swappée en fixe
      [
        "A company with floating-rate debt enters an interest rate swap in which it pays fixed and receives floating. Under hedge accounting, this is best described as:",
        [
          "a fair value hedge, because the swap stabilizes the market value of the debt.",
          "a cash flow hedge, because the swap locks in the company's future interest payments.",
          "a net investment hedge, because the swap converts the debt into a fixed-rate investment.",
        ],
        1,
        "Pour une dette à taux flottant, ce sont les flux (les intérêts futurs) qui varient avec les taux ; sa valeur reste proche du pair. Le swap payeur fixe transforme ces flux variables en flux fixes : c'est un cash flow hedge. B est donc correct. A est faux : la valeur d'une dette flottante est déjà stable ; le fair value hedge concerne la dette à taux fixe, dont la valeur bouge avec les taux (on la swappe alors en flottant). C est faux : le net investment hedge couvre l'equity d'une filiale étrangère avec des forwards ou des futures de change, pas une dette.",
      ],
      // Variante plus difficile — classer trois opérations d'un même groupe (flux attendus en devises, dette fixe, filiale étrangère)
      [
        "A U.S. company (1) sells euros forward to hedge euro-denominated sales it expects to collect next quarter, (2) enters a swap to convert its fixed-rate bonds into floating-rate debt, and (3) sells yen futures to hedge its equity investment in a Japanese subsidiary. Under hedge accounting, these are, respectively:",
        [
          "a fair value hedge, a cash flow hedge, and a net investment hedge.",
          "a cash flow hedge, a cash flow hedge, and a fair value hedge.",
          "a cash flow hedge, a fair value hedge, and a net investment hedge.",
        ],
        2,
        "(1) Les ventes en euros attendues sont des flux futurs : la vente à terme d'euros fige leur contre-valeur en dollars, c'est un cash flow hedge. (2) Une dette à taux fixe voit sa valeur bouger avec les taux : la swapper en flottant stabilise sa valeur (et réduit sa duration), c'est un fair value hedge. (3) Couvrir l'equity d'une filiale étrangère avec des futures de change est un net investment hedge. C est donc correct. A est faux : il inverse (1) et (2), piège classique fixe/flottant (dette fixe = sa valeur bouge = fair value ; dette flottante ou flux attendus = cash flow). B est faux : il classe la dette fixe en cash flow hedge et la filiale en fair value hedge.",
      ],

      // Concept 5 — Usages des investisseurs : profils impossibles en cash, duration, beta (officielle — R70 Q8)
      [
        "To acquire the upside potential of an asset's price movement while maintaining downside protection, without holding the underlying asset, an investor should buy:",
        [
          "a call option on the asset.",
          "a put option on the asset.",
          "both a call option and a put option on the asset.",
        ],
        0,
        "Le call donne la hausse au-delà du prix d'exercice, et la perte se limite à la prime puisqu'on n'exerce pas si le cours baisse : c'est un profil impossible à obtenir sur le marché cash. A est donc correct. B est faux : le put protège un investisseur qui détient déjà l'actif ; sans l'actif, c'est un pari sur la baisse. C est faux : ajouter un put est inutile pour se protéger, puisque le call est un droit et non une obligation ; on paierait deux primes.",
      ],
      // Variante angle différent — un autre usage d'investor : allonger la duration avec un swap receveur fixe
      [
        "A fixed-income portfolio manager wants to increase the duration of her portfolio without buying additional bonds. The most appropriate strategy is to:",
        [
          "enter an interest rate swap to receive fixed and pay floating.",
          "enter an interest rate swap to pay fixed and receive floating.",
          "sell futures contracts on government bonds.",
        ],
        0,
        "Recevoir le fixe et payer le flottant équivaut à acheter une obligation à taux fixe (longue duration) financée par l'émission d'un FRN (duration quasi nulle) : la duration du portefeuille augmente. A est donc correct. B est faux : payer le fixe équivaut à émettre une obligation à taux fixe, ce qui réduit la duration. C est faux : vendre des futures sur obligations réduit aussi l'exposition aux taux, donc la duration. C'est un usage d'investor : modifier le risque d'un portefeuille à faible coût, sans toucher aux titres détenus.",
      ],
      // Variante plus difficile — call contre action : seuil sous lequel la protection du call l'emporte (breakeven-piège)
      [
        "A stock trades at $50. Investor A buys 100 shares. Investor B instead buys a call option on 100 shares with an exercise price of $50 for a premium of $3 per share and keeps the rest of his money in cash. Ignoring interest on cash, Investor B will have a higher profit than Investor A at expiration if the stock price is below:",
        ["$53.", "$50.", "$47."],
        2,
        "Profit de A : 100 × (S_T − 50). Profit de B : 100 × max(0 ; S_T − 50) − 300. Au-dessus de 50 $, B a la même hausse que A moins la premium : il fait toujours 300 $ de moins. En dessous de 50 $, B perd au maximum 300 $ (la premium), alors que A perd 100 × (50 − S_T). Les deux profits sont égaux quand 100 × (S_T − 50) = −300, soit S_T = 47 $ ; en dessous, la protection du call l'emporte. C est donc correct. A est faux : 53 $ (X + premium) est le breakeven de B, le cours où son profit est nul, pas celui où il dépasse A. B est faux : à 50 $, A a un profit nul et B perd 300 $. C'est le profil impossible en cash : hausse gardée, perte plafonnée à la premium, sans détenir l'action.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Derivatives Page 2...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
