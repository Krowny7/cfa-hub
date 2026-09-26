// Seed script — quiz de "drill" pour la page 4 de la fiche PDF Fixed
// Income (Interest Rate Risk & Duration). 5 concepts x 3 variantes +
// concepts 6-10 (2026-09-26) : calculs PVBP/money duration/approx
// modified duration & convexity par bump, effective duration, key rate
// duration, duration de portefeuille (2 méthodes), drivers de duration,
// duration d'une perpétuité — en complément de la page 4 de la fiche,
// remaniée le même jour pour couvrir ces mêmes formules.
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
      // Concept 6 — PVBP and money duration (numeric)
      [
        "A bond has a full price of 98.7500 and an annualized modified duration of 6.42. Its PVBP (price value of a basis point) is closest to:",
        ["0.0063.", "0.0634.", "0.6340."],
        1,
        "PVBP = AnnModDur × Full price × 0,0001 = 6,42 × 98,75 × 0,0001 ≈ 0,0634 (pour 100 de nominal). Le distracteur A confond 0,0001 avec 0,00001 (facteur 10 manquant), le distracteur C utilise 0,01 au lieu de 0,0001.",
      ],
      [
        "A position has a full price (market value) of 1,050,000 and an annualized modified duration of 8.10. The money duration of this position is closest to:",
        ["85,050.", "850,500.", "8,505,000."],
        2,
        "Money duration = AnnModDur × full price de la position = 8,10 × 1 050 000 = 8 505 000. Elle mesure la variation de VALEUR (en unités monétaires, pas en %) pour une variation de yield de 1,00 (100 %) ; diviser par 10 000 donne l'équivalent pour 1bp (≈850 500 × 0,0001 ≈ 850,50, cohérent avec l'ordre de grandeur d'un PVBP à cette échelle de position).",
      ],
      // Concept 7 — Approximate modified duration and convexity (bump method)
      [
        "A bond trades at a full price of 100.00. If its YTM rises by 75bp, the full price falls to 95.80. If its YTM falls by 75bp, the full price rises to 104.45. The bond's approximate modified duration, ApproxModDur = [V(YTM−ΔY) − V(YTM+ΔY)] / (2×ΔY×V0), is closest to:",
        ["5.77.", "8.65.", "11.53."],
        0,
        "ApproxModDur = (104,45−95,80) / (2×0,0075×100,00) = 8,65 / 1,50 ≈ 5,77. Le distracteur B oublie de diviser par (2×ΔY) (ne montre que l'écart de prix), le distracteur C oublie le facteur 2 au dénominateur (8,65/0,75=11,53).",
      ],
      [
        "Using the same bond as above (V0 = 100.00; V(YTM−0.75%) = 104.45; V(YTM+0.75%) = 95.80), its approximate convexity, ApproxConvexity = [V(YTM−ΔY) + V(YTM+ΔY) − 2×V0] / (ΔY²×V0), is closest to:",
        ["0.44.", "4.44.", "44.44."],
        2,
        "ApproxConvexity = (104,45+95,80−200,00) / (0,0075²×100,00) = 0,25 / 0,005625 ≈ 44,44. Les distracteurs A et B correspondent à une erreur d'échelle sur ΔY² (facteur 10 ou 100 en trop au dénominateur).",
      ],
      // Concept 8 — Effective duration and key rate duration
      [
        "For a callable bond, effective duration (rather than modified duration) is the appropriate measure of interest rate risk primarily because:",
        [
          "effective duration is always lower than modified duration for any bond.",
          "the bond's future cash flows can change as interest rates change, so a valuation model (not a fixed cash flow schedule) must be used to estimate the price impact of a rate change.",
          "modified duration cannot be calculated once a bond has a yield to maturity.",
        ],
        1,
        "La modified duration suppose des cash flows FIXES et utilise le YTM propre du bond. Un callable bond peut voir ses cash flows changer si l'émetteur exerce le call quand les taux baissent — il faut un modèle de valorisation (ex : arbre binomial, OAS constant) qui recalcule le prix pour un choc de la courbe de référence : c'est l'effective duration. A est faux (la comparaison dépend du bond), C est faux (le YTM existe toujours pour un callable bond à un instant donné).",
      ],
      [
        "An analyst wants to measure a bond portfolio's sensitivity to a steepening of the yield curve (long-term rates rising while short-term rates stay flat). The most appropriate tool is:",
        ["the portfolio's modified duration.", "key rate durations at several points on the curve.", "the portfolio's money duration."],
        1,
        "La modified/money duration supposent un déplacement parallèle de la courbe (tous les taux bougent du même montant) et ne peuvent donc pas capturer un steepening. Les key rate durations mesurent la sensibilité du prix à un point précis de la courbe (ex : 10 ans), les autres maturités étant maintenues constantes — la seule mesure adaptée à un mouvement non parallèle.",
      ],
      // Concept 9 — Portfolio duration
      [
        "A portfolio consists of Bond A (market value 600,000; modified duration 4.0) and Bond B (market value 400,000; modified duration 9.0). Using the market-value-weighted average approach, the portfolio's modified duration is closest to:",
        ["6.00.", "6.50.", "13.00."],
        0,
        "Duration de portefeuille (weighted average) = Σ(poids en valeur de marché × duration individuelle) = 0,60×4,0 + 0,40×9,0 = 2,4+3,6 = 6,00. Le distracteur B est une moyenne arithmétique non pondérée ((4+9)/2), le distracteur C additionne au lieu de pondérer.",
      ],
      [
        "The main limitation of computing portfolio duration as the market-value-weighted average of the component bonds' individual durations is that it:",
        [
          "cannot be calculated for portfolios holding more than two bonds.",
          "implicitly assumes that the yields of all bonds in the portfolio change by the same amount (a parallel shift).",
          "always overstates the portfolio's true interest rate risk.",
        ],
        1,
        "Cette méthode (la plus utilisée en pratique) suppose implicitement un mouvement parallèle des yields de tous les bonds du portefeuille — si les bonds diffèrent en maturité, crédit ou devise, leurs yields peuvent bouger différemment (non-parallel shift), biaisant l'estimation. A est faux (elle s'applique à n'importe quel nombre de bonds), C est faux (le biais peut aller dans les deux sens selon le mouvement réel de la courbe).",
      ],
      // Concept 10 — Duration drivers and the perpetuity limiting case
      [
        "Holding all other bond characteristics constant, which of the following changes would most likely INCREASE a bond's duration?",
        ["An increase in the coupon rate.", "An increase in the yield to maturity.", "A decrease in the coupon rate."],
        2,
        "Un coupon plus faible concentre davantage la valeur du bond dans le remboursement du principal (un cash flow unique, lointain), ce qui augmente la duration — même logique que la comparaison zero-coupon vs coupon bond. À l'inverse, une hausse du coupon (A) ou du YTM (B) réduisent la duration.",
      ],
      [
        "A perpetual bond (no maturity, fixed coupon paid forever) has a yield to maturity of 5%. Its Macaulay duration, MacDur = (1+y)/y, is closest to:",
        ["5.00 years.", "20.00 years.", "21.00 years."],
        2,
        "Pour une perpétuité, MacDur = (1+y)/y = 1,05/0,05 = 21,00 ans — un cas limite utile pour vérifier un calcul de duration. Le distracteur B (1/y=20) oublie le « +1 » au numérateur, une erreur fréquente.",
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
