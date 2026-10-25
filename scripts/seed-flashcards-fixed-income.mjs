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
        "Money market : ==titres à maturity d'origine ≤ 1 an== · Capital market : ==titres à maturity d'origine > 1 an== · Perpetual : ==bond sans date de remboursement==\nEn clair : Un T-bill (Treasury bill) à 6 mois est un money market security. Une bond à 10 ans est un capital market security.\nPiège : on classe sur la maturity d'origine, pas sur la durée restante (le tenor).",
      ],
      [
        "Qu'est-ce que l'indenture (ou trust deed) d'une bond ?",
        "Indenture = ==contrat légal issuer ↔ bondholders==\nEn clair : L'indenture fixe les features de la bond, la source of repayment, le collateral et les covenants. Un trustee veille à son respect.\nPiège : ni le credit rating ni le nom des bondholders n'y figurent.",
      ],
      [
        "Affirmative covenant vs negative covenant dans l'indenture d'une bond : quelle différence ?",
        "Affirmative covenant : ==obligation de faire== · Negative covenant : ==interdiction de faire==\nEn clair : Un affirmative covenant impose une action : payer les coupons, publier ses comptes. Un negative covenant interdit par exemple une nouvelle dette plus senior ou la vente du collateral.",
      ],
      [
        "Bullet, amortizing, sinking fund : comment le principal d'une bond est-il remboursé dans chacune de ces structures ?",
        "Bullet : ==tout le principal à maturity== · Amortizing : ==principal remboursé à chaque paiement== · Sinking fund : ==part de l'émission rachetée périodiquement==\nEn clair : Une fully amortizing bond est soldée au dernier paiement, une partially amortizing garde un balloon payment.\nPiège : le sinking fund réduit le credit risk mais crée un reinvestment risk si les taux baissent.",
      ],
      [
        "Formule du coupon d'une FRN (floating-rate note) ? Application : MRR 3 %, quoted margin 1 %, coupons trimestriels, par value 100.",
        "$$\\text{Coupon} = \\dfrac{\\text{MRR} + \\text{Quoted margin}}{m} \\times \\text{Par value}$$\nEn clair : MRR = market reference rate, révisé à chaque reset date, et m = coupons par an. (3 % + 1 %) / 4 × 100 = 1 par trimestre. Le coupon suit les taux, d'où un faible interest rate risk.",
      ],
      [
        "Step-up, credit-linked, PIK (payment-in-kind) et deferred coupon bonds : comment le coupon évolue-t-il ou est-il payé dans chaque structure ?",
        "Step-up : ==coupon qui monte par paliers prévus== · Credit-linked : ==coupon qui monte si downgrade== · PIK : ==coupon payé en nouvelles bonds== · Deferred : ==aucun coupon les premières années==\nEn clair : Les PIK et deferred coupon bonds servent aux issuers à court de cash, d'où des yields plus élevés. Le step-up protège le bondholder d'une hausse des taux.",
      ],
      [
        "Formule du coupon d'une capital-indexed bond (type TIPS, Treasury Inflation-Protected Securities) ? Application : par value 1 000, coupon rate 4 % payé une fois par an, inflation de l'année 2 %.",
        "$$\\text{Adjusted principal} = \\text{Par value} \\times (1 + \\text{Inflation})$$\n$$\\text{Coupon} = \\text{Adjusted principal} \\times \\dfrac{\\text{Coupon rate}}{m}$$\nEn clair : Inflation = inflation cumulée depuis l'émission, m = coupons par an. 1 000 × 1,02 = 1 020, puis 1 020 × 4 % = 40,80. Le coupon rate fixe est un real rate.\nPiège : pas 1 000 × 4 % = 40 : le coupon porte sur le principal indexé.",
      ],
      [
        "Formule de la valeur d'une callable bond et d'une putable bond à partir de la straight bond (option-free) identique ?",
        "$$V_{\\text{callable}} = V_{\\text{straight}} - V_{\\text{call}}$$\n$$V_{\\text{putable}} = V_{\\text{straight}} + V_{\\text{put}}$$\nEn clair : Le call appartient à l'issuer, donc la callable bond vaut moins et offre un yield plus haut. Le put appartient au bondholder, donc la putable bond vaut plus.",
      ],
      [
        "Formules du conversion ratio et de la conversion value d'une convertible bond ? Application : par value 1 000, conversion price 25, action cotée 30.",
        "$$\\text{Conversion ratio} = \\dfrac{\\text{Par value}}{\\text{Conversion price}}$$\n$$\\text{Conversion value} = \\text{Conversion ratio} \\times \\text{Share price}$$\nEn clair : Share price = cours actuel de l'action. 1 000 / 25 = 40 actions, puis 40 × 30 = 1 200.\nPiège : multiplier par le cours actuel (30), pas par le conversion price (25).",
      ],
      [
        "Domestic bond, foreign bond, Eurobond, global bond : comment les distinguer ?",
        "Domestic : ==issuer et marché locaux== · Foreign : ==issuer étranger, marché local== · Eurobond : ==émise hors de toute juridiction nationale== · Global : ==Eurobond aussi traitée sur un marché domestic==\nEn clair : Une Eurobond se vend hors du pays de sa monnaie, par exemple une bond en USD à Londres.\nPiège : « Euro » ne veut pas dire libellé en euros.",
      ],
      [
        "Investment grade vs high yield : où passe la frontière de credit rating (S&P et Moody's) ?",
        "Investment grade : ==≥ BBB−/Baa3== · High yield : ==≤ BB+/Ba1==\nEn clair : La dette high yield a plus de covenants et des maturities plus courtes, et elle est souvent callable. Ses investisseurs craignent le default, ceux d'investment grade un downgrade.",
      ],
      [
        "Lines of credit d'une entreprise : classe uncommitted, committed et revolving de la moins fiable à la plus fiable.",
        "Uncommitted : ==la banque peut refuser de prêter== · Committed : ==banque engagée pour une durée fixée== · Revolving : ==committed plus long, parfois plusieurs années==\nEn clair : Fiabilité et coût croissent : uncommitted < committed < revolving. Committed et revolving lines ajoutent une commitment fee aux intérêts.",
      ],
      [
        "Formules du purchase price et du repurchase price d'un repo (repurchase agreement) ? Application : collateral de 1 030 000, initial margin 103 %, repo rate 4 %, 90 jours (base 360).",
        "$$\\text{Purchase price} = \\dfrac{\\text{Collateral value}}{\\text{Initial margin}}$$\n$$\\text{Repurchase price} = \\text{Purchase price} \\times \\left(1 + \\text{Repo rate} \\times \\dfrac{\\text{Days}}{360}\\right)$$\nEn clair : Purchase price = montant prêté. 1 030 000 / 1,03 = 1 000 000, puis 1 000 000 × (1 + 4 % × 90/360) = 1 010 000.\nPiège : haircut = 1 − 1 / 1,03 ≈ 2,9 %, pas 3 %.",
      ],
      [
        "Auction de sovereign bonds (obligations d'État) : dans quel ordre les titres sont-ils alloués, et quel prix paie-t-on en single-price auction ?",
        "Noncompetitive bids : ==servis en premier== · Competitive bids : ==par yield croissant== · Single-price : ==tous au cut-off yield==\nEn clair : Le cut-off yield est le yield du dernier competitive bid servi. En multiple-price auction, chacun paie le yield de son propre bid.",
      ],
      [
        "GO (general obligation) bond vs revenue bond d'une collectivité locale : qu'est-ce qui rembourse chacune, et laquelle porte le plus de credit risk ?",
        "GO : ==payée par tout le taxing power== · Revenue : ==payée par son seul projet== → plus risquée\nEn clair : Une GO bond s'appuie sur tous les impôts de la collectivité. Une revenue bond (péage, aéroport) s'analyse comme une corporate bond.",
      ],
    ],
  },
  {
    title: "Fixed Income — Flashcards 2/4 (Prix, yields & courbes)",
    cards: [
      [
        "Formule du prix d'une bond à coupon fixe à partir de son YTM (yield to maturity) ? Application : 2 ans, coupon annuel 6, par value 100, YTM 4 %.",
        "Prix = cash flows actualisés au YTM\n$$P = \\sum_{t=1}^{N} \\dfrac{PMT}{(1+r)^t} + \\dfrac{FV}{(1+r)^N}$$\nEn clair : $PMT$ = coupon par période, $FV$ = par value, $r$ = YTM par période, $N$ = nombre de périodes. 6 / 1,04 + 106 / 1,04² = 103,77.\nPiège : semestriel : coupon / 2, YTM / 2, nombre d'années × 2.",
      ],
      [
        "Si le coupon rate d'une bond est inférieur à son YTM (yield to maturity), cote-t-elle at par, en premium ou en discount ?",
        "Coupon rate < YTM ⇒ ==discount== (prix < par value)\nEn clair : Le coupon paie moins que le yield exigé, donc le prix passe sous la par value. Si le coupon rate dépasse le YTM, la bond cote en premium ; à égalité, at par.\nPiège : même à YTM constant, le prix bouge : il converge vers la par value (pull to par).",
      ],
      [
        "Full price d'une bond entre deux dates de coupon : quelle formule, et quel prix est coté, le full ou le flat price ?",
        "$$PV^{\\text{Full}} = PV^{\\text{Flat}} + AI = PV \\times (1+r)^{t/T}$$\nPrix coté : ==le flat price (clean)==\nEn clair : AI = accrued interest = $t/T \\times PMT$, avec PMT = coupon de la période. PV = prix au dernier coupon, r = YTM (yield to maturity) par période, t = jours écoulés, T = jours de la période.\nPiège : day count actual/actual pour les government bonds, 30/360 pour les corporate bonds.",
      ],
      [
        "Formule de la matrix pricing d'une bond peu ou pas cotée ? Application : bonds cotées de même credit quality à 3 ans (YTM 4 %) et à 5 ans (YTM 5 %) ; bond non cotée à 4 ans.",
        "Matrix pricing : interpolation linéaire des YTM\n$$\\text{YTM}_T = \\text{YTM}_1 + (\\text{YTM}_2 - \\text{YTM}_1) \\times \\dfrac{T - T_1}{T_2 - T_1}$$\nEn clair : YTM = yield to maturity, $T_1$ et $T_2$ = maturities des bonds cotées autour de T. 4 % + 1 % × (4 − 3) / (5 − 3) = 4,5 %, puis on actualise les cash flows à 4,5 %.",
      ],
      [
        "Formules du current yield et du simple yield d'une bond ? Application : coupon annuel 6, flat price 96, par value 100, 4 ans restants.",
        "$$\\text{Current yield} = \\dfrac{\\text{Annual coupon}}{\\text{Flat price}}$$\n$$\\text{Simple yield} = \\dfrac{\\text{Annual coupon} \\pm \\text{Straight-line amortization}}{\\text{Flat price}}$$\nEn clair : Current yield = 6 / 96 = 6,25 %. L'amortization étale le discount de 4 (100 − 96) sur 4 ans = 1 par an (+ si discount, − si premium), d'où simple yield = 7 / 96 = 7,29 %.\nPiège : discount bond : coupon rate < current yield < YTM (yield to maturity) ; premium : l'inverse.",
      ],
      [
        "Formule de l'EAY (effective annual yield) d'une bond à partir de son YTM (yield to maturity) ? Application : YTM 6 % sur une semiannual bond basis.",
        "$$\\text{EAY} = \\left(1 + \\dfrac{\\text{YTM}}{m}\\right)^m - 1$$\nEn clair : Avec m = périodes par an : 6 % / 2 = 3 % par semestre, et 1,03² − 1 = 6,09 %. Pour changer de périodicité : $(1+\\text{APR}_m/m)^m = (1+\\text{APR}_n/n)^n$ (APR = annual percentage rate).\nPiège : composer le taux par période : 1,03² − 1 = 6,09 %, pas 1,06² − 1.",
      ],
      [
        "Comment obtient-on le YTW (yield to worst) d'une callable bond ?",
        "YTW = ==le plus bas des YTC et du YTM==\nEn clair : On calcule un YTC (yield to call) par call date, comme un YTM (yield to maturity) avec N = périodes jusqu'au call et FV = call price. Le YTW est l'hypothèse la plus prudente.\nPiège : semestriel : doubler le taux périodique trouvé à la calculatrice.",
      ],
      [
        "Formule du prix d'un T-bill (Treasury bill) coté en discount rate ? Application : 90 jours, face value 100, discount rate 4 % (base 360).",
        "$$PV = FV \\times \\left(1 - \\dfrac{\\text{Days}}{\\text{Year}} \\times DR\\right)$$\nEn clair : PV = prix, FV = face value, DR = discount rate, Year = 360 (même formule pour le commercial paper). 100 × (1 − 90/360 × 4 %) = 99.\nPiège : l'add-on rate (CD = certificate of deposit, repo) se calcule sur le prix : convertir avant de comparer.",
      ],
      [
        "FRN (floating-rate note) : si la discount margin dépasse la quoted margin, la FRN cote-t-elle au-dessus ou en dessous de la par value ?",
        "Discount margin > quoted margin ⇒ ==sous la par value==\nEn clair : La quoted margin est le spread fixé à l'émission, la discount margin celui que le marché exige aujourd'hui. Le coupon paie moins que le marché ne veut, donc le prix baisse.",
      ],
      [
        "Formule du prix no-arbitrage d'une bond à partir des spot rates ? Application : 2 ans, coupon annuel 4, par value 100, spot 1 an 2 %, spot 2 ans 5 %.",
        "$$P = \\dfrac{CF_1}{(1+S_1)^1} + \\dfrac{CF_2}{(1+S_2)^2} + \\dots + \\dfrac{CF_N}{(1+S_N)^N}$$\nEn clair : $S_t$ = spot rate à t ans (yield d'une zero-coupon bond de maturity t). 4 / 1,02 + 104 / 1,05² = 98,25. Le YTM (yield to maturity) en est une moyenne.",
      ],
      [
        "Formule du forward rate AyBy à partir des spot rates ? Application : spot rate à 1 an 2 %, spot rate à 2 ans 3 % ; forward rate 1y1y (taux à 1 an qui démarre dans 1 an).",
        "$$(1+S_{A+B})^{A+B} = (1+S_A)^A \\times (1+\\text{AyBy})^B$$\nEn clair : AyBy = taux sur B ans qui démarre dans A ans, S = spot rate. 1y1y = 1,03² / 1,02 − 1 ≈ 4,01 % (approximation : 2 × 3 % − 2 % = 4 %).",
      ],
      [
        "Yield curve croissante (upward sloping) : comment se classent forward rates, spot rates et par yields ?",
        "Courbe croissante : ==forward > spot > par yield==\nEn clair : Le par yield est une moyenne des spot rates, eux-mêmes des moyennes des forward rates. Sur une courbe qui monte, chaque moyenne reste en retard.\nPiège : courbe inversée, ordre inverse (forward < spot < par yield).",
      ],
      [
        "G-spread, I-spread, Z-spread : par rapport à quel benchmark chaque spread est-il mesuré ?",
        "G-spread : ==YTM − government bond yield, même maturity== · I-spread : ==YTM − swap rate, même maturity== · Z-spread : ==spread constant ajouté à chaque spot rate==\nEn clair : YTM = yield to maturity. G-spread et I-spread comparent un seul yield. Le Z-spread (zero-volatility spread), ajouté à toute la government spot curve, redonne le prix de la bond.",
      ],
      [
        "Formule de l'OAS (option-adjusted spread) d'une bond, et comment se compare-t-il au Z-spread pour une callable bond ?",
        "$$\\text{OAS} = \\text{Z-spread} - \\text{Option value}$$\nCallable bond : ==OAS < Z-spread==\nEn clair : Option value = yield en plus exigé pour l'embedded option, en bp (basis points). Ex. : Z-spread 180 bp − call 60 bp = OAS 120 bp. On compare les bonds à options sur leur OAS.\nPiège : putable bond : option value < 0 (le put profite à l'investisseur), donc OAS > Z-spread.",
      ],
      [
        "Dans quelles conditions de marché les yield spreads des corporate bonds s'élargissent-ils ?",
        "Spreads s'élargissent quand :\n==Récession== · Forte ==offre de bonds== · Dealers à ==court de capital==\nEn clair : En récession, les credit spread curves montent et s'aplatissent ; en expansion, elles baissent et se pentifient. Les spreads high yield bougent le plus.",
      ],
    ],
  },
  {
    title: "Fixed Income — Flashcards 3/4 (Risque de taux : duration & convexity)",
    cards: [
      [
        "À quelles conditions le return réalisé d'une bond est-il égal à son YTM (yield to maturity) à l'achat ?",
        "Détenue ==jusqu'à maturity== · ==Aucun default== · Coupons ==réinvestis au YTM==\nEn clair : Une vente avant maturity crée un capital gain ou loss si le YTM a bougé. Le reinvestment risk croît avec le coupon et la maturity, et il est nul pour une zero-coupon bond.",
      ],
      [
        "Formule du duration gap d'une bond, et que signifie un duration gap positif ?",
        "$$\\text{Duration gap} = \\text{Macaulay duration} - \\text{Investment horizon}$$\nGap > 0 : ==le price risk domine==\nEn clair : Si les taux montent, la baisse du prix l'emporte sur le gain de réinvestissement : le return passe sous le YTM (yield to maturity) d'achat. Un gap nul neutralise les deux.\nPiège : gap < 0 : c'est une baisse des taux qui fait mal (reinvestment risk).",
      ],
      [
        "Formule de la Macaulay duration d'une bond, et combien vaut-elle pour une zero-coupon bond ?",
        "$$\\text{Macaulay duration} = \\sum_{t=1}^{N} t \\times \\dfrac{PV(CF_t)}{P}$$\nZero-coupon : ==duration = maturity==\nEn clair : C'est la moyenne des dates t (en périodes) des cash flows $CF_t$, pondérées par leur PV (present value) rapportée au prix P. À maturity égale, une bond à coupons a une duration plus courte.",
      ],
      [
        "Formule de la modified duration à partir de la Macaulay duration ? Application : Macaulay duration 7, YTM (yield to maturity) 5 %, coupons annuels.",
        "$$\\text{Modified duration} = \\dfrac{\\text{Macaulay duration}}{1+r}$$\nEn clair : Avec r = YTM par période : 7 / 1,05 = 6,67. Le prix baisse donc d'environ 6,67 % si le yield monte de 1 %.\nPiège : semestriel : diviser par (1 + YTM/2), pas par (1 + YTM).",
      ],
      [
        "Formule de l'approximate modified duration d'une bond ? Application : prix 100 ; 104 si le YTM (yield to maturity) baisse de 50 bp (basis points), 96,2 s'il monte de 50 bp.",
        "$$\\text{ApproxModDur} = \\dfrac{PV_- - PV_+}{2 \\times \\Delta\\text{YTM} \\times PV_0}$$\nEn clair : $PV_-$, $PV_+$ = prix après baisse et hausse du YTM, $PV_0$ = prix actuel. (104 − 96,2) / (2 × 0,005 × 100) = 7,8.\nPiège : ΔYTM en décimal : 50 bp = 0,005, pas 0,5 ni 0,05.",
      ],
      [
        "Pourquoi mesure-t-on le risque de taux d'une callable bond avec l'effective duration plutôt qu'avec la modified duration ?",
        "Callable : ==cash flows incertains== (liés au call)\nEn clair : La modified duration suppose des cash flows fixes. L'effective duration mesure l'effet d'un choc de la benchmark yield curve (ΔCurve), via un modèle incluant le call.\nPiège : taux en baisse : l'effective duration d'une callable bond baisse (prix plafonné au call).",
      ],
      [
        "Formules de la money duration et du PVBP (price value of a basis point) d'une position en bond ? Application : full price 2 000 000, annual modified duration 6.",
        "$$\\text{Money duration} = \\text{AnnModDur} \\times PV^{\\text{Full}}$$\n$$\\text{PVBP} = \\dfrac{PV_- - PV_+}{2} \\approx \\text{Money duration} \\times 0{,}0001$$\nEn clair : AnnModDur = annual modified duration ; $PV_-$, $PV_+$ = prix si le YTM (yield to maturity) baisse ou monte de 1 bp (basis point). 6 × 2 000 000 = 12 000 000, puis 12 000 000 × 0,0001 = 1 200.",
      ],
      [
        "Toutes choses égales, quel effet ont la maturity, le coupon rate et le YTM (yield to maturity) sur la duration d'une bond option-free ?",
        "Maturity ↑ : ==duration ↑== · Coupon rate ↑ : ==duration ↓== · YTM ↑ : ==duration ↓==\nEn clair : La bond la plus sensible aux taux a une maturity longue, un coupon bas et un YTM bas. Avec le temps qui passe, la duration baisse.\nPiège : discount bond très longue : la duration peut baisser quand la maturity monte.",
      ],
      [
        "Formule de la duration d'un portefeuille de bonds, et quel mouvement de la yield curve suppose-t-elle ?",
        "$$D_P = \\sum_{i} w_i \\times D_i$$\nHypothèse : ==parallel shift== de la courbe\nEn clair : $w_i$ = poids de la bond i en market value, $D_i$ = sa duration. Pour les autres mouvements, les key rate durations mesurent l'effet d'un seul taux ; leur somme = effective duration.\nPiège : pondérer par la market value, pas par le nominal.",
      ],
      [
        "Empirical duration vs analytical duration : quelle différence, et laquelle est la plus faible pour une corporate bond en flight to quality ?",
        "Empirical : ==estimée sur données passées== · Analytical : ==calculée par formule== · Flight-to-quality : ==empirical plus faible==\nEn clair : En flight to quality, les taux d'État baissent mais les credit spreads montent. La corporate bond monte donc moins que ne le prévoit l'analytical duration.",
      ],
      [
        "Que signifie la convexity positive d'une bond option-free ?",
        "Même écart de yield : la hausse de prix ==dépasse== la baisse\nEn clair : La courbe prix-yield est bombée. La duration, une droite tangente, sous-estime donc toujours le nouveau prix, que le yield monte ou baisse.",
      ],
      [
        "Formule de l'approximate convexity d'une bond ? Application : prix 100 ; 105 si le YTM (yield to maturity) baisse de 100 bp (basis points), 95,2 s'il monte de 100 bp.",
        "$$\\text{ApproxCon} = \\dfrac{PV_- + PV_+ - 2 \\times PV_0}{(\\Delta\\text{YTM})^2 \\times PV_0}$$\nEn clair : $PV_-$, $PV_+$ = prix après baisse et hausse du YTM, $PV_0$ = prix actuel. (105 + 95,2 − 200) / (0,01² × 100) = 20.\nPiège : ΔYTM en décimal et au carré : 0,01² = 0,0001.",
      ],
      [
        "Formule de l'effective duration d'une callable bond ? Application : prix 100 ; 102 si la benchmark yield curve baisse de 50 bp (basis points), 97,5 si elle monte de 50 bp.",
        "$$\\text{EffDur} = \\dfrac{PV_- - PV_+}{2 \\times \\Delta\\text{Curve} \\times PV_0}$$\nEn clair : $PV_-$, $PV_+$ = prix donnés par un modèle après baisse et hausse de la benchmark yield curve, $PV_0$ = prix actuel. (102 − 97,5) / (2 × 0,005 × 100) = 4,5.\nPiège : on choque la benchmark yield curve (ΔCurve), pas le YTM (yield to maturity) de la bond.",
      ],
      [
        "Formule de la variation de prix d'une bond par duration effect et convexity adjustment ? Application : annual modified duration 5, annual convexity 50, YTM (yield to maturity) +100 bp.",
        "%ΔPrix ≈ ==duration effect + convexity adjustment==\n$$\\%\\Delta PV \\approx -D \\times \\Delta y + \\tfrac{1}{2} \\times C \\times (\\Delta y)^2$$\nEn clair : $D$ = annual modified duration, $C$ = annual convexity, $\\Delta y$ = variation du YTM en décimal. Ici : −5 × 0,01 + ½ × 50 × 0,01² = −5 % + 0,25 % = −4,75 %.\nPiège : le convexity adjustment reste positif : YTM −100 bp → +5 % + 0,25 % = +5,25 %.",
      ],
      [
        "Callable bond vs putable bond : quelle convexity ont-elles quand les taux bougent ?",
        "Callable : ==negative convexity à bas taux, prix plafonné== · Putable : ==positive convexity, prix plancher si taux ↑==\nEn clair : Negative convexity : à écart de yield égal, le prix monte moins qu'il ne baisse. Le put, lui, freine la baisse.\nPiège : les MBS (mortgage-backed securities) ont aussi une negative convexity, à cause des prepayments.",
      ],
    ],
  },
  {
    title: "Fixed Income — Flashcards 4/4 (Risque de crédit & titrisation)",
    cards: [
      [
        "Formule de l'expected loss d'une bond ? Application : POD (probability of default) 2 %, recovery rate 40 %, exposure 100 % du montant dû.",
        "$$\\text{Expected loss} = \\text{POD} \\times \\text{LGD}$$\n$$\\text{LGD} = \\text{Exposure} \\times (1 - \\text{Recovery rate})$$\nEn clair : LGD = loss given default, en % du montant dû. 2 % × 100 % × (1 − 40 %) = 1,2 %, à peu près le credit spread exigé (credit spread ≈ POD × LGD).",
      ],
      [
        "Quelles sont les 5 C de l'analyse crédit bottom-up d'un corporate issuer ?",
        "Capacity : ==capacité à payer ses dettes à temps== · Capital : ==ressources qui réduisent le besoin de dette== · Collateral : ==actifs gagés au profit du prêteur== · Covenants : ==termes légaux du contrat de dette== · Character : ==intégrité et sérieux du management==\nEn clair : Ces cinq facteurs sont propres à l'issuer. Les C top-down sont autres : conditions, country, currency.",
      ],
      [
        "Dans quel ordre la dette d'un corporate issuer est-elle remboursée en cas de default ?",
        "==Secured > unsecured > subordinated==\nEn clair : À chaque niveau, le senior passe avant le junior : first lien > senior secured > junior secured > senior unsecured > senior subordinated > subordinated > junior subordinated.\nPiège : l'absolute priority of claims n'est pas toujours respectée (règlement négocié).",
      ],
      [
        "Issuer credit rating vs issue credit rating : quelle différence, et qu'est-ce que le notching ?",
        "Issuer rating : ==note de l'issuer (senior unsecured debt)== · Issue rating : ==note d'une émission, selon sa seniority== · Notching : ==décaler l'issue rating de l'issuer rating==\nEn clair : Le notching monte la note d'une dette secured et baisse celle d'une subordinated.\nPiège : structural subordination : chez une filiale, sa propre dette passe avant celle de la holding.",
      ],
      [
        "Dans une securitization, quels rôles jouent le seller, le SPE (special purpose entity) et le servicer ?",
        "Seller : ==vend ses actifs (prêts) au SPE== · SPE : ==achète ces actifs, émet les ABS== · Servicer : ==collecte les paiements des emprunteurs==\nEn clair : ABS = asset-backed securities. Le SPE est bankruptcy remote : si le seller fait faillite, ses créanciers ne peuvent pas saisir les actifs du SPE.",
      ],
      [
        "Quels sont les principaux benefits de la securitization pour la banque qui vend ses prêts (l'originator), pour les investisseurs et pour les marchés ?",
        "Originator : ==prête plus== · Investisseurs : ==risk/return sur mesure== · Marchés : ==plus liquides==\nEn clair : L'originator libère du cash et du regulatory capital. Les investisseurs accèdent à des prêts qu'ils ne savent pas originer eux-mêmes.\nPiège : réduire le crédit bancaire n'est pas un benefit : la banque prête plus.",
      ],
      [
        "Quelles sont les 3 formes d'internal credit enhancement d'un ABS (asset-backed security) ?",
        "Overcollateralization : ==collateral supérieur aux ABS émis== · Excess spread : ==intérêts reçus supérieurs aux coupons dus== · Credit tranching : ==tranches juniors absorbent les pertes d'abord==\nEn clair : Aucun garant extérieur : tout vient de la structure. Le credit tranching s'appelle aussi subordination.\nPiège : le tranching répartit le risque du pool, il ne le réduit pas.",
      ],
      [
        "Covered bond vs ABS (asset-backed security) : où restent les actifs, et pourquoi la covered bond est-elle moins risquée ?",
        "Covered bond : ==dette bancaire, actifs gardés au bilan== · ABS : ==émis par un SPE, actifs hors bilan== · Moins risquée : ==dual recourse, issuer et cover pool==\nEn clair : Le cover pool regroupe les actifs gagés, et l'issuer doit remplacer tout actif qui se dégrade. D'où un yield plus bas qu'un ABS.\nPiège : actifs au bilan, donc pas d'allègement de regulatory capital.",
      ],
      [
        "Credit card ABS (asset-backed security) : que reçoivent les investisseurs pendant la lockout (revolving) period, puis après ?",
        "Lockout : ==intérêts et fees seulement== · Ensuite : ==le principal aussi==\nEn clair : Pendant la lockout, le principal remboursé par les porteurs de cartes rachète de nouvelles receivables. Une rapid amortization provision avance le remboursement si le pool se dégrade.",
      ],
      [
        "Quels sont les 3 types de CLO (collateralized loan obligation) et d'où viennent les paiements de chacun ?",
        "Cash flow : ==payé par les flux du collateral== · Market value : ==payé en tradant le collateral== · Synthetic : ==credit derivatives, sans posséder les loans==\nEn clair : Le CLO est adossé à des leveraged loans et géré activement par un collateral manager. Sa tranche la plus risquée est l'equity tranche.",
      ],
      [
        "MBS (mortgage-backed security) : quand les taux baissent, quel risque de prepayment apparaît, contraction risk ou extension risk ?",
        "Taux ↓ ⇒ ==contraction risk== : prepayments plus rapides\nEn clair : Les emprunteurs refinancent, donc le principal revient plus tôt et se réinvestit à des taux plus bas. Une PO (principal-only) tranche y gagne, une IO (interest-only) y perd.\nPiège : taux ↑ = extension risk (prepayments ralentis) : ne pas inverser les deux.",
      ],
      [
        "Agency RMBS vs non-agency RMBS (residential mortgage-backed securities) : qui émet et qui garantit ?",
        "Agency : ==garanti par l'État ou une GSE== · Non-agency : ==émis par un privé, sans garantie État/GSE==\nEn clair : GSE = government-sponsored enterprise, dont la garantie n'est pas celle de l'État. Le non-agency RMBS a besoin d'un credit enhancement.\nPiège : pass-through rate < WAC (weighted average coupon) du pool : les servicing fees sont prélevées avant.",
      ],
      [
        "CMO (collateralized mortgage obligation) sequential-pay : quelle tranche porte le plus de contraction risk, et laquelle le plus d'extension risk ?",
        "Première tranche : ==max contraction risk== · Dernière tranche : ==max extension risk==\nEn clair : Tout le principal, prepayments compris, va à la tranche 1 jusqu'à son remboursement complet, puis à la tranche 2, et ainsi de suite.\nPiège : le time tranching répartit le prepayment risk, il ne le supprime pas.",
      ],
      [
        "CMO (collateralized mortgage obligation) : PAC (planned amortization class) tranche vs support tranche, laquelle absorbe le prepayment risk ?",
        "PAC : ==principal remboursé selon un calendrier fixé== · Support : ==absorbe l'excès ou le manque de prepayments==\nEn clair : La support tranche porte le prepayment risk. Elle permet à la PAC tranche de tenir son calendrier tant que les prepayments restent dans une bande prévue.",
      ],
      [
        "Pourquoi l'analyse d'un CMBS (commercial mortgage-backed security) se concentre-t-elle sur le DSCR (debt service coverage ratio) et le LTV (loan-to-value) de chaque immeuble ?",
        "Prêts ==nonrecourse== : seul l'immeuble rembourse le prêteur\nEn clair : Un DSCR élevé (NOI / debt service, NOI = net operating income) et un LTV bas signalent un prêt sûr. La call protection passe par lockout, defeasance ou prepayment penalty points.\nPiège : le balloon risk est une forme d'extension risk.",
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
