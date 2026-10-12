// Seed script — quiz de "drill" associé à la page 3 de la fiche PDF Economics
// (Monetary Policy & Geopolitics, Readings 15 et 16). Structure : pour chacun
// des 5 concepts clés de la page, 1 question officielle (banque de pratique CFA,
// Readings 15 et 16, corrigé vérifié contre les PDF "- Answers", recopiée à
// l'identique) + 1 variante "angle différent" (même notion, mais jamais un
// simple changement de chiffres menant au même raisonnement) + 1 variante
// "plus difficile" (raisonnement à plusieurs étapes / pièges combinés /
// notion connexe de la page). Voir memory regle-drill-variantes-cfa-hub.
// Les 5 questions déjà imprimées dans le PDF (R15 Q1, Q24, Q41 ; R16 Q6, Q10)
// ne sont pas reprises. Questions en anglais, explications en français.
// Les questions officielles sont recopiées à l'identique : syncQuizSets
// retrouve l'historique de réponses en comparant le texte exact de l'énoncé.
// Usage: node scripts/seed-economics-drill-page3.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Economics (Système)";

const QUIZ_SETS = [
  {
    title: "Economics — Drill Fiche Page 3 (Monetary Policy & Geopolitics)",
    difficulty: 2,
    questions: [
      // Concept 1 — Outils de la banque centrale et canaux de transmission (officielle, R15 Q34)
      [
        "The open market sale of Treasury securities by the Federal Reserve is least likely to result in:",
        ["increased exports of U.S. goods.", "increased longer-term interest rates.", "a decreased rate of inflation."],
        0,
        "Une vente de titres du Trésor par la Fed retire des réserves au système bancaire : le taux des fonds fédéraux monte et les taux courts comme longs augmentent (B se produit). Des rendements plus élevés attirent les capitaux, le dollar s'apprécie et les biens américains deviennent plus chers pour les étrangers : les exportations BAISSENT (A est donc la conséquence la moins probable, c'est la bonne réponse). La hausse des taux freine la demande agrégée et les prix, donc l'inflation ralentit (C se produit).",
      ],
      // Variante angle différent — raisonnement inverse : retrouver l'action à partir des effets observés
      [
        "Over one quarter, a country's short-term bank lending rates fell, equity prices rose, its currency depreciated, and exporters reported stronger foreign orders. Which central bank action is most consistent with these outcomes?",
        [
          "Selling government securities in the open market and raising the reserve requirement.",
          "Lowering the policy rate and buying government securities in the open market.",
          "Raising the policy rate while buying government securities in the open market.",
        ],
        1,
        "Les quatre effets observés sont ceux d'une politique expansionniste : baisse du taux directeur + achats de titres → réserves ↑ → taux courts bancaires ↓ → prix des actifs ↑ → devise ↓ (rendements domestiques plus faibles, sorties de capitaux) → exportations ↑ (biens moins chers pour les étrangers). A est exactement l'inverse (vente de titres + hausse du coefficient de réserves = restrictif : taux ↑, actifs ↓, devise ↑, exportations ↓). C envoie des signaux contradictoires : une hausse du taux directeur pousse les taux courts et la devise vers le haut, ce qui contredit les résultats observés ; les achats de titres seuls ne suffisent pas à les produire.",
      ],
      // Variante plus difficile — taux neutre + choix de l'outil + effets (piège : comparer à la cible d'inflation, et ne pas aller assez loin)
      [
        "An economy's long-term trend rate of real GDP growth is 2.5% and its central bank targets inflation of 2.0%. Real GDP is currently growing at 4.5%, inflation is running at 3.5%, and the policy rate is 3.5%. The central bank wants to slow growth and bring inflation back to target. Which action and effect is most appropriate?",
        [
          "Leave the policy rate unchanged, because a rate of 3.5% is above the 2.0% inflation target and therefore already contractionary.",
          "Raise the policy rate to 4.0% and sell government securities, which makes policy contractionary and should appreciate the currency.",
          "Raise the policy rate to 5.0% and sell government securities, which makes policy contractionary and should appreciate the currency, lower asset prices, and reduce net exports.",
        ],
        2,
        "Taux neutre = 2,5 % + 2,0 % = 4,5 %. Le taux directeur actuel (3,5 %) est INFÉRIEUR au taux neutre : la politique est donc expansionniste, alors que la croissance (4,5 %) et l'inflation (3,5 %) sont au-dessus de leurs niveaux de long terme. Pour freiner l'économie, il faut passer au-dessus de 4,5 % : à 5,0 % la politique devient restrictive (5,0 % > 4,5 %) → taux bancaires ↑, prix des actifs ↓, devise ↑, exportations nettes ↓. A compare à tort le taux directeur à la cible d'inflation (la référence est le taux neutre). B : 4,0 % reste inférieur à 4,5 %, la politique serait encore expansionniste (simplement moins qu'avant) et non restrictive.",
      ],

      // Concept 2 — Taux neutre et orientation de la politique monétaire (officielle, R15 Q23)
      [
        "An analyst has determined the projected trend rate of real GDP growth is 2.5% and the central bank's inflation target is 2.5%. If the central bank policy rate is 5.0%, monetary policy is most likely:",
        ["neutral.", "expansionary.", "contractionary."],
        0,
        "Taux neutre = croissance réelle tendancielle + cible d'inflation = 2,5 % + 2,5 % = 5,0 %. Le taux directeur (5,0 %) est égal au taux neutre : la politique n'est ni expansionniste ni restrictive. Règle : taux directeur < neutre → expansionniste ; taux directeur > neutre → restrictive ; égalité → neutre.",
      ],
      // Variante angle différent — calcul inversé : retrouver la croissance tendancielle compatible avec une orientation donnée
      [
        "A central bank targets inflation of 2.0% and has set its policy rate at 3.5%. An analyst concludes that monetary policy is expansionary. Which trend rate of real GDP growth is consistent with the analyst's conclusion?",
        ["1.0%.", "1.5%.", "2.0%."],
        2,
        "La politique est expansionniste si taux directeur < neutre = croissance tendancielle + 2,0 %. Avec 2,0 % : neutre = 4,0 % > 3,5 % → expansionniste (bonne réponse). Avec 1,0 % : neutre = 3,0 % < 3,5 % → restrictive. Avec 1,5 % : neutre = 3,5 % = taux directeur → neutre (cas limite, pas expansionniste). La condition s'écrit donc croissance tendancielle > 3,5 % - 2,0 % = 1,5 %, strictement.",
      ],
      // Variante plus difficile — donnée-piège (inflation observée) + zéro nominal + déflation
      [
        "An economy's long-term trend rate of real GDP growth is 1.0% and its central bank targets inflation of 1.5%. Actual inflation has fallen to -0.5%, and the policy rate is 0.0%. Which statement is most accurate?",
        [
          "Policy is neutral, because the 0.0% policy rate is close to the actual inflation rate of -0.5%.",
          "Policy is expansionary relative to the 2.5% neutral rate, but the zero lower bound limits further rate cuts, so the central bank may need unconventional tools such as asset purchases.",
          "Policy is contractionary, because the real policy rate of +0.5% is positive and the central bank can easily cut the nominal rate to -1.0%.",
        ],
        1,
        "Taux neutre = 1,0 % + 1,5 % = 2,5 % : on utilise la CIBLE d'inflation, pas l'inflation observée de -0,5 % (donnée-piège). Taux directeur 0,0 % < 2,5 % → politique expansionniste. Mais le taux nominal ne peut guère descendre sous zéro et la déflation maintient un taux réel positif (0,0 % - (-0,5 %) = +0,5 %) : la banque centrale n'a presque plus de marge en baisse de taux et doit recourir à des outils non conventionnels comme le QE. A compare le taux directeur à l'inflation observée (mauvaise référence : c'est le taux neutre qui compte). C déduit « restrictive » du signe du taux réel, ce qui n'est pas le critère, et suppose à tort qu'on peut descendre facilement à -1,0 %.",
      ],

      // Concept 3 — Limites de la politique monétaire : liquidity trap et déflation (officielle, R15 Q21)
      [
        "The most likely reason for deflation to persist despite expansionary monetary policy is:",
        ["a liquidity trap.", "bond market vigilantes.", "inelastic demand for money."],
        0,
        "Une liquidity trap est une situation où la demande de monnaie devient très élastique : les agents gardent les liquidités supplémentaires en cash au lieu de dépenser ou d'investir. Augmenter la masse monétaire n'a alors presque aucun effet sur l'activité ni sur les prix, et la déflation persiste. Les « bond market vigilantes » désignent un autre cas : les taux longs montent au lieu de baisser parce que les investisseurs anticipent plus d'inflation, ce qui est le contraire de la déflation. Une demande de monnaie inélastique rendrait au contraire la politique monétaire efficace.",
      ],
      // Variante angle différent — autre limite de la même liste (taux longs en sens inverse), expliquer le mécanisme
      [
        "A central bank cuts its policy rate and expands the money supply. Investors conclude that the expansion will push future inflation above target, and long-term government bond yields rise. Which statement best explains this outcome?",
        [
          "Demand for money has become highly elastic, so the additional money is held as cash and bond prices rise.",
          "Bond market participants expect higher future inflation and demand higher yields, so long-term rates move opposite to the intended direction.",
          "The central bank has lost its ability to influence short-term rates, so the cut has been transmitted only to long-term rates.",
        ],
        1,
        "C'est le cas des bond market vigilantes : si les investisseurs anticipent que l'expansion monétaire relancera l'inflation, ils exigent une compensation plus élevée pour l'inflation future, donc les rendements longs montent alors que le taux directeur baisse (effet inverse de celui recherché). A décrit la liquidity trap (liquidités thésaurisées, contexte déflationniste) et non une hausse des taux longs ; en outre, des prix d'obligations en hausse signifieraient des rendements en baisse. C est faux : la banque centrale contrôle directement les taux courts ; ce sont les taux longs, fixés par le marché, qui lui échappent.",
      ],
      // Variante plus difficile — déflation + taux réel + QE en liquidity trap (trouver l'énoncé inexact)
      [
        "A country is experiencing deflation of -1.5% with its policy rate at 0.0%, and its central bank launches a large quantitative easing program. Which of the following statements is least accurate?",
        [
          "The real policy rate is about +1.5%, so deflation keeps real borrowing costs high even though the nominal rate is zero.",
          "Quantitative easing raises bank reserves and is intended to push longer-term yields down.",
          "If the economy is in a liquidity trap, quantitative easing remains fully effective because banks will lend out the additional reserves.",
        ],
        2,
        "A est exact : taux réel ≈ taux nominal - inflation = 0,0 % - (-1,5 %) = +1,5 %, donc la déflation garde le coût réel de l'emprunt élevé malgré un taux nominal nul. B est exact : le QE (achats massifs d'actifs) augmente les réserves bancaires et vise à faire baisser les taux longs. C est inexact (c'est la réponse « least accurate ») : dans une liquidity trap le QE est inefficace, car les banques peuvent garder les réserves supplémentaires au lieu de prêter et les agents thésauriser le cash ; son efficacité n'est jamais garantie.",
      ],

      // Concept 4 — Organisations internationales : FMI, Banque mondiale, OMC (officielle, R16 Q4)
      [
        "The most accurate description of the relative roles played by the International Monetary Fund, World Bank, and World Trade Organization is that the only one explicitly focused on:",
        [
          "expanding international trade is the World Trade Organization.",
          "providing funding to member nations is the International Monetary Fund.",
          "reducing poverty is the World Bank.",
        ],
        2,
        "La Banque mondiale est la seule dont la mission explicite est la lutte contre la pauvreté (prêts aux pays en développement). A est faux : l'OMC ET le FMI œuvrent à l'expansion du commerce international (l'OMC par les règles du commerce et le règlement des différends, le FMI par la coopération monétaire et la stabilité des changes). B est faux : le FMI ET la Banque mondiale accordent tous deux des financements aux pays membres (le FMI en cas de difficultés de balance des paiements, la Banque mondiale pour le développement).",
      ],
      // Variante angle différent — appliquer la répartition des rôles à trois cas concrets
      [
        "Country X cannot pay for its imports because of a severe foreign-currency shortage and a collapsing exchange rate. Country Y, a low-income economy, seeks long-term funding for rural infrastructure to reduce poverty. Country Z claims that a trading partner's import quotas break agreed trade rules. Which matching of each country to the most appropriate organization is correct?",
        [
          "X: World Bank; Y: IMF; Z: WTO.",
          "X: IMF; Y: World Bank; Z: WTO.",
          "X: IMF; Y: WTO; Z: World Bank.",
        ],
        1,
        "X a un problème de balance des paiements et de stabilité du change → FMI (stabilité des changes, prêts aux pays en difficulté de balance des paiements). Y cherche un financement de développement pour lutter contre la pauvreté → Banque mondiale. Z conteste le respect des règles du commerce → OMC (règles du commerce et règlement des différends). A inverse FMI et Banque mondiale : la Banque mondiale finance le développement, pas les crises de balance des paiements. C attribue à l'OMC un rôle de financement et à la Banque mondiale le règlement de différends commerciaux, ce qui est faux.",
      ],
      // Variante plus difficile — combinaison organisations + type de risque + outils géopolitiques
      [
        "A sudden and unforeseen invasion cuts a neighboring country's main export route, its currency collapses, and it cannot finance its imports. The neighbor's government seeks emergency support from an international organization and imposes sanctions on the aggressor's political leaders. Which of the following correctly classifies the risk, the organization, and the sanctions?",
        [
          "Exogenous risk; IMF; sanctions are a financial tool of geopolitics.",
          "Thematic risk; World Bank; sanctions are an economic tool of geopolitics.",
          "Event risk; IMF; sanctions are a national security tool of geopolitics.",
        ],
        0,
        "Invasion soudaine et imprévue = risque exogène (ce n'est pas un event risk, dont la date est connue, ni un risque thématique, connu et durable). Devise qui s'effondre et importations impossibles à financer = difficulté de balance des paiements → FMI (la Banque mondiale finance le développement). Les sanctions visent les intérêts financiers d'acteurs précis : c'est un outil financier. B se trompe sur les trois éléments (thématique, Banque mondiale, outil économique). C : un event risk a une date connue et un résultat inconnu (une élection), et les sanctions ne sont pas un outil de sécurité (conflit, espionnage, accords de sécurité).",
      ],

      // Concept 5 — Analyse du risque géopolitique : probabilité, impact, vitesse (officielle, R16 Q13)
      [
        "With respect to analyzing geopolitical risk, velocity most likely refers to the speed with which:",
        [
          "geopolitical events occur.",
          "mitigation strategies can be put into place.",
          "investment values reflect the effects of a risk.",
        ],
        2,
        "Le risque géopolitique s'analyse selon trois dimensions : la probabilité (likelihood), l'impact (ampleur des effets sur les résultats de l'investissement) et la vitesse (velocity), c'est-à-dire la rapidité avec laquelle les valeurs des investissements reflètent les effets du risque. A confond vitesse et rythme d'occurrence des événements ; B décrit la rapidité de mise en place des mesures d'atténuation, pas la transmission aux prix.",
      ],
      // Variante angle différent — comparer deux risques (type et vitesse), piège : confondre probabilité et vitesse
      [
        "Risk X is a sudden naval blockade of a major shipping lane that investors would reprice in oil and shipping equities within hours. Risk Y is a climate regulation phased in gradually over 15 years. Which statement comparing the two risks is most accurate?",
        [
          "X is exogenous with high velocity; Y is thematic with low velocity.",
          "X is thematic with high velocity; Y is exogenous with low velocity.",
          "X has lower velocity than Y because exogenous risks have a low probability of occurrence.",
        ],
        0,
        "X est un choc soudain et imprévu → risque exogène ; il est repricé en quelques heures → vitesse élevée. Y a un effet connu et durable → risque thématique ; sa transmission est graduelle → vitesse faible (les risques de type ESG sont typiquement à faible vitesse). B inverse les types de risque. C confond vitesse et probabilité : la faible probabilité d'un événement exogène (cf. cygne noir) est une autre dimension et ne dit rien de la rapidité de transmission aux prix.",
      ],
      // Variante plus difficile — classer un risque, juger sa vitesse et en déduire l'effet sur prime de risque et volatilité
      [
        "A closely contested national election will be held in three months. If the opposition wins, it has pledged to nationalize the energy sector, which investors would reprice within days of the result. Which assessment is most appropriate?",
        [
          "It is an exogenous risk with high velocity, so the analyst should expect no change in the risk premium until the result is announced.",
          "It is an event risk with high velocity, so the analyst should expect a higher risk premium and higher volatility on exposed assets as the perceived risk rises ahead of the vote.",
          "It is a thematic risk with low velocity, so investors can wait until after the result to reposition without material cost.",
        ],
        1,
        "Date connue, résultat inconnu = event risk (élection), et non risque exogène (imprévu) ni thématique (connu et durable). Un repricing en quelques jours = vitesse élevée. Quand le risque perçu augmente à l'approche du vote, la prime de risque et la volatilité des actifs exposés (énergie) augmentent : les marchés anticipent, ils n'attendent pas le résultat. A est faux sur le type de risque (la date est connue) comme sur l'absence de prime de risque. C est faux : le risque n'est pas thématique, et une vitesse élevée signifie qu'attendre le résultat peut coûter cher.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Economics Page 3...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
