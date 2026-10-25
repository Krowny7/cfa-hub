// Seed script — flashcards "Système" Financial Statement Analysis.
// 4 paquets de 15 cartes (60), à réviser en une nuit avec le one-pager FSA.
// Chaque carte se comprend seule (cartes mélangées) : phrases en français,
// termes techniques en anglais. Verso au format « trois cases » : l'idée à
// retenir (≤ 12 mots, ==surligné== ou formule), puis « En clair : », puis
// « Piège : » s'il y a un vrai piège d'examen.
// Formules KaTeX ($$...$$ seul sur sa ligne = bloc, $...$ = en ligne),
// rendues par components/RichText.tsx. Vérifié sur Schweser Book 2 (R27–38).
// Usage: node scripts/seed-flashcards-fsa.mjs
import { pathToFileURL } from "node:url";
import { getOwnerId, ensureFolder, seedFlashcardSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

// Anciens titres à supprimer s'ils ont changé (les 4 titres actuels sont gardés).
const oldTitles = [];

export const SETS = [
  {
    title: "Financial Statement Analysis — Flashcards 1/4 (Cadre d'analyse, résultat & bilan)",
    cards: [
      [
        "Quelles sont les 6 étapes du financial statement analysis framework ?",
        "==Purpose== → collect data → process → analyze → conclusions → follow-up\nEn clair : Tout part de l'objectif (purpose), qui dicte les données à collecter. Le follow-up remet l'analyse à jour quand de nouvelles infos arrivent.\nPiège : calculer les ratios relève de « process » ; « analyze » consiste à les interpréter.",
      ],
      [
        "Standard-setting bodies vs regulators : qui écrit les IFRS (International Financial Reporting Standards) et les US GAAP (US generally accepted accounting principles), et qui les fait appliquer ?",
        "IASB : ==écrit les IFRS== · FASB : ==écrit les US GAAP== · Regulators (SEC) : ==font appliquer les normes==\nEn clair : IASB (International Accounting Standards Board) et FASB (Financial Accounting Standards Board) n'ont pas de pouvoir de sanction. SEC = Securities and Exchange Commission.\nPiège : IOSCO (International Organization of Securities Commissions) n'est pas un regulator.",
      ],
      [
        "Footnotes vs MD&A (management discussion and analysis) d'un rapport annuel : lequel est audité ?",
        "Footnotes : ==détail des méthodes et estimates== → auditées · MD&A : ==commentaire du management== → en partie non auditée\nEn clair : Les footnotes couvrent aussi contingencies et segments. La MD&A commente résultats, liquidity, capital resources et tendances connues.",
      ],
      [
        "Que signifie chacun des 4 types d'audit opinion ?",
        "Unqualified : ==comptes fidèles== · Qualified : ==fidèles sauf exception== · Adverse : ==pas fidèles== · Disclaimer : ==pas d'avis==\nEn clair : Unqualified = clean opinion. Disclaimer : par exemple, l'auditeur n'a pas pu tout vérifier (scope limitation).\nPiège : un audit donne une reasonable assurance, pas une garantie absolue.",
      ],
      [
        "Quelles sont les 5 étapes du modèle de revenue recognition commun à IFRS (International Financial Reporting Standards) et US GAAP (US generally accepted accounting principles) ?",
        "==Contract== · ==Performance obligations== · ==Transaction price== · ==Allocation== du prix · Recognize ==when satisfied==\nEn clair : Le revenue est reconnu quand le control passe au client, pas à l'encaissement.\nPiège : un agent ne reconnaît que sa commission (net) ; un principal, le montant brut.",
      ],
      [
        "Formule du revenue to date d'un contrat reconnu over time ? Application : transaction price 10 millions, coûts engagés 2,5 millions sur 6,5 millions de coûts totaux estimés.",
        "$$\\text{Revenue to date} = \\text{Transaction price} \\times \\dfrac{\\text{Costs incurred to date}}{\\text{Total estimated costs}}$$\nEn clair : 10 millions × 2,5 / 6,5 ≈ 3,85 millions (38,5 % d'avancement). Revenue de l'année = revenue to date − revenue déjà reconnu.\nPiège : du cash reçu avant d'avoir rempli l'obligation est un unearned revenue (un passif).",
      ],
      [
        "Income statement : comment présente-t-on les discontinued operations et les unusual or infrequent items ?",
        "Discontinued operations : ==activité cédée, net of tax== · Unusual or infrequent items : ==rares (restructuring…), pretax==\nEn clair : Une discontinued operation, vendue ou à vendre, a sa propre ligne. Les unusual or infrequent items restent dans l'income from continuing operations.\nPiège : un item « unusual » qui revient chaque année n'est pas à exclure des prévisions.",
      ],
      [
        "Changement d'accounting principle vs changement d'accounting estimate : lequel oblige à retraiter les années passées ?",
        "Accounting principle : ==nouvelle méthode comptable== → retrospective · Accounting estimate : ==hypothèse révisée (useful life…)== → prospective\nEn clair : Un changement de principle (ex. FIFO → weighted average cost) retraite les périodes passées présentées, comme la correction d'une erreur. Un changement d'estimate ne joue que sur le futur.",
      ],
      [
        "Formule du basic EPS (earnings per share) ? Application : Net Income 50 000, preferred dividends 6 000, 10 000 actions au 1er janvier, 2 000 émises le 1er juillet, stock split 2-for-1 le 1er octobre.",
        "$$\\text{Basic EPS} = \\dfrac{\\text{Net Income} - \\text{Preferred dividends}}{\\text{WASO}}$$\n$$\\text{WASO} = \\sum \\text{Shares outstanding} \\times \\dfrac{\\text{Months outstanding}}{12}$$\nEn clair : WASO (weighted average shares outstanding) = (10 000 + 2 000 × 6/12) × 2 = 22 000, split appliqué rétroactivement. EPS = (50 000 − 6 000) / 22 000 = 2,00.\nPiège : on retire les preferred dividends, jamais les common dividends.",
      ],
      [
        "Formule du diluted EPS (earnings per share) avec convertible preferred, convertible debt et stock options ?",
        "==Dilutive securities supposés convertis==\n$$\\text{Diluted EPS} = \\dfrac{\\text{NI} - \\text{PD} + \\text{Convertible preferred dividends} + \\text{Convertible debt interest} \\times (1-t)}{\\text{WASO} + \\text{Shares from conversions} + \\text{Shares from TSM}}$$\nEn clair : Le numérateur récupère ce que la conversion économise. NI = Net Income, PD = preferred dividends, t = tax rate, WASO = weighted average shares outstanding, TSM = treasury stock method.\nPiège : l'intérêt de la convertible debt se rajoute après impôt, pas en brut.",
      ],
      [
        "Formule des actions ajoutées au diluted EPS (earnings per share) par le treasury stock method ? Application : 10 000 options, exercise price 20, cours moyen de la période 25.",
        "$$\\text{New shares} = \\dfrac{\\text{AMP} - \\text{EP}}{\\text{AMP}} \\times N$$\nEn clair : (25 − 20) / 25 × 10 000 = 2 000 actions ajoutées. AMP = average market price, EP = exercise price, N = nombre d'options.\nPiège : cours moyen de la période, pas de clôture ; option dilutive seulement si EP < AMP.",
      ],
      [
        "Formule du test de dilution d'une convertible bond ? Application : basic EPS (earnings per share) 2,00 ; intérêts 100 000 par an, tax rate 30 %, conversion en 50 000 actions.",
        "Dilutive si per-share effect < ==basic EPS==\n$$\\text{Per-share effect} = \\dfrac{\\text{Interest} \\times (1 - t)}{\\text{Shares from conversion}}$$\nEn clair : 100 000 × (1 − 0,30) / 50 000 = 1,40 < 2,00 : dilutive, on l'inclut dans le diluted EPS. Ici t = tax rate.\nPiège : si l'effet par action dépasse le basic EPS, le titre est antidilutive et exclu.",
      ],
      [
        "Quels éléments passent en OCI (other comprehensive income) plutôt qu'en Net Income ?",
        "==Currency translation== · ==FVOCI== debt gains · ==Cash flow== hedges · Pension ==remeasurements== · ==Revaluation surplus==\nEn clair : Comprehensive income = Net Income + OCI. FVOCI = fair value through OCI (available-for-sale aux États-Unis) : les gains latents de ces debt securities y passent.",
      ],
      [
        "Formule du goodwill d'une acquisition ? Application : prix payé 500 millions, fair value des identifiable net assets acquis 380 millions.",
        "$$\\text{Goodwill} = \\text{Purchase price} - \\text{Fair value of identifiable net assets}$$\nEn clair : 500 − 380 = 120 millions de goodwill. Il n'est jamais amorti : impairment test au moins une fois par an.\nPiège : un goodwill créé en interne n'est jamais inscrit au bilan.",
      ],
      [
        "Debt securities détenus : quelle mesure selon le business model sous IFRS (International Financial Reporting Standards) et US GAAP (US generally accepted accounting principles) ?",
        "Hold to collect : ==amortized cost== · Collect and sell : ==FVOCI== · Trading : ==FVPL==\nEn clair : FVOCI = fair value through OCI (other comprehensive income), FVPL = fair value through profit or loss. Noms US GAAP : held-to-maturity, available-for-sale, trading.\nPiège : actions et derivatives : FVPL par défaut.",
      ],
    ],
  },
  {
    title: "Financial Statement Analysis — Flashcards 2/4 (Flux de trésorerie & stocks)",
    cards: [
      [
        "Cash flow statement : quelles opérations vont en CFO (cash flow from operations), en CFI (investing) et en CFF (financing) ?",
        "CFO : ==cash de l'activité courante== · CFI : ==achat et vente d'actifs long terme== · CFF : ==levée et remboursement de dette et equity==\nEn clair : Le CFO couvre clients, fournisseurs, salariés et impôts. Le CFI inclut les titres d'autres firmes ; le CFF, les dividends paid.\nPiège : acheter les bonds d'une autre firme = CFI ; émettre les siens = CFF.",
      ],
      [
        "Sous US GAAP (US generally accepted accounting principles), où classe-t-on interest paid, dividends paid, interest received et dividends received ?",
        "Tout en CFO, sauf ==dividends paid en CFF==\nEn clair : IFRS (International Financial Reporting Standards) laisse le choix : paid en CFO ou CFF, received en CFO ou CFI. CFO, CFI, CFF = cash flow from operating, investing, financing.\nPiège : taxes paid : toujours CFO en US GAAP ; en IFRS, CFI ou CFF si liées à ces activités.",
      ],
      [
        "Formule du CFO (cash flow from operations) par l'indirect method ? Application : Net Income 500, depreciation 120, gain sur cession d'un actif 30, accounts receivable +40, accounts payable +25.",
        "$$\\text{CFO} = \\text{NI} + \\text{Non-cash charges} - \\text{Gains} + \\text{Losses} - \\Delta\\text{Operating assets} + \\Delta\\text{Operating liabilities}$$\nEn clair : 500 + 120 − 30 − 40 + 25 = 575. NI = Net Income ; receivables en hausse = ventes pas encore encaissées, payables en hausse = cash gardé.\nPiège : le gain est retiré : tout le produit de cession va en CFI (cash flow from investing).",
      ],
      [
        "Formule du cash collected from customers (direct method) ? Application : Revenue 1 000, accounts receivable +50, unearned revenue +10.",
        "$$\\text{Cash collected from customers} = \\text{Revenue} - \\Delta\\text{AR} + \\Delta\\text{Unearned revenue}$$\nEn clair : 1 000 − 50 + 10 = 960. AR = accounts receivable ; receivables en hausse = ventes non encaissées, unearned revenue en hausse = cash reçu d'avance.",
      ],
      [
        "Formule du cash paid to suppliers (direct method) ? Application : COGS (cost of goods sold) 600, inventory +40, accounts payable +30.",
        "$$\\text{Cash paid to suppliers} = \\text{COGS} + \\Delta\\text{Inventory} - \\Delta\\text{AP}$$\nEn clair : 600 + 40 − 30 = 610. AP = accounts payable ; stocker plus coûte du cash, payer ses fournisseurs plus tard en économise.",
      ],
      [
        "Formule du cash reçu en CFI (cash flow from investing) à la vente d'un actif ? Application : machine de cost 200, accumulated depreciation 120, vendue avec un gain de 15.",
        "$$\\text{Book value} = \\text{Cost} - \\text{Accumulated depreciation}$$\n$$\\text{Sale proceeds} = \\text{Book value} + \\text{Gain} - \\text{Loss}$$\nEn clair : Book value = 200 − 120 = 80, donc cash reçu = 80 + 15 = 95, inscrit en CFI.\nPiège : en CFI, c'est le cash reçu (95), ni la book value (80) ni le gain (15).",
      ],
      [
        "Formule du CFF (cash flow from financing) en US GAAP (US generally accepted accounting principles) ? Application : debt issued 300, repaid 100, shares issued 50, repurchases 80, dividends paid 40.",
        "$$\\text{CFF} = (\\text{Debt issued} - \\text{Debt repaid}) + \\text{Shares issued} - \\text{Repurchases} - \\text{Dividends paid}$$\nEn clair : 300 − 100 + 50 − 80 − 40 = 130 (net borrowing + émissions d'actions − rachats − dividends paid).\nPiège : l'interest paid n'y entre pas : en US GAAP, il va en CFO (cash flow from operations).",
      ],
      [
        "Formule du FCFF (free cash flow to the firm) à partir du CFO (cash flow from operations) ?",
        "FCFF : cash pour ==créanciers et actionnaires==\n$$\\text{FCFF} = \\text{CFO} + \\text{Int}(1-t) - \\text{FCInv}$$\nEn clair : On rajoute les intérêts après impôt, car ils reviennent aux créanciers. Int = interest paid, t = tax rate, FCInv = fixed capital investment (capital expenditures − cessions d'actifs).\nPiège : si l'interest paid est déjà classé en CFF (financing), on ne le rajoute pas.",
      ],
      [
        "Formule du FCFE (free cash flow to equity) à partir du CFO (cash flow from operations) ?",
        "FCFE : cash pour ==les seuls actionnaires==\n$$\\text{FCFE} = \\text{CFO} - \\text{FCInv} + \\text{Net borrowing}$$\nEn clair : FCInv = fixed capital investment (capital expenditures − cessions d'actifs). Net borrowing = emprunts − remboursements de dette.\nPiège : net borrowing négatif si l'entreprise rembourse plus qu'elle n'emprunte : il réduit le FCFE.",
      ],
      [
        "Formule du reinvestment ratio (un coverage ratio du cash flow statement) ?",
        "$$\\text{Reinvestment ratio} = \\dfrac{\\text{CFO}}{\\text{Cash paid for long-term assets}}$$\nEn clair : Le reinvestment ratio mesure si le CFO (cash flow from operations) suffit à financer l'achat d'actifs long terme. Autre coverage ratio : debt coverage = CFO / total debt.",
      ],
      [
        "Prix en hausse, stocks stables : quels effets a le LIFO (last in, first out), par rapport au FIFO (first in, first out), sur COGS, Net Income, impôts et CFO ?",
        "COGS ==↑== · Net Income ==↓== · Income taxes ==↓== · CFO ==↑==\nEn clair : Sous LIFO, les derniers achats, plus chers, passent en COGS (cost of goods sold) : moins d'impôt payé, donc plus de CFO (cash flow from operations).\nPiège : LIFO liquidation (stocks en baisse) : vieux coûts bas en COGS, marge gonflée non durable.",
      ],
      [
        "Formule du COGS (cost of goods sold) sous FIFO (first in, first out) et LIFO (last in, first out) ? Application : stock initial 100 unités à 10, achats 200 à 12 puis 150 à 14 ; 250 vendues.",
        "$$\\text{COGS} = \\text{Beginning inventory} + \\text{Purchases} - \\text{Ending inventory}$$\nEn clair : FIFO vend les vieux lots : 100 × 10 + 150 × 12 = 2 800 (ending inventory 2 700). LIFO vend les récents : 150 × 14 + 100 × 12 = 3 300 (ending inventory 2 200).\nPiège : LIFO est interdit sous IFRS (International Financial Reporting Standards).",
      ],
      [
        "Formules de conversion de LIFO (last in, first out) à FIFO (first in, first out) ? Application : inventory LIFO 400, LIFO reserve 60 (45 un an plus tôt), COGS (cost of goods sold) LIFO 1 000.",
        "$$\\text{Inventory}_{\\text{FIFO}} = \\text{Inventory}_{\\text{LIFO}} + \\text{LIFO reserve}$$\n$$\\text{COGS}_{\\text{FIFO}} = \\text{COGS}_{\\text{LIFO}} - \\Delta\\text{LIFO reserve}$$\nEn clair : Inventory FIFO = 400 + 60 = 460 ; COGS FIFO = 1 000 − (60 − 45) = 985.\nPiège : pour le COGS, on retire la variation de la LIFO reserve, pas son solde.",
      ],
      [
        "Inventories au bilan sous IFRS (International Financial Reporting Standards) et US GAAP (US generally accepted accounting principles) : quelle valeur, et une write-down est-elle réversible ?",
        "Valeur : ==min(cost, NRV)== · Reprise d'une write-down : ==IFRS seulement==\nEn clair : NRV = net realizable value ; la reprise IFRS est plafonnée à la write-down initiale. US GAAP sous LIFO (last in, first out) : lower of cost or market.\nPiège : write-down : ROA (return on assets) ↓ l'année même, ↑ les années suivantes.",
      ],
      [
        "Formules de lower of cost or NRV (net realizable value) et de lower of cost or market ? Application : cost 3 200, selling price 3 500, completion et selling costs 350, normal profit margin 200, replacement cost 2 900.",
        "$$\\text{Lower of cost or NRV} = \\min(\\text{Cost},\\ \\text{NRV}), \\quad \\text{NRV} = \\text{Selling price} - \\text{Completion and selling costs}$$\n$$\\text{Lower of cost or market} = \\min(\\text{Cost},\\ \\text{Market}), \\quad \\text{Market} = \\text{median}(\\text{NRV} - \\text{Normal profit margin},\\ \\text{Replacement cost},\\ \\text{NRV})$$\nEn clair : NRV = 3 500 − 350 = 3 150 : lower of cost or NRV = min(3 200 ; 3 150) = 3 150. Market = median(2 950 ; 2 900 ; 3 150) = 2 950 : lower of cost or market = min(3 200 ; 2 950) = 2 950.\nPiège : la write-down baisse le current ratio, pas le quick ratio (l'inventory n'y entre pas).",
      ],
    ],
  },
  {
    title: "Financial Statement Analysis — Flashcards 3/4 (Actifs & passifs long terme, impôts)",
    cards: [
      [
        "Capitaliser un coût plutôt que le passer en charges : quels effets sur le Net Income, le CFO (cash flow from operations) et le CFI (cash flow from investing) ?",
        "CFO ==↑== · CFI ==↓== · Net Income ==↑ puis ↓==\nEn clair : Le cash sort en CFI au lieu du CFO. La depreciation étale le coût : Net Income plus haut l'année 1, plus bas les années suivantes.\nPiège : capitalized interest : sortie en CFI ; l'ajouter à l'interest expense pour l'interest coverage.",
      ],
      [
        "Research and development (R&D) : capitalisé ou passé en charges, sous IFRS (International Financial Reporting Standards) et sous US GAAP (US generally accepted accounting principles) ?",
        "IFRS : ==development capitalisé== · US GAAP : ==en charges==\nEn clair : IFRS : research en charges, development capitalisé si des critères sont remplis. US GAAP : software à vendre capitalisé après la technological feasibility.\nPiège : software à usage interne (US GAAP) : capitalisé dès que l'achèvement du projet est probable.",
      ],
      [
        "Impairment d'un actif long terme held for use : quel test sous IFRS (International Financial Reporting Standards) et sous US GAAP (US generally accepted accounting principles) ?",
        "IFRS : ==recoverable amount== · US GAAP : ==undiscounted cash flows==\nEn clair : Impaired si carrying value > recoverable amount (IFRS) ou > undiscounted cash flows (US GAAP). Recoverable amount = max(fair value − costs to sell ; value in use). Reprise : IFRS seulement.\nPiège : perte US GAAP = carrying value − fair value, pas − undiscounted cash flows.",
      ],
      [
        "Revaluation model des PP&E (property, plant and equipment) : permis sous IFRS (International Financial Reporting Standards) ou US GAAP (US generally accepted accounting principles) ? Où va une hausse ?",
        "Permis : ==IFRS seulement== · Hausse : ==OCI (revaluation surplus)==\nEn clair : OCI = other comprehensive income. Une hausse qui reprend une baisse passée en Net Income va en Net Income ; une baisse va en Net Income, sauf si elle annule un surplus.",
      ],
      [
        "Pour le lessor, et pour le lessee sous US GAAP (US generally accepted accounting principles) : quels critères classent un lease en finance lease plutôt qu'en operating lease ?",
        "==Ownership transfer== · ==Purchase option== quasi certaine · Major part of ==economic life== · ==PV ≥ fair value== · ==Specialized asset==\nEn clair : Un seul critère suffit ; PV = present value des lease payments. Sous IFRS (International Financial Reporting Standards), le lessee traite tout lease comme un finance lease.",
      ],
      [
        "Lessee, IFRS (International Financial Reporting Standards) ou US GAAP (US generally accepted accounting principles) : qu'inscrit-il au bilan au début d'un lease de plus de 12 mois ?",
        "ROU asset et lease liability = ==PV des lease payments==\nEn clair : ROU = right-of-use, PV = present value. Le lessee inscrit un actif (droit d'usage) et une dette du même montant, quel que soit le type de lease.\nPiège : US GAAP operating lease : ensuite une seule lease expense, et tout le paiement en CFO (operations).",
      ],
      [
        "Comment le lessor comptabilise-t-il un finance lease, par rapport à un operating lease ?",
        "Finance : ==actif → lease receivable== · Operating : ==actif gardé et amorti==\nEn clair : En finance lease, le lessor touche ensuite de l'interest income. En operating lease, les loyers sont du revenue.\nPiège : sales-type lease (fabricant ou dealer) : profit de vente dès le début ; direct financing : intérêts seulement.",
      ],
      [
        "Formule de la net pension liability (funded status) d'un defined benefit pension plan ? Application : PBO (projected benefit obligation) 500 millions, fair value des plan assets 420 millions.",
        "$$\\text{Net pension liability} = \\text{PBO} - \\text{Fair value of plan assets}$$\nEn clair : 500 − 420 = 80 millions de net pension liability (plan underfunded). Un résultat négatif signifie un plan overfunded : net pension asset.\nPiège : defined contribution plan : aucun passif, la pension expense = la cotisation versée.",
      ],
      [
        "Defined benefit plan : quelle part du pension cost va en Net Income sous IFRS (International Financial Reporting Standards) et sous US GAAP (US generally accepted accounting principles) ?",
        "Part qui va en Net Income\n$$\\text{Pension cost}_{\\text{IFRS}} = \\text{Service cost} + \\text{Net interest}$$\n$$\\text{Pension cost}_{\\text{US GAAP}} = \\text{Service cost} + \\text{Interest cost} - \\text{Expected return on plan assets}$$\nEn clair : En IFRS, les remeasurements vont en OCI (other comprehensive income). En US GAAP, past service cost et actuarial gains/losses vont en OCI, puis sont amortis en Net Income.\nPiège : en IFRS, le past service cost entre dans le service cost, donc en Net Income.",
      ],
      [
        "Comment comptabilise-t-on des employee stock options dans l'income statement ?",
        "Fair value à la grant date, ==étalée sur la vesting period==\nEn clair : La fair value passe en compensation expense, avec l'APIC (additional paid-in capital) en contrepartie. Aucun cash ne sort, mais les actionnaires seront dilués.\nPiège : la fair value n'est pas réestimée ensuite, même si le cours de l'action bouge.",
      ],
      [
        "Formule de l'income tax expense ? Application : taxes payable 840, DTL (deferred tax liability) +60, DTA (deferred tax asset) +20 sur l'année.",
        "$$\\text{Income tax expense} = \\text{Taxes payable} + \\Delta\\text{DTL} - \\Delta\\text{DTA}$$\nEn clair : 840 + 60 − 20 = 880. Taxes payable vient de la déclaration fiscale (taxable income) ; l'income tax expense, de l'income statement (pretax income).\nPiège : si le tax rate change, DTA et DTL sont réévalués (taux ↑ : les deux ↑) ; l'écart passe en income tax expense.",
      ],
      [
        "Formule de l'impôt différé d'un actif, DTA (deferred tax asset) ou DTL (deferred tax liability) ? Application : machine, carrying value 600, tax base 450, tax rate 30 %.",
        "Actif : carrying value > tax base ⇒ ==DTL==\n$$\\text{Deferred tax} = (\\text{Carrying value} - \\text{Tax base}) \\times \\text{Tax rate}$$\nEn clair : (600 − 450) × 30 % = 45 de DTL : moins d'impôt payé aujourd'hui (accelerated depreciation fiscale), davantage ensuite.\nPiège : pour un passif, c'est l'inverse : carrying value > tax base crée un DTA.",
      ],
      [
        "Quelles situations créent un DTA (deferred tax asset) ?",
        "Revenue ==taxé avant== d'être reconnu · Expense ==comptabilisée avant== d'être déductible · ==Tax loss carryforwards==\nEn clair : Un DTA est un impôt payé d'avance (taxes payable > income tax expense). Ex. : warranty expense, unearned revenue.\nPiège : DTA qui risque de ne jamais servir : réduit par une valuation allowance, d'où income tax expense ↑.",
      ],
      [
        "Une permanent difference fiscale crée-t-elle un DTA (deferred tax asset) ou un DTL (deferred tax liability) ? Quel effet sur l'effective tax rate ?",
        "Impôt différé : ==aucun== · Effective tax rate : ==≠ statutory==\nEn clair : Une permanent difference ne se renverse jamais (municipal bonds exonérés, amendes non déductibles). Effective tax rate = income tax expense / pretax income.",
      ],
      [
        "Un DTL (deferred tax liability) qui ne devrait jamais se renverser : dette ou equity pour l'analyste ?",
        "DTL qui ne se renverse jamais = ==equity==\nEn clair : Un DTL qui ne se renverse jamais ne sera jamais payé, par exemple si les capital expenditures croissent sans fin. Un DTL qui doit se renverser reste une dette.\nPiège : le reclasser en equity baisse le D/E (debt-to-equity).",
      ],
    ],
  },
  {
    title: "Financial Statement Analysis — Flashcards 4/4 (Qualité de l'information, techniques & modélisation)",
    cards: [
      [
        "Spectrum of financial reporting quality : quel est le niveau le plus haut, et le plus bas ?",
        "Meilleur : ==decision-useful, earnings durables== · Pire : ==fictitious transactions==\nEn clair : Niveaux intermédiaires : earnings peu durables, biased choices, earnings management, departures from GAAP (generally accepted accounting principles).\nPiège : reporting quality et earnings quality sont deux dimensions distinctes.",
      ],
      [
        "Conservative vs aggressive accounting : quel effet sur les earnings, et comment l'earnings smoothing s'en sert-il ?",
        "Aggressive : ==earnings actuels gonflés== · Conservative : ==earnings actuels réduits== · Smoothing : ==lisser les earnings en alternant les deux==\nEn clair : Conservative ou aggressive, c'est un biais. L'earnings smoothing passe en conservative au-dessus de l'objectif, en aggressive en dessous.\nPiège : conservative n'est pas « bon » : il peut gonfler les earnings futurs.",
      ],
      [
        "Quelles 3 conditions sont souvent réunies quand un management publie des financial reports de mauvaise qualité ?",
        "Motivation : ==pression des objectifs, bonus, covenants== · Opportunity : ==contrôles internes faibles== · Rationalization : ==se convaincre que c'est justifié==\nEn clair : La motivation type est de battre un objectif d'EPS (earnings per share) : guidance, consensus ou année passée. Opportunity inclut aussi un board peu vigilant et des normes trop permissives.",
      ],
      [
        "Quels warning signs doivent pousser un analyste à creuser la qualité des earnings ?",
        "Net Income ↑, ==CFO stagnant== · ==Turnover ratios== en baisse · Revenue ==hors norme du secteur== · ==4e trimestre== atypique · Items « nonrecurring » ==récurrents==\nEn clair : Un Net Income que le CFO (cash flow from operations) ne suit pas est l'alerte n° 1. À surveiller aussi : channel stuffing, bill-and-hold.",
      ],
      [
        "Vertical vs horizontal common-size analysis : quelle base utilise chacune ?",
        "Vertical : ==poste ÷ total de la même année== · Horizontal : ==poste ÷ son niveau de l'année de base==\nEn clair : En vertical, le total est le revenue (income statement) ou les total assets (balance sheet), ce qui gomme l'effet taille. L'horizontal suit chaque poste dans le temps.",
      ],
      [
        "Formules du current ratio, du quick ratio et du cash ratio ?",
        "Du plus large au plus strict\n$$\\text{Current ratio} = \\dfrac{\\text{Current assets}}{\\text{Current liabilities}}$$\n$$\\text{Quick ratio} = \\dfrac{\\text{Cash} + \\text{Marketable securities} + \\text{Receivables}}{\\text{Current liabilities}}$$\n$$\\text{Cash ratio} = \\dfrac{\\text{Cash} + \\text{Marketable securities}}{\\text{Current liabilities}}$$\nEn clair : Le quick ratio retire l'inventory des current assets ; le cash ratio retire en plus les receivables.",
      ],
      [
        "Formule du cash conversion cycle (CCC) ? Application sur 365 jours : COGS (cost of goods sold) 730, purchases 730, revenue 1 460 ; average inventory 100, receivables 160, payables 60.",
        "$$\\text{CCC} = \\text{DOH} + \\text{DSO} - \\text{DPO}$$\n$$\\text{DOH} = \\dfrac{365 \\times \\text{Avg inventory}}{\\text{COGS}} \\quad \\text{DSO} = \\dfrac{365 \\times \\text{Avg receivables}}{\\text{Revenue}} \\quad \\text{DPO} = \\dfrac{365 \\times \\text{Avg payables}}{\\text{Purchases}}$$\nEn clair : DOH (days of inventory on hand) = 365 × 100 / 730 = 50 ; DSO (days of sales outstanding) = 365 × 160 / 1 460 = 40 ; DPO (days of payables outstanding) = 365 × 60 / 730 = 30 ; CCC = 50 + 40 − 30 = 60.\nPiège : DPO sur les purchases (COGS + Δinventory), pas sur le COGS.",
      ],
      [
        "Formules du debt-to-assets, du debt-to-equity, du debt-to-capital et du financial leverage ratio ?",
        "Debt-to-assets : ==debt / total assets== · Debt-to-equity : ==debt / total equity== · Debt-to-capital : ==debt / total capital== · Financial leverage : ==assets / equity==\nEn clair : Debt = dettes portant intérêt (pas les payables), total capital = debt + equity. Le financial leverage utilise des moyennes.",
      ],
      [
        "Formules de l'interest coverage et du fixed charge coverage ?",
        "$$\\text{Interest coverage} = \\dfrac{\\text{EBIT}}{\\text{Interest payments}}$$\n$$\\text{Fixed charge coverage} = \\dfrac{\\text{EBIT} + \\text{Lease payments}}{\\text{Interest payments} + \\text{Lease payments}}$$\nEn clair : EBIT = earnings before interest and taxes. Le fixed charge coverage ajoute les lease payments en haut et en bas : il est en général plus bas.",
      ],
      [
        "Formules de l'average age et de la remaining useful life des PP&E (property, plant and equipment) ? Application : gross PP&E 3 millions, accumulated depreciation 1 million, depreciation 0,5 million par an.",
        "$$\\text{Average age} = \\dfrac{\\text{Accumulated depreciation}}{\\text{Annual depreciation expense}}$$\n$$\\text{Remaining useful life} = \\dfrac{\\text{Net PP\\&E}}{\\text{Annual depreciation expense}}$$\nEn clair : Average age = 1 / 0,5 = 2 ans ; remaining useful life = (3 − 1) / 0,5 = 4 ans. Total useful life = gross PP&E / depreciation = 3 / 0,5 = 6 ans.\nPiège : approximations valables en straight-line, sans salvage value.",
      ],
      [
        "Formule du DuPont à 3 facteurs du ROE (return on equity) ?",
        "ROE = ==margin × turnover × leverage==\n$$\\text{ROE} = \\dfrac{\\text{NI}}{\\text{Revenue}} \\times \\dfrac{\\text{Revenue}}{\\text{Avg assets}} \\times \\dfrac{\\text{Avg assets}}{\\text{Avg equity}}$$\nEn clair : Net profit margin × total asset turnover × financial leverage, où NI = Net Income. Les deux premiers donnent le ROA (return on assets). Ex. : 8 % × 1,5 × 2 = 24 %.\nPiège : un ROE qui monte seulement grâce au levier n'est pas un progrès opérationnel.",
      ],
      [
        "Formule du DuPont à 5 facteurs du ROE (return on equity) ?",
        "$$\\text{ROE} = \\dfrac{\\text{NI}}{\\text{EBT}} \\times \\dfrac{\\text{EBT}}{\\text{EBIT}} \\times \\dfrac{\\text{EBIT}}{\\text{Revenue}} \\times \\dfrac{\\text{Revenue}}{\\text{Avg assets}} \\times \\dfrac{\\text{Avg assets}}{\\text{Avg equity}}$$\nEn clair : Tax burden × interest burden × EBIT margin × total asset turnover × financial leverage. NI = Net Income, EBT = earnings before taxes, EBIT = earnings before interest and taxes.\nPiège : tax burden = NI / EBT = 1 − tax rate : plus il est haut, moins on paie d'impôt.",
      ],
      [
        "Sales-based pro forma model : par quoi commence-t-on, et comment modélise-t-on les coûts ?",
        "Départ : ==prévision du revenue== · COGS : ==% du revenue== · SG&A : ==en partie fixes==\nEn clair : COGS = cost of goods sold, SG&A = selling, general and administrative. Les coûts fixes (operating leverage) amplifient les chocs.\nPiège : entreprise cyclique : l'horizon doit couvrir le milieu du cycle (normalized earnings).",
      ],
      [
        "Quels behavioral biases menacent les prévisions d'un analyste financier ?",
        "Overconfidence : ==se croire trop précis== · Illusion of control : ==se croire maître du résultat== · Conservatism : ==ajuster trop peu aux infos== · Representativeness : ==juger par ressemblance, sans base rate== · Confirmation bias : ==chercher ce qui confirme son avis==\nEn clair : Le conservatism ressemble à l'anchoring. L'outside view (base rate) corrige la representativeness.",
      ],
      [
        "Porter's five forces : quelle force pèse sur les input costs, et lesquelles sur le pricing power ?",
        "Suppliers : ==input costs== · 4 autres forces : ==pricing power==\nEn clair : Le bargaining power of suppliers pèse sur les coûts. Rivalry, substitutes, new entrants et bargaining power of customers pèsent sur les prix.\nPiège : coût répercuté dollar pour dollar, volumes stables : gross profit inchangé, gross margin en baisse.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "flashcards");
  console.log("Flashcards — Système Financial Statement Analysis (4 paquets × 15)...");
  const total = await seedFlashcardSets({ ownerId, folderId, sets: SETS, oldTitles });
  console.log(`\n✅ Terminé. ${total} cartes ajoutées.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  });
}
