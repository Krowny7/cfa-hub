// Exercices de calcul pur : Quantitative Methods (CFA Level I).
//
// Contenu seulement : le moteur et les pages vivent ailleurs (lib/calc/engine.ts, app/calculs).
// Règle d'or : chaque réponse est CALCULÉE ici, à partir des mêmes nombres que les données
// affichées, par les petites fonctions du haut de fichier. Aucune réponse tapée à la main.
// Formules vérifiées dans Schweser Level I, Book 1 (Readings 1 à 10 = LM 1 à 10 du curriculum
// Quantitative Methods 2025-2026) et recoupées avec la banque officielle de practice exams.
//
// Conventions : énoncés et données en anglais d'examen ; solutions en français, nombres au format
// français. Pour une réponse en %, `answer` vaut déjà le pourcentage (8,5 % → 8.5).
// Variances et covariances « en %² » : 0,0028 en décimal = 28 (%²).
// Volontairement absents (hors calcul au programme 2025-2026) : loi binomiale et intervalle de
// confiance d'une moyenne (sortis du curriculum), skewness et kurtosis (à interpréter, pas à
// calculer), portefeuille de 2 actifs (traité dans Portfolio Management).

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

const isInt = (x: number): boolean => Math.abs(x - Math.round(x)) < 1e-9;

/** Nombre au format français (solutions). Sans `d` : jusqu'à 4 décimales, zéros inutiles retirés. */
const F = (x: number, d?: number): string => numStr(x, d, ",", NBSP);
/** Montant en dollars, format français : « 1 234,50 $ ». */
const D = (x: number, d?: number): string => `${F(x, d ?? (isInt(x) ? 0 : 2))} $`;
/** Pourcentage à partir d'une fraction (0,085 → « 8,5% »). */
const P = (frac: number, d?: number): string => `${F(frac * 100, d)}%`;
/** Pourcentage déjà exprimé en % (réponses). */
const Pa = (pct: number, d = 2): string => `${F(pct, d)}%`;
/** Liste de nombres au format français : « 30 ; 12 ; 25 ». */
const Fl = (xs: number[], d?: number): string => xs.map((x) => F(x, d)).join(" ; ");
/** Nombre négatif entre parenthèses dans un produit : « 0,25 × (−6) ». */
const Fp = (x: number, d?: number): string => (x < 0 ? `(${F(x, d)})` : F(x, d));
/** Somme signée lisible : [5, −2, 3] → « 5 − 2 + 3 ». */
const terms = (xs: number[], d?: number): string =>
  xs.map((x, i) => (i === 0 ? F(x, d) : x < 0 ? ` − ${F(-x, d)}` : ` + ${F(x, d)}`)).join("");
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** Exposant affiché : 3 → « ³ », 48 → « ⁴⁸ ». */
const sup = (t: number): string =>
  isInt(t) && t >= 0
    ? String(Math.round(t))
        .split("")
        .map((c) => SUP.charAt(Number(c)))
        .join("")
    : `^${F(t)}`;
/** Facteur de capitalisation affiché : (1 + r)^t → « 1,12³ ». */
const pw = (r: number, t: number, d?: number): string => `${F(1 + r, d)}${t === 1 ? "" : sup(t)}`;

/** Formats anglais (données d'énoncé). */
const E = (x: number, d?: number): string => numStr(x, d, ".", ",");
const usd = (x: number, d?: number): string => `${x < 0 ? MINUS : ""}$${E(Math.abs(x), d ?? (isInt(x) ? 0 : 2))}`;
const pc = (frac: number, d?: number): string => `${E(frac * 100, d)}%`;
/** Liste de valeurs déjà en % : [12, −3] → « 12% / −3% ». */
const pcs = (xs: number[]): string => xs.map((x) => `${E(x)}%`).join(" / ");
const lst = (xs: string[]): string => xs.join(" / ");

type Row = [string, string];

/**
 * Questions strictes (CalcQuestion.strict) : seule la tolérance absolue compte, pour refuser un
 * raccourci faux qui tombe à moins de 0,2 % de la réponse. `true` = demi-unité de la dernière
 * décimale ; un nombre = tolérance absolue propre. En commentaire : valeurs refusées (réponse).
 */
