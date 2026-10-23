// Seed script — quiz de "drill" associé à la page 3 de la fiche PDF Derivatives
// (Arbitrage, Replication & Cost of Carry · Forward Valuation, Readings 69 et 70
// de la fiche, soit les Readings 71 et 72 de la banque de pratique : décalage
// de +2). Structure : pour chacun des 5 concepts clés de la page, 1 question
// officielle (banque de pratique Derivatives, corrigé vérifié contre
// "- Answers.pdf") + 1 variante "angle différent" (même notion, mais jamais
// un simple changement de chiffres menant au même raisonnement) + 1 variante
// "plus difficile" (raisonnement à plusieurs étapes / pièges combinés / notion
// connexe de la page : taux forward implicites, forward de change). Voir memory
// regle-drill-variantes-cfa-hub. Questions en anglais, explications en français.
// Les 5 questions officielles ne sont PAS celles imprimées dans le PDF
// (R71 Q1, Q5 et Q8, R72 Q1 et Q3) : l'utilisateur les a déjà sur papier.
// Usage: node scripts/seed-derivatives-drill-page3.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Derivatives (Système)";

const QUIZ_SETS = [
  {
    title: "Derivatives — Drill Fiche Page 3 (Arbitrage, Replication & Cost of Carry · Forward Valuation)",
    difficulty: 1,
    questions: [
      // Concept 1 — Arbitrage : forward mal pricé, réplication, loi du prix unique (officielle — R71 Q6)
      [
        "It is possible to profit from arbitrage when there are no costs or benefits to holding the underlying asset and the forward contract price is:",
        [
          "equal to the future value of the spot price.",
          "greater than the present value of the spot price.",
          "less than the future value of the spot price.",
        ],
        2,
        "Sans coûts ni bénéfices de détention, le prix sans arbitrage est S0 × (1 + Rf)^T. Tout prix différent ouvre un arbitrage : s'il est plus bas, on achète le forward, on shorte l'underlying et on place le produit au taux sans risque. C est donc correct. A est faux : c'est justement le prix sans arbitrage. B est faux : un prix supérieur à la valeur actuelle du spot peut très bien être égal à sa valeur future ; ce critère ne garantit pas d'arbitrage.",
      ],
      // Variante angle différent — la réplication qui fonde le prix : long forward = emprunter S0 + acheter l'underlying
      [
        "Which of the following portfolios replicates the payoff of a long forward position on a non-dividend-paying stock?",
        [
          "Borrow the current stock price at the risk-free rate and buy the stock.",
          "Sell the stock short and lend the proceeds at the risk-free rate.",
          "Buy the stock and lend an amount equal to the stock price at the risk-free rate.",
        ],
        0,
        "En empruntant S0 au taux sans risque pour acheter l'action, on détient l'action en T et on rembourse S0(1 + Rf)^T : payoff S_T − S0(1 + Rf)^T, exactement celui d'un long forward au prix sans arbitrage, sans mise de départ. A est donc correct. B est faux : shorter l'action et prêter le produit réplique un short forward, de payoff S0(1 + Rf)^T − S_T. C est faux : acheter l'action et prêter en plus demande une mise de 2 × S0 et rapporte S_T + S0(1 + Rf)^T, ce qui n'est pas le payoff d'un forward. C'est cette réplication qui impose F0(T) = S0(1 + Rf)^T : sinon, on achète le moins cher des deux et on vend l'autre.",
      ],
      // Variante plus difficile — arbitrage sur un taux forward implicite (2y1y) : calcul, sens de la stratégie, piège du 2y2y
      [
        "Annual-pay zero-coupon (spot) rates are 2.0% for one year, 2.5% for two years, and 3.0% for three years. A dealer quotes a 2y1y forward rate of 3.5% at which an investor can either borrow or lend. Which of the following statements is most accurate?",
        [
          "Only the 1y1y and 1y2y forward rates can be derived from these spot rates, so the 2y1y quote cannot be assessed.",
          "The implied 2y1y rate is about 4.01%, so an investor can earn a riskless profit by agreeing to borrow from Year 2 to Year 3 at 3.5%, while lending for three years and borrowing for two years at the spot rates.",
          "The implied 2y1y rate is about 4.01%, so an investor can earn a riskless profit by agreeing to lend from Year 2 to Year 3 at 3.5%, while borrowing for three years and lending for two years at the spot rates.",
        ],
        1,
        "Taux implicite : (1,03)^3 = (1,025)^2 × (1 + 2y1y), donc 2y1y = 1,092727 / 1,050625 − 1 = 4,01 %. Le dealer prête de l'an 2 à l'an 3 à 3,5 %, moins cher que le taux sans arbitrage : il faut emprunter à ce taux. Pour 1 $ : prêter 1 $ sur trois ans rapporte 1,092727 $ en T = 3 ; emprunter 1 $ sur deux ans coûte 1,050625 $ en T = 2, refinancés par l'emprunt forward à 3,5 %, soit 1,050625 × 1,035 = 1,087397 $ en T = 3. Gain sans risque ni mise : environ 0,0053 $ par dollar. B est donc correct. C est faux : bon taux implicite, mais arbitrage à l'envers ; prêter à 3,5 % ce qui vaut 4,01 % fait perdre. A est faux : avec Z1, Z2 et Z3 on obtient aussi le 2y1y (de l'an 2 à l'an 3) ; c'est le 2y2y, qui finit en année 4, qu'on ne peut pas calculer.",
      ],

      // Concept 2 — Cost of carry : coûts nets de détention (officielle — R71 Q3)
      [
        "Costs of holding the underlying that are greater than benefits from holding the underlying will:",
        [
          "decrease the no-arbitrage forward price.",
          "increase the no-arbitrage forward price.",
          "have no effect on the no-arbitrage forward price.",
        ],
        1,
        "Si les coûts de détention (stockage, assurance) dépassent les bénéfices (dividendes, coupons, convenience yield), le coût de portage net est positif : celui qui achète le spot et le porte jusqu'en T doit en être compensé, donc F0(T) est plus élevé qu'en l'absence de coûts et de bénéfices. B est donc correct. A est faux : c'est l'effet d'un bénéfice net. C est faux : le coût de portage entre directement dans le prix sans arbitrage.",
      ],
      // Variante angle différent — le « pourquoi » : l'arbitrage qui oblige F à intégrer les coûts nets de portage
      [
        "Why must the no-arbitrage forward price be higher when the costs of holding the underlying exceed the benefits?",
        [
          "Because someone who buys the asset today and holds it until settlement bears those net costs; with a lower forward price, an arbitrageur could sell the asset, lend the proceeds, and buy it back through the forward at a profit.",
          "Because the long side of the forward contract must pay the storage and insurance costs during the life of the contract.",
          "Because high carrying costs signal that market participants expect the spot price to rise by settlement.",
        ],
        0,
        "Le prix forward doit égaler le coût d'acheter l'actif aujourd'hui et de le porter jusqu'en T : S0 financé au taux sans risque, plus les coûts nets de détention. Si F était plus bas, un détenteur de l'actif le vendrait au comptant, économiserait les coûts de portage, placerait le produit et le rachèterait via un long forward : gain sans risque. A est donc correct. B est faux : le long forward ne détient pas l'actif avant T et ne paie aucun coût de stockage ; c'est justement parce qu'il en est dispensé que F est plus élevé. C est faux : F ne dépend que du cost of carry et du taux sans risque, pas des anticipations ; un prix forward n'est pas une prévision du spot futur.",
      ],
      // Variante plus difficile — formule continue avec stockage et convenience yield, puis contango ou backwardation
      [
        "Crude oil trades at a spot price of $70 per barrel. The continuously compounded risk-free rate is 4%, storage costs are 2% per year, and the convenience yield is 7% per year, both expressed as continuously compounded rates. The no-arbitrage price of a six-month forward contract and the state of the market are closest to:",
        [
          "$72.13, and the market is in contango.",
          "$68.27, and the market is in backwardation.",
          "$69.65, and the market is in backwardation.",
        ],
        2,
        "Formule continue : F0(T) = S0 × e^((r + c − b) × T), où c = coûts (stockage, ajoutés) et b = bénéfices (convenience yield, retranchée). F = 70 × e^((0,04 + 0,02 − 0,07) × 0,5) = 70 × e^(−0,005) = 69,65 $. Les bénéfices (7 %) dépassent les coûts de portage (4 % + 2 %) : F < S0, le marché est en backwardation. C est donc correct. A est faux : 72,13 $ = 70 × e^(0,03) oublie la convenience yield, ce qui donne un faux contango. B est faux : 68,27 $ = 70 × e^(−0,025) retranche le stockage au lieu de l'ajouter ; la conclusion « backwardation » est juste, mais le prix ne l'est pas. Une forte convenience yield (pénurie, actif difficile à shorter) suffit à faire passer F sous le spot.",
      ],

      // Concept 3 — Cost of carry : coûts de stockage (officielle — R71 Q4)
      [
        "Other things equal, an increase in storage costs of the underlying asset will:",
        [
          "not affect the no-arbitrage forward price.",
          "decrease the no-arbitrage forward price.",
          "increase the no-arbitrage forward price.",
        ],
        2,
        "Les coûts de stockage s'ajoutent au coût de détention de l'underlying : F0(T) = (S0 + PV des coûts) × (1 + Rf)^T. Une hausse de ces coûts augmente donc le prix forward. C est donc correct. A est faux : le stockage n'est pas neutre. B est faux : seul un bénéfice de détention (dividende, coupon, convenience yield) fait baisser F.",
      ],
      // Variante angle différent — cas limite : quand le prix forward d'une commodity égale-t-il le spot ?
      [
        "For a commodity with storage costs and a convenience yield, both expressed as annual percentages of the spot price, the no-arbitrage forward price equals the spot price when:",
        [
          "the storage costs equal the convenience yield.",
          "the convenience yield equals the risk-free rate plus the storage costs.",
          "the risk-free rate is zero.",
        ],
        1,
        "En continu, F0(T) = S0 × e^((r + c − b) × T) : F = S0 exactement quand r + c − b = 0, soit b = r + c, c'est-à-dire une convenience yield égale au taux sans risque plus les coûts de stockage. B est donc correct. A est faux : si stockage et convenience yield se compensent, il reste le coût de financement r, et F = S0 × e^(rT) > S0. C est faux : avec r = 0, il reste le stockage et la convenience yield, et F ≠ S0 sauf si ces deux termes s'annulent. Au-delà de ce seuil (b > r + c), le marché passe en backwardation.",
      ],
      // Variante plus difficile — arbitrage sur l'or : oublier le stockage inverse la stratégie (reverse cash-and-carry)
      [
        "Gold trades at a spot price of $2,000 per ounce. Storing and insuring gold for one year has a present value of $10 per ounce, gold has no other costs or benefits of holding, and the annual risk-free rate is 4%. A dealer quotes a one-year forward price of $2,085 per ounce. A firm that holds gold in inventory can earn an arbitrage profit at settlement closest to:",
        [
          "$5.40 per ounce, by selling gold from inventory, lending the proceeds, and buying the forward.",
          "$5.00 per ounce, by selling the forward, borrowing to buy gold, and storing it until settlement.",
          "$0, because a forward price above the spot price only reflects the cost of carry.",
        ],
        0,
        "Prix sans arbitrage : F* = (S0 + PV des coûts) × (1 + Rf)^T = (2 000 + 10) × 1,04 = 2 090,40 $. Le forward coté (2 085 $) est trop bas : il faut l'acheter et vendre le comptant (reverse cash-and-carry). La firme vend son or (2 000 $), économise le stockage (10 $ en valeur actuelle), place l'équivalent de 2 010 $ à 4 % et récupère 2 090,40 $ en T, puis rachète l'or via le forward à 2 085 $ : gain de 5,40 $ par once, et elle a retrouvé son stock. A est donc correct. B est faux : en oubliant le stockage, on trouve F = 2 000 × 1,04 = 2 080 $ et on croit le forward trop cher ; acheter et stocker l'or coûte en réalité 2 090,40 $ en T pour une vente à 2 085 $, soit une perte de 5,40 $. C est faux : un F supérieur au spot (contango) est normal, mais seul F = 2 090,40 $ élimine l'arbitrage. Plus les coûts de stockage sont élevés, plus F* monte, et plus ce forward coté est bon marché.",
      ],

      // Concept 4 — Bénéfices de détention : prix vs valeur du forward (officielle — R71 Q2)
      [
        "A net benefit from holding the underlying asset of a forward contract will:",
        [
          "increase the value of the forward contract during its life.",
          "decrease the no-arbitrage forward price at initiation.",
          "decrease the value of the forward contract at expiration.",
        ],
        1,
        "Un bénéfice net de détention (dividendes, coupons ou convenience yield supérieurs aux coûts) réduit le prix forward sans arbitrage à l'initiation : F0(T) = (S0 − PV des bénéfices) × (1 + Rf)^T. B est donc correct. A est faux : pendant la vie du contrat, ce bénéfice réduit la valeur du long (on retranche la PV des bénéfices restants), il ne l'augmente pas. C est faux : à l'échéance, la valeur est ST − F0(T), sans aucun effet des coûts ou bénéfices de détention.",
      ],
      // Variante angle différent — calcul inversé : la PV des dividendes implicite dans un prix forward
      [
        "A stock trades at $50, and the no-arbitrage price of a one-year forward contract on the stock is $49.92. The annual risk-free rate is 4%. The present value of the dividends expected over the year is closest to:",
        ["$0.08.", "$2.00.", "$2.08."],
        1,
        "F0(T) = (S0 − PV des dividendes) × (1 + Rf)^T, donc PV des dividendes = S0 − F0(T) / (1 + Rf)^T = 50 − 49,92 / 1,04 = 50 − 48,00 = 2,00 $. B est donc correct. A est faux : 0,08 $ = 50 − 49,92 compare le spot au prix forward sans actualiser ; or sans dividende le forward vaudrait 52 $, l'écart à expliquer est donc bien plus grand. C est faux : 2,08 $ = 52 − 49,92 est la valeur des dividendes capitalisée en T (2,00 × 1,04), pas leur valeur actuelle. Le dividende est un bénéfice de détention : il réduit le prix forward.",
      ],
      // Variante plus difficile — forward de change : le taux de la devise de base est un bénéfice de détention (prix, forward discount, sens de l'arbitrage)
      [
        "The spot exchange rate is 1.2500 USD/GBP (U.S. dollars per British pound). The one-year risk-free rates are 4.0% in U.S. dollars and 5.0% in British pounds, both annually compounded. A bank quotes a one-year forward rate of 1.2450 USD/GBP. Which of the following statements is most accurate?",
        [
          "The no-arbitrage forward rate is about 1.2381 USD/GBP; an arbitrageur should borrow USD, buy GBP at the spot rate, invest the GBP at 5.0%, and sell GBP forward at 1.2450.",
          "The no-arbitrage forward rate is about 1.2620 USD/GBP; an arbitrageur should borrow GBP, convert them to USD at the spot rate, invest the USD at 4.0%, and buy GBP forward at 1.2450.",
          "The no-arbitrage forward rate is about 1.2381 USD/GBP; an arbitrageur should borrow GBP, convert them to USD at the spot rate, invest the USD at 4.0%, and buy GBP forward at 1.2450.",
        ],
        0,
        "F(USD/GBP) = S0 × (1 + r_USD) / (1 + r_GBP) = 1,2500 × 1,04 / 1,05 = 1,2381. La livre, devise de base au taux le plus élevé, cote en forward discount : son taux de 5 % est un bénéfice de détention, comme un dividende, qui abaisse le prix forward. Le forward coté (1,2450) est trop cher : on vend la livre à terme. Pour 1 £ : emprunter 1,25 $ (1,30 $ à rembourser), acheter 1 £, la placer à 5 % (1,05 £), la vendre à terme à 1,2450, soit 1,30725 $ : gain sans risque de 0,00725 $ par livre. A est donc correct. B est faux : 1,2620 = 1,25 × 1,05 / 1,04 inverse les deux taux et fait croire le forward coté trop bon marché. C est faux : bon prix sans arbitrage, mais stratégie inverse ; acheter à terme une livre trop chère fait perdre 0,00725 $ par livre.",
      ],

      // Concept 5 — Valeur d'un forward pendant sa vie (officielle — R72 Q4)
      [
        "At time t, prior to its settlement date at time T, the value Vt of a long forward with a price of F will be related to the spot price, S, of an asset that has a zero net cost of carry by:",
        [
          "Vt = F0(T) − St(1 + Rf)^−(T − t).",
          "Vt = (St − F0(T))(1 + Rf)^−(T − t).",
          "Vt = St − F0(T)(1 + Rf)^−(T − t).",
        ],
        2,
        "Avec un coût de portage net nul, la valeur du long en t est le spot moins la valeur actuelle du prix forward : Vt = St − F0(T)(1 + Rf)^−(T − t). C est donc correct. B est faux : il actualise aussi le spot, alors que St est déjà une valeur d'aujourd'hui ; seul F0(T), payé en T, s'actualise. A est faux : il inverse le spot et le prix forward et actualise le mauvais terme.",
      ],
      // Variante angle différent — formule équivalente : PV de l'écart entre le nouveau prix forward et l'ancien
      [
        "An investor entered a one-year long forward contract at a forward price of 50. Six months later, the price of a new forward contract on the same asset expiring on the same date is 53, and the annual risk-free rate is 4%. The value of the investor's original long position is closest to:",
        ["-2.94.", "3.00.", "2.94."],
        2,
        "La valeur d'un forward en cours de vie est la valeur actuelle de l'écart entre le nouveau prix forward et le prix figé au départ : Vt = (Ft(T) − F0(T)) / (1 + Rf)^(T − t) = (53 − 50) / 1,04^0,5 = 3 / 1,0198 = 2,94. En effet, le long peut neutraliser sa position en vendant un forward à 53 : il recevra 53 et paiera 50 à l'échéance, un gain de 3 qui n'arrive qu'en T, d'où l'actualisation sur les six mois restants. C est donc correct. B est faux : 3,00 oublie d'actualiser ; ce serait la valeur à l'échéance. A est faux : −2,94 est la valeur pour le short ; le long gagne quand le prix forward monte. Cette formule équivaut à St − F0(T) / (1 + Rf)^(T − t) quand le coût de portage net est nul.",
      ],
      // Variante plus difficile — valeur en cours de vie avec un dividende restant à verser (PV du bénéfice + actualisation de F0)
      [
        "Six months ago, an investor entered a one-year long forward contract on a stock at a forward price of 60.89. The stock now trades at 63 and will pay a dividend of 1.50 three months from now, before the contract expires. The annual risk-free rate is 4%. The value of the long forward position today is closest to:",
        ["1.81.", "3.29.", "0.62."],
        0,
        "Vt = [St − PVt(bénéfices)] − F0(T) / (1 + Rf)^(T − t). Le dividende restant sera touché par le détenteur de l'action, pas par le long forward : on retranche sa valeur actuelle, 1,50 / 1,04^0,25 = 1,485. Le prix forward s'actualise sur les six mois restants : 60,89 / 1,04^0,5 = 59,708. Vt = 63 − 1,485 − 59,708 = 1,81. A est donc correct. B est faux : 3,29 = 63 − 59,708 oublie le dividende, alors que le long forward n'y a pas droit. C est faux : 0,62 = 63 − 1,485 − 60,89 retranche le prix forward sans l'actualiser, alors qu'il ne sera payé qu'à l'échéance. Le bénéfice de détention réduit donc la valeur du long en cours de vie, comme le rappelle la fiche (R70 : on retranche la PV des bénéfices restants).",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Derivatives Page 3...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
