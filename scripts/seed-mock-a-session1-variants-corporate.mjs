// Variantes (2 par question) pour "Mock A — Session 1 — Finance d'Entreprise".
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
    title: "Mock A — Session 1 — Finance d'Entreprise — Variantes",
    difficulty: 2,
    questions: [
      // ---- Q37 — catégories de projets d'investissement -------------------
      // (a) angle : reconnaître un projet d'EXPANSION plutôt qu'un going concern
      [
        "A beverage company opens a new factory in a country where it has never previously operated, roughly doubling its total production capacity. This capital investment is best classified as a(n):",
        ["going concern project.", "expansion project.", "regulatory/compliance project."],
        1,
        "Expansion projects grow the scale of the business — new capacity, new markets — beyond what is needed to sustain current operations. A going concern (maintenance) project only keeps existing operations running at their present size, and nothing here points to a regulatory mandate.",
      ],
      // (b) difficulté : identifier le moteur PRINCIPAL quand deux motifs se mélangent
      [
        "A refinery installs new emissions-scrubbing equipment mandated by a recently passed environmental law. As a secondary effect, the equipment is also expected to lower the plant's operating costs. This project is best classified as a(n):",
        ["going concern project.", "regulatory/compliance project.", "expansion project."],
        1,
        "Classification follows the primary driver of the investment, not an incidental side benefit. The equipment exists because the law requires it — the cost saving is a bonus, not the reason for the spend. It is not a going concern project, since the company was not free to simply choose whether to maintain current operations as-is, and it adds no capacity, so it is not expansion.",
      ],

      // ---- Q56 — VAN et flux non conventionnels ---------------------------
      // (a) angle : que dit le profil de VAN sur le nombre de TRI possibles ?
      [
        "A project has the following annual cash flows: −$606,061 (Year 0), +$2,151,515 (Year 1), −$2,542,424 (Year 2), and +$1,000,000 (Year 3). Its NPV is −$100.00 at a 15% discount rate, −$41.66 at 18%, and +$14.70 at 21%. Which of the following statements about this project is most accurate?",
        [
          "Its NPV profile is monotonically decreasing in the discount rate, as with a normal cash-flow project.",
          "The cash flow pattern changes sign more than once, so the project could have more than one internal rate of return.",
          "Because NPV is positive at 21%, NPV must also be positive at every discount rate above 21%.",
        ],
        1,
        "The cash flow changes sign three times (−, +, −, +), so by Descartes' rule of signs the project can have up to three internal rates of return — and it does: NPV actually crosses zero near 10%, again near 20%, and again near 25%. That is precisely why NPV is not monotonic here: it is negative from about 12% to 20%, briefly positive around 21%–24%, then negative again above roughly 25%. A normal (single sign change) cash flow pattern would guarantee a single IRR and a monotonically decreasing NPV profile; this one does not.",
      ],
      // (b) difficulté : exploiter le profil non monotone
      [
        "For the project above, NPV is +$14.70 at a 21% discount rate. If the required rate of return were instead 30%, the project's NPV would most likely be:",
        [
          "positive, and larger than at 21%, since NPV increases with the discount rate beyond that point.",
          "negative, because the project's non-normal cash-flow pattern means NPV is not monotonically related to the discount rate.",
          "positive, but smaller than at 21%, since NPV decreases only gradually as the discount rate rises further.",
        ],
        1,
        "Recomputing at 30% gives an NPV of about −$276, sharply negative rather than a small positive number. Because the cash flows change sign three times, the NPV curve rises and falls repeatedly with the discount rate instead of falling smoothly — a narrow band of positive NPV around 21%–24% does not imply NPV stays positive, or even declines gently, as the rate keeps rising.",
      ],

      // ---- Q58 — coût moyen pondéré du capital -----------------------------
      // (a) angle : comparer les contributions, pas seulement le total
      [
        "A company's capital structure is $15 million of equity at an 8% cost, $10 million of debt at a 4% pre-tax cost, and $1 million of preferred stock at a 5% cost, with a 35% marginal tax rate. Which source of capital contributes the most to the company's WACC?",
        ["Debt.", "Preferred stock.", "Equity."],
        2,
        "Each source's contribution is its weight times its (after-tax, for debt) cost: equity contributes 0.577 × 8% ≈ 4.62 percentage points, debt contributes 0.385 × 4% × (1 − 0.35) ≈ 1.00 point, and preferred stock contributes 0.038 × 5% ≈ 0.19 points. Equity dominates because it is both the largest weight and the most expensive source — a low cost (debt) or a small weight (preferred) does not automatically mean a small contribution, but here debt loses on both counts relative to equity.",
      ],
      // (b) difficulté : recalculer le WACC après un changement de structure
      [
        "The same company raises an additional $9 million of debt at the same 4% pre-tax cost and uses the proceeds to repurchase $9 million of equity, leaving total capital unchanged at $26 million. Preferred stock, the tax rate, and all component costs stay the same. The company's new WACC is closest to:",
        ["3.94%.", "4.96%.", "5.81%."],
        0,
        "The new weights are equity $6M/$26M = 0.231, debt $19M/$26M = 0.731, preferred $1M/$26M = 0.038. WACC = 0.731 × 4% × (1 − 0.35) + 0.038 × 5% + 0.231 × 8% ≈ 3.94%. 5.81% is the original WACC, unchanged — it wrongly ignores that the weights shifted toward the cheaper, now-larger debt tranche. 4.96% recomputes with the new weights but forgets the tax deductibility of interest.",
      ],

      // ---- Q61 — pourquoi seul le coût de la dette est ajusté fiscalement --
      // (a) angle : le POURQUOI, pas la liste
      [
        "Which of the following best explains why the after-tax, rather than the pre-tax, cost of debt is used when calculating a firm's WACC?",
        [
          "Interest expense is tax-deductible, which reduces the effective cost of borrowing to the firm.",
          "Preferred dividends are tax-deductible for the issuing firm.",
          "Equity financing carries no tax implications for investors.",
        ],
        0,
        "The tax adjustment exists because interest payments reduce the firm's taxable income, so part of the stated interest cost is effectively subsidized by the tax savings it generates — the after-tax cost captures the true net cost to the firm. Preferred dividends, unlike interest, are not tax-deductible, which is exactly why the preferred cost of capital is left un-adjusted; the statement about equity is true but does not explain the debt adjustment.",
      ],
      // (b) difficulté : appliquer le principe à un cas non standard
      [
        "A firm partly finances a project with a hybrid security that pays a fixed coupon that is, under local tax law, not deductible against the firm's taxable income. When estimating this security's component cost of capital for the project's WACC, the firm should:",
        [
          "apply the same tax adjustment used for conventional debt.",
          "use the security's pre-tax cost without any tax adjustment.",
          "treat it as preferred stock regardless of its legal form as debt.",
        ],
        1,
        "The tax adjustment for debt is a direct consequence of interest being deductible — it is not a blanket rule that applies to anything labelled 'debt'. Since this coupon generates no tax shield, there is no benefit to net out, so its full pre-tax cost is its true cost to the firm. Whether the instrument is legally debt or preferred stock is irrelevant to this specific question; what matters is deductibility.",
      ],

      // ---- Q64 — qui met en œuvre la stratégie -----------------------------
      // (a) angle : surveillance (conseil) contre mise en œuvre (direction)
      [
        "Which of the following stakeholders is most likely responsible for overseeing, rather than directly implementing, a public corporation's strategy?",
        ["Managers.", "Employees.", "The board of directors."],
        2,
        "The board's role is oversight and approval — it monitors and holds management accountable for the strategy's execution. Managers, led by the CEO, are the ones who actually design the operational plan and direct employees to carry it out; employees implement the tasks management assigns them, but do not set or oversee the strategy itself.",
      ],
      // (b) difficulté : reconnaître une gouvernance normale, pas un abus
      [
        "A company's CEO develops a five-year strategic plan and directs division heads to execute it, while the board of directors reviews performance against the plan at each quarterly meeting. Which statement about this arrangement is most accurate?",
        [
          "The board has improperly delegated its strategic responsibilities to management.",
          "This reflects the standard governance division of labor: management implements strategy under board oversight.",
          "Division heads, not the CEO, bear ultimate responsibility for the plan's implementation.",
        ],
        1,
        "This is exactly how the roles are meant to divide: management (led by the CEO) designs and executes the strategy, and the board monitors that execution without running the business itself. Nothing here describes an abuse of process — quarterly review is oversight, not delegation of the board's own duties. Responsibility for implementation still runs through the CEO, even though division heads carry out specific tasks.",
      ],

      // ---- Q65 — formes juridiques et responsabilité limitée ---------------
      // (a) angle : contraster avec l'entreprise individuelle
      [
        "Which organizational form exposes its owner to unlimited personal liability for the firm's obligations, but avoids taxation of profits at the entity level?",
        ["Limited partnership.", "Sole proprietorship.", "Corporation."],
        1,
        "A sole proprietorship has a single owner who is personally liable for all of the business's debts, with no legal separation between the owner and the firm — but profits pass through directly to the owner's personal tax return, so there is no entity-level tax. A limited partnership offers limited liability to its limited partners, and a corporation shields all owners with limited liability but is typically taxed at the entity level as well as on distributed dividends.",
      ],
      // (b) difficulté : déduire la forme à partir des rôles décrits
      [
        "A firm has one manager who bears full personal liability for the firm's obligations, and several passive investors whose potential losses are capped at the amount they invested. All of these owners report their share of the firm's profits or losses on their own personal tax returns. This firm is most likely organized as a:",
        ["limited partnership.", "sole proprietorship.", "corporation."],
        0,
        "One owner with unlimited liability who manages the business is the general partner; the passive owners whose losses are capped at their investment are limited partners — this general/limited partner split, combined with pass-through taxation, defines a limited partnership. A sole proprietorship has only one owner, which does not fit multiple passive investors, and a corporation would tax profits at the entity level rather than pass them through.",
      ],

      // ---- Q67 — cycle de vie et flux de trésorerie ------------------------
      // (a) angle : identifier le stade à partir de la trajectoire du cash-flow
      [
        "In which stage of a company's life cycle does revenue typically grow rapidly while cash flow moves from negative toward breakeven?",
        ["Start-up.", "Mature.", "Growth."],
        2,
        "In the growth stage, the company has moved past pure concept development and is scaling a proven product, so revenue rises quickly and losses narrow as the business approaches breakeven. In the start-up stage, revenue is still zero or minimal and cash flow is deeply negative; a mature company typically has already reached stable, positive cash flow rather than still moving toward it.",
      ],
      // (b) difficulté : déduire le stade à partir d'indicateurs combinés
      [
        "A company has revenue growing in the low single digits, consistent positive free cash flow, and has recently raised its dividend payout ratio. This company is most likely in which stage of its life cycle?",
        ["Mature.", "Growth.", "Start-up."],
        0,
        "Slow, steady revenue growth combined with reliable positive free cash flow and a rising dividend payout is the classic profile of a mature company: it no longer needs to reinvest heavily to fund expansion, so it can return more cash to shareholders. A growth-stage company reinvests aggressively and rarely raises payouts, and a start-up has neither the revenue base nor the free cash flow to pay dividends at all.",
      ],

      // ---- Q71 — conflits actionnaires / direction --------------------------
      // (a) angle : le mécanisme qui RÉDUIT le conflit, pas celui qui le cause
      [
        "Which of the following mechanisms is most likely to reduce conflicts of interest between shareholders and management over executive compensation?",
        [
          "Giving shareholders a formal, non-binding advisory vote on executive pay ('say on pay').",
          "Letting the board's compensation committee set pay without any external disclosure.",
          "Linking the majority of pay to short-term stock price performance only.",
        ],
        0,
        "Allowing shareholders to express their views on remuneration limits the discretion directors and managers have to set their own pay, which is exactly the channel through which this conflict arises — so a formal voice for shareholders reduces it. Setting pay without disclosure removes the check that limits discretion rather than adding one, and pay tied only to short-term price performance can itself create a new conflict by encouraging managers to prioritize the stock price over long-term value.",
      ],
      // (b) difficulté : repérer un conflit caché derrière une structure qui semble alignée
      [
        "An executive's compensation package ties 80% of her pay to the current year's stock price, and includes a golden parachute that pays out in full regardless of company performance if she is terminated following an acquisition. This structure is most likely to encourage the executive to:",
        [
          "pursue long-term, value-creating projects even if they depress short-term earnings.",
          "favor decisions that boost the short-term stock price and make an acquisition more likely, since her downside is protected either way.",
          "align fully with long-term shareholder interests, since most of her pay is linked to stock performance.",
        ],
        1,
        "With most of her pay tied to the current stock price and her downside already protected by a guaranteed payout on acquisition, the executive has little reason to bear the risk of long-term projects and every reason to push for decisions that lift the price now — including an acquisition she is paid to welcome. Tying pay to stock price sounds like alignment, but combined with a no-risk exit it can create exactly the short-termism that the compensation structure was supposed to prevent.",
      ],

      // ---- Q81 — hypothèses de Modigliani-Miller ---------------------------
      // (a) angle : ce qui N'EST PAS une hypothèse du modèle sans impôt
      [
        "Which of the following is NOT an assumption of Modigliani and Miller's original (no-tax) capital structure framework?",
        [
          "Capital markets are frictionless, with no transaction costs.",
          "Investors hold homogeneous expectations about the firm's future cash flows.",
          "Interest expense is tax-deductible.",
        ],
        2,
        "The original MM propositions assume away taxes entirely, which is exactly why they conclude that capital structure is irrelevant to firm value — introducing deductible interest is a later extension of the model, not part of its original assumptions. Frictionless markets and homogeneous expectations are both genuine assumptions of the no-tax framework.",
      ],
      // (b) difficulté : appliquer la proposition, pas seulement la citer
      [
        "Under Modigliani and Miller's Proposition I (no taxes), a firm increases its debt-to-equity ratio from 0.5 to 1.5. All else equal, the firm's weighted average cost of capital will most likely:",
        [
          "remain unchanged, because the rise in the cost of equity exactly offsets the greater weight placed on cheaper debt.",
          "decrease, because debt is a cheaper source of capital than equity.",
          "increase, because debt is riskier for the firm than equity.",
        ],
        0,
        "MM Proposition I states that capital structure does not affect firm value, which implies WACC stays constant regardless of leverage. The mechanism is MM Proposition II: as leverage rises, the cost of equity rises just enough (because equity holders bear more financial risk) to exactly cancel out the effect of weighting more heavily toward cheaper debt. Naively assuming WACC falls simply because debt looks cheaper ignores that its weight is not the only thing that moves.",
      ],

      // ---- Q83 — stratégies de distribution B2B ----------------------------
      // (a) angle : la situation inverse — clientèle large et dispersée
      [
        "A company sells a mass-market consumer product to millions of geographically dispersed retail customers. Which channel strategy is most likely most appropriate for this product?",
        [
          "Direct sales to each individual customer.",
          "A single exclusive retail location.",
          "Distribution through intermediaries and multiple retail channels.",
        ],
        2,
        "When the customer universe is large and dispersed, reaching customers directly is impractical and costly, so firms rely on intermediaries — wholesalers, retailers, e-commerce platforms — to achieve reach at scale. Direct sales is the strategy suited to the opposite case: a small, easily reached universe of customers, as in typical B2B relationships. A single exclusive location cannot serve a geographically dispersed mass market at all.",
      ],
      // (b) difficulté : identifier le principe sous-jacent, pas l'étiquette
      [
        "A software company sells an enterprise product to a small number of large multinational clients requiring heavy customization and dedicated account management, while also selling a low-cost consumer version through third-party app stores to millions of individual users. This dual approach illustrates that channel strategy should be chosen primarily based on:",
        [
          "the size and reachability of the customer universe for each product line, not a single company-wide channel.",
          "the total revenue generated by each product line, regardless of its customer base.",
          "using the same channel for every product to preserve brand consistency.",
        ],
        0,
        "The company uses direct engagement for the small, easily identifiable universe of enterprise clients and a scalable indirect channel for the large, dispersed universe of consumer users — the customer universe's size and reachability, not the product's revenue or a desire for uniform branding, is what should drive the choice. Forcing one channel for both products would serve neither segment well.",
      ],

      // ---- Q85 — gouvernance et coût de la dette ---------------------------
      // (a) angle : le cas inverse — gouvernance dégradée
      [
        "A credit rating agency downgrades its assessment of a company's corporate governance after finding that its board offers weak protections for bondholders, such as no restriction on issuing additional senior debt. The most likely consequence for the company is a(n):",
        ["reduction in its cost of debt.", "increase in its equity value.", "increase in its cost of debt."],
        2,
        "Weaker creditor protections raise the risk borne by existing bondholders — the firm could, for example, dilute their claim by issuing more senior debt — so lenders demand a higher yield to compensate, raising the cost of debt. This is the mirror image of favorable governance reducing the cost of debt: the direction of the governance change and the direction of the cost change move together.",
      ],
      // (b) difficulté : comparer deux émissions selon leurs clauses restrictives
      [
        "Two otherwise identical bonds are issued by companies with equally strong operating cash flow, but Bond A includes strict covenants protecting creditor rights (e.g., limits on additional borrowing) while Bond B has minimal covenants. All else equal, which statement is most accurate?",
        [
          "Bond A will likely carry a lower yield, reflecting the reduced credit risk from stronger creditor protections.",
          "Bond B will likely carry a lower yield, since fewer covenants give the issuer more operating flexibility, which reduces default risk.",
          "The two bonds will carry the same yield, since covenants have no effect on credit risk once cash flow strength is equal.",
        ],
        0,
        "Covenants directly reduce the risk borne by bondholders by constraining actions — like piling on more debt — that could erode the value of their claim, so stronger covenants translate into a lower required yield even when the underlying operating cash flow is identical. Operating flexibility for the issuer is exactly what covenants trade away, in exchange for a lower cost of debt; it does not itself lower default risk for lenders.",
      ],

      // ---- Q87 — pressions ('drags') et tractions ('pulls') sur la liquidité ---
      // (a) angle : reconnaître un 'pull', pas un 'drag'
      [
        "Which of the following is most likely a 'pull' on a company's liquidity position, as distinct from a 'drag'?",
        [
          "Uncollected receivables from customers.",
          "Obsolete inventory that must be heavily discounted to sell.",
          "Making early payments to suppliers, before payment is contractually due, to secure a discount.",
        ],
        2,
        "A 'pull' on liquidity occurs when disbursements happen sooner than necessary, pulling cash out of the business ahead of schedule — paying suppliers early is a textbook example. Uncollected receivables and obsolete inventory are both 'drags': situations where cash that is owed to the company is slow to come in, tying up funds on the receipt side rather than the payment side.",
      ],
      // (b) difficulté : classer deux développements simultanément
      [
        "A company simultaneously experiences (1) a lender reducing its available credit line, and (2) a rise in the average collection period on its receivables. These two developments are best described, respectively, as a:",
        ["pull and a drag.", "drag and a pull.", "pull and a pull."],
        0,
        "A reduced credit line is a pull: it removes a source of funds the company could otherwise draw on, effectively pulling available liquidity out from under it. A longer collection period is a drag: cash that is owed to the company arrives more slowly, delaying receipts rather than accelerating disbursements. Both developments weaken liquidity, but through opposite mechanisms — one on the funding side, one on the receipts side.",
      ],

      // ---- Q90 — conversion ratio dette/capitaux propres <-> pondération ---
      // (a) angle : inverser — partir de la pondération pour retrouver le D/E
      [
        "A company's target capital structure implies a debt weight of 30% (that is, D/(D+E) = 30%). The company's target debt-to-equity ratio is closest to:",
        ["0.30.", "0.43.", "0.70."],
        1,
        "Since D/(D+E) = 0.30, rearranging D/E = [D/(D+E)] / [1 − D/(D+E)] gives D/E = 0.30 / 0.70 ≈ 0.43. 0.30 confuses the debt weight itself with the debt-to-equity ratio, which are not the same figure; 0.70 is simply the equity weight, 1 − 0.30.",
      ],
      // (b) difficulté : partir de montants bruts, pas d'un ratio déjà donné
      [
        "A company has $180 million of debt outstanding and a market capitalization of $420 million, and its target capital structure matches its current market-value mix. The equity weight used in the company's WACC calculation is closest to:",
        ["30.0%.", "42.9%.", "70.0%."],
        2,
        "The equity weight is market capitalization divided by total capital: $420M / ($180M + $420M) = $420M / $600M = 70.0%. 30.0% is the debt weight instead of the equity weight; 42.9% is the implied debt-to-equity ratio ($180M / $420M), a related but different figure from either weight.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Variantes — Mock A Session 1 — Finance d'Entreprise...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
