// Seed script — quiz de "drill" associé à la page 5 de la fiche PDF Derivatives
// (Option Bounds & Factors · Put–Call Parity · Binomial Model, Readings 73, 74
// et 75 de la fiche, soit les Readings 75, 76 et 77 de la banque de pratique :
// décalage de +2). Structure : pour chacun des 5 concepts clés de la page,
// 1 question officielle (banque de pratique Derivatives, corrigé vérifié contre
// "- Answers.pdf") + 1 variante "angle différent" (même notion, mais jamais un
// simple changement de chiffres menant au même raisonnement) + 1 variante
// "plus difficile" (raisonnement à plusieurs étapes / pièges combinés / notion
// connexe de la page). Voir memory regle-drill-variantes-cfa-hub. Questions en
// anglais, explications en français.
// Les 5 questions officielles ne sont PAS celles imprimées dans le PDF
// (R75 Q1 et Q14, R76 Q2 et Q8, R77 Q4) : l'utilisateur les a déjà sur papier.
// Usage: node scripts/seed-derivatives-drill-page5.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Derivatives (Système)";

const QUIZ_SETS = [
  {
    title: "Derivatives — Drill Fiche Page 5 (Option Bounds & Factors · Put–Call Parity · Binomial Model)",
    difficulty: 1,
    questions: [
      // Concept 1 — Bornes de non-arbitrage des options européennes (officielle — R75 Q13)
      [
        "A one-year European call option has an exercise price of X = $500. At the time of the option's purchase, the underlying asset trades at S0 = $485, and the risk-free rate is r = 1.25%. What is the no-arbitrage upper bound of this option in six months, if the underlying asset price is St = $510?",
        ["$510.", "$500.", "$507."],
        0,
        "La borne supérieure d'un call européen est le cours actuel de l'underlying, St = 510 $ : personne ne paierait le droit d'acheter l'actif plus cher que l'actif lui-même. A est donc correct. B est faux : 500 $ est le prix d'exercice, qui n'est pas une borne du call (X est la borne supérieure d'un put américain). C est faux : 507 $ ne correspond à aucune borne ; la borne inférieure, elle, vaut max(0 ; 510 − 500 / 1,0125^0,5) ≈ 13,10 $.",
      ],
      // Variante angle différent — le « pourquoi » de la borne haute d'un put européen
      [
        "The upper bound on the value of a European put option is the present value of the exercise price rather than the exercise price itself because:",
        [
          "the underlying price can fall to zero, so the put's payoff at expiration can never exceed the underlying price.",
          "the most the put can pay is the exercise price, and this amount can only be received at expiration.",
          "the put holder must pay the exercise price at expiration, so its present value is deducted from the option's value.",
        ],
        1,
        "Le meilleur cas pour le détenteur d'un put est un cours qui tombe à zéro : il reçoit alors X. Mais un put européen ne peut être exercé qu'à l'échéance, donc ce X n'est reçu qu'en T ; aujourd'hui, ce gain maximal vaut au plus X / (1 + Rf)^T = PV(X). B est donc correct. A est faux : un cours qui peut tomber à zéro explique pourquoi le gain maximal est X, pas pourquoi on l'actualise ; et le payoff du put est borné par X, pas par le cours de l'underlying (c'est St qui est la borne haute d'un call). C est faux : c'est le détenteur d'un call qui paie X en cas d'exercice ; le détenteur du put reçoit X en livrant l'actif.",
      ],
      // Variante plus difficile — bornes basse et haute d'un put européen dans la monnaie, puis test d'arbitrage
      [
        "A nine-month European put option has an exercise price of 60 and trades at 6.50. The underlying stock trades at 52 and the annual risk-free rate is 4%. Which statement about the put's no-arbitrage bounds is most accurate?",
        [
          "The bounds are 8.00 and 60.00, so the put is below its lower bound and an arbitrageur should buy the put and the stock.",
          "The bounds are 6.26 and 52.00, so the put lies within its bounds and no arbitrage is available.",
          "The bounds are 6.26 and 58.26, so the put lies within its bounds and no arbitrage is available.",
        ],
        2,
        "PV(X) = 60 / 1,04^0,75 = 60 / 1,02985 = 58,26. Borne basse du put européen = max(0 ; PV(X) − S) = max(0 ; 58,26 − 52) = 6,26. Borne haute = PV(X) = 58,26. Le put cote 6,50 : il est entre les deux, il n'y a pas d'arbitrage. C est donc correct. A est faux : 8,00 = X − S et 60,00 = X oublient d'actualiser le prix d'exercice, reçu seulement dans neuf mois ; avec ces fausses bornes, on croirait le put sous-évalué, et l'arbitrage proposé (acheter le put et l'action en empruntant) ne garantirait aucun profit. B est faux : la borne basse est juste, mais 52,00 (le cours de l'action) est la borne haute d'un call, St, pas celle d'un put.",
      ],

      // Concept 2 — Facteurs de valeur d'une option : durée, taux, volatilité, bénéfices et coûts de détention (officielle — R75 Q22)
      [
        "Compared to an otherwise identical European put option, one that has a longer time to expiration:",
        [
          "must be worth more than the put that is nearer to expiration.",
          "must be worth at least as much as the put that is nearer to expiration.",
          "may be worth less than the put that is nearer to expiration.",
        ],
        2,
        "En général, plus de temps augmente la valeur d'une option. Mais un put européen très dans la monnaie (cours proche de zéro) peut valoir moins avec une échéance plus lointaine : son gain maximal est PV(X), et X reçu plus tard vaut moins aujourd'hui. C est donc correct. B est faux : ce serait vrai pour une option américaine, qu'on peut toujours exercer plus tôt, mais pas pour tout put européen. A est faux pour la même raison, et c'est une affirmation encore plus forte que B.",
      ],
      // Variante angle différent — cas limite : quelle option perd de la valeur quand l'échéance s'allonge ?
      [
        "Other things equal, a longer time to expiration is most likely to decrease the value of a European:",
        [
          "call option on a stock that pays no dividends.",
          "put option that is deep in the money.",
          "put option that is at the money.",
        ],
        1,
        "Plus de temps a deux effets sur un put européen : plus de chances que le cours bouge (effet volatilité, favorable) mais un X reçu plus tard, donc une PV(X) plus faible (effet taux, défavorable, car le put reçoit X). Pour un put très dans la monnaie, dont le cours est déjà proche de zéro, il n'y a presque plus rien à gagner en volatilité : l'effet taux domine et le put plus long peut valoir moins. B est donc correct. A est faux : pour un call européen sur une action sans dividende, plus de temps augmente la valeur dans tous les cas (plus de volatilité, et X payé plus tard, ce qui joue en faveur du call). C est faux : à la monnaie, l'effet volatilité domine nettement ; la time value y est maximale et augmente avec l'échéance.",
      ],
      // Variante plus difficile — long call + short put (forward synthétique) : quels facteurs jouent dans le même sens ?
      [
        "An investor buys a European call and writes a European put on the same commodity, with the same exercise price and expiration date. Other things equal, which pair of changes would each increase the value of the investor's combined position?",
        [
          "Higher storage costs for the commodity and a higher risk-free rate.",
          "Higher volatility of the commodity price and higher storage costs.",
          "Higher volatility of the commodity price and a higher convenience yield.",
        ],
        0,
        "Long call + short put (même X, même T) = long forward synthétique : la position gagne quand le call monte et quand le put baisse. Coûts de stockage plus élevés : call ↑ et put ↓, la position gagne. Taux sans risque plus élevé : le call paiera X plus tard (call ↑) et le put recevra X plus tard (put ↓), la position gagne aussi. A est donc correct. B est faux : la volatilité fait monter le call ET le put ; le gain sur le call acheté est compensé par la perte sur le put vendu, d'où un effet net nul (c − p = PV(F0 − X) ne dépend pas de la volatilité) ; seule la hausse des coûts de stockage joue. C est faux : la volatilité est sans effet net, et un convenience yield plus élevé est un bénéfice de détention, qui fait baisser le call et monter le put, donc baisser la position.",
      ],

      // Concept 3 — Put–call parity : positions synthétiques et arbitrage (officielle — R76 Q4)
      [
        "Using put-call parity, it can be shown that a synthetic European put can be created by a portfolio that is:",
        [
          "short the stock, long the call, and long a pure discount bond that pays the exercise price at option expiration.",
          "short the stock, long the call, and short a pure discount bond that pays the exercise price at option expiration.",
          "long the stock, short the call, and short a pure discount bond that pays the exercise price at option expiration.",
        ],
        0,
        "De S + p = c + PV(X), on tire p = c − S + PV(X) : long call, short action et long zéro-coupon qui paie X (on prête PV(X)). A est donc correct. B est faux : le zéro-coupon doit être détenu (+ PV(X)), pas émis. C est faux : il inverse tous les signes et réplique un short put. Astuce : on isole le put dans S + p = c + PV(X) ; chaque terme qui garde un signe + est une position longue, chaque terme avec un signe − une position courte (prêter PV(X) = acheter le zéro-coupon).",
      ],
      // Variante angle différent — comparer fiduciary call et protective put : parité violée, sens de l'arbitrage et profit
      [
        "A stock trades at 40. A one-year European call with an exercise price of 42 is priced at 3.00, and the European put with the same exercise price and expiration is priced at 4.50. The annual risk-free rate is 5%. To exploit the mispricing, an arbitrageur should most likely:",
        [
          "buy the stock and the put, write the call and borrow 40.00, for a profit today of 1.50.",
          "sell the stock short, write the put, buy the call and lend 40.00, for a profit today of 1.50.",
          "buy the stock and the put, write the call and borrow 42.00, for a profit today of 0.50.",
        ],
        1,
        "On compare les deux portefeuilles de la parité. Fiduciary call : c + PV(X) = 3,00 + 42 / 1,05 = 3,00 + 40,00 = 43,00. Protective put : S + p = 40 + 4,50 = 44,50. Mêmes payoffs à l'échéance, mais le protective put coûte 1,50 de plus : on vend le côté cher (vendre l'action à découvert, écrire le put) et on achète le côté bon marché (acheter le call, prêter PV(X) = 40,00). Flux aujourd'hui : +40 + 4,50 − 3,00 − 40,00 = +1,50, et les positions se compensent exactement à l'échéance. B est donc correct. A est faux : c'est l'arbitrage inverse ; il achète le côté cher et coûte 1,50 aujourd'hui au lieu de les rapporter. C est faux : en oubliant d'actualiser X (c + X = 45,00 contre 44,50), on croit à tort le fiduciary call trop cher et on part dans le mauvais sens ; les 0,50 encaissés aujourd'hui sont illusoires, car il faudrait rembourser 42 x 1,05 = 44,10 à l'échéance alors que les positions ne rapportent que 42.",
      ],
      // Variante plus difficile — la firme vue comme des options : dette = zéro-coupon sans risque − put, equity = call, conflit sur la volatilité
      [
        "A firm's assets are worth 100 and it has a single zero-coupon debt issue with a face value of 80, due in one year. The annual risk-free rate is 5%, and a one-year European put on the firm's assets with an exercise price of 80 is worth 2.00. Using the option view of the firm, which statement is most accurate?",
        [
          "Debt is worth 78.00 and equity 22.00; higher asset volatility would transfer value from shareholders to creditors.",
          "Debt is worth 74.19 and equity 25.81; higher asset volatility would raise the value of both the debt and the equity.",
          "Debt is worth 74.19 and equity 25.81; higher asset volatility would transfer value from creditors to shareholders.",
        ],
        2,
        "Les créanciers reçoivent min(VT ; D) : c'est un zéro-coupon sans risque qui paie D, moins un put sur les actifs de strike D (la perte en cas de défaut). Dette = 80 / 1,05 − 2,00 = 76,19 − 2,00 = 74,19. Les actionnaires reçoivent max(0 ; VT − D) : c'est un call sur les actifs de strike D. Equity = 100 − 74,19 = 25,81, ce que confirme la put-call parity : c = V + p − PV(D) = 100 + 2,00 − 76,19 = 25,81. Une volatilité plus forte des actifs fait monter le call (equity) et le put, donc baisser la dette (short put) : la valeur passe des créanciers aux actionnaires. C est donc correct. A est faux : 78,00 = 80 − 2,00 oublie d'actualiser la valeur faciale, et le sens du transfert est inversé. B est faux : les valeurs sont justes, mais la dette contient un put vendu, qui perd quand la volatilité augmente ; la valeur totale V ne change pas, donc ce que gagne l'equity est pris aux créanciers.",
      ],

      // Concept 4 — Put–call–forward parity (officielle — R76 Q10)
      [
        "The relationship referred to as put-call-forward parity states that at time = 0, if there is no arbitrage opportunity, the value of a call at X on an asset that has no holding costs or benefits plus the present value of X is equal to:",
        [
          "the asset price minus the value of a put option at X.",
          "the value of a put option at X plus the present value of the forward contract price.",
          "the forward contract price plus the value of a put option at X.",
        ],
        1,
        "Dans la put-call-forward parity, l'action est remplacée par une action synthétique : long forward + zéro-coupon qui paie F0(T). D'où c0 + PV(X) = p0 + PV(F0(T)). B est donc correct. C est faux : c'est la valeur actuelle du prix forward qui intervient, pas le prix forward lui-même. A est faux : le put s'ajoute au sous-jacent (protective put), il ne se retranche pas ; et c'est PV(F0(T)) qui remplace le spot.",
      ],
      // Variante angle différent — calcul inversé : retrouver le prix forward à partir du call et du put
      [
        "A one-year European call and a one-year European put on an asset with no holding costs or benefits both have an exercise price of 100. The call is priced at 8.40 and the put at 3.20, and the annual risk-free rate is 5%. The forward price for delivery in one year implied by put-call-forward parity is closest to:",
        ["94.54.", "105.20.", "105.46."],
        2,
        "Put-call-forward parity : c0 − p0 = (F0(T) − X) / (1 + Rf)^T. D'où F0(T) = X + (c0 − p0) x (1 + Rf)^T = 100 + (8,40 − 3,20) x 1,05 = 100 + 5,46 = 105,46. Le call vaut plus que le put, donc le prix forward est au-dessus du prix d'exercice. C est donc correct. B est faux : 105,20 = X + (c − p) oublie que l'écart c − p est une valeur actuelle ; il faut le capitaliser pour obtenir un écart de prix payé à l'échéance. A est faux : 94,54 inverse le signe ; un call plus cher que le put suppose F0(T) > X, pas l'inverse.",
      ],
      // Variante plus difficile — enchaîner cost of carry et put-call-forward parity, avec le piège « c = p quand X = S0 »
      [
        "A stock that pays no dividends trades at 50, and the annual risk-free rate is 4%. A one-year European call with an exercise price of 50 is priced at 4.10. Using the one-year forward price on the stock and put-call-forward parity, the value of the one-year European put with an exercise price of 50 is closest to:",
        ["4.10.", "2.10.", "2.18."],
        2,
        "1) Prix forward sans coût ni bénéfice de détention : F0(T) = S0 x (1 + Rf)^T = 50 x 1,04 = 52. 2) Put-call-forward parity : c0 − p0 = (F0(T) − X) / (1 + Rf)^T = (52 − 50) / 1,04 = 1,923. 3) p0 = 4,10 − 1,923 = 2,18. Contrôle par la put-call parity : p = c − S + PV(X) = 4,10 − 50 + 50 / 1,04 = 2,18. C est donc correct. A est faux : 4,10 suppose c = p parce que l'option est à la monnaie au comptant (X = S0) ; or l'égalité c = p ne vaut que si X = F0(T), et ici F0(T) = 52 > 50, donc le call vaut plus que le put. B est faux : 2,10 = 4,10 − (52 − 50) oublie d'actualiser l'écart F0(T) − X, qui n'est payé qu'à l'échéance.",
      ],

      // Concept 5 — Modèle binomial à une période : hedge ratio, actualisation au taux sans risque, probabilités risque-neutres (officielle — R77 Q3)
      [
        "We can use the risk-free rate to value an option with a one-period binomial model because:",
        [
          "combining options with the underlying asset in a specific ratio will produce a risk-free future payment.",
          "combining put and call options in specific ratio can produce a risk-free future payment.",
          "options investors are risk-neutral, on average.",
        ],
        0,
        "En combinant l'option avec h unités de l'underlying (le hedge ratio), on obtient un portefeuille dont la valeur à l'échéance est la même en hausse et en baisse : ce paiement certain s'actualise au taux sans risque. A est donc correct. B est faux : la couverture se fait avec l'underlying, pas en combinant des puts et des calls. C est faux : le modèle ne suppose pas que les investisseurs soient risk-neutral ; les probabilités risque-neutres sont des pseudo-probabilités tirées de l'arbitrage.",
      ],
      // Variante angle différent — comparaison : deux analystes aux probabilités réelles différentes
      [
        "Two analysts value the same European call option with a one-period binomial model, using the same current stock price, up and down factors, exercise price and risk-free rate. The first analyst believes the actual probability of an up move is 70%, and the second believes it is 40%. Compared with the second analyst's value, the first analyst's value of the call will be:",
        ["higher.", "the same.", "lower."],
        1,
        "Le modèle binomial ne se sert pas des probabilités réelles. La valeur de l'option vient de l'arbitrage : un portefeuille action + option dans le ratio h est sans risque, donc actualisé au taux sans risque ; de façon équivalente, on pondère les payoffs par les probabilités risque-neutres πu = (1 + Rf − Rd) / (Ru − Rd), qui ne dépendent que de u, d et Rf. Avec les mêmes S0, u, d, X et Rf, les deux analystes trouvent donc la même valeur. B est donc correct. A est faux : une probabilité réelle de hausse plus forte augmenterait l'espérance du payoff, mais ce n'est pas elle qui fixe le prix de l'option ; elle est déjà intégrée dans le cours actuel de l'action. C est faux pour la même raison : une probabilité réelle différente ne change pas la valeur de non-arbitrage.",
      ],
      // Variante plus difficile — put binomial : probabilités risque-neutres, donnée-piège (probabilité réelle) et sens du hedge
      [
        "A stock trades at 40 and, in one year, will either rise by a factor of 1.25 or fall by a factor of 0.80. The annual risk-free rate is 5%, and analysts estimate the actual probability of an up move at 60%. For a one-year European put with an exercise price of 42, the no-arbitrage value and the hedge for an investor who holds the put are closest to:",
        [
          "4.23, and the hedge requires buying 0.56 share per put held.",
          "3.81, and the hedge requires buying 0.56 share per put held.",
          "4.23, and the hedge requires selling 0.56 share per put held.",
        ],
        0,
        "S+ = 40 x 1,25 = 50 et S− = 40 x 0,80 = 32 ; payoffs du put (X = 42) : p+ = 0 et p− = 10. Probabilité risque-neutre : πu = (1,05 − 0,80) / (1,25 − 0,80) = 0,25 / 0,45 = 0,556, et πd = 0,444. p0 = (0,556 x 0 + 0,444 x 10) / 1,05 = 4,23. Hedge : h = (p+ − p−) / (S+ − S−) = (0 − 10) / 18 = −0,556 ; le signe négatif indique qu'on couvre un put détenu en achetant 0,556 action par put. Vérification : 0,556 x 50 = 27,78 en hausse et 10 + 0,556 x 32 = 27,78 en baisse ; V0 = 27,78 / 1,05 = 26,46 et p0 = V0 − hS0 = 26,46 − 22,22 = 4,23 (même résultat). A est donc correct. B est faux : 3,81 = 0,40 x 10 / 1,05 utilise la probabilité réelle (60 % de hausse, donc 40 % de baisse), donnée-piège dont le modèle n'a pas besoin. C est faux : le put détenu gagne déjà quand l'action baisse ; vendre des actions à découvert ajouterait une seconde position baissière au lieu de la compenser. C'est un call vendu (short call + long action) qui se couvre aussi en achetant des actions ; un call détenu, lui, se couvre en vendant des actions.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Derivatives Page 5...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
