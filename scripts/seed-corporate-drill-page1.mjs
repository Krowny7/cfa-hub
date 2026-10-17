// Seed script — quiz de "drill" associé à la page 1 de la fiche PDF Corporate
// Issuers (Organizational Forms · Investors & Stakeholders, Readings 20 et 21
// de la fiche, soit les Readings 22 et 23 de la banque de pratique : décalage
// de +2). Structure : pour chacun des 5 concepts clés de la page, 1 question
// officielle (banque de pratique Corporate Issuers, corrigé vérifié contre
// "- Answers.pdf") + 1 variante "angle différent" (même notion, mais jamais un
// simple changement de chiffres menant au même raisonnement) + 1 variante
// "plus difficile" (raisonnement à plusieurs étapes / pièges combinés /
// notion connexe de la page). Voir memory regle-drill-variantes-cfa-hub.
// Questions en anglais, explications en français.
// Les 5 questions officielles ne sont PAS celles imprimées dans le PDF
// (R22 Q8, Q9 et Q10, R23 Q2 et Q3) : l'utilisateur les a déjà sur papier.
// R22 Q7 est écartée : sa réponse officielle ("all tax due on profits is paid
// by the limited partners") est mal formulée (les general partners sont aussi
// imposés sur leur quote-part).
// Usage: node scripts/seed-corporate-drill-page1.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Corporate Issuers (Système)";

