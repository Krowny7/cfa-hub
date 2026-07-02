// Seed script — Flashcards officielles Fixed Income (CFA Level I, R47-R65)
// Usage: node scripts/seed-flashcards-fixed-income.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Charge .env.local manuellement (pas de dépendance dotenv nécessaire)
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

const FOLDER_NAME = "Fixed Income (Officiel)";

const SETS = [
  {
    title: "Fixed-Income Instruments & Markets (R47–R51)",
    cards: [
      ["Que sont les 3 éléments définissant un obligation ?", "Issuer, maturity (bullet/serial/term), et principal (par value). Le coupon rate définit les paiements périodiques."],
      ["Quelle est la différence entre plain vanilla bond et bond avec provisions ?", "Plain vanilla = fixed coupon, bullet maturity, pas d'options. Avec provisions = callable (émetteur), putable (investisseur), convertible (equity), ou avec sinking fund."],
      ["Qu'est-ce qu'un floating-rate note (FRN) ?", "Coupon = taux référence (ex: SOFR) + quoted margin (QM), reset périodiquement. QM fixé à l'émission reflète le risque de crédit de l'émetteur à ce moment."],
      ["Différence entre secured et unsecured debt ?", "Secured = garantie par un collatéral (recovery rate plus élevé). Unsecured = créance générale sur les actifs de l'émetteur (recovery rate plus bas)."],
      ["Qu'est-ce qu'un covenant de maintenance vs incurrence ?", "Maintenance = ratio à respecter EN PERMANENCE (courant en bank loans). Incurrence = testé seulement SI une action spécifique est entreprise (ex: émission de nouvelle dette) — courant en high-yield bonds."],
      ["Quels sont les 3 principaux marchés d'émetteurs de dette ?", "Souverains (gouvernements nationaux), non-souverains (municipalités, agences quasi-gouvernementales), et corporates (entreprises)."],
      ["GO bonds vs Revenue bonds ?", "GO (General Obligation) = garantis par le pouvoir fiscal de la collectivité, risque plus faible. Revenue bonds = remboursés uniquement par les revenus d'un projet spécifique, risque plus élevé, yields plus hauts."],
      ["Qu'est-ce que le marché primaire vs secondaire ?", "Primaire = émission de nouveaux titres (via underwriting, private placement, ou shelf registration). Secondaire = échange de titres déjà émis entre investisseurs (dealer market le plus souvent, pas de bourse centralisée)."],
      ["Quelles sont les méthodes d'émission obligataire principales ?", "Underwritten offering (banque garantit le placement, achète puis revend), best efforts offering (banque fait de son mieux sans garantie), private placement (petit nombre d'investisseurs qualifiés, pas de prospectus public)."],
      ["Qu'est-ce qu'un sinking fund ?", "Provision qui oblige l'émetteur à rembourser une portion du principal chaque année avant maturité, réduisant le risque de crédit résiduel — souvent via un tirage au sort de bonds à rembourser."],
      ["Comment se calcule le prix coté (clean price) vs le prix payé (dirty/full price) ?", "Full price = Clean price + Accrued interest (intérêts courus depuis le dernier coupon). L'acheteur paie toujours le full price, mais le prix COTÉ sur le marché est le clean price."],
      ["Qu'est-ce que le settlement T+1/T+2/T+3 ?", "Nombre de jours ouvrés entre la transaction et le règlement effectif (échange titre contre cash) — varie selon le marché et le type d'instrument."],
    ],
  },
  {
    title: "Bond Valuation & Yield Measures (R52–R54)",
    cards: [
      ["Formule générale de valorisation obligataire ?", "Prix = Σ [Coupon / (1+r)^t] + Valeur nominale / (1+r)^N, où r = yield to maturity (YTM) par période."],
      ["Valorisation via les taux spot — différence avec YTM ?", "Chaque cash flow est actualisé à SON PROPRE taux spot (pas un taux unique) : Prix = C/(1+S₁) + C/(1+S₂)² + ... + (C+FV)/(1+Sₙ)ⁿ. Plus précis que le YTM qui suppose un taux constant."],
      ["Relation prix/YTM (forme de la courbe) ?", "Convexe : quand YTM ↓, le prix ↑ plus qu'il ne ↓ pour une hausse équivalente de YTM (convexité positive pour un bond standard)."],
      ["YTC, YTP, YTW — définitions ?", "YTC = yield to call (calculé au call price et à la 1ère date de call). YTP = yield to put. YTW = yield to worst = le MINIMUM entre YTM et tous les YTC possibles — c'est le rendement que l'investisseur doit assumer en pire cas."],
      ["G-spread vs I-spread vs Z-spread ?", "G-spread = YTM bond − YTM gouvernemental interpolé de même maturité. I-spread = YTM bond − taux swap interpolé. Z-spread = spread constant ajouté à CHAQUE taux spot pour que PV=Prix (plus précis, tient compte de la courbe entière)."],
      ["OAS (option-adjusted spread) — pourquoi et comment ?", "OAS = Z-spread − valeur de l'option intégrée au bond. Isole le spread de crédit PUR en retirant l'effet de l'option. Callable: OAS < Z-spread. Putable: OAS > Z-spread."],
      ["Quoted Margin (QM) vs Discount Margin (DM) pour un FRN ?", "QM = spread fixé à l'émission (contractuel, ne change jamais). DM = spread requis aujourd'hui pour que PV(flux) = Prix de marché. Prix < par → DM > QM (discount). Prix > par → DM < QM (premium)."],
      ["Money market yields — DR, AOR, BEY ordre de grandeur ?", "Toujours DR < AOR < BEY pour un même instrument. DR (discount rate) sur base 360j et valeur FACIALE. AOR (add-on rate) sur base 360j et prix D'ACHAT. BEY sur base 365j."],
      ["Que représente la periodicity d'un bond (m) et son effet sur le YTM annoncé ?", "m = nombre de périodes de composition par an. Plus m augmente pour un même EAY, plus le taux annoncé (stated rate) DIMINUE (composition plus fréquente compense un taux nominal plus faible)."],
    ],
  },
  {
    title: "Term Structure of Interest Rates (R55)",
    cards: [
      ["Formule liant spot rates et forward rate (notation générale) ?", "(1+Sₙ)ⁿ = (1+Sₘ)ᵐ × (1+F_m,n−m)^(n−m). Le forward rate F est le taux implicite entre deux maturités de la courbe spot."],
      ["Notation AyBy — que signifie-t-elle ?", "Taux forward de B années démarrant dans A années. Ex: \"2y3y\" = taux forward 3 ans qui commence dans 2 ans (PAS un taux qui se termine dans 2 ans — piège classique)."],
      ["Qu'est-ce que le par yield / par curve ?", "Le taux de coupon qui rend le prix d'une obligation égal à sa valeur nominale (prix = 100), pour chaque maturité. Diffère du taux spot pour toute courbe non-plate."],
      ["Relation entre forward, spot et par curves en courbe NORMALE (montante) ?", "Forward > Spot > Par. C'est l'ordre attendu quand la courbe des taux est en pente normale ascendante."],
      ["Relation entre forward, spot et par curves en courbe INVERSÉE ?", "Forward < Spot < Par — l'ordre s'inverse complètement par rapport à la courbe normale."],
      ["Quand forward = spot = par ?", "Uniquement quand la courbe des taux est PLATE (tous les taux identiques quelle que soit la maturité)."],
      ["Comment interpréter économiquement un taux forward élevé ?", "Le marché anticipe une hausse future des taux courts (si la courbe forward monte avec l'horizon) — mais attention, ce n'est qu'une des théories d'interprétation, pas une certitude."],
    ],
  },
  {
    title: "Interest Rate Risk: Duration & Convexity (R56–R59)",
    cards: [
      ["Quelles sont les 3 sources de rendement d'une obligation détenue jusqu'à maturité ?", "1) Paiements de coupons, 2) Réinvestissement des coupons, 3) Gain/perte en capital (si vente avant maturité ou valeur de remboursement ≠ prix d'achat)."],
      ["Qu'est-ce que la duration gap et comment détermine-t-elle le risque dominant ?", "Duration gap = MacDur − horizon d'investissement. Gap POSITIF → price risk domine (perte si taux montent). Gap NÉGATIF → reinvestment risk domine (perte si taux baissent). Gap = 0 → immunisation parfaite."],
      ["Formule de la Macaulay Duration ?", "MacDur = Σ [t × (PV du cash flow au temps t / Prix total)] — moyenne pondérée du temps jusqu'à réception de chaque flux."],
      ["Formule et relation entre Modified Duration et Macaulay Duration ?", "ModDur = MacDur / (1 + YTM/m). ModDur est TOUJOURS < MacDur. %ΔPrix ≈ −ModDur × ΔYTM (approximation linéaire)."],
      ["Money Duration et PVBP — formules ?", "Money Duration = ModDur × Prix (full price) de la position. PVBP (Price Value of a Basis Point) = Money Duration × 0,0001 — variation en $ pour 1 point de base."],
      ["Quels facteurs AUGMENTENT la duration d'une obligation ?", "Maturité ↑, coupon ↓, YTM ↓. Un zero-coupon bond a MacDur = maturité exactement. Un call feature RÉDUIT la duration (l'option limite la hausse de prix)."],
      ["Formule de la convexité approximative ?", "Approximate convexity = (V₋ + V₊ − 2×V₀) / [(ΔYTM)² × V₀], où V₋/V₊ = prix si YTM baisse/monte de ΔYTM."],
      ["Formule complète du %ΔPrix avec duration ET convexité ?", "%ΔPrix ≈ −ModDur × ΔYTM + ½ × Convexité × (ΔYTM)². Le terme de convexité est TOUJOURS positif — il améliore toujours la performance (gain plus élevé si taux baissent, perte moindre si taux montent)."],
      ["Convexité négative — quand survient-elle et pourquoi ?", "Callable bonds à YIELDS BAS : le call devient probable, le prix est plafonné au call price → la courbe prix/taux se retourne → convexité négative. Les putable bonds n'ont JAMAIS de convexité négative."],
      ["Effective Duration — pourquoi l'utiliser pour les bonds avec option ?", "Les bonds avec options (callable, putable, MBS) ont des flux futurs incertains → pas de YTM unique → on utilise un choc de la courbe BENCHMARK (ΔCurve) plutôt que ΔYTM : EffDur = (V₋ − V₊)/(2×V₀×ΔCurve)."],
      ["Qu'est-ce que la Key Rate Duration et à quoi sert-elle ?", "Sensibilité du prix à un déplacement d'UN SEUL point de la courbe (maturité spécifique), les autres taux restant constants. Utile pour mesurer le \"shaping risk\" (torsions non-parallèles de la courbe). La somme des KRD = duration effective totale."],
      ["Empirical vs Analytical Duration — différence clé ?", "Analytical (MacDur/ModDur/EffDur) = dérivée mathématiquement, suppose spread constant. Empirical = estimée par régression historique des prix vs taux. Pour les bonds risqués (HY, MBS) en \"flight to quality\", les spreads bougent AVEC les taux → empirical duration diverge de l'analytical."],
    ],
  },
  {
    title: "Credit Analysis (R60–R62)",
    cards: [
      ["Formule de l'Expected Loss ?", "Expected Loss = Probability of Default (PD) × Loss Given Default (LGD%). LGD% = Expected exposure × (1 − Recovery rate)."],
      ["Quels sont les 4 (ou 5) Cs de l'analyse de crédit corporate ?", "Capacity (capacité à payer), Collateral (valeur du gage), Covenants (termes légaux), Character (intégrité du management) — parfois Capital ajouté comme 5e C (autres ressources disponibles)."],
      ["Quelle est la différence entre credit rating agencies limites principales ?", "Backward-looking (basé sur données passées), plus lentes que le marché à réagir, conflit d'intérêt (issuer-pays model), et risque de \"ratings cliff\" (dégradation IG→HY force des ventes)."],
      ["Comment se décompose le yield spread total d'une obligation ?", "Yield spread total = prime de liquidité + prime de crédit. Liquidity spread ≈ Yield(bid) − Yield(offer). Le reste est attribué au risque de crédit."],
      ["Effet d'une récession/expansion sur les spreads de crédit ?", "Expansion économique → spreads se resserrent (narrow). Récession/stress de marché → spreads s'élargissent (widen) — mouvement de \"flight to quality\"."],
      ["Seniority ranking — ordre de priorité en cas de défaut (corporate) ?", "1) First lien/mortgage, 2) Senior secured, 3) Junior secured, 4) Senior unsecured, 5) Senior subordinated, 6) Subordinated, 7) Junior subordinated. Toute dette au MÊME rang = \"pari passu\"."],
      ["Qu'est-ce que le notching et quand est-il plus fréquent ?", "Notching = ajuster la note d'une émission spécifique par rapport au CFR (Corporate Family Rating) de l'émetteur, selon la seniority/collatéral. Plus fréquent pour les émetteurs à rating BAS (différences de recovery plus significatives)."],
      ["Qu'est-ce que la structural subordination ?", "Si les covenants d'une FILIALE empêchent la remontée de cash vers la maison mère avant service de sa propre dette, la dette de la MAISON MÈRE est structurellement subordonnée à celle de la filiale — même si les deux émettent de la dette senior unsecured nominalement."],
      ["Quels sont les 5 facteurs qualitatifs d'analyse du crédit souverain ?", "Institutions & policy factors (willingness to pay, sovereign immunity), fiscal flexibility, monetary effectiveness, economic flexibility, external status (devise de réserve = avantage)."],
      ["Ability to pay vs willingness to pay — pourquoi distinctif pour les souverains ?", "Willingness to pay est un facteur SPÉCIFIQUE aux souverains car les bondholders n'ont généralement AUCUN recours légal si un gouvernement refuse de payer (sovereign immunity) — contrairement aux corporates."],
      ["GO bonds vs corporate bonds de même rating — pourquoi GO moins risqué ?", "Les taux de défaut historiques sont plus bas pour les GO munis à rating équivalent (PAS parce que le gouvernement local peut imprimer de la monnaie — cette capacité appartient au souverain, pas aux collectivités locales)."],
    ],
  },
  {
    title: "Securitization, ABS & MBS (R63–R65)",
    cards: [
      ["Quelles sont les 3 étapes du processus de titrisation ?", "1) L'originateur crée un pool d'actifs, 2) Le pool est vendu à un SPE (Special Purpose Entity) indépendant, 3) Le SPE émet des ABS adossés à ces actifs aux investisseurs."],
      ["Qu'est-ce que la \"bankruptcy remoteness\" et pourquoi est-elle centrale ?", "Le SPE est juridiquement INDÉPENDANT de l'originateur — en cas de faillite de l'originateur, les investisseurs ABS n'ont recours QUE sur le collatéral du SPE, jamais sur les autres actifs de l'originateur. Permet aux ABS d'avoir un rating supérieur à celui de l'originateur."],
      ["Quels sont les 3 mécanismes de credit enhancement interne ?", "Overcollateralization (valeur du collatéral > valeur des ABS), Excess spread (rendement collatéral − coupon ABS = buffer), Credit tranching/subordination (les tranches junior absorbent les pertes en premier)."],
      ["Covered bonds vs ABS — différence fondamentale ?", "Covered bonds : le cover pool reste AU BILAN de l'émetteur (pas de SPE, pas de true sale) → dual recourse (pool + actifs non nantis de l'émetteur). ABS : recours SEULEMENT au SPE bankruptcy-remote."],
      ["Hard-bullet vs soft-bullet vs conditional pass-through covered bond ?", "Hard-bullet = défaut IMMÉDIAT si paiement manqué. Soft-bullet = report de maturité jusqu'à 1 an. Conditional pass-through = convertit en pass-through bond si paiements encore dus à maturité."],
      ["Credit card ABS — pourquoi \"nonamortizing\" et lockout period ?", "Créances revolving : pendant le lockout/revolving period, investisseurs reçoivent SEULEMENT intérêts+fees, le principal remboursé est RÉINVESTI en nouvelles créances → PAS de prepayment risk pendant cette période."],
      ["CDO — qu'est-ce qui le distingue d'un ABS classique ?", "Le CDO est géré ACTIVEMENT par un collateral manager (contrairement au pool statique d'un ABS classique). CLO = collatéral en leveraged loans (forme la plus courante post-2008). CBO = dette corporate/emerging markets."],
      ["Extension risk vs contraction risk (MBS) — définitions et cause ?", "Extension risk = prépaiements PLUS LENTS qu'attendu (survient quand les TAUX MONTENT — moins de refinancement). Contraction risk = prépaiements PLUS RAPIDES qu'attendu (survient quand les TAUX BAISSENT)."],
      ["LTV et DTI — définitions et effet sur le risque ?", "LTV (Loan-to-Value) = montant prêt / valeur du bien — plus BAS = moins risqué. DTI (Debt-to-Income) = paiement mensuel / revenu brut mensuel — plus BAS = moins risqué."],
      ["Agency vs Non-agency RMBS ?", "Agency = garantie gouvernementale (Ginnie Mae, explicite) ou GSE (Fannie/Freddie, implicite), normes d'underwriting minimales. Non-agency = émis par entités privées, pas de garantie, souvent subprime — catalyseur de la crise 2007-09."],
      ["Sequential-pay CMO — quelle tranche a le plus de contraction risk ?", "La tranche COURTE (payée en premier) reçoit TOUS les prépaiements en premier → PLUS de contraction risk, MOINS d'extension risk. La tranche longue a l'inverse."],
      ["PAC tranche et support tranche — rôle respectif ?", "PAC = paiements prévisibles dans une bande PSA prédéfinie. Support tranche = absorbe l'excès (si prépaiements rapides) ou le déficit (si prépaiements lents) pour protéger le PAC — le support porte donc le risque de prépaiement le plus élevé."],
      ["CMBS — quels ratios analysent le risque de crédit ?", "DSCR (Debt Service Coverage Ratio) = NOI / service de la dette (plus ÉLEVÉ = meilleur). LTV = montant prêt / valeur actuelle du bien (plus BAS = meilleur). Les prêts CMBS sont NON-RECOURSE, remboursés par les revenus locatifs."],
      ["Call protection en CMBS — 3 mécanismes au niveau du prêt ?", "Prepayment lockout (interdiction totale de remboursement anticipé), Yield maintenance charge (pénalité = PV de la différence de flux), Defeasance (remplacement du collatéral par des T-bonds générant les mêmes flux)."],
    ],
  },
];

const OWNER_EMAIL = "chaumonttheo@gmail.com"; // compte réel utilisé pour étudier — NE PAS déduire "le premier user"

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
  console.log(`Topic 'fixed' id: ${topicId}`);

  console.log(`Création/recherche du dossier "${FOLDER_NAME}"...`);
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

  for (const set of SETS) {
    console.log(`\nCréation du set: ${set.title}`);
    const { data: newSet, error: setErr } = await supabase
      .from("flashcard_sets")
      .insert({
        title: set.title,
        visibility: "public",
        subject: "cfa",
        owner_id: ownerId,
        folder_id: folder.id,
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
  }

  console.log("\n✅ Terminé.");
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
