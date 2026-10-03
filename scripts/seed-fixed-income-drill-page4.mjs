// Seed script — quiz de "drill" associé à la page 4 de la fiche PDF Fixed
// Income (Interest Rate Risk & Duration). Le contenu d'origine de ce drill
// venait de l'utilisateur, qui avait enrichi la page (bump, duration de
// portefeuille, effective et key rate duration, facteurs de la duration) ;
// il a été remis au cadre FSA / Equity à sa demande le 3 octobre 2026.
// Page dense : 8 concepts. Structure : pour chacun, 1 question officielle
// (banque de pratique CFA, Readings 58, 59, 60 et 61, corrigé vérifié contre
// les PDF "- Answers.pdf" correspondants) + 1 variante "angle différent"
// (même notion, mais jamais un simple changement de chiffres menant au même
// raisonnement) + 1 variante "plus difficile" (raisonnement à plusieurs
// étapes / pièges combinés). Voir memory regle-drill-variantes-cfa-hub.
// Questions en anglais, explications en français. Les QCM imprimés dans le
// PDF (page 8) ne sont pas repris.
// Les questions officielles sont recopiées à l'identique : syncQuizSets
// retrouve l'historique de réponses en comparant le texte exact de l'énoncé.
// Usage: node scripts/seed-fixed-income-drill-page4.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Fixed Income (Système)";

