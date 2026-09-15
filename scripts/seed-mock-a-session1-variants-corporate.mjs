// Variantes (2 par question) pour "Mock A — Session 1 — Finance d'Entreprise"
// — mêmes notions que les 13 questions officielles de cette session, avec
// noms/chiffres/scénarios changés, pour pouvoir s'entraîner sans mémoriser
// la question par cœur.
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Mocks Officiels (Système)";

const QUIZ_SETS = [
  {
    title: "Mock A — Session 1 — Finance d'Entreprise — Variantes",
    difficulty: 2,
    questions: [
      // Q37 — going concern project
      [
        "Which of the following capital investments would most likely be classified as a going concern project?",
        [
          "Building a new factory to enter an entirely new market segment.",
          "Replacing an aging fleet of delivery trucks that have reached the end of their useful life.",
          "Installing new pollution-control equipment mandated by a recently passed environmental law.",
        ],
        1,
        "Going concern (maintenance capex) projects continue current operations at their existing size — replacing worn-out assets is the classic example. Entering a new market is a new-lines-of-business project; complying with new regulation is a regulatory/compliance project.",
      ],
      [
        "A company's continuous, routine upgrade of its existing IT hardware and software to keep operations running smoothly is most likely classified as a:",
        ["going concern project.", "new lines of business project.", "regulatory/compliance project."],
        0,
        "Maintaining IT hardware/software and making continuous improvements to existing facilities are textbook going concern (maintenance capex) projects — they sustain current operations rather than expand into new business or satisfy a new legal requirement.",
      ],
      // Q56 — NPV / discount rate
      [
        "A project has the following annual cash flows: Year 0: –$100,000; Year 1: $40,000; Year 2: $40,000; Year 3: $40,000. Which discount rate most likely provides a positive NPV?",
        ["8%", "12%", "16%"],
        0,
        "NPV at 8% = 40,000/1.08 + 40,000/1.08² + 40,000/1.08³ − 100,000 ≈ 103,084 − 100,000 = +$3,084 (positive). At 12%, NPV ≈ 96,061 − 100,000 = −$3,939 (negative), and it is even more negative at 16% — so only 8% gives a positive NPV.",
      ],
      [
        "A project has the following annual cash flows: Year 0: –$50,000; Years 1-4: $20,000 each year. Which discount rate most likely provides a positive NPV?",
        ["20%", "28%", "35%"],
        0,
        "NPV at 20% = 20,000 × [1 − 1.20⁻⁴]/0.20 − 50,000 ≈ 20,000 × 2.5887 − 50,000 = 51,775 − 50,000 = +$1,775 (positive). At 28% and 35% the annuity factor shrinks enough that NPV turns negative (≈ −$5,183 and −$10,060 respectively).",
      ],
      // Q58 — WACC
      [
        "An analyst gathers the following: Equity $20 million at 9% before-tax cost; Debt $8 million at 5% before-tax cost; Preferred stock $2 million at 6% cost. With a 30% marginal tax rate, the WACC is closest to:",
        ["7.21%.", "7.33%.", "7.73%."],
        1,
        "Weights: we=20/30=0.667, wd=8/30=0.267, wp=2/30=0.067. WACC = wd×rd×(1−t) + wp×rp + we×re = 0.267×5%×0.70 + 0.067×6% + 0.667×9% = 0.933% + 0.400% + 6.000% = 7.33%. 7.73% forgets the tax shield on debt; 7.21% wrongly tax-shields the preferred stock too.",
      ],
      [
        "An analyst gathers the following: Equity $12 million at 10% before-tax cost; Debt $6 million at 4% before-tax cost; Preferred stock $2 million at 7% cost. With a 25% marginal tax rate, the WACC is closest to:",
        ["7.43%.", "7.60%.", "7.90%."],
        1,
        "Weights: we=12/20=0.60, wd=6/20=0.30, wp=2/20=0.10. WACC = 0.30×4%×0.75 + 0.10×7% + 0.60×10% = 0.90% + 0.70% + 6.00% = 7.60%. 7.90% skips the tax shield on debt; 7.43% incorrectly tax-shields the preferred stock as well.",
      ],
      // Q61 — cost of capital requiring tax adjustment
      [
        "Which of the following costs of capital is least likely to require an adjustment for taxes when calculating a firm's WACC?",
        ["A bank loan.", "A corporate bond.", "Preferred stock."],
        2,
        "Only the cost of debt (bank loans, bonds) is tax-adjusted in the WACC formula, because interest expense is tax-deductible. Preferred stock dividends are not tax-deductible, so the cost of preferred stock is used without a tax adjustment.",
      ],
      [
        "A firm's cost of long-term debt must be adjusted for taxes when calculating WACC primarily because:",
        [
          "interest payments on debt are tax-deductible, unlike dividends on equity or preferred stock.",
          "debt is always cheaper than equity.",
          "tax authorities require it regardless of deductibility.",
        ],
        0,
        "Interest is a tax-deductible expense, so the after-tax cost of debt is rd × (1 − t). Dividends (common or preferred) are paid out of after-tax income and are not deductible, so their costs are not tax-adjusted.",
      ],
      // Q64 — stakeholders implementing strategy
      [
        "Which stakeholder group is most likely responsible for approving and overseeing — rather than directly implementing — a public corporation's strategy?",
        ["Managers", "Employees", "Board of directors"],
        2,
        "The board of directors approves strategic direction and oversees management on behalf of shareholders, but day-to-day implementation is carried out by managers (led by the CEO), with employees executing operational tasks under that direction.",
      ],
      [
        "Employees most directly carry out a corporation's day-to-day strategy under the direction of:",
        ["the board of directors.", "managers, led by the chief executive officer.", "the company's shareholders."],
        1,
        "Managers, led by the CEO, are responsible for determining and implementing corporate strategy under the board's oversight; employees execute tasks as directed by management, not directly by the board or shareholders.",
      ],
      // Q65 — organizational forms
      [
        "Which business form most likely provides limited liability to all of its owners while still being taxed as a pass-through entity?",
        ["A limited liability company (LLC).", "A general partnership.", "A public corporation."],
        0,
        "An LLC combines limited liability for all owners (members) with pass-through taxation, avoiding both the unlimited personal liability of a general partnership and the double taxation of a corporation.",
      ],
      [
        "In a general partnership, each partner's liability for the business's obligations is best described as:",
        [
          "limited to the amount each partner invested.",
          "unlimited, extending to each partner's personal assets.",
          "fully protected, similar to a limited liability company.",
        ],
        1,
        "General partners have unlimited liability — creditors can pursue their personal assets, not just their investment in the business. This contrasts with limited partners (who have limited liability) and LLC members (fully limited liability).",
      ],
      // Q67 — life cycle cash flow
      [
        "In which stage of the corporate life cycle does a company typically shift from being a persistent net cash consumer to generating its first — often still volatile — positive cash flows?",
        ["Start-up", "Growth", "Decline"],
        1,
        "In the growth stage, execution and competitive risks decline relative to start-up, and cash flow typically turns positive, becoming more stable as the business matures further — unlike start-up (heavy cash consumption) or decline (shrinking, though often still positive, cash flow).",
      ],
      [
        "A company in the decline stage of its life cycle is most likely to experience:",
        [
          "the highest cash burn rate of any life-cycle stage.",
          "zero revenue and no customer base.",
          "shrinking revenue, though cash flow often remains positive as investment needs fall.",
        ],
        2,
        "In decline, revenue growth slows or reverses, but because reinvestment needs are minimal, cash flow can remain positive — unlike the start-up stage, which is the true high-cash-burn, near-zero-revenue phase.",
      ],
      // Q71 — shareholder/management conflicts
      [
        "A company's board grants senior managers a large stock option package with no shareholder input on its design (no say-on-pay vote). This practice is most likely to:",
        [
          "increase potential conflicts of interest between shareholders and management.",
          "perfectly align management's interests with those of shareholders.",
          "have no effect on the alignment between management and shareholder interests.",
        ],
        0,
        "Without shareholder input (e.g., a say-on-pay vote), directors and managers have more discretion to grant themselves excessive or poorly structured pay, increasing the risk that compensation is misaligned with shareholder interests.",
      ],
      [
        "Compensation structured heavily around short-term stock price performance, combined with no shareholder say-on-pay vote, is most likely to encourage managers to:",
        [
          "take on excessive risk to boost the short-term share price.",
          "act more conservatively than shareholders would prefer.",
          "pursue only projects matching the risk tolerance of a diversified shareholder base.",
        ],
        0,
        "Compensation dominated by short-term stock price incentives (e.g., stock options with near-term vesting) can motivate managers to take on excessive risk, since option holders benefit asymmetrically from upside price moves — a classic shareholder/management conflict of interest.",
      ],
      // Q81 — Modigliani-Miller assumptions
      [
        "Under Modigliani and Miller's original (no-tax) capital structure irrelevance proposition, which assumption allows investors to replicate any capital structure through 'homemade leverage'?",
        [
          "Investors can borrow and lend at the risk-free rate.",
          "Interest expense is tax-deductible.",
          "Investors have heterogeneous expectations about future corporate earnings.",
        ],
        0,
        "MM's 'homemade leverage' argument relies on investors being able to borrow and lend at the risk-free rate in their own accounts, replicating any capital structure the firm might otherwise choose — which is why the firm's own leverage choice becomes irrelevant to value.",
      ],
      [
        "Which of the following is NOT an assumption of the Modigliani-Miller capital structure framework?",
        [
          "Investors have heterogeneous expectations about future corporate earnings.",
          "There are no taxes, transaction costs, or bankruptcy costs.",
          "Investors can borrow and lend at the risk-free rate.",
        ],
        0,
        "MM assumed investors have HOMOGENEOUS (not heterogeneous) expectations about future corporate earnings and their riskiness — along with a world of perfect capital markets (no taxes, transaction costs, bankruptcy costs) and the ability to borrow/lend at the risk-free rate.",
      ],
      // Q83 — B2B channel strategy
      [
        "A company selling highly customized industrial machinery to a small number of large manufacturing clients would most likely rely on a channel strategy of:",
        ["direct sales.", "mass-market retail.", "a traditional multi-tier distribution channel."],
        0,
        "Direct sales is the common strategy in B2B markets where the customer base is small, well-identified, and easily reached directly — as opposed to mass retail or multi-tier distribution, which suit large, dispersed customer bases.",
      ],
      [
        "Compared to a traditional multi-tier distribution channel (manufacturer → wholesaler → retailer → customer), a direct sales strategy is most appropriate when:",
        [
          "the customer base is very large and geographically dispersed.",
          "the customer base is small, easily identified, and directly reachable.",
          "products must pass through several intermediaries to reach end customers.",
        ],
        1,
        "Direct sales works best precisely when the universe of potential customers is small and easily reached — typical of B2B markets — whereas a large, dispersed customer base usually favors a multi-tier or omnichannel approach.",
      ],
      // Q85 — governance and cost of debt
      [
        "A rating agency downgrades its assessment of a company's board independence and minority-shareholder protections. All else equal, this is most likely to result in a(n):",
        [
          "increase in the company's cost of debt.",
          "decrease in the company's cost of debt.",
          "reduction in the company's business risk.",
        ],
        0,
        "Weaker governance arrangements (less board independence, weaker shareholder/creditor protections) raise perceived default risk, which raises the cost of debt — the opposite of the favorable-governance case, where cost of debt tends to fall.",
      ],
      [
        "Strong creditor-protective covenants and governance practices most likely allow a company to:",
        [
          "borrow at a lower cost of debt due to reduced perceived default risk.",
          "avoid ever needing to raise equity capital.",
          "eliminate all business risk from its operations.",
        ],
        0,
        "Governance arrangements that protect creditor rights reduce a company's perceived default risk, which reduces its cost of debt — good governance affects financing costs, not the underlying business risk of operations or the firm's future need for equity.",
      ],
      // Q87 — liquidity drag vs pull
      [
        "Which of the following is most likely a 'drag' on a company's liquidity, rather than a 'pull'?",
        ["Obsolete, slow-moving inventory.", "Early payment to suppliers.", "Reduced short-term credit limits."],
        0,
        "A drag on liquidity comes from receipts lagging — uncollected receivables, obsolete inventory, tight credit from customers. Early supplier payments and reduced credit limits are 'pulls' (disbursements paid too quickly / credit access restricted).",
      ],
      [
        "A company's customers increasingly pay their invoices later than agreed. This is best described as a liquidity:",
        ["drag, since receipts are lagging.", "pull, since disbursements are accelerating.", "non-issue, since it doesn't affect cash flow timing."],
        0,
        "Slower customer payments delay cash receipts — a classic drag on liquidity (pressure from the receipts side), distinct from a pull (pressure from the disbursement side, e.g. paying suppliers too quickly).",
      ],
      // Q90 — D/E to weight conversion
      [
        "When estimating a target capital structure, the equity weight associated with a debt-to-equity ratio of 0.8 is closest to:",
        ["44.4%", "55.6%", "80.0%"],
        1,
        "Debt weight = (D/E) / (1 + D/E) = 0.8/1.8 = 44.4%. Equity weight = 1 − 44.4% = 55.6%.",
      ],
      [
        "When estimating a target capital structure, the equity weight associated with a debt-to-equity ratio of 1.5 is closest to:",
        ["40.0%", "60.0%", "150.0%"],
        0,
        "Debt weight = (D/E) / (1 + D/E) = 1.5/2.5 = 60.0%. Equity weight = 1 − 60.0% = 40.0%.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Variantes — Mock A Session 1 — Corporate...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
