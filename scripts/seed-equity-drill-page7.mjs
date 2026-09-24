// Seed script — quiz de "drill" associé à la page 7 de la fiche PDF Equity
// (Equity Valuation — Present Value Models). Questions officielles
// sélectionnées depuis la banque de pratique (Reading 48, volet DDM/FCFE),
// corrigé vérifié contre le PDF "- Answers.pdf" correspondant — chaque
// calcul a été refait à la main pour confirmer la cohérence.
// Usage: node scripts/seed-equity-drill-page7.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Equity (Système)";

const QUIZ_SETS = [
  {
    title: "Equity — Drill Fiche Page 7 (Equity Valuation: Present Value Models)",
    difficulty: 3,
    questions: [
      [
        "When a company's return on equity (ROE) is 12% and the dividend payout ratio is 60%, what is the implied sustainable growth rate of earnings and dividends?",
        ["4.0%.", "4.8%.", "7.8%."],
        1,
        "Le taux de croissance soutenable g = ROE × taux de rétention = 12% × (1 − 0,60) = 12% × 0,40 = 4,8%. La réponse A confond à tort le taux de distribution avec le taux de rétention.",
      ],
      [
        "A stock is expected to pay a dividend of $1.50 at the end of each of the next three years. At the end of three years the stock price is expected to be $25. The equity discount rate is 16 percent. What is the current stock price?",
        ["$24.92.", "$19.39.", "$17.18."],
        1,
        "La valeur actuelle est la somme des PV des 3 dividendes et du prix terminal, tous actualisés à 16% : 1,50/1,16 + 1,50/1,16² + 1,50/1,16³ + 25/1,16³ ≈ 19,39 $.",
      ],
      [
        "A company has just paid a $2.00 dividend per share and dividends are expected to grow at a rate of 6% indefinitely. If the required return is 13%, what is the value of the stock today?",
        ["$30.29.", "$34.16.", "$32.25."],
        0,
        "Le dividende de $2,00 est D0 (déjà versé) : il faut donc utiliser D1 = D0×(1+g) = 2,00×1,06 = 2,12 $, puis P0 = D1/(k−g) = 2,12/(0,13−0,06) = 30,29 $. Les distracteurs proviennent d'erreurs classiques consistant à utiliser directement D0 au lieu de D1.",
      ],
      [
        "Given the following estimated financial results for FishnChips, Inc.: sales $1,000,000; earnings $150,000; total assets $800,000; equity $400,000; dividend payout ratio 60%; shares outstanding 75,000; real risk-free rate 4%; expected inflation 3%; expected market return 13%; beta 2.1. Using the infinite period DDM, the per share value is approximately:",
        ["$17.91.", "$26.86.", "$30.89."],
        1,
        "D1 = (150 000×0,60)/75 000 = 1,20 $. Taux sans risque nominal = (1,04)×(1,03)−1 = 7,12%. ke = 7,12%+2,1×(13%−7,12%) = 19,468%. ROE (DuPont) = (150000/1000000)×(1000000/800000)×(800000/400000) = 37,5%, donc g = 0,40×0,375 = 15%. P0 = 1,20/(0,19468−0,15) = 26,86 $.",
      ],
      [
        "Calculate the value of a preferred stock that pays an annual dividend of $5.50 if the current market yield on AAA rated preferred stock is 75 basis points above the current T-Bond rate of 7%.",
        ["$42.63.", "$70.97.", "$78.57."],
        1,
        "Rendement exigé = 7%+0,75% = 7,75%. Valeur = Dividende/taux exigé = 5,50/0,0775 = 70,97 $.",
      ],
      [
        "Bybee is expected to have a temporary supernormal growth period and then level off to a \"normal,\" sustainable growth rate forever. The supernormal growth is expected to be 25 percent for 2 years, 20 percent for one year and then level off to a normal growth rate of 8 percent forever. The market requires a 14 percent return on the company and the company last paid a $2.00 dividend. What would the market be willing to pay for the stock today?",
        ["$52.68.", "$67.50.", "$47.09."],
        0,
        "D1=2,00×1,25=2,50 ; D2=2,50×1,25=3,125 ; D3=3,125×1,20=3,75. Valeur terminale fin année 2 : P2=D3/(k−g)=3,75/0,06=62,50 $. Actualisation à 14% : PV(D1)=2,19 ; PV(D2)=2,40 ; PV(P2)=48,09. Somme=52,68 $.",
      ],
      [
        "Assuming the risk-free rate is 5% and the expected return on the market is 12%, what is the value of a stock with a beta of 1.5 that paid a $2 dividend last year if dividends are expected to grow at a 5% rate forever?",
        ["$12.50.", "$17.50.", "$20.00."],
        2,
        "ke (CAPM) = 5%+1,5×(12%−5%) = 15,5%. Le dividende de $2 est D0, donc D1 = 2×1,05 = 2,10 $. P0 = 2,10/(0,155−0,05) = 20,00 $.",
      ],
      [
        "If a preferred stock that pays a $11.50 dividend is trading at $88.46, what is the market's required rate of return for this security?",
        ["7.69%.", "11.76%.", "13.00%."],
        2,
        "Pour une action préférentielle, kp = Dividende/Valeur = 11,50/88,46 = 13,00%. La réponse A (7,69%) confond ce taux avec l'inverse (ratio prix/dividende).",
      ],
      [
        "Given the following information, compute the implied dividend growth rate. Profit margin = 10.0%. Total asset turnover = 2.0 times. Financial leverage = 1.5 times. Dividend payout ratio = 40.0%.",
        ["12.0%.", "18.0%.", "4.5%."],
        1,
        "Taux de rétention = 1−0,40 = 0,60. ROE (DuPont) = 10%×2,0×1,5 = 30,0%. g = 0,60×30,0% = 18,0%. La réponse A utilise à tort le taux de distribution au lieu du taux de rétention.",
      ],
      [
        "Donna Drake is interested in a stock that is expected to pay a dividend of $1.50 in one year, $1.75 in two years, and $2.05 in three years. Drake expects to sell the stock for $43.87 after three years, after which the dividend will grow at 7% annually. If Drake requires a 12% return on the stock, the price she is willing to pay today is closest to:",
        ["$34.", "$36.", "$38."],
        1,
        "PV(1,50, n=1)=1,34 $ ; PV(1,75, n=2)=1,40 $ ; PV(2,05+43,87=45,92, n=3)=32,68 $. Somme=35,42 $, valeur la plus proche de 36 $.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");

  console.log("Drill QCM — Fiche Equity Page 7...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });

  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
