// Seed script — quiz de "drill" associé à la page 1 de la fiche PDF Fixed
// Income (Bond Features & Valuation Basics). Le contenu d'origine de ce drill
// avait été fourni par l'utilisateur ; il a été remis au cadre FSA / Equity à
// sa demande le 3 octobre 2026. Structure : pour chacun des 5 concepts clés de // la page, 1 question officielle (banque de pratique CFA, Fixed
// Income Readings 50, 54, 55 et 56, corrigé vérifié contre le PDF
// "- Answers.pdf" correspondant) + 1 variante "angle différent" (même notion,
// mais jamais un simple changement de chiffres menant au même raisonnement) +
// 1 variante "plus difficile" (raisonnement à plusieurs étapes / pièges
// combinés). Voir memory regle-drill-variantes-cfa-hub. Questions en anglais,
// explications en français. Les QCM déjà imprimés sur la fiche ne sont pas
// repris.
// Les questions officielles sont recopiées à l'identique : syncQuizSets
// retrouve l'historique de réponses en comparant le texte exact de l'énoncé.
// Ramené à 5 concepts (15 questions) le 5 octobre 2026, à la demande de
// l'utilisateur : concepts d'origine 2, 6, 7 retirés de la fiche, leurs
// questions rangées dans « Réserve — <titre> » (syncQuizSets, rien d'effacé).
// Usage: node scripts/seed-fixed-income-drill-page1.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Fixed Income (Système)";

