import type { MatiereFormules } from "@/lib/formules/types";

export const CORPORATE: MatiereFormules = {
  matiere: "corporate",
  copies: [
    {
      id: "corporate.formes-et-gouvernance",
      titre: "Formes d'organisation et parties prenantes",
      formules: [
        {
          id: "corporate.double-taxation",
          nom: "Effective tax rate on distributed corporate income (double taxation)",
          latex: "t_c + p\\,(1 - t_c)\\,t_d",
          note: "t_c = impôt sur les sociétés ; t_d = impôt sur les dividendes ; p = taux de distribution (payout). Tout distribué : p = 1."
        },
        {
          id: "corporate.sole-prop-general-partnership",
          nom: "Sole proprietorship and general partnership",
          texte: "Sole proprietorship: a business owned and operated by one individual, who has unlimited liability and is taxed personally on all profits. General partnership: two or more partners, each with unlimited liability, profits taxed as personal income of each partner.",
          note: "Ni l'une ni l'autre n'est une entité juridique distincte de ses propriétaires."
        },
        {
          id: "corporate.limited-partnership",
          nom: "Limited partnership",
          texte: "General partners operate the business and have unlimited liability; limited partners are liable only for the amount they invest and are not involved in managing the business. Profits are taxed as personal income.",
          note: "Dans une LLP, tous les associés sont limités et il n'y a pas de general partner."
        },
        {
          id: "corporate.corporation",
          nom: "Corporation (limited company)",
          texte: "A legal entity separate from its owners and managers, formed by filing articles of incorporation; shareholders have limited liability; owners elect a board of directors, which hires the managers; profits may be subject to double taxation.",
          note: "Meilleur accès au capital (dette et actions) que les autres formes."
        },
        {
          id: "corporate.public-vs-private",
          nom: "Public vs private corporate issuers",
          texte: "A public company's shares are listed and traded on an exchange (free float = actively traded shares, as a fraction of shares outstanding) and it must meet extensive disclosure requirements. A private company raises capital through private placements and can go public via an IPO, a direct listing, or by being acquired by a public company, possibly a SPAC."
        },
        {
          id: "corporate.stakeholder-groups",
          nom: "Primary stakeholders of a corporation",
          texte: "Shareholders, debtholders (creditors), the board of directors, senior management, employees, suppliers, customers, and government.",
          note: "Stakeholder theory : l'entreprise doit équilibrer les intérêts de toutes les parties prenantes."
        },
        {
          id: "corporate.debt-vs-equity-claims",
          nom: "Debtholders vs equity holders",
          texte: "Debtholders have a higher priority of claims and a legal claim to promised interest and principal, but limited upside. Equity holders have a residual claim to net assets, with theoretically unlimited upside.",
          note: "Source de conflits d'intérêts entre créanciers et actionnaires."
        },
        {
          id: "corporate.esg-factors",
          nom: "ESG factors",
          texte: "Environmental: climate change, pollution, deforestation, energy efficiency, waste, water scarcity. Social: customer privacy and data security, customer satisfaction, employee engagement, diversity and inclusion, labor and community relations. Governance: board composition, executive compensation, internal audit, bribery and corruption, political contributions, lobbying.",
          note: "Risques climatiques : physical risk, transition risk, stranded assets."
        }
      ]
    },
    {
      id: "corporate.gouvernance",
      titre: "Gouvernance",
      formules: [
        {
          id: "corporate.agency-relationship",
          nom: "Principal-agent relationship and agency costs",
          texte: "One party (the principal) hires another (the agent) to act in its interest, but the agent's interests may not coincide with the principal's. Agency costs are the costs of this conflict: direct (e.g. hiring staff to monitor the agent) or indirect (e.g. opportunity cost of lost business).",
          note: "Chez l'émetteur : actionnaires = principaux ; managers et administrateurs = agents."
        },
        {
          id: "corporate.governance-definition",
          nom: "Corporate governance",
          texte: "The internal controls and procedures of a company that define the rights and responsibilities of the various groups and how conflicts of interest among them are resolved."
        },
        {
          id: "corporate.board-duties",
          nom: "Duties of the board of directors",
          texte: "Select senior management, set their compensation and evaluate their performance; set the strategic direction; approve capital structure changes, significant acquisitions and large investments; review company performance and take corrective steps; plan CEO succession; establish and oversee internal controls and risk management; ensure the quality of financial reporting and internal audit."
        },
        {
          id: "corporate.shareholder-mechanisms",
          nom: "Shareholder governance mechanisms",
          texte: "Proxy voting is the primary mechanism: shareholders can remove senior managers and directors. Activist shareholders may engage in proxy fights or hostile takeovers."
        },
        {
          id: "corporate.other-stakeholder-mechanisms",
          nom: "Creditor, employee, customer/supplier and government mechanisms",
          texte: "Creditors: bond indentures and creditor committees. Employees: labor laws and unions. Customers and suppliers: contracts. Governments: regulations and regulatory agencies."
        },
        {
          id: "corporate.poor-governance-risks",
          nom: "Risks of poor governance",
          texte: "Weak control systems, poor decision-making, legal risk, reputational risk, and default risk."
        },
        {
          id: "corporate.good-governance-benefits",
          nom: "Benefits of good governance",
          texte: "Improved operational efficiency and performance, lower default risk, lower cost of debt, better financial performance, and higher firm value."
        }
      ]
    },
    {
      id: "corporate.fonds-de-roulement",
      titre: "Fonds de roulement et liquidité",
      formules: [
        {
          id: "corporate.net-working-capital",
          nom: "Net working capital",
          latex: "\\text{Current assets} - \\text{Current liabilities}"
        },
        {
          id: "corporate.current-ratio",
          nom: "Current ratio",
          latex: "\\frac{\\text{Current assets}}{\\text{Current liabilities}}"
        },
        {
          id: "corporate.quick-ratio",
          nom: "Quick ratio",
          latex: "\\frac{\\text{Cash} + \\text{Short-term marketable securities} + \\text{Receivables}}{\\text{Current liabilities}}"
        },
        {
          id: "corporate.cash-ratio",
          nom: "Cash ratio",
          latex: "\\frac{\\text{Cash} + \\text{Short-term marketable securities}}{\\text{Current liabilities}}"
        },
        {
          id: "corporate.dso",
          nom: "Days of sales outstanding",
          latex: "\\frac{\\text{Average receivables}}{\\text{Revenue}} \\times 365"
        },
        {
          id: "corporate.doh",
          nom: "Days of inventory on hand",
          latex: "\\frac{\\text{Average inventory}}{\\text{COGS}} \\times 365"
        },
        {
          id: "corporate.dpo",
          nom: "Days payable outstanding (number of days of payables)",
          latex: "\\frac{\\text{Average payables}}{\\text{Purchases}} \\times 365"
        },
        {
          id: "corporate.cash-conversion-cycle",
          nom: "Cash conversion cycle",
          latex: "\\text{DOH} + \\text{DSO} - \\text{DPO}",
          note: "Se raccourcit en baissant DOH et DSO ou en allongeant DPO ; plus court = mieux. Les formules de DOH, DSO et DPO sont celles de FSA."
        },
        {
          id: "corporate.liquidity-sources",
          nom: "Sources of liquidity",
          texte: "Primary: cash and marketable securities on hand, bank borrowings, cash generated by the business. Secondary: forgoing dividends, delaying capital investments, selling assets, issuing equity, restructuring debt, filing for bankruptcy protection.",
          note: "Recourir aux sources secondaires envoie un signal négatif et a un coût."
        },
        {
          id: "corporate.drag-pull",
          nom: "Drag and pull on liquidity",
          texte: "Drag: cash inflows lag (DOH or DSO increases). Pull: cash outflows accelerate (DPO decreases, e.g. suppliers demand faster payment or credit lines are reduced)."
        },
        {
          id: "corporate.wc-approaches",
          nom: "Conservative vs aggressive working capital policy",
          texte: "Conservative: high current assets financed with long-term debt and equity; more liquidity and less financial risk, but higher financing costs and lower returns. Aggressive: low current assets financed with short-term debt; lower financing costs and higher returns, but less liquidity and more financial risk."
        }
      ]
    },
    {
      id: "corporate.investissements",
      titre: "Investissements et allocation du capital",
      formules: [
        {
          id: "corporate.npv",
          nom: "Net present value (NPV)",
          latex: "\\sum_{t=1}^{N}\\frac{CF_t}{(1+r)^t} - \\text{Outlay}",
          note: "Règle : accepter si NPV > 0."
        },
        {
          id: "corporate.irr",
          nom: "Internal rate of return (IRR)",
          texte: "The discount rate that makes the NPV equal to zero; accept the project if IRR > required rate of return.",
          note: "Si NPV et IRR s'opposent entre projets exclusifs, suivre la NPV."
        },
        {
          id: "corporate.nopat",
          nom: "NOPAT",
          latex: "\\text{Net income} + \\text{Interest expense}(1 - t)",
          note: "Équivaut à EBIT(1 - t) quand il n'y a pas d'autres éléments."
        },
        {
          id: "corporate.roic",
          nom: "Return on invested capital (ROIC)",
          latex: "\\frac{\\text{NOPAT}}{\\text{Average invested capital}}",
          note: "Capital investi = dette long terme + capitaux propres (valeur comptable), hors fonds de roulement. ROIC > rendement exigé : l'entreprise crée de la valeur. ROIC = marge opérationnelle après impôt × rotation du capital."
        },
        {
          id: "corporate.capital-allocation-steps",
          nom: "Capital allocation process: the four steps",
          texte: "1) Generate investment ideas; 2) Analyze project ideas; 3) Create a firm-wide capital budget; 4) Monitor decisions and conduct a post-audit."
        },
        {
          id: "corporate.real-options",
          nom: "Real options",
          texte: "Timing option: delay an investment. Abandonment option: abandon a project if the PV of exiting exceeds the PV of continuing. Expansion option: make additional investments if it creates value. Flexibility options: price-setting and production-flexibility. Fundamental options: the project's payoffs depend on the price of an underlying asset.",
          note: "NPV avec option = NPV sans option + valeur de l'option - coût de l'option."
        },
        {
          id: "corporate.capital-allocation-principles",
          nom: "Capital allocation principles",
          texte: "Base decisions on after-tax cash flows, ignore sunk costs, and capture spillover effects on other parts of the business; timing of cash flows is important."
        }
      ]
    },
    {
      id: "corporate.cout-du-capital",
      titre: "Coût du capital",
      formules: [
        {
          id: "corporate.after-tax-cost-debt",
          nom: "After-tax cost of debt",
          latex: "r_d\\,(1 - t)"
        },
        {
          id: "corporate.cost-preferred",
          nom: "Cost of preferred stock",
          latex: "\\frac{D_p}{P_p}"
        },
        {
          id: "corporate.capm-cost-equity",
          nom: "Cost of equity (CAPM)",
          latex: "r_f + \\beta\\,(R_m - r_f)"
        },
        {
          id: "corporate.dividend-growth-cost",
          nom: "Cost of equity (dividend discount model)",
          latex: "\\frac{D_1}{P_0} + g"
        },
        {
          id: "corporate.wacc",
          nom: "WACC",
          latex: "\\frac{D}{V}\\,r_d\\,(1 - t) + \\frac{P}{V}\\,r_p + \\frac{E}{V}\\,r_e",
          note: "Sans préférentielles : D/V · r_d(1 - t) + E/V · r_e. Pondérations : cible, à défaut valeurs de marché. Le coût de la dette est après impôt."
        }
      ]
    },
    {
      id: "corporate.structure-du-capital",
      titre: "Structure du capital (Modigliani-Miller)",
      formules: [
        {
          id: "corporate.mm1-no-tax",
          nom: "MM Proposition I (no taxes): value of levered firm",
          latex: "V_U",
          note: "Sans impôts, la structure du capital n'affecte pas la valeur de l'entreprise."
        },
        {
          id: "corporate.mm1-tax",
          nom: "MM Proposition I (with taxes): value of levered firm",
          latex: "V_U + t\\,D",
          note: "t D = valeur actuelle de l'économie d'impôt sur la dette (dette permanente)."
        },
        {
          id: "corporate.mm2-no-tax",
          nom: "MM Proposition II (no taxes): cost of equity",
          latex: "r_0 + \\frac{D}{E}\\,(r_0 - r_d)",
          note: "r_0 = coût du capital de l'entreprise sans dette."
        },
        {
          id: "corporate.mm2-tax",
          nom: "MM Proposition II (with taxes): cost of equity",
          latex: "r_0 + \\frac{D}{E}\\,(r_0 - r_d)(1 - t)"
        },
        {
          id: "corporate.static-trade-off",
          nom: "Static trade-off theory: value of levered firm",
          latex: "V_U + PV(\\text{tax shield}) - PV(\\text{costs of financial distress})",
          note: "Ratio optimal : là où le gain marginal de l'économie d'impôt égale le coût marginal de détresse."
        },
        {
          id: "corporate.pecking-order",
          nom: "Pecking order theory",
          texte: "Based on information asymmetry between management and investors: retained earnings are the most preferred source of funds, then debt, then issuing new equity as the last resort. The choice of financing signals management's beliefs about firm value."
        },
        {
          id: "corporate.free-cash-flow-hypothesis",
          nom: "Free cash flow hypothesis",
          texte: "Higher debt issuance reduces the agency costs of equity (managers and shareholders have conflicting interests)."
        }
      ]
    },
    {
      id: "corporate.business-models",
      titre: "Modèles économiques",
      formules: [
        {
          id: "corporate.business-model-elements",
          nom: "What a business model should identify",
          texte: "The firm's potential customers; its products or services and how it will sell them; its key assets and suppliers; and its pricing strategy."
        },
        {
          id: "corporate.value-proposition",
          nom: "Value proposition",
          texte: "How a firm's customers will value the characteristics of its product or service."
        },
        {
          id: "corporate.value-chain",
          nom: "Value chain",
          texte: "How a firm executes its value proposition."
        },
        {
          id: "corporate.other-business-models",
          nom: "Other business models",
          texte: "Private label manufacturers, value-added resellers, and licensing agreements (besides conventional industry-specific models)."
        },
        {
          id: "corporate.business-model-debt-capacity",
          nom: "Business characteristics that support more debt",
          texte: "Stable, predictable cash flows; non-cyclical industry; low operating leverage (low fixed costs); subscription-based revenue; liquid, tangible assets that can be pledged as collateral."
        }
      ]
    }
  ]
};
