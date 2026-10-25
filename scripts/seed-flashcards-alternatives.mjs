// Seed script — flashcards "Système" Alternative Investments.
// 4 paquets de 15 cartes (60), à réviser en une nuit avec le one-pager
// Alternatives : structures et frais, performance et private capital, actifs
// réels (immobilier, infrastructure, ressources naturelles), hedge funds et
// digital assets. Chaque carte se comprend seule (cartes mélangées) : phrases
// en français, termes techniques en anglais. Verso au format « trois cases » :
// l'idée à retenir (≤ 12 mots, ==surligné==, liste « a · b » ou formule), puis
// « En clair : », puis « Piège : » s'il y a un vrai piège d'examen. Cartes de
// calcul : formule générale en « À retenir », application chiffrée en « En
// clair ». Formules KaTeX ($$...$$ seul sur sa ligne = bloc), rendues par
// components/RichText.tsx.
// Vérifié sur Schweser Book 4 (R76–82) ; calculs recalculés à la main.
// Usage: node scripts/seed-flashcards-alternatives.mjs
import { pathToFileURL } from "node:url";
import { getOwnerId, ensureFolder, seedFlashcardSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Alternative Investments (Système)";

// Anciens titres à supprimer s'ils ont changé (les 4 titres actuels sont gardés).
const oldTitles = [];

export const SETS = [
  {
    title: "Alternative Investments — Flashcards 1/4 (Structures et frais)",
    cards: [
      [
        "Quelles sont les 3 grandes catégories d'alternative investments ?",
        "Private capital : ==private equity et private debt== · Real assets : ==real estate, infrastructure, natural resources== · Hedge funds : ==fonds privés avec leverage, short, dérivés==\nEn clair : Les digital assets entrent aussi dans les real assets. Traditional investments = long-only en cash, actions et bonds cotés.\nPiège : un hedge fund ne couvre pas forcément son risque.",
      ],
      [
        "Par rapport aux traditional investments, quelles sont les features typiques des alternative investments ?",
        "Liquidité : ==faible== · Savoir requis : ==spécialisé== · Tickets : ==gros== · Horizon : ==long== · Correlation : ==faible==\nEn clair : Les alternative investments diversifient un portefeuille et peuvent rapporter un illiquidity premium. L'information asymmetry avec le gérant explique les incentive fees.\nPiège : la correlation remonte en période de stress.",
      ],
      [
        "Fund investing, co-investing, direct investing : comment se comparent-ils en contrôle et en fees ?",
        "Fund investing : ==parts d'un fonds, gérant choisit tout== · Co-investing : ==fonds + certains deals en direct== · Direct : ==achète les actifs lui-même, sans gérant==\nEn clair : Du fund au direct, les fees baissent, le contrôle et la due diligence à faire augmentent. Le direct diversifie peu.\nPiège : pas d'expertise de due diligence ⇒ fund investing.",
      ],
      [
        "Dans une limited partnership, quels sont le rôle et la responsabilité du GP (general partner) et des LPs (limited partners) ?",
        "GP : ==gère, responsabilité illimitée== · LPs : ==passifs, perte ≤ apport==\nEn clair : Le GP gère le fonds et répond de ses dettes. Les LPs, en général des accredited investors, apportent le capital sans droit de regard sur la gestion.",
      ],
      [
        "Dans un private equity fund, que sont le committed capital, les capital calls et le dry powder ?",
        "Committed capital : ==montant promis par les LPs== · Capital call : ==appel d'une part du capital promis== · Dry powder : ==capital promis pas encore appelé==\nEn clair : Le GP (general partner) appelle le capital au fil des deals (drawdown), en général sur 3 à 5 ans. LPs = limited partners.",
      ],
      [
        "LPA (limited partnership agreement) vs side letter : que contient chacun ?",
        "LPA : ==contrat du fonds, règles communes aux LPs== · Side letter : ==termes propres à un seul LP==\nEn clair : Une side letter complète le LPA. Elle peut prévoir un excusal right (refuser un capital call) ou une MFN (most-favored-nation) clause (obtenir les termes spéciaux des autres LPs, limited partners).",
      ],
      [
        "Sur quelle base calcule-t-on le management fee d'un hedge fund, et celui d'un private equity fund ?",
        "Hedge fund : ==AUM== · Private equity : ==committed capital==\nEn clair : AUM = assets under management. Le fee, souvent 1 à 2 %, est dû même sans performance. Sur le committed capital, le GP (general partner) n'est pas poussé à investir vite.\nPiège : en private equity, pas sur l'invested capital (le capital déjà investi).",
      ],
      [
        "Formule de l'incentive fee avec un hurdle rate soft ou hard ? Application : rendement 12 %, hurdle rate 8 %, incentive fee 20 %.",
        "Incentive fee, si r ≥ h :\n$$\\text{soft} = p \\times r \\qquad \\text{hard} = p \\times (r - h)$$\nEn clair : Soft : 20 % × 12 % = 2,4 %. Hard : 20 % × (12 % − 8 %) = 0,8 %. Ici p = taux d'incentive fee, r = rendement, h = hurdle rate.\nPiège : sous le hurdle rate, aucun incentive fee, même soft.",
      ],
      [
        "Formule du partage entre GP (general partner) et LPs (limited partners) avec un catch-up à 100 % ? Application : rendement brut 14 %, hurdle rate 8 %, carried interest 20 %.",
        "Catch-up complet si $r \\ge h/(1-p)$ :\n$$\\text{GP} = p \\times r \\qquad \\text{LPs} = (1 - p) \\times r$$\nEn clair : 14 % ≥ 8 % / 0,8 = 10 %, donc GP = 20 % × 14 % = 2,8 % et LPs = 11,2 % (8 % aux LPs, 2 % de catch-up au GP, puis 4 % en 80/20). Ici p = carried interest, r = rendement brut, h = hurdle rate.\nPiège : si h < r < h/(1 − p), le GP touche seulement r − h (ex. 9 % − 8 % = 1 %).",
      ],
      [
        "Formule de l'incentive fee avec high-water mark (HWM) ? Application : HWM 100, valeur en début d'année 95, en fin d'année 108 après management fee, incentive fee 20 %, sans hurdle.",
        "Incentive fee avec HWM :\n$$\\text{incentive fee} = p \\times \\max(0\\,;\\,V_1 - \\text{HWM})$$\nEn clair : 20 % × (108 − 100) = 1,6, et nouveau HWM = 108 − 1,6 = 106,4. Ici HWM = plus haute valeur nette passée, p = incentive fee, V1 = valeur de fin nette de management fee.\nPiège : pas 20 % × (108 − 95) = 2,6 : la remontée de 95 à 100 ne paie rien.",
      ],
      [
        "Formule du rendement net d'un hedge fund « 2 and 20 » ? Application : 100 investis, rendement brut 25 %, management fee sur la valeur de fin, incentive fee indépendant du management fee.",
        "Fees, puis rendement net :\n$$\\text{fees} = m\\,V_1 + p\\,\\max(0\\,;\\,V_1 - V_0)$$\n$$r_{\\text{net}} = \\dfrac{V_1 - V_0 - \\text{fees}}{V_0}$$\nEn clair : Fees = 2 % × 125 + 20 % × 25 = 7,5, d'où r net = (25 − 7,5) / 100 = 17,5 %. Ici m = management fee, p = incentive fee, V0, V1 = valeurs de début et de fin.\nPiège : lire l'énoncé : base début ou fin, incentive net ou indépendant du management fee.",
      ],
      [
        "Formule du rendement net d'un fund of funds ? Application : « 1 and 10 », 100 investis, fonds sous-jacents à 120 en fin d'année (nets), management fee sur la valeur de fin, incentive fee indépendant.",
        "Rendement net d'un fund of funds :\n$$r_{\\text{net}} = \\dfrac{V_1 - m\\,V_1 - p\\,\\max(0\\,;\\,V_1 - V_0) - V_0}{V_0}$$\nEn clair : Le fund of funds ajoute sa couche de fees : (120 − 1,2 − 2 − 100) / 100 = 16,8 %. Ici m = management fee, p = incentive fee, V0, V1 = valeurs de début et de fin.\nPiège : le 120 est déjà net des frais des fonds : ne pas les retirer deux fois.",
      ],
      [
        "Formule des either-or fees d'un hedge fund ? Application : 1 % de management fee ou 30 % d'incentive fee, avec un gain de 2 %, puis de 10 %.",
        "Either-or fee, en % de l'AUM :\n$$\\text{fee} = \\max(m\\,;\\,p \\times r)$$\nEn clair : Gain 2 % : max(1 % ; 30 % × 2 % = 0,6 %) = 1 %. Gain 10 % : max(1 % ; 3 %) = 3 %. Ici m = management fee, p = incentive fee, r = gain, AUM = assets under management.\nPiège : on paie le plus élevé des deux, pas la somme.",
      ],
      [
        "Waterfall deal-by-deal (American) vs whole-of-fund (European) : lequel favorise le GP (general partner), lequel les LPs (limited partners) ?",
        "American : ==carry à chaque sortie== → favorise le GP · European : ==carry après capital + hurdle== → favorise les LPs\nEn clair : Le carry (carried interest) est l'incentive fee du GP. En American, le GP le touche avant que les LPs aient récupéré 100 % du capital + le hurdle.\nPiège : avec un clawback, l'American revient au résultat de l'European.",
      ],
      [
        "Formules du carried interest en American vs European waterfall, et du clawback ? Application : carried interest 20 %, sans hurdle, deal A acheté 100 revendu 130, deal B acheté 100 revendu 80.",
        "$$\\text{American} = p \\sum_i \\max(0\\,;\\,G_i) \\qquad \\text{European} = p \\max\\Big(0\\,;\\,\\sum_i G_i\\Big)$$\n$$\\text{clawback} = \\text{American} - \\text{European}$$\nEn clair : American : 20 % × 30 = 6, rien sur B. European : 20 % × (30 − 20) = 2. Clawback : 6 − 2 = 4 rendus aux LPs (limited partners). Ici Gi = gain ou perte (négative) du deal i, p = carried interest.",
      ],
    ],
  },
  {
    title: "Alternative Investments — Flashcards 2/4 (Performance et private capital)",
    cards: [
      [
        "Par rapport aux traditional investments, quels risques en plus faut-il intégrer pour apprécier la performance d'un alternative investment ?",
        "==Timing== des cash flows · ==Leverage== utilisé par le gérant · ==Valuation== sans prix de marché · ==Fees, taxes== et accounting complexes\nEn clair : Le leverage expose aux margin calls, donc aux ventes forcées à mauvais prix. Sans prix de marché observable, la valuation repose sur des hypothèses.",
      ],
      [
        "J-curve d'un private equity fund : quel est le signe des rendements dans chaque phase de sa vie ?",
        "Commitment : ==choix des deals, capital calls== → négatif · Deployment : ==fonds investis, gérés de près== → encore négatif · Distribution : ==revenus et sorties, cash distribué== → positif\nEn clair : Le rendement cumulé dessine un J : il plonge d'abord (capital calls, fees, aucun revenu), puis remonte avec les sorties jusqu'à un plateau.",
      ],
      [
        "IRR (internal rate of return) vs MOIC (multiple of invested capital) : comment mesurent-ils la performance d'un private equity fund ?",
        "IRR : ==money-weighted return annualisé== → timing compris · MOIC : ==(realized + unrealized value) / paid-in capital== → timing ignoré\nEn clair : L'IRR convient car le GP (general partner) décide du timing des flux. Ex. : 40 reçus + 110 de NAV (net asset value), pour 100 versés, MOIC = 1,5×.\nPiège : l'IRR suppose un cost of capital et un reinvestment rate.",
      ],
      [
        "Formule du leveraged return d'un fonds ? Application : 100 investis sans leverage, plus 50 empruntés à 6 %, rendement des actifs 10 %.",
        "Leveraged return :\n$$r_L = \\dfrac{r\\,(V_0 + V_B) - r_B\\,V_B}{V_0}$$\nEn clair : (10 % × 150 − 6 % × 50) / 100 = 12 %. Ici V0 = capital investi, VB = montant emprunté, rB = taux d'emprunt, r = rendement des actifs.\nPiège : on divise par V0, pas par V0 + VB ; le leverage amplifie aussi les pertes.",
      ],
      [
        "Quels sont les 3 niveaux de la fair value hierarchy, et sur quoi repose la valuation à chaque niveau ?",
        "Level 1 : ==prix cotés== · Level 2 : ==inputs observables== · Level 3 : ==inputs non observables==\nEn clair : Level 1 : actions cotées sur un marché actif. Level 2 : dérivés valorisés par un modèle. Level 3 : private equity, real estate, faute de transactions.",
      ],
      [
        "Pourquoi les actifs Level 3 de la fair value hierarchy flattent-ils les rendements affichés des alternative investments ?",
        "Valeurs ==lissées== : volatility et correlations sous-estimées\nEn clair : Rarement réévaluées, les valeurs restent proches du coût. Le rendement paraît plus haut, moins risqué et moins corrélé aux marchés qu'il ne l'est.\nPiège : le private equity bat les actions en moyenne, mais sa vraie volatility est plus forte qu'affichée.",
      ],
      [
        "Survivorship bias, backfill bias, selection bias : comment faussent-ils les indices de hedge funds et de private equity ?",
        "Survivorship : ==fonds disparus absents de l'indice== · Backfill : ==bons historiques ajoutés à l'entrée== · Selection : ==fonds classés ou admis de façon incohérente==\nEn clair : Les trois biais surestiment la performance des indices, fondés sur des données volontaires. Plus de 25 % des hedge funds disparaissent dans leurs 3 premières années.",
      ],
      [
        "LBO (leveraged buyout) : de quoi s'agit-il, et quelle différence entre MBO (management buyout) et MBI (management buy-in) ?",
        "LBO : ==rachat d'une firme surtout par dette== · MBO : ==LBO mené par le management en place== · MBI : ==le fonds remplace le management en place==\nEn clair : La cible sort souvent de la cote et ses cash flows remboursent la dette. Les LBO funds sont la majorité des private equity funds.",
      ],
      [
        "Quelles sont les étapes de financement d'une start-up en venture capital (VC), de l'idée à l'IPO (initial public offering) ?",
        "Angel : ==particuliers financent l'idée== · Seed : ==entrée des VC funds, développe le produit== · Early : ==finance l'activité avant production et ventes== · Later : ==finance l'expansion== · Mezzanine : ==prépare l'entrée en bourse==\nEn clair : Angel, seed et early forment le formative stage.\nPiège : mezzanine stage = timing avant l'IPO, pas mezzanine financing.",
      ],
      [
        "Pourquoi un venture capital (VC) fund prend-il parfois des convertibles (convertible debt, convertible preferred stock) dans une start-up ?",
        "Intérêts : ==alignés avec la start-up== · Liquidation : ==VC servi en priorité==\nEn clair : Le VC reçoit en général du common equity, et parfois des convertibles. Avec elles, VC et fondateurs veulent tous deux faire monter la valeur.",
      ],
      [
        "Qu'est-ce qu'un PIPE (private investment in public equity) en private equity ?",
        "==Participation minoritaire== dans une société cotée, par offre privée\nEn clair : C'est du minority equity investing. La société lève du capital plus vite et moins cher qu'en offre publique, avec moins de disclosures.\nPiège : ni prise de contrôle ni retrait de la cote, à la différence d'un LBO (leveraged buyout).",
      ],
      [
        "Quelles sont les 5 exit strategies d'un private equity fund ?",
        "Trade sale : ==vente à un strategic buyer== · Public listing : ==entrée en bourse== · Recapitalization : ==dividende financé par dette, contrôle gardé== · Secondary sale : ==vente à un autre fonds== · Write-off : ==échec passé en perte==\nEn clair : Le public listing passe par IPO (initial public offering), direct listing (sans levée de capital) ou SPAC (special purpose acquisition company).",
      ],
      [
        "Quels sont les 5 grands types de private debt, et comment reconnaître chacun ?",
        "Direct lending : ==prêt sans intermédiaire, senior secured== · Venture debt : ==prêt à start-up non rentable== · Mezzanine : ==subordonnée + warrants== · Distressed : ==dette de firmes en difficulté== · Unitranche : ==secured + unsecured en un prêt==\nEn clair : Le taux, SOFR (Secured Overnight Financing Rate) + spread, dépasse celui des bonds. Dans un leveraged loan, le fonds emprunte pour prêter.",
      ],
      [
        "Classe ces private capital investments du plus risqué au moins risqué : senior direct lending, private equity, infrastructure debt, mezzanine debt, unitranche debt, senior real estate debt.",
        "==Private equity== > mezzanine > unitranche > senior direct lending > senior real estate > infrastructure debt\nEn clair : Le rendement attendu suit le même ordre que le risque. La senior debt a un yield stable, la mezzanine plus d'upside (warrants, conversion rights).",
      ],
      [
        "Qu'est-ce que la vintage year d'un private equity fund, et quel type de fonds réussit selon le cycle économique ?",
        "Vintage year : ==1re année d'investissement== · Expansion : ==fonds early stage gagnants== · Contraction : ==fonds distressed gagnants==\nEn clair : Diversifier entre vintage years lisse le risque de cycle. Avec une correlation de 0,63 à 0,83 aux marchés cotés, le private capital diversifie en partie.\nPiège : vintage year = premier investissement, pas premier capital commitment.",
      ],
    ],
  },
  {
    title: "Alternative Investments — Flashcards 3/4 (Immobilier, infrastructure et ressources)",
    cards: [
      [
        "Real estate : comment classe-t-on les investissements selon les deux axes private/public et equity/debt ?",
        "Privé, equity : ==détention directe== · Privé, debt : ==mortgages== · Public, equity : ==REITs== · Public, debt : ==MBS==\nEn clair : REIT = real estate investment trust, MBS = mortgage-backed securities. Le debt investor est payé en premier, l'equity vaut la propriété moins la dette.",
      ],
      [
        "Real estate en direct plutôt que via des REITs (real estate investment trusts) : quel est l'avantage clé, et quels sont les inconvénients ?",
        "Avantage : ==le contrôle== · Inconvénients : ==illiquidité, concentration==\nEn clair : Le direct apporte aussi des tax benefits (depreciation, intérêts déductibles). Il exige en revanche un gros ticket, de l'expertise et une gestion lourde, avec des prix opaques.\nPiège : au sein de l'immobilier, le direct diversifie moins qu'un REIT (peu de biens).",
      ],
      [
        "Quelles sont les features des REITs (real estate investment trusts) pour un investisseur ?",
        "Fiscalité : ==pas de double imposition== · Cotés : ==liquides, sans redemption risk== · Gestion : ==professionnelle==\nEn clair : Un equity REIT détient des biens, un mortgage REIT des prêts ou des MBS (mortgage-backed securities), un hybrid REIT les deux.\nPiège : plus corrélés aux actions que le direct, et encore plus en krach.",
      ],
      [
        "Classe les stratégies real estate du moins au plus risqué : value-add, core, opportunistic, senior debt, core-plus.",
        "==Senior debt== < core < core-plus < value-add < opportunistic\nEn clair : Senior debt et core sont bond-like (revenus stables, biens de qualité). Core-plus, value-add et opportunistic (re)développent de plus en plus : profil equity-like, en closed-end funds.",
      ],
      [
        "Infrastructure : quelle différence entre economic infrastructure et social infrastructure, avec des exemples ?",
        "Economic : ==sert l'activité économique== → transport, utilities, télécoms · Social : ==services aux personnes== → écoles, hôpitaux, prisons\nEn clair : L'infrastructure regroupe des actifs à très longue durée de vie, souvent financés par l'État ou, de plus en plus, via une PPP (public-private partnership). L'actif peut revenir au secteur public.",
      ],
      [
        "D'où viennent les cash flows d'un investissement en infrastructure ?",
        "Availability payments : ==versés pour que l'actif reste disponible== · Usage-based : ==selon l'usage réel (péages)== · Take-or-pay : ==volume minimum payé, pris ou non==\nEn clair : L'availability payment ne dépend pas de la fréquentation. Le take-or-pay garantit un minimum, quelle que soit la demande.",
      ],
      [
        "Greenfield, brownfield et secondary-stage : comment distinguer ces investissements en infrastructure ?",
        "Greenfield : ==actif encore à construire== · Brownfield : ==actif existant, privatisé ou étendu== · Secondary-stage : ==actif pleinement opérationnel, sans développement==\nEn clair : Le greenfield suit un cycle BOT (build-operate-transfer). Un sale-leaseback (actif acheté à l'État, puis loué à l'État) est un brownfield.",
      ],
      [
        "Infrastructure : quels investissements sont les moins et les plus risqués, et quels risques propres faut-il surveiller ?",
        "Moins risqué : ==secondary-stage brownfield== · Plus risqué : ==greenfield, demande incertaine== · Risques : ==regulatory, leverage, construction, operational==\nEn clair : Le brownfield verse des cash flows stables mais croît peu. Construire expose au construction risk, et un exploitant privé à l'operational risk.",
      ],
      [
        "Comment investir en infrastructure, sachant que la détention directe est très illiquide ?",
        "Indirect et liquide : ==ETFs, mutual funds, MLPs==\nEn clair : ETF = exchange-traded fund, MLP = master limited partnership (cotée). Les investisseurs naturels sont les pension plans, life insurance companies et sovereign wealth funds.\nPiège : un first mortgage sur une autoroute à péage reste un investissement direct.",
      ],
      [
        "Farmland, timberland, raw land : qui les détient, et qu'est-ce qui distingue la timberland ?",
        "Farmland : ==terres agricoles, détenues par des particuliers== · Raw land : ==terrain nu, détenu par des institutions== · Timberland : ==forêts des institutions, coupe différable==\nEn clair : Les trois se louent, sont illiquides et valent surtout par leur lieu. Sans expertise : une TIMO (timberland investment management organization).",
      ],
      [
        "Farmland et timberland : d'où vient le rendement, et comment se comparent rendement et volatility aux actions ?",
        "Sources : ==terre et production== · Rendement : ==> actions== · Volatility : ==< actions, ≈ bonds==\nEn clair : Timberland : prix du bois et volume récolté. Farmland : prix agricoles, qualité et quantité des récoltes. Risques : météo, catastrophes naturelles, cash flows variables.",
      ],
      [
        "Quels véhicules donnent une exposition aux commodities (metals, agriculture, energy) ?",
        "Surtout des ==futures==, aussi ETPs, managed futures, SMAs\nEn clair : ETP (exchange-traded product) = ETF ou ETN (exchange-traded fund ou note). Managed futures : CTA (commodity trading advisor). SMA (separately managed account) : gros investisseurs.\nPiège : un fonds limité au pétrole ou aux métaux précieux = specialized fund.",
      ],
      [
        "Formule du futures price d'une commodity à partir du spot price ? Application : spot 100, risk-free rate 4 %, storage 3, convenience yield 2.",
        "Futures price d'une commodity :\n$$F \\approx S\\,(1 + r_f) + \\text{storage} - \\text{CY}$$\nEn clair : 100 × 1,04 + 3 − 2 = 105. Ici F = futures price, S = spot price, rf = risk-free rate, CY = convenience yield (avantage non monétaire du physique).\nPiège : le convenience yield fait baisser le futures price, pas monter.",
      ],
      [
        "Contango vs backwardation : que signifient ces termes sur un commodity futures market ?",
        "Contango : ==futures price > spot== · Backwardation : ==futures price < spot==\nEn clair : En contango (convenience yield faible), le roll yield d'un investisseur long-only est négatif. En backwardation (convenience yield élevé), il est positif.\nPiège : net cost of carry négatif (convenience yield > coûts de portage) ⇒ backwardation.",
      ],
      [
        "Commodities dans un portefeuille : rendement, volatility, correlation et lien avec l'inflation ?",
        "Rendement, volatility : ==> actions, bonds== · Correlation : ==faible== · Inflation : ==hedge==\nEn clair : L'offre est inélastique à court terme (délais de production) : un choc de demande, de météo ou géopolitique fait bondir les prix. En inflation forte, les commodities battent actions et bonds.\nPiège : aucun current income : une commodity ne verse pas de cash flows.",
      ],
    ],
  },
  {
    title: "Alternative Investments — Flashcards 4/4 (Hedge funds et digital assets)",
    cards: [
      [
        "Quelles features distinguent un hedge fund d'un mutual fund et d'un private equity fund ?",
        "Vs mutual fund : ==peu régulé== · Vs private equity : ==actifs liquides==\nEn clair : Le hedge fund, privé et réservé aux accredited investors, utilise leverage, short et dérivés, avec des fees élevés. Face au private equity, il a un horizon plus court et des rachats périodiques.\nPiège : un hedge fund est plus corrélé aux actions qu'aux bonds.",
      ],
      [
        "Quelles sont les 4 familles de stratégies de hedge funds, avec un exemple pour chacune ?",
        "Equity hedge : ==long/short sur actions== · Event-driven : ==joue un événement corporate== → merger arbitrage · Relative value : ==écarts entre titres liés== → convertible arbitrage · Opportunistic : ==macro events et commodity trading== → managed futures\nEn clair : Le merger arbitrage achète la cible et vend short l'acquéreur.\nPiège : convertible arbitrage = relative value, pas event-driven.",
      ],
      [
        "Equity hedge strategies d'un hedge fund : que font market neutral, short bias et fundamental long/short ?",
        "Market neutral : ==long/short égaux, sans exposition marché== · Short bias : ==surtout short sur titres surévalués== · Fundamental long/short : ==long sous-évalués, short indice, net long==\nEn clair : Le market neutral achète les sous-évalués et vend short les surévalués : seul l'écart compte. Le short bias est contrarian. Le fundamental growth est aussi net long.",
      ],
      [
        "Lockup period, notice period, gate, redemption fee : que signifient ces termes de liquidité d'un hedge fund ?",
        "Lockup : ==rachat interdit au début== · Notice : ==délai d'exécution du rachat== · Gate : ==rachats limités temporairement== · Redemption fee : ==frais de sortie, versés au fonds==\nEn clair : Un soft lockup permet de sortir avec pénalité. La notice period (30 à 90 jours) laisse vendre sans hâte. Les founders class (premiers entrés) ont souvent de meilleurs termes.",
      ],
      [
        "Master-feeder structure vs SMA (separately managed account) : comment se structure chacun de ces hedge fund vehicles ?",
        "Master-feeder : ==feeders onshore/offshore investissent via un master fund== · SMA : ==compte sur mesure d'un seul investisseur==\nEn clair : Seul le master fund investit : structure efficace fiscalement. La SMA a des fees plus bas mais ne reçoit que les trades les plus liquides.\nPiège : la SMA aligne moins le gérant : il n'y a pas d'argent à lui.",
      ],
      [
        "Fund of funds plutôt qu'un hedge fund en direct : quel avantage, et quel inconvénient ?",
        "Avantage : ==expertise de sélection== · Inconvénient : ==seconde couche de fees==\nEn clair : Le fund of funds diversifie entre stratégies et ouvre l'accès aux petits investisseurs, avec des lockups plus courts. Ses fees (historiquement « 1 and 10 ») s'ajoutent.\nPiège : ni fees plus bas, ni rendement plus haut garanti.",
      ],
      [
        "D'où vient le rendement d'un hedge fund, et qu'amplifie son leverage ?",
        "Market beta : ==rendement dû au marché large== · Strategy beta : ==rendement dû aux secteurs ciblés== · Alpha : ==rendement dû à la sélection du gérant== · Leverage : ==amplifie strategy beta et alpha==\nEn clair : Le market beta s'obtient aussi avec un index fund passif. Les fees élevés pèsent sur la performance.\nPiège : le leverage ne vise pas le market beta.",
      ],
      [
        "Qu'est-ce que la DLT (distributed ledger technology), et qu'est-ce qu'une blockchain ?",
        "DLT : ==registre partagé par consensus== · Blockchain : ==blocs chaînés par hash==\nEn clair : Le registre est immuable. Smart contract : programme qui s'exécute seul. Tokenization : propriété d'un actif physique suivie sur le registre.\nPiège : la puissance de calcul requise est un inconvénient, pas un avantage.",
      ],
      [
        "Proof of work (PoW) vs proof of stake (PoS) : comment chaque consensus protocol valide-t-il les blocs d'une blockchain ?",
        "PoW : ==miners résolvent un problème cryptographique== · PoS : ==validators engagent du collateral (staking)==\nEn clair : Le PoW dépense énormément d'énergie, et tricher demande 51 % du réseau. En PoS, les validators touchent un rendement sur leur collateral.",
      ],
      [
        "Permissionless vs permissioned network en DLT (distributed ledger technology) : quelle différence ?",
        "Permissionless : ==ouvert à tous== · Permissioned : ==droits limités, moins cher==\nEn clair : En permissionless (ex. Bitcoin), tous voient et valident, sans autorité centrale : inutile de se faire confiance. En permissioned, l'accès est par niveaux, ex. lecture seule pour un regulator.",
      ],
      [
        "Cryptocurrency, altcoin, stablecoin, meme coin, CBDC (central bank digital currency) : quelle différence ?",
        "Cryptocurrency : ==monnaie digitale décentralisée== · Altcoin : ==crypto autre que le Bitcoin== · Stablecoin : ==valeur liée à un actif== · Meme coin : ==crypto lancée pour s'amuser== · CBDC : ==monnaie digitale d'une banque centrale==\nEn clair : Ether est un altcoin à smart contracts, Tether une stablecoin au dollar.\nPiège : une stablecoin n'offre ni conversion en fiat ni backing légal.",
      ],
      [
        "Quels sont les principaux types de tokens en digital assets, et que représente chacun ?",
        "NFT : ==objet digital unique== · Security : ==titres cotés digitalisés== · Utility : ==paie les services du réseau== · Governance : ==vote sur le réseau== · Asset-backed : ==propriété d'un actif non digital==\nEn clair : NFT = nonfungible token. ICO (initial coin offering) : security token non régulé, souvent sans vote. DeFi (decentralized finance) : marché de dApps (decentralized applications).",
      ],
      [
        "Qu'est-ce qui détermine la valeur d'un digital asset comme le Bitcoin, et quel est son profil rendement/risque ?",
        "Valeur : ==appréciation attendue== · Rendement, volatility : ==élevés== · Correlation : ==faible==\nEn clair : Sans cash flows ni fundamental value, le prix vient de la rareté (21 millions de bitcoins au plus), de l'adoption, de la régulation.\nPiège : la correlation avec les marchés peut monter en période de stress.",
      ],
      [
        "Centralized vs decentralized exchanges pour les cryptocurrencies : lesquels dominent, et lesquels résistent mieux aux attaques ?",
        "Centralized : ==plateformes privées, serveurs privés== → les plus utilisés · Decentralized : ==sans autorité, sur réseau distribué== → plus résistants\nEn clair : Un serveur privé piraté peut stopper le trading et laisser fuir les clés de wallet. Les decentralized sont durs à réguler. Les deux sont peu régulés.",
      ],
      [
        "Comment s'exposer aux cryptocurrencies sans les détenir en direct dans un wallet ?",
        "==Coin trusts==, futures, ETPs, actions liées, hedge funds\nEn clair : Un coin trust émet des parts d'un trust qui détient la crypto : ni wallet ni clés, frais parfois élevés. ETP = exchange-traded product. Le direct expose à la fraude et à la perte des clés.\nPiège : le coin trust détient la crypto elle-même, les futures sont cash-settled.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "flashcards");
  console.log("Flashcards — Système Alternative Investments (4 paquets × 15)...");
  const total = await seedFlashcardSets({ ownerId, folderId, sets: SETS, oldTitles });
  console.log(`\n✅ Terminé. ${total} cartes ajoutées.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  });
}
