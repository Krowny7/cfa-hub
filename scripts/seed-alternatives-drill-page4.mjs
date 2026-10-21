// Seed script — quiz de "drill" associé à la page 4 de la fiche PDF Alternative
// Investments (Introduction to Digital Assets, Reading 82 de la fiche, soit
// Reading 84 dans la banque de pratique : décalage de +2).
// Structure : pour chacun des 5 concepts clés de la page, 1 question officielle
// (banque de pratique CFA, Practise Exams/Alternative Investment, Reading 84,
// bonne réponse vérifiée contre le corrigé officiel "- Answers", jamais l'une
// des 5 questions déjà imprimées dans le PDF : R84 Q14, Q3, Q2, Q9, Q5)
// + 1 variante "angle différent" (même notion, mais jamais un simple changement
// de chiffres menant au même raisonnement) + 1 variante "plus difficile"
// (raisonnement à plusieurs étapes / pièges combinés / notion connexe de la
// page). Voir memory regle-drill-variantes-cfa-hub. Questions en anglais,
// explications en français.
// Usage: node scripts/seed-alternatives-drill-page4.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Alternative Investments (Système)";

const QUIZ_SETS = [
  {
    title: "Alternative Investments — Drill Fiche Page 4 (Introduction to Digital Assets)",
    difficulty: 2,
    questions: [
      // Concept 1 — DLT, tokens, smart contracts et tokenization (officielle — R84 Q1)
      [
        "Ownership rights to physical assets on distributed ledger technology are represented by a:",
        ["blockchain.", "smart contract.", "token."],
        2,
        "Les tokens représentent des droits de propriété sur des actifs physiques au sein d'une blockchain ou d'un autre registre distribué. C est donc correct. A est faux : la blockchain est le support, un registre distribué où les blocs sont reliés par des hash, pas la représentation d'un droit de propriété. B est faux : un smart contract est un programme qui exécute automatiquement des actions lorsque des conditions fixées à l'avance sont remplies.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : avantages et inconvénients de la DLT (blocs liés par des hash, post-trade, vie privée, puissance de calcul)
      [
        "Which of the following statements about distributed ledger technology (DLT) is least accurate?",
        ["Validated transactions are grouped into blocks linked by hashes, which makes recorded entries very difficult to alter.", "Because participants share the same record, DLT can simplify post-trade processing and speed up the transfer of value.", "Limited privacy and heavy computing-power needs are among the main advantages of DLT over a centralized database."],
        2,
        "La fiche distingue clairement : avantages de la DLT = transparence, sécurité, transfert rapide, simplification du post-trade ; inconvénients = vie privée et puissance de calcul. C est donc l'affirmation la moins exacte : une vie privée limitée et un besoin de puissance de calcul sont des INCONVÉNIENTS, pas des avantages. A est exacte : les transactions validées sont regroupées en blocs reliés par des hash, et une fois enregistrées elles sont immuables, donc très difficiles à modifier (sécurité). B est exacte : tous les participants partagent le même registre, ce qui limite les rapprochements et accélère le règlement (post-trade simplifié, transfert rapide).",
      ],
      // Variante plus difficile — tokenization d'un immeuble : distinguer le token (droit de propriété) du smart contract (programme), et calculer la distribution au prorata
      [
        "A company tokenizes an office building worth $20 million into 20,000,000 tokens recorded on a distributed ledger; each token represents a proportional ownership right. A program on the ledger is coded to distribute each month's net rent automatically to token holders pro rata. In March, net rent is $80,000, and an investor holds 50,000 tokens. Which statement is most accurate?",
        ["The investor receives $200; the smart contract is the digital record of ownership and the token is the program that executes the distribution.", "The investor receives $200; the tokens are the digital representation of the ownership rights, and the smart contract is the program that executes the distribution automatically when the conditions are met.", "The investor receives $2,000; the tokens are the digital representation of the ownership rights, and the smart contract is the program that executes the distribution automatically when the conditions are met."],
        1,
        "Deux notions à distinguer. Les droits de propriété sur le bâtiment sont représentés par des tokens (c'est la tokenization : droits de propriété d'un actif physique inscrits sur un registre). Le programme qui verse automatiquement le loyer selon des règles fixées d'avance est un smart contract. Montant : 50 000 / 20 000 000 = 0,25 % du bâtiment ; 0,25 % x 80 000 $ = 200 $. B est donc correct. A a le bon montant mais inverse les rôles : le token n'est pas un programme et le smart contract n'est pas le titre de propriété. C a les bons rôles mais se trompe d'un facteur 10 : 2 000 $ correspondrait à 2,5 % du bâtiment, soit 500 000 tokens.",
      ],

      // Concept 2 — Consensus et réseaux permissionless / permissioned (officielle — R84 Q12)
      [
        "Which of the following statements is most accurate regarding the features of digital assets? Digital assets:",
        ["are usually validated using permissionless blockchain networks.", "are typically used as a direct medium of exchange.", "have well-established legal and regulatory standards."],
        0,
        "Les transactions sur actifs numériques sont en général enregistrées sur des registres décentralisés, via des réseaux blockchain permissionless (ouverts à tous, comme Bitcoin). A est donc correct. B est faux : les actifs numériques servent rarement de moyen d'échange direct, notamment à cause des coûts de transaction. C est faux : les cadres légaux et réglementaires sont encore en évolution, et ces actifs sont illégaux dans certaines juridictions.",
      ],
      // Variante angle différent — le "pourquoi" : quel type de réseau (permissioned ou permissionless) pour un consortium de banques
      [
        "A consortium of banks wants a shared ledger on which only vetted members can validate transactions, participation rights depend on each member's role, and operating costs should be lower than on an open network. The most appropriate network type is:",
        ["permissionless, because open participation lowers validation costs.", "permissioned, because rights are limited to approved participants and the network is cheaper to operate.", "permissionless, because only open networks can keep recorded entries immutable."],
        1,
        "Réseau permissioned : l'accès et les droits sont limités à des participants approuvés (ici des banques contrôlées, avec des rôles définis) et le coût d'exploitation est plus faible. Réseau permissionless : ouvert à tous (Bitcoin), avec un coût plus élevé. B est donc correct. A est faux : l'ouverture à tous caractérise le permissionless, qui est le plus coûteux, et ne correspond pas à l'exigence de membres contrôlés. C est faux : l'immuabilité des entrées vient de la structure du registre (blocs reliés par des hash, transactions validées), pas du caractère ouvert du réseau ; un réseau permissioned est lui aussi immuable.",
      ],
      // Variante plus difficile — proof of stake : rôle des validators, récompense de staking en tokens et baisse du prix (rendements composés, pas additionnés)
      [
        "An investor holds 10,000 tokens of a proof-of-stake network, priced at $5.00, and stakes them all as a validator for one year. Staking rewards equal 6% of the staked tokens, paid in new tokens at year-end. At year-end the token price is $4.50. Which statement is most accurate?",
        ["Validators are rewarded with a staking yield, but the investor's total return is about −4.6% because the 10% price decline outweighs the reward.", "Validators are rewarded with a staking yield, and the investor's total return is about −4.0% (the 6% reward minus the 10% price decline).", "Only miners are rewarded, and a proof-of-stake validator earns nothing, so the investor's total return is −10.0%."],
        0,
        "Rôles : en proof of work, les miners résolvent un problème cryptographique (très énergivore) et sont rémunérés ; en proof of stake, les validators mettent en jeu (staking) leurs tokens et sont rémunérés par un rendement. Calcul : récompense = 6 % x 10 000 = 600 tokens, soit 10 600 tokens au total. Valeur finale = 10 600 x 4,50 = 47 700 $ contre 10 000 x 5,00 = 50 000 $ au départ : rendement = 47 700 / 50 000 - 1 = -4,6 %, ou (1,06 x 0,90) - 1 = -4,6 %. A est donc correct. B additionne les pourcentages (6 % - 10 % = -4,0 %) alors que la récompense est versée en tokens qui subissent aussi la baisse de prix : il faut multiplier les facteurs (1,06 x 0,90). C est faux : un validator est justement rémunéré par le staking ; ce sont les miners qui n'existent qu'en proof of work. Le rendement n'est donc pas de -10 %.",
      ],

      // Concept 3 — Types d'actifs numériques : cryptomonnaies, tokens et ICO (officielle — R84 Q4)
      [
        "Investors in an initial coin offering (ICO) typically receive:",
        ["registered securities.", "voting rights in the ICO issuer.", "cryptocurrency."],
        2,
        "Une initial coin offering (ICO) est une vente de cryptomonnaie aux investisseurs contre du cash ou une autre cryptomonnaie : les investisseurs reçoivent donc des coins ou des tokens. C est correct. A est faux : une ICO n'est pas une émission de titres enregistrés, contrairement à une IPO réglementée. B est faux : elle ne donne en général pas de droits de vote dans l'émetteur.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : cryptomonnaie, stablecoin, CBDC
      [
        "Which of the following statements about types of digital assets is least accurate?",
        ["A stablecoin is designed to keep a stable value by linking it to an asset and holding reserves against it.", "A central bank digital currency (CBDC) is a digital form of a country's currency, issued by its central bank.", "Cryptocurrencies such as Bitcoin and Ether are issued by central banks, which can expand their supply at will."],
        2,
        "Types d'actifs numériques (fiche) : cryptomonnaie = pas de banque centrale, offre limitée (Bitcoin, Ether) ; stablecoin = indexé sur un actif, adossé à des réserves ; CBDC = monnaie numérique de banque centrale ; tokens = NFT, security, utility, governance. C est donc l'affirmation la moins exacte : Bitcoin et Ether n'ont justement PAS de banque centrale, et leur offre est limitée par le protocole (21 millions pour Bitcoin), pas extensible à volonté. A est exacte : le stablecoin vise la stabilité en s'indexant sur un actif et en détenant des réserves. B est exacte : la CBDC est la forme numérique de la monnaie d'un pays, émise par sa banque centrale (contrairement aux cryptomonnaies).",
      ],
      // Variante plus difficile — ICO : nombre de tokens au prix d'émission (paiement en ether), valeur actuelle, et droits reçus (pas de titres enregistrés ni de vote)
      [
        "A start-up raises capital in an initial coin offering by selling platform-access tokens at $0.25 each, accepting payment in ether. An investor pays 3 ether when one ether is worth $1,500. Later, the tokens trade at $0.40. Which of the following statements is most accurate?",
        ["The investor holds 11,250 tokens, now worth $4,500; the tokens are not registered securities and ordinarily carry no voting rights in the start-up.", "The investor holds 18,000 tokens, now worth $7,200; the tokens are not registered securities and ordinarily carry no voting rights in the start-up.", "The investor holds 18,000 tokens, now worth $7,200, and as an ICO participant also holds registered securities carrying voting rights in the start-up."],
        1,
        "Étape 1 — nombre de tokens : 3 ether x 1 500 $ = 4 500 $ investis ; au prix d'émission de 0,25 $, cela donne 4 500 / 0,25 = 18 000 tokens. Étape 2 — valeur actuelle : 18 000 x 0,40 = 7 200 $ (+60 %). Étape 3 — droits : une ICO est une vente de cryptomonnaie ou de tokens contre du cash ou une autre cryptomonnaie, pas une émission de titres enregistrés comme une IPO réglementée ; ici les tokens donnent accès à la plateforme et, en général, aucun droit de vote dans l'émetteur. B est donc correct. A convertit au prix actuel (0,40 $) au lieu du prix d'émission (0,25 $) : 4 500 / 0,40 = 11 250 tokens. Le nombre de tokens se fixe à l'achat, au prix de l'ICO, et leur valeur actuelle est de 7 200 $, pas de 4 500 $. C a le bon calcul mais confond l'ICO avec une IPO : les participants ne reçoivent ni titres enregistrés ni droits de vote.",
      ],

      // Concept 4 — Investir dans les actifs numériques : asset-backed tokens, exchanges et véhicules (officielle — R84 Q7)
      [
        "Potential impacts of asset-backed tokens most likely include:",
        ["more liquidity for higher-priced assets.", "decreased transparency for transactions.", "increased transaction fees and costs."],
        0,
        "Un asset-backed token représente la propriété d'un actif physique et permet une propriété fractionnée : il peut donc apporter plus de liquidité à des actifs de prix élevé. A est correct. B est faux : le registre immuable des propriétés et des transferts augmente la transparence des transactions. C est faux : il réduit les coûts de transaction (moins d'intermédiaires) au lieu de les augmenter.",
      ],
      // Variante angle différent — autre exemple de la catégorie : quel actif profite le plus de la liquidité apportée par un asset-backed token (propriété fractionnée)
      [
        "Which of the following assets would most likely gain the most liquidity from being represented by asset-backed tokens?",
        ["A $40 million commercial building.", "A large-cap stock listed on a major exchange.", "A short-term government bill traded daily in a deep market."],
        0,
        "Un asset-backed token représente la propriété d'un actif physique et permet une propriété fractionnée : le gain de liquidité est le plus grand pour un actif cher, indivisible et peu liquide, que peu d'investisseurs peuvent acheter en entier. A est donc correct : un immeuble commercial de 40 M$ coûte trop cher pour la plupart des investisseurs et se revend lentement ; le découper en tokens abaisse le ticket d'entrée et élargit le nombre d'acheteurs potentiels, donc la liquidité. B est faux : une action de grande capitalisation cotée est déjà très liquide et fractionnable. C est faux : un bon du Trésor à court terme s'échange chaque jour sur un marché profond ; la tokenisation n'y ajouterait que peu de liquidité.",
      ],
      // Variante plus difficile — trois voies d'investissement (exchange décentralisé + wallet, coin trust, futures) : qui porte le risque de perte de clés privées, et pourquoi décentralisé ne veut pas dire sans risque
      [
        "An investment committee compares three ways to gain exposure to a cryptocurrency: (1) buying coins on a decentralized exchange and holding them in a personal wallet; (2) buying units of a coin trust; (3) buying cryptocurrency futures. Which of the following statements is most accurate?",
        ["Only (1) and (2) involve holding the coins themselves, so (2) exposes the investor to the same risk of lost private keys as (1).", "Only (1) leaves the investor responsible for private keys, and so exposed to a permanent loss of access; the trust invests directly in the coin on behalf of its investors, and futures are typically cash-settled and involve no coin holding.", "Option (1) removes any risk of fraud, hacking or lost access because a decentralized exchange has no central operator, so it is the safest of the three."],
        1,
        "Voie directe : exchange + wallet, avec des risques de fraude, de vol et de perte des clés privées (une clé perdue rend les coins irrécupérables). Voie indirecte : coin trusts (pas de wallet, le trust détient les coins), futures, ETPs, actions liées. Seul l'investisseur qui détient lui-même les coins dans son wallet a la responsabilité des clés privées et peut les perdre définitivement. Les parts d'un coin trust s'achètent sans wallet, car le trust investit directement dans le coin pour le compte de ses investisseurs ; les futures sur cryptomonnaie sont en général réglés en cash et ne font détenir aucun coin. B est donc correct. A est faux : l'acheteur de parts d'un coin trust ne détient pas les coins lui-même et n'a aucune clé à garder ; il ne supporte pas le même risque de perte de clés. C est faux : un exchange décentralisé est plus difficile à pirater (pas de point de contrôle central), mais il n'élimine ni la fraude, ni le vol, ni la perte des clés ; difficile à pirater ne veut pas dire sans risque.",
      ],

      // Concept 5 — Risque, rendement et facteurs de prix des actifs numériques (officielle — R84 Q10)
      [
        "Cryptocurrency prices are least likely to be affected by:",
        ["technological advancement.", "projected cash flows.", "regulatory development."],
        1,
        "Les cryptomonnaies ne génèrent aucun cash flow (ni intérêt ni dividende) : il n'existe donc pas de flux projetés pour fonder leur prix. B est la réponse demandée (le facteur le moins susceptible de les affecter). A et C sont faux : l'avancée technologique et l'évolution de la réglementation font bouger les prix, avec l'adoption par le marché, les effets de réseau, la spéculation et l'appétit pour le risque.",
      ],
      // Variante angle différent — le "pourquoi" : pourquoi la diversification par les actifs numériques est incertaine (corrélation faible mais qui peut monter en stress, asymétrie positive)
      [
        "Which of the following is the best reason for caution when relying on digital assets to diversify a traditional portfolio?",
        ["Their returns have a negative skew, so extreme losses are more likely than extreme gains.", "They pay stable cash flows that are strongly correlated with bond coupons.", "Their correlation with traditional assets is low on average but can rise during periods of market stress."],
        2,
        "La corrélation des actifs numériques avec les actifs traditionnels est faible en moyenne (d'où l'idée de diversification), mais elle peut monter en période de stress de marché : la diversification attendue risque de disparaître au moment où l'on en aurait le plus besoin ; avec leur caractère spéculatif, cela appelle à la prudence. C est donc correct. A est faux : la fiche décrit une asymétrie POSITIVE (de rares gains extrêmes très élevés), pas négative. B est faux : les actifs numériques ne génèrent aucun cash flow (ni intérêts ni dividendes), donc rien de comparable à des coupons obligataires.",
      ],
      // Variante plus difficile — quatre affirmations sur une cryptomonnaie à offre plafonnée (pas de cash flow actualisable, moteurs de prix, piège "digital gold", spéculation)
      [
        "An analyst makes four statements about a cryptocurrency with a fixed maximum supply of 21 million units: (i) its price can be estimated by discounting its expected future dividends; (ii) its price is influenced by market adoption, network effects, technology and regulation; (iii) the fixed maximum supply guarantees that its price will rise over time; (iv) its returns are largely speculative, with high volatility. Which statements are most accurate?",
        ["(ii) and (iv) only.", "(ii), (iii) and (iv).", "(i) and (iii) only."],
        0,
        "Analyse de chaque affirmation. (i) Fausse : une cryptomonnaie ne génère aucun cash flow (ni dividende ni intérêt) ; on ne peut pas les actualiser, sa valeur repose sur l'appréciation attendue du prix. (ii) Vraie : les moteurs sont l'adoption par le marché, les effets de réseau, la technologie, la régulation et l'appétit pour le risque. (iii) Fausse : l'offre plafonnée (21 millions pour Bitcoin, d'où le surnom « digital gold ») limite l'offre mais ne garantit rien : si la demande baisse, le prix baisse malgré la rareté. (iv) Vraie : rendement moyen mais volatilité élevée, caractère spéculatif, pas de valeur fondamentale. Seules (ii) et (iv) sont exactes : A est donc correct. B inclut (iii) : c'est le piège du « digital gold », la rareté ne protège pas d'une baisse de prix. C inclut (i) et (iii) et omet (ii) et (iv) : elle cumule les deux erreurs.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Alternative Investments Page 4...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
