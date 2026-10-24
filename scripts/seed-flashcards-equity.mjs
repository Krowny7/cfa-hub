// Seed script — flashcards Equity Investments (CFA Level I).
// 4 paquets × 15 cartes, à réviser en une nuit en combo avec le one-pager
// Equity (cfa-work/onepagers/equity.html) : chaque notion du one-pager a au
// moins une carte. Verso au format « trois cases » : À retenir (≤ 12 mots,
// ==surligné==, liste « a · b » ou formule) / « En clair : » / « Piège : »
// (si vrai piège). Cartes de calcul : formule générale dans « À retenir »,
// application chiffrée dans « En clair ».
// Chaque carte se comprend seule (cartes mélangées) ; phrases en français,
// termes techniques en anglais. Définitions, formules et chiffres vérifiés sur
// Schweser Book 2 (Readings 39–46) et lib/calc/equity.ts ; calculs recalculés.
// Formules KaTeX ($$…$$ seul sur sa ligne, $…$ en ligne) rendues par
// components/RichText.tsx. Jamais de « $ » monétaire (il ouvrirait une formule).
// Usage : node scripts/seed-flashcards-equity.mjs
import { pathToFileURL } from "node:url";
import { getOwnerId, ensureFolder, seedFlashcardSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Equity (Système)";

export const SETS = [
  {
    title: "Equity Investments — Flashcards 1/4 (Marchés, marge et ordres)",
    cards: [
      [
        "Quelles sont les 3 fonctions principales d'un financial system ?",
        "Permettre d'==épargner, emprunter, se couvrir== · Fixer le ==taux d'équilibre== · ==Allouer le capital== efficacement\nEn clair : Le financial system sert aussi à lever de l'equity et à trader sur l'info. Son taux d'équilibre égalise savings et borrowing.\nPiège : gérer la money supply n'en fait pas partie (banque centrale).",
      ],
      [
        "Broker, dealer, arbitrageur : qui met en relation quels acheteurs et vendeurs d'un même titre ?",
        "Broker : ==même moment== · Dealer : ==moments différents== · Arbitrageur : ==marchés différents==\nEn clair : Le dealer achète pour son inventaire et revend plus tard (bid-ask spread). L'arbitrageur achète sur un marché et revend aussitôt sur un autre.\nPiège : acheter et revendre aussitôt ailleurs, c'est l'arbitrageur.",
      ],
      [
        "Primary market vs secondary market : quelle différence ?",
        "Primary market : ==titres nouvellement émis== · Secondary market : ==revente entre investisseurs==\nEn clair : Le primary market regroupe IPO (initial public offering), seasoned offering, private placement, shelf registration et rights offering. Un secondary market liquide baisse le cost of capital.",
      ],
      [
        "Underwritten offering vs best efforts offering : qui supporte le risque d'invendus ?",
        "Underwritten : risque pour ==l'investment bank== · Best efforts : risque pour ==l'émetteur==\nEn clair : En underwritten offering, la banque achète toute l'émission à un prix négocié. En best efforts, elle vend au mieux, sans garantie, comme un broker.\nPiège : la banque préfère un prix bas : IPO (initial public offering) souvent underpriced.",
      ],
      [
        "Quote-driven, order-driven, brokered market : comment la transaction se forme-t-elle dans chacun ?",
        "Quote-driven : ==face à un dealer== · Order-driven : ==order matching rules== · Brokered : ==broker trouve la contrepartie==\nEn clair : En order-driven market, priorité au prix, puis aux ordres affichés, puis à l'ancienneté. Le brokered market sert aux blocs et à l'immobilier.\nPiège : call market = séances fixes à prix unique ; continuous = toute la séance.",
      ],
      [
        "Operational, informational, allocational efficiency : que signifie chacune pour un financial system ?",
        "Operational : ==coûts bas== · Informational : ==prix à jour== · Allocational : ==capital au meilleur usage==\nEn clair : En informational efficiency, les prix intègrent vite l'info. Un bon financial system a aussi des complete markets (les actifs utiles existent).\nPiège : « low transaction costs » ⇒ operational, pas informational efficiency.",
      ],
      [
        "Quels sont les objectifs de la market regulation (régulation des marchés financiers) ?",
        "Protéger les ==investisseurs peu avertis== · ==Competency standards== · Contrer les ==insiders== · ==Common financial reporting== · ==Minimum capital==\nEn clair : Le but de la market regulation est de préserver la confiance dans les marchés, donc leur liquidité.\nPiège : ni éduquer les investisseurs, ni limiter leur downside risk.",
      ],
      [
        "Acheteur d'un put, writer (vendeur) d'un put : qui est long l'option, et quelle exposure chacun a-t-il au prix du sous-jacent ?",
        "Acheteur : ==long l'option, short exposure== · Writer : ==short l'option, long exposure==\nEn clair : Une long exposure gagne quand le sous-jacent monte. L'acheteur du put gagne si le sous-jacent baisse ; le writer encaisse la prime et perd s'il baisse.\nPiège : l'acheteur d'une option, call ou put, est toujours long l'option.",
      ],
      [
        "Short sale : comment se déroule-t-elle, et que doit verser le short seller au prêteur du titre ?",
        "Déroulé : ==emprunter, vendre, racheter== · Au prêteur : ==les payments-in-lieu==\nEn clair : Les payments-in-lieu remplacent les dividendes ou coupons du titre emprunté. Le produit de la vente reste en collateral chez le broker, rémunéré au short rebate rate.\nPiège : titre dur à emprunter ⇒ short rebate rate bas, voire négatif.",
      ],
      [
        "Formule du leverage ratio d'un margin purchase (achat sur marge) ? Application : initial margin 40 %, titre en hausse de 10 %.",
        "$$\\text{Leverage ratio} = \\dfrac{\\text{Position value}}{\\text{Equity}} = \\dfrac{1}{\\text{IM}}$$\nEn clair : 1 / 0,40 = 2,5 : le titre à +10 % donne +25 % sur l'equity (avant intérêts). IM = initial margin, la part payée par l'investisseur à l'achat.\nPiège : 1/IM ne vaut qu'à l'achat ; ensuite, leverage ratio = valeur de la position / equity.",
      ],
      [
        "Formule du rendement d'un margin purchase (achat sur marge) ? Application : achat à 50, initial margin 50 %, revente à 60 après 1 an, dividende 1, call money rate 6 % sur le prêt, sans commission.",
        "$$\\text{Return} = \\dfrac{\\Delta V + \\text{Dividends} - \\text{Interest} - \\text{Commissions}}{\\text{Initial equity}}$$\nEn clair : Mise 25, prêt 25, intérêts 0,06 × 25 = 1,5 : (10 + 1 − 1,5) / 25 = 38 %. $\\Delta V$ = gain sur le titre, initial equity = mise + commission d'achat.\nPiège : pas 22 % × 2 = 44 % : les intérêts du prêt (et les commissions) se déduisent.",
      ],
      [
        "Formule du margin call price d'un margin purchase (achat sur marge) ? Application : achat à 40, initial margin 50 %, maintenance margin 25 %.",
        "$$P_{\\text{call}} = P_0 \\times \\dfrac{1 - \\text{IM}}{1 - \\text{MM}}$$\nEn clair : 40 × 0,50 / 0,75 = 26,67 : sous ce cours, margin call (non couvert ⇒ le broker vend). $P_0$ = prix d'achat, IM = initial margin, MM = maintenance margin.\nPiège : pour une short sale, $P_0(1 + IM)/(1 + MM)$ : l'appel vient quand le cours monte.",
      ],
      [
        "Quels sont les 3 types d'instructions d'un ordre de bourse ?",
        "Execution : ==comment trader== · Validity : ==quand l'ordre vaut== · Clearing : ==comment régler==\nEn clair : Execution : market (prix incertain), limit (exécution incertaine), iceberg. Validity : day, GTC (good-till-cancelled), IOC (immediate-or-cancel = fill-or-kill), on-close, stop.\nPiège : « GTC limit buy » : GTC = validity, limit = execution.",
      ],
      [
        "Pour une limit buy order, que signifient marketable, inside the market, makes the market et behind the market ?",
        "==Au-dessus du ask== : marketable · ==Entre bid et ask== : inside · ==Au bid== : makes the market · ==Sous le bid== : behind\nEn clair : Plus la limite d'achat est haute, plus l'ordre a de chances de passer. Côté vente, tout est symétrique.\nPiège : une limit sell sous le best bid est marketable, pas behind the market.",
      ],
      [
        "Stop-sell order et stop-buy order : où les place-t-on, et que se passe-t-il quand le stop est touché ?",
        "Stop-sell : ==sous le cours== · Stop-buy : ==au-dessus du cours== · Stop touché : ==market order lancé==\nEn clair : Les stop orders vendent quand le cours baisse, achètent quand il monte : ils amplifient le momentum. Un stop-buy protège une short position.\nPiège : le prix d'exécution n'est pas garanti, il peut être bien pire.",
      ],
    ],
  },
  {
    title: "Equity Investments — Flashcards 2/4 (Indices et efficience des marchés)",
    cards: [
      [
        "Formules du price return et du total return d'un security market index ?",
        "$$\\text{Price return} = \\dfrac{V_1 - V_0}{V_0}$$\n$$\\text{Total return} = \\dfrac{V_1 - V_0 + \\text{Inc}_1}{V_0}$$\nEn clair : Le total return ajoute au price return les revenus versés (dividendes, intérêts). $V$ = valeur de l'indice, $\\text{Inc}_1$ = revenus de la période.\nPiège : les deux indices partent de la même valeur, puis s'écartent dès que les titres versent des revenus.",
      ],
      [
        "Formules d'un price-weighted index et de son divisor après un stock split ? Application : prix 10, 20 et 90, divisor 3 ; split 2-for-1 du titre à 90.",
        "$$\\text{Index} = \\dfrac{\\sum_i P_i}{\\text{Divisor}}$$\n$$\\text{New divisor} = \\dfrac{\\sum_i P_i^{\\text{post-split}}}{\\text{Index}_{\\text{pre-split}}}$$\nEn clair : Avant : 120 / 3 = 40. Après : (10 + 20 + 45) / 40 = 1,875, et l'indice reste à 40. $P_i$ = prix de chaque titre : le poids suit le prix.\nPiège : le titre qui split perd du poids dans l'indice.",
      ],
      [
        "Equal-weighted index : quel biais a-t-il, et quel est son principal inconvénient ?",
        "Biais : ==surpondère les small caps== · Inconvénient : ==rebalancing le plus fréquent==\nEn clair : Un equal-weighted index rend la moyenne simple des rendements. Dès que les cours bougent, les poids dérivent : on rebalance souvent, à coût élevé.\nPiège : rebalancing (poids cibles) ≠ reconstitution (liste des titres).",
      ],
      [
        "Market-cap weighted index : comment les poids sont-ils fixés, et à quelle stratégie ressemble-t-il ?",
        "Poids : ==market cap des titres== · Ressemble à : ==une momentum strategy==\nEn clair : Les titres qui ont monté, parfois surévalués, pèsent de plus en plus. Un float-adjusted index ne compte que les actions disponibles au public.\nPiège : au stock split, rien à ajuster (contrairement au price-weighted index).",
      ],
      [
        "Quel biais a un fundamental-weighted index (poids fondés sur earnings, sales ou dividends) ?",
        "Un ==value tilt== : il surpondère earnings yield et book-to-market élevés\nEn clair : Les poids d'un fundamental-weighted index ne dépendent pas des prix : il ne surpondère pas les titres surévalués. Au rebalancing, il agit en contrarian.",
      ],
      [
        "Pourquoi un style index a-t-il plus de turnover qu'un broad market index ?",
        "Les titres ==changent de case== (taille, value ou growth) avec le temps\nEn clair : Un style index croise market cap et value ou growth. Autres types d'indices : broad market, sector, multi-market (parfois pondéré par le GDP, gross domestic product).",
      ],
      [
        "À quoi sert un security market index ?",
        "==Sentiment== · ==Rendement du marché== · ==Benchmark== · Estimation du ==beta== · ==Index funds==\nEn clair : Dans le CAPM (capital asset pricing model), l'indice sert de proxy du marché. Un bon benchmark a le même style que le gérant (ex. small-cap value).",
      ],
      [
        "Pourquoi un bond index est-il plus difficile et plus cher à répliquer qu'un equity index ?",
        "==Univers énorme==, turnover élevé, prix de dealers, titres illiquides\nEn clair : Des bonds arrivent sans cesse à échéance, d'où le turnover. Autres indices délicats : hedge funds (biais haussier), commodities (via futures), real estate (REITs, real estate investment trusts).",
      ],
      [
        "Qu'est-ce qu'un informationally efficient market ?",
        "Les prix reflètent ==toute l'information disponible==, vite et rationnellement\nEn clair : Seule l'information inattendue fait bouger les prix, et market value ≈ intrinsic value. On ne bat pas durablement le marché après risque, d'où la passive management.",
      ],
      [
        "Weak, semi-strong, strong form de l'EMH (efficient market hypothesis) : quelle information est déjà dans les prix ?",
        "Weak : ==prix passés== · Semi-strong : ==info publique== · Strong : ==publique et privée==\nEn clair : La weak form couvre prix et volumes passés. Les marchés développés sont en général semi-strong efficient ; la strong form est rejetée.\nPiège : semi-strong implique weak, mais weak n'implique pas semi-strong.",
      ],
      [
        "Quelle analyse ne rapporte plus d'abnormal returns dans un marché weak, semi-strong ou strong form efficient ?",
        "Weak : ==technical analysis== · Semi-strong : aussi ==fundamental== · Strong : même ==l'info privée==\nEn clair : La fundamental analysis reste nécessaire : c'est elle qui rend les prix efficients. Le gérant reste utile : objectifs, diversification, allocation, fiscalité.",
      ],
      [
        "Qu'est-ce qui rend un marché financier moins efficient ?",
        "==Limites à l'arbitrage== · ==Limites au short selling== · ==Coûts de transaction== · ==Coûts d'information==\nEn clair : Beaucoup d'intervenants et d'information rendent un marché plus efficient. Les prix ne s'ajustent que si le gain attendu couvre les coûts : l'efficience est relative.",
      ],
      [
        "Momentum effect, overreaction effect, value effect : quelle forme de l'EMH (efficient market hypothesis) chaque anomalie contredit-elle ?",
        "Momentum, overreaction : ==weak form== · Value effect : ==semi-strong form==\nEn clair : Momentum et overreaction n'utilisent que les prix passés. Le value effect (P/E bas, P/E = price-to-earnings) repose sur des données publiques. Overreaction : les perdants sur 3 à 5 ans rebondissent.",
      ],
      [
        "Les market anomalies (January effect, size effect, décote des closed-end funds…) prouvent-elles que les marchés sont inefficients ?",
        "==En général non== : data mining ou risque mal ajusté\nEn clair : Le January effect disparaît après ajustement du risque ; le size effect n'est pas confirmé ensuite. Autres : closed-end funds sous la NAV (net asset value), IPO (initial public offerings) décevantes.",
      ],
      [
        "Loss aversion, overconfidence, herding, information cascade : que décrit chacun de ces biais de la behavioral finance ?",
        "Loss aversion : ==perte > gain== · Overconfidence : ==se surestimer== · Herding : ==imiter== · Information cascade : ==suivre les informés==\nEn clair : La loss aversion fait peser une perte plus qu'un gain égal. Autres biais : conservatism (réaction lente), mental accounting, narrow framing.\nPiège : biais ≠ inefficience, sauf abnormal returns durables.",
      ],
    ],
  },
  {
    title: "Equity Investments — Flashcards 3/4 (Actions, entreprise et secteur)",
    cards: [
      [
        "Common shares vs preferred shares : quelles différences de droits ?",
        "Common : ==vote et residual claim== · Preferred : ==dividende fixe prioritaire==\nEn clair : La preferred ne vote pas et son dividende n'est pas obligatoire. Variantes : cumulative (arriérés payés avant les common), participating, convertible.\nPiège : la preferred la plus risquée : callable, non-cumulative ; la moins risquée : putable, cumulative.",
      ],
      [
        "Formule du nombre de voix d'un actionnaire en cumulative voting ? Application : 100 actions, 3 sièges au board of directors à pourvoir.",
        "Cumulative : voix à concentrer librement\n$$\\text{Votes} = \\text{Shares} \\times \\text{Seats}$$\nEn clair : 100 × 3 = 300 voix, toutes plaçables sur un seul candidat : les minority shareholders peuvent obtenir un siège. En statutory voting : 100 voix par siège, sans cumul.",
      ],
      [
        "Venture capital, LBO (leveraged buyout), PIPE (private investment in public equity) : que finance chacun de ces types de private equity ?",
        "Venture capital : ==firmes jeunes== · LBO : ==rachat par la dette== · PIPE : ==fonds privés, firme cotée==\nEn clair : Un LBO rachète une firme surtout par la dette (MBO, management buyout, si ce sont ses managers). Le private equity est illiquide.\nPiège : le mezzanine financing, juste avant l'entrée en bourse, reste du venture capital.",
      ],
      [
        "Depository receipts (DR) : que sont un sponsored DR, un GDR, un ADR et un BLDR ?",
        "Sponsored : ==l'investisseur vote== · GDR : ==hors US, en USD== · ADR : ==coté aux US== · BLDR : ==ETF de DR==\nEn clair : Un GDR (global DR) est émis hors US et hors du pays de l'émetteur (Londres). ADR = American DR, BLDR = basket of listed DRs, ETF = exchange-traded fund.\nPiège : unsponsored DR : c'est la banque dépositaire qui vote.",
      ],
      [
        "Formule du ROE (return on equity) d'une firme ?",
        "$$\\text{ROE} = \\dfrac{\\text{NI} - \\text{Preferred dividends}}{\\text{Average BV of common equity}}$$\nEn clair : NI = Net Income, BV = book value. La book value reflète le passé, la market value les anticipations ; un P/B (price-to-book) bas signale une value stock.\nPiège : BV volatile ⇒ BV moyenne ; BV stable ⇒ BV de début d'année possible.",
      ],
      [
        "Qu'est-ce qui donne du pricing power à une firme ?",
        "Produit ==différencié==, peu de substitutes, barriers to entry, switching costs élevés\nEn clair : Le pricing power, c'est monter ses prix sans perdre de ventes. Avec des produits identiques et beaucoup de rivaux, les firmes sont price takers.\nPiège : une forte market share ne garantit pas le pricing power ; des exit costs élevés le réduisent.",
      ],
      [
        "Formule de l'operating profit (EBIT, earnings before interest and taxes) ? Application : prix 10, variable cost 6 par unité, fixed costs 25 000, 8 000 unités vendues.",
        "$$\\text{EBIT} = Q \\times (P - VC) - FC$$\nEn clair : 8 000 × (10 − 6) − 25 000 = 7 000. $Q$ = unités vendues, $P$ = prix, $VC$ = variable cost unitaire, $FC$ = fixed costs ; $P - VC$ = contribution margin.\nPiège : economies of scale = FC étalés sur plus d'unités ; economies of scope = coûts partagés entre produits.",
      ],
      [
        "Formules du DOL (degree of operating leverage) et du DFL (degree of financial leverage) ?",
        "$$\\text{DOL} = \\dfrac{\\%\\Delta\\,\\text{EBIT}}{\\%\\Delta\\,\\text{Sales}}$$\n$$\\text{DFL} = \\dfrac{\\%\\Delta\\,\\text{Net Income}}{\\%\\Delta\\,\\text{EBIT}}$$\nEn clair : Le DOL vient des fixed costs : l'EBIT (earnings before interest and taxes) varie plus que les Sales. Le DFL vient des intérêts : le Net Income varie plus que l'EBIT.\nPiège : le ROA (return on assets) est unlevered ; le ROE (return on equity) dépend du levier.",
      ],
      [
        "Top-down vs bottom-up : comment prévoir le Revenue d'une entreprise ?",
        "Top-down : ==marché × market share== · Bottom-up : ==prix × volumes==\nEn clair : Le top-down part du macro : marché 500 × market share 6 % = Revenue 30. Le bottom-up part de la firme (segments, magasins). Autre approche : converger vers la base rate du secteur.\nPiège : partir du GDP (gross domestic product) growth, c'est du top-down.",
      ],
      [
        "Dans une prévision, comment modélise-t-on COGS (cost of goods sold), SG&A, accounts receivable et maintenance capex (capital expenditures) ?",
        "COGS : ==% du Revenue== · SG&A : ==croît avec l'inflation== · Receivables : ==via le DSO== · Maintenance capex : ==depreciation + inflation==\nEn clair : Les SG&A (selling, general and administrative) sont surtout fixes. $\\text{Receivables} = \\text{DSO} \\times \\text{Revenue}/365$, où DSO = days of sales outstanding.\nPiège : inventory et payables suivent le COGS, pas le Revenue.",
      ],
      [
        "Comment classer utilities, biotech et pétrole brut dans une style box (cyclical ou defensive × growth ou mature) ?",
        "Utilities : ==defensive, mature== · Biotech : ==defensive, growth== · Pétrole brut : ==cyclical, mature==\nEn clair : Defensive veut dire une demande stable, même en récession. Le GICS (Global Industry Classification Standard) classe par activité principale : sector → industry group → industry → sub-industry.",
      ],
      [
        "Formule du HHI (Herfindahl-Hirschman Index) d'un secteur ? Application : 5 firmes avec 35 %, 25 %, 20 %, 10 % et 10 % de market share ; quelle concentration ?",
        "$$\\text{HHI} = \\sum_i s_i^2$$\nEn clair : 35² + 25² + 20² + 10² + 10² = 2 450 : concentration moderate (low < 1 500, high > 2 500). $s_i$ = market share en %. HHI élevé ⇒ moins de rivalry.\nPiège : les market shares s'entrent en % (35² = 1 225), pas en décimales.",
      ],
      [
        "Quelles sont les Porter's five forces qui déterminent la rentabilité d'un secteur ?",
        "Threat of ==new entrants== · Threat of ==substitutes== · Power of ==buyers== · Power of ==suppliers== · ==Rivalry==\nEn clair : Des forces fortes poussent les economic profits vers zéro. Rivalry forte : rivaux de même taille, croissance lente, fixed costs élevés.\nPiège : « rivalry among suppliers » n'existe pas : c'est la power of suppliers.",
      ],
      [
        "Quelles sont les 3 competitive strategies de Porter ?",
        "Cost leadership : ==coûts minimaux== · Differentiation : ==produit distinctif== · Focus : ==une niche==\nEn clair : La cost leadership vise des prix bas et de gros volumes. Le focus vise une niche, par les coûts ou par la differentiation.\nPiège : la differentiation ne paie que si son coût reste inférieur à la price premium.",
      ],
      [
        "Que recouvre une analyse PESTLE d'un secteur ?",
        "Influences externes : ==Political, Economic, Social, Technological, Legal, Environmental==\nEn clair : Le facteur technological inclut les innovations disruptive. La défense dépend surtout du political, car l'État est son principal client.\nPiège : PESTLE = facteurs externes ; les Porter's five forces = structure du secteur.",
      ],
    ],
  },
  {
    title: "Equity Investments — Flashcards 4/4 (Dividendes et valorisation)",
    cards: [
      [
        "Quelles sont les 3 familles de equity valuation models ?",
        "==Present value== models · ==Multiplier== models · ==Asset-based== models\nEn clair : Les present value models actualisent dividendes ou FCFE (free cash flow to equity). Les multiplier models rapportent le prix à earnings, book value ou sales (P/E, P/B, P/S).\nPiège : intrinsic value > cours ⇒ undervalued, mais n'agir que si l'écart est grand.",
      ],
      [
        "Qu'est-ce que l'ex-dividend date ?",
        "==Premier jour== où l'acheteur de l'action ne touche plus le dividende\nEn clair : L'ordre est declaration → ex-dividend → holder-of-record (1 à 2 jours ouvrés après) → payment date. À l'ex-dividend date, le cours baisse d'environ le dividende.\nPiège : pour toucher le dividende, il faut acheter avant l'ex-dividend date.",
      ],
      [
        "Stock dividend, stock split, reverse split, share repurchase : lequel change la richesse de l'actionnaire ?",
        "==Aucun== : la richesse totale de l'actionnaire ne change pas\nEn clair : Le nombre d'actions change, mais le cours s'ajuste d'autant. Un repurchase équivaut à un cash dividend de même montant ; un special dividend est un versement ponctuel.\nPiège : un stock dividend de 50 % ≡ un split 3-for-2 (+50 % d'actions, cours ÷ 1,5).",
      ],
      [
        "Formule de la valeur d'une preferred share perpétuelle (non callable, non convertible) ? Application : par 50, dividend rate 7,5 %, required return 6 %.",
        "$$V_0 = \\dfrac{D_p}{k_p}$$\nEn clair : $D_p$ = 7,5 % × 50 = 3,75, donc $V_0$ = 3,75 / 0,06 = 62,50. $D_p$ = dividende annuel, $k_p$ = required return de la preferred.\nPiège : le dividend rate s'applique au par, jamais au prix ; le discount rate vient du marché.",
      ],
      [
        "Formule du Gordon growth model (constant growth DDM, dividend discount model), et à quelle condition s'applique-t-il ?",
        "Condition : ==$k_e > g_c$==\n$$V_0 = \\dfrac{D_1}{k_e - g_c} = \\dfrac{D_0 (1 + g_c)}{k_e - g_c}$$\nEn clair : Le Gordon growth model convient à une firme mature, à croissance stable ; sinon, two-stage ou three-stage DDM. $D_1$ = dividende dans un an, $k_e$ = required return on equity, $g_c$ = croissance constante.\nPiège : très sensible à $k_e - g_c$ : passer de 4 % à 2 % double la valeur.",
      ],
      [
        "Formule du Gordon growth model quand le dividende vient d'être versé (« just paid ») ? Application : dividende versé 2, croissance constante 5 %, required return 12 %.",
        "« Just paid » : faire croître le dividende\n$$V_0 = \\dfrac{D_0 (1 + g_c)}{k_e - g_c}$$\nEn clair : $D_1$ = 2 × 1,05 = 2,10, puis $V_0$ = 2,10 / (0,12 − 0,05) = 30. $D_0$ = dividende versé, $k_e$ = required return, $g_c$ = croissance.\nPiège : avec $D_0$ au numérateur sans le faire croître, on trouve 28,57 (faux).",
      ],
      [
        "Formule du sustainable growth rate g d'une firme ? Application : ROE (return on equity) 15 %, dividend payout ratio 40 %.",
        "$$g = b \\times \\text{ROE} = (1 - \\text{payout ratio}) \\times \\text{ROE}$$\nEn clair : (1 − 0,40) × 15 % = 9 %. $b$ = retention rate, la part du Net Income gardée ; on suppose ROE et payout constants, sans émission d'actions.\nPiège : multiplier par la retention (60 %), pas par le payout (40 %).",
      ],
      [
        "Formule du required return on equity $k_e$ d'une action (CAPM, capital asset pricing model) ? Application : risk-free rate 3 %, beta 1,5, market risk premium 6 %.",
        "$$k_e = R_f + \\beta \\, [E(R_m) - R_f]$$\nEn clair : 3 % + 1,5 × 6 % = 12 %. $R_f$ = risk-free rate, $\\beta$ = beta de l'action, $E(R_m) - R_f$ = market risk premium.\nPiège : $k_e$ (exigé par le marché) ≠ ROE (return on equity, rendement comptable).",
      ],
      [
        "Formule du two-stage DDM (dividend discount model) ? Application : $D_0$ = 1 vient d'être versé, croissance 15 % pendant 2 ans puis 5 % pour toujours, required return 11 %.",
        "$$V_0 = \\sum_{t=1}^{n} \\dfrac{D_t}{(1+k_e)^t} + \\dfrac{P_n}{(1+k_e)^n}$$\n$$P_n = \\dfrac{D_{n+1}}{k_e - g_c}$$\nEn clair : $D_1$ = 1,15, $D_2$ = 1,3225, $D_3$ = 1,3886, $P_2$ = 1,3886 / 0,06 = 23,144. $V_0$ = 1,15 / 1,11 + (1,3225 + 23,144) / 1,11² ≈ 20,89. Ici n = 2, $k_e$ = 11 %, $g_c$ = 5 %.\nPiège : $D_3$ = $D_2$ × 1,05 (croissance stable), pas × 1,15.",
      ],
      [
        "Formule de la valeur d'une action dont le premier dividende tombe en n + 1 (DDM, dividend discount model) ? Application : premier dividende de 2 dans 4 ans, puis +5 % par an, required return 10 %.",
        "$$P_n = \\dfrac{D_{n+1}}{k_e - g_c}$$\n$$V_0 = \\dfrac{P_n}{(1+k_e)^n}$$\nEn clair : Ici n = 3 : $P_3$ = 2 / (0,10 − 0,05) = 40, puis $V_0$ = 40 / 1,10³ ≈ 30,05. $k_e$ = required return, $g_c$ = croissance constante.\nPiège : $P_n$ s'actualise sur n périodes (ici 3), pas n + 1.",
      ],
      [
        "Formule du FCFE (free cash flow to equity), et quand l'utiliser plutôt que les dividendes ?",
        "$$\\text{FCFE} = \\text{CFO} - \\text{FCInv} + \\text{Net borrowing}$$\nUtile si dividendes ==absents ou imprévisibles==\nEn clair : Le FCFE est le cash disponible pour les actionnaires. CFO = cash flow from operations, FCInv = fixed capital investment ; on l'actualise au required return on equity.\nPiège : le net borrowing (dette émise − remboursée) s'ajoute au FCFE.",
      ],
      [
        "Formule du justified leading P/E (price-to-earnings) tirée du Gordon growth model ? Application : payout ratio 30 %, required return 13 %, croissance 6 %.",
        "$$\\dfrac{P_0}{E_1} = \\dfrac{D_1 / E_1}{k_e - g_c}$$\nEn clair : 0,30 / (0,13 − 0,06) ≈ 4,29. $D_1/E_1$ = payout ratio, $k_e$ = required return, $g_c$ = croissance. Trailing : $P_0/E_0 = (D_0/E_0)(1 + g_c)/(k_e - g_c)$.\nPiège : justified P/E = méthode des fundamentals ; P/E des pairs = méthode des comparables (law of one price).",
      ],
      [
        "Toutes choses égales, qu'est-ce qui augmente le justified P/E (price-to-earnings) d'une action ?",
        "==Payout ↑, croissance ↑ ou required return ↓== ⇒ justified P/E ↑\nEn clair : En pratique, un payout plus élevé réduit la retention, donc la croissance (dividend displacement of earnings) : l'effet net du payout est ambigu.\nPiège : beta ↑ ⇒ required return ↑ ⇒ justified P/E ↓.",
      ],
      [
        "Formule de l'enterprise value (EV), et quand préférer EV/EBITDA au P/E (price-to-earnings) ?",
        "$$\\text{EV} = \\text{MV}_{\\text{equity}} + \\text{MV}_{\\text{pref}} + \\text{MV}_{\\text{debt}} - \\text{Cash}$$\nEV/EBITDA : ==leverage différent== ou NI < 0\nEn clair : L'EBITDA (earnings before interest, taxes, depreciation and amortization) ignore la capital structure et reste souvent > 0. MV = market value, NI = Net Income ; cash inclut les short-term investments.\nPiège : dette et preferred en market value (la book value seulement à défaut).",
      ],
      [
        "Quand un asset-based valuation model est-il pertinent pour valoriser une action, et quelles sont ses limites ?",
        "Pertinent : ==actifs tangibles ou liquidation== · Limites : ==gros intangibles, hyperinflation==\nEn clair : En asset-based valuation, equity = fair value des assets − liabilities − preferred stock. Avec de gros intangibles, ce n'est qu'un plancher ; les market values sont parfois introuvables.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "flashcards");
  console.log("Flashcards — Equity Investments (4 paquets × 15)...");
  const total = await seedFlashcardSets({ ownerId, folderId, sets: SETS, oldTitles: [] });
  console.log(`\n✅ Terminé. ${total} cartes ajoutées.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  });
}
