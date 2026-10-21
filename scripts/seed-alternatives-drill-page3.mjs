// Seed script — quiz de "drill" associé à la page 3 de la fiche PDF Alternative
// Investments (Natural Resources · Hedge Funds, Readings 80 et 81 de la fiche,
// soit Readings 82 et 83 dans la banque de pratique : décalage de +2).
// Structure : pour chacun des 5 concepts clés de la page, 1 question officielle
// (banque de pratique CFA, Practise Exams/Alternative Investment, Readings 82
// et 83, bonne réponse vérifiée contre le corrigé officiel "- Answers", jamais
// l'une des 5 questions déjà imprimées dans le PDF : R82 Q2, Q6, R83 Q1, Q8,
// Q13) + 1 variante "angle différent" (même notion, mais jamais un simple
// changement de chiffres menant au même raisonnement) + 1 variante "plus
// difficile" (raisonnement à plusieurs étapes / pièges combinés / notion
// connexe de la page). Voir memory regle-drill-variantes-cfa-hub. Questions en
// anglais, explications en français.
// Usage: node scripts/seed-alternatives-drill-page3.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Alternative Investments (Système)";

const QUIZ_SETS = [
  {
    title: "Alternative Investments — Drill Fiche Page 3 (Natural Resources & Hedge Funds)",
    difficulty: 2,
    questions: [
      // Concept 1 — Raw land, farmland, timberland : flux de trésorerie (officielle — R82 Q5)
      [
        "Which of the following types of alternative investment is most likely to provide steady cash flows?",
        ["Farmland.", "Timberland.", "Raw land."],
        0,
        "Le farmland offre les cash flows les plus réguliers : il génère un revenu chaque année, par le bail de la terre ou la vente de la récolte. A est donc correct. B est faux : le timberland produit des cash flows, mais le propriétaire garde la main sur leur calendrier (il peut laisser pousser les arbres ou les couper) ; ils sont donc moins réguliers. C est faux : la raw land ne génère aucun cash flow courant, sa valeur dépend surtout de la localisation et du prix de revente.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : liquidité et prix des terres (raw land / farmland / timberland), calendrier de récolte
      [
        "Which of the following statements about raw land, farmland and timberland is least accurate?",
        ["Raw land produces no harvest, so its return comes mainly from changes in the value of the land.", "Farmland is harvested when crops mature, whereas the owner of timberland can defer the harvest and let the trees keep growing.", "Because their value depends mostly on location, these land investments are liquid and their prices are transparent."],
        2,
        "La fiche est claire : raw land, farmland et timberland sont ILLIQUIDES et leur valeur dépend surtout de la localisation. Chaque parcelle est unique, les transactions sont rares et les prix opaques : il n'y a ni marché coté ni prix transparent. C est donc l'affirmation la moins exacte : la dépendance à la localisation est justement ce qui rend ces actifs difficiles à évaluer et à revendre vite, pas ce qui les rend liquides. A est exacte : une terre brute n'a pas de récolte ; son rendement vient surtout de la hausse de sa valeur (et d'un éventuel bail). B est exacte : la récolte du farmland a lieu à la maturité des cultures, donc à un calendrier plutôt contraint, alors que le propriétaire d'une forêt peut différer la coupe et laisser les arbres grossir (option de timing), ce qui rend les cash flows du timberland moins réguliers que ceux du farmland.",
      ],
      // Variante plus difficile — remplacer des futures sur commodities par du farmland : quatre attributs à comparer (volatilité, lien avec l'inflation, liquidité, revenu courant)
      [
        "A portfolio manager sells a position in commodity futures and reinvests the proceeds in farmland. Compared with the commodity futures position, the farmland investment will most likely offer:",
        ["higher volatility, a weaker correlation with inflation, lower liquidity, and a current income stream from leases or crop sales.", "lower volatility, a weaker correlation with inflation, lower liquidity, and a current income stream from leases or crop sales.", "lower volatility, a stronger correlation with inflation, lower liquidity, and no current income."],
        1,
        "Farmland contre futures sur commodities, point par point. (1) Volatilité : farmland et timberland ont une volatilité plus faible, proche de celle des obligations ; les commodities (offre inélastique, météo, géopolitique, levier des dérivés) ont rendement et volatilité supérieurs à ceux des actions et des obligations. (2) Inflation : les prix des commodities composent l'inflation, leur corrélation avec elle est plus forte que celle du farmland, qui est donc un hedge d'inflation plus faible. (3) Liquidité : les futures sont liquides et transparents, la terre est illiquide avec des prix opaques. (4) Revenu : le farmland génère un revenu courant (bail ou vente de la récolte), alors que les commodities n'ont pas de cash flows. B est donc correct. A est faux sur la volatilité : le farmland est moins volatil, pas plus. C est faux sur deux points : la corrélation avec l'inflation est plus faible (pas plus forte) pour le farmland, et celui-ci procure un revenu courant, il n'est pas sans revenu.",
      ],

      // Concept 2 — Convenience yield, contango et backwardation (officielle — R82 Q3)
      [
        "The convenience yield of a commodity is best described as:",
        ["a benefit that reduces the forward price.", "being directly related to the commodity's inventory levels.", "a cash benefit from holding a physical commodity."],
        0,
        "Le convenience yield est un avantage non monétaire que procure la détention du physique (accès immédiat à la matière, pas de rupture de production). Comme il compense le coût de détention, il réduit le prix du forward : F = S x (1 + rf) + stockage - convenience yield. A est donc correct. B est faux : il est en général inversement lié aux stocks (stocks bas, convenience yield élevé, spot en hausse, d'où la backwardation). C est faux : c'est un avantage non monétaire, pas un flux de trésorerie.",
      ],
      // Variante angle différent — le "pourquoi" : comment la baisse des stocks fait passer un marché en backwardation (formule F = S x (1 + rf) + storage - convenience yield)
      [
        "A commodity futures market moves into backwardation after inventories of the commodity fall sharply. Which of the following best explains the link?",
        ["Low inventories raise the convenience yield and the spot price; once the convenience yield exceeds interest plus storage costs, the forward price falls below the spot price.", "Low inventories reduce storage costs, which pushes the forward price above the spot price.", "Low inventories reduce the convenience yield, because holders of the physical commodity have less to protect, so the forward price rises above the spot price."],
        0,
        "Formule de la fiche : F = S x (1 + rf) + stockage - convenience yield. Quand les stocks sont bas, on veut le physique tout de suite : le convenience yield (l'avantage non monétaire de détenir la marchandise) monte, et le prix spot aussi. Dès que le convenience yield dépasse les intérêts plus les coûts de stockage, F tombe sous S : c'est la backwardation. A est donc correct. B est faux : la baisse des stocks ne fait pas baisser le stockage de façon pertinente, et un F supérieur à S est le signe du contango, pas de la backwardation. C est faux : le convenience yield est en général inversement lié aux stocks ; quand ils baissent, il augmente, il ne diminue pas. Ce n'est donc pas un coût de stockage qui explique la backwardation mais un convenience yield élevé.",
      ],
      // Variante plus difficile — calcul inversé du convenience yield implicite, puis état du marché (contango) et signe du rendement d'un investisseur long-only
      [
        "A commodity trades at a spot price of $100. Its 1-year futures price is $104, the risk-free rate is 5%, and storage costs are $3 per year. Using F = S × (1 + rf) + storage − convenience yield, which of the following statements is most accurate?",
        ["The convenience yield is $4, so the market is in backwardation and a long-only investor earns a positive roll yield.", "The convenience yield is $8, so the market is in contango, and a long-only investor earns a positive roll yield because the futures price is above spot.", "The convenience yield is $4, which is below interest plus storage costs of $8, so the market is in contango and a long-only investor with an unchanged spot price loses about $4 as the futures price converges to spot."],
        2,
        "Étape 1 — convenience yield implicite : F = S x (1 + rf) + stockage - CY, soit 104 = 100 x 1,05 + 3 - CY = 108 - CY, d'où CY = 4 $. Étape 2 — état du marché : intérêts + stockage = 5 + 3 = 8 $, supérieur au CY de 4 $. Le portage coûte plus que l'avantage de détenir le physique, donc F (104) est au-dessus de S (100) : contango. Un CY positif ne suffit pas à créer de la backwardation, il doit dépasser 8 $. Étape 3 — rendement du long-only : à l'échéance le prix du future converge vers le spot ; si le spot reste à 100 $, le future passe de 104 à 100, soit une perte d'environ 4 $ (roll yield négatif) : le contango réduit le rendement d'un investisseur long-only. C est donc correct. A confond « CY positif » et backwardation (il faudrait un CY supérieur à 8 $) et annonce un roll yield positif, ce qui est le cas en backwardation, pas ici. B prend 8 $ pour le CY : c'est le coût de portage (intérêts + stockage), pas le convenience yield ; et il conclut à un roll yield positif parce que F est au-dessus du spot, alors que c'est l'inverse : F > S signifie que le future va perdre de la valeur en convergeant vers le spot.",
      ],

      // Concept 3 — Hedge funds : structures et comptes gérés (SMA) (officielle — R83 Q7)
      [
        "What is the least likely reason an institutional investor would use a separately managed account for a hedge fund investment?",
        ["Efficient capital allocation.", "Higher manager motivation.", "Enhanced investor control."],
        1,
        "Un separately managed account (SMA) donne à l'investisseur un portefeuille sur mesure, plus de transparence, une allocation de capital efficace, plus de contrôle et en général des frais plus bas. En contrepartie, le gérant est moins incité à performer : une motivation accrue du gérant n'est donc pas une raison d'utiliser un SMA, c'est plutôt un inconvénient. B est la réponse demandée (la moins probable). A et C sont de vrais avantages : allocation efficace du capital et contrôle accru. Autres inconvénients du SMA : complexité opérationnelle et gouvernance plus lourde.",
      ],
      // Variante angle différent — autre exemple de la catégorie : quelle structure pour un gérant qui veut un seul portefeuille mutualisé avec des investisseurs on/offshore (master-feeder, pas SMA ni fund of funds)
      [
        "A hedge fund manager wants to run a single pooled portfolio while accepting capital from both onshore taxable investors and offshore or tax-exempt investors, who need different legal vehicles. Which structure is most appropriate?",
        ["A master-feeder structure.", "A separately managed account.", "A fund of funds."],
        0,
        "Master-feeder : des fonds « feeders » (par exemple un feeder onshore pour les investisseurs imposables locaux et un feeder offshore pour les non-résidents ou les investisseurs exonérés) collectent le capital et l'investissent dans un seul fonds « master » qui détient le portefeuille. Le gérant gère donc un seul pool, tout en offrant à chaque catégorie d'investisseurs un véhicule adapté à son régime juridique et fiscal. A est donc correct. B est faux : un SMA est réservé à un seul investisseur (portefeuille sur mesure, frais négociables) ; il ne mutualise pas le capital et ne règle pas le cas de plusieurs catégories d'investisseurs dans un même pool. C est faux : un fund of funds investit dans plusieurs hedge funds gérés par d'autres, avec une double couche de frais ; il sert à diversifier un investisseur, pas à structurer le fonds d'un gérant.",
      ],
      // Variante plus difficile — fund of funds : double couche de frais (management fee + incentive fee du hedge fund sous-jacent, puis management fee du fund of funds), rendement net
      [
        "A fund of funds charges a 1% management fee on the value remaining after the underlying fund's fees, and no incentive fee. It invests all its capital in one hedge fund that charges a 2% management fee on year-end assets (before fees) and a 20% incentive fee on gains net of the management fee, with no hurdle rate. The hedge fund earns a gross return of 12% on $100 million of initial capital. The investor's net return after both layers of fees is closest to:",
        ["7.8%.", "6.7%.", "8.7%."],
        1,
        "Hedge fund sous-jacent (capital initial 100, rendement brut 12 %) : valeur de fin d'année avant frais = 112. Management fee de 2 % sur les actifs de fin d'année = 0,02 x 112 = 2,24. Incentive fee de 20 % sur le gain net du management fee = 0,20 x (112 - 100 - 2,24) = 0,20 x 9,76 = 1,952. Valeur après frais du hedge fund = 112 - 2,24 - 1,952 = 107,808. Deuxième couche : le fund of funds prélève 1 % de cette valeur = 1,078 ; valeur nette finale = 106,730, soit un rendement net d'environ 6,7 %. B est donc correct. (Le raccourci qui soustrait des pourcentages, 12 - 2 - 2,4 - 1 = 6,6 %, tombe près de la bonne valeur par hasard mais est inexact : les bases de calcul changent à chaque couche.) A (7,8 %) oublie la couche du fund of funds : 107,808 / 100 - 1 = 7,8 %. C'est précisément la « double couche de frais » de la fiche. C (8,7 %) oublie l'incentive fee du hedge fund : 112 - 2,24 = 109,76, puis moins 1 % = 108,66.",
      ],

      // Concept 4 — Stratégies de hedge funds (equity hedge, event driven, relative value) (officielle — R83 Q6)
      [
        "An example of a relative value hedge fund strategy is:",
        ["merger arbitrage.", "market neutral.", "convertible arbitrage."],
        2,
        "Les stratégies relative value exploitent des écarts de prix entre titres liés : convertible arbitrage, fixed income (asset-backed, général), volatilité, multistrategy. C est donc correct. A est faux : le merger arbitrage est une stratégie event driven (long la cible, short l'acquéreur). B est faux : market neutral est une stratégie equity hedge (long à peu près égal au short, beta proche de 0).",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : les stratégies equity hedge (market neutral, short bias, fundamental long/short net long)
      [
        "Which of the following statements about equity hedge fund strategies is least accurate?",
        ["A market neutral fund keeps its long and short exposures roughly equal, so its beta to the equity market is close to zero.", "A short bias fund holds mostly short positions, so its market exposure is negative and it tends to gain when equity prices fall.", "A fundamental long/short fund buys undervalued stocks and sells others short, but it usually keeps a net short exposure to the market."],
        2,
        "Fiche (equity hedge) : Fundamental L/S = long sur les titres sous-évalués, short sur d'autres, avec un biais net long ; Growth/value = long croissance ou sous-évalués, net long ; Market neutral = long ≈ short, donc beta ≈ 0 ; Short bias = surtout short, exposition au marché négative. C est donc l'affirmation la moins exacte : un fundamental long/short garde en général une exposition nette LONGUE, pas courte (il vend à découvert pour se couvrir et profiter des titres surévalués, mais il reste net long). A est exacte : en équilibrant longs et shorts, le market neutral annule l'essentiel du risque de marché (beta proche de 0). B est exacte : un short bias est surtout short, son exposition au marché est négative et il gagne en général quand les actions baissent.",
      ],
      // Variante plus difficile — merger arbitrage en actions : spread capturé si l'opération se conclut (indépendant du cours de l'acquéreur) et perte si elle échoue (risque de deal)
      [
        "Company A announces a stock-for-stock acquisition of Company T at an exchange ratio of 0.5 share of A for each share of T. After the announcement, A trades at $80 and T at $36. A merger arbitrage fund buys 10,000 shares of T and sells short 5,000 shares of A. Ignoring financing costs and dividends, what does the fund earn if the deal closes (whatever A's price at closing), and what does it earn if the deal fails and T falls to $28 while A rises to $84?",
        ["+$20,000 if the deal closes; −$100,000 if it fails.", "+$40,000 if the deal closes; −$100,000 if it fails.", "+$40,000 if the deal closes; −$60,000 if it fails."],
        1,
        "Rappel : le merger arbitrage est une stratégie event-driven : long la cible, short l'acquéreur (dans une opération en actions), avec un risque de deal. Opération conclue : chaque action T devient 0,5 action A ; les 10 000 actions T donnent 5 000 actions A, qui servent exactement à couvrir les 5 000 actions A vendues à découvert. Gain = (0,5 x 80 - 36) x 10 000 = 4 x 10 000 = 40 000 $ : c'est le spread à l'annonce (valeur de l'offre 40 $ contre 36 $ de cours), gagné quel que soit le cours de A à la clôture (vérification avec A à 90 $ : +90 000 sur T, -50 000 sur le short, soit +40 000). Opération qui échoue : T perd (28 - 36) x 10 000 = -80 000 $ et le short sur A perd (80 - 84) x 5 000 = -20 000 $, soit -100 000 $ au total. Le profil est asymétrique : petit gain probable (40 000) contre grosse perte possible (100 000), c'est le « risque de deal ». B est donc correct. A (+20 000) multiplie le spread de 4 $ par 5 000 (actions A vendues à découvert) au lieu de 10 000 actions T. C (-60 000) traite la perte de 20 000 $ sur le short comme un gain (-80 000 + 20 000) : un short perd quand le titre monte.",
      ],

      // Concept 5 — Biais des indices de hedge funds (survivorship, backfill, selection) (officielle — R83 Q9)
      [
        "What is an example of selection bias when creating a hedge fund index?",
        ["A fund reporting for the first time because it performs well.", "Inconsistent allocation of individual funds to a peer group.", "A fund being removed from an index because they stopped reporting."],
        1,
        "Le selection bias apparaît quand les fonds sont répartis de façon incohérente entre les peer groups (indices de stratégie) : B est correct. A est faux : un fonds qui commence à publier parce qu'il a de bonnes performances à montrer introduit un backfill bias. C est faux : retirer d'un indice un fonds qui a cessé de publier (souvent parce qu'il a mal performé) introduit un survivorship bias. Survivorship et backfill gonflent la performance de l'indice.",
      ],
      // Variante angle différent — le remède : quelle correction réduit le survivorship bias sans toucher au backfill bias
      [
        "Which of the following actions would most directly reduce survivorship bias in a hedge fund index without affecting backfill bias?",
        ["Keeping the track records of funds that stopped reporting in the index history until they were liquidated.", "Excluding the returns that a fund achieved before it joined the database when it is added to the index.", "Applying one consistent rule to assign each fund to a strategy peer group."],
        0,
        "Le survivorship bias vient de la suppression des fonds qui ont cessé de publier (souvent après de mauvaises performances) : l'indice ne garde que les survivants. Conserver dans l'historique de l'indice les résultats de ces fonds jusqu'à leur liquidation corrige directement ce biais. A est donc correct, et cela ne touche pas au backfill bias. B corrigerait le backfill bias : celui-ci apparaît quand un fonds commence à publier après de bons résultats et que son historique passé est ajouté à l'indice ; exclure les rendements antérieurs à l'entrée dans la base le supprime, mais ne ramène pas les fonds disparus. C corrigerait le selection bias : il apparaît quand les fonds sont répartis de façon incohérente entre les peer groups ; une règle d'affectation cohérente le réduit, sans effet sur les fonds disparus. Rappel : survivorship et backfill gonflent la performance de l'indice.",
      ],
      // Variante plus difficile — survivorship bias chiffré : rendement de l'ensemble des fonds vs indice des survivants, et effet sur l'évaluation relative d'un gérant
      [
        "An investor's hedge fund returned 8.0% over the year. A peer index reports 9.0%, the average return of the 90 funds still reporting at year-end. The 10 funds that stopped reporting during the year, and were dropped from the index, had an average return of −6.0%. Which of the following statements is most accurate?",
        ["The fund lagged the index by 1.0 point, and because the 10 closed funds were removed, the index understates what the average hedge fund earned.", "The fund lagged the index by 1.0 point; the index is reliable because 90% of the funds are still reporting, so the manager truly underperformed.", "The fund lagged the index by 1.0 point but beat the average of all 100 funds (7.5%) by 0.5 point; survivorship bias inflates the index and makes the manager look worse than he or she is."],
        2,
        "Rendement moyen de l'ensemble des 100 fonds = (90 x 9,0 % + 10 x (-6,0 %)) / 100 = (810 - 60) / 100 = 7,5 %. L'indice (9,0 %) ne contient que les survivants : c'est un survivorship bias, qui surestime le rendement du groupe de 1,5 point. Le fonds de l'investisseur (8,0 %) semble donc en retard de 1,0 point sur l'indice (8,0 - 9,0), alors qu'il fait mieux de 0,5 point que la moyenne de l'ensemble (8,0 - 7,5). Un indice biaisé vers le haut fait paraître le gérant moins bon qu'il n'est : C est correct. A se trompe de sens : retirer les fonds qui ont disparu (les mauvais) SURestime ce que gagne le gérant moyen, il ne le sous-estime pas. B suppose l'indice fiable parce que 90 % des fonds subsistent : or les 10 % disparus sont précisément les perdants (-6 %), ce qui suffit à gonfler la moyenne de 1,5 point.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Alternative Investments Page 3...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
