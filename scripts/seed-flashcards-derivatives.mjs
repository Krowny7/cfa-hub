// Seed script — flashcards "Système" Derivatives.
// 4 paquets de 15 cartes (60), à réviser en une nuit avec le one-pager
// Derivatives : instruments et marchés, usages et cost of carry, valeur des
// forwards/FRA/futures/swaps, options. Chaque carte se comprend seule (cartes
// mélangées). Phrases en français, termes techniques en anglais (curriculum
// CFA). Vérifié sur Schweser Book 3 (R66 à R75). Verso au format « trois
// cases » : À retenir (==surligné==) / En clair / Piège. Formules au format
// KaTeX, rendues par components/RichText.tsx.
// Usage: node scripts/seed-flashcards-derivatives.mjs
import { pathToFileURL } from "node:url";
import { getOwnerId, ensureFolder, seedFlashcardSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Derivatives (Système)";

// Anciens paquets (ancien format, dossier « Instruments Dérivés (Système) ») à supprimer.
const oldTitles = [
  "Derivative Features, Instruments & Uses (R68–R70)",
  "Arbitrage, Forward, Futures & Swap Pricing (R71–R74)",
  "Option Pricing, Parity & Binomial Model (R75–R77)",
];

export const SETS = [
  {
    title: "Derivatives — Flashcards 1/4 (Instruments & marchés)",
    cards: [
      [
        "Qu'est-ce qu'un derivative, et que peut être son underlying ?",
        "Derivative : ==valeur tirée d'un underlying== · Underlying : ==asset, rate, index, credit…==\nEn clair : Un derivative est un contrat. Underlyings possibles : stock, bond, index, currency, interest rate, commodity (or, café), crédit, voire weather ou longevity.",
      ],
      [
        "Forward commitment vs contingent claim : quelle différence, et dans quelle catégorie range-t-on un CDS (credit default swap) ?",
        "Forward commitment : ==obligation ferme d'échanger plus tard== · Contingent claim : ==paie seulement si un événement survient== · CDS : ==contingent claim==\nEn clair : Forwards, futures et la plupart des swaps obligent les deux parties. Une option donne un droit, et un CDS ne paie qu'après un credit event.\nPiège : malgré son nom de swap, le CDS est un contingent claim.",
      ],
      [
        "Hedging vs speculation avec un derivative : quelle différence ? Un boulanger qui devra acheter du blé doit-il acheter ou vendre des wheat futures ?",
        "Hedging : ==transférer un risque existant== · Speculation : ==prendre un risque nouveau== · Boulanger : ==acheter des futures==\nEn clair : Règle : « do in the futures market what you must do in the future ». Le fermier, qui vendra son blé, vend des wheat futures.",
      ],
      [
        "Deliverable contract vs cash-settled contract : que s'échange-t-il à la settlement date d'un forward ?",
        "Deliverable : ==l'underlying est livré== · Cash-settled : ==paiement du gain net==\nEn clair : Le long reçoit $S_T - F_0(T)$ (spot price final − forward price), ou le paie s'il est négatif. Ex. forward à 30 sur 100 actions, spot final 25 : le long verse 500.\nPiège : hors transaction costs, les deux modes de règlement se valent.",
      ],
      [
        "Exchange-traded derivatives vs OTC (over-the-counter) derivatives : quelles sont les différences clés ?",
        "Exchange-traded : ==contrat standardisé, garanti par une CCH== · OTC : ==contrat privé sur mesure, avec counterparty risk==\nEn clair : CCH = central clearinghouse. Exchange (futures) : plus liquide, moins cher, transparent, régulé. OTC (forwards, swaps) : négocié avec un dealer.",
      ],
      [
        "Quel est le rôle d'une CCH (central clearinghouse) sur un marché de derivatives, et que veut dire novation ?",
        "Rôle : ==garantir tous les paiements== · Novation : ==la CCH devient contrepartie==\nEn clair : Chaque trade devient deux trades face à la CCH. Elle exige une margin des deux parties, puis des dépôts quand une position perd.\nPiège : grâce à la CCH, le counterparty credit risk des exchange-traded derivatives est faible.",
      ],
      [
        "Qu'a changé le central clearing mandate d'après 2008 pour les swaps OTC (over-the-counter) ?",
        "Une ==CCP s'interpose== entre les deux côtés du swap\nEn clair : CCP = central counterparty. Le trade, déclaré sur une SEF (swap execution facility), devient deux trades face à la CCP : moins de counterparty risk.\nPiège : le counterparty risk ne disparaît pas : il se concentre sur la CCP.",
      ],
      [
        "Forward contract : quel est le payoff du long et du short à l'échéance, et combien vaut le contrat à l'initiation ?",
        "Value initiale ==0==, payoffs en T :\n$$\\text{long} : S_T - F_0(T) \\qquad \\text{short} : F_0(T) - S_T$$\nEn clair : $S_T$ = spot price à l'échéance, $F_0(T)$ = forward price fixé en 0. Personne ne paie au départ, et le gain du long est la perte du short.",
      ],
      [
        "Futures : comment fonctionne le mark-to-market quotidien, et à quel prix se fait-il ?",
        "Mark-to-market : ==gains/pertes passés en margin== · Prix utilisé : ==le settlement price==\nEn clair : Chaque soir, la margin absorbe les gains et pertes du jour. Le settlement price est la moyenne des prix des trades sur la dernière période de la séance.\nPiège : le settlement price n'est pas le prix du dernier trade.",
      ],
      [
        "Futures : que sont l'initial margin et la maintenance margin, et jusqu'à quel niveau recharger après un margin call ?",
        "Initial margin : ==dépôt exigé avant de trader== · Maintenance margin : ==solde minimum, sinon margin call== · Margin call : ==recharger jusqu'à l'initial margin==\nEn clair : La margin est un collateral déposé par les deux parties, pas un prêt : aucun intérêt à payer.\nPiège : en margin account d'actions, on recharge seulement jusqu'à la maintenance margin.",
      ],
      [
        "Formule du margin call d'un futures ? Application : long 100 onces d'or à 1 950, initial margin 5 000, maintenance margin 4 700, settlement price 1 947,50 au jour 1 puis 1 945 au jour 2.",
        "Si margin balance < maintenance margin :\n$$\\text{variation margin} = \\text{initial margin} - \\text{margin balance}$$\nEn clair : Perte de 2,50 × 100 = 250 par jour. Jour 1 : 4 750 ≥ 4 700, rien à verser. Jour 2 : 4 500 < 4 700, le long verse 5 000 − 4 500 = 500.\nPiège : pas 200 : on recharge jusqu'à l'initial margin, pas jusqu'à la maintenance.",
      ],
      [
        "Futures : que sont les price limits, et que fait un circuit breaker quand le futures price touche la limite ?",
        "Price limits : ==variation quotidienne bornée== · Circuit breaker : ==trading suspendu brièvement==\nEn clair : L'exchange borne l'écart du settlement price d'un jour à l'autre et interdit les trades hors des bornes. Le circuit breaker, lui, arrête le trading un court moment.",
      ],
      [
        "Formule du paiement net d'un interest rate swap ? Application : notional 10 millions, swap rate 2 %, SOFR (secured overnight financing rate) 90 jours fixé à 1,6 %, paiements trimestriels.",
        "Net payé par le fixed-rate payer :\n$$\\text{net} = NP \\times (\\text{swap rate} - MRR) \\times \\dfrac{\\text{days}}{360}$$\nEn clair : 10 M × (2 % − 1,6 %) × 90/360 = 10 000 versés par le fixed-rate payer. NP = notional principal (jamais échangé), MRR = market reference rate (ici le SOFR).\nPiège : le MRR est fixé en début de période et payé en fin : le 1er paiement est connu dès le départ.",
      ],
      [
        "Une entreprise a une dette à taux flottant. Quelle position d'interest rate swap prendre pour la transformer en dette à taux fixe ?",
        "Entrer dans le swap comme ==fixed-rate payer==\nEn clair : Elle paie le swap rate et reçoit le flottant, qui sert sa dette : il ne reste que le fixe. Coût final = swap rate + spread : dette à flottant + 1 %, swap rate 3 % → 4 %.",
      ],
      [
        "CDS (credit default swap) : que paie le protection buyer, et quand paie le protection seller ?",
        "Buyer : ==primes périodiques fixes== · Seller : ==paie si credit event==\nEn clair : Un credit event est un default, une bankruptcy ou une involuntary restructuring. Le seller touche le credit spread et porte le default risk, comme un long sur la bond.",
      ],
    ],
  },
  {
    title: "Derivatives — Flashcards 2/4 (Usages, risques & cost of carry)",
    cards: [
      [
        "Quels sont les 4 grands benefits des derivatives par rapport au cash market ?",
        "Risk allocation : ==transférer ou ajuster un risque== · Information discovery : ==prix révélateurs des attentes du marché== · Operational advantages : ==coûts bas, short facile, leverage, liquidity== · Market efficiency : ==mispricings corrigés à moindre coût==\nEn clair : Par exemple, un put pose un plancher (risk allocation), et le prix d'une option révèle l'implied volatility.",
      ],
      [
        "Information discovery : quel input du prix d'une option n'est pas observable, et que révèle donc le prix d'une option ?",
        "Non observable : ==la volatility future== · Option price : ==révèle l'implied volatility==\nEn clair : Exercise price, risk-free rate, spot price et échéance s'observent. Les interest rate futures révèlent, eux, les taux attendus.",
      ],
      [
        "Quels sont les 5 grands risques des derivatives ?",
        "Implicit leverage : ==petite mise, grosse exposition== · Basis risk : ==underlying du hedge ≠ position couverte== · Liquidity risk : ==margin calls avant tout gain== · Counterparty credit risk : ==default de la contrepartie== · Systemic risk : ==contagion à tout le système==\nEn clair : Une spéculation excessive nourrit le systemic risk.\nPiège : la liquidity est aussi un benefit.",
      ],
      [
        "Formule de l'implicit leverage d'un futures ? Application : margin égale à 4 % de la valeur du contrat, futures price en baisse de 1 %.",
        "$$\\text{leverage} = \\dfrac{\\text{contract value}}{\\text{margin}}$$\nEn clair : Levier = 1 / 4 % = 25:1, donc une baisse de 1 % du futures price fait perdre 1 % × 25 = 25 % de la margin. Margins usuelles (CME Group) : 3 % à 12 %.",
      ],
      [
        "Qu'est-ce que le basis risk d'une couverture par derivative ?",
        "Basis risk = ==couverture imparfaite== (underlying ou échéance ≠ position couverte)\nEn clair : Exemples : 50 large caps couvertes par un forward sur le S&P 500, ou une récolte du 15 septembre couverte par des corn futures qui expirent le 1er octobre.",
      ],
      [
        "Counterparty credit risk : qui le porte entre l'acheteur d'une option, le writer d'une option, et les deux parties d'un forward ?",
        "Acheteur d'option : ==exposé== · Writer : ==pas exposé== · Forward : ==les deux parties==\nEn clair : Le writer a déjà encaissé la premium et n'attend plus rien, l'acheteur attend le payoff. En futures, margins, mark-to-market et clearinghouse réduisent ce risque.",
      ],
      [
        "Hedge accounting : quelle différence entre cash flow hedge, fair value hedge et net investment hedge ?",
        "Cash flow : ==couvre la variabilité de flux futurs== · Fair value : ==couvre la valeur d'actifs ou passifs== · Net investment : ==couvre l'equity d'une filiale étrangère==\nEn clair : Exemples : recettes en devises vendues forward (cash flow), inventory couvert (fair value).\nPiège : dette swappée flottant → fixe : cash flow hedge ; fixe → flottant : fair value hedge.",
      ],
      [
        "Comment un investisseur (et non un issuer) utilise-t-il les derivatives ? Donne 4 exemples.",
        "Silver forwards : ==exposition sans cash== · Receive-fixed swap : ==duration ↑== · Index futures : ==ajuster le beta== · Index puts : ==plancher, upside gardé==\nEn clair : Un investisseur s'en sert pour hedger, modifier ou accroître son exposition au risque.\nPiège : couvrir son inventory ou sa filiale étrangère, c'est l'issuer.",
      ],
      [
        "Pourquoi price-t-on les derivatives par no-arbitrage, en actualisant au risk-free rate ?",
        "Derivative couvert par sa replication = ==sans risque== → risk-free rate\nEn clair : Law of one price : deux actifs au même payoff ont le même prix. Un portefeuille sans risque doit donc rapporter le risk-free rate.\nPiège : ce n'est pas parce que les investisseurs seraient risk-neutral.",
      ],
      [
        "Replication : avec quelles positions cash recrée-t-on un long forward et un short forward sur une action ?",
        "Long forward : ==emprunter, acheter l'action== · Short forward : ==shorter l'action, prêter==\nEn clair : Emprunts et placements se font au risk-free rate $R_f$. Payoff du long en T : $S_T - S_0(1 + R_f)^T$, où $S_0$ = spot price aujourd'hui et $S_T$ = spot price en T.",
      ],
      [
        "Formule du no-arbitrage forward price d'une action sans dividende ? Application : spot price 30, risk-free rate 5 %, forward à 1 an.",
        "$$F_0(T) = S_0 \\times (1 + R_f)^T$$\nEn clair : 30 × 1,05 = 31,50 : le coût d'acheter le spot et de le porter jusqu'en T. $S_0$ = spot price, $R_f$ = risk-free rate annuel, T en années.\nPiège : le forward price n'est pas une prévision du spot price futur.",
      ],
      [
        "Formule du gain d'arbitrage sur un forward trop cher ? Application : action sans dividende à 30, risk-free rate 5 %, forward à 1 an coté 32.",
        "Vendre le forward, emprunter, acheter l'action :\n$$\\text{gain} = F_{\\text{market}} - S_0 (1 + R_f)^T$$\nEn clair : 32 − 30 × 1,05 = 0,50 en T : on livre l'action à 32 et on rembourse 31,50. $F_{\\text{market}}$ = forward coté, $S_0$ = spot price, $R_f$ = risk-free rate.\nPiège : forward trop bon marché : l'inverse (acheter le forward, shorter l'action, placer le cash).",
      ],
      [
        "Comment les costs et les benefits de détention de l'underlying modifient-ils le no-arbitrage forward price ?",
        "Costs ajoutés, benefits retranchés :\n$$F_0(T) = [S_0 + PV_0(\\text{costs}) - PV_0(\\text{benefits})] \\times (1 + R_f)^T$$\nEn clair : Costs = storage, insurance. Benefits = dividendes, coupons, convenience yield. PV = present value. Ex. spot price 30, dividende 1 dans 1 an, $R_f$ 5 % : 30 × 1,05 − 1 = 30,50.\nPiège : un benefit non monétaire (convenience yield) baisse aussi le forward price.",
      ],
      [
        "Formule du forward price en taux continus ? Application : indice 1 550, dividend yield 1,3 %, risk-free rate 3 % (continus), échéance 6 mois.",
        "$$F_0(T) = S_0 \\, e^{(r + c - b)T}$$\nEn clair : $1\\,550 \\times e^{(0{,}03 - 0{,}013) \\times 0{,}5} \\approx 1\\,563{,}23$. $S_0$ = spot price, r = risk-free rate, c = storage costs (ici 0), b = benefits (dividend yield), en taux continus, T en années.",
      ],
      [
        "Formule du currency forward rate sans arbitrage ? Application : spot USD/EUR 1,10, risk-free rate USD 2 %, risk-free rate EUR 3 %, échéance 1 an.",
        "$$F_{p/b} = S_{p/b} \\times \\dfrac{(1 + i_{\\text{price}})^T}{(1 + i_{\\text{base}})^T}$$\nEn clair : 1,10 × 1,02 / 1,03 ≈ 1,0893 USD par EUR. En USD/EUR, USD = price currency, EUR = base currency, et i = risk-free rate de chaque currency.\nPiège : le taux de la price currency va au numérateur. L'EUR, au taux plus haut, cote en forward discount.",
      ],
    ],
  },
  {
    title: "Derivatives — Flashcards 3/4 (Valeur des forwards, FRA, futures & swaps)",
    cards: [
      [
        "Forward contract : quelle différence entre forward price et forward value, et lequel des deux varie pendant la vie du contrat ?",
        "Forward price : ==prix d'échange futur, fixé à l'initiation== · Forward value : ==valeur du contrat, 0 puis variable==\nEn clair : Le forward price $F_0(T)$ est choisi pour que la value soit nulle en 0. Si le spot price monte ensuite, la value du long devient positive.\nPiège : QCM « equal to zero at initiation » : c'est la value, pas le price.",
      ],
      [
        "Formule de la value du long d'un forward en cours de vie, sans costs ni benefits ? Application : forward à 1 an conclu à 31,50, risk-free rate 5 %, spot price 33 six mois plus tard.",
        "$$V_t = S_t - \\dfrac{F_0(T)}{(1 + R_f)^{T-t}}$$\nEn clair : 33 − 31,50 / 1,05^0,5 = 33 − 30,74 ≈ 2,26 pour le long (−2,26 pour le short). $S_t$ = spot price en t, $F_0(T)$ = forward price, $R_f$ = risk-free rate.\nPiège : actualiser sur la durée restante T − t (0,5 an), pas sur T.",
      ],
      [
        "Formule de la value du long d'un forward en cours de vie quand l'underlying a des costs et des benefits (storage, dividendes) ?",
        "Seuls les flux ==restants== comptent :\n$$V_t = S_t + PV_t(\\text{costs}) - PV_t(\\text{benefits}) - \\dfrac{F_0(T)}{(1 + R_f)^{T-t}}$$\nEn clair : $PV_t$ = present value en t des costs et benefits encore à venir. $S_t$ = spot price en t, $F_0(T)$ = forward price, $R_f$ = risk-free rate.\nPiège : un dividende déjà versé avant t ne compte plus.",
      ],
      [
        "Formule de l'implied forward rate à partir de spot rates ? Application : spot rates zero-coupon $Z_2$ = 2 % et $Z_3$ = 3 %, taux 2y1y (1 an, dans 2 ans).",
        "Prêter long = prêter court, puis forward :\n$$(1 + Z_{A+B})^{A+B} = (1 + Z_A)^A \\times (1 + F_{A,B})^B$$\nEn clair : $F_{2,1}$ = 1,03³ / 1,02² − 1 ≈ 5,03 %. $Z_n$ = spot rate zero-coupon à n ans, $F_{A,B}$ = taux AyBy (prêt de B ans qui démarre dans A ans).",
      ],
      [
        "Qu'est-ce qu'un FRA (forward rate agreement), et quand le long gagne-t-il ?",
        "FRA : ==taux d'emprunt futur figé== · Long : ==gagne si MRR monte==\nEn clair : Le long paie le taux du FRA et reçoit le MRR (market reference rate) : c'est le fixed-rate payer. Un FRA est un swap à une seule période.\nPiège : le long d'un forward sur bond, lui, perd quand les taux montent.",
      ],
      [
        "Formule du payoff d'un FRA (forward rate agreement) pour le long ? Application : FRA 3m6m à 1,30 % sur 1 million, MRR (market reference rate) 6 mois réalisé dans 3 mois : 1,50 %.",
        "$$\\text{Payoff} = \\dfrac{NP \\times (MRR - FRA) \\times t}{1 + MRR \\times t}$$\nEn clair : 1 000 000 × (1,50 % − 1,30 %) × 6/12 = 1 000, actualisé : 1 000 / 1,0075 ≈ 992,56 reçus. NP = notional principal, FRA = taux du contrat, t = 6/12.\nPiège : réglé en début de période, donc actualisé au MRR réalisé.",
      ],
      [
        "Futures : que deviennent le futures price et la value du contrat après le mark-to-market quotidien ?",
        "Futures price : ==le settlement price== · Value : ==ramenée à 0==\nEn clair : Les gains et pertes du jour sont déjà passés en margin. Un forward sans mark-to-market garde son prix, et sa value varie jusqu'à l'échéance.",
      ],
      [
        "Pourquoi un futures price peut-il différer du forward price équivalent ? Lequel préfère le long si taux d'intérêt et futures price sont positivement corrélés ?",
        "Cause : ==mark-to-market quotidien== · Corrélation positive : ==futures préféré== · Corrélation négative : ==forward préféré==\nEn clair : Corrélation positive : les gains de margin se replacent à taux hauts, les pertes se financent à taux bas, donc futures price > forward price. Corrélation nulle : prix égaux.",
      ],
      [
        "Interest rate futures : comment est coté le prix, et le long gagne-t-il si le MRR (market reference rate) monte ou baisse ?",
        "Long gagne si le ==MRR baisse== :\n$$\\text{futures price} = 100 - 100 \\times MRR$$\nEn clair : Prix 97 ⇒ MRR de 3 %. Long interest rate futures ≈ short FRA (forward rate agreement), mais coté en prix et marked to market chaque jour.\nPiège : le long FRA, lui, gagne si le MRR monte.",
      ],
      [
        "Formule de la BPV (basis point value) d'un interest rate futures ? Application : futures sur un taux 6 mois, notional 1 million.",
        "$$BPV = \\text{notional principal} \\times \\text{period} \\times 0{,}0001$$\nEn clair : 1 000 000 × 0,5 × 0,0001 = 50 par bp (basis point). Period = durée du taux en années. Le futures est linéaire : ±1 bp change sa value de 50 pile.",
      ],
      [
        "Convexity bias : pourquoi un FRA (forward rate agreement) et un interest rate futures équivalent n'ont-ils pas le même payoff pour ±1 bp (basis point) ?",
        "FRA : ==payoff actualisé, donc convexe== · Interest rate futures : ==payoff linéaire, non actualisé==\nEn clair : Payoff du long FRA = $NP \\times (MRR - FRA) \\times t / (1 + MRR \\times t)$ (MRR = market reference rate). Ex. 6m6m à 2,50 %, 1 million, t = 0,5 : à 2,51 %, le long reçoit 50 / 1,01255 = 49,38, à 2,49 %, il paie 50 / 1,01245 = 49,39. Futures : 50 pile.",
      ],
      [
        "En quoi un interest rate swap ressemble-t-il à une série de FRAs (forward rate agreements), et en quoi diffère-t-il ?",
        "Point commun : ==série de FRAs== · Différence : ==un seul taux fixe==\nEn clair : Tous les FRAs du swap ont le même taux fixe, le swap rate. Chacun est donc off-market (value > 0 ou < 0), et seule leur somme vaut 0 à l'initiation.\nPiège : QCM : values « that sum to zero », pas « each equal to zero ».",
      ],
      [
        "Interest rate swap : quelle différence entre son price et sa value, et quand le fixed-rate payer gagne-t-il ?",
        "Price : ==le swap rate fixe, figé au départ== · Value : ==valeur du swap, 0 puis variable== · Taux ↑ : ==fixed-rate payer gagne==\nEn clair : Value du fixed-rate payer = PV (present value) des flottants attendus − PV des fixes. Elle monte si les taux attendus montent, et sert aux paiements de mark-to-market.",
      ],
      [
        "Formule du par swap rate d'un interest rate swap ? Application : swap annuel à 3 ans, spot rates à 1, 2 et 3 ans de 1 %, 2 % et 3 %.",
        "$$\\text{par swap rate} = \\dfrac{1 - DF_N}{\\sum_{i=1}^{N} DF_i}$$\nEn clair : (1 − 0,9151) / (0,9901 + 0,9612 + 0,9151) ≈ 2,96 %, avec $DF_i = 1/(1 + S_i)^i$ le discount factor du spot rate $S_i$. PV des fixes = PV des flottants attendus.",
      ],
      [
        "Interest rate swap : avec quelles positions en obligations réplique-t-on le fixed-rate payer et le fixed-rate receiver ?",
        "==Émettre fixe, acheter FRN== = payer · ==Acheter fixe, émettre FRN== = receiver\nEn clair : Fixe = fixed-rate bond, FRN = floating-rate note. Le fixed-rate payer emprunte fixe et prête flottant : sa duration baisse. Le receiver allonge la sienne.",
      ],
    ],
  },
  {
    title: "Derivatives — Flashcards 4/4 (Options : payoffs, valeur & binomial)",
    cards: [
      [
        "Call option vs put option : quel droit a l'acheteur, et quelle obligation a le writer ?",
        "Call : ==droit d'acheter== · Put : ==droit de vendre== · Call writer : ==vend si exercé== · Put writer : ==achète si exercé==\nEn clair : L'acheteur paie une premium au writer. X (exercise price) = prix fixé d'achat ou de vente. Une European option s'exerce seulement à l'échéance, une American option à tout moment.",
      ],
      [
        "Formules du payoff, du profit et du breakeven d'un long call ? Application : exercise price 50, premium 5, action à 58 à l'échéance.",
        "$$c_T = \\max(0, S_T - X)$$\n$$\\text{profit} = c_T - c_0$$\n$$\\text{breakeven} = X + c_0$$\nEn clair : Payoff max(0, 58 − 50) = 8, profit 8 − 5 = 3, breakeven 50 + 5 = 55. $S_T$ = prix de l'action à l'échéance, X = exercise price, $c_0$ = premium.\nPiège : profit = payoff − premium : ne pas confondre les deux.",
      ],
      [
        "Formule du profit d'un short put ? Application : exercise price 64, premium reçue 3,80, action à 84 ou à 60 à l'échéance.",
        "$$\\text{profit} = p_0 - \\max(0, X - S_T)$$\nEn clair : À 84 : 3,80 − 0 = +3,80. À 60 : 3,80 − (64 − 60) = −0,20. Breakeven = X − $p_0$ = 60,20, où $p_0$ = premium reçue, X = exercise price, $S_T$ = prix de l'action à l'échéance.",
      ],
      [
        "Long call, short call, long put, short put : quelle perte maximale et quel gain maximal pour chacun ?",
        "Long call : ==$-c_0$ à $+\\infty$== · Short call : ==$-\\infty$ à $+c_0$== · Long put : ==$-p_0$ à $X - p_0$== · Short put : ==$-(X - p_0)$ à $+p_0$==\nEn clair : Chaque position va de sa perte max à son gain max (profit à l'échéance), où $c_0$, $p_0$ = premiums et X = exercise price. Le long put gagne au plus $X - p_0$, si l'action tombe à 0.",
      ],
      [
        "Formule de la moneyness d'un call et d'un put : in the money (ITM), at the money (ATM), out of the money (OTM) ? Application : exercise price 40, action à 37.",
        "ITM si > 0, OTM si < 0 :\n$$\\text{call} : S - X \\qquad \\text{put} : X - S$$\nEn clair : Call : 37 − 40 = −3, OTM de 3. Put : 40 − 37 = 3, ITM de 3. S = prix de l'underlying, X = exercise price, ATM si S = X.",
      ],
      [
        "Formules de l'exercise value d'un put et de la time value d'une option ? Application : put d'exercise price 55 coté 10, action à 47,50.",
        "$$\\text{exercise value (put)} = \\max(0, X - S)$$\n$$\\text{time value} = \\text{premium} - \\text{exercise value}$$\nEn clair : Exercise value = max(0, 55 − 47,50) = 7,50, time value = 10 − 7,50 = 2,50. X = exercise price, S = prix de l'underlying. Une option OTM (out of the money) ne vaut que sa time value.",
      ],
      [
        "Quelles sont les bornes basse et haute du prix d'un call européen et d'un put européen ?",
        "Bornes européennes, avec X actualisé :\n$$\\max(0, S - PV(X)) \\le c \\le S$$\n$$\\max(0, PV(X) - S) \\le p \\le PV(X)$$\nEn clair : $PV(X) = X / (1 + R_f)^{T-t}$, où X = exercise price, S = spot price, $R_f$ = risk-free rate, T − t = durée restante.\nPiège : borne haute du put européen = PV(X), pas X : X n'est reçu qu'à l'échéance.",
      ],
      [
        "Options : quel est l'effet d'une hausse du prix de l'underlying (S), de l'exercise price (X), de la volatility et du time to expiration sur un call et sur un put ?",
        "S : ==call ↑, put ↓== · X : ==call ↓, put ↑== · Volatility : ==les deux ↑== · Échéance : ==les deux ↑==\nEn clair : Le call paie S − X, le put X − S, d'où des effets opposés. Plus de volatility ou de temps : plus de time value.\nPiège : un put européen très in the money peut perdre de la valeur si l'échéance s'allonge.",
      ],
      [
        "Options : quel est l'effet d'une hausse du risk-free rate, des benefits (dividendes, coupons) et des storage costs sur un call et sur un put ?",
        "$R_f$ : ==call ↑, put ↓== · Storage : ==call ↑, put ↓== · Benefits : ==call ↓, put ↑==\nEn clair : Un $R_f$ (risk-free rate) plus haut baisse la PV (present value) de X : bon pour le call, qui paiera X, mauvais pour le put, qui le recevra. Les benefits font baisser l'underlying.",
      ],
      [
        "Formule de la put–call parity ? Application : action à 52, put européen (exercise price X = 50, 3 mois) à 1,50, risk-free rate 5 %. Prix du call européen de même X et même échéance ?",
        "Fiduciary call = protective put :\n$$c_0 + \\dfrac{X}{(1 + R_f)^T} = S_0 + p_0$$\nEn clair : $c_0$ = 52 + 1,50 − 50 / 1,05^0,25 = 53,50 − 49,39 ≈ 4,11. Fiduciary call : call + zero-coupon qui paie X. Protective put : action ($S_0$) + put ($p_0$). $R_f$ = risk-free rate.\nPiège : options européennes seulement, même X et même échéance.",
      ],
      [
        "Put–call parity : comment construire un synthetic call, un synthetic put et une synthetic stock ?",
        "Signe + : long, signe − : short\n$$c = S + p - B$$\n$$p = c - S + B$$\n$$S = c - p + B$$\nEn clair : B = zero-coupon sans risque qui paie X (exercise price) à l'échéance. Ex. synthetic call = long stock + long put + short bond. Option trop chère : la vendre, acheter la synthétique.",
      ],
      [
        "Formule de la put–call–forward parity pour des options européennes ?",
        "$$\\dfrac{F_0(T)}{(1 + R_f)^T} + p_0 = c_0 + \\dfrac{X}{(1 + R_f)^T}$$\nEn clair : L'action est remplacée par une synthétique : long forward + zero-coupon qui paie $F_0(T)$ (forward price). $c_0$, $p_0$ = prix du call et du put, X = exercise price, $R_f$ = risk-free rate.\nPiège : si X = $F_0(T)$, les deux present values sont égales, donc $c_0 = p_0$.",
      ],
      [
        "Options et corporate finance : à quelle option correspond l'equity d'une firme endettée, et à quoi correspond sa dette ?",
        "Equity : ==call sur V== · Dette : ==risk-free bond − put==\nEn clair : V = valeur de la firme, D = dette zero-coupon, strike des deux options. Payoffs à l'échéance : equity max(0, V − D), dette min(V, D).\nPiège : les créanciers sont short le put sur V : ils perdent si V < D.",
      ],
      [
        "Formule du hedge ratio h du binomial model à une période ? Application : action à 50 qui ira à 60 ou à 42, call d'exercise price 55.",
        "$$h = \\dfrac{c^+ - c^-}{S^+ - S^-}$$\nEn clair : (5 − 0) / (60 − 42) ≈ 0,278 action par call vendu (+ = état haut, − = état bas). Short 1 call + h actions : $hS^+ - c^+ = hS^- - c^- \\approx 11{,}67$, sans risque, donc actualisé au risk-free rate.\nPiège : pour un put, le portefeuille sans risque est long put + long h actions.",
      ],
      [
        "Formule de la valeur d'un call dans un binomial model à une période (risk-neutral probability) ? Application : action à 50 qui ira à 60 ou à 42, exercise price 55, risk-free rate 3 % par période.",
        "$$\\pi_u = \\dfrac{1 + R_f - D}{U - D}$$\n$$c_0 = \\dfrac{\\pi_u c^+ + (1 - \\pi_u) c^-}{1 + R_f}$$\nEn clair : Up-move U = 60/50 = 1,20, down-move D = 42/50 = 0,84, $R_f$ = risk-free rate par période : $\\pi_u$ = 0,19 / 0,36 ≈ 0,528, puis $c_0$ = 0,528 × 5 / 1,03 ≈ 2,56 ($c^+$ = 5, $c^-$ = 0).\nPiège : $\\pi_u$ n'est pas la vraie probabilité : les vraies probabilités n'entrent pas.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "flashcards");
  console.log("Flashcards — Système Derivatives (4 paquets × 15)...");
  const total = await seedFlashcardSets({ ownerId, folderId, sets: SETS, oldTitles });
  console.log(`\n✅ Terminé. ${total} cartes ajoutées.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  });
}
