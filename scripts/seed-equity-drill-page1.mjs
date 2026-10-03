// Seed script — quiz de "drill" associé à la page 1 de la fiche PDF Equity
// (Market Organization & Structure). Structure : pour chacun des 5 concepts
// clés de la page, 1 question officielle (banque de pratique CFA, Reading 41,
// corrigé vérifié contre "- Answers.pdf", recopiée à l'identique) + 1 variante
// "angle différent" (même notion, mais jamais un simple changement de chiffres
// menant au même raisonnement) + 1 variante "plus difficile" (raisonnement à
// plusieurs étapes / pièges combinés / notion connexe de la page). Voir memory
// regle-drill-variantes-cfa-hub. Questions en anglais, explications en français.
// Usage: node scripts/seed-equity-drill-page1.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Equity (Système)";

const QUIZ_SETS = [
  {
    title: "Equity — Drill Fiche Page 1 (Market Organization & Structure)",
    difficulty: 1,
    questions: [
      // Concept 1 — Classification des actifs : réel vs financier (officielle)
      [
        "The prospectus for the Horizon Fund states that it invests only in real assets. Which of the following would the Horizon Fund most likely include in its portfolio?",
        ["Foreign currencies.", "Common stock of a technology company.", "An apartment complex."],
        2,
        "Les actifs réels (\"real assets\") ont une présence physique, comme l'immobilier ; un immeuble résidentiel est donc un actif réel. Le distracteur B est un piège classique : les actions ordinaires sont des actifs FINANCIERS (créances sur des actifs physiques ou réels), pas des actifs réels eux-mêmes.",
      ],
      // Variante angle différent — cas limite : un dérivé sur un sous-jacent physique
      [
        "Which of the following is most likely classified as a financial asset?",
        ["A futures contract on gold.", "Gold bullion stored in a vault.", "A timberland property."],
        0,
        "Le critère n'est pas le sous-jacent mais la nature de ce que l'on détient. Un contrat future sur l'or est un CONTRAT (un dérivé) : c'est un actif financier, même si son sous-jacent est une matière première physique. B est faux : l'or détenu physiquement est une matière première, donc un actif réel. C est faux : une forêt exploitable (terrain et bois sur pied) est un actif réel, souvent rangé parmi les investissements alternatifs. C'est le miroir de la question officielle : une action reste un actif financier même si l'entreprise possède des actifs réels, et un dérivé reste un actif financier même si son sous-jacent est physique.",
      ],
      // Variante plus difficile — combiner réel/financier, primaire/secondaire et closed-end vs open-end
      [
        "An investor buys, through her broker on a stock exchange, shares of a closed-end fund that invests exclusively in commercial real estate. Which of the following statements about this transaction is most accurate?",
        [
          "She has acquired a real asset, and the price she pays must equal the fund's net asset value (NAV) per share.",
          "She has acquired a financial asset in the secondary market, and the price she pays may be above or below the fund's NAV per share.",
          "She has acquired a financial asset in the primary market, and she can later redeem her shares with the fund at NAV.",
        ],
        1,
        "Trois étapes. (1) Nature de l'actif : le fonds détient des immeubles (actifs réels), mais l'investisseuse détient des PARTS du fonds, c'est-à-dire une créance sur ces immeubles — un actif financier (même piège que la question officielle). (2) Marché : elle achète en bourse à un autre investisseur ; le fonds ne reçoit aucun argent, c'est donc une transaction sur le marché secondaire (le marché primaire est celui de l'émission, où l'argent va à l'émetteur). (3) Prix : un fonds closed-end a un nombre de parts fixe, non rachetables par le fonds ; leur prix résulte de l'offre et de la demande et peut présenter une prime ou une décote par rapport à la NAV. A est faux sur deux points : il confond le sous-jacent avec ce que détient l'investisseuse, et le prix égal à la NAV est une caractéristique des fonds open-end. C est faux : le rachat des parts par le fonds à la NAV est lui aussi propre aux fonds open-end, et un achat en bourse à un autre investisseur n'est pas une opération primaire.",
      ],

      // Concept 2 — Forward vs futures (officielle)
      [
        "In contrast with a typical forward contract, futures contracts have:",
        ["standardized terms.", "less liquidity.", "greater counterparty risk."],
        0,
        "Les futures sont des forwards qui se négocient sur des bourses organisées avec des conditions standardisées, contrairement aux forwards qui sont des instruments sur mesure. Une chambre de compensation réduit le risque de contrepartie des futures (donc le distracteur C, qui affirme un risque de contrepartie plus élevé, est faux), et les futures, cotés en bourse, sont plus liquides que les forwards (donc B est aussi faux).",
      ],
      // Variante angle différent — le "pourquoi" du moindre risque de contrepartie, pas la liste des différences
      [
        "Which of the following best explains why futures contracts expose traders to less counterparty risk than forward contracts?",
        [
          "Futures contracts are standardized, which makes them more liquid than forwards.",
          "A clearinghouse stands between buyer and seller and requires traders to post margin.",
          "Futures contracts are settled only once, at expiration, so there is less time for a default to occur.",
        ],
        1,
        "La baisse du risque de contrepartie vient de la chambre de compensation : elle devient l'acheteur de chaque vendeur et le vendeur de chaque acheteur, et elle exige une marge initiale (puis des ajustements de marge), ce qui garantit l'exécution du contrat. A confond deux avantages distincts : la standardisation explique la meilleure LIQUIDITÉ des futures, pas leur moindre risque de contrepartie. C inverse la réalité : c'est le forward qui ne se règle qu'à l'échéance ; un future est réévalué et réglé chaque jour (mark-to-market), ce qui empêche les pertes non payées de s'accumuler.",
      ],
      // Variante plus difficile — choisir le contrat selon deux contraintes + identifier le type d'acteur et le risque supporté
      [
        "An exporter will receive €3,750,000 on a date that does not match any exchange-traded contract expiration. Its treasurer wants to lock in today's exchange rate for exactly that amount and date, and does not want to deposit any cash when entering the contract. Which of the following statements is most accurate?",
        [
          "The exporter should use a currency forward; it is acting as a hedger and bears direct counterparty risk, since no clearinghouse stands between the parties.",
          "The exporter should use currency futures; as a hedger, it bears almost no counterparty risk because the clearinghouse guarantees the trade.",
          "The exporter should use a currency forward; it is acting as an information-motivated trader and bears direct counterparty risk.",
        ],
        0,
        "Trois étapes. (1) Le contrat : un montant non standard et une date qui ne correspond à aucune échéance cotée imposent un contrat sur mesure négocié de gré à gré, donc un forward ; de plus, le forward n'exige aucun versement à l'entrée, alors qu'un future impose une marge initiale. B est donc écarté sur deux points (standardisation et marge), même si ce qu'il dit de la chambre de compensation est vrai pour un future. (2) Le type d'acteur : l'exportateur compense un risque de change qui existe déjà dans son activité, c'est un hedger ; un information-motivated trader parie sur une information supérieure pas encore reflétée dans le prix — C se trompe sur ce point. (3) Le risque : sans chambre de compensation, l'exportateur est directement exposé au défaut de sa contrepartie — c'est le prix de la flexibilité du forward.",
      ],

      // Concept 3 — Vocabulaire des ordres limites : position par rapport au marché (officielle)
      [
        "Which of the following orders is said to be \"behind the market\"?",
        ["Market sell order when the best bid is 38 and the best ask is 39.", "Limit sell order at 38 when the best ask is 39.", "Limit buy order at 38 when the best bid is 39."],
        2,
        "Un ordre limite d'achat est \"derrière le marché\" si son prix limite est inférieur au meilleur bid : ici le meilleur bid est 39 et l'ordre d'achat est à 38, donc il est derrière le marché. Le distracteur B est un piège : un ordre de vente à 38 alors que l'ask est à 39 est en réalité un ordre agressif (exécutable immédiatement), pas \"derrière le marché\". Les ordres au marché (A) ne sont jamais qualifiés ainsi.",
      ],
      // Variante angle différent — côté VENTE : la logique de comparaison s'inverse
      [
        "The best bid for a stock is $50.00 and the best ask is $50.10. A trader submits a limit sell order at $50.05. This order is best described as:",
        ["behind the market.", "making a new market.", "taking the market."],
        1,
        "Pour un ordre de VENTE, la logique s'inverse par rapport à l'achat : on compare le prix limite au meilleur ask. À 50,05 $, l'ordre est sous le meilleur ask (50,10 $) mais au-dessus du meilleur bid (50,00 $) : il devient le nouveau meilleur ask, il « fait un nouveau marché » (making a new market, ou « inside the market »). A est faux : un ordre de vente n'est « derrière le marché » que si son prix est AU-DESSUS du meilleur ask (par exemple 50,20 $) — c'est l'erreur de qui applique la règle de l'achat (« prix plus bas = derrière ») sans l'inverser. C est faux : pour « prendre le marché » (ordre marketable, exécuté immédiatement), il faudrait vendre à un prix inférieur ou égal au meilleur bid, soit 50,00 $ ou moins.",
      ],
      // Variante plus difficile — protéger une vente à découvert : stop-buy vs stop-sell vs ordre limite marketable
      [
        "An investor sold a stock short at $60. The stock now trades at $58 (best bid $57.95, best ask $58.05). She wants to limit her loss if the price rises sharply, without closing the position today. Which of the following is most appropriate?",
        [
          "A stop-buy order at $65; once the stop price is reached it executes as a market order, so in a fast-rising market she may pay more than $65.",
          "A stop-sell order at $55, which is triggered if the price falls to $55 and caps her loss.",
          "A limit buy order at $65, which guarantees she will not pay more than $65 and will execute only if the price rises to $65.",
        ],
        0,
        "Une position courte perd quand le prix MONTE : il faut un ordre de rachat qui ne se déclenche qu'à la hausse, donc un stop-buy. Une fois le seuil de 65 $ atteint, il devient un ordre au marché : exécution assurée mais prix incertain — on peut payer plus de 65 $ si le cours s'envole. La perte est donc limitée à environ 65 − 60 = 5 $ par action, sans garantie absolue. B est faux : un stop-sell se déclenche à la baisse et protège une position LONGUE ; pour une vendeuse à découvert, une baisse est un gain. C est le piège : un ordre limite d'achat à 65 $ alors que le meilleur ask est à 58,05 $ est marketable (prix limite supérieur ou égal à l'ask) — il « prend le marché » et s'exécute immédiatement vers 58,05 $, ce qui clôture la position aujourd'hui au lieu de la protéger.",
      ],

      // Concept 4 — Objectifs de la régulation des marchés (officielle)
      [
        "An objective of financial market regulation is to:",
        ["ensure that inside information is made public in a timely manner.", "prevent uninformed investors from participating in financial markets.", "reduce information gathering costs by requiring common financial reporting standards."],
        2,
        "Un objectif de la régulation des marchés est d'exiger des standards de reporting financier communs, ce qui réduit le coût de collecte d'information pour les investisseurs. La régulation ne vise pas à écarter les investisseurs non informés du marché (B est faux) ; elle vise plutôt à empêcher ceux qui détiennent une information non publique d'en profiter, sans exiger que toute information privilégiée devienne publique immédiatement (A est faux).",
      ],
      // Variante angle différent — le "pourquoi" d'un autre objectif (standards minimaux de compétence)
      [
        "Regulators often impose minimum standards of competency on brokers and investment advisers, for example through licensing examinations. The main rationale for this objective of regulation is that:",
        [
          "investors cannot easily assess whether their agents are competent and acting in their best interests.",
          "licensed agents can then guarantee their clients a minimum rate of return.",
          "it allows regulators to keep uninformed investors out of the financial markets.",
        ],
        0,
        "Le client d'un courtier ou d'un conseiller (le « principal ») en sait moins que son agent : il lui est difficile de vérifier sa compétence et sa loyauté (problème d'agence, asymétrie d'information). Imposer des standards minimaux de compétence — examens, licences ; le programme CFA participe à cet effort — réduit ce problème. B est faux : la régulation ne garantit jamais un rendement ; elle encadre les acteurs, pas les résultats. C est faux : la régulation cherche à PROTÉGER les investisseurs non avertis, pas à les exclure des marchés (c'était déjà un distracteur de la question officielle).",
      ],
      // Variante plus difficile — combiner les types d'émission primaire avec la logique de protection des non-avertis
      [
        "A company wants to raise $50 million quickly. It does not want to prepare the extensive disclosure required for a public offering, and plans to sell the new shares directly to a small group of insurance companies and pension funds, accepting a somewhat lower price. Which of the following statements is most accurate?",
        [
          "This is a shelf registration; regulators allow it because the firm discloses all required information in advance and then sells shares over time.",
          "This is a rights offering; reduced disclosure is permitted because the buyers are existing shareholders who already know the firm.",
          "This is a private placement; reduced disclosure is permitted because qualified investors are deemed able to assess the risks without the protections designed for unsophisticated investors, and the lower price reflects the securities' lower liquidity.",
        ],
        2,
        "Deux étapes. (1) Le type d'émission : une vente directe à quelques investisseurs institutionnels qualifiés, sans le prospectus complet d'une offre publique, est un placement privé. (2) Le lien avec la régulation : l'un de ses objectifs est de protéger les investisseurs non avertis ; des investisseurs qualifiés (patrimoine et expertise importants) sont jugés capables d'évaluer seuls les risques, d'où une obligation d'information allégée. En contrepartie, les titres sont moins liquides (pas de revente libre sur le marché public), ce qui explique le prix plus bas. A est faux : la définition du shelf registration est juste, mais elle suppose au contraire une information COMPLÈTE publiée à l'avance, ce que l'entreprise veut éviter. B est faux : un rights offering s'adresse aux actionnaires existants, au prorata de leur détention et à prix réduit — or les acheteurs sont ici de nouveaux investisseurs, et la justification avancée est inventée.",
      ],

      // Concept 5 — Achat sur marge : prix d'appel de marge et rendement (officielle)
      [
        "Byron Campbell purchased 300 shares of Crescent, Inc., stock at a price of $80 per share. The purchase was made on margin with an initial margin requirement of 50%. Assuming the maintenance margin is 25%, the stock price of Crescent, Inc. has to fall below what level for Campbell to receive a margin call?",
        ["$20.00.", "$40.00.", "$53.33."],
        2,
        "Le prix déclenchant l'appel de marge se calcule par : P = P0 × (1 − marge initiale) / (1 − marge de maintenance) = 80 × (1 − 0,50) / (1 − 0,25) = 40 / 0,75 = 53,33 $. Les distracteurs A et B n'appliquent pas correctement le dénominateur (1 − marge de maintenance) de la formule officielle.",
      ],
      // Variante angle différent — calcul inversé : retrouver la marge de maintenance à partir du prix d'appel
      [
        "An investor buys a stock on margin at $50 per share with an initial margin requirement of 40%. Her broker tells her that she will receive a margin call if the price falls below $37.50. The maintenance margin requirement is closest to:",
        ["15%.", "20%.", "25%."],
        1,
        "On remonte la formule au lieu de l'appliquer. Emprunt par action = 50 × (1 − 0,40) = 30 $ (levier = 1 / 0,40 = 2,5). Au seuil de 37,50 $, l'equity par action vaut 37,50 − 30 = 7,50 $ ; la marge de maintenance est le ratio equity / valeur ACTUELLE du titre : 7,50 / 37,50 = 20 %. Vérification : 50 × 0,60 / (1 − 0,20) = 30 / 0,80 = 37,50 $. A (15 %) divise l'equity par le prix d'ACHAT (7,50 / 50) au lieu du prix courant. C (25 %) confond la marge de maintenance avec la baisse du cours en pourcentage ((50 − 37,50) / 50).",
      ],
      // Variante plus difficile — rendement d'un achat sur marge avec intérêts au prorata, dividendes, commissions et donnée-piège
      [
        "An investor buys 1,000 shares of a stock at $40 per share on margin. The initial margin requirement is 50%, the maintenance margin requirement is 30%, the call money rate is 6% per year, and the commission is $0.05 per share on both the purchase and the sale. Six months later, after receiving a dividend of $0.40 per share, the investor sells all the shares at $46. The return on the investor's initial investment is closest to:",
        ["25.4%.", "28.4%.", "31.4%."],
        1,
        "Méthode par étapes. (1) Investissement initial = 1 000 × 40 × 50 % + commission d'achat 1 000 × 0,05 = 20 000 + 50 = 20 050 $ ; emprunt = 20 000 $. (2) Intérêts sur la durée RÉELLE de détention : 20 000 × 6 % × 6/12 = 600 $. (3) Equity finale = vente 46 000 − commission de vente 50 − remboursement de l'emprunt 20 000 − intérêts 600 + dividendes 400 = 25 750 $. (4) Rendement = (25 750 − 20 050) / 20 050 = 5 700 / 20 050 = 28,4 %. Contrôle : gain sur le titre 6 000 − intérêts 600 + dividendes 400 − commissions 100 (achat et vente) = 5 700 $ ; la commission d'achat est une dépense, elle n'est pas récupérée dans l'equity finale. La marge de maintenance de 30 % est une donnée-piège : le cours a monté, et l'appel de marge n'interviendrait que sous 40 × 0,50 / 0,70 ≈ 28,57 $. A (25,4 %) compte un an d'intérêts (1 200 $) au lieu de six mois : 5 100 / 20 050. C (31,4 %) oublie les intérêts : 6 300 / 20 050.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Equity Page 1...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
