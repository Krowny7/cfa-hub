// Seed script — quiz de "drill" associé à la page 3 de la fiche PDF Fixed
// Income (Yields, Spreads & Term Structure). Le contenu d'origine de ce drill
// venait de l'utilisateur ; il a été remis au cadre FSA / Equity à sa demande
// le 3 octobre 2026. Structure : pour chacun des 5 concepts clés de la page,
// 1 question officielle (banque de pratique CFA, Readings 55, 56 et 57,
// corrigé vérifié contre les PDF "- Answers.pdf" correspondants) + 1 variante
// "angle différent" (même notion, mais jamais un simple changement de
// chiffres menant au même raisonnement) + 1 variante "plus difficile"
// (raisonnement à plusieurs étapes / pièges combinés). Voir memory
// regle-drill-variantes-cfa-hub. Questions en anglais, explications en
// français. Les QCM imprimés dans le PDF (page 6) ne sont pas repris.
// Les questions officielles sont recopiées à l'identique : syncQuizSets
// retrouve l'historique de réponses en comparant le texte exact de l'énoncé.
// Ramené à 5 concepts (15 questions) le 5 octobre 2026, à la demande de
// l'utilisateur : concept d'origine 6 retiré de la fiche, ses
// questions rangées dans « Réserve — <titre> » (syncQuizSets, rien d'effacé).
// Usage: node scripts/seed-fixed-income-drill-page3.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Fixed Income (Système)";

