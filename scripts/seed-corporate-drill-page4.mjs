// Seed script — quiz de "drill" associé à la page 4 de la fiche PDF Corporate
// Issuers (Capital Structure · Business Models, Readings 25 et 26 de la fiche,
// soit Readings 27 et 28 dans la banque de pratique : décalage de +2).
// Structure : pour chacun des 5 concepts clés de la page, 1 question officielle
// (banque de pratique CFA, Practise Exams/Corporate issuers, Readings 27 et 28,
// bonne réponse lue sur les coches vertes du corrigé "- Answers", jamais l'une
// des 5 questions déjà imprimées dans le PDF : R27 Q6, Q9, Q11, R28 Q5, Q6)
// + 1 variante "angle différent" (même notion, mais jamais un simple changement
// de chiffres menant au même raisonnement) + 1 variante "plus difficile"
// (raisonnement à plusieurs étapes / pièges combinés / notion connexe de la
// page). Voir memory regle-drill-variantes-cfa-hub. Questions en anglais,
// explications en français.
// Usage: node scripts/seed-corporate-drill-page4.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Corporate Issuers (Système)";

const QUIZ_SETS = [
  {
    title: "Corporate Issuers — Drill Fiche Page 4 (Capital Structure · Business Models)",
    difficulty: 2,
    questions: [
      // Concept 1 — WACC : poids en valeur de marché, (1 − t) sur la dette seulement (officielle — R27 Q3)
      [
        "A firm is planning a $25 million expansion project. The project will be financed with $10 million in debt and $15 million in equity stock (equal to the company's current capital structure). The before-tax required return on debt is 10% and 15% for equity. If the company's tax rate is 35%, what cost of capital should the firm use to determine the project's net present value?",
        ["9.6%.", "12.5%.", "11.6%."],
        2,
        "Le projet est financé dans les mêmes proportions que la structure actuelle : on l'actualise donc au WACC de la firme. Poids : wd = 10 / 25 = 40 % et we = 15 / 25 = 60 %. Coût de la dette après impôt : 10 % × (1 − 0,35) = 6,5 %. WACC = 0,40 × 6,5 % + 0,60 × 15 % = 2,6 % + 9,0 % = 11,6 % (C). B (12,5 %) est la moyenne simple de 10 % et 15 % : c'est le piège de la fiche, on pondère par les montants de chaque source et on applique l'économie d'impôt à la dette. A (9,6 %) est trop bas : la seule part de l'equity, la source la plus chère, apporte déjà 9,0 %, et la dette ajoute 2,6 % ; 9,6 % sous-pondère l'equity.",
      ],
      // Variante angle différent — calcul inversé : retrouver re à partir du WACC et d'un ratio D/E (D/E n'est pas un poids)
      [
        "A company's weighted average cost of capital is 9.0%. Its target debt-to-equity ratio is 0.25, its before-tax cost of debt is 6.0%, and its marginal tax rate is 25%. The company has no preferred stock. Its cost of equity is closest to:",
        ["10.5%.", "10.1%.", "9.8%."],
        1,
        "On remonte le calcul du WACC. D'abord les poids, tirés du ratio D/E comme sur la fiche : wd = (D/E) / (1 + D/E) = 0,25 / 1,25 = 0,20 et we = 1 − 0,20 = 0,80. Coût de la dette après impôt : 6,0 % × (1 − 0,25) = 4,5 %, d'où une contribution de la dette de 0,20 × 4,5 % = 0,9 %. Il reste 9,0 % − 0,9 % = 8,1 % pour l'equity : re = 8,1 % / 0,80 = 10,125 %, soit environ 10,1 % (B). A (10,5 %) prend le ratio D/E comme poids de la dette (wd = 0,25, we = 0,75) : (9,0 − 0,25 × 4,5) / 0,75 = 10,5 % ; or D/E n'est pas un poids, il faut le ramener au capital total. C (9,8 %) oublie l'économie d'impôt sur la dette : (9,0 − 0,20 × 6,0) / 0,80 = 9,75 %.",
      ],
      // Variante plus difficile — trois sources, valeurs de marché vs valeurs comptables (donnée-piège), (1 − t) à ne pas appliquer aux preferred
      [
        "An analyst gathers the following data for a company whose current market-value capital structure reflects its target: bonds with a face value of $50 million trade at 96% of par and have a yield to maturity of 6%; 1.6 million preferred shares with a par value of $25 trade at $20 and have a cost of 7%; 4 million common shares trade at $30 and have a cost of equity of 11%. The book value of common equity is $70 million, and the marginal tax rate is 25%. The company's weighted average cost of capital is closest to:",
        ["8.80%.", "7.97%.", "8.52%."],
        0,
        "Étape 1, les valeurs de marché (la fiche : poids en market values) : dette = 50 × 0,96 = 48 M$ ; preferred = 1,6 M × 20 $ = 32 M$ ; equity = 4 M × 30 $ = 120 M$ ; total = 200 M$. Poids : wd = 0,24, wp = 0,16, we = 0,60. Étape 2, les coûts : seule la dette est déductible, rd après impôt = 6 % × 0,75 = 4,5 % ; le dividende privilégié n'est pas déductible, rp reste à 7 %. WACC = 0,24 × 4,5 % + 0,16 × 7 % + 0,60 × 11 % = 1,08 % + 1,12 % + 6,60 % = 8,80 % (A). B (7,97 %) utilise les valeurs comptables (dette 50, preferred 1,6 × 25 = 40, equity 70, total 160) : 0,3125 × 4,5 % + 0,25 × 7 % + 0,4375 × 11 % = 7,97 % ; la valeur comptable de 70 M$ est la donnée-piège. C (8,52 %) applique aussi (1 − t) au coût des preferred : 0,16 × 7 % × 0,75 = 0,84 % au lieu de 1,12 %, d'où 8,52 % ; le piège de la fiche rappelle que (1 − t) ne porte que sur la dette.",
      ],

      // Concept 2 — Modigliani-Miller sans et avec impôts (officielle — R27 Q12)
      [
        "Which of the following statements regarding Modigliani and Miller's Proposition II with taxes is most accurate?",
        [
          "The value of the firm is maximized at the point where the WACC is minimized.",
          "Companies should use a 50% equity/50% debt capital structure to maximize value.",
          "The tax shield provided by debt causes the WACC to increase as leverage increases.",
        ],
        0,
        "Avec impôts, la Proposition II devient re = r0 + (r0 − rd) × (1 − t) × D/E : le coût de l'equity monte avec l'endettement, mais moins vite que sans impôts. Comme la dette apporte en plus une économie d'impôt, le WACC baisse quand le levier augmente, et la valeur de la firme (VL = VU + t × D) monte d'autant : la valeur est maximale là où le WACC est minimal (A), c'est-à-dire, dans le modèle MM avec impôts qui ignore les coûts de faillite, à 100 % de dette. B est faux : rien dans MM ne désigne une structure 50/50 comme optimale ; avec impôts, l'optimum théorique est 100 % de dette. C inverse l'effet : l'économie d'impôt fait BAISSER le WACC quand le levier augmente.",
      ],
      // Variante angle différent — le "pourquoi" : sans impôts, pourquoi le WACC reste constant malgré une dette moins chère
      [
        "Under Modigliani and Miller's propositions without taxes, a company replaces part of its equity with debt, which has a lower required return. Which of the following best explains why its weighted average cost of capital remains unchanged?",
        [
          "The cost of debt rises with leverage until it equals the cost of equity.",
          "The cost of equity rises in proportion to the debt-to-equity ratio, exactly offsetting the larger weight of cheaper debt.",
          "The tax shield on the new debt is exactly offset by the higher expected costs of financial distress.",
        ],
        1,
        "Proposition II sans impôts : re = r0 + (r0 − rd) × D/E. Plus la firme s'endette, plus les actionnaires portent un risque financier, et leur rendement exigé monte exactement de quoi compenser le poids accru de la dette bon marché (B). Exemple : r0 = 10 %, rd = 6 %, D/E = 1 ; re = 10 % + 4 % × 1 = 14 %, et WACC = 0,5 × 6 % + 0,5 × 14 % = 10 % = r0. La valeur de la firme ne dépend donc pas de sa structure (Proposition I). A est faux : parmi les hypothèses MM, on emprunte au taux sans risque, donc rd ne bouge pas avec le levier ; c'est re qui s'ajuste. C mélange les cadres : sans impôts il n'y a pas de tax shield, et MM suppose un coût de faillite nul ; l'arbitrage entre économie d'impôt et coûts de détresse, c'est la théorie du static trade-off.",
      ],
      // Variante plus difficile — recapitalisation MM avec impôts : VL = VU + t × D, puis re avec (1 − t) et le bon D/E
      [
        "An all-equity company has a value of $500 million and a cost of capital (r0) of 10%. Under Modigliani and Miller's assumptions with corporate taxes, it issues $200 million of debt at a cost of 6% and uses the proceeds to repurchase shares. The marginal tax rate is 25%. After the recapitalization, the company's value and its cost of equity are closest to:",
        [
          "a value of $500 million and a cost of equity of 12.0%.",
          "a value of $550 million and a cost of equity of 12.3%.",
          "a value of $550 million and a cost of equity of 11.7%.",
        ],
        2,
        "Étape 1, la valeur : avec impôts, VL = VU + t × D = 500 + 0,25 × 200 = 550 M$. Étape 2, l'equity : E = VL − D = 550 − 200 = 350 M$, donc D/E = 200 / 350 = 0,571. Étape 3, le coût de l'equity avec impôts : re = r0 + (r0 − rd) × (1 − t) × D/E = 10 % + 4 % × 0,75 × 0,571 = 10 % + 1,71 % = 11,7 % (C). Contrôle : WACC = (200/550) × 6 % × 0,75 + (350/550) × 11,71 % = 1,64 % + 7,45 % = 9,09 %, en baisse par rapport à r0 = 10 %, comme le prévoit MM avec impôts. B a la bonne valeur mais applique la formule sans impôts : 10 % + 4 % × 0,571 = 12,3 % ; elle oublie le facteur (1 − t). A oublie le tax shield : il garde V = 500, donc E = 300 et D/E = 0,667, ce qui donne 10 % + 4 % × 0,75 × 0,667 = 12,0 % ; or avec impôts la dette crée de la valeur (t × D = 50 M$).",
      ],

      // Concept 3 — Static trade-off : forme des courbes, optimum, facteurs de la structure cible (officielle — R27 Q8)
      [
        "According to the static tradeoff theory of capital structures, the:",
        [
          "cost of equity is upward sloping.",
          "value of the tax shield from additional borrowing initially increases, then decreases.",
          "weighted average cost of capital (WACC) initially increases, then decreases.",
        ],
        0,
        "Dans le static trade-off, plus la firme s'endette, plus le risque supporté par les actionnaires augmente : le coût de l'equity est croissant avec le levier (A). B est faux : la valeur du tax shield (t × D) continue d'augmenter avec la dette ; ce qui monte puis baisse, c'est la valeur de la firme, VL = VU + t × D − PV(costs of financial distress), une fois les coûts de détresse déduits. C inverse la forme en U : le WACC BAISSE d'abord (la dette, moins chère après impôt, remplace de l'equity), puis REMONTE quand la hausse des coûts de détresse attendus dépasse l'avantage fiscal. Le minimum du WACC coïncide avec le maximum de VL.",
      ],
      // Variante angle différent — comparer trois firmes : qui peut porter le plus de dette (cycle de vie, business risk, actifs tangibles)
      [
        "According to the static trade-off theory, which of the following companies is most likely to have the highest optimal proportion of debt in its capital structure, and why?",
        [
          "A start-up biotechnology firm, because its high expected growth makes the tax shield from debt especially valuable.",
          "A fast-growing software firm with high operating leverage, because high operating leverage amplifies the benefit of the tax shield.",
          "A mature regulated utility with stable cash flows and mostly tangible assets, because its expected costs of financial distress rise only slowly as it adds debt.",
        ],
        2,
        "L'optimum du static trade-off se situe là où l'avantage fiscal d'un dollar de dette supplémentaire est égal au coût de détresse attendu qu'il ajoute. Une utility mature (C) a des cash flows stables, un business risk et un operating leverage faibles et des actifs tangibles, qui gardent leur valeur et servent de garantie : ses coûts de détresse augmentent lentement, donc l'optimum se trouve plus loin vers la dette. C'est aussi le stade mature du cycle de vie, où l'accès à la dette est le plus large (même unsecured, bon marché). A est faux : une start-up a l'accès à la dette le plus faible (financement en equity), et sans bénéfice imposable le tax shield ne vaut presque rien, alors que le risque de détresse est maximal. B est faux : un operating leverage élevé signifie un business risk élevé, donc des cash flows plus volatils et une détresse plus probable ; il pousse à MOINS de dette, et les actifs d'un éditeur de logiciels sont surtout intangibles.",
      ],
      // Variante plus difficile — trouver l'optimum avec VL = VU + tD − PV(distress), raisonnement marginal, donnée-piège (rd)
      [
        "A company has an unlevered value of $800 million and a marginal tax rate of 25%. Its before-tax cost of debt is 6%. Management estimates the present value of expected costs of financial distress at $10 million with $200 million of debt, $40 million with $400 million of debt, and $110 million with $600 million of debt. Under the static trade-off theory, which of the following is most accurate?",
        [
          "The optimal amount of debt is $600 million, because at that level the tax shield of $150 million still exceeds the expected costs of financial distress of $110 million.",
          "The optimal amount of debt is $400 million, which gives a firm value of $860 million; the WACC is also lowest at this amount of debt.",
          "Firm value keeps rising, up to $950 million with $600 million of debt, because each dollar of debt adds $0.25 of tax shield.",
        ],
        1,
        "VL = VU + t × D − PV(costs of financial distress). Avec 200 M$ de dette : 800 + 50 − 10 = 840 M$ ; avec 400 M$ : 800 + 100 − 40 = 860 M$ ; avec 600 M$ : 800 + 150 − 110 = 840 M$. Le maximum est à 400 M$ de dette (860 M$), et c'est aussi là que le WACC est minimal (B). Raisonnement marginal : de 200 à 400 M$, +50 M$ de tax shield contre +30 M$ de coûts de détresse (gain net de 20 M$) ; de 400 à 600 M$, +50 M$ contre +70 M$ (perte nette de 20 M$). A confond total et marginal : à 600 M$ le gain net total (150 − 110 = 40 M$) reste positif, mais il est inférieur aux 60 M$ obtenus à 400 M$ ; la dernière tranche détruit de la valeur. C applique MM avec impôts (800 + 0,25 × 600 = 950 M$) en ignorant les coûts de détresse, alors que c'est précisément ce que le static trade-off ajoute. Le coût de la dette de 6 % est une donnée-piège : il n'intervient pas dans VL.",
      ],

      // Concept 4 — Business model : les 5 questions (who, what, how, where, how much), value chain vs supply chain (officielle — R28 Q3)
      [
        "Nebrid Company describes itself as a B2B firm. This means that Nebrid:",
        [
          "sells its products or services to other businesses.",
          "is a marketplace for buyers and sellers.",
          "provides both inbound and outbound logistics.",
        ],
        0,
        "B2B (business-to-business) répond à la question « Who » du business model : les clients de Nebrid sont d'autres entreprises (A), par opposition au B2C, qui vend aux consommateurs. B est faux : une place de marché qui met en relation acheteurs et vendeurs est un type de business model (une plateforme), pas une définition du B2B ; une plateforme peut d'ailleurs être B2C. C est faux : la logistique amont et aval relève des activités de la chaîne de valeur (le « How »), pas du type de clients.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : associer chaque question du cadre à son contenu
      [
        "An analyst uses the five questions of the business model framework (who, what, how, where, and how much) to describe a company. Which of the following pairings is least accurate?",
        [
          "Who: whether the company sells to businesses (B2B) or to consumers (B2C).",
          "Where: whether the company sells directly to customers, through intermediaries, or through an omnichannel approach.",
          "How much: the company's key assets and the key suppliers it depends on.",
        ],
        2,
        "Le cadre de la fiche : Who = les clients (B2B ou B2C) ; What = le produit et sa différenciation ; How = les actifs clés et les fournisseurs clés ; Where = les canaux de distribution (vente directe, intermédiaires, omnichannel) ; How much = la stratégie de prix. C est donc l'association fausse : les actifs et fournisseurs clés répondent au « How », alors que « How much » désigne la pricing strategy. A est exact (Who = type de clients). B est exact (Where = canaux, y compris l'omnichannel).",
      ],
      // Variante plus difficile — cas d'une plateforme : B2B, value chain vs supply chain, network effects, price taker
      [
        "FarmLink runs an online platform that connects independent farmers with restaurants. Restaurants pay a monthly subscription fee, while farmers list their produce for free. FarmLink owns no farms and no trucks; deliveries are made by third-party couriers. Which of the following conclusions about FarmLink's business model is most accurate?",
        [
          "FarmLink is a B2C business, and the farmers' production and the couriers' deliveries are part of its value chain.",
          "FarmLink serves business customers (B2B); the couriers belong to its supply chain rather than its value chain, and the platform may benefit from network effects as more farmers and restaurants join.",
          "FarmLink serves business customers (B2B), but because it owns no key physical assets, it cannot benefit from network effects and is best described as a price taker.",
        ],
        1,
        "Trois étapes. Who : restaurants et agriculteurs sont des entreprises, FarmLink est donc B2B, pas B2C. Value chain ou supply chain : la value chain ne couvre que les activités internes à la firme (la plateforme, la mise en relation, la facturation) ; la supply chain englobe ces activités ET les acteurs externes jusqu'au client final, donc les agriculteurs et les coursiers en font partie, pas de la value chain. Network effects : chaque nouvel agriculteur rend la plateforme plus utile aux restaurants et inversement (marché two-sided), la valeur augmente avec le nombre d'utilisateurs ; c'est ce qui justifie la gratuité pour les agriculteurs. B est donc correct. A se trompe deux fois : B2C au lieu de B2B, et des acteurs externes placés dans la value chain. C est faux : les network effects ne demandent pas d'actifs physiques (les actifs clés d'une plateforme sont sa technologie et sa base d'utilisateurs), et ce sont les producteurs de commodities qui sont price takers ; une plateforme différenciée qui bénéficie d'effets de réseau a au contraire un pouvoir de fixation des prix.",
      ],

      // Concept 5 — Pricing strategies : discrimination, multi-produits, autres, price taker vs pricing power (officielle — R28 Q4)
      [
        "Pro-X Cycle (Pro-X) is a bicycle manufacturer specializing in custom bicycles. The company sells all bikes for $1,200, but it offers high-margin packages like custom paint and premium tires and brakes ranging between $1,000 and $2,000. The pricing model that best reflects Pro-X's strategy is:",
        ["hidden revenue.", "bundling.", "add-on pricing."],
        2,
        "Add-on pricing (C) : le produit de base est vendu avec une marge normale (le vélo à 1 200 $) et des options facultatives sont proposées en plus, avec une marge élevée (peinture, pneus et freins haut de gamme). A est faux : le hidden revenue consiste à offrir le produit gratuitement à l'utilisateur et à se rémunérer ailleurs, typiquement par la publicité ; ici le vélo est payant. B est faux : le bundling vend ensemble, pour un prix unique, plusieurs produits complémentaires ; ici les options sont vendues séparément, au choix du client.",
      ],
      // Variante angle différent — cas limite : qui ne peut PAS fixer son prix (commodity producer = price taker)
      [
        "Which of the following companies is least likely to be able to use value-based pricing?",
        [
          "A producer of standard-grade aluminium sold on global commodity markets.",
          "A maker of patented medical devices that have few close substitutes.",
          "A luxury handbag brand whose customers value its design and reputation.",
        ],
        0,
        "Le value-based pricing fixe le prix d'après la valeur perçue par le client, ce qui suppose un pouvoir de fixation des prix, donc un produit différencié. Un producteur d'aluminium standard (A) vend une commodity : son produit est identique à celui des concurrents et son prix est fixé par le marché ; il est price taker, il ne peut donc pas pratiquer le value-based pricing. C'est la règle de la fiche : commodity producers = price takers ; produit différencié = pricing power. B a ce pouvoir (brevet, peu de substituts proches), C aussi (marque, design, réputation) : tous deux peuvent fixer un prix au-dessus du coût en fonction de la valeur perçue.",
      ],
      // Variante plus difficile — trois pratiques d'une même firme à classer (razors-and-blades vs add-on, tiered vs dynamic, hidden revenue vs freemium)
      [
        "BrewCo sells its coffee machines at close to cost and earns most of its profit on proprietary coffee capsules that only fit its machines. Office customers pay a lower price per capsule on larger orders. BrewCo's companion app is free to download, has no paid features, and earns revenue by displaying advertising from partner brands. Which pricing models best describe, in order, the machines and capsules, the office orders, and the app?",
        [
          "Add-on pricing; dynamic pricing; hidden revenue.",
          "Razors-and-blades; tiered pricing; hidden revenue.",
          "Add-on pricing; tiered pricing; freemium.",
        ],
        1,
        "Trois pratiques, trois modèles. Machines et capsules : le produit principal est vendu à faible marge (près du coût) et le profit vient d'un produit complémentaire captif vendu à forte marge, c'est le razors-and-blades. Ce n'est pas de l'add-on pricing, où le produit de base garde une marge normale et seules les options facultatives sont à forte marge. Commandes des bureaux : remise selon le VOLUME acheté, c'est du tiered pricing ; le dynamic pricing ferait varier le prix selon le MOMENT de l'achat (heures creuses, jours de pointe). Application : gratuite, sans fonction payante, financée par la publicité, c'est du hidden revenue ; le freemium suppose une version de base gratuite ET des fonctions payantes. B est donc correct. A se trompe sur les machines (add-on) et sur les bureaux (dynamic). C se trompe sur les machines (add-on) et sur l'application (freemium).",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Corporate Issuers Page 4...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
