// Exercices de calcul pur : Fixed Income (CFA Level I).
//
// Contenu seulement : le moteur et les pages vivent ailleurs (lib/calc/engine.ts, app/calculs).
// Règle d'or : chaque réponse est CALCULÉE ici, à partir des mêmes nombres que les données
// affichées, par les petites fonctions financières du haut de fichier. Aucune réponse tapée à la main.
// Formules vérifiées dans Schweser Level I, Book 3 (Readings 47 à 65 = LM 1 à 19 du curriculum
// Fixed Income : prix et rendements R52-R53, taux variables et marché monétaire R54, courbe des
// taux R55, risque de taux R56-R59, crédit R60, repo R50) et recoupées avec la banque officielle
// de practice exams.
//
// Conventions : énoncés et données en anglais d'examen ; solutions en français, nombres au format
// français. Pour une réponse en %, `answer` vaut déjà le pourcentage (8,5 % → 8.5). Les prix sont
// exprimés pour 100 de nominal (unité vide) sauf mention d'un montant en dollars. Les YTM d'une
// obligation semestrielle sont sur une base semestrielle (semiannual bond basis), comme à l'examen.

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

/** Nombre au format français (solutions). Sans `d` : jusqu'à 4 décimales, zéros inutiles retirés ;
 *  à partir de 5 décimales demandées, les zéros finaux sont aussi retirés (facteurs, taux périodiques). */
const F = (x: number, d?: number): string => {
  const s = numStr(x, d, ",", NBSP);
  return d !== undefined && d >= 5 && s.indexOf(",") >= 0 ? s.replace(/0+$/, "").replace(/,$/, "") : s;
};
/** Montant en dollars, format français : « 1 234,50 $ ». */
const D = (x: number, d?: number): string => `${F(x, d ?? (isInt(x) ? 0 : 2))} $`;
/** Pourcentage à partir d'une fraction (0,085 → « 8,5% »). */
const P = (frac: number, d?: number): string => `${F(frac * 100, d)}%`;
/** Pourcentage déjà exprimé en % (réponses). */
const Pa = (pct: number, d = 2): string => `${F(pct, d)}%`;
/** Points de base (solutions). */
const Bp = (x: number, d?: number): string => `${F(x, d)} bp`;
/** Exposant affiché : 1 → rien, 2 → ², 3 → ³, sinon ^n. */
const ex = (t: number): string => (t === 1 ? "" : t === 2 ? "²" : t === 3 ? "³" : `^${F(t)}`);
/** Carré affiché sans ambiguïté de signe : 0,005² ou (−0,005)². */
/** Nombre négatif entre parenthèses (produits lisibles). */
const Fs = (x: number): string => (x < 0 ? `(${F(x)})` : F(x));
const sqd = (x: number): string => (x < 0 ? `(${F(x)})²` : `${F(x)}²`);
/** Facteur d'actualisation affiché : (1 + r)^t → « 1,035³ ». */
const pw = (r: number, t: number): string => `${F(1 + r, 6)}${ex(t)}`;

/** Formats anglais (données d'énoncé). */
const E = (x: number, d?: number): string => numStr(x, d, ".", ",");
const usd = (x: number, d?: number): string => `${x < 0 ? MINUS : ""}$${E(Math.abs(x), d ?? (isInt(x) ? 0 : 2))}`;
const pc = (frac: number, d?: number): string => `${E(frac * 100, d)}%`;
const bps = (x: number): string => `${E(x)} bp`;
const yrs = (x: number): string => `${E(x)} years`;
const lst = (xs: string[]): string => xs.join(" / ");

/** Lignes de calculatrice financière (BA II Plus), en écriture française. */
const calcPV = (n: number, iyPct: number, pmt: number, fv: number, pv: number, d = 3): string =>
  `N = ${F(n)} ; I/Y = ${F(iyPct)} ; PMT = ${F(pmt)} ; FV = ${F(fv)} ; CPT PV = ${F(-pv, d)}`;
const calcIY = (n: number, pv: number, pmt: number, fv: number, iyPct: number): string =>
  `N = ${F(n)} ; PV = ${F(-pv)} ; PMT = ${F(pmt)} ; FV = ${F(fv)} ; CPT I/Y = ${F(iyPct, 4)}`;

type Row = [string, string];

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
  return out;
}

/* ────────────────────────── Dates et décomptes de jours ────────────────────────── */

type Ymd = [number, number, number];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const dEN = (d: Ymd): string => `${MONTHS_EN[d[1] - 1]} ${d[2]}, ${d[0]}`;
const dFR = (d: Ymd): string => `${d[2] === 1 ? "1er" : d[2]} ${MOIS[d[1] - 1]} ${d[0]}`;
/** Jours réels entre deux dates (actual). */
const actDays = (a: Ymd, b: Ymd): number =>
  Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86400000);
/** Jours en 30/360 (mois de 30 jours). */
function days360(a: Ymd, b: Ymd): number {
  let d1 = a[2];
  let d2 = b[2];
  if (d1 === 31) d1 = 30;
  if (d2 === 31 && d1 === 30) d2 = 30;
  return 360 * (b[0] - a[0]) + 30 * (b[1] - a[1]) + (d2 - d1);
}

/* ────────────────────────── Fonctions financières ────────────────────────── */

const sum = (xs: number[]): number => xs.reduce((s, x) => s + x, 0);
const rd = (x: number, d: number): number => Math.round(x * Math.pow(10, d)) / Math.pow(10, d);
/** Valeur actuelle de flux reçus en t = 1..n, au taux périodique r. */
const pvFlows = (cfs: number[], r: number): number => cfs.reduce((s, cf, i) => s + cf / Math.pow(1 + r, i + 1), 0);
/** Flux d'une obligation à coupon fixe : n coupons c, remboursement fv avec le dernier. */
const bondFlows = (c: number, n: number, fv = 100): number[] =>
  Array.from({ length: n }, (_, i) => c + (i === n - 1 ? fv : 0));
/** Prix au taux périodique r : n coupons c par période, remboursement fv. */
const pvBond = (c: number, r: number, n: number, fv = 100): number => pvFlows(bondFlows(c, n, fv), r);
/** Prix d'une obligation : taux de coupon annuel, YTM annuel (base m), années, périodicité, nominal. */
const price = (cpn: number, y: number, years: number, m = 1, par = 100): number =>
  pvBond((cpn * par) / m, y / m, Math.round(years * m), par);
/** Taux périodique qui égalise valeur actuelle des flux (t = 1..n) et prix (dichotomie). */
function rateOf(pv: number, cfs: number[]): number {
  let lo = -0.5;
  let hi = 1;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (pvFlows(cfs, mid) > pv) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
/** YTM (base m) d'une obligation à coupon fixe ; `redemption` sert au yield to call / to put. */
const ytmOf = (p: number, cpn: number, years: number, m = 1, par = 100, redemption = par): number =>
  m * rateOf(p, bondFlows((cpn * par) / m, Math.round(years * m), redemption));
/** Duration de Macaulay (en périodes) et convexité analytique (en périodes²) de flux t = 1..n. */
function durStats(cfs: number[], r: number) {
  const pvs = cfs.map((cf, i) => cf / Math.pow(1 + r, i + 1));
  const p = sum(pvs);
  const w = pvs.map((x) => x / p);
  const mac = sum(w.map((wi, i) => wi * (i + 1)));
  const conv = sum(w.map((wi, i) => (wi * (i + 1) * (i + 2)) / Math.pow(1 + r, 2)));
  return { pvs, p, w, mac, mod: mac / (1 + r), conv };
}
/** Duration modifiée approchée et convexité approchée (translation de ± dy). */
const approxModDur = (vm: number, vp: number, v0: number, dy: number): number => (vm - vp) / (2 * dy * v0);
const approxCon = (vm: number, vp: number, v0: number, dy: number): number => (vm + vp - 2 * v0) / (dy * dy * v0);
/** Variation relative du prix : −ModDur × Δy + ½ × Convexité × Δy². */
const dPrice = (md: number, con: number, dy: number): number => -md * dy + 0.5 * con * dy * dy;
/** Valeur acquise des coupons réinvestis (n coupons c au taux périodique r). */
const fvCoupons = (c: number, r: number, n: number): number => {
  let s = 0;
  for (let t = 0; t < n; t++) s += c * Math.pow(1 + r, t);
  return s;
};
/** Taux forward implicite entre a et b (années) : [(1 + Sb)^b / (1 + Sa)^a]^(1/(b − a)) − 1. */
const fwd = (sa: number, a: number, sb: number, b: number): number =>
  Math.pow(Math.pow(1 + sb, b) / Math.pow(1 + sa, a), 1 / (b - a)) - 1;
/** Valeur avec des taux spot (S[t − 1] pour le flux t). */
const pvSpot = (cfs: number[], spots: number[]): number => cfs.reduce((s, cf, i) => s + cf / Math.pow(1 + spots[i], i + 1), 0);
/** Interpolation linéaire. */
const interp = (x1: number, y1: number, x2: number, y2: number, x: number): number => y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);

/* ────────────────────────── 1 · Prix d'une obligation ────────────────────────── */

