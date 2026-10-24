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
        "==Purpose== → collect data → process → analyze → conclusions → follow-up\nEn clair : tout part de l'objectif (purpose), qui décide quelles données collecter. Process = ajuster les comptes, calculer les ratios, faire les common-size ; analyze = interpréter.\nPiège : calculer les ratios relève de « process », pas de « analyze ».",
      ],
      [
        "Standard-setting bodies vs regulators : qui écrit les IFRS (International Financial Reporting Standards) et les US GAAP (US generally accepted accounting principles), et qui les fait appliquer ?",
        "Normes : ==IASB et FASB== ; contrôle : regulatory authorities (SEC)\nEn clair : IASB (International Accounting Standards Board) écrit les IFRS, FASB (Financial Accounting Standards Board) les US GAAP ; la SEC (Securities and Exchange Commission) les fait appliquer.\nPiège : IOSCO (International Organization of Securities Commissions) coordonne les regulators sans en être un.",
      ],
      [
        "Footnotes vs MD&A (management discussion and analysis) d'un rapport annuel : lequel est audité, et que contient chacun ?",
        "Footnotes ==auditées== ; MD&A : en partie non audité\nEn clair : footnotes = accounting methods, estimates, assumptions, contingencies, segments. MD&A = lecture du management : résultats, liquidity, capital resources, tendances connues.",
      ],
      [
        "Quels sont les 4 types d'audit opinion, et que signifie chacun ?",
        "==Unqualified== (clean) · ==Qualified== · ==Adverse== · ==Disclaimer== of opinion\nEn clair : unqualified : comptes fidèles ; qualified : fidèles sauf une exception ; adverse : pas fidèles ; disclaimer : l'auditeur ne peut pas se prononcer.\nPiège : un audit donne une reasonable assurance, pas une garantie contre l'erreur ou la fraude.",
      ],
      [
        "Quelles sont les 5 étapes du modèle de revenue recognition commun à IFRS (International Financial Reporting Standards) et US GAAP (US generally accepted accounting principles) ?",
        "==Contract== · ==Performance obligations== · ==Transaction price== · ==Allocation== · Recognize ==when satisfied==\nEn clair : le revenue suit le transfert du control au client, pas l'encaissement ; le transaction price est réparti selon les standalone selling prices.\nPiège : un agent ne reconnaît que sa commission (net) ; un principal, le montant brut.",
      ],
      [
        "Revenue recognition over time : contrat de 10 millions, coûts engagés 2,5 millions sur 6,5 millions de coûts totaux estimés. Quel revenue reconnaître à ce jour ?",
        "Revenue reconnu à ce jour ≈ ==3,85 millions==\nEn clair : avancement = 2,5 / 6,5 = 38,5 % des coûts totaux, donc 38,5 % × 10 millions ≈ 3,85 millions.\nPiège : du cash reçu avant d'avoir rempli l'obligation est un unearned revenue (un passif).",
      ],
      [
        "Où et comment présente-t-on les discontinued operations et les unusual or infrequent items dans l'income statement ?",
        "==Net of tax== pour les discontinued operations ; pretax pour les unusual items\nEn clair : discontinued operations : à part, sous l'income from continuing operations ; unusual or infrequent items : inclus dedans, avant impôt.\nPiège : un item « unusual » qui revient chaque année n'est pas à exclure des prévisions.",
      ],
      [
        "Changement d'accounting principle vs changement d'accounting estimate : lequel oblige à retraiter les années passées ?",
        "Changement d'accounting principle : ==retrospective== (on retraite le passé)\nEn clair : on retraite les périodes passées présentées, comme pour la correction d'une erreur. Un changement d'accounting estimate (useful life, salvage value) est prospective : aucun retraitement.",
      ],
      [
        "Basic EPS (earnings per share) : Net Income 50 000, preferred dividends 6 000, 10 000 actions au 1er janvier, 2 000 émises le 1er juillet, stock split 2-for-1 le 1er octobre. Quel basic EPS ?",
        "Basic EPS = (50 000 − 6 000) / 22 000 = ==2,00==\nEn clair : WASO (weighted average shares outstanding) = (10 000 + 2 000 × 6/12) × 2 = 22 000 : émission au prorata du temps, stock split rétroactif au 1er janvier.\nPiège : on retire les preferred dividends, jamais les common dividends.",
      ],
      [
        "Quelle est la formule du diluted EPS (earnings per share) avec convertible preferred, convertible debt et stock options ?",
        "Diluted EPS : ==dilutive securities supposés convertis==\n$$\\text{Diluted EPS} = \\dfrac{\\text{NI} - \\text{PD} + \\text{PD}_{\\text{conv}} + \\text{Int}_{\\text{conv}}(1-t)}{\\text{WASO} + \\text{shares}_{\\text{conv}} + \\text{shares}_{\\text{TSM}}}$$\nEn clair : on ajoute ce que la conversion économise et les actions créées. NI = Net Income, PD = preferred dividends, t = tax rate, WASO = weighted average shares, TSM = treasury stock method.\nPiège : l'intérêt de la convertible debt se rajoute après impôt, pas en brut.",
      ],
      [
        "Treasury stock method : 10 000 options, exercise price 20, cours moyen de la période 25. Combien d'actions ajoute-t-on au dénominateur du diluted EPS (earnings per share) ?",
        "Treasury stock method : ==+2 000 actions== au dénominateur\nEn clair : le cash d'exercice (10 000 × 20 = 200 000) rachète 200 000 / 25 = 8 000 actions au cours moyen ; 10 000 − 8 000 = 2 000 actions nouvelles.\nPiège : cours moyen de la période, pas de clôture ; option dilutive seulement si exercise price < cours moyen.",
      ],
      [
        "Basic EPS (earnings per share) = 2,00. Une convertible bond verse 100 000 d'intérêts par an (tax rate 30 %) et se convertit en 50 000 actions. Est-elle dilutive ?",
        "==Dilutive== : 1,40 par action < basic EPS de 2,00\nEn clair : effet par action = intérêt après impôt / actions créées = 100 000 × (1 − 0,30) / 50 000 = 1,40 ; c'est moins que le basic EPS, donc l'EPS baisse.\nPiège : si l'effet par action dépasse le basic EPS, le titre est antidilutive et exclu.",
      ],
      [
        "Quels éléments passent en OCI (other comprehensive income) plutôt qu'en Net Income ?",
        "==Currency translation== · ==FVOCI== debt gains · ==Cash flow== hedges · Pension ==remeasurements== · ==Revaluation surplus==\nEn clair : comprehensive income = Net Income + OCI. FVOCI = fair value through OCI (available-for-sale aux États-Unis) : les gains latents sur debt securities y passent.",
      ],
      [
        "Goodwill : une entreprise en achète une autre 500 millions ; la fair value des identifiable net assets acquis vaut 380 millions. Quel goodwill, et comment le traite-t-on ensuite ?",
        "Goodwill = 500 − 380 = ==120 millions==, jamais amorti\nEn clair : goodwill = prix payé − fair value des identifiable net assets. Comme un intangible à indefinite life : impairment test annuel ; intangible à finite life (patent) : amorti.\nPiège : un goodwill créé en interne n'est jamais au bilan ; un intangible interne, en général non plus.",
      ],
      [
        "Debt securities détenus : quelle mesure selon le business model sous IFRS (International Financial Reporting Standards) et US GAAP (US generally accepted accounting principles) ?",
        "Hold to collect : ==amortized cost== · Collect and sell : ==FVOCI== · Trading : ==FVPL==\nEn clair : FVOCI (fair value through OCI) : gains latents en OCI (other comprehensive income) ; FVPL (fair value through profit or loss) : en Net Income. US GAAP : held-to-maturity, available-for-sale, trading.\nPiège : actions et derivatives : FVPL par défaut.",
      ],
    ],
  },
  {
    title: "Financial Statement Analysis — Flashcards 2/4 (Flux de trésorerie & stocks)",
    cards: [
      [
        "Cash flow statement : quelles opérations vont en CFO (cash flow from operations), en CFI (investing) et en CFF (financing) ?",
        "CFO : ==exploitation== · CFI : ==actifs long terme== · CFF : ==dette et equity==\nEn clair : CFO = clients, fournisseurs, salariés, income taxes ; CFI = achat ou vente de machines et de titres ; CFF = emprunts, remboursements, émission ou rachat de shares, dividends paid.\nPiège : bonds d'une autre entreprise = CFI (trading securities : CFO) ; émettre ses bonds = CFF.",
      ],
      [
        "Interest paid, dividends paid, interest received, dividends received : où les classer sous US GAAP (US generally accepted accounting principles) et sous IFRS (International Financial Reporting Standards) ?",
        "US GAAP : tout en CFO sauf ==dividends paid en CFF==\nEn clair : IFRS laisse le choix : paid en CFO ou CFF, received en CFO ou CFI. CFO, CFI, CFF = cash flow from operating, investing, financing activities.\nPiège : taxes paid : toujours CFO en US GAAP ; en IFRS, CFI ou CFF si liées à ces activités.",
      ],
      [
        "Indirect method : Net Income 500, depreciation 120, gain sur cession d'un actif 30, accounts receivable +40, accounts payable +25. Quel CFO (cash flow from operations) ?",
        "CFO = 500 + 120 − 30 − 40 + 25 = ==575==\nEn clair : Net Income + non-cash charges − gains − hausse des operating assets (receivables) + hausse des operating liabilities (payables).\nPiège : le gain est retiré : tout le produit de cession va en CFI (cash flow from investing).",
      ],
      [
        "Direct method : Revenue 1 000, accounts receivable +50, unearned revenue +10. Combien de cash collected from customers ?",
        "Cash collected = 1 000 − 50 + 10 = ==960==\nEn clair : cash collected from customers = Revenue − ΔAR (accounts receivable) + Δunearned revenue. Receivables en hausse = ventes non encaissées ; unearned en hausse = cash reçu d'avance.",
      ],
      [
        "Direct method : COGS (cost of goods sold) 600, inventory +40, accounts payable +30. Combien de cash paid to suppliers ?",
        "Cash paid to suppliers = 600 + 40 − 30 = ==610==\nEn clair : cash paid to suppliers = COGS + ΔInventory − ΔAP (accounts payable). Stocker plus coûte du cash ; payer plus tard en économise.",
      ],
      [
        "Une machine (cost 200, accumulated depreciation 120) est vendue avec un gain de 15. Quel montant apparaît en CFI (cash flow from investing) ?",
        "CFI = book value + gain = 80 + 15 = ==95==\nEn clair : book value = cost − accumulated depreciation = 200 − 120 = 80. Le cash reçu à la vente, 95, entre en CFI.\nPiège : en CFI, c'est le cash reçu (95), ni la book value (80) ni le gain (15).",
      ],
      [
        "US GAAP (US generally accepted accounting principles) : debt issued 300, debt repaid 100, shares issued 50, share repurchases 80, dividends paid 40. Quel CFF (cash flow from financing) ?",
        "CFF = 300 − 100 + 50 − 80 − 40 = ==130==\nEn clair : CFF = net borrowing (debt issued − debt repaid) + shares issued − share repurchases − dividends paid.\nPiège : l'interest paid n'y entre pas : en US GAAP, il va en CFO (cash flow from operations).",
      ],
      [
        "Quelle est la formule du FCFF (free cash flow to the firm) à partir du CFO (cash flow from operations) ?",
        "FCFF : cash pour ==créanciers et actionnaires==\n$$\\text{FCFF} = \\text{CFO} + \\text{Int}(1-t) - \\text{FCInv}$$\nEn clair : les intérêts après impôt reviennent aux créanciers. Int = interest paid, t = tax rate, FCInv = fixed capital investment = capital expenditures − cessions d'actifs.\nPiège : interest paid déjà en CFF (option IFRS, International Financial Reporting Standards) : ne pas le rajouter.",
      ],
      [
        "Quelle est la formule du FCFE (free cash flow to equity) à partir du CFO (cash flow from operations) ?",
        "FCFE : cash pour ==les seuls actionnaires==\n$$\\text{FCFE} = \\text{CFO} - \\text{FCInv} + \\text{net borrowing}$$\nEn clair : FCInv = fixed capital investment (capital expenditures − cessions d'actifs) ; net borrowing = emprunts − remboursements.\nPiège : net borrowing négatif si l'entreprise rembourse plus qu'elle n'emprunte : il réduit le FCFE.",
      ],
      [
        "Comment calcule-t-on le reinvestment ratio, et que mesure-t-il ?",
        "Reinvestment ratio = CFO / ==cash paid for long-term assets==\nEn clair : il mesure si le CFO (cash flow from operations) suffit à financer les investissements. Autre cash coverage ratio : debt coverage = CFO / total debt.",
      ],
      [
        "Prix en hausse, stocks stables : LIFO (last in, first out) vs FIFO (first in, first out), quels effets sur COGS, Net Income, impôts et CFO ?",
        "LIFO : COGS ↑, Net Income ↓, income taxes ↓, ==CFO ↑==\nEn clair : les derniers achats, plus chers, vont en COGS (cost of goods sold) : moins d'impôt, plus de CFO (cash flow from operations). Inventory ↓ : current ratio ↓, inventory turnover ↑.\nPiège : LIFO liquidation (stocks en baisse) = vieux coûts bas dans le COGS, marge gonflée non durable.",
      ],
      [
        "Stock initial 100 unités à 10, achats 200 unités à 12 puis 150 unités à 14 ; 250 unités vendues. Quel COGS (cost of goods sold) sous FIFO et sous LIFO ?",
        "COGS : ==FIFO 2 800, LIFO 3 300==\nEn clair : FIFO (first in, first out) vend les vieux lots : 100 × 10 + 150 × 12. LIFO (last in, first out) vend les récents : 150 × 14 + 100 × 12. Ending inventory = 5 500 − COGS.\nPiège : LIFO est interdit sous IFRS (International Financial Reporting Standards).",
      ],
      [
        "Inventory LIFO (last in, first out) 400, LIFO reserve 60 (45 un an plus tôt), COGS LIFO 1 000. Quels inventory et COGS (cost of goods sold) sous FIFO (first in, first out) ?",
        "Inventory FIFO = 460 ; COGS FIFO = ==985==\nEn clair : inventory : on ajoute le solde de la LIFO reserve (400 + 60). COGS : on retire sa variation (1 000 − (60 − 45)).\nPiège : COGS FIFO = COGS LIFO − ΔLIFO reserve : la variation, pas le solde.",
      ],
      [
        "Inventories au bilan sous IFRS (International Financial Reporting Standards) et US GAAP (US generally accepted accounting principles) : quelle valeur, et une write-down est-elle réversible ?",
        "Lower of cost or NRV ; reprise ==IFRS oui, US GAAP non==\nEn clair : NRV = net realizable value ; reprise IFRS plafonnée à la write-down. US GAAP sous LIFO (last in, first out) ou retail method : lower of cost or market.\nPiège : write-down : ROA (return on assets) ↓ l'année même, ↑ ensuite (assets et cost of goods sold plus bas).",
      ],
      [
        "Inventory : cost 3 200, selling price 3 500, completion et selling costs 350, normal profit margin 200, replacement cost 2 900. Valeur au bilan en lower of cost or NRV, et en lower of cost or market ?",
        "Cost or NRV : 3 150 ; cost or market : ==2 950==\nEn clair : NRV (net realizable value) = 3 500 − 350 = 3 150. Market = replacement cost (2 900), ramené entre NRV − normal profit margin (2 950) et NRV (3 150) : 2 950.\nPiège : la write-down baisse le current ratio, pas le quick ratio (l'inventory n'y entre pas).",
      ],
    ],
  },
  {
    title: "Financial Statement Analysis — Flashcards 3/4 (Actifs & passifs long terme, impôts)",
    cards: [
      [
        "Capitaliser un coût plutôt que le passer en charges : quels effets sur le Net Income, le CFO (cash flow from operations) et le CFI (cash flow from investing) ?",
        "Capitaliser : ==CFO ↑, CFI ↓== ; Net Income ↑ l'an 1, puis ↓\nEn clair : le coût est étalé par la depreciation sur les années qui en profitent (matching). Assets et equity ↑, donc D/E (debt-to-equity) ↓.\nPiège : capitalized interest : sortie en CFI ; l'ajouter à l'interest expense pour l'interest coverage.",
      ],
      [
        "Research and development (R&D) : capitalisé ou passé en charges, sous IFRS (International Financial Reporting Standards) et sous US GAAP (US generally accepted accounting principles) ?",
        "IFRS : ==development capitalisé== ; US GAAP : en charges, sauf software\nEn clair : IFRS : research en charges ; development capitalisé si des critères sont remplis. US GAAP : software à vendre capitalisé après la technological feasibility.\nPiège : US GAAP, software à usage interne : capitalisé dès que l'achèvement du projet est probable.",
      ],
      [
        "Impairment d'un actif long terme held for use : quel test sous IFRS (International Financial Reporting Standards) et sous US GAAP (US generally accepted accounting principles) ?",
        "Impairment si carrying value > ==recoverable amount== (IFRS), > undiscounted cash flows (US GAAP)\nEn clair : recoverable amount = max(fair value − costs to sell ; value in use). Perte = carrying value − recoverable amount (IFRS) ou − fair value (US GAAP).\nPiège : reprise IFRS oui (plafonnée) ; US GAAP non, sauf held for sale.",
      ],
      [
        "Revaluation model des PP&E (property, plant and equipment) : permis sous IFRS (International Financial Reporting Standards) ou US GAAP (US generally accepted accounting principles) ? Où va une hausse ?",
        "Revaluation : ==IFRS seulement== ; hausse en OCI (revaluation surplus)\nEn clair : une hausse va en OCI (other comprehensive income), sauf si elle reprend une baisse passée en Net Income ; une baisse va en Net Income, sauf si elle annule un surplus.",
      ],
      [
        "Pour le lessor, et pour le lessee sous US GAAP (US generally accepted accounting principles) : quels critères classent un lease en finance lease plutôt qu'en operating lease ?",
        "==Ownership transfer== · ==Purchase option== · Major part of ==economic life== · ==PV ≥ fair value== · ==Specialized asset==\nEn clair : un seul critère suffit (purchase option : exercice quasi certain ; PV = present value des lease payments). Le lessee IFRS (International Financial Reporting Standards) : tout en finance lease.",
      ],
      [
        "Lessee, IFRS (International Financial Reporting Standards) ou US GAAP (US generally accepted accounting principles) : qu'inscrit-il au bilan au début d'un lease de plus de 12 mois ?",
        "ROU asset et lease liability = ==PV des lease payments==\nEn clair : ROU = right-of-use, PV = present value. Puis amortization du ROU asset (operating expense) et interest expense (hors operating income) ; US GAAP operating lease : une lease expense.\nPiège : principal en CFF (financing), sauf US GAAP operating lease : tout le paiement en CFO (operations).",
      ],
      [
        "Comment le lessor comptabilise-t-il un finance lease, par rapport à un operating lease ?",
        "Finance lease : le lessor ==sort l'actif== et inscrit une lease receivable\nEn clair : il comptabilise ensuite de l'interest income. Operating lease : il garde l'actif, l'amortit, et les loyers sont du revenue.\nPiège : sales-type lease (fabricant ou dealer) : profit de vente dès le début ; direct financing : intérêts seulement.",
      ],
      [
        "Defined benefit pension plan : PBO (projected benefit obligation) 500 millions, fair value des plan assets 420 millions. Qu'inscrit l'employeur au bilan ?",
        "Net pension liability = 500 − 420 = ==80 millions==\nEn clair : PBO − fair value des plan assets : underfunded = liability, overfunded = asset. Remeasurements (actuarial gains/losses) : en OCI (other comprehensive income).\nPiège : defined contribution plan : aucun passif, la pension expense = la cotisation versée.",
      ],
      [
        "Defined benefit plan : quelle part du pension cost va en Net Income sous IFRS (International Financial Reporting Standards) et sous US GAAP (US generally accepted accounting principles) ?",
        "IFRS : ==service cost + net interest== ; remeasurements en OCI\nEn clair : OCI = other comprehensive income. US GAAP : service cost + interest cost − expected return on plan assets ; past service cost et actuarial gains/losses : OCI puis amortis.\nPiège : past service cost : Net Income tout de suite en IFRS ; OCI puis amorti en US GAAP.",
      ],
      [
        "Comment comptabilise-t-on des employee stock options dans l'income statement ?",
        "Fair value à la grant date, ==étalée sur la vesting period==\nEn clair : on l'étale en compensation expense, de façon linéaire ; contrepartie APIC (additional paid-in capital). Aucun cash ne sort, mais les actionnaires seront dilués.\nPiège : la fair value n'est pas réestimée ensuite, même si le cours de l'action bouge.",
      ],
      [
        "Taxes payable 840, DTL (deferred tax liability) +60, DTA (deferred tax asset) +20 sur l'année. Quelle income tax expense ?",
        "Income tax expense = ==880==\n$$\\text{Income tax expense} = \\text{taxes payable} + \\Delta\\text{DTL} - \\Delta\\text{DTA}$$\nEn clair : 840 + 60 − 20 = 880. Taxes payable vient de la déclaration fiscale (taxable income) ; l'income tax expense, de l'income statement (pretax income).\nPiège : si le tax rate change, DTA et DTL sont réévalués (taux ↑ : les deux ↑) ; l'écart passe en income tax expense.",
      ],
      [
        "Machine : carrying value 600, tax base 450, tax rate 30 %. Quel impôt différé, DTA (deferred tax asset) ou DTL (deferred tax liability) ?",
        "==DTL== = (600 − 450) × 30 % = 45\nEn clair : pour un actif, carrying value > tax base crée une DTL : moins d'impôt payé aujourd'hui (accelerated depreciation fiscale), davantage ensuite.\nPiège : pour un passif, c'est l'inverse : carrying value > tax base crée un DTA.",
      ],
      [
        "Quelles situations créent un DTA (deferred tax asset), et que fait-on en US GAAP (US generally accepted accounting principles) s'il risque de ne jamais servir ?",
        "DTA = impôt ==payé d'avance== : taxes payable > income tax expense\nEn clair : exemples : warranty expense comptabilisée avant d'être déductible, revenue reçu d'avance déjà taxé, tax loss carryforwards.\nPiège : DTA qui risque de ne pas servir : valuation allowance en US GAAP, d'où income tax expense ↑.",
      ],
      [
        "Une permanent difference fiscale crée-t-elle un DTA (deferred tax asset) ou un DTL (deferred tax liability) ? Quel effet sur l'effective tax rate ?",
        "Permanent difference : ==ni DTA ni DTL==, effective tax rate ≠ statutory\nEn clair : écart entre taxable income et pretax income qui ne se renversera jamais (municipal bonds exonérés, amendes non déductibles). Effective tax rate = income tax expense / pretax income.",
      ],
      [
        "Un DTL (deferred tax liability) qui ne devrait jamais se renverser : dette ou equity pour l'analyste ?",
        "DTL qui ne se renverse jamais = ==equity==\nEn clair : cet impôt ne sera jamais payé (ex. capital expenditures en croissance continue). S'il doit se renverser : dette. Le reclasser en equity baisse le D/E (debt-to-equity).",
      ],
    ],
  },
  {
    title: "Financial Statement Analysis — Flashcards 4/4 (Qualité de l'information, techniques & modélisation)",
    cards: [
      [
        "Spectrum of financial reporting quality : quel est le niveau le plus haut, et le plus bas ?",
        "Sommet : ==decision-useful==, earnings durables ; tout en bas : fictitious transactions\nEn clair : au sommet, conforme aux GAAP (generally accepted accounting principles). Puis : earnings peu durables, biased choices, earnings management, departures from GAAP.\nPiège : reporting quality et earnings quality sont deux dimensions distinctes.",
      ],
      [
        "Conservative vs aggressive accounting : lequel est un biais, et comment l'earnings smoothing s'en sert-il ?",
        "==Les deux sont des biais== ; le smoothing les alterne\nEn clair : aggressive gonfle les earnings de la période, conservative les réduit. Earnings smoothing : conservative au-dessus de l'objectif, aggressive en dessous.\nPiège : conservative n'est pas « bon » : il peut gonfler les earnings futurs.",
      ],
      [
        "Quelles 3 conditions sont souvent réunies quand un management publie des financial reports de mauvaise qualité ?",
        "==Motivation== · ==Opportunity== · ==Rationalization==\nEn clair : motivation : battre les objectifs, rémunération, covenants ; opportunity : contrôles internes faibles, board peu vigilant ; rationalization : se justifier à soi-même.",
      ],
      [
        "Quels warning signs doivent pousser un analyste à creuser la qualité des earnings ?",
        "==Net Income ↑, CFO stagnant== · ==Turnover ratios ↓== · Revenue ==hors norme== · ==4e trimestre== atypique · « Nonrecurring » ==récurrents==\nEn clair : un Net Income que le CFO (cash flow from operations) ne suit pas = alerte n° 1. Aussi : channel stuffing, bill-and-hold, non-GAAP measures (hors generally accepted accounting principles).",
      ],
      [
        "Vertical vs horizontal common-size analysis : quelle base utilise chacune ?",
        "Vertical : ==% du revenue ou du total assets== ; horizontal : % d'une année de base\nEn clair : vertical = revenue pour l'income statement, total assets pour le balance sheet ; il gomme l'effet taille. L'horizontal suit chaque poste dans le temps (tendances).",
      ],
      [
        "Current ratio, quick ratio, cash ratio : que met chacun au numérateur ?",
        "Current → quick → cash : on retire ==l'inventory, puis les receivables==\nEn clair : current = current assets ; quick = cash + marketable securities + receivables ; cash = cash + marketable securities. Dénominateur commun : current liabilities.",
      ],
      [
        "Cash conversion cycle (CCC) sur 365 jours : COGS (cost of goods sold) 730, purchases 730, revenue 1 460 ; average inventory 100, average receivables 160, average payables 60. Quel CCC ?",
        "CCC = DOH + DSO − DPO = 50 + 40 − 30 = ==60 jours==\nEn clair : DOH (days of inventory on hand) = 365 × 100 / 730 ; DSO (days of sales outstanding) = 365 × 160 / 1 460 ; DPO (days of payables outstanding) = 365 × 60 / 730.\nPiège : DSO sur le revenue ; DOH sur le COGS ; DPO sur les purchases (COGS + Δinventory).",
      ],
      [
        "Debt-to-assets, debt-to-equity, debt-to-capital et financial leverage ratio : quelles formules, dans cet ordre ?",
        "Debt / ==total assets== · Debt / ==total equity== · Debt / ==(debt + equity)== · ==Avg assets / avg equity==\nEn clair : debt = dettes portant intérêt (pas les payables). Plus ces ratios sont hauts, plus le solvency risk est élevé ; le financial leverage ratio entre dans le DuPont.\nPiège : financial leverage = assets / equity, pas debt / equity.",
      ],
      [
        "Interest coverage vs fixed charge coverage : quelle différence de formule ?",
        "Fixed charge coverage : ==+ lease payments== en haut et en bas\nEn clair : interest coverage = EBIT / interest payments ; fixed charge coverage = (EBIT + lease payments) / (interest payments + lease payments). EBIT = earnings before interest and taxes.",
      ],
      [
        "Gross PP&E (property, plant and equipment) 3 millions, accumulated depreciation 1 million, depreciation expense 0,5 million par an (straight-line). Quels average age et remaining useful life ?",
        "Average age ==2 ans== ; remaining useful life 4 ans\nEn clair : average age = accumulated depreciation / depreciation expense = 1 / 0,5 ; remaining = net PP&E / depreciation = 2 / 0,5. Total useful life = 3 / 0,5 = 6 ans.\nPiège : approximations valables en straight-line, sans salvage value.",
      ],
      [
        "Comment le DuPont à 3 facteurs décompose-t-il le ROE (return on equity) ?",
        "ROE = ==margin × turnover × leverage==\n$$\\text{ROE} = \\dfrac{\\text{NI}}{\\text{revenue}} \\times \\dfrac{\\text{revenue}}{\\text{avg assets}} \\times \\dfrac{\\text{avg assets}}{\\text{avg equity}}$$\nEn clair : net profit margin × total asset turnover × financial leverage ; NI = Net Income. Les deux premiers donnent le ROA (return on assets). Ex. : 8 % × 1,5 × 2 = 24 %.\nPiège : un ROE qui monte seulement grâce au levier n'est pas un progrès opérationnel.",
      ],
      [
        "Comment le DuPont à 5 facteurs décompose-t-il le ROE (return on equity) ?",
        "==Tax burden== · ==Interest burden== · ==EBIT margin== · ==Asset turnover== · ==Leverage==\nEn clair : NI/EBT × EBT/EBIT × EBIT/revenue × revenue/assets × assets/equity ; NI = Net Income, EBT = earnings before taxes, EBIT = earnings before interest and taxes.\nPiège : tax burden = NI / EBT = 1 − tax rate : plus il est haut, moins on paie d'impôt.",
      ],
      [
        "Par quoi commence un sales-based pro forma model, et comment modélise-t-on ensuite les coûts ?",
        "Tout part de la ==prévision du revenue==\nEn clair : COGS (cost of goods sold) souvent en % du revenue ; SG&A (selling, general and administrative) en partie fixes, d'où un operating leverage qui amplifie les chocs.\nPiège : entreprise cyclique : l'horizon doit couvrir le milieu du cycle (normalized earnings).",
      ],
      [
        "Quels behavioral biases menacent les prévisions d'un analyste financier ?",
        "==Overconfidence== · ==Illusion of control== · ==Conservatism== (anchoring) · ==Representativeness== · ==Confirmation bias==\nEn clair : conservatism : ajuster trop peu sa prévision aux nouvelles infos ; representativeness : oublier le base rate (remède : croiser inside view et outside view).",
      ],
      [
        "Porter's five forces : quelle force pèse sur les input costs, et lesquelles sur le pricing power ?",
        "Suppliers ⇒ ==input costs== ; les 4 autres forces ⇒ pricing power\nEn clair : bargaining power of suppliers sur les coûts ; threat of substitutes, rivalry, bargaining power of customers, threat of new entrants sur les prix.\nPiège : coût répercuté dollar pour dollar : gross profit inchangé, mais gross margin en baisse.",
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
