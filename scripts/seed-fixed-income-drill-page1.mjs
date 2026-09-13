// Seed script — quiz de "drill" associé à la page 1 de la fiche PDF Fixed
// Income (Bond Features & Valuation Basics). Contenu fourni intégralement
// par l'utilisateur (5 concepts × 3 variantes, questions/choix/réponse/
// explication donnés tels quels) — repris ici verbatim, aucune génération
// ni vérification supplémentaire nécessaire puisque l'utilisateur EST la
// source de vérité pour ce contenu (contrairement aux QCM de la banque
// officielle sourcés depuis Schweser/practice exams).
// Usage: node scripts/seed-fixed-income-drill-page1.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Fixed Income (Système)";

const QUIZ_SETS = [
  {
    title: "Fixed Income — Drill Fiche Page 1 (Bond Features & Valuation Basics)",
    difficulty: 1,
    questions: [
      // Concept 1 — Identifier un eurobond
      [
        "Which of the following issues is most accurately described as a eurobond?",
        [
          "A Japanese firm's British pound-denominated bonds sold to investors in the United Kingdom.",
          "A US firm's US dollar-denominated bonds sold to investors in the United States.",
          "An Australian firm's Swiss franc-denominated bonds sold to investors in multiple European countries, none of which is Switzerland.",
        ],
        2,
        "C'est un eurobond (ici, un « Euro-Swiss franc bond ») : émis en CHF mais vendu hors de Suisse, dans plusieurs pays simultanément. A) est un foreign bond (GBP vendu au Royaume-Uni, émetteur étranger — type « Bulldog bond »). B) est un domestic bond (devise = pays d'émission = pays de vente).",
      ],
      [
        "Which of the following issues is most accurately described as a eurobond?",
        [
          "A Mexican firm's Mexican peso-denominated bonds sold to investors in Mexico.",
          "A Canadian firm's Norwegian krone-denominated bonds sold to investors in several countries, none of which is Norway.",
          "A German firm's Japanese yen-denominated bonds sold only to investors in Japan.",
        ],
        1,
        "B est un eurobond (« Eurokrone bond ») : NOK émis hors de Norvège, dans plusieurs pays. A est un domestic bond. C est un foreign bond (« Samurai bond » : émetteur étranger vendant en JPY, au Japon).",
      ],
      [
        "Which of the following issues is most accurately described as a eurobond?",
        [
          "A French firm's British pound-denominated bonds sold only to investors in the United Kingdom.",
          "A South African firm's South African rand-denominated bonds sold to investors in South Africa.",
          "A Brazilian firm's US dollar-denominated bonds sold to investors across the US, Europe, and Asia simultaneously.",
        ],
        2,
        "C est le classique « Eurodollar bond » : USD, vendu simultanément dans plusieurs zones, aucune restriction au marché domestique de la devise. A est un foreign bond (« Bulldog bond »). B est un domestic bond.",
      ],
      // Concept 2 — Calcul du coupon d'un FRN
      [
        "A floating rate note resets quarterly. Its coupon rate is defined as 3-month SOFR + 80 basis points, and coupons are paid quarterly. If 3-month SOFR is 5.2% at the reset date, the quarterly coupon payment is:",
        ["1.30%.", "1.50%.", "6.00%."],
        1,
        "(SOFR + spread) / n = (5,2% + 0,80%) / 4 = 6,00% / 4 = 1,50%. A oublie d'ajouter le spread (5,2%/4). C oublie de diviser par le nombre de coupons annuels (n=4 ici, car paiement trimestriel).",
      ],
      [
        "A floating rate note resets annually. Its coupon rate is defined as 1-year EURIBOR + 200 basis points, and coupons are paid semi-annually. If 1-year EURIBOR is 3.0% at the reset date, the semi-annual coupon payment is:",
        ["1.50%.", "2.50%.", "5.00%."],
        1,
        "(EURIBOR + spread) / n = (3,0% + 2,00%) / 2 = 5,00% / 2 = 2,50%. A oublie le spread (3,0%/2). C oublie de diviser par 2 (le nombre de paiements annuels).",
      ],
      [
        "A floating rate note resets annually. Its coupon rate is defined as 1-year LIBOR + 175 basis points, and coupons are paid annually. If 1-year LIBOR is 4.25% at the reset date, the annual coupon payment is:",
        ["4.25%.", "3.00%.", "6.00%."],
        2,
        "(LIBOR + spread) / n = (4,25% + 1,75%) / 1 = 6,00%. A oublie complètement le spread. B divise à tort par 2, en supposant un paiement semi-annuel qui n'existe pas ici — la fréquence de paiement est annuelle (n=1).",
      ],
      // Concept 3 — Current yield vs YTM
      [
        "For a bond trading at a premium to par value, the current yield will most likely be:",
        ["higher than the yield to maturity.", "lower than the yield to maturity.", "equal to the yield to maturity."],
        0,
        "Pour un bond premium, le current yield ignore la baisse de prix vers le pair (pull-to-par) au fil du temps — il surestime donc le rendement réel, restant supérieur au YTM. C'est l'inverse d'un bond discount (current yield < YTM).",
      ],
      [
        "A bond's coupon rate is 6% and its market discount rate (YTM) is 4%. The bond is most likely trading at a price relative to par, and has a current yield relative to its YTM, described by:",
        [
          "Price above par; current yield lower than YTM.",
          "Price above par; current yield higher than YTM.",
          "Price below par; current yield higher than YTM.",
        ],
        1,
        "CR (6%) > MDR (4%) → prix au-dessus du pair (premium). Un bond premium a toujours un current yield supérieur à son YTM — les deux relations (CR vs MDR, puis premium → CY>YTM) s'enchaînent logiquement.",
      ],
      [
        "A zero-coupon bond trading below par value has a current yield that is most likely:",
        [
          "equal to zero, and lower than its yield to maturity.",
          "equal to its yield to maturity.",
          "higher than its yield to maturity.",
        ],
        0,
        "Un zero-coupon bond ne verse aucun coupon, donc son current yield (coupon annuel ÷ prix) est toujours 0% — nécessairement inférieur à son YTM, qui lui est positif. Un zero-coupon est d'ailleurs toujours en discount avant l'échéance, ce qui confirme la règle current yield < YTM pour les bonds à discount.",
      ],
      // Concept 4 — Flat price vs full/dirty price
      [
        "A $5,000 par, semiannual-pay bond is trading for 102.35, has a coupon rate of 6.00%, and accrued interest of $85.00. The flat price of the bond is:",
        ["$5,117.50.", "$5,202.50.", "$85.00."],
        0,
        "Flat price = prix coté × par value = 102,35% × $5 000 = $5 117,50. B ajoute à tort l'accrued interest (ça donnerait le full/dirty price, pas le flat price). C confond l'accrued interest avec le prix lui-même.",
      ],
      [
        "A $1,000 par, semiannual-pay bond has a flat price of 96.80 and accrued interest of $21.50. The full price of the bond is:",
        ["$968.00.", "$989.50.", "$946.50."],
        1,
        "Full price = flat price + accrued interest = (96,80% × $1 000) + $21,50 = $968,00 + $21,50 = $989,50. A oublie d'ajouter l'accrued interest. C soustrait l'accrued interest au lieu de l'ajouter.",
      ],
      [
        "A €2,000 par, semiannual-pay bond is trading for 78.60, has a coupon rate of 5.50%, and accrued interest of €12.10. The flat price of the bond is:",
        ["€1,572.00.", "€1,584.10.", "€1,559.90."],
        0,
        "Flat price = 78,60% × €2 000 = €1 572,00. B ajoute à tort l'accrued interest (ce serait le full price). C soustrait l'accrued interest, ce qui n'a aucun sens économique.",
      ],
      // Concept 5 — Yield to worst
      [
        "An analyst is evaluating a callable bond with three call dates. She computes the yield-to-call for each of the three call dates, as well as the yield-to-maturity. The yield to worst is most accurately described as:",
        [
          "the average of all four computed yields.",
          "the lowest of all four computed yields.",
          "the yield to maturity only, since it reflects the full life of the bond.",
        ],
        1,
        "Le yield to worst est le plus bas de TOUS les rendements possibles — les YTC pour chaque date de call, ET le YTM. Une erreur fréquente est de ne comparer que les YTC entre eux en oubliant d'inclure le YTM dans la comparaison.",
      ],
      [
        "A callable bond has a yield-to-maturity of 5.20%. Its yield-to-call is 4.10% for the first call date and 5.60% for the second call date. The bond's yield to worst is closest to:",
        ["4.10%.", "5.20%.", "5.60%."],
        0,
        "YTW = min(YTM, YTC1, YTC2) = min(5,20% ; 4,10% ; 5,60%) = 4,10%. C'est une application directe de la définition — l'erreur la plus fréquente est de répondre le YTM par réflexe, en oubliant de comparer avec les YTC.",
      ],
      [
        "Which of the following changes would most likely cause a callable bond's yield to worst to increase, all else held constant?",
        [
          "The bond's price increases, while all future cash flows remain the same.",
          "The bond's price decreases, while all future cash flows remain the same.",
          "The call price is lowered on all call dates.",
        ],
        1,
        "Une baisse de prix (cash flows inchangés) fait mécaniquement monter TOUS les rendements — YTM et chaque YTC — donc le minimum de cet ensemble (le YTW) monte aussi. A produirait l'effet inverse (YTW baisse). C ferait baisser les YTC (l'investisseur récupère moins au call), donc ferait plutôt baisser le YTW, pas l'augmenter.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");

  console.log("Drill QCM — Fiche Fixed Income Page 1...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });

  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
