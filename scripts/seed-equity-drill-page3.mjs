// Seed script — quiz de "drill" associé à la page 3 de la fiche PDF Equity
// (Market Efficiency). Structure : pour chacun des 5 concepts clés de la
// page, 1 question officielle (banque de pratique CFA, Reading 43, corrigé
// vérifié contre le PDF "- Answers.pdf" correspondant) + 1 variante "angle
// différent" (même notion, mais jamais un simple changement de chiffres
// menant au même raisonnement) + 1 variante "plus difficile" (raisonnement à
// plusieurs étapes / pièges combinés). Voir memory regle-drill-variantes-cfa-hub.
// Questions en anglais, explications en français.
// Les questions officielles sont recopiées à l'identique : syncQuizSets
// retrouve l'historique de réponses en comparant le texte exact de l'énoncé.
// Usage: node scripts/seed-equity-drill-page3.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Equity (Système)";

const QUIZ_SETS = [
  {
    title: "Equity — Drill Fiche Page 3 (Market Efficiency)",
    difficulty: 2,
    questions: [
      // Concept 1 — Market value vs intrinsic value : seule la surprise fait bouger le prix (officielle)
      [
        "Hume Inc. announces fourth quarter earnings per share of $1.20, which is 15% higher than last year. Hume's earnings are equal to the consensus analyst forecast for the quarter. Assuming markets are efficient, the announcement will most likely cause the price of Hume's stock to:",
        ["decrease.", "increase.", "remain the same."],
        2,
        "Sur un marché efficient, le cours intègre déjà les anticipations de bénéfices. Le bénéfice annoncé étant exactement égal au consensus des analystes, le prix ne devrait pas varier. Seule une SURPRISE par rapport aux attentes du marché (et non la variation en niveau absolu de +15%) affecte le prix.",
      ],
      // Variante angle différent — la VITESSE et la forme de l'ajustement après une vraie surprise
      [
        "A company unexpectedly announces that it has won a major long-term contract. In an informationally efficient market, the behavior of the company's stock price is best described as:",
        [
          "a rapid adjustment to the new information, with no systematic overreaction or underreaction in the days that follow.",
          "a gradual adjustment over the following weeks, as investors take time to analyze the implications of the contract.",
          "no change, because in an efficient market the stock price always equals its intrinsic value.",
        ],
        0,
        "L'annonce est INATTENDUE : elle modifie la valeur intrinsèque, et le prix doit s'y ajuster aussitôt pour que l'écart prix/valeur intrinsèque reste nul « en permanence, même juste après une annonce ». Après ce saut, les variations suivantes sont imprévisibles (pas de dérive dans un sens ou dans l'autre). B décrit une sous-réaction (ajustement lent), signe typique d'inefficience. C confond « prix = valeur intrinsèque » avec « prix immobile » : c'est justement parce que la valeur intrinsèque change que le prix doit bouger (contrairement au cas Hume, où l'information était déjà anticipée).",
      ],
      // Variante plus difficile — lire les écarts avant/après une annonce, avec un piège sur la taille de la hausse
      [
        "Before an earnings announcement, an analyst estimates the intrinsic value of Lark Co. stock at $40, while the stock trades at $36. Lark then reports earnings well above the consensus forecast. The analyst raises her intrinsic value estimate to $44, and the stock price immediately rises to $43. Assuming the analyst's intrinsic value estimates are correct, which statement is most accurate?",
        [
          "The stock was overvalued by $4 before the announcement and is fairly valued after it.",
          "The stock is still undervalued by $1 after the announcement, which is inconsistent with a perfectly efficient market.",
          "The $7 price increase exceeded the $4 increase in intrinsic value, so the market overreacted to the earnings surprise.",
        ],
        1,
        "Avant : valeur intrinsèque 40 $ > cours 36 $ → titre SOUS-évalué de 4 $. Après : 44 − 43 = 1 $ → toujours sous-évalué de 1 $. Sur un marché parfaitement efficient, l'écart devrait être nul à tout moment, avant comme après l'annonce. A inverse le sens (valeur intrinsèque > cours = sous-évaluation, pas surévaluation) et oublie l'écart résiduel de 1 $. C est le piège : le cours a monté de 43 − 36 = 7 $ contre 44 − 40 = 4 $ pour la valeur intrinsèque, mais 3 $ de la hausse ne font que combler la sous-évaluation initiale ; le cours (43 $) reste SOUS la valeur intrinsèque (44 $), il n'y a donc aucune sur-réaction.",
      ],

      // Concept 2 — Ce qui augmente / réduit l'efficience d'un marché (officielle)
      [
        "A market's efficiency is most likely to decrease by:",
        ["substantial analyst coverage of exchange-listed companies.", "a ban on short selling.", "high volumes of trading activity."],
        1,
        "Interdire la vente à découvert empêche les investisseurs informés de corriger les titres surévalués, ce qui réduit l'efficience du marché. A (couverture analyste) et C (volumes élevés) contribuent au contraire à AMÉLIORER l'efficience.",
      ],
      // Variante angle différent — le POURQUOI du mécanisme de la vente à découvert
      [
        "Which of the following best explains why restrictions on short selling tend to reduce a market's efficiency?",
        [
          "They prevent arbitrageurs from buying securities they believe are undervalued, so positive information reaches prices more slowly.",
          "They prevent investors from selling shares they already own, which reduces liquidity.",
          "Investors who believe a security is overvalued but do not own it cannot act on that view, so negative information is reflected in prices more slowly and prices can stay above intrinsic value.",
        ],
        2,
        "La vente à découvert permet à ceux qui jugent un titre surévalué SANS le détenir de le vendre, ce qui fait baisser le cours vers sa valeur intrinsèque. Sans elle, seuls les détenteurs peuvent exprimer une vue négative : l'information défavorable s'intègre plus lentement et les surévaluations persistent. A se trompe de sens : la vente à découvert sert à corriger les titres SURévalués ; acheter un titre sous-évalué ne nécessite aucune vente à découvert. B confond vente à découvert et vente classique : une interdiction de vente à découvert n'empêche jamais de vendre des titres que l'on possède déjà.",
      ],
      // Variante plus difficile — évaluer plusieurs réformes, dont une contre-intuitive (insider trading)
      [
        "A regulator is considering four reforms: (1) lifting a ban on short selling; (2) a cap that reduces brokerage commissions and exchange fees; (3) barring foreign investors from owning domestic shares; (4) stricter enforcement of laws against trading on material nonpublic information. Which reforms would most likely increase the market's efficiency?",
        ["1, 2, and 4 only.", "1 and 2 only.", "2, 3, and 4 only."],
        0,
        "(1) Autoriser la vente à découvert permet de corriger les surévaluations → augmente l'efficience. (2) Des coûts de transaction plafonnés rendent l'arbitrage rentable sur des écarts plus petits → augmente. (3) Exclure une catégorie d'investisseurs réduit le nombre de participants qui analysent et arbitrent → RÉDUIT l'efficience. (4) Pénaliser l'insider trading est le piège : on pourrait croire qu'il « retire de l'information » des prix, mais il garantit un accès équitable à l'information, ce qui entretient la confiance et la participation des investisseurs → augmente l'efficience. B oublie donc (4). C inclut (3), qui réduit l'efficience, et écarte (1) en voyant à tort la vente à découvert comme une source de déstabilisation.",
      ],

      // Concept 3 — Les 3 formes de l'EMH et leur emboîtement (officielle)
      [
        "An analyst with Guffman Investments has developed a stock selection model based on earnings announcements made by companies with high P/E stocks. The model predicts that investing in companies with P/E ratios twice that of their industry average that make positive earnings announcements will generate significant excess return. If the analyst has consistently made superior risk-adjusted returns using this strategy, which form of the efficient market hypothesis has been violated?",
        ["Strong, semistrong, and weak forms.", "Semistrong and strong forms only.", "Weak form only."],
        1,
        "Le ratio P/E et les annonces de résultats sont des informations PUBLIQUES ; générer de façon constante des rendements supérieurs en les exploitant viole la forme semi-forte (et donc la forme forte, plus restrictive). La forme faible (fondée sur les données de prix/volume historiques) n'est pas nécessairement violée par cette stratégie.",
      ],
      // Variante angle différent — l'emboîtement dans l'autre sens : ce qu'IMPLIQUE l'efficience semi-forte pour l'analyse et la gestion
      [
        "If a market is semi-strong-form efficient, which of the following is most accurate?",
        [
          "Active managers who rely on fundamental analysis of publicly available information should not consistently earn positive risk-adjusted abnormal returns, which favors a passive strategy.",
          "Technical analysis may still earn abnormal returns, because the semi-strong form concerns only public information other than past prices and trading volume.",
          "Investors trading on material nonpublic information cannot earn abnormal returns.",
        ],
        0,
        "L'analyse fondamentale suppose un marché semi-strong INEFFICIENT ; si la forme semi-forte tient, toute l'information publique est déjà dans les prix : l'analyse fondamentale ne procure pas de rendement anormal ajusté du risque, et la gestion passive (moins coûteuse) bat la gestion active. B oublie l'emboîtement : l'information publique INCLUT les prix et volumes passés, donc semi-strong efficient ⇒ weak efficient ⇒ l'analyse technique ne fonctionne pas non plus. C décrit la forme FORTE : l'efficience semi-forte n'implique pas que l'information privée soit dans les prix, donc un initié peut encore battre le marché.",
      ],
      // Variante plus difficile — trois résultats empiriques à combiner, avec piège sur le sens de l'emboîtement
      [
        "A researcher studying an equity market finds the following: (1) trading rules based solely on past prices and trading volume fail to earn abnormal returns after transaction costs; (2) stock prices continue to drift in the direction of earnings surprises for several weeks after the announcement, and a strategy exploiting this drift earns positive risk-adjusted returns net of costs; (3) corporate insiders earn abnormal returns on their trades. Based only on this evidence, the market is most likely:",
        [
          "inefficient in all three forms, because a violation of the semi-strong form implies a violation of the weak form.",
          "efficient in the weak and semi-strong forms, but not in the strong form.",
          "efficient in the weak form, but not in the semi-strong or strong forms.",
        ],
        2,
        "(1) Les règles fondées uniquement sur les prix/volumes passés échouent → la forme faible tient. (2) Une stratégie fondée sur une information PUBLIQUE (la surprise de résultats) bat le marché après risque et coûts → la forme semi-forte est violée, et donc aussi la forme forte. (3) Les initiés battent le marché → la forme forte est violée (déjà impliqué par 2). A inverse l'emboîtement : violer la semi-strong entraîne la violation de la strong, mais JAMAIS forcément celle de la weak (et le résultat 1 montre justement qu'elle tient). B ne retient que le résultat (3) et ignore la dérive post-annonce exploitable, qui contredit la forme semi-forte.",
      ],

      // Concept 4 — Les anomalies de marché (officielle)
      [
        "If the momentum effect persists over time, it would provide evidence against which of the following forms of market efficiency?",
        ["Semistrong form only.", "Weak form only.", "Both weak form and semistrong form."],
        2,
        "L'effet momentum suggère qu'il est possible de réaliser des rendements anormaux en utilisant uniquement des données de marché passées. Les trois formes d'efficience supposent que les prix reflètent pleinement les données de marché historiques ; un momentum persistant contredirait donc à la fois la forme faible ET la forme semi-forte.",
      ],
      // Variante angle différent — une autre anomalie, sous l'angle de son explication (ce qui N'EN EST PAS une)
      [
        "Which of the following is least likely to be offered as an explanation for the January effect?",
        [
          "Tax-loss selling of losing stocks in December, followed by repurchases in January.",
          "The release in early January of new fundamental information about small companies.",
          "Window dressing by portfolio managers who sell risky or losing positions before year-end reporting dates.",
        ],
        1,
        "L'effet janvier (rendements anormalement élevés, surtout des petites capitalisations, en début d'année) n'est jamais attribué à une information nouvelle : c'est une anomalie de CALENDRIER. Les deux explications classiques sont des flux de transactions sans lien avec l'information : le tax-loss selling (A — vendre ses titres perdants en décembre pour constater une moins-value fiscale, puis racheter en janvier) et le window dressing (C — les gérants « nettoient » leur portefeuille avant la date de reporting, puis reprennent leurs positions en janvier).",
      ],
      // Variante plus difficile — une anomalie ne prouve l'inefficience que si elle survit au risque et aux coûts, ET il faut la bonne forme
      [
        "A researcher documents three patterns in an equity market: (1) small-cap stocks earn unusually high returns in the first days of January, but a strategy designed to exploit this pattern earns no excess return after transaction costs; (2) stocks with low P/E and low market-to-book ratios outperform stocks with high ratios on a raw-return basis, but the difference disappears once returns are adjusted for risk using a multifactor model; (3) stocks with the highest returns over the past 12 months continue to outperform over the next 6 months, even after adjusting for risk and transaction costs. Which of these patterns, as described, provide evidence against weak-form market efficiency?",
        ["Pattern 3 only.", "Patterns 1 and 3 only.", "Patterns 2 and 3 only."],
        0,
        "Une anomalie n'est une preuve d'inefficience que si elle procure des rendements anormaux APRÈS ajustement du risque ET des coûts de transaction. (1) L'effet janvier disparaît après coûts → pas de preuve d'inefficience. (2) L'effet value disparaît une fois le risque correctement mesuré : c'est une rémunération du risque, pas une anomalie — et de toute façon P/E et market-to-book reposent sur des données comptables publiques, ce qui concernerait la forme semi-forte, pas la faible. (3) Le momentum survit au risque et aux coûts, et il n'utilise que les rendements passés → il contredit la forme faible (et donc aussi la semi-forte). B oublie le filtre des coûts pour le motif (1) ; C oublie l'ajustement du risque pour le motif (2) et se trompe de forme.",
      ],

      // Concept 5 — Biais comportementaux : loss aversion, disposition, conservatism (officielle)
      [
        "An investor who is more risk averse with respect to potential negative outcomes than potential positive outcomes most likely exhibits which behavioral finance characteristic?",
        ["Conservatism.", "Loss aversion.", "Mental accounting."],
        1,
        "L'aversion aux pertes (loss aversion) se manifeste par une aversion au risque ASYMÉTRIQUE : l'investisseur déteste davantage une perte potentielle qu'il n'apprécie un gain équivalent. Le mental accounting (C) concerne le classement mental des investissements en comptes séparés ; le conservatism (A) désigne le maintien d'opinions antérieures malgré de nouvelles informations.",
      ],
      // Variante angle différent — à l'envers : partir du biais et reconnaître le comportement (vs simple aversion au risque)
      [
        "Which of the following investor statements is most consistent with loss aversion?",
        [
          "\"I would rather receive a guaranteed $1,000 than take a 50% chance of receiving $2,000 and a 50% chance of receiving nothing.\"",
          "\"I will wait for several more quarters of results before changing my view of this company, despite its surprise announcement.\"",
          "\"I would turn down a bet offering a 50% chance to win $1,100 and a 50% chance to lose $1,000, because losing $1,000 would hurt me more than winning $1,100 would please me.\"",
        ],
        2,
        "La loss aversion est une asymétrie entre pertes et gains : une perte fait plus mal qu'un gain équivalent ne fait plaisir. En C, le pari a une espérance POSITIVE (0,5 × 1 100 − 0,5 × 1 000 = +50 $), mais l'investisseur le refuse parce que la perte possible pèse plus lourd que le gain : c'est exactement la loss aversion. A est le piège : préférer 1 000 $ certains à une loterie de même espérance (0,5 × 2 000 = 1 000 $) qui ne comporte AUCUNE perte relève de l'aversion au risque classique de la finance traditionnelle, pas de l'aversion aux pertes. B décrit le conservatism (réviser trop lentement son opinion face à une information nouvelle).",
      ],
      // Variante plus difficile — identifier deux biais dans un cas ET leur effet sur les prix
      [
        "An adviser describes two clients. Client 1 quickly sold a stock that had risen 12% since purchase, but has held another stock that has fallen 35% for two years because \"it will come back to what I paid for it.\" Client 2, after a company announced an unexpected major contract win, left her earnings forecast for the company almost unchanged, preferring to wait for more evidence. Which statement is most accurate?",
        [
          "Client 1 exhibits conservatism; Client 2 exhibits the disposition effect, a bias that tends to make prices overreact to new information.",
          "Client 1 exhibits the disposition effect; Client 2 exhibits conservatism, a bias that tends to make prices underreact to new information.",
          "Client 1 exhibits the disposition effect; Client 2 exhibits loss aversion, a bias that tends to make prices underreact to new information.",
        ],
        1,
        "Client 1 se précipite pour réaliser un gain et évite de réaliser une perte en s'accrochant à son prix d'achat : c'est l'effet de disposition. Client 2 ne révise presque pas sa prévision malgré une information nouvelle et importante : c'est le conservatism, qui fait réagir le marché trop lentement (sous-réaction : le prix rattrape progressivement l'information). A intervertit les deux biais et se trompe sur l'effet (le conservatism produit une sous-réaction, pas une sur-réaction). C identifie bien le client 1, mais le client 2 n'a aucune perte en jeu : son comportement n'a rien à voir avec la loss aversion — qui, elle, sert plutôt à expliquer la sur-réaction (overreaction).",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Equity Page 3...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
