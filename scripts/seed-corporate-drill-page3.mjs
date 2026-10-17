// Seed script — quiz de "drill" associé à la page 3 de la fiche PDF Corporate
// Issuers (Capital Investments & Capital Allocation, Reading 24 de la fiche,
// Reading 26 de la banque). Structure : pour chacun des 5 concepts clés de la
// page, 1 question officielle (banque de pratique CFA, Practise Exams/Corporate
// issuers, Reading 26, bonne réponse vérifiée contre le corrigé officiel
// "- Answers") + 1 variante "angle différent" (même notion, mais jamais un
// simple changement de chiffres menant au même raisonnement) + 1 variante
// "plus difficile" (raisonnement à plusieurs étapes / pièges combinés /
// notion connexe de la page). Voir memory regle-drill-variantes-cfa-hub.
// Les 5 questions déjà imprimées dans le PDF (R26 Q1, Q6, Q11, Q19, Q20) ne
// sont pas reprises. Questions en anglais, explications en français.
// Usage: node scripts/seed-corporate-drill-page3.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Corporate Issuers (Système)";

const QUIZ_SETS = [
  {
    title: "Corporate Issuers — Drill Fiche Page 3 (Capital Investments & Capital Allocation)",
    difficulty: 2,
    questions: [
      // Concept 1 — Types de projets d'investissement : going concern, regulatory, expansion, other (officielle — R26 Q21)
      [
        "Which of the following types of capital investments are most likely to generate little to no revenue?",
        ["Going concern projects.", "New product or market development.", "Regulatory projects."],
        2,
        "Les projets réglementaires (regulatory / compliance) sont imposés par une autorité publique ou un assureur, le plus souvent pour des raisons de sécurité ou d'environnement : ils ne rapportent presque aucun revenu, mais l'entreprise doit les réaliser pour continuer à exercer, et ils accompagnent en général des projets qui, eux, génèrent du revenu. C est donc correct. A est faux : les projets de continuité (going concern) servent à maintenir l'activité existante ou à réduire les coûts ; ils protègent ou améliorent des flux existants, ce ne sont pas par nature des projets sans revenu. B est faux : un nouveau produit ou un nouveau marché (expansion) vise justement à créer de nouveaux revenus.",
      ],
      // Variante angle différent — le "pourquoi" : un projet réglementaire à NPV isolée négative est quand même réalisé, et comment on l'analyse
      [
        "A regulatory project that will generate no revenue shows a negative NPV when it is analyzed on its own. A company will most likely still undertake it because:",
        [
          "regulatory projects are discounted at a lower rate, which turns their NPV positive.",
          "it is required for the company to keep operating, so the analysis focuses on meeting the requirement at the lowest cost.",
          "the real options embedded in any regulatory project always make its total NPV positive.",
        ],
        1,
        "Un projet réglementaire est imposé (sécurité, environnement) : le refuser reviendrait à devoir arrêter l'activité qu'il conditionne. Sa NPV isolée est logiquement négative (des coûts, pas de revenus) ; la vraie question n'est donc pas « faut-il le faire ? » mais « comment le faire au moindre coût ? », d'où l'analyse « le moins cher » de la fiche. En pratique, son coût est rattaché aux projets générateurs de revenus qu'il rend possibles. B est donc correct. A est faux : le taux d'actualisation reflète le risque des flux, on ne le baisse pas pour rendre un projet acceptable ; et des flux uniquement négatifs donnent une NPV négative quel que soit le taux. C est faux : une option réelle vaut zéro ou plus, mais rien ne garantit qu'elle compense un coût, et ce n'est pas la raison pour laquelle on réalise un projet obligatoire.",
      ],
      // Variante plus difficile — classer quatre projets d'une même firme (type + profondeur d'analyse), avec le piège « réduire les coûts = expansion »
      [
        "A regional airline is reviewing four capital proposals: (1) replacing aging engines with more fuel-efficient models; (2) installing cockpit safety equipment newly required by the aviation authority; (3) launching routes to a country it has never served; (4) investing in an experimental hydrogen-powered aircraft technology championed by the CEO. Which of the following statements is most accurate?",
        [
          "Proposal 1 is a going concern project that requires relatively light analysis, while proposals 3 and 4 both require detailed analysis, proposal 4 being an “other” project.",
          "Proposal 1 is an expansion project because it increases profit, and proposal 2 requires the most detailed analysis because it generates no revenue.",
          "Proposal 3 is a going concern project because the airline already operates routes, and proposal 4 is a regulatory project because aviation technology is regulated.",
        ],
        0,
        "1 = remplacer des moteurs pour consommer moins : projet de continuité (going concern : maintenir l'activité ou réduire les coûts), flux assez prévisibles, analyse légère. 2 = équipement de sécurité imposé : projet réglementaire, analyse centrée sur la solution la moins chère. 3 = routes vers un pays jamais desservi : nouveau marché, donc expansion, revenus incertains, analyse détaillée. 4 = technologie expérimentale, hors du métier actuel, portée par le PDG : projet « other », risqué et difficile à évaluer avec les méthodes habituelles, analyse détaillée (et attention au biais du projet favori de la direction, cité dans la fiche). A est donc correct. B est faux deux fois : réduire les coûts relève du going concern, pas de l'expansion (qui suppose un nouveau produit ou un nouveau marché) ; et le projet réglementaire appelle l'analyse la plus simple, pas la plus détaillée. C est faux deux fois : un pays jamais desservi est un nouveau marché (expansion), même si la compagnie vole déjà ailleurs ; et le projet 4 n'est imposé par personne, le fait que le secteur soit réglementé n'en fait pas un projet réglementaire.",
      ],

      // Concept 2 — Principes d'allocation : flux de trésorerie, après impôt, incrémentaux (sunk costs, cannibalisation, coûts d'opportunité) (officielle — R26 Q17)
      [
        "One of the basic principles of capital allocation is that:",
        [
          "decisions are based on cash flows.",
          "opportunity costs should be excluded from the analysis of a project.",
          "projects should be analyzed on a pre-tax basis.",
        ],
        0,
        "Principes de l'allocation du capital : (1) les décisions reposent sur les flux de trésorerie, pas sur le résultat comptable ni l'EPS ; (2) les flux intègrent les coûts d'opportunité ; (3) le calendrier des flux compte ; (4) les flux sont analysés après impôt ; (5) le coût du financement est pris en compte dans le taux de rendement requis, pas dans les flux. A est donc correct. B est faux : les coûts d'opportunité (ce que rapporterait ailleurs un actif utilisé par le projet) doivent être INCLUS. C est faux : l'analyse se fait après impôt, pas avant impôt.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : le critère « incrémental » appliqué à trois postes (cannibalisation, coût d'opportunité, frais généraux)
      [
        "Which of the following statements about the cash flows used to evaluate a capital project is least accurate?",
        [
          "The expected decline in sales of the firm's existing products caused by the new project should be deducted from the project's cash flows.",
          "If the project uses a building the firm owns, the rent the firm could otherwise earn by leasing it out should be charged to the project.",
          "A share of existing corporate overhead that will not change whether or not the project is undertaken should be charged to the project.",
        ],
        2,
        "Le critère : un flux n'est pertinent que s'il est INCRÉMENTAL, c'est-à-dire s'il change selon que le projet est réalisé ou non. Les frais généraux existants restent identiques avec ou sans le projet : leur en imputer une quote-part ne modifie pas la trésorerie de l'entreprise, c'est une simple répartition comptable, à exclure. C est donc l'affirmation la moins exacte. A est exact : c'est la cannibalisation, une externalité négative à inclure (la fiche : cannibalisation incluse). B est exact : le loyer auquel on renonce est un coût d'opportunité, à inclure même si aucune somme n'est décaissée.",
      ],
      // Variante plus difficile — calcul d'un flux incrémental après impôt avec trois données-pièges (sunk cost, intérêts) et un coût d'opportunité à fiscaliser
      [
        "A new product is expected to generate annual revenue of $1,000,000, cash operating costs of $600,000, and depreciation on new equipment of $100,000. The tax rate is 25%. The product will reduce the after-tax cash flow of an existing product by $50,000 per year. It will use a warehouse the firm owns that could otherwise be leased out for $30,000 per year before tax. A $40,000 feasibility study was paid last month, and the project will be financed with a loan carrying $20,000 of annual interest. The project's annual incremental after-tax cash flow is closest to:",
        ["$237,500.", "$252,500.", "$275,000."],
        1,
        "Flux d'exploitation = (CA - charges décaissées) x (1 - t) + amortissement x t = (1 000 000 - 600 000) x 0,75 + 100 000 x 0,25 = 300 000 + 25 000 = 325 000 $ (même résultat avec (1 000 000 - 600 000 - 100 000) x 0,75 + 100 000). Cannibalisation : - 50 000 $ (déjà après impôt). Coût d'opportunité de l'entrepôt : le loyer perdu, après impôt, soit 30 000 x 0,75 = 22 500 $. Flux incrémental = 325 000 - 50 000 - 22 500 = 252 500 $. B est donc correct. À écarter : l'étude de 40 000 $ (sunk cost, déjà payée, identique quelle que soit la décision) et les intérêts de 20 000 $ (le coût du financement est déjà dans le taux d'actualisation ; le déduire aussi des flux le compterait deux fois). A (237 500 $) déduit les intérêts après impôt (20 000 x 0,75 = 15 000 $) : double comptage du financement. C (275 000 $) oublie le coût d'opportunité de l'entrepôt.",
      ],

      // Concept 3 — NPV et IRR : calcul et interprétation (officielle — R26 Q15)
      [
        "Lincoln Coal is planning a new coal mine, which will cost $430,000 to build. The mine will bring cash inflows of $200,000 annually over the next seven years. It will then cost $170,000 to close down the mine in the following year. Assume all cash flows occur at the end of the year. Alternatively, Lincoln Coal may choose to sell the site today. If Lincoln has a 16% required rate of return, the minimum price they should accept for the property is closest to:",
        ["$310,000.", "$318,000.", "$326,000."],
        2,
        "La NPV mesure ce que le projet ajoute à la valeur de l'entreprise : vendre le site moins cher que la NPV de la mine détruirait de la valeur, donc le prix minimum à accepter est cette NPV. Flux : CF0 = -430 000 ; CF1 à CF7 = +200 000 ; CF8 = -170 000 (la fermeture a lieu l'année QUI SUIT les 7 années d'exploitation). VA des entrées = 200 000 x [1 - 1,16^-7] / 0,16 = 200 000 x 4,0386 = 807 712 $ ; VA de la fermeture = 170 000 / 1,16^8 = 170 000 / 3,2784 = 51 854 $ ; NPV = 807 712 - 51 854 - 430 000 = 325 858 $, soit environ 326 000 $. C est donc correct. B (318 000 $) place à tort la fermeture en année 7 (170 000 / 1,16^7 = 60 151 $, NPV ≈ 317 562 $). A (310 000 $) sous-estime aussi la valeur de la mine. Remarque : avec une sortie de trésorerie finale, les flux changent deux fois de signe, ce qui peut donner plusieurs IRR ; la NPV, elle, reste sans ambiguïté.",
      ],
      // Variante angle différent — cas limite de la perpétuité (IRR = CF / investissement) et calcul inversé du flux qui annule la NPV
      [
        "A project costs $2,000,000 today and is expected to generate a level after-tax cash flow of $180,000 per year forever, starting in one year. The required rate of return is 8%. What is the project's IRR, and at what annual cash flow would the project's NPV be exactly zero?",
        [
          "IRR of 9.0%; NPV is zero at an annual cash flow of $160,000.",
          "IRR of 9.0%; NPV is zero at an annual cash flow of $180,000.",
          "IRR of 11.1%; NPV is zero at an annual cash flow of $160,000.",
        ],
        0,
        "Pour une perpétuité, VA = CF / r. L'IRR est le taux qui annule la NPV : 2 000 000 = 180 000 / IRR, d'où IRR = 180 000 / 2 000 000 = 9,0 % (la fiche : perpétuité, IRR = CF / investissement). Calcul inversé : au taux requis de 8 %, la NPV est nulle quand CF / 0,08 = 2 000 000, soit CF = 2 000 000 x 0,08 = 160 000 $. Au flux prévu de 180 000 $, NPV = 180 000 / 0,08 - 2 000 000 = 2 250 000 - 2 000 000 = +250 000 $ : le projet est acceptable, avec une marge de 20 000 $ par an. A est donc correct. B confond les deux taux : 180 000 $ est le flux qui annule la NPV au taux de l'IRR (9 %), pas au taux requis (8 %). C inverse le rapport : 2 000 000 / 180 000 = 11,1 est un nombre d'années (délai de récupération), pas un taux.",
      ],
      // Variante plus difficile — décaler les flux futurs d'un an : recalculer NPV et IRR, avec deux pièges (IRR « insensible au calendrier », décaler aussi l'investissement)
      [
        "A project requires an investment of $1,000,000 today and is expected to return $600,000 at the end of each of the next two years. The required rate of return is 10%. Because of a permitting delay, both inflows will now be received one year later than planned; the investment must still be paid today. Which of the following best describes the effect of the delay?",
        [
          "NPV falls from about +$41,300 to about -$53,300, but the IRR stays at about 13.1% because the cash flow amounts are unchanged, so the NPV and IRR rules now conflict.",
          "NPV falls from about +$41,300 to about +$37,600 and the IRR stays at about 13.1%, so the project remains acceptable.",
          "NPV falls from about +$41,300 to about -$53,300 and the IRR falls from about 13.1% to about 7.6%, so the project should now be rejected.",
        ],
        2,
        "Avant : NPV = 600 000 / 1,10 + 600 000 / 1,10² - 1 000 000 = 545 455 + 495 868 - 1 000 000 = +41 322 $ ; IRR : 1 000 000 = 600 000 x facteur d'annuité sur 2 ans, facteur = 1,6667, d'où IRR ≈ 13,07 %. Après : les entrées arrivent en années 2 et 3, l'investissement reste en année 0. NPV = 600 000 / 1,10² + 600 000 / 1,10³ - 1 000 000 = 495 868 + 450 789 - 1 000 000 = -53 343 $ ; IRR : taux tel que 600 000 / (1 + r)² + 600 000 / (1 + r)³ = 1 000 000, soit r ≈ 7,59 % (à 7 % la NPV vaut environ +13 800 $, à 8 % environ -9 300 $). Décaler tous les flux futurs fait baisser à la fois la NPV et l'IRR (la fiche : NPV ↓ et IRR ↓), et les deux règles concordent : NPV < 0 et IRR (7,6 %) < 10 %, on rejette. C est donc correct. A suppose que l'IRR ne dépend que des montants : faux, elle dépend aussi du calendrier, et ici les deux règles donnent la même conclusion. B décale aussi l'investissement d'un an (tout le projet glisse) : 41 322 / 1,10 = 37 566 $ avec une IRR inchangée ; mais l'énoncé précise que l'investissement reste payé aujourd'hui.",
      ],

      // Concept 4 — Règle de décision : projets indépendants vs mutuellement exclusifs, conflit NPV / IRR, objectif de ROIC (officielle — R26 Q16)
      [
        "Should a company accept a project that has an IRR of 14% and an NPV of $2.8 million if the cost of capital is 12%?",
        ["Yes, based on the NPV and the IRR.", "Yes, based only on the NPV.", "No, based on the NPV and the IRR."],
        0,
        "Coût du capital de 12 % : NPV = +2,8 M$ > 0 et IRR = 14 % > 12 %. Pour un projet indépendant aux flux conventionnels, les deux règles concordent toujours (une NPV positive au taux requis équivaut à une IRR supérieure à ce taux) : on accepte sur la base des deux critères. A est donc correct. B est faux : l'IRR (14 %) dépasse aussi le hurdle rate, l'acceptation ne repose pas seulement sur la NPV. C est faux : les deux critères disent d'accepter.",
      ],
      // Variante angle différent — comparaison de deux projets exclusifs à classements contraires, et le « pourquoi » de la primauté de la NPV
      [
        "Projects X and Y are mutually exclusive. Project X has an IRR of 24% and an NPV of $1.2 million; Project Y has an IRR of 17% and an NPV of $1.9 million. The cost of capital is 12%. Which project should the company choose, and why?",
        [
          "Project X, because its higher IRR gives a larger margin of safety against estimation errors.",
          "Project Y, because NPV measures the value added to the firm in dollars, while the IRR ranking can be distorted by differences in scale and timing and by the assumption that cash flows are reinvested at the IRR.",
          "Both projects, because each has a positive NPV and an IRR above the cost of capital.",
        ],
        1,
        "Projets mutuellement exclusifs : un seul peut être retenu. Les deux passent les tests (NPV > 0, IRR > 12 %) mais les classements divergent : X a la meilleure IRR, Y la meilleure NPV. En cas de conflit, la NPV l'emporte, car elle mesure directement l'enrichissement des actionnaires en valeur absolue : Y ajoute 1,9 M$ contre 1,2 M$ pour X, soit 0,7 M$ de plus. Les conflits viennent des différences de taille et de calendrier des flux, et de l'hypothèse implicite de l'IRR (flux réinvestis à l'IRR elle-même, alors que la NPV suppose un réinvestissement au taux requis, plus réaliste). B est donc correct. A est le piège : la marge de sécurité de l'IRR est réelle, mais un pourcentage ne dit rien de la taille du gain ; la fiche le rappelle, l'IRR la plus haute ne gagne jamais entre projets exclusifs. C ignore le caractère exclusif : accepter tous ceux qui passent ne vaut que pour des projets indépendants.",
      ],
      // Variante plus difficile — calculer NPV et IRR de deux projets exclusifs (petit gain rapide vs gros gain tardif), puis appliquer le piège de l'objectif de ROIC
      [
        "Projects S and L are mutually exclusive, and each requires $10 million today. Project S returns $12 million in one year; Project L returns $15 million in three years. The cost of capital is 10%. Which project should be chosen (i) by a firm that maximizes shareholder value, and (ii) by a firm whose management rejects any project with an IRR below its 15% ROIC target?",
        [
          "(i) Project L; (ii) Project S.",
          "(i) Project S; (ii) Project S, because S has the higher IRR (20% vs. about 14.5%).",
          "(i) Project L; (ii) Project L, because the NPV rule always prevails over a ROIC target.",
        ],
        0,
        "NPV au coût du capital de 10 % : S = 12 / 1,10 - 10 = 10,909 - 10 = +0,909 M$ ; L = 15 / 1,10³ - 10 = 15 / 1,331 - 10 = 11,270 - 10 = +1,270 M$. IRR : S = 12 / 10 - 1 = 20,0 % ; L = (15 / 10)^(1/3) - 1 = 1,1447 - 1 = 14,47 %. (i) Projets exclusifs et maximisation de la valeur : on retient la NPV la plus élevée, donc L, même si son IRR est plus faible (son gain arrive plus tard, et l'IRR favorise les flux rapides). (ii) Avec un objectif de ROIC de 15 %, la direction rejette tout projet dont l'IRR est inférieure à la cible, même à NPV positive, parce qu'il ferait baisser le ROIC : L (14,47 %) est rejeté, S (20 %) passe ; on retient S. A est donc correct. B applique au cas (i) le critère de l'IRR la plus haute : c'est l'erreur classique entre projets exclusifs. C oublie le piège du ROIC signalé par la fiche : avec cette règle de gestion, un projet à NPV > 0 mais IRR < cible est rejeté, au prix ici d'une valeur perdue de 1,270 - 0,909 = 0,361 M$ par rapport au choix de L.",
      ],

      // Concept 5 — Options réelles : timing, sizing (abandon / expansion), flexibility, fundamental ; valeur ajoutée à la NPV (officielle — R26 Q4)
      [
        "Following a significant and persistent increase in nickel prices, a mine operator decides to open a new nickel mine in Canada. Opening the mine is best characterized as:",
        ["an expansion option.", "a fundamental option.", "a flexibility option."],
        1,
        "Une option fondamentale (fundamental option) est une option réelle où le projet lui-même est l'option : son gain dépend du prix d'un sous-jacent, ici le nickel. L'exploitant ouvre la mine parce que le prix du nickel a fortement et durablement monté ; à un prix bas, il ne l'aurait pas ouverte. B est donc correct. A est faux : une option d'expansion (sizing) est le droit de faire des investissements supplémentaires dans de futurs projets s'ils créent de la valeur ; ce n'est pas le prix d'un sous-jacent qui fait le projet. C est faux : une option de flexibilité porte sur des décisions opérationnelles futures (prix pratiqués, volumes de production, intrants), pas sur la décision d'ouvrir le projet.",
      ],
      // Variante angle différent — le « pourquoi » : la valeur d'une option s'ajoute à la NPV statique et n'est jamais négative
      [
        "A project has an NPV of -$1.5 million when evaluated without considering any options. It gives the company the right, but not the obligation, to expand capacity in three years, and this expansion option is valued at $2.0 million. The company should most likely:",
        [
          "reject the project, because a negative NPV before options means the project destroys value.",
          "accept the project only if management commits today to exercising the expansion option, because an unexercised option has a negative value.",
          "accept the project, because its NPV including the option is about +$0.5 million, and an option's value can never be negative.",
        ],
        2,
        "NPV totale = NPV sans option + valeur de l'option = -1,5 + 2,0 = +0,5 M$ > 0 : on accepte. Une option réelle est un droit, pas une obligation : la direction ne l'exercera que si l'expansion crée de la valeur, sinon elle y renoncera ; sa valeur est donc positive ou nulle, jamais négative (la fiche : la valeur de l'option s'ajoute à la NPV, jamais négative). C est donc correct. A ignore la valeur de la flexibilité : s'arrêter à la NPV statique sous-évalue les projets qui ouvrent des possibilités futures. B se trompe sur la nature d'une option : s'engager dès aujourd'hui à l'exercer supprimerait justement la flexibilité qui fait sa valeur, et une option non exercée vaut zéro, pas moins.",
      ],
      // Variante plus difficile — valoriser une option d'abandon sur deux scénarios (règle d'exercice, pondération, actualisation), piège du gain non pondéré
      [
        "A company can invest $10 million today in a new plant. In one year, the plant's remaining cash flows will be worth (present value as of that date) either $16 million if demand is strong or $4 million if demand is weak, each with a probability of 50%. At that date, the company can instead abandon the project and sell the equipment for $7 million. No other cash flows occur, and the required rate of return is 10%. Which of the following is most accurate?",
        [
          "Reject the project: its NPV is about -$0.91 million, and the abandonment option adds no value because it would only be exercised when demand is weak.",
          "Accept the project: its NPV including the abandonment option is about +$0.45 million, and the option is worth about $1.36 million.",
          "Accept the project: its NPV including the abandonment option is about +$2.09 million, because abandoning in the weak-demand state adds $3 million.",
        ],
        1,
        "Sans option : valeur espérée dans un an = 0,5 x 16 + 0,5 x 4 = 10 M$ ; NPV = 10 / 1,10 - 10 = 9,091 - 10 = -0,909 M$. Avec l'option d'abandon (option de sizing, cf. fiche) : on abandonne si la VA des flux en continuant est inférieure à la valeur d'abandon. Demande forte : 16 > 7, on continue ; demande faible : 4 < 7, on abandonne et on récupère 7. Valeur espérée = 0,5 x 16 + 0,5 x 7 = 11,5 M$ ; NPV = 11,5 / 1,10 - 10 = 10,455 - 10 = +0,455 M$. Valeur de l'option = 0,455 - (-0,909) = 1,364 M$ (soit 0,5 x 3 / 1,10). B est donc correct. A se trompe de logique : c'est justement dans le mauvais scénario que l'option protège, et c'est ce qui lui donne sa valeur. C ajoute le gain de 3 M$ (7 - 4) en entier : il ne se produit qu'avec une probabilité de 50 % et dans un an, il faut donc le pondérer et l'actualiser (0,5 x 3 / 1,10 = 1,364 M$), d'où -0,909 + 1,364 = +0,455 M$, et non -0,909 + 3 = +2,09 M$.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Corporate Issuers Page 3...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