const BOND_PRICE: CalcType = {
  key: "bond-price",
  topic: "fixed_income",
  name: "Prix d'une obligation (bond price)",
  tier: "essentiel",
  top: true,
  source: "LM 6 · Fixed-Income Bond Valuation: Prices and Yields",
  formulas: [
    "Prix = Σ C / (1 + r)^t + 100 / (1 + r)^N, avec r = YTM / m le taux par période",
    "Semestriel : coupon par période = taux de coupon × 100 / 2, r = YTM / 2, N = années × 2",
    "Coupon > YTM → prime (au-dessus du pair) ; coupon < YTM → décote",
    "FRN : coupons au taux MRR + quoted margin, actualisés à MRR + discount margin",
  ],
  traps: [
    "Semestriel : diviser le coupon ET le taux par 2, et doubler le nombre de périodes.",
    "Un zéro-coupon s'actualise aussi sur 2N périodes à YTM / 2 quand le YTM est en base semestrielle.",
    "Pull to par : à YTM inchangé, le prix converge vers 100 ; recalculer avec N réduit.",
  ],
  questions: [
    (() => {
      const cpn = 0.06, y = 0.07, n = 5;
      const a = price(cpn, y, n);
      return q("fi-price-f1", "facile", "Price per 100 of par value?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)]],
        a, "", 3,
        [`Coupon = ${F(cpn * 100)} par an, r = ${P(y)}, N = ${n}.`,
          `Prix = Σ ${F(cpn * 100)} / ${F(1 + y)}^t + 100 / ${pw(y, n)}.`,
          `Calculatrice : ${calcPV(n, y * 100, cpn * 100, 100, a)}.`,
          `Prix = ${F(a, 3)} : coupon < YTM, l'obligation cote sous le pair.`]);
    })(),
    (() => {
      const y = 0.045, n = 10;
      const a = 100 / Math.pow(1 + y / 2, 2 * n);
      return q("fi-price-f2", "facile", "Price per 100 of par value of the zero-coupon bond?",
        [["Coupon", "Zero-coupon"], ["Years to maturity", E(n)], ["Yield to maturity (semiannual bond basis)", pc(y)]],
        a, "", 3,
        [`YTM en base semestrielle : r = ${P(y)} / 2 = ${P(y / 2)} par semestre, N = ${2 * n} semestres.`,
          `Prix = 100 / ${pw(y / 2, 2 * n)}.`,
          `Prix = ${F(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.08, y = 0.05, n = 3;
      const a = price(cpn, y, n);
      return q("fi-price-f3", "facile", "Price per 100 of par value?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)]],
        a, "", 3,
        [`Prix = ${F(cpn * 100)} / ${F(1 + y)} + ${F(cpn * 100)} / ${pw(y, 2)} + ${F(100 + cpn * 100)} / ${pw(y, 3)}.`,
          `Calculatrice : ${calcPV(n, y * 100, cpn * 100, 100, a)}.`,
          `Prix = ${F(a, 3)} : coupon > YTM, l'obligation cote avec une prime.`]);
    })(),
    (() => {
      const cpn = 0.03, y = 0.075, n = 15;
      const a = price(cpn, y, n, 2);
      const annual = price(cpn, y, n);
      return q("fi-price-f4", "facile", "Price per 100 of par value?",
        [["Coupon rate (semiannual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)]],
        a, "", 3,
        [`Par semestre : coupon = ${F(cpn * 50)}, r = ${P(y / 2, 2)}, N = ${2 * n}.`,
          `Calculatrice : ${calcPV(2 * n, y * 50, cpn * 50, 100, a)}.`,
          `Prix = ${F(a, 3)} (un calcul en annuel, N = ${n}, donnerait ${F(annual, 3)} : faux).`]);
    })(),
    (() => {
      const cpn = 0.04, y = 0.035, n = 2, par = 1000;
      const a = price(cpn, y, n, 1, par);
      return q("fi-price-f5", "facile", "Price of the bond?",
        [["Par value", usd(par)], ["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)]],
        a, "$", 2,
        [`Coupon annuel = ${P(cpn)} × ${D(par)} = ${D(cpn * par)}.`,
          `Prix = ${F(cpn * par)} / ${F(1 + y)} + ${F(par + cpn * par)} / ${pw(y, 2)}.`,
          `Prix = ${D(a, 2)}.`]);
    })(),
    (() => {
      const cpn = 0.09, y = 0.11, n = 15;
      const a = price(cpn, y, n);
      return q("fi-price-m1", "moyen", "Price per 100 of par value?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)]],
        a, "", 3,
        [`Valeur actuelle des ${n} coupons de ${F(cpn * 100)} + valeur actuelle de 100 reçu dans ${n} ans, au taux de ${P(y)}.`,
          `Calculatrice : ${calcPV(n, y * 100, cpn * 100, 100, a)}.`,
          `Prix = ${F(a, 3)} (décote de ${F(100 - a, 3)}).`]);
    })(),
    (() => {
      const cpn = 0.03, y = 0.07, n = 20, par = 1000;
      const a = price(cpn, y, n, 2, par);
      return q("fi-price-m2", "moyen", "Price of the bond?",
        [["Par value", usd(par)], ["Coupon rate (semiannual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)]],
        a, "$", 2,
        [`Coupon semestriel = ${P(cpn)} × ${D(par)} / 2 = ${D((cpn * par) / 2, 2)} ; r = ${P(y / 2)} ; N = ${2 * n}.`,
          `Calculatrice : ${calcPV(2 * n, y * 50, (cpn * par) / 2, par, a, 2)}.`,
          `Prix = ${D(a, 2)}.`]);
    })(),
    (() => {
      const cpn = 0.06, y = 0.075, n = 12, par = 1000, h = 2;
      const p0 = price(cpn, y, n, 1, par);
      const p1 = price(cpn, y, n - h, 1, par);
      const a = p1 - p0;
      return q("fi-price-m3", "moyen", "Change in the bond's value over the next 2 years if its YTM is unchanged?",
        [["Par value", usd(par)], ["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity today", E(n)], ["Yield to maturity", pc(y)]],
        a, "$", 2,
        [`Aujourd'hui : ${calcPV(n, y * 100, cpn * par, par, p0, 2)}.`,
          `Dans ${h} ans (${n - h} ans restants, même YTM) : ${calcPV(n - h, y * 100, cpn * par, par, p1, 2)}.`,
          `Variation = ${D(p1, 2)} − ${D(p0, 2)} = ${D(a, 2)} : une obligation en décote remonte vers le pair (pull to par).`]);
    })(),
    (() => {
      const y3 = 0.042, y6 = 0.051, t = 4, cpn = 0.05;
      const y = interp(3, y3, 6, y6, t);
      const a = price(cpn, y, t);
      return q("fi-price-m4", "moyen", "Estimated price per 100 of par value of the nontraded bond (matrix pricing)?",
        [["Nontraded bond", `${t}-year, ${pc(cpn)} annual coupon`], ["Comparable 3-year bond YTM", pc(y3)], ["Comparable 6-year bond YTM", pc(y6)]],
        a, "", 3,
        [`YTM interpolé à ${t} ans = ${P(y3)} + (${P(y6)} − ${P(y3)}) × (${t} − 3) / (6 − 3) = ${P(y, 3)}.`,
          `Calculatrice : ${calcPV(t, y * 100, cpn * 100, 100, a)}.`,
          `Prix estimé = ${F(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.03, y = 0.068, n = 12;
      const a = price(cpn, y, n, 4);
      return q("fi-price-m5", "moyen", "Price per 100 of par value?",
        [["Coupon rate (quarterly pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity (quarterly basis)", pc(y)]],
        a, "", 3,
        [`Par trimestre : coupon = ${F(cpn * 25)}, r = ${P(y / 4)}, N = ${4 * n}.`,
          `Calculatrice : ${calcPV(4 * n, y * 25, cpn * 25, 100, a)}.`,
          `Prix = ${F(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.04, y0 = 0.04, y1 = 0.05, n = 10;
      const p0 = price(cpn, y0, n, 2);
      const p1 = price(cpn, y1, n, 2);
      const a = (p1 / p0 - 1) * 100;
      return q("fi-price-d1", "difficile", "Percentage change in the bond's price after the yield change?",
        [["Coupon rate (semiannual pay)", pc(cpn)], ["Years to maturity", E(n)], ["YTM at purchase", pc(y0)], ["YTM just after purchase", pc(y1)]],
        a, "%", 2,
        [`À l'achat, coupon = YTM : prix = ${F(p0, 3)} (au pair).`,
          `Après la hausse : ${calcPV(2 * n, y1 * 50, cpn * 50, 100, p1)}.`,
          `Variation = ${F(p1, 3)} / ${F(p0, 3)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const mrr = 0.035, qm = 0.006, dm = 0.048, n = 10;
      const c = ((mrr + qm) * 100) / 2;
      const r = (mrr + dm) / 2;
      const a = pvBond(c, r, 2 * n);
      return q("fi-price-d2", "difficile", "Estimated value per 100 of par value of the floating-rate note on this reset date?",
        [["Coupon", "Semiannual, MRR + quoted margin"], ["Current MRR (annualized)", pc(mrr)], ["Quoted margin", bps(qm * 10000)],
          ["Discount margin", bps(dm * 10000)], ["Years to maturity", E(n)]],
        a, "", 3,
        [`Coupon estimé = (${P(mrr)} + ${P(qm)}) / 2 = ${F(c, 3)} par semestre.`,
          `Taux d'actualisation = (${P(mrr)} + ${P(dm)}) / 2 = ${P(r, 2)} par semestre.`,
          `Calculatrice : ${calcPV(2 * n, r * 100, c, 100, a)}.`,
          `Valeur = ${F(a, 3)} : discount margin > quoted margin, la FRN cote sous le pair.`]);
    })(),
    (() => {
      const cpn = 0.07, eay = 0.0609, n = 6;
      const r = Math.sqrt(1 + eay) - 1;
      const a = pvBond(cpn * 50, r, 2 * n);
      return q("fi-price-d3", "difficile", "Price per 100 of par value?",
        [["Coupon rate (semiannual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Required return (effective annual yield)", pc(eay)]],
        a, "", 3,
        ["Piège : le taux donné est un taux effectif annuel, pas un YTM en base semestrielle.",
          `Taux semestriel = ${F(1 + eay)}^(1/2) − 1 = ${P(r, 4)}.`,
          `Calculatrice : ${calcPV(2 * n, r * 100, cpn * 50, 100, a)}.`,
          `Prix = ${F(a, 3)}.`]);
    })(),
    (() => {
      const c1 = 0.03, c2 = 0.05, y = 0.04;
      const cfs = [c1 * 100, c1 * 100, c2 * 100, c2 * 100 + 100];
      const a = pvFlows(cfs, y);
      return q("fi-price-d4", "difficile", "Price per 100 of par value of the step-up bond?",
        [["Coupon, years 1–2 (annual pay)", pc(c1)], ["Coupon, years 3–4 (annual pay)", pc(c2)], ["Years to maturity", "4"], ["Yield to maturity", pc(y)]],
        a, "", 3,
        [`Flux : ${cfs.map((x) => F(x)).join(" ; ")}.`,
          `Prix = ${F(cfs[0])} / ${F(1 + y)} + ${F(cfs[1])} / ${pw(y, 2)} + ${F(cfs[2])} / ${pw(y, 3)} + ${F(cfs[3])} / ${pw(y, 4)}.`,
          `= ${cfs.map((cf, i) => F(cf / Math.pow(1 + y, i + 1), 3)).join(" + ")} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.05, y = 0.05, n = 8, dy = 0.01;
      const p0 = price(cpn, y, n);
      const pm = price(cpn, y - dy, n);
      const pp = price(cpn, y + dy, n);
      const gain = pm - p0, loss = p0 - pp;
      const a = gain - loss;
      return q("fi-price-d5", "difficile", "By how much does the price gain from a 100 bp yield decrease exceed the price loss from a 100 bp increase (per 100 of par)?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Current yield to maturity", pc(y)]],
        a, "", 3,
        [`Prix actuel = ${F(p0, 3)} (coupon = YTM).`,
          `À ${P(y - dy)} : ${calcPV(n, (y - dy) * 100, cpn * 100, 100, pm)} → gain = ${F(gain, 3)}.`,
          `À ${P(y + dy)} : ${calcPV(n, (y + dy) * 100, cpn * 100, 100, pp)} → perte = ${F(loss, 3)}.`,
          `Écart = ${F(gain, 3)} − ${F(loss, 3)} = ${F(a, 3)} : la relation prix-rendement est convexe.`]);
    })(),
  ],
};

/* ────────────────────────── 2 · Coupon couru, full price, flat price ────────────────────────── */

/** Full price entre deux coupons : PV au dernier coupon capitalisé sur t/T. */
function fullPrice(cpn: number, y: number, nLeft: number, m: number, frac: number) {
  const c = (cpn * 100) / m;
  const r = y / m;
  const pv0 = pvBond(c, r, nLeft);
  const full = pv0 * Math.pow(1 + r, frac);
  const ai = c * frac;
  return { c, r, pv0, full, ai, flat: full - ai };
}

const ACCRUED: CalcType = {
  key: "accrued-interest",
  topic: "fixed_income",
  name: "Coupon couru, full price et flat price (accrued interest)",
  tier: "essentiel",
  source: "LM 6 · Fixed-Income Bond Valuation: Prices and Yields",
  formulas: [
    "Accrued interest = coupon de la période × t / T (t = jours depuis le dernier coupon, T = jours de la période)",
    "Full price = PV au dernier coupon × (1 + r)^(t/T)",
    "Flat price (clean, coté) = full price − accrued interest",
    "30/360 : mois de 30 jours, année de 360 ; actual/actual : jours réels",
  ],
  traps: [
    "Ne pas ajouter le coupon couru au PV du dernier coupon : on capitalise d'abord ce PV sur t/T, puis on retire le coupon couru.",
    "Le flat price n'est pas le prix au dernier coupon : l'écart grandit quand le YTM s'éloigne du coupon.",
    "Corporate : souvent 30/360 ; gouvernement : actual/actual.",
  ],
  questions: [
    (() => {
      const cpn = 0.055, t = 50, T = 180;
      const a = ((cpn * 100) / 2) * (t / T);
      return q("fi-ai-f1", "facile", "Accrued interest per 100 of par value?",
        [["Coupon rate (semiannual pay)", pc(cpn)], ["Days since last coupon (30/360)", E(t)], ["Days in coupon period", E(T)]],
        a, "", 4,
        [`Coupon semestriel = ${F(cpn * 100)} / 2 = ${F(cpn * 50)}.`,
          `Coupon couru = ${F(cpn * 50)} × ${t} / ${T} = ${F(a, 4)}.`]);
    })(),
    (() => {
      const full = 102.384, ai = 1.276;
      const a = full - ai;
      return q("fi-ai-f2", "facile", "Flat (quoted) price per 100 of par value?",
        [["Full price", E(full, 3)], ["Accrued interest", E(ai, 3)]],
        a, "", 3,
        ["Flat price = full price − coupon couru.",
          `= ${F(full, 3)} − ${F(ai, 3)} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.04, last: Ymd = [2025, 3, 10], settle: Ymd = [2025, 7, 25];
      const t = days360(last, settle);
      const a = cpn * 100 * (t / 360);
      return q("fi-ai-f3", "facile", "Accrued interest per 100 of par value (30/360)?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Last coupon date", dEN(last)], ["Settlement date", dEN(settle)], ["Day count", "30/360"]],
        a, "", 4,
        [`Jours en 30/360 : (${settle[1]} − ${last[1]}) × 30 + (${settle[2]} − ${last[2]}) = ${t} jours sur 360.`,
          `Coupon couru = ${F(cpn * 100)} × ${t} / 360 = ${F(a, 4)}.`]);
    })(),
    (() => {
      const cpn = 0.06, last: Ymd = [2025, 1, 15], next: Ymd = [2025, 7, 15], settle: Ymd = [2025, 4, 2];
      const t = actDays(last, settle), T = actDays(last, next);
      const a = cpn * 50 * (t / T);
      return q("fi-ai-f4", "facile", "Accrued interest per 100 of par value (actual/actual)?",
        [["Coupon rate (semiannual pay)", pc(cpn)], ["Coupon dates", "January 15 and July 15"], ["Settlement date", dEN(settle)], ["Day count", "Actual/actual"]],
        a, "", 4,
        [`Jours réels du ${dFR(last)} au ${dFR(settle)} : ${t} ; période du ${dFR(last)} au ${dFR(next)} : ${T} jours.`,
          `Coupon couru = ${F(cpn * 50)} × ${t} / ${T} = ${F(a, 4)}.`]);
    })(),
    (() => {
      const par = 500000, cpn = 0.07, t = 100;
      const a = par * cpn * (t / 360);
      return q("fi-ai-f5", "facile", "Accrued interest owed to the seller?",
        [["Par value of the position", usd(par)], ["Coupon rate (annual pay)", pc(cpn)], ["Days since last coupon (30/360)", E(t)]],
        a, "$", 2,
        [`Coupon annuel = ${P(cpn)} × ${D(par)} = ${D(par * cpn)}.`,
          `Coupon couru = ${D(par * cpn)} × ${t} / 360 = ${D(a, 2)}.`]);
    })(),
    (() => {
      const cpn = 0.03, y = 0.065, nLeft = 10, t = 120, T = 182;
      const fp = fullPrice(cpn, y, nLeft, 2, t / T);
      const a = fp.full;
      return q("fi-ai-m1", "moyen", "Full price per 100 of par value?",
        [["Coupon rate (semiannual pay)", pc(cpn)], ["Coupons remaining", E(nLeft)], ["Yield to maturity", pc(y)],
          ["Days since last coupon", E(t)], ["Days in coupon period", E(T)]],
        a, "", 3,
        [`PV au dernier coupon : ${calcPV(nLeft, y * 50, fp.c, 100, fp.pv0)}.`,
          `Full price = ${F(fp.pv0, 3)} × ${F(1 + fp.r)}^(${t}/${T}) = ${F(a, 3)}.`,
          `Piège : PV + coupon couru = ${F(fp.pv0, 3)} + ${F(fp.ai, 3)} = ${F(fp.pv0 + fp.ai, 3)}, ce n'est pas le full price.`]);
    })(),
    (() => {
      const cpn = 0.03, y = 0.036, nLeft = 5, t = 210;
      const fp = fullPrice(cpn, y, nLeft, 1, t / 360);
      const a = fp.flat;
      return q("fi-ai-m2", "moyen", "Flat price per 100 of par value?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Coupons remaining", E(nLeft)], ["Yield to maturity", pc(y)], ["Days since last coupon (30/360)", E(t)]],
        a, "", 3,
        [`PV au dernier coupon : ${calcPV(nLeft, y * 100, fp.c, 100, fp.pv0)}.`,
          `Full price = ${F(fp.pv0, 3)} × ${F(1 + y)}^(${t}/360) = ${F(fp.full, 3)}.`,
          `Coupon couru = ${F(fp.c)} × ${t} / 360 = ${F(fp.ai, 3)}.`,
          `Flat price = ${F(fp.full, 3)} − ${F(fp.ai, 3)} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.08, y = 0.045, nLeft = 16, last: Ymd = [2025, 2, 1], settle: Ymd = [2025, 7, 10];
      const t = days360(last, settle);
      const fp = fullPrice(cpn, y, nLeft, 2, t / 180);
      const a = fp.full;
      return q("fi-ai-m3", "moyen", "Full price per 100 of par value?",
        [["Coupon rate (semiannual pay)", pc(cpn)], ["Coupon dates", "February 1 and August 1"], ["Settlement date", dEN(settle)],
          ["Day count", "30/360"], ["Coupons remaining", E(nLeft)], ["Yield to maturity", pc(y)]],
        a, "", 3,
        [`Jours en 30/360 depuis le ${dFR(last)} : 30 × (${settle[1]} − ${last[1]}) + (${settle[2]} − ${last[2]}) = ${t} sur 180.`,
          `PV au dernier coupon : ${calcPV(nLeft, y * 50, fp.c, 100, fp.pv0)}.`,
          `Full price = ${F(fp.pv0, 3)} × ${F(1 + fp.r)}^(${t}/180) = ${F(a, 3)}.`,
          `Piège : PV + coupon couru = ${F(fp.pv0, 3)} + ${F(fp.ai, 3)} = ${F(fp.pv0 + fp.ai, 3)}, ce n'est pas le full price.`]);
    })(),
    (() => {
      const par = 2000000, flat = 98.75, cpn = 0.05, t = 75;
      const ai = cpn * 50 * (t / 180);
      const a = (par * (flat + ai)) / 100;
      return q("fi-ai-m4", "moyen", "Total amount the buyer pays at settlement?",
        [["Par value purchased", usd(par)], ["Quoted (flat) price", E(flat, 2)], ["Coupon rate (semiannual pay)", pc(cpn)], ["Days since last coupon (30/360)", E(t)]],
        a, "$", 2,
        [`Coupon couru = ${F(cpn * 50)} × ${t} / 180 = ${F(ai, 4)} pour 100.`,
          `Full price = ${F(flat, 2)} + ${F(ai, 4)} = ${F(flat + ai, 4)} pour 100.`,
          `Montant payé = ${D(par)} × ${F(flat + ai, 4)} % = ${D(a, 2)}.`]);
    })(),
    (() => {
      const cpn = 0.025, y = 0.065, nLeft = 12, last: Ymd = [2025, 3, 1], next: Ymd = [2025, 9, 1], settle: Ymd = [2025, 8, 12];
      const t = actDays(last, settle), T = actDays(last, next);
      const fp = fullPrice(cpn, y, nLeft, 2, t / T);
      const a = fp.flat;
      return q("fi-ai-m5", "moyen", "Flat price per 100 of par value?",
        [["Coupon rate (semiannual pay)", pc(cpn)], ["Coupon dates", "March 1 and September 1"], ["Settlement date", dEN(settle)],
          ["Day count", "Actual/actual"], ["Coupons remaining", E(nLeft)], ["Yield to maturity", pc(y)]],
        a, "", 3,
        [`Jours réels : ${t} depuis le ${dFR(last)}, période de ${T} jours.`,
          `PV au dernier coupon : ${calcPV(nLeft, y * 50, fp.c, 100, fp.pv0)}.`,
          `Full price = ${F(fp.pv0, 3)} × ${F(1 + fp.r)}^(${t}/${T}) = ${F(fp.full, 3)} ; coupon couru = ${F(fp.c)} × ${t} / ${T} = ${F(fp.ai, 3)}.`,
          `Flat price = ${F(fp.full, 3)} − ${F(fp.ai, 3)} = ${F(a, 3)} (et non ${F(fp.pv0, 3)}, le prix au dernier coupon).`]);
    })(),
    (() => {
      const cpn = 0.07, y = 0.061, nLeft = 4, last: Ymd = [2025, 10, 15], settle: Ymd = [2026, 2, 20];
      const t = days360(last, settle);
      const fp = fullPrice(cpn, y, nLeft, 1, t / 360);
      const a = fp.flat;
      return q("fi-ai-d1", "difficile", "Flat price per 100 of par value?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Last coupon date", dEN(last)], ["Settlement date", dEN(settle)],
          ["Day count", "30/360"], ["Coupons remaining", E(nLeft)], ["Yield to maturity", pc(y)]],
        a, "", 3,
        [`Jours en 30/360 : 360 × 1 + 30 × (2 − 10) + (20 − 15) = ${t} sur 360.`,
          `PV au dernier coupon : ${calcPV(nLeft, y * 100, fp.c, 100, fp.pv0)}.`,
          `Full price = ${F(fp.pv0, 3)} × ${F(1 + y)}^(${t}/360) = ${F(fp.full, 3)} ; coupon couru = ${F(fp.c)} × ${t} / 360 = ${F(fp.ai, 3)}.`,
          `Flat price = ${F(a, 3)}.`]);
    })(),
    (() => {
      const par = 1000000, invoice = 1021450, cpn = 0.06, t = 120;
      const full = (invoice / par) * 100;
      const ai = cpn * 50 * (t / 180);
      const a = full - ai;
      return q("fi-ai-d2", "difficile", "Flat (quoted) price per 100 of par value implied by the invoice?",
        [["Par value purchased", usd(par)], ["Invoice amount paid", usd(invoice)], ["Coupon rate (semiannual pay)", pc(cpn)], ["Days since last coupon (30/360)", E(t)]],
        a, "", 3,
        [`Le montant facturé correspond au full price : ${D(invoice)} / ${D(par)} × 100 = ${F(full, 3)}.`,
          `Coupon couru = ${F(cpn * 50)} × ${t} / 180 = ${F(ai, 3)}.`,
          `Flat price = ${F(full, 3)} − ${F(ai, 3)} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const par = 10000000, cpn = 0.05, last: Ymd = [2025, 4, 20], next: Ymd = [2026, 4, 20], settle: Ymd = [2025, 9, 5];
      const tA = actDays(last, settle), TA = actDays(last, next), t3 = days360(last, settle);
      const aiAct = par * cpn * (tA / TA), ai360 = par * cpn * (t3 / 360);
      const a = aiAct - ai360;
      return q("fi-ai-d3", "difficile", "Accrued interest under actual/actual minus accrued interest under 30/360?",
        [["Par value", usd(par)], ["Coupon rate (annual pay)", pc(cpn)], ["Last coupon date", dEN(last)], ["Settlement date", dEN(settle)]],
        a, "$", 2,
        [`Actual/actual : ${tA} jours réels sur une période de ${TA} jours → ${D(par * cpn)} × ${tA} / ${TA} = ${D(aiAct, 2)}.`,
          `30/360 : 30 × (9 − 4) + (5 − 20) = ${t3} jours → ${D(par * cpn)} × ${t3} / 360 = ${D(ai360, 2)}.`,
          `Écart = ${D(aiAct, 2)} − ${D(ai360, 2)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const cpn = 0.03, y = 0.075, nLeft = 16, t = 70, T = 91;
      const fp = fullPrice(cpn, y, nLeft, 4, t / T);
      const a = fp.full;
      return q("fi-ai-d4", "difficile", "Full price per 100 of par value?",
        [["Coupon rate (quarterly pay)", pc(cpn)], ["Coupons remaining", E(nLeft)], ["Yield to maturity (quarterly basis)", pc(y)],
          ["Days since last coupon (actual)", E(t)], ["Days in coupon period", E(T)]],
        a, "", 3,
        [`Par trimestre : coupon = ${F(fp.c)}, r = ${P(fp.r, 3)}.`,
          `PV au dernier coupon : ${calcPV(nLeft, fp.r * 100, fp.c, 100, fp.pv0)}.`,
          `Full price = ${F(fp.pv0, 3)} × ${F(1 + fp.r, 6)}^(${t}/${T}) = ${F(a, 3)}.`,
          `Piège : PV + coupon couru = ${F(fp.pv0, 3)} + ${F(fp.ai, 3)} = ${F(fp.pv0 + fp.ai, 3)}, ce n'est pas le full price.`]);
    })(),
    (() => {
      const par = 5000000, cpn = 0.03, y = 0.07, nLeft = 16, last: Ymd = [2026, 1, 10], settle: Ymd = [2026, 6, 5];
      const t = days360(last, settle);
      const fp = fullPrice(cpn, y, nLeft, 2, t / 180);
      const a = (par * fp.full) / 100;
      return q("fi-ai-d5", "difficile", "Cash the buyer pays at settlement for the position?",
        [["Par value purchased", usd(par)], ["Coupon rate (semiannual pay)", pc(cpn)], ["Last coupon date", dEN(last)],
          ["Settlement date", dEN(settle)], ["Day count", "30/360"], ["Coupons remaining", E(nLeft)], ["Yield to maturity", pc(y)]],
        a, "$", 0,
        [`Jours en 30/360 : 30 × (${settle[1]} − ${last[1]}) + (${settle[2]} − ${last[2]}) = ${t} sur 180.`,
          `PV au dernier coupon : ${calcPV(nLeft, y * 50, fp.c, 100, fp.pv0)}.`,
          `Full price = ${F(fp.pv0, 3)} × ${F(1 + fp.r)}^(${t}/180) = ${F(fp.full, 4)} pour 100.`,
          `Montant payé (full price, coupon couru inclus) = ${D(par)} × ${F(fp.full, 4)} % = ${D(a, 0)}.`]);
    })(),
  ],
};

/* ────────────────────────── 3 · YTM, yield to call, yield to worst ────────────────────────── */

const YTM: CalcType = {
  key: "ytm",
  topic: "fixed_income",
  name: "Yield to maturity, yield to call et yield to worst",
  tier: "essentiel",
  top: true,
  source: "LM 7 · Yield and Yield Spread Measures for Fixed-Rate Bonds",
  formulas: [
    "YTM : taux r tel que prix = Σ CF / (1 + r)^t (calculatrice : CPT I/Y)",
    "Semestriel : YTM = 2 × taux semestriel (semiannual bond basis)",
    "Zéro-coupon : r = (100 / prix)^(1/N) − 1 par période",
    "Yield to call : N = périodes jusqu'au call, FV = prix de call ; yield to worst = min(YTM, yields to call)",
  ],
  traps: [
    "PV négatif dans la calculatrice ; doubler le taux semestriel obtenu.",
    "Option-adjusted yield : on retire l'option (prix de l'obligation droite = callable + valeur du call).",
    "Une obligation callable en décote : le yield to worst est souvent le YTM lui-même.",
  ],
  questions: [
    (() => {
      const p = 95.5, cpn = 0.06, n = 6;
      const a = ytmOf(p, cpn, n) * 100;
      return q("fi-ytm-f1", "facile", "Yield to maturity?",
        [["Price (per 100 par)", E(p, 2)], ["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)]],
        a, "%", 3,
        [`Calculatrice : ${calcIY(n, p, cpn * 100, 100, a)}.`,
          `YTM = ${Pa(a, 3)} : prix sous le pair, donc YTM > coupon.`]);
    })(),
    (() => {
      const p = 72.5, n = 8;
      const a = (Math.pow(100 / p, 1 / n) - 1) * 100;
      return q("fi-ytm-f2", "facile", "Yield to maturity of the zero-coupon bond (annual compounding)?",
        [["Price (per 100 par)", E(p, 2)], ["Years to maturity", E(n)], ["Coupon", "Zero-coupon"]],
        a, "%", 3,
        [`r = (100 / ${F(p, 2)})^(1/${n}) − 1.`,
          `r = ${F(100 / p, 6)}^(1/${n}) − 1 = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const p = 78, cpn = 0.025, n = 12;
      const r = ytmOf(p, cpn, n, 2) / 2;
      const a = r * 200;
      return q("fi-ytm-f3", "facile", "Yield to maturity (semiannual bond basis)?",
        [["Price (per 100 par)", E(p, 2)], ["Coupon rate (semiannual pay)", pc(cpn)], ["Years to maturity", E(n)]],
        a, "%", 3,
        [`Calculatrice : ${calcIY(2 * n, p, cpn * 50, 100, r * 100)} (taux semestriel).`,
          `YTM = 2 × ${Pa(r * 100, 4)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const par = 1000, p = 560, n = 12;
      const r = Math.pow(par / p, 1 / (2 * n)) - 1;
      const a = r * 200;
      return q("fi-ytm-f4", "facile", "Yield to maturity of the zero-coupon bond (semiannual bond basis)?",
        [["Par value", usd(par)], ["Price", usd(p)], ["Years to maturity", E(n)], ["Coupon", "Zero-coupon"]],
        a, "%", 3,
        [`Base semestrielle : N = ${2 * n} semestres.`,
          `Taux semestriel = (${F(par)} / ${F(p)})^(1/${2 * n}) − 1 = ${P(r, 4)}.`,
          `YTM = 2 × ${P(r, 4)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const p = 101.2, cpn = 0.04, n = 3;
      const a = ytmOf(p, cpn, n) * 100;
      return q("fi-ytm-f5", "facile", "Yield to maturity?",
        [["Price (per 100 par)", E(p, 2)], ["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)]],
        a, "%", 3,
        [`Calculatrice : ${calcIY(n, p, cpn * 100, 100, a)}.`,
          `YTM = ${Pa(a, 3)} : prix au-dessus du pair, donc YTM < coupon.`]);
    })(),
    (() => {
      const p = 112.5, cpn = 0.09, n = 12, tc = 5, cp = 101;
      const r = ytmOf(p, cpn, tc, 2, 100, cp) / 2;
      const a = r * 200;
      return q("fi-ytm-m1", "moyen", "Yield to first call (semiannual bond basis)?",
        [["Price (per 100 par)", E(p, 2)], ["Coupon rate (semiannual pay)", pc(cpn)], ["Years to maturity", E(n)], ["First call", `In ${tc} years at ${E(cp)}`]],
        a, "%", 3,
        [`Jusqu'au call : N = ${2 * tc} semestres, FV = prix de call ${F(cp)}.`,
          `Calculatrice : ${calcIY(2 * tc, p, cpn * 50, cp, r * 100)}.`,
          `Yield to first call = 2 × ${Pa(r * 100, 4)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const p = 105.5, cpn = 0.06, n = 7;
      const calls: [number, number][] = [[3, 103], [5, 101]];
      const yM = ytmOf(p, cpn, n) * 100;
      const yC = calls.map(([t, cp]) => ytmOf(p, cpn, t, 1, 100, cp) * 100);
      const a = Math.min(yM, ...yC);
      return q("fi-ytm-m2", "moyen", "Yield to worst?",
        [["Price (per 100 par)", E(p, 2)], ["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)],
          ["Call schedule", calls.map(([t, cp]) => `${E(cp)} in ${t} years`).join("; ")]],
        a, "%", 3,
        [`YTM : ${calcIY(n, p, cpn * 100, 100, yM)}.`,
          ...calls.map(([t, cp], i) => `Yield to call à ${t} ans : ${calcIY(t, p, cpn * 100, cp, yC[i])}.`),
          `Yield to worst = plus bas des rendements = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const par = 1000, p = 712.6, cpn = 0.025, n = 16;
      const r = ytmOf(p, cpn, n, 2, par) / 2;
      const a = r * 200;
      return q("fi-ytm-m3", "moyen", "Yield to maturity (semiannual bond basis)?",
        [["Par value", usd(par)], ["Price", usd(p, 2)], ["Coupon rate (semiannual pay)", pc(cpn)], ["Years to maturity", E(n)]],
        a, "%", 3,
        [`Coupon semestriel = ${F(cpn * 100)}% × ${F(par)} / 2 = ${F((cpn * par) / 2, 3)} ; N = ${2 * n}.`,
          `Calculatrice : ${calcIY(2 * n, p, (cpn * par) / 2, par, r * 100)}.`,
          `YTM = 2 × ${Pa(r * 100, 4)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.05, n = 10, drop = 0.04;
      const p = 100 * (1 - drop);
      const a = ytmOf(p, cpn, n) * 100;
      return q("fi-ytm-m4", "moyen", "New yield to maturity after the price decline?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Initial price", "Par (100)"], ["Price decline", pc(drop)]],
        a, "%", 3,
        [`Nouveau prix = 100 × (1 − ${F(drop)}) = ${F(p, 2)}.`,
          `Calculatrice : ${calcIY(n, p, cpn * 100, 100, a)}.`,
          `YTM = ${Pa(a, 3)} (contre ${P(cpn)} au pair).`]);
    })(),
    (() => {
      const p = 80.4, cpn = 0.035, n = 10;
      const r = ytmOf(p, cpn, n, 4) / 4;
      const a = r * 400;
      return q("fi-ytm-m5", "moyen", "Yield to maturity (quarterly basis)?",
        [["Price (per 100 par)", E(p, 2)], ["Coupon rate (quarterly pay)", pc(cpn)], ["Years to maturity", E(n)]],
        a, "%", 3,
        [`Par trimestre : coupon = ${F(cpn * 25)}, N = ${4 * n}.`,
          `Calculatrice : ${calcIY(4 * n, p, cpn * 25, 100, r * 100)}.`,
          `YTM = 4 × ${Pa(r * 100, 4)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const p = 106, cpn = 0.07, n = 8;
      const calls: [number, number][] = [[3, 103], [5, 102], [6, 100]];
      const yM = ytmOf(p, cpn, n, 2) * 100;
      const yC = calls.map(([t, cp]) => ytmOf(p, cpn, t, 2, 100, cp) * 100);
      const a = Math.min(yM, ...yC);
      return q("fi-ytm-d1", "difficile", "Yield to worst (semiannual bond basis)?",
        [["Price (per 100 par)", E(p, 2)], ["Coupon rate (semiannual pay)", pc(cpn)], ["Years to maturity", E(n)],
          ["Call schedule", calls.map(([t, cp]) => `${E(cp)} in ${t} years`).join("; ")]],
        a, "%", 3,
        [`YTM : ${calcIY(2 * n, p, cpn * 50, 100, yM / 2)} → ${Pa(yM, 3)}.`,
          ...calls.map(([t, cp], i) => `Call à ${t} ans : ${calcIY(2 * t, p, cpn * 50, cp, yC[i] / 2)} → ${Pa(yC[i], 3)}.`),
          `Yield to worst = ${Pa(a, 3)} (le plus bas).`]);
    })(),
    (() => {
      const p = 99, cfs = [2, 2, 4, 6, 106];
      const a = rateOf(p, cfs) * 100;
      return q("fi-ytm-d2", "difficile", "Yield to maturity of the step-up bond?",
        [["Price (per 100 par)", E(p, 2)], ["Coupons (annual pay)", "2% in years 1–2, 4% in year 3, 6% in years 4–5"], ["Years to maturity", "5"]],
        a, "%", 3,
        [`Flux : ${cfs.map((x) => F(x)).join(" ; ")} (coupons inégaux : utiliser le menu CF/IRR).`,
          `CF0 = −${F(p)} ; C01 = 2 (F01 = 2) ; C02 = 4 ; C03 = 6 ; C04 = 106 ; CPT IRR = ${F(a, 4)}.`,
          `YTM = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const p = 98, cpn = 0.04, n = 5, tp = 2, pp = 100;
      const a = ytmOf(p, cpn, tp, 1, 100, pp) * 100;
      return q("fi-ytm-d3", "difficile", "Yield to put?",
        [["Price (per 100 par)", E(p, 2)], ["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Put option", `Putable at ${E(pp)} in ${tp} years`]],
        a, "%", 3,
        [`Jusqu'au put : N = ${tp}, FV = prix d'exercice ${F(pp)} (la maturité de ${n} ans ne sert pas).`,
          `Calculatrice : ${calcIY(tp, p, cpn * 100, pp, a)}.`,
          `Yield to put = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const pc0 = 101.5, call = 1.8, cpn = 0.05, n = 6;
      const straight = pc0 + call;
      const a = ytmOf(straight, cpn, n) * 100;
      return q("fi-ytm-d4", "difficile", "Option-adjusted yield of the callable bond?",
        [["Callable bond price (per 100 par)", E(pc0, 2)], ["Value of the embedded call (per 100 par)", E(call, 2)],
          ["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)]],
        a, "%", 3,
        [`On retire l'option : prix de l'obligation droite = ${F(pc0, 2)} + ${F(call, 2)} = ${F(straight, 2)}.`,
          `Calculatrice : ${calcIY(n, straight, cpn * 100, 100, a)}.`,
          `Option-adjusted yield = ${Pa(a, 3)}, plus bas que le YTM de la callable (${Pa(ytmOf(pc0, cpn, n) * 100, 3)}).`]);
    })(),
    (() => {
      const p = 79.5, cpn = 0.025, n = 14, tc = 6, cp = 101;
      const yM = ytmOf(p, cpn, n, 2) * 100;
      const yC = ytmOf(p, cpn, tc, 2, 100, cp) * 100;
      const a = Math.min(yM, yC);
      return q("fi-ytm-d5", "difficile", "Yield to worst (semiannual bond basis)?",
        [["Price (per 100 par)", E(p, 2)], ["Coupon rate (semiannual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Call option", `Callable at ${E(cp)} in ${tc} years`]],
        a, "%", 3,
        [`YTM : ${calcIY(2 * n, p, cpn * 50, 100, yM / 2)} → ${Pa(yM, 3)}.`,
          `Yield to call : ${calcIY(2 * tc, p, cpn * 50, cp, yC / 2)} → ${Pa(yC, 3)}.`,
          `Obligation en décote : un call anticipé à ${F(cp)} profiterait au porteur, le pire cas est la maturité.`,
          `Yield to worst = ${Pa(a, 3)}.`]);
    })(),
  ],
};

/* ────────────────────────── 4 · Current yield, simple yield, périodicité ────────────────────────── */

/** Taux affiché en base n équivalent à un taux affiché en base m. */
const convertYield = (y: number, m: number, n: number): number => n * (Math.pow(1 + y / m, m / n) - 1);

const YIELD_MEASURES: CalcType = {
  key: "yield-measures",
  topic: "fixed_income",
  name: "Current yield, simple yield et périodicité (EAY)",
  tier: "essentiel",
  source: "LM 7 · Yield and Yield Spread Measures for Fixed-Rate Bonds",
  formulas: [
    "Current yield = coupon annuel / flat price",
    "Simple yield = (coupon annuel ± amortissement linéaire de la décote ou de la prime) / flat price",
    "Effective annual yield = (1 + YTM / m)^m − 1",
    "Conversion de périodicité : (1 + y_m / m)^m = (1 + y_n / n)^n",
  ],
  traps: [
    "Le current yield ignore gains en capital et réinvestissement ; il est le même pour un coupon annuel ou semestriel.",
    "À taux effectif égal, plus la périodicité est élevée, plus le taux affiché est bas.",
  ],
  questions: [
    (() => {
      const par = 1000, cpn = 0.06, p = 930;
      const a = ((cpn * par) / p) * 100;
      return q("fi-yld-f1", "facile", "Current yield?",
        [["Par value", usd(par)], ["Coupon rate (semiannual pay)", pc(cpn)], ["Flat price", usd(p)]],
        a, "%", 3,
        [`Coupon annuel = ${P(cpn)} × ${D(par)} = ${D(cpn * par)} (la fréquence ne change rien).`,
          `Current yield = ${F(cpn * par)} / ${F(p)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const y = 0.052;
      const a = (Math.pow(1 + y / 2, 2) - 1) * 100;
      return q("fi-yld-f2", "facile", "Effective annual yield?",
        [["Yield to maturity (semiannual bond basis)", pc(y)]],
        a, "%", 3,
        [`EAY = (1 + ${F(y)} / 2)² − 1 = ${pw(y / 2, 2)} − 1 = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.0725, p = 104.5;
      const a = ((cpn * 100) / p) * 100;
      return q("fi-yld-f3", "facile", "Current yield?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Flat price (per 100 par)", E(p, 2)]],
        a, "%", 3,
        [`Current yield = ${F(cpn * 100)} / ${F(p, 2)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const y = 0.06;
      const a = (Math.pow(1 + y / 4, 4) - 1) * 100;
      return q("fi-yld-f4", "facile", "Effective annual yield?",
        [["Yield to maturity (quarterly basis)", pc(y)]],
        a, "%", 3,
        [`EAY = (1 + ${F(y)} / 4)⁴ − 1 = ${pw(y / 4, 4)} − 1 = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const y = 0.055;
      const a = convertYield(y, 1, 2) * 100;
      return q("fi-yld-f5", "facile", "Equivalent yield on a semiannual bond basis?",
        [["Yield to maturity (annual-pay bond)", pc(y)]],
        a, "%", 3,
        [`Taux semestriel équivalent = ${F(1 + y)}^(1/2) − 1 = ${Pa(a / 2, 4)}.`,
          `Base semestrielle = 2 × ${Pa(a / 2, 4)} = ${Pa(a, 3)} (plus bas que ${P(y)}).`]);
    })(),
    (() => {
      const cpn = 0.05, p = 94.8, n = 4;
      const amort = (100 - p) / n;
      const a = ((cpn * 100 + amort) / p) * 100;
      return q("fi-yld-m1", "moyen", "Simple yield?",
        [["Coupon rate (semiannual pay)", pc(cpn)], ["Flat price (per 100 par)", E(p, 2)], ["Years to maturity", E(n)]],
        a, "%", 3,
        [`Décote = 100 − ${F(p, 2)} = ${F(100 - p, 2)}, amortie linéairement : ${F(100 - p, 2)} / ${n} = ${F(amort, 4)} par an.`,
          `Simple yield = (${F(cpn * 100)} + ${F(amort, 4)}) / ${F(p, 2)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const y = 0.046;
      const a = convertYield(y, 2, 4) * 100;
      return q("fi-yld-m2", "moyen", "Equivalent yield on a quarterly basis?",
        [["Yield to maturity (semiannual bond basis)", pc(y)]],
        a, "%", 3,
        [`Taux semestriel = ${P(y / 2)}.`,
          `Taux trimestriel équivalent = ${F(1 + y / 2)}^(1/2) − 1 = ${Pa(a / 4, 4)}.`,
          `Base trimestrielle = 4 × ${Pa(a / 4, 4)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.08, p = 106.4, n = 5;
      const amort = (p - 100) / n;
      const a = ((cpn * 100 - amort) / p) * 100;
      return q("fi-yld-m3", "moyen", "Simple yield?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Flat price (per 100 par)", E(p, 2)], ["Years to maturity", E(n)]],
        a, "%", 3,
        [`Prime = ${F(p, 2)} − 100 = ${F(p - 100, 2)}, amortie : ${F(p - 100, 2)} / ${n} = ${F(amort, 4)} par an (à retrancher).`,
          `Simple yield = (${F(cpn * 100)} − ${F(amort, 4)}) / ${F(p, 2)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const y = 0.048;
      const a = convertYield(y, 12, 2) * 100;
      return q("fi-yld-m4", "moyen", "Equivalent yield on a semiannual bond basis?",
        [["Yield to maturity (monthly-pay bond, monthly basis)", pc(y)]],
        a, "%", 3,
        [`Taux mensuel = ${F(y * 100)} / 12 = ${Pa((y * 100) / 12, 4)}.`,
          `Taux semestriel équivalent = (1 + ${F(y / 12, 6)})⁶ − 1 = ${Pa(a / 2, 4)}.`,
          `Base semestrielle = 2 × ${Pa(a / 2, 4)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.04, y = 0.05, n = 10;
      const p = price(cpn, y, n);
      const a = ((cpn * 100) / p) * 100;
      return q("fi-yld-m5", "moyen", "Current yield of the bond?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)]],
        a, "%", 3,
        [`Prix : ${calcPV(n, y * 100, cpn * 100, 100, p)}.`,
          `Current yield = ${F(cpn * 100)} / ${F(p, 3)} = ${Pa(a, 3)} (entre le coupon et le YTM).`]);
    })(),
    (() => {
      const cpn = 0.035, y = 0.046, n = 6;
      const p = price(cpn, y, n, 2);
      const amort = (100 - p) / n;
      const a = ((cpn * 100 + amort) / p) * 100;
      return q("fi-yld-d1", "difficile", "Simple yield of the bond?",
        [["Coupon rate (semiannual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)]],
        a, "%", 3,
        [`Prix : ${calcPV(2 * n, y * 50, cpn * 50, 100, p)}.`,
          `Amortissement annuel de la décote = (100 − ${F(p, 3)}) / ${n} = ${F(amort, 4)}.`,
          `Simple yield = (${F(cpn * 100)} + ${F(amort, 4)}) / ${F(p, 3)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const ys = 0.054, ya = 0.0545;
      const eay = Math.pow(1 + ys / 2, 2) - 1;
      const a = (eay - ya) * 10000;
      return q("fi-yld-d2", "difficile", "Effective annual yield advantage of bond S over bond A?",
        [["Bond S yield (semiannual bond basis)", pc(ys)], ["Bond A yield (annual-pay basis)", pc(ya)]],
        a, "bp", 1,
        [`Pour comparer, on ramène S en taux effectif annuel : ${pw(ys / 2, 2)} − 1 = ${P(eay, 4)}.`,
          `Le YTM d'une obligation à coupon annuel est déjà un taux effectif : ${P(ya)}.`,
          `Écart = ${P(eay, 4)} − ${P(ya)} = ${Bp(a, 1)} en faveur de S, malgré un taux affiché plus bas.`],
        0.1);
    })(),
    (() => {
      const cy = 0.056, cpn = 0.05, n = 6;
      const p = (cpn * 100) / cy;
      const a = ytmOf(p, cpn, n) * 100;
      return q("fi-yld-d3", "difficile", "Yield to maturity of the bond?",
        [["Current yield", pc(cy)], ["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)]],
        a, "%", 3,
        [`Current yield = coupon / prix, donc prix = ${F(cpn * 100)} / ${F(cy)} = ${F(p, 4)}.`,
          `Calculatrice : ${calcIY(n, p, cpn * 100, 100, a)}.`,
          `YTM = ${Pa(a, 3)} (au-dessus du current yield : la décote se reprend jusqu'à l'échéance).`]);
    })(),
    (() => {
      const y = 0.063;
      const a = convertYield(y, 2, 12) * 100;
      return q("fi-yld-d4", "difficile", "Equivalent yield on a monthly basis?",
        [["Yield to maturity (semiannual bond basis)", pc(y)]],
        a, "%", 3,
        [`Taux semestriel = ${P(y / 2, 2)}.`,
          `Taux mensuel équivalent = ${F(1 + y / 2)}^(1/6) − 1 = ${Pa(a / 12, 5)}.`,
          `Base mensuelle = 12 × ${Pa(a / 12, 5)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.06, p = 97.2, n = 3, ytmShown = rd(ytmOf(p, cpn, n) * 100, 2);
      const cur = (cpn * 100) / p;
      const simple = (cpn * 100 + (100 - p) / n) / p;
      const a = (simple - cur) * 10000;
      return q("fi-yld-d5", "difficile", "Simple yield minus current yield?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Flat price (per 100 par)", E(p, 2)], ["Years to maturity", E(n)], ["Yield to maturity", `${E(ytmShown)}%`]],
        a, "bp", 1,
        ["Le YTM ne sert pas : les deux mesures se calculent sur le flat price.",
          `Current yield = ${F(cpn * 100)} / ${F(p, 2)} = ${P(cur, 4)}.`,
          `Simple yield = (${F(cpn * 100)} + ${F(100 - p, 2)} / ${n}) / ${F(p, 2)} = ${P(simple, 4)}.`,
          `Écart = amortissement / prix = ${Bp(a, 1)}.`]);
    })(),
  ],
};

/* ────────────────────────── 5 · Marché monétaire ────────────────────────── */

/** Prix d'un titre escompté : FV × (1 − DR × jours / base). */
const discountPrice = (fv: number, dr: number, days: number, basis = 360): number => fv * (1 - (dr * days) / basis);

const MONEY_MARKET: CalcType = {
  key: "money-market",
  topic: "fixed_income",
  name: "Rendements du marché monétaire (discount, add-on, BEY)",
  tier: "essentiel",
  source: "LM 8 · Yield and Yield Spread Measures for Floating-Rate Instruments",
  formulas: [
    "Discount yield (T-bill, commercial paper) : prix = FV × (1 − DR × jours / 360)",
    "Add-on yield (CD, repo, MRR) : FV = PV × (1 + AOR × jours / année)",
    "Holding period return = FV / PV − 1",
    "Bond equivalent yield (BEY) = add-on yield base 365 = HPR × 365 / jours",
  ],
  traps: [
    "Un discount yield se rapporte à la valeur faciale, pas au prix payé : il sous-estime le rendement.",
    "Add-on base 360 → base 365 : multiplier par 365 / 360.",
    "Vérifier la base (360 ou 365) indiquée pour chaque taux.",
  ],
  questions: [
    (() => {
      const fv = 1000, dr = 0.024, days = 180;
      const p = discountPrice(fv, dr, days);
      const a = fv - p;
      return q("fi-mm-f1", "facile", "Dollar discount on the T-bill (face value minus price)?",
        [["Face value", usd(fv)], ["Discount yield (360-day basis)", pc(dr)], ["Days to maturity", E(days)]],
        a, "$", 2,
        [`Un discount yield s'applique à la valeur faciale, sur 360 jours.`,
          `Escompte = ${P(dr)} × ${days} / 360 × ${D(fv)} = ${D(a, 2)}.`,
          `Prix payé = ${D(fv)} − ${D(a, 2)} = ${D(p, 2)}.`]);
    })(),
    (() => {
      const pv = 1000000, aor = 0.042, days = 120;
      const a = pv * ((aor * days) / 365);
      return q("fi-mm-f2", "facile", "Interest earned on the certificate of deposit?",
        [["Principal", usd(pv)], ["Add-on yield (365-day basis)", pc(aor)], ["Days to maturity", E(days)]],
        a, "$", 2,
        [`Intérêt de la période = ${P(aor)} × ${days} / 365 = ${P((aor * days) / 365, 4)} du principal (base 365 indiquée, pas 360).`,
          `Intérêt = ${D(pv)} × ${F(aor)} × ${days} / 365 = ${D(a, 2)} ; paiement à l'échéance = ${D(pv + a, 2)}.`]);
    })(),
    (() => {
      const pv = 1000, fv = 1012, days = 91;
      const h = fv / pv - 1;
      const a = h * (365 / days) * 100;
      return q("fi-mm-f3", "facile", "Bond equivalent yield of the commercial paper?",
        [["Amount invested", usd(pv)], ["Amount received at maturity", usd(fv)], ["Days to maturity", E(days)]],
        a, "%", 3,
        [`HPR = ${F(fv)} / ${F(pv)} − 1 = ${P(h, 2)}.`,
          `BEY = ${P(h, 2)} × 365 / ${days} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const aor = 0.036;
      const a = aor * (365 / 360) * 100;
      return q("fi-mm-f4", "facile", "Bond equivalent yield of the deposit?",
        [["Add-on yield (360-day basis)", pc(aor)]],
        a, "%", 3,
        ["Le BEY est un taux add-on sur 365 jours.",
          `BEY = ${P(aor)} × 365 / 360 = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const p = 99.1, days = 90;
      const a = (1 - p / 100) * (360 / days) * 100;
      return q("fi-mm-f5", "facile", "Discount yield of the T-bill (360-day basis)?",
        [["Price (per 100 face)", E(p, 2)], ["Days to maturity", E(days)]],
        a, "%", 3,
        [`Escompte = (100 − ${F(p, 2)}) / 100 = ${P(1 - p / 100, 2)} de la valeur faciale.`,
          `Discount yield = ${P(1 - p / 100, 2)} × 360 / ${days} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const dr = 0.018, days = 90;
      const p = discountPrice(100, dr, days);
      const h = 100 / p - 1;
      const a = h * (365 / days) * 100;
      return q("fi-mm-m1", "moyen", "Bond equivalent yield of the T-bill?",
        [["Discount yield (360-day basis)", pc(dr)], ["Days to maturity", E(days)]],
        a, "%", 3,
        [`Prix = 100 × (1 − ${F(dr)} × ${days} / 360) = ${F(p, 4)}.`,
          `HPR = 100 / ${F(p, 4)} − 1 = ${P(h, 4)}.`,
          `BEY = ${P(h, 4)} × 365 / ${days} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const fv = 1000, p = 985, days = 120;
      const h = fv / p - 1;
      const a = h * (365 / days) * 100;
      return q("fi-mm-m2", "moyen", "Bond equivalent yield of the pure-discount note?",
        [["Face value", usd(fv)], ["Purchase price", usd(p)], ["Days to maturity", E(days)]],
        a, "%", 3,
        [`HPR = ${F(fv)} / ${F(p)} − 1 = ${P(h, 4)}.`,
          `BEY = ${P(h, 4)} × 365 / ${days} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const dr = 0.032, days = 150;
      const p = discountPrice(100, dr, days);
      const h = 100 / p - 1;
      const a = h * (360 / days) * 100;
      return q("fi-mm-m3", "moyen", "Equivalent add-on yield of the T-bill on a 360-day basis?",
        [["Discount yield (360-day basis)", pc(dr)], ["Days to maturity", E(days)]],
        a, "%", 3,
        [`Prix = 100 × (1 − ${F(dr)} × ${days} / 360) = ${F(p, 4)}.`,
          `HPR = 100 / ${F(p, 4)} − 1 = ${P(h, 4)}.`,
          `Add-on base 360 = ${P(h, 4)} × 360 / ${days} = ${Pa(a, 3)} (au-dessus du discount yield).`]);
    })(),
    (() => {
      const pv = 500000, aor = 0.035, days = 200;
      const a = pv * aor * (days / 360);
      return q("fi-mm-m4", "moyen", "Interest earned on the certificate of deposit?",
        [["Principal", usd(pv)], ["Add-on yield (360-day basis)", pc(aor)], ["Days to maturity", E(days)]],
        a, "$", 2,
        [`Intérêt = ${D(pv)} × ${P(aor)} × ${days} / 360.`,
          `= ${D(a, 2)}.`]);
    })(),
    (() => {
      const beyR = 0.04, days = 182;
      const h = (beyR * days) / 365;
      const pOverF = 1 / (1 + h);
      const a = (1 - pOverF) * (360 / days) * 100;
      return q("fi-mm-m5", "moyen", "Discount yield (360-day basis) equivalent to this bond equivalent yield?",
        [["Bond equivalent yield", pc(beyR)], ["Days to maturity", E(days)]],
        a, "%", 3,
        [`HPR = ${P(beyR)} × ${days} / 365 = ${P(h, 4)}.`,
          `Prix / valeur faciale = 1 / (1 + ${F(h, 6)}) = ${F(pOverF, 6)}.`,
          `Discount yield = (1 − ${F(pOverF, 6)}) × 360 / ${days} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const aor = 0.04, days = 120;
      const h = (aor * days) / 360;
      const eay = Math.pow(1 + h, 365 / days) - 1;
      const semi = Math.sqrt(1 + eay) - 1;
      const a = 2 * semi * 100;
      return q("fi-mm-d1", "difficile", "Yield of the deposit on a semiannual bond basis?",
        [["Add-on yield (360-day basis)", pc(aor)], ["Days to maturity", E(days)]],
        a, "%", 3,
        [`HPR sur ${days} jours = ${P(aor)} × ${days} / 360 = ${P(h, 4)}.`,
          `Taux effectif annuel = ${F(1 + h, 6)}^(365/${days}) − 1 = ${P(eay, 4)}.`,
          `Taux semestriel = ${F(1 + eay, 6)}^(1/2) − 1 = ${P(semi, 4)}.`,
          `Base semestrielle = 2 × ${P(semi, 4)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const tb = { dr: 0.04, days: 90 }, cp = { dr: 0.0405, days: 120 }, cd = { aor: 0.041, days: 180 };
      const bTb = (100 / discountPrice(100, tb.dr, tb.days) - 1) * (365 / tb.days) * 100;
      const bCp = (100 / discountPrice(100, cp.dr, cp.days) - 1) * (365 / cp.days) * 100;
      const bCd = cd.aor * 100;
      const a = Math.max(bTb, bCp, bCd);
      return q("fi-mm-d2", "difficile", "Highest bond equivalent yield among the three instruments?",
        [["90-day T-bill", `discount yield ${pc(tb.dr)} (360-day basis)`], ["120-day commercial paper", `discount yield ${pc(cp.dr)} (360-day basis)`],
          ["180-day CD", `add-on yield ${pc(cd.aor)} (365-day basis)`]],
        a, "%", 3,
        [`T-bill : prix = ${F(discountPrice(100, tb.dr, tb.days), 4)} → BEY = ${Pa(bTb, 3)}.`,
          `Commercial paper : prix = ${F(discountPrice(100, cp.dr, cp.days), 4)} → BEY = ${Pa(bCp, 3)}.`,
          `CD : un add-on base 365 est déjà un BEY → ${Pa(bCd, 3)}.`,
          `Le plus élevé : ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const p = 98.6, days = 120;
      const dr = (1 - p / 100) * (360 / days);
      const b = (100 / p - 1) * (365 / days);
      const a = (b - dr) * 10000;
      return q("fi-mm-d3", "difficile", "Bond equivalent yield minus discount yield of the T-bill?",
        [["Price (per 100 face)", E(p, 2)], ["Days to maturity", E(days)]],
        a, "bp", 1,
        [`Discount yield = (1 − ${F(p / 100, 3)}) × 360 / ${days} = ${P(dr, 4)}.`,
          `BEY = (100 / ${F(p, 2)} − 1) × 365 / ${days} = ${P(b, 4)}.`,
          `Écart = ${Bp(a, 1)} : le BEY rapporte le gain au prix payé et compte 365 jours.`]);
    })(),
    (() => {
      const dr = 0.036, days = 183;
      const p = discountPrice(100, dr, days, 365);
      const h = 100 / p - 1;
      const a = h * (365 / days) * 100;
      return q("fi-mm-d4", "difficile", "Bond equivalent yield of the commercial paper?",
        [["Discount yield (365-day basis)", pc(dr)], ["Days to maturity", E(days)]],
        a, "%", 3,
        [`Piège : le discount yield est ici en base 365.`,
          `Prix = 100 × (1 − ${F(dr)} × ${days} / 365) = ${F(p, 4)}.`,
          `HPR = 100 / ${F(p, 4)} − 1 = ${P(h, 4)} ; BEY = ${P(h, 4)} × 365 / ${days} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const dr0 = 0.03, d0 = 180, dr1 = 0.028, hold = 60;
      const p0 = discountPrice(100, dr0, d0);
      const p1 = discountPrice(100, dr1, d0 - hold);
      const h = p1 / p0 - 1;
      const a = h * (365 / hold) * 100;
      return q("fi-mm-d5", "difficile", "Holding period return of the T-bill, expressed as a bond equivalent yield?",
        [["T-bill at purchase", `180 days to maturity, discount yield ${pc(dr0)}`], ["Holding period", `${hold} days`],
          ["Discount yield at sale (120 days left)", pc(dr1)], ["Basis", "360-day discount yields"]],
        a, "%", 3,
        [`Prix d'achat = 100 × (1 − ${F(dr0)} × ${d0} / 360) = ${F(p0, 4)}.`,
          `Prix de vente = 100 × (1 − ${F(dr1)} × ${d0 - hold} / 360) = ${F(p1, 4)}.`,
          `HPR = ${F(p1, 4)} / ${F(p0, 4)} − 1 = ${P(h, 4)}.`,
          `BEY = ${P(h, 4)} × 365 / ${hold} = ${Pa(a, 3)} (la baisse des taux a dopé le rendement).`]);
    })(),
  ],
};

/* ────────────────────────── 6 · Spreads et matrix pricing ────────────────────────── */

const SPREADS: CalcType = {
  key: "yield-spreads",
  topic: "fixed_income",
  name: "Spreads (G-spread, I-spread, Z-spread, OAS) et matrix pricing",
  tier: "essentiel",
  source: "LM 7 · Yield and Yield Spread Measures for Fixed-Rate Bonds",
  formulas: [
    "G-spread = YTM de l'obligation − YTM du gouvernement de même maturité (interpolé si besoin)",
    "I-spread = YTM de l'obligation − taux de swap de même maturité",
    "Interpolation : y(T) = y1 + (y2 − y1) × (T − T1) / (T2 − T1)",
    "Z-spread : prix = Σ CF / (1 + S_t + Z)^t ; OAS = Z-spread − valeur de l'option (callable)",
  ],
  traps: [
    "Interpoler le benchmark quand aucune maturité ne coïncide.",
    "Callable : OAS < Z-spread ; putable : OAS > Z-spread.",
    "Spread inchangé + rendement en hausse = facteur macro (benchmark) ; spread en hausse = facteur micro (crédit, liquidité).",
  ],
  questions: [
    (() => {
      const yb = 0.0585, yg = 0.0392;
      const a = (yb - yg) * 10000;
      return q("fi-spread-f1", "facile", "G-spread of the corporate bond?",
        [["5-year corporate bond YTM", pc(yb)], ["5-year government bond YTM", pc(yg)]],
        a, "bp", 0,
        [`G-spread = ${P(yb)} − ${P(yg)} = ${P(yb - yg)} = ${Bp(a, 0)}.`]);
    })(),
    (() => {
      const yb = 0.044, sw = 0.0375;
      const a = (yb - sw) * 10000;
      return q("fi-spread-f2", "facile", "I-spread of the bond?",
        [["Bond YTM", pc(yb)], ["Swap rate, same tenor", pc(sw)]],
        a, "bp", 0,
        [`I-spread = ${P(yb)} − ${P(sw)} = ${Bp(a, 0)}.`]);
    })(),
    (() => {
      const z = 185, opt = 48;
      const a = z - opt;
      return q("fi-spread-f3", "facile", "Option-adjusted spread of the callable bond?",
        [["Z-spread", bps(z)], ["Value of the call option", bps(opt)]],
        a, "bp", 0,
        [`OAS = Z-spread − valeur de l'option = ${z} − ${opt} = ${Bp(a, 0)}.`]);
    })(),
    (() => {
      const y2 = 0.031, y5 = 0.037, t = 3;
      const a = interp(2, y2, 5, y5, t) * 100;
      return q("fi-spread-f4", "facile", "Interpolated 3-year government yield?",
        [["2-year government YTM", pc(y2)], ["5-year government YTM", pc(y5)]],
        a, "%", 3,
        [`y(3) = ${P(y2)} + (${P(y5)} − ${P(y2)}) × (3 − 2) / (5 − 2).`,
          `= ${P(y2)} + ${P(y5 - y2)} / 3 = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const z = 120, oas = 150;
      const a = oas - z;
      return q("fi-spread-f5", "facile", "Value of the embedded put option, in basis points?",
        [["Z-spread of the putable bond", bps(z)], ["Option-adjusted spread", bps(oas)]],
        a, "bp", 0,
        ["Putable : le porteur détient l'option, il accepte un Z-spread plus faible ; OAS = Z-spread + valeur du put.",
          `Valeur du put = ${oas} − ${z} = ${Bp(a, 0)}.`]);
    })(),
    (() => {
      const yb = 0.052, y3 = 0.035, y5 = 0.041;
      const g = interp(3, y3, 5, y5, 4);
      const a = (yb - g) * 10000;
      return q("fi-spread-m1", "moyen", "G-spread of the 4-year corporate bond?",
        [["4-year corporate bond YTM", pc(yb)], ["3-year government YTM", pc(y3)], ["5-year government YTM", pc(y5)]],
        a, "bp", 0,
        [`Benchmark interpolé à 4 ans = (${P(y3)} + ${P(y5)}) / 2 = ${P(g, 3)}.`,
          `G-spread = ${P(yb)} − ${P(g, 3)} = ${Bp(a, 0)}.`]);
    })(),
    (() => {
      const p = 101.5, cpn = 0.06, n = 3, yg = 0.042;
      const yb = ytmOf(p, cpn, n);
      const a = (yb - yg) * 10000;
      return q("fi-spread-m2", "moyen", "G-spread of the corporate bond?",
        [["Corporate bond price (per 100 par)", E(p, 2)], ["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["3-year government YTM", pc(yg)]],
        a, "bp", 0,
        [`YTM : ${calcIY(n, p, cpn * 100, 100, yb * 100)}.`,
          `G-spread = ${P(yb, 3)} − ${P(yg)} = ${Bp(a, 0)}.`],
        1);
    })(),
    (() => {
      const yc5 = 0.049, g4 = 0.032, g6 = 0.036;
      const g5 = interp(4, g4, 6, g6, 5);
      const s = yc5 - g5;
      const a = (g6 + s) * 100;
      return q("fi-spread-m3", "moyen", "Estimated required yield on a new 6-year A-rated corporate issue?",
        [["Existing 5-year A-rated corporate YTM", pc(yc5)], ["4-year government YTM", pc(g4)], ["6-year government YTM", pc(g6)]],
        a, "%", 3,
        [`Benchmark 5 ans interpolé = (${P(g4)} + ${P(g6)}) / 2 = ${P(g5)}.`,
          `Spread de l'émetteur = ${P(yc5)} − ${P(g5)} = ${Bp(s * 10000, 0)}.`,
          `Nouvelle émission à 6 ans = ${P(g6)} + ${P(s)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const yb = 0.0505, s5 = 0.038, s10 = 0.043;
      const sw = interp(5, s5, 10, s10, 7);
      const a = (yb - sw) * 10000;
      return q("fi-spread-m4", "moyen", "I-spread of the 7-year bond?",
        [["7-year bond YTM", pc(yb)], ["5-year swap rate", pc(s5)], ["10-year swap rate", pc(s10)]],
        a, "bp", 0,
        [`Swap 7 ans interpolé = ${P(s5)} + (${P(s10)} − ${P(s5)}) × 2 / 5 = ${P(sw, 3)}.`,
          `I-spread = ${P(yb)} − ${P(sw, 3)} = ${Bp(a, 0)}.`]);
    })(),
    (() => {
      const y0 = 0.051, y1 = 0.0545, b0 = 0.038, b1 = 0.039;
      const a = (y1 - b1 - (y0 - b0)) * 10000;
      return q("fi-spread-m5", "moyen", "Change in the bond's yield spread over the benchmark?",
        [["Bond YTM, last month / today", lst([pc(y0), pc(y1)])], ["Benchmark YTM, last month / today", lst([pc(b0), pc(b1)])]],
        a, "bp", 0,
        [`Spread d'avant = ${P(y0)} − ${P(b0)} = ${Bp((y0 - b0) * 10000, 0)} ; spread actuel = ${P(y1)} − ${P(b1)} = ${Bp((y1 - b1) * 10000, 0)}.`,
          `Variation = ${Bp(a, 0)} : l'essentiel de la hausse vient de facteurs propres à l'émetteur (crédit, liquidité).`]);
    })(),
    (() => {
      const p = 102.4, cpn = 0.07, n = 4, g3 = 0.036, g5 = 0.044;
      const yb = ytmOf(p, cpn, n, 2);
      const g = interp(3, g3, 5, g5, 4);
      const a = (yb - g) * 10000;
      return q("fi-spread-d1", "difficile", "G-spread of the corporate bond?",
        [["Corporate bond price (per 100 par)", E(p, 2)], ["Coupon rate (semiannual pay)", pc(cpn)], ["Years to maturity", E(n)],
          ["3-year government YTM", pc(g3)], ["5-year government YTM", pc(g5)]],
        a, "bp", 0,
        [`YTM : ${calcIY(2 * n, p, cpn * 50, 100, (yb * 100) / 2)} → YTM = ${P(yb, 3)}.`,
          `Benchmark 4 ans = (${P(g3)} + ${P(g5)}) / 2 = ${P(g)}.`,
          `G-spread = ${P(yb, 3)} − ${P(g)} = ${Bp(a, 0)}.`],
        1);
    })(),
    (() => {
      const cpn = 0.05, spots = [0.03, 0.035, 0.04], z = 0.012;
      const cfs = bondFlows(cpn * 100, 3);
      const a = pvSpot(cfs, spots.map((s) => s + z));
      return q("fi-spread-d2", "difficile", "Price per 100 of par value implied by the Z-spread?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", "3"], ["Government spot rates, years 1 / 2 / 3", lst(spots.map((s) => pc(s)))], ["Z-spread", bps(z * 10000)]],
        a, "", 3,
        [`On ajoute ${Bp(z * 10000, 0)} à chaque taux spot : ${spots.map((s) => P(s + z)).join(", ")}.`,
          `Prix = ${F(cfs[0])} / ${pw(spots[0] + z, 1)} + ${F(cfs[1])} / ${pw(spots[1] + z, 2)} + ${F(cfs[2])} / ${pw(spots[2] + z, 3)}.`,
          `= ${cfs.map((cf, i) => F(cf / Math.pow(1 + spots[i] + z, i + 1), 3)).join(" + ")} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const y3 = 0.039, y7a = 0.05, y7b = 0.054, t = 4, cpn = 0.045;
      const y7 = (y7a + y7b) / 2;
      const y = interp(3, y3, 7, y7, t);
      const a = price(cpn, y, t);
      return q("fi-spread-d3", "difficile", "Estimated price per 100 of par value of the nontraded bond (matrix pricing)?",
        [["Nontraded bond", `A-rated, ${t}-year, ${pc(cpn)} annual coupon`], ["A-rated 3-year bond YTM", pc(y3)],
          ["A-rated 7-year bond YTMs", lst([pc(y7a), pc(y7b)])]],
        a, "", 3,
        [`YTM moyen à 7 ans = (${P(y7a)} + ${P(y7b)}) / 2 = ${P(y7)}.`,
          `YTM interpolé à ${t} ans = ${P(y3)} + (${P(y7)} − ${P(y3)}) × (${t} − 3) / (7 − 3) = ${P(y, 3)}.`,
          `Calculatrice : ${calcPV(t, y * 100, cpn * 100, 100, a)}.`,
          `Prix estimé = ${F(a, 3)}.`]);
    })(),
    (() => {
      const yb = 0.0495, g3 = 0.034, g5 = 0.038, s3 = 0.037, s5 = 0.04;
      const g = interp(3, g3, 5, g5, 4), s = interp(3, s3, 5, s5, 4);
      const G = (yb - g) * 10000, I = (yb - s) * 10000;
      const a = G - I;
      return q("fi-spread-d4", "difficile", "G-spread minus I-spread of the 4-year bond?",
        [["4-year bond YTM", pc(yb)], ["Government YTMs, 3-year / 5-year", lst([pc(g3), pc(g5)])], ["Swap rates, 3-year / 5-year", lst([pc(s3), pc(s5)])]],
        a, "bp", 0,
        [`Gouvernement 4 ans = ${P(g, 3)} → G-spread = ${Bp(G, 0)}.`,
          `Swap 4 ans = ${P(s, 3)} → I-spread = ${Bp(I, 0)}.`,
          `Écart = ${Bp(G, 0)} − ${Bp(I, 0)} = ${Bp(a, 0)} (c'est le swap spread à 4 ans).`]);
    })(),
    (() => {
      const y5c = 0.056, g4 = 0.038, g6 = 0.042, g7 = 0.0435, cpn = 0.05, n = 7;
      const g5 = interp(4, g4, 6, g6, 5);
      const s = y5c - g5;
      const y = g7 + s;
      const a = price(cpn, y, n);
      return q("fi-spread-d5", "difficile", "Estimated price per 100 of par value of the issuer's new 7-year bond?",
        [["Issuer's existing 5-year bond YTM", pc(y5c)], ["Government YTMs, 4-year / 6-year / 7-year", lst([pc(g4), pc(g6), pc(g7)])],
          ["New bond", `${n}-year, ${pc(cpn)} annual coupon`]],
        a, "", 3,
        [`Benchmark 5 ans = (${P(g4)} + ${P(g6)}) / 2 = ${P(g5)} ; spread de l'émetteur = ${P(y5c)} − ${P(g5)} = ${Bp(s * 10000, 0)}.`,
          `YTM requis à 7 ans = ${P(g7)} + ${P(s)} = ${P(y, 3)}.`,
          `Calculatrice : ${calcPV(n, y * 100, cpn * 100, 100, a)}.`,
          `Prix estimé = ${F(a, 3)}.`]);
    })(),
  ],
};

/* ────────────────────────── 7 · Taux spot ────────────────────────── */

const SPOT: CalcType = {
  key: "spot-rates",
  topic: "fixed_income",
  name: "Taux spot : prix sans arbitrage et taux par",
  tier: "essentiel",
  source: "LM 9 · The Term Structure of Interest Rates: Spot, Par, and Forward Curves",
  formulas: [
    "Prix (no-arbitrage) = Σ CF_t / (1 + S_t)^t",
    "Facteur d'actualisation DF_t = 1 / (1 + S_t)^t",
    "Taux par à N ans = (1 − DF_N) / (DF_1 + … + DF_N)",
    "Zéro-coupon : S_N = (100 / prix)^(1/N) − 1",
  ],
  traps: [
    "Chaque flux s'actualise à SON taux spot, pas à un taux unique.",
    "Courbe croissante : taux par légèrement sous les taux spot ; le YTM est une moyenne pondérée des spots.",
    "Bootstrapping : on retire d'abord la valeur des coupons déjà connus.",
  ],
  questions: [
    (() => {
      const cpn = 0.04, spots = [0.025, 0.032, 0.038];
      const cfs = bondFlows(cpn * 100, 3);
      const a = pvSpot(cfs, spots);
      return q("fi-spot-f1", "facile", "No-arbitrage price per 100 of par value?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", "3"], ["Spot rates, years 1 / 2 / 3", lst(spots.map((s) => pc(s)))]],
        a, "", 3,
        [`Prix = ${F(cfs[0])} / ${pw(spots[0], 1)} + ${F(cfs[1])} / ${pw(spots[1], 2)} + ${F(cfs[2])} / ${pw(spots[2], 3)}.`,
          `= ${cfs.map((cf, i) => F(cf / Math.pow(1 + spots[i], i + 1), 3)).join(" + ")} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.06, spots = [0.04, 0.05];
      const cfs = bondFlows(cpn * 100, 2);
      const a = pvSpot(cfs, spots);
      return q("fi-spot-f2", "facile", "No-arbitrage price per 100 of par value?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", "2"], ["Spot rates, years 1 / 2", lst(spots.map((s) => pc(s)))]],
        a, "", 3,
        [`Prix = ${F(cfs[0])} / ${pw(spots[0], 1)} + ${F(cfs[1])} / ${pw(spots[1], 2)}.`,
          `= ${cfs.map((cf, i) => F(cf / Math.pow(1 + spots[i], i + 1), 3)).join(" + ")} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const p = 89.5, n = 3;
      const a = (Math.pow(100 / p, 1 / n) - 1) * 100;
      return q("fi-spot-f3", "facile", "3-year spot rate implied by the zero-coupon price?",
        [["3-year zero-coupon price (per 100 par)", E(p, 2)]],
        a, "%", 3,
        [`S₃ = (100 / ${F(p, 2)})^(1/3) − 1 = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const s = 0.0425, t = 4;
      const a = 1 / Math.pow(1 + s, t);
      return q("fi-spot-f4", "facile", "4-year discount factor?",
        [["4-year spot rate", pc(s)]],
        a, "", 4,
        [`DF₄ = 1 / ${pw(s, 4)} = ${F(a, 4)}.`]);
    })(),
    (() => {
      const fv = 1000, s = 0.036, t = 3;
      const a = fv / Math.pow(1 + s, t);
      return q("fi-spot-f5", "facile", "Price of the zero-coupon bond?",
        [["Face value", usd(fv)], ["Years to maturity", E(t)], ["3-year spot rate", pc(s)]],
        a, "$", 2,
        [`Prix = ${F(fv)} / ${pw(s, 3)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const spots = [0.02, 0.03, 0.035];
      const df = spots.map((s, i) => 1 / Math.pow(1 + s, i + 1));
      const a = ((1 - df[2]) / sum(df)) * 100;
      return q("fi-spot-m1", "moyen", "3-year par rate (annual pay)?",
        [["Spot rates, years 1 / 2 / 3", lst(spots.map((s) => pc(s)))]],
        a, "%", 3,
        [`Facteurs d'actualisation : ${df.map((x) => F(x, 5)).join(" ; ")}.`,
          `Taux par = (1 − ${F(df[2], 5)}) / (${df.map((x) => F(x, 5)).join(" + ")}) = ${F(1 - df[2], 5)} / ${F(sum(df), 5)}.`,
          `Taux par à 3 ans = ${Pa(a, 3)} (sous le spot à 3 ans).`]);
    })(),
    (() => {
      const cpn = 0.03, spots = [0.02, 0.026, 0.031, 0.035];
      const cfs = bondFlows(cpn * 100, 4);
      const a = pvSpot(cfs, spots);
      return q("fi-spot-m2", "moyen", "No-arbitrage price per 100 of par value?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", "4"], ["Spot rates, years 1 to 4", lst(spots.map((s) => pc(s)))]],
        a, "", 3,
        [`Valeurs actuelles : ${cfs.map((cf, i) => `${F(cf)} / ${pw(spots[i], i + 1)} = ${F(cf / Math.pow(1 + spots[i], i + 1), 3)}`).join(" ; ")}.`,
          `Prix = ${F(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.06, spots = [0.04, 0.048, 0.055];
      const cfs = bondFlows(cpn * 100, 3);
      const p = pvSpot(cfs, spots);
      const a = rateOf(p, cfs) * 100;
      return q("fi-spot-m3", "moyen", "Yield to maturity of the bond priced off the spot curve?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", "3"], ["Spot rates, years 1 / 2 / 3", lst(spots.map((s) => pc(s)))]],
        a, "%", 3,
        [`Prix = ${cfs.map((cf, i) => F(cf / Math.pow(1 + spots[i], i + 1), 3)).join(" + ")} = ${F(p, 3)}.`,
          `Calculatrice : ${calcIY(3, p, cpn * 100, 100, a)}.`,
          `YTM = ${Pa(a, 3)}, proche du spot à 3 ans car l'essentiel des flux tombe en année 3.`]);
    })(),
    (() => {
      const cpn = 0.04, spots = [0.03, 0.032, 0.035];
      const cfs = bondFlows(cpn * 50, 3);
      const half = spots.map((s) => s / 2);
      const a = pvSpot(cfs, half);
      return q("fi-spot-m4", "moyen", "No-arbitrage price per 100 of par value?",
        [["Coupon rate (semiannual pay)", pc(cpn)], ["Maturity", "1.5 years"], ["Spot rates for 0.5 / 1 / 1.5 years (semiannual bond basis)", lst(spots.map((s) => pc(s)))]],
        a, "", 3,
        [`Par semestre : coupon = ${F(cpn * 50)}, taux spot semestriels ${half.map((s) => P(s, 2)).join(", ")}.`,
          `Prix = ${F(cfs[0])} / ${pw(half[0], 1)} + ${F(cfs[1])} / ${pw(half[1], 2)} + ${F(cfs[2])} / ${pw(half[2], 3)}.`,
          `= ${F(a, 3)}.`]);
    })(),
    (() => {
      const s1 = 0.03, cpn = 0.05, p = 101.8;
      const pv1 = (cpn * 100) / (1 + s1);
      const a = (Math.sqrt((100 + cpn * 100) / (p - pv1)) - 1) * 100;
      return q("fi-spot-m5", "moyen", "2-year spot rate (bootstrapping)?",
        [["1-year spot rate", pc(s1)], ["2-year bond", `${pc(cpn)} annual coupon, price ${E(p, 2)}`]],
        a, "%", 3,
        [`Valeur du premier coupon = ${F(cpn * 100)} / ${F(1 + s1)} = ${F(pv1, 4)}.`,
          `${F(100 + cpn * 100)} / (1 + S₂)² = ${F(p, 2)} − ${F(pv1, 4)} = ${F(p - pv1, 4)}.`,
          `S₂ = (${F(100 + cpn * 100)} / ${F(p - pv1, 4)})^(1/2) − 1 = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.055, spots = [0.042, 0.05, 0.058], mkt = 99.5;
      const cfs = bondFlows(cpn * 100, 3);
      const v = pvSpot(cfs, spots);
      const a = mkt - v;
      return q("fi-spot-d1", "difficile", "Market price minus no-arbitrage value, per 100 of par value?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", "3"], ["Spot rates, years 1 / 2 / 3", lst(spots.map((s) => pc(s)))], ["Market price", E(mkt, 2)]],
        a, "", 3,
        [`Valeur sans arbitrage = ${cfs.map((cf, i) => F(cf / Math.pow(1 + spots[i], i + 1), 3)).join(" + ")} = ${F(v, 3)}.`,
          `Écart = ${F(mkt, 2)} − ${F(v, 3)} = ${F(a, 3)} : ${a > 0 ? "l'obligation est surévaluée (à vendre, en achetant les flux démembrés)" : "l'obligation est sous-évaluée (à acheter)"}.`]);
    })(),
    (() => {
      const s1 = 0.025, s2 = 0.03, cpn = 0.04, p = 102.1;
      const pv12 = (cpn * 100) / (1 + s1) + (cpn * 100) / Math.pow(1 + s2, 2);
      const a = (Math.pow((100 + cpn * 100) / (p - pv12), 1 / 3) - 1) * 100;
      return q("fi-spot-d2", "difficile", "3-year spot rate (bootstrapping)?",
        [["1-year spot rate", pc(s1)], ["2-year spot rate", pc(s2)], ["3-year bond", `${pc(cpn)} annual coupon, price ${E(p, 2)}`]],
        a, "%", 3,
        [`Valeur des deux premiers coupons = ${F(cpn * 100)} / ${F(1 + s1)} + ${F(cpn * 100)} / ${pw(s2, 2)} = ${F(pv12, 4)}.`,
          `${F(100 + cpn * 100)} / (1 + S₃)³ = ${F(p, 2)} − ${F(pv12, 4)} = ${F(p - pv12, 4)}.`,
          `S₃ = (${F(100 + cpn * 100)} / ${F(p - pv12, 4)})^(1/3) − 1 = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const spots = [0.03, 0.034, 0.037, 0.039];
      const df = spots.map((s, i) => 1 / Math.pow(1 + s, i + 1));
      const a = ((1 - df[3]) / sum(df)) * 100;
      return q("fi-spot-d3", "difficile", "4-year par rate (annual pay)?",
        [["Spot rates, years 1 to 4", lst(spots.map((s) => pc(s)))]],
        a, "%", 3,
        [`Facteurs d'actualisation : ${df.map((x) => F(x, 5)).join(" ; ")} (somme ${F(sum(df), 5)}).`,
          `Le coupon c d'une obligation au pair vérifie c × ${F(sum(df), 5)} + 100 × ${F(df[3], 5)} = 100.`,
          `c = (1 − ${F(df[3], 5)}) / ${F(sum(df), 5)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const par = 2000000, cpn = 0.045, spots = [0.03, 0.033, 0.036, 0.039, 0.041], yc = 0.042;
      const cfs = bondFlows(cpn * 100, 5);
      const v = pvSpot(cfs, spots);
      const a = (par * v) / 100;
      return q("fi-spot-d4", "difficile", "No-arbitrage value of the position?",
        [["Par value held", usd(par)], ["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", "5"],
          ["Spot rates, years 1 to 5", lst(spots.map((s) => pc(s)))], ["YTM of a similar corporate bond", pc(yc)]],
        a, "$", 0,
        ["Le YTM d'une autre obligation ne sert pas : on actualise chaque flux à son taux spot.",
          `Pour 100 : ${cfs.map((cf, i) => F(cf / Math.pow(1 + spots[i], i + 1), 3)).join(" + ")} = ${F(v, 4)}.`,
          `Position = ${D(par)} × ${F(v, 4)} % = ${D(a, 0)}.`]);
    })(),
    (() => {
      const zp = [97.5, 94.6, 91.2], cpn = 0.06;
      const cfs = bondFlows(cpn * 100, 3);
      const p = sum(cfs.map((cf, i) => (cf * zp[i]) / 100));
      const a = rateOf(p, cfs) * 100;
      return q("fi-spot-d5", "difficile", "Yield to maturity of the 3-year bond?",
        [["Zero-coupon prices, years 1 / 2 / 3 (per 100)", lst(zp.map((x) => E(x, 2)))], ["Bond", `3-year, ${pc(cpn)} annual coupon`]],
        a, "%", 3,
        [`Chaque prix de zéro est un facteur d'actualisation : ${zp.map((x) => F(x / 100, 3)).join(" ; ")}.`,
          `Prix = ${F(cfs[0])} × ${F(zp[0] / 100, 3)} + ${F(cfs[1])} × ${F(zp[1] / 100, 3)} + ${F(cfs[2])} × ${F(zp[2] / 100, 3)} = ${F(p, 3)}.`,
          `Calculatrice : ${calcIY(3, p, cpn * 100, 100, a)}.`,
          `YTM = ${Pa(a, 3)}.`]);
    })(),
  ],
};

/* ────────────────────────── 8 · Taux forward ────────────────────────── */

const FORWARD: CalcType = {
  key: "forward-rates",
  topic: "fixed_income",
  name: "Taux forward implicites (forward rates)",
  tier: "essentiel",
  top: true,
  source: "LM 9 · The Term Structure of Interest Rates: Spot, Par, and Forward Curves",
  formulas: [
    "(1 + S_b)^b = (1 + S_a)^a × (1 + f_a,b−a)^(b−a)",
    "1y1y = (1 + S₂)² / (1 + S₁) − 1",
    "Spot à partir des forwards : S_N = [(1 + S₁)(1 + 1y1y) … (1 + (N−1)y1y)]^(1/N) − 1",
    "Prix avec forwards : chaque flux s'actualise par le produit des (1 + forward) jusqu'à sa date",
  ],
  traps: [
    "Notation « AyBy » : le prêt commence dans A ans et dure B ans.",
    "Forward sur plusieurs années : prendre la racine (b − a)-ième du rapport.",
    "Approximation f ≈ (b × S_b − a × S_a) / (b − a) : seulement pour vérifier l'ordre de grandeur.",
  ],
  questions: [
    (() => {
      const s1 = 0.02, s2 = 0.035;
      const a = fwd(s1, 1, s2, 2) * 100;
      return q("fi-fwd-f1", "facile", "1y1y forward rate?",
        [["1-year spot rate", pc(s1)], ["2-year spot rate", pc(s2)]],
        a, "%", 3,
        [`(1 + 1y1y) = ${pw(s2, 2)} / ${F(1 + s1)} = ${F(Math.pow(1 + s2, 2), 6)} / ${F(1 + s1)}.`,
          `1y1y = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const s2 = 0.03, s3 = 0.042;
      const a = fwd(s2, 2, s3, 3) * 100;
      return q("fi-fwd-f2", "facile", "2y1y forward rate?",
        [["2-year spot rate", pc(s2)], ["3-year spot rate", pc(s3)]],
        a, "%", 3,
        [`(1 + 2y1y) = ${pw(s3, 3)} / ${pw(s2, 2)} = ${F(Math.pow(1 + s3, 3), 6)} / ${F(Math.pow(1 + s2, 2), 6)}.`,
          `2y1y = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const s1 = 0.015, f11 = 0.05;
      const a = (Math.sqrt((1 + s1) * (1 + f11)) - 1) * 100;
      return q("fi-fwd-f3", "facile", "2-year spot rate?",
        [["1-year spot rate", pc(s1)], ["1y1y forward rate", pc(f11)]],
        a, "%", 3,
        [`(1 + S₂)² = ${F(1 + s1)} × ${F(1 + f11)} = ${F((1 + s1) * (1 + f11), 6)}.`,
          `S₂ = ${F((1 + s1) * (1 + f11), 6)}^(1/2) − 1 = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const s3 = 0.055, s4 = 0.048;
      const a = fwd(s3, 3, s4, 4) * 100;
      return q("fi-fwd-f4", "facile", "3y1y forward rate?",
        [["3-year spot rate", pc(s3)], ["4-year spot rate", pc(s4)]],
        a, "%", 3,
        [`(1 + 3y1y) = ${pw(s4, 4)} / ${pw(s3, 3)} = ${F(Math.pow(1 + s4, 4), 6)} / ${F(Math.pow(1 + s3, 3), 6)}.`,
          `3y1y = ${Pa(a, 3)} : courbe inversée, le forward est sous les spots.`]);
    })(),
    (() => {
      const rs = [0.01, 0.035, 0.06];
      const a = (Math.pow(rs.reduce((p, r) => p * (1 + r), 1), 1 / 3) - 1) * 100;
      return q("fi-fwd-f5", "facile", "3-year spot rate?",
        [["1-year spot rate", pc(rs[0])], ["1y1y forward rate", pc(rs[1])], ["2y1y forward rate", pc(rs[2])]],
        a, "%", 3,
        [`(1 + S₃)³ = ${rs.map((r) => F(1 + r)).join(" × ")} = ${F(rs.reduce((p, r) => p * (1 + r), 1), 6)}.`,
          `S₃ = ${F(rs.reduce((p, r) => p * (1 + r), 1), 6)}^(1/3) − 1 = ${Pa(a, 3)} (moyenne géométrique).`]);
    })(),
    (() => {
      const s2 = 0.035, s4 = 0.046;
      const a = fwd(s2, 2, s4, 4) * 100;
      return q("fi-fwd-m1", "moyen", "2y2y forward rate (annualized)?",
        [["2-year spot rate", pc(s2)], ["4-year spot rate", pc(s4)]],
        a, "%", 3,
        [`(1 + 2y2y)² = ${pw(s4, 4)} / ${pw(s2, 2)} = ${F(Math.pow(1 + s4, 4) / Math.pow(1 + s2, 2), 6)}.`,
          `2y2y = ${F(Math.pow(1 + s4, 4) / Math.pow(1 + s2, 2), 6)}^(1/2) − 1 = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const s1 = 0.016, s3 = 0.04;
      const a = fwd(s1, 1, s3, 3) * 100;
      return q("fi-fwd-m2", "moyen", "1y2y forward rate (annualized)?",
        [["1-year spot rate", pc(s1)], ["3-year spot rate", pc(s3)]],
        a, "%", 3,
        [`(1 + 1y2y)² = ${pw(s3, 3)} / ${F(1 + s1)} = ${F(Math.pow(1 + s3, 3) / (1 + s1), 6)}.`,
          `1y2y = ${F(Math.pow(1 + s3, 3) / (1 + s1), 6)}^(1/2) − 1 = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.045, rs = [0.035, 0.044, 0.052];
      const f1 = 1 + rs[0], f2 = f1 * (1 + rs[1]), f3 = f2 * (1 + rs[2]);
      const a = (cpn * 100) / f1 + (cpn * 100) / f2 + (100 + cpn * 100) / f3;
      return q("fi-fwd-m3", "moyen", "Value per 100 of par value using the forward rates?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", "3"], ["1-year spot / 1y1y / 2y1y", lst(rs.map((r) => pc(r)))]],
        a, "", 3,
        [`Facteurs : ${F(f1, 6)} ; ${F(f1)} × ${F(1 + rs[1])} = ${F(f2, 6)} ; × ${F(1 + rs[2])} = ${F(f3, 6)}.`,
          `Valeur = ${F(cpn * 100)} / ${F(f1, 6)} + ${F(cpn * 100)} / ${F(f2, 6)} + ${F(100 + cpn * 100)} / ${F(f3, 6)}.`,
          `= ${F(a, 3)}.`]);
    })(),
    (() => {
      const rs = [0.008, 0.028, 0.048, 0.068];
      const prod = rs.reduce((p, r) => p * (1 + r), 1);
      const a = (Math.pow(prod, 1 / 4) - 1) * 100;
      return q("fi-fwd-m4", "moyen", "4-year spot rate?",
        [["1-year spot rate", pc(rs[0])], ["1y1y / 2y1y / 3y1y forward rates", lst(rs.slice(1).map((r) => pc(r)))]],
        a, "%", 3,
        [`(1 + S₄)⁴ = ${rs.map((r) => F(1 + r)).join(" × ")} = ${F(prod, 6)}.`,
          `S₄ = ${F(prod, 6)}^(1/4) − 1 = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const s6 = 0.02, s12 = 0.04;
      const r1 = s6 / 2, r2 = s12 / 2;
      const f = Math.pow(1 + r2, 2) / (1 + r1) - 1;
      const a = 2 * f * 100;
      return q("fi-fwd-m5", "moyen", "6-month forward rate six months from now (semiannual bond basis)?",
        [["6-month spot rate (semiannual bond basis)", pc(s6)], ["1-year spot rate (semiannual bond basis)", pc(s12)]],
        a, "%", 3,
        [`Taux semestriels : ${P(r1, 2)} et ${P(r2, 2)}.`,
          `(1 + f) = ${pw(r2, 2)} / ${F(1 + r1)} → f = ${P(f, 4)} par semestre.`,
          `Forward annualisé = 2 × ${P(f, 4)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const s3 = 0.03, s5 = 0.042;
      const a = fwd(s3, 3, s5, 5) * 100;
      return q("fi-fwd-d1", "difficile", "3y2y forward rate (annualized)?",
        [["3-year spot rate", pc(s3)], ["5-year spot rate", pc(s5)]],
        a, "%", 3,
        [`(1 + 3y2y)² = ${pw(s5, 5)} / ${pw(s3, 3)} = ${F(Math.pow(1 + s5, 5), 6)} / ${F(Math.pow(1 + s3, 3), 6)} = ${F(Math.pow(1 + s5, 5) / Math.pow(1 + s3, 3), 6)}.`,
          `3y2y = ${F(Math.pow(1 + s5, 5) / Math.pow(1 + s3, 3), 6)}^(1/2) − 1 = ${Pa(a, 3)}.`,
          `L'approximation linéaire (5 × ${F(s5 * 100)} − 3 × ${F(s3 * 100)}) / 2 = ${Pa((5 * s5 * 100 - 3 * s3 * 100) / 2, 3)} ne sert qu'à vérifier l'ordre de grandeur.`]);
    })(),
    (() => {
      const par = 1000, cpn = 0.06, rs = [0.04, 0.051, 0.063], yd = 0.052;
      const f1 = 1 + rs[0], f2 = f1 * (1 + rs[1]), f3 = f2 * (1 + rs[2]);
      const c = cpn * par;
      const a = c / f1 + c / f2 + (par + c) / f3;
      return q("fi-fwd-d2", "difficile", "Value of the bond using the forward rates?",
        [["Par value", usd(par)], ["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", "3"],
          ["1-year spot / 1y1y / 2y1y", lst(rs.map((r) => pc(r)))], ["YTM of a comparable bond", pc(yd)]],
        a, "$", 2,
        ["Le YTM d'une autre obligation ne sert pas : on actualise avec les forwards.",
          `Facteurs cumulés : ${F(f1, 6)} ; ${F(f2, 6)} ; ${F(f3, 6)}.`,
          `Valeur = ${F(c)} / ${F(f1, 6)} + ${F(c)} / ${F(f2, 6)} + ${F(par + c)} / ${F(f3, 6)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s1 = 0.01, s2 = 0.032, f21 = 0.06;
      const g3 = Math.pow(1 + s2, 2) * (1 + f21);
      const a = (Math.sqrt(g3 / (1 + s1)) - 1) * 100;
      return q("fi-fwd-d3", "difficile", "1y2y forward rate (annualized)?",
        [["1-year spot rate", pc(s1)], ["2-year spot rate", pc(s2)], ["2y1y forward rate", pc(f21)]],
        a, "%", 3,
        [`(1 + S₃)³ = ${pw(s2, 2)} × ${F(1 + f21)} = ${F(g3, 6)}.`,
          `(1 + 1y2y)² = ${F(g3, 6)} / ${F(1 + s1)} = ${F(g3 / (1 + s1), 6)}.`,
          `1y2y = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const fv = 1000, s1 = 0.03, s3 = 0.04, s2 = 0.036;
      const g = Math.pow(1 + s3, 3) / (1 + s1);
      const a = fv / g;
      return q("fi-fwd-d4", "difficile", "Price one year from now of a zero-coupon bond maturing in 3 years, implied by today's spot curve?",
        [["Face value", usd(fv)], ["Spot rates, years 1 / 2 / 3", lst([pc(s1), pc(s2), pc(s3)])]],
        a, "$", 2,
        [`Dans un an, il restera 2 ans : on actualise avec 1y1y et 2y1y, dont le produit vaut (1 + S₃)³ / (1 + S₁).`,
          `(1 + 1y1y)(1 + 2y1y) = ${pw(s3, 3)} / ${F(1 + s1)} = ${F(g, 6)} (le spot à 2 ans ne sert pas ici).`,
          `Prix implicite = ${F(fv)} / ${F(g, 6)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const inv = 1000000, s1 = 0.035, s2 = 0.042, realized = 0.045;
      const roll = inv * (1 + s1) * (1 + realized);
      const lock = inv * Math.pow(1 + s2, 2);
      const a = roll - lock;
      return q("fi-fwd-d5", "difficile", "Ending value of rolling two 1-year investments minus ending value of the 2-year investment?",
        [["Amount invested", usd(inv)], ["1-year spot rate", pc(s1)], ["2-year spot rate", pc(s2)], ["1-year rate realized one year from now", pc(realized)]],
        a, "$", 0,
        [`Forward implicite 1y1y = ${pw(s2, 2)} / ${F(1 + s1)} − 1 = ${P(fwd(s1, 1, s2, 2), 3)} : c'est le taux d'équilibre.`,
          `Roll : ${D(inv)} × ${F(1 + s1)} × ${F(1 + realized)} = ${D(roll, 0)}.`,
          `2 ans : ${D(inv)} × ${pw(s2, 2)} = ${D(lock, 0)}.`,
          `Écart = ${D(a, 0)} : le taux réalisé (${P(realized)}) est ${realized > fwd(s1, 1, s2, 2) ? "au-dessus" : "en dessous"} du forward.`]);
    })(),
  ],
};

/* ────────────────────────── 9 · Rendement à horizon ────────────────────────── */

const HORIZON: CalcType = {
  key: "horizon-return",
  topic: "fixed_income",
  name: "Rendement à horizon, réinvestissement et carrying value",
  tier: "essentiel",
  source: "LM 10 · Interest Rate Risk and Return",
  formulas: [
    "Coupons réinvestis : FV = C × [(1 + r)^n − 1] / r (calculatrice : PV = 0, CPT FV)",
    "Horizon yield = [(coupons réinvestis + prix de revente) / prix d'achat]^(1/H) − 1",
    "Carrying value = prix au YTM d'achat à la date de revente ; gain = prix de vente − carrying value",
    "Duration gap = Macaulay duration − horizon de placement",
  ],
  traps: [
    "Le gain ou la perte en capital se mesure contre la carrying value, pas contre le prix d'achat.",
    "Horizon court : le risque de prix domine ; horizon long : le risque de réinvestissement domine.",
    "Horizon = Macaulay duration : les deux risques se compensent (pour un choc immédiat et unique).",
  ],
  questions: [
    (() => {
      const c = 5, r = 0.06, n = 4;
      const a = fvCoupons(c, r, n);
      return q("fi-hor-f1", "facile", "Future value of the coupons, reinvested until maturity (per 100 par)?",
        [["Annual coupon", E(c)], ["Coupons remaining", E(n)], ["Reinvestment rate", pc(r)]],
        a, "", 3,
        [`FV = ${F(c)} × ${pw(r, 3)} + ${F(c)} × ${pw(r, 2)} + ${F(c)} × ${F(1 + r)} + ${F(c)}.`,
          `Calculatrice : N = ${n} ; I/Y = ${F(r * 100)} ; PV = 0 ; PMT = ${F(c)} ; CPT FV = ${F(a, 3)}.`]);
    })(),
    (() => {
      const c = 50, r = 0.05, n = 10;
      const fv = fvCoupons(c, r, n);
      const a = fv - c * n;
      return q("fi-hor-f2", "facile", "Interest earned on reinvested coupons over the life of the bond?",
        [["Annual coupon", usd(c)], ["Years to maturity", E(n)], ["Reinvestment rate", pc(r)]],
        a, "$", 2,
        [`FV des coupons : N = ${n} ; I/Y = ${F(r * 100)} ; PMT = ${F(c)} ; CPT FV = ${D(fv, 2)}.`,
          `Intérêts sur intérêts = ${D(fv, 2)} − ${n} × ${D(c)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const mac = 6.8, h = 5;
      const a = mac - h;
      return q("fi-hor-f3", "facile", "Duration gap of the investment?",
        [["Macaulay duration of the bond", yrs(mac)], ["Investment horizon", yrs(h)]],
        a, "years", 2,
        [`Duration gap = ${F(mac)} − ${F(h)} = ${F(a, 2)} ans.`,
          "Gap positif : l'investisseur est exposé au risque de prix (hausse des taux)."]);
    })(),
    (() => {
      const p0 = 101.2, end = 132.5, h = 5;
      const a = (Math.pow(end / p0, 1 / h) - 1) * 100;
      return q("fi-hor-f4", "facile", "Annualized horizon yield?",
        [["Purchase price (per 100 par)", E(p0, 2)], ["Total value at the horizon (coupons, reinvestment, sale)", E(end, 2)], ["Horizon", yrs(h)]],
        a, "%", 3,
        [`Horizon yield = (${F(end, 2)} / ${F(p0, 2)})^(1/${h}) − 1.`,
          `= ${F(end / p0, 6)}^(1/${h}) − 1 = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const y = 0.06, n = 12, t = 4;
      const a = 100 / Math.pow(1 + y, n - t);
      return q("fi-hor-f5", "facile", "Carrying value of the zero-coupon bond after 4 years (per 100 par)?",
        [["Maturity at purchase", yrs(n)], ["YTM at purchase (annual compounding)", pc(y)], ["Time elapsed", yrs(t)]],
        a, "", 3,
        [`Carrying value = prix au YTM d'achat avec ${n - t} ans restants.`,
          `= 100 / ${pw(y, n - t)} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.06, y0 = 0.0675, n = 4, rr = 0.075;
      const p0 = price(cpn, y0, n);
      const fv = fvCoupons(cpn * 100, rr, n);
      const a = (Math.pow((fv + 100) / p0, 1 / n) - 1) * 100;
      return q("fi-hor-m1", "moyen", "Annualized realized return if the bond is held to maturity?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["YTM at purchase", pc(y0)],
          ["Reinvestment rate (YTM moves there just after purchase)", pc(rr)]],
        a, "%", 3,
        [`Prix d'achat : ${calcPV(n, y0 * 100, cpn * 100, 100, p0)}.`,
          `Coupons réinvestis à ${P(rr)} : N = ${n} ; PMT = ${F(cpn * 100)} ; CPT FV = ${F(fv, 3)}.`,
          `Rendement = ((${F(fv, 3)} + 100) / ${F(p0, 3)})^(1/${n}) − 1 = ${Pa(a, 3)}.`,
          "Détenue jusqu'à l'échéance, la hausse des taux profite via le réinvestissement."]);
    })(),
    (() => {
      const cpn = 0.045, y0 = 0.052, n = 15, t = 4, sale = 96.1;
      const cv = price(cpn, y0, n - t, 2);
      const a = sale - cv;
      return q("fi-hor-m2", "moyen", "Capital gain or loss on the sale (per 100 par; negative for a loss)?",
        [["Coupon rate (semiannual pay)", pc(cpn)], ["Maturity at purchase", yrs(n)], ["YTM at purchase", pc(y0)],
          ["Sold after", yrs(t)], ["Sale price", E(sale, 2)]],
        a, "", 3,
        [`Carrying value = prix au YTM d'achat avec ${n - t} ans restants : ${calcPV(2 * (n - t), y0 * 50, cpn * 50, 100, cv)}.`,
          `Gain = ${F(sale, 2)} − ${F(cv, 3)} = ${F(a, 3)} ${a >= 0 ? "(plus-value)" : "(moins-value)"}.`]);
    })(),
    (() => {
      const cpn = 0.06, y0 = 0.07, y1 = 0.08, n = 3;
      const p0 = price(cpn, y0, n);
      const p1 = price(cpn, y1, n - 1);
      const a = ((p1 + cpn * 100) / p0 - 1) * 100;
      return q("fi-hor-m3", "moyen", "One-year holding period return if the bond is sold right after the first coupon?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["YTM at purchase", pc(y0)], ["YTM just after purchase and at sale", pc(y1)]],
        a, "%", 3,
        [`Prix d'achat : ${calcPV(n, y0 * 100, cpn * 100, 100, p0)}.`,
          `Prix de vente (${n - 1} ans restants) : ${calcPV(n - 1, y1 * 100, cpn * 100, 100, p1)}.`,
          `Rendement = (${F(p1, 3)} + ${F(cpn * 100)}) / ${F(p0, 3)} − 1 = ${Pa(a, 3)} < ${P(y0)} : sur un horizon court, le risque de prix domine.`]);
    })(),
    (() => {
      const n = 10, y0 = 0.05, t = 3, y1 = 0.045;
      const p0 = 100 / Math.pow(1 + y0, n);
      const p1 = 100 / Math.pow(1 + y1, n - t);
      const a = (Math.pow(p1 / p0, 1 / t) - 1) * 100;
      return q("fi-hor-m4", "moyen", "Annualized return on the zero-coupon bond over the 3-year holding period?",
        [["Maturity at purchase", yrs(n)], ["YTM at purchase (annual compounding)", pc(y0)], ["Sold after", yrs(t)], ["YTM at sale", pc(y1)]],
        a, "%", 3,
        [`Prix d'achat = 100 / ${pw(y0, n)} = ${F(p0, 3)}.`,
          `Prix de vente = 100 / ${pw(y1, n - t)} = ${F(p1, 3)}.`,
          `Rendement annualisé = (${F(p1, 3)} / ${F(p0, 3)})^(1/${t}) − 1 = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.04, y = 0.05, n = 5, h = 2;
      const p0 = price(cpn, y, n);
      const ph = price(cpn, y, n - h);
      const fv = fvCoupons(cpn * 100, y, h);
      const a = (Math.pow((ph + fv) / p0, 1 / h) - 1) * 100;
      return q("fi-hor-m5", "moyen", "Annualized horizon yield over 2 years?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["YTM at purchase", pc(y)],
          ["YTM at sale and reinvestment rate", pc(y)], ["Horizon", yrs(h)]],
        a, "%", 3,
        [`Prix d'achat : ${calcPV(n, y * 100, cpn * 100, 100, p0)}.`,
          `Prix de vente (${n - h} ans restants, même YTM = carrying value) : ${F(ph, 3)}.`,
          `Coupons réinvestis : ${F(cpn * 100)} × ${F(1 + y)} + ${F(cpn * 100)} = ${F(fv, 3)}.`,
          `Horizon yield = ((${F(ph, 3)} + ${F(fv, 3)}) / ${F(p0, 3)})^(1/${h}) − 1 = ${Pa(a, 3)} : YTM inchangé → rendement = YTM d'achat.`]);
    })(),
    (() => {
      const cpn = 0.09, y0 = 0.1, y1 = 0.09, n = 5, h = 3;
      const p0 = price(cpn, y0, n);
      const ph = price(cpn, y1, n - h);
      const fv = fvCoupons(cpn * 100, y1, h);
      const a = (Math.pow((ph + fv) / p0, 1 / h) - 1) * 100;
      return q("fi-hor-d1", "difficile", "Annualized horizon yield over 3 years?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["YTM at purchase", pc(y0)],
          ["YTM just after purchase (also the reinvestment rate)", pc(y1)], ["Horizon", yrs(h)]],
        a, "%", 3,
        [`Prix d'achat : ${calcPV(n, y0 * 100, cpn * 100, 100, p0)}.`,
          `Prix de vente dans ${h} ans : ${calcPV(n - h, y1 * 100, cpn * 100, 100, ph)}.`,
          `Coupons réinvestis à ${P(y1)} : N = ${h} ; PMT = ${F(cpn * 100)} ; CPT FV = ${F(fv, 3)}.`,
          `Horizon yield = ((${F(ph, 3)} + ${F(fv, 3)}) / ${F(p0, 3)})^(1/${h}) − 1 = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.05, y0 = 0.055, y1 = 0.06, n = 6, h = 4;
      const p0 = price(cpn, y0, n, 2);
      const ph = price(cpn, y1, n - h, 2);
      const fv = fvCoupons(cpn * 50, y1 / 2, 2 * h);
      const periodic = Math.pow((ph + fv) / p0, 1 / (2 * h)) - 1;
      const a = 2 * periodic * 100;
      return q("fi-hor-d2", "difficile", "Annualized horizon yield (semiannual bond basis)?",
        [["Coupon rate (semiannual pay)", pc(cpn)], ["Years to maturity", E(n)], ["YTM at purchase", pc(y0)],
          ["YTM just after purchase (also the reinvestment rate)", pc(y1)], ["Horizon", yrs(h)]],
        a, "%", 3,
        [`Prix d'achat : ${calcPV(2 * n, y0 * 50, cpn * 50, 100, p0)}.`,
          `Prix de vente : ${calcPV(2 * (n - h), y1 * 50, cpn * 50, 100, ph)}.`,
          `${2 * h} coupons réinvestis à ${P(y1 / 2)} par semestre : CPT FV = ${F(fv, 3)}.`,
          `Rendement semestriel = ((${F(ph, 3)} + ${F(fv, 3)}) / ${F(p0, 3)})^(1/${2 * h}) − 1 = ${P(periodic, 4)}.`,
          `Base semestrielle = 2 × ${P(periodic, 4)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const par = 2000000, cpn = 0.06, y0 = 0.05, y1 = 0.058, n = 8, t = 3;
      const p0 = price(cpn, y0, n);
      const cv = price(cpn, y0, n - t);
      const sale = price(cpn, y1, n - t);
      const a = ((sale - cv) * par) / 100;
      return q("fi-hor-d3", "difficile", "Capital gain or loss on the position at the sale, measured against carrying value (negative for a loss)?",
        [["Par value", usd(par)], ["Coupon rate (annual pay)", pc(cpn)], ["Maturity at purchase", yrs(n)],
          ["YTM at purchase", pc(y0)], ["Purchase price (per 100 par)", E(rd(p0, 3), 3)], ["Sold after / YTM at sale", lst([yrs(t), pc(y1)])]],
        a, "$", 0,
        [`Carrying value (${n - t} ans restants, YTM d'achat) : ${calcPV(n - t, y0 * 100, cpn * 100, 100, cv)}.`,
          `Prix de vente : ${calcPV(n - t, y1 * 100, cpn * 100, 100, sale)}.`,
          `Le prix d'achat ne sert pas : la prime s'amortit le long de la carrying value.`,
          `Résultat = (${F(sale, 3)} − ${F(cv, 3)}) % × ${D(par)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const cpn = 0.07, y0 = 0.08, y1 = 0.09, n = 6, h = 4;
      const p0 = price(cpn, y0, n);
      const ph = price(cpn, y1, n - h);
      const fv = fvCoupons(cpn * 100, y1, h);
      const a = (Math.pow((ph + fv) / p0, 1 / h) - 1) * 100;
      const mac = durStats(bondFlows(cpn * 100, n), y0).mac;
      return q("fi-hor-d4", "difficile", "Annualized horizon yield over 4 years?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["YTM at purchase", pc(y0)],
          ["YTM just after purchase (also the reinvestment rate)", pc(y1)], ["Horizon", yrs(h)]],
        a, "%", 3,
        [`Prix d'achat : ${calcPV(n, y0 * 100, cpn * 100, 100, p0)}.`,
          `Prix de vente : ${calcPV(n - h, y1 * 100, cpn * 100, 100, ph)}.`,
          `Coupons réinvestis : N = ${h} ; I/Y = ${F(y1 * 100)} ; PMT = ${F(cpn * 100)} ; CPT FV = ${F(fv, 3)}.`,
          `Horizon yield = ((${F(ph, 3)} + ${F(fv, 3)}) / ${F(p0, 3)})^(1/${h}) − 1 = ${Pa(a, 3)}.`,
          `Horizon (${h} ans) inférieur à la Macaulay duration (${F(mac, 2)} ans) : le risque de prix l'emporte, le rendement passe sous le YTM d'achat de ${P(y0)}.`]);
    })(),
    (() => {
      const cpn = 0.06, y = 0.05, n = 4, h = 2;
      const st = durStats(bondFlows(cpn * 100, n), y);
      const a = st.mac - h;
      return q("fi-hor-d5", "difficile", "Duration gap of the investment?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)], ["Investment horizon", yrs(h)]],
        a, "years", 3,
        [`Poids (PV / prix ${F(st.p, 3)}) : ${st.w.map((w) => F(w, 4)).join(" ; ")}.`,
          `Macaulay = ${st.w.map((w, i) => `${i + 1} × ${F(w, 4)}`).join(" + ")} = ${F(st.mac, 3)} ans.`,
          `Duration gap = ${F(st.mac, 3)} − ${h} = ${F(a, 3)} ans (positif : risque de prix dominant).`]);
    })(),
  ],
};

/* ────────────────────────── 10 · Duration de Macaulay et duration modifiée ────────────────────────── */

const MACAULAY: CalcType = {
  key: "macaulay-modified-duration",
  topic: "fixed_income",
  name: "Duration de Macaulay et duration modifiée",
  tier: "essentiel",
  top: true,
  source: "LM 11 · Yield-Based Bond Duration Measures and Properties",
  formulas: [
    "Macaulay duration = Σ t × PV(CF_t) / prix (en périodes ; diviser par m pour des années)",
    "Modified duration = Macaulay / (1 + YTM / m)",
    "%ΔP ≈ −ModDur × ΔYTM",
    "Zéro-coupon : Macaulay = maturité ; perpétuité : Macaulay = (1 + r) / r",
  ],
  traps: [
    "Semestriel : Macaulay en semestres à diviser par 2, puis ModDur = Macaulay / (1 + YTM / 2).",
    "Les poids sont les PV des flux divisées par le prix, pas les flux bruts.",
    "Entre deux coupons, Macaulay = Macaulay au dernier coupon − t/T.",
  ],
  questions: [
    (() => {
      const mac = 6.42, y = 0.055;
      const a = mac / (1 + y);
      return q("fi-dur-f1", "facile", "Modified duration?",
        [["Macaulay duration", yrs(mac)], ["Yield to maturity (annual pay)", pc(y)]],
        a, "", 3,
        [`ModDur = ${F(mac)} / ${F(1 + y)} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const mac = 8.1, y = 0.06;
      const a = mac / (1 + y / 2);
      return q("fi-dur-f2", "facile", "Modified duration?",
        [["Macaulay duration (annualized)", yrs(mac)], ["Yield to maturity (semiannual bond basis)", pc(y)]],
        a, "", 3,
        [`Semestriel : on divise par 1 + YTM / 2 = ${F(1 + y / 2)}.`,
          `ModDur = ${F(mac)} / ${F(1 + y / 2)} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const n = 7, y = 0.04;
      const a = n / (1 + y);
      return q("fi-dur-f3", "facile", "Modified duration of the zero-coupon bond?",
        [["Years to maturity", E(n)], ["Yield to maturity (annual compounding)", pc(y)], ["Coupon", "Zero-coupon"]],
        a, "", 3,
        [`Zéro-coupon : Macaulay = maturité = ${n} ans.`,
          `ModDur = ${n} / ${F(1 + y)} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const md = 7.2, dy = 35;
      const a = -md * (dy / 10000) * 100;
      return q("fi-dur-f4", "facile", "Approximate percentage price change?",
        [["Modified duration", E(md)], ["Change in YTM", `+${bps(dy)}`]],
        a, "%", 2,
        [`%ΔP ≈ −${F(md)} × ${F(dy / 10000)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const r = 0.05;
      const a = (1 + r) / r;
      return q("fi-dur-f5", "facile", "Macaulay duration of the perpetual bond?",
        [["Yield (annual pay)", pc(r)], ["Maturity", "Perpetual"]],
        a, "years", 2,
        [`Perpétuité : Macaulay = (1 + r) / r = ${F(1 + r)} / ${F(r)} = ${F(a, 2)} ans.`]);
    })(),
    (() => {
      const cpn = 0.05, y = 0.06, n = 3;
      const st = durStats(bondFlows(cpn * 100, n), y);
      const a = st.mac;
      return q("fi-dur-m1", "moyen", "Macaulay duration?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)]],
        a, "years", 3,
        [`PV des flux : ${st.pvs.map((x) => F(x, 4)).join(" ; ")} (prix ${F(st.p, 4)}).`,
          `Poids : ${st.w.map((w) => F(w, 4)).join(" ; ")}.`,
          `Macaulay = ${st.w.map((w, i) => `${i + 1} × ${F(w, 4)}`).join(" + ")} = ${F(a, 3)} ans.`]);
    })(),
    (() => {
      const cpn = 0.06, y = 0.04, n = 2;
      const st = durStats(bondFlows(cpn * 50, 2 * n), y / 2);
      const a = st.mac / 2;
      return q("fi-dur-m2", "moyen", "Macaulay duration in years?",
        [["Coupon rate (semiannual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)]],
        a, "years", 3,
        [`Par semestre : flux ${bondFlows(cpn * 50, 2 * n).map((x) => F(x)).join(" ; ")}, actualisés à ${P(y / 2)}.`,
          `Poids : ${st.w.map((w) => F(w, 4)).join(" ; ")}.`,
          `Macaulay = ${F(st.mac, 4)} semestres, soit ${F(st.mac, 4)} / 2 = ${F(a, 3)} ans.`]);
    })(),
    (() => {
      const cpn = 0.08, y = 0.06, n = 4;
      const st = durStats(bondFlows(cpn * 100, n), y);
      const a = st.mod;
      return q("fi-dur-m3", "moyen", "Modified duration?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)]],
        a, "", 3,
        [`Poids (PV / prix ${F(st.p, 4)}) : ${st.w.map((w) => F(w, 4)).join(" ; ")}.`,
          `Macaulay = ${F(st.mac, 4)} ans.`,
          `ModDur = ${F(st.mac, 4)} / ${F(1 + y)} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.04, y = 0.04, n = 3, dy = 0.005;
      const st = durStats(bondFlows(cpn * 100, n), y);
      const a = -st.mod * dy * 100;
      return q("fi-dur-m4", "moyen", "Approximate percentage price change for a 50 bp rise in yield, using modified duration?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)]],
        a, "%", 3,
        [`Au pair : poids ${st.w.map((w) => F(w, 4)).join(" ; ")} → Macaulay = ${F(st.mac, 4)} ans.`,
          `ModDur = ${F(st.mac, 4)} / ${F(1 + y)} = ${F(st.mod, 4)}.`,
          `%ΔP ≈ −${F(st.mod, 4)} × ${F(dy)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const p0 = 98.4, md = 6.1, dy = -0.0025;
      const a = p0 * (1 - md * dy);
      return q("fi-dur-m5", "moyen", "Estimated new price after the yield change (duration only)?",
        [["Current price (per 100 par)", E(p0, 2)], ["Modified duration", E(md)], ["Change in YTM", `${MINUS}25 bp`]],
        a, "", 3,
        [`%ΔP ≈ −${F(md)} × (−${F(-dy)}) = +${P(-md * dy, 3)}.`,
          `Nouveau prix ≈ ${F(p0, 2)} × (1 + ${F(-md * dy, 5)}) = ${F(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.09, y = 0.12, n = 5;
      const st = durStats(bondFlows(cpn * 100, n), y);
      const a = st.mac;
      return q("fi-dur-d1", "difficile", "Macaulay duration?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)]],
        a, "years", 3,
        [`PV des flux : ${st.pvs.map((x) => F(x, 3)).join(" ; ")} ; prix = ${F(st.p, 3)}.`,
          `Poids : ${st.w.map((w) => F(w, 4)).join(" ; ")}.`,
          `Macaulay = ${st.w.map((w, i) => `${i + 1} × ${F(w, 4)}`).join(" + ")} = ${F(a, 3)} ans.`]);
    })(),
    (() => {
      const cpn = 0.06, y = 0.07, n = 3;
      const st = durStats(bondFlows(cpn * 50, 2 * n), y / 2);
      const macY = st.mac / 2;
      const a = macY / (1 + y / 2);
      return q("fi-dur-d2", "difficile", "Annualized modified duration?",
        [["Coupon rate (semiannual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)]],
        a, "", 3,
        [`${2 * n} flux semestriels de ${F(cpn * 50)} (+ 100 à la fin), actualisés à ${P(y / 2)} : prix = ${F(st.p, 4)}.`,
          `Macaulay = ${F(st.mac, 4)} semestres = ${F(macY, 4)} ans.`,
          `ModDur = ${F(macY, 4)} / ${F(1 + y / 2)} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.05, y = 0.06, n = 3, frac = 0.25;
      const st = durStats(bondFlows(cpn * 100, n), y);
      const a = st.mac - frac;
      return q("fi-dur-d3", "difficile", "Macaulay duration on the settlement date?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Coupons remaining", E(n)], ["Yield to maturity", pc(y)], ["Fraction of the coupon period elapsed (t/T)", E(frac)]],
        a, "years", 3,
        [`Au dernier coupon : poids ${st.w.map((w) => F(w, 4)).join(" ; ")} → Macaulay = ${F(st.mac, 4)} ans.`,
          `Les poids sont les mêmes à la date de règlement ; chaque flux est simplement ${F(frac)} an plus proche.`,
          `Macaulay = ${F(st.mac, 4)} − ${F(frac)} = ${F(a, 3)} ans.`]);
    })(),
    (() => {
      const loan = 10000, r = 0.06, n = 3;
      const pmt = (loan * r) / (1 - Math.pow(1 + r, -n));
      const st = durStats([pmt, pmt, pmt], r);
      const a = st.mac;
      return q("fi-dur-d4", "difficile", "Macaulay duration of the fully amortizing loan?",
        [["Principal", usd(loan)], ["Interest rate (annual payments)", pc(r)], ["Term", yrs(n)], ["Repayment", "Equal annual payments"]],
        a, "years", 3,
        [`Annuité = ${D(loan)} × ${F(r)} / (1 − ${F(1 + r)}^−${n}) = ${D(pmt, 2)}.`,
          `PV des annuités : ${st.pvs.map((x) => D(x, 2)).join(" ; ")} ; poids ${st.w.map((w) => F(w, 4)).join(" ; ")}.`,
          `Macaulay = ${st.w.map((w, i) => `${i + 1} × ${F(w, 4)}`).join(" + ")} = ${F(a, 3)} ans (le montant prêté ne change rien).`]);
    })(),
    (() => {
      const macP = 13.2, y = 0.05, dy = 0.004;
      const macY = macP / 2;
      const md = macY / (1 + y / 2);
      const a = -md * dy * 100;
      return q("fi-dur-d5", "difficile", "Approximate percentage price change for the yield change (duration only)?",
        [["Macaulay duration", "13.2 semiannual periods"], ["Yield to maturity (semiannual bond basis)", pc(y)], ["Change in YTM", `+${bps(dy * 10000)}`]],
        a, "%", 3,
        [`Macaulay annualisée = ${F(macP)} / 2 = ${F(macY)} ans.`,
          `ModDur = ${F(macY)} / (1 + ${F(y)} / 2) = ${F(md, 4)}.`,
          `%ΔP ≈ −${F(md, 4)} × ${F(dy)} = ${Pa(a, 3)}.`]);
    })(),
  ],
};

/* ────────────────────────── 11 · Duration et convexité approchées ────────────────────────── */

const APPROX: CalcType = {
  key: "approx-duration-convexity",
  topic: "fixed_income",
  name: "Duration et convexité approchées, effective duration",
  tier: "essentiel",
  source: "LM 11–13 · Yield-Based Duration and Convexity, Curve-Based and Empirical Fixed-Income Risk Measures",
  formulas: [
    "ApproxModDur = (V− − V+) / (2 × ΔYTM × V0)",
    "ApproxCon = (V− + V+ − 2V0) / (ΔYTM² × V0)",
    "Effective duration = (PV− − PV+) / (2 × ΔCurve × PV0) ; effective convexity = (PV− + PV+ − 2PV0) / (ΔCurve² × PV0)",
    "Convexité analytique = Σ w_t × t(t + 1) / (1 + r)² ; diviser par m² pour annualiser",
  ],
  traps: [
    "ΔYTM en décimal : 50 bp = 0,005 ; il n'est pas doublé au dénominateur de la convexité.",
    "Option embarquée : effective duration (déplacement de la courbe benchmark), pas la ModDur.",
    "Callable à bas taux : effective convexity négative.",
  ],
  questions: [
    (() => {
      const v0 = 101.2, vm = 103.85, vp = 98.65, dy = 0.005;
      const a = approxModDur(vm, vp, v0, dy);
      return q("fi-approx-f1", "facile", "Approximate modified duration?",
        [["Current price (V0)", E(v0, 2)], ["Price if YTM falls 50 bp (V−)", E(vm, 2)], ["Price if YTM rises 50 bp (V+)", E(vp, 2)]],
        a, "", 3,
        [`ApproxModDur = (${F(vm, 2)} − ${F(vp, 2)}) / (2 × ${F(dy)} × ${F(v0, 2)}).`,
          `= ${F(vm - vp, 2)} / ${F(2 * dy * v0, 4)} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const v0 = 98.214, vm = 99.102, vp = 97.339, dy = 0.001;
      const a = approxCon(vm, vp, v0, dy);
      return q("fi-approx-f2", "facile", "Approximate convexity?",
        [["Current price (V0)", E(v0, 3)], ["Price if YTM falls 10 bp (V−)", E(vm, 3)], ["Price if YTM rises 10 bp (V+)", E(vp, 3)]],
        a, "", 1,
        [`ApproxCon = (${F(vm, 3)} + ${F(vp, 3)} − 2 × ${F(v0, 3)}) / (${sqd(dy)} × ${F(v0, 3)}).`,
          `= ${F(vm + vp - 2 * v0, 3)} / ${F(dy * dy * v0, 8)} = ${F(a, 1)}.`]);
    })(),
    (() => {
      const v0 = 101.5, vm = 102.8, vp = 99.6, dc = 0.0025;
      const a = approxModDur(vm, vp, v0, dc);
      return q("fi-approx-f3", "facile", "Effective duration of the callable bond?",
        [["Current price (PV0)", E(v0, 2)], ["Price if the benchmark curve falls 25 bp (PV−)", E(vm, 2)], ["Price if the benchmark curve rises 25 bp (PV+)", E(vp, 2)]],
        a, "", 3,
        [`EffDur = (${F(vm, 2)} − ${F(vp, 2)}) / (2 × ${F(dc)} × ${F(v0, 2)}) = ${F(vm - vp, 2)} / ${F(2 * dc * v0, 4)} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const v0 = 100, vm = 101.12, vp = 98.86, dc = 0.003;
      const a = approxCon(vm, vp, v0, dc);
      return q("fi-approx-f4", "facile", "Effective convexity of the callable bond?",
        [["Current price (PV0)", E(v0, 2)], ["Price if the benchmark curve falls 30 bp (PV−)", E(vm, 2)], ["Price if the benchmark curve rises 30 bp (PV+)", E(vp, 2)]],
        a, "", 2,
        [`EffCon = (${F(vm, 2)} + ${F(vp, 2)} − 2 × ${F(v0, 2)}) / (${sqd(dc)} × ${F(v0, 2)}).`,
          `= ${F(vm + vp - 2 * v0, 2)} / ${F(dc * dc * v0, 4)} = ${F(a, 2)} : convexité négative, le gain à la baisse des taux est plafonné par le call.`]);
    })(),
    (() => {
      const v0 = 95, vm = 95.08, vp = 94.92, dy = 0.0001;
      const a = approxModDur(vm, vp, v0, dy);
      return q("fi-approx-f5", "facile", "Approximate modified duration?",
        [["Current price (V0)", E(v0, 2)], ["Price if YTM falls 1 bp (V−)", E(vm, 2)], ["Price if YTM rises 1 bp (V+)", E(vp, 2)]],
        a, "", 2,
        [`ApproxModDur = (${F(vm, 2)} − ${F(vp, 2)}) / (2 × ${F(dy)} × ${F(v0)}) = ${F(vm - vp, 2)} / ${F(2 * dy * v0, 4)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const cpn = 0.04, y = 0.05, n = 6, dy = 0.0025;
      const v0 = price(cpn, y, n), vm = price(cpn, y - dy, n), vp = price(cpn, y + dy, n);
      const a = approxModDur(vm, vp, v0, dy);
      return q("fi-approx-m1", "moyen", "Approximate modified duration, using a 25 bp change in yield?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)]],
        a, "", 3,
        [`V0 (à ${P(y)}) = ${F(v0, 4)} ; V− (à ${P(y - dy)}) = ${F(vm, 4)} ; V+ (à ${P(y + dy)}) = ${F(vp, 4)}.`,
          `ApproxModDur = (${F(vm, 4)} − ${F(vp, 4)}) / (2 × ${F(dy)} × ${F(v0, 4)}) = ${F(a, 3)}.`],
        0.01);
    })(),
    (() => {
      const cpn = 0.05, y = 0.06, n = 10, dy = 0.005;
      const v0 = price(cpn, y, n), vm = price(cpn, y - dy, n), vp = price(cpn, y + dy, n);
      const a = approxCon(vm, vp, v0, dy);
      return q("fi-approx-m2", "moyen", "Approximate convexity, using a 50 bp change in yield?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)]],
        a, "", 1,
        [`V0 = ${F(v0, 5)} ; V− (à ${P(y - dy)}) = ${F(vm, 5)} ; V+ (à ${P(y + dy)}) = ${F(vp, 5)} (garder 5 décimales).`,
          `ApproxCon = (${F(vm, 5)} + ${F(vp, 5)} − 2 × ${F(v0, 5)}) / (${sqd(dy)} × ${F(v0, 5)}).`,
          `= ${F(rd(vm, 5) + rd(vp, 5) - 2 * rd(v0, 5), 5)} / ${F(dy * dy * v0, 6)} = ${F(a, 1)}.`],
        0.8);
    })(),
    (() => {
      const v0 = 99.2, vm = 101.6, vp = 97.4, dc = 0.004, mdStraight = 6.1;
      const a = approxModDur(vm, vp, v0, dc);
      return q("fi-approx-m3", "moyen", "Effective duration of the putable bond?",
        [["Current price (PV0)", E(v0, 2)], ["Price if the benchmark curve falls 40 bp (PV−)", E(vm, 2)], ["Price if the benchmark curve rises 40 bp (PV+)", E(vp, 2)],
          ["Modified duration of an otherwise identical straight bond", E(mdStraight)]],
        a, "", 3,
        ["La ModDur de l'obligation droite ne sert pas : avec une option, on mesure l'effective duration.",
          `EffDur = (${F(vm, 2)} − ${F(vp, 2)}) / (2 × ${F(dc)} × ${F(v0, 2)}) = ${F(vm - vp, 2)} / ${F(2 * dc * v0, 4)} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.06, y = 0.05, n = 5, dy = 0.002;
      const v0 = price(cpn, y, n, 2), vm = price(cpn, y - dy, n, 2), vp = price(cpn, y + dy, n, 2);
      const a = approxModDur(vm, vp, v0, dy);
      return q("fi-approx-m4", "moyen", "Approximate modified duration, using a 20 bp change in yield?",
        [["Coupon rate (semiannual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)]],
        a, "", 3,
        [`V0 = ${F(v0, 4)} ; V− (YTM ${P(y - dy)}) = ${F(vm, 4)} ; V+ (YTM ${P(y + dy)}) = ${F(vp, 4)} (N = ${2 * n}, taux / 2).`,
          `ApproxModDur = (${F(vm, 4)} − ${F(vp, 4)}) / (2 × ${F(dy)} × ${F(v0, 4)}) = ${F(a, 3)} (déjà annuelle : ΔYTM est annuel).`],
        0.01);
    })(),
    (() => {
      const cpn = 0.06, y = 0.06, n = 2;
      const st = durStats(bondFlows(cpn * 100, n), y);
      const a = st.conv;
      return q("fi-approx-m5", "moyen", "Convexity of the bond (cash-flow method)?",
        [["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)]],
        a, "", 3,
        [`Au pair : poids ${st.w.map((w) => F(w, 5)).join(" ; ")}.`,
          `Convexité des flux : 1 × 2 / ${pw(y, 2)} = ${F(2 / Math.pow(1 + y, 2), 4)} ; 2 × 3 / ${pw(y, 2)} = ${F(6 / Math.pow(1 + y, 2), 4)}.`,
          `Convexité = ${F(st.w[0], 5)} × ${F(2 / Math.pow(1 + y, 2), 4)} + ${F(st.w[1], 5)} × ${F(6 / Math.pow(1 + y, 2), 4)} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.03, y = 0.04, n = 8, dy = 0.01;
      const v0 = price(cpn, y, n, 2), vm = price(cpn, y - dy, n, 2), vp = price(cpn, y + dy, n, 2);
      const a = approxCon(vm, vp, v0, dy);
      return q("fi-approx-d1", "difficile", "Approximate convexity, using a 100 bp change in yield?",
        [["Coupon rate (semiannual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)]],
        a, "", 1,
        [`V0 = ${F(v0, 4)} ; V− (YTM ${P(y - dy)}) = ${F(vm, 4)} ; V+ (YTM ${P(y + dy)}) = ${F(vp, 4)}.`,
          `ApproxCon = (${F(vm, 4)} + ${F(vp, 4)} − 2 × ${F(v0, 4)}) / (${sqd(dy)} × ${F(v0, 4)}) = ${F(a, 1)}.`,
          "Avec ΔYTM annuel, le résultat est déjà une convexité annuelle."],
        0.2);
    })(),
    (() => {
      const cpn = 0.08, y = 0.06, n = 2;
      const st = durStats(bondFlows(cpn * 50, 2 * n), y / 2);
      const a = st.conv / 4;
      return q("fi-approx-d2", "difficile", "Annualized convexity of the bond (cash-flow method)?",
        [["Coupon rate (semiannual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)]],
        a, "", 3,
        [`${2 * n} flux semestriels actualisés à ${P(y / 2)} : poids ${st.w.map((w) => F(w, 4)).join(" ; ")}.`,
          `Convexité des flux t(t + 1) / ${pw(y / 2, 2)} : ${st.w.map((_, i) => F(((i + 1) * (i + 2)) / Math.pow(1 + y / 2, 2), 4)).join(" ; ")}.`,
          `Convexité = ${F(st.conv, 4)} (en semestres²) ; annualisée : ${F(st.conv, 4)} / 2² = ${F(a, 3)}.`]);
    })(),
    (() => {
      const n = 10, y = 0.04, dy = 0.005;
      const z = (yy: number) => 100 / Math.pow(1 + yy, n);
      const v0 = z(y), vm = z(y - dy), vp = z(y + dy);
      const a = approxModDur(vm, vp, v0, dy);
      return q("fi-approx-d3", "difficile", "Approximate modified duration of the zero-coupon bond, using a 50 bp change in yield?",
        [["Years to maturity", E(n)], ["Yield to maturity (annual compounding)", pc(y)], ["Coupon", "Zero-coupon"]],
        a, "", 3,
        [`V0 = 100 / ${pw(y, n)} = ${F(v0, 4)} ; V− = 100 / ${pw(y - dy, n)} = ${F(vm, 4)} ; V+ = 100 / ${pw(y + dy, n)} = ${F(vp, 4)}.`,
          `ApproxModDur = (${F(vm, 4)} − ${F(vp, 4)}) / (2 × ${F(dy)} × ${F(v0, 4)}) = ${F(a, 3)}.`,
          `Contrôle : ModDur exacte = ${n} / ${F(1 + y)} = ${F(n / (1 + y), 3)}.`],
        0.01);
    })(),
    (() => {
      const v0 = 102.4, vm = 104.1, vp = 100.3, dc = 0.005, oas = 85;
      const a = approxModDur(vm, vp, v0, dc);
      return q("fi-approx-d4", "difficile", "Effective duration of the MBS position?",
        [["Current value ($ millions)", E(v0, 1)], ["Model value if the benchmark curve falls 50 bp ($ millions)", E(vm, 1)],
          ["Model value if the benchmark curve rises 50 bp ($ millions)", E(vp, 1)], ["Option-adjusted spread (held constant)", bps(oas)]],
        a, "", 3,
        ["L'OAS est maintenu constant dans le modèle : il ne sert pas au calcul.",
          `EffDur = (${F(vm, 1)} − ${F(vp, 1)}) / (2 × ${F(dc)} × ${F(v0, 1)}) = ${F(vm - vp, 1)} / ${F(2 * dc * v0, 3)} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const c = 5, y = 0.06, dy = 0.001;
      const v0 = c / y, vm = c / (y - dy), vp = c / (y + dy);
      const a = approxModDur(vm, vp, v0, dy);
      return q("fi-approx-d5", "difficile", "Approximate modified duration of the perpetual bond, using a 10 bp change in yield?",
        [["Annual coupon (per 100 par)", E(c)], ["Required yield", pc(y)], ["Maturity", "Perpetual"]],
        a, "", 2,
        [`Perpétuité : V = C / r. V0 = ${F(c)} / ${F(y)} = ${F(v0, 4)} ; V− = ${F(c)} / ${F(y - dy)} = ${F(vm, 4)} ; V+ = ${F(c)} / ${F(y + dy)} = ${F(vp, 4)}.`,
          `ApproxModDur = (${F(vm, 4)} − ${F(vp, 4)}) / (2 × ${F(dy)} × ${F(v0, 4)}) = ${F(a, 2)} ≈ 1 / r.`],
        0.02);
    })(),
  ],
};

/* ────────────────────────── 12 · Variation de prix : duration + convexité ────────────────────────── */

const PRICE_CHANGE: CalcType = {
  key: "duration-convexity-price-change",
  topic: "fixed_income",
  name: "Variation de prix par la duration et la convexité",
  tier: "essentiel",
  top: true,
  source: "LM 12–13 · Yield-Based Bond Convexity and Portfolio Properties, Curve-Based and Empirical Fixed-Income Risk Measures",
  formulas: [
    "%ΔP ≈ −ModDur × ΔYTM + ½ × Convexité × (ΔYTM)²",
    "Avec option : %ΔP ≈ −EffDur × ΔCurve + ½ × EffCon × (ΔCurve)²",
    "Nouveau prix ≈ P0 × (1 + %ΔP)",
    "En monnaie : ΔV ≈ −MoneyDur × ΔYTM + ½ × MoneyCon × (ΔYTM)²",
  ],
  traps: [
    "Le terme de convexité a le signe de la convexité (ΔYTM est au carré) : positif pour une obligation classique, que les taux montent ou baissent.",
    "ΔYTM en décimal : 75 bp = 0,0075 ; multiplier le résultat par 100 pour l'avoir en %.",
    "Callable à bas taux : convexité effective négative, l'ajustement réduit le gain.",
  ],
  questions: [
    (() => {
      const md = 6.2, con = 48.5, dy = 0.006;
      const a = dPrice(md, con, dy) * 100;
      return q("fi-dp-f1", "facile", "Estimated percentage price change?",
        [["Modified duration", E(md)], ["Convexity", E(con)], ["Change in YTM", "+60 bp"]],
        a, "%", 3,
        [`Effet duration = −${F(md)} × ${F(dy)} = ${P(-md * dy, 3)}.`,
          `Effet convexité = ½ × ${F(con)} × ${sqd(dy)} = +${P(0.5 * con * dy * dy, 4)}.`,
          `%ΔP ≈ ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const md = 5.4, dy = -0.008;
      const a = -md * dy * 100;
      return q("fi-dp-f2", "facile", "Estimated percentage price change, using duration only?",
        [["Modified duration", E(md)], ["Change in YTM", `${MINUS}80 bp`]],
        a, "%", 2,
        [`%ΔP ≈ −${F(md)} × (−${F(-dy)}) = +${Pa(a)}.`]);
    })(),
    (() => {
      const con = 92, dy = 0.015;
      const a = 0.5 * con * dy * dy * 100;
      return q("fi-dp-f3", "facile", "Convexity adjustment to the percentage price change?",
        [["Convexity", E(con)], ["Change in YTM", "+150 bp"]],
        a, "%", 3,
        [`Effet convexité = ½ × ${F(con)} × ${sqd(dy)} = ${Pa(a, 3)} (positif même si les taux montent).`]);
    })(),
    (() => {
      const ed = 8.2, ec = 74, dc = -0.015;
      const a = dPrice(ed, ec, dc) * 100;
      return q("fi-dp-f4", "facile", "Estimated percentage price change?",
        [["Effective duration", E(ed)], ["Effective convexity", E(ec)], ["Shift in the benchmark curve", `${MINUS}150 bp`]],
        a, "%", 3,
        [`Effet duration = −${F(ed)} × (−${F(-dc)}) = +${P(-ed * dc, 3)}.`,
          `Effet convexité = ½ × ${F(ec)} × ${sqd(dc)} = +${P(0.5 * ec * dc * dc, 4)}.`,
          `%ΔP ≈ ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const p0 = 97.5, md = 4.8, con = 28, dy = 0.02;
      const ch = dPrice(md, con, dy);
      const a = p0 * (1 + ch);
      return q("fi-dp-f5", "facile", "Estimated new price after the yield change?",
        [["Current price (per 100 par)", E(p0, 2)], ["Modified duration", E(md)], ["Convexity", E(con)], ["Change in YTM", `+${E(dy * 10000)} bp`]],
        a, "", 3,
        [`%ΔP ≈ −${F(md)} × ${F(dy)} + ½ × ${F(con)} × ${sqd(dy)} = ${P(ch, 3)}.`,
          `Nouveau prix ≈ ${F(p0, 2)} × (1 ${MINUS} ${F(-ch, 5)}) = ${F(a, 3)}.`]);
    })(),
    (() => {
      const p0 = 104.2, md = 9.1, con = 105, dy = -0.0075;
      const ch = dPrice(md, con, dy);
      const a = p0 * (1 + ch);
      return q("fi-dp-m1", "moyen", "Estimated new price after the yield change?",
        [["Current price (per 100 par)", E(p0, 2)], ["Modified duration", E(md)], ["Convexity", E(con)], ["Change in YTM", `${MINUS}75 bp`]],
        a, "", 3,
        [`Effet duration = −${F(md)} × (−${F(-dy)}) = +${P(-md * dy, 4)} ; effet convexité = ½ × ${F(con)} × ${sqd(dy)} = +${P(0.5 * con * dy * dy, 4)}.`,
          `%ΔP ≈ ${P(ch, 4)}.`,
          `Nouveau prix ≈ ${F(p0, 2)} × (1 + ${F(ch, 6)}) = ${F(a, 3)}.`]);
    })(),
    (() => {
      const ed = 4.2, ec = -35, dc = -0.01;
      const a = dPrice(ed, ec, dc) * 100;
      return q("fi-dp-m2", "moyen", "Estimated percentage price change of the callable bond?",
        [["Effective duration", E(ed)], ["Effective convexity", E(ec)], ["Shift in the benchmark curve", `${MINUS}100 bp`]],
        a, "%", 3,
        [`Effet duration = −${F(ed)} × (−${F(-dc)}) = +${P(-ed * dc, 3)}.`,
          `Effet convexité = ½ × (${F(ec)}) × ${sqd(dc)} = ${P(0.5 * ec * dc * dc, 4)} : négatif, le call plafonne le gain.`,
          `%ΔP ≈ ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const par = 5000000, full = 102.3, md = 6, con = 45, dy = -0.005;
      const mv = (par * full) / 100;
      const a = mv * dPrice(md, con, dy);
      return q("fi-dp-m3", "moyen", "Estimated change in the value of the position?",
        [["Par value", usd(par)], ["Full price (per 100 par)", E(full, 2)], ["Modified duration", E(md)], ["Convexity", E(con)], ["Change in YTM", `${MINUS}50 bp`]],
        a, "$", 0,
        [`Valeur de marché = ${D(par)} × ${F(full, 2)} % = ${D(mv, 0)}.`,
          `%ΔP ≈ −${F(md)} × (−${F(-dy)}) + ½ × ${F(con)} × ${sqd(dy)} = ${P(dPrice(md, con, dy), 4)}.`,
          `ΔV ≈ ${D(mv, 0)} × ${F(dPrice(md, con, dy), 6)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const md = 7.5, con = 60, dy = 0.01;
      const up = dPrice(md, con, -dy), down = dPrice(md, con, dy);
      const a = (up + down) * 100;
      return q("fi-dp-m4", "moyen", "Estimated price gain for a 100 bp fall in yield minus estimated price loss for a 100 bp rise (in %)?",
        [["Modified duration", E(md)], ["Convexity", E(con)]],
        a, "%", 3,
        [`Baisse de 100 bp : %ΔP ≈ +${F(md)} % + ½ × ${F(con)} × 0,01² = ${P(up, 3)}.`,
          `Hausse de 100 bp : %ΔP ≈ −${F(md)} % + ${P(0.5 * con * dy * dy, 3)} = ${P(down, 3)}.`,
          `Gain − perte = ${P(up, 3)} − ${P(-down, 3)} = ${Pa(a, 3)} = convexité × ΔYTM² : la duration s'annule.`]);
    })(),
    (() => {
      const mac = 7.5, y = 0.06, con = 70, dy = 0.004;
      const md = mac / (1 + y / 2);
      const a = dPrice(md, con, dy) * 100;
      return q("fi-dp-m5", "moyen", "Estimated percentage price change?",
        [["Macaulay duration (annualized)", yrs(mac)], ["Yield to maturity (semiannual bond basis)", pc(y)], ["Convexity (annualized)", E(con)], ["Change in YTM", "+40 bp"]],
        a, "%", 3,
        [`ModDur = ${F(mac)} / (1 + ${F(y)} / 2) = ${F(md, 4)}.`,
          `%ΔP ≈ −${F(md, 4)} × ${F(dy)} + ½ × ${F(con)} × ${sqd(dy)} = ${P(-md * dy, 4)} + ${P(0.5 * con * dy * dy, 4)}.`,
          `%ΔP ≈ ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const v0 = 96.85, vm = 98.72, vp = 95.03, dy = 0.0025, shock = 0.01;
      const md = approxModDur(vm, vp, v0, dy), con = approxCon(vm, vp, v0, dy);
      const a = dPrice(md, con, shock) * 100;
      return q("fi-dp-d1", "difficile", "Estimated percentage price change for a 100 bp rise in yield, using duration and convexity?",
        [["Current price (V0)", E(v0, 2)], ["Price if YTM falls 25 bp (V−)", E(vm, 2)], ["Price if YTM rises 25 bp (V+)", E(vp, 2)]],
        a, "%", 2,
        [`ApproxModDur = (${F(vm, 2)} − ${F(vp, 2)}) / (2 × ${F(dy)} × ${F(v0, 2)}) = ${F(md, 4)}.`,
          `ApproxCon = (${F(vm, 2)} + ${F(vp, 2)} − 2 × ${F(v0, 2)}) / (${sqd(dy)} × ${F(v0, 2)}) = ${F(con, 2)}.`,
          `%ΔP ≈ −${F(md, 4)} × ${F(shock)} + ½ × ${F(con, 2)} × ${sqd(shock)} = ${Pa(a)}.`],
        0.02);
    })(),
    (() => {
      const p0 = 101.25, ed = 3.9, ec = -28, md = 6.4, dc = -0.015;
      const ch = dPrice(ed, ec, dc);
      const a = p0 * (1 + ch);
      return q("fi-dp-d2", "difficile", "Estimated new price of the callable bond?",
        [["Current price (per 100 par)", E(p0, 2)], ["Effective duration", E(ed)], ["Effective convexity", E(ec)],
          ["Modified duration (to maturity)", E(md)], ["Shift in the benchmark curve", `${MINUS}${E(-dc * 10000)} bp`]],
        a, "", 3,
        ["Option embarquée : on utilise l'effective duration et l'effective convexity ; la ModDur au YTM ne sert pas.",
          `%ΔP ≈ −${F(ed)} × (−${F(-dc)}) + ½ × (${F(ec)}) × ${sqd(dc)} = ${P(-ed * dc, 4)} − ${P(-0.5 * ec * dc * dc, 4)} = ${P(ch, 4)}.`,
          `Nouveau prix ≈ ${F(p0, 2)} × (1 + ${F(ch, 6)}) = ${F(a, 3)}.`]);
    })(),
    (() => {
      const md = 6.8, conSemi = 182, dy = 0.012;
      const con = conSemi / 4;
      const a = dPrice(md, con, dy) * 100;
      return q("fi-dp-d3", "difficile", "Estimated percentage price change?",
        [["Modified duration (annualized)", E(md)], ["Convexity, in semiannual periods (not annualized)", E(conSemi)], ["Change in YTM", "+120 bp"]],
        a, "%", 3,
        [`Piège : la convexité en semestres² s'annualise en divisant par 2² = 4 → ${F(con)}.`,
          `%ΔP ≈ −${F(md)} × ${F(dy)} + ½ × ${F(con)} × ${sqd(dy)} = ${P(-md * dy, 4)} + ${P(0.5 * con * dy * dy, 4)}.`,
          `%ΔP ≈ ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const dB = -10, dS = 30, md = 6.5, con = 55;
      const dy = (dB + dS) / 10000;
      const a = dPrice(md, con, dy) * 100;
      return q("fi-dp-d4", "difficile", "Estimated percentage price change of the corporate bond?",
        [["Change in benchmark government yield", `${MINUS}10 bp`], ["Change in the bond's credit spread", "+30 bp"], ["Modified duration", E(md)], ["Convexity", E(con)]],
        a, "%", 3,
        [`Le YTM de l'obligation bouge de ${F(dB)} + ${F(dS)} = +${F(dy * 10000)} bp.`,
          `%ΔP ≈ −${F(md)} × ${F(dy)} + ½ × ${F(con)} × ${sqd(dy)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const mac = 8.4, y = 0.052, con = 82, cpn = 0.045, p0 = 93.6, dy = -0.01;
      const md = mac / (1 + y);
      const ch = dPrice(md, con, dy);
      const a = p0 * (1 + ch);
      return q("fi-dp-d5", "difficile", "Estimated new full price after the yield change?",
        [["Full price (per 100 par)", E(p0, 2)], ["Macaulay duration", yrs(mac)], ["Yield to maturity (annual pay)", pc(y)],
          ["Coupon rate", pc(cpn)], ["Convexity", E(con)], ["Change in YTM", `${MINUS}${E(-dy * 10000)} bp`]],
        a, "", 3,
        [`ModDur = ${F(mac)} / ${F(1 + y)} = ${F(md, 4)} (le taux de coupon ne sert pas).`,
          `%ΔP ≈ −${F(md, 4)} × (−${F(-dy)}) + ½ × ${F(con)} × ${sqd(dy)} = ${P(ch, 4)}.`,
          `Nouveau prix ≈ ${F(p0, 2)} × (1 + ${F(ch, 6)}) = ${F(a, 3)}.`]);
    })(),
  ],
};

/* ────────────────────────── 13 · Money duration et PVBP ────────────────────────── */

const PVBP: CalcType = {
  key: "money-duration-pvbp",
  topic: "fixed_income",
  name: "Money duration et price value of a basis point (PVBP)",
  tier: "essentiel",
  source: "LM 11 · Yield-Based Bond Duration Measures and Properties",
  formulas: [
    "Money duration = ModDur annuelle × full price de la position",
    "ΔV ≈ −money duration × ΔYTM",
    "PVBP = money duration × 0,0001 = (V− − V+) / 2 pour ΔYTM = 1 bp",
    "Money convexity = convexité annuelle × full price de la position",
  ],
  traps: [
    "Utiliser la valeur de marché (full price, coupon couru inclus), pas le nominal.",
    "PVBP pour 100 de nominal → × nominal / 100 pour la position.",
  ],
  questions: [
    (() => {
      const md = 5.8, full = 98.6;
      const a = md * full;
      return q("fi-pvbp-f1", "facile", "Money duration per 100 of par value?",
        [["Modified duration", E(md)], ["Full price (per 100 par)", E(full, 2)]],
        a, "$", 2,
        [`Money duration = ${F(md)} × ${F(full, 2)} = ${D(a, 2)} pour 100 de nominal.`]);
    })(),
    (() => {
      const par = 3000000, full = 103.5, md = 6.4;
      const a = (md * par * full) / 100;
      return q("fi-pvbp-f2", "facile", "Money duration of the position?",
        [["Par value", usd(par)], ["Full price (per 100 par)", E(full, 2)], ["Modified duration", E(md)]],
        a, "$", 0,
        [`Valeur de marché = ${D(par)} × ${F(full, 2)} % = ${D((par * full) / 100)}.`,
          `Money duration = ${F(md)} × ${D((par * full) / 100)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const mdur = 12400000;
      const a = mdur * 0.0001;
      return q("fi-pvbp-f3", "facile", "Price value of a basis point of the position?",
        [["Money duration of the position", usd(mdur)]],
        a, "$", 2,
        [`PVBP = money duration × 0,0001 = ${D(mdur)} × 0,0001 = ${D(a, 2)}.`]);
    })(),
    (() => {
      const mdur = 9800000, dy = 0.003;
      const a = -mdur * dy;
      return q("fi-pvbp-f4", "facile", "Estimated change in the position's value?",
        [["Money duration of the position", usd(mdur)], ["Change in YTM", "+30 bp"]],
        a, "$", 0,
        [`ΔV ≈ −${D(mdur)} × ${F(dy)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const vm = 98.462, vp = 98.318;
      const a = (vm - vp) / 2;
      return q("fi-pvbp-f5", "facile", "PVBP per 100 of par value?",
        [["Price if YTM falls 1 bp (V−)", E(vm, 3)], ["Price if YTM rises 1 bp (V+)", E(vp, 3)]],
        a, "", 3,
        [`PVBP = (${F(vm, 3)} − ${F(vp, 3)}) / 2 = ${F(a, 3)} pour 100 de nominal.`]);
    })(),
    (() => {
      const par = 1000000, cpn = 0.06, y = 0.059, n = 20, b = 0.0001;
      const vm = price(cpn, y - b, n), vp = price(cpn, y + b, n);
      const per100 = (vm - vp) / 2;
      const a = (per100 * par) / 100;
      return q("fi-pvbp-m1", "moyen", "PVBP of the position?",
        [["Par value", usd(par)], ["Coupon rate (annual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)]],
        a, "$", 0,
        [`V− (YTM ${F((y - b) * 100)} %) = ${F(vm, 4)} ; V+ (YTM ${F((y + b) * 100)} %) = ${F(vp, 4)}.`,
          `PVBP pour 100 = (${F(vm, 4)} − ${F(vp, 4)}) / 2 = ${F(per100, 4)}.`,
          `Position : ${F(per100, 4)} × ${D(par)} / 100 = ${D(a, 0)}.`],
        10);
    })(),
    (() => {
      const par = 5000000, full = 99.2, md = 4.5;
      const a = md * ((par * full) / 100) * 0.0001;
      return q("fi-pvbp-m2", "moyen", "PVBP of the position?",
        [["Par value", usd(par)], ["Full price (per 100 par)", E(full, 2)], ["Modified duration", E(md)]],
        a, "$", 2,
        [`Valeur de marché = ${D((par * full) / 100)} ; money duration = ${F(md)} × ${D((par * full) / 100)} = ${D((md * par * full) / 100)}.`,
          `PVBP = ${D((md * par * full) / 100)} × 0,0001 = ${D(a, 2)}.`]);
    })(),
    (() => {
      const par = 10000000, full = 96.4, md = 5.5, con = 38, dy = -0.004;
      const mv = (par * full) / 100;
      const mdur = md * mv, mcon = con * mv;
      const a = -mdur * dy + 0.5 * mcon * dy * dy;
      return q("fi-pvbp-m3", "moyen", "Estimated change in the position's value, using money duration and money convexity?",
        [["Par value", usd(par)], ["Full price (per 100 par)", E(full, 2)], ["Modified duration", E(md)], ["Convexity", E(con)], ["Change in YTM", `${MINUS}40 bp`]],
        a, "$", 0,
        [`Valeur = ${D(mv)} ; money duration = ${D(mdur)} ; money convexity = ${D(mcon)}.`,
          `Effet duration = −${D(mdur)} × (−${F(-dy)}) = ${D(-mdur * dy, 0)}.`,
          `Effet convexité = ½ × ${D(mcon)} × ${sqd(dy)} = ${D(0.5 * mcon * dy * dy, 0)}.`,
          `ΔV ≈ ${D(a, 0)}.`]);
    })(),
    (() => {
      const pvbp100 = 0.0645, full = 102;
      const a = pvbp100 / (full * 0.0001);
      return q("fi-pvbp-m4", "moyen", "Modified duration implied by the PVBP?",
        [["PVBP per 100 of par value", E(pvbp100, 4)], ["Full price (per 100 par)", E(full, 2)]],
        a, "", 2,
        [`PVBP = ModDur × full price × 0,0001, donc ModDur = PVBP / (full price × 0,0001).`,
          `ModDur = ${F(pvbp100, 4)} / (${F(full)} × 0,0001) = ${F(pvbp100, 4)} / ${F(full * 0.0001, 4)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const pos = [{ par: 2000000, full: 101.5, md: 4.2 }, { par: 3000000, full: 97, md: 8.1 }];
      const md = pos.map((p) => (p.md * p.par * p.full) / 100);
      const a = sum(md);
      return q("fi-pvbp-m5", "moyen", "Money duration of the two-bond portfolio?",
        [["Bond A", `par ${usd(pos[0].par)}, full price ${E(pos[0].full, 2)}, modified duration ${E(pos[0].md)}`],
          ["Bond B", `par ${usd(pos[1].par)}, full price ${E(pos[1].full, 2)}, modified duration ${E(pos[1].md)}`]],
        a, "$", 0,
        [`A : ${F(pos[0].md)} × ${D((pos[0].par * pos[0].full) / 100)} = ${D(md[0], 0)}.`,
          `B : ${F(pos[1].md)} × ${D((pos[1].par * pos[1].full) / 100)} = ${D(md[1], 0)}.`,
          `Les money durations s'additionnent : ${D(a, 0)}.`]);
    })(),
    (() => {
      const par = 1000, cpn = 0.045, y = 0.04, n = 8, b = 0.0001;
      const v0 = price(cpn, y, n, 2, par), vm = price(cpn, y - b, n, 2, par), vp = price(cpn, y + b, n, 2, par);
      const a = (vm - vp) / 2;
      return q("fi-pvbp-d1", "difficile", "PVBP of one bond?",
        [["Par value", usd(par)], ["Coupon rate (semiannual pay)", pc(cpn)], ["Years to maturity", E(n)], ["Yield to maturity", pc(y)]],
        a, "$", 3,
        [`Prix actuel = ${D(v0, 2)} (N = ${2 * n}, PMT = ${F((cpn * par) / 2, 2)}, I/Y = ${F(y * 50)}).`,
          `V− (YTM ${F((y - b) * 100)} %, I/Y = ${F((y - b) * 50, 4)}) = ${D(vm, 4)} ; V+ (YTM ${F((y + b) * 100)} %) = ${D(vp, 4)}.`,
          `PVBP = (${F(vm, 4)} − ${F(vp, 4)}) / 2 = ${D(a, 3)}.`],
        0.005);
    })(),
    (() => {
      const par = 4000000, flat = 98.25, ai = 1.4, md = 6.9;
      const mv = (par * (flat + ai)) / 100;
      const a = md * mv;
      return q("fi-pvbp-d2", "difficile", "Money duration of the position?",
        [["Par value", usd(par)], ["Flat price (per 100 par)", E(flat, 2)], ["Accrued interest (per 100 par)", E(ai, 2)], ["Modified duration", E(md)]],
        a, "$", 0,
        [`Piège : la money duration se calcule sur le full price = ${F(flat, 2)} + ${F(ai, 2)} = ${F(flat + ai, 2)}.`,
          `Valeur de marché = ${D(par)} × ${F(flat + ai, 2)} % = ${D(mv)}.`,
          `Money duration = ${F(md)} × ${D(mv)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const par = 8000000, full = 101.75, md = 7.3, con = 64, dy = 0.0075;
      const mv = (par * full) / 100;
      const a = mv * dPrice(md, con, dy);
      return q("fi-pvbp-d3", "difficile", "Estimated change in the position's value?",
        [["Par value", usd(par)], ["Full price (per 100 par)", E(full, 2)], ["Modified duration", E(md)], ["Convexity", E(con)], ["Change in YTM", "+75 bp"]],
        a, "$", 0,
        [`Valeur = ${D(mv)} ; money duration = ${D(md * mv)} ; money convexity = ${D(con * mv)}.`,
          `ΔV ≈ −${D(md * mv)} × ${F(dy)} + ½ × ${D(con * mv)} × ${sqd(dy)}.`,
          `= ${D(-md * mv * dy, 0)} + ${D(0.5 * con * mv * dy * dy, 0)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const v0 = 102, vm = 102.95, vp = 101.07, dy = 0.001, par = 6000000;
      const md = approxModDur(vm, vp, v0, dy);
      const mv = (par * v0) / 100;
      const a = md * mv * 0.0001;
      return q("fi-pvbp-d4", "difficile", "PVBP of the position?",
        [["Par value", usd(par)], ["Current full price (V0)", E(v0, 2)], ["Price if YTM falls 10 bp (V−)", E(vm, 2)], ["Price if YTM rises 10 bp (V+)", E(vp, 2)]],
        a, "$", 0,
        [`ApproxModDur = (${F(vm, 2)} − ${F(vp, 2)}) / (2 × ${F(dy)} × ${F(v0)}) = ${F(md, 4)}.`,
          `Valeur de marché = ${D(mv)} ; money duration = ${F(md, 4)} × ${D(mv)} = ${D(md * mv, 0)}.`,
          `PVBP = ${D(md * mv, 0)} × 0,0001 = ${D(a, 0)}.`]);
    })(),
    (() => {
      const mac = 9.2, y = 0.05, par = 8000000, full = 94.75;
      const md = mac / (1 + y / 2);
      const mv = (par * full) / 100;
      const a = md * mv * 0.0001;
      return q("fi-pvbp-d5", "difficile", "PVBP of the position?",
        [["Par value", usd(par)], ["Full price (per 100 par)", E(full, 2)], ["Macaulay duration (annualized)", yrs(mac)], ["Yield to maturity (semiannual bond basis)", pc(y)]],
        a, "$", 0,
        [`ModDur = ${F(mac)} / (1 + ${F(y)} / 2) = ${F(md, 4)}.`,
          `Valeur de marché = ${D(par)} × ${F(full, 2)} % = ${D(mv)}.`,
          `PVBP = ${F(md, 4)} × ${D(mv)} × 0,0001 = ${D(a, 0)}.`]);
    })(),
  ],
};

/* ────────────────────────── 14 · Duration de portefeuille et key rate durations ────────────────────────── */

const PORTFOLIO: CalcType = {
  key: "portfolio-duration",
  topic: "fixed_income",
  name: "Duration de portefeuille et key rate durations",
  tier: "annexe",
  source: "LM 12–13 · Yield-Based Bond Convexity and Portfolio Properties, Curve-Based and Empirical Fixed-Income Risk Measures",
  formulas: [
    "Duration du portefeuille ≈ Σ w_i × D_i, avec w_i = valeur de marché_i / valeur totale",
    "Même moyenne pondérée pour la convexité du portefeuille",
    "Key rate durations : %ΔP ≈ −Σ KRD_k × Δy_k ; Σ KRD = effective duration",
  ],
  traps: [
    "Pondérer par la valeur de marché (nominal × prix), pas par le nominal.",
    "La moyenne pondérée suppose un déplacement parallèle de la courbe.",
    "Le cash a une duration nulle : il dilue la duration du portefeuille.",
  ],
  questions: [
    (() => {
      const w = [0.4, 0.35, 0.25], d = [3.2, 6.5, 9.1];
      const a = sum(w.map((x, i) => x * d[i]));
      return q("fi-port-f1", "facile", "Modified duration of the portfolio?",
        [["Portfolio weights (market value)", lst(w.map((x) => pc(x)))], ["Modified durations", lst(d.map((x) => E(x)))]],
        a, "", 3,
        [`Duration = ${w.map((x, i) => `${F(x)} × ${F(d[i])}`).join(" + ")} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const mv = [6000000, 4000000], d = [4, 8.5];
      const tot = sum(mv);
      const a = sum(mv.map((x, i) => (x / tot) * d[i]));
      return q("fi-port-f2", "facile", "Modified duration of the portfolio?",
        [["Bond A market value / duration", lst([usd(mv[0]), E(d[0])])], ["Bond B market value / duration", lst([usd(mv[1]), E(d[1])])]],
        a, "", 3,
        [`Poids : ${F(mv[0] / tot)} et ${F(mv[1] / tot)}.`,
          `Duration = ${F(mv[0] / tot)} × ${F(d[0])} + ${F(mv[1] / tot)} × ${F(d[1])} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const w = [0.6, 0.4], c = [30, 95];
      const a = sum(w.map((x, i) => x * c[i]));
      return q("fi-port-f3", "facile", "Convexity of the portfolio?",
        [["Portfolio weights (market value)", lst(w.map((x) => pc(x)))], ["Convexities", lst(c.map((x) => E(x)))]],
        a, "", 2,
        [`Convexité = ${F(w[0])} × ${F(c[0])} + ${F(w[1])} × ${F(c[1])} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const krd = [0.8, 2.1, 3.4];
      const a = sum(krd);
      return q("fi-port-f4", "facile", "Effective duration of the portfolio?",
        [["Key rate durations, 2-year / 5-year / 10-year", lst(krd.map((x) => E(x)))]],
        a, "", 2,
        [`La somme des key rate durations est l'effective duration : ${krd.map((x) => F(x)).join(" + ")} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const d = 5.6, dy = 0.004;
      const a = -d * dy * 100;
      return q("fi-port-f5", "facile", "Approximate percentage change in the portfolio's value for a parallel shift?",
        [["Portfolio modified duration", E(d)], ["Parallel shift in yields", "+40 bp"]],
        a, "%", 2,
        [`%ΔV ≈ −${F(d)} × ${F(dy)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const bonds = [{ par: 5000000, p: 102.5, d: 4.3 }, { par: 3000000, p: 95, d: 7.8 }, { par: 2000000, p: 110, d: 11.2 }];
      const mv = bonds.map((b) => (b.par * b.p) / 100);
      const tot = sum(mv);
      const a = sum(bonds.map((b, i) => (mv[i] / tot) * b.d));
      return q("fi-port-m1", "moyen", "Modified duration of the portfolio?",
        bonds.map((b, i): Row => [`Bond ${"ABC"[i]}`, `par ${usd(b.par)}, price ${E(b.p, 2)}, duration ${E(b.d)}`]),
        a, "", 3,
        [`Valeurs de marché : ${mv.map((x) => D(x)).join(" ; ")} → total ${D(tot)}.`,
          `Poids : ${mv.map((x) => F(x / tot, 4)).join(" ; ")}.`,
          `Duration = ${bonds.map((b, i) => `${F(mv[i] / tot, 4)} × ${F(b.d)}`).join(" + ")} = ${F(a, 3)}.`]);
    })(),
    (() => {
      const krd = [1.2, 2.5, 3], dy = [30, 10, -10];
      const a = -sum(krd.map((k, i) => (k * dy[i]) / 10000)) * 100;
      return q("fi-port-m2", "moyen", "Approximate percentage change in the portfolio's value?",
        [["Key rate durations, 2-year / 5-year / 10-year", lst(krd.map((x) => E(x)))],
          ["Yield changes, 2-year / 5-year / 10-year", lst(dy.map((x) => `${x > 0 ? "+" : MINUS}${Math.abs(x)} bp`))]],
        a, "%", 3,
        [`%ΔV ≈ −(${krd.map((k, i) => `${F(k)} × ${Fs(dy[i] / 10000)}`).join(" + ")}).`,
          `= ${krd.map((k, i) => P((-k * dy[i]) / 10000, 3)).join(" ; ")} → total ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const y5 = 0.04, y10 = 0.055, d5 = 0.004, d10 = -0.001;
      const k5 = 0.5 * (5 / (1 + y5)), k10 = 0.5 * (10 / (1 + y10));
      const a = (-k5 * d5 - k10 * d10) * 100;
      return q("fi-port-m3", "moyen", "Approximate percentage change in the portfolio's value?",
        [["Portfolio", "Equal weights in a 5-year zero and a 10-year zero (annual compounding)"], ["Yields, 5-year / 10-year", lst([pc(y5), pc(y10)])],
          ["Yield changes, 5-year / 10-year", "+40 bp / −10 bp"]],
        a, "%", 3,
        [`ModDur des zéros : 5 / ${F(1 + y5)} = ${F(5 / (1 + y5), 4)} et 10 / ${F(1 + y10)} = ${F(10 / (1 + y10), 4)}.`,
          `Key rate durations (× 0,5) : ${F(k5, 4)} et ${F(k10, 4)}.`,
          `%ΔV ≈ −${F(k5, 4)} × ${F(d5)} − ${F(k10, 4)} × (−${F(-d10)}) = ${P(-k5 * d5, 3)} + ${P(-k10 * d10, 3)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const dS = 3, dL = 9, target = 5.4;
      const a = ((target - dS) / (dL - dS)) * 100;
      return q("fi-port-m4", "moyen", "Weight of the long bond needed to reach the target portfolio duration?",
        [["Short bond duration", E(dS)], ["Long bond duration", E(dL)], ["Target portfolio duration", E(target)]],
        a, "%", 2,
        [`w × ${F(dL)} + (1 − w) × ${F(dS)} = ${F(target)}.`,
          `w = (${F(target)} − ${F(dS)}) / (${F(dL)} − ${F(dS)}) = ${Pa(a)}.`]);
    })(),
    (() => {
      const mv = [10000000, 8000000, 7000000], d = [2.5, 6, 9.5], dy = 0.0025;
      const tot = sum(mv);
      const dp = sum(mv.map((x, i) => (x / tot) * d[i]));
      const a = -dp * dy * tot;
      return q("fi-port-m5", "moyen", "Approximate change in the portfolio's value for a 25 bp parallel rise in yields?",
        [["Market values", lst(mv.map((x) => usd(x)))], ["Modified durations", lst(d.map((x) => E(x)))]],
        a, "$", 0,
        [`Valeur totale = ${D(tot)} ; poids ${mv.map((x) => F(x / tot, 2)).join(" ; ")}.`,
          `Duration = ${mv.map((x, i) => `${F(x / tot, 2)} × ${F(d[i])}`).join(" + ")} = ${F(dp, 3)}.`,
          `ΔV ≈ −${F(dp, 3)} × ${F(dy)} × ${D(tot)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const bonds = [{ par: 4000000, p: 101, d: 5.2, c: 35 }, { par: 6000000, p: 96.5, d: 8.4, c: 88 }], dy = -0.01;
      const mv = bonds.map((b) => (b.par * b.p) / 100);
      const tot = sum(mv);
      const w = mv.map((x) => x / tot);
      const dp = sum(bonds.map((b, i) => w[i] * b.d)), cp = sum(bonds.map((b, i) => w[i] * b.c));
      const a = dPrice(dp, cp, dy) * 100;
      return q("fi-port-d1", "difficile", "Estimated percentage change in the portfolio's value for a 100 bp parallel fall in yields?",
        bonds.map((b, i): Row => [`Bond ${"AB"[i]}`, `par ${usd(b.par)}, full price ${E(b.p, 2)}, duration ${E(b.d)}, convexity ${E(b.c)}`]),
        a, "%", 2,
        [`Valeurs de marché : ${mv.map((x) => D(x)).join(" et ")} ; poids ${w.map((x) => F(x, 4)).join(" et ")}.`,
          `Duration = ${F(dp, 4)} ; convexité = ${F(cp, 3)}.`,
          `%ΔV ≈ −${F(dp, 4)} × (−0,01) + ½ × ${F(cp, 3)} × 0,01² = ${Pa(a)}.`]);
    })(),
    (() => {
      const budget = 10000000, dS = 2.5, dL = 10, target = 6;
      const w = (target - dS) / (dL - dS);
      const a = w * budget;
      return q("fi-port-d2", "difficile", "Amount to invest in the long bond to reach the target duration?",
        [["Amount to invest", usd(budget)], ["Short bond duration", E(dS)], ["Long bond duration", E(dL)], ["Target portfolio duration", E(target)]],
        a, "$", 0,
        [`Poids du long : w = (${F(target)} − ${F(dS)}) / (${F(dL)} − ${F(dS)}) = ${F(w, 4)}.`,
          `Montant = ${F(w, 4)} × ${D(budget)} = ${D(a, 0)} (le reste, ${D(budget - a, 0)}, dans le court).`]);
    })(),
    (() => {
      const wA = 0.6, kA = [1.5, 0.4, 0], kB = [0.1, 0.6, 6.2], dy = [-20, 0, 30];
      const kp = kA.map((x, i) => wA * x + (1 - wA) * kB[i]);
      const a = -sum(kp.map((k, i) => (k * dy[i]) / 10000)) * 100;
      return q("fi-port-d3", "difficile", "Approximate percentage change in the portfolio's value after the curve steepens?",
        [["Weights, bond A / bond B", lst([pc(wA), pc(1 - wA)])], ["Bond A key rate durations, 2y / 5y / 10y", lst(kA.map((x) => E(x)))],
          ["Bond B key rate durations, 2y / 5y / 10y", lst(kB.map((x) => E(x)))], ["Yield changes, 2y / 5y / 10y", "−20 bp / 0 bp / +30 bp"]],
        a, "%", 3,
        [`KRD du portefeuille = ${F(wA)} × KRD(A) + ${F(1 - wA)} × KRD(B) : ${kp.map((x) => F(x, 2)).join(" ; ")}.`,
          `%ΔV ≈ −(${kp.map((k, i) => `${F(k, 2)} × ${Fs(dy[i] / 10000)}`).join(" + ")}).`,
          `= ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const v = 20000000, d = 6.2, cash = 5000000;
      const a = (v * d) / (v + cash);
      return q("fi-port-d4", "difficile", "Modified duration of the portfolio after the cash is added?",
        [["Bond portfolio market value", usd(v)], ["Bond portfolio duration", E(d)], ["Cash added (held in the portfolio)", usd(cash)]],
        a, "", 3,
        [`Le cash a une duration nulle.`,
          `Duration = ${F(v / (v + cash))} × ${F(d)} + ${F(cash / (v + cash))} × 0 = ${F(a, 3)}.`]);
    })(),
    (() => {
      const bonds = [{ par: 2000000, p: 120, d: 12, cpn: 0.08 }, { par: 5000000, p: 85, d: 4, cpn: 0.02 }, { par: 3000000, p: 100, d: 7, cpn: 0.05 }];
      const mv = bonds.map((b) => (b.par * b.p) / 100);
      const tot = sum(mv);
      const a = sum(bonds.map((b, i) => (mv[i] / tot) * b.d));
      return q("fi-port-d5", "difficile", "Modified duration of the portfolio?",
        bonds.map((b, i): Row => [`Bond ${"ABC"[i]}`, `par ${usd(b.par)}, price ${E(b.p)}, coupon ${pc(b.cpn)}, duration ${E(b.d)}`]),
        a, "", 3,
        [`Piège : pondérer par la valeur de marché, pas par le nominal (le coupon ne sert pas).`,
          `Valeurs : ${mv.map((x) => D(x)).join(" ; ")} → total ${D(tot)} ; poids ${mv.map((x) => F(x / tot, 4)).join(" ; ")}.`,
          `Duration = ${bonds.map((b, i) => `${F(mv[i] / tot, 4)} × ${F(b.d)}`).join(" + ")} = ${F(a, 3)}.`]);
    })(),
  ],
};

/* ────────────────────────── 15 · Risque de crédit : perte attendue ────────────────────────── */

const CREDIT: CalcType = {
  key: "expected-loss",
  topic: "fixed_income",
  name: "Perte attendue et spread de crédit (expected loss)",
  tier: "annexe",
  source: "LM 14 · Credit Risk",
  formulas: [
    "Expected loss = probabilité de défaut (POD) × loss given default (LGD)",
    "LGD = exposition × (1 − taux de recouvrement) ; loss severity = 1 − recouvrement",
    "Exposition = montant dû (principal + intérêts courus) − collatéral",
    "Spread de crédit ≈ POD × LGD (en %)",
  ],
  traps: [
    "LGD en % = 1 − recouvrement, pas le recouvrement lui-même.",
    "Le spread observé peut inclure une prime de liquidité : la retirer avant d'en déduire la POD.",
  ],
  questions: [
    (() => {
      const pod = 0.02, rr = 0.4;
      const a = pod * (1 - rr) * 100;
      return q("fi-credit-f1", "facile", "Expected loss, as a percentage of the exposure?",
        [["Probability of default (annual)", pc(pod)], ["Recovery rate", pc(rr)]],
        a, "%", 2,
        [`Loss severity = 1 − ${F(rr)} = ${P(1 - rr)}.`,
          `Expected loss = ${P(pod)} × ${P(1 - rr)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const exp = 10000000, pod = 0.015, lgd = 0.55;
      const a = exp * pod * lgd;
      return q("fi-credit-f2", "facile", "Expected loss on the position?",
        [["Exposure", usd(exp)], ["Probability of default", pc(pod)], ["Loss given default", pc(lgd)]],
        a, "$", 0,
        [`Expected loss = ${D(exp)} × ${F(pod)} × ${F(lgd)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const pod = 0.03, rr = 0.75;
      const a = pod * (1 - rr) * 10000;
      return q("fi-credit-f3", "facile", "Approximate credit spread that compensates for expected loss?",
        [["Probability of default (annual)", pc(pod)], ["Recovery rate", pc(rr)]],
        a, "bp", 0,
        [`Spread ≈ POD × (1 − recouvrement) = ${P(pod)} × ${P(1 - rr)} = ${P(pod * (1 - rr), 2)} = ${Bp(a, 0)}.`]);
    })(),
    (() => {
      const exp = 5000000, rr = 0.35;
      const a = exp * (1 - rr);
      return q("fi-credit-f4", "facile", "Loss given default, in dollars?",
        [["Exposure at default", usd(exp)], ["Recovery rate", pc(rr)]],
        a, "$", 0,
        [`LGD = ${D(exp)} × (1 − ${F(rr)}) = ${D(a, 0)}.`]);
    })(),
    (() => {
      const s = 150, rr = 0.4;
      const a = (s / 10000 / (1 - rr)) * 100;
      return q("fi-credit-f5", "facile", "Annual probability of default implied by the credit spread?",
        [["Credit spread", bps(s)], ["Recovery rate", pc(rr)]],
        a, "%", 2,
        [`Spread ≈ POD × (1 − recouvrement), donc POD = ${P(s / 10000, 2)} / ${F(1 - rr)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const yb = 0.061, yg = 0.04, pod = 0.025, rr = 0.3;
      const actual = (yb - yg) * 10000, fair = pod * (1 - rr) * 10000;
      const a = actual - fair;
      return q("fi-credit-m1", "moyen", "Actual credit spread minus the spread implied by expected loss?",
        [["Bond YTM", pc(yb)], ["Government bond YTM, same maturity", pc(yg)], ["Probability of default", pc(pod)], ["Recovery rate", pc(rr)]],
        a, "bp", 0,
        [`Spread observé = ${P(yb)} − ${P(yg)} = ${Bp(actual, 0)}.`,
          `Spread « juste » = ${P(pod)} × ${P(1 - rr)} = ${Bp(fair, 0)}.`,
          `Écart = ${Bp(a, 0)} : ${a > 0 ? "l'investisseur est plus que rémunéré pour le risque de crédit" : "le spread ne couvre pas la perte attendue"}.`]);
    })(),
    (() => {
      const prin = 20000000, accr = 400000, coll = 8000000, rr = 0.3, pod = 0.04;
      const exp = prin + accr - coll;
      const lgd = exp * (1 - rr);
      const a = pod * lgd;
      return q("fi-credit-m2", "moyen", "Expected loss on the loan?",
        [["Principal owed", usd(prin)], ["Accrued interest owed", usd(accr)], ["Value of collateral", usd(coll)],
          ["Recovery rate on the unsecured exposure", pc(rr)], ["Probability of default", pc(pod)]],
        a, "$", 0,
        [`Exposition = ${D(prin)} + ${D(accr)} − ${D(coll)} = ${D(exp)}.`,
          `LGD = ${D(exp)} × (1 − ${F(rr)}) = ${D(lgd)}.`,
          `Expected loss = ${F(pod)} × ${D(lgd)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const s = 0.024, pod = 0.04;
      const sev = s / pod;
      const a = (1 - sev) * 100;
      return q("fi-credit-m3", "moyen", "Recovery rate implied by the credit spread?",
        [["Credit spread", pc(s)], ["Probability of default", pc(pod)]],
        a, "%", 2,
        [`Loss severity = spread / POD = ${P(s)} / ${P(pod)} = ${P(sev)}.`,
          `Recouvrement = 1 − ${P(sev)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const pos = [{ v: 6000000, pod: 0.01, lgd: 0.6 }, { v: 4000000, pod: 0.03, lgd: 0.45 }];
      const el = pos.map((p) => p.v * p.pod * p.lgd);
      const a = sum(el);
      return q("fi-credit-m4", "moyen", "Total expected loss on the two bond positions?",
        [["Bond A", `exposure ${usd(pos[0].v)}, POD ${pc(pos[0].pod)}, LGD ${pc(pos[0].lgd)}`],
          ["Bond B", `exposure ${usd(pos[1].v)}, POD ${pc(pos[1].pod)}, LGD ${pc(pos[1].lgd)}`]],
        a, "$", 0,
        [`A : ${D(pos[0].v)} × ${F(pos[0].pod)} × ${F(pos[0].lgd)} = ${D(el[0])}.`,
          `B : ${D(pos[1].v)} × ${F(pos[1].pod)} × ${F(pos[1].lgd)} = ${D(el[1])}.`,
          `Total = ${D(a, 0)}.`]);
    })(),
    (() => {
      const yg = 0.036, pod = 0.018, rr = 0.45;
      const s = pod * (1 - rr);
      const a = (yg + s) * 100;
      return q("fi-credit-m5", "moyen", "Minimum yield the investor should require on the corporate bond?",
        [["Government bond yield, same maturity", pc(yg)], ["Probability of default", pc(pod)], ["Recovery rate", pc(rr)]],
        a, "%", 3,
        [`Spread requis ≈ ${P(pod)} × (1 − ${F(rr)}) = ${P(s, 2)}.`,
          `Rendement requis = ${P(yg)} + ${P(s, 2)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const cpn = 0.054, yg = 0.039, pod = 0.022, rr = 0.35;
      const actual = (cpn - yg) * 10000, fair = pod * (1 - rr) * 10000;
      const a = actual - fair;
      return q("fi-credit-d1", "difficile", "Actual credit spread minus the spread implied by expected loss?",
        [["Corporate bond", `${pc(cpn)} coupon, trading at par, rated BBB`], ["Government bond YTM, same maturity", pc(yg)],
          ["Probability of default", pc(pod)], ["Recovery rate", pc(rr)]],
        a, "bp", 1,
        [`Au pair, le YTM égale le coupon : spread observé = ${P(cpn)} − ${P(yg)} = ${Bp(actual, 0)}.`,
          `Spread « juste » = ${P(pod)} × ${P(1 - rr)} = ${Bp(fair, 1)} (la notation ne sert pas).`,
          `Écart = ${Bp(a, 1)}.`]);
    })(),
    (() => {
      const prin = 15000000, accr = 300000, coll = 6000000, rr = 0.4, pod = 0.025;
      const exp = prin + accr - coll;
      const a = pod * exp * (1 - rr);
      return q("fi-credit-d2", "difficile", "Expected loss on the secured loan?",
        [["Principal owed", usd(prin)], ["Accrued interest owed", usd(accr)], ["Value of collateral", usd(coll)],
          ["Recovery rate on the amount not covered by collateral", pc(rr)], ["Probability of default", pc(pod)]],
        a, "$", 0,
        [`Exposition non couverte = ${D(prin)} + ${D(accr)} − ${D(coll)} = ${D(exp)}.`,
          `LGD = ${D(exp)} × ${F(1 - rr)} = ${D(exp * (1 - rr))}.`,
          `Expected loss = ${F(pod)} × ${D(exp * (1 - rr))} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const s = 220, liq = 40, rr = 0.4;
      const credit = s - liq;
      const a = (credit / 10000 / (1 - rr)) * 100;
      return q("fi-credit-d3", "difficile", "Annual probability of default implied by the credit component of the spread?",
        [["Yield spread over government bonds", bps(s)], ["Estimated liquidity premium included in the spread", bps(liq)], ["Recovery rate", pc(rr)]],
        a, "%", 2,
        [`Composante crédit = ${s} − ${liq} = ${Bp(credit, 0)}.`,
          `POD = ${P(credit / 10000, 2)} / (1 − ${F(rr)}) = ${Pa(a)}.`]);
    })(),
    (() => {
      const pod0 = 0.01, pod1 = 0.025, rr = 0.4, md = 6;
      const ds = (pod1 - pod0) * (1 - rr);
      const a = -md * ds * 100;
      return q("fi-credit-d4", "difficile", "Approximate percentage price change if the spread moves to reflect the new expected loss?",
        [["Probability of default, before / after downgrade", lst([pc(pod0), pc(pod1)])], ["Recovery rate", pc(rr)], ["Modified duration", E(md)]],
        a, "%", 2,
        [`Spread avant ≈ ${P(pod0)} × ${F(1 - rr)} = ${P(pod0 * (1 - rr), 2)} ; après ≈ ${P(pod1)} × ${F(1 - rr)} = ${P(pod1 * (1 - rr), 2)}.`,
          `Élargissement = ${Bp(ds * 10000, 0)}.`,
          `%ΔP ≈ −${F(md)} × ${F(ds, 4)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const v = 5000000, pod = 0.03, rrS = 0.7, rrU = 0.25;
      const elS = v * pod * (1 - rrS), elU = v * pod * (1 - rrU);
      const a = elU - elS;
      return q("fi-credit-d5", "difficile", "Expected loss on the unsecured bond minus expected loss on the secured bond?",
        [["Exposure on each bond", usd(v)], ["Issuer's probability of default", pc(pod)], ["Recovery rate, secured / unsecured", lst([pc(rrS), pc(rrU)])]],
        a, "$", 0,
        [`Même émetteur : même POD ; seule la sévérité change.`,
          `Sécurisée : ${D(v)} × ${F(pod)} × ${F(1 - rrS)} = ${D(elS)} ; non sécurisée : ${D(v)} × ${F(pod)} × ${F(1 - rrU)} = ${D(elU)}.`,
          `Écart = ${D(a, 0)}.`]);
    })(),
  ],
};

/* ────────────────────────── 16 · Repo ────────────────────────── */

const REPO: CalcType = {
  key: "repo",
  topic: "fixed_income",
  name: "Mise en pension (repurchase agreement)",
  tier: "annexe",
  source: "LM 4 · Fixed-Income Markets for Corporate Issuers",
  formulas: [
    "Prix d'achat (montant prêté) = valeur du collatéral / marge initiale",
    "Prix de rachat = prix d'achat × (1 + taux repo × jours / 360)",
    "Haircut = (valeur du collatéral − prix d'achat) / valeur du collatéral",
    "Variation margin = prêt capitalisé × marge initiale − valeur actuelle du collatéral",
  ],
  traps: [
    "Le taux repo est un taux add-on, en général sur 360 jours.",
    "Une marge initiale de 102 % divise la valeur du collatéral : ce n'est pas un haircut de 2 %.",
    "Variation margin négative : prêt surcollatéralisé, l'emprunteur peut récupérer du collatéral.",
  ],
  questions: [
    (() => {
      const mv = 50000000, im = 1.02;
      const loan = mv / im;
      const a = mv - loan;
      return q("fi-repo-f1", "facile", "Haircut in dollars (market value of collateral minus the amount lent)?",
        [["Market value of collateral", usd(mv)], ["Initial margin", pc(im)]],
        a, "$", 0,
        [`Prix d'achat (montant prêté) = ${D(mv)} / ${F(im)} = ${D(loan, 0)}.`,
          `Haircut = ${D(mv)} − ${D(loan, 0)} = ${D(a, 0)} (et non ${P(im - 1)} × ${D(mv)} = ${D(mv * (im - 1), 0)}).`]);
    })(),
    (() => {
      const loan = 100000000, r = 0.04, days = 1;
      const a = loan * r * (days / 360);
      return q("fi-repo-f2", "facile", "Interest paid on the overnight repo?",
        [["Purchase price (amount lent)", usd(loan)], ["Repo rate (360-day basis)", pc(r)], ["Term", "Overnight (1 day)"]],
        a, "$", 2,
        [`Intérêt = ${D(loan)} × ${F(r)} × 1 / 360 = ${D(a, 2)}.`]);
    })(),
    (() => {
      const loan = 25000000, r = 0.035, days = 30;
      const a = loan * ((r * days) / 360);
      return q("fi-repo-f3", "facile", "Repurchase price minus purchase price (repo interest)?",
        [["Purchase price (amount lent)", usd(loan)], ["Repo rate (360-day basis)", pc(r)], ["Term", `${days} days`]],
        a, "$", 2,
        [`Intérêt = ${D(loan)} × ${F(r)} × ${days} / 360 = ${D(a, 2)} (base 360, pas 365).`,
          `Prix de rachat = ${D(loan)} + ${D(a, 2)} = ${D(loan + a, 2)}.`]);
    })(),
    (() => {
      const mv = 10000000, loan = 9800000;
      const a = ((mv - loan) / mv) * 100;
      return q("fi-repo-f4", "facile", "Haircut on the collateral?",
        [["Market value of collateral", usd(mv)], ["Purchase price (amount lent)", usd(loan)]],
        a, "%", 2,
        [`Haircut = (${D(mv)} − ${D(loan)}) / ${D(mv)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const p0 = 9850000, p1 = 9893000, days = 45;
      const a = ((p1 - p0) / p0) * (360 / days) * 100;
      return q("fi-repo-f5", "facile", "Repo rate (360-day basis)?",
        [["Initial sale price", usd(p0)], ["Repurchase price", usd(p1)], ["Term", `${days} days`]],
        a, "%", 3,
        [`Intérêt = ${D(p1)} − ${D(p0)} = ${D(p1 - p0)}, soit ${P((p1 - p0) / p0, 4)} sur ${days} jours.`,
          `Taux repo = ${P((p1 - p0) / p0, 4)} × 360 / ${days} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const mv = 20000000, im = 1.08, r = 0.03, days = 60;
      const loan = mv / im;
      const a = loan * (1 + (r * days) / 360);
      return q("fi-repo-m1", "moyen", "Repurchase price?",
        [["Collateral", "High-yield corporate bonds"], ["Market value of collateral", usd(mv)], ["Initial margin", pc(im)],
          ["Repo rate (360-day basis)", pc(r)], ["Term", `${days} days`]],
        a, "$", 0,
        [`Prix d'achat = ${D(mv)} / ${F(im)} = ${D(loan, 0)}.`,
          `Prix de rachat = ${D(loan, 0)} × (1 + ${F(r)} × ${days} / 360) = ${D(a, 0)}.`]);
    })(),
    (() => {
      const im = 1.03;
      const a = (1 - 1 / im) * 100;
      return q("fi-repo-m2", "moyen", "Haircut implied by the initial margin?",
        [["Initial margin", pc(im)]],
        a, "%", 3,
        [`Prix d'achat = collatéral / ${F(im)}, donc haircut = 1 − 1 / ${F(im)}.`,
          `Haircut = ${Pa(a, 3)} (et non 3 %).`]);
    })(),
    (() => {
      const mv = 75000000, im = 1.06, r = 0.042, days = 90;
      const loan = mv / im;
      const a = loan * r * (days / 360);
      return q("fi-repo-m3", "moyen", "Interest paid on the term repo?",
        [["Collateral", "Investment-grade corporate bonds"], ["Market value of collateral", usd(mv)], ["Initial margin", pc(im)],
          ["Repo rate (360-day basis)", pc(r)], ["Term", `${days} days`]],
        a, "$", 0,
        [`Prix d'achat = ${D(mv)} / ${F(im)} = ${D(loan, 0)}.`,
          `Intérêt = ${D(loan, 0)} × ${F(r)} × ${days} / 360 = ${D(a, 0)}.`]);
    })(),
    (() => {
      const p0 = 980392, p1 = 985000, days = 60;
      const a = ((p1 - p0) / p0) * (360 / days) * 100;
      return q("fi-repo-m4", "moyen", "Repo rate (360-day basis)?",
        [["Purchase price", usd(p0)], ["Repurchase price", usd(p1)], ["Term", `${days} days`]],
        a, "%", 3,
        [`Rendement sur la période = ${D(p1 - p0)} / ${D(p0)} = ${P((p1 - p0) / p0, 4)}.`,
          `Taux repo = ${P((p1 - p0) / p0, 4)} × 360 / ${days} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const loan = 15000000, im = 1.075;
      const a = loan * im;
      return q("fi-repo-m5", "moyen", "Market value of collateral the borrower must deliver?",
        [["Collateral", "Lower-rated corporate bonds"], ["Amount to borrow", usd(loan)], ["Initial margin", pc(im)]],
        a, "$", 0,
        [`Collatéral = prêt × marge initiale = ${D(loan)} × ${F(im)} = ${D(a, 0)}.`,
          `Piège : ${D(loan)} / (1 − ${F(im - 1)}) = ${D(loan / (2 - im), 0)} traite la marge comme un haircut.`]);
    })(),
    (() => {
      const mv0 = 40000000, im = 1.02, r = 0.03, t = 20, mv1 = 39200000;
      const loan = mv0 / im;
      const loanT = loan * (1 + (r * t) / 360);
      const a = loanT * im - mv1;
      return q("fi-repo-d1", "difficile", "Variation margin the lender calls for?",
        [["Initial market value of collateral", usd(mv0)], ["Initial margin", pc(im)], ["Repo rate (360-day basis)", pc(r)],
          ["Term", "90 days"], ["Collateral value after 20 days", usd(mv1)]],
        a, "$", 0,
        [`Prêt initial = ${D(mv0)} / ${F(im)} = ${D(loan, 0)}.`,
          `Prêt capitalisé à ${t} jours = ${D(loan, 0)} × (1 + ${F(r)} × ${t} / 360) = ${D(loanT, 0)}.`,
          `Collatéral exigé = ${D(loanT, 0)} × ${F(im)} = ${D(loanT * im, 0)}.`,
          `Variation margin = ${D(loanT * im, 0)} − ${D(mv1)} = ${D(a, 0)} à verser par l'emprunteur.`]);
    })(),
    (() => {
      const mv0 = 30000000, im = 1.01, r = 0.028, t = 10, mv1 = 30600000;
      const loan = mv0 / im;
      const loanT = loan * (1 + (r * t) / 360);
      const a = loanT * im - mv1;
      return q("fi-repo-d2", "difficile", "Variation margin on the repo (negative if collateral can be released)?",
        [["Initial market value of collateral", usd(mv0)], ["Initial margin", pc(im)], ["Repo rate (360-day basis)", pc(r)], ["Collateral value after 10 days", usd(mv1)]],
        a, "$", 0,
        [`Prêt initial = ${D(mv0)} / ${F(im)} = ${D(loan, 0)} ; capitalisé à ${t} jours : ${D(loanT, 0)}.`,
          `Collatéral exigé = ${D(loanT, 0)} × ${F(im)} = ${D(loanT * im, 0)}.`,
          `Variation margin = ${D(loanT * im, 0)} − ${D(mv1)} = ${D(a, 0)} : surcollatéralisé, l'emprunteur peut récupérer ce montant de titres.`]);
    })(),
    (() => {
      const loan = 12000000, r = 0.041, days = 30;
      const interest = loan * r * (days / 360);
      const a = (interest / loan) * (365 / days) * 100;
      return q("fi-repo-d3", "difficile", "Repo rate restated as an add-on rate on a 365-day basis?",
        [["Purchase price (amount lent)", usd(loan)], ["Repo rate (360-day basis)", pc(r)], ["Term", `${days} days`]],
        a, "%", 3,
        [`Intérêt = ${D(loan)} × ${F(r)} × ${days} / 360 = ${D(interest, 2)}.`,
          `Rendement sur ${days} jours = ${P(interest / loan, 4)} ; base 365 : × 365 / ${days} = ${Pa(a, 3)} (= ${P(r)} × 365 / 360).`]);
    })(),
    (() => {
      const mv = 60000000, hc = 0.08, r = 0.04, days = 120;
      const loan = mv * (1 - hc);
      const a = loan * (1 + (r * days) / 360);
      return q("fi-repo-d4", "difficile", "Repurchase price?",
        [["Collateral", "High-yield corporate bonds"], ["Market value of collateral", usd(mv)], ["Haircut", pc(hc)],
          ["Repo rate (360-day basis)", pc(r)], ["Term", `${days} days`]],
        a, "$", 0,
        [`Ici on donne un haircut, pas une marge initiale : prix d'achat = ${D(mv)} × (1 − ${F(hc)}) = ${D(loan, 0)} (et non ${D(mv)} / ${F(1 + hc)} = ${D(mv / (1 + hc), 0)}).`,
          `Prix de rachat = ${D(loan)} × (1 + ${F(r)} × ${days} / 360) = ${D(a, 0)}.`]);
    })(),
    (() => {
      const mv0 = 50000000, im = 1.02, r = 0.036, t = 45, mv1 = 49500000;
      const loan = mv0 / im;
      const loanT = loan * (1 + (r * t) / 360);
      const a = loanT * im - mv1;
      return q("fi-repo-d5", "difficile", "Variation margin required after 45 days?",
        [["Initial market value of collateral", usd(mv0)], ["Initial margin", pc(im)], ["Repo rate (360-day basis)", pc(r)],
          ["Term", "90 days"], ["Collateral value after 45 days", usd(mv1)]],
        a, "$", 0,
        [`Prêt initial = ${D(mv0)} / ${F(im)} = ${D(loan, 0)}.`,
          `Prêt capitalisé à ${t} jours = ${D(loan, 0)} × (1 + ${F(r)} × ${t} / 360) = ${D(loanT, 0)}.`,
          `Collatéral exigé = ${D(loanT, 0)} × ${F(im)} = ${D(loanT * im, 0)}.`,
          `Variation margin = ${D(loanT * im, 0)} − ${D(mv1)} = ${D(a, 0)}.`]);
    })(),
  ],
};

/* ────────────────────────── Catalogue ────────────────────────── */

export const FIXED_INCOME_CALC: CalcCatalog = {
  topic: "fixed_income",
  types: [
    REPO,
    BOND_PRICE,
    ACCRUED,
    YTM,
    YIELD_MEASURES,
    SPREADS,
    MONEY_MARKET,
    SPOT,
    FORWARD,
    HORIZON,
    MACAULAY,
    PVBP,
    APPROX,
    PRICE_CHANGE,
    PORTFOLIO,
    CREDIT,
  ],
};
