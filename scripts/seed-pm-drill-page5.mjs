// Seed script — quiz de "drill" associé à la page 5 de la fiche PDF Portfolio
// Management (The Behavioral Biases of Individuals). Structure : pour chacun
// des 6 concepts clés de la page, 1 question officielle (banque de pratique
// CFA, Reading 87 « The Behavioral Biases of Individuals », bonne réponse
// vérifiée dans le corrigé « - Answers.pdf ») + 1 variante "angle différent"
// (même notion, jamais un simple changement de chiffres ou de formulation)
// + 1 variante "plus difficile" (plusieurs étapes / pièges combinés).
// Voir memory regle-drill-variantes-cfa-hub. Questions en anglais,
// explications en français.
// Remis au cadre le 3 octobre 2026 : l'ancienne version (énoncés traduits en
// français) est remplacée. Les QCM imprimés dans le PDF ne sont pas repris.
// syncQuizSets met le set à jour en place et garde l'historique de réponses
// de tout énoncé inchangé (comparaison sur le texte exact).
// Usage: node scripts/seed-pm-drill-page5.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Portfolio Management (Système)";

const QUIZ_SETS = [
  {
    title: "Portfolio Management — Drill Fiche Page 5 (The Behavioral Biases of Individuals)",
    difficulty: 2,
    questions: [
      // Concept 1 — Erreurs cognitives vs biais émotionnels : origine et correction (officielle, Reading 87 Q8)
      [
        "Compared to emotional biases, cognitive errors are more likely to be:",
        ["difficult to overcome.", "mitigated by information.", "related to intuition or impulses."],
        1,
        "Les erreurs cognitives viennent surtout d'un raisonnement défaillant (mauvaise maîtrise des statistiques, erreur de traitement de l'information, raisonnement illogique, erreur de mémoire) : on peut donc les réduire par une meilleure information, de la formation ou une simple prise de conscience — on les corrige (mitigate). A décrit au contraire les biais émotionnels : nés hors de la pensée consciente, ils sont difficiles à surmonter, d'où la nécessité fréquente de s'en accommoder (accommodate). C décrit aussi les biais émotionnels, qui proviennent de sentiments, d'impulsions ou de l'intuition.",
      ],
      // Variante angle différent — le cas limite d'un biais à double composante : sur quoi agir, et pourquoi
      [
        "A bias such as overconfidence can have both cognitive and emotional elements. When an adviser tries to overcome a bias that has both components, success is most likely if the adviser focuses on:",
        [
          "the emotional component, because it is the more deeply rooted part of the bias.",
          "neither component, because any bias with an emotional element can only be accommodated.",
          "the cognitive component, because faulty reasoning can be corrected with better information or education.",
        ],
        2,
        "Un même biais peut combiner des éléments cognitifs et émotionnels (l'overconfidence en est l'exemple type). Pour le surmonter, on a plus de chances de réussir en s'attaquant à sa composante COGNITIVE : un raisonnement défaillant se corrige par l'information et l'éducation, alors qu'une réaction émotionnelle résiste. A prend le problème à l'envers : la composante émotionnelle est justement la plus difficile à faire bouger, la viser en priorité réduit les chances de succès. B est trop radical : la présence d'un élément émotionnel n'empêche pas de corriger la part cognitive ; on ne s'accommode que de ce qui résiste réellement.",
      ],
      // Variante plus difficile — trois clients : identifier chaque biais, le classer, puis choisir corriger vs s'accommoder
      [
        "An adviser reviews three clients. Client X estimates a stock's value by starting from last year's price and adjusting it only slightly, but revises his estimate once the adviser walks him through the company's new fundamentals. Client Y refuses to sell shares inherited from her father, although she admits she would never buy them with new money today. Client Z feels much worse about a $10,000 loss than he feels good about a $10,000 gain, and keeps holding his losing positions even after the adviser explains the statistics to him. Which approach is most appropriate?",
        [
          "Mitigate the biases of Clients X and Y through education, because anchoring and endowment are both errors in valuing a security; accommodate only Client Z's loss aversion.",
          "Mitigate Client X's anchoring through information, and accommodate Client Y's endowment bias and Client Z's loss aversion, which are emotional biases.",
          "Accommodate Client X's anchoring, because it is rooted in intuition, and mitigate the biases of Clients Y and Z, because endowment and loss aversion are information-processing errors.",
        ],
        1,
        "Client X ancre son estimation sur le cours de l'an dernier et l'ajuste trop peu : c'est l'anchoring and adjustment, une erreur cognitive de traitement de l'information. Le fait qu'il révise dès qu'on lui explique les fondamentaux confirme qu'elle se corrige par l'information (mitigate). Client Y garde des actions héritées qu'elle n'achèterait jamais avec de l'argent neuf : c'est l'endowment bias (la question « l'achèteriez-vous aujourd'hui ? » est précisément le test qui le révèle), un biais émotionnel. Client Z souffre davantage d'une perte que d'un gain de même montant et garde ses positions perdantes malgré les explications : loss aversion, émotionnelle elle aussi. Pour Y et Z, l'information ne suffit pas : il faudra plutôt s'en accommoder (par exemple en adaptant l'allocation). A range à tort l'endowment parmi les erreurs cognitives : qu'il porte sur la valeur d'un titre n'en fait pas une erreur de raisonnement — c'est un attachement affectif à ce qu'on possède. C inverse tout : l'anchoring est cognitif (corrigeable), et ni l'endowment ni la loss aversion ne sont des erreurs de traitement de l'information.",
      ],

      // Concept 2 — Biais de persévérance des croyances (belief perseverance) (officielle, Reading 87 Q6)
      [
        "Which of the following cognitive errors are best described as belief persistence biases?",
        [
          "Conservatism, representativeness, and hindsight biases.",
          "Mental accounting, framing, and availability biases.",
          "Illusion of control, confirmation, and anchoring and adjustment biases.",
        ],
        0,
        "Les biais de persévérance des croyances (belief perseverance) sont cinq erreurs cognitives : conservatism, confirmation, representativeness, illusion of control et hindsight. A ne contient que des biais de cette famille. B regroupe trois biais de traitement de l'information (mental accounting, framing, availability). C est le piège : illusion of control et confirmation sont bien des biais de persévérance, mais l'anchoring and adjustment est un biais de traitement de l'information — un seul intrus suffit à rendre la réponse fausse.",
      ],
      // Variante angle différent — le POURQUOI du regroupement : la dissonance cognitive
      [
        "Conservatism, confirmation, representativeness, illusion of control, and hindsight biases are grouped together as belief perseverance biases because they all:",
        [
          "reflect a reluctance to abandon prior beliefs: to reduce cognitive dissonance, individuals discount information that conflicts with what they already believe.",
          "stem from feelings and impulses rather than conscious thought, which makes them difficult to correct.",
          "arise from the way information is presented or mentally sorted into categories, rather than from beliefs the individual already holds.",
        ],
        0,
        "Ce qui unit ces cinq biais, c'est la dissonance cognitive : quand une information contredit une croyance, l'individu ressent un inconfort qu'il réduit plus facilement en dévalorisant l'information (sa source, sa pertinence, sa portée) qu'en abandonnant sa croyance. D'où une réticence irrationnelle à réviser ses conclusions passées. B décrit les biais émotionnels ; or ces cinq biais sont des erreurs COGNITIVES, donc corrigeables par l'information. C décrit l'autre famille d'erreurs cognitives, les biais de traitement de l'information : le framing (manière dont l'information est présentée) et le mental accounting (manière dont on la range dans des comptes séparés).",
      ],
      // Variante plus difficile — reconnaître trois biais de persévérance dans des cas, avec le piège illusion of control vs overconfidence
      [
        "An adviser describes three investors. Investor 1 buys a fund after its manager has outperformed the market for two years, concluding that the manager must be skilled. Investor 2 holds 40% of his portfolio in his employer's stock because he believes his own work helps determine how the stock performs. Investor 3, after a market crash, insists that she “always knew” the market was overvalued, although she remained fully invested until the crash. Which statement is most accurate?",
        [
          "Investor 1 exhibits availability bias and Investor 3 exhibits confirmation bias; only Investor 2 exhibits a belief perseverance bias (illusion of control).",
          "Investors 1 and 3 exhibit belief perseverance biases, but Investor 2 exhibits overconfidence, an emotional bias that is harder to correct.",
          "All three exhibit belief perseverance biases: representativeness (sample-size neglect), illusion of control, and hindsight, respectively.",
        ],
        2,
        "Investisseur 1 : conclure au talent d'un gérant sur deux années seulement, c'est tirer une conclusion d'un échantillon minuscule — sample-size neglect, une forme de representativeness. Investisseur 2 : croire que son propre travail influence le cours de l'action de son employeur, c'est croire contrôler un résultat qu'on ne contrôle pas — illusion of control, qui conduit typiquement à surpondérer l'action de son employeur (sous-diversification). Investisseur 3 : « je le savais depuis le début » alors qu'elle est restée investie, c'est le hindsight bias. Les trois sont des biais de persévérance des croyances. A se trompe deux fois : rien n'indique que l'investisseur 1 se fonde sur une information facile à se remémorer (availability), et l'investisseur 3 ne recherche pas d'informations confirmant son avis (confirmation) : elle réécrit après coup ce qu'elle croyait savoir. B est le piège : l'overconfidence (biais émotionnel) consiste à surestimer ses capacités de raisonnement ou de prévision ; ici, l'investisseur 2 croit agir sur le résultat lui-même, ce qui définit l'illusion of control (erreur cognitive).",
      ],

      // Concept 3 — Biais de traitement de l'information (anchoring, mental accounting, framing, availability) (officielle, Reading 87 Q4)
      [
        "Which of the following behavioral biases is most likely related to information processing?",
        ["Loss aversion.", "Status quo.", "Anchoring and adjustment."],
        2,
        "L'anchoring and adjustment est une erreur cognitive de traitement de l'information : on part d'une valeur de référence (l'ancre) et on l'ajuste insuffisamment. Les biais de traitement de l'information sont l'anchoring, le mental accounting, le framing et l'availability. A (loss aversion) et B (status quo) sont des biais émotionnels : ils naissent de sentiments (douleur de la perte, confort de la situation existante), pas d'une erreur dans l'analyse de l'information.",
      ],
      // Variante angle différent — non plus classer, mais remédier : le remède du mental accounting
      [
        "An investor keeps an inheritance in low-risk bonds “to protect what my parents worked so hard to save,” while trading speculative stocks in a separate account funded by his annual bonuses. Which action would most directly address the bias he exhibits?",
        [
          "Asking him to keep a written record of the reasons for each trade and to review it against actual outcomes.",
          "Evaluating all of his accounts together as a single portfolio, so that asset allocation and diversification are decided at the total-portfolio level.",
          "Presenting the potential outcomes of each account as gains rather than as losses.",
        ],
        1,
        "Ranger l'argent dans des « comptes » distincts selon sa provenance (héritage placé prudemment d'un côté, primes spéculées de l'autre), c'est le mental accounting. Sa conséquence : chaque compte est géré isolément, sans tenir compte des corrélations entre eux, et le portefeuille global n'est ni optimal ni correctement diversifié. Le remède est d'AGRÉGER tous les comptes et de raisonner au niveau du portefeuille total. A (tenir un registre écrit des raisons de chaque opération et le confronter aux résultats) vise plutôt l'overconfidence ou le hindsight. C (présenter les résultats comme des gains plutôt que des pertes) agit sur la présentation, donc sur le framing ou la loss aversion — cela ne réunit pas les comptes.",
      ],
      // Variante plus difficile — trois comportements à identifier, avec les pièges framing vs loss aversion et anchoring vs conservatism
      [
        "Consider three investor behaviors. (1) Asked to estimate the fair value of a stock, an investor starts from its 52-week high of $80 and adjusts slightly downward, without analyzing the company. (2) An investor rejects a portfolio described as having “a 20% chance of losing money in any given year” but accepts the same portfolio when it is described as having “an 80% chance of not losing money in any given year.” (3) An investor rates airline stocks as very risky because a plane crash received heavy news coverage last week. Which statement is most accurate?",
        [
          "Behaviors (1), (2), and (3) illustrate anchoring and adjustment, framing, and availability, respectively; all three are information-processing errors.",
          "Behavior (2) illustrates loss aversion, an emotional bias, because the investor reacts to the idea of losing money; only behaviors (1) and (3) are information-processing errors.",
          "Behavior (1) illustrates conservatism and behavior (3) illustrates representativeness; only behavior (2) is an information-processing error.",
        ],
        0,
        "(1) Partir du plus haut sur 52 semaines (80 $), un chiffre de référence arbitraire, et l'ajuster un peu sans analyse : anchoring and adjustment. (2) Le portefeuille est IDENTIQUE dans les deux cas (20 % de chances de perdre = 80 % de chances de ne pas perdre) ; seule la présentation change, et la décision s'inverse : c'est le framing. (3) Juger un secteur très risqué à cause d'un accident très médiatisé la semaine précédente : availability (on surpondère l'information récente et facile à se remémorer). Les trois sont des erreurs cognitives de traitement de l'information. B est le piège : la loss aversion porte sur des pertes et des gains réels ; ici, les deux descriptions désignent exactement les mêmes résultats, c'est donc la seule formulation — le framing, biais cognitif — qui fait basculer la décision. C se trompe sur (1), qui n'est pas du conservatism (il n'y a pas de prévision antérieure que l'investisseur refuserait de réviser face à une information nouvelle, mais une ancre arbitraire), et sur (3), qui ne relève pas de la representativeness (aucun classement dans une catégorie, mais un événement récent et marquant).",
      ],

      // Concept 4 — Les six biais émotionnels (officielle, Reading 87 Q13)
      [
        "Which of the following are considered emotional biases?",
        ["Confirmation, control, and availability biases.", "Status quo and endowment biases.", "Anchoring and adjustment bias."],
        1,
        "Les six biais émotionnels sont la loss aversion, l'overconfidence, le self-control, le status quo, l'endowment et la regret aversion. B cite deux d'entre eux : le status quo (confort de la situation existante, inertie) et l'endowment (valoriser davantage ce qu'on possède déjà). A ne contient que des erreurs cognitives : confirmation et illusion of control (persévérance des croyances), availability (traitement de l'information). C (anchoring and adjustment) est une erreur cognitive de traitement de l'information.",
      ],
      // Variante angle différent — partir d'un comportement et reconnaître le biais émotionnel (piège : self-control ≠ endowment ni loss aversion)
      [
        "A 45-year-old client with a high income saves almost nothing, spends heavily on luxury goods, and keeps saying he will “start saving for retirement next year.” He now plans to invest his small savings in very risky assets to catch up before retirement. Which bias best explains this behavior?",
        ["Self-control bias.", "Endowment bias.", "Loss-aversion bias."],
        0,
        "Privilégier la satisfaction immédiate (dépenses de luxe) au détriment d'un objectif de long terme (la retraite), en repoussant sans cesse l'effort d'épargne : c'est le self-control bias. Sa conséquence typique est exactement celle décrite : une épargne insuffisante, que l'investisseur tente ensuite de compenser en prenant trop de risque. B (endowment) supposerait qu'il survalorise un actif parce qu'il le possède déjà — rien de tel ici. C (loss aversion) supposerait qu'il cherche à éviter de réaliser une perte ou à se « refaire » après une baisse ; or il n'a subi aucune perte : le risque excessif vient d'un retard d'épargne, pas d'une perte à effacer. C'est le piège de la fiche : self-control ≠ endowment ni loss aversion.",
      ],
      // Variante plus difficile — trois clients, trois biais émotionnels, avec les confusions illusion of control / loss aversion / conservatism
      [
        "An adviser notes the following about three clients. Client 1 credits his own stock-picking skill for his gains, blames bad luck for his losses, and trades frequently. Client 2 has never changed the default allocation of her retirement plan in 15 years, despite major changes in her circumstances. Client 3 has not bought equities in years because she fears she would blame herself if they fell after she bought them, and when she does invest, she buys only the funds that most of her friends own. Which statement is most accurate?",
        [
          "Client 1 exhibits illusion of control, a cognitive error; Client 2 exhibits status quo bias; and Client 3 exhibits loss aversion.",
          "Client 1 exhibits overconfidence reinforced by self-attribution, Client 2 exhibits status quo bias, and Client 3 exhibits regret aversion, including herding; all three are emotional biases.",
          "Client 1 exhibits overconfidence, Client 2 exhibits conservatism, a cognitive error, and Client 3 exhibits regret aversion.",
        ],
        1,
        "Client 1 s'attribue les gains et impute les pertes à la malchance : c'est le self-attribution bias, qui nourrit l'overconfidence (d'où les transactions trop fréquentes). Client 2 ne touche jamais à l'allocation par défaut de son plan malgré des changements de situation : status quo bias (confort de l'existant, force de l'option par défaut). Client 3 n'agit pas de peur de se reprocher une erreur d'action et suit ses amis : regret aversion, dont le herding est une forme. Les trois sont des biais émotionnels. A se trompe sur le client 1 — croire influencer un résultat (illusion of control) n'est pas la même chose que s'attribuer le mérite des gains et rejeter la faute des pertes — et sur le client 3, qui n'a aucune perte à éviter de réaliser : elle redoute le regret d'avoir agi. C confond status quo et conservatism : le conservatism consiste à ne pas réviser une prévision ou une opinion face à une information nouvelle ; ici, il n'y a pas de prévision, seulement l'inertie d'une allocation par défaut.",
      ],

      // Concept 5 — Conséquences sur le portefeuille : sous-diversification et home bias (officielle, Reading 87 Q5)
      [
        "Evidence that investors hold portfolios that are less diversified than traditional finance would suggest may be best explained by:",
        ["fear of regret.", "anchoring.", "overconfidence."],
        2,
        "L'overconfidence (surestimer ses capacités de raisonnement ou de prévision) conduit à sous-estimer le risque, à trop trader et à sous-diversifier : l'investisseur qui croit savoir quels titres vont surperformer ne voit pas l'utilité de diversifier. A (fear of regret) explique plutôt que des investisseurs sceptiques restent investis dans un marché surévalué, de peur de rater la hausse. B (anchoring) pousse à croire que les plus hauts récents sont des prix rationnels même quand les cours commencent à baisser. À noter (fiche) : l'illusion of control et le confirmation bias contribuent aussi à la sous-diversification, mais ils ne figurent pas parmi les choix.",
      ],
      // Variante angle différent — un autre écart à la finance traditionnelle (home bias), sous l'angle de ce qui N'EN EST PAS une explication
      [
        "Investors tend to hold a much larger share of domestic stocks than a global market-capitalization-weighted portfolio would suggest. Which of the following is least likely to be offered as an explanation for this home bias?",
        [
          "A belief that they have better access to information about domestic companies.",
          "An emotional preference for investing in companies “closer to home.”",
          "Compensation for additional risk borne by domestic stocks, as captured by a multifactor model.",
        ],
        2,
        "Le home bias (surpondérer les entreprises de son pays, ou de sa région) s'explique par un avantage informationnel PERÇU (A : l'investisseur pense mieux connaître les entreprises proches) ou par un confort psychologique, l'envie d'investir « près de chez soi » (B). C n'est pas une explication du home bias : la rémunération d'un risque supplémentaire capté par un modèle multifactoriel est l'explication rationnelle (Fama-French) de la surperformance des value stocks. Le home bias, lui, réduit la diversification sans contrepartie de rendement : il n'est pas présenté comme la rémunération d'un risque.",
      ],
      // Variante plus difficile — un cas qui combine sous-diversification, home bias régional et une donnée-piège (le rendement passé)
      [
        "Paul works for a regional bank and holds 50% of his portfolio in its shares; most of the rest is invested in other companies headquartered in his region. He says that his own work at the bank helps determine how its shares perform, he reads only the bank's upbeat internal reports, and he likes owning companies he “sees every day.” His portfolio has returned 12% a year over the past three years. Which statement is most accurate?",
        [
          "His concentration in the bank reflects illusion of control and confirmation bias, and his regional tilt reflects home bias; his strong recent returns do not make the portfolio adequately diversified.",
          "His concentration in the bank is best explained by representativeness, and his regional tilt by mental accounting, because he keeps his employer's shares separate from the rest of his holdings.",
          "His concentration reflects illusion of control, but his regional tilt is not home bias, because home bias concerns only the choice between domestic and foreign markets.",
        ],
        0,
        "Trois éléments à relier. (1) La concentration sur l'action de la banque : Paul croit que son propre travail détermine la performance du titre (illusion of control) et ne lit que les rapports internes favorables (confirmation bias) — exactement le couple que la fiche associe à la sous-diversification. (2) La surpondération des entreprises de sa région : c'est du home bias, qui couvre aussi la préférence pour sa propre RÉGION au sein d'un pays, motivée ici par un confort psychologique (« des entreprises que je vois tous les jours »). (3) Les 12 % annuels sur trois ans sont une donnée-piège : un bon rendement passé ne rend pas diversifié un portefeuille concentré. B tombe dans le piège de la fiche : la sous-diversification relève de l'illusion of control et du confirmation bias, pas de la representativeness ; et rien n'indique du mental accounting (il ne traite pas son argent différemment selon sa provenance). C se trompe sur la définition du home bias, qui s'applique aussi à la préférence régionale à l'intérieur d'un même pays.",
      ],

      // Concept 6 — Implications de marché : bulles, momentum, value vs growth (officielle, Reading 87 Q16)
      [
        'With respect to asset "bubbles":',
        [
          "behavioral finance provides an overall explanation.",
          "anchoring may cause investors to mitigate bubbles by reducing their market exposure.",
          "hindsight bias can fuel overconfidence.",
        ],
        2,
        "Avec le hindsight bias, les investisseurs s'attribuent le mérite des hausses passées (« je savais que ça monterait »), ce qui alimente l'overconfidence — l'un des mécanismes avancés pour expliquer les bulles (avec la self-attribution, la confirmation, l'anchoring et la regret aversion). A est faux : la finance comportementale n'apporte PAS d'explication globale des bulles ; elle identifie seulement des biais qui peuvent y contribuer. B inverse l'effet de l'anchoring : en ancrant les investisseurs sur les plus hauts récents, considérés comme des prix rationnels, il les garde investis alors que les cours ou les fondamentaux commencent à baisser — il entretient la bulle au lieu de l'atténuer.",
      ],
      // Variante angle différent — une autre anomalie (value vs growth) : comparer l'explication rationnelle et l'explication comportementale
      [
        "Value stocks have historically outperformed growth stocks. Which of the following correctly pairs a traditional-finance explanation with a behavioral-finance explanation of this pattern?",
        [
          "Traditional: analysts neglect value stocks, which creates persistent mispricing. Behavioral: home bias leads investors to overweight value stocks.",
          "Traditional: value stocks bear additional risk captured by size and book-to-market factors. Behavioral: the halo effect leads investors to overvalue growth stocks with rapid growth and rising prices.",
          "Traditional: the halo effect leads investors to overvalue growth stocks with rapid growth and rising prices. Behavioral: value stocks bear additional risk captured by size and book-to-market factors.",
        ],
        1,
        "La surperformance historique des value stocks reçoit deux lectures. Finance traditionnelle (rationnelle) : Fama et French montrent qu'en ajoutant des facteurs taille et book-to-market, l'excès de rendement disparaît — c'est la rémunération d'un risque supplémentaire. Finance comportementale : le halo effect, forme de representativeness, étend les qualités d'une entreprise (croissance rapide, cours en hausse) à la conclusion que c'est un bon titre à détenir, ce qui conduit à surpayer les growth stocks. C intervertit les deux étiquettes. A est faux des deux côtés : un mispricing persistant dû au manque de suivi des analystes n'est pas une explication rationnelle (il suppose une inefficience), et le home bias concerne la préférence géographique, pas le style value/growth.",
      ],
      // Variante plus difficile — une bulle complète : momentum, hindsight, et le piège « bien documenté = pas une anomalie »
      [
        "During a three-year rally in technology stocks, the following were observed: (1) investors kept buying the stocks that had risen the most over the past year, many saying they bought because their friends had and they did not want to miss further gains; (2) after the rally ended in a crash, many investors claimed the crash had been obvious; (3) some commentators argued that because such episodes are extensively documented, the rally and crash should not be considered anomalies. Which statement is most accurate?",
        [
          "(1) is consistent with momentum fueled by regret aversion (herding) and availability bias; (2) reflects hindsight bias, which can fuel overconfidence in the next cycle; and the commentators in (3) are wrong.",
          "(1) reflects home bias; (2) reflects confirmation bias; and the commentators in (3) are right, because a well-documented pattern cannot be an anomaly.",
          "(1) is consistent with momentum fueled by regret aversion (herding) and availability bias; (2) reflects hindsight bias; and the commentators in (3) are right, because behavioral finance provides an overall explanation for bubbles and crashes.",
        ],
        0,
        "(1) Acheter les titres qui ont le plus monté parce que ses amis l'ont fait et qu'on ne veut pas rater la suite : comportement de momentum, alimenté par la regret aversion (dont le herding) et par l'availability (on surpondère les performances récentes, faciles à se remémorer) ; le hindsight y contribue aussi. (2) Affirmer après coup que le krach était évident : hindsight bias, qui nourrit l'overconfidence lors du cycle suivant. (3) Les commentateurs ont tort : qu'un phénomène soit abondamment documenté ne le rend pas conforme à la finance traditionnelle — bulles et krachs restent des anomalies. B se trompe sur (1) (le home bias concerne la préférence géographique, pas l'achat des gagnants récents) et sur (2) (il n'y a pas de recherche sélective d'informations, mais une réécriture du passé), et valide à tort (3). C identifie bien (1) et (2), mais valide (3) avec un argument faux : la finance comportementale ne fournit PAS d'explication globale des bulles et des krachs.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Portfolio Management Page 5...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
