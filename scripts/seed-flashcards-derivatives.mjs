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
        "Qu'est-ce qu'un derivative, et qu'appelle-t-on son underlying ?",
        "Derivative = contrat dont la valeur ==dérive d'un underlying==\nEn clair : l'underlying est l'actif ou la variable de référence : stock, bond, index, currency, interest rate, commodity (hard : or ; soft : café), crédit, voire weather ou longevity.",
      ],
      [
        "Forward commitment vs contingent claim : quelle différence, et dans quelle catégorie range-t-on un CDS (credit default swap) ?",
        "Forward commitment = ferme ; contingent claim = conditionnel, comme le ==CDS==\nEn clair : forwards, futures et la plupart des swaps obligent les deux parties. Options et CDS ne paient que si un événement survient.\nPiège : malgré son nom de swap, le CDS est un contingent claim : le seller ne paie qu'en cas de credit event.",
      ],
      [
        "Hedging vs speculation avec un derivative : quelle différence ? Un boulanger qui devra acheter du blé doit-il acheter ou vendre des wheat futures ?",
        "Hedge = transférer un risque déjà porté ; le boulanger ==achète== des futures\nEn clair : speculation = prendre un risque qu'on n'avait pas. « Do in the futures market what you must do in the future » : le fermier, qui vendra son blé, vend des futures.",
      ],
      [
        "Deliverable contract vs cash-settled contract : que s'échange-t-il à la settlement date d'un forward ?",
        "Deliverable : underlying livré ; cash-settled : ==seul le gain net== payé\nEn clair : forward à 30 sur 100 actions, spot price final 25 : en cash-settled, le long verse 5 × 100 = 500 au short. Hors transaction costs, les deux modes se valent.",
      ],
      [
        "Exchange-traded derivatives vs OTC (over-the-counter) derivatives : quelles sont les différences clés ?",
        "Exchange : ==standardisé, garanti par la CCH== ; OTC : sur mesure\nEn clair : CCH = central clearinghouse. Exchange (futures) : plus liquide, moins cher, transparent, régulé. OTC (forwards, swaps) : contrat avec un dealer, counterparty credit risk.",
      ],
      [
        "Quel est le rôle d'une CCH (central clearinghouse) sur un marché de derivatives, et que veut dire novation ?",
        "La CCH ==devient la contrepartie de chaque côté== (novation)\nEn clair : elle garantit tous les paiements promis. Pour cela, elle exige une margin des deux parties au départ, puis des dépôts quand une position perd de la valeur.\nPiège : la CCH garantit les paiements ; elle ne stabilise pas le prix de l'underlying.",
      ],
      [
        "Qu'a changé le central clearing mandate d'après 2008 pour les swaps OTC (over-the-counter) ?",
        "Une ==CCP s'interpose== entre les deux côtés du swap\nEn clair : CCP = central counterparty. Le trade, déclaré sur une SEF (swap execution facility), devient deux trades face à la CCP : moins de counterparty risk, plus de disclosure.\nPiège : revers : le risque se concentre sur la CCP. Les contrats restent sur mesure.",
      ],
      [
        "Forward contract : quel est le payoff du long et du short à l'échéance, et combien vaut le contrat à l'initiation ?",
        "Value à l'initiation : ==0==\n$$\\text{long} : S_T - F_0(T) \\qquad \\text{short} : F_0(T) - S_T$$\nEn clair : où $S_T$ = spot price à l'échéance, $F_0(T)$ = forward price fixé en 0. Personne ne paie au départ ; le gain du long est la perte du short.",
      ],
      [
        "Futures : comment fonctionne le mark-to-market quotidien, et à quel prix se fait-il ?",
        "Gains et pertes passés chaque soir en margin, au ==settlement price==\nEn clair : settlement price = moyenne des prix des trades sur la dernière période de la séance. Un forward OTC (over-the-counter) se règle en général seulement à l'échéance.\nPiège : le settlement price n'est pas le prix du dernier trade.",
      ],
      [
        "Futures : que sont l'initial margin et la maintenance margin, et jusqu'à quel niveau recharger après un margin call ?",
        "Sous la maintenance margin, on recharge ==jusqu'à l'initial margin==\nEn clair : initial margin = dépôt exigé avant de trader ; maintenance margin = solde minimum. C'est un collateral des deux parties, pas un prêt : pas d'intérêts.\nPiège : compte d'actions sur marge : on recharge seulement jusqu'à la maintenance.",
      ],
      [
        "Futures sur 100 onces d'or acheté à 1 950 : initial margin 5 000, maintenance margin 4 700. Settlement price 1 947,50 au jour 1, puis 1 945 au jour 2. Quel dépôt pour le long ?",
        "Jour 1 : rien ; jour 2 : ==500== (retour à l'initial margin)\nEn clair : −2,50 × 100 = −250 par jour. Jour 1 : 4 750 ≥ 4 700. Jour 2 : 4 500 < 4 700, margin call de 5 000 − 4 500 = 500. Le short, lui, passe à 5 500.\nPiège : pas 200 : on recharge jusqu'à l'initial margin, pas jusqu'à la maintenance.",
      ],
      [
        "Futures : que sont les price limits, et que fait un circuit breaker quand le futures price touche la limite ?",
        "Price limits : ==variation quotidienne bornée== ; circuit breaker : cotation suspendue\nEn clair : l'exchange borne l'écart du settlement price d'un jour à l'autre, et interdit les trades hors des bornes. À la limite, le circuit breaker suspend la cotation un court moment.",
      ],
      [
        "Interest rate swap : notional 10 millions, fixe 2 %, SOFR (secured overnight financing rate) 90 jours, paiements trimestriels. SOFR fixé à 1,6 % : quel paiement net ?",
        "Le fixed-rate payer verse ==10 000== net\nEn clair : fixe 10 M × 2 % / 4 = 50 000 ; flottant 10 M × 1,6 % / 4 = 40 000. Paiements nettés, notional jamais échangé ; SOFR fixé en début de période, payé en fin.",
      ],
      [
        "Une entreprise a une dette à taux flottant. Quelle position d'interest rate swap prendre pour la transformer en dette à taux fixe ?",
        "Entrer dans le swap comme ==fixed-rate payer==\nEn clair : elle paie le swap rate et reçoit le flottant, qui sert sa dette : il ne reste que le fixe. Fixed-rate payer ≈ emprunter à taux fixe et acheter une FRN (floating-rate note).",
      ],
      [
        "CDS (credit default swap) : que paie le protection buyer, et quand paie le protection seller ?",
        "Buyer : ==primes fixes== ; seller : paie seulement si credit event\nEn clair : credit event = default, bankruptcy ou involuntary restructuring de la reference security. Le seller touche le credit spread et porte le default risk, comme un long sur la bond.",
      ],
    ],
  },
  {
    title: "Derivatives — Flashcards 2/4 (Usages, risques & cost of carry)",
    cards: [
      [
        "Quels sont les 4 grands benefits des derivatives par rapport au cash market ?",
        "Risk allocation · ==information discovery== · operational advantages · market efficiency\nEn clair : un put crée un plancher, un call l'upside sans downside. Short facile, transaction costs bas, leverage, liquidity : exploiter un mispricing coûte moins, les prix s'ajustent mieux.",
      ],
      [
        "Information discovery : quelles informations les prix des derivatives révèlent-ils ? Quel input du prix d'une option n'est pas observable ?",
        "Options : ==implied volatility== ; futures et forwards : prix et taux attendus\nEn clair : seul input non observable du prix d'une option : la volatility future de l'underlying. Exercise price, risk-free rate, prix de l'underlying et échéance s'observent.",
      ],
      [
        "Quels sont les 5 grands risques des derivatives ?",
        "Implicit leverage · basis risk · ==liquidity risk== · counterparty credit risk · systemic risk\nEn clair : liquidity risk : la couverture appelle des margin calls avant que la position couverte ne rapporte. Systemic risk : spéculation excessive et contagion.\nPiège : la liquidity est à la fois un avantage et un risque.",
      ],
      [
        "Implicit leverage d'un futures : avec une margin égale à 4 % de la valeur du contrat, quel est l'effet d'une baisse de 1 % du futures price sur la margin ?",
        "Margin : ==−25 %== (1 % / 4 %, levier 25:1)\nEn clair : 1 % de la valeur du contrat = 1/4 de la margin. Margins usuelles (CME Group) : 3 % à 12 %, soit un levier de 33:1 à 8:1.",
      ],
      [
        "Qu'est-ce que le basis risk d'une couverture par derivative ? Donne deux exemples.",
        "Basis risk : couverture imparfaite, ==underlying ou date ≠ position couverte==\nEn clair : 50 large caps couvertes par un forward sur le S&P 500 ; récolte de maïs du 15 septembre couverte par des corn futures qui expirent le 1er octobre.",
      ],
      [
        "Counterparty credit risk : qui le porte entre l'acheteur d'une option, le writer d'une option, et les deux parties d'un forward ?",
        "Acheteur d'option : oui ; ==writer : non== ; forward : les deux\nEn clair : le writer a encaissé la premium et n'attend plus rien ; l'acheteur attend le payoff. Futures : margins, mark-to-market quotidien et clearinghouse réduisent ce risque.",
      ],
      [
        "Hedge accounting : quelle différence entre cash flow hedge, fair value hedge et net investment hedge ?",
        "Cash flow : ==flux futurs== · fair value : valeur au bilan · net investment : filiale étrangère\nEn clair : cash flow : recettes en devises vendues forward, dette flottante swappée en fixe. Fair value : inventory, dette fixe → flottant.\nPiège : dette fixe : sa valeur bouge (fair value) ; dette flottante : ses flux (cash flow).",
      ],
      [
        "Comment un investisseur utilise-t-il les derivatives pour modifier son risque ? Donne 4 exemples.",
        "Silver forwards · swap receive-fixed (==duration ↑==) · equity index futures · puts sur indice\nEn clair : dans l'ordre : exposition sans mise de fonds ; duration plus longue ; beta ↑ ou ↓ à faible coût ; downside coupé, upside gardé.\nPiège : couvrir son inventory ou une filiale étrangère est un usage d'issuer.",
      ],
      [
        "Pourquoi price-t-on les derivatives par no-arbitrage, en actualisant au risk-free rate ?",
        "Même payoff ⇒ même prix ; portefeuille ==sans risque== ⇒ risk-free rate\nEn clair : law of one price. Un derivative combiné à sa replication donne un portefeuille sans risque, actualisé au risk-free rate. Un écart sous les transaction costs peut subsister.\nPiège : ce n'est pas parce que les investisseurs seraient risk-neutral.",
      ],
      [
        "Replication : avec quelles positions cash recrée-t-on un long forward et un short forward sur une action ?",
        "Long forward = ==emprunter et acheter l'action== ; short : l'inverse\nEn clair : long : emprunter $S_0$ (spot price) au risk-free rate $R_f$ et acheter. Short : vendre l'action à découvert, placer le produit. Payoff du long en T : $S_T - S_0(1 + R_f)^T$.",
      ],
      [
        "No-arbitrage forward price : action sans dividende à 30, risk-free rate 5 %, forward à 1 an. Quel forward price ?",
        "Forward price = ==31,50==\n$$F_0(T) = S_0 \\times (1 + R_f)^T$$\nEn clair : 30 × 1,05 = 31,50, le coût d'acheter le spot et de le porter jusqu'en T. Où $S_0$ = spot price, $R_f$ = risk-free rate annuel, T en années.\nPiège : le forward price n'est pas une prévision du spot price futur.",
      ],
      [
        "Forward à 1 an sur une action sans dividende : spot price 30, risk-free rate 5 %, forward coté 32. Quel arbitrage, et quel gain ?",
        "Forward trop cher : ==le vendre==, emprunter 30 et acheter ; gain 0,50\nEn clair : prix no-arbitrage = 30 × 1,05 = 31,50. En T : livrer l'action à 32, rembourser 31,50. Forward à 31 : l'inverse (acheter le forward, shorter l'action, placer 30).",
      ],
      [
        "Comment les costs et les benefits de détention de l'underlying modifient-ils le no-arbitrage forward price ?",
        "Costs ==↑ F== ; benefits ↓ F\n$$F_0(T) = [S_0 + PV_0(\\text{costs}) - PV_0(\\text{benefits})] \\times (1 + R_f)^T$$\nEn clair : costs = storage, insurance ; benefits = dividendes, coupons, convenience yield. PV = present value. Ex. 30, dividende 1 dans 1 an, $R_f$ 5 % : 30 × 1,05 − 1 = 30,50.\nPiège : un benefit non monétaire (convenience yield) baisse aussi F.",
      ],
      [
        "Forward sur indice en taux continus : indice 1 550, dividend yield 1,3 %, risk-free rate 3 % (continus), échéance 6 mois. Quel forward price ?",
        "F ≈ ==1 563,23==\n$$F_0(T) = S_0 \\, e^{(r + c - b)T}$$\nEn clair : $1\\,550 \\times e^{(0{,}03 - 0{,}013) \\times 0{,}5}$. Où r = risk-free rate continu, c = storage costs (ici 0), b = benefits (ici dividend yield 1,3 %), T en années.",
      ],
      [
        "Currency forward à 1 an : spot USD/EUR 1,10, risk-free rate USD 2 %, risk-free rate EUR 3 %. Quel forward rate sans arbitrage ?",
        "F ≈ ==1,0893== USD par EUR\n$$F_{p/b} = S_{p/b} \\times \\dfrac{(1 + i_{\\text{price}})^T}{(1 + i_{\\text{base}})^T}$$\nEn clair : 1,10 × 1,02 / 1,03. USD/EUR : USD = price currency, EUR = base currency ; i = risk-free rate de chaque devise. L'EUR, au taux plus haut, cote en forward discount.\nPiège : le taux de la price currency va au numérateur.",
      ],
    ],
  },
  {
    title: "Derivatives — Flashcards 3/4 (Valeur des forwards, FRA, futures & swaps)",
    cards: [
      [
        "Forward contract : quelle différence entre forward price et forward value ? Combien vaut le contrat à l'initiation et à l'échéance ?",
        "Price ==figé== à l'initiation ; value : 0 au départ, puis varie\nEn clair : à l'échéance, value du long = $S_T - F_0(T)$ (spot price final − forward price) ; short : l'opposé. Ex. forward price 50, spot final 56, 100 actions : long +600.",
      ],
      [
        "Forward à 1 an conclu à 31,50 (risk-free rate 5 %). Six mois plus tard, le spot price vaut 33. Quelle value pour le long ?",
        "Value du long ≈ ==2,26==\n$$V_t = S_t - \\dfrac{F_0(T)}{(1 + R_f)^{T-t}}$$\nEn clair : 33 − 31,50 / 1,05^0,5 = 33 − 30,74. Où $S_t$ = spot price en t, $F_0(T)$ = forward price, $R_f$ = risk-free rate, T − t = durée restante.\nPiège : actualiser sur la durée restante (0,5 an), pas sur T. Value du short : −2,26.",
      ],
      [
        "Comment calcule-t-on la value d'un forward en cours de vie quand l'underlying a des costs et des benefits (storage, dividendes) ?",
        "Seuls les flux ==restants== comptent\n$$V_t = S_t + PV_t(\\text{costs}) - PV_t(\\text{benefits}) - \\dfrac{F_0(T)}{(1 + R_f)^{T-t}}$$\nEn clair : PV = present value en t des costs (storage) et benefits (dividendes) encore à venir. $S_t$ = spot price en t, $F_0(T)$ = forward price, $R_f$ = risk-free rate.\nPiège : un dividende déjà versé avant t ne compte plus.",
      ],
      [
        "Implied forward rate : spot rates (zero-coupon) $Z_2$ = 2 % et $Z_3$ = 3 %. Quel taux 2y1y (prêt de 1 an qui démarre dans 2 ans) ?",
        "2y1y = 1,03³ / 1,02² − 1 ≈ ==5,03 %==\nEn clair : prêter 3 ans au spot rate = prêter 2 ans, puis 1 an au forward : $(1 + Z_3)^3 = (1 + Z_2)^2 (1 + F_{2,1})$, où $Z_n$ = spot rate zero-coupon à n ans.",
      ],
      [
        "Qu'est-ce qu'un FRA (forward rate agreement), et quand le long gagne-t-il ?",
        "Long FRA = ==fixed-rate payer== : gagne si le MRR monte\nEn clair : le FRA fixe aujourd'hui le taux d'un emprunt futur. Le long paie le taux du FRA et reçoit le MRR (market reference rate). FRA = swap à une seule période.\nPiège : le long d'un forward sur bond, lui, perd quand les taux montent.",
      ],
      [
        "FRA (forward rate agreement) 3m6m à 1,30 % sur 1 million. Dans 3 mois, le MRR (market reference rate) 6 mois réalisé vaut 1,50 %. Combien reçoit le long ?",
        "Le long reçoit ≈ ==992,56==\n$$\\text{Payoff} = \\dfrac{NP \\times (MRR - FRA) \\times t}{1 + MRR \\times t}$$\nEn clair : 1 000 000 × 0,20 % × 6/12 = 1 000, puis 1 000 / (1 + 1,50 % × 6/12). NP = notional principal, t = 6/12.\nPiège : réglé en début de période : actualiser au MRR réalisé.",
      ],
      [
        "Futures : que deviennent le futures price et la value du contrat après le mark-to-market quotidien ?",
        "Price ==recalé== sur le settlement price ; value ramenée à 0\nEn clair : les gains et pertes du jour sont déjà passés en margin. Un forward sans mark-to-market garde son prix ; sa value varie jusqu'à l'échéance.",
      ],
      [
        "Pourquoi un futures price peut-il différer du forward price équivalent ? Lequel préfère le long si taux d'intérêt et futures price sont positivement corrélés ?",
        "Corrélation taux–futures positive : ==futures préféré== (futures price > forward)\nEn clair : cause : le mark-to-market quotidien. Gains de margin replacés à taux hauts, pertes financées à taux bas. Corrélation négative : forward préféré ; nulle : prix égaux.",
      ],
      [
        "Interest rate futures : comment est coté le prix, et le long gagne-t-il si le MRR (market reference rate) monte ou baisse ?",
        "Price = 100 − 100 × MRR ; le long gagne si le ==MRR baisse==\nEn clair : prix 97 ⇒ MRR de 3 %. Long interest rate futures ≈ short FRA (forward rate agreement), mais coté en prix et marked to market chaque jour.\nPiège : le long FRA, lui, gagne si le MRR monte.",
      ],
      [
        "BPV (basis point value) d'un interest rate futures sur un taux 6 mois, notional 1 million : combien ?",
        "BPV = 1 000 000 × 0,5 × 0,0001 = ==50== par bp\nEn clair : BPV (basis point value) = notional × period × 0,01 %, où period = durée du taux en années. Le futures est linéaire : ±1 bp (basis point) change sa value de 50.",
      ],
      [
        "Convexity bias : pourquoi un FRA (forward rate agreement) et un interest rate futures équivalent n'ont-ils pas le même payoff pour ±1 bp ?",
        "FRA actualisé au MRR réalisé : ==convexe== ; futures : linéaire\nEn clair : FRA 6m6m à 2,50 % sur 1 M : MRR (market reference rate) 2,51 % → reçoit 50 / 1,01255 = 49,38 ; 2,49 % → paie 49,39. L'écart croît avec la maturité.",
      ],
      [
        "En quoi un interest rate swap ressemble-t-il à une série de FRAs (forward rate agreements), et en quoi diffère-t-il ?",
        "1er paiement connu ; les suivants = ==FRAs au swap rate== (off-market)\nEn clair : tous ces FRAs ont le même taux fixe : chacun a une value non nulle à l'initiation, seule leur somme vaut 0.\nPiège : QCM : values « that sum to zero », pas « each equal to zero ».",
      ],
      [
        "Interest rate swap : quelle différence entre son price et sa value, et quand le fixed-rate payer gagne-t-il ?",
        "Price = ==taux fixe figé== ; value : 0 puis varie avec les taux\nEn clair : value du fixed-rate payer = PV (present value) des flottants attendus − PV des fixes : il gagne si les taux attendus montent. Elle sert aux paiements de mark-to-market.",
      ],
      [
        "Par swap rate d'un interest rate swap annuel à 3 ans : spot rates 1 %, 2 % et 3 %. Quel taux fixe ?",
        "Par swap rate ≈ ==2,96 %==\n$$\\text{par swap rate} = \\dfrac{1 - DF_N}{\\sum_{i=1}^{N} DF_i}$$\nEn clair : (1 − 0,9151) / (0,9901 + 0,9612 + 0,9151). $DF_i = 1/(1 + S_i)^i$ = discount factor du spot rate $S_i$. PV des fixes = PV des flottants attendus.",
      ],
      [
        "Interest rate swap : avec quelles positions en obligations réplique-t-on le fixed-rate payer et le fixed-rate receiver ?",
        "Fixed-rate payer = ==émettre une fixed-rate bond + acheter une FRN==\nEn clair : FRN = floating-rate note. Le fixed-rate receiver fait l'inverse : emprunter à taux flottant, acheter une fixed-rate bond. Le receiver allonge sa duration, le payer la réduit.",
      ],
    ],
  },
  {
    title: "Derivatives — Flashcards 4/4 (Options : payoffs, valeur & binomial)",
    cards: [
      [
        "Call option vs put option : quel droit a l'acheteur, quelle obligation a le writer ? European vs American ?",
        "Call : ==droit d'acheter== à X ; put : droit de vendre\nEn clair : X = exercise price. Le writer (short) a l'obligation inverse et encaisse la premium. European : exercice à l'échéance seulement ; American : à tout moment.",
      ],
      [
        "Long call : exercise price 50, premium 5, cours de l'action à l'échéance 58. Quels payoff, profit et breakeven ?",
        "Payoff 8 ; profit ==3== ; breakeven 55\n$$c_T = \\max(0, S_T - X) \\qquad p_T = \\max(0, X - S_T)$$\nEn clair : max(0, 58 − 50) = 8 ; 8 − 5 = 3 ; X + premium = 55. Où $S_T$ = prix de l'underlying à l'échéance, X = exercise price.\nPiège : profit = payoff − premium : ne pas confondre les deux.",
      ],
      [
        "Short put : exercise price 64, premium reçue 3,80. Profit du writer si l'action finit à 84 ? Et si elle finit à 60 ?",
        "À 84 : ==+3,80== ; à 60 : −0,20\nEn clair : à 84, le put (droit de vendre à 64) expire sans valeur : le writer garde la premium. À 60 : 3,80 − (64 − 60). Breakeven = 64 − 3,80 = 60,20.",
      ],
      [
        "Long call, short call, long put, short put : quelle perte maximale et quel gain maximal pour chacun ?",
        "Acheteur : perte max = premium ; ==short call : perte illimitée==\nEn clair : long call : gain illimité. Long put : gain max = X − premium (X = exercise price). Short put : perte max = X − premium. Writer : gain max = premium.\nPiège : le short put est une exposition longue à l'underlying, comme le long call.",
      ],
      [
        "Moneyness : quand un call et un put sont-ils in the money (ITM), at the money (ATM) ou out of the money (OTM) ? Application : X = 40, action à 37.",
        "Call ITM si S > X ; put ITM si ==S < X==\nEn clair : S = prix de l'underlying, X = exercise price ; ATM si S = X. Ex. X = 40, S = 37 : le call est OTM de 3, le put ITM de 3.",
      ],
      [
        "Option premium = exercise value + time value : que vaut chaque terme pour un put d'exercise price 55 coté 10, quand l'action vaut 47,50 ?",
        "Exercise value ==7,50== ; time value 2,50\nEn clair : exercise value = max(0, 55 − 47,50) ; time value = 10 − 7,50. Une option OTM (out of the money) ne vaut que sa time value ; à l'échéance, la time value est nulle.",
      ],
      [
        "Quelles sont les bornes basse et haute du prix d'un call européen et d'un put européen ?",
        "Bornes : ==X actualisé==\n$$\\max(0, S - PV(X)) \\le c \\le S$$\n$$\\max(0, PV(X) - S) \\le p \\le PV(X)$$\nEn clair : $PV(X) = X / (1 + R_f)^{T-t}$, où X = exercise price, S = spot price, $R_f$ = risk-free rate, T − t = durée restante.\nPiège : borne haute du put européen = PV(X), pas X : X n'est reçu qu'à l'échéance.",
      ],
      [
        "Options : quel est l'effet d'une hausse de la volatility et du time to expiration sur un call et sur un put ?",
        "Volatility ↑ ou échéance ↑ : ==call et put ↑==\nEn clair : plus de volatility, plus de chances de finir loin in the money. Plus de temps restant : plus de time value.\nPiège : un put européen très in the money peut perdre de la valeur si l'échéance s'allonge.",
      ],
      [
        "Options : quel est l'effet d'une hausse du risk-free rate, des benefits (dividendes, coupons) et des storage costs sur un call et sur un put ?",
        "$R_f$ ↑ ou storage costs ↑ : call ↑, put ↓ ; ==benefits ↑ : l'inverse==\nEn clair : $R_f$ = risk-free rate. Le call paie X plus tard (sa PV baisse), le put le reçoit plus tard. Les benefits (dividendes, convenience yield) font baisser l'underlying.",
      ],
      [
        "Put–call parity : action 52, put européen (X = 50, 3 mois) à 1,50, risk-free rate 5 %. Quel prix du call européen de même X et même échéance ?",
        "Call ≈ ==4,11==\n$$c_0 + \\dfrac{X}{(1 + R_f)^T} = S_0 + p_0$$\nEn clair : 52 + 1,50 − 50 / 1,05^0,25 = 53,50 − 49,39. Fiduciary call (call + zero-coupon qui paie X) = protective put (action + put).\nPiège : options européennes seulement, même X et même échéance.",
      ],
      [
        "Put–call parity : comment construire un synthetic call, un synthetic put et une synthetic stock ?",
        "Signe ==+ = long, − = short==\n$$c = S + p - B$$\n$$p = c - S + B$$\n$$S = c - p + B$$\nEn clair : B = zero-coupon sans risque qui paie X (exercise price) à l'échéance. Ex. synthetic call = long stock + long put + short bond. Option trop chère : la vendre, acheter la synthétique.",
      ],
      [
        "Que dit la put–call–forward parity, et que valent le call et le put européens quand l'exercise price égale le forward price ?",
        "X = forward price : ==call = put==\n$$\\dfrac{F_0(T)}{(1 + R_f)^T} + p_0 = c_0 + \\dfrac{X}{(1 + R_f)^T}$$\nEn clair : l'action est remplacée par une synthétique : long forward + zero-coupon qui paie $F_0(T)$ (forward price). X = exercise price, $R_f$ = risk-free rate.",
      ],
      [
        "Options et corporate finance : à quelle option correspond l'equity d'une firme endettée, et à quoi correspond sa dette ?",
        "Equity = ==call sur V== (strike D) ; dette = bond sans risque − put\nEn clair : V = valeur de la firme, D = dette zero-coupon à rembourser. Payoffs à l'échéance : equity max(0, V − D) ; dette min(V, D).\nPiège : les créanciers sont short le put sur V (strike D) : ils perdent si V < D.",
      ],
      [
        "Binomial model à une période : action à 50 qui ira à 60 ou à 42, call de strike 55. Quel hedge ratio h, et pourquoi actualiser au risk-free rate ?",
        "h ≈ ==0,278== action par call\n$$h = \\dfrac{c^+ - c^-}{S^+ - S^-}$$\nEn clair : (5 − 0) / (60 − 42). Short 1 call + h actions vaut 11,67 dans les deux états : portefeuille sans risque, donc actualisé au risk-free rate. $c^\\pm$, $S^\\pm$ = call et action en haut, en bas.\nPiège : pour un put : long put + long h actions.",
      ],
      [
        "Binomial model à une période : action à 50 qui ira à 60 ou à 42, call de strike 55, risk-free rate 3 % par période. Quelle risk-neutral probability, et quelle valeur du call ?",
        "π ≈ 0,528 ; call ≈ ==2,56==\n$$c_0 = \\dfrac{\\pi_u c^+ + (1 - \\pi_u) c^-}{1 + R_f}$$\nEn clair : $\\pi_u = (1 + R_f - R_d) / (R_u - R_d)$ = (1,03 − 0,84) / (1,20 − 0,84). Call = 0,528 × 5 / 1,03 ($c^+$ = 5, $c^-$ = 0).\nPiège : π n'est pas la vraie probabilité : les vraies probabilités n'entrent pas.",
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
