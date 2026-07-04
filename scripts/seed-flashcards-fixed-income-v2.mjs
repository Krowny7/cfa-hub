// Seed script v2 — Flashcards Système Fixed Income (CFA Level I, R47-R65)
// Remplace entièrement le contenu des 6 sets existants (v1 trop peu dense,
// ~65 cartes pour 19 readings) par un contenu vérifié Schweser + corrigés
// officiels, dans le format validé par l'utilisateur (front = question seule,
// sans préfixe "Fixed Income — RNN |").
// Usage: node scripts/seed-flashcards-fixed-income-v2.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(path) {
  const out = {};
  const txt = readFileSync(path, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
const env = loadEnv(join(__dirname, "..", ".env.local"));

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const FOLDER_NAME = "Fixed Income (Système)";

const SETS = [
  {
    title: "Fixed-Income Instruments & Markets (R47–R51)",
    cards: [
      ["Qu'est-ce qu'un bond (obligation) ?", "Un titre de dette standardisé et négociable. L'émetteur emprunte le principal (par value / face value) et promet de le rembourser avec des coupons périodiques."],
      ["Qu'est-ce que le tenor ?", "Le temps restant avant la maturité d'un bond."],
      ["Qu'est-ce qu'un perpetual bond ?", "Un bond sans date de maturité définie."],
      ["Coupon annuel d'un fixed-rate bond ?", "Coupon rate × face value (par value)."],
      ["Qu'est-ce qu'un floating-rate note (FRN / floater) ?", "Bond dont le coupon variable = MRR + quoted spread (en basis points). Le MRR est réinitialisé périodiquement."],
      ["Qu'est-ce qu'un zero-coupon bond (pure discount bond) ?", "Bond sans coupon, vendu en dessous du pair et remboursé à la face value à maturité."],
      ["Relation fondamentale prix / yield ?", "Prix et yield sont inversement liés : prix ↑ → yield ↓, et vice versa."],
      ["Money market securities vs capital market securities ?", "Money market : maturité originale ≤ 1 an. Capital market : maturité > 1 an."],
      ["Normal yield curve vs inverted yield curve ?", "Normal (upward sloping) : la plus fréquente, taux longs > taux courts. Inverted (downward sloping) : moins commune, taux courts > taux longs."],
      ["Qu'est-ce qu'un spread ? Exemple.", "Différence entre le yield d'un bond et celui d'un benchmark (ex. gouvernement). Si corporate yield 6%, Treasury yield 5% → spread = 1%."],
      ["Qu'est-ce qu'un bond indenture (trust deed) ?", "Contrat légal entre l'émetteur et les obligataires. Définit obligations de l'émetteur, covenants, collateral et sources de remboursement."],
      ["Affirmative covenant vs negative covenant ?", "Affirmative = ce que l'émetteur DOIT faire (ex. fournir des rapports financiers). Negative = ce que l'émetteur NE PEUT PAS faire (ex. émettre de la dette plus senior)."],
      ["Qu'est-ce qu'une cross-default clause ?", "Si l'émetteur est en défaut sur une autre dette, il est automatiquement en défaut sur celle-ci."],
      ["Qu'est-ce qu'une pari passu clause ?", "Ce bond a la même priorité de remboursement que les autres dettes seniors de l'émetteur."],
      ["Qu'est-ce qu'une negative pledge clause ?", "L'émetteur ne peut pas émettre de nouvelle dette plus senior que la dette existante."],
      ["Source de remboursement d'un sovereign bond ?", "Recettes fiscales + pouvoir de création monétaire → credit risk le plus bas sur le marché domestique."],
      ["Source de remboursement d'un asset-backed security (ABS) ?", "Cash flows d'un pool d'actifs financiers détenus par une special purpose entity (SPE)."],
      ["Moyen mnémotechnique premium / discount bond ?", "Coupon > YTM → premium (prix > par). Coupon < YTM → discount (prix < par). Coupon = YTM → par."],
      ["Qu'est-ce que le credit quality spectrum ?", "Investment grade ≥ BBB−/Baa3. High yield (junk) ≤ BB+/Ba1."],
      ["Qu'est-ce qu'un fallen angel ?", "Une obligation anciennement investment-grade, dégradée → bascule dans le segment high-yield."],
      ["Qu'est-ce que la distressed debt ?", "Obligations d'émetteurs en faillite ou proches de la faillite, achetées par des fonds spécialisés espérant profiter d'un recovery rate supérieur aux attentes."],
      ["Qui investit dans les Treasury notes intermédiaires et pourquoi ?", "Les banques centrales, comme outil de politique monétaire."],
      ["Qui investit dans la dette long terme investment-grade ?", "Les pension funds et assureurs, pour matcher leurs passifs (retraites, sinistres)."],
      ["3 différences entre indices obligataires et indices actions ?", "1. Plus de constituants (un émetteur = plusieurs bonds). 2. Turnover plus élevé (bonds arrivent à maturité). 3. Dominé par les gouvernements (pas les corporates)."],
      ["Aggregate index vs Narrow index ?", "Aggregate : large sélection, tous secteurs. Narrow : focus sur géographie, credit quality, secteur ou maturité spécifique."],
      ["Underwritten offering vs Best-efforts offering ?", "Underwritten : prix garanti par la banque d'investissement (elle achète l'émission). Best-efforts : banque vend à la commission, sans garantie de prix."],
      ["Qu'est-ce qu'une shelf registration ?", "Enregistrement global auprès des régulateurs → émissions au fil du temps selon les besoins (en quelques heures pour un frequent issuer)."],
      ["Où se négocie la majorité de la dette sur le marché secondaire ?", "Marché OTC dealer-driven (pas une bourse organisée). Les dealers postent des bid et ask prices."],
      ["On-the-run bond vs Off-the-run (seasoned) bond ?", "On-the-run : émission la plus récente pour une maturité donnée → la plus liquide → spread le plus étroit. Off-the-run : émissions plus anciennes → moins liquides."],
      ["Bid price vs Ask price du dealer ?", "Bid = prix auquel le dealer achète. Ask = prix auquel le dealer vend. Spread = Ask − Bid."],
      ["Uncommitted vs Committed vs Revolving line of credit ?", "Uncommitted : banque peut refuser. Committed : banque s'engage pour une période (renewal risk). Revolving : plus fiable, terme plus long, covenants restrictifs."],
      ["Qu'est-ce que le rollover risk ?", "Risque de ne pas pouvoir réémettre du commercial paper à maturité. Géré via des backup liquidity lines."],
      ["Qu'est-ce que le factoring ?", "Transfert des créances clients à un tiers (factor) à un prix décoté. Le factor prend en charge le recouvrement."],
      ["Qu'est-ce qu'un repo (repurchase agreement) ?", "Prêt collatéralisé à court terme : le vendeur (borrower) vend un titre avec engagement de le racheter à un prix plus élevé. La différence = les intérêts."],
      ["Formule du purchase price d'un repo ?", "Purchase price = valeur marché du collatéral / initial margin."],
      ["Formule du repurchase price d'un repo ?", "Repurchase price = purchase price × [1 + (repo rate × jours/360)]."],
      ["Formule du haircut ?", "Haircut = 1 − (1 / initial margin)."],
      ["Qu'est-ce que la variation margin dans un repo ?", "Collatéral supplémentaire demandé si la valeur du collatéral chute sous le seuil requis."],
      ["Repo : qui est le borrower et qui est le lender ?", "Le vendeur du titre = borrower (reçoit du cash). L'acheteur du titre = lender (donne du cash)."],
      ["Reverse repo — définition ?", "Même transaction vue du côté du prêteur de cash (il achète le titre et le revendra). Ce qui est un repo pour l'un est un reverse repo pour l'autre."],
      ["Tri-party repo vs Bilateral repo ?", "Tri-party : intermédiaire tiers (custodian bank) administre le repo → réduit le risque opérationnel mais pas le credit risk. Bilateral : directement entre deux contreparties."],
      ["4 usages principaux des repos ?", "1. Financer des positions trading. 2. Placer des liquidités excédentaires. 3. Politique monétaire des banques centrales. 4. Emprunter des titres pour short selling (via reverse repo)."],
      ["Investment grade vs High yield : composition du yield ?", "IG : yield majoritairement composé du benchmark rate. HY : yield majoritairement composé du credit spread."],
      ["Investment grade vs High yield : risque principal ?", "IG : risque de downgrade. HY : risque de défaut (default) et loss given default."],
      ["Qu'est-ce qu'un sovereign bond ?", "Dette émise par un gouvernement national. Garantie par le pouvoir fiscal et (parfois) de création monétaire → credit risk le plus bas."],
      ["Domestic debt vs External debt (marchés émergents) ?", "Domestic : en devise locale, pour investisseurs domestiques. External : en reserve currency (ex. USD), pour créanciers étrangers → risque de change indirect."],
      ["Pourquoi un sovereign émet sur toute la gamme de maturités ?", "Créer des benchmark yield curves, permettre la couverture du risque de taux, utiliser comme collatéral repos, permettre la politique monétaire de la banque centrale."],
      ["GO bonds vs Revenue bonds ?", "GO bonds : garantis par le pouvoir fiscal général de la collectivité (plus sûrs). Revenue bonds : garantis uniquement par les revenus d'un projet spécifique (plus risqués)."],
      ["Qu'est-ce qu'un quasi-government (agency) bond ?", "Bond émis par une entité créée par un gouvernement national pour une mission spécifique (ex. Ginnie Mae USA). Yields proches du souverain."],
      ["Qu'est-ce qu'un supranational bond ?", "Bond émis par une institution multilatérale (FMI, Banque Mondiale, BEI). Soutenu par les États membres. Haute qualité de crédit."],
      ["Noncompetitive bid vs Competitive bid dans une auction ?", "Noncompetitive : accepte le prix fixé par les offres compétitives → allocation garantie. Competitive : propose un yield → allocation non garantie."],
      ["Single-price auction (Dutch) vs Multiple-price auction (American) ?", "Single-price : tous paient le même prix (cut-off yield) → volatilité plus basse, distribution plus large. Multiple-price : chacun paie son propre prix → offres plus concentrées."],
      ["Rôle des primary dealers ?", "Soumettre des competitive bids aux adjudications, vendre pour des tiers, être contrepartie de la banque centrale pour ses opérations de marché."],
      ["Pourquoi les yields souverains sont-ils artificiellement bas ?", "Des investisseurs \"non-économiques\" (banques centrales, gouvernements étrangers, banques commerciales pour exigences réglementaires) achètent pour des raisons non-financières → demande artificielle → yields plus bas."],
      ["Ricardian equivalence — principe ?", "Les contribuables anticipent que la dette d'aujourd'hui = impôts futurs → le gouvernement devrait être indifférent entre lever des impôts ou émettre de la dette. En pratique, les hypothèses ne tiennent pas."],
    ],
  },
  {
    title: "Bond Valuation & Yield Measures (R52–R54)",
    cards: [
      ["Qu'est-ce que la yield to maturity (YTM) d'une obligation ?", "Le taux d'actualisation qui égalise la valeur présente des cash flows futurs du bond (coupons + principal) à son prix de marché actuel. C'est le rendement que l'investisseur réalise s'il détient le bond jusqu'à maturité, si l'émetteur paie tout et si les coupons sont réinvestis à ce même taux YTM."],
      ["Formule du prix d'un bond à coupon annuel ?", "Prix = somme des coupons actualisés + principal actualisé au taux YTM, soit coupon/(1+YTM) + coupon/(1+YTM)^2 + ... + (coupon+principal)/(1+YTM)^N. Exemple : bond 5 ans, coupon annuel 10%, YTM 10% → prix = 100 (bond à par). Si YTM tombe à 8%, prix = 107.99 (prime). Si YTM monte à 12%, prix = 92.79 (décote)."],
      ["Comment ajuster la formule de prix pour un bond semestriel (semiannual-pay) ?", "On divise le coupon et le YTM par 2, et on multiplie N par 2 : prix = coupon/2 / (1+YTM/2) + ... + (coupon/2 + principal)/(1+YTM/2)^(N×2). Le YTM annoncé (stated YTM) est le taux périodique semestriel multiplié par 2."],
      ["Relation entre coupon rate, YTM et prix d'un bond ?", "Si coupon rate = YTM, le bond se traite à par. Si coupon rate < YTM (coupon 'deficient'), le bond se traite en dessous du pair (discount). Si coupon rate > YTM (coupon 'excessive'), le bond se traite au-dessus du pair (premium)."],
      ["Pourquoi la relation prix-yield d'un bond est-elle dite convexe ?", "Parce qu'une baisse de YTM augmente le prix davantage (en valeur absolue) qu'une hausse équivalente de YTM ne le diminue. Ex : pour un bond 5 ans 10% coupon, une baisse de 2% du YTM (de 10% à 8%) augmente le prix de 7.99, alors qu'une hausse de 2% (de 10% à 12%) le diminue de seulement 7.21."],
      ["Effet de la maturité et du coupon sur la sensibilité du prix au yield ?", "Toutes choses égales par ailleurs : plus la maturité est longue, plus le prix est sensible aux variations de yield. Plus le coupon est faible, plus le prix est sensible aux variations de yield."],
      ["Qu'est-ce que la constant-yield price trajectory ?", "La trajectoire que suit le prix d'un bond dans le temps si son YTM reste constant. Le prix converge ('pull to par') vers la valeur du principal à mesure que la maturité approche, quel que soit le niveau initial de prime ou de décote."],
      ["Qu'est-ce que l'accrued interest (intérêt couru) ?", "La portion du prochain coupon déjà gagnée par le vendeur entre la dernière date de paiement de coupon et la date de règlement (settlement). Formule : accrued interest = coupon payment x (jours depuis le dernier coupon / jours dans la période de coupon)."],
      ["Convention actual/actual vs 30/360 pour calculer l'accrued interest ?", "Actual/actual : utilise le nombre réel de jours entre les paiements de coupon et jusqu'au règlement (utilisé typiquement pour les government bonds). 30/360 : suppose que chaque mois compte 30 jours et l'année 360 jours (utilisé typiquement pour les corporate bonds)."],
      ["Flat price vs Full price d'un bond ?", "Le flat price (ou clean price) est le prix coté, sans l'accrued interest. Le full price (ou dirty price/invoice price) est le prix réellement payé par l'acheteur = flat price + accrued interest. On calcule d'abord le full price, puis flat price = full price − accrued interest."],
      ["Comment calcule-t-on le full price d'un bond entre deux dates de coupon ?", "Étape 1 : calculer la valeur du bond à la dernière date de coupon (PV des cash flows restants au YTM). Étape 2 : composer cette valeur au taux YTM par période, sur la fraction de période écoulée depuis le dernier coupon : full price = PV à la dernière date de coupon x (1 + YTM/périodes par an)^(jours depuis dernier coupon / jours dans la période de coupon)."],
      ["Qu'est-ce que le matrix pricing ?", "Une méthode d'estimation du YTM (ou du prix) d'un bond non traité ou peu liquide, en utilisant les YTM de bonds traités de qualité de crédit similaire, ainsi qu'une interpolation linéaire si les maturités des bonds comparables diffèrent de celle du bond à évaluer."],
      ["Comment le matrix pricing est-il utilisé pour une nouvelle émission ?", "On estime le spread de yield requis pour la nouvelle émission en observant le spread (par rapport à un benchmark, ex Treasury) d'obligations similaires déjà émises, puis on applique ce spread au yield du benchmark interpolé pour la maturité de la nouvelle émission."],
      ["Qu'est-ce que la periodicity d'un bond ?", "Le nombre de paiements de coupon par an. Un bond avec periodicity de 2 a son YTM coté sur une base semiannual bond basis (le taux périodique semestriel x 2)."],
      ["Comment convertir un YTM avec une periodicity donnée en yield annuel effectif (effective annual yield) ?", "Effective annual yield = (1 + YTM/n)^n − 1, où n est la periodicity. Exemple : YTM 10% avec periodicity 2 → (1.05)^2 − 1 = 10.25%. Avec periodicity 4 → (1.025)^4 − 1 = 10.38%."],
      ["Street convention yield vs true yield ?", "Le street convention yield suppose que les coupons sont payés aux dates théoriques prévues. Le true yield tient compte du fait que les paiements tombant un week-end ou un jour férié sont décalés au jour ouvré suivant ; le true yield est généralement légèrement inférieur au street convention yield."],
      ["Qu'est-ce que le current yield (ou income yield / running yield) ?", "Current yield = coupon annuel en cash / prix du bond. Il ne prend en compte que le revenu d'intérêt annuel, pas les gains/pertes en capital ni le revenu de réinvestissement. Il est identique pour un bond annual-pay et semiannual-pay ayant le même coupon et le même prix."],
      ["Qu'est-ce que le simple yield ?", "Le simple yield prend en compte l'amortissement linéaire (straight-line) d'une décote ou d'une prime sur la durée de vie restante du bond. Formule : (coupon annuel +/− amortissement annuel de la décote/prime) / flat price."],
      ["Yield to call et yield to worst ?", "La yield to call est le YTM calculé en utilisant la date et le prix d'un call spécifique (au lieu de la maturité et du principal). La yield to worst est la plus faible parmi toutes les yields to call possibles et la YTM — c'est le rendement le plus pessimiste que l'investisseur peut espérer."],
      ["Callable bond value = ? (relation avec l'option call)", "Callable bond value = straight (option-free) bond value − valeur de l'option call (car l'émetteur détient l'option, pas l'investisseur, donc l'investisseur est short l'option implicitement)."],
      ["Qu'est-ce que l'option-adjusted yield ?", "Le yield qu'offrirait le bond callable s'il n'était pas callable (option 'retirée'). Comme l'existence de l'option call fait baisser le prix du bond callable, retirer l'option fait baisser le yield par rapport au yield du bond callable — l'option-adjusted yield est donc plus bas que le yield du bond callable."],
      ["Qu'est-ce qu'un yield spread (ou benchmark spread) ?", "La différence entre le yield d'un bond et le yield d'un titre benchmark (souvent un government bond de maturité identique ou proche). Exemple : bond corporate 6.25% vs Treasury 5 ans 3.50% → spread de 275 points de base."],
      ["G-spread vs I-spread ?", "Le G-spread est le spread par rapport à un government bond (yield interpolé si nécessaire). L'I-spread (interpolated spread) est le spread par rapport à des taux de swap (interest rate swaps) de même devise et tenor ; il représente le rendement excédentaire par rapport aux market reference rates (MRR) utilisés dans les swaps."],
      ["Qu'est-ce que le Z-spread (zero-volatility spread) ?", "Le spread constant qui, ajouté à chaque taux spot de la courbe benchmark, égalise la valeur présente des cash flows du bond à son prix de marché. Contrairement au G-spread/I-spread (basés sur un seul YTM benchmark), le Z-spread tient compte de la forme entière de la courbe des taux (term structure)."],
      ["Qu'est-ce que l'option-adjusted spread (OAS) et sa relation avec le Z-spread ?", "L'OAS est le spread à la courbe spot benchmark qu'aurait un bond callable s'il était option-free (option 'retirée'). Pour un bond callable : option value = Z-spread − OAS, donc OAS = Z-spread − option value. L'OAS est donc inférieur au Z-spread pour un bond callable."],
      ["Comment est déterminé le coupon d'un floating-rate note (FRN) ?", "Coupon = market reference rate (MRR, typiquement un taux interbancaire) + quoted margin (QM), un nombre fixe de points de base ajouté (ou soustrait) selon le risque de crédit de l'émetteur relatif au risque de la MRR. L'intérêt est payé 'in arrears' : le coupon du prochain paiement est fixé avec la MRR observée au début de la période."],
      ["Quoted margin (QM) vs discount margin (DM/required margin) d'un FRN ?", "Le QM est la marge fixe réellement payée dans le coupon (MRR + QM). Le DM (ou required margin) est la marge exigée par le marché pour que le FRN se traite à par, compte tenu du risque de crédit actuel de l'émetteur. À l'émission, QM = DM en général (FRN émis à par)."],
      ["Quelle est la relation entre QM, DM et le prix d'un FRN après émission ?", "Si la qualité de crédit de l'émetteur se détériore (DM > QM, le QM devient 'deficient'), le FRN se traite en dessous du pair. Si la qualité de crédit s'améliore (DM < QM), le FRN se traite au-dessus du pair. Si DM = QM (pas de changement), le FRN reste à par à chaque date de reset."],
      ["Comment estimer la valeur d'un FRN à une date de reset ?", "On utilise le MRR courant + QM pour estimer les coupons futurs, et on actualise ces cash flows au taux MRR + DM. Exemple : FRN 5 ans, semiannual, QM = 120bp, MRR courant 3.0%, DM 1.5% → coupon semestriel = (3.0%+1.2%)/2 = 2.1%, taux d'actualisation = (3.0%+1.5%)/2 = 2.25% ; N=10, PMT=2.1, I/Y=2.25, FV=100 → PV = 98.67 (soit 98.67% du pair)."],
      ["Add-on yield vs discount yield pour les instruments du marché monétaire ?", "L'add-on yield est calculé comme un intérêt gagné sur le montant payé/déposé aujourd'hui (comme un taux d'intérêt classique). Le discount yield est calculé comme une décote annualisée par rapport à la valeur faciale reçue à maturité. Les bank CDs, repos et MRR sont cotés en add-on yield ; les T-bills et commercial paper sont cotés en discount yield (base 360 jours)."],
      ["Qu'est-ce que le bond equivalent yield (BEY) ?", "Un add-on yield annualisé sur une base de 365 jours. Formule : BEY = holding period yield (HPY) x 365 / jours jusqu'à maturité. C'est la convention standard permettant de comparer les yields de différents instruments du marché monétaire entre eux, et avec le YTM d'un bond."],
      ["Comment convertir un discount yield coté (base 360 jours) en prix, puis en BEY ?", "Discount effectif = discount yield coté x (jours à maturité/360). Prix = valeur faciale x (1 − discount effectif). HPY = (valeur faciale/prix) − 1. BEY = HPY x 365/jours à maturité. Exemple : T-bill 180 jours, discount coté 2.2% → discount effectif = 1.1%, prix = 989 (pour 1000 de face), HPY = 1000/989 −1 = 1.11%, très proche du discount mais légèrement supérieur."],
      ["Comment comparer le yield d'un instrument monétaire à la YTM d'un bond semiannual-pay ?", "On convertit le holding period return de l'instrument monétaire en yield semestriel effectif équivalent, puis on le double : yield annuel effectif = (1+HPY)^(365/jours) − 1, yield semestriel = (1+yield annuel effectif)^(1/2) − 1, puis x2 pour obtenir l'équivalent semiannual bond basis."],
    ],
  },
  {
    title: "Term Structure of Interest Rates (R55)",
    cards: [
      ["Qu'est-ce qu'un spot rate ?", "Le taux d'actualisation du marché (market discount rate) pour un paiement unique reçu à une date future donnée. On l'observe via les zero-coupon bonds, d'où les synonymes zero-coupon rate ou zero rate."],
      ["Comment calcule-t-on le prix no-arbitrage d'une obligation avec les spot rates ?", "On actualise chaque cash-flow au spot rate correspondant à sa date de paiement, puis on somme les valeurs actuelles. Ce prix est dit 'no-arbitrage' car tout écart avec le prix de marché créerait une opportunité d'arbitrage."],
      ["Exemple : prix d'une obligation 3 ans, coupon annuel 5%, avec spot rates 1 an = 3%, 2 ans = 4%, 3 ans = 5% ?", "Prix = 5/1,03 + 5/1,04² + 105/1,05³ = 100,180. Comme le prix est légèrement supérieur au pair, le YTM (≈4,93%) est légèrement inférieur au coupon de 5%."],
      ["Que représente le par yield (ou par rate) à une maturité donnée ?", "Le coupon rate qu'une obligation hypothétique à cette maturité devrait avoir pour se négocier exactement au pair (prix = 100), étant donné une spot curve spécifique. C'est aussi le YTM de cette obligation hypothétique au pair."],
      ["Comment interpréter le par yield par rapport aux spot rates ?", "Le par yield est une moyenne pondérée des spot rates qui s'appliquent à chaque cash-flow de l'obligation, la pondération la plus forte allant au spot rate de la maturité la plus longue (car c'est là que le remboursement du principal a lieu)."],
      ["Qu'est-ce qu'un forward rate ?", "Un taux d'emprunt/prêt actuel pour un prêt qui sera réalisé à une date future. C'est un taux déjà déterminable aujourd'hui pour une période future."],
      ["Comment lire la notation AyBy d'un forward rate (ex : 2y1y) ?", "Le premier nombre indique dans combien d'années le prêt commence, le second indique la durée du prêt. 2y1y = taux d'un prêt de 1 an dans 2 ans. 1y1y = taux d'un prêt de 1 an dans 1 an. 3y2y = taux d'un prêt de 2 ans dans 3 ans."],
      ["Relation fondamentale entre spot rate à N périodes et forward rates successifs ?", "(1 + S_N)^N = produit des (1 + forward rate) sur chaque période jusqu'à N. Le spot rate à N périodes est la moyenne géométrique des forward rates 1 an successifs qui couvrent cette période."],
      ["Formule reliant S2, S1 et 1y1y ?", "(1 + S2)² = (1 + S1)(1 + 1y1y). Investir 2 ans au spot rate à 2 ans donne le même résultat qu'investir 1 an au spot rate à 1 an puis 1 an de plus au forward rate 1y1y."],
      ["Exemple : calculer le forward rate 1y1y à partir de S1 = 4% et S2 = 8% ?", "(1,08)² = (1,04)(1 + 1y1y) → 1 + 1y1y = 1,1664/1,04 = 1,12154, donc 1y1y = 12,154%."],
      ["Exemple : calculer S3 à partir de S1 = 2%, 1y1y = 3%, 2y1y = 4% ?", "S3 = [(1,02)(1,03)(1,04)]^(1/3) − 1 = 2,997%."],
      ["Exemple : calculer 2y1y à partir de S2 = 8% et S3 = 12% ?", "(1 + S3)³ = (1 + S2)²(1 + 2y1y) → (1,12)³ = (1,08)² × (1 + 2y1y) → 2y1y ≈ 20,45%."],
      ["Astuce d'approximation rapide pour un forward rate à partir de deux spot rates ?", "Utiliser les taux annualisés simples : forward rate ≈ (N × S_N) − (M × S_M) sur la période restante. Ex : S2 = 8%, S3 = 12% → 2y1y ≈ (3×12%) − (2×8%) = 20% (valeur exacte 20,45%). Utile pour vérifier la cohérence d'un résultat au QCM."],
      ["Comment valoriser une obligation directement avec des forward rates (plutôt que des spot rates) ?", "On actualise chaque cash-flow par le produit des (1 + forward rate) successifs jusqu'à la date de ce cash-flow. Les facteurs d'actualisation ainsi obtenus sont équivalents à ceux obtenus avec les spot rates (le résultat final est identique)."],
      ["Qu'est-ce que le spot curve (ou zero curve, ou strip curve) ?", "Le graphique des spot rates en fonction de la maturité, pour un type d'émetteur donné (ex : Treasuries). On l'appelle aussi strip curve car dérivé des stripped Treasuries (zero-coupon)."],
      ["Qu'est-ce que le par curve ?", "Le graphique des par yields (coupon rates faisant que le prix = pair) en fonction de la maturité. Il est construit à partir de la spot curve et évite les distorsions de liquidité/fiscalité des yield curves basées sur des obligations coupon réellement traitées."],
      ["Qu'est-ce que le forward curve ?", "Le graphique des forward rates (généralement des taux 1 an) applicables à des périodes futures successives, typiquement coté sur une base semiannual bond basis."],
      ["Pourquoi utilise-t-on le par curve plutôt qu'une yield curve construite directement à partir des prix d'obligations coupon cotées ?", "Les yield curves de marché sont déformées par l'illiquidité et par des différences de fiscalité entre revenu de coupon et plus/moins-value (obligations traitées au-dessus ou en-dessous du pair). Le par curve, dérivé théoriquement de la spot curve, évite ces distorsions."],
      ["Relation entre forward curve, spot curve et par curve quand la courbe est normale (upward sloping) ?", "Forward rates > spot rates > par yields, à chaque maturité. Le spot rate étant la moyenne géométrique des forward rates, il monte moins vite que le forward curve ; le par yield, moyenne pondérée des spot rates, est légèrement en-dessous du spot rate correspondant."],
      ["Relation entre forward curve, spot curve et par curve quand la courbe est inversée (downward sloping) ?", "Forward rates < spot rates < par yields, à chaque maturité (la relation d'ordre s'inverse par rapport au cas normal)."],
      ["Que se passe-t-il quand les forward rates sont constants (flat forward curve) ?", "Tous les spot rates sont alors égaux entre eux (à cette même valeur constante), et donc tous les par yields aussi : on obtient une flat yield curve sur toutes les maturités."],
      ["Quelle est une explication possible d'une courbe des taux inversée ?", "Les investisseurs anticipent une baisse future des taux d'intérêt."],
    ],
  },
  {
    title: "Interest Rate Risk: Duration & Convexity (R56–R59)",
    cards: [
      ["Quelles sont les trois sources de rendement d'un investissement obligataire (fixed-rate bond) ?", "1) Les paiements de coupon et de principal. 2) Les intérêts gagnés sur le réinvestissement des coupons pendant la période de détention. 3) Le gain ou la perte en capital si l'obligation est vendue avant l'échéance."],
      ["Qu'est-ce que le price risk (risque de prix) en obligataire ?", "L'incertitude sur le prix de vente futur d'une obligation, due à l'incertitude sur le YTM de marché au moment de la vente. Il domine sur un horizon d'investissement court."],
      ["Qu'est-ce que le reinvestment risk (risque de réinvestissement) ?", "L'incertitude sur le revenu total tiré du réinvestissement des coupons, due à l'incertitude sur les taux de réinvestissement futurs. Il domine sur un horizon d'investissement long."],
      ["Un investisseur qui détient une obligation à taux fixe jusqu'à maturité, sans changement de YTM, réalise quel rendement ?", "Un rendement annualisé égal exactement au YTM à l'achat (en supposant que les coupons sont réinvestis à ce même YTM)."],
      ["Si le YTM (donc le taux de réinvestissement) augmente après l'achat mais avant le 1er coupon, et que l'obligation est détenue jusqu'à maturité, quel est l'effet sur le rendement réalisé ?", "Le rendement réalisé sera supérieur au YTM à l'achat, car le revenu de réinvestissement des coupons augmente."],
      ["Qu'est-ce que la carrying value d'une obligation ?", "Le prix de l'obligation sur sa trajectoire de prix à rendement constant (constant-yield price trajectory), c'est-à-dire sa valeur calculée avec le YTM d'origine à une date ultérieure. Sert de référence pour mesurer un gain/perte en capital lors d'une vente avant maturité."],
      ["Comment mesure-t-on un gain ou une perte en capital lors de la vente d'une obligation avant maturité ?", "En comparant le prix de vente à la carrying value (pas au prix d'achat initial) : gain/perte = prix de vente − carrying value."],
      ["Qu'est-ce que le Macaulay duration (MacDur) ?", "La moyenne pondérée du nombre d'années jusqu'à réception de chaque cash-flow promis par l'obligation, les poids étant la valeur actuelle de chaque cash-flow en proportion du prix plein (full price) de l'obligation."],
      ["Calculer le Macaulay duration d'une obligation 5 ans, coupon annuel 11 %, prix 86,59, YTM 15 % ?", "Poids des VA de chaque cash-flow (coupon 1 à 5, + principal en année 5) : 0,1105 ; 0,0961 ; 0,0835 ; 0,0726 ; 0,6373. MacDur = 0,1105(1)+0,0961(2)+0,0835(3)+0,0726(4)+0,6373(5) = 4,03 ans."],
      ["Comment interpréter le Macaulay duration en termes d'horizon d'investissement ?", "C'est l'horizon d'investissement pour lequel le risque de prix et le risque de réinvestissement se compensent exactement : à cet horizon, l'investisseur réalise le YTM d'achat quel que soit le changement immédiat de taux."],
      ["Formule du duration gap ?", "Duration gap = Macaulay duration − horizon d'investissement."],
      ["Qu'est-ce qu'un duration gap positif et quel risque expose-t-il ?", "Le Macaulay duration est supérieur à l'horizon d'investissement ; l'investisseur est exposé au risque de prix (price risk) en cas de hausse des taux."],
      ["Qu'est-ce qu'un duration gap négatif et quel risque expose-t-il ?", "Le Macaulay duration est inférieur à l'horizon d'investissement ; l'investisseur est exposé au risque de réinvestissement (reinvestment risk) en cas de baisse des taux."],
      ["Un investisseur avec un horizon de 6 ans achète une obligation de Macaulay duration 7 ans : quel type de risque domine ?", "Duration gap positif (7−6=+1) : le risque de prix domine, l'investisseur est vulnérable à une hausse des taux avant son horizon de sortie."],
      ["Formule du modified duration (ModDur) à partir du Macaulay duration ?", "ModDur = MacDur / (1 + YTM périodique). Pour une obligation semestrielle cotée sur base semestrielle : ModDurSEMI = MacDurSEMI / (1 + YTM/2)."],
      ["Un bond 5 ans, coupon annuel 11 %, MacDur = 4,03, YTM = 15 % : quel est son ModDur ?", "ModDur = 4,03 / 1,15 = 3,50."],
      ["Que mesure le modified duration (ModDur) ?", "Une estimation linéaire de la variation en pourcentage du prix plein d'une obligation pour une variation de 1 % de son YTM : variation approximative du prix (%) = −ModDur × ΔYTM."],
      ["Formule du modified duration approximé (approximate ModDur) ?", "ModDur approx = (V₋ − V₊) / (2 × V₀ × ΔYTM), où V₋ = prix si le YTM baisse, V₊ = prix si le YTM monte, V₀ = prix actuel."],
      ["Exemple numérique : bond 5 ans coupon 11 %, prix 86,59 (YTM 15 %). Si YTM +50bp → prix 85,092 ; si YTM −50bp → prix 88,127. Quel est le ModDur approximé ?", "ModDur approx = (88,127 − 85,092) / (2 × 86,59 × 0,005) = 3,035 / 0,8659 ≈ 3,50."],
      ["Formule du money duration (dollar duration) ?", "Money duration = ModDur annuel × prix plein (full price) de la position obligataire, exprimé en unités monétaires."],
      ["Exemple : obligation nominal 2 000 000 $, ModDur = 7,42, prix plein 101,32. Quel est le money duration et l'impact d'une hausse de 25 bp du YTM ?", "Money duration = 7,42 × 2 000 000 $ × 101,32 % = 15 035 888 $. Impact d'une hausse de 25 bp : 15 035 888 $ × 0,0025 = 37 589,72 $ de baisse de valeur."],
      ["Qu'est-ce que le PVBP (price value of a basis point) ?", "La variation en unités monétaires du prix plein d'une obligation pour une variation de son YTM de 1 point de base (0,01 %). PVBP = (V₋ − V₊)/2 par tranche de valeur nominale, ou money duration × 0,0001."],
      ["Exemple : obligation 20 ans, coupon annuel 6 %, prix 101,39, nominal 1 000 000 $. Quel est le PVBP ?", "YTM ≈ 5,88 %. Avec YTM 5,89 % → V₊ = 101,273 ; avec YTM 5,87 % → V₋ = 101,507. PVBP (pour 100 de nominal) = (101,507−101,273)/2 = 0,117. Pour 1 000 000 $ de nominal : 0,117 % × 1 000 000 $ = 1 170 $ par point de base."],
      ["Comment la maturité affecte-t-elle le risque de taux (interest rate risk) d'une obligation, toutes choses égales par ailleurs ?", "Plus la maturité est longue, plus le risque de taux (duration) est généralement élevé, car les paiements lointains sont plus sensibles aux variations du taux d'actualisation. Exception : pour certaines obligations à fort discount et maturité très longue, la duration peut diminuer avec la maturité."],
      ["Comment le taux de coupon affecte-t-il le risque de taux d'une obligation ?", "Un coupon plus élevé diminue le risque de taux (duration plus faible), car une plus grande part de la valeur est reçue plus tôt. Un zéro-coupon a, à maturité et YTM égaux, une duration plus élevée qu'une obligation à coupon."],
      ["Comment le niveau du YTM affecte-t-il le risque de taux d'une obligation ?", "Une hausse du YTM diminue le risque de taux (duration plus faible), et une baisse du YTM l'augmente, du fait de la convexité de la relation prix-rendement (la pente de la courbe prix-yield est plus forte à bas rendements)."],
      ["Quel est le Macaulay duration approximatif d'un floating-rate note (FRN) ?", "Le temps restant jusqu'à la prochaine date de reset du coupon, ce qui rend sa duration — et donc son risque de prix — très faible comparée à une obligation à taux fixe de même maturité."],
      ["Entre une obligation zéro-coupon et une obligation à coupon, à maturité et YTM identiques, laquelle a la plus forte sensibilité aux taux ?", "Le zéro-coupon, car son seul cash-flow est reçu à maturité (son Macaulay duration est égal à sa maturité), alors qu'une obligation à coupon reçoit des flux plus tôt, réduisant sa duration."],
      ["Quel est l'effet d'une clause de rappel (call feature) sur la duration d'une obligation ?", "Elle réduit la duration de l'obligation (et limite son potentiel d'appréciation en capital), car le risque de remboursement anticipé est intégré dans le calcul."],
      ["Convexité — définition ?", "Mesure de la courbure de la relation prix-rendement d'une obligation. Plus la convexité est élevée, plus l'approximation du changement de prix par la seule duration modifiée est mauvaise pour de grandes variations de taux."],
      ["Convexité approximative — formule ?", "Convexité approximative = (V₋ + V₊ − 2V₀) / [(ΔYTM)² × V₀], où V₋ = prix si le YTM baisse de ΔYTM, V₊ = prix si le YTM monte de ΔYTM, V₀ = prix actuel."],
      ["Exemple numérique — convexité approximative ?", "Obligation à 86,59138 (YTM 15%). Si YTM +50 pb → prix 85,09217 ; si YTM −50 pb → prix 88,12721. Convexité ≈ (88,12721 + 85,09217 − 2×86,59138) / (86,59138 × 0,005²) ≈ 16,9."],
      ["Approximation du changement de prix avec duration + convexité — formule ?", "%Δ prix plein = −duration modifiée annuelle × ΔYTM + ½ × convexité annuelle × (ΔYTM)²."],
      ["Exemple numérique — approximation prix avec duration et convexité ?", "Obligation à 86,59138, duration modifiée 3,50, convexité 16,9. Pour ΔYTM = −0,50% : effet duration = 1,75% ; effet convexité = ½×16,9×(0,005)² = 0,0211%. Variation totale ≈ 1,7711% → nouveau prix ≈ 88,125."],
      ["Convexité d'un flux de trésorerie unique à la période t — formule ?", "Convexité(t) = [t × (t+1)] / (1+r)², où r est le rendement périodique (YTM / périodicité)."],
      ["Comment annualiser la convexité d'une obligation à coupons non annuels ?", "On divise la convexité calculée par le carré de la périodicité (ex. diviser par 2² = 4 pour un coupon semestriel)."],
      ["Money duration et money convexity — définitions ?", "Money duration = duration modifiée annuelle × prix plein de la position. Money convexity = convexité annuelle × prix plein de la position ; ce sont les versions exprimées en unités monétaires (et non en %)."],
      ["Changement de prix plein via money duration et money convexity — formule ?", "Changement de prix plein = −(MoneyDur × ΔYTM) + ½ × MoneyCon × (ΔYTM)²."],
      ["Quels facteurs augmentent la convexité d'une obligation ?", "Une maturité plus longue, un coupon plus faible, un YTM plus faible, et des cash-flows plus dispersés dans le temps (à duration égale) augmentent la convexité."],
      ["Duration de portefeuille — deux méthodes de calcul ?", "1) Calculer une duration/convexité unique sur les cash-flows agrégés du portefeuille (théoriquement correcte). 2) Moyenne pondérée des durations de chaque obligation par leur poids dans le portefeuille (plus simple, utilisée en pratique)."],
      ["Formule de la duration de portefeuille (méthode pondérée) ?", "Duration du portefeuille = W₁D₁ + W₂D₂ + ... + WₙDₙ, où Wᵢ = prix plein de l'obligation i / valeur totale du portefeuille, Dᵢ = duration de l'obligation i."],
      ["Limite principale de la duration de portefeuille calculée par moyenne pondérée ?", "Elle suppose que le YTM de chaque obligation (quelle que soit sa maturité) varie du même montant, c'est-à-dire un déplacement parallèle de la courbe des taux ; ce n'est valable que sous cette hypothèse."],
      ["Pourquoi l'ajustement de convexité est-il identique pour une hausse ou une baisse de rendement ?", "Parce que le terme de convexité dépend de (ΔYTM)², qui est toujours positif quel que soit le signe de la variation de rendement ; l'ajustement s'ajoute toujours au terme de duration pour une obligation à convexité positive."],
      ["Effective duration — pourquoi l'utiliser pour les obligations à option intégrée ?", "Parce que ces obligations (callable, putable, MBS) ont des cash-flows incertains et n'ont pas de YTM unique bien défini ; on mesure donc la sensibilité du prix à des variations de la courbe de référence (ΔCurve) plutôt qu'à ΔYTM."],
      ["Effective duration — formule ?", "Effective duration = (V₋ − V₊) / (2 × V₀ × ΔCurve), où V₋ et V₊ sont obtenus en repricant l'obligation après un déplacement de la courbe de référence (benchmark), et non de son propre YTM."],
      ["Effective convexity — formule ?", "Effective convexity = (V₋ + V₊ − 2V₀) / [(ΔCurve)² × V₀], calculée à partir de variations de la courbe de référence plutôt que du YTM propre de l'obligation."],
      ["Changement de prix estimé avec effective duration et convexity — formule ?", "Changement de prix plein = −EffDur × ΔCurve + ½ × EffCon × (ΔCurve)²."],
      ["Convexité négative — quand apparaît-elle et pourquoi ?", "Sur une obligation callable, à bas rendements, l'option de rachat prend de la valeur et plafonne la hausse du prix (le prix approche le prix de rachat). La hausse de prix pour une baisse de rendement est alors plus petite que la baisse de prix pour une hausse équivalente — d'où une convexité négative."],
      ["Une obligation putable peut-elle avoir une convexité négative ?", "Non, une obligation putable a toujours une convexité positive : à rendements élevés, la valeur de l'option de vente limite la baisse du prix, ce qui fait que la duration du putable est inférieure à celle d'une obligation équivalente sans option, mais la convexité reste positive."],
      ["Pourquoi ModDur et EffDur diffèrent-elles légèrement même pour une obligation sans option ?", "Parce qu'un déplacement de la courbe des taux par (par yield curve) induit un déplacement non parallèle de la courbe des taux zéro-coupon (spot) sous-jacente ; le rendement de l'obligation risquée ne bouge donc pas exactement du même montant que le déplacement initial de la courbe de référence, sauf si la courbe des taux est plate."],
      ["Key rate duration (duration partielle) — définition ?", "Sensibilité de la valeur d'une obligation ou d'un portefeuille à une variation du rendement de référence pour une maturité spécifique, toutes les autres maturités étant maintenues constantes. La somme des key rate durations égale la duration effective totale."],
      ["À quoi sert principalement la key rate duration ?", "À mesurer le shaping risk, c'est-à-dire l'effet d'un déplacement non parallèle (changement de forme) de la courbe des taux sur un portefeuille obligataire, en appliquant à chaque maturité sa propre variation de rendement."],
      ["Exemple numérique — impact d'un déplacement non parallèle via key rate duration ?", "Portefeuille égal entre un zéro-coupon 5 ans (rdt 5%) et un 10 ans (rdt 6%). Key rate duration 5 ans = 4,762×0,5 = 2,381 ; impact d'une hausse de 50 pb du taux 5 ans = −2,381×0,005 = −1,19%. Key rate duration 10 ans = 9,434×0,5 = 4,717 ; impact d'une baisse de 25 pb du taux 10 ans = +1,18%. Variation totale du portefeuille ≈ −0,01% (quasi inchangée)."],
      ["Duration analytique vs duration empirique — différence ?", "La duration analytique (Macaulay, modifiée, effective) repose sur une analyse mathématique du prix. La duration empirique estime la sensibilité du prix à partir de la relation historique observée entre variations de rendement de référence et variations de prix de l'obligation."],
      ["Quand la duration empirique est-elle préférable à la duration analytique ?", "Quand l'hypothèse que le spread de crédit reste inchangé face à un déplacement du taux de référence n'est pas justifiée, par exemple lors d'un flight to quality où les spreads de crédit s'écartent au moment même où les taux sans risque baissent (les obligations corporate montent alors moins, voire baissent)."],
      ["Pour quel type de portefeuille duration empirique et analytique sont-elles proches ?", "Pour un portefeuille composé essentiellement d'obligations gouvernementales, où l'hypothèse de spread de crédit constant est peu problématique."],
    ],
  },
  {
    title: "Credit Analysis (R60–R62)",
    cards: [
      ["Credit risk — définition et ses deux composantes principales ?", "Risque de pertes pour un investisseur obligataire dû à un défaut de l'emprunteur (défaut de paiement des intérêts ou du principal). Se mesure via l'expected loss = probabilité de défaut (PD) × loss given default (LGD)."],
      ["Expected loss — formule ?", "Expected loss = probability of default (PD) × loss given default (LGD%), où LGD% = expected exposure × (1 − recovery rate)."],
      ["Facteurs bottom-up de l'analyse crédit (les Cs) ?", "Capacity (capacité de l'emprunteur à honorer sa dette), Capital (autres ressources disponibles réduisant la dépendance à la dette), Collateral (valeur des actifs donnés en garantie), Covenants (clauses légales de l'émission), Character (intégrité et engagement du management/emprunteur)."],
      ["Facteurs top-down de l'analyse crédit ?", "Conditions (environnement économique général), Country (environnement géopolitique, légal, politique), Currency (fluctuations de change affectant le service d'une dette libellée en devise étrangère)."],
      ["Credit spread estimé — formule d'approximation ?", "Credit spread ≈ probabilité de défaut (PD) × loss given default en % (LGD%)."],
      ["Exemple numérique — évaluer si un spread de crédit compense correctement le risque ?", "Émetteur avec PD = 3%, recovery rate = 75%, obligation à 4% de coupon cotée au pair, taux gouvernemental équivalent = 2,5%. Spread réel = 4% − 2,5% = 1,5%. Spread estimé = 0,03 × (1 − 0,75) = 0,75%. Le spread réel (1,5%) étant le double du spread estimé (0,75%), l'investisseur est plus que compensé pour le risque de crédit."],
      ["Investment grade vs high yield — seuils de notation ?", "Investment grade : notation Baa3/BBB− ou supérieure. Non-investment grade (high yield ou junk) : Ba1/BB+ ou inférieure. Une obligation en défaut est notée D (S&P, Fitch) ou classée dans la catégorie C la plus basse (Moody's)."],
      ["Pourquoi les obligations high yield peuvent-elles avoir un LGD plus faible que des obligations investment grade non sécurisées ?", "Les émetteurs high yield émettent souvent de la dette sécurisée avec une source secondaire de remboursement en cas de défaut, réduisant le LGD ; le risque principal pour la dette investment grade non sécurisée est plutôt une hausse de la probabilité de défaut liée à une détérioration financière."],
      ["Limites des agences de notation (3 principales) ?", "1) Les ratings sont en retard par rapport aux prix de marché (credit ratings lag market pricing). 2) Certains risques sont difficiles à anticiper (litiges, catastrophes naturelles, rachats d'actions financés par dette). 3) Les agences peuvent se tromper (ex. subprime avant 2008), et des ratings différents (split ratings) peuvent survenir entre agences."],
      ["Credit migration risk — définition ?", "Risque qu'une dégradation de la notation de crédit (downgrade) diminue la valeur de l'obligation et potentiellement déclenche d'autres clauses contractuelles."],
      ["Comment évolue le spread de crédit sur le cycle économique ?", "En période d'expansion et de forte croissance, la probabilité de défaut diminue et les spreads se resserrent (narrow) ; en récession, la probabilité de défaut augmente et les spreads s'élargissent (widen). Les spreads high yield sont plus volatils que les spreads investment grade."],
      ["Pourquoi la courbe de spread de crédit high yield peut-elle s'inverser en récession ?", "Parce que la probabilité de défaut à court terme augmente fortement pendant les contractions économiques, ce qui peut faire remonter davantage les spreads courts que les spreads longs, inversant la courbe (downward sloping)."],
      ["Flight to quality — définition ?", "Phénomène où, en période de crise, les investisseurs vendent massivement les actifs risqués pour acheter des actifs sûrs, provoquant un écartement marqué des spreads high yield et une hausse du risque de liquidité de marché pour la dette risquée."],
      ["Comment décomposer le yield spread d'une obligation en spread de liquidité et spread de crédit ?", "Le spread de liquidité = rendement au prix bid − rendement au prix offer (ask). Le reste du yield spread total (par rapport au benchmark) est attribué au risque de crédit."],
      ["Exemple numérique — décomposition du yield spread ?", "Obligation 10 ans, coupon annuel 5%, bid/offer 99,5/100,5, benchmark 10 ans à 3%. Prix mid = 100 → yield spread total = 5% − 3% = 2%. Yield au bid = 5,065% ; yield à l'offer = 4,935%. Spread de liquidité = 5,065% − 4,935% = 0,13%. Spread de crédit = 2% − 0,13% = 1,87%."],
      ["Impact d'un changement de spread de crédit sur le prix — formule ?", "Changement de prix plein = −duration modifiée × ΔSpread + ½ × convexité × (ΔSpread)², en remplaçant ΔYTM par ΔSpread dans la formule habituelle duration-convexité."],
      ["Le liquidity risk de marché dépend de quels facteurs ?", "Il est plus élevé pour les obligations peu échangées, les émetteurs de moindre qualité de crédit, et les émetteurs ayant peu de dette en circulation sur le marché ; il se traduit par des bid-offer spreads plus larges."],
      ["Pourquoi les spreads augmentent-ils généralement avec la maturité ?", "Parce que la probabilité de défaut augmente sur des horizons plus longs, ce qui donne des courbes de spread de crédit typiquement croissantes avec la maturité (upward sloping credit curves)."],
      ["Quels sont les cinq facteurs qualitatifs de solvabilité d'un émetteur souverain ?", "Institutions and policy factors (stabilité politique et volonté de rembourser), fiscal flexibility factors (capacité à ajuster impôts/dépenses), monetary effectiveness factors (crédibilité de la banque centrale), economic flexibility factors (croissance, diversité économique), et external status factors (statut de la devise, reserve currency)."],
      ["Quels sont les trois facteurs quantitatifs de solvabilité d'un émetteur souverain ?", "Fiscal strength (ratios dette/PIB et intérêts/PIB faibles), economic growth and stability (forte croissance du PIB réel, faible volatilité), et external stability (réserves de change élevées relativement à la dette externe)."],
      ["Pourquoi la willingness to pay d'un gouvernement souverain est-elle un enjeu spécifique (contrairement aux émetteurs corporate) ?", "Parce que les détenteurs d'obligations souveraines n'ont généralement aucun recours légal si le gouvernement refuse de payer (sovereign immunity) ; il faut donc évaluer sa volonté de rembourser, pas seulement sa capacité."],
      ["Qu'est-ce que la sovereign immunity ?", "Le principe selon lequel un gouvernement national ne peut pas être poursuivi en justice par ses créanciers obligataires en cas de refus de paiement, contrairement à un émetteur corporate."],
      ["Pourquoi un émetteur souverain a-t-il structurellement moins de risque de crédit qu'une municipalité, à qualité de crédit apparente égale ?", "Un gouvernement souverain qui emprunte dans sa propre devise peut imprimer de la monnaie pour rembourser sa dette, alors qu'une municipalité n'a pas ce pouvoir monétaire."],
      ["Qu'est-ce qu'une reserve currency et quel avantage donne-t-elle à son émetteur souverain ?", "Une devise largement détenue comme réserve de change par les banques centrales du monde. Son émetteur peut plus facilement placer de la dette auprès d'investisseurs étrangers dans sa propre devise et soutenir des déficits/niveaux de dette plus élevés."],
      ["Quels sont les principaux émetteurs de non-sovereign government debt ?", "Les agences (rôle gouvernemental spécifique, soutien implicite), les banques/institutions de financement du secteur public, les émetteurs supranationaux (ex. Banque mondiale), et les gouvernements régionaux (obligations municipales)."],
      ["Qu'est-ce qu'un general obligation (GO) bond ?", "Une obligation non sécurisée émise par un gouvernement régional/local, adossée à la pleine foi et au crédit (full faith and credit) de l'émetteur, c'est-à-dire à son pouvoir de taxation."],
      ["Qu'est-ce qu'un revenue bond et en quoi diffère-t-il d'un GO bond en termes de risque ?", "Une obligation émise pour financer un projet spécifique (aéroport, pont à péage, hôpital), remboursée uniquement par les revenus de ce projet. Elle a généralement un risque de crédit et un rendement plus élevés qu'un GO bond, car elle n'est pas soutenue par le pouvoir de taxation général."],
      ["Quel ratio est utilisé pour analyser un revenue bond, et à quoi ressemble cette analyse ?", "Le debt-service coverage ratio (revenus après coûts d'exploitation, rapportés aux intérêts et principal dus). L'analyse ressemble à celle des obligations corporate, en se concentrant sur les cash flows générés par le projet."],
      ["Pourquoi dit-on que les GO bonds sont effectivement financés par les contribuables ?", "Parce qu'ils sont soutenus par le pouvoir de taxation de l'émetteur, donc en cas de besoin le remboursement provient des impôts payés par les contribuables individuels et entreprises, contrairement aux revenue bonds qui dépendent des revenus d'un projet précis."],
      ["Comparés aux obligations corporate de même notation, pourquoi les GO bonds municipaux ont-ils généralement moins de risque de crédit ?", "Parce que les taux de défaut historiques des obligations municipales sont typiquement plus faibles que ceux des obligations corporate de même notation."],
      ["Qu'est-ce qu'une municipal bond guarantee ?", "Une forme d'assurance fournie par un tiers autre que l'émetteur, qui améliore la liquidité secondaire de l'obligation et réduit généralement le rendement exigé."],
      ["Quels sont les quatre facteurs qualitatifs utilisés pour évaluer un émetteur corporate ?", "Le business model (stabilité et prévisibilité des cash flows), la concurrence dans l'industrie (moins de concurrence = favorable), le business risk (risque de déviations imprévues des revenus/marges), et la corporate governance (traitement équitable des créanciers, covenants, politiques comptables)."],
      ["Quelle est la différence entre l'approche top-down et l'approche bottom-up en analyse quantitative du crédit corporate ?", "Le top-down s'appuie sur des facteurs macroéconomiques, la taille de l'industrie, la part de marché potentielle et le risque d'événements externes. Le bottom-up s'appuie sur des facteurs propres à l'émetteur (revenus, coûts, bilan, cash flows futurs). L'approche hybrid combine les deux."],
      ["Comment calcule-t-on le FFO (funds from operations) ?", "FFO = net income from continuing operations + dépréciation, amortissement, impôts différés et autres éléments non monétaires. Le FFO ressemble au CFO mais exclut les variations du besoin en fonds de roulement."],
      ["Comment calcule-t-on le free cash flow (FCF) en analyse crédit corporate ?", "FCF = CFO – dépenses d'investissement (capex) + charges d'intérêts nettes. Il représente le cash flow discrétionnaire disponible pour les pourvoyeurs de financement une fois les obligations de l'entreprise remplies."],
      ["Comment calcule-t-on le retained cash flow (RCF) ?", "RCF = operating cash flow (CFO, FFO ou une autre mesure) moins les dividendes versés."],
      ["Quels sont les quatre ratios clés d'analyse crédit corporate et leur formule ?", "EBIT margin = EBIT / revenue (profitabilité) ; EBIT to interest expense = EBIT / charges d'intérêts (coverage) ; debt to EBITDA = dette / EBITDA (leverage) ; RCF to net debt = RCF / (dette – cash et titres négociables) (leverage)."],
      ["Pour chacun des quatre ratios clés de crédit corporate, un ratio plus élevé indique-t-il une meilleure ou moins bonne qualité de crédit ?", "EBIT margin : plus élevé = meilleure qualité. EBIT/interest : plus élevé = meilleure qualité. Debt/EBITDA : plus élevé = moins bonne qualité (levier plus fort). RCF/net debt : plus élevé = meilleure qualité."],
      ["Quelle est la principale limite de l'EBITDA comme mesure en analyse crédit ?", "L'EBITDA n'ajuste pas pour les dépenses d'investissement (capex) et les variations du besoin en fonds de roulement, qui sont pourtant des utilisations nécessaires de fonds pour une entreprise en activité, indisponibles pour les créanciers."],
      ["Quel est l'ordre complet de seniority ranking (priorité de créances) d'une entreprise, du plus senior au moins senior ?", "1) First lien/mortgage, 2) senior secured (second lien), 3) junior secured, 4) senior unsecured, 5) senior subordinated, 6) subordinated, 7) junior subordinated."],
      ["Que signifie pari passu ?", "Toutes les dettes de même catégorie de seniority ont la même priorité de créances et sont traitées de manière identique en cas de faillite."],
      ["Qu'est-ce que la structural subordination ?", "Dans une structure de holding, si la dette d'une filiale l'empêche de transférer du cash vers la maison mère avant d'être remboursée, la dette de la maison mère est effectivement subordonnée à celle de la filiale vis-à-vis des cash flows de cette filiale, même si elle n'est pas juridiquement subordonnée."],
      ["Quelle est la différence entre un issuer credit rating (corporate family rating, CFR) et un issue credit rating (corporate credit rating, CCR) ?", "Le CFR reflète la solvabilité globale de l'émetteur, généralement basée sur sa dette senior unsecured. Le CCR est la notation spécifique d'une émission particulière, qui peut différer du CFR selon la seniority et les covenants de cette émission."],
      ["Qu'est-ce que le notching ?", "L'attribution d'une notation d'émission (issue rating) supérieure ou inférieure à la notation de l'émetteur (issuer rating), en fonction de facteurs comme la seniority, les covenants ou la structural subordination."],
      ["Pourquoi le notching est-il moins fréquent pour les émetteurs très bien notés que pour les émetteurs peu notés ?", "Pour les émetteurs de haute qualité, les différences de taux de recouvrement attendus entre leurs différentes émissions sont peu significatives (faible probabilité de défaut). Pour les émetteurs de moindre qualité, ces différences deviennent plus importantes, rendant le notching plus probable."],
      ["Quelle est la différence entre les covenants typiques d'un émetteur investment-grade unsecured et ceux d'un émetteur high-yield secured ?", "Les émetteurs investment-grade ont surtout des covenants affirmatifs (ce que l'émetteur doit faire, ex. payer ses impôts). Les émetteurs high-yield ont en plus des covenants négatifs (ce que l'émetteur ne peut pas faire, ex. interdiction d'émettre de la dette supplémentaire ou de verser des dividendes)."],
      ["Pourquoi les investisseurs en dette secured high-yield se soucient-ils à la fois de la probability of default (POD) et de la loss given default (LGD), contrairement aux investisseurs investment-grade unsecured ?", "Parce que la dette high-yield a une probabilité de défaut plus élevée, rendant la sévérité de la perte en cas de défaut (LGD) également pertinente, alors que les investisseurs investment-grade se concentrent surtout sur l'augmentation de la POD."],
      ["Un émetteur finance un rachat d'actions (stock buyback) en émettant de la dette high-yield : quel est l'impact crédit le plus probable ?", "Négatif : cela augmente le levier et le risque pour les créanciers existants tout en favorisant les actionnaires (réduction de la dilution), ce qui peut conduire à une dégradation de la notation."],
    ],
  },
  {
    title: "Securitization, ABS & MBS (R63–R65)",
    cards: [
      ["Quelles sont les trois étapes du processus de titrisation ?", "Étape 1 : un originateur (banque ou entreprise) crée un pool d'actifs de dette. Étape 2 : ce pool (le collateral) est vendu à une special purpose entity (SPE). Étape 3 : la SPE émet des ABS adossés aux cash flows du collateral, achetés par les investisseurs."],
      ["Quels sont les rôles des trois parties principales d'une titrisation ?", "Le seller/depositor origine les actifs et les vend à la SPE. L'issuer/trust (la SPE) achète les actifs et émet les ABS aux investisseurs. Le servicer collecte les paiements, envoie les avis de retard et gère les défauts ; il peut être la même entité que le seller ou non."],
      ["Qu'est-ce que la bankruptcy remoteness d'une SPE et pourquoi est-elle importante ?", "Une SPE est une entité juridique distincte de l'originateur ; une dégradation financière de l'originateur n'affecte donc pas les cash flows du collateral détenu par la SPE. Cela permet aux ABS d'obtenir une notation de crédit supérieure à celle de l'originateur."],
      ["Quels sont les principaux bénéfices de la titrisation pour l'originateur (issuer) ?", "Augmentation de l'activité (les fonds reçus permettent de prêter davantage), amélioration de la profitabilité (frais d'origination et de vente), réduction des réserves de capital réglementaire (retrait du risque de crédit du bilan), et amélioration de la liquidité (vente de prêts illiquides)."],
      ["Quels sont les principaux bénéfices de la titrisation pour les investisseurs en ABS ?", "Un risque/rendement adapté à leurs besoins (tailored risk and return), un accès à des pools de collateral sans expertise spécialisée nécessaire, et une meilleure liquidité que les actifs sous-jacents détenus directement."],
      ["Quels sont les deux risques principaux pour les investisseurs en ABS ?", "L'incertitude des cash flows du collateral (taille et timing, ex. prépaiements imprévus), et le risque de crédit du collateral qui est transféré aux investisseurs."],
      ["Quel est le rôle du disinterested trustee dans une titrisation ?", "Il supervise la conservation du collateral et des cash flows dus aux investisseurs en ABS, et leur fournit de l'information ; il est dit disinterested car il n'a aucun autre intérêt dans la structure."],
      ["Quels sont les deux documents clés d'une titrisation en dehors de l'indenture obligataire, et que décrivent-ils ?", "Le purchase agreement décrit les conditions d'achat du collateral par la SPE auprès du seller. Le prospectus décrit les conditions des frais versés aux servicers/administrateurs et la façon dont les cash flows du collateral sont distribués aux investisseurs."],
      ["Pourquoi les cash flows totaux versés aux investisseurs en ABS sont-ils inférieurs aux cash flows totaux du pool d'actifs sous-jacent ?", "Parce qu'une partie des cash flows du pool sert à payer les frais du servicer avant que le reste ne soit distribué aux investisseurs en ABS."],
      ["Pourquoi la titrisation est-elle considérée bénéfique pour les économies et les marchés financiers dans leur ensemble ?", "Elle réduit le risque de liquidité (les ABS se négocient plus facilement que le collateral sous-jacent), améliore l'efficience de marché (prix plus proches de l'équilibre), et réduit les coûts de financement et le levier des originateurs."],
      ["Quels sont les deux risques systémiques que la titrisation peut créer pour le système financier ?", "L'incertitude des cash flows (timing et taille) transmise aux investisseurs, et l'accumulation systémique de risque de crédit dans les ABS, comme illustré par la crise financière de 2007-2009."],
      ["Qu'est-ce qu'un covered bond et en quoi diffère-t-il d'un ABS ?", "Dette senior émise par une institution financière, adossée à un cover pool (souvent des mortgages) qui reste au bilan de l'émetteur — contrairement à un ABS, aucune SPE n'est créée."],
      ["Pourquoi les covered bonds offrent-ils un 'dual recourse' aux investisseurs ?", "En cas de défaut de l'émetteur, les investisseurs ont une créance à la fois sur le cover pool et sur les autres actifs non nantis (unencumbered assets) de l'émetteur."],
      ["Pourquoi les covered bonds offrent-ils généralement des yields plus bas que des ABS comparables ?", "Grâce au dual recourse et aux credit enhancements (LTV plafonné, overcollateralization), leur qualité de crédit est plus élevée que celle d'un ABS équivalent."],
      ["Différence entre un hard-bullet et un soft-bullet covered bond ?", "Le hard-bullet est en défaut dès qu'un paiement prévu est manqué ; le soft-bullet peut reporter la maturité prévue jusqu'à un an avant d'être considéré en défaut."],
      ["Qu'est-ce qu'un conditional pass-through covered bond ?", "À la maturité, s'il reste des paiements dus, le covered bond se convertit en obligation pass-through : les recouvrements ultérieurs sur le cover pool sont reversés aux investisseurs."],
      ["Quelles sont les 3 formes de credit enhancement interne d'un ABS ?", "Overcollateralization, excess spread, et subordination (credit tranching)."],
      ["Qu'est-ce que l'overcollateralization ?", "La valeur du collatéral excède la valeur faciale de l'ABS émis, créant une marge de sécurité avant que les investisseurs subissent des pertes de crédit."],
      ["Qu'est-ce que l'excess spread dans un ABS ?", "Le revenu généré par le collatéral au-delà du coupon promis aux investisseurs de l'ABS ; ce surplus constitue une réserve absorbant les pertes de crédit."],
      ["L'overcollateralization est-elle nécessaire pour générer de l'excess spread ?", "Non : l'excess spread dépend surtout du niveau des taux d'intérêt et n'est pas conditionné par l'overcollateralization."],
      ["Dans une structure senior/subordonnée (waterfall), quelle tranche absorbe les pertes en premier ?", "La tranche la plus junior (equity tranche), jusqu'à hauteur de sa valeur de principal ; les pertes excédentaires remontent ensuite aux tranches subordonnées puis senior."],
      ["Sous une structure waterfall, comment sont distribués les remboursements de principal entre tranches ?", "Pas au pro rata : la tranche senior reçoit en priorité l'intégralité des remboursements de principal avant les tranches subordonnées."],
      ["Comparées aux tranches junior, les tranches senior d'un ABS portent-elles plus ou moins de prepayment risk ?", "Moins de prepayment risk, car elles reçoivent les remboursements de principal en priorité sous la structure waterfall."],
      ["Qu'est-ce qui distingue les credit card ABS des auto loan ABS en termes de collatéral ?", "Les credit card receivables sont des prêts nonamortizing (pas de calendrier de remboursement du principal), contrairement aux auto loans qui sont amortizing."],
      ["Qu'est-ce que le lockout period (revolving period) d'un credit card ABS ?", "Période durant laquelle les investisseurs ne reçoivent que les intérêts et frais ; tout principal remboursé par les emprunteurs sert à acheter de nouvelles créances, maintenant la taille du pool stable."],
      ["Les investisseurs d'un credit card ABS sont-ils exposés au prepayment risk pendant le lockout period ?", "Non, car les paiements de principal du pool sont réinvestis dans de nouvelles créances plutôt que reversés aux investisseurs."],
      ["Quel est le rôle de l'early (rapid) amortization provision dans un credit card ABS ?", "Elle accélère l'amortissement du principal des ABS si la qualité de crédit du pool se détériore, protégeant ainsi les investisseurs."],
      ["Les auto loan ABS comportent-ils systématiquement un credit enhancement ?", "Oui : tous les auto loan ABS intègrent une forme de credit enhancement pour être attractifs auprès des investisseurs institutionnels."],
      ["Qu'est-ce qu'un solar ABS et quel type d'investisseurs attire-t-il particulièrement ?", "ABS adossé à des prêts finançant l'installation de panneaux solaires chez des particuliers ; attractif pour les investisseurs axés ESG."],
      ["Qu'est-ce qu'un CDO (collateralized debt obligation) et en quoi diffère-t-il d'un ABS classique ?", "Security structurée par une SPE adossée à un pool de dettes ; contrairement à un ABS classique à pool statique, un CDO est géré activement par un collateral manager qui achète et vend le collatéral."],
      ["Quelle est la différence entre un CBO et un CLO ?", "Le CBO (collateralized bond obligation) est adossé à de la dette corporate/emerging market ; le CLO (collateralized loan obligation) est adossé à des leveraged loans bancaires."],
      ["Quelle est la différence entre un cash flow CLO, un market value CLO et un synthetic CLO ?", "Cash flow CLO : paiements générés par les cash flows du collatéral. Market value CLO : paiements générés par le trading du collatéral. Synthetic CLO : exposition au collatéral obtenue via des contrats de credit derivatives, sans détention réelle du collatéral."],
      ["Qu'est-ce qu'un synthetic CDO en termes de collatéral sous-jacent ?", "Un CDO adossé à un pool de credit default swaps plutôt qu'à des actifs détenus physiquement."],
      ["Qu'est-ce qu'un structured finance CDO ?", "Un CDO dont le collatéral est un pool de mortgage-backed securities, d'asset-backed securities, ou d'autres CDOs."],
      ["Qu'est-ce que le prepayment risk d'un MBS ?", "Le risque que la vitesse des remboursements anticipés diffère des attentes des investisseurs au moment de l'achat du MBS."],
      ["Différence entre extension risk et contraction risk ?", "Extension risk : les prepayments sont plus lents que prévu (souvent quand les taux montent). Contraction risk : les prepayments sont plus rapides que prévu (souvent quand les taux baissent)."],
      ["Pourquoi une baisse des taux d'intérêt est-elle défavorable aux investisseurs en MBS ?", "Elle accélère les prepayments (contraction), donnant des cash flows plus tôt que prévu à réinvestir à des taux plus faibles, et limite la hausse de prix du MBS par rapport à une obligation sans option de prepayment intégrée."],
      ["Qu'est-ce que le time tranching dans une structure MBS ?", "Technique consistant à créer des tranches de maturités différentes pour redistribuer le prepayment risk entre elles, sans l'éliminer globalement."],
      ["Qu'est-ce que le loan-to-value ratio (LTV) d'un prêt hypothécaire résidentiel ?", "Le montant du prêt divisé par la valeur du bien immobilier ; plus le LTV est bas, plus l'equity du emprunteur est élevée et plus le risque de défaut est faible."],
      ["Qu'est-ce que le debt-to-income ratio (DTI) d'un emprunteur ?", "Le paiement de dette mensuel de l'emprunteur en proportion de son revenu brut mensuel avant impôts ; un DTI plus faible signale un risque de défaut plus faible."],
      ["Qu'est-ce qu'un prime loan vs un subprime loan aux États-Unis ?", "Prime loan : bon crédit, LTV et DTI faibles. Subprime loan : crédit de moindre qualité, DTI/LTV plus élevés, ou priorité de créance inférieure sur le collatéral en cas de défaut."],
      ["Un emprunteur est-il plus enclin au défaut stratégique avec un prêt recourse ou nonrecourse ?", "Avec un prêt nonrecourse : le prêteur ne peut saisir que le bien en collatéral, donc l'emprunteur en negative equity préfère abandonner le bien plutôt que continuer à payer."],
      ["Différence entre agency RMBS et non-agency RMBS ?", "Agency RMBS : garanti par le gouvernement ou une government-sponsored enterprise (GSE), avec normes de souscription minimales. Non-agency RMBS : émis par des entités privées, sans garantie gouvernementale, souvent avec credit enhancement (assurance, letters of credit, tranching)."],
      ["Qu'est-ce que le weighted average coupon (WAC) d'un pool de mortgages ?", "La moyenne pondérée des taux d'intérêt de tous les mortgages du pool, pondérée par le solde de principal restant de chaque prêt."],
      ["Qu'est-ce que le weighted average maturity (WAM) d'un pool de mortgages ?", "La moyenne pondérée des maturités finales de tous les mortgages du pool, pondérée par le solde de principal restant de chaque prêt."],
      ["Pourquoi le pass-through rate d'un MBS est-il inférieur au WAC du pool sous-jacent ?", "Parce qu'une partie des cash flows du pool sert à payer les frais d'émission et de servicing des mortgages."],
      ["Exemple : un pool de mortgages a un solde courant total de 409 (000 USD), avec des maturités restantes de 210, 100 et 280 mois pondérées respectivement par 90, 72 et 247. Quel est le WAM ?", "WAM = 210×(90/409) + 100×(72/409) + 280×(247/409) ≈ 233 mois."],
      ["Un pool de RMBS agency avec un prepayment speed de 50 PSA a-t-il une weighted average life égale, supérieure ou inférieure à son WAM ?", "Inférieure : dès qu'il y a des prepayments, la weighted average life du pool est plus courte que son WAM."],
      ["Qu'est-ce qu'un CMO (collateralized mortgage obligation) ?", "Security adossée à des pass-through MBS ou des pools de mortgages, structurée en tranches ayant des expositions différentes au prepayment risk, sans changer le prepayment risk total du sous-jacent."],
      ["Comment fonctionne un sequential-pay CMO à deux tranches ?", "Les deux tranches reçoivent les intérêts, mais tout le principal (scheduled et prepayments) est d'abord versé à la tranche 1 (short tranche) ; une fois celle-ci remboursée, le principal est versé à la tranche 2."],
      ["Dans un sequential-pay CMO à tranches S (courte) et R (longue), comment se comparent leurs risques ?", "Tranche S a plus de contraction risk et moins d'extension risk que Tranche R, car elle reçoit le principal en priorité et est donc remboursée plus tôt."],
      ["Qu'est-ce qu'une Z-tranche (accrual bond) dans un CMO ?", "Tranche qui ne reçoit aucun paiement d'intérêt pendant une période d'accrual : l'intérêt s'accumule en augmentant le principal de la tranche plutôt que d'être versé en cash. C'est typiquement la tranche la plus junior."],
      ["Qu'est-ce qu'une PO (principal-only) security et comment réagit-elle à une baisse des taux ?", "Security qui ne reçoit que le principal du pool de collatéral (zéro-coupon de facto) ; une baisse des taux accélère les prepayments, augmentant le rendement annualisé des porteurs de PO."],
      ["Qu'est-ce qu'une IO (interest-only) security et comment réagit-elle à une hausse des prepayments ?", "Security qui ne reçoit que les intérêts du pool ; une hausse des prepayments réduit le principal restant, donc réduit les paiements de coupon futurs, ce qui nuit aux porteurs d'IO."],
      ["Comment fonctionne un PAC (planned amortization class) tranche vis-à-vis de la tranche support ?", "Le PAC reçoit des paiements prévisibles tant que les prepayments restent dans une fourchette donnée ; la tranche support absorbe les prepayments excédentaires ou comble le manque, protégeant le PAC contre le contraction et l'extension risk dans cette fourchette."],
      ["Le support tranche d'un PAC CMO est-il exposé à un risque de crédit élevé ?", "Non : le support tranche est exposé à un niveau élevé de prepayment risk (contraction et extension), pas de credit risk."],
      ["Pourquoi le support tranche offre-t-il un taux d'intérêt plus élevé que les tranches PAC ?", "Parce qu'il supporte davantage de contraction risk et d'extension risk que les tranches PAC, en échange d'une rémunération supérieure."],
      ["Qu'est-ce qu'une commercial mortgage-backed security (CMBS) et sur quoi porte principalement son analyse de crédit ?", "MBS adossée à des mortgages commerciaux sur des biens générateurs de revenus (bureaux, commerces, hôtels...) ; l'analyse se concentre sur le risque de crédit du bien immobilier (via les tenants), pas sur celui de l'emprunteur, car les prêts sont nonrecourse."],
      ["Quel est le ratio DSCR (debt service coverage ratio) et que signifie un DSCR élevé ?", "DSCR = net operating income / debt service ; un DSCR plus élevé indique une meilleure qualité de crédit car le bien génère plus de cash flow pour couvrir le service de la dette."],
      ["Quels sont les deux ratios clés utilisés pour évaluer le risque de crédit d'un CMBS, et quelles valeurs indiquent une meilleure qualité ?", "DSCR (plus élevé = meilleur) et LTV (plus faible = meilleur)."],
      ["Quelles sont les 3 méthodes de loan-level call protection dans un CMBS ?", "Prepayment lockout (interdiction de prépayer pendant une période donnée), prepayment penalty points (pénalité en % du principal prépayé), et defeasance (achat de titres d'État pour remplacer les cash flows du prêt)."],
      ["Qu'est-ce que le CMBS-level call protection et comment est-il structuré ?", "Protection au niveau de la structure du CMBS via une tranchage séquentiel du pool, notamment via une tranche résiduelle (equity/first-loss), qui protège les tranches senior contre le prepayment risk."],
      ["Qu'est-ce que le balloon risk dans un CMBS ?", "Le risque que l'emprunteur, en fin de prêt commercial partiellement amorti, ne parvienne pas à refinancer le solde restant (balloon payment), entraînant un défaut ; c'est une source d'extension risk pour les investisseurs."],
      ["Les prêts commerciaux sous-jacents à un CMBS sont-ils recourse ou nonrecourse ?", "Nonrecourse uniquement."],
    ],
  },
];

const OWNER_EMAIL = "chaumonttheo@gmail.com";

async function main() {
  console.log(`Recherche du owner (${OWNER_EMAIL})...`);
  const { data: users, error: userErr } = await supabase.auth.admin.listUsers({ perPage: 100 });
  if (userErr) {
    console.error("Impossible de lister les utilisateurs:", userErr);
    process.exit(1);
  }
  const owner = users.users.find((u) => u.email === OWNER_EMAIL);
  if (!owner) {
    console.error(`Utilisateur ${OWNER_EMAIL} introuvable.`);
    process.exit(1);
  }
  const ownerId = owner.id;
  console.log(`Owner: ${ownerId}`);

  const { data: topic, error: topicErr } = await supabase
    .from("cfa_topics")
    .select("id")
    .eq("code", "fixed")
    .maybeSingle();
  if (topicErr) console.warn("Warning: cfa_topics lookup failed:", topicErr.message);
  const topicId = topic?.id ?? null;

  // Supprime les 6 sets existants (v1) pour ce owner + leurs cartes (cascade),
  // pour repartir sur un contenu propre plutôt que d'empiler doublons.
  console.log("Suppression des anciens sets Fixed Income (v1)...");
  const oldTitles = [
    "Fixed-Income Instruments & Markets (R47–R51)",
    "Bond Valuation & Yield Measures (R52–R54)",
    "Term Structure of Interest Rates (R55)",
    "Interest Rate Risk: Duration & Convexity (R56–R59)",
    "Credit Analysis (R60–R62)",
    "Securitization, ABS & MBS (R63–R65)",
  ];
  const { error: delErr } = await supabase
    .from("flashcard_sets")
    .delete()
    .eq("owner_id", ownerId)
    .in("title", oldTitles);
  if (delErr) throw delErr;

  console.log(`Création/recherche du dossier "${FOLDER_NAME}"...`);
  // Renomme l'ancien dossier "(Officiel)" s'il existe encore (migration SQL
  // aurait déjà dû le faire, ceci est un filet de sécurité idempotent).
  await supabase
    .from("library_folders")
    .update({ name: FOLDER_NAME })
    .eq("owner_id", ownerId)
    .eq("kind", "flashcards")
    .ilike("name", "%Fixed Income%(Officiel)%");

  let { data: folder } = await supabase
    .from("library_folders")
    .select("id")
    .eq("name", FOLDER_NAME)
    .eq("kind", "flashcards")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (!folder) {
    const { data: newFolder, error: folderErr } = await supabase
      .from("library_folders")
      .insert({ name: FOLDER_NAME, kind: "flashcards", owner_id: ownerId })
      .select("id")
      .single();
    if (folderErr) throw folderErr;
    folder = newFolder;
  }
  console.log(`Folder id: ${folder.id}`);

  let total = 0;
  for (const set of SETS) {
    console.log(`\nCréation du set: ${set.title} (${set.cards.length} cartes)`);
    const { data: newSet, error: setErr } = await supabase
      .from("flashcard_sets")
      .insert({
        title: set.title,
        visibility: "public",
        subject: "cfa",
        owner_id: ownerId,
        folder_id: folder.id,
        is_official: true,
        official_published: true,
        cfa_level: 1,
      })
      .select("id")
      .single();
    if (setErr) throw setErr;

    const rows = set.cards.map(([front, back], i) => ({
      set_id: newSet.id,
      front,
      back,
      position: i + 1,
      topic_id: topicId,
    }));

    const { error: cardsErr } = await supabase.from("flashcards").insert(rows);
    if (cardsErr) throw cardsErr;

    console.log(`  ✓ ${rows.length} cartes insérées (set ${newSet.id})`);
    total += rows.length;
  }

  console.log(`\n✅ Terminé. ${total} cartes au total sur ${SETS.length} sets.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
