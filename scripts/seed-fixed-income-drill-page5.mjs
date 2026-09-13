// Seed script — quiz de "drill" pour la page 5 de la fiche PDF Fixed
// Income (Credit Risk Measures & Sovereign Credit). 5 concepts x 3 variantes.
// Usage: node scripts/seed-fixed-income-drill-page5.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Fixed Income (Système)";

const QUIZ_SETS = [
  {
    title: "Fixed Income — Drill Fiche Page 5 (Credit Risk Measures & Sovereign Credit)",
    difficulty: 2,
    questions: [
      // Concept 1 — Loss severity / LGD
      [
        "Loss severity given default is most accurately defined as:",
        [
          "the probability that an issuer will default over a given horizon.",
          "the portion of a bond's value (principal and unpaid interest) that an investor loses if default occurs, after considering recovery.",
          "the bond's credit spread over the benchmark rate.",
        ],
        1,
        "La loss severity (loss given default, LGD) est le pourcentage (ou montant) de l'exposition d'un bond qui est perdu en cas de défaut — elle est égale à 1 moins le recovery rate (LGD = 1 − RR). La probabilité de défaut (A) et le spread de crédit (C) sont des concepts liés mais distincts.",
      ],
      [
        "A bond has a recovery rate of 35% in the event of default. Its loss severity is closest to:",
        ["35%.", "65%.", "100%."],
        1,
        "Loss severity (LGD) = 1 − recovery rate = 1 − 35% = 65%. A confond loss severity et recovery rate. C ne s'appliquerait que si le recovery était nul.",
      ],
      [
        "Two bonds have the same probability of default. Bond A has a recovery rate of 20% and Bond B has a recovery rate of 60%. Relative to Bond B, Bond A most likely has:",
        [
          "lower expected loss, since a lower recovery rate reduces exposure at default.",
          "higher expected loss, since its higher loss severity (80% vs 40%) is not offset by any difference in default probability.",
          "the same expected loss, since expected loss depends only on default probability.",
        ],
        1,
        "Expected loss = POD × LGD (version simplifiée). Avec des probabilités de défaut égales, la loss severity bien plus élevée de Bond A (LGD = 1 − 20% = 80%, contre 1 − 60% = 40% pour Bond B) signifie que Bond A a une perte attendue plus élevée.",
      ],
      // Concept 2 — Credit risk factors (POD/recovery vs duration/volatility)
      [
        "A bond's credit risk is most directly a function of:",
        [
          "its probability of default and its expected recovery rate (loss given default).",
          "its duration and the volatility of benchmark yields.",
          "its coupon rate and time to maturity only.",
        ],
        0,
        "Le risque de crédit reflète précisément la probabilité de défaut (POD) combinée à la perte en cas de défaut (loss severity/recovery) — c'est distinct du risque de taux, qui dépend de la duration et de la volatilité des yields (sans rapport avec un éventuel défaut).",
      ],
      [
        "Which of the following would be used to estimate a bond's price sensitivity to a benchmark rate change, as opposed to its credit risk?",
        [
          "The issuer's credit rating and expected recovery rate.",
          "The bond's duration combined with the volatility of the relevant yield.",
          "The issuer's probability of default over the bond's life.",
        ],
        1,
        "La duration combinée à la volatilité du yield estime le risque de prix lié aux variations de taux — c'est distinct des mesures de risque de crédit comme le rating (proxy de la probabilité de défaut) et le recovery rate (loss severity), qui évaluent plutôt le risque et l'impact d'un défaut.",
      ],
      [
        "An analyst downgrades her recovery rate assumption for a bond following news of asset sales by the issuer, while leaving her probability-of-default estimate unchanged. All else equal, this update will most likely:",
        [
          "leave the bond's estimated credit risk (expected loss) unchanged, since default probability didn't change.",
          "increase the bond's estimated credit risk (expected loss), since loss severity has increased.",
          "decrease the bond's estimated interest rate risk.",
        ],
        1,
        "Un recovery rate attendu plus faible augmente la loss severity (LGD = 1 − RR), ce qui augmente directement la perte de crédit attendue (POD × LGD) même sans changement de la probabilité de défaut — le risque de crédit dépend des DEUX facteurs, pas seulement de la probabilité de défaut.",
      ],
      // Concept 3 — Sovereign fiscal strength (interest-to-GDP)
      [
        "All else equal, a sovereign issuer with a very high (and rising) interest payments-to-GDP ratio is most likely exhibiting:",
        [
          "strong fiscal strength, since it demonstrates the ability to borrow.",
          "weak fiscal strength, since a growing share of government revenue/output is consumed simply servicing existing debt.",
          "no meaningful signal about fiscal strength, since interest payments are unrelated to debt affordability.",
        ],
        1,
        "Un ratio intérêts/PIB élevé et croissant signale qu'une part de plus en plus grande de la production économique est consacrée au seul service de la dette existante, un signe d'affaiblissement de la soutenabilité de la dette et de la force budgétaire — un facteur clé du risque de crédit souverain.",
      ],
      [
        "Which of the following would most likely be interpreted as a sign of weaker sovereign fiscal strength?",
        [
          "Low and stable real GDP growth combined with a low interest-to-GDP ratio.",
          "High real GDP growth combined with a low and declining interest-to-GDP ratio.",
          "A sharply rising interest-to-GDP ratio combined with persistently low real GDP growth.",
        ],
        2,
        "La force budgétaire est affaiblie par la combinaison d'un fardeau croissant du service de la dette (intérêts/PIB) et d'une croissance économique faible (qui limite la base de revenus de l'État pour soutenir cette dette) — les deux facteurs se renforcent mutuellement pour affaiblir la force budgétaire.",
      ],
      [
        "A sovereign's interest-to-GDP ratio can most usefully be interpreted as a measure of:",
        [
          "the government's willingness to repay its debt.",
          "how much of the country's economic output is required just to service existing debt, a measure of debt affordability.",
          "the country's foreign exchange reserves relative to its imports.",
        ],
        1,
        "Le ratio intérêts/PIB mesure directement le fardeau du service de la dette par rapport à la taille de l'économie — un indicateur central de la force budgétaire/soutenabilité de la dette, distinct de la « volonté de payer » (facteur institutionnel/politique) ou de l'adéquation des réserves (facteur monétaire/externe).",
      ],
      // Concept 4 — Sovereign willingness to pay
      [
        "A sovereign government has ample fiscal capacity to service its debt but has a history of defaulting for political reasons. This scenario most directly illustrates that sovereign credit risk depends not only on:",
        [
          "ability to pay, but also on willingness to pay, which reflects institutional and political factors.",
          "currency reserves, but also on population size.",
          "GDP growth, but also on inflation alone.",
        ],
        0,
        "L'analyse du crédit souverain distingue la capacité de payer (capacité budgétaire/monétaire) de la volonté de payer (qualité institutionnelle, stabilité politique, historique, état de droit) — un gouvernement peut avoir les ressources pour payer mais choisir de ne pas le faire, pour des raisons politiques.",
      ],
      [
        "Which of the following is most directly a measure of a sovereign's institutional and political willingness to pay its debt, rather than its financial ability to do so?",
        [
          "The government's debt-to-GDP ratio.",
          "The track record of the central bank's independence and the government's history of honoring obligations.",
          "The country's foreign currency reserves.",
        ],
        1,
        "La volonté de payer s'évalue via des facteurs institutionnels et politiques — historique, état de droit, indépendance de la banque centrale, crédibilité des politiques — par opposition à des mesures purement financières/budgétaires comme le ratio dette/PIB (capacité) ou les réserves (liquidité externe), qui mesurent la capacité plutôt que l'intention.",
      ],
      [
        "A sudden change in a country's political leadership, resulting in a stated intention to renegotiate or repudiate existing sovereign debt despite adequate fiscal resources, would be classified primarily as a deterioration in the sovereign's:",
        ["monetary flexibility.", "willingness to pay.", "foreign reserve adequacy."],
        1,
        "Une décision politique de répudier ou renégocier une dette malgré la capacité budgétaire de la payer reflète une baisse de la volonté de payer (facteur institutionnel/politique), pas un manque de capacité financière (qui relèverait de la flexibilité budgétaire ou monétaire).",
      ],
      // Concept 5 — Key rate duration
      [
        "Key rate duration is most useful for measuring a bond's price sensitivity to:",
        [
          "a parallel shift across the entire yield curve.",
          "a change in the yield at one specific maturity point on the curve, holding all other points constant.",
          "changes in the issuer's credit spread only.",
        ],
        1,
        "La key rate duration isole la sensibilité du prix d'un bond (ou portefeuille) à un changement de yield à UN seul point de la courbe (ex : le taux à 5 ans), les autres maturités restant fixes — utile pour analyser des mouvements non parallèles (steepening/flattening), contrairement à une mesure de duration globale unique.",
      ],
      [
        "Key rate duration is most useful when comparing two bonds (or portfolios) that have:",
        [
          "identical cash flow timing and the same overall duration.",
          "different cash flow timing across maturities, even if their overall (single) durations are similar.",
          "no interest rate risk at all.",
        ],
        1,
        "Deux bonds/portefeuilles peuvent partager la même duration globale mais avoir une répartition des cash flows très différente (ex : structure barbell vs bullet) — la key rate duration le révèle en montrant la sensibilité de chacun à des points spécifiques de la courbe, ce qu'une mesure de duration globale unique ne peut pas distinguer.",
      ],
      [
        "If two bonds have exactly the same cash flow dates and amounts (and thus the same maturity structure), their key rate durations, compared to using a single overall duration measure, would most likely:",
        [
          "provide meaningfully different information, since key rate duration is always more precise.",
          "provide little additional information, since a single duration measure is sufficient when cash flow timing is identical.",
          "be undefined, since key rate duration cannot be computed for identical bonds.",
        ],
        1,
        "Quand deux instruments ont une répartition de cash flows identique, ils réagiront de façon identique à n'importe quel point de la courbe — la granularité supplémentaire de la key rate duration apporte donc peu de valeur par rapport à une mesure de duration globale unique dans ce cas précis ; elle est surtout utile quand la répartition des cash flows DIFFÈRE entre instruments.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Fixed Income Page 5...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
