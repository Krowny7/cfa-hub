// Seed script — quiz de "drill" associé à la page 5 de la fiche PDF Ethical and
// Professional Standards (Introduction to GIPS · Ethics Application, Readings
// 92 et 93 de la fiche, même numérotation dans la banque de pratique).
// Structure : pour chacun des 5 concepts clés de la page, 1 question officielle
// (banque de pratique Ethics, corrigé vérifié contre "- Answers.pdf") + 1
// variante "angle différent" (même notion, mais jamais un simple changement de
// chiffres menant au même raisonnement) + 1 variante "plus difficile"
// (raisonnement à plusieurs étapes / pièges combinés / notion connexe de la
// page). Voir memory regle-drill-variantes-cfa-hub. Questions en anglais,
// explications en français.
// Les 5 questions officielles ne sont PAS celles imprimées dans le PDF
// (R92 Q1, Q13, Q9 et Q14, R93 Q1) : l'utilisateur les a déjà sur papier.
// Usage: node scripts/seed-ethics-drill-page5.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Ethical and Professional Standards (Système)";

const QUIZ_SETS = [
  {
    title: "Ethical and Professional Standards — Drill Fiche Page 5 (Introduction to GIPS · Ethics Application)",
    difficulty: 1,
    questions: [
      // Concept 1 — Pourquoi les GIPS : comparabilité, adoption volontaire par les firmes, compliance totale et firmwide (officielle — R92 Q12)
      [
        "Which of the following statements most accurately describes why the Global Investment Performance Standards (GIPS) were created?",
        [
          "Meet the need for a single globally accepted set of investment performance presentation standards.",
          "Provide a single globally accepted set of regulatory guidelines among developed securities markets.",
          "Establish ethical requirements for individuals who are responsible for performance presentation.",
        ],
        0,
        "Avec des méthodes maison, les performances n'étaient ni comparables ni fiables (meilleurs portefeuilles seuls, comptes clôturés exclus, périodes choisies). CFA Institute a créé les GIPS pour disposer d'un ensemble unique, accepté dans le monde entier, de standards de présentation de la performance. A est donc correct. B est faux : les GIPS sont des standards volontaires adoptés par les firmes, pas une réglementation des marchés. C est faux : ils s'appliquent aux firmes, pas aux individus, et portent sur la présentation de la performance, pas sur des exigences éthiques personnelles.",
      ],
      // Variante angle différent — ce que les GIPS ne visent PAS : les pratiques trompeuses d'avant les GIPS vs le niveau des frais
      [
        "Which of the following practices were the GIPS least likely created to address?",
        [
          "Presenting the results of a single top-performing account as representative of the firm's overall performance.",
          "Excluding accounts that were closed after poor results from a firm's historical performance record.",
          "Charging management fees that are higher than those of competing firms.",
        ],
        2,
        "Les GIPS sont nés pour supprimer les pratiques qui rendaient les performances flatteuses et non comparables : le « representative account » (montrer le meilleur portefeuille comme s'il représentait la firme), le survivorship bias (retirer de l'historique les comptes clôturés, souvent après de mauvais résultats) et le choix des périodes de mesure les plus favorables. A et B sont donc deux de ces pratiques. Le niveau des frais, en revanche, n'est pas leur objet : les GIPS imposent de présenter les rendements de façon homogène et de communiquer certaines informations sur les frais, mais ils ne plafonnent ni ne comparent les frais facturés. C est donc la réponse demandée.",
      ],
      // Variante plus difficile — qui peut claim compliance, interdiction du « compliant except for », compliance firmwide
      [
        "Consider the following situations: (1) a pension consulting firm that advises plan sponsors on manager selection, but does not manage any assets, states in its marketing material that it is 'GIPS compliant'; (2) an asset manager states in its GIPS Reports that it 'complies with the GIPS standards except for the treatment of carve-outs'; (3) a manager that holds itself out to clients as a single global firm with offices in three countries claims GIPS compliance for its New York office only; (4) an asset manager based in a country with no performance-reporting regulation voluntarily adopts the GIPS and meets all of their applicable requirements on a firmwide basis. Which of these situations is consistent with the GIPS?",
        ["Situation 4 only.", "Situations 1 and 4 only.", "Situations 3 and 4 only."],
        0,
        "Situation 1 : seules les firmes qui gèrent effectivement des actifs peuvent claim compliance ; un consultant (comme un éditeur de logiciel) peut soutenir (endorse) les GIPS, pas s'en déclarer conforme : incompatible. Situation 2 : la compliance est totale ou n'est pas ; une formule du type « compliant except for… » est interdite : incompatible. Situation 3 : la firme est l'entité présentée aux clients, avec toutes ses implantations ; une firme qui se présente comme une seule entité mondiale ne peut pas limiter sa compliance à un bureau : incompatible. Situation 4 : l'adoption est volontaire, indépendante de la réglementation locale, et la firme respecte toutes les exigences applicables firmwide : compatible. A (situation 4 seulement) est donc correct. B est faux : il confond endorse et claim compliance. C est faux : il oublie que la compliance doit couvrir toute la firme telle qu'elle se présente.",
      ],

      // Concept 2 — Les 8 sections des GIPS pour les firmes (officielle — R92 Q2)
      [
        "The section of the Global Investment Performance Standards (GIPS) that outlines defining the firm and documenting firm policies and procedures is:",
        [
          "Composite and Pooled Fund Maintenance.",
          "GIPS Advertising Guidelines.",
          "Fundamentals of Compliance.",
        ],
        2,
        "La section 1, Fundamentals of Compliance, porte sur la définition de la firme (base de la compliance firmwide, qui fixe le périmètre des actifs totaux), la documentation des politiques et procédures, la remise des rapports GIPS aux prospects et l'interdiction de toute information fausse ou trompeuse. C est donc correct. A est faux : la section 3 traite de la construction et du suivi des composites et des pooled funds. B est faux : la section 8 encadre la publicité qui fait référence aux GIPS.",
      ],
      // Variante angle différent — cas limite : à quelles publicités s'applique la section 8 (Advertising Guidelines)
      [
        "A GIPS-compliant firm runs two advertisements. The first presents the returns of its growth composite and states that the firm claims compliance with the GIPS; the second presents the same returns without any reference to the GIPS. Section 8, the GIPS Advertising Guidelines, most likely applies to:",
        [
          "both advertisements, because the firm claims compliance with the GIPS.",
          "the first advertisement only, because the guidelines apply only to advertisements that refer to the GIPS.",
          "neither advertisement, because advertising is governed by local regulation rather than by the GIPS.",
        ],
        1,
        "Les GIPS Advertising Guidelines (section 8) ne s'appliquent qu'aux publicités qui mentionnent la compliance de la firme avec les GIPS ; elles fixent alors ce que la publicité doit contenir pour que la référence aux GIPS ne soit pas trompeuse. B est donc correct. A est faux : être une firme GIPS-compliant ne soumet pas toutes ses publicités à la section 8 ; celle qui ne cite pas les GIPS en sort (elle reste soumise au droit local et ne doit pas être trompeuse). C est faux : dès qu'une publicité invoque les GIPS, la section 8 s'applique, en plus de la réglementation locale.",
      ],
      // Variante plus difficile — classer quatre procédures dans les sections 1, 2, 3 et 4–7
      [
        "A GIPS-compliant firm's compliance manual covers four items: (1) the requirement that portfolio assets be valued at fair value and the method used to calculate portfolio returns; (2) the criteria for adding new portfolios to composites and for removing terminated ones; (3) the definition of the firm and the obligation to provide a GIPS Report to every prospective client; (4) the report of time-weighted returns for the firm's growth equity composite. These items fall under which sections of the GIPS standards for firms?",
        [
          "Sections 4, 3, 1 and 2, respectively.",
          "Sections 2, 3, 8 and 4, respectively.",
          "Sections 2, 3, 1 and 4, respectively.",
        ],
        2,
        "Item 1 : la valorisation à la fair value et la méthode de calcul des rendements relèvent de la section 2, Input Data and Calculation Methodology. Item 2 : l'entrée et la sortie des portefeuilles dans les composites relèvent de la section 3, Composite and Pooled Fund Maintenance. Item 3 : la définition de la firme et la remise d'un GIPS Report à tout prospect relèvent de la section 1, Fundamentals of Compliance. Item 4 : les sections 4 à 7 portent sur les rapports, time-weighted puis money-weighted, d'abord pour les composites puis pour les pooled funds ; le rapport time-weighted d'un composite est la section 4. C (2, 3, 1 et 4) est donc correct. A est faux : il confond la méthode de calcul (section 2) avec le rapport présentant les rendements (section 4). B est faux : la remise d'un GIPS Report aux prospects est une exigence de base de la section 1, pas une règle de publicité (section 8, réservée aux publicités qui citent les GIPS).",
      ],

      // Concept 3 — Composites : tous les portefeuilles fee-paying discretionary, définis ex ante, rendement asset-weighted (officielle — R92 Q8)
      [
        "McGregor Investment Management promotes itself as a fixed-income investment management firm. The vast majority of the discretionary portfolios it manages are fixed-income portfolios. McGregor does, however, manage a few portfolios utilizing a growth equity investment strategy, but the firm has no intention of ever promoting this strategy. Under the Global Investment Performance Standards (GIPS), must these portfolios be included in a composite?",
        [
          "Yes, because the portfolios are discretionary.",
          "Yes, because the portfolios are managed to a widely recognized investment strategy.",
          "No, because the firm does not normally manage portfolios to a growth equity strategy and does not promote it to potential clients.",
        ],
        0,
        "Les GIPS exigent que tous les portefeuilles fee-paying discretionary, actuels et passés, figurent dans au moins un composite, défini par la stratégie, l'objectif ou le mandat. Les portefeuilles growth equity de McGregor sont discretionary : ils doivent entrer dans un composite. A est donc correct. B est faux : ce n'est pas la notoriété de la stratégie qui compte, mais le caractère discretionary du portefeuille. C est faux : la firme ne peut pas écarter des portefeuilles parce qu'elle ne met pas la stratégie en avant ; ce serait précisément le choix sélectif que les GIPS veulent empêcher.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai des composites (moyenne simple vs pondérée par les actifs)
      [
        "Which of the following statements about composites under the GIPS is least accurate?",
        [
          "A portfolio the firm no longer manages must remain in the composite's historical returns for the periods during which it was included in the composite.",
          "A composite's return is calculated as the simple average of the returns of the portfolios it contains.",
          "A portfolio must be assigned to a composite according to criteria defined before its performance is known.",
        ],
        1,
        "Le rendement d'un composite est une moyenne pondérée par les actifs (asset-weighted) des rendements des portefeuilles qui le composent, pas une moyenne simple : un petit portefeuille très performant ne doit pas peser autant qu'un gros. B est donc l'énoncé faux, c'est la réponse demandée. A est exact : les portefeuilles clôturés restent dans l'historique du composite pour les périodes où ils en faisaient partie ; les retirer créerait un survivorship bias. C est exact : l'affectation se fait ex ante, selon des critères documentés, pour empêcher de choisir après coup les portefeuilles qui flattent la performance.",
      ],
      // Variante plus difficile — rendement du composite : écarter le nondiscretionary et l'autre stratégie, puis pondérer par les actifs
      [
        "A GIPS-compliant firm manages the following portfolios (beginning-of-year value; return for the year): Portfolio 1, discretionary, large-cap growth ($50 million; +10%); Portfolio 2, discretionary, large-cap growth ($30 million; +6%); Portfolio 3, large-cap growth ($20 million; +20%), whose client must approve every trade, which prevents the firm from implementing its strategy; Portfolio 4, discretionary, large-cap value ($40 million; +2%). The return of the firm's large-cap growth composite for the year is closest to:",
        ["10.8%.", "8.0%.", "8.5%."],
        2,
        "Étape 1, le périmètre : le composite large-cap growth regroupe les portefeuilles discretionary gérés selon cette stratégie. Le portefeuille 3 est nondiscretionary (les restrictions du client empêchent d'appliquer la stratégie) : il est exclu. Le portefeuille 4 suit une autre stratégie (value) : il appartient à un autre composite. Restent les portefeuilles 1 et 2, soit 80 M$. Étape 2, la pondération par les actifs : (50 x 10 % + 30 x 6 %) / 80 = (5,0 + 1,8) / 80 = 6,8 / 80 = 8,5 %. C est donc correct. A est faux : 10,8 % = (5,0 + 1,8 + 20 x 20 %) / 100 inclut à tort le portefeuille nondiscretionary. B est faux : 8,0 % = (10 % + 6 %) / 2 est une moyenne simple, alors que les GIPS exigent une pondération par les actifs. (Inclure aussi le portefeuille value donnerait (6,8 + 0,8) / 120 = 6,3 %.)",
      ],

      // Concept 4 — Firm, discretion et verification (recommandée, par un tiers, sur toute la firme) (officielle — R92 Q7)
      [
        "Which of the following statements most accurately describes verification under the Global Investment Performance Standards (GIPS)? GIPS verification:",
        [
          "is required for a firm to claim GIPS compliance.",
          "requires a verification report to be issued for the entire firm.",
          "requires verification of individual composites.",
        ],
        1,
        "La verification, confiée à un tiers indépendant, porte sur toute la firme : un seul rapport est émis pour l'ensemble de la firme ; il atteste que les composites sont construits selon les GIPS firmwide et que les process de calcul, de données et de présentation sont conformes. B est donc correct. A est faux : la verification est recommandée, pas obligatoire pour claim compliance. C est faux : une verification ne peut pas porter sur un seul composite.",
      ],
      // Variante angle différent — ce qu'atteste (et n'atteste pas) un rapport de verification
      [
        "A GIPS verification report most likely attests that:",
        [
          "the firm has complied with all composite construction requirements on a firmwide basis, and its policies and procedures for calculating and presenting performance are designed in compliance with the GIPS.",
          "the performance presented in one specific composite's GIPS Report has been recalculated and is accurate.",
          "the firm's investment process is suitable for the clients whose portfolios are included in its composites.",
        ],
        0,
        "Le rapport de verification atteste deux choses, pour toute la firme : (1) la firme a respecté toutes les exigences de construction des composites sur une base firmwide ; (2) ses politiques et procédures de calcul, de données et de présentation de la performance sont conçues conformément aux GIPS. A est donc correct. B est faux : la verification ne certifie pas les chiffres d'un composite précis ; contrôler un composite en particulier serait un examen distinct, et la verification ne peut jamais porter sur un seul composite. C est faux : les GIPS portent sur le calcul et la présentation de la performance, pas sur l'adéquation (suitability) des stratégies aux clients, qui relève du Standard III(C).",
      ],
      // Variante plus difficile — définition de la firme (toutes implantations), critères écrits de discretion, compliance sans verification
      [
        "Atlas Capital holds itself out to clients as a single firm with offices in Paris and Singapore, and it claims compliance with the GIPS. (1) Atlas defines the firm as its Paris office only, because the Singapore office's results are weaker. (2) Atlas has documented written criteria for determining whether a portfolio is discretionary. (3) Atlas has never been verified; its GIPS Reports state that it claims compliance with the GIPS and that it has not been independently verified. Which of these practices are consistent with the GIPS?",
        ["Practice 2 only.", "Practices 2 and 3 only.", "Practices 1, 2 and 3."],
        1,
        "Pratique 1 : la firme se définit comme l'entité présentée aux clients comme distincte, avec toutes ses implantations géographiques ; Atlas se présente comme une seule firme Paris-Singapour et ne peut pas exclure un bureau parce que ses résultats sont moins bons (ce serait du cherry-picking) : incompatible. Pratique 2 : documenter par écrit les critères qui classent un portefeuille comme discretionary ou non est exactement ce que demandent les GIPS : compatible. Pratique 3 : la verification est recommandée mais pas obligatoire ; une firme non vérifiée peut claim compliance, à condition de le dire honnêtement : compatible. B (pratiques 2 et 3) est donc correct. A est faux : il croit à tort que la verification est requise pour claim compliance. C est faux : il accepte une définition de la firme taillée pour écarter un bureau moins performant.",
      ],

      // Concept 5 — Ethics Application : cas types et réflexes d'examen (« disclose à qui ? consentement ? ») (officielle — R93 Q12)
      [
        "Jan Hirsh, CFA, is employed by a college to manage its endowment fund. The endowment carries out its transactions primarily through the brokerage firm Advisors, Inc. Over the years, Hirsh has developed a solid relationship with Advisors. Advisors offers Hirsh their highest level of service for her personal account if the endowment continues to exceed a minimum number of transactions per year with Advisors. The Code and Standards most likely require Hirsh to:",
        [
          "disclose this benefit to the college, but it does not require her to receive the college's permission.",
          "receive the college's permission before accepting this benefit.",
          "decline this benefit because it represents a conflict of interest with the college.",
        ],
        1,
        "L'avantage offert par le broker dépend du volume d'ordres que Hirsh lui envoie pour l'endowment : il peut la dissuader de chercher une meilleure exécution ailleurs, donc créer un conflit avec les intérêts de son employeur. Standard IV(B) Additional Compensation Arrangements exige alors le consentement écrit de l'employeur (le college) avant d'accepter. B est donc correct. A est faux : une simple information ne suffit pas, il faut l'accord écrit préalable. C est faux : le Standard n'oblige pas à refuser ; il conditionne l'acceptation au consentement de l'employeur.",
      ],
      // Variante angle différent — comparaison : cadeau d'un client pour le passé vs promesse liée à la performance future
      [
        "Elena Duarte, CFA, manages a client's portfolio. After a strong year, the client sends her a pair of opera tickets as a thank-you. The client also tells her that he will pay for a week-long vacation for her if his portfolio beats its benchmark next year. Under the Code and Standards, Duarte most likely must:",
        [
          "disclose both benefits to her employer; no consent is needed for either, because both come from a client rather than from a third party.",
          "decline both benefits, because any gift from a client creates a conflict with her employer's interests.",
          "disclose the opera tickets to her employer, and obtain her employer's written consent before accepting the vacation offer.",
        ],
        2,
        "Il faut distinguer le passé et le futur. Les places d'opéra récompensent une performance déjà réalisée : elles ne peuvent plus influencer sa gestion, il suffit de les déclarer à l'employeur. Le voyage dépend de la performance future de ce seul portefeuille : il pourrait la pousser à favoriser ce client au détriment des autres ou à prendre plus de risque ; c'est une rémunération additionnelle soumise à IV(B), qui exige le consentement écrit de toutes les parties concernées, donc de l'employeur, avant d'accepter. C est donc correct. A est faux : venir d'un client ne dispense pas du consentement écrit quand l'avantage est lié à la performance future. B est faux : les Standards n'imposent pas de refuser un cadeau de client ; ils imposent la disclosure, et le consentement pour ce qui est lié au futur.",
      ],
      // Variante plus difficile — trois réflexes combinés : loi la plus stricte, dissociation sans dénonciation obligatoire, refus écrit de superviser
      [
        "Nadia Osei, CFA, works for an asset manager in a country whose securities law allows investment advisers to accept commissions from issuers without telling clients; the Code and Standards are stricter on this point. She also discovers that a colleague has been inflating portfolio valuations, and the compliance department has taken no action after she reported it. Finally, she is offered a promotion to supervise a team, but the firm's compliance procedures are clearly inadequate. Which course of action is most consistent with the Code and Standards?",
        [
          "Apply the Code's stricter disclosure requirement, dissociate from the colleague's activity, and decline in writing to accept supervisory responsibility until the firm adopts adequate procedures.",
          "Follow local law on issuer commissions, report the colleague to the securities regulator, and accept the supervisory role while proposing improvements to the procedures.",
          "Apply the Code's stricter disclosure requirement, report the colleague to the regulator because reporting becomes mandatory once compliance fails to act, and accept the supervisory role because inadequate procedures are the firm's responsibility.",
        ],
        0,
        "Trois réflexes de la fiche. (1) Lois divergentes : on applique la règle la plus stricte, Code compris ; la loi locale permet de taire les commissions d'émetteurs, mais les Standards exigent de divulguer ce conflit (VI(A)) : il faut appliquer le Code. (2) Violation d'un collègue que la compliance laisse faire : il faut se dissocier de l'activité (et le documenter) ; la dénonciation au régulateur est encouragée mais pas exigée par les Standards, même après l'inaction de la compliance. (3) Procédures de compliance inadéquates : il faut refuser par écrit d'assumer la responsabilité de supervision tant que la firme n'a pas adopté des procédures adéquates (IV(C)). A est donc correct. B est faux sur les trois points : la loi moins stricte ne suffit pas, la dénonciation n'est pas requise et accepter de superviser sans procédures adéquates expose à une violation de IV(C). C est faux : il applique bien le Code, mais rend la dénonciation obligatoire à tort et accepte la supervision malgré des procédures inadéquates.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Ethical and Professional Standards Page 5...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
