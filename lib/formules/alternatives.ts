import type { MatiereFormules } from "@/lib/formules/types";

export const ALTERNATIVES: MatiereFormules = {
  matiere: "alternatives",
  copies: [
    {
      id: "alternatives.caracteristiques",
      titre: "Caractéristiques et structures",
      formules: [
        {
          id: "alternatives.categories",
          nom: "Alternative investment categories",
          texte: "Hedge funds, private capital (private equity and private debt), and real assets (real estate, natural resources, and infrastructure). Digital assets are covered as an alternative asset class of their own.",
        },
        {
          id: "alternatives.main-features",
          nom: "Main features of alternatives",
          texte: "More specialized manager knowledge, relatively low correlation with traditional investments, less liquidity, longer investor time horizons, larger investment commitments. Correlations can rise significantly in periods of economic stress.",
        },
        {
          id: "alternatives.fund-structure",
          nom: "Limited partnership structure",
          texte: "The general partner (GP) is the fund manager; limited partners (LPs) are the investors. LPs commit an amount and may contribute it over time as required by the GP. Typically open only to accredited investors.",
        },
        {
          id: "alternatives.methods",
          nom: "Methods of investing in alternatives",
          texte: "Fund investing: pooling assets with others via a fund manager. Co-investing: fund investing plus the right to invest directly alongside the manager. Direct investing: buying assets independently.",
          note: "Seul l'investissement direct ou en co-investissement impose la due diligence de chaque opération à l'investisseur.",
        },
        {
          id: "alternatives.fund-of-funds",
          nom: "Fund of funds",
          texte: "Gives diversification among hedge fund strategies, expertise in selecting funds, and access to otherwise unavailable funds; the drawback is an additional layer of fees.",
        },
        {
          id: "alternatives.return-issues",
          nom: "Return measurement issues",
          texte: "Infrequently updated fair values of Level 3 assets bias return measures upward and risk measures downward.",
        },
        {
          id: "alternatives.fair-value-hierarchy",
          nom: "Fair value hierarchy",
          texte: "Level 1: quoted prices readily available. Level 2: valued from observable inputs. Level 3: requires unobservable inputs.",
        },
        {
          id: "alternatives.risks-features",
          nom: "Risks specific to alternatives",
          texte: "Timing of cash flows, use of leverage, valuation assumptions for illiquid investments, and complex fee structures and taxation.",
        },
      ],
    },
    {
      id: "alternatives.frais",
      titre: "Frais et rendements nets des fonds",
      formules: [
        {
          id: "alternatives.management-fee",
          nom: "Management fee",
          latex: "\\text{Fee rate}\\times\\text{Assets under management}",
          note: "Hedge funds : base = actifs gérés. Private capital : base = capital engagé (committed), pas investi.",
        },
        {
          id: "alternatives.incentive-fee",
          nom: "Incentive fee (with hurdle rate)",
          latex: "\\text{Incentive rate}\\times\\max\\left(0,\\;\\text{Gain}-\\text{Hurdle amount}\\right)",
          note: "Hard hurdle : la commission ne porte que sur l'excédent du seuil. Soft hurdle : sur tout le gain dès que le seuil est franchi.",
        },
        {
          id: "alternatives.incentive-soft-hurdle",
          nom: "Incentive fee (soft hurdle)",
          latex: "\\text{Incentive rate}\\times\\text{Gain}\\quad\\text{if Gain}>\\text{Hurdle amount}",
          note: "Exemple : gain 9 %, seuil 8 %, commission 20 % : soft = 1,8 %, hard = 0,2 %.",
        },
        {
          id: "alternatives.incentive-hwm",
          nom: "High-water mark",
          texte: "No performance fee is paid on gains that only offset prior losses.",
        },
        {
          id: "alternatives.net-return",
          nom: "Net return to investors",
          latex: "\\frac{\\text{Gross end value}-\\text{Management fee}-\\text{Incentive fee}}{\\text{Initial value}}-1",
          note: "Commission de performance souvent calculée sur le gain net des frais de gestion.",
        },
        {
          id: "alternatives.catch-up",
          nom: "Catch-up provision",
          texte: "After the LPs receive the hurdle return, the GP receives all further returns until it has caught up to its full share; beyond that, gains are shared (for example 80% LPs, 20% GP).",
        },
        {
          id: "alternatives.carried-interest",
          nom: "Clawback",
          texte: "If the GP received incentive payments on gains that are subsequently reversed, the LPs can recover the excess incentive payments.",
        },
        {
          id: "alternatives.waterfall",
          nom: "Distribution waterfall",
          texte: "Deal-by-deal (American): profits are distributed as each investment is sold. Whole-of-fund (European): LPs receive all distributions until they have received 100% of their initial investment plus the hurdle rate.",
        },
      ],
    },
    {
      id: "alternatives.performance",
      titre: "Performance : levier, multiple et courbe en J",
      formules: [
        {
          id: "alternatives.leveraged-return",
          nom: "Leveraged return",
          latex: "\\frac{r\\,(V_0+V_B)-r_B\\,V_B}{V_0}",
          note: "V_0 = actifs initiaux, V_B = fonds empruntés, r = rendement des placements, r_B = taux d'emprunt.",
        },
        {
          id: "alternatives.moic",
          nom: "Multiple of invested capital (money multiple)",
          latex: "\\frac{\\text{Capital returned}+\\text{Value of remaining assets}}{\\text{Total capital paid in}}",
          note: "Ne tient pas compte du moment des flux : mesure un peu naïve.",
        },
        {
          id: "alternatives.pe-irr",
          nom: "IRR for alternative funds",
          texte: "An IRR over the life of the fund (a money-weighted return) is appropriate because managers control the timing of cash flows. Drawback: it rests on assumptions about the cost of capital and reinvestment rate.",
        },
        {
          id: "alternatives.j-curve",
          nom: "J-curve",
          texte: "Returns are negative during the capital commitment phase, less negative during the capital deployment phase, and positive during the capital distribution phase.",
        },
        {
          id: "alternatives.vintage-years",
          nom: "Vintage year diversification",
          texte: "Diversify across vintage years. Funds starting in expansions do better in early-stage companies; funds starting in contractions do better in distressed companies.",
        },
      ],
    },
    {
      id: "alternatives.private-equity",
      titre: "Capital-investissement et dette privée",
      formules: [
        {
          id: "alternatives.pe-definition",
          nom: "Private equity funds",
          texte: "Invest in the equity of private companies or companies wanting to become private, often financing assets with high levels of debt.",
        },
        {
          id: "alternatives.pe-strategies",
          nom: "Private equity strategies",
          texte: "Venture capital (formative stage: angel, seed, early; later stage: expansion; mezzanine stage), leveraged buyouts (management buyouts and management buy-ins), developmental capital or minority equity (PIPE for public companies).",
        },
        {
          id: "alternatives.pe-exit",
          nom: "Private equity exit routes",
          texte: "Trade sale (to a competitor or strategic buyer), IPO, recapitalization (issue portfolio company debt), secondary sale (to another private equity firm or investors), write-off or liquidation.",
        },
        {
          id: "alternatives.private-debt",
          nom: "Private debt types",
          texte: "Direct lending, venture debt, mezzanine loans, distressed debt, unitranche debt (several debt classes combined in one loan at a blended rate).",
        },
        {
          id: "alternatives.private-capital-diversification",
          nom: "Private capital diversification",
          texte: "Relatively low correlation of returns with traditional investments, so some diversification benefit.",
        },
      ],
    },
    {
      id: "alternatives.immobilier",
      titre: "Immobilier et infrastructure",
      formules: [
        {
          id: "alternatives.re-direct-indirect",
          nom: "Direct vs indirect real estate",
          texte: "Direct: more operational control, higher tax savings, diversification; but illiquidity, operational complexity, specialized knowledge, high initial investment, concentration risk. REITs: liquidity, professional management, diversified exposure, no double taxation.",
        },
        {
          id: "alternatives.re-strategies",
          nom: "Real estate investment strategies",
          texte: "Core (high-quality commercial property), core-plus (some redevelopment, more risk), value-add (major redevelopment), opportunistic (highest risk).",
        },
        {
          id: "alternatives.re-risk-ranking",
          nom: "Real estate risk ranking",
          texte: "From lowest to highest risk: senior debt, core, core-plus, value-add, opportunistic. Senior debt and core are bond-like; core-plus, value-add and opportunistic are equity-like.",
        },
        {
          id: "alternatives.infrastructure",
          nom: "Infrastructure investment",
          texte: "Transportation assets, utility assets, information and communication technology, and social infrastructure.",
        },
        {
          id: "alternatives.greenfield-brownfield",
          nom: "Greenfield vs brownfield",
          texte: "Brownfield: already constructed facilities (less risky). Greenfield: yet to be constructed (riskier). Secondary-stage brownfield: fully operational with stable cash flows.",
        },
        {
          id: "alternatives.infra-risk",
          nom: "Infrastructure risk and correlation",
          texte: "Demand-based projects tend to be the riskiest. Infrastructure equity has low correlation with public equities; debt is safer and less affected by economic cycles.",
        },
      ],
    },
    {
      id: "alternatives.matieres-premieres",
      titre: "Ressources naturelles",
      formules: [
        {
          id: "alternatives.commodity-futures-price",
          nom: "Commodity futures price",
          latex: "S_0\\,(1+r_f)+\\text{Storage costs}-\\text{Convenience yield}",
          note: "Futures price = spot price + net cost of carry.",
        },
        {
          id: "alternatives.contango-backwardation",
          nom: "Contango and backwardation",
          texte: "Contango: little or no convenience yield, futures price above spot (net cost of carry positive); it decreases the return of long-only investors. Backwardation: convenience yield high enough to offset costs, futures price below spot; it increases their return.",
        },
        {
          id: "alternatives.roll-yield",
          nom: "Roll yield",
          texte: "Positive in backwardation (the futures price moves up toward the spot price over the life of the contract); negative in contango.",
        },
        {
          id: "alternatives.commodity-access",
          nom: "Ways to access commodities",
          texte: "Derivatives (futures, forwards, options on futures, swaps) are the most common. Others: exchange-traded products (ETFs, ETNs), managed futures funds (CTAs), separately managed accounts, specialized sector funds.",
        },
        {
          id: "alternatives.commodity-sectors",
          nom: "Commodity sectors",
          texte: "Metals (base and precious), agricultural products, energy products.",
        },
        {
          id: "alternatives.timberland",
          nom: "Timberland returns",
          texte: "Income from timber sold and changes in land price (expected lumber prices, how much timber has been harvested). Flexibility option: trees can be harvested when the timber price is high. Investors without expertise can use TIMOs.",
        },
        {
          id: "alternatives.farmland",
          nom: "Farmland returns",
          texte: "Income from crops sold, land price changes, farm commodity prices, and crop quality and quantity. Crops must be harvested when ready, so there is no timing flexibility.",
        },
        {
          id: "alternatives.land-value-drivers",
          nom: "Land value drivers",
          texte: "Location first; for farmland and timberland, proximity to transportation and markets, access to water and soil quality. All land is illiquid.",
        },
        {
          id: "alternatives.commodity-drivers",
          nom: "Drivers of commodity prices",
          texte: "Supply and demand (economic cycle, inventories, production, supply shocks, weather, government policy). Low correlation with stocks and bonds, and a hedge against inflation.",
        },
      ],
    },
    {
      id: "alternatives.hedge-funds",
      titre: "Hedge funds",
      formules: [
        {
          id: "alternatives.hf-features",
          nom: "Hedge fund features",
          texte: "High fees, lower transparency, lower regulatory burden and lower liquidity than mutual funds or ETFs. They generally use leverage, take long and short positions, and use derivatives.",
        },
        {
          id: "alternatives.hf-equity-hedge",
          nom: "Equity hedge strategies",
          texte: "Long and short positions in equities and equity derivatives: market neutral, fundamental growth, fundamental value, fundamental long/short, short bias.",
        },
        {
          id: "alternatives.hf-event-driven",
          nom: "Event-driven strategies",
          texte: "Merger arbitrage, distressed/restructuring, activist, special situations.",
        },
        {
          id: "alternatives.hf-relative-value",
          nom: "Relative value strategies",
          texte: "Seek profits from unusual pricing issues (for example convertible bond arbitrage).",
        },
        {
          id: "alternatives.hf-macro-cta",
          nom: "Opportunistic strategies",
          texte: "Macro strategies and managed futures.",
        },
        {
          id: "alternatives.hf-structures",
          nom: "Hedge fund structures",
          texte: "Commingled funds (master-feeder structure) or a separately managed account (suited to large investors wanting a custom portfolio).",
        },
        {
          id: "alternatives.hf-fund-of-funds",
          nom: "Hedge fund of funds",
          texte: "Diversification among strategies, expertise in selecting hedge funds, and access to otherwise unavailable funds; but an additional layer of fees.",
        },
        {
          id: "alternatives.hf-returns",
          nom: "Hedge fund returns",
          texte: "Comprise market beta, strategy beta and alpha. Leverage magnifies strategy beta and alpha.",
        },
        {
          id: "alternatives.hf-bias",
          nom: "Hedge fund performance biases",
          texte: "Performance is often overstated because of selection bias, backfill bias and survivorship bias.",
        },
        {
          id: "alternatives.hf-lockup",
          nom: "Lockup and redemption terms",
          texte: "Lockup period: time after the initial investment during which LPs cannot redeem or pay significant fees. Notice period (typically 30 to 90 days): time the fund has to fulfill a redemption. Gate: temporary restriction on redemptions at the manager's discretion.",
        },
      ],
    },
    {
      id: "alternatives.actifs-numeriques",
      titre: "Actifs numériques",
      formules: [
        {
          id: "alternatives.dlt",
          nom: "Distributed ledger technology (DLT)",
          texte: "Digital assets (cryptocurrencies, tokens, digital collectibles) are electronically created, stored and transferred, and rely on DLT. A blockchain is a digital ledger that records information sequentially in blocks.",
        },
        {
          id: "alternatives.consensus",
          nom: "Consensus mechanisms",
          texte: "Proof of work: miners use powerful computers to verify transactions (heavy computational power is a disadvantage). Proof of stake: validators pledge collateral to guarantee the validity of transactions.",
        },
        {
          id: "alternatives.permissioned",
          nom: "Permissionless vs permissioned networks",
          texte: "Permissionless: transactions are visible to all users and any user can execute a transaction. Permissioned: some network activities may be modified or restricted for users.",
        },
        {
          id: "alternatives.token-types",
          nom: "Digital asset types",
          texte: "Cryptocurrency: digital currency issued privately, with no central bank backing (stablecoins are linked to another asset, meme coins are launched for entertainment). Central bank digital currency: a digital banknote or coin issued by a central bank. Tokenization: tracking asset ownership on a blockchain.",
        },
        {
          id: "alternatives.defi",
          nom: "Decentralized finance and smart contracts",
          texte: "Asset-backed tokens represent digital ownership of nondigital assets. Decentralized finance (DeFi) offers financial products and services on blockchains; smart contracts add value beyond a store of value.",
        },
        {
          id: "alternatives.crypto-valuation",
          nom: "Digital asset valuation",
          texte: "Most digital assets have no underlying assets or cash flows and no expected earnings, so no fundamental value. Cryptocurrency values are driven by asset appreciation and the limited supply of units.",
        },
        {
          id: "alternatives.digital-risks",
          nom: "Digital asset investment risks",
          texte: "Scam ICOs, pump-and-dump schemes, market manipulation, theft, attacks on wallet credentials; exchanges lack regulatory oversight. High returns and high volatility, with low correlation to traditional assets.",
        },
        {
          id: "alternatives.digital-access",
          nom: "Ways to invest in digital assets",
          texte: "Direct: transactions recorded on the blockchain, via centralized or decentralized exchanges. Indirect: coin trusts, futures contracts, exchange-traded products, stocks, hedge funds.",
        },
      ],
    },
  ],
};
