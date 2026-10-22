// Exercices de calcul pur : Corporate Issuers (CFA Level I).
//
// Contenu seulement : le moteur et les pages vivent ailleurs (lib/calc/engine.ts, app/calculs).
// Règle d'or : chaque réponse est CALCULÉE ici, à partir des mêmes nombres que les données
// affichées, par les petites fonctions financières du haut de fichier. Aucune réponse tapée à la main.
// Formules vérifiées dans Schweser Level I, Book 1 (Readings 20 à 26 = LM 1 à 7 du curriculum
// Corporate Issuers 2025-2026) et recoupées avec la banque officielle de practice exams.
// Programme 2025-2026 : les anciens modules « Measures of Leverage » (DOL, DFL) et « Cost of Capital »
// (CAPM, DDM, bond yield plus, coût des actions préférentielles) ne sont plus en Corporate Issuers
// au niveau I ; le WACC se calcule à partir de coûts donnés (LM 6) et le DOL vit en Equity (LM 5).
//
// Conventions : énoncés et données en anglais d'examen ; solutions en français, nombres au format
// français. Pour une réponse en %, `answer` vaut déjà le pourcentage (8,5 % → 8.5).
// Année de 365 jours (convention du curriculum pour le crédit fournisseur et les ratios en jours),
// sauf mention contraire dans les données.

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
/** Montants en millions de dollars. */
const M = (x: number, d?: number): string => `${F(x, d ?? (isInt(x) ? 0 : 2))} M$`;
/** Exposant affiché : 7 → « ⁷ ». */
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (t: number): string =>
  String(t)
    .split("")
    .map((c) => SUP.charAt(Number(c)))
    .join("");
/** Facteur d'actualisation affiché : (1 + r)^t → « 1,12³ ». */
const pw = (r: number, t: number): string => `${F(1 + r)}${t === 1 ? "" : sup(t)}`;

/** Formats anglais (données d'énoncé). */
const E = (x: number, d?: number): string => numStr(x, d, ".", ",");
const usd = (x: number, d?: number): string => `${x < 0 ? MINUS : ""}$${E(Math.abs(x), d ?? (isInt(x) ? 0 : 2))}`;
const pc = (frac: number, d?: number): string => `${E(frac * 100, d)}%`;
const mx = (x: number): string => `${E(x)}x`;
const lst = (xs: string[]): string => xs.join(" / ");
const days = (x: number): string => `${E(x)} days`;

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
const pv = (cf: number, r: number, t: number): number => cf / Math.pow(1 + r, t);
/** NPV d'une suite de flux, cfs[0] en t = 0. */
const npv = (r: number, cfs: number[]): number => cfs.reduce((s, cf, t) => s + pv(cf, r, t), 0);
/** Facteur d'annuité : Σ 1 / (1 + r)^t, t = 1..n. */
const annuity = (r: number, n: number): number => (1 - Math.pow(1 + r, -n)) / r;
/** IRR par dichotomie (flux conventionnels : NPV décroissante en r). */
function irr(cfs: number[]): number {
  let lo = -0.99;
  let hi = 1;
  while (npv(hi, cfs) > 0) hi *= 2;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid, cfs) > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
/** Flux regroupés [montant, nombre d'années] → suite t = 1..n. */
function expand(groups: [number, number][]): number[] {
  const out: number[] = [];
  for (const [cf, n] of groups) for (let i = 0; i < n; i++) out.push(cf);
  return out;
}
/** Saisie calculatrice (TI BA II Plus) d'une suite de flux. */
function cfKeys(cf0: number, flows: number[]): string {
  const groups: [number, number][] = [];
  for (const cf of flows) {
    const last = groups[groups.length - 1];
    if (last && last[0] === cf) last[1] += 1;
    else groups.push([cf, 1]);
  }
  return `CF0 = ${F(cf0)} ; ${groups.map(([cf, n], i) => `C0${i + 1} = ${F(cf)}, F0${i + 1} = ${n}`).join(" ; ")}`;
}
/** Somme d'actualisation lisible : « 4 000 / 1,09 + 5 000 / 1,09² ». */
const pvTerms = (flows: number[], r: number): string =>
  flows.map((cf, i) => (i === 0 ? "" : cf < 0 ? " − " : " + ") + `${F(Math.abs(cf))} / ${pw(r, i + 1)}`).join("");
const pvList = (flows: number[], r: number): string => flows.map((cf, i) => F(pv(cf, r, i + 1), 2)).join(" ; ");

// LM 1 · Double imposition
const effTax = (tc: number, td: number, payout = 1): number => tc + payout * (1 - tc) * td;

// LM 2 · Levier et ROE
function levered(rev: number, opex: number, assets: number, debt: number, rd: number, t = 0) {
  const ebit = rev - opex;
  const interest = debt * rd;
  const ni = (ebit - interest) * (1 - t);
  const equity = assets - debt;
  return { ebit, interest, ni, equity, roe: ni / equity };
}

// LM 4 · Working Capital and Liquidity
const daysOf = (balance: number, flow: number, year = 365): number => balance / (flow / year);
const ccc = (doh: number, dso: number, dpo: number): number => doh + dso - dpo;
/** Coût annuel effectif du crédit fournisseur « a/b net c » : (1 + a / (1 − a))^(365 / (c − b)) − 1. */
const tradeEAR = (disc: number, discDays: number, netDays: number, year = 365): number =>
  Math.pow(1 + disc / (1 - disc), year / (netDays - discDays)) - 1;

// LM 5 · Capital Investments
const nopat = (ebit: number, t: number): number => ebit * (1 - t);

// LM 6 · Capital Structure
const wacc = (wd: number, rd: number, t: number, we: number, re: number, wp = 0, rp = 0): number =>
  wd * rd * (1 - t) + wp * rp + we * re;
/** MM II : r_e = r_0 + (r_0 − r_d) × (1 − t) × D/E (t = 0 sans impôt). */
const mmRe = (r0: number, rd: number, de: number, t = 0): number => r0 + (r0 - rd) * (1 - t) * de;
const deFromDv = (dv: number): number => dv / (1 - dv);
const dvFromDe = (de: number): number => de / (1 + de);

/* ────────────────────────── 1 · Double imposition ────────────────────────── */

