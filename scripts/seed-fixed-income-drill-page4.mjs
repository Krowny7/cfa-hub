// Seed script — quiz de "drill" pour la page 4 de la fiche PDF Fixed
// Income (Interest Rate Risk & Duration). 5 concepts x 3 variantes.
// Usage: node scripts/seed-fixed-income-drill-page4.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Fixed Income (Système)";

const QUIZ_SETS = [
  {
    title: "Fixed Income — Drill Fiche Page 4 (Interest Rate Risk & Duration)",
    difficulty: 2,
    questions: [
      // Concept 1 — Macaulay duration matched to horizon
      [
        "An investor wants to immunize a single future liability against interest rate risk, so that price risk and reinvestment risk approximately offset each other. She should select a bond (or bond portfolio) whose:",
        [
          "modified duration equals the investment horizon.",
          "Macaulay duration equals the investment horizon.",
          "money duration equals the present value of the liability.",
        ],
        1,
        "Quand la Macaulay duration d'un bond est égale à l'horizon d'investissement, le risque de prix (variation de taux) et le risque de réinvestissement (réinvestir les coupons au nouveau taux) se compensent approximativement, immunisant le portefeuille contre un choc de taux parallèle unique.",
      ],
      [
        "A portfolio manager has a 7-year investment horizon and selects a bond portfolio with a Macaulay duration of 7 years. If interest rates rise unexpectedly and immediately after purchase, the realized return over the 7-year horizon will most likely be:",
        [
          "higher than originally expected, because price risk dominates.",
          "approximately unchanged, because reinvestment gains approximately offset the price loss.",
          "lower than originally expected, because reinvestment risk dominates.",
        ],
        1,
        "Avec une Macaulay duration égale à l'horizon (duration gap = 0), une hausse de taux cause une perte de prix immédiate, mais celle-ci est approximativement compensée par un revenu de réinvestissement plus élevé sur les coupons pendant le reste de l'horizon — le rendement réalisé reste proche du rendement initialement attendu.",
      ],
      [
        "A bond portfolio has a Macaulay duration of 4 years, but the investor's investment horizon is 9 years. This portfolio is most exposed to:",
        [
          "price risk, since the duration gap is negative.",
          "reinvestment risk, since the duration gap (MacDur − horizon = 4 − 9 = −5) is negative.",
          "no interest rate risk, since duration and horizon differ.",
        ],
        1,
        "Duration gap = Macaulay duration − horizon d'investissement = 4 − 9 = −5 (négatif). Un gap négatif signifie que l'horizon est plus long que la duration, donc le risque de réinvestissement domine : le rendement dépend davantage du réinvestissement des flux sur une longue période que du prix du bond à un instant donné.",
      ],
      // Concept 2 — Duration gap sign rule / reinvestment vs price risk
      [
        "Relative to a coupon-paying bond of the same maturity, a zero-coupon bond's Macaulay duration equals its:",
        [
          "time to maturity, since there are no coupons to reinvest, eliminating reinvestment risk entirely and leaving only price risk if the horizon differs from maturity.",
          "modified duration divided by its yield to maturity.",
          "money duration divided by its full price.",
        ],
        0,
        "Un zero-coupon bond n'a qu'un seul cash flow à maturité, donc sa Macaulay duration est exactement égale à sa maturité, et il n'a aucun risque de réinvestissement lié aux coupons — ce qui en fait l'instrument idéal pour couvrir un passif à date fixe unique correspondant à la maturité du zero.",
      ],
      [
        "An investor with a very short investment horizon (e.g., 6 months) holding a long-maturity coupon bond is most exposed to:",
        [
          "reinvestment risk, since the horizon is much shorter than the bond's Macaulay duration, making the duration gap strongly positive.",
          "price risk, since the horizon is much shorter than the bond's Macaulay duration, making the duration gap strongly positive.",
          "no risk, since a short horizon eliminates all interest rate exposure.",
        ],
        1,
        "Duration gap = Macaulay duration − horizon. Avec un bond à longue duration et un horizon très court, le gap est fortement positif, ce qui signifie que le risque de prix domine — l'investisseur va probablement vendre avant maturité à un prix très sensible aux variations de taux, sans que les effets de réinvestissement aient le temps de compenser.",
      ],
      [
        "Which of the following investors is most likely primarily exposed to reinvestment risk rather than price risk?",
        [
          "An investor whose investment horizon is much shorter than the Macaulay duration of her bond portfolio.",
          "An investor whose investment horizon is much longer than the Macaulay duration of her bond portfolio.",
          "An investor whose investment horizon exactly equals the Macaulay duration of her bond portfolio.",
        ],
        1,
        "Quand l'horizon d'investissement dépasse la Macaulay duration du portefeuille (duration gap négatif), les cash flows sont reçus bien avant la fin de l'horizon et doivent être réinvestis pendant une longue période restante — le risque de réinvestissement (baisse des taux réduisant le revenu de réinvestissement) devient la préoccupation dominante.",
      ],
      // Concept 3 — Coupon rate and interest rate risk
      [
        "Holding maturity and yield to maturity constant, a bond's interest rate risk (as measured by duration) is most likely higher when the bond's coupon rate is:",
        [
          "higher, since more cash is at stake.",
          "lower, since more of the bond's value is concentrated in the single, distant principal repayment.",
          "unrelated to interest rate risk; only maturity matters.",
        ],
        1,
        "Un coupon plus faible signifie qu'une plus grande partie de la valeur du bond provient du remboursement final du principal (un cash flow unique et lointain), ce qui augmente le temps moyen pondéré de réception des cash flows (Macaulay duration) — et donc le risque de taux. Un zero-coupon bond (cas extrême d'un coupon nul) a la duration maximale pour une maturité donnée.",
      ],
      [
        "Two bonds have the same maturity and yield to maturity. Bond X has a coupon rate of 3% and Bond Y has a coupon rate of 7%. Bond X's interest rate risk, relative to Bond Y's, is most likely:",
        [
          "higher, since Bond X's lower coupon rate gives it a higher duration.",
          "lower, since Bond X pays smaller coupons and thus has less at risk.",
          "identical, since duration depends only on maturity and yield, not coupon.",
        ],
        0,
        "Avec la même maturité et le même yield, le bond au coupon le plus faible (Bond X) a une duration Macaulay/modifiée plus élevée et donc un risque de taux plus grand, car une plus grande part de sa valeur est liée au paiement de principal plus lointain par rapport à Bond Y.",
      ],
      [
        "All else equal, a bond's yield to maturity falling (with coupon rate and maturity unchanged) will most likely cause the bond's interest rate risk (duration) to:",
        ["decrease.", "increase slightly.", "remain exactly unchanged."],
        1,
        "Un YTM plus faible augmente le poids en valeur actuelle des cash flows les plus lointains par rapport aux plus proches (l'actualisation a moins d'effet à un taux plus bas), ce qui augmente légèrement la Macaulay duration — un YTM plus bas est donc associé à un risque de taux (légèrement) plus élevé, toutes choses égales par ailleurs.",
      ],
      // Concept 4 — Modified vs Macaulay duration
      [
        "A bond has a Macaulay duration of 8.4 years and a yield to maturity of 6%, with annual coupon payments (n=1). Its modified duration is closest to:",
        ["7.92.", "8.40.", "8.90."],
        0,
        "Modified duration = Macaulay duration / (1 + YTM/n) = 8,4 / (1 + 0,06/1) = 8,4 / 1,06 ≈ 7,92. La modified duration est toujours légèrement inférieure à la Macaulay duration (pour un yield positif), contrairement à C qui l'augmente à tort.",
      ],
      [
        "A bond has a Macaulay duration of 5.0 years, pays semiannual coupons, and has a yield to maturity of 8%. Its modified duration is closest to:",
        ["4.81.", "5.00.", "5.20."],
        0,
        "Modified duration = MacDur / (1 + YTM/n) = 5,0 / (1 + 0,08/2) = 5,0 / 1,04 ≈ 4,81 ans.",
      ],
      [
        "For any bond with a positive yield to maturity, modified duration compared to Macaulay duration is always:",
        ["higher.", "lower.", "identical, since both measure the same sensitivity."],
        1,
        "Comme modified duration = Macaulay duration / (1 + YTM/n), et (1+YTM/n) > 1 dès que le YTM est positif, la modified duration est toujours inférieure à la Macaulay duration pour un bond à yield positif (elles ne sont égales que dans le cas théorique d'un yield de 0%).",
      ],
      // Concept 5 — Positive convexity
      [
        "A bond with positive convexity, compared to one with lower (or zero) convexity but the same duration, will most likely experience:",
        [
          "a smaller price increase when yields fall and a larger price decrease when yields rise, by the same amount.",
          "a larger price increase when yields fall than the price decrease when yields rise, by the same amount.",
          "identical price changes for equal increases and decreases in yield.",
        ],
        1,
        "Une convexité positive signifie que la relation prix/yield se courbe vers le haut : pour un même mouvement de taux, le gain de prix d'une baisse de yield dépasse la perte de prix d'une hausse égale — une propriété asymétrique favorable au détenteur du bond.",
      ],
      [
        "The convexity adjustment to a bond's estimated percentage price change, ΔPV%Full ≈ −ModDur×ΔYTM + ½×Convexity×ΔYTM², is most likely:",
        [
          "always negative, reducing the estimated price change.",
          "always positive, adding to the (duration-only) estimated price change regardless of the direction of the yield change.",
          "positive only when yields fall, and negative when yields rise.",
        ],
        1,
        "Comme le terme de convexité inclut ΔYTM au carré, il est toujours positif (un carré ne peut pas être négatif) tant que la convexité elle-même est positive — l'ajustement de convexité s'ajoute donc toujours à l'estimation basée sur la seule duration, que les taux montent ou baissent.",
      ],
      [
        "A callable bond's negative convexity, particularly when interest rates are low (making the call more likely to be exercised), most directly implies that, compared to an otherwise identical option-free bond:",
        [
          "its price will rise by MORE than the option-free bond when yields fall, due to the call feature.",
          "its price appreciation is limited (capped near the call price) when yields fall, unlike the option-free bond's larger gain.",
          "it has no interest rate risk at all once callable.",
        ],
        1,
        "Un callable bond présente une convexité négative à faible yield : quand les taux baissent, la probabilité que l'émetteur exerce le call augmente, plafonnant le prix près du call price — le potentiel de hausse du callable bond est donc limité par rapport à un bond sans option, qui continue de s'apprécier sans ce plafond.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Fixed Income Page 4...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
