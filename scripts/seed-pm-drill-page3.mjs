// Seed script — quiz de "drill" associé à la page 3 de la fiche PDF Portfolio
// Management (Portfolio Management: An Overview). Structure : pour chacun des
// 7 concepts clés de la page, 1 question officielle (banque de pratique CFA,
// Reading 85, corrigé vérifié contre le PDF "- Answers.pdf" correspondant) +
// 1 variante "angle différent" (même notion, mais jamais un simple changement
// de chiffres menant au même raisonnement) + 1 variante "plus difficile"
// (raisonnement à plusieurs étapes / pièges combinés). Voir memory
// regle-drill-variantes-cfa-hub. Questions en anglais, explications en français.
// Remis au cadre FSA / Equity le 3 octobre 2026 : l'ancienne version avait ses
// énoncés en français, aucun n'a donc pu être repris à l'identique.
// syncQuizSets met le set à jour en place et garde l'historique des énoncés inchangés.
// Usage: node scripts/seed-pm-drill-page3.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Portfolio Management (Système)";

const QUIZ_SETS = [
  {
    title: "Portfolio Management — Drill Fiche Page 3 (Portfolio Management: An Overview)",
    difficulty: 1,
    questions: [
      // Concept 1 — Perspective de portefeuille et ratio de diversification (officielle)
      [
        "In the Markowitz framework, an investor should most appropriately evaluate a potential investment based on its:",
        ["effect on portfolio risk and return.", "expected return.", "intrinsic value compared to market value."],
        0,
        "Le cadre de Markowitz (théorie moderne du portefeuille) impose la perspective de portefeuille : un investissement s'évalue par sa CONTRIBUTION au risque et au rendement du portefeuille global, pas isolément. B est faux : le rendement espéré seul ignore le risque et surtout la corrélation avec le reste du portefeuille ; un actif au rendement modeste peut être précieux s'il est peu corrélé aux autres. C est faux : comparer valeur intrinsèque et prix de marché, c'est l'analyse fondamentale d'un titre pris isolément (approche « stand-alone »), pas l'approche portefeuille.",
      ],
      // Variante angle différent — le ratio de diversification à l'envers : retrouver le risque du portefeuille
      [
        "An equally weighted portfolio has a diversification ratio of 0.40, and the average standard deviation of returns of the securities in the portfolio is 30%. The standard deviation of the portfolio's returns is closest to:",
        ["18%.", "75%.", "12%."],
        2,
        "Ratio de diversification = σ du portefeuille équipondéré / σ moyen des titres pris isolément. On inverse : σ portefeuille = 0,40 × 30 % = 12 %. A (18 %) est le piège de lecture : 30 % × (1 − 0,40) traite le ratio comme un pourcentage de réduction du risque, alors que c'est directement le rapport entre les deux écarts-types. B (75 %) inverse la formule (30 % / 0,40) : un portefeuille diversifié ne peut pas être plus risqué que le titre moyen, le ratio est toujours ≤ 1 (= 1 seulement si les titres sont parfaitement corrélés).",
      ],
      // Variante plus difficile — comparer deux portefeuilles : calcul + lecture du ratio + piège « moins de risque = moins de rendement »
      [
        "Two equally weighted portfolios each hold 10 stocks with an average standard deviation of returns of 25%. Portfolio J has a standard deviation of returns of 24%, and Portfolio K has a standard deviation of returns of 11%. Which statement is most accurate?",
        [
          "Portfolio J has the better diversification ratio, 0.96, because a ratio close to 1 indicates the greatest diversification benefit.",
          "Portfolio K's diversification ratio is 0.44, which suggests lower return correlations among its stocks than in Portfolio J; this lower risk does not necessarily come at the cost of a lower expected return.",
          "Portfolio K's diversification ratio is 2.27, and its lower risk implies that its expected return must also be lower than Portfolio J's.",
        ],
        1,
        "J : 24 / 25 = 0,96 ; K : 11 / 25 = 0,44. Plus le ratio est BAS, plus la diversification est efficace (= 1 → aucun bénéfice, cas de titres parfaitement corrélés). Les titres ayant le même σ moyen, l'écart vient des corrélations : celles de K sont plus faibles. Et diversifier réduit le risque SANS réduire nécessairement le rendement espéré (le E(R) d'un portefeuille équipondéré est la moyenne des E(R), indépendante des corrélations). A inverse la lecture du ratio. C inverse la formule (25 / 11 = 2,27) et commet le piège de la fiche : les portefeuilles réduisent le risque bien plus qu'ils ne changent le rendement.",
      ],

      // Concept 2 — Les 3 étapes du processus : planning, execution, feedback (officielle)
      [
        "Which of the following actions is best described as taking place in the execution step of the portfolio management process?",
        ["Rebalancing the portfolio.", "Developing an investment policy statement.", "Choosing a target asset allocation."],
        2,
        "Les 3 étapes : (1) planning = analyse des besoins et contraintes de l'investisseur, rédaction de l'IPS ; (2) execution = choix de l'allocation d'actifs cible, analyse des titres (top-down ou bottom-up), construction du portefeuille ; (3) feedback = suivi et rééquilibrage, mesure et reporting de la performance. A est faux : le rebalancing relève du feedback, jamais de l'execution. B est faux : l'IPS est le cœur de l'étape de planning (c'est la première étape du processus).",
      ],
      // Variante angle différent — comparer deux moments : où se fixe le benchmark, où s'en sert-on ?
      [
        "A portfolio manager and a new client agree on a benchmark for the client's portfolio. One year later, the manager compares the portfolio's return with the return on that benchmark. These two activities are part of, respectively, the:",
        ["planning step and the feedback step.", "execution step and the feedback step.", "planning step and the execution step."],
        0,
        "Le benchmark se choisit dès le planning (il figure dans l'IPS) : c'est ce qui permettra plus tard de juger la gestion. Comparer ensuite la performance réalisée au benchmark est la mesure de performance, qui relève du feedback. B se trompe sur la première activité : l'execution porte sur l'allocation, la sélection de titres et la construction du portefeuille, pas sur le choix de la référence. C se trompe sur la seconde : la mesure de performance n'est jamais de l'execution.",
      ],
      // Variante plus difficile — classer quatre activités d'un même mandat, avec les deux pièges de la fiche
      [
        "For a new client, a portfolio manager: (1) analyzes the client's risk tolerance and liquidity needs and drafts an investment policy statement; (2) sets a target allocation of 60% equities and 40% bonds; (3) uses top-down analysis to select securities and constructs the portfolio; (4) after an equity rally, sells equities to restore the 60/40 mix and reports performance against the benchmark. Which classification of these activities is correct?",
        [
          "(1) and (2) planning; (3) execution; (4) feedback.",
          "(1) planning; (2), (3), and (4) execution.",
          "(1) planning; (2) and (3) execution; (4) feedback.",
        ],
        2,
        "(1) Besoins, contraintes et IPS = planning. (2) Fixer l'allocation cible 60/40 = execution (l'allocation d'actifs est la première décision d'exécution, pas du planning). (3) Analyse top-down, sélection des titres, construction = execution. (4) Rééquilibrer et mesurer la performance = feedback. A tombe dans le premier piège de la fiche : classer l'allocation d'actifs en planning. B tombe dans le second : classer le rebalancing et la mesure de performance en execution, alors qu'ils relèvent toujours du feedback.",
      ],

      // Concept 3 — Les besoins des différents types d'investisseurs (officielle)
      [
        "The investment needs of a property and casualty insurance company are most likely different from the investment needs of a life insurance company with respect to:",
        ["risk tolerance.", "time horizon.", "liquidity needs."],
        1,
        "Un assureur dommages (P&C) paie des sinistres qui surviennent vite et de façon imprévisible : son horizon est COURT. Un assureur vie paie des prestations lointaines et actuariellement prévisibles : son horizon est LONG. A est faux : les deux types d'assureurs ont une tolérance au risque faible (ils doivent pouvoir honorer leurs engagements envers les assurés). C est faux : les deux ont des besoins de liquidité relativement élevés. D'où la case « Long/court » pour l'assurance dans la fiche.",
      ],
      // Variante angle différent — le POURQUOI du profil d'une banque (liquidité ≠ tolérance au risque)
      [
        "Which of the following best explains why banks typically have low risk tolerance and high liquidity needs?",
        [
          "Their investment horizon is perpetual, so they must preserve capital for future generations.",
          "Their liabilities are mostly deposits that can be withdrawn on short notice, and losses on their securities portfolio could leave them unable to repay depositors.",
          "They are legally required to pay out a minimum percentage of their assets to beneficiaries each year.",
        ],
        1,
        "Le profil d'une banque découle de son passif : des dépôts exigibles à tout moment. Il faut pouvoir vendre vite (liquidité très élevée) et ne pas subir de pertes qui l'empêcheraient de rembourser les déposants (tolérance au risque faible) ; son horizon est donc court. A décrit un endowment, dont l'horizon perpétuel justifie au contraire un risque élevé et une liquidité très faible : c'est le piège de la fiche, qui oppose banque et endowment. C décrit une obligation de distribution minimale, contrainte légale typique d'une fondation, pas d'une banque.",
      ],
      // Variante plus difficile — reconnaître trois investisseurs à partir de leur passif et comparer leurs besoins
      [
        "Consider three institutional investors. Investor X has a perpetual horizon and spends about 4% of its assets each year. Investor Y's liabilities are mostly checking and savings deposits. Investor Z insures homes and cars and pays claims within months of the insured events. Which statement is most accurate?",
        [
          "Investor Y has the lowest liquidity needs, because deposits are a stable source of funding, while Investor X needs high liquidity to fund its annual spending.",
          "Investor Z can tolerate more risk than Investor X, because the premiums it collects provide a steady inflow of cash.",
          "Investor X has the highest risk tolerance and the lowest liquidity needs; Investors Y and Z both have low risk tolerance and high liquidity needs, and Z has a shorter horizon than a life insurer would.",
        ],
        2,
        "X = endowment (horizon perpétuel, faible taux de distribution) : tolérance au risque élevée, liquidité très faible. Y = banque : dépôts retirables à tout moment, donc liquidité très élevée et risque faible. Z = assureur dommages (P&C) : sinistres rapides, donc horizon court (plus court qu'un assureur vie), liquidité élevée, risque faible. A inverse les profils : les dépôts sont exigibles à vue, ce n'est pas un financement « stable » au sens de la liquidité, et 4 % de distribution annuelle ne crée pas un besoin de liquidité élevé. B est faux : un assureur doit pouvoir payer des sinistres imprévisibles, sa tolérance au risque est faible, bien en dessous de celle d'un endowment.",
      ],

      // Concept 4 — DB vs DC : qui porte le risque (officielle)
      [
        "Promised payments to pension beneficiaries are a responsibility of the plan sponsor in:",
        [
          "a defined benefit plan only.",
          "both a defined benefit plan and a defined contribution plan.",
          "a defined contribution plan only.",
        ],
        0,
        "Dans un régime à prestations définies (DB), l'employeur (plan sponsor) promet une rente, souvent fonction du salaire et de l'ancienneté : verser cette rente est SA responsabilité, quelle que soit la performance des actifs. Dans un régime à cotisations définies (DC), aucune prestation n'est promise : l'employeur verse des cotisations sur un compte individuel, et la retraite dépend de la performance de ce compte. B et C sont donc faux, puisqu'un régime DC ne comporte aucun versement promis.",
      ],
      // Variante angle différent — appliquer la règle à un cas : des rendements décevants, qui en subit les conséquences ?
      [
        "Over several years, pension plan assets earn returns well below expectations. Which statement best describes who bears the consequences?",
        [
          "The employer in both types of plan, because it sponsors and contributes to both.",
          "The employees in both types of plan, because pension benefits are ultimately paid to employees.",
          "In a defined contribution plan, the employees, whose retirement balances are smaller; in a defined benefit plan, the employer, which must contribute more to fund the promised benefits.",
        ],
        2,
        "C'est la question « qui porte le risque d'investissement ? » vue par ses conséquences. En DC, l'obligation de l'employeur s'arrête une fois les cotisations versées : de mauvais rendements réduisent directement le capital retraite de l'employé. En DB, la rente est garantie : si les actifs sous-performent, l'employeur doit combler le déficit par des cotisations supplémentaires. A oublie que l'employeur d'un régime DC n'a rien promis au-delà de ses cotisations. B oublie qu'en DB la prestation promise ne baisse pas avec la performance des actifs.",
      ],
      // Variante plus difficile — reconnaître deux régimes à leur description, avec risque de longévité et piège du « menu de fonds »
      [
        "Firm R promises each employee an annual pension equal to 1.5% of final salary for each year of service. Firm S contributes 6% of each employee's salary to an individual account, and each employee chooses among a menu of funds selected by Firm S. Which statement is most accurate?",
        [
          "If plan assets underperform or retirees live longer than expected, Firm R must cover the shortfall, whereas Firm S's obligation ends once its contributions are made.",
          "Both are defined contribution plans, because in both cases the employer makes contributions to the plan.",
          "In Firm S's plan, the employer bears the investment risk, because it selected the menu of funds offered to employees.",
        ],
        0,
        "R promet une prestation (1,5 % du salaire final par année de service) : c'est un régime DB, l'employeur porte le risque d'investissement ET le risque de longévité (une rente plus longue à payer si les retraités vivent plus longtemps). S fixe la cotisation (6 %) : c'est un régime DC, son obligation s'éteint une fois les cotisations versées. B confond les deux : ce qui définit le régime, c'est ce qui est garanti (la prestation en DB, la cotisation en DC), pas le fait que l'employeur cotise. C est le piège : proposer un menu de fonds ne transfère pas le risque à l'employeur, c'est l'employé qui choisit ses placements et en supporte le résultat.",
      ],

      // Concept 5 — L'industrie de la gestion d'actifs : actif vs passif (officielle)
      [
        "Which of the following statements about active and passive asset management is most accurate?",
        [
          "Active management has been gaining market share over time versus passive management.",
          "Passive management’s share of industry revenues is smaller than its share of assets under management.",
          "Active management may use fundamental analysis, technical analysis, or a “smart beta” approach to outperform a chosen benchmark.",
        ],
        1,
        "La gestion passive facture des frais bien plus bas que la gestion active : sa part des revenus du secteur est donc plus petite que sa part des actifs gérés. A est faux : c'est la gestion PASSIVE qui gagne des parts de marché au fil du temps (l'active reste majoritaire, environ 4/5 du marché selon la fiche, mais elle recule). C est faux à cause du « smart beta » : c'est une stratégie PASSIVE, qui suit un indice construit sur un facteur de risque spécifique ; analyse fondamentale et technique relèvent bien, elles, de la gestion active.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai sur la structure du secteur (buy-side, specialist, multi-boutique)
      [
        "Which of the following statements about the asset management industry is least accurate?",
        [
          "A specialist asset manager offers a broad range of asset classes and investment styles to its clients.",
          "Asset managers are buy-side firms, while the broker-dealers that sell trading and research services to them are sell-side firms.",
          "A multi-boutique firm is a holding company that owns several specialist asset managers.",
        ],
        0,
        "A est l'affirmation fausse : offrir une large gamme de classes d'actifs et de styles, c'est la définition d'un gérant FULL-SERVICE. Un specialist se concentre au contraire sur une stratégie ou une classe d'actifs particulière. B est exacte : les gérants d'actifs sont le buy-side (ils achètent des titres et des services pour leurs clients), les brokers-dealers le sell-side (ils leur vendent exécution et recherche). C est exacte : une multi-boutique est une holding qui regroupe plusieurs specialists, chacun gardant sa spécialité.",
      ],
      // Variante plus difficile — calculer la part de revenus de la gestion passive (pièges : part d'actifs, rapport de frais)
      [
        "In an asset management market, passive strategies account for 40% of assets under management and charge an average fee of 0.10% of assets per year, while active strategies account for the remaining 60% and charge an average fee of 0.70%. Passive management's share of the industry's total fee revenue is closest to:",
        ["40.0%.", "8.7%.", "12.5%."],
        1,
        "Pour 100 d'actifs : revenus passifs = 40 × 0,10 % = 0,04 ; revenus actifs = 60 × 0,70 % = 0,42 ; total = 0,46. Part du passif = 0,04 / 0,46 = 8,7 %. C'est la mécanique de la question officielle : des frais plus bas rendent la part des revenus (8,7 %) bien inférieure à la part des actifs (40 %). A (40 %) confond part des actifs et part des revenus. C (12,5 %) ne compare que les taux de frais, 0,10 / (0,10 + 0,70), en oubliant de pondérer par les actifs gérés.",
      ],

      // Concept 6 — Fonds ouverts, fermés et ETF : prix et NAV (officielle)
      [
        "Open-end mutual funds differ from closed-end funds in that:",
        [
          "open-end funds stand ready to redeem their shares, while closed-end funds do not.",
          "closed-end funds require active management, while open-end funds do not.",
          "open-end funds issue shares that are then traded in secondary markets, while closed-end funds do not.",
        ],
        0,
        "Un fonds ouvert émet de nouvelles parts ou rachète les parts existantes selon la demande des investisseurs, à la NAV de clôture. Un fonds fermé a un nombre de parts FIXE, qui s'échangent en bourse comme des actions : le fonds ne les rachète pas. B est faux : les deux types de fonds peuvent être gérés activement ou passivement, ce n'est pas ce qui les distingue. C inverse la réalité : ce sont les parts des fonds FERMÉS qui se négocient sur le marché secondaire ; celles d'un fonds ouvert s'achètent et se revendent auprès du fonds lui-même.",
      ],
      // Variante angle différent — le POURQUOI de l'écart à la NAV : ETF proche, fonds fermé avec prime ou décote
      [
        "Which of the following best explains why exchange-traded fund shares usually trade close to their NAV, while closed-end fund shares can trade at a significant premium or discount to NAV?",
        [
          "ETF shares can only be bought and sold at the NAV calculated at the end of each trading day.",
          "Authorized participants can create or redeem ETF shares in exchange for baskets of the underlying securities, so arbitrage limits any gap, whereas a closed-end fund's number of shares is fixed.",
          "ETF shares cannot be sold short or bought on margin, which prevents speculation from pushing their price away from NAV.",
        ],
        1,
        "Le mécanisme de création/rachat en nature des ETF permet aux participants autorisés d'arbitrer : si l'ETF cote au-dessus de sa NAV, ils créent des parts (en livrant les titres sous-jacents) et les vendent ; s'il cote en dessous, ils rachètent des parts et les échangent contre les titres. L'écart reste donc faible. Un fonds fermé n'a pas ce mécanisme : nombre de parts fixe, prix fixé par l'offre et la demande, d'où primes et décotes durables. A décrit un fonds OUVERT : un ETF se négocie en continu au prix du marché. C est faux : les ETF peuvent être vendus à découvert et achetés sur marge, comme des actions.",
      ],
      // Variante plus difficile — choisir le véhicule qui remplit trois critères à la fois
      [
        "An investor is choosing among an open-end mutual fund, a closed-end fund, and an exchange-traded fund that hold similar portfolios. She wants to (1) be able to trade at any time during the trading day, (2) avoid paying a price materially different from the fund's NAV, and (3) limit the taxable capital gains distributions she receives while she holds the fund. Which vehicle best meets all three objectives?",
        ["The open-end mutual fund.", "The closed-end fund.", "The exchange-traded fund."],
        2,
        "On teste chaque véhicule sur les trois critères. Fonds ouvert : (2) oui, on traite à la NAV, mais (1) non, le prix n'est fixé qu'une fois par jour, à la clôture, et (3) non, il distribue les plus-values réalisées quand il vend des titres pour honorer les rachats. Fonds fermé : (1) oui, il cote en continu, mais (2) non, il peut traiter avec une prime ou une décote importante. ETF : (1) cotation continue, (2) l'arbitrage maintient le prix près de la NAV, (3) les rachats en nature limitent les distributions de plus-values (fiche : « pas de distrib. »). Seul l'ETF remplit les trois.",
      ],

      // Concept 7 — SMA, hedge funds, private equity (buyout), venture capital (officielle)
      [
        "A pooled investment fund buys all the shares of a publicly traded company. The fund reorganizes the company and replaces its management team. Three years later, the fund exits the investment through an initial public offering of the company's shares. This pooled investment fund is best described as a(n):",
        ["event-driven fund.", "private equity fund.", "venture capital fund."],
        1,
        "Racheter une société cotée en entier (la retirer de la cote), la réorganiser, changer l'équipe dirigeante puis sortir au bout de 3 à 5 ans (ici par une IPO) : c'est un fonds de private equity de type buyout. A est faux : un fonds event-driven est un hedge fund qui prend des positions autour d'événements (fusions, acquisitions), sans prendre le contrôle de l'entreprise. C est faux : le venture capital finance des start-ups, pas le rachat d'une société cotée établie.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai sur les SMA (piège du minimum d'investissement)
      [
        "Which of the following statements about separately managed accounts (SMAs) is least accurate?",
        [
          "In an SMA, the investor directly owns the individual securities in the account.",
          "An SMA can be tailored to the investor's specific tax situation and investment restrictions.",
          "An SMA typically requires a lower minimum investment than a mutual fund.",
        ],
        2,
        "C est l'affirmation fausse, et c'est l'erreur fréquente signalée par la fiche : un SMA exige un minimum d'investissement PLUS ÉLEVÉ qu'un fonds mutuel, puisqu'il est géré pour un seul investisseur. A est exacte : contrairement à un véhicule collectif, le portefeuille appartient directement à l'investisseur. B est exacte : c'est justement l'avantage d'un compte individuel, qui peut intégrer la fiscalité et les restrictions propres au client.",
      ],
      // Variante plus difficile — reconnaître un fonds de VC malgré une donnée-piège qui évoque un hedge fund
      [
        "A pooled investment fund takes minority equity stakes in a large number of early-stage companies, uses little or no borrowing, and expects most of its investments to fail while a few succeed spectacularly. The fund is open only to qualified investors, with a minimum investment of $500,000. This fund is best described as a:",
        [
          "venture capital fund, which, compared with a buyout fund, holds more and smaller positions and uses much less leverage.",
          "buyout fund, because it takes equity stakes in private companies and is restricted to qualified investors.",
          "hedge fund, because it is lightly regulated, restricted to qualified investors, and has a high minimum investment.",
        ],
        0,
        "Les caractéristiques décisives : beaucoup de petites participations dans de jeunes entreprises, peu ou pas de dette, la majorité des investissements échouent et quelques succès font la performance. C'est le profil du venture capital. Un fonds de buyout (B) fait l'inverse : peu de participations, des sociétés établies rachetées en entier avec beaucoup de dette. La réserve aux investisseurs qualifiés et le minimum de 500 000 $ sont la donnée-piège : ils rappellent les hedge funds (C), mais ils sont communs à la plupart des véhicules alternatifs et ne permettent pas de les distinguer.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Portfolio Management Page 3...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
