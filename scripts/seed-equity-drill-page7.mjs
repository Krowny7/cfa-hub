// Seed script — quiz de "drill" associé à la page 7 de la fiche PDF Equity
// (Equity Valuation — Present Value Models). Structure : pour chacun des 5
// concepts clés de la page, 1 question officielle + 1 variante "angle
// différent" (même notion, mais jamais un simple changement de chiffres
// menant au même raisonnement) + 1 variante "plus difficile" (raisonnement à
// plusieurs étapes / pièges combinés). Questions officielles : 4 reprises à
// l'identique de l'ancienne version du drill (banque Reading 48, corrigés
// vérifiés) + 1 tirée de la banque Reading 48 (Question #125, ID 1574012,
// bonne réponse vérifiée sur le corrigé officiel). Chaque calcul des
// variantes a été refait étape par étape. Voir memory
// regle-drill-variantes-cfa-hub. Questions en anglais, explications en
// français. syncQuizSets met le set à jour en place : les questions reprises
// à l'identique conservent leur historique de réponses.
// Usage: node scripts/seed-equity-drill-page7.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Equity (Système)";

const QUIZ_SETS = [
  {
    title: "Equity — Drill Fiche Page 7 (Equity Valuation: Present Value Models)",
    difficulty: 3,
    questions: [
      // Concept 1 — Taux de croissance soutenable g = b × ROE (officielle)
      [
        "When a company's return on equity (ROE) is 12% and the dividend payout ratio is 60%, what is the implied sustainable growth rate of earnings and dividends?",
        ["4.0%.", "4.8%.", "7.8%."],
        1,
        "Le taux de croissance soutenable g = ROE × taux de rétention = 12% × (1 − 0,60) = 12% × 0,40 = 4,8%. La réponse A confond à tort le taux de distribution avec le taux de rétention.",
      ],
      // Variante angle différent — calcul inversé : quel ROE faut-il pour atteindre un g cible ?
      [
        "Management wants the company to achieve a sustainable growth rate of 9% while maintaining its dividend payout ratio at 40%. The minimum return on equity (ROE) the company must earn is closest to:",
        ["5.4%.", "22.5%.", "15.0%."],
        2,
        "On inverse la formule g = b × ROE, d'où ROE = g / b. Le taux de rétention vaut b = 1 − 0,40 = 0,60, donc ROE = 9% / 0,60 = 15,0% (vérification : 0,60 × 15% = 9%). 22,5% divise g par le taux de distribution (9% / 0,40) au lieu du taux de rétention : c'est le piège n°1 pris à l'envers. 5,4% multiplie g par b (9% × 0,60) au lieu de diviser : erreur d'algèbre en isolant le ROE.",
      ],
      // Variante plus difficile — g soutenable puis r implicite du marché (r = D1/P0 + g)
      [
        "A stock trades at $40.00. Next year's earnings per share are expected to be $4.00, the company pays out 40% of its earnings as dividends, and it is expected to earn a 15% return on equity indefinitely. If the market price equals the constant growth DDM value, the market's implied required return on equity is closest to:",
        ["13.0%.", "10.0%.", "19.0%."],
        0,
        "Deux étapes. (1) Croissance soutenable : g = b × ROE = (1 − 0,40) × 15% = 0,60 × 15% = 9%. (2) Dividende de l'an prochain : D1 = 0,40 × 4,00 = 1,60 $. On isole r dans le modèle de Gordon : r = D1/P0 + g = 1,60/40 + 9% = 4% + 9% = 13,0%. 10,0% tombe dans le piège n°1 (g = taux de distribution × ROE = 0,40 × 15% = 6%, puis 4% + 6%). 19,0% utilise le rendement des bénéfices (BPA/P = 4,00/40 = 10%) au lieu du rendement du dividende : le modèle de Gordon actualise des dividendes, pas des bénéfices.",
      ],

      // Concept 2 — Modèle de Gordon (croissance constante), piège D0/D1 (officielle)
      [
        "A company has just paid a $2.00 dividend per share and dividends are expected to grow at a rate of 6% indefinitely. If the required return is 13%, what is the value of the stock today?",
        ["$30.29.", "$34.16.", "$32.25."],
        0,
        "Le dividende de $2,00 est D0 (déjà versé) : il faut donc utiliser D1 = D0×(1+g) = 2,00×1,06 = 2,12 $, puis P0 = D1/(k−g) = 2,12/(0,13−0,06) = 30,29 $. Les distracteurs proviennent d'erreurs classiques consistant à utiliser directement D0 au lieu de D1.",
      ],
      // Variante angle différent — cas limite : hypothèses du modèle (r > g, firme mature)
      [
        "An analyst forecasts that a young technology company's dividends will grow at 15% per year over the next several years before slowing down. The company's required return on equity is 12%. Which statement about using the Gordon growth model with a 15% growth rate to value this company is most accurate?",
        [
          "The model produces a negative value, which indicates that the stock is overvalued.",
          "The model is not appropriate, because it requires a constant growth rate that is lower than the required return; a multistage DDM is better suited.",
          "The model remains appropriate as long as next year's dividend (D1), rather than the current dividend (D0), is used in the numerator.",
        ],
        1,
        "Le modèle de Gordon repose sur trois hypothèses : les dividendes mesurent la richesse de l'actionnaire, g et r sont constants indéfiniment, et r > g. Ici g (15%) dépasse r (12%) et la forte croissance n'est que temporaire : le modèle ne s'applique pas. Il est conçu pour des firmes matures et stables ; une firme jeune dont la croissance ralentira se valorise avec un DDM multi-étapes (2 ou 3 phases). A est faux : avec r − g < 0, le résultat négatif n'a aucun sens économique (une action ne peut pas valoir un prix négatif), ce n'est pas un signal de surévaluation. C est faux : utiliser D1 plutôt que D0 est nécessaire, mais ne règle en rien le problème du dénominateur r − g négatif.",
      ],
      // Variante plus difficile — CAPM + D0→D1 + sensibilité de la valeur à r
      [
        "A company has just paid a dividend of $2.00 per share, and dividends are expected to grow at 5% per year indefinitely. The risk-free rate is 4%, the expected return on the market is 9%, and the stock's beta is 1.2. If the stock's beta rises to 1.4, with all other inputs unchanged, the stock's value according to the Gordon growth model will decrease by approximately:",
        ["$3.33.", "$6.67.", "$7.00."],
        2,
        "Étape 1 — Le dividende de 2,00 $ vient d'être versé (D0), donc D1 = 2,00 × 1,05 = 2,10 $. Étape 2 — CAPM : r = 4% + 1,2 × (9% − 4%) = 10% avant, puis r = 4% + 1,4 × 5% = 11% après. Étape 3 — Gordon : V = 2,10/(0,10 − 0,05) = 42,00 $ avant, puis 2,10/(0,11 − 0,05) = 35,00 $ après, soit une baisse de 7,00 $ (−16,7%). Un seul point de r en plus fait perdre un sixième de la valeur : c'est la grande sensibilité du modèle à l'écart r − g. 6,67 $ oublie de faire croître le dividende (2,00/0,05 = 40,00 $ puis 2,00/0,06 = 33,33 $). 3,33 $ prend 9% comme prime de risque au lieu de 9% − 4% = 5% (r = 14,8% puis 16,6%, d'où 21,43 $ puis 18,10 $).",
      ],

      // Concept 3 — DDM multi-étapes : phase de forte croissance puis valeur terminale (officielle)
      [
        "Bybee is expected to have a temporary supernormal growth period and then level off to a \"normal,\" sustainable growth rate forever. The supernormal growth is expected to be 25 percent for 2 years, 20 percent for one year and then level off to a normal growth rate of 8 percent forever. The market requires a 14 percent return on the company and the company last paid a $2.00 dividend. What would the market be willing to pay for the stock today?",
        ["$52.68.", "$67.50.", "$47.09."],
        0,
        "D1=2,00×1,25=2,50 ; D2=2,50×1,25=3,125 ; D3=3,125×1,20=3,75. Valeur terminale fin année 2 : P2=D3/(k−g)=3,75/0,06=62,50 $. Actualisation à 14% : PV(D1)=2,19 ; PV(D2)=2,40 ; PV(P2)=48,09. Somme=52,68 $.",
      ],
      // Variante angle différent — repérer l'erreur : la valeur terminale est déjà datée de la fin de l'année n
      [
        "An analyst values a stock using a two-stage DDM. Dividends of $1.00, $1.20, and $1.40 are expected at the end of Years 1, 2, and 3, respectively, after which dividends are expected to grow at 5% per year forever. The required return is 10%. The analyst computes the terminal value as P3 = D4 / (r − g) but, because P3 is based on the Year 4 dividend, discounts it back to today over four years. Compared with the correct intrinsic value, the analyst's estimate is:",
        [
          "correct, because the terminal value relies on a dividend that is received at the end of Year 4.",
          "too high, because the terminal value should be discounted over five years.",
          "too low, because P3 is already a value as of the end of Year 3 and should be discounted over three years only.",
        ],
        2,
        "P3 = D4/(r − g) donne la valeur de l'action à la fin de l'année 3 : la formule de Gordon a déjà actualisé à la date 3 tous les dividendes à partir de D4. Il ne reste qu'à ramener P3 à aujourd'hui sur 3 périodes ; une période d'actualisation en trop sous-estime la valeur. En chiffres : D4 = 1,40 × 1,05 = 1,47 $ ; P3 = 1,47/0,05 = 29,40 $ ; PV correcte = 29,40/1,10³ = 22,09 $, contre 29,40/1,10⁴ = 20,08 $ chez l'analyste (≈ 2,01 $ de moins). Valeur correcte : 0,91 + 0,99 + 1,05 + 22,09 = 25,04 $, contre 23,03 $ pour l'analyste. A est faux : que la formule utilise D4 ne change pas la date de la valeur obtenue (fin d'année 3). B pousse la même confusion encore plus loin : rien ne justifie 5 périodes, et cela ferait encore baisser l'estimation.",
      ],
      // Variante plus difficile — 3 phases (aucun dividende, forte croissance, maturité) + g soutenable
      [
        "A young company is not expected to pay any dividends in Years 1 and 2. It will pay its first dividend, $1.00 per share, at the end of Year 3, and the dividend is expected to grow by 20% in Year 4. From Year 5 onward, the company will be mature: its ROE is expected to stabilize at 10% and its dividend payout ratio at 60%, and dividends will grow at the sustainable growth rate forever. If the required return on equity is 11%, the value of the stock today is closest to:",
        ["$12.10.", "$13.27.", "$18.28."],
        1,
        "Modèle à 3 phases (aucun dividende → forte croissance → maturité). (1) Croissance stable : g = b × ROE = (1 − 0,60) × 10% = 4%. (2) Dividendes : D3 = 1,00 $ ; D4 = 1,00 × 1,20 = 1,20 $ ; D5 = 1,20 × 1,04 = 1,248 $. (3) Valeur terminale à la fin de l'année 4 : P4 = D5/(r − g) = 1,248/(0,11 − 0,04) = 17,83 $. (4) Actualisation à 11% : 1,00/1,11³ = 0,73 ; (1,20 + 17,83)/1,11⁴ = 0,79 + 11,74 = 12,53. Valeur = 0,73 + 12,53 = 13,27 $. Les années 1 et 2 sans dividende n'apportent rien mais comptent dans l'exposant : D3 est bien actualisé sur 3 ans. 18,28 $ tombe dans le piège n°1 (g = 0,60 × 10% = 6%, d'où D5 = 1,272 $ et P4 = 1,272/0,05 = 25,44 $). 12,10 $ actualise P4 sur 5 périodes parce qu'il repose sur D5, alors que P4 est déjà une valeur à la fin de l'année 4.",
      ],

      // Concept 4 — Modèle FCFE : capacité à verser des dividendes (officielle — banque Reading 48, Q#125)
      [
        "A valuation model based on the cash flows that a firm will have available to pay dividends in the future is best characterized as a(n):",
        ["free cash flow to equity model.", "free cash flow to the firm model.", "infinite period dividend discount model."],
        0,
        "Le FCFE (free cash flow to equity) mesure la capacité de l'entreprise à verser des dividendes : c'est le flux qui reste aux actionnaires après les investissements et les flux avec les créanciers. Un modèle FCFE prévoit les FCFE futurs et valorise l'action comme la valeur actuelle des FCFE futurs par action. B est faux : le FCFF est le flux disponible pour TOUS les apporteurs de capitaux (créanciers et actionnaires), pas seulement pour les actionnaires. C est faux : le DDM à horizon infini actualise les dividendes effectivement versés, pas la capacité à les verser.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : famille de modèles, cas d'usage, ajustement
      [
        "Which of the following statements about the free cash flow to equity (FCFE) valuation model is least accurate?",
        [
          "Like the dividend discount model, it is a present value model.",
          "The value of equity is obtained by discounting forecast FCFE and then subtracting the market value of the firm's debt.",
          "It is particularly useful for a firm that pays no dividends, or whose dividends differ significantly from its capacity to pay dividends.",
        ],
        1,
        "Le FCFE revient déjà aux seuls actionnaires : il est calculé après les investissements et après les flux avec les créanciers (emprunt net). La valeur actuelle des FCFE futurs donne donc directement la valeur des capitaux propres, sans ajustement supplémentaire ; retrancher la dette ferait compter les créanciers deux fois (c'est avec le FCFF, flux pour tous les apporteurs de capitaux, qu'on retranche la dette pour obtenir la valeur des actions). A est exact : comme le DDM, le FCFE appartient à la famille des modèles de valeur actuelle (les deux autres familles étant les modèles de multiples et les modèles fondés sur les actifs). C est exact : c'est précisément le cas d'usage du FCFE, quand les dividendes ne reflètent pas la vraie capacité de distribution.",
      ],
      // Variante plus difficile — calcul du FCFE puis valorisation en croissance constante, dette = donnée-piège
      [
        "In its most recent year, a company reported cash flow from operations of $150 million and fixed capital investment of $80 million. During the year, it issued $40 million of new debt and repaid $25 million of existing debt. FCFE is expected to grow at 4% per year indefinitely, and the required return on equity is 10%. The company has 20 million shares and $200 million of debt outstanding. The intrinsic value per share is closest to:",
        ["$73.67.", "$63.67.", "$60.67."],
        0,
        "(1) FCFE0 = CFO − FCInv + emprunt net = 150 − 80 + (40 − 25) = 85 M$. (2) Le FCFE donné est celui de l'année écoulée (comme un D0) : FCFE1 = 85 × 1,04 = 88,4 M$. (3) Valeur des capitaux propres = 88,4/(0,10 − 0,04) = 1 473,3 M$, soit 1 473,3/20 = 73,67 $ par action. La dette de 200 M$ est une donnée-piège : le FCFE est déjà net des flux avec les créanciers, on ne la retranche pas — le faire donne (1 473,3 − 200)/20 = 63,67 $. 60,67 $ oublie l'emprunt net dans le FCFE (FCFE0 = 70 M$, d'où 72,8/0,06 = 1 213,3 M$, soit 60,67 $ par action).",
      ],

      // Concept 5 — Action de préférence perpétuelle V = D / r (officielle)
      [
        "Calculate the value of a preferred stock that pays an annual dividend of $5.50 if the current market yield on AAA rated preferred stock is 75 basis points above the current T-Bond rate of 7%.",
        ["$42.63.", "$70.97.", "$78.57."],
        1,
        "Rendement exigé = 7%+0,75% = 7,75%. Valeur = Dividende/taux exigé = 5,50/0,0775 = 70,97 $.",
      ],
      // Variante angle différent — sens de variation : qu'est-ce qui fait monter la valeur ?
      [
        "For a non-callable, non-convertible perpetual preferred stock that pays a fixed annual dividend, which of the following would most likely increase its value, all else equal?",
        [
          "A narrowing of the yield spread between comparable preferred stocks and Treasury bonds.",
          "An increase in the Treasury bond yield.",
          "An increase in the expected growth rate of the issuer's common stock dividends.",
        ],
        0,
        "V = D / r : le dividende D est fixe, seule une variation du taux exigé r fait bouger la valeur, en sens inverse. Comme dans la question officielle, r = taux des T-bonds + spread des préférentielles comparables : un resserrement du spread fait baisser r et monter V (ex. 5,50 $ à 7,75% = 70,97 $ ; si le spread passe de 75 à 50 pb, r = 7,50% et V = 73,33 $). B fait l'inverse : r monte, donc V baisse. C est un piège : le dividende d'une préférentielle est fixe et ne profite pas de la croissance des dividendes ordinaires — il n'y a pas de g dans V = D / r.",
      ],
      // Variante plus difficile — préférentielle à échéance, dividende semestriel, r = T-bond + spread
      [
        "A company's preferred stock has a $50 par value and a 6% annual dividend rate, paid semiannually, and must be redeemed at par in 8 years. Comparable preferred stocks yield 150 basis points above the 5.5% Treasury yield (both stated as annual rates). The value of the preferred stock is closest to:",
        ["$42.86.", "$46.98.", "$48.28."],
        1,
        "(1) Rendement exigé : r = 5,5% + 1,50% = 7,0% par an. (2) Avec une échéance, la préférentielle s'évalue comme une obligation, et le versement semestriel impose de diviser r par 2 ET de doubler N : I/Y = 3,5%, N = 16, PMT = 6% × 50 / 2 = 1,50 $, FV = 50 $. (3) V = 1,50 × [1 − 1,035^(−16)]/0,035 + 50/1,035^16 = 18,14 + 28,84 = 46,98 $. Contrôle de cohérence : le taux de dividende (6%) est inférieur au rendement exigé (7%), la valeur est donc sous le pair. 48,28 $ divise r par 2 sans doubler N (N = 8 au lieu de 16). 42,86 $ traite le titre comme perpétuel (3,00/0,07) en ignorant le remboursement au pair dans 8 ans.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Equity Page 7...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
