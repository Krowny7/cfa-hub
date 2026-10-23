// Seed script — quiz de "drill" associé à la page 3 de la fiche PDF Ethical and
// Professional Standards (Standards III & IV · Duties to Clients, Employers,
// Reading 91, 2e partie). La banque de pratique numérote ces Standards en
// Readings 91.4 à 91.6 (même numérotation que la fiche, pas de décalage).
// Structure : pour chacun des 5 concepts clés de la page, 1 question officielle
// (banque de pratique Ethics, corrigé vérifié contre "- Answers.pdf") + 1
// variante "angle différent" (même notion, mais jamais un simple changement de
// chiffres menant au même raisonnement) + 1 variante "plus difficile"
// (raisonnement à plusieurs étapes / pièges combinés / notion connexe de la
// page). Voir memory regle-drill-variantes-cfa-hub. Questions en anglais,
// explications en français.
// Les 5 questions officielles ne sont PAS celles imprimées dans le PDF
// (R91.4 Q5, R91.1 Q45, R91.5 Q4, R91.6 Q53 et Q7) : l'utilisateur les a déjà
// sur papier.
// Usage: node scripts/seed-ethics-drill-page3.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Ethical and Professional Standards (Système)";

const QUIZ_SETS = [
  {
    title: "Ethical and Professional Standards — Drill Fiche Page 3 (Standards III & IV · Duties to Clients, Employers)",
    difficulty: 1,
    questions: [
      // Concept 1 — III(A) Loyalty, Prudence and Care : proxies, brokerage, relevés (officielle — R91.4 Q22)
      [
        "In accordance with Standard III (A) Loyalty, Prudence and Care, which of the following statements is NOT a required or recommended action?",
        [
          "Utilize client brokerage to the sole benefit of the client.",
          "Submit to clients, at least quarterly, itemized statements detailing all of the period's transactions.",
          "Vote all proxies on behalf of clients in a responsible manner.",
        ],
        2,
        "Voter les proxies coûte du temps et de l'argent : Standard III(A) demande un vote informé et responsable, mais une analyse coût-bénéfice peut conduire à ne pas toutes les voter. Voter toutes les proxies n'est donc ni requis ni recommandé : C est la réponse demandée. A est faux : le brokerage (soft dollars) est un actif du client et doit servir uniquement ses intérêts ; c'est requis. B est faux : envoyer au moins chaque trimestre un relevé détaillé des transactions est une best practice recommandée.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : pas d'opt-out du devoir de loyauté, soft dollars, prudence au niveau du portefeuille total
      [
        "Which of the following statements about Standard III(A) Loyalty, Prudence, and Care is least accurate?",
        [
          "Client brokerage is an asset of the client and should be used to buy products or services that directly benefit that client.",
          "The prudence of an investment should be judged in the context of the client's total portfolio rather than in isolation.",
          "A client can waive the duty of loyalty by signing an agreement allowing the manager to put the firm's interests ahead of the client's.",
        ],
        2,
        "C est l'affirmation inexacte, donc la réponse demandée : on peut préciser et annoncer les limites de sa mission, mais on ne peut pas sortir des Standards (pas d'opt-out) ; dans le cadre de la relation, les intérêts du client passent avant ceux de l'employeur et les siens, même si le client signe un accord contraire. A est exact : le brokerage (soft dollars) appartient au client et doit servir ses intérêts, avec l'objectif de best execution. B est exact : la prudence s'apprécie au niveau du portefeuille total du client, pas titre par titre.",
      ],
      // Variante plus difficile — trois pratiques : politique de vote coût-bénéfice, commissions qui financent la firme, frais de prospection refacturés
      [
        "Lena Brandt, CFA, manages separate accounts for individual clients. (1) After a cost-benefit analysis, she votes proxies only on issues that could materially affect the value of her clients' holdings, and she discloses this proxy policy to clients. (2) She directs client trades to a broker that charges above-market commissions because the broker pays her firm's office rent and marketing software. (3) She bills each client a share of the cost of a conference she attended to look for new clients. Which of her practices are consistent with Standard III(A)?",
        ["(1) only.", "(1) and (2) only.", "(1) and (3) only."],
        0,
        "(1) est conforme : III(A) demande un vote des proxies informé et responsable, pas de voter toutes les proxies ; une analyse coût-bénéfice peut conduire à ne voter que les questions importantes, et la politique de vote doit être communiquée aux clients. (2) n'est pas conforme : le brokerage est un actif du client ; payer des commissions supérieures au marché pour financer le loyer et le marketing de la firme sert la firme, pas le client, et sacrifie la best execution. (3) n'est pas conforme : on ne refacture à un client que les frais engagés pour le servir ; une conférence de prospection sert à attirer de nouveaux clients, pas à gérer ces comptes. A est donc correct. B est faux : il traite les commissions des clients comme un actif de la firme. C est faux : il accepte de faire payer aux clients des frais qui ne leur profitent pas.",
      ],

      // Concept 2 — III(C) Suitability : évaluer chaque client avant de changer sa politique (officielle — R91.5 Q5)
      [
        "Bob Hatfield, CFA, has his own money management firm with two clients. The accounts of the two clients are equal in value. One of the clients gets married and the assets of the new spouse and the client are combined. With the larger portfolio of the now married client, Hatfield determines that they can assume a higher level of risk and begins a change in the policy concerning that portfolio. Which of the following would violate Standard III(C), Suitability?",
        [
          "Assess the time horizon of the newly married client and his spouse.",
          "Implement a similar policy for the other client who did not just get married.",
          "Assess the return objectives of the newly married client and his spouse.",
        ],
        1,
        "Standard III(C) Suitability impose, avant de modifier une politique d'investissement, d'évaluer la situation de chaque client (horizon, objectifs de rendement, tolérance au risque, fiscalité, liquidité) et de mettre son IPS à jour. Appliquer la nouvelle politique à l'autre client sans avoir réévalué sa propre situation est une violation : B est donc correct. A et C sont faux : évaluer l'horizon et les objectifs de rendement du couple est précisément ce que le Standard exige.",
      ],
      // Variante angle différent — cas limite : ordre non sollicité inadapté mais de faible impact
      [
        "A client whose investment policy statement calls for conservative, income-oriented investments asks his adviser to buy a speculative biotech stock. The position would represent about 2% of the portfolio. Under Standard III(C) Suitability, the adviser should most appropriately:",
        [
          "refuse to place the order, because the trade is clearly inconsistent with the client's investment policy statement.",
          "place the order without discussing it, because the client initiated the trade and is responsible for the decision.",
          "explain why the trade is unsuitable, follow the firm's policy, and have the client acknowledge the discussion.",
        ],
        2,
        "Pour un ordre non sollicité inadapté, tout dépend de son impact sur le portefeuille. Ici la position (2 %) a un impact faible : le conseiller doit expliquer au client en quoi l'opération ne correspond pas à son profil, puis suivre la politique de la firme ; quelle que soit cette politique, le client doit reconnaître (acknowledge) la discussion et comprendre pourquoi l'opération est inadaptée. C est donc correct. A est faux : le Standard ne demande pas de refuser l'ordre du client ; il demande d'en discuter. B est faux : exécuter sans rien dire est l'autre piège ; même si le client est à l'origine de l'ordre, le conseiller doit lui signaler que l'opération est inadaptée. Si l'impact était matériel, il faudrait proposer de mettre à jour l'IPS ou d'ouvrir un compte séparé dirigé par le client.",
      ],
      // Variante plus difficile — trois cas : fonds à mandat, ordre non sollicité à impact matériel, nouveau client investi « comme son frère »
      [
        "Consider three situations. (1) The manager of a small-cap equity index fund declines to add large-cap dividend stocks, even though some of the fund's investors are retirees who would benefit from a more stable portfolio. (2) A client asks an adviser to invest 40% of his portfolio in a single speculative stock; the adviser explains why this is unsuitable and proposes updating the investment policy statement, and when the client refuses, offers to open a separate client-directed account for the trade. (3) A new client tells an adviser that his financial situation is 'about the same as my brother's,' so the adviser, who already manages the brother's account, invests the new client's assets in an identical portfolio without further inquiry. Which situations are consistent with Standard III(C)?",
        ["(1) only.", "(2) only.", "(1) and (2) only."],
        2,
        "(1) est conforme : quand on gère un fonds selon un mandat (indice, style), la suitability s'apprécie par rapport au mandat du fonds, pas au profil de chaque porteur ; ajouter des grandes capitalisations violerait le mandat. (2) est conforme : pour un ordre non sollicité à impact matériel (40 % du portefeuille), la démarche est d'expliquer, de proposer une mise à jour de l'IPS puis, si le client refuse, d'ouvrir un compte séparé dirigé par le client (ou, à défaut, de revoir la relation). (3) est une violation : III(C) exige une enquête sur la situation propre du nouveau client (expérience, objectifs, horizon, contraintes) avant d'investir ; un profil « proche » de celui de son frère ne dispense pas de cette enquête. C est donc correct. A est faux : il juge à tort l'opération (2) contraire au Standard, alors que la procédure suivie est exactement celle qui est attendue. B est faux : il applique au fonds indiciel le profil de chaque porteur au lieu du mandat.",
      ],

      // Concept 3 — III(E) Preservation of Confidentiality : exceptions (officielle — R91.5 Q18)
      [
        "A candidate or member is least likely violating the Standard regarding the confidentiality of client information if he shares confidential client information, when not required by law, with:",
        ["the CFA Institute Professional Conduct Program.", "the client's attorney.", "the co-owner of the client's account."],
        0,
        "Standard III(E) Preservation of Confidentiality : les informations des clients actuels, anciens et prospects restent confidentielles, sauf activité illégale du client, obligation légale ou autorisation du client. Coopérer avec une enquête du Professional Conduct Program n'est pas une violation, car le PCP garde lui-même ces informations confidentielles. A est donc correct. B et C sont faux : sans autorisation expresse du client ni obligation légale, transmettre ses informations à une personne extérieure, même son avocat ou le cotitulaire du compte, est une violation.",
      ],
      // Variante angle différent — autre exception : activité illégale du client, à signaler aux autorités et à personne d'autre
      [
        "While reviewing a client's account, Omar Haddad, CFA, finds strong evidence that the client is using it to launder money. No law in his jurisdiction requires him to report it. Under Standard III(E) Preservation of Confidentiality, Haddad:",
        [
          "may not disclose the information to anyone, because client information must remain confidential in all circumstances.",
          "may disclose the information to the appropriate authorities without violating the Standard.",
          "should warn the client's business partners, who are likely to be harmed by the client's activities.",
        ],
        1,
        "III(E) protège les informations des clients actuels, anciens et prospects, mais prévoit trois exceptions : l'information concerne une activité illégale du client, la loi impose la divulgation, ou le client l'autorise. Le blanchiment est une activité illégale : Haddad peut la signaler aux autorités compétentes (idéalement après avoir consulté la compliance de sa firme) sans violer le Standard. B est donc correct. A est faux : la confidentialité n'est pas absolue ; l'activité illégale du client est précisément une exception. C est faux : l'exception autorise à informer les autorités, pas des tiers privés ; prévenir les associés du client serait une violation de la confidentialité.",
      ],
      // Variante plus difficile — quatre partages d'information : anciens clients, collègue qui reprend le compte, enquête du PCP, conjoint
      [
        "Isabel Moreno, CFA, (1) tells a prospective client the names and holdings of two of her former clients to show how well she managed their accounts; (2) gives a client's file to a colleague in her firm who is taking over the servicing of that client's account; (3) provides a client's records to the CFA Institute Professional Conduct Program, which is investigating a complaint against her; (4) tells her spouse at dinner about the large losses of a well-known client. Which of these actions violate Standard III(E)?",
        ["(1) and (4) only.", "(1), (3) and (4) only.", "(4) only."],
        0,
        "(1) est une violation : le devoir de confidentialité couvre aussi les anciens clients, et révéler leur identité et leurs positions pour démarcher un prospect n'entre dans aucune exception. (2) n'est pas une violation : partager l'information avec les collègues qui servent ce client est permis. (3) n'est pas une violation : coopérer avec une enquête du Professional Conduct Program est autorisé, car le PCP garde lui-même les informations confidentielles. (4) est une violation : un conjoint est un tiers, et une conversation privée n'est pas une exception. A est donc correct. B est faux : il considère à tort la coopération avec le PCP comme une violation. C est faux : il oublie que les anciens clients sont protégés comme les clients actuels.",
      ],

      // Concept 4 — IV(A) Loyalty : activité indépendante et préparation du départ (officielle — R91.6 Q50)
      [
        "A CFA Institute member, undertaking independent practice that could result in compensation or other benefit:",
        [
          "must notify his employer and clients of the types of service to be rendered and the expected compensation.",
          "must notify his employer of the types of service to be rendered, the expected duration, and the expected compensation.",
          "must notify the entities for whom he plans to undertake independent practice of the compensation he receives from his employer.",
        ],
        1,
        "Standard IV(A) Loyalty : avant d'exercer une activité indépendante rémunérée qui peut concurrencer l'employeur, le membre doit l'en informer (nature des services, durée prévue, rémunération attendue) et obtenir son consentement avant de commencer. B est donc correct. A est faux : la notification est due à l'employeur, pas forcément aux clients, et elle doit inclure la durée. C est faux : rien n'oblige à révéler aux clients de l'activité indépendante ce que verse l'employeur.",
      ],
      // Variante angle différent — comparaison de trois comportements : whistleblowing, records emportés, activité concurrente non déclarée
      [
        "Which of the following actions is most likely consistent with Standard IV(A) Loyalty?",
        [
          "Giving the securities regulator, without any personal gain, evidence that her employer is defrauding clients.",
          "Keeping copies of client files on her personal laptop after leaving the firm, because she created the files herself.",
          "Doing paid freelance portfolio work in the evenings, similar to her employer's business, without telling her employer.",
        ],
        0,
        "IV(A) interdit de priver l'employeur de ses compétences, de divulguer ses informations confidentielles ou de lui nuire. Mais le whistleblowing est une exception : révéler des activités illégales ou contraires à l'éthique de l'employeur pour protéger les clients ou l'intégrité du marché, sans en tirer d'avantage personnel, ne viole pas le devoir de loyauté. A est donc correct. B est faux : les records et fichiers créés dans le cadre de l'emploi appartiennent à la firme, même s'ils ont été préparés par le membre ou stockés sur un appareil personnel. C est faux : une activité indépendante rémunérée qui concurrence l'employeur exige de l'informer (nature, durée, rémunération) et d'obtenir son consentement écrit avant de commencer.",
      ],
      // Variante plus difficile — départ pour créer une firme concurrente : préparation hors temps de travail, modèle emporté, clients recontactés de mémoire
      [
        "Paul Gauthier, CFA, plans to leave his firm to start a competing advisory business; he has no noncompete agreement. (1) Before resigning, he incorporates his new company and leases office space, working on it only on weekends. (2) On his last day, he e-mails himself the stock-screening model he built for the firm. (3) After leaving, he contacts former clients whose names he remembers, using public directories to find their phone numbers. Which of these actions violate Standard IV(A)?",
        ["(1) and (2) only.", "(2) only.", "(2) and (3) only."],
        1,
        "(1) n'est pas une violation : préparer son départ (créer sa société, louer des bureaux) est permis tant qu'on le fait en dehors du temps et des ressources de l'employeur et qu'on ne sollicite pas ses clients avant de partir. (2) est une violation : le modèle créé pour la firme est sa propriété, même si Gauthier l'a construit lui-même ; l'emporter sans autorisation viole IV(A). (3) n'est pas une violation : sans clause de non-concurrence, il peut, après son départ, contacter les clients dont il se souvient et utiliser l'expérience acquise, puisque rien n'a été emporté de la firme (il retrouve leurs coordonnées dans des sources publiques). B est donc correct. A est faux : il interdit à tort de préparer son départ en dehors du temps de travail. C est faux : il interdit à tort de contacter, après le départ, des clients retrouvés de mémoire.",
      ],

      // Concept 5 — IV(B) Additional Compensation Arrangements (officielle — R91.6 Q5)
      [
        "Chris Babcock, CFA, a portfolio manager for a large Texas investment firm, has been offered compensation in addition to what her firm pays her. The offer is from one of her clients and the additional compensation will be based on her yearly performance in excess of the market index. Babcock should:",
        [
          "make written disclosure to all parties involved before she accepts this offer.",
          "make written disclosure to her other clients before she accepts this offer.",
          "turn down the offer because it represents a clear conflict between this client and Babcock's other clients.",
        ],
        0,
        "Standard IV(B) Additional Compensation Arrangements : un avantage offert par un client ou un tiers qui peut entrer en conflit avec les intérêts de l'employeur ne peut être accepté qu'avec le consentement écrit de toutes les parties concernées, obtenu avant d'accepter (nature, montant, durée). Un bonus lié à la performance future est exactement ce cas. A est donc correct. B est faux : c'est l'employeur qui doit être informé et donner son accord écrit, pas seulement les autres clients. C est faux : le Standard n'impose pas de refuser ; il impose la disclosure écrite et le consentement préalable.",
      ],
      // Variante angle différent — le « pourquoi » du consentement écrit préalable de l'employeur
      [
        "Standard IV(B) Additional Compensation Arrangements requires a portfolio manager to obtain her employer's written consent before accepting a client's offer of a bonus tied to the account's performance next year. The main reason for this requirement is that the arrangement:",
        [
          "is illegal in most jurisdictions unless the securities regulator has approved the arrangement in advance.",
          "could lead her to favor that client's account, or take more risk in it, at the expense of the firm's other clients.",
          "reduces the management fees that the employer would otherwise earn on that particular client's account.",
        ],
        1,
        "IV(B) vise les avantages, offerts par un client ou un tiers, qui peuvent entrer en conflit avec les intérêts de l'employeur. Un bonus lié à la performance future d'un seul compte incite le gérant à privilégier ce compte (meilleures idées, meilleures allocations) ou à y prendre plus de risque, au détriment des autres clients de la firme et donc de l'employeur. Le consentement écrit préalable, qui précise la nature, le montant et la durée de l'arrangement, permet à l'employeur de juger ce conflit et de surveiller la gestion. B est donc correct. A est faux : de tels arrangements ne sont pas illégaux en soi ; le Standard exige l'accord de l'employeur, pas celui du régulateur. C est faux : le bonus est payé par le client au gérant en plus des frais de la firme ; il ne réduit pas ces frais, le problème est le conflit d'intérêts.",
      ],
      // Variante plus difficile — consentement par e-mail valable, autres clients non concernés, mais arrangement prolongé et augmenté sans nouvel accord
      [
        "Sara Lind, CFA, manages accounts at Ferro Asset Management. A client offers her a bonus equal to 5% of any return his account earns above the S&P 500 over the next year. Lind e-mails her supervisor, describing the nature of the offer, the formula, and its one-year term, and the supervisor replies by e-mail approving it; Lind does not inform her other clients. A year later, the client proposes to extend the arrangement for three more years and to raise the bonus to 10% of the excess return. Lind accepts, considering that her firm already approved the original arrangement. Which statement is most accurate?",
        [
          "Lind violated Standard IV(B) from the start, because an e-mail exchange does not constitute written consent and her other clients also had to consent.",
          "Lind complied with Standard IV(B) throughout, because once the employer has approved an arrangement with a client, later changes do not require new consent.",
          "Lind complied with Standard IV(B) for the first year but violated it by accepting the extended, larger arrangement without obtaining new written consent from her employer.",
        ],
        2,
        "Première année : l'accord écrit de l'employeur, obtenu avant d'accepter et portant sur la nature, le montant (la formule) et la durée de l'arrangement, satisfait IV(B) ; un e-mail suffit comme consentement écrit, et les autres clients n'ont pas à donner leur accord (la partie dont les intérêts sont en jeu est l'employeur). Prolongation : la durée (trois ans de plus) et le montant (10 % au lieu de 5 %) changent, alors que l'accord initial ne couvrait qu'un arrangement d'un an à 5 %. Il faut donc un nouveau consentement écrit avant d'accepter. C est donc correct. A est faux deux fois : un e-mail est un consentement écrit valable, et le Standard ne demande pas l'accord des autres clients. B est faux : le consentement porte sur un arrangement précis (nature, montant, durée) ; un arrangement modifié doit être de nouveau approuvé.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Ethical and Professional Standards Page 3...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
