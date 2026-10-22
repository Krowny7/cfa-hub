// Exercices de calcul pur : Economics (CFA Level I).
//
// Contenu seulement : le moteur et les pages vivent ailleurs (lib/calc/engine.ts, app/calculs).
// Règle d'or : chaque réponse est CALCULÉE ici, à partir des mêmes nombres que les données
// affichées, par les petites fonctions du haut de fichier. Aucune réponse tapée à la main.
// Formules vérifiées dans Schweser Level I, Book 1 (Readings 12 à 19 = LM 1 à 8 du curriculum
// Economics) et recoupées avec la banque officielle de practice exams (Readings 12 à 19).
//
// Conventions : énoncés et données en anglais d'examen ; solutions en français, nombres au format
// français. Pour une réponse en %, `answer` vaut déjà le pourcentage (8,5 % → 8.5).
// Cotations de change comme au CFA : « A/B » = unités de A (devise de cotation, price currency)
// pour 1 unité de B (devise de base, base currency). Taux du marché monétaire : base 360 jours,
// sans composition sur moins d'un an.

import type { CalcCatalog, CalcLevel, CalcQuestion, CalcType, CalcUnit } from "./types";

/* ────────────────────────── Mise en forme ────────────────────────── */

const NBSP = String.fromCharCode(160);
const MINUS = String.fromCharCode(8722);

function groupDigits(intPart: string, sep: string): string {
  let out = "";
  const n = intPart.length;
  for (let i = 0; i < n; i++) {
    out += intPart.charAt(i);
    const left = n - 1 - i;
    if (left > 0 && left % 3 === 0) out += sep;
  }
  return out;
}

function trimZeros(s: string): string {
  if (s.indexOf(".") < 0) return s;
  let t = s;
  while (t.endsWith("0")) t = t.slice(0, -1);
  if (t.endsWith(".")) t = t.slice(0, -1);
  return t;
}

function numStr(x: number, d: number | undefined, dec: string, sep: string): string {
  const fixed = Math.abs(x).toFixed(d === undefined ? 4 : d);
  const s = d === undefined ? trimZeros(fixed) : fixed;
  const parts = s.split(".");
  const sign = x < 0 && Number(s) !== 0 ? MINUS : "";
  return sign + groupDigits(parts[0], sep) + (parts.length > 1 ? dec + parts[1] : "");
}

const isInt = (x: number): boolean => Math.abs(x - Math.round(x)) < 1e-9 * Math.max(1, Math.abs(x));

/** Nombre au format français (solutions). Sans `d` : jusqu'à 4 décimales, zéros inutiles retirés. */
const F = (x: number, d?: number): string => numStr(x, d, ",", NBSP);
/** Montant en dollars, format français : « 1 234,50 $ ». */
const D = (x: number, d?: number): string => `${F(x, d ?? (isInt(x) ? 0 : 2))} $`;
/** Montant en milliards de dollars. */
const B = (x: number, d?: number): string => `${F(x, d ?? (isInt(x) ? 0 : 2))} Md$`;
/** Montant dans une devise quelconque : « 1 234 EUR ». */
const C = (x: number, ccy: string, d?: number): string => `${F(x, d ?? (isInt(x) ? 0 : 2))} ${ccy}`;
/** Pourcentage à partir d'une fraction (0,085 → « 8,5% »). */
const P = (frac: number, d?: number): string => `${F(frac * 100, d)}%`;
/** Pourcentage déjà exprimé en % (réponses). */
const Pa = (pct: number, d = 2): string => `${F(pct, d)}%`;
/** Somme signée lisible : [12, −4, 7] → « 12 − 4 + 7 ». */
const terms = (xs: number[], fmt: (x: number) => string): string =>
  xs.map((x, i) => (i === 0 ? fmt(x) : x < 0 ? ` − ${fmt(-x)}` : ` + ${fmt(x)}`)).join("");

/** Formats anglais (données d'énoncé). */
const E = (x: number, d?: number): string => numStr(x, d, ".", ",");
const usd = (x: number, d?: number): string => `${x < 0 ? MINUS : ""}$${E(Math.abs(x), d ?? (isInt(x) ? 0 : 2))}`;
/** Milliards de dollars : « $40 billion », « −$25 billion ». */
const bn = (x: number): string => `${usd(x)} billion`;
const pc = (frac: number, d?: number): string => `${E(frac * 100, d)}%`;
const spc = (frac: number): string => `${frac > 0 ? "+" : ""}${pc(frac)}`;
const lst = (xs: string[]): string => xs.join(" / ");
/** Cours de change (4 décimales par défaut). */
const fx = (x: number, d = 4): string => E(x, d);
const Fx = (x: number, d = 4): string => F(x, d);
/** Facteur de croissance (positif), jusqu'à 6 décimales, zéros inutiles retirés : 1,013125. */
const F6 = (x: number): string => trimZeros(x.toFixed(6)).replace(".", ",");
/** Points de terme signés : « +48.5 points ». */
const pts = (x: number): string => `${x > 0 ? "+" : x < 0 ? MINUS : ""}${E(Math.abs(x))} points`;
const Fpts = (x: number, d?: number): string => `${x > 0 ? "+" : ""}${F(x, d)} points`;

/** Coefficient devant Q dans une équation : 1 → « Q », 0,5 → « 0,5Q ». */
const cq = (c: number): string => (Math.abs(c - 1) < 1e-12 ? "Q" : `${F(c)}Q`);

type Row = [string, string];

/**
 * Questions strictes (CalcQuestion.strict) : seule la tolérance absolue compte, pour refuser un
 * raccourci faux qui tombe à moins de 0,2 % de la réponse. `true` = demi-unité de la dernière
 * décimale ; un nombre = tolérance absolue propre. En commentaire : valeurs refusées (réponse).
 * « Raccourci » = F ≈ S × (1 + (iP − iB) × t) ; « composé » = ((1 + iP) / (1 + iB))^t.
 */
const STRICT: Record<string, true | number> = {
  "ec-irp-f1": true, // raccourci 10,29 (10,3000)
  "ec-irp-f2": true, // raccourci 1,0891 ; composé 1,0889 (1,0890)
  "ec-irp-f3": true, // S ≈ F × (1 − écart) 1,0808 ; F / (1 + écart) 1,0821 (1,0825)
  "ec-irp-f4": true, // raccourci 0,8686 ; composé 0,8683 ; base 365 j 0,8684 (0,8685)
  "ec-irp-m2": true, // raccourci 1,3419 ; composé ou base 365 j 1,3423 ; sans prorata 1,3397 (1,3422)
  "ec-irp-m4": 0.0002, // raccourci 1,1043 (1,1038) ; le spot arrondi à 1,0870 donne 1,1039, accepté
  "ec-irp-d1": true, // composé 0,6625 (0,6626)
  "ec-irp-d3": true, // composé 1,0903 ; base 365 j 1,0902 (1,0901)
  "ec-irp-d4": true, // raccourci 161,44 ; composé ou base 365 j 161,46 (161,45)
  "ec-fwdpt-d5": true, // (1 / S) × (1 − 1,4 %) = 1,2561 (1,2563)
};

function q(
  id: string,
  level: CalcLevel,
  prompt: string,
  data: Row[],
  answer: number,
  unit: CalcUnit,
  decimals: number,
  solution: string[],
  tolerance?: number,
): CalcQuestion {
  const out: CalcQuestion = {
    id,
    level,
    prompt,
    data: data.map(([label, value]) => ({ label, value })),
    answer,
    unit,
    decimals,
    solution,
  };
  if (tolerance !== undefined) out.tolerance = tolerance;
  const strict = STRICT[id];
  if (strict !== undefined) {
    out.strict = true;
    if (typeof strict === "number") out.tolerance = strict;
  }
  return out;
}

/* ────────────────────────── Fonctions économiques ────────────────────────── */

const sum = (xs: number[]): number => xs.reduce((s, x) => s + x, 0);

// LM 1 · The Firm and Market Structures
const breakevenQty = (fc: number, p: number, avc: number): number => fc / (p - avc);
/** Demande inverse linéaire P = a − bQ et coût marginal constant : Q* = (a − MC) / 2b. */
const optimalQty = (a: number, b: number, mc: number): number => (a - mc) / (2 * b);
/** Élasticité d'arc (méthode des moyennes), en valeur absolue. */
const arcElasticity = (p0: number, p1: number, q0: number, q1: number): number =>
  Math.abs(((q1 - q0) / ((q0 + q1) / 2)) / ((p1 - p0) / ((p0 + p1) / 2)));
const mrFromElasticity = (p: number, e: number): number => p * (1 - 1 / e);
const hhi = (shares: number[]): number => sum(shares.map((s) => s * s));
const desc = (xs: number[]): number[] => [...xs].sort((x, y) => y - x);
const topN = (xs: number[], n: number): number[] => desc(xs).slice(0, n);
/** Fusion des firmes i et j (indices dans la liste d'origine). */
const merge = (xs: number[], i: number, j: number): number[] => [
  ...xs.filter((_, k) => k !== i && k !== j),
  xs[i] + xs[j],
];

// LM 3 · Fiscal Policy
const fiscalMultiplier = (mpc: number, t: number): number => 1 / (1 - mpc * (1 - t));

// LM 4 · Monetary Policy
const fisherReal = (nominal: number, inflation: number): number => (1 + nominal) / (1 + inflation) - 1;

// LM 7 · Capital Flows and the FX Market
/** Taux de change réel P/B = nominal P/B × CPI (base) / CPI (cotation). */
const realFx = (s: number, cpiBase: number, cpiPrice: number): number => (s * cpiBase) / cpiPrice;
/** Variation de la devise de base (au dénominateur) et de la devise de cotation. */
const baseChange = (s0: number, s1: number): number => s1 / s0 - 1;
const priceChange = (s0: number, s1: number): number => s0 / s1 - 1;

// LM 8 · Exchange Rate Calculations
const fwdFromPoints = (spot: number, points: number, pointSize = 0.0001): number => spot + points * pointSize;
/** Forward de parité : F = S × (1 + iP × j/360) / (1 + iB × j/360). À 1 an, j = 360. */
const irpForward = (s: number, iPrice: number, iBase: number, days = 360): number =>
  (s * (1 + (iPrice * days) / 360)) / (1 + (iBase * days) / 360);
const growth = (i: number, days: number): number => 1 + (i * days) / 360;

/* ────────────────────────── 1 · Breakeven et shutdown ────────────────────────── */

