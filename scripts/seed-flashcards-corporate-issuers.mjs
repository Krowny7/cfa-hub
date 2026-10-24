// Seed script — flashcards "Système" Corporate Issuers (CFA Level I).
// 4 paquets × 15 cartes (60), à réviser en une nuit en combo avec le one-pager
// Corporate Issuers (cfa-work/onepagers/corporate-issuers.html) : chaque notion
// du one-pager a au moins une carte. Chaque carte se comprend seule (cartes
// mélangées) ; phrases en français, termes techniques en anglais. Verso au
// format « trois cases » : l'idée à retenir (≤ 12 mots, ==surligné==, formule
// ou liste), puis « En clair : », puis « Piège : » s'il y a un vrai piège.
// Définitions, formules et chiffres vérifiés sur Schweser Book 1 (R20–26) ;
// mini-calculs recalculés. Les 5 calculs « Top 5 » de lib/calc/corporate.ts
// (cash conversion cycle, NPV, IRR, ROIC, WACC) ont chacun leur carte formule.
// Formules KaTeX ($$…$$ seul sur sa ligne, $…$ en ligne) rendues par
// components/RichText.tsx. Jamais de « $ » monétaire (il ouvrirait une formule).
// Usage : node scripts/seed-flashcards-corporate-issuers.mjs
import { pathToFileURL } from "node:url";
import { getOwnerId, ensureFolder, seedFlashcardSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Corporate Issuers (Système)";

// Anciens titres à supprimer s'ils ont changé (les 4 titres actuels sont gardés).
const oldTitles = [];

export const SETS = [
  {
    title: "Corporate Issuers — Flashcards 1/4 (Formes juridiques & parties prenantes)",
    cards: [
      [
        "Sole proprietorship et general partnership : y a-t-il une entité distincte de l'owner, quelle liability, et comment les profits sont-ils taxés ?",
        "Pas d'entité distincte : liability ==illimitée==, profits taxés en revenu personnel\nEn clair : l'owner (ou les partners) répond de toutes les dettes. Dans un general partnership, un partnership agreement, même oral, répartit tâches et profits.\nPiège : pas de double taxation : profits taxés une seule fois, chez l'owner ou les partners.",
      ],
      [
        "Limited partnership : quel rôle et quelle liability pour les GP (general partners) et les LP (limited partners) ? Qu'est-ce qu'une LLP ?",
        "GP : ==gèrent, liability illimitée== · LP : ==risquent seulement leur mise==\nEn clair : les GP touchent en général la plus grosse part des profits ; les LP ne nomment pas les GP. Profits taxés chez chaque partner.\nPiège : un limited partnership exige au moins un GP ; la LLP (limited liability partnership), elle, n'a que des LP.",
      ],
      [
        "Corporation (limited company) : quelles caractéristiques la distinguent d'un partnership ?",
        "==Entité légale distincte==, limited liability, propriété séparée de la gestion\nEn clair : shareholders → board → managers. Meilleur accès au capital (debt et equity) ; créée par des articles of incorporation.\nPiège : selon le pays, double taxation : sur le profit, puis sur les dividendes.",
      ],
      [
        "Double taxation d'une corporation : comment calcule-t-on le taux effectif d'impôt sur le profit avant impôt ?",
        "Taux effectif avec double taxation\n$$t_{\\text{eff}} = t_c + p\\,(1 - t_c)\\,t_d$$\nEn clair : où $t_c$ = corporate tax rate, $p$ = payout ratio, $t_d$ = tax rate sur dividendes. Tout distribué, $t_c$ = 10 %, $t_d$ = 15 % : 0,10 + 0,90 × 0,15 = 23,5 %.\nPiège : moins la corporation distribue, plus le taux effectif baisse.",
      ],
      [
        "Listed company vs private company : quelles différences de transparence, de reporting et de liquidité des actions ? Qu'est-ce que le free float ?",
        "Listed : ==prix observable, reporting obligatoire== ; private : non\nEn clair : free float = % des actions vraiment échangées (hors insiders, sponsors). Private : valeur peu observable, sortie difficile ; lève par private placement (accredited investors).",
      ],
      [
        "Par quelles 3 voies une private company devient-elle publique, et laquelle ne lève aucun capital neuf ?",
        "IPO : ==capital neuf== · Direct listing : ==aucun capital neuf== · SPAC : ==blank check==\nEn clair : IPO (initial public offering) : avec underwriter. Direct listing : sans underwriter. SPAC (special purpose acquisition company) : IPO, fonds en trust, cible choisie ensuite.\nPiège : private placement : pas de cotation ; buyout = going private.",
      ],
      [
        "Debtholders vs equity holders : quelle nature de claim, quelle priorité et quel upside pour chacun ?",
        "Debt : ==claim contractuel, prioritaire, plafonné== ; equity : claim résiduel\nEn clair : le debtholder touche au mieux intérêts et principal ; l'equity holder a un upside illimité. Moins risquée, la debt coûte moins cher.\nPiège : seuls intérêts et principal sont contractuels, pas les dividendes (même preferred).",
      ],
      [
        "Formule du ROE (return on equity) avec dette ? Application : ventes 1 000, charges fixes 800, actifs 1 000, pas d'impôt ; 100 % equity, puis moitié des actifs financée par dette à 10 %.",
        "ROE avec financial leverage\n$$\\text{ROE} = \\dfrac{(\\text{EBIT} - r_d\\,D)\\,(1 - t)}{E}$$\nEn clair : EBIT (earnings before interest and taxes) = 200 ; $r_d$ = coût de la dette, $D$ = dette, $E$ = equity, $t$ = tax rate. Sans dette : 200 / 1 000 = 20 % ; avec : 150 / 500 = 30 %.\nPiège : ventes −15 % (EBIT 50) : ROE 5 % sans dette, 0 % avec ; le levier amplifie aussi les pertes.",
      ],
      [
        "Pourquoi shareholders et lenders s'opposent-ils sur le niveau de risque, et comment les lenders se protègent-ils ?",
        "Shareholders aiment le risque, lenders non ⇒ ==covenants==\nEn clair : le shareholder garde l'upside du risque (et une nouvelle dette ne le dilue pas) ; le lender n'en a que le downside. Covenants : levier maximum, interest coverage minimum.\nPiège : nouvelle dette ou dividendes accrus nuisent surtout aux lenders de long terme.",
      ],
      [
        "Shareholder theory vs stakeholder theory : sur quoi se concentre la corporate governance dans chacune ?",
        "Shareholder : ==valeur de l'equity== ; stakeholder : tous les groupes concernés\nEn clair : shareholder theory : maximiser la market value de l'equity (conflit managers ↔ owners). Stakeholder theory : équilibrer créanciers, salariés, clients, État, communautés locales.",
      ],
      [
        "Board of directors : quelle composition et quel mode d'élection protègent le mieux les shareholders minoritaires ?",
        "Majorité d'==independent directors==, tout le board élu en même temps\nEn clair : inside directors (dirigeants, fondateurs) : risque de conflit. Two-tier board (Europe continentale) : un supervisory board d'indépendants contrôle le management board.\nPiège : staggered board (une fraction élue par an) : shareholders affaiblis.",
      ],
      [
        "Private debtholders (banques) vs bondholders : qui a accès à l'information non publique de l'entreprise, et qu'est-ce que ça change ?",
        "Banques : ==info privée== ; bondholders : info publique seulement\nEn clair : moins d'information asymmetry : banques clés pour les petites et moyennes firmes. Si elles ont aussi de l'equity, elles renégocient plus volontiers les covenants. Bondholders : guère d'influence.\nPiège : les fournisseurs sont aussi des créanciers court terme.",
      ],
      [
        "ESG (environmental, social and governance) : quels facteurs relèvent du E, du S et du G ?",
        "E : ==climat, pollution, eau, déchets== · S : ==salariés, clients, données, diversité== · G : ==board, rémunération, corruption==\nEn clair : E = impact sur la nature ; S = traitement des salariés, clients et communautés (customer privacy = S) ; G = contrôle des dirigeants (lobbying, political contributions = G).",
      ],
      [
        "Climate risk d'une entreprise : physical risk vs transition risk, et qu'est-ce qu'un stranded asset ?",
        "Physical : météo extrême ; transition : bas carbone ⇒ ==stranded assets==\nEn clair : physical : la météo frappe actifs et opérations ; transition : régulation ou clients imposent le bas carbone. Stranded asset : actif devenu inexploitable.\nPiège : l'equity porte l'essentiel du risque ESG ; la dette n'est touchée qu'en cas de défaut, surtout la longue.",
      ],
      [
        "Principal-agent relationship dans une corporation : qui est le principal, qui est l'agent, et que sont les agency costs ?",
        "Agency costs = ==coûts du conflit principal–agent==\nEn clair : principals = shareholders ; agents = managers et directors, mieux informés (information asymmetry). Coûts directs (surveiller l'agent) ou indirects (affaires perdues).\nPiège : information asymmetry pire : grande firme multi-activités, produits complexes, faible free float.",
      ],
    ],
  },
  {
    title: "Corporate Issuers — Flashcards 2/4 (Gouvernance & liquidité)",
    cards: [
      [
        "Quels conflits d'intérêts typiques opposent les managers aux shareholders d'une corporation ?",
        "Risque ==trop faible== · ==Effort insuffisant== · ==Empire building== · ==Entrenchment== · ==Self-dealing==\nEn clair : risque faible : emploi non diversifiable. Empire building : pay lié à la taille. Entrenchment : se rendre indispensable. Self-dealing : utiliser les ressources de la firme pour soi.\nPiège : payé en stock options, le manager prend trop de risque ; payé en cash, trop peu.",
      ],
      [
        "Controlling shareholders vs minority shareholders : quel conflit peut naître, et que permet une dual-class structure ?",
        "Dual-class : ==contrôle avec moins de 50 %== des droits économiques\nEn clair : des actions à droits de vote renforcés donnent le contrôle. Un controlling shareholder peu diversifié peut vouloir diversifier la firme, contre l'intérêt des minoritaires.\nPiège : CFA Institute s'oppose aux dual-class structures.",
      ],
      [
        "AGM (annual general meeting) vs EGM (extraordinary general meeting) : quelles décisions, quelle majorité, et comment voter sans venir ?",
        "Ordinary resolutions (AGM) : ==majorité simple== des votes exprimés\nEn clair : AGM : comptes audités, élection des directors, approbation de l'auditeur ; vote possible par proxy (confié à un tiers). EGM, à tout moment : statuts (bylaws), fusion ou takeover, liquidation.",
      ],
      [
        "Activist shareholders et hostile takeover : quelles tactiques de l'attaquant, et quelles défenses le management peut-il adopter ?",
        "Attaque : ==proxy contest, tender offer== ; défense : staggered board, poison pill\nEn clair : proxy contest : rallier les votes par proxy ; tender offer : racheter assez d'actions. Staggered board : board élu par fractions ; poison pill : actions bon marché aux actionnaires en place.",
      ],
      [
        "Quels sont les principaux board committees d'une corporation, et le rôle de chacun ?",
        "Audit : ==reporting, auditeur== · Nominating : ==candidats au board== · Compensation : ==pay des dirigeants==\nEn clair : audit : contrôle interne, choix de l'auditeur. Nominating : governance code, conformité. Sectoriels : risk (finance), investment (assurance).\nPiège : compensation committee : independent directors seulement.",
      ],
      [
        "Creditors, employees, customers, suppliers, government : quels mécanismes de governance protègent chacun de ces stakeholders ?",
        "Créanciers : ==indenture, covenants== · Salariés : ==syndicats, ESOP== · Clients, fournisseurs : ==contrats== · État : ==comply or explain==\nEn clair : indenture : covenants, collateral, trustee ; creditor committees si distress. ESOP = employee stock ownership plan. Comply or explain : adopter le code ou dire pourquoi.",
      ],
      [
        "Quels risques crée une corporate governance faible, et quels bénéfices apporte une governance efficace ?",
        "Bonne governance : ==défaut ↓, dette moins chère==, valeur ↑\nEn clair : governance faible : fraude, related-party transactions, risque mal choisi, risques juridique et de réputation, défaut. Bonne : efficacité, performance.\nPiège : « moins de default risk » est un bénéfice, jamais un risque d'une governance faible.",
      ],
      [
        "Quelle est la formule du CCC (cash conversion cycle), et que signifie un CCC court ?",
        "Cash conversion cycle : ==plus court = mieux==\n$$\\text{CCC} = \\text{DOH} + \\text{DSO} - \\text{DPO}$$\nEn clair : DOH = days of inventory on hand, DSO = days sales outstanding, DPO = days payable outstanding. Ex. 45 + 38 − 30 = 53 jours. Pharma : CCC long ; aérien (ventes prépayées) : court.\nPiège : payer plus tard (DPO ↑) raccourcit le CCC ; DPO de 50 à 40 jours : CCC + 10 jours.",
      ],
      [
        "Trade credit « a/b net c » : quel EAR (effective annual rate) coûte le renoncement au discount ? Exemple : 2/10 net 30.",
        "Coût de renoncer au discount\n$$\\text{EAR} = \\left(1 + \\dfrac{a}{1-a}\\right)^{365/(c-b)} - 1$$\nEn clair : discount $a$ si paiement sous $b$ jours, sinon tout sous $c$ jours : on emprunte $c - b$ jours au fournisseur. 2/10 net 30 : (1 + 0,02/0,98)^(365/20) − 1 = 44,6 %.\nPiège : 1,5/15 net 40 sur 150 000 : on paie 2 250 pour garder 147 750 (pas 150 000) pendant 25 jours.",
      ],
      [
        "Current ratio, quick ratio, cash ratio : que met-on au numérateur de chacun, et lequel est le plus strict ?",
        "Cash ratio ==le plus strict== : ni stocks ni receivables\nEn clair : dénominateur commun : current liabilities. Current : tous les current assets ; quick : cash + marketable securities + receivables ; cash : cash + marketable securities.\nPiège : le quick ratio exclut seulement les stocks, l'actif courant le moins liquide.",
      ],
      [
        "Sources de liquidité primary vs secondary : exemples, et pourquoi une entreprise évite-t-elle les secondaires ?",
        "Secondary : ==coûteuses et signal négatif== pour le marché\nEn clair : primary : cash, titres, lignes bancaires, cash de l'activité. Secondary : couper le dividende, reporter l'investissement, vendre des actifs, émettre des actions, restructurer, bankruptcy.\nPiège : vente forcée = décote sur la fair value : le cost of liquidity.",
      ],
      [
        "Drag on liquidity vs pull on liquidity : quelle différence, et quel effet sur le cash conversion cycle ?",
        "Drag : ==encaissements ralentis== ; pull : décaissements accélérés\nEn clair : drag : stocks en excès ou obsolètes, clients lents ou défaillants. Pull : fournisseurs qui réduisent leur crédit ou exigent d'être payés plus vite. Les deux allongent le cash conversion cycle.",
      ],
      [
        "Working capital management : approche conservative, aggressive ou moderate, comment chacune finance-t-elle les current assets ?",
        "Conservative : ==financement long terme== · Aggressive : ==dette court terme== · Moderate : ==permanent long, saisonnier court==\nEn clair : conservative : beaucoup de current assets, sûr mais cher. Aggressive : peu, moins cher, risque de roll-over. Moderate : besoins permanents financés long terme, saisonniers court terme.",
      ],
      [
        "Net working capital : comment le calcule-t-on, et comment comparer des entreprises de tailles différentes ?",
        "Net working capital : ==éléments opérationnels seulement==, en % des ventes\nEn clair : (current assets − cash − marketable securities) − (current liabilities − short-term debt − current portion of long-term debt). Lié au cash conversion cycle ; comparer entre pairs du secteur.\nPiège : total working capital = current assets − current liabilities.",
      ],
      [
        "Quels facteurs déterminent les sources de financement court terme auxquelles une entreprise a accès ?",
        "==Taille== · ==Creditworthiness== · ==Système juridique== · ==Régulation== · ==Actifs à nantir==\nEn clair : petite firme : peu d'options. Crédit faible : taux et contraintes plus lourds. Droit protecteur des prêteurs : plus d'options. Banques, utilities : sources encadrées. Actifs = collateral.",
      ],
    ],
  },
  {
    title: "Corporate Issuers — Flashcards 3/4 (Capital allocation & coût du capital)",
    cards: [
      [
        "Quels sont les 4 types de capital investments, et lesquels exigent l'analyse la plus détaillée ?",
        "==Going concern== · ==Regulatory== · ==Expansion== · ==Other==\nEn clair : going concern (budget ≈ depreciation annuelle) : maintenir, analyse légère ; ou baisser les coûts. Regulatory : imposé, peu de revenus. Expansion, other : analyse détaillée.\nPiège : remplacer une machine pour réduire les coûts = going concern, pas expansion.",
      ],
      [
        "Quelles sont les 4 étapes du capital allocation process, et laquelle est la plus importante ?",
        "==Idea generation== (la clé) → analyse → capital budget → post-audit\nEn clair : analyse : prévoir les cash flows des projets. Budget : prioriser selon timing, ressources, stratégie. Post-audit : comparer réalisé et prévu pour améliorer les prévisions.\nPiège : arranger le financement n'est pas une étape du process.",
      ],
      [
        "Formule de la NPV (net present value) d'un projet et règle de décision ? Application : copieur à 5 000, cash flows de 3 000, 2 000 et 2 000 sur 3 ans, required return 10 %.",
        "Accepter si ==NPV > 0==\n$$\\text{NPV} = -CF_0 + \\sum_{t=1}^{n} \\dfrac{CF_t}{(1+r)^t}$$\nEn clair : $CF_0$ = investissement initial, $CF_t$ = cash flow incrémental après impôt, $r$ = cost of capital du projet. Copieur : 3 000/1,1 + 2 000/1,1² + 2 000/1,1³ − 5 000 ≈ +883 : accepter.\nPiège : ne pas retirer les intérêts des cash flows : le coût du financement est déjà dans $r$.",
      ],
      [
        "Comment définit-on l'IRR (internal rate of return) d'un projet, et quelle est la règle de décision ?",
        "IRR : taux qui ==annule la NPV==\n$$-CF_0 + \\sum_{t=1}^{n} \\dfrac{CF_t}{(1+\\text{IRR})^t} = 0$$\nEn clair : NPV = net present value ; $CF_0$ = investissement, $CF_t$ = cash flows. Accepter si IRR > hurdle rate (required rate of return).\nPiège : NPV < 0 ⇔ taux d'actualisation > IRR.",
      ],
      [
        "Formule de l'IRR (internal rate of return) d'un projet à un seul cash flow futur ? Application : 10 000 investis, rien en année 1, 12 100 en fin d'année 2.",
        "IRR à un seul cash flow\n$$\\text{IRR} = \\left(\\dfrac{CF_n}{CF_0}\\right)^{1/n} - 1$$\nEn clair : $CF_0$ = investissement, $CF_n$ = cash flow reçu en année $n$. Application : (12 100 / 10 000)^(1/2) − 1 = 1,1 − 1 = 10 %.\nPiège : à la calculatrice, le cash flow de l'année 1 se saisit à 0 : il ne se saute pas.",
      ],
      [
        "NPV (net present value) et IRR (internal rate of return) classent différemment deux projets mutuellement exclusifs : lequel suivre, et pourquoi ?",
        "La ==NPV l'emporte== toujours\nEn clair : la NPV mesure la richesse créée et suppose un réinvestissement au cost of capital, plus réaliste qu'à l'IRR. Atout de l'IRR : un %, qui montre la margin of safety.\nPiège : plusieurs changements de signe des cash flows ⇒ plusieurs IRR possibles.",
      ],
      [
        "Quelle est la formule du ROIC (return on invested capital), et quand l'entreprise crée-t-elle de la valeur ?",
        "Valeur créée si ==ROIC > required return==\n$$\\text{ROIC} = \\dfrac{\\text{NOPAT}}{\\text{avg invested capital}} = \\dfrac{\\text{NOPAT}}{\\text{sales}} \\times \\dfrac{\\text{sales}}{\\text{avg invested capital}}$$\nEn clair : NOPAT (net operating profit after tax) = operating profit × (1 − tax rate) ; capital = dette long terme + equity, en book value, moyenne. Ex. operating profit 300, impôt 25 %, capital 1 500 : 15 %.\nPiège : ROIC comptable, rétrospectif et global : il peut masquer de mauvais projets.",
      ],
      [
        "Analyse d'un projet : quels cash flows inclure, et que faire des sunk costs, de la cannibalization et des externalities ?",
        "Cash flows ==incrémentaux après impôt== ; sunk costs exclus\nEn clair : inclure cannibalization (ventes perdues ailleurs), positive externalities, opportunity costs et économies d'impôt de la depreciation. Le timing compte ; pas le résultat comptable.\nPiège : une étude de marché déjà payée est un sunk cost : on l'exclut.",
      ],
      [
        "Quelles erreurs et quels behavioral biases faussent souvent les décisions de capital allocation ?",
        "Fonds internes ==jamais gratuits== · ==Inflation mal traitée== · ==Pet projects== · ==Budget figé== · Viser ==EPS ou ROE==\nEn clair : fonds internes : coût = cost of equity. Pet project : chouchou d'un dirigeant. Budget figé : celui de l'an passé, reconduit. EPS (earnings per share), ROE (return on equity) : vue court terme.\nPiège : cash flows réels → taux réel ; nominaux → nominal.",
      ],
      [
        "Quels sont les principaux types de real options d'un projet ?",
        "==Timing== · ==Abandonment== · ==Expansion== · ==Flexibility== · ==Fundamental==\nEn clair : timing : attendre d'en savoir plus. Flexibility : prix ou production (heures sup). Fundamental : payoff lié au prix d'un sous-jacent (mine de cuivre).\nPiège : droits d'un roman à filmer = expansion ; convertir sa production = flexibility.",
      ],
      [
        "Comment intègre-t-on une real option dans l'analyse d'un projet, et sa valeur peut-elle être négative ?",
        "Real option ==jamais négative== : on ne l'exerce que si elle rapporte\nEn clair : NPV (net present value) avec option = NPV sans option + valeur de l'option − coût de l'option. Autre approche : la NPV sans option = valeur minimum du projet.\nPiège : abandon optimal si la PV (present value) de l'abandon dépasse celle des cash flows à continuer.",
      ],
      [
        "Quelle est la formule du WACC (weighted average cost of capital) ?",
        "$$\\text{WACC} = w_d\\,r_d\\,(1-t) + w_p\\,r_p + w_e\\,r_e$$\nEn clair : $w$ = poids cibles en market value, $r_d$ = coût avant impôt de la dette, $r_p$ = des preferred, $r_e$ = de l'equity, $t$ = tax rate. Ex. 60 % de dette à 6 %, t = 15 %, equity à 12 % : 3,06 % + 4,8 % = 7,86 %.\nPiège : seule la dette est nette d'impôt ; $r_d$ = yield to maturity, pas le coupon.",
      ],
      [
        "WACC (weighted average cost of capital) : quels poids utiliser, et comment passer d'un ratio D/E (debt-to-equity) au poids de la dette ?",
        "Poids ==cibles, en market value==\n$$w_d = \\dfrac{D/E}{1 + D/E}$$\nEn clair : à défaut de cible annoncée : structure actuelle en market value, tendance, ou moyenne du secteur. Ex. D/E = 0,5 : $w_d$ = 0,5 / 1,5 = 1/3, $w_e$ = 2/3.\nPiège : D/E n'est pas un poids ; market values plutôt que book values si les deux sont données.",
      ],
      [
        "Comment estimer le cost of equity avec le CAPM (capital asset pricing model) ?",
        "$$r_e = R_f + \\beta\\,[E(R_m) - R_f]$$\nEn clair : $R_f$ = risk-free rate, $E(R_m)$ = rendement attendu du marché, $\\beta = \\text{Cov}(R_i, R_m)/\\sigma_m^2$. Ex. $R_f$ = 3 %, β = 1,2, market risk premium = 5 % : 3 % + 1,2 × 5 % = 9 %.\nPiège : β multiplie la market risk premium $E(R_m) - R_f$, pas $E(R_m)$.",
      ],
      [
        "Quels facteurs top-down (macroéconomiques) influencent le cost of capital d'une entreprise, et que font les credit spreads en récession ?",
        "==Inflation== · ==Real GDP growth== · ==Monetary policy== · ==Exchange rates==\nEn clair : ils font bouger le benchmark rate (taux des Treasuries) et les credit spreads. En récession, les spreads s'élargissent, surtout pour les secteurs cycliques.\nPiège : certains secteurs en profitent : spreads pétroliers ↓ quand le prix du pétrole monte.",
      ],
    ],
  },
  {
    title: "Corporate Issuers — Flashcards 4/4 (Structure du capital & business models)",
    cards: [
      [
        "Quelles caractéristiques d'une entreprise lui permettent de porter davantage de dette dans sa capital structure ?",
        "==Cash flows stables== et actifs tangibles, liquides\nEn clair : secteur non cyclique, revenus par abonnement, faible operating leverage (peu de coûts fixes), business risk faible, actifs qui servent de collateral.",
      ],
      [
        "Comment l'accès à la dette évolue-t-il selon le stade de vie d'une entreprise : start-up, growth, mature ?",
        "Start-up : ==presque tout en equity== · Growth : ==dette prudente, garantie== · Mature : ==unsecured debt bon marché==\nEn clair : start-up : cash flows faibles, peu de collateral, business risk élevé ; parfois convertible debt ou leasing. Growth : prêts garantis (fixed assets, receivables). Mature : gros cash flows stables.",
      ],
      [
        "Que dit la proposition I de Modigliani–Miller (MM) sans impôts, et sous quelles hypothèses ?",
        "Valeur ==indépendante de la capital structure==\n$$V_L = V_U$$\nEn clair : $V_L$ = valeur avec dette, $V_U$ = sans dette. Hypothèses : ni impôts ni coûts de faillite, attentes homogènes, emprunt au risk-free rate, pas d'agency costs, investissement indépendant du financement.",
      ],
      [
        "Proposition II de Modigliani–Miller (MM) sans impôts : comment évoluent le cost of equity et le WACC (weighted average cost of capital) quand la dette augmente ?",
        "Cost of equity ==monte==, WACC constant\n$$r_e = r_0 + (r_0 - r_d)\\,\\dfrac{D}{E}$$\nEn clair : où $r_0$ = coût du capital 100 % equity, $r_d$ = coût de la dette, $D/E$ = debt-to-equity. La hausse de $r_e$ compense exactement la dette moins chère.\nPiège : seul le cost of equity bouge : coût de la dette, WACC et valeur ne changent pas.",
      ],
      [
        "Modigliani–Miller (MM) avec impôts : que deviennent la valeur de la firme et le WACC (weighted average cost of capital) quand la dette augmente ?",
        "Valeur ==maximale à 100 % de dette==\n$$V_L = V_U + t\\,D$$\nEn clair : le tax shield $t\\,D$ ($t$ = tax rate, $D$ = dette) ajoute de la valeur ; le WACC baisse quand la dette monte. $r_0$ = coût sans dette, $r_d$ = coût de la dette.\nPiège : le cost of equity monte encore, mais moins vite : $r_e = r_0 + (r_0 - r_d)(1-t)\\,D/E$.",
      ],
      [
        "Static trade-off theory : où se situe la capital structure optimale d'une entreprise ?",
        "Optimum : ==WACC minimum, valeur maximum==\n$$V_L = V_U + t\\,D - \\text{PV(costs of financial distress)}$$\nEn clair : PV = present value, $t$ = tax rate. Distress : coûts directs (frais juridiques), indirects (confiance perdue) et agency costs of debt ; leur probabilité monte avec la dette.\nPiège : optimum = écart $V_L - V_U$ maximal ; le cost of equity, lui, monte toujours.",
      ],
      [
        "Target capital structure : managers vs analystes, en book ou en market values, et pourquoi la structure réelle s'écarte-t-elle de la cible ?",
        "Managers et rating agencies : ==book values== ; analystes : market values\nEn clair : les fluctuations de marché ne changent pas la dette supportable. Écarts à la cible : cours de l'equity, émissions opportunistes, émissions par lots de taille minimale.\nPiège : un écart voulu (nouvelle dette émise) inquiète plus qu'un écart subi (chute du cours).",
      ],
      [
        "Pecking order theory : dans quel ordre les managers préfèrent-ils se financer, et pourquoi ?",
        "==Fonds internes → dette → nouvelles actions==\nEn clair : fondée sur l'information asymmetry : les managers choisissent le financement au signal le moins négatif ; les fonds internes, invisibles des investisseurs, n'en envoient presque aucun.\nPiège : émettre de la dette = signal de confiance ; émettre des actions = signal négatif.",
      ],
      [
        "Net agency costs of equity : quelles composantes, et pourquoi la free cash flow hypothesis dit-elle que la dette les réduit ?",
        "==Monitoring costs== · ==Bonding costs== · ==Residual losses==\nEn clair : monitoring : surveiller (board, reporting). Bonding : rassurer (assurance, non-concurrence). Residual losses : pertes malgré tout. Free cash flow hypothesis : la dette réduit le cash à gaspiller.\nPiège : non-concurrence = bonding cost, pas monitoring ni pecking order.",
      ],
      [
        "Quelles questions un business model doit-il couvrir, et qu'est-ce que la channel strategy ?",
        "==Who== clients · ==What== produit · ==How== actifs · ==Where== canaux · ==How much== prix\nEn clair : channel strategy : direct ou intermédiaires ; omnichannel = digital + physique. B2B (business to business), B2C (business to consumer).\nPiège : prévisions détaillées de revenus et coûts : financial plan, pas business model.",
      ],
      [
        "Value proposition vs value chain d'une entreprise : quelle différence ?",
        "Value proposition : ==ce que valorise le client== ; value chain : l'exécution\nEn clair : value proposition : comment le client valorise le produit face à la concurrence. Value chain : actifs et organisation qui tiennent la promesse.\nPiège : value chain = interne à la firme ; supply chain = interne + externe, jusqu'au client final.",
      ],
      [
        "Price discrimination : que sont le tiered pricing, le dynamic pricing, le value-based pricing et l'auction pricing ?",
        "Tiered : ==volume== · Dynamic : ==moment== · Value-based : ==valeur perçue== · Auction : ==enchères==\nEn clair : price discrimination = prix différents selon les clients. Tiered : remise sur gros volumes ; dynamic : heures pleines ou creuses.\nPiège : salon −50 % le lundi, +20 % le samedi = dynamic pricing, pas tiered.",
      ],
      [
        "Bundling, razors-and-blades, add-on pricing : comment fonctionnent ces pricing models multi-produits ?",
        "Bundling : ==produits groupés== · Razors-and-blades : ==profit sur les consommables== · Add-on : ==options après décision d'achat==\nEn clair : razors-and-blades : imprimante bon marché, encre chère. Add-on : options à forte marge, après la décision d'achat (voiture).\nPiège : vélo + options premium à forte marge = add-on, pas bundling.",
      ],
      [
        "Penetration pricing, freemium, hidden revenue : quelle différence entre ces pricing models ?",
        "Penetration : ==bas prix temporaire== · Freemium : ==base gratuite, options payantes== · Hidden revenue : ==pub ou données==\nEn clair : penetration : marge faible, voire perte, pour gagner du marché. Autres : subscription, licensing, franchising.\nPiège : jeu 100 % gratuit, payé par la pub = hidden revenue, pas freemium.",
      ],
      [
        "Private label, licensing, VAR (value-added reseller) : que font ces business models, et que sont les network effects ?",
        "Private label : ==fabriquer pour autrui== · Licensing : ==marque louée contre redevance== · VAR : ==ajoute installation, service==\nEn clair : network effects : la valeur du réseau croît avec ses utilisateurs (souvent two-sided) ; ils justifient un penetration pricing. Crowdsourcing : les utilisateurs contribuent.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "flashcards");
  console.log("Flashcards — Système Corporate Issuers (4 paquets × 15)...");
  const total = await seedFlashcardSets({ ownerId, folderId, sets: SETS, oldTitles });
  console.log(`\n✅ Terminé. ${total} cartes ajoutées.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  });
}
