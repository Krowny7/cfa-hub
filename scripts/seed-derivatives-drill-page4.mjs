// Seed script — quiz de "drill" associé à la page 4 de la fiche PDF Derivatives
// (FRAs · Futures & Swap Pricing · Option Moneyness, Readings 70 à 73 de la
// fiche, soit les Readings 72 à 75 de la banque de pratique : décalage de +2).
// Structure : pour chacun des 5 concepts clés de la page, 1 question officielle
// (banque de pratique Derivatives, corrigé vérifié contre "- Answers.pdf") +
// 1 variante "angle différent" (même notion, mais jamais un simple changement
// de chiffres menant au même raisonnement) + 1 variante "plus difficile"
// (raisonnement à plusieurs étapes / pièges combinés / notion connexe de la
// page). Voir memory regle-drill-variantes-cfa-hub. Questions en anglais,
// explications en français.
// Les 5 questions officielles ne sont PAS celles imprimées dans le PDF
// (R72 Q2, R73 Q1 et Q3, R74 Q4, R75 Q3) : l'utilisateur les a déjà sur papier.
// Usage: node scripts/seed-derivatives-drill-page4.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Derivatives (Système)";

const QUIZ_SETS = [
  {
    title: "Derivatives — Drill Fiche Page 4 (FRAs · Futures & Swap Pricing · Option Moneyness)",
    difficulty: 1,
    questions: [
      // Concept 1 — FRA vs interest rate futures : convexité du FRA, linéarité du futures (officielle — R73 Q6)
      [
        "Compared to an interest rate futures contract, an otherwise equivalent forward rate agreement will:",
        [
          "have greater volatility.",
          "have greater payments for a given decrease in interest rates.",
          "exhibit greater convexity.",
        ],
        2,
        "Le paiement d'un FRA est actualisé au MRR réalisé jusqu'au début de la période d'intérêt : il n'est pas linéaire, il présente de la convexité. Le futures de taux, lui, est linéaire : chaque point de base vaut toujours le même montant, à la hausse comme à la baisse. C est donc correct. B est faux : pour une baisse de taux, le FRA paie un peu moins que le futures, car le montant est actualisé (49,3852 contre 50 dans l'exemple de la fiche). A est faux : la différence entre les deux contrats tient à la convexité, pas à une volatilité plus forte.",
      ],
      // Variante angle différent — le « pourquoi » : d'où vient la convexité du FRA ?
      [
        "Which of the following best explains why a forward rate agreement exhibits convexity while an otherwise equivalent interest rate futures contract does not?",
        [
          "The FRA settlement amount is discounted at the realized MRR, so the value of a one-basis-point change depends on the level of rates, whereas the futures pays a fixed amount per basis point.",
          "The FRA is marked to market daily, so its gains are reinvested at the prevailing interest rate, whereas the futures is settled only at expiration.",
          "The futures is quoted as 100 minus the rate, so its price moves in the opposite direction to rates, whereas the FRA payoff moves in the same direction as rates.",
        ],
        0,
        "Le FRA est réglé au début de la période d'intérêt : le différentiel (MRR − taux du FRA) x jours/360 x NP est actualisé au MRR réalisé, en le divisant par 1 + MRR x jours/360. Plus le MRR est haut, plus l'actualisation est forte : pour le long, un point de base de hausse rapporte un peu moins qu'un point de base de baisse ne coûte (fiche : +1 bp reçoit 49,3803, −1 bp paie 49,3852). Le payoff n'est donc pas linéaire en taux : c'est la convexité, qui croît avec la maturité. Le futures, lui, vaut toujours BPV = notionnel x période x 0,01 % par point de base (50 pour 1 M sur 6 mois), à la hausse comme à la baisse : il est linéaire. A est donc correct. B est faux : il inverse les rôles ; c'est le futures qui est marqué au marché chaque jour, le FRA est un contrat OTC réglé une seule fois. C est faux : la cotation 100 − MRR change seulement le sens du gain (le long futures gagne quand les taux baissent) ; elle ne rend pas le payoff non linéaire, et un sens de variation opposé n'est pas de la convexité.",
      ],
      // Variante plus difficile — long FRA + long futures de taux : signes opposés et écart dû à l'actualisation du FRA
      [
        "A bank enters a long 3 × 9 FRA (a six-month interest period, using 180/360) on a notional of $10 million at an FRA rate of 2.00%. On the same day, it buys an interest rate futures contract on six-month MRR with the same notional and the same timing, at a price of 98.00. At the FRA expiration three months later, six-month MRR is 2.60%. Ignoring the timing of daily margin flows, the combined gain or loss on the two positions is closest to:",
        ["+$59,615.", "$0.", "-$385."],
        2,
        "FRA (le long est payeur fixe et gagne si les taux montent) : différentiel (2,60 % − 2,00 %) x 180/360 x 10 M = 30 000 $, réglé au début de la période d'intérêt, donc actualisé au MRR réalisé : 30 000 / (1 + 0,026 x 0,5) = 30 000 / 1,013 = 29 615 $ reçus. Futures : cours final 100 − 2,60 = 97,40, soit 60 points de base sous le prix d'achat de 98,00 ; BPV = 10 M x 0,5 x 0,0001 = 500 $ par point de base, et le long futures perd quand les taux montent : −60 x 500 = −30 000 $. Total : 29 615 − 30 000 = −385 $. Les deux positions se compensent presque (un long futures de taux se comporte comme un short FRA) ; l'écart de 385 $ vient de l'actualisation du FRA, source de sa convexité. C est donc correct. A est faux : +59 615 $ suppose que le long futures gagne lui aussi quand les taux montent, alors que son prix (100 − MRR) baisse. B est faux : 0 $ suppose que le FRA paie 30 000 $ comme le futures, en oubliant que le différentiel est réglé en début de période et donc actualisé.",
      ],

      // Concept 2 — Prix forward vs prix futures : corrélation taux / underlying (officielle — R73 Q2)
      [
        "Bea Moran wants to establish a long derivatives position in a commodity she will need to acquire in six months. Moran observes that the six-month forward price is 45.20 and the six-month futures price is 45.10. This difference most likely suggests that for this commodity:",
        [
          "long investors should prefer futures contracts to forward contracts.",
          "futures prices are negatively correlated with interest rates.",
          "there is an arbitrage opportunity among forward, futures, and spot prices.",
        ],
        1,
        "Un prix futures inférieur au prix forward signale une corrélation négative entre le prix de l'underlying et les taux : le long doit verser des marges quand les taux montent et encaisse ses gains quand ils baissent, ce qui rend le futures moins attractif, donc moins cher. B est donc correct. A est faux : l'écart de prix compense justement cet effet ; il n'indique pas qu'un contrat soit préférable à l'autre. C est faux : cet écart s'explique par le mark-to-market quotidien et ne crée pas d'arbitrage.",
      ],
      // Variante angle différent — autre exemple de la catégorie : futures sur obligation, prix corrélé négativement aux taux
      [
        "A portfolio manager compares a futures contract and an otherwise identical forward contract without central clearing on a 10-year government bond. Because bond prices fall when interest rates rise, the manager should most likely expect the:",
        [
          "futures price to be below the forward price, because the long futures must fund margin calls when rates are high and reinvests its gains when rates are low.",
          "futures price to be above the forward price, because daily settlement allows the long to reinvest its gains as soon as they occur.",
          "futures price to equal the forward price, because both contracts are written on the same bond with the same expiration.",
        ],
        0,
        "Pour un futures sur obligation, le prix de l'underlying est corrélé négativement aux taux. Quand les taux montent, l'obligation baisse : le long futures subit des appels de marge qu'il doit financer au moment où emprunter coûte cher ; quand les taux baissent, il encaisse des gains qu'il ne peut replacer qu'à des taux bas. Le mark-to-market quotidien joue donc contre lui : le futures est moins attractif que le forward (réglé une seule fois, à l'échéance) et son prix est plus bas. A est donc correct. B est faux : réinvestir ses gains au fil de l'eau n'avantage le long que si ces gains arrivent quand les taux sont hauts, c'est-à-dire en cas de corrélation positive, pas ici. C est faux : prix futures et prix forward ne sont égaux que si les taux sont constants ou non corrélés au prix de l'underlying ; avoir le même underlying et la même échéance ne suffit pas. En pratique l'écart reste faible, sauf sur les maturités longues.",
      ],
      // Variante plus difficile — price vs value : futures remis à zéro par le MTM, forward dont la valeur (actualisée) s'accumule jusqu'à l'échéance
      [
        "A trader goes long one futures contract at 45.10 and one forward contract at 45.20, each on 1,000 units of the same commodity and each expiring in six months. One month later, after that day's settlement, the futures settlement price is 46.00 and the forward price for the same expiration date is 46.10. The annual risk-free rate is 3%. At that point, the values of the futures contract and of the forward contract to the trader are closest to:",
        ["futures: $900; forward: $889.", "futures: $0; forward: $900.", "futures: $0; forward: $889."],
        2,
        "Futures : le mark-to-market a déjà crédité le gain (46,00 − 45,10) x 1 000 = 900 $ sur le compte de marge et remis le prix du contrat au settlement price de 46,00 ; après le règlement du jour, la valeur du futures revient à 0. Forward : le prix reste 45,20 jusqu'à l'échéance et le gain n'est réglé qu'en T ; sa valeur aujourd'hui est la valeur actuelle de l'écart entre le nouveau prix forward et le prix du contrat, sur les cinq mois restants : (46,10 − 45,20) x 1 000 / 1,03^(5/12) = 900 / 1,01239 = 889 $. C est donc correct. A est faux : 900 $ pour le futures confond le gain déjà encaissé en marge avec la valeur du contrat, nulle après le MTM. B est faux : 900 $ pour le forward oublie d'actualiser un gain qui ne sera reçu qu'à l'échéance. Remarque : au départ, le prix futures (45,10) inférieur au prix forward (45,20) signalait une corrélation négative entre les taux et le prix de la commodity ; cela ne change rien au calcul des valeurs.",
      ],

      // Concept 3 — Swap : price (par swap rate fixé à l'initiation) vs value (varie avec les taux attendus) (officielle — R74 Q3)
      [
        "The price of a fixed-for-floating interest rate swap contract:",
        [
          "may vary over the life of the contract.",
          "is established at contract initiation.",
          "is directly related to changes in the floating rate.",
        ],
        1,
        "Le prix d'un swap est son taux fixe (par swap rate), fixé à l'initiation pour que la valeur du swap soit nulle, puis constant pendant toute la vie du contrat. B est donc correct. A est faux : c'est la valeur du swap qui varie ensuite avec les taux attendus, pas son prix. C est faux : les variations du taux flottant modifient la valeur du swap (à la hausse pour le payeur fixe quand les taux montent), pas son prix.",
      ],
      // Variante angle différent — comparaison avant / après une hausse des taux attendus : qui gagne, et le price bouge-t-il ?
      [
        "Six months after a company entered a five-year pay-fixed interest rate swap, the market's expectations of future MRR have risen. Compared with the situation at initiation, which statement is most accurate?",
        [
          "The swap price has risen, and the swap now has a positive value to the company.",
          "The swap price is unchanged, and the swap now has a positive value to the company.",
          "The swap price is unchanged, and the swap now has a negative value to the company, because it must make larger floating-rate payments.",
        ],
        1,
        "Le price du swap est son taux fixe (par swap rate), fixé à l'initiation pour que PV(fixe) = PV(flottants attendus) et que la valeur soit nulle ; il ne bouge plus jusqu'à l'échéance. Ce qui change ensuite, c'est la value. La société paie le fixe et reçoit le flottant : si les MRR attendus montent, la valeur actuelle des flottants qu'elle recevra augmente alors que ses paiements fixes restent les mêmes, donc value = PV(flottant) − PV(fixe) > 0 pour elle. B est donc correct. A est faux : le taux fixe d'un swap en cours ne change pas ; seul le par swap rate d'un nouveau swap conclu aujourd'hui serait plus élevé. C est faux : il inverse les flux ; le payeur fixe reçoit le flottant, il ne le paie pas, donc une hausse des taux attendus lui profite (c'est le receveur fixe qui perd).",
      ],
      // Variante plus difficile — par swap rate à partir des spot rates, puis value du payeur fixe à une date de reset
      [
        "A three-year swap with annual payments and a notional of $50 million is priced off spot rates of 2.0% (one year), 2.5% (two years) and 3.0% (three years). One year later, immediately after the first payment, the one-year and two-year spot rates are 3.0% and 3.5%. The swap's fixed rate at initiation and its value to the fixed-rate payer one year later are closest to:",
        ["2.98% and +$0.49 million.", "3.00% and +$0.47 million.", "2.98% and -$0.49 million."],
        0,
        "1) Price à l'initiation. DF = 1 / 1,02 = 0,98039 ; 1 / 1,025² = 0,95181 ; 1 / 1,03³ = 0,91514 ; somme = 2,84735. Par swap rate s0 = (1 − DF3) / Σ DF = (1 − 0,91514) / 2,84735 = 2,98 %. 2) Un an plus tard, il reste deux paiements. Nouveaux DF = 1 / 1,03 = 0,97087 et 1 / 1,035² = 0,93351, somme 1,90438 ; nouveau par swap rate st = (1 − 0,93351) / 1,90438 = 3,49 %. 3) Value du payeur fixe à une date de reset = (st − s0) x Σ DF x NP = (3,49 % − 2,98 %) x 1,90438 x 50 M ≈ +0,49 M$ (calcul exact : 486 686 $). Contrôle : PV(flottant) = 50 M (un FRN revient au pair à une date de reset) et PV(fixe) = 50 M x (0,0298 x 1,90438 + 0,93351) = 49,51 M, d'où +0,49 M$. A est donc correct. B est faux : il prend le spot à trois ans (3,00 %) pour le taux du swap ; le par swap rate est le coupon d'une obligation au pair, qui pondère tous les DF (ici 2,98 %) ; avec 3,00 %, on obtiendrait ensuite (3,49 % − 3,00 %) x 1,90438 x 50 M ≈ 0,47 M$. C est faux : le signe est inversé ; les taux ont monté, le payeur fixe paie désormais un taux inférieur au marché et sa value est positive (c'est le receveur fixe qui perd 0,49 M$).",
      ],

      // Concept 4 — Swap répliqué par des obligations : payeur flottant = emprunter en flottant + acheter du fixe (officielle — R74 Q2)
      [
        "An investor could best replicate the position of the floating rate payer in a swap by:",
        [
          "borrowing at a floating rate and entering a series of zero-value FRAs.",
          "borrowing at a floating rate and buying a fixed-rate bond.",
          "borrowing at a fixed rate and entering a series of zero-value FRAs.",
        ],
        1,
        "Le payeur flottant reçoit le fixe : c'est le receveur fixe, équivalent à émettre un FRN (emprunter à taux variable) et à acheter une obligation à taux fixe. B est donc correct. A est faux : une série de FRAs peut répliquer le swap, mais pas des FRAs de valeur nulle, qui auraient chacun un taux fixe différent, alors que le swap paie le même taux à chaque date. C est faux : emprunter à taux fixe correspond à la position du payeur fixe, l'inverse de celle demandée.",
      ],
      // Variante angle différent — le « pourquoi » côté duration : receveur fixe = long obligation fixe + short FRN
      [
        "A bond portfolio manager enters a receive-fixed, pay-floating interest rate swap. The most likely effect on the portfolio's duration, and the reason, is that duration:",
        [
          "increases, because the swap is equivalent to buying a fixed-rate bond and issuing a floating-rate note, whose duration is close to zero.",
          "decreases, because the manager now pays a floating rate that resets as market rates change.",
          "is unchanged, because the swap has a zero value at initiation.",
        ],
        0,
        "Recevoir le fixe et payer le flottant revient à acheter une obligation à taux fixe (duration proche de sa maturité) financée par l'émission d'un FRN, dont la duration est quasi nulle puisque son coupon est révisé à chaque reset. La duration nette ajoutée est donc positive : la duration du portefeuille augmente (fiche : receveur fixe ⇒ duration ↑). A est donc correct. B est faux : payer du flottant ne réduit presque pas la duration, car le FRN revient au pair à chaque reset ; c'est le payeur fixe (émettre du fixe, acheter du flottant) qui réduit la duration. C est faux : une valeur nulle à l'initiation ne signifie pas une sensibilité nulle aux taux ; dès que les taux bougent, la valeur du swap varie comme celle d'une obligation fixe financée à taux variable.",
      ],
      // Variante plus difficile — transformer une dette flottante en dette fixe : coût net, équivalence obligataire et piège des FRAs de valeur nulle
      [
        "A company has issued a $100 million floating-rate note paying MRR + 1.0% and enters a swap on the same notional in which it pays a fixed rate of 3.0% and receives MRR. Which statement is most accurate?",
        [
          "Its net borrowing cost is now fixed at 3.0%, because the floating receipts on the swap exactly offset the coupons on the note.",
          "Its net borrowing cost is now fixed at 4.0%, and the swap could equally be replicated by a series of FRAs that each have a zero value at initiation.",
          "Its net borrowing cost is now fixed at 4.0%, the combined position is equivalent to having issued a fixed-rate bond, and the swap gains value if expected future MRR rises.",
        ],
        2,
        "Flux nets de la société : elle paie MRR + 1,0 % sur le FRN, reçoit MRR et paie 3,0 % sur le swap. Le MRR s'annule : coût net = 3,0 % + 1,0 % = 4,0 %, fixe. Le payeur fixe d'un swap équivaut à émettre une obligation à taux fixe et à acheter un FRN ; ajouté au FRN déjà émis, cet achat neutralise la dette flottante et il reste une dette à taux fixe. Enfin, le payeur fixe reçoit le flottant : si les MRR attendus montent, la value du swap augmente pour lui. C est donc correct. A est faux : le MRR reçu compense le MRR du FRN mais pas le spread de 1,0 %, que la société continue de payer. B est faux : le coût de 4,0 % est juste, mais les FRAs qui répliquent le swap ont tous le même taux fixe (3,0 %) ; comme les forward rates implicites diffèrent d'une date à l'autre, chaque FRA a une valeur non nulle à l'initiation, seule leur somme est nulle.",
      ],

      // Concept 5 — Moneyness d'un call et d'un put, exercise value et time value (officielle — R75 Q11)
      [
        "An investor holds two options on the same underlying stock, a call option with an exercise price of 25 and a put option with an exercise price of 30. If the market price of the stock is 27:",
        [
          "only one of the options is in the money.",
          "both options are in the money.",
          "neither option is in the money.",
        ],
        1,
        "Le call (X = 25) est dans la monnaie car S = 27 > 25 : il permet d'acheter 2 sous le cours. Le put (X = 30) l'est aussi car S = 27 < 30 : il permet de vendre 3 au-dessus du cours. B est donc correct. A et C sont faux : avec des prix d'exercice différents, un call et un put peuvent être dans la monnaie en même temps ; c'est impossible seulement s'ils ont le même X.",
      ],
      // Variante angle différent — calcul inversé : retrouver le cours à partir de la prime et de la time value d'un put
      [
        "A put option with an exercise price of 50 trades at a premium of 6.20, of which 1.70 is time value. The current price of the underlying stock is closest to:",
        ["45.50.", "54.50.", "43.80."],
        0,
        "Prime = exercise value + time value, donc exercise value = 6,20 − 1,70 = 4,50. Elle est positive : le put est dans la monnaie, ce qui suppose S < X. Pour un put, exercise value = X − S, d'où S = 50 − 4,50 = 45,50. A est donc correct. B est faux : 54,50 = X + 4,50 applique la logique d'un call (S − X) ; à 54,50, le put serait hors de la monnaie, sa valeur d'exercice serait nulle et toute la prime (6,20) serait de la time value, pas 1,70. C est faux : 43,80 = X − prime traite toute la prime comme valeur d'exercice et oublie la time value ; à 43,80, la valeur d'exercice serait 6,20 et la time value nulle.",
      ],
      // Variante plus difficile — trois options sur la même action : moneyness, time value totale et valeur à l'expiration
      [
        "A stock trades at 37. A call with an exercise price of 40 is priced at 1.10, a call with an exercise price of 35 at 3.40, and a put with an exercise price of 40 at 3.90; all three options expire on the same date. The total time value of the three options today, and their total value at expiration if the stock price is still 37 at that date, are closest to:",
        ["6.40 and 2.00.", "3.40 and 8.40.", "3.40 and 5.00."],
        2,
        "Moneyness et exercise value à S = 37 : le call 40 est hors de la monnaie (S < X), exercise value 0, time value 1,10 (toute la prime) ; le call 35 est dans la monnaie de 2, time value 3,40 − 2 = 1,40 ; le put 40 est dans la monnaie de 3 (S < X), time value 3,90 − 3 = 0,90. Time value totale : 1,10 + 1,40 + 0,90 = 3,40. À l'expiration, la time value tombe à zéro et chaque option ne vaut que son exercise value : 0 + 2 + 3 = 5,00. C est donc correct. A est faux : il traite le put 40 comme hors de la monnaie (exercise value 0), ce qui gonfle la time value (1,10 + 1,40 + 3,90 = 6,40) et ne laisse que 2,00 à l'expiration ; or un put est dans la monnaie quand S < X. B est faux : la time value de 3,40 est juste, mais 8,40 suppose que les options gardent toute leur prime jusqu'à l'échéance, alors que la time value disparaît à l'expiration.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Derivatives Page 4...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
