// Seed script — flashcards "Système" Economics (CFA Level I).
// 4 paquets × 15 cartes (60), à réviser en une nuit en combo avec le one-pager
// Economics (cfa-work/onepagers/economics.html) : chaque notion du one-pager a
// au moins une carte. Chaque carte se comprend seule (cartes mélangées) ;
// phrases en français, termes techniques en anglais. Verso au format « trois
// cases » : l'idée à retenir (≤ 12 mots, ==surligné==, formule ou liste), puis
// « En clair : », puis « Piège : » s'il y a un vrai piège d'examen.
// Cartes de calcul : la formule générale en « À retenir », l'application
// chiffrée en « En clair ». Une question par carte ; deux réponses → une liste.
// Définitions, formules et chiffres vérifiés sur Schweser Book 1 (R12–19) ;
// mini-calculs recalculés. Les 5 calculs « Top 5 » de lib/calc/economics.ts
// (fiscal multiplier, variation d'une devise, cross rate, forward en points,
// covered interest parity) ont chacun leur carte formule.
// Formules KaTeX ($$…$$ seul sur sa ligne, $…$ en ligne) rendues par
// components/RichText.tsx. Jamais de « $ » monétaire (il ouvrirait une formule).
// Usage : node scripts/seed-flashcards-economics.mjs
import { pathToFileURL } from "node:url";
import { getOwnerId, ensureFolder, seedFlashcardSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Economics (Système)";

// Anciens titres à supprimer s'ils ont changé (les 4 titres actuels sont gardés).
const oldTitles = [];

export const SETS = [
  {
    title: "Economics — Flashcards 1/4 (Firmes et structures de marché)",
    cards: [
      [
        "Quelle règle de production maximise le profit d'une firme, quelle que soit la market structure ?",
        "Profit maximal quand ==marginal revenue égale marginal cost== (MR = MC)\nEn clair : La règle vaut dans les 4 market structures. En perfect competition, P = MR, donc P = MC. Ailleurs, la demande décroît, donc P > MR = MC.\nPiège : « P = MR » n'est vrai qu'en perfect competition (firme price taker).",
      ],
      [
        "Breakeven, short-run shutdown, long-run exit : à quelles conditions sur le prix P, l'AVC (average variable cost) et l'ATC (average total cost) ?",
        "Breakeven : P = ==ATC== · Short-run shutdown : P < ==AVC== · Long-run exit : P < ==ATC==\nEn clair : Si AVC ≤ P < ATC, la firme produit à court terme, car elle couvre une partie des fixed costs. À long terme, tous les coûts sont évitables : elle sort.\nPiège : fermer à court terme se juge sur l'AVC, pas sur l'ATC.",
      ],
      [
        "Condition de short-run shutdown en total revenue (TR) et total variable costs (TVC) ? Application : TR 700 000, TVC 800 000, fixed costs 400 000.",
        "Short-run shutdown si\n$$\\text{TR} < \\text{TVC}$$\nEn clair : Ici 700 000 < 800 000 : shut down. À l'arrêt, on perd les fixed costs (400 000) ; en produisant, TR − TC (total costs) = 700 000 − 1 200 000 = −500 000.\nPiège : comparer TR aux TVC, pas aux total costs : les fixed costs se paient même à l'arrêt.",
      ],
      [
        "Sur la LRATC (long-run average total cost), que signifient les segments décroissant, plat et croissant, et où est la minimum efficient scale ?",
        "Pente ↓ : ==economies of scale== · Plat : ==constant returns to scale== · Pente ↑ : ==diseconomies of scale== · Point bas : ==minimum efficient scale==\nEn clair : Les economies of scale viennent de la spécialisation et des achats en gros, les diseconomies de la bureaucratie. En perfect competition, à long terme, P = min LRATC.",
      ],
      [
        "Quelles sont les caractéristiques de la perfect competition ?",
        "Firmes : ==très nombreuses== · Produit : ==homogène== · Barriers to entry : ==très faibles== · Pricing power : ==aucun==\nEn clair : Chaque firme est price taker : sa demande est horizontale et elle ne rivalise que sur le prix. À long terme, son economic profit est nul. Ex. : le blé.",
      ],
      [
        "Quelles sont les caractéristiques de la monopolistic competition ?",
        "Firmes : ==nombreuses== · Produits : ==différenciés== · Barriers to entry : ==faibles== · Pricing power : ==un peu==\nEn clair : La demande décroît mais reste élastique, car les substituts sont proches. Les firmes rivalisent par la publicité, la marque et la qualité. Ex. : le dentifrice.",
      ],
      [
        "Monopolistic competition : quel est l'équilibre de long terme d'une firme, comparé à la perfect competition ?",
        "==Economic profit nul==, mais P > MC et excess capacity\nEn clair : Les entrées (ou la publicité) ramènent P à l'ATC (average total cost), au-dessus de son minimum. Le prix est plus haut qu'en perfect competition.\nPiège : profit nul comme en perfect competition, mais P > MR = MC (marginal revenue = marginal cost).",
      ],
      [
        "Quelles sont les caractéristiques d'un oligopoly ?",
        "Firmes : ==peu nombreuses== · Décisions : ==interdépendantes== · Barriers to entry : ==élevées== · Pricing power : ==moyen à fort==\nEn clair : Chaque firme anticipe la réaction de ses rivales, donc il n'y a pas de supply curve bien définie. Les produits sont similaires ou différenciés. Ex. : l'automobile.",
      ],
      [
        "Quelles sont les caractéristiques d'un monopoly ?",
        "Vendeur : ==un seul== · Substituts : ==aucun== · Barriers to entry : ==très élevées== · Pricing power : ==fort==\nEn clair : Les barrières viennent de brevets, d'une ressource clé, d'une licence ou d'une régulation. Le monopoly produit où MR (marginal revenue) = MC (marginal cost), avec P > MR.",
      ],
      [
        "Que suppose le kinked demand curve model d'un oligopoly, et quelle en est la conséquence sur le prix ?",
        "Baisse : ==suivie par les rivales== · Hausse : ==non suivie== · Prix : ==figé au coude (kink)==\nEn clair : Au-dessus du prix du coude, la demande est élastique ; en dessous, peu élastique. La MR (marginal revenue) a donc un trou : si la MC (marginal cost) y passe, le prix ne bouge pas.",
      ],
      [
        "Cournot model vs Stackelberg model d'un oligopoly : quelle hypothèse et quel résultat pour chacun ?",
        "Cournot : ==décisions simultanées, rival supposé inchangé== → parts égales · Stackelberg : ==le leader décide, puis le follower s'adapte==\nEn clair : Avec Cournot, le prix d'équilibre est entre monopoly et perfect competition. Avec Stackelberg, le leader capte la plus grosse part des profits.",
      ],
      [
        "Que décrit le dominant firm model d'un oligopoly ?",
        "La firme aux ==coûts les plus bas== fixe le prix\nEn clair : Grâce à son échelle, elle détient une grosse part du marché. Les petites firmes prennent ce prix et produisent où leur MC (marginal cost) l'égale. Si l'une baisse son prix, la dominant firm suit.",
      ],
      [
        "Oligopoly : pourquoi une collusion (cartel) est-elle instable, alors qu'elle rapporte plus que le Nash equilibrium ?",
        "Chaque membre ==gagne à tricher== en produisant plus\nEn clair : Au Nash equilibrium, aucune firme ne gagne à changer seule de stratégie. Un cartel rapporte plus au total et tient mieux avec peu de firmes, aux produits et aux coûts proches.",
      ],
      [
        "Formules du CR (concentration ratio) et du HHI (Herfindahl-Hirschman Index) des N plus grandes firmes ? Application : N = 4, market shares 25, 15, 15, 10, 5 % ; la n° 1 rachète une firme à 15 %.",
        "$$\\text{CR}_N = \\sum_{i=1}^{N} s_i \\qquad \\text{HHI}_N = \\sum_{i=1}^{N} s_i^2$$\nEn clair : Top 4 avant : CR = 65 %, HHI = 0,25² + 0,15² + 0,15² + 0,10² = 0,1175. Après (40, 15, 10, 5) : CR = 70 %, HHI = 0,1950. $s_i$ = market share (décimal) de la i-ème plus grande firme.\nPiège : après fusion, reclasser le top N (la firme à 5 % y entre). Le HHI réagit bien plus que le CR.",
      ],
      [
        "Pourquoi le CR (concentration ratio) et le HHI (Herfindahl-Hirschman Index) mesurent-ils mal le market power ?",
        "CR et HHI ==ignorent les barriers to entry==\nEn clair : Une firme à forte market share a peu de pricing power si l'entrée est facile. Pour classer une industrie, on regarde aussi le nombre de firmes, la différenciation et la concurrence hors prix.",
      ],
    ],
  },
  {
    title: "Economics — Flashcards 2/4 (Cycles et politique budgétaire)",
    cards: [
      [
        "Quelles sont les 4 phases du business cycle, et que fait le real GDP (gross domestic product) dans chacune ?",
        "Expansion : ==real GDP ↑== · Peak : ==real GDP maximal== · Contraction : ==real GDP ↓== · Trough : ==real GDP minimal==\nEn clair : Au peak, la croissance ralentit et l'inflation accélère. En contraction, l'unemployment monte et l'inflation recule avec retard. Deux trimestres consécutifs de baisse du real GDP en marquent le début.",
      ],
      [
        "Classical cycle, growth cycle, growth rate cycle : que mesure chacun ?",
        "Classical : ==hausses et baisses du real GDP== · Growth : ==écart du real GDP au potential GDP== · Growth rate : ==accélération ou ralentissement du real GDP==\nEn clair : Le growth rate cycle est le préféré : il montre les peaks et troughs plus tôt. Le potential GDP (gross domestic product) est la tendance de long terme.",
      ],
      [
        "Qu'est-ce qu'un credit cycle, et quel effet a-t-il sur le business cycle ?",
        "Expansion : ==crédit facile, bon marché== · Ralentissement : ==crédit rare et cher== · Effet : ==amplifie le business cycle==\nEn clair : Un crédit trop facile nourrit des bulles, comme les subprime mortgages avant 2008. Les credit cycles durent en moyenne plus longtemps que les business cycles.",
      ],
      [
        "Comment évolue l'inventory-to-sales ratio au fil du business cycle ?",
        "Inventory-to-sales ratio ==↑ en fin d'expansion==, ↓ près du trough\nEn clair : Avant le peak, les ventes ralentissent et les inventories s'accumulent. À la reprise, les ventes repartent et les inventories fondent. C'est un lagging indicator.\nPiège : une hausse non voulue des inventories gonfle le GDP : fausse vigueur.",
      ],
      [
        "Face à un retournement du business cycle, comment les firmes ajustent-elles d'abord leur travail et leur capital ?",
        "D'abord l'==intensité d'usage== : heures, overtime, machines\nEn clair : Les firmes n'embauchent ou ne licencient que si la tendance dure. En contraction, elles reportent l'entretien et ne remplacent pas les équipements usés.\nPiège : le capital se réduit en reportant l'entretien, rarement en vendant des actifs.",
      ],
      [
        "Comment les dépenses des ménages (durable goods, services, nondurable goods, logement) réagissent-elles au business cycle ?",
        "Durable goods (voitures, meubles) : ==très cycliques, achats reportables== · Services : ==moins cycliques que durable goods== · Nondurable goods (alimentation) : ==stables, achats courants== · Housing : ==fortes variations==\nEn clair : En contraction, on reporte les achats coûteux. Le housing suit les mortgage rates, le prix des logements / revenu et la démographie.",
      ],
      [
        "Leading, coincident, lagging indicators : quand tourne chacun par rapport au business cycle ? Donne un exemple de chaque.",
        "Leading : ==tourne avant le cycle==, ex. building permits · Coincident : ==tourne avec le cycle==, ex. industrial production · Lagging : ==tourne après le cycle==, ex. inventory-to-sales ratio\nEn clair : D'autres leading indicators : initial jobless claims, S&P 500. Les payrolls sont coincident ; la duration of unemployment est lagging.",
      ],
      [
        "Quels sont les 3 rôles de la fiscal policy ?",
        "==Stabiliser== l'aggregate demand · ==Redistribuer== revenus et richesse · ==Allouer== les ressources\nEn clair : La fiscal policy passe par le government spending et les taxes, la monetary policy par la central bank. Seule la fiscal policy sert à redistribuer.",
      ],
      [
        "Quels fiscal policy tools agissent vite, et lesquels lentement ?",
        "Rapides : ==indirect taxes== · Lents : ==direct taxes, transfer payments== · Très lents : ==capital spending==\nEn clair : Les indirect taxes (VAT = value-added tax, excise taxes) s'ajustent presque aussitôt. Direct taxes et transfer payments prennent du temps à mettre en place.\nPiège : le capital spending agit si lentement que la reprise peut être déjà là.",
      ],
      [
        "Quelles sont les 4 qualités d'une bonne tax policy ?",
        "Simplicity : ==facile à payer et à contrôler== · Efficiency : ==perturbe peu les forces du marché== · Fairness : ==chacun paie selon sa situation== · Sufficiency : ==assez de recettes pour les dépenses==\nEn clair : La fairness combine horizontal equality (même situation, même impôt) et vertical equality (les plus riches paient plus).",
      ],
      [
        "Formule du fiscal multiplier ? Application : MPC (marginal propensity to consume) 0,8, tax rate 25 %, hausse du government spending de 100.",
        "$$\\text{fiscal multiplier} = \\dfrac{1}{1 - \\text{MPC} \\times (1 - t)}$$\nEn clair : Fiscal multiplier = 1 / (1 − 0,8 × 0,75) = 2,5, donc l'aggregate demand monte de 100 × 2,5 = 250. MPC = marginal propensity to consume, t = tax rate.\nPiège : ne pas y mettre la MPS (marginal propensity to save = 1 − MPC).",
      ],
      [
        "Formule de ΔAD (aggregate demand) pour un balanced budget, où government spending et taxes montent autant ? Application : +100 chacun, MPC (marginal propensity to consume) 0,8, tax rate 25 %.",
        "Balanced budget : effet ==positif==\n$$\\Delta \\text{AD} = k \\times (\\Delta G - \\text{MPC} \\times \\Delta T)$$\nEn clair : Ici k = 1 / (1 − 0,8 × 0,75) = 2,5, donc ΔAD = 2,5 × (100 − 0,8 × 100) = +50. k = fiscal multiplier, G = government spending, T = taxes.\nPiège : l'effet n'est pas nul : il faudrait ΔT = 100 / 0,8 = 125 pour l'annuler.",
      ],
      [
        "Comment juger si une fiscal policy est expansionary ou contractionary ?",
        "Juger sur le ==structural deficit== (corrigé du cycle)\nEn clair : Le structural deficit est celui qu'on aurait au full employment : s'il monte, la policy est expansionary. En récession, les automatic stabilizers creusent seuls le deficit.\nPiège : un deficit qui se creuse en récession n'est pas forcément une relance.",
      ],
      [
        "Pourquoi la discretionary fiscal policy est-elle difficile à bien doser ?",
        "Recognition lag : ==délai pour voir le problème== · Action lag : ==délai pour adopter la mesure== · Impact lag : ==délai avant l'effet sur l'économie==\nEn clair : À cause de ces délais, la relance arrive parfois trop tard. S'y ajoutent le crowding-out, les supply shortages, les multiple targets et un full employment mal mesuré.",
      ],
      [
        "Faut-il s'inquiéter d'un fiscal deficit élevé ? Donne les arguments pour et contre.",
        "Inquiétant : ==impôts futurs ↑, crowding-out== · Rassurant : ==dette due aux résidents==\nEn clair : Si les marchés refusent de refinancer, c'est le default ou l'inflation. Sont aussi rassurants : capital spending, unemployment élevé, Ricardian equivalence.\nPiège : le debt-to-GDP ratio monte si real interest rate > real growth.",
      ],
    ],
  },
  {
    title: "Economics — Flashcards 3/4 (Politique monétaire et géopolitique)",
    cards: [
      [
        "Quels sont les rôles d'une central bank ?",
        "==Émet la monnaie== · Lender of last resort : ==prête aux banques illiquides== · ==Mène la monetary policy== · ==Gère les réserves de change== · ==Banker to the government and banks==\nEn clair : Elle supervise aussi le payments system. Le lender of last resort évite les bank runs.\nPiège : elle ne collecte pas les impôts et ne finance pas les agences publiques.",
      ],
      [
        "Pourquoi les central banks visent-elles une inflation d'environ 2 % plutôt que 0 % ?",
        "Cible ≈ 2 % pour ==éviter la deflation==\nEn clair : Price stability est l'objectif principal : cible courante 2 % ± 1 %, visée à environ 2 ans. Avec une cible de 0 %, les écarts feraient souvent passer l'inflation sous zéro.",
      ],
      [
        "Pour une monetary policy expansionary, que fait la central bank de ses 3 outils ?",
        "Policy rate ↓ : ==les banques empruntent moins cher== · Reserve requirements ↓ : ==moins de dépôts gardés en réserve== · Open market operations : ==acheter des government bonds==\nEn clair : Acheter des titres injecte des reserves dans les banques. Le policy rate s'appelle discount rate à la Fed, refinancing rate à l'ECB (European Central Bank).",
      ],
      [
        "Que provoque une hausse du policy rate, via le monetary transmission mechanism ?",
        "Policy rate ↑ : ==croissance et inflation ↓==, devise ↑\nEn clair : La hausse passe par 4 canaux : taux bancaires (crédit ↓), prix des actifs (wealth effect ↓), anticipations (dépenses ↓) et exchange rate (devise ↑, exports ↓).",
      ],
      [
        "Formule du neutral rate ? Application : real trend rate of growth 3 %, inflation target 2 %, policy rate 6 % : monetary policy expansionary ou contractionary ?",
        "$$\\text{neutral rate} = \\text{real trend rate of growth} + \\text{inflation target}$$\nEn clair : Neutral rate = 3 % + 2 % = 5 % < policy rate 6 % : contractionary. Un policy rate sous le neutral rate serait expansionary.\nPiège : comparer au neutral rate, pas à la seule inflation target.",
      ],
      [
        "Quelles sont les 3 qualités d'une central bank efficace ?",
        "Independence : ==sans ingérence politique== · Credibility : ==tient ses cibles== · Transparency : ==explique ses choix==\nEn clair : Avec l'operational independence, elle fixe seule le policy rate ; avec la target independence, aussi la cible, sa mesure et l'horizon. L'ECB (European Central Bank) a les deux.",
      ],
      [
        "Exchange rate targeting (ancrer sa devise sur une autre, souvent l'USD) : quelles conséquences pour la monetary policy du pays ?",
        "Inflation : ==celle du pays d'ancrage== · Taux : ==suivent le change visé==\nEn clair : Si sa devise faiblit, la central bank la rachète avec ses réserves : money supply ↓, taux ↑. Elle ne peut plus régler ses taux sur la conjoncture domestique.",
      ],
      [
        "Pourquoi la monetary policy peut-elle ne pas produire l'effet voulu ?",
        "Liquidity trap : ==la monnaie injectée reste en cash== · Banques : ==refusent de prêter== · Long-term rates : ==montent quand même== · Policy rate : ==bloqué à zéro==\nEn clair : Les long-term rates montent si la baisse des taux fait craindre l'inflation. À zéro, reste le QE (quantitative easing).",
      ],
      [
        "Fiscal policy et monetary policy : quelle combinaison fait croître la part du secteur privé dans le GDP (gross domestic product), et laquelle celle du secteur public ?",
        "Privé : ==fiscal contractionary, monetary expansionary== · Public : ==fiscal expansionary, monetary contractionary==\nEn clair : Taux bas et budget serré laissent la place à l'investissement privé. Budget large et taux hauts gonflent la part du government spending.",
      ],
      [
        "En geopolitics, qui sont les state actors et les nonstate actors, et quand un pays coopère-t-il ?",
        "State actors : ==gouvernements nationaux== · Nonstate actors : ==firmes, NGOs, individus== · Coopération : ==selon le national interest==\nEn clair : Un pays coopère quand cela sert son national interest. NGOs = non-governmental organizations. Le soft power influence sans la force (culture, institutions).",
      ],
      [
        "Quels sont les 4 archétypes de pays selon cooperation vs non-cooperation et globalization vs nationalism ?",
        "Multilateralism : ==coopère avec beaucoup de pays== (cooperation + globalization) · Bilateralism : ==coopère pays par pays== (cooperation + nationalism) · Hegemony : ==puissant, influence sans coopérer== (non-cooperation + globalization) · Autarky : ==vise l'autosuffisance== (non-cooperation + nationalism)\nEn clair : En autarky, l'État contrôle souvent l'industrie et les médias.",
      ],
      [
        "IMF (International Monetary Fund), World Bank, WTO (World Trade Organization) : quel est le rôle de chacun ?",
        "IMF : ==veille à la stabilité des changes== · World Bank : ==finance le développement contre la pauvreté== · WTO : ==fixe les règles du commerce mondial==\nEn clair : L'IMF prête aux pays en crise de balance of payments. La WTO règle les différends commerciaux.\nPiège : l'IMF prête aussi, mais seule la World Bank vise la pauvreté.",
      ],
      [
        "Event risk, exogenous risk, thematic risk : comment se distinguent ces 3 types de geopolitical risk ?",
        "Event risk : ==date connue, issue inconnue, ex. élection== · Exogenous risk : ==événement imprévu, ex. guerre== · Thematic risk : ==facteur connu aux effets durables==\nEn clair : Exemples de thematic risk : les migrations, le cyber risk.\nPiège : black swan = exogenous risk improbable, gros effet court terme ; à long horizon, ne pas réagir.",
      ],
      [
        "Sur quels 3 critères un investisseur juge-t-il un geopolitical risk pour son portefeuille ?",
        "Likelihood : ==probabilité que l'événement arrive== · Impact : ==ampleur de l'effet sur les placements== · Velocity : ==vitesse à laquelle les prix réagissent==\nEn clair : On s'aide de scenario analysis et de signposts (signaux à surveiller). L'impact est plus fort quand l'économie est en récession.",
      ],
      [
        "Quels sont les 3 types de tools of geopolitics, avec des exemples pour chacun ?",
        "National security : ==conflit armé, espionnage, alliances== · Economic : ==accords commerciaux, VER, nationalization== · Financial : ==investissement étranger, change, sanctions==\nEn clair : Coopératifs : alliances, FTA (free trade area). Non coopératifs : conflit armé, VER (voluntary export restraint).\nPiège : sanctions = financial tool, pas economic tool.",
      ],
    ],
  },
  {
    title: "Economics — Flashcards 4/4 (Commerce et change)",
    cards: [
      [
        "Quels sont les gains et les coûts de l'international trade ?",
        "Gains : ==comparative advantage==, échelle, variété · Coûts : ==secteurs face aux imports==\nEn clair : Le commerce apporte aussi plus de concurrence. En théorie, les gagnants pourraient compenser les perdants.\nPiège : comparative advantage = opportunity cost plus bas, pas « produire le plus ».",
      ],
      [
        "Tariff, import quota, VER (voluntary export restraint) : quels effets communs pour le pays importateur, et qui capte la rente ?",
        "Tous : ==prix ↑, imports ↓== · Tariff : ==taxe sur les imports== → rente à l'État · Quota : ==plafond d'imports== → État si licences vendues · VER : ==l'exportateur limite ses exports== → rente à l'étranger\nEn clair : Les consommateurs perdent plus que ne gagnent producteurs et État (deadweight loss). Un grand pays peut gagner avec un tariff ou un quota (world price ↓).",
      ],
      [
        "Quels sont les effets d'une export subsidy pour un petit pays exportateur, et pour un grand ?",
        "Petit pays : ==prix domestique ↑== · Grand pays : ==world price ↓==\nEn clair : Dans un petit pays, prix domestique = world price + subsidy : les exportateurs gagnent, les consommateurs paient plus. Un grand pays fait baisser le world price, au profit des acheteurs étrangers.",
      ],
      [
        "Quels arguments en faveur des trade restrictions les économistes acceptent-ils, et lesquels rejettent-ils ?",
        "Acceptés : ==infant industry, national security== · Rejetés : ==protéger emplois et industries==\nEn clair : D'autres motifs sont invoqués : représailles, recettes de tariffs, lutte contre le dumping. Le minimum domestic content (part locale imposée) est un autre outil.",
      ],
      [
        "Classe les trading blocs (regional trading agreements) du moins au plus intégré.",
        "FTA : ==commerce libre entre membres== · Customs union : ==FTA + tarif extérieur commun== · Common market : ==customs union + travail et capital libres== · Economic union : ==common market + institutions communes== · Monetary union : ==economic union + monnaie unique==\nEn clair : FTA = free trade area. Ex. : EU (European Union) = economic union, Eurozone = monetary union.",
      ],
      [
        "Formule de la variation d'une devise à partir d'une cotation P/B (price/base) ? Application : USD/EUR passe de 1,44 à 1,42. Variation de l'EUR, puis de l'USD ?",
        "$$\\%\\Delta_{\\text{base}} = \\dfrac{S_1}{S_0} - 1 \\qquad \\%\\Delta_{\\text{price}} = \\dfrac{S_0}{S_1} - 1$$\nEn clair : L'EUR (base) varie de 1,42 / 1,44 − 1 = −1,39 %, l'USD (price currency) de 1,44 / 1,42 − 1 = +1,41 %. S = USD/EUR au début (0) et à la fin (1).\nPiège : −1,39 % pour l'EUR ne fait pas +1,39 % pour l'USD.",
      ],
      [
        "Formule du real exchange rate P/B (price/base) ? Application : nominal 1,60 USD/GBP, CPI 110 aux États-Unis, 112 au Royaume-Uni (base 100 dans les deux).",
        "$$\\text{real}_{P/B} = S_{P/B} \\times \\dfrac{\\text{CPI}_B}{\\text{CPI}_P}$$\nEn clair : Real USD/GBP = 1,60 × 112 / 110 = 1,629. S = nominal exchange rate, CPI = consumer price index, B = base currency (GBP), P = price currency (USD).\nPiège : l'inflation du pays de la price currency fait baisser le real exchange rate.",
      ],
      [
        "Sell side vs buy side du FX (foreign exchange) market : qui sont les acteurs de chaque côté ?",
        "Sell side : ==grandes banques qui font le marché== · Buy side : ==clients des banques dealers==\nEn clair : Le buy side regroupe corporations, real money accounts (fonds sans derivatives), leveraged accounts (hedge funds), États, central banks et retail.\nPiège : le côté ne dit pas le motif : hedging réduit un risque de change, speculating l'augmente.",
      ],
      [
        "Classe les exchange rate regimes, du plus rigide au plus souple.",
        "==Dollarization== → monetary union → currency board → peg → target zone → crawling peg → float\nEn clair : Sous dollarization ou monetary union, ni devise ni monetary policy propres. Un currency board couvre 100 % de sa monnaie en devises. Peg ± 1 %, target zone ± 2 %.\nPiège : un currency board garde sa propre monnaie (≠ dollarization).",
      ],
      [
        "Au fil du business cycle, qu'est-ce qui fait varier les imports et les exports d'un pays ?",
        "Imports : ==domestic GDP== · Exports : ==GDP des trading partners== · Devise ↑ : ==exports ↓==\nEn clair : En expansion, le pays importe plus ; ses exports suivent la croissance de ses clients. GDP = gross domestic product.\nPiège : une expansion domestique fait monter les imports, pas les exports.",
      ],
      [
        "Selon l'identité $X - M = (S - I) + (T - G)$, comment un trade deficit est-il financé, et qu'est-ce qui pilote le change à court terme ?",
        "Trade deficit : ==entrées de capitaux== · Change (court terme) : ==capital flows==\nEn clair : Si X (exports) < M (imports), l'épargne privée S et publique T − G (taxes − government spending) ne couvre pas l'investissement I. À long terme, le change suit plutôt le commerce.",
      ],
      [
        "Pourquoi un gouvernement impose-t-il des capital restrictions ?",
        "==Moins de volatilité== · ==Peg tenable== · ==Taux domestiques bas== · ==Secteurs stratégiques protégés==\nEn clair : Les capital restrictions interdisent l'investissement étranger, taxent les revenus venus de l'étranger ou bloquent le rapatriement des profits. Globalement, elles réduisent l'economic welfare.",
      ],
      [
        "Formule d'un cross rate A/C à partir de A/B et B/C ? Application : MXN/USD = 10,70 et USD/AUD = 0,60. MXN/AUD ?",
        "$$\\dfrac{A}{C} = \\dfrac{A}{B} \\times \\dfrac{B}{C}$$\nEn clair : MXN/AUD = 10,70 × 0,60 = 6,42 : la devise commune B (USD) s'annule. Si les deux cotations ont la même base, on divise : (A/B) / (C/B) = A/C.\nPiège : si la devise commune ne s'annule pas, inverser d'abord une cotation.",
      ],
      [
        "Formule d'un forward rate coté en forward points ? Application : spot 1,3500 USD/EUR, forward points à 6 mois : −75.",
        "$$F = S + \\dfrac{\\text{forward points}}{10^{d}}$$\nEn clair : F = 1,3500 − 75 / 10 000 = 1,3425 USD/EUR, où d = nombre de décimales du spot (ici 4). F < S : l'EUR (base) est en forward discount, l'USD en forward premium.\nPiège : forward coté en % : F = S × (1 + %), pas S + %.",
      ],
      [
        "Formule du forward rate sans arbitrage (covered interest rate parity) ? Application : spot 1,2500 USD/EUR, risk-free rate à 1 an : 3 % sur l'USD, 4 % sur l'EUR.",
        "$$F_{P/B} = S_{P/B} \\times \\dfrac{1 + i_P \\times \\frac{\\text{days}}{360}}{1 + i_B \\times \\frac{\\text{days}}{360}}$$\nEn clair : F = 1,2500 × 1,03 / 1,04 = 1,2380 USD/EUR. $i_P$, $i_B$ = taux de la price currency (USD) et de la base currency (EUR). L'EUR, au taux plus haut, est en forward discount.\nPiège : taux annuel × days/360, sans composer ; taux de la price currency au numérateur.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "flashcards");
  console.log("Flashcards — Système Economics (4 paquets × 15)...");
  const total = await seedFlashcardSets({ ownerId, folderId, sets: SETS, oldTitles });
  console.log(`\n✅ Terminé. ${total} cartes ajoutées.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  });
}
