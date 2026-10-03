// Seed script — quiz de "drill" associé à la page 6 de la fiche PDF Equity
// (Industry & Competitive Analysis). Structure : 5 concepts × (1 question
// officielle + 1 variante "angle différent" + 1 variante "plus difficile").
// Voir memory regle-drill-variantes-cfa-hub. Questions en anglais,
// explications en français. Questions officielles : banque de pratique
// Reading 46 (corrigés vérifiés contre le PDF "- Answers.pdf"), recopiées à
// l'identique pour que syncQuizSets conserve l'historique de réponses.
// Usage: node scripts/seed-equity-drill-page6.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Equity (Système)";

const QUIZ_SETS = [
  {
    title: "Equity — Drill Fiche Page 6 (Industry & Competitive Analysis)",
    difficulty: 2,
    questions: [
      // Concept 1 — Les 5 étapes de l'analyse sectorielle (officielle)
      [
        "As part of an industry and competitive analysis, an analyst first defines and then surveys an industry. Which of the following assessments will be made as part of the survey step?",
        ["The growth rate of the industry over the last several years.", "Political and economic impacts on the industry.", "The geographical region in which the industry operates."],
        0,
        "L'étape de « survey » (relevé) de l'industrie consiste à évaluer sa taille, sa rentabilité, sa croissance et les tendances de parts de marché — dont le taux de croissance des dernières années. Les impacts politiques et économiques relèvent de l'étape d'examen des influences externes, et la région géographique relève plutôt de l'étape de définition de l'industrie.",
      ],
      // Variante angle différent — ce que l'étape PESTLE ne fait PAS (et le dilemme de l'innovateur)
      [
        "Regarding the 'examine external influences' step of industry analysis, which relies on a PESTLE framework, which of the following statements is least accurate?",
        [
          "It identifies broad themes, such as demographic shifts or new regulations, that may affect the industry's demand and costs.",
          "It may reveal a disruptive technology that forces incumbents to choose between investing in it, which cannibalizes their current sales, and ignoring it, which protects short-term profitability at the risk of losing market share.",
          "It is the step in which the analyst measures the industry's concentration with the HHI and determines the industry's profitability.",
        ],
        2,
        "PESTLE (Political, Economic, Social, Technological, Legal, Environmental) sert à repérer des thèmes externes qui pèsent sur l'industrie : démographie, réglementation, technologie… La première affirmation est donc exacte. La deuxième aussi : c'est le dilemme de l'innovateur — face à une innovation de rupture, investir cannibalise les ventes actuelles mais préserve la part de marché à long terme, l'ignorer protège la rentabilité à court terme au prix d'un risque à long terme. En revanche, la concentration (HHI) et la rentabilité se mesurent lors du relevé de l'industrie (étape 2 : taille, croissance, rentabilité, parts de marché), et les déterminants structurels de la rentabilité s'analysent avec Porter (étape 3) — jamais avec PESTLE. C'est la troisième affirmation qui est la moins exacte.",
      ],
      // Variante plus difficile — rattacher trois tâches décrites aux bonnes étapes (piège : fournisseurs ≠ influence externe)
      [
        "An analyst covering the European electric-bicycle industry labels her work as follows. Task 1: estimating total annual e-bike sales, their five-year growth rate, and the trend in each participant's market share — labeled 'survey the industry.' Task 2: assessing whether the industry's three suppliers of battery cells can raise prices without losing customers — labeled 'examine external influences.' Task 3: evaluating how an aging population and new EU battery-recycling rules will affect demand and costs — labeled 'examine external influences.' Which of the following statements is most accurate?",
        [
          "All three tasks are correctly labeled.",
          "Task 2 is mislabeled: the bargaining power of suppliers is assessed when analyzing the industry structure.",
          "Task 3 is mislabeled: demographic and regulatory trends are assessed when surveying the industry.",
        ],
        1,
        "Il faut vérifier chaque tâche. Tâche 1 : taille, croissance et évolution des parts de marché = relevé de l'industrie (étape 2) → étiquette correcte. Tâche 2 : le pouvoir de négociation des fournisseurs est l'une des cinq forces de Porter, il relève donc de l'analyse de la structure de l'industrie (étape 3). Le piège : les fournisseurs sont « extérieurs » à l'industrie, mais l'étape des influences externes désigne les thèmes PESTLE, pas les forces concurrentielles. Tâche 3 : vieillissement de la population (Social) et règles de recyclage (Legal/Environmental) = influences externes (étape 4) → étiquette correcte ; le relevé de l'industrie, lui, ne porte que sur la taille, la croissance, la rentabilité et les parts de marché. Seule la tâche 2 est mal étiquetée, donc « tout est correct » est faux.",
      ],

      // Concept 2 — Classer une industrie : activité principale, pas cycle ni statistique (officielle)
      [
        "Commercial industry classification systems such as the Global Industry Classification Standard (GICS) typically classify firms according to their:",
        ["principal business activities.", "correlations of historical returns.", "sensitivity to business cycles."],
        0,
        "Les systèmes de classification commerciaux comme le GICS classent les entreprises selon leur activité économique principale (ex. biens de consommation de base, services financiers, santé), et non selon la corrélation de leurs rendements historiques ou leur sensibilité au cycle économique.",
      ],
      // Variante angle différent — l'autre méthode de regroupement (sensibilité au cycle) : pourquoi « cyclique » ?
      [
        "Instead of grouping companies by principal business activity, an analyst groups them by business-cycle sensitivity. A manufacturer of heavy construction equipment is most likely placed in the cyclical group because:",
        [
          "its share price has historically been more volatile than the overall stock market.",
          "its sales have grown faster than the overall economy, independent of the business cycle.",
          "its customers can postpone such costly purchases until the economy improves, so its earnings depend heavily on the stage of the business cycle.",
        ],
        2,
        "Le classement cyclique/défensif repose sur la sensibilité de la demande et des bénéfices au cycle économique, pas sur la volatilité du cours de bourse (ce serait plutôt un regroupement statistique, fondé sur les rendements). Les équipements lourds sont des biens d'investissement coûteux vendus à d'autres producteurs, dont l'achat peut être reporté jusqu'à la reprise : les bénéfices (souvent avec un levier opérationnel élevé) suivent fortement le cycle — c'est la définition d'une entreprise cyclique, la plus sensible au cycle. Une croissance supérieure à l'économie indépendamment du cycle définit au contraire une industrie de croissance (growth). À l'autre extrême, une entreprise défensive (services aux collectivités, alimentation, santé) a une demande quasi insensible au cycle.",
      ],
      // Variante plus difficile — firme multi-activités (test 60 % puis 50 % revenu/profit/actifs) + pays (donnée-piège : revenu géographique)
      [
        "A company is incorporated, headquartered, and has its primary stock listing in the Netherlands, but 75% of its revenue comes from customers in the United States. Its three business segments contribute as follows: industrial machinery, 48% of revenue, 30% of operating profit, and 45% of assets; medical devices, 40% of revenue, 58% of operating profit, and 42% of assets; software, 12% of revenue, 12% of operating profit, and 13% of assets. A commercial classification provider would most likely assign the company to which industry and which country?",
        ["Medical devices; the Netherlands.", "Industrial machinery; the Netherlands.", "Medical devices; the United States."],
        0,
        "Deux règles à appliquer. Industrie : (1) aucune ligne ne dépasse 60 % du chiffre d'affaires (maximum 48 %) ; (2) on cherche alors une ligne qui représente plus de 50 % du chiffre d'affaires, des profits OU des actifs. Chiffre d'affaires (48 % au plus) et actifs (45 % au plus) : aucune ligne ne passe le seuil ; mais les dispositifs médicaux génèrent 58 % du résultat opérationnel → classement en dispositifs médicaux. Choisir les machines industrielles parce que c'est la plus grosse ligne de chiffre d'affaires, c'est s'arrêter au mauvais critère (sans ligne au-dessus de 50 % sur aucun critère, il faudrait recourir au jugement de l'analyste). Pays : on retient le pays d'incorporation, de cotation principale ou du siège — ici tous aux Pays-Bas —, jamais la répartition géographique du chiffre d'affaires : les 75 % réalisés aux États-Unis sont la donnée-piège.",
      ],

      // Concept 3 — HHI et niveau de concentration (officielle)
      [
        "An analyst is using the Herfindahl-Hirschman Index (HHI) to evaluate industry concentration. The industry has four firms with the following market shares: 45%, 25%, 20%, and 10%. This industry's concentration will be considered:",
        ["moderate.", "low.", "high."],
        2,
        "Le HHI se calcule comme la somme des carrés des parts de marché : (45×45)+(25×25)+(20×20)+(10×10)=2025+625+400+100=3150. Un HHI supérieur à 2 500 est considéré comme une forte concentration. Une concentration faible correspondrait à un HHI inférieur à 1 500, et modérée entre 1 500 et 2 500.",
      ],
      // Variante angle différent — interpréter un HHI faible : l'exception des marchés de services locaux
      [
        "Nationally, the dental-clinic industry consists of thousands of small independent clinics and has an HHI of about 300. An analyst concludes that clinics must face intense price competition and therefore have little pricing power. This conclusion is most likely:",
        [
          "questionable, because dental services are local, so competition takes place in local markets that may be far more concentrated than the national HHI suggests.",
          "correct, because an HHI below 1,500 always implies high competitive intensity and low profitability.",
          "incorrect, because a low HHI indicates high concentration and therefore strong pricing power.",
        ],
        0,
        "En règle générale, une faible concentration (HHI < 1 500) signale une forte intensité concurrentielle, peu de pouvoir sur les prix et une rentabilité plus faible. Mais la règle a des exceptions : les industries de services locales et les produits très différenciés. Un patient ne met pas en concurrence tous les cabinets du pays, seulement les quelques cabinets proches de chez lui : le HHI national (≈ 300) sous-estime la concentration du marché pertinent, qui peut être élevée localement. Le mot « always » rend la deuxième réponse fausse, et la troisième inverse le sens de l'indice (un HHI faible = faible concentration, donc a priori moins de pouvoir sur les prix).",
      ],
      // Variante plus difficile — taille d'industrie = ventes du produit (piège : CA total d'un conglomérat), puis HHI et seuil
      [
        "The premium cookware industry consists of five companies. Their cookware sales (in $ millions) are: Company A, 30; Company B, 25; Company C, 20; Company D, 15; Company E, 10. Company A is a diversified conglomerate with total revenue of $300 million, while Companies B, C, D, and E sell only cookware. The industry's HHI and concentration level are closest to:",
        ["6,673; high concentration.", "2,250; moderate concentration.", "2,250; high concentration."],
        1,
        "Étape 1 — taille de l'industrie : c'est le total des ventes du PRODUIT (30 + 25 + 20 + 15 + 10 = 100 M$), pas le chiffre d'affaires total des entreprises ; les 270 M$ que A réalise hors ustensiles de cuisine n'en font pas partie. Étape 2 — parts de marché : 30 %, 25 %, 20 %, 15 %, 10 %. Étape 3 — HHI = 900 + 625 + 400 + 225 + 100 = 2 250. Étape 4 — entre 1 500 et 2 500 → concentration modérée (2 250 reste sous le seuil de 2 500 : conclure à une forte concentration est faux). Le distracteur 6 673 vient de l'utilisation du chiffre d'affaires total de A : 300 M$ sur un total de 370 M$, soit une part d'environ 81,1 % (carré ≈ 6 574), puis 6,8 %, 5,4 %, 4,1 % et 2,7 % pour les autres → HHI ≈ 6 673.",
      ],

      // Concept 4 — Porter's Five Forces : menace de substituts (officielle)
      [
        "The threat of substitutes is most likely to be low for a firm that:",
        ["operates in a fragmented market with little unused capacity.", "produces a commodity product in an industry with significant unused capacity.", "produces a differentiated product with high switching costs."],
        2,
        "La menace de substituts est faible pour une entreprise qui propose un produit différencié avec des coûts de changement élevés pour le client. La capacité inutilisée et la fragmentation du marché intensifient plutôt la rivalité entre concurrents existants, mais ne sont pas directement liées à la menace de substituts.",
      ],
      // Variante angle différent — le « pourquoi » : par quel mécanisme les substituts pèsent sur la rentabilité
      [
        "Which of the following best explains why a high threat of substitutes reduces an industry's long-run profitability?",
        [
          "Substitutes increase the industry's fixed costs, which pushes firms to cut prices in order to operate at full capacity.",
          "Substitutes give the industry's suppliers more power to raise the prices of key inputs.",
          "Substitutes make demand more price-elastic, which caps the prices that firms in the industry can charge.",
        ],
        2,
        "Si les clients peuvent se tourner vers un autre produit qui remplit le même besoin, toute hausse de prix les fait partir : la demande devient plus élastique au prix et le prix plafonne, ce qui comprime les marges. C'est aussi pour cela qu'un produit différencié avec des coûts de changement élevés est peu exposé : il rend la demande moins élastique. Les coûts fixes élevés qui poussent à baisser les prix pour faire tourner les capacités relèvent de la rivalité entre concurrents existants, pas des substituts ; et le pouvoir des fournisseurs dépend de leur petit nombre et de la rareté de ce qu'ils vendent, pas de l'existence de substituts au produit de l'industrie.",
      ],
      // Variante plus difficile — passer les 5 forces en revue sur un cas (pièges : peu de firmes, beaucoup de clients) avec HHI
      [
        "An analyst gathers the following facts about an aircraft-engine maintenance industry: three firms hold stable market shares of 40%, 35%, and 25%; services are customized and customers face high switching costs; new entrants need costly regulatory certification; customers are thousands of small regional airlines; and a single company supplies a patented alloy essential to every repair and has just raised its price by 30%. According to Porter's five forces, which force most likely limits the industry's economic profits?",
        [
          "Rivalry among existing competitors, because only three firms share the entire market.",
          "Bargaining power of suppliers, because a single supplier controls a scarce, essential input.",
          "Bargaining power of buyers, because the industry serves thousands of customers.",
        ],
        1,
        "On passe chaque force en revue. Rivalité : HHI = 40² + 35² + 25² = 1 600 + 1 225 + 625 = 3 450 > 2 500 (forte concentration), parts de marché stables, services différenciés → rivalité faible (peu de firmes = moins de concurrence, pas plus). Entrée : certification coûteuse = barrière élevée → menace faible. Substituts : services personnalisés et coûts de changement élevés → menace faible. Acheteurs : des milliers de petites compagnies fragmentées, qui supportent en plus des coûts de changement élevés, n'ont individuellement presque aucun poids → pouvoir faible (le grand nombre de clients est un piège : c'est la concentration des acheteurs qui leur donne du pouvoir). Fournisseurs : un fournisseur unique d'un intrant breveté et indispensable, capable d'imposer +30 % → pouvoir fort. C'est la seule force forte, donc celle qui capte une partie du profit économique de l'industrie.",
      ],

      // Concept 5 — Les 3 stratégies génériques : différenciation (officielle)
      [
        "Company X runs a series of high-end hotels in the Northeastern United States. The average room rate per night is higher than any other hotel in the region. Which of the following best allows the company to build upon its differentiation strategy?",
        ["Economies of scale and low variable costs.", "Strong cost controls, which allow the company to maintain profit margins.", "A culture of strong customer experience."],
        2,
        "Une entreprise pratiquant des tarifs plus élevés que ses concurrents met en œuvre une stratégie de différenciation, où le client perçoit une valeur ajoutée justifiant le prix premium — une culture d'expérience client forte s'inscrit dans cette logique. Les économies d'échelle, les coûts variables faibles et le contrôle strict des coûts relèvent au contraire d'une stratégie de leadership par les coûts, pas de différenciation.",
      ],
      // Variante angle différent — cas limite : prix premium mais cible étroite → focus, pas différenciation
      [
        "A company builds handmade carbon-fiber racing bicycles and sells them only to professional cycling teams, at prices far above those of mass-market bicycles. Its generic competitive strategy is best described as:",
        [
          "differentiation, because its products command a premium price.",
          "focus, because it targets a narrow niche of customers.",
          "cost leadership, because handmade production avoids the heavy fixed costs of mass production.",
        ],
        1,
        "Ce qui distingue la stratégie de focus n'est pas le niveau de prix mais la cible : un segment étroit (niche), ici les seules équipes cyclistes professionnelles. Le focus peut emprunter à la différenciation (produit haut de gamme) ou au leadership par les coûts : c'est une stratégie « hybride » appliquée à une niche. Répondre « différenciation » à cause du prix premium est le piège : la différenciation vise un marché large avec des produits distinctifs. Le leadership par les coûts suppose les coûts et les prix les plus bas du secteur, avec des économies d'échelle et un gros volume — l'inverse d'une fabrication artisanale vendue cher.",
      ],
      // Variante plus difficile — condition de succès chiffrée : coût de différenciation < premium SOUTENABLE (donnée-piège : premium de lancement)
      [
        "A mid-market appliance maker is considering a premium design line. Differentiating each unit would add $40 to its cost. Market research shows that customers would pay a $55 premium per unit at launch, but competitors are expected to copy the design within a year, after which the sustainable premium would fall to $25 per unit. Based on the requirements for a successful differentiation strategy, the company should most likely:",
        [
          "not pursue this strategy, because the cost of differentiation would exceed the price premium that can be sustained.",
          "pursue this strategy, because the $55 launch premium exceeds the $40 cost of differentiation.",
          "pursue this strategy, because differentiation lowers the threat of substitutes and therefore guarantees economic profits.",
        ],
        0,
        "Une différenciation réussie exige deux conditions : (1) le coût de la différenciation doit être inférieur au prix premium que les clients acceptent de payer, et (2) ce premium doit être soutenable dans le temps. Au lancement : 55 − 40 = +15 $ par unité ; mais une fois le design copié : 25 − 40 = −15 $ par unité, durablement. Raisonner sur le premium de lancement (55 $) ignore la condition de soutenabilité — c'est la donnée-piège. Et réduire la menace de substituts ne « garantit » jamais un profit économique : encore faut-il que le premium couvre durablement le coût de la différenciation.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Equity Page 6...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
