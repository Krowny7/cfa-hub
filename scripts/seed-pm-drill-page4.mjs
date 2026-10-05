// Seed script — quiz de "drill" associé à la page 4 de la fiche PDF Portfolio
// Management (Basics of Portfolio Planning and Construction). Structure : pour
// chacun des 5 concepts clés de la page (page dense : un concept par encadré),
// 1 question officielle (banque de pratique CFA, Reading 86, corrigé vérifié
// contre le PDF "- Answers.pdf" correspondant) + 1 variante "angle différent"
// (même notion, mais jamais un simple changement de chiffres menant au même
// raisonnement) + 1 variante "plus difficile" (raisonnement à plusieurs étapes
// / pièges combinés). Voir memory regle-drill-variantes-cfa-hub. Questions en
// anglais, explications en français.
// Remis au cadre FSA / Equity le 3 octobre 2026 : l'ancienne version avait ses
// énoncés en français, aucun n'a donc pu être repris à l'identique.
// syncQuizSets met le set à jour en place et garde l'historique des énoncés inchangés.
// Ramené à 5 concepts (15 questions) le 5 octobre 2026, à la demande de
// l'utilisateur : concepts d'origine 1, 3, 6 retirés de la fiche, leurs
// questions rangées dans « Réserve — <titre> » (syncQuizSets, rien d'effacé).
// Usage: node scripts/seed-pm-drill-page4.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Portfolio Management (Système)";

