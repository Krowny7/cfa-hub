import type { MatiereFormules } from "@/lib/formules/types";

export const ECONOMICS: MatiereFormules = {
  matiere: "economics",
  copies: [
    {
      id: "economics.couts-et-profit",
      titre: "Coûts, revenus et profit de l'entreprise",
      formules: [
        {
          id: "economics.total-revenue",
          nom: "Total revenue",
          latex: "P \\times Q"
        },
        {
          id: "economics.average-revenue",
          nom: "Average revenue",
          latex: "\\frac{TR}{Q}"
        },
        {
          id: "economics.marginal-revenue",
          nom: "Marginal revenue",
          latex: "\\frac{\\Delta TR}{\\Delta Q}"
        },
        {
          id: "economics.total-cost",
          nom: "Total cost",
          latex: "TFC + TVC"
        },
        {
          id: "economics.average-total-cost",
          nom: "Average total cost",
          latex: "\\frac{TC}{Q} = AFC + AVC"
        },
        {
          id: "economics.marginal-cost",
          nom: "Marginal cost",
          latex: "\\frac{\\Delta TC}{\\Delta Q}"
        },
        {
          id: "economics.economic-profit",
          nom: "Economic profit",
          latex: "TR - TC",
          note: "TC inclut le coût d'opportunité des capitaux propres (profit comptable moins coûts implicites)."
        },
        {
          id: "economics.profit-max-rule",
          nom: "Profit-maximizing output rule",
          latex: "MR = MC"
        },
        {
          id: "economics.breakeven-rule",
          nom: "Breakeven point",
          latex: "TR = TC \\;(\\text{i.e. } P = ATC)"
        },
        {
          id: "economics.shutdown-rule",
          nom: "Shutdown rule",
          texte: "Short run: shut down if P < AVC (revenue does not cover variable costs). Long run: exit the market if P < ATC.",
          note: "Entre AVC et ATC, l'entreprise continue à court terme car elle couvre au moins ses coûts variables. Quelle que soit la structure de marché, on produit là où MR = MC."
        },
        {
          id: "economics.economies-of-scale",
          nom: "Economies and diseconomies of scale (LRATC)",
          texte: "Downward-sloping segment of the long-run average total cost curve: economies of scale (increasing returns to scale). Upward-sloping segment: diseconomies of scale.",
          note: "LRATC = coût moyen minimal pour chaque niveau de production, la taille de l'usine pouvant s'ajuster."
        }
      ]
    },
    {
      id: "economics.structures-de-marche",
      titre: "Structures de marché et concentration",
      formules: [
        {
          id: "economics.concentration-ratio",
          nom: "N-firm concentration ratio",
          latex: "\\sum_{i=1}^{N} s_i",
          note: "Part des ventes du marché détenue par les N plus grandes entreprises. Ni le ratio de concentration ni le HHI ne mesurent directement le pouvoir de marché."
        },
        {
          id: "economics.hhi",
          nom: "Herfindahl-Hirschman Index (HHI) of the N largest firms",
          latex: "\\sum_{i=1}^{N} s_i^2",
          note: "Somme des carrés des parts de marché des N plus grandes entreprises ; reflète mieux l'effet des fusions que le ratio de concentration."
        },
        {
          id: "economics.perfect-competition",
          nom: "Perfect competition: price, revenue",
          latex: "P = MR = AR",
          note: "L'entreprise est preneuse de prix ; demande parfaitement élastique."
        },
        {
          id: "economics.perfect-competition-features",
          nom: "Perfect competition: characteristics",
          texte: "Many firms, each small relative to the market; very low barriers to entry and exit; homogeneous products that are perfect substitutes (no advertising or branding); no pricing power."
        },
        {
          id: "economics.monopoly-features",
          nom: "Monopoly: characteristics",
          texte: "A single firm that is the whole market; very high barriers to entry and exit; advertising used to compete with substitute products; significant pricing power."
        },
        {
          id: "economics.monopolistic-competition",
          nom: "Monopolistic competition",
          texte: "Many firms; low barriers to entry and exit; differentiated products with heavy advertising and marketing; some pricing power. Price > MR = MC at the optimum; zero economic profit in long-run equilibrium."
        },
        {
          id: "economics.oligopoly",
          nom: "Oligopoly",
          texte: "Few sellers; high barriers to entry and exit; products homogeneous or differentiated by branding and advertising; may have significant pricing power. Price > MR = MC; positive economic profit possible in the long run."
        },
        {
          id: "economics.oligopoly-models",
          nom: "Oligopoly pricing models",
          texte: "Cournot: firms decide simultaneously and share the market equally in long-run equilibrium. Stackelberg: sequential decisions, the first firm to set its price (leader) keeps a larger share. Dominant firm: a much lower-cost firm gains a disproportionate share and essentially sets the price. Without collusion, the long-run equilibrium is a Nash equilibrium."
        }
      ]
    },
    {
      id: "economics.cycles-et-macro",
      titre: "Cycles économiques et indicateurs",
      formules: [
        {
          id: "economics.business-cycle-phases",
          nom: "Phases of the business cycle",
          texte: "Expansion: real GDP increasing. Peak: real GDP stops increasing and begins decreasing. Contraction (recession): real GDP decreasing. Trough: real GDP stops decreasing and begins increasing.",
          note: "Les cycles reviennent mais sans régularité de durée ni d'ampleur."
        },
        {
          id: "economics.credit-cycle",
          nom: "Credit cycles",
          texte: "Cyclical fluctuations in interest rates and credit availability; they may amplify business cycles and cause bubbles in some asset markets."
        },
        {
          id: "economics.inventory-sales",
          nom: "Inventory-to-sales ratio over the cycle",
          texte: "It typically rises late in expansions (sales slow) and falls near the end of contractions (sales accelerate); firms adjust production to restore the desired ratio."
        },
        {
          id: "economics.cyclical-spending",
          nom: "Cyclical sensitivity of spending",
          texte: "Durable goods spending is highly sensitive to the business cycle, services somewhat sensitive, nondurable goods relatively less sensitive. Firms are slow to lay off workers early in contractions and slow to hire early in expansions."
        },
        {
          id: "economics.indicators",
          nom: "Economic indicators by timing",
          texte: "Leading indicators change before the economy turns; coincident indicators move with it; lagging indicators change after it."
        }
      ]
    },
    {
      id: "economics.politique-budgetaire",
      titre: "Politique budgétaire",
      formules: [
        {
          id: "economics.fiscal-multiplier",
          nom: "Fiscal multiplier",
          latex: "\\frac{1}{1 - MPC\\,(1 - t)}",
          note: "t = taux d'imposition. Ex. : MPC = 0,8 et t = 25 % donnent 1 / [1 - 0,8 × 0,75] = 2,5. Il augmente avec la MPC et baisse avec t."
        },
        {
          id: "economics.change-gdp-spending",
          nom: "Change in GDP from a change in government spending",
          latex: "\\Delta G \\times \\frac{1}{1 - MPC\\,(1 - t)}"
        },
        {
          id: "economics.change-gdp-tax",
          nom: "Change in aggregate demand from a change in taxes",
          latex: "-\\Delta T \\times MPC \\times \\frac{1}{1 - MPC\\,(1 - t)}",
          note: "Une hausse d'impôts réduit la demande agrégée ; l'effet initial est ΔT × MPC, puis le multiplicateur s'applique."
        },
        {
          id: "economics.balanced-budget-multiplier",
          nom: "Balanced budget multiplier",
          texte: "A tax increase lowers aggregate demand by ΔT × MPC × (fiscal multiplier), which is smaller than the effect of an equal increase in government spending (ΔG × fiscal multiplier). The net effect of equal ΔG and ΔT is therefore positive.",
          note: "Ex. : +100 de dépenses = +250 ; +100 d'impôts = -200 ; net = +50. Effet nul seulement si ΔT = ΔG / MPC."
        },
        {
          id: "economics.budget-balance",
          nom: "Budget surplus (deficit)",
          latex: "T - G",
          note: "T = recettes fiscales, G = dépenses publiques ; négatif = déficit."
        },
        {
          id: "economics.ricardian-equivalence",
          nom: "Ricardian equivalence",
          texte: "Taxpayers anticipate future taxes needed to repay deficit-financed debt, so they save the tax cut and deficits do not stimulate demand."
        },
        {
          id: "economics.fiscal-lags",
          nom: "Fiscal policy lags",
          texte: "Recognition lag (policymakers see the need late), action lag (time to enact changes), impact lag (time for changes to affect the economy)."
        },
        {
          id: "economics.fiscal-tools",
          nom: "Fiscal policy tools",
          texte: "Spending tools: transfer payments, current spending, capital spending. Revenue tools: direct and indirect taxation.",
          note: "Un déficit plus élevé est en général expansionniste ; on juge le déficit courant par rapport au déficit structurel (corrigé du cycle)."
        },
        {
          id: "economics.deficit-concerns",
          nom: "Concerns about a fiscal deficit",
          texte: "Higher future taxes reduce incentives to work and growth; deficits may not be financed by the market when debt is high; crowding out (government borrowing raises interest rates and reduces private investment)."
        }
      ]
    },
    {
      id: "economics.politique-monetaire",
      titre: "Politique monétaire",
      formules: [
        {
          id: "economics.quantity-equation",
          nom: "Equation of exchange",
          latex: "M \\times V = P \\times Y",
          note: "M = masse monétaire, V = vitesse de circulation, P = niveau des prix, Y = production réelle."
        },
        {
          id: "economics.fisher-effect",
          nom: "Fisher relation (nominal rate)",
          latex: "(1 + r_{real})\\,(1 + E(\\pi)) - 1",
          note: "Approximation : taux nominal ≈ taux réel + inflation attendue."
        },
        {
          id: "economics.neutral-rate",
          nom: "Neutral nominal policy rate",
          latex: "\\text{Real trend rate of economic growth} + \\text{Inflation target}",
          note: "Taux directeur au-dessus du taux neutre : restrictif ; en dessous : expansionniste."
        },
        {
          id: "economics.policy-stance",
          nom: "Expansionary vs restrictive policy",
          texte: "Policy rate below the neutral rate is expansionary; above the neutral rate is restrictive (contractionary)."
        },
        {
          id: "economics.central-bank-tools",
          nom: "Central bank policy tools",
          texte: "Policy rate (discount rate in the US, refinancing rate for the ECB), reserve requirements, open market operations. Lowering the policy rate or reserve requirements, or buying securities, is expansionary; the opposite is contractionary."
        },
        {
          id: "economics.central-bank-roles",
          nom: "Roles of a central bank",
          texte: "Supply currency; banker to the government and to other banks; regulate and supervise the payments system; lender of last resort; hold gold and foreign currency reserves; conduct monetary policy."
        },
        {
          id: "economics.effective-central-banks",
          nom: "Features of an effective central bank",
          texte: "Independence (free from political interference), credibility (follows through on stated intentions), transparency (clear about the indicators it uses and reports on them).",
          note: "Cible d'inflation typique : 2 % à 3 %."
        },
        {
          id: "economics.monetary-limits",
          nom: "Why monetary policy may not work as intended",
          texte: "Inflation expectations may move long-term rates opposite to short-term rates; liquidity trap (people hold more cash without a rate change); banks unwilling to lend even with excess reserves; short-term rates cannot be cut below zero; developing economies face undeveloped financial markets and credibility problems."
        },
        {
          id: "economics.contractionary-effects",
          nom: "Effects of a contractionary monetary policy",
          texte: "Lower economic growth, higher market interest rates, lower inflation, and an appreciation of the domestic currency; an expansionary policy has the opposite effects."
        }
      ]
    },
    {
      id: "economics.commerce-geopolitique",
      titre: "Commerce international et géopolitique",
      formules: [
        {
          id: "economics.comparative-advantage",
          nom: "Comparative advantage",
          texte: "A country has a comparative advantage in a good if its relative (opportunity) cost of producing it is lower than that of its trading partners; it should specialize in and export that good."
        },
        {
          id: "economics.trade-balance",
          nom: "Trade balance (X - M) identity",
          latex: "(S - I) + (T - G)",
          note: "S = épargne privée, I = investissement, T - G = solde budgétaire public."
        },
        {
          id: "economics.trade-restrictions",
          nom: "Trade restrictions",
          texte: "Tariffs (taxes on imported goods), quotas (limits on the quantity imported), minimum domestic content requirements, voluntary export restraints (VERs), and export subsidies.",
          note: "Hausse du prix des importations et baisse de leur quantité ; hausse du surplus des producteurs, baisse de celui des consommateurs. Une subvention à l'export profite aux pays importateurs."
        },
        {
          id: "economics.trade-blocs",
          nom: "Levels of regional integration (from least to most)",
          texte: "Free trade area, customs union, common market, economic union, monetary union."
        },
        {
          id: "economics.geopolitical-risk",
          nom: "Types of geopolitical risk",
          texte: "Event risk (the timing is known), exogenous risk (unanticipated events), thematic risk (known factors with long-term effects).",
          note: "Trois dimensions à analyser : probabilité, impact et vélocité (vitesse d'effet)."
        },
        {
          id: "economics.geopolitics-categories",
          nom: "Geopolitics: four broad categories",
          texte: "Autarky (noncooperation and nationalism), hegemony (noncooperation and globalization), bilateralism (cooperation and nationalism), multilateralism (cooperation and globalization)."
        },
        {
          id: "economics.imf-wb-wto",
          nom: "IMF, World Bank, WTO",
          texte: "IMF: promotes monetary cooperation and exchange rate stability, helps members with balance of payments problems. World Bank: loans, credits and grants to developing countries to fight poverty. WTO: ensures trade flows freely and smoothly by enforcing multilateral trade agreements."
        }
      ]
    },
    {
      id: "economics.fx-cotations",
      titre: "Taux de change : cotations, forwards et régimes",
      formules: [
        {
          id: "economics.fx-quote",
          nom: "Exchange rate quote P/B",
          texte: "Price currency per one unit of base currency: 1 B = S(P/B) units of P."
        },
        {
          id: "economics.fx-inverse",
          nom: "Inverse quote",
          latex: "\\frac{1}{S_{B/P}}",
          note: "S(P/B) = 1 / S(B/P) ; pour les cours bid/offer, le bid inversé est 1 / offer."
        },
        {
          id: "economics.cross-rate",
          nom: "Cross rate A/C from A/B and B/C",
          latex: "S_{A/B} \\times S_{B/C}",
          note: "La devise B s'annule ; mettre les cotations bout à bout."
        },
        {
          id: "economics.currency-change",
          nom: "Percentage change in the base currency (quote P/B)",
          latex: "\\frac{S_1}{S_0} - 1",
          note: "Hausse de P/B = la devise de base s'apprécie contre la devise de prix."
        },
        {
          id: "economics.price-currency-change",
          nom: "Percentage change in the price currency (quote P/B)",
          latex: "\\frac{S_0}{S_1} - 1",
          note: "≠ moins la variation de la devise de base : il faut inverser la cotation (ex. EUR +2,19 % ne donne pas CNY -2,19 %)."
        },
        {
          id: "economics.real-exchange-rate",
          nom: "Real exchange rate (domestic per foreign)",
          latex: "S_{d/f} \\times \\frac{CPI_f}{CPI_d}"
        },
        {
          id: "economics.forward-points",
          nom: "Forward rate from forward points",
          latex: "S_0 + \\frac{\\text{Forward points}}{10\\,000}",
          note: "Diviser par 100 pour les paires cotées en yens (JPY)."
        },
        {
          id: "economics.forward-premium",
          nom: "Forward premium (discount) on the base currency",
          latex: "\\frac{F}{S_0} - 1",
          note: "Positive : prime ; négative : décote."
        },
        {
          id: "economics.covered-interest-parity",
          nom: "Covered interest rate parity: forward rate (days, 360 basis)",
          latex: "S_0 \\times \\frac{1 + i_P \\times \\frac{\\text{days}}{360}}{1 + i_B \\times \\frac{\\text{days}}{360}}",
          note: "Taux en base 360 jours ; devise de prix au numérateur. La devise à plus bas taux est à prime à terme."
        },
        {
          id: "economics.covered-interest-annual",
          nom: "Covered interest rate parity: forward rate (annual periods)",
          latex: "S_0 \\times \\frac{1 + i_P}{1 + i_B}"
        },
        {
          id: "economics.covered-arbitrage",
          nom: "Covered interest arbitrage",
          texte: "If the market forward rate differs from the covered-parity forward rate, borrow in one currency, convert at spot, invest at the other currency's rate and hedge the proceeds with a forward contract: the covered return then differs from the borrowing cost, giving a riskless profit."
        }
      ]
    },
    {
      id: "economics.regimes-et-balance",
      titre: "Régimes de change et balance commerciale",
      formules: [
        {
          id: "economics.regimes-no-currency",
          nom: "Exchange rate regimes without own currency",
          texte: "Formal dollarization (use of another country's currency) and monetary union (several countries share a currency)."
        },
        {
          id: "economics.regimes-own-currency",
          nom: "Exchange rate regimes with own currency",
          texte: "Currency board (fixed rate commitment); conventional fixed peg (within ±1%); target zone / horizontal bands (e.g. ±2%); crawling peg; crawling bands; managed floating; independently floating."
        },
        {
          id: "economics.capital-restrictions",
          nom: "Objectives of capital flow restrictions",
          texte: "Reduce the volatility of domestic asset prices; maintain a fixed exchange rate; keep domestic interest rates low and preserve monetary policy independence; protect strategic industries from foreign ownership."
        },
        {
          id: "economics.elasticities-approach",
          nom: "Elasticities approach and Marshall-Lerner condition",
          texte: "Currency depreciation narrows a trade deficit if import and export demands are sufficiently elastic (Marshall-Lerner condition)."
        },
        {
          id: "economics.j-curve",
          nom: "J-curve effect",
          texte: "After a depreciation, the trade deficit may widen in the short run (contracts fixed in foreign currency) and narrow in the long run."
        },
        {
          id: "economics.absorption-approach",
          nom: "Absorption approach",
          texte: "Without excess capacity, devaluation gives only a temporary improvement; a lasting improvement needs a smaller fiscal deficit or higher domestic saving relative to domestic investment (lower domestic expenditure relative to income)."
        }
      ]
    }
  ]
};
