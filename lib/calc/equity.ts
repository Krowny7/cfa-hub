// Exercices de calcul pur : Equity (CFA Level I).
//
// Contenu seulement : le moteur et les pages vivent ailleurs (lib/calc/engine.ts, app/calculs).
// Règle d'or : chaque réponse est CALCULÉE ici, à partir des mêmes nombres que les données
// affichées, par les petites fonctions financières du haut de fichier. Aucune réponse tapée à la main.
// Formules vérifiées dans Schweser Level I, Book 2 (Readings 39 à 46 = LM 1 à 8 du curriculum Equity)
// et recoupées avec la banque officielle de practice exams.
//
// Conventions : énoncés et données en anglais d'examen ; solutions en français, nombres au format
// français. Pour une réponse en %, `answer` vaut déjà le pourcentage (8,5 % → 8.5).

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
/** Montants en millions ou en milliers de dollars. */
const M = (x: number, d?: number): string => `${F(x, d ?? (isInt(x) ? 0 : 2))} M$`;
const K = (x: number, d?: number): string => `${F(x, d ?? (isInt(x) ? 0 : 2))} milliers de $`;
/** Somme signée lisible : [12, −4, 7] → « 12% − 4% + 7% ». */
const terms = (xs: number[], fmt: (x: number) => string): string =>
  xs.map((x, i) => (i === 0 ? fmt(x) : x < 0 ? ` − ${fmt(-x)}` : ` + ${fmt(x)}`)).join("");
/** Facteur d'actualisation affiché : (1 + r)^t → « 1,12³ ». */
const pw = (r: number, t: number): string => `${F(1 + r)}${t === 1 ? "" : t === 2 ? "²" : t === 3 ? "³" : "^" + t}`;

/** Formats anglais (données d'énoncé). */
const E = (x: number, d?: number): string => numStr(x, d, ".", ",");
const usd = (x: number, d?: number): string => `${x < 0 ? MINUS : ""}$${E(Math.abs(x), d ?? (isInt(x) ? 0 : 2))}`;
const pc = (frac: number, d?: number): string => `${E(frac * 100, d)}%`;
const spc = (frac: number): string => `${frac > 0 ? "+" : ""}${pc(frac)}`;
const sn = (x: number): string => `${x > 0 ? "+" : ""}${E(x)}`;
const mx = (x: number): string => `${E(x)}x`;
const lst = (xs: string[]): string => xs.join(" / ");

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

/* ────────────────────────── Fonctions financières ────────────────────────── */

const sum = (xs: number[]): number => xs.reduce((s, x) => s + x, 0);
const mean = (xs: number[]): number => sum(xs) / xs.length;
const pv = (cf: number, r: number, t: number): number => cf / Math.pow(1 + r, t);
const pvSeries = (cfs: number[], r: number): number => cfs.reduce((s, cf, i) => s + pv(cf, r, i + 1), 0);
const compound = (rs: number[]): number => rs.reduce((acc, r) => acc * (1 + r), 1) - 1;
function grow(d0: number, gs: number[]): number[] {
  const out: number[] = [];
  let d = d0;
  for (const g of gs) {
    d *= 1 + g;
    out.push(d);
  }
  return out;
}

// LM 1 · Market Organization and Structure
const leverageRatio = (im: number): number => 1 / im;
const marginCallPrice = (p0: number, im: number, mm: number): number => (p0 * (1 - im)) / (1 - mm);
const shortMarginCallPrice = (p0: number, im: number, mm: number): number => (p0 * (1 + im)) / (1 + mm);
type MarginInput = { n: number; p0: number; p1: number; im: number; rate: number; div?: number; comm?: number };
function marginTrade(o: MarginInput) {
  const div = o.div ?? 0;
  const comm = o.comm ?? 0;
  const value0 = o.n * o.p0;
  const equity = o.im * value0;
  const loan = value0 - equity;
  const commBuy = o.n * comm;
  const commSell = o.n * comm;
  const invested = equity + commBuy;
  const interest = loan * o.rate;
  const dividends = o.n * div;
  const value1 = o.n * o.p1;
  const endCash = value1 + dividends - loan - interest - commSell;
  return { value0, equity, loan, commBuy, commSell, invested, interest, dividends, value1, endCash, ret: endCash / invested - 1 };
}

// LM 2 · Security Market Indexes
const priceWeighted = (prices: number[], divisor: number): number => sum(prices) / divisor;
const newDivisor = (adjustedPrices: number[], indexValue: number): number => sum(adjustedPrices) / indexValue;
const capWeighted = (capsNow: number[], capsBase: number[], baseValue: number): number => (sum(capsNow) / sum(capsBase)) * baseValue;
const weight = (xs: number[], i: number): number => xs[i] / sum(xs);
const periodReturn = (v0: number, v1: number, income = 0): number => (v1 - v0 + income) / v0;
const caps = (prices: number[], shares: number[]): number[] => prices.map((p, i) => p * shares[i]);

// LM 4 · Overview of Equity Securities
const roeAverage = (ni: number, bv0: number, bv1: number): number => ni / ((bv0 + bv1) / 2);

// LM 5 à 7 · Company and Industry Analysis
const operatingProfit = (qty: number, p: number, vc: number, fc: number): number => qty * (p - vc) - fc;
const dol = (qty: number, p: number, vc: number, fc: number): number => (qty * (p - vc)) / (qty * (p - vc) - fc);
const dfl = (ebit: number, interest: number): number => ebit / (ebit - interest);
const hhi = (sharesPct: number[]): number => sum(sharesPct.map((s) => s * s));
const cagr = (v0: number, v1: number, years: number): number => Math.pow(v1 / v0, 1 / years) - 1;

// LM 8 · Equity Valuation: Concepts and Basic Tools
const gordon = (d1: number, r: number, g: number): number => d1 / (r - g);
const impliedReturn = (d1: number, p0: number, g: number): number => d1 / p0 + g;
/** g implicite quand on connaît D0 : P0 = D0(1 + g) / (r − g) ⇔ g = (P0·r − D0) / (P0 + D0). */
const impliedGrowthD0 = (d0: number, p0: number, r: number): number => (p0 * r - d0) / (p0 + d0);
const capm = (rf: number, beta: number, rm: number): number => rf + beta * (rm - rf);
const preferredValue = (dp: number, rp: number): number => dp / rp;
const sustainableGrowth = (retention: number, roe: number): number => retention * roe;
const leadingPE = (payout: number, r: number, g: number): number => payout / (r - g);
const trailingPE = (payout: number, r: number, g: number): number => (payout * (1 + g)) / (r - g);
const fcfeFromNI = (ni: number, da: number, dWC: number, fcInv: number, netBorrowing: number): number =>
  ni + da - dWC - fcInv + netBorrowing;
const fcfeFromCFO = (cfo: number, fcInv: number, netBorrowing: number): number => cfo - fcInv + netBorrowing;
const enterpriseValue = (equityMV: number, preferredMV: number, debtMV: number, cash: number): number =>
  equityMV + preferredMV + debtMV - cash;

/* ────────────────────────── 1 · Achat sur marge ────────────────────────── */