const QUIZ_SETS = [
  {
    title: "Portfolio Management — Drill Fiche Page 4 (Basics of Portfolio Planning and Construction)",
    difficulty: 2,
    questions: [
      // Concept 1 — Les composantes de l'IPS (officielle)
      [
        "Brian Nebrik, CFA, meets with a new investment management client. They compose a statement that defines each of their responsibilities concerning this account and choose a benchmark index with which to evaluate the account's performance. Which of these items should be included in the client's Investment Policy Statement (IPS)?",
        ["Both of these items.", "Only one of these items.", "Neither of these items."],
        0,
        "Les deux éléments font partie des composantes majeures d'un IPS : le statement of duties and responsibilities (devoirs et responsabilités du gérant et du client, dans le corps de l'IPS) et le benchmark d'évaluation de la performance. Un IPS type comprend aussi : la description du client, l'objet de l'IPS, les procédures de mise à jour, les objectifs, les contraintes et les investment guidelines. B et C sont donc faux.",
      ],
      // Variante angle différent — reconnaître une section à son contenu : les investment guidelines
      [
        "A section of a pension plan's IPS states that the manager may use derivatives only for hedging, may not use leverage, and may not invest in tobacco companies. This section is best described as the:",
        ["statement of duties and responsibilities.", "investment guidelines.", "investment objectives."],
        1,
        "« Comment la politique sera exécutée » (usage du levier et des dérivés, actifs exclus) : c'est la définition des investment guidelines, piège signalé par la fiche. A est faux : le statement of duties and responsibilities dit QUI fait quoi (gérant, client, dépositaire), pas comment investir. C est faux : les objectifs portent sur le risque et le rendement visés, pas sur les instruments autorisés.",
      ],
      // Variante plus difficile — ce qui va en annexe, et POURQUOI
      [
        "Which of the following items are most likely to be placed in appendices to the IPS rather than in its main body, and why? (1) The strategic asset allocation (policy portfolio). (2) The statement of duties and responsibilities. (3) The rebalancing policy. (4) The investment constraints.",
        [
          "(1), (2), and (3), because they are technical details that the client does not need to approve.",
          "(2) and (4) only, because they are specific to the client and must be kept confidential.",
          "(1) and (3) only, because they are likely to change more often than the rest of the IPS, so placing them in appendices avoids revising the main document.",
        ],
        2,
        "Les annexes contiennent la SAA (le policy portfolio) et la politique de rebalancing. Elles peuvent devoir être modifiées plus souvent que le reste (par exemple quand les anticipations de marché changent) : les mettre en annexe évite de réécrire le corps de l'IPS à chaque fois. A est faux : le statement of duties and responsibilities fait partie du corps de l'IPS, et l'allocation stratégique doit bien être approuvée par le client. B est faux : les devoirs et les contraintes sont au cœur du document, pas relégués en annexe, et la confidentialité n'a rien à voir avec ce choix.",
      ],

      // Concept 2 — Willingness vs ability to take risk (officielle)
      [
        "Based on a questionnaire about investment risk, an advisor concludes that an investor's risk tolerance is high, but based on an analysis of the client's income needs and time horizon, he concludes the investor's risk tolerance is low. The most appropriate action for the advisor is to:",
        ["emphasize stocks over bonds.", "emphasize bonds over stocks.", "educate the client about investment risk and re-administer the questionnaire."],
        1,
        "Le questionnaire mesure la WILLINGNESS (subjective, psychologique) : élevée. L'analyse des besoins de revenus et de l'horizon mesure l'ABILITY (objective, financière) : faible. Règle : on retient la plus basse des deux, donc une tolérance faible, et un portefeuille qui privilégie les obligations. A suivrait la willingness et exposerait le client à un risque qu'il n'a pas les moyens de supporter. C est faux : refaire passer le questionnaire ne change rien à la capacité financière du client, qui est le facteur limitant ici.",
      ],
      // Variante angle différent — distinguer la nature des deux notions (subjectif vs objectif)
      [
        "Which of the following is most likely to indicate a client's willingness, rather than her ability, to bear risk?",
        [
          "Her net worth is large relative to her annual spending needs.",
          "She does not expect to need withdrawals from the portfolio for 25 years.",
          "She says she would sell all of her equities if the stock market fell by 10%.",
        ],
        2,
        "La willingness est SUBJECTIVE : elle tient à la psychologie et aux attitudes de l'investisseur, comme sa réaction déclarée face à une baisse du marché. L'ability est OBJECTIVE : elle dépend de la situation financière. A (patrimoine élevé par rapport aux dépenses) et B (horizon long, l'ability augmente avec l'horizon) sont des facteurs financiers objectifs, donc des indicateurs de la capacité à prendre du risque, pas de la volonté.",
      ],
      // Variante plus difficile — le cas inverse (ability élevée, willingness faible) + donnée-piège du rendement souhaité
      [
        "Ana Ruiz, 35, has a stable high income, substantial wealth relative to her spending needs, and no need to draw on her portfolio for 30 years. In 2020 she sold all of her equities after a 15% market drop, and she says that portfolio losses keep her awake at night. She also states that she wants to earn 10% per year. Ruiz's overall risk tolerance is best described as:",
        [
          "high, because her ability to bear risk is high and objective financial analysis should take precedence over her emotions.",
          "low, because her willingness to bear risk is low and the lower of ability and willingness should prevail; the adviser may explain the trade-offs but should not try to change her attitude toward risk.",
          "high, because a 10% return objective can only be met with a large allocation to equities.",
        ],
        1,
        "Ability : ÉLEVÉE (revenu stable, patrimoine important, horizon de 30 ans). Willingness : FAIBLE (vente panique en 2020, pertes mal vécues). La règle d'or s'applique dans les deux sens : on retient la plus basse, donc une tolérance faible. Le conseiller peut expliquer l'arbitrage risque/rendement, mais son rôle n'est pas de changer la willingness du client. A applique la règle à moitié : l'ability ne prime que lorsqu'elle est la plus basse des deux. C est la donnée-piège : un rendement souhaité ne détermine pas la tolérance au risque, c'est l'inverse ; si 10 % est incompatible avec une tolérance faible, c'est l'objectif de rendement qu'il faut revoir.",
      ],

      // Concept 3 — Les 5 contraintes : horizon, fiscalité, liquidité, légal, circonstances particulières (officielle)
      [
        "Davis Samuel, CFA, is meeting with one of his portfolio management clients, Joseph Pope, to discuss Pope's investment constraints. Samuel has established that:\n\n• Pope plans to retire from his job as a bond salesman in 17 years, after which this portfolio will be his primary source of income.\n\n• Pope has sufficient cash available that he will not need this portfolio to generate cash outflows until he retires.\n\n• Pope, as a registered securities representative, is required to have Samuel send a copy of his account statements to the compliance officer at Pope's employer.\n\n• Pope opposes certain policies of the government of Lower Pannonia and does not wish to own any securities of companies that do business with its regime.\n\nTo complete his assessment of Pope's investment constraints, Samuel still needs to inquire about Pope's:",
        ["tax concerns.", "unique circumstances.", "liquidity needs."],
        0,
        "On range chaque information dans l'une des 5 contraintes : retraite dans 17 ans = time horizon ; pas besoin de liquidités avant la retraite = liquidity ; relevés envoyés au compliance officer de son employeur = legal and regulatory ; refus d'investir dans les sociétés liées à la Lower Pannonia = unique circumstances. Il reste une seule contrainte non traitée : la fiscalité (tax), ni la situation fiscale de Pope ni le statut fiscal du compte n'étant abordés. B est déjà couvert par le quatrième point (le refus lié à la Lower Pannonia), C par le deuxième (aucun besoin de liquidités avant la retraite).",
      ],
      // Variante angle différent — repérer l'intrus : un rendement minimum classé à tort en contrainte
      [
        "The following items appear under 'Constraints' in a private client's IPS. Which item has been misclassified and actually belongs among the investment objectives?",
        [
          "The client needs $50,000 in cash from the portfolio each year.",
          "The portfolio must earn at least 8% per year to meet the client's goals.",
          "The client does not wish to own shares of companies that test products on animals.",
        ],
        1,
        "Un rendement minimum (« au moins 8 % ») est un objectif de RENDEMENT, pas une contrainte, même s'il est formulé comme une exigence : risque et rendement sont les objectifs de l'IPS, les contraintes sont les 5 autres catégories. A est bien une contrainte de liquidité (besoin de cash régulier). C est bien une contrainte de type unique circumstances (préférence personnelle qui exclut certains titres).",
      ],
      // Variante plus difficile — classer quatre contraintes d'une fondation, dont une exonération fiscale à ne pas oublier
      [
        "A private foundation's IPS notes the following: (1) by law, it must distribute at least 5% of its assets each year; (2) it plans to spend an amount equal to 10% of its assets on a new building in 18 months; (3) its board has decided, in line with the foundation's mission, not to invest in alcohol producers; (4) it is exempt from income taxes. Which statement is most accurate?",
        [
          "(1) is a legal and regulatory constraint, (2) a liquidity constraint, and (3) a unique circumstance; (4) should still be addressed in the tax section of the constraints.",
          "(1) is a liquidity constraint only, because it requires cash payouts, and (4) can be omitted because the foundation pays no taxes.",
          "(1) and (3) are both legal and regulatory constraints, because both restrict how the foundation may invest.",
        ],
        0,
        "(1) Une distribution minimale imposée PAR LA LOI se classe d'abord en legal and regulatory (contrainte qui s'impose à l'investisseur par la loi). (2) Une dépense importante à 18 mois = liquidité. (3) Une exclusion choisie par le conseil, liée à la mission = unique circumstances. (4) L'exonération d'impôt est une information fiscale : elle se mentionne dans la contrainte tax (elle change par exemple l'intérêt des obligations exonérées). B commet deux erreurs : il réduit (1) à la liquidité en oubliant son origine légale, et croit qu'un investisseur exonéré n'a rien à indiquer en fiscalité. C confond une décision interne du conseil (3) avec une obligation légale.",
      ],

      // Concept 4 — SAA, allocation tactique, rebalancing (officielle)
      [
        "An investment manager is most likely to be engaging in tactical asset allocation if she:",
        [
          "allocates more than the targeted 10% to emerging market bonds because the sector appears to be undervalued.",
          "allocates 5% to cash, 20% to fixed income, and 75% to equities based on the investor’s long time horizon and high risk tolerance.",
          "increases the allocation to tax-free bonds because the investor’s effective tax rate has increased.",
        ],
        0,
        "L'allocation tactique (TAA) consiste à s'écarter DÉLIBÉRÉMENT et à court terme de l'allocation stratégique parce qu'une classe ou un secteur paraît mal valorisé : c'est le cas de A (surpondérer les obligations émergentes jugées sous-évaluées). B est de l'allocation STRATÉGIQUE : des poids cibles fixés à partir de l'horizon et de la tolérance au risque du client (IPS). C est aussi une décision stratégique : on met à jour les poids cibles parce que la situation fiscale du client a changé, pas en raison d'une opinion sur la valorisation.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : rebalancing, TAA et core-satellite côte à côte
      [
        "Which of the following statements about portfolio construction is least accurate?",
        [
          "In a core-satellite approach, the core is typically managed passively, while the satellites are managed actively.",
          "Tactical asset allocation deliberately deviates from the strategic asset allocation to exploit perceived short-term opportunities.",
          "Rebalancing is intended to generate alpha by selling asset classes that have become overvalued.",
        ],
        2,
        "C est l'affirmation fausse (piège de la fiche) : le rebalancing RESTAURE les poids stratégiques quand les mouvements de marché les ont fait dériver, pour garder le profil de risque voulu par l'IPS. Il ne repose sur aucune opinion de valorisation et n'est pas un générateur d'alpha : vendre ce qui a monté n'est que la conséquence mécanique du retour aux poids cibles. A est exacte : core-satellite = un cœur passif (la majorité du portefeuille, souvent indiciel) + des satellites gérés activement. B est exacte : la TAA s'écarte délibérément et temporairement de la SAA, alors que le rebalancing y ramène ; ce sont des démarches opposées.",
      ],
      // Variante plus difficile — décomposer un même ordre en rebalancing + allocation tactique
      [
        "A client's strategic asset allocation is 50% equities and 50% bonds, and the IPS permits tactical deviations of up to ±5 percentage points. After a quarter of strong equity returns, the portfolio holds 54% equities. Believing equities are overvalued in the short term, the manager sells equities until they represent 47% of the portfolio. Which statement is most accurate?",
        [
          "The reduction from 54% to 50% restores the strategic weight (rebalancing), while the further reduction from 50% to 47% is a tactical deviation from the strategic asset allocation.",
          "The entire reduction from 54% to 47% is rebalancing, because it moves the portfolio's equity weight back toward its target.",
          "The entire reduction is tactical asset allocation, and the portfolio's strategic allocation to equities is now 47%.",
        ],
        0,
        "On mesure tout par rapport à la SAA (50 %). De 54 % à 50 % : on annule la dérive due au marché, c'est du rebalancing. De 50 % à 47 % : on passe SOUS la cible à cause d'une opinion de court terme, c'est une sous-pondération tactique de 3 points, dans la limite de ±5 points. B est faux : le rebalancing s'arrête à la cible ; aller au-delà n'est plus « revenir » à la SAA. C est faux deux fois : une partie de l'ordre est du rebalancing, et une décision tactique ne modifie jamais la SAA, qui reste à 50 %.",
      ],

      // Concept 5 — Intégration ESG (officielle)
      [
        "Which of the following statements is most accurate about integrating ESG considerations into portfolio planning and construction?",
        [
          "Integrating ESG considerations into portfolio planning and construction is likely to decrease portfolio returns.",
          "Investors who engage in active ownership to pursue their ESG considerations should vote their shares themselves rather than delegating share voting to an investment manager.",
          "A broad market index is an inappropriate benchmark for a portfolio that uses negative screening to address the investor’s ESG concerns.",
        ],
        2,
        "Un portefeuille dont l'univers est réduit par negative screening doit être comparé à un indice qui exclut lui aussi les sociétés ou secteurs écartés ; sinon, l'écart de performance mesurerait l'effet des exclusions, pas la qualité de la gestion. A est faux : l'effet de l'ESG sur la performance est INCERTAIN (restreindre l'univers et payer l'analyse ESG peut coûter, éviter les sociétés mal gouvernées ou exposées aux risques ESG peut rapporter). B est faux : un investisseur engagé (active ownership) peut voter lui-même ou demander à son gérant de voter pour lui.",
      ],
      // Variante angle différent — reconnaître une approche ESG à sa description (best-in-class)
      [
        "An investor wants her equity portfolio to hold only companies whose ESG practices rank in the top 20% of their industry, while keeping exposure to every sector. This ESG approach is best described as:",
        ["negative screening.", "positive screening.", "thematic investing."],
        1,
        "Retenir les sociétés aux MEILLEURES pratiques ESG par rapport à leurs pairs, secteur par secteur, c'est le positive screening (approche best-in-class). A est faux : le negative screening EXCLUT des sociétés ou des secteurs entiers (tabac, armement…) ; ici aucun secteur n'est écarté. C est faux : l'investissement thématique cible un thème précis (énergies propres, eau…), alors que cet investisseur garde une exposition à tous les secteurs.",
      ],
      // Variante plus difficile — deux approches ESG dans un même portefeuille + conséquence sur le benchmark
      [
        "A university endowment excludes tobacco and coal producers from its equity portfolio. It also allocates 5% of its assets to private funds that finance renewable-energy projects and report measurable environmental outcomes alongside financial returns. Which statement is most accurate?",
        [
          "The exclusions are negative screening, the private-fund allocation is impact investing, and the equity portfolio's benchmark should ideally exclude tobacco and coal producers.",
          "Both components are positive screening, and a broad market index remains the appropriate benchmark because the exclusions are small.",
          "The exclusions are a form of active ownership, and the private-fund allocation will necessarily reduce the endowment's returns.",
        ],
        0,
        "Exclure des secteurs = negative screening. Financer des projets avec un impact environnemental MESURABLE, en plus d'un rendement financier = impact investing. Conséquence (question officielle) : l'univers étant réduit, le benchmark actions doit lui aussi exclure le tabac et le charbon. B est faux : exclure des secteurs n'est pas du positive screening, et un indice large reste inadapté même pour des exclusions limitées. C est faux deux fois : l'active ownership consiste à rester actionnaire pour influencer la société (vote, dialogue), pas à l'exclure ; et l'effet de l'ESG sur le rendement est incertain, pas nécessairement négatif.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Portfolio Management Page 4...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
