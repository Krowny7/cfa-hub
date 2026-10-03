// Seed script — quiz de "drill" associé à la page 1 de la fiche PDF Fixed
// Income (Bond Features & Valuation Basics). Le contenu d'origine de ce drill
// avait été fourni par l'utilisateur ; il a été remis au cadre FSA / Equity à
// sa demande le 3 octobre 2026. Structure : pour chacun des 8 concepts clés de
// la page (page dense), 1 question officielle (banque de pratique CFA, Fixed
// Income Readings 50, 54, 55 et 56, corrigé vérifié contre le PDF
// "- Answers.pdf" correspondant) + 1 variante "angle différent" (même notion,
// mais jamais un simple changement de chiffres menant au même raisonnement) +
// 1 variante "plus difficile" (raisonnement à plusieurs étapes / pièges
// combinés). Voir memory regle-drill-variantes-cfa-hub. Questions en anglais,
// explications en français. Les QCM déjà imprimés sur la fiche ne sont pas
// repris.
// Les questions officielles sont recopiées à l'identique : syncQuizSets
// retrouve l'historique de réponses en comparant le texte exact de l'énoncé.
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

      // Concept 2 — Coupon d'un FRN = MRR + quoted margin (officielle, Reading 56)
      [
        "Jacobs Company (Jacobs) has issued floating-rate notes (FRNs) using a market reference rate (MRR) of 3.5%. Jacobs is deemed as having less credit risk than the institution from which the MRR was derived. Which of the following annualized coupon rates for the note is most likely?",
        ["3.50%.", "3.15%.", "3.85%."],
        1,
        "Coupon d'un FRN = MRR + quoted margin (QM). Le QM reflète le risque de crédit de l'émetteur par rapport aux banques à partir desquelles le MRR est calculé. Jacobs étant MOINS risqué que ces banques, son QM est négatif : le coupon est inférieur au MRR, soit 3,15 % (QM = −35 pb). A (3,50 %) supposerait un QM nul, c'est-à-dire un risque de crédit identique à celui des banques de référence. C (3,85 %) supposerait un QM positif, celui d'un émetteur plus risqué que ces banques.",
      ],
      // Variante angle différent — calcul inversé : retrouver la marge à partir du dernier paiement
      [
        "A $1,000,000 floating-rate note pays quarterly coupons equal to 3-month MRR plus a quoted margin; the rate is set at the start of each quarter and paid at the end. At the last reset date, 3-month MRR was 4.60%. On the maturity date, the investor receives a total of $1,013,250. The quoted margin is closest to:",
        ["70 bp.", "17.5 bp.", "132.5 bp."],
        0,
        "Formule de la fiche : dernier paiement = principal + principal × (MRR + QM)/n. Coupon = 1 013 250 − 1 000 000 = 13 250 $, soit 1,325 % par trimestre, donc un taux annuel de 1,325 % × 4 = 5,30 %. QM = 5,30 % − 4,60 % = 0,70 % = 70 pb. B (17,5 pb) retranche le MRR trimestriel (4,60 %/4 = 1,15 %) du coupon trimestriel : 1,325 % − 1,15 % = 0,175 % est une marge PAR TRIMESTRE, qu'il fallait annualiser (× 4). C (132,5 pb) prend tout le coupon trimestriel pour la marge, en oubliant à la fois le MRR et l'annualisation.",
      ],
      // Variante plus difficile — dernier paiement avec deux données-pièges (taux fixé en début de période ; spread exigé ≠ marge contractuelle)
      [
        "A €10,000,000 floating-rate note pays semiannual coupons at 6-month Euribor + 120 bp; the rate is set at the beginning of each period and paid at the end. Since issuance, the issuer's credit quality has deteriorated, and investors now require a margin of 150 bp over Euribor. Six months before maturity, 6-month Euribor was 2.80%; on the maturity date, it is 3.60%. Ignoring day-count adjustments, the total amount the investor receives on the maturity date is closest to:",
        ["€10,240,000.", "€10,215,000.", "€10,200,000."],
        2,
        "Deux pièges à écarter. (1) Le coupon payé à l'échéance a été fixé au DÉBUT de la dernière période (paiement à terme échu) : on prend l'Euribor de 2,80 %, pas celui de 3,60 % observé le jour de l'échéance. (2) Le coupon dépend de la marge contractuelle (quoted margin de 120 pb), fixée à l'émission : la hausse du spread exigé par le marché (150 pb) fait baisser le prix du FRN sur le marché secondaire, mais ne change pas le coupon (règle de la fiche : credit spread de l'émetteur en hausse → coupon inchangé, prix en baisse). Taux = 2,80 % + 1,20 % = 4,00 % ; coupon semestriel = 4,00 %/2 × 10 000 000 = 200 000 € ; total = 10 000 000 + 200 000 = 10 200 000 €. A utilise l'Euribor du jour de l'échéance : (3,60 % + 1,20 %)/2 = 2,40 % → 10 240 000 €. B utilise la marge exigée par le marché au lieu de la marge contractuelle : (2,80 % + 1,50 %)/2 = 2,15 % → 10 215 000 €.",
      ],

      // Concept 3 — Coupon rate vs market discount rate : par, discount ou premium (officielle, Reading 54)
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

      // Concept 4 — Relations prix-rendement : effets inverse, maturité, coupon, convexité (officielle, Reading 54)
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

      // Concept 5 — Flat price, accrued interest, full price (officielle, Reading 54)
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

      // Concept 6 — Current yield et simple yield vs YTM (officielle, Reading 55)
      [
        "A $1,000 par value, 10%, semiannual, 20-year debenture bond is currently selling for $1,100. What is this bond's current yield and will the current yield be higher or lower than the yield to maturity?",
        [
          "Current yield: 8.9%; current yield vs. YTM: lower.",
          "Current yield: 9.1%; current yield vs. YTM: higher.",
          "Current yield: 8.9%; current yield vs. YTM: higher.",
        ],
        1,
        "Current yield = coupon annuel / prix = 100 / 1 100 = 9,09 % ≈ 9,1 %. Le titre cote au-dessus du pair (prime) : son YTM est donc inférieur au coupon (N = 40, PMT = 50, PV = −1 100, FV = 1 000 → 4,46 % × 2 = 8,92 %). Le current yield se situe entre le coupon (10 %) et le YTM (8,9 %) : il ignore la perte de la prime à mesure que le prix converge vers le pair, et il est donc supérieur au YTM. A et C donnent 8,9 %, qui est le YTM et non le current yield ; A inverse en plus la comparaison.",
      ],
      // Variante angle différent — une autre mesure de la même famille : le simple yield (amortissement linéaire)
      [
        "A 5% annual-coupon bond with a par value of 100 and 8 years to maturity has a flat price of 92.00. Using straight-line amortization of the discount, the bond's simple yield is closest to:",
        ["5.43%.", "6.00%.", "6.52%."],
        2,
        "Simple yield = (coupon annuel + gain d'amortissement annuel) / flat price. La décote de 100 − 92 = 8 est répartie linéairement sur 8 ans : +1,00 par an. Simple yield = (5 + 1) / 92 = 6,52 %. A (5,43 % = 5/92) est le current yield : il ignore la remontée du prix vers le pair. B (6,00 %) divise par le pair au lieu du flat price. Pour une obligation en prime, l'amortissement serait au contraire une perte, retranchée du coupon.",
      ],
      // Variante plus difficile — retrouver le prix à partir du current yield, puis classer quatre mesures de rendement
      [
        "A 6% annual-coupon, option-free bond with a par value of 100 and 10 years to maturity has a current yield of 6.50%. Which of the following correctly ranks the bond's coupon rate, current yield, yield to maturity, and simple yield (straight-line amortization), from lowest to highest?",
        [
          "Coupon rate < current yield < yield to maturity < simple yield.",
          "Coupon rate < current yield < simple yield < yield to maturity.",
          "Yield to maturity < current yield < coupon rate < simple yield.",
        ],
        0,
        "Étape 1 — Prix : current yield = coupon / prix → prix = 6 / 0,065 = 92,31 (discount). Étape 2 — YTM : N = 10, PMT = 6, PV = −92,31, FV = 100 → YTM ≈ 7,10 %. Étape 3 — Simple yield : gain d'amortissement = (100 − 92,31) / 10 = 0,77 par an → (6 + 0,77) / 92,31 = 7,33 %. Classement : 6,00 % < 6,50 % < 7,10 % < 7,33 %. Pour une obligation en discount, le current yield est inférieur au YTM (il ignore la remontée vers le pair), et le simple yield, qui ajoute ce gain de façon linéaire sans capitalisation, dépasse ici le YTM. B suppose à tort que le YTM est toujours la mesure la plus élevée. C applique le classement d'une obligation en prime, alors qu'un current yield supérieur au coupon signale un prix inférieur au pair.",
      ],

      // Concept 7 — Yield to call et yield to worst (officielle, Reading 55)
      [
        "Jorge Fullen is evaluating a 7%, 10-year bond that is callable at par in 5 years. Coupon payments can be reinvested at an annual rate of 7%, and the current price of the bond is $1,065.00 per $1,000 of face value. The bond pays interest semiannually. Should Fullen consider the yield to first call (YTC) or the yield to maturity (YTM) in making his purchase decision?",
        ["YTM, since YTM is greater than YTC.", "YTC, since YTC is less than YTM.", "YTC, since YTC is greater than YTM."],
        1,
        "Le titre cote au-dessus du pair (1 065 $) et peut être remboursé au pair dans 5 ans : en cas de call, la prime de 65 $ serait perdue sur 5 ans au lieu de 10, d'où un rendement plus faible. YTC : N = 10, PMT = 35, PV = −1 065, FV = 1 000 → 2,75 % × 2 = 5,5 % ; YTM : N = 20 → 3,06 % × 2 = 6,12 %. YTC < YTM : la mesure prudente, le yield to worst, est le YTC. A retient la mesure la plus élevée, ce qui surestime le rendement. C décrit mal la relation : le YTC est ici inférieur au YTM, pas supérieur.",
      ],
      // Variante angle différent — le cas inverse : obligation callable en discount
      [
        "A 4% annual-coupon bond matures in 10 years and is callable at par in 3 years. It currently trades at 92.00. Without calculating either yield, which measure is the bond's yield to worst?",
        [
          "The yield to first call, because the worst case for an investor in a callable bond is always that the bond is called.",
          "Neither: the yield to call and the yield to maturity are equal, because the call price equals par.",
          "The yield to maturity, because a call at par would return the discount to the investor sooner and therefore raise the return.",
        ],
        2,
        "Le titre cote sous le pair. S'il est remboursé au pair dans 3 ans, l'investisseur récupère la décote de 8 en 3 ans au lieu de 10 : le gain est concentré sur une période plus courte, donc YTC > YTM (environ 7,1 % contre 5,0 %). Le yield to worst étant le plus bas de tous les rendements possibles (YTC et YTM), c'est ici le YTM. A est faux : être remboursé n'est défavorable que si le titre cote au-dessus du prix de call (cas d'une prime, comme dans la question officielle). B confond égalité des prix de remboursement et égalité des rendements : la même somme de 100 reçue après 3 ans ou après 10 ans ne donne pas le même rendement pour un prix payé de 92.",
      ],
      // Variante plus difficile — calendrier de calls : le pire scénario n'est pas forcément le premier call
      [
        "An 8% annual-coupon bond with 10 years to maturity trades at 106.00 per 100 of par. It is callable in 3 years at 104 and in 5 years at 101; otherwise, it is redeemed at par at maturity. The bond's yield to worst is closest to:",
        ["6.72%.", "6.96%.", "7.14%."],
        0,
        "On calcule chaque rendement possible (PV = −106, PMT = 8). YTC à 3 ans : N = 3, FV = 104 → 6,96 %. YTC à 5 ans : N = 5, FV = 101 → 6,72 %. YTM : N = 10, FV = 100 → 7,14 %. Le yield to worst est le plus bas : 6,72 %, le rendement au DEUXIÈME call. B (6,96 %) est le piège du premier call retenu par réflexe : la prime de call élevée à 3 ans (104) compense l'investisseur, si bien que ce scénario n'est pas le pire. C (7,14 %) est le YTM : le retenir pour une obligation callable en prime surestime le rendement.",
      ],

      // Concept 8 — Convertible bonds : option du porteur, conversion ratio et conversion value (officielle, Reading 55)
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
