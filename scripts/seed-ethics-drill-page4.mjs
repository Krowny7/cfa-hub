// Seed script — quiz de "drill" associé à la page 4 de la fiche PDF Ethical and
// Professional Standards (Standards V, VI & VII · Analysis, Conflicts, CFA,
// Reading 91, 3e partie). La banque de pratique numérote ces Standards en
// Readings 91.1 à 91.9 (même numérotation que la fiche, pas de décalage).
// Structure : pour chacun des 5 concepts clés de la page, 1 question officielle
// (banque de pratique Ethics, corrigé vérifié contre "- Answers.pdf") + 1
// variante "angle différent" (même notion, mais jamais un simple changement de
// chiffres menant au même raisonnement) + 1 variante "plus difficile"
// (raisonnement à plusieurs étapes / pièges combinés / notion connexe de la
// page). Voir memory regle-drill-variantes-cfa-hub. Questions en anglais,
// explications en français.
// Les 5 questions officielles ne sont PAS celles imprimées dans le PDF
// (R91.7 Q10 et Q24, R91.8 Q32 et Q20, R91.9 Q18) : l'utilisateur les a déjà
// sur papier.
// Usage: node scripts/seed-ethics-drill-page4.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Ethical and Professional Standards (Système)";

const QUIZ_SETS = [
  {
    title: "Ethical and Professional Standards — Drill Fiche Page 4 (Standards V, VI & VII · Analysis, Conflicts, CFA)",
    difficulty: 1,
    questions: [
      // Concept 1 — V(B) Communication with Clients : process d'investissement, changements, risques, fait vs opinion (officielle — R91.1 Q67)
      [
        "The Konkol Company implements a new methodology for portfolio valuation that is licensed to them by ABC Statistics. To comply with the Code and standards, Konkol should:",
        [
          "not discuss the new methodology with clients because doing so would fail to preserve ABC's confidentiality.",
          "discuss the new methodology only with clients whose security selection process will change as a result.",
          "discuss the new methodology with its clients.",
        ],
        2,
        "Standard V(B) Communication with Clients and Prospective Clients impose d'informer clients et prospects des principes du process d'investissement et, rapidement, de leurs changements importants. Une nouvelle méthode de valorisation du portefeuille en fait partie : C est donc correct. A est faux : rien n'indique que la méthode soit confidentielle, et la licence ne dispense pas du devoir d'information (on peut décrire les principes d'une méthode sans en livrer le détail propriétaire). B est faux : le changement de méthode concerne tous les clients dont le portefeuille est valorisé ainsi, pas seulement ceux dont la sélection de titres change.",
      ],
      // Variante angle différent — ce que V(B) N'EXIGE PAS : jugement raisonnable sur les facteurs importants
      [
        "Under Standard V(B) Communication with Clients and Prospective Clients, which of the following is a member least likely required to communicate to clients?",
        [
          "Every factor, however minor, that she considered in reaching her investment recommendation.",
          "The nature of the services provided and their costs, including costs charged by third parties.",
          "The significant limitations and risks of the recommended investment, such as liquidity or capacity constraints.",
        ],
        0,
        "V(B) demande d'utiliser un jugement raisonnable pour identifier les facteurs importants d'une décision ou d'une recommandation et de les communiquer ; il n'exige pas de lister tous les facteurs, même mineurs, ce qui noierait le client sous des détails inutiles. A est donc la réponse demandée. B est faux : informer sur la nature des services et sur leurs coûts, y compris ceux facturés par des tiers, fait partie des exigences (sans forcément donner chaque montant exact). C est faux : les limites et risques importants de l'investissement (liquidité, capacity, risques propres à un produit structuré) doivent aussi être communiqués. Les autres exigences de V(B) : principes du process et leurs changements importants, distinction entre faits et opinions, sur tous les canaux.",
      ],
      // Variante plus difficile — trois communications : projection présentée comme un fait, capacity, scénarios favorables seulement au téléphone
      [
        "Hana Ito, CFA, manages a small-cap equity strategy. (1) In her monthly client letter, she writes: 'Northfield's earnings will rise 25% next year, so the stock will reach $60,' a figure produced by her firm's earnings model. (2) In the same letter, she informs clients that the strategy's assets are approaching the level beyond which its trades would move market prices, and that the firm may therefore close it to new investors. (3) She presents a recommended structured note to clients by phone, describing only the scenarios in which it pays off well, without mentioning how it would perform if the market fell. Which of these actions violate Standard V(B)?",
        ["Action 1 only.", "Actions 1 and 3.", "Actions 1, 2 and 3."],
        1,
        "Action 1 : un résultat de modèle est une projection, donc une opinion ; l'écrire comme une certitude (« will rise », « will reach ») sans le présenter comme une prévision viole l'obligation de distinguer fait et opinion. Action 2 : prévenir les clients que la stratégie approche de sa capacity (taille au-delà de laquelle ses ordres feraient bouger les prix) est exactement ce que V(B) demande, puisqu'il faut communiquer les limites importantes d'une stratégie : pas de violation. Action 3 : V(B) s'applique à tous les canaux, oral compris ; il faut présenter les risques et plusieurs scénarios, y compris défavorables, et les gains comme les pertes en total return. Ne décrire que les cas favorables d'un produit structuré est une violation. B (actions 1 et 3) est donc correct. A est faux : il oublie que la communication téléphonique est couverte et que les risques doivent être présentés. C est faux : signaler une limite de capacity n'est pas une violation, c'est une bonne communication.",
      ],

      // Concept 2 — VI(B) Priority of Transactions : clients > employeur > member, procédures de la firme (officielle — R91.8 Q10)
      [
        "Recommended procedures to comply with the Standard concerning priority of transactions are least likely to include:",
        [
          "blackout periods.",
          "disclosure to clients of the firm's policies in regard to personal investing.",
          "limited front-running by employees.",
        ],
        2,
        "Standard VI(B) Priority of Transactions : le front running (passer ses ordres avant ceux des clients pour profiter de leur effet) doit être totalement interdit, pas seulement limité. C est donc la réponse demandée. A est faux : les blackout periods font partie des procédures recommandées, avec la preclearance, les duplicate confirmations, la déclaration des positions et les limites sur la participation aux IPO et aux private placements. B est faux : communiquer aux clients la politique de trading personnel de la firme (au moins sur demande) est aussi recommandé.",
      ],
      // Variante angle différent — cas limite : trade personnel contraire à la recommandation, sans client lésé
      [
        "Laura Chen, CFA, a portfolio manager, needs cash for a house purchase and sells shares of Orion Corp. from her personal account. Her firm currently rates Orion a 'buy', her clients continue to hold the stock, and no client or firm orders in Orion are pending. With respect to Standard VI(B) Priority of Transactions, Chen's sale is most likely:",
        [
          "not a violation, because no client or employer transaction is disadvantaged by her sale.",
          "a violation, because a member's personal trades must never go against the firm's current recommendation.",
          "a violation unless she first sells Orion for all of her clients.",
        ],
        0,
        "VI(B) fixe un ordre de priorité (clients, puis employeur, puis les comptes dont le membre est beneficial owner) : il interdit de passer devant les clients ou de tirer profit de leurs ordres. Ici aucun ordre de client ou de la firme n'est en attente, et la vente de Chen, motivée par un besoin personnel de liquidités, ne prive aucun client d'une opportunité ni ne dégrade ses prix d'exécution. Un trade personnel contraire à la recommandation est donc permis si personne n'est lésé : A est correct. B est faux : aucune règle n'impose d'aligner ses trades personnels sur la recommandation de la firme ; ce qui compte, c'est la priorité des clients. C est faux : vendre pour les clients irait contre la recommandation « buy » et contre leur intérêt ; le Standard n'impose rien de tel.",
      ],
      // Variante plus difficile — trois actions : tuyau à un proche, IPO après service complet des clients avec preclearance, achat après diffusion
      [
        "Marta Ruiz, CFA, a research analyst, is about to upgrade Delta Corp. from 'hold' to 'buy'. (1) The evening before the report is released, she mentions the upgrade to her brother, who is not a client of the firm; he buys Delta shares the next morning, before clients receive the report. (2) Her firm requires preclearance of personal participation in IPOs; after all client orders for a heavily demanded IPO have been filled in full, Ruiz obtains preclearance and buys some of the remaining shares for her personal account. (3) Two days after the upgrade has been distributed to all clients and their orders have been executed, she buys Delta shares for her own account. Which of these actions violate Standard VI(B) Priority of Transactions?",
        ["Action 1 only.", "Actions 1 and 2.", "Actions 1 and 3."],
        0,
        "Action 1 : prévenir un proche d'un changement de recommandation pour qu'il achète avant les clients revient à faire du front running par personne interposée ; VI(B) l'interdit (et l'information sur une recommandation pas encore publiée ne doit pas sortir de la firme). Action 2 : la participation personnelle à une IPO n'est pas interdite en soi ; la firme doit la limiter et la soumettre à preclearance. Ruiz a obtenu la preclearance et n'a acheté qu'après que la demande des clients a été entièrement servie : les clients n'ont pas été lésés (c'est aussi ce qu'exige le fair dealing pour les « hot issues »). Action 3 : acheter après que les clients ont reçu la recommandation et ont eu une chance adéquate d'agir respecte l'ordre de priorité. A (action 1 seulement) est donc correct. B est faux : il confond « IPO soumise à preclearance après service complet des clients » avec une interdiction absolue. C est faux : trader dans le même sens que la recommandation n'est pas interdit une fois que les clients ont pu agir.",
      ],

      // Concept 3 — VI(C) Referral Fees : disclosure avant l'entrée en relation (officielle — R91.8 Q1)
      [
        "Which of the following statements is most accurate about the Standard concerning referral fees?",
        [
          "Referral fees may be disclosed before or after proceeding with an agreement for service.",
          "Referral fees must be disclosed after proceeding with an agreement for service.",
          "Referral fees must be disclosed before proceeding with an agreement for service.",
        ],
        2,
        "Standard VI(C) Referral Fees : toute contrepartie reçue ou versée pour une recommandation (argent, services, recherche, cadeaux) doit être divulguée à l'employeur, aux clients et aux prospects avant l'entrée en relation. Le client peut ainsi calculer le coût total du service et juger de l'impartialité de la recommandation. C est donc correct. A et B sont faux : une disclosure après la signature arrive trop tard pour éclairer la décision du client.",
      ],
      // Variante angle différent — le « pourquoi » de la disclosure des referral fees
      [
        "Standard VI(C) Referral Fees requires members to disclose referral arrangements to clients before they enter into a service agreement mainly so that the clients can:",
        [
          "claim part of the referral fee as a discount on the service they are buying.",
          "evaluate the full cost of the service and any partiality behind the recommendation.",
          "check that the referral fee does not exceed the maximum set by local regulators.",
        ],
        1,
        "Une recommandation rémunérée n'est peut-être pas impartiale : le membre peut orienter le client vers le prestataire qui le paie, et la commission peut être répercutée dans le prix. En connaissant l'arrangement avant de s'engager, le client peut évaluer le coût total réel du service et juger lui-même du biais possible de la recommandation. B est donc correct. A est faux : la disclosure ne donne au client aucun droit sur la commission ; elle l'informe. C est faux : le Standard n'est pas lié à un plafond réglementaire ; il porte sur la transparence, quel que soit le montant (y compris pour une contrepartie non monétaire).",
      ],
      // Variante plus difficile — « disclose à qui ? » : cadeau d'un client, referral non monétaire, beneficial ownership via un trust
      [
        "Paul Mercer, CFA, a portfolio manager, faces three situations: (1) a client sends him a case of wine to thank him for last year's strong performance; (2) a broker gives him free access to a paid research service for each client he refers to the broker; (3) through a family trust that he controls, he owns shares of a company that he recommends to his clients. In which situations must Mercer make a disclosure to clients and prospective clients, rather than only to his employer?",
        ["Situation 2 only.", "Situations 1, 2 and 3.", "Situations 2 and 3 only."],
        2,
        "Situation 1 : un cadeau d'un client pour une performance passée ne compromet pas l'indépendance vis-à-vis de ce client ; il suffit de le déclarer à l'employeur (I(B) Independence and Objectivity ; ce n'est pas un additional compensation arrangement IV(B), qui ne vise que les avantages liés à la performance future). Situation 2 : l'accès gratuit à un service de recherche est une contrepartie, même non monétaire, reçue pour des recommandations ; VI(C) exige de la divulguer à l'employeur, aux clients et aux prospects, avant l'entrée en relation. Situation 3 : détenir via un trust qu'il contrôle des titres qu'il recommande, c'est un beneficial ownership qui peut nuire à son objectivité ; VI(A) Avoid or Disclose Conflicts exige une disclosure claire (prominent, en plain language) aux clients, aux prospects et à l'employeur. C (situations 2 et 3) est donc correct. A est faux : il oublie que la détention via un trust est un conflit à divulguer aux clients. B est faux : le cadeau d'un client pour le passé ne demande qu'une disclosure à l'employeur, pas aux autres clients.",
      ],

      // Concept 4 — VII(A) Conduct as Participants in CFA Institute Programs (officielle — R91.9 Q10)
      [
        "Which of the following is least likely a violation of the Standard concerning conduct as participants in CFA Institute programs?",
        [
          "Disregarding the rules related to the administration of the CFA examination.",
          "Expressing opinions in disagreement with CFA Institute advocacy positions.",
          "Improperly using the CFA Designation to further professional goals.",
        ],
        1,
        "Standard VII(A) interdit de compromettre la réputation ou l'intégrité de CFA Institute, de la CFA designation et des examens. Il n'empêche pas de critiquer CFA Institute, ses positions ou ses politiques : exprimer un désaccord est permis. B est donc la réponse demandée. A est faux : enfreindre les règles d'administration de l'examen est une violation. C est faux : utiliser la CFA designation de façon abusive pour servir ses objectifs professionnels est aussi une violation.",
      ],
      // Variante angle différent — autre cas de la catégorie : déclaration mensongère dans le Professional Conduct Statement
      [
        "A CFA charterholder omits from his annual Professional Conduct Statement the fact that a regulator has opened an investigation into his performance reporting. He has most likely violated:",
        [
          "Standard VII(A) Conduct as Participants in CFA Institute Programs.",
          "Standard VII(B) Reference to CFA Institute, the CFA Designation, and the CFA Program.",
          "no Standard, because the investigation has not yet resulted in any finding of wrongdoing.",
        ],
        0,
        "VII(A) ne couvre pas seulement l'examen : il vise toute conduite qui compromet l'intégrité des programmes de CFA Institute, et le Handbook cite expressément le fait de donner des informations fausses ou incomplètes dans le Professional Conduct Statement (PCS) que chaque membre signe chaque année. Le PCS demande justement de déclarer les enquêtes et plaintes en cours : les taire est une violation. A est donc correct. B est faux : VII(B) encadre la façon de se référer à CFA Institute et à la designation (statut de membre, usage de « CFA », promesses de performance), pas la sincérité des déclarations du PCS. C est faux : l'obligation porte sur la déclaration honnête de l'enquête elle-même, quelle qu'en soit l'issue.",
      ],
      // Variante plus difficile — trois comportements : correcteur bénévole, critique publique, non-respect des règles d'examen
      [
        "Consider the following: (1) a charterholder who volunteers as a CFA exam grader tells a friend preparing for Level III which answer layouts graders tend to reward; (2) after the exam, a candidate writes on a public forum that it was the hardest test she has ever taken and that CFA Institute's latest fee increase is unjustified; (3) a candidate keeps writing to finish his last answer after the proctor has announced that time is up. Which of these actions violate Standard VII(A)?",
        ["Action 3 only.", "Actions 1 and 3 only.", "Actions 1, 2 and 3."],
        1,
        "Action 1 : un bénévole (correcteur, rédacteur de questions) ne doit rien révéler du processus de notation ni des questions ; donner à un candidat des indications sur ce que les correcteurs valorisent lui procure un avantage déloyal et compromet l'intégrité de l'examen : violation. Action 2 : dire que l'examen était difficile et critiquer une politique de CFA Institute (ses frais, ses positions) est expressément permis ; aucun contenu de l'examen n'est révélé : pas de violation. Action 3 : continuer à écrire après l'annonce de fin d'épreuve, c'est enfreindre les règles d'administration de l'examen (comme le Candidate Pledge ou les règles sur la calculatrice) : violation. B (actions 1 et 3) est donc correct. A est faux : il oublie que VII(A) s'applique aussi aux membres bénévoles, pas seulement aux candidats. C est faux : la critique de CFA Institute n'est pas une violation.",
      ],

      // Concept 5 — VII(B) Reference to CFA Institute : candidat, designation, membre actif, promotion (officielle — R91.9 Q13)
      [
        "Jason Jones, a stock broker who has completed Level I of the CFA program and is registered for the next Level II CFA exam, may:",
        [
          "not mention that he is involved in the CFA Program until he has passed all three levels.",
          "state that he is a Level II candidate in the CFA Program.",
          "use the Level I CFA designation since he has passed the Level I exam.",
        ],
        1,
        "Standard VII(B) : un candidat inscrit à un examen peut faire état de sa participation au CFA Program, en précisant qu'il est candidat et à quel niveau (« Level II Candidate in the CFA Program »). B est donc correct. A est faux : il n'a pas à attendre la charter pour mentionner sa candidature. C est faux : il n'existe aucune désignation partielle ; « Level I CFA » est interdit. Il peut en revanche dire, factuellement, qu'il a réussi le Level I.",
      ],
      // Variante angle différent — usage correct de la marque « CFA » (adjectif, jamais un nom)
      [
        "Which of the following statements about the use of the CFA designation is most accurate?",
        [
          "Only the abbreviation 'CFA' may follow a charterholder's name; the full title 'Chartered Financial Analyst' is reserved for CFA Institute publications.",
          "A charterholder may print 'CFA' in larger type than her name on her business cards to make the credential stand out.",
          "The CFA designation must always be used as an adjective, as in 'CFA charterholder', and never as a noun, as in 'a CFA'.",
        ],
        2,
        "Les marques « CFA » et « Chartered Financial Analyst » s'emploient toujours comme adjectifs (CFA charterholder, CFA designation, CFA Program), jamais comme des noms : on n'écrit pas « he is a CFA ». C est donc correct. A est faux : « Jane Smith, CFA » comme « Jane Smith, Chartered Financial Analyst » sont des usages corrects pour un membre actif. B est faux : la designation ne doit pas être mise en avant plus que le nom (pas de taille ou de police plus grande), sous peine d'en exagérer la portée. Rappel : seul un membre actif (cotisation payée et PCS signé chaque année) peut utiliser la designation.",
      ],
      // Variante plus difficile — plaquette commerciale : faits, promesse de performance, membre inactif, faux candidat
      [
        "A brochure for Crestline Advisors contains the following statements: (1) 'All three of our portfolio managers passed the three levels of the CFA exam on their first attempt.' (2) 'Because our managers are CFA charterholders, our clients can expect better returns than with managers who are not.' (3) 'Dana Moss, CFA' — Moss has neither paid her CFA Institute dues nor signed her Professional Conduct Statement this year. (4) 'Eric Lund, Level II Candidate in the CFA Program' — Lund passed Level I last year but has not registered for the Level II exam. Which statements violate Standard VII(B)?",
        ["Statements 2, 3 and 4 only.", "Statements 2 and 3 only.", "All four statements."],
        0,
        "Énoncé 1 : réussir les trois niveaux du premier coup est un fait vérifiable ; le dire est permis tant que c'est exact : pas de violation. Énoncé 2 : laisser entendre que la charter garantit une meilleure performance ou une compétence supérieure exagère la portée de la designation : violation. Énoncé 3 : pour utiliser « CFA », il faut être membre actif, c'est-à-dire payer la cotisation et signer le PCS chaque année ; Moss ne l'est plus : violation. Énoncé 4 : le statut de candidat suppose d'être inscrit à un examen ; Lund ne l'est pas, il peut seulement dire qu'il a réussi le Level I : violation. A (énoncés 2, 3 et 4) est donc correct. B est faux : il oublie que le statut de candidat exige une inscription en cours. C est faux : l'énoncé 1, factuel, est autorisé.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Ethical and Professional Standards Page 4...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
