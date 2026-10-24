// Seed script — flashcards "Système" Fixed Income.
// 4 paquets de 15 cartes (60), à réviser en une nuit avec le one-pager Fixed
// Income : instruments et marchés, prix/yields/courbes, duration & convexity,
// crédit et titrisation. Chaque carte se comprend seule (cartes mélangées).
// Phrases en français, termes techniques en anglais (curriculum CFA). Vérifié
// sur Schweser Book 3 (R47 à R65). Verso au format « trois cases » : À retenir
// (==surligné==) / En clair / Piège. Formules au format KaTeX, rendues par
// components/RichText.tsx. Remplace les anciens paquets v1/v2 (oldTitles).
// Usage: node scripts/seed-flashcards-fixed-income.mjs
import { pathToFileURL } from "node:url";
import { getOwnerId, ensureFolder, seedFlashcardSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Fixed Income (Système)";

// Titres des anciens paquets Fixed Income (ancien format), supprimés au passage.
const oldTitles = [
  "Fixed-Income Instruments & Markets (R47–R51)",
  "Bond Valuation & Yield Measures (R52–R54)",
  "Term Structure of Interest Rates (R55)",
  "Interest Rate Risk: Duration & Convexity (R56–R59)",
  "Credit Analysis (R60–R62)",
  "Securitization, ABS & MBS (R63–R65)",
];

export const SETS = [
  {
    title: "Fixed Income — Flashcards 1/4 (Instruments, émission & marchés)",
    cards: [
      [
        "Comment classe-t-on une bond (obligation) selon sa maturity d'origine : money market, capital market ou perpetual ?",
        "Money market ==≤ 1 an== · capital market > 1 an · perpetual : sans maturity\nEn clair : un T-bill (Treasury bill) à 6 mois est un money market security ; une bond à 10 ans, un capital market security.\nPiège : on regarde la maturity d'origine, pas la durée restante (le tenor).",
      ],
      [
        "Qu'est-ce que l'indenture (ou trust deed) d'une bond et que précise-t-elle ?",
        "Indenture = ==contrat légal issuer ↔ bondholders==\nEn clair : elle fixe les features de la bond, la source of repayment, le collateral et les covenants ; un trustee la fait respecter.\nPiège : ni le credit rating ni le nom des bondholders n'y figurent.",
      ],
      [
        "Affirmative covenant vs negative covenant dans l'indenture d'une bond : quelle différence ?",
        "Affirmative covenant = doit faire ; negative covenant = ==interdit de faire==\nEn clair : affirmative : payer les coupons, publier ses comptes. Negative : pas de nouvelle dette plus senior, pas de vente du collateral, dividendes limités.",
      ],
      [
        "Bullet, amortizing, sinking fund : comment le principal d'une bond est-il remboursé dans chacune de ces structures ?",
        "Bullet : tout à maturity · amortizing : au fil des paiements · sinking fund : ==rachats partiels== prévus\nEn clair : fully amortizing : plus rien à rembourser au dernier paiement ; partially : un balloon payment reste à maturity.\nPiège : le sinking fund réduit le credit risk mais crée un reinvestment risk si les taux baissent.",
      ],
      [
        "Comment se calcule le coupon d'une FRN (floating-rate note) ?",
        "Coupon = ==MRR + quoted margin==, révisé à chaque reset date\nEn clair : MRR = market reference rate. Le coupon suit les taux du marché : faible interest rate risk. Ex. trimestriel : (3 % + 1 %) / 4 = 1 % de la par value.",
      ],
      [
        "Step-up, credit-linked, PIK (payment-in-kind) et deferred coupon bonds : comment le coupon évolue-t-il ou est-il payé dans chaque structure ?",
        "Step-up : ↑ par paliers · credit-linked : ↑ si downgrade · PIK : ==payé en bonds== · deferred : 0 au début\nEn clair : PIK et deferred servent aux issuers à court de cash, d'où des yields plus élevés. Le step-up protège le bondholder d'une hausse des taux.",
      ],
      [
        "Capital-indexed bond (type TIPS, Treasury Inflation-Protected Securities) : par value 1 000, coupon rate annuel 4 %, inflation de l'année 2 %. Quel coupon reçoit-on en fin d'année ?",
        "Coupon = 1 000 × 1,02 × 4 % = ==40,80==\nEn clair : le principal est indexé sur l'inflation (1 000 → 1 020) ; le coupon rate fixe (un real rate) s'applique au principal ajusté.\nPiège : pas 4 % × 1 000 = 40 : le coupon porte sur le principal indexé.",
      ],
      [
        "Comment s'écrit la valeur d'une callable bond et d'une putable bond à partir de la straight bond (option-free) identique ?",
        "$$V_{\\text{callable}} = V_{\\text{straight}} - V_{\\text{call}}$$\n$$V_{\\text{putable}} = V_{\\text{straight}} + V_{\\text{put}}$$\nEn clair : le call appartient à l'issuer : la callable bond vaut moins, son yield est plus haut. Le put appartient au bondholder : la putable bond vaut plus.",
      ],
      [
        "Une convertible bond de 1 000 de par value a un conversion price de 25 ; l'action cote 30. Quels sont le conversion ratio et la conversion value ?",
        "Conversion ratio et value : ==40 actions et 1 200==\nEn clair : conversion ratio = par value / conversion price = 1 000 / 25 ; conversion value = ratio × cours de l'action = 40 × 30.\nPiège : multiplier par le cours actuel (30), pas par le conversion price (25).",
      ],
      [
        "Domestic bond, foreign bond, Eurobond, global bond : comment les distinguer ?",
        "Domestic : issuer local · foreign : issuer étranger, marché local · Eurobond : ==hors juridiction nationale== · global : Eurobond + domestique\nEn clair : la foreign bond suit la monnaie du marché local ; l'Eurobond se vend hors du pays de sa monnaie (ex. USD à Londres).\nPiège : « Euro » ne veut pas dire libellé en euros.",
      ],
      [
        "Investment grade vs high yield : où passe la frontière de credit rating, et qu'est-ce qui distingue la dette high yield ?",
        "Investment grade : ==BBB− / Baa3== et au-dessus\nEn clair : high yield = BB+ / Ba1 et en dessous : plus de covenants, maturities plus courtes, souvent callable. L'investisseur high yield craint surtout le default, l'investment grade un downgrade.",
      ],
      [
        "Lines of credit d'une entreprise : classe uncommitted, committed et revolving de la moins fiable à la plus fiable.",
        "==Uncommitted < committed < revolving== : plus fiable = plus cher\nEn clair : uncommitted : la banque peut refuser. Committed : engagement formel, avec commitment fee. Revolving : engagement sur plusieurs années, renouvelable.",
      ],
      [
        "Repo (repurchase agreement) : collateral de 1 030 000, initial margin de 103 %, repo rate de 4 %, 90 jours (base 360). Que valent le purchase price et le repurchase price ?",
        "Purchase et repurchase price : ==1 000 000 et 1 010 000==\nEn clair : purchase = 1 030 000 / 1,03 ; repurchase = 1 000 000 × (1 + 4 % × 90/360). Repo rate plus haut si repo long, collateral faible ou undercollateralized.\nPiège : haircut = 1 − 1 / 1,03 ≈ 2,9 %, pas 3 %.",
      ],
      [
        "Auction de sovereign bonds (obligations d'État) : dans quel ordre les titres sont-ils alloués, et quel prix paie-t-on en single-price auction ?",
        "Noncompetitive bids d'abord ; single-price : tous paient au ==cut-off yield==\nEn clair : puis les competitive bids, du yield le plus bas au plus haut. Cut-off yield = yield du dernier bid servi. Multiple-price : chacun paie son propre prix.",
      ],
      [
        "GO (general obligation) bond vs revenue bond d'une collectivité locale : laquelle porte en général le plus de credit risk, et pourquoi ?",
        "==Revenue bond== : plus risquée, seuls les revenus du projet paient\nEn clair : la GO bond s'appuie sur tout le taxing power de la collectivité ; la revenue bond (péage, aéroport) s'analyse comme une corporate bond.",
      ],
    ],
  },
  {
    title: "Fixed Income — Flashcards 2/4 (Prix, yields & courbes)",
    cards: [
      [
        "Quelle est la formule du prix d'une bond à coupon fixe à partir de son YTM (yield to maturity) ?",
        "Prix = cash flows actualisés au YTM\n$$P = \\sum_{t=1}^{N} \\dfrac{PMT}{(1+r)^t} + \\dfrac{FV}{(1+r)^N}$$\nEn clair : où $PMT$ = coupon par période, $FV$ = par value, $r$ = YTM par période, $N$ = nombre de périodes. Ex. 2 ans, coupon 6, YTM 4 % → 6 / 1,04 + 106 / 1,04² = 103,77.\nPiège : semestriel : coupon / 2, YTM / 2, nombre d'années × 2.",
      ],
      [
        "Si le coupon rate d'une bond est inférieur à son YTM (yield to maturity), cote-t-elle at par, en premium ou en discount ?",
        "Coupon rate < YTM ⇒ ==discount== (prix < par value)\nEn clair : coupon rate > YTM : premium ; égal : at par. À YTM constant, le prix converge vers la par value avec le temps (pull to par).",
      ],
      [
        "Flat price, accrued interest et full price d'une bond : quelle relation, et quel prix est coté ?",
        "Full = flat + accrued ; ==flat price coté==\n$$PV^{\\text{Full}} = PV \\times (1+r)^{t/T}$$\nEn clair : où PV = prix au dernier coupon, r = YTM (yield to maturity) par période ; accrued interest = $t/T$ × coupon (t = jours écoulés, T = jours de la période). On paie le full (dirty), on cote le flat (clean).\nPiège : day count actual/actual pour les government bonds, 30/360 pour les corporate bonds.",
      ],
      [
        "À quoi sert la matrix pricing d'une bond et comment fonctionne-t-elle ?",
        "Matrix pricing : prix d'une bond ==peu ou pas cotée==\nEn clair : on interpole le YTM (yield to maturity) de bonds cotées de même credit quality et de maturities voisines, puis on actualise à ce YTM. Ex. 3 ans 4 %, 5 ans 5 % → 4 ans ≈ 4,5 %.",
      ],
      [
        "Current yield vs simple yield d'une bond : quelle différence de calcul ?",
        "Simple yield = (coupon ± ==straight-line amortization==) / flat price\nEn clair : current yield = coupon / flat price, sans amortization. Amortization = discount (+) ou premium (−) / années restantes. Ex. coupon 6, prix 96, 4 ans : 6 / 96 = 6,25 % vs 7 / 96 = 7,29 %.\nPiège : discount bond : coupon rate < current yield < YTM (yield to maturity) ; premium : l'inverse.",
      ],
      [
        "Une bond a un YTM (yield to maturity) de 6 % sur une semiannual bond basis. Quel est son EAY (effective annual yield) ?",
        "EAY = 1,03² − 1 = ==6,09 %==\nEn clair : semiannual bond basis : 6 % = 2 × 3 % par semestre. $\\text{EAY} = (1 + \\text{YTM}/m)^m - 1$, où m = périodes par an. Changer de périodicité : $(1+\\text{APR}_m/m)^m = (1+\\text{APR}_n/n)^n$, où APR (annual percentage rate) = taux annuel coté.\nPiège : diviser par 2 avant de composer : 1,03², pas 1,06.",
      ],
      [
        "Comment calcule-t-on le YTC (yield to call) et le YTW (yield to worst) d'une callable bond ?",
        "YTW = ==le plus bas des YTC et du YTM==\nEn clair : un YTC par call date : même calcul que le YTM (yield to maturity), avec N = périodes jusqu'au call et FV (future value) = call price. Le YTW est l'hypothèse la plus prudente.\nPiège : semestriel : doubler le taux trouvé par la calculatrice.",
      ],
      [
        "Un T-bill (Treasury bill) à 90 jours, face value 100, est coté à un discount rate de 4 % (base 360). Quel est son prix ?",
        "Prix = 100 × (1 − 90/360 × 4 %) = ==99==\nEn clair : le discount rate s'applique à la face value (T-bills, commercial paper) : prix = face value × (1 − jours/360 × discount rate).\nPiège : l'add-on rate (CD = certificate of deposit, repo) se calcule sur le prix : convertir avant de comparer.",
      ],
      [
        "FRN (floating-rate note) : si la discount margin dépasse la quoted margin, la FRN cote-t-elle au-dessus ou en dessous de la par value ?",
        "Discount margin > quoted margin ⇒ ==sous la par value==\nEn clair : quoted margin = spread fixé à l'émission ; discount margin = spread exigé aujourd'hui. Le marché veut plus que le coupon ne paie : le prix baisse.",
      ],
      [
        "Qu'est-ce qu'un spot rate et comment donne-t-il le prix no-arbitrage d'une bond ?",
        "Prix no-arbitrage : ==chaque cash flow actualisé à son spot rate==\nEn clair : spot rate = yield d'une zero-coupon bond de même maturity. Ex. 2 ans, coupon 4, spot 1 an 2 %, spot 2 ans 5 % → 4 / 1,02 + 104 / 1,05² = 98,25. Le YTM (yield to maturity) en est une moyenne.",
      ],
      [
        "Spot rate à 1 an = 2 %, spot rate à 2 ans = 3 %. Quel est le forward rate 1y1y (taux à 1 an qui démarre dans 1 an) ?",
        "1y1y = 1,03² / 1,02 − 1 ≈ ==4,01 %==\nEn clair : 2 ans au spot = 1 an au spot puis 1 an au forward : $(1+S_2)^2 = (1+S_1)(1+\\text{1y1y})$, où $S$ = spot rate. Approximation : 2 × 3 % − 2 % = 4 %. Cas général : $(1+S_{A+B})^{A+B} = (1+S_A)^A(1+\\text{AyBy})^B$, où AyBy = taux sur B ans qui démarre dans A ans.",
      ],
      [
        "Yield curve croissante (upward sloping) : comment se classent forward rates, spot rates et par yields ?",
        "Courbe croissante : ==forward > spot > par yield==\nEn clair : le par yield est une moyenne des spot rates, eux-mêmes moyennes des forward rates : chaque moyenne reste en retard sur la courbe.\nPiège : courbe inversée, ordre inverse (forward < spot < par yield).",
      ],
      [
        "G-spread, I-spread, Z-spread : par rapport à quel benchmark chaque spread est-il mesuré ?",
        "G-spread : government bond · I-spread : ==swap rate== · Z-spread : toute la spot curve\nEn clair : G et I : YTM (yield to maturity) − benchmark de même maturity. Z-spread (zero-volatility) : spread constant ajouté à chaque spot rate pour retrouver le prix.",
      ],
      [
        "Qu'est-ce que l'OAS (option-adjusted spread) et comment se compare-t-il au Z-spread pour une callable bond ?",
        "Callable bond : ==OAS < Z-spread== (OAS = Z-spread − valeur du call en basis points)\nEn clair : l'OAS retire la valeur de l'option du spread : c'est le spread à comparer entre bonds avec embedded options.\nPiège : putable bond : OAS > Z-spread, car le put a de la valeur pour l'investisseur.",
      ],
      [
        "Dans quelles conditions de marché les yield spreads des corporate bonds s'élargissent-ils ?",
        "Spreads s'élargissent : ==récession== · forte offre de bonds · dealers à court de capital\nEn clair : en récession, les credit spread curves montent et s'aplatissent ; en expansion, elles baissent et se pentifient. Le high yield bouge le plus.",
      ],
    ],
  },
  {
    title: "Fixed Income — Flashcards 3/4 (Risque de taux : duration & convexity)",
    cards: [
      [
        "À quelles conditions le return réalisé d'une bond est-il égal à son YTM (yield to maturity) à l'achat ?",
        "Return réalisé = YTM : à maturity, sans default, ==coupons réinvestis au YTM==\nEn clair : vente avant maturity : capital gain ou loss si le YTM a bougé. Reinvestment risk plus fort si coupon élevé ou maturity longue ; nul pour une zero-coupon bond.",
      ],
      [
        "Qu'est-ce que le duration gap d'une bond et que signifie un duration gap positif ?",
        "Duration gap = ==Macaulay duration − investment horizon== ; positif = price risk\nEn clair : gap > 0 : si les taux montent, la baisse du prix l'emporte sur le réinvestissement : return sous le YTM (yield to maturity) d'achat. Gap nul : effets compensés.\nPiège : gap < 0 : c'est une baisse des taux qui fait mal (reinvestment risk).",
      ],
      [
        "Qu'est-ce que la Macaulay duration d'une bond et combien vaut-elle pour une zero-coupon bond ?",
        "Macaulay duration = moyenne pondérée des dates ; zero-coupon : ==sa maturity==\nEn clair : chaque date de cash flow pèse PV (present value) du cash flow / prix. À maturity égale, une bond à coupons a une duration plus courte qu'une zero-coupon bond.",
      ],
      [
        "Comment passe-t-on de la Macaulay duration à la modified duration, et que mesure la modified duration ?",
        "$$\\text{Modified duration} = \\dfrac{\\text{Macaulay duration}}{1+r}$$\nEn clair : elle donne le % de baisse du prix pour 1 % de hausse du yield, où r = YTM (yield to maturity) par période. Ex. Macaulay duration 7, YTM annuel 5 % → 7 / 1,05 = 6,67.\nPiège : semestriel : diviser par (1 + YTM/2), pas par (1 + YTM).",
      ],
      [
        "Une bond cote 100. Son prix passe à 104 si son YTM (yield to maturity) baisse de 50 bp (basis points), et à 96,2 s'il monte de 50 bp. Quelle approximate modified duration ?",
        "Modified duration ≈ (104 − 96,2) / (2 × 0,005 × 100) = ==7,8==\nEn clair : approximate modified duration = $(PV_- - PV_+) / (2 \\times \\Delta\\text{YTM} \\times PV_0)$, où $PV_-$, $PV_+$ = prix après baisse et hausse du YTM, $PV_0$ = prix actuel.\nPiège : ΔYTM en décimal : 50 bp = 0,005, pas 0,5 ni 0,05.",
      ],
      [
        "Pourquoi mesure-t-on le risque de taux d'une callable bond avec l'effective duration plutôt qu'avec la modified duration ?",
        "Callable bond : ==pas de YTM unique==, cash flows liés au call\nEn clair : l'effective duration mesure la sensibilité du prix à un choc parallèle de la benchmark yield curve (ΔCurve), avec un modèle qui intègre le call.\nPiège : quand les taux baissent, l'effective duration d'une callable bond baisse (prix plafonné par le call).",
      ],
      [
        "Une position en bond a un full price de 2 000 000 et une annual modified duration de 6. Quels sont sa money duration et son PVBP (price value of a basis point) ?",
        "Money duration et PVBP : ==12 000 000 et 1 200==\nEn clair : money duration = annual modified duration × full price = 6 × 2 000 000. PVBP = money duration × 0,0001 (1 bp, basis point).",
      ],
      [
        "Toutes choses égales, quel effet ont la maturity, le coupon rate et le YTM (yield to maturity) sur la duration d'une bond option-free ?",
        "Maturity ↑ ⇒ duration ↑ ; ==coupon ↑ ou YTM ↑ ⇒ duration ↓==\nEn clair : le prix le plus sensible aux taux : maturity longue, coupon bas, YTM bas. Avec le temps, la duration baisse.\nPiège : discount bond très longue : la duration peut baisser quand la maturity monte.",
      ],
      [
        "La duration d'un portefeuille, calculée comme moyenne pondérée des durations, suppose quel mouvement de la yield curve, et quel outil mesure les autres mouvements ?",
        "Moyenne pondérée des durations ⇒ ==parallel shift== supposé ; sinon, key rate durations\nEn clair : la key rate duration mesure l'effet d'un seul taux (une maturity), les autres fixes. Leur somme = effective duration ; elles captent le shaping risk.",
      ],
      [
        "Empirical duration vs analytical duration : quelle différence, et laquelle est la plus faible pour une corporate bond en flight to quality ?",
        "Flight to quality : ==empirical < analytical duration== (corporate bond)\nEn clair : empirical duration = estimée sur les prix passés ; analytical = calculée par formule. Taux d'État ↓ mais credit spreads ↑ : la corporate bond monte moins que prévu.",
      ],
      [
        "Que signifie la convexity positive d'une bond option-free ?",
        "Même écart de yield : la hausse de prix ==dépasse== la baisse\nEn clair : convexity positive = courbe prix-yield bombée ; la duration (une droite tangente) sous-estime donc toujours le nouveau prix, que le yield monte ou baisse.",
      ],
      [
        "Une bond cote 100. Son prix passe à 105 si son YTM (yield to maturity) baisse de 100 bp (basis points), et à 95,2 s'il monte de 100 bp. Quelle approximate convexity ?",
        "Convexity ≈ (105 + 95,2 − 200) / (0,01² × 100) = ==20==\nEn clair : approximate convexity = $(PV_- + PV_+ - 2PV_0) / ((\\Delta\\text{YTM})^2 \\times PV_0)$, où $PV_-$, $PV_+$ = prix après baisse et hausse du YTM, $PV_0$ = prix actuel.\nPiège : ΔYTM en décimal et au carré : 0,01² = 0,0001.",
      ],
      [
        "Quelle formule estime la variation en % du prix d'une bond avec la duration et la convexity ?",
        "$$\\%\\Delta P \\approx -D \\times \\Delta y + \\tfrac{1}{2} \\times C \\times (\\Delta y)^2$$\nEn clair : où $D$ = annual modified duration, $C$ = annual convexity, $\\Delta y$ = variation du YTM (yield to maturity) en décimal. Le terme de convexity est positif pour une bond option-free.\nPiège : convexity par période → annuelle : diviser par m² (semestriel : ÷ 4).",
      ],
      [
        "Une bond a une annual modified duration de 5 et une annual convexity de 50. Son YTM (yield to maturity) monte de 100 bp (basis points). Quelle variation de prix estimer ?",
        "Prix ≈ −5 % + 0,25 % = ==−4,75 %==\nEn clair : −5 × 0,01 + ½ × 50 × 0,01². Le terme de convexity reste positif dans les deux sens : si le YTM baisse de 100 bp, +5,25 %.",
      ],
      [
        "Callable bond vs putable bond : quelle convexity ont-elles quand les taux bougent ?",
        "Callable : ==negative convexity== à bas taux ; putable : toujours positive\nEn clair : à bas taux, le call price plafonne le prix de la callable bond. Le put crée un plancher pour la putable bond quand les taux montent.\nPiège : les MBS (mortgage-backed securities) ont aussi une negative convexity, à cause des prepayments.",
      ],
    ],
  },
  {
    title: "Fixed Income — Flashcards 4/4 (Risque de crédit & titrisation)",
    cards: [
      [
        "Comment calcule-t-on l'expected loss d'une bond et quel credit spread en déduire ?",
        "Expected loss = ==POD × LGD== ≈ credit spread exigé\nEn clair : POD = probability of default ; LGD = loss given default = exposure × (1 − recovery rate). Ex. POD 2 %, recovery 40 % → 2 % × 60 % = 1,2 %.",
      ],
      [
        "Quelles sont les 5 C de l'analyse crédit bottom-up d'un corporate issuer ?",
        "Capacity · capital · collateral · covenants · character\nEn clair : capacity = capacité à payer (coverage ↑, leverage ↓) ; character = qualité du management. À ne pas confondre avec les C top-down : conditions, country, currency.",
      ],
      [
        "Dans quel ordre la dette d'un corporate issuer est-elle remboursée en cas de default ?",
        "==Secured > unsecured > subordinated== ; senior avant junior à chaque rang\nEn clair : ordre complet : first lien > senior secured > junior secured > senior unsecured > senior subordinated > subordinated > junior subordinated.\nPiège : l'absolute priority of claims n'est pas toujours respectée (règlement négocié).",
      ],
      [
        "Issuer credit rating vs issue credit rating : quelle différence, et qu'est-ce que le notching ?",
        "Issue rating = ==issuer rating ± notching== (seniority, collateral)\nEn clair : l'issuer rating (CFR, corporate family rating) note la dette senior unsecured. Secured : notée plus haut ; subordinated : plus bas. Notching surtout si l'issuer est mal noté.\nPiège : structural subordination : sur les cash flows d'une filiale, la dette de la filiale passe avant celle de la holding.",
      ],
      [
        "Dans une securitization, quels rôles jouent le seller, le SPE (special purpose entity) et le servicer ?",
        "Seller : vend les actifs · SPE : ==émet les ABS== · servicer : collecte les paiements\nEn clair : ABS = asset-backed securities. Le SPE est bankruptcy remote : si le seller fait faillite, ses créanciers ne peuvent pas saisir les actifs du SPE.",
      ],
      [
        "Quels sont les principaux benefits de la securitization pour la banque qui vend ses prêts (l'originator), pour les investisseurs et pour les marchés ?",
        "Originator : ==prête plus== · investisseurs : risk/return sur mesure · marchés : plus liquides\nEn clair : l'originator libère du cash et du regulatory capital, et touche des fees. Les investisseurs accèdent à des prêts qu'ils ne savent pas originer.\nPiège : réduire le crédit bancaire n'est pas un benefit : la banque prête plus.",
      ],
      [
        "Quelles sont les 3 formes d'internal credit enhancement d'un ABS (asset-backed security) ?",
        "Overcollateralization · excess spread · credit tranching (subordination)\nEn clair : collateral > ABS émis ; intérêts reçus > coupons dus (l'excédent couvre les pertes) ; les tranches juniors perdent en premier.\nPiège : le tranching répartit le risque du pool, il ne le réduit pas.",
      ],
      [
        "Covered bond vs ABS (asset-backed security) : où restent les actifs, et pourquoi la covered bond est-elle moins risquée ?",
        "Covered bond : actifs ==au bilan de l'issuer== + dual recourse\nEn clair : le bondholder a recours sur l'issuer et sur le cover pool, renouvelé si des actifs se dégradent (dynamic cover pool) : moins de risque, yield plus bas qu'un ABS.\nPiège : hard-bullet = default dès un paiement manqué ; soft-bullet = maturity repoussable jusqu'à 1 an.",
      ],
      [
        "Credit card ABS (asset-backed security) : que reçoivent les investisseurs pendant la lockout (revolving) period, puis après ?",
        "Lockout period : ==intérêts et fees seulement== ; ensuite, le principal aussi\nEn clair : pendant la lockout, le principal remboursé rachète de nouvelles receivables (non-amortizing). Une rapid amortization provision avance le remboursement si le pool se dégrade.",
      ],
      [
        "Quels sont les 3 types de CLO (collateralized loan obligation) et d'où viennent les paiements de chacun ?",
        "Cash flow : flux du collateral · market value : trading du collateral · synthetic : ==credit derivatives==\nEn clair : un CLO est adossé à des leveraged loans et géré activement par un collateral manager. Tranche la plus risquée : l'equity tranche.",
      ],
      [
        "MBS (mortgage-backed security) : quand les taux baissent, quel risque de prepayment apparaît, contraction risk ou extension risk ?",
        "Taux ↓ ⇒ ==contraction risk== : prepayments plus rapides\nEn clair : les emprunteurs refinancent : le principal revient plus tôt et se réinvestit à des taux plus bas. Une PO (principal-only) tranche y gagne, une IO (interest-only) tranche y perd.\nPiège : taux ↑ = extension risk (prepayments ralentis) : ne pas inverser les deux.",
      ],
      [
        "Agency RMBS vs non-agency RMBS (residential mortgage-backed securities) : qui émet et qui garantit ?",
        "Agency : ==garantie État ou GSE== ; non-agency : émetteurs privés, sans garantie\nEn clair : GSE = government-sponsored enterprise : sa garantie n'est pas celle de l'État. L'agency RMBS porte sur des conforming loans ; le non-agency a besoin d'un credit enhancement.\nPiège : pass-through rate < WAC (weighted average coupon) du pool : les servicing fees sont prélevées avant.",
      ],
      [
        "CMO (collateralized mortgage obligation) sequential-pay : quelle tranche porte le plus de contraction risk, et laquelle le plus d'extension risk ?",
        "Première tranche : ==contraction risk== ; dernière : extension risk\nEn clair : tout le principal, prepayments compris, va à la tranche 1 jusqu'à son remboursement complet, puis à la tranche 2, etc.\nPiège : le time tranching répartit le prepayment risk, il ne le supprime pas.",
      ],
      [
        "CMO (collateralized mortgage obligation) : PAC (planned amortization class) tranche vs support tranche, laquelle absorbe le prepayment risk ?",
        "La ==support tranche== absorbe le prepayment risk\nEn clair : elle encaisse l'excès ou le manque de prepayments pour que la PAC tranche suive son calendrier, tant qu'ils restent dans une bande prévue.",
      ],
      [
        "Pourquoi l'analyse d'un CMBS (commercial mortgage-backed security) se concentre-t-elle sur le DSCR (debt service coverage ratio) et le LTV (loan-to-value) de chaque immeuble ?",
        "Prêts ==nonrecourse== : seul l'immeuble rembourse le prêteur\nEn clair : DSCR = NOI (net operating income) / debt service : haut = mieux ; LTV : bas = mieux. Call protection : prepayment lockout, defeasance, prepayment penalty points.\nPiège : le balloon risk est une forme d'extension risk.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "flashcards");
  console.log("Flashcards — Système Fixed Income (4 paquets × 15)...");
  const total = await seedFlashcardSets({ ownerId, folderId, sets: SETS, oldTitles });
  console.log(`\n✅ Terminé. ${total} cartes ajoutées.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  });
}
