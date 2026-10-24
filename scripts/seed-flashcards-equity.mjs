// Seed script — flashcards Equity Investments (CFA Level I).
// 4 paquets × 15 cartes, à réviser en une nuit en combo avec le one-pager
// Equity (cfa-work/onepagers/equity.html) : chaque notion du one-pager a au
// moins une carte. Verso au format « trois cases » : À retenir (≤ 12 mots,
// ==surligné== ou formule) / « En clair : » / « Piège : » (si vrai piège).
// Chaque carte se comprend seule (cartes mélangées) ; phrases en français,
// termes techniques en anglais. Définitions, formules et chiffres vérifiés sur
// Schweser Book 2 (Readings 39–46) ; mini-calculs recalculés.
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
        "Atteindre ses objectifs · fixer le taux d'équilibre · allouer le capital\nEn clair : 1) épargner, emprunter, lever de l'equity, se couvrir, trader sur l'info ; 2) taux qui égalise savings et borrowing ; 3) capital vers ses usages les plus productifs.\nPiège : ni gérer la money supply (banque centrale), ni empêcher de trader sur l'info.",
      ],
      [
        "Broker, dealer, arbitrageur : qui met en relation quels acheteurs et vendeurs d'un même titre ?",
        "Broker : même moment · dealer : ==moments différents== · arbitrageur : marchés différents\nEn clair : le dealer achète pour son inventaire et revend plus tard (bid-ask spread) ; l'arbitrageur achète sur un marché et revend aussitôt sur un autre.\nPiège : acheter et revendre aussitôt ailleurs, c'est l'arbitrageur, pas le dealer.",
      ],
      [
        "Primary market vs secondary market : quelle différence ?",
        "Primary : titres ==nouvellement émis== ; secondary : titres déjà émis, entre investisseurs\nEn clair : primary = IPO (initial public offering), seasoned offering, private placement, shelf registration, rights offering. Un secondary market liquide baisse le cost of capital.",
      ],
      [
        "Underwritten offering vs best efforts offering : qui supporte le risque d'invendus ?",
        "Underwritten : ==l'investment bank== ; best efforts : l'émetteur\nEn clair : en underwritten, la banque achète toute l'émission à un prix négocié ; en best efforts, elle vend au mieux, comme simple broker, sans garantie.\nPiège : conflit d'intérêts de la banque ⇒ les IPO (initial public offerings) sont souvent underpriced.",
      ],
      [
        "Quote-driven, order-driven, brokered market : comment la transaction se forme-t-elle dans chacun ?",
        "Quote-driven : avec des ==dealers== · order-driven : order matching rules · brokered : broker trouve la contrepartie\nEn clair : order-driven : prix › ordres affichés › heure ; crossing network : prix du marché principal. Brokered : blocs, immobilier, art.\nPiège : call market = séances fixes, un seul prix ; continuous = toute la séance.",
      ],
      [
        "Operational, informational, allocational efficiency : que signifie chacune pour un financial system ?",
        "Operational : ==coûts bas== · informational : prix à jour · allocational : capital au meilleur usage\nEn clair : informational = les prix reflètent vite l'info fondamentale. Un well-functioning financial system a aussi des complete markets.\nPiège : « low transaction costs » ⇒ operational, pas informational efficiency.",
      ],
      [
        "Quels sont les objectifs de la market regulation (régulation des marchés financiers) ?",
        "==Préserver la confiance== : protéger les investisseurs peu avertis, contrer les insiders\nEn clair : aussi minimum standards of competency, GIPS (Global Investment Performance Standards), common financial reporting, minimum capital requirements.\nPiège : ni éduquer les investisseurs, ni limiter le downside risk, ni exclure les non-informés.",
      ],
      [
        "Acheteur d'un put, writer (vendeur) d'un put : qui est long l'option, et quelle exposure chacun a-t-il au prix du sous-jacent ?",
        "Acheteur du put : long l'option, mais ==short exposure== au sous-jacent\nEn clair : long exposure = gagner si le sous-jacent monte. Le writer du put est short l'option mais a une long exposure. Un hedger prend une short position en futures pour couvrir un actif détenu.\nPiège : l'acheteur d'une option, call ou put, est toujours long l'option.",
      ],
      [
        "Short sale : comment se déroule-t-elle, et que doit verser le short seller au prêteur du titre ?",
        "Emprunter, vendre, racheter ; verser au prêteur les ==payments-in-lieu==\nEn clair : payments-in-lieu = dividendes ou coupons du titre. Le produit de la vente reste en collateral chez le broker, rémunéré au short rebate rate.\nPiège : titre dur à emprunter ⇒ short rebate rate bas, voire négatif.",
      ],
      [
        "Quelle est la formule du leverage ratio d'un margin purchase (achat sur marge) ?",
        "$$\\text{Leverage ratio} = \\dfrac{1}{IM}$$\nEn clair : où $IM$ = initial margin, la part payée par l'investisseur. IM = 40 % ⇒ levier 2,5 : +10 % sur le titre ⇒ +25 % sur l'equity (avant intérêts).\nPiège : le levier amplifie les pertes autant que les gains.",
      ],
      [
        "Margin purchase (achat sur marge) : prix 50, initial margin 50 %, revente à 60 après 1 an, dividende 1, call money rate 6 % sur le prêt, sans commission. Rendement sur l'equity investie ?",
        "==38 %== = (gain + dividende − intérêts) / mise initiale\nEn clair : mise 25, prêt 25, intérêts 6 % × 25 = 1,5 ; (10 + 1 − 1,5) / 25 = 9,5 / 25 = 38 %.\nPiège : pas 22 % × 2 = 44 % : les intérêts du prêt (et les commissions) se déduisent.",
      ],
      [
        "Quelle est la formule du margin call price d'un margin purchase (achat sur marge) ? Exemple : prix d'achat 40, initial margin 50 %, maintenance margin 25 %.",
        "Margin call sous ==26,67==\n$$P_{\\text{call}} = P_0 \\times \\dfrac{1 - IM}{1 - MM}$$\nEn clair : où $P_0$ = prix d'achat, $IM$ = initial margin, $MM$ = maintenance margin. 40 × 0,50 / 0,75 = 26,67 ; appel non couvert ⇒ le broker vend.\nPiège : pour une short sale, $P_0(1 + IM)/(1 + MM)$ : l'appel vient quand le cours monte.",
      ],
      [
        "Quels sont les 3 types d'instructions d'un ordre de bourse ?",
        "==Execution, validity, clearing== : comment trader, quand, comment régler\nEn clair : execution : market (prix incertain), limit (exécution incertaine), iceberg ; validity : day, GTC (good-till-cancelled), IOC (immediate-or-cancel = fill-or-kill), on-close, stop ; clearing : règlement.\nPiège : « GTC limit buy » : GTC = validity, limit = execution.",
      ],
      [
        "Pour une limit buy order, que signifient marketable, inside the market, makes the market et behind the market ?",
        "Au-dessus du ask : ==marketable== · entre bid et ask : inside · au bid : makes the market · sous le bid : behind\nEn clair : plus la limite d'achat est haute, plus l'ordre a de chances de passer ; côté vente, c'est symétrique.\nPiège : une limit sell sous le best bid est marketable, pas behind the market.",
      ],
      [
        "Stop-sell order et stop-buy order : où les place-t-on, et que se passe-t-il quand le stop est touché ?",
        "Stop-sell ==sous le cours==, stop-buy au-dessus ; touché ⇒ market order\nEn clair : ils vendent quand ça baisse et achètent quand ça monte : ils amplifient le momentum. Un stop-buy limite la perte d'une short position.\nPiège : prix d'exécution non garanti : il peut être bien pire que le stop.",
      ],
    ],
  },
  {
    title: "Equity Investments — Flashcards 2/4 (Indices et efficience des marchés)",
    cards: [
      [
        "Price return vs total return d'un security market index : quelle différence ?",
        "Total return = price return ==+ les revenus== (dividendes, intérêts)\nEn clair : price return $= (V_1 - V_0)/V_0$ ; total return $= (V_1 - V_0 + \\text{Inc}_1)/V_0$, où $V$ = valeur de l'indice, $\\text{Inc}_1$ = revenus de la période.\nPiège : égaux à l'inception ; ils ne s'écartent ensuite que si les titres versent des revenus.",
      ],
      [
        "Comment calcule-t-on un price-weighted index, et que devient le divisor après un stock split ? Exemple : prix 10, 20 et 90, divisor 3 ; split 2-for-1 du titre à 90.",
        "$$\\text{Index} = \\dfrac{\\sum_i P_i}{\\text{divisor}}$$\nSplit ⇒ ==divisor ajusté== (ici 1,875)\nEn clair : où $P_i$ = prix de chaque titre : poids ∝ prix. Avant : 120 / 3 = 40 ; après : (10 + 20 + 45) / d = 40 ⇒ d = 1,875.\nPiège : le titre qui split perd du poids dans l'indice.",
      ],
      [
        "Quels sont les biais d'un equal-weighted index ?",
        "==Biais small-cap== et rebalancing le plus fréquent\nEn clair : rendement = moyenne simple des rendements des titres. Les poids dérivent dès que les cours bougent ⇒ rebalancing fréquent ⇒ coûts de transaction élevés.\nPiège : rebalancing (poids cibles) ≠ reconstitution (changer la liste des titres).",
      ],
      [
        "Market-cap weighted index : comment les poids sont-ils fixés, et à quelle stratégie ressemble-t-il ?",
        "Poids = market cap : il se comporte comme une ==momentum strategy==\nEn clair : les titres qui ont monté, parfois surévalués, pèsent plus. Float-adjusted index : seules les actions disponibles au public comptent.\nPiège : au stock split, rien à ajuster (contrairement au price-weighted index).",
      ],
      [
        "Quel biais a un fundamental-weighted index (poids fondés sur earnings, sales ou dividends) ?",
        "Un ==value tilt== : il surpondère earnings yield et book-to-market élevés\nEn clair : ses poids ne dépendent pas des prix : il évite de surpondérer les titres surévalués. Au rebalancing, il agit en contrarian.",
      ],
      [
        "Pourquoi un style index a-t-il plus de turnover qu'un broad market index ?",
        "Les titres ==changent de case== (taille, value ou growth) avec le temps\nEn clair : style index = market cap × value ou growth. Autres types : broad market, sector, multi-market (parfois pondéré par le GDP, gross domestic product).",
      ],
      [
        "À quoi sert un security market index ?",
        "Sentiment · rendement du marché · ==benchmark== · estimation du beta · index funds\nEn clair : dans le CAPM (capital asset pricing model), l'indice sert de proxy du marché. Un bon benchmark a le même style que le gérant (ex. small-cap value).",
      ],
      [
        "Pourquoi un bond index est-il plus difficile et plus cher à répliquer qu'un equity index ?",
        "==Univers énorme==, turnover élevé, prix de dealers, titres illiquides\nEn clair : des bonds arrivent sans cesse à échéance. Indices alternatifs : hedge funds (biais haussier), commodities (futures), real estate (appraisal, REITs, real estate investment trusts).",
      ],
      [
        "Qu'est-ce qu'un informationally efficient market ?",
        "Les prix reflètent ==toute l'information disponible==, vite et rationnellement\nEn clair : seule l'information inattendue fait bouger les prix ; market value ≈ intrinsic value. On ne bat pas durablement le marché après risque ⇒ passive management.",
      ],
      [
        "Weak, semi-strong, strong form de l'EMH (efficient market hypothesis) : quelle information est déjà dans les prix ?",
        "Weak : prix passés · semi-strong : ==info publique== · strong : publique et privée\nEn clair : weak = prix et volumes passés. Les marchés développés sont en général semi-strong efficient ; la strong form est rejetée.\nPiège : semi-strong implique weak, mais weak n'implique pas semi-strong.",
      ],
      [
        "Quelle analyse ne rapporte plus d'abnormal returns dans un marché weak, semi-strong ou strong form efficient ?",
        "Weak : ==technical analysis== · semi-strong : aussi fundamental · strong : même l'info privée\nEn clair : la fundamental analysis reste nécessaire : c'est elle qui rend les prix efficients. Le gérant reste utile : objectifs, diversification, allocation, fiscalité.",
      ],
      [
        "Qu'est-ce qui rend un marché financier moins efficient ?",
        "==Limites à l'arbitrage== et au short selling, coûts de transaction et d'information\nEn clair : beaucoup d'intervenants et d'information ⇒ plus d'efficience. Les prix ne s'ajustent que si le gain attendu couvre les coûts : l'efficience est relative.",
      ],
      [
        "Momentum effect, overreaction effect, value effect : quelle forme de l'EMH (efficient market hypothesis) chaque anomalie contredit-elle ?",
        "Momentum, overreaction : ==weak form== · value effect : semi-strong form\nEn clair : momentum et overreaction n'utilisent que les prix passés ; le value effect (P/E bas, P/E = price-to-earnings), des données publiques. Overreaction : les perdants sur 3 ou 5 ans rebondissent.",
      ],
      [
        "Les market anomalies (January effect, size effect, décote des closed-end funds…) prouvent-elles que les marchés sont inefficients ?",
        "==En général non== : data mining ou risque mal ajusté\nEn clair : January effect : disparaît après ajustement du risque ; size effect : non confirmé. Aussi : closed-end sous la NAV (net asset value), IPO (initial public offerings) sous-performantes à long terme.",
      ],
      [
        "Loss aversion, overconfidence, herding, information cascade : que décrit chacun de ces biais de la behavioral finance ?",
        "Loss aversion : ==perte > gain== · overconfidence : se surestimer · herding : imiter · cascade : suivre les mieux informés\nEn clair : loss aversion : une perte pèse plus qu'un gain égal. Autres : conservatism (réaction lente), mental accounting, narrow framing.\nPiège : biais ≠ inefficience, sauf abnormal returns durables.",
      ],
    ],
  },
  {
    title: "Equity Investments — Flashcards 3/4 (Actions, entreprise et secteur)",
    cards: [
      [
        "Common shares vs preferred shares : quelles différences de droits ?",
        "Common : ==vote et residual claim== ; preferred : dividende fixe, priorité, pas de vote\nEn clair : dividende de la preferred non obligatoire. Variantes : cumulative (arriérés payés avant les common), participating, convertible.\nPiège : la preferred la plus risquée est callable et non-cumulative ; la moins risquée, putable et cumulative.",
      ],
      [
        "Un actionnaire a 100 actions et 3 sièges au board of directors sont à pourvoir. Combien de voix a-t-il en statutory voting et en cumulative voting ?",
        "Statutory : 100 voix par siège ; cumulative : ==300 voix à concentrer==\nEn clair : en cumulative voting, il peut mettre ses 300 voix (100 × 3) sur un seul candidat ⇒ les actionnaires minoritaires obtiennent des sièges.",
      ],
      [
        "Venture capital, LBO, PIPE : que finance chacun de ces types de private equity ?",
        "Venture capital : ==firmes jeunes== · LBO : rachat par la dette · PIPE : firme cotée, fonds privés\nEn clair : LBO = leveraged buyout (MBO = management buyout) ; PIPE = private investment in public equity. Private equity : illiquide.\nPiège : le mezzanine financing (juste avant l'entrée en bourse) est du venture capital, pas un LBO.",
      ],
      [
        "Depository receipts (DR) : que sont un sponsored DR, un GDR, un ADR et un BLDR ?",
        "Sponsored : ==l'investisseur vote== · GDR : hors US, en USD · ADR : coté aux US · BLDR : ETF de DR\nEn clair : GDR = global DR, émis hors US et hors du pays de l'émetteur (Londres). ADR = American DR. BLDR = basket of listed DRs ; ETF = exchange-traded fund.\nPiège : unsponsored DR : la banque dépositaire vote, pas l'investisseur.",
      ],
      [
        "Quelle est la formule du ROE (return on equity) d'une firme ?",
        "$$\\text{ROE} = \\dfrac{\\text{NI} - \\text{preferred div.}}{\\text{average BV of common equity}}$$\nEn clair : où NI = Net Income, BV = book value. Book value = le passé ; market value = les anticipations ; P/B (price-to-book) bas ⇒ value.\nPiège : BV instable (ex. : en hausse) ⇒ BV moyenne ; BV stable ⇒ BV de début d'année.",
      ],
      [
        "Qu'est-ce qui donne du pricing power à une firme ?",
        "Produit ==différencié==, peu de substitutes, barriers to entry, switching costs élevés\nEn clair : pricing power = monter ses prix sans perdre de ventes. Produits identiques, nombreux rivaux ⇒ price takers. Indice : des marges qui montent.\nPiège : ni une market share élevée, ni des exit costs élevés (surcapacité ⇒ guerre des prix).",
      ],
      [
        "Formule de l'operating profit (EBIT) avec prix, variable cost et fixed costs ? Exemple : prix 10, variable cost 6 par unité, fixed costs 25 000, 8 000 unités vendues.",
        "EBIT = ==7 000==\n$$\\text{EBIT} = Q \\times (P - VC) - FC$$\nEn clair : où EBIT = earnings before interest and taxes, $Q$ = unités, $P - VC$ = contribution margin unitaire, $FC$ = fixed costs. 8 000 × 4 − 25 000 = 7 000.\nPiège : economies of scale (volume ⇒ coût unitaire ↓) ≠ economies of scope (coûts partagés).",
      ],
      [
        "DOL vs DFL : que mesure chacun de ces degrés de levier ?",
        "DOL : ==fixed costs== · DFL : intérêts\n$$\\text{DOL} = \\dfrac{\\%\\Delta\\,\\text{EBIT}}{\\%\\Delta\\,\\text{Sales}}$$\n$$\\text{DFL} = \\dfrac{\\%\\Delta\\,\\text{Net Income}}{\\%\\Delta\\,\\text{EBIT}}$$\nEn clair : DOL (degree of operating leverage) élevé ⇒ l'EBIT (earnings before interest and taxes) varie plus que les Sales ; DFL (degree of financial leverage) élevé ⇒ le Net Income varie plus que l'EBIT.\nPiège : ROA (return on assets) est unlevered ; le ROE (return on equity) dépend du levier.",
      ],
      [
        "Top-down vs bottom-up : comment prévoir le Revenue d'une entreprise ?",
        "Top-down : ==GDP growth ou marché × market share== ; bottom-up : prix × volumes\nEn clair : top-down part du macro (ex. : marché 500 × market share 6 % ⇒ Revenue 30) ; bottom-up part de la firme (segments, magasins). Aussi : base rate convergence.\nPiège : prévision fondée sur le GDP (gross domestic product) growth ⇒ top-down.",
      ],
      [
        "Dans une prévision, comment modélise-t-on COGS (cost of goods sold), SG&A, accounts receivable et maintenance capex ?",
        "COGS : ==% du Revenue== · SG&A : surtout fixe · receivables : via le DSO · maintenance capex : depreciation + inflation\nEn clair : SG&A = selling, general and administrative. $\\text{Receivables} = \\text{DSO} \\times \\text{Revenue}/365$, où DSO = days of sales outstanding. Maintenance capex : le replacement cost suit l'inflation.\nPiège : inventory et payables se projettent sur le COGS, pas le Revenue.",
      ],
      [
        "Comment classer utilities, biotech et pétrole brut dans une style box (cyclical ou defensive × growth ou mature) ?",
        "Utilities : defensive, mature · biotech : ==defensive, growth== · pétrole brut : cyclical, mature\nEn clair : defensive = demande stable. Le GICS (Global Industry Classification Standard) classe par activité principale : sector → industry group → industry → sub-industry.",
      ],
      [
        "Un secteur compte 5 firmes avec 35 %, 25 %, 20 %, 10 % et 10 % de market share. Quel est le HHI (Herfindahl-Hirschman Index) et quelle concentration indique-t-il ?",
        "HHI = ==2 450== : concentration moderate\n$$\\text{HHI} = \\sum_i s_i^2$$\nEn clair : où $s_i$ = market share en %. 1 225 + 625 + 400 + 100 + 100 = 2 450. Seuils : < 1 500 low ; 1 500 à 2 500 moderate ; > 2 500 high. HHI ↑ ⇒ moins de rivalry, plus de pricing power.",
      ],
      [
        "Quelles sont les Porter's five forces qui déterminent la rentabilité d'un secteur ?",
        "Threat of new entrants · threat of substitutes · power of buyers · power of suppliers · ==rivalry==\nEn clair : forces fortes ⇒ economic profits proches de zéro. Rivalry forte : rivaux de taille égale, croissance lente, fixed costs élevés, surcapacité.\nPiège : « rivalry among suppliers » n'existe pas : c'est la power of suppliers.",
      ],
      [
        "Quelles sont les 3 competitive strategies de Porter ?",
        "==Cost leadership, differentiation, focus==\nEn clair : cost leadership : coûts les plus bas, prix bas, gros volumes. Differentiation : produit distinctif. Focus : une niche.\nPiège : la differentiation ne paie que si son coût reste inférieur à la price premium.",
      ],
      [
        "Que recouvre une analyse PESTLE d'un secteur ?",
        "Influences externes : ==Political, Economic, Social, Technological, Legal, Environmental==\nEn clair : technological : une innovation peut être disruptive. Ex. : la défense dépend surtout du political (l'État est le client).\nPiège : PESTLE = facteurs externes ; les Porter's five forces = structure du secteur.",
      ],
    ],
  },
  {
    title: "Equity Investments — Flashcards 4/4 (Dividendes et valorisation)",
    cards: [
      [
        "Quelles sont les 3 familles de equity valuation models ?",
        "==Present value, multiplier, asset-based== models\nEn clair : present value : DDM (dividend discount model), FCFE (free cash flow to equity). Multiplier : P/E, P/B, P/S (price-to-earnings, -book, -sales) ; P/S pour une firme cyclique.\nPiège : intrinsic value > cours ⇒ undervalued ; n'agir que si l'écart est grand et le modèle fiable.",
      ],
      [
        "Qu'est-ce que l'ex-dividend date ?",
        "==Premier jour== où l'acheteur de l'action ne touche plus le dividende\nEn clair : ordre : declaration → ex-dividend → holder-of-record (1 à 2 jours ouvrés après) → payment date. Ce jour-là, le cours baisse d'environ le dividende.\nPiège : pour toucher le dividende, il faut acheter avant l'ex-dividend date.",
      ],
      [
        "Stock dividend, stock split, reverse split, share repurchase : lequel change la richesse de l'actionnaire ?",
        "==Aucun== : la richesse totale de l'actionnaire ne change pas\nEn clair : stock dividend 50 % ≡ split 3-for-2 : +50 % d'actions, cours ÷ 1,5. Repurchase ≡ cash dividend de même montant. Special dividend : versement ponctuel.",
      ],
      [
        "Comment valoriser une preferred share perpétuelle (non callable, non convertible) ? Exemple : par 50, dividend rate 7,5 %, required return 6 %.",
        "Valeur = ==62,50==\n$$V_0 = \\dfrac{D_p}{k_p}$$\nEn clair : où $D_p$ = dividend rate × par = 3,75, $k_p$ = required return de la preferred. 3,75 / 0,06 = 62,50.\nPiège : le dividend rate s'applique au par, jamais au prix ; le discount rate vient du marché.",
      ],
      [
        "Quelle est la formule du Gordon growth model (constant growth DDM, dividend discount model), et à quelle condition s'applique-t-il ?",
        "$$V_0 = \\dfrac{D_1}{k_e - g_c} = \\dfrac{D_0 (1 + g_c)}{k_e - g_c}$$\nEn clair : où $D_1$ = dividende dans un an, $k_e$ = required return on equity, $g_c$ = croissance constante. Exige $k_e > g_c$ : firme mature. Forte croissance qui ralentit : two-stage ; jeune firme : three-stage DDM.\nPiège : très sensible à $k_e - g_c$ : passer de 4 % à 2 % double la valeur.",
      ],
      [
        "Une action vient de verser un dividende de 2 (« just paid »), croissance constante 5 %, required return 12 %. Valeur selon le Gordon growth model ?",
        "« Just paid » ⇒ ==faire croître le dividende== d'abord : valeur 30\nEn clair : $D_1 = D_0 (1 + g_c)$ = 2 × 1,05 = 2,10 ; Gordon : $V_0 = D_1/(k_e - g_c)$ = 2,10 / (0,12 − 0,05) = 30, où $k_e$ = required return, $g_c$ = croissance.\nPiège : avec $D_0$ au numérateur, on trouve 28,57 (faux).",
      ],
      [
        "Comment estimer le sustainable growth rate g d'une firme ? Exemple : ROE (return on equity) 15 %, dividend payout ratio 40 %.",
        "g = ==9 %==\n$$g = b \\times \\text{ROE} = (1 - \\text{payout ratio}) \\times \\text{ROE}$$\nEn clair : où $b$ = retention rate, la part du Net Income gardée. (1 − 0,40) × 15 % = 9 %. Suppose ROE et payout constants, sans émission d'actions.\nPiège : multiplier par la retention (60 %), pas par le payout (40 %).",
      ],
      [
        "Comment estimer le required return on equity ke d'une action ? Exemple : risk-free rate 3 %, beta 1,5, market risk premium 6 %.",
        "Required return on equity = ==12 %==\n$$k_e = R_f + \\beta \\, [E(R_m) - R_f]$$\nEn clair : c'est le CAPM (capital asset pricing model), où $R_f$ = risk-free rate, $E(R_m) - R_f$ = market risk premium. 3 % + 1,5 × 6 % = 12 %.\nPiège : $k_e$ (exigé par le marché) ≠ ROE (return on equity, rendement comptable).",
      ],
      [
        "Two-stage DDM (dividend discount model) : D0 = 1 vient d'être versé, croissance de 15 % pendant 2 ans puis de 5 % pour toujours, required return 11 %. Valeur de l'action ?",
        "Valeur ≈ ==20,89==\n$$V_0 = \\sum_{t=1}^{n} \\dfrac{D_t}{(1+k_e)^t} + \\dfrac{P_n}{(1+k_e)^n}$$\nEn clair : $D_1$ = 1,15 ; $D_2$ = 1,3225 ; $D_3$ = 1,3886 ; $P_2 = D_3/(k_e - g_c)$ = 1,3886 / 0,06 = 23,144 ($k_e$ = 11 %, $g_c$ = 5 %). $V_0$ = 1,15 / 1,11 + (1,3225 + 23,144) / 1,11² ≈ 20,89.\nPiège : $D_3$ = $D_2$ × 1,05 (croissance stable), pas × 1,15.",
      ],
      [
        "Une firme versera son premier dividende, 2, dans 4 ans, puis il croîtra de 5 % par an. Required return 10 %. Valeur de l'action aujourd'hui selon le DDM (dividend discount model) ?",
        "Valeur ≈ ==30,05== : $P_3$ actualisé sur 3 ans\nEn clair : $P_3 = D_4/(k_e - g_c)$ = 2 / (0,10 − 0,05) = 40, où $k_e$ = required return, $g_c$ = croissance ; $V_0$ = 40 / 1,10³ = 30,05.\nPiège : $P_n = D_{n+1}/(k_e - g_c)$ s'actualise sur n périodes (ici 3), pas n + 1.",
      ],
      [
        "Qu'est-ce que le FCFE (free cash flow to equity), et quand l'utiliser plutôt que les dividendes ?",
        "$$\\text{FCFE} = \\text{CFO} - \\text{FCInv} + \\text{net borrowing}$$\nSi ==pas de dividendes== ou imprévisibles\nEn clair : le cash disponible pour les actionnaires, où CFO = cash flow from operations, FCInv = fixed capital investment. On l'actualise au required return on equity.\nPiège : net borrowing (dette émise − remboursée) s'ajoute au FCFE.",
      ],
      [
        "Formule du justified leading P/E (price-to-earnings) tirée du Gordon growth model ? Exemple : payout ratio 30 %, required return 13 %, croissance 6 %.",
        "Justified leading P/E ≈ ==4,29==\n$$\\dfrac{P_0}{E_1} = \\dfrac{D_1 / E_1}{k_e - g_c}$$\nEn clair : où $D_1/E_1$ = payout ratio, $k_e$ = required return, $g_c$ = croissance. 0,30 / 0,07 = 4,29. Trailing : $P_0/E_0 = (D_0/E_0)(1 + g_c)/(k_e - g_c)$.\nPiège : justified P/E = méthode des fundamentals ; P/E des pairs = méthode des comparables (law of one price).",
      ],
      [
        "Toutes choses égales, qu'est-ce qui augmente le justified P/E (price-to-earnings) d'une action ?",
        "==Payout ↑, croissance ↑ ou required return ↓== ⇒ justified P/E ↑\nEn clair : mais payout ↑ ⇒ retention ↓ ⇒ croissance ↓ (dividend displacement of earnings) : en pratique, l'effet net du payout est ambigu.\nPiège : beta ↑ ⇒ required return ↑ ⇒ justified P/E ↓.",
      ],
      [
        "Comment calcule-t-on l'enterprise value (EV), et quand préférer EV/EBITDA au P/E (price-to-earnings) ?",
        "EV/EBITDA : ==leverage différent== ou NI < 0\n$$\\text{EV} = \\text{MV}_{\\text{equity}} + \\text{MV}_{\\text{pref}} + \\text{MV}_{\\text{debt}} - \\text{cash}$$\nEn clair : EBITDA (earnings before interest, taxes, depreciation and amortization) ignore la capital structure et reste souvent > 0. NI = Net Income ; MV = market value ; cash inclut les short-term investments.\nPiège : dette et preferred en market value (la book value seulement à défaut).",
      ],
      [
        "Quand un asset-based valuation model est-il pertinent pour valoriser une action, et quelles sont ses limites ?",
        "Quand les actifs sont ==tangibles== (fair value facile) ou en liquidation\nEn clair : valeur de l'equity = fair value des assets − liabilities − preferred stock. Limites : gros intangibles (simple plancher), market values introuvables, hyperinflation.",
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