const QUIZ_SETS = [
  {
    title: "Fixed Income — Drill Fiche Page 3 (Yields, Spreads & Term Structure)",
    difficulty: 2,
    questions: [
      // Concept 1 — G-spread / I-spread : spread = YTM du bond − YTM du benchmark de même maturité (officielle, Reading 55)
      [
        "A Treasury bond due in one-year has a yield of 8.5%. A Treasury bond due in 5 years has a yield of 9.3%. A bond issued by Galaxy Motors due in 5 years has a yield of 9.9%. A bond issued by Exe due in one year has a yield of 9.4%. The yield spreads on the bonds issued by Exe and Galaxy Motors are:",
        ["Exe: 0.1% / Galaxy Motors: 0.6%", "Exe: 0.1% / Galaxy Motors: 1.4%", "Exe: 0.9% / Galaxy Motors: 0.6%"],
        2,
        "Un yield spread (ici un G-spread) se mesure contre le titre d'État de MÊME maturité : Exe (1 an) = 9,4 − 8,5 = 0,9 % ; Galaxy Motors (5 ans) = 9,9 − 9,3 = 0,6 %. A compare Exe au Treasury 5 ans (9,4 − 9,3 = 0,1 %) : mauvaise maturité. B reprend cette erreur pour Exe et compare en plus Galaxy au Treasury 1 an (9,9 − 8,5 = 1,4 %) : les deux benchmarks sont inversés.",
      ],
      // Variante angle différent — le POURQUOI : ce que reflète le benchmark vs ce que reflète le spread
      [
        "An increase in expected inflation, with no change in an issuer's credit quality or in the liquidity of its bonds, would most likely affect the yield on the issuer's 10-year fixed-rate bond mainly through:",
        [
          "a wider G-spread, because investors demand extra compensation for inflation risk on corporate debt.",
          "a higher benchmark (government) yield, with the yield spread over the benchmark largely unchanged.",
          "a narrower yield spread, because inflation reduces the real value of the issuer's debt and therefore its credit risk.",
        ],
        1,
        "Le rendement d'un bond = benchmark rate + yield spread. Le benchmark (taux d'État de même maturité) porte les facteurs macroéconomiques communs à tous les émetteurs : taux réel, inflation anticipée, politique monétaire. Le spread porte les facteurs propres à l'émetteur et au titre : risque de crédit et liquidité. Une hausse de l'inflation anticipée passe donc par le benchmark, le spread restant à peu près inchangé si crédit et liquidité ne bougent pas. A attribue à tort l'inflation au spread : le Treasury de même maturité la subit aussi, elle se neutralise dans la différence. C invente un lien inflation → qualité de crédit, alors que l'énoncé précise que le crédit est inchangé.",
      ],
      // Variante plus difficile — maturité non standard : interpolation des deux benchmarks + distinction G / I
      [
        "A 7-year corporate bond yields 5.60%. Government bond yields are 4.10% at 5 years and 4.70% at 10 years; swap rates are 4.40% at 5 years and 4.90% at 10 years. Using linear interpolation, the bond's G-spread and I-spread are closest to:",
        ["G-spread: 126 bp / I-spread: 100 bp", "G-spread: 150 bp / I-spread: 120 bp", "G-spread: 100 bp / I-spread: 126 bp"],
        0,
        "Aucun benchmark n'a exactement 7 ans : on interpole à 2/5 du chemin entre 5 et 10 ans. Taux d'État 7 ans = 4,10 + 0,4 × (4,70 − 4,10) = 4,34 % → G-spread = 5,60 − 4,34 = 1,26 % = 126 pb. Taux swap 7 ans = 4,40 + 0,4 × (4,90 − 4,40) = 4,60 % → I-spread = 5,60 − 4,60 = 1,00 % = 100 pb. B prend les benchmarks 5 ans sans interpoler (5,60 − 4,10 et 5,60 − 4,40) : sur une courbe montante, cela surestime les deux spreads. C inverse les définitions : le G-spread se mesure contre la courbe d'État (Government), l'I-spread contre la courbe swap (Interpolated spread).",
      ],

      // Concept 2 — Z-spread vs G-spread vs OAS (officielle, Reading 55)
      [
        "The bonds of Grinder Corp. trade at a G-spread of 150 basis points above comparable maturity U.S. Treasury securities. The option adjusted spread (OAS) on the Grinder bonds is 75 basis points. Using this information, and assuming that the Treasury yield curve is flat:",
        ["the zero-volatility spread is 75 basis points.", "the zero-volatility spread is 225 basis points.", "the option cost is 75 basis points."],
        2,
        "Sur une courbe plate, tous les taux spot sont égaux au YTM du Treasury : ajouter un spread constant à chaque taux spot (Z-spread) ou au seul YTM (G-spread) revient au même, donc Z-spread = G-spread = 150 pb. Le coût de l'option = Z-spread − OAS = 150 − 75 = 75 pb. A confond le Z-spread avec l'OAS (l'OAS retire justement l'effet de l'option). B additionne G-spread et OAS au lieu de soustraire.",
      ],
      // Variante angle différent — calcul inversé : le Z-spread est donné, on reconstitue le prix
      [
        "Government spot rates are 2.0% (1 year), 3.0% (2 years), and 4.0% (3 years). A 3-year, 6% annual-pay corporate bond has a Z-spread of 150 basis points. Its price per 100 of par is closest to:",
        ["101.56.", "101.35.", "105.77."],
        0,
        "Le Z-spread s'ajoute à CHAQUE taux spot, et chaque flux est actualisé à son propre taux : 6/1,035 + 6/1,045² + 106/1,055³ = 5,7971 + 5,4944 + 90,2710 = 101,56. B actualise tous les flux à 5,5 % (taux spot 3 ans + spread) : on traite la courbe comme plate, ce qui pénalise à tort les deux premiers coupons, qui devraient être actualisés à des taux plus bas (101,35). C oublie le spread : 105,77 est la valeur d'un titre d'État aux mêmes flux, pas celle d'un bond corporate qui porte un risque de crédit et de liquidité.",
      ],
      // Variante plus difficile — trois spreads à articuler : coût de l'option, forme de la courbe, ce que rémunère l'OAS
      [
        "A callable corporate bond has a G-spread of 180 bp, a Z-spread of 195 bp, and an option-adjusted spread (OAS) of 140 bp. Which statement is most accurate?",
        [
          "The option cost is 40 bp, and the bond's compensation for credit and liquidity risk is 195 bp.",
          "The option cost is 55 bp; the gap between the Z-spread and the G-spread indicates that the benchmark yield curve is not flat.",
          "The option cost is 55 bp, and the bond's compensation for credit and liquidity risk is 195 bp.",
        ],
        1,
        "Coût de l'option = Z-spread − OAS = 195 − 140 = 55 pb (le G-spread n'entre pas dans ce calcul). Le Z-spread n'est égal au G-spread que si la courbe benchmark est plate (cas Grinder) ; ici 195 ≠ 180, donc la courbe n'est pas plate. A calcule le coût de l'option contre le G-spread (180 − 140 = 40) et prend le Z-spread comme rémunération du crédit. C a le bon coût d'option mais se trompe sur la rémunération : le Z-spread d'un callable inclut la compensation pour l'option vendue à l'émetteur ; c'est l'OAS (140 pb), spread hors effet de l'option, qui rémunère le crédit et la liquidité.",
      ],

      // Concept 3 — FRN : quoted margin (coupon) vs discount margin (actualisation) (officielle, Reading 56)
      [
        "A company issues a $1 million annual coupon floating-rate note (FRN) with a quoted annual market reference rate (MRR) of 3.5% plus a quoted margin (QM) of 80 basis points. With three years remaining until maturity, the MRR is quoted at the same 3.5% with a discount margin equal to 50 basis points. The estimated value of the FRN is closest to:",
        ["$1,008,910.", "$1,008,325.", "$1,007,740."],
        1,
        "Le coupon se calcule avec le quoted margin : 3,5 % + 0,80 % = 4,3 %, soit 43 000 $ par an. L'actualisation se fait avec le discount margin exigé aujourd'hui : 3,5 % + 0,50 % = 4,0 %. Calculatrice : N = 3, I/Y = 4,0, PMT = 43 000, FV = 1 000 000 → PV = 1 008 325 $. Le FRN cote au-dessus du pair car QM (80 pb) > DM (50 pb). A revient à actualiser l'écart de marge (30 pb par an, soit 3 000 $) au seul DM de 0,5 % au lieu de MRR + DM ; C est une valeur voisine qui ne correspond à aucune combinaison correcte coupon / taux d'actualisation.",
      ],
      // Variante angle différent — calcul inversé : du prix observé au discount margin (méthode calculette de la fiche)
      [
        "A floating-rate note with exactly 2 years to maturity pays quarterly coupons at the market reference rate (MRR) plus a quoted margin of 60 basis points. The MRR is currently 3.00% (annualized), and the note is priced at 99.20 per 100 of par. Assuming the MRR stays at 3.00%, the note's discount margin is closest to:",
        ["60 bp.", "402 bp.", "102 bp."],
        2,
        "Méthode de la fiche : N = 4 × 2 = 8 ; PV = −99,20 ; PMT = (3,00 % + 0,60 %) × 100 / 4 = 0,90 ; FV = 100 → CPT I/Y = 1,0046 % par trimestre. Taux annualisé = 1,0046 × 4 = 4,018 % ; DM = 4,018 % − 3,00 % = 1,018 % ≈ 102 pb. Cohérence : le prix est sous le pair, donc DM > QM. A reprend le quoted margin : il ne serait exact que si le titre cotait au pair. B oublie la dernière étape (retirer le MRR) et donne le rendement total annualisé, pas la marge.",
      ],
      // Variante plus difficile — upgrade de crédit + donnée-piège (hausse du MRR) + valorisation
      [
        "A floating-rate note was issued at par two years ago with annual coupons at MRR + 120 bp. Since issuance, the market reference rate (MRR) has risen from 1.50% to 2.50%, and the issuer has been upgraded, so that the market now requires a discount margin of 80 bp. The note has 3 years left to maturity. Assuming the MRR stays at 2.50%, which statement is most accurate?",
        [
          "The note is worth about 101.12 per 100 of par: it trades at a premium because its quoted margin exceeds the discount margin, a consequence of the upgrade, not of the higher MRR.",
          "The note is worth about 98.88 per 100 of par: it trades at a discount because the higher MRR has raised the rate at which its cash flows are discounted.",
          "The note is worth 100.00 per 100 of par: its coupon resets to the new MRR, so it must trade at par.",
        ],
        0,
        "Coupon = MRR + QM = 2,50 + 1,20 = 3,70 ; taux d'actualisation = MRR + DM = 2,50 + 0,80 = 3,30 %. N = 3, I/Y = 3,30, PMT = 3,70, FV = 100 → PV = 101,12 : prime, car QM (120 pb) > DM (80 pb). La hausse du MRR est une donnée-piège : elle relève à la fois le coupon et le taux d'actualisation, sans changer l'écart QM − DM ; seul le changement de qualité de crédit déplace le DM par rapport au QM. B inverse les deux marges (coupon à 3,30 actualisé à 3,70 → 98,88) et attribue l'effet au MRR. C oublie que le quoted margin est figé à l'émission : le reset ne ramène au pair que si DM = QM.",
      ],

      // Concept 4 — Spot rates : chaque flux actualisé au taux spot de SA maturité (officielle, Reading 57)
      [
        "A three-year annual coupon bond has a par value of $1,000 and a coupon rate of 5.5%. The spot rate for year 1 is 5.2%, the spot rate for year two is 5.5%, and the spot rate for year three is 5.7%. The value of the coupon bond is closest to:",
        ["$1,000.00.", "$937.66.", "$995.06."],
        2,
        "Chaque flux est actualisé au taux spot de sa propre maturité : 55/1,052 + 55/1,055² + 1 055/1,057³ = 52,28 + 49,42 + 893,36 = 995,06 $. A suppose que le bond vaut le pair parce que son coupon (5,5 %) égale le taux spot 2 ans : c'est faux, le dernier flux (de loin le plus gros) est actualisé à 5,7 % > 5,5 %, d'où un prix sous le pair. B est beaucoup trop bas : il ne résulte d'aucune actualisation correcte des trois flux aux taux spot donnés.",
      ],
      // Variante angle différent — calcul inversé (bootstrapping) : du prix d'un bond à coupon au taux spot
      [
        "The 1-year government spot rate is 3.00%. A 2-year, 5% annual-pay government bond trades at 101.00 per 100 of par. The 2-year spot rate implied by this bond (bootstrapping) is closest to:",
        ["4.47%.", "4.50%.", "5.00%."],
        1,
        "Bootstrapping : 101,00 = 5/1,03 + 105/(1 + z2)². Le premier flux vaut 4,8544, donc 105/(1 + z2)² = 96,1456 → (1 + z2)² = 1,09210 → z2 = 4,50 %. A est le YTM du bond (4,47 %) : un taux unique qui mélange z1 (3 %) et z2 ; sur une courbe montante, il est inférieur au taux spot de la maturité finale. C prend le taux de coupon, qui n'est égal au rendement que pour un bond au pair (ici le bond cote 101).",
      ],
      // Variante plus difficile — valeur sans arbitrage vs prix de marché : sens de l'arbitrage et piège sur le YTM
      [
        "Government spot rates are 2% (1 year), 3% (2 years), and 4% (3 years). A 3-year, 5% annual-pay government bond trades at 102.00 per 100 of par. Which statement is most accurate?",
        [
          "The bond is overvalued by about 0.96; an arbitrageur would short the bond and buy its cash flows as zero-coupon strips.",
          "There is no arbitrage: on an upward-sloping spot curve, a coupon bond's yield to maturity is normally higher than the spot rate for its maturity.",
          "The bond is undervalued by about 0.96; an arbitrageur would buy the bond and sell its cash flows separately as zero-coupon strips.",
        ],
        2,
        "Valeur sans arbitrage = 5/1,02 + 5/1,03² + 105/1,04³ = 4,9020 + 4,7130 + 93,3446 = 102,96 > 102,00 : le bond est SOUS-évalué d'environ 0,96. On l'achète 102,00, on le démembre (stripping) et on revend chaque flux comme un zéro-coupon au prix dicté par la courbe spot, soit 102,96 au total. A se trompe de sens : vendre à découvert un titre sous-évalué fait perdre de l'argent. B inverse la règle : sur une courbe spot montante, le YTM d'un bond à coupon est INFÉRIEUR au taux spot de sa maturité (ses coupons sont actualisés à des taux plus bas). Ici, à 102,00, le YTM vaut environ 4,28 % > 4 %, ce qui signale justement la sous-évaluation (au prix juste de 102,96, il serait d'environ 3,93 %).",
      ],

      // Concept 5 — Forward rates : notation AyBy et taux forward implicite (officielle, Reading 57)
      [
        "An investor wants to take advantage of the 5-year spot rate, currently at a level of 4.0%. Unfortunately, the investor just invested all of his funds in a 2-year bond with a yield of 3.2%. The investor contacts his broker, who tells him that in two years he can purchase a 3-year bond and end up with the same return currently offered on the 5-year bond. What 3-year forward rate beginning two years from now will allow the investor to earn a return equivalent to the 5-year spot rate?",
        ["4.5%.", "5.6%.", "3.5%."],
        0,
        "Il s'agit du forward 2y3y (démarre dans A = 2 ans, dure B = 3 ans, finit en 5) : (1,04)⁵ = (1,032)² × (1 + 2y3y)³ → 2y3y = (1,21665/1,06502)^(1/3) − 1 = (1,14237)^(1/3) − 1 ≈ 4,5 %. C (3,5 %) est impossible : les deux premières années ne rapportent que 3,2 % < 4 %, il faut donc un forward SUPÉRIEUR à 4 % pour rattraper le taux spot 5 ans. B est trop élevé : il surcompense le retard pris pendant les deux premières années.",
      ],
      // Variante angle différent — le POURQUOI : le forward comme taux d'équilibre (breakeven) entre deux stratégies
      [
        "The 1-year spot rate is 3.0% and the 2-year spot rate is 4.0%. An investor with a 2-year horizon expects the 1-year rate one year from now to be 4.5%. Based on her expectation, which strategy offers the higher expected 2-year return?",
        [
          "Buying the 2-year bond, because her expected 1-year rate in one year (4.5%) is below the implied forward rate 1y1y (about 5.0%).",
          "Rolling over two 1-year bonds, because her expected future 1-year rate (4.5%) is above the current 2-year spot rate (4.0%).",
          "Neither: both strategies must earn 4.0% per year, since forward rates always equal future spot rates.",
        ],
        0,
        "Le forward implicite 1y1y = 1,04²/1,03 − 1 = 1,0816/1,03 − 1 = 5,01 % est le taux d'équilibre (breakeven) qui rend les deux stratégies équivalentes. Si l'investisseuse anticipe un taux 1 an futur de 4,5 % < 5,01 %, le roulement rapporte 1,03 × 1,045 = 1,07635 contre 1,0816 pour le 2 ans : elle préfère le 2 ans. B compare l'anticipation au mauvais repère (le taux spot 2 ans au lieu du forward). C confond forward et prévision : le forward n'est qu'un taux implicite d'équilibre, et la décision dépend de l'écart entre ses propres anticipations et ce taux.",
      ],
      // Variante plus difficile — notation longue (2y5y) avec donnée-piège (taux 5 ans) et piège d'inversion A/B
      [
        "Government spot rates (annual compounding) are: 2-year 3.00%, 5-year 3.80%, and 7-year 4.20%. The 2y5y forward rate is closest to:",
        ["4.34%.", "4.68%.", "5.21%."],
        1,
        "2y5y = taux qui démarre dans 2 ans et dure 5 ans, donc finit en 2 + 5 = 7 ans : il faut z2 et z7 (le taux spot 5 ans est une donnée-piège). 2y5y = [(1,042)⁷/(1,03)²]^(1/5) − 1 = (1,33375/1,06090)^(1/5) − 1 = (1,25719)^(0,2) − 1 = 4,68 % (l'approximation (7 × 4,20 − 2 × 3,00)/5 = 4,68 % le confirme). A utilise z5 comme si la période finissait en année 5 : c'est le 2y3y (4,34 %). C calcule le 5y2y, [(1,042)⁷/(1,038)⁵]^(1/2) − 1 = 5,21 % : A et B ont été inversés.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Fixed Income Page 3...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