const QUIZ_SETS = [
  {
    title: "Corporate Issuers — Drill Fiche Page 1 (Organizational Forms · Investors & Stakeholders)",
    difficulty: 1,
    questions: [
      // Concept 1 — Limited partnership : rôles du GP et des LP, contrôle via un GP-corporation, propriété effective (officielle — R22 Q6)
      [
        "In a limited partnership, limited partners:",
        [
          "typically receive a smaller share of profits than general partners.",
          "are responsible for managing the business, but they have limited financial liability.",
          "are not involved in business decisions, but they appoint/remove general partners.",
        ],
        0,
        "Dans une limited partnership, le general partner (GP) gère l'entreprise, prend les décisions et a une responsabilité illimitée ; en contrepartie, il reçoit généralement une part des profits plus élevée que les limited partners (LP). A est donc correct. B est faux : c'est le GP, pas les LP, qui gère l'entreprise (seul le GP gère une LP) ; la responsabilité limitée des LP est bien réelle, mais elle va avec un rôle passif. C est faux : les LP ne participent pas aux décisions clés et ne nomment ni ne révoquent les GP.",
      ],
      // Variante angle différent — le "pourquoi" : contrôler la gestion d'une LP tout en gardant une responsabilité limitée
      [
        "A group of investors wants to control the management of a limited partnership while keeping their personal liability limited to the capital they invest. Which structure best meets both objectives?",
        [
          "Join the partnership as limited partners and take seats on its management committee.",
          "Form a corporation that they own and that acts as the general partner of the limited partnership.",
          "Hold their partnership interests through a sole proprietorship, which shields the owner's personal assets.",
        ],
        1,
        "Seul le GP gère une LP, et sa responsabilité est illimitée. Pour contrôler la gestion sans exposer leur patrimoine personnel, les investisseurs créent une corporation (entité distincte, responsabilité limitée à l'apport) qui joue le rôle de GP : c'est la corporation qui porte la responsabilité illimitée du GP, les investisseurs, simples actionnaires, ne risquent que ce qu'ils y ont apporté, et ils contrôlent la gestion de la LP à travers elle avec peu de capital. B est donc correct. A est faux : les limited partners ne gèrent pas l'entreprise, leur responsabilité limitée va avec un rôle passif ; ils n'obtiennent donc pas le contrôle de la gestion. C est faux : une sole proprietorship n'est pas une entité distincte de son propriétaire et sa responsabilité est illimitée, elle ne protège donc pas le patrimoine personnel.",
      ],
      // Variante plus difficile — propriété effective le long de la chaîne + qui porte la responsabilité illimitée (deux pièges combinés)
      [
        "Holding company H owns 80% of the shares of Corporation C. Corporation C is the sole general partner of Limited Partnership L and also holds 30% of L's partnership interests; outside limited partners hold the remaining 70%. L allocates its profits in proportion to partnership interests and reports net income of $10 million this year. Which statement is most accurate?",
        [
          "H's look-through share of L's net income is $3.0 million; C, as general partner, has unlimited liability, while H's potential loss is limited to its investment in C.",
          "H's look-through share of L's net income is $2.4 million; because H controls the general partner, H has unlimited liability for L's obligations.",
          "H's look-through share of L's net income is $2.4 million; C, as general partner, has unlimited liability, while H's potential loss is limited to its investment in C.",
        ],
        2,
        "Propriété effective = produit des pourcentages le long de la chaîne : 80 % x 30 % = 24 %, soit 0,24 x 10 000 000 = 2 400 000 $ du résultat de L qui reviennent indirectement à H. Responsabilité : C, en tant que general partner, a une responsabilité illimitée pour les dettes de L ; mais H n'est qu'actionnaire de C, une corporation (entité distincte), sa perte est donc limitée à son investissement dans C. C'est tout l'intérêt de la structure : contrôler la gestion de L via le GP avec peu de capital, en gardant une responsabilité limitée. C est donc correct. A s'arrête au deuxième maillon de la chaîne (30 % x 10 M$ = 3,0 M$) au lieu de multiplier les pourcentages. B a le bon montant mais confond contrôle et responsabilité : contrôler le GP ne rend pas H responsable de manière illimitée, la corporation C s'interpose comme bouclier.",
      ],

      // Concept 2 — Les 4 formes : responsabilité et imposition (pass-through vs double taxation) (officielle — R22 Q3)
      [
        "In a partnership, a general partner's liability for the obligations incurred by the business:",
        [
          "is limited to the amount invested.",
          "is unlimited.",
          "depends on whether the partnership is general or limited.",
        ],
        1,
        "Le general partner a une responsabilité illimitée dans les deux formes de partnership : dans une general partnership (tous les associés sont des GP) comme dans une limited partnership (au moins un GP, dont la responsabilité reste illimitée, à côté des LP). B est donc correct. A décrit la situation d'un limited partner (ou d'un actionnaire de corporation), dont la responsabilité est limitée à l'apport. C est le piège : la forme de la partnership change la situation des associés qui ne sont pas GP, pas celle du GP.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai sur les formes (entité distincte, responsabilité, imposition)
      [
        "Which of the following statements about business structures is least accurate?",
        [
          "Partnership profits are taxed once at the partnership level and again when they are distributed to the partners.",
          "Of the four main business structures, only the corporation is a legal entity separate from its owners.",
          "A limited partner's liability is limited to the capital contributed, whereas a general partner's liability is unlimited.",
        ],
        0,
        "Les partnerships (general ou limited) sont transparentes fiscalement (pass-through) : le profit n'est pas imposé au niveau de la société, il est imposé une seule fois, comme revenu personnel de chaque associé. La double imposition (impôt sur les sociétés, puis impôt sur les dividendes) concerne la corporation. A est donc l'énoncé le moins exact, celui qui est demandé. B est exact : des quatre formes (sole proprietorship, general partnership, limited partnership, corporation), seule la corporation est une entité juridique distincte de ses propriétaires. C est exact : le limited partner ne risque que son apport, le general partner a une responsabilité illimitée.",
      ],
      // Variante plus difficile — taux effectif de double imposition avec payout partiel, comparé au pass-through (deux formules-pièges)
      [
        "An entrepreneur expects pre-tax profit of $1,000,000 and is choosing between operating as a sole proprietorship and as a corporation. Her personal income tax rate is 37%. A corporation would pay corporate income tax at 25% and distribute 60% of its after-tax profit as dividends, which would be taxed at 20% in her hands. Which structure results in the lower total tax this year, and by how much?",
        [
          "The sole proprietorship, by $30,000.",
          "Neither; total tax is $370,000 under both structures.",
          "The corporation, by $30,000.",
        ],
        2,
        "Corporation : impôt sur les sociétés = 25 % x 1 000 000 = 250 000 $ ; bénéfice après impôt = 750 000 $ ; dividendes = 60 % x 750 000 = 450 000 $ ; impôt sur les dividendes = 20 % x 450 000 = 90 000 $ ; total = 340 000 $, soit un taux effectif de tc + p x td x (1 - tc) = 0,25 + 0,60 x 0,20 x 0,75 = 34 %. Sole proprietorship (pass-through) : 37 % x 1 000 000 = 370 000 $. La corporation paie donc 30 000 $ de moins cette année : C est correct. A applique la formule du payout 100 % : 0,25 + 0,20 x 0,75 = 40 %, soit 400 000 $, ce qui ferait gagner la sole proprietorship de 30 000 $ ; or seuls 60 % du bénéfice sont distribués. B oublie le facteur (1 - tc) : 0,25 + 0,60 x 0,20 = 37 %, soit 370 000 $, comme si le dividende était prélevé sur le bénéfice avant impôt. Nuance : les 300 000 $ mis en réserve seront imposés plus tard s'ils sont distribués ; l'avantage de cette année est en partie un report d'impôt.",
      ],

      // Concept 3 — Public vs private : reporting, prix observable, entrer et sortir de la cote, free float (officielle — R22 Q4)
      [
        "Government regulators typically require periodic disclosure of a company's financial performance for:",
        ["listed companies only.", "private companies only.", "both private and listed companies."],
        0,
        "Les régulateurs et les bourses imposent un reporting financier périodique aux sociétés cotées (reporting obligatoire) ; les sociétés privées n'y sont généralement pas soumises (moins d'obligations). A est donc correct. B inverse la règle. C est faux : une société privée n'a en principe pas d'obligation de publication périodique envers le public, ce qui explique aussi que son prix ne soit pas observable.",
      ],
      // Variante angle différent — le chemin inverse : conséquences d'une sortie de cote (LBO, going private)
      [
        "A listed company is acquired by a private equity firm in a leveraged buyout, and its shares are delisted. Compared with its situation before the buyout, the company is most likely to:",
        [
          "find it easier to raise equity capital, because private placements reach a wider pool of investors than a stock exchange.",
          "have a larger free float, because the shares held by the private equity firm are freely tradable.",
          "no longer have an observable share price and face fewer mandatory public disclosure requirements.",
        ],
        2,
        "Un LBO est une sortie de cote (going private) : les actions ne sont plus négociées en bourse, leur prix n'est plus observable, et la société passe sous le régime des sociétés privées, avec moins d'obligations de publication. C est donc correct. A est faux : une société privée lève ses fonds propres par placement privé, auprès d'un cercle restreint d'investisseurs ; c'est au contraire le marché boursier qui donne l'accès le plus large au capital. B est faux : le free float ne compte que les actions réellement négociables, hors insiders ; le fonds de private equity, actionnaire de contrôle, n'en fait pas partie, et après la sortie de cote il n'y a plus du tout d'actions négociées en bourse.",
      ],
      // Variante plus difficile — IPO : capital levé + free float après l'opération + comparaison avec un direct listing
      [
        "Before going public, Company Z has 80 million shares outstanding: 70 million held by its founders and managers and 10 million held by early outside investors who are not insiders. Z then completes an initial public offering of 20 million new shares at $15 per share. The founders and managers keep all their shares, and the early investors' shares become freely tradable. Which statement is most accurate?",
        [
          "Z raises $300 million and has a free float of 30%; a direct listing of its existing shares would have raised no new capital for Z.",
          "Z raises $300 million and has a free float of 20%; a direct listing of its existing shares would have raised no new capital for Z.",
          "Z raises $300 million and has a free float of 30%; a direct listing of its existing shares would also have raised $300 million, but without an underwriter.",
        ],
        0,
        "Capital levé : l'IPO émet des actions nouvelles, l'argent va à la société : 20 000 000 x 15 = 300 000 000 $. Nombre d'actions après l'IPO : 80 + 20 = 100 millions. Free float = actions réellement négociables, hors insiders : 20 millions (nouveaux actionnaires) + 10 millions (premiers investisseurs extérieurs) = 30 millions, soit 30 / 100 = 30 % ; les 70 millions des fondateurs et dirigeants (insiders) sont exclus. A est donc correct. B ne compte que les actions nouvelles (20 / 100 = 20 %) et oublie les 10 millions d'actions des investisseurs extérieurs, négociables et détenues hors insiders. C se trompe sur le direct listing : il fait coter des actions existantes, sans émission d'actions nouvelles ni underwriter, donc sans capital levé pour la société (seuls les actionnaires qui vendent encaissent le produit de leurs ventes).",
      ],

      // Concept 4 — Lenders vs shareholders : créance contractuelle vs résiduelle, levier financier et ROE (officielle — R23 Q7)
      [
        "Which of the following payments are contractual obligations of a corporation?",
        [
          "Interest, principal, and preferred stock dividend payments.",
          "Interest and principal payments.",
          "Interest and common stock dividend payments.",
        ],
        1,
        "Les intérêts et le remboursement du principal sont des obligations contractuelles envers les prêteurs : ne pas les payer, c'est faire défaut. B est donc correct. A est faux : les dividendes des actions de préférence ne sont pas une obligation contractuelle, la société peut les suspendre sans faire défaut (s'ils sont cumulatifs, les arriérés devront simplement être versés avant tout dividende ordinaire). C est faux : le dividende ordinaire est décidé par le board, la société n'est jamais obligée de le verser ; c'est la créance résiduelle des actionnaires.",
      ],
      // Variante angle différent — le "pourquoi" : pourquoi le capital actions coûte plus cher que la dette
      [
        "Which of the following best explains why equity capital is generally more costly to a company than debt capital?",
        [
          "Shareholders' upside is capped by debt covenants, so they require a higher return to compensate.",
          "Common stock dividends are contractual obligations, so shareholders demand compensation for the risk that a missed dividend triggers default.",
          "Shareholders hold a residual claim that is paid only after lenders' contractual claims, so they bear more risk and require a higher expected return.",
        ],
        2,
        "Les prêteurs ont une créance contractuelle et prioritaire (intérêts et principal, protégés par les covenants) ; les actionnaires ont une créance résiduelle : ils ne sont payés qu'après les prêteurs et peuvent ne rien recevoir. Ils supportent plus de risque et exigent donc un rendement attendu plus élevé : le capital actions est plus cher. C est correct. A est faux : les covenants protègent les prêteurs, ils ne plafonnent pas l'upside des actionnaires, qui est illimité ; c'est celui des prêteurs qui est plafonné (intérêts et principal). B est faux : les dividendes ordinaires ne sont pas une obligation contractuelle, en sauter un ne provoque pas de défaut.",
      ],
      // Variante plus difficile — levier financier : ROE en bonne et mauvaise année, intérêts fixes, qui supporte la perte
      [
        "A company has total assets of $1,000,000 and can finance them either entirely with equity or with $500,000 of equity and $500,000 of debt at an interest rate of 6%. Its operating expenses are fixed, so its operating income will be $150,000 in a good year and $20,000 in a bad year. Ignoring taxes, if the company uses the debt financing, its return on equity (ROE) in the good year and in the bad year will be:",
        [
          "30.0% and 4.0%, because the debt halves the equity base in both years.",
          "24.0% and -2.0%, because the $30,000 of interest is due in both years.",
          "24.0% and 0.0%, because the lenders absorb the shortfall in the bad year.",
        ],
        1,
        "Intérêts = 6 % x 500 000 = 30 000 $, dus quelle que soit l'année (créance contractuelle). Bonne année : résultat net = 150 000 - 30 000 = 120 000 $ ; ROE = 120 000 / 500 000 = 24,0 %. Mauvaise année : résultat net = 20 000 - 30 000 = -10 000 $ ; ROE = -10 000 / 500 000 = -2,0 %. Sans dette, le ROE serait de 15 % et de 2 % : la dette fait monter le ROE quand le rendement des actifs (15 %) dépasse le coût de la dette (6 %), et le fait baisser quand il lui est inférieur (2 %) ; elle amplifie les gains comme les pertes. B est donc correct. A oublie les intérêts : 150 000 / 500 000 = 30 % et 20 000 / 500 000 = 4 %. C suppose que les prêteurs absorbent le manque à gagner : faux, leur créance est contractuelle et prioritaire, ce sont les actionnaires (créance résiduelle) qui supportent la perte de 10 000 $.",
      ],

      // Concept 5 — Gouvernance : shareholder vs stakeholder theory, board, ESG (officielle — R23 Q5)
      [
        "Under shareholder theory, corporate governance is most concerned with managing conflicts of interest between the firm's managers and its:",
        ["employees.", "customers.", "owners."],
        2,
        "Selon la shareholder theory, l'objectif de la société est de maximiser la valeur pour les actionnaires ; la gouvernance sert d'abord à gérer le conflit d'intérêts entre les dirigeants (agents) et les propriétaires, c'est-à-dire les actionnaires (principals). C est donc correct. A et B (salariés, clients) sont des parties prenantes que la stakeholder theory cherche à équilibrer avec les actionnaires ; ils ne sont pas au centre de la shareholder theory.",
      ],
      // Variante angle différent — appliquer la shareholder theory aux structures de board (laquelle affaiblit les actionnaires)
      [
        "From the standpoint of shareholder theory, which board feature is most likely to weaken shareholders' ability to hold the board accountable?",
        [
          "A staggered board, in which only a fraction of the directors stands for election each year.",
          "A board on which a majority of the directors are independent rather than inside directors.",
          "A board on which the roles of chair and chief executive officer are held by different people.",
        ],
        0,
        "Avec un staggered board, seule une fraction des administrateurs (par exemple un tiers) est soumise au vote chaque année : il faut plusieurs assemblées pour remplacer la majorité du board, ce qui réduit le pouvoir des actionnaires (et freine aussi une prise de contrôle hostile). A est donc correct. B est faux : des administrateurs indépendants protègent mieux les intérêts des actionnaires que des administrateurs internes (inside directors), liés à la direction. C est faux : séparer président du board et directeur général renforce le contrôle du board sur la direction, au bénéfice des actionnaires.",
      ],
      // Variante plus difficile — ESG : nature du risque (transition vs physique), stranded assets, exposition equity vs dette longue, piège shareholder theory
      [
        "A newly announced carbon tax is expected to make several of a utility's coal-fired power plants uneconomic well before the end of their useful lives. The utility is financed with common equity and long-maturity bonds, and its default risk is currently low. Which assessment is most accurate?",
        [
          "This is a physical climate risk, and the long-maturity bonds are more exposed than the equity because bondholders cannot share in any upside.",
          "This is a transition risk that may create stranded assets; the equity is the most exposed, while the bonds are exposed mainly through a higher probability of default before they mature.",
          "This is a transition risk that may create stranded assets, but a board following shareholder theory can disregard it because environmental issues concern only other stakeholders.",
        ],
        1,
        "Étape 1, la nature du risque : une taxe carbone est un risque de transition (changement de réglementation lié au passage à une économie bas carbone), pas un risque physique (dommages directs du climat : inondations, canicules). Étape 2, les centrales rendues non rentables avant la fin de leur durée de vie sont des stranded assets (actifs échoués), dont la valeur doit être dépréciée. Étape 3, l'exposition : les actionnaires, titulaires de la créance résiduelle, encaissent directement la baisse de valeur, ils sont les plus exposés ; les porteurs d'obligations ne sont touchés que si le risque de défaut augmente, et d'autant plus que leurs obligations sont longues (le risque a le temps de se matérialiser avant le remboursement). B est donc correct. A se trompe deux fois : ce n'est pas un risque physique, et la créance fixe et prioritaire des obligataires les expose moins que les actionnaires. C est faux : même sous la shareholder theory, un risque environnemental qui détruit de la valeur concerne directement les actionnaires ; ce n'est pas un sujet réservé aux autres parties prenantes.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Corporate Issuers Page 1...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
