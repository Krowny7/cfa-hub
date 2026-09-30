// Seed script — nouvelles flashcards "Système" Financial Statement Analysis.
// Remplace l'ancien paradigme (gros sets par reading) par 4 sets de 15
// cartes (60 au total), pensés pour couvrir les ~20% de notions qui
// permettent de comprendre ~80% du domaine (formules clés, règles de
// classification, signaux d'alerte). Formulation en français pour la
// fluidité de compréhension, termes techniques clés laissés en anglais
// (CFO, EBIT, DuPont...). Formules au format KaTeX ($$...$$ sur sa propre
// ligne = bloc, $...$ = inline), rendues par components/RichText.tsx.
// Usage: node scripts/seed-flashcards-fsa.mjs
import { getOwnerId, ensureFolder, seedFlashcardSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const SETS = [
  {
    title: "Financial Statement Analysis — Flashcards 1/4 (Cadre d'analyse, résultat & bilan)",
    cards: [
      [
        "Quelles sont les 6 étapes du framework d'analyse des états financiers (CFA) ?",
        "1. Définir le but et le contexte\n2. Collecter les données\n3. Traiter les données\n4. Analyser/interpréter\n5. Rapport de conclusions\n6. Suivi (update)",
      ],
      [
        "Quels sont les 4 types d'opinion d'audit, du plus au moins favorable ?",
        "Unqualified (sans réserve) > Qualified (avec réserve) > Adverse (défavorable) > Disclaimer (refus d'opinion)",
      ],
      [
        "Que doit obligatoirement couvrir le MD&A (Management Discussion & Analysis) ?",
        "Résultats d'exploitation, liquidité & ressources en capital, événements/incertitudes connus susceptibles d'affecter les résultats futurs (litiges, réglementation...)",
      ],
      [
        "Quelle est la formule du résultat dilué par action (diluted EPS) ?",
        "$$\\text{Diluted EPS} = \\dfrac{\\text{Résultat net} - \\text{Dividendes privilégiés}}{\\text{Actions ordinaires pondérées} + \\text{Actions diluantes potentielles}}$$",
      ],
      [
        "Un élément est-il \"non récurrent\" (non-recurring) simplement s'il apparaît une seule fois dans le compte de résultat ?",
        "Pas nécessairement — la vraie question est s'il va se RÉPÉTER à l'avenir. Une charge de restructuration peut revenir plusieurs années mais rester \"non récurrente\" pour juger la capacité bénéficiaire durable.",
      ],
      [
        "Quelle est la formule du quick ratio (liquidité immédiate) ?",
        "$$\\text{Quick ratio} = \\dfrac{\\text{Cash} + \\text{Placements court terme} + \\text{Créances clients}}{\\text{Passifs courants}}$$\nExclut les stocks, contrairement au current ratio.",
      ],
      [
        "Quelle est la différence entre un actif financier \"Held-to-Maturity\" (HTM) et \"Available-for-Sale\" (AFS) ?",
        "HTM : coût amorti, variations de juste valeur non comptabilisées. AFS : juste valeur, variations passées en OCI (capitaux propres) — recyclées en résultat seulement à la vente.",
      ],
      [
        "Comment calcule-t-on le goodwill lors d'une acquisition ?",
        "$$\\text{Goodwill} = \\text{Prix payé} - \\text{Juste valeur de l'actif net identifiable acquis}$$\nLes frais d'acquisition/conseil sont exclus — toujours passés en charges.",
      ],
      [
        "Qu'est-ce qui distingue un actif intangible identifiable d'un actif intangible inidentifiable ?",
        "Identifiable : séparable ou issu d'un droit contractuel/légal (brevet, licence, marque). Inidentifiable : le goodwill uniquement — jamais amorti, seulement testé pour dépréciation.",
      ],
      [
        "Quelle est la formule du ratio dette/capitaux propres (debt-to-equity) ?",
        "$$\\text{D/E} = \\dfrac{\\text{Dette totale}}{\\text{Capitaux propres}}$$",
      ],
      [
        "Un passif d'impôt différé (DTL) doit-il toujours être traité comme une vraie dette dans l'analyse du levier ?",
        "Non — seulement s'il est censé se dénouer (reverse). S'il n'est jamais censé se dénouer, il se comporte économiquement comme des capitaux propres et doit être reclassé comme tel.",
      ],
      [
        "Quelle est la formule du ratio de couverture des intérêts (interest coverage) ?",
        "$$\\text{Interest coverage} = \\dfrac{\\text{EBIT}}{\\text{Charge d'intérêt}}$$",
      ],
      [
        "Comment reconnaît-on un contrat de location-financement (finance lease) plutôt qu'une location simple (operating lease) ?",
        "Un seul critère suffit : transfert de propriété en fin de contrat, option d'achat avantageuse, durée ≈ durée de vie utile, VA des paiements ≈ juste valeur, ou actif trop spécifique pour être réutilisé ailleurs.",
      ],
      [
        "Sous IFRS et US GAAP actuels, un contrat de location (hors exception courte durée/faible valeur) génère-t-il toujours un actif et un passif au bilan du preneur ?",
        "Oui — location-financement comme location simple génèrent désormais un droit d'utilisation (actif) et une dette de location (passif).",
      ],
      [
        "Quelle est la formule du ROE selon le DuPont à 3 facteurs ?",
        "$$\\text{ROE} = \\dfrac{\\text{Résultat net}}{\\text{CA}} \\times \\dfrac{\\text{CA}}{\\text{Actifs}} \\times \\dfrac{\\text{Actifs}}{\\text{CP}}$$\nmarge nette × rotation des actifs × levier financier",
      ],
    ],
  },
  {
    title: "Financial Statement Analysis — Flashcards 2/4 (Flux de trésorerie & stocks)",
    cards: [
      [
        "Quelle est la formule du CFO en méthode directe ?",
        "$$\\text{CFO} = \\text{Encaissements clients} - \\text{Décaissements fournisseurs/charges} - \\text{Intérêts payés} - \\text{Impôts payés}$$",
      ],
      [
        "Quelle est la logique de départ de la méthode indirecte pour calculer le CFO ?",
        "On part du résultat net, on rajoute les charges non-cash (amortissements), on retire les gains non-cash (plus-values sur cession), et on ajuste les variations du BFR (créances, stocks, dettes fournisseurs).",
      ],
      [
        "Une augmentation des créances clients (accounts receivable) a-t-elle un effet positif ou négatif sur le CFO ?",
        "Négatif — une hausse des créances signifie que des ventes sont en résultat mais pas encore encaissées en cash.",
      ],
      [
        "Pourquoi une hausse anormale et soudaine des délais fournisseurs (days payable) est-elle un signal d'alerte sur le CFO ?",
        "Elle peut gonfler artificiellement et temporairement le CFO en retardant les paiements — une pratique non durable, non répétable indéfiniment.",
      ],
      [
        "Sous US GAAP, comment sont classés les intérêts payés et les dividendes reçus dans le tableau de flux ?",
        "Les deux vont en CFO (exploitation). Sous IFRS, il existe un choix : ils peuvent aller en CFO OU en CFI/CFF selon la politique retenue.",
      ],
      [
        "Une entreprise capitalise un coût au lieu de le passer en charges. Quel est l'effet sur le CFO par rapport à la charge immédiate ?",
        "Le CFO est plus élevé — la sortie de trésorerie est reclassée en investissement (CFI) au lieu d'exploitation (CFO).",
      ],
      [
        "Quelle est la formule du Free Cash Flow to the Firm (FCFF) à partir du CFO ?",
        "$$\\text{FCFF} = \\text{CFO} + \\text{Intérêts} \\times (1 - t) - \\text{Capex}$$",
      ],
      [
        "Quelle est la formule du Free Cash Flow to Equity (FCFE) à partir du FCFF ?",
        "$$\\text{FCFE} = \\text{FCFF} - \\text{Intérêts} \\times (1-t) + \\text{Emprunts nets}$$",
      ],
      [
        "En période de hausse des prix (inflation), quelle méthode de stock (FIFO ou LIFO) donne le COGS le plus élevé ?",
        "LIFO — les unités les plus récentes (les plus chères) sont vendues en premier, ce qui gonfle le coût des ventes et réduit le résultat par rapport à FIFO.",
      ],
      [
        "En période de hausse des prix, quelle méthode (FIFO ou LIFO) donne le stock au bilan le plus proche de sa valeur de remplacement actuelle ?",
        "FIFO — le stock restant est composé des unités les plus récentes (les plus chères), proches du coût de remplacement actuel.",
      ],
      [
        "Sous US GAAP, une dépréciation de stock (write-down) peut-elle être reprise si la valeur remonte ensuite ?",
        "Non — contrairement à l'IFRS, US GAAP interdit toute reprise d'une dépréciation de stock une fois constatée.",
      ],
      [
        "Quelle est la règle IFRS de valorisation des stocks au bilan ?",
        "Le plus bas entre le coût et la valeur nette de réalisation (lower of cost or net realizable value — NRV).",
      ],
      [
        "Une hausse du ratio de rotation des stocks (inventory turnover) combinée à une baisse du chiffre d'affaires est-elle un bon signal ?",
        "Non — c'est souvent un signal d'alerte : cela peut indiquer une baisse de la demande plutôt qu'une gestion efficace des stocks.",
      ],
      [
        "Quelle est la formule du nombre de jours de stock (days inventory on hand — DOH) ?",
        "$$\\text{DOH} = \\dfrac{365}{\\text{Rotation des stocks}}$$",
      ],
      [
        "Quelle est la formule du cash conversion cycle (cycle de conversion de trésorerie) ?",
        "$$\\text{CCC} = \\text{DOH} + \\text{DSO} - \\text{DPO}$$\njours de stock + jours clients − jours fournisseurs",
      ],
    ],
  },
  {
    title: "Financial Statement Analysis — Flashcards 3/4 (Actifs & passifs long terme, impôts)",
    cards: [
      [
        "Quelle est la formule de l'amortissement linéaire (straight-line depreciation) ?",
        "$$\\text{Dép. annuelle} = \\dfrac{\\text{Coût} - \\text{Valeur résiduelle}}{\\text{Durée de vie utile}}$$",
      ],
      [
        "Sous US GAAP, une entreprise peut-elle réévaluer à la hausse la valeur de ses immobilisations corporelles ?",
        "Non — US GAAP interdit toute réévaluation. Sous IFRS, le modèle de réévaluation est autorisé (à la juste valeur, effet partiel en résultat et partiel en OCI).",
      ],
      [
        "Un coût de développement logiciel est-il capitalisé ou passé en charges selon son stade d'avancement ?",
        "Avant la faisabilité technologique démontrée : passé en charges. Après (prototypes fonctionnels) : capitalisé, puis amorti.",
      ],
      [
        "Quelle est la différence de traitement entre un actif intangible à durée de vie déterminée et indéterminée ?",
        "Durée déterminée : amorti sur sa durée de vie. Durée indéterminée : jamais amorti, seulement testé pour dépréciation.",
      ],
      [
        "Entre capitaliser et passer en charges un coût identique, laquelle des deux approches donne le résultat net le plus élevé la première année ?",
        "Capitaliser — seule une fraction (l'amortissement) impacte le résultat la première année, contre 100% de la charge si elle est passée en charges immédiatement.",
      ],
      [
        "Quel critère suffit, à lui seul, à classer un bail en location-financement plutôt qu'en location simple ?",
        "Une option d'achat avantageuse que le preneur est quasi certain d'exercer (bargain purchase option) — un seul critère parmi plusieurs suffit.",
      ],
      [
        "Quelle est la différence entre un régime de retraite à prestations définies (defined benefit) et à cotisations définies (defined contribution) au niveau du bilan de l'employeur ?",
        "Prestations définies : un actif/passif net apparaît au bilan (statut de financement). Cotisations définies : rien au bilan, l'obligation s'éteint dès le versement de la cotisation.",
      ],
      [
        "Comment calcule-t-on le statut de financement (funded status) d'un régime à prestations définies ?",
        "$$\\text{Funded status} = \\text{Juste valeur des actifs du régime} - \\text{Obligation actuarielle (PBO)}$$",
      ],
      [
        "Sur quelle durée est étalée la charge de rémunération en actions (share-based compensation) ?",
        "Sur la période d'acquisition des droits (vesting period), à partir de la juste valeur estimée à la date d'octroi (grant date).",
      ],
      [
        "Quelle est la formule du passif d'impôt différé (DTL) lié à un actif ?",
        "$$\\text{DTL} = (\\text{Valeur comptable} - \\text{Base fiscale}) \\times \\text{taux d'imposition}$$",
      ],
      [
        "Quelle est la différence entre une différence temporaire et une différence permanente en fiscalité différée ?",
        "Temporaire : crée un actif/passif d'impôt différé (méthodes d'amortissement différentes). Permanente : jamais déductible/imposable, ne crée jamais d'élément différé (intérêts d'obligations municipales).",
      ],
      [
        "Quelle base sert à calculer l'impôt à payer (taxes payable), et laquelle sert à calculer la charge d'impôt (tax expense) ?",
        "Impôt à payer = résultat imposable (taxable income) × taux. Charge d'impôt = résultat comptable avant impôt (pretax income) × taux.",
      ],
      [
        "Quelle est la formule du taux d'imposition effectif (effective tax rate) ?",
        "$$\\text{Taux effectif} = \\dfrac{\\text{Charge d'impôt}}{\\text{Résultat avant impôt}}$$",
      ],
      [
        "Un passif d'impôt différé qui n'est jamais censé se dénouer doit-il être traité comme une dette dans l'analyse du levier financier ?",
        "Non — il doit être reclassé en capitaux propres, car il ne générera jamais de sortie de trésorerie réelle.",
      ],
      [
        "Quelle est la formule du ROE selon le DuPont étendu à 5 facteurs ?",
        "$$\\text{ROE} = \\dfrac{\\text{RN}}{\\text{EBT}} \\times \\dfrac{\\text{EBT}}{\\text{EBIT}} \\times \\dfrac{\\text{EBIT}}{\\text{CA}} \\times \\dfrac{\\text{CA}}{\\text{Actifs}} \\times \\dfrac{\\text{Actifs}}{\\text{CP}}$$\nfardeau fiscal × fardeau d'intérêt × marge EBIT × rotation × levier",
      ],
    ],
  },
  {
    title: "Financial Statement Analysis — Flashcards 4/4 (Qualité de l'information, techniques & modélisation)",
    cards: [
      [
        "Quelles sont les 3 conditions classiques qui favorisent une communication financière de mauvaise qualité ?",
        "Opportunité (contrôles internes faibles), Motivation (pression pour atteindre un objectif), Rationalisation (justification morale que se donne l'auteur) — le triangle de la fraude.",
      ],
      [
        "Une entreprise capitalise un coût qui devrait être passé en charges. Quel est l'effet sur le CFO ?",
        "Le CFO est artificiellement plus élevé — la sortie de trésorerie est reclassée en investissement (CFI) au lieu d'exploitation.",
      ],
      [
        "Une communication financière conforme au GAAP mais avec des résultats non durables est-elle de haute ou basse qualité ?",
        "La qualité de la COMMUNICATION peut rester haute (conforme, utile à la décision) même si la qualité des RÉSULTATS est faible (non durable) — deux dimensions distinctes du spectre de qualité.",
      ],
      [
        "Qu'indique une hausse soudaine et anormale des délais fournisseurs (days payable) sur la qualité du tableau de flux ?",
        "Un signal d'alerte — le CFO peut être gonflé artificiellement et temporairement en retardant les paiements, une pratique non durable.",
      ],
      [
        "Quelle est la formule du ratio de rotation de l'actif (asset turnover) ?",
        "$$\\text{Asset turnover} = \\dfrac{\\text{Chiffre d'affaires}}{\\text{Actif total moyen}}$$",
      ],
      [
        "Quelle est la formule du ratio de levier financier (financial leverage) dans le DuPont ?",
        "$$\\text{Levier financier} = \\dfrac{\\text{Actif total moyen}}{\\text{Capitaux propres moyens}}$$",
      ],
      [
        "Diminuer la valeur résiduelle estimée d'un actif (salvage value) augmente-t-il ou diminue-t-il le résultat de la période ?",
        "Diminue — la base amortissable augmente, donc la charge d'amortissement augmente et le résultat baisse.",
      ],
      [
        "Quelle est la formule des états financiers en taille commune (common-size statements) ?",
        "$$\\text{Ligne bilan en \\%} = \\dfrac{\\text{Poste}}{\\text{Actif total}} \\qquad \\text{Ligne résultat en \\%} = \\dfrac{\\text{Poste}}{\\text{Chiffre d'affaires}}$$",
      ],
      [
        "Une marge brute en hausse combinée à une marge nette en baisse sur la même période — que peut-on en déduire ?",
        "Le contrôle des coûts s'est amélioré AU-DESSUS de la marge brute (COGS) mais s'est détérioré EN DESSOUS (charges d'exploitation, financières ou exceptionnelles).",
      ],
      [
        "Quelle est la formule du ratio de réinvestissement (reinvestment ratio, base cash-flow) ?",
        "$$\\text{Reinvestment ratio} = \\dfrac{\\text{CFO}}{\\text{Capex}}$$",
      ],
      [
        "Pourquoi un modèle de prévision (pro forma) \"basé sur les ventes\" commence-t-il toujours par prévoir le chiffre d'affaires ?",
        "Parce que la plupart des autres postes (coûts, BFR, capex) sont ensuite modélisés comme une fonction du chiffre d'affaires prévisionnel.",
      ],
      [
        "Dans un modèle pro forma, le COGS et les SG&A doivent-ils toujours être modélisés de la même façon (en % du CA) ?",
        "Non — le COGS est souvent variable (% du CA), mais les SG&A peuvent être en partie FIXES (montant constant, indépendant du niveau de ventes) — une distinction clé à ne pas ignorer.",
      ],
      [
        "Qu'est-ce que le biais de représentativité (representativeness bias) et comment l'atténuer en prévision ?",
        "Se fier excessivement à une situation spécifique (vision interne) sans tenir compte du taux de base d'une population plus large (vision externe). On l'atténue en combinant les deux vues.",
      ],
      [
        "Pourquoi le résultat opérationnel (operating profit) chute-t-il souvent en % plus fortement que le chiffre d'affaires lors d'un choc négatif ?",
        "À cause de l'effet de levier opérationnel : les charges fixes (SG&A) absorbent tout le choc en dollars sur une base bien plus petite que le CA, amplifiant l'effet en pourcentage.",
      ],
      [
        "Une baisse du volume de ventes affecte directement quels deux postes courants du bilan ?",
        "Les créances clients (accounts receivable) et les stocks (inventory) — tous deux liés au niveau d'activité.",
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
