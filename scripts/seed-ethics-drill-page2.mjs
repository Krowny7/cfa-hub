// Seed script — quiz de "drill" associé à la page 2 de la fiche PDF Ethical and
// Professional Standards (Standards I & II · Professionalism, Capital Markets,
// Reading 91, 1re partie). La banque de pratique numérote ces Standards en
// Readings 91.1 à 91.3 (même numérotation que la fiche, pas de décalage).
// Structure : pour chacun des 5 concepts clés de la page, 1 question officielle
// (banque de pratique Ethics, corrigé vérifié contre "- Answers.pdf") + 1
// variante "angle différent" (même notion, mais jamais un simple changement de
// chiffres menant au même raisonnement) + 1 variante "plus difficile"
// (raisonnement à plusieurs étapes / pièges combinés / notion connexe de la
// page). Voir memory regle-drill-variantes-cfa-hub. Questions en anglais,
// explications en français.
// Les 5 questions officielles ne sont PAS celles imprimées dans le PDF
// (R91.1 Q86 et Q25, R91.2 Q8, R91.3 Q24 et Q30) : l'utilisateur les a déjà
// sur papier.
// Usage: node scripts/seed-ethics-drill-page2.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Ethical and Professional Standards (Système)";

const QUIZ_SETS = [
  {
    title: "Ethical and Professional Standards — Drill Fiche Page 2 (Standards I & II · Professionalism, Capital Markets)",
    difficulty: 1,
    questions: [
      // Concept 1 — I(A) Knowledge of the Law : se dissocier, signalement non obligatoire (officielle — R91.1 Q92)
      [
        "If a CFA Institute member knows that a fellow member has violated the Code and Standards, according to Standard I(A) the member is:",
        [
          "required to dissociate from the activity and strongly encouraged to report it.",
          "strongly encouraged to dissociate from the activity.",
          "required to report the activity.",
        ],
        0,
        "Standard I(A) interdit de participer sciemment à une violation : celui qui la constate doit s'en dissocier (après l'avoir signalée à son supervisor ou à la compliance). Le Standard ne l'oblige pas à dénoncer l'auteur à CFA Institute ou aux autorités, mais l'y encourage fortement (« strongly encouraged »). A est donc correct. B est faux : la dissociation est obligatoire, pas simplement encouragée. C est faux : le signalement n'est pas exigé par le Standard, sauf si la loi locale l'impose.",
      ],
      // Variante angle différent — cas limite : rester en place sans rien faire n'est pas se dissocier
      [
        "Ana Ruiz, CFA, discovers that her supervisor is backdating trades for a few favored clients, in violation of securities law. She reports the practice to the compliance department, which takes no action, and the backdating continues on accounts she helps manage. Which of the following responses is least sufficient under Standard I(A) Knowledge of the Law?",
        [
          "Refusing to process any backdated trades, documenting her attempts to stop the practice, and asking to be removed from the accounts concerned.",
          "Resigning from the firm if the practice continues and she has no other way to dissociate from it.",
          "Continuing her usual work on the accounts without further comment, since she has already informed the compliance department.",
        ],
        2,
        "Standard I(A) interdit de participer ou d'aider sciemment à une violation. La démarche attendue : signaler au supervisor ou à la compliance ; si rien ne change, se dissocier de l'activité (refuser d'y participer, se faire retirer du dossier, documenter) ; dans un cas extrême, démissionner. Rester en place sans rien faire n'est pas se dissocier : en continuant à travailler sur ces comptes, Ruiz continue d'aider la violation. C est donc la réponse demandée (la réponse la moins suffisante). A est faux : refuser de traiter les opérations, documenter et demander à être retirée des comptes est précisément la dissociation exigée. B est faux : la démission est la solution extrême prévue quand on ne peut pas se dissocier autrement ; elle suffit. Rappel : dénoncer la pratique au régulateur ou à CFA Institute est encouragé mais pas exigé par le Standard.",
      ],
      // Variante plus difficile — loi locale moins stricte (pas de loi d'insider trading) + instruction de la hiérarchie + signalement facultatif
      [
        "Kenji Sato, CFA, is a portfolio manager in Country M, where trading on material nonpublic information is legal and no law requires anyone to report it. The head of trading at his firm instructs him to buy shares of Lumen Corp. for client accounts on the basis of an unannounced takeover bid that the firm learned about from Lumen's CFO. Sato objects to the compliance officer, who does nothing. Which course of action is most consistent with the Code and Standards?",
        [
          "Place the trades, because the Code and Standards do not prohibit an activity that the local law of Country M explicitly permits.",
          "Refuse to place the trades and dissociate from the activity; reporting it to the regulator or CFA Institute is encouraged but not required.",
          "Place the trades but report the matter to CFA Institute, since reporting the violation satisfies his obligations under Standard I(A).",
        ],
        1,
        "Première étape : quelle règle appliquer ? La loi du pays M est moins stricte que le Code and Standards, qui interdit d'agir sur une information material nonpublic (Standard II(A)) : il faut appliquer le Code, la règle la plus stricte. Acheter sur la base d'une OPA non annoncée, apprise du CFO, violerait donc II(A), et aussi I(A). Deuxième étape : que faire face à l'instruction de sa hiérarchie ? Après avoir alerté la compliance sans résultat, Sato doit refuser de participer et se dissocier de l'activité ; dénoncer au régulateur ou à CFA Institute est encouragé mais pas exigé par les Standards (et aucune loi locale ne l'impose ici). B est donc correct. A est faux : le Code s'applique dès qu'il est plus strict que la loi locale ; une activité légale peut violer les Standards. C est faux : signaler ne rend pas l'opération acceptable ; I(A) impose d'abord de ne pas participer, alors que le signalement n'est qu'encouragé.",
      ],

      // Concept 2 — I(B) Independence and Objectivity : cadeaux, voyages et avantages (officielle — R91.1 Q75)
      [
        "Luis Rodriguez, CFA, is an analyst at XYZ Investments. He covers a company that is located in a region that is not easily accessible. The company invites analysts for their annual analyst meeting and pays for the transportation to the remote location. Rodriguez is:",
        [
          "allowed to accept the payment for transportation as long as it does not exceed $100.",
          "allowed to accept the payment for transportation because the trip was all business and was out of the way.",
          'not allowed to accept the payment for transportation because this is considered a "perk" and may influence his independent judgment.',
        ],
        1,
        "Standard I(B) : en principe, l'analyste paie lui-même son voyage pour visiter une société, afin de préserver son indépendance. L'exception vaut quand le site n'est pas accessible par des moyens normaux (vols commerciaux) : la société peut alors prendre le transport en charge, si le déplacement est purement professionnel. B est donc correct. A est faux : le Standard ne fixe aucun plafond chiffré comme 100 $ ; la question est de savoir si l'avantage peut raisonnablement compromettre l'indépendance. C est faux : un transport imposé par l'isolement du site, pour un voyage d'affaires, n'est pas un avantage de confort de nature à influencer le jugement.",
      ],
      // Variante angle différent — comparaison selon la source de l'avantage : client (performance passée), broker, allocation d'IPO
      [
        "Under Standard I(B) Independence and Objectivity, which of the following is most likely acceptable for a portfolio manager?",
        [
          "Accepting a gift from a long-standing client in appreciation of last year's results, after disclosing it to her employer.",
          "Accepting from a broker that executes her clients' trades an all-expenses-paid weekend at a luxury resort, provided she discloses it to her employer.",
          "Accepting, for her personal account, shares in an oversubscribed IPO that a broker offers her in the hope of receiving more of her clients' trading business.",
        ],
        0,
        "Standard I(B) interdit d'offrir, de solliciter ou d'accepter un avantage qui pourrait raisonnablement compromettre son indépendance ou son objectivité. La source compte : un cadeau d'un client pour une performance déjà réalisée a peu de chances d'influencer la gestion, puisqu'il ne dépend pas des décisions à venir ; il est acceptable s'il est déclaré à l'employeur (avant de l'accepter si possible, sinon après). A est donc correct. B est faux : un week-end de luxe offert par un broker qui reçoit les ordres des clients n'est pas un cadeau token ; il peut influencer le choix du broker au détriment de la best execution, et le déclarer à l'employeur ne suffit pas à le rendre acceptable. C est faux : une allocation d'IPO sursouscrite pour son compte personnel, offerte pour obtenir plus d'ordres, est un avantage de valeur qui compromet l'indépendance (et fait passer le gérant avant ses clients, voir III(B) Fair Dealing).",
      ],
      // Variante plus difficile — trois situations : issuer-paid research au flat fee, jet privé + week-end de luxe payés par la société, note relevée sous la pression de l'investment banking
      [
        "Elif Demir, CFA, is an equity analyst. (1) She writes a research report paid for by the company it covers, for a flat fee agreed before she started the work and unrelated to her conclusions, and the report discloses the arrangement. (2) To visit the company's headquarters, which is served by several daily commercial flights, she travels on the company's private jet and then spends a weekend at a luxury resort, both paid for by the company. (3) After the investment banking department complains that her 'hold' rating is hurting a deal, she upgrades the stock to 'buy' although her analysis has not changed. Which of these actions violate Standard I(B)?",
        ["(2) only.", "(1), (2) and (3).", "(2) and (3) only."],
        2,
        "(1) n'est pas une violation : l'issuer-paid research est acceptable si la rémunération est un flat fee fixé à l'avance, indépendant des conclusions, et si l'arrangement est disclosed. (2) est une violation : un week-end dans un resort de luxe payé par la société suivie dépasse de loin le cadeau token et peut raisonnablement compromettre son indépendance. Le jet privé n'arrange rien : la pratique recommandée (une recommandation, pas une règle absolue) est de payer son propre voyage et de n'utiliser l'avion de la société que s'il n'existe pas de vol commercial. (3) est une violation : modifier une recommandation sous la pression de l'investment banking, sans changement d'analyse, est exactement ce que I(B) interdit. C est donc correct. A est faux : il oublie la pression de l'investment banking, qui viole I(B) même si l'analyste ne reçoit rien directement. B est faux : il traite l'issuer-paid research comme interdite par nature, alors qu'elle est permise dans ces conditions.",
      ],

      // Concept 3 — I(D) Misconduct : conduite professionnelle vs civil disobedience (officielle — R91.2 Q11)
      [
        "Which of the following least likely violates the Standard concerning misconduct? Roland Lawson, a financial analyst:",
        [
          "drinks excessively during business meetings with clients and returns to work under the influence of alcohol.",
          "is arrested for participating in a nonviolent protest.",
          "committed perjury in connection with a lawsuit against his firm.",
        ],
        1,
        "Standard I(D) Misconduct vise la dishonesty, la fraude et la tromperie dans l'activité professionnelle, ainsi que tout acte qui nuit à la réputation, à l'intégrité ou à la compétence professionnelles. La civil disobedience (être arrêté lors d'une manifestation non violente pour défendre ses convictions) n'est en général pas une violation. B est donc la réponse demandée. A est faux : boire à l'excès en rendez-vous client puis revenir au bureau sous l'emprise de l'alcool nuit à sa compétence et à sa réputation professionnelles. C est faux : un parjure est un acte de malhonnêteté, ce qui viole le Standard.",
      ],
      // Variante angle différent — cas limite : la faillite personnelle n'est pas une faute, la fraude qui l'accompagne si
      [
        "Which of the following is most likely a violation of Standard I(D) Misconduct?",
        [
          "Filing for personal bankruptcy after a costly divorce.",
          "Being arrested once during a peaceful demonstration for a political cause.",
          "Hiding personal assets from creditors when filing for personal bankruptcy.",
        ],
        2,
        "Standard I(D) vise la dishonesty, la fraude et la tromperie dans l'activité professionnelle, et tout acte, même dans la vie privée, qui met en cause l'honnêteté, la fiabilité ou la compétence professionnelle. Une faillite personnelle n'est pas en soi une violation ; elle le devient si elle s'accompagne de fraude ou de tromperie, comme dissimuler des actifs à ses créanciers. C est donc correct. A est faux : faire faillite après un divorce coûteux est un revers financier, pas un acte malhonnête. B est faux : la civil disobedience (une arrestation lors d'une manifestation pacifique) n'est en général pas une violation de I(D).",
      ],
      // Variante plus difficile — trois cas à rattacher au Standard I : alcool au travail (I(D)), plagiat reformulé (I(C)), mauvaise performance (I(E))
      [
        "Consider three situations. (1) After several drinks at a client lunch, a portfolio manager returns to the office and enters client orders, several of them with errors. (2) An analyst copies a competitor's industry analysis into her own report without citing it, after rewording a few sentences. (3) An analyst's recommendations have underperformed the market for two consecutive years, although his research process is thorough and consistent with his firm's standards. Which situations involve a violation of Standard I Professionalism?",
        ["(1) and (2) only.", "(1) only.", "(1), (2) and (3)."],
        0,
        "(1) viole I(D) Misconduct : revenir au bureau sous l'emprise de l'alcool et passer des ordres clients nuit à sa compétence et à sa réputation professionnelles. (2) viole I(C) Misrepresentation : reprendre l'analyse d'un autre sans la citer, même reformulée ou résumée, est du plagiat (seules les données factuelles d'une source reconnue, comme le Treasury ou S&P, peuvent être utilisées sans citation). (3) ne viole pas I(E) Competence : une mauvaise performance n'est pas de l'incompétence quand le travail de recherche est sérieux et conforme aux standards de la firme. A est donc correct. B est faux : il oublie que le plagiat relève aussi du Standard I (I(C)), même si l'analyste ne ment sur aucun chiffre. C est faux : il confond résultats décevants et manque de compétence.",
      ],

      // Concept 4 — II(A) Material Nonpublic Information : mosaic theory (officielle — R91.3 Q15)
      [
        "An analyst is allowed to trade on information that he has predicted, such as a corporate action or event, using perceptive assembly and analysis of public information and nonmaterial nonpublic information. This is called the:",
        ["deduction theory.", "assessment theory.", "mosaic theory."],
        2,
        "Selon la mosaic theory, un analyste peut agir sur une conclusion tirée de l'assemblage d'informations publiques et d'informations nonpublic mais non material, même si cette conclusion aurait été material si la société l'avait annoncée : Standard II(A) n'est pas violé. C est donc correct. A et B sont faux : « deduction theory » et « assessment theory » ne sont pas des notions des Standards ; ce sont des distracteurs.",
      ],
      // Variante angle différent — question inversée : quand la mosaic theory NE protège PAS (une pièce material nonpublic)
      [
        "In which of the following cases would the mosaic theory least likely protect an analyst who trades on her conclusion?",
        [
          "She concludes that a retailer's sales are weak by combining public financial statements with her own count of cars in the retailer's store parking lots.",
          "She concludes that a manufacturer will cut its dividend by combining public industry data with nonmaterial details from a supplier about routine delivery schedules.",
          "She concludes that a company will miss its earnings forecast by combining public data with a private remark from the company's CFO that quarterly sales fell sharply.",
        ],
        2,
        "La mosaic theory protège une conclusion tirée d'informations publiques et d'informations nonpublic mais non material, même si cette conclusion serait material si la société l'annonçait. Elle ne protège plus rien dès qu'une pièce de la mosaïque est elle-même material nonpublic. La remarque privée du CFO sur une forte baisse des ventes est material (elle affecterait le cours) et nonpublic (communiquée en privé) : trader dessus viole II(A). C est donc correct. A est faux : compter les voitures sur les parkings est une recherche personnelle fondée sur des observations accessibles à tous ; combinée aux comptes publiés, elle reste dans la mosaic theory. B est faux : des détails non material d'un fournisseur sur des livraisons de routine, ajoutés à des données publiques, forment une mosaïque légitime, même si la conclusion (baisse du dividende) est importante.",
      ],
      // Variante plus difficile — selective disclosure : options au lieu des actions, tuyau à un proche, demande de publication
      [
        "During a conference call open only to a few selected analysts, the CEO of Orvane Inc. says that the company will announce a large asset write-down next week. Analyst Priya Nair, CFA, (1) does not sell Orvane shares but buys Orvane put options for her personal account; (2) tells her brother, who owns Orvane shares, that he should 'think about reducing his position'; and (3) urges Orvane's investor relations team to make the information public immediately. Which of Nair's actions violate Standard II(A)?",
        ["(1) only.", "(1) and (2) only.", "(1), (2) and (3)."],
        1,
        "L'information est material (une dépréciation importante affectera le cours) et nonpublic : la communiquer à quelques analystes lors d'un call restreint (selective disclosure) ne la rend pas publique. II(A) interdit d'agir sur cette information ou de faire agir d'autres personnes. (1) est une violation : passer par des options plutôt que par les actions ne change rien, le Standard couvre aussi les dérivés. (2) est une violation : suggérer à son frère de réduire sa position revient à faire agir quelqu'un d'autre sur l'information, même sans la révéler en détail. (3) n'est pas une violation : pousser la société à rendre l'information publique est précisément la réaction recommandée. B est donc correct. A est faux : il oublie que transmettre l'information, ou un conseil fondé sur elle, à un proche est aussi interdit. C est faux : demander la publication de l'information ne viole rien.",
      ],

      // Concept 5 — II(B) Market Manipulation : intention de tromper (officielle — R91.3 Q22)
      [
        "All of the following are violations of Standard II(B) Market Manipulation EXCEPT:",
        [
          "disseminating misleading information about the development of new products and technologies.",
          "exploiting differences in market inefficiencies.",
          "securing a controlling interest in an equity security in order to influence the price of a related derivative instrument.",
        ],
        1,
        "Standard II(B) interdit les pratiques qui faussent les prix ou gonflent artificiellement les volumes avec l'intention de tromper les participants au marché. Il ne vise pas les stratégies de trading légitimes qui exploitent les inefficiences du marché (arbitrage, par exemple). B est donc la réponse demandée. A est faux : diffuser des informations trompeuses sur de nouveaux produits est une manipulation information-based. C est faux : prendre le contrôle d'un titre pour influencer le prix d'un dérivé lié est une manipulation transaction-based.",
      ],
      // Variante angle différent — le « pourquoi » : l'effet sur le prix ne suffit pas, seule l'intention de tromper compte
      [
        "To rebalance a client's portfolio, a trader buys a large block of a thinly traded stock, and the stock's price rises 4% that day. The trader had no intention of influencing the price. Which statement is most accurate under Standard II(B) Market Manipulation?",
        [
          "There is no violation, because the trade had a legitimate purpose and was not intended to mislead market participants.",
          "This is transaction-based manipulation, because the large trade moved the stock's price significantly in a single day.",
          "This is a violation only if the resulting price change persists for more than one trading day after the trade.",
        ],
        0,
        "Standard II(B) interdit les pratiques qui faussent les prix ou gonflent artificiellement les volumes avec l'intention de tromper les participants au marché. Pour ce Standard, l'intention fait partie de la définition : une transaction légitime (rééquilibrage, liquidité, fiscalité, arbitrage) qui fait bouger le prix n'est pas une manipulation. A est donc correct. B est faux : l'effet sur le prix ne suffit pas ; la transaction-based manipulation suppose des transactions destinées à tromper (wash trades, faux volume, squeeze). C est faux : le Standard ne fixe aucun critère de durée ; c'est l'intention de tromper qui compte, pas la persistance de l'effet.",
      ],
      // Variante plus difficile — classer trois actions : pump and dump, wash trading, arbitrage légitime
      [
        "Consider three actions. (1) A trader buys shares of a small company, posts anonymous online messages exaggerating the size of a contract the company is negotiating, and sells as the price rises. (2) A fund manager trades the same bond back and forth between two accounts she controls to create the appearance of heavy trading before a new issue. (3) An arbitrageur buys a company's depositary receipts and sells its locally listed shares to profit from a temporary price gap between them. Which classification is most accurate?",
        [
          "(1) information-based manipulation; (2) transaction-based manipulation; (3) no violation.",
          "(1) transaction-based manipulation; (2) information-based manipulation; (3) no violation.",
          "(1) information-based manipulation; (2) no violation, because no false information was spread; (3) transaction-based manipulation.",
        ],
        0,
        "(1) est un pump and dump : diffuser des informations fausses ou trompeuses pour faire monter le cours puis vendre est une manipulation information-based. (2) est du wash trading : des opérations entre comptes contrôlés par la même personne créent un faux volume ; c'est une manipulation transaction-based, même sans aucune fausse déclaration. (3) est un arbitrage légitime qui exploite une inefficience de marché sans intention de tromper : pas de violation. A est donc correct. B est faux : il inverse les deux catégories (la rumeur relève de l'information, le faux volume des transactions). C est faux : une manipulation peut passer uniquement par des transactions, et l'arbitrage, qui exploite une inefficience sans tromper personne, n'en est pas une.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Ethical and Professional Standards Page 2...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
