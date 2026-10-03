// Seed script — quiz de "drill" associé à la page 4 de la fiche PDF Equity
// (Overview of Equity Securities). Structure : pour chacun des 5 concepts
// clés de la page, 1 question officielle (banque de pratique Reading 44,
// corrigé vérifié contre le PDF "- Answers.pdf", recopiée à l'identique pour
// conserver l'historique) + 1 variante "angle différent" (même notion, mais
// jamais un simple changement de chiffres menant au même raisonnement) +
// 1 variante "plus difficile" (raisonnement à plusieurs étapes / pièges
// combinés). Voir memory regle-drill-variantes-cfa-hub. Questions en
// anglais, explications en français.
// Usage: node scripts/seed-equity-drill-page4.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Equity (Système)";

const QUIZ_SETS = [
  {
    title: "Equity — Drill Fiche Page 4 (Overview of Equity Securities)",
    difficulty: 1,
    questions: [
      // Concept 1 — Mécanismes de vote : statutory vs cumulative (officielle)
      [
        "Two seats on a board of directors are to be elected. A voting system in which the owner of 100 shares may cast 100 votes in each of the board elections is a:",
        ["cumulative voting system.", "proportional voting system.", "statutory voting system."],
        2,
        "Dans un système de vote statutaire (statutory voting), l'actionnaire vote avec la totalité de ses actions pour chaque poste soumis à élection séparément (ici 100 voix à chacune des deux élections). Dans un système de vote cumulatif, l'actionnaire pourrait au contraire concentrer l'ensemble de ses voix (200 dans cet exemple) sur un seul candidat.",
      ],
      // Variante angle différent — le "pourquoi" : à qui profite le vote cumulatif
      [
        "Compared with statutory voting, a cumulative voting system most likely:",
        [
          "increases the total number of votes each shareholder can cast across all board seats.",
          "allows minority shareholders to concentrate their votes on a single candidate, improving their chances of board representation.",
          "favors the largest shareholders, who can elect every director as long as they control a majority of the shares.",
        ],
        1,
        "En vote cumulatif, l'actionnaire dispose de (nombre d'actions × nombre de postes) voix qu'il répartit librement, y compris toutes sur un seul candidat : c'est ce qui permet aux actionnaires minoritaires d'obtenir un siège au conseil. A est faux : le total de voix est le même dans les deux systèmes (100 actions et 2 postes = 200 voix au total, en statutory comme en cumulative) — seule change la liberté de les concentrer. C décrit le vote statutaire : chaque poste étant voté séparément avec 1 voix par action, l'actionnaire qui détient la majorité des actions remporte tous les sièges.",
      ],
      // Variante plus difficile — sièges garantis au minoritaire dans les deux systèmes (piège de la répartition des voix)
      [
        "A company with 1,000 voting shares outstanding is electing four directors. A minority shareholder owns 300 shares, and the remaining 700 shares are held by a single shareholder who will vote against all of the minority's candidates. The maximum number of board seats the minority shareholder can be certain to win under statutory voting and under cumulative voting, respectively, is:",
        ["0 and 1.", "0 and 2.", "1 and 1."],
        0,
        "Vote statutaire : chaque siège est voté séparément, 300 voix contre 700 à chaque fois → le majoritaire remporte les 4 sièges, le minoritaire 0. Vote cumulatif : le minoritaire dispose de 300 × 4 = 1 200 voix, le majoritaire de 700 × 4 = 2 800. Si le minoritaire met ses 1 200 voix sur un seul candidat, le majoritaire devrait placer 4 candidats au-dessus de 1 200 voix, soit au moins 4 × 1 201 = 4 804 voix > 2 800 : impossible, donc 1 siège est garanti. Pour viser 2 sièges, il doit partager ses voix : le moins bien doté de ses deux candidats a alors au plus 600 voix, et le majoritaire peut donner 700 voix à chacun de ses 4 candidats (4 × 700 = 2 800) pour tous les placer devant lui — 2 sièges ne sont donc pas garantis (B, piège de la répartition). C applique à tort une logique proportionnelle (30 % × 4 sièges ≈ 1) au vote statutaire, qui ne donne aucun siège au minoritaire.",
      ],

      // Concept 2 — Options des preference shares et hiérarchie de risque (officielle)
      [
        "Preference shares will have the most risk for the investor if the shares are:",
        ["callable and cumulative.", "callable and non-cumulative.", "non-callable and non-cumulative."],
        1,
        "Les actions rachetables (callable) limitent le potentiel de gain en capital car l'émetteur peut les racheter à un prix fixé, et les actions non cumulatives sont plus risquées que les cumulatives car les dividendes omis ne sont pas dus ultérieurement. La combinaison callable + non-cumulative cumule donc le plus de risque pour l'investisseur.",
      ],
      // Variante angle différent — le "pourquoi" de la hiérarchie putable / callable
      [
        "Other things equal, why is a putable preference share less risky for the investor than an otherwise identical callable preference share?",
        [
          "Because missed dividends on putable shares must be paid before any dividend is paid to common shareholders, which is not the case for callable shares.",
          "Because putable shares carry voting rights, while callable shares do not.",
          "Because the put lets the investor sell the shares back to the issuer at a set price, placing a floor under the price, whereas the call lets the issuer buy them back at a set price, capping the investor's upside.",
        ],
        2,
        "L'option de vente (put) appartient à l'investisseur : il peut revendre ses actions à l'émetteur à un prix fixé, ce qui crée un plancher de prix et limite ses pertes. L'option de rachat (call) appartient à l'émetteur : il rachètera les actions quand leur prix monte, ce qui plafonne le gain de l'investisseur. D'où la hiérarchie putable (moins risqué) → sans option → callable (plus risqué), valable pour les preference shares comme pour les common shares. A confond avec la clause cumulative, une caractéristique indépendante qui peut se combiner aussi bien avec un put qu'avec un call. B est faux : put et call n'ont aucun lien avec le droit de vote (les preference shares n'en ont généralement pas, qu'elles soient putables ou callables).",
      ],
      // Variante plus difficile — arriérés de dividendes : deux classes cumulative / non cumulative + donnée-piège
      [
        "A company has two classes of non-participating preference shares outstanding: 100,000 cumulative shares with a par value of $50 and a 6% dividend rate, callable at $52 per share, and 200,000 non-cumulative shares with a par value of $25 and a 4% dividend rate. No preference dividends were paid in the previous two years. This year, the board declares total dividends of $1,500,000. The amount available for common shareholders is closest to:",
        ["$0.", "$400,000.", "$1,000,000."],
        1,
        "Dividende annuel des cumulatives = 100 000 × 50 $ × 6 % = 300 000 $ ; elles doivent recevoir les 2 années d'arriérés plus l'année en cours : 3 × 300 000 = 900 000 $. Dividende annuel des non cumulatives = 200 000 × 25 $ × 4 % = 200 000 $ ; les années sautées sont définitivement perdues, seule l'année en cours est due : 200 000 $. Total prioritaire = 1 100 000 $, reste pour les actionnaires ordinaires = 1 500 000 − 1 100 000 = 400 000 $. A (0 $) traite aussi les non cumulatives comme cumulatives (900 000 + 3 × 200 000 = 1 500 000 $, plus rien pour les ordinaires). C (1 000 000 $) oublie les arriérés des cumulatives (300 000 + 200 000 = 500 000 $). Le prix de rachat de 52 $ est une donnée-piège sans effet sur les dividendes, et « non-participating » signifie qu'aucun dividende supplémentaire n'est dû au-delà du taux fixe. C'est précisément pourquoi une preference share non cumulative est plus risquée : les dividendes omis ne sont jamais rattrapés.",
      ],

      // Concept 3 — Private equity : VC, LBO/MBO, PIPE (officielle)
      [
        "Hodges Fund provides mezzanine stage financing to private companies. In which type of private equity investing is Hodges Fund most likely involved?",
        ["Leveraged buyout.", "Private investment in public equity.", "Venture capital."],
        2,
        "Le financement de stade « mezzanine » est une étape du capital-risque (venture capital), qui comprend les stades seed, early stage et mezzanine. Un LBO rachète la totalité des capitaux propres d'une société publique pour la retirer de la cote, et un PIPE est un investissement privé dans une société déjà cotée — ni l'un ni l'autre ne correspond au financement mezzanine d'une société privée.",
      ],
      // Variante angle différent — le compromis d'un PIPE (pourquoi une société cotée l'accepte)
      [
        "A listed company facing an urgent need for cash raises equity through a private investment in public equity (PIPE) rather than through a public offering. Which of the following best describes the main trade-off of this choice?",
        [
          "The company obtains the capital quickly, but typically must sell the shares at a significant discount to the market price.",
          "The company can sell the shares at a premium to the market price, but the transaction takes the company private.",
          "The company avoids diluting its existing shareholders, but the investors must wait 3 to 10 years before they can resell the shares.",
        ],
        0,
        "Dans un PIPE, une société déjà cotée qui a besoin de capitaux rapidement émet des actions qu'elle place en privé auprès de quelques investisseurs : elle obtient les fonds vite, sans le délai d'une offre publique, mais en contrepartie d'une décote souvent importante par rapport au cours de bourse. B invente une prime et confond avec un LBO, où un investisseur rachète toutes les actions pour retirer la société de la cote — après un PIPE, la société reste cotée. C est faux deux fois : l'émission d'actions nouvelles dilue les actionnaires existants, et l'horizon d'illiquidité de 3 à 10 ans caractérise le capital-risque, pas le PIPE.",
      ],
      // Variante plus difficile — classer trois opérations, avec pièges MBO / mezzanine / offre publique
      [
        "Over several years, an investment firm made three investments: (1) it provided successive rounds of financing to a start-up that had a working prototype but no sales, expecting to hold the investment for several years before any exit; (2) using funds borrowed mostly from a group of banks, and without any participation by the target's managers, it bought all the outstanding shares of a listed company with undervalued assets and strong, stable cash flows, and then delisted it; (3) it bought newly issued, unregistered shares of a listed company that needed cash quickly, at a 15% discount to the market price. These investments are best described, respectively, as:",
        [
          "venture capital; management buyout; private investment in public equity.",
          "venture capital; leveraged buyout; private investment in public equity.",
          "mezzanine financing; leveraged buyout; seasoned equity offering.",
        ],
        1,
        "(1) Financer par tours successifs une start-up qui a un prototype mais aucune vente, avec une sortie dans plusieurs années, c'est du capital-risque (venture capital) au stade précoce. (2) Racheter toutes les actions d'une société cotée principalement avec de la dette puis la retirer de la cote, c'est un LBO ; actifs sous-évalués et cash-flows élevés et stables en font une cible typique (les cash-flows servent à rembourser la dette). (3) Acheter, avec décote, des actions nouvelles non enregistrées d'une société cotée pressée de trouver des fonds, c'est un PIPE. A est faux pour (2) : un MBO suppose que la direction de la société participe au rachat, ce que l'énoncé exclut explicitement. C est faux pour (1) et (3) : le financement mezzanine est le dernier stade du capital-risque, juste avant l'introduction en bourse, pas celui d'une start-up sans ventes ; et une offre publique secondaire (seasoned offering) porte sur des actions enregistrées vendues au public, pas sur un placement privé décoté.",
      ],

      // Concept 4 — Depository receipts : sponsored/unsponsored et niveaux d'ADR (officielle)
      [
        "A security that represents an equity share in a foreign firm and for which the voting rights are retained by the depository bank, is a(n):",
        ["American depository share.", "global registered share.", "unsponsored depository receipt."],
        2,
        "Dans un certificat de dépôt non parrainé, c'est la banque dépositaire qui conserve les droits de vote des actions sous-jacentes, et non l'investisseur. Une American depositary share est le titre sous-jacent négocié sur le marché domestique de l'émetteur, et une global registered share se négocie directement dans les devises locales sur des bourses du monde entier — ni l'une ni l'autre ne correspond à la description donnée.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai sur les DR (sponsored/unsponsored + niveaux)
      [
        "Which of the following statements about depository receipts (DRs) is least accurate?",
        [
          "A Level I ADR program allows the foreign company to raise new equity capital from U.S. investors in the over-the-counter market.",
          "In a sponsored DR, the foreign company is directly involved in the issuance and the DR investors receive the voting rights.",
          "An unsponsored DR is issued by a depository bank without the involvement of the foreign company.",
        ],
        0,
        "A est faux, donc c'est la réponse : un ADR de niveau I se négocie de gré à gré (OTC) et ne permet PAS de lever de nouveaux capitaux aux États-Unis. Parmi les programmes, seuls le niveau III (coté au NYSE ou au Nasdaq) et la Rule 144A (placement privé auprès d'investisseurs institutionnels qualifiés) permettent de lever du capital ; le niveau II est coté mais ne lève pas de capital non plus. B est exact : dans un DR sponsorisé, la société étrangère participe à l'émission et l'investisseur détient les droits de vote. C est exact : un DR non sponsorisé est émis par la banque dépositaire, qui achète les actions sur le marché domestique sans implication de la société — et c'est elle qui conserve alors les droits de vote.",
      ],
      // Variante plus difficile — choisir le programme qui remplit trois objectifs à la fois + donnée-piège
      [
        "A French company whose shares trade on Euronext Paris wants to set up an ADR program that meets three objectives: the ADRs must be listed on the NYSE, the program must raise new equity capital from U.S. investors, and ADR holders must be able to vote at shareholder meetings. Each ADR will represent two ordinary shares, which currently trade at €38. Which program best meets all three objectives?",
        ["A sponsored Level II ADR program.", "An unsponsored Level III ADR program.", "A sponsored Level III ADR program."],
        2,
        "Il faut vérifier les trois objectifs un par un. Cotation au NYSE : niveaux II ou III (le niveau I est négocié OTC, la Rule 144A est un placement privé non coté). Levée de capitaux : parmi les programmes cotés, seul le niveau III le permet → A (niveau II) est éliminé. Droit de vote des porteurs : il faut un programme sponsorisé, car dans un DR non sponsorisé c'est la banque dépositaire qui conserve le droit de vote → B est éliminé (de plus, une cotation de niveau II ou III exige l'implication de la société, donc un programme sponsorisé). Seul un ADR sponsorisé de niveau III remplit les trois conditions. Le ratio de 2 actions par ADR et le cours de 38 € sont des données-pièges sans incidence sur le choix du programme.",
      ],

      // Concept 5 — Book value of equity et ROE (officielle)
      [
        "The book value of equity is equal to a firm's assets:",
        ["plus its accumulated other comprehensive income.", "plus its retained earnings.", "minus its liabilities."],
        2,
        "La valeur comptable des capitaux propres correspond aux actifs du bilan moins les passifs (Actif − Passif = Capitaux propres). Les réponses A et B ne représentent que des composantes de la variation des capitaux propres, pas la formule complète du bilan.",
      ],
      // Variante angle différent — conséquence d'une émission d'actions sur le ROE (le "pourquoi" de la dilution)
      [
        "A company issues new common shares and holds the proceeds in cash, so that its net income for the period is unaffected. Compared with not issuing the shares, the company's return on equity (ROE) for the period will most likely be:",
        [
          "lower, because the average book value of equity increases while net income does not.",
          "higher, because the cash raised increases the company's total assets.",
          "unchanged, because total assets and equity increase by the same amount.",
        ],
        0,
        "ROE = résultat net / valeur comptable moyenne des capitaux propres. L'émission augmente l'actif (trésorerie) et donc les capitaux propres comptables (actif − passif) du même montant ; le numérateur restant identique, le dénominateur plus élevé fait baisser le ROE : émettre des actions dilue le ROE. B se trompe de grandeur : le total de l'actif n'entre pas dans le ROE (une hausse d'actif sans hausse du résultat ferait d'ailleurs baisser le ROA, pas monter le ROE). C applique mal l'identité du bilan : que l'actif et les capitaux propres augmentent du même montant ne laisse pas le ROE inchangé, puisque seul son dénominateur varie. À l'inverse, un rachat d'actions financé par dette réduit les capitaux propres et augmente le ROE.",
      ],
      // Variante plus difficile — ROE sur capitaux propres moyens après un rachat financé par dette + donnée-piège (capitalisation)
      [
        "At the beginning of the year, a company reported total assets of $900 million and total liabilities of $500 million. During the year, it borrowed $100 million and used the entire amount to repurchase its own common shares. Net income for the year was $48 million, no dividends were paid, and the company has no preferred shares. At year-end, its market capitalization was $1.2 billion. Using the average book value of equity, the company's ROE for the year is closest to:",
        ["4.0%.", "11.3%.", "12.8%."],
        2,
        "Capitaux propres comptables en début d'année = 900 − 500 = 400 M$. Le rachat de 100 M$ réduit les capitaux propres de 100 M$ et le résultat non distribué de 48 M$ les augmente : fin d'année = 400 − 100 + 48 = 348 M$ (vérification : actif 900 + 100 − 100 + 48 = 948 M$, passif 500 + 100 = 600 M$, 948 − 600 = 348 M$). Moyenne = (400 + 348) / 2 = 374 M$, donc ROE = 48 / 374 ≈ 12,8 %. A (4,0 %) divise par la capitalisation boursière (48 / 1 200) : c'est une valeur de marché, pas une valeur comptable — donnée-piège. B (11,3 %) oublie le rachat : fin d'année = 448 M$, moyenne = 424 M$, 48 / 424 ≈ 11,3 %. Le rachat financé par dette réduit les capitaux propres et fait donc monter le ROE.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Equity Page 4...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
