// Variantes (2 par question) pour "Mock A — Session 1 — Économie".
//
// Règle de conception : une variante ne rejoue pas l'énoncé d'origine avec
// d'autres chiffres. Pour chaque question source on produit
//   (a) un ANGLE DIFFÉRENT — on inverse l'inconnue, on compare deux cas, on
//       diagnostique une erreur, ou on applique le concept ailleurs ;
//   (b) une MONTÉE EN DIFFICULTÉ — une étape de plus, un repère retiré, ou la
//       combinaison de deux notions.
// Les distracteurs correspondent à des erreurs réellement commises.
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Mocks Officiels (Système)";

const QUIZ_SETS = [
  {
    title: "Mock A — Session 1 — Économie — Variantes",
    difficulty: 2,
    questions: [
      // ---- Q29 — taille optimale de la firme en concurrence pure --------
      // (a) angle : le lien entre prix d'équilibre de long terme et coût minimum
      [
        "Under perfect competition, in long-run equilibrium, the market price will converge to a level equal to firms':",
        [
          "minimum long-run average total cost.",
          "minimum short-run average variable cost.",
          "long-run marginal revenue, which exceeds average cost by the amount of economic profit.",
        ],
        0,
        "Free entry and exit drive economic profit to zero in the long run, so price settles where P = minimum long-run average total cost (LRAC) = marginal cost — the minimum efficient scale. The short-run AVC curve governs the shutdown decision, not the long-run price level, and long-run economic profit is zero by construction, so there is no gap between marginal revenue and average cost to speak of.",
      ],
      // (b) difficulté : réaction de long terme à un choc de demande
      [
        "A perfectly competitive industry is in long-run equilibrium when industry demand permanently increases. Assuming the industry is not subject to significant economies or diseconomies of scale at the industry level, the most likely long-run adjustment is that:",
        [
          "existing firms each expand output well beyond the minimum efficient scale, and price settles above minimum LRAC.",
          "new firms enter, industry output rises mainly through more firms each producing at the minimum efficient scale, and price returns to minimum LRAC.",
          "the number of firms stays fixed, and price permanently exceeds minimum LRAC because entry is not possible in perfect competition.",
        ],
        1,
        "Perfect competition assumes free entry, so a permanent rise in demand raises price and short-run profits, which attracts new entrants until economic profit is again zero. In the new long-run equilibrium each firm — new or existing — still produces at the minimum efficient scale (minimum LRAC), and the extra industry output comes from a larger number of firms rather than each firm growing past that efficient scale.",
      ],

      // ---- Q31 — HHI et ratio de concentration ---------------------------
      // (a) angle : appliquer la formule du ratio de concentration, pas du HHI
      [
        "A market has five firms with market shares of 35%, 25%, 20%, 12%, and 8%. The three-firm concentration ratio (CR3) for this market is closest to:",
        ["60%.", "80%.", "92%."],
        1,
        "CR3 sums the market shares of the three largest firms: 35% + 25% + 20% = 80%. 60% mistakenly adds only the two largest firms; 92% mistakenly includes a fourth firm (35% + 25% + 20% + 12%), confusing CR3 with CR4.",
      ],
      // (b) difficulté : combiner HHI, fusion et comparaison avec le CR
      [
        "A market has five firms with shares of 35%, 25%, 20%, 12%, and 8%. The two largest firms merge into a single firm with a 60% share, while the other three firms' shares are unchanged. The percentage increase in the HHI caused by the merger is closest to:",
        ["15%.", "17%.", "71%."],
        2,
        "HHI before the merger is 0.35² + 0.25² + 0.20² + 0.12² + 0.08² = 0.2458. After the merger it is 0.60² + 0.20² + 0.12² + 0.08² = 0.4208, an increase of (0.4208 – 0.2458) / 0.2458 ≈ 71%. 17% mistakes the absolute change in the index (0.1750) for a percentage; 15% is instead the percentage change in the three-firm concentration ratio (80% to 92%), which moves far less than the HHI — exactly the disadvantage of the concentration ratio that this merger illustrates.",
      ],

      // ---- Q32 — taux de change réel -------------------------------------
      // (a) angle : appliquer la formule plutôt que la définir
      [
        "The nominal CAD/EUR exchange rate is 1.5000 (CAD per EUR). Canada's CPI is 108 and the Eurozone's CPI is 104, both indexed to the same base period. The real CAD/EUR exchange rate is closest to:",
        ["1.5000.", "1.4444.", "1.5577."],
        1,
        "The real exchange rate adjusts the nominal rate for relative price levels: real (d/f) = nominal (d/f) × CPI_f / CPI_d = 1.5000 × 104/108 ≈ 1.4444. 1.5000 simply ignores the price-level adjustment altogether; 1.5577 inverts the CPI ratio (CPI_d / CPI_f instead of CPI_f / CPI_d).",
      ],
      // (b) difficulté : construire un indice sur un panier de devises
      [
        "An analyst constructs a trade-weighted real exchange rate index for a country's currency against two trading partners. Partner A carries a 60% trade weight and has a bilateral real exchange rate index of 98; Partner B carries a 40% trade weight and has a bilateral real exchange rate index of 106. The trade-weighted real effective exchange rate index is closest to:",
        ["102.0.", "101.2.", "102.8."],
        1,
        "A real exchange rate constructed relative to a basket of currencies is a weighted average of the bilateral real rates, using each partner's trade weight: (0.60 × 98) + (0.40 × 106) = 58.8 + 42.4 = 101.2. 102.0 uses a simple (unweighted) average of the two indexes instead of the trade weights; 102.8 applies the two trade weights to the wrong partners.",
      ],

      // ---- Q34 — points de terme --------------------------------------
      // (a) angle : inverser l'inconnue — retrouver un taux d'intérêt
      [
        "An analyst gathers the following information: AUD/USD spot exchange rate 1.5000; AUD 12-month risk-free rate 4.0%; AUD/USD is the amount of AUD per 1 USD. The 12-month AUD/USD forward points are quoted at 220. The USD 12-month risk-free rate implied by this forward quote is closest to:",
        ["5.5%.", "6.2%.", "2.5%."],
        2,
        "The forward rate is 1.5000 + 220/10,000 = 1.5220. Since the forward rate equals spot × (1 + r_AUD) / (1 + r_USD), solving gives 1 + r_USD = 1.5000 × 1.04 / 1.5220 ≈ 1.0250, so r_USD ≈ 2.5%. Putting the interest rates on the wrong side of the ratio (inverting which currency is domestic) gives ≈ 5.5%; simply adding the point differential (2.2%) to the AUD rate without accounting for the compounding relationship gives 6.2%.",
      ],
      // (b) difficulté : calcul des points ET interprétation prime/décote
      [
        "An analyst gathers the following information: CHF/USD spot exchange rate 0.9000; CHF 12-month risk-free rate 1.5%; USD 12-month risk-free rate 5.0%; CHF/USD is the amount of CHF per 1 USD. The 12-month CHF/USD forward points, and the resulting forward premium/discount on the USD against the CHF, are closest to:",
        [
          "–300, so USD trades at a forward premium against CHF.",
          "310, so USD trades at a forward premium against CHF.",
          "–300, so USD trades at a forward discount against CHF.",
        ],
        2,
        "Forward rate = 0.9000 × (1.015/1.05) = 0.8700, so forward points = (0.8700 – 0.9000) × 10,000 = –300. Under covered interest rate parity the currency with the higher interest rate (USD, at 5.0%) must trade at a forward discount to prevent arbitrage, which matches the negative points. Pairing –300 with 'premium' gets the sign of the interpretation backwards; +310 comes from putting the interest rates in the wrong order in the parity ratio, which would incorrectly suggest USD trades at a premium.",
      ],

      // ---- Q40 — mécanisme de transmission monétaire ---------------------
      // (a) angle : distinguer un canal d'un objectif final
      [
        "Which of the following is most accurately described as an ultimate goal of monetary policy, rather than one of the channels through which a policy rate change is transmitted through the economy?",
        ["Inflation.", "Bank lending rates.", "Exchange rates."],
        0,
        "The policy rate is transmitted through four interrelated channels: bank lending rates, asset prices, agents' expectations, and exchange rates. Inflation is not itself one of these channels — it is the ultimate macroeconomic outcome that the transmission mechanism, acting through those channels, is meant to influence.",
      ],
      // (b) difficulté : identifier deux canaux à partir d'un scénario
      [
        "A central bank raises its policy rate. As a result, banks raise the interest rates they charge on new mortgages and business loans, while at the same time the present value of equities and real estate falls because their expected cash flows are discounted at a higher rate. These two effects correspond, respectively, to which transmission channels?",
        [
          "Exchange rates; agents' expectations.",
          "Agents' expectations; bank lending rates.",
          "Bank lending rates; asset prices.",
        ],
        2,
        "Higher rates on new loans is the bank lending rate channel acting directly. The fall in the present value of equities and real estate, driven by a higher discount rate applied to future cash flows, is the asset price channel. Agents' expectations and exchange rates are the other two channels, but neither matches the two effects described here.",
      ],

      // ---- Q46 — mix budgétaire/monétaire et parts sectorielles ---------
      // (a) angle : diagnostiquer le mix de politiques à partir de son effet
      [
        "Wages and prices are rigid. Following a change in the fiscal-monetary policy mix, interest rates fall and the private sector's share of aggregate demand rises relative to the public sector's. This outcome is most consistent with:",
        [
          "tight fiscal policy combined with easy monetary policy.",
          "easy fiscal policy combined with tight monetary policy.",
          "easy fiscal policy combined with easy monetary policy.",
        ],
        0,
        "A fiscal contraction reduces the public sector's claim on output, while an accompanying monetary easing lowers interest rates and stimulates private borrowing and spending — together shifting the composition of aggregate demand toward the private sector, exactly as described. Easy fiscal with tight monetary would do the opposite (the public sector's share rises, rates rise), and easy fiscal with easy monetary stimulates both sectors without a clear compositional shift toward the private sector.",
      ],
      // (b) difficulté : combiner deux effets attendus (taux et composition)
      [
        "Wages and prices are rigid. A central bank pursues tight monetary policy while the government simultaneously runs an easy fiscal policy. Compared with a scenario of a neutral fiscal-monetary mix, this combination is most likely to result in interest rates that are ______ and a public-sector share of GDP that is ______.",
        ["higher; lower.", "lower; higher.", "higher; higher."],
        2,
        "Tight monetary policy pushes interest rates higher than under a neutral stance, while easy fiscal policy raises government spending and/or cuts taxes, increasing the public sector's share of GDP. Both effects point the same way here: higher interest rates and a larger public-sector share, with the higher rates also crowding out some private investment along the way.",
      ],

      // ---- Q49 — concurrence monopolistique et coût moyen minimal --------
      // (a) angle : comparer à la concurrence pure via la notion de surcapacité
      [
        "Compared with a perfectly competitive firm in long-run equilibrium, a monopolistically competitive firm in long-run equilibrium most likely produces at:",
        [
          "a higher output, closer to the cost-minimizing scale.",
          "a lower output, below the cost-minimizing scale — a situation described as excess capacity.",
          "the same output, since both types of firms earn zero economic profit in the long run.",
        ],
        1,
        "Because each monopolistically competitive firm faces a downward-sloping demand curve tangent to its average cost curve, long-run equilibrium occurs to the left of the minimum-average-cost point — firms produce less than the cost-minimizing output, a condition known as excess capacity. A perfectly competitive firm, by contrast, is pushed by competition exactly to the minimum of its average cost curve. Zero economic profit holds for both market structures, but it does not imply the same output level.",
      ],
      // (b) difficulté : combiner la relation prix/coût marginal et le coût moyen
      [
        "In long-run equilibrium under monopolistic competition, which of the following relationships most likely holds, where P is price, MC is marginal cost, and AC is average cost?",
        [
          "P = MC = minimum AC, exactly as in perfect competition.",
          "P = AC, but AC is above its minimum, and P > MC.",
          "P < AC, and P = MC.",
        ],
        1,
        "Zero economic profit in the long run requires P = AC, but because the firm's downward-sloping demand curve is tangent to the AC curve at an output below the minimum-cost point, that AC is above its minimum — the excess-capacity result. Because the demand curve slopes downward, marginal revenue lies below price at the profit-maximizing quantity, so P > MC as well, unlike the P = MC = minimum AC outcome that holds under perfect competition.",
      ],

      // ---- Q52 — tarifs, subventions et déficit budgétaire ---------------
      // (a) angle : appliquer le même principe à une subvention domestique
      [
        "Which of the following government actions is least likely to increase a budget deficit, all else equal?",
        [
          "Granting a subsidy to domestic exporters.",
          "Imposing a tariff on imported steel.",
          "Granting a subsidy to domestic producers competing with steel imports.",
        ],
        1,
        "A tariff is a tax on imports and raises government revenue, all else equal reducing the deficit. A subsidy is a government payment regardless of whether it targets exporters or import-competing domestic producers — both are outlays that widen the deficit. The principle is the same as for export subsidies: it is the direction of the cash flow (revenue in versus payment out) that determines the effect on the deficit, not which industry receives it.",
      ],
      // (b) difficulté : combiner un tarif et une subvention et calculer l'effet net
      [
        "A government simultaneously imposes a new tariff on imported automobiles, expected to raise $2 billion in annual revenue, and introduces a new subsidy for domestic renewable-energy exporters, expected to cost $3 billion annually. All else equal, the net first-order effect on the government's budget deficit is most likely a:",
        [
          "$1 billion narrowing of the deficit.",
          "$5 billion widening of the deficit.",
          "$1 billion widening of the deficit.",
        ],
        2,
        "The tariff raises $2 billion in revenue, reducing the deficit by that amount, while the subsidy costs $3 billion, increasing the deficit; netting the two opposite-signed effects gives a $1 billion net widening (–$2 billion + $3 billion). Reversing the sign of the net effect gives a $1 billion narrowing; treating both changes as if they widened the deficit (instead of netting the tariff's offsetting effect) gives $5 billion.",
      ],

      // ---- Q57 — politique budgétaire expansionniste -----------------------
      // (a) angle : distinguer les effets attendus, pas seulement l'outil
      [
        "A government increases spending on infrastructure projects, funded by new borrowing, while the central bank holds its policy rate unchanged. All else equal, this policy combination is most likely to result in:",
        [
          "higher aggregate demand and a wider budget deficit, with no direct change in the monetary policy stance.",
          "higher aggregate demand and a narrower budget deficit, because infrastructure spending pays for itself.",
          "lower aggregate demand, because the new government borrowing crowds out private investment one-for-one.",
        ],
        0,
        "New infrastructure spending funded by borrowing is a straightforward expansionary fiscal action: it raises aggregate demand and, since it is debt-financed rather than tax-financed, widens the budget deficit, while the unchanged policy rate means monetary policy is not directly altered. Infrastructure spending does not finance itself through the resulting activity, and crowding out of private investment is a partial, not typically a complete (one-for-one), offset.",
      ],
      // (b) difficulté : apparier deux politiques, l'une fiscale et l'une monétaire
      [
        "Which of the following pairs consists of one expansionary fiscal policy action and one expansionary monetary policy action?",
        [
          "An increase in the central bank's policy rate; a cut in corporate tax rates.",
          "A reduction in government spending; an increase in bank reserve requirements.",
          "An increase in transfer payments to households; a reduction in the central bank's policy rate.",
        ],
        2,
        "Higher transfer payments to households is an expansionary fiscal action (it boosts disposable income and spending), and a lower policy rate is an expansionary monetary action (it lowers borrowing costs) — the pairing correctly matches one of each. The second option mismatches an expansionary fiscal action (a tax cut) with a contractionary monetary action (a rate hike); the third pairs two contractionary actions, one fiscal and one monetary.",
      ],

      // ---- Q63 — taux directeur neutre -------------------------------------
      // (a) angle : inverser l'inconnue — retrouver la croissance tendancielle
      [
        "A central bank's estimated neutral policy rate is 5.0%, and the economy's long-term inflation target is 2.0%. The real trend rate of economic growth implied by these figures is closest to:",
        ["2.5%.", "3.0%.", "7.0%."],
        1,
        "The neutral policy rate equals the real trend rate of growth plus the long-term inflation target, so the trend growth rate is 5.0% – 2.0% = 3.0%. 2.5% wrongly averages the two figures instead of subtracting; 7.0% wrongly adds them, which would only make sense if solving for the neutral rate itself rather than one of its components.",
      ],
      // (b) difficulté : combiner le calcul du taux neutre et le diagnostic de la politique
      [
        "An economy's real trend growth rate is 2.5% and its long-term inflation target is 2.0%. If the central bank's actual current policy rate is 3.0%, monetary policy is most likely:",
        [
          "restrictive (tight), because the policy rate exceeds the real trend growth rate.",
          "accommodative (easy), because the policy rate is below the neutral policy rate.",
          "neutral, because the policy rate is positive in real terms.",
        ],
        1,
        "The neutral policy rate is 2.5% + 2.0% = 4.5%. Comparing the actual policy rate of 3.0% against that benchmark, the policy rate sits below the neutral rate, which characterizes monetary policy as accommodative (stimulative) rather than neutral or restrictive. Comparing the policy rate only to the trend growth rate, and ignoring the inflation-target component of the neutral rate, is the wrong benchmark for classifying the stance.",
      ],

      // ---- Q74 — outils géopolitiques -------------------------------------
      // (a) angle : appliquer la même taxonomie au pôle conflictuel
      [
        "With respect to geopolitics, freezing a foreign government's central bank reserves held domestically is best described as a:",
        ["conflictual financial tool.", "cooperative financial tool.", "conflictual trade tool."],
        0,
        "Freezing another state's reserves operates on the financial dimension — the same dimension as the free exchange of currencies and open foreign investment — but at the conflictual rather than cooperative end of the spectrum, alongside actions such as sanctions and asset seizures. It is not a trade tool, since it does not restrict the flow of goods and services directly.",
      ],
      // (b) difficulté : évaluer deux appariements outil/catégorie à la fois
      [
        "Consider the following two statements about geopolitical tools:\nI. A multilateral free-trade agreement is a cooperative trade tool.\nII. Restricting a country's access to international payment systems is a conflictual financial tool.\nWhich of the statements is (are) correctly matched?",
        ["Only I.", "Only II.", "Both I and II."],
        2,
        "A multilateral free-trade agreement is a cooperative tool operating on the trade dimension, matching statement I. Restricting access to international payment systems targets the flow of money rather than goods, so it operates on the financial dimension, and being a restriction rather than an opening, it sits at the conflictual end of that dimension — matching statement II as well. Both statements correctly pair the tool with its dimension (trade vs. financial) and its position (cooperative vs. conflictual).",
      ],

      // ---- Q77 — moteur de la mondialisation -------------------------------
      // (a) angle : diagnostiquer le moteur à partir d'un exemple concret
      [
        "Over the past three decades, multinational corporations have built extensive cross-border supply chains largely independent of formal intergovernmental treaties. This trend most directly illustrates that globalization is primarily driven by:",
        [
          "non-state actors engaging in economic and financial cooperation.",
          "national governments negotiating political treaties.",
          "international organizations imposing binding regulations on member states.",
        ],
        0,
        "Cross-border supply chains built by corporations, without requiring formal treaties between governments, exemplify the point that globalization results mainly from economic and financial cooperation carried out by non-state actors — companies, individuals, and organizations — rather than from intergovernmental political action.",
      ],
      // (b) difficulté : distinguer le moteur principal d'un facteur secondaire
      [
        "Globalization is primarily the result of economic and financial cooperation carried out by non-state actors. The degree of political cooperation among national governments, by contrast, is best described as a factor that primarily affects:",
        [
          "nothing, since political cooperation is irrelevant to the globalization process.",
          "the fundamental driving force of globalization, superseding economic and financial cooperation.",
          "the pace and sustainability of globalization, rather than being its fundamental driving force.",
        ],
        2,
        "Political cooperation or non-cooperation between states operates alongside, but is distinct from, the economic and financial cooperation that fundamentally drives globalization; a favorable political climate can accelerate and sustain globalization, while political friction can slow or reverse it, without political cooperation itself being the primary engine of the process.",
      ],

      // ---- Q79 — cycles de crédit vs cycles économiques --------------------
      // (a) angle : diagnostiquer le phénomène décrit
      [
        "An economist observes that over the past 15 years, swings in the availability and price of credit have been larger in amplitude and have persisted longer than the corresponding swings in real GDP growth. This observation is most consistent with the well-documented tendency of:",
        [
          "credit cycles to be longer, deeper, and sharper than business cycles.",
          "credit cycles to be shorter and shallower than business cycles.",
          "credit and business cycles to be perfectly synchronized in both length and amplitude.",
        ],
        0,
        "This description matches the standard characterization of credit cycles relative to business cycles: credit cycles tend to run longer and to show sharper, deeper swings than the underlying business cycle, even though the two are related and interact with each other.",
      ],
      // (b) difficulté : tirer une implication logique de cette relation de durée
      [
        "Because credit cycles tend to be longer than business cycles, a single credit cycle will most likely:",
        [
          "always begin and end at exactly the same time as a single business cycle.",
          "be entirely contained within a single phase (expansion or contraction) of one business cycle.",
          "span more than one business cycle, so credit-cycle and business-cycle turning points need not coincide.",
        ],
        2,
        "If a credit cycle typically lasts longer on average than a business cycle, then over its course the economy can pass through more than one shorter business-cycle expansion and contraction — meaning the peaks and troughs of the two cycles are not required to line up. The reverse claim, that a credit cycle fits inside a single phase of one (necessarily shorter) business cycle, is inconsistent with the premise that credit cycles are the longer of the two.",
      ],

      // ---- Q82 — politique budgétaire expansionniste, exclusion --------
      // (a) angle : inverser vers le cas contractionniste
      [
        "A contractionary fiscal policy is least likely to include a reduction in:",
        ["personal income tax rates.", "government infrastructure spending.", "the fiscal budget deficit."],
        0,
        "A contractionary fiscal policy aims to reduce aggregate demand through lower government spending and/or higher tax rates, so it would not include a reduction in tax rates — cutting tax rates is an expansionary, not contractionary, action. A shrinking budget deficit and reduced infrastructure spending are both hallmarks of a contractionary fiscal stance.",
      ],
      // (b) difficulté : combiner deux mesures et calculer l'effet net
      [
        "A government cuts personal income tax rates, reducing annual tax revenue by $10 billion, while simultaneously cutting infrastructure spending by $6 billion. All else equal, the net first-order effect on the government's budget deficit, and the resulting overall fiscal stance, are most likely a:",
        [
          "$4 billion widening of the deficit, and a net expansionary stance, since the tax cut's effect dominates the spending cut's.",
          "$16 billion widening of the deficit, since both changes increase the deficit.",
          "$4 billion narrowing of the deficit, and a net contractionary stance.",
        ],
        0,
        "The tax cut reduces revenue by $10 billion, widening the deficit, while the spending cut reduces outlays by $6 billion, narrowing it; netting the two opposite-signed effects gives a $4 billion net widening (+$10 billion – $6 billion). Since the deficit widens on net, the overall stance is mildly expansionary despite the spending cut. Treating both changes as adding to the deficit (instead of netting the spending cut's offsetting effect) gives $16 billion; reversing the sign of the net effect gives a $4 billion narrowing and the opposite (contractionary) conclusion.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Variantes — Mock A Session 1 — Économie...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