const MARGIN: CalcType = {
  key: "margin-purchase",
  topic: "equity",
  name: "Achat sur marge (margin transaction)",
  tier: "essentiel",
  source: "LM 1 · Market Organization and Structure",
  formulas: [
    "Levier (leverage ratio) = valeur de la position / fonds propres = 1 / marge initiale",
    "Mise initiale = marge initiale × valeur d'achat (+ commission d'achat)",
    "Rendement = (revente + dividendes − emprunt − intérêts − commission de vente) / mise initiale − 1",
    "Prix d'appel de marge = P0 × (1 − marge initiale) / (1 − marge de maintenance)",
  ],
  traps: [
    "Les intérêts (call money rate) portent sur le montant emprunté, pas sur toute la position.",
    "La commission d'achat s'ajoute à la mise initiale ; celle de vente réduit le produit final.",
    "La marge de maintenance s'applique à la valeur courante de la position.",
  ],
  questions: [
    (() => {
      const im = 0.4;
      const a = leverageRatio(im);
      return q("eq-margin-f1", "facile", "Leverage ratio of the margin purchase?",
        [["Initial margin requirement", pc(im)]],
        a, "x", 2,
        [`Levier = 1 / marge initiale = 1 / ${F(im)}.`,
          `Levier = ${F(a, 2)}x : 1 $ de fonds propres porte ${F(a, 2)} $ d'actions.`]);
    })(),
    (() => {
      const p0 = 40, im = 0.5, mm = 0.25;
      const a = marginCallPrice(p0, im, mm);
      return q("eq-margin-f2", "facile", "Stock price below which the investor gets a margin call?",
        [["Purchase price", usd(p0, 2)], ["Initial margin", pc(im)], ["Maintenance margin", pc(mm)]],
        a, "$", 2,
        ["Prix d'appel = P0 × (1 − marge initiale) / (1 − marge de maintenance).",
          `= ${F(p0)} × (1 − ${F(im)}) / (1 − ${F(mm)}) = ${F(p0 * (1 - im))} / ${F(1 - mm)}.`,
          `Appel de marge sous ${D(a, 2)}.`]);
    })(),
    (() => {
      const n = 500, p0 = 60, im = 0.45;
      const value = n * p0;
      const a = (1 - im) * value;
      return q("eq-margin-f3", "facile", "Amount borrowed from the broker?",
        [["Shares purchased", E(n)], ["Price per share", usd(p0, 2)], ["Initial margin", pc(im)]],
        a, "$", 0,
        [`Valeur de l'achat = ${F(n)} × ${D(p0)} = ${D(value)}.`,
          `Emprunt = (1 − ${F(im)}) × ${D(value)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const im = 0.5, change = 0.08;
      const lev = leverageRatio(im);
      const a = lev * change * 100;
      return q("eq-margin-f4", "facile", "Return on equity? (Ignore interest, dividends and commissions.)",
        [["Initial margin", pc(im)], ["Stock price change", spc(change)]],
        a, "%", 2,
        [`Levier = 1 / ${F(im)} = ${F(lev, 2)}.`,
          `Rendement des fonds propres = levier × variation du prix = ${F(lev, 2)} × ${P(change)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const lev = 4;
      const a = 100 / lev;
      return q("eq-margin-f5", "facile", "Initial margin requirement implied by the leverage ratio?",
        [["Leverage ratio", mx(lev)]],
        a, "%", 1,
        ["Levier = 1 / marge initiale, donc marge initiale = 1 / levier.",
          `Marge initiale = 1 / ${F(lev)} = ${Pa(a, 1)}.`]);
    })(),
    (() => {
      const o = { n: 1000, p0: 50, p1: 56, im: 0.4, rate: 0.05, div: 1 };
      const t = marginTrade(o);
      const a = t.ret * 100;
      return q("eq-margin-m1", "moyen", "Return on the investor's equity after one year?",
        [["Shares purchased", E(o.n)], ["Purchase price", usd(o.p0, 2)], ["Price after one year", usd(o.p1, 2)],
          ["Initial margin", pc(o.im)], ["Call money rate", pc(o.rate)], ["Dividend per share", usd(o.div, 2)]],
        a, "%", 2,
        [`Mise initiale = ${P(o.im)} × ${D(t.value0)} = ${D(t.equity)} ; emprunt = ${D(t.loan)}.`,
          `Intérêts = ${D(t.loan)} × ${P(o.rate)} = ${D(t.interest)} ; dividendes = ${D(t.dividends)}.`,
          `Produit final = ${D(t.value1)} + ${D(t.dividends)} − ${D(t.loan)} − ${D(t.interest)} = ${D(t.endCash)}.`,
          `Rendement = ${D(t.endCash)} / ${D(t.invested)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const p0 = 80, im = 0.6, mm = 0.3;
      const a = marginCallPrice(p0, im, mm);
      return q("eq-margin-m2", "moyen", "Margin call price?",
        [["Purchase price", usd(p0, 2)], ["Initial margin", pc(im)], ["Maintenance margin", pc(mm)]],
        a, "$", 2,
        [`Emprunt par action = (1 − ${F(im)}) × ${F(p0)} = ${D(p0 * (1 - im), 2)}.`,
          `Appel quand (P − ${F(p0 * (1 - im))}) / P = ${F(mm)}, soit P = ${F(p0 * (1 - im))} / (1 − ${F(mm)}).`,
          `P = ${F(p0 * (1 - im))} / ${F(1 - mm)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const p0 = 50, im = 0.5, p1 = 40;
      const loan = p0 * (1 - im);
      const equity = p1 - loan;
      const a = (equity / p1) * 100;
      return q("eq-margin-m3", "moyen", "Equity percentage in the account after the price drop?",
        [["Purchase price", usd(p0, 2)], ["Initial margin", pc(im)], ["Current price", usd(p1, 2)]],
        a, "%", 2,
        [`Emprunt par action = (1 − ${F(im)}) × ${D(p0)} = ${D(loan, 2)} (il ne bouge pas).`,
          `Fonds propres par action = ${D(p1)} − ${D(loan, 2)} = ${D(equity, 2)}.`,
          `Part des fonds propres = ${F(equity, 2)} / ${F(p1)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const im = 0.5, mm = 0.3;
      const ratio = (1 - im) / (1 - mm);
      const a = (1 - ratio) * 100;
      return q("eq-margin-m4", "moyen", "Percentage price decline that triggers a margin call?",
        [["Initial margin", pc(im)], ["Maintenance margin", pc(mm)]],
        a, "%", 2,
        [`Prix d'appel / P0 = (1 − ${F(im)}) / (1 − ${F(mm)}) = ${F(1 - im)} / ${F(1 - mm)} = ${F(ratio, 4)}.`,
          `Baisse qui déclenche l'appel = 1 − ${F(ratio, 4)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const cash = 12000, im = 0.4, p0 = 50;
      const position = cash / im;
      const a = position / p0;
      return q("eq-margin-m5", "moyen", "Maximum number of shares the investor can buy on margin?",
        [["Investor's cash", usd(cash)], ["Initial margin", pc(im)], ["Share price", usd(p0, 2)]],
        a, "", 0,
        [`La mise doit couvrir ${P(im)} de la position : position maximale = ${D(cash)} / ${F(im)} = ${D(position)}.`,
          `Le broker prête ${D(position - cash)}.`,
          `Nombre d'actions = ${D(position)} / ${D(p0)} = ${F(a, 0)}.`]);
    })(),
    (() => {
      const o = { n: 800, p0: 25, p1: 28, im: 0.5, rate: 0.06, div: 0.4, comm: 0.05 };
      const t = marginTrade(o);
      const a = t.ret * 100;
      return q("eq-margin-d1", "difficile", "Return on the margin transaction after one year?",
        [["Shares purchased", E(o.n)], ["Purchase price", usd(o.p0, 2)], ["Price after one year", usd(o.p1, 2)],
          ["Initial margin", pc(o.im)], ["Call money rate", pc(o.rate)], ["Dividend per share", usd(o.div, 2)],
          ["Commission per share (each way)", usd(o.comm, 2)]],
        a, "%", 2,
        [`Mise initiale = ${P(o.im)} × ${D(t.value0)} + commission ${D(t.commBuy)} = ${D(t.invested)} ; emprunt = ${D(t.loan)}.`,
          `Intérêts = ${D(t.loan)} × ${P(o.rate)} = ${D(t.interest)} ; dividendes = ${F(o.n)} × ${D(o.div, 2)} = ${D(t.dividends)}.`,
          `Produit final = ${D(t.value1)} + ${D(t.dividends)} − ${D(t.loan)} − ${D(t.interest)} − ${D(t.commSell)} = ${D(t.endCash)}.`,
          `Rendement = ${D(t.endCash)} / ${D(t.invested)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const p0 = 72, im = 0.6, mm = 0.35, rate = 0.05;
      const a = marginCallPrice(p0, im, mm);
      return q("eq-margin-d2", "difficile", "Stock price that triggers a margin call?",
        [["Purchase price", usd(p0, 2)], ["Initial margin", pc(im)], ["Maintenance margin", pc(mm)], ["Call money rate", pc(rate)]],
        a, "$", 2,
        ["Le taux d'emprunt n'intervient pas dans le prix d'appel : c'est la donnée-piège.",
          `Prix d'appel = ${F(p0)} × (1 − ${F(im)}) / (1 − ${F(mm)}) = ${F(p0 * (1 - im), 2)} / ${F(1 - mm)}.`,
          `Appel de marge sous ${D(a, 2)}.`]);
    })(),
    (() => {
      const n = 1000, p0 = 50, im = 0.5, mm = 0.3, p1 = 32;
      const loan = n * p0 * (1 - im);
      const value = n * p1;
      const equity = value - loan;
      const required = mm * value;
      const a = required - equity;
      return q("eq-margin-d3", "difficile", "Cash deposit needed to restore the maintenance margin?",
        [["Shares purchased", E(n)], ["Purchase price", usd(p0, 2)], ["Initial margin", pc(im)],
          ["Maintenance margin", pc(mm)], ["Current price", usd(p1, 2)]],
        a, "$", 0,
        [`Emprunt = (1 − ${F(im)}) × ${F(n)} × ${D(p0)} = ${D(loan)}.`,
          `Valeur actuelle = ${D(value)} ; fonds propres = ${D(value)} − ${D(loan)} = ${D(equity)}, soit ${P(equity / value, 2)} < ${P(mm)} : appel de marge.`,
          `Fonds propres exigés = ${P(mm)} × ${D(value)} = ${D(required)}.`,
          `Dépôt = ${D(required)} − ${D(equity)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const p0 = 50, im = 0.5, target = 4;
      const loan = p0 * (1 - im);
      const a = (target * loan) / (target - 1);
      return q("eq-margin-d4", "difficile", "Stock price at which the leverage ratio reaches 4x?",
        [["Purchase price", usd(p0, 2)], ["Initial margin", pc(im)], ["Leverage ratio at purchase", mx(leverageRatio(im))]],
        a, "$", 2,
        [`Emprunt par action = (1 − ${F(im)}) × ${D(p0)} = ${D(loan, 2)} ; il reste fixe quand le prix baisse.`,
          `Levier = P / (P − ${F(loan)}) = ${F(target)}, donc P = ${F(target)}P − ${F(target * loan)}, soit P = ${F(target * loan)} / ${F(target - 1)}.`,
          `P = ${D(a, 2)} : un levier de ${F(target)}x équivaut à des fonds propres de ${P(1 / target)} de la position.`]);
    })(),
    (() => {
      const p0 = 30, im = 0.4, rate = 0.05, div = 0.6, target = 0.25;
      const eq = im * p0, loan = p0 - eq, interest = loan * rate;
      const goal = eq * (1 + target);
      const a = goal + loan + interest - div;
      return q("eq-margin-d5", "difficile", "Selling price after one year needed to earn the target return on equity?",
        [["Purchase price", usd(p0, 2)], ["Initial margin", pc(im)], ["Call money rate", pc(rate)],
          ["Dividend per share", usd(div, 2)], ["Target return on equity", pc(target)]],
        a, "$", 2,
        [`Par action : mise = ${D(eq, 2)}, emprunt = ${D(loan, 2)}, intérêts = ${D(interest, 2)}.`,
          `Produit final visé = ${D(eq, 2)} × (1 + ${F(target)}) = ${D(goal, 2)}.`,
          `P1 + ${F(div, 2)} − ${F(loan, 2)} − ${F(interest, 2)} = ${F(goal, 2)}, donc P1 = ${D(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 2 · Vente à découvert ────────────────────────── */

const SHORT: CalcType = {
  key: "short-sale",
  topic: "equity",
  name: "Vente à découvert (short sale)",
  tier: "annexe",
  source: "LM 1 · Market Organization and Structure",
  formulas: [
    "Profit = (prix de vente à découvert − prix de rachat − dividendes reversés) × nombre d'actions − frais",
    "Marge déposée = marge initiale × valeur des actions vendues",
    "Rendement = profit / marge déposée",
    "Appel de marge (short) si P > P0 × (1 + marge initiale) / (1 + marge de maintenance)",
  ],
  traps: [
    "Le vendeur à découvert reverse les dividendes au prêteur (payments-in-lieu) : ils réduisent son profit.",
    "Une hausse du prix est une perte, potentiellement illimitée.",
  ],
  questions: [
    (() => {
      const n = 200, p0 = 45, p1 = 38;
      const a = n * (p0 - p1);
      return q("eq-short-f1", "facile", "Profit on the short sale?",
        [["Shares sold short", E(n)], ["Short sale price", usd(p0, 2)], ["Price when covered", usd(p1, 2)]],
        a, "$", 0,
        [`Gain par action = ${D(p0)} − ${D(p1)} = ${D(p0 - p1)}.`,
          `Profit = ${F(n)} × ${D(p0 - p1)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const n = 500, p0 = 30, im = 0.5;
      const a = im * n * p0;
      return q("eq-short-f2", "facile", "Initial margin deposit required?",
        [["Shares sold short", E(n)], ["Short sale price", usd(p0, 2)], ["Initial margin", pc(im)]],
        a, "$", 0,
        [`Valeur vendue à découvert = ${F(n)} × ${D(p0)} = ${D(n * p0)}.`,
          `Marge à déposer = ${P(im)} × ${D(n * p0)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const p0 = 25, p1 = 31;
      const a = p0 - p1;
      return q("eq-short-f3", "facile", "Profit per share on the short position? (Negative if a loss.)",
        [["Short sale price", usd(p0, 2)], ["Price when covered", usd(p1, 2)]],
        a, "$", 2,
        ["Le vendeur à découvert gagne si le prix baisse : profit = prix de vente − prix de rachat.",
          `Profit = ${D(p0)} − ${D(p1)} = ${D(a, 2)} : une perte.`]);
    })(),
    (() => {
      const n = 1000, div = 0.75;
      const a = n * div;
      return q("eq-short-f4", "facile", "Amount the short seller must pay to the share lender?",
        [["Shares sold short", E(n)], ["Dividend paid during the period", usd(div, 2)]],
        a, "$", 0,
        ["Le vendeur à découvert reverse au prêteur chaque dividende versé (payment-in-lieu).",
          `Montant = ${F(n)} × ${D(div, 2)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const p0 = 50, im = 0.5, p1 = 45;
      const a = ((p0 - p1) / (im * p0)) * 100;
      return q("eq-short-f5", "facile", "Return on the margin deposit? (No dividends, no costs.)",
        [["Short sale price", usd(p0, 2)], ["Initial margin", pc(im)], ["Price when covered", usd(p1, 2)]],
        a, "%", 2,
        [`Marge par action = ${F(im)} × ${D(p0)} = ${D(im * p0, 2)} ; gain = ${D(p0 - p1)}.`,
          `Rendement = ${F(p0 - p1)} / ${F(im * p0, 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const n = 300, p0 = 60, div = 1.2, p1 = 52;
      const a = n * (p0 - p1 - div);
      return q("eq-short-m1", "moyen", "Profit on the short position?",
        [["Shares sold short", E(n)], ["Short sale price", usd(p0, 2)], ["Dividend paid during the period", usd(div, 2)],
          ["Price when covered", usd(p1, 2)]],
        a, "$", 0,
        [`Gain de prix par action = ${D(p0)} − ${D(p1)} = ${D(p0 - p1)}.`,
          `Moins le dividende reversé : ${D(p0 - p1)} − ${D(div, 2)} = ${D(p0 - p1 - div, 2)}.`,
          `Profit = ${F(n)} × ${D(p0 - p1 - div, 2)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const n = 100, p0 = 80, im = 0.5, div = 2, p1 = 70;
      const margin = im * n * p0;
      const profit = n * (p0 - p1 - div);
      const a = (profit / margin) * 100;
      return q("eq-short-m2", "moyen", "Return on the margin deposit?",
        [["Shares sold short", E(n)], ["Short sale price", usd(p0, 2)], ["Initial margin", pc(im)],
          ["Dividend paid during the period", usd(div, 2)], ["Price when covered", usd(p1, 2)]],
        a, "%", 2,
        [`Marge déposée = ${P(im)} × ${D(n * p0)} = ${D(margin)}.`,
          `Profit = ${F(n)} × (${F(p0)} − ${F(p1)} − ${F(div)}) = ${D(profit)}.`,
          `Rendement = ${D(profit)} / ${D(margin)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const p0 = 40, im = 0.5, mm = 0.3;
      const a = shortMarginCallPrice(p0, im, mm);
      return q("eq-short-m3", "moyen", "Stock price above which the short seller gets a margin call?",
        [["Short sale price", usd(p0, 2)], ["Initial margin", pc(im)], ["Maintenance margin", pc(mm)]],
        a, "$", 2,
        [`Compte par action = produit de la vente + marge = ${D(p0)} × (1 + ${F(im)}) = ${D(p0 * (1 + im))}.`,
          `Fonds propres = ${F(p0 * (1 + im))} − P ; appel quand (${F(p0 * (1 + im))} − P) / P = ${F(mm)}.`,
          `P = ${F(p0 * (1 + im))} / ${F(1 + mm)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const n = 400, p0 = 25, im = 0.5, p1 = 28;
      const proceeds = n * p0, margin = im * proceeds, account = proceeds + margin, liab = n * p1;
      const a = account - liab;
      return q("eq-short-m4", "moyen", "Equity in the short seller's account after the price rise?",
        [["Shares sold short", E(n)], ["Short sale price", usd(p0, 2)], ["Initial margin", pc(im)], ["Current price", usd(p1, 2)]],
        a, "$", 0,
        [`Compte = produit de la vente ${D(proceeds)} + marge déposée ${D(margin)} = ${D(account)}.`,
          `Actions à rendre = ${F(n)} × ${D(p1)} = ${D(liab)}.`,
          `Fonds propres = ${D(account)} − ${D(liab)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const p0 = 50, div = 1.5, comm = 0.1;
      const a = p0 - div - 2 * comm;
      return q("eq-short-m5", "moyen", "Cover price at which the short sale breaks even?",
        [["Short sale price", usd(p0, 2)], ["Dividend paid during the period", usd(div, 2)], ["Commission per share (each way)", usd(comm, 2)]],
        a, "$", 2,
        [`Coûts par action = dividende ${D(div, 2)} + 2 commissions ${D(2 * comm, 2)} = ${D(div + 2 * comm, 2)}.`,
          `Point mort : ${F(p0)} − P1 = ${F(div + 2 * comm, 2)}, donc P1 = ${D(a, 2)}.`]);
    })(),
    (() => {
      const n = 1000, p0 = 40, im = 0.5, rebate = 0.02, div = 0.5, p1 = 35;
      const proceeds = n * p0, margin = im * proceeds;
      const rebateAmt = rebate * proceeds, divs = n * div, priceGain = n * (p0 - p1);
      const profit = priceGain - divs + rebateAmt;
      const a = (profit / margin) * 100;
      return q("eq-short-d1", "difficile", "One-year return on the margin deposit?",
        [["Shares sold short", E(n)], ["Short sale price", usd(p0, 2)], ["Initial margin (cash)", pc(im)],
          ["Short rebate rate on sale proceeds", pc(rebate)], ["Dividend paid during the year", usd(div, 2)], ["Price when covered", usd(p1, 2)]],
        a, "%", 2,
        [`Gain de prix = ${F(n)} × (${F(p0)} − ${F(p1)}) = ${D(priceGain)} ; dividendes reversés = ${D(divs)}.`,
          `Rebate reçu = ${P(rebate)} × ${D(proceeds)} = ${D(rebateAmt)}.`,
          `Profit = ${D(priceGain)} − ${D(divs)} + ${D(rebateAmt)} = ${D(profit)} ; marge = ${D(margin)}.`,
          `Rendement = ${D(profit)} / ${D(margin)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const p0 = 50, im = 0.5, p1 = 60;
      const account = p0 * (1 + im);
      const equity = account - p1;
      const a = (equity / p1) * 100;
      return q("eq-short-d2", "difficile", "Equity percentage in the short account after the price rise?",
        [["Short sale price", usd(p0, 2)], ["Initial margin", pc(im)], ["Current price", usd(p1, 2)]],
        a, "%", 2,
        [`Compte par action = ${D(p0)} × ${F(1 + im)} = ${D(account)}.`,
          `Fonds propres = ${D(account)} − ${D(p1)} = ${D(equity)}.`,
          `Part des fonds propres = ${F(equity)} / ${F(p1)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const p0 = 64, im = 0.4, mm = 0.25, div = 1;
      const a = shortMarginCallPrice(p0, im, mm);
      return q("eq-short-d3", "difficile", "Highest price before the short seller gets a margin call?",
        [["Short sale price", usd(p0, 2)], ["Initial margin", pc(im)], ["Maintenance margin", pc(mm)], ["Annual dividend", usd(div, 2)]],
        a, "$", 2,
        ["Le dividende ne change pas le seuil d'appel : c'est la donnée-piège.",
          `Compte par action = ${D(p0)} × ${F(1 + im)} = ${D(p0 * (1 + im), 2)}.`,
          `Appel quand (${F(p0 * (1 + im), 2)} − P) / P = ${F(mm)}, soit P = ${F(p0 * (1 + im), 2)} / ${F(1 + mm)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const p0 = 40, im = 0.5, div = 0.8, target = 0.3;
      const margin = im * p0, need = target * margin;
      const a = p0 - div - need;
      return q("eq-short-d4", "difficile", "Cover price needed to earn the target return on the margin deposit?",
        [["Short sale price", usd(p0, 2)], ["Initial margin", pc(im)], ["Dividend paid during the period", usd(div, 2)], ["Target return", pc(target)]],
        a, "$", 2,
        [`Marge par action = ${F(im)} × ${D(p0)} = ${D(margin)}.`,
          `Profit visé = ${P(target)} × ${D(margin)} = ${D(need, 2)} par action.`,
          `${F(p0)} − P1 − ${F(div, 2)} = ${F(need, 2)}, donc P1 = ${D(a, 2)}.`]);
    })(),
    (() => {
      const n = 500, p0 = 30, im = 0.5, mm = 0.3, p1 = 38;
      const account = n * p0 * (1 + im), liab = n * p1, equity = account - liab, required = mm * liab;
      const a = required - equity;
      return q("eq-short-d5", "difficile", "Cash deposit needed to restore the maintenance margin?",
        [["Shares sold short", E(n)], ["Short sale price", usd(p0, 2)], ["Initial margin", pc(im)],
          ["Maintenance margin", pc(mm)], ["Current price", usd(p1, 2)]],
        a, "$", 0,
        [`Compte = ${F(n)} × ${D(p0)} × ${F(1 + im)} = ${D(account)} ; actions à rendre = ${F(n)} × ${D(p1)} = ${D(liab)}.`,
          `Fonds propres = ${D(account)} − ${D(liab)} = ${D(equity)}, soit ${P(equity / liab, 2)} < ${P(mm)}.`,
          `Fonds propres exigés = ${P(mm)} × ${D(liab)} = ${D(required)}.`,
          `Dépôt = ${D(required)} − ${D(equity)} = ${D(a, 0)}.`]);
    })(),
  ],
};

/* ────────────────────────── 3 · Pondération d'indice ────────────────────────── */

const INDEX_WEIGHTING: CalcType = {
  key: "index-weighting",
  topic: "equity",
  name: "Méthodes de pondération d'indice (index weighting)",
  tier: "essentiel",
  source: "LM 2 · Security Market Indexes",
  formulas: [
    "Price-weighted : indice = Σ prix / diviseur ; poids d'un titre = Pi / Σ P",
    "Split : nouveau diviseur = Σ prix ajustés / valeur de l'indice juste avant le split",
    "Market-cap : indice = Σ (P1 × N) / Σ (P0 × N) × valeur de base ; poids = capi / Σ cap",
    "Float-adjusted : capitalisation × % du flottant (actions disponibles au public)",
    "Equal-weighted : rendement = moyenne simple des rendements des titres",
  ],
  traps: [
    "Price-weighted : un titre cher pèse lourd, quelle que soit la taille de l'entreprise.",
    "Après un split, le diviseur baisse et l'indice ne bouge pas.",
    "Equal-weighted : on fait la moyenne des rendements, pas des prix.",
  ],
  questions: [
    (() => {
      const prices = [25, 40, 85], div = 3;
      const a = priceWeighted(prices, div);
      return q("eq-idxw-f1", "facile", "Price-weighted index value?",
        [["Prices A / B / C", lst(prices.map((p) => usd(p, 2)))], ["Divisor", E(div)]],
        a, "", 2,
        [`Somme des prix = ${prices.map((p) => F(p)).join(" + ")} = ${F(sum(prices))}.`,
          `Indice = ${F(sum(prices))} / ${F(div)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const prices = [20, 30, 50];
      const a = weight(prices, 2) * 100;
      return q("eq-idxw-f2", "facile", "Weight of stock C in a price-weighted index?",
        [["Prices A / B / C", lst(prices.map((p) => usd(p, 2)))]],
        a, "%", 2,
        ["En price-weighted, le poids d'un titre = son prix / somme des prix.",
          `Poids de C = ${F(prices[2])} / ${F(sum(prices))} = ${Pa(a)}.`]);
    })(),
    (() => {
      const rets = [0.12, -0.04, 0.07];
      const a = mean(rets) * 100;
      return q("eq-idxw-f3", "facile", "Equal-weighted index return?",
        [["Returns A / B / C", lst(rets.map(spc))]],
        a, "%", 2,
        ["Equal-weighted : moyenne simple des rendements.",
          `Rendement = (${terms(rets, (r) => P(r))}) / 3 = ${Pa(a)}.`]);
    })(),
    (() => {
      const prices = [20, 50, 10], shares = [6, 2, 8];
      const cp = caps(prices, shares);
      const a = weight(cp, 0) * 100;
      return q("eq-idxw-f4", "facile", "Weight of stock A in a market-cap-weighted index?",
        [["Prices A / B / C", lst(prices.map((p) => usd(p, 2)))], ["Shares outstanding (millions)", lst(shares.map((s) => E(s)))]],
        a, "%", 2,
        [`Capitalisations = ${cp.map((c) => F(c)).join(" ; ")} M$ ; total = ${F(sum(cp))} M$.`,
          `Poids de A = ${F(cp[0])} / ${F(sum(cp))} = ${Pa(a)}.`]);
    })(),
    (() => {
      const base = 1000, mv0 = 250, mv1 = 270;
      const a = capWeighted([mv1], [mv0], base);
      return q("eq-idxw-f5", "facile", "Current value of the market-cap-weighted index?",
        [["Base value", E(base)], ["Base-period market value", `${usd(mv0)} million`], ["Current market value", `${usd(mv1)} million`]],
        a, "", 2,
        ["Indice = capitalisation actuelle / capitalisation de base × valeur de base.",
          `Indice = ${F(mv1)} / ${F(mv0)} × ${F(base)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const p0 = [30, 45, 75], p1 = [33, 42, 90];
      const a = (sum(p1) / sum(p0) - 1) * 100;
      return q("eq-idxw-m1", "moyen", "Price-weighted index return over the period?",
        [["Start prices A / B / C", lst(p0.map((p) => usd(p, 2)))], ["End prices A / B / C", lst(p1.map((p) => usd(p, 2)))]],
        a, "%", 2,
        [`Le diviseur est le même aux deux dates : il suffit de comparer les sommes de prix.`,
          `Somme début = ${F(sum(p0))} ; somme fin = ${F(sum(p1))}.`,
          `Rendement = ${F(sum(p1))} / ${F(sum(p0))} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const prices = [15, 35, 70], div = 3, split = 2;
      const v = priceWeighted(prices, div);
      const adj = [prices[0], prices[1], prices[2] / split];
      const a = newDivisor(adj, v);
      return q("eq-idxw-m2", "moyen", "New divisor after the split?",
        [["Prices A / B / C", lst(prices.map((p) => usd(p, 2)))], ["Current divisor", E(div)], ["Corporate action", "C splits 2-for-1"]],
        a, "", 3,
        [`Indice avant split = ${F(sum(prices))} / ${F(div)} = ${F(v, 2)}.`,
          `Après le split, C vaut ${F(prices[2])} / ${F(split)} = ${F(adj[2])} ; somme = ${F(sum(adj))}.`,
          `Nouveau diviseur d : ${F(sum(adj))} / d = ${F(v, 2)}, donc d = ${F(a, 3)}.`]);
    })(),
    (() => {
      const p0 = [30, 50, 20], p1 = [33, 48, 25], n = [2000, 5000, 4000];
      const c0 = caps(p0, n), c1 = caps(p1, n);
      const a = (sum(c1) / sum(c0) - 1) * 100;
      return q("eq-idxw-m3", "moyen", "Market-cap-weighted index return?",
        [["Shares A / B / C", lst(n.map((x) => E(x)))], ["Start prices A / B / C", lst(p0.map((p) => usd(p, 2)))],
          ["End prices A / B / C", lst(p1.map((p) => usd(p, 2)))]],
        a, "%", 2,
        [`Capitalisation début = ${c0.map((c) => F(c)).join(" + ")} = ${D(sum(c0))}.`,
          `Capitalisation fin = ${c1.map((c) => F(c)).join(" + ")} = ${D(sum(c1))}.`,
          `Rendement = ${F(sum(c1))} / ${F(sum(c0))} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const cp = [400, 300, 300], fl = [0.5, 1, 0.8];
      const fc = cp.map((c, i) => c * fl[i]);
      const a = weight(fc, 0) * 100;
      return q("eq-idxw-m4", "moyen", "Weight of stock A in a float-adjusted market-cap index?",
        [["Market caps A / B / C ($ millions)", lst(cp.map((c) => E(c)))], ["Float A / B / C", lst(fl.map((f) => pc(f)))]],
        a, "%", 2,
        [`Capitalisations flottantes = ${fc.map((c) => F(c)).join(" ; ")} M$.`,
          `Total flottant = ${F(sum(fc))} M$.`,
          `Poids de A = ${F(fc[0])} / ${F(sum(fc))} = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 250, p0 = [40, 25, 80], p1 = [44, 24, 90];
      const rets = p0.map((p, i) => p1[i] / p - 1);
      const r = mean(rets);
      const a = v0 * (1 + r);
      return q("eq-idxw-m5", "moyen", "New value of the equal-weighted index?",
        [["Initial index value", E(v0)], ["Start prices A / B / C", lst(p0.map((p) => usd(p, 2)))], ["End prices A / B / C", lst(p1.map((p) => usd(p, 2)))]],
        a, "", 2,
        [`Rendements : ${rets.map((x) => P(x, 2)).join(" ; ")}.`,
          `Moyenne = ${P(r, 4)}.`,
          `Indice = ${F(v0)} × (1 + ${F(r, 6)}) = ${F(a, 2)}.`]);
    })(),
    (() => {
      const p1 = [90, 30, 60], div0 = 3, split = 3, p2 = [33, 29, 62];
      const v1 = priceWeighted(p1, div0);
      const adj = [p1[0] / split, p1[1], p1[2]];
      const div1 = newDivisor(adj, v1);
      const a = priceWeighted(p2, div1);
      return q("eq-idxw-d1", "difficile", "Price-weighted index value at the end of day 2?",
        [["Day 1 prices A / B / C", lst(p1.map((p) => usd(p, 2)))], ["Day 1 divisor", E(div0)],
          ["After day 1 close", "A splits 3-for-1"], ["Day 2 prices A / B / C", lst(p2.map((p) => usd(p, 2)))]],
        a, "", 2,
        [`Indice jour 1 = ${F(sum(p1))} / ${F(div0)} = ${F(v1)}.`,
          `Après le split, A vaut ${F(p1[0])} / ${F(split)} = ${F(adj[0])} ; nouveau diviseur = ${F(sum(adj))} / ${F(v1)} = ${F(div1)}.`,
          `Indice jour 2 = ${F(sum(p2))} / ${F(div1)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const p0 = [20, 50, 10], p1 = [22, 49, 12], n = [10, 4, 15], fl = [0.4, 1, 0.6];
      const f0 = p0.map((p, i) => p * n[i] * fl[i]);
      const f1 = p1.map((p, i) => p * n[i] * fl[i]);
      const a = (sum(f1) / sum(f0) - 1) * 100;
      return q("eq-idxw-d2", "difficile", "Float-adjusted market-cap index return?",
        [["Shares outstanding A / B / C (millions)", lst(n.map((x) => E(x)))], ["Float A / B / C", lst(fl.map((f) => pc(f)))],
          ["Start prices A / B / C", lst(p0.map((p) => usd(p, 2)))], ["End prices A / B / C", lst(p1.map((p) => usd(p, 2)))]],
        a, "%", 2,
        [`Actions flottantes = ${n.map((x, i) => F(x * fl[i])).join(" ; ")} millions.`,
          `Capitalisation flottante début = ${f0.map((c) => F(c)).join(" + ")} = ${F(sum(f0))} M$.`,
          `Capitalisation flottante fin = ${f1.map((c) => F(c)).join(" + ")} = ${F(sum(f1))} M$.`,
          `Rendement = ${F(sum(f1))} / ${F(sum(f0))} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const rA = 22 / 20 - 1, rB = 48 / 50 - 1, pC0 = 40;
      const rC = -(rA + rB);
      const a = pC0 * (1 + rC);
      return q("eq-idxw-d3", "difficile", "End price of stock C that leaves the equal-weighted index unchanged?",
        [["Stock A", `${usd(20, 2)} → ${usd(22, 2)}`], ["Stock B", `${usd(50, 2)} → ${usd(48, 2)}`], ["Stock C start price", usd(pC0, 2)]],
        a, "$", 2,
        [`Rendements : A = ${P(rA)} ; B = ${P(rB)}.`,
          `Indice inchangé si la moyenne des 3 rendements est nulle : rC = −(${terms([rA, rB], (r) => P(r))}) = ${P(rC)}.`,
          `Prix de C = ${D(pC0)} × (1 ${MINUS} ${F(-rC)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const pB = 40, pC = 60, div = 2.5, target = 50;
      const a = target * div - pB - pC;
      return q("eq-idxw-d4", "difficile", "Price of stock A for the price-weighted index to reach the target value?",
        [["Price B / C", lst([usd(pB, 2), usd(pC, 2)])], ["Divisor", E(div)], ["Target index value", E(target)]],
        a, "$", 2,
        [`Somme des prix requise = indice × diviseur = ${F(target)} × ${F(div)} = ${F(target * div)}.`,
          `Prix de A = ${F(target * div)} − ${F(pB)} − ${F(pC)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const cp = [300, 500, 200], rA = 0.08, rB = -0.02;
      const wA = weight(cp, 0), wB = weight(cp, 1), wC = weight(cp, 2);
      const rC = -(wA * rA + wB * rB) / wC;
      const a = rC * 100;
      return q("eq-idxw-d5", "difficile", "Return of stock C that leaves the market-cap-weighted index unchanged?",
        [["Start market caps A / B / C ($ millions)", lst(cp.map((c) => E(c)))], ["Return A", spc(rA)], ["Return B", spc(rB)]],
        a, "%", 2,
        [`Poids de début : A = ${P(wA)}, B = ${P(wB)}, C = ${P(wC)}.`,
          `Contribution de A + B = ${F(wA)} × ${P(rA)} + ${F(wB)} × (${P(rB)}) = ${P(wA * rA + wB * rB)}.`,
          `Indice inchangé : ${F(wC)} × rC = −${P(wA * rA + wB * rB)}, donc rC = ${Pa(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 4 · Price return et total return ────────────────────────── */

const INDEX_RETURNS: CalcType = {
  key: "index-returns",
  topic: "equity",
  name: "Price return et total return d'un indice",
  tier: "essentiel",
  source: "LM 2 · Security Market Indexes",
  formulas: [
    "Price return = (V1 − V0) / V0",
    "Income return = revenus (dividendes) / V0",
    "Total return = (V1 − V0 + revenus) / V0 = price return + income return",
    "Plusieurs périodes : (1 + R1) × (1 + R2) × … − 1",
  ],
  traps: [
    "Les dividendes se rapportent à la valeur de début de période V0.",
    "Les rendements de sous-périodes se composent : ils ne s'additionnent pas.",
  ],
  questions: [
    (() => {
      const v0 = 1250, v1 = 1310;
      const a = periodReturn(v0, v1) * 100;
      return q("eq-idxr-f1", "facile", "Price return of the index?",
        [["Beginning value", E(v0)], ["Ending value", E(v1)]],
        a, "%", 2,
        ["Price return = (V1 − V0) / V0.", `= (${F(v1)} − ${F(v0)}) / ${F(v0)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 1000, v1 = 1040, inc = 15;
      const a = periodReturn(v0, v1, inc) * 100;
      return q("eq-idxr-f2", "facile", "Total return of the index?",
        [["Beginning value", E(v0)], ["Ending value", E(v1)], ["Dividends (index points)", E(inc)]],
        a, "%", 2,
        ["Total return = (V1 − V0 + dividendes) / V0.", `= (${F(v1)} − ${F(v0)} + ${F(inc)}) / ${F(v0)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 800, inc = 12;
      const a = (inc / v0) * 100;
      return q("eq-idxr-f3", "facile", "Income return of the index?",
        [["Beginning value", E(v0)], ["Dividends (index points)", E(inc)]],
        a, "%", 2,
        ["Income return = dividendes / V0.", `= ${F(inc)} / ${F(v0)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 500, r = 0.032;
      const a = v0 * (1 + r);
      return q("eq-idxr-f4", "facile", "Ending index value?",
        [["Beginning value", E(v0)], ["Price return", spc(r)]],
        a, "", 2,
        ["V1 = V0 × (1 + price return).", `V1 = ${F(v0)} × ${F(1 + r)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const rs = [0.02, -0.01];
      const a = compound(rs) * 100;
      return q("eq-idxr-f5", "facile", "Compound return over the two periods?",
        [["Period 1 return", spc(rs[0])], ["Period 2 return", spc(rs[1])]],
        a, "%", 2,
        ["Les rendements se composent : (1 + R1) × (1 + R2) − 1.", `= ${F(1 + rs[0])} × ${F(1 + rs[1])} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 2000, pr = 0.03, tr = 0.0425;
      const a = (tr - pr) * v0;
      return q("eq-idxr-m1", "moyen", "Dividends received over the period, in index points?",
        [["Beginning value", E(v0)], ["Price return", pc(pr)], ["Total return", pc(tr)]],
        a, "", 2,
        [`Income return = total return − price return = ${P(tr)} − ${P(pr)} = ${P(tr - pr)}.`,
          `Dividendes = ${P(tr - pr)} × ${F(v0)} = ${F(a, 2)} points.`]);
    })(),
    (() => {
      const v0 = 100, rs = [0.05, -0.03, 0.02];
      const a = v0 * (1 + compound(rs));
      return q("eq-idxr-m2", "moyen", "Index value after three periods?",
        [["Beginning value", E(v0)], ["Returns periods 1 / 2 / 3", lst(rs.map(spc))]],
        a, "", 2,
        [`Facteur cumulé = ${rs.map((r) => F(1 + r)).join(" × ")} = ${F(1 + compound(rs), 6)}.`,
          `Valeur = ${F(v0)} × ${F(1 + compound(rs), 6)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const v0 = 1500, tr = 0.07, inc = 30;
      const a = v0 * (1 + tr) - inc;
      return q("eq-idxr-m3", "moyen", "Ending value of the price index?",
        [["Beginning value", E(v0)], ["Total return", pc(tr)], ["Dividends (index points)", E(inc)]],
        a, "", 2,
        [`Total return : V1 − V0 + dividendes = ${P(tr)} × ${F(v0)} = ${F(tr * v0)}.`,
          `V1 = ${F(v0)} + ${F(tr * v0)} − ${F(inc)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const rs = [0.02, -0.015, 0.03, 0.01];
      const a = compound(rs) * 100;
      return q("eq-idxr-m4", "moyen", "Annual return from the four quarterly returns?",
        [["Quarterly returns Q1 / Q2 / Q3 / Q4", lst(rs.map(spc))]],
        a, "%", 2,
        [`Produit des facteurs = ${rs.map((r) => F(1 + r)).join(" × ")} = ${F(1 + compound(rs), 6)}.`,
          `Rendement annuel = ${F(1 + compound(rs), 6)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const p0 = [20, 30, 50], p1 = [22, 29, 53], dv = [0.5, 0.3, 1];
      const pr = sum(p1) / sum(p0) - 1;
      const a = ((sum(p1) - sum(p0) + sum(dv)) / sum(p0)) * 100;
      return q("eq-idxr-m5", "moyen", "Total return of the price-weighted index (divisor 3)?",
        [["Start prices A / B / C", lst(p0.map((p) => usd(p, 2)))], ["End prices A / B / C", lst(p1.map((p) => usd(p, 2)))],
          ["Dividends per share A / B / C", lst(dv.map((d) => usd(d, 2)))]],
        a, "%", 2,
        ["Le diviseur est commun aux deux dates : on peut raisonner sur les sommes de prix.",
          `Prix : ${F(sum(p0))} → ${F(sum(p1))}, soit un price return de ${P(pr, 2)} ; dividendes = ${F(sum(dv), 2)}.`,
          `Total return = (${F(sum(p1))} − ${F(sum(p0))} + ${F(sum(dv), 2)}) / ${F(sum(p0))} = ${Pa(a)}.`]);
    })(),
    (() => {
      const v1 = 1092, inc = 8, tr = 0.1;
      const a = (v1 + inc) / (1 + tr);
      return q("eq-idxr-d1", "difficile", "Beginning index value?",
        [["Ending value", E(v1)], ["Dividends (index points)", E(inc)], ["Total return", pc(tr)]],
        a, "", 2,
        [`(V1 − V0 + dividendes) / V0 = ${F(tr)}, donc V0 × ${F(1 + tr)} = V1 + dividendes.`,
          `V0 = (${F(v1)} + ${F(inc)}) / ${F(1 + tr)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const r1 = 0.04, r2 = -0.02, target = 0.1;
      const r3 = (1 + target) / ((1 + r1) * (1 + r2)) - 1;
      const a = r3 * 100;
      return q("eq-idxr-d2", "difficile", "Return needed in period 3 for the target cumulative return?",
        [["Period 1 return", spc(r1)], ["Period 2 return", spc(r2)], ["Target cumulative return (3 periods)", spc(target)]],
        a, "%", 2,
        [`Facteur déjà acquis = ${F(1 + r1)} × ${F(1 + r2)} = ${F((1 + r1) * (1 + r2), 4)}.`,
          `(1 + R3) = ${F(1 + target)} / ${F((1 + r1) * (1 + r2), 4)} = ${F(1 + r3, 6)}.`,
          `R3 = ${Pa(a)}.`]);
    })(),
    (() => {
      const y1 = { v0: 1000, v1: 1080, inc: 20 }, y2 = { v0: 1080, v1: 1050, inc: 22 };
      const r1 = periodReturn(y1.v0, y1.v1, y1.inc), r2 = periodReturn(y2.v0, y2.v1, y2.inc);
      const a = compound([r1, r2]) * 100;
      return q("eq-idxr-d3", "difficile", "Two-year total return of the index?",
        [["Year 1", `${E(y1.v0)} → ${E(y1.v1)}, dividends ${E(y1.inc)}`], ["Year 2", `${E(y2.v0)} → ${E(y2.v1)}, dividends ${E(y2.inc)}`]],
        a, "%", 2,
        [`Année 1 : (${F(y1.v1)} − ${F(y1.v0)} + ${F(y1.inc)}) / ${F(y1.v0)} = ${P(r1, 2)}.`,
          `Année 2 : (${F(y2.v1)} − ${F(y2.v0)} + ${F(y2.inc)}) / ${F(y2.v0)} = ${P(r2, 4)}.`,
          `Sur deux ans : ${F(1 + r1)} × ${F(1 + r2, 6)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const n = [1000, 2000], p0 = [40, 25], p1 = [42, 24], dv = [1, 0.5];
      const mv0 = sum(caps(p0, n)), mv1 = sum(caps(p1, n)), inc = sum(caps(dv, n));
      const a = ((mv1 - mv0 + inc) / mv0) * 100;
      return q("eq-idxr-d4", "difficile", "Total return of the market-cap-weighted index?",
        [["Stock A", `${E(n[0])} shares, ${usd(p0[0], 2)} → ${usd(p1[0], 2)}, dividend ${usd(dv[0], 2)}`],
          ["Stock B", `${E(n[1])} shares, ${usd(p0[1], 2)} → ${usd(p1[1], 2)}, dividend ${usd(dv[1], 2)}`]],
        a, "%", 2,
        [`Capitalisation début = ${D(mv0)} ; fin = ${D(mv1)} : price return = ${P(mv1 / mv0 - 1, 2)}.`,
          `Dividendes = ${F(n[0])} × ${F(dv[0])} + ${F(n[1])} × ${F(dv[1])} = ${D(inc)}.`,
          `Total return = (${F(mv1)} − ${F(mv0)} + ${F(inc)}) / ${F(mv0)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const t0 = 250, t1 = 310, years = 4;
      const a = cagr(t0, t1, years) * 100;
      return q("eq-idxr-d5", "difficile", "Annualized total return?",
        [["Total return index", `${E(t0)} → ${E(t1)}`], ["Price return index", `${E(1000)} → ${E(1150)}`], ["Years", E(years)]],
        a, "%", 2,
        ["Le total return se lit sur l'indice de rendement total ; l'indice de prix est la donnée-piège.",
          `Total return cumulé = ${F(t1)} / ${F(t0)} = ${F(t1 / t0)}.`,
          `Annualisé = ${F(t1 / t0)}^(1/${years}) − 1 = ${Pa(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 5 · ROE, valeur comptable et P/B ────────────────────────── */

const ROE_BOOK: CalcType = {
  key: "roe-book-value",
  topic: "equity",
  name: "ROE, valeur comptable et price-to-book",
  tier: "annexe",
  source: "LM 4 · Overview of Equity Securities",
  formulas: [
    "ROE = RN aux ordinaires / capitaux propres ordinaires moyens = RN / ((CP début + CP fin) / 2)",
    "Variante : ROE = RN / CP de début d'année",
    "RN aux ordinaires = RN − dividendes préférentiels",
    "BVPS = CP ordinaires / nombre d'actions ; P/B = prix / BVPS",
    "CP fin = CP début + RN − dividendes (hors émissions et rachats)",
  ],
  traps: [
    "Retire les actions de préférence des capitaux propres et leurs dividendes du résultat.",
    "Vérifie si l'énoncé veut le ROE sur CP moyens ou sur CP de début.",
  ],
  questions: [
    (() => {
      const ni = 450, bv0 = 3000;
      const a = (ni / bv0) * 100;
      return q("eq-roe-f1", "facile", "ROE on beginning equity?",
        [["Net income ($ millions)", E(ni)], ["Beginning equity ($ millions)", E(bv0)]],
        a, "%", 2,
        ["ROE = RN / CP de début.", `ROE = ${F(ni)} / ${F(bv0)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const eq = 24.6, n = 3;
      const a = eq / n;
      return q("eq-roe-f2", "facile", "Book value per share?",
        [["Common equity ($ millions)", E(eq)], ["Shares outstanding (millions)", E(n)]],
        a, "$", 2,
        ["BVPS = capitaux propres ordinaires / nombre d'actions.", `BVPS = ${F(eq)} / ${F(n)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const p = 16.8, n = 3.71;
      const a = p * n;
      return q("eq-roe-f3", "facile", "Market value of equity, in $ millions?",
        [["Share price", usd(p, 2)], ["Shares outstanding (millions)", E(n)]],
        a, "$", 2,
        ["Valeur de marché des capitaux propres = prix × nombre d'actions.", `= ${F(p, 2)} × ${F(n)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const p = 42, bvps = 12;
      const a = p / bvps;
      return q("eq-roe-f4", "facile", "Price-to-book ratio?",
        [["Share price", usd(p, 2)], ["Book value per share", usd(bvps, 2)]],
        a, "x", 2,
        ["P/B = prix / BVPS.", `P/B = ${F(p)} / ${F(bvps)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const ni = 1200, bv0 = 7600, bv1 = 8400;
      const a = roeAverage(ni, bv0, bv1) * 100;
      return q("eq-roe-f5", "facile", "ROE on average equity?",
        [["Net income ($ millions)", E(ni)], ["Equity, beginning / end ($ millions)", lst([E(bv0), E(bv1)])]],
        a, "%", 2,
        [`CP moyens = (${F(bv0)} + ${F(bv1)}) / 2 = ${F((bv0 + bv1) / 2)}.`, `ROE = ${F(ni)} / ${F((bv0 + bv1) / 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const ni = 900, pd = 100, bv0 = 4800, bv1 = 5200;
      const a = roeAverage(ni - pd, bv0, bv1) * 100;
      return q("eq-roe-m1", "moyen", "ROE on average common equity?",
        [["Net income ($ millions)", E(ni)], ["Preferred dividends ($ millions)", E(pd)], ["Common equity, beginning / end ($ millions)", lst([E(bv0), E(bv1)])]],
        a, "%", 2,
        [`RN aux ordinaires = ${F(ni)} − ${F(pd)} = ${F(ni - pd)}.`,
          `CP ordinaires moyens = (${F(bv0)} + ${F(bv1)}) / 2 = ${F((bv0 + bv1) / 2)}.`,
          `ROE = ${F(ni - pd)} / ${F((bv0 + bv1) / 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const p = 25, n = 40, eq = 400;
      const bvps = eq / n;
      const a = p / bvps;
      return q("eq-roe-m2", "moyen", "Price-to-book ratio?",
        [["Share price", usd(p, 2)], ["Shares outstanding (millions)", E(n)], ["Common equity ($ millions)", E(eq)]],
        a, "x", 2,
        [`BVPS = ${F(eq)} / ${F(n)} = ${D(bvps, 2)}.`, `P/B = ${F(p)} / ${F(bvps)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const bv0 = 2000, ni = 300, dv = 120;
      const bv1 = bv0 + ni - dv;
      const a = roeAverage(ni, bv0, bv1) * 100;
      return q("eq-roe-m3", "moyen", "ROE on average equity? (No share issues or buybacks.)",
        [["Beginning equity ($ millions)", E(bv0)], ["Net income ($ millions)", E(ni)], ["Dividends paid ($ millions)", E(dv)]],
        a, "%", 2,
        [`CP fin = ${F(bv0)} + ${F(ni)} − ${F(dv)} = ${F(bv1)}.`,
          `CP moyens = (${F(bv0)} + ${F(bv1)}) / 2 = ${F((bv0 + bv1) / 2)}.`,
          `ROE = ${F(ni)} / ${F((bv0 + bv1) / 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const roe = 0.12, bv0 = 5000, bv1 = 5600;
      const a = roe * ((bv0 + bv1) / 2);
      return q("eq-roe-m4", "moyen", "Net income, in $ millions?",
        [["ROE (on average equity)", pc(roe)], ["Equity, beginning / end ($ millions)", lst([E(bv0), E(bv1)])]],
        a, "$", 0,
        [`CP moyens = (${F(bv0)} + ${F(bv1)}) / 2 = ${F((bv0 + bv1) / 2)}.`, `RN = ${P(roe)} × ${F((bv0 + bv1) / 2)} = ${M(a, 0)}.`]);
    })(),
    (() => {
      const pb = 2.2, eq = 880, n = 40;
      const bvps = eq / n;
      const a = pb * bvps;
      return q("eq-roe-m5", "moyen", "Share price implied by the P/B ratio?",
        [["P/B ratio", mx(pb)], ["Common equity ($ millions)", E(eq)], ["Shares outstanding (millions)", E(n)]],
        a, "$", 2,
        [`BVPS = ${F(eq)} / ${F(n)} = ${D(bvps, 2)}.`, `Prix = P/B × BVPS = ${F(pb)} × ${F(bvps)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const te0 = 6100, te1 = 6500, pref = 500, ni = 950, pd = 40;
      const c0 = te0 - pref, c1 = te1 - pref;
      const a = roeAverage(ni - pd, c0, c1) * 100;
      return q("eq-roe-d1", "difficile", "ROE on average common equity?",
        [["Total equity, beginning / end ($ millions)", lst([E(te0), E(te1)])], ["Preferred stock included in equity ($ millions)", E(pref)],
          ["Net income ($ millions)", E(ni)], ["Preferred dividends ($ millions)", E(pd)]],
        a, "%", 2,
        [`CP ordinaires = total − préférentielles : ${F(c0)} au début, ${F(c1)} à la fin.`,
          `RN aux ordinaires = ${F(ni)} − ${F(pd)} = ${F(ni - pd)}.`,
          `CP ordinaires moyens = ${F((c0 + c1) / 2)}.`,
          `ROE = ${F(ni - pd)} / ${F((c0 + c1) / 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const bv0 = 1000, ni = 150, buyback = 200;
      const bv1 = bv0 + ni - buyback;
      const a = roeAverage(ni, bv0, bv1) * 100;
      return q("eq-roe-d2", "difficile", "ROE on average equity?",
        [["Beginning equity ($ millions)", E(bv0)], ["Net income ($ millions)", E(ni)], ["Dividends", "none"],
          ["Share buyback at year-end ($ millions)", E(buyback)]],
        a, "%", 2,
        [`Le rachat d'actions réduit les capitaux propres : CP fin = ${F(bv0)} + ${F(ni)} − ${F(buyback)} = ${F(bv1)}.`,
          `CP moyens = (${F(bv0)} + ${F(bv1)}) / 2 = ${F((bv0 + bv1) / 2)}.`,
          `ROE = ${F(ni)} / ${F((bv0 + bv1) / 2)} = ${Pa(a)} : le rachat gonfle le ROE sans améliorer l'activité.`]);
    })(),
    (() => {
      const assets = 5000, liab = 3200, pref = 300, n = 100, p = 36;
      const ce = assets - liab - pref, bvps = ce / n;
      const a = p / bvps;
      return q("eq-roe-d3", "difficile", "Price-to-book ratio of the common stock?",
        [["Total assets ($ millions)", E(assets)], ["Total liabilities ($ millions)", E(liab)], ["Preferred stock ($ millions)", E(pref)],
          ["Common shares (millions)", E(n)], ["Share price", usd(p, 2)]],
        a, "x", 2,
        [`CP ordinaires = ${F(assets)} − ${F(liab)} − ${F(pref)} = ${F(ce)} M$.`,
          `BVPS = ${F(ce)} / ${F(n)} = ${D(bvps, 2)}.`,
          `P/B = ${F(p)} / ${F(bvps)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const bv0 = 900, ni = 120, dv = 40, n = 50, pb = 1.8;
      const bv1 = bv0 + ni - dv, bvps = bv1 / n;
      const a = pb * bvps;
      return q("eq-roe-d4", "difficile", "Year-end share price consistent with the target P/B?",
        [["Beginning equity ($ millions)", E(bv0)], ["Net income ($ millions)", E(ni)], ["Dividends ($ millions)", E(dv)],
          ["Shares outstanding (millions)", E(n)], ["Target P/B (on year-end book value)", mx(pb)]],
        a, "$", 2,
        [`CP fin = ${F(bv0)} + ${F(ni)} − ${F(dv)} = ${F(bv1)} M$.`,
          `BVPS fin = ${F(bv1)} / ${F(n)} = ${D(bvps, 2)}.`,
          `Prix = ${F(pb)} × ${F(bvps, 2)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const bv0 = 5000, roe = 0.18, payout = 0.4;
      const b = 1 - payout;
      const a = (roe * bv0) / (1 - 0.5 * roe * b);
      return q("eq-roe-d5", "difficile", "Net income needed for the target ROE on average equity, in $ millions?",
        [["Beginning equity ($ millions)", E(bv0)], ["Target ROE (average equity)", pc(roe)], ["Payout ratio", pc(payout)], ["Share issues or buybacks", "none"]],
        a, "$", 2,
        [`CP fin = ${F(bv0)} + ${F(b)} × RN (on garde ${P(b)} du résultat) ; CP moyens = ${F(bv0)} + ${F(b / 2)} × RN.`,
          `RN = ${F(roe)} × (${F(bv0)} + ${F(b / 2)} × RN), soit RN × (1 − ${F(roe * b / 2, 4)}) = ${F(roe * bv0)}.`,
          `RN = ${F(roe * bv0)} / ${F(1 - (roe * b) / 2, 4)} = ${M(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 6 · Levier opérationnel et financier ────────────────────────── */

const OPERATING_LEVERAGE: CalcType = {
  key: "operating-leverage",
  topic: "equity",
  name: "Levier opérationnel et financier (DOL, DFL)",
  tier: "annexe",
  source: "LM 5 · Company Analysis: Past and Present",
  formulas: [
    "Résultat opérationnel = Q × (P − CV) − CF ; marge sur coût variable (contribution margin) = P − CV",
    "DOL = %Δ résultat opérationnel / %Δ ventes = Q(P − CV) / [Q(P − CV) − CF]",
    "DFL = %Δ résultat net / %Δ résultat opérationnel = EBIT / (EBIT − intérêts)",
    "DTL = DOL × DFL",
    "Marge brute = CA − COGS ; EBITDA = marge brute − charges opérationnelles ; EBIT = EBITDA − D&A",
  ],
  traps: [
    "Les intérêts n'entrent pas dans le DOL, seulement dans le DFL.",
    "Le DOL dépend du niveau de ventes : recalcule-le si Q change.",
  ],
  questions: [
    (() => {
      const qty = 10000, p = 5, vc = 3, fc = 8000;
      const a = operatingProfit(qty, p, vc, fc);
      return q("eq-lev-f1", "facile", "Operating profit?",
        [["Units sold", E(qty)], ["Price per unit", usd(p, 2)], ["Variable cost per unit", usd(vc, 2)], ["Fixed costs", usd(fc)]],
        a, "$", 0,
        ["Résultat opérationnel = Q × (P − CV) − CF.", `= ${F(qty)} × (${F(p)} − ${F(vc)}) − ${F(fc)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const dOp = 0.15, dS = 0.06;
      const a = dOp / dS;
      return q("eq-lev-f2", "facile", "Degree of operating leverage (DOL)?",
        [["% change in operating profit", spc(dOp)], ["% change in sales", spc(dS)]],
        a, "x", 2,
        ["DOL = %Δ résultat opérationnel / %Δ ventes.", `DOL = ${P(dOp)} / ${P(dS)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const ebit = 12000, int = 2000;
      const a = dfl(ebit, int);
      return q("eq-lev-f3", "facile", "Degree of financial leverage (DFL)?",
        [["EBIT", usd(ebit)], ["Interest expense", usd(int)]],
        a, "x", 2,
        ["DFL = EBIT / (EBIT − intérêts).", `DFL = ${F(ebit)} / (${F(ebit)} − ${F(int)}) = ${F(a, 2)}.`]);
    })(),
    (() => {
      const p = 25, vc = 16;
      const a = ((p - vc) / p) * 100;
      return q("eq-lev-f4", "facile", "Contribution margin ratio?",
        [["Price per unit", usd(p, 2)], ["Variable cost per unit", usd(vc, 2)]],
        a, "%", 2,
        [`Contribution margin par unité = ${F(p)} − ${F(vc)} = ${D(p - vc)}.`, `Ratio = ${F(p - vc)} / ${F(p)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const rev = 800, ebit = 96;
      const a = (ebit / rev) * 100;
      return q("eq-lev-f5", "facile", "EBIT margin?",
        [["Revenue ($ millions)", E(rev)], ["EBIT ($ millions)", E(ebit)]],
        a, "%", 2,
        ["Marge d'EBIT (operating margin) = EBIT / CA.", `= ${F(ebit)} / ${F(rev)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const qty = 10000, p = 5, vc = 3, fc = 8000;
      const cm = qty * (p - vc);
      const a = dol(qty, p, vc, fc);
      return q("eq-lev-m1", "moyen", "Degree of operating leverage (DOL)?",
        [["Units sold", E(qty)], ["Price per unit", usd(p, 2)], ["Variable cost per unit", usd(vc, 2)], ["Fixed costs", usd(fc)]],
        a, "x", 2,
        [`Contribution totale = ${F(qty)} × (${F(p)} − ${F(vc)}) = ${D(cm)}.`,
          `Résultat opérationnel = ${F(cm)} − ${F(fc)} = ${D(cm - fc)}.`,
          `DOL = ${F(cm)} / ${F(cm - fc)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const fc = 120000, p = 50, vc = 30;
      const a = fc / (p - vc);
      return q("eq-lev-m2", "moyen", "Breakeven quantity (operating profit = 0), in units?",
        [["Fixed costs", usd(fc)], ["Price per unit", usd(p, 2)], ["Variable cost per unit", usd(vc, 2)]],
        a, "", 0,
        ["Résultat nul quand Q × (P − CV) = CF.", `Q = ${F(fc)} / (${F(p)} − ${F(vc)}) = ${F(a, 0)} unités.`]);
    })(),
    (() => {
      const rev = 1000, cogs = 600, opex = 150, da = 50;
      const gp = rev - cogs, ebitda = gp - opex, ebit = ebitda - da;
      const a = (ebit / rev) * 100;
      return q("eq-lev-m3", "moyen", "EBIT margin?",
        [["Revenue", usd(rev)], ["Cost of sales", usd(cogs)], ["Operating expenses (excl. D&A)", usd(opex)], ["Depreciation & amortization", usd(da)]],
        a, "%", 2,
        [`Marge brute = ${F(rev)} − ${F(cogs)} = ${F(gp)} ; EBITDA = ${F(gp)} − ${F(opex)} = ${F(ebitda)}.`,
          `EBIT = ${F(ebitda)} − ${F(da)} = ${F(ebit)}.`,
          `Marge d'EBIT = ${F(ebit)} / ${F(rev)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const dl = 2.4, dS = 0.05;
      const a = dl * dS * 100;
      return q("eq-lev-m4", "moyen", "Expected % change in operating profit?",
        [["DOL", E(dl)], ["% change in sales", spc(dS)]],
        a, "%", 2,
        ["%Δ résultat opérationnel = DOL × %Δ ventes.", `= ${F(dl)} × ${P(dS)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const dl = 1.8, df = 1.5, dS = 0.1;
      const a = dl * df * dS * 100;
      return q("eq-lev-m5", "moyen", "Expected % change in net income?",
        [["DOL", E(dl)], ["DFL", E(df)], ["% change in sales", spc(dS)]],
        a, "%", 2,
        [`Levier total DTL = DOL × DFL = ${F(dl)} × ${F(df)} = ${F(dl * df)}.`, `%Δ RN = ${F(dl * df)} × ${P(dS)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const qty = 20000, p = 12, vc = 7, fc = 60000, int = 10000, dS = 0.1;
      const op0 = operatingProfit(qty, p, vc, fc), op1 = operatingProfit(qty * (1 + dS), p, vc, fc);
      const a = (op1 / op0 - 1) * 100;
      return q("eq-lev-d1", "difficile", "% change in operating profit if units sold rise 10%?",
        [["Units sold", E(qty)], ["Price per unit", usd(p, 2)], ["Variable cost per unit", usd(vc, 2)], ["Fixed costs", usd(fc)], ["Interest expense", usd(int)]],
        a, "%", 2,
        ["Les intérêts ne jouent pas sur le résultat opérationnel : donnée-piège.",
          `Avant : ${F(qty)} × ${F(p - vc)} − ${F(fc)} = ${D(op0)}.`,
          `Après : ${F(qty * (1 + dS))} × ${F(p - vc)} − ${F(fc)} = ${D(op1)}.`,
          `Variation = ${F(op1)} / ${F(op0)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const qty = 10000, p = 5, vc = 3, fc = 8000, int = 2000, dS = 0.08;
      const dl = dol(qty, p, vc, fc), ebit = operatingProfit(qty, p, vc, fc), df = dfl(ebit, int);
      const a = dl * df * dS * 100;
      return q("eq-lev-d2", "difficile", "Expected % change in net income? (Ignore taxes.)",
        [["Units sold", E(qty)], ["Price per unit", usd(p, 2)], ["Variable cost per unit", usd(vc, 2)], ["Fixed costs", usd(fc)],
          ["Interest expense", usd(int)], ["% change in sales", spc(dS)]],
        a, "%", 2,
        [`DOL = ${F(qty * (p - vc))} / ${F(ebit)} = ${F(dl, 4)}.`,
          `DFL = ${F(ebit)} / (${F(ebit)} − ${F(int)}) = ${F(df, 2)}.`,
          `DTL = ${F(dl, 4)} × ${F(df, 2)} = ${F(dl * df, 2)}.`,
          `%Δ RN = ${F(dl * df, 2)} × ${P(dS)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const qty = 5000, p = 40, vc = 24, fc = 50000, target = 0.2;
      const dl = dol(qty, p, vc, fc);
      const a = (target / dl) * 100;
      return q("eq-lev-d3", "difficile", "% sales increase needed to raise operating profit by 20%?",
        [["Units sold", E(qty)], ["Price per unit", usd(p, 2)], ["Variable cost per unit", usd(vc, 2)], ["Fixed costs", usd(fc)]],
        a, "%", 2,
        [`Contribution = ${F(qty)} × ${F(p - vc)} = ${D(qty * (p - vc))} ; EBIT = ${D(qty * (p - vc) - fc)}.`,
          `DOL = ${F(qty * (p - vc))} / ${F(qty * (p - vc) - fc)} = ${F(dl, 4)}.`,
          `%Δ ventes = ${P(target)} / ${F(dl, 4)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const dl = 3, qty = 8000, p = 15, vc = 9;
      const cm = qty * (p - vc), ebit = cm / dl;
      const a = cm - ebit;
      return q("eq-lev-d4", "difficile", "Fixed costs consistent with the DOL?",
        [["DOL", E(dl)], ["Units sold", E(qty)], ["Price per unit", usd(p, 2)], ["Variable cost per unit", usd(vc, 2)]],
        a, "$", 0,
        [`Contribution = ${F(qty)} × ${F(p - vc)} = ${D(cm)}.`,
          `DOL = contribution / EBIT, donc EBIT = ${F(cm)} / ${F(dl)} = ${D(ebit)}.`,
          `CF = ${F(cm)} − ${F(ebit)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const ebit = 51000, int0 = 5000, newDebt = 200000, rate = 0.06;
      const int1 = int0 + newDebt * rate;
      const a = dfl(ebit, int1);
      return q("eq-lev-d5", "difficile", "DFL after the new borrowing?",
        [["EBIT", usd(ebit)], ["Current interest expense", usd(int0)], ["New debt issued", usd(newDebt)], ["Interest rate on new debt", pc(rate)]],
        a, "x", 2,
        [`Intérêts nouveaux = ${F(newDebt)} × ${P(rate)} = ${D(newDebt * rate)} ; total = ${D(int1)}.`,
          `DFL = ${F(ebit)} / (${F(ebit)} − ${F(int1)}) = ${F(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 7 · Part de marché et HHI ────────────────────────── */

const MARKET_SHARE: CalcType = {
  key: "market-share-hhi",
  topic: "equity",
  name: "Taille de marché, part de marché et HHI",
  tier: "annexe",
  source: "LM 6 · Industry and Competitive Analysis",
  formulas: [
    "Part de marché = CA de l'entreprise / taille du marché (CA total)",
    "HHI (Herfindahl-Hirschman) = Σ (parts de marché en %)²",
    "HHI < 1 500 : concentration faible ; 1 500 à 2 500 : modérée ; > 2 500 : forte",
    "Croissance annuelle composée = (valeur finale / valeur initiale)^(1/n) − 1",
  ],
  traps: [
    "Le HHI s'écrit avec les parts en points de % (35, pas 0,35).",
    "Une fusion de deux firmes de parts a et b augmente le HHI de 2 × a × b.",
  ],
  questions: [
    (() => {
      const rev = 500, size = 5000;
      const a = (rev / size) * 100;
      return q("eq-mkt-f1", "facile", "Company's market share?",
        [["Company revenue ($ millions)", E(rev)], ["Market size ($ millions)", E(size)]],
        a, "%", 2,
        ["Part de marché = CA de l'entreprise / taille du marché.", `= ${F(rev)} / ${F(size)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const rev = 500, share = 0.1;
      const a = rev / share;
      return q("eq-mkt-f2", "facile", "Market size, in $ millions?",
        [["Company revenue ($ millions)", E(rev)], ["Market share", pc(share)]],
        a, "$", 0,
        ["Taille du marché = CA de l'entreprise / part de marché.", `= ${F(rev)} / ${F(share)} = ${M(a, 0)}.`]);
    })(),
    (() => {
      const s = [35, 25, 20, 10, 10];
      const a = hhi(s);
      return q("eq-mkt-f3", "facile", "Herfindahl-Hirschman Index (HHI)?",
        [["Market shares of the five firms", lst(s.map((x) => `${x}%`))]],
        a, "", 0,
        ["HHI = somme des carrés des parts (en points de %).", `= ${s.map((x) => `${x}²`).join(" + ")} = ${F(a, 0)}.`]);
    })(),
    (() => {
      const n = 4;
      const s = Array.from({ length: n }, () => 100 / n);
      const a = hhi(s);
      return q("eq-mkt-f4", "facile", "HHI of an industry with four equal-sized firms?",
        [["Number of firms", E(n)], ["Market shares", "equal"]],
        a, "", 0,
        [`Chaque firme a ${F(100 / n)}% du marché.`, `HHI = ${n} × ${F(100 / n)}² = ${F(a, 0)}.`]);
    })(),
    (() => {
      const v0 = 40, v1 = 43.2;
      const a = (v1 / v0 - 1) * 100;
      return q("eq-mkt-f5", "facile", "Industry growth rate over the year?",
        [["Industry sales last year ($ billions)", E(v0)], ["Industry sales this year ($ billions)", E(v1)]],
        a, "%", 2,
        ["Croissance = ventes finales / ventes initiales − 1.", `= ${F(v1)} / ${F(v0)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const rev = [300, 200, 100, 100, 50, 50];
      const tot = sum(rev);
      const s = rev.map((r) => (r / tot) * 100);
      const a = hhi(s);
      return q("eq-mkt-m1", "moyen", "HHI of the industry?",
        [["Revenues of all six firms ($ millions)", lst(rev.map((r) => E(r)))]],
        a, "", 0,
        [`Taille du marché = ${F(tot)} ; parts = ${s.map((x) => `${F(x)}%`).join(" ; ")}.`,
          `HHI = ${s.map((x) => `${F(x)}²`).join(" + ")}.`,
          `HHI = ${F(a, 0)} : concentration modérée.`]);
    })(),
    (() => {
      const v0 = 120, v1 = 150, n = 4;
      const a = cagr(v0, v1, n) * 100;
      return q("eq-mkt-m2", "moyen", "Compound annual growth rate of the industry?",
        [["Industry sales 4 years ago ($ billions)", E(v0)], ["Industry sales today ($ billions)", E(v1)]],
        a, "%", 2,
        [`Croissance cumulée = ${F(v1)} / ${F(v0)} = ${F(v1 / v0)}.`, `Croissance annuelle = ${F(v1 / v0)}^(1/${n}) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const r0 = 90, m0 = 900, r1 = 120, m1 = 1000;
      const s0 = r0 / m0, s1 = r1 / m1;
      const a = (s1 - s0) * 10000;
      return q("eq-mkt-m3", "moyen", "Change in market share, in basis points?",
        [["Company revenue, last year / this year", lst([usd(r0) + "M", usd(r1) + "M"])], ["Market size, last year / this year", lst([usd(m0) + "M", usd(m1) + "M"])]],
        a, "bp", 0,
        [`Part l'an dernier = ${F(r0)} / ${F(m0)} = ${P(s0)} ; cette année = ${F(r1)} / ${F(m1)} = ${P(s1)}.`,
          `Variation = ${P(s1)} − ${P(s0)} = ${F(a / 100)} point${Math.abs(Math.round(a)) >= 200 ? "s" : ""} de pourcentage, soit ${F(a, 0)} bp.`]);
    })(),
    (() => {
      const s = [30, 20, 20, 15, 15];
      const after = [30, 20, 20, 30];
      const a = hhi(after);
      return q("eq-mkt-m4", "moyen", "HHI after the two 15% firms merge?",
        [["Market shares before the merger", lst(s.map((x) => `${x}%`))]],
        a, "", 0,
        [`Après fusion, les deux firmes de 15% n'en font qu'une de 30% : parts = ${after.map((x) => `${x}%`).join(", ")}.`,
          `HHI = ${after.map((x) => `${x}²`).join(" + ")} = ${F(a, 0)}.`]);
    })(),
    (() => {
      const m0 = 2000, g = 0.05, share = 0.12;
      const m1 = m0 * (1 + g);
      const a = m1 * share;
      return q("eq-mkt-m5", "moyen", "Forecast company revenue next year, in $ millions?",
        [["Market size this year ($ millions)", E(m0)], ["Expected market growth", pc(g)], ["Expected market share", pc(share)]],
        a, "$", 0,
        [`Marché l'an prochain = ${F(m0)} × ${F(1 + g)} = ${F(m1)}.`, `CA prévu = ${F(m1)} × ${P(share)} = ${M(a, 0)}.`]);
    })(),
    (() => {
      const s = [25, 25, 20, 15, 15];
      const a = 2 * 20 * 15;
      const before = hhi(s), after = hhi([25, 25, 35, 15]);
      return q("eq-mkt-d1", "difficile", "Increase in HHI if the 20% firm acquires one of the 15% firms?",
        [["Market shares", lst(s.map((x) => `${x}%`))]],
        a, "", 0,
        [`Avant : HHI = ${F(before, 0)} ; après (35% au lieu de 20% + 15%) : HHI = ${F(after, 0)}.`,
          `Hausse = ${F(after, 0)} − ${F(before, 0)} = ${F(after - before, 0)}.`,
          `Raccourci : 2 × 20 × 15 = ${F(a, 0)} ; les autres parts ne changent rien.`]);
    })(),
    (() => {
      const m0 = 10000, g = 0.06, years = 2, target = 1500;
      const m2 = m0 * Math.pow(1 + g, years);
      const a = (target / m2) * 100;
      return q("eq-mkt-d2", "difficile", "Market share needed in two years to reach the revenue target?",
        [["Market size today ($ millions)", E(m0)], ["Market growth per year", pc(g)], ["Revenue target in two years ($ millions)", E(target)]],
        a, "%", 2,
        [`Marché dans deux ans = ${F(m0)} × ${pw(g, 2)} = ${F(m2, 2)}.`, `Part requise = ${F(target)} / ${F(m2, 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const top = [40, 30, 20], fringe = 10;
      const s = [...top, ...Array.from({ length: fringe }, () => 1)];
      const a = hhi(s);
      return q("eq-mkt-d3", "difficile", "HHI of the industry?",
        [["Three largest firms", lst(top.map((x) => `${x}%`))], ["Remaining market", `${fringe} firms with 1% each`]],
        a, "", 0,
        [`Grandes firmes : ${top.map((x) => `${x}²`).join(" + ")} = ${F(hhi(top), 0)}.`,
          `Petites firmes : ${fringe} × 1² = ${fringe}.`,
          `HHI = ${F(hhi(top), 0)} + ${fringe} = ${F(a, 0)} : forte concentration.`]);
    })(),
    (() => {
      const s0 = 0.1, gF = 0.12, gM = 0.04, n = 3;
      const s3 = s0 * Math.pow((1 + gF) / (1 + gM), n);
      const a = s3 * 100;
      return q("eq-mkt-d4", "difficile", "Market share in three years?",
        [["Current market share", pc(s0)], ["Company revenue growth per year", pc(gF)], ["Market growth per year", pc(gM)]],
        a, "%", 2,
        [`Chaque année, la part est multipliée par ${F(1 + gF)} / ${F(1 + gM)} = ${F((1 + gF) / (1 + gM), 6)}.`,
          `Part dans 3 ans = ${P(s0)} × ${F((1 + gF) / (1 + gM), 6)}³ = ${Pa(a)}.`]);
    })(),
    (() => {
      const limit = 1500;
      const a = Math.floor(10000 / limit) + 1;
      const h = hhi(Array.from({ length: a }, () => 100 / a));
      return q("eq-mkt-d5", "difficile", "Minimum number of equal-sized firms for the HHI to be below 1,500?",
        [["Target", "HHI below 1,500 (low concentration)"], ["Market shares", "equal"]],
        a, "", 0,
        [`Avec n firmes égales, chaque part vaut 100/n et HHI = n × (100/n)² = 10 000 / n.`,
          `10 000 / n < ${F(limit)} ⇔ n > ${F(10000 / limit, 2)}.`,
          `Il faut au moins ${F(a, 0)} firmes (HHI = ${F(h, 0)} ; avec ${a - 1} firmes, HHI = ${F(10000 / (a - 1), 0)}).`]);
    })(),
  ],
};

/* ────────────────────────── 8 · Prévisions ────────────────────────── */

const FORECASTING: CalcType = {
  key: "forecasting",
  topic: "equity",
  name: "Prévisions : CA, marge brute et BFR",
  tier: "annexe",
  source: "LM 7 · Company Analysis: Forecasting",
  formulas: [
    "CA prévu = taille du marché × part de marché, ou prix × volume, ou CA × (1 + g)",
    "COGS prévu = (1 − marge brute) × CA prévu",
    "Créances = DSO × CA / 365 ; stocks = DOH × COGS / 365 ; fournisseurs = DPO × COGS / 365",
    "Cycle de conversion de trésorerie = DSO + DOH − DPO",
  ],
  traps: [
    "Les stocks et les fournisseurs se rapportent au COGS, les créances au CA.",
    "Si le prix de vente et le coût unitaire bougent différemment, la marge brute change même à volume constant.",
  ],
  questions: [
    (() => {
      const rev = 500, gm = 0.4;
      const a = (1 - gm) * rev;
      return q("eq-fcst-f1", "facile", "Forecast cost of sales (COGS), in $ millions?",
        [["Forecast revenue ($ millions)", E(rev)], ["Gross margin", pc(gm)]],
        a, "$", 0,
        ["COGS = (1 − marge brute) × CA.", `= ${F(1 - gm)} × ${F(rev)} = ${M(a, 0)}.`]);
    })(),
    (() => {
      const dso = 45, rev = 730;
      const a = (dso * rev) / 365;
      return q("eq-fcst-f2", "facile", "Forecast accounts receivable, in $ millions?",
        [["Days sales outstanding (DSO)", E(dso)], ["Forecast revenue ($ millions)", E(rev)]],
        a, "$", 0,
        ["Créances = DSO × CA / 365.", `= ${F(dso)} × ${F(rev)} / 365 = ${M(a, 0)}.`]);
    })(),
    (() => {
      const doh = 73, cogs = 1000;
      const a = (doh * cogs) / 365;
      return q("eq-fcst-f3", "facile", "Forecast inventory, in $ millions?",
        [["Days of inventory on hand (DOH)", E(doh)], ["Forecast COGS ($ millions)", E(cogs)]],
        a, "$", 0,
        ["Stocks = DOH × COGS / 365.", `= ${F(doh)} × ${F(cogs)} / 365 = ${M(a, 0)}.`]);
    })(),
    (() => {
      const rev = 1200, g = 0.08;
      const a = rev * (1 + g);
      return q("eq-fcst-f4", "facile", "Forecast revenue next year, in $ millions?",
        [["Revenue this year ($ millions)", E(rev)], ["Expected revenue growth", pc(g)]],
        a, "$", 0,
        ["CA prévu = CA actuel × (1 + g).", `= ${F(rev)} × ${F(1 + g)} = ${M(a, 0)}.`]);
    })(),
    (() => {
      const rev = 900, cogs = 585;
      const a = ((rev - cogs) / rev) * 100;
      return q("eq-fcst-f5", "facile", "Gross margin?",
        [["Revenue ($ millions)", E(rev)], ["Cost of sales ($ millions)", E(cogs)]],
        a, "%", 2,
        [`Marge brute = ${F(rev)} − ${F(cogs)} = ${F(rev - cogs)}.`, `Taux de marge brute = ${F(rev - cogs)} / ${F(rev)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const cogsPct = 0.25, costUp = 1, priceUp = 0.25;
      const rev1 = 1 + priceUp, cogs1 = cogsPct * (1 + costUp);
      const a = (1 - cogs1 / rev1) * 100;
      return q("eq-fcst-m1", "moyen", "Gross margin in period 2? (Units sold unchanged.)",
        [["COGS / sales in period 1", pc(cogsPct)], ["Change in input costs", spc(costUp)], ["Change in selling price", spc(priceUp)]],
        a, "%", 2,
        [`Base 100 de CA : COGS = ${F(cogsPct * 100)} en période 1.`,
          `Période 2 : CA = ${F(rev1 * 100)}, COGS = ${F(cogs1 * 100)} (même montant ajouté en haut et en bas).`,
          `Marge brute = 1 − ${F(cogs1 * 100)} / ${F(rev1 * 100)} = ${Pa(a)} (contre ${P(1 - cogsPct)} avant).`]);
    })(),
    (() => {
      const p0 = 10, dp = 0.12, q0 = 4.5, dq = -0.1;
      const p1 = p0 * (1 + dp), q1 = q0 * (1 + dq);
      const a = p1 * q1;
      return q("eq-fcst-m2", "moyen", "Forecast revenue, in $ millions?",
        [["Current average selling price", usd(p0, 2)], ["Expected price change", spc(dp)], ["Current units sold (millions)", E(q0)], ["Expected volume change", spc(dq)]],
        a, "$", 2,
        [`Prix prévu = ${F(p0)} × ${F(1 + dp)} = ${D(p1, 2)} ; volume = ${F(q0)} × ${F(1 + dq)} = ${F(q1)} millions.`,
          `CA prévu = ${F(q1)} × ${F(p1, 2)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const rev = 3650, cogs = 2190, dso = 40, doh = 50, dpo = 30;
      const ar = (dso * rev) / 365, inv = (doh * cogs) / 365, ap = (dpo * cogs) / 365;
      const a = ar + inv - ap;
      return q("eq-fcst-m3", "moyen", "Forecast working capital (receivables + inventory − payables), in $ millions?",
        [["Forecast revenue / COGS ($ millions)", lst([E(rev), E(cogs)])], ["DSO / DOH / DPO (days)", lst([E(dso), E(doh), E(dpo)])]],
        a, "$", 0,
        [`Créances = ${F(dso)} × ${F(rev)} / 365 = ${F(ar)} ; stocks = ${F(doh)} × ${F(cogs)} / 365 = ${F(inv)}.`,
          `Fournisseurs = ${F(dpo)} × ${F(cogs)} / 365 = ${F(ap)}.`,
          `BFR = ${F(ar)} + ${F(inv)} − ${F(ap)} = ${M(a, 0)}.`]);
    })(),
    (() => {
      const dpo = 36.5, cogs0 = 1000, g = 0.1;
      const cogs1 = cogs0 * (1 + g);
      const a = (dpo * cogs1) / 365;
      return q("eq-fcst-m4", "moyen", "Forecast accounts payable, in $ millions?",
        [["Days payables outstanding (DPO)", E(dpo)], ["COGS this year ($ millions)", E(cogs0)], ["Expected COGS growth", pc(g)]],
        a, "$", 0,
        [`COGS prévu = ${F(cogs0)} × ${F(1 + g)} = ${F(cogs1)}.`, `Fournisseurs = ${F(dpo)} × ${F(cogs1)} / 365 = ${M(a, 0)}.`]);
    })(),
    (() => {
      const m = 5000, share = 0.08, gm = 0.35;
      const rev = m * share;
      const a = rev * gm;
      return q("eq-fcst-m5", "moyen", "Forecast gross profit, in $ millions?",
        [["Forecast market size ($ millions)", E(m)], ["Expected market share", pc(share)], ["Expected gross margin", pc(gm)]],
        a, "$", 0,
        [`CA prévu = ${F(m)} × ${P(share)} = ${F(rev)}.`, `Marge brute = ${F(rev)} × ${P(gm)} = ${M(a, 0)}.`]);
    })(),
    (() => {
      const p0 = 10, dp = 0.12, q0 = 4.5, dq = -0.1, cogsPct = 0.4, dc = 0.15;
      const unitCost0 = (q0 * p0 * cogsPct) / q0;
      const p1 = p0 * (1 + dp), c1 = unitCost0 * (1 + dc), q1 = q0 * (1 + dq);
      const a = (1 - c1 / p1) * 100;
      return q("eq-fcst-d1", "difficile", "Forecast gross margin?",
        [["Current price / units sold", `${usd(p0, 2)} / 4.5 million`], ["Current COGS / revenue", pc(cogsPct)],
          ["Expected price change", spc(dp)], ["Expected volume change", spc(dq)], ["Expected change in input cost per unit", spc(dc)]],
        a, "%", 2,
        [`Coût unitaire actuel = ${P(cogsPct)} × ${D(p0)} = ${D(unitCost0, 2)} ; prévu = ${F(unitCost0)} × ${F(1 + dc)} = ${D(c1, 2)}.`,
          `Prix prévu = ${F(p0)} × ${F(1 + dp)} = ${D(p1, 2)}.`,
          `Le volume (${F(q1)} millions) ne change pas le taux de marge : marge brute = 1 − ${F(c1, 2)} / ${F(p1, 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const cogs0 = 2000, g = 0.1, doh0 = 60, doh1 = 55;
      const inv0 = (doh0 * cogs0) / 365, cogs1 = cogs0 * (1 + g), inv1 = (doh1 * cogs1) / 365;
      const a = inv1 - inv0;
      return q("eq-fcst-d2", "difficile", "Forecast change in inventory, in $ millions?",
        [["COGS this year ($ millions)", E(cogs0)], ["Expected COGS growth", pc(g)], ["DOH this year / next year", lst([E(doh0), E(doh1)])]],
        a, "$", 2,
        [`Stocks actuels = ${F(doh0)} × ${F(cogs0)} / 365 = ${F(inv0, 2)}.`,
          `COGS prévu = ${F(cogs1)} ; stocks prévus = ${F(doh1)} × ${F(cogs1)} / 365 = ${F(inv1, 2)}.`,
          `Variation = ${F(inv1, 2)} − ${F(inv0, 2)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const rev = 1460, ar = 160;
      const a = (ar / rev) * 365;
      return q("eq-fcst-d3", "difficile", "DSO (in days) needed to bring receivables to the target level?",
        [["Forecast revenue ($ millions)", E(rev)], ["Target accounts receivable ($ millions)", E(ar)]],
        a, "", 1,
        ["Créances = DSO × CA / 365, donc DSO = créances × 365 / CA.", `DSO = ${F(ar)} × 365 / ${F(rev)} = ${F(a, 1)} jours.`]);
    })(),
    (() => {
      const ar = 120, rev = 1095, inv = 150, cogs = 730, ap = 80;
      const dso = (ar / rev) * 365, doh = (inv / cogs) * 365, dpo = (ap / cogs) * 365;
      const a = dso + doh - dpo;
      return q("eq-fcst-d4", "difficile", "Cash conversion cycle, in days?",
        [["Accounts receivable / revenue", lst([E(ar), E(rev)])], ["Inventory / COGS", lst([E(inv), E(cogs)])], ["Accounts payable", E(ap)]],
        a, "", 1,
        [`DSO = ${F(ar)} × 365 / ${F(rev)} = ${F(dso, 1)} jours.`,
          `DOH = ${F(inv)} × 365 / ${F(cogs)} = ${F(doh, 1)} jours ; DPO = ${F(ap)} × 365 / ${F(cogs)} = ${F(dpo, 1)} jours.`,
          `Cycle = ${F(dso, 1)} + ${F(doh, 1)} − ${F(dpo, 1)} = ${F(a, 1)} jours.`]);
    })(),
    (() => {
      const rev0 = 2000, g = 0.05, gm = 0.38, sga0 = 400, infl = 0.03;
      const rev1 = rev0 * (1 + g), gp = rev1 * gm, sga1 = sga0 * (1 + infl);
      const a = gp - sga1;
      return q("eq-fcst-d5", "difficile", "Forecast operating profit (EBIT), in $ millions?",
        [["Revenue this year ($ millions)", E(rev0)], ["Expected revenue growth", pc(g)], ["Expected gross margin", pc(gm)],
          ["SG&A this year, fixed ($ millions)", E(sga0)], ["Expected inflation on SG&A", pc(infl)]],
        a, "$", 0,
        [`CA prévu = ${F(rev0)} × ${F(1 + g)} = ${F(rev1)} ; marge brute = ${F(rev1)} × ${P(gm)} = ${F(gp)}.`,
          `SG&A (fixes, indexés sur l'inflation) = ${F(sga0)} × ${F(1 + infl)} = ${F(sga1)}.`,
          `EBIT = ${F(gp)} − ${F(sga1)} = ${M(a, 0)}.`]);
    })(),
  ],
};

/* ────────────────────────── 9 · DDM sur horizon fini ────────────────────────── */

const DDM_HOLDING: CalcType = {
  key: "ddm-holding-period",
  topic: "equity",
  name: "DDM sur horizon de détention (holding period)",
  tier: "essentiel",
  source: "LM 8 · Equity Valuation: Concepts and Basic Tools",
  formulas: [
    "1 an : V0 = (D1 + P1) / (1 + r)",
    "n ans : V0 = Σ Dt / (1 + r)^t + Pn / (1 + r)^n",
    "D1 = D0 × (1 + g)",
  ],
  traps: [
    "« Just paid » = D0 ; « will pay » ou « expected » = D1.",
    "Le prix de revente Pn s'actualise sur n années, comme le dernier dividende.",
  ],
  questions: [
    (() => {
      const d1 = 1.5, p1 = 26, r = 0.1;
      const a = (d1 + p1) / (1 + r);
      return q("eq-ddm-f1", "facile", "Value of the stock today?",
        [["Dividend expected in one year", usd(d1, 2)], ["Expected price in one year", usd(p1, 2)], ["Required return", pc(r)]],
        a, "$", 2,
        ["V0 = (D1 + P1) / (1 + r).", `= (${F(d1, 2)} + ${F(p1)}) / ${F(1 + r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const p3 = 51, r = 0.12;
      const a = pv(p3, r, 3);
      return q("eq-ddm-f2", "facile", "Present value of the expected price in three years?",
        [["Expected price in three years", usd(p3, 2)], ["Required return", pc(r)]],
        a, "$", 2,
        ["Le prix de revente s'actualise sur 3 ans.", `PV = ${F(p3)} / ${pw(r, 3)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d = [1, 1.1], p2 = 30, r = 0.1;
      const a = pvSeries(d, r) + pv(p2, r, 2);
      return q("eq-ddm-f3", "facile", "Value of the stock with a two-year holding period?",
        [["Expected dividends years 1 / 2", lst(d.map((x) => usd(x, 2)))], ["Expected price in two years", usd(p2, 2)], ["Required return", pc(r)]],
        a, "$", 2,
        [`V0 = ${F(d[0], 2)} / ${pw(r, 1)} + (${F(d[1], 2)} + ${F(p2)}) / ${pw(r, 2)}.`,
          `= ${F(pv(d[0], r, 1), 2)} + ${F(pv(d[1] + p2, r, 2), 2)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d = [2, 2.1, 2.2], r = 0.1;
      const a = pvSeries(d, r);
      return q("eq-ddm-f4", "facile", "Present value of the next three dividends?",
        [["Expected dividends years 1 / 2 / 3", lst(d.map((x) => usd(x, 2)))], ["Required return", pc(r)]],
        a, "$", 2,
        [`PV = ${d.map((x, i) => `${F(x, 2)} / ${pw(r, i + 1)}`).join(" + ")}.`,
          `= ${d.map((x, i) => F(pv(x, r, i + 1), 2)).join(" + ")} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const p2 = 50, r = 0.09;
      const a = pv(p2, r, 2);
      return q("eq-ddm-f5", "facile", "Value today of a non-dividend-paying stock?",
        [["Dividends", "none"], ["Expected price in two years", usd(p2, 2)], ["Required return", pc(r)]],
        a, "$", 2,
        ["Sans dividende, la valeur est la PV du prix de revente.", `V0 = ${F(p2)} / ${pw(r, 2)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d0 = 1, g = 0.05, p1 = 13.45, r = 0.132;
      const d1 = d0 * (1 + g);
      const a = (d1 + p1) / (1 + r);
      return q("eq-ddm-m1", "moyen", "Value of the stock today?",
        [["Dividend just paid", usd(d0, 2)], ["Dividend growth next year", pc(g)], ["Expected price in one year", usd(p1, 2)], ["Required return", pc(r)]],
        a, "$", 2,
        [`D1 = ${F(d0, 2)} × ${F(1 + g)} = ${D(d1, 2)}.`, `V0 = (${F(d1, 2)} + ${F(p1, 2)}) / ${F(1 + r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d0 = 1.5, g = 0.08, p3 = 51, r = 0.12;
      const d = grow(d0, [g, g, g]);
      const a = pvSeries(d, r) + pv(p3, r, 3);
      return q("eq-ddm-m2", "moyen", "Value of the stock with a three-year holding period?",
        [["Dividend just paid", usd(d0, 2)], ["Dividend growth", pc(g)], ["Expected price in three years", usd(p3, 2)], ["Required return", pc(r)]],
        a, "$", 2,
        [`Dividendes : ${d.map((x, i) => `D${i + 1} = ${F(x, 4)}`).join(" ; ")}.`,
          `PV des dividendes = ${F(pvSeries(d, r), 2)} ; PV du prix = ${F(p3)} / ${pw(r, 3)} = ${F(pv(p3, r, 3), 2)}.`,
          `V0 = ${F(pvSeries(d, r), 2)} + ${F(pv(p3, r, 3), 2)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d0 = 1.5, gNext = 0.2, p1 = 50, beta = 2, rf = 0.06, rm = 0.1;
      const r = capm(rf, beta, rm), d1 = d0 * (1 + gNext);
      const a = (d1 + p1) / (1 + r);
      return q("eq-ddm-m3", "moyen", "Value of the stock today?",
        [["Dividend just paid", usd(d0, 2)], ["Dividend increase next year", pc(gNext)], ["Expected price in one year", usd(p1, 2)],
          ["Beta", E(beta)], ["Risk-free rate / expected market return", lst([pc(rf), pc(rm)])]],
        a, "$", 2,
        [`r (CAPM) = ${P(rf)} + ${F(beta)} × (${P(rm)} − ${P(rf)}) = ${P(r)}.`,
          `D1 = ${F(d0, 2)} × ${F(1 + gNext)} = ${D(d1, 2)}.`,
          `V0 = (${F(d1, 2)} + ${F(p1)}) / ${F(1 + r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const v0 = 30, d1 = 1.2, r = 0.11;
      const a = v0 * (1 + r) - d1;
      return q("eq-ddm-m4", "moyen", "Expected price in one year consistent with today's value?",
        [["Value today", usd(v0, 2)], ["Dividend expected in one year", usd(d1, 2)], ["Required return", pc(r)]],
        a, "$", 2,
        [`V0 = (D1 + P1) / (1 + r), donc D1 + P1 = ${F(v0)} × ${F(1 + r)} = ${F(v0 * (1 + r), 2)}.`, `P1 = ${F(v0 * (1 + r), 2)} − ${F(d1, 2)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const p0 = 40, d1 = 2, p1 = 44;
      const a = ((d1 + p1) / p0 - 1) * 100;
      return q("eq-ddm-m5", "moyen", "Discount rate that makes the one-year DDM value equal to the price?",
        [["Current price", usd(p0, 2)], ["Dividend expected in one year", usd(d1, 2)], ["Expected price in one year", usd(p1, 2)]],
        a, "%", 2,
        ["P0 = (D1 + P1) / (1 + r), donc 1 + r = (D1 + P1) / P0.", `r = (${F(d1)} + ${F(p1)}) / ${F(p0)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const d0 = 2, g = 0.06, e3 = 4.5, pe = 12, r = 0.12;
      const d = grow(d0, [g, g, g]), p3 = e3 * pe;
      const a = pvSeries(d, r) + pv(p3, r, 3);
      return q("eq-ddm-d1", "difficile", "Value of the stock with a three-year holding period?",
        [["Dividend just paid", usd(d0, 2)], ["Dividend growth", pc(g)], ["Expected EPS in year 3", usd(e3, 2)],
          ["Expected P/E at the end of year 3", mx(pe)], ["Required return", pc(r)]],
        a, "$", 2,
        [`Prix de revente P3 = ${F(pe)} × ${F(e3, 2)} = ${D(p3)}.`,
          `Dividendes : ${d.map((x, i) => `D${i + 1} = ${F(x, 4)}`).join(" ; ")} ; PV = ${F(pvSeries(d, r), 2)}.`,
          `PV de P3 = ${F(p3)} / ${pw(r, 3)} = ${F(pv(p3, r, 3), 2)}.`,
          `V0 = ${F(pvSeries(d, r), 2)} + ${F(pv(p3, r, 3), 2)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d0 = 1.2, g = 0.04, p2 = 28, rf = 0.03, mrp = 0.05, beta = 1.2;
      const r = rf + beta * mrp, d = grow(d0, [g, g]);
      const a = pvSeries(d, r) + pv(p2, r, 2);
      return q("eq-ddm-d2", "difficile", "Value of the stock with a two-year holding period?",
        [["Dividend just paid", usd(d0, 2)], ["Dividend growth", pc(g)], ["Expected price in two years", usd(p2, 2)],
          ["Risk-free rate", pc(rf)], ["Market risk premium", pc(mrp)], ["Beta", E(beta)]],
        a, "$", 2,
        [`r = ${P(rf)} + ${F(beta)} × ${P(mrp)} = ${P(r)} (la prime de marché est déjà E(Rm) − Rf).`,
          `D1 = ${F(d[0], 4)} ; D2 = ${F(d[1], 4)}.`,
          `V0 = ${F(d[0], 4)} / ${pw(r, 1)} + (${F(d[1], 4)} + ${F(p2)}) / ${pw(r, 2)} = ${F(pv(d[0], r, 1), 2)} + ${F(pv(d[1] + p2, r, 2), 2)}.`,
          `V0 = ${D(a, 2)}.`]);
    })(),
    (() => {
      const p0 = 40, d1 = 1.5, d2 = 1.6, r = 0.12;
      const a = p0 * Math.pow(1 + r, 2) - d1 * (1 + r) - d2;
      return q("eq-ddm-d3", "difficile", "Selling price in two years needed to earn the required return?",
        [["Purchase price today", usd(p0, 2)], ["Expected dividends years 1 / 2", lst([usd(d1, 2), usd(d2, 2)])], ["Required return", pc(r)]],
        a, "$", 2,
        [`Il faut ${F(p0)} = ${F(d1, 2)} / ${pw(r, 1)} + (${F(d2, 2)} + P2) / ${pw(r, 2)}.`,
          `En valeur à 2 ans : ${F(p0)} × ${pw(r, 2)} = ${F(d1, 2)} × ${F(1 + r)} + ${F(d2, 2)} + P2, soit ${F(p0 * Math.pow(1 + r, 2), 3)} = ${F(d1 * (1 + r), 2)} + ${F(d2, 2)} + P2.`,
          `P2 = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d3 = 1, p3 = 25, r = 0.13;
      const a = pv(d3 + p3, r, 3);
      return q("eq-ddm-d4", "difficile", "Value today if you sell right after the year-3 dividend?",
        [["Dividends years 1 and 2", "none"], ["Dividend at the end of year 3", usd(d3, 2)], ["Expected price at the end of year 3", usd(p3, 2)], ["Required return", pc(r)]],
        a, "$", 2,
        ["Seuls flux : le dividende et le prix de revente, tous deux à la fin de l'année 3.",
          `V0 = (${F(d3, 2)} + ${F(p3)}) / ${pw(r, 3)} = ${F(d3 + p3)} / ${F(Math.pow(1 + r, 3), 6)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d = [1.5, 1.6], p2 = 36, rA = 0.1, rB = 0.12;
      const vA = pvSeries(d, rA) + pv(p2, rA, 2), vB = pvSeries(d, rB) + pv(p2, rB, 2);
      const a = vB - vA;
      return q("eq-ddm-d5", "difficile", "Change in value if the required return rises? (Negative if a fall.)",
        [["Expected dividends years 1 / 2", lst(d.map((x) => usd(x, 2)))], ["Expected price in two years", usd(p2, 2)], ["Required return", `${pc(rA)} → ${pc(rB)}`]],
        a, "$", 2,
        [`À ${P(rA)} : V0 = ${F(d[0], 2)} / ${pw(rA, 1)} + (${F(d[1], 2)} + ${F(p2)}) / ${pw(rA, 2)} = ${D(vA, 3)}.`,
          `À ${P(rB)} : V0 = ${F(d[0], 2)} / ${pw(rB, 1)} + (${F(d[1], 2)} + ${F(p2)}) / ${pw(rB, 2)} = ${D(vB, 3)}.`,
          `Variation = ${F(vB, 3)} − ${F(vA, 3)} = ${D(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 10 · FCFE ────────────────────────── */

const FCFE: CalcType = {
  key: "fcfe",
  topic: "equity",
  name: "FCFE et valorisation par le FCFE",
  tier: "essentiel",
  source: "LM 8 · Equity Valuation: Concepts and Basic Tools",
  formulas: [
    "FCFE = RN + D&A − hausse du BFR − FCInv − remboursements de dette + nouvelles dettes",
    "FCFE = CFO − FCInv + emprunt net (net borrowing)",
    "CFO (méthode indirecte) = RN + D&A − gains de cession (+ pertes) − hausse du BFR",
    "FCInv = investissements bruts − produits de cession d'actifs",
    "Croissance constante : V0 = FCFE1 / (r − g)",
  ],
  traps: [
    "Les dividendes versés ne se retranchent pas : le FCFE mesure ce qui POURRAIT être versé.",
    "Hausse des créances ou des stocks = cash consommé ; hausse des fournisseurs = cash libéré.",
  ],
  questions: [
    (() => {
      const cfo = 500, fc = 200, nb = 50;
      const a = fcfeFromCFO(cfo, fc, nb);
      return q("eq-fcfe-f1", "facile", "FCFE, in $ millions?",
        [["Cash flow from operations ($ millions)", E(cfo)], ["Fixed capital investment ($ millions)", E(fc)], ["Net borrowing ($ millions)", E(nb)]],
        a, "$", 0,
        ["FCFE = CFO − FCInv + emprunt net.", `= ${F(cfo)} − ${F(fc)} + ${F(nb)} = ${M(a, 0)}.`]);
    })(),
    (() => {
      const ni = 300, da = 80, dwc = 30, fc = 120, repaid = 40, issued = 60;
      const a = fcfeFromNI(ni, da, dwc, fc, issued - repaid);
      return q("eq-fcfe-f2", "facile", "FCFE, in $ millions?",
        [["Net income", E(ni)], ["Depreciation & amortization", E(da)], ["Increase in working capital", E(dwc)],
          ["Fixed capital investment", E(fc)], ["Debt repaid / new debt issued", lst([E(repaid), E(issued)])]],
        a, "$", 0,
        ["FCFE = RN + D&A − hausse du BFR − FCInv − remboursements + nouvelles dettes.",
          `= ${F(ni)} + ${F(da)} − ${F(dwc)} − ${F(fc)} − ${F(repaid)} + ${F(issued)} = ${M(a, 0)}.`]);
    })(),
    (() => {
      const ni = 400, da = 90, dwc = 50;
      const a = ni + da - dwc;
      return q("eq-fcfe-f3", "facile", "Cash flow from operations (indirect method), in $ millions?",
        [["Net income", E(ni)], ["Depreciation & amortization", E(da)], ["Increase in working capital", E(dwc)]],
        a, "$", 0,
        ["CFO = RN + D&A − hausse du BFR.", `= ${F(ni)} + ${F(da)} − ${F(dwc)} = ${M(a, 0)}.`]);
    })(),
    (() => {
      const f1 = 4.2, r = 0.11, g = 0.04;
      const a = gordon(f1, r, g);
      return q("eq-fcfe-f4", "facile", "Value per share with constant FCFE growth?",
        [["FCFE per share next year", usd(f1, 2)], ["Required return on equity", pc(r)], ["FCFE growth rate", pc(g)]],
        a, "$", 2,
        ["V0 = FCFE1 / (r − g).", `= ${F(f1, 2)} / (${F(r)} − ${F(g)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const fcfe = 400, cfo = 600, fc = 250;
      const a = fcfe - cfo + fc;
      return q("eq-fcfe-f5", "facile", "Net borrowing implied, in $ millions?",
        [["FCFE ($ millions)", E(fcfe)], ["Cash flow from operations ($ millions)", E(cfo)], ["Fixed capital investment ($ millions)", E(fc)]],
        a, "$", 0,
        ["FCFE = CFO − FCInv + emprunt net, donc emprunt net = FCFE − CFO + FCInv.", `= ${F(fcfe)} − ${F(cfo)} + ${F(fc)} = ${M(a, 0)}.`]);
    })(),
    (() => {
      const ni = 250, da = 60, dAR = 20, dInv = 15, dAP = 10, fc = 100, nb = 30;
      const dwc = dAR + dInv - dAP;
      const a = fcfeFromNI(ni, da, dwc, fc, nb);
      return q("eq-fcfe-m1", "moyen", "FCFE, in $ millions?",
        [["Net income", E(ni)], ["Depreciation & amortization", E(da)], ["Increase in receivables / inventory / payables", lst([E(dAR), E(dInv), E(dAP)])],
          ["Fixed capital investment", E(fc)], ["Net borrowing", E(nb)]],
        a, "$", 0,
        [`Hausse du BFR = ${F(dAR)} + ${F(dInv)} − ${F(dAP)} = ${F(dwc)} (les fournisseurs financent).`,
          `FCFE = ${F(ni)} + ${F(da)} − ${F(dwc)} − ${F(fc)} + ${F(nb)} = ${M(a, 0)}.`]);
    })(),
    (() => {
      const f0 = 2.5, g = 0.06, r = 0.11;
      const f1 = f0 * (1 + g);
      const a = gordon(f1, r, g);
      return q("eq-fcfe-m2", "moyen", "Value per share?",
        [["FCFE per share just ended (FCFE0)", usd(f0, 2)], ["FCFE growth rate (constant)", pc(g)], ["Required return on equity", pc(r)]],
        a, "$", 2,
        [`FCFE1 = ${F(f0, 2)} × ${F(1 + g)} = ${D(f1, 2)}.`, `V0 = ${F(f1, 2)} / (${F(r)} − ${F(g)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const f1 = 300, r = 0.12, g = 0.05, n = 100;
      const total = gordon(f1, r, g);
      const a = total / n;
      return q("eq-fcfe-m3", "moyen", "Equity value per share?",
        [["Total FCFE next year ($ millions)", E(f1)], ["Required return on equity", pc(r)], ["FCFE growth rate", pc(g)], ["Shares outstanding (millions)", E(n)]],
        a, "$", 2,
        [`Valeur des capitaux propres = ${F(f1)} / (${F(r)} − ${F(g)}) = ${F(total, 2)} M$.`, `Par action = ${F(total, 2)} / ${F(n)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const cfo = 520, capex = 300, sales = 50, nb = 40;
      const fc = capex - sales;
      const a = fcfeFromCFO(cfo, fc, nb);
      return q("eq-fcfe-m4", "moyen", "FCFE, in $ millions?",
        [["Cash flow from operations", E(cfo)], ["Capital expenditures", E(capex)], ["Proceeds from sale of fixed assets", E(sales)], ["Net borrowing", E(nb)]],
        a, "$", 0,
        [`FCInv = ${F(capex)} − ${F(sales)} = ${F(fc)}.`, `FCFE = ${F(cfo)} − ${F(fc)} + ${F(nb)} = ${M(a, 0)}.`]);
    })(),
    (() => {
      const p0 = 40, f1 = 2.4, g = 0.05;
      const a = impliedReturn(f1, p0, g) * 100;
      return q("eq-fcfe-m5", "moyen", "Required return implied by the market price?",
        [["Share price", usd(p0, 2)], ["FCFE per share next year", usd(f1, 2)], ["FCFE growth rate (constant)", pc(g)]],
        a, "%", 2,
        ["P0 = FCFE1 / (r − g), donc r = FCFE1 / P0 + g.", `r = ${F(f1, 2)} / ${F(p0)} + ${P(g)} = ${P(f1 / p0)} + ${P(g)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const f = [2, 2.4], g = 0.04, r = 0.1;
      const p2 = gordon(f[1] * (1 + g), r, g);
      const a = pvSeries(f, r) + pv(p2, r, 2);
      return q("eq-fcfe-d1", "difficile", "Value per share with a two-stage FCFE model?",
        [["FCFE per share years 1 / 2", lst(f.map((x) => usd(x, 2)))], ["Constant growth from year 3", pc(g)], ["Required return on equity", pc(r)]],
        a, "$", 2,
        [`FCFE3 = ${F(f[1], 2)} × ${F(1 + g)} = ${F(f[1] * (1 + g), 3)} ; valeur terminale V2 = ${F(f[1] * (1 + g), 3)} / (${F(r)} − ${F(g)}) = ${F(p2, 2)}.`,
          `PV : ${F(f[0], 2)} / ${pw(r, 1)} = ${F(pv(f[0], r, 1), 2)} ; (${F(f[1], 2)} + ${F(p2, 2)}) / ${pw(r, 2)} = ${F(pv(f[1] + p2, r, 2), 2)}.`,
          `V0 = ${D(a, 2)}.`]);
    })(),
    (() => {
      const ni = 500, da = 120, dwc = 40, fc = 220, issued = 150, repaid = 100, divs = 180;
      const a = fcfeFromNI(ni, da, dwc, fc, issued - repaid);
      return q("eq-fcfe-d2", "difficile", "FCFE, in $ millions?",
        [["Net income", E(ni)], ["Depreciation & amortization", E(da)], ["Increase in working capital", E(dwc)], ["Fixed capital investment", E(fc)],
          ["New debt issued / debt repaid", lst([E(issued), E(repaid)])], ["Dividends paid", E(divs)]],
        a, "$", 0,
        ["Les dividendes versés ne se retranchent pas : c'est la donnée-piège.",
          `Emprunt net = ${F(issued)} − ${F(repaid)} = ${F(issued - repaid)}.`,
          `FCFE = ${F(ni)} + ${F(da)} − ${F(dwc)} − ${F(fc)} + ${F(issued - repaid)} = ${M(a, 0)}.`]);
    })(),
    (() => {
      const ni = 600, da = 150, dwc = 50, fc = 250, nb = 50, g = 0.04, r = 0.1, n = 200;
      const f0 = fcfeFromNI(ni, da, dwc, fc, nb), f1 = f0 * (1 + g), total = gordon(f1, r, g);
      const a = total / n;
      return q("eq-fcfe-d3", "difficile", "Equity value per share?",
        [["Net income (this year, $ millions)", E(ni)], ["Depreciation & amortization", E(da)], ["Increase in working capital", E(dwc)],
          ["Fixed capital investment", E(fc)], ["Net borrowing", E(nb)], ["FCFE growth / required return", lst([pc(g), pc(r)])], ["Shares outstanding (millions)", E(n)]],
        a, "$", 2,
        [`FCFE0 = ${F(ni)} + ${F(da)} − ${F(dwc)} − ${F(fc)} + ${F(nb)} = ${F(f0)}.`,
          `FCFE1 = ${F(f0)} × ${F(1 + g)} = ${F(f1)}.`,
          `Valeur = ${F(f1)} / (${F(r)} − ${F(g)}) = ${F(total, 2)} M$.`,
          `Par action = ${F(total, 2)} / ${F(n)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const ni = 300, da = 70, gain = 20, dAR = 15, dInv = -10, dAP = 5, capex = 230, proceeds = 30, nb = 20;
      const cfo = ni + da - gain - dAR - dInv + dAP, fc = capex - proceeds;
      const a = fcfeFromCFO(cfo, fc, nb);
      return q("eq-fcfe-d4", "difficile", "FCFE, in $ millions?",
        [["Net income", E(ni)], ["Depreciation & amortization", E(da)], ["Gain on sale of equipment", E(gain)],
          ["Change in receivables / inventory / payables", lst([sn(dAR), sn(dInv), sn(dAP)])],
          ["Capital expenditures / proceeds from asset sales", lst([E(capex), E(proceeds)])], ["Net borrowing", E(nb)]],
        a, "$", 0,
        [`CFO = ${F(ni)} + ${F(da)} − ${F(gain)} (gain retiré) − ${F(dAR)} + ${F(-dInv)} (stocks en baisse) + ${F(dAP)} = ${F(cfo)}.`,
          `FCInv = ${F(capex)} − ${F(proceeds)} = ${F(fc)}.`,
          `FCFE = ${F(cfo)} − ${F(fc)} + ${F(nb)} = ${M(a, 0)}.`]);
    })(),
    (() => {
      const p0 = 50, f0 = 2, r = 0.1;
      const a = impliedGrowthD0(f0, p0, r) * 100;
      return q("eq-fcfe-d5", "difficile", "Constant FCFE growth rate implied by the market price?",
        [["Share price", usd(p0, 2)], ["FCFE per share just ended (FCFE0)", usd(f0, 2)], ["Required return on equity", pc(r)]],
        a, "%", 2,
        [`${F(p0)} = ${F(f0)} × (1 + g) / (${F(r)} − g).`,
          `${F(p0 * r)} − ${F(p0)}g = ${F(f0)} + ${F(f0)}g, donc ${F(p0 + f0)}g = ${F(p0 * r - f0)}.`,
          `g = ${F(p0 * r - f0)} / ${F(p0 + f0)} = ${Pa(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 11 · Rendement exigé et attendu ────────────────────────── */

const REQUIRED_RETURN: CalcType = {
  key: "required-return",
  topic: "equity",
  name: "Rendement exigé et rendement attendu d'une action",
  tier: "annexe",
  source: "LM 8 · Equity Valuation: Concepts and Basic Tools",
  formulas: [
    "CAPM : r = Rf + β × (E(Rm) − Rf)",
    "Bond yield plus risk premium : r = rendement des obligations de l'émetteur + prime",
    "Rendement attendu (Gordon) : E(R) = D1 / P0 + g",
    "Rendement attendu sur un an : (D1 + P1 − P0) / P0",
  ],
  traps: [
    "Si l'énoncé donne la prime de marché, elle vaut déjà E(Rm) − Rf : ne retranche pas Rf une seconde fois.",
    "Action attractive si rendement attendu > rendement exigé.",
  ],
  questions: [
    (() => {
      const rf = 0.03, beta = 1.2, rm = 0.08;
      const a = capm(rf, beta, rm) * 100;
      return q("eq-req-f1", "facile", "Required return (CAPM)?",
        [["Risk-free rate", pc(rf)], ["Beta", E(beta)], ["Expected market return", pc(rm)]],
        a, "%", 2,
        ["r = Rf + β × (E(Rm) − Rf).", `= ${P(rf)} + ${F(beta)} × (${P(rm)} − ${P(rf)}) = ${Pa(a)}.`]);
    })(),
    (() => {
      const y = 0.055, prem = 0.04;
      const a = (y + prem) * 100;
      return q("eq-req-f2", "facile", "Required return on equity (bond yield plus risk premium)?",
        [["Yield on the company's bonds", pc(y)], ["Equity risk premium over the bonds", pc(prem)]],
        a, "%", 2,
        ["r = rendement obligataire de l'émetteur + prime.", `= ${P(y)} + ${P(prem)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const d1 = 1.8, p0 = 45, g = 0.06;
      const a = impliedReturn(d1, p0, g) * 100;
      return q("eq-req-f3", "facile", "Expected return implied by the price (constant growth)?",
        [["Expected dividend next year", usd(d1, 2)], ["Share price", usd(p0, 2)], ["Constant growth rate", pc(g)]],
        a, "%", 2,
        ["E(R) = D1 / P0 + g.", `= ${F(d1, 2)} / ${F(p0)} + ${P(g)} = ${P(d1 / p0)} + ${P(g)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const p0 = 20, d1 = 1, p1 = 22;
      const a = ((d1 + p1 - p0) / p0) * 100;
      return q("eq-req-f4", "facile", "Expected one-year holding period return?",
        [["Price today", usd(p0, 2)], ["Expected dividend", usd(d1, 2)], ["Expected price in one year", usd(p1, 2)]],
        a, "%", 2,
        ["Rendement = (D1 + P1 − P0) / P0.", `= (${F(d1)} + ${F(p1)} − ${F(p0)}) / ${F(p0)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const d = 2.4, p0 = 30;
      const a = (d / p0) * 100;
      return q("eq-req-f5", "facile", "Required return implied by the price? (Dividend constant forever.)",
        [["Annual dividend (no growth)", usd(d, 2)], ["Share price", usd(p0, 2)]],
        a, "%", 2,
        ["Sans croissance, P0 = D / r, donc r = D / P0.", `r = ${F(d, 2)} / ${F(p0)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const d0 = 1, p0 = 20, g = 0.05;
      const d1 = d0 * (1 + g);
      const a = impliedReturn(d1, p0, g) * 100;
      return q("eq-req-m1", "moyen", "Required return implied by the market price?",
        [["Dividend just paid", usd(d0, 2)], ["Share price", usd(p0, 2)], ["Constant growth rate", pc(g)]],
        a, "%", 2,
        [`D1 = ${F(d0, 2)} × ${F(1 + g)} = ${D(d1, 2)}.`, `r = ${F(d1, 2)} / ${F(p0)} + ${P(g)} = ${P(d1 / p0, 2)} + ${P(g)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const r = 0.11, rf = 0.03, rm = 0.09;
      const a = (r - rf) / (rm - rf);
      return q("eq-req-m2", "moyen", "Beta implied by the required return?",
        [["Required return", pc(r)], ["Risk-free rate", pc(rf)], ["Expected market return", pc(rm)]],
        a, "", 2,
        ["β = (r − Rf) / (E(Rm) − Rf).", `= (${P(r)} − ${P(rf)}) / (${P(rm)} − ${P(rf)}) = ${P(r - rf)} / ${P(rm - rf)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const p0 = 40, d1 = 1.6, g = 0.06, rf = 0.04, beta = 1.1, mrp = 0.05;
      const er = impliedReturn(d1, p0, g), req = rf + beta * mrp;
      const a = (er - req) * 10000;
      return q("eq-req-m3", "moyen", "Expected return minus required return, in basis points?",
        [["Share price", usd(p0, 2)], ["Expected dividend next year", usd(d1, 2)], ["Constant growth rate", pc(g)],
          ["Risk-free rate / market risk premium", lst([pc(rf), pc(mrp)])], ["Beta", E(beta)]],
        a, "bp", 0,
        [`Rendement attendu = ${F(d1, 2)} / ${F(p0)} + ${P(g)} = ${P(er)}.`,
          `Rendement exigé = ${P(rf)} + ${F(beta)} × ${P(mrp)} = ${P(req)}.`,
          `Écart = ${P(er)} − ${P(req)} = ${F(a, 0)} bp : l'action paraît sous-évaluée.`]);
    })(),
    (() => {
      const p0 = 25, d1 = 1, roe = 0.12, payout = 0.4;
      const g = sustainableGrowth(1 - payout, roe);
      const a = impliedReturn(d1, p0, g) * 100;
      return q("eq-req-m4", "moyen", "Expected return (constant growth model)?",
        [["Share price", usd(p0, 2)], ["Expected dividend next year", usd(d1, 2)], ["ROE", pc(roe)], ["Payout ratio", pc(payout)]],
        a, "%", 2,
        [`g = (1 − ${F(payout)}) × ${P(roe)} = ${P(g)}.`, `E(R) = ${F(d1, 2)} / ${F(p0)} + ${P(g)} = ${P(d1 / p0)} + ${P(g)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const r = 0.1, rf = 0.04, beta = 1.5;
      const a = ((r - rf) / beta) * 100;
      return q("eq-req-m5", "moyen", "Market risk premium implied?",
        [["Required return on the stock", pc(r)], ["Risk-free rate", pc(rf)], ["Beta", E(beta)]],
        a, "%", 2,
        ["r = Rf + β × prime, donc prime = (r − Rf) / β.", `= (${P(r)} − ${P(rf)}) / ${F(beta)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const p0 = 32, d0 = 1.2, g = 0.05, rf = 0.03, beta = 1.3, rm = 0.08;
      const d1 = d0 * (1 + g), er = impliedReturn(d1, p0, g), req = capm(rf, beta, rm);
      const a = (er - req) * 10000;
      return q("eq-req-d1", "difficile", "Expected return minus required return, in basis points?",
        [["Share price", usd(p0, 2)], ["Dividend just paid", usd(d0, 2)], ["Constant growth rate", pc(g)],
          ["Risk-free rate / expected market return", lst([pc(rf), pc(rm)])], ["Beta", E(beta)]],
        a, "bp", 0,
        [`D1 = ${F(d0, 2)} × ${F(1 + g)} = ${D(d1, 2)} ; rendement attendu = ${F(d1, 2)} / ${F(p0)} + ${P(g)} = ${P(er, 4)}.`,
          `Rendement exigé = ${P(rf)} + ${F(beta)} × (${P(rm)} − ${P(rf)}) = ${P(req)}.`,
          `Écart = ${P(er, 4)} − ${P(req)} = ${F(a, 0)} bp : l'action paraît surévaluée.`]);
    })(),
    (() => {
      const y = 0.06, prem = 0.04, d1 = 3, g = 0.04;
      const r = y + prem;
      const a = gordon(d1, r, g);
      return q("eq-req-d2", "difficile", "Value of the stock (constant growth)?",
        [["Yield on the company's bonds", pc(y)], ["Equity risk premium over the bonds", pc(prem)], ["Expected dividend next year", usd(d1, 2)], ["Constant growth rate", pc(g)]],
        a, "$", 2,
        [`r = ${P(y)} + ${P(prem)} = ${P(r)}.`, `V0 = ${F(d1, 2)} / (${F(r)} − ${F(g)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const p0 = 30, d1 = 1.5, g = 0.05, rf = 0.04, rm = 0.09;
      const r = impliedReturn(d1, p0, g);
      const a = (r - rf) / (rm - rf);
      return q("eq-req-d3", "difficile", "Beta consistent with the market price?",
        [["Share price", usd(p0, 2)], ["Expected dividend next year", usd(d1, 2)], ["Constant growth rate", pc(g)], ["Risk-free rate / expected market return", lst([pc(rf), pc(rm)])]],
        a, "", 2,
        [`Rendement implicite = ${F(d1, 2)} / ${F(p0)} + ${P(g)} = ${P(r)}.`, `β = (${P(r)} − ${P(rf)}) / (${P(rm)} − ${P(rf)}) = ${F(a, 2)}.`]);
    })(),
    (() => {
      const p0 = 50, d1 = 1.8, e1 = 4.6, pe = 12;
      const p1 = e1 * pe;
      const a = ((d1 + p1 - p0) / p0) * 100;
      return q("eq-req-d4", "difficile", "Expected one-year holding period return?",
        [["Price today", usd(p0, 2)], ["Expected dividend", usd(d1, 2)], ["Expected EPS next year", usd(e1, 2)], ["Expected P/E in one year (on that EPS)", mx(pe)]],
        a, "%", 2,
        [`Prix attendu dans un an = ${F(pe)} × ${F(e1, 2)} = ${D(p1, 2)}.`, `Rendement = (${F(d1, 2)} + ${F(p1, 2)} − ${F(p0)}) / ${F(p0)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const p0 = 45, d0 = 1.8, rf = 0.04, beta = 0.9, mrp = 0.05;
      const r = rf + beta * mrp;
      const a = impliedGrowthD0(d0, p0, r) * 100;
      return q("eq-req-d5", "difficile", "Constant dividend growth rate implied by the price?",
        [["Share price", usd(p0, 2)], ["Dividend just paid", usd(d0, 2)], ["Risk-free rate / market risk premium", lst([pc(rf), pc(mrp)])], ["Beta", E(beta)]],
        a, "%", 2,
        [`r = ${P(rf)} + ${F(beta)} × ${P(mrp)} = ${P(r)}.`,
          `${F(p0)} = ${F(d0, 2)} × (1 + g) / (${F(r)} − g), soit ${F(p0 * r, 3)} − ${F(p0)}g = ${F(d0, 2)} + ${F(d0, 2)}g.`,
          `g = (${F(p0 * r, 3)} − ${F(d0, 2)}) / (${F(p0)} + ${F(d0, 2)}) = ${Pa(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 12 · Actions de préférence ────────────────────────── */

const PREFERRED: CalcType = {
  key: "preferred-stock",
  topic: "equity",
  name: "Actions de préférence (preferred stock)",
  tier: "essentiel",
  source: "LM 8 · Equity Valuation: Concepts and Basic Tools",
  formulas: [
    "V0 = Dp / rp (action de préférence perpétuelle, non callable, non convertible)",
    "Dp = taux du dividende × valeur nominale (par)",
    "Rendement exigé implicite : rp = Dp / P0",
  ],
  traps: [
    "Le taux du dividende s'applique au nominal, jamais au prix.",
    "Le rendement exigé vient du marché, pas du taux du dividende.",
  ],
  questions: [
    (() => {
      const dp = 5, r = 0.08;
      const a = preferredValue(dp, r);
      return q("eq-pref-f1", "facile", "Value of the preferred share?",
        [["Annual preferred dividend", usd(dp, 2)], ["Required return", pc(r)]],
        a, "$", 2,
        ["V0 = Dp / rp.", `= ${F(dp, 2)} / ${F(r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const dp = 11.5, p0 = 88.46;
      const a = (dp / p0) * 100;
      return q("eq-pref-f2", "facile", "Required return implied by the price?",
        [["Annual preferred dividend", usd(dp, 2)], ["Market price", usd(p0, 2)]],
        a, "%", 2,
        ["rp = Dp / P0.", `= ${F(dp, 2)} / ${F(p0, 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const par = 50, rate = 0.075;
      const a = par * rate;
      return q("eq-pref-f3", "facile", "Annual dividend per preferred share?",
        [["Par value", usd(par, 2)], ["Dividend rate", pc(rate)]],
        a, "$", 2,
        ["Dp = taux du dividende × nominal.", `= ${P(rate)} × ${D(par)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const rate = 0.07, r = 0.0875;
      const a = (rate / r) * 100;
      return q("eq-pref-f4", "facile", "Value of the preferred share as a percentage of par?",
        [["Dividend rate (on par)", pc(rate)], ["Required return", pc(r)]],
        a, "%", 2,
        ["V0 = taux × par / rp, donc V0 / par = taux / rp.", `V0 / par = ${P(rate)} / ${P(r)} = ${Pa(a)} : l'action cote sous le pair car rp > taux du dividende.`]);
    })(),
    (() => {
      const p0 = 80, r = 0.0625;
      const a = p0 * r;
      return q("eq-pref-f5", "facile", "Annual dividend implied by the price?",
        [["Market price", usd(p0, 2)], ["Required return", pc(r)]],
        a, "$", 2,
        ["V0 = Dp / rp, donc Dp = V0 × rp.", `= ${F(p0)} × ${P(r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const par = 100, rate = 0.06, r = 0.08;
      const dp = par * rate;
      const a = preferredValue(dp, r);
      return q("eq-pref-m1", "moyen", "Value of the preferred share?",
        [["Par value", usd(par, 2)], ["Dividend rate", pc(rate)], ["Required return", pc(r)]],
        a, "$", 2,
        [`Dp = ${P(rate)} × ${D(par)} = ${D(dp, 2)}.`, `V0 = ${F(dp, 2)} / ${F(r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const dp = 5.5, tb = 0.07, spread = 75;
      const r = tb + spread / 10000;
      const a = preferredValue(dp, r);
      return q("eq-pref-m2", "moyen", "Value of the preferred share?",
        [["Annual preferred dividend", usd(dp, 2)], ["Treasury bond yield", pc(tb)], ["Required spread over Treasuries", `${spread} bp`]],
        a, "$", 2,
        [`rp = ${P(tb)} + ${F(spread / 100)}% = ${P(r)}.`, `V0 = ${F(dp, 2)} / ${F(r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const dp = 5, bond = 0.0625, below = 75;
      const r = bond - below / 10000;
      const a = preferredValue(dp, r);
      return q("eq-pref-m3", "moyen", "Price of the preferred share?",
        [["Annual preferred dividend", usd(dp, 2)], ["Yield on the firm's bonds", pc(bond)], ["Preferred priced to yield below the bonds by", `${below} bp`]],
        a, "$", 2,
        [`rp = ${P(bond)} − ${F(below / 100)}% = ${P(r)}.`, `V0 = ${F(dp, 2)} / ${F(r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const p0 = 75, par = 100, r = 0.08;
      const dp = p0 * r;
      const a = (dp / par) * 100;
      return q("eq-pref-m4", "moyen", "Dividend rate (as a % of par) implied by the price?",
        [["Market price", usd(p0, 2)], ["Par value", usd(par, 2)], ["Required return", pc(r)]],
        a, "%", 2,
        [`Dp = V0 × rp = ${F(p0)} × ${P(r)} = ${D(dp, 2)}.`, `Taux du dividende = ${F(dp)} / ${F(par)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const dp = 6, r0 = 0.08, r1 = 0.09;
      const v0 = preferredValue(dp, r0), v1 = preferredValue(dp, r1);
      const a = (v1 / v0 - 1) * 100;
      return q("eq-pref-m5", "moyen", "Percentage change in the preferred share's value?",
        [["Annual preferred dividend", usd(dp, 2)], ["Required return", `${pc(r0)} → ${pc(r1)}`]],
        a, "%", 2,
        [`Avant : ${F(dp)} / ${F(r0)} = ${D(v0, 2)} ; après : ${F(dp)} / ${F(r1)} = ${D(v1, 2)}.`, `Variation = ${F(v1, 4)} / ${F(v0, 2)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const dp = 3, y0 = 0.06, y1 = 0.05;
      const p0 = dp / y0, p1 = dp / y1;
      const a = ((p1 + dp - p0) / p0) * 100;
      return q("eq-pref-d1", "difficile", "One-year holding period return on the preferred share?",
        [["Annual preferred dividend (received once)", usd(dp, 2)], ["Dividend yield at purchase", pc(y0)], ["Dividend yield at sale, one year later", pc(y1)]],
        a, "%", 2,
        [`Prix d'achat = ${F(dp)} / ${F(y0)} = ${D(p0, 2)}.`, `Prix de vente = ${F(dp)} / ${F(y1)} = ${D(p1, 2)}.`,
          `Rendement = (${F(p1)} + ${F(dp)} − ${F(p0)}) / ${F(p0)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const par = 25, rate = 0.064, r = 0.08, beta = 1.2;
      const dp = par * rate;
      const a = preferredValue(dp, r);
      return q("eq-pref-d2", "difficile", "Value of the preferred share?",
        [["Par value", usd(par, 2)], ["Dividend rate", pc(rate)], ["Market yield on comparable preferreds", pc(r)], ["Beta of the common stock", E(beta)]],
        a, "$", 2,
        ["Le bêta des actions ordinaires ne sert pas : c'est la donnée-piège.", `Dp = ${P(rate)} × ${D(par)} = ${D(dp, 2)}.`, `V0 = ${F(dp, 2)} / ${F(r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const par = 100, rate = 0.07, pricePct = 0.95;
      const dp = par * rate, p0 = par * pricePct;
      const a = (dp / p0) * 100;
      return q("eq-pref-d3", "difficile", "Required return implied by the price?",
        [["Par value", usd(par, 2)], ["Dividend rate", pc(rate)], ["Market price", `${pc(pricePct)} of par`]],
        a, "%", 2,
        [`Dp = ${P(rate)} × ${D(par)} = ${D(dp, 2)} ; prix = ${D(p0, 2)}.`, `rp = ${F(dp)} / ${F(p0)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const cd = 4, cp = 50, par = 100, rate = 0.09;
      const r = cd / cp, dp = par * rate;
      const a = preferredValue(dp, r);
      return q("eq-pref-d4", "difficile", "Value of the preferred share, using the comparable's yield?",
        [["Comparable preferred: dividend / price", lst([usd(cd, 2), usd(cp, 2)])], ["Our preferred: par value", usd(par, 2)], ["Our preferred: dividend rate", pc(rate)]],
        a, "$", 2,
        [`Rendement exigé (comparable) = ${F(cd)} / ${F(cp)} = ${P(r)}.`, `Dp = ${P(rate)} × ${D(par)} = ${D(dp, 2)}.`, `V0 = ${F(dp)} / ${F(r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const dp = 5, r = 0.08, firstYear = 3;
      const vAtT = preferredValue(dp, r);
      const a = pv(vAtT, r, firstYear - 1);
      return q("eq-pref-d5", "difficile", "Value today of a preferred share whose first dividend is paid at the end of year 3?",
        [["Annual preferred dividend (perpetual, from year 3)", usd(dp, 2)], ["Required return", pc(r)]],
        a, "$", 2,
        [`La perpétuité vaut Dp / rp un an avant le premier dividende, soit à la fin de l'année 2 : ${F(dp)} / ${F(r)} = ${D(vAtT, 2)}.`,
          `V0 = ${F(vAtT, 2)} / ${pw(r, 2)} = ${D(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 13 · Modèle de Gordon ────────────────────────── */

const GORDON: CalcType = {
  key: "gordon-growth",
  topic: "equity",
  name: "Modèle de Gordon (constant growth DDM)",
  tier: "essentiel",
  source: "LM 8 · Equity Valuation: Concepts and Basic Tools",
  formulas: [
    "V0 = D1 / (r − g) avec D1 = D0 × (1 + g)",
    "Taux exigé implicite : r = D1 / P0 + g",
    "Croissance implicite : g = r − D1 / P0",
    "Valeur future : Pn = D(n+1) / (r − g)",
  ],
  traps: [
    "Le modèle exige r > g.",
    "D0 (« just paid ») se capitalise d'une année avant de diviser par (r − g).",
  ],
  questions: [
    (() => {
      const d1 = 2, r = 0.1, g = 0.05;
      const a = gordon(d1, r, g);
      return q("eq-ggm-f1", "facile", "Value of the stock?",
        [["Expected dividend next year (D1)", usd(d1, 2)], ["Required return", pc(r)], ["Constant growth rate", pc(g)]],
        a, "$", 2,
        ["V0 = D1 / (r − g).", `= ${F(d1, 2)} / (${F(r)} − ${F(g)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d0 = 1.5, g = 0.08, r = 0.12;
      const d1 = d0 * (1 + g);
      const a = gordon(d1, r, g);
      return q("eq-ggm-f2", "facile", "Value of the stock?",
        [["Dividend just paid (D0)", usd(d0, 2)], ["Constant growth rate", pc(g)], ["Required return", pc(r)]],
        a, "$", 2,
        [`D1 = ${F(d0, 2)} × ${F(1 + g)} = ${D(d1, 2)}.`, `V0 = ${F(d1, 2)} / (${F(r)} − ${F(g)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d1 = 1.6, p0 = 40, g = 0.09;
      const a = impliedReturn(d1, p0, g) * 100;
      return q("eq-ggm-f3", "facile", "Required return implied by the price?",
        [["Expected dividend next year (D1)", usd(d1, 2)], ["Share price", usd(p0, 2)], ["Constant growth rate", pc(g)]],
        a, "%", 2,
        ["r = D1 / P0 + g.", `= ${F(d1, 2)} / ${F(p0)} + ${P(g)} = ${P(d1 / p0)} + ${P(g)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const p0 = 50, d1 = 2, r = 0.1;
      const a = (r - d1 / p0) * 100;
      return q("eq-ggm-f4", "facile", "Growth rate implied by the price?",
        [["Share price", usd(p0, 2)], ["Expected dividend next year (D1)", usd(d1, 2)], ["Required return", pc(r)]],
        a, "%", 2,
        ["g = r − D1 / P0.", `= ${P(r)} − ${F(d1)} / ${F(p0)} = ${P(r)} − ${P(d1 / p0)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const d = 1.15, r = 0.095;
      const a = gordon(d, r, 0);
      return q("eq-ggm-f5", "facile", "Value of a stock whose dividend stays constant forever?",
        [["Annual dividend", usd(d, 2)], ["Required return", pc(r)]],
        a, "$", 2,
        ["Avec g = 0, Gordon devient une perpétuité : V0 = D / r.", `= ${F(d, 2)} / ${F(r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const e1 = 4.5, payout = 0.5, r = 0.12, g = 0.06;
      const d1 = e1 * payout;
      const a = gordon(d1, r, g);
      return q("eq-ggm-m1", "moyen", "Value of the stock?",
        [["Expected EPS next year", usd(e1, 2)], ["Payout ratio", pc(payout)], ["Required return", pc(r)], ["Constant growth rate", pc(g)]],
        a, "$", 2,
        [`D1 = ${P(payout)} × ${F(e1, 2)} = ${D(d1, 2)}.`, `V0 = ${F(d1, 2)} / (${F(r)} − ${F(g)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d0 = 6.25, g = 0.07, r = 0.12;
      const d3 = d0 * Math.pow(1 + g, 3);
      const a = gordon(d3, r, g);
      return q("eq-ggm-m2", "moyen", "Expected price of the stock two years from now?",
        [["Dividend just paid (D0)", usd(d0, 2)], ["Constant growth rate", pc(g)], ["Required return", pc(r)]],
        a, "$", 2,
        ["P2 = D3 / (r − g).", `D3 = ${F(d0, 2)} × ${pw(g, 3)} = ${D(d3, 4)}.`, `P2 = ${F(d3, 4)} / (${F(r)} − ${F(g)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d0 = 1.5, g = 0.08, r = 0.12;
      const vG = gordon(d0 * (1 + g), r, g), v0 = d0 / r;
      const a = vG - v0;
      return q("eq-ggm-m3", "moyen", "Part of the stock's value due to dividend growth?",
        [["Dividend just paid (D0)", usd(d0, 2)], ["Constant growth rate", pc(g)], ["Required return", pc(r)]],
        a, "$", 2,
        [`Avec croissance : ${F(d0 * (1 + g), 2)} / (${F(r)} − ${F(g)}) = ${D(vG, 2)}.`,
          `Sans croissance : ${F(d0, 2)} / ${F(r)} = ${D(v0, 2)}.`,
          `Part due à la croissance = ${F(vG, 2)} − ${F(v0, 2)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d0 = 2, p0 = 50, g = 0.04;
      const d1 = d0 * (1 + g);
      const a = impliedReturn(d1, p0, g) * 100;
      return q("eq-ggm-m4", "moyen", "Required return implied by the price?",
        [["Dividend just paid (D0)", usd(d0, 2)], ["Share price", usd(p0, 2)], ["Constant growth rate", pc(g)]],
        a, "%", 2,
        [`D1 = ${F(d0, 2)} × ${F(1 + g)} = ${D(d1, 2)}.`, `r = ${F(d1, 2)} / ${F(p0)} + ${P(g)} = ${P(d1 / p0, 2)} + ${P(g)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const d0 = 2, g = 0.05, rf = 0.05, rm = 0.12, beta = 1.5;
      const r = capm(rf, beta, rm), d1 = d0 * (1 + g);
      const a = gordon(d1, r, g);
      return q("eq-ggm-m5", "moyen", "Value of the stock?",
        [["Dividend just paid (D0)", usd(d0, 2)], ["Constant growth rate", pc(g)], ["Risk-free rate / expected market return", lst([pc(rf), pc(rm)])], ["Beta", E(beta)]],
        a, "$", 2,
        [`r = ${P(rf)} + ${F(beta)} × (${P(rm)} − ${P(rf)}) = ${P(r)}.`, `D1 = ${F(d0, 2)} × ${F(1 + g)} = ${D(d1, 2)}.`, `V0 = ${F(d1, 2)} / (${F(r)} − ${F(g)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d0 = 1.5, payout = 0.4, roe = 0.12, r = 0.15;
      const g = sustainableGrowth(1 - payout, roe), d1 = d0 * (1 + g);
      const a = gordon(d1, r, g);
      return q("eq-ggm-d1", "difficile", "Value of the stock?",
        [["Dividend just paid (D0)", usd(d0, 2)], ["Payout ratio", pc(payout)], ["ROE", pc(roe)], ["Required return", pc(r)]],
        a, "$", 2,
        [`g = (1 − ${F(payout)}) × ${P(roe)} = ${P(g)}.`, `D1 = ${F(d0, 2)} × ${F(1 + g)} = ${D(d1, 3)}.`, `V0 = ${F(d1, 3)} / (${F(r)} − ${F(g)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d1 = 3, r = 0.1, g0 = 0.06, g1 = 0.05;
      const v0 = gordon(d1, r, g0), v1 = gordon(d1, r, g1);
      const a = (v1 / v0 - 1) * 100;
      return q("eq-ggm-d2", "difficile", "Percentage change in value if expected growth falls?",
        [["Expected dividend next year (D1, unchanged)", usd(d1, 2)], ["Required return", pc(r)], ["Growth rate", `${pc(g0)} → ${pc(g1)}`]],
        a, "%", 2,
        [`Avant : ${F(d1)} / (${F(r)} − ${F(g0)}) = ${D(v0, 2)}.`, `Après : ${F(d1)} / (${F(r)} − ${F(g1)}) = ${D(v1, 2)}.`,
          `Variation = ${F(v1)} / ${F(v0)} − 1 = ${Pa(a)} : un point de croissance en moins coûte un cinquième de la valeur.`]);
    })(),
    (() => {
      const p0 = 40, d0 = 1.8, r = 0.11;
      const a = impliedGrowthD0(d0, p0, r) * 100;
      return q("eq-ggm-d3", "difficile", "Constant growth rate implied by the price?",
        [["Share price", usd(p0, 2)], ["Dividend just paid (D0)", usd(d0, 2)], ["Required return", pc(r)]],
        a, "%", 2,
        [`${F(p0)} = ${F(d0, 2)} × (1 + g) / (${F(r)} − g).`,
          `${F(p0 * r)} − ${F(p0)}g = ${F(d0, 2)} + ${F(d0, 2)}g, donc ${F(p0 + d0)}g = ${F(p0 * r - d0)}.`,
          `g = ${F(p0 * r - d0)} / ${F(p0 + d0)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const p0 = 25, e1 = 2.5, payout = 0.4, roe = 0.15;
      const d1 = e1 * payout, g = sustainableGrowth(1 - payout, roe);
      const a = impliedReturn(d1, p0, g) * 100;
      return q("eq-ggm-d4", "difficile", "Required return implied by the price?",
        [["Share price", usd(p0, 2)], ["Expected EPS next year", usd(e1, 2)], ["Payout ratio", pc(payout)], ["ROE", pc(roe)]],
        a, "%", 2,
        [`D1 = ${P(payout)} × ${F(e1, 2)} = ${D(d1, 2)}.`, `g = (1 − ${F(payout)}) × ${P(roe)} = ${P(g)}.`, `r = ${F(d1, 2)} / ${F(p0)} + ${P(g)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const eps0 = 3, payout = 0.45, g = 0.05, y = 0.06, prem = 0.04;
      const d0 = eps0 * payout, d1 = d0 * (1 + g), r = y + prem;
      const a = gordon(d1, r, g);
      return q("eq-ggm-d5", "difficile", "Value of the stock?",
        [["EPS just reported (E0)", usd(eps0, 2)], ["Payout ratio", pc(payout)], ["Constant growth rate", pc(g)],
          ["Yield on the company's bonds", pc(y)], ["Equity risk premium over the bonds", pc(prem)]],
        a, "$", 2,
        [`D0 = ${P(payout)} × ${F(eps0, 2)} = ${D(d0, 2)} ; D1 = ${F(d0, 2)} × ${F(1 + g)} = ${D(d1, 4)}.`,
          `r = ${P(y)} + ${P(prem)} = ${P(r)}.`,
          `V0 = ${F(d1, 4)} / (${F(r)} − ${F(g)}) = ${D(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 14 · Croissance soutenable ────────────────────────── */

const SUSTAINABLE_GROWTH: CalcType = {
  key: "sustainable-growth",
  topic: "equity",
  name: "Croissance soutenable g = b × ROE",
  tier: "essentiel",
  source: "LM 8 · Equity Valuation: Concepts and Basic Tools",
  formulas: [
    "g = b × ROE avec b = taux de rétention = 1 − taux de distribution (payout)",
    "Payout = dividendes / résultat net = DPS / EPS",
    "ROE (DuPont) = marge nette × rotation des actifs × levier financier (equity multiplier)",
  ],
  traps: [
    "On multiplie le ROE par la rétention, pas par le payout.",
    "Le bêta et le taux exigé n'interviennent pas dans g.",
  ],
  questions: [
    (() => {
      const roe = 0.21, payout = 0.25;
      const a = sustainableGrowth(1 - payout, roe) * 100;
      return q("eq-sgr-f1", "facile", "Sustainable growth rate?",
        [["ROE", pc(roe)], ["Dividend payout ratio", pc(payout)]],
        a, "%", 2,
        [`Rétention b = 1 − ${F(payout)} = ${F(1 - payout)}.`, `g = ${F(1 - payout)} × ${P(roe)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const roe = 0.15, b = 0.4;
      const a = sustainableGrowth(b, roe) * 100;
      return q("eq-sgr-f2", "facile", "Sustainable growth rate?",
        [["ROE", pc(roe)], ["Retention rate", pc(b)]],
        a, "%", 2,
        ["g = b × ROE.", `= ${F(b)} × ${P(roe)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const eps = 4, dps = 1.4;
      const a = (1 - dps / eps) * 100;
      return q("eq-sgr-f3", "facile", "Earnings retention rate?",
        [["EPS", usd(eps, 2)], ["Dividend per share", usd(dps, 2)]],
        a, "%", 2,
        [`Payout = ${F(dps, 2)} / ${F(eps, 2)} = ${P(dps / eps)}.`, `Rétention = 100% − ${P(dps / eps)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const g = 0.12, payout = 0.3;
      const a = (g / (1 - payout)) * 100;
      return q("eq-sgr-f4", "facile", "ROE implied by the growth rate?",
        [["Sustainable growth rate", pc(g)], ["Dividend payout ratio", pc(payout)]],
        a, "%", 2,
        ["g = b × ROE, donc ROE = g / b avec b = 1 − payout.", `ROE = ${P(g)} / ${F(1 - payout)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const bv0 = 800, retained = 72;
      const a = (retained / bv0) * 100;
      return q("eq-sgr-f5", "facile", "Growth rate of book equity from retained earnings? (No new shares.)",
        [["Beginning equity ($ millions)", E(bv0)], ["Earnings retained this year ($ millions)", E(retained)]],
        a, "%", 2,
        ["Sans émission d'actions, les capitaux propres ne croissent que par le résultat mis en réserve : g = résultat retenu / CP de début (= b × ROE).",
          `g = ${F(retained)} / ${F(bv0)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const margin = 0.1, turn = 2, lev = 1.5, payout = 0.4;
      const roe = margin * turn * lev;
      const a = sustainableGrowth(1 - payout, roe) * 100;
      return q("eq-sgr-m1", "moyen", "Sustainable growth rate?",
        [["Net profit margin", pc(margin)], ["Total asset turnover", mx(turn)], ["Financial leverage (assets / equity)", mx(lev)], ["Dividend payout ratio", pc(payout)]],
        a, "%", 2,
        [`ROE = ${P(margin)} × ${F(turn)} × ${F(lev)} = ${P(roe)}.`, `g = (1 − ${F(payout)}) × ${P(roe)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const ni = 1000, eq = 5000, payout = 0.4;
      const roe = ni / eq;
      const a = sustainableGrowth(1 - payout, roe) * 100;
      return q("eq-sgr-m2", "moyen", "Sustainable growth rate?",
        [["Net income ($ thousands)", E(ni)], ["Total equity ($ thousands)", E(eq)], ["Dividend payout ratio", pc(payout)]],
        a, "%", 2,
        [`ROE = ${F(ni)} / ${F(eq)} = ${P(roe)}.`, `g = (1 − ${F(payout)}) × ${P(roe)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const ni = 16.68, eq = 115, div = 7.5;
      const roe = ni / eq, b = (ni - div) / ni;
      const a = sustainableGrowth(b, roe) * 100;
      return q("eq-sgr-m3", "moyen", "Sustainable growth rate?",
        [["Net income ($ millions)", E(ni)], ["Equity ($ millions)", E(eq)], ["Dividends declared ($ millions)", E(div)]],
        a, "%", 2,
        [`ROE = ${F(ni)} / ${F(eq)} = ${P(roe, 2)}.`, `b = (${F(ni)} − ${F(div)}) / ${F(ni)} = ${P(b, 2)}.`, `g = ${F(b, 4)} × ${P(roe, 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const roe = 0.18, g = 0.09;
      const a = (1 - g / roe) * 100;
      return q("eq-sgr-m4", "moyen", "Dividend payout ratio consistent with the growth rate?",
        [["ROE", pc(roe)], ["Sustainable growth rate", pc(g)]],
        a, "%", 2,
        [`b = g / ROE = ${P(g)} / ${P(roe)} = ${F(g / roe)}.`, `Payout = 1 − ${F(g / roe)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const ni = 240, bv0 = 1600, div = 96;
      const roe = ni / bv0, b = 1 - div / ni;
      const a = sustainableGrowth(b, roe) * 100;
      return q("eq-sgr-m5", "moyen", "Sustainable growth rate (ROE on beginning equity)?",
        [["Net income ($ millions)", E(ni)], ["Beginning equity ($ millions)", E(bv0)], ["Dividends ($ millions)", E(div)]],
        a, "%", 2,
        [`ROE = ${F(ni)} / ${F(bv0)} = ${P(roe)} ; b = 1 − ${F(div)} / ${F(ni)} = ${P(b)}.`, `g = ${F(b)} × ${P(roe)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const margin = 0.06, turn = 1.25, lev = 2.4, eps = 2.25, dps = 0.9, beta = 1.1;
      const roe = margin * turn * lev, b = 1 - dps / eps;
      const a = sustainableGrowth(b, roe) * 100;
      return q("eq-sgr-d1", "difficile", "Sustainable growth rate?",
        [["Net profit margin", pc(margin)], ["Total asset turnover", mx(turn)], ["Equity multiplier", mx(lev)],
          ["EPS / DPS", lst([usd(eps, 2), usd(dps, 2)])], ["Beta", E(beta)]],
        a, "%", 2,
        ["Le bêta ne sert à rien pour g : donnée-piège.",
          `ROE = ${P(margin)} × ${F(turn)} × ${F(lev)} = ${P(roe)}.`,
          `b = 1 − ${F(dps, 2)} / ${F(eps, 2)} = ${P(b)}.`,
          `g = ${F(b)} × ${P(roe)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const d0 = 1, payout = 0.4, roe = 0.1, r = 0.09;
      const g = sustainableGrowth(1 - payout, roe), d1 = d0 * (1 + g);
      const a = gordon(d1, r, g);
      return q("eq-sgr-d2", "difficile", "Value of the stock (constant growth model)?",
        [["Dividend just paid", usd(d0, 2)], ["Payout ratio (constant)", pc(payout)], ["Expected ROE", pc(roe)], ["Required return", pc(r)]],
        a, "$", 2,
        [`g = (1 − ${F(payout)}) × ${P(roe)} = ${P(g)}.`, `D1 = ${F(d0, 2)} × ${F(1 + g)} = ${D(d1, 2)}.`, `V0 = ${F(d1, 2)} / (${F(r)} − ${F(g)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const roe = 0.16, p0 = 0.3, p1 = 0.5;
      const g0 = sustainableGrowth(1 - p0, roe), g1 = sustainableGrowth(1 - p1, roe);
      const a = (g1 - g0) * 10000;
      return q("eq-sgr-d3", "difficile", "Change in the sustainable growth rate, in basis points?",
        [["ROE (unchanged)", pc(roe)], ["Payout ratio", `${pc(p0)} → ${pc(p1)}`]],
        a, "bp", 0,
        [`Avant : g = ${F(1 - p0)} × ${P(roe)} = ${P(g0)}.`, `Après : g = ${F(1 - p1)} × ${P(roe)} = ${P(g1)}.`, `Variation = ${P(g1)} − ${P(g0)} = ${F(a, 0)} bp.`]);
    })(),
    (() => {
      const g = 0.09, eps = 5, dps = 2;
      const b = 1 - dps / eps;
      const a = (g / b) * 100;
      return q("eq-sgr-d4", "difficile", "ROE needed to sustain the target growth rate?",
        [["Target growth rate", pc(g)], ["EPS / DPS", lst([usd(eps, 2), usd(dps, 2)])]],
        a, "%", 2,
        [`b = 1 − ${F(dps)} / ${F(eps)} = ${P(b)}.`, `ROE = g / b = ${P(g)} / ${F(b)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const p0 = 30, e1 = 3, r = 0.12, roe = 0.15;
      const a = ((p0 * (r - roe)) / (e1 - p0 * roe)) * 100;
      return q("eq-sgr-d5", "difficile", "Payout ratio consistent with the price (constant growth model)?",
        [["Share price", usd(p0, 2)], ["Expected EPS next year", usd(e1, 2)], ["Required return", pc(r)], ["ROE", pc(roe)]],
        a, "%", 2,
        [`P0 = payout × E1 / (r − (1 − payout) × ROE), avec payout = p.`,
          `${F(p0)} × (${F(r)} − ${F(roe)} + ${F(roe)}p) = ${F(e1)}p, soit ${F(p0 * (r - roe), 2)} + ${F(p0 * roe, 2)}p = ${F(e1)}p.`,
          `p = ${F(p0 * (roe - r), 2)} / (${F(p0 * roe, 2)} − ${F(e1)}) = ${Pa(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 15 · DDM multi-étapes ────────────────────────── */

const MULTISTAGE: CalcType = {
  key: "multistage-ddm",
  topic: "equity",
  name: "DDM multi-étapes (multistage)",
  tier: "essentiel",
  source: "LM 8 · Equity Valuation: Concepts and Basic Tools",
  formulas: [
    "Forte croissance : Dt = D0 × (1 + g*)^t",
    "Valeur terminale : Pn = D(n+1) / (r − gc), à la fin de la phase de forte croissance",
    "V0 = Σ Dt / (1 + r)^t + Pn / (1 + r)^n",
  ],
  traps: [
    "Pn utilise D(n+1), le premier dividende de la phase stable.",
    "Pn s'actualise sur n années, pas n + 1.",
  ],
  questions: [
    (() => {
      const d0 = 1, g = 0.15;
      const a = d0 * Math.pow(1 + g, 2);
      return q("eq-multi-f1", "facile", "Expected dividend at the end of year 2?",
        [["Dividend just paid (D0)", usd(d0, 2)], ["Growth rate for the next two years", pc(g)]],
        a, "$", 2,
        ["D2 = D0 × (1 + g)².", `= ${F(d0, 2)} × ${pw(g, 2)} = ${D(a, 4)}.`, `Arrondi : ${D(a, 2)}.`]);
    })(),
    (() => {
      const d3 = 1.4, r = 0.11, gc = 0.05;
      const a = gordon(d3, r, gc);
      return q("eq-multi-f2", "facile", "Terminal value at the end of year 2?",
        [["Expected dividend in year 3 (D3)", usd(d3, 2)], ["Required return", pc(r)], ["Constant growth from year 3", pc(gc)]],
        a, "$", 2,
        ["P2 = D3 / (r − gc).", `= ${F(d3, 2)} / (${F(r)} − ${F(gc)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const p3 = 40, r = 0.1;
      const a = pv(p3, r, 3);
      return q("eq-multi-f3", "facile", "Present value of the terminal value?",
        [["Terminal value at the end of year 3 (P3)", usd(p3, 2)], ["Required return", pc(r)]],
        a, "$", 2,
        ["P3 s'actualise sur 3 ans.", `PV = ${F(p3)} / ${pw(r, 3)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d2 = 1.6, gc = 0.06;
      const a = d2 * (1 + gc);
      return q("eq-multi-f4", "facile", "First dividend of the constant-growth stage (D3)?",
        [["Dividend in year 2 (end of high growth)", usd(d2, 2)], ["Constant growth from year 3", pc(gc)]],
        a, "$", 2,
        ["D3 = D2 × (1 + gc).", `= ${F(d2, 2)} × ${F(1 + gc)} = ${D(a, 3)}, soit ${D(a, 2)}.`]);
    })(),
    (() => {
      const d = [1.25, 1.56], r = 0.11;
      const a = pvSeries(d, r);
      return q("eq-multi-f5", "facile", "Present value of the dividends in years 1 and 2?",
        [["Expected dividends years 1 / 2", lst(d.map((x) => usd(x, 2)))], ["Required return", pc(r)]],
        a, "$", 2,
        [`PV = ${F(d[0], 2)} / ${pw(r, 1)} + ${F(d[1], 2)} / ${pw(r, 2)}.`, `= ${F(pv(d[0], r, 1), 4)} + ${F(pv(d[1], r, 2), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d0 = 1, gh = 0.15, gc = 0.05, r = 0.11;
      const d = grow(d0, [gh, gh]), d3 = d[1] * (1 + gc), p2 = gordon(d3, r, gc);
      const a = pvSeries(d, r) + pv(p2, r, 2);
      return q("eq-multi-m1", "moyen", "Value of the stock (two-stage DDM)?",
        [["Dividend just paid (D0)", usd(d0, 2)], ["High growth for years 1 and 2", pc(gh)], ["Constant growth afterwards", pc(gc)], ["Required return", pc(r)]],
        a, "$", 2,
        [`D1 = ${F(d[0])} ; D2 = ${F(d[1])} ; D3 = ${F(d[1])} × ${F(1 + gc)} = ${F(d3)}.`,
          `P2 = ${F(d3)} / (${F(r)} − ${F(gc)}) = ${F(p2, 3)}.`,
          `V0 = ${F(d[0])} / ${pw(r, 1)} + (${F(d[1])} + ${F(p2, 3)}) / ${pw(r, 2)}.`,
          `V0 = ${F(pv(d[0], r, 1), 3)} + ${F(pv(d[1] + p2, r, 2), 3)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d = [1.25, 1.56], gc = 0.05, r = 0.11;
      const p2 = gordon(d[1] * (1 + gc), r, gc);
      const a = pvSeries(d, r) + pv(p2, r, 2);
      return q("eq-multi-m2", "moyen", "Value of the stock?",
        [["Expected dividends years 1 / 2", lst(d.map((x) => usd(x, 2)))], ["Constant growth from year 3", pc(gc)], ["Required return", pc(r)]],
        a, "$", 2,
        [`D3 = ${F(d[1], 2)} × ${F(1 + gc)} = ${F(d[1] * (1 + gc), 3)} ; P2 = ${F(d[1] * (1 + gc), 3)} / (${F(r)} − ${F(gc)}) = ${F(p2, 2)}.`,
          `V0 = ${F(d[0], 2)} / ${pw(r, 1)} + (${F(d[1], 2)} + ${F(p2, 2)}) / ${pw(r, 2)}.`,
          `= ${F(pv(d[0], r, 1), 2)} + ${F(pv(d[1] + p2, r, 2), 2)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const e4 = 1.64, payout = 0.5, gc = 0.05, r = 0.1;
      const d4 = e4 * payout, p3 = gordon(d4, r, gc);
      const a = pv(p3, r, 3);
      return q("eq-multi-m3", "moyen", "Value today of a stock that pays its first dividend at the end of year 4?",
        [["Expected EPS in year 4", usd(e4, 2)], ["Payout ratio from year 4", pc(payout)], ["Constant growth from year 4", pc(gc)], ["Required return", pc(r)]],
        a, "$", 2,
        [`D4 = ${P(payout)} × ${F(e4, 2)} = ${D(d4, 2)}.`, `P3 = D4 / (r − g) = ${F(d4, 2)} / (${F(r)} − ${F(gc)}) = ${D(p3, 2)}.`, `V0 = ${F(p3, 2)} / ${pw(r, 3)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d3 = 1, gc = 0.07, r = 0.12;
      const p2 = gordon(d3, r, gc);
      const a = pv(p2, r, 2);
      return q("eq-multi-m4", "moyen", "Value today? (No dividends in years 1 and 2.)",
        [["First dividend, end of year 3", usd(d3, 2)], ["Constant growth afterwards", pc(gc)], ["Required return", pc(r)]],
        a, "$", 2,
        [`P2 = D3 / (r − g) = ${F(d3, 2)} / (${F(r)} − ${F(gc)}) = ${D(p2, 2)}.`, `V0 = ${F(p2)} / ${pw(r, 2)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d0 = 1, gh = 0.25, gc = 0.06, r = 0.1;
      const d = grow(d0, [gh, gh]), d3 = d[1] * (1 + gc);
      const a = gordon(d3, r, gc);
      return q("eq-multi-m5", "moyen", "Terminal value at the end of the high-growth period (end of year 2)?",
        [["Dividend just paid (D0)", usd(d0, 2)], ["High growth for years 1 and 2", pc(gh)], ["Constant growth afterwards", pc(gc)], ["Required return", pc(r)]],
        a, "$", 2,
        [`D2 = ${F(d0, 2)} × ${pw(gh, 2)} = ${F(d[1], 4)}.`, `D3 = ${F(d[1], 4)} × ${F(1 + gc)} = ${F(d3, 5)}.`, `P2 = ${F(d3, 5)} / (${F(r)} − ${F(gc)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d0 = 2, gs = [0.25, 0.25, 0.2], gc = 0.05, r = 0.12;
      const d = grow(d0, gs), d4 = d[2] * (1 + gc), p3 = gordon(d4, r, gc);
      const a = pvSeries(d, r) + pv(p3, r, 3);
      return q("eq-multi-d1", "difficile", "Value of the stock (three-stage growth)?",
        [["Dividend just paid (D0)", usd(d0, 2)], ["Growth years 1 and 2", pc(gs[0])], ["Growth year 3", pc(gs[2])], ["Constant growth from year 4", pc(gc)], ["Required return", pc(r)]],
        a, "$", 2,
        [`D1 = ${F(d[0], 4)} ; D2 = ${F(d[1], 4)} ; D3 = ${F(d[1], 4)} × ${F(1 + gs[2])} = ${F(d[2], 4)}.`,
          `D4 = ${F(d[2], 4)} × ${F(1 + gc)} = ${F(d4, 4)} ; P3 = ${F(d4, 4)} / (${F(r)} − ${F(gc)}) = ${F(p3, 2)}.`,
          `V0 = ${F(pv(d[0], r, 1), 2)} + ${F(pv(d[1], r, 2), 2)} + (${F(d[2], 2)} + ${F(p3, 2)}) / ${pw(r, 3)}.`,
          `V0 = ${F(pv(d[0], r, 1), 2)} + ${F(pv(d[1], r, 2), 2)} + ${F(pv(d[2] + p3, r, 3), 2)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d0 = 0.75, gs = [0.25, -0.05], gc = 0.05, r = 0.12;
      const d = grow(d0, gs), d3 = d[1] * (1 + gc), p2 = gordon(d3, r, gc);
      const a = pvSeries(d, r) + pv(p2, r, 2);
      return q("eq-multi-d2", "difficile", "Value of the stock?",
        [["Dividend just paid (D0)", usd(d0, 2)], ["Dividend growth year 1 / year 2", lst([spc(gs[0]), spc(gs[1])])], ["Constant growth from year 3", pc(gc)], ["Required return", pc(r)]],
        a, "$", 2,
        [`D1 = ${F(d0, 2)} × ${F(1 + gs[0])} = ${F(d[0], 4)} ; D2 = ${F(d[0], 4)} × ${F(1 + gs[1])} = ${F(d[1], 6)}.`,
          `D3 = ${F(d[1], 6)} × ${F(1 + gc)} = ${F(d3, 4)} ; P2 = ${F(d3, 4)} / (${F(r)} − ${F(gc)}) = ${F(p2, 2)}.`,
          `V0 = ${F(pv(d[0], r, 1), 2)} + (${F(d[1], 4)} + ${F(p2, 2)}) / ${pw(r, 2)} = ${F(pv(d[0], r, 1), 2)} + ${F(pv(d[1] + p2, r, 2), 2)}.`,
          `V0 = ${D(a, 2)}.`]);
    })(),
    (() => {
      const e0 = 2, gh = 0.2, years = 3, payout = 0.6, gc = 0.05, r = 0.11;
      const e3 = e0 * Math.pow(1 + gh, years), e4 = e3 * (1 + gc), d4 = e4 * payout, p3 = gordon(d4, r, gc);
      const a = pv(p3, r, 3);
      return q("eq-multi-d3", "difficile", "Value of the stock today?",
        [["EPS just reported (E0)", usd(e0, 2)], ["Earnings growth years 1 to 3 (all earnings retained)", pc(gh)],
          ["From year 4: payout ratio", pc(payout)], ["From year 4: constant growth", pc(gc)], ["Required return", pc(r)]],
        a, "$", 2,
        [`Aucun dividende avant l'année 4. E3 = ${F(e0, 2)} × ${pw(gh, 3)} = ${F(e3, 3)} ; E4 = ${F(e3, 3)} × ${F(1 + gc)} = ${F(e4, 4)}.`,
          `D4 = ${P(payout)} × ${F(e4, 4)} = ${F(d4, 4)}.`,
          `P3 = ${F(d4, 4)} / (${F(r)} − ${F(gc)}) = ${F(p3, 2)}.`,
          `V0 = ${F(p3, 2)} / ${pw(r, 3)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d0 = 2, gh = 0.1, gc = 0.04, r = 0.09;
      const d = grow(d0, [gh, gh, gh]), d4 = d[2] * (1 + gc), p3 = gordon(d4, r, gc);
      const a = pv(d[1], r, 1) + pv(d[2] + p3, r, 2);
      return q("eq-multi-d4", "difficile", "Expected value of the stock one year from now (just after D1 is paid)?",
        [["Dividend just paid (D0)", usd(d0, 2)], ["High growth for years 1 to 3", pc(gh)], ["Constant growth from year 4", pc(gc)], ["Required return", pc(r)]],
        a, "$", 2,
        [`D1 = ${F(d[0], 3)} ; D2 = ${F(d[1], 3)} ; D3 = ${F(d[2], 3)} ; D4 = ${F(d[2], 3)} × ${F(1 + gc)} = ${F(d4, 5)}.`,
          `P3 = ${F(d4, 5)} / (${F(r)} − ${F(gc)}) = ${F(p3, 4)}.`,
          `À la date 1, il reste D2, D3 et P3 : V1 = ${F(d[1], 3)} / ${pw(r, 1)} + (${F(d[2], 3)} + ${F(p3, 4)}) / ${pw(r, 2)}.`,
          `V1 = ${F(pv(d[1], r, 1), 2)} + ${F(pv(d[2] + p3, r, 2), 2)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d1 = 2.25, gh = 0.2, gc = 0.05, r = 0.12;
      const d2 = d1 * (1 + gh), d3 = d2 * (1 + gh), d4 = d3 * (1 + gc), p3 = gordon(d4, r, gc);
      const a = pvSeries([d1, d2, d3], r) + pv(p3, r, 3);
      return q("eq-multi-d5", "difficile", "Value of the stock today?",
        [["Dividend to be paid at the end of this year (D1)", usd(d1, 2)], ["Dividend growth in years 2 and 3", pc(gh)], ["Constant growth from year 4", pc(gc)], ["Required return", pc(r)]],
        a, "$", 2,
        [`Attention, le dividende donné est déjà D1. D2 = ${F(d1, 2)} × ${F(1 + gh)} = ${F(d2, 2)} ; D3 = ${F(d2, 2)} × ${F(1 + gh)} = ${F(d3, 2)}.`,
          `D4 = ${F(d3, 2)} × ${F(1 + gc)} = ${F(d4, 3)} ; P3 = ${F(d4, 3)} / (${F(r)} − ${F(gc)}) = ${F(p3, 2)}.`,
          `V0 = ${F(pv(d1, r, 1), 2)} + ${F(pv(d2, r, 2), 2)} + (${F(d3, 2)} + ${F(p3, 2)}) / ${pw(r, 3)}.`,
          `V0 = ${F(pv(d1, r, 1), 2)} + ${F(pv(d2, r, 2), 2)} + ${F(pv(d3 + p3, r, 3), 2)} = ${D(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 16 · P/E justifié ────────────────────────── */

const JUSTIFIED_PE: CalcType = {
  key: "justified-pe",
  topic: "equity",
  name: "P/E justifié (justified leading / trailing P/E)",
  tier: "essentiel",
  source: "LM 8 · Equity Valuation: Concepts and Basic Tools",
  formulas: [
    "P/E justifié leading : P0 / E1 = (D1 / E1) / (r − g) = payout / (r − g)",
    "P/E justifié trailing : P0 / E0 = payout × (1 + g) / (r − g)",
    "g = b × ROE ; r par le CAPM si besoin",
  ],
  traps: [
    "Leading divise par E1, trailing par E0 : le trailing ajoute le facteur (1 + g).",
    "Le numérateur est le payout (D/E), pas la rétention.",
  ],
  questions: [
    (() => {
      const payout = 0.3, r = 0.13, g = 0.06;
      const a = leadingPE(payout, r, g);
      return q("eq-jpe-f1", "facile", "Justified leading P/E?",
        [["Expected payout ratio", pc(payout)], ["Required return", pc(r)], ["Expected growth rate", pc(g)]],
        a, "x", 2,
        ["P0 / E1 = payout / (r − g).", `= ${F(payout)} / (${F(r)} − ${F(g)}) = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const pe = 9, r = 0.15, g = 0.1;
      const a = pe * (r - g) * 100;
      return q("eq-jpe-f2", "facile", "Payout ratio consistent with the justified leading P/E?",
        [["Justified leading P/E", mx(pe)], ["Required return", pc(r)], ["Constant growth rate", pc(g)]],
        a, "%", 2,
        ["P/E = payout / (r − g), donc payout = P/E × (r − g).", `Payout = ${F(pe)} × (${P(r)} − ${P(g)}) = ${Pa(a)}.`]);
    })(),
    (() => {
      const b = 0, r = 0.08;
      const a = leadingPE(1 - b, r, 0);
      return q("eq-jpe-f3", "facile", "Justified leading P/E of a firm that pays out all its earnings?",
        [["Earnings retention rate", pc(b)], ["Required return", pc(r)]],
        a, "x", 2,
        ["Rétention nulle : g = 0 × ROE = 0 et payout = 100%, donc P/E = 1 / r.", `P/E = 1 / ${F(r)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const payout = 0.5, r = 0.12, g = 0.06;
      const a = trailingPE(payout, r, g);
      return q("eq-jpe-f4", "facile", "Justified trailing P/E?",
        [["Payout ratio", pc(payout)], ["Required return", pc(r)], ["Constant growth rate", pc(g)]],
        a, "x", 2,
        ["P0 / E0 = payout × (1 + g) / (r − g).", `= ${F(payout)} × ${F(1 + g)} / (${F(r)} − ${F(g)}) = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const pe = 12.5, e1 = 3.2;
      const a = pe * e1;
      return q("eq-jpe-f5", "facile", "Value per share implied by the justified leading P/E?",
        [["Justified leading P/E", mx(pe)], ["Expected EPS next year (E1)", usd(e1, 2)]],
        a, "$", 2,
        ["Valeur = P/E leading × E1.", `= ${F(pe)} × ${F(e1, 2)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const b = 0.6, r = 0.14, g = 0.05;
      const payout = 1 - b;
      const a = leadingPE(payout, r, g);
      return q("eq-jpe-m1", "moyen", "Justified leading P/E?",
        [["Earnings retention rate", pc(b)], ["Required return", pc(r)], ["Constant growth rate", pc(g)]],
        a, "x", 2,
        [`Payout = 1 − ${F(b)} = ${F(payout)}.`, `P0 / E1 = ${F(payout)} / (${F(r)} − ${F(g)}) = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const beta = 1.2, rf = 0.04, rm = 0.09, payout = 0.4, g = 0.06;
      const r = capm(rf, beta, rm);
      const a = leadingPE(payout, r, g);
      return q("eq-jpe-m2", "moyen", "Justified leading P/E?",
        [["Beta", E(beta)], ["Risk-free rate / expected market return", lst([pc(rf), pc(rm)])], ["Expected payout ratio", pc(payout)], ["Expected growth rate", pc(g)]],
        a, "x", 2,
        [`r = ${P(rf)} + ${F(beta)} × (${P(rm)} − ${P(rf)}) = ${P(r)}.`, `P0 / E1 = ${F(payout)} / (${F(r)} − ${F(g)}) = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const r = 0.14, roe = 0.15, b = 0.4;
      const g = sustainableGrowth(b, roe), payout = 1 - b;
      const a = leadingPE(payout, r, g);
      return q("eq-jpe-m3", "moyen", "Justified leading P/E?",
        [["Required return", pc(r)], ["ROE", pc(roe)], ["Earnings retention rate", pc(b)]],
        a, "x", 2,
        [`g = ${F(b)} × ${P(roe)} = ${P(g)} ; payout = 1 − ${F(b)} = ${F(payout)}.`, `P0 / E1 = ${F(payout)} / (${F(r)} − ${F(g)}) = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const payout = 0.5, g = 0.05, r0 = 0.1, r1 = 0.11;
      const pe0 = leadingPE(payout, r0, g), pe1 = leadingPE(payout, r1, g);
      const a = pe1 - pe0;
      return q("eq-jpe-m4", "moyen", "Change in the justified leading P/E if the required return rises?",
        [["Payout ratio", pc(payout)], ["Growth rate", pc(g)], ["Required return", `${pc(r0)} → ${pc(r1)}`]],
        a, "x", 2,
        [`Avant : ${F(payout)} / (${F(r0)} − ${F(g)}) = ${F(pe0, 2)}.`, `Après : ${F(payout)} / (${F(r1)} − ${F(g)}) = ${F(pe1, 2)}.`, `Variation = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const e0 = 4, d0 = 1.6, g = 0.07, r = 0.12;
      const payout = d0 / e0;
      const a = trailingPE(payout, r, g);
      return q("eq-jpe-m5", "moyen", "Justified trailing P/E?",
        [["EPS just reported (E0)", usd(e0, 2)], ["Dividend just paid (D0)", usd(d0, 2)], ["Constant growth rate", pc(g)], ["Required return", pc(r)]],
        a, "x", 2,
        [`Payout = ${F(d0, 2)} / ${F(e0, 2)} = ${P(payout)}.`, `P0 / E0 = ${F(payout)} × ${F(1 + g)} / (${F(r)} − ${F(g)}) = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const p = 50, e1 = 4, payout = 0.6, r = 0.11, g = 0.06;
      const pe = leadingPE(payout, r, g), value = pe * e1;
      const a = value - p;
      return q("eq-jpe-d1", "difficile", "Justified value minus market price? (Negative if overvalued.)",
        [["Market price", usd(p, 2)], ["Expected EPS next year (E1)", usd(e1, 2)], ["Expected payout ratio", pc(payout)], ["Required return", pc(r)], ["Growth rate", pc(g)]],
        a, "$", 2,
        [`P/E justifié = ${F(payout)} / (${F(r)} − ${F(g)}) = ${F(pe, 2)}x.`, `Valeur justifiée = ${F(pe, 2)} × ${F(e1, 2)} = ${D(value, 2)}.`,
          `Écart = ${F(value, 2)} − ${F(p)} = ${D(a, 2)} : le titre est surévalué (P/E de marché ${F(p / e1, 2)}x).`]);
    })(),
    (() => {
      const p0 = 0.5, p1 = 0.55, r0 = 0.1, r1 = 0.11, g = 0.05;
      const pe0 = leadingPE(p0, r0, g), pe1 = leadingPE(p1, r1, g);
      const a = pe1 - pe0;
      return q("eq-jpe-d2", "difficile", "Change in the justified leading P/E?",
        [["Payout ratio", `${pc(p0)} → ${pc(p1)}`], ["Required return", `${pc(r0)} → ${pc(r1)}`], ["Growth rate (unchanged)", pc(g)]],
        a, "x", 2,
        [`Avant : ${F(p0)} / (${F(r0)} − ${F(g)}) = ${F(pe0, 2)}.`, `Après : ${F(p1)} / (${F(r1)} − ${F(g)}) = ${F(pe1, 4)}.`,
          `Variation = ${F(pe1, 4)} − ${F(pe0, 2)} = ${F(a, 2)}x : la hausse de r l'emporte sur celle du payout.`]);
    })(),
    (() => {
      const payout = 0.55, rf = 0.04, beta = 1, erp = 0.05, roe = 0.12;
      const r = rf + beta * erp, g = sustainableGrowth(1 - payout, roe);
      const a = leadingPE(payout, r, g);
      return q("eq-jpe-d3", "difficile", "Justified leading P/E of the market index?",
        [["Expected payout ratio", pc(payout)], ["ROE", pc(roe)], ["Risk-free rate / equity risk premium", lst([pc(rf), pc(erp)])], ["Index beta", E(beta)]],
        a, "x", 2,
        [`r = ${P(rf)} + ${F(beta)} × ${P(erp)} = ${P(r)}.`, `g = (1 − ${F(payout)}) × ${P(roe)} = ${P(g)}.`, `P0 / E1 = ${F(payout)} / (${F(r)} − ${F(g)}) = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const pe = 15, payout = 0.45, r = 0.1;
      const a = (r - payout / pe) * 100;
      return q("eq-jpe-d4", "difficile", "Growth rate implied by the leading P/E?",
        [["Leading P/E", mx(pe)], ["Payout ratio", pc(payout)], ["Required return", pc(r)]],
        a, "%", 2,
        ["P/E = payout / (r − g), donc r − g = payout / P/E.", `r − g = ${F(payout)} / ${F(pe)} = ${P(payout / pe)}.`, `g = ${P(r)} − ${P(payout / pe)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const eps0 = 2.5, dps0 = 1, roe = 0.15, rf = 0.03, beta = 1.2, mrp = 0.075, price = 40;
      const payout = dps0 / eps0, g = sustainableGrowth(1 - payout, roe), r = rf + beta * mrp;
      const a = trailingPE(payout, r, g);
      return q("eq-jpe-d5", "difficile", "Justified trailing P/E?",
        [["EPS / DPS just reported", lst([usd(eps0, 2), usd(dps0, 2)])], ["ROE", pc(roe)], ["Risk-free rate / market risk premium", lst([pc(rf), pc(mrp)])],
          ["Beta", E(beta)], ["Current share price", usd(price, 2)]],
        a, "x", 2,
        ["Le prix actuel ne sert pas pour un P/E justifié : donnée-piège.",
          `Payout = ${F(dps0)} / ${F(eps0)} = ${P(payout)} ; g = ${F(1 - payout)} × ${P(roe)} = ${P(g)}.`,
          `r = ${P(rf)} + ${F(beta)} × ${P(mrp)} = ${P(r)}.`,
          `P0 / E0 = ${F(payout)} × ${F(1 + g)} / (${F(r)} − ${F(g)}) = ${F(a, 2)}x.`]);
    })(),
  ],
};

/* ────────────────────────── 17 · Multiples de prix ────────────────────────── */

const PRICE_MULTIPLES: CalcType = {
  key: "price-multiples",
  topic: "equity",
  name: "Multiples de prix : P/E, P/B, P/S, P/CF",
  tier: "essentiel",
  source: "LM 8 · Equity Valuation: Concepts and Basic Tools",
  formulas: [
    "P/E = prix / BPA (EPS) : leading avec E1, trailing avec E0",
    "P/B = prix / valeur comptable par action ; P/S = prix / CA par action",
    "P/CF = prix / cash-flow par action (CFO, ou approximation EPS + D&A par action)",
    "Comparables : valeur = multiple de référence × donnée par action de la firme",
  ],
  traps: [
    "Ramène toujours les agrégats par action avant de diviser.",
    "BPA = (RN − dividendes préférentiels) / nombre d'actions.",
  ],
  questions: [
    (() => {
      const p = 45, eps = 3;
      const a = p / eps;
      return q("eq-mult-f1", "facile", "Trailing P/E?",
        [["Share price", usd(p, 2)], ["EPS (last 12 months)", usd(eps, 2)]],
        a, "x", 2,
        ["P/E = prix / BPA.", `= ${F(p)} / ${F(eps)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const p = 40, n = 1000, sales = 4000;
      const sps = sales / n;
      const a = p / sps;
      return q("eq-mult-f2", "facile", "Price-to-sales ratio?",
        [["Share price", usd(p, 2)], ["Shares outstanding", E(n)], ["Sales", usd(sales)]],
        a, "x", 2,
        [`CA par action = ${F(sales)} / ${F(n)} = ${D(sps)}.`, `P/S = ${F(p)} / ${F(sps)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const p = 25, bvps = 12.5;
      const a = p / bvps;
      return q("eq-mult-f3", "facile", "Price-to-book ratio?",
        [["Share price", usd(p, 2)], ["Book value per share", usd(bvps, 2)]],
        a, "x", 2,
        ["P/B = prix / BVPS.", `= ${F(p)} / ${F(bvps)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const p = 100, eps = 6, da = 2;
      const cf = eps + da;
      const a = p / cf;
      return q("eq-mult-f4", "facile", "Price-to-cash-flow ratio (CF = EPS + D&A per share)?",
        [["Share price", usd(p, 2)], ["EPS", usd(eps, 2)], ["Depreciation per share", usd(da, 2)]],
        a, "x", 2,
        [`Cash-flow par action = ${F(eps)} + ${F(da)} = ${D(cf)}.`, `P/CF = ${F(p)} / ${F(cf)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const pe = 14, eps = 2.5;
      const a = pe * eps;
      return q("eq-mult-f5", "facile", "Value per share using the peer P/E?",
        [["Peer group average P/E", mx(pe)], ["Company EPS", usd(eps, 2)]],
        a, "$", 2,
        ["Valeur = P/E de référence × BPA de la firme.", `= ${F(pe)} × ${F(eps, 2)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const ni = 650000, n = 1000000, margin = 0.06, p = 30;
      const sales = ni / margin, sps = sales / n;
      const a = p / sps;
      return q("eq-mult-m1", "moyen", "Price-to-sales ratio?",
        [["Net income", usd(ni)], ["Shares outstanding", E(n)], ["Net profit margin", pc(margin)], ["Share price", usd(p, 2)]],
        a, "x", 2,
        [`CA = RN / marge = ${F(ni)} / ${F(margin)} = ${D(sales, 0)}.`, `CA par action = ${D(sps, 4)}.`, `P/S = ${F(p)} / ${F(sps, 4)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const ni = 3.2, n = 4.476, p = 11.4;
      const eps = ni / n;
      const a = p / eps;
      return q("eq-mult-m2", "moyen", "Trailing P/E?",
        [["Net income ($ millions)", E(ni)], ["Shares outstanding (millions)", E(n)], ["Share price", usd(p, 2)]],
        a, "x", 2,
        [`BPA = ${F(ni)} / ${F(n)} = ${D(eps, 4)}.`, `P/E = ${F(p, 2)} / ${F(eps, 4)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const mv = 250, bv = 225;
      const a = mv / bv;
      return q("eq-mult-m3", "moyen", "Price-to-book ratio?",
        [["Market value of equity ($ millions)", E(mv)], ["Book value of equity ($ millions)", E(bv)]],
        a, "x", 2,
        ["En agrégé : P/B = capitalisation / capitaux propres comptables (même résultat que par action).", `P/B = ${F(mv)} / ${F(bv)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const eq = 480, n = 30, pb = 1.8;
      const bvps = eq / n;
      const a = pb * bvps;
      return q("eq-mult-m4", "moyen", "Value per share using the peer P/B?",
        [["Book value of common equity ($ millions)", E(eq)], ["Shares outstanding (millions)", E(n)], ["Peer average P/B", mx(pb)]],
        a, "$", 2,
        [`BVPS = ${F(eq)} / ${F(n)} = ${D(bvps)}.`, `Valeur = ${F(pb)} × ${F(bvps)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const cfo = 17.9, n = 4.476, p = 11.4;
      const cfps = cfo / n;
      const a = p / cfps;
      return q("eq-mult-m5", "moyen", "Price-to-cash-flow ratio (CF = cash flow from operations)?",
        [["Cash flow from operations ($ millions)", E(cfo)], ["Shares outstanding (millions)", E(n)], ["Share price", usd(p, 2)]],
        a, "x", 2,
        [`CFO par action = ${F(cfo)} / ${F(n)} = ${D(cfps, 4)}.`, `P/CF = ${F(p, 2)} / ${F(cfps, 4)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const p = 30, eps = 2, pe = 18;
      const value = pe * eps;
      const a = (value / p - 1) * 100;
      return q("eq-mult-d1", "difficile", "Upside to the comparables-based value, as a % of the current price?",
        [["Share price", usd(p, 2)], ["Company EPS", usd(eps, 2)], ["Peer average P/E", mx(pe)]],
        a, "%", 2,
        [`Valeur par comparables = ${F(pe)} × ${F(eps)} = ${D(value)}.`, `Potentiel = ${F(value)} / ${F(p)} − 1 = ${Pa(a)} : sous-évalué selon les comparables.`]);
    })(),
    (() => {
      const ni = 50, pd = 5, n = 15, p = 42;
      const eps = (ni - pd) / n;
      const a = p / eps;
      return q("eq-mult-d2", "difficile", "Trailing P/E of the common stock?",
        [["Net income ($ millions)", E(ni)], ["Preferred dividends ($ millions)", E(pd)], ["Common shares (millions)", E(n)], ["Share price", usd(p, 2)]],
        a, "x", 2,
        [`BPA = (${F(ni)} − ${F(pd)}) / ${F(n)} = ${D(eps, 2)}.`, `P/E = ${F(p)} / ${F(eps)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const ps = 1.4, sales = 77.3, n = 4.476;
      const sps = sales / n;
      const a = ps * sps;
      return q("eq-mult-d3", "difficile", "Value per share using the industry P/S?",
        [["Industry average P/S", mx(ps)], ["Company net revenues ($ millions)", E(sales)], ["Shares outstanding (millions)", E(n)]],
        a, "$", 2,
        [`CA par action = ${F(sales)} / ${F(n)} = ${D(sps, 4)}.`, `Valeur = ${F(ps)} × ${F(sps, 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const bv0 = 500, ni = 80, div = 30, n = 25, p = 44;
      const bv1 = bv0 + ni - div, bvps = bv1 / n;
      const a = p / bvps;
      return q("eq-mult-d4", "difficile", "Price-to-book ratio on year-end book value?",
        [["Beginning equity ($ millions)", E(bv0)], ["Net income / dividends ($ millions)", lst([E(ni), E(div)])], ["Shares outstanding (millions)", E(n)], ["Share price", usd(p, 2)]],
        a, "x", 2,
        [`CP fin = ${F(bv0)} + ${F(ni)} − ${F(div)} = ${F(bv1)} M$.`, `BVPS = ${F(bv1)} / ${F(n)} = ${D(bvps)}.`, `P/B = ${F(p)} / ${F(bvps)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const p = 60, e0 = 4, g = 0.2;
      const e1 = e0 * (1 + g);
      const a = p / e1;
      return q("eq-mult-d5", "difficile", "Leading P/E?",
        [["Share price", usd(p, 2)], ["EPS last year (E0)", usd(e0, 2)], ["Expected EPS growth next year", pc(g)]],
        a, "x", 2,
        [`Le leading P/E utilise le BPA attendu : E1 = ${F(e0)} × ${F(1 + g)} = ${D(e1, 2)}.`,
          `P/E leading = ${F(p)} / ${F(e1)} = ${F(a, 2)}x (le trailing serait ${F(p / e0, 2)}x).`]);
    })(),
  ],
};

/* ────────────────────────── 18 · Enterprise value ────────────────────────── */

const ENTERPRISE_VALUE: CalcType = {
  key: "ev-ebitda",
  topic: "equity",
  name: "Enterprise value et EV/EBITDA",
  tier: "essentiel",
  source: "LM 8 · Equity Valuation: Concepts and Basic Tools",
  formulas: [
    "EV = capitalisation + actions de préférence + dette (valeur de marché) − trésorerie et placements CT",
    "EV/EBITDA = EV / EBITDA ; EBITDA = EBIT + D&A",
    "Valeur des actions implicite = multiple × EBITDA − dette − préférentielles + trésorerie",
  ],
  traps: [
    "Prends la valeur de marché de la dette si elle est donnée, pas la valeur comptable.",
    "La trésorerie se retranche : l'acquéreur la récupère.",
  ],
  questions: [
    (() => {
      const eqv = 8000, debt = 1800, cash = 250;
      const a = enterpriseValue(eqv, 0, debt, cash);
      return q("eq-ev-f1", "facile", "Enterprise value, in $ thousands?",
        [["Market value of equity ($ thousands)", E(eqv)], ["Market value of debt ($ thousands)", E(debt)], ["Cash and short-term investments ($ thousands)", E(cash)]],
        a, "$", 0,
        ["EV = capitalisation + dette − trésorerie.", `= ${F(eqv)} + ${F(debt)} − ${F(cash)} = ${K(a, 0)}.`]);
    })(),
    (() => {
      const ev = 9550, ebitda = 1000;
      const a = ev / ebitda;
      return q("eq-ev-f2", "facile", "EV/EBITDA multiple?",
        [["Enterprise value ($ thousands)", E(ev)], ["EBITDA ($ thousands)", E(ebitda)]],
        a, "x", 2,
        ["EV/EBITDA = EV / EBITDA.", `= ${F(ev)} / ${F(ebitda)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const ev = 720, pref = 50, debt = 200, cash = 30;
      const a = ev - pref - debt + cash;
      return q("eq-ev-f3", "facile", "Market value of common equity implied by the EV, in $ millions?",
        [["Enterprise value ($ millions)", E(ev)], ["Preferred stock, market value ($ millions)", E(pref)], ["Debt, market value ($ millions)", E(debt)], ["Cash ($ millions)", E(cash)]],
        a, "$", 0,
        ["EV = actions + préférentielles + dette − trésorerie, donc actions = EV − préférentielles − dette + trésorerie.",
          `= ${F(ev)} − ${F(pref)} − ${F(debt)} + ${F(cash)} = ${M(a, 0)}.`]);
    })(),
    (() => {
      const ebitda = 250, m = 7.5;
      const a = m * ebitda;
      return q("eq-ev-f4", "facile", "Enterprise value implied by the peer multiple, in $ millions?",
        [["Company EBITDA ($ millions)", E(ebitda)], ["Peer EV/EBITDA", mx(m)]],
        a, "$", 0,
        ["EV = multiple × EBITDA.", `= ${F(m)} × ${F(ebitda)} = ${M(a, 0)}.`]);
    })(),
    (() => {
      const ev = 3000, ebit = 250;
      const a = ev / ebit;
      return q("eq-ev-f5", "facile", "EV/EBIT multiple?",
        [["Enterprise value ($ millions)", E(ev)], ["EBIT (operating income, $ millions)", E(ebit)]],
        a, "x", 2,
        ["Le résultat d'exploitation (EBIT) peut aussi servir de dénominateur.", `EV/EBIT = ${F(ev)} / ${F(ebit)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const p = 40, n = 200000, mvLtd = 600000, bvLtd = 900000, bvDebt = 2100000, cash = 250000, ebitda = 1100000;
      const eqv = p * n, std = bvDebt - bvLtd, debt = mvLtd + std;
      const ev = enterpriseValue(eqv, 0, debt, cash);
      const a = ev / ebitda;
      return q("eq-ev-m1", "moyen", "EV/EBITDA multiple?",
        [["Stock price / shares", lst([usd(p, 2), E(n)])], ["Market value of long-term debt", usd(mvLtd)], ["Book value of long-term debt", usd(bvLtd)],
          ["Book value of total debt", usd(bvDebt)], ["Cash and marketable securities", usd(cash)], ["EBITDA", usd(ebitda)]],
        a, "x", 2,
        [`Dette CT = ${F(bvDebt)} − ${F(bvLtd)} = ${D(std)} (valeur comptable ≈ valeur de marché).`,
          `Dette totale en valeur de marché = ${F(mvLtd)} + ${F(std)} = ${D(debt)} ; capitalisation = ${D(eqv)}.`,
          `EV = ${F(eqv)} + ${F(debt)} − ${F(cash)} = ${D(ev)}.`,
          `EV/EBITDA = ${F(ev)} / ${F(ebitda)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const ev = 5000, ebit = 420, da = 80;
      const ebitda = ebit + da;
      const a = ev / ebitda;
      return q("eq-ev-m2", "moyen", "EV/EBITDA multiple?",
        [["Enterprise value ($ millions)", E(ev)], ["EBIT ($ millions)", E(ebit)], ["Depreciation & amortization ($ millions)", E(da)]],
        a, "x", 2,
        [`EBITDA = ${F(ebit)} + ${F(da)} = ${F(ebitda)}.`, `EV/EBITDA = ${F(ev)} / ${F(ebitda)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const ebitda = 11, m = 10, debt = 30, cash = 6, n = 8;
      const ev = m * ebitda, eqv = ev - debt + cash;
      const a = eqv / n;
      return q("eq-ev-m3", "moyen", "Value per share implied by the industry EV/EBITDA?",
        [["EBITDA ($ millions)", E(ebitda)], ["Industry EV/EBITDA", mx(m)], ["Market value of debt ($ millions)", E(debt)], ["Cash ($ millions)", E(cash)], ["Shares (millions)", E(n)]],
        a, "$", 2,
        [`EV = ${F(m)} × ${F(ebitda)} = ${F(ev)} M$.`, `Capitaux propres = ${F(ev)} − ${F(debt)} + ${F(cash)} = ${F(eqv)} M$.`, `Par action = ${F(eqv)} / ${F(n)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const p = 25, n = 40, debt = 300, cash = 120;
      const eqv = p * n;
      const a = enterpriseValue(eqv, 0, debt, cash);
      return q("eq-ev-m4", "moyen", "Enterprise value, in $ millions?",
        [["Share price", usd(p, 2)], ["Shares outstanding (millions)", E(n)], ["Market value of debt ($ millions)", E(debt)], ["Cash and short-term investments ($ millions)", E(cash)]],
        a, "$", 0,
        [`Capitalisation = ${F(p)} × ${F(n)} = ${F(eqv)} M$.`, `EV = ${F(eqv)} + ${F(debt)} − ${F(cash)} = ${M(a, 0)}.`]);
    })(),
    (() => {
      const ev = 2000, eqv = 1500, cash = 100;
      const a = ev - eqv + cash;
      return q("eq-ev-m5", "moyen", "Market value of debt implied, in $ millions? (No preferred stock.)",
        [["Enterprise value ($ millions)", E(ev)], ["Market cap ($ millions)", E(eqv)], ["Cash ($ millions)", E(cash)]],
        a, "$", 0,
        ["EV = capitalisation + dette − trésorerie, donc dette = EV − capitalisation + trésorerie.", `= ${F(ev)} − ${F(eqv)} + ${F(cash)} = ${M(a, 0)}.`]);
    })(),
    (() => {
      const ebitda = 40, m = 8, mvDebt = 120, bvDebt = 140, pref = 20, cash = 15, n = 10;
      const ev = m * ebitda, eqv = ev - mvDebt - pref + cash;
      const a = eqv / n;
      return q("eq-ev-d1", "difficile", "Value per share implied by the peer EV/EBITDA?",
        [["EBITDA ($ millions)", E(ebitda)], ["Peer EV/EBITDA", mx(m)], ["Debt: market value / book value ($ millions)", lst([E(mvDebt), E(bvDebt)])],
          ["Preferred stock ($ millions)", E(pref)], ["Cash ($ millions)", E(cash)], ["Common shares (millions)", E(n)]],
        a, "$", 2,
        [`EV implicite = ${F(m)} × ${F(ebitda)} = ${F(ev)} M$.`,
          `On retire la dette en valeur de marché (pas la valeur comptable, piège) et les préférentielles, on rajoute la trésorerie : ${F(ev)} − ${F(mvDebt)} − ${F(pref)} + ${F(cash)} = ${F(eqv)} M$.`,
          `Par action = ${F(eqv)} / ${F(n)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const ni = 60, tax = 20, int = 15, da = 25, p = 30, n = 30, debt = 250, cash = 70;
      const ebitda = ni + tax + int + da, ev = enterpriseValue(p * n, 0, debt, cash);
      const a = ev / ebitda;
      return q("eq-ev-d2", "difficile", "EV/EBITDA multiple?",
        [["Net income / taxes / interest / D&A ($ millions)", lst([E(ni), E(tax), E(int), E(da)])], ["Share price / shares (millions)", lst([usd(p, 2), E(n)])],
          ["Market value of debt ($ millions)", E(debt)], ["Cash ($ millions)", E(cash)]],
        a, "x", 2,
        [`EBITDA = ${F(ni)} + ${F(tax)} + ${F(int)} + ${F(da)} = ${F(ebitda)}.`,
          `EV = ${F(p)} × ${F(n)} + ${F(debt)} − ${F(cash)} = ${F(ev)}.`,
          `EV/EBITDA = ${F(ev)} / ${F(ebitda)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const p = 50, n = 10, debt = 100, cash = 20, m = 9;
      const ev = enterpriseValue(p * n, 0, debt, cash);
      const a = ev / m;
      return q("eq-ev-d3", "difficile", "EBITDA needed to justify the current share price at the peer multiple, in $ millions?",
        [["Share price", usd(p, 2)], ["Shares (millions)", E(n)], ["Market value of debt / cash ($ millions)", lst([E(debt), E(cash)])], ["Peer EV/EBITDA", mx(m)]],
        a, "$", 2,
        [`EV au prix actuel = ${F(p)} × ${F(n)} + ${F(debt)} − ${F(cash)} = ${M(ev)}.`,
          `Au multiple des pairs, EV = ${F(m)} × EBITDA, donc EBITDA = ${F(ev)} / ${F(m)}.`,
          `EBITDA requis = ${M(a, 2)} : en dessous, le titre paraît cher face aux pairs.`]);
    })(),
    (() => {
      const p = 22, n = 5, mvLtd = 35, bvLtd = 40, bvDebt = 52, cash = 9;
      const std = bvDebt - bvLtd, debt = mvLtd + std;
      const a = enterpriseValue(p * n, 0, debt, cash);
      return q("eq-ev-d4", "difficile", "Enterprise value, in $ millions?",
        [["Share price / shares (millions)", lst([usd(p, 2), E(n)])], ["Long-term debt: market / book ($ millions)", lst([E(mvLtd), E(bvLtd)])],
          ["Book value of total debt ($ millions)", E(bvDebt)], ["Cash and marketable securities ($ millions)", E(cash)]],
        a, "$", 0,
        [`Dette CT = ${F(bvDebt)} − ${F(bvLtd)} = ${F(std)} (valeur comptable ≈ marché).`,
          `Dette en valeur de marché = ${F(mvLtd)} + ${F(std)} = ${F(debt)} ; capitalisation = ${F(p)} × ${F(n)} = ${F(p * n)}.`,
          `EV = ${F(p * n)} + ${F(debt)} − ${F(cash)} = ${M(a, 0)}.`]);
    })(),
    (() => {
      const p = 18, n = 50, bookEq = 600, debt = 400, cash = 150, ebitda = 140;
      const ev = enterpriseValue(p * n, 0, debt, cash);
      const a = ev / ebitda;
      return q("eq-ev-d5", "difficile", "EV/EBITDA multiple?",
        [["Share price / shares (millions)", lst([usd(p, 2), E(n)])], ["Book value of equity ($ millions)", E(bookEq)], ["Market value of debt ($ millions)", E(debt)],
          ["Cash ($ millions)", E(cash)], ["EBITDA ($ millions)", E(ebitda)]],
        a, "x", 2,
        ["L'EV utilise la capitalisation boursière, pas la valeur comptable des capitaux propres (piège).",
          `EV = ${F(p)} × ${F(n)} + ${F(debt)} − ${F(cash)} = ${F(ev)}.`,
          `EV/EBITDA = ${F(ev)} / ${F(ebitda)} = ${F(a, 2)}x.`]);
    })(),
  ],
};

/* ────────────────────────── Catalogue ────────────────────────── */

export const EQUITY_CALC: CalcCatalog = {
  topic: "equity",
  types: [
    MARGIN,
    SHORT,
    INDEX_WEIGHTING,
    INDEX_RETURNS,
    ROE_BOOK,
    OPERATING_LEVERAGE,
    MARKET_SHARE,
    FORECASTING,
    DDM_HOLDING,
    FCFE,
    REQUIRED_RETURN,
    PREFERRED,
    GORDON,
    SUSTAINABLE_GROWTH,
    MULTISTAGE,
    JUSTIFIED_PE,
    PRICE_MULTIPLES,
    ENTERPRISE_VALUE,
  ],
};
