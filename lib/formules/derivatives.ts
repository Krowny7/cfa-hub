import type { MatiereFormules } from "@/lib/formules/types";

export const DERIVATIVES: MatiereFormules = {
  matiere: "derivatives",
  copies: [
    {
      id: "derivatives.fondamentaux",
      titre: "Fondamentaux et types de dérivés",
      formules: [
        {
          id: "derivatives.forward-commitments",
          nom: "Forward commitments",
          texte: "Forwards, futures and swaps: both parties are obliged to transact at a future date at a price agreed today.",
        },
        {
          id: "derivatives.contingent-claims",
          nom: "Contingent claims",
          texte: "Options and credit default swaps: the payoff depends on a specified future event. The option buyer has the right, not the obligation.",
        },
        {
          id: "derivatives.exchange-vs-otc",
          nom: "Exchange-traded vs OTC derivatives",
          texte: "Exchange-traded: standardized, backed by a central clearinghouse that takes the opposite side of each trade, relatively low credit risk. OTC: customized, largely unregulated and less transparent (some subject to central clearing).",
        },
        {
          id: "derivatives.forward-vs-futures",
          nom: "Futures vs forwards",
          texte: "Futures are standardized, exchange-traded, marked to market daily (gains and losses paid each day) and guaranteed by a clearinghouse. Forwards are customized, OTC and settled at maturity, with counterparty credit risk.",
        },
        {
          id: "derivatives.cds",
          nom: "Credit default swap (CDS)",
          texte: "The protection buyer pays a periodic premium and receives a payoff from the seller if a credit event occurs on the reference entity.",
        },
        {
          id: "derivatives.benefits-risks",
          nom: "Benefits and risks of derivatives",
          texte: "Benefits: change risk allocation, transfer and manage risk; information discovery; operational advantages (ease of short selling, lower transaction costs, greater leverage, greater liquidity). Risks: basis risk, liquidity risk, counterparty credit risk, lack of transparency.",
        },
        {
          id: "derivatives.settlement",
          nom: "Settlement types",
          texte: "Physical delivery of the underlying, or cash settlement of the value difference.",
        },
      ],
    },
    {
      id: "derivatives.arbitrage",
      titre: "Arbitrage, réplication et coût de portage",
      formules: [
        {
          id: "derivatives.law-one-price",
          nom: "Law of one price",
          texte: "Two financial instruments with identical payoffs must have the same price; otherwise an arbitrage profit exists.",
        },
        {
          id: "derivatives.arbitrage-def",
          nom: "Arbitrage",
          texte: "A transaction that generates a risk-free profit with no net investment.",
        },
        {
          id: "derivatives.replication",
          nom: "Replication",
          texte: "Construct a portfolio with the same payoffs as a derivative using the underlying and a risk-free asset. The derivative's no-arbitrage price equals the cost of the replicating portfolio.",
        },
        {
          id: "derivatives.risk-neutral-pricing",
          nom: "Risk-neutral pricing",
          texte: "Derivative values are computed with risk-neutral probabilities and the risk-free rate, not with investors' risk preferences.",
        },
        {
          id: "derivatives.cost-of-carry",
          nom: "Cost of carry",
          texte: "The benefits of holding the underlying (dividends, interest, convenience yield) minus the costs of holding it (storage, insurance). Greater costs raise the no-arbitrage forward price; greater benefits lower it.",
        },
      ],
    },
    {
      id: "derivatives.forwards",
      titre: "Prix et valeur d'un forward",
      formules: [
        {
          id: "derivatives.forward-price",
          nom: "Forward price (no cash flows)",
          latex: "S_0\\,(1+r)^{T}",
        },
        {
          id: "derivatives.forward-price-carry",
          nom: "Forward price (with benefits and costs)",
          latex: "\\left(S_0-PV(\\text{benefits})+PV(\\text{costs})\\right)(1+r)^{T}",
        },
        {
          id: "derivatives.forward-price-continuous",
          nom: "Forward price (continuous compounding)",
          latex: "S_0\\,e^{(r+c-b)T}",
          note: "r = taux sans risque continu, c = coûts de portage continus, b = bénéfices continus (dividend yield).",
        },
        {
          id: "derivatives.forward-price-fx",
          nom: "Currency forward price (covered interest parity)",
          latex: "S_0\\left(\\frac{1+r_{price}}{1+r_{base}}\\right)^{T}",
          note: "S_0 en unités de monnaie de cotation par unité de monnaie de base.",
        },
        {
          id: "derivatives.forward-value-spot",
          nom: "Forward value at time t (from the spot price)",
          latex: "S_t-PV_t(\\text{benefits})+PV_t(\\text{costs})-\\frac{F_0(T)}{(1+r)^{T-t}}",
        },
        {
          id: "derivatives.forward-rate-implied",
          nom: "Implied forward rate (add-on rates)",
          latex: "\\frac{\\dfrac{1+r_{A+B}\\,(A+B)}{1+r_{A}\\,A}-1}{B}",
          note: "Taux forward de B périodes commençant dans A périodes.",
        },
        {
          id: "derivatives.fra-payoff",
          nom: "FRA payoff (long, settled at start of the period)",
          latex: "\\text{Notional}\\times\\frac{(L-FRA)\\times\\frac{\\text{Days}}{360}}{1+L\\times\\frac{\\text{Days}}{360}}",
          note: "L = taux de référence constaté ; le payeur de taux fixe gagne si L > FRA.",
        },
      ],
    },
    {
      id: "derivatives.futures",
      titre: "Contrats à terme (futures)",
      formules: [
        {
          id: "derivatives.futures-price",
          nom: "Futures price (no cash flows)",
          latex: "S_0\\,(1+r)^{T}",
          note: "Sous taux constants, le futures et le forward ont le même prix.",
        },
        {
          id: "derivatives.futures-mtm",
          nom: "Futures daily value (mark-to-market)",
          latex: "f_t-f_{t-1}",
          note: "Le gain ou la perte du jour est réglé sur le compte de marge ; la valeur après règlement est nulle.",
        },
        {
          id: "derivatives.interest-rate-futures-price",
          nom: "Interest rate futures price",
          latex: "100-(100\\times MRR_{A,B-A})",
          note: "Prix = 100 − taux (en %) : le long gagne quand les taux baissent.",
        },
        {
          id: "derivatives.interest-rate-futures-bpv",
          nom: "Interest rate futures BPV",
          latex: "\\text{Notional}\\times\\text{Period}\\times 0.0001",
          note: "Variation de valeur du contrat pour 1 pb de variation du taux.",
        },
        {
          id: "derivatives.futures-margin",
          nom: "Margin accounts",
          texte: "Initial margin on opening, maintenance margin as a floor; gains above the initial margin can be withdrawn, and losses that take the account below the maintenance level require payments into the account (variation margin).",
        },
        {
          id: "derivatives.futures-vs-forward-value",
          nom: "Futures vs forward at inception",
          texte: "Both have zero value at inception; the futures position is reset to zero value each day, a forward keeps its accumulated value until maturity.",
        },
        {
          id: "derivatives.futures-vs-forward-price",
          nom: "Why futures and forward prices differ",
          texte: "With constant or uncorrelated interest rates they are the same. A positive correlation between rates and futures prices makes futures more attractive than forwards for a long; a negative correlation makes them less attractive.",
        },
      ],
    },
    {
      id: "derivatives.swaps",
      titre: "Swaps de taux et autres swaps",
      formules: [
        {
          id: "derivatives.swap-net-payment",
          nom: "Interest rate swap net payment (fixed payer)",
          latex: "\\text{Notional}\\times(\\text{Floating rate}-\\text{Fixed rate})\\times\\frac{\\text{Days}}{360}",
          note: "Seule la différence est échangée ; le notionnel ne l'est pas.",
        },
        {
          id: "derivatives.swap-fixed-rate",
          nom: "Swap fixed rate (per period)",
          latex: "\\frac{1-Z_N}{\\sum_{i=1}^{N} Z_i}",
          note: "Z_i = facteur d'actualisation (1 / (1 + taux spot)^t) de la période i.",
        },
        {
          id: "derivatives.swap-value",
          nom: "Swap value to the fixed-rate payer",
          latex: "\\text{Notional}\\times\\sum_{i=1}^{N}Z_i\\,\\left(FR_i-FS\\right)",
          note: "FR_i = taux variable forward de la période i, FS = taux fixe du swap.",
        },
        {
          id: "derivatives.swap-value-bonds",
          nom: "Swap value as a bond portfolio",
          latex: "PV(\\text{floating leg})-PV(\\text{fixed leg})",
          note: "Pour le payeur de taux fixe. Une jambe variable vaut le pair à chaque date de reset.",
        },
        {
          id: "derivatives.swap-as-bonds",
          nom: "Fixed-rate payer position",
          texte: "Similar to issuing a fixed-rate bond and buying a floating-rate note. The swap price is the fixed rate (par swap rate); its value changes with expected floating rates.",
        },
        {
          id: "derivatives.swap-initial-value",
          nom: "Swap value at initiation",
          texte: "Zero: the fixed rate is set so that the PV of the fixed leg equals the PV of the floating leg.",
        },
      ],
    },
    {
      id: "derivatives.options-payoffs",
      titre: "Options : gains et valeurs limites",
      formules: [
        {
          id: "derivatives.call-payoff",
          nom: "Call payoff at expiration (long)",
          latex: "\\max(0,\\;S_T-X)",
        },
        {
          id: "derivatives.put-payoff",
          nom: "Put payoff at expiration (long)",
          latex: "\\max(0,\\;X-S_T)",
        },
        {
          id: "derivatives.option-profit",
          nom: "Option profit (long)",
          latex: "\\text{Payoff}-\\text{Premium}",
          note: "Le vendeur a exactement le gain opposé.",
        },
        {
          id: "derivatives.call-breakeven",
          nom: "Call breakeven price",
          latex: "X+\\text{Premium}",
        },
        {
          id: "derivatives.put-breakeven",
          nom: "Put breakeven price",
          latex: "X-\\text{Premium}",
        },
        {
          id: "derivatives.exercise-value",
          nom: "Exercise value (call)",
          latex: "\\max(0,\\;S-X)",
          note: "Put : max(0 ; X − S). Un call est ITM si S > X, OTM si S < X.",
        },
        {
          id: "derivatives.time-value",
          nom: "Option time value",
          latex: "\\text{Option premium}-\\text{Exercise value}",
          note: "Nul à l'échéance.",
        },
        {
          id: "derivatives.call-lower-bound",
          nom: "European call lower bound",
          latex: "\\max\\left(0,\\;S_0-\\frac{X}{(1+r)^{T}}\\right)",
        },
        {
          id: "derivatives.put-lower-bound",
          nom: "European put lower bound",
          latex: "\\max\\left(0,\\;\\frac{X}{(1+r)^{T}}-S_0\\right)",
        },
        {
          id: "derivatives.max-values",
          nom: "Option upper bounds",
          texte: "A call is worth at most the underlying price S. A European put is worth at most the PV of X; an American put at most X.",
        },
      ],
    },
    {
      id: "derivatives.parite",
      titre: "Parité call-put et sensibilités",
      formules: [
        {
          id: "derivatives.put-call-parity",
          nom: "Put-call parity",
          latex: "c_0+\\frac{X}{(1+r)^{T}}=p_0+S_0",
        },
        {
          id: "derivatives.put-call-forward-parity",
          nom: "Put-call-forward parity",
          latex: "c_0+\\frac{X}{(1+r)^{T}}=p_0+\\frac{F_0(T)}{(1+r)^{T}}",
        },
        {
          id: "derivatives.fiduciary-protective",
          nom: "Fiduciary call and protective put",
          texte: "Fiduciary call: a call plus a risk-free bond paying X. Protective put: a share plus a put. They have identical payoffs (S if S >= X, X otherwise), so c + PV(X) = p + S for European options with the same X and expiration.",
        },
        {
          id: "derivatives.synthetic-call",
          nom: "Synthetic call",
          latex: "p_0+S_0-\\frac{X}{(1+r)^{T}}",
          note: "Long put + long stock + emprunt de PV(X).",
        },
        {
          id: "derivatives.synthetic-put",
          nom: "Synthetic put",
          latex: "c_0-S_0+\\frac{X}{(1+r)^{T}}",
          note: "Long call + short stock + prêt de PV(X).",
        },
        {
          id: "derivatives.synthetic-stock",
          nom: "Synthetic stock",
          latex: "c_0-p_0+\\frac{X}{(1+r)^{T}}",
        },
        {
          id: "derivatives.synthetic-bond",
          nom: "Synthetic risk-free bond",
          latex: "S_0+p_0-c_0",
          note: "Protective put + short call : actif sans risque de valeur finale X.",
        },
        {
          id: "derivatives.option-factors-call",
          nom: "Call value drivers",
          texte: "Increases with S, volatility, time to expiration, risk-free rate; decreases with X and with benefits paid on the underlying.",
        },
        {
          id: "derivatives.option-factors-put",
          nom: "Put value drivers",
          texte: "Increases with X and volatility; decreases with S and the risk-free rate; benefits on the underlying increase it. Time to expiration usually increases it (not always for a European put).",
        },
      ],
    },
    {
      id: "derivatives.binomial",
      titre: "Modèle binomial à une période",
      formules: [
        {
          id: "derivatives.up-down-factors",
          nom: "Up and down moves",
          latex: "S_u=S_0\\times u,\\quad S_d=S_0\\times d",
        },
        {
          id: "derivatives.risk-neutral-probability",
          nom: "Risk-neutral probability of an up move",
          latex: "\\frac{1+r-d}{u-d}",
        },
        {
          id: "derivatives.option-value-binomial",
          nom: "Option value (binomial)",
          latex: "\\frac{\\pi\\,c_u+(1-\\pi)\\,c_d}{1+r}",
          note: "Même formule pour un put avec p_u et p_d.",
        },
        {
          id: "derivatives.hedge-ratio",
          nom: "Hedge ratio (shares per option)",
          latex: "\\frac{c_u-c_d}{S_u-S_d}",
          note: "Nombre d'actions pour couvrir un call vendu : portefeuille sans risque.",
        },
        {
          id: "derivatives.hedged-portfolio-call",
          nom: "Call value from the hedge portfolio",
          latex: "h\\,S_0-\\frac{h\\,S_u-c_u}{1+r}",
          note: "Valeur du call = coût des actions − valeur actuelle du portefeuille sans risque.",
        },
        {
          id: "derivatives.hedge-ratio-put",
          nom: "Hedge ratio for a put (shares per option)",
          latex: "\\frac{p_d-p_u}{S_u-S_d}",
          note: "Portefeuille : long put + long h actions.",
        },
        {
          id: "derivatives.put-value-binomial",
          nom: "Put value from the hedge portfolio",
          latex: "\\frac{h\\,S_d+p_d}{1+r}-h\\,S_0",
          note: "p_0 = V_0 − h S_0, avec V_0 = valeur actuelle du portefeuille sans risque.",
        },
      ],
    },
  ],
};