const DOUBLE_TAX: CalcType = {
  key: "double-taxation",
  topic: "corporate",
  name: "Double imposition des dividendes (taux effectif)",
  tier: "annexe",
  source: "LM 1 · Organizational Forms, Corporate Issuer Features, and Ownership",
  formulas: [
    "Impôt total = impôt sur les sociétés + impôt personnel sur les dividendes versés",
    "Taux effectif (tout distribué) = t_société + t_dividende × (1 − t_société)",
    "Taux effectif (payout p) = t_société + p × (1 − t_société) × t_dividende",
    "Taux effectif = impôt total / résultat avant impôt",
  ],
  traps: [
    "Le payout s'applique au résultat APRÈS impôt sur les sociétés, pas au résultat avant impôt.",
    "Une société de personnes (partnership) n'est imposée qu'une fois, au taux personnel des associés.",
  ],
  questions: [
    (() => {
      const tc = 0.21, td = 0.15;
      const a = effTax(tc, td) * 100;
      return q("ci-dtax-f1", "facile", "Effective tax rate on corporate profits if all after-tax profits are paid out as dividends?",
        [["Corporate tax rate", pc(tc)], ["Tax rate on dividends", pc(td)], ["Payout ratio", "100%"]],
        a, "%", 2,
        [`Sur 100 $ de résultat avant impôt : impôt société = ${D(tc * 100)}, dividende versé = ${D((1 - tc) * 100)}.`,
          `Impôt sur le dividende = ${P(td)} × ${F((1 - tc) * 100)} = ${D(td * (1 - tc) * 100, 2)}.`,
          `Taux effectif = ${P(tc)} + ${P(td)} × (1 − ${P(tc)}) = ${Pa(a)}.`]);
    })(),
    (() => {
      const pre = 8000000, tc = 0.25, td = 0.2;
      const corp = pre * tc, div = pre - corp, dtax = div * td;
      const a = corp + dtax;
      return q("ci-dtax-f2", "facile", "Total tax paid on the profit (corporate tax + dividend tax)?",
        [["Pretax earnings", usd(pre)], ["Corporate tax rate", pc(tc)], ["Tax rate on dividends", pc(td)], ["Payout of after-tax profit", "100%"]],
        a, "$", 0,
        [`Impôt société = ${P(tc)} × ${D(pre)} = ${D(corp)} ; dividende = ${D(div)}.`,
          `Impôt sur dividendes = ${P(td)} × ${D(div)} = ${D(dtax)}.`,
          `Impôt total = ${D(corp)} + ${D(dtax)} = ${D(a)}.`]);
    })(),
    (() => {
      const tc = 0.3, td = 0.1, base = 100;
      const a = base * (1 - tc) * (1 - td);
      return q("ci-dtax-f3", "facile", "Amount shareholders keep, after all taxes, per $100 of pretax profit?",
        [["Pretax profit", usd(base)], ["Corporate tax rate", pc(tc)], ["Tax rate on dividends", pc(td)], ["Payout ratio", "100%"]],
        a, "$", 2,
        [`Après impôt société : ${F(base)} × (1 − ${P(tc)}) = ${D(base * (1 - tc))}, entièrement distribués.`,
          `Après impôt sur dividende : ${F(base * (1 - tc))} × (1 − ${P(td)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const tc = 0.25, td = 0.2;
      const a = effTax(tc, td) * 100;
      return q("ci-dtax-f4", "facile", "Effective tax rate on the corporation's profit (100% payout)?",
        [["Corporate tax rate", pc(tc)], ["Tax rate on dividends", pc(td)]],
        a, "%", 2,
        ["Taux effectif = t_société + t_dividende × (1 − t_société).",
          `= ${P(tc)} + ${P(td)} × ${F(1 - tc)} = ${P(tc)} + ${P(td * (1 - tc))} = ${Pa(a)}.`]);
    })(),
    (() => {
      const tc = 0.19, td = 0.3;
      const a = effTax(tc, td) * 100;
      return q("ci-dtax-f5", "facile", "Effective tax rate on distributed corporate profits?",
        [["Corporate income tax rate", pc(tc)], ["Personal tax rate on dividends", pc(td)], ["Payout ratio", "100%"]],
        a, "%", 2,
        [`Impôt sur dividende par dollar de profit = ${P(td)} × (1 − ${P(tc)}) = ${P(td * (1 - tc), 2)}.`,
          `Taux effectif = ${P(tc)} + ${P(td * (1 - tc), 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const pre = 12000000, tc = 0.25, td = 0.15, p = 0.5;
      const corp = pre * tc, ati = pre - corp, div = p * ati, dtax = td * div, tot = corp + dtax;
      const a = (tot / pre) * 100;
      return q("ci-dtax-m1", "moyen", "Effective tax rate on the company's pretax earnings?",
        [["Pretax earnings", usd(pre)], ["Corporate tax rate", pc(tc)], ["Tax rate on dividends", pc(td)], ["Share of after-tax profit paid as dividends", pc(p)]],
        a, "%", 2,
        [`Impôt société = ${D(corp)} ; résultat après impôt = ${D(ati)}.`,
          `Dividendes = ${P(p)} × ${D(ati)} = ${D(div)} ; impôt sur dividendes = ${P(td)} × ${D(div)} = ${D(dtax)}.`,
          `Impôt total = ${D(tot)} ; taux effectif = ${F(tot)} / ${F(pre)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const tc = 0.2, td = 0.25, p1 = 1, p2 = 0.3;
      const e1 = effTax(tc, td, p1), e2 = effTax(tc, td, p2);
      const a = (e1 - e2) * 100;
      return q("ci-dtax-m2", "moyen", "Reduction in the effective tax rate (percentage points) if the payout falls from 100% to 30%?",
        [["Corporate tax rate", pc(tc)], ["Tax rate on dividends", pc(td)], ["Payout ratio", `${pc(p1)} → ${pc(p2)}`]],
        a, "%", 2,
        [`Payout 100% : ${P(tc)} + ${P(td)} × ${F(1 - tc)} = ${P(e1, 2)}.`,
          `Payout 30% : ${P(tc)} + ${F(p2)} × ${F(1 - tc)} × ${P(td)} = ${P(e2, 2)}.`,
          `Baisse = ${P(e1, 2)} − ${P(e2, 2)} = ${Pa(a)} (points de pourcentage).`]);
    })(),
    (() => {
      const eff = 0.36, tc = 0.2;
      const a = ((eff - tc) / (1 - tc)) * 100;
      return q("ci-dtax-m3", "moyen", "Dividend tax rate implied by the effective tax rate (100% payout)?",
        [["Effective tax rate on corporate profits", pc(eff)], ["Corporate tax rate", pc(tc)]],
        a, "%", 2,
        [`${P(eff)} = ${P(tc)} + t_div × (1 − ${P(tc)}).`,
          `t_div = (${F(eff)} − ${F(tc)}) / ${F(1 - tc)} = ${F(eff - tc)} / ${F(1 - tc)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const pre = 5000000, tc = 0.28, p = 0.6, td = 0.15;
      const ati = pre * (1 - tc), div = p * ati;
      const a = div * (1 - td);
      return q("ci-dtax-m4", "moyen", "Dividends received by shareholders after personal taxes?",
        [["Pretax earnings", usd(pre)], ["Corporate tax rate", pc(tc)], ["Payout ratio (of after-tax profit)", pc(p)], ["Tax rate on dividends", pc(td)]],
        a, "$", 0,
        [`Résultat après impôt = ${D(pre)} × (1 − ${P(tc)}) = ${D(ati)}.`,
          `Dividendes = ${P(p)} × ${D(ati)} = ${D(div)}.`,
          `Net perçu = ${D(div)} × (1 − ${P(td)}) = ${D(a, 0)}.`]);
    })(),
    (() => {
      const tc = 0.2, td = 0.25, eff = 0.32;
      const a = ((eff - tc) / ((1 - tc) * td)) * 100;
      return q("ci-dtax-m5", "moyen", "Payout ratio (of after-tax profit) consistent with the effective tax rate?",
        [["Effective tax rate", pc(eff)], ["Corporate tax rate", pc(tc)], ["Tax rate on dividends", pc(td)]],
        a, "%", 2,
        [`${P(eff)} = ${P(tc)} + p × (1 − ${P(tc)}) × ${P(td)} = ${P(tc)} + p × ${P((1 - tc) * td)}.`,
          `p = (${F(eff)} − ${F(tc)}) / ${F((1 - tc) * td)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const tc = 0.25, td = 0.15, p = 0.7, tInt = 0.35;
      const a = effTax(tc, td, p) * 100;
      return q("ci-dtax-d1", "difficile", "Effective tax rate on the corporation's pretax profit?",
        [["Corporate tax rate", pc(tc)], ["Shareholders' tax rate on dividends", pc(td)], ["Shareholders' tax rate on interest income", pc(tInt)],
          ["Share of after-tax profit paid as dividends", pc(p)]],
        a, "%", 2,
        ["Le taux sur les intérêts ne concerne pas les dividendes : donnée-piège.",
          `Impôt sur dividendes par dollar de profit = ${F(p)} × (1 − ${P(tc)}) × ${P(td)} = ${P(p * (1 - tc) * td, 3)}.`,
          `Taux effectif = ${P(tc)} + ${P(p * (1 - tc) * td, 3)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const pre = 2000000, tp = 0.3, tc = 0.21, td = 0.238;
      const corp = pre * tc, div = pre - corp, dtax = div * td, totC = corp + dtax, totP = pre * tp;
      const a = totC - totP;
      return q("ci-dtax-d2", "difficile", "Extra tax paid if the business is a corporation (100% payout) rather than a partnership?",
        [["Pretax profit", usd(pre)], ["Partners' personal income tax rate", pc(tp)], ["Corporate tax rate", pc(tc)], ["Tax rate on dividends", pc(td, 1)]],
        a, "$", 0,
        [`Partnership : un seul niveau d'impôt, ${P(tp)} × ${D(pre)} = ${D(totP)}.`,
          `Société : impôt société ${D(corp)} ; dividende ${D(div)} taxé à ${P(td, 1)} = ${D(dtax)} ; total ${D(totC)}.`,
          `Surcoût = ${D(totC)} − ${D(totP)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const pre = 40000000, tc = 0.25, divPaid = 12000000, td = 0.2;
      const corp = pre * tc, ati = pre - corp, dtax = divPaid * td, tot = corp + dtax;
      const a = (tot / pre) * 100;
      return q("ci-dtax-d3", "difficile", "Effective tax rate on pretax earnings?",
        [["Pretax earnings", usd(pre)], ["Corporate tax rate", pc(tc)], ["Dividends paid", usd(divPaid)], ["Tax rate on dividends", pc(td)]],
        a, "%", 2,
        [`Résultat après impôt = ${D(ati)} : le payout vaut ${F(divPaid)} / ${F(ati)} = ${P(divPaid / ati)} (pas ${P(divPaid / pre)}, qui rapporte au résultat avant impôt).`,
          `Impôt total = ${D(corp)} + ${P(td)} × ${D(divPaid)} = ${D(corp)} + ${D(dtax)} = ${D(tot)}.`,
          `Taux effectif = ${F(tot)} / ${F(pre)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const eff = 0.405, td = 0.15;
      const a = ((eff - td) / (1 - td)) * 100;
      return q("ci-dtax-d4", "difficile", "Corporate tax rate implied by the effective tax rate (100% payout)?",
        [["Effective tax rate on distributed profits", pc(eff)], ["Tax rate on dividends", pc(td)]],
        a, "%", 2,
        [`${P(eff)} = t_c + ${P(td)} × (1 − t_c) = ${P(td)} + t_c × (1 − ${P(td)}).`,
          `t_c = (${F(eff)} − ${F(td)}) / ${F(1 - td)} = ${F(eff - td)} / ${F(1 - td)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const net = 1020000, tc = 0.25, p = 0.8, td = 0.15;
      const k = (1 - tc) * p * (1 - td);
      const a = net / k;
      return q("ci-dtax-d5", "difficile", "Pretax earnings needed for shareholders to receive this amount after all taxes?",
        [["Target dividends after personal taxes", usd(net)], ["Corporate tax rate", pc(tc)], ["Payout ratio (of after-tax profit)", pc(p)], ["Tax rate on dividends", pc(td)]],
        a, "$", 0,
        [`Chaque dollar avant impôt rapporte (1 − ${P(tc)}) × ${F(p)} × (1 − ${P(td)}) = ${F(k, 4)} $ net aux actionnaires.`,
          `Résultat avant impôt = ${D(net)} / ${F(k, 4)} = ${D(a, 0)}.`]);
    })(),
  ],
};

/* ────────────────────────── 2 · Levier et ROE ────────────────────────── */

const LEVERAGE_ROE: CalcType = {
  key: "leverage-roe",
  topic: "corporate",
  name: "Levier financier et ROE (prêteurs vs actionnaires)",
  tier: "essentiel",
  source: "LM 2 · Investors and Other Stakeholders",
  formulas: [
    "Résultat opérationnel = CA − charges opérationnelles ; intérêts = taux de la dette × dette",
    "Résultat net = (résultat opérationnel − intérêts) × (1 − t)",
    "ROE = résultat net / fonds propres, avec fonds propres = actifs − dette",
    "Le levier augmente le ROE tant que le rendement des actifs dépasse le coût de la dette",
  ],
  traps: [
    "Diviser par les fonds propres, pas par l'actif total.",
    "Avec dette, une baisse du CA fait chuter le ROE bien plus vite (effet amplificateur) ; les prêteurs, eux, ne gagnent jamais plus que les intérêts promis.",
  ],
  questions: [
    (() => {
      const rev = 2500, opex = 2100, assets = 4000;
      const r = levered(rev, opex, assets, 0, 0);
      const a = r.roe * 100;
      return q("ci-roe-f1", "facile", "ROE if the assets are financed 100% with equity? (No taxes.)",
        [["Revenues", usd(rev)], ["Operating expenses", usd(opex)], ["Assets (100% equity)", usd(assets)]],
        a, "%", 2,
        [`Résultat = ${F(rev)} − ${F(opex)} = ${D(r.ebit)} ; pas d'intérêts, pas d'impôt.`,
          `ROE = ${F(r.ni)} / ${F(assets)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const rev = 1500, opex = 1200, assets = 2000, wd = 0.4, rd = 0.06;
      const r = levered(rev, opex, assets, assets * wd, rd);
      const a = r.roe * 100;
      return q("ci-roe-f2", "facile", "ROE with the debt financing? (No taxes.)",
        [["Revenues", usd(rev)], ["Operating expenses", usd(opex)], ["Assets", usd(assets)], ["Financing", `${pc(wd)} debt / ${pc(1 - wd)} equity`], ["Interest rate on debt", pc(rd)]],
        a, "%", 2,
        [`Dette = ${D(assets * wd)} ; intérêts = ${P(rd)} × ${F(assets * wd)} = ${D(r.interest)}.`,
          `Résultat net = ${F(r.ebit)} − ${F(r.interest)} = ${D(r.ni)} ; fonds propres = ${D(r.equity)}.`,
          `ROE = ${F(r.ni)} / ${F(r.equity)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const ebit = 500, int = 100, t = 0.25, eq = 2000;
      const ni = (ebit - int) * (1 - t);
      const a = (ni / eq) * 100;
      return q("ci-roe-f3", "facile", "Return on equity?",
        [["Operating profit (EBIT)", usd(ebit)], ["Interest expense", usd(int)], ["Tax rate", pc(t)], ["Shareholders' equity", usd(eq)]],
        a, "%", 2,
        [`Résultat net = (${F(ebit)} − ${F(int)}) × (1 − ${P(t)}) = ${D(ni)}.`,
          `ROE = ${F(ni)} / ${F(eq)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const rev = 800, opex = 650, t = 0.2, assets = 1000;
      const r = levered(rev, opex, assets, 0, 0, t);
      const a = r.roe * 100;
      return q("ci-roe-f4", "facile", "ROE of the all-equity company?",
        [["Revenues", usd(rev)], ["Operating expenses", usd(opex)], ["Tax rate", pc(t)], ["Assets (100% equity)", usd(assets)]],
        a, "%", 2,
        [`Résultat net = (${F(rev)} − ${F(opex)}) × (1 − ${P(t)}) = ${D(r.ni)}.`,
          `ROE = ${F(r.ni)} / ${F(assets)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const assets = 5000, dr = 0.6, ni = 260;
      const eq = assets * (1 - dr);
      const a = (ni / eq) * 100;
      return q("ci-roe-f5", "facile", "Return on equity?",
        [["Total assets", usd(assets)], ["Debt / total assets", pc(dr)], ["Net income", usd(ni)]],
        a, "%", 2,
        [`Fonds propres = ${F(assets)} × (1 − ${P(dr)}) = ${D(eq)}.`,
          `ROE = ${F(ni)} / ${F(eq)} = ${Pa(a)} (et non ${P(ni / assets)} sur l'actif total).`]);
    })(),
    (() => {
      const rev0 = 2000, drop = 0.1, opex = 1500, assets = 3000, wd = 0.5, rd = 0.08;
      const rev = rev0 * (1 - drop);
      const r = levered(rev, opex, assets, assets * wd, rd);
      const a = r.roe * 100;
      return q("ci-roe-m1", "moyen", "ROE after the fall in revenues? (No taxes; operating expenses unchanged.)",
        [["Revenues before the fall", usd(rev0)], ["Fall in revenues", pc(drop)], ["Operating expenses", usd(opex)], ["Assets", usd(assets)],
          ["Debt financing", `${pc(wd)} of assets at ${pc(rd)}`]],
        a, "%", 2,
        [`Nouveau CA = ${F(rev0)} × ${F(1 - drop)} = ${D(rev)} ; résultat opérationnel = ${D(r.ebit)}.`,
          `Intérêts = ${P(rd)} × ${F(assets * wd)} = ${D(r.interest)} ; résultat net = ${D(r.ni)}.`,
          `ROE = ${F(r.ni)} / ${F(r.equity)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const rev = 1200, opex = 950, assets = 2000, wd = 0.5, rd = 0.07, t = 0.25;
      const u = levered(rev, opex, assets, 0, 0, t), l = levered(rev, opex, assets, assets * wd, rd, t);
      const a = (l.roe - u.roe) * 100;
      return q("ci-roe-m2", "moyen", "Increase in ROE (percentage points) from 50% debt financing versus all equity?",
        [["Revenues", usd(rev)], ["Operating expenses", usd(opex)], ["Assets", usd(assets)], ["Interest rate on debt", pc(rd)], ["Tax rate", pc(t)]],
        a, "%", 2,
        [`Sans dette : RN = ${F(u.ebit)} × ${F(1 - t)} = ${F(u.ni, 2)} ; ROE = ${F(u.ni, 2)} / ${F(assets)} = ${P(u.roe, 3)}.`,
          `50% dette : intérêts = ${F(l.interest)} ; RN = (${F(l.ebit)} − ${F(l.interest)}) × ${F(1 - t)} = ${F(l.ni, 2)} ; ROE = ${F(l.ni, 2)} / ${F(l.equity)} = ${P(l.roe, 3)}.`,
          `Gain = ${Pa(a)} (points de pourcentage).`]);
    })(),
    (() => {
      const assets = 1000, debt = 500, rd = 0.1, opex = 800;
      const a = opex + debt * rd;
      return q("ci-roe-m3", "moyen", "Revenues at which ROE falls to zero?",
        [["Assets", usd(assets)], ["Debt", usd(debt)], ["Interest rate on debt", pc(rd)], ["Operating expenses (fixed)", usd(opex)]],
        a, "$", 0,
        [`ROE nul quand le résultat opérationnel couvre juste les intérêts : ${P(rd)} × ${F(debt)} = ${D(debt * rd)}.`,
          `CA = ${F(opex)} + ${F(debt * rd)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const rev = 1000, opex = 940, assets = 1000, debt = 600, rd = 0.09;
      const r = levered(rev, opex, assets, debt, rd);
      const a = r.roe * 100;
      return q("ci-roe-m4", "moyen", "ROE with the debt financing? (No taxes.)",
        [["Revenues", usd(rev)], ["Operating expenses", usd(opex)], ["Assets", usd(assets)], ["Debt", usd(debt)], ["Interest rate on debt", pc(rd)]],
        a, "%", 2,
        [`Résultat opérationnel = ${D(r.ebit)}, soit ${P(r.ebit / assets)} des actifs, moins que le coût de la dette (${P(rd)}).`,
          `Intérêts = ${D(r.interest)} ; résultat net = ${D(r.ni)} ; fonds propres = ${D(r.equity)}.`,
          `ROE = ${F(r.ni)} / ${F(r.equity)} = ${Pa(a)} : ici le levier détruit du ROE (${P(r.ebit / assets)} sans dette).`]);
    })(),
    (() => {
      const liq = 72, promised = 90;
      const toDebt = Math.min(liq, promised);
      const a = (1 - toDebt / promised) * 100;
      return q("ci-roe-m5", "moyen", "Loss to lenders as a percentage of the promised payment?",
        [["Liquidation value of the assets ($ millions)", E(liq)], ["Promised payment to lenders: principal + interest ($ millions)", E(promised)]],
        a, "%", 2,
        [`Les prêteurs passent avant les actionnaires : ils reçoivent min(${F(liq)}, ${F(promised)}) = ${M(toDebt)} ; les actionnaires reçoivent 0.`,
          `Perte = 1 − ${F(toDebt)} / ${F(promised)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const rev = 3000, opex = 2400, assets = 4000, debt = 2500, rd = 0.08, t = 0.25;
      const be = opex + debt * rd;
      const a = (1 - be / rev) * 100;
      return q("ci-roe-d1", "difficile", "Percentage fall in revenues that would reduce ROE to zero? (Operating expenses fixed.)",
        [["Revenues", usd(rev)], ["Operating expenses", usd(opex)], ["Assets", usd(assets)], ["Debt", usd(debt)], ["Interest rate on debt", pc(rd)], ["Tax rate", pc(t)]],
        a, "%", 2,
        ["ROE = 0 quand le résultat avant impôt est nul : l'impôt ne change pas ce seuil (donnée-piège).",
          `Intérêts = ${P(rd)} × ${F(debt)} = ${D(debt * rd)} ; CA seuil = ${F(opex)} + ${F(debt * rd)} = ${D(be)}.`,
          `Baisse = 1 − ${F(be)} / ${F(rev)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const rev = 1000, sw = 0.2, opex = 800, assets = 1000, wd = 0.5, rd = 0.1;
      const up = levered(rev * (1 + sw), opex, assets, assets * wd, rd), dn = levered(rev * (1 - sw), opex, assets, assets * wd, rd);
      const a = (up.roe - dn.roe) * 100;
      return q("ci-roe-d2", "difficile", "Gap between best-case and worst-case ROE (percentage points)? (No taxes.)",
        [["Expected revenues", usd(rev)], ["Revenue scenarios", `±${pc(sw)}`], ["Operating expenses (fixed)", usd(opex)], ["Assets", usd(assets)],
          ["Financing", `${pc(wd)} debt at ${pc(rd)}`]],
        a, "%", 2,
        [`Haut : CA ${F(rev * (1 + sw))}, résultat ${F(up.ebit)} − intérêts ${F(up.interest)} = ${F(up.ni)} ; ROE = ${P(up.roe)}.`,
          `Bas : CA ${F(rev * (1 - sw))}, résultat ${F(dn.ebit)} − ${F(dn.interest)} = ${F(dn.ni)} ; ROE = ${P(dn.roe)}.`,
          `Écart = ${P(up.roe)} − (${P(dn.roe)}) = ${Pa(a)} : sans dette, l'écart ne serait que de ${P((up.ebit - dn.ebit) / assets)}.`]);
    })(),
    (() => {
      const rev = 1400, opex = 1190, assets = 3000, t = 0.25, wd = 0.5;
      const roa = (rev - opex) / assets;
      const a = roa * 100;
      return q("ci-roe-d3", "difficile", "Highest interest rate at which 50% debt financing does not reduce ROE?",
        [["Revenues", usd(rev)], ["Operating expenses", usd(opex)], ["Assets", usd(assets)], ["Tax rate", pc(t)], ["Proposed debt", `${pc(wd)} of assets`]],
        a, "%", 2,
        [`Le levier est neutre quand le coût de la dette égale le rendement opérationnel des actifs : ${F(rev - opex)} / ${F(assets)} = ${P(roa)}.`,
          "L'impôt réduit les deux ROE dans la même proportion : il ne déplace pas ce seuil (donnée-piège).",
          `Taux maximal = ${Pa(a)}.`]);
    })(),
    (() => {
      const rev = 1000, opex = 850, assets = 1000, rd = 0.06, target = 0.2;
      const ebit = rev - opex;
      const debt = (target * assets - ebit) / (target - rd);
      const a = (debt / assets) * 100;
      return q("ci-roe-d4", "difficile", "Debt-to-assets ratio needed to reach the target ROE? (No taxes.)",
        [["Revenues", usd(rev)], ["Operating expenses", usd(opex)], ["Assets", usd(assets)], ["Interest rate on debt", pc(rd)], ["Target ROE", pc(target)]],
        a, "%", 2,
        [`ROE = (${F(ebit)} − ${F(rd)} × D) / (${F(assets)} − D) = ${F(target)}.`,
          `${F(ebit)} − ${F(rd)}D = ${F(target * assets)} − ${F(target)}D, soit D = ${F(target * assets - ebit)} / ${F(target - rd)} = ${D(debt, 2)}.`,
          `Dette / actifs = ${F(debt, 2)} / ${F(assets)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const ebit = 360, assets = 6000, debt = 4000, rd = 0.08, t = 0.25;
      const roeU = (ebit * (1 - t)) / assets;
      const ni = (ebit - debt * rd) * (1 - t), roeL = ni / (assets - debt);
      const a = (roeL - roeU) * 100;
      return q("ci-roe-d5", "difficile", "Change in ROE (percentage points) caused by the debt? (Negative if a fall.)",
        [["Operating profit (EBIT)", usd(ebit)], ["Assets", usd(assets)], ["Debt", usd(debt)], ["Interest rate on debt", pc(rd)], ["Tax rate", pc(t)]],
        a, "%", 2,
        [`Sans dette : ROE = ${F(ebit)} × ${F(1 - t)} / ${F(assets)} = ${P(roeU, 2)}.`,
          `Avec dette : RN = (${F(ebit)} − ${F(debt * rd)}) × ${F(1 - t)} = ${F(ni)} ; ROE = ${F(ni)} / ${F(assets - debt)} = ${P(roeL, 2)}.`,
          `Variation = ${Pa(a)} : rendement des actifs (${P(ebit / assets)}) < coût de la dette (${P(rd)}).`]);
    })(),
  ],
};

/* ────────────────────────── 3 · Cycle de conversion de trésorerie ────────────────────────── */

const CCC: CalcType = {
  key: "cash-conversion-cycle",
  topic: "corporate",
  name: "Cycle de conversion de trésorerie (cash conversion cycle)",
  tier: "essentiel",
  top: true,
  source: "LM 4 · Working Capital and Liquidity",
  formulas: [
    "CCC = DOH + DSO − DPO",
    "DOH = stocks / (COGS / 365) = 365 / rotation des stocks",
    "DSO = créances clients / (CA / 365) = 365 / rotation des créances",
    "DPO = dettes fournisseurs / (achats / 365) ; achats = COGS + stock final − stock initial",
    "Cycle d'exploitation (operating cycle) = DOH + DSO",
  ],
  traps: [
    "DPO se retranche : payer les fournisseurs plus tard raccourcit le CCC (et réduire le DPO l'allonge).",
    "DOH se calcule sur le COGS, DSO sur le CA, DPO sur les achats.",
    "Respecter le nombre de jours donné (365 ou 360).",
  ],
  questions: [
    (() => {
      const doh = 45, dso = 38, dpo = 30;
      const a = ccc(doh, dso, dpo);
      return q("ci-ccc-f1", "facile", "Cash conversion cycle (in days)?",
        [["Days of inventory on hand (DOH)", days(doh)], ["Days sales outstanding (DSO)", days(dso)], ["Days payable outstanding (DPO)", days(dpo)]],
        a, "", 0,
        ["CCC = DOH + DSO − DPO.", `CCC = ${F(doh)} + ${F(dso)} − ${F(dpo)} = ${F(a)} jours.`]);
    })(),
    (() => {
      const turn = 8, yr = 365;
      const a = yr / turn;
      return q("ci-ccc-f2", "facile", "Days of inventory on hand (DOH)?",
        [["Inventory turnover", mx(turn)], ["Days in year", E(yr)]],
        a, "", 1,
        ["DOH = 365 / rotation des stocks.", `DOH = ${F(yr)} / ${F(turn)} = ${F(a, 1)} jours.`]);
    })(),
    (() => {
      const ar = 1200000, rev = 14600000;
      const a = daysOf(ar, rev);
      return q("ci-ccc-f3", "facile", "Days sales outstanding (DSO)?",
        [["Accounts receivable", usd(ar)], ["Annual revenue", usd(rev)], ["Days in year", "365"]],
        a, "", 1,
        [`Ventes par jour = ${F(rev)} / 365 = ${D(rev / 365)}.`, `DSO = ${F(ar)} / ${F(rev / 365)} = ${F(a, 1)} jours.`]);
    })(),
    (() => {
      const ap = 500000, purch = 7300000;
      const a = daysOf(ap, purch);
      return q("ci-ccc-f4", "facile", "Days payable outstanding (DPO)?",
        [["Accounts payable", usd(ap)], ["Annual purchases", usd(purch)], ["Days in year", "365"]],
        a, "", 1,
        [`Achats par jour = ${F(purch)} / 365 = ${D(purch / 365)}.`, `DPO = ${F(ap)} / ${F(purch / 365)} = ${F(a, 1)} jours.`]);
    })(),
    (() => {
      const doh = 60, dso = 35, dpo0 = 50, dpo1 = 40;
      const a = ccc(doh, dso, dpo1) - ccc(doh, dso, dpo0);
      return q("ci-ccc-f5", "facile", "Change in the cash conversion cycle (days)? (Negative if shorter.)",
        [["DOH", days(doh)], ["DSO", days(dso)], ["DPO", `${days(dpo0)} → ${days(dpo1)}`]],
        a, "", 0,
        [`Avant : ${F(doh)} + ${F(dso)} − ${F(dpo0)} = ${F(ccc(doh, dso, dpo0))} jours ; après : ${F(doh)} + ${F(dso)} − ${F(dpo1)} = ${F(ccc(doh, dso, dpo1))} jours.`,
          `Le CCC s'allonge de ${F(a)} jours : payer les fournisseurs plus tôt allonge le cycle.`]);
    })(),
    (() => {
      const it = 6, rt = 9.125, pt = 7.3;
      const doh = 365 / it, dso = 365 / rt, dpo = 365 / pt;
      const a = ccc(doh, dso, dpo);
      return q("ci-ccc-m1", "moyen", "Cash conversion cycle (in days)?",
        [["Inventory turnover", mx(it)], ["Receivables turnover", mx(rt)], ["Payables turnover", mx(pt)], ["Days in year", "365"]],
        a, "", 1,
        [`DOH = 365 / ${F(it)} = ${F(doh, 2)} ; DSO = 365 / ${F(rt)} = ${F(dso, 2)} ; DPO = 365 / ${F(pt)} = ${F(dpo, 2)}.`,
          `CCC = ${F(doh, 2)} + ${F(dso, 2)} − ${F(dpo, 2)} = ${F(a, 1)} jours.`]);
    })(),
    (() => {
      const inv = 900, cogs = 7300, ar = 1000, rev = 10950, ap = 600, purch = 7300;
      const doh = daysOf(inv, cogs), dso = daysOf(ar, rev), dpo = daysOf(ap, purch);
      const a = ccc(doh, dso, dpo);
      return q("ci-ccc-m2", "moyen", "Cash conversion cycle (in days)?",
        [["Inventory / cost of goods sold ($ thousands)", lst([E(inv), E(cogs)])], ["Receivables / revenue ($ thousands)", lst([E(ar), E(rev)])],
          ["Payables / purchases ($ thousands)", lst([E(ap), E(purch)])], ["Days in year", "365"]],
        a, "", 1,
        [`DOH = ${F(inv)} / (${F(cogs)} / 365) = ${F(doh, 2)} jours.`,
          `DSO = ${F(ar)} / (${F(rev)} / 365) = ${F(dso, 2)} jours ; DPO = ${F(ap)} / (${F(purch)} / 365) = ${F(dpo, 2)} jours.`,
          `CCC = ${F(doh, 2)} + ${F(dso, 2)} − ${F(dpo, 2)} = ${F(a, 1)} jours.`]);
    })(),
    (() => {
      const A = [40, 30, 25], B = [55, 20, 45];
      const cA = ccc(A[0], A[1], A[2]), cB = ccc(B[0], B[1], B[2]);
      const a = cA - cB;
      return q("ci-ccc-m3", "moyen", "How many days longer is Company A's cash conversion cycle than Company B's?",
        [["Company A: DOH / DSO / DPO", lst(A.map(days))], ["Company B: DOH / DSO / DPO", lst(B.map(days))]],
        a, "", 0,
        [`A : ${F(A[0])} + ${F(A[1])} − ${F(A[2])} = ${F(cA)} jours.`, `B : ${F(B[0])} + ${F(B[1])} − ${F(B[2])} = ${F(cB)} jours.`,
          `Écart = ${F(a)} jours, bien que B garde ses stocks plus longtemps : il paie ses fournisseurs bien plus tard.`]);
    })(),
    (() => {
      const op = 95, c = 62;
      const a = op - c;
      return q("ci-ccc-m4", "moyen", "Days payable outstanding (DPO)?",
        [["Operating cycle (DOH + DSO)", days(op)], ["Cash conversion cycle", days(c)]],
        a, "", 0,
        ["CCC = (DOH + DSO) − DPO = cycle d'exploitation − DPO.", `DPO = ${F(op)} − ${F(c)} = ${F(a)} jours.`]);
    })(),
    (() => {
      const doh = 50, dso0 = 40, dpo0 = 60, dDso = -5, dDpo = 10;
      const a = ccc(doh, dso0 + dDso, dpo0 + dDpo);
      return q("ci-ccc-m5", "moyen", "New cash conversion cycle (days)?",
        [["Current DOH / DSO / DPO", lst([days(doh), days(dso0), days(dpo0)])], ["Faster collections", `DSO ${E(dDso)} days`], ["Longer supplier terms", `DPO +${E(dDpo)} days`]],
        a, "", 0,
        [`Actuel : ${F(doh)} + ${F(dso0)} − ${F(dpo0)} = ${F(ccc(doh, dso0, dpo0))} jours.`,
          `Nouveau : ${F(doh)} + ${F(dso0 + dDso)} − ${F(dpo0 + dDpo)} = ${F(a)} jours.`]);
    })(),
    (() => {
      const cogs = 36500, inv0 = 4000, inv1 = 5000, ar = 6000, rev = 54750, ap = 3000;
      const purch = cogs + inv1 - inv0, invAvg = (inv0 + inv1) / 2;
      const doh = daysOf(invAvg, cogs), dso = daysOf(ar, rev), dpo = daysOf(ap, purch);
      const a = ccc(doh, dso, dpo);
      return q("ci-ccc-d1", "difficile", "Cash conversion cycle (in days)? (Use average balances.)",
        [["Cost of goods sold", usd(cogs)], ["Inventory: beginning / ending", lst([usd(inv0), usd(inv1)])], ["Revenue", usd(rev)],
          ["Average receivables", usd(ar)], ["Average payables", usd(ap)], ["Days in year", "365"]],
        a, "", 1,
        [`Achats = COGS + stock final − stock initial = ${F(cogs)} + ${F(inv1)} − ${F(inv0)} = ${D(purch)} (et non le COGS).`,
          `DOH = ${F(invAvg)} / (${F(cogs)} / 365) = ${F(doh, 2)} ; DSO = ${F(ar)} / (${F(rev)} / 365) = ${F(dso, 2)}.`,
          `DPO = ${F(ap)} / (${F(purch)} / 365) = ${F(dpo, 2)}.`,
          `CCC = ${F(doh, 2)} + ${F(dso, 2)} − ${F(dpo, 2)} = ${F(a, 1)} jours.`]);
    })(),
    (() => {
      const yr = 360, it = 9, rt = 12, pt = 8, fat = 2.5;
      const doh = yr / it, dso = yr / rt, dpo = yr / pt;
      const a = ccc(doh, dso, dpo);
      return q("ci-ccc-d2", "difficile", "Cash conversion cycle (in days)?",
        [["Inventory turnover", mx(it)], ["Receivables turnover", mx(rt)], ["Payables turnover", mx(pt)], ["Fixed asset turnover", mx(fat)],
          ["Day-count convention", "360-day year"]],
        a, "", 0,
        ["La rotation des immobilisations n'entre pas dans le CCC (donnée-piège) ; on prend 360 jours comme demandé.",
          `DOH = ${F(yr)} / ${F(it)} = ${F(doh)} ; DSO = ${F(yr)} / ${F(rt)} = ${F(dso)} ; DPO = ${F(yr)} / ${F(pt)} = ${F(dpo)}.`,
          `CCC = ${F(doh)} + ${F(dso)} − ${F(dpo)} = ${F(a)} jours.`]);
    })(),
    (() => {
      const doh = 70, dso = 42, dpo0 = 40, target = 60, purch = 18250000;
      const dpo1 = doh + dso - target, daily = purch / 365;
      const a = (dpo1 - dpo0) * daily;
      return q("ci-ccc-d3", "difficile", "Increase in accounts payable needed to reach the target cash conversion cycle?",
        [["DOH / DSO (unchanged)", lst([days(doh), days(dso)])], ["Current DPO", days(dpo0)], ["Target cash conversion cycle", days(target)],
          ["Annual purchases", usd(purch)], ["Days in year", "365"]],
        a, "$", 0,
        [`DPO cible = ${F(doh)} + ${F(dso)} − ${F(target)} = ${F(dpo1)} jours, soit ${F(dpo1 - dpo0)} jours de plus.`,
          `Achats par jour = ${F(purch)} / 365 = ${D(daily)}.`,
          `Hausse des fournisseurs = ${F(dpo1 - dpo0)} × ${F(daily)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const inv = 400, cogs = 14600, ar = 300, rev = 21900, ap = 1800, purch = 14800;
      const doh = daysOf(inv, cogs), dso = daysOf(ar, rev), dpo = daysOf(ap, purch);
      const a = ccc(doh, dso, dpo);
      return q("ci-ccc-d4", "difficile", "Cash conversion cycle (in days)? (Negative if suppliers finance operations.)",
        [["Inventory / cost of goods sold ($ millions)", lst([E(inv), E(cogs)])], ["Receivables / revenue ($ millions)", lst([E(ar), E(rev)])],
          ["Payables / purchases ($ millions)", lst([E(ap), E(purch)])], ["Days in year", "365"]],
        a, "", 1,
        [`DOH = ${F(inv)} / (${F(cogs)} / 365) = ${F(doh, 2)} ; DSO = ${F(ar)} / (${F(rev)} / 365) = ${F(dso, 2)}.`,
          `DPO = ${F(ap)} / (${F(purch)} / 365) = ${F(dpo, 2)}.`,
          `CCC = ${F(doh, 2)} + ${F(dso, 2)} − ${F(dpo, 2)} = ${F(a, 1)} jours : les clients paient avant que l'entreprise ne paie ses fournisseurs.`]);
    })(),
    (() => {
      const c = 48, inv = 2000, cogs = 18250, ap = 1500, purch = 18250, rev = 27375;
      const doh = daysOf(inv, cogs), dpo = daysOf(ap, purch), dso = c - doh + dpo;
      const a = dso * (rev / 365);
      return q("ci-ccc-d5", "difficile", "Accounts receivable consistent with the cash conversion cycle ($ thousands)?",
        [["Cash conversion cycle", days(c)], ["Inventory / cost of goods sold ($ thousands)", lst([E(inv), E(cogs)])],
          ["Payables / purchases ($ thousands)", lst([E(ap), E(purch)])], ["Revenue ($ thousands)", E(rev)], ["Days in year", "365"]],
        a, "$", 0,
        [`DOH = ${F(inv)} / (${F(cogs)} / 365) = ${F(doh)} jours ; DPO = ${F(ap)} / (${F(purch)} / 365) = ${F(dpo)} jours.`,
          `DSO = CCC − DOH + DPO = ${F(c)} − ${F(doh)} + ${F(dpo)} = ${F(dso)} jours.`,
          `Créances = ${F(dso)} × ${F(rev)} / 365 = ${F(dso)} × ${F(rev / 365)} = ${F(a)} milliers de $.`]);
    })(),
  ],
};

/* ────────────────────────── 4 · Coût du crédit fournisseur ────────────────────────── */

const TRADE_CREDIT: CalcType = {
  key: "trade-credit-cost",
  topic: "corporate",
  name: "Coût du crédit fournisseur (escompte non pris)",
  tier: "essentiel",
  source: "LM 4 · Working Capital and Liquidity",
  formulas: [
    "Conditions « a/b net c » : escompte de a % si paiement sous b jours, sinon paiement intégral à c jours",
    "Coût annuel effectif (EAR) = (1 + a / (1 − a))^(365 / (c − b)) − 1",
    "Renoncer à l'escompte = emprunter (1 − a) × facture pendant (c − b) jours, pour un coût de a × facture",
  ],
  traps: [
    "La durée de financement est c − b, pas c.",
    "Diviser par (1 − a) : on n'emprunte que le montant net de l'escompte.",
    "Si l'EAR dépasse le taux bancaire, mieux vaut emprunter à la banque et prendre l'escompte.",
  ],
  questions: [
    (() => {
      const d = 0.02, b = 10, c = 30;
      const a = tradeEAR(d, b, c) * 100;
      return q("ci-tc-f1", "facile", "Effective annual cost of forgoing the discount?",
        [["Credit terms", "2/10 net 30"], ["Days in year", "365"]],
        a, "%", 2,
        [`Financement pendant ${F(c)} − ${F(b)} = ${F(c - b)} jours, au coût de ${F(d)} / ${F(1 - d)} = ${F(d / (1 - d), 6)} par période.`,
          `EAR = (1 + ${F(d / (1 - d), 6)})^(365 / ${F(c - b)}) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const d = 0.01, b = 10, c = 30;
      const a = tradeEAR(d, b, c) * 100;
      return q("ci-tc-f2", "facile", "Effective annual rate of supplier financing if the discount is not taken?",
        [["Credit terms", "1/10 net 30"], ["Days in year", "365"]],
        a, "%", 2,
        [`Période = ${F(c - b)} jours ; coût par période = ${F(d)} / ${F(1 - d)} = ${F(d / (1 - d), 6)}.`,
          `EAR = (1 + ${F(d / (1 - d), 6)})^(365 / ${F(c - b)}) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const inv = 240000, d = 0.02;
      const a = inv * d;
      return q("ci-tc-f3", "facile", "Dollar cost of paying on the net date instead of within the discount period?",
        [["Invoice amount", usd(inv)], ["Credit terms", "2/10 net 45"]],
        a, "$", 0,
        [`Escompte perdu = ${P(d)} × ${D(inv)} = ${D(a, 0)}.`,
          `C'est le prix payé pour garder ${D(inv * (1 - d))} pendant ${F(45 - 10)} jours de plus.`]);
    })(),
    (() => {
      const d = 0.03, b = 15, c = 45;
      const a = tradeEAR(d, b, c) * 100;
      return q("ci-tc-f4", "facile", "Effective annual cost of the trade credit if the discount is forgone?",
        [["Credit terms", "3/15 net 45"], ["Days in year", "365"]],
        a, "%", 2,
        [`Période = ${F(c)} − ${F(b)} = ${F(c - b)} jours ; coût par période = ${F(d)} / ${F(1 - d)} = ${F(d / (1 - d), 6)}.`,
          `EAR = (1 + ${F(d / (1 - d), 6)})^(365 / ${F(c - b)}) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const d = 0.01, b = 15, c = 45;
      const a = tradeEAR(d, b, c) * 100;
      return q("ci-tc-f5", "facile", "Effective annual cost of forgoing the discount?",
        [["Credit terms", "1/15 net 45"], ["Days in year", "365"]],
        a, "%", 2,
        [`Période = ${F(c - b)} jours ; coût par période = ${F(d)} / ${F(1 - d)} = ${F(d / (1 - d), 6)}.`,
          `EAR = (1 + ${F(d / (1 - d), 6)})^(365 / ${F(c - b)}) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const d = 0.02, b = 10, c = 30, bank = 0.08;
      const ear = tradeEAR(d, b, c);
      const a = (ear - bank) * 100;
      return q("ci-tc-m1", "moyen", "By how many percentage points does the cost of supplier financing exceed the bank rate?",
        [["Credit terms", "2/10 net 30"], ["Bank borrowing rate (effective annual)", pc(bank)], ["Days in year", "365"]],
        a, "%", 2,
        [`EAR fournisseur = (1 + ${F(d)} / ${F(1 - d)})^(365 / ${F(c - b)}) − 1 = ${P(ear, 2)}.`,
          `Écart = ${P(ear, 2)} − ${P(bank)} = ${Pa(a)} : emprunter à la banque pour payer au 10e jour.`]);
    })(),
    (() => {
      const d = 0.02, b = 10, paid = 60;
      const a = tradeEAR(d, b, paid) * 100;
      return q("ci-tc-m2", "moyen", "Effective annual cost of the trade credit if the firm forgoes the discount and pays on day 60?",
        [["Credit terms", "2/10 net 30"], ["Actual payment day", `day ${paid}`], ["Days in year", "365"]],
        a, "%", 2,
        [`En payant au jour ${F(paid)}, le financement dure ${F(paid)} − ${F(b)} = ${F(paid - b)} jours.`,
          `EAR = (1 + ${F(d)} / ${F(1 - d)})^(365 / ${F(paid - b)}) − 1 = ${Pa(a)} (contre ${P(tradeEAR(d, b, 30), 2)} en payant au jour 30).`]);
    })(),
    (() => {
      const inv = 500000, d = 0.02, b = 10, c = 40, rate = 0.09;
      const disc = inv * d, borrow = inv - disc, n = c - b, interest = borrow * rate * (n / 365);
      const a = disc - interest;
      return q("ci-tc-m3", "moyen", "Net saving from borrowing at the bank to take the discount?",
        [["Invoice amount", usd(inv)], ["Credit terms", "2/10 net 40"], ["Bank loan rate (simple interest, 365-day year)", pc(rate)]],
        a, "$", 0,
        [`Escompte gagné = ${P(d)} × ${D(inv)} = ${D(disc)} ; on emprunte ${D(borrow)} pendant ${F(n)} jours (du jour 10 au jour 40).`,
          `Intérêts bancaires = ${F(borrow)} × ${P(rate)} × ${F(n)} / 365 = ${D(interest, 2)}.`,
          `Gain net = ${F(disc)} − ${F(interest, 2)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const d = 0.03, b = 10, c = 60;
      const a = tradeEAR(d, b, c) * 100;
      return q("ci-tc-m4", "moyen", "Effective annual cost of forgoing the discount?",
        [["Credit terms", "3/10 net 60"], ["Days in year", "365"]],
        a, "%", 2,
        [`Période = ${F(c - b)} jours, soit ${F(365 / (c - b), 2)} périodes par an.`,
          `Coût par période = ${F(d)} / ${F(1 - d)} = ${F(d / (1 - d), 6)}.`,
          `EAR = ${F(1 + d / (1 - d), 6)}^${F(365 / (c - b), 2)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const e1 = tradeEAR(0.01, 10, 30), e2 = tradeEAR(0.02, 10, 60);
      const a = Math.max(e1, e2) * 100;
      return q("ci-tc-m5", "moyen", "Effective annual cost of the more expensive of the two supplier offers (discount forgone)?",
        [["Supplier X terms", "1/10 net 30"], ["Supplier Y terms", "2/10 net 60"], ["Days in year", "365"]],
        a, "%", 2,
        [`X : (1 + ${F(0.01)} / ${F(0.99)})^(365 / 20) − 1 = ${P(e1, 2)}.`,
          `Y : (1 + ${F(0.02)} / ${F(0.98)})^(365 / 50) − 1 = ${P(e2, 2)}.`,
          `Le plus cher est ${e1 >= e2 ? "X" : "Y"} : ${Pa(a)} ; un escompte plus gros ne veut pas dire un crédit plus cher.`]);
    })(),
    (() => {
      const d = 0.015, b = 10, c = 45, inv = 80000, bank = 0.12;
      const a = tradeEAR(d, b, c) * 100;
      return q("ci-tc-d1", "difficile", "Highest effective annual bank rate at which borrowing to take the discount still pays?",
        [["Invoice amount", usd(inv)], ["Credit terms", "1.5/10 net 45"], ["Rate currently quoted by the bank", pc(bank)], ["Days in year", "365"]],
        a, "%", 2,
        ["Emprunter pour prendre l'escompte vaut la peine tant que le taux bancaire est inférieur au coût du crédit fournisseur ; le montant de la facture et le taux proposé ne changent pas ce seuil.",
          `Seuil = EAR = (1 + ${F(d)} / ${F(1 - d)})^(365 / ${F(c - b)}) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const inv = 125000, discAmt = 2000, b = 15, c = 50;
      const d = discAmt / inv;
      const a = tradeEAR(d, b, c) * 100;
      return q("ci-tc-d2", "difficile", "Effective annual cost of forgoing the discount?",
        [["Invoice amount", usd(inv)], ["Discount if paid within 15 days", usd(discAmt)], ["Otherwise full payment due", "day 50"], ["Days in year", "365"]],
        a, "%", 2,
        [`Taux d'escompte = ${F(discAmt)} / ${F(inv)} = ${P(d, 1)} ; on garde ${D(inv - discAmt)} pendant ${F(c - b)} jours pour ${D(discAmt)}.`,
          `Coût par période = ${F(discAmt)} / ${F(inv - discAmt)} = ${F(discAmt / (inv - discAmt), 6)}.`,
          `EAR = (1 + ${F(discAmt / (inv - discAmt), 6)})^(365 / ${F(c - b)}) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const target = 0.25, b = 10, c = 30;
      const disc = 1 - Math.pow(1 + target, -(c - b) / 365);
      const a = disc * 100;
      return q("ci-tc-d3", "difficile", "Cash discount (%) that makes the effective annual cost of forgoing it exactly 25%?",
        [["Discount period / net period", lst([days(b), days(c)])], ["Target effective annual cost", pc(target)], ["Days in year", "365"]],
        a, "%", 2,
        ["1 + a / (1 − a) = 1 / (1 − a) : on cherche (1 − a)^(−365 / 20) = 1,25.",
          `1 − a = ${F(1 + target)}^(−${F(c - b)} / 365) = ${F(1 - disc, 6)}.`,
          `a = ${Pa(a)} (vérification : (1 + ${F(disc / (1 - disc), 6)})^(365 / 20) − 1 = ${P(tradeEAR(disc, b, c), 2)}).`]);
    })(),
    (() => {
      const d = 0.02, b = 10, c = 30, late = 50;
      const e30 = tradeEAR(d, b, c), e50 = tradeEAR(d, b, late);
      const a = (e30 - e50) * 100;
      return q("ci-tc-d4", "difficile", "Reduction in the effective annual cost (percentage points) if the firm stretches payment to day 50?",
        [["Credit terms", "2/10 net 30"], ["Payment day", `day ${c} → day ${late}`], ["Days in year", "365"]],
        a, "%", 2,
        [`Jour 30 : (1 + ${F(d)} / ${F(1 - d)})^(365 / ${F(c - b)}) − 1 = ${P(e30, 2)}.`,
          `Jour 50 : (1 + ${F(d)} / ${F(1 - d)})^(365 / ${F(late - b)}) − 1 = ${P(e50, 2)}.`,
          `Baisse = ${Pa(a)} (mais payer en retard abîme la relation fournisseur).`]);
    })(),
    (() => {
      const inv = 1000000, d = 0.01, b = 15, c = 45, bank = 0.07;
      const disc = inv * d, borrow = inv - disc, n = c - b;
      const interest = borrow * (Math.pow(1 + bank, n / 365) - 1);
      const a = disc - interest;
      return q("ci-tc-d5", "difficile", "Net saving from borrowing at the bank to take the discount?",
        [["Invoice amount", usd(inv)], ["Credit terms", "1/15 net 45"], ["Bank rate (effective annual, compounded)", pc(bank)], ["Days in year", "365"]],
        a, "$", 0,
        [`Escompte = ${D(disc)} ; emprunt de ${D(borrow)} du jour 15 au jour 45, soit ${F(n)} jours.`,
          `Intérêts = ${F(borrow)} × (${F(1 + bank)}^(${F(n)} / 365) − 1) = ${D(interest, 2)}.`,
          `Gain net = ${F(disc)} − ${F(interest, 2)} = ${D(a, 0)} (EAR fournisseur ${P(tradeEAR(d, b, c), 2)} > ${P(bank)}).`]);
    })(),
  ],
};

/* ────────────────────────── 5 · Ratios de liquidité ────────────────────────── */

const LIQUIDITY: CalcType = {
  key: "liquidity-ratios",
  topic: "corporate",
  name: "Ratios de liquidité (current, quick, cash)",
  tier: "essentiel",
  source: "LM 4 · Working Capital and Liquidity",
  formulas: [
    "Current ratio = actifs courants / passifs courants",
    "Quick ratio = (trésorerie + titres de placement + créances) / passifs courants",
    "Cash ratio = (trésorerie + titres de placement) / passifs courants",
  ],
  traps: [
    "Le quick ratio exclut les stocks (et les charges payées d'avance) ; le cash ratio exclut en plus les créances.",
    "Payer un passif courant avec de la trésorerie fait MONTER un ratio supérieur à 1.",
  ],
  questions: [
    (() => {
      const ca = 4800, cl = 3000;
      const a = ca / cl;
      return q("ci-liq-f1", "facile", "Current ratio?",
        [["Current assets", usd(ca)], ["Current liabilities", usd(cl)]],
        a, "x", 2,
        ["Current ratio = actifs courants / passifs courants.", `= ${F(ca)} / ${F(cl)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const cash = 200, ms = 150, ar = 650, inv = 1200, cl = 1000;
      const a = (cash + ms + ar) / cl;
      return q("ci-liq-f2", "facile", "Quick ratio?",
        [["Cash", usd(cash)], ["Marketable securities", usd(ms)], ["Receivables", usd(ar)], ["Inventory", usd(inv)], ["Current liabilities", usd(cl)]],
        a, "x", 2,
        ["Quick ratio = (trésorerie + titres + créances) / passifs courants ; les stocks sont exclus.",
          `= (${F(cash)} + ${F(ms)} + ${F(ar)}) / ${F(cl)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const cash = 300, ms = 200, ar = 900, cl = 1250;
      const a = (cash + ms) / cl;
      return q("ci-liq-f3", "facile", "Cash ratio?",
        [["Cash", usd(cash)], ["Marketable securities", usd(ms)], ["Receivables", usd(ar)], ["Current liabilities", usd(cl)]],
        a, "x", 2,
        ["Cash ratio = (trésorerie + titres) / passifs courants ; les créances sont exclues.",
          `= (${F(cash)} + ${F(ms)}) / ${F(cl)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const cash = 120, ar = 380, inv = 500, cl = 800;
      const a = (cash + ar + inv) / cl;
      return q("ci-liq-f4", "facile", "Current ratio?",
        [["Cash", usd(cash)], ["Receivables", usd(ar)], ["Inventory", usd(inv)], ["Current liabilities", usd(cl)]],
        a, "x", 2,
        [`Actifs courants = ${F(cash)} + ${F(ar)} + ${F(inv)} = ${D(cash + ar + inv)}.`, `Current ratio = ${F(cash + ar + inv)} / ${F(cl)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const cash = 90, ms = 60, ar = 300, inv = 600, cl = 500;
      const a = (cash + ms + ar) / cl;
      return q("ci-liq-f5", "facile", "Quick ratio?",
        [["Cash", usd(cash)], ["Marketable securities", usd(ms)], ["Receivables", usd(ar)], ["Inventory", usd(inv)], ["Current liabilities", usd(cl)]],
        a, "x", 2,
        [`Actifs liquides = ${F(cash)} + ${F(ms)} + ${F(ar)} = ${D(cash + ms + ar)}.`, `Quick ratio = ${F(cash + ms + ar)} / ${F(cl)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const ca = 6000, cl = 4000, pay = 1000;
      const a = (ca - pay) / (cl - pay);
      return q("ci-liq-m1", "moyen", "Current ratio after the company pays suppliers with cash?",
        [["Current assets", usd(ca)], ["Current liabilities", usd(cl)], ["Accounts payable paid in cash", usd(pay)]],
        a, "x", 2,
        [`Avant : ${F(ca)} / ${F(cl)} = ${F(ca / cl, 2)}x.`,
          `Après : (${F(ca)} − ${F(pay)}) / (${F(cl)} − ${F(pay)}) = ${F(ca - pay)} / ${F(cl - pay)} = ${F(a, 2)}x : le ratio monte car il était supérieur à 1.`]);
    })(),
    (() => {
      const cash = 600, ms = 400, ar = 2000, inv = 1800, pre = 200, cl = 2500;
      const a = (cash + ms + ar) / cl;
      return q("ci-liq-m2", "moyen", "Quick ratio?",
        [["Total current assets", usd(cash + ms + ar + inv + pre)], ["of which inventory", usd(inv)], ["of which prepaid expenses", usd(pre)],
          ["of which cash / marketable securities / receivables", lst([usd(cash), usd(ms), usd(ar)])], ["Current liabilities", usd(cl)]],
        a, "x", 2,
        [`Actifs liquides = ${F(cash + ms + ar + inv + pre)} − ${F(inv)} − ${F(pre)} = ${D(cash + ms + ar)} (stocks et charges payées d'avance exclus).`,
          `Quick ratio = ${F(cash + ms + ar)} / ${F(cl)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const cr = 2, qr = 1.2, inv = 400;
      const a = inv / (cr - qr);
      return q("ci-liq-m3", "moyen", "Current liabilities? (Inventory is the only non-quick current asset.)",
        [["Current ratio", mx(cr)], ["Quick ratio", mx(qr)], ["Inventory", usd(inv)]],
        a, "$", 0,
        [`Current − quick = stocks / passifs courants : ${F(cr)} − ${F(qr)} = ${F(cr - qr)}.`, `Passifs courants = ${F(inv)} / ${F(cr - qr)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const c1 = 300, m1 = 200, l1 = 1000, c2 = 250, m2 = 150, l2 = 1250;
      const r1 = (c1 + m1) / l1, r2 = (c2 + m2) / l2;
      const a = r2 - r1;
      return q("ci-liq-m4", "moyen", "Change in the cash ratio from year 1 to year 2? (Negative if a fall.)",
        [["Year 1: cash / marketable securities / current liabilities", lst([usd(c1), usd(m1), usd(l1)])],
          ["Year 2: cash / marketable securities / current liabilities", lst([usd(c2), usd(m2), usd(l2)])]],
        a, "x", 2,
        [`Année 1 : (${F(c1)} + ${F(m1)}) / ${F(l1)} = ${F(r1, 2)}x.`, `Année 2 : (${F(c2)} + ${F(m2)}) / ${F(l2)} = ${F(r2, 2)}x.`,
          `Variation = ${F(a, 2)}x : la liquidité se dégrade.`]);
    })(),
    (() => {
      const ca = 3000, cl = 2000, buy = 500;
      const a = (ca + buy) / (cl + buy);
      return q("ci-liq-m5", "moyen", "Current ratio after buying inventory with a short-term bank loan?",
        [["Current assets", usd(ca)], ["Current liabilities", usd(cl)], ["Inventory bought with short-term debt", usd(buy)]],
        a, "x", 2,
        [`Les deux côtés augmentent de ${D(buy)} : (${F(ca)} + ${F(buy)}) / (${F(cl)} + ${F(buy)}).`,
          `= ${F(ca + buy)} / ${F(cl + buy)} = ${F(a, 2)}x (contre ${F(ca / cl, 2)}x avant).`]);
    })(),
    (() => {
      const cash = 500, ar = 1500, inv = 2000, cl = 2500, bv = 800, disc = 0.15;
      const proceeds = bv * (1 - disc), cl1 = cl - proceeds;
      const a = (cash + ar) / cl1;
      return q("ci-liq-d1", "difficile", "Quick ratio after the fire sale, if all proceeds repay current liabilities?",
        [["Cash / receivables / inventory", lst([usd(cash), usd(ar), usd(inv)])], ["Current liabilities", usd(cl)],
          ["Inventory sold (book value)", usd(bv)], ["Discount on the sale", pc(disc)]],
        a, "x", 2,
        [`Produit de la vente = ${F(bv)} × (1 − ${P(disc)}) = ${D(proceeds)}, utilisé pour rembourser des passifs courants.`,
          `Actifs liquides inchangés : ${F(cash)} + ${F(ar)} = ${D(cash + ar)} ; passifs courants = ${F(cl)} − ${F(proceeds)} = ${D(cl1)}.`,
          `Quick ratio = ${F(cash + ar)} / ${F(cl1)} = ${F(a, 2)}x (contre ${F((cash + ar) / cl, 2)}x avant).`]);
    })(),
    (() => {
      const cash = 300, ms = 100, ar = 500, inv = 700, cl = 1000, target = 1.2;
      const qa = cash + ms + ar;
      const a = target * cl - qa;
      return q("ci-liq-d2", "difficile", "Long-term debt to issue (proceeds held as cash) to reach the target quick ratio?",
        [["Cash / marketable securities / receivables", lst([usd(cash), usd(ms), usd(ar)])], ["Inventory", usd(inv)], ["Current liabilities", usd(cl)],
          ["Target quick ratio", mx(target)]],
        a, "$", 0,
        [`Actifs liquides actuels = ${D(qa)} ; quick ratio = ${F(qa / cl, 2)}x (les stocks ne comptent pas).`,
          `Une dette longue ne gonfle pas les passifs courants : il faut ${F(target)} × ${F(cl)} = ${D(target * cl)} d'actifs liquides.`,
          `Émission = ${F(target * cl)} − ${F(qa)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const cash = 1000, ms = 500, ar = 1500, inv = 2000, cl = 2500, repay = 600, buy = 400;
      const cash1 = cash - repay, cl1 = cl - repay + buy;
      const a = (cash1 + ms + ar) / cl1;
      return q("ci-liq-d3", "difficile", "Quick ratio after both transactions?",
        [["Cash / marketable securities / receivables / inventory", lst([usd(cash), usd(ms), usd(ar), usd(inv)])], ["Current liabilities", usd(cl)],
          ["Transaction 1", `repays ${usd(repay)} of short-term debt with cash`], ["Transaction 2", `buys ${usd(buy)} of inventory on credit`]],
        a, "x", 2,
        [`Trésorerie = ${F(cash)} − ${F(repay)} = ${D(cash1)} ; les stocks achetés à crédit ne comptent pas dans le quick ratio.`,
          `Passifs courants = ${F(cl)} − ${F(repay)} + ${F(buy)} = ${D(cl1)}.`,
          `Quick ratio = (${F(cash1)} + ${F(ms)} + ${F(ar)}) / ${F(cl1)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const qr = 1.1, ar = 660, cl = 1200;
      const a = (qr * cl - ar) / cl;
      return q("ci-liq-d4", "difficile", "Cash ratio?",
        [["Quick ratio", mx(qr)], ["Receivables", usd(ar)], ["Current liabilities", usd(cl)]],
        a, "x", 2,
        [`Actifs liquides = ${F(qr)} × ${F(cl)} = ${D(qr * cl)}.`, `Trésorerie + titres = ${F(qr * cl)} − ${F(ar)} = ${D(qr * cl - ar)}.`,
          `Cash ratio = ${F(qr * cl - ar)} / ${F(cl)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const ca = 4500, cl = 2600, min = 1.5;
      const a = (ca - min * cl) / (min - 1);
      return q("ci-liq-d5", "difficile", "Maximum new short-term borrowing (kept as cash) before the current ratio covenant is breached?",
        [["Current assets", usd(ca)], ["Current liabilities", usd(cl)], ["Covenant: minimum current ratio", mx(min)]],
        a, "$", 0,
        [`Emprunter X à court terme ajoute X aux deux côtés : (${F(ca)} + X) / (${F(cl)} + X) ≥ ${F(min)}.`,
          `${F(ca)} + X = ${F(min * cl)} + ${F(min)}X, soit X = (${F(ca)} − ${F(min * cl)}) / ${F(min - 1)} = ${D(a, 0)}.`]);
    })(),
  ],
};

/* ────────────────────────── 6 · Fonds de roulement net ────────────────────────── */

const NWC: CalcType = {
  key: "net-working-capital",
  topic: "corporate",
  name: "Fonds de roulement (total et net working capital)",
  tier: "annexe",
  source: "LM 4 · Working Capital and Liquidity",
  formulas: [
    "Fonds de roulement total = actifs courants − passifs courants",
    "Net working capital = actifs courants hors trésorerie et titres − passifs courants hors dettes financières courtes",
    "NWC / CA : compare des sociétés de tailles différentes",
    "Trésorerie libérée = (CA / 365) × jours de DSO gagnés ; (COGS / 365) × jours de DOH ; (achats / 365) × jours de DPO",
  ],
  traps: [
    "Le net working capital écarte la trésorerie, les titres, la dette court terme et la part courante de la dette longue.",
    "Allonger le DPO libère de la trésorerie, comme réduire le DSO ou le DOH.",
  ],
  questions: [
    (() => {
      const ca = 8500, cl = 5200;
      const a = ca - cl;
      return q("ci-nwc-f1", "facile", "Total working capital?",
        [["Current assets", usd(ca)], ["Current liabilities", usd(cl)]],
        a, "$", 0,
        ["Fonds de roulement total = actifs courants − passifs courants.", `= ${F(ca)} − ${F(cl)} = ${D(a)}.`]);
    })(),
    (() => {
      const ar = 640, inv = 910, pre = 50, ap = 720, acc = 130;
      const a = ar + inv + pre - ap - acc;
      return q("ci-nwc-f2", "facile", "Net working capital?",
        [["Receivables / inventory / prepaid expenses", lst([usd(ar), usd(inv), usd(pre)])], ["Accounts payable / accrued expenses", lst([usd(ap), usd(acc)])]],
        a, "$", 0,
        [`Actifs d'exploitation courants = ${F(ar)} + ${F(inv)} + ${F(pre)} = ${D(ar + inv + pre)}.`,
          `Passifs d'exploitation courants = ${F(ap)} + ${F(acc)} = ${D(ap + acc)}.`, `NWC = ${D(a)}.`]);
    })(),
    (() => {
      const nwc = 2100, rev = 15000;
      const a = (nwc / rev) * 100;
      return q("ci-nwc-f3", "facile", "Net working capital as a percentage of sales?",
        [["Net working capital", usd(nwc)], ["Sales", usd(rev)]],
        a, "%", 2,
        ["On rapporte le NWC au CA pour comparer des sociétés de tailles différentes.", `= ${F(nwc)} / ${F(rev)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const ca = 3000, cl = 2000, rev = 12500;
      const a = ((ca - cl) / rev) * 100;
      return q("ci-nwc-f4", "facile", "Total working capital as a percentage of sales?",
        [["Current assets", usd(ca)], ["Current liabilities", usd(cl)], ["Sales", usd(rev)]],
        a, "%", 2,
        [`Fonds de roulement total = ${F(ca)} − ${F(cl)} = ${D(ca - cl)}.`, `En % du CA = ${F(ca - cl)} / ${F(rev)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const rev = 36500000, cut = 3;
      const daily = rev / 365;
      const a = daily * cut;
      return q("ci-nwc-f5", "facile", "Cash released by collecting receivables 3 days faster?",
        [["Annual sales", usd(rev)], ["Reduction in DSO", days(cut)], ["Days in year", "365"]],
        a, "$", 0,
        [`Ventes par jour = ${F(rev)} / 365 = ${D(daily)}.`, `Trésorerie libérée = ${F(cut)} × ${F(daily)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const cash = 400, ms = 300, ar = 1800, inv = 2200, ap = 1500, acc = 400, std = 900, cltd = 300;
      const a = ar + inv - (ap + acc);
      return q("ci-nwc-m1", "moyen", "Net working capital?",
        [["Cash / marketable securities", lst([usd(cash), usd(ms)])], ["Receivables / inventory", lst([usd(ar), usd(inv)])],
          ["Accounts payable / accrued expenses", lst([usd(ap), usd(acc)])], ["Short-term bank debt / current portion of long-term debt", lst([usd(std), usd(cltd)])]],
        a, "$", 0,
        [`Actifs retenus (hors trésorerie et titres) = ${F(ar)} + ${F(inv)} = ${D(ar + inv)}.`,
          `Passifs retenus (hors dettes financières) = ${F(ap)} + ${F(acc)} = ${D(ap + acc)}.`,
          `NWC = ${F(ar + inv)} − ${F(ap + acc)} = ${D(a)} (le fonds de roulement total serait ${D(cash + ms + ar + inv - ap - acc - std - cltd)}).`]);
    })(),
    (() => {
      const cogs = 29200000, doh0 = 50, doh1 = 42;
      const daily = cogs / 365;
      const a = daily * (doh0 - doh1);
      return q("ci-nwc-m2", "moyen", "Cash released by the reduction in days of inventory on hand?",
        [["Cost of goods sold", usd(cogs)], ["DOH", `${days(doh0)} → ${days(doh1)}`], ["Days in year", "365"]],
        a, "$", 0,
        [`COGS par jour = ${F(cogs)} / 365 = ${D(daily)}.`, `Stocks en moins = ${F(doh0 - doh1)} jours × ${F(daily)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const rev = 36500, cogs = 25550, dso = 30, doh = 40, dpo = 35;
      const ar = (rev / 365) * dso, inv = (cogs / 365) * doh, ap = (cogs / 365) * dpo;
      const a = ar + inv - ap;
      return q("ci-nwc-m3", "moyen", "Net working capital implied by the working capital days? (Purchases ≈ cost of goods sold.)",
        [["Revenue", usd(rev)], ["Cost of goods sold", usd(cogs)], ["DSO / DOH / DPO", lst([days(dso), days(doh), days(dpo)])], ["Days in year", "365"]],
        a, "$", 0,
        [`Créances = ${F(rev / 365)} × ${F(dso)} = ${D(ar)} ; stocks = ${F(cogs / 365)} × ${F(doh)} = ${D(inv)}.`,
          `Fournisseurs = ${F(cogs / 365)} × ${F(dpo)} = ${D(ap)}.`, `NWC = ${F(ar)} + ${F(inv)} − ${F(ap)} = ${D(a)}.`]);
    })(),
    (() => {
      const ca = 10000, cash = 1500, ms = 500, cl = 7000, std = 1000;
      const a = ca - cash - ms - (cl - std);
      return q("ci-nwc-m4", "moyen", "Net working capital?",
        [["Current assets", usd(ca)], ["of which cash / marketable securities", lst([usd(cash), usd(ms)])], ["Current liabilities", usd(cl)],
          ["of which short-term bank debt", usd(std)]],
        a, "$", 0,
        [`Actifs retenus = ${F(ca)} − ${F(cash)} − ${F(ms)} = ${D(ca - cash - ms)} ; passifs retenus = ${F(cl)} − ${F(std)} = ${D(cl - std)}.`,
          `NWC = ${F(ca - cash - ms)} − ${F(cl - std)} = ${D(a)} (contre ${D(ca - cl)} de fonds de roulement total).`]);
    })(),
    (() => {
      const s0 = 50000000, s1 = 56000000, ratio = 0.12;
      const a = ratio * (s1 - s0);
      return q("ci-nwc-m5", "moyen", "Additional investment in net working capital needed for the sales growth?",
        [["Sales: current / next year", lst([usd(s0), usd(s1)])], ["Net working capital / sales (stable)", pc(ratio)]],
        a, "$", 0,
        [`NWC actuel = ${P(ratio)} × ${D(s0)} = ${D(ratio * s0)} ; NWC futur = ${P(ratio)} × ${D(s1)} = ${D(ratio * s1)}.`,
          `Investissement = ${F(ratio * s1)} − ${F(ratio * s0)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const rev = 109500000, cogs = 73000000, purch = 73000000;
      const dso = [40, 35], doh = [60, 55], dpo = [30, 36];
      const fromDso = (rev / 365) * (dso[0] - dso[1]), fromDoh = (cogs / 365) * (doh[0] - doh[1]), fromDpo = (purch / 365) * (dpo[1] - dpo[0]);
      const a = fromDso + fromDoh + fromDpo;
      return q("ci-nwc-d1", "difficile", "Total cash released by the working capital program?",
        [["Revenue / cost of goods sold / purchases", lst([usd(rev), usd(cogs), usd(purch)])], ["DSO", `${days(dso[0])} → ${days(dso[1])}`],
          ["DOH", `${days(doh[0])} → ${days(doh[1])}`], ["DPO", `${days(dpo[0])} → ${days(dpo[1])}`], ["Days in year", "365"]],
        a, "$", 0,
        [`Créances : ${F(dso[0] - dso[1])} × ${F(rev / 365)} = ${D(fromDso)}.`,
          `Stocks : ${F(doh[0] - doh[1])} × ${F(cogs / 365)} = ${D(fromDoh)}.`,
          `Fournisseurs (DPO allongé) : ${F(dpo[1] - dpo[0])} × ${F(purch / 365)} = ${D(fromDpo)}.`,
          `Total = ${D(a, 0)}.`]);
    })(),
    (() => {
      const rev = 182500000, cut = 8, rate = 0.06;
      const freed = (rev / 365) * cut;
      const a = freed * rate;
      return q("ci-nwc-d2", "difficile", "Annual interest saved if the cash released repays debt?",
        [["Annual sales", usd(rev)], ["Reduction in DSO", days(cut)], ["Interest rate on the debt repaid", pc(rate)], ["Days in year", "365"]],
        a, "$", 0,
        [`Ventes par jour = ${F(rev)} / 365 = ${D(rev / 365)}.`, `Trésorerie libérée = ${F(cut)} × ${F(rev / 365)} = ${D(freed)}.`,
          `Intérêts économisés = ${P(rate)} × ${F(freed)} = ${D(a, 0)} par an.`]);
    })(),
    (() => {
      const cash = 2000, ms = 1000, ar = 4000, inv = 5000, ap = 3500, acc = 1000, notes = 2500, cltd = 1000, rev = 50000;
      const nwc = ar + inv - (ap + acc);
      const a = (nwc / rev) * 100;
      return q("ci-nwc-d3", "difficile", "Net working capital as a percentage of sales?",
        [["Cash / marketable securities", lst([usd(cash), usd(ms)])], ["Receivables / inventory", lst([usd(ar), usd(inv)])],
          ["Accounts payable / accrued expenses", lst([usd(ap), usd(acc)])], ["Short-term notes / current portion of long-term debt", lst([usd(notes), usd(cltd)])],
          ["Sales", usd(rev)]],
        a, "%", 2,
        [`NWC = (${F(ar)} + ${F(inv)}) − (${F(ap)} + ${F(acc)}) = ${D(nwc)} : trésorerie, titres et dettes financières écartés.`,
          `NWC / CA = ${F(nwc)} / ${F(rev)} = ${Pa(a)}.`,
          `Piège : le fonds de roulement total (${D(cash + ms + ar + inv - ap - acc - notes - cltd)}) donnerait ${P((cash + ms + ar + inv - ap - acc - notes - cltd) / rev)}.`]);
    })(),
    (() => {
      const rev = 73000000, cogs = 54750000, dso = 45, doh = 60, dpo = 50;
      const ar = (rev / 365) * dso, inv = (cogs / 365) * doh, ap = (cogs / 365) * dpo, nwc = ar + inv - ap;
      const a = (nwc / rev) * 100;
      return q("ci-nwc-d4", "difficile", "Net working capital as a percentage of sales? (Purchases = cost of goods sold.)",
        [["Revenue", usd(rev)], ["Cost of goods sold", usd(cogs)], ["DSO / DOH / DPO", lst([days(dso), days(doh), days(dpo)])], ["Days in year", "365"]],
        a, "%", 2,
        [`Créances = ${F(dso)} × ${F(rev / 365)} = ${D(ar)} ; stocks = ${F(doh)} × ${F(cogs / 365)} = ${D(inv)}.`,
          `Fournisseurs = ${F(dpo)} × ${F(cogs / 365)} = ${D(ap)} ; NWC = ${D(nwc)}.`,
          `NWC / CA = ${F(nwc)} / ${F(rev)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const s0 = 40000000, s1 = 50000000, r0 = 0.15, r1 = 0.13;
      const a = r1 * s1 - r0 * s0;
      return q("ci-nwc-d5", "difficile", "Additional investment in net working capital next year?",
        [["Sales: current / next year", lst([usd(s0), usd(s1)])], ["NWC / sales: current / next year", lst([pc(r0), pc(r1)])]],
        a, "$", 0,
        [`NWC actuel = ${P(r0)} × ${D(s0)} = ${D(r0 * s0)}.`, `NWC futur = ${P(r1)} × ${D(s1)} = ${D(r1 * s1)} : l'efficacité gagnée compense une partie de la croissance.`,
          `Investissement = ${F(r1 * s1)} − ${F(r0 * s0)} = ${D(a, 0)}.`]);
    })(),
  ],
};

/* ────────────────────────── 7 · Coût de la liquidité ────────────────────────── */

type Source = { name: string; fmv: number; disc: number };
const FR_SOURCE: Record<string, string> = {
  Cash: "Trésorerie",
  "Marketable securities": "Titres de placement",
  Receivables: "Créances",
  "Receivables (factored)": "Créances (affacturage)",
  Inventory: "Stocks",
  Equipment: "Équipement",
  Warehouse: "Entrepôt",
  Land: "Terrain",
};
const fr = (name: string): string => FR_SOURCE[name] ?? name;
/** Vend les sources dans l'ordre (la moins chère d'abord) jusqu'à réunir `need`. */
function raise(need: number, sources: Source[]) {
  let left = need;
  const used: { name: string; sold: number; proceeds: number; cost: number; disc: number }[] = [];
  for (const s of sources) {
    if (left <= 1e-9) break;
    const proceeds = Math.min(left, s.fmv * (1 - s.disc));
    const sold = proceeds / (1 - s.disc);
    used.push({ name: s.name, sold, proceeds, cost: sold - proceeds, disc: s.disc });
    left -= proceeds;
  }
  return { used, cost: sum(used.map((u) => u.cost)), sold: sum(used.map((u) => u.sold)) };
}

const COST_LIQUIDITY: CalcType = {
  key: "cost-of-liquidity",
  topic: "corporate",
  name: "Coût de la liquidité (ventes forcées)",
  tier: "annexe",
  source: "LM 4 · Working Capital and Liquidity",
  formulas: [
    "Coût de liquidité d'une source = juste valeur × décote de liquidation",
    "Produit net = Σ juste valeur × (1 − décote)",
    "Coût de liquidité (%) = Σ décotes en $ / Σ justes valeurs",
    "Juste valeur à céder pour lever X = X / (1 − décote)",
  ],
  traps: [
    "Pour lever un montant net donné, il faut céder davantage que ce montant : diviser par (1 − décote).",
    "Mobiliser d'abord les sources les moins chères (trésorerie, titres) avant les ventes forcées.",
  ],
  questions: [
    (() => {
      const s: Source[] = [{ name: "Cash", fmv: 250000, disc: 0 }, { name: "Receivables", fmv: 400000, disc: 0.1 }, { name: "Equipment", fmv: 350000, disc: 0.4 }];
      const costs = s.map((x) => x.fmv * x.disc);
      const a = sum(costs);
      return q("ci-colq-f1", "facile", "Total cost of liquidity in dollars if all sources are used?",
        s.map((x) => [`${x.name}: fair value / liquidation cost`, lst([usd(x.fmv), pc(x.disc)])] as Row),
        a, "$", 0,
        [`Coûts : ${s.map((x, i) => `${F(x.fmv)} × ${P(x.disc)} = ${D(costs[i])}`).join(" ; ")}.`, `Total = ${D(a)}.`]);
    })(),
    (() => {
      const fmv = 2000000, disc = 0.25;
      const a = fmv * (1 - disc);
      return q("ci-colq-f2", "facile", "Net proceeds from an immediate sale of the building?",
        [["Fair market value of the building", usd(fmv)], ["Discount for immediate sale", pc(disc)]],
        a, "$", 0,
        [`Produit = ${F(fmv)} × (1 − ${P(disc)}) = ${D(a)}.`, `Coût de liquidité = ${D(fmv - a)}.`]);
    })(),
    (() => {
      const fmv = 800000, proceeds = 680000;
      const a = (1 - proceeds / fmv) * 100;
      return q("ci-colq-f3", "facile", "Cost of liquidity as a percentage of fair market value?",
        [["Fair market value of the assets sold", usd(fmv)], ["Cash received from the quick sale", usd(proceeds)]],
        a, "%", 2,
        [`Décote = ${F(fmv)} − ${F(proceeds)} = ${D(fmv - proceeds)}.`, `Coût = ${F(fmv - proceeds)} / ${F(fmv)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const s: Source[] = [{ name: "Cash", fmv: 150000, disc: 0 }, { name: "Marketable securities", fmv: 250000, disc: 0.02 }, { name: "Inventory", fmv: 300000, disc: 0.2 }];
      const pr = s.map((x) => x.fmv * (1 - x.disc));
      const a = sum(pr);
      return q("ci-colq-f4", "facile", "Total net proceeds if all sources are used?",
        s.map((x) => [`${x.name}: fair value / liquidation cost`, lst([usd(x.fmv), pc(x.disc)])] as Row),
        a, "$", 0,
        [`Produits : ${s.map((x, i) => `${F(x.fmv)} × ${F(1 - x.disc)} = ${D(pr[i])}`).join(" ; ")}.`, `Total = ${D(a)}.`]);
    })(),
    (() => {
      const cash = 100000, inv = 300000, disc = 0.2;
      const a = ((inv * disc) / (cash + inv)) * 100;
      return q("ci-colq-f5", "facile", "Cost of liquidity as a percentage of the total fair value used?",
        [["Cash", usd(cash)], ["Inventory: fair value / liquidation cost", lst([usd(inv), pc(disc)])]],
        a, "%", 2,
        [`Coût = ${P(disc)} × ${D(inv)} = ${D(inv * disc)} (la trésorerie ne coûte rien).`, `En % = ${F(inv * disc)} / ${F(cash + inv)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const s: Source[] = [{ name: "Cash", fmv: 300000, disc: 0 }, { name: "Receivables", fmv: 500000, disc: 0.08 }, { name: "Inventory", fmv: 400000, disc: 0.25 },
        { name: "Land", fmv: 800000, disc: 0.35 }];
      const costs = s.map((x) => x.fmv * x.disc), tot = sum(s.map((x) => x.fmv));
      const a = (sum(costs) / tot) * 100;
      return q("ci-colq-m1", "moyen", "Cost of liquidity as a percentage if all four sources are used?",
        s.map((x) => [`${x.name}: fair value / liquidation cost`, lst([usd(x.fmv), pc(x.disc)])] as Row),
        a, "%", 2,
        [`Coûts : ${s.map((x, i) => D(costs[i])).join(" + ")} = ${D(sum(costs))}.`, `Juste valeur totale = ${D(tot)}.`,
          `Coût de liquidité = ${F(sum(costs))} / ${F(tot)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const need = 500000, cash = 120000, disc = 0.2;
      const a = (need - cash) / (1 - disc);
      return q("ci-colq-m2", "moyen", "Fair value of inventory that must be sold to meet the payroll?",
        [["Payroll due", usd(need)], ["Cash available", usd(cash)], ["Liquidation cost on inventory", pc(disc)]],
        a, "$", 0,
        [`Manque = ${F(need)} − ${F(cash)} = ${D(need - cash)}, à lever net de décote.`, `Juste valeur à céder = ${F(need - cash)} / (1 − ${P(disc)}) = ${D(a, 0)}.`]);
    })(),
    (() => {
      const need = 255000, disc = 0.15;
      const sold = need / (1 - disc);
      const a = sold - need;
      return q("ci-colq-m3", "moyen", "Cost of liquidity in dollars to raise this amount by selling equipment?",
        [["Net cash needed", usd(need)], ["Discount on a quick sale of equipment", pc(disc)]],
        a, "$", 0,
        [`Juste valeur à céder = ${F(need)} / ${F(1 - disc)} = ${D(sold)}.`, `Coût = ${F(sold)} − ${F(need)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const s: Source[] = [{ name: "Cash", fmv: 50000, disc: 0 }, { name: "Marketable securities", fmv: 200000, disc: 0.03 }, { name: "Receivables (factored)", fmv: 400000, disc: 0.06 }];
      const pr = s.map((x) => x.fmv * (1 - x.disc));
      const a = sum(pr);
      return q("ci-colq-m4", "moyen", "Maximum cash the company can raise from these sources?",
        s.map((x) => [`${x.name}: fair value / liquidation cost`, lst([usd(x.fmv), pc(x.disc)])] as Row),
        a, "$", 0,
        [`Produits : ${s.map((x, i) => D(pr[i])).join(" + ")}.`, `Total = ${D(a)} (coût ${D(sum(s.map((x) => x.fmv)) - a)}).`]);
    })(),
    (() => {
      const ar = 300000, dAr = 0.1, inv = 500000, dInv = 0.2;
      const a = ((ar * dAr + inv * dInv) / (ar + inv)) * 100;
      return q("ci-colq-m5", "moyen", "Cost of liquidity as a percentage if both assets are sold?",
        [["Receivables: fair value / liquidation cost", lst([usd(ar), pc(dAr)])], ["Inventory: fair value / liquidation cost", lst([usd(inv), pc(dInv)])]],
        a, "%", 2,
        [`Coûts = ${F(ar)} × ${P(dAr)} + ${F(inv)} × ${P(dInv)} = ${D(ar * dAr)} + ${D(inv * dInv)} = ${D(ar * dAr + inv * dInv)}.`,
          `En % = ${F(ar * dAr + inv * dInv)} / ${F(ar + inv)} = ${Pa(a)} (moyenne pondérée, pas la moyenne simple de 15%).`]);
    })(),
    (() => {
      const need = 600000;
      const s: Source[] = [{ name: "Cash", fmv: 200000, disc: 0 }, { name: "Marketable securities", fmv: 150000, disc: 0.01 },
        { name: "Receivables (factored)", fmv: 300000, disc: 0.05 }, { name: "Warehouse", fmv: 500000, disc: 0.3 }];
      const r = raise(need, s);
      const a = r.cost;
      return q("ci-colq-d1", "difficile", "Minimum cost of liquidity in dollars to raise the cash needed?",
        [["Net cash needed", usd(need)], ...s.map((x) => [`${x.name}: fair value / liquidation cost`, lst([usd(x.fmv), pc(x.disc)])] as Row)],
        a, "$", 0,
        ["On mobilise les sources de la moins chère à la plus chère ; l'entrepôt n'est pas nécessaire.",
          ...r.used.map((u) => `${fr(u.name)} : on cède ${D(u.sold, 2)} pour ${D(u.proceeds, 2)} net, coût ${D(u.cost, 2)}.`),
          `Coût total = ${D(a, 0)}.`]);
    })(),
    (() => {
      const need = 900000;
      const s: Source[] = [{ name: "Cash", fmv: 150000, disc: 0 }, { name: "Marketable securities", fmv: 300000, disc: 0.02 }, { name: "Inventory", fmv: 1000000, disc: 0.25 }];
      const r = raise(need, s);
      const a = (r.cost / r.sold) * 100;
      return q("ci-colq-d2", "difficile", "Cost of liquidity as a percentage of the fair value of assets used, if the company raises the cash at the lowest cost?",
        [["Net cash needed", usd(need)], ...s.map((x) => [`${x.name}: fair value / liquidation cost`, lst([usd(x.fmv), pc(x.disc)])] as Row)],
        a, "%", 2,
        ["On mobilise les sources de la moins chère à la plus chère : trésorerie, puis titres, puis stocks (seulement la part nécessaire).",
          ...r.used.map((u) => `${fr(u.name)} : juste valeur utilisée ${D(u.sold, 2)}, produit ${D(u.proceeds, 2)}, coût ${D(u.cost, 2)}.`),
          `Coût total = ${D(r.cost, 2)} pour ${D(r.sold, 2)} de juste valeur utilisée.`,
          `Coût de liquidité = ${F(r.cost, 2)} / ${F(r.sold, 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const cash = 200000, ar = 300000, dAr = 0.1, bld = 500000, totPct = 0.18;
      const tot = cash + ar + bld, cost = totPct * tot;
      const a = ((cost - ar * dAr) / bld) * 100;
      return q("ci-colq-d3", "difficile", "Liquidation discount on the building implied by the total cost of liquidity?",
        [["Cash", usd(cash)], ["Receivables: fair value / liquidation cost", lst([usd(ar), pc(dAr)])], ["Building: fair value", usd(bld)],
          ["Total cost of liquidity (all sources used)", pc(totPct)]],
        a, "%", 2,
        [`Coût total = ${P(totPct)} × ${D(tot)} = ${D(cost)}.`, `Dont créances : ${F(ar)} × ${P(dAr)} = ${D(ar * dAr)} ; reste pour l'immeuble ${D(cost - ar * dAr)}.`,
          `Décote = ${F(cost - ar * dAr)} / ${F(bld)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const fmv = 3000000, disc = 0.2, fees = 60000;
      const proceeds = fmv * (1 - disc) - fees;
      const a = ((fmv - proceeds) / fmv) * 100;
      return q("ci-colq-d4", "difficile", "Cost of liquidity as a percentage of fair market value, including transaction fees?",
        [["Fair market value of the building", usd(fmv)], ["Discount for immediate sale", pc(disc)], ["Fixed legal and broker fees", usd(fees)]],
        a, "%", 2,
        [`Produit net = ${F(fmv)} × ${F(1 - disc)} − ${F(fees)} = ${D(proceeds)}.`, `Coût = ${F(fmv)} − ${F(proceeds)} = ${D(fmv - proceeds)}.`,
          `En % = ${F(fmv - proceeds)} / ${F(fmv)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const need = 1000000;
      const s: Source[] = [{ name: "Cash", fmv: 250000, disc: 0 }, { name: "Receivables (factored)", fmv: 400000, disc: 0.05 }, { name: "Equipment", fmv: 900000, disc: 0.3 }];
      const r = raise(need, s);
      const a = r.cost;
      return q("ci-colq-d5", "difficile", "Cost of liquidity in dollars to raise the cash needed at the lowest cost?",
        [["Net cash needed", usd(need)], ...s.map((x) => [`${x.name}: fair value / liquidation cost`, lst([usd(x.fmv), pc(x.disc)])] as Row)],
        a, "$", 0,
        [...r.used.map((u) => `${fr(u.name)} : produit ${D(u.proceeds, 2)} pour ${D(u.sold, 2)} de juste valeur, coût ${D(u.cost, 2)}.`),
          `Coût total = ${D(a, 0)}.`]);
    })(),
  ],
};

/* ────────────────────────── 8 · NPV ────────────────────────── */

const NPV: CalcType = {
  key: "npv",
  topic: "corporate",
  name: "Valeur actuelle nette d'un projet (NPV)",
  tier: "essentiel",
  top: true,
  source: "LM 5 · Capital Investments and Capital Allocation",
  formulas: [
    "NPV = −CF0 + Σ CFt / (1 + r)^t, r = coût du capital ajusté au risque du projet",
    "Projet indépendant : accepter si NPV > 0",
    "Flux incrémentaux après impôt : ignorer les coûts irrécupérables (sunk costs), intégrer cannibalisation, externalités et coûts d'opportunité",
    "Les frais financiers (intérêts) ne se déduisent pas des flux : ils sont dans le taux d'actualisation",
    "NPV avec option réelle = NPV sans option + valeur de l'option − coût de l'option",
  ],
  traps: [
    "Le produit de revente et la récupération du BFR s'ajoutent au flux de la dernière année.",
    "Flux réels → taux réel ; flux nominaux → taux nominal.",
  ],
  questions: [
    (() => {
      const cf0 = -10000, flows = [4000, 5000, 4500], r = 0.09;
      const a = npv(r, [cf0, ...flows]);
      return q("ci-npv-f1", "facile", "NPV of the project?",
        [["Initial investment", usd(-cf0)], ["Cash flows, years 1 / 2 / 3", lst(flows.map((x) => usd(x)))], ["Cost of capital", pc(r)]],
        a, "$", 0,
        [`NPV = −${F(-cf0)} + ${pvTerms(flows, r)}.`, `PV des flux : ${pvList(flows, r)}.`, `NPV = ${D(a, 2)} > 0 : accepter.`]);
    })(),
    (() => {
      const cf0 = -25000, cf = 7500, n = 4, r = 0.08;
      const af = annuity(r, n);
      const a = cf0 + cf * af;
      return q("ci-npv-f2", "facile", "NPV of the project?",
        [["Initial investment", usd(-cf0)], ["After-tax cash flow, years 1–4", `${usd(cf)} per year`], ["Cost of capital", pc(r)]],
        a, "$", 0,
        [`PV d'une annuité : ${F(cf)} × (1 − 1 / ${pw(r, n)}) / ${F(r)} = ${F(cf)} × ${F(af, 6)} ≈ ${D(cf * af, 2)}.`,
          `NPV = ${F(cf * af, 2)} − ${F(-cf0)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const cf0 = -100000, flows = [30000, 40000, 50000], r = 0.12;
      const a = npv(r, [cf0, ...flows]);
      return q("ci-npv-f3", "facile", "NPV of the project?",
        [["Initial investment", usd(-cf0)], ["Cash flows, years 1 / 2 / 3", lst(flows.map((x) => usd(x)))], ["Required return", pc(r)]],
        a, "$", 0,
        [`NPV = −${F(-cf0)} + ${pvTerms(flows, r)}.`, `PV des flux : ${pvList(flows, r)}.`, `NPV = ${D(a, 2)} : rejeter, le projet détruit de la valeur.`]);
    })(),
    (() => {
      const cf0 = -50000, cf3 = 65000, r = 0.1;
      const a = cf0 + pv(cf3, r, 3);
      return q("ci-npv-f4", "facile", "NPV of the investment?",
        [["Investment today", usd(-cf0)], ["Single cash flow at the end of year 3", usd(cf3)], ["Cost of capital", pc(r)]],
        a, "$", 0,
        [`PV = ${F(cf3)} / ${pw(r, 3)} = ${D(pv(cf3, r, 3), 2)}.`, `NPV = ${F(pv(cf3, r, 3), 2)} − ${F(-cf0)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const cf0 = -200000, flows = [60000, 55000, 70000, 80000], r = 0.11;
      const a = npv(r, [cf0, ...flows]);
      return q("ci-npv-f5", "facile", "NPV of the project?",
        [["Initial cash outlay", usd(-cf0)], ["Cash flows, years 1 to 4", lst(flows.map((x) => usd(x)))], ["Cost of capital", pc(r)]],
        a, "$", 0,
        [`PV des flux : ${pvList(flows, r)}, total ${D(npv(r, [0, ...flows]), 2)}.`, `NPV = ${F(npv(r, [0, ...flows]), 2)} − ${F(-cf0)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const cf0 = -250000, op = [40000, 45000, 50000], salv = 180000, r = 0.1;
      const flows = [op[0], op[1], op[2] + salv];
      const a = npv(r, [cf0, ...flows]);
      return q("ci-npv-m1", "moyen", "NPV of the investment?",
        [["Initial cost", usd(-cf0)], ["Operating cash flows, years 1 / 2 / 3", lst(op.map((x) => usd(x)))], ["After-tax sale proceeds at the end of year 3", usd(salv)],
          ["Required return", pc(r)]],
        a, "$", 0,
        [`Flux de l'année 3 = ${F(op[2])} + ${F(salv)} = ${D(flows[2])}.`, `NPV = −${F(-cf0)} + ${pvTerms(flows, r)}.`,
          `= −${F(-cf0)} + ${pvList(flows, r).split(" ; ").join(" + ")} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const cf0 = -28000, flows = expand([[7000, 4], [6000, 2]]), r = 0.1;
      const a = npv(r, [cf0, ...flows]);
      return q("ci-npv-m2", "moyen", "NPV of the printer project?",
        [["Cost", usd(-cf0)], ["After-tax cash flows, years 1–4", `${usd(7000)} per year`], ["After-tax cash flows, years 5–6", `${usd(6000)} per year`], ["Cost of capital", pc(r)]],
        a, "$", 0,
        [`Années 1–4 : ${F(7000)} × ${F(annuity(r, 4), 6)} ≈ ${D(7000 * annuity(r, 4), 2)}.`,
          `Années 5–6 : ${F(6000)} / ${pw(r, 5)} + ${F(6000)} / ${pw(r, 6)} = ${D(pv(6000, r, 5) + pv(6000, r, 6), 2)}.`,
          `NPV = ${D(a, 2)} (calculatrice : ${cfKeys(cf0, flows)} ; I = ${F(r * 100)} ; CPT NPV).`]);
    })(),
    (() => {
      const cf0 = -600000, cf = 220000, n = 6, close = -150000, r = 0.14;
      const flows = [...expand([[cf, n]]), close];
      const a = npv(r, [cf0, ...flows]);
      return q("ci-npv-m3", "moyen", "NPV of the mine, including the closing cost?",
        [["Construction cost today", usd(-cf0)], ["Cash inflows, years 1–6", `${usd(cf)} per year`], ["Cost to close the mine at the end of year 7", usd(-close)], ["Required return", pc(r)]],
        a, "$", 0,
        [`PV des entrées = ${F(cf)} × ${F(annuity(r, n), 6)} ≈ ${D(cf * annuity(r, n), 2)}.`,
          `PV de la fermeture = −${F(-close)} / ${pw(r, 7)} = −${D(pv(-close, r, 7), 2)}.`,
          `NPV = −${F(-cf0)} + ${F(cf * annuity(r, n), 2)} − ${F(pv(-close, r, 7), 2)} ≈ ${D(a, 2)}.`]);
    })(),
    (() => {
      const inv = 90000, n = 3, rev = 100000, costs = 40000, t = 0.3, r = 0.1;
      const dep = inv / n, cf = (rev - costs - dep) * (1 - t) + dep;
      const a = -inv + cf * annuity(r, n);
      return q("ci-npv-m4", "moyen", "NPV of the project?",
        [["Equipment cost (straight-line to zero over 3 years)", usd(inv)], ["Annual revenue / cash operating costs", lst([usd(rev), usd(costs)])], ["Tax rate", pc(t)],
          ["Cost of capital", pc(r)]],
        a, "$", 0,
        [`Amortissement = ${F(inv)} / ${F(n)} = ${D(dep)} par an (charge non décaissée, mais déductible).`,
          `Flux annuel = (${F(rev)} − ${F(costs)} − ${F(dep)}) × (1 − ${P(t)}) + ${F(dep)} = ${D(cf)}.`,
          `NPV = −${F(inv)} + ${F(cf)} × ${F(annuity(r, n), 6)} ≈ ${D(a, 2)}.`]);
    })(),
    (() => {
      const cf0 = -500000, cf = 150000, n = 3, r = 0.1, opt = 200000, optCost = 30000;
      const base = cf0 + cf * annuity(r, n);
      const a = base + opt - optCost;
      return q("ci-npv-m5", "moyen", "NPV of the project including the expansion option?",
        [["Initial investment", usd(-cf0)], ["Cash flows, years 1–3", `${usd(cf)} per year`], ["Cost of capital", pc(r)],
          ["Estimated value of the expansion option", usd(opt)], ["Cost of acquiring the option today", usd(optCost)]],
        a, "$", 0,
        [`NPV sans option = −${F(-cf0)} + ${F(cf)} × ${F(annuity(r, n), 6)} ≈ ${D(base, 2)}.`,
          `NPV avec option = ${F(base, 2)} + ${F(opt)} − ${F(optCost)} = ${D(a, 2)} : l'option rend le projet acceptable.`]);
    })(),
    (() => {
      const study = 40000, inv = 500000, cf = 180000, cannib = 30000, n = 4, r = 0.11;
      const net = cf - cannib;
      const a = -inv + net * annuity(r, n);
      return q("ci-npv-d1", "difficile", "NPV of the new product line?",
        [["Market study already paid", usd(study)], ["Investment today", usd(inv)], ["Cash flows from the new product, years 1–4", `${usd(cf)} per year`],
          ["Lost cash flows on an existing product (cannibalization)", `${usd(cannib)} per year`], ["Cost of capital", pc(r)]],
        a, "$", 0,
        ["L'étude déjà payée est un coût irrécupérable (sunk cost) : on l'écarte.",
          `Flux incrémental = ${F(cf)} − ${F(cannib)} = ${D(net)} par an (la cannibalisation se retranche).`,
          `NPV = −${F(inv)} + ${F(net)} × ${F(annuity(r, n), 6)} ≈ ${D(a, 2)}.`]);
    })(),
    (() => {
      const inv = 300000, cf = 90000, n = 5, int = 20000, r = 0.09;
      const a = -inv + cf * annuity(r, n);
      return q("ci-npv-d2", "difficile", "NPV of the project?",
        [["Investment today", usd(inv)], ["After-tax operating cash flows, years 1–5", `${usd(cf)} per year`],
          ["Interest on the loan financing the project", `${usd(int)} per year`], ["WACC", pc(r)]],
        a, "$", 0,
        ["Les intérêts sont déjà dans le WACC : les déduire des flux les compterait deux fois (donnée-piège).",
          `NPV = −${F(inv)} + ${F(cf)} × ${F(annuity(r, n), 6)} ≈ ${D(a, 2)}.`]);
    })(),
    (() => {
      const eq = 400000, nwc = 50000, cf = 120000, n = 5, salv = 30000, r = 0.1;
      const flows = [...expand([[cf, n - 1]]), cf + nwc + salv];
      const a = npv(r, [-(eq + nwc), ...flows]);
      return q("ci-npv-d3", "difficile", "NPV of the project?",
        [["Equipment cost today", usd(eq)], ["Investment in net working capital today (recovered at the end)", usd(nwc)],
          ["After-tax operating cash flows, years 1–5", `${usd(cf)} per year`], ["After-tax salvage value at the end of year 5", usd(salv)], ["Cost of capital", pc(r)]],
        a, "$", 0,
        [`CF0 = −(${F(eq)} + ${F(nwc)}) = −${D(eq + nwc)}.`,
          `Année 5 = ${F(cf)} + ${F(nwc)} (BFR récupéré) + ${F(salv)} = ${D(cf + nwc + salv)}.`,
          `NPV = −${F(eq + nwc)} + ${F(cf)} × ${F(annuity(r, n - 1), 6)} + ${F(cf + nwc + salv)} / ${pw(r, n)} ≈ ${D(a, 2)}.`]);
    })(),
    (() => {
      const inv = 120000, cf = 50000, n = 3, nom = 0.1021, infl = 0.03;
      const real = (1 + nom) / (1 + infl) - 1;
      const a = -inv + cf * annuity(real, n);
      return q("ci-npv-d4", "difficile", "NPV of the project? (Cash flows are stated in real terms.)",
        [["Initial investment", usd(inv)], ["Real cash flows, years 1–3", `${usd(cf)} per year`], ["Nominal cost of capital", pc(nom, 2)], ["Expected inflation", pc(infl)]],
        a, "$", 0,
        ["Flux réels → actualiser au taux réel (sinon on sous-estime la NPV).",
          `Taux réel = ${F(1 + nom)} / ${F(1 + infl)} − 1 = ${P(real, 2)}.`,
          `NPV = −${F(inv)} + ${F(cf)} × ${F(annuity(real, n), 6)} ≈ ${D(a, 2)}.`]);
    })(),
    (() => {
      const inv = 600000, land = 200000, cf = 210000, n = 5, r = 0.12;
      const a = -(inv + land) + cf * annuity(r, n);
      return q("ci-npv-d5", "difficile", "NPV of building the plant on land the company already owns?",
        [["Construction cost today", usd(inv)], ["After-tax price the land could be sold for today", usd(land)], ["After-tax cash flows, years 1–5", `${usd(cf)} per year`],
          ["Required return", pc(r)]],
        a, "$", 0,
        ["Le terrain n'est pas gratuit : renoncer à le vendre est un coût d'opportunité qui s'ajoute à CF0.",
          `CF0 = −(${F(inv)} + ${F(land)}) = −${D(inv + land)} ; PV des flux = ${F(cf)} × ${F(annuity(r, n), 6)} ≈ ${D(cf * annuity(r, n), 2)}.`,
          `NPV = ${D(a, 2)} : rejeter (sans le coût d'opportunité, on aurait trouvé ${D(a + land, 2)}).`]);
    })(),
  ],
};

/* ────────────────────────── 9 · IRR ────────────────────────── */

const IRR: CalcType = {
  key: "irr",
  topic: "corporate",
  name: "Taux de rendement interne (IRR)",
  tier: "essentiel",
  top: true,
  source: "LM 5 · Capital Investments and Capital Allocation",
  formulas: [
    "IRR : taux qui annule la NPV, Σ CFt / (1 + IRR)^t = CF0",
    "Accepter si IRR > taux de rendement exigé (hurdle rate)",
    "Un seul flux : IRR = (CFn / CF0)^(1/n) − 1",
    "L'IRR suppose un réinvestissement au taux IRR (la NPV, au coût du capital) ; plusieurs changements de signe → IRR multiples possibles",
  ],
  traps: [
    "Le flux de la dernière année inclut le produit de revente : additionner avant de saisir (CF_n net).",
    "Une année sans flux se saisit à 0, elle ne se saute pas.",
  ],
  questions: [
    (() => {
      const cf0 = -1000, cf1 = 1150;
      const a = irr([cf0, cf1]) * 100;
      return q("ci-irr-f1", "facile", "IRR of the investment?",
        [["Investment today", usd(-cf0)], ["Cash flow in one year", usd(cf1)]],
        a, "%", 2,
        ["Un seul flux à 1 an : IRR = CF1 / CF0 − 1.", `IRR = ${F(cf1)} / ${F(-cf0)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const cf0 = -10000, cf2 = 12100;
      const a = irr([cf0, 0, cf2]) * 100;
      return q("ci-irr-f2", "facile", "IRR of the investment?",
        [["Investment today", usd(-cf0)], ["Cash flow at the end of year 1", "$0"], ["Cash flow at the end of year 2", usd(cf2)]],
        a, "%", 2,
        ["Un seul flux à 2 ans : IRR = (CF2 / CF0)^(1/2) − 1.", `IRR = (${F(cf2)} / ${F(-cf0)})^0,5 − 1 = ${F(cf2 / -cf0)}^0,5 − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const cf0 = -5000, cf = 2000, n = 3;
      const flows = expand([[cf, n]]);
      const a = irr([cf0, ...flows]) * 100;
      return q("ci-irr-f3", "facile", "IRR of the project?",
        [["Initial investment", usd(-cf0)], ["Cash flows, years 1–3", `${usd(cf)} per year`]],
        a, "%", 2,
        [`On cherche r tel que ${F(cf)} × [1 − (1 + r)^−3] / r = ${F(-cf0)}.`,
          `Calculatrice : N = 3, PV = ${F(cf0)}, PMT = ${F(cf)}, FV = 0 ; CPT I/Y = ${Pa(a)}.`,
          `Vérification : NPV à ${Pa(a)} = ${F(npv(a / 100, [cf0, ...flows]), 2)} ≈ 0.`]);
    })(),
    (() => {
      const cf0 = -50000, cf3 = 65000;
      const a = irr([cf0, 0, 0, cf3]) * 100;
      return q("ci-irr-f4", "facile", "IRR of the investment?",
        [["Investment today", usd(-cf0)], ["Single cash flow at the end of year 3", usd(cf3)]],
        a, "%", 2,
        ["IRR = (CF3 / CF0)^(1/3) − 1.", `IRR = (${F(cf3)} / ${F(-cf0)})^(1/3) − 1 = ${F(cf3 / -cf0)}^(1/3) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const cf0 = -1000, cf = 600;
      const a = irr([cf0, cf, cf]) * 100;
      return q("ci-irr-f5", "facile", "IRR of the project?",
        [["Initial investment", usd(-cf0)], ["Cash flows, years 1 and 2", `${usd(cf)} per year`]],
        a, "%", 2,
        [`${F(-cf0)} = ${F(cf)} / (1 + r) + ${F(cf)} / (1 + r)² ; calculatrice : N = 2, PV = ${F(cf0)}, PMT = ${F(cf)} ; CPT I/Y.`,
          `IRR = ${Pa(a)} (NPV à ce taux = ${F(npv(a / 100, [cf0, cf, cf]), 2)}).`]);
    })(),
    (() => {
      const cf0 = -40000, flows = expand([[9000, 4], [8000, 3]]);
      const a = irr([cf0, ...flows]) * 100;
      return q("ci-irr-m1", "moyen", "IRR of the project?",
        [["Cost of the machine", usd(-cf0)], ["After-tax cash flows, years 1–4", `${usd(9000)} per year`], ["After-tax cash flows, years 5–7", `${usd(8000)} per year`]],
        a, "%", 2,
        [`Saisie : ${cfKeys(cf0, flows)} ; CPT IRR.`, `IRR = ${Pa(a)} (NPV à ce taux = ${F(npv(a / 100, [cf0, ...flows]), 2)}).`]);
    })(),
    (() => {
      const cf0 = -800000, sale = 500000;
      const op = expand([[70000, 6], [60000, 3]]);
      const flows = op.map((x, i) => (i === op.length - 1 ? x + sale : x));
      const a = irr([cf0, ...flows]) * 100;
      return q("ci-irr-m2", "moyen", "IRR of the property investment?",
        [["Purchase price", usd(-cf0)], ["After-tax cash flows, years 1–6", `${usd(70000)} per year`], ["After-tax cash flows, years 7–9", `${usd(60000)} per year`],
          ["After-tax sale proceeds at the end of year 9", usd(sale)]],
        a, "%", 2,
        [`Année 9 = ${F(60000)} + ${F(sale)} = ${D(60000 + sale)} : le dernier groupe ne compte donc que 2 années à ${D(60000)}.`,
          `Saisie : ${cfKeys(cf0, flows)} ; CPT IRR.`, `IRR = ${Pa(a)}.`]);
    })(),
    (() => {
      const cf0 = -500000, flows = [0, 200000, 250000, 260000];
      const a = irr([cf0, ...flows]) * 100;
      return q("ci-irr-m3", "moyen", "IRR of the investment?",
        [["Investment today", usd(-cf0)], ["Cash flows, years 1 / 2 / 3 / 4", lst(flows.map((x) => usd(x)))]],
        a, "%", 2,
        [`L'année 1 sans flux se saisit à 0 : ${cfKeys(cf0, flows)} ; CPT IRR.`, `IRR = ${Pa(a)} (NPV à ce taux = ${F(npv(a / 100, [cf0, ...flows]), 2)}).`]);
    })(),
    (() => {
      const cf0 = -120000, cf = 45000, n = 4, r = 0.12;
      const i = irr([cf0, ...expand([[cf, n]])]);
      const a = (i - r) * 100;
      return q("ci-irr-m4", "moyen", "By how many percentage points does the IRR exceed the required return (margin of safety)?",
        [["Initial investment", usd(-cf0)], ["Cash flows, years 1–4", `${usd(cf)} per year`], ["Required return", pc(r)]],
        a, "%", 2,
        [`IRR : N = ${F(n)}, PV = ${F(cf0)}, PMT = ${F(cf)}, FV = 0 ; CPT I/Y = ${P(i, 2)}.`,
          `Marge = ${P(i, 2)} − ${P(r)} = ${Pa(a)} : le taux exigé peut monter de ${F(a, 2)} points (ou le rendement effectif du projet baisser d'autant) avant que la NPV ne devienne négative.`]);
    })(),
    (() => {
      const cf0 = -3000, flows = [1000, 1500, 1500];
      const a = irr([cf0, ...flows]) * 100;
      return q("ci-irr-m5", "moyen", "IRR of the project?",
        [["Initial investment", usd(-cf0)], ["Cash flows, years 1 / 2 / 3", lst(flows.map((x) => usd(x)))]],
        a, "%", 2,
        [`Saisie : ${cfKeys(cf0, flows)} ; CPT IRR.`, `IRR = ${Pa(a)} (NPV à ce taux = ${F(npv(a / 100, [cf0, ...flows]), 2)}).`]);
    })(),
    (() => {
      const study = 25000, inv = 200000, cf = 60000, n = 5;
      const a = irr([-inv, ...expand([[cf, n]])]) * 100;
      return q("ci-irr-d1", "difficile", "IRR of the project?",
        [["Feasibility study (already paid last year)", usd(study)], ["Investment today", usd(inv)], ["After-tax cash flows, years 1–5", `${usd(cf)} per year`]],
        a, "%", 2,
        ["L'étude est un coût irrécupérable : elle n'entre pas dans CF0.",
          `N = ${F(n)}, PV = −${F(inv)}, PMT = ${F(cf)}, FV = 0 ; CPT I/Y = ${Pa(a)}.`,
          `(En ajoutant l'étude à tort, on trouverait ${P(irr([-(inv + study), ...expand([[cf, n]])]), 2)}.)`]);
    })(),
    (() => {
      const inv = 150000, n = 5, rev = 95000, costs = 40000, t = 0.25;
      const dep = inv / n, cf = (rev - costs - dep) * (1 - t) + dep;
      const a = irr([-inv, ...expand([[cf, n]])]) * 100;
      return q("ci-irr-d2", "difficile", "IRR of the project?",
        [["Equipment cost (straight-line to zero over 5 years)", usd(inv)], ["Annual revenue / cash operating costs", lst([usd(rev), usd(costs)])], ["Tax rate", pc(t)]],
        a, "%", 2,
        [`Amortissement = ${F(inv)} / ${F(n)} = ${D(dep)}.`,
          `Flux annuel = (${F(rev)} − ${F(costs)} − ${F(dep)}) × (1 − ${P(t)}) + ${F(dep)} = ${D(cf)}.`,
          `N = ${F(n)}, PV = −${F(inv)}, PMT = ${F(cf)} ; CPT I/Y = ${Pa(a)}.`]);
    })(),
    (() => {
      const eq = 300000, nwc = 40000, cf = 90000, n = 5, salv = 20000;
      const flows = [...expand([[cf, n - 1]]), cf + nwc + salv];
      const a = irr([-(eq + nwc), ...flows]) * 100;
      return q("ci-irr-d3", "difficile", "IRR of the project?",
        [["Equipment cost today", usd(eq)], ["Net working capital invested today (recovered in year 5)", usd(nwc)], ["After-tax operating cash flows, years 1–5", `${usd(cf)} per year`],
          ["After-tax salvage value at the end of year 5", usd(salv)]],
        a, "%", 2,
        [`CF0 = −${D(eq + nwc)} ; année 5 = ${F(cf)} + ${F(nwc)} + ${F(salv)} = ${D(cf + nwc + salv)}.`,
          `Saisie : ${cfKeys(-(eq + nwc), flows)} ; CPT IRR.`, `IRR = ${Pa(a)}.`]);
    })(),
    (() => {
      const flows = [50000, 60000, 70000], hurdle = 0.12;
      const a = npv(hurdle, [0, ...flows]);
      return q("ci-irr-d4", "difficile", "Maximum initial investment for the project's IRR to be at least the hurdle rate?",
        [["Cash flows, years 1 / 2 / 3", lst(flows.map((x) => usd(x)))], ["Hurdle rate", pc(hurdle)]],
        a, "$", 0,
        ["IRR = hurdle rate ⇔ NPV = 0 au hurdle rate : l'investissement maximal est la PV des flux à 12%.",
          `PV = ${pvTerms(flows, hurdle)} = ${pvList(flows, hurdle).split(" ; ").join(" + ")}.`,
          `Investissement maximal = ${D(a, 0)}.`]);
    })(),
    (() => {
      const inv = 500000, n = 6, salv = 50000, target = 0.14;
      const a = (inv - pv(salv, target, n)) / annuity(target, n);
      return q("ci-irr-d5", "difficile", "Annual after-tax cash flow needed for the project's IRR to equal 14%?",
        [["Initial investment", usd(inv)], ["Project life", "6 years (equal annual cash flows)"], ["After-tax salvage value at the end of year 6", usd(salv)], ["Target IRR", pc(target)]],
        a, "$", 0,
        ["À IRR = 14%, la NPV est nulle : investissement = PV des flux + PV de la valeur résiduelle.",
          `PV de la valeur résiduelle = ${F(salv)} / ${pw(target, n)} = ${D(pv(salv, target, n), 2)}.`,
          `Flux = (${F(inv)} − ${F(pv(salv, target, n), 2)}) / ${F(annuity(target, n), 6)} ≈ ${D(a, 0)} (calculatrice : N = 6, I/Y = 14, PV = −${F(inv)}, FV = ${F(salv)} ; CPT PMT).`]);
    })(),
  ],
};

/* ────────────────────────── 10 · ROIC ────────────────────────── */

const ROIC: CalcType = {
  key: "roic",
  topic: "corporate",
  name: "Rentabilité du capital investi (ROIC)",
  tier: "essentiel",
  top: true,
  source: "LM 5 · Capital Investments and Capital Allocation",
  formulas: [
    "ROIC = résultat opérationnel après impôt (NOPAT) / capital investi moyen",
    "NOPAT = EBIT × (1 − t) = résultat net + intérêts × (1 − t)",
    "Capital investi = dette à long terme + capitaux propres (valeurs comptables, moyenne début/fin) ; hors BFR",
    "ROIC = marge opérationnelle après impôt × rotation du capital (CA / capital investi moyen)",
    "ROIC > rendement exigé (coût du capital) : l'entreprise crée de la valeur",
  ],
  traps: [
    "Prendre la moyenne du capital investi (début + fin) / 2.",
    "Le résultat net seul ne suffit pas : rajouter les intérêts APRÈS impôt (ou partir de l'EBIT).",
  ],
  questions: [
    (() => {
      const ebit = 300, t = 0.25, ic = 1500;
      const a = (nopat(ebit, t) / ic) * 100;
      return q("ci-roic-f1", "facile", "Return on invested capital (ROIC)?",
        [["Operating profit (EBIT)", usd(ebit)], ["Tax rate", pc(t)], ["Average invested capital", usd(ic)]],
        a, "%", 2,
        [`NOPAT = ${F(ebit)} × (1 − ${P(t)}) = ${D(nopat(ebit, t))}.`, `ROIC = ${F(nopat(ebit, t))} / ${F(ic)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const np = 180, d = 400, e = 800;
      const a = (np / (d + e)) * 100;
      return q("ci-roic-f2", "facile", "Return on invested capital?",
        [["After-tax operating profit (NOPAT)", usd(np)], ["Average long-term debt", usd(d)], ["Average shareholders' equity", usd(e)]],
        a, "%", 2,
        [`Capital investi moyen = ${F(d)} + ${F(e)} = ${D(d + e)}.`, `ROIC = ${F(np)} / ${F(d + e)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const m = 0.08, turn = 1.5;
      const a = m * turn * 100;
      return q("ci-roic-f3", "facile", "Return on invested capital?",
        [["After-tax operating margin (NOPAT / sales)", pc(m)], ["Capital turnover (sales / average invested capital)", mx(turn)]],
        a, "%", 2,
        ["ROIC = marge opérationnelle après impôt × rotation du capital.", `= ${P(m)} × ${F(turn)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const beg = 2000, end = 2400, np = 264;
      const avg = (beg + end) / 2;
      const a = (np / avg) * 100;
      return q("ci-roic-f4", "facile", "Return on invested capital?",
        [["After-tax operating profit", usd(np)], ["Invested capital: beginning / end of year", lst([usd(beg), usd(end)])]],
        a, "%", 2,
        [`Capital investi moyen = (${F(beg)} + ${F(end)}) / 2 = ${D(avg)}.`, `ROIC = ${F(np)} / ${F(avg)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const roic = 0.11, req = 0.085;
      const a = (roic - req) * 100;
      return q("ci-roic-f5", "facile", "Spread between ROIC and the required return (percentage points)?",
        [["Return on invested capital", pc(roic)], ["Investors' blended required return (debt and equity)", pc(req, 1)]],
        a, "%", 2,
        [`Écart = ${P(roic)} − ${P(req, 1)} = ${Pa(a)}.`, "Écart positif : l'entreprise crée de la valeur pour ses apporteurs de capitaux."]);
    })(),
    (() => {
      const ni = 150, int = 40, t = 0.25, ic = 1500;
      const np = ni + int * (1 - t);
      const a = (np / ic) * 100;
      return q("ci-roic-m1", "moyen", "Return on invested capital?",
        [["Net income", usd(ni)], ["Interest expense", usd(int)], ["Tax rate", pc(t)], ["Average invested capital", usd(ic)]],
        a, "%", 2,
        [`NOPAT = résultat net + intérêts après impôt = ${F(ni)} + ${F(int)} × (1 − ${P(t)}) = ${D(np)}.`, `ROIC = ${F(np)} / ${F(ic)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const ebit = 500, t = 0.3, d0 = 1000, e0 = 1500, d1 = 1200, e1 = 1700;
      const avg = (d0 + e0 + d1 + e1) / 2, np = nopat(ebit, t);
      const a = (np / avg) * 100;
      return q("ci-roic-m2", "moyen", "Return on invested capital?",
        [["EBIT", usd(ebit)], ["Tax rate", pc(t)], ["Beginning of year: long-term debt / equity", lst([usd(d0), usd(e0)])], ["End of year: long-term debt / equity", lst([usd(d1), usd(e1)])]],
        a, "%", 2,
        [`NOPAT = ${F(ebit)} × ${F(1 - t)} = ${D(np)}.`, `Capital investi moyen = (${F(d0 + e0)} + ${F(d1 + e1)}) / 2 = ${D(avg)}.`, `ROIC = ${F(np)} / ${F(avg)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const sales = 4000, ebit = 480, t = 0.25, ic = 2500;
      const np = nopat(ebit, t), m = np / sales, turn = sales / ic;
      const a = m * turn * 100;
      return q("ci-roic-m3", "moyen", "ROIC, decomposed into after-tax margin and capital turnover?",
        [["Sales", usd(sales)], ["EBIT", usd(ebit)], ["Tax rate", pc(t)], ["Average invested capital", usd(ic)]],
        a, "%", 2,
        [`Marge après impôt = ${F(ebit)} × ${F(1 - t)} / ${F(sales)} = ${P(m)}.`, `Rotation du capital = ${F(sales)} / ${F(ic)} = ${F(turn)}x.`,
          `ROIC = ${P(m)} × ${F(turn)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const target = 0.15, m = 0.06;
      const a = target / m;
      return q("ci-roic-m4", "moyen", "Capital turnover needed to reach the target ROIC?",
        [["Target ROIC", pc(target)], ["After-tax operating margin", pc(m)]],
        a, "x", 2,
        [`ROIC = marge × rotation, donc rotation = ${P(target)} / ${P(m)}.`, `Rotation = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const np = 240, ic = 2000, req = 0.09;
      const a = np - req * ic;
      return q("ci-roic-m5", "moyen", "After-tax operating profit in excess of the required return on capital ($)?",
        [["NOPAT", usd(np)], ["Average invested capital", usd(ic)], ["Blended required return", pc(req)]],
        a, "$", 0,
        [`ROIC = ${F(np)} / ${F(ic)} = ${P(np / ic)} > ${P(req)}.`, `Rendement exigé en $ = ${P(req)} × ${F(ic)} = ${D(req * ic)}.`,
          `Excédent = ${F(np)} − ${F(req * ic)} = ${D(a)} = (${P(np / ic)} − ${P(req)}) × ${F(ic)}.`]);
    })(),
    (() => {
      const ltd = 800, eq = 1200, ap = 300, ebit = 400, t = 0.25, int = 50;
      const np = nopat(ebit, t);
      const a = (np / (ltd + eq)) * 100;
      return q("ci-roic-d1", "difficile", "Return on invested capital?",
        [["EBIT", usd(ebit)], ["Interest expense", usd(int)], ["Tax rate", pc(t)], ["Average long-term debt / equity", lst([usd(ltd), usd(eq)])],
          ["Average accounts payable", usd(ap)]],
        a, "%", 2,
        ["Le NOPAT part de l'EBIT (avant intérêts) : on ne retire pas les intérêts.",
          `NOPAT = ${F(ebit)} × ${F(1 - t)} = ${D(np)} ; capital investi = ${F(ltd)} + ${F(eq)} = ${D(ltd + eq)} (les fournisseurs, du BFR, sont exclus).`,
          `ROIC = ${F(np)} / ${F(ltd + eq)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const ni = 210, int = 60, t = 0.3, d0 = 900, e0 = 1500, d1 = 1100, e1 = 1700;
      const np = ni + int * (1 - t), avg = (d0 + e0 + d1 + e1) / 2;
      const a = (np / avg) * 100;
      return q("ci-roic-d2", "difficile", "Return on invested capital?",
        [["Net income", usd(ni)], ["Interest expense", usd(int)], ["Tax rate", pc(t)], ["Beginning of year: long-term debt / equity", lst([usd(d0), usd(e0)])],
          ["End of year: long-term debt / equity", lst([usd(d1), usd(e1)])]],
        a, "%", 2,
        [`NOPAT = ${F(ni)} + ${F(int)} × ${F(1 - t)} = ${D(np)}.`, `Capital investi moyen = (${F(d0 + e0)} + ${F(d1 + e1)}) / 2 = ${D(avg)}.`,
          `ROIC = ${F(np)} / ${F(avg)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const sales = 5000, ic = 2500, m0 = 0.1, m1 = 0.12, t = 0.25;
      const r0 = (sales * m0 * (1 - t)) / ic, r1 = (sales * m1 * (1 - t)) / ic;
      const a = (r1 - r0) * 100;
      return q("ci-roic-d3", "difficile", "Increase in ROIC (percentage points) if the EBIT margin improves?",
        [["Sales", usd(sales)], ["Average invested capital", usd(ic)], ["EBIT margin", `${pc(m0)} → ${pc(m1)}`], ["Tax rate", pc(t)]],
        a, "%", 2,
        [`Rotation du capital = ${F(sales)} / ${F(ic)} = ${F(sales / ic)}x.`,
          `Avant : ${P(m0)} × ${F(1 - t)} × ${F(sales / ic)} = ${P(r0)} ; après : ${P(m1)} × ${F(1 - t)} × ${F(sales / ic)} = ${P(r1)}.`,
          `Hausse = ${Pa(a)}.`]);
    })(),
    (() => {
      const req = 0.1, ic = 3000, t = 0.25;
      const a = (req * ic) / (1 - t);
      return q("ci-roic-d4", "difficile", "EBIT needed for ROIC to equal the required return?",
        [["Blended required return", pc(req)], ["Average invested capital", usd(ic)], ["Tax rate", pc(t)]],
        a, "$", 0,
        [`NOPAT exigé = ${P(req)} × ${F(ic)} = ${D(req * ic)}.`, `EBIT = ${F(req * ic)} / (1 − ${P(t)}) = ${D(a, 0)}.`]);
    })(),
    (() => {
      const ebit = 600, t = 0.25, ic = 4000, wd = 0.4, rd = 0.07, re = 0.11;
      const roic = nopat(ebit, t) / ic, w = wacc(wd, rd, t, 1 - wd, re);
      const a = (roic - w) * 100;
      return q("ci-roic-d5", "difficile", "Spread between ROIC and WACC (percentage points)?",
        [["EBIT", usd(ebit)], ["Tax rate", pc(t)], ["Average invested capital", usd(ic)], ["Target weights: debt / equity", lst([pc(wd), pc(1 - wd)])],
          ["Pretax cost of debt / cost of equity", lst([pc(rd), pc(re)])]],
        a, "%", 2,
        [`ROIC = ${F(ebit)} × ${F(1 - t)} / ${F(ic)} = ${P(roic, 2)}.`,
          `WACC = ${F(wd)} × ${P(rd)} × ${F(1 - t)} + ${F(1 - wd)} × ${P(re)} = ${P(w, 2)}.`,
          `Écart = ${P(roic, 2)} − ${P(w, 2)} = ${Pa(a)} : création de valeur.`]);
    })(),
  ],
};

/* ────────────────────────── 11 · WACC ────────────────────────── */

const WACC: CalcType = {
  key: "wacc",
  topic: "corporate",
  name: "Coût moyen pondéré du capital (WACC)",
  tier: "essentiel",
  top: true,
  source: "LM 6 · Capital Structure",
  formulas: [
    "WACC = w_d × r_d × (1 − t) + w_p × r_p + w_e × r_e",
    "Coût de la dette après impôt = r_d × (1 − t) : seuls les intérêts sont déductibles",
    "Poids : structure cible ; à défaut, valeurs de marché actuelles (D / (D + E))",
    "Depuis un ratio D/E : w_d = (D/E) / (1 + D/E)",
  ],
  traps: [
    "Valeurs de marché plutôt que valeurs comptables quand les deux sont données.",
    "Le coût de la dette est le rendement exigé (YTM), pas le coupon.",
    "Structure cible annoncée > structure actuelle.",
  ],
  questions: [
    (() => {
      const wd = 0.4, rd = 0.06, re = 0.12, t = 0.25;
      const a = wacc(wd, rd, t, 1 - wd, re) * 100;
      return q("ci-wacc-f1", "facile", "Weighted-average cost of capital?",
        [["Capital structure: debt / equity", lst([pc(wd), pc(1 - wd)])], ["Pretax cost of debt", pc(rd)], ["Cost of equity", pc(re)], ["Tax rate", pc(t)]],
        a, "%", 2,
        [`WACC = ${F(wd)} × ${P(rd)} × (1 − ${P(t)}) + ${F(1 - wd)} × ${P(re)}.`,
          `= ${P(wd * rd * (1 - t), 2)} + ${P((1 - wd) * re, 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const wd = 0.3, rd = 0.05, re = 0.1, t = 0.2;
      const a = wacc(wd, rd, t, 1 - wd, re) * 100;
      return q("ci-wacc-f2", "facile", "WACC?",
        [["Debt weight", pc(wd)], ["Interest rate on debt", pc(rd)], ["Cost of equity", pc(re)], ["Corporate tax rate", pc(t)]],
        a, "%", 2,
        [`Poids des fonds propres = 1 − ${P(wd)} = ${P(1 - wd)}.`,
          `WACC = ${F(wd)} × ${P(rd)} × ${F(1 - t)} + ${F(1 - wd)} × ${P(re)} = ${P(wd * rd * (1 - t), 2)} + ${P((1 - wd) * re, 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const rd = 0.08, t = 0.21;
      const a = rd * (1 - t) * 100;
      return q("ci-wacc-f3", "facile", "After-tax cost of debt?",
        [["Pretax cost of debt (yield to maturity)", pc(rd)], ["Marginal tax rate", pc(t)]],
        a, "%", 2,
        ["Les intérêts sont déductibles : r_d après impôt = r_d × (1 − t).", `= ${P(rd)} × (1 − ${P(t)}) = ${Pa(a)}.`]);
    })(),
    (() => {
      const dv = 25, ev = 75, rd = 0.06, re = 0.11, t = 0.25;
      const wd = dv / (dv + ev);
      const a = wacc(wd, rd, t, 1 - wd, re) * 100;
      return q("ci-wacc-f4", "facile", "WACC using market value weights?",
        [["Market value of debt ($ millions)", E(dv)], ["Market value of equity ($ millions)", E(ev)], ["Pretax cost of debt", pc(rd)], ["Cost of equity", pc(re)], ["Tax rate", pc(t)]],
        a, "%", 2,
        [`w_d = ${F(dv)} / ${F(dv + ev)} = ${P(wd)} ; w_e = ${P(1 - wd)}.`,
          `WACC = ${F(wd)} × ${P(rd)} × ${F(1 - t)} + ${F(1 - wd)} × ${P(re)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const debt = 12, eq = 28, rd = 0.07, re = 0.13, t = 0.3;
      const wd = debt / (debt + eq);
      const a = wacc(wd, rd, t, 1 - wd, re) * 100;
      return q("ci-wacc-f5", "facile", "Cost of capital to use for the project's NPV? (Financing mix = target capital structure.)",
        [["Project financing: debt / equity ($ millions)", lst([E(debt), E(eq)])], ["Before-tax cost of debt", pc(rd)], ["Cost of equity", pc(re)], ["Tax rate", pc(t)]],
        a, "%", 2,
        [`w_d = ${F(debt)} / ${F(debt + eq)} = ${P(wd)} ; w_e = ${P(1 - wd)}.`,
          `WACC = ${F(wd)} × ${P(rd)} × ${F(1 - t)} + ${F(1 - wd)} × ${P(re)} = ${P(wd * rd * (1 - t), 2)} + ${P((1 - wd) * re, 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const wd = 0.3, wp = 0.1, we = 0.6, rd = 0.06, rp = 0.07, re = 0.12, t = 0.25;
      const a = wacc(wd, rd, t, we, re, wp, rp) * 100;
      return q("ci-wacc-m1", "moyen", "WACC including preferred stock?",
        [["Target weights: debt / preferred / common equity", lst([pc(wd), pc(wp), pc(we)])], ["Pretax cost of debt", pc(rd)], ["Cost of preferred stock", pc(rp)],
          ["Cost of common equity", pc(re)], ["Tax rate", pc(t)]],
        a, "%", 2,
        ["Les dividendes privilégiés ne sont pas déductibles : seul r_d est ajusté de l'impôt.",
          `WACC = ${F(wd)} × ${P(rd)} × ${F(1 - t)} + ${F(wp)} × ${P(rp)} + ${F(we)} × ${P(re)}.`,
          `= ${P(wd * rd * (1 - t), 2)} + ${P(wp * rp, 2)} + ${P(we * re, 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const de = 0.5, rd = 0.08, re = 0.13, t = 0.3;
      const wd = dvFromDe(de);
      const a = wacc(wd, rd, t, 1 - wd, re) * 100;
      return q("ci-wacc-m2", "moyen", "WACC?",
        [["Target debt-to-equity ratio", E(de)], ["Pretax cost of debt", pc(rd)], ["Cost of equity", pc(re)], ["Tax rate", pc(t)]],
        a, "%", 2,
        [`D/E = ${F(de)} : w_d = ${F(de)} / ${F(1 + de)} = ${F(wd, 4)} ; w_e = ${F(1 - wd, 4)}.`,
          `WACC = ${F(wd, 4)} × ${P(rd)} × ${F(1 - t)} + ${F(1 - wd, 4)} × ${P(re)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const shares = 20, price = 45, debt = 300, rd = 0.06, re = 0.1, t = 0.2;
      const eq = shares * price, wd = debt / (debt + eq);
      const a = wacc(wd, rd, t, 1 - wd, re) * 100;
      return q("ci-wacc-m3", "moyen", "WACC based on market values?",
        [["Shares outstanding (millions) / share price", lst([E(shares), usd(price, 2)])], ["Market value of debt ($ millions)", E(debt)], ["Yield on the company's bonds", pc(rd)],
          ["Cost of equity", pc(re)], ["Tax rate", pc(t)]],
        a, "%", 2,
        [`Capitalisation = ${F(shares)} × ${F(price)} = ${M(eq)} ; w_d = ${F(debt)} / ${F(debt + eq)} = ${P(wd)}.`,
          `WACC = ${F(wd)} × ${P(rd)} × ${F(1 - t)} + ${F(1 - wd)} × ${P(re)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const w = 0.09, wd = 0.4, rd = 0.06, t = 0.25;
      const a = ((w - wd * rd * (1 - t)) / (1 - wd)) * 100;
      return q("ci-wacc-m4", "moyen", "Cost of equity implied by the WACC?",
        [["WACC", pc(w)], ["Debt weight", pc(wd)], ["Pretax cost of debt", pc(rd)], ["Tax rate", pc(t)]],
        a, "%", 2,
        [`Part de la dette = ${F(wd)} × ${P(rd)} × ${F(1 - t)} = ${P(wd * rd * (1 - t), 2)}.`,
          `r_e = (${P(w)} − ${P(wd * rd * (1 - t), 2)}) / ${F(1 - wd)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const wd = 0.4, rd = 0.07, re = 0.12, t0 = 0.3, t1 = 0.21;
      const a = wacc(wd, rd, t1, 1 - wd, re) * 100;
      return q("ci-wacc-m5", "moyen", "WACC after the cut in the corporate tax rate? (Other inputs unchanged.)",
        [["Debt / equity weights", lst([pc(wd), pc(1 - wd)])], ["Pretax cost of debt / cost of equity", lst([pc(rd), pc(re)])], ["Tax rate", `${pc(t0)} → ${pc(t1)}`]],
        a, "%", 2,
        [`Avant : ${F(wd)} × ${P(rd)} × ${F(1 - t0)} + ${F(1 - wd)} × ${P(re)} = ${P(wacc(wd, rd, t0, 1 - wd, re), 2)}.`,
          `Après : ${F(wd)} × ${P(rd)} × ${F(1 - t1)} + ${F(1 - wd)} × ${P(re)} = ${Pa(a)} : moins d'économie d'impôt, WACC plus élevé.`]);
    })(),
    (() => {
      const bookD = 400, bookE = 600, mvD = 420, shares = 50, price = 31.6, rd = 0.07, re = 0.11, t = 0.25;
      const mvE = shares * price, wd = mvD / (mvD + mvE);
      const a = wacc(wd, rd, t, 1 - wd, re) * 100;
      return q("ci-wacc-d1", "difficile", "WACC for an external analyst estimating the current opportunity cost of capital?",
        [["Book value: debt / equity ($ millions)", lst([E(bookD), E(bookE)])], ["Market value of debt ($ millions)", E(mvD)], ["Shares (millions) / share price", lst([E(shares), usd(price, 2)])],
          ["Pretax cost of debt / cost of equity", lst([pc(rd), pc(re)])], ["Tax rate", pc(t)]],
        a, "%", 2,
        ["Coût d'opportunité actuel → poids en valeurs de marché ; les valeurs comptables sont la donnée-piège.",
          `Capitalisation = ${F(shares)} × ${F(price)} = ${M(mvE)} ; w_d = ${F(mvD)} / ${F(mvD + mvE)} = ${P(wd)}.`,
          `WACC = ${F(wd)} × ${P(rd)} × ${F(1 - t)} + ${F(1 - wd)} × ${P(re)} = ${Pa(a)} (en valeurs comptables : ${P(wacc(bookD / (bookD + bookE), rd, t, bookE / (bookD + bookE), re), 2)}).`]);
    })(),
    (() => {
      const coupon = 0.05, ytm = 0.072, t = 0.25, rf = 0.03, beta = 1.2, mrp = 0.06, wd = 0.35;
      const re = rf + beta * mrp;
      const a = wacc(wd, ytm, t, 1 - wd, re) * 100;
      return q("ci-wacc-d2", "difficile", "WACC? (Cost of equity from the CAPM.)",
        [["Coupon rate / yield to maturity on the company's bonds", lst([pc(coupon), pc(ytm, 1)])], ["Tax rate", pc(t)],
          ["Risk-free rate / equity beta / market risk premium", lst([pc(rf), E(beta), pc(mrp)])], ["Target weights: debt / equity", lst([pc(wd), pc(1 - wd)])]],
        a, "%", 2,
        [`Coût de la dette = YTM ${P(ytm, 1)} (le coupon est historique) ; après impôt = ${P(ytm * (1 - t), 2)}.`,
          `r_e (CAPM) = ${P(rf)} + ${F(beta)} × ${P(mrp)} = ${P(re, 1)}.`,
          `WACC = ${F(wd)} × ${P(ytm * (1 - t), 2)} + ${F(1 - wd)} × ${P(re, 1)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const bonds = 50, prefN = 1, prefP = 25, comN = 10, comP = 17.5, rd = 0.066, rp = 0.07, re = 0.115, t = 0.25;
      const pref = prefN * prefP, com = comN * comP, tot = bonds + pref + com;
      const a = wacc(bonds / tot, rd, t, com / tot, re, pref / tot, rp) * 100;
      return q("ci-wacc-d3", "difficile", "WACC using market value weights?",
        [["Market value of bonds ($ millions)", E(bonds)], ["Preferred shares (millions) / price", lst([E(prefN), usd(prefP, 2)])], ["Common shares (millions) / price", lst([E(comN), usd(comP, 2)])],
          ["Pretax cost of debt / cost of preferred / cost of equity", lst([pc(rd, 1), pc(rp), pc(re, 1)])], ["Tax rate", pc(t)]],
        a, "%", 2,
        [`Valeurs : dette ${M(bonds)}, privilégiées ${M(pref)}, ordinaires ${F(comN)} × ${F(comP)} = ${M(com)} ; total ${M(tot)}.`,
          `Poids : ${P(bonds / tot)} / ${P(pref / tot)} / ${P(com / tot)}.`,
          `WACC = ${F(bonds / tot)} × ${P(rd, 1)} × ${F(1 - t)} + ${F(pref / tot)} × ${P(rp)} + ${F(com / tot)} × ${P(re, 1)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const deNow = 0.25, wdT = 0.4, rd = 0.06, re = 0.12, t = 0.3;
      const a = wacc(wdT, rd, t, 1 - wdT, re) * 100;
      return q("ci-wacc-d4", "difficile", "WACC to use for new projects?",
        [["Current debt-to-equity ratio", E(deNow)], ["Management's target debt / total capital", pc(wdT)], ["Pretax cost of debt / cost of equity", lst([pc(rd), pc(re)])], ["Tax rate", pc(t)]],
        a, "%", 2,
        [`Les projets se financent sur la structure cible (${P(wdT)} de dette), pas sur la structure actuelle (w_d = ${P(dvFromDe(deNow))}).`,
          `WACC = ${F(wdT)} × ${P(rd)} × ${F(1 - t)} + ${F(1 - wdT)} × ${P(re)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const w = 0.084, wd = 0.3, re = 0.105, t = 0.25;
      const a = ((w - (1 - wd) * re) / (wd * (1 - t))) * 100;
      return q("ci-wacc-d5", "difficile", "Pretax cost of debt implied by the WACC?",
        [["WACC", pc(w, 1)], ["Debt weight", pc(wd)], ["Cost of equity", pc(re, 1)], ["Tax rate", pc(t)]],
        a, "%", 2,
        [`Part des fonds propres = ${F(1 - wd)} × ${P(re, 1)} = ${P((1 - wd) * re, 2)}.`,
          `${P(w, 1)} − ${P((1 - wd) * re, 2)} = ${F(wd)} × r_d × ${F(1 - t)}, soit r_d = ${P(w - (1 - wd) * re, 2)} / ${F(wd * (1 - t), 3)}.`,
          `r_d = ${Pa(a)} avant impôt.`]);
    })(),
  ],
};

/* ────────────────────────── 12 · MM : coût des fonds propres ────────────────────────── */

const MM_RE: CalcType = {
  key: "mm-cost-of-equity",
  topic: "corporate",
  name: "Modigliani-Miller : coût des fonds propres (proposition II)",
  tier: "essentiel",
  source: "LM 6 · Capital Structure",
  formulas: [
    "MM II sans impôt : r_e = r_0 + (r_0 − r_d) × D/E",
    "MM II avec impôt : r_e = r_0 + (r_0 − r_d) × (1 − t) × D/E",
    "Sans impôt, le WACC reste égal à r_0 quel que soit D/E ; avec impôt, il baisse quand D/E monte",
    "r_0 = coût du capital de la firme sans dette (unlevered) ; D/E = (D/V) / (1 − D/V)",
  ],
  traps: [
    "La formule prend D/E, pas D/V : convertir si l'énoncé donne la part de dette.",
    "Avec impôt, la pente est multipliée par (1 − t).",
  ],
  questions: [
    (() => {
      const r0 = 0.1, rd = 0.06, de = 0.5;
      const a = mmRe(r0, rd, de) * 100;
      return q("ci-mmre-f1", "facile", "Cost of equity under MM Proposition II (no taxes)?",
        [["Unlevered cost of capital (r0)", pc(r0)], ["Cost of debt", pc(rd)], ["Debt-to-equity ratio", E(de)]],
        a, "%", 2,
        ["r_e = r_0 + (r_0 − r_d) × D/E.", `= ${P(r0)} + (${P(r0)} − ${P(rd)}) × ${F(de)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const r0 = 0.12, rd = 0.07, de = 1, t = 0.3;
      const a = mmRe(r0, rd, de, t) * 100;
      return q("ci-mmre-f2", "facile", "Cost of equity under MM Proposition II with taxes?",
        [["Unlevered cost of capital", pc(r0)], ["Cost of debt", pc(rd)], ["Debt-to-equity ratio", E(de)], ["Tax rate", pc(t)]],
        a, "%", 2,
        ["r_e = r_0 + (r_0 − r_d) × (1 − t) × D/E.", `= ${P(r0)} + ${P(r0 - rd)} × ${F(1 - t)} × ${F(de)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const r0 = 0.11, rd = 0.05, de = 0.25;
      const a = mmRe(r0, rd, de) * 100;
      return q("ci-mmre-f3", "facile", "Cost of equity (MM, no taxes)?",
        [["Cost of capital of the all-equity firm", pc(r0)], ["Cost of debt", pc(rd)], ["Debt / equity", E(de)]],
        a, "%", 2,
        [`r_e = ${P(r0)} + (${P(r0)} − ${P(rd)}) × ${F(de)} = ${P(r0)} + ${P((r0 - rd) * de, 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const r0 = 0.1, rd = 0.06, de = 0.6, t = 0.25;
      const a = mmRe(r0, rd, de, t) * 100;
      return q("ci-mmre-f4", "facile", "Cost of equity (MM with taxes)?",
        [["Unlevered cost of capital", pc(r0)], ["Cost of debt", pc(rd)], ["Debt-to-equity ratio", E(de)], ["Tax rate", pc(t)]],
        a, "%", 2,
        [`r_e = ${P(r0)} + (${P(r0)} − ${P(rd)}) × (1 − ${P(t)}) × ${F(de)}.`, `= ${P(r0)} + ${P((r0 - rd) * (1 - t) * de, 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const r0 = 0.08, rd = 0.04, de = 1.5;
      const a = mmRe(r0, rd, de) * 100;
      return q("ci-mmre-f5", "facile", "Cost of equity under MM Proposition II (no taxes)?",
        [["Unlevered cost of capital", pc(r0)], ["Cost of debt", pc(rd)], ["Debt-to-equity ratio", E(de)]],
        a, "%", 2,
        [`r_e = ${P(r0)} + (${P(r0)} − ${P(rd)}) × ${F(de)} = ${P(r0)} + ${P((r0 - rd) * de)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const dv = 0.4, r0 = 0.1, rd = 0.06;
      const de = deFromDv(dv);
      const a = mmRe(r0, rd, de) * 100;
      return q("ci-mmre-m1", "moyen", "Cost of equity under MM Proposition II (no taxes)?",
        [["Debt / total capital", pc(dv)], ["Unlevered cost of capital", pc(r0)], ["Cost of debt", pc(rd)]],
        a, "%", 2,
        [`D/E = ${F(dv)} / ${F(1 - dv)} = ${F(de, 4)}.`, `r_e = ${P(r0)} + (${P(r0)} − ${P(rd)}) × ${F(de, 4)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const r0 = 0.1, rd = 0.06, de0 = 0.5, de1 = 1;
      const a = (mmRe(r0, rd, de1) - mmRe(r0, rd, de0)) * 100;
      return q("ci-mmre-m2", "moyen", "Increase in the cost of equity (percentage points) after the recapitalization? (MM, no taxes.)",
        [["Unlevered cost of capital", pc(r0)], ["Cost of debt (unchanged)", pc(rd)], ["Debt-to-equity ratio", `${E(de0)} → ${E(de1)}`]],
        a, "%", 2,
        [`Avant : ${P(r0)} + ${P(r0 - rd)} × ${F(de0)} = ${P(mmRe(r0, rd, de0))} ; après : ${P(r0)} + ${P(r0 - rd)} × ${F(de1)} = ${P(mmRe(r0, rd, de1))}.`,
          `Hausse = ${Pa(a)} ; le WACC reste ${P(r0)} : la dette moins chère est exactement compensée.`]);
    })(),
    (() => {
      const re = 0.15, rd = 0.05, de = 1;
      const a = ((re + rd * de) / (1 + de)) * 100;
      return q("ci-mmre-m3", "moyen", "Unlevered cost of capital (r0) implied by the levered firm? (MM, no taxes.)",
        [["Cost of equity of the levered firm", pc(re)], ["Cost of debt", pc(rd)], ["Debt-to-equity ratio", E(de)]],
        a, "%", 2,
        [`${P(re)} = r_0 + (r_0 − ${P(rd)}) × ${F(de)}, soit r_0 × ${F(1 + de)} = ${P(re)} + ${P(rd * de)}.`,
          `r_0 = ${P(re + rd * de)} / ${F(1 + de)} = ${Pa(a)} (c'est aussi le WACC sans impôt).`]);
    })(),
    (() => {
      const r0 = 0.1, rd = 0.06, de = 1, t = 0.3;
      const re = mmRe(r0, rd, de, t), wd = dvFromDe(de);
      const a = wacc(wd, rd, t, 1 - wd, re) * 100;
      return q("ci-mmre-m4", "moyen", "WACC under MM with taxes?",
        [["Unlevered cost of capital", pc(r0)], ["Cost of debt", pc(rd)], ["Debt-to-equity ratio", E(de)], ["Tax rate", pc(t)]],
        a, "%", 2,
        [`r_e = ${P(r0)} + ${P(r0 - rd)} × ${F(1 - t)} × ${F(de)} = ${P(re, 2)}.`, `w_d = w_e = ${P(wd)}.`,
          `WACC = ${F(wd)} × ${P(rd)} × ${F(1 - t)} + ${F(1 - wd)} × ${P(re, 2)} = ${Pa(a)} < r_0 : l'économie d'impôt fait baisser le WACC.`]);
    })(),
    (() => {
      const dv = 0.3, r0 = 0.11, rd = 0.05, t = 0.25;
      const de = deFromDv(dv);
      const a = mmRe(r0, rd, de, t) * 100;
      return q("ci-mmre-m5", "moyen", "Cost of equity (MM with taxes)?",
        [["Debt / total capital", pc(dv)], ["Unlevered cost of capital", pc(r0)], ["Cost of debt", pc(rd)], ["Tax rate", pc(t)]],
        a, "%", 2,
        [`D/E = ${F(dv)} / ${F(1 - dv)} = ${F(de, 4)}.`, `r_e = ${P(r0)} + ${P(r0 - rd)} × ${F(1 - t)} × ${F(de, 4)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const r0 = 0.09, rd = 0.05, de = 0.75, t = 0.21;
      const re = mmRe(r0, rd, de, t), wd = dvFromDe(de);
      const a = wacc(wd, rd, t, 1 - wd, re) * 100;
      return q("ci-mmre-d1", "difficile", "WACC after the recapitalization? (MM with taxes.)",
        [["Cost of capital before the recapitalization (all equity)", pc(r0)], ["New debt-to-equity ratio", E(de)], ["Cost of debt", pc(rd)], ["Tax rate", pc(t)]],
        a, "%", 2,
        [`r_e = ${P(r0)} + ${P(r0 - rd)} × ${F(1 - t)} × ${F(de)} = ${P(re, 2)}.`,
          `w_d = ${F(de)} / ${F(1 + de)} = ${F(wd, 4)} ; w_e = ${F(1 - wd, 4)}.`,
          `WACC = ${F(wd, 4)} × ${P(rd)} × ${F(1 - t)} + ${F(1 - wd, 4)} × ${P(re, 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const r0 = 0.1, rd = 0.06, t = 0.25, target = 0.13;
      const a = (target - r0) / ((r0 - rd) * (1 - t));
      return q("ci-mmre-d2", "difficile", "Debt-to-equity ratio at which the cost of equity reaches the target? (MM with taxes.)",
        [["Unlevered cost of capital", pc(r0)], ["Cost of debt", pc(rd)], ["Tax rate", pc(t)], ["Cost of equity reached", pc(target)]],
        a, "x", 2,
        [`${P(target)} = ${P(r0)} + ${P(r0 - rd)} × ${F(1 - t)} × D/E.`, `D/E = ${P(target - r0)} / ${P((r0 - rd) * (1 - t))} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const re = 0.14, rd = 0.06, de = 0.8, t = 0.25;
      const k = (1 - t) * de;
      const a = ((re + rd * k) / (1 + k)) * 100;
      return q("ci-mmre-d3", "difficile", "Unlevered cost of capital (r0) implied by the levered firm? (MM with taxes.)",
        [["Cost of equity", pc(re)], ["Cost of debt", pc(rd)], ["Debt-to-equity ratio", E(de)], ["Tax rate", pc(t)]],
        a, "%", 2,
        [`(1 − t) × D/E = ${F(1 - t)} × ${F(de)} = ${F(k)}.`,
          `${P(re)} = r_0 + (r_0 − ${P(rd)}) × ${F(k)} ⇒ r_0 × ${F(1 + k)} = ${P(re)} + ${P(rd * k, 2)}.`,
          `r_0 = ${P(re + rd * k, 2)} / ${F(1 + k)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const r0 = 0.12, rd = 0.07, de = 1.2, t = 0.3;
      const a = (mmRe(r0, rd, de) - mmRe(r0, rd, de, t)) * 100;
      return q("ci-mmre-d4", "difficile", "How much lower (percentage points) is the cost of equity with taxes than without?",
        [["Unlevered cost of capital", pc(r0)], ["Cost of debt", pc(rd)], ["Debt-to-equity ratio", E(de)], ["Tax rate", pc(t)]],
        a, "%", 2,
        [`Sans impôt : ${P(r0)} + ${P(r0 - rd)} × ${F(de)} = ${P(mmRe(r0, rd, de))}.`,
          `Avec impôt : ${P(r0)} + ${P(r0 - rd)} × ${F(1 - t)} × ${F(de)} = ${P(mmRe(r0, rd, de, t))}.`,
          `Écart = ${Pa(a)} = ${P(r0 - rd)} × ${P(t)} × ${F(de)}.`]);
    })(),
    (() => {
      const debt = 400, shares = 30, price = 20, bookE = 350, r0 = 0.1, rd = 0.055, t = 0.25;
      const eq = shares * price, de = debt / eq;
      const a = mmRe(r0, rd, de, t) * 100;
      return q("ci-mmre-d5", "difficile", "Cost of equity (MM with taxes), using market values?",
        [["Market value of debt ($ millions)", E(debt)], ["Shares (millions) / share price", lst([E(shares), usd(price, 2)])], ["Book value of equity ($ millions)", E(bookE)],
          ["Unlevered cost of capital / cost of debt", lst([pc(r0), pc(rd, 1)])], ["Tax rate", pc(t)]],
        a, "%", 2,
        [`Fonds propres en valeur de marché = ${F(shares)} × ${F(price)} = ${M(eq)} (la valeur comptable est la donnée-piège).`,
          `D/E = ${F(debt)} / ${F(eq)} = ${F(de, 4)}.`,
          `r_e = ${P(r0)} + ${P(r0 - rd, 1)} × ${F(1 - t)} × ${F(de, 4)} = ${Pa(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 13 · MM : valeur de la firme et static trade-off ────────────────────────── */

const MM_VALUE: CalcType = {
  key: "mm-firm-value",
  topic: "corporate",
  name: "Modigliani-Miller : valeur de la firme et static trade-off",
  tier: "essentiel",
  source: "LM 6 · Capital Structure",
  formulas: [
    "MM I sans impôt : V_L = V_U (la structure du capital ne change pas la valeur)",
    "MM I avec impôt : V_L = V_U + t × D (valeur de l'économie d'impôt, debt tax shield)",
    "Static trade-off : V_L = V_U + t × D − PV(coûts de détresse financière)",
    "Valeur des fonds propres = V_L − D ; structure optimale = V_L maximale (WACC minimal)",
  ],
  traps: [
    "Sans impôt, s'endetter pour racheter des actions ne change ni la valeur de la firme ni le cours.",
    "Avec impôt, le gain t × D revient aux actionnaires existants.",
  ],
  questions: [
    (() => {
      const vu = 500, t = 0.25, d = 200;
      const a = vu + t * d;
      return q("ci-mmv-f1", "facile", "Value of the levered firm under MM with taxes ($ millions)?",
        [["Value of the unlevered firm ($ millions)", E(vu)], ["Debt ($ millions)", E(d)], ["Tax rate", pc(t)]],
        a, "$", 0,
        ["V_L = V_U + t × D.", `= ${F(vu)} + ${F(t)} × ${F(d)} = ${M(a)}.`]);
    })(),
    (() => {
      const t = 0.3, d = 150;
      const a = t * d;
      return q("ci-mmv-f2", "facile", "Value of the debt tax shield ($ millions)?",
        [["Debt outstanding ($ millions, permanent)", E(d)], ["Corporate tax rate", pc(t)]],
        a, "$", 0,
        ["Valeur de l'économie d'impôt = t × D.", `= ${F(t)} × ${F(d)} = ${M(a)}.`]);
    })(),
    (() => {
      const vu = 800, d = 300;
      const a = vu - d;
      return q("ci-mmv-f3", "facile", "Value of equity after the firm issues debt? (MM, no taxes, $ millions.)",
        [["Value of the firm when all equity ($ millions)", E(vu)], ["Debt issued to repurchase shares ($ millions)", E(d)]],
        a, "$", 0,
        [`Sans impôt : V_L = V_U = ${M(vu)}.`, `Fonds propres = ${F(vu)} − ${F(d)} = ${M(a)}.`]);
    })(),
    (() => {
      const vu = 1000, t = 0.21, d = 400, dist = 50;
      const a = vu + t * d - dist;
      return q("ci-mmv-f4", "facile", "Value of the levered firm under the static trade-off theory ($ millions)?",
        [["Value of the unlevered firm ($ millions)", E(vu)], ["Debt ($ millions)", E(d)], ["Tax rate", pc(t)], ["PV of expected costs of financial distress ($ millions)", E(dist)]],
        a, "$", 0,
        ["V_L = V_U + t × D − PV(coûts de détresse).", `= ${F(vu)} + ${F(t * d)} − ${F(dist)} = ${M(a)}.`]);
    })(),
    (() => {
      const vu = 600, t = 0.25, d = 240;
      const vl = vu + t * d;
      const a = vl - d;
      return q("ci-mmv-f5", "facile", "Value of equity of the levered firm (MM with taxes, $ millions)?",
        [["Value of the unlevered firm ($ millions)", E(vu)], ["Debt ($ millions)", E(d)], ["Tax rate", pc(t)]],
        a, "$", 0,
        [`V_L = ${F(vu)} + ${F(t)} × ${F(d)} = ${M(vl)}.`, `Fonds propres = ${F(vl)} − ${F(d)} = ${M(a)}.`]);
    })(),
    (() => {
      const vu = 1200, d = 500, t = 0.25;
      const vl = vu + t * d;
      const a = vl - d;
      return q("ci-mmv-m1", "moyen", "Market value of equity after the debt-financed buyback (MM with taxes, $ millions)?",
        [["Value of the all-equity firm ($ millions)", E(vu)], ["Debt issued to repurchase shares ($ millions)", E(d)], ["Tax rate", pc(t)]],
        a, "$", 0,
        [`V_L = ${F(vu)} + ${F(t)} × ${F(d)} = ${M(vl)}.`, `Fonds propres = ${F(vl)} − ${F(d)} = ${M(a)} (contre ${M(vu - d)} sans économie d'impôt).`]);
    })(),
    (() => {
      const vu = 2000, n = 100, d = 600, t = 0.3;
      const vl = vu + t * d;
      const a = vl / n;
      return q("ci-mmv-m2", "moyen", "Share price once the debt issue is announced, before the buyback? (MM with taxes.)",
        [["Value of the all-equity firm ($ millions)", E(vu)], ["Shares outstanding (millions)", E(n)], ["Debt to be issued for a share buyback ($ millions)", E(d)], ["Tax rate", pc(t)]],
        a, "$", 2,
        [`L'économie d'impôt t × D = ${F(t)} × ${F(d)} = ${M(t * d)} revient aux actionnaires actuels.`,
          `V_L = ${M(vl)} ; avant le rachat, les fonds propres valent toute la firme (l'argent de la dette est encore en caisse).`,
          `Cours = ${F(vl)} / ${F(n)} = ${D(a, 2)} (contre ${D(vu / n, 2)}).`]);
    })(),
    (() => {
      const vu = 1000, t = 0.25, ds = [200, 400, 600], dist = [5, 30, 90];
      const vals = ds.map((d, i) => vu + t * d - dist[i]);
      const a = Math.max(...vals);
      return q("ci-mmv-m3", "moyen", "Highest firm value among the three debt levels (static trade-off, $ millions)?",
        [["Value of the unlevered firm ($ millions)", E(vu)], ["Tax rate", pc(t)], ["Debt levels ($ millions)", lst(ds.map((x) => E(x)))],
          ["PV of costs of financial distress at each level ($ millions)", lst(dist.map((x) => E(x)))]],
        a, "$", 0,
        [...ds.map((d, i) => `D = ${F(d)} : ${F(vu)} + ${F(t * d)} − ${F(dist[i])} = ${M(vals[i])}.`),
          `Maximum = ${M(a)} : au-delà, la hausse des coûts de détresse dépasse le gain fiscal.`]);
    })(),
    (() => {
      const d0 = 300, d1 = 500, t = 0.21, p0 = 10, p1 = 35;
      const a = t * (d1 - d0) - (p1 - p0);
      return q("ci-mmv-m4", "moyen", "Change in firm value from raising debt ($ millions)? (Negative if a fall.)",
        [["Debt ($ millions)", `${E(d0)} → ${E(d1)}`], ["Tax rate", pc(t)], ["PV of costs of financial distress ($ millions)", `${E(p0)} → ${E(p1)}`]],
        a, "$", 0,
        [`Gain fiscal = ${F(t)} × (${F(d1)} − ${F(d0)}) = ${M(t * (d1 - d0))}.`, `Hausse des coûts de détresse = ${M(p1 - p0)}.`, `Variation = ${M(a)}.`]);
    })(),
    (() => {
      const vl = 1150, d = 500, t = 0.3;
      const a = vl - t * d;
      return q("ci-mmv-m5", "moyen", "Value of the firm if it had no debt (MM with taxes, $ millions)?",
        [["Value of the levered firm ($ millions)", E(vl)], ["Debt ($ millions)", E(d)], ["Tax rate", pc(t)]],
        a, "$", 0,
        [`V_U = V_L − t × D = ${F(vl)} − ${F(t)} × ${F(d)}.`, `= ${F(vl)} − ${F(t * d)} = ${M(a)}.`]);
    })(),
    (() => {
      const vu = 2000, t = 0.25, ds = [0, 250, 500, 750, 1000], dist = [0, 10, 45, 110, 220];
      const vals = ds.map((d, i) => vu + t * d - dist[i]);
      const best = vals.indexOf(Math.max(...vals));
      const a = ds[best];
      return q("ci-mmv-d1", "difficile", "Optimal amount of debt under the static trade-off theory ($ millions)?",
        [["Value of the unlevered firm ($ millions)", E(vu)], ["Tax rate", pc(t)], ["Debt levels considered ($ millions)", lst(ds.map((x) => E(x)))],
          ["PV of costs of financial distress ($ millions)", lst(dist.map((x) => E(x)))]],
        a, "$", 0,
        [`V_L = ${F(vu)} + ${F(t)} × D − PV(détresse) : ${ds.map((d, i) => `${F(d)} → ${F(vals[i], 1)}`).join(" ; ")}.`,
          `Valeur maximale ${M(vals[best], 1)} pour D = ${M(a)} : c'est la structure optimale (WACC minimal).`]);
    })(),
    (() => {
      const interest = 40, rd = 0.08, t = 0.25;
      const a = (t * interest) / rd;
      return q("ci-mmv-d2", "difficile", "Present value of the tax shield on the perpetual debt ($ millions)?",
        [["Annual interest on perpetual debt ($ millions)", E(interest)], ["Cost of debt", pc(rd)], ["Tax rate", pc(t)]],
        a, "$", 0,
        [`Économie d'impôt annuelle = ${F(t)} × ${F(interest)} = ${M(t * interest)}, perpétuelle et actualisée au coût de la dette.`,
          `PV = ${F(t * interest)} / ${F(rd)} = ${M(a)}.`, `Vérification : dette = ${F(interest)} / ${F(rd)} = ${M(interest / rd)} et t × D = ${M(t * (interest / rd))}.`]);
    })(),
    (() => {
      const vu = 900, n0 = 45, d = 300;
      const price = vu / n0, bought = d / price;
      const a = n0 - bought;
      return q("ci-mmv-d3", "difficile", "Shares outstanding after the debt-financed buyback (millions)? (MM, no taxes.)",
        [["Value of the all-equity firm ($ millions)", E(vu)], ["Shares outstanding (millions)", E(n0)], ["Debt issued to repurchase shares ($ millions)", E(d)]],
        a, "", 0,
        [`Sans impôt, la valeur ne bouge pas : cours = ${F(vu)} / ${F(n0)} = ${D(price, 2)}, avant comme après.`,
          `Actions rachetées = ${F(d)} / ${F(price)} = ${F(bought)} millions.`,
          `Restent ${F(a)} millions d'actions (fonds propres ${M(vu - d)} / ${F(a)} = ${D((vu - d) / a, 2)} par action).`]);
    })(),
    (() => {
      const vu = 1500, n = 75, d = 600, t = 0.25, dist = 30;
      const vl = vu + t * d - dist;
      const a = vl / n;
      return q("ci-mmv-d4", "difficile", "Share price once the recapitalization is announced (static trade-off)?",
        [["Value of the all-equity firm ($ millions)", E(vu)], ["Shares outstanding (millions)", E(n)], ["Debt to be issued for a buyback ($ millions)", E(d)],
          ["Tax rate", pc(t)], ["PV of expected costs of financial distress ($ millions)", E(dist)]],
        a, "$", 2,
        [`V_L = ${F(vu)} + ${F(t)} × ${F(d)} − ${F(dist)} = ${M(vl)}.`, `Le gain net (${M(t * d - dist)}) revient aux actionnaires actuels.`,
          `Cours = ${F(vl)} / ${F(n)} = ${D(a, 2)} (contre ${D(vu / n, 2)}).`]);
    })(),
    (() => {
      const vu = 2000, t = 0.25, d = 600, vl = 2080, bookE = 900;
      const a = vu + t * d - vl;
      return q("ci-mmv-d5", "difficile", "PV of the costs of financial distress implied by the firm's value ($ millions)?",
        [["Value of the unlevered firm ($ millions)", E(vu)], ["Debt ($ millions)", E(d)], ["Tax rate", pc(t)], ["Observed value of the levered firm ($ millions)", E(vl)],
          ["Book value of equity ($ millions)", E(bookE)]],
        a, "$", 0,
        ["La valeur comptable des fonds propres ne sert pas (donnée-piège).",
          `Sans détresse : V_U + t × D = ${F(vu)} + ${F(t * d)} = ${M(vu + t * d)}.`, `PV(détresse) = ${F(vu + t * d)} − ${F(vl)} = ${M(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 14 · Capacité d'endettement ────────────────────────── */

const DEBT_CAPACITY: CalcType = {
  key: "debt-capacity",
  topic: "corporate",
  name: "Capacité d'endettement (couverture, levier, covenants)",
  tier: "annexe",
  source: "LM 6 · Capital Structure",
  formulas: [
    "Interest coverage = EBIT / charges d'intérêts",
    "Debt-to-EBITDA = dette / EBITDA ; D/E = dette / fonds propres",
    "D/V = (D/E) / (1 + D/E) ; D/E = (D/V) / (1 − D/V)",
    "Sous covenant : dette max = plafond × EBITDA ; intérêts max = EBIT / couverture minimale",
  ],
  traps: [
    "La couverture se calcule sur l'EBIT, pas sur l'EBITDA (sauf mention contraire).",
    "Avec deux covenants, c'est le plus contraignant qui fixe la dette maximale.",
  ],
  questions: [
    (() => {
      const ebit = 600, int = 150;
      const a = ebit / int;
      return q("ci-debt-f1", "facile", "Interest coverage ratio?",
        [["EBIT", usd(ebit)], ["Interest expense", usd(int)]],
        a, "x", 2,
        ["Couverture = EBIT / intérêts.", `= ${F(ebit)} / ${F(int)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const debt = 1800, ebitda = 600;
      const a = debt / ebitda;
      return q("ci-debt-f2", "facile", "Debt-to-EBITDA ratio?",
        [["Total debt", usd(debt)], ["EBITDA", usd(ebitda)]],
        a, "x", 2,
        [`Dette / EBITDA = ${F(debt)} / ${F(ebitda)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const de = 0.6;
      const a = dvFromDe(de) * 100;
      return q("ci-debt-f3", "facile", "Debt as a percentage of total capital?",
        [["Debt-to-equity ratio", E(de)]],
        a, "%", 2,
        ["D/V = (D/E) / (1 + D/E).", `= ${F(de)} / ${F(1 + de)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const dv = 0.4;
      const a = deFromDv(dv);
      return q("ci-debt-f4", "facile", "Debt-to-equity ratio?",
        [["Debt / total capital", pc(dv)]],
        a, "x", 2,
        ["D/E = (D/V) / (1 − D/V).", `= ${F(dv)} / ${F(1 - dv)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const debt = 450, eq = 1050;
      const a = debt / eq;
      return q("ci-debt-f5", "facile", "Debt-to-equity ratio?",
        [["Debt ($ millions)", E(debt)], ["Equity ($ millions)", E(eq)]],
        a, "x", 2,
        [`D/E = ${F(debt)} / ${F(eq)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const max = 3.5, ebitda = 400, debt = 1000;
      const a = max * ebitda - debt;
      return q("ci-debt-m1", "moyen", "Maximum additional debt allowed by the covenant?",
        [["Covenant: maximum debt / EBITDA", mx(max)], ["EBITDA", usd(ebitda)], ["Current debt", usd(debt)]],
        a, "$", 0,
        [`Dette maximale = ${F(max)} × ${F(ebitda)} = ${D(max * ebitda)}.`, `Capacité restante = ${F(max * ebitda)} − ${F(debt)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const min = 4, ebit = 900, int0 = 150, rate = 0.06;
      const intMax = ebit / min;
      const a = (intMax - int0) / rate;
      return q("ci-debt-m2", "moyen", "Maximum new debt the company can issue without breaching the coverage covenant?",
        [["Covenant: minimum interest coverage (EBIT / interest)", mx(min)], ["EBIT", usd(ebit)], ["Current interest expense", usd(int0)], ["Interest rate on new debt", pc(rate)]],
        a, "$", 0,
        [`Intérêts maximaux = ${F(ebit)} / ${F(min)} = ${D(intMax)}, soit ${D(intMax - int0)} de marge.`, `Dette nouvelle = ${F(intMax - int0)} / ${F(rate)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const ebit = 500, int0 = 80, nd = 600, rate = 0.07;
      const int1 = int0 + nd * rate;
      const a = ebit / int1;
      return q("ci-debt-m3", "moyen", "Interest coverage ratio after the new borrowing?",
        [["EBIT", usd(ebit)], ["Current interest expense", usd(int0)], ["New debt / interest rate", lst([usd(nd), pc(rate)])]],
        a, "x", 2,
        [`Intérêts = ${F(int0)} + ${F(nd)} × ${P(rate)} = ${D(int1)}.`, `Couverture = ${F(ebit)} / ${F(int1)} = ${F(a, 2)}x (contre ${F(ebit / int0, 2)}x).`]);
    })(),
    (() => {
      const ebitda = 800, da = 200, int = 120;
      const a = (ebitda - da) / int;
      return q("ci-debt-m4", "moyen", "Interest coverage ratio (EBIT basis)?",
        [["EBITDA", usd(ebitda)], ["Depreciation and amortization", usd(da)], ["Interest expense", usd(int)]],
        a, "x", 2,
        [`EBIT = ${F(ebitda)} − ${F(da)} = ${D(ebitda - da)}.`, `Couverture = ${F(ebitda - da)} / ${F(int)} = ${F(a, 2)}x (et non ${F(ebitda / int, 2)}x sur l'EBITDA).`]);
    })(),
    (() => {
      const d = 300, e = 700, x = 200;
      const a = (d + x) / (e - x);
      return q("ci-debt-m5", "moyen", "Debt-to-equity ratio after the debt-financed share buyback? (Market values.)",
        [["Debt / equity before ($ millions)", lst([E(d), E(e)])], ["New debt used to repurchase shares ($ millions)", E(x)]],
        a, "x", 2,
        [`Dette = ${F(d)} + ${F(x)} = ${M(d + x)} ; fonds propres = ${F(e)} − ${F(x)} = ${M(e - x)}.`, `D/E = ${F(d + x)} / ${F(e - x)} = ${F(a, 2)} (contre ${F(d / e, 2)}).`]);
    })(),
    (() => {
      const ebitda = 500, da = 100, debt = 800, r0 = 0.06, rNew = 0.08, maxLev = 3, minCov = 5;
      const ebit = ebitda - da, int0 = debt * r0;
      const byLev = maxLev * ebitda - debt, byCov = (ebit / minCov - int0) / rNew;
      const a = Math.min(byLev, byCov);
      return q("ci-debt-d1", "difficile", "Maximum additional debt allowed by both covenants?",
        [["EBITDA / depreciation and amortization", lst([usd(ebitda), usd(da)])], ["Current debt / interest rate", lst([usd(debt), pc(r0)])], ["Rate on new debt", pc(rNew)],
          ["Covenants", `debt / EBITDA ≤ ${mx(maxLev)} ; EBIT / interest ≥ ${mx(minCov)}`]],
        a, "$", 0,
        [`Levier : dette ≤ ${F(maxLev)} × ${F(ebitda)} = ${D(maxLev * ebitda)}, soit ${D(byLev)} de plus.`,
          `Couverture : EBIT = ${D(ebit)} ; intérêts ≤ ${F(ebit)} / ${F(minCov)} = ${D(ebit / minCov)} ; marge ${D(ebit / minCov - int0)} / ${P(rNew)} = ${D(byCov)}.`,
          `Le plus contraignant l'emporte : ${D(a, 0)}.`]);
    })(),
    (() => {
      const debt = 2000, rate = 0.07, min = 3.5, ebit = 600;
      const need = debt * rate * min;
      const a = (1 - need / ebit) * 100;
      return q("ci-debt-d2", "difficile", "Largest percentage decline in EBIT before the coverage covenant is breached?",
        [["Debt / interest rate", lst([usd(debt), pc(rate)])], ["Covenant: minimum EBIT / interest", mx(min)], ["Current EBIT", usd(ebit)]],
        a, "%", 2,
        [`Intérêts = ${F(debt)} × ${P(rate)} = ${D(debt * rate)} ; EBIT minimal = ${F(min)} × ${F(debt * rate)} = ${D(need)}.`,
          `Baisse maximale = 1 − ${F(need)} / ${F(ebit)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const shares = 40, price = 25, mvD = 350, bookD = 300;
      const eq = shares * price;
      const a = (mvD / (mvD + eq)) * 100;
      return q("ci-debt-d3", "difficile", "Debt as a percentage of total capital, at market values?",
        [["Shares outstanding (millions) / share price", lst([E(shares), usd(price, 2)])], ["Debt: book / market value ($ millions)", lst([E(bookD), E(mvD)])]],
        a, "%", 2,
        [`Capitalisation = ${F(shares)} × ${F(price)} = ${M(eq)}.`, `D/V = ${F(mvD)} / (${F(mvD)} + ${F(eq)}) = ${Pa(a)} (valeur de marché de la dette, pas ${M(bookD)}).`]);
    })(),
    (() => {
      const d = 1000, ebitda = 400, tE = 100, price = 900;
      const a = (d + price) / (ebitda + tE);
      return q("ci-debt-d4", "difficile", "Debt-to-EBITDA after the fully debt-financed acquisition?",
        [["Current debt / EBITDA", lst([usd(d), usd(ebitda)])], ["Target's EBITDA", usd(tE)], ["Purchase price (all borrowed)", usd(price)]],
        a, "x", 2,
        [`Avant : ${F(d)} / ${F(ebitda)} = ${F(d / ebitda, 2)}x.`, `Après : (${F(d)} + ${F(price)}) / (${F(ebitda)} + ${F(tE)}) = ${F(d + price)} / ${F(ebitda + tE)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const d = 500, e = 1500, max = 0.4;
      const v = d + e;
      const a = max * v - d;
      return q("ci-debt-d5", "difficile", "Maximum debt the company can issue to repurchase shares while keeping debt at or below 40% of capital?",
        [["Debt / equity, market values ($ millions)", lst([E(d), E(e)])], ["Policy: maximum debt / total capital", pc(max)]],
        a, "$", 0,
        [`Racheter des actions avec de la dette laisse le capital total inchangé : V = ${F(d)} + ${F(e)} = ${M(v)}.`,
          `Dette maximale = ${P(max)} × ${F(v)} = ${M(max * v)}.`, `Émission possible = ${F(max * v)} − ${F(d)} = ${M(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── Catalogue ────────────────────────── */

export const CORPORATE_CALC: CalcCatalog = {
  topic: "corporate",
  types: [
    DOUBLE_TAX,
    LEVERAGE_ROE,
    CCC,
    TRADE_CREDIT,
    LIQUIDITY,
    NWC,
    COST_LIQUIDITY,
    NPV,
    IRR,
    ROIC,
    WACC,
    MM_RE,
    MM_VALUE,
    DEBT_CAPACITY,
  ],
};