const BREAKEVEN: CalcType = {
  key: "breakeven-shutdown",
  topic: "economics",
  name: "Seuils de rentabilité et de fermeture (breakeven / shutdown)",
  tier: "essentiel",
  source: "LM 1 · The Firm and Market Structures",
  formulas: [
    "Breakeven : TR = TC, soit P = ATC (profit économique nul)",
    "Court terme : produire tant que TR ≥ TVC (P ≥ AVC) ; fermer si TR < TVC",
    "Long terme : sortir du marché si TR < TC (P < ATC)",
    "Perte si fermeture à court terme = coûts fixes ; perte si production = TC − TR",
    "Quantité de breakeven (coût variable unitaire constant) = FC / (P − AVC)",
  ],
  traps: [
    "Les coûts économiques incluent les coûts implicites (salaire auquel renonce l'entrepreneur, coût d'opportunité du capital).",
    "En perte, l'entreprise continue à court terme si elle couvre ses coûts variables : sa perte reste inférieure aux coûts fixes.",
    "Un dividende n'est pas un coût : c'est une distribution du profit.",
  ],
  questions: [
    (() => {
      const tr = 920000, tvc = 780000, tfc = 300000;
      const tc = tvc + tfc;
      const a = tr - tc;
      return q("ec-be-f1", "facile", "Economic profit (loss) if the firm keeps operating?",
        [["Total revenue", usd(tr)], ["Total variable cost", usd(tvc)], ["Total fixed cost", usd(tfc)]],
        a, "$", 0,
        [`Coût total = ${D(tvc)} + ${D(tfc)} = ${D(tc)}.`,
          `Profit économique = TR − TC = ${D(tr)} − ${D(tc)} = ${D(a)}.`,
          `TR > TVC : la perte (${D(-a)}) reste inférieure aux coûts fixes (${D(tfc)}), l'entreprise continue à court terme.`]);
    })(),
    (() => {
      const tr = 540000, tvc = 610000, tfc = 250000;
      const a = tfc;
      return q("ec-be-f2", "facile", "Loss if the firm shuts down in the short run (as a positive amount)?",
        [["Total revenue", usd(tr)], ["Total variable cost", usd(tvc)], ["Total fixed cost", usd(tfc)]],
        a, "$", 0,
        ["À l'arrêt, l'entreprise ne paie plus ses coûts variables mais reste tenue par ses coûts fixes.",
          `Perte en cas de fermeture = coûts fixes = ${D(a)}.`,
          `En produisant, elle perdrait ${D(tr)} − ${D(tvc + tfc)} = ${D(tr - tvc - tfc)} : TR < TVC, elle doit fermer.`]);
    })(),
    (() => {
      const p = 18, avc = 12, fc = 48000;
      const a = breakevenQty(fc, p, avc);
      return q("ec-be-f3", "facile", "Breakeven quantity?",
        [["Market price (price taker)", usd(p, 2)], ["Average variable cost (constant)", usd(avc, 2)], ["Total fixed cost", usd(fc)]],
        a, "", 0,
        [`Chaque unité couvre P − AVC = ${D(p)} − ${D(avc)} = ${D(p - avc)} de coûts fixes.`,
          `Quantité de breakeven = ${D(fc)} / ${D(p - avc)} = ${F(a, 0)} unités.`]);
    })(),
    (() => {
      const qty = 5000, tfc = 60000, tvc = 90000;
      const a = (tfc + tvc) / qty;
      return q("ec-be-f4", "facile", "Lowest price at which the firm breaks even at this output?",
        [["Output", `${E(qty)} units`], ["Total fixed cost", usd(tfc)], ["Total variable cost", usd(tvc)]],
        a, "$", 2,
        ["Breakeven : P = ATC = (TFC + TVC) / Q.",
          `ATC = (${D(tfc)} + ${D(tvc)}) / ${F(qty)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const qty = 4000, tvc = 52000, tfc = 30000;
      const a = tvc / qty;
      return q("ec-be-f5", "facile", "Price below which the firm should shut down in the short run? (AVC is constant.)",
        [["Output", `${E(qty)} units`], ["Total variable cost", usd(tvc)], ["Total fixed cost", usd(tfc)]],
        a, "$", 2,
        ["Seuil de fermeture à court terme : P = AVC (les coûts fixes ne comptent pas, ils sont dus de toute façon).",
          `AVC = ${D(tvc)} / ${F(qty)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const tr = 640000, tvc = 700000, tfc = 200000;
      const lossOp = tvc + tfc - tr;
      const a = lossOp - tfc;
      return q("ec-be-m1", "moyen", "By how much does shutting down reduce the firm's short-run loss?",
        [["Total revenue", usd(tr)], ["Total variable cost", usd(tvc)], ["Total fixed cost", usd(tfc)]],
        a, "$", 0,
        [`Perte en produisant = TC − TR = ${D(tvc + tfc)} − ${D(tr)} = ${D(lossOp)}.`,
          `Perte à l'arrêt = coûts fixes = ${D(tfc)}.`,
          `Fermer réduit la perte de ${D(lossOp)} − ${D(tfc)} = ${D(a)} (= TVC − TR).`]);
    })(),
    (() => {
      const rev = 500000, explicit = 380000, salary = 70000, capital = 400000, r = 0.08;
      const implicitCap = capital * r;
      const a = rev - explicit - salary - implicitCap;
      return q("ec-be-m2", "moyen", "Economic profit of the owner-managed firm?",
        [["Revenue", usd(rev)], ["Explicit (accounting) costs", usd(explicit)], ["Salary the owner gives up elsewhere", usd(salary)],
          ["Owner's capital invested", usd(capital)], ["Return available on that capital elsewhere", pc(r)]],
        a, "$", 0,
        [`Profit comptable = ${D(rev)} − ${D(explicit)} = ${D(rev - explicit)} (ce n'est pas la réponse).`,
          `Coûts implicites = salaire abandonné ${D(salary)} + coût d'opportunité du capital ${P(r)} × ${D(capital)} = ${D(salary + implicitCap)}.`,
          `Profit économique = ${D(rev - explicit)} − ${D(salary + implicitCap)} = ${D(a)}.`]);
    })(),
    (() => {
      const p = 25, qty = 10000, avc = 19, afc = 8;
      const a = (p - avc - afc) * qty;
      return q("ec-be-m3", "moyen", "Economic profit (loss) at the current output?",
        [["Market price", usd(p, 2)], ["Output", `${E(qty)} units`], ["Average variable cost", usd(avc, 2)], ["Average fixed cost", usd(afc, 2)]],
        a, "$", 0,
        [`ATC = AVC + AFC = ${D(avc)} + ${D(afc)} = ${D(avc + afc)}.`,
          `Profit = (P − ATC) × Q = (${F(p)} − ${F(avc + afc)}) × ${F(qty)} = ${D(a)}.`,
          `P > AVC : l'entreprise couvre ${D((p - avc) * qty)} de coûts fixes et continue à court terme.`]);
    })(),
    (() => {
      const p = 40, avc = 28, fc = 90000, normal = 30000;
      const a = breakevenQty(fc + normal, p, avc);
      return q("ec-be-m4", "moyen", "Output at which the firm earns zero economic profit?",
        [["Market price (price taker)", usd(p, 2)], ["Average variable cost (constant)", usd(avc, 2)],
          ["Explicit fixed costs", usd(fc)], ["Normal profit required by the owners (opportunity cost)", usd(normal)]],
        a, "", 0,
        [`Coûts fixes économiques = ${D(fc)} + profit normal ${D(normal)} = ${D(fc + normal)}.`,
          `Contribution unitaire = ${D(p)} − ${D(avc)} = ${D(p - avc)}.`,
          `Q = ${D(fc + normal)} / ${D(p - avc)} = ${F(a, 0)} unités.`]);
    })(),
    (() => {
      const qty = 12000, p = 15, tvc = 156000, tfc = 54000;
      const tr = p * qty;
      const a = tr - tvc;
      return q("ec-be-m5", "moyen", "How much smaller is the short-run loss from operating than from shutting down?",
        [["Units sold", E(qty)], ["Price", usd(p, 2)], ["Total variable cost", usd(tvc)], ["Total fixed cost", usd(tfc)]],
        a, "$", 0,
        [`TR = ${F(qty)} × ${D(p)} = ${D(tr)} ; perte en produisant = ${D(tvc + tfc)} − ${D(tr)} = ${D(tvc + tfc - tr)}.`,
          `Perte à l'arrêt = coûts fixes = ${D(tfc)}.`,
          `Produire réduit la perte de ${D(a)} (= TR − TVC) : l'entreprise continue à court terme.`]);
    })(),
    (() => {
      const fc = 128, c = 4, d = 0.5, p = 24;
      const qty = (p - c) / (2 * d);
      const tc = fc + c * qty + d * qty * qty;
      const a = p * qty - tc;
      return q("ec-be-d1", "difficile", "Economic profit at the profit-maximizing output?",
        [["Total cost function", `TC = ${E(fc)} + ${E(c)}Q + ${E(d)}Q²`], ["Market price (price taker)", usd(p, 2)]],
        a, "$", 2,
        [`MC = dTC/dQ = ${F(c)} + ${cq(2 * d)} ; en concurrence parfaite, MR = P.`,
          `P = MC : ${F(p)} = ${F(c)} + ${cq(2 * d)}, donc Q = ${F(qty)}.`,
          `TR = ${F(p)} × ${F(qty)} = ${D(p * qty)} ; TC = ${F(fc)} + ${F(c * qty)} + ${F(d * qty * qty)} = ${D(tc)}.`,
          `Profit économique = ${D(a, 2)}.`]);
    })(),
    (() => {
      const fc = 450, c = 6, d = 0.5;
      const qMin = Math.sqrt(fc / d);
      const a = fc / qMin + c + d * qMin;
      return q("ec-be-d2", "difficile", "Lowest price at which the firm can break even?",
        [["Total cost function", `TC = ${E(fc)} + ${E(c)}Q + ${E(d)}Q²`], ["Market structure", "Perfect competition"]],
        a, "$", 2,
        [`ATC = ${F(fc)}/Q + ${F(c)} + ${F(d)}Q ; le breakeven le plus bas est au minimum de l'ATC.`,
          `Minimum quand ${F(fc)}/Q² = ${F(d)}, soit Q = √(${F(fc)} / ${F(d)}) = ${F(qMin)}.`,
          `ATC min = ${F(fc / qMin)} + ${F(c)} + ${F(d * qMin)} = ${D(a, 2)} (c'est aussi le MC à ce niveau : ${F(c)} + ${F(2 * d * qMin)}).`]);
    })(),
    (() => {
      const qs = [100, 200, 300, 400], trs = [5000, 9000, 12000, 14000], tcs = [6000, 8000, 10500, 14500];
      const profits = qs.map((_, i) => trs[i] - tcs[i]);
      const a = Math.max(...profits);
      const best = profits.indexOf(a);
      return q("ec-be-d3", "difficile", "Maximum economic profit the price-searcher firm can earn?",
        [["Output levels", lst(qs.map((x) => E(x)))], ["Total revenue", lst(trs.map((x) => usd(x)))], ["Total cost", lst(tcs.map((x) => usd(x)))]],
        a, "$", 0,
        ["Pour un price searcher (MR ≠ P), on compare directement TR et TC à chaque niveau.",
          `TR − TC : ${profits.map((x, i) => `Q = ${F(qs[i])} → ${D(x)}`).join(" ; ")}.`,
          `Profit maximal à Q = ${F(qs[best])} : ${D(a)}.`]);
    })(),
    (() => {
      const p = 30, c = 6, d = 0.5, fc = 160;
      const disc = Math.sqrt((p - c) * (p - c) - 4 * d * fc);
      const a = (p - c - disc) / (2 * d);
      const q2 = (p - c + disc) / (2 * d);
      return q("ec-be-d4", "difficile", "Lower of the two breakeven output levels (QBE1)?",
        [["Total cost function", `TC = ${E(fc)} + ${E(c)}Q + ${E(d)}Q²`], ["Market price (price taker)", usd(p, 2)]],
        a, "", 1,
        [`Breakeven : TR = TC, soit ${F(p)}Q = ${F(fc)} + ${F(c)}Q + ${F(d)}Q², donc ${F(d)}Q² − ${F(p - c)}Q + ${F(fc)} = 0.`,
          `Discriminant : ${F(p - c)}² − 4 × ${F(d)} × ${F(fc)} = ${F(disc * disc)}, racine ${F(disc)}.`,
          `Q = (${F(p - c)} ± ${F(disc)}) / ${F(2 * d)} : QBE1 = ${F(a, 1)} et QBE2 = ${F(q2, 1)}.`]);
    })(),
    (() => {
      const tr = 2400000, varC = 1700000, fixC = 500000, equity = 3000000, r = 0.1, div = 150000;
      const implicitCap = equity * r;
      const a = tr - varC - fixC - implicitCap;
      return q("ec-be-d5", "difficile", "Economic profit (loss) for the year?",
        [["Total revenue", usd(tr)], ["Variable costs", usd(varC)], ["Explicit fixed costs (incl. depreciation)", usd(fixC)],
          ["Equity capital invested by the owners", usd(equity)], ["Owners' required return on equity", pc(r)], ["Dividends paid", usd(div)]],
        a, "$", 0,
        ["Les dividendes ne sont pas un coût : c'est la donnée à écarter.",
          `Coût implicite du capital = ${P(r)} × ${D(equity)} = ${D(implicitCap)}.`,
          `Profit économique = ${D(tr)} − ${D(varC)} − ${D(fixC)} − ${D(implicitCap)} = ${D(a)}.`,
          "TR > TVC : l'entreprise continue à court terme, mais sortira du marché à long terme si la situation dure."]);
    })(),
  ],
};

/* ────────────────────────── 2 · MR = MC et élasticité ────────────────────────── */

const PROFIT_MAX: CalcType = {
  key: "profit-max-elasticity",
  topic: "economics",
  name: "Prix optimal d'un price searcher (MR = MC) et élasticité",
  tier: "annexe",
  source: "LM 1 · The Firm and Market Structures · approfondissement hors programme",
  formulas: [
    "Profit maximal quand MR = MC (toutes structures de marché)",
    "Demande linéaire P = a − bQ ⇒ MR = a − 2bQ",
    "MR = P × (1 − 1/|E|) ; à l'optimum, P = MC / (1 − 1/|E|)",
    "Élasticité d'arc = (ΔQ / Q moyen) / (ΔP / P moyen)",
    "Élasticité ponctuelle d'une demande Q = A − B·P : |E| = B × P / Q",
  ],
  traps: [
    "Approfondissement : le Level I actuel traite MR = MC qualitativement ; élasticité d'arc, MR = P × (1 − 1/|E|) et perte sèche du monopole viennent de l'ancien programme.",
    "Une demande écrite Q = A − B·P doit d'abord être inversée en P = A/B − Q/B ; en concurrence parfaite MR = P, ailleurs MR < P.",
    "L'élasticité d'arc se calcule sur les moyennes, pas sur le point de départ.",
  ],
  questions: [
    (() => {
      const a0 = 100, b = 2, mc = 20;
      const a = optimalQty(a0, b, mc);
      return q("ec-pm-f1", "facile", "Profit-maximizing output?",
        [["Demand curve", `P = ${E(a0)} − ${E(b)}Q`], ["Marginal cost (constant)", usd(mc, 2)]],
        a, "", 1,
        [`MR = ${F(a0)} − ${cq(2 * b)} (pente double de celle de la demande).`,
          `MR = MC : ${F(a0)} − ${cq(2 * b)} = ${F(mc)}, donc Q = ${F(a0 - mc)} / ${F(2 * b)} = ${F(a, 1)}.`]);
    })(),
    (() => {
      const a0 = 80, b = 0.5, mc = 20;
      const qty = optimalQty(a0, b, mc);
      const a = a0 - b * qty;
      return q("ec-pm-f2", "facile", "Profit-maximizing price?",
        [["Demand curve", `P = ${E(a0)} − ${E(b)}Q`], ["Marginal cost (constant)", usd(mc, 2)]],
        a, "$", 2,
        [`MR = ${F(a0)} − ${cq(2 * b)} = ${F(mc)} ⇒ Q = ${F(qty)}.`,
          `Prix lu sur la demande : P = ${F(a0)} − ${F(b)} × ${F(qty)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const p = 40, e = 2.5;
      const a = mrFromElasticity(p, e);
      return q("ec-pm-f3", "facile", "Marginal revenue at the current price?",
        [["Price", usd(p, 2)], ["Price elasticity of demand (absolute value)", E(e)]],
        a, "$", 2,
        ["MR = P × (1 − 1/|E|).", `= ${F(p)} × (1 − 1/${F(e)}) = ${F(p)} × ${F(1 - 1 / e)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const p0 = 10, p1 = 12, q0 = 500, q1 = 400;
      const a = arcElasticity(p0, p1, q0, q1);
      return q("ec-pm-f4", "facile", "Arc price elasticity of demand (absolute value)?",
        [["Price", `${usd(p0, 2)} → ${usd(p1, 2)}`], ["Quantity demanded", `${E(q0)} → ${E(q1)}`]],
        a, "", 2,
        [`%ΔQ = ${F(q1 - q0)} / ${F((q0 + q1) / 2)} = ${P((q1 - q0) / ((q0 + q1) / 2), 2)}.`,
          `%ΔP = ${F(p1 - p0)} / ${F((p0 + p1) / 2)} = ${P((p1 - p0) / ((p0 + p1) / 2), 2)}.`,
          `|E| = ${F(a, 2)} > 1 : demande élastique.`]);
    })(),
    (() => {
      const mc = 30, e = 4;
      const a = mc / (1 - 1 / e);
      return q("ec-pm-f5", "facile", "Profit-maximizing price?",
        [["Marginal cost", usd(mc, 2)], ["Price elasticity of demand (absolute value)", E(e)]],
        a, "$", 2,
        ["À l'optimum MR = MC, et MR = P × (1 − 1/|E|).", `P = MC / (1 − 1/|E|) = ${F(mc)} / ${F(1 - 1 / e)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const A = 400, Bq = 4, mc = 20;
      const a0 = A / Bq, b = 1 / Bq;
      const qty = optimalQty(a0, b, mc);
      const a = a0 - b * qty;
      return q("ec-pm-m1", "moyen", "Profit-maximizing price?",
        [["Demand curve", `Q = ${E(A)} − ${E(Bq)}P`], ["Marginal cost (constant)", usd(mc, 2)]],
        a, "$", 2,
        [`Demande inverse : P = ${F(a0)} − ${F(b)}Q ; MR = ${F(a0)} − ${cq(2 * b)}.`,
          `MR = MC : Q = (${F(a0)} − ${F(mc)}) / ${F(2 * b)} = ${F(qty)}.`,
          `P = ${F(a0)} − ${F(b)} × ${F(qty)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const a0 = 120, b = 3, mc = 30, fc = 400;
      const qty = optimalQty(a0, b, mc);
      const p = a0 - b * qty;
      const a = (p - mc) * qty - fc;
      return q("ec-pm-m2", "moyen", "Maximum economic profit?",
        [["Demand curve", `P = ${E(a0)} − ${E(b)}Q`], ["Marginal cost (constant)", usd(mc, 2)], ["Fixed cost", usd(fc)]],
        a, "$", 2,
        [`MR = ${F(a0)} − ${cq(2 * b)} = ${F(mc)} ⇒ Q = ${F(qty)} ; P = ${F(a0)} − ${F(b)} × ${F(qty)} = ${D(p)}.`,
          `Profit = (P − MC) × Q − FC = (${F(p)} − ${F(mc)}) × ${F(qty)} − ${F(fc)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const a0 = 100, b = 1, c0 = 10, c1 = 2;
      const qty = (a0 - c0) / (2 * b + c1);
      const a = a0 - b * qty;
      return q("ec-pm-m3", "moyen", "Profit-maximizing price?",
        [["Demand curve", `P = ${E(a0)} − Q`], ["Marginal cost", `MC = ${E(c0)} + ${E(c1)}Q`]],
        a, "$", 2,
        [`MR = ${F(a0)} − ${cq(2 * b)}.`,
          `MR = MC : ${F(a0)} − ${cq(2 * b)} = ${F(c0)} + ${F(c1)}Q ⇒ Q = ${F(a0 - c0)} / ${F(2 * b + c1)} = ${F(qty)}.`,
          `P = ${F(a0)} − ${F(qty)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const a0 = 60, b = 0.5;
      const qty = a0 / (2 * b);
      const a = a0 - b * qty;
      return q("ec-pm-m4", "moyen", "Price that maximizes total revenue?",
        [["Demand curve", `P = ${E(a0)} − ${E(b)}Q`]],
        a, "$", 2,
        ["La recette totale est maximale quand MR = 0 (élasticité unitaire, |E| = 1).",
          `MR = ${F(a0)} − ${cq(2 * b)} = 0 ⇒ Q = ${F(qty)}.`,
          `P = ${F(a0)} − ${F(b)} × ${F(qty)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const A = 500, Bq = 10, p = 30;
      const qty = A - Bq * p;
      const e = (Bq * p) / qty;
      const a = mrFromElasticity(p, e);
      return q("ec-pm-m5", "moyen", "Marginal revenue at a price of $30?",
        [["Demand curve", `Q = ${E(A)} − ${E(Bq)}P`], ["Current price", usd(p, 2)]],
        a, "$", 2,
        [`À P = ${F(p)} : Q = ${F(A)} − ${F(Bq)} × ${F(p)} = ${F(qty)}.`,
          `|E| = ${F(Bq)} × ${F(p)} / ${F(qty)} = ${F(e)}.`,
          `MR = ${F(p)} × (1 − 1/${F(e)}) = ${D(a, 2)} (contrôle : P = ${F(A / Bq)} − ${F(1 / Bq)}Q ⇒ MR = ${F(A / Bq)} − ${F(2 / Bq)} × ${F(qty)}).`]);
    })(),
    (() => {
      const A = 1000, Bq = 20, fc = 2000, mc = 10;
      const a0 = A / Bq, b = 1 / Bq;
      const qty = optimalQty(a0, b, mc);
      const p = a0 - b * qty;
      const a = p * qty - fc - mc * qty;
      return q("ec-pm-d1", "difficile", "Maximum economic profit of the monopolist?",
        [["Demand curve", `Q = ${E(A)} − ${E(Bq)}P`], ["Total cost", `TC = ${E(fc)} + ${E(mc)}Q`]],
        a, "$", 2,
        [`Demande inverse : P = ${F(a0)} − ${F(b)}Q ⇒ MR = ${F(a0)} − ${cq(2 * b)} ; MC = ${F(mc)}.`,
          `MR = MC ⇒ Q = ${F(qty)} ; P = ${D(p)}.`,
          `Profit = ${F(p)} × ${F(qty)} − (${F(fc)} + ${F(mc)} × ${F(qty)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const a0 = 200, b = 2, mc = 40;
      const qm = optimalQty(a0, b, mc);
      const pm = a0 - b * qm;
      const qc = (a0 - mc) / b;
      const a = 0.5 * (pm - mc) * (qc - qm);
      return q("ec-pm-d2", "difficile", "Deadweight loss from monopoly pricing compared with perfect competition?",
        [["Market demand", `P = ${E(a0)} − ${E(b)}Q`], ["Marginal cost (constant)", usd(mc, 2)]],
        a, "$", 2,
        [`Monopole : MR = ${F(a0)} − ${cq(2 * b)} = ${F(mc)} ⇒ Q = ${F(qm)}, P = ${D(pm)}.`,
          `Concurrence parfaite : P = MC = ${F(mc)} ⇒ Q = (${F(a0)} − ${F(mc)}) / ${F(b)} = ${F(qc)}.`,
          `Perte sèche = ½ × (${F(pm)} − ${F(mc)}) × (${F(qc)} − ${F(qm)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const mc = 18, e0 = 2, e1 = 3;
      const p0 = mc / (1 - 1 / e0), p1 = mc / (1 - 1 / e1);
      const a = (p1 / p0 - 1) * 100;
      return q("ec-pm-d3", "difficile", "Percentage change in the profit-maximizing price after demand becomes more elastic?",
        [["Marginal cost (unchanged)", usd(mc, 2)], ["Price elasticity before (absolute value)", E(e0)], ["Price elasticity after (absolute value)", E(e1)]],
        a, "%", 2,
        [`Avant : P = ${F(mc)} / (1 − 1/${F(e0)}) = ${D(p0, 2)}.`,
          `Après : P = ${F(mc)} / (1 − 1/${F(e1)}) = ${D(p1, 2)}.`,
          `Variation = ${F(p1, 2)} / ${F(p0, 2)} − 1 = ${Pa(a)} : plus la demande est élastique, plus la marge se réduit.`]);
    })(),
    (() => {
      const p0 = 25, p1 = 20, q0 = 1200, q1 = 1600, mc = 12;
      const a = arcElasticity(p0, p1, q0, q1);
      return q("ec-pm-d4", "difficile", "Arc price elasticity of demand (absolute value)?",
        [["Price cut", `${usd(p0, 2)} → ${usd(p1, 2)}`], ["Units sold", `${E(q0)} → ${E(q1)}`], ["Marginal cost", usd(mc, 2)]],
        a, "", 2,
        ["Le coût marginal est à écarter ; méthode d'arc = variations rapportées aux moyennes.",
          `%ΔQ = ${F(q1 - q0)} / ${F((q0 + q1) / 2)} = ${P((q1 - q0) / ((q0 + q1) / 2), 2)} ; %ΔP = ${F(p1 - p0)} / ${F((p0 + p1) / 2)} = ${P((p1 - p0) / ((p0 + p1) / 2), 2)}.`,
          `|E| = ${F(a, 2)} > 1 : la baisse de prix augmente la recette (${D(p0 * q0)} → ${D(p1 * q1)}).`]);
    })(),
    (() => {
      const a0 = 90, b = 1.5, fc = 300, d = 1;
      const qty = a0 / (2 * b + 2 * d);
      const p = a0 - b * qty;
      const a = p * qty - (fc + d * qty * qty);
      return q("ec-pm-d5", "difficile", "Maximum economic profit?",
        [["Demand curve", `P = ${E(a0)} − ${E(b)}Q`], ["Total cost", `TC = ${E(fc)} + Q²`]],
        a, "$", 2,
        [`MR = ${F(a0)} − ${cq(2 * b)} ; MC = dTC/dQ = ${cq(2 * d)}.`,
          `MR = MC : ${F(a0)} = ${F(2 * b + 2 * d)}Q ⇒ Q = ${F(qty)} ; P = ${F(a0)} − ${F(b)} × ${F(qty)} = ${D(p)}.`,
          `Profit = ${F(p)} × ${F(qty)} − (${F(fc)} + ${F(qty)}²) = ${F(p * qty)} − ${F(fc + qty * qty)} = ${D(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 3 · Concentration (CR et HHI) ────────────────────────── */

const shareList = (xs: number[]): string => lst(xs.map((s) => pc(s)));
const sq = (xs: number[]): string => xs.map((s) => `${F(s)}²`).join(" + ");

const CONCENTRATION: CalcType = {
  key: "concentration-hhi",
  topic: "economics",
  name: "Concentration du marché : N-firm concentration ratio et HHI",
  tier: "essentiel",
  source: "LM 1 · The Firm and Market Structures",
  formulas: [
    "Concentration ratio (N firmes) = somme des parts de marché des N plus grandes firmes",
    "HHI = Σ (parts de marché)², parts en décimales (0,25² = 0,0625)",
    "N firmes de même taille : HHI = 1/N ; nombre équivalent de firmes = 1 / HHI",
    "Fusion de deux firmes de parts a et b : le HHI du marché augmente de 2ab",
  ],
  traps: [
    "Un HHI « N firmes » ne retient que les N plus grandes firmes.",
    "Après une fusion, reclasser les firmes : une autre firme peut entrer dans le top N.",
    "Aucune des deux mesures ne tient compte des barrières à l'entrée.",
  ],
  questions: [
    (() => {
      const s = [0.25, 0.15, 0.15, 0.1, 0.08, 0.07];
      const top = topN(s, 4);
      const a = sum(top) * 100;
      return q("ec-hhi-f1", "facile", "4-firm concentration ratio?",
        [["Market shares of the six largest firms", shareList(s)], ["Remaining firms", "20% in total, each below 2%"]],
        a, "%", 1,
        ["Concentration ratio = somme des parts des 4 plus grandes firmes.", `CR4 = ${terms(top.map((x) => x * 100), (x) => F(x))} = ${Pa(a, 1)}.`]);
    })(),
    (() => {
      const s = [0.3, 0.2, 0.15, 0.1];
      const a = hhi(s);
      return q("ec-hhi-f2", "facile", "4-firm HHI? (Use market shares as decimals.)",
        [["Market shares of the four largest firms", shareList(s)], ["Remaining firms", "25% in total, many small firms"]],
        a, "", 4,
        [`HHI = ${sq(s)}.`, `= ${s.map((x) => F(x * x, 4)).join(" + ")} = ${F(a, 4)}.`]);
    })(),
    (() => {
      const n = 8;
      const a = 1 / n;
      return q("ec-hhi-f3", "facile", "HHI of the market? (Use market shares as decimals.)",
        [["Number of firms", E(n)], ["Market shares", "All firms have equal shares"]],
        a, "", 4,
        [`Chaque firme a une part de 1/${F(n)} = ${F(1 / n, 4)}.`, `HHI = ${F(n)} × ${F(1 / n, 4)}² = 1/${F(n)} = ${F(a, 4)}.`]);
    })(),
    (() => {
      const total = 2000, rev = [500, 400, 300];
      const a = (sum(rev) / total) * 100;
      return q("ec-hhi-f4", "facile", "3-firm concentration ratio?",
        [["Total market sales ($ millions)", E(total)], ["Sales of the three largest firms ($ millions)", lst(rev.map((x) => E(x)))]],
        a, "%", 1,
        [`Ventes des 3 premières = ${terms(rev, (x) => F(x))} = ${F(sum(rev))}.`, `CR3 = ${F(sum(rev))} / ${F(total)} = ${Pa(a, 1)}.`]);
    })(),
    (() => {
      const s = [0.4, 0.25, 0.15, 0.12, 0.08];
      const a = hhi(s);
      return q("ec-hhi-f5", "facile", "HHI of the whole market? (Use market shares as decimals.)",
        [["Market shares of the five firms in the market", shareList(s)]],
        a, "", 4,
        [`HHI = ${sq(s)}.`, `= ${s.map((x) => F(x * x, 4)).join(" + ")} = ${F(a, 4)}.`]);
    })(),
    (() => {
      const s = [0.22, 0.18, 0.14, 0.12, 0.09, 0.08];
      const after = topN(merge(s, 0, 3), 4);
      const a = hhi(after);
      return q("ec-hhi-m1", "moyen", "4-firm HHI after firms 1 and 4 merge? (Shares as decimals.)",
        [["Market shares, firms 1 to 6", shareList(s)], ["Remaining firms", "17% in total, each below 2%"], ["Merger", "Firm 1 acquires firm 4"]],
        a, "", 4,
        [`Nouvelle firme = ${pc(s[0])} + ${pc(s[3])} = ${pc(s[0] + s[3])} ; nouveau top 4 : ${shareList(after)}.`,
          `HHI = ${sq(after)} = ${F(a, 4)} (avant : ${F(hhi(topN(s, 4)), 4)}).`]);
    })(),
    (() => {
      const s = [0.2, 0.18, 0.15, 0.12, 0.1, 0.09];
      const after = topN(merge(s, 1, 2), 4);
      const a = sum(after) * 100;
      return q("ec-hhi-m2", "moyen", "4-firm concentration ratio after firms 2 and 3 merge?",
        [["Market shares, firms 1 to 6", shareList(s)], ["Remaining firms", "16% in total, each below 2%"]],
        a, "%", 1,
        [`Firme fusionnée = ${pc(s[1])} + ${pc(s[2])} = ${pc(s[1] + s[2])} ; nouveau top 4 : ${shareList(after)}.`,
          `CR4 = ${Pa(a, 1)} (avant : ${Pa(sum(topN(s, 4)) * 100, 1)}) : la firme 5 entre dans le top 4.`]);
    })(),
    (() => {
      const sa = 0.12, sb = 0.09;
      const a = 2 * sa * sb;
      return q("ec-hhi-m3", "moyen", "Increase in the market HHI if the two firms merge? (Shares as decimals.)",
        [["Market share of firm A", pc(sa)], ["Market share of firm B", pc(sb)], ["Other firms", "Unchanged by the merger"]],
        a, "", 4,
        [`Avant : ${F(sa)}² + ${F(sb)}² ; après : (${F(sa)} + ${F(sb)})² = ${F(sa)}² + ${F(sb)}² + 2 × ${F(sa)} × ${F(sb)}.`,
          `ΔHHI = 2 × ${F(sa)} × ${F(sb)} = ${F(a, 4)}.`]);
    })(),
    (() => {
      const total = 3000, rev = [600, 450, 300, 150];
      const s = rev.map((x) => x / total);
      const a = hhi(s);
      return q("ec-hhi-m4", "moyen", "4-firm HHI? (Shares as decimals.)",
        [["Total industry sales ($ millions)", E(total)], ["Sales of the four largest firms ($ millions)", lst(rev.map((x) => E(x)))]],
        a, "", 4,
        [`Parts de marché : ${s.map((x) => F(x, 4)).join(" ; ")}.`, `HHI = ${sq(s)} = ${F(a, 4)}.`]);
    })(),
    (() => {
      const h = 0.16;
      const a = 1 / h;
      return q("ec-hhi-m5", "moyen", "Number of equal-sized firms that would give the same HHI?",
        [["Market HHI (shares as decimals)", E(h)]],
        a, "", 2,
        ["Avec N firmes égales, HHI = 1/N, donc N = 1 / HHI.", `N = 1 / ${F(h)} = ${F(a, 2)} firmes équivalentes.`]);
    })(),
    (() => {
      const s = [0.24, 0.2, 0.16, 0.12, 0.1, 0.08, 0.06, 0.04];
      const before = hhi(topN(s, 4));
      const afterTop = topN(merge(s, 4, 5), 4);
      const after = hhi(afterTop);
      const a = after - before;
      return q("ec-hhi-d1", "difficile", "Change in the 4-firm HHI if firms 5 and 6 merge? (Shares as decimals.)",
        [["Market shares, firms 1 to 8 (whole market)", shareList(s)]],
        a, "", 4,
        [`Avant : top 4 = ${shareList(topN(s, 4))}, HHI = ${F(before, 4)}.`,
          `Fusion : ${pc(s[4])} + ${pc(s[5])} = ${pc(s[4] + s[5])}, qui devient la 3e firme ; top 4 = ${shareList(afterTop)}.`,
          `HHI après = ${sq(afterTop)} = ${F(after, 4)} ; variation = ${F(a, 4)}.`]);
    })(),
    (() => {
      const s = [0.3, 0.18, 0.14, 0.1, 0.09, 0.08, 0.06, 0.05];
      const before = sum(topN(s, 4)) * 100;
      const afterTop = topN(merge(s, 4, 6), 4);
      const after = sum(afterTop) * 100;
      const a = after - before;
      return q("ec-hhi-d2", "difficile", "Change in the 4-firm concentration ratio, in percentage points, if firms 5 and 7 merge?",
        [["Market shares, firms 1 to 8 (whole market)", shareList(s)]],
        a, "%", 1,
        [`Avant : CR4 = ${Pa(before, 1)}.`,
          `Fusion : ${pc(s[4])} + ${pc(s[6])} = ${pc(s[4] + s[6])} ; nouveau top 4 : ${shareList(afterTop)}, CR4 = ${Pa(after, 1)}.`,
          `Variation = ${F(a, 1)} points de pourcentage.`]);
    })(),
    (() => {
      const big = [0.3, 0.3], nSmall = 8;
      const small = (1 - sum(big)) / nSmall;
      const all = [...big, ...Array.from({ length: nSmall }, () => small)];
      const a = hhi(all);
      return q("ec-hhi-d3", "difficile", "HHI of the whole market? (Shares as decimals.)",
        [["Two largest firms", shareList(big)], ["Other firms", `${nSmall} firms sharing the rest of the market equally`]],
        a, "", 4,
        [`Part de chaque petite firme = (1 − ${F(sum(big))}) / ${F(nSmall)} = ${F(small, 4)}.`,
          `HHI = ${sq(big)} + ${F(nSmall)} × ${F(small, 4)}² = ${F(hhi(big), 4)} + ${F(nSmall * small * small, 4)} = ${F(a, 4)}.`]);
    })(),
    (() => {
      const total = 1500, ra = 180, rb = 120;
      const sa = ra / total, sb = rb / total;
      const a = 2 * sa * sb;
      return q("ec-hhi-d4", "difficile", "Increase in the market HHI if A and B merge? (Shares as decimals.)",
        [["Total market sales ($ millions)", E(total)], ["Sales of firm A ($ millions)", E(ra)], ["Sales of firm B ($ millions)", E(rb)],
          ["4-firm concentration ratio before the merger", "58%"]],
        a, "", 4,
        ["Le ratio de concentration est inutile ici.",
          `Parts : A = ${F(ra)} / ${F(total)} = ${F(sa, 4)} ; B = ${F(rb)} / ${F(total)} = ${F(sb, 4)}.`,
          `ΔHHI = 2 × ${F(sa, 4)} × ${F(sb, 4)} = ${F(a, 4)}.`]);
    })(),
    (() => {
      const n = 10;
      const s = Array.from({ length: n }, () => 1 / n);
      const after = merge(s, 0, 1);
      const h = hhi(after);
      const a = 1 / h;
      return q("ec-hhi-d5", "difficile", "Equivalent number of equal-sized firms after two of the firms merge?",
        [["Number of firms before the merger", E(n)], ["Market shares before the merger", "Equal"]],
        a, "", 2,
        [`Avant : ${F(n)} firmes de ${F(1 / n, 2)} ; après : 1 firme de ${F(2 / n, 2)} et ${F(n - 2)} de ${F(1 / n, 2)}.`,
          `HHI = ${F(2 / n, 2)}² + ${F(n - 2)} × ${F(1 / n, 2)}² = ${F(h, 4)}.`,
          `Nombre équivalent = 1 / ${F(h, 4)} = ${F(a, 2)} firmes (et non ${F(n - 1)}).`]);
    })(),
  ],
};

/* ────────────────────────── 4 · Multiplicateur budgétaire ────────────────────────── */

const kStr = (mpc: number, t: number): string => `1 / [1 − ${F(mpc)} × (1 − ${F(t)})] = 1 / ${F(1 - mpc * (1 - t))}`;

const FISCAL: CalcType = {
  key: "fiscal-multiplier",
  topic: "economics",
  name: "Multiplicateur budgétaire (fiscal multiplier)",
  tier: "essentiel",
  top: true,
  source: "LM 3 · Fiscal Policy",
  formulas: [
    "Multiplicateur budgétaire = 1 / [1 − MPC × (1 − t)]",
    "ΔAD (dépenses publiques) = multiplicateur × ΔG",
    "ΔAD (impôts) = − MPC × multiplicateur × ΔT ; transferts : + MPC × multiplicateur × ΔTR",
    "Budget équilibré (ΔG = ΔT) : effet net positif = (1 − MPC) × multiplicateur × ΔG",
  ],
  traps: [
    "MPS = 1 − MPC : ne pas mettre la propension à épargner dans la formule.",
    "Une hausse d'impôts ne réduit la consommation que de MPC × ΔT au premier tour.",
    "Un taux d'imposition plus élevé réduit le multiplicateur.",
  ],
  questions: [
    (() => {
      const mpc = 0.8, t = 0.25;
      const a = fiscalMultiplier(mpc, t);
      return q("ec-fm-f1", "facile", "Fiscal multiplier?",
        [["Marginal propensity to consume (MPC)", E(mpc)], ["Tax rate", pc(t)]],
        a, "x", 2,
        [`Multiplicateur = ${kStr(mpc, t)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const dG = 40, mpc = 0.75, t = 0.2;
      const k = fiscalMultiplier(mpc, t);
      const a = k * dG;
      return q("ec-fm-f2", "facile", "Potential increase in aggregate demand ($ billions)?",
        [["Increase in government spending", bn(dG)], ["MPC", E(mpc)], ["Tax rate", pc(t)]],
        a, "$", 2,
        [`Multiplicateur = ${kStr(mpc, t)} = ${F(k)}.`, `ΔAD = ${F(k)} × ${B(dG)} = ${B(a, 2)}.`]);
    })(),
    (() => {
      const mpc = 0.9, t = 0;
      const a = fiscalMultiplier(mpc, t);
      return q("ec-fm-f3", "facile", "Fiscal multiplier in an economy without income taxes?",
        [["MPC", E(mpc)], ["Income tax rate", pc(t)]],
        a, "x", 2,
        [`Sans impôt proportionnel, multiplicateur = 1 / (1 − MPC) = 1 / ${F(1 - mpc)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const dT = 20, mpc = 0.8, t = 0.25;
      const k = fiscalMultiplier(mpc, t);
      const a = -mpc * k * dT;
      return q("ec-fm-f4", "facile", "Change in aggregate demand caused by the tax increase ($ billions)?",
        [["Increase in taxes", bn(dT)], ["MPC", E(mpc)], ["Tax rate", pc(t)]],
        a, "$", 2,
        [`Multiplicateur = ${kStr(mpc, t)} = ${F(k, 2)}.`,
          `Premier tour : la consommation baisse de ${F(mpc)} × ${B(dT)} = ${B(mpc * dT)}.`,
          `ΔAD = −${F(mpc)} × ${F(k, 2)} × ${F(dT)} = ${B(a, 2)}.`]);
    })(),
    (() => {
      const mps = 0.25, t = 0.1;
      const mpc = 1 - mps;
      const a = fiscalMultiplier(mpc, t);
      return q("ec-fm-f5", "facile", "Fiscal multiplier?",
        [["Marginal propensity to save (MPS)", E(mps)], ["Tax rate", pc(t)]],
        a, "x", 2,
        [`MPC = 1 − MPS = 1 − ${F(mps)} = ${F(mpc)}.`, `Multiplicateur = ${kStr(mpc, t)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const dG = 100, dT = 100, mpc = 0.8, t = 0.25;
      const k = fiscalMultiplier(mpc, t);
      const a = k * dG - mpc * k * dT;
      return q("ec-fm-m1", "moyen", "Net change in aggregate demand ($ billions)?",
        [["Increase in government spending", bn(dG)], ["Increase in taxes", bn(dT)], ["MPC", E(mpc)], ["Tax rate", pc(t)]],
        a, "$", 2,
        [`Multiplicateur = ${kStr(mpc, t)} = ${F(k, 2)}.`,
          `Dépenses : + ${F(k, 2)} × ${F(dG)} = ${B(k * dG, 2)} ; impôts : − ${F(mpc)} × ${F(k, 2)} × ${F(dT)} = −${B(mpc * k * dT, 2)}.`,
          `Effet net = ${B(a, 2)} : le multiplicateur de budget équilibré est positif.`]);
    })(),
    (() => {
      const gap = 60, mpc = 0.7, t = 0.2;
      const k = fiscalMultiplier(mpc, t);
      const a = gap / k;
      return q("ec-fm-m2", "moyen", "Increase in government spending needed to close the recessionary gap ($ billions)?",
        [["Recessionary gap (shortfall of aggregate demand)", bn(gap)], ["MPC", E(mpc)], ["Tax rate", pc(t)]],
        a, "$", 2,
        [`Multiplicateur = ${kStr(mpc, t)} = ${F(k)}.`, `ΔG = écart / multiplicateur = ${F(gap)} / ${F(k)} = ${B(a, 2)}.`]);
    })(),
    (() => {
      const dG = 30, mpc = 0.75, t = 0.25;
      const a = dG / mpc;
      return q("ec-fm-m3", "moyen", "Tax increase that would leave aggregate demand unchanged ($ billions)?",
        [["Increase in government spending", bn(dG)], ["MPC", E(mpc)], ["Tax rate", pc(t)]],
        a, "$", 2,
        ["Il faut k × ΔG = MPC × k × ΔT : le multiplicateur s'annule, le taux d'imposition est inutile.",
          `ΔT = ΔG / MPC = ${F(dG)} / ${F(mpc)} = ${B(a, 2)}.`]);
    })(),
    (() => {
      const dTR = 15, mpc = 0.85, t = 0.3;
      const k = fiscalMultiplier(mpc, t);
      const a = mpc * k * dTR;
      return q("ec-fm-m4", "moyen", "Potential increase in aggregate demand from the higher transfer payments ($ billions)?",
        [["Increase in transfer payments", bn(dTR)], ["MPC", E(mpc)], ["Tax rate", pc(t)]],
        a, "$", 2,
        ["Un transfert agit comme une baisse d'impôt : seule la part consommée entre dans la demande.",
          `Multiplicateur = ${kStr(mpc, t)} = ${F(k)}.`,
          `ΔAD = ${F(mpc)} × ${F(k)} × ${F(dTR)} = ${B(a, 2)}.`]);
    })(),
    (() => {
      const dG = -25, mps = 0.2, t = 0.25;
      const mpc = 1 - mps;
      const k = fiscalMultiplier(mpc, t);
      const a = k * dG;
      return q("ec-fm-m5", "moyen", "Change in aggregate demand from the spending cut ($ billions)?",
        [["Change in government spending", bn(dG)], ["Marginal propensity to save", E(mps)], ["Tax rate", pc(t)]],
        a, "$", 2,
        [`MPC = 1 − ${F(mps)} = ${F(mpc)} ; multiplicateur = ${kStr(mpc, t)} = ${F(k, 2)}.`, `ΔAD = ${F(k, 2)} × (${B(dG)}) = ${B(a, 2)}.`]);
    })(),
    (() => {
      const dG = 40, taxCut = 30, mpc = 0.8, t = 0.25, rate = 0.03;
      const k = fiscalMultiplier(mpc, t);
      const a = k * dG + mpc * k * taxCut;
      return q("ec-fm-d1", "difficile", "Total potential increase in aggregate demand from the package ($ billions)?",
        [["Increase in government spending", bn(dG)], ["Tax cut", bn(taxCut)], ["MPC", E(mpc)], ["Tax rate", pc(t)], ["Central bank policy rate", pc(rate)]],
        a, "$", 2,
        ["Le taux directeur est à écarter.",
          `Multiplicateur = ${kStr(mpc, t)} = ${F(k, 2)}.`,
          `Dépenses : ${F(k, 2)} × ${F(dG)} = ${B(k * dG, 2)} ; baisse d'impôts : ${F(mpc)} × ${F(k, 2)} × ${F(taxCut)} = ${B(mpc * k * taxCut, 2)}.`,
          `Total = ${B(a, 2)}.`]);
    })(),
    (() => {
      const target = 90, mpc = 0.75, t = 0.2;
      const k = fiscalMultiplier(mpc, t);
      const a = target / (mpc * k);
      return q("ec-fm-d2", "difficile", "Tax cut needed to raise aggregate demand by the target amount ($ billions)?",
        [["Targeted increase in aggregate demand", bn(target)], ["MPC", E(mpc)], ["Tax rate", pc(t)]],
        a, "$", 2,
        [`Multiplicateur = ${kStr(mpc, t)} = ${F(k, 2)}.`,
          `Une baisse d'impôts de ΔT augmente la demande de MPC × k × ΔT = ${F(mpc * k, 4)} × ΔT.`,
          `ΔT = ${F(target)} / ${F(mpc * k, 4)} = ${B(a, 2)} (plus qu'une hausse de dépenses : ${B(target / k, 2)}).`]);
    })(),
    (() => {
      const dG = 100, mpc = 0.8, t0 = 0.2, t1 = 0.3;
      const k0 = fiscalMultiplier(mpc, t0), k1 = fiscalMultiplier(mpc, t1);
      const a = (k0 - k1) * dG;
      return q("ec-fm-d3", "difficile", "Reduction in the aggregate demand impact of the spending program if the tax rate rises ($ billions)?",
        [["Increase in government spending", bn(dG)], ["MPC", E(mpc)], ["Tax rate before", pc(t0)], ["Tax rate after", pc(t1)]],
        a, "$", 2,
        [`Avant : k = ${kStr(mpc, t0)} = ${F(k0)} ⇒ ΔAD = ${B(k0 * dG, 2)}.`,
          `Après : k = ${kStr(mpc, t1)} = ${F(k1)} ⇒ ΔAD = ${B(k1 * dG, 2)}.`,
          `Effet réduit de ${B(a, 2)}.`]);
    })(),
    (() => {
      const dG = 200, mpc = 0.9, t = 0.3;
      const r = mpc * (1 - t);
      const rounds = [dG, dG * r, dG * r * r];
      const a = sum(rounds);
      return q("ec-fm-d4", "difficile", "Increase in aggregate demand after the first three rounds of spending ($ billions; count the initial government spending as the first round)?",
        [["Increase in government spending", bn(dG)], ["MPC", E(mpc)], ["Tax rate", pc(t)]],
        a, "$", 2,
        [`Le 1er tour est la dépense publique elle-même (${B(dG)}) ; à chaque tour suivant, la dépense est multipliée par MPC × (1 − t) = ${F(mpc)} × ${F(1 - t)} = ${F(r)}.`,
          `Tours : ${rounds.map((x) => F(x, 2)).join(" ; ")}.`,
          `Somme des trois premiers tours = ${B(a, 2)} (effet total à terme : ${F(dG)} / (1 − ${F(r)}) = ${B(dG / (1 - r), 2)}).`]);
    })(),
    (() => {
      const dG = 60, dT = 70, mpc = 0.8, t = 0.25, mps = 0.2;
      const k = fiscalMultiplier(mpc, t);
      const a = k * dG - mpc * k * dT;
      return q("ec-fm-d5", "difficile", "Net change in aggregate demand ($ billions)?",
        [["Increase in government spending", bn(dG)], ["Increase in taxes", bn(dT)], ["MPC", E(mpc)], ["MPS", E(mps)], ["Tax rate", pc(t)]],
        a, "$", 2,
        ["La MPS est redondante (1 − MPC) : elle n'entre pas dans le calcul.",
          `Multiplicateur = ${kStr(mpc, t)} = ${F(k, 2)}.`,
          `Dépenses : ${F(k, 2)} × ${F(dG)} = ${B(k * dG, 2)} ; impôts : −${F(mpc)} × ${F(k, 2)} × ${F(dT)} = −${B(mpc * k * dT, 2)}.`,
          `Effet net = ${B(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 5 · Taux neutre ────────────────────────── */

const NEUTRAL: CalcType = {
  key: "neutral-rate",
  topic: "economics",
  name: "Taux neutre et orientation de la politique monétaire",
  tier: "essentiel",
  source: "LM 4 · Monetary Policy",
  formulas: [
    "Taux neutre = croissance réelle tendancielle + cible d'inflation",
    "Taux directeur > taux neutre : politique restrictive ; < taux neutre : expansionniste",
    "Taux réel ≈ taux nominal − inflation anticipée ; exact : (1 + nominal) / (1 + inflation) − 1",
    "Cible implicite = taux neutre − croissance tendancielle ; écart au neutre (bp) = (taux directeur − taux neutre) × 10 000",
  ],
  traps: [
    "Le taux neutre se calcule avec la cible d'inflation, pas avec l'inflation courante.",
    "La croissance retenue est la tendance réelle de long terme, pas la croissance du dernier trimestre.",
  ],
  questions: [
    (() => {
      const trend = 0.025, target = 0.02;
      const a = (trend + target) * 100;
      return q("ec-nr-f1", "facile", "Neutral policy rate?",
        [["Real trend rate of economic growth", pc(trend)], ["Inflation target", pc(target)]],
        a, "%", 2,
        [`Taux neutre = ${P(trend)} + ${P(target)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const policy = 0.0525, trend = 0.02, target = 0.02;
      const neutral = trend + target;
      const a = (policy - neutral) * 10000;
      return q("ec-nr-f2", "facile", "Policy rate minus neutral rate, in basis points?",
        [["Policy rate", pc(policy)], ["Real trend growth", pc(trend)], ["Inflation target", pc(target)]],
        a, "bp", 0,
        [`Taux neutre = ${P(trend)} + ${P(target)} = ${P(neutral)}.`,
          `Écart = ${P(policy)} − ${P(neutral)} = ${F(a, 0)} bp > 0 : politique restrictive.`]);
    })(),
    (() => {
      const nominal = 0.045, infl = 0.03;
      const a = (nominal - infl) * 100;
      return q("ec-nr-f3", "facile", "Approximate real policy rate?",
        [["Nominal policy rate", pc(nominal)], ["Expected inflation", pc(infl)]],
        a, "%", 2,
        [`Taux réel ≈ ${P(nominal)} − ${P(infl)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const neutral = 0.04, trend = 0.0175;
      const a = (neutral - trend) * 100;
      return q("ec-nr-f4", "facile", "Inflation target implied by the central bank's neutral rate estimate?",
        [["Estimated neutral policy rate", pc(neutral)], ["Real trend growth", pc(trend)]],
        a, "%", 2,
        [`Cible = taux neutre − croissance tendancielle = ${P(neutral)} − ${P(trend)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const neutral = 0.0375, target = 0.02;
      const a = (neutral - target) * 100;
      return q("ec-nr-f6", "facile", "Real trend growth implied by the central bank's neutral rate estimate?",
        [["Estimated neutral policy rate", pc(neutral)], ["Inflation target", pc(target)]],
        a, "%", 2,
        [`Taux neutre = croissance tendancielle + cible d'inflation.`,
          `Croissance tendancielle = ${P(neutral)} − ${P(target)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const trend = 0.022, target = 0.02, current = 0.045, gdpQ = 0.008;
      const a = (trend + target) * 100;
      return q("ec-nr-m1", "moyen", "Neutral policy rate?",
        [["Real trend growth", pc(trend)], ["Inflation target", pc(target)], ["Current inflation", pc(current)], ["Real GDP growth last quarter (annualized)", pc(gdpQ)]],
        a, "%", 2,
        ["Inflation courante et croissance du trimestre sont à écarter.", `Taux neutre = ${P(trend)} + ${P(target)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const policy = 0.015, trend = 0.018, target = 0.02;
      const a = (trend + target - policy) * 10000;
      return q("ec-nr-m2", "moyen", "Change in the policy rate (bp) needed to reach a neutral stance?",
        [["Current policy rate", pc(policy)], ["Real trend growth", pc(trend)], ["Inflation target", pc(target)]],
        a, "bp", 0,
        [`Taux neutre = ${P(trend)} + ${P(target)} = ${P(trend + target)}.`,
          `Hausse nécessaire = ${P(trend + target)} − ${P(policy)} = ${F(a, 0)} bp (la politique actuelle est expansionniste).`]);
    })(),
    (() => {
      const nominal = 0.06, infl = 0.035;
      const a = fisherReal(nominal, infl) * 100;
      return q("ec-nr-m3", "moyen", "Real policy rate? (Use the exact Fisher relation.)",
        [["Nominal policy rate", pc(nominal)], ["Expected inflation", pc(infl)]],
        a, "%", 2,
        ["(1 + nominal) = (1 + réel) × (1 + inflation).",
          `Réel = ${F(1 + nominal)} / ${F(1 + infl)} − 1 = ${Pa(a)} (l'approximation donnerait ${P(nominal - infl)}).`]);
    })(),
    (() => {
      const trend0 = 0.02, trend1 = 0.016, target0 = 0.02, target1 = 0.025;
      const n0 = trend0 + target0, n1 = trend1 + target1;
      const a = (n1 - n0) * 10000;
      return q("ec-nr-m6", "moyen", "Change in the neutral policy rate after the revisions, in basis points?",
        [["Real trend growth estimate", `${pc(trend0)} → ${pc(trend1)}`], ["Inflation target", `${pc(target0)} → ${pc(target1)}`]],
        a, "bp", 0,
        [`Avant : taux neutre = ${P(trend0)} + ${P(target0)} = ${P(n0)}.`,
          `Après : taux neutre = ${P(trend1)} + ${P(target1)} = ${P(n1)}.`,
          `Variation = ${P(n1)} − ${P(n0)} = ${F(a, 0)} bp : la hausse de la cible compense plus que la baisse de la croissance tendancielle.`]);
    })(),
    (() => {
      const policy = 0.03, expInfl = 0.025, trend = 0.015;
      const realPolicy = policy - expInfl;
      const a = (realPolicy - trend) * 10000;
      return q("ec-nr-m5", "moyen", "Real policy rate minus real neutral rate, in basis points? (Use approximations.)",
        [["Nominal policy rate", pc(policy)], ["Expected inflation (= target)", pc(expInfl)], ["Real trend growth", pc(trend)]],
        a, "bp", 0,
        [`Taux directeur réel ≈ ${P(policy)} − ${P(expInfl)} = ${P(realPolicy)}.`,
          `Taux neutre réel = croissance tendancielle = ${P(trend)}.`,
          `Écart = ${F(a, 0)} bp : politique expansionniste.`]);
    })(),
    (() => {
      const lo = 0.0325, hi = 0.0375, trend = 0.022, target = 0.02, current = 0.029, bond = 0.041;
      const policy = (lo + hi) / 2;
      const a = (policy - trend - target) * 10000;
      return q("ec-nr-d1", "difficile", "Policy rate minus neutral rate, in basis points? (Use the midpoint of the target range.)",
        [["Policy rate target range", `${pc(lo)}–${pc(hi)}`], ["Real trend growth", pc(trend)], ["Inflation target", pc(target)],
          ["Current inflation", pc(current)], ["10-year government bond yield", pc(bond)]],
        a, "bp", 0,
        ["L'inflation courante et le rendement à 10 ans sont à écarter.",
          `Taux directeur = milieu de la fourchette = (${P(lo)} + ${P(hi)}) / 2 = ${P(policy)}.`,
          `Taux neutre = ${P(trend)} + ${P(target)} = ${P(trend + target)}.`,
          `Écart = ${P(policy)} − ${P(trend + target)} = ${F(a, 0)} bp : politique expansionniste.`]);
    })(),
    (() => {
      const policy = 0.0275, lo = 0.01, hi = 0.03, trend = 0.019, current = 0.041;
      const target = (lo + hi) / 2;
      const a = (trend + target - policy) * 10000;
      return q("ec-nr-d6", "difficile", "Change in the policy rate (bp) needed to reach a neutral stance?",
        [["Current policy rate", pc(policy)], ["Inflation target band (the central bank aims at the midpoint)", `${pc(lo)}–${pc(hi)}`],
          ["Real trend growth", pc(trend)], ["Current inflation", pc(current)]],
        a, "bp", 0,
        ["L'inflation courante est à écarter : le taux neutre se calcule avec la cible.",
          `Cible = milieu de la bande = (${P(lo)} + ${P(hi)}) / 2 = ${P(target)}.`,
          `Taux neutre = ${P(trend)} + ${P(target)} = ${P(trend + target)}.`,
          `Hausse nécessaire = ${P(trend + target)} − ${P(policy)} = ${F(a, 0)} bp (la politique actuelle est expansionniste).`]);
    })(),
    (() => {
      const nominal = 0.055, infl = 0.03, target = 0.02, trend = 0.018;
      const real = fisherReal(nominal, infl);
      const a = (real - trend) * 10000;
      return q("ec-nr-d7", "difficile", "Real policy rate minus real neutral rate, in basis points? (Use the exact Fisher relation for the real policy rate.)",
        [["Nominal policy rate", pc(nominal)], ["Expected inflation", pc(infl)], ["Inflation target", pc(target)], ["Real trend growth", pc(trend)]],
        a, "bp", 0,
        [`Taux directeur réel exact = ${F(1 + nominal)} / ${F(1 + infl)} − 1 = ${P(real, 4)}.`,
          `Taux neutre réel = croissance tendancielle = ${P(trend)} (la cible d'inflation ne sert qu'au taux neutre nominal).`,
          `Écart = ${P(real, 4)} − ${P(trend)} = ${F(a, 0)} bp : politique restrictive (l'approximation donnerait ${F((nominal - infl - trend) * 10000, 0)} bp).`]);
    })(),
    (() => {
      const unemp = 0.04, current = 0.05, target = 0.02, trend = 0.0175, lastQ = 0.031, policy = 0.055;
      const a = (policy - trend - target) * 10000;
      return q("ec-nr-d4", "difficile", "Policy rate minus neutral rate, in basis points?",
        [["Unemployment rate", pc(unemp)], ["Current inflation", pc(current)], ["Inflation target", pc(target)],
          ["Real trend growth", pc(trend)], ["Real GDP growth last quarter", pc(lastQ)], ["Policy rate", pc(policy)]],
        a, "bp", 0,
        ["Seules la croissance tendancielle et la cible d'inflation définissent le taux neutre ; chômage, inflation courante et croissance du trimestre sont à écarter.",
          `Taux neutre = ${P(trend)} + ${P(target)} = ${P(trend + target)}.`,
          `Écart = ${P(policy)} − ${P(trend + target)} = ${F(a, 0)} bp : politique restrictive.`]);
    })(),
    (() => {
      const policy = 0.0425, gap = 50, trend = 0.0175;
      const neutral = policy - gap / 10000;
      const a = (neutral - trend) * 100;
      return q("ec-nr-d5", "difficile", "Inflation target implied by the central bank's statement?",
        [["Policy rate", pc(policy)], ["Central bank statement", `Policy rate is ${E(gap)} bp above neutral`], ["Real trend growth", pc(trend)]],
        a, "%", 2,
        [`Taux neutre = ${P(policy)} − ${F(gap)} bp = ${P(neutral)}.`,
          `Cible d'inflation = ${P(neutral)} − ${P(trend)} = ${Pa(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 6 · Solde commercial ────────────────────────── */

const TRADE_BALANCE: CalcType = {
  key: "trade-balance-identity",
  topic: "economics",
  name: "Solde commercial, épargne et investissement",
  tier: "annexe",
  source: "LM 7 · Capital Flows and the FX Market",
  formulas: [
    "X − M = (S − I) + (T − G)",
    "S : épargne privée = Y − C − T ; T − G : solde budgétaire (épargne publique)",
    "Y = C + I + G + (X − M)",
    "Un déficit commercial est financé par des entrées nettes de capitaux de même montant",
  ],
  traps: [
    "Un déficit budgétaire (T − G < 0) creuse le solde extérieur si l'épargne et l'investissement privés ne bougent pas.",
    "Ne pas confondre épargne privée (S) et épargne nationale (S + T − G).",
  ],
  questions: [
    (() => {
      const s = 500, i = 450, t = 300, g = 380;
      const a = s - i + (t - g);
      return q("ec-tb-f1", "facile", "Trade balance (X − M), $ billions?",
        [["Private saving", bn(s)], ["Private investment", bn(i)], ["Tax revenue", bn(t)], ["Government spending", bn(g)]],
        a, "$", 0,
        [`X − M = (S − I) + (T − G) = (${F(s)} − ${F(i)}) + (${F(t)} − ${F(g)}).`, `= ${F(s - i)} ${MINUS} ${F(g - t)} = ${B(a)}.`]);
    })(),
    (() => {
      const nx = -40, s = 600, i = 580;
      const a = nx - (s - i);
      return q("ec-tb-f2", "facile", "Government budget balance (T − G), $ billions?",
        [["Trade balance (X − M)", bn(nx)], ["Private saving", bn(s)], ["Private investment", bn(i)]],
        a, "$", 0,
        [`T − G = (X − M) − (S − I) = ${F(nx)} − ${F(s - i)} = ${B(a)} : déficit budgétaire.`]);
    })(),
    (() => {
      const s = 300, i = 340, fb = -25;
      const nx = s - i + fb;
      const a = -nx;
      return q("ec-tb-f3", "facile", "Net capital inflow needed to finance the trade deficit ($ billions)?",
        [["Private saving", bn(s)], ["Private investment", bn(i)], ["Government budget balance (T − G)", bn(fb)]],
        a, "$", 0,
        [`X − M = (${F(s)} − ${F(i)}) + (${F(fb)}) = ${B(nx)}.`, `Les entrées nettes de capitaux compensent le déficit : ${B(a)}.`]);
    })(),
    (() => {
      const nx = 30, s = 520, t = 410, g = 400;
      const a = s + (t - g) - nx;
      return q("ec-tb-f4", "facile", "Private investment ($ billions)?",
        [["Trade surplus (X − M)", bn(nx)], ["Private saving", bn(s)], ["Tax revenue", bn(t)], ["Government spending", bn(g)]],
        a, "$", 0,
        [`I = S + (T − G) − (X − M) = ${F(s)} + ${F(t - g)} − ${F(nx)} = ${B(a)}.`]);
    })(),
    (() => {
      const nx = 0, i = 250, fb = -40;
      const a = nx + i - fb;
      return q("ec-tb-f5", "facile", "Private saving consistent with balanced trade ($ billions)?",
        [["Trade balance (X − M)", "Balanced (0)"], ["Private investment", bn(i)], ["Government budget balance (T − G)", bn(fb)]],
        a, "$", 0,
        [`0 = (S − ${F(i)}) + (${F(fb)}) ⇒ S = ${F(i)} + ${F(-fb)} = ${B(a)}.`]);
    })(),
    (() => {
      const y = 2000, c = 1300, t = 400, g = 450, i = 320;
      const s = y - c - t;
      const a = s - i + (t - g);
      return q("ec-tb-m1", "moyen", "Trade balance (X − M), $ billions?",
        [["GDP", bn(y)], ["Consumption", bn(c)], ["Taxes (net of transfers)", bn(t)], ["Government spending", bn(g)], ["Private investment", bn(i)]],
        a, "$", 0,
        [`Épargne privée S = Y − C − T = ${F(y)} − ${F(c)} − ${F(t)} = ${B(s)}.`,
          `X − M = (${F(s)} − ${F(i)}) + (${F(t)} − ${F(g)}) = ${B(a)}.`,
          `Contrôle : Y − C − I − G = ${F(y - c - i - g)}.`]);
    })(),
    (() => {
      const nx0 = -80, cut = 30;
      const a = nx0 + cut;
      return q("ec-tb-m2", "moyen", "Trade balance after the fiscal consolidation ($ billions)?",
        [["Current trade balance (X − M)", bn(nx0)], ["Reduction in the budget deficit", bn(cut)], ["Private saving and investment", "Unchanged"]],
        a, "$", 0,
        [`Δ(X − M) = ΔS − ΔI + Δ(T − G) = 0 − 0 + ${F(cut)}.`, `Nouveau solde = ${F(nx0)} + ${F(cut)} = ${B(a)}.`]);
    })(),
    (() => {
      const gdp = 1800, s = 360, i = 396, t = 300, g = 336;
      const nx = s - i + (t - g);
      const a = (nx / gdp) * 100;
      return q("ec-tb-m3", "moyen", "Trade balance as a percentage of GDP?",
        [["GDP", bn(gdp)], ["Private saving", bn(s)], ["Private investment", bn(i)], ["Tax revenue", bn(t)], ["Government spending", bn(g)]],
        a, "%", 1,
        [`X − M = (${F(s)} − ${F(i)}) + (${F(t)} − ${F(g)}) = ${B(nx)}.`, `En % du PIB : ${F(nx)} / ${F(gdp)} = ${Pa(a, 1)}.`]);
    })(),
    (() => {
      const y = 2400, c = 1500, i = 380, t = 520, x = 610, m = 650;
      const nx = x - m;
      const g = y - c - i - nx;
      const a = t - g;
      return q("ec-tb-m4", "moyen", "Government budget balance (T − G), $ billions?",
        [["GDP", bn(y)], ["Consumption", bn(c)], ["Private investment", bn(i)], ["Taxes (net of transfers)", bn(t)], ["Exports", bn(x)], ["Imports", bn(m)]],
        a, "$", 0,
        [`X − M = ${F(x)} − ${F(m)} = ${F(nx)}.`,
          `G = Y − C − I − (X − M) = ${F(y)} − ${F(c)} − ${F(i)} − (${F(nx)}) = ${B(g)}.`,
          `T − G = ${F(t)} − ${F(g)} = ${B(a)}.`]);
    })(),
    (() => {
      const s0 = 18, i0 = 21, fb = -2, s1 = 19.5, i1 = 20.5;
      const a = s1 - i1 + fb;
      return q("ec-tb-m5", "moyen", "New trade balance, in % of GDP?",
        [["Private saving, before → after (% of GDP)", `${E(s0)}% → ${E(s1)}%`], ["Private investment, before → after (% of GDP)", `${E(i0)}% → ${E(i1)}%`],
          ["Budget balance (% of GDP, unchanged)", `${E(fb)}%`]],
        a, "%", 1,
        [`Avant : (${F(s0)} − ${F(i0)}) + (${F(fb)}) = ${Pa(s0 - i0 + fb, 1)}.`, `Après : (${F(s1)} − ${F(i1)}) + (${F(fb)}) = ${Pa(a, 1)} du PIB.`]);
    })(),
    (() => {
      const y = 3000, c = 1950, t = 600, g = 680, i = 430, dep = 120;
      const s = y - c - t;
      const a = s - i + (t - g);
      return q("ec-tb-d1", "difficile", "Trade balance (X − M), $ billions?",
        [["GDP", bn(y)], ["Consumption", bn(c)], ["Taxes (net of transfers)", bn(t)], ["Government spending", bn(g)], ["Gross private investment", bn(i)], ["Depreciation", bn(dep)]],
        a, "$", 0,
        ["L'amortissement est à écarter (l'identité se lit en grandeurs brutes).",
          `S = Y − C − T = ${F(y)} − ${F(c)} − ${F(t)} = ${B(s)}.`,
          `X − M = (${F(s)} − ${F(i)}) + (${F(t)} − ${F(g)}) = ${B(a)}.`]);
    })(),
    (() => {
      const nx0 = -30, dDef = 50, dS = 20, dI = -10;
      const a = nx0 + dS - dI - dDef;
      return q("ec-tb-d2", "difficile", "Trade balance after the fiscal expansion ($ billions)?",
        [["Initial trade balance", bn(nx0)], ["Increase in the budget deficit", bn(dDef)], ["Change in private saving", `+${bn(dS)}`], ["Change in private investment (crowding out)", bn(dI)]],
        a, "$", 0,
        [`Δ(X − M) = ΔS − ΔI + Δ(T − G) = ${F(dS)} − (${F(dI)}) − ${F(dDef)} = ${F(dS - dI - dDef)}.`,
          `Nouveau solde = ${F(nx0)} ${MINUS} ${F(-(dS - dI - dDef))} = ${B(a)}.`]);
    })(),
    (() => {
      const nx0 = 10, dDef = 40, dS = 25;
      const a = nx0 + dS - dDef;
      return q("ec-tb-d3", "difficile", "Trade balance after the deficit increase ($ billions)?",
        [["Initial trade surplus", bn(nx0)], ["Increase in the budget deficit", bn(dDef)], ["Rise in private saving (partial Ricardian effect)", bn(dS)], ["Private investment", "Unchanged"]],
        a, "$", 0,
        [`Les ménages n'épargnent que ${B(dS)} des ${B(dDef)} de déficit : l'équivalence ricardienne ne tient qu'en partie.`,
          `Δ(X − M) = ${F(dS)} − 0 − ${F(dDef)} = ${F(dS - dDef)} ; nouveau solde = ${F(nx0)} ${MINUS} ${F(dDef - dS)} = ${B(a)}.`]);
    })(),
    (() => {
      const gdp = 2500, sR = 0.2, iR = 0.23, defR = 0.03;
      const nxR = sR - iR - defR;
      const a = nxR * gdp;
      return q("ec-tb-d4", "difficile", "Trade balance in $ billions?",
        [["GDP", bn(gdp)], ["Private saving", `${pc(sR)} of GDP`], ["Private investment", `${pc(iR)} of GDP`], ["Budget deficit", `${pc(defR)} of GDP`]],
        a, "$", 0,
        [`X − M = (${P(sR)} − ${P(iR)}) − ${P(defR)} = ${P(nxR)} du PIB.`, `= ${P(nxR)} × ${F(gdp)} = ${B(a)}.`]);
    })(),
    (() => {
      const s = 410, i = 430, t = 500, g = 540;
      const nx = s - i + (t - g);
      const gNeeded = t + (s - i);
      const a = g - gNeeded;
      return q("ec-tb-d5", "difficile", "Cut in government spending needed to balance trade, with S, I and T unchanged ($ billions)?",
        [["Private saving", bn(s)], ["Private investment", bn(i)], ["Tax revenue", bn(t)], ["Government spending", bn(g)]],
        a, "$", 0,
        [`Aujourd'hui : X − M = (${F(s)} − ${F(i)}) + (${F(t)} − ${F(g)}) = ${B(nx)}.`,
          `Pour X − M = 0 : T − G = −(S − I) = ${F(i - s)}, soit G = ${F(t)} − ${F(i - s)} = ${B(gNeeded)}.`,
          `Baisse des dépenses = ${F(g)} − ${F(gNeeded)} = ${B(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 7 · Taux de change réel ────────────────────────── */

const REAL_FX: CalcType = {
  key: "real-exchange-rate",
  topic: "economics",
  name: "Taux de change réel (real exchange rate)",
  tier: "essentiel",
  source: "LM 7 · Capital Flows and the FX Market",
  formulas: [
    "Taux réel (P/B) = taux nominal (P/B) × CPI pays de base / CPI pays de cotation",
    "CPI en base 100 à la période de référence (sinon, rapporter chaque CPI à sa base)",
    "Variation du taux réel = (1 + %Δ nominal) × (1 + π base) / (1 + π cotation) − 1",
    "Hausse du taux réel P/B : la devise de cotation perd du pouvoir d'achat en biens du pays de base",
  ],
  traps: [
    "Le CPI du pays de la devise de base (au dénominateur de la cotation) va au numérateur.",
    "Pour un taux réel B/P, inverser la cotation ET permuter les CPI.",
  ],
  questions: [
    (() => {
      const s = 1.25, cpiP = 108, cpiB = 104;
      const a = realFx(s, cpiB, cpiP);
      return q("ec-rer-f1", "facile", "Real USD/EUR exchange rate today?",
        [["Nominal exchange rate today (USD/EUR)", fx(s)], ["CPI, United States (base period = 100)", E(cpiP)], ["CPI, Eurozone (base period = 100)", E(cpiB)]],
        a, "", 4,
        ["Réel P/B = nominal × CPI (base, ici EUR) / CPI (cotation, ici USD).", `= ${Fx(s)} × ${F(cpiB)} / ${F(cpiP)} = ${Fx(a)} USD/EUR.`]);
    })(),
    (() => {
      const s = 7.2, cpiP = 103, cpiB = 106;
      const a = realFx(s, cpiB, cpiP);
      return q("ec-rer-f2", "facile", "Real CNY/USD exchange rate today?",
        [["Nominal exchange rate today (CNY/USD)", fx(s)], ["CPI, China (base period = 100)", E(cpiP)], ["CPI, United States (base period = 100)", E(cpiB)]],
        a, "", 4,
        ["La devise de base est l'USD : son CPI va au numérateur.", `Réel = ${Fx(s)} × ${F(cpiB)} / ${F(cpiP)} = ${Fx(a)} CNY/USD.`]);
    })(),
    (() => {
      const s = 150, cpiP = 102, cpiB = 109;
      const a = realFx(s, cpiB, cpiP);
      return q("ec-rer-f3", "facile", "Real JPY/EUR exchange rate today?",
        [["Nominal exchange rate today (JPY/EUR)", fx(s, 2)], ["CPI, Japan (base period = 100)", E(cpiP)], ["CPI, Eurozone (base period = 100)", E(cpiB)]],
        a, "", 2,
        [`Réel = ${F(s, 2)} × ${F(cpiB)} / ${F(cpiP)} = ${F(a, 2)} JPY/EUR.`]);
    })(),
    (() => {
      const s = 18.5, cpiP = 120, cpiB = 108;
      const a = realFx(s, cpiB, cpiP);
      return q("ec-rer-f4", "facile", "Real MXN/USD exchange rate today?",
        [["Nominal exchange rate today (MXN/USD)", fx(s, 2)], ["CPI, Mexico (base period = 100)", E(cpiP)], ["CPI, United States (base period = 100)", E(cpiB)]],
        a, "", 2,
        [`Réel = ${F(s, 2)} × ${F(cpiB)} / ${F(cpiP)} = ${F(a, 2)} MXN/USD : l'inflation mexicaine plus forte fait baisser le taux réel.`]);
    })(),
    (() => {
      const s = 0.86, cpiP = 115, cpiB = 110;
      const a = realFx(s, cpiB, cpiP);
      return q("ec-rer-f5", "facile", "Real GBP/EUR exchange rate today?",
        [["Nominal exchange rate today (GBP/EUR)", fx(s)], ["CPI, United Kingdom (base period = 100)", E(cpiP)], ["CPI, Eurozone (base period = 100)", E(cpiB)]],
        a, "", 4,
        [`Réel = ${Fx(s)} × ${F(cpiB)} / ${F(cpiP)} = ${Fx(a)} GBP/EUR.`]);
    })(),
    (() => {
      const s0 = 1.1, s1 = 1.15, cpiP = 106, cpiB = 103;
      const r1 = realFx(s1, cpiB, cpiP);
      const a = (r1 / s0 - 1) * 100;
      return q("ec-rer-m1", "moyen", "Percentage change in the real USD/EUR exchange rate since the base period?",
        [["Nominal USD/EUR at the base period (CPIs = 100)", fx(s0)], ["Nominal USD/EUR today", fx(s1)], ["CPI, United States today", E(cpiP)], ["CPI, Eurozone today", E(cpiB)]],
        a, "%", 2,
        [`À la base, CPI = 100 : taux réel = nominal = ${Fx(s0)}.`,
          `Aujourd'hui : ${Fx(s1)} × ${F(cpiB)} / ${F(cpiP)} = ${Fx(r1)}.`,
          `Variation = ${Fx(r1)} / ${Fx(s0)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const s1 = 1.6, years = 3, piP = 0.02, piB = 0.03;
      const cpiP = 100 * Math.pow(1 + piP, years), cpiB = 100 * Math.pow(1 + piB, years);
      const a = realFx(s1, cpiB, cpiP);
      return q("ec-rer-m2", "moyen", "Real USD/GBP exchange rate today?",
        [["Nominal USD/GBP today", fx(s1)], ["Years since the base period (CPIs = 100)", E(years)], ["US inflation (per year)", pc(piP)], ["UK inflation (per year)", pc(piB)]],
        a, "", 4,
        [`CPI US = 100 × ${F(1 + piP)}³ = ${F(cpiP, 2)} ; CPI UK = 100 × ${F(1 + piB)}³ = ${F(cpiB, 2)}.`,
          `Réel USD/GBP = ${Fx(s1)} × ${F(cpiB, 2)} / ${F(cpiP, 2)} = ${Fx(a)}.`]);
    })(),
    (() => {
      const s = 1.35, cpiB0 = 240, cpiP0 = 140, cpiB1 = 252, cpiP1 = 145.6;
      const a = realFx(s, cpiB1 / cpiB0, cpiP1 / cpiP0);
      return q("ec-rer-m3", "moyen", "Real CAD/USD exchange rate today, relative to the base period?",
        [["Nominal CAD/USD today", fx(s)], ["US CPI: base period → today", `${E(cpiB0)} → ${E(cpiB1)}`], ["Canada CPI: base period → today", `${E(cpiP0)} → ${E(cpiP1)}`]],
        a, "", 4,
        ["Les CPI ne valent pas 100 à la base : on prend leurs rapports.",
          `US : ${F(cpiB1)} / ${F(cpiB0)} = ${F(cpiB1 / cpiB0, 4)} ; Canada : ${F(cpiP1)} / ${F(cpiP0)} = ${F(cpiP1 / cpiP0, 4)}.`,
          `Réel CAD/USD = ${Fx(s)} × ${F(cpiB1 / cpiB0, 4)} / ${F(cpiP1 / cpiP0, 4)} = ${Fx(a)}.`]);
    })(),
    (() => {
      const dS = 0.03, piB = 0.04, piP = 0.01;
      const a = ((1 + dS) * (1 + piB) / (1 + piP) - 1) * 100;
      return q("ec-rer-m4", "moyen", "Percentage change in the real CHF/EUR exchange rate over the year? (Exact, not approximated.)",
        [["Change in nominal CHF/EUR", spc(dS)], ["Eurozone inflation", pc(piB)], ["Swiss inflation", pc(piP)]],
        a, "%", 2,
        ["Réel = nominal × CPI (base EUR) / CPI (cotation CHF).",
          `1 + Δréel = ${F(1 + dS)} × ${F(1 + piB)} / ${F(1 + piP)} = ${F(1 + a / 100, 4)}.`,
          `Variation = ${Pa(a)} (≈ ${P(dS)} + ${P(piB)} − ${P(piP)} = ${P(dS + piB - piP)}).`]);
    })(),
    (() => {
      const s0 = 0.9, piP = 0.05, piB = 0.02;
      const a = (s0 * (1 + piP)) / (1 + piB);
      return q("ec-rer-m5", "moyen", "Nominal EUR/USD rate at year-end that leaves the real exchange rate unchanged?",
        [["Nominal EUR/USD today (CPIs = 100)", fx(s0)], ["Eurozone inflation over the year", pc(piP)], ["US inflation over the year", pc(piB)]],
        a, "", 4,
        [`Il faut S1 × ${F(100 * (1 + piB))} / ${F(100 * (1 + piP))} = ${Fx(s0)}.`,
          `S1 = ${Fx(s0)} × ${F(1 + piP)} / ${F(1 + piB)} = ${Fx(a)} EUR/USD : l'EUR doit se déprécier pour compenser son surcroît d'inflation.`]);
    })(),
    (() => {
      const sUsdEur = 1.08, cpiEZ = 106, cpiUS = 110;
      const sEurUsd = 1 / sUsdEur;
      const a = realFx(sEurUsd, cpiUS, cpiEZ);
      return q("ec-rer-d1", "difficile", "Real EUR/USD exchange rate today?",
        [["Nominal exchange rate today (USD/EUR)", fx(sUsdEur)], ["CPI, Eurozone (base period = 100)", E(cpiEZ)], ["CPI, United States (base period = 100)", E(cpiUS)]],
        a, "", 4,
        [`On veut EUR/USD : nominal = 1 / ${Fx(sUsdEur)} = ${Fx(sEurUsd)}.`,
          "Devise de base : USD, donc CPI US au numérateur.",
          `Réel EUR/USD = ${Fx(sEurUsd)} × ${F(cpiUS)} / ${F(cpiEZ)} = ${Fx(a)}.`]);
    })(),
    (() => {
      const s0 = 110, s1 = 145, cpiP0 = 98, cpiB0 = 230, cpiP1 = 104.9, cpiB1 = 280.6;
      const r1 = realFx(s1, cpiB1 / cpiB0, cpiP1 / cpiP0);
      const a = (r1 / s0 - 1) * 100;
      return q("ec-rer-d2", "difficile", "Percentage change in the real JPY/USD exchange rate since the base period?",
        [["Nominal JPY/USD: base period → today", `${fx(s0, 2)} → ${fx(s1, 2)}`], ["Japan CPI: base period → today", `${E(cpiP0)} → ${E(cpiP1)}`],
          ["US CPI: base period → today", `${E(cpiB0)} → ${E(cpiB1)}`]],
        a, "%", 2,
        [`Inflation cumulée : US ${F(cpiB1)} / ${F(cpiB0)} = ${F(cpiB1 / cpiB0, 4)} ; Japon ${F(cpiP1)} / ${F(cpiP0)} = ${F(cpiP1 / cpiP0, 4)}.`,
          `Réel aujourd'hui (base = nominal de départ) = ${F(s1, 2)} × ${F(cpiB1 / cpiB0, 4)} / ${F(cpiP1 / cpiP0, 4)} = ${F(r1, 2)}.`,
          `Variation = ${F(r1, 2)} / ${F(s0, 2)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const s0 = 1.1, dReal = 0.04, piP = 0.025, piB = 0.015;
      const dS = ((1 + dReal) * (1 + piP)) / (1 + piB) - 1;
      const a = s0 * (1 + dS);
      return q("ec-rer-d3", "difficile", "Nominal USD/EUR rate at year-end?",
        [["Nominal USD/EUR at the start of the year", fx(s0)], ["Change in the real USD/EUR rate over the year", spc(dReal)], ["US inflation", pc(piP)], ["Eurozone inflation", pc(piB)]],
        a, "", 4,
        ["(1 + Δréel) = (1 + Δnominal) × (1 + π EUR) / (1 + π USD).",
          `1 + Δnominal = ${F(1 + dReal)} × ${F(1 + piP)} / ${F(1 + piB)} = ${F(1 + dS, 4)}.`,
          `S1 = ${Fx(s0)} × ${F(1 + dS, 4)} = ${Fx(a)} USD/EUR.`]);
    })(),
    (() => {
      const s0 = 5, s5 = 6.1, years = 5, piP = 0.06, piB = 0.025;
      const gP = Math.pow(1 + piP, years), gB = Math.pow(1 + piB, years);
      const a = realFx(s5, gB, gP);
      return q("ec-rer-d4", "difficile", "Real BRL/USD exchange rate after five years, relative to the base period?",
        [["Nominal BRL/USD: base period → year 5", `${fx(s0, 2)} → ${fx(s5, 2)}`], ["Brazil inflation (per year)", pc(piP)], ["US inflation (per year)", pc(piB)]],
        a, "", 4,
        [`Inflation cumulée : US ${F(1 + piB)}⁵ = ${F(gB, 4)} ; Brésil ${F(1 + piP)}⁵ = ${F(gP, 4)}.`,
          `Réel = ${F(s5, 2)} × ${F(gB, 4)} / ${F(gP, 4)} = ${Fx(a)}.`,
          `Le taux réel n'a monté que de ${P(a / s0 - 1, 2)} alors que le nominal a monté de ${P(s5 / s0 - 1, 2)}.`]);
    })(),
    (() => {
      const s = 1.45, cpiB = 118, cpiP = 112, iCad = 0.045, iEur = 0.0325;
      const a = realFx(s, cpiB, cpiP);
      return q("ec-rer-d5", "difficile", "Real CAD/EUR exchange rate today?",
        [["Nominal CAD/EUR today", fx(s)], ["CPI, Canada (base period = 100)", E(cpiP)], ["CPI, Eurozone (base period = 100)", E(cpiB)],
          ["1-year interest rate, CAD", pc(iCad)], ["1-year interest rate, EUR", pc(iEur)]],
        a, "", 4,
        ["Les taux d'intérêt sont à écarter.", `Réel CAD/EUR = ${Fx(s)} × ${F(cpiB)} (EUR, base) / ${F(cpiP)} (CAD, cotation) = ${Fx(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 8 · Variation d'une devise ────────────────────────── */

const CURRENCY_CHANGE: CalcType = {
  key: "currency-change",
  topic: "economics",
  name: "Appréciation et dépréciation d'une devise",
  tier: "essentiel",
  top: true,
  source: "LM 7 · Capital Flows and the FX Market",
  formulas: [
    "Devise de base (dénominateur de P/B) : variation = S1 / S0 − 1",
    "Devise de cotation (numérateur) : variation = S0 / S1 − 1",
    "Cotation inverse : B/P = 1 / (P/B)",
    "Rendement en devise domestique = (1 + R local) × (1 + variation de la devise étrangère) − 1",
  ],
  traps: [
    "Mettre la devise étudiée en base (au dénominateur) avant de calculer sa variation.",
    "L'appréciation de l'une n'est pas égale à la dépréciation de l'autre.",
    "Une hausse de USD/EUR est une appréciation de l'EUR, pas de l'USD.",
  ],
  questions: [
    (() => {
      const s0 = 98, s1 = 103;
      const a = baseChange(s0, s1) * 100;
      return q("ec-chg-f1", "facile", "Percentage change in the value of the EUR against the JPY?",
        [["JPY/EUR at the start", fx(s0, 2)], ["JPY/EUR at the end", fx(s1, 2)]],
        a, "%", 2,
        ["L'EUR est la devise de base : variation = S1 / S0 − 1.", `= ${F(s1, 2)} / ${F(s0, 2)} − 1 = ${Pa(a)} (appréciation de l'EUR).`]);
    })(),
    (() => {
      const s0 = 1.42, s1 = 1.39;
      const a = priceChange(s0, s1) * 100;
      return q("ec-chg-f2", "facile", "Percentage change in the value of the USD against the EUR?",
        [["USD/EUR at the start", fx(s0)], ["USD/EUR at the end", fx(s1)]],
        a, "%", 2,
        ["L'USD est la devise de cotation : variation = S0 / S1 − 1.",
          `= ${Fx(s0)} / ${Fx(s1)} − 1 = ${Pa(a)} (l'EUR, lui, varie de ${P(baseChange(s0, s1), 2)}).`]);
    })(),
    (() => {
      const s = 1.311;
      const a = 1 / s;
      return q("ec-chg-f3", "facile", "Quote for the US dollar in London (GBP/USD)?",
        [["Quote for the pound in New York (USD/GBP)", fx(s)]],
        a, "", 4,
        [`GBP/USD = 1 / USD/GBP = 1 / ${Fx(s)} = ${Fx(a)}.`]);
    })(),
    (() => {
      const s0 = 1.48, s1 = 1.63;
      const a = priceChange(s0, s1) * 100;
      return q("ec-chg-f4", "facile", "Percentage change in the AUD relative to the GBP?",
        [["AUD/GBP five years ago", fx(s0)], ["AUD/GBP today", fx(s1)]],
        a, "%", 2,
        ["L'AUD est la devise de cotation : on inverse, variation = S0 / S1 − 1.",
          `= ${Fx(s0)} / ${Fx(s1)} − 1 = ${Pa(a)} : l'AUD s'est déprécié (le GBP a gagné ${P(baseChange(s0, s1), 2)}).`]);
    })(),
    (() => {
      const s0 = 7.1, s1 = 6.9;
      const a = baseChange(s0, s1) * 100;
      return q("ec-chg-f5", "facile", "Percentage change in the USD relative to the CNY?",
        [["CNY/USD at the start", fx(s0)], ["CNY/USD at the end", fx(s1)]],
        a, "%", 2,
        [`L'USD est la devise de base : ${Fx(s1)} / ${Fx(s0)} − 1 = ${Pa(a)} (dépréciation de l'USD).`]);
    })(),
    (() => {
      const s0 = 0.92, s1 = 0.88;
      const a = priceChange(s0, s1) * 100;
      return q("ec-chg-m1", "moyen", "Percentage appreciation of the CHF against the USD?",
        [["CHF/USD a year ago", fx(s0)], ["CHF/USD today", fx(s1)]],
        a, "%", 2,
        [`En USD/CHF : ${Fx(1 / s0)} → ${Fx(1 / s1)}.`, `Variation du CHF = ${Fx(1 / s1)} / ${Fx(1 / s0)} − 1 = ${Fx(s0)} / ${Fx(s1)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const s0 = 1.1, dep = -0.04;
      const a = s0 * (1 + dep);
      return q("ec-chg-m2", "moyen", "New USD/EUR exchange rate after the EUR depreciates by 4% against the USD?",
        [["USD/EUR today", fx(s0)], ["Change in the EUR against the USD", spc(dep)]],
        a, "", 4,
        [`L'EUR est la base : S1 = S0 × (1 + variation de l'EUR) = ${Fx(s0)} × ${F(1 + dep)} = ${Fx(a)}.`]);
    })(),
    (() => {
      const s0 = 1.25, app = 0.05;
      const inv0 = 1 / s0, inv1 = inv0 * (1 + app);
      const a = 1 / inv1;
      return q("ec-chg-m3", "moyen", "USD/GBP rate after the USD appreciates by 5% against the GBP?",
        [["USD/GBP today", fx(s0)], ["Appreciation of the USD against the GBP", pc(app)]],
        a, "", 4,
        [`Mettre l'USD en base : GBP/USD = 1 / ${Fx(s0)} = ${Fx(inv0)}.`,
          `+${P(app)} : ${Fx(inv0)} × ${F(1 + app)} = ${Fx(inv1)} GBP/USD.`,
          `USD/GBP = 1 / ${Fx(inv1)} = ${Fx(a)} (et non ${Fx(s0 * (1 - app))}).`]);
    })(),
    (() => {
      const ue0 = 1.1, ue1 = 1.05, ju0 = 140, ju1 = 150;
      const je0 = ue0 * ju0, je1 = ue1 * ju1;
      const a = baseChange(je0, je1) * 100;
      return q("ec-chg-m4", "moyen", "Percentage change in the EUR against the JPY?",
        [["USD/EUR: start → end", `${fx(ue0)} → ${fx(ue1)}`], ["JPY/USD: start → end", `${fx(ju0, 2)} → ${fx(ju1, 2)}`]],
        a, "%", 2,
        [`JPY/EUR = JPY/USD × USD/EUR : ${F(ju0)} × ${Fx(ue0)} = ${F(je0, 2)} → ${F(ju1)} × ${Fx(ue1)} = ${F(je1, 2)}.`,
          `Variation de l'EUR (base) = ${F(je1, 2)} / ${F(je0, 2)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const s0 = 20, s1 = 17, years = 3;
      const total = priceChange(s0, s1);
      const a = (Math.pow(1 + total, 1 / years) - 1) * 100;
      return q("ec-chg-m5", "moyen", "Average annual (compound) appreciation of the MXN against the USD?",
        [["MXN/USD three years ago", fx(s0, 2)], ["MXN/USD today", fx(s1, 2)]],
        a, "%", 2,
        [`Variation totale du MXN (cotation) = ${F(s0)} / ${F(s1)} − 1 = ${P(total, 2)}.`, `Annualisée = (${F(s0)} / ${F(s1)})^(1/3) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const rLocal = 0.08, s0 = 1.1, s1 = 1.05;
      const dEur = baseChange(s0, s1);
      const a = ((1 + rLocal) * (1 + dEur) - 1) * 100;
      return q("ec-chg-d1", "difficile", "Return in USD for a US investor holding Eurozone stocks?",
        [["Return in EUR", pc(rLocal)], ["USD/EUR at purchase", fx(s0)], ["USD/EUR at sale", fx(s1)]],
        a, "%", 2,
        [`Variation de l'EUR (base) = ${Fx(s1)} / ${Fx(s0)} − 1 = ${P(dEur, 2)}.`,
          `Rendement en USD = ${F(1 + rLocal)} × ${F(1 + dEur, 4)} − 1 = ${Pa(a)} (et non ${P(rLocal + dEur, 2)}).`]);
    })(),
    (() => {
      const dGbp = -0.06;
      const a = (1 / (1 + dGbp) - 1) * 100;
      return q("ec-chg-d2", "difficile", "Percentage change in the USD against the GBP?",
        [["Change in the GBP against the USD", spc(dGbp)]],
        a, "%", 2,
        ["Si le GBP vaut (1 + x) fois moins d'USD, l'USD vaut 1 / (1 + x) fois plus de GBP.",
          `Variation de l'USD = 1 / ${F(1 + dGbp)} − 1 = ${Pa(a)} (pas ${P(-dGbp)}).`]);
    })(),
    (() => {
      const eu0 = 0.9, eu1 = 0.95, ug0 = 1.25, ug1 = 1.2;
      const eg0 = eu0 * ug0, eg1 = eu1 * ug1;
      const a = priceChange(eg0, eg1) * 100;
      return q("ec-chg-d3", "difficile", "Percentage change in the EUR against the GBP?",
        [["EUR/USD: start → end", `${fx(eu0)} → ${fx(eu1)}`], ["USD/GBP: start → end", `${fx(ug0)} → ${fx(ug1)}`]],
        a, "%", 2,
        [`EUR/GBP = EUR/USD × USD/GBP : ${Fx(eu0)} × ${Fx(ug0)} = ${Fx(eg0)} → ${Fx(eu1)} × ${Fx(ug1)} = ${Fx(eg1)}.`,
          `L'EUR est la cotation : variation = ${Fx(eg0)} / ${Fx(eg1)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const rUsd = 0.04, s0 = 150;
      const a = s0 / (1 + rUsd);
      return q("ec-chg-d4", "difficile", "Year-end JPY/USD rate at which a Japanese investor earns 0% in JPY on the US bond?",
        [["Return on the US bond in USD", pc(rUsd)], ["JPY/USD today", fx(s0, 2)]],
        a, "", 2,
        [`Il faut ${F(1 + rUsd)} × (1 + variation de l'USD) = 1, soit une baisse de l'USD de ${P(1 - 1 / (1 + rUsd), 2)}.`,
          `JPY/USD (USD en base) = ${F(s0)} / ${F(1 + rUsd)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const y1 = 0.05, y2 = -0.03;
      const a = (1 / ((1 + y1) * (1 + y2)) - 1) * 100;
      return q("ec-chg-d5", "difficile", "Percentage change in the USD against the EUR over the two years?",
        [["Change in the EUR against the USD, year 1", spc(y1)], ["Change in the EUR against the USD, year 2", spc(y2)]],
        a, "%", 2,
        [`EUR sur deux ans : ${F(1 + y1)} × ${F(1 + y2)} − 1 = ${P((1 + y1) * (1 + y2) - 1, 2)}.`,
          `USD = 1 / ${F((1 + y1) * (1 + y2), 4)} − 1 = ${Pa(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 9 · Taux croisés ────────────────────────── */

const CROSS: CalcType = {
  key: "cross-rates",
  topic: "economics",
  name: "Taux croisés (cross rates)",
  tier: "essentiel",
  top: true,
  source: "LM 8 · Exchange Rate Calculations",
  formulas: [
    "A/C = A/B × B/C (la devise commune s'annule)",
    "A/C = (A/B) / (C/B) quand les deux cotations ont la même devise de base",
    "Cotation inverse : B/A = 1 / (A/B)",
  ],
  traps: [
    "Écrire les cotations pour que la devise commune s'annule ; sinon, inverser d'abord.",
    "Vérifier le sens demandé : MXN/PLN n'est pas PLN/MXN.",
  ],
  questions: [
    (() => {
      const mxnUsd = 17.2, usdAud = 0.66;
      const a = mxnUsd * usdAud;
      return q("ec-cross-f1", "facile", "MXN/AUD cross rate?",
        [["MXN/USD", fx(mxnUsd)], ["USD/AUD", fx(usdAud)]],
        a, "", 4,
        ["MXN/AUD = MXN/USD × USD/AUD : l'USD s'annule.", `= ${Fx(mxnUsd)} × ${Fx(usdAud)} = ${Fx(a)}.`]);
    })(),
    (() => {
      const chfUsd = 0.885, nzdUsd = 1.642;
      const a = chfUsd / nzdUsd;
      return q("ec-cross-f2", "facile", "CHF/NZD cross rate?",
        [["CHF/USD", fx(chfUsd)], ["NZD/USD", fx(nzdUsd)]],
        a, "", 4,
        ["Même devise de base (USD) : CHF/NZD = (CHF/USD) / (NZD/USD).", `= ${Fx(chfUsd)} / ${Fx(nzdUsd)} = ${Fx(a)}.`]);
    })(),
    (() => {
      const inrUsd = 83.2, sgdUsd = 1.345;
      const a = inrUsd / sgdUsd;
      return q("ec-cross-f3", "facile", "INR/SGD cross rate?",
        [["INR/USD", fx(inrUsd, 2)], ["SGD/USD", fx(sgdUsd)]],
        a, "", 2,
        [`INR/SGD = (INR/USD) / (SGD/USD) = ${F(inrUsd, 2)} / ${Fx(sgdUsd)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const usdEur = 1.085, eurGbp = 1.165;
      const a = usdEur * eurGbp;
      return q("ec-cross-f4", "facile", "USD/GBP cross rate?",
        [["USD/EUR", fx(usdEur)], ["EUR/GBP", fx(eurGbp)]],
        a, "", 4,
        [`USD/GBP = USD/EUR × EUR/GBP = ${Fx(usdEur)} × ${Fx(eurGbp)} = ${Fx(a)}.`]);
    })(),
    (() => {
      const jpyUsd = 149.5, jpyDkk = 21.8;
      const a = jpyDkk / jpyUsd;
      return q("ec-cross-f5", "facile", "USD/DKK cross rate?",
        [["JPY/USD", fx(jpyUsd, 2)], ["JPY/DKK", fx(jpyDkk, 2)]],
        a, "", 4,
        [`USD/DKK = USD/JPY × JPY/DKK = (1 / ${F(jpyUsd, 2)}) × ${F(jpyDkk, 2)} = ${Fx(a)}.`]);
    })(),
    (() => {
      const gbpUsd = 0.79, cadGbp = 1.73;
      const usdGbp = 1 / gbpUsd;
      const a = usdGbp / cadGbp;
      return q("ec-cross-m1", "moyen", "USD/CAD cross rate?",
        [["GBP/USD", fx(gbpUsd)], ["CAD/GBP", fx(cadGbp)]],
        a, "", 4,
        [`Inverser : USD/GBP = 1 / ${Fx(gbpUsd)} = ${Fx(usdGbp)}.`, `USD/CAD = (USD/GBP) / (CAD/GBP) = ${Fx(usdGbp)} / ${Fx(cadGbp)} = ${Fx(a)}.`]);
    })(),
    (() => {
      const sekEur = 11.4, nokUsd = 10.6, usdEur = 1.08;
      const a = sekEur / usdEur / nokUsd;
      return q("ec-cross-m2", "moyen", "SEK/NOK cross rate?",
        [["SEK/EUR", fx(sekEur)], ["NOK/USD", fx(nokUsd)], ["USD/EUR", fx(usdEur)]],
        a, "", 4,
        ["SEK/NOK = SEK/EUR × EUR/USD × USD/NOK.",
          `= ${Fx(sekEur)} × (1 / ${Fx(usdEur)}) × (1 / ${Fx(nokUsd)}) = ${Fx(a)}.`]);
    })(),
    (() => {
      const usdCad = 0.74, cadGbp = 1.72;
      const usdGbp = usdCad * cadGbp;
      const a = 1 / usdGbp;
      return q("ec-cross-m3", "moyen", "GBP/USD exchange rate?",
        [["USD/CAD", fx(usdCad)], ["CAD/GBP", fx(cadGbp)]],
        a, "", 4,
        [`USD/GBP = USD/CAD × CAD/GBP = ${Fx(usdCad)} × ${Fx(cadGbp)} = ${Fx(usdGbp)}.`, `GBP/USD = 1 / ${Fx(usdGbp)} = ${Fx(a)}.`]);
    })(),
    (() => {
      const usdAud = 0.66, usdNzd = 0.61;
      const a = usdNzd / usdAud;
      return q("ec-cross-m4", "moyen", "AUD/NZD cross rate?",
        [["USD/AUD", fx(usdAud)], ["USD/NZD", fx(usdNzd)]],
        a, "", 4,
        [`AUD/NZD = AUD/USD × USD/NZD = (1 / ${Fx(usdAud)}) × ${Fx(usdNzd)}.`, `= ${Fx(usdNzd)} / ${Fx(usdAud)} = ${Fx(a)}.`]);
    })(),
    (() => {
      const amount = 250000, mxnUsd = 17, brlUsd = 5;
      const brlMxn = brlUsd / mxnUsd;
      const a = amount * brlMxn;
      return q("ec-cross-m5", "moyen", "BRL received for MXN 250,000?",
        [["Amount to convert", `MXN ${E(amount)}`], ["MXN/USD", fx(mxnUsd)], ["BRL/USD", fx(brlUsd)]],
        a, "", 0,
        [`BRL/MXN = (BRL/USD) / (MXN/USD) = ${Fx(brlUsd)} / ${Fx(mxnUsd)} = ${F(brlMxn, 6)}.`, `Montant = ${F(amount)} × ${F(brlMxn, 6)} = ${C(a, "BRL", 0)}.`]);
    })(),
    (() => {
      const quoted = 1.18, usdEur = 1.07, usdGbp = 1.27;
      const implied = usdGbp / usdEur;
      const a = (quoted / implied - 1) * 100;
      return q("ec-cross-d1", "difficile", "Percentage by which the dealer's EUR/GBP quote differs from the implied cross rate?",
        [["Dealer quote, EUR/GBP", fx(quoted)], ["USD/EUR", fx(usdEur)], ["USD/GBP", fx(usdGbp)]],
        a, "%", 2,
        [`Cross implicite EUR/GBP = (USD/GBP) / (USD/EUR) = ${Fx(usdGbp)} / ${Fx(usdEur)} = ${Fx(implied)}.`,
          `Écart = ${Fx(quoted)} / ${Fx(implied)} − 1 = ${Pa(a)} : le courtier cote le GBP trop bas.`]);
    })(),
    (() => {
      const zarUsd = 18.4, usdEur = 1.09, eurChf = 1.04, jpyUsd = 150;
      const a = zarUsd * usdEur * eurChf;
      return q("ec-cross-d2", "difficile", "ZAR/CHF cross rate?",
        [["ZAR/USD", fx(zarUsd)], ["USD/EUR", fx(usdEur)], ["EUR/CHF", fx(eurChf)], ["JPY/USD", fx(jpyUsd, 2)]],
        a, "", 2,
        ["Le JPY/USD est inutile.", "ZAR/CHF = ZAR/USD × USD/EUR × EUR/CHF (USD et EUR s'annulent).",
          `= ${Fx(zarUsd)} × ${Fx(usdEur)} × ${Fx(eurChf)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const cadUsd = 1.36, gbpCad = 0.58;
      const a = (1 / cadUsd) * (1 / gbpCad);
      return q("ec-cross-d3", "difficile", "USD/GBP exchange rate?",
        [["CAD/USD", fx(cadUsd)], ["GBP/CAD", fx(gbpCad)]],
        a, "", 4,
        [`USD/GBP = USD/CAD × CAD/GBP : les deux cotations sont à inverser.`,
          `= (1 / ${Fx(cadUsd)}) × (1 / ${Fx(gbpCad)}) = ${Fx(1 / cadUsd)} × ${Fx(1 / gbpCad)} = ${Fx(a)}.`]);
    })(),
    (() => {
      const amount = 2000000, jpyUsd = 150.2, chfUsd = 0.88;
      const jpyChf = jpyUsd / chfUsd;
      const a = amount * jpyChf;
      return q("ec-cross-d4", "difficile", "JPY received by a Japanese exporter paid CHF 2,000,000?",
        [["Amount received", `CHF ${E(amount)}`], ["JPY/USD", fx(jpyUsd, 2)], ["CHF/USD", fx(chfUsd)]],
        a, "", 0,
        [`JPY/CHF = (JPY/USD) / (CHF/USD) = ${F(jpyUsd, 2)} / ${Fx(chfUsd)} = ${F(jpyChf, 6)}.`, `Montant = ${F(amount)} × ${F(jpyChf, 6)} = ${C(a, "JPY", 0)}.`]);
    })(),
    (() => {
      const fUsdEur = 1.1, fJpyUsd = 145, sUsdEur = 1.085, sJpyUsd = 149.8;
      const a = fUsdEur * fJpyUsd;
      return q("ec-cross-d5", "difficile", "1-year forward JPY/EUR cross rate?",
        [["Spot USD/EUR", fx(sUsdEur)], ["Spot JPY/USD", fx(sJpyUsd, 2)], ["1-year forward USD/EUR", fx(fUsdEur)], ["1-year forward JPY/USD", fx(fJpyUsd, 2)]],
        a, "", 2,
        ["Un cross à terme se calcule avec les forwards ; les spots sont à écarter.",
          `Forward JPY/EUR = ${F(fJpyUsd, 2)} × ${Fx(fUsdEur)} = ${F(a, 2)} (le spot croisé vaudrait ${F(sJpyUsd * sUsdEur, 2)}).`]);
    })(),
  ],
};

/* ────────────────────────── 10 · Forward en points ou en % ────────────────────────── */

const FWD_POINTS: CalcType = {
  key: "forward-points",
  topic: "economics",
  name: "Taux à terme cotés en points ou en pourcentage",
  tier: "essentiel",
  top: true,
  source: "LM 8 · Exchange Rate Calculations",
  formulas: [
    "Forward = spot + points × valeur d'un point",
    "Un point = la dernière décimale du spot : 0,0001 à 4 décimales, 0,01 pour une cotation en JPY à 2 décimales",
    "Forward = spot × (1 + % de terme)",
    "Points = (forward − spot) / valeur d'un point",
  ],
  traps: [
    "Points négatifs : le forward est sous le spot (décote de la devise de base).",
    "Pour la cotation inverse, recalculer à partir du forward inversé, pas en inversant les points.",
  ],
  questions: [
    (() => {
      const s = 1.085, p = 48.5;
      const a = fwdFromPoints(s, p);
      return q("ec-fwdpt-f1", "facile", "1-year forward USD/EUR rate?",
        [["Spot USD/EUR", fx(s)], ["1-year forward points", pts(p)]],
        a, "", 5,
        [`Cotation à 4 décimales : un point = 0,0001, donc ${Fpts(p)} = ${F(p * 0.0001, 5)}.`, `Forward = ${Fx(s)} + ${F(p * 0.0001, 5)} = ${F(a, 5)}.`]);
    })(),
    (() => {
      const s = 1.135, p = -62;
      const a = fwdFromPoints(s, p);
      return q("ec-fwdpt-f2", "facile", "180-day forward CHF/GBP rate?",
        [["Spot CHF/GBP", fx(s)], ["180-day forward points", pts(p)]],
        a, "", 4,
        [`${Fpts(p)} = ${F(p * 0.0001, 4)}.`, `Forward = ${Fx(s)} − ${F(-p * 0.0001, 4)} = ${Fx(a)}.`]);
    })(),
    (() => {
      const s = 0.865, pct = 0.0125;
      const a = s * (1 + pct);
      return q("ec-fwdpt-f3", "facile", "1-year forward GBP/EUR rate?",
        [["Spot GBP/EUR", fx(s)], ["1-year forward quote", spc(pct)]],
        a, "", 4,
        [`Forward = spot × (1 + %) = ${Fx(s)} × ${F(1 + pct)} = ${Fx(a)}.`]);
    })(),
    (() => {
      const s = 1.535, f = 1.546;
      const a = (f - s) / 0.0001;
      return q("ec-fwdpt-f4", "facile", "12-month forward points on CAD/CHF?",
        [["Spot CAD/CHF", fx(s)], ["12-month forward CAD/CHF", fx(f)]],
        a, "", 0,
        [`Points = (${Fx(f)} − ${Fx(s)}) / 0,0001 = ${Fpts(a, 0)}.`]);
    })(),
    (() => {
      const s = 1.1075, pct = -0.008;
      const a = s * (1 + pct);
      return q("ec-fwdpt-f5", "facile", "90-day forward AUD/CAD rate?",
        [["Spot AUD/CAD", fx(s)], ["90-day forward quote", spc(pct)]],
        a, "", 4,
        [`Forward = ${Fx(s)} × (1 − ${F(-pct)}) = ${Fx(a)}.`]);
    })(),
    (() => {
      const s = 149.8, p = -185;
      const a = fwdFromPoints(s, p, 0.01);
      return q("ec-fwdpt-m1", "moyen", "6-month forward JPY/USD rate?",
        [["Spot JPY/USD", fx(s, 2)], ["6-month forward points", pts(p)]],
        a, "", 2,
        ["Le spot a 2 décimales : un point vaut 0,01 (et non 0,0001).", `${Fpts(p)} = ${F(p * 0.01, 2)} ; forward = ${F(s, 2)} − ${F(-p * 0.01, 2)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const s = 0.945, pct = -0.00353;
      const f = s * (1 + pct);
      const a = 1 / f;
      return q("ec-fwdpt-m2", "moyen", "1-year forward EUR/CHF rate?",
        [["Spot CHF/EUR", fx(s)], ["1-year forward quote (CHF/EUR)", spc(pct)]],
        a, "", 4,
        [`Forward CHF/EUR = ${Fx(s)} × ${F(1 + pct, 5)} = ${F(f, 5)}.`, `Forward EUR/CHF = 1 / ${F(f, 5)} = ${Fx(a)}.`]);
    })(),
    (() => {
      const amount = 2000000, s = 1.092, p = 68.5;
      const f = fwdFromPoints(s, p);
      const a = amount * f;
      return q("ec-fwdpt-m3", "moyen", "USD received by the exporter who sells EUR 2,000,000 six months forward?",
        [["Amount sold forward", `EUR ${E(amount)}`], ["Spot USD/EUR", fx(s)], ["6-month forward points", pts(p)]],
        a, "$", 0,
        [`Forward = ${Fx(s)} + ${F(p * 0.0001, 5)} = ${F(f, 5)} USD/EUR.`, `Montant = ${F(amount)} × ${F(f, 5)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const s = 1.275, pct = -0.0065;
      const f = s * (1 + pct);
      const a = (f - s) / 0.0001;
      return q("ec-fwdpt-m4", "moyen", "Equivalent 1-year forward points on USD/GBP?",
        [["Spot USD/GBP", fx(s)], ["1-year forward quote", spc(pct)]],
        a, "", 1,
        [`Forward = ${Fx(s)} × ${F(1 + pct)} = ${F(f, 6)}.`, `Points = (${F(f, 6)} − ${Fx(s)}) / 0,0001 = ${Fpts(a, 1)}.`]);
    })(),
    (() => {
      const s = 1.1, p = 132;
      const f = fwdFromPoints(s, p);
      const a = (f / s - 1) * 100;
      return q("ec-fwdpt-m5", "moyen", "Equivalent forward quote in percentage terms?",
        [["Spot USD/EUR", fx(s)], ["1-year forward points", pts(p)]],
        a, "%", 2,
        [`Forward = ${Fx(s)} + ${F(p * 0.0001)} = ${Fx(f)}.`, `En % : ${Fx(f)} / ${Fx(s)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const amount = 500000, s = 97.35, p = -112;
      const f = fwdFromPoints(s, p, 0.01);
      const a = amount * f;
      return q("ec-fwdpt-d1", "difficile", "JPY received for AUD 500,000 sold three months forward?",
        [["Amount sold forward", `AUD ${E(amount)}`], ["Spot JPY/AUD", fx(s, 2)], ["3-month forward points", pts(p)]],
        a, "", 0,
        ["Cotation à 2 décimales : un point = 0,01.", `Forward = ${F(s, 2)} − ${F(-p * 0.01, 2)} = ${F(f, 2)} JPY/AUD.`, `Montant = ${F(amount)} × ${F(f, 2)} = ${C(a, "JPY", 0)}.`]);
    })(),
    (() => {
      const s = 1.08, iP = 0.05, iB = 0.035, days = 180;
      const f = irpForward(s, iP, iB, days);
      const a = (f - s) / 0.0001;
      return q("ec-fwdpt-d2", "difficile", "No-arbitrage 180-day forward points on USD/EUR?",
        [["Spot USD/EUR", fx(s)], ["180-day USD rate (annual, 360-day basis)", pc(iP)], ["180-day EUR rate (annual, 360-day basis)", pc(iB)]],
        a, "", 1,
        [`Forward = ${Fx(s)} × (1 + ${F(iP)} × 180/360) / (1 + ${F(iB)} × 180/360) = ${Fx(s)} × ${F6(growth(iP, days))} / ${F6(growth(iB, days))} = ${F(f, 6)}.`,
          `Points = (${F(f, 6)} − ${Fx(s)}) / 0,0001 = ${Fpts(a, 1)}.`]);
    })(),
    (() => {
      const s = 0.96, pct = -0.0075;
      const f = s * (1 + pct);
      const sInv = 1 / s, fInv = 1 / f;
      const a = (fInv - sInv) / 0.0001;
      return q("ec-fwdpt-d3", "difficile", "Forward points for the same contract quoted in EUR/CHF?",
        [["Spot CHF/EUR", fx(s)], ["1-year forward quote (CHF/EUR)", spc(pct)]],
        a, "", 1,
        [`Forward CHF/EUR = ${Fx(s)} × ${F(1 + pct)} = ${Fx(f)}.`,
          `En EUR/CHF : spot = 1 / ${Fx(s)} = ${F(sInv, 6)} ; forward = 1 / ${Fx(f)} = ${F(fInv, 6)}.`,
          `Points = (${F(fInv, 6)} − ${F(sInv, 6)}) / 0,0001 = ${Fpts(a, 1)} : le signe s'inverse.`]);
    })(),
    (() => {
      const amount = 1000000, s = 1.26, p = -61, sT = 1.28;
      const f = fwdFromPoints(s, p);
      const a = amount * (sT - f);
      return q("ec-fwdpt-d4", "difficile", "Gain at maturity on the forward purchase of GBP 1,000,000 (in USD)?",
        [["Spot USD/GBP at inception", fx(s)], ["6-month forward points at inception", pts(p)], ["Contract", `Buy GBP ${E(amount)} forward`], ["Spot USD/GBP at maturity", fx(sT)]],
        a, "$", 0,
        [`Forward = ${Fx(s)} − ${F(-p * 0.0001, 4)} = ${Fx(f)} USD/GBP.`,
          `À l'échéance, l'acheteur paie ${Fx(f)} un GBP qui vaut ${Fx(sT)}.`,
          `Gain = (${Fx(sT)} − ${Fx(f)}) × ${F(amount)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const s = 0.785, pct = 0.014, iUsd = 0.045;
      const f = s * (1 + pct);
      const a = 1 / f;
      return q("ec-fwdpt-d5", "difficile", "1-year forward USD/GBP rate?",
        [["Spot GBP/USD", fx(s)], ["1-year forward quote (GBP/USD)", spc(pct)], ["1-year USD interest rate", pc(iUsd)]],
        a, "", 4,
        ["Le taux USD est inutile : le forward est donné.",
          `Forward GBP/USD = ${Fx(s)} × ${F(1 + pct)} = ${F(f, 6)}.`,
          `Forward USD/GBP = 1 / ${F(f, 6)} = ${Fx(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 11 · Prime ou décote à terme ────────────────────────── */

const PREMIUM: CalcType = {
  key: "forward-premium",
  topic: "economics",
  name: "Prime ou décote à terme (forward premium / discount)",
  tier: "essentiel",
  source: "LM 8 · Exchange Rate Calculations",
  formulas: [
    "Devise de base : prime (+) ou décote (−) = forward / spot − 1",
    "Devise de cotation : spot / forward − 1",
    "Annualisation simple : × 12 / nombre de mois (ou × 360 / nombre de jours)",
    "Prime de la devise de base ≈ (i cotation − i base) × durée",
  ],
  traps: [
    "Une prime pour la devise de base est une décote pour la devise de cotation.",
    "N'annualiser que si l'énoncé le demande.",
  ],
  questions: [
    (() => {
      const s = 1.312, f = 1.32;
      const a = (f / s - 1) * 100;
      return q("ec-prem-f1", "facile", "90-day forward premium (+) or discount (−) of the EUR?",
        [["Spot USD/EUR", fx(s)], ["90-day forward USD/EUR", fx(f)]],
        a, "%", 2,
        [`L'EUR est la base : ${Fx(f)} / ${Fx(s)} − 1 = ${Pa(a)} (prime).`]);
    })(),
    (() => {
      const s = 4.325, f = 4.28;
      const a = (f / s - 1) * 100;
      return q("ec-prem-f2", "facile", "1-month forward premium (+) or discount (−) of the GHI?",
        [["Spot EUR/GHI", fx(s)], ["1-month forward EUR/GHI", fx(f)]],
        a, "%", 2,
        [`Le GHI est la base : ${Fx(f)} / ${Fx(s)} − 1 = ${Pa(a)} (décote ; l'EUR est donc en prime).`]);
    })(),
    (() => {
      const s = 1.533, f = 1.508;
      const a = (s / f - 1) * 100;
      return q("ec-prem-f3", "facile", "180-day forward premium (+) or discount (−) of the USD against the GBP?",
        [["Spot USD/GBP", fx(s, 3)], ["180-day forward USD/GBP", fx(f, 3)]],
        a, "%", 2,
        ["L'USD est la devise de cotation : spot / forward − 1.", `= ${F(s, 3)} / ${F(f, 3)} − 1 = ${Pa(a)} (prime de l'USD).`]);
    })(),
    (() => {
      const s = 150, f = 147.75;
      const a = (f / s - 1) * 100;
      return q("ec-prem-f4", "facile", "1-year forward premium (+) or discount (−) of the USD?",
        [["Spot JPY/USD", fx(s, 2)], ["1-year forward JPY/USD", fx(f, 2)]],
        a, "%", 2,
        [`L'USD est la base : ${F(f, 2)} / ${F(s, 2)} − 1 = ${Pa(a)} (décote).`]);
    })(),
    (() => {
      const s = 0.95, f = 0.9405;
      const a = (s / f - 1) * 100;
      return q("ec-prem-f5", "facile", "1-year forward premium (+) or discount (−) of the CHF?",
        [["Spot CHF/EUR", fx(s)], ["1-year forward CHF/EUR", fx(f)]],
        a, "%", 2,
        [`Le CHF est la cotation : ${Fx(s)} / ${Fx(f)} − 1 = ${Pa(a)} (prime du CHF).`]);
    })(),
    (() => {
      const s = 1.36, f = 1.356, months = 3;
      const per = f / s - 1;
      const a = per * (12 / months) * 100;
      return q("ec-prem-m1", "moyen", "Annualized forward premium (+) or discount (−) of the USD?",
        [["Spot CAD/USD", fx(s)], ["3-month forward CAD/USD", fx(f)]],
        a, "%", 2,
        [`Sur 3 mois : ${Fx(f)} / ${Fx(s)} − 1 = ${P(per, 4)}.`, `Annualisé : ${P(per, 4)} × 12/3 = ${Pa(a)}.`]);
    })(),
    (() => {
      const s = 1.075, p = 95, months = 6;
      const f = fwdFromPoints(s, p);
      const per = f / s - 1;
      const a = per * (12 / months) * 100;
      return q("ec-prem-m2", "moyen", "Annualized forward premium (+) or discount (−) of the EUR?",
        [["Spot USD/EUR", fx(s)], ["6-month forward points", pts(p)]],
        a, "%", 2,
        [`Forward = ${Fx(s)} + ${F(p * 0.0001)} = ${Fx(f)}.`, `Sur 6 mois : ${Fx(f)} / ${Fx(s)} − 1 = ${P(per, 4)} ; annualisé × 2 = ${Pa(a)}.`]);
    })(),
    (() => {
      const s = 152.3, p = -640;
      const f = fwdFromPoints(s, p, 0.01);
      const a = (s / f - 1) * 100;
      return q("ec-prem-m3", "moyen", "1-year forward premium (+) or discount (−) of the JPY?",
        [["Spot JPY/USD", fx(s, 2)], ["1-year forward points", pts(p)]],
        a, "%", 2,
        [`Un point = 0,01 : forward = ${F(s, 2)} − ${F(-p * 0.01, 2)} = ${F(f, 2)}.`, `Le JPY est la cotation : ${F(s, 2)} / ${F(f, 2)} − 1 = ${Pa(a)} (prime).`]);
    })(),
    (() => {
      const s = 1.27, f = 1.258, months = 9;
      const per = f / s - 1;
      const a = per * (12 / months) * 100;
      return q("ec-prem-m4", "moyen", "Annualized forward premium (+) or discount (−) of the GBP?",
        [["Spot USD/GBP", fx(s)], ["9-month forward USD/GBP", fx(f)]],
        a, "%", 2,
        [`Sur 9 mois : ${Fx(f)} / ${Fx(s)} − 1 = ${P(per, 4)}.`, `Annualisé : × 12/9 = ${Pa(a)}.`]);
    })(),
    (() => {
      const s = 7.0625, f = 7.0075;
      const a = (s / f - 1) * 100;
      return q("ec-prem-m5", "moyen", "1-month forward premium (+) or discount (−) of the EUR against the JKL?",
        [["Spot EUR/JKL", fx(s)], ["1-month forward EUR/JKL", fx(f)]],
        a, "%", 2,
        ["L'EUR est ici la devise de cotation : spot / forward − 1.", `= ${Fx(s)} / ${Fx(f)} − 1 = ${Pa(a)} (prime de l'EUR ; le JKL est en décote).`]);
    })(),
    (() => {
      const s = 0.942, pct = -0.0045, days = 120;
      const f = s * (1 + pct);
      const per = s / f - 1;
      const a = per * (360 / days) * 100;
      return q("ec-prem-d1", "difficile", "Annualized forward premium (+) or discount (−) of the CHF? (360-day year.)",
        [["Spot CHF/EUR", fx(s)], ["120-day forward quote (CHF/EUR)", spc(pct)]],
        a, "%", 2,
        [`Forward = ${Fx(s)} × ${F(1 + pct)} = ${F(f, 6)}.`,
          `Le CHF est la cotation : ${Fx(s)} / ${F(f, 6)} − 1 = 1 / ${F(1 + pct)} − 1 = ${P(per, 4)}.`,
          `Annualisé : × 360/120 = ${Pa(a)}.`]);
    })(),
    (() => {
      const s = 0.785, f = 0.7905;
      const a = (s / f - 1) * 100;
      return q("ec-prem-d2", "difficile", "1-year forward premium (+) or discount (−) of the GBP?",
        [["Spot GBP/USD", fx(s)], ["1-year forward GBP/USD", fx(f)]],
        a, "%", 2,
        ["Attention au sens : dans GBP/USD, le GBP est la devise de cotation.", `GBP : ${Fx(s)} / ${Fx(f)} − 1 = ${Pa(a)} (décote) ; l'USD est en prime de ${P(f / s - 1, 2)}.`]);
    })(),
    (() => {
      const s = 1.08, f = 1.0895, months = 6;
      const per = f / s - 1;
      const a = per * (12 / months) * 10000;
      return q("ec-prem-d3", "difficile", "Approximate annual interest rate differential (USD minus EUR) implied by the forward, in bp?",
        [["Spot USD/EUR", fx(s)], ["6-month forward USD/EUR", fx(f)]],
        a, "bp", 0,
        [`Prime de l'EUR sur 6 mois = ${Fx(f)} / ${Fx(s)} − 1 = ${P(per, 4)} ; annualisée = ${P(per * 2, 4)}.`,
          `Prime de la base ≈ i (cotation, USD) − i (base, EUR) : écart ≈ ${F(a, 0)} bp, le taux USD est le plus élevé.`]);
    })(),
    (() => {
      const s = 1.265, p = -45.5, days = 90;
      const f = fwdFromPoints(s, p);
      const per = s / f - 1;
      const a = per * (360 / days) * 100;
      return q("ec-prem-d4", "difficile", "Annualized forward premium (+) or discount (−) of the USD? (360-day year.)",
        [["Spot USD/GBP", fx(s)], ["90-day forward points", pts(p)]],
        a, "%", 2,
        [`Forward = ${Fx(s)} − ${F(-p * 0.0001, 5)} = ${F(f, 5)}.`, `L'USD est la cotation : ${Fx(s)} / ${F(f, 5)} − 1 = ${P(per, 4)}.`, `Annualisé : × 360/90 = ${Pa(a)}.`]);
    })(),
    (() => {
      const sDef = 2.5675, fDef = 2.5925, sGhi = 4.325, fGhi = 4.28, sJkl = 7.0625, fJkl = 7.0075;
      const a = (sDef / fDef - 1) * 100;
      return q("ec-prem-d5", "difficile", "1-month forward premium (+) or discount (−) of the EUR against the DEF?",
        [["EUR/DEF spot / 1-month forward", `${fx(sDef)} / ${fx(fDef)}`], ["EUR/GHI spot / 1-month forward", `${fx(sGhi)} / ${fx(fGhi)}`],
          ["EUR/JKL spot / 1-month forward", `${fx(sJkl)} / ${fx(fJkl)}`]],
        a, "%", 2,
        ["Seule la paire EUR/DEF compte ; l'EUR y est la devise de cotation.", `EUR : ${Fx(sDef)} / ${Fx(fDef)} − 1 = ${Pa(a)} (décote face au DEF).`]);
    })(),
  ],
};

/* ────────────────────────── 12 · Parité des taux couverte ────────────────────────── */

const fwdLine = (s: number, iP: number, iB: number, days: number, d = 4): string =>
  days === 360
    ? `F = ${F(s, d)} × ${F(1 + iP)} / ${F(1 + iB)}`
    : `F = ${F(s, d)} × (1 + ${F(iP)} × ${days}/360) / (1 + ${F(iB)} × ${days}/360) = ${F(s, d)} × ${F6(growth(iP, days))} / ${F6(growth(iB, days))}`;

const IRP: CalcType = {
  key: "covered-interest-parity",
  topic: "economics",
  name: "Forward d'arbitrage (parité des taux couverte)",
  tier: "essentiel",
  top: true,
  source: "LM 8 · Exchange Rate Calculations",
  formulas: [
    "F (P/B) = S (P/B) × (1 + iP × jours/360) / (1 + iB × jours/360)",
    "À 1 an : F = S × (1 + iP) / (1 + iB)",
    "Spot implicite : S = F × (1 + iB × t) / (1 + iP × t)",
    "La devise au taux le plus élevé cote en décote à terme",
  ],
  traps: [
    "Le taux de la devise de cotation (numérateur de P/B) va au numérateur.",
    "Taux annuels du marché monétaire : les ramener à la durée (jours/360), sans composer.",
  ],
  questions: [
    (() => {
      const s = 10.5, iP = 0.03, iB = 0.05, days = 360;
      const a = irpForward(s, iP, iB, days);
      return q("ec-irp-f1", "facile", "1-year no-arbitrage forward SEK/USD rate?",
        [["Spot SEK/USD", fx(s)], ["1-year SEK interest rate", pc(iP)], ["1-year USD interest rate", pc(iB)]],
        a, "", 4,
        [`${fwdLine(s, iP, iB, days)} = ${Fx(a)}.`, "Le SEK, au taux plus bas, est en prime à terme : il faut moins de SEK par USD."]);
    })(),
    (() => {
      const s = 1.085, iP = 0.0525, iB = 0.0375, days = 90;
      const a = irpForward(s, iP, iB, days);
      return q("ec-irp-f2", "facile", "90-day no-arbitrage forward USD/EUR rate?",
        [["Spot USD/EUR", fx(s)], ["90-day USD rate (annual, 360-day basis)", pc(iP)], ["90-day EUR rate (annual, 360-day basis)", pc(iB)]],
        a, "", 4,
        [`${fwdLine(s, iP, iB, days)} = ${Fx(a)}.`]);
    })(),
    (() => {
      const f = 1.12, iP = 0.045, iB = 0.01;
      const a = (f * (1 + iB)) / (1 + iP);
      return q("ec-irp-f3", "facile", "Spot USD/CHF rate consistent with the forward?",
        [["1-year forward USD/CHF", fx(f)], ["1-year USD interest rate", pc(iP)], ["1-year CHF interest rate", pc(iB)]],
        a, "", 4,
        [`S = F × (1 + iCHF) / (1 + iUSD) = ${Fx(f)} × ${F(1 + iB)} / ${F(1 + iP)} = ${Fx(a)}.`, "L'USD, au taux plus élevé, doit coter en décote à terme : S < F en USD/CHF."]);
    })(),
    (() => {
      const s = 0.86, iP = 0.05, iB = 0.03, days = 180;
      const a = irpForward(s, iP, iB, days);
      return q("ec-irp-f4", "facile", "180-day no-arbitrage forward GBP/EUR rate?",
        [["Spot GBP/EUR", fx(s)], ["180-day GBP rate (annual, 360-day basis)", pc(iP)], ["180-day EUR rate (annual, 360-day basis)", pc(iB)]],
        a, "", 4,
        [`${fwdLine(s, iP, iB, days)} = ${Fx(a)}.`]);
    })(),
    (() => {
      const s = 17.5, iP = 0.1, iB = 0.05, days = 360;
      const a = irpForward(s, iP, iB, days);
      return q("ec-irp-f5", "facile", "1-year no-arbitrage forward MXN/USD rate?",
        [["Spot MXN/USD", fx(s)], ["1-year MXN interest rate", pc(iP)], ["1-year USD interest rate", pc(iB)]],
        a, "", 4,
        [`${fwdLine(s, iP, iB, days)} = ${Fx(a)} : le MXN, au taux élevé, se déprécie à terme.`]);
    })(),
    (() => {
      const s = 1.08, f = 1.1, iB = 0.03;
      const a = ((f / s) * (1 + iB) - 1) * 100;
      return q("ec-irp-m1", "moyen", "1-year USD interest rate implied by the no-arbitrage relationship?",
        [["Spot USD/EUR", fx(s)], ["1-year forward USD/EUR", fx(f)], ["1-year EUR interest rate", pc(iB)]],
        a, "%", 2,
        ["F / S = (1 + iUSD) / (1 + iEUR) ⇒ 1 + iUSD = (F / S) × (1 + iEUR).", `= ${Fx(f)} / ${Fx(s)} × ${F(1 + iB)} = ${F(1 + a / 100, 6)} ⇒ iUSD = ${Pa(a)}.`]);
    })(),
    (() => {
      const s = 1.35, iP = 0.044, iB = 0.052, days = 270;
      const a = irpForward(s, iP, iB, days);
      return q("ec-irp-m2", "moyen", "270-day no-arbitrage forward CAD/USD rate?",
        [["Spot CAD/USD", fx(s)], ["270-day CAD rate (annual, 360-day basis)", pc(iP)], ["270-day USD rate (annual, 360-day basis)", pc(iB)]],
        a, "", 4,
        [`${fwdLine(s, iP, iB, days)} = ${Fx(a)}.`]);
    })(),
    (() => {
      const s = 150, iP = 0.005, iB = 0.05, days = 360;
      const a = irpForward(s, iP, iB, days);
      return q("ec-irp-m3", "moyen", "1-year no-arbitrage forward JPY/USD rate?",
        [["Spot JPY/USD", fx(s, 2)], ["1-year JPY interest rate", pc(iP)], ["1-year USD interest rate", pc(iB)]],
        a, "", 2,
        [`${fwdLine(s, iP, iB, days, 2)} = ${F(a, 2)}.`, `Soit ${Fpts((a - s) / 0.01, 0)} (un point = 0,01).`]);
    })(),
    (() => {
      const sEurUsd = 0.92, iUsd = 0.048, iEur = 0.032;
      const s = 1 / sEurUsd;
      const a = irpForward(s, iUsd, iEur, 360);
      return q("ec-irp-m4", "moyen", "1-year no-arbitrage forward USD/EUR rate?",
        [["Spot EUR/USD", fx(sEurUsd)], ["1-year USD interest rate", pc(iUsd)], ["1-year EUR interest rate", pc(iEur)]],
        a, "", 4,
        [`Spot USD/EUR = 1 / ${Fx(sEurUsd)} = ${F(s, 6)} : l'USD est la cotation, son taux va au numérateur.`,
          `F = ${F(s, 6)} × ${F(1 + iUsd)} / ${F(1 + iEur)} = ${Fx(a)}.`]);
    })(),
    (() => {
      const s = 1.26, f = 1.254, iP = 0.05, days = 180;
      const gB = (s / f) * growth(iP, days);
      const a = (gB - 1) * (360 / days) * 100;
      return q("ec-irp-m5", "moyen", "180-day GBP interest rate (annualized, 360-day basis) implied by the forward?",
        [["Spot USD/GBP", fx(s)], ["180-day forward USD/GBP", fx(f)], ["180-day USD rate (annual, 360-day basis)", pc(iP)]],
        a, "%", 2,
        [`1 + iGBP × 180/360 = (S / F) × (1 + iUSD × 180/360) = ${Fx(s)} / ${Fx(f)} × ${F6(growth(iP, days))} = ${F(gB, 6)}.`,
          `iGBP = (${F(gB, 6)} − 1) × 360/180 = ${Pa(a)}.`]);
    })(),
    (() => {
      const s = 0.66, iP = 0.053, iB = 0.041, days = 120, infP = 0.03, infB = 0.035;
      const a = irpForward(s, iP, iB, days);
      return q("ec-irp-d1", "difficile", "120-day forward USD/AUD rate that prevents arbitrage?",
        [["Spot USD/AUD", fx(s)], ["120-day USD rate (annual, 360-day basis)", pc(iP)], ["120-day AUD rate (annual, 360-day basis)", pc(iB)],
          ["Expected US inflation", pc(infP)], ["Expected Australian inflation", pc(infB)]],
        a, "", 4,
        ["Les inflations anticipées sont à écarter : la parité couverte n'utilise que les taux.", `${fwdLine(s, iP, iB, days)} = ${Fx(a)}.`]);
    })(),
    (() => {
      const mxnUsd = 17.2, usdEur = 1.08, iP = 0.105, iB = 0.03;
      const s = mxnUsd * usdEur;
      const a = irpForward(s, iP, iB, 360);
      return q("ec-irp-d2", "difficile", "1-year no-arbitrage forward MXN/EUR rate?",
        [["Spot MXN/USD", fx(mxnUsd)], ["Spot USD/EUR", fx(usdEur)], ["1-year MXN interest rate", pc(iP)], ["1-year EUR interest rate", pc(iB)]],
        a, "", 4,
        [`Spot croisé MXN/EUR = ${Fx(mxnUsd)} × ${Fx(usdEur)} = ${Fx(s)}.`, `F = ${Fx(s)} × ${F(1 + iP)} / ${F(1 + iB)} = ${Fx(a)}.`]);
    })(),
    (() => {
      const f = 1.095, iP = 0.054, iB = 0.036, days = 90;
      const a = (f * growth(iB, days)) / growth(iP, days);
      return q("ec-irp-d3", "difficile", "Spot USD/EUR rate consistent with the 90-day forward?",
        [["90-day forward USD/EUR", fx(f)], ["90-day USD rate (annual, 360-day basis)", pc(iP)], ["90-day EUR rate (annual, 360-day basis)", pc(iB)]],
        a, "", 4,
        [`S = F × (1 + iEUR × 90/360) / (1 + iUSD × 90/360) = ${Fx(f)} × ${F6(growth(iB, days))} / ${F6(growth(iP, days))}.`, `S = ${Fx(a)}.`]);
    })(),
    (() => {
      const s = 162.4, iP = 0.0025, iB = 0.038, days = 60;
      const a = irpForward(s, iP, iB, days);
      return q("ec-irp-d4", "difficile", "60-day no-arbitrage forward JPY/EUR rate?",
        [["Spot JPY/EUR", fx(s, 2)], ["60-day JPY rate (annual, 360-day basis)", pc(iP)], ["60-day EUR rate (annual, 360-day basis)", pc(iB)]],
        a, "", 2,
        [`${fwdLine(s, iP, iB, days, 2)} = ${F(a, 2)}.`, "L'EUR, au taux plus élevé, cote en décote à terme."]);
    })(),
    (() => {
      const s = 1.1, p = 41.5, iB = 0.032, days = 90;
      const f = fwdFromPoints(s, p);
      const gP = (f / s) * growth(iB, days);
      const a = (gP - 1) * (360 / days) * 100;
      return q("ec-irp-d5", "difficile", "90-day USD interest rate (annualized, 360-day basis) implied by the forward quote?",
        [["Spot USD/EUR", fx(s)], ["90-day forward points", pts(p)], ["90-day EUR rate (annual, 360-day basis)", pc(iB)]],
        a, "%", 2,
        [`Forward = ${Fx(s)} + ${F(p * 0.0001, 5)} = ${F(f, 5)}.`,
          `1 + iUSD × 90/360 = (F / S) × (1 + iEUR × 90/360) = ${F(f / s, 6)} × ${F6(growth(iB, days))} = ${F(gP, 6)}.`,
          `iUSD = (${F(gP, 6)} − 1) × 4 = ${Pa(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 13 · Arbitrage couvert ────────────────────────── */

const ARBITRAGE: CalcType = {
  key: "covered-interest-arbitrage",
  topic: "economics",
  name: "Arbitrage de taux couvert (covered interest arbitrage)",
  tier: "annexe",
  source: "LM 8 · Exchange Rate Calculations",
  formulas: [
    "Rendement couvert d'un dépôt étranger = (1 + i étranger × t) × F / S − 1 (cotations domestique/étrangère)",
    "Forward de marché < forward de parité (P/B) : emprunter la base, convertir, placer en cotation, revendre à terme",
    "Forward de marché > forward de parité : emprunter la cotation, convertir, placer en base, vendre la base à terme",
    "Profit = montant reconverti au forward − remboursement de l'emprunt (capital + intérêts)",
  ],
  traps: [
    "Le profit se mesure dans la devise empruntée.",
    "Sur moins d'un an, ramener les taux à la durée (jours/360).",
  ],
  questions: [
    (() => {
      const s = 1.1, f = 1.12, iF = 0.03;
      const a = ((1 + iF) * f / s - 1) * 100;
      return q("ec-arb-f1", "facile", "1-year USD return on a EUR deposit hedged with a forward contract?",
        [["Spot USD/EUR", fx(s)], ["1-year forward USD/EUR", fx(f)], ["1-year EUR deposit rate", pc(iF)]],
        a, "%", 2,
        [`1 USD → 1 / ${Fx(s)} EUR, placé à ${P(iF)}, revendu au forward ${Fx(f)}.`, `Rendement = ${F(1 + iF)} × ${Fx(f)} / ${Fx(s)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const s = 0.8, f = 0.79, iF = 0.05;
      const a = ((1 + iF) * f / s - 1) * 100;
      return q("ec-arb-f2", "facile", "1-year GBP return on a USD deposit hedged with a forward contract?",
        [["Spot GBP/USD", fx(s)], ["1-year forward GBP/USD", fx(f)], ["1-year USD deposit rate", pc(iF)]],
        a, "%", 2,
        [`1 GBP → 1 / ${Fx(s)} USD, placé à ${P(iF)}, reconverti à ${Fx(f)} GBP/USD.`, `Rendement = ${F(1 + iF)} × ${Fx(f)} / ${Fx(s)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const s = 1.25, iP = 0.04, iB = 0.05, fm = 1.245;
      const fStar = irpForward(s, iP, iB, 360);
      const a = (fm - fStar) / 0.0001;
      return q("ec-arb-f3", "facile", "By how many points does the quoted forward exceed the no-arbitrage forward?",
        [["Spot USD/GBP", fx(s)], ["1-year USD interest rate", pc(iP)], ["1-year GBP interest rate", pc(iB)], ["Quoted 1-year forward USD/GBP", fx(fm)]],
        a, "", 1,
        [`Forward de parité = ${Fx(s)} × ${F(1 + iP)} / ${F(1 + iB)} = ${F(fStar, 6)}.`, `Écart = (${Fx(fm)} − ${F(fStar, 6)}) / 0,0001 = ${Fpts(a, 1)} : le GBP est trop cher à terme.`]);
    })(),
    (() => {
      const s = 17, f = 17.5, iF = 0.1, iD = 0.05;
      const a = ((1 + iF) * s / f - 1) * 100;
      return q("ec-arb-f4", "facile", "1-year USD return on a MXN deposit hedged with a forward contract?",
        [["Spot MXN/USD", fx(s)], ["1-year forward MXN/USD", fx(f)], ["1-year MXN deposit rate", pc(iF)], ["1-year USD deposit rate", pc(iD)]],
        a, "%", 2,
        [`1 USD → ${Fx(s)} MXN, placés à ${P(iF)}, reconvertis en divisant par ${Fx(f)}.`,
          `Rendement = ${F(1 + iF)} × ${Fx(s)} / ${Fx(f)} − 1 = ${Pa(a)} > ${P(iD)} : le forward est mal coté, il y a arbitrage.`]);
    })(),
    (() => {
      const s = 1.36, f = 1.35, iF = 0.052, days = 180;
      const a = (growth(iF, days) * f / s - 1) * 100;
      return q("ec-arb-f5", "facile", "6-month CAD return (not annualized) on a hedged USD deposit?",
        [["Spot CAD/USD", fx(s)], ["6-month forward CAD/USD", fx(f)], ["6-month USD deposit rate (annual, 360-day basis)", pc(iF)]],
        a, "%", 2,
        [`Croissance en USD sur 180 jours = 1 + ${F(iF)} × 180/360 = ${F6(growth(iF, days))}.`, `Rendement = ${F6(growth(iF, days))} × ${Fx(f)} / ${Fx(s)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const loan = 1000000, s = 17, fm = 17.5, iP = 0.1, iB = 0.05;
      const fStar = irpForward(s, iP, iB, 360);
      const mxn = loan * s * (1 + iP);
      const back = mxn / fm;
      const a = back - loan * (1 + iB);
      return q("ec-arb-m1", "moyen", "Arbitrage profit, in USD, on USD 1,000,000 borrowed?",
        [["Spot MXN/USD", fx(s)], ["Quoted 1-year forward MXN/USD", fx(fm)], ["1-year MXN interest rate", pc(iP)], ["1-year USD interest rate", pc(iB)]],
        a, "$", 2,
        [`Forward de parité = ${Fx(s)} × ${F(1 + iP)} / ${F(1 + iB)} = ${Fx(fStar)} > ${Fx(fm)} : le MXN est trop cher à terme.`,
          `Emprunter ${D(loan)}, convertir en ${C(loan * s, "MXN")}, placer : ${C(mxn, "MXN")} dans un an.`,
          `Revendre au forward : ${F(mxn)} / ${Fx(fm)} = ${D(back, 2)} ; rembourser ${D(loan * (1 + iB))}.`,
          `Profit = ${D(a, 2)}.`]);
    })(),
    (() => {
      const loan = 1000000, s = 1.1, fm = 1.13, iP = 0.05, iB = 0.03;
      const fStar = irpForward(s, iP, iB, 360);
      const eur = (loan / s) * (1 + iB);
      const back = eur * fm;
      const a = back - loan * (1 + iP);
      return q("ec-arb-m2", "moyen", "Arbitrage profit, in USD, on USD 1,000,000 borrowed?",
        [["Spot USD/EUR", fx(s)], ["Quoted 1-year forward USD/EUR", fx(fm)], ["1-year USD interest rate", pc(iP)], ["1-year EUR interest rate", pc(iB)]],
        a, "$", 2,
        [`Forward de parité = ${Fx(s)} × ${F(1 + iP)} / ${F(1 + iB)} = ${Fx(fStar)} < ${Fx(fm)} : l'EUR est trop cher à terme, on le vend à terme.`,
          `Emprunter ${D(loan)}, convertir en ${C(loan / s, "EUR", 2)}, placer : ${C(eur, "EUR", 2)}.`,
          `Vendre les EUR à terme : ${F(eur, 2)} × ${Fx(fm)} = ${D(back, 2)} ; rembourser ${D(loan * (1 + iP))}.`,
          `Profit = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s = 1.27, f = 1.266, iF = 0.052, days = 90;
      const per = growth(iF, days) * f / s - 1;
      const a = per * (360 / days) * 100;
      return q("ec-arb-m3", "moyen", "Annualized USD return (360-day basis) on a hedged 90-day GBP deposit?",
        [["Spot USD/GBP", fx(s)], ["90-day forward USD/GBP", fx(f)], ["90-day GBP deposit rate (annual, 360-day basis)", pc(iF)]],
        a, "%", 2,
        [`Sur 90 jours : ${F6(growth(iF, days))} × ${Fx(f)} / ${Fx(s)} − 1 = ${P(per, 4)}.`, `Annualisé : × 360/90 = ${Pa(a)}.`]);
    })(),
    (() => {
      const loan = 100000000, s = 150, fm = 144, iP = 0.005, iB = 0.05;
      const fStar = irpForward(s, iP, iB, 360);
      const usdAmt = (loan / s) * (1 + iB);
      const back = usdAmt * fm;
      const a = back - loan * (1 + iP);
      return q("ec-arb-m4", "moyen", "Arbitrage profit, in JPY, on JPY 100,000,000 borrowed?",
        [["Spot JPY/USD", fx(s, 2)], ["Quoted 1-year forward JPY/USD", fx(fm, 2)], ["1-year JPY interest rate", pc(iP)], ["1-year USD interest rate", pc(iB)]],
        a, "", 0,
        [`Forward de parité = ${F(s)} × ${F(1 + iP)} / ${F(1 + iB)} = ${F(fStar, 2)} < ${F(fm, 2)} : l'USD est trop cher à terme, on le vend à terme.`,
          `${C(loan, "JPY")} → ${C(loan / s, "USD", 2)}, placés à ${P(iB)} : ${C(usdAmt, "USD", 2)}.`,
          `Vente à terme : × ${F(fm)} = ${C(back, "JPY")} ; remboursement ${C(loan * (1 + iP), "JPY")}.`,
          `Profit = ${C(a, "JPY", 0)}.`]);
    })(),
    (() => {
      const loan = 1000000, s = 0.95, fm = 0.94, iP = 0.01, iB = 0.035, days = 180;
      const fStar = irpForward(s, iP, iB, days);
      const eur = (loan / s) * growth(iB, days);
      const back = eur * fm;
      const a = back - loan * growth(iP, days);
      return q("ec-arb-m5", "moyen", "Arbitrage profit, in CHF, on CHF 1,000,000 borrowed for 180 days?",
        [["Spot CHF/EUR", fx(s)], ["Quoted 180-day forward CHF/EUR", fx(fm)], ["180-day CHF rate (annual, 360-day basis)", pc(iP)], ["180-day EUR rate (annual, 360-day basis)", pc(iB)]],
        a, "", 0,
        [`Forward de parité : ${fwdLine(s, iP, iB, days)} = ${F(fStar, 6)} < ${Fx(fm)} : on vend l'EUR à terme.`,
          `${C(loan, "CHF")} → ${C(loan / s, "EUR", 2)}, placés : ${C(eur, "EUR", 2)}.`,
          `Reconversion : × ${Fx(fm)} = ${C(back, "CHF", 2)} ; remboursement ${C(loan * growth(iP, days), "CHF")}.`,
          `Profit = ${C(a, "CHF", 0)}.`]);
    })(),
    (() => {
      const loan = 1000000, s = 11.4, fm = 11.3, iP = 0.03, iB = 0.038, days = 270;
      const fStar = irpForward(s, iP, iB, days);
      const sek = loan * s * growth(iP, days);
      const back = sek / fm;
      const a = back - loan * growth(iB, days);
      return q("ec-arb-d1", "difficile", "Arbitrage profit, in EUR, on EUR 1,000,000 borrowed for 270 days?",
        [["Spot SEK/EUR", fx(s)], ["Quoted 270-day forward SEK/EUR", fx(fm)], ["270-day SEK rate (annual, 360-day basis)", pc(iP)], ["270-day EUR rate (annual, 360-day basis)", pc(iB)]],
        a, "", 0,
        [`Forward de parité : ${fwdLine(s, iP, iB, days)} = ${Fx(fStar)} > ${Fx(fm)} : le SEK est cher à terme, on le revend à terme.`,
          `${C(loan, "EUR")} → ${C(loan * s, "SEK")}, placés à ${P(iP)} × 270/360 : ${C(sek, "SEK")}.`,
          `Reconversion : ${F(sek)} / ${Fx(fm)} = ${C(back, "EUR", 2)} ; remboursement ${C(loan * growth(iB, days), "EUR")}.`,
          `Profit = ${C(a, "EUR", 0)}.`]);
    })(),
    (() => {
      const s = 1.1, fm = 1.13, iP = 0.05, iB = 0.03;
      const iBStar = (s * (1 + iP)) / fm - 1;
      const a = (iBStar - iB) * 10000;
      return q("ec-arb-d2", "difficile", "Change in the EUR rate (bp) that would eliminate the arbitrage, other inputs unchanged?",
        [["Spot USD/EUR", fx(s)], ["Quoted 1-year forward USD/EUR", fx(fm)], ["1-year USD interest rate", pc(iP)], ["1-year EUR interest rate", pc(iB)]],
        a, "bp", 0,
        [`Parité : 1 + iEUR = S × (1 + iUSD) / F = ${Fx(s)} × ${F(1 + iP)} / ${Fx(fm)} = ${F(1 + iBStar, 6)}.`,
          `iEUR d'équilibre = ${P(iBStar, 4)} contre ${P(iB)} : variation = ${F(a, 0)} bp.`]);
    })(),
    (() => {
      const iD = 0.045, iF = 0.032, s = 1.09, f = 1.105;
      const covered = (1 + iF) * f / s - 1;
      const a = (covered - iD) * 10000;
      return q("ec-arb-d3", "difficile", "Excess of the hedged EUR deposit return over the USD deposit rate, in bp?",
        [["1-year USD deposit rate", pc(iD)], ["1-year EUR deposit rate", pc(iF)], ["Spot USD/EUR", fx(s)], ["1-year forward USD/EUR", fx(f)]],
        a, "bp", 0,
        [`Rendement couvert en USD = ${F(1 + iF)} × ${Fx(f)} / ${Fx(s)} − 1 = ${P(covered, 4)}.`, `Écart = ${P(covered, 4)} − ${P(iD)} = ${F(a, 0)} bp : il vaut mieux placer en EUR couvert.`]);
    })(),
    (() => {
      const loan = 2000000, s = 1.25, fm = 1.248, iP = 0.056, iB = 0.048, days = 90;
      const fStar = irpForward(s, iP, iB, days);
      const usdAmt = loan * s * growth(iP, days);
      const back = usdAmt / fm;
      const a = back - loan * growth(iB, days);
      return q("ec-arb-d4", "difficile", "Arbitrage profit, in GBP, on GBP 2,000,000 borrowed for 90 days?",
        [["Spot USD/GBP", fx(s)], ["Quoted 90-day forward USD/GBP", fx(fm)], ["90-day USD rate (annual, 360-day basis)", pc(iP)], ["90-day GBP rate (annual, 360-day basis)", pc(iB)]],
        a, "", 0,
        [`Forward de parité : ${fwdLine(s, iP, iB, days)} = ${F(fStar, 6)} > ${Fx(fm)} : le GBP est bon marché à terme, on le rachète.`,
          `${C(loan, "GBP")} → ${D(loan * s)}, placés : ${D(usdAmt)}.`,
          `Rachat de GBP au forward : ${F(usdAmt)} / ${Fx(fm)} = ${C(back, "GBP", 2)} ; remboursement ${C(loan * growth(iB, days), "GBP")}.`,
          `Profit = ${C(a, "GBP", 0)}.`]);
    })(),
    (() => {
      const loan = 1000000, s = 1.08, p = 120, iP = 0.04, iB = 0.025;
      const fm = fwdFromPoints(s, p);
      const fStar = irpForward(s, iP, iB, 360);
      const usdAmt = loan * s * (1 + iP);
      const back = usdAmt / fm;
      const a = back - loan * (1 + iB);
      return q("ec-arb-d5", "difficile", "Arbitrage profit, in EUR, on EUR 1,000,000 borrowed?",
        [["Spot USD/EUR", fx(s)], ["Quoted 1-year forward points", pts(p)], ["1-year USD interest rate", pc(iP)], ["1-year EUR interest rate", pc(iB)]],
        a, "", 0,
        [`Forward coté = ${Fx(s)} + ${F(p * 0.0001)} = ${Fx(fm)} ; forward de parité = ${Fx(s)} × ${F(1 + iP)} / ${F(1 + iB)} = ${Fx(fStar)}.`,
          `Forward coté trop bas : emprunter des EUR, les convertir en ${D(loan * s)}, placer : ${D(usdAmt)}.`,
          `Racheter les EUR au forward : ${F(usdAmt)} / ${Fx(fm)} = ${C(back, "EUR", 2)} ; rembourser ${C(loan * (1 + iB), "EUR")}.`,
          `Profit = ${C(a, "EUR", 0)}.`]);
    })(),
  ],
};

/* ────────────────────────── Catalogue ────────────────────────── */

export const ECONOMICS_CALC: CalcCatalog = {
  topic: "economics",
  types: [
    BREAKEVEN,
    PROFIT_MAX,
    CONCENTRATION,
    FISCAL,
    NEUTRAL,
    REAL_FX,
    CURRENCY_CHANGE,
    TRADE_BALANCE,
    CROSS,
    FWD_POINTS,
    PREMIUM,
    IRP,
    ARBITRAGE,
  ],
};
