// Seed script — quiz de "drill" pour la page 3 de la fiche PDF Fixed
// Income (Yields, Spreads & Term Structure). 5 concepts x 3 variantes.
// Usage: node scripts/seed-fixed-income-drill-page3.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Fixed Income (Système)";

const QUIZ_SETS = [
  {
    title: "Fixed Income — Drill Fiche Page 3 (Yields, Spreads & Term Structure)",
    difficulty: 2,
    questions: [
      // Concept 1 — G-spread/I-spread flat curve limitation
      [
        "The G-spread and I-spread are theoretically precise measures of a bond's credit and liquidity risk only when:",
        [
          "the bond has a call option.",
          "the benchmark yield curve (government or swap) is flat.",
          "the bond is trading at a significant discount to par.",
        ],
        1,
        "Le G-spread et l'I-spread utilisent chacun un seul point de la courbe benchmark — ils ne sont théoriquement exacts que si cette courbe est plate (rendements à peu près égaux quelle que soit la maturité) ; sinon, ils mélangent un effet de structure par termes avec le vrai spread de crédit/liquidité.",
      ],
      [
        "A steeply upward-sloping government yield curve most likely causes the G-spread on a long-maturity corporate bond to:",
        [
          "be a perfectly accurate measure of credit and liquidity risk regardless of curve shape.",
          "overstate the bond's credit and liquidity risk, since part of the spread reflects the upward-sloping curve rather than credit/liquidity factors alone.",
          "understate the bond's credit and liquidity risk, since the curve shape reduces measured spread.",
        ],
        1,
        "Le G-spread compare le YTM du bond à un rendement gouvernemental de maturité similaire, une approche exacte seulement sur une courbe plate ; sur une courbe pentue, le spread reflète en partie le niveau plus élevé des taux longs, donc il tend à surestimer le vrai risque de crédit/liquidité.",
      ],
      [
        "Which yield spread measure is least sensitive to the assumption that the benchmark yield curve is flat?",
        [
          "The G-spread.",
          "The I-spread.",
          "The Z-spread, since it is computed using the entire spot rate curve rather than a single point.",
        ],
        2,
        "Le Z-spread est ajouté à chaque point de la courbe spot benchmark (pas un seul point), donc il ne repose pas sur l'hypothèse de courbe plate contrairement au G-spread et à l'I-spread — c'est une mesure plus robuste quelle que soit la forme de la courbe.",
      ],
      // Concept 2 — Z-spread definition
      [
        "The Z-spread on a corporate bond is best described as the single spread that, when added to:",
        [
          "the bond's own yield to maturity, produces the government bond yield of the same maturity.",
          "each spot rate on the benchmark yield curve, makes the present value of the bond's cash flows equal to its market price.",
          "the swap rate curve only, ignores the government spot curve entirely.",
        ],
        1,
        "Le Z-spread (« zero-volatility spread ») est le spread constant ajouté uniformément à chaque point de la courbe spot benchmark, de sorte qu'actualiser les cash flows du bond à (taux spot + spread) à chaque maturité donne une valeur actuelle égale au prix de marché du bond.",
      ],
      [
        "Compared to the G-spread, the Z-spread most likely provides a more accurate measure of a bond's credit and liquidity risk because it:",
        [
          "ignores the bond's cash flow timing entirely.",
          "uses the entire benchmark spot curve rather than a single point, so it does not require a flat yield curve.",
          "is always smaller in magnitude than the G-spread.",
        ],
        1,
        "Le Z-spread actualise chaque cash flow au taux spot spécifique à sa maturité plus le spread, capturant toute la structure par termes — contrairement au G-spread, qui repose sur une comparaison à un seul point (YTM) et n'est exact que sur une courbe plate.",
      ],
      [
        "A bond's Z-spread is calculated to be 145 basis points, and its G-spread (based on an interpolated government bond yield) is 130 basis points. This difference most likely arises because:",
        [
          "the Z-spread and G-spread should always be identical by construction.",
          "the yield curve is not flat, so using a single point (G-spread) versus the full spot curve (Z-spread) produces slightly different spread estimates.",
          "the bond defaulted between the two calculations.",
        ],
        1,
        "Le G-spread et le Z-spread sont conceptuellement liés mais pas identiques sauf si la courbe benchmark est plate ; comme les courbes réelles ont généralement une certaine pente, les deux mesures diffèrent typiquement un peu, le Z-spread étant considéré comme la mesure la plus précise théoriquement.",
      ],
      // Concept 3 — FRN discount margin vs quoted margin
      [
        "A floating-rate note has a quoted margin of 150 basis points at issuance. If the issuer's credit quality has deteriorated since issuance, the note's discount margin, relative to its quoted margin, will most likely be:",
        [
          "higher, and the note will trade at a discount to par.",
          "lower, and the note will trade at a premium to par.",
          "equal, and the note will trade at par regardless of credit changes.",
        ],
        0,
        "Si la qualité de crédit se détériore, le marché exige désormais un spread plus large sur le taux de référence (discount margin, DM plus élevé) que le quoted margin (QM) contractuel fixe. Comme DM > QM, le titre vaut moins que le pair — il se négocie à discount.",
      ],
      [
        "A floating-rate note's quoted margin is 80 basis points. The market currently requires a discount margin of 50 basis points on comparable notes. This FRN is most likely trading:",
        [
          "at a discount to par, since QM > DM.",
          "at a premium to par, since QM > DM.",
          "at par, since margins do not affect FRN pricing.",
        ],
        1,
        "Quand le quoted margin (80 pb) dépasse le discount margin exigé aujourd'hui par le marché (50 pb), le titre paie plus que ce que le marché exige, donc il vaut plus que le pair — une prime.",
      ],
      [
        "All else equal, a general improvement in the reference rate's level (e.g., a rise in the benchmark rate) between an FRN's issuance and today would most likely:",
        [
          "change both the quoted margin and the discount margin by the same amount, leaving their difference — and thus the note's premium/discount status — unaffected.",
          "increase the quoted margin only.",
          "permanently fix the note's price at par regardless of credit changes.",
        ],
        0,
        "Le quoted margin est fixé contractuellement à l'émission et ne change pas avec le taux de référence. Un simple changement du niveau du taux de référence (sans changement de qualité de crédit) affecte le coupon et le taux d'actualisation de façon proportionnelle, mais ne modifie pas en soi la différence RELATIVE entre QM et DM — ce sont les changements de qualité de crédit, pas le niveau du taux de référence, qui déplacent le DM par rapport au QM.",
      ],
      // Concept 4 — One-year forward rate calculation
      [
        "The 1-year spot rate is 5.0% and the 2-year spot rate is 6.5%. The 1-year forward rate one year from now is closest to:",
        ["1.43%.", "8.00%.", "8.02%."],
        2,
        "IFR(1,1) = (1+z2)²/(1+z1) − 1 = (1,065)²/1,05 − 1 = 1,134225/1,05 − 1 = 1,08021 − 1 = 8,02%. A oublie d'élever le facteur du taux 2 ans au carré. B utilise une approximation linéaire simple (2×6,5% − 5%) au lieu de la formule de composition correcte.",
      ],
      [
        "The 1-year spot rate is 4.0% and the 2-year spot rate is 5.0%. The 1-year forward rate one year from now is closest to:",
        ["5.00%.", "6.00%.", "6.01%."],
        2,
        "IFR(1,1) = (1,05)²/1,04 − 1 = 1,1025/1,04 − 1 = 1,060096 − 1 ≈ 6,01%. A répète à tort simplement le taux spot à 2 ans. B est l'approximation linéaire (incorrecte) 2×5,0% − 4,0% = 6,00%, proche mais pas le taux forward composé précis.",
      ],
      [
        "If the 2-year spot rate is higher than the 1-year spot rate, the 1-year forward rate one year from now will most likely be:",
        [
          "higher than the 2-year spot rate.",
          "equal to the 1-year spot rate.",
          "lower than the 2-year spot rate.",
        ],
        0,
        "Le taux spot à 2 ans est une combinaison du taux à 1 an et du taux forward 1 an dans 1 an ; comme z1 < z2 (courbe montante), le taux forward doit être encore plus élevé que z2 pour tirer la moyenne vers le haut — confirmé numériquement dans les exemples précédents (z1=5%, z2=6,5% → forward=8,02%, supérieur à z2).",
      ],
      // Concept 5 — Spot curve vs zero-coupon curve
      [
        "The government spot curve is most accurately described as being conceptually equivalent to a curve of:",
        [
          "yields to maturity on coupon-paying government bonds priced at par.",
          "yields on zero-coupon government bonds (or their equivalent) at each maturity.",
          "the average of all forward rates implied by the par curve.",
        ],
        1,
        "Par définition, le taux spot à une maturité donnée est le rendement d'un flux de trésorerie unique reçu à cette maturité — exactement ce que fournit un zero-coupon bond. La courbe spot est donc conceptuellement équivalente à la courbe des rendements zero-coupon.",
      ],
      [
        "The par curve differs from the spot curve mainly because the par curve reflects:",
        [
          "yields on zero-coupon bonds only.",
          "the yield that a coupon-paying bond priced exactly at par would have to offer, blending several different spot rates across its cash flows.",
          "forward rates rather than current rates.",
        ],
        1,
        "Le rendement d'un bond au pair est un seul chiffre qui fait qu'un bond à coupon (avec des cash flows répartis sur plusieurs maturités) se négocie au pair — c'est en fait un mélange pondéré des taux spot applicables à chacun de ses cash flows, contrairement à la courbe spot qui isole le taux d'une seule maturité/cash flow.",
      ],
      [
        "If a market has no actual zero-coupon government bonds trading, the (theoretical) spot curve is most likely constructed by:",
        [
          "directly observing zero-coupon bond yields, since a spot curve cannot be derived otherwise.",
          "bootstrapping it from the observed par curve of coupon-paying bonds.",
          "averaging historical forward rates over the past 10 years.",
        ],
        1,
        "Quand aucun zero-coupon bond ne se négocie à chaque maturité, la courbe spot théorique est dérivée (« bootstrappée ») à partir de la courbe par observée — en résolvant itérativement, maturité par maturité, le taux spot cohérent avec le prix de chaque bond au pair.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Fixed Income Page 3...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