const QUIZ_SETS = [
  {
    title: "Fixed Income — Drill Fiche Page 1 (Bond Features & Valuation Basics)",
    difficulty: 1,
    questions: [
      // Concept 1 — Domestic / foreign / eurobond (officielle, Reading 50)
      [
        "Which of the following securities is least likely classified as a eurobond? A bond that is denominated in:",
        ["euros and issued in Germany.", "euros and issued in the United States.", "U.S. dollars and issued in Japan."],
        0,
        "Un eurobond est libellé dans une devise différente de celle du ou des pays où il est émis et vendu ; le nom n'a rien à voir avec l'euro ni avec l'Europe. A : des obligations en euros émises en Allemagne sont libellées dans la devise du pays d'émission. Ce sont des obligations domestiques (ou des foreign bonds si l'émetteur n'est pas allemand), pas des eurobonds : c'est la bonne réponse. B : des obligations en euros émises aux États-Unis sont bien des eurobonds (devise différente de celle du pays d'émission). C : des obligations en dollars émises au Japon sont des « eurodollar bonds », donc des eurobonds.",
      ],
      // Variante angle différent — ce qui sépare domestic et foreign bond : le domicile de l'émetteur, pas la devise
      [
        "A Canadian company sells euro-denominated bonds only to investors in Germany. At the same time, a German company sells euro-denominated bonds only to investors in Germany. Which statement best describes the two issues?",
        [
          "Both issues are eurobonds, because both are denominated in euros.",
          "The Canadian company's issue is a foreign bond and the German company's issue is a domestic bond; they differ only by the issuer's country of domicile.",
          "The Canadian company's issue is a eurobond, because it is denominated in a currency other than the issuer's home currency.",
        ],
        1,
        "Les deux émissions sont libellées dans la devise du pays où elles sont vendues (l'euro, en Allemagne) : aucune n'est un eurobond. Ce qui les distingue, c'est le domicile de l'émetteur : émetteur allemand en Allemagne = domestic bond ; émetteur canadien en Allemagne = foreign bond (exactement l'exemple de la fiche). A tombe dans le piège signalé sur la fiche : « euro-denominated » ne veut pas dire eurobond. C applique un mauvais critère : un eurobond se définit par l'écart entre la devise et le marché où le titre est émis, pas par l'écart entre la devise et la monnaie du pays de l'émetteur.",
      ],
      // Variante plus difficile — classer cinq émissions, avec deux pièges (émetteur de la zone euro hors zone euro ; « euro » vendu en Europe)
      [
        "Consider the following five bond issues: (1) a Japanese company's yen-denominated bonds sold only in Japan; (2) a U.S. company's yen-denominated bonds sold only in Japan; (3) a German company's euro-denominated bonds sold simultaneously to investors in the United Kingdom, Switzerland, and Singapore; (4) a French company's U.S. dollar-denominated bonds sold simultaneously to investors in the United Kingdom, Singapore, and Switzerland; (5) a Brazilian company's euro-denominated bonds sold only in Spain. Which issues are eurobonds?",
        ["(4) and (5) only.", "(2), (4), and (5) only.", "(3) and (4) only."],
        2,
        "Un seul critère : la devise est-elle différente de celle des pays où les titres sont vendus ? (1) Yen au Japon, émetteur japonais → domestic bond. (2) Yen au Japon, émetteur américain → foreign bond (« Samurai bond ») : la nationalité de l'émetteur ne suffit pas à faire un eurobond. (3) Euros vendus au Royaume-Uni, en Suisse et à Singapour, donc hors zone euro → eurobond, même si l'émetteur est allemand : c'est le premier piège, un émetteur de la zone euro peut émettre un eurobond libellé en euros. (4) Dollars vendus hors des États-Unis → eurodollar bond, donc eurobond. (5) Euros vendus en Espagne (zone euro) par un émetteur brésilien → foreign bond, malgré les mots « euro » et « Europe » : c'est le second piège. A retient (5) à cause du mot euro et oublie (3). B compte les foreign bonds (2) et (5) comme des eurobonds et oublie (3).",
      ],

      // Concept 2 — Coupon rate vs market discount rate : par, discount ou premium (officielle, Reading 54)
      [
        "Ron Logan, CFA, is a bond manager. He purchased $50 million in 6.0% coupon Southwest Manufacturing bonds at par three years ago. Today, the bonds are priced to yield 6.85%. The bonds mature in nine years. The Southwest bonds are trading at a:",
        [
          "discount, and the yield to maturity has decreased since purchase.",
          "premium, and the yield to maturity has decreased since purchase.",
          "discount, and the yield to maturity has increased since purchase.",
        ],
        2,
        "Logan a acheté au pair : à l'achat, le YTM était donc égal au coupon, 6,0 %. Aujourd'hui, le rendement exigé est de 6,85 %, supérieur au coupon de 6,0 % (CR < MDR) → prix inférieur au pair : le titre se traite en discount, et le YTM a augmenté depuis l'achat (de 6,0 % à 6,85 %). A a raison sur le discount mais se trompe de sens sur le YTM : un YTM en baisse ferait monter le prix. B décrit le cas inverse : une prime suppose un YTM inférieur au coupon.",
      ],
      // Variante angle différent — le « pourquoi » : un downgrade ne touche pas le coupon mais le taux d'actualisation
      [
        "A company's 5% annual-coupon bonds were issued at par. Since then, the company has been downgraded and its credit spread has widened, while benchmark government yields are unchanged. Which statement best describes the effect on these bonds?",
        [
          "The coupon rate is reset upward to compensate investors for the higher risk, so the bonds continue to trade at par.",
          "The coupon rate remains 5%, the market discount rate rises above 5%, and the bonds trade at a discount.",
          "The coupon rate remains 5%, and because the coupon is fixed, the bonds' price is unaffected by the change in credit spread.",
        ],
        1,
        "Le coupon d'une obligation à taux fixe est fixé contractuellement à l'émission : un downgrade ne le modifie pas. En revanche, le taux d'actualisation exigé par le marché (MDR = taux de référence + spread de crédit) augmente : MDR > coupon (CR < MDR) → prix inférieur au pair, l'obligation passe en discount. A décrit un mécanisme qui n'existe pas pour une obligation classique (seules des structures particulières, comme les credit-linked coupon bonds, ajustent le coupon à la note). C oublie que le prix est la valeur actualisée des flux : des flux fixes actualisés à un taux plus élevé valent moins.",
      ],
      // Variante plus difficile — décomposer le rendement (taux de référence + spread) quand les deux bougent en sens opposé
      [
        "A 10-year, 5% annual-coupon corporate bond was issued at par when the benchmark government yield for the same maturity was 3.80%. One year later, the benchmark yield has fallen by 60 bp, while the bond's credit spread has widened by 40 bp. Which statement is most accurate?",
        [
          "The bond trades at a discount, because its issuer's credit spread has widened.",
          "The bond trades at par, because its coupon rate has not changed.",
          "The bond trades at a premium, because its market discount rate is now below its coupon rate.",
        ],
        2,
        "Décompose le rendement. À l'émission, au pair : YTM = coupon = 5,00 % = 3,80 % (taux de référence) + 1,20 % (spread). Un an plus tard : taux de référence = 3,80 % − 0,60 % = 3,20 % ; spread = 1,20 % + 0,40 % = 1,60 % ; MDR = 3,20 % + 1,60 % = 4,80 %. Coupon de 5,00 % > MDR de 4,80 % (CR > MDR) → prime. A ne regarde que l'élargissement du spread (+40 pb) et oublie la baisse plus forte du taux de référence (−60 pb) : au total, le rendement exigé baisse de 20 pb. B confond coupon inchangé et prix inchangé : le prix dépend de l'écart entre le coupon et le rendement exigé, qui a bougé.",
      ],

      // Concept 3 — Relations prix-rendement : effets inverse, maturité, coupon, convexité (officielle, Reading 54)
      [
        "Other things equal, for option-free bonds:",
        [
          "a bond's value is more sensitive to yield increases than to yield decreases.",
          "the value of a long-term bond is more sensitive to interest rate changes than the value of a short-term bond.",
          "the value of a low-coupon bond is less sensitive to interest rate changes than the value of a high-coupon bond.",
        ],
        1,
        "Effet maturité : à coupon et rendement égaux, une obligation longue est plus sensible aux variations de taux qu'une obligation courte, car ses flux sont actualisés sur davantage de périodes. A inverse l'effet de convexité : pour une obligation sans option, une baisse de rendement fait monter le prix PLUS qu'une hausse équivalente ne le fait baisser. C inverse l'effet coupon : c'est l'obligation à coupon faible qui est la plus sensible, pas la moins sensible.",
      ],
      // Variante angle différent — le « pourquoi » de l'effet coupon
      [
        "Two option-free bonds have the same maturity and the same yield to maturity, but Bond L has a lower coupon rate than Bond H. Which of the following best explains why Bond L's price is more sensitive to a change in yield?",
        [
          "A larger share of Bond L's value comes from cash flows received far in the future, which are discounted over more periods.",
          "Bond L trades at a lower price, and lower-priced bonds always have higher yields to maturity.",
          "Bond L's coupons will be reinvested at a lower rate, which increases its reinvestment risk.",
        ],
        0,
        "Le prix d'une obligation est la somme de ses flux actualisés. Avec un coupon faible, la part de la valeur concentrée dans le remboursement final (le flux le plus lointain) est plus grande ; or un flux lointain réagit davantage à une variation de taux, puisqu'il est actualisé sur plus de périodes. Le zéro-coupon est le cas extrême : toute sa valeur est à l'échéance. B est faux : les deux obligations ont ici le même YTM, et un prix plus bas n'implique aucun rendement plus élevé. C mélange deux notions : le risque de réinvestissement est d'ailleurs PLUS faible avec un coupon faible (moins de flux à réinvestir), et il n'explique pas la sensibilité du prix.",
      ],
      // Variante plus difficile — combiner effet maturité, effet coupon et convexité sur trois obligations
      [
        "Three option-free bonds are each priced to yield 6%: a 5-year, 8% coupon bond; a 20-year, 8% coupon bond; and a 20-year, 3% coupon bond. If yields rise by 100 bp, which bond will experience the largest percentage price decline, and how would its price change if yields instead fell by 100 bp?",
        [
          "The 20-year, 8% coupon bond; its price would rise by more than the decline.",
          "The 20-year, 3% coupon bond; its price would rise by more than the decline.",
          "The 20-year, 3% coupon bond; its price would rise by exactly the same percentage as the decline.",
        ],
        1,
        "Trois effets à combiner. Effet maturité : les deux obligations à 20 ans sont plus sensibles que celle à 5 ans. Effet coupon : à 20 ans, le coupon de 3 % est plus sensible que celui de 8 %. Effet de convexité : pour une obligation sans option, la hausse de prix après une baisse de 100 pb dépasse la baisse de prix après une hausse de 100 pb. Vérification (coupons annuels, nominal 100) : 20 ans 3 % : 65,59 → 57,62 à 7 % (−12,1 %) et 75,08 à 5 % (+14,5 %) ; 20 ans 8 % : 122,94 → 110,59 (−10,0 %) et 137,39 (+11,8 %) ; 5 ans 8 % : −4,0 % et +4,2 %. A oublie l'effet coupon. C oublie la convexité : la relation prix-rendement est convexe, pas linéaire.",
      ],

      // Concept 4 — Flat price, accrued interest, full price (officielle, Reading 54)
      [
        "Austin Traynor is considering buying a $1,000 face value, semi-annual coupon bond with a quoted price of 104.75 and accrued interest since the last coupon of $33.50. Ignoring transaction costs, how much will the seller receive at the settlement date?",
        ["$1,014.00.", "$1,047.50.", "$1,081.00."],
        2,
        "Le vendeur reçoit le full price (dirty price) : prix coté (flat) + intérêts courus, qui lui reviennent pour la période où il a détenu le titre depuis le dernier coupon. Flat price = 104,75 % × 1 000 = 1 047,50 $ ; full price = 1 047,50 + 33,50 = 1 081,00 $. A soustrait les intérêts courus au lieu de les ajouter (1 047,50 − 33,50 = 1 014,00 $). B s'arrête au prix coté, qui n'inclut pas les intérêts courus.",
      ],
      // Variante angle différent — le « pourquoi » : pourquoi le marché cote le flat price
      [
        "Why do bond dealers usually quote bonds at their flat (clean) price rather than at their full (dirty) price?",
        [
          "Because the flat price includes the interest accrued since the last coupon, so it reflects the amount actually paid by the buyer.",
          "Because the full price rises day by day as interest accrues and drops after each coupon payment, so the flat price better shows price changes caused by changes in market yields or credit quality.",
          "Because accrued interest is paid by the issuer, not by the buyer, at the settlement date.",
        ],
        1,
        "Le full price augmente chaque jour au rythme des intérêts courus, puis chute d'un coup après chaque paiement de coupon (profil « en dents de scie »). Coter le flat price (= full price − intérêts courus) neutralise cet effet mécanique : une variation du prix coté reflète alors un vrai changement de rendement de marché ou de qualité de crédit. A inverse les définitions : c'est le full price qui inclut les intérêts courus et correspond au montant réellement payé par l'acheteur. C est faux : à la date de règlement, c'est l'acheteur qui verse les intérêts courus au vendeur ; l'émetteur, lui, versera le coupon entier au porteur à la prochaine date de coupon.",
      ],
      // Variante plus difficile — enchaîner PV à la dernière date de coupon, full price par capitalisation, puis flat price
      [
        "A bond with a par value of 100 pays a 6% coupon semiannually and has exactly four coupon payments remaining as of its last coupon date. Its yield to maturity is 5% (stated annual rate, semiannual compounding). Settlement occurs 72 days into the 180-day coupon period (30/360 convention). The bond's flat price is closest to:",
        ["101.69.", "102.89.", "100.68."],
        0,
        "Étape 1 — Valeur à la dernière date de coupon : N = 4, I/Y = 2,5, PMT = 3, FV = 100 → PV = 101,881. Étape 2 — Full price à la date de règlement (formule de la fiche) : PV × (1 + r)^(t/T) = 101,881 × 1,025^(72/180) = 101,881 × 1,025^0,4 ≈ 102,892. Étape 3 — Intérêts courus : AI = (t/T) × PMT = 0,4 × 3 = 1,20. Étape 4 — Flat price = 102,892 − 1,20 ≈ 101,69. B s'arrête au full price (102,89), qui inclut les intérêts courus. C retranche les intérêts courus de la valeur à la dernière date de coupon sans l'avoir d'abord capitalisée jusqu'à la date de règlement (101,88 − 1,20 = 100,68).",
      ],

      // Concept 5 — Convertible bonds : option du porteur, conversion ratio et conversion value (officielle, Reading 55)
      [
        "Neuman Company has bonds outstanding with five years to maturity that trade at a spread of +240 basis points above the five-year government bond yield. Neuman also has five-year bonds outstanding that are identical in all respects except that they are convertible into 30 shares of Neuman common stock. At which of the following spreads are the convertible bonds most likely to trade?",
        ["+210 basis points.", "+270 basis points.", "+330 basis points."],
        0,
        "L'option de conversion appartient au porteur : elle a de la valeur pour lui, il accepte donc un rendement plus faible que sur une obligation identique sans option. Les convertibles se traitent ainsi à un spread inférieur à +240 pb, soit +210 pb. B et C (spreads plus élevés) correspondraient à une option détenue par l'émetteur, comme un call, pour laquelle l'investisseur exige une compensation.",
      ],
      // Variante angle différent — calcul inversé : retrouver le prix de conversion à partir de la conversion value
      [
        "A convertible bond with a par value of $1,000 has a conversion value of $1,150 when the issuer's share price is $46. The bond's conversion price is closest to:",
        ["$40.00.", "$46.00.", "$52.90."],
        0,
        "On remonte les deux formules de la fiche. Conversion value = conversion ratio × cours de l'action → ratio = 1 150 / 46 = 25 actions. Conversion ratio = par value / conversion price → conversion price = 1 000 / 25 = 40 $. Le cours (46 $) dépasse le prix de conversion (40 $) : l'option est gagnante, ce qui est cohérent avec une conversion value supérieure au pair. B confond le cours actuel de l'action avec le prix de conversion, fixé dans le contrat d'émission. C multiplie le cours par le rapport conversion value / pair (46 × 1,15 = 52,90 $) : c'est raisonner à l'envers, puisque le prix de conversion est inférieur au cours quand la conversion value dépasse le pair.",
      ],
      // Variante plus difficile — option dans la monnaie mais conversion immédiate défavorable (piège « cours > prix de conversion »)
      [
        "A $1,000 par convertible bond has a conversion price of $50 and trades at $1,080. The issuer's shares currently trade at $52. Which statement is most accurate?",
        [
          "Converting now is optimal, because the share price is above the conversion price.",
          "The conversion value is $1,123.20, so the bond trades below its conversion value.",
          "The conversion value is $1,040, so an investor who converts now would receive less than by selling the bond at its market price.",
        ],
        2,
        "Conversion ratio = 1 000 / 50 = 20 actions ; conversion value = 20 × 52 = 1 040 $. L'option est bien dans la monnaie (52 $ > 50 $), mais convertir maintenant rapporterait 1 040 $ alors que l'obligation se vend 1 080 $ : l'écart de 40 $ (conversion premium) rémunère les coupons et la valeur-temps de l'option de conversion. A est le piège : un cours supérieur au prix de conversion signifie que l'option a une valeur intrinsèque, pas qu'il faut convertir immédiatement. B calcule le ratio sur le prix de marché de l'obligation (1 080 / 50 = 21,6 actions → 1 123,20 $) au lieu de la valeur nominale.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Fixed Income Page 1...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
