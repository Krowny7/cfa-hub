// Seed script — flashcards "Système" Economics (CFA Level I).
// 4 paquets × 15 cartes (60), à réviser en une nuit en combo avec le one-pager
// Economics (cfa-work/onepagers/economics.html) : chaque notion du one-pager a
// au moins une carte. Chaque carte se comprend seule (cartes mélangées) ;
// phrases en français, termes techniques en anglais. Verso au format « trois
// cases » : l'idée à retenir (≤ 12 mots, ==surligné==, formule ou liste), puis
// « En clair : », puis « Piège : » s'il y a un vrai piège d'examen.
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
        "Profit maximal quand ==marginal revenue égale marginal cost== (MR = MC)\nEn clair : c'est vrai dans les 4 market structures. En perfect competition, P = MR, donc P = MR = MC ; ailleurs, la demande décroît et P > MR = MC.\nPiège : « P = MR » n'est vrai qu'en perfect competition (firme price taker).",
      ],
      [
        "Breakeven, short-run shutdown, long-run exit : à quelles conditions sur le prix P, l'AVC (average variable cost) et l'ATC (average total cost) ?",
        "Breakeven : P = ==ATC== · Short-run shutdown : P < ==AVC== · Long-run exit : P < ==ATC==\nEn clair : si AVC ≤ P < ATC, on produit à court terme (on couvre une partie des fixed costs) mais on sort à long terme, où tous les coûts sont évitables.\nPiège : fermer à court terme se juge sur l'AVC, pas sur l'ATC.",
      ],
      [
        "Une firme a un total revenue (TR) de 700 000, des total variable costs (TVC) de 800 000 et des fixed costs de 400 000. Doit-elle produire à court terme ?",
        "Non : ==shut down==, car TR < TVC\nEn clair : en produisant, perte = 700 000 − 1 200 000 = −500 000 ; à l'arrêt, perte = fixed costs = −400 000. On perd moins en fermant.\nPiège : en imperfect competition (P ≠ MR), on raisonne en TR, TVC et TC, pas sur le prix.",
      ],
      [
        "Sur la LRATC (long-run average total cost), où se trouve la minimum efficient scale, et que signifient ses segments décroissant, plat et croissant ?",
        "Minimum efficient scale = ==point bas de la LRATC==\nEn clair : pente négative : economies of scale (spécialisation, achats moins chers) ; plat : constant returns to scale ; pente positive : diseconomies of scale (bureaucratie).\nPiège : en perfect competition, à long terme, P = minimum de la LRATC.",
      ],
      [
        "Quelles sont les caractéristiques de la perfect competition ?",
        "Très nombreuses firmes, ==produit homogène==, aucun pricing power\nEn clair : barriers to entry très faibles, concurrence sur le prix seul. Chaque firme est price taker (demande horizontale) ; à long terme, economic profit nul.",
      ],
      [
        "Quelles sont les caractéristiques de la monopolistic competition ?",
        "Beaucoup de firmes, ==produits différenciés==, un peu de pricing power\nEn clair : barriers to entry faibles ; demande décroissante mais élastique (beaucoup de proches substituts) ; concurrence par la publicité et la marque. Ex. : le dentifrice.",
      ],
      [
        "Monopolistic competition : quel est l'équilibre de long terme d'une firme, comparé à la perfect competition ?",
        "==Economic profit nul==, mais P > MC et excess capacity\nEn clair : les entrées (ou la publicité) ramènent P à l'ATC (average total cost), sans atteindre son minimum : prix plus haut et quantité plus faible qu'en perfect competition.\nPiège : profit nul comme en perfect competition, mais P > MR = MC, pas P = MC.",
      ],
      [
        "Quelles sont les caractéristiques d'un oligopoly ?",
        "Peu de firmes, ==décisions interdépendantes==, barriers to entry élevées\nEn clair : produits similaires ou différenciés ; chacun anticipe la réaction des rivales, donc pas de supply curve bien définie. Economic profit possible à long terme. Ex. : l'automobile.",
      ],
      [
        "Qu'est-ce qui caractérise un monopoly, et d'où vient son pouvoir ?",
        "==Un seul vendeur==, sans substitut, barriers to entry très élevées\nEn clair : son pouvoir vient de brevets, d'une ressource clé, d'une licence ou d'une régulation. Il produit où MR = MC, avec P > MR : economic profit possible à long terme.",
      ],
      [
        "Que suppose le kinked demand curve model d'un oligopoly, et quelle en est la conséquence sur le prix ?",
        "Prix ==figé au coude== : baisses suivies, hausses non suivies\nEn clair : au-dessus du prix actuel $P_K$, demande élastique ; en dessous, peu élastique. La MR (marginal revenue) a un trou au coude : si la MC (marginal cost) y passe, le prix ne bouge pas.",
      ],
      [
        "Cournot model vs Stackelberg model d'un oligopoly : quelle hypothèse et quel résultat pour chacun ?",
        "Cournot ==simultané== (parts égales) ; Stackelberg séquentiel (leader avantagé)\nEn clair : Cournot : chacun suppose l'autre figé ; à MC (marginal cost) égaux, parts égales, prix entre monopoly et perfect competition. Stackelberg : le leader décide d'abord.",
      ],
      [
        "Que décrit le dominant firm model d'un oligopoly ?",
        "La firme aux ==coûts les plus bas== fixe le prix\nEn clair : grâce à son échelle, elle a une grosse part du marché ; les petites firmes prennent ce prix et produisent où leur MC (marginal cost) l'égale. Si elles le baissent, elle suit.",
      ],
      [
        "Oligopoly : qu'est-ce qu'un Nash equilibrium, et pourquoi une collusion (cartel) peut faire mieux mais reste instable ?",
        "Nash equilibrium : ==nul ne gagne à dévier seul==\nEn clair : une collusion (ex. : OPEC) rapporte plus au total, mais chacun gagne à tricher en produisant plus. Elle tient mieux avec peu de firmes, des produits et des coûts proches.",
      ],
      [
        "Top 5 des market shares : 25 %, 15 %, 15 %, 10 %, 5 %. La n° 1 rachète une firme à 15 %. Que deviennent le CR (concentration ratio) et le HHI (Herfindahl-Hirschman Index) à 4 firmes ?",
        "HHI à 4 firmes : 0,1175 → ==0,1950== ; CR : 65 → 70 %\nEn clair : $\\text{CR} = \\sum s_i$ et $\\text{HHI} = \\sum s_i^2$ ($s_i$ = market share en décimal). Après fusion : 40 + 15 + 10 + 5, la firme à 5 % entre dans le top 4.\nPiège : le HHI réagit bien plus aux fusions que le CR.",
      ],
      [
        "Pourquoi le CR (concentration ratio) et le HHI (Herfindahl-Hirschman Index) jugent-ils mal le market power, et sur quels critères classer une industrie ?",
        "Simples proxies : ==ils ignorent les barriers to entry==\nEn clair : une firme à forte market share a peu de pricing power si l'entrée est facile. Pour classer : nombre de firmes, différenciation, pricing power, barrières, concurrence hors prix.",
      ],
    ],
  },
  {
    title: "Economics — Flashcards 2/4 (Cycles et politique budgétaire)",
    cards: [
      [
        "Quelles sont les 4 phases du business cycle, et que voit-on au peak et en contraction ?",
        "Expansion : ==real GDP ↑== · Peak : ==sommet== · Contraction : ==real GDP ↓== · Trough : ==creux==\nEn clair : peak : la croissance ralentit, inflation ↑, embauches ralenties. Contraction : heures ↓, unemployment ↑, imports ↓, inflation ↓ avec retard. Repère : 2 trimestres de real GDP ↓.",
      ],
      [
        "Classical cycle, growth cycle, growth rate cycle : que mesure chacun, et lequel est préféré ?",
        "==Growth rate cycle== préféré : il montre peaks et troughs plus tôt\nEn clair : classical cycle : niveau du real GDP. Growth cycle : écart du real GDP à sa tendance (potential GDP). Growth rate cycle : taux de croissance d'une période à l'autre.",
      ],
      [
        "Qu'est-ce qu'un credit cycle, et comment interagit-il avec le business cycle ?",
        "Credit cycle : ==crédit facile en expansion==, rare et cher ensuite\nEn clair : il amplifie le business cycle (bulles si le crédit est trop facile) et dure en moyenne plus longtemps. Secteur le plus lié : la construction.",
      ],
      [
        "Comment évolue l'inventory-to-sales ratio au fil du business cycle ?",
        "Inventory-to-sales ratio ==↑ en fin d'expansion==, ↓ près du trough\nEn clair : avant le peak, les ventes ralentissent et les inventories s'accumulent ; à la reprise, les ventes repartent et les inventories fondent. C'est un lagging indicator.\nPiège : une hausse non voulue des inventories gonfle le GDP : fausse vigueur.",
      ],
      [
        "Face à un retournement du business cycle, comment les firmes ajustent-elles d'abord leur travail et leur capital ?",
        "D'abord l'==intensité d'usage== : heures, overtime, machines\nEn clair : elles n'embauchent ou ne licencient que si la tendance dure. En contraction, elles reportent l'entretien et ne remplacent pas les équipements.\nPiège : le capital se réduit en reportant l'entretien, rarement en vendant des actifs.",
      ],
      [
        "Comment les dépenses des ménages (durable goods, services, nondurable goods, logement) réagissent-elles au business cycle ?",
        "Durable goods ==très cycliques== > services > nondurable goods\nEn clair : voitures et meubles se reportent en contraction. Housing : fortes variations, selon les mortgage rates, le prix des logements / revenu, la spéculation, la part des 25–40 ans.",
      ],
      [
        "Leading, coincident, lagging indicators : que signale chacun ? Donne des exemples.",
        "Leading ==tourne avant== le cycle ; coincident pendant ; lagging après\nEn clair : leading : building permits, initial jobless claims, consumer expectations, S&P 500. Coincident : industrial production, payrolls. Lagging : duration of unemployment, inventory-to-sales ratio.",
      ],
      [
        "Quels sont les 3 rôles de la fiscal policy, et lequel la distingue de la monetary policy ?",
        "==Stabiliser== l'aggregate demand · ==Redistribuer== revenus et richesse · ==Allouer== les ressources\nEn clair : fiscal policy : le gouvernement, via government spending et taxes ; monetary policy : la central bank, via monnaie et crédit. Seule la fiscal policy redistribue revenus et richesse.",
      ],
      [
        "Quels fiscal policy tools agissent vite, et lesquels lentement ?",
        "Rapides : ==indirect taxes== ; lents : direct taxes, transfers, capital spending\nEn clair : les indirect taxes (VAT, sales, excise) servent vite la politique sociale et les recettes. Une hausse de dépense relance plus qu'une baisse d'impôt, en partie épargnée.\nPiège : les transfer payments ne comptent pas dans le GDP.",
      ],
      [
        "Quelles sont les 4 qualités d'une bonne tax policy ?",
        "Simplicity : ==facile à payer== · Efficiency : ==peu de distorsion== · Fairness : ==équitable== · Sufficiency : ==recettes suffisantes==\nEn clair : fairness = horizontal equality (même situation, même impôt) et vertical equality (les plus riches paient plus) ; efficiency : ne pas décourager le travail.",
      ],
      [
        "Comment se calcule le fiscal multiplier ? Applique-le à une MPC (marginal propensity to consume) de 0,8, un tax rate de 25 % et une hausse du government spending de 100.",
        "Multiplier = ==2,5==, aggregate demand +250\n$$\\text{fiscal multiplier} = \\dfrac{1}{1 - \\text{MPC}\\,(1 - t)}$$\nEn clair : 1 / (1 − 0,8 × 0,75) = 1 / 0,4 = 2,5 ; 100 × 2,5 = 250. MPC = marginal propensity to consume, t = tax rate.\nPiège : ne pas y mettre la MPS (marginal propensity to save = 1 − MPC).",
      ],
      [
        "Balanced budget : avec une MPC (marginal propensity to consume) de 0,8 et un tax rate de 25 %, l'État augmente government spending et taxes de 100 chacun. Effet sur l'aggregate demand ?",
        "Aggregate demand ==+50== : balanced budget multiplier positif\nEn clair : multiplier = 2,5. Dépenses : 100 × 2,5 = +250. Impôts : la consommation baisse de 0,8 × 100 = 80, puis 80 × 2,5 = −200. Net : +50.\nPiège : l'effet n'est pas nul ; il faudrait 100 / 0,8 = 125 d'impôts pour l'annuler.",
      ],
      [
        "Comment juger si une fiscal policy est expansionary ou contractionary ?",
        "Juger sur le ==structural deficit== (corrigé du cycle)\nEn clair : structural deficit ↑ = expansionary. En récession, les automatic stabilizers (tax revenues ↓, unemployment benefits ↑) creusent seuls le deficit, sans décision.\nPiège : un deficit qui se creuse en récession n'est pas forcément une relance.",
      ],
      [
        "Pourquoi la discretionary fiscal policy est-elle difficile à bien doser ?",
        "3 délais : ==recognition, action, impact lags==\nEn clair : voir le problème, voter la mesure, attendre l'effet : la relance arrive parfois trop tard. Aussi : crowding-out, supply shortages, multiple targets, full employment mal mesuré.",
      ],
      [
        "Faut-il s'inquiéter d'un fiscal deficit élevé ? Donne les arguments pour et contre.",
        "Inquiétant si ==impôts futurs, crowding-out ou refinancement refusé==\nEn clair : moins grave si la dette est due aux résidents, finance du capital spending, en sous-emploi, ou avec la Ricardian equivalence. Debt/GDP ↑ si real rate > real growth.",
      ],
    ],
  },
  {
    title: "Economics — Flashcards 3/4 (Politique monétaire et géopolitique)",
    cards: [
      [
        "Quels sont les rôles d'une central bank ?",
        "Émettre la monnaie, ==lender of last resort==, réserves, monetary policy\nEn clair : elle est aussi banker to the government and banks et régulateur du payments system. Prêter aux banques à court de liquidité évite les bank runs.\nPiège : elle ne collecte pas les impôts et ne finance pas les agences publiques.",
      ],
      [
        "Pourquoi les central banks visent-elles une inflation d'environ 2 % plutôt que 0 % ?",
        "Cible ≈ 2 % pour ==éviter la deflation==\nEn clair : price stability est l'objectif principal (cible courante 2 % ± 1 %, à horizon de 2 ans). Avec 0 %, les écarts autour de la cible feraient passer l'inflation sous zéro.",
      ],
      [
        "Quels sont les 3 outils de la monetary policy, et dans quel sens les utiliser pour une politique expansionary ?",
        "Expansionary : ==baisser== policy rate et reserve requirements, acheter des titres\nEn clair : les 3 outils : policy rate (discount rate Fed, refinancing rate BCE, two-week repo Bank of England), reserve requirements, open market operations.",
      ],
      [
        "Que provoque une hausse du policy rate, via le monetary transmission mechanism ?",
        "Policy rate ↑ : croissance ↓, inflation ↓, ==devise ↑==\nEn clair : 4 canaux : taux bancaires (crédit ↓), prix des actifs (wealth effect ↓), anticipations (dépenses ↓), exchange rate (devise ↑, exports ↓).",
      ],
      [
        "Real trend rate of growth 3 %, inflation target 2 %, policy rate 6 % : la monetary policy est-elle expansionary ou contractionary ?",
        "==Contractionary== : policy rate 6 % > neutral rate 5 %\nEn clair : neutral rate = real trend rate of growth + inflation target = 3 % + 2 % = 5 %. Policy rate au-dessus : contractionary ; en dessous : expansionary.\nPiège : comparer au neutral rate, pas à la seule inflation target.",
      ],
      [
        "Quelles sont les 3 qualités d'une central bank efficace ?",
        "Independence : ==fixe seule ses taux== · Credibility : ==tient ses cibles== · Transparency : ==explique ses choix==\nEn clair : operational independence : elle fixe seule le policy rate ; target independence : aussi la cible, sa mesure, l'horizon (la BCE a les deux). Une central bank crédible voit ses cibles se réaliser.",
      ],
      [
        "Exchange rate targeting (ancrer sa devise sur une autre, souvent l'USD) : quelles conséquences pour la monetary policy du pays ?",
        "Le pays ==importe l'inflation== de la devise d'ancrage\nEn clair : devise trop faible : la central bank rachète sa monnaie avec ses réserves (money supply ↓, taux ↑). Ses taux suivent le change visé, pas sa conjoncture.",
      ],
      [
        "Pourquoi la monetary policy peut-elle ne pas produire l'effet voulu ?",
        "Liquidity trap, long-term rates à rebours, ==taux bloqué à zéro==\nEn clair : liquidity trap : on garde le cash même si la money supply monte. Les banques peuvent aussi refuser de prêter. Au plancher zéro : QE (quantitative easing), achats massifs de titres.",
      ],
      [
        "Fiscal policy et monetary policy : quelle combinaison fait croître la part du secteur privé dans le GDP, et laquelle celle du secteur public ?",
        "Privé ↑ : ==fiscal contractionary + monetary expansionary==\nEn clair : public ↑ : fiscal expansionary + monetary contractionary (taux ↑). Toutes deux expansionary : demande forte, taux ↓ ; toutes deux contractionary : demande ↓, taux ↑.",
      ],
      [
        "En geopolitics, qui sont les state actors et les nonstate actors, et quand un pays coopère-t-il ?",
        "Un pays coopère si son ==national interest== y gagne\nEn clair : state actors : gouvernements nationaux ; nonstate actors : entreprises, NGOs (non-governmental organizations), individus. Soft power : influencer sans force (culture, institutions).",
      ],
      [
        "Quels sont les 4 archétypes de pays selon cooperation vs non-cooperation et globalization vs nationalism ?",
        "Multilateralism : ==cooperation + globalization== · Bilateralism : ==cooperation + nationalism== · Hegemony : ==non-cooperation + globalization== · Autarky : ==non-cooperation + nationalism==\nEn clair : autarky : autosuffisance, peu de commerce extérieur. Hegemony : assez puissant pour peser sans coopérer.",
      ],
      [
        "IMF (International Monetary Fund), World Bank, WTO (World Trade Organization) : quel est le rôle de chacun ?",
        "IMF : ==change, balance of payments== · World Bank : ==pauvreté== · WTO : ==règles du commerce==\nEn clair : l'IMF aide les pays en crise de balance of payments ; la World Bank finance le développement ; la WTO règle les différends commerciaux.\nPiège : seule la World Bank vise explicitement la pauvreté ; l'IMF prête aussi.",
      ],
      [
        "Event risk, exogenous risk, thematic risk : comment se distinguent ces 3 types de geopolitical risk ?",
        "Event : ==date connue== · Exogenous : ==imprévu== · Thematic : ==effets durables connus==\nEn clair : event : une élection (issue inconnue) ; exogenous : guerre, rébellion ; thematic : migrations, cyber risk, climat.\nPiège : black swan = exogenous risk improbable, gros effet court terme ; à long horizon, ne pas réagir.",
      ],
      [
        "Comment un investisseur analyse-t-il un geopolitical risk et son effet sur un portefeuille ?",
        "Par sa ==likelihood==, son impact et sa velocity\nEn clair : likelihood = probabilité ; impact = ampleur sur les placements ; velocity = vitesse à laquelle les prix le reflètent. Outils : scenario analysis, signposts. Effet plus fort en récession.\nPiège : velocity mesure la réaction des prix, pas la vitesse de l'événement.",
      ],
      [
        "Quels sont les 3 types de tools of geopolitics ? Donne des exemples coopératifs et non coopératifs.",
        "National security : ==armée, alliances== · Economic : ==commerce, nationalization== · Financial : ==capitaux, sanctions==\nEn clair : coopératifs : alliances, FTA (free trade area), capitaux libres. Non coopératifs : conflit armé, VER (voluntary export restraint), nationalization, sanctions.\nPiège : les sanctions sont un financial tool, pas un economic tool.",
      ],
    ],
  },
  {
    title: "Economics — Flashcards 4/4 (Commerce et change)",
    cards: [
      [
        "Quels sont les gains et les coûts de l'international trade ?",
        "Gains : ==comparative advantage==, échelle, variété ; coût : secteurs concurrencés\nEn clair : aussi plus de concurrence et une meilleure allocation. Perdants : emplois des secteurs face aux imports ; les gagnants pourraient les compenser.\nPiège : comparative advantage = opportunity cost plus bas, pas « produire le plus ».",
      ],
      [
        "Tariff, import quota, VER (voluntary export restraint) : quels effets communs pour le pays importateur, et qui capte la rente ?",
        "Prix ↑, imports ↓, ==deadweight loss== ; VER : rente aux étrangers\nEn clair : consumer surplus ↓, producer surplus ↑. Tariff : recette pour l'État ; quota : pour l'État s'il vend les licences, sinon quota rents aux exportateurs étrangers.\nPiège : un VER coûte plus au pays qu'un tariff équivalent (rente captée à l'étranger).",
      ],
      [
        "Quels sont les effets d'une export subsidy pour un petit pays exportateur et pour un grand ?",
        "Petit pays : prix domestique = ==world price + subvention==\nEn clair : exportateurs gagnants, consommateurs domestiques perdants, coût pour l'État. Grand pays : le world price baisse, une partie du gain part aux consommateurs étrangers.",
      ],
      [
        "Quels arguments en faveur des trade restrictions les économistes acceptent-ils, et lesquels rejettent-ils ?",
        "Acceptés : ==infant industry et national security== seulement\nEn clair : rejetés : protéger emplois et industries domestiques, se protéger des pays à bas salaires. Autres motifs : représailles, recettes, dumping. Autre outil : minimum domestic content.",
      ],
      [
        "Classe les trading blocs (regional trading agreements) du moins au plus intégré.",
        "FTA : ==libre-échange== · Customs union : ==+ tarif commun== · Common market : ==+ facteurs libres== · Economic union : ==+ institutions communes== · Monetary union : ==+ monnaie unique==\nEn clair : chaque bloc garde les acquis du bloc d'avant. FTA = free trade area ; facteurs = travail et capital. Ex. : NAFTA, EU, Eurozone.",
      ],
      [
        "USD/EUR passe de 1,44 à 1,42. De combien l'EUR s'est-il déprécié face à l'USD, et de combien l'USD s'est-il apprécié face à l'EUR ?",
        "EUR ==−1,39 %==, USD +1,41 %\n$$\\%\\Delta_{\\text{base}} = \\dfrac{S_1}{S_0} - 1$$\nEn clair : USD/EUR = prix en USD d'1 EUR (base). EUR : 1,42 / 1,44 − 1. USD (price currency) : on inverse, 1,44 / 1,42 − 1. S = spot.\nPiège : −1,39 % pour l'un ne fait pas +1,39 % pour l'autre.",
      ],
      [
        "Nominal exchange rate 1,60 USD/GBP ; CPI américain 110, CPI britannique 112 (base 100 dans les deux pays). Quel real exchange rate USD/GBP ?",
        "Real USD/GBP = ==1,629==\n$$\\text{real}_{P/B} = S_{P/B} \\times \\dfrac{\\text{CPI}_B}{\\text{CPI}_P}$$\nEn clair : 1,60 × 112 / 110 = 1,629. S = nominal exchange rate, P = price currency (USD), B = base currency (GBP), CPI = consumer price index.\nPiège : l'inflation du pays de la price currency fait baisser le real exchange rate.",
      ],
      [
        "Sell side vs buy side du FX (foreign exchange) market : qui sont les acteurs de chaque côté ?",
        "Sell side : ==les grandes banques dealers== ; buy side : leurs clients\nEn clair : buy side : corporations, real money accounts (mutual funds, pension funds, insurers, sans derivatives), leveraged accounts (hedge funds), États, central banks, retail.",
      ],
      [
        "Classe les exchange rate regimes, du plus rigide au plus souple.",
        "Du plus rigide : ==dollarization==, currency board, peg, target zone, crawling, float\nEn clair : en détail : dollarization, monetary union, currency board, fixed peg (± 1 %), target zone (± 2 %), crawling peg, crawling bands, managed floating, independent floating.",
      ],
      [
        "Selon l'identité $X - M = (S - I) + (T - G)$, comment un trade deficit est-il financé, et qui pilote le change à court terme ?",
        "Trade deficit = ==entrée de capitaux étrangers==\nEn clair : exports X < imports M : l'épargne privée S et publique T − G ne couvre pas l'investissement I. Les capital flows pilotent le change à court et moyen terme ; le commerce, à long terme.",
      ],
      [
        "Pourquoi un gouvernement impose-t-il des capital restrictions ?",
        "Objectifs : ==moins de volatilité==, peg tenable, taux bas, secteurs stratégiques\nEn clair : formes : interdire l'investissement étranger, taxer les revenus de l'étranger, bloquer le rapatriement des profits. Globalement, elles réduisent l'economic welfare.",
      ],
      [
        "MXN/USD = 10,70 et USD/AUD = 0,60. Quel cross rate MXN/AUD ?",
        "MXN/AUD = ==6,42==\n$$\\dfrac{\\text{MXN}}{\\text{AUD}} = \\dfrac{\\text{MXN}}{\\text{USD}} \\times \\dfrac{\\text{USD}}{\\text{AUD}}$$\nEn clair : 10,70 × 0,60 = 6,42 : la devise commune (USD) s'annule. Même devise de base : on divise, (CHF/USD) / (NZD/USD) = CHF/NZD.\nPiège : si la devise commune ne s'annule pas, inverser d'abord une cotation.",
      ],
      [
        "Spot 1,3500 USD/EUR, forward points à 6 mois : −75. Quel forward rate, et quelle devise est en forward premium ?",
        "Forward = ==1,3425== USD/EUR\n$$F = S + \\text{points} \\times \\text{valeur d'un point}$$\nEn clair : 1,3500 − 75 × 0,0001 = 1,3425 ; un point = dernière décimale du spot. F < S : l'EUR (base) est en forward discount (−0,56 %), l'USD en premium.\nPiège : forward coté en % : F = S × (1 + %), pas S + %.",
      ],
      [
        "Spot 1,2500 USD/EUR ; taux sans risque à 1 an : 3 % sur l'USD, 4 % sur l'EUR. Quel forward rate à 1 an sans arbitrage (covered interest rate parity) ?",
        "F = ==1,2380== USD/EUR\n$$F_{P/B} = S_{P/B} \\times \\dfrac{1 + i_P \\times \\frac{\\text{days}}{360}}{1 + i_B \\times \\frac{\\text{days}}{360}}$$\nEn clair : 1,2500 × 1,03 / 1,04 = 1,2380. $i_P$ = taux de la price currency (USD), $i_B$ = taux de la base (EUR). L'EUR, au taux le plus haut, est en forward discount.\nPiège : taux annuel × days/360, sans composer ; taux de la price currency au numérateur.",
      ],
      [
        "Covered interest arbitrage : quelles sont les étapes, et quand dégage-t-il un profit ?",
        "Emprunter, convertir au spot, placer, ==vendre à terme==, rembourser\nEn clair : emprunter la devise A, la changer en B, placer au taux de B, vendre forward le montant final contre A. Profit sans risque si le forward viole la covered interest rate parity.\nPiège : le forward rate n'est pas une prévision du futur spot rate.",
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
