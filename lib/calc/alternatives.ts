// Exercices de calcul pur : Alternative Investments (CFA Level I).
//
// Contenu seulement : le moteur et les pages vivent ailleurs (lib/calc/engine.ts, app/calculs).
// Règle d'or : chaque réponse est CALCULÉE ici, à partir des mêmes nombres que les données
// affichées, par les petites fonctions financières du haut de fichier. Aucune réponse tapée à la main.
// Formules vérifiées dans Schweser Level I 2025, Book 4 (Readings 76 à 82 = LM 1 à 7 du curriculum
// Alternative Investments) et recoupées avec la banque officielle de practice exams (LM 1 et 2).
// Programme 2025-2026 : l'évaluation immobilière (NOI, cap rate, DCF) et les composantes du
// rendement d'un future (roll yield, collateral yield) ne sont plus au Niveau I ; elles sont écartées.
//
// Conventions : énoncés et données en anglais d'examen ; solutions en français, nombres au format
// français. Pour une réponse en %, `answer` vaut déjà le pourcentage (8,5 % → 8.5). Les montants
// « in $ millions » se saisissent en millions. Chaque énoncé précise la base des frais
// (début ou fin d'année, indépendants ou nets des frais de gestion), comme à l'examen.

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
/** Montant en millions de dollars ; sans `d` : jusqu'à 4 décimales, zéros inutiles retirés. */
const M = (x: number, d?: number): string => `${F(x, d)} M$`;
/** Facteur affiché : (1 + r)^t → « 1,12³ ». */
const pw = (r: number, t: number): string => `${F(1 + r)}${t === 1 ? "" : t === 2 ? "²" : t === 3 ? "³" : "^" + t}`;

/** Formats anglais (données d'énoncé). */
const E = (x: number, d?: number): string => numStr(x, d, ".", ",");
const usd = (x: number, d?: number): string => `${x < 0 ? MINUS : ""}$${E(Math.abs(x), d ?? (isInt(x) ? 0 : 2))}`;
const mil = (x: number): string => `${x < 0 ? MINUS : ""}$${E(Math.abs(x))} million`;
const pc = (frac: number, d?: number): string => `${E(frac * 100, d)}%`;
const spc = (frac: number): string => `${frac > 0 ? "+" : ""}${pc(frac)}`;
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

// LM 1 et 2 · Frais d'un fonds (hedge fund) : frais de gestion + incentive fee.
type FeeOpts = {
  /** frais de gestion (management fee) */
  m: number;
  /** incentive / performance fee */
  p: number;
  /** base des frais de gestion : actifs de début ou de fin d'année */
  mgmtBase: "begin" | "end";
  /** incentive calculée sur le gain net des frais de gestion (sinon indépendante) */
  netOfMgmt: boolean;
  hurdle?: number;
  hurdleType?: "soft" | "hard";
};

function hfFees(v0: number, v1: number, o: FeeOpts) {
  const mgmt = o.m * (o.mgmtBase === "begin" ? v0 : v1);
  const gain = v1 - v0 - (o.netOfMgmt ? mgmt : 0);
  const hurdleAmt = (o.hurdle ?? 0) * v0;
  let base = Math.max(0, gain);
  if (o.hurdle !== undefined) {
    if (o.hurdleType === "hard") base = Math.max(0, gain - hurdleAmt);
    else if (gain < hurdleAmt) base = 0;
  }
  const incentive = o.p * base;
  const fees = mgmt + incentive;
  const vNet = v1 - fees;
  return { mgmt, gain, hurdleAmt, base, incentive, fees, vNet, ret: vNet / v0 - 1 };
}

const mgmtLbl = (o: FeeOpts): string =>
  `Management fee (on ${o.mgmtBase === "begin" ? "beginning-of-year" : "year-end"} assets)`;
const incLbl = (o: FeeOpts): string =>
  `Incentive fee (${o.netOfMgmt ? "on gains net of the management fee" : "independent of the management fee"})`;
const hurdleLbl = (o: FeeOpts): string =>
  `Hurdle rate (${o.hurdleType ?? "soft"}, tested on the ${o.netOfMgmt ? "return net of the management fee" : "gross return"})`;

/** Étapes standard d'un calcul de frais, avec `fmt` pour les montants (M pour des millions, F sur base 100). */
function feeLines(v0: number, v1: number, o: FeeOpts, fmt: (x: number) => string): { t: ReturnType<typeof hfFees>; lines: string[] } {
  const t = hfFees(v0, v1, o);
  const lines: string[] = [];
  const baseVal = o.mgmtBase === "begin" ? v0 : v1;
  lines.push(`Frais de gestion = ${P(o.m)} × ${o.mgmtBase === "begin" ? "valeur de début" : "valeur de fin"} ${fmt(baseVal)} = ${fmt(t.mgmt)}.`);
  const gainTxt = o.netOfMgmt
    ? `Gain net des frais de gestion = ${fmt(v1)} − ${fmt(v0)} − ${fmt(t.mgmt)} = ${fmt(t.gain)}`
    : `Gain brut (incentive indépendante des frais de gestion) = ${fmt(v1)} − ${fmt(v0)} = ${fmt(t.gain)}`;
  if (t.gain <= 0) {
    lines.push(`${gainTxt} ≤ 0 : pas d'incentive fee.`);
  } else if (o.hurdle === undefined) {
    lines.push(`${gainTxt} ; incentive = ${P(o.p)} × ${fmt(t.gain)} = ${fmt(t.incentive)}.`);
  } else if (o.hurdleType === "hard") {
    lines.push(`${gainTxt} ; hurdle (hard) = ${P(o.hurdle)} × ${fmt(v0)} = ${fmt(t.hurdleAmt)}.`);
    lines.push(
      t.base > 0
        ? `Incentive = ${P(o.p)} × (${fmt(t.gain)} − ${fmt(t.hurdleAmt)}) = ${P(o.p)} × ${fmt(t.base)} = ${fmt(t.incentive)}.`
        : `Gain inférieur au hurdle : pas d'incentive fee.`,
    );
  } else {
    lines.push(`${gainTxt}, soit ${P(t.gain / v0, 2)} de la valeur de début.`);
    lines.push(
      t.base > 0
        ? `${P(t.gain / v0, 2)} ≥ hurdle ${P(o.hurdle)} (soft) : incentive sur tout le gain = ${P(o.p)} × ${fmt(t.gain)} = ${fmt(t.incentive)}.`
        : `${P(t.gain / v0, 2)} < hurdle ${P(o.hurdle)} (soft) : pas d'incentive fee.`,
    );
  }
  lines.push(`Total des frais = ${fmt(t.mgmt)} + ${fmt(t.incentive)} = ${fmt(t.fees)} ; valeur nette = ${fmt(v1)} − ${fmt(t.fees)} = ${fmt(t.vNet)}.`);
  return { t, lines };
}

// LM 2 · High-water mark : simulation année par année.
type HwmOpts = FeeOpts & { noHwm?: boolean };
type HwmYear = {
  start: number;
  gross: number;
  mgmt: number;
  afterMgmt: number;
  hwm: number;
  base: number;
  incentive: number;
  fees: number;
  end: number;
  ret: number;
  newHwm: number;
};
function hwmPath(v0: number, rets: number[], o: HwmOpts, hwm0 = v0): HwmYear[] {
  const out: HwmYear[] = [];
  let v = v0;
  let hwm = hwm0;
  for (const r of rets) {
    const gross = v * (1 + r);
    const mgmt = o.m * (o.mgmtBase === "begin" ? v : gross);
    const afterMgmt = gross - mgmt;
    const ref = o.noHwm ? v : hwm;
    const val = o.netOfMgmt ? afterMgmt : gross;
    let base = Math.max(0, val - ref);
    if (o.hurdle !== undefined) {
      if (o.hurdleType === "hard") base = Math.max(0, val - ref * (1 + o.hurdle));
      else if (base / ref < o.hurdle) base = 0;
    }
    const incentive = o.p * base;
    const fees = mgmt + incentive;
    const end = gross - fees;
    const newHwm = Math.max(hwm, end);
    out.push({ start: v, gross, mgmt, afterMgmt, hwm, base, incentive, fees, end, ret: end / v - 1, newHwm });
    v = end;
    hwm = newHwm;
  }
  return out;
}
/** Une ligne de correction par année (HWM, frais de gestion sur le début ou la fin, incentive nette des frais de gestion). */
function hwmLines(path: HwmYear[], o: HwmOpts): string[] {
  return path.map((y, i) => {
    const head = `Année ${i + 1} : brut ${M(y.start)} × ${F(y.gross / y.start)} = ${M(y.gross)} ; frais de gestion ${P(o.m)} × ${M(o.mgmtBase === "begin" ? y.start : y.gross)} = ${M(y.mgmt)}`;
    const val = o.netOfMgmt ? y.afterMgmt : y.gross;
    const inc =
      y.base > 0
        ? `valeur ${M(val)} > HWM ${M(y.hwm)} : incentive = ${P(o.p)} × ${M(y.base)} = ${M(y.incentive)}`
        : `valeur ${M(val)} ≤ HWM ${M(y.hwm)} : pas d'incentive`;
    return `${head} ; ${inc} ; valeur nette ${M(y.end)}, HWM ${M(y.newHwm)}.`;
  });
}

// LM 2 · Rendement à effet de levier.
const levGain = (r: number, v0: number, vb: number, rb: number): number => r * (v0 + vb) - rb * vb;
const levReturn = (r: number, v0: number, vb: number, rb: number): number => levGain(r, v0, vb, rb) / v0;

// LM 1 · Clause de rattrapage (catch-up à 100 %).
function catchUp(R: number, h: number, p: number) {
  const top = h / (1 - p);
  const gp = R <= h ? 0 : R <= top ? R - h : p * R;
  return { top, gp, lp: R - gp };
}
function catchUpLines(R: number, h: number, p: number): string[] {
  const c = catchUp(R, h, p);
  const out = [`Seuil de fin du rattrapage = hurdle / (1 − p) = ${P(h)} / ${F(1 - p)} = ${P(c.top, 2)}.`];
  if (R <= h) out.push(`Rendement ${P(R, 2)} ≤ hurdle ${P(h)} : tout revient aux LP, le GP ne touche rien.`);
  else if (R <= c.top)
    out.push(`Rendement ${P(R, 2)} entre le hurdle et ${P(c.top, 2)} : le GP prend 100 % de l'excédent, ${P(R, 2)} − ${P(h)} = ${P(c.gp, 2)}.`);
  else
    out.push(
      `Rendement ${P(R, 2)} > ${P(c.top, 2)} : rattrapage complet, le GP touche ${P(p)} × ${P(R, 2)} = ${P(c.gp, 2)} (LP ${P(h)}, puis GP ${P(c.top - h, 2)} de rattrapage, puis partage ${F((1 - p) * 100)}/${F(p * 100)}).`,
    );
  return out;
}

// LM 1 · Waterfall (deal-by-deal / whole-of-fund) et clawback. Un deal = [coût, produit de cession].
type Deal = [number, number];
const dealGains = (deals: Deal[]): number[] => deals.map(([c, x]) => x - c);
const americanCarry = (deals: Deal[], p: number): number => sum(dealGains(deals).map((g) => p * Math.max(0, g)));
const europeanCarry = (deals: Deal[], p: number): number => p * Math.max(0, sum(dealGains(deals)));
const LETTERS = ["A", "B", "C", "D"];
const dealRows = (deals: Deal[]): Row[] =>
  deals.map(([c, x], i) => [`Deal ${LETTERS[i]}: cost / exit proceeds`, `${mil(c)} / ${mil(x)}`]);
const dealGainTxt = (deals: Deal[]): string =>
  deals.map(([c, x], i) => `${LETTERS[i]} : ${F(x)} − ${F(c)} = ${F(x - c)}`).join(" ; ");

// LM 2 · Multiple of invested capital.
const moic = (distributions: number, residual: number, paidIn: number): number => (distributions + residual) / paidIn;
const annualized = (multiple: number, years: number): number => Math.pow(multiple, 1 / years) - 1;

// LM 2 · IRR d'une série de flux (t = 0, 1, 2, …), par dichotomie.
const npv = (r: number, cfs: number[]): number => cfs.reduce((s, cf, t) => s + cf / Math.pow(1 + r, t), 0);
function irr(cfs: number[]): number {
  let lo = -0.99;
  let hi = 5;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid, cfs) > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
const cfTxt = (cfs: number[]): string => cfs.map((c, t) => `CF${t} = ${F(c)}`).join(" ; ");
const npvTxt = (cfs: number[], r: number): string =>
  cfs.map((c, t) => (t === 0 ? F(c) : `${c < 0 ? "− " + F(-c) : "+ " + F(c)} / ${pw(r, t)}`)).join(" ");

// LM 5 · Prix d'un future sur matière première (cost of carry).
const futuresPrice = (spot: number, rf: number, storage: number, cy: number): number => spot * (1 + rf) + storage - cy;

/* ────────────────────────── 1 · Frais et rendement net ────────────────────────── */

