// Seed script — quiz de "drill" associé à la page 1 de la fiche PDF Alternative
// Investments (Features, Methods & Structures · Performance & Returns,
// Readings 76 et 77 de la fiche, soit les Readings 78 et 79 de la banque de
// pratique : décalage de +2). Structure : pour chacun des 5 concepts clés de la
// page, 1 question officielle (banque de pratique Alternative Investment,
// corrigé vérifié contre "- Answers.pdf") + 1 variante "angle différent" (même
// notion, mais jamais un simple changement de chiffres menant au même
// raisonnement) + 1 variante "plus difficile" (raisonnement à plusieurs
// étapes / pièges combinés / notion connexe de la page). Voir memory
// regle-drill-variantes-cfa-hub. Questions en anglais, explications en
// français.
// Les 5 questions officielles ne sont PAS celles imprimées dans le PDF
// (R78 Q13, Q16 et Q18, R79 Q1 et Q3) : l'utilisateur les a déjà sur papier.
// Usage: node scripts/seed-alternatives-drill-page1.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Alternative Investments (Système)";

const QUIZ_SETS = [
  {
    title: "Alternative Investments — Drill Fiche Page 1 (Features, Methods & Structures · Performance & Returns)",
    difficulty: 1,
    questions: [
      // Concept 1 — Caractéristiques des alternatives vs investissements traditionnels (levier, illiquidité, asymétrie d'information) (officielle — R78 Q5)
      [
        "Alternative investments most likely have which of the following characteristics compared to traditional investments?",
        [
          "Unique legal structures and tax treatments.",
          "Higher levels of regulation and transparency.",
          "Lower leverage and higher liquidity.",
        ],
        0,
        "Par rapport aux investissements traditionnels, les alternatives ont des structures juridiques et un traitement fiscal qui leur sont propres (limited partnerships, véhicules offshore, produits non enregistrés). A est donc correct. B est faux : elles sont en général moins régulées et moins transparentes. C est faux : c'est l'inverse, elles emploient souvent beaucoup de levier sur des marchés illiquides, avec une liquidité plus faible. À retenir aussi (fiche R76) : tickets plus gros, horizon plus long, expertise spécialisée, performance difficile à mesurer et frais plus élevés.",
      ],
      // Variante angle différent — le « pourquoi » : asymétrie d'information et performance fees
      [
        "Which of the following best explains why alternative investment funds typically charge performance fees in addition to management fees?",
        [
          "Alternative investments are heavily regulated and transparent, so investors can easily verify performance and are willing to pay for it.",
          "Managers hold more information than investors, so a fee tied to results helps align the manager's interests with those of the investors.",
          "Alternative investments are highly liquid, so investors can withdraw at any time and the fee compensates the manager for that flexibility.",
        ],
        1,
        "Les alternatives souffrent d'une asymétrie d'information : le gérant en sait bien plus que l'investisseur sur les positions, la valorisation et le risque pris, et la performance est difficile à mesurer (peu d'historique de rendement, valorisations par modèle). Une performance fee (carried interest, souvent soumise à un hurdle) lie la rémunération du gérant aux résultats et aligne ses intérêts sur ceux des investisseurs : B est donc correct. A est faux : c'est l'inverse, les alternatives sont en général moins régulées et moins transparentes, et c'est précisément ce manque de visibilité qui justifie l'alignement par les frais. C est faux : les alternatives sont peu liquides (lock-up, préavis de rachat, actifs illiquides) ; la performance fee ne rémunère pas une flexibilité de sortie mais le résultat, alors que le management fee est dû quelle que soit la performance.",
      ],
      // Variante plus difficile — levier : effet sur le rendement de l'equity, gains et pertes amplifiés (formule rL de la fiche R77)
      [
        "A hedge fund invests $150 million, made up of $100 million of investor equity and $50 million borrowed at 4% per year. Ignoring fees, the return on the investors' equity if the assets return +10% for the year, and if instead they return -8%, would be closest to:",
        ["15.0% and -12.0%.", "12.0% and -12.0%.", "13.0% and -14.0%."],
        2,
        "Formule de la fiche : rL = [r x (VC + VB) - VB x rB] / VC, avec VC = equity (100 M$), VB = emprunt (50 M$) et rB = coût de l'emprunt (4 %). Les actifs totaux valent 150 M$. Scénario +10 % : gain sur les actifs 0,10 x 150 = 15 M$, intérêts 0,04 x 50 = 2 M$, gain net 13 M$ sur 100 M$ d'equity, soit +13,0 %. Scénario -8 % : perte sur les actifs 0,08 x 150 = 12 M$, intérêts toujours dus 2 M$, perte totale 14 M$, soit -14,0 % : le levier amplifie les gains ET les pertes, et le coût de l'emprunt s'ajoute à la perte (une telle chute peut en outre déclencher des margin calls, donc des ventes forcées). C est donc correct. A est faux : 15,0 % et -12,0 % oublient les intérêts (c'est 1,5 fois le rendement des actifs). B est faux : 12,0 % et -12,0 % pondèrent par la dette rapportée aux actifs (50 / 150) au lieu de la dette rapportée à l'equity (50 / 100) : r + (r - rB) x 50/150 donne 12,0 % et -12,0 %, alors que r + (r - rB) x 50/100 donne 13,0 % et -14,0 %.",
      ],

      // Concept 2 — Direct investing, co-investissement et fund investing (contrôle, due diligence, frais, diversification) (officielle — R78 Q15)
      [
        "Compared to fund investing, direct investing most likely has:",
        ["more diversification.", "lower investment amounts.", "lower fees."],
        2,
        "Le direct investing évite les frais d'un gérant externe : l'investisseur ne paie ni management fee ni performance fee, alors qu'un fonds en facture. C est donc correct. A est faux : le direct investing offre la moins bonne diversification (l'investisseur ne détient que quelques actifs) ; c'est le fund investing qui donne accès à un pool diversifié. B est faux : le direct investing exige les tickets les plus élevés, alors que dans un fonds le coût est partagé avec d'autres investisseurs. Autre inconvénient du direct : il faut une expertise spécialisée pour évaluer les deals. Sur la fiche : due diligence maximale / moyenne / minimale et frais aucun / réduits / management + performance fees, respectivement pour le direct, le co-investissement et le fonds.",
      ],
      // Variante angle différent — comparaison : passer du fonds au co-investissement sur un deal
      [
        "An investor that has so far invested only through a manager's fund now also co-invests alongside that same manager in one specific deal. Compared with its fund investment, the co-investment most likely involves:",
        [
          "higher fees on that deal, because the investor now pays both the fund-level and the deal-level costs.",
          "lower fees on that deal, but heavier due diligence by the investor and a less diversified exposure.",
          "lighter due diligence, because the manager has already screened the deal, and broader diversification.",
        ],
        1,
        "Le co-investissement est une position intermédiaire entre le fonds et le direct : le gérant propose à l'investisseur de participer à un deal précis à ses côtés. Les frais y sont réduits (fiche : aucun frais en direct, frais réduits en co-investissement, management fee et performance fee dans le fonds) ; en contrepartie, l'investisseur doit faire une due diligence plus poussée (moyenne, contre minimale pour un fonds) et il concentre une partie de son capital sur un seul actif au lieu du pool diversifié du fonds. Il garde aussi un certain contrôle, limité à ce deal. B est donc correct. A est faux : le co-investissement est justement un moyen de réduire les frais. C est faux : même si le gérant a sélectionné le deal, l'investisseur doit le valider lui-même, et un actif unique est par nature moins diversifié que le fonds.",
      ],
      // Variante plus difficile — coût comparé fonds / co-investissement : calcul du rendement net et compromis frais contre concentration
      [
        "An investor can obtain a $10 million exposure to a private asset expected to return 15% over the coming year before fees. Through the manager's fund, the investor would pay a management fee of 2% of the $10 million and a performance fee of 20% of the gain, calculated independently of the management fee. Through a co-investment in the same asset, the fees would be reduced to 1% and 10%, calculated the same way. Which statement is most accurate?",
        [
          "The net return is 10.0% through the fund and 12.5% through the co-investment; the saving comes at the cost of a more concentrated exposure and more due diligence.",
          "The net return is 10.0% through the fund and 12.5% through the co-investment; the co-investment also gives broader diversification than the fund.",
          "The net return is 10.4% through the fund and 12.6% through the co-investment; the saving comes at the cost of a more concentrated exposure and more due diligence.",
        ],
        0,
        "Fonds : gain brut 15 % x 10 M$ = 1,5 M$ ; management fee 2 % x 10 = 0,2 M$ ; performance fee 20 % x 1,5 = 0,3 M$ (calculée indépendamment, donc sur le gain brut) ; frais totaux 0,5 M$ ; rendement net (1,5 - 0,5) / 10 = 10,0 %. Co-investissement : 1 % x 10 = 0,1 M$ ; 10 % x 1,5 = 0,15 M$ ; frais totaux 0,25 M$ ; rendement net (1,5 - 0,25) / 10 = 12,5 %. L'économie de 2,5 points a un prix : une exposition concentrée sur un seul actif et une due diligence à la charge de l'investisseur. A est donc correct. B a les bons chiffres mais se trompe sur la diversification : un actif unique est moins diversifié que le pool du fonds. C calcule la performance fee sur le gain net du management fee (convention « net of management fee ») alors que l'énoncé la veut indépendante : fonds 15 - 2 - 20 % x 13 = 10,4 % ; co-investissement 15 - 1 - 10 % x 14 = 12,6 %.",
      ],

      // Concept 3 — Structure des frais : management fee (AUM pour un hedge fund, committed capital pour le private capital) (officielle — R78 Q8)
      [
        "Hedge fund management fees are most commonly structured as a percentage of:",
        ["invested capital.", "assets under management.", "committed capital."],
        1,
        "Pour un hedge fund, le management fee se calcule en pourcentage des actifs sous gestion (AUM), en pratique la valeur nette d'inventaire du fonds. B est donc correct. A est faux : le capital investi n'est pas la base habituelle. C est faux : le committed capital est la base du management fee des fonds de private capital (private equity, venture capital), où le capital est engagé puis appelé en drawdown ; c'est le piège hedge fund contre private equity. Le management fee (1 à 2 % en général) est dû quelle que soit la performance, contrairement à la performance fee.",
      ],
      // Variante angle différent — calcul inversé : retrouver le committed capital à partir du management fee encaissé
      [
        "A private equity fund charges a management fee of 1.75% per year of committed capital and collected $5.25 million of management fees this year. The fund has so far drawn down 40% of the commitments. The fund's total committed capital is closest to:",
        ["$120 million.", "$750 million.", "$300 million."],
        2,
        "Dans un fonds de private capital, le management fee se calcule sur le committed capital (le capital engagé par les investisseurs), pas sur le capital déjà appelé : committed capital = frais / taux = 5,25 / 0,0175 = 300 M$. Le taux d'appel de 40 % est une donnée-piège : il sert seulement à connaître le capital investi (0,40 x 300 = 120 M$) et le dry powder, c'est-à-dire le capital engagé mais pas encore appelé (180 M$). C est donc correct. A est faux : 120 M$ est le capital déjà appelé (drawdown) ; ce serait la bonne base si la fee portait sur le capital investi, mais 1,75 % x 120 = 2,1 M$, pas 5,25 M$. B est faux : 750 M$ = 5,25 / (0,0175 x 0,40) applique la fee au capital appelé, alors que c'est le committed capital qui sert de base.",
      ],
      // Variante plus difficile — deux bases de frais à distinguer (AUM de fin d'année vs committed capital) avec données-pièges (AUM de début, capital appelé, valeur du portefeuille)
      [
        "Two funds each charge a 1.5% management fee. A hedge fund's net asset value rose from $80 million at the start of the year to $100 million at year-end, and its fee is based on year-end assets under management. A private equity fund has $50 million of capital commitments, of which $20 million has been drawn down; its portfolio is currently valued at $22 million. Total management fees charged by the two funds for the year are closest to:",
        ["$1.83 million.", "$2.25 million.", "$1.50 million."],
        1,
        "Hedge fund : la fee se calcule sur l'AUM, ici celui de fin d'année (énoncé) : 1,5 % x 100 = 1,50 M$ (et non sur les 80 M$ du début, qui donneraient 1,20 M$). Private equity : la fee se calcule sur le committed capital, soit 1,5 % x 50 = 0,75 M$, que le capital soit appelé ou non (ni sur les 20 M$ appelés, ni sur la valeur du portefeuille de 22 M$). Total : 1,50 + 0,75 = 2,25 M$. B est donc correct. A est faux : 1,83 M$ = 1,50 + 1,5 % x 22 (0,33) traite la valeur du portefeuille PE comme un AUM. C est faux : 1,50 M$ = 1,5 % x 80 (AUM de début, 1,20) + 1,5 % x 20 (capital appelé, 0,30) ; les deux bases sont erronées. Conséquence à retenir : comme la fee PE porte sur le committed capital, elle pèse alors qu'une partie seulement du capital est investie, d'où la J-curve (rendements négatifs pendant le commitment et le deployment).",
      ],

      // Concept 4 — Hurdle rate (soft / hard), catch-up, high-water mark et clawback (officielle — R78 Q9)
      [
        "An alternative investment fund generated an 18% return during 20X2. The manager has a 20% performance fee, subject to an 8% soft hurdle rate and a catch-up clause. What performance fee did the manager earn for 20X2?",
        ["3.6%.", "3.2%.", "2.0%."],
        0,
        "Le premier 8 % de rendement (le hurdle) revient à l'investisseur. Le catch-up donne ensuite au gérant les 2 % suivants, de sorte qu'il détienne 20 % des 10 % de gains (2 % sur 10 %). Les 8 % restants sont partagés 80/20 : 1,6 % pour le gérant. Total : 2 % + 1,6 % = 3,6 %, soit 20 % x 18 % : avec un hurdle soft et un catch-up complet, une fois le hurdle suffisamment dépassé, le gérant touche sa fee sur la totalité du gain. A est donc correct. C est faux : 2,0 % = 20 % x (18 % - 8 %), c'est le calcul d'un hard hurdle sans catch-up. B est faux : 3,2 % ne résulte d'aucun enchaînement cohérent hurdle, catch-up, partage 80/20 ; il sous-estime la fee car le catch-up doit ramener le gérant à 20 % de tous les gains. Rappel de la fiche : soft hurdle = fee sur tout le gain une fois le hurdle dépassé ; hard hurdle = fee seulement sur le gain au-dessus du hurdle (12 %, hurdle 8 %, fee 20 % : soft 2,4 %, hard 0,8 %).",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : sens de chaque clause (soft hurdle, high-water mark, clawback)
      [
        "Which of the following statements about performance fee provisions is least accurate?",
        [
          "With a soft hurdle rate, once the hurdle is exceeded the performance fee is charged on the entire gain, not just on the part above the hurdle.",
          "A high-water mark prevents the manager from earning a performance fee on gains that merely recover earlier losses.",
          "A clawback provision allows the manager to recover from investors performance fees that were underpaid on early deals.",
        ],
        2,
        "L'énoncé demande l'affirmation la moins exacte. A est exacte : avec un soft hurdle, dès que le hurdle est dépassé le gérant touche sa fee sur tout le gain (avec un hard hurdle, seulement sur la part au-dessus du hurdle). B est exacte : le high-water mark interdit toute performance fee sur des gains qui ne font que compenser des pertes antérieures. C est la moins exacte, car elle inverse le sens du clawback : c'est une protection des investisseurs, qui reprennent une partie de la performance fee déjà versée au GP lorsque des pertes ultérieures annulent les gains (typique de la waterfall deal-by-deal, où le GP est payé dès les premiers deals vendus). La clause qui avantage le gérant est le catch-up, pas le clawback.",
      ],
      // Variante plus difficile — waterfall deal-by-deal et clawback : calcul du montant restitué et du carried interest final
      [
        "A private equity fund uses a deal-by-deal (American) waterfall with a 20% carried interest and no hurdle rate. It invests $50 million in each of two companies. Company A is sold for $80 million and the GP immediately receives its carried interest on that gain. Company B is later sold for $40 million. Ignoring fees and the time value of money, the amount the GP must return to the LPs under the clawback provision, and the GP's final carried interest, are:",
        [
          "The GP returns $6 million, so its final carried interest is zero.",
          "The GP returns $2 million, so its final carried interest is $4 million.",
          "The GP returns $4 million, so its final carried interest is $2 million.",
        ],
        1,
        "Deal A : gain 80 - 50 = 30 M$, donc carried interest immédiat de 20 % x 30 = 6 M$ (waterfall deal-by-deal : le GP est payé à chaque deal vendu). Deal B : perte 40 - 50 = -10 M$. Sur l'ensemble du fonds, le profit n'est que de 30 - 10 = 20 M$, donc le carried interest final est de 20 % x 20 = 4 M$. Le GP a perçu 6 M$ : il doit rendre 6 - 4 = 2 M$ via le clawback. B est donc correct. A est faux : la perte du deal B (10 M$) ne neutralise qu'une partie du gain du deal A (30 M$) ; le fonds reste bénéficiaire de 20 M$ et le GP garde sa part de ce profit net. C est faux : il inverse les montants (6 - 4 = 2 M$ est ce que le GP rend, 4 M$ est ce qu'il garde). À comparer avec une waterfall européenne (whole-of-fund) : les LPs récupèrent d'abord 100 % de leur mise (plus le hurdle) ; avec 20 M$ de profit total, le GP toucherait directement 4 M$ à la fin, sans clawback nécessaire.",
      ],

      // Concept 5 — Calcul du rendement net de frais d'un hedge fund (ordre de calcul, convention « net of » ou indépendante, high-water mark) (officielle — R79 Q2)
      [
        "Carr Funds is a hedge fund with $125 million of assets under management at the end of the prior year. The fund has a \"1 and 10\" fee structure. Incentive fees are calculated on gains net of management fees at the end of the year. In the current year, Carr Funds had a 5% gross return. An investor's after-fee return for the year is closest to:",
        ["3.6%.", "4.1%.", "–6.0%."],
        0,
        "Valeur de fin d'année avant frais : 125 x 1,05 = 131,25 M$. Management fee : 1 % x 131,25 = 1,3125 M$. Incentive fee, calculée sur le gain net du management fee : 10 % x (131,25 - 125 - 1,3125) = 0,49375 M$. Frais totaux : 1,80625 M$. Rendement net = (131,25 - 1,80625) / 125 - 1 = 3,56 %, soit environ 3,6 % : A est correct. C est faux : -6,0 % vient de l'erreur qui soustrait directement les pourcentages de frais du rendement (5 % - 1 % - 10 %). B est faux : 4,1 % sous-estime les frais totaux ; seul le calcul complet donne 3,56 %. Piège de la fiche : ne rien supposer, lire début / fin d'année pour le management fee, « net of » ou indépendant pour l'incentive fee, hard ou soft pour le hurdle.",
      ],
      // Variante angle différent — comparaison de deux conventions : incentive fee indépendante vs nette du management fee
      [
        "Two hedge funds each start the year with $100 million and earn a 10% gross return. Both charge a 2% management fee on year-end assets under management (before incentive fees) and a 20% incentive fee. Fund P calculates its incentive fee independently of the management fee; Fund Q calculates it on the gain net of the management fee. The investors' after-fee return in Fund Q exceeds that in Fund P by:",
        ["0.40 percentage points.", "2.20 percentage points.", "0.44 percentage points."],
        2,
        "Les deux fonds ont le même management fee : valeur de fin d'année 110 M$, donc 2 % x 110 = 2,2 M$. Fund P (incentive fee indépendante) : 20 % x (110 - 100) = 2,0 M$, frais totaux 4,2 M$, rendement net (110 - 4,2) / 100 - 1 = 5,80 %. Fund Q (incentive fee nette du management fee) : 20 % x (110 - 100 - 2,2) = 1,56 M$, frais totaux 3,76 M$, rendement net 6,24 %. Écart : 6,24 - 5,80 = 0,44 point, soit exactement 20 % x 2,2 : la base de l'incentive fee est réduite du montant du management fee, donc l'incentive fee baisse de 20 % de ce montant. C est donc correct. A est faux : 0,40 point = 20 % x 2,0 suppose un management fee calculé sur le capital de début (100 M$) alors que l'énoncé le calcule sur l'AUM de fin d'année. B est faux : 2,20 points reviendraient à supprimer entièrement le management fee ; la convention « net of » ne le supprime pas, elle réduit seulement la base de l'incentive fee.",
      ],
      // Variante plus difficile — high-water mark sur trois ans combiné au calcul net de frais (gain net du management fee, HWM après frais)
      [
        "A hedge fund with an initial net asset value of $100 million charges a 2% management fee on year-end assets (before incentive fees) and a 20% incentive fee. The incentive fee is calculated on the gain net of the management fee and is subject to a high-water mark, with no hurdle rate; the high-water mark is the highest year-end net asset value after all fees. Gross returns are +20% in Year 1, -10% in Year 2 and +20% in Year 3, and all fees are deducted at each year-end. The incentive fee for Year 3 is closest to:",
        ["$0.85 million.", "$1.33 million.", "$3.54 million."],
        0,
        "Année 1 : valeur avant frais 100 x 1,20 = 120 ; management fee 2 % x 120 = 2,4 ; incentive fee 20 % x (120 - 100 - 2,4) = 3,52 ; valeur nette 114,08, qui devient le HWM. Année 2 : 114,08 x 0,90 = 102,672 ; management fee 2 % x 102,672 = 2,053 ; pas d'incentive fee (perte) ; valeur nette 100,619. Année 3 : 100,619 x 1,20 = 120,742 ; management fee 2 % x 120,742 = 2,415 ; valeur après management fee 118,327. L'incentive fee ne porte que sur le gain au-dessus du HWM : 118,327 - 114,08 = 4,247, soit 20 % x 4,247 = 0,849 M$, environ 0,85 M$. A est donc correct. B est faux : 1,33 M$ = 20 % x (120,742 - 114,08) ne retire pas le management fee de la base, alors que l'énoncé calcule l'incentive fee sur le gain net du management fee. C est faux : 3,54 M$ = 20 % x (120,742 - 100,619 - 2,415) fait payer tout le gain de l'année 3 et ignore le HWM, alors qu'une grande partie de ce gain ne fait que compenser la perte de l'année 2.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Alternative Investments Page 1...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
