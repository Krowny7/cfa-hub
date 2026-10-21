// Seed script — quiz de "drill" associé à la page 2 de la fiche PDF Alternative
// Investments (Private Capital · Real Estate & Infrastructure, Readings 78 et
// 79 de la fiche, soit les Readings 80 et 81 de la banque de pratique :
// décalage de +2). Structure : pour chacun des 5 concepts clés de la page,
// 1 question officielle (banque de pratique Alternative Investment, corrigé
// vérifié contre "- Answers.pdf") + 1 variante "angle différent" (même notion,
// mais jamais un simple changement de chiffres menant au même raisonnement) +
// 1 variante "plus difficile" (raisonnement à plusieurs étapes / pièges
// combinés / notion connexe de la page). Voir memory regle-drill-variantes-cfa-hub.
// Questions en anglais, explications en français.
// Les 5 questions officielles ne sont PAS celles imprimées dans le PDF
// (R80 Q3, Q12 et Q13, R81 Q2 et Q8) : l'utilisateur les a déjà sur papier.
// Usage: node scripts/seed-alternatives-drill-page2.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Alternative Investments (Système)";

const QUIZ_SETS = [
  {
    title: "Alternative Investments — Drill Fiche Page 2 (Private Capital · Real Estate & Infrastructure)",
    difficulty: 1,
    questions: [
      // Concept 1 — Venture capital : stades de financement (angel / pre-seed, seed, early, mezzanine) et formes de private equity (officielle — R80 Q4)
      [
        "Kettering Incorporated is a successful manufacturer of technology hardware. Kettering is seeking capital to finance additional growth that will position the company for an initial public offering. This stage of financing is most accurately described as:",
        ["mezzanine-stage financing.", "angel investing.", "early-stage financing."],
        0,
        "Kettering est déjà une entreprise prospère qui cherche à financer sa croissance pour se préparer à une IPO : c'est le mezzanine-stage financing, le stade qui prépare l'entrée en bourse. A est donc correct. B est faux : l'angel investing intervient tout au début (idée, business plan, évaluation du potentiel de marché), bien avant qu'une entreprise soit établie. C est faux : l'early stage finance les débuts de la production commerciale et des ventes d'une entreprise encore jeune, pas la croissance d'une entreprise déjà prospère qui prépare son IPO. Séquence des stades (fiche) : pre-seed, puis seed, early-stage, later-stage et mezzanine, qui prépare l'IPO. À ne pas confondre avec la mezzanine debt, dette subordonnée du private debt.",
      ],
      // Variante angle différent — ordre chronologique des stades et ce que chacun finance
      [
        "Which of the following lists the venture capital financing stages in the order in which a successful start-up typically reaches them?",
        [
          "Seed, angel investing (pre-seed), early stage, mezzanine.",
          "Angel investing (pre-seed), early stage, seed, mezzanine.",
          "Angel investing (pre-seed), seed, early stage, mezzanine.",
        ],
        2,
        "Chaque stade finance une étape précise de la vie de l'entreprise : l'angel investing / pre-seed finance l'idée et le business plan (argent des fondateurs et des business angels) ; le seed finance le développement du produit, les études de marché et le marketing, avant toute production et vente, et c'est en général le premier stade où un fonds de venture capital investit ; l'early stage finance le démarrage de la production commerciale et des ventes ; le mezzanine stage finance la préparation à l'introduction en bourse. C est donc correct. A est faux : l'angel investing précède le seed, il correspond à la naissance de l'entreprise. B est faux : l'early stage ne peut pas précéder le seed, car on ne démarre pas la production commerciale avant d'avoir développé le produit.",
      ],
      // Variante plus difficile — classer trois investissements : seed, PIPE (et non LBO), mezzanine (et non early stage)
      [
        "A private equity firm makes three investments: (1) capital for a start-up with a prototype but no product on the market, to fund product development and market research; (2) equity capital for a publicly traded company, through a private placement, to finance its restructuring, without taking the company private; (3) convertible preferred shares of a profitable technology firm that plans to go public within 18 months. These investments are best described, respectively, as:",
        [
          "seed-stage venture capital; leveraged buyout (LBO); mezzanine-stage financing.",
          "seed-stage venture capital; private investment in public equity (PIPE); mezzanine-stage financing.",
          "angel investing; private investment in public equity (PIPE); early-stage financing.",
        ],
        1,
        "(1) La start-up a un prototype mais aucun produit sur le marché, et le capital finance le développement du produit et les études de marché : c'est le seed stage (l'angel investing, plus tôt, finance l'idée et le business plan). (2) Un apport de capital propre à une société cotée, par placement privé, pour financer sa restructuration sans la retirer de la cote, est un PIPE (private investment in public equity) ; un LBO, lui, rachète la société avec beaucoup de dette et la retire en général de la cote. (3) Une société rentable qui prévoit de s'introduire en bourse d'ici 18 mois reçoit un financement de préparation à l'IPO, donc du mezzanine stage (le VC investit en equity, convertible debt ou convertible preferred) ; l'early stage finance le démarrage de la production commerciale et des ventes. B est donc correct. A se trompe sur (2) : il n'y a ni rachat ni effet de levier ici, et la société reste cotée. C se trompe sur (1), qui relève du seed et non de l'angel investing, et sur (3), qui relève du mezzanine et non de l'early stage.",
      ],

      // Concept 2 — Vintage year, sorties (recapitalization, trade sale, IPO...) et biais de la performance du private equity (officielle — R80 Q5)
      [
        "The vintage year is the year in which a private equity fund:",
        [
          "makes its first investment.",
          "receives its first capital commitment.",
          "sells its first investment.",
        ],
        0,
        "Le vintage year est en général l'année où un fonds de private equity ou de venture capital réalise son premier investissement. A est donc correct. B est faux : l'année du premier engagement de capital (capital commitment) peut différer de celle du premier investissement, car il peut s'écouler du temps entre l'engagement du capital et son déploiement. C est faux : la vente du premier investissement est une sortie (exit), qui intervient bien après le démarrage du fonds. Le vintage year sert à comparer entre eux des fonds lancés dans des conditions de marché comparables. Le vintage year sert à comparer entre eux des fonds lancés dans des conditions de marché comparables. Rappel de la fiche : détention moyenne d'environ 5 ans ; corrélation private capital / marchés publics de 0,63 à 0,83, la plus faible pour le VC.",
      ],
      // Variante angle différent — le « pourquoi » : à quoi sert de comparer des fonds par vintage year (cycle économique)
      [
        "Which of the following best explains why investors compare private equity funds with the same vintage year?",
        [
          "The vintage year is the year in which a fund sells its first investment, so it measures how quickly each manager produces an exit.",
          "Funds with an earlier vintage year have had more time to compound returns, so older funds are expected to outperform more recent ones.",
          "Funds that began investing in the same year faced similar market and business-cycle conditions, so their performance can be compared more fairly.",
        ],
        2,
        "Le vintage year est en général l'année du premier investissement du fonds. Deux fonds de même millésime ont déployé leur capital dans des conditions de marché comparables, ce qui permet de comparer les gérants en neutralisant en partie le cycle économique. Cela compte beaucoup : un fonds qui démarre en expansion obtient ses meilleurs rendements s'il est spécialisé early-stage, un fonds qui démarre en contraction les obtient avec des sociétés distressed (fiche : vintage en expansion / en contraction). C est donc correct. A est faux : la vente du premier investissement est une sortie (exit), pas le vintage year. B est faux : l'ancienneté n'est pas un gage de performance ; le vintage year sert justement à comparer des fonds du même millésime plutôt que des fonds d'âges différents.",
      ],
      // Variante plus difficile — vintage year + recapitalization (pas une vraie sortie) + biais de performance (survivorship, valorisations peu fréquentes)
      [
        "A private equity fund received its first capital commitments in November 2021 and made its first investment in March 2023. In 2026 one portfolio company issued new debt and used the proceeds to pay a large dividend to the fund, which still owns the company. The fund's returns are reported to a database that contains only funds still in operation and relies on the fund's own infrequent valuations of its holdings. Which statement is most accurate?",
        [
          "The vintage year is 2023; the recapitalization is not a true exit; the database's average return is biased upward, while the standard deviation of returns is biased downward.",
          "The vintage year is 2021; the recapitalization is not a true exit; the database's average return is biased upward, while the standard deviation of returns is biased downward.",
          "The vintage year is 2023; the recapitalization is a true exit; the database's average return is biased upward, and the standard deviation of returns is biased upward as well.",
        ],
        0,
        "Trois points à vérifier. (1) Vintage year : année du premier investissement, ici 2023 ; l'année du premier engagement de capital (novembre 2021) peut précéder de longtemps le premier investissement. (2) La recapitalization consiste à faire émettre de la dette à la société pour verser un dividende au fonds : le fonds récupère du cash mais reste propriétaire, ce n'est donc pas une vraie sortie (contrairement à une trade sale, une IPO ou une secondary sale). (3) Biais de performance : une base qui ne contient que les fonds encore en activité (survivorship bias, auquel s'ajoutent le backfill et l'auto-déclaration) surestime les rendements moyens ; les valorisations peu fréquentes, donc lissées, sous-estiment la volatilité et la corrélation avec les actions. A est donc correct. B confond le vintage year avec l'année du premier engagement de capital. C fait deux erreurs : elle voit une vraie sortie dans la recapitalization alors que le fonds détient toujours la société, et elle affirme que la volatilité est surestimée alors que les valorisations peu fréquentes la sous-estiment.",
      ],

      // Concept 3 — Dette privée : types (direct lending, unitranche, mezzanine, venture, distressed) et niveaux de risque (officielle — R80 Q2)
      [
        "Which of the following types of private debt has the lowest level of risk?",
        ["Mezzanine debt.", "Unitranche debt.", "Venture debt."],
        1,
        "La unitranche est un prêt unique qui mélange de la dette garantie (senior) et non garantie à un taux mélangé ; son rang se situe entre la dette senior et la dette subordonnée. Parmi les trois types proposés, c'est le moins risqué : B est correct. A est faux : la mezzanine est subordonnée à la dette senior et souvent non garantie, donc plus risquée. C est faux : la venture debt est la plus risquée, car elle finance des start-ups à fort risque d'activité qui n'ont souvent ni cash flows positifs ni actifs en garantie. Hiérarchie de risque décroissant : venture debt, mezzanine, unitranche, senior direct lending. Un prêt privé est en général à taux variable : taux de référence (SOFR) + spread. Ordre de risque décroissant de la fiche : private equity, mezzanine, unitranche, senior direct lending, senior real estate debt, infrastructure debt.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : caractéristiques de chaque type de dette privée
      [
        "Which of the following statements about private debt is least accurate?",
        [
          "Mezzanine debt is subordinated to senior debt but ranks ahead of equity, and it often comes with warrants.",
          "Venture debt lends to start-ups, usually with warrants or convertible features, so the company avoids the immediate dilution of a new equity round.",
          "Distressed debt is typically issued by early-stage start-ups that have not yet generated positive cash flows.",
        ],
        2,
        "L'énoncé demande l'affirmation la moins exacte. A est exacte : la mezzanine debt est subordonnée à la dette senior mais passe avant l'equity ; souvent non garantie, elle est assortie de warrants qui compensent le risque supplémentaire. B est exacte : la venture debt finance des start-ups (souvent sans cash flows positifs ni actifs en garantie) ; le prêteur reçoit des warrants ou un droit de conversion, et l'entreprise évite la dilution immédiate d'une levée en equity. C est la moins exacte : la distressed debt est celle de sociétés matures en difficulté financière (temporaire ou structurelle), souvent acquise avec une décote dans une logique de turnaround ; la dette de start-ups sans cash flows relève de la venture debt.",
      ],
      // Variante plus difficile — rendement tout compris (SOFR + spread) combiné au classement de risque : choisir le prêt le moins risqué qui respecte l'exigence de rendement
      [
        "Floating-rate private loans are priced at SOFR plus a spread, and SOFR is currently 4.25%. An investor requires an all-in yield of at least 11.0% and, among the loans that meet this requirement, wants the one with the lowest risk. The loans offered are: senior direct lending at SOFR + 500 bp, unitranche at SOFR + 625 bp, mezzanine at SOFR + 850 bp, and venture debt at SOFR + 1,200 bp. Which loan should the investor choose?",
        ["The mezzanine loan.", "The unitranche loan.", "The venture debt."],
        0,
        "Étape 1 : rendement tout compris = SOFR + spread = 4,25 % + spread. Senior direct lending : 9,25 % ; unitranche : 10,50 % ; mezzanine : 12,75 % ; venture debt : 16,25 %. Étape 2 : seules la mezzanine (12,75 %) et la venture debt (16,25 %) atteignent 11,0 %. Étape 3 : parmi elles, on retient la moins risquée ; la mezzanine est subordonnée mais passe avant l'equity, alors que la venture debt finance des start-ups à fort risque d'activité, souvent sans cash flows positifs ni actifs en garantie : c'est la plus risquée des types de dette privée. A est donc correct. B est faux : la unitranche est moins risquée que la mezzanine, mais son rendement de 10,50 % n'atteint pas 11,0 %. C est faux : la venture debt remplit la condition de rendement, mais elle est plus risquée que la mezzanine ; l'investisseur ne cherche pas le rendement maximal.",
      ],

      // Concept 4 — Immobilier : investissement direct vs REITs (corrélation, valorisation, levier / LTV) (officielle — R81 Q3)
      [
        "During steep market downturns, the correlation between REITs and market equity returns tends to:",
        ["decrease.", "increase.", "stay the same."],
        1,
        "Lors d'une baisse brutale du marché, la corrélation entre les REITs et les actions augmente : en période de stress, les actifs cotés évoluent ensemble (ventes massives, aversion au risque). B est donc correct. A est faux : la diversification attendue des REITs diminue justement au moment où l'on en aurait le plus besoin. C est faux : la corrélation n'est pas stable, elle monte en période de stress. C'est un inconvénient des REITs cotés par rapport à l'immobilier direct. Direct (fiche) : contrôle, diversification et avantages fiscaux (dépréciation non cash, intérêts déductibles), mais illiquide, opaque, gros ticket. REIT : liquide, géré, diversifié, transparent, sans double imposition, mais plus corrélé aux actions.",
      ],
      // Variante angle différent — interpréter un écart de baisse entre REITs cotés et immobilier direct valorisé par expertise (appraisals)
      [
        "During a steep equity market downturn, a listed REIT index falls 34% while an appraisal-based index of directly held commercial real estate falls only 7%. Which of the following is the best interpretation?",
        [
          "The gap proves that direct real estate is genuinely far less risky than REITs and a better diversifier in downturns.",
          "The gap shows that REITs are less liquid than direct real estate, because their prices fell by more.",
          "REITs are priced daily and move more closely with equities under stress, while appraisal-based values are smoothed, so the diversification benefit of direct real estate is probably overstated.",
        ],
        2,
        "Les REITs sont cotés et valorisés chaque jour par le marché ; en forte baisse boursière leur corrélation avec les actions augmente (ventes massives, aversion au risque), donc ils chutent avec le marché. Les valeurs de l'immobilier direct viennent d'estimations d'experts (appraisals), peu fréquentes et lissées : elles réagissent lentement et sous-estiment la volatilité et la corrélation avec les actions. L'écart de 34 % contre 7 % reflète donc en partie une différence de méthode de valorisation, pas seulement une différence de risque économique ; l'avantage de diversification de l'immobilier direct est probablement surestimé. C est donc correct. A est faux : un indice fondé sur des appraisals n'est pas la preuve d'un moindre risque, c'est justement la source du biais. B est faux : la liquidité n'est pas en cause, les REITs cotés sont plus liquides que l'immobilier direct ; leur baisse plus forte traduit la valorisation quotidienne du marché.",
      ],
      // Variante plus difficile — levier de l'immobilier direct : LTV, perte d'equity amplifiée et dette cible
      [
        "An investor buys an office building directly for $50 million, financed with a $30 million mortgage. The lender requires the loan-to-value (LTV) ratio not to exceed 65%. In a steep downturn, an appraisal values the building at $40 million. Which statement is most accurate?",
        [
          "The LTV has risen from 60% to 75%, the investor's equity has fallen by 50%, and the investor must repay $4 million of the loan to bring the LTV back to 65%.",
          "The LTV has risen from 60% to 75%, the investor's equity has fallen by 50%, and the investor must repay $3 million of the loan to bring the LTV back to 65%.",
          "The LTV has risen from 60% to 75%, the investor's equity has fallen by only 20%, in line with the property value, and the investor must repay $4 million of the loan to bring the LTV back to 65%.",
        ],
        0,
        "LTV = dette / valeur. Au départ : 30 / 50 = 60 %. Après la baisse : 30 / 40 = 75 %, au-dessus du plafond de 65 %. Equity = valeur - dette : 50 - 30 = 20 M$ au départ, 40 - 30 = 10 M$ ensuite, soit -50 % pour une baisse de seulement 20 % de la valeur de l'immeuble : c'est l'effet de levier de la dette. Dette cible = LTV requis x valeur = 0,65 x 40 = 26 M$ ; il faut donc rembourser 30 - 26 = 4 M$. A est donc correct. B est faux : 3 M$ = 10 % x 30 applique l'écart de 10 points de LTV à l'ancien solde de la dette au lieu de recalculer la dette cible sur la nouvelle valeur. C est faux : la perte d'equity n'est pas de 20 % : la dette, fixe, amplifie la baisse (20 M$ devient 10 M$). Cet effet de levier, joint à l'illiquidité de l'immobilier direct, rend la baisse difficile à encaisser.",
      ],

      // Concept 5 — Infrastructure : greenfield, brownfield et secondary stage (risque, source du rendement, valorisation) (officielle — R81 Q4)
      [
        "Which type of infrastructure investment has the highest risk-return profile?",
        ["Brownfield.", "Greenfield.", "Secondary stage."],
        1,
        "Le greenfield (construction d'une nouvelle infrastructure) a le profil risque/rendement le plus élevé : pas encore de cash flows, risques de construction et de demande. B est donc correct. A est faux : le brownfield (redéveloppement d'une infrastructure existante) est plus risqué que le secondary stage mais moins que le greenfield. C est faux : le secondary stage (infrastructure pleinement opérationnelle, avec un historique de cash flows stables, proche d'une obligation) est le moins risqué. Fiche : greenfield = à construire (BOT), risque et rendement maximaux ; brownfield = actif existant à redévelopper ; secondary stage = actif opérationnel, proche d'une obligation, risque minimal.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : infrastructure sociale / économique, dette d'infrastructure, valorisation d'une MLP cotée
      [
        "Which of the following statements about infrastructure investing is least accurate?",
        [
          "Social infrastructure, such as schools and hospitals, is distinct from economic infrastructure such as transportation, utilities and telecommunications.",
          "Infrastructure debt has historically shown lower default rates and higher recovery rates than comparable corporate debt.",
          "A publicly traded master limited partnership (MLP) holding operating brownfield assets is hard to value because its inputs are not observable (Level 3).",
        ],
        2,
        "L'énoncé demande l'affirmation la moins exacte. A est exacte : l'infrastructure sociale (écoles, hôpitaux) se distingue de l'infrastructure économique (transports, utilities, télécoms). B est exacte : la dette d'infrastructure affiche historiquement moins de défauts et un taux de recouvrement plus élevé que des dettes d'entreprise comparables. C est la moins exacte : une MLP cotée est la forme la plus facile à valoriser, car ses parts s'échangent sur un marché actif (Level 1 de la hiérarchie de juste valeur) ; ce sont les actifs d'infrastructure non cotés, détenus par exemple en direct via un consortium, qui relèvent plutôt du Level 3. Rappel : la MLP est aussi une structure pass-through, et l'accès à l'infrastructure passe aussi par des ETFs et des funds.",
      ],
      // Variante plus difficile — classer trois projets selon le stade (greenfield, secondary stage, brownfield) : risque-rendement et source du rendement
      [
        "An infrastructure investor evaluates three projects: (1) a toll road to be built under a build-operate-transfer concession, with no guaranteed minimum traffic; (2) a regulated electricity transmission network that has been fully operational for decades, with stable, contracted cash flows; (3) an existing airport terminal that is being renovated and expanded while it continues to operate. Which statement is most accurate?",
        [
          "Project 1 is greenfield, with the highest risk-return profile, but its return comes mainly from current yield because infrastructure cash flows are contracted; Project 2 is a secondary-stage asset with the lowest risk-return profile.",
          "Project 1 is greenfield, with the highest risk-return profile and a return that comes mainly from capital appreciation; Project 2 is a secondary-stage, bond-like asset with the lowest risk-return profile.",
          "Project 3 has the highest risk-return profile because redeveloping an operating asset is riskier than building a new one; Project 2 has the lowest risk-return profile.",
        ],
        1,
        "Projet 1 : une toll road à construire (BOT) est un greenfield, avec le profil risque / rendement le plus élevé (pas encore de cash flows, risques de construction et de demande) ; sans trafic minimal garanti, le rendement vient surtout de la plus-value (capital appreciation) et non d'un revenu courant. Projet 2 : un réseau opérationnel depuis des décennies, avec des cash flows stables et contractuels, est un secondary stage, proche d'une obligation, avec le risque / rendement le plus bas. Projet 3 : un actif existant en cours de rénovation et d'extension est un brownfield, au profil intermédiaire (plus risqué que le secondary stage, moins que le greenfield). B est donc correct. A est faux : le rendement d'un greenfield sans demande garantie vient surtout de la capital appreciation ; le current yield caractérise plutôt un brownfield dont les cash flows sont contractés. C est faux : un brownfield est moins risqué qu'un greenfield (l'actif existe déjà et possède un historique), pas l'inverse.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Alternative Investments Page 2...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