const HF_FEES: CalcType = {
  key: "hedge-fund-fees",
  topic: "alternatives",
  name: "Frais « 2 and 20 » et rendement net (hedge fund)",
  tier: "essentiel",
  top: true,
  source: "LM 2 · Alternative Investment Performance and Returns",
  formulas: [
    "Frais de gestion (management fee) = m × V1 (actifs de fin) ou m × V0 (actifs de début), selon l'énoncé",
    "Incentive fee indépendante = p × (V1 − V0) ; nette des frais de gestion = p × (V1 − V0 − frais de gestion)",
    "Total des frais = m × V1 + max[0 ; p × (V1 − V0)] (cas simple, sans hurdle)",
    "Rendement net = (V1 − V0 − total des frais) / V0",
  ],
  traps: [
    "Lire la base des frais de gestion (début ou fin d'année) et si l'incentive est indépendante ou nette des frais de gestion.",
    "Pas d'incentive fee si le gain est négatif, mais les frais de gestion restent dus.",
    "Frais « either-or » : on paie le plus élevé des deux, pas la somme.",
  ],
  questions: [
    (() => {
      const v0 = 80, r = 0.15;
      const o: FeeOpts = { m: 0.02, p: 0.2, mgmtBase: "end", netOfMgmt: false };
      const v1 = v0 * (1 + r);
      const { t, lines } = feeLines(v0, v1, o, M);
      const a = t.ret * 100;
      return q("ai-fee-f1", "facile", "Investor's after-fee return for the year?",
        [["Initial fund value", mil(v0)], ["Gross return for the year", pc(r)], [mgmtLbl(o), pc(o.m)], [incLbl(o), pc(o.p)]],
        a, "%", 2,
        [`Valeur brute de fin = ${M(v0)} × ${F(1 + r)} = ${M(v1)}.`, ...lines,
          `Rendement net = ${M(t.vNet)} / ${M(v0)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 250, r = 0.08, m = 0.015;
      const v1 = v0 * (1 + r);
      const a = m * v1;
      return q("ai-fee-f2", "facile", "Management fee for the year, in $ millions?",
        [["Assets under management at the start of the year", mil(v0)], ["Gross return for the year", pc(r)],
          ["Management fee (on year-end assets)", pc(m)]],
        a, "$", 2,
        [`Actifs de fin d'année = ${M(v0)} × ${F(1 + r)} = ${M(v1)}.`,
          `Frais de gestion = ${P(m)} × ${M(v1)} = ${M(a, 2)} (base : actifs de fin, pas de début).`]);
    })(),
    (() => {
      const v0 = 120, r = 0.22, m = 0.02, p = 0.2;
      const v1 = v0 * (1 + r);
      const a = p * (v1 - v0);
      return q("ai-fee-f3", "facile", "Incentive fee for the year, in $ millions?",
        [["Initial fund value", mil(v0)], ["Gross return for the year", pc(r)], ["Management fee (on year-end assets)", pc(m)],
          ["Incentive fee (independent of the management fee)", pc(p)]],
        a, "$", 2,
        [`Gain brut = ${M(v0)} × ${P(r)} = ${M(v1 - v0)}.`,
          `Incentive indépendante des frais de gestion : ${P(p)} × ${M(v1 - v0)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const v0 = 200, r = -0.06;
      const o: FeeOpts = { m: 0.02, p: 0.2, mgmtBase: "end", netOfMgmt: false };
      const v1 = v0 * (1 + r);
      const { t, lines } = feeLines(v0, v1, o, M);
      const a = t.fees;
      return q("ai-fee-f4", "facile", "Total fees paid to the manager for the year, in $ millions?",
        [["Initial fund value", mil(v0)], ["Gross return for the year", spc(r)], [mgmtLbl(o), pc(o.m)], [incLbl(o), pc(o.p)]],
        a, "$", 2,
        [`Valeur brute de fin = ${M(v0)} × ${F(1 + r)} = ${M(v1)}.`, ...lines,
          `Total des frais = ${M(a, 2)} : seulement les frais de gestion, l'année étant perdante.`]);
    })(),
    (() => {
      const v0 = 60, r = 0.12;
      const o: FeeOpts = { m: 0.01, p: 0.1, mgmtBase: "end", netOfMgmt: false };
      const v1 = v0 * (1 + r);
      const { t, lines } = feeLines(v0, v1, o, M);
      const a = t.ret * 100;
      return q("ai-fee-f5", "facile", "After-fee return for an investor in this \"1 and 10\" fund?",
        [["Initial fund value", mil(v0)], ["Gross return for the year", pc(r)], [mgmtLbl(o), pc(o.m)], [incLbl(o), pc(o.p)]],
        a, "%", 2,
        [`Valeur brute de fin = ${M(v0)} × ${F(1 + r)} = ${M(v1)}.`, ...lines,
          `Rendement net = ${M(t.vNet)} / ${M(v0)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 140, r = 0.18;
      const o: FeeOpts = { m: 0.02, p: 0.2, mgmtBase: "end", netOfMgmt: true };
      const v1 = v0 * (1 + r);
      const { t, lines } = feeLines(v0, v1, o, M);
      const a = t.ret * 100;
      return q("ai-fee-m1", "moyen", "Investor's after-fee return for the year?",
        [["Initial fund value", mil(v0)], ["Gross return for the year", pc(r)], [mgmtLbl(o), pc(o.m)], [incLbl(o), pc(o.p)]],
        a, "%", 2,
        [`Valeur brute de fin = ${M(v0)} × ${F(1 + r)} = ${M(v1)}.`, ...lines,
          `Rendement net = ${M(t.vNet)} / ${M(v0)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 90, r = 0.14;
      const o: FeeOpts = { m: 0.015, p: 0.15, mgmtBase: "begin", netOfMgmt: true };
      const v1 = v0 * (1 + r);
      const { t, lines } = feeLines(v0, v1, o, M);
      const a = t.ret * 100;
      return q("ai-fee-m2", "moyen", "Investor's after-fee return for the year?",
        [["Initial fund value", mil(v0)], ["Gross return for the year", pc(r)], [mgmtLbl(o), pc(o.m)], [incLbl(o), pc(o.p)]],
        a, "%", 2,
        [`Valeur brute de fin = ${M(v0)} × ${F(1 + r)} = ${M(v1)}.`, ...lines,
          `Rendement net = ${M(t.vNet)} / ${M(v0)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 100, r = 0.25;
      const ind: FeeOpts = { m: 0.02, p: 0.2, mgmtBase: "end", netOfMgmt: false };
      const net: FeeOpts = { ...ind, netOfMgmt: true };
      const v1 = v0 * (1 + r);
      const a1 = hfFees(v0, v1, ind), a2 = hfFees(v0, v1, net);
      const a = (a2.ret - a1.ret) * 10000;
      return q("ai-fee-m3", "moyen", "By how many basis points is the after-fee return higher if the incentive fee is calculated net of the management fee rather than independently?",
        [["Gross return for the year", pc(r)], [mgmtLbl(ind), pc(ind.m)], ["Incentive fee", pc(ind.p)]],
        a, "bp", 0,
        [`Sur une base de 100 : valeur brute de fin = ${F(v1)} ; frais de gestion = ${P(ind.m)} × ${F(v1)} = ${F(a1.mgmt)}.`,
          `Incentive indépendante = ${P(ind.p)} × ${F(v1 - v0)} = ${F(a1.incentive)} → rendement net ${P(a1.ret, 2)}.`,
          `Incentive nette = ${P(ind.p)} × (${F(v1 - v0)} − ${F(a1.mgmt)}) = ${F(a2.incentive)} → rendement net ${P(a2.ret, 2)}.`,
          `Écart = ${F(a1.incentive - a2.incentive)} pour 100, soit ${F(a, 0)} bp (= ${P(ind.p)} × les frais de gestion).`]);
    })(),
    (() => {
      const v0 = 300, r = 0.1;
      const o: FeeOpts = { m: 0.02, p: 0.2, mgmtBase: "end", netOfMgmt: false };
      const v1 = v0 * (1 + r);
      const { t, lines } = feeLines(v0, v1, o, M);
      const a = (t.fees / v0) * 100;
      return q("ai-fee-m4", "moyen", "Total fees as a percentage of the fund's beginning value?",
        [["Initial fund value", mil(v0)], ["Gross return for the year", pc(r)], [mgmtLbl(o), pc(o.m)], [incLbl(o), pc(o.p)]],
        a, "%", 2,
        [`Valeur brute de fin = ${M(v0)} × ${F(1 + r)} = ${M(v1)}.`, ...lines,
          `Poids des frais = ${M(t.fees)} / ${M(v0)} = ${Pa(a)} : le rendement brut de ${P(r)} devient ${P(t.ret, 2)} net.`]);
    })(),
    (() => {
      const v0 = 75, r = 0.3;
      const o: FeeOpts = { m: 0.0175, p: 0.25, mgmtBase: "end", netOfMgmt: true };
      const v1 = v0 * (1 + r);
      const { t, lines } = feeLines(v0, v1, o, M);
      const a = t.vNet;
      return q("ai-fee-m5", "moyen", "Year-end value of the investment after all fees, in $ millions?",
        [["Initial investment", mil(v0)], ["Gross return for the year", pc(r)], [mgmtLbl(o), pc(o.m)], [incLbl(o), pc(o.p)]],
        a, "$", 2,
        [`Valeur brute de fin = ${M(v0)} × ${F(1 + r)} = ${M(v1)}.`, ...lines,
          `Valeur après frais = ${M(a, 2)}.`]);
    })(),
    (() => {
      const target = 0.1, m = 0.02, p = 0.2;
      const g = (target + m) / (1 - m - p);
      const a = g * 100;
      const chk = hfFees(100, 100 * (1 + g), { m, p, mgmtBase: "end", netOfMgmt: false });
      return q("ai-fee-d1", "difficile", "Gross return the fund must earn for investors to net the target after-fee return?",
        [["Target after-fee return", pc(target)], ["Management fee (on year-end assets)", pc(m)],
          ["Incentive fee (independent of the management fee)", pc(p)]],
        a, "%", 2,
        ["Sur une base de 1 : valeur nette = (1 + g) − m × (1 + g) − p × g = 1 + g × (1 − m − p) − m.",
          `Rendement net = g × (1 − ${F(m)} − ${F(p)}) − ${F(m)} = ${F(target)}.`,
          `g = (${F(target)} + ${F(m)}) / ${F(1 - m - p)} = ${Pa(a)}.`,
          `Vérification : sur 100, frais = ${F(chk.mgmt, 4)} + ${F(chk.incentive, 4)} → rendement net ${P(chk.ret, 2)}.`]);
    })(),
    (() => {
      const v0 = 50, r = 0.06, m = 0.01, p = 0.3, lockup = 1;
      const v1 = v0 * (1 + r);
      const mgmt = m * v1, inc = p * (v1 - v0);
      const fee = Math.max(mgmt, inc);
      const a = ((v1 - fee) / v0 - 1) * 100;
      return q("ai-fee-d2", "difficile", "Investor's after-fee return under this either-or fee structure?",
        [["Initial fund value", mil(v0)], ["Gross return for the year", pc(r)],
          ["Fee charged", "Greater of the management fee or the incentive fee"],
          ["Management fee (on year-end assets)", pc(m)], ["Incentive fee (on the gross gain)", pc(p)], ["Lockup period", `${lockup} year`]],
        a, "%", 2,
        [`Valeur brute de fin = ${M(v0)} × ${F(1 + r)} = ${M(v1)} (la période de lock-up n'intervient pas).`,
          `Frais de gestion = ${P(m)} × ${M(v1)} = ${M(mgmt)} ; incentive = ${P(p)} × ${M(v1 - v0)} = ${M(inc)}.`,
          `Structure « either-or » : on paie le plus élevé des deux, ${M(fee)}, pas la somme.`,
          `Rendement net = (${M(v1)} − ${M(fee)}) / ${M(v0)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 160, r = 0.015;
      const o: FeeOpts = { m: 0.02, p: 0.2, mgmtBase: "end", netOfMgmt: true };
      const v1 = v0 * (1 + r);
      const { t, lines } = feeLines(v0, v1, o, M);
      const a = t.ret * 100;
      return q("ai-fee-d3", "difficile", "Investor's after-fee return for the year?",
        [["Initial fund value", mil(v0)], ["Gross return for the year", spc(r)], [mgmtLbl(o), pc(o.m)], [incLbl(o), pc(o.p)]],
        a, "%", 2,
        [`Valeur brute de fin = ${M(v0)} × ${F(1 + r)} = ${M(v1)}.`, ...lines,
          `Rendement net = ${M(t.vNet)} / ${M(v0)} − 1 = ${Pa(a)} : un rendement brut positif devient négatif après frais.`]);
    })(),
    (() => {
      const v0 = 400, r = 0.09;
      const o: FeeOpts = { m: 0.02, p: 0.2, mgmtBase: "begin", netOfMgmt: true };
      const v1 = v0 * (1 + r);
      const { t, lines } = feeLines(v0, v1, o, M);
      const a = (t.fees / (v1 - v0)) * 100;
      return q("ai-fee-d4", "difficile", "Percentage of the fund's gross gain captured by the manager through fees?",
        [["Initial fund value", mil(v0)], ["Gross return for the year", pc(r)], [mgmtLbl(o), pc(o.m)], [incLbl(o), pc(o.p)]],
        a, "%", 2,
        [`Gain brut = ${M(v0)} × ${P(r)} = ${M(v1 - v0)}.`, ...lines,
          `Part captée par le gérant = ${M(t.fees)} / ${M(v1 - v0)} = ${Pa(a)} : l'investisseur ne garde que ${P(1 - a / 100, 2)} du gain brut.`]);
    })(),
    (() => {
      const net = 0.12, m = 0.015, p = 0.2, size = 500;
      const g = net / (1 - p) + m;
      const a = g * 100;
      return q("ai-fee-d5", "difficile", "Gross return the fund earned during the year?",
        [["Investor's after-fee return", pc(net)], ["Fund size at the start of the year", mil(size)],
          ["Management fee (on beginning-of-year assets)", pc(m)], ["Incentive fee (on gains net of the management fee)", pc(p)]],
        a, "%", 2,
        ["Frais de gestion sur la valeur de début : le rendement après frais de gestion vaut g − m.",
          `Incentive nette des frais de gestion : rendement net = (g − m) × (1 − p) = (g − ${F(m)}) × ${F(1 - p)}.`,
          `g − ${F(m)} = ${F(net)} / ${F(1 - p)} = ${F(net / (1 - p))} ; g = ${Pa(a)} (la taille du fonds ne sert pas).`]);
    })(),
  ],
};

/* ────────────────────────── 2 · Hurdle rate ────────────────────────── */

const HURDLE: CalcType = {
  key: "hurdle-rate",
  topic: "alternatives",
  name: "Hurdle rate soft ou hard",
  tier: "essentiel",
  top: true,
  source: "LM 1 · Alternative Investment Features, Methods, and Structures",
  formulas: [
    "Soft hurdle : si le rendement atteint le hurdle, incentive = p × gain total ; sinon 0",
    "Hard hurdle : incentive = p × max[0 ; rendement − hurdle] (seul l'excédent est rémunéré)",
    "Le rendement testé est souvent net des frais de gestion : lire l'énoncé",
  ],
  traps: [
    "Soft : tout ou rien ; une fois le hurdle franchi, la commission porte sur la totalité du gain.",
    "Hard : la commission ne porte que sur la part du gain au-dessus du hurdle.",
    "Si l'incentive est nette des frais de gestion, c'est le rendement après frais de gestion qu'on compare au hurdle.",
  ],
  questions: [
    (() => {
      const R = 0.15, h = 0.06, p = 0.2;
      const a = (R >= h ? p * R : 0) * 100;
      return q("ai-hurdle-f1", "facile", "Performance fee as a percentage of the fund's beginning value?",
        [["Fund return for the year", pc(R)], ["Hurdle rate (soft)", pc(h)], ["Performance fee", pc(p)]],
        a, "%", 2,
        [`${P(R)} ≥ hurdle ${P(h)} : le soft hurdle est franchi.`,
          `Soft hurdle : la commission porte sur tout le rendement = ${P(p)} × ${P(R)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const R = 0.13, h = 0.07, p = 0.2;
      const a = p * Math.max(0, R - h) * 100;
      return q("ai-hurdle-f2", "facile", "Performance fee as a percentage of the fund's beginning value?",
        [["Fund return for the year", pc(R)], ["Hurdle rate (hard)", pc(h)], ["Performance fee", pc(p)]],
        a, "%", 2,
        [`Hard hurdle : seul l'excédent est rémunéré, ${P(R)} − ${P(h)} = ${P(R - h)}.`,
          `Commission = ${P(p)} × ${P(R - h)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 250, R = 0.11, h = 0.05, p = 0.15;
      const a = p * (R - h) * v0;
      return q("ai-hurdle-f3", "facile", "Incentive fee, in $ millions? (Ignore the management fee.)",
        [["Fund value at the start of the year", mil(v0)], ["Fund return for the year", pc(R)], ["Hurdle rate (hard)", pc(h)], ["Incentive fee", pc(p)]],
        a, "$", 2,
        [`Gain au-dessus du hurdle = (${P(R)} − ${P(h)}) × ${M(v0)} = ${M((R - h) * v0)}.`,
          `Incentive = ${P(p)} × ${M((R - h) * v0)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const R = 0.07, h = 0.08, p = 0.2;
      const fee = R >= h ? p * R : 0;
      const a = (R - fee) * 100;
      return q("ai-hurdle-f4", "facile", "Investor's return after the performance fee? (Ignore the management fee.)",
        [["Fund return for the year", pc(R)], ["Hurdle rate (soft)", pc(h)], ["Performance fee", pc(p)]],
        a, "%", 2,
        [`${P(R)} < hurdle ${P(h)} : le soft hurdle n'est pas atteint, aucune commission de performance.`,
          `Rendement de l'investisseur = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 100, R = 0.12, h = 0.08, p = 0.2;
      const soft = p * R * v0, hard = p * (R - h) * v0;
      const a = soft - hard;
      return q("ai-hurdle-f5", "facile", "How much higher is the performance fee with a soft hurdle than with a hard hurdle, in $ millions?",
        [["Fund value at the start of the year", mil(v0)], ["Fund return for the year", pc(R)], ["Hurdle rate", pc(h)], ["Performance fee", pc(p)]],
        a, "$", 2,
        [`Soft : ${P(p)} × ${P(R)} × ${M(v0)} = ${M(soft)}.`,
          `Hard : ${P(p)} × (${P(R)} − ${P(h)}) × ${M(v0)} = ${M(hard)}.`,
          `Écart = ${M(a, 2)} (= ${P(p)} × hurdle × capital).`]);
    })(),
    (() => {
      const v0 = 100, r = 0.24;
      const o: FeeOpts = { m: 0.02, p: 0.2, mgmtBase: "end", netOfMgmt: true, hurdle: 0.1, hurdleType: "hard" };
      const v1 = v0 * (1 + r);
      const { t, lines } = feeLines(v0, v1, o, F);
      const a = t.ret * 100;
      return q("ai-hurdle-m1", "moyen", "Investor's after-fee return for the year?",
        [["Gross return for the year", pc(r)], [mgmtLbl(o), pc(o.m)], [incLbl(o), pc(o.p)], [hurdleLbl(o), pc(o.hurdle ?? 0)]],
        a, "%", 2,
        [`Sur une base de 100 : valeur brute de fin = ${F(v1)}.`, ...lines,
          `Rendement net = ${F(t.vNet)} / 100 − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 200, r = 0.12;
      const o: FeeOpts = { m: 0.015, p: 0.2, mgmtBase: "begin", netOfMgmt: true, hurdle: 0.08, hurdleType: "soft" };
      const v1 = v0 * (1 + r);
      const { t, lines } = feeLines(v0, v1, o, M);
      const a = t.ret * 100;
      return q("ai-hurdle-m2", "moyen", "Investor's after-fee return for the year?",
        [["Fund value at the start of the year", mil(v0)], ["Gross return for the year", pc(r)], [mgmtLbl(o), pc(o.m)], [incLbl(o), pc(o.p)],
          [hurdleLbl(o), pc(o.hurdle ?? 0)]],
        a, "%", 2,
        [`Valeur brute de fin = ${M(v0)} × ${F(1 + r)} = ${M(v1)}.`, ...lines,
          `Rendement net = ${M(t.vNet)} / ${M(v0)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 150, r = 0.16;
      const o: FeeOpts = { m: 0.02, p: 0.2, mgmtBase: "end", netOfMgmt: false, hurdle: 0.06, hurdleType: "hard" };
      const v1 = v0 * (1 + r);
      const { t, lines } = feeLines(v0, v1, o, M);
      const a = t.fees;
      return q("ai-hurdle-m3", "moyen", "Total fees for the year, in $ millions?",
        [["Fund value at the start of the year", mil(v0)], ["Gross return for the year", pc(r)], [mgmtLbl(o), pc(o.m)], [incLbl(o), pc(o.p)],
          [hurdleLbl(o), pc(o.hurdle ?? 0)]],
        a, "$", 2,
        [`Valeur brute de fin = ${M(v0)} × ${F(1 + r)} = ${M(v1)}.`, ...lines,
          `Total des frais = ${M(a, 2)}.`]);
    })(),
    (() => {
      const v0 = 100, r = 0.09;
      const o: FeeOpts = { m: 0.02, p: 0.2, mgmtBase: "end", netOfMgmt: true, hurdle: 0.07, hurdleType: "soft" };
      const v1 = v0 * (1 + r);
      const { t, lines } = feeLines(v0, v1, o, F);
      const a = t.ret * 100;
      return q("ai-hurdle-m4", "moyen", "Investor's after-fee return for the year?",
        [["Gross return for the year", pc(r)], [mgmtLbl(o), pc(o.m)], [incLbl(o), pc(o.p)], [hurdleLbl(o), pc(o.hurdle ?? 0)]],
        a, "%", 2,
        [`Sur une base de 100 : valeur brute de fin = ${F(v1)}.`, ...lines,
          `Rendement net = ${Pa(a)} : le brut (${P(r)}) dépasse le hurdle, mais pas le rendement net des frais de gestion.`]);
    })(),
    (() => {
      const v0 = 80, r = 0.15;
      const o: FeeOpts = { m: 0.01, p: 0.2, mgmtBase: "begin", netOfMgmt: true, hurdle: 0.05, hurdleType: "hard" };
      const v1 = v0 * (1 + r);
      const { t, lines } = feeLines(v0, v1, o, M);
      const a = t.vNet - v0;
      return q("ai-hurdle-m5", "moyen", "Investor's gain after all fees, in $ millions?",
        [["Fund value at the start of the year", mil(v0)], ["Gross return for the year", pc(r)], [mgmtLbl(o), pc(o.m)], [incLbl(o), pc(o.p)],
          [hurdleLbl(o), pc(o.hurdle ?? 0)]],
        a, "$", 2,
        [`Valeur brute de fin = ${M(v0)} × ${F(1 + r)} = ${M(v1)}.`, ...lines,
          `Gain net de l'investisseur = ${M(t.vNet)} − ${M(v0)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const v0 = 100, r = 0.2;
      const soft: FeeOpts = { m: 0.02, p: 0.2, mgmtBase: "end", netOfMgmt: true, hurdle: 0.08, hurdleType: "soft" };
      const hard: FeeOpts = { ...soft, hurdleType: "hard" };
      const v1 = v0 * (1 + r);
      const s = hfFees(v0, v1, soft), h = hfFees(v0, v1, hard);
      const a = (h.ret - s.ret) * 10000;
      return q("ai-hurdle-d1", "difficile", "By how many basis points is the investor's after-fee return higher with a hard hurdle than with a soft hurdle?",
        [["Gross return for the year", pc(r)], [mgmtLbl(soft), pc(soft.m)], [incLbl(soft), pc(soft.p)], ["Hurdle rate (tested on the return net of the management fee)", pc(soft.hurdle ?? 0)]],
        a, "bp", 0,
        [`Sur 100 : valeur brute ${F(v1)} ; frais de gestion = ${P(soft.m)} × ${F(v1)} = ${F(s.mgmt)} ; gain net des frais de gestion = ${F(s.gain)}.`,
          `Soft (${P(s.gain / v0, 2)} ≥ ${P(soft.hurdle ?? 0)}) : incentive = ${P(soft.p)} × ${F(s.gain)} = ${F(s.incentive)} → net ${P(s.ret, 2)}.`,
          `Hard : incentive = ${P(soft.p)} × (${F(s.gain)} − ${F(h.hurdleAmt)}) = ${F(h.incentive)} → net ${P(h.ret, 2)}.`,
          `Écart = ${F(s.incentive - h.incentive)} pour 100, soit ${F(a, 0)} bp.`]);
    })(),
    (() => {
      const target = 0.1, m = 0.01, p = 0.2, h = 0.06;
      const g = (target - p * h) / (1 - p) + m;
      const a = g * 100;
      const chk = hfFees(100, 100 * (1 + g), { m, p, mgmtBase: "begin", netOfMgmt: true, hurdle: h, hurdleType: "hard" });
      return q("ai-hurdle-d2", "difficile", "Gross return needed for the investor to earn the target after-fee return?",
        [["Target after-fee return", pc(target)], ["Management fee (on beginning-of-year assets)", pc(m)],
          ["Incentive fee (on gains net of the management fee)", pc(p)], ["Hurdle rate (hard, tested on the return net of the management fee)", pc(h)]],
        a, "%", 2,
        ["Rendement net = (g − m) − p × (g − m − hurdle) = (g − m) × (1 − p) + p × hurdle.",
          `${F(target)} = (g − ${F(m)}) × ${F(1 - p)} + ${F(p)} × ${F(h)} ⇒ g − ${F(m)} = (${F(target)} − ${F(p * h)}) / ${F(1 - p)} = ${F(g - m)}.`,
          `g = ${Pa(a)}.`,
          `Vérification sur 100 : frais ${F(chk.mgmt, 4)} + ${F(chk.incentive, 4)} → net ${P(chk.ret, 2)}.`]);
    })(),
    (() => {
      const v0 = 100, r = 0.115;
      const o: FeeOpts = { m: 0.01, p: 0.2, mgmtBase: "begin", netOfMgmt: true, hurdle: 0.1, hurdleType: "soft" };
      const v1 = v0 * (1 + r);
      const { t, lines } = feeLines(v0, v1, o, F);
      const a = t.ret * 100;
      return q("ai-hurdle-d3", "difficile", "Investor's after-fee return for the year?",
        [["Gross return for the year", pc(r)], [mgmtLbl(o), pc(o.m)], [incLbl(o), pc(o.p)], [hurdleLbl(o), pc(o.hurdle ?? 0)]],
        a, "%", 2,
        [`Sur une base de 100 : valeur brute de fin = ${F(v1)}.`, ...lines,
          `Rendement net = ${Pa(a)} : le soft hurdle franchi de peu déclenche la commission sur tout le gain, et l'investisseur finit sous le hurdle.`]);
    })(),
    (() => {
      const v0 = 500, r = 0.14;
      const o: FeeOpts = { m: 0.02, p: 0.2, mgmtBase: "end", netOfMgmt: true, hurdle: 0.08, hurdleType: "hard" };
      const v1 = v0 * (1 + r);
      const { t, lines } = feeLines(v0, v1, o, M);
      const a = t.fees;
      return q("ai-hurdle-d4", "difficile", "Total fees earned by the manager for the year, in $ millions?",
        [["Fund value at the start of the year", mil(v0)], ["Gross return for the year", pc(r)], [mgmtLbl(o), pc(o.m)], [incLbl(o), pc(o.p)],
          [hurdleLbl(o), pc(o.hurdle ?? 0)], ["Lockup period / notice period", "2 years / 60 days"]],
        a, "$", 2,
        [`Valeur brute de fin = ${M(v0)} × ${F(1 + r)} = ${M(v1)} (lock-up et préavis n'interviennent pas dans les frais).`, ...lines,
          `Total des frais = ${M(a, 2)}.`]);
    })(),
    (() => {
      const v0 = 120, R = 0.18, p = 0.2, fee = 1.68;
      const h = R - fee / (p * v0);
      const a = h * 100;
      return q("ai-hurdle-d5", "difficile", "Hard hurdle rate implied by the incentive fee paid?",
        [["Fund value at the start of the year", mil(v0)], ["Fund return for the year", pc(R)], ["Incentive fee rate (management fee ignored)", pc(p)],
          ["Incentive fee paid", mil(fee)]],
        a, "%", 2,
        [`Incentive = ${P(p)} × (R − hurdle) × V0, donc R − hurdle = ${F(fee)} / (${F(p)} × ${F(v0)}) = ${P(fee / (p * v0), 2)}.`,
          `Hurdle = ${P(R)} − ${P(fee / (p * v0), 2)} = ${Pa(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 3 · High-water mark ────────────────────────── */

const HWM_OPTS: HwmOpts = { m: 0.02, p: 0.2, mgmtBase: "begin", netOfMgmt: true };

const HIGH_WATER_MARK: CalcType = {
  key: "high-water-mark",
  topic: "alternatives",
  name: "High-water mark",
  tier: "essentiel",
  top: true,
  source: "LM 2 · Alternative Investment Performance and Returns",
  formulas: [
    "High-water mark (HWM) = plus haute valeur nette de frais atteinte en fin de période (au départ : la mise initiale)",
    "Incentive fee = p × max[0 ; valeur après frais de gestion − HWM]",
    "Nouveau HWM = max(ancien HWM ; valeur de fin d'année après tous les frais)",
  ],
  traps: [
    "Après une perte, aucune commission tant que la valeur ne repasse pas au-dessus du HWM : la remontée jusqu'au HWM est gratuite.",
    "Le HWM se fixe sur la valeur nette de frais, et il ne baisse jamais.",
    "Chaque investisseur a son propre HWM selon sa date d'entrée.",
  ],
  questions: [
    (() => {
      const hwm = 100, start = 95, afterMgmt = 108, p = 0.2;
      const base = Math.max(0, afterMgmt - hwm);
      const a = p * base;
      return q("ai-hwm-f1", "facile", "Incentive fee for the year, in $ millions?",
        [["High-water mark", mil(hwm)], ["Fund value at the start of the year", mil(start)],
          ["Year-end value after the management fee", mil(afterMgmt)], ["Incentive fee (on value above the high-water mark)", pc(p)]],
        a, "$", 2,
        [`Seule la valeur au-dessus du HWM est rémunérée : la remontée de ${M(start)} à ${M(hwm)} ne compte pas.`,
          `Base = ${M(afterMgmt)} − ${M(hwm)} = ${M(base)}.`,
          `Incentive = ${P(p)} × ${M(base)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const hwm = 220, start = 160, gross = 196, m = 0.02, p = 0.2;
      const mgmt = m * gross, after = gross - mgmt;
      const inc = p * Math.max(0, after - hwm);
      const a = after - inc;
      return q("ai-hwm-f2", "facile", "Year-end value of the fund after all fees, in $ millions?",
        [["High-water mark", mil(hwm)], ["Fund value at the start of the year", mil(start)], ["Year-end value before fees", mil(gross)],
          ["Management fee (on year-end assets)", pc(m)], ["Incentive fee (on value above the high-water mark, net of the management fee)", pc(p)]],
        a, "$", 2,
        [`Frais de gestion = ${P(m)} × ${M(gross)} = ${M(mgmt)} ; valeur après frais de gestion = ${M(after)}.`,
          `${M(after)} < HWM ${M(hwm)} : pas d'incentive fee, malgré le gain de l'année.`,
          `Valeur nette = ${M(a, 2)}.`]);
    })(),
    (() => {
      const hwm = 120, now = 102;
      const a = (hwm / now - 1) * 100;
      return q("ai-hwm-f3", "facile", "Gross return needed before the manager can earn any incentive fee? (Ignore the management fee.)",
        [["High-water mark", mil(hwm)], ["Current fund value", mil(now)]],
        a, "%", 2,
        ["Aucune commission tant que la valeur ne dépasse pas le HWM.",
          `Rendement nécessaire = ${M(hwm)} / ${M(now)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const nav = 96, hwmA = 100, hwmB = 90, p = 0.2;
      const a = p * Math.max(0, nav - hwmB);
      return q("ai-hwm-f4", "facile", "Incentive fee per share owed by investor B?",
        [["NAV per share at year-end, after the management fee", usd(nav, 2)], ["Investor A's high-water mark per share", usd(hwmA, 2)],
          ["Investor B's high-water mark per share", usd(hwmB, 2)], ["Incentive fee (on value above each investor's high-water mark)", pc(p)]],
        a, "$", 2,
        [`Chaque investisseur a son propre HWM : celui de B est ${D(hwmB, 2)}.`,
          `Incentive de B = ${P(p)} × (${D(nav, 2)} − ${D(hwmB, 2)}) = ${D(a, 2)} par part (A ne paie rien, ${D(nav, 2)} < ${D(hwmA, 2)}).`]);
    })(),
    (() => {
      const v0 = 100, r = 0.15;
      const path = hwmPath(v0, [r], HWM_OPTS);
      const a = path[0].newHwm;
      return q("ai-hwm-f5", "facile", "High-water mark at the end of the year, in $ millions?",
        [["Fund value at the start of the year (= high-water mark)", mil(v0)], ["Gross return for the year", pc(r)],
          ["Management fee (on beginning-of-year assets)", pc(HWM_OPTS.m)], ["Incentive fee (net of the management fee, above the high-water mark)", pc(HWM_OPTS.p)]],
        a, "$", 2,
        [...hwmLines(path, HWM_OPTS),
          `Le nouveau HWM est la valeur nette de tous les frais : ${M(a, 2)}, pas la valeur brute ${M(path[0].gross)}.`]);
    })(),
    (() => {
      const v0 = 100, rets = [-0.1, 0.25];
      const path = hwmPath(v0, rets, HWM_OPTS);
      const a = path[1].fees;
      return q("ai-hwm-m1", "moyen", "Total fees for Year 2, in $ millions?",
        [["Initial fund value", mil(v0)], ["Gross return Year 1 / Year 2", lst(rets.map(spc))],
          ["Management fee (on beginning-of-year assets)", pc(HWM_OPTS.m)], ["Incentive fee (net of the management fee)", pc(HWM_OPTS.p)],
          ["High-water mark", "Yes"]],
        a, "$", 2,
        [...hwmLines(path, HWM_OPTS),
          `Frais de l'année 2 = ${M(path[1].mgmt)} + ${M(path[1].incentive)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const v0 = 250, rets = [-0.08, 0.2];
      const o: HwmOpts = { ...HWM_OPTS, m: 0.015 };
      const path = hwmPath(v0, rets, o);
      const a = path[1].ret * 100;
      return q("ai-hwm-m2", "moyen", "Investor's after-fee return in Year 2?",
        [["Initial fund value", mil(v0)], ["Gross return Year 1 / Year 2", lst(rets.map(spc))],
          ["Management fee (on beginning-of-year assets)", pc(o.m)], ["Incentive fee (net of the management fee)", pc(o.p)],
          ["High-water mark", "Yes"]],
        a, "%", 2,
        [...hwmLines(path, o),
          `Rendement net de l'année 2 = ${M(path[1].end)} / ${M(path[1].start)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 80, hwm = 84, r = 0.12;
      const o: HwmOpts = { m: 0.02, p: 0.2, mgmtBase: "end", netOfMgmt: true };
      const path = hwmPath(v0, [r], o, hwm);
      const a = path[0].fees;
      return q("ai-hwm-m3", "moyen", "Total fees for the year, in $ millions?",
        [["Fund value at the start of the year", mil(v0)], ["High-water mark", mil(hwm)], ["Gross return for the year", pc(r)],
          ["Management fee (on year-end assets)", pc(o.m)], ["Incentive fee (net of the management fee, above the high-water mark)", pc(o.p)]],
        a, "$", 2,
        [...hwmLines(path, o),
          `Seuls ${M(path[0].base)} dépassent le HWM : total des frais = ${M(path[0].mgmt)} + ${M(path[0].incentive)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const nav0 = 110, r = 0.1, m = 0.01, p = 0.2, hwmX = 120, hwmY = 105, nX = 1, nY = 2;
      const gross = nav0 * (1 + r), after = gross - m * gross;
      const feeX = p * Math.max(0, after - hwmX), feeY = p * Math.max(0, after - hwmY);
      const a = feeX * nX + feeY * nY;
      return q("ai-hwm-m4", "moyen", "Total incentive fees earned on the two investors' shares, in $ millions?",
        [["NAV per share at the start of the year", usd(nav0, 2)], ["Gross return for the year", pc(r)], ["Management fee (on year-end NAV)", pc(m)],
          ["Incentive fee (net of the management fee, above each investor's high-water mark)", pc(p)],
          ["Investor X: high-water mark / shares (millions)", lst([usd(hwmX, 2), E(nX)])],
          ["Investor Y: high-water mark / shares (millions)", lst([usd(hwmY, 2), E(nY)])]],
        a, "$", 2,
        [`NAV brute = ${D(nav0, 2)} × ${F(1 + r)} = ${D(gross, 2)} ; après frais de gestion = ${D(gross, 2)} × ${F(1 - m)} = ${D(after, 4)}.`,
          `X : ${D(after, 4)} < HWM ${D(hwmX, 2)} → pas d'incentive.`,
          `Y : ${P(p)} × (${D(after, 4)} − ${D(hwmY, 2)}) = ${D(feeY, 4)} par part × ${F(nY)} millions de parts = ${M(feeY * nY)}.`,
          `Total = ${M(a, 2)}.`]);
    })(),
    (() => {
      const v0 = 60, rets = [0.3, -0.1];
      const path = hwmPath(v0, rets, HWM_OPTS);
      const a = path[1].newHwm;
      return q("ai-hwm-m5", "moyen", "High-water mark at the end of Year 2, in $ millions?",
        [["Initial fund value", mil(v0)], ["Gross return Year 1 / Year 2", lst(rets.map(spc))],
          ["Management fee (on beginning-of-year assets)", pc(HWM_OPTS.m)], ["Incentive fee (net of the management fee)", pc(HWM_OPTS.p)]],
        a, "$", 2,
        [...hwmLines(path, HWM_OPTS),
          `Le HWM ne baisse jamais : il reste à la valeur nette de fin d'année 1, ${M(a, 2)}.`]);
    })(),
    (() => {
      const v0 = 100, rets = [0.15, -0.1, 0.3];
      const path = hwmPath(v0, rets, HWM_OPTS);
      const a = path[2].incentive;
      return q("ai-hwm-d1", "difficile", "Incentive fee for Year 3, in $ millions?",
        [["Initial fund value", mil(v0)], ["Gross return Year 1 / Year 2 / Year 3", lst(rets.map(spc))],
          ["Management fee (on beginning-of-year assets)", pc(HWM_OPTS.m)], ["Incentive fee (net of the management fee)", pc(HWM_OPTS.p)],
          ["High-water mark", "Yes"]],
        a, "$", 2,
        [...hwmLines(path, HWM_OPTS),
          `Incentive de l'année 3 = ${M(a, 2)}, calculée au-dessus du HWM ${M(path[2].hwm)} et non au-dessus de la valeur de début ${M(path[2].start)}.`]);
    })(),
    (() => {
      const v0 = 200, g1 = 186, g2 = 222;
      const o: HwmOpts = { m: 0.02, p: 0.2, mgmtBase: "begin", netOfMgmt: true, hurdle: 0.05, hurdleType: "soft" };
      const end1 = g1 - o.m * v0;
      const path = hwmPath(v0, [g1 / v0 - 1, g2 / end1 - 1], o);
      const y2 = path[1];
      const a = y2.ret * 100;
      return q("ai-hwm-d2", "difficile", "Investor's after-fee return in Year 2?",
        [["Initial fund value", mil(v0)], ["Year-end value before fees, Year 1 / Year 2", lst([mil(g1), mil(g2)])],
          ["Management fee (on beginning-of-year assets)", pc(o.m)], ["Incentive fee (net of the management fee)", pc(o.p)],
          ["High-water mark", "Yes"], ["Hurdle rate (soft), applied to the gain above the high-water mark", pc(o.hurdle ?? 0)]],
        a, "%", 2,
        [`Année 1 : frais de gestion ${P(o.m)} × ${M(v0)} = ${M(path[0].mgmt)} ; ${M(g1)} − ${M(path[0].mgmt)} = ${M(path[0].end)} < HWM ${M(v0)} : pas d'incentive.`,
          `Année 2 : frais de gestion ${P(o.m)} × ${M(y2.start)} = ${M(y2.mgmt)} ; valeur après frais de gestion = ${M(y2.afterMgmt)}.`,
          `Gain au-dessus du HWM = ${M(y2.afterMgmt - y2.hwm)}, soit ${P((y2.afterMgmt - y2.hwm) / y2.hwm, 2)} du HWM ≥ ${P(o.hurdle ?? 0)} : soft hurdle franchi, incentive = ${P(o.p)} × ${M(y2.base)} = ${M(y2.incentive)}.`,
          `Valeur nette = ${M(g2)} − ${M(y2.fees)} = ${M(y2.end)} ; rendement = ${M(y2.end)} / ${M(y2.start)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 46, hwm = 50, r = 0.25;
      const o: HwmOpts = { m: 0.01, p: 0.2, mgmtBase: "end", netOfMgmt: true, hurdle: 0.06, hurdleType: "hard" };
      const path = hwmPath(v0, [r], o, hwm);
      const y = path[0];
      const a = y.incentive;
      return q("ai-hwm-d3", "difficile", "Incentive fee for the year, in $ millions?",
        [["Fund value at the start of the year", mil(v0)], ["High-water mark", mil(hwm)], ["Gross return for the year", pc(r)],
          ["Management fee (on year-end assets)", pc(o.m)], ["Incentive fee (net of the management fee)", pc(o.p)],
          ["Hurdle rate (hard), applied above the high-water mark", pc(o.hurdle ?? 0)]],
        a, "$", 2,
        [`Valeur brute = ${M(v0)} × ${F(1 + r)} = ${M(y.gross)} ; frais de gestion = ${P(o.m)} × ${M(y.gross)} = ${M(y.mgmt)} ; reste ${M(y.afterMgmt)}.`,
          `Seuil = HWM × (1 + hurdle) = ${M(hwm)} × ${F(1 + (o.hurdle ?? 0))} = ${M(hwm * (1 + (o.hurdle ?? 0)))} (hard : seul l'excédent compte).`,
          `Incentive = ${P(o.p)} × (${M(y.afterMgmt)} − ${M(hwm * (1 + (o.hurdle ?? 0)))}) = ${P(o.p)} × ${M(y.base)} = ${M(a, 3)}.`],
        0.006);
    })(),
    (() => {
      const v0 = 100, rets = [-0.2, 0.3];
      const withH = hwmPath(v0, rets, HWM_OPTS), without = hwmPath(v0, rets, { ...HWM_OPTS, noHwm: true });
      const a = without[1].fees - withH[1].fees;
      return q("ai-hwm-d4", "difficile", "How much lower are the Year 2 fees because of the high-water mark, in $ millions?",
        [["Initial fund value", mil(v0)], ["Gross return Year 1 / Year 2", lst(rets.map(spc))],
          ["Management fee (on beginning-of-year assets)", pc(HWM_OPTS.m)], ["Incentive fee (net of the management fee)", pc(HWM_OPTS.p)]],
        a, "$", 2,
        [...hwmLines(withH, HWM_OPTS),
          `Sans HWM, l'incentive de l'année 2 porterait sur le gain depuis le début d'année : ${P(HWM_OPTS.p)} × (${M(without[1].afterMgmt)} − ${M(without[1].start)}) = ${M(without[1].incentive)}.`,
          `Économie due au HWM = ${M(without[1].fees)} − ${M(withH[1].fees)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const v0 = 40, rets = [0.2, -0.15, 0.18];
      const path = hwmPath(v0, rets, HWM_OPTS);
      const a = (path[2].end / v0 - 1) * 100;
      return q("ai-hwm-d5", "difficile", "Investor's cumulative after-fee return over the three years?",
        [["Initial investment", mil(v0)], ["Gross return Year 1 / Year 2 / Year 3", lst(rets.map(spc))],
          ["Management fee (on beginning-of-year assets)", pc(HWM_OPTS.m)], ["Incentive fee (net of the management fee)", pc(HWM_OPTS.p)],
          ["High-water mark", "Yes"]],
        a, "%", 2,
        [...hwmLines(path, HWM_OPTS),
          `Rendement cumulé net = ${M(path[2].end)} / ${M(v0)} − 1 = ${Pa(a)} (brut : ${P(rets.reduce((acc, r) => acc * (1 + r), 1) - 1, 2)}).`]);
    })(),
  ],
};

/* ────────────────────────── 4 · Fund of funds ────────────────────────── */

const FOF: FeeOpts = { m: 0.01, p: 0.1, mgmtBase: "end", netOfMgmt: false };
const FUND: FeeOpts = { m: 0.02, p: 0.2, mgmtBase: "end", netOfMgmt: false };

const FUND_OF_FUNDS: CalcType = {
  key: "fund-of-funds-fees",
  topic: "alternatives",
  name: "Frais en cascade d'un fund of funds",
  tier: "essentiel",
  top: true,
  source: "LM 2 · Alternative Investment Performance and Returns",
  formulas: [
    "Étape 1 : valeur des fonds sous-jacents nette de leurs propres frais",
    "Étape 2 : frais du fund of funds (ex. « 1 and 10 ») calculés sur cette valeur nette",
    "Rendement net = valeur après les deux couches de frais / mise initiale − 1",
  ],
  traps: [
    "Deux couches de frais : ne pas oublier celles des fonds sous-jacents, ni les déduire deux fois si les valeurs sont déjà nettes.",
    "L'incentive du FoF porte sur le gain agrégé ; chaque fonds sous-jacent facture la sienne séparément, même si un autre perd.",
  ],
  questions: [
    (() => {
      const deals: Deal[] = [[50, 56], [30, 33]];
      const v0 = sum(deals.map((d) => d[0])), v1 = sum(deals.map((d) => d[1]));
      const { t, lines } = feeLines(v0, v1, FOF, M);
      const a = t.ret * 100;
      return q("ai-fof-f1", "facile", "Investor's return for the year, net of all fees?",
        [["Investment in Fund A: initial / year-end (net of fund fees)", `${mil(deals[0][0])} / ${mil(deals[0][1])}`],
          ["Investment in Fund B: initial / year-end (net of fund fees)", `${mil(deals[1][0])} / ${mil(deals[1][1])}`],
          ["Fund-of-funds fees", "1 and 10, independent, on year-end values"]],
        a, "%", 2,
        [`Valeur de fin (déjà nette des frais des fonds) = ${M(deals[0][1])} + ${M(deals[1][1])} = ${M(v1)} pour une mise de ${M(v0)}.`, ...lines,
          `Rendement net = ${M(t.vNet)} / ${M(v0)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const deals: Deal[] = [[40, 46], [60, 64]];
      const m = 0.015;
      const v1 = sum(deals.map((d) => d[1]));
      const a = m * v1;
      return q("ai-fof-f2", "facile", "Fund-of-funds management fee, in $ millions?",
        [["Investment in Fund A: initial / year-end (net of fund fees)", `${mil(deals[0][0])} / ${mil(deals[0][1])}`],
          ["Investment in Fund B: initial / year-end (net of fund fees)", `${mil(deals[1][0])} / ${mil(deals[1][1])}`],
          ["Fund-of-funds management fee (on year-end value)", pc(m)]],
        a, "$", 2,
        [`Valeur de fin = ${M(deals[0][1])} + ${M(deals[1][1])} = ${M(v1)}.`,
          `Frais de gestion du FoF = ${P(m)} × ${M(v1)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const deals: Deal[] = [[60, 70], [60, 62]];
      const v0 = sum(deals.map((d) => d[0])), v1 = sum(deals.map((d) => d[1]));
      const a = FOF.p * (v1 - v0);
      return q("ai-fof-f3", "facile", "Fund-of-funds incentive fee, in $ millions?",
        [["Investment in Fund A: initial / year-end (net of fund fees)", `${mil(deals[0][0])} / ${mil(deals[0][1])}`],
          ["Investment in Fund B: initial / year-end (net of fund fees)", `${mil(deals[1][0])} / ${mil(deals[1][1])}`],
          ["Fund-of-funds fees", "1 and 10, independent, on year-end values"]],
        a, "$", 2,
        [`Gain agrégé = ${M(v1)} − ${M(v0)} = ${M(v1 - v0)}.`,
          `Incentive du FoF (indépendante des frais de gestion) = ${P(FOF.p)} × ${M(v1 - v0)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const v0 = 25, n = 0.16;
      const v1 = v0 * (1 + n);
      const { t, lines } = feeLines(v0, v1, FOF, M);
      const a = t.fees;
      return q("ai-fof-f4", "facile", "Total fund-of-funds fees for the year, in $ millions?",
        [["Investment in the fund of funds", mil(v0)], ["Return of the underlying funds, net of their fees", pc(n)],
          ["Fund-of-funds fees", "1 and 10, independent, on year-end values"]],
        a, "$", 2,
        [`Valeur avant frais du FoF = ${M(v0)} × ${F(1 + n)} = ${M(v1)}.`, ...lines,
          `Total des frais du FoF = ${M(a, 2)} (et non ${M(FOF.m * v0 + t.incentive, 2)} avec les frais de gestion sur la mise).`]);
    })(),
    (() => {
      const v0 = 100, n = 0.1;
      const v1 = v0 * (1 + n);
      const { t, lines } = feeLines(v0, v1, FOF, F);
      const a = t.ret * 100;
      return q("ai-fof-f5", "facile", "Investor's return net of the fund-of-funds fees?",
        [["Return of the underlying funds, net of their fees", pc(n)], ["Fund-of-funds fees", "1 and 10, independent, on year-end values"]],
        a, "%", 2,
        [`Sur une base de 100 : valeur avant frais du FoF = ${F(v1)}.`, ...lines,
          `Rendement net = ${Pa(a)}.`]);
    })(),
    (() => {
      const g = 0.2, v0 = 100;
      const u = hfFees(v0, v0 * (1 + g), FUND);
      const f = hfFees(v0, u.vNet, FOF);
      const a = f.ret * 100;
      return q("ai-fof-m1", "moyen", "Investor's return net of both layers of fees?",
        [["Gross return of the underlying hedge fund", pc(g)], ["Underlying fund fees", "2 and 20, independent, on year-end values"],
          ["Fund-of-funds fees", "1 and 10, independent, on year-end values"]],
        a, "%", 2,
        [`Sur 100 : fonds sous-jacent brut ${F(v0 * (1 + g))} ; frais ${F(u.mgmt)} + ${P(FUND.p)} × ${F(v0 * g)} = ${F(u.fees)} → ${F(u.vNet)}.`,
          `FoF : frais ${P(FOF.m)} × ${F(u.vNet)} = ${F(f.mgmt)} + ${P(FOF.p)} × ${F(u.vNet - v0)} = ${F(f.incentive)} → ${F(f.vNet)}.`,
          `Rendement net = ${Pa(a)} pour un brut de ${P(g)}.`]);
    })(),
    (() => {
      const deals: Deal[] = [[45, 51.3], [45, 48.6]];
      const o: FeeOpts = { ...FOF, netOfMgmt: true };
      const v0 = sum(deals.map((d) => d[0])), v1 = sum(deals.map((d) => d[1]));
      const { t, lines } = feeLines(v0, v1, o, M);
      const a = t.ret * 100;
      return q("ai-fof-m2", "moyen", "Investor's return for the year, net of all fees?",
        [["Investment in Fund A: initial / year-end (net of fund fees)", `${mil(deals[0][0])} / ${mil(deals[0][1])}`],
          ["Investment in Fund B: initial / year-end (net of fund fees)", `${mil(deals[1][0])} / ${mil(deals[1][1])}`],
          ["Fund-of-funds management fee (on year-end value)", pc(o.m)], ["Fund-of-funds incentive fee (net of its management fee)", pc(o.p)]],
        a, "%", 2,
        [`Valeur de fin = ${M(deals[0][1])} + ${M(deals[1][1])} = ${M(v1)}.`, ...lines,
          `Rendement net = ${M(t.vNet)} / ${M(v0)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const g = 0.18, v0 = 100;
      const u = hfFees(v0, v0 * (1 + g), FUND);
      const f = hfFees(v0, u.vNet, FOF);
      const total = v0 * (1 + g) - f.vNet;
      const a = (total / v0) * 100;
      return q("ai-fof-m3", "moyen", "Total fees of both layers, as a percentage of the initial investment?",
        [["Gross return of the underlying hedge fund", pc(g)], ["Underlying fund fees", "2 and 20, independent, on year-end values"],
          ["Fund-of-funds fees", "1 and 10, independent, on year-end values"]],
        a, "%", 2,
        [`Sur 100 : frais du fonds = ${F(u.mgmt)} + ${F(u.incentive)} = ${F(u.fees)} → ${F(u.vNet)}.`,
          `Frais du FoF = ${F(f.mgmt)} + ${F(f.incentive)} = ${F(f.fees)} → ${F(f.vNet)}.`,
          `Total = ${F(u.fees)} + ${F(f.fees)} = ${F(total)}, soit ${Pa(a)} de la mise.`]);
    })(),
    (() => {
      const g = 0.15, v0 = 100;
      const u = hfFees(v0, v0 * (1 + g), FUND);
      const f = hfFees(v0, u.vNet, FOF);
      const a = (u.ret - f.ret) * 10000;
      return q("ai-fof-m4", "moyen", "By how many basis points does investing through the fund of funds reduce the net return, compared with investing directly in the hedge fund?",
        [["Gross return of the hedge fund", pc(g)], ["Hedge fund fees", "2 and 20, independent, on year-end values"],
          ["Fund-of-funds fees", "1 and 10, independent, on year-end values"]],
        a, "bp", 0,
        [`En direct (sur 100) : ${F(v0 * (1 + g))} − ${F(u.mgmt)} − ${F(u.incentive)} = ${F(u.vNet)} → ${P(u.ret, 2)}.`,
          `Via le FoF : ${F(u.vNet)} − ${F(f.mgmt)} − ${F(f.incentive)} = ${F(f.vNet)} → ${P(f.ret, 2)}.`,
          `Coût de la seconde couche = ${F(a, 1)} bp, soit environ ${F(a, 0)} bp.`]);
    })(),
    (() => {
      const deals: Deal[] = [[60, 69], [40, 34]];
      const v0 = sum(deals.map((d) => d[0])), v1 = sum(deals.map((d) => d[1]));
      const { t, lines } = feeLines(v0, v1, FOF, M);
      const a = t.ret * 100;
      return q("ai-fof-m5", "moyen", "Investor's return for the year, net of all fees?",
        [["Investment in Fund A: initial / year-end (net of fund fees)", `${mil(deals[0][0])} / ${mil(deals[0][1])}`],
          ["Investment in Fund B: initial / year-end (net of fund fees)", `${mil(deals[1][0])} / ${mil(deals[1][1])}`],
          ["Fund-of-funds fees", "1 and 10, independent, on year-end values"]],
        a, "%", 2,
        [`Valeur de fin = ${M(deals[0][1])} + ${M(deals[1][1])} = ${M(v1)} : la perte de B compense en partie le gain de A au niveau du FoF.`, ...lines,
          `Rendement net = ${M(t.vNet)} / ${M(v0)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const a0 = 50, b0 = 50, ga = 0.3, gb = -0.1;
      const ua = hfFees(a0, a0 * (1 + ga), FUND), ub = hfFees(b0, b0 * (1 + gb), FUND);
      const v1 = ua.vNet + ub.vNet, v0 = a0 + b0;
      const f = hfFees(v0, v1, FOF);
      const a = f.ret * 100;
      return q("ai-fof-d1", "difficile", "Investor's return for the year, net of all fees?",
        [["Fund-of-funds investment", `${mil(v0)}, split equally between Fund A and Fund B`], ["Gross return Fund A / Fund B", lst([spc(ga), spc(gb)])],
          ["Fees of each underlying fund", "2 and 20, independent, on year-end values"], ["Fund-of-funds fees", "1 and 10, independent, on year-end values"]],
        a, "%", 2,
        [`Fonds A : brut ${M(a0 * (1 + ga))} ; frais ${M(ua.mgmt)} + ${M(ua.incentive)} → ${M(ua.vNet)}.`,
          `Fonds B : brut ${M(b0 * (1 + gb))} ; frais de gestion ${M(ub.mgmt)}, pas d'incentive (perte) → ${M(ub.vNet)}.`,
          `FoF : valeur ${M(v1)} ; frais ${P(FOF.m)} × ${M(v1)} = ${M(f.mgmt)} + ${P(FOF.p)} × ${M(v1 - v0)} = ${M(f.incentive)} → ${M(f.vNet)}.`,
          `Rendement net = ${Pa(a)} : l'incentive de A est payée en entier malgré la perte de B.`]);
    })(),
    (() => {
      const g = 0.25, v0 = 100;
      const u = hfFees(v0, v0 * (1 + g), FUND);
      const f = hfFees(v0, u.vNet, FOF);
      const total = u.fees + f.fees;
      const a = (total / (v0 * g)) * 100;
      return q("ai-fof-d2", "difficile", "Percentage of the gross gain absorbed by the two layers of fees?",
        [["Gross return of the underlying hedge fund", pc(g)], ["Underlying fund fees", "2 and 20, independent, on year-end values"],
          ["Fund-of-funds fees", "1 and 10, independent, on year-end values"]],
        a, "%", 2,
        [`Sur 100 : gain brut ${F(v0 * g)} ; frais du fonds ${F(u.mgmt)} + ${F(u.incentive)} = ${F(u.fees)} → ${F(u.vNet)}.`,
          `Frais du FoF = ${F(f.mgmt)} + ${F(f.incentive)} = ${F(f.fees)} → ${F(f.vNet)}.`,
          `Part du gain brut absorbée = ${F(total)} / ${F(v0 * g)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const target = 0.08;
      const n = (target + FOF.m) / (1 - FOF.m - FOF.p);
      const g = (n + FUND.m) / (1 - FUND.m - FUND.p);
      const a = g * 100;
      const chk = hfFees(100, hfFees(100, 100 * (1 + g), FUND).vNet, FOF);
      return q("ai-fof-d3", "difficile", "Gross return the underlying hedge fund must earn for the investor to net the target return?",
        [["Investor's target net return", pc(target)], ["Underlying fund fees", "2 and 20, independent, on year-end values"],
          ["Fund-of-funds fees", "1 and 10, independent, on year-end values"]],
        a, "%", 2,
        ["Avec des frais indépendants sur la valeur de fin : net = g × (1 − m − p) − m, pour chaque couche.",
          `Couche FoF : n = (${F(target)} + ${F(FOF.m)}) / ${F(1 - FOF.m - FOF.p)} = ${P(n, 4)} (rendement net exigé du fonds sous-jacent).`,
          `Couche fonds : g = (${F(n, 6)} + ${F(FUND.m)}) / ${F(1 - FUND.m - FUND.p)} = ${Pa(a)}.`,
          `Vérification : 100 × ${F(1 + g, 4)} → ${P(chk.ret, 2)} net.`]);
    })(),
    (() => {
      const deals: Deal[] = [[120, 114], [80, 84]];
      const v0 = sum(deals.map((d) => d[0])), v1 = sum(deals.map((d) => d[1]));
      const { t, lines } = feeLines(v0, v1, FOF, M);
      const a = t.ret * 100;
      return q("ai-fof-d4", "difficile", "Investor's return for the year, net of all fees?",
        [["Investment in Fund A: initial / year-end (net of fund fees)", `${mil(deals[0][0])} / ${mil(deals[0][1])}`],
          ["Investment in Fund B: initial / year-end (net of fund fees)", `${mil(deals[1][0])} / ${mil(deals[1][1])}`],
          ["Fund-of-funds fees", "1 and 10, independent, on year-end values"]],
        a, "%", 2,
        [`Valeur de fin = ${M(v1)} < mise ${M(v0)} : perte agrégée.`, ...lines,
          `Rendement net = ${M(t.vNet)} / ${M(v0)} − 1 = ${Pa(a)} : les frais de gestion du FoF s'ajoutent à la perte.`]);
    })(),
    (() => {
      const deals: Deal[] = [[90, 97.2], [60, 66.6]];
      const o: FeeOpts = { m: 0.01, p: 0.1, mgmtBase: "begin", netOfMgmt: true };
      const v0 = sum(deals.map((d) => d[0])), v1 = sum(deals.map((d) => d[1]));
      const { t, lines } = feeLines(v0, v1, o, M);
      const a = t.ret * 100;
      return q("ai-fof-d5", "difficile", "Investor's return for the year, net of all fees?",
        [["Investment in Fund A: initial / year-end (net of fund fees)", `${mil(deals[0][0])} / ${mil(deals[0][1])}`],
          ["Investment in Fund B: initial / year-end (net of fund fees)", `${mil(deals[1][0])} / ${mil(deals[1][1])}`],
          ["Underlying funds' fee structure", "2 and 20"],
          ["Fund-of-funds management fee (on beginning-of-year value)", pc(o.m)], ["Fund-of-funds incentive fee (net of its management fee)", pc(o.p)]],
        a, "%", 2,
        ["Les valeurs de fin sont déjà nettes des frais des fonds (« 2 and 20 ») : ne pas les déduire une seconde fois.",
          `Valeur de fin = ${M(deals[0][1])} + ${M(deals[1][1])} = ${M(v1)} pour une mise de ${M(v0)}.`, ...lines,
          `Rendement net = ${M(t.vNet)} / ${M(v0)} − 1 = ${Pa(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 5 · Rendement à effet de levier ────────────────────────── */

const LEVERAGE: CalcType = {
  key: "leveraged-return",
  topic: "alternatives",
  name: "Rendement avec effet de levier (leveraged return)",
  tier: "essentiel",
  top: true,
  source: "LM 2 · Alternative Investment Performance and Returns",
  formulas: [
    "Gain en $ = r × (V0 + VB) − rB × VB",
    "Rendement à levier = [r × (V0 + VB) − rB × VB] / V0",
    "Équivalent : r + (VB / V0) × (r − rB)",
  ],
  traps: [
    "On divise par les fonds propres V0, pas par l'actif total V0 + VB.",
    "Le levier amplifie aussi les pertes, et les intérêts sont dus quel que soit le rendement.",
  ],
  questions: [
    (() => {
      const v0 = 100, vb = 50, rb = 0.04, r = 0.1;
      const a = levReturn(r, v0, vb, rb) * 100;
      return q("ai-lev-f1", "facile", "Leveraged return on the fund's equity?",
        [["Fund equity", mil(v0)], ["Amount borrowed", mil(vb)], ["Borrowing rate", pc(rb)], ["Return on the invested assets", pc(r)]],
        a, "%", 2,
        [`Gain = ${P(r)} × (${F(v0)} + ${F(vb)}) − ${P(rb)} × ${F(vb)} = ${F(r * (v0 + vb))} − ${F(rb * vb)} = ${M(levGain(r, v0, vb, rb))}.`,
          `Rendement à levier = ${F(levGain(r, v0, vb, rb))} / ${F(v0)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 200, vb = 100, rb = 0.05, r = 0.08;
      const a = levReturn(r, v0, vb, rb) * 100;
      return q("ai-lev-f2", "facile", "Leveraged return on the fund's equity?",
        [["Fund equity", mil(v0)], ["Amount borrowed", mil(vb)], ["Borrowing rate", pc(rb)], ["Return on the invested assets", pc(r)]],
        a, "%", 2,
        [`Gain = ${P(r)} × ${F(v0 + vb)} − ${P(rb)} × ${F(vb)} = ${F(r * (v0 + vb))} − ${F(rb * vb)} = ${M(levGain(r, v0, vb, rb))}.`,
          `Rendement à levier = ${F(levGain(r, v0, vb, rb))} / ${F(v0)} = ${Pa(a)} (contre ${P(r)} sans levier).`]);
    })(),
    (() => {
      const v0 = 60, vb = 30, rb = 0.06, r = 0.11;
      const a = levGain(r, v0, vb, rb);
      return q("ai-lev-f3", "facile", "Leveraged portfolio gain after interest, in $ millions?",
        [["Fund equity", mil(v0)], ["Amount borrowed", mil(vb)], ["Borrowing rate", pc(rb)], ["Return on the invested assets", pc(r)]],
        a, "$", 2,
        [`Rendement sur l'actif total = ${P(r)} × ${M(v0 + vb)} = ${M(r * (v0 + vb))}.`,
          `Intérêts = ${P(rb)} × ${M(vb)} = ${M(rb * vb)}.`,
          `Gain = ${M(r * (v0 + vb))} − ${M(rb * vb)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const v0 = 80, vb = 40, rb = 0.04, r = -0.05;
      const a = levReturn(r, v0, vb, rb) * 100;
      return q("ai-lev-f4", "facile", "Leveraged return on the fund's equity?",
        [["Fund equity", mil(v0)], ["Amount borrowed", mil(vb)], ["Borrowing rate", pc(rb)], ["Return on the invested assets", spc(r)]],
        a, "%", 2,
        [`Gain = ${P(r)} × ${F(v0 + vb)} − ${P(rb)} × ${F(vb)} = ${F(r * (v0 + vb))} − ${F(rb * vb)} = ${M(levGain(r, v0, vb, rb))}.`,
          `Rendement à levier = ${F(levGain(r, v0, vb, rb))} / ${F(v0)} = ${Pa(a)} : la perte est amplifiée par le levier et alourdie par les intérêts.`]);
    })(),
    (() => {
      const de = 1, r = 0.07, rb = 0.03;
      const a = (r + de * (r - rb)) * 100;
      return q("ai-lev-f5", "facile", "Leveraged return on the fund's equity?",
        [["Borrowing / equity (VB / V0)", mx(de)], ["Borrowing rate", pc(rb)], ["Return on the invested assets", pc(r)]],
        a, "%", 2,
        ["Rendement à levier = r + (VB / V0) × (r − rB).",
          `= ${P(r)} + ${F(de)} × (${P(r)} − ${P(rb)}) = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 100, r = 0.09, rb = 0.04, target = 0.15;
      const a = (v0 * (target - r)) / (r - rb);
      return q("ai-lev-m1", "moyen", "Amount the fund must borrow to reach the target return on equity, in $ millions?",
        [["Fund equity", mil(v0)], ["Expected return on the invested assets", pc(r)], ["Borrowing rate", pc(rb)], ["Target return on equity", pc(target)]],
        a, "$", 2,
        ["Rendement à levier = r + (VB / V0) × (r − rB).",
          `${P(target)} = ${P(r)} + (VB / ${F(v0)}) × ${P(r - rb)} ⇒ VB / V0 = ${P(target - r)} / ${P(r - rb)} = ${F((target - r) / (r - rb), 4)}.`,
          `VB = ${F((target - r) / (r - rb), 4)} × ${M(v0)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const v0 = 50, ratio = 3, r = 0.06, rb = 0.045;
      const vb = v0 * (ratio - 1);
      const a = levReturn(r, v0, vb, rb) * 100;
      return q("ai-lev-m2", "moyen", "Leveraged return on the fund's equity?",
        [["Fund equity", mil(v0)], ["Total assets / equity", mx(ratio)], ["Borrowing rate", pc(rb)], ["Return on the invested assets", pc(r)]],
        a, "%", 2,
        [`Actif total = ${F(ratio)} × ${M(v0)} = ${M(v0 * ratio)}, donc emprunt VB = ${M(vb)}.`,
          `Gain = ${P(r)} × ${F(v0 * ratio)} − ${P(rb)} × ${F(vb)} = ${M(levGain(r, v0, vb, rb))}.`,
          `Rendement à levier = ${F(levGain(r, v0, vb, rb))} / ${F(v0)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 120, vb = 80, rb = 0.05;
      const a = ((rb * vb) / (v0 + vb)) * 100;
      return q("ai-lev-m3", "moyen", "Minimum return on the invested assets for the fund's equity return to be zero?",
        [["Fund equity", mil(v0)], ["Amount borrowed", mil(vb)], ["Borrowing rate", pc(rb)]],
        a, "%", 2,
        [`Rendement nul si r × (V0 + VB) = rB × VB, soit r = rB × VB / (V0 + VB).`,
          `r = ${P(rb)} × ${F(vb)} / ${F(v0 + vb)} = ${Pa(a)} : il suffit de couvrir les intérêts sur l'actif total.`]);
    })(),
    (() => {
      const v0 = 250, vb = 125, r = 0.075, rb = 0.055;
      const a = (levReturn(r, v0, vb, rb) - r) * 10000;
      return q("ai-lev-m4", "moyen", "By how many basis points does leverage increase the return on equity?",
        [["Fund equity", mil(v0)], ["Amount borrowed", mil(vb)], ["Borrowing rate", pc(rb)], ["Return on the invested assets", pc(r)]],
        a, "bp", 0,
        [`Rendement à levier = ${P(r)} + (${F(vb)} / ${F(v0)}) × (${P(r)} − ${P(rb)}) = ${P(levReturn(r, v0, vb, rb), 2)}.`,
          `Gain dû au levier = ${F(vb / v0)} × ${P(r - rb)} = ${F(a, 0)} bp.`]);
    })(),
    (() => {
      const v0 = 40, vb = 60, ref = 0.038, spread = 150, r = 0.09;
      const rb = ref + spread / 10000;
      const a = levReturn(r, v0, vb, rb) * 100;
      return q("ai-lev-m5", "moyen", "Leveraged return on the fund's equity?",
        [["Fund equity", mil(v0)], ["Amount borrowed", mil(vb)], ["Borrowing rate", `Reference rate ${pc(ref)} + ${spread} bp`],
          ["Return on the invested assets", pc(r)]],
        a, "%", 2,
        [`Taux d'emprunt = ${P(ref)} + ${F(spread / 100)}% = ${P(rb)}.`,
          `Gain = ${P(r)} × ${F(v0 + vb)} − ${P(rb)} × ${F(vb)} = ${F(r * (v0 + vb))} − ${F(rb * vb)} = ${M(levGain(r, v0, vb, rb))}.`,
          `Rendement à levier = ${F(levGain(r, v0, vb, rb))} / ${F(v0)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 200, vb = 100, rb = 0.05, r = 0.12, m = 0.02, p = 0.2;
      const g = levGain(r, v0, vb, rb), mgmt = m * v0, inc = p * Math.max(0, g - mgmt);
      const a = ((g - mgmt - inc) / v0) * 100;
      return q("ai-lev-d1", "difficile", "Investor's return on equity after interest and fees?",
        [["Fund equity", mil(v0)], ["Amount borrowed", mil(vb)], ["Borrowing rate", pc(rb)], ["Return on the invested assets", pc(r)],
          ["Management fee (on beginning equity)", pc(m)], ["Incentive fee (on gains after interest and the management fee)", pc(p)]],
        a, "%", 2,
        [`Gain après intérêts = ${P(r)} × ${F(v0 + vb)} − ${P(rb)} × ${F(vb)} = ${M(g)}.`,
          `Frais de gestion = ${P(m)} × ${M(v0)} = ${M(mgmt)} ; incentive = ${P(p)} × (${F(g)} − ${F(mgmt)}) = ${M(inc)}.`,
          `Rendement net = (${F(g)} − ${F(mgmt)} − ${F(inc)}) / ${F(v0)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const v0 = 100, vb = 200, rb = 0.06, target = -0.25;
      const r = (target * v0 + rb * vb) / (v0 + vb);
      const a = r * 100;
      return q("ai-lev-d2", "difficile", "Return on the invested assets that would produce the stated loss on equity?",
        [["Fund equity", mil(v0)], ["Amount borrowed", mil(vb)], ["Borrowing rate", pc(rb)], ["Return on equity", spc(target)]],
        a, "%", 2,
        ["Rendement des fonds propres = [r × (V0 + VB) − rB × VB] / V0.",
          `${F(target)} × ${F(v0)} = r × ${F(v0 + vb)} − ${F(rb * vb)} ⇒ r = (${F(target * v0)} + ${F(rb * vb)}) / ${F(v0 + vb)}.`,
          `r = ${Pa(a)} : avec un levier de 3x l'actif, une baisse modérée coûte un quart des fonds propres.`]);
    })(),
    (() => {
      const rA = 0.1, rB = 0.085, de = 1.5, rb = 0.07;
      const lev = rB + de * (rB - rb);
      const a = (lev - rA) * 10000;
      return q("ai-lev-d3", "difficile", "Fund B's return on equity minus Fund A's, in basis points?",
        [["Fund A: unleveraged return on assets", pc(rA)], ["Fund B: return on assets", pc(rB)], ["Fund B: borrowing / equity", mx(de)],
          ["Fund B: borrowing rate", pc(rb)]],
        a, "bp", 0,
        [`Fonds B : ${P(rB)} + ${F(de)} × (${P(rB)} − ${P(rb)}) = ${P(lev, 2)}.`,
          `Écart = ${P(lev, 2)} − ${P(rA)} = ${F(a, 0)} bp : le levier compense un actif moins rentable tant que r > rB.`]);
    })(),
    (() => {
      const v0 = 200, vb = 100, a0 = 300, a1 = 318, income = 6, rb = 0.06, bench = 0.07;
      const r = (a1 - a0 + income) / a0;
      const g = a1 - a0 + income - rb * vb;
      const a = (g / v0) * 100;
      return q("ai-lev-d4", "difficile", "Return on the fund's equity for the year?",
        [["Assets at the start of the year", mil(a0)], ["Of which borrowed", mil(vb)], ["Assets at year-end", mil(a1)],
          ["Income received on the assets", mil(income)], ["Borrowing rate", pc(rb)], ["Benchmark return", pc(bench)]],
        a, "%", 2,
        [`Fonds propres = ${M(a0)} − ${M(vb)} = ${M(v0)}.`,
          `Rendement de l'actif = (${F(a1)} − ${F(a0)} + ${F(income)}) / ${F(a0)} = ${P(r, 2)}.`,
          `Gain après intérêts = ${F(a1 - a0 + income)} − ${P(rb)} × ${F(vb)} = ${M(g)} ; rendement = ${F(g)} / ${F(v0)} = ${Pa(a)} (le benchmark ne sert pas).`]);
    })(),
    (() => {
      const v0 = 100, vb = 50, rb = 0.05, m = 0.01, p = 0.2, target = 0.12;
      const G = target / (1 - p) + m;
      const r = (G * v0 + rb * vb) / (v0 + vb);
      const a = r * 100;
      return q("ai-lev-d5", "difficile", "Return on the invested assets needed to deliver the target after-fee return?",
        [["Fund equity", mil(v0)], ["Amount borrowed", mil(vb)], ["Borrowing rate", pc(rb)],
          ["Management fee (on beginning equity)", pc(m)], ["Incentive fee (on gains after interest and the management fee)", pc(p)],
          ["Target after-fee return on equity", pc(target)]],
        a, "%", 2,
        [`Net = (G − m) × (1 − p), avec G le rendement des fonds propres avant frais : G = ${F(target)} / ${F(1 - p)} + ${F(m)} = ${P(G, 2)}.`,
          `G = [r × ${F(v0 + vb)} − ${F(rb * vb)}] / ${F(v0)} ⇒ r = (${F(G * v0)} + ${F(rb * vb)}) / ${F(v0 + vb)}.`,
          `r = ${Pa(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 6 · Catch-up ────────────────────────── */

const CATCH_UP: CalcType = {
  key: "catch-up-clause",
  topic: "alternatives",
  name: "Clause de rattrapage (catch-up)",
  tier: "essentiel",
  source: "LM 1 · Alternative Investment Features, Methods, and Structures",
  formulas: [
    "Jusqu'au hurdle h : tout le rendement revient aux LP",
    "Rattrapage (100 %) : le GP reçoit tout le rendement entre h et h / (1 − p)",
    "Au-delà de h / (1 − p) : le GP a « rattrapé » p × rendement total ; le reste se partage (1 − p) / p",
  ],
  traps: [
    "Rattrapage complet : le GP touche p × tout le gain, comme avec un soft hurdle.",
    "Entre h et h / (1 − p), le GP prend 100 % de l'excédent : ne pas appliquer p.",
  ],
  questions: [
    (() => {
      const R = 0.15, h = 0.08, p = 0.2;
      const a = catchUp(R, h, p).gp * 100;
      return q("ai-catch-f1", "facile", "GP's performance fee, as a percentage of invested capital?",
        [["Fund return", pc(R)], ["Hurdle rate", pc(h)], ["Performance fee (with full catch-up)", pc(p)]],
        a, "%", 2,
        [...catchUpLines(R, h, p), `Commission du GP = ${Pa(a)}.`]);
    })(),
    (() => {
      const R = 0.16, h = 0.07, p = 0.2;
      const c = catchUp(R, h, p);
      const a = c.lp * 100;
      return q("ai-catch-f2", "facile", "Return earned by the limited partners?",
        [["Fund return", pc(R)], ["Hurdle rate", pc(h)], ["Performance fee (with full catch-up)", pc(p)]],
        a, "%", 2,
        [...catchUpLines(R, h, p), `Rendement des LP = ${P(R)} − ${P(c.gp, 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const h = 0.06, p = 0.2;
      const a = (h / (1 - p)) * 100;
      return q("ai-catch-f3", "facile", "Fund return at which the GP's catch-up is complete?",
        [["Hurdle rate", pc(h)], ["Performance fee (with full catch-up)", pc(p)]],
        a, "%", 2,
        ["Le rattrapage est complet quand le GP a reçu p × rendement total, soit R − h = p × R.",
          `R = h / (1 − p) = ${P(h)} / ${F(1 - p)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const R = 0.09, h = 0.08, p = 0.2;
      const a = catchUp(R, h, p).gp * 100;
      return q("ai-catch-f4", "facile", "GP's performance fee, as a percentage of invested capital?",
        [["Fund return", pc(R)], ["Hurdle rate", pc(h)], ["Performance fee (with full catch-up)", pc(p)]],
        a, "%", 2,
        [...catchUpLines(R, h, p), `Commission du GP = ${Pa(a)} (et non ${P(p)} × ${P(R)}).`]);
    })(),
    (() => {
      const cap = 200, profit = 36, h = 0.08, p = 0.2;
      const R = profit / cap;
      const a = catchUp(R, h, p).gp * cap;
      return q("ai-catch-f5", "facile", "GP's performance fee, in $ millions?",
        [["Capital invested", mil(cap)], ["Profit for the period", mil(profit)], ["Hurdle rate", pc(h)], ["Performance fee (with full catch-up)", pc(p)]],
        a, "$", 2,
        [`Rendement = ${F(profit)} / ${F(cap)} = ${P(R)}.`, ...catchUpLines(R, h, p),
          `Commission = ${P(catchUp(R, h, p).gp, 2)} × ${M(cap)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const R = 0.14, h = 0.08, p = 0.2;
      const cu = catchUp(R, h, p).gp, hard = p * (R - h);
      const a = (cu - hard) * 10000;
      return q("ai-catch-m1", "moyen", "How many basis points more does the GP earn with a full catch-up than with a hard hurdle?",
        [["Fund return", pc(R)], ["Hurdle rate", pc(h)], ["Performance fee", pc(p)]],
        a, "bp", 0,
        [...catchUpLines(R, h, p),
          `Hard hurdle : ${P(p)} × (${P(R)} − ${P(h)}) = ${P(hard, 2)}.`,
          `Écart = ${P(cu, 2)} − ${P(hard, 2)} = ${F(a, 0)} bp.`]);
    })(),
    (() => {
      const cap = 300, R = 0.12, h = 0.08, p = 0.25;
      const c = catchUp(R, h, p);
      const a = c.lp * cap;
      return q("ai-catch-m2", "moyen", "Limited partners' share of the profit, in $ millions?",
        [["Capital invested", mil(cap)], ["Fund return", pc(R)], ["Hurdle rate", pc(h)], ["Performance fee (with full catch-up)", pc(p)]],
        a, "$", 2,
        [...catchUpLines(R, h, p),
          `LP : (${P(R)} − ${P(c.gp, 2)}) × ${M(cap)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const R = 0.11, h = 0.09, p = 0.2;
      const c = catchUp(R, h, p);
      const a = c.lp * 100;
      return q("ai-catch-m3", "moyen", "Return earned by the limited partners?",
        [["Fund return", pc(R)], ["Hurdle rate", pc(h)], ["Performance fee (with full catch-up)", pc(p)]],
        a, "%", 2,
        [...catchUpLines(R, h, p),
          `LP = ${P(R)} − ${P(c.gp, 2)} = ${Pa(a)} : en zone de rattrapage, les LP restent bloqués au hurdle.`]);
    })(),
    (() => {
      const R = 0.092, h = 0.08, p = 0.2;
      const c = catchUp(R, h, p);
      const a = (c.gp / R) * 100;
      return q("ai-catch-m4", "moyen", "GP's share of the fund's total profit?",
        [["Fund return", pc(R)], ["Hurdle rate", pc(h)], ["Performance fee (with full catch-up)", pc(p)]],
        a, "%", 2,
        [...catchUpLines(R, h, p),
          `Part du GP = ${P(c.gp, 2)} / ${P(R, 2)} = ${Pa(a)} : le rattrapage n'est pas fini, le GP est encore sous ${P(p)}.`]);
    })(),
    (() => {
      const cap = 150, proceeds = 171, h = 0.08, p = 0.2;
      const R = (proceeds - cap) / cap;
      const a = catchUp(R, h, p).gp * cap;
      return q("ai-catch-m5", "moyen", "Total amount received by the GP, in $ millions?",
        [["Capital invested", mil(cap)], ["Total proceeds at exit", mil(proceeds)], ["Hurdle rate", pc(h)], ["Performance fee (with full catch-up)", pc(p)]],
        a, "$", 2,
        [`Profit = ${F(proceeds)} − ${F(cap)} = ${M(proceeds - cap)}, soit ${P(R, 2)}.`, ...catchUpLines(R, h, p),
          `GP = ${P(p)} × ${M(proceeds - cap)} = ${M(a, 2)} (rattrapage ${M((catchUp(R, h, p).top - h) * cap)} + ${P(p)} du reste).`]);
    })(),
    (() => {
      const cap = 500, proceeds = 640, h = 0.08, p = 0.2, mf = 0.02;
      const R = (proceeds - cap) / cap;
      const a = catchUp(R, h, p).gp * cap;
      return q("ai-catch-d1", "difficile", "GP's carried interest, in $ millions?",
        [["Capital invested", mil(cap)], ["Total proceeds at exit", mil(proceeds)], ["Hurdle rate", pc(h)],
          ["Carried interest (with full catch-up)", pc(p)], ["Management fee (paid separately, on committed capital)", pc(mf)]],
        a, "$", 2,
        [`Profit = ${M(proceeds - cap)}, soit ${P(R, 2)} (les frais de gestion, payés à part, n'interviennent pas).`, ...catchUpLines(R, h, p),
          `Carry = ${P(p)} × ${M(proceeds - cap)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const cap = 250, R = 0.09, h = 0.08, p = 0.2;
      const cu = catchUp(R, h, p).gp, hard = p * (R - h);
      const a = (cu - hard) * cap;
      return q("ai-catch-d2", "difficile", "How much more does the GP earn with a full catch-up than with a hard hurdle, in $ millions?",
        [["Capital invested", mil(cap)], ["Fund return", pc(R)], ["Hurdle rate", pc(h)], ["Performance fee", pc(p)]],
        a, "$", 2,
        [...catchUpLines(R, h, p),
          `Hard : ${P(p)} × (${P(R)} − ${P(h)}) = ${P(hard, 2)} ; soft (pour info) : ${P(p * R, 2)}.`,
          `Écart catch-up − hard = (${P(cu, 2)} − ${P(hard, 2)}) × ${M(cap)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const fee = 0.015, h = 0.08, p = 0.2;
      const full = (h / (1 - p)) * p;
      const R = fee < full ? h + fee : fee / p;
      const a = R * 100;
      return q("ai-catch-d3", "difficile", "Fund return implied by the GP's performance fee?",
        [["GP's performance fee (% of capital)", pc(fee)], ["Hurdle rate", pc(h)], ["Performance fee (with full catch-up)", pc(p)]],
        a, "%", 2,
        [`Commission maximale pendant le rattrapage = ${P(p)} × ${P(h / (1 - p), 2)} = ${P(full, 2)}.`,
          `${P(fee)} < ${P(full, 2)} : on est encore dans la zone de rattrapage, où le GP prend tout l'excédent au-dessus du hurdle.`,
          `R = ${P(h)} + ${P(fee)} = ${Pa(a)} (et non ${P(fee)} / ${F(p)} = ${P(fee / p, 2)}).`]);
    })(),
    (() => {
      const cap = 400, proceeds = 460, h = 0.06, p = 0.2;
      const R = (proceeds - cap) / cap;
      const c = catchUp(R, h, p);
      const a = (c.top - h) * cap;
      return q("ai-catch-d4", "difficile", "Amount received by the GP during the catch-up tranche alone, in $ millions?",
        [["Capital invested", mil(cap)], ["Total proceeds at exit", mil(proceeds)], ["Hurdle rate", pc(h)], ["Performance fee (with full catch-up)", pc(p)]],
        a, "$", 2,
        [`Profit = ${M(proceeds - cap)}, soit ${P(R, 2)} ; fin du rattrapage à ${P(c.top, 2)}.`,
          `Tranche 1 (LP) : ${P(h)} × ${M(cap)} = ${M(h * cap)}.`,
          `Tranche 2 (rattrapage, 100 % GP) : (${P(c.top, 2)} − ${P(h)}) × ${M(cap)} = ${M(a, 2)}.`,
          `Reste ${M(proceeds - cap - h * cap - a)} partagé ${F((1 - p) * 100)}/${F(p * 100)} ; au total le GP touche ${M(p * (proceeds - cap))} = ${P(p)} du profit.`]);
    })(),
    (() => {
      const lp = 0.12, h = 0.08, p = 0.2;
      const R = lp / (1 - p);
      const a = R * 100;
      return q("ai-catch-d5", "difficile", "Fund return needed for the limited partners to earn the target return?",
        [["Target return for the limited partners", pc(lp)], ["Hurdle rate", pc(h)], ["Performance fee (with full catch-up)", pc(p)]],
        a, "%", 2,
        [`Les LP visent ${P(lp)} > hurdle ${P(h)} : il faut dépasser la zone de rattrapage (${P(h / (1 - p), 2)}).`,
          `Au-delà, LP = (1 − p) × R, donc R = ${P(lp)} / ${F(1 - p)} = ${Pa(a)}.`,
          `Vérification : GP = ${P(p)} × ${P(R, 2)} = ${P(p * R, 2)} ; LP = ${P(R - p * R, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 7 · Waterfall et clawback ────────────────────────── */

const WATERFALL: CalcType = {
  key: "waterfall-clawback",
  topic: "alternatives",
  name: "Waterfall (American / European) et clawback",
  tier: "essentiel",
  source: "LM 1 · Alternative Investment Features, Methods, and Structures",
  formulas: [
    "American (deal-by-deal) : carry = Σ p × max[0 ; produit − coût], deal par deal",
    "European (whole-of-fund) : carry = p × max[0 ; Σ produits − Σ coûts]",
    "Clawback = carry déjà versé − carry dû sur le gain total du fonds (si positif)",
  ],
  traps: [
    "En deal-by-deal, la perte d'un deal ne réduit pas le carry gagné sur un autre, sauf clause de clawback.",
    "European : les LP récupèrent d'abord tout leur capital (et le hurdle éventuel) avant tout carry.",
  ],
  questions: [
    (() => {
      const deals: Deal[] = [[80, 110], [70, 55]], p = 0.2;
      const a = americanCarry(deals, p);
      return q("ai-wf-f1", "facile", "GP's carried interest under a deal-by-deal (American) waterfall, in $ millions?",
        [...dealRows(deals), ["Carried interest", pc(p)], ["Clawback provision", "None"]],
        a, "$", 2,
        [`Gains par deal : ${dealGainTxt(deals)}.`,
          `Deal-by-deal : carry sur le seul deal gagnant = ${P(p)} × ${M(deals[0][1] - deals[0][0])} = ${M(a, 2)} ; la perte de B ne compte pas.`]);
    })(),
    (() => {
      const deals: Deal[] = [[120, 150], [100, 85]], p = 0.2;
      const total = sum(dealGains(deals));
      const a = europeanCarry(deals, p);
      return q("ai-wf-f2", "facile", "GP's carried interest under a whole-of-fund (European) waterfall, in $ millions?",
        [...dealRows(deals), ["Carried interest", pc(p)]],
        a, "$", 2,
        [`Gains par deal : ${dealGainTxt(deals)}.`,
          `Whole-of-fund : gain total = ${M(total)} ; carry = ${P(p)} × ${M(total)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const deals: Deal[] = [[100, 140], [100, 90]], p = 0.2;
      const am = americanCarry(deals, p), eu = europeanCarry(deals, p);
      const a = am - eu;
      return q("ai-wf-f3", "facile", "Amount the LPs recover under the clawback provision, in $ millions?",
        [...dealRows(deals), ["Carried interest", pc(p)], ["Waterfall", "Deal-by-deal, with clawback provision"]],
        a, "$", 2,
        [`Carry versé deal par deal = ${P(p)} × ${M(deals[0][1] - deals[0][0])} = ${M(am)}.`,
          `Carry dû sur le fonds entier = ${P(p)} × ${M(sum(dealGains(deals)))} = ${M(eu)}.`,
          `Clawback = ${M(am)} − ${M(eu)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const deals: Deal[] = [[50, 75], [50, 40]], p = 0.2;
      const proceeds = sum(deals.map((d) => d[1]));
      const eu = europeanCarry(deals, p);
      const a = proceeds - eu;
      return q("ai-wf-f4", "facile", "Total distributions to the LPs under a whole-of-fund (European) waterfall, in $ millions?",
        [...dealRows(deals), ["Carried interest", pc(p)]],
        a, "$", 2,
        [`Produits totaux = ${M(proceeds)} ; gain total = ${M(sum(dealGains(deals)))}.`,
          `Carry = ${P(p)} × ${M(sum(dealGains(deals)))} = ${M(eu)}.`,
          `Distributions aux LP = ${M(proceeds)} − ${M(eu)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const deals: Deal[] = [[40, 60], [60, 75], [50, 30]], p = 0.2;
      const a = americanCarry(deals, p);
      return q("ai-wf-f5", "facile", "GP's carried interest under a deal-by-deal (American) waterfall, in $ millions?",
        [...dealRows(deals), ["Carried interest", pc(p)], ["Clawback provision", "None"]],
        a, "$", 2,
        [`Gains par deal : ${dealGainTxt(deals)}.`,
          `Carry = ${P(p)} × (${F(deals[0][1] - deals[0][0])} + ${F(deals[1][1] - deals[1][0])}) = ${M(a, 2)} ; le deal C perdant ne réduit rien.`]);
    })(),
    (() => {
      const deals: Deal[] = [[150, 210], [100, 70], [50, 65]], p = 0.2;
      const am = americanCarry(deals, p), eu = europeanCarry(deals, p);
      const a = am - eu;
      return q("ai-wf-m1", "moyen", "How much more carried interest does the GP earn under a deal-by-deal waterfall than under a whole-of-fund waterfall, in $ millions?",
        [...dealRows(deals), ["Carried interest", pc(p)], ["Clawback provision", "None"]],
        a, "$", 2,
        [`Gains par deal : ${dealGainTxt(deals)}.`,
          `American : ${P(p)} × (${F(60)} + ${F(15)}) = ${M(am)} ; European : ${P(p)} × ${M(sum(dealGains(deals)))} = ${M(eu)}.`,
          `Écart = ${M(a, 2)}.`]);
    })(),
    (() => {
      const deals: Deal[] = [[200, 250], [100, 90]], p = 0.2;
      const cost = sum(deals.map((d) => d[0])), proceeds = sum(deals.map((d) => d[1]));
      const am = americanCarry(deals, p);
      const a = ((proceeds - am) / cost - 1) * 100;
      return q("ai-wf-m2", "moyen", "LPs' return on the total invested, after carried interest?",
        [...dealRows(deals), ["Carried interest", pc(p)], ["Waterfall", "Deal-by-deal, no clawback"]],
        a, "%", 2,
        [`Carry deal par deal = ${P(p)} × ${M(deals[0][1] - deals[0][0])} = ${M(am)}.`,
          `LP : ${M(proceeds)} − ${M(am)} = ${M(proceeds - am)} pour ${M(cost)} investis.`,
          `Rendement des LP = ${F(proceeds - am)} / ${F(cost)} − 1 = ${Pa(a)} (contre ${P((proceeds - cost) / cost, 2)} avant carry).`]);
    })(),
    (() => {
      const deals: Deal[] = [[100, 150], [100, 70]], p = 0.2;
      const am = americanCarry(deals, p), total = sum(dealGains(deals));
      const a = (am / total) * 100;
      return q("ai-wf-m3", "moyen", "GP's carried interest as a percentage of the fund's total net gain, under a deal-by-deal waterfall?",
        [...dealRows(deals), ["Carried interest", pc(p)], ["Clawback provision", "None"]],
        a, "%", 2,
        [`Carry deal par deal = ${P(p)} × ${M(deals[0][1] - deals[0][0])} = ${M(am)}.`,
          `Gain net du fonds = ${M(total)}.`,
          `Part effective du GP = ${F(am)} / ${F(total)} = ${Pa(a)}, bien au-delà des ${P(p)} contractuels.`]);
    })(),
    (() => {
      const deals: Deal[] = [[100, 120], [100, 60]], p = 0.2;
      const am = americanCarry(deals, p), eu = europeanCarry(deals, p);
      const a = am - eu;
      return q("ai-wf-m4", "moyen", "Amount clawed back from the GP once both deals are exited, in $ millions?",
        [...dealRows(deals), ["Carried interest", pc(p)], ["Waterfall", "Deal-by-deal, with clawback provision"]],
        a, "$", 2,
        [`Carry versé sur A = ${P(p)} × ${M(20)} = ${M(am)}.`,
          `Le fonds perd au total ${M(-sum(dealGains(deals)))} : aucun carry n'est dû (${M(eu)}).`,
          `Clawback = ${M(am)} − ${M(eu)} = ${M(a, 2)} : tout le carry est restitué.`]);
    })(),
    (() => {
      const deals: Deal[] = [[80, 120], [120, 100]], p = 0.2;
      const am = americanCarry(deals, p), eu = europeanCarry(deals, p);
      const claw = am - eu;
      const y1 = deals[0][1] - am, y2 = deals[1][1] + claw;
      const a = y1 + y2;
      return q("ai-wf-m5", "moyen", "Total distributions to the LPs over the fund's life, in $ millions?",
        [["Year 1: deal A cost / exit proceeds", `${mil(deals[0][0])} / ${mil(deals[0][1])}`],
          ["Year 2: deal B cost / exit proceeds", `${mil(deals[1][0])} / ${mil(deals[1][1])}`],
          ["Carried interest", pc(p)], ["Waterfall", "Deal-by-deal, with clawback provision"]],
        a, "$", 2,
        [`Année 1 : carry sur A = ${P(p)} × ${M(40)} = ${M(am)} ; les LP reçoivent ${M(deals[0][1])} − ${M(am)} = ${M(y1)}.`,
          `Année 2 : gain total du fonds = ${M(sum(dealGains(deals)))} → carry dû ${M(eu)} ; clawback = ${M(am)} − ${M(eu)} = ${M(claw)}.`,
          `Les LP reçoivent ${M(deals[1][1])} + ${M(claw)} = ${M(y2)} ; total = ${M(a, 2)}.`]);
    })(),
    (() => {
      const deals: Deal[] = [[100, 180], [150, 120], [50, 65]], p = 0.2;
      const cost = sum(deals.map((d) => d[0])), proceeds = sum(deals.map((d) => d[1]));
      const eu = europeanCarry(deals, p);
      const a = (proceeds - eu) / cost;
      return q("ai-wf-d1", "difficile", "LPs' net multiple of invested capital under a whole-of-fund (European) waterfall?",
        [...dealRows(deals), ["Carried interest", pc(p)]],
        a, "x", 2,
        [`Coût total = ${M(cost)} ; produits = ${M(proceeds)} ; gain = ${M(proceeds - cost)}.`,
          `Carry = ${P(p)} × ${M(proceeds - cost)} = ${M(eu)}.`,
          `Multiple net des LP = (${F(proceeds)} − ${F(eu)}) / ${F(cost)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const deals: Deal[] = [[60, 90], [90, 100], [50, 35]], p = 0.2;
      const am = americanCarry(deals, p), eu = europeanCarry(deals, p);
      const total = sum(dealGains(deals));
      const a = total - eu;
      return q("ai-wf-d2", "difficile", "LPs' total net profit after the clawback, in $ millions?",
        [...dealRows(deals), ["Carried interest", pc(p)], ["Waterfall", "Deal-by-deal, with clawback provision"]],
        a, "$", 2,
        [`Gains par deal : ${dealGainTxt(deals)} ; carry versé deal par deal = ${M(am)}.`,
          `Gain total = ${M(total)} ; carry dû = ${P(p)} × ${M(total)} = ${M(eu)} ; clawback = ${M(am - eu)}.`,
          `Profit net des LP = ${M(total)} − ${M(eu)} = ${M(a, 2)} : avec clawback, on retombe sur le résultat d'un waterfall européen.`]);
    })(),
    (() => {
      const cap = 400, proceeds = 480, h = 0.08, p = 0.2;
      const profit = proceeds - cap, hurdle = h * cap;
      const a = p * Math.max(0, profit - hurdle);
      return q("ai-wf-d3", "difficile", "GP's carried interest under the whole-of-fund waterfall, in $ millions?",
        [["Total capital invested", mil(cap)], ["Total exit proceeds", mil(proceeds)], ["Hurdle rate (hard, for the whole period)", pc(h)],
          ["Carried interest", pc(p)], ["Waterfall", "Whole-of-fund (European), no catch-up"]],
        a, "$", 2,
        [`Les LP récupèrent d'abord ${M(cap)} de capital puis ${P(h)} × ${M(cap)} = ${M(hurdle)} de hurdle.`,
          `Profit au-delà du hurdle = ${M(profit)} − ${M(hurdle)} = ${M(profit - hurdle)}.`,
          `Carry = ${P(p)} × ${M(profit - hurdle)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const deals: Deal[] = [[100, 160], [120, 90], [80, 84]], p = 0.2, mf = 0.02, committed = 500;
      const am = americanCarry(deals, p), eu = europeanCarry(deals, p);
      const a = am - eu;
      return q("ai-wf-d4", "difficile", "Amount clawed back from the GP once all deals are exited, in $ millions?",
        [["Committed capital", mil(committed)], ...dealRows(deals), ["Carried interest", pc(p)],
          ["Management fee (on committed capital, paid separately)", pc(mf)], ["Waterfall", "Deal-by-deal, with clawback provision"]],
        a, "$", 2,
        ["Le capital engagé et les frais de gestion ne servent pas : le clawback ne porte que sur le carry.",
          `Gains par deal : ${dealGainTxt(deals)} ; carry versé = ${P(p)} × (${F(60)} + ${F(4)}) = ${M(am)}.`,
          `Gain total = ${M(sum(dealGains(deals)))} → carry dû = ${M(eu)}.`,
          `Clawback = ${M(am)} − ${M(eu)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const deals: Deal[] = [[100, 130], [80, 84], [120, 150]], p = 0.2, h = 0.08;
      const parts = deals.map(([c, x]) => p * Math.max(0, x - c * (1 + h)));
      const a = sum(parts);
      return q("ai-wf-d5", "difficile", "GP's total carried interest under the deal-by-deal waterfall, in $ millions?",
        [...dealRows(deals), ["Carried interest", pc(p)], ["Hurdle rate (hard, per deal; each deal held one year)", pc(h)],
          ["Waterfall", "Deal-by-deal, no clawback"]],
        a, "$", 2,
        [`Seuil par deal = coût × ${F(1 + h)} : A ${F(deals[0][0] * (1 + h))} ; B ${F(deals[1][0] * (1 + h))} ; C ${F(deals[2][0] * (1 + h))}.`,
          `A : ${P(p)} × (${F(deals[0][1])} − ${F(deals[0][0] * (1 + h))}) = ${M(parts[0])} ; B : gain sous le hurdle → 0 ; C : ${P(p)} × (${F(deals[2][1])} − ${F(deals[2][0] * (1 + h))}) = ${M(parts[2])}.`,
          `Carry total = ${M(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 8 · MOIC ────────────────────────── */

const MOIC: CalcType = {
  key: "moic",
  topic: "alternatives",
  name: "Multiple of invested capital (MOIC)",
  tier: "essentiel",
  source: "LM 2 · Alternative Investment Performance and Returns",
  formulas: [
    "MOIC = (distributions totales + valeur résiduelle des actifs) / capital total versé (paid-in)",
    "Gain = (MOIC − 1) × capital versé",
    "Une seule mise et une seule sortie : rendement annualisé = MOIC^(1/T) − 1",
  ],
  traps: [
    "Dénominateur : le capital réellement versé (paid-in), pas le capital engagé (committed).",
    "Ne pas oublier la valeur résiduelle des participations non cédées.",
    "Le MOIC ignore le calendrier des flux : même multiple, rendement annuel très différent.",
  ],
  questions: [
    (() => {
      const paid = 100, dist = 150, nav = 30;
      const a = moic(dist, nav, paid);
      return q("ai-moic-f1", "facile", "Multiple of invested capital?",
        [["Total paid-in capital", mil(paid)], ["Total distributions", mil(dist)], ["Value of remaining assets", mil(nav)]],
        a, "x", 2,
        [`MOIC = (${F(dist)} + ${F(nav)}) / ${F(paid)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const paid = 250, dist = 400;
      const a = moic(dist, 0, paid);
      return q("ai-moic-f2", "facile", "Multiple of invested capital of the fully exited fund?",
        [["Total paid-in capital", mil(paid)], ["Total distributions", mil(dist)], ["Value of remaining assets", mil(0)]],
        a, "x", 2,
        [`MOIC = ${F(dist)} / ${F(paid)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const mult = 2.2, paid = 80;
      const a = mult * paid;
      return q("ai-moic-f3", "facile", "Total value (distributions plus remaining assets), in $ millions?",
        [["Multiple of invested capital", mx(mult)], ["Total paid-in capital", mil(paid)]],
        a, "$", 2,
        [`Valeur totale = MOIC × capital versé = ${F(mult)} × ${M(paid)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const calls = [30, 40, 50], dist = 90, nav = 150;
      const paid = sum(calls);
      const a = moic(dist, nav, paid);
      return q("ai-moic-f4", "facile", "Multiple of invested capital?",
        [["Capital calls (Years 1 / 2 / 3)", lst(calls.map(mil))], ["Total distributions", mil(dist)], ["Value of remaining assets", mil(nav)]],
        a, "x", 2,
        [`Capital versé = ${F(calls[0])} + ${F(calls[1])} + ${F(calls[2])} = ${M(paid)}.`,
          `MOIC = (${F(dist)} + ${F(nav)}) / ${F(paid)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const mult = 1.75, paid = 200;
      const a = (mult - 1) * paid;
      return q("ai-moic-f5", "facile", "Total gain on the investment, in $ millions?",
        [["Multiple of invested capital", mx(mult)], ["Total paid-in capital", mil(paid)]],
        a, "$", 2,
        [`Gain = (MOIC − 1) × capital versé = ${F(mult - 1)} × ${M(paid)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const calls = [60, 40], dists = [30, 90], nav = 50;
      const paid = sum(calls), dist = sum(dists);
      const a = moic(dist, nav, paid);
      return q("ai-moic-m1", "moyen", "Multiple of invested capital at the end of Year 3?",
        [["Capital calls: Year 0 / Year 1", lst(calls.map(mil))], ["Distributions: Year 2 / Year 3", lst(dists.map(mil))],
          ["Value of remaining assets at end of Year 3", mil(nav)]],
        a, "x", 2,
        [`Capital versé = ${M(paid)} ; distributions = ${M(dist)}.`,
          `MOIC = (${F(dist)} + ${F(nav)}) / ${F(paid)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const mult = 2.5, T = 6;
      const a = annualized(mult, T) * 100;
      return q("ai-moic-m2", "moyen", "Annualized return implied by the multiple? (Single investment at the start, single exit at the end.)",
        [["Multiple of invested capital", mx(mult)], ["Holding period", `${T} years`]],
        a, "%", 2,
        [`Une seule mise et une seule sortie : (1 + r)^${T} = ${F(mult)}.`,
          `r = ${F(mult)}^(1/${T}) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const mult = 2, t1 = 4, t2 = 7;
      const r1 = annualized(mult, t1), r2 = annualized(mult, t2);
      const a = (r1 - r2) * 100;
      return q("ai-moic-m3", "moyen", "Difference in annualized returns between the two funds, in percentage points? (Single investment, single exit.)",
        [["Fund X: multiple / holding period", `${mx(mult)} / ${t1} years`], ["Fund Y: multiple / holding period", `${mx(mult)} / ${t2} years`]],
        a, "%", 2,
        [`X : ${F(mult)}^(1/${t1}) − 1 = ${P(r1, 2)} ; Y : ${F(mult)}^(1/${t2}) − 1 = ${P(r2, 2)}.`,
          `Écart = ${Pa(a)} : même MOIC, mais le multiple ne dit rien de la durée.`]);
    })(),
    (() => {
      const paid = 150, proceeds = 270, p = 0.2;
      const carry = p * (proceeds - paid);
      const a = (proceeds - carry) / paid;
      return q("ai-moic-m4", "moyen", "LPs' multiple of invested capital after carried interest?",
        [["Total paid-in capital", mil(paid)], ["Total proceeds before carried interest", mil(proceeds)], ["Carried interest (on the total profit)", pc(p)]],
        a, "x", 2,
        [`Carry = ${P(p)} × (${F(proceeds)} − ${F(paid)}) = ${M(carry)}.`,
          `MOIC net des LP = (${F(proceeds)} − ${F(carry)}) / ${F(paid)} = ${F(a, 2)}x (brut : ${F(proceeds / paid, 2)}x).`]);
    })(),
    (() => {
      const paid = 200, dist = 230, target = 1.8;
      const a = target * paid - dist;
      return q("ai-moic-m5", "moyen", "Value of the remaining assets needed for the fund to reach the target multiple, in $ millions?",
        [["Total paid-in capital", mil(paid)], ["Distributions to date", mil(dist)], ["Target multiple of invested capital", mx(target)]],
        a, "$", 2,
        [`Valeur totale visée = ${F(target)} × ${M(paid)} = ${M(target * paid)}.`,
          `Valeur résiduelle nécessaire = ${M(target * paid)} − ${M(dist)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const committed = 500, called = 350, dist = 280, nav = 245;
      const a = moic(dist, nav, called);
      return q("ai-moic-d1", "difficile", "Multiple of invested capital?",
        [["Committed capital", mil(committed)], ["Capital called to date", mil(called)], ["Distributions to date", mil(dist)],
          ["Value of remaining assets", mil(nav)]],
        a, "x", 2,
        ["Dénominateur : le capital versé (appelé), pas le capital engagé.",
          `MOIC = (${F(dist)} + ${F(nav)}) / ${F(called)} = ${F(a, 2)}x (et non ${F(moic(dist, nav, committed), 2)}x sur le capital engagé).`]);
    })(),
    (() => {
      const paid = 300, dist = 210, target = 1.8, p = 0.2;
      const lpValue = target * paid;
      const profit = (lpValue - paid) / (1 - p);
      const total = paid + profit;
      const a = total - dist;
      return q("ai-moic-d2", "difficile", "Exit value needed for the last holding so that LPs reach the target net multiple, in $ millions?",
        [["Total paid-in capital", mil(paid)], ["Distributions to date (before carried interest)", mil(dist)], ["Carried interest (on the total profit)", pc(p)],
          ["Target net multiple for the LPs", mx(target)]],
        a, "$", 2,
        [`Valeur nette visée pour les LP = ${F(target)} × ${M(paid)} = ${M(lpValue)}, soit un profit net de ${M(lpValue - paid)}.`,
          `Profit brut nécessaire = ${M(lpValue - paid)} / ${F(1 - p)} = ${M(profit)} → valeur brute totale ${M(total)}.`,
          `Sortie nécessaire = ${M(total)} − ${M(dist)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const committed = 150, paid = 120, exit = 264, T = 5;
      const mult = moic(exit, 0, paid);
      const a = annualized(mult, T) * 100;
      return q("ai-moic-d3", "difficile", "Annualized return on the investment? (Single capital call at the start, single exit.)",
        [["Committed capital", mil(committed)], ["Capital paid in at the start", mil(paid)], ["Exit proceeds", mil(exit)], ["Holding period", `${T} years`]],
        a, "%", 2,
        [`MOIC = ${F(exit)} / ${F(paid)} = ${F(mult, 2)}x (base : capital versé, pas engagé).`,
          `Rendement annualisé = ${F(mult, 2)}^(1/${T}) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const mA = 1.9, tA = 5, mB = 1.6, tB = 3;
      const rA = annualized(mA, tA), rB = annualized(mB, tB);
      const a = (rB - rA) * 100;
      return q("ai-moic-d4", "difficile", "Fund B's annualized return minus Fund A's, in percentage points? (Single investment, single exit.)",
        [["Fund A: multiple / holding period", `${mx(mA)} / ${tA} years`], ["Fund B: multiple / holding period", `${mx(mB)} / ${tB} years`]],
        a, "%", 2,
        [`A : ${F(mA)}^(1/${tA}) − 1 = ${P(rA, 2)} ; B : ${F(mB)}^(1/${tB}) − 1 = ${P(rB, 2)}.`,
          `Écart B − A = ${Pa(a)} : le MOIC le plus élevé n'est pas le meilleur rendement annuel.`]);
    })(),
    (() => {
      const calls = [50, 70, 80], dists = [40, 120, 160], nav = 30, committed = 250, p = 0.2;
      const paid = sum(calls), total = sum(dists) + nav;
      const carry = p * (total - paid);
      const a = (total - carry) / paid;
      return q("ai-moic-d5", "difficile", "LPs' multiple of invested capital after carried interest?",
        [["Committed capital", mil(committed)], ["Capital calls (Years 1 / 2 / 3)", lst(calls.map(mil))],
          ["Distributions before carry (Years 3 / 4 / 5)", lst(dists.map(mil))], ["Value of remaining assets", mil(nav)],
          ["Carried interest (on the total profit)", pc(p)]],
        a, "x", 2,
        [`Capital versé = ${M(paid)} (le capital engagé ${M(committed)} et la dry powder ne comptent pas).`,
          `Valeur brute = ${F(sum(dists))} + ${F(nav)} = ${M(total)} ; carry = ${P(p)} × ${M(total - paid)} = ${M(carry)}.`,
          `MOIC net = (${F(total)} − ${F(carry)}) / ${F(paid)} = ${F(a, 2)}x.`]);
    })(),
  ],
};

/* ────────────────────────── 9 · Prix d'un future sur matière première ────────────────────────── */

const COMMODITY: CalcType = {
  key: "commodity-futures-price",
  topic: "alternatives",
  name: "Prix d'un future sur matière première (cost of carry)",
  tier: "essentiel",
  source: "LM 5 · Natural Resources",
  formulas: [
    "Prix du future ≈ spot × (1 + taux sans risque de la période) + coûts de stockage − convenience yield",
    "Net cost of carry = prix du future − spot",
    "Contango : future > spot ; backwardation : future < spot (forte convenience yield)",
  ],
  traps: [
    "Ramener le taux annuel à la durée du contrat (convention simple : taux × mois / 12).",
    "Les coûts de stockage s'ajoutent, la convenience yield se retranche.",
    "Le prix spot attendu à l'échéance n'entre pas dans le modèle de cost of carry.",
  ],
  questions: [
    (() => {
      const S = 80, rf = 0.02, st = 1.5, cy = 0.9;
      const a = futuresPrice(S, rf, st, cy);
      return q("ai-cmdty-f1", "facile", "Futures price per barrel?",
        [["Spot price", usd(S, 2)], ["Risk-free rate for the contract period", pc(rf)], ["Storage costs for the period", usd(st, 2)],
          ["Convenience yield for the period", usd(cy, 2)]],
        a, "$", 2,
        [`Future = ${F(S)} × ${F(1 + rf)} + ${F(st)} − ${F(cy)}.`,
          `= ${F(S * (1 + rf))} + ${F(st)} − ${F(cy)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const S = 2000, rf = 0.015, st = 10, cy = 0;
      const a = futuresPrice(S, rf, st, cy);
      return q("ai-cmdty-f2", "facile", "Futures price per ounce of gold?",
        [["Spot price", usd(S, 2)], ["Risk-free rate for the contract period", pc(rf)], ["Storage and insurance costs for the period", usd(st, 2)],
          ["Convenience yield", "None"]],
        a, "$", 2,
        [`Future = ${F(S)} × ${F(1 + rf)} + ${F(st)} = ${F(S * (1 + rf))} + ${F(st)} = ${D(a, 2)} (contango : pas de convenience yield).`]);
    })(),
    (() => {
      const S = 5, rf = 0.02, st = 0.15, Fp = 5.12;
      const a = S * (1 + rf) + st - Fp;
      return q("ai-cmdty-f3", "facile", "Implied convenience yield per bushel?",
        [["Spot price of wheat", usd(S, 2)], ["Futures price", usd(Fp, 2)], ["Risk-free rate for the contract period", pc(rf)],
          ["Storage costs for the period", usd(st, 2)]],
        a, "$", 2,
        ["Convenience yield = spot × (1 + rf) + stockage − future.",
          `= ${F(S * (1 + rf))} + ${F(st)} − ${F(Fp)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const S = 70, rf = 0.01, st = 0.8, cy = 2.5;
      const Fp = futuresPrice(S, rf, st, cy);
      const a = Fp - S;
      return q("ai-cmdty-f4", "facile", "Net cost of carry (futures price minus spot price) per barrel?",
        [["Spot price", usd(S, 2)], ["Risk-free rate for the contract period", pc(rf)], ["Storage costs for the period", usd(st, 2)],
          ["Convenience yield for the period", usd(cy, 2)]],
        a, "$", 2,
        [`Future = ${F(S)} × ${F(1 + rf)} + ${F(st)} − ${F(cy)} = ${D(Fp, 2)}.`,
          `Net cost of carry = ${F(Fp, 2)} − ${F(S)} = ${D(a, 2)} : négatif, le marché est en backwardation.`]);
    })(),
    (() => {
      const S = 3.5, rf = 0.01, cy = 0.05, Fp = 3.6;
      const a = Fp - S * (1 + rf) + cy;
      return q("ai-cmdty-f5", "facile", "Storage costs per bushel implied by the futures price?",
        [["Spot price of corn", usd(S, 2)], ["Futures price", usd(Fp, 2)], ["Risk-free rate for the contract period", pc(rf)],
          ["Convenience yield for the period", usd(cy, 2)]],
        a, "$", 3,
        ["Stockage = future − spot × (1 + rf) + convenience yield.",
          `= ${F(Fp)} − ${F(S * (1 + rf))} + ${F(cy)} = ${D(a, 3)}.`]);
    })(),
    (() => {
      const S = 90, rAnn = 0.04, months = 6, stM = 0.25, cy = 1.2;
      const rf = (rAnn * months) / 12, st = stM * months;
      const a = futuresPrice(S, rf, st, cy);
      return q("ai-cmdty-m1", "moyen", "Futures price per barrel for the 6-month contract?",
        [["Spot price", usd(S, 2)], ["Annual risk-free rate (simple interest)", pc(rAnn)], ["Contract maturity", `${months} months`],
          ["Storage costs", `${usd(stM, 2)} per barrel per month`], ["Convenience yield for the period", usd(cy, 2)]],
        a, "$", 2,
        [`Taux de la période = ${P(rAnn)} × ${months}/12 = ${P(rf)} ; stockage = ${F(stM)} × ${months} = ${D(st, 2)}.`,
          `Future = ${F(S)} × ${F(1 + rf)} + ${F(st)} − ${F(cy)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const S = 9000, rAnn = 0.05, months = 3, stM = 10, cy = 60;
      const rf = (rAnn * months) / 12, st = stM * months;
      const a = futuresPrice(S, rf, st, cy);
      return q("ai-cmdty-m2", "moyen", "Futures price per tonne of copper for the 3-month contract?",
        [["Spot price", usd(S, 2)], ["Annual risk-free rate (simple interest)", pc(rAnn)], ["Contract maturity", `${months} months`],
          ["Storage costs", `${usd(stM, 2)} per tonne per month`], ["Convenience yield for the period", usd(cy, 2)]],
        a, "$", 2,
        [`Taux de la période = ${P(rAnn)} × ${months}/12 = ${P(rf)} ; stockage = ${F(stM)} × ${months} = ${D(st)}.`,
          `Future = ${F(S)} × ${F(1 + rf)} + ${F(st)} − ${F(cy)} = ${F(S * (1 + rf))} − ${F(cy - st)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const S = 75, rf = 0.015, st = 1.2, cy = 0.5, size = 1000;
      const Fp = futuresPrice(S, rf, st, cy);
      const a = Fp * size;
      return q("ai-cmdty-m3", "moyen", "Value of one futures contract at the cost-of-carry price?",
        [["Spot price", usd(S, 2)], ["Risk-free rate for the contract period", pc(rf)], ["Storage costs for the period (per barrel)", usd(st, 2)],
          ["Convenience yield for the period (per barrel)", usd(cy, 2)], ["Contract size", `${E(size)} barrels`]],
        a, "$", 0,
        [`Future par baril = ${F(S)} × ${F(1 + rf)} + ${F(st)} − ${F(cy)} = ${D(Fp, 3)}.`,
          `Valeur du contrat = ${F(Fp, 3)} × ${F(size)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const S = 30, rAnn = 0.048, months = 9, stM = 0.06, Fp = 30.95;
      const rf = (rAnn * months) / 12, st = stM * months;
      const a = S * (1 + rf) + st - Fp;
      return q("ai-cmdty-m4", "moyen", "Implied convenience yield per ounce of silver for the 9-month contract?",
        [["Spot price", usd(S, 2)], ["Futures price", usd(Fp, 2)], ["Annual risk-free rate (simple interest)", pc(rAnn)],
          ["Contract maturity", `${months} months`], ["Storage costs", `${usd(stM, 2)} per ounce per month`]],
        a, "$", 2,
        [`Taux de la période = ${P(rAnn)} × ${months}/12 = ${P(rf)} ; stockage = ${F(stM)} × ${months} = ${D(st, 2)}.`,
          `Convenience yield = ${F(S)} × ${F(1 + rf)} + ${F(st)} − ${F(Fp)} = ${F(S * (1 + rf), 2)} + ${F(st)} − ${F(Fp)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const S = 50, st = 0.6, cy = 0.4, Fp = 51.2;
      const a = ((Fp - st + cy) / S - 1) * 100;
      return q("ai-cmdty-m5", "moyen", "Risk-free rate for the contract period implied by the futures price?",
        [["Spot price", usd(S, 2)], ["Futures price", usd(Fp, 2)], ["Storage costs for the period", usd(st, 2)], ["Convenience yield for the period", usd(cy, 2)]],
        a, "%", 2,
        [`Spot × (1 + rf) = future − stockage + convenience yield = ${F(Fp)} − ${F(st)} + ${F(cy)} = ${F(Fp - st + cy)}.`,
          `1 + rf = ${F(Fp - st + cy)} / ${F(S)} ⇒ rf = ${Pa(a)}.`]);
    })(),
    (() => {
      const S = 60, rAnn = 0.06, months = 4, stM = 0.3, cy = 0.5, quoted = 62.4;
      const rf = (rAnn * months) / 12, st = stM * months;
      const fair = futuresPrice(S, rf, st, cy);
      const a = quoted - fair;
      return q("ai-cmdty-d1", "difficile", "By how much per barrel does the quoted futures price exceed its cost-of-carry value?",
        [["Spot price", usd(S, 2)], ["Quoted 4-month futures price", usd(quoted, 2)], ["Annual risk-free rate (simple interest)", pc(rAnn)],
          ["Storage costs", `${usd(stM, 2)} per barrel per month`], ["Convenience yield for the period", usd(cy, 2)]],
        a, "$", 2,
        [`Taux de la période = ${P(rAnn)} × ${months}/12 = ${P(rf)} ; stockage = ${F(stM)} × ${months} = ${D(st, 2)}.`,
          `Prix théorique = ${F(S)} × ${F(1 + rf)} + ${F(st)} − ${F(cy)} = ${D(fair, 2)}.`,
          `Écart = ${F(quoted)} − ${F(fair, 2)} = ${D(a, 2)} : le future coté est trop cher (acheter le spot, vendre le future).`]);
    })(),
    (() => {
      const S = 400, rf = 0.025, stPct = 0.015, cyPct = 0.03;
      const a = futuresPrice(S, rf, stPct * S, cyPct * S);
      return q("ai-cmdty-d2", "difficile", "Futures price per tonne?",
        [["Spot price", usd(S, 2)], ["Risk-free rate for the contract period", pc(rf)], ["Storage costs for the period", `${pc(stPct)} of the spot price`],
          ["Convenience yield for the period", `${pc(cyPct)} of the spot price`]],
        a, "$", 2,
        [`Stockage = ${P(stPct)} × ${F(S)} = ${D(stPct * S, 2)} ; convenience yield = ${P(cyPct)} × ${F(S)} = ${D(cyPct * S, 2)}.`,
          `Future = ${F(S)} × ${F(1 + rf)} + ${F(stPct * S)} − ${F(cyPct * S)} = ${D(a, 2)}, soit ${F(S)} × (1 + ${F(rf)} + ${F(stPct)} − ${F(cyPct)}).`]);
    })(),
    (() => {
      const S = 85, rAnn = 0.04, months = 6, stM = 0.2, gap = 2;
      const rf = (rAnn * months) / 12, st = stM * months;
      const target = S - gap;
      const a = S * (1 + rf) + st - target;
      return q("ai-cmdty-d3", "difficile", "Convenience yield needed for the 6-month futures price to trade at the stated discount to spot?",
        [["Spot price", usd(S, 2)], ["Futures discount to spot (backwardation)", usd(gap, 2)], ["Annual risk-free rate (simple interest)", pc(rAnn)],
          ["Contract maturity", `${months} months`], ["Storage costs", `${usd(stM, 2)} per barrel per month`]],
        a, "$", 2,
        [`Future visé = ${F(S)} − ${F(gap)} = ${D(target, 2)}.`,
          `Taux de la période = ${P(rf)} ; stockage = ${D(st, 2)}.`,
          `Convenience yield = ${F(S)} × ${F(1 + rf)} + ${F(st)} − ${F(target)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const S = 88, rAnn = 0.03, months = 6, st = 1, cy = 2.1, expected = 95;
      const rf = (rAnn * months) / 12;
      const a = futuresPrice(S, rf, st, cy);
      return q("ai-cmdty-d4", "difficile", "Futures price per barrel for the 6-month contract?",
        [["Spot price", usd(S, 2)], ["Expected spot price in 6 months", usd(expected, 2)], ["Annual risk-free rate (simple interest)", pc(rAnn)],
          ["Storage costs for the period", usd(st, 2)], ["Convenience yield for the period", usd(cy, 2)]],
        a, "$", 2,
        ["Le prix spot attendu ne sert pas : le future se fixe par le cost of carry, à partir du spot actuel.",
          `Taux de la période = ${P(rAnn)} × ${months}/12 = ${P(rf)}.`,
          `Future = ${F(S)} × ${F(1 + rf)} + ${F(st)} − ${F(cy)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const S = 120, rf = 0.04, st = 3, Fp = 121.2;
      const cy = S * (1 + rf) + st - Fp;
      const a = (cy / S) * 100;
      return q("ai-cmdty-d5", "difficile", "Implied convenience yield, as a percentage of the spot price?",
        [["Spot price", usd(S, 2)], ["1-year futures price", usd(Fp, 2)], ["1-year risk-free rate", pc(rf)], ["Storage costs for the year", usd(st, 2)]],
        a, "%", 2,
        [`Convenience yield = ${F(S)} × ${F(1 + rf)} + ${F(st)} − ${F(Fp)} = ${D(cy, 2)}.`,
          `En % du spot = ${F(cy, 2)} / ${F(S)} = ${Pa(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 10 · IRR d'un fonds ────────────────────────── */

const FUND_IRR: CalcType = {
  key: "fund-irr",
  topic: "alternatives",
  name: "IRR d'un fonds (money-weighted return)",
  tier: "annexe",
  source: "LM 2 · Alternative Investment Performance and Returns",
  formulas: [
    "IRR : taux r tel que Σ CFt / (1 + r)^t = 0 (appels de capital négatifs, distributions et valeur résiduelle positives)",
    "Une seule mise et une seule sortie : IRR = (valeur finale / mise)^(1/T) − 1",
    "Calculatrice : CF0, C01, C02… puis IRR CPT",
  ],
  traps: [
    "La valeur résiduelle (NAV) de fin compte comme un flux positif de la dernière période.",
    "Un flux nul garde sa place dans le calendrier (C0x = 0).",
    "L'IRR dépend du calendrier des flux, contrairement au MOIC.",
  ],
  questions: [
    (() => {
      const inv = 50, out = 90, T = 4;
      const a = annualized(out / inv, T) * 100;
      return q("ai-irr-f1", "facile", "IRR of the investment?",
        [["Investment at Year 0", mil(inv)], [`Exit proceeds at Year ${T}`, mil(out)]],
        a, "%", 2,
        [`Une seule mise et une seule sortie : IRR = (${F(out)} / ${F(inv)})^(1/${T}) − 1.`,
          `IRR = ${F(out / inv, 4)}^(1/${T}) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const inv = 100, out = 180, T = 5;
      const a = annualized(out / inv, T) * 100;
      return q("ai-irr-f2", "facile", "IRR of the investment?",
        [["Investment at Year 0", mil(inv)], [`Exit proceeds at Year ${T}`, mil(out)]],
        a, "%", 2,
        [`IRR = (${F(out)} / ${F(inv)})^(1/${T}) − 1 = ${F(out / inv)}^(1/${T}) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const cfs = [-20, 12, 15];
      const r = irr(cfs);
      const a = r * 100;
      return q("ai-irr-f3", "facile", "IRR of the investment?",
        [["Investment at Year 0", mil(-cfs[0])], ["Distribution at Year 1", mil(cfs[1])], ["Distribution at Year 2", mil(cfs[2])]],
        a, "%", 2,
        [`Flux : ${cfTxt(cfs)}.`,
          `IRR = r tel que ${npvTxt(cfs, r)} ≈ 0.`,
          `Calculatrice : IRR = ${Pa(a)}.`]);
    })(),
    (() => {
      const inv = 80, out = 100, T = 2;
      const a = annualized(out / inv, T) * 100;
      return q("ai-irr-f4", "facile", "IRR of the investment?",
        [["Investment at Year 0", mil(inv)], [`Exit proceeds at Year ${T}`, mil(out)]],
        a, "%", 2,
        [`IRR = (${F(out)} / ${F(inv)})^(1/${T}) − 1 = ${F(out / inv)}^(1/2) − 1 = ${Pa(a)} (et non ${P((out / inv - 1) / T, 2)} en divisant par 2).`]);
    })(),
    (() => {
      const inv = 40, nav = 55, T = 3;
      const a = annualized(nav / inv, T) * 100;
      return q("ai-irr-f5", "facile", "IRR to date, treating the remaining assets as a terminal cash flow?",
        [["Investment at Year 0", mil(inv)], ["Distributions to date", mil(0)], [`Value of remaining assets at Year ${T}`, mil(nav)]],
        a, "%", 2,
        [`La valeur résiduelle sert de flux final : IRR = (${F(nav)} / ${F(inv)})^(1/${T}) − 1.`,
          `IRR = ${F(nav / inv, 4)}^(1/${T}) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const cfs = [-30, -20, 25, 50];
      const r = irr(cfs);
      const a = r * 100;
      return q("ai-irr-m1", "moyen", "IRR of the limited partner's cash flows?",
        [["Capital calls: Year 0 / Year 1", lst([mil(30), mil(20)])], ["Distributions: Year 2 / Year 3", lst([mil(25), mil(50)])]],
        a, "%", 2,
        [`Flux : ${cfTxt(cfs)}.`,
          `IRR = r tel que ${npvTxt(cfs, r)} ≈ 0.`,
          `Calculatrice (CF0 = −30, C01 = −20, C02 = 25, C03 = 50) : IRR = ${Pa(a)}.`]);
    })(),
    (() => {
      const cfs = [-100, -50, 40, 90, 70];
      const r = irr(cfs);
      const a = r * 100;
      return q("ai-irr-m2", "moyen", "IRR to date, treating the remaining assets as a terminal cash flow?",
        [["Capital calls: Year 0 / Year 1", lst([mil(100), mil(50)])], ["Distributions: Year 2 / Year 3", lst([mil(40), mil(90)])],
          ["Value of remaining assets at Year 4", mil(70)]],
        a, "%", 2,
        [`Flux : ${cfTxt(cfs)} (la valeur résiduelle est le dernier flux).`,
          `IRR = r tel que ${npvTxt(cfs, r)} ≈ 0.`,
          `Calculatrice : IRR = ${Pa(a)}.`]);
    })(),
    (() => {
      const a1 = [-100, 0, 0, 200], b1 = [-100, 100, 50, 50];
      const rA = irr(a1), rB = irr(b1);
      const a = (rB - rA) * 100;
      return q("ai-irr-m3", "moyen", "Fund B's IRR minus Fund A's, in percentage points?",
        [["Fund A: Year 0 / Year 3", lst([mil(-100), mil(200)])], ["Fund B: Year 0 / Year 1 / Year 2 / Year 3", lst([mil(-100), mil(100), mil(50), mil(50)])]],
        a, "%", 2,
        [`Les deux fonds ont un MOIC de 2x.`,
          `A : (200 / 100)^(1/3) − 1 = ${P(rA, 2)}.`,
          `B : ${cfTxt(b1)} → IRR = ${P(rB, 2)}.`,
          `Écart = ${Pa(a)} : B rend l'argent plus tôt, donc un IRR plus élevé à MOIC égal.`]);
    })(),
    (() => {
      const cfs = [-60, 0, 30, 30, 40];
      const r = irr(cfs);
      const a = r * 100;
      return q("ai-irr-m4", "moyen", "IRR of the investment?",
        [["Investment at Year 0", mil(60)], ["Cash flow at Year 1", mil(0)], ["Distributions: Year 2 / Year 3 / Year 4", lst([mil(30), mil(30), mil(40)])]],
        a, "%", 2,
        [`Flux : ${cfTxt(cfs)} (le flux nul de t = 1 garde sa place).`,
          `IRR = r tel que ${npvTxt(cfs, r)} ≈ 0.`,
          `Calculatrice : IRR = ${Pa(a)}.`]);
    })(),
    (() => {
      const cfs = [-25, -25, 10, 70];
      const r = irr(cfs);
      const a = r * 100;
      return q("ai-irr-m5", "moyen", "IRR of the limited partner's cash flows?",
        [["Capital calls: Year 0 / Year 1", lst([mil(25), mil(25)])], ["Distributions: Year 2 / Year 3", lst([mil(10), mil(70)])]],
        a, "%", 2,
        [`Flux : ${cfTxt(cfs)}.`,
          `IRR = r tel que ${npvTxt(cfs, r)} ≈ 0.`,
          `Calculatrice : IRR = ${Pa(a)}.`]);
    })(),
    (() => {
      const cfs = [-50, -30, -20, 60, 80, 40];
      const r = irr(cfs);
      const a = r * 100;
      return q("ai-irr-d1", "difficile", "IRR to date, treating the remaining assets as a terminal cash flow?",
        [["Capital calls: Year 0 / Year 1 / Year 2", lst([mil(50), mil(30), mil(20)])], ["Distributions: Year 3 / Year 4", lst([mil(60), mil(80)])],
          ["Value of remaining assets at Year 5", mil(40)]],
        a, "%", 2,
        [`Flux (courbe en J : trois années d'appels) : ${cfTxt(cfs)}.`,
          `IRR = r tel que ${npvTxt(cfs, r)} ≈ 0.`,
          `Calculatrice : IRR = ${Pa(a)}.`]);
    })(),
    (() => {
      const committed = 200, cfs = [-80, -60, 50, 130];
      const r = irr(cfs);
      const a = r * 100;
      return q("ai-irr-d2", "difficile", "IRR of the limited partner's cash flows?",
        [["Committed capital", mil(committed)], ["Capital calls: Year 0 / Year 1", lst([mil(80), mil(60)])],
          ["Distributions: Year 2 / Year 3", lst([mil(50), mil(130)])], ["Uncalled commitment at Year 3", mil(committed - 140)]],
        a, "%", 2,
        ["Le capital engagé non appelé (dry powder) n'est pas un flux : seuls comptent les appels réels.",
          `Flux : ${cfTxt(cfs)}.`,
          `IRR = r tel que ${npvTxt(cfs, r)} ≈ 0 ⇒ IRR = ${Pa(a)}.`]);
    })(),
    (() => {
      const paid = 100, gross = 190, T = 4, p = 0.2;
      const carry = p * (gross - paid);
      const net = gross - carry;
      const rG = annualized(gross / paid, T), rN = annualized(net / paid, T);
      const a = rN * 100;
      return q("ai-irr-d3", "difficile", "LPs' net IRR after carried interest?",
        [["Investment at Year 0", mil(paid)], [`Gross exit proceeds at Year ${T}`, mil(gross)], ["Carried interest (on the total profit, paid at exit)", pc(p)]],
        a, "%", 2,
        [`Carry = ${P(p)} × (${F(gross)} − ${F(paid)}) = ${M(carry)} ; produit net = ${M(net)}.`,
          `IRR net = (${F(net)} / ${F(paid)})^(1/${T}) − 1 = ${Pa(a)} (IRR brut : ${P(rG, 2)}).`]);
    })(),
    (() => {
      const A = [-100, 20, 30, 40, 60], B = [-100, 0, 0, 0, 150];
      const rA = irr(A), rB = irr(B);
      const a = (rA - rB) * 100;
      return q("ai-irr-d4", "difficile", "Fund A's IRR minus Fund B's, in percentage points?",
        [["Fund A: Year 0 to Year 4", lst(A.map(mil))], ["Fund B: Year 0 to Year 4", lst(B.map(mil))]],
        a, "%", 2,
        [`MOIC identique : A = ${F((20 + 30 + 40 + 60) / 100, 2)}x ; B = ${F(150 / 100, 2)}x.`,
          `A : ${cfTxt(A)} → IRR = ${P(rA, 2)}.`,
          `B : (150 / 100)^(1/4) − 1 = ${P(rB, 2)}.`,
          `Écart = ${Pa(a)} en faveur du fonds qui distribue tôt.`]);
    })(),
    (() => {
      const c0 = 100, c1 = 50, d2 = 30, target = 0.15;
      const nav = c0 * Math.pow(1 + target, 3) + c1 * Math.pow(1 + target, 2) - d2 * (1 + target);
      const a = nav;
      return q("ai-irr-d5", "difficile", "Value of the remaining assets at Year 3 needed for an IRR of 15%, in $ millions?",
        [["Capital calls: Year 0 / Year 1", lst([mil(c0), mil(c1)])], ["Distribution at Year 2", mil(d2)], ["Target IRR", pc(target)]],
        a, "$", 2,
        ["À l'IRR visé, la VAN est nulle : on capitalise chaque flux jusqu'à t = 3.",
          `Valeur nécessaire = ${F(c0)} × ${pw(target, 3)} + ${F(c1)} × ${pw(target, 2)} − ${F(d2)} × ${pw(target, 1)}.`,
          `= ${F(c0 * Math.pow(1 + target, 3), 4)} + ${F(c1 * Math.pow(1 + target, 2), 4)} − ${F(d2 * (1 + target), 4)} = ${M(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 11 · Frais sur capital engagé ────────────────────────── */

const COMMITTED: CalcType = {
  key: "committed-capital-fees",
  topic: "alternatives",
  name: "Frais de gestion sur capital engagé (private equity)",
  tier: "annexe",
  source: "LM 1 · Alternative Investment Features, Methods, and Structures",
  formulas: [
    "Frais de gestion annuels (private equity) = taux × capital engagé (committed), même non appelé",
    "Dry powder = capital engagé − capital appelé (drawn down)",
    "Poids des frais sur le capital investi = frais / capital appelé",
  ],
  traps: [
    "Base = capital engagé, pas le capital appelé ni la NAV (contrairement au hedge fund, facturé sur les actifs).",
    "Tant que le capital n'est pas investi, les frais pèsent lourd sur le capital réellement au travail (courbe en J).",
  ],
  questions: [
    (() => {
      const committed = 400, called = 120, m = 0.02;
      const a = m * committed;
      return q("ai-commit-f1", "facile", "Annual management fee, in $ millions?",
        [["Committed capital", mil(committed)], ["Capital called to date", mil(called)], ["Management fee (on committed capital)", pc(m)]],
        a, "$", 2,
        [`Base des frais en private equity = capital engagé, même non appelé.`,
          `Frais = ${P(m)} × ${M(committed)} = ${M(a, 2)} (et non ${M(m * called)} sur le capital appelé).`]);
    })(),
    (() => {
      const committed = 600, called = 210;
      const a = committed - called;
      return q("ai-commit-f2", "facile", "Dry powder remaining, in $ millions?",
        [["Committed capital", mil(committed)], ["Capital drawn down to date", mil(called)]],
        a, "$", 2,
        [`Dry powder = ${M(committed)} − ${M(called)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const committed = 300, called = 100, m = 0.02;
      const a = ((m * committed) / called) * 100;
      return q("ai-commit-f3", "facile", "Annual management fee as a percentage of the capital called?",
        [["Committed capital", mil(committed)], ["Capital called", mil(called)], ["Management fee (on committed capital)", pc(m)]],
        a, "%", 2,
        [`Frais = ${P(m)} × ${M(committed)} = ${M(m * committed)}.`,
          `En % du capital appelé = ${F(m * committed)} / ${F(called)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const committed = 250, m = 0.015, years = 3;
      const a = m * committed * years;
      return q("ai-commit-f4", "facile", "Cumulative management fees over the first three years, in $ millions?",
        [["Committed capital", mil(committed)], ["Management fee (on committed capital, per year)", pc(m)], ["Period", `${years} years`]],
        a, "$", 2,
        [`Frais annuels = ${P(m)} × ${M(committed)} = ${M(m * committed)}.`,
          `Sur ${years} ans = ${F(years)} × ${M(m * committed)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const committed = 500, pct = 0.15;
      const a = pct * committed;
      return q("ai-commit-f5", "facile", "Amount of the capital call, in $ millions?",
        [["Committed capital", mil(committed)], ["Capital call (% of commitments)", pc(pct)]],
        a, "$", 2,
        [`Appel = ${P(pct)} × ${M(committed)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const committed = 200, m = 0.02, cum = [50, 110, 160];
      const fees = m * committed * cum.length;
      const a = (fees / cum[2]) * 100;
      return q("ai-commit-m1", "moyen", "Cumulative management fees as a percentage of cumulative capital called, at the end of Year 3?",
        [["Committed capital", mil(committed)], ["Management fee (on committed capital, per year)", pc(m)],
          ["Cumulative capital called: end of Year 1 / 2 / 3", lst(cum.map(mil))]],
        a, "%", 2,
        [`Frais annuels = ${P(m)} × ${M(committed)} = ${M(m * committed)} ; sur 3 ans = ${M(fees)}.`,
          `Rapportés au capital appelé fin d'année 3 : ${F(fees)} / ${F(cum[2])} = ${Pa(a)}.`]);
    })(),
    (() => {
      const committed = 800, calls = [0.2, 0.25, 0.15];
      const a = committed * (1 - sum(calls));
      return q("ai-commit-m2", "moyen", "Dry powder remaining after the three capital calls, in $ millions?",
        [["Committed capital", mil(committed)], ["Capital calls (% of commitments): Year 1 / 2 / 3", lst(calls.map((c) => pc(c)))]],
        a, "$", 2,
        [`Appelé au total = ${P(calls[0])} + ${P(calls[1])} + ${P(calls[2])} = ${P(sum(calls))} de ${M(committed)} = ${M(sum(calls) * committed)}.`,
          `Dry powder = ${M(committed)} − ${M(sum(calls) * committed)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const fund = 500, lp = 50, callPct = 0.3, m = 0.02;
      const call = callPct * lp, fee = m * lp;
      const a = call + fee;
      return q("ai-commit-m3", "moyen", "Total cash the LP pays in Year 1 (capital call plus management fee), in $ millions?",
        [["Fund size (total commitments)", mil(fund)], ["LP's commitment", mil(lp)], ["Year 1 capital call (% of commitments)", pc(callPct)],
          ["Management fee (on committed capital, paid by the LPs)", pc(m)]],
        a, "$", 2,
        [`Appel versé par le LP = ${P(callPct)} × ${M(lp)} = ${M(call)}.`,
          `Frais de gestion du LP = ${P(m)} × ${M(lp)} (son engagement) = ${M(fee)}.`,
          `Total = ${M(call)} + ${M(fee)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const committed = 300, nav = 120, m = 0.02;
      const a = m * committed - m * nav;
      return q("ai-commit-m4", "moyen", "How much more is the annual fee on committed capital than a fee on the portfolio's NAV would be, in $ millions?",
        [["Committed capital", mil(committed)], ["Net asset value of investments made", mil(nav)], ["Management fee rate", pc(m)]],
        a, "$", 2,
        [`Sur capital engagé (private equity) : ${P(m)} × ${M(committed)} = ${M(m * committed)}.`,
          `Sur la NAV (façon hedge fund) : ${P(m)} × ${M(nav)} = ${M(m * nav)}.`,
          `Écart = ${M(a, 2)}.`]);
    })(),
    (() => {
      const committed = 400, called = 150, r = 0.1, m = 0.02;
      const gain = r * called, fee = m * committed;
      const a = ((gain - fee) / called) * 100;
      return q("ai-commit-m5", "moyen", "LPs' return on the capital called, after the management fee?",
        [["Committed capital", mil(committed)], ["Capital called and invested", mil(called)], ["Return on the invested capital", pc(r)],
          ["Management fee (on committed capital)", pc(m)]],
        a, "%", 2,
        [`Gain sur le capital investi = ${P(r)} × ${M(called)} = ${M(gain)}.`,
          `Frais = ${P(m)} × ${M(committed)} = ${M(fee)}.`,
          `Rendement net = (${F(gain)} − ${F(fee)}) / ${F(called)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const committed = 500, called = 100, value = 105, m = 0.02;
      const fee = m * committed, paid = called + fee;
      const a = (value / paid - 1) * 100;
      return q("ai-commit-d1", "difficile", "LPs' Year 1 return on all cash paid in (capital called plus fees)?",
        [["Committed capital", mil(committed)], ["Capital called and invested in Year 1", mil(called)], ["Value of investments at end of Year 1", mil(value)],
          ["Management fee (on committed capital, paid by the LPs in addition to calls)", pc(m)]],
        a, "%", 2,
        [`Frais = ${P(m)} × ${M(committed)} = ${M(fee)} ; versé au total = ${M(called)} + ${M(fee)} = ${M(paid)}.`,
          `Rendement = ${F(value)} / ${F(paid)} − 1 = ${Pa(a)} : négatif malgré des investissements en hausse de ${P(value / called - 1)} (courbe en J).`]);
    })(),
    (() => {
      const fund = 1000, lp = 100, calls = [0.25, 0.3], m = 0.015;
      const callAmt = sum(calls) * lp, fees = m * lp * calls.length;
      const a = callAmt + fees;
      return q("ai-commit-d2", "difficile", "LP's cumulative cash outflow after two years (capital calls plus management fees), in $ millions?",
        [["Fund size (total commitments)", mil(fund)], ["LP's commitment", mil(lp)], ["Capital calls (% of commitments): Year 1 / Year 2", lst(calls.map((c) => pc(c)))],
          ["Management fee (on committed capital, per year, paid by the LPs)", pc(m)]],
        a, "$", 2,
        [`Appels du LP = (${P(calls[0])} + ${P(calls[1])}) × ${M(lp)} = ${M(callAmt)}.`,
          `Frais = ${P(m)} × ${M(lp)} × 2 ans = ${M(fees)} (sur l'engagement, pas sur l'appelé).`,
          `Sortie cumulée = ${M(callAmt)} + ${M(fees)} = ${M(a, 2)}.`]);
    })(),
    (() => {
      const committed = 750, called = 380, nav = 420, m = 0.02;
      const a = m * committed;
      return q("ai-commit-d3", "difficile", "Annual management fee, in $ millions?",
        [["Committed capital", mil(committed)], ["Capital called to date", mil(called)], ["Net asset value of the portfolio", mil(nav)],
          ["Management fee (private equity fund, on committed capital)", pc(m)]],
        a, "$", 2,
        ["En private equity, la base est le capital engagé : ni l'appelé, ni la NAV.",
          `Frais = ${P(m)} × ${M(committed)} = ${M(a, 2)} (pièges : ${M(m * called)} sur l'appelé, ${M(m * nav)} sur la NAV).`]);
    })(),
    (() => {
      const committed = 300, m = 0.02, calls = [60, 90, 75];
      const fees = m * committed * calls.length, called = sum(calls);
      const a = (fees / called) * 100;
      return q("ai-commit-d4", "difficile", "Cumulative management fees as a percentage of cumulative capital called, after Year 3?",
        [["Committed capital", mil(committed)], ["Management fee (on committed capital, per year)", pc(m)],
          ["Capital called in Year 1 / Year 2 / Year 3", lst(calls.map(mil))]],
        a, "%", 2,
        [`Frais cumulés = ${P(m)} × ${M(committed)} × 3 = ${M(fees)}.`,
          `Capital appelé cumulé = ${F(calls[0])} + ${F(calls[1])} + ${F(calls[2])} = ${M(called)}.`,
          `Rapport = ${F(fees)} / ${F(called)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const committed = 400, invested = 160, m = 0.02;
      const fee = m * committed;
      const a = (fee / invested) * 100;
      return q("ai-commit-d5", "difficile", "Return on the invested capital needed for the LPs to break even after the annual management fee?",
        [["Committed capital", mil(committed)], ["Capital invested", mil(invested)], ["Management fee (on committed capital)", pc(m)]],
        a, "%", 2,
        [`Frais annuels = ${P(m)} × ${M(committed)} = ${M(fee)}.`,
          `Point mort : rendement × ${M(invested)} = ${M(fee)} ⇒ rendement = ${F(fee)} / ${F(invested)} = ${Pa(a)}.`,
          `Un taux de ${P(m)} sur l'engagé pèse ${Pa(a)} sur le capital réellement investi.`]);
    })(),
  ],
};

/* ────────────────────────── Catalogue ────────────────────────── */

export const ALTERNATIVES_CALC: CalcCatalog = {
  topic: "alternatives",
  types: [
    HF_FEES,
    HURDLE,
    HIGH_WATER_MARK,
    FUND_OF_FUNDS,
    LEVERAGE,
    CATCH_UP,
    WATERFALL,
    MOIC,
    COMMODITY,
    FUND_IRR,
    COMMITTED,
  ],
};