const QUIZ_SETS = [
  {
    title: "Fixed Income — Drill Fiche Page 4 (Interest Rate Risk & Duration)",
    difficulty: 2,
    questions: [
      // Concept 1 — Carrying value et horizon yield (officielle, Reading 58)
      [
        "Sarah Metz buys a 10-year bond at a price below par. Three years later, she sells the bond. Her capital gain or loss is measured by comparing the price she received for the bond to its:",
        ["carrying value.", "original price less amortized discount.", "original purchase price."],
        0,
        "La plus-value ou moins-value se mesure par rapport à la carrying value : le prix d'achat AUGMENTÉ de la décote amortie (bond acheté sous le pair), c'est-à-dire le prix sur la trajectoire à rendement constant. La part de hausse due à l'amortissement de la décote est un revenu d'intérêt, pas une plus-value. B se trompe de signe : pour un bond acheté en décote, on AJOUTE l'amortissement (on ne le retranche que pour un bond acheté en prime). C compte à tort l'amortissement de la décote comme une plus-value.",
      ],
      // Variante angle différent — appliquer la règle sur un cas chiffré : séparer intérêt (amortissement) et plus-value
      [
        "An investor buys a 3-year, 4% annual-pay bond at 97.277 per 100 of par, a yield to maturity of 5%. One year later, just after receiving the first coupon, she sells the bond for 98.80. Her capital gain on the sale is closest to:",
        ["−1.20.", "+1.52.", "+0.66."],
        2,
        "Carrying value après 1 an = prix sur la trajectoire au YTM d'achat (5 %) d'un bond qui n'a plus que 2 ans : 4/1,05 + 104/1,05² = 3,8095 + 94,3311 = 98,14. Plus-value = 98,80 − 98,14 = +0,66. La hausse de 97,28 à 98,14 (0,86) est l'amortissement de la décote : du revenu d'intérêt, pas une plus-value. B mesure contre le prix d'achat (98,80 − 97,28 = 1,52) et mélange donc intérêt et plus-value. A mesure contre le pair (98,80 − 100) : le bond ne rejoint le pair qu'à l'échéance.",
      ],
      // Variante plus difficile — horizon yield chiffré : réinvestissement + prix de revente, lien avec le duration gap
      [
        "An investor buys a 5-year, 6% annual-pay bond at par. Immediately after purchase, its yield to maturity rises to 7% and stays there. She reinvests coupons at 7% and sells the bond after 2 years, just after the second coupon. Her annualized horizon yield is closest to:",
        ["4.78%.", "4.58%.", "6.00%."],
        0,
        "Coupons + réinvestissement : 6 × 1,07 + 6 = 12,42. Prix de revente (bond 3 ans à 6 % valorisé à 7 %) : 6/1,07 + 6/1,07² + 106/1,07³ = 5,6075 + 5,2406 + 86,5276 = 97,38. Valeur totale à l'horizon = 109,80 → horizon yield = (109,80/100)^(1/2) − 1 = 4,78 %. B oublie les intérêts sur coupons (12 au lieu de 12,42 → 4,58 %). C suppose que l'horizon yield égale le YTM d'achat : ce n'est vrai que si les coupons sont réinvestis au YTM initial ET si la revente se fait sans gain ni perte par rapport à la carrying value. Cohérence : la Macaulay duration (≈ 4,47 ans) dépasse l'horizon de 2 ans, gap positif : le risque de prix domine, donc une hausse de taux fait baisser le rendement réalisé.",
      ],

      // Concept 2 — Duration gap = Macaulay duration − horizon (officielle, Reading 58)
      [
        "An investor is concerned about rising interest rates and associated price risks. If her investment horizon is 5.25 years, the Macaulay duration on her bond investment is likely closest to:",
        ["5.25 years.", "4.75 years.", "5.75 years."],
        2,
        "Craindre une HAUSSE des taux (risque de prix), c'est avoir un duration gap positif : Macaulay duration > horizon. Avec un horizon de 5,25 ans, seule une duration de 5,75 ans convient. A (gap nul) correspond à une situation immunisée, où risques de prix et de réinvestissement se compensent. B (gap négatif) exposerait au risque de réinvestissement, donc à une BAISSE des taux.",
      ],
      // Variante angle différent — comparer deux investisseurs sur le même bond, même choc de taux
      [
        "Two investors buy the same option-free bond, which has a Macaulay duration of 6 years and a yield to maturity of 5%. Investor X has a 3-year investment horizon; Investor Y has a 9-year horizon. Immediately after purchase, the yield curve shifts down by 100 bp in parallel and stays there. Compared with 5%, the realized horizon yields of X and Y will most likely be:",
        ["X: lower / Y: higher", "X: higher / Y: lower", "X: approximately 5% / Y: approximately 5%"],
        1,
        "X : gap = 6 − 3 = +3 → le risque de prix domine ; la baisse des taux crée une plus-value à la revente qui l'emporte sur le manque à gagner de réinvestissement → rendement réalisé > 5 %. Y : gap = 6 − 9 = −3 → le risque de réinvestissement domine ; les flux sont réinvestis longtemps à un taux plus bas, et la plus-value initiale s'est dissipée à l'horizon → rendement réalisé < 5 %. A inverse les deux effets. C ne serait vrai que pour un horizon égal à la Macaulay duration (6 ans), où les deux risques se compensent.",
      ],
      // Variante plus difficile — calculer la Macaulay duration, puis le gap (piège : modified duration) et l'exposition
      [
        "An investor with a 2-year investment horizon buys a 3-year, 10% annual-pay bond priced at par. Which statement about her duration gap and main interest rate exposure is most accurate?",
        [
          "Duration gap of about +0.49 year; main exposure: a rise in interest rates (price risk).",
          "Duration gap of about +0.74 year; main exposure: a fall in interest rates (reinvestment risk).",
          "Duration gap of about +0.74 year; main exposure: a rise in interest rates (price risk).",
        ],
        2,
        "Valeurs actuelles des flux à 10 % : 9,0909 ; 8,2645 ; 82,6446 (total 100). Macaulay duration = (1 × 9,0909 + 2 × 8,2645 + 3 × 82,6446)/100 = 2,74 ans. Gap = 2,74 − 2 = +0,74 > 0 → le risque de prix domine : elle est exposée à une hausse des taux, qui ferait baisser le prix de revente dans 2 ans. A calcule le gap avec la modified duration (2,74/1,10 = 2,49) : le duration gap se mesure toujours avec la Macaulay duration, seule à s'exprimer en années comparables à l'horizon. B a le bon gap mais se trompe d'exposition : un gap positif signifie risque de prix, pas de réinvestissement.",
      ],

      // Concept 3 — Les 4 yield durations : Macaulay, modified, money duration, PVBP (officielle, Reading 59)
      [
        "A $100,000 par value bond has a full price of $99,300, a Macaulay duration of 6.5, and an annual modified duration of 6.1. The bond's money duration per $100 par value is closest to:",
        ["$606.", "$645.", "$6.06."],
        0,
        "Money duration par 100 de nominal = annual modified duration × full price par 100 = 6,1 × 99,30 = 605,73 ≈ 606 $. B utilise la Macaulay duration (6,5 × 99,30 = 645) : la money duration se construit sur la MODIFIED duration, la Macaulay duration est ici une donnée-piège. C fait une erreur d'échelle d'un facteur 100.",
      ],
      // Variante angle différent — calcul inversé : du PVBP observé jusqu'à la Macaulay duration
      [
        "A semiannual-pay bond has a full price of 103.10 per 100 of par, a yield to maturity of 5.00%, and a PVBP of 0.0825 per 100 of par. Its annualized Macaulay duration is closest to:",
        ["8.00.", "8.40.", "8.20."],
        2,
        "On remonte la chaîne. PVBP = AnnModDur × full price × 0,0001 → AnnModDur = 0,0825/(103,10 × 0,0001) = 8,00. Puis ModDur = MacDur/(1 + YTM/n) → MacDur = 8,00 × (1 + 0,05/2) = 8,20. A s'arrête à la modified duration. B multiplie par (1 + 5 %) au lieu de (1 + 5 %/2) : avec des coupons semestriels, le diviseur utilise le taux PAR PÉRIODE (YTM/2).",
      ],
      // Variante plus difficile — PVBP par bump de 1 pb, passage à l'échelle de la position (piège nominal vs full price)
      [
        "An investor holds bonds with a par value of 2,000,000. The bond's full price is 101.40 per 100 of par. Repricing gives full prices of 101.3264 if the yield rises by 1 bp and 101.4737 if it falls by 1 bp. The money duration of the position is closest to:",
        ["14.73 million.", "14.53 million.", "29.46 million."],
        0,
        "PVBP par 100 = |V(−1 pb) − V(+1 pb)|/2 = (101,4737 − 101,3264)/2 = 0,07365. AnnModDur = 0,07365/(101,40 × 0,0001) = 7,263. Valeur de marché de la position = 2 000 000 × 101,40 % = 2 028 000. Money duration = 7,263 × 2 028 000 = 14,73 millions (contrôle : PVBP de la position = 0,07365 × 20 000 = 1 473, et 1 473 × 10 000 = 14,73 millions). B applique la duration au nominal (2 000 000) au lieu du full price de la position. C oublie de diviser l'écart de prix par 2 : il mesure l'effet d'un écart de 2 pb.",
      ],

      // Concept 4 — Ce qui fait varier la duration : maturité, coupon, YTM (officielle, Reading 59)
      [
        "An analyst has stated that, holding all else constant, an increase in the maturity of a coupon bond will typically increase its interest rate risk, and that a decrease in the coupon rate of a coupon bond will typically decrease its interest rate risk. The analyst is correct with respect to:",
        ["neither of these effects.", "only one of these effects.", "both of these effects."],
        1,
        "Maturité ↑ → duration ↑ (en général) : l'analyste a raison sur ce point (exception : certaines obligations longues en forte décote). Coupon ↓ → duration ↑ : une plus grande part de la valeur repose sur le remboursement final, lointain et très sensible aux taux ; l'analyste a donc tort sur ce point (cas extrême : le zéro-coupon, duration maximale à maturité donnée). Une seule affirmation est juste, ce qui écarte A et C.",
      ],
      // Variante angle différent — cas limites : zéro-coupon, perpétuité, FRN
      [
        "Which of the following securities most likely has the highest Macaulay duration?",
        [
          "A 20-year zero-coupon bond yielding 6%.",
          "A perpetual bond with annual coupons, yielding 6%.",
          "A 30-year floating-rate note with semiannual coupon resets, whose next reset is in 4 months.",
        ],
        0,
        "Zéro-coupon : un seul flux, Macaulay duration = maturité = 20 ans. Perpétuité : MacDur = (1 + y)/y = 1,06/0,06 = 17,67 ans seulement, car les flux très lointains pèsent peu une fois actualisés ; une maturité infinie ne donne PAS une duration infinie (piège de B). FRN : MacDur ≈ temps jusqu'au prochain reset, soit environ 0,33 an ; sa maturité de 30 ans ne compte pas, puisque le coupon s'ajuste aux taux du marché à chaque reset.",
      ],
      // Variante plus difficile — perpétuité : formule + effet d'une baisse du YTM + passage Macaulay → modified
      [
        "A perpetual bond pays a fixed annual coupon. Its yield to maturity falls from 5% to 4%. After the decline, its modified duration is closest to:",
        ["20.0.", "26.0.", "25.0."],
        2,
        "Perpétuité : MacDur = (1 + y)/y. À 4 % : 1,04/0,04 = 26 ans. ModDur = MacDur/(1 + y) = 26/1,04 = 25 (soit 1/y). Avant la baisse : MacDur = 1,05/0,05 = 21 et ModDur = 20. A garde la valeur initiale, comme si la duration ne dépendait pas du YTM : or YTM ↓ → duration ↑. B donne la Macaulay duration, sans la convertir en modified duration.",
      ],

      // Concept 5 — Duration et convexité approchées par bump (officielle, Reading 59)
      [
        "A bond with a yield to maturity of 8.0% is priced at 96.00. If its yield increases to 8.3% its price will decrease to 94.06. If its yield decreases to 7.7% its price will increase to 98.47. The modified duration of the bond is closest to:",
        ["4.34.", "7.66.", "2.75."],
        1,
        "ApproxModDur = [V(YTM − ΔY) − V(YTM + ΔY)]/(2 × ΔY × V0) = (98,47 − 94,06)/(2 × 0,003 × 96,00) = 4,41/0,576 = 7,66. Pièges : ΔY = 30 pb = 0,003 (en décimal) et V0 = 96,00 (le prix initial, pas 100). Contrôle d'ordre de grandeur : pour 0,3 % de variation du yield, le prix bouge d'environ (4,41/2)/96 = 2,3 %, soit une duration proche de 2,3/0,3 ≈ 7,7. A et C ne résultent d'aucune application correcte de la formule.",
      ],
      // Variante angle différent — calcul inversé : retrouver V− et V+ à partir de la duration et de la convexité
      [
        "A bond is priced at 100.00. Using a 100 bp yield shock (ΔY = 1%), its approximate modified duration is 5.00 and its approximate convexity is 30.0. The prices used in the calculation, V− (yield down 100 bp) and V+ (yield up 100 bp), were closest to:",
        ["V− = 105.00 / V+ = 95.00", "V− = 105.15 / V+ = 95.15", "V− = 104.85 / V+ = 94.85"],
        1,
        "La duration fixe l'ÉCART : V− − V+ = ApproxModDur × 2 × ΔY × V0 = 5 × 2 × 0,01 × 100 = 10,00. La convexité fixe la SOMME : V− + V+ = 2 × V0 + ApproxConvexity × ΔY² × V0 = 200 + 30 × 0,0001 × 100 = 200,30. D'où V− = 105,15 et V+ = 95,15 : le gain (+5,15) dépasse la perte (−4,85), c'est la convexité positive. A suppose une convexité nulle (somme = 200). C correspond à une somme de 199,70, soit une convexité de −30 : profil d'un callable, pas du bond décrit.",
      ],
      // Variante plus difficile — bump complet (duration ET convexité) puis estimation pour un choc plus large
      [
        "A bond has a full price of 100.00. Its full price would be 96.10 if its yield rose by 50 bp and 104.10 if its yield fell by 50 bp. Using approximate modified duration and approximate convexity computed from these prices, the estimated percentage price change for a 150 bp increase in yield is closest to:",
        ["−11.10%.", "−12.00%.", "−10.20%."],
        0,
        "ApproxModDur = (104,10 − 96,10)/(2 × 0,005 × 100) = 8,00. ApproxConvexity = (104,10 + 96,10 − 200)/(0,005² × 100) = 0,20/0,0025 = 80. %ΔP = −8 × 0,015 + ½ × 80 × 0,015² = −12,00 % + 0,90 % = −11,10 %. B ne retient que l'effet duration (premier ordre). C oublie le ½ devant le terme de convexité (+1,80 % au lieu de +0,90 %).",
      ],

      // Concept 6 — Ajustement de convexité et return impact (officielle, Reading 61)
      [
        "A 9-year corporate bond with a 3.25% coupon is priced at 103.96. This bond's duration and convexity are 7.8 and 69.8. If the bond's yield increases by 100 basis points, the impact on the bondholder's return is closest to:",
        ["+8.15%.", "−7.45%.", "−7.80%."],
        1,
        "Return impact ≈ −Duration × ΔYield + ½ × Convexity × (ΔYield)² = −7,8 × 0,01 + ½ × 69,8 × 0,01² = −0,0780 + 0,0035 = −7,45 %. Attention au signe : une HAUSSE du yield donne un impact négatif. C ne retient que l'effet duration (−7,80 %). A calcule comme si le yield baissait (+7,80 % + 0,35 %). Le prix (103,96) et le coupon sont des données inutiles pour ce calcul.",
      ],
      // Variante angle différent — le POURQUOI : effet de premier ordre vs correction de second ordre
      [
        "For an option-free bond, an analyst compares the actual price change with the estimate based on modified duration alone, for a 200 bp rise and for a 200 bp fall in yield. Which statement is most accurate?",
        [
          "Duration alone overestimates the price increase when yields fall and underestimates the price decrease when yields rise.",
          "The convexity adjustment is positive when yields fall and negative when yields rise, since it follows the direction of the yield change.",
          "Duration alone underestimates the price increase when yields fall and overestimates the price decrease when yields rise, so the convexity adjustment is positive in both cases.",
        ],
        2,
        "La duration est un effet de premier ordre : une droite tangente à la courbe prix/yield. Comme cette courbe est convexe (au-dessus de sa tangente), le vrai prix est toujours SUPÉRIEUR à l'estimation linéaire : la hausse est sous-estimée quand les taux baissent, la baisse est surestimée quand ils montent. La correction de second ordre, ½ × convexité × ΔYTM², est donc positive dans les deux cas. A inverse les deux erreurs. B oublie que ΔYTM est élevé au carré : le terme de convexité ne change pas de signe avec le sens de la variation.",
      ],
      // Variante plus difficile — money duration / money convexity, avec conversion Macaulay → modified en semestriel
      [
        "A bond position has a full value of 5,000,000. The bond's annualized Macaulay duration is 6.324, its yield to maturity is 4.00% (stated on a semiannual bond basis), and its annual convexity is 55. Using money duration and money convexity, the estimated value of the position after an 80 bp decrease in yield is closest to:",
        ["5,239,200.", "5,256,800.", "5,261,760."],
        1,
        "1) ModDur = 6,324/(1 + 0,04/2) = 6,20. 2) MoneyDur = 6,20 × 5 000 000 = 31 000 000 ; MoneyCon = 55 × 5 000 000 = 275 000 000. 3) ΔPV = −MoneyDur × ΔYTM + ½ × MoneyCon × ΔYTM² = −31 000 000 × (−0,008) + ½ × 275 000 000 × 0,000064 = 248 000 + 8 800 = 256 800. Nouvelle valeur = 5 256 800. A retranche le terme de convexité (248 000 − 8 800) : il est toujours positif. C utilise directement la Macaulay duration (6,324 × 5 000 000 × 0,008 = 252 960, + 8 800).",
      ],

      // Concept 7 — Duration de portefeuille : moyenne pondérée vs cash-flow yield (officielle, Reading 60)
      [
        "Which of the following is least likely an advantage of estimating the duration of a bond portfolio as a weighted average of the durations of the bonds in the portfolio?",
        [
          "It is easier to calculate than the alternative.",
          "It is theoretically more sound than the alternative.",
          "It can be used when the portfolio contains bonds with embedded options.",
        ],
        1,
        "La méthode de la moyenne pondérée (par la valeur de marché) est la plus utilisée car elle est simple (A) et s'applique aux bonds à options intégrées, dont on peut moyenner les effective durations (C). En revanche, c'est la méthode du cash-flow yield (reconstruire les flux agrégés du portefeuille et en tirer un yield et une duration) qui est théoriquement plus rigoureuse : B n'est donc PAS un avantage de la moyenne pondérée. Sa limite : elle suppose un déplacement parallèle de tous les yields du portefeuille.",
      ],
      // Variante angle différent — appliquer la méthode : pondérer par la valeur de marché, pas par le nominal
      [
        "A portfolio holds two bonds: Bond X, par value 4,000,000, priced at 80.00 per 100, modified duration 9.0; and Bond Y, par value 2,000,000, priced at 110.00 per 100, modified duration 3.0. Using the weighted-average method, the portfolio's modified duration is closest to:",
        ["6.56.", "7.00.", "6.00."],
        0,
        "Les poids sont des VALEURS DE MARCHÉ : X = 4 000 000 × 80 % = 3 200 000 ; Y = 2 000 000 × 110 % = 2 200 000 ; total = 5 400 000. Duration = (3,2/5,4) × 9,0 + (2,2/5,4) × 3,0 = 5,333 + 1,222 = 6,56. B pondère par le nominal (4/6 × 9 + 2/6 × 3 = 7,00) : cela surpondère X, qui cote sous le pair. C fait une moyenne simple (9 + 3)/2, sans pondération.",
      ],
      // Variante plus difficile — portefeuille barbell : choc parallèle vs pentification (limite de la moyenne pondérée)
      [
        "A portfolio holds a 2-year bond (market value 6,000,000; modified duration 1.9) and a 20-year bond (market value 4,000,000; modified duration 14.5). Using portfolio duration, the estimated change in portfolio value for a 50 bp parallel rise in yields is X. If instead only the 20-year yield rises by 50 bp while the 2-year yield is unchanged, the approximate change in value is Y. X and Y are closest to:",
        ["X = −347,000 / Y = −347,000", "X = −290,000 / Y = −347,000", "X = −347,000 / Y = −290,000"],
        2,
        "Duration du portefeuille = 0,6 × 1,9 + 0,4 × 14,5 = 1,14 + 5,80 = 6,94. Choc parallèle : X = −6,94 × 0,005 × 10 000 000 = −347 000. Pentification (seul le 20 ans monte) : il faut raisonner position par position, Y = −14,5 × 0,005 × 4 000 000 = −290 000 (le 2 ans ne bouge pas). A applique la duration de portefeuille à un choc non parallèle : c'est précisément la limite de la moyenne pondérée, qui suppose que tous les yields bougent du même montant. B inverse les deux résultats.",
      ],

      // Concept 8 — Effective duration et key rate duration (officielle, Reading 61)
      [
        "Effective duration is more appropriate than modified duration as a measure of a bond's price sensitivity to yield changes when:",
        ["the bond contains embedded options.", "the bond has a low coupon rate and a long maturity.", "yield curve changes are not parallel."],
        0,
        "La modified duration suppose des flux FIXES. Un bond à option intégrée (callable, putable, MBS) a des flux qui changent avec les taux : seule l'effective duration, calculée en choquant la courbe benchmark dans un modèle de valorisation, en tient compte. B décrit un bond simplement plus sensible aux taux, mais à flux fixes : la modified duration reste adaptée. C relève de la key rate duration : effective et modified duration supposent toutes deux un déplacement parallèle de la courbe.",
      ],
      // Variante angle différent — le COMMENT : la procédure de calcul de l'effective duration vs modified et key rate
      [
        "An analyst wants to compute the effective duration of a callable bond. Which procedure is most appropriate?",
        [
          "Shift the bond's own yield to maturity up and down by the same amount and reprice its scheduled cash flows, which are assumed fixed.",
          "Shift the benchmark yield curve up and down in parallel within a valuation model, holding the bond's option-adjusted spread constant, so that expected call exercise can change the cash flows in each scenario.",
          "Shift only the benchmark rate at the bond's maturity, holding all other points on the curve constant, and measure the resulting price change.",
        ],
        1,
        "L'effective duration reprend la formule du bump, mais le choc porte sur la courbe benchmark (parallèle, OAS constant) dans un modèle qui recalcule les flux : si les taux baissent, le modèle intègre la probabilité accrue de call. A décrit la modified duration approchée : choquer le YTM propre du bond avec des flux figés ignore le call, ce qui surestime la sensibilité quand le call devient probable. C décrit une key rate duration : la sensibilité à UN seul point de la courbe, pas à un déplacement parallèle.",
      ],
      // Variante plus difficile — key rate durations face à une torsion de courbe (piège : duration × choc moyen)
      [
        "A bond portfolio has an effective duration of 6.0 and the following key rate durations: 2-year 0.8, 5-year 1.7, 10-year 2.5, and 30-year 1.0. The benchmark curve then changes as follows: 2-year −20 bp, 5-year −5 bp, 10-year +10 bp, 30-year +25 bp. The approximate percentage change in the portfolio's value is closest to:",
        ["+0.26%.", "−0.15%.", "−0.26%."],
        2,
        "Avec des key rate durations, chaque point de la courbe agit séparément : %ΔV ≈ −Σ KRDk × Δyk = −[0,8 × (−0,0020) + 1,7 × (−0,0005) + 2,5 × 0,0010 + 1,0 × 0,0025] = −[−0,0016 − 0,00085 + 0,0025 + 0,0025] = −0,255 % ≈ −0,26 %. La somme des KRD (0,8 + 1,7 + 2,5 + 1,0 = 6,0) redonne l'effective duration, qui ne vaut que pour un choc parallèle. B applique l'effective duration au choc moyen (+2,5 pb) : −6,0 × 0,00025 = −0,15 %, ce qui ignore que la hausse touche surtout les maturités à forte KRD. A se trompe de signe : les taux montent là où la sensibilité est la plus forte, donc la valeur baisse.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Fixed Income Page 4...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
