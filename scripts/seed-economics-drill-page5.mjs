// Seed script — quiz de "drill" associé à la page 5 de la fiche PDF Economics
// (Exchange Rate Calculations, Reading 19). Structure : pour chacun des 5
// concepts clés de la page, 1 question officielle (banque de pratique CFA,
// Practise Exams/Economics, Reading 19, corrigé vérifié contre le PDF
// "- Answers", recopiée à l'identique) + 1 variante "angle différent" (même
// notion, mais jamais un simple changement de chiffres menant au même
// raisonnement) + 1 variante "plus difficile" (raisonnement à plusieurs
// étapes / pièges combinés / notion connexe de la page). Voir memory
// regle-drill-variantes-cfa-hub. Les 5 questions déjà imprimées dans le PDF
// (R19 Q1, Q3, Q12, Q15, Q17) ne sont pas reprises. Questions en anglais,
// explications en français.
// Les questions officielles sont recopiées à l'identique : syncQuizSets
// retrouve l'historique de réponses en comparant le texte exact de l'énoncé.
// (Le tableau de R19 Q2 est mis à plat sur une ligne.)
// Usage: node scripts/seed-economics-drill-page5.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Economics (Système)";

const QUIZ_SETS = [
  {
    title: "Economics — Drill Fiche Page 5 (Exchange Rate Calculations)",
    difficulty: 2,
    questions: [
      // Concept 1 — Cross rates : la devise commune se simplifie (officielle, R19 Q8)
      [
        "Assume the exchange rate between the Trotter (TRT) and the Roeckl (RKL) is 5.50 TRT/RKL and the exchange rate between the Roeckl and the Passage (PSG) is 8.00 RKL/PSG. The cross rate between the PSG and the TRT is closest to:",
        ["0.0227 PSG/TRT.", "44.00 PSG/TRT.", "0.6875 PSG/TRT."],
        0,
        "Le RKL est la devise commune : il est au dénominateur du premier taux (TRT/RKL) et au numérateur du second (RKL/PSG), donc il se simplifie par MULTIPLICATION : TRT/PSG = 5.50 × 8.00 = 44.00 TRT/PSG. La question demande PSG/TRT, on inverse : 1 / 44.00 = 0.0227 PSG/TRT. B (44.00) est le bon calcul mais dans le mauvais sens : c'est TRT/PSG, non inversé. C (0.6875) vient de 5.50 / 8.00 : on a divisé alors que la devise commune est de part et d'autre, il faut multiplier.",
      ],
      // Variante angle différent — variation d'un cross entre deux dates (on ne somme pas les %)
      [
        "At the start of the year the spot rates were USD/EUR 1.1000 and USD/GBP 1.3200. One year later they are USD/EUR 1.2100 and USD/GBP 1.2144. Over the year, the EUR/GBP cross rate (EUR per GBP) changed by an amount closest to:",
        ["−18.0%.", "+19.6%.", "−16.4%."],
        2,
        "Méthode de la fiche : recalculer le cross à chaque date, puis final / initial − 1, sans jamais sommer les pourcentages des deux jambes. EUR/GBP = USD/GBP ÷ USD/EUR (le USD se simplifie). Date initiale : 1.3200 / 1.1000 = 1.2000. Date finale : 1.2144 / 1.2100 = 1.00364. Variation : 1.00364 / 1.2000 − 1 = −16.4% (le GBP s'est déprécié face à l'EUR). A (−18.0%) additionne les variations des jambes (USD/EUR +10%, USD/GBP −8%) alors qu'elles se composent : 0.92 / 1.10 = 0.8364. B (+19.6%) est la variation du cross INVERSE GBP/EUR (1.10 / 0.92 − 1) : la variation d'un taux inversé n'est pas l'opposée de celle du taux d'origine.",
      ],
      // Variante plus difficile — arbitrage triangulaire : cross implicite vs 2e dealer, sens et montant du profit
      [
        "Dealer A quotes spot rates of USD/EUR 1.1000 and USD/GBP 1.3200, while dealer B quotes the EUR/GBP cross rate directly at 1.2200. An arbitrageur starting with EUR 1,000,000 ignores transaction costs. Which trade sequence is profitable, and what is the approximate profit?",
        [
          "Convert EUR into USD and then into GBP with dealer A, and sell the GBP for EUR to dealer B: profit of about EUR 16,667.",
          "Convert EUR into GBP with dealer B, and then GBP into USD and back into EUR with dealer A: profit of about EUR 16,393.",
          "Convert EUR into USD and then into GBP with dealer A, and sell the GBP for EUR to dealer B: profit of about EUR 20,000.",
        ],
        0,
        "Cross implicite chez A : EUR/GBP = USD/GBP ÷ USD/EUR = 1.3200 / 1.1000 = 1.2000 EUR par GBP, contre 1.2200 chez B. Le GBP est moins cher en EUR via A : on l'achète là où c'est le moins cher (via A) et on le revend à B. Séquence : EUR 1,000,000 × 1.1000 = USD 1,100,000 ; USD 1,100,000 / 1.3200 = GBP 833,333 ; GBP 833,333 × 1.2200 = EUR 1,016,667, soit un profit de 16,667 EUR. C a le bon sens mais le mauvais montant : 20,000 = (1.22 − 1.20) × 1,000,000 suppose d'acheter 1,000,000 GBP, alors que 1,000,000 EUR n'en achètent que 833,333 (au taux de 1.2000). B inverse le sens : acheter les GBP chez B (le plus cher) donne EUR 1,000,000 / 1.2200 = GBP 819,672 → USD 1,081,967 → EUR 983,607, soit une PERTE de 16,393 EUR et non un profit.",
      ],

      // Concept 2 — Forward quote en points : forward = spot + points / échelle (officielle, R19 Q13)
      [
        "The spot exchange rate is 1.1132 GBP/EUR and the 1-year forward rate is quoted as +1349 points. The 1-year forward exchange rate for GBP/EUR is closest to:",
        ["1.1267.", "1.2481.", "1.2634."],
        1,
        "Le taux est coté à 4 décimales : 1 point = 0.0001, donc +1349 points = +0.1349. Forward = 1.1132 + 1349 / 10,000 = 1.1132 + 0.1349 = 1.2481. A (1.1267) décale la virgule : 1349 / 100,000 = 0.01349. C (1.2634) traite 1349 comme un pourcentage (1.1132 × 1.1349, soit +13.49%) : des points s'ADDITIONNENT au spot après division par l'échelle, un pourcentage se MULTIPLIE.",
      ],
      // Variante angle différent — calcul inversé et échelle à 2 décimales (JPY)
      [
        "A dealer quotes the JPY/USD spot rate at 150.00 and the 90-day forward rate at 148.65. The 90-day forward quote, expressed in points, is:",
        ["−13,500 points.", "−13.5 points.", "−135 points."],
        2,
        "Ici on part du forward pour retrouver les points. Le JPY/USD est coté à 2 décimales : 1 point = 0.01 (échelle 100, au lieu de 10,000 pour 4 décimales). Points = (148.65 − 150.00) / 0.01 = −1.35 / 0.01 = −135 points ; vérification : 150.00 + (−135 / 100) = 148.65. A (−13,500) applique à tort l'échelle à 4 décimales (−1.35 / 0.0001). B (−13.5) divise par 0.1, une échelle qui n'existe pas. Le signe est négatif car le forward est inférieur au spot : le USD (base) est à forward discount.",
      ],
      // Variante plus difficile — points + inversion du forward + statut de la base
      [
        "The spot rate is USD/EUR 1.0850 and the 6-month forward points are +62. A U.S. importer wants the 6-month forward rate expressed as EUR/USD (EUR per USD). The forward EUR/USD rate and the status of the USD are:",
        [
          "0.9164, and the USD is at a forward discount.",
          "0.9279, and the USD is at a forward premium.",
          "0.9164, and the USD is at a forward premium.",
        ],
        0,
        "Étape 1 : forward USD/EUR (4 décimales) = 1.0850 + 62 / 10,000 = 1.0850 + 0.0062 = 1.0912. Étape 2 : l'importateur veut EUR/USD, on inverse le forward COMPLET : 1 / 1.0912 = 0.9164 (spot EUR/USD : 1 / 1.0850 = 0.9217). Étape 3 : dans EUR/USD la base est le USD : forward / spot − 1 = 0.9164 / 0.9217 − 1 = −0.57% → USD à forward discount (cohérent avec USD/EUR, où l'EUR, base, est à premium de +0.57%). B (0.9279) ajoute les points à l'inverse du spot (0.9217 + 0.0062) : les points s'appliquent à la cotation d'origine, pas à sa réciproque ; son « premium » est cohérent avec ce taux faux. C a le bon taux mais la mauvaise conclusion : un forward inférieur au spot signifie que la base (USD) est à discount.",
      ],

      // Concept 3 — Forward quote en % : forward = spot × (1 + %) (officielle, R19 Q22)
      [
        "The spot CHF/EUR exchange rate is 1.2025. If the 90-day forward quotation is +0.25%, the 90-day forward rate is closest to:",
        ["1.2000.", "1.2050.", "1.2055."],
        2,
        "Cotation en % : forward = spot × (1 + %) = 1.2025 × 1.0025 = 1.2055. Le CHF/EUR a pour base l'EUR : forward supérieur au spot → l'EUR est à forward premium. B (1.2050) ajoute 0.0025 au spot, soit 25 points : on confond 0.25% et 0.0025 ; or 0.25% de 1.2025 vaut 0.0030. A (1.2000) retranche 0.0025 : même confusion pourcentage/points, avec en plus le mauvais signe.",
      ],
      // Variante angle différent — comparer une cotation en points et une cotation en %
      [
        "The spot USD/EUR rate is 1.2000. Bank X quotes the 6-month forward as +40 points, and Bank Y quotes it as +0.40%. Which statement is correct?",
        [
          "Both quotes give the same forward rate, 1.2040.",
          "Bank Y's forward rate (1.2048) is higher than Bank X's (1.2040), because +0.40% of 1.2000 equals 48 points.",
          "Bank X's forward rate (1.2400) is higher than Bank Y's (1.2048), because 40 points are worth 0.0400.",
        ],
        1,
        "Il faut ramener les deux cotations à un taux forward. Bank X (points) : 1.2000 + 40 / 10,000 = 1.2040. Bank Y (%) : 1.2000 × 1.0040 = 1.2048, car 0.40% de 1.2000 = 0.0048, soit 48 points (plus que 40). Un pourcentage s'applique au niveau du taux : « 0.40 » en % et « 40 » en points ne sont pas comparables. A est faux (1.2040 ≠ 1.2048). C est faux : 40 points valent 0.0040 (et non 0.0400), donc le forward de X est 1.2040, pas 1.2400.",
      ],
      // Variante plus difficile — deux forwards en % puis cross forward (piège : sens du cross)
      [
        "The spot rates are USD/EUR 1.1000 and USD/GBP 1.3000. The 3-month forward quotes are −0.50% for USD/EUR and +0.40% for USD/GBP. The 3-month forward EUR/GBP cross rate (EUR per GBP) is closest to:",
        ["1.1925.", "1.1818.", "0.8386."],
        0,
        "Étape 1 : forwards. USD/EUR = 1.1000 × (1 − 0.0050) = 1.0945 ; USD/GBP = 1.3000 × (1 + 0.0040) = 1.3052. Étape 2 : cross EUR/GBP = USD/GBP ÷ USD/EUR (le USD se simplifie) = 1.3052 / 1.0945 = 1.1925. B (1.1818) est le cross SPOT (1.3000 / 1.1000) : il ignore les cotations forward. C (0.8386) est la bonne division mais à l'envers (1.0945 / 1.3052) : c'est GBP/EUR et non EUR/GBP. Le forward d'un cross se déduit des deux forwards, pas d'une somme de pourcentages.",
      ],

      // Concept 4 — Forward premium / discount de la devise de base (officielle, R19 Q2)
      [
        "Spot and one-month forward exchange rates are as follows: EUR/DEF spot 2.5675, 1-month forward 2.5925; EUR/GHI spot 4.3250, 1-month forward 4.2800; EUR/JKL spot 7.0625, 1-month forward 7.0075. Based on these exchange rates, the EUR is closest to a 1-month forward:",
        ["discount of 1% to the JKL.", "premium of 1% to the DEF.", "premium of 1% to the GHI."],
        2,
        "Convention prix/base : EUR/GHI = EUR par GHI, donc la base est le GHI. Pour la base : forward / spot − 1 = 4.2800 / 4.3250 − 1 = −1.04% → le GHI est à forward discount, donc l'EUR (devise de cotation) est à forward premium (4.3250 / 4.2800 − 1 ≈ +1.05%) : C est correct. A : JKL, 7.0075 / 7.0625 − 1 = −0.78% → JKL à discount, donc l'EUR est à PREMIUM (≈ +0.78%) et non à discount, et loin de 1%. B : DEF, 2.5925 / 2.5675 − 1 = +0.97% → DEF à premium, donc l'EUR est à DISCOUNT (≈ −0.96%), pas à premium. Règle : si le forward est inférieur au spot (prix/base), la base est à discount et la devise de cotation à premium.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai (lien premium/discount, taux d'intérêt)
      [
        "The spot CAD/CHF rate is 1.5200 and the 6-month forward rate is 1.5352. Which of the following statements is NOT correct?",
        [
          "The CHF is at a forward premium of 1.00% against the CAD.",
          "The CAD interest rate is lower than the CHF interest rate.",
          "The CAD is at a forward discount of about 0.99% against the CHF.",
        ],
        1,
        "La base du CAD/CHF est le CHF. Forward / spot − 1 = 1.5352 / 1.5200 − 1 = +1.00% : le CHF est à forward premium de 1.00% (A est vrai). La devise de cotation, le CAD, est à forward discount : 1.5200 / 1.5352 − 1 = −0.99% (C est vrai, et ce n'est pas exactement −1.00%). B est faux, c'est donc la réponse : F / S = (1 + i_CAD) / (1 + i_CHF) = 1.01 > 1, donc le taux du CAD est SUPÉRIEUR à celui du CHF. Cohérent avec la règle : la devise au taux d'intérêt le plus haut (CAD) est celle qui est à forward discount.",
      ],
      // Variante plus difficile — asymétrie des pourcentages (base vs devise de cotation) + lien avec les taux
      [
        "The spot XYZ/USD rate is 20.00 and the 1-year forward rate is 18.00. Which statement is most accurate?",
        [
          "The USD is at a forward discount of 10.0% and the XYZ is at a forward premium of about 11.1%, consistent with a higher interest rate in the United States.",
          "The USD is at a forward discount of 10.0% and the XYZ is at a forward premium of 10.0%, consistent with a higher interest rate in the United States.",
          "The USD is at a forward premium of about 11.1% and the XYZ is at a forward discount of 10.0%, consistent with a higher interest rate in XYZ.",
        ],
        0,
        "La base est le USD (XYZ/USD). Forward / spot − 1 = 18.00 / 20.00 − 1 = −10.0% → USD à forward discount de 10.0%. Pour la devise de cotation on retourne le rapport : 20.00 / 18.00 − 1 = +11.1% → XYZ à forward premium d'environ 11.1%, et non 10.0% : les deux pourcentages ne sont pas opposés. La devise à discount (USD) est celle au taux d'intérêt le plus élevé : F / S = (1 + i_XYZ) / (1 + i_USD) = 0.90, donc i_XYZ < i_USD. B se trompe sur le pourcentage de la devise de cotation (10.0% au lieu de 11.1%). C inverse tout : il applique spot / forward − 1 à la base et forward / spot − 1 à la devise de cotation, ce qui retourne premium/discount et la conclusion sur les taux.",
      ],

      // Concept 5 — Parité des taux d'intérêt couverte (CIRP) (officielle, R19 Q11)
      [
        "When forward currency exchange-rate contracts are available, the difference between the spot and forward exchange rates for a pair of currencies is most likely to reflect the difference between the two countries':",
        ["economic growth rates.", "risk-free interest rates.", "annual inflation rates."],
        1,
        "Parité des taux d'intérêt couverte (CIRP) : placer la monnaie nationale à son taux sans risque doit rapporter autant qu'acheter la devise étrangère au spot, la placer à son taux sans risque et revendre le produit au forward. Sinon l'arbitrage ramène l'écart forward / spot vers la différence des taux sans risque des deux pays (F = S × (1 + i_prix × τ) / (1 + i_base × τ)). Les taux de croissance (A) et d'inflation (C) peuvent influencer le taux de change au comptant attendu à long terme, mais ils n'entrent pas dans la relation d'arbitrage couvert qui fixe le forward.",
      ],
      // Variante angle différent — cas limite (taux égaux) puis variation d'un seul taux
      [
        "The spot USD/EUR rate is 1.1000, and the 3-month interest rates in the euro area and in the United States are both 3.0%. If the euro-area 3-month rate then rises to 4.0%, with the U.S. rate and the spot rate unchanged, the no-arbitrage 3-month forward USD/EUR rate will most likely:",
        [
          "remain at 1.1000, because only the spot rate determines the forward rate.",
          "rise above 1.1000, so the EUR moves to a forward premium against the USD.",
          "fall below 1.1000, so the EUR moves to a forward discount against the USD.",
        ],
        2,
        "CIRP : F = S × (1 + i_prix × τ) / (1 + i_base × τ). Au départ, taux égaux (3.0%) → F = S = 1.1000. Quand le taux de la base (EUR) passe à 4.0%, le dénominateur augmente alors que le numérateur (USD, 3.0%) ne bouge pas. Avec τ = 90/360 = 0.25 : F = 1.1000 × (1 + 0.03 × 0.25) / (1 + 0.04 × 0.25) = 1.1000 × 1.0075 / 1.0100 = 1.0973 < 1.1000. L'EUR, devise au taux le plus haut, passe à forward discount. A est faux : le forward dépend aussi des taux, il n'égale le spot que si les taux sont égaux. B a le sens inverse : une hausse du taux de la base fait BAISSER le forward (c'est une hausse du taux de la devise de cotation qui le ferait monter).",
      ],
      // Variante plus difficile — arbitrage de taux d'intérêt couvert : forward théorique, sens de la stratégie, profit
      [
        "The spot USD/EUR rate is 1.2000 and the 90-day forward rate is quoted at 1.2000. The annual interest rates (90/360 convention) are 4.0% in USD and 2.0% in EUR. Ignoring transaction costs, which statement about covered interest arbitrage is correct?",
        [
          "Borrow USD, convert to EUR at the spot rate, invest in EUR, and sell the EUR forward: profit of about USD 6,000 for EUR 1,000,000 of notional.",
          "Borrow EUR, convert to USD at the spot rate, invest in USD, and buy the EUR forward: profit of about EUR 5,000 on a EUR 1,000,000 loan.",
          "No arbitrage opportunity exists, because the forward rate equals the spot rate.",
        ],
        1,
        "Forward sans arbitrage = 1.2000 × (1 + 0.04 × 0.25) / (1 + 0.02 × 0.25) = 1.2000 × 1.0100 / 1.0050 = 1.2060, bien au-dessus du forward coté (1.2000) : l'EUR à terme est « bradé », donc on l'achète à terme. Stratégie B : emprunter EUR 1,000,000 (à rembourser 1,000,000 × 1.005 = EUR 1,005,000) → USD 1,200,000 au spot → placés à 1% sur 90 jours : USD 1,212,000 → achat d'EUR à terme à 1.2000 : 1,212,000 / 1.2000 = EUR 1,010,000 → profit = 1,010,000 − 1,005,000 = EUR 5,000. C est faux malgré un forward égal au spot : les taux diffèrent (4.0% contre 2.0%), donc F devrait valoir 1.2060. A est la stratégie inverse : USD 1,200,000 → EUR 1,000,000 → EUR 1,005,000 → USD 1,206,000, alors qu'il faut rembourser USD 1,200,000 × 1.01 = USD 1,212,000 : une PERTE de 6,000 USD et non un profit.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Economics Page 5...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