const STRICT: Record<string, true | number> = {
  "qm-arb-m3": true, // F ≈ S × (1 + écart de taux) = 1,2437 (1,2440)
  "qm-arb-m4": true, // forward « arithmétique » (3 × S3 − S1) / 2 = 4,25 (4,26)
  "qm-arb-d2": true, // forward « arithmétique » 2 × S2 − S1 = 7,75 (7,76)
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

/* ────────────────────────── Fonctions de calcul ────────────────────────── */

const sum = (xs: number[]): number => xs.reduce((s, x) => s + x, 0);
const mean = (xs: number[]): number => sum(xs) / xs.length;
const sq = (x: number): number => x * x;

/** Racine d'une fonction monotone par dichotomie (f(lo) et f(hi) de signes opposés). */
function solve(f: (x: number) => number, lo: number, hi: number): number {
  let a = lo;
  let b = hi;
  const fa0 = f(a);
  for (let i = 0; i < 300; i++) {
    const m = (a + b) / 2;
    const fm = f(m);
    if (fm === 0) return m;
    if (fm > 0 === fa0 > 0) a = m;
    else b = m;
  }
  return (a + b) / 2;
}

// LM 1 et 2 · Rates and Returns, The Time Value of Money in Finance
const pvLump = (fv: number, r: number, n: number): number => fv / Math.pow(1 + r, n);
const fvLump = (pv: number, r: number, n: number): number => pv * Math.pow(1 + r, n);
const ear = (stated: number, m: number): number => Math.pow(1 + stated / m, m) - 1;
const annuityPV = (pmt: number, r: number, n: number): number => (pmt * (1 - Math.pow(1 + r, -n))) / r;
const annuityFV = (pmt: number, r: number, n: number): number => (pmt * (Math.pow(1 + r, n) - 1)) / r;
const annuityPmt = (pv: number, r: number, n: number): number => (pv * r) / (1 - Math.pow(1 + r, -n));
/** NPV : cfs[0] tombe aujourd'hui, cfs[t] à la date t. */
const npv = (r: number, cfs: number[]): number => cfs.reduce((s, cf, t) => s + cf / Math.pow(1 + r, t), 0);
const irr = (cfs: number[], lo = -0.5, hi = 1): number => solve((r) => npv(r, cfs), lo, hi);
const bondPrice = (face: number, coupon: number, y: number, n: number): number =>
  annuityPV(coupon, y, n) + pvLump(face, y, n);
const ytm = (price: number, face: number, coupon: number, n: number): number =>
  solve((y) => bondPrice(face, coupon, y, n) - price, 0.0001, 1);
const hpr = (p0: number, p1: number, income = 0): number => (p1 - p0 + income) / p0;
const linked = (rs: number[]): number => rs.reduce((a, r) => a * (1 + r), 1) - 1;
const geoMean = (rs: number[]): number => Math.pow(1 + linked(rs), 1 / rs.length) - 1;
const harmonic = (xs: number[]): number => xs.length / sum(xs.map((x) => 1 / x));
const annualizeDays = (h: number, days: number): number => Math.pow(1 + h, 365 / days) - 1;
const leveraged = (r: number, v0: number, vb: number, rb: number): number => r + (vb / v0) * (r - rb);

// LM 2 · forward rates, change à terme, arbre binomial à une période
type Binomial = { cu: number; cd: number; h: number; v1: number; v0: number; c0: number };
function binomialCall(s0: number, su: number, sd: number, x: number, rf: number): Binomial {
  const cu = Math.max(su - x, 0);
  const cd = Math.max(sd - x, 0);
  const h = (cu - cd) / (su - sd);
  const v1 = h * sd - cd;
  const v0 = v1 / (1 + rf);
  return { cu, cd, h, v1, v0, c0: h * s0 - v0 };
}

// LM 3 · Statistical Measures of Asset Returns
const devs = (xs: number[]): number[] => {
  const m = mean(xs);
  return xs.map((x) => x - m);
};
const ssd = (xs: number[]): number => sum(devs(xs).map(sq));
const sampleVar = (xs: number[]): number => ssd(xs) / (xs.length - 1);
const sampleSd = (xs: number[]): number => Math.sqrt(sampleVar(xs));
const mad = (xs: number[]): number => sum(devs(xs).map((d) => Math.abs(d))) / xs.length;
const downsideDev = (xs: number[], target: number): number =>
  Math.sqrt(sum(xs.filter((x) => x < target).map((x) => sq(x - target))) / (xs.length - 1));
const sorted = (xs: number[]): number[] => [...xs].sort((a, b) => a - b);

// LM 4 et 5 · Probability Trees, Portfolio Mathematics
const ev = (ps: number[], xs: number[]): number => sum(ps.map((p, i) => p * xs[i]));
const pVar = (ps: number[], xs: number[]): number => {
  const m = ev(ps, xs);
  return sum(ps.map((p, i) => p * sq(xs[i] - m)));
};
const pCov = (ps: number[], xs: number[], ys: number[]): number => {
  const mx = ev(ps, xs);
  const my = ev(ps, ys);
  return sum(ps.map((p, i) => p * (xs[i] - mx) * (ys[i] - my)));
};
const sfr = (er: number, rl: number, sd: number): number => (er - rl) / sd;
/** Fonction de répartition de la loi normale centrée réduite (Abramowitz-Stegun 26.2.17, erreur < 1e-7). */
function normCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

// LM 8 et 9 · Hypothesis Testing, Tests of Independence
const tCorr = (r: number, n: number): number => (r * Math.sqrt(n - 2)) / Math.sqrt(1 - r * r);
/** Rangs décroissants (1 = la plus forte valeur), ex aequo au rang moyen. */
const ranksDesc = (xs: number[]): number[] =>
  xs.map((x) => 1 + xs.filter((y) => y > x).length + (xs.filter((y) => y === x).length - 1) / 2);
const spearman = (rx: number[], ry: number[]): number => {
  const n = rx.length;
  const d2 = sum(rx.map((r, i) => sq(r - ry[i])));
  return 1 - (6 * d2) / (n * (n * n - 1));
};
type Contingency = { rows: number[]; cols: number[]; total: number; exp: number[][]; terms: number[][]; stat: number };
function contingency(obs: number[][]): Contingency {
  const rows = obs.map((r) => sum(r));
  const cols = obs[0].map((_, j) => sum(obs.map((r) => r[j])));
  const total = sum(rows);
  const exp = obs.map((r, i) => r.map((_, j) => (rows[i] * cols[j]) / total));
  const terms = obs.map((r, i) => r.map((o, j) => sq(o - exp[i][j]) / exp[i][j]));
  return { rows, cols, total, exp, terms, stat: sum(terms.map((r) => sum(r))) };
}

// LM 10 · Simple Linear Regression
type Ols = { mx: number; my: number; sxy: number; sxx: number; b1: number; b0: number; sst: number; ssr: number; sse: number };
function ols(xs: number[], ys: number[]): Ols {
  const mx = mean(xs);
  const my = mean(ys);
  const sxy = sum(xs.map((x, i) => (x - mx) * (ys[i] - my)));
  const sxx = sum(xs.map((x) => sq(x - mx)));
  const b1 = sxy / sxx;
  const b0 = my - b1 * mx;
  const sst = sum(ys.map((y) => sq(y - my)));
  const ssr = b1 * b1 * sxx;
  return { mx, my, sxy, sxx, b1, b0, sst, ssr, sse: sst - ssr };
}

/* ────────────────────────── 1 · TVM : flux unique ────────────────────────── */

const TVM: CalcType = {
  key: "tvm-lump-sum",
  topic: "quant",
  name: "TVM : flux unique et fréquence de composition (EAR)",
  tier: "essentiel",
  source: "LM 2 · The Time Value of Money in Finance",
  formulas: [
    "FV = PV × (1 + r/m)^(m × N) ; PV = FV / (1 + r/m)^(m × N)",
    "EAR = (1 + taux annuel déclaré / m)^m − 1",
    "Composition continue : FV = PV × e^(r × N) ; EAR = e^r − 1",
    "Rendement implicite : r = (FV / PV)^(1/N) − 1 ; durée : N = ln(FV / PV) / ln(1 + r)",
  ],
  traps: [
    "Composition infra-annuelle : taux périodique = taux déclaré / m, et nombre de périodes = m × N.",
    "Le taux déclaré (stated) n'est pas l'EAR : à taux déclaré égal, plus m est grand, plus l'EAR est élevé.",
    "Un taux négatif (zero-coupon) donne un prix au-dessus du nominal.",
  ],
  questions: [
    (() => {
      const cf = 500, r = 0.05, n = 3;
      const a = pvLump(cf, r, n);
      return q("qm-tvm-f1", "facile", "Present value of the cash flow?",
        [[`Cash flow received in ${n} years`, usd(cf)], ["Discount rate (annual compounding)", pc(r)]],
        a, "$", 2,
        ["PV = FV / (1 + r)^N.",
          `PV = ${F(cf)} / ${pw(r, n)} = ${F(cf)} / ${F(Math.pow(1 + r, n), 6)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const pv0 = 10000, r = 0.045, n = 6;
      const a = fvLump(pv0, r, n);
      return q("qm-tvm-f2", "facile", "Future value of the investment?",
        [["Amount invested today", usd(pv0)], ["Annual interest rate (annual compounding)", pc(r)], ["Horizon", `${n} years`]],
        a, "$", 2,
        ["FV = PV × (1 + r)^N.",
          `FV = ${F(pv0)} × ${pw(r, n)} = ${F(pv0)} × ${F(Math.pow(1 + r, n), 6)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const rs = 0.08, m = 4;
      const a = ear(rs, m) * 100;
      return q("qm-tvm-f3", "facile", "Effective annual rate (EAR)?",
        [["Stated annual rate", pc(rs)], ["Compounding", "Quarterly"]],
        a, "%", 2,
        [`Taux trimestriel = ${P(rs)} / ${m} = ${P(rs / m)}.`,
          `EAR = ${pw(rs / m, m)} − 1 = ${F(Math.pow(1 + rs / m, m), 6)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const rs = 0.09;
      const a = (Math.exp(rs) - 1) * 100;
      return q("qm-tvm-f4", "facile", "Effective annual rate (EAR)?",
        [["Stated annual rate", pc(rs)], ["Compounding", "Continuous"]],
        a, "%", 2,
        ["Composition continue : EAR = e^r − 1.",
          `EAR = e^${F(rs)} − 1 = ${F(Math.exp(rs), 6)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const face = 1000, y = 0.04, n = 15;
      const a = pvLump(face, y, n);
      return q("qm-tvm-f5", "facile", "Price of the zero-coupon bond?",
        [["Face value", usd(face)], ["Maturity", `${n} years`], ["Yield to maturity (annual compounding)", pc(y)]],
        a, "$", 2,
        ["Un zero-coupon ne verse que le nominal à l'échéance : prix = nominal / (1 + YTM)^N.",
          `Prix = ${F(face)} / ${pw(y, n)} = ${F(face)} / ${F(Math.pow(1 + y, n), 6)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const pv0 = 25000, rs = 0.06, m = 12, years = 4;
      const i = rs / m, n = m * years;
      const a = fvLump(pv0, i, n);
      return q("qm-tvm-m1", "moyen", "Future value of the deposit?",
        [["Deposit today", usd(pv0)], ["Stated annual rate", pc(rs)], ["Compounding", "Monthly"], ["Horizon", `${years} years`]],
        a, "$", 2,
        [`Taux mensuel = ${P(rs)} / ${m} = ${P(i)} ; nombre de périodes = ${m} × ${years} = ${n}.`,
          `FV = ${F(pv0)} × ${pw(i, n)} = ${F(pv0)} × ${F(Math.pow(1 + i, n), 6)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const face = 100, y = -0.005, n = 15;
      const a = pvLump(face, y, n);
      return q("qm-tvm-m2", "moyen", "Price of the zero-coupon bond per 100 of face value?",
        [["Face value", E(face)], ["Maturity", `${n} years`], ["Yield to maturity (annual compounding)", pc(y)]],
        a, "", 2,
        ["Même formule avec un taux négatif : 1 + YTM < 1, donc le prix dépasse le nominal.",
          `Prix = ${F(face)} / ${pw(y, n)} = ${F(face)} / ${F(Math.pow(1 + y, n), 6)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const price = 650, face = 1000, n = 15;
      const a = (Math.pow(face / price, 1 / n) - 1) * 100;
      return q("qm-tvm-m3", "moyen", "Annualized return implied by the zero-coupon bond's price?",
        [["Price today", usd(price)], ["Face value", usd(face)], ["Maturity", `${n} years`], ["Compounding", "Annual"]],
        a, "%", 2,
        ["r = (FV / PV)^(1/N) − 1 (calculatrice : N, PV, FV → CPT I/Y).",
          `r = (${F(face)} / ${F(price)})^(1/${n}) − 1 = ${F(face / price, 6)}^(1/${n}) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const target = 0.1, m = 2;
      const per = Math.pow(1 + target, 1 / m) - 1;
      const a = per * m * 100;
      return q("qm-tvm-m4", "moyen", "Stated annual rate (semiannual compounding) that gives this EAR?",
        [["Target effective annual rate", pc(target)], ["Compounding", "Semiannual"]],
        a, "%", 2,
        ["(1 + r/2)² = 1 + EAR : on remonte au taux semestriel, puis on le multiplie par 2.",
          `Taux semestriel = ${F(1 + target)}^(1/2) − 1 = ${P(per, 4)}.`,
          `Taux annuel déclaré = 2 × ${P(per, 4)} = ${Pa(a)} (sous les 10 % : la composition fait le reste).`]);
    })(),
    (() => {
      const fv1 = 50000, rc = 0.06, years = 5;
      const a = fv1 * Math.exp(-rc * years);
      return q("qm-tvm-m5", "moyen", "Present value of the payment?",
        [["Payment received in 5 years", usd(fv1)], ["Annual rate, continuously compounded", pc(rc)]],
        a, "$", 2,
        ["Composition continue : PV = FV × e^(−r × N).",
          `r × N = ${F(rc)} × ${years} = ${F(rc * years)} ; e^−${F(rc * years)} = ${F(Math.exp(-rc * years), 6)}.`,
          `PV = ${F(fv1)} × ${F(Math.exp(-rc * years), 6)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const pv0 = 20000, fv1 = 35000, r = 0.065;
      const a = Math.log(fv1 / pv0) / Math.log(1 + r);
      return q("qm-tvm-d1", "difficile", "Number of years needed to reach the target amount?",
        [["Amount invested today", usd(pv0)], ["Target amount", usd(fv1)], ["Annual return (annual compounding)", pc(r)]],
        a, "years", 2,
        [`${F(pv0)} × ${F(1 + r)}^N = ${F(fv1)}, donc ${F(1 + r)}^N = ${F(fv1 / pv0)}.`,
          `N = ln(${F(fv1 / pv0)}) / ln(${F(1 + r)}) = ${F(Math.log(fv1 / pv0), 5)} / ${F(Math.log(1 + r), 5)}.`,
          `N = ${F(a, 2)} ans (calculatrice : I/Y, PV, FV → CPT N).`]);
    })(),
    (() => {
      const d0 = 10000, d2 = 5000, rs = 0.05, m = 4, horizon = 5;
      const i = rs / m;
      const v0 = fvLump(d0, i, m * horizon), v2 = fvLump(d2, i, m * (horizon - 2));
      const a = v0 + v2;
      return q("qm-tvm-d2", "difficile", "Account value at the end of year 5?",
        [["Deposit today", usd(d0)], ["Deposit at the end of year 2", usd(d2)], ["Stated annual rate", pc(rs)], ["Compounding", "Quarterly"]],
        a, "$", 2,
        [`Taux trimestriel = ${P(rs)} / ${m} = ${P(i)}.`,
          `Le dépôt d'aujourd'hui capitalise ${m * horizon} trimestres : ${F(d0)} × ${pw(i, m * horizon)} = ${D(v0, 2)}.`,
          `Le dépôt de l'année 2 capitalise ${m * (horizon - 2)} trimestres seulement : ${F(d2)} × ${pw(i, m * (horizon - 2))} = ${D(v2, 2)}.`,
          `Valeur en année 5 = ${D(v0, 2)} + ${D(v2, 2)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const a1 = 0.06, b1 = 0.061, c1 = 0.0595;
      const ea = ear(a1, 12), eb = b1, ec = Math.exp(c1) - 1;
      const a = Math.max(ea, eb, ec) * 100;
      return q("qm-tvm-d3", "difficile", "Effective annual rate of the best offer?",
        [["Bank A: stated rate, monthly compounding", pc(a1)], ["Bank B: stated rate, annual compounding", pc(b1, 1)],
          ["Bank C: stated rate, continuous compounding", pc(c1)]],
        a, "%", 2,
        ["On compare les EAR, jamais les taux déclarés.",
          `A : ${pw(a1 / 12, 12)} − 1 = ${P(ea, 3)} ; B : ${P(eb, 3)} ; C : e^${F(c1)} − 1 = ${P(ec, 3)}.`,
          `La meilleure offre est la banque A, alors que le taux déclaré le plus élevé est celui de B (${P(b1, 1)}) : EAR = ${Pa(a)}.`]);
    })(),
    (() => {
      const price = 740, face = 1000, years = 6, m = 2;
      const per = Math.pow(face / price, 1 / (m * years)) - 1;
      const a = per * m * 100;
      return q("qm-tvm-d4", "difficile", "Yield to maturity, stated as an annual rate with semiannual compounding?",
        [["Price of the zero-coupon bond", usd(price)], ["Face value", usd(face)], ["Maturity", `${years} years`], ["Convention", "Semiannual compounding"]],
        a, "%", 2,
        [`Nombre de semestres = ${m} × ${years} = ${m * years}.`,
          `Taux semestriel = (${F(face)} / ${F(price)})^(1/${m * years}) − 1 = ${F(face / price, 6)}^(1/${m * years}) − 1 = ${P(per, 4)}.`,
          `YTM annuelle (taux déclaré) = 2 × ${P(per, 4)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const fv1 = 80000, rs = 0.04, m = 365, years = 8;
      const factor = Math.pow(1 + rs / m, m * years);
      const a = fv1 / factor;
      return q("qm-tvm-d5", "difficile", "Amount to deposit today to reach the target?",
        [["Amount needed in 8 years", usd(fv1)], ["Stated annual rate", pc(rs)], ["Compounding", "Daily (365 days per year)"]],
        a, "$", 2,
        [`Taux journalier = ${P(rs)} / ${m} ; nombre de jours = ${m} × ${years} = ${m * years}.`,
          `Facteur = (1 + ${F(rs)} / ${m})^${m * years} = ${F(factor, 6)} (presque e^${F(rs * years)} = ${F(Math.exp(rs * years), 6)}).`,
          `PV = ${F(fv1)} / ${F(factor, 6)} = ${D(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 2 · Annuités et perpétuités ────────────────────────── */

const ANNUITIES: CalcType = {
  key: "annuities-perpetuities",
  topic: "quant",
  name: "Annuités et perpétuités (ordinary, due, différées)",
  tier: "essentiel",
  top: true,
  source: "LM 2 · The Time Value of Money in Finance",
  formulas: [
    "PV annuité (ordinary) = PMT × [1 − (1 + r)^−N] / r",
    "FV annuité = PMT × [(1 + r)^N − 1] / r",
    "Annuité due (versements en début de période) = annuité ordinaire × (1 + r)",
    "Remboursement d'emprunt : PMT = PV × r / [1 − (1 + r)^−N]",
    "Perpétuité : PV = PMT / r, valeur une période AVANT le premier flux",
  ],
  traps: [
    "Perpétuité dont le 1er flux tombe en t : PMT / r donne une valeur en t − 1, à actualiser sur t − 1 périodes.",
    "Annuité due : multiplie par (1 + r), ou passe la calculatrice en mode BGN.",
    "Versements mensuels : r = taux annuel / 12 et N = années × 12.",
  ],
  questions: [
    (() => {
      const pmt = 100, r = 0.12, n = 8;
      const a = annuityPV(pmt, r, n);
      return q("qm-ann-f1", "facile", "Present value of the annuity?",
        [["Annual payment (first one in one year)", usd(pmt)], ["Number of payments", E(n)], ["Interest rate", pc(r)]],
        a, "$", 2,
        ["PV = PMT × [1 − (1 + r)^−N] / r.",
          `Facteur d'annuité = [1 − ${F(1 + r)}^−${n}] / ${F(r)} = ${F(annuityPV(1, r, n), 5)}.`,
          `PV = ${F(pmt)} × ${F(annuityPV(1, r, n), 5)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const div = 3.75, r = 0.085;
      const a = div / r;
      return q("qm-ann-f2", "facile", "Value of one preferred share?",
        [["Annual preferred dividend (perpetual)", usd(div, 2)], ["Required rate of return", pc(r)]],
        a, "$", 2,
        ["Une action de préférence à dividende fixe est une perpétuité : V = D / r.",
          `V = ${F(div, 2)} / ${F(r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const loan = 2000, r = 0.06, n = 13;
      const a = annuityPmt(loan, r, n);
      return q("qm-ann-f3", "facile", "Annual loan payment?",
        [["Loan amount", usd(loan)], ["Number of equal end-of-year payments", E(n)], ["Annual interest rate", pc(r)]],
        a, "$", 2,
        ["PMT = PV × r / [1 − (1 + r)^−N] (calculatrice : N, I/Y, PV, FV = 0 → CPT PMT).",
          `PMT = ${F(loan)} × ${F(r)} / [1 − ${F(1 + r)}^−${n}] = ${F(loan * r)} / ${F(1 - Math.pow(1 + r, -n), 5)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const pmt = 3000, r = 0.05, n = 10;
      const a = annuityFV(pmt, r, n);
      return q("qm-ann-f4", "facile", "Value of the account right after the last deposit?",
        [["End-of-year deposit", usd(pmt)], ["Number of deposits", E(n)], ["Annual interest rate", pc(r)]],
        a, "$", 2,
        ["FV = PMT × [(1 + r)^N − 1] / r.",
          `FV = ${F(pmt)} × [${pw(r, n)} − 1] / ${F(r)} = ${F(pmt)} × ${F(annuityFV(1, r, n), 5)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const face = 100000, cpn = 0.05, y = 0.07;
      const pmt = face * cpn;
      const a = pmt / y;
      return q("qm-ann-f5", "facile", "Price of the perpetual bond?",
        [["Face value", usd(face)], ["Annual coupon rate", pc(cpn)], ["Yield", pc(y)]],
        a, "$", 2,
        [`Coupon = ${P(cpn)} × ${D(face)} = ${D(pmt)} par an, sans échéance.`,
          `Prix = ${F(pmt)} / ${F(y)} = ${D(a, 2)} (le nominal ne sert qu'à calculer le coupon).`]);
    })(),
    (() => {
      const pmt = 20000, r = 0.1, n = 6;
      const ord = annuityPV(pmt, r, n);
      const a = ord * (1 + r);
      return q("qm-ann-m1", "moyen", "Amount to set aside today?",
        [["Annual payment", usd(pmt)], ["Number of payments", E(n)], ["First payment", "Today"], ["Interest rate", pc(r)]],
        a, "$", 2,
        ["Premier versement aujourd'hui : c'est une annuité due.",
          `Annuité ordinaire = ${F(pmt)} × ${F(annuityPV(1, r, n), 5)} = ${D(ord, 2)}.`,
          `Annuité due = ${D(ord, 2)} × ${F(1 + r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const pmt = 100, r = 0.1, first = 4;
      const atT = pmt / r;
      const a = pvLump(atT, r, first - 1);
      return q("qm-ann-m2", "moyen", "Present value of the perpetuity?",
        [["Annual payment", usd(pmt)], ["First payment", `${first} years from now`], ["Interest rate", pc(r)]],
        a, "$", 2,
        [`PMT / r = ${F(pmt)} / ${F(r)} = ${D(atT)} : c'est une valeur en t = ${first - 1}, une période avant le premier flux.`,
          `PV = ${F(atT)} / ${pw(r, first - 1)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const loan = 250000, rs = 0.06, years = 30;
      const i = rs / 12, n = years * 12;
      const a = annuityPmt(loan, i, n);
      return q("qm-ann-m3", "moyen", "Monthly mortgage payment?",
        [["Loan amount", usd(loan)], ["Term", `${years} years`], ["Stated annual rate (monthly compounding)", pc(rs)], ["Payments", "End of each month"]],
        a, "$", 2,
        [`Taux mensuel = ${P(rs)} / 12 = ${P(i)} ; N = ${years} × 12 = ${n}.`,
          `PMT = ${F(loan)} × ${F(i, 4)} / [1 − ${F(1 + i)}^−${n}] = ${F(loan * i, 2)} / ${F(1 - Math.pow(1 + i, -n), 5)}.`,
          `PMT = ${D(a, 2)} par mois.`]);
    })(),
    (() => {
      const target = 1000000, r = 0.07, n = 20;
      const a = (target * r) / (Math.pow(1 + r, n) - 1);
      return q("qm-ann-m4", "moyen", "Required end-of-year deposit?",
        [["Target amount in 20 years", usd(target)], ["Number of equal end-of-year deposits", E(n)], ["Annual return", pc(r)]],
        a, "$", 2,
        ["On cherche le PMT d'une FV d'annuité : PMT = FV × r / [(1 + r)^N − 1].",
          `${pw(r, n)} = ${F(Math.pow(1 + r, n), 6)}.`,
          `PMT = ${F(target)} × ${F(r)} / ${F(Math.pow(1 + r, n) - 1, 6)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const pmt = 1500, rs = 0.06, n = 20;
      const i = rs / 2;
      const a = annuityPV(pmt, i, n);
      return q("qm-ann-m5", "moyen", "Present value of the payments?",
        [["Semiannual payment", usd(pmt)], ["Number of payments", E(n)], ["Payments", "End of each half-year (first one in 6 months)"],
          ["Stated annual rate (semiannual compounding)", pc(rs)]],
        a, "$", 2,
        [`Taux semestriel = ${P(rs)} / 2 = ${P(i)} ; N = ${n} semestres.`,
          `PV = ${F(pmt)} × [1 − ${F(1 + i)}^−${n}] / ${F(i)} = ${F(pmt)} × ${F(annuityPV(1, i, n), 5)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const pmt = 5000, n = 10, first = 4, r = 0.08;
      const atT = annuityPV(pmt, r, n);
      const a = pvLump(atT, r, first - 1);
      return q("qm-ann-d1", "difficile", "Present value of the deferred annuity?",
        [["Annual payment", usd(pmt)], ["Number of payments", E(n)], ["First payment", `End of year ${first}`], ["Discount rate", pc(r)]],
        a, "$", 2,
        [`L'annuité ordinaire vaut, en t = ${first - 1} : ${F(pmt)} × ${F(annuityPV(1, r, n), 5)} = ${D(atT, 2)}.`,
          `On actualise sur ${first - 1} ans (et non ${first}) : ${F(atT, 2)} / ${pw(r, first - 1)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const income = 60000, nRet = 25, nSave = 20, r = 0.06;
      const need = annuityPV(income, r, nRet) * (1 + r);
      const a = (need * r) / (Math.pow(1 + r, nSave) - 1);
      return q("qm-ann-d2", "difficile", "Required annual deposit during the saving phase?",
        [["Retirement income per year (paid at the start of each year)", usd(income)], ["Years of retirement income", E(nRet)],
          ["Years until retirement (end-of-year deposits, last one on retirement day)", E(nSave)], ["Annual return", pc(r)]],
        a, "$", 2,
        [`Capital nécessaire le jour de la retraite (annuité due) = ${F(income)} × ${F(annuityPV(1, r, nRet), 5)} × ${F(1 + r)} = ${D(need, 2)}.`,
          `Ce capital est la FV de ${nSave} dépôts : PMT = ${F(need, 2)} × ${F(r)} / (${pw(r, nSave)} − 1).`,
          `PMT = ${F(need * r, 2)} / ${F(Math.pow(1 + r, nSave) - 1, 6)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const loan = 200000, r = 0.05, n = 15, paid = 5;
      const pmt = annuityPmt(loan, r, n);
      const a = annuityPV(pmt, r, n - paid);
      return q("qm-ann-d3", "difficile", "Outstanding loan balance right after the 5th payment?",
        [["Loan amount", usd(loan)], ["Term (annual payments)", `${n} years`], ["Annual interest rate", pc(r)], ["Payments already made", E(paid)]],
        a, "$", 2,
        [`Annuité = ${F(loan)} × ${F(r)} / [1 − ${F(1 + r)}^−${n}] = ${D(pmt, 2)}.`,
          `Le solde restant dû est la PV des ${n - paid} annuités restantes.`,
          `Solde = ${F(pmt, 2)} × ${F(annuityPV(1, r, n - paid), 5)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const pmt = 500, n = 48, target = 29000;
      const fvDue = (i: number): number => annuityFV(pmt, i, n) * (1 + i);
      const i = solve((x) => fvDue(x) - target, 0.0001, 0.05);
      const a = i * 12 * 100;
      return q("qm-ann-d4", "difficile", "Stated annual interest rate (monthly compounding)?",
        [["Monthly payment", usd(pmt)], ["Number of payments (first one today)", E(n)], ["Account value at the end of year 4", usd(target)]],
        a, "%", 2,
        ["Premier versement aujourd'hui : annuité due (mode BGN). On cherche le taux mensuel i tel que FV = 29 000.",
          `500 × [(1 + i)⁴⁸ − 1] / i × (1 + i) = ${F(target)} ⇒ i = ${P(i, 4)} par mois (calculatrice : BGN, N = 48, PMT = −500, FV = 29 000 → CPT I/Y).`,
          `Taux annuel déclaré = 12 × ${P(i, 4)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const p1 = 1000, n1 = 10, p2 = 1500, r = 0.09;
      const pvA = annuityPV(p1, r, n1);
      const perpAt = p2 / r;
      const pvP = pvLump(perpAt, r, n1);
      const a = pvA + pvP;
      return q("qm-ann-d5", "difficile", "Present value of the whole cash flow stream?",
        [["Years 1 to 10: annual payment", usd(p1)], ["From year 11 onwards (forever): annual payment", usd(p2)], ["Discount rate", pc(r)]],
        a, "$", 2,
        [`Années 1 à 10 : ${F(p1)} × ${F(annuityPV(1, r, n1), 5)} = ${D(pvA, 2)}.`,
          `Perpétuité à partir de l'année 11 : ${F(p2)} / ${F(r)} = ${D(perpAt, 2)}, valeur en t = 10.`,
          `Ramenée à aujourd'hui : ${F(perpAt, 2)} / ${pw(r, n1)} = ${D(pvP, 2)}.`,
          `Total = ${D(pvA, 2)} + ${D(pvP, 2)} = ${D(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 3 · Flux inégaux, obligations, rendements implicites ────────────────────────── */

const CASH_FLOWS: CalcType = {
  key: "cash-flow-valuation",
  topic: "quant",
  name: "Flux inégaux, obligations et rendements implicites",
  tier: "essentiel",
  source: "LM 2 · The Time Value of Money in Finance",
  formulas: [
    "Obligation : P = Σ C / (1 + YTM)^t + nominal / (1 + YTM)^N",
    "Flux inégaux : PV = Σ CFt / (1 + r)^t (additivité des flux)",
    "YTM ou rendement implicite = taux qui égalise la PV des flux et le prix (IRR)",
    "Gordon implicite : r = D1 / P0 + g ; g = r − D1 / P0",
    "NPV = −investissement + Σ CFt / (1 + r)^t",
  ],
  traps: [
    "Le taux de coupon fixe le PMT ; c'est la YTM qui actualise.",
    "Prix > nominal ⇔ YTM < taux de coupon (et inversement).",
    "D1 = D0 × (1 + g) : si l'énoncé donne le dividende déjà versé, capitalise-le d'abord.",
  ],
  questions: [
    (() => {
      const face = 1000, cpnRate = 0.1, y = 0.08, n = 10;
      const c = face * cpnRate;
      const pvC = annuityPV(c, y, n), pvF = pvLump(face, y, n);
      const a = pvC + pvF;
      return q("qm-cf-f1", "facile", "Price of the bond?",
        [["Face value", usd(face)], ["Annual coupon rate", pc(cpnRate)], ["Maturity", `${n} years`], ["Yield to maturity", pc(y)]],
        a, "$", 2,
        [`Coupon = ${P(cpnRate)} × ${F(face)} = ${D(c)} par an.`,
          `PV des coupons = ${F(c)} × ${F(annuityPV(1, y, n), 5)} = ${D(pvC, 2)} ; PV du nominal = ${F(face)} / ${pw(y, n)} = ${D(pvF, 2)}.`,
          `Prix = ${D(a, 2)} (au-dessus du pair, car YTM < coupon).`]);
    })(),
    (() => {
      const cfs = [4000, 2000, 0, -1000], r = 0.1;
      const pvs = cfs.map((cf, t) => pvLump(cf, r, t + 1));
      const a = sum(pvs);
      return q("qm-cf-f2", "facile", "Present value of the cash flow stream?",
        [["Cash flows, end of years 1 / 2 / 3 / 4", lst(cfs.map((x) => usd(x)))], ["Discount rate", pc(r)]],
        a, "$", 2,
        ["On actualise chaque flux à sa date, puis on additionne.",
          `PV = ${pvs.map((x) => F(x, 2)).join(" + ").replace(/\+ −/g, "− ")}.`,
          `PV = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d1 = 2.4, p0 = 30, r = 0.0975;
      const a = (r - d1 / p0) * 100;
      return q("qm-cf-f3", "facile", "Constant growth rate implied by the Gordon growth model?",
        [["Next year's dividend (D1)", usd(d1, 2)], ["Current share price", usd(p0, 2)], ["Required return on equity", pc(r)]],
        a, "%", 2,
        ["g = r − D1 / P0 (rendement exigé moins rendement du dividende).",
          `D1 / P0 = ${F(d1, 2)} / ${F(p0)} = ${P(d1 / p0)}.`,
          `g = ${P(r)} − ${P(d1 / p0)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const face = 1000, c = 40, y = 0.045, n = 5;
      const a = bondPrice(face, c, y, n);
      return q("qm-cf-f4", "facile", "Price of the bond today?",
        [["Annual coupon", usd(c)], ["Face value (repaid in 5 years)", usd(face)], ["Yield to maturity", pc(y)]],
        a, "$", 2,
        ["Calculatrice : N = 5, I/Y = 4,5, PMT = 40, FV = 1 000 → CPT PV.",
          `PV = ${F(c)} × ${F(annuityPV(1, y, n), 5)} + ${F(face)} / ${pw(y, n)} = ${F(annuityPV(c, y, n), 2)} + ${F(pvLump(face, y, n), 2)}.`,
          `Prix = ${D(a, 2)} (sous le pair : coupon 4 % < YTM 4,5 %).`]);
    })(),
    (() => {
      const inv = 50000, cfs = [20000, 25000, 15000], r = 0.09;
      const pvs = cfs.map((cf, t) => pvLump(cf, r, t + 1));
      const a = sum(pvs) - inv;
      return q("qm-cf-f5", "facile", "Net present value of the investment?",
        [["Initial investment", usd(inv)], ["Cash inflows, years 1 / 2 / 3", lst(cfs.map((x) => usd(x)))], ["Required return", pc(r)]],
        a, "$", 0,
        [`PV des flux = ${pvs.map((x) => F(x, 2)).join(" + ")} = ${D(sum(pvs), 2)}.`,
          `NPV = ${D(sum(pvs), 2)} − ${D(inv)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const face = 1000, c = 60, n = 7, price = 1045;
      const y = ytm(price, face, c, n);
      const a = y * 100;
      return q("qm-cf-m1", "moyen", "Yield to maturity of the bond?",
        [["Annual coupon", usd(c)], ["Face value (repaid in 7 years)", usd(face)], ["Price today", usd(price)]],
        a, "%", 2,
        ["Calculatrice : N = 7, PV = −1 045, PMT = 60, FV = 1 000 → CPT I/Y.",
          `YTM = ${Pa(a)} : sous le coupon de 6 %, logique pour une obligation au-dessus du pair.`,
          `Vérification : ${F(c)} × ${F(annuityPV(1, y, n), 4)} + ${F(face)} / ${F(1 + y, 5)}${sup(n)} = ${F(bondPrice(face, c, y, n), 2)} ≈ ${F(price)}.`]);
    })(),
    (() => {
      const p0 = 47, d0 = 1.5, g = 0.04;
      const d1 = d0 * (1 + g);
      const a = (d1 / p0 + g) * 100;
      return q("qm-cf-m2", "moyen", "Required return on equity implied by the share price?",
        [["Share price", usd(p0, 2)], ["Dividend just paid (D0)", usd(d0, 2)], ["Constant dividend growth rate", pc(g)]],
        a, "%", 2,
        [`Le dividende donné est D0 : D1 = ${F(d0, 2)} × ${F(1 + g)} = ${D(d1, 2)}.`,
          `r = D1 / P0 + g = ${F(d1, 2)} / ${F(p0)} + ${F(g)} = ${P(d1 / p0, 3)} + ${P(g)}.`,
          `r = ${Pa(a)}.`]);
    })(),
    (() => {
      const base = 100, extra = 300, extraT = 3, n = 4, r = 0.1;
      const pvAnn = annuityPV(base, r, n), pvExtra = pvLump(extra, r, extraT);
      const a = pvAnn + pvExtra;
      return q("qm-cf-m3", "moyen", "Present value of the payments?",
        [["Payments, end of years 1 / 2 / 3 / 4", lst([usd(base), usd(base), usd(base + extra), usd(base)])], ["Discount rate", pc(r)]],
        a, "$", 2,
        [`Additivité des flux : une annuité de ${F(base)} sur ${n} ans + un flux unique de ${F(extra)} en année ${extraT}.`,
          `Annuité : ${F(base)} × ${F(annuityPV(1, r, n), 5)} = ${D(pvAnn, 2)} ; flux unique : ${F(extra)} / ${pw(r, extraT)} = ${D(pvExtra, 2)}.`,
          `PV = ${D(pvAnn, 2)} + ${D(pvExtra, 2)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const face = 1000, c = 80, n = 5, y0 = 0.095, y1 = 0.085;
      const p0 = bondPrice(face, c, y0, n), p1 = bondPrice(face, c, y1, n);
      const a = p1 - p0;
      return q("qm-cf-m4", "moyen", "Change in the bond's price when its yield falls?",
        [["Annual coupon / face value", lst([usd(c), usd(face)])], ["Maturity", `${n} years`], ["Yield to maturity: before / after", lst([pc(y0), pc(y1)])]],
        a, "$", 2,
        [`Prix à ${P(y0)} : ${F(c)} × ${F(annuityPV(1, y0, n), 5)} + ${F(face)} / ${pw(y0, n)} = ${D(p0, 2)}.`,
          `Prix à ${P(y1)} : ${F(c)} × ${F(annuityPV(1, y1, n), 5)} + ${F(face)} / ${pw(y1, n)} = ${D(p1, 2)}.`,
          `Variation = ${D(p1, 2)} − ${D(p0, 2)} = +${D(a, 2)} : le prix monte quand le rendement baisse.`]);
    })(),
    (() => {
      const inv = 1000000, o1 = [500000, 500000, 500000], o2 = [400000, 500000, 600000], r = 0.11;
      const n1 = npv(r, [-inv, ...o1]), n2 = npv(r, [-inv, ...o2]);
      const a = n1 - n2;
      return q("qm-cf-m5", "moyen", "By how much does Opportunity 1's NPV exceed Opportunity 2's?",
        [["Investment today (both)", usd(inv)], ["Opportunity 1: inflows years 1 / 2 / 3", lst(o1.map((x) => usd(x)))],
          ["Opportunity 2: inflows years 1 / 2 / 3", lst(o2.map((x) => usd(x)))], ["Required return", pc(r)]],
        a, "$", 0,
        [`NPV1 = −${F(inv)} + ${F(o1[0])} × ${F(annuityPV(1, r, 3), 5)} = ${D(n1, 0)}.`,
          `NPV2 = −${F(inv)} + ${o2.map((cf, t) => `${F(cf)} / ${pw(r, t + 1)}`).join(" + ")} = ${D(n2, 0)}.`,
          `Écart = ${D(a, 0)} : même total encaissé, mais l'opportunité 1 encaisse plus tôt.`]);
    })(),
    (() => {
      const cfs = [-5000000, 1500000, 2000000, 2500000];
      const r = irr(cfs);
      const a = r * 100;
      return q("qm-cf-d1", "difficile", "Annual return implied by the investment (its IRR)?",
        [["Investment today", usd(-cfs[0])], ["Inflows, end of years 1 / 2 / 3", lst(cfs.slice(1).map((x) => usd(x)))]],
        a, "%", 2,
        ["On cherche le taux qui annule la NPV : CF0 = −5 000 000, CF1 = 1 500 000, CF2 = 2 000 000, CF3 = 2 500 000 → CPT IRR.",
          `IRR = ${Pa(a)}.`,
          `Vérification : NPV à ${P(r, 2)} = ${F(npv(r, cfs), 0)} ≈ 0.`]);
    })(),
    (() => {
      const p0 = 40, d0 = 2, r = 0.1;
      const g = (p0 * r - d0) / (p0 + d0);
      const a = g * 100;
      return q("qm-cf-d2", "difficile", "Constant growth rate implied by the share price?",
        [["Share price", usd(p0, 2)], ["Dividend just paid (D0)", usd(d0, 2)], ["Required return on equity", pc(r)]],
        a, "%", 2,
        ["Piège : le dividende donné est D0, donc P0 = D0 (1 + g) / (r − g).",
          `${F(p0)} (${F(r)} − g) = ${F(d0)} (1 + g) ⇒ ${F(p0 * r)} − ${F(d0)} = (${F(p0)} + ${F(d0)}) g.`,
          `g = ${F(p0 * r - d0)} / ${F(p0 + d0)} = ${Pa(a)} (et non ${F(r * 100 - (d0 / p0) * 100)} % en divisant D0 par le prix).`]);
    })(),
    (() => {
      const face = 1000, n = 8, y = 0.07, price = 950;
      const pvF = pvLump(face, y, n);
      const c = (price - pvF) / annuityPV(1, y, n);
      const a = (c / face) * 100;
      return q("qm-cf-d3", "difficile", "Annual coupon rate of the bond?",
        [["Price", usd(price)], ["Face value", usd(face)], ["Maturity", `${n} years`], ["Yield to maturity", pc(y)]],
        a, "%", 2,
        [`PV du nominal = ${F(face)} / ${pw(y, n)} = ${D(pvF, 2)}.`,
          `Les coupons valent donc ${F(price)} − ${F(pvF, 2)} = ${D(price - pvF, 2)} en PV, soit C × ${F(annuityPV(1, y, n), 5)}.`,
          `C = ${F(price - pvF, 2)} / ${F(annuityPV(1, y, n), 5)} = ${D(c, 2)} ⇒ taux de coupon = ${Pa(a)}.`]);
    })(),
    (() => {
      const face = 1000, cpn = 0.05, s1 = 0.03, s2 = 0.045;
      const c = face * cpn;
      const pv1 = pvLump(c, s1, 1), pv2 = pvLump(face + c, s2, 2);
      const a = pv1 + pv2;
      return q("qm-cf-d4", "difficile", "No-arbitrage price of the bond?",
        [["Face value", usd(face)], ["Annual coupon rate", pc(cpn)], ["Maturity", "2 years"], ["1-year spot rate / 2-year spot rate", lst([pc(s1), pc(s2, 1)])]],
        a, "$", 2,
        ["Chaque flux s'actualise à SON taux spot (additivité des flux, absence d'arbitrage).",
          `Année 1 : ${F(c)} / ${F(1 + s1)} = ${D(pv1, 2)} ; année 2 : ${F(face + c)} / ${pw(s2, 2)} = ${D(pv2, 2)}.`,
          `Prix = ${D(a, 2)}.`]);
    })(),
    (() => {
      const annPrice = 260, zeroPrice = 230, base = 150, zeroFace = 300;
      const units = base / 100;
      const a = units * annPrice + zeroPrice;
      return q("qm-cf-d5", "difficile", "No-arbitrage price of the security?",
        [["Security to value: pays at end of years 1 / 2 / 3", lst([usd(base), usd(base), usd(base + zeroFace)])],
          ["Price of a 3-year annuity paying $100 per year", usd(annPrice)], ["Price of a zero-coupon bond paying $300 in year 3", usd(zeroPrice)]],
        a, "$", 2,
        [`Réplication : ${F(units)} annuité de 100 $ (soit ${F(base)} $ par an) + 1 zero-coupon de ${F(zeroFace)} $ en année 3.`,
          "Deux paniers aux flux identiques ont le même prix (loi du prix unique) : pas besoin de taux d'actualisation.",
          `Prix = ${F(units)} × ${F(annPrice)} + ${F(zeroPrice)} = ${D(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 4 · Absence d'arbitrage ────────────────────────── */

const NO_ARBITRAGE: CalcType = {
  key: "no-arbitrage",
  topic: "quant",
  name: "Absence d'arbitrage : taux forward, change à terme, arbre binomial",
  tier: "annexe",
  source: "LM 2 · The Time Value of Money in Finance",
  formulas: [
    "(1 + S2)² = (1 + S1) × (1 + 1y1y)",
    "(1 + Sn)^n = (1 + Sm)^m × (1 + forward)^(n − m)",
    "Change à terme (cotation price/base) : F = S × (1 + r_price) / (1 + r_base)",
    "Moins d'un an (actual/360) : F = S × (1 + r_price × j/360) / (1 + r_base × j/360) ; points de terme (pips) = (F − S) × 10 000",
    "Binomial à 1 période : h = (c⁺ − c⁻) / (S⁺ − S⁻) ; V0 = (h × S⁻ − c⁻) / (1 + Rf) ; c0 = h × S0 − V0",
  ],
  traps: [
    "Courbe croissante : le taux forward est au-dessus des deux taux spot.",
    "Dans F = S (1 + r_price) / (1 + r_base), le taux de la devise du numérateur va au numérateur.",
    "Ratio de couverture h = écart des payoffs de l'option / écart des prix du sous-jacent.",
  ],
  questions: [
    (() => {
      const s1 = 0.04, s2 = 0.08;
      const f = Math.pow(1 + s2, 2) / (1 + s1) - 1;
      const a = f * 100;
      return q("qm-arb-f1", "facile", "Implied 1-year forward rate one year from now (1y1y)?",
        [["1-year spot rate (S1)", pc(s1)], ["2-year spot rate (S2)", pc(s2)]],
        a, "%", 2,
        ["(1 + S2)² = (1 + S1)(1 + 1y1y).",
          `1y1y = ${pw(s2, 2)} / ${F(1 + s1)} − 1 = ${F(Math.pow(1 + s2, 2), 4)} / ${F(1 + s1)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const s1 = 0.018, s2 = 0.025;
      const f = Math.pow(1 + s2, 2) / (1 + s1) - 1;
      const a = f * 100;
      return q("qm-arb-f2", "facile", "One-year reinvestment rate one year from now?",
        [["1-year risk-free rate", pc(s1)], ["2-year risk-free rate", pc(s2)]],
        a, "%", 2,
        ["C'est le taux forward 1y1y : (1 + S2)² = (1 + S1)(1 + 1y1y).",
          `1y1y = ${pw(s2, 2)} / ${F(1 + s1)} − 1 = ${F(Math.pow(1 + s2, 2), 6)} / ${F(1 + s1)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const spot = 4.5671, rP = 0.05, rB = 0.03;
      const fwd = (spot * (1 + rP)) / (1 + rB);
      const a = (fwd - spot) * 10000;
      const approx = spot * (1 + rP - rB);
      return q("qm-arb-f3", "facile", "No-arbitrage 1-year forward points (ABE/DUB), in pips?",
        [["Spot rate (ABE/DUB)", E(spot)], ["1-year riskless ABE rate", pc(rP)], ["1-year riskless DUB rate", pc(rB)],
          ["Forward points", "(F − S) × 10,000"]],
        a, "", 2,
        ["ABE/DUB : l'ABE est la devise de cotation (price), le DUB la devise de base.",
          `F = S × (1 + r_ABE) / (1 + r_DUB) = ${F(spot)} × ${F(1 + rP)} / ${F(1 + rB)} = ${F(fwd, 6)}.`,
          `Points de terme = (${F(fwd, 6)} − ${F(spot)}) × 10 000 = ${F(a, 2)} pips.`,
          `Le raccourci S × (1 + ${P(rP)} − ${P(rB)}) = ${F(approx, 4)} est faux : il donnerait ${F((approx - spot) * 10000, 1)} pips.`]);
    })(),
    (() => {
      const s0 = 50, su = 60, sd = 42, x = 55;
      const b = binomialCall(s0, su, sd, x, 0.03);
      const a = b.h;
      return q("qm-arb-f4", "facile", "Hedge ratio (shares per call written)?",
        [["Stock price today", usd(s0)], ["Stock price after an up / down move", lst([usd(su), usd(sd)])], ["Call exercise price", usd(x)]],
        a, "", 4,
        [`Payoffs du call : c⁺ = max(${F(su)} − ${F(x)} ; 0) = ${F(b.cu)} ; c⁻ = max(${F(sd)} − ${F(x)} ; 0) = ${F(b.cd)}.`,
          `h = (c⁺ − c⁻) / (S⁺ − S⁻) = ${F(b.cu - b.cd)} / ${F(su - sd)} = ${F(a, 4)} action par call vendu.`]);
    })(),
    (() => {
      const s1 = 0.03, f11 = 0.05;
      const a = (Math.sqrt((1 + s1) * (1 + f11)) - 1) * 100;
      return q("qm-arb-f5", "facile", "2-year spot rate consistent with these rates?",
        [["1-year spot rate (S1)", pc(s1)], ["1-year forward rate one year from now (1y1y)", pc(f11)]],
        a, "%", 2,
        ["(1 + S2)² = (1 + S1)(1 + 1y1y).",
          `S2 = (${F(1 + s1)} × ${F(1 + f11)})^(1/2) − 1 = ${F((1 + s1) * (1 + f11), 4)}^(1/2) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const s2 = 0.04, s3 = 0.05;
      const a = (Math.pow(1 + s3, 3) / Math.pow(1 + s2, 2) - 1) * 100;
      return q("qm-arb-m1", "moyen", "Implied 1-year forward rate two years from now (2y1y)?",
        [["2-year spot rate (S2)", pc(s2)], ["3-year spot rate (S3)", pc(s3)]],
        a, "%", 2,
        ["(1 + S3)³ = (1 + S2)² × (1 + 2y1y).",
          `2y1y = ${pw(s3, 3)} / ${pw(s2, 2)} − 1 = ${F(Math.pow(1 + s3, 3), 6)} / ${F(Math.pow(1 + s2, 2), 4)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const s0 = 50, su = 60, sd = 42, x = 55, rf = 0.03;
      const b = binomialCall(s0, su, sd, x, rf);
      const a = b.c0;
      return q("qm-arb-m2", "moyen", "No-arbitrage value of the call option today?",
        [["Stock price today", usd(s0)], ["Stock price after an up / down move", lst([usd(su), usd(sd)])], ["Call exercise price", usd(x)], ["Risk-free rate for the period", pc(rf)]],
        a, "$", 2,
        [`h = (${F(b.cu)} − ${F(b.cd)}) / (${F(su)} − ${F(sd)}) = ${F(b.h, 4)}.`,
          `Portefeuille couvert (h actions, 1 call vendu) en fin de période : ${F(b.h, 4)} × ${F(sd)} − ${F(b.cd)} = ${F(b.v1, 4)} dans les deux états.`,
          `V0 = ${F(b.v1, 4)} / ${F(1 + rf)} = ${F(b.v0, 4)} ; c0 = h × S0 − V0 = ${F(b.h * s0, 4)} − ${F(b.v0, 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const spot = 1.25, rUsd = 0.035, rGbp = 0.04;
      const a = (spot * (1 + rUsd)) / (1 + rGbp);
      return q("qm-arb-m3", "moyen", "No-arbitrage 1-year forward rate (USD/GBP)?",
        [["Spot rate (USD per GBP)", E(spot, 4)], ["1-year USD risk-free rate", pc(rUsd)], ["1-year GBP risk-free rate", pc(rGbp)]],
        a, "", 4,
        ["USD/GBP : le dollar est la devise de cotation (numérateur), la livre la devise de base.",
          `F = ${F(spot, 4)} × ${F(1 + rUsd)} / ${F(1 + rGbp)} = ${F(a, 4)}.`,
          "La livre, mieux rémunérée, cote en déport (forward < spot) : ses intérêts plus élevés sont compensés."]);
    })(),
    (() => {
      const s1 = 0.02, s3 = 0.035;
      const a = (Math.pow(Math.pow(1 + s3, 3) / (1 + s1), 0.5) - 1) * 100;
      return q("qm-arb-m4", "moyen", "Implied 2-year forward rate one year from now (1y2y), annualized?",
        [["1-year spot rate (S1)", pc(s1)], ["3-year spot rate (S3)", pc(s3, 1)]],
        a, "%", 2,
        ["(1 + S3)³ = (1 + S1) × (1 + 1y2y)².",
          `(1 + 1y2y)² = ${F(Math.pow(1 + s3, 3), 6)} / ${F(1 + s1)} = ${F(Math.pow(1 + s3, 3) / (1 + s1), 6)}.`,
          `1y2y = ${F(Math.pow(1 + s3, 3) / (1 + s1), 6)}^(1/2) − 1 = ${Pa(a)} par an.`]);
    })(),
    (() => {
      const s0 = 100, su = 125, sd = 80, x = 100, rf = 0.05;
      const b = binomialCall(s0, su, sd, x, rf);
      const a = b.c0;
      return q("qm-arb-m5", "moyen", "No-arbitrage value of the call option today?",
        [["Stock price today", usd(s0)], ["Stock price after an up / down move", lst([usd(su), usd(sd)])], ["Call exercise price", usd(x)], ["Risk-free rate for the period", pc(rf)]],
        a, "$", 2,
        [`c⁺ = ${F(b.cu)}, c⁻ = ${F(b.cd)} ; h = ${F(b.cu - b.cd)} / ${F(su - sd)} = ${F(b.h, 4)}.`,
          `Valeur certaine du portefeuille couvert : ${F(b.h, 4)} × ${F(sd)} − ${F(b.cd)} = ${F(b.v1, 4)} ; V0 = ${F(b.v1, 4)} / ${F(1 + rf)} = ${F(b.v0, 4)}.`,
          `c0 = ${F(b.h, 4)} × ${F(s0)} − ${F(b.v0, 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const spot = 150, rJpy = 0.005, rUsd = 0.04;
      const fwd = (spot * (1 + rJpy)) / (1 + rUsd);
      const a = (fwd / spot - 1) * 100;
      return q("qm-arb-d1", "difficile", "Forward premium (+) or discount (−) of the 1-year JPY/USD rate, (F − S) / S?",
        [["Spot rate (JPY per USD)", E(spot, 2)], ["1-year JPY risk-free rate", pc(rJpy)], ["1-year USD risk-free rate", pc(rUsd)]],
        a, "%", 2,
        ["JPY/USD : le yen est la devise de cotation, le dollar la devise de base.",
          `F = ${F(spot, 2)} × ${F(1 + rJpy)} / ${F(1 + rUsd)} = ${F(fwd, 4)}.`,
          `F / S − 1 = ${F(1 + rJpy)} / ${F(1 + rUsd)} − 1 = ${Pa(a)}, proche de l'écart de taux 0,5 % − 4 % = −3,5 %.`]);
    })(),
    (() => {
      const s1 = 0.0525, s2 = 0.065, s3 = 0.07;
      const a = (Math.pow(1 + s2, 2) / (1 + s1) - 1) * 100;
      return q("qm-arb-d2", "difficile", "Breakeven 1-year rate one year from now (investor indifferent between the two strategies)?",
        [["Strategy A", "Buy a 2-year bond today"], ["Strategy B", "Buy a 1-year bond, then roll into a new 1-year bond"],
          ["1-year / 2-year / 3-year spot rates", lst([pc(s1), pc(s2), pc(s3)])]],
        a, "%", 2,
        ["Le taux d'indifférence est le forward 1y1y ; le taux 3 ans ne sert pas.",
          `1y1y = ${pw(s2, 2)} / ${F(1 + s1)} − 1 = ${F(Math.pow(1 + s2, 2), 6)} / ${F(1 + s1)} − 1 = ${Pa(a)}.`,
          "Si l'investisseur attend un taux 1 an plus élevé dans un an, il préfère rouler ; sinon il verrouille le 2 ans."]);
    })(),
    (() => {
      const s3 = 0.03, s5 = 0.04;
      const ratio = Math.pow(1 + s5, 5) / Math.pow(1 + s3, 3);
      const a = (Math.sqrt(ratio) - 1) * 100;
      return q("qm-arb-d3", "difficile", "Implied 2-year forward rate three years from now (3y2y), annualized?",
        [["3-year spot rate (S3)", pc(s3)], ["5-year spot rate (S5)", pc(s5)]],
        a, "%", 2,
        ["(1 + S5)⁵ = (1 + S3)³ × (1 + 3y2y)².",
          `(1 + 3y2y)² = ${F(Math.pow(1 + s5, 5), 6)} / ${F(Math.pow(1 + s3, 3), 6)} = ${F(ratio, 6)}.`,
          `3y2y = ${F(ratio, 6)}^(1/2) − 1 = ${Pa(a)} par an.`]);
    })(),
    (() => {
      const s0 = 80, su = 100, sd = 70, x = 65, rf = 0.04;
      const b = binomialCall(s0, su, sd, x, rf);
      const a = b.c0;
      return q("qm-arb-d4", "difficile", "No-arbitrage value of the call option today?",
        [["Stock price today", usd(s0)], ["Stock price after an up / down move", lst([usd(su), usd(sd)])], ["Call exercise price", usd(x)], ["Risk-free rate for the period", pc(rf)]],
        a, "$", 2,
        [`Le call finit dans la monnaie dans les deux états : c⁺ = ${F(b.cu)}, c⁻ = ${F(b.cd)} ; h = ${F(b.cu - b.cd)} / ${F(su - sd)} = ${F(b.h)}.`,
          `Portefeuille couvert : ${F(b.h)} × ${F(sd)} − ${F(b.cd)} = ${F(b.v1)} ; V0 = ${F(b.v1)} / ${F(1 + rf)} = ${F(b.v0, 4)}.`,
          `c0 = ${F(b.h)} × ${F(s0)} − ${F(b.v0, 4)} = ${D(a, 2)} (= S0 − X / (1 + Rf) quand l'exercice est certain).`]);
    })(),
    (() => {
      const spot = 1.085, rUsd = 0.045, rEur = 0.025, days = 180;
      const fP = 1 + rUsd * (days / 360), fB = 1 + rEur * (days / 360);
      const fwd = (spot * fP) / fB;
      const a = (fwd - spot) * 10000;
      const f365 = (spot * (1 + rUsd * (days / 365))) / (1 + rEur * (days / 365));
      return q("qm-arb-d5", "difficile", "No-arbitrage 180-day forward points (USD/EUR), in pips?",
        [["Spot rate (USD per EUR)", E(spot, 4)], ["USD risk-free rate (annual, actual/360)", pc(rUsd, 1)],
          ["EUR risk-free rate (annual, actual/360)", pc(rEur, 1)], ["Horizon", `${days} days`], ["Forward points", "(F − S) × 10,000"]],
        a, "", 2,
        [`Taux sur la période : USD = ${P(rUsd, 1)} × ${days}/360 = ${P(rUsd * days / 360, 2)} ; EUR = ${P(rEur, 1)} × ${days}/360 = ${P(rEur * days / 360, 2)}.`,
          "USD/EUR : le dollar (price) au numérateur, l'euro (base) au dénominateur.",
          `F = ${F(spot, 4)} × ${F(fP, 4)} / ${F(fB, 4)} = ${F(fwd, 6)} ; points = (${F(fwd, 6)} − ${F(spot, 4)}) × 10 000 = ${F(a, 2)} pips.`,
          `Pièges : en base 365 jours on trouverait ${F((f365 - spot) * 10000, 2)} pips ; ni capitalisation (1,045 / 1,025)^0,5 ni raccourci S × (1 + écart de taux × t).`]);
    })(),
  ],
};

/* ────────────────────────── 5 · HPR et moyennes ────────────────────────── */

const MEANS: CalcType = {
  key: "hpr-means",
  topic: "quant",
  name: "HPR et moyennes (arithmétique, géométrique, harmonique)",
  tier: "essentiel",
  top: true,
  source: "LM 1 · Rates and Returns",
  formulas: [
    "HPR = (P1 − P0 + revenus) / P0",
    "HPR sur plusieurs périodes = (1 + R1)(1 + R2)…(1 + Rn) − 1",
    "Moyenne arithmétique = ΣRi / n",
    "Moyenne géométrique = [(1 + R1)…(1 + Rn)]^(1/n) − 1",
    "Moyenne harmonique = n / Σ(1 / Xi) (coût moyen d'achats à montant fixe)",
  ],
  traps: [
    "Racine de la moyenne géométrique = nombre de périodes ; pour un rendement annuel, racine = nombre d'années.",
    "Dès que les valeurs diffèrent : harmonique < géométrique < arithmétique.",
    "Rendements négatifs : moyenne harmonique sur les (1 + R), puis − 1.",
  ],
  questions: [
    (() => {
      const p0 = 60, p1 = 75, d = 1.5;
      const a = hpr(p0, p1, d) * 100;
      return q("qm-mean-f1", "facile", "Holding period return?",
        [["Purchase price one year ago", usd(p0, 2)], ["Price today", usd(p1, 2)], ["Dividend received during the year", usd(d, 2)]],
        a, "%", 2,
        ["HPR = (P1 − P0 + dividende) / P0.",
          `HPR = (${F(p1)} − ${F(p0)} + ${F(d, 2)}) / ${F(p0)} = ${F(p1 - p0 + d, 2)} / ${F(p0)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const rs = [5.26, -2.1, 3.86, 8.18];
      const a = mean(rs);
      return q("qm-mean-f2", "facile", "Arithmetic mean annual return?",
        [["Annual returns, years 1 to 4", pcs(rs)]],
        a, "%", 2,
        [`Somme = ${terms(rs)} = ${F(sum(rs), 2)}%.`, `Moyenne arithmétique = ${F(sum(rs), 2)} / ${rs.length} = ${Pa(a)}.`]);
    })(),
    (() => {
      const rs = [-9.34, 23.45, 8.92];
      const prod = 1 + linked(rs.map((x) => x / 100));
      const a = geoMean(rs.map((x) => x / 100)) * 100;
      return q("qm-mean-f3", "facile", "Compound annual (geometric mean) return over the three years?",
        [["Annual returns, years 1 to 3", pcs(rs)]],
        a, "%", 2,
        [`Produit des (1 + R) = ${rs.map((x) => F(1 + x / 100)).join(" × ")} = ${F(prod, 5)}.`,
          `Moyenne géométrique = ${F(prod, 5)}^(1/3) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const amount = 2000, prices = [12, 14, 11, 9];
      const a = harmonic(prices);
      return q("qm-mean-f4", "facile", "Average cost per share (harmonic mean)?",
        [["Amount invested each month", usd(amount)], ["Share price at each purchase", lst(prices.map((x) => usd(x)))]],
        a, "$", 2,
        ["Montant fixe à chaque achat : le coût moyen est la moyenne harmonique des prix.",
          `Σ(1 / P) = ${prices.map((p) => F(1 / p, 5)).join(" + ")} = ${F(sum(prices.map((p) => 1 / p)), 5)}.`,
          `Coût moyen = ${prices.length} / ${F(sum(prices.map((p) => 1 / p)), 5)} = ${D(a, 2)} (contre ${D(mean(prices), 2)} en moyenne arithmétique).`]);
    })(),
    (() => {
      const rs = [6, -37, 27];
      const a = linked(rs.map((x) => x / 100)) * 100;
      return q("qm-mean-f5", "facile", "Holding period return for the whole three-year period?",
        [["Annual returns, years 1 to 3", pcs(rs)]],
        a, "%", 2,
        ["HPR total = (1 + R1)(1 + R2)(1 + R3) − 1.",
          `= ${rs.map((x) => F(1 + x / 100)).join(" × ")} − 1 = ${F(1 + a / 100, 6)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const p0 = 20, p1 = 25, dLast = 1, dNext = 1.25;
      const a = hpr(p0, p1, dNext) * 100;
      return q("qm-mean-m1", "moyen", "Expected holding period return for this year?",
        [["Price today", usd(p0, 2)], ["Expected price at year-end", usd(p1, 2)], ["Dividend paid last year", usd(dLast, 2)], ["Dividend expected this year", usd(dNext, 2)]],
        a, "%", 2,
        ["Seul le dividende de l'année à venir compte ; celui de l'an dernier est déjà encaissé.",
          `HPR = (${F(p1)} − ${F(p0)} + ${F(dNext, 2)}) / ${F(p0)} = ${F(p1 - p0 + dNext, 2)} / ${F(p0)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const rs = [2, 0.5, -1, 1.5];
      const prod = 1 + linked(rs.map((x) => x / 100));
      const a = (Math.pow(prod, 1 / 2) - 1) * 100;
      return q("qm-mean-m2", "moyen", "Annual compound rate of return?",
        [["Semiannual returns, four consecutive half-years", pcs(rs)]],
        a, "%", 2,
        [`Produit des (1 + R) = ${rs.map((x) => F(1 + x / 100, 3)).join(" × ")} = ${F(prod, 6)}.`,
          "Quatre semestres = deux ans : racine 2 (et non 4) pour un rendement annuel.",
          `Rendement annuel = ${F(prod, 6)}^(1/2) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const p0 = 910, p1 = 1020, coupon = 30, nCpn = 2;
      const a = hpr(p0, p1, coupon * nCpn) * 100;
      return q("qm-mean-m3", "moyen", "Holding period return on the bond?",
        [["Purchase price one year ago", usd(p0)], ["Selling price today", usd(p1)], ["Coupons received during the year", `${nCpn} semiannual coupons of ${usd(coupon)}`]],
        a, "%", 2,
        [`Revenus = ${nCpn} × ${D(coupon)} = ${D(coupon * nCpn)}.`,
          `HPR = (${F(p1)} − ${F(p0)} + ${F(coupon * nCpn)}) / ${F(p0)} = ${F(p1 - p0 + coupon * nCpn)} / ${F(p0)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const rs = [2, 0.5, -1, 1.5];
      const inv = rs.map((x) => 1 / (1 + x / 100));
      const a = (rs.length / sum(inv) - 1) * 100;
      return q("qm-mean-m4", "moyen", "Harmonic mean return?",
        [["Periodic returns, four periods", pcs(rs)]],
        a, "%", 3,
        ["Un rendement est négatif : on travaille sur les (1 + R), puis on retire 1.",
          `Σ 1 / (1 + R) = ${inv.map((x) => F(x, 6)).join(" + ")} = ${F(sum(inv), 6)}.`,
          `Moyenne harmonique = ${rs.length} / ${F(sum(inv), 6)} − 1 = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const rs = [15, -10, 20, 5];
      const arith = mean(rs);
      const geo = geoMean(rs.map((x) => x / 100)) * 100;
      const a = (arith - geo) * 100;
      return q("qm-mean-m5", "moyen", "Arithmetic mean minus geometric mean, in basis points?",
        [["Annual returns, years 1 to 4", pcs(rs)]],
        a, "bp", 0,
        [`Arithmétique = ${F(sum(rs))} / 4 = ${Pa(arith)}.`,
          `Géométrique = (${rs.map((x) => F(1 + x / 100)).join(" × ")})^(1/4) − 1 = ${F(1 + linked(rs.map((x) => x / 100)), 5)}^(1/4) − 1 = ${Pa(geo, 3)}.`,
          `Écart = ${F(arith - geo, 4)} point de % = ${F(a, 0)} bp (l'écart grandit avec la volatilité).`]);
    })(),
    (() => {
      const amount = 1500, prices = [25, 20, 30, 24];
      const h = harmonic(prices), m = mean(prices);
      const a = m - h;
      return q("qm-mean-d1", "difficile", "How much lower is the average cost per share than the average share price?",
        [["Amount invested each month", usd(amount)], ["Share price at each purchase", lst(prices.map((x) => usd(x)))]],
        a, "$", 2,
        [`Prix moyen (arithmétique) = ${F(sum(prices))} / 4 = ${D(m, 2)}.`,
          `Coût moyen (harmonique) = 4 / (${prices.map((p) => `1/${p}`).join(" + ")}) = 4 / ${F(sum(prices.map((p) => 1 / p)), 6)} = ${D(h, 4)}.`,
          `Écart = ${F(m, 2)} − ${F(h, 4)} = ${D(a, 2)} par action : l'effet du cost averaging.`]);
    })(),
    (() => {
      const rs = [2.1, -1.4, 3.2, 0.8, -2.5, 1.9, 2.7, 1.1];
      const prod = 1 + linked(rs.map((x) => x / 100));
      const a = (Math.pow(prod, 1 / 2) - 1) * 100;
      return q("qm-mean-d2", "difficile", "Annualized compound return?",
        [["Quarterly returns over the last two years", pcs(rs)]],
        a, "%", 2,
        [`Produit des 8 facteurs (1 + R) = ${F(prod, 6)}, soit ${P(prod - 1, 3)} sur deux ans.`,
          "Huit trimestres = deux ans : racine 2 pour annualiser.",
          `Rendement annualisé = ${F(prod, 6)}^(1/2) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const r1 = 0.12, r2 = -0.08, target = 0.06;
      const r3 = Math.pow(1 + target, 3) / ((1 + r1) * (1 + r2)) - 1;
      const a = r3 * 100;
      return q("qm-mean-d3", "difficile", "Return needed in year 3 to reach the target geometric mean?",
        [["Return year 1 / year 2", lst([pc(r1), pc(r2)])], ["Target 3-year geometric mean return", pc(target)]],
        a, "%", 2,
        [`Objectif sur 3 ans : ${pw(target, 3)} = ${F(Math.pow(1 + target, 3), 6)}.`,
          `Déjà acquis : ${F(1 + r1)} × ${F(1 + r2)} = ${F((1 + r1) * (1 + r2), 4)}.`,
          `1 + R3 = ${F(Math.pow(1 + target, 3), 6)} / ${F((1 + r1) * (1 + r2), 4)} ⇒ R3 = ${Pa(a)}.`]);
    })(),
    (() => {
      const vals = [100, 120, 96, 108];
      const n = vals.length - 1;
      const a = (Math.pow(vals[n] / vals[0], 1 / n) - 1) * 100;
      const rs = vals.slice(1).map((v, i) => v / vals[i] - 1);
      return q("qm-mean-d4", "difficile", "Geometric mean annual return of the fund?",
        [["Fund value: start / end of year 1 / end of year 2 / end of year 3", lst(vals.map((v) => E(v)))], ["Cash flows during the period", "None"]],
        a, "%", 2,
        [`Rendements annuels : ${rs.map((r) => P(r, 2)).join(" ; ")} (moyenne arithmétique ${P(mean(rs), 2)}, trompeuse).`,
          `Géométrique = (${F(vals[n])} / ${F(vals[0])})^(1/${n}) − 1 = ${F(vals[n] / vals[0])}^(1/3) − 1.`,
          `= ${Pa(a)} par an.`]);
    })(),
    (() => {
      const n = 200, p0 = 45, p1 = 41.5, divQ = 0.4, quarters = 4, comm = 25;
      const cost = n * p0 + comm;
      const proceeds = n * p1 - comm;
      const divs = n * divQ * quarters;
      const a = ((proceeds + divs - cost) / cost) * 100;
      return q("qm-mean-d5", "difficile", "Holding period return, net of commissions?",
        [["Shares bought", E(n)], ["Purchase price / selling price one year later", lst([usd(p0, 2), usd(p1, 2)])],
          ["Quarterly dividend per share", usd(divQ, 2)], ["Commission per trade (buy and sell)", usd(comm)]],
        a, "%", 2,
        [`Mise de départ = ${F(n)} × ${F(p0)} + ${F(comm)} = ${D(cost)} ; produit de la vente = ${F(n)} × ${F(p1, 2)} − ${F(comm)} = ${D(proceeds)}.`,
          `Dividendes = ${F(n)} × ${F(divQ, 2)} × ${quarters} = ${D(divs)}.`,
          `HPR = (${F(proceeds)} + ${F(divs)} − ${F(cost)}) / ${F(cost)} = ${Pa(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 6 · MWR et TWR ────────────────────────── */

const MWR_TWR: CalcType = {
  key: "mwr-twr",
  topic: "quant",
  name: "Money-weighted vs time-weighted return",
  tier: "essentiel",
  top: true,
  source: "LM 1 · Rates and Returns",
  formulas: [
    "MWR = IRR des flux du compte : apports (−), retraits, revenus encaissés et valeur finale (+)",
    "TWR : HPR de chaque sous-période (bornée par les apports et retraits), puis (1 + HPR1)…(1 + HPRn) − 1",
    "TWR annuel = (1 + TWR de la période)^(1 / nombre d'années) − 1",
  ],
  traps: [
    "Apport juste avant une bonne période ⇒ MWR > TWR ; juste avant une mauvaise ⇒ MWR < TWR.",
    "La TWR ignore le calendrier des flux : c'est la mesure de la performance du gérant.",
    "Les dividendes reçus sont un flux positif pour la MWR et un revenu dans le HPR de la sous-période.",
  ],
  questions: [
    (() => {
      const rs = [0.04, -0.02, 0.06];
      const a = linked(rs) * 100;
      return q("qm-mwr-f1", "facile", "Time-weighted return for the year?",
        [["Subperiod returns (between external cash flows)", lst(rs.map((r) => pc(r)))]],
        a, "%", 2,
        ["TWR = produit des (1 + HPR) des sous-périodes − 1.",
          `TWR = ${rs.map((r) => F(1 + r)).join(" × ")} − 1 = ${F(1 + linked(rs), 6)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const rs = [0.22, 0.1];
      const a = (Math.sqrt((1 + rs[0]) * (1 + rs[1])) - 1) * 100;
      return q("qm-mwr-f2", "facile", "Annualized time-weighted return?",
        [["Portfolio HPR, year 1 / year 2", lst(rs.map((r) => pc(r)))]],
        a, "%", 2,
        [`Sur deux ans : ${F(1 + rs[0])} × ${F(1 + rs[1])} = ${F((1 + rs[0]) * (1 + rs[1]), 4)}.`,
          `TWR annuel = ${F((1 + rs[0]) * (1 + rs[1]), 4)}^(1/2) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 10000, v2 = 12100;
      const a = irr([-v0, 0, v2]) * 100;
      return q("qm-mwr-f3", "facile", "Money-weighted return (per year)?",
        [["Initial deposit", usd(v0)], ["Other deposits or withdrawals", "None"], ["Account value after 2 years", usd(v2)]],
        a, "%", 2,
        ["Sans flux intermédiaire, l'IRR est le taux composé : (V2 / V0)^(1/2) − 1.",
          `MWR = (${F(v2)} / ${F(v0)})^(1/2) − 1 = ${F(v2 / v0, 4)}^(1/2) − 1 = ${Pa(a)} (égale ici à la TWR).`]);
    })(),
    (() => {
      const v0 = 100000, vBefore = 108000, dep = 20000, vEnd = 131000;
      const h1 = vBefore / v0 - 1, h2 = vEnd / (vBefore + dep) - 1;
      const a = ((1 + h1) * (1 + h2) - 1) * 100;
      return q("qm-mwr-f4", "facile", "Time-weighted return for the year?",
        [["Value on January 1", usd(v0)], ["Value on July 1, just before a deposit", usd(vBefore)], ["Deposit on July 1", usd(dep)], ["Value on December 31", usd(vEnd)]],
        a, "%", 2,
        [`Sous-période 1 : ${F(vBefore)} / ${F(v0)} − 1 = ${P(h1, 2)}.`,
          `Sous-période 2 (après dépôt, base ${F(vBefore + dep)}) : ${F(vEnd)} / ${F(vBefore + dep)} − 1 = ${P(h2, 3)}.`,
          `TWR = ${F(1 + h1)} × ${F(1 + h2, 6)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const rs = [0.15, -0.05, 0.12];
      const tot = linked(rs);
      const a = (Math.pow(1 + tot, 1 / 3) - 1) * 100;
      return q("qm-mwr-f5", "facile", "Annualized time-weighted return?",
        [["Annual HPRs, years 1 / 2 / 3", lst(rs.map((r) => pc(r)))]],
        a, "%", 2,
        [`Sur trois ans : ${rs.map((r) => F(1 + r)).join(" × ")} = ${F(1 + tot, 6)}.`,
          `TWR annuel = ${F(1 + tot, 6)}^(1/3) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const p0 = 40, p1 = 50, p2 = 60, d = 1;
      const cfs = [-p0, -p1 + d, 2 * p2 + 2 * d];
      const r = irr(cfs);
      const a = r * 100;
      return q("qm-mwr-m1", "moyen", "Money-weighted rate of return (per period)?",
        [["t = 0", `Buys 1 share at ${usd(p0)}`], ["t = 1", `Receives a ${usd(d)} dividend, buys 1 more share at ${usd(p1)}`],
          ["t = 2", `Receives ${usd(d)} per share, sells both shares at ${usd(p2)}`]],
        a, "%", 2,
        [`Flux : CF0 = −${F(p0)} ; CF1 = −${F(p1)} + ${F(d)} = ${F(cfs[1])} ; CF2 = 2 × ${F(p2)} + 2 × ${F(d)} = +${F(cfs[2])}.`,
          `IRR (CPT IRR) = ${Pa(a)}.`,
          `Vérification : ${F(cfs[1])} / ${F(1 + r, 4)} + ${F(cfs[2])} / ${F(1 + r, 4)}² ≈ ${F(p0)}.`]);
    })(),
    (() => {
      const p0 = 40, p1 = 50, p2 = 60, d = 1;
      const h1 = (p1 + d - p0) / p0, h2 = (2 * p2 + 2 * d - 2 * p1) / (2 * p1);
      const a = (Math.sqrt((1 + h1) * (1 + h2)) - 1) * 100;
      return q("qm-mwr-m2", "moyen", "Annualized time-weighted rate of return?",
        [["t = 0", `Buys 1 share at ${usd(p0)}`], ["t = 1", `Receives a ${usd(d)} dividend, buys 1 more share at ${usd(p1)}`],
          ["t = 2", `Receives ${usd(d)} per share, sells both shares at ${usd(p2)}`]],
        a, "%", 2,
        [`Année 1 : (${F(p1)} + ${F(d)} − ${F(p0)}) / ${F(p0)} = ${P(h1, 2)}.`,
          `Année 2 (2 actions) : (${F(2 * p2)} + ${F(2 * d)} − ${F(2 * p1)}) / ${F(2 * p1)} = ${P(h2, 2)}.`,
          `TWR annuel = (${F(1 + h1, 3)} × ${F(1 + h2, 3)})^(1/2) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const cfs = [-100000, 5000, -25000, 123000];
      const r = irr(cfs);
      const a = r * 100;
      return q("qm-mwr-m3", "moyen", "Money-weighted return per period?",
        [["Beginning portfolio value", usd(-cfs[0])], ["End of period 1", `Income of ${usd(cfs[1])} withdrawn (not reinvested)`],
          ["End of period 2", `Contribution of ${usd(-cfs[2])}`], ["End of period 3", `Portfolio valued at ${usd(cfs[3])}`]],
        a, "%", 2,
        [`Flux côté investisseur : CF0 = −${F(-cfs[0])} ; CF1 = +${F(cfs[1])} ; CF2 = −${F(-cfs[2])} ; CF3 = +${F(cfs[3])}.`,
          `IRR = ${Pa(a)} par période.`,
          `Vérification : NPV à ${P(r, 3)} = ${F(npv(r, cfs), 0)} ≈ 0.`]);
    })(),
    (() => {
      const p0 = 100, nBuy = 3, p1 = 89, p2 = 98, d = 1;
      const cfs = [-p0, -nBuy * p1 + d, (1 + nBuy) * (p2 + d)];
      const r = irr(cfs);
      const a = r * 100;
      return q("qm-mwr-m4", "moyen", "Investor's money-weighted rate of return?",
        [["t = 0", `Buys 1 share at ${usd(p0)}`], ["t = 1", `Receives a ${usd(d)} dividend, buys ${nBuy} more shares at ${usd(p1)}`],
          ["t = 2", `Receives ${usd(d)} per share, sells all ${1 + nBuy} shares at ${usd(p2)}`]],
        a, "%", 2,
        [`CF0 = −${F(p0)} ; CF1 = −${nBuy} × ${F(p1)} + ${F(d)} = ${F(cfs[1])} ; CF2 = ${1 + nBuy} × (${F(p2)} + ${F(d)}) = +${F(cfs[2])}.`,
          `IRR = ${Pa(a)}.`,
          "Beaucoup d'argent investi juste avant la bonne année 2 : la MWR dépasse la TWR."]);
    })(),
    (() => {
      const p0 = 100, p1 = 89, p2 = 98, d = 1;
      const h1 = (p1 + d - p0) / p0, h2 = (p2 + d - p1) / p1;
      const a = (Math.sqrt((1 + h1) * (1 + h2)) - 1) * 100;
      return q("qm-mwr-m5", "moyen", "Investor's annualized time-weighted rate of return?",
        [["t = 0", `Buys 1 share at ${usd(p0)}`], ["t = 1", `Receives a ${usd(d)} dividend, buys 3 more shares at ${usd(p1)}`],
          ["t = 2", `Receives ${usd(d)} per share, sells all 4 shares at ${usd(p2)}`]],
        a, "%", 2,
        [`Année 1 : (${F(p1)} + ${F(d)} − ${F(p0)}) / ${F(p0)} = ${P(h1, 2)}.`,
          `Année 2 : (${F(p2)} + ${F(d)} − ${F(p1)}) / ${F(p1)} = ${P(h2, 3)} (le nombre d'actions ne change rien au HPR).`,
          `TWR annuel = (${F(1 + h1)} × ${F(1 + h2, 5)})^(1/2) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const p0 = 50, p1 = 75, p2 = 100, d1 = 5, d2 = 7.5, req = 0.35;
      const h1 = (p1 + d1 - p0) / p0, h2 = (p2 + d2 - p1) / p1;
      const a = (Math.sqrt((1 + h1) * (1 + h2)) - 1) * 100;
      return q("qm-mwr-d1", "difficile", "Annualized time-weighted return?",
        [["t = 0", `Buys 1 share at ${usd(p0, 2)}`], ["t = 1", `Receives a ${usd(d1, 2)} dividend, buys 1 more share at ${usd(p1, 2)}`],
          ["t = 2", `Receives ${usd(d2, 2)} per share, sells both shares at ${usd(p2, 2)}`], ["Investor's required return", pc(req)]],
        a, "%", 2,
        ["Le rendement exigé ne sert à rien ici : c'est la donnée-piège.",
          `Année 1 : (${F(p1)} + ${F(d1)} − ${F(p0)}) / ${F(p0)} = ${P(h1)} ; année 2 : (${F(p2)} + ${F(d2, 1)} − ${F(p1)}) / ${F(p1)} = ${P(h2, 2)}.`,
          `TWR annuel = (${F(1 + h1)} × ${F(1 + h2, 4)})^(1/2) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const p0 = 50, p1 = 75, p2 = 100, d1 = 5, d2 = 7.5;
      const cfs = [-p0, -p1 + d1, 2 * (p2 + d2)];
      const r = irr(cfs);
      const a = r * 100;
      return q("qm-mwr-d2", "difficile", "Money-weighted return?",
        [["t = 0", `Buys 1 share at ${usd(p0, 2)}`], ["t = 1", `Receives a ${usd(d1, 2)} dividend, buys 1 more share at ${usd(p1, 2)}`],
          ["t = 2", `Receives ${usd(d2, 2)} per share, sells both shares at ${usd(p2, 2)}`]],
        a, "%", 2,
        [`CF0 = −${F(p0)} ; CF1 = −${F(p1)} + ${F(d1)} = ${F(cfs[1])} ; CF2 = 2 × (${F(p2)} + ${F(d2, 1)}) = +${F(cfs[2])}.`,
          `−${F(p0)} − ${F(-cfs[1])} / (1 + r) + ${F(cfs[2])} / (1 + r)² = 0 ⇒ IRR = ${Pa(a)}.`,
          "Plus d'argent investi pendant l'année 2, moins bonne que l'année 1 : MWR < TWR."]);
    })(),
    (() => {
      const v0 = 1000000, r1 = 0.25, dep = 2000000, r2 = -0.1;
      const v1 = v0 * (1 + r1);
      const v2 = (v1 + dep) * (1 + r2);
      const twr = Math.sqrt((1 + r1) * (1 + r2)) - 1;
      const mwr = irr([-v0, -dep, v2]);
      const a = (mwr - twr) * 100;
      return q("qm-mwr-d3", "difficile", "Money-weighted return minus annualized time-weighted return (percentage points)?",
        [["Initial investment", usd(v0)], ["Portfolio return, year 1", pc(r1)], ["Deposit at the end of year 1", usd(dep)], ["Portfolio return, year 2", pc(r2)]],
        a, "%", 2,
        [`TWR annuel = (${F(1 + r1)} × ${F(1 + r2)})^(1/2) − 1 = ${P(twr, 3)}.`,
          `Valeur finale = (${F(v1)} + ${F(dep)}) × ${F(1 + r2)} = ${D(v2)} ; flux MWR : −${F(v0)} ; −${F(dep)} ; +${F(v2)} ⇒ IRR = ${P(mwr, 3)}.`,
          `Écart = ${P(mwr, 3)} − ${P(twr, 3)} = ${Pa(a)} : le gros apport a précédé la mauvaise année.`]);
    })(),
    (() => {
      const v0 = 500000, vA = 520000, dep = 100000, vB = 590000, wd = 50000, vEnd = 560000;
      const h1 = vA / v0 - 1, h2 = vB / (vA + dep) - 1, h3 = vEnd / (vB - wd) - 1;
      const a = ((1 + h1) * (1 + h2) * (1 + h3) - 1) * 100;
      return q("qm-mwr-d4", "difficile", "Time-weighted return for the year?",
        [["Value on January 1", usd(v0)], ["April 1: value before the deposit / deposit", lst([usd(vA), usd(dep)])],
          ["September 1: value before the withdrawal / withdrawal", lst([usd(vB), usd(wd)])], ["Value on December 31", usd(vEnd)]],
        a, "%", 2,
        [`Sous-période 1 : ${F(vA)} / ${F(v0)} − 1 = ${P(h1, 2)}.`,
          `Sous-période 2 : ${F(vB)} / (${F(vA)} + ${F(dep)}) − 1 = ${P(h2, 3)} ; sous-période 3 : ${F(vEnd)} / (${F(vB)} − ${F(wd)}) − 1 = ${P(h3, 3)}.`,
          `TWR = ${F(1 + h1)} × ${F(1 + h2, 6)} × ${F(1 + h3, 6)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const cfs = [-10000, -5000, 3000, 14500];
      const r = irr(cfs);
      const a = r * 100;
      return q("qm-mwr-d5", "difficile", "Annual money-weighted return of the account?",
        [["Deposit today", usd(-cfs[0])], ["Deposit at the end of year 1", usd(-cfs[1])], ["Withdrawal at the end of year 2", usd(cfs[2])], ["Account value at the end of year 3", usd(cfs[3])]],
        a, "%", 2,
        [`Flux : CF0 = −${F(-cfs[0])} ; CF1 = −${F(-cfs[1])} ; CF2 = +${F(cfs[2])} (retrait) ; CF3 = +${F(cfs[3])} (valeur finale).`,
          `IRR = ${Pa(a)}.`,
          `Vérification : NPV à ${P(r, 3)} = ${F(npv(r, cfs), 0)} ≈ 0.`]);
    })(),
  ],
};

/* ────────────────────────── 7 · Annualisation, continu, réel, levier ────────────────────────── */

const ANNUALIZED: CalcType = {
  key: "annualized-continuous",
  topic: "quant",
  name: "Annualisation, rendement continu, réel et à levier",
  tier: "essentiel",
  source: "LM 1 · Rates and Returns",
  formulas: [
    "Rendement annualisé = (1 + HPR)^(365 / jours) − 1, ou (1 + HPR)^(1 / années) − 1",
    "Rendement continu = ln(1 + HPR) = ln(P1 / P0) ; il s'additionne d'une période à l'autre",
    "Prix futur : PT = P0 × e^(r continu sur la période)",
    "Réel : (1 + nominal) / (1 + inflation) − 1 ≈ nominal − inflation",
    "Levier : rL = r + (VB / V0) × (r − rB)",
  ],
  traps: [
    "Le rendement continu est plus petit que le HPR correspondant (en valeur algébrique).",
    "Moins d'un an : l'exposant 365 / jours est supérieur à 1.",
    "Déflation (inflation négative) : le rendement réel dépasse le rendement nominal.",
  ],
  questions: [
    (() => {
      const p0 = 20, p1 = 23;
      const a = Math.log(p1 / p0) * 100;
      return q("qm-cc-f1", "facile", "Continuously compounded rate of return?",
        [["Initial price", usd(p0)], ["Price one year later", usd(p1)]],
        a, "%", 2,
        ["Rendement continu = ln(P1 / P0).", `= ln(${F(p1)} / ${F(p0)}) = ln(${F(p1 / p0)}) = ${Pa(a)} (contre un HPR de ${P(p1 / p0 - 1)}).`]);
    })(),
    (() => {
      const v0 = 100, v1 = 100.75, days = 90;
      const h = v1 / v0 - 1;
      const a = annualizeDays(h, days) * 100;
      return q("qm-cc-f2", "facile", "Annualized rate of return (365-day year)?",
        [["Deposit", usd(v0, 2)], ["Balance after 90 days", usd(v1, 2)]],
        a, "%", 2,
        [`HPR = ${F(v1)} / ${F(v0)} − 1 = ${P(h, 2)}.`, `Annualisé = ${F(1 + h, 4)}^(365/${days}) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const nom = 0.07, infl = 0.02;
      const a = ((1 + nom) / (1 + infl) - 1) * 100;
      return q("qm-cc-f3", "facile", "Exact real rate of return?",
        [["Nominal return for the year", pc(nom)], ["Inflation rate for the year", pc(infl)]],
        a, "%", 2,
        ["Réel = (1 + nominal) / (1 + inflation) − 1.", `= ${F(1 + nom)} / ${F(1 + infl)} − 1 = ${Pa(a)} (l'approximation 7 % − 2 % = 5 % surestime un peu).`]);
    })(),
    (() => {
      const h = -0.065;
      const a = Math.log(1 + h) * 100;
      return q("qm-cc-f4", "facile", "Continuously compounded return equivalent to this HPR?",
        [["One-year holding period return", pc(h)]],
        a, "%", 2,
        ["Rendement continu = ln(1 + HPR).", `= ln(${F(1 + h)}) = ${Pa(a)} (plus négatif que le HPR).`]);
    })(),
    (() => {
      const r = 0.08, v0 = 100, vb = 50, rb = 0.05;
      const a = leveraged(r, v0, vb, rb) * 100;
      return q("qm-cc-f5", "facile", "Leveraged return on the fund's equity?",
        [["Fund equity ($ millions)", E(v0)], ["Amount borrowed ($ millions)", E(vb)], ["Return on all invested assets", pc(r)], ["Borrowing rate", pc(rb)]],
        a, "%", 2,
        ["rL = r + (VB / V0) × (r − rB).", `rL = ${P(r)} + (${F(vb)} / ${F(v0)}) × (${P(r)} − ${P(rb)}) = ${P(r)} + ${F(vb / v0)} × ${P(r - rb)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const p0 = 970, face = 1000, days = 500;
      const h = face / p0 - 1;
      const a = annualizeDays(h, days) * 100;
      return q("qm-cc-m1", "moyen", "Annualized return on the bill?",
        [["Purchase price of a 500-day government bill", usd(p0)], ["Redemption value at maturity", usd(face)], ["Day count", "365-day year"]],
        a, "%", 2,
        [`HPR = ${F(face)} / ${F(p0)} − 1 = ${P(h, 4)} sur ${days} jours.`,
          `Annualisé = ${F(1 + h, 6)}^(365/${days}) − 1 = ${Pa(a)} (exposant < 1 : plus d'un an).`]);
    })(),
    (() => {
      const h = -0.03, days = 120;
      const a = annualizeDays(h, days) * 100;
      return q("qm-cc-m2", "moyen", "Annualized return?",
        [["Loss in value over the holding period", pc(-h)], ["Holding period", `${days} days`], ["Day count", "365-day year"]],
        a, "%", 2,
        [`HPR = ${P(h)} ; nombre de périodes de ${days} jours dans un an = 365 / ${days} = ${F(365 / days, 4)}.`,
          `Annualisé = ${F(1 + h)}^${F(365 / days, 4)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const ps = [50, 56, 52, 60];
      const ccs = ps.slice(1).map((p, i) => Math.log(p / ps[i]));
      const a = sum(ccs) * 100;
      return q("qm-cc-m3", "moyen", "Continuously compounded return over the three periods?",
        [["Price at t = 0 / 1 / 2 / 3", lst(ps.map((p) => usd(p)))]],
        a, "%", 2,
        [`Rendements continus : ${ps.slice(1).map((p, i) => `ln(${F(p)} / ${F(ps[i])}) = ${P(ccs[i], 2)}`).join(" ; ")}.`,
          `Ils s'additionnent : ${ccs.map((c) => P(c, 2)).join(" + ").replace(/\+ −/g, "− ")} = ${Pa(a)}.`,
          `Raccourci : ln(${F(ps[3])} / ${F(ps[0])}) = ${Pa(a)}.`]);
    })(),
    (() => {
      const p0 = 40, rc = 0.08, years = 3;
      const a = p0 * Math.exp(rc * years);
      return q("qm-cc-m4", "moyen", "Expected price after three years?",
        [["Price today", usd(p0)], ["Expected continuously compounded return per year", pc(rc)], ["Horizon", `${years} years`]],
        a, "$", 2,
        [`Rendement continu sur 3 ans = 3 × ${P(rc)} = ${P(rc * years)} (additivité).`,
          `P3 = ${F(p0)} × e^${F(rc * years)} = ${F(p0)} × ${F(Math.exp(rc * years), 5)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const v0 = 10, vb = 4, r = 0.09, rb = 0.06;
      const a = leveraged(r, v0, vb, rb) * 100;
      return q("qm-cc-m5", "moyen", "Return on the investor's equity?",
        [["Investor's own capital ($ millions)", E(v0)], ["Amount borrowed ($ millions)", E(vb)], ["Borrowing rate", pc(rb)], ["Return on the total amount invested", pc(r)]],
        a, "%", 2,
        [`Gain = ${P(r)} × (${F(v0)} + ${F(vb)}) − ${P(rb)} × ${F(vb)} = ${F(r * (v0 + vb), 2)} − ${F(rb * vb, 2)} = ${F(r * (v0 + vb) - rb * vb, 2)} M$.`,
          `rL = ${F(r * (v0 + vb) - rb * vb, 2)} / ${F(v0)} = ${Pa(a)}, soit ${P(r)} + ${F(vb / v0)} × (${P(r)} − ${P(rb)}).`]);
    })(),
    (() => {
      const pre = 0.09, tax = 0.3, infl = 0.025;
      const after = pre * (1 - tax);
      const a = ((1 + after) / (1 + infl) - 1) * 100;
      return q("qm-cc-d1", "difficile", "After-tax real return?",
        [["Pretax nominal return (fully taxable interest)", pc(pre)], ["Tax rate", pc(tax)], ["Inflation rate", pc(infl, 1)]],
        a, "%", 2,
        [`Nominal après impôt = ${P(pre)} × (1 − ${F(tax)}) = ${P(after, 2)}.`,
          `Réel = ${F(1 + after, 4)} / ${F(1 + infl, 4)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 10, vb = 15, r = 0.04, rb = 0.06;
      const a = leveraged(r, v0, vb, rb) * 100;
      return q("qm-cc-d2", "difficile", "Leveraged return on the fund's equity?",
        [["Fund equity ($ millions)", E(v0)], ["Amount borrowed ($ millions)", E(vb)], ["Return on the invested assets", pc(r)], ["Borrowing rate", pc(rb)]],
        a, "%", 2,
        [`Ratio d'endettement VB / V0 = ${F(vb)} / ${F(v0)} = ${F(vb / v0)}.`,
          `rL = ${P(r)} + ${F(vb / v0)} × (${P(r)} − ${P(rb)}) = ${P(r)} + ${F(vb / v0)} × (${P(r - rb)}) = ${Pa(a)}.`,
          "Les actifs rapportent moins que le coût de la dette : le levier détruit du rendement."]);
    })(),
    (() => {
      const ccs = [0.012, -0.008, 0.021];
      const tot = sum(ccs);
      const a = (Math.exp(tot) - 1) * 100;
      return q("qm-cc-d3", "difficile", "Holding period return for the quarter?",
        [["Continuously compounded returns, months 1 / 2 / 3", lst(ccs.map((c) => pc(c)))]],
        a, "%", 2,
        [`Rendement continu du trimestre = ${ccs.map((c) => P(c)).join(" + ").replace(/\+ −/g, "− ")} = ${P(tot)}.`,
          `HPR = e^${F(tot)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const p0 = 100, p1 = 95, im = 0.5, infl = -0.02;
      const r = p1 / p0 - 1;
      const lev = leveraged(r, im * p0, (1 - im) * p0, 0);
      const a = ((1 + lev) / (1 + infl) - 1) * 100;
      return q("qm-cc-d4", "difficile", "Real return on the investor's equity? (Ignore interest on the margin loan.)",
        [["Purchase price (non-dividend-paying stock)", usd(p0)], ["Initial margin", pc(im)], ["Price at year-end", usd(p1)], ["Inflation during the year", pc(infl)]],
        a, "%", 2,
        [`Rendement de l'action = ${P(r)} ; fonds propres = ${D(im * p0)}, emprunt = ${D((1 - im) * p0)}.`,
          `Rendement à levier = (${F(p1)} − ${F(p0)}) / ${F(im * p0)} = ${P(lev)}.`,
          `Réel = ${F(1 + lev)} / ${F(1 + infl)} − 1 = ${Pa(a)} : la déflation améliore le rendement réel.`]);
    })(),
    (() => {
      const pA = 98.5, faceA = 100, daysA = 91, hB = 0.018, daysB = 60;
      const aA = annualizeDays(faceA / pA - 1, daysA), aB = annualizeDays(hB, daysB);
      const a = (aB - aA) * 100;
      return q("qm-cc-d5", "difficile", "By how many percentage points does B's annualized return exceed A's?",
        [["Investment A", `${daysA}-day bill bought at ${E(pA, 2)}, redeemed at ${E(faceA)}`], ["Investment B", `${pc(hB)} return over ${daysB} days`], ["Day count", "365-day year"]],
        a, "%", 2,
        [`A : HPR = ${F(faceA)} / ${F(pA)} − 1 = ${P(faceA / pA - 1, 3)} ; annualisé = ${F(faceA / pA, 6)}^(365/${daysA}) − 1 = ${P(aA, 3)}.`,
          `B : annualisé = ${F(1 + hB)}^(365/${daysB}) − 1 = ${P(aB, 3)}.`,
          `Écart = ${P(aB, 3)} − ${P(aA, 3)} = ${Pa(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 8 · Tendance centrale et dispersion ────────────────────────── */

const DISPERSION: CalcType = {
  key: "dispersion",
  topic: "quant",
  name: "Tendance centrale et dispersion (s, CV, MAD, target downside deviation)",
  tier: "essentiel",
  source: "LM 3 · Statistical Measures of Asset Returns",
  formulas: [
    "Variance d'échantillon s² = Σ(Xi − X̄)² / (n − 1) ; s = √s²",
    "MAD = Σ|Xi − X̄| / n",
    "CV = s / X̄ (risque par unité de rendement : plus bas = mieux)",
    "Target downside deviation = √[Σ(Xi − B)², pour les seuls Xi < B, / (n − 1)]",
    "Trimmed mean : on retire les extrêmes ; winsorized mean : on les remplace par la valeur du percentile",
  ],
  traps: [
    "Échantillon : n − 1 au dénominateur ; la MAD, elle, divise par n.",
    "Semi-écart cible : seuls les écarts sous la cible au numérateur, mais toujours n − 1 au dénominateur.",
    "Le CV n'utilise pas le taux sans risque (ce n'est pas un ratio de Sharpe).",
  ],
  questions: [
    (() => {
      const m = 1.09, s = 7.3;
      const a = s / m;
      return q("qm-disp-f1", "facile", "Coefficient of variation of the index's monthly returns?",
        [["Mean monthly return", `${E(m, 2)}%`], ["Standard deviation of monthly returns", `${E(s, 2)}%`]],
        a, "", 2,
        ["CV = écart-type / moyenne.", `CV = ${F(s, 2)} / ${F(m, 2)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const xs = [30, 12, 25, 20, 23];
      const a = mad(xs);
      return q("qm-disp-f2", "facile", "Mean absolute deviation (MAD) of the returns?",
        [["5-year annualized returns of five managers", pcs(xs)]],
        a, "%", 2,
        [`Moyenne = ${F(sum(xs))} / 5 = ${F(mean(xs))}%.`,
          `Écarts absolus : ${Fl(devs(xs).map((d) => Math.abs(d)))} → somme ${F(sum(devs(xs).map((d) => Math.abs(d))))}.`,
          `MAD = ${F(sum(devs(xs).map((d) => Math.abs(d))))} / 5 = ${Pa(a)}.`]);
    })(),
    (() => {
      const xs = [30, 12, 25, 20, 23];
      const a = sampleSd(xs);
      return q("qm-disp-f3", "facile", "Sample standard deviation of the returns?",
        [["5-year annualized returns of a sample of five managers", pcs(xs)]],
        a, "%", 2,
        [`Moyenne = ${F(mean(xs))}% ; écarts au carré : ${Fl(devs(xs).map(sq))} → somme ${F(ssd(xs))}.`,
          `s² = ${F(ssd(xs))} / (5 − 1) = ${F(sampleVar(xs), 2)} (%²).`,
          `s = √${F(sampleVar(xs), 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const m = 10, v = 4;
      const a = Math.sqrt(v) / m;
      return q("qm-disp-f4", "facile", "Coefficient of variation?",
        [["Mean of the distribution", E(m)], ["Variance of the distribution", E(v)]],
        a, "", 2,
        ["Le CV utilise l'écart-type, pas la variance.", `σ = √${F(v)} = ${F(Math.sqrt(v))} ; CV = ${F(Math.sqrt(v))} / ${F(m)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const xs = [8, -4, 12, 6];
      const a = sampleVar(xs);
      return q("qm-disp-f5", "facile", "Sample variance of the returns? (in %²)",
        [["Annual returns, years 1 to 4", pcs(xs)]],
        a, "", 2,
        [`Moyenne = ${F(sum(xs))} / 4 = ${F(mean(xs))}%.`,
          `Écarts : ${Fl(devs(xs))} ; carrés : ${Fl(devs(xs).map(sq))} → somme ${F(ssd(xs))}.`,
          `s² = ${F(ssd(xs))} / 3 = ${F(a, 2)} (%²).`]);
    })(),
    (() => {
      const xs = [30, 12, 25, 20, 23], b = 22;
      const below = xs.filter((x) => x < b);
      const a = downsideDev(xs, b);
      return q("qm-disp-m1", "moyen", "Target downside deviation for a 22% target?",
        [["5-year annualized returns of a sample of five managers", pcs(xs)], ["Target return", `${E(b)}%`]],
        a, "%", 2,
        [`Sous la cible : ${Fl(below)} → écarts au carré ${Fl(below.map((x) => sq(x - b)))}, somme ${F(sum(below.map((x) => sq(x - b))))}.`,
          `On divise par n − 1 = 4 (toutes les observations comptent au dénominateur).`,
          `Target downside deviation = √(${F(sum(below.map((x) => sq(x - b))))} / 4) = ${Pa(a)}.`]);
    })(),
    (() => {
      const xs = [30, 12, 25, 20, 23], b = 24;
      const below = xs.filter((x) => x < b);
      const a = downsideDev(xs, b);
      return q("qm-disp-m2", "moyen", "Target downside deviation for a 24% target?",
        [["5-year annualized returns of a sample of five managers", pcs(xs)], ["Target return", `${E(b)}%`]],
        a, "%", 2,
        [`Sous 24 % : ${Fl(below)} ; écarts au carré ${Fl(below.map((x) => sq(x - b)))} → somme ${F(sum(below.map((x) => sq(x - b))))}.`,
          `Target downside deviation = √(${F(sum(below.map((x) => sq(x - b))))} / (5 − 1)) = ${Pa(a)}.`]);
    })(),
    (() => {
      const xs = [4, 9, -2, 11, 8], rf = 1;
      const s = sampleSd(xs);
      const a = s / mean(xs);
      return q("qm-disp-m3", "moyen", "Coefficient of variation of the fund's returns?",
        [["Annual returns, years 1 to 5", pcs(xs)], ["Risk-free rate", `${E(rf)}%`]],
        a, "", 2,
        [`Moyenne = ${F(sum(xs))} / 5 = ${F(mean(xs))}% ; Σ(écarts²) = ${F(ssd(xs))} ; s = √(${F(ssd(xs))} / 4) = ${F(s, 4)}%.`,
          `CV = ${F(s, 4)} / ${F(mean(xs))} = ${F(a, 2)} (le taux sans risque ne sert pas).`]);
    })(),
    (() => {
      const xs = [-3, 7, 11, 2, 8];
      const a = mad(xs);
      return q("qm-disp-m4", "moyen", "Mean absolute deviation of the returns?",
        [["Annual returns, years 1 to 5", pcs(xs)]],
        a, "%", 2,
        [`Moyenne = ${F(sum(xs))} / 5 = ${F(mean(xs))}%.`,
          `Écarts absolus : ${Fl(devs(xs).map((d) => Math.abs(d)))} → somme ${F(sum(devs(xs).map((d) => Math.abs(d))))}.`,
          `MAD = ${F(sum(devs(xs).map((d) => Math.abs(d))))} / 5 = ${Pa(a)} (on divise par n).`]);
    })(),
    (() => {
      const xs = [6, -15, 9, 3, 28, 1, -2, 8, 4, 5];
      const s = sorted(xs);
      const w = [s[1], ...s.slice(1, -1), s[s.length - 2]];
      const a = mean(w);
      return q("qm-disp-m5", "moyen", "80% winsorized mean return?",
        [["Ten annual returns", pcs(xs)]],
        a, "%", 2,
        [`Classement : ${Fl(s)}.`,
          `80 % winsorisé : on remplace la plus basse (${F(s[0])}) par ${F(s[1])} et la plus haute (${F(s[9])}) par ${F(s[8])}.`,
          `Moyenne = ${F(sum(w))} / 10 = ${Pa(a)} (moyenne brute : ${F(mean(xs), 2)} %).`]);
    })(),
    (() => {
      const xs = [14, -6, 9, 3, 18, 11], b = 11;
      const below = xs.filter((x) => x < b);
      const a = downsideDev(xs, b);
      return q("qm-disp-d1", "difficile", "Target downside deviation?",
        [["Annual returns, years 1 to 6", pcs(xs)], ["Target return", `${E(b)}%`]],
        a, "%", 2,
        [`Strictement sous ${F(b)} % : ${Fl(below)} (le 11 % pile ne compte pas).`,
          `Écarts au carré : ${Fl(below.map((x) => sq(x - b)))} → somme ${F(sum(below.map((x) => sq(x - b))))}.`,
          `√(${F(sum(below.map((x) => sq(x - b))))} / (6 − 1)) = √${F(sum(below.map((x) => sq(x - b))) / 5, 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const xs = [1.2, -0.8, 2.5, 0.4, -1.5, 1.8];
      const s = sampleSd(xs);
      const a = s / mean(xs);
      return q("qm-disp-d2", "difficile", "Coefficient of variation of the monthly returns?",
        [["Monthly returns, months 1 to 6", pcs(xs)]],
        a, "", 2,
        [`Moyenne = ${F(sum(xs), 1)} / 6 = ${F(mean(xs), 2)}%.`,
          `Écarts au carré : ${Fl(devs(xs).map(sq), 2)} → somme ${F(ssd(xs), 2)} ; s² = ${F(ssd(xs), 2)} / 5 = ${F(sampleVar(xs), 4)} ⇒ s = ${F(s, 4)}%.`,
          `CV = ${F(s, 4)} / ${F(mean(xs), 2)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const vWrong = 30, n = 8;
      const v = (vWrong * n) / (n - 1);
      const a = Math.sqrt(v);
      return q("qm-disp-d3", "difficile", "Correct sample standard deviation?",
        [["Sample size", `${n} annual returns`], ["Variance computed by the analyst, dividing by n (%²)", E(vWrong)]],
        a, "%", 2,
        [`L'analyste a divisé Σ(écarts²) par n : Σ(écarts²) = ${F(vWrong)} × ${n} = ${F(vWrong * n)}.`,
          `Variance d'échantillon = ${F(vWrong * n)} / (${n} − 1) = ${F(v, 4)} (%²).`,
          `s = √${F(v, 4)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const xs = [6, -15, 9, 3, 28, 1, -2, 8, 4, 5];
      const s = sorted(xs);
      const kept = s.slice(1, -1);
      const a = mean(kept);
      return q("qm-disp-d4", "difficile", "20% trimmed mean return?",
        [["Ten annual returns", pcs(xs)]],
        a, "%", 2,
        [`Classement : ${Fl(s)}.`,
          `Moyenne tronquée à 20 % : on écarte les 10 % les plus bas et les 10 % les plus hauts, soit ${F(s[0])} et ${F(s[9])}.`,
          `Moyenne des ${kept.length} restantes = ${F(sum(kept))} / ${kept.length} = ${Pa(a)} (on divise par 8, pas par 10).`]);
    })(),
    (() => {
      const xs = [1.5, -2.0, 0.8, -0.5, 2.2, -1.2, 0.4, 1.0], b = 0.5;
      const below = xs.filter((x) => x < b);
      const a = downsideDev(xs, b);
      return q("qm-disp-d5", "difficile", "Target downside deviation of the monthly returns?",
        [["Monthly returns, months 1 to 8", pcs(xs)], ["Target monthly return", `${E(b, 1)}%`]],
        a, "%", 2,
        [`Sous ${F(b, 1)} % : ${Fl(below, 1)} (0,4 % compte aussi).`,
          `Écarts au carré : ${Fl(below.map((x) => sq(x - b)), 2)} → somme ${F(sum(below.map((x) => sq(x - b))), 2)}.`,
          `√(${F(sum(below.map((x) => sq(x - b))), 2)} / (8 − 1)) = ${Pa(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 9 · Espérance, écart-type, covariance ────────────────────────── */

const EXPECTED: CalcType = {
  key: "expected-value-covariance",
  topic: "quant",
  name: "Espérance, écart-type et covariance (modèle probabiliste)",
  tier: "essentiel",
  top: true,
  source: "LM 4 · Probability Trees and Conditional Expectations ; LM 5 · Portfolio Mathematics",
  formulas: [
    "E(X) = Σ P(xi) × xi ; espérance totale : E(X) = Σ P(Si) × E(X | Si)",
    "σ² = Σ P(xi) × [xi − E(X)]² ; σ = √σ²",
    "Cov(A, B) = Σ P(s) × [RA,s − E(RA)] × [RB,s − E(RB)]",
    "ρ = Cov(A, B) / (σA × σB)",
  ],
  traps: [
    "Modèle probabiliste : on pondère par les probabilités, pas de division par n − 1.",
    "Arbre : probabilité jointe = produit des branches ; les feuilles somment à 1.",
    "Unités : en %², σ sort en % ; en décimal, σ sort en décimal (ne mélange pas).",
  ],
  questions: [
    (() => {
      const ps = [0.49, 0.49, 0.02], xs = [1, 2, 50];
      const a = ev(ps, xs);
      return q("qm-ev-f1", "facile", "Expected value of the prize on a single toss?",
        [["Heads / tails / edge: probability", lst(ps.map((p) => E(p)))], ["Heads / tails / edge: prize", lst(xs.map((x) => usd(x)))]],
        a, "$", 2,
        ["E(X) = Σ probabilité × gain.", `E = ${ps.map((p, i) => `${F(p)} × ${Fp(xs[i])}`).join(" + ")} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const ps = [0.3, 0.7], xs = [15, 3];
      const a = ev(ps, xs);
      return q("qm-ev-f2", "facile", "Expected return of the portfolio?",
        [["Boom: probability / return", lst([E(ps[0]), `${xs[0]}%`])], ["Bust: probability / return", lst([E(ps[1]), `${xs[1]}%`])]],
        a, "%", 2,
        [`E(R) = ${F(ps[0])} × ${F(xs[0])} + ${F(ps[1])} × ${F(xs[1])} = ${F(ps[0] * xs[0], 2)} + ${F(ps[1] * xs[1], 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const ps = [0.3, 0.4, 0.3], xs = [2, 3, 4];
      const a = pVar(ps, xs);
      return q("qm-ev-f3", "facile", "Variance of X?",
        [["P(X = 2) / P(X = 3) / P(X = 4)", lst(ps.map((p) => E(p)))]],
        a, "", 2,
        [`E(X) = ${ps.map((p, i) => `${F(p)} × ${Fp(xs[i])}`).join(" + ")} = ${F(ev(ps, xs))}.`,
          `σ² = ${ps.map((p, i) => `${F(p)} × (${F(xs[i])} − ${F(ev(ps, xs))})²`).join(" + ")} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const cov = 0.009, va = 0.02, vb = 0.033;
      const a = cov / Math.sqrt(va * vb);
      return q("qm-ev-f4", "facile", "Correlation coefficient of the two investments' returns?",
        [["Covariance of returns", E(cov)], ["Variance of returns, investment A", E(va)], ["Variance of returns, investment B", E(vb)]],
        a, "", 2,
        [`σA = √${F(va)} = ${F(Math.sqrt(va), 4)} ; σB = √${F(vb)} = ${F(Math.sqrt(vb), 4)}.`,
          `ρ = ${F(cov)} / (${F(Math.sqrt(va), 4)} × ${F(Math.sqrt(vb), 4)}) = ${F(a, 2)}.`]);
    })(),
    (() => {
      const rho = 0.8, vc = 0.0009, vd = 0.0036;
      const a = rho * Math.sqrt(vc) * Math.sqrt(vd);
      return q("qm-ev-f5", "facile", "Covariance of returns on C and D? (decimal form)",
        [["Correlation of returns", E(rho)], ["Variance of returns, C", E(vc)], ["Variance of returns, D", E(vd)]],
        a, "", 5,
        [`σC = √${F(vc)} = ${F(Math.sqrt(vc))} ; σD = √${F(vd)} = ${F(Math.sqrt(vd))}.`,
          `Cov = ρ × σC × σD = ${F(rho)} × ${F(Math.sqrt(vc))} × ${F(Math.sqrt(vd))} = ${F(a, 5)}.`]);
    })(),
    (() => {
      const ps = [0.25, 0.45, 0.3], xs = [-6, 8, 18];
      const a = Math.sqrt(pVar(ps, xs));
      return q("qm-ev-m1", "moyen", "Standard deviation of returns?",
        [["Recession / normal / expansion: probability", lst(ps.map((p) => E(p)))], ["Recession / normal / expansion: return", pcs(xs)]],
        a, "%", 2,
        [`E(R) = ${ps.map((p, i) => `${F(p)} × ${Fp(xs[i])}`).join(" + ")} = ${F(ev(ps, xs), 2)}%.`,
          `σ² = ${ps.map((p, i) => `${F(p)} × ${F(sq(xs[i] - ev(ps, xs)), 2)}`).join(" + ")} = ${F(pVar(ps, xs), 4)} (%²).`,
          `σ = √${F(pVar(ps, xs), 4)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const pG = 0.6, good = [0.7, 0.3], epsG = [5, 3.5], bad = [0.8, 0.2], epsB = [1.5, 1];
      const eG = ev(good, epsG), eB = ev(bad, epsB);
      const a = pG * eG + (1 - pG) * eB;
      return q("qm-ev-m2", "moyen", "Firm's expected EPS?",
        [["Probability of a good economy", pc(pG)], ["Good economy: EPS $5.00 / $3.50 with probability", lst(good.map((p) => pc(p)))],
          ["Bad economy: EPS $1.50 / $1.00 with probability", lst(bad.map((p) => pc(p)))]],
        a, "$", 2,
        [`E(EPS | bonne) = ${F(good[0])} × 5 + ${F(good[1])} × 3,5 = ${D(eG, 2)} ; E(EPS | mauvaise) = ${F(bad[0])} × 1,5 + ${F(bad[1])} × 1 = ${D(eB, 2)}.`,
          `Espérance totale = ${F(pG)} × ${F(eG, 2)} + ${F(1 - pG)} × ${F(eB, 2)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const ps = [0.4, 0.6], xs = [20, 30], ys = [0, 50];
      const a = pCov(ps, xs, ys);
      return q("qm-ev-m3", "moyen", "Covariance of X and Y?",
        [["P(X = 20, Y = 0)", E(ps[0])], ["P(X = 30, Y = 50)", E(ps[1])], ["E(X) / E(Y)", lst([E(ev(ps, xs)), E(ev(ps, ys))])]],
        a, "", 2,
        [`Cov = Σ P × [X − E(X)] × [Y − E(Y)].`,
          `= ${F(ps[0])} × (${F(xs[0] - ev(ps, xs))}) × (${F(ys[0] - ev(ps, ys))}) + ${F(ps[1])} × ${F(xs[1] - ev(ps, xs))} × ${F(ys[1] - ev(ps, ys))}.`,
          `= ${F(ps[0] * (xs[0] - ev(ps, xs)) * (ys[0] - ev(ps, ys)))} + ${F(ps[1] * (xs[1] - ev(ps, xs)) * (ys[1] - ev(ps, ys)))} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const pAcq = 0.3, acq = [0.4, 0.6], rAcq = [30, 25], rNo = 12;
      const eAcq = ev(acq, rAcq);
      const a = pAcq * eAcq + (1 - pAcq) * rNo;
      return q("qm-ev-m4", "moyen", "Expected return on the investment?",
        [["Probability the company is acquired", pc(pAcq)], ["If acquired: return 30% / 25% with probability", lst(acq.map((p) => pc(p)))], ["If not acquired: expected return", `${rNo}%`]],
        a, "%", 2,
        [`E(R | rachat) = ${F(acq[0])} × 30 + ${F(acq[1])} × 25 = ${Pa(eAcq)}.`,
          `E(R) = ${F(pAcq)} × ${F(eAcq)} + ${F(1 - pAcq)} × ${F(rNo)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const ps = [0.2, 0.5, 0.3], xs = [20, 15, 10];
      const a = Math.sqrt(pVar(ps, xs));
      return q("qm-ev-m5", "moyen", "Standard deviation of the company's return on equity?",
        [["Good / normal / poor economy: probability", lst(ps.map((p) => E(p)))], ["Good / normal / poor economy: ROE", pcs(xs)]],
        a, "%", 2,
        [`E(ROE) = ${ps.map((p, i) => `${F(p)} × ${Fp(xs[i])}`).join(" + ")} = ${F(ev(ps, xs), 2)}%.`,
          `σ² = ${ps.map((p, i) => `${F(p)} × ${F(sq(xs[i] - ev(ps, xs)), 4)}`).join(" + ")} = ${F(pVar(ps, xs), 4)} (%²).`,
          `σ = √${F(pVar(ps, xs), 4)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const ps = [0.15, 0.2, 0.25, 0.4], ra = [18, 17, 11, 7], rb = [19, 18, 10, 9];
      const a = pCov(ps, ra, rb);
      return q("qm-ev-d1", "difficile", "Covariance of the returns on portfolios A and B? (in %²)",
        [["Scenario probabilities", lst(ps.map((p) => pc(p)))], ["Return on portfolio A by scenario", pcs(ra)], ["Return on portfolio B by scenario", pcs(rb)]],
        a, "", 2,
        [`E(RA) = ${F(ev(ps, ra), 2)}% ; E(RB) = ${F(ev(ps, rb), 2)}%.`,
          `Produits des écarts pondérés : ${ps.map((p, i) => F(p * (ra[i] - ev(ps, ra)) * (rb[i] - ev(ps, rb)), 4)).join(" + ")}.`,
          `Cov(A, B) = ${F(a, 2)} (%²), positive : les deux portefeuilles montent et baissent ensemble.`]);
    })(),
    (() => {
      const ps = [0.25, 0.45, 0.3], ri = [0.16, 0.02, -0.1], rs = [0.24, 0.03, -0.15];
      const a = pCov(ps, ri, rs);
      return q("qm-ev-d2", "difficile", "Covariance between stock and index returns? (decimal form)",
        [["Joint outcome 1: probability / index return / stock return", lst([E(ps[0]), E(ri[0]), E(rs[0])])],
          ["Joint outcome 2: probability / index return / stock return", lst([E(ps[1]), E(ri[1]), E(rs[1])])],
          ["Joint outcome 3: probability / index return / stock return", lst([E(ps[2]), E(ri[2]), E(rs[2])])],
          ["All other combinations", "Probability 0"]],
        a, "", 5,
        [`Seules les cases de la diagonale ont une probabilité : E(RI) = ${F(ev(ps, ri), 4)} ; E(RS) = ${F(ev(ps, rs), 4)}.`,
          `Cov = ${ps.map((p, i) => `${F(p)} × ${Fp(ri[i] - ev(ps, ri), 4)} × ${Fp(rs[i] - ev(ps, rs), 4)}`).join(" + ")}.`,
          `Cov = ${F(a, 5)}.`]);
    })(),
    (() => {
      const pUp = 0.6, up = [0.7, 0.3], pxUp = [60, 48], dn = [0.5, 0.5], pxDn = [45, 35];
      const ps = [pUp * up[0], pUp * up[1], (1 - pUp) * dn[0], (1 - pUp) * dn[1]];
      const xs = [...pxUp, ...pxDn];
      const a = Math.sqrt(pVar(ps, xs));
      return q("qm-ev-d3", "difficile", "Standard deviation of next quarter's stock price?",
        [["Probability the market rises", pc(pUp)], ["Market rises: good / poor earnings (probability)", lst(up.map((p) => pc(p)))],
          ["Market rises: price after good / poor earnings", lst(pxUp.map((x) => usd(x)))], ["Market falls: good / poor earnings (probability)", lst(dn.map((p) => pc(p)))],
          ["Market falls: price after good / poor earnings", lst(pxDn.map((x) => usd(x)))]],
        a, "$", 2,
        [`Probabilités jointes (feuilles de l'arbre) : ${ps.map((p) => F(p, 2)).join(" ; ")}.`,
          `E(P) = ${ps.map((p, i) => `${F(p, 2)} × ${F(xs[i])}`).join(" + ")} = ${D(ev(ps, xs), 2)}.`,
          `σ² = Σ p × (P − ${F(ev(ps, xs), 2)})² = ${F(pVar(ps, xs), 4)} ⇒ σ = ${D(a, 2)}.`]);
    })(),
    (() => {
      const ps = [0.1, 0.3, 0.5, 0.1], ra = [-5, -2, 10, 31], rb = [4, 8, 10, 12];
      const cov = pCov(ps, ra, rb), sa = Math.sqrt(pVar(ps, ra)), sb = Math.sqrt(pVar(ps, rb));
      const a = cov / (sa * sb);
      return q("qm-ev-d4", "difficile", "Correlation of the returns on stocks A and B?",
        [["Recession / below average / normal / boom: probability", lst(ps.map((p) => E(p)))], ["Return on A", pcs(ra)], ["Return on B", pcs(rb)]],
        a, "", 2,
        [`E(RA) = ${F(ev(ps, ra))}% ; E(RB) = ${F(ev(ps, rb))}%.`,
          `σ²A = ${F(pVar(ps, ra), 2)} ⇒ σA = ${F(sa, 4)} ; σ²B = ${F(pVar(ps, rb), 2)} ⇒ σB = ${F(sb, 4)} ; Cov = ${F(cov, 2)} (%²).`,
          `ρ = ${F(cov, 2)} / (${F(sa, 4)} × ${F(sb, 4)}) = ${F(a, 2)}.`]);
    })(),
    (() => {
      const pBoom = 0.25, pNorm = 0.5, xs = [22, 9, -12];
      const ps = [pBoom, pNorm, 1 - pBoom - pNorm];
      const a = Math.sqrt(pVar(ps, xs));
      return q("qm-ev-d5", "difficile", "Standard deviation of the stock's return?",
        [["Probability of a boom / of a normal year", lst([pc(pBoom), pc(pNorm)])], ["Otherwise", "Recession"],
          ["Return in a boom / normal year / recession", pcs(xs)]],
        a, "%", 2,
        [`P(récession) = 1 − ${F(pBoom)} − ${F(pNorm)} = ${F(ps[2])}.`,
          `E(R) = ${ps.map((p, i) => `${F(p)} × ${Fp(xs[i])}`).join(" + ")} = ${F(ev(ps, xs), 2)}%.`,
          `σ² = ${ps.map((p, i) => `${F(p)} × ${F(sq(xs[i] - ev(ps, xs)))}`).join(" + ")} = ${F(pVar(ps, xs), 2)} ⇒ σ = ${Pa(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 10 · Bayes ────────────────────────── */

/** Probabilité a posteriori de l'état k, sachant l'information observée. */
const posterior = (priors: number[], likes: number[], k: number): number =>
  (priors[k] * likes[k]) / sum(priors.map((p, i) => p * likes[i]));

const BAYES: CalcType = {
  key: "bayes",
  topic: "quant",
  name: "Bayes et règle des probabilités totales",
  tier: "essentiel",
  top: true,
  source: "LM 4 · Probability Trees and Conditional Expectations",
  formulas: [
    "Probabilité jointe : P(A et B) = P(B | A) × P(A)",
    "Probabilités totales : P(B) = P(B | A) × P(A) + P(B | Aᶜ) × P(Aᶜ)",
    "Bayes : P(A | B) = P(B | A) × P(A) / P(B)",
  ],
  traps: [
    "Le dénominateur de Bayes est la probabilité totale de l'information observée, pas P(A).",
    "Information négative (« ne monte pas ») : prends les compléments 1 − P(B | A) dans chaque branche.",
    "Deux informations indépendantes : la probabilité a posteriori de la première devient l'a priori de la seconde.",
  ],
  questions: [
    (() => {
      const pA = 0.4, pBA = 0.5, pBAc = 0.2;
      const a = posterior([pA, 1 - pA], [pBA, pBAc], 0) * 100;
      return q("qm-bayes-f1", "facile", "P(A | B)?",
        [["P(A)", E(pA)], ["P(B | A)", E(pBA)], ["P(B | Aᶜ)", E(pBAc)]],
        a, "%", 2,
        [`P(B) = ${F(pBA)} × ${F(pA)} + ${F(pBAc)} × ${F(1 - pA)} = ${F(pBA * pA, 2)} + ${F(pBAc * (1 - pA), 2)} = ${F(pBA * pA + pBAc * (1 - pA), 2)}.`,
          `P(A | B) = ${F(pBA * pA, 2)} / ${F(pBA * pA + pBAc * (1 - pA), 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const pO = 0.6, gO = 0.7, gU = 0.2;
      const a = (pO * gO + (1 - pO) * gU) * 100;
      return q("qm-bayes-f2", "facile", "Unconditional probability that the stock rises?",
        [["Probability the economy outperforms", pc(pO)], ["P(stock rises | outperform)", pc(gO)], ["P(stock rises | underperform)", pc(gU)]],
        a, "%", 2,
        ["Probabilités totales : on additionne les deux branches où l'action monte.",
          `P(hausse) = ${F(gO)} × ${F(pO)} + ${F(gU)} × ${F(1 - pO)} = ${F(gO * pO, 2)} + ${F(gU * (1 - pO), 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const pO = 0.6, gO = 0.7;
      const a = pO * gO * 100;
      return q("qm-bayes-f3", "facile", "Joint probability that the economy outperforms and the stock rises?",
        [["Probability the economy outperforms", pc(pO)], ["P(stock rises | outperform)", pc(gO)]],
        a, "%", 2,
        ["P(A et B) = P(B | A) × P(A).", `= ${F(gO)} × ${F(pO)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const pO = 0.6, gO = 0.7, gU = 0.2;
      const a = posterior([pO, 1 - pO], [gO, gU], 0) * 100;
      return q("qm-bayes-f4", "facile", "Given that the stock rose, probability that the economy outperformed?",
        [["Probability the economy outperforms", pc(pO)], ["P(stock rises | outperform)", pc(gO)], ["P(stock rises | underperform)", pc(gU)]],
        a, "%", 2,
        [`P(hausse) = ${F(gO * pO, 2)} + ${F(gU * (1 - pO), 2)} = ${F(gO * pO + gU * (1 - pO), 2)}.`,
          `P(surperformance | hausse) = ${F(gO * pO, 2)} / ${F(gO * pO + gU * (1 - pO), 2)} = ${Pa(a)} (contre ${P(pO)} a priori).`]);
    })(),
    (() => {
      const pH = 0.4, uH = 0.7, uL = 0.2;
      const a = posterior([pH, 1 - pH], [uH, uL], 0) * 100;
      return q("qm-bayes-f5", "facile", "Given an upgrade, updated probability that EPS exceed $2?",
        [["Prior probability EPS > $2", pc(pH)], ["P(credit upgrade | EPS > $2)", pc(uH)], ["P(credit upgrade | EPS ≤ $2)", pc(uL)]],
        a, "%", 2,
        [`P(relèvement) = ${F(uH)} × ${F(pH)} + ${F(uL)} × ${F(1 - pH)} = ${F(uH * pH, 2)} + ${F(uL * (1 - pH), 2)} = ${F(uH * pH + uL * (1 - pH), 2)}.`,
          `P(EPS > 2 | relèvement) = ${F(uH * pH, 2)} / ${F(uH * pH + uL * (1 - pH), 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const pE = 0.6, oE = 0.7, oN = 0.1;
      const a = posterior([pE, 1 - pE], [1 - oE, 1 - oN], 1) * 100;
      return q("qm-bayes-m1", "moyen", "Given that tech will NOT outperform, probability that the economy does not expand?",
        [["Probability the economy expands", pc(pE)], ["P(tech outperforms | expansion)", pc(oE)], ["P(tech outperforms | no expansion)", pc(oN)]],
        a, "%", 2,
        [`On travaille sur l'information « pas de surperformance » : P(non | expansion) = ${F(1 - oE)} ; P(non | pas d'expansion) = ${F(1 - oN)}.`,
          `P(non) = ${F(1 - oE)} × ${F(pE)} + ${F(1 - oN)} × ${F(1 - pE)} = ${F((1 - oE) * pE, 2)} + ${F((1 - oN) * (1 - pE), 2)} = ${F((1 - oE) * pE + (1 - oN) * (1 - pE), 2)}.`,
          `P(pas d'expansion | non) = ${F((1 - oN) * (1 - pE), 2)} / ${F((1 - oE) * pE + (1 - oN) * (1 - pE), 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const pD = 0.2, nD = 0.9, nN = 0.1;
      const a = posterior([pD, 1 - pD], [nD, nN], 0) * 100;
      return q("qm-bayes-m2", "moyen", "Given a negative ratio, updated probability of an earnings decline?",
        [["Share of companies with an earnings decline", pc(pD)], ["P(negative ratio | decline)", pc(nD)], ["P(negative ratio | no decline)", pc(nN)]],
        a, "%", 2,
        [`P(ratio négatif) = ${F(nD)} × ${F(pD)} + ${F(nN)} × ${F(1 - pD)} = ${F(nD * pD, 2)} + ${F(nN * (1 - pD), 2)} = ${F(nD * pD + nN * (1 - pD), 2)}.`,
          `P(baisse | ratio négatif) = ${F(nD * pD, 2)} / ${F(nD * pD + nN * (1 - pD), 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const wB = 0.3, dB = 0.25, dC = 0.4;
      const a = posterior([wB, 1 - wB], [dB, dC], 0) * 100;
      return q("qm-bayes-m3", "moyen", "Given that a randomly selected bond defaulted, probability that it was B-rated?",
        [["Portfolio weight of B-rated / CCC-rated bonds", lst([pc(wB), pc(1 - wB)])], ["5-year default probability: B / CCC", lst([pc(dB), pc(dC)])]],
        a, "%", 2,
        [`P(défaut) = ${F(dB)} × ${F(wB)} + ${F(dC)} × ${F(1 - wB)} = ${F(dB * wB, 3)} + ${F(dC * (1 - wB), 2)} = ${F(dB * wB + dC * (1 - wB), 3)}.`,
          `P(B | défaut) = ${F(dB * wB, 3)} / ${F(dB * wB + dC * (1 - wB), 3)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const pR = 0.4, rR = 0.7, rB = 0.8;
      const a = posterior([pR, 1 - pR], [rR, rB], 0) * 100;
      return q("qm-bayes-m4", "moyen", "Given that a car has a radio, probability that it is red?",
        [["Share of red cars (the others are blue)", pc(pR)], ["Share of red cars with a radio", pc(rR)], ["Share of blue cars with a radio", pc(rB)]],
        a, "%", 2,
        [`P(radio) = ${F(rR)} × ${F(pR)} + ${F(rB)} × ${F(1 - pR)} = ${F(rR * pR, 2)} + ${F(rB * (1 - pR), 2)} = ${F(rR * pR + rB * (1 - pR), 2)}.`,
          `P(rouge | radio) = ${F(rR * pR, 2)} / ${F(rR * pR + rB * (1 - pR), 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const wJ = 0.6, gJ = 0.5, gA = 0.25;
      const a = posterior([wJ, 1 - wJ], [gJ, gA], 0) * 100;
      return q("qm-bayes-m5", "moyen", "Given that a randomly chosen stock is good, probability that John picked it?",
        [["Share of the portfolio picked by John / Andrew", lst([pc(wJ), pc(1 - wJ)])], ["Share of good picks: John / Andrew", lst([pc(gJ), pc(gA)])]],
        a, "%", 2,
        [`P(bon) = ${F(gJ)} × ${F(wJ)} + ${F(gA)} × ${F(1 - wJ)} = ${F(gJ * wJ, 2)} + ${F(gA * (1 - wJ), 2)} = ${F(gJ * wJ + gA * (1 - wJ), 2)}.`,
          `P(John | bon) = ${F(gJ * wJ, 2)} / ${F(gJ * wJ + gA * (1 - wJ), 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const priors = [0.3, 0.5, 0.2], likes = [0.8, 0.5, 0.2];
      const joint = priors.map((p, i) => p * likes[i]);
      const a = posterior(priors, likes, 0) * 100;
      return q("qm-bayes-d1", "difficile", "Given that the company beat its forecast, probability that the economy is strong?",
        [["P(strong / normal / weak economy)", lst(priors.map((p) => E(p)))], ["P(company beats forecast | strong / normal / weak)", lst(likes.map((p) => E(p)))]],
        a, "%", 2,
        [`Jointes : ${joint.map((j) => F(j, 2)).join(" ; ")} → P(battre la prévision) = ${F(sum(joint), 2)}.`,
          `P(forte | battue) = ${F(joint[0], 2)} / ${F(sum(joint), 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const prior = 0.02, hit = 0.95, falseHit = 0.1;
      const post1 = posterior([prior, 1 - prior], [hit, falseHit], 0);
      const post2 = posterior([post1, 1 - post1], [hit, falseHit], 0);
      const a = post2 * 100;
      return q("qm-bayes-d2", "difficile", "Probability of fraud after two independent positive signals?",
        [["Prior probability of fraud", pc(prior)], ["P(positive signal | fraud)", pc(hit)], ["P(positive signal | no fraud)", pc(falseHit)], ["Signals observed", "Two independent positive signals"]],
        a, "%", 2,
        [`Après le 1er signal : ${F(hit)} × ${F(prior)} / (${F(hit)} × ${F(prior)} + ${F(falseHit)} × ${F(1 - prior)}) = ${P(post1, 2)}.`,
          `Cette probabilité devient l'a priori du 2e signal : ${F(hit)} × ${F(post1, 4)} / (${F(hit)} × ${F(post1, 4)} + ${F(falseHit)} × ${F(1 - post1, 4)}).`,
          `P(fraude | 2 signaux) = ${Pa(a)}.`]);
    })(),
    (() => {
      const pH = 0.4, epsH = 3, epsL = 2, gH = 0.8, gL = 0.3;
      const postH = posterior([pH, 1 - pH], [gH, gL], 0);
      const a = postH * epsH + (1 - postH) * epsL;
      return q("qm-bayes-d3", "difficile", "Expected EPS after the company issues positive guidance?",
        [["Prior: P(EPS = $3) / P(EPS = $2)", lst([E(pH), E(1 - pH)])], ["P(positive guidance | EPS = $3)", E(gH)], ["P(positive guidance | EPS = $2)", E(gL)]],
        a, "$", 2,
        [`P(guidance positive) = ${F(gH)} × ${F(pH)} + ${F(gL)} × ${F(1 - pH)} = ${F(gH * pH + gL * (1 - pH), 2)}.`,
          `P(EPS = 3 | positive) = ${F(gH * pH, 2)} / ${F(gH * pH + gL * (1 - pH), 2)} = ${F(postH, 2)} ; P(EPS = 2 | positive) = ${F(1 - postH, 2)}.`,
          `E(EPS | positive) = ${F(postH, 2)} × 3 + ${F(1 - postH, 2)} × 2 = ${D(a, 2)} (contre ${D(pH * epsH + (1 - pH) * epsL, 2)} a priori).`]);
    })(),
    (() => {
      const pO = 0.6, gO = 0.7, gU = 0.2;
      const a = posterior([pO, 1 - pO], [1 - gO, 1 - gU], 0) * 100;
      return q("qm-bayes-d4", "difficile", "Given that the stock did NOT rise, probability that the economy outperformed?",
        [["Probability the economy outperforms", pc(pO)], ["P(stock rises | outperform)", pc(gO)], ["P(stock rises | underperform)", pc(gU)]],
        a, "%", 2,
        [`P(pas de hausse | surperformance) = ${F(1 - gO)} ; P(pas de hausse | sous-performance) = ${F(1 - gU)}.`,
          `P(pas de hausse) = ${F(1 - gO)} × ${F(pO)} + ${F(1 - gU)} × ${F(1 - pO)} = ${F((1 - gO) * pO, 2)} + ${F((1 - gU) * (1 - pO), 2)} = ${F((1 - gO) * pO + (1 - gU) * (1 - pO), 2)}.`,
          `P(surperformance | pas de hausse) = ${F((1 - gO) * pO, 2)} / ${F((1 - gO) * pO + (1 - gU) * (1 - pO), 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const w = [0.5, 0.3, 0.2], d = [0.02, 0.05, 0.15];
      const joint = w.map((x, i) => x * d[i]);
      const a = posterior(w, d, 2) * 100;
      return q("qm-bayes-d5", "difficile", "Given that a bond defaulted, probability that it was rated BB?",
        [["Portfolio weights: A / BBB / BB", lst(w.map((x) => pc(x)))], ["Default probability: A / BBB / BB", lst(d.map((x) => pc(x)))]],
        a, "%", 2,
        [`Jointes : ${w.map((x, i) => `${F(x)} × ${F(d[i])} = ${F(joint[i], 3)}`).join(" ; ")}.`,
          `P(défaut) = ${F(sum(joint), 3)} ; P(BB | défaut) = ${F(joint[2], 3)} / ${F(sum(joint), 3)} = ${Pa(a)}.`,
          "Les BB pèsent 20 % du portefeuille mais plus de la moitié des défauts."]);
    })(),
  ],
};

/* ────────────────────────── 11 · Roy's safety-first ────────────────────────── */

/** Ligne « z-table » : N(−z) pour chaque z (valeurs utiles et leurres), z arrondi à 2 décimales comme dans une table. */
function zRow(zs: number[]): Row {
  return ["z-table", lst(zs.map((z) => `N(${MINUS}${E(z, 2)}) = ${E(normCdf(-Math.round(z * 100) / 100), 4)}`))];
}

const SAFETY_FIRST: CalcType = {
  key: "safety-first",
  topic: "quant",
  name: "Roy's safety-first ratio et shortfall risk",
  tier: "essentiel",
  source: "LM 5 · Portfolio Mathematics",
  formulas: [
    "SFRatio = [E(Rp) − RL] / σp",
    "Critère de Roy : on retient le portefeuille au SFRatio le plus élevé",
    "Shortfall risk (rendements normaux) = P(R < RL) = N(−SFRatio)",
    "Seuil à partir de montants : RL = (valeur minimale exigée − valeur initiale) / valeur initiale",
  ],
  traps: [
    "Le seuil RL n'est pas le taux sans risque (si RL = Rf, on retrouve le ratio de Sharpe).",
    "SFRatio plus élevé ⇒ probabilité plus faible de passer sous le seuil.",
    "Un retrait prévu en fin d'année s'ajoute à la valeur minimale à préserver.",
  ],
  questions: [
    (() => {
      const er = 12, sd = 18, rl = 0;
      const a = sfr(er, rl, sd);
      return q("qm-sf-f1", "facile", "Safety-first ratio of the portfolio?",
        [["Expected return", `${er}%`], ["Standard deviation of returns", `${sd}%`], ["Threshold return", `${rl}%`]],
        a, "", 2,
        ["SFRatio = (E(R) − RL) / σ.", `SFRatio = (${F(er)} − ${F(rl)}) / ${F(sd)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const ps: [string, number, number][] = [["A", 5, 8], ["B", 11, 21], ["C", 18, 40]];
      const rl = 4;
      const ratios = ps.map(([, e, s]) => sfr(e, rl, s));
      const a = Math.max(...ratios);
      const best = ps[ratios.indexOf(a)][0];
      return q("qm-sf-f2", "facile", "Safety-first ratio of the optimal portfolio under Roy's criterion?",
        [...ps.map(([n, e, s]): Row => [`Portfolio ${n}: expected return / standard deviation`, `${e}% / ${s}%`]), ["Threshold return", `${rl}%`]],
        a, "", 2,
        [`SFRatio : ${ps.map(([n, e, s], i) => `${n} = (${F(e)} − ${F(rl)}) / ${F(s)} = ${F(ratios[i], 3)}`).join(" ; ")}.`,
          `Le plus élevé : ${best}, avec ${F(a, 2)}.`]);
    })(),
    (() => {
      const v0 = 120, vMin = 123.6;
      const a = ((vMin - v0) / v0) * 100;
      return q("qm-sf-f3", "facile", "Threshold return to use in the safety-first ratio?",
        [["Endowment value today ($ millions)", E(v0)], ["Minimum acceptable value in one year ($ millions)", E(vMin)]],
        a, "%", 2,
        ["RL = (valeur minimale − valeur initiale) / valeur initiale.", `RL = (${F(vMin)} − ${F(v0)}) / ${F(v0)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const ratio = 1;
      const a = normCdf(-ratio) * 100;
      return q("qm-sf-f4", "facile", "Shortfall probability (return below the threshold)?",
        [["Safety-first ratio", E(ratio, 2)], ["Distribution of returns", "Normal"], ["N(−1.00) from the z-table", E(normCdf(-1), 4)]],
        a, "%", 2,
        ["Le SFRatio est le nombre d'écarts-types entre l'espérance et le seuil.", `P(R < RL) = N(−${F(ratio, 2)}) = ${Pa(a)}.`]);
    })(),
    (() => {
      const ps: [string, number, number][] = [["X", 5, 3], ["Y", 14, 20], ["Z", 19, 28]];
      const rl = 4;
      const ratios = ps.map(([, e, s]) => sfr(e, rl, s));
      const a = Math.max(...ratios);
      const best = ps[ratios.indexOf(a)][0];
      return q("qm-sf-f5", "facile", "Highest safety-first ratio among the three portfolios?",
        [...ps.map(([n, e, s]): Row => [`Portfolio ${n}: mean / standard deviation`, `${e}% / ${s}%`]), ["Threshold return", `${rl}%`]],
        a, "", 2,
        [`SFRatio : ${ps.map(([n, e, s], i) => `${n} = (${F(e)} − ${F(rl)}) / ${F(s)} = ${F(ratios[i], 3)}`).join(" ; ")}.`,
          `Optimal : ${best} (${F(a, 2)}), de peu devant Y ; X, au plus faible écart-type, a le ratio le plus bas.`]);
    })(),
    (() => {
      const v0 = 120, vMin = 123.6, er = 9, sd = 12;
      const rl = ((vMin - v0) / v0) * 100;
      const ratio = sfr(er, rl, sd);
      const a = normCdf(-ratio) * 100;
      return q("qm-sf-m1", "moyen", "Probability that the endowment ends the year below its minimum value?",
        [["Endowment value today ($ millions)", E(v0)], ["Minimum acceptable value in one year ($ millions)", E(vMin)],
          ["Portfolio expected return / standard deviation", `${er}% / ${sd}%`], ["Distribution of returns", "Normal"], zRow([ratio, er / sd])],
        a, "%", 2,
        [`RL = (${F(vMin)} − ${F(v0)}) / ${F(v0)} = ${F(rl)} %.`,
          `SFRatio = (${F(er)} − ${F(rl)}) / ${F(sd)} = ${F(ratio, 2)}.`,
          `Shortfall risk = N(−${F(ratio, 2)}) = ${Pa(a)}.`]);
    })(),
    (() => {
      const ps: [string, number, number][] = [["1", 9, 5], ["2", 8, 4], ["3", 7, 3]];
      const rf = 3, rl = 5;
      const ratios = ps.map(([, e, s]) => sfr(e, rl, s));
      const a = Math.max(...ratios);
      const best = ps[ratios.indexOf(a)][0];
      return q("qm-sf-m2", "moyen", "Safety-first ratio of the portfolio that minimizes the probability of returns below 5%?",
        [...ps.map(([n, e, s]): Row => [`Portfolio ${n}: expected return / standard deviation`, `${e}% / ${s}%`]), ["Risk-free rate", `${rf}%`], ["Minimum acceptable return", `${rl}%`]],
        a, "", 2,
        ["Le seuil est 5 % : le taux sans risque ne sert pas (ce n'est pas un ratio de Sharpe).",
          `SFRatio : ${ps.map(([n, e, s], i) => `${n} = (${F(e)} − ${F(rl)}) / ${F(s)} = ${F(ratios[i], 3)}`).join(" ; ")}.`,
          `Portefeuille ${best}, SFRatio = ${F(a, 2)}.`]);
    })(),
    (() => {
      const v0 = 2000000, wd = 50000, er = 7.5, sd = 10;
      const rl = (wd / v0) * 100;
      const a = sfr(er, rl, sd);
      return q("qm-sf-m3", "moyen", "Safety-first ratio for the client's objective?",
        [["Portfolio value today", usd(v0)], ["Objective", `Withdraw ${usd(wd)} at year-end without dipping below ${usd(v0)}`],
          ["Expected return / standard deviation", `${E(er)}% / ${sd}%`]],
        a, "", 2,
        [`Valeur minimale en fin d'année = ${F(v0)} + ${F(wd)} = ${D(v0 + wd)} ⇒ RL = ${F(wd)} / ${F(v0)} = ${F(rl, 1)} %.`,
          `SFRatio = (${F(er, 1)} − ${F(rl, 1)}) / ${F(sd)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const sd = 15, rl = 4, target = 0.6;
      const a = rl + target * sd;
      return q("qm-sf-m4", "moyen", "Expected return the portfolio needs for the target safety-first ratio?",
        [["Standard deviation of returns", `${sd}%`], ["Threshold return", `${rl}%`], ["Target safety-first ratio", E(target, 2)]],
        a, "%", 2,
        [`(E(R) − ${F(rl)}) / ${F(sd)} = ${F(target)} ⇒ E(R) = ${F(rl)} + ${F(target)} × ${F(sd)}.`, `E(R) = ${Pa(a)}.`]);
    })(),
    (() => {
      const er = 6, sd = 4, rl = 0;
      const ratio = sfr(er, rl, sd);
      const a = normCdf(-ratio) * 100;
      return q("qm-sf-m5", "moyen", "Probability of a negative return over the year?",
        [["Expected return", `${er}%`], ["Standard deviation of returns", `${sd}%`], ["Distribution of returns", "Normal"], zRow([ratio])],
        a, "%", 2,
        [`Seuil RL = 0 % : SFRatio = (${F(er)} − 0) / ${F(sd)} = ${F(ratio, 2)}.`, `P(R < 0) = N(−${F(ratio, 2)}) = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 500000, vMin = 525000;
      const ps: [string, number, number][] = [["Epps", 6, 4], ["Flake", 7, 8], ["Grant", 10, 12.5]];
      const rl = ((vMin - v0) / v0) * 100;
      const ratios = ps.map(([, e, s]) => sfr(e, rl, s));
      const best = Math.max(...ratios);
      const a = normCdf(-best) * 100;
      return q("qm-sf-d1", "difficile", "Shortfall probability of the portfolio chosen under Roy's criterion?",
        [["Portfolio value today", usd(v0)], ["Minimum value needed in one year", usd(vMin)],
          ...ps.map(([n, e, s]): Row => [`${n}: expected return / standard deviation`, `${e}% / ${E(s)}%`]), ["Distribution of returns", "Normal"],
          zRow(Array.from(new Set(ratios.map((x) => Math.round(x * 100) / 100))).sort((x, y) => x - y))],
        a, "%", 2,
        [`RL = (${F(vMin)} − ${F(v0)}) / ${F(v0)} = ${F(rl)} %.`,
          `SFRatio : ${ps.map(([n, e, s], i) => `${n} = (${F(e)} − ${F(rl)}) / ${F(s)} = ${F(ratios[i], 3)}`).join(" ; ")}.`,
          `${ps[ratios.indexOf(best)][0]} l'emporte : P(R < ${F(rl)} %) = N(−${F(best, 2)}) = ${Pa(a)}.`]);
    })(),
    (() => {
      const er = 9, rl = 3, z = 1;
      const a = (er - rl) / z;
      return q("qm-sf-d2", "difficile", "Maximum standard deviation that keeps the shortfall probability at or below 15.87%?",
        [["Expected return", `${er}%`], ["Threshold return", `${rl}%`], ["Maximum acceptable P(R < threshold)", "15.87%"], ["z-table", "N(−1.00) = 0.1587"]],
        a, "%", 2,
        [`P(R < RL) ≤ 15,87 % ⇔ SFRatio ≥ ${F(z, 2)}.`,
          `(${F(er)} − ${F(rl)}) / σ ≥ ${F(z)} ⇒ σ ≤ ${F(er - rl)} / ${F(z)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 1000000, infl = 0.02, wd = 30000;
      const vMin = v0 * (1 + infl) + wd;
      const rl = ((vMin - v0) / v0) * 100;
      const ps: [string, number, number][] = [["A", 10, 10], ["B", 13, 16], ["C", 9, 5]];
      const ratios = ps.map(([, e, s]) => sfr(e, rl, s));
      const best = Math.max(...ratios);
      const a = normCdf(-best) * 100;
      return q("qm-sf-d3", "difficile", "Shortfall probability of the optimal portfolio?",
        [["Portfolio value today", usd(v0)], ["Objective", `Withdraw ${usd(wd)} at year-end and keep the remaining value constant in real terms`],
          ["Expected inflation", pc(infl)], ...ps.map(([n, e, s]): Row => [`Portfolio ${n}: expected return / standard deviation`, `${e}% / ${s}%`]),
          ["Distribution of returns", "Normal"], zRow(Array.from(new Set(ratios.map((x) => Math.round(x * 100) / 100))).sort((x, y) => x - y))],
        a, "%", 2,
        [`Valeur minimale = ${F(v0)} × ${F(1 + infl)} + ${F(wd)} = ${D(vMin)} ⇒ RL = ${F(rl)} %.`,
          `SFRatio : ${ps.map(([n, e, s], i) => `${n} = (${F(e)} − ${F(rl)}) / ${F(s)} = ${F(ratios[i], 3)}`).join(" ; ")}.`,
          `${ps[ratios.indexOf(best)][0]} l'emporte : N(−${F(best, 2)}) = ${Pa(a)}.`]);
    })(),
    (() => {
      const rl = 2, a1: [number, number] = [10, 8], b1: [number, number] = [14, 24];
      const sA = sfr(a1[0], rl, a1[1]), sB = sfr(b1[0], rl, b1[1]);
      const a = (normCdf(-sB) - normCdf(-sA)) * 100;
      return q("qm-sf-d4", "difficile", "By how many percentage points is B's shortfall probability higher than A's?",
        [["Portfolio A: expected return / standard deviation", `${a1[0]}% / ${a1[1]}%`], ["Portfolio B: expected return / standard deviation", `${b1[0]}% / ${b1[1]}%`],
          ["Threshold return", `${rl}%`], ["Distribution of returns", "Normal"], zRow([sB, sA])],
        a, "%", 2,
        [`SFRatio A = (${F(a1[0])} − ${F(rl)}) / ${F(a1[1])} = ${F(sA, 2)} ⇒ N(−${F(sA, 2)}) = ${P(normCdf(-sA), 2)}.`,
          `SFRatio B = (${F(b1[0])} − ${F(rl)}) / ${F(b1[1])} = ${F(sB, 2)} ⇒ N(−${F(sB, 2)}) = ${P(normCdf(-sB), 2)}.`,
          `Écart = ${Pa(a)} : le meilleur rendement attendu de B ne compense pas son risque.`]);
    })(),
    (() => {
      const er = 11, sd = 8, rf = 2, rl = 5;
      const ratio = sfr(er, rl, sd);
      const a = normCdf(-ratio) * 100;
      return q("qm-sf-d5", "difficile", "Probability that the portfolio return falls below the minimum acceptable return?",
        [["Expected return / standard deviation", `${er}% / ${sd}%`], ["Risk-free rate", `${rf}%`], ["Minimum acceptable return", `${rl}%`], ["Distribution of returns", "Normal"],
          zRow([ratio, sfr(er, rf, sd)])],
        a, "%", 2,
        [`Piège : (${F(er)} − ${F(rf)}) / ${F(sd)} = ${F(sfr(er, rf, sd), 3)} est le ratio de Sharpe, pas le SFRatio.`,
          `SFRatio = (${F(er)} − ${F(rl)}) / ${F(sd)} = ${F(ratio, 2)}.`,
          `P(R < ${F(rl)} %) = N(−${F(ratio, 2)}) = ${Pa(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 12 · Tests d'hypothèse ────────────────────────── */

const HYPOTHESIS: CalcType = {
  key: "hypothesis-tests",
  topic: "quant",
  name: "Tests d'hypothèse : statistiques t, z, χ², F et erreur standard",
  tier: "essentiel",
  source: "LM 7 · Estimation and Inference ; LM 8 · Hypothesis Testing",
  formulas: [
    "Erreur standard de la moyenne : σ / √n (ou s / √n si σ est inconnu)",
    "Moyenne : t = (x̄ − μ0) / (s / √n), n − 1 ddl (z si l'échantillon est grand)",
    "Différences appariées : t = (d̄ − μd0) / (sd / √n), n − 1 ddl",
    "Deux moyennes (variances égales) : sp² = [(n1 − 1) s1² + (n2 − 1) s2²] / (n1 + n2 − 2) ; t = (x̄1 − x̄2) / √(sp²/n1 + sp²/n2), n1 + n2 − 2 ddl",
    "Une variance : χ² = (n − 1) s² / σ0² ; deux variances : F = s1² / s2² (la plus grande au numérateur)",
    "Puissance du test = 1 − P(erreur de type II)",
  ],
  traps: [
    "On divise l'écart par l'ERREUR standard s / √n, pas par l'écart-type s.",
    "F et χ² portent sur des variances : élève les écarts-types au carré.",
    "Le niveau de signification α (type I) ne donne pas la puissance : il faut P(type II).",
  ],
  questions: [
    (() => {
      const s = 20, n = 30;
      const a = s / Math.sqrt(n);
      return q("qm-ht-f1", "facile", "Standard error of the sample mean?",
        [["Standard deviation of monthly returns", `${s}%`], ["Sample size", `${n} monthly returns`]],
        a, "%", 2,
        ["Erreur standard = s / √n.", `= ${F(s)} / √${n} = ${F(s)} / ${F(Math.sqrt(n), 4)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const mu0 = 54000, xbar = 57000, s = 1300, n = 75;
      const se = s / Math.sqrt(n);
      const a = (xbar - mu0) / se;
      return q("qm-ht-f2", "facile", "Test statistic for H0: mean starting salary ≤ $54,000?",
        [["Sample size", E(n)], ["Sample mean salary", usd(xbar)], ["Sample standard deviation", usd(s)]],
        a, "", 2,
        [`Erreur standard = ${F(s)} / √${n} = ${F(se, 2)}.`, `t = (${F(xbar)} − ${F(mu0)}) / ${F(se, 2)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const alpha = 0.05, beta = 0.15;
      const a = (1 - beta) * 100;
      return q("qm-ht-f3", "facile", "Power of the test?",
        [["Significance level", pc(alpha)], ["Probability of a Type II error", pc(beta)]],
        a, "%", 2,
        ["Puissance = 1 − P(type II) ; le niveau de signification ne sert pas.", `Puissance = 1 − ${F(beta)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const s1 = 4.3, n1 = 31, s2 = 3.8, n2 = 41;
      const a = sq(s1) / sq(s2);
      return q("qm-ht-f4", "facile", "F-statistic for the test of equal variances?",
        [["Textile firms: sample size / standard deviation of earnings", lst([E(n1), usd(s1, 2)])], ["Paper firms: sample size / standard deviation of earnings", lst([E(n2), usd(s2, 2)])]],
        a, "", 2,
        ["F = plus grande variance / plus petite variance.", `F = ${F(s1, 2)}² / ${F(s2, 2)}² = ${F(sq(s1), 2)} / ${F(sq(s2), 2)} = ${F(a, 2)} (ddl : ${n1 - 1} et ${n2 - 1}).`]);
    })(),
    (() => {
      const n = 24, s = 3.8, sigma0 = 4;
      const a = ((n - 1) * sq(s)) / sq(sigma0);
      return q("qm-ht-f5", "facile", "Chi-square statistic for H0: σ = 4%?",
        [["Sample size", `${n} monthly returns`], ["Sample standard deviation", `${E(s)}%`], ["Hypothesized standard deviation", `${sigma0}%`]],
        a, "", 2,
        ["χ² = (n − 1) s² / σ0².", `χ² = ${n - 1} × ${F(s)}² / ${F(sigma0)}² = ${n - 1} × ${F(sq(s), 2)} / ${F(sq(sigma0))} = ${F(a, 2)} (${n - 1} ddl).`]);
    })(),
    (() => {
      const xbar = 0.1, s = 0.25, n = 250;
      const se = s / Math.sqrt(n);
      const a = xbar / se;
      return q("qm-ht-m1", "moyen", "Test statistic for H0: mean daily return = 0?",
        [["Sample size", `${n} trading days`], ["Mean daily return", `${E(xbar)}%`], ["Sample standard deviation of daily returns", `${E(s)}%`]],
        a, "", 2,
        [`Grand échantillon : z ≈ t. Erreur standard = ${F(s)} / √${n} = ${F(se, 5)} %.`,
          `z = (${F(xbar)} − 0) / ${F(se, 5)} = ${F(a, 2)} > 1,96 : on rejette H0 à 5 %.`]);
    })(),
    (() => {
      const dbar = 0.45, sd = 1.2, n = 36;
      const a = dbar / (sd / Math.sqrt(n));
      return q("qm-ht-m2", "moyen", "Paired comparisons t-statistic (H0: mean difference = 0)?",
        [["Number of paired monthly observations", E(n)], ["Mean of the differences in returns", `${E(dbar)}%`], ["Standard deviation of the differences", `${E(sd)}%`]],
        a, "", 2,
        [`Erreur standard des différences = ${F(sd)} / √${n} = ${F(sd / Math.sqrt(n), 2)}.`, `t = ${F(dbar)} / ${F(sd / Math.sqrt(n), 2)} = ${F(a, 2)} (${n - 1} ddl).`]);
    })(),
    (() => {
      const mu0 = 50, sigma = 12, n = 64, z = 1.645;
      const se = sigma / Math.sqrt(n);
      const a = mu0 + z * se;
      return q("qm-ht-m3", "moyen", "Smallest sample mean that leads to rejecting H0: μ ≤ 50?",
        [["Known population standard deviation", E(sigma)], ["Sample size", E(n)], ["One-tailed critical z-value (5%)", E(z, 3)]],
        a, "", 2,
        [`Erreur standard = ${F(sigma)} / √${n} = ${F(se, 2)}.`, `On rejette si x̄ > ${F(mu0)} + ${F(z, 3)} × ${F(se, 2)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const mu0 = 59000, xbar = 64000, s = 5500, n = 135;
      const se = s / Math.sqrt(n);
      const a = (xbar - mu0) / se;
      return q("qm-ht-m4", "moyen", "Test statistic for H0: mean starting salary ≤ $59,000?",
        [["Sample size", E(n)], ["Sample mean salary", usd(xbar)], ["Sample standard deviation", usd(s)]],
        a, "", 2,
        [`Erreur standard = ${F(s)} / √${n} = ${F(s)} / ${F(Math.sqrt(n), 4)} = ${F(se, 2)}.`, `t = (${F(xbar)} − ${F(mu0)}) / ${F(se, 2)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const sA = 2.8, nA = 25, sB = 3.9, nB = 31;
      const a = sq(sB) / sq(sA);
      return q("qm-ht-m5", "moyen", "F-statistic for the test of equal variances?",
        [["Fund A: monthly returns / standard deviation", lst([E(nA), `${E(sA)}%`])], ["Fund B: monthly returns / standard deviation", lst([E(nB), `${E(sB)}%`])]],
        a, "", 2,
        ["La plus grande variance va au numérateur : celle de B ici.",
          `F = ${F(sB)}² / ${F(sA)}² = ${F(sq(sB), 2)} / ${F(sq(sA), 2)} = ${F(a, 2)}, avec ${nB - 1} et ${nA - 1} ddl.`]);
    })(),
    (() => {
      const s = 20, targetSe = 1.4;
      const raw = sq(s / targetSe);
      const a = Math.ceil(raw);
      return q("qm-ht-d1", "difficile", "Minimum sample size for a standard error of the mean of at most 1.4%?",
        [["Standard deviation of monthly returns", `${s}%`], ["Maximum acceptable standard error", `${E(targetSe)}%`]],
        a, "", 0,
        [`${F(s)} / √n ≤ ${F(targetSe)} ⇔ √n ≥ ${F(s / targetSe, 4)} ⇔ n ≥ ${F(raw, 2)}.`,
          `n doit être entier : n = ${F(a, 0)} observations au minimum.`]);
    })(),
    (() => {
      const ra = [2.5, 1.0, 3.2, 1.8, 0.9], rb = [1.0, 1.5, 1.2, 0.8, 0.4];
      const d = ra.map((x, i) => x - rb[i]);
      const se = sampleSd(d) / Math.sqrt(d.length);
      const a = mean(d) / se;
      return q("qm-ht-d2", "difficile", "Paired comparisons t-statistic (H0: mean difference = 0)?",
        [["Firm A returns, months 1 to 5", pcs(ra)], ["Firm B returns, months 1 to 5", pcs(rb)], ["Note", "Both firms are exposed to the same market"]],
        a, "", 2,
        [`Échantillons dépendants : on teste les différences A − B = ${Fl(d)}.`,
          `d̄ = ${F(mean(d), 2)} ; sd = √(${F(ssd(d), 2)} / 4) = ${F(sampleSd(d), 4)} ; erreur standard = ${F(sampleSd(d), 4)} / √5 = ${F(se, 4)}.`,
          `t = ${F(mean(d), 2)} / ${F(se, 4)} = ${F(a, 2)} (4 ddl).`]);
    })(),
    (() => {
      const n = 30, s2 = 52, sigma0 = 6;
      const a = ((n - 1) * s2) / sq(sigma0);
      return q("qm-ht-d3", "difficile", "Chi-square statistic for H0: σ ≤ 6%?",
        [["Sample size", `${n} monthly returns`], ["Sample variance (%²)", E(s2)], ["Hypothesized standard deviation", `${sigma0}%`]],
        a, "", 2,
        [`Attention aux unités : la variance de l'échantillon est déjà en %², σ0² = ${F(sigma0)}² = ${F(sq(sigma0))} (%²).`,
          `χ² = (${n} − 1) × ${F(s2)} / ${F(sq(sigma0))} = ${F(a, 2)} (${n - 1} ddl).`]);
    })(),
    (() => {
      const n1 = 25, x1 = 1.8, s1 = 1.2, n2 = 30, x2 = 1.1, s2 = 1.0;
      const sp2 = ((n1 - 1) * sq(s1) + (n2 - 1) * sq(s2)) / (n1 + n2 - 2);
      const se = Math.sqrt(sp2 / n1 + sp2 / n2);
      const a = (x1 - x2) / se;
      return q("qm-ht-d4", "difficile", "t-statistic for the difference in means (equal variances assumed)?",
        [["Sample 1: size / mean / standard deviation", lst([E(n1), `${E(x1)}%`, `${E(s1)}%`])], ["Sample 2: size / mean / standard deviation", lst([E(n2), `${E(x2)}%`, `${E(s2)}%`])],
          ["Samples", "Independent, normal populations"]],
        a, "", 2,
        [`Variance commune sp² = (${n1 - 1} × ${F(sq(s1), 2)} + ${n2 - 1} × ${F(sq(s2))}) / ${n1 + n2 - 2} = ${F(sp2, 4)}.`,
          `Erreur standard = √(${F(sp2, 4)} / ${n1} + ${F(sp2, 4)} / ${n2}) = ${F(se, 4)}.`,
          `t = (${F(x1)} − ${F(x2)}) / ${F(se, 4)} = ${F(a, 2)} (${n1 + n2 - 2} ddl).`]);
    })(),
    (() => {
      const s = 4, n = 25, t2 = 2.064, t1 = 1.711;
      const se = s / Math.sqrt(n);
      const a = t2 * se;
      return q("qm-ht-d5", "difficile", "Smallest positive sample mean return that rejects H0: μ = 0 at 5% (two-tailed)?",
        [["Sample size", `${n} annual returns`], ["Sample standard deviation", `${s}%`], ["Critical t (24 df): 5% two-tailed / 5% one-tailed", lst([E(t2, 3), E(t1, 3)])]],
        a, "%", 2,
        ["Test bilatéral : on prend 2,064 (2,5 % dans chaque queue), pas la valeur unilatérale 1,711.",
          `Erreur standard = ${F(s)} / √${n} = ${F(se, 2)} %.`,
          `On rejette si x̄ > ${F(t2, 3)} × ${F(se, 2)} = ${Pa(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 13 · Tests d'indépendance ────────────────────────── */

const INDEPENDENCE: CalcType = {
  key: "independence-tests",
  topic: "quant",
  name: "Tests d'indépendance : corrélation, Spearman, tableau de contingence",
  tier: "annexe",
  source: "LM 9 · Parametric and Non-Parametric Tests of Independence",
  formulas: [
    "Test de corrélation : t = r √(n − 2) / √(1 − r²), n − 2 ddl",
    "Spearman : rs = 1 − 6 Σd² / [n (n² − 1)] (d = écart de rangs)",
    "Contingence : Eij = (total de la ligne i × total de la colonne j) / total général",
    "χ² = Σ (Oij − Eij)² / Eij, avec (r − 1)(c − 1) ddl",
  ],
  traps: [
    "Le t de corrélation croît avec |r| ET avec la taille de l'échantillon.",
    "Rangs ex aequo : chacun reçoit la moyenne des rangs occupés (2 et 3 → 2,5).",
    "χ² : on divise par l'effectif ATTENDU, pas par l'observé.",
  ],
  questions: [
    (() => {
      const r = 0.35, n = 42;
      const a = tCorr(r, n);
      return q("qm-ind-f1", "facile", "Test statistic for H0: population correlation = 0?",
        [["Sample correlation", E(r)], ["Sample size", E(n)]],
        a, "", 2,
        ["t = r √(n − 2) / √(1 − r²).", `t = ${F(r)} × √${n - 2} / √(1 − ${F(sq(r), 4)}) = ${F(r * Math.sqrt(n - 2), 4)} / ${F(Math.sqrt(1 - r * r), 4)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const d2 = 40, n = 10;
      const a = 1 - (6 * d2) / (n * (n * n - 1));
      return q("qm-ind-f2", "facile", "Spearman rank correlation?",
        [["Number of funds ranked", E(n)], ["Sum of squared rank differences (Σd²)", E(d2)]],
        a, "", 3,
        ["rs = 1 − 6 Σd² / [n (n² − 1)].", `rs = 1 − 6 × ${F(d2)} / (${n} × ${n * n - 1}) = 1 − ${F(6 * d2)} / ${F(n * (n * n - 1))} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const row = 90, col = 60, tot = 300;
      const a = (row * col) / tot;
      return q("qm-ind-f3", "facile", "Expected frequency of the cell if the two characteristics are independent?",
        [["Row total (low earnings growth)", E(row)], ["Column total (high dividend yield)", E(col)], ["Total number of firms", E(tot)]],
        a, "", 1,
        ["Eij = total ligne × total colonne / total général.", `E = ${F(row)} × ${F(col)} / ${F(tot)} = ${F(a, 1)}.`]);
    })(),
    (() => {
      const r = -0.525, n = 19;
      const a = tCorr(r, n);
      return q("qm-ind-f4", "facile", "Test statistic for H0: population correlation = 0?",
        [["Sample correlation", E(r)], ["Sample size", E(n)]],
        a, "", 2,
        [`t = ${F(r)} × √${n - 2} / √(1 − ${F(sq(r), 6)}).`, `t = ${F(r * Math.sqrt(n - 2), 4)} / ${F(Math.sqrt(1 - r * r), 4)} = ${F(a, 2)} (${n - 2} ddl).`]);
    })(),
    (() => {
      const o = 28, e = 20;
      const a = sq(o - e) / e;
      return q("qm-ind-f5", "facile", "Contribution of this cell to the chi-square statistic?",
        [["Observed frequency", E(o)], ["Expected frequency under independence", E(e)]],
        a, "", 2,
        ["Terme de la cellule = (O − E)² / E.", `= (${F(o)} − ${F(e)})² / ${F(e)} = ${F(sq(o - e))} / ${F(e)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const r1 = [1, 2, 3, 4, 5, 6], r2 = [2, 1, 4, 3, 6, 5];
      const a = spearman(r1, r2);
      return q("qm-ind-m1", "moyen", "Spearman rank correlation between the two periods?",
        [["Ranks of funds A to F, period 1", r1.join(" / ")], ["Ranks of funds A to F, period 2", r2.join(" / ")]],
        a, "", 3,
        [`Écarts de rangs : ${Fl(r1.map((r, i) => r - r2[i]))} → Σd² = ${F(sum(r1.map((r, i) => sq(r - r2[i]))))}.`,
          `rs = 1 − 6 × ${F(sum(r1.map((r, i) => sq(r - r2[i]))))} / (6 × 35) = ${F(a, 3)}.`]);
    })(),
    (() => {
      const r = 0.37, n = 24;
      const a = tCorr(r, n);
      return q("qm-ind-m2", "moyen", "Test statistic for H0: population correlation = 0?",
        [["Sample correlation", E(r)], ["Sample size", `${n} observations`]],
        a, "", 2,
        ["t = r √(n − 2) / √(1 − r²), avec n − 2 ddl.", `t = ${F(r)} × √${n - 2} / √(1 − ${F(sq(r), 4)}) = ${F(a, 2)} (${n - 2} ddl).`]);
    })(),
    (() => {
      const n = 30, tc = 2.048;
      const a = tc / Math.sqrt(n - 2 + tc * tc);
      return q("qm-ind-m3", "moyen", "Smallest positive sample correlation that is significant at 5% (two-tailed)?",
        [["Sample size", E(n)], ["Critical t-value (28 df, 5% two-tailed)", E(tc, 3)]],
        a, "", 3,
        [`On cherche r tel que r √${n - 2} / √(1 − r²) = ${F(tc, 3)}.`,
          `En élevant au carré : r² × ${n - 2} = ${F(tc * tc, 4)} (1 − r²) ⇒ r = ${F(tc, 3)} / √(${n - 2} + ${F(tc * tc, 4)}).`,
          `r = ${F(a, 3)}.`]);
    })(),
    (() => {
      const obs = [[40, 60], [60, 40]];
      const c = contingency(obs);
      const a = c.stat;
      return q("qm-ind-m4", "moyen", "Chi-square statistic for the test of independence?",
        [["Value stocks: outperformed / underperformed", lst(obs[0].map((x) => E(x)))], ["Growth stocks: outperformed / underperformed", lst(obs[1].map((x) => E(x)))]],
        a, "", 2,
        [`Totaux : lignes ${Fl(c.rows)}, colonnes ${Fl(c.cols)}, total ${F(c.total)} ⇒ chaque effectif attendu vaut ${F(c.exp[0][0])}.`,
          `Chaque cellule apporte (${F(obs[0][0])} − ${F(c.exp[0][0])})² / ${F(c.exp[0][0])} = ${F(c.terms[0][0])}.`,
          `χ² = 4 × ${F(c.terms[0][0])} = ${F(a, 2)} (1 ddl).`]);
    })(),
    (() => {
      const o = 25, row = 100, col = 80, tot = 400;
      const e = (row * col) / tot;
      const a = sq(o - e) / e;
      return q("qm-ind-m5", "moyen", "Contribution of this cell to the chi-square statistic?",
        [["Observed frequency in the cell", E(o)], ["Row total / column total", lst([E(row), E(col)])], ["Grand total", E(tot)]],
        a, "", 2,
        [`Effectif attendu = ${F(row)} × ${F(col)} / ${F(tot)} = ${F(e)}.`, `Terme = (${F(o)} − ${F(e)})² / ${F(e)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const obs = [[30, 20, 10], [20, 30, 40]];
      const c = contingency(obs);
      const a = c.stat;
      return q("qm-ind-d1", "difficile", "Chi-square statistic for the test of independence?",
        [["Low dividend yield: small / mid / large caps", lst(obs[0].map((x) => E(x)))], ["High dividend yield: small / mid / large caps", lst(obs[1].map((x) => E(x)))]],
        a, "", 2,
        [`Totaux : lignes ${Fl(c.rows)} ; colonnes ${Fl(c.cols)} ; total ${F(c.total)}.`,
          `Attendus : ligne 1 = ${Fl(c.exp[0], 1)} ; ligne 2 = ${Fl(c.exp[1], 1)}.`,
          `Termes : ${c.terms.map((r) => Fl(r, 3)).join(" ; ")} → χ² = ${F(a, 2)} avec (2 − 1)(3 − 1) = 2 ddl.`]);
    })(),
    (() => {
      const xs = [12, 15, 15, 20, 9], ys = [8, 10, 14, 11, 6];
      const rx = ranksDesc(xs), ry = ranksDesc(ys);
      const a = spearman(rx, ry);
      return q("qm-ind-d2", "difficile", "Spearman rank correlation (rank 1 = highest value)?",
        [["Analysts 1 to 5: forecast EPS growth", pcs(xs)], ["Analysts 1 to 5: actual EPS growth", pcs(ys)]],
        a, "", 3,
        [`Rangs des prévisions : ${Fl(rx)} (les deux 15 % se partagent les rangs 2 et 3) ; rangs des réalisés : ${Fl(ry)}.`,
          `d² : ${Fl(rx.map((r, i) => sq(r - ry[i])))} → Σd² = ${F(sum(rx.map((r, i) => sq(r - ry[i]))))}.`,
          `rs = 1 − 6 × ${F(sum(rx.map((r, i) => sq(r - ry[i]))))} / (5 × 24) = ${F(a, 3)}.`]);
    })(),
    (() => {
      const rs = 0.4, n = 32;
      const a = tCorr(rs, n);
      return q("qm-ind-d3", "difficile", "Test statistic for the significance of the rank correlation?",
        [["Spearman rank correlation", E(rs)], ["Number of observations", E(n)]],
        a, "", 2,
        ["Au-delà de 30 observations, on teste rs comme un coefficient de Pearson, avec un t à n − 2 ddl.",
          `t = ${F(rs)} × √${n - 2} / √(1 − ${F(sq(rs))}) = ${F(rs * Math.sqrt(n - 2), 4)} / ${F(Math.sqrt(1 - rs * rs), 4)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const r = 0.3, tc = 2;
      let n = 3;
      while (tCorr(r, n) <= tc) n += 1;
      const a = n;
      return q("qm-ind-d4", "difficile", "Minimum sample size for this correlation to be significant?",
        [["Sample correlation", E(r)], ["Critical t-value (assume constant)", E(tc, 1)]],
        a, "", 0,
        [`Il faut ${F(r)} √(n − 2) / √(1 − ${F(sq(r))}) > ${F(tc)}, soit √(n − 2) > ${F(tc)} × ${F(Math.sqrt(1 - r * r), 4)} / ${F(r)} = ${F((tc * Math.sqrt(1 - r * r)) / r, 4)}.`,
          `n − 2 > ${F(sq((tc * Math.sqrt(1 - r * r)) / r), 2)} ⇒ n = ${F(a, 0)} (t = ${F(tCorr(r, n), 3)} ; avec ${n - 1}, t = ${F(tCorr(r, n - 1), 3)}).`]);
    })(),
    (() => {
      const obs = [[32, 20, 12], [22, 30, 18], [14, 22, 30]];
      const c = contingency(obs);
      const a = c.stat;
      return q("qm-ind-d5", "difficile", "Chi-square statistic for the test of independence?",
        [["Low earnings growth: low / medium / high dividend yield", lst(obs[0].map((x) => E(x)))],
          ["Medium earnings growth: low / medium / high dividend yield", lst(obs[1].map((x) => E(x)))],
          ["High earnings growth: low / medium / high dividend yield", lst(obs[2].map((x) => E(x)))]],
        a, "", 2,
        [`Totaux : lignes ${Fl(c.rows)} ; colonnes ${Fl(c.cols)} ; total ${F(c.total)}.`,
          `Attendus (ligne × colonne / ${F(c.total)}) : ${c.exp.map((r) => Fl(r, 2)).join(" | ")}.`,
          `Σ (O − E)² / E = ${F(a, 2)} avec (3 − 1)(3 − 1) = 4 ddl.`]);
    })(),
  ],
};

/* ────────────────────────── 14 · Régression : coefficients et prédiction ────────────────────────── */

const REGRESSION: CalcType = {
  key: "regression-coefficients",
  topic: "quant",
  name: "Régression simple : pente, constante, prédiction",
  tier: "essentiel",
  source: "LM 10 · Simple Linear Regression",
  formulas: [
    "b1 = Cov(X, Y) / Var(X) = Σ(X − X̄)(Y − Ȳ) / Σ(X − X̄)² = ρ × σY / σX",
    "b0 = Ȳ − b1 × X̄ ; Ŷ = b0 + b1 × X",
    "t (pente) = (b̂1 − b1 hypothétique) / s(b̂1), n − 2 ddl",
    "Intervalle de prédiction : Ŷ ± tc × sf",
    "Log-lin : ln Y = b0 + b1 X ⇒ Ŷ = e^(b0 + b1 X)",
    "Log-log : ln Y = b0 + b1 ln X ⇒ Ŷ = e^(b0 + b1 ln X), b1 = élasticité ; lin-log : Y = b0 + b1 ln X ⇒ ΔY = b1 × ln(X1 / X0)",
  ],
  traps: [
    "La droite passe toujours par le point moyen (X̄, Ȳ).",
    "Résidu = Y observé − Ŷ (pas l'inverse).",
    "Avec un modèle en logarithme, repasse à l'exponentielle pour la prévision.",
  ],
  questions: [
    (() => {
      const b0 = 2.83, b1 = 1.5, x = 2;
      const a = b0 + b1 * x;
      return q("qm-reg-f1", "facile", "Predicted value of Y?",
        [["Estimated regression", "Y = 2.83 + 1.5X"], ["Value of X", E(x)]],
        a, "", 2,
        ["Ŷ = b0 + b1 × X.", `Ŷ = ${F(b0)} + ${F(b1)} × ${F(x)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const cov = 0.0048, vx = 0.006;
      const a = cov / vx;
      return q("qm-reg-f2", "facile", "Estimated slope coefficient?",
        [["Covariance of X and Y", E(cov)], ["Variance of X", E(vx)]],
        a, "", 2,
        ["b1 = Cov(X, Y) / Var(X).", `b1 = ${F(cov)} / ${F(vx)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const mx = 4, my = 10, b1 = 1.5;
      const a = my - b1 * mx;
      return q("qm-reg-f3", "facile", "Estimated intercept?",
        [["Mean of X", E(mx)], ["Mean of Y", E(my)], ["Estimated slope", E(b1)]],
        a, "", 2,
        ["La droite passe par (X̄, Ȳ) : b0 = Ȳ − b1 X̄.", `b0 = ${F(my)} − ${F(b1)} × ${F(mx)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const b1 = 0.64, se = 0.26;
      const a = b1 / se;
      return q("qm-reg-f4", "facile", "t-statistic for H0: slope = 0?",
        [["Estimated slope coefficient", E(b1)], ["Standard error of the slope", E(se)], ["Number of observations", "36"]],
        a, "", 2,
        ["t = (b̂1 − 0) / s(b̂1).", `t = ${F(b1)} / ${F(se)} = ${F(a, 2)} (34 ddl : significatif à 5 %, valeur critique 2,03).`]);
    })(),
    (() => {
      const b0 = -2.3, b1 = 0.64, x = -7.8, y = 1.1;
      const yhat = b0 + b1 * x;
      const a = y - yhat;
      return q("qm-reg-f5", "facile", "Residual for that month?",
        [["Estimated regression (excess returns, %)", "ABC = −2.3 + 0.64 × S&P 500"], ["S&P 500 excess return that month", `${E(x)}%`], ["Actual ABC excess return that month", `${E(y)}%`]],
        a, "%", 2,
        [`Ŷ = ${F(b0)} + ${F(b1)} × (${F(x)}) = ${F(yhat, 3)} %.`, `Résidu = observé − prévu = ${F(y)} − (${F(yhat, 3)}) = ${Pa(a)}.`]);
    })(),
    (() => {
      const sxy = 25.2, sxx = 18, mx = 3, my = 7, x = 5;
      const b1 = sxy / sxx, b0 = my - b1 * mx;
      const a = b0 + b1 * x;
      return q("qm-reg-m1", "moyen", "Predicted value of Y when X = 5?",
        [["Σ(X − X̄)(Y − Ȳ)", E(sxy)], ["Σ(X − X̄)²", E(sxx)], ["Mean of X / mean of Y", lst([E(mx), E(my)])]],
        a, "", 2,
        [`b1 = ${F(sxy)} / ${F(sxx)} = ${F(b1, 2)} ; b0 = ${F(my)} − ${F(b1, 2)} × ${F(mx)} = ${F(b0, 2)}.`, `Ŷ = ${F(b0, 2)} + ${F(b1, 2)} × ${F(x)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const b0 = 5, b1 = 3.5, x = 10, sf = 2.5, z = 1.65;
      const yhat = b0 + b1 * x;
      const a = yhat + z * sf;
      return q("qm-reg-m2", "moyen", "Upper bound of the 90% prediction interval for Y?",
        [["Estimated regression", "Y = 5 + 3.5X"], ["Forecast value of X", E(x)], ["Standard error of the forecast", E(sf)],
          ["Standard error of the slope", "0.8"], ["Critical value (large sample, 90%)", E(z, 2)]],
        a, "", 2,
        [`Ŷ = ${F(b0)} + ${F(b1)} × ${F(x)} = ${F(yhat)}.`,
          `Borne haute = ${F(yhat)} + ${F(z, 2)} × ${F(sf)} = ${F(a, 3)} (l'erreur standard de la pente ne sert pas).`]);
    })(),
    (() => {
      const b1 = 1.52, se = 0.13, h = 1;
      const a = (b1 - h) / se;
      return q("qm-reg-m3", "moyen", "t-statistic for H0: slope = 1 (mid-caps as risky as the index)?",
        [["Estimated slope (S&P 500 coefficient)", E(b1)], ["Standard error of the slope", E(se)], ["t-value reported by the software", "11.69"]],
        a, "", 2,
        ["Le t du logiciel teste b1 = 0 ; ici l'hypothèse est b1 = 1.", `t = (${F(b1)} − ${F(h)}) / ${F(se)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const rho = 0.6, sy = 20, sx = 15;
      const a = (rho * sy) / sx;
      return q("qm-reg-m4", "moyen", "Slope of the regression of Y on X?",
        [["Correlation of X and Y", E(rho)], ["Standard deviation of Y", `${sy}%`], ["Standard deviation of X", `${sx}%`]],
        a, "", 2,
        ["b1 = Cov / Var(X) = ρ σY σX / σX² = ρ × σY / σX.", `b1 = ${F(rho)} × ${F(sy)} / ${F(sx)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const b0 = 0.2, b1 = 0.08, t = 10;
      const a = Math.exp(b0 + b1 * t);
      return q("qm-reg-m5", "moyen", "Predicted EPS in year 10?",
        [["Estimated log-lin model", "ln(EPS) = 0.2 + 0.08 × t"], ["Time index t", E(t)]],
        a, "$", 2,
        [`ln(EPS) = ${F(b0)} + ${F(b1)} × ${F(t)} = ${F(b0 + b1 * t)}.`, `EPS = e^${F(b0 + b1 * t)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const xs = [2, 4, 6, 8, 10], ys = [3, 7, 8, 12, 15], x = 7;
      const o = ols(xs, ys);
      const a = o.b0 + o.b1 * x;
      return q("qm-reg-d1", "difficile", "Predicted value of Y when X = 7?",
        [["X observations", xs.join(" / ")], ["Y observations", ys.join(" / ")]],
        a, "", 2,
        [`X̄ = ${F(o.mx)} ; Ȳ = ${F(o.my)} ; Σ(X − X̄)(Y − Ȳ) = ${F(o.sxy)} ; Σ(X − X̄)² = ${F(o.sxx)}.`,
          `b1 = ${F(o.sxy)} / ${F(o.sxx)} = ${F(o.b1, 3)} ; b0 = ${F(o.my)} − ${F(o.b1, 3)} × ${F(o.mx)} = ${F(o.b0, 3)}.`,
          `Ŷ = ${F(o.b0, 3)} + ${F(o.b1, 3)} × ${F(x)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const b0 = -2.3, b1 = 0.64, x = 10, sf = 3.67, tc = 2.03;
      const yhat = b0 + b1 * x;
      const a = yhat - tc * sf;
      return q("qm-reg-d2", "difficile", "Lower bound of the 95% prediction interval for ABC's excess return?",
        [["Estimated regression (excess returns, %)", "ABC = −2.3 + 0.64 × S&P 500"], ["Forecast S&P 500 excess return", `${x}%`],
          ["Standard error of the forecast", `${E(sf)}%`], ["Critical t (34 df, 5% two-tailed)", E(tc, 2)]],
        a, "%", 2,
        [`Ŷ = ${F(b0)} + ${F(b1)} × ${F(x)} = ${F(yhat, 2)} %.`,
          `Demi-largeur = ${F(tc, 2)} × ${F(sf)} = ${F(tc * sf, 4)} %.`,
          `Borne basse = ${F(yhat, 2)} − ${F(tc * sf, 4)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const r = -0.45, sy = 12, sx = 8, mx = 5, my = 20, x = 9;
      const b1 = (r * sy) / sx, b0 = my - b1 * mx;
      const a = b0 + b1 * x;
      return q("qm-reg-d3", "difficile", "Predicted value of Y when X = 9?",
        [["Correlation of X and Y", E(r)], ["Standard deviation of Y / of X", lst([E(sy), E(sx)])], ["Mean of X / mean of Y", lst([E(mx), E(my)])]],
        a, "", 2,
        [`b1 = ρ × σY / σX = ${F(r)} × ${F(sy)} / ${F(sx)} = ${F(b1, 3)}.`,
          `b0 = Ȳ − b1 X̄ = ${F(my)} − (${F(b1, 3)}) × ${F(mx)} = ${F(b0, 3)}.`,
          `Ŷ = ${F(b0, 3)} + (${F(b1, 3)}) × ${F(x)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const b0 = 1.2, b1 = 0.75, adv = 20;
      const lnY = b0 + b1 * Math.log(adv);
      const a = Math.exp(lnY);
      return q("qm-reg-d4", "difficile", "Predicted sales ($ millions) for advertising of $20 million?",
        [["Estimated log-log model", "ln(Sales) = 1.2 + 0.75 × ln(Advertising)"], ["Advertising ($ millions)", E(adv)]],
        a, "", 2,
        [`ln(Ventes) = ${F(b0)} + ${F(b1)} × ln(${F(adv)}) = ${F(b0)} + ${F(b1)} × ${F(Math.log(adv), 4)} = ${F(lnY, 4)}.`,
          `Ventes = e^${F(lnY, 4)} = ${F(a, 2)} M$ (la pente 0,75 est une élasticité).`]);
    })(),
    (() => {
      const b1 = 2.5, x0 = 10, x1 = 20;
      const a = b1 * (Math.log(x1) - Math.log(x0));
      return q("qm-reg-d5", "difficile", "Change in predicted Y when X rises from 10 to 20?",
        [["Estimated lin-log model", "Y = 4 + 2.5 × ln(X)"], ["X: before / after", lst([E(x0), E(x1)])]],
        a, "", 2,
        ["Lin-log : la constante disparaît dans la variation ; ΔY = b1 × [ln(X1) − ln(X0)] = b1 × ln(X1 / X0).",
          `ΔY = ${F(b1)} × ln(${F(x1)} / ${F(x0)}) = ${F(b1)} × ${F(Math.log(x1 / x0), 4)} = ${F(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 15 · Régression : ANOVA ────────────────────────── */

const ANOVA: CalcType = {
  key: "regression-anova",
  topic: "quant",
  name: "Régression : ANOVA, R², SEE et statistique F",
  tier: "essentiel",
  source: "LM 10 · Simple Linear Regression",
  formulas: [
    "SST = SSR + SSE (totale = expliquée + inexpliquée)",
    "R² = SSR / SST = r² en régression simple",
    "MSR = SSR / 1 ; MSE = SSE / (n − 2)",
    "F = MSR / MSE (1 et n − 2 ddl) ; en régression simple, F = t² de la pente",
    "SEE = √MSE",
  ],
  traps: [
    "SSE est la variation NON expliquée ; SSR la variation expliquée.",
    "Le signe de r est celui de la pente : r = ±√R².",
    "Le ddl total vaut n − 1 : ne le confonds pas avec n.",
  ],
  questions: [
    (() => {
      const ssr = 556, sse = 679;
      const a = ssr / (ssr + sse);
      return q("qm-anova-f1", "facile", "R² of the regression?",
        [["Regression sum of squares (SSR)", E(ssr)], ["Error sum of squares (SSE)", E(sse)], ["Total sum of squares (SST)", E(ssr + sse)]],
        a, "", 3,
        ["R² = SSR / SST.", `R² = ${F(ssr)} / ${F(ssr + sse)} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const ssr = 550, sse = 750, n = 40;
      const mse = sse / (n - 2);
      const a = ssr / mse;
      return q("qm-anova-f2", "facile", "F-statistic for the test of the fit of the model?",
        [["SSR (df = 1)", E(ssr)], ["SSE (df = 38)", E(sse)], ["Number of observations", E(n)]],
        a, "", 2,
        [`MSR = ${F(ssr)} / 1 ; MSE = ${F(sse)} / ${n - 2} = ${F(mse, 3)}.`, `F = ${F(ssr)} / ${F(mse, 3)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const sse = 679, n = 52;
      const a = Math.sqrt(sse / (n - 2));
      return q("qm-anova-f3", "facile", "Standard error of estimate (SEE)?",
        [["Error sum of squares (SSE)", E(sse)], ["Number of observations", E(n)]],
        a, "", 3,
        [`MSE = SSE / (n − 2) = ${F(sse)} / ${n - 2} = ${F(sse / (n - 2), 2)}.`, `SEE = √${F(sse / (n - 2), 2)} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const r2 = 0.599;
      const a = Math.sqrt(r2);
      return q("qm-anova-f4", "facile", "Correlation between mid-cap and S&P 500 returns?",
        [["Coefficient of determination (R²)", E(r2)], ["Estimated slope", "+1.52"]],
        a, "", 3,
        ["Régression simple : r = ±√R², du signe de la pente (ici positive).", `r = √${F(r2)} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const t = 2.46;
      const a = t * t;
      return q("qm-anova-f5", "facile", "F-statistic of the regression?",
        [["t-statistic of the slope coefficient", E(t)], ["Number of independent variables", "1"]],
        a, "", 2,
        ["Avec une seule variable explicative, F = t².", `F = ${F(t)}² = ${F(a, 2)}.`]);
    })(),
    (() => {
      const sst = 0.0151, sse = 0.0122, n = 36;
      const a = (sst - sse) / sst;
      return q("qm-anova-m1", "moyen", "R² of the regression?",
        [["Total sum of squares (SST)", E(sst)], ["Sum of squared errors (SSE)", E(sse)], ["Number of observations", E(n)]],
        a, "", 3,
        [`SSR = SST − SSE = ${F(sst)} − ${F(sse)} = ${F(sst - sse)}.`, `R² = ${F(sst - sse)} / ${F(sst)} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const sst = 2000, r2 = 0.64, n = 27;
      const sse = sst * (1 - r2);
      const a = Math.sqrt(sse / (n - 2));
      return q("qm-anova-m2", "moyen", "Standard error of estimate?",
        [["Total sum of squares (SST)", E(sst)], ["R²", E(r2)], ["Number of observations", E(n)]],
        a, "", 2,
        [`SSE = (1 − R²) × SST = ${F(1 - r2)} × ${F(sst)} = ${F(sse)}.`, `MSE = ${F(sse)} / ${n - 2} = ${F(sse / (n - 2), 2)} ; SEE = √${F(sse / (n - 2), 2)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const r2 = 0.25, n = 50;
      const a = r2 / ((1 - r2) / (n - 2));
      return q("qm-anova-m3", "moyen", "F-statistic of the regression?",
        [["R²", E(r2)], ["Number of observations", E(n)]],
        a, "", 2,
        ["F = (SSR / 1) / (SSE / (n − 2)) = R² / [(1 − R²) / (n − 2)] (on divise SSR et SSE par SST).",
          `F = ${F(r2)} / (${F(1 - r2)} / ${n - 2}) = ${F(r2)} / ${F((1 - r2) / (n - 2), 5)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const see = 3.2, n = 32, r2 = 0.55;
      const sse = sq(see) * (n - 2);
      const sst = sse / (1 - r2);
      const a = sst - sse;
      return q("qm-anova-m4", "moyen", "Regression sum of squares (SSR)?",
        [["Standard error of estimate (SEE)", E(see)], ["Number of observations", E(n)], ["R²", E(r2)]],
        a, "", 2,
        [`SSE = SEE² × (n − 2) = ${F(see)}² × ${n - 2} = ${F(sse, 2)}.`,
          `SST = SSE / (1 − R²) = ${F(sse, 2)} / ${F(1 - r2)} = ${F(sst, 2)}.`,
          `SSR = ${F(sst, 2)} − ${F(sse, 2)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const ssr = 300, sst = 750, b1 = -1.2;
      const a = -Math.sqrt(ssr / sst);
      return q("qm-anova-m5", "moyen", "Correlation between X and Y?",
        [["SSR", E(ssr)], ["SST", E(sst)], ["Estimated slope", E(b1)]],
        a, "", 3,
        [`R² = ${F(ssr)} / ${F(sst)} = ${F(ssr / sst)}.`, `Pente négative : r = −√${F(ssr / sst)} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const xs = [2, 4, 6, 8, 10], ys = [3, 7, 8, 12, 15];
      const o = ols(xs, ys);
      const a = Math.sqrt(o.sse / (xs.length - 2));
      return q("qm-anova-d1", "difficile", "Standard error of estimate of the regression of Y on X?",
        [["X observations", xs.join(" / ")], ["Y observations", ys.join(" / ")]],
        a, "", 3,
        [`b1 = Σ(X − X̄)(Y − Ȳ) / Σ(X − X̄)² = ${F(o.sxy)} / ${F(o.sxx)} = ${F(o.b1, 3)}.`,
          `SST = Σ(Y − Ȳ)² = ${F(o.sst)} ; SSR = b1² × Σ(X − X̄)² = ${F(o.ssr, 2)} ; SSE = ${F(o.sse, 2)}.`,
          `SEE = √(${F(o.sse, 2)} / (5 − 2)) = ${F(a, 3)}.`]);
    })(),
    (() => {
      const ssr = 556, sse = 679, dfTot = 51;
      const n = dfTot + 1;
      const a = ssr / (sse / (n - 2));
      return q("qm-anova-d2", "difficile", "F-statistic of the regression?",
        [["Regression sum of squares", E(ssr)], ["Error sum of squares", E(sse)], ["Total degrees of freedom", E(dfTot)]],
        a, "", 2,
        [`ddl total = n − 1 = ${dfTot} ⇒ n = ${n} ; ddl des erreurs = n − 2 = ${n - 2}.`,
          `MSE = ${F(sse)} / ${n - 2} = ${F(sse / (n - 2), 2)}.`,
          `F = ${F(ssr)} / ${F(sse / (n - 2), 2)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const mse = 2.5, n = 42, f = 18;
      const sse = mse * (n - 2), ssr = f * mse;
      const a = ssr / (ssr + sse);
      return q("qm-anova-d3", "difficile", "R² of the regression?",
        [["Mean squared error (MSE)", E(mse)], ["Number of observations", E(n)], ["F-statistic", E(f)]],
        a, "", 3,
        [`SSE = MSE × (n − 2) = ${F(mse)} × ${n - 2} = ${F(sse)}.`,
          `F = MSR / MSE ⇒ MSR = SSR = ${F(f)} × ${F(mse)} = ${F(ssr)}.`,
          `R² = ${F(ssr)} / (${F(ssr)} + ${F(sse)}) = ${F(a, 3)}.`]);
    })(),
    (() => {
      const r2 = 0.36, n = 27;
      const r = -Math.sqrt(r2);
      const a = tCorr(r, n);
      return q("qm-anova-d4", "difficile", "t-statistic of the slope coefficient?",
        [["R²", E(r2)], ["Number of observations", E(n)], ["Sign of the estimated slope", "Negative"]],
        a, "", 2,
        [`r = −√${F(r2)} = ${F(r)} (signe de la pente).`,
          `En régression simple, t de la pente = t de la corrélation = r √(n − 2) / √(1 − r²).`,
          `t = ${F(r)} × √${n - 2} / √${F(1 - r2)} = ${F(r * Math.sqrt(n - 2), 2)} / ${F(Math.sqrt(1 - r2), 2)} = ${F(a, 2)} (F = t² = ${F(a * a, 4)}).`]);
    })(),
    (() => {
      const sy = 10, n = 22, r2 = 0.4;
      const sst = (n - 1) * sq(sy);
      const sse = sst * (1 - r2);
      const a = Math.sqrt(sse / (n - 2));
      return q("qm-anova-d5", "difficile", "Standard error of estimate?",
        [["Sample standard deviation of Y", E(sy)], ["Number of observations", E(n)], ["R²", E(r2)]],
        a, "", 2,
        [`SST = (n − 1) × s²Y = ${n - 1} × ${F(sq(sy))} = ${F(sst)}.`,
          `SSE = (1 − R²) × SST = ${F(1 - r2)} × ${F(sst)} = ${F(sse)} ; MSE = ${F(sse)} / ${n - 2} = ${F(sse / (n - 2), 2)}.`,
          `SEE = √${F(sse / (n - 2), 2)} = ${F(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── Catalogue ────────────────────────── */

export const QUANT_CALC: CalcCatalog = {
  topic: "quant",
  types: [
    MEANS,
    MWR_TWR,
    ANNUALIZED,
    TVM,
    ANNUITIES,
    CASH_FLOWS,
    NO_ARBITRAGE,
    DISPERSION,
    EXPECTED,
    BAYES,
    SAFETY_FIRST,
    HYPOTHESIS,
    INDEPENDENCE,
    REGRESSION,
    ANOVA,
  ],
};
