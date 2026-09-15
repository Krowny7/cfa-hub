// Variantes (2 par question) pour "Mock A — Session 1 — Économie".
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Mocks Officiels (Système)";

const QUIZ_SETS = [
  {
    title: "Mock A — Session 1 — Économie — Variantes",
    difficulty: 2,
    questions: [
      // Q29 — perfect competition optimal firm size
      [
        "Under perfect competition, in the long run, a firm's equilibrium output level converges to the point where average cost is:",
        [
          "at its minimum on the long-run average total cost curve.",
          "at its minimum on the short-run average variable cost curve.",
          "above the minimum efficient scale, since firms retain some pricing power.",
        ],
        0,
        "The minimum point on the long-run average total cost (LRAC) curve is the minimum efficient scale — the optimal firm size under perfect competition in the long run, since competitive pressure drives firms to that point rather than the short-run AVC curve, and no firm retains pricing power under perfect competition.",
      ],
      [
        "The 'minimum efficient scale' in a perfectly competitive market refers to the:",
        [
          "output level that maximizes short-run profit.",
          "output level that minimizes long-run average total cost.",
          "smallest output level at which a firm can operate at all.",
        ],
        1,
        "Minimum efficient scale is the output level at the minimum point of the long-run average total cost curve — the optimal (lowest-average-cost) firm size that perfectly competitive firms converge to in the long run, not simply the smallest viable output or a short-run profit-maximizing point.",
      ],
      // Q31 — HHI computation / vs concentration ratio
      [
        "A market has three firms with market shares of 40%, 35%, and 25%. The Herfindahl–Hirschman Index (HHI) for this market is closest to:",
        ["0.345.", "0.625.", "3,450."],
        0,
        "HHI = 0.40² + 0.35² + 0.25² = 0.16 + 0.1225 + 0.0625 = 0.345. 0.625 wrongly combines the two largest firms' shares before squaring; 3,450 comes from squaring the raw percentage numbers (40²+35²+25²) without converting to decimals first.",
      ],
      [
        "Compared to the concentration ratio, the Herfindahl–Hirschman Index (HHI) is generally considered a better measure of market concentration mainly because it:",
        [
          "accounts for the price elasticity of demand in the market.",
          "gives more weight to larger firms by squaring market shares, capturing the effect of mergers among top incumbents.",
          "explicitly considers the likelihood of new firms entering the market.",
        ],
        1,
        "By squaring each firm's market share before summing, the HHI is much more sensitive to changes among the largest incumbents (e.g., a merger between the top two firms) than the concentration ratio, which can barely move even after such a merger. Neither measure accounts for demand elasticity or the threat of entry.",
      ],
      // Q32 — real exchange rate
      [
        "The real exchange rate of a currency, unlike the nominal exchange rate, is best described as:",
        [
          "an index used to assess a currency's real purchasing power and a country's competitiveness, not something quoted or traded in FX markets.",
          "a rate directly quoted and traded by commercial banks in the interbank market.",
          "always equal to the nominal exchange rate, adjusted only for interest rate differentials.",
        ],
        0,
        "Real exchange rates are not quoted or traded in FX markets — they are analytical indexes used to gauge a currency's real purchasing power and an economy's international competitiveness, built by adjusting the nominal exchange rate for relative price levels (not interest rate differentials).",
      ],
      [
        "A real exchange rate index for a country's currency can most appropriately be constructed:",
        [
          "only relative to the US dollar.",
          "relative to a single foreign currency or a basket of foreign currencies, adjusted for relative price levels.",
          "using nominal exchange rates only, without any price-level adjustment.",
        ],
        1,
        "A real exchange rate can be built for the domestic currency relative to a single foreign currency or a trade-weighted basket of currencies, adjusting the nominal rate for the relative price levels (inflation differentials) between the countries involved — not simply the raw nominal rate.",
      ],
      // Q34 — forward points calculation
      [
        "An analyst gathers the following information: USD/GBP spot exchange rate 1.2500; USD 12-month risk-free rate 3.0%; GBP 12-month risk-free rate 1.0%. USD/GBP is the amount of USD per 1 GBP. The USD/GBP 12-month forward points are closest to:",
        ["–248.", "25.", "248."],
        2,
        "Forward rate = 1.2500 × (1.03/1.01) ≈ 1.2748. Forward points = (1.2748 – 1.2500) × 10,000 ≈ 248. Using the interest rates in the wrong order (foreign over domestic) gives ≈ –248; scaling by 1,000 instead of 10,000 gives ≈ 25.",
      ],
      [
        "An analyst gathers the following information: CHF/GBP spot exchange rate 1.1500; CHF 12-month risk-free rate 0.8%; GBP 12-month risk-free rate 4.5%. CHF/GBP is the amount of CHF per 1 GBP. The CHF/GBP 12-month forward points are closest to:",
        ["–407.", "–41.", "421."],
        0,
        "Forward rate = 1.1500 × (1.008/1.045) ≈ 1.1093. Forward points = (1.1093 – 1.1500) × 10,000 ≈ –407. Scaling by 1,000 instead of 10,000 gives ≈ –41; using the interest rates in the wrong order (foreign over domestic) gives a positive value of ≈ 421.",
      ],
      // Q40 — monetary transmission mechanism
      [
        "A central bank's policy rate change is most likely first transmitted through the economy via which of the following channels?",
        ["Government budget deficits.", "Asset prices.", "The level of national household savings."],
        1,
        "A policy rate change works through the economy via four interrelated channels: bank lending rates, asset prices, agents' expectations, and exchange rates. Government budget deficits and the savings rate are outcomes further down the causal chain, not initial transmission channels.",
      ],
      [
        "Which of the following is NOT one of the recognized channels through which a central bank's policy rate is transmitted through the economy?",
        ["Government tax policy.", "Bank lending rates.", "Exchange rates."],
        0,
        "The recognized transmission channels are bank lending rates, asset prices, agents' expectations, and exchange rates — government tax policy is a fiscal policy tool, not a channel of monetary policy transmission.",
      ],
      // Q46 — fiscal/monetary policy mix and sector shares
      [
        "If wages and prices are rigid, which combination of policies most likely leads to an increase in the public sector's share of aggregate demand relative to the private sector?",
        [
          "Tight fiscal policy and easy monetary policy.",
          "Easy fiscal policy and tight monetary policy.",
          "Easy fiscal policy and easy monetary policy.",
        ],
        1,
        "An expansionary (easy) fiscal policy directly raises government spending's share of output, while a tight monetary policy raises interest rates and dampens private-sector borrowing and spending — together shifting the composition of aggregate demand toward the public sector. Tight fiscal + easy monetary does the opposite (private sector grows relatively), and easy + easy is highly expansionary for both sectors without a clear compositional shift.",
      ],
      [
        "Under rigid wages and prices, an easy fiscal policy combined with a tight monetary policy will most likely result in:",
        [
          "lower interest rates and private-sector-led growth.",
          "higher aggregate output, higher interest rates, and a public sector that grows as a larger share of national income.",
          "a shrinking public sector relative to GDP.",
        ],
        1,
        "Expansionary fiscal policy raises output, while the accompanying tight monetary policy (to offset inflationary pressure) raises interest rates, crowding out some private investment — the net effect is higher output, higher rates, and government spending becoming a larger share of national income, not a shrinking public sector.",
      ],
      // Q49 — monopolistic competition output vs cost-minimizing level
      [
        "In monopolistic competition, a firm's long-run equilibrium output level, compared to the output level that minimizes average cost, is:",
        ["higher.", "equal.", "lower."],
        2,
        "Unlike perfect competition, monopolistically competitive firms reach long-run equilibrium at an output level below the cost-minimizing level — equilibrium sits at a higher point on the average cost curve (i.e., a lower output) than the minimum-efficient-scale output.",
      ],
      [
        "Unlike firms in perfect competition, firms in monopolistic competition operate in long-run equilibrium at a point where average cost is:",
        [
          "exactly at its minimum, just like in perfect competition.",
          "above its minimum, since equilibrium output is below the cost-minimizing level.",
          "below its minimum, since firms overproduce relative to demand.",
        ],
        1,
        "Monopolistically competitive firms' long-run equilibrium sits at a higher point on the average cost curve than the minimum — i.e., they produce less than the output that would minimize average cost, unlike perfectly competitive firms, which converge exactly to that minimum.",
      ],
      // Q52 — tariffs/export subsidies and the budget deficit
      [
        "All else being equal, a government's budget deficit is most likely increased after the introduction of:",
        ["a tariff on imported goods.", "an export subsidy.", "both a tariff and an export subsidy."],
        1,
        "An export subsidy is a payment made by the government for each unit exported, which increases government spending and widens the budget deficit. A tariff, by contrast, is a tax on imports that raises government revenue and would reduce the deficit, all else equal.",
      ],
      [
        "Which of the following government actions is most likely to reduce a budget deficit, all else equal?",
        [
          "Introducing an export subsidy.",
          "Imposing a tariff on imported goods.",
          "Simultaneously imposing a tariff and introducing an export subsidy.",
        ],
        1,
        "A tariff raises government revenue by taxing imports, reducing the budget deficit, all else equal. An export subsidy does the opposite (it's a government payment, widening the deficit); combining both makes the net effect ambiguous rather than clearly deficit-reducing.",
      ],
      // Q57 — expansionary fiscal policy example
      [
        "Which of the following is an example of expansionary fiscal policy?",
        [
          "A reduction in the central bank's policy interest rate.",
          "A cut in personal income tax rates.",
          "An increase in bank reserve requirements.",
        ],
        1,
        "Cutting income tax rates is a fiscal policy tool aimed at boosting aggregate demand by raising households' after-tax income. Changing the policy rate or reserve requirements are monetary policy tools implemented by the central bank, not fiscal policy.",
      ],
      [
        "Which of the following actions is a monetary policy tool, rather than a fiscal policy tool?",
        [
          "An increase in public infrastructure spending.",
          "A cut in the corporate tax rate.",
          "Open market purchases of government securities by the central bank.",
        ],
        2,
        "Open market operations (buying/selling government securities) are a core monetary policy tool used by the central bank to influence bank reserves and interest rates. Infrastructure spending and tax cuts are both fiscal policy tools implemented by the government.",
      ],
      // Q63 — neutral policy rate
      [
        "The neutral policy rate for an economy is best described as the sum of the real trend rate of economic growth and the:",
        ["short-term unemployment rate.", "long-term inflation target.", "current account balance as a share of GDP."],
        1,
        "Neutral rate = real trend growth rate + long-term inflation target. It is not directly a function of the unemployment rate or the current account balance, which are separate macroeconomic indicators.",
      ],
      [
        "A central bank estimates its economy's real trend growth rate at 2.0% and targets long-term inflation of 2.5%. The neutral policy rate is closest to:",
        ["2.0%.", "2.5%.", "4.5%."],
        2,
        "Neutral rate = trend growth + inflation target = 2.0% + 2.5% = 4.5%. 2.0% and 2.5% each reflect only one of the two components, not their sum.",
      ],
      // Q74 — geopolitics financial vs economic tools
      [
        "With respect to geopolitics, which of the following is best described as a cooperative economic (rather than financial) tool?",
        [
          "A multilateral trade agreement.",
          "Free exchange of currencies across borders.",
          "Unrestricted cross-border foreign direct investment flows.",
        ],
        0,
        "Multilateral trade agreements and common markets are examples of cooperative economic tools among states. Free currency exchange and open cross-border investment flows are classified as cooperative financial tools instead.",
      ],
      [
        "Which of the following is best described as a cooperative financial tool between states, as opposed to an economic tool?",
        [
          "A common market.",
          "Allowing free exchange of currencies and foreign investment across borders.",
          "A multilateral trade agreement.",
        ],
        1,
        "Cooperative financial tools include the free exchange of currencies across borders and allowing foreign investment. Common markets and multilateral trade agreements are instead classified as cooperative economic tools.",
      ],
      // Q77 — globalization driver
      [
        "Globalization is primarily driven by cooperation among:",
        [
          "national governments only, through political treaties.",
          "non-state actors such as corporations, individuals, and organizations, through economic and financial cooperation.",
          "international courts, through binding legal rulings.",
        ],
        1,
        "Globalization results from economic and financial cooperation, carried out mostly by non-state actors (corporations, individuals, organizations) — political cooperation/non-cooperation is a separate lens used mainly to analyze state (government) actors.",
      ],
      [
        "Which of the following best explains the primary driver of globalization?",
        [
          "Political cooperation between national governments.",
          "Military alliances between neighboring countries.",
          "Economic and financial cooperation, carried out mostly by non-state actors.",
        ],
        2,
        "Globalization is the result of economic and financial cooperation, carried out predominantly by non-state actors such as corporations, individuals, and organizations — not primarily a function of intergovernmental political cooperation or military alliances.",
      ],
      // Q79 — credit cycles vs business cycles
      [
        "Compared to business cycles, credit cycles tend to be:",
        ["shorter, but similarly deep.", "identical in length, though less predictable.", "longer, and often deeper and sharper."],
        2,
        "Credit cycles tend to be longer, deeper, and sharper than business cycles — although business cycle length varies from peak to trough, the average credit cycle is typically found to be longer than the average business cycle.",
      ],
      [
        "Which of the following statements about credit cycles is most accurate?",
        [
          "Credit cycles always peak and trough at exactly the same time as business cycles.",
          "Credit cycles are typically longer, deeper, and sharper than business cycles.",
          "Credit cycles are generally shorter and milder than business cycles.",
        ],
        1,
        "Credit cycles tend to run longer than business cycles and are often deeper and sharper in amplitude — they are related to, but distinct from, business cycles, and do not necessarily turn at the same points in time.",
      ],
      // Q82 — expansionary fiscal policy least likely
      [
        "An expansionary fiscal policy is least likely to include an increase in:",
        ["personal income tax rates.", "government infrastructure spending.", "the fiscal budget deficit."],
        0,
        "An expansionary fiscal policy means the government increases spending and/or cuts tax rates to boost aggregate demand — raising tax rates works against that goal. A rise in the budget deficit and in infrastructure spending are both consistent with (and typical of) an expansionary stance.",
      ],
      [
        "Which of the following would NOT typically be part of an expansionary fiscal policy stance?",
        [
          "Increasing spending on public infrastructure.",
          "Allowing the budget deficit to widen.",
          "Raising the corporate tax rate.",
        ],
        2,
        "Raising the corporate tax rate reduces after-tax income and works against the goal of boosting aggregate demand — the opposite of an expansionary fiscal stance. Increased infrastructure spending and a wider deficit are both hallmarks of expansionary fiscal policy.",
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
