// Seed script — flashcards "Système" Financial Statement Analysis.
// 4 sets de 15 cartes (60 au total), pensés pour couvrir les ~20% de
// notions qui permettent de comprendre ~80% du domaine (formules, règles
// de classification, signaux d'alerte). Convention de langue : phrases de
// liaison en français (pour la fluidité de compréhension), mais TOUS les
// termes techniques/comptables importants — ceux qui apparaîtraient dans
// une formule ou qui sont du vocabulaire d'examen — restent en ANGLAIS
// (Net Income, Revenue, Equity, Total Assets, Accounts Receivable...), pas
// juste les sigles (CFO, EBIT...). Voir memory
// cfa-hub-flashcards-architecture.md. Formules au format KaTeX
// ($$...$$ = bloc, $...$ = inline), images en ![alt](url) — rendues par
// components/RichText.tsx.
// Usage: node scripts/seed-flashcards-fsa.mjs
import { getOwnerId, ensureFolder, seedFlashcardSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const SETS = [
  {
    title: "Financial Statement Analysis — Flashcards 1/4 (Cadre d'analyse, résultat & bilan)",
    cards: [
      [
        "Quelles sont les 6 étapes du framework d'analyse des états financiers (CFA) ?",
        "1. Define the purpose and context\n2. Collect data\n3. Process the data\n4. Analyze/interpret the data\n5. Develop conclusions and recommendations (report)\n6. Follow-up",
      ],
      [
        "Quels sont les 4 types d'opinion d'audit, du plus au moins favorable ?",
        "Unqualified (sans réserve) > Qualified (avec réserve) > Adverse (défavorable) > Disclaimer (refus d'opinion)",
      ],
      [
        "Que doit obligatoirement couvrir le MD&A (Management Discussion & Analysis) ?",
        "Results of operations, Liquidity & capital resources, événements/incertitudes connus susceptibles d'affecter les résultats futurs (litiges, réglementation...)",
      ],
      [
        "Quelle est la formule du résultat dilué par action (Diluted EPS) ?",
        "$$\\text{Diluted EPS} = \\dfrac{\\text{Net Income} - \\text{Preferred dividends}}{\\text{Weighted average shares} + \\text{Dilutive potential shares}}$$",
      ],
      [
        "Un élément est-il \"non-recurring\" simplement s'il apparaît une seule fois dans le compte de résultat ?",
        "Pas nécessairement — la vraie question est s'il va se RÉPÉTER à l'avenir. Une restructuring charge peut revenir plusieurs années mais rester \"non-recurring\" pour juger la capacité bénéficiaire durable.",
      ],
      [
        "Quelle est la formule du Quick ratio (liquidité immédiate) ?",
        "$$\\text{Quick ratio} = \\dfrac{\\text{Cash} + \\text{Short-term investments} + \\text{Accounts receivable}}{\\text{Current liabilities}}$$\nExclut l'inventory, contrairement au Current ratio.",
      ],
      [
        "Quelle est la différence entre un actif financier \"Held-to-Maturity\" (HTM) et \"Available-for-Sale\" (AFS) ?",
        "HTM : coût amorti, variations de Fair value non comptabilisées. AFS : Fair value, variations passées en OCI (Other Comprehensive Income) — recyclées en résultat seulement à la vente.",
      ],
      [
        "Comment calcule-t-on le Goodwill lors d'une acquisition ?",
        "$$\\text{Goodwill} = \\text{Purchase price} - \\text{Fair value of identifiable net assets acquired}$$\nLes acquisition/advisory fees sont exclus — toujours passés en charges.",
      ],
      [
        "Qu'est-ce qui distingue un actif intangible identifiable d'un actif intangible inidentifiable ?",
        "Identifiable : séparable ou issu d'un droit contractuel/légal (patent, licence, trademark). Inidentifiable : le Goodwill uniquement — jamais amorti, seulement testé pour impairment.",
      ],
      [
        "Quelle est la formule du ratio Debt-to-Equity (D/E) ?",
        "$$\\text{D/E} = \\dfrac{\\text{Total debt}}{\\text{Equity}}$$",
      ],
      [
        "Un Deferred Tax Liability (DTL) doit-il toujours être traité comme une vraie dette dans l'analyse du levier ?",
        "Non — seulement s'il est censé se dénouer (reverse). S'il n'est jamais censé se dénouer, il se comporte économiquement comme de l'Equity et doit être reclassé comme tel.",
      ],
      [
        "Quelle est la formule de l'Interest coverage ratio ?",
        "$$\\text{Interest coverage} = \\dfrac{\\text{EBIT}}{\\text{Interest expense}}$$",
      ],
      [
        "Comment reconnaît-on un Finance lease plutôt qu'un Operating lease ?",
        "Un seul critère suffit : transfert de propriété en fin de contrat, Bargain purchase option, durée ≈ Useful life de l'actif, PV des paiements ≈ Fair value, ou actif trop spécifique pour être réutilisé ailleurs.",
      ],
      [
        "Sous IFRS et US GAAP actuels, un contrat de location (hors exception courte durée/faible valeur) génère-t-il toujours un actif et un passif au bilan du preneur ?",
        "Oui — Finance lease comme Operating lease génèrent désormais un Right-of-use asset et une Lease liability.",
      ],
      [
        "Quelle est la formule du ROE selon le DuPont à 3 facteurs ?",
        "$$\\text{ROE} = \\dfrac{\\text{Net Income}}{\\text{Revenue}} \\times \\dfrac{\\text{Revenue}}{\\text{Assets}} \\times \\dfrac{\\text{Assets}}{\\text{Equity}}$$\nNet profit margin × Asset turnover × Financial leverage",
      ],
    ],
  },
  {
    title: "Financial Statement Analysis — Flashcards 2/4 (Flux de trésorerie & stocks)",
    cards: [
      [
        "Quelle est la formule du CFO en méthode directe ?",
        "$$\\text{CFO} = \\text{Cash collected from customers} - \\text{Cash paid to suppliers/for expenses} - \\text{Interest paid} - \\text{Taxes paid}$$",
      ],
      [
        "Quelle est la logique de départ de la méthode indirecte pour calculer le CFO ?",
        "On part du Net Income, on rajoute les non-cash charges (depreciation/amortization), on retire les non-cash gains (gains on sale), et on ajuste les changes in working capital (receivables, inventory, payables).",
      ],
      [
        "Une augmentation des Accounts Receivable a-t-elle un effet positif ou négatif sur le CFO ?",
        "Négatif — une hausse des Accounts Receivable signifie que des ventes sont dans le Net Income mais pas encore encaissées en cash.",
      ],
      [
        "Pourquoi une hausse anormale et soudaine des Days Payable est-elle un signal d'alerte sur le CFO ?",
        "Elle peut gonfler artificiellement et temporairement le CFO en retardant les paiements — une pratique non durable, non répétable indéfiniment.",
      ],
      [
        "Sous US GAAP, comment sont classés les Interest paid et les Dividends received dans le tableau de flux ?",
        "Les deux vont en CFO (exploitation). Sous IFRS, il existe un choix : ils peuvent aller en CFO OU en CFI/CFF selon la politique retenue.",
      ],
      [
        "Une entreprise capitalise un coût au lieu de le passer en charges. Quel est l'effet sur le CFO par rapport à la charge immédiate ?",
        "Le CFO est plus élevé — le cash outflow est reclassé en CFI (investing) au lieu de CFO (operating).",
      ],
      [
        "Quelle est la formule du Free Cash Flow to the Firm (FCFF) à partir du CFO ?",
        "$$\\text{FCFF} = \\text{CFO} + \\text{Interest} \\times (1 - t) - \\text{Capex}$$",
      ],
      [
        "Quelle est la formule du Free Cash Flow to Equity (FCFE) à partir du FCFF ?",
        "$$\\text{FCFE} = \\text{FCFF} - \\text{Interest} \\times (1-t) + \\text{Net borrowing}$$",
      ],
      [
        "En période de hausse des prix (inflation), quelle méthode d'inventory (FIFO ou LIFO) donne le COGS le plus élevé ?",
        "LIFO — les unités les plus récentes (les plus chères) sont vendues en premier, ce qui gonfle le COGS et réduit le Net Income par rapport à FIFO.",
      ],
      [
        "En période de hausse des prix, quelle méthode (FIFO ou LIFO) donne l'inventory au bilan le plus proche de sa Replacement cost actuelle ?",
        "FIFO — l'inventory restant est composé des unités les plus récentes (les plus chères), proche de la Replacement cost actuelle.",
      ],
      [
        "Sous US GAAP, un Inventory write-down peut-il être repris si la valeur remonte ensuite ?",
        "Non — contrairement à l'IFRS, US GAAP interdit toute reprise d'un Inventory write-down une fois constaté.",
      ],
      [
        "Quelle est la règle IFRS de valorisation de l'inventory au bilan ?",
        "Le plus bas entre le Cost et la Net Realizable Value (NRV).",
      ],
      [
        "Une hausse de l'Inventory turnover combinée à une baisse du Revenue est-elle un bon signal ?",
        "Non — c'est souvent un signal d'alerte : cela peut indiquer une baisse de la demande (ventes en difficulté) plutôt qu'une gestion efficace de l'inventory.",
      ],
      [
        "Quelle est la formule des Days Inventory on Hand (DOH) ?",
        "$$\\text{DOH} = \\dfrac{365}{\\text{Inventory turnover}}$$",
      ],
      [
        "Quelle est la formule du Cash Conversion Cycle (CCC) ?",
        "$$\\text{CCC} = \\text{DOH} + \\text{DSO} - \\text{DPO}$$\nDays Inventory on Hand + Days Sales Outstanding − Days Payables Outstanding",
      ],
    ],
  },
  {
    title: "Financial Statement Analysis — Flashcards 3/4 (Actifs & passifs long terme, impôts)",
    cards: [
      [
        "Quelle est la formule de la Straight-line depreciation ?",
        "$$\\text{Annual depreciation} = \\dfrac{\\text{Cost} - \\text{Salvage value}}{\\text{Useful life}}$$",
      ],
      [
        "Sous US GAAP, une entreprise peut-elle réévaluer à la hausse la valeur de ses immobilisations corporelles (PP&E) ?",
        "Non — US GAAP interdit tout Revaluation model. Sous IFRS, le Revaluation model est autorisé (à la Fair value, effet partiel en résultat et partiel en OCI).",
      ],
      [
        "Un coût de développement logiciel est-il capitalisé ou passé en charges selon son stade d'avancement ?",
        "Avant la Technological feasibility démontrée : passé en charges. Après (prototypes fonctionnels) : capitalisé, puis amorti.",
      ],
      [
        "Quelle est la différence de traitement entre un actif intangible à Finite life et Indefinite life ?",
        "Finite life : amorti sur sa Useful life. Indefinite life : jamais amorti, seulement testé pour Impairment.",
      ],
      [
        "Entre capitaliser et passer en charges un coût identique, laquelle des deux approches donne le Net Income le plus élevé la première année ?",
        "Capitaliser — seule une fraction (la depreciation) impacte le Net Income la première année, contre 100% de la charge si elle est passée en charges immédiatement.",
      ],
      [
        "Quel critère suffit, à lui seul, à classer un bail en Finance lease plutôt qu'en Operating lease ?",
        "Une Bargain purchase option que le preneur est quasi certain d'exercer — un seul critère parmi plusieurs suffit.",
      ],
      [
        "Quelle est la différence entre un Defined Benefit plan et un Defined Contribution plan au niveau du bilan de l'employeur ?",
        "Defined Benefit : un actif/passif net apparaît au bilan (Funded status). Defined Contribution : rien au bilan, l'obligation s'éteint dès le versement de la cotisation.",
      ],
      [
        "Comment calcule-t-on le Funded status d'un Defined Benefit plan ?",
        "$$\\text{Funded status} = \\text{Fair value of plan assets} - \\text{Projected Benefit Obligation (PBO)}$$",
      ],
      [
        "Sur quelle durée est étalée la charge de Share-based compensation ?",
        "Sur la Vesting period, à partir de la Fair value estimée à la Grant date.",
      ],
      [
        "Quelle est la formule du Deferred Tax Liability (DTL) lié à un actif ?",
        "$$\\text{DTL} = (\\text{Carrying value} - \\text{Tax base}) \\times \\text{tax rate}$$",
      ],
      [
        "Quelle est la différence entre une Temporary difference et une Permanent difference en fiscalité différée ?",
        "Temporary difference : crée un Deferred Tax Asset/Liability (méthodes de depreciation différentes). Permanent difference : jamais déductible/imposable, ne crée jamais d'élément différé (intérêts d'obligations municipales).",
      ],
      [
        "Quelle base sert à calculer les Taxes payable, et laquelle sert à calculer la Tax expense ?",
        "Taxes payable = Taxable income × tax rate. Tax expense = Pretax income × tax rate.",
      ],
      [
        "Quelle est la formule de l'Effective tax rate ?",
        "$$\\text{Effective tax rate} = \\dfrac{\\text{Tax expense}}{\\text{Pretax income}}$$",
      ],
      [
        "Un Deferred Tax Liability qui n'est jamais censé se dénouer doit-il être traité comme une dette dans l'analyse du levier financier ?",
        "Non — il doit être reclassé en Equity, car il ne générera jamais de sortie de trésorerie réelle.",
      ],
      [
        "Quelle est la formule du ROE selon le DuPont étendu à 5 facteurs ?",
        "$$\\text{ROE} = \\dfrac{\\text{NI}}{\\text{EBT}} \\times \\dfrac{\\text{EBT}}{\\text{EBIT}} \\times \\dfrac{\\text{EBIT}}{\\text{Revenue}} \\times \\dfrac{\\text{Revenue}}{\\text{Assets}} \\times \\dfrac{\\text{Assets}}{\\text{Equity}}$$\nTax burden × Interest burden × EBIT margin × Asset turnover × Financial leverage",
      ],
    ],
  },
  {
    title: "Financial Statement Analysis — Flashcards 4/4 (Qualité de l'information, techniques & modélisation)",
    cards: [
      [
        "Quelles sont les 3 conditions classiques qui favorisent une communication financière de mauvaise qualité (Fraud triangle) ?",
        "Opportunity (contrôles internes faibles), Motivation (pression pour atteindre un objectif), Rationalization (justification morale que se donne l'auteur).",
      ],
      [
        "Une entreprise capitalise un coût qui devrait être passé en charges. Quel est l'effet sur le CFO ?",
        "Le CFO est artificiellement plus élevé — le cash outflow est reclassé en CFI (investing) au lieu de CFO (operating).",
      ],
      [
        "Une communication financière conforme au GAAP mais avec des Earnings non durables est-elle de haute ou basse qualité ?",
        "La qualité du Reporting peut rester haute (conforme, utile à la décision) même si la qualité des Earnings est faible (non durable) — deux dimensions distinctes du spectre de qualité.",
      ],
      [
        "Qu'indique une hausse soudaine et anormale des Days Payable sur la qualité du tableau de flux ?",
        "Un signal d'alerte — le CFO peut être gonflé artificiellement et temporairement en retardant les paiements, une pratique non durable.",
      ],
      [
        "Quelle est la formule de l'Asset turnover ?",
        "$$\\text{Asset turnover} = \\dfrac{\\text{Revenue}}{\\text{Average total assets}}$$",
      ],
      [
        "Quelle est la formule du Financial leverage dans le DuPont ?",
        "$$\\text{Financial leverage} = \\dfrac{\\text{Average total assets}}{\\text{Average equity}}$$",
      ],
      [
        "Diminuer le Salvage value estimé d'un actif augmente-t-il ou diminue-t-il le Net Income de la période ?",
        "Diminue — la base amortissable augmente, donc la Depreciation expense augmente et le Net Income baisse.",
      ],
      [
        "Quelle est la formule des Common-size statements ?",
        "$$\\text{Balance sheet line item \\%} = \\dfrac{\\text{Line item}}{\\text{Total assets}} \\qquad \\text{Income statement line item \\%} = \\dfrac{\\text{Line item}}{\\text{Revenue}}$$",
      ],
      [
        "Un Gross margin en hausse combiné à un Net margin en baisse sur la même période — que peut-on en déduire ?",
        "Le contrôle des coûts s'est amélioré AU-DESSUS du Gross margin (COGS) mais s'est détérioré EN DESSOUS (charges d'exploitation, financières ou exceptionnelles).",
      ],
      [
        "Quelle est la formule du Reinvestment ratio (base cash-flow) ?",
        "$$\\text{Reinvestment ratio} = \\dfrac{\\text{CFO}}{\\text{Capex}}$$",
      ],
      [
        "Pourquoi un Pro forma model \"basé sur les ventes\" (sales-based) commence-t-il toujours par prévoir le Revenue ?",
        "Parce que la plupart des autres postes (coûts, Working capital, Capex) sont ensuite modélisés comme une fonction du Revenue prévisionnel.",
      ],
      [
        "Dans un Pro forma model, le COGS et les SG&A doivent-ils toujours être modélisés de la même façon (en % du Revenue) ?",
        "Non — le COGS est souvent variable (% du Revenue), mais les SG&A peuvent être en partie fixes (montant constant, indépendant du niveau de ventes) — une distinction clé à ne pas ignorer.",
      ],
      [
        "Qu'est-ce que le Representativeness bias et comment l'atténuer en prévision ?",
        "Se fier excessivement à une situation spécifique (Inside view) sans tenir compte du taux de base d'une population plus large (Outside view). On l'atténue en combinant les deux vues.",
      ],
      [
        "Pourquoi l'Operating profit chute-t-il souvent en % plus fortement que le Revenue lors d'un choc négatif ?",
        "À cause de l'Operating leverage : les charges fixes (SG&A) absorbent tout le choc en dollars sur une base bien plus petite que le Revenue, amplifiant l'effet en pourcentage.",
      ],
      [
        "Une baisse du volume de ventes affecte directement quels deux postes courants du bilan ?",
        "Les Accounts Receivable et l'Inventory — tous deux liés au niveau d'activité.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "flashcards");
  console.log("Flashcards — Système Financial Statement Analysis (4 sets × 15)...");
  const total = await seedFlashcardSets({ ownerId, folderId, sets: SETS });
  console.log(`\n✅ Terminé. ${total} cartes ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
