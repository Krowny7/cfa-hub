// Seed script — flashcards "Système" Economics (CFA Level I).
// 4 paquets × 15 cartes (60), à réviser en une nuit en combo avec le one-pager
// Economics (cfa-work/onepagers/economics.html) : chaque notion du one-pager a
// au moins une carte. Chaque carte se comprend seule (cartes mélangées) ;
// phrases en français, termes techniques en anglais, réponse directe en gras.
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
        "**Produire la quantité où marginal revenue = marginal cost (MR = MC).**\nEn perfect competition, la firme est price taker : P = MR, donc P = MR = MC.\nDans les 3 autres structures (demande décroissante), MR < P : à l'optimum, P > MR = MC.\nPiège : « P = MR » n'est vrai qu'en perfect competition.",
      ],
      [
        "Breakeven, short-run shutdown, long-run exit : à quelles conditions sur le prix P, l'AVC (average variable cost) et l'ATC (average total cost) ?",
        "**Breakeven : P = ATC (economic profit nul). Shutdown à court terme : P < AVC. Exit à long terme : P < ATC.**\nSi AVC ≤ P < ATC : on continue à court terme (on couvre une partie des fixed costs), on sort à long terme.\nShort run : au moins un facteur fixe (le capital) ; long run : tous les coûts sont variables, donc évitables.",
      ],
      [
        "Une firme a un total revenue (TR) de 700 000, des total variable costs (TVC) de 800 000 et des fixed costs de 400 000. Doit-elle produire à court terme ?",
        "**Non : shut down, car TR (700 000) < TVC (800 000).**\nEn produisant, perte = TR − TC = 700 000 − 1 200 000 = −500 000 ; à l'arrêt, perte = fixed costs = −400 000.\nEn imperfect competition (P ≠ MR), on raisonne en TR et TC : TR = TC breakeven ; TVC < TR < TC on reste à court terme mais on sort à long terme ; TR < TVC on ferme.",
      ],
      [
        "Que montrent les segments décroissant, plat et croissant de la LRATC (long-run average total cost), et où est la minimum efficient scale ?",
        "**Décroissant : economies of scale ; plat : constant returns to scale ; croissant : diseconomies of scale. La minimum efficient scale est le point bas de la LRATC.**\nEconomies : spécialisation, production de masse, meilleurs équipements, achats moins chers. Diseconomies : bureaucratie, motivation, moins d'innovation.\nEn perfect competition, à long terme P = min LRATC. Une firme en diseconomies doit réduire sa taille.",
      ],
      [
        "Quelles sont les caractéristiques de la perfect competition ?",
        "**Très nombreuses firmes, produit homogène, barriers to entry très faibles, concurrence sur le prix seul, aucun pricing power.**\nChaque firme est price taker : demande horizontale (perfectly elastic), P = MR = MC.\nÀ long terme, les entrées ramènent l'economic profit à zéro : la firme ne gagne qu'un normal profit.",
      ],
      [
        "Quelles sont les caractéristiques de la monopolistic competition ?",
        "**Beaucoup de firmes, produits différenciés (qualité, features, marketing), barriers to entry faibles, un peu de pricing power.**\nDemande décroissante mais élastique, car il existe beaucoup de proches substituts. Concurrence surtout hors prix (publicité, marque).\nTrop de firmes pour une collusion : chacune regarde le prix moyen du marché. Ex. : le dentifrice.",
      ],
      [
        "Monopolistic competition : quel est l'équilibre de long terme d'une firme, comparé à la perfect competition ?",
        "**P = ATC (average total cost) : economic profit nul, mais P > MR = MC et la firme ne produit pas au minimum de l'ATC.**\nLes profits attirent des entrants (ou la publicité gonfle l'ATC) jusqu'à P = ATC.\nPar rapport à la perfect competition : prix plus haut, quantité plus faible, excess capacity.\nPiège : profit nul à long terme comme en perfect competition, mais P > MC.",
      ],
      [
        "Quelles sont les caractéristiques d'un oligopoly ?",
        "**Peu de firmes, barriers to entry élevées (souvent des economies of scale), produits similaires ou différenciés, décisions interdépendantes.**\nChaque firme anticipe la réaction des rivales : pas de supply curve bien définie.\nLe prix se situe entre le prix de collusion (celui d'un monopoly) et le prix de perfect competition. Economic profit possible à long terme. Ex. : l'automobile.",
      ],
      [
        "Qu'est-ce qui caractérise un monopoly, et d'où vient son pouvoir ?",
        "**Un seul vendeur, un produit sans bon substitut, des barriers to entry très élevées, un pricing power significatif.**\nSources : brevets et copyrights, contrôle d'une ressource clé, licence ou régulation publique (ex. : distribution locale d'électricité).\nLa firme fait face à la demande du marché (la plus raide) et produit où MR = MC, avec P > MR. Economic profit possible à long terme.",
      ],
      [
        "Que suppose le kinked demand curve model d'un oligopoly, et quelle en est la conséquence sur le prix ?",
        "**Les rivales suivent une baisse de prix mais pas une hausse : la demande a un coude au prix actuel $P_K$.**\nAu-dessus de $P_K$, la demande est très élastique (on perd ses clients) ; en dessous, peu élastique (les rivales suivent).\nLa marginal revenue curve a un trou au niveau du coude : tant que la MC (marginal cost) passe dans ce trou, le prix reste figé à $P_K$.",
      ],
      [
        "Cournot model vs Stackelberg model d'un oligopoly : quelle hypothèse et quel résultat pour chacun ?",
        "**Cournot : décisions simultanées, chacun suppose que l'autre ne changera pas ; à MC (marginal cost) identiques, market shares égales. Stackelberg : décisions séquentielles ; le leader garde la plus grande part.**\nCournot : prix entre celui d'un monopoly et celui de la perfect competition ; plus il y a de firmes, plus il se rapproche du prix concurrentiel.\nL'équilibre de Cournot est un Nash equilibrium.",
      ],
      [
        "Que décrit le dominant firm model d'un oligopoly ?",
        "**Une firme aux coûts nettement plus bas (plus grande échelle) détient une grosse part du marché et fixe le prix ; les petites firmes le prennent comme donné.**\nLes petites firmes produisent où leur MC (marginal cost) = ce prix.\nSi une petite firme baisse son prix, la dominant firm suit : à long terme, les petites produisent moins ou sortent, et la part de la dominant firm augmente.",
      ],
      [
        "Oligopoly : qu'est-ce qu'un Nash equilibrium, et pourquoi une collusion (cartel) peut faire mieux mais reste instable ?",
        "**Nash equilibrium : aucune firme ne peut augmenter son profit en changeant seule de stratégie.**\nLa collusion (accord sur les prix ou les quantités, ex. : OPEC) peut donner plus de profit total, mais chaque membre a intérêt à tricher en produisant plus.\nElle tient mieux avec : peu de firmes, produits et coûts similaires, achats petits et fréquents, représailles sûres et sévères, peu de concurrence extérieure.",
      ],
      [
        "Top 5 des market shares : 25 %, 15 %, 15 %, 10 %, 5 %. La n° 1 rachète une firme à 15 %. Que deviennent le CR (concentration ratio) et le HHI (Herfindahl-Hirschman Index) à 4 firmes ?",
        "**CR à 4 firmes : 65 % → 70 % ; HHI à 4 firmes : 0,1175 → 0,1950.**\n$$\\text{CR}_N = \\sum_{i=1}^{N} s_i \\qquad \\text{HHI}_N = \\sum_{i=1}^{N} s_i^2$$\noù $s_i$ = market share de la firme i (en décimal), N = nombre de plus grandes firmes retenues.\nAprès fusion : 40 + 15 + 10 + 5 (la firme à 5 % entre dans le top 4) ; HHI = 0,40² + 0,15² + 0,10² + 0,05².\nLe HHI réagit bien plus aux fusions que le CR.",
      ],
      [
        "Comment un analyste identifie-t-il la market structure d'une industrie, et que valent les concentration measures (CR, HHI) pour juger du market power ?",
        "**Il compare : nombre et taille des firmes, différenciation des produits, pricing power, barriers to entry, concurrence hors prix.**\nCR (N-firm concentration ratio) et HHI (Herfindahl-Hirschman Index) ne sont que des proxies : ils ignorent les barriers to entry et la concurrence potentielle, et ne mesurent pas l'elasticity de la demande.\nUne firme à forte market share peut avoir peu de pricing power si l'entrée est facile.",
      ],
    ],
  },
  {
    title: "Economics — Flashcards 2/4 (Cycles et politique budgétaire)",
    cards: [
      [
        "Quelles sont les 4 phases du business cycle, et que se passe-t-il au peak et en contraction ?",
        "**Expansion (le real GDP monte), peak (il cesse de monter), contraction ou recession (il baisse), trough (il cesse de baisser).**\nPeak : croissance qui ralentit, inflation ↑, embauches ralenties. Contraction : heures ↓, unemployment ↑, inflation ↓ avec retard.\nImports : suivent le GDP domestique ; exports : le GDP des partenaires.\nRepère : 2 trimestres de suite de real GDP en hausse (ou en baisse). Cycles récurrents mais irréguliers.",
      ],
      [
        "Classical cycle, growth cycle, growth rate cycle : que mesure chacun, et lequel est préféré ?",
        "**Classical cycle : le niveau du real GDP. Growth cycle : l'écart du real GDP à sa tendance (potential GDP). Growth rate cycle : le taux de croissance d'une période à l'autre.**\nLe growth rate cycle montre les peaks et les troughs plus tôt que les deux autres : c'est la mesure préférée des économistes et des praticiens.",
      ],
      [
        "Qu'est-ce qu'un credit cycle, et comment interagit-il avec le business cycle ?",
        "**Les fluctuations des taux d'intérêt et de la disponibilité du crédit : crédit facile et bon marché en expansion, rare et cher quand l'économie ralentit.**\nIl amplifie le business cycle : un crédit trop facile peut créer des bulles (ex. : subprime avant 2008).\nExpansions plus fortes et récessions plus profondes quand les deux coïncident ; les credit cycles durent en moyenne plus longtemps. Secteur le plus lié : la construction.",
      ],
      [
        "Comment évolue l'inventory-to-sales ratio au fil du business cycle ?",
        "**Il monte en fin d'expansion, avant le peak (les ventes ralentissent, les inventories s'accumulent), et baisse près du trough (les ventes repartent, les inventories fondent).**\nLes firmes réagissent : production ↓ après la hausse, ce qui nourrit la contraction ; production ↑ après la baisse.\nPiège : une hausse non voulue des inventories compte dans le GDP et peut faire croire à de la vigueur. C'est un lagging indicator.",
      ],
      [
        "Face à un retournement du business cycle, comment les firmes ajustent-elles d'abord leur travail et leur capital ?",
        "**D'abord l'intensité d'usage : heures et overtime pour le travail, utilisation plus ou moins intensive des machines pour le capital.**\nElles n'embauchent ou ne licencient que si la tendance semble durer (coûts, moral des équipes).\nEn contraction, elles réduisent leur capacité en reportant l'entretien et en ne remplaçant pas les équipements, rarement en les vendant ; en expansion durable, elles investissent.",
      ],
      [
        "Comment les dépenses des ménages (durable goods, services, nondurable goods, logement) réagissent-elles au business cycle ?",
        "**Durable goods : très cycliques ; services : un peu ; nondurable goods : stables. Le housing sector connaît de fortes variations.**\nLes achats de durables (voitures, meubles) sont reportés en contraction, parfois jusqu'au début de la reprise.\nHousing : piloté par les mortgage rates, le prix des logements rapporté au revenu, la spéculation et la démographie (part des 25–40 ans).",
      ],
      [
        "Leading, coincident, lagging indicators : que signale chacun ? Donne des exemples.",
        "**Leading : tourne avant le cycle ; coincident : avec lui ; lagging : après.**\nLeading : building permits, new orders, S&P 500, weekly hours (manufacturing), initial jobless claims, spread 10 ans − fed funds, consumer expectations.\nCoincident : nonfarm payrolls, real personal income, industrial production, manufacturing and trade sales.\nLagging : duration of unemployment, inventory-to-sales ratio, unit labor costs, prime rate, CPI des services.",
      ],
      [
        "Fiscal policy vs monetary policy : qui la mène, avec quels leviers, pour quels objectifs ?",
        "**Fiscal policy : le gouvernement, via government spending et taxes. Monetary policy : la central bank, via la quantité de monnaie et de crédit.**\nToutes deux visent price stability et croissance ; seule la fiscal policy sert aussi à redistribuer revenus et richesse.\n3 rôles de la fiscal policy : influencer l'aggregate demand, redistribuer, allouer les ressources entre secteurs.",
      ],
      [
        "Quels sont les fiscal policy tools, et lesquels agissent vite ou lentement ?",
        "**Spending tools : transfer payments, current spending, capital spending. Revenue tools : direct taxes (revenu, patrimoine, sociétés) et indirect taxes (VAT, sales taxes, excise taxes).**\nRapides : indirect taxes (politique sociale, recettes à faible coût). Lents : direct taxes, transfer payments, capital spending.\nLa dépense publique relance plus qu'une baisse d'impôt, en partie épargnée. Les transfer payments ne comptent pas dans le GDP.",
      ],
      [
        "Quelles sont les 4 qualités d'une bonne tax policy ?",
        "**Simplicity, efficiency, fairness, sufficiency.**\nSimplicity : facile à payer et à faire respecter. Efficiency : perturber le moins possible le marché, ne pas décourager le travail. Fairness : horizontal equality (même situation, même impôt) et vertical equality (les plus riches paient plus). Sufficiency : rapporter assez pour financer les dépenses publiques.",
      ],
      [
        "Comment se calcule le fiscal multiplier ? Applique-le à une MPC (marginal propensity to consume) de 0,8, un tax rate de 25 % et une hausse du government spending de 100.",
        "**Multiplier = 1 / (1 − 0,8 × 0,75) = 2,5 : l'aggregate demand monte de 250.**\n$$\\text{fiscal multiplier} = \\dfrac{1}{1 - \\text{MPC}\\,(1 - t)}$$\noù MPC = marginal propensity to consume, t = tax rate.\nMPC ↑ ⇒ multiplier ↑ ; t ↑ ⇒ multiplier ↓.\nPiège : ne pas mettre la MPS (marginal propensity to save = 1 − MPC) dans la formule.",
      ],
      [
        "Balanced budget : avec une MPC (marginal propensity to consume) de 0,8 et un tax rate de 25 %, l'État augmente government spending et taxes de 100 chacun. Effet sur l'aggregate demand ?",
        "**+50 : +250 grâce aux dépenses, −200 à cause des impôts. Le balanced budget multiplier est positif.**\nFiscal multiplier = 1 / [1 − 0,8 × (1 − 0,25)] = 2,5. Dépenses : 100 × 2,5 = +250.\nImpôts : seule la part qui aurait été consommée (0,8 × 100 = 80) disparaît, puis l'effet multiplicateur : 80 × 2,5 = 200.\nPiège : l'effet n'est pas nul. Il faudrait 100 / 0,8 = 125 d'impôts pour l'annuler.",
      ],
      [
        "Comment juger si une fiscal policy est expansionary ou contractionary ?",
        "**Par la variation du budget deficit corrigée du cycle : deficit ↑ (ou surplus ↓) = expansionary, en regardant le structural (cyclically adjusted) deficit, celui qu'on aurait au full employment.**\nEn récession, les automatic stabilizers (tax revenues ↓, unemployment benefits ↑) creusent seuls le deficit, sans décision : ce n'est pas une relance discretionary.\nExamen : hausse d'un impôt = contractionary ; hausse d'une dépense = expansionary.",
      ],
      [
        "Pourquoi la discretionary fiscal policy est-elle difficile à bien doser ?",
        "**À cause de 3 délais : recognition lag (voir le problème), action lag (voter la mesure), impact lag (la mesure produit son effet).**\nLa relance peut arriver quand l'économie repart déjà.\nAutres obstacles : statistiques mal lues (full employment mal mesuré), crowding-out, supply shortages (relance inutile, donc inflation), deficit déjà jugé trop gros, multiple targets (unemployment et inflation à la fois).",
      ],
      [
        "Faut-il s'inquiéter d'un fiscal deficit élevé ? Donne les arguments pour et contre.",
        "**Pour : impôts futurs plus lourds, refinancement refusé (default ou planche à billets ⇒ inflation), crowding-out. Contre : dette due aux résidents, deficit qui finance du capital spending, tax reform, Ricardian equivalence, sous-emploi.**\nCrowding-out : emprunts publics ⇒ taux ↑ ⇒ private investment ↓. Ricardian equivalence : les ménages épargnent l'impôt futur.\nDebt ratio (dette/GDP) ↑ si real interest rate > real growth.",
      ],
    ],
  },
  {
    title: "Economics — Flashcards 3/4 (Politique monétaire et géopolitique)",
    cards: [
      [
        "Quels sont les rôles d'une central bank ?",
        "**Seule émettrice de la monnaie, banker to the government and banks, régulateur du payments system, lender of last resort, gardienne des réserves (or, devises), responsable de la monetary policy.**\nLender of last resort : prêter aux banques à court de liquidité évite les bank runs.\nPiège : elle ne collecte pas les impôts et ne finance pas les agences publiques.",
      ],
      [
        "Pourquoi les central banks visent-elles une inflation d'environ 2 % plutôt que 0 % ?",
        "**Pour éviter la deflation : avec une cible à 0 %, les écarts autour de la cible feraient passer l'inflation sous zéro.**\nObjectif principal : price stability (cible courante 2 % ± 1 %, souvent à horizon de 2 ans). Autres objectifs possibles : emploi, croissance, change stable, long-term rates modérés.\nL'inflation coûte : menu costs, shoe leather costs.\nEx. : bande de ± 2 % ⇒ cible plutôt à 3 %.",
      ],
      [
        "Quels sont les 3 outils de la monetary policy, et dans quel sens les utiliser pour une politique expansionary ?",
        "**Policy rate, reserve requirements, open market operations. Expansionary : baisser le policy rate, baisser les reserve requirements, acheter des titres.**\nPolicy rate : discount rate (Fed), refinancing rate (BCE), two-week repo rate (Bank of England). La Fed vise le federal funds rate (prêts interbancaires overnight) via les open market operations.\nAchat de titres : excess reserves ↑, crédit ↑, short-term rates ↓.",
      ],
      [
        "Que provoque une hausse du policy rate, via le monetary transmission mechanism ?",
        "**Croissance ↓, inflation ↓, taux de marché ↑, devise ↑.**\n4 canaux : short-term bank lending rates (crédit ↓), prix des actifs (bonds et actions ↓, wealth effect), anticipations (dépenses ↓), exchange rate (devise ↑, exports ↓).\nUne baisse du policy rate a les effets inverses : devise ↓, exports ↑, inflation ↑.",
      ],
      [
        "Real trend rate of growth 3 %, inflation target 2 %, policy rate 6 % : la monetary policy est-elle expansionary ou contractionary ?",
        "**Contractionary : neutral rate = 3 % + 2 % = 5 %, et le policy rate (6 %) est au-dessus.**\n$$\\text{neutral rate} = \\text{real trend rate of growth} + \\text{inflation target}$$\nPolicy rate > neutral rate : contractionary ; < neutral rate : expansionary ; égal : neutre.\nPiège : comparer au neutral rate, pas à la seule inflation target.",
      ],
      [
        "Quelles sont les 3 qualités d'une central bank efficace ?",
        "**Independence, credibility, transparency.**\nOperational independence : elle fixe seule le policy rate. Target independence : elle définit aussi la mesure de l'inflation, la cible et l'horizon (la BCE a les deux).\nCredibility : elle tient ses cibles, qui deviennent alors auto-réalisatrices.\nTransparency : inflation reports, indicateurs suivis rendus publics.",
      ],
      [
        "Exchange rate targeting (ancrer sa devise sur une autre, souvent l'USD) : quelles conséquences pour la monetary policy du pays ?",
        "**Le pays importe l'inflation de la devise d'ancrage et doit accepter les taux compatibles avec le change visé, quelle que soit sa conjoncture.**\nDevise trop faible : la central bank rachète sa monnaie avec ses réserves (money supply ↓, taux ↑) ; trop forte : elle la vend.\nRésultat : money supply plus volatile, et risque d'épuiser ses réserves.",
      ],
      [
        "Pourquoi la monetary policy peut-elle ne pas produire l'effet voulu ?",
        "**Long-term rates qui bougent à l'inverse des short-term rates (anticipations d'inflation, bond market vigilantes), liquidity trap, banques qui ne prêtent pas, policy rate bloqué à zéro.**\nLiquidity trap : on garde le cash même si la money supply monte ; la deflation persiste.\nAu plancher zéro : QE (quantitative easing), achats massifs de titres pour faire baisser les long-term rates et gonfler les réserves.",
      ],
      [
        "Fiscal policy et monetary policy : quelle combinaison fait croître la part du secteur privé dans le GDP, et laquelle celle du secteur public ?",
        "**Privé ↑ : fiscal policy contractionary + monetary policy expansionary (taux ↓). Public ↑ : fiscal expansionary + monetary contractionary (taux ↑).**\nToutes deux expansionary : demande très forte, taux ↓, privé et public croissent.\nToutes deux contractionary : demande ↓, taux ↑, les deux secteurs reculent.",
      ],
      [
        "En geopolitics, qui sont les state actors et les nonstate actors, et quand un pays coopère-t-il ?",
        "**State actors : les gouvernements nationaux ; nonstate actors : entreprises, NGOs (organisations non gouvernementales), individus. Un pays coopère quand cela sert son national interest.**\nPriorité n° 1 : la survie ; la geophysical resource endowment oriente les priorités (ex. : échanger ses minerais contre de la nourriture).\nSoft power : influencer d'autres pays sans force ni menace (culture, institutions).",
      ],
      [
        "Quels sont les 4 archétypes de pays selon cooperation vs non-cooperation et globalization vs nationalism ?",
        "**Multilateralism : cooperation + globalization. Bilateralism : cooperation + nationalism. Hegemony : non-cooperation + globalization. Autarky : non-cooperation + nationalism.**\nAutarky : autosuffisance, État qui contrôle industrie et médias. Hegemony : ouvert, mais assez grand pour peser sans coopérer. Bilateralism : accords à deux plutôt qu'à plusieurs.\nRegionalism : multilatéral avec ses seuls voisins.",
      ],
      [
        "IMF (International Monetary Fund), World Bank, WTO (World Trade Organization) : quel est le rôle de chacun ?",
        "**IMF : coopération monétaire, stabilité des changes, aide aux pays en difficulté de balance of payments. World Bank : prêts et dons aux pays en développement pour réduire la pauvreté. WTO : règles du commerce mondial et règlement des différends.**\nPiège : la seule centrée sur la pauvreté est la World Bank ; celle qui tranche les litiges commerciaux est la WTO.",
      ],
      [
        "Event risk, exogenous risk, thematic risk : comment se distinguent ces 3 types de geopolitical risk ?",
        "**Event risk : date connue, issue inconnue (élection). Exogenous risk : imprévu (guerre, rébellion). Thematic risk : connu, aux effets durables (migrations, cyber risk, climat).**\nBlack swan risk : exogenous risk peu probable mais aux gros effets à court terme ; un investisseur de long terme n'a en général pas à y réagir.",
      ],
      [
        "Comment un investisseur analyse-t-il un geopolitical risk et son effet sur un portefeuille ?",
        "**Par sa likelihood (probabilité), son impact (ampleur sur les investissements) et sa velocity (vitesse à laquelle les prix le reflètent).**\nVelocity haute : chocs de court terme ; moyenne : coûts d'entreprises ou de secteurs ; basse : long terme, domaine ESG (environmental, social, governance).\nOutils : scenario analysis et signposts (signaux d'une probabilité qui monte). Impact plus fort en récession.",
      ],
      [
        "Quels sont les 3 types de tools of geopolitics ? Donne des exemples coopératifs et non coopératifs.",
        "**National security tools, economic tools, financial tools.**\nNational security : conflit armé, espionnage, alliances (tool active ou threatened).\nEconomic : coopératifs = FTA (free trade area), common market, unions ; non coopératifs = domestic content requirements, VER (voluntary export restraint), nationalization.\nFinancial : investissement étranger et libre change des devises (coopératifs s'ils sont permis) ; sanctions.",
      ],
    ],
  },
  {
    title: "Economics — Flashcards 4/4 (Commerce et change)",
    cards: [
      [
        "Quels sont les gains et les coûts de l'international trade ?",
        "**Gains : spécialisation selon le comparative advantage, economies of scale, variété, concurrence (moins de pricing power des monopoles), meilleure allocation. Coûts : emplois perdus dans les secteurs concurrencés par les imports, inégalités.**\nComparative advantage = opportunity cost relatif plus bas, pas « produire le plus ».\nLes gains dépassent les coûts : les gagnants pourraient compenser les perdants.",
      ],
      [
        "Tariff, import quota, VER (voluntary export restraint) : quels effets communs pour le pays importateur, et qui capte la rente ?",
        "**Prix domestique ↑, imports ↓, production domestique ↑, consumer surplus ↓, producer surplus ↑, deadweight loss.**\nTariff : recette pour l'État. Quota : pour l'État s'il vend les licences, sinon quota rents aux exportateurs étrangers. VER : rente aux étrangers, donc perte nationale plus grande qu'avec un tariff équivalent.\nGrand pays : tariff ou quota peut faire baisser le world price et améliorer son welfare.",
      ],
      [
        "Quels sont les effets d'une export subsidy pour un petit pays exportateur et pour un grand ?",
        "**Petit pays : le prix domestique monte jusqu'au world price + subvention. Grand pays : le world price baisse.**\nLes exportateurs gagnent ; les consommateurs domestiques perdent (consumer surplus ↓) et l'État paie la subvention.\nGrand pays : une partie du gain va aux consommateurs étrangers ; les producteurs étrangers y perdent.",
      ],
      [
        "Quels arguments en faveur des trade restrictions les économistes acceptent-ils, et lesquels rejettent-ils ?",
        "**Acceptés : infant industry (laisser grandir une industrie naissante) et national security (défense). Rejetés : protéger les emplois ou les industries domestiques, se protéger des pays à bas salaires.**\nAutres motifs avancés : représailles, recettes de tariffs, contrer les subventions étrangères ou le dumping (vente sous le coût).\nAutre outil : minimum domestic content (part minimale produite localement).",
      ],
      [
        "Classe les trading blocs (regional trading agreements) du moins au plus intégré.",
        "**Free trade area < customs union < common market < economic union < monetary union.**\nFTA : libre-échange entre membres ; customs union : + tarif extérieur commun ; common market : + libre circulation du travail et du capital ; economic union : + institutions et politique économique communes ; monetary union : + monnaie unique.\nEx. : NAFTA (FTA), EU (economic union), Eurozone (monetary union).",
      ],
      [
        "USD/EUR passe de 1,44 à 1,42. De combien l'EUR s'est-il déprécié face à l'USD, et de combien l'USD s'est-il apprécié face à l'EUR ?",
        "**EUR : 1,42 / 1,44 − 1 = −1,39 % ; USD : 1,44 / 1,42 − 1 = +1,41 %.**\nCotation price/base : 1,44 USD/EUR = 1 EUR (base currency) coûte 1,44 USD (price currency). Cours ↑ = base qui s'apprécie : variation = $S_1/S_0 - 1$.\nPour la price currency, inverser d'abord : variation = $S_0/S_1 - 1$.\nDirect quote = monnaie domestique par unité étrangère (USD/EUR pour un Américain).\nPiège : −1,39 % pour l'un ≠ +1,39 % pour l'autre.",
      ],
      [
        "Nominal exchange rate 1,60 USD/GBP ; CPI américain 110, CPI britannique 112 (base 100 dans les deux pays). Quel real exchange rate USD/GBP ?",
        "**Real USD/GBP = 1,60 × 112 / 110 = 1,629.**\n$$\\text{real}_{P/B} = S_{P/B} \\times \\dfrac{\\text{CPI}_B}{\\text{CPI}_P}$$\noù S = nominal exchange rate, P = price currency (ici USD), B = base currency (ici GBP).\nReal exchange rate ↑ = la price currency perd du pouvoir d'achat en biens du pays de la base.\nPiège : l'inflation du pays de la price currency fait baisser le real exchange rate.",
      ],
      [
        "Sell side vs buy side du FX (foreign exchange) market : qui sont les acteurs de chaque côté ?",
        "**Sell side : les grandes banques multinationales (dealers). Buy side : corporations, real money accounts, leveraged accounts, États et central banks, retail.**\nReal money : mutual funds, pension funds, insurance companies, sans derivatives. Leveraged : hedge funds et traders qui utilisent des derivatives.\nHedging = réduire un risque de change existant ; speculating = l'augmenter.",
      ],
      [
        "Classe les exchange rate regimes, du plus rigide au plus souple.",
        "**Sans monnaie propre : formal dollarization, monetary union. Avec monnaie propre : currency board, conventional fixed peg (± 1 %), target zone (± 2 %), crawling peg, crawling bands, managed floating, independent floating.**\nCurrency board : conversion garantie à taux fixe, monnaie émise contre réserves en devise (ex. : Hong Kong).\nCrawling bands : transition d'un peg vers le float. Plus le régime est rigide, moins la monetary policy est libre.",
      ],
      [
        "Selon l'identité $X - M = (S - I) + (T - G)$, comment un trade deficit est-il financé, et qui pilote le change à court terme ?",
        "**Un trade deficit (X < M) signifie que l'épargne domestique (privée S + publique T − G) ne couvre pas l'investissement I : la différence vient de capitaux étrangers (capital account surplus).**\nX = exports, M = imports, S = private saving, I = investment, T − G = government saving.\nLes capital flows s'ajustent vite : ils pilotent le change à court et moyen terme ; le commerce, à long terme.",
      ],
      [
        "Pourquoi un gouvernement impose-t-il des capital restrictions ?",
        "**Pour réduire la volatilité des prix d'actifs domestiques, tenir un fixed exchange rate, garder des taux d'intérêt domestiques bas (monetary policy indépendante) et protéger des strategic industries.**\nFormes : interdire l'investissement étranger, taxer les revenus de l'étranger, bloquer le rapatriement des profits.\nGlobalement, elles réduisent l'economic welfare ; utiles surtout à court terme contre des flux brusques.",
      ],
      [
        "MXN/USD = 10,70 et USD/AUD = 0,60. Quel cross rate MXN/AUD ?",
        "**MXN/AUD = 10,70 × 0,60 = 6,42.**\n$$\\dfrac{\\text{MXN}}{\\text{AUD}} = \\dfrac{\\text{MXN}}{\\text{USD}} \\times \\dfrac{\\text{USD}}{\\text{AUD}}$$\nOn écrit les cotations pour que la devise commune (USD) s'annule ; sinon on inverse d'abord l'une d'elles.\nMême devise de base : on divise. Ex. : CHF/NZD = (CHF/USD) / (NZD/USD) = 1,7799 / 2,2529 = 0,7900.",
      ],
      [
        "Spot 1,3500 USD/EUR, forward points à 6 mois : −75. Quel forward rate, et quelle devise est en forward premium ?",
        "**Forward = 1,3500 − 0,0075 = 1,3425 USD/EUR : l'EUR (base) est en forward discount, l'USD en forward premium.**\nUn point = la dernière décimale du spot (0,0001 pour un cours à 4 décimales). Forward coté en % : F = S × (1 + %).\nForward premium (+) ou discount (−) de la base currency = F / S − 1 (ici −0,56 %).",
      ],
      [
        "Spot 1,2500 USD/EUR ; taux sans risque à 1 an : 3 % sur l'USD, 4 % sur l'EUR. Quel forward rate à 1 an sans arbitrage (covered interest rate parity) ?",
        "**F = 1,2500 × 1,03 / 1,04 = 1,2380 USD/EUR.**\n$$F_{P/B} = S_{P/B} \\times \\dfrac{1 + i_P \\times \\frac{\\text{days}}{360}}{1 + i_B \\times \\frac{\\text{days}}{360}}$$\noù $i_P$ = taux de la price currency (USD), $i_B$ = taux de la base currency (EUR).\nL'EUR, au taux le plus haut, cote en forward discount (−0,96 %).\nPiège : taux de la price currency au numérateur ; taux annuel × days/360, sans composer.",
      ],
      [
        "Covered interest arbitrage : quelles sont les étapes, et quand dégage-t-il un profit ?",
        "**Emprunter la devise A, la convertir au spot en devise B, placer au taux de B, revendre à terme (forward) le montant final contre A, rembourser l'emprunt.**\nProfit sans risque si le montant reconverti dépasse le remboursement : le forward ne respecte pas la covered interest rate parity.\nPiège : le forward rate n'est pas une bonne prévision du futur spot rate ; c'est juste le prix sans arbitrage.",
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
