// Seed script — quiz de "drill" associé à la page 2 de la fiche PDF Quantitative
// Methods (The Time Value of Money in Finance, Reading 2 de la fiche, même
// numéro dans la banque de pratique : pas de décalage). Structure : pour chacun
// des 5 concepts clés de la page, 1 question officielle (banque de pratique
// Quantitative Methods, corrigé vérifié contre "- Answers.pdf") + 1 variante
// "angle différent" (même notion, mais jamais un simple changement de chiffres
// menant au même raisonnement) + 1 variante "plus difficile" (raisonnement à
// plusieurs étapes / pièges combinés / notion connexe de la page). Voir memory
// regle-drill-variantes-cfa-hub. Questions en anglais, explications en
// français.
// Les 5 questions officielles ne sont PAS celles imprimées dans le PDF
// (R2 Q2, Q3, Q12, Q18 et Q21) : l'utilisateur les a déjà sur papier.
// Usage: node scripts/seed-quant-drill-page2.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Quantitative Methods (Système)";

const QUIZ_SETS = [
  {
    title: "Quantitative Methods — Drill Fiche Page 2 (The Time Value of Money in Finance)",
    difficulty: 2,
    questions: [
      // Concept 1 — PV, FV & fixed income : prix d'une obligation à coupons (officielle — R2 Q5)
      [
        "A bond pays annual coupon interest of £40 and returns its face value of £1,000 in five years. The bond's yield to maturity is 4.5%. Its price today is closest to:",
        ["£946.", "£978.", "£957."],
        1,
        "Prix = PV des coupons + PV du remboursement, actualisés au YTM : 40 x [1 - 1,045^-5] / 0,045 + 1 000 / 1,045^5 = 175,6 + 802,5 = 978,05 £. B est donc correct : le coupon (4 %) étant inférieur au YTM (4,5 %), l'obligation cote sous le pair. A et C sont faux : ces prix correspondent à des YTM plus élevés que 4,5 % (environ 5,25 % et 5,0 %) ; ils actualisent trop fortement les flux.",
      ],
      // Variante angle différent — le « pourquoi » : coupon rate ≠ YTM, prime et décote (piège de la fiche)
      [
        "A bond has a 6% annual coupon and trades at 104 per 100 of par value. Which of the following statements is most accurate?",
        [
          "Its yield to maturity exceeds 6%, because the investor pays more than par value.",
          "Its yield to maturity equals 6%, because the coupon rate is the rate used to discount the bond's cash flows.",
          "Its yield to maturity is below 6%, because the premium paid today is lost at maturity and reduces the return below the coupon rate.",
        ],
        2,
        "Le prix (104) est au-dessus du pair (100) : l'obligation cote avec une prime. L'investisseur touche 6 % de coupon, mais ne récupère que 100 à l'échéance après avoir payé 104 : cette perte de 4 étalée sur la durée de vie abaisse son rendement sous le taux du coupon. Le YTM, taux implicite qui égalise le prix et la PV des flux, est donc inférieur à 6 %. C est donc correct. A est faux : prix et rendement varient en sens inverse ; payer plus cher pour les mêmes flux donne un rendement plus faible, pas plus élevé. B est faux : le coupon rate sert seulement à calculer le montant des coupons (PMT) ; on actualise au YTM, et YTM = coupon rate uniquement quand l'obligation cote au pair.",
      ],
      // Variante plus difficile — prêt amortissable (annuité) : capital restant dû après deux échéances
      [
        "A $10,000 loan at 7% annual interest is repaid with four equal annual payments, the first one year from now. The principal still outstanding immediately after the second payment is closest to:",
        ["$5,338.", "$5,000.", "$4,095."],
        0,
        "Étape 1, l'annuité : A = r x PV / [1 - (1 + r)^-N] = 0,07 x 10 000 / (1 - 1,07^-4) = 700 / 0,23710 = 2 952,28 $. Étape 2, le capital restant dû = PV des deux paiements restants : 2 952,28 x (1 - 1,07^-2) / 0,07 = 2 952,28 x 1,80802 = 5 337,78 $. Vérification par le tableau d'amortissement : année 1, intérêts 700, principal remboursé 2 252,28, solde 7 747,72 ; année 2, intérêts 542,34, principal 2 409,94, solde 5 337,78. A est donc correct. B est faux : 5 000 $ suppose un remboursement du principal en parts égales (2 500 par an), alors qu'avec une annuité constante la part de principal augmente au fil du temps (elle ne vaut que 2 252 puis 2 410 au début). C est faux : 10 000 - 2 x 2 952,28 = 4 095 $ retranche les paiements entiers, en oubliant qu'une partie de chaque paiement sert à payer les intérêts.",
      ],

      // Concept 2 — Equity : preferred stock valorisée comme une perpétuité (officielle — R2 Q4)
      [
        "Wortel Industries has preferred stock outstanding that paying an annual dividend of $3.75 per share. If an investor wants to earn a rate of return of 8.5%, how much should he be willing to pay for a share of Wortel preferred stock?",
        ["$31.88.", "$44.12.", "$42.10."],
        1,
        "Une action préférentielle à dividende fixe, sans échéance, se valorise comme une perpétuité : V0 = D / r = 3,75 / 0,085 = 44,12 $. B est donc correct. A est faux : 31,88 $ = 3,75 x 8,5, une multiplication au lieu d'une division. C est faux : 42,10 $ ne résulte pas de la formule de la perpétuité au taux exigé de 8,5 % (il correspondrait à un taux exigé d'environ 8,9 %).",
      ],
      // Variante angle différent — la préférentielle, cas g = 0 du Gordon : sensibilité comparée au rendement exigé (perpétuité simple vs perpétuité croissante)
      [
        "Investors' required return rises from 8% to 9% on two securities: a perpetual, non-callable preferred share paying a fixed annual dividend of $4.00, and a common share expected to pay a $2.00 dividend next year, with dividends growing at 5% per year forever. Holding the dividends unchanged, which statement about the two price changes is most accurate?",
        [
          "The preferred share's price falls by the larger percentage, because its dividend does not grow.",
          "Both prices fall by the same percentage, because both are perpetuities discounted at the same required return.",
          "The common share's price falls by the larger percentage, because its value depends on the smaller denominator (k - g).",
        ],
        2,
        "Les deux titres se valorisent comme des perpétuités : la préférentielle est le cas g = 0 du Gordon growth model. Préférentielle : V0 = D / k passe de 4 / 0,08 = 50,00 $ à 4 / 0,09 = 44,44 $, soit -11,1 % (prix inversement proportionnel à k : 8 / 9 - 1). Action ordinaire : V0 = D1 / (k - g) passe de 2 / (0,08 - 0,05) = 66,67 $ à 2 / (0,09 - 0,05) = 50,00 $, soit -25,0 %. Le même point de hausse fait passer le dénominateur de 3 % à 4 % (+33 %) pour l'action, contre 8 % à 9 % (+12,5 %) pour la préférentielle : plus g est proche de k, plus la valeur est sensible au rendement exigé. C est donc correct. A est faux : c'est l'inverse, l'absence de croissance rend la préférentielle moins sensible au taux. B est faux : la hausse de k est la même en points, mais pas la variation relative du dénominateur, donc pas celle du prix.",
      ],
      // Variante plus difficile — de la perpétuité au DDM multi-étapes : Gordon sur D3 donne P2, valeur en t = 2
      [
        "A company has just paid a dividend of $1.20 per share. Dividends are expected to grow at 20% per year for the next two years and at 4% per year thereafter. If the required return on equity is 10%, the value of the share today is closest to:",
        ["$26.54.", "$27.49.", "$25.24."],
        1,
        "Le Gordon growth model est une perpétuité croissante (la préférentielle en est le cas g = 0). Dividendes : D1 = 1,20 x 1,20 = 1,44 ; D2 = 1,44 x 1,20 = 1,728 ; D3 = 1,728 x 1,04 = 1,7971. Valeur terminale en t = 2 avec Gordon sur D3 : P2 = 1,7971 / (0,10 - 0,04) = 29,952. Valeur actuelle : V0 = 1,44 / 1,10 + (1,728 + 29,952) / 1,10² = 1,309 + 26,182 = 27,49 $. B est donc correct. A est faux : 26,54 $ applique Gordon à D2 au lieu de D3 (P2 = 1,728 / 0,06 = 28,80) ; piège de la fiche, Gordon prend le dividende de la période SUIVANTE. C est faux : 25,24 $ actualise P2 sur trois périodes au lieu de deux ; P2 est une valeur en t = 2, à actualiser sur 2 ans avec D2.",
      ],

      // Concept 3 — Implied return & growth : croissance implicite du Gordon growth model (officielle — R2 Q32)
      [
        "Using a constant growth dividend discount model (DDM), an analyst assumes a required return on equity of 9.75%. The current stock price is $30 per share, and the next period's dividend is $2.40 per share. The constant growth rate implied in the model is closest to:",
        ["1.75%.", "1.89%.", "1.83%."],
        0,
        "En isolant g dans le Gordon growth model : g = r - D1 / P0 = 9,75 % - 2,40 / 30 = 9,75 % - 8 % = 1,75 %. Le dividende donné est déjà celui de la prochaine période (D1) : aucun ajustement n'est nécessaire. A est donc correct. C est faux : 1,83 % ajoute à tort 0,08 point au bon résultat. B est faux : 1,89 % = 1,75 % x 1,08, une capitalisation sans objet.",
      ],
      // Variante angle différent — le « pourquoi » : sens de la croissance implicite quand le prix monte
      [
        "Using the constant growth dividend discount model, with an unchanged required return on equity and an unchanged expected next dividend, a rise in the share price implies that the market's expected growth rate has:",
        [
          "increased, because a lower dividend yield must be offset by higher growth to deliver the same required return.",
          "decreased, because a higher price lowers the dividend yield, and growth moves in the same direction as the dividend yield.",
          "remained unchanged, because the growth rate depends only on the company's earnings retention and return on equity.",
        ],
        0,
        "Le Gordon growth model décompose le rendement exigé en deux morceaux : ke = D1 / P0 + g (dividend yield + croissance). Si P0 monte avec D1 et ke inchangés, le dividend yield D1 / P0 baisse ; pour que la somme reste égale à ke, g implicite doit augmenter (g = ke - D1 / P0). A est donc correct. B est faux : le dividend yield baisse bien, mais g varie en sens INVERSE du dividend yield quand ke est fixe, pas dans le même sens. C est faux : la croissance implicite se déduit du prix de marché ; elle ne dépend pas que de la politique de distribution, et une hausse du prix à dividende et taux inchangés traduit forcément des anticipations de croissance plus fortes.",
      ],
      // Variante plus difficile — croissance implicite à partir de D0 (pas D1), puis prix attendu dans un an et décomposition du rendement
      [
        "A share trades at $50.00 and has just paid an annual dividend of $2.00. The required return on equity is 10%. Assuming the constant growth dividend discount model holds and the required return stays unchanged, the implied growth rate and the expected share price one year from now are closest to:",
        ["6.00% and $53.00.", "5.77% and $55.00.", "5.77% and $52.88."],
        2,
        "Le dividende de 2,00 $ vient d'être versé : c'est D0, et D1 = 2,00 x (1 + g). On résout P0 = D0(1 + g) / (ke - g) : 50 x (0,10 - g) = 2 x (1 + g), soit 5 - 50g = 2 + 2g, d'où g = 3 / 52 = 5,77 %. Dans le Gordon growth model, le prix croît au rythme g : P1 = 50 x 1,0577 = 52,88 $. Contrôle : D1 / P0 = 2,1154 / 50 = 4,23 %, et 4,23 % + 5,77 % = 10 %. C est donc correct. A est faux : 6,00 % = 10 % - 2,00 / 50 traite 2,00 $ comme D1 (piège de la fiche : Gordon prend D1), ce qui donne aussi un prix de 53,00 $. B est faux : 55,00 $ fait croître le prix au rendement exigé (10 %), alors qu'une partie de ce rendement est versée en dividende ; seule la part g se retrouve dans le prix.",
      ],

      // Concept 4 — Forward rates : taux forward implicite (cash flow additivity) (officielle — R2 Q19)
      [
        "Assume that one- and two-year risk-free rates are 1.80% and 2.50%, respectively. Using the cash flow additivity principle, the one-year reinvestment rate, one year from now is closest to:",
        ["2.8%.", "3.2%.", "3.5%."],
        1,
        "Placer 2 ans au taux à 2 ans doit rapporter autant que placer 1 an au taux à 1 an puis réinvestir 1 an au taux forward : (1,025)² = (1,018) x (1 + F). F = 1,050625 / 1,018 - 1 = 3,2 %. B est donc correct. A et C sont faux : seul 3,2 % égalise les deux stratégies (approximation rapide : 2 x 2,5 % - 1,8 % = 3,2 %).",
      ],
      // Variante angle différent — notation AyBy : quel forward se déduit de deux taux spot donnés
      [
        "An analyst knows only the 2-year and the 5-year spot rates. Using the no-arbitrage relationship between spot and forward rates, which forward rate can she compute directly from these two rates?",
        ["The 2y5y rate.", "The 2y3y rate.", "The 3y2y rate."],
        1,
        "Dans la notation AyBy, A est le départ du prêt (dans A ans) et B sa durée (B ans). Placer 5 ans au taux spot S5 doit rapporter autant que placer 2 ans au taux S2 puis 3 ans au taux forward qui démarre dans 2 ans : (1 + S5)^5 = (1 + S2)² x (1 + 2y3y)³. Avec S2 et S5, on obtient donc le 2y3y. B est donc correct. A est faux : le 2y5y est un prêt de 5 ans démarrant dans 2 ans, qui se termine dans 7 ans ; il faudrait S7. C est faux : le 3y2y est un prêt de 2 ans démarrant dans 3 ans ; il faudrait S3 et S5. Règle : le forward relie deux spots dont les échéances sont son départ (A) et sa fin (A + B).",
      ],
      // Variante plus difficile — même logique de réplication appliquée à une option : modèle binomial à une période
      [
        "A non-dividend-paying stock trades at $40 and will be worth either $50 or $32 in one year. A one-year European call option on the stock has an exercise price of $42, and the risk-free rate is 4%. Using a one-period binomial model in which a portfolio that is long h shares and short one call is riskless, the value of the call today is closest to:",
        ["$3.56.", "$3.85.", "$4.10."],
        2,
        "C'est le même principe d'absence d'arbitrage que pour les forwards : un portefeuille qui réplique un flux certain doit rapporter le taux sans risque. Payoffs du call : cu = 50 - 42 = 8, cd = 0 (non exercé). Hedge ratio : h = (8 - 0) / (50 - 32) = 0,4444 action. Valeur du portefeuille en t = 1 : 0,4444 x 32 - 0 = 14,22 dans le scénario bas, et 0,4444 x 50 - 8 = 14,22 dans le scénario haut : il est bien sans risque. V0 = 14,22 / 1,04 = 13,68. Comme V0 = hS0 - c0 : c0 = 0,4444 x 40 - 13,68 = 17,78 - 13,68 = 4,10 $. C est donc correct. A est faux : 3,56 $ = 17,78 - 14,22 oublie d'actualiser la valeur du portefeuille au taux sans risque. B est faux : 3,85 $ = 0,5 x 8 / 1,04 suppose une probabilité de hausse de 50 % ; la réplication n'utilise aucune probabilité réelle (la probabilité risque-neutre implicite est (1,04 x 40 - 32) / 18 = 53,3 %, qui redonne 4,10 $).",
      ],

      // Concept 5 — Forward exchange rate : écart forward/spot et écart de taux (officielle — R2 Q26)
      [
        "Assuming the 1-year riskless interest rates on the U.S. dollar and British pound are 3.5% and 4.0% respectively, the forward exchange rate between the two currencies will be different than the spot rate by approximately:",
        ["0.50%.", "3.75%.", "7.50%."],
        0,
        "Par absence d'arbitrage, l'écart en pourcentage entre le taux de change forward et le spot est à peu près égal à l'écart entre les taux sans risque des deux devises : 4,0 % - 3,5 % = 0,50 %. A est donc correct. B est faux : 3,75 % est la moyenne des deux taux. C est faux : 7,50 % est leur somme.",
      ],
      // Variante angle différent — le sens de l'écart : quelle devise cote avec un report (premium) et pourquoi
      [
        "The spot exchange rate is 1.1000 USD/EUR (US dollars per euro). One-year risk-free rates are 5% in US dollars and 3% in euros. Which of the following statements about the one-year forward exchange rate is most accurate?",
        [
          "The euro trades at a forward premium of about 2%, because the forward rate must offset the higher US dollar interest rate.",
          "The euro trades at a forward discount of about 2%, because capital flows toward the currency with the higher interest rate.",
          "The forward rate equals the spot rate, because covered interest parity rules out any difference between them.",
        ],
        0,
        "Formule de la fiche, cotation price/base : F = S x (1 + r price) / (1 + r base) = 1,1000 x 1,05 / 1,03 = 1,1214 USD/EUR, soit +1,94 % (≈ 5 % - 3 %). Il faut plus de dollars pour un euro à terme qu'au comptant : l'euro cote avec un report (forward premium). Raison : placer en dollars rapporte 2 points de plus ; si le forward ne compensait pas cet écart, on emprunterait en euros pour placer en dollars et revendre les dollars à terme sans risque. A est donc correct. B est faux : c'est la devise au taux d'intérêt le plus BAS (l'euro) qui cote en report, et la devise au taux le plus élevé (le dollar) en déport. C est faux : la parité des taux couverte n'implique pas F = S ; elle impose au contraire que F s'écarte de S de l'écart de taux (F = S seulement si les deux taux sont égaux).",
      ],
      // Variante plus difficile — forward mal coté : sens de l'arbitrage et profit exact (la dette en livres grossit au taux GBP)
      [
        "The spot exchange rate is 1.2500 USD/GBP. One-year risk-free rates are 4% in US dollars and 2% in British pounds, and a dealer quotes a one-year forward rate of 1.2600 USD/GBP. An arbitrageur who can borrow £1,000,000 or its US dollar equivalent should most likely:",
        [
          "borrow US dollars, convert them to pounds at spot, invest in pounds and sell the pounds forward, earning about $14,800.",
          "borrow pounds, convert them to US dollars at spot, invest in dollars and buy pounds forward, earning about $14,510.",
          "borrow pounds, convert them to US dollars at spot, invest in dollars and buy pounds forward, earning about $14,800.",
        ],
        2,
        "Forward d'équilibre : F = 1,2500 x 1,04 / 1,02 = 1,2745 USD/GBP. Le forward coté (1,2600) est trop bas : la livre est bon marché à terme, il faut donc l'ACHETER à terme, et emprunter en livres. Opération : emprunter 1 000 000 £, les convertir au comptant en 1 250 000 $, placer à 4 % pour obtenir 1 300 000 $ ; la dette atteint 1 020 000 £, achetées à terme à 1,2600, soit 1 285 200 $. Profit sans risque : 1 300 000 - 1 285 200 = 14 800 $. C est donc correct. A est faux : c'est le sens inverse ; emprunter 1 250 000 $, placer 1 000 000 £ à 2 % et vendre 1 020 000 £ à terme rapporte 1 285 200 $ pour une dette de 1 300 000 $, soit une PERTE de 14 800 $. B est faux : 14 510 $ = 1 000 000 x (1,2745 - 1,2600) applique l'écart de cours au montant emprunté, en oubliant que la dette en livres a grossi à 1 020 000 £ (1 020 000 x 0,01451 = 14 800 $).",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Quantitative Methods Page 2...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
