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
        "Entité distincte : ==aucune== · Liability : ==illimitée== · Profits : ==taxés en revenu personnel==\nEn clair : L'owner (ou chaque partner) répond de toutes les dettes. Un partnership agreement, même oral, répartit tâches et profits.\nPiège : pas de double taxation : profits taxés une seule fois.",
      ],
      [
        "Limited partnership et LLP (limited liability partnership) : quel rôle et quelle liability pour les GP (general partners) et les LP (limited partners) ?",
        "GP : ==gèrent, liability illimitée== · LP : ==risquent seulement leur mise== · LLP : ==que des limited partners==\nEn clair : Les GP touchent en général la plus grosse part des profits ; les LP ne nomment pas les GP. Les profits sont taxés chez chaque partner.\nPiège : un limited partnership exige au moins un GP, une LLP non.",
      ],
      [
        "Corporation (limited company) : quelles caractéristiques la distinguent d'un partnership ?",
        "==Entité légale distincte== · ==Limited liability== · Owners ==séparés des managers==\nEn clair : Créée par des articles of incorporation, la corporation a le meilleur accès au capital. Les shareholders élisent le board, qui embauche les managers.\nPiège : selon le pays, double taxation : sur le profit, puis sur les dividendes.",
      ],
      [
        "Formule du taux effectif d'impôt d'une corporation avec double taxation ? Application : profits tous distribués, corporate tax rate 10 %, tax rate sur dividendes 15 %.",
        "Taux effectif avec double taxation\n$$t_{\\text{eff}} = t_c + p\\,(1 - t_c)\\,t_d$$\nEn clair : 0,10 + 1 × (1 − 0,10) × 0,15 = 23,5 %, avec $t_c$ = corporate tax rate, $p$ = payout ratio, $t_d$ = tax rate sur dividendes.\nPiège : moins la corporation distribue ($p$ ↓), plus le taux effectif baisse.",
      ],
      [
        "Listed company vs private company : quelles différences de transparence, de reporting et de liquidité des actions ? Qu'est-ce que le free float ?",
        "Listed : ==prix observable, reporting obligatoire== · Private : ==valeur opaque, sortie difficile== · Free float : ==actions vraiment échangées==\nEn clair : Le free float exclut insiders et sponsors ; on l'exprime en % des actions. Une private company lève par private placement (accredited investors).",
      ],
      [
        "Par quelles 3 voies une private company devient-elle publique, et laquelle ne lève aucun capital neuf ?",
        "IPO : ==vend des actions nouvelles au public== · Direct listing : ==actions existantes cotées== → aucun capital neuf · SPAC : ==coquille cotée qui rachète une private company==\nEn clair : L'IPO (initial public offering) passe par un underwriter. La SPAC (special purpose acquisition company) lève son cash par IPO.\nPiège : private placement : pas de cotation ; buyout = going private.",
      ],
      [
        "Debtholders vs equity holders : quelle nature de claim, quelle priorité et quel upside pour chacun ?",
        "Debt : ==claim contractuel, prioritaire, plafonné== · Equity : ==claim résiduel, upside illimité==\nEn clair : Le debtholder touche au mieux les intérêts et le principal. Moins risquée, la debt coûte moins cher que l'equity.\nPiège : seuls intérêts et principal sont contractuels, pas les dividendes (même preferred).",
      ],
      [
        "Formule du ROE (return on equity) avec dette ? Application : ventes 1 000, charges fixes 800, actifs 1 000, pas d'impôt ; 100 % equity, puis moitié des actifs financée par dette à 10 %.",
        "ROE avec financial leverage\n$$\\text{ROE} = \\dfrac{(\\text{EBIT} - r_d\\,D)\\,(1 - t)}{E}$$\nEn clair : EBIT (earnings before interest and taxes) = 200 et $t$ = 0. Sans dette : 200 / 1 000 = 20 % ; avec $D$ = 500 à $r_d$ = 10 % et $E$ = 500 : (200 − 50) / 500 = 30 %.\nPiège : ventes −15 % (EBIT 50) : ROE 5 % sans dette, 0 % avec ; le levier amplifie aussi les pertes.",
      ],
      [
        "Pourquoi shareholders et lenders s'opposent-ils sur le niveau de risque, et comment les lenders se protègent-ils ?",
        "Shareholders : ==gardent l'upside== · Lenders : ==n'ont que le downside== · Protection : ==covenants==\nEn clair : Une nouvelle dette rend l'ancienne plus risquée sans diluer les shareholders. Covenants : levier maximum, interest coverage minimum.\nPiège : nouvelle dette ou dividendes accrus nuisent surtout aux lenders long terme.",
      ],
      [
        "Shareholder theory vs stakeholder theory : sur quoi se concentre la corporate governance dans chacune ?",
        "Shareholder theory : ==maximiser la market value de l'equity== · Stakeholder theory : ==concilier les intérêts de chaque stakeholder==\nEn clair : La shareholder theory se concentre sur le conflit managers ↔ owners. La stakeholder theory y ajoute créanciers, salariés, clients, fournisseurs, État et communautés locales.",
      ],
      [
        "Board of directors : quelle composition et quel mode d'élection protègent le mieux les shareholders minoritaires ?",
        "==Majorité d'independent directors== · Élection : ==full board election==\nEn clair : Les inside directors (dirigeants) risquent des conflits d'intérêts. En Europe continentale, un supervisory board d'indépendants contrôle le management board : le two-tier board.\nPiège : staggered board (une fraction élue par an) : shareholders affaiblis.",
      ],
      [
        "Private debtholders (banques) vs bondholders : qui a accès à l'information non publique de l'entreprise, et qu'est-ce que ça change ?",
        "Banques : ==accès à l'info privée== · Bondholders : ==info publique, peu d'influence==\nEn clair : Moins d'information asymmetry rend les banques clés pour les petites firmes. Si elles ont aussi de l'equity, elles renégocient plus volontiers les covenants.\nPiège : les fournisseurs sont aussi des créanciers court terme.",
      ],
      [
        "ESG (environmental, social and governance) : quels facteurs relèvent du E, du S et du G ?",
        "E : ==climat, pollution, eau, déchets== · S : ==salariés, clients, données, diversité== · G : ==board, rémunération, corruption==\nEn clair : Le E mesure l'impact sur la nature, le S le traitement des salariés, clients et communautés. Customer privacy relève du S ; lobbying et political contributions, du G.",
      ],
      [
        "Climate risk d'une entreprise : physical risk vs transition risk, et qu'est-ce qu'un stranded asset ?",
        "Physical risk : ==dégâts du climat sur les actifs== · Transition risk : ==coût du passage au bas carbone== · Stranded asset : ==actif devenu inexploitable==\nEn clair : Le transition risk (régulation, technologie, clients) crée des stranded assets, comme des réserves fossiles.\nPiège : la dette ne souffre qu'en cas de défaut (surtout la longue) ; l'equity porte l'essentiel du risque.",
      ],
      [
        "Principal-agent relationship dans une corporation : qui est le principal, qui est l'agent, et que sont les agency costs ?",
        "Principals : ==shareholders== · Agents : ==managers, directors== · Agency costs : ==coûts des conflits d'intérêts==\nEn clair : Les agents sont mieux informés (information asymmetry). Coûts directs : surveiller l'agent ; indirects : affaires perdues.\nPiège : information asymmetry plus forte : grande firme diversifiée, produits complexes, faible free float.",
      ],
    ],
  },
  {
    title: "Corporate Issuers — Flashcards 2/4 (Gouvernance & liquidité)",
    cards: [
      [
        "Quels conflits d'intérêts typiques opposent les managers aux shareholders d'une corporation ?",
        "Risk appetite : ==prise de risque mal dosée== · Insufficient effort : ==s'investir trop peu== · Empire building : ==grossir la firme pour son pay== · Entrenchment : ==s'accrocher à son poste== · Self-dealing : ==se servir sur la firme==\nEn clair : Payé en cash, le manager prend trop peu de risque (son emploi est en jeu) ; payé en stock options, trop.",
      ],
      [
        "Controlling shareholders vs minority shareholders : quel conflit peut naître, et que permet une dual-class structure ?",
        "Controlling : ==assez de votes pour décider seul== · Minority : ==trop peu de votes pour peser== · Dual-class : ==vote renforcé → contrôle sans majorité du capital==\nEn clair : Un controlling shareholder peu diversifié peut vouloir diversifier la firme, contre l'intérêt des minority shareholders.\nPiège : CFA Institute s'oppose aux dual-class structures.",
      ],
      [
        "AGM (annual general meeting) vs EGM (extraordinary general meeting) : quelles décisions, quelle majorité, et comment voter sans venir ?",
        "AGM : ==comptes, directors, auditeur== · EGM : ==bylaws, fusion, takeover, liquidation== · Ordinary resolutions : ==majorité simple== · Sans venir : ==vote par proxy==\nEn clair : L'AGM suit la clôture annuelle ; l'EGM se tient dès qu'un vote l'exige. Par proxy, on confie son vote à un tiers.",
      ],
      [
        "Activist shareholders et hostile takeover : quelles tactiques de l'attaquant, et quelles défenses le management peut-il adopter ?",
        "Proxy contest : ==rallier les votes des shareholders== → attaque · Tender offer : ==offre d'achat directe aux shareholders== → attaque · Staggered board : ==board élu par fractions== → défense · Poison pill : ==dilue l'attaquant (actions bon marché)== → défense\nEn clair : Un hostile takeover se fait contre l'avis du board et du management.",
      ],
      [
        "Quels sont les principaux board committees d'une corporation, et le rôle de chacun ?",
        "Audit : ==contrôle le reporting et l'audit== · Nominating : ==sélectionne les candidats au board== · Compensation : ==propose le pay des dirigeants==\nEn clair : L'audit committee suit le contrôle interne, le nominating committee le governance code. Finance : risk committee ; assurance : investment committee.\nPiège : compensation committee : independent directors seulement.",
      ],
      [
        "Creditors, employees, customers, suppliers, government : quels mécanismes de governance protègent chacun de ces stakeholders ?",
        "Créanciers : ==indenture, covenants== · Salariés : ==syndicats, ESOP== · Clients, fournisseurs : ==contrats== · État : ==régulation, comply or explain==\nEn clair : L'indenture fixe covenants et collateral ; en distress, des creditor committees se forment. ESOP = employee stock ownership plan. Comply or explain : suivre le code ou s'expliquer.",
      ],
      [
        "Quels risques crée une corporate governance faible, et quels bénéfices apporte une governance efficace ?",
        "Faible : ==fraude, défaut, risque juridique== · Efficace : ==défaut ↓, valeur ↑==\nEn clair : Une governance faible ouvre la porte aux related-party transactions et aux mauvais choix de risque. Une bonne governance rend la dette moins chère.\nPiège : « moins de default risk » est un bénéfice, jamais un risque d'une governance faible.",
      ],
      [
        "Formule du CCC (cash conversion cycle) ? Application : DOH 45 jours, DSO 38 jours, DPO 30 jours.",
        "CCC court = ==cash récupéré plus vite==\n$$\\text{CCC} = \\text{DOH} + \\text{DSO} - \\text{DPO}$$\nEn clair : CCC = 45 + 38 − 30 = 53 jours, avec DOH = days of inventory on hand, DSO = days sales outstanding, DPO = days payable outstanding.\nPiège : payer plus tard (DPO ↑) raccourcit le CCC ; DPO de 50 à 40 jours : CCC + 10 jours.",
      ],
      [
        "Formule de l'EAR (effective annual rate) du trade credit « a/b net c » quand on renonce au discount ? Application : 2/10 net 30.",
        "Coût de renoncer au discount\n$$\\text{EAR} = \\left(1 + \\dfrac{a}{1-a}\\right)^{365/(c-b)} - 1$$\nEn clair : 2/10 net 30 : (1 + 0,02/0,98)^(365/20) − 1 = 44,6 %. Discount $a$ si l'on paie sous $b$ jours, sinon tout sous $c$ jours : on emprunte $c - b$ jours.\nPiège : le taux par période est $a/(1-a)$, pas $a$ : on paie 2 pour garder 98, pas 100.",
      ],
      [
        "Current ratio, quick ratio, cash ratio : que met-on au numérateur de chacun, et lequel est le plus strict ?",
        "Current ratio : ==tous les current assets== · Quick ratio : ==cash + marketable securities + receivables== · Cash ratio : ==cash + marketable securities== → le plus strict\nEn clair : Les trois divisent par les current liabilities. Le quick ratio exclut les stocks (inventory) ; le cash ratio exclut aussi les receivables.",
      ],
      [
        "Sources de liquidité primary vs secondary : exemples, et pourquoi une entreprise évite-t-elle les secondaires ?",
        "Primary : ==ressources courantes (cash, lignes bancaires, trade credit)== · Secondary : ==mesures exceptionnelles (vendre des actifs…)== → coûteuses\nEn clair : Les sources secondary (couper le dividende, émettre des actions, bankruptcy…) envoient un signal négatif.\nPiège : vente forcée = décote sur la fair value : le cost of liquidity.",
      ],
      [
        "Drag on liquidity vs pull on liquidity : quelle différence, et quel effet sur le cash conversion cycle ?",
        "Drag : ==encaissements ralentis== · Pull : ==décaissements accélérés== · Effet : ==cash conversion cycle allongé==\nEn clair : Drag : stocks en excès ou obsolètes, clients lents ou défaillants. Pull : fournisseurs qui réduisent leur crédit ou exigent d'être payés plus vite.",
      ],
      [
        "Working capital management : approche conservative, aggressive ou moderate, comment chacune finance-t-elle les current assets ?",
        "Conservative : ==financement long terme== · Aggressive : ==dette court terme== · Moderate : ==permanent long, saisonnier court==\nEn clair : L'approche conservative garde beaucoup de current assets : sûre mais chère. L'aggressive en garde peu : moins chère, mais avec un risque de roll-over de la dette court terme.",
      ],
      [
        "Formule du NWC (net working capital) d'une entreprise ?",
        "Net working capital : opérationnel seulement\n$$\\text{NWC} = \\text{CA}_{\\text{op}} - \\text{CL}_{\\text{op}}$$\nEn clair : $\\text{CA}_{\\text{op}}$ = current assets − cash − marketable securities ; $\\text{CL}_{\\text{op}}$ = current liabilities − short-term debt − current portion of long-term debt. Pour comparer des tailles différentes : NWC en % des ventes.\nPiège : total working capital = current assets − current liabilities, sans retraitement.",
      ],
      [
        "Quels facteurs déterminent les sources de financement court terme auxquelles une entreprise a accès ?",
        "==Taille== · ==Creditworthiness== · ==Système juridique== · ==Régulation== · ==Actifs à nantir==\nEn clair : Une petite firme ou un crédit faible ont moins d'options, plus chères. Un droit protecteur des prêteurs en ouvre davantage. Banques et utilities ont des sources encadrées.",
      ],
    ],
  },
  {
    title: "Corporate Issuers — Flashcards 3/4 (Capital allocation & coût du capital)",
    cards: [
      [
        "Quels sont les 4 types de capital investments, et lesquels exigent l'analyse la plus détaillée ?",
        "Going concern : ==maintenir ou baisser les coûts== · Regulatory : ==imposé (État, assureur), peu de revenus== · Expansion : ==faire grandir l'activité== · Other : ==hors des métiers actuels==\nEn clair : Expansion et other projects exigent l'analyse la plus détaillée, les going concern projects très peu.\nPiège : remplacer une machine pour baisser les coûts = going concern.",
      ],
      [
        "Quelles sont les 4 étapes du capital allocation process, et laquelle est la plus importante ?",
        "==Idea generation== (la clé) → analyse → capital budget → post-audit\nEn clair : L'analyse prévoit les cash flows de chaque projet ; le capital budget les priorise (timing, ressources, stratégie). Le post-audit compare réalisé et prévu pour améliorer les prévisions.\nPiège : arranger le financement n'est pas une étape du process.",
      ],
      [
        "Formule de la NPV (net present value) d'un projet et règle de décision ? Application : copieur à 5 000, cash flows de 3 000, 2 000 et 2 000 sur 3 ans, required return 10 %.",
        "Accepter si ==NPV > 0==\n$$\\text{NPV} = -CF_0 + \\sum_{t=1}^{n} \\dfrac{CF_t}{(1+r)^t}$$\nEn clair : 3 000/1,1 + 2 000/1,1² + 2 000/1,1³ − 5 000 ≈ +883 : accepter. $CF_0$ = investissement initial, $CF_t$ = cash flow incrémental après impôt, $r$ = cost of capital.\nPiège : ne pas retirer les intérêts des cash flows : le coût du financement est déjà dans $r$.",
      ],
      [
        "Formule de l'IRR (internal rate of return) d'un projet et règle de décision ?",
        "Accepter si ==IRR > hurdle rate==\n$$-CF_0 + \\sum_{t=1}^{n} \\dfrac{CF_t}{(1+\\text{IRR})^t} = 0$$\nEn clair : L'IRR est le taux qui annule la NPV (net present value). $CF_0$ = investissement, $CF_t$ = cash flows ; hurdle rate = required rate of return.\nPiège : NPV < 0 ⇔ taux d'actualisation > IRR.",
      ],
      [
        "Formule de l'IRR (internal rate of return) d'un projet à un seul cash flow futur ? Application : 10 000 investis, rien en année 1, 12 100 en fin d'année 2.",
        "IRR à un seul cash flow\n$$\\text{IRR} = \\left(\\dfrac{CF_n}{CF_0}\\right)^{1/n} - 1$$\nEn clair : (12 100 / 10 000)^(1/2) − 1 = 1,1 − 1 = 10 %, avec $CF_0$ = investissement et $CF_n$ = cash flow reçu en année $n$.\nPiège : à la calculatrice, le cash flow de l'année 1 se saisit à 0 : il ne se saute pas.",
      ],
      [
        "NPV (net present value) et IRR (internal rate of return) classent différemment deux projets mutuellement exclusifs : lequel suivre, et pourquoi ?",
        "La ==NPV l'emporte== toujours\nEn clair : La NPV mesure la richesse créée et suppose un réinvestissement au cost of capital, plus réaliste qu'à l'IRR. L'IRR, en %, montre la margin of safety.\nPiège : plusieurs changements de signe des cash flows ⇒ plusieurs IRR possibles.",
      ],
      [
        "Formule du ROIC (return on invested capital) ? Application : operating profit 300, tax rate 25 %, average invested capital 1 500.",
        "Valeur créée si ==ROIC > required return==\n$$\\text{ROIC} = \\dfrac{\\text{NOPAT}}{\\text{avg invested capital}} = \\dfrac{\\text{NOPAT}}{\\text{sales}} \\times \\dfrac{\\text{sales}}{\\text{avg invested capital}}$$\nEn clair : 300 × (1 − 0,25) / 1 500 = 225 / 1 500 = 15 %. NOPAT (net operating profit after tax) = operating profit × (1 − t) ; invested capital = dette long terme + equity, en book value.\nPiège : ROIC comptable, rétrospectif et global : il peut masquer de mauvais projets.",
      ],
      [
        "Analyse d'un projet : quels cash flows inclure, et que faire des sunk costs, de la cannibalization et des externalities ?",
        "==Incremental cash flows après impôt== · Sunk costs : ==déjà dépensés (étude de marché)== → exclus · Cannibalization : ==ventes prises à ses produits== → déduites · Externalities : ==effets sur d'autres cash flows== → incluses\nEn clair : On ajoute opportunity costs et économies d'impôt de la depreciation ; le timing compte, pas le résultat comptable.",
      ],
      [
        "Quelles erreurs et quels behavioral biases faussent souvent les décisions de capital allocation ?",
        "Fonds internes ==jamais gratuits== · ==Inflation mal traitée== · Pet projects : ==chouchous d'un dirigeant== · ==Budget recopié== sur l'an passé · Viser ==EPS ou ROE==\nEn clair : Les fonds internes coûtent le cost of equity. Viser l'EPS (earnings per share) ou le ROE (return on equity) pousse au court terme.\nPiège : cash flows réels → taux réel ; nominaux → nominal.",
      ],
      [
        "Quels sont les principaux types de real options d'un projet ?",
        "Timing : ==attendre avant d'investir== · Abandonment : ==arrêter si ça tourne mal== · Expansion : ==investir plus si ça marche== · Flexibility : ==ajuster prix ou production== · Fundamental : ==payoff lié au cours (mine de cuivre)==\nEn clair : Une real option est un droit, pas une obligation.\nPiège : droits d'un roman à filmer = expansion ; convertir sa production = flexibility.",
      ],
      [
        "Formule de la NPV (net present value) d'un projet qui contient une real option ?",
        "Real option : ==jamais négative==\n$$\\text{NPV} = \\text{NPV}_{\\text{base}} + V_{\\text{option}} - C_{\\text{option}}$$\nEn clair : $\\text{NPV}_{\\text{base}}$ = NPV sans option, valeur minimum du projet ; $V$ et $C$ = valeur et coût de l'option. On n'exerce l'option que si elle rapporte.\nPiège : abandon optimal si la PV (present value) de l'abandon dépasse celle des cash flows à continuer.",
      ],
      [
        "Formule du WACC (weighted average cost of capital) ? Application : 60 % de dette à 6 % avant impôt, tax rate 15 %, 40 % d'equity à 12 %.",
        "$$\\text{WACC} = w_d\\,r_d\\,(1-t) + w_p\\,r_p + w_e\\,r_e$$\nEn clair : 0,6 × 6 % × 0,85 + 0,4 × 12 % = 3,06 % + 4,8 % = 7,86 %. $w$ = poids cibles en market value, $r_d$ = coût avant impôt de la dette, $r_p$ = des preferred, $r_e$ = de l'equity.\nPiège : seule la dette est nette d'impôt ; $r_d$ = yield to maturity, pas le coupon.",
      ],
      [
        "Formule du poids de la dette dans le WACC (weighted average cost of capital) à partir du ratio D/E (debt-to-equity) ? Application : D/E = 0,5.",
        "Poids ==cibles, en market value==\n$$w_d = \\dfrac{D/E}{1 + D/E}$$\nEn clair : $w_d$ = 0,5 / 1,5 = 1/3, donc $w_e$ = 2/3. Sans cible annoncée, prendre la structure actuelle en market value, sa tendance ou la moyenne du secteur.\nPiège : D/E n'est pas un poids ; market values plutôt que book values si les deux sont données.",
      ],
      [
        "Formule du cost of equity selon le CAPM (capital asset pricing model) ? Application : $R_f$ = 3 %, β = 1,2, market risk premium = 5 %.",
        "$$r_e = R_f + \\beta\\,[E(R_m) - R_f]$$\nEn clair : 3 % + 1,2 × 5 % = 9 %. $R_f$ = risk-free rate, $E(R_m)$ = rendement attendu du marché, $\\beta = \\text{Cov}(R_i, R_m)/\\sigma_m^2$.\nPiège : β multiplie la market risk premium $E(R_m) - R_f$, pas $E(R_m)$.",
      ],
      [
        "Quels facteurs top-down (macroéconomiques) influencent le cost of capital d'une entreprise, et que font les credit spreads en récession ?",
        "==Inflation== · ==Real GDP growth== · ==Monetary policy== · ==Exchange rates== · Récession : ==spreads ↑==\nEn clair : Ces facteurs font bouger le benchmark rate (taux des Treasuries) et les credit spreads. En récession, les cycliques souffrent le plus. GDP = gross domestic product.\nPiège : spreads pétroliers ↓ quand le pétrole monte : certains secteurs en profitent.",
      ],
    ],
  },
  {
    title: "Corporate Issuers — Flashcards 4/4 (Structure du capital & business models)",
    cards: [
      [
        "Quelles caractéristiques d'une entreprise lui permettent de porter davantage de dette dans sa capital structure ?",
        "Cash flows : ==stables, prévisibles== · Actifs : ==tangibles, liquides==\nEn clair : Un secteur non cyclique, des revenus par abonnement, un faible operating leverage (peu de coûts fixes) et des actifs qui servent de collateral permettent plus de dette.",
      ],
      [
        "Comment l'accès à la dette évolue-t-il selon le stade de vie d'une entreprise : start-up, growth, mature ?",
        "Start-up : ==presque tout en equity== · Growth : ==dette prudente, garantie== · Mature : ==unsecured debt bon marché==\nEn clair : La start-up a peu de cash flows et de collateral ; parfois convertible debt ou leasing. La growth firm emprunte contre fixed assets ou receivables. La mature firm a de gros cash flows stables.",
      ],
      [
        "Que dit la proposition I de Modigliani–Miller (MM) sans impôts sur la valeur de la firme ?",
        "Valeur ==indépendante de la capital structure==\n$$V_L = V_U$$\nEn clair : $V_L$ = valeur avec dette, $V_U$ = sans dette. Hypothèses : ni impôts ni coûts de faillite, attentes homogènes, emprunt au risk-free rate, pas d'agency costs, investissement indépendant du financement.",
      ],
      [
        "Proposition II de Modigliani–Miller (MM) sans impôts : quelle formule relie le cost of equity à la dette ?",
        "Cost of equity ==monte avec D/E==\n$$r_e = r_0 + (r_0 - r_d)\\,\\dfrac{D}{E}$$\nEn clair : La hausse de $r_e$ compense exactement la dette moins chère : le WACC (weighted average cost of capital) reste constant. $r_0$ = coût 100 % equity, $r_d$ = coût de la dette, $D/E$ = debt-to-equity.\nPiège : seul le cost of equity bouge : coût de la dette, WACC et valeur ne changent pas.",
      ],
      [
        "Formule de la valeur d'une firme endettée selon Modigliani–Miller (MM) avec impôts ?",
        "Valeur ==maximale à 100 % de dette==\n$$V_L = V_U + t\\,D$$\nEn clair : Le tax shield $t\\,D$ ($t$ = tax rate, $D$ = dette) s'ajoute à $V_U$, la valeur sans dette. Le WACC (weighted average cost of capital) baisse quand la dette monte.\nPiège : le cost of equity monte encore, mais moins vite : $r_e = r_0 + (r_0 - r_d)(1-t)\\,D/E$ ($r_0$ : sans dette, $r_d$ : dette).",
      ],
      [
        "Static trade-off theory : où se situe la capital structure optimale d'une entreprise ?",
        "Optimum : ==WACC minimum, valeur maximum==\n$$V_L = V_U + t\\,D - \\text{PV(costs of financial distress)}$$\nEn clair : $t$ = tax rate, $V_L$ / $V_U$ = valeur avec / sans dette. La PV (present value) des costs of financial distress (frais juridiques, confiance perdue, agency costs of debt) monte avec la dette.\nPiège : le cost of equity monte toujours ; seul le WACC (weighted average cost of capital) est minimal.",
      ],
      [
        "Target capital structure : managers vs analystes, en book ou en market values, et pourquoi la structure réelle s'écarte-t-elle de la cible ?",
        "Managers, rating agencies : ==book values== · Analystes : ==market values== · Écarts : ==cours, opportunisme, lots minimum==\nEn clair : Les managers raisonnent en book values : la dette supportable ne dépend pas des cours. Émettre des actions quand le cours est haut écarte de la cible.\nPiège : écart voulu (nouvelle dette) plus inquiétant qu'écart subi (chute du cours).",
      ],
      [
        "Pecking order theory : dans quel ordre les managers préfèrent-ils se financer ?",
        "==Fonds internes → dette → nouvelles actions==\nEn clair : Les managers choisissent le financement au signal le moins négatif (information asymmetry) ; les fonds internes, invisibles des investisseurs, n'en envoient presque aucun.\nPiège : émettre de la dette = signal de confiance ; émettre des actions = signal négatif.",
      ],
      [
        "Net agency costs of equity : quelles composantes, et pourquoi la free cash flow hypothesis dit-elle que la dette les réduit ?",
        "Monitoring costs : ==surveiller les managers (board, reporting)== · Bonding costs : ==le manager rassure les owners== · Residual losses : ==pertes restantes malgré tout== · Dette : ==réduit le cash libre à gaspiller==\nEn clair : Net agency costs of equity = monitoring + bonding + residual losses.\nPiège : non-concurrence = bonding, pas monitoring.",
      ],
      [
        "Quelles 5 questions un business model doit-il couvrir ?",
        "==Who== : clients · ==What== : produit · ==How== : actifs · ==Where== : canaux · ==How much== : prix\nEn clair : Le « where » est la channel strategy : direct ou intermédiaires, omnichannel si digital + physique. B2B = business to business, B2C = business to consumer.\nPiège : prévoir revenus et coûts = financial plan, pas business model.",
      ],
      [
        "Value proposition vs value chain d'une entreprise : quelle différence ?",
        "Value proposition : ==pourquoi le client choisit ce produit== · Value chain : ==activités internes qui créent la valeur==\nEn clair : La value proposition est la promesse faite au client ; la value chain, les actifs et l'organisation qui la tiennent.\nPiège : value chain = interne ; supply chain = interne + externe, jusqu'au client final.",
      ],
      [
        "Price discrimination : que sont le tiered pricing, le dynamic pricing, le value-based pricing et l'auction pricing ?",
        "Tiered : ==remise sur gros volumes== · Dynamic : ==prix selon le moment (heures pleines)== · Value-based : ==prix fixé sur la valeur perçue== · Auction : ==prix fixé par les enchères==\nEn clair : La price discrimination fait payer des prix différents selon les clients ou les moments.\nPiège : salon −50 % le lundi, +20 % le samedi = dynamic pricing, pas tiered.",
      ],
      [
        "Bundling, razors-and-blades, add-on pricing : comment fonctionnent ces pricing models multi-produits ?",
        "Bundling : ==plusieurs produits vendus ensemble== · Razors-and-blades : ==profit sur les consommables== · Add-on : ==options après l'achat==\nEn clair : Razors-and-blades : imprimante bon marché, encre chère. Add-on : options à forte marge, vendues après la décision d'achat.\nPiège : vélo + options premium à forte marge = add-on, pas bundling.",
      ],
      [
        "Penetration pricing, freemium, hidden revenue : quelle différence entre ces pricing models ?",
        "Penetration : ==bas prix temporaire== · Freemium : ==base gratuite, options payantes== · Hidden revenue : ==payé par des tiers (pub, données)==\nEn clair : Le penetration pricing sacrifie la marge pour gagner du marché, surtout avec des network effects (valeur ↑ avec les utilisateurs).\nPiège : jeu gratuit payé par la pub = hidden revenue, pas freemium.",
      ],
      [
        "Private label, licensing, VAR (value-added reseller) : que font ces business models ?",
        "Private label : ==fabriquer pour autrui== · Licensing : ==marque louée contre redevance== · VAR : ==revend en ajoutant installation, service==\nEn clair : Private label : le produit est vendu sous la marque du distributeur (Kirkland de Costco). Autre modèle, le crowdsourcing : les utilisateurs contribuent (Wikipedia, Waze).",
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
