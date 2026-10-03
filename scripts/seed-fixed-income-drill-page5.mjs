// Seed script — quiz de "drill" associé à la page 5 de la fiche PDF Fixed
// Income (Credit Risk Measures & Sovereign Credit). Le contenu d'origine de
// ce drill avait été fourni par l'utilisateur ; il a été remis au cadre
// FSA / Equity à sa demande le 3 octobre 2026. Structure : 6 concepts ×
// (1 question officielle + 1 variante "angle différent" + 1 variante "plus
// difficile"). Voir memory regle-drill-variantes-cfa-hub. Questions en
// anglais, explications en français. Questions officielles recopiées à
// l'identique (historique de réponses conservé par syncQuizSets), corrigés
// vérifiés contre les PDF "- Answers.pdf" (Readings 59, 61, 62, 63 et 64 de
// la banque practice exams).
// Usage: node scripts/seed-fixed-income-drill-page5.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Fixed Income (Système)";

const QUIZ_SETS = [
  {
    title: "Fixed Income — Drill Fiche Page 5 (Credit Risk Measures & Sovereign Credit)",
    difficulty: 2,
    questions: [
      // Concept 1 — Expected loss = POD × LGD, rôle du collatéral (officielle, Reading 64)
      [
        "Davis Corp. recently issued secured high-yield bonds. With respect to increases in the probability of default (POD) and loss given default (LGD), bondholders of this bond would most likely be concerned with:",
        ["Both POD and LGD.", "POD but not LGD.", "LGD but not POD."],
        0,
        "La perte attendue se décompose en EL = POD × LGD. Les investisseurs en obligations investment grade non sécurisées s'inquiètent surtout d'une hausse de la POD : le défaut est peu probable, c'est lui qui fait bouger le prix. Pour des obligations high-yield sécurisées, le défaut est un scénario sérieux : ce que l'on récupérera alors (la valeur du collatéral, donc la LGD) devient aussi déterminant. Les deux composantes comptent. La réponse B oublie que la perte d'une dette sécurisée dépend de la valeur du collatéral, qui peut se dégrader. La réponse C oublie qu'une hausse de la POD augmente directement la perte attendue, même si le collatéral limite la LGD.",
      ],
      // Variante angle différent — inverser la formule : retrouver le recovery rate à partir de l'EL et de la POD
      [
        "An analyst estimates that a bond's one-year expected loss is 1.8% of its exposure and that its one-year probability of default is 4%. The recovery rate implied by these estimates is closest to:",
        ["98.2%.", "45%.", "55%."],
        2,
        "On inverse EL = POD × LGD : LGD = EL / POD = 1,8 % / 4 % = 45 %, donc RR = 1 − LGD = 55 %. Contrôle : 4 % × (1 − 55 %) = 4 % × 45 % = 1,8 %. 45 % est la loss severity (LGD), pas le taux de recouvrement : c'est la confusion classique entre ce que l'on perd et ce que l'on récupère en cas de défaut. 98,2 % (= 1 − 1,8 %) traite la perte attendue comme si c'était la perte en cas de défaut, en oubliant que l'EL intègre déjà la probabilité de défaut.",
      ],
      // Variante plus difficile — EL en montant avec collatéral (EE − collatéral), RR vs LGD, spread comme donnée-piège
      [
        "An investor holds $10 million par of a secured corporate bond. If the issuer defaults, the collateral is expected to cover $4 million of the claim, and the uncovered portion is expected to recover 30%. The bond's one-year probability of default is 5% and its credit spread is 250 bp. The bond's one-year expected loss is closest to:",
        ["$350,000.", "$90,000.", "$210,000."],
        2,
        "EL = POD × (EE − collatéral) × (1 − RR) = 5 % × (10 M$ − 4 M$) × (1 − 30 %) = 5 % × 6 M$ × 70 % = 210 000 $. 350 000 $ ignore le collatéral (5 % × 10 M$ × 70 %) : or c'est précisément cette secondary source of repayment qui rend la perte d'une dette sécurisée plus faible. 90 000 $ applique le taux de recouvrement (30 %) au lieu de la LGD (70 %) : 5 % × 6 M$ × 30 %. Le spread de 250 bp est une donnée-piège : il ne sert pas à calculer l'EL, mais permet ensuite de juger la rémunération — 2,5 % × 10 M$ = 250 000 $ de spread annuel, soit environ 40 000 $ (0,4 %) de spread au-delà de la perte attendue.",
      ],

      // Concept 2 — Spread de crédit et perte attendue : spread over expected loss, limites des ratings (officielle, Reading 62)
      [
        "The yield spreads between corporate bonds and government bonds are most likely to decrease if:",
        [
          "investors increase their estimates of the recovery rate on the corporate bonds.",
          "a credit rating downgrade on the corporate bonds becomes more likely.",
          "liquidity decreases in the market for the corporate bonds.",
        ],
        0,
        "Le spread rémunère la perte attendue (POD × LGD) et la liquidité. Si les investisseurs relèvent leur estimation du taux de recouvrement, la LGD baisse, donc la perte attendue aussi : ils exigent moins de spread, qui se resserre. La réponse B signale au contraire une détérioration de la qualité de crédit (downgrade plus probable), donc un spread qui s'élargit. La réponse C ajoute une prime de liquidité plus élevée : le spread s'élargit aussi.",
      ],
      // Variante angle différent — comparer trois bonds par le spread restant après la perte attendue
      [
        "An analyst compares three one-year corporate bonds. Bond X has a spread of 280 bp, a probability of default of 3.0%, and an expected recovery rate of 40%. Bond Y has a spread of 150 bp, a probability of default of 1.0%, and a recovery rate of 30%. Bond Z has a spread of 400 bp, a probability of default of 6.0%, and a recovery rate of 30%. Based on the spread over expected loss, which bond offers the best compensation for credit risk?",
        ["Bond Z.", "Bond X.", "Bond Y."],
        1,
        "Spread over expected loss = spread − EL, avec EL = POD × (1 − RR). Bond X : EL = 3 % × 60 % = 1,80 % = 180 bp, il reste 280 − 180 = 100 bp. Bond Y : EL = 1 % × 70 % = 70 bp, il reste 150 − 70 = 80 bp. Bond Z : EL = 6 % × 70 % = 420 bp, il reste 400 − 420 = −20 bp : son spread ne couvre même pas la perte attendue. C'est donc Bond X qui rémunère le mieux le risque. Bond Z attire par le spread brut le plus élevé ; on le choisit aussi si l'on multiplie la POD par le taux de recouvrement au lieu de la LGD (6 % × 30 % = 180 bp, soit 220 bp « restants »). Bond Y a la perte attendue la plus faible, mais un risque faible n'est pas une meilleure rémunération : ce qui compte, c'est ce qui reste du spread une fois la perte attendue payée.",
      ],
      // Variante plus difficile — même rating, pertes attendues différentes : spread over EL + limites des credit ratings
      [
        "Bonds P and Q are both rated BBB by the same agency. Bond P trades at a spread of 210 bp; the analyst estimates its probability of default at 1.5% and its recovery rate at 40%. Bond Q trades at a spread of 190 bp; after news of a pending debt-financed acquisition by Q's issuer, which the agency has not yet reflected in its rating, the analyst estimates Q's probability of default at 2.5% and its recovery rate at 40%. Which statement is most accurate?",
        [
          "Both bonds have the same expected loss because they share a BBB rating, so Bond P is preferable only because of its 20 bp higher spread.",
          "Bond Q is preferable, because the analyst should rely on the agency's unchanged rating rather than on her own estimate of the probability of default.",
          "Bond P offers a spread over expected loss of about 120 bp versus about 40 bp for Bond Q; the identical ratings illustrate that ratings can lag or fail to anticipate events such as a debt-financed acquisition.",
        ],
        2,
        "Étape 1 : EL de P = 1,5 % × (1 − 40 %) = 0,90 % = 90 bp, spread over EL = 210 − 90 = 120 bp. Étape 2 : EL de Q = 2,5 % × 60 % = 1,50 % = 150 bp, spread over EL = 190 − 150 = 40 bp. Étape 3 : P rémunère bien mieux le risque, alors que les deux bonds ont la même note. C'est une limite classique des credit ratings : ils sont stables, réagissent avec retard au marché, peuvent contenir des erreurs et anticipent mal les événements imprévus (acquisition financée par dette, litige, catastrophe). La réponse A arrive au bon choix pour une mauvaise raison : un même rating n'implique pas la même perte attendue, et l'écart réel de rémunération est de 80 bp, pas de 20 bp. La réponse B fait exactement l'erreur que la fiche signale : se fier à une note qui n'intègre pas encore l'événement.",
      ],

      // Concept 3 — Key rate duration (officielle, Reading 61)
      [
        "Sensitivity of a bond's price to a change in yield at a specific maturity is least appropriately estimated by using:",
        ["effective duration.", "key rate duration.", "partial duration."],
        0,
        "L'effective duration mesure la sensibilité du prix à un déplacement parallèle de toute la courbe de référence : elle ne peut pas isoler un seul point de la courbe, c'est donc la mesure la MOINS appropriée ici. La key rate duration — aussi appelée partial duration, les réponses B et C désignent donc le même outil — mesure précisément la sensibilité du prix à la variation du taux d'une seule maturité (par exemple le 5 ans), les autres taux restant fixes.",
      ],
      // Variante angle différent — appliquer les key rate durations à un choc sur un seul point de la courbe
      [
        "A bond portfolio has key rate durations of 0.4 at the 2-year maturity, 1.6 at the 5-year maturity, and 3.0 at the 10-year maturity, and no exposure elsewhere on the curve. If the 10-year benchmark yield rises by 20 bp while all other yields are unchanged, the portfolio's value will change by approximately:",
        ["−1.00%.", "−0.60%.", "+0.60%."],
        1,
        "Seul le point 10 ans bouge : ΔV/V ≈ −KRD(10 ans) × Δy = −3,0 × 0,0020 = −0,60 %. La réponse −1,00 % utilise la somme des key rate durations (0,4 + 1,6 + 3,0 = 5,0, qui est l'effective duration du portefeuille) comme si toute la courbe montait de 20 bp : c'est le scénario de déplacement parallèle, pas celui décrit. La réponse +0,60 % se trompe de signe : une hausse de taux fait baisser la valeur.",
      ],
      // Variante plus difficile — même effective duration, profils de key rate différents, pentification de la courbe
      [
        "Portfolios A and B both have an effective duration of 6.0. Their key rate durations at the 2-, 5-, 10-, and 30-year maturities are 0.5, 4.5, 0.8, and 0.2 for Portfolio A, and 2.0, 0.5, 1.0, and 2.5 for Portfolio B. The yield curve then steepens: the 2-year yield falls by 20 bp, the 5-year yield is unchanged, the 10-year yield rises by 10 bp, and the 30-year yield rises by 30 bp. Which statement is most accurate?",
        [
          "Both portfolios lose about 0.30%, since the average yield change is +5 bp and both have an effective duration of 6.0.",
          "Portfolio A loses about 0.04% and Portfolio B about 0.45%; the same effective duration hides very different exposures along the curve.",
          "Portfolio B gains about 0.40%, because its large 2-year key rate duration benefits from the fall in short-term yields.",
        ],
        1,
        "On additionne l'effet de chaque point : ΔV/V ≈ −Σ KRD × Δy. Portefeuille A (bullet) : −[0,5 × (−0,20 %) + 4,5 × 0 + 0,8 × 0,10 % + 0,2 × 0,30 %] = −[−0,10 + 0 + 0,08 + 0,06] = −0,04 %. Portefeuille B (barbell) : −[2,0 × (−0,20 %) + 0,5 × 0 + 1,0 × 0,10 % + 2,5 × 0,30 %] = −[−0,40 + 0,10 + 0,75] = −0,45 %. Même effective duration (somme des KRD = 6,0 dans les deux cas), mais B est exposé au 30 ans, là où les taux montent le plus. C'est tout l'intérêt de la key rate duration : utile quand les cash flows se répartissent sur des maturités différentes, inutile si deux portefeuilles ont exactement le même profil. La réponse A applique une duration unique à un choc « moyen » de +5 bp (6,0 × 0,05 % = 0,30 %) : elle suppose un déplacement parallèle. La réponse C ne compte que le gain sur le 2 ans (+0,40 %) et oublie les pertes sur le 10 ans et le 30 ans (−0,85 %).",
      ],

      // Concept 4 — Duration analytique vs empirique (officielle, Reading 61)
      [
        "For a portfolio consisting solely of short-term U.S. government bonds:",
        [
          "estimates of empirical and analytical durations should be similar.",
          "empirical duration will be significantly lower than analytical duration.",
          "analytical duration would be the preferable risk measure.",
        ],
        0,
        "L'analytical duration (Macaulay, modified, effective) se calcule à partir des cash flows et du seul taux de référence ; l'empirical duration est estimée sur l'historique des variations de prix face aux variations du taux de référence. Un portefeuille d'emprunts d'État court terme n'a pratiquement pas de spread de crédit : son prix suit le taux de référence, donc les deux estimations sont proches. La réponse B décrit le cas des obligations corporate (surtout high yield), dont le spread compense en partie les mouvements du taux de référence. La réponse C est fausse : ici les deux mesures se valent ; c'est justement quand elles divergent, pour un corporate bond, qu'il faut préférer l'empirique.",
      ],
      // Variante angle différent — le cas opposé (high yield) et le pourquoi de l'écart
      [
        "Compared with its analytical duration, the empirical duration of a portfolio of high-yield corporate bonds is most likely to be:",
        [
          "higher, because credit spread changes amplify benchmark yield changes.",
          "about the same, because both measures rely on the same benchmark yield.",
          "lower, because credit spreads tend to widen when benchmark yields fall and narrow when they rise.",
        ],
        2,
        "L'analytical duration suppose que le rendement de l'obligation bouge exactement comme le taux de référence et ignore le spread. Or, pour le high yield, les spreads sont corrélés négativement aux taux d'État : quand l'économie ralentit, les taux d'État baissent (fuite vers la qualité) pendant que les spreads s'élargissent, et inversement en reprise. Le spread amortit donc l'effet du taux de référence : la sensibilité réellement observée (empirique) est plus faible que l'analytique. La réponse A inverse l'effet. La réponse B vaut pour des emprunts d'État, sans risque de crédit, pas pour un portefeuille high yield.",
      ],
      // Variante plus difficile — estimer une empirical duration à partir d'un épisode, piège sur la variable de référence, conséquence pour la couverture
      [
        "A high-yield bond portfolio has an analytical (effective) duration of 6.0. Over a period in which benchmark government yields fell by 50 bp, the portfolio's credit spreads widened by 30 bp and its value rose by about 1.2%. Based on this episode, which statement is most accurate?",
        [
          "The empirical duration is about 4.0 (the 1.2% gain divided by the 30 bp spread change), so spread risk dominates benchmark risk.",
          "The empirical duration is about 2.4; hedging the portfolio's benchmark-rate exposure on the basis of its analytical duration of 6.0 would over-hedge it.",
          "The empirical duration is about 6.0, measured as the 1.2% gain divided by the 20 bp decline in the portfolio's own yield.",
        ],
        1,
        "Étape 1 : le rendement du portefeuille a baissé de 50 − 30 = 20 bp, d'où un gain ≈ 6,0 × 0,20 % = 1,2 % (cohérent avec l'énoncé). Étape 2 : l'empirical duration mesure la sensibilité au taux de RÉFÉRENCE : 1,2 % / 0,50 % = 2,4. Étape 3 : couvrir le risque de taux avec une duration de 6,0 reviendrait à vendre environ 2,5 fois trop de sensibilité (6,0 contre 2,4) : sur-couverture. La réponse A divise par la variation du spread au lieu de celle du taux de référence. La réponse C divise par la variation du rendement propre du portefeuille : elle retrouve l'analytical duration (6,0), qui ignore justement l'effet compensateur du spread.",
      ],

      // Concept 5 — Putable vs callable : convexité, plancher et plafond (officielle, Reading 59)
      [
        "In comparing the price volatility of putable bonds to that of option-free bonds, a putable bond will have:",
        ["less price volatility at higher yields.", "less price volatility at low yields.", "more price volatility at higher yields."],
        0,
        "Un putable bond = bond sans option + put détenu par l'investisseur. Quand les taux montent, le put prend de la valeur : le prix ne peut guère descendre sous le put price (plancher), la baisse est amortie, donc moins de volatilité à taux élevés. À taux bas, le put ne vaut presque rien : le putable se comporte comme un bond sans option, ni plus ni moins volatil, d'où l'erreur de la réponse B. La réponse C inverse l'effet du put.",
      ],
      // Variante angle différent — l'autre option de la catégorie (callable) : ce qui N'EST PAS vrai sur sa convexité
      [
        "Which of the following statements about the price-yield relationship of a callable bond is least accurate?",
        [
          "At high yields, where a call is unlikely, the callable bond behaves much like an option-free bond and exhibits positive convexity.",
          "At low yields, the call price acts as a ceiling on the bond's price, so the bond exhibits negative convexity.",
          "Because the issuer always holds the call option, the callable bond exhibits negative convexity at every yield level.",
        ],
        2,
        "La convexité d'un callable n'est pas fixe : elle dépend de la probabilité d'exercice du call. À taux élevés, le call est peu probable (il ne vaut presque rien) et le bond se comporte comme un bond sans option, avec une convexité positive (A est vraie). À taux bas, l'émetteur a intérêt à rembourser : le prix bute sur le call price (plafond) et la courbe prix-rendement s'infléchit vers le bas, convexité négative (B est vraie). La réponse C est donc fausse : la convexité négative n'apparaît que lorsque le call devient probable, pas à tous les niveaux de taux.",
      ],
      // Variante plus difficile — calculer la convexité effective par bump, puis identifier l'option
      [
        "A bond is priced at 101.20. A pricing model estimates that its price would rise to 101.55 if the benchmark yield curve shifted down by 25 bp and fall to 100.70 if it shifted up by 25 bp. Which statement is most accurate?",
        [
          "Its effective convexity is about −237, consistent with a callable bond trading at low yields, whose price gains are capped near the call price.",
          "Its effective convexity is about +237, consistent with a putable bond trading at high yields, whose price losses are limited by the put price.",
          "Its effective convexity is about −237, consistent with a putable bond trading at low yields, where the put creates negative convexity.",
        ],
        0,
        "Convexité effective = (V− + V+ − 2V0) / (ΔY² × V0) = (101,55 + 100,70 − 2 × 101,20) / (0,0025² × 101,20) = −0,15 / 0,0006325 ≈ −237. Lecture directe : le bond gagne 0,35 quand les taux baissent mais perd 0,50 quand ils montent, il gagne moins qu'il ne perd : convexité négative, la signature d'un callable à taux bas dont le prix plafonne près du call price. La réponse B se trompe de signe : une convexité positive impliquerait un gain supérieur à la perte. La réponse C a le bon chiffre mais la mauvaise option : un put ajoute de la convexité positive (plancher), il ne crée jamais de convexité négative.",
      ],

      // Concept 6 — Crédit souverain : monnaie propre, reserve vs non-reserve currency (officielle, Reading 63)
      [
        "Compared to corporate bonds with the same credit ratings, municipal general obligation (GO) bonds typically have less credit risk because:",
        [
          "default rates on GOs are typically lower for same credit ratings.",
          "GOs are not affected by economic downturns.",
          "governments can print money to repay debt.",
        ],
        0,
        "À notation égale, les GO bonds municipaux font historiquement moins défaut que les obligations corporate. La réponse B est fausse : les GO dépendent des recettes fiscales, qui baissent en récession. La réponse C est fausse pour une municipalité : seul un État souverain qui emprunte dans sa propre monnaie peut créer de la monnaie pour rembourser, une municipalité ne contrôle pas la politique monétaire. C'est le lien avec la distinction reserve / non-reserve currency : cette capacité n'existe que pour la dette libellée dans une monnaie que l'émetteur contrôle.",
      ],
      // Variante angle différent — comparer deux souverains selon la monnaie dans laquelle ils empruntent
      [
        "Country R borrows mainly in its own currency, which is widely held as a reserve currency. Country N's own currency is not a reserve currency, so it borrows mainly in U.S. dollars. All else equal, which statement is most accurate?",
        [
          "Country N's dollar debt carries lower credit risk, because the U.S. dollar is a reserve currency and its value is therefore stable.",
          "Country N's dollar debt carries higher credit risk, because N must earn or borrow dollars to service it, whereas R can borrow in its own currency and ultimately create the money to repay.",
          "Both carry the same credit risk if their debt-to-GDP ratios are equal, because the currency of denomination does not affect the ability to pay.",
        ],
        1,
        "Une monnaie de réserve est largement détenue dans le monde (USD, EUR) : le pays qui l'émet peut emprunter dans sa propre monnaie et dispose d'une grande flexibilité monétaire. Un pays à monnaie non-reserve doit se procurer des devises (exportations, réserves de change, nouveaux emprunts) pour honorer sa dette externe, et sa banque centrale ne peut pas créer de dollars : risque plus élevé. La réponse A confond les deux pays : c'est le pays émetteur du dollar qui profite du statut de monnaie de réserve, pas N, qui subit au contraire un décalage de devises. La réponse C ignore que la monnaie de libellé détermine qui contrôle les moyens de remboursement : à ratio dette/PIB égal, la dette en devises reste plus risquée.",
      ],
      // Variante plus difficile — diagnostic souverain complet : fiscal, économie, institutions (volonté de payer), monnaie
      [
        "An analyst reviews Sovereign S: its interest-to-GDP ratio is very high and rising; its real GDP growth has been low but very stable; its central bank is independent and has a credible inflation record; most of its debt is denominated in U.S. dollars, while its own currency is not a reserve currency; and a newly elected government has publicly questioned whether it should honor debt contracted by its predecessor. Which assessment is most accurate?",
        [
          "Strong overall: the independent central bank can create money to repay the dollar debt, which offsets the weak fiscal position and the new government's statements.",
          "Weak fiscal strength; strong economic growth and stability; weak institutions and policy, because willingness to pay is in doubt; and limited monetary flexibility for the dollar debt, since the central bank cannot create dollars.",
          "Weak economic growth and stability, because low growth volatility signals stagnation; strong institutions and policy, because central bank independence outweighs the new government's statements.",
        ],
        1,
        "On classe chaque indice dans son facteur. Fiscal : un ratio intérêts/PIB très élevé et croissant signale une dette peu soutenable, force budgétaire faible. Économie : une faible volatilité de la croissance réelle est un signe de stabilité, facteur favorable. Institutions et politique : un gouvernement qui remet en cause la dette de son prédécesseur fragilise la VOLONTÉ de payer, c'est ce facteur qui se dégrade, même si la CAPACITÉ existe. Monnaie : la banque centrale est crédible, mais la dette est en dollars et la monnaie locale n'est pas une monnaie de réserve, donc la flexibilité monétaire ne sert à rien pour cette dette. La réponse A suppose à tort que la banque centrale peut créer des dollars. La réponse C interprète à l'envers la faible volatilité de la croissance et laisse l'indépendance de la banque centrale masquer un problème de volonté de payer.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Fixed Income Page 5...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
