// Seed script — quiz de "drill" associé à la page 1 de la fiche PDF Ethical and
// Professional Standards (Ethics & Trust · Code and Standards, Readings 89 et
// 90 de la fiche, même numérotation dans la banque de pratique).
// Structure : pour chacun des 5 concepts clés de la page, 1 question officielle
// (banque de pratique Ethics, corrigé vérifié contre "- Answers.pdf") + 1
// variante "angle différent" (même notion, mais jamais un simple changement de
// chiffres menant au même raisonnement) + 1 variante "plus difficile"
// (raisonnement à plusieurs étapes / pièges combinés / notion connexe de la
// page). Voir memory regle-drill-variantes-cfa-hub. Questions en anglais,
// explications en français.
// Les 5 questions officielles ne sont PAS celles imprimées dans le PDF
// (R89 Q15, Q9, Q13 et Q19, R90 Q5) : l'utilisateur les a déjà sur papier.
// Usage: node scripts/seed-ethics-drill-page1.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Ethical and Professional Standards (Système)";

const QUIZ_SETS = [
  {
    title: "Ethical and Professional Standards — Drill Fiche Page 1 (Ethics & Trust · Code and Standards)",
    difficulty: 1,
    questions: [
      // Concept 1 — Ethics, profession et confiance : comment une profession établit la confiance (officielle — R89 Q16)
      [
        "Establishing standards of ethical behavior and monitoring professional conduct are best described as ways that professions:",
        ["avoid regulatory scrutiny.", "establish trust.", "increase the market value of their services."],
        1,
        "Une profession gagne la confiance du public en exigeant un haut niveau d'expertise, en fixant des standards de comportement éthique, en surveillant (monitoring) la conduite de ses membres, en encourageant la formation continue, en restant centrée sur les besoins des clients et en pratiquant le mentoring. B est donc correct. A est faux : une profession n'échappe pas à la régulation ; elle a au contraire un régulateur qui surveille ses membres. C est faux : ces mécanismes ne visent pas la valeur de marché des services, mais la confiance des clients et de la société.",
      ],
      // Variante angle différent — le « pourquoi » : produit intangible, qualité difficile à juger, donc confiance centrale
      [
        "Compared with many other industries, trust is especially important in the investment industry most likely because:",
        [
          "clients often cannot easily judge the quality of an intangible service such as investment advice, even after delivery.",
          "investment professionals are largely unregulated, so the trust clients place in them is the only protection available.",
          "investment products are standardized, so firms can compete with one another only on the basis of their reputation.",
        ],
        0,
        "La finance vend surtout un service intangible (conseil, gestion de portefeuille) : le client ne peut pas facilement en juger la qualité, ni avant ni même après coup, car un bon ou un mauvais résultat peut venir du marché plutôt que de la compétence du gérant. Il doit donc faire confiance au professionnel, d'où l'importance de standards éthiques élevés. A est donc correct. B est faux : la finance est au contraire très régulée, et une profession a un régulateur ou un organisme qui surveille ses membres ; la confiance vient en plus de la régulation, pas à sa place. C est faux : les services d'investissement ne sont pas standardisés (chaque client a ses objectifs et ses contraintes) ; c'est la difficulté à juger leur qualité, pas leur uniformité, qui rend la confiance centrale. Conséquence vue dans la fiche : quand la confiance disparaît, l'épargne investie baisse et le coût du capital monte.",
      ],
      // Variante plus difficile — quatre affirmations : moyens d'établir la confiance, code sans garantie, minimum vs best practices, coût du capital
      [
        "Consider the following statements: (1) Monitoring members' professional conduct and encouraging continuing education are ways in which a profession builds trust. (2) By adopting a code of ethics, a profession assures the public that all of its members will behave ethically. (3) Standards of conduct set a minimum level of acceptable behavior, whereas best practices are recommended but not required. (4) Because the harm from unethical behavior falls mainly on the clients directly involved, it has little effect on the cost of capital in the economy. Which of these statements are correct?",
        ["(1) and (3) only.", "(1), (2) and (3) only.", "(1), (3) and (4) only."],
        0,
        "(1) est vrai : exiger l'expertise, fixer des standards éthiques, surveiller la conduite des membres, encourager la formation continue, rester centré sur le client et pratiquer le mentoring sont les moyens par lesquels une profession établit la confiance. (2) est faux : un code of ethics dit au public comment les membres sont censés se comporter et renforce la confiance, mais il ne garantit pas que tous le respecteront (d'où la surveillance et les sanctions). (3) est vrai : les standards of conduct fixent le niveau minimum acceptable ; les best practices vont au-delà et sont seulement recommandées. (4) est faux : un comportement non éthique nuit aux clients, mais aussi aux collègues, à l'employeur et à la société ; la défiance réduit l'épargne investie, fait monter le coût du capital et conduit à une mauvaise allocation du capital, donc à moins de croissance. A est donc correct. B est faux : il retient (2) et confond un code of ethics avec une garantie de comportement. C est faux : il retient (4), qui ignore l'effet de la défiance sur toute l'économie.",
      ],

      // Concept 2 — Suitability standard vs fiduciary standard (officielle — R89 Q3)
      [
        "A requirement that investment professionals act in the best interests of their clients is a:",
        ["fair dealing standard.", "suitability standard.", "fiduciary standard."],
        2,
        "Le fiduciary standard, le plus exigeant, impose d'utiliser ses connaissances et son expertise pour agir dans le best interest du client. C est donc correct. B est faux : le suitability standard demande seulement que les titres recommandés correspondent au profil du client (objectifs de rendement, tolérance au risque, contraintes), sans exiger d'agir au mieux de ses intérêts. A est faux : le fair dealing (Standard III(B)) porte sur le traitement équitable de tous les clients entre eux, pas sur le devoir envers chacun.",
      ],
      // Variante angle différent — ce que le suitability standard N'EXIGE PAS
      [
        "An investment professional who is held only to a suitability standard is least likely required to:",
        [
          "gather information about the client's return objectives, risk tolerance, and constraints.",
          "recommend securities that are consistent with the client's objectives and constraints.",
          "choose, among several suitable products, the one that is best for the client even if it pays her a lower commission.",
        ],
        2,
        "Le suitability standard exige que les titres recommandés correspondent au profil du client : il faut donc connaître ses objectifs de rendement, sa tolérance au risque et ses contraintes (A), puis recommander des titres cohérents avec ce profil (B). Il n'exige pas, en revanche, d'agir dans le best interest du client : entre plusieurs produits tous adaptés, le professionnel n'est pas obligé de choisir le meilleur pour le client, par exemple le moins cher. Cette obligation relève du fiduciary standard, plus exigeant. C est donc la réponse demandée. A et B sont faux : ce sont précisément les deux exigences du suitability standard.",
      ],
      // Variante plus difficile — deux conseillers, deux standards : fonds adapté mais plus cher vs fonds dans le best interest du client
      [
        "A client's objectives call for a diversified, low-cost bond allocation. Adviser X, held to a suitability standard, recommends Bond Fund P, which fits the client's risk and return profile and pays X a high sales commission, although Bond Fund Q holds a nearly identical portfolio and charges much lower fees. Adviser Y, held to a fiduciary standard, recommends Fund Q, which pays Y no commission. Which statement is most accurate?",
        [
          "Both advisers met the standard that applies to them, but only Y's recommendation would also satisfy a fiduciary standard.",
          "X violated the suitability standard, because a cheaper fund with a similar portfolio was available.",
          "Y went beyond what a fiduciary standard requires, because recommending any fund that matches the client's profile would have been sufficient.",
        ],
        0,
        "Il faut appliquer chaque standard séparément. Fund P correspond au profil de risque et de rendement du client : X respecte le suitability standard, qui demande seulement l'adéquation entre le profil et les titres recommandés. Mais recommander P plutôt que Q, quasi identique et bien moins cher, sert d'abord la commission de X : ce choix ne satisferait pas un fiduciary standard, qui impose d'agir dans le best interest du client. Y, tenu au fiduciary standard, recommande le fonds le moins cher : il respecte son standard (et donc aussi le suitability standard, moins exigeant). A est donc correct. B est faux : il juge X avec le critère du fiduciary standard ; l'existence d'un produit moins cher ne rend pas P inadapté au profil du client. C est faux : il décrit le suitability standard ; le fiduciary standard ne se contente pas d'un fonds « adapté », il demande de choisir dans l'intérêt du client, ici le fonds le moins cher à portefeuille égal.",
      ],

      // Concept 3 — Challenges to ethical behavior : situational influences, ethics vs law (officielle — R89 Q18)
      [
        "Challenges to ethical behavior are most likely to arise from:",
        ["inadequate training.", "internal motivations.", "situational influences."],
        2,
        "Les situational influences sont des facteurs extérieurs au décideur (pression sociale, loyauté, argent, prestige, focus sur le court terme) ; elles pèsent plus que les traits personnels et sont la principale source de difficultés éthiques, d'autant qu'on surestime sa propre éthique. C est donc correct. B est faux : les motivations internes jouent, mais le curriculum souligne que les influences de la situation dominent. A est faux : le manque de formation n'est pas présenté comme la source principale des difficultés éthiques.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : overconfidence, compliance rules-based, poids des influences
      [
        "Which of the following statements about challenges to ethical behavior is least accurate?",
        [
          "People tend to overestimate how ethically they would behave if they were placed in a difficult situation.",
          "A compliance culture focused only on rules can lead employees to ask what they are allowed to do rather than what they should do.",
          "Ethical people rely on their character, so situational influences such as loyalty or short-term pressure have little effect on them.",
        ],
        2,
        "C est l'affirmation inexacte, donc la réponse demandée : le curriculum souligne au contraire que les situational influences (pression sociale, loyauté envers les collègues ou l'employeur, argent, prestige, focus sur le court terme) pèsent plus que les traits de caractère, y compris chez des personnes qui se croient éthiques. A est exact : on surestime sa propre éthique (overconfidence), ce qui fait sous-estimer l'effet de la situation. B est exact : une compliance trop rules-based pousse à se demander ce qu'on peut faire (ce qui est permis) plutôt que ce qu'on devrait faire (ce qui est éthique).",
      ],
      // Variante plus difficile — cas combiné : pression du bonus et des collègues, légal mais non éthique, étapes du framework de décision
      [
        "Mira Okafor, CFA, is about to downgrade Delta Corp. to 'sell.' Her bank's investment banking division is close to winning a large mandate from Delta, her manager reminds her that a downgrade now could cost the team its annual bonus, and colleagues she respects say the rating 'can wait a quarter.' No law prohibits delaying a rating change. Which approach is most appropriate?",
        [
          "Delay the downgrade, because the delay is legal and an ethical decision-making framework is needed only when a planned action might break the law.",
          "Treat the bonus and peer pressure as situational influences, seek outside guidance such as compliance, and weigh the long-term effects on investors who rely on her rating.",
          "Decide alone without consulting anyone, because situational pressures mainly affect people of weak character and she considers herself highly ethical.",
        ],
        1,
        "Plusieurs notions de la page se combinent. La pression du bonus et l'avis des collègues sont des situational influences, qui pèsent plus qu'on ne le croit. La légalité ne règle pas la question : l'éthique fixe un standard plus élevé que la loi, et retarder un changement de recommandation pour servir l'investment banking trompe les investisseurs qui se fient à cette note. Le framework (Identify, Consider, Decide and act, Reflect) demande d'identifier les stakeholders et les conflits d'intérêts, puis de considérer les influences et les biais, de chercher une guidance extérieure (compliance, mentor) et de peser les alternatives à court et à long terme. B est donc correct. A est faux : il confond légal et éthique, et réduit le framework à un contrôle de conformité. C est faux : c'est le piège de l'overconfidence ; chacun surestime sa propre éthique, et demander conseil fait justement partie de l'étape Consider. (Retarder la note sous la pression de l'investment banking poserait aussi problème au regard du Standard I(B), vu en page 2.)",
      ],

      // Concept 4 — Professional Conduct Program : procédure et sanctions (officielle — R90 Q24)
      [
        "A member or candidate who rejects a disciplinary sanction proposed by the Professional Conduct Program:",
        [
          "may request an appeal to a hearing panel.",
          "will be suspended from membership or participation in the CFA Program.",
          "will typically not be subject to further disciplinary procedure unless a new investigation is initiated.",
        ],
        0,
        "À l'issue de l'enquête, le Professional Conduct Program peut ne pas sanctionner, envoyer une cautionary letter ou proposer une sanction. Le membre ou le candidat peut l'accepter ou la refuser ; dans ce cas, l'affaire passe devant un hearing panel (disciplinary review panel) qui statue. A est donc correct. B est faux : le refus ne déclenche pas de suspension automatique, il ouvre la procédure d'audience. C est faux : le refus ne clôt pas l'affaire, la procédure continue devant le panel.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : déclencheurs d'une enquête, Professional Conduct Statement, pas de suspension automatique
      [
        "Which of the following statements about the CFA Institute Professional Conduct Program is least accurate?",
        [
          "An inquiry may be prompted by a media report or by a report from an exam proctor, not only by a written complaint.",
          "A member who is under investigation is automatically suspended until the inquiry is completed.",
          "On their annual Professional Conduct Statement, members must disclose whether they are involved in civil litigation or a criminal investigation, or are the subject of a written complaint.",
        ],
        1,
        "B est l'affirmation inexacte, donc la réponse demandée : il n'y a pas de suspension automatique pendant l'enquête ; une sanction ne vient qu'à l'issue de la procédure, acceptée par le membre ou décidée par un hearing panel (seul le refus de coopérer à l'enquête peut, en soi, conduire à une suspension). A est exact : le Professional Conduct Program peut ouvrir une enquête à partir d'une self-disclosure, d'une plainte écrite, d'informations parues dans les médias, d'un rapport de proctor à l'examen ou de l'analyse des copies et des réseaux sociaux. C est exact : chaque année, le Professional Conduct Statement oblige le membre à déclarer un litige civil, une enquête pénale ou une plainte écrite le concernant.",
      ],
      // Variante plus difficile — enchaînement complet : sanction refusée, hearing panel, sanctions possibles (et pas d'amende)
      [
        "After an inquiry, CFA Institute Professional Conduct staff conclude that a charterholder violated the Standards and propose a public censure. The charterholder rejects the proposed sanction. Which of the following best describes what happens next and the sanctions that may ultimately be imposed?",
        [
          "A hearing panel of the Disciplinary Review Committee will decide the case and may impose public censure, suspension, or revocation of the designation, but not a fine.",
          "The charterholder is automatically suspended, and the Disciplinary Review Committee may then add a monetary fine to any revocation of the designation.",
          "The inquiry is closed, because a sanction can be imposed only with the member's consent, and staff may at most issue a cautionary letter.",
        ],
        0,
        "Déroulé : à la fin de l'enquête, le Professional Conduct staff peut ne rien faire, envoyer une cautionary letter ou proposer une sanction. Si la sanction est refusée, l'affaire passe à un hearing devant un panel du Disciplinary Review Committee, qui décide. Sanctions possibles : censure privée ou publique, suspension du membership, révocation du droit d'utiliser la CFA designation et, pour un candidat, suspension du CFA Program ; CFA Institute n'inflige pas d'amendes. A est donc correct. B est faux deux fois : le refus n'entraîne aucune suspension automatique, et l'amende ne fait pas partie des sanctions. C est faux : le refus ne clôt pas l'affaire, il déclenche l'audience ; la sanction n'a pas besoin de l'accord du membre.",
      ],

      // Concept 5 — Code of Ethics (6 composantes) vs Standards of Professional Conduct (officielle — R90 Q4)
      [
        "Which of the following is a component of the Code of Ethics? CFA Institute members shall:",
        [
          "make reasonable efforts to detect and prevent violations by those who are under their supervision.",
          "disclose to their employer all matters that reasonably could be expected to interfere with their duty to their employer or ability to make unbiased and objective recommendations.",
          "strive to maintain and improve their competence and the competence of others in the profession.",
        ],
        2,
        "Maintenir et améliorer sa compétence et celle des autres professionnels est l'une des 6 composantes du Code of Ethics. C est donc correct. A est faux : prévenir et détecter les violations des personnes supervisées relève du Standard IV(C) Responsibilities of Supervisors, pas du Code. B est faux : déclarer à l'employeur ce qui peut nuire à ses devoirs ou à son objectivité relève du Standard VI(A) Avoid or Disclose Conflicts.",
      ],
      // Variante angle différent — question inversée : repérer le Standard caché parmi des composantes du Code
      [
        "Which of the following is a requirement of the Standards of Professional Conduct rather than one of the six components of the Code of Ethics?",
        [
          "Practice and encourage others to practice in a professional and ethical manner that will reflect credit on themselves and the profession.",
          "Distinguish between fact and opinion in the presentation of investment analysis and recommendations.",
          "Promote the integrity and viability of the global capital markets for the ultimate benefit of society.",
        ],
        1,
        "Distinguer les faits des opinions est une exigence du Standard V(B) Communication with Clients and Prospective Clients, pas une composante du Code. B est donc la réponse demandée. A et C sont faux : ce sont deux des six composantes du Code of Ethics (pratiquer et encourager les autres à pratiquer de façon éthique ; promouvoir l'intégrité et la viabilité des marchés). Les quatre autres : agir avec integrity, competence, diligence, respect et de façon éthique ; placer l'intégrité de la profession et les intérêts des clients avant les siens ; reasonable care et jugement professionnel indépendant ; maintenir et améliorer sa compétence et celle des autres. Repère : le Code énonce des principes généraux, les Standards des obligations précises.",
      ],
      // Variante plus difficile — rattacher trois situations au bon Standard (I à VII) : bonus d'un client, fait vs opinion, ordre personnel avant le client
      [
        "Identify the Standard of Professional Conduct (I to VII) that most specifically addresses each situation: (1) a client offers a portfolio manager a bonus if his account beats its benchmark next year; (2) an analyst's report presents her earnings forecast as if it were a certainty, without distinguishing it from fact; (3) a manager buys a stock for her own account before executing a large client order in the same stock.",
        [
          "(1) Standard III, (2) Standard V, (3) Standard VI.",
          "(1) Standard IV, (2) Standard V, (3) Standard VI.",
          "(1) Standard IV, (2) Standard I, (3) Standard III.",
        ],
        1,
        "(1) Un bonus offert par un client et lié à la performance future est une rémunération additionnelle qui peut entrer en conflit avec les intérêts de l'employeur : IV(B) Additional Compensation Arrangements, dans le Standard IV Duties to Employers (piège classique : ce n'est pas le Standard III, même si l'offre vient d'un client). (2) Ne pas distinguer faits et opinions relève de V(B) Communication with Clients and Prospective Clients, dans le Standard V Investment Analysis, Recommendations, and Actions. (3) Passer son ordre personnel avant celui du client relève de VI(B) Priority of Transactions, dans le Standard VI Conflicts of Interest. B est donc correct. A est faux : il classe le bonus du client dans les Duties to Clients. C est faux : présenter une prévision comme un fait peut ressembler à une misrepresentation (I(C)), mais le Standard qui vise précisément la distinction fait / opinion est V(B) ; et l'ordre personnel passé avant celui du client relève spécifiquement de VI(B), pas du Standard III.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Ethical and Professional Standards Page 1...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
