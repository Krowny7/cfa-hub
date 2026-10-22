// Exercices de calcul pur : Financial Statement Analysis (CFA Level I).
//
// Contenu seulement : le moteur et les pages vivent ailleurs (lib/calc/engine.ts, app/calculs).
// Règle d'or : chaque réponse est CALCULÉE ici, à partir des mêmes nombres que les données
// affichées, par les petites fonctions du haut de fichier. Aucune réponse tapée à la main.
// Formules vérifiées dans Schweser Level I, Book 2 (Readings 27 à 38 = LM 1 à 12 du curriculum FSA)
// et recoupées avec la banque officielle de practice exams.
//
// Conventions : énoncés et données en anglais d'examen ; solutions en français, nombres au format
// français. Pour une réponse en %, `answer` vaut déjà le pourcentage (8,5 % → 8.5).
// Ratios en jours : année de 365 jours (sauf mention contraire dans les données). Stocks : système
// d'inventaire périodique. Contrats de location : loyers payés en fin de période, comme dans le curriculum.
// Dette totale (ratios de solvabilité) : dettes financières portant intérêt seulement.

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
/** Nombre au format français : entier tel quel, sinon 2 décimales. */
const N = (x: number): string => F(x, isInt(x) ? 0 : 2);
/** Montant en dollars, format français : « 1 234,50 $ ». */
const D = (x: number, d?: number): string => `${F(x, d ?? (isInt(x) ? 0 : 2))} $`;
/** Pourcentage à partir d'une fraction (0,085 → « 8,5% »). */
const P = (frac: number, d?: number): string => `${F(frac * 100, d)}%`;
/** Pourcentage déjà exprimé en % (réponses). */
const Pa = (pct: number, d = 2): string => `${F(pct, d)}%`;
/** Montants en millions ou en milliers de dollars. */
const M = (x: number, d?: number): string => `${F(x, d ?? (isInt(x) ? 0 : 2))} M$`;
const K = (x: number, d?: number): string => `${F(x, d ?? (isInt(x) ? 0 : 2))} k$`;
/** Somme signée lisible : [12, −4, 7] → « 12 − 4 + 7 ». */
const terms = (xs: number[], fmt: (x: number) => string): string =>
  xs.map((x, i) => (i === 0 ? fmt(x) : x < 0 ? ` − ${fmt(-x)}` : ` + ${fmt(x)}`)).join("");

/** Formats anglais (données d'énoncé). */
const E = (x: number, d?: number): string => numStr(x, d, ".", ",");
const usd = (x: number, d?: number): string => `${x < 0 ? MINUS : ""}$${E(Math.abs(x), d ?? (isInt(x) ? 0 : 2))}`;
const pc = (frac: number, d?: number): string => `${E(frac * 100, d)}%`;
const mx = (x: number, d?: number): string => `${E(x, d)}x`;
const sn = (x: number): string => `${x > 0 ? "+" : ""}${E(x)}`;
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
const avg = (a: number, b: number): number => (a + b) / 2;

// LM 2 · Analyzing Income Statements (BPA)
const MONTH_EN = ["January 1", "February 1", "March 1", "April 1", "May 1", "June 1", "July 1", "August 1", "September 1", "October 1", "November 1", "December 1"];
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
/** Événement sur le capital : `at` = nombre de mois écoulés (3 = 1er avril). `split` = facteur (1,1 pour un dividende en actions de 10 %). */
type ShareEvent = { at: number; issue?: number; buyback?: number; split?: number; label?: string };
type Segment = { from: number; to: number; shares: number; factor: number; weighted: number };

/** Nombre moyen pondéré d'actions (mois entiers) ; splits et dividendes en actions appliqués rétroactivement. */
function weightedShares(begin: number, events: ShareEvent[]): { wa: number; segs: Segment[]; end: number } {
  const evs = [...events].sort((a, b) => a.at - b.at);
  const segs: Segment[] = [];
  let shares = begin;
  let t = 0;
  for (const e of evs) {
    if (e.at > t) {
      segs.push({ from: t, to: e.at, shares, factor: 1, weighted: 0 });
      t = e.at;
    }
    if (e.split) {
      shares *= e.split;
      for (const s of segs) s.factor *= e.split;
    }
    if (e.issue) shares += e.issue;
    if (e.buyback) shares -= e.buyback;
  }
  if (t < 12) segs.push({ from: t, to: 12, shares, factor: 1, weighted: 0 });
  for (const s of segs) s.weighted = (s.shares * s.factor * (s.to - s.from)) / 12;
  return { wa: sum(segs.map((s) => s.weighted)), segs, end: shares };
}

function shareRows(begin: number, evs: ShareEvent[]): Row[] {
  const rows: Row[] = [["Shares outstanding on January 1", E(begin)]];
  for (const e of evs) {
    const what = e.issue
      ? `Issued ${E(e.issue)} new shares`
      : e.buyback
        ? `Repurchased ${E(e.buyback)} shares`
        : (e.label ?? `${E(e.split ?? 1)}-for-1 stock split`);
    rows.push([MONTH_EN[e.at], what]);
  }
  return rows;
}

const periode = (a: number, b: number): string => (b - a === 1 ? MOIS[a] : `${MOIS[a]}–${MOIS[b - 1]}`);
const waLines = (segs: Segment[]): string[] =>
  segs.map(
    (s) =>
      `${periode(s.from, s.to)} : ${F(s.shares)}${s.factor !== 1 ? ` × ${F(s.factor)}` : ""} × ${s.to - s.from}/12 = ${N(s.weighted)}`,
  );

/** Treasury stock method : actions nettes créées par des options (0 si hors de la monnaie). */
const tsm = (n: number, strike: number, avgPrice: number): number => (avgPrice > strike ? (n * (avgPrice - strike)) / avgPrice : 0);

// LM 6 · Analysis of Inventories
type Layer = [number, number]; // [unités, coût unitaire]
function take(layers: Layer[], units: number): Layer[] {
  const out: Layer[] = [];
  let rem = units;
  for (const [u, c] of layers) {
    if (rem <= 0) break;
    const k = Math.min(u, rem);
    out.push([k, c]);
    rem -= k;
  }
  return out;
}
const unitsOf = (ls: Layer[]): number => sum(ls.map(([u]) => u));
const costOf = (ls: Layer[]): number => sum(ls.map(([u, c]) => u * c));
const fifoSold = (ls: Layer[], sold: number): Layer[] => take(ls, sold);
const lifoSold = (ls: Layer[], sold: number): Layer[] => take([...ls].reverse(), sold);
const fifoEnd = (ls: Layer[], sold: number): Layer[] => take([...ls].reverse(), unitsOf(ls) - sold);
const lifoEnd = (ls: Layer[], sold: number): Layer[] => take(ls, unitsOf(ls) - sold);
const layerText = (ls: Layer[]): string => ls.map(([u, c]) => `${F(u)} × ${D(c, 2)}`).join(" + ");
const layerRows = (ls: Layer[], labels: string[]): Row[] => ls.map(([u, c], i) => [labels[i], `${E(u)} units @ ${usd(c, 2)}`]);

// LM 8 · Leases (loyers en fin de période)
const annuityPV = (pmt: number, r: number, n: number): number => (pmt * (1 - Math.pow(1 + r, -n))) / r;
type LeaseYear = { t: number; begin: number; interest: number; principal: number; end: number };
function leaseSchedule(pmt: number, r: number, n: number): { pv: number; years: LeaseYear[] } {
  const pv = annuityPV(pmt, r, n);
  const years: LeaseYear[] = [];
  let l = pv;
  for (let t = 1; t <= n; t++) {
    const interest = l * r;
    const principal = pmt - interest;
    const end = l - principal;
    years.push({ t, begin: l, interest, principal, end });
    l = end;
  }
  return { pv, years };
}

/* ────────────────────────── 1 · BPA de base ────────────────────────── */

const BASIC_EPS: CalcType = {
  key: "basic-eps",
  topic: "fsa",
  name: "BPA de base (basic EPS) et nombre moyen pondéré d'actions",
  tier: "essentiel",
  source: "LM 2 · Analyzing Income Statements",
  formulas: [
    "BPA de base = (résultat net − dividendes privilégiés) / nombre moyen pondéré d'actions ordinaires",
    "Actions émises : comptées à partir de la date d'émission ; actions rachetées : retirées à partir du rachat",
    "Split ou dividende en actions : appliqué rétroactivement à toutes les actions existant avant l'événement",
  ],
  traps: [
    "Les dividendes ordinaires ne se retranchent pas : seuls les dividendes privilégiés de l'exercice le sont.",
    "Un dividende en actions de 10 % multiplie par 1,1 toutes les actions antérieures, y compris celles émises plus tôt dans l'année.",
    "Les actions émises ou rachetées après le split ne sont pas ajustées ; les actions auto-détenues ne sont pas en circulation.",
  ],
  questions: [
    (() => {
      const ni = 5_000_000, pref = 500_000, sh = 1_500_000;
      const a = (ni - pref) / sh;
      return q("fsa-beps-f1", "facile", "Basic EPS?",
        [["Net income", usd(ni)], ["Preferred dividends declared", usd(pref)], ["Common shares outstanding (all year)", E(sh)]],
        a, "$", 2,
        ["BPA de base = (RN − dividendes privilégiés) / nombre moyen pondéré d'actions.",
          `= (${D(ni)} − ${D(pref)}) / ${F(sh)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const begin = 100_000;
      const evs: ShareEvent[] = [{ at: 6, issue: 20_000 }];
      const w = weightedShares(begin, evs);
      return q("fsa-beps-f2", "facile", "Weighted average number of common shares for basic EPS?",
        shareRows(begin, evs),
        w.wa, "", 0,
        ["Chaque bloc d'actions est pondéré par la part de l'année où il est en circulation.",
          ...waLines(w.segs),
          `Moyenne pondérée = ${F(w.wa, 0)} actions.`]);
    })(),
    (() => {
      const begin = 50_000;
      const evs: ShareEvent[] = [{ at: 9, buyback: 6_000 }];
      const w = weightedShares(begin, evs);
      return q("fsa-beps-f3", "facile", "Weighted average number of common shares for basic EPS?",
        shareRows(begin, evs),
        w.wa, "", 0,
        ["Les actions rachetées sortent du calcul à partir de la date de rachat.",
          ...waLines(w.segs),
          `Moyenne pondérée = ${F(w.wa, 0)} actions.`]);
    })(),
    (() => {
      const ni = 1_250_000, pref = 90_000, wa = 580_000;
      const a = (ni - pref) / wa;
      return q("fsa-beps-f4", "facile", "Basic EPS?",
        [["Net income", usd(ni)], ["Preferred dividends declared", usd(pref)], ["Weighted average common shares", E(wa)]],
        a, "$", 2,
        [`Résultat revenant aux actionnaires ordinaires = ${D(ni)} − ${D(pref)} = ${D(ni - pref)}.`,
          `BPA de base = ${D(ni - pref)} / ${F(wa)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const begin = 200_000;
      const evs: ShareEvent[] = [{ at: 4, split: 2, label: "2-for-1 stock split" }];
      const w = weightedShares(begin, evs);
      return q("fsa-beps-f5", "facile", "Weighted average number of common shares for basic EPS?",
        shareRows(begin, evs),
        w.wa, "", 0,
        ["Un split s'applique rétroactivement au 1er janvier : il ne crée aucune ressource nouvelle.",
          ...waLines(w.segs),
          `Moyenne pondérée = ${F(w.wa, 0)} actions (= ${F(begin)} × 2 sur toute l'année).`]);
    })(),
    (() => {
      const begin = 80_000;
      const evs: ShareEvent[] = [
        { at: 2, issue: 12_000 },
        { at: 6, split: 1.1, label: "10% stock dividend" },
        { at: 9, buyback: 12_000 },
      ];
      const w = weightedShares(begin, evs);
      return q("fsa-beps-m1", "moyen", "Weighted average number of common shares for basic EPS?",
        shareRows(begin, evs),
        w.wa, "", 0,
        ["Le dividende en actions de 10 % multiplie par 1,1 toutes les actions en circulation avant le 1er juillet ; le rachat d'octobre n'est pas ajusté.",
          ...waLines(w.segs),
          `Moyenne pondérée = ${F(w.wa, 0)} actions.`]);
    })(),
    (() => {
      const ni = 3_600_000, pref = 400_000, common = 1_000_000, begin = 1_000_000;
      const evs: ShareEvent[] = [{ at: 8, issue: 200_000 }];
      const w = weightedShares(begin, evs);
      const a = (ni - pref) / w.wa;
      return q("fsa-beps-m2", "moyen", "Basic EPS?",
        [["Net income", usd(ni)], ["Preferred dividends declared", usd(pref)], ["Common dividends paid", usd(common)],
          ...shareRows(begin, evs)],
        a, "$", 2,
        [...waLines(w.segs).map((l) => `Actions : ${l}`),
          `Moyenne pondérée = ${N(w.wa)} actions.`,
          `Numérateur = ${D(ni)} − ${D(pref)} = ${D(ni - pref)} (les dividendes ordinaires ne se retranchent pas).`,
          `BPA de base = ${D(ni - pref)} / ${N(w.wa)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const ni = 4_000_000, nPref = 50_000, par = 100, rate = 0.05, begin = 1_200_000;
      const evs: ShareEvent[] = [{ at: 9, buyback: 150_000 }];
      const pref = nPref * par * rate;
      const w = weightedShares(begin, evs);
      const a = (ni - pref) / w.wa;
      return q("fsa-beps-m3", "moyen", "Basic EPS?",
        [["Net income", usd(ni)], ["Nonconvertible preferred stock", `${E(nPref)} shares, ${usd(par)} par, ${pc(rate)} cumulative dividend`],
          ...shareRows(begin, evs)],
        a, "$", 2,
        [`Dividendes privilégiés = ${F(nPref)} × ${D(par)} × ${P(rate)} = ${D(pref)} (cumulatifs : retranchés même s'ils ne sont pas déclarés).`,
          ...waLines(w.segs).map((l) => `Actions : ${l}`),
          `Moyenne pondérée = ${N(w.wa)} actions.`,
          `BPA de base = (${D(ni)} − ${D(pref)}) / ${N(w.wa)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const ni = 1_155_000, begin = 120_000;
      const evs: ShareEvent[] = [
        { at: 3, split: 1.5, label: "3-for-2 stock split" },
        { at: 7, issue: 30_000 },
      ];
      const w = weightedShares(begin, evs);
      const a = ni / w.wa;
      return q("fsa-beps-m4", "moyen", "Basic EPS? (No preferred stock.)",
        [["Net income", usd(ni)], ...shareRows(begin, evs)],
        a, "$", 2,
        ["Le split 3 pour 2 multiplie par 1,5 les actions antérieures au 1er avril ; l'émission d'août n'est pas ajustée.",
          ...waLines(w.segs),
          `Moyenne pondérée = ${N(w.wa)} actions.`,
          `BPA = ${D(ni)} / ${N(w.wa)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const niPrior = 2_640_000, waPrior = 800_000, split = 2;
      const reported = niPrior / waPrior;
      const a = niPrior / (waPrior * split);
      return q("fsa-beps-m5", "moyen", "Prior-year basic EPS as restated in this year's financial statements?",
        [["Prior-year net income (no preferred stock)", usd(niPrior)], ["Prior-year weighted average shares (as reported)", E(waPrior)],
          ["Prior-year basic EPS (as reported)", usd(reported, 2)], ["This year, June 1", "2-for-1 stock split"]],
        a, "$", 2,
        ["Un split est appliqué rétroactivement, y compris aux exercices présentés en comparatif.",
          `Actions de l'an dernier retraitées = ${F(waPrior)} × ${F(split)} = ${F(waPrior * split)}.`,
          `BPA retraité = ${D(niPrior)} / ${F(waPrior * split)} = ${D(a, 2)} (au lieu de ${D(reported, 2)}).`]);
    })(),
    (() => {
      const ni = 6_840_000, pref = 240_000, common = 1_000_000, begin = 500_000;
      const evs: ShareEvent[] = [
        { at: 1, issue: 60_000 },
        { at: 4, split: 2, label: "2-for-1 stock split" },
        { at: 7, buyback: 40_000 },
        { at: 10, issue: 30_000 },
      ];
      const w = weightedShares(begin, evs);
      const a = (ni - pref) / w.wa;
      return q("fsa-beps-d1", "difficile", "Basic EPS?",
        [["Net income", usd(ni)], ["Preferred dividends declared", usd(pref)], ["Common dividends paid", usd(common)],
          ...shareRows(begin, evs)],
        a, "$", 2,
        ["Le split du 1er mai double toutes les actions en circulation avant cette date ; rachat d'août et émission de novembre non ajustés.",
          ...waLines(w.segs),
          `Moyenne pondérée = ${N(w.wa)} actions.`,
          `Numérateur = ${D(ni)} − ${D(pref)} = ${D(ni - pref)} ; les dividendes ordinaires sont une donnée-piège.`,
          `BPA de base = ${D(ni - pref)} / ${N(w.wa)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const eps = 2.1, begin = 900_000, pref = 120_000;
      const evs: ShareEvent[] = [{ at: 3, issue: 300_000 }];
      const w = weightedShares(begin, evs);
      const a = eps * w.wa + pref;
      return q("fsa-beps-d2", "difficile", "Net income implied by the reported basic EPS?",
        [["Reported basic EPS", usd(eps, 2)], ["Preferred dividends declared", usd(pref)], ...shareRows(begin, evs)],
        a, "$", 0,
        [...waLines(w.segs),
          `Moyenne pondérée = ${N(w.wa)} actions.`,
          `Résultat aux ordinaires = ${D(eps, 2)} × ${N(w.wa)} = ${D(eps * w.wa)}.`,
          `RN = ${D(eps * w.wa)} + dividendes privilégiés ${D(pref)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const ni = 2_900_000, begin = 250_000;
      const evs: ShareEvent[] = [
        { at: 2, issue: 50_000 },
        { at: 8, split: 1.2, label: "20% stock dividend" },
        { at: 10, buyback: 24_000 },
      ];
      const w = weightedShares(begin, evs);
      const a = ni / w.wa;
      return q("fsa-beps-d3", "difficile", "Basic EPS? (No preferred stock.)",
        [["Net income", usd(ni)], ...shareRows(begin, evs)],
        a, "$", 2,
        ["Le dividende en actions de 20 % multiplie par 1,2 les actions en circulation avant le 1er septembre, y compris celles émises en mars.",
          ...waLines(w.segs),
          `Moyenne pondérée = ${N(w.wa)} actions.`,
          `BPA = ${D(ni)} / ${N(w.wa)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const issued = 2_000_000, treasury = 200_000, acq = 400_000, ni = 9_500_000, pref = 500_000, at = 3;
      const out0 = issued - treasury;
      const wa = out0 + (acq * (12 - at)) / 12;
      const a = (ni - pref) / wa;
      return q("fsa-beps-d4", "difficile", "Basic EPS?",
        [["Common shares issued on January 1", E(issued)], ["Treasury shares held on January 1", E(treasury)],
          [MONTH_EN[at], `Issued ${E(acq)} shares to acquire a competitor`], ["Net income", usd(ni)], ["Preferred dividends declared", usd(pref)]],
        a, "$", 2,
        [`Actions en circulation au 1er janvier = ${F(issued)} − ${F(treasury)} auto-détenues = ${F(out0)}.`,
          `Actions émises pour l'acquisition : comptées à partir du 1er avril, soit ${F(acq)} × ${12 - at}/12 = ${F((acq * (12 - at)) / 12)}.`,
          `Moyenne pondérée = ${F(out0)} + ${F((acq * (12 - at)) / 12)} = ${F(wa)}.`,
          `BPA de base = (${D(ni)} − ${D(pref)}) / ${F(wa)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const ni1 = 4_000_000, wa1 = 1_000_000, ni2 = 4_600_000, begin2 = 1_000_000, split = 2;
      const w2 = weightedShares(begin2, [{ at: 6, split, label: "2-for-1 stock split" }]);
      const eps2 = ni2 / w2.wa;
      const eps1r = ni1 / (wa1 * split);
      const a = (eps2 / eps1r - 1) * 100;
      return q("fsa-beps-d5", "difficile", "Growth in basic EPS from Year 1 to Year 2, on a comparable basis?",
        [["Year 1 net income", usd(ni1)], ["Year 1 weighted average shares (as originally reported)", E(wa1)],
          ["Year 2 net income", usd(ni2)], ["Shares outstanding on January 1, Year 2", E(begin2)], ["July 1, Year 2", "2-for-1 stock split"],
          ["No preferred stock; no other share transactions", "—"]],
        a, "%", 1,
        [`Année 2 : le split est rétroactif, la moyenne pondérée vaut ${F(w2.wa)} ; BPA = ${D(ni2)} / ${F(w2.wa)} = ${D(eps2, 2)}.`,
          `Année 1 retraitée pour le split : ${D(ni1)} / ${F(wa1 * split)} = ${D(eps1r, 2)}.`,
          `Croissance = ${F(eps2, 2)} / ${F(eps1r, 2)} − 1 = ${Pa(a, 1)}.`,
          `Piège : comparer à ${D(ni1 / wa1, 2)} (non retraité) donnerait une baisse fictive.`]);
    })(),
  ],
};

/* ────────────────────────── 2 · BPA dilué ────────────────────────── */

const DILUTED_EPS: CalcType = {
  key: "diluted-eps",
  topic: "fsa",
  name: "BPA dilué (diluted EPS) : convertibles et options",
  tier: "essentiel",
  top: true,
  source: "LM 2 · Analyzing Income Statements",
  formulas: [
    "BPA dilué = (RN − div. privilégiés + div. des privilégiées convertibles + intérêts des obligations convertibles × (1 − t)) / (moyenne pondérée + actions issues des conversions + actions nettes des options)",
    "Treasury stock method : actions nettes = n × (prix moyen − prix d'exercice) / prix moyen, seulement si prix moyen > prix d'exercice",
    "Test d'antidilution : effet par action = ajout au numérateur / actions créées ; si > BPA de base, le titre est exclu",
    "Titre émis en cours d'année : ajouts au numérateur et au dénominateur au prorata de la période",
  ],
  traps: [
    "Options : on utilise le cours MOYEN de l'exercice, pas le cours de clôture.",
    "Obligations convertibles : on rajoute l'intérêt APRÈS impôt.",
    "Un titre antidilutif est ignoré : le BPA dilué ne dépasse jamais le BPA de base.",
  ],
  questions: [
    (() => {
      const n = 100_000, k = 30, p = 40;
      const a = tsm(n, k, p);
      return q("fsa-deps-f1", "facile", "Net number of shares added to the diluted EPS denominator by the options?",
        [["Options outstanding all year", E(n)], ["Exercise price", usd(k, 2)], ["Average market price", usd(p, 2)]],
        a, "", 0,
        [`Produit de l'exercice = ${F(n)} × ${D(k)} = ${D(n * k)}.`,
          `Actions rachetées au cours moyen = ${D(n * k)} / ${D(p)} = ${F((n * k) / p)}.`,
          `Actions nettes = ${F(n)} − ${F((n * k) / p)} = ${F(a, 0)}.`]);
    })(),
    (() => {
      const ni = 5_000_000, prefDiv = 600_000, sh = 2_000_000, conv = 400_000;
      const basic = (ni - prefDiv) / sh;
      const a = ni / (sh + conv);
      return q("fsa-deps-f2", "facile", "Diluted EPS?",
        [["Net income", usd(ni)], ["Dividends on convertible preferred stock", usd(prefDiv)], ["Common shares outstanding (all year)", E(sh)],
          ["Common shares issued if preferred is converted", E(conv)]],
        a, "$", 2,
        [`BPA de base = (${D(ni)} − ${D(prefDiv)}) / ${F(sh)} = ${D(basic, 2)}.`,
          `Effet par action = ${D(prefDiv)} / ${F(conv)} = ${D(prefDiv / conv, 2)} < ${D(basic, 2)} : dilutif.`,
          `Conversion supposée : plus de dividende privilégié, ${F(conv)} actions de plus.`,
          `BPA dilué = ${D(ni)} / ${F(sh + conv)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const earn = 3_000_000, sh = 1_500_000, interest = 800_000, t = 0.25, conv = 400_000;
      const addBack = interest * (1 - t);
      const a = (earn + addBack) / (sh + conv);
      return q("fsa-deps-f3", "facile", "Diluted EPS?",
        [["Earnings available to common shareholders", usd(earn)], ["Common shares outstanding (all year)", E(sh)],
          ["Interest expense on convertible bonds", usd(interest)], ["Tax rate", pc(t)], ["Shares issued on conversion", E(conv)]],
        a, "$", 2,
        [`BPA de base = ${D(earn)} / ${F(sh)} = ${D(earn / sh, 2)}.`,
          `Intérêts économisés après impôt = ${D(interest)} × (1 − ${F(t)}) = ${D(addBack)} ; effet par action = ${D(addBack / conv, 2)} : dilutif.`,
          `BPA dilué = (${D(earn)} + ${D(addBack)}) / (${F(sh)} + ${F(conv)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const n = 200_000, k = 20, p = 25, sh = 1_000_000, ni = 2_400_000;
      const inc = tsm(n, k, p);
      const a = ni / (sh + inc);
      return q("fsa-deps-f4", "facile", "Diluted EPS? (No preferred stock.)",
        [["Net income", usd(ni)], ["Common shares outstanding (all year)", E(sh)], ["Warrants outstanding all year", E(n)],
          ["Exercise price", usd(k, 2)], ["Average market price", usd(p, 2)]],
        a, "$", 2,
        [`Actions nettes (treasury stock method) = ${F(n)} × (${F(p)} − ${F(k)}) / ${F(p)} = ${F(inc)}.`,
          `BPA dilué = ${D(ni)} / (${F(sh)} + ${F(inc)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const interest = 600_000, t = 0.3, conv = 300_000;
      const a = (interest * (1 - t)) / conv;
      return q("fsa-deps-f5", "facile", "Per-share effect of the convertible bonds (used to test for dilution)?",
        [["Interest expense on convertible bonds", usd(interest)], ["Tax rate", pc(t)], ["Shares issued on conversion", E(conv)]],
        a, "$", 2,
        [`Ajout au numérateur = ${D(interest)} × (1 − ${F(t)}) = ${D(interest * (1 - t))}.`,
          `Effet par action = ${D(interest * (1 - t))} / ${F(conv)} = ${D(a, 2)} : dilutif si inférieur au BPA de base.`]);
    })(),
    (() => {
      const sh = 450_000, n = 120_000, k = 40, p = 48, pEnd = 52;
      const inc = tsm(n, k, p);
      const a = sh + inc;
      return q("fsa-deps-m1", "moyen", "Number of shares used to compute diluted EPS?",
        [["Common shares outstanding (all year)", E(sh)], ["Warrants outstanding all year", E(n)], ["Exercise price", usd(k, 2)],
          ["Average share price for the year", usd(p, 2)], ["Year-end share price", usd(pEnd, 2)]],
        a, "", 0,
        ["Treasury stock method avec le cours MOYEN (le cours de clôture est une donnée-piège).",
          `Actions nettes = ${F(n)} × (${F(p)} − ${F(k)}) / ${F(p)} = ${F(inc, 0)}.`,
          `Dénominateur dilué = ${F(sh)} + ${F(inc, 0)} = ${F(a, 0)}.`]);
    })(),
    (() => {
      const nb = 2_000, par = 1_000, cpn = 0.06, ratio = 40, t = 0.3, ni = 4_500_000, sh = 1_000_000;
      const interest = nb * par * cpn;
      const addBack = interest * (1 - t);
      const conv = nb * ratio;
      const basic = ni / sh;
      const a = (ni + addBack) / (sh + conv);
      return q("fsa-deps-m2", "moyen", "Diluted EPS? (No preferred stock.)",
        [["Net income", usd(ni)], ["Common shares outstanding (all year)", E(sh)],
          ["Convertible bonds outstanding all year", `${E(nb)} bonds, ${usd(par)} par, ${pc(cpn)} coupon, issued at par`],
          ["Conversion ratio", `${E(ratio)} shares per bond`], ["Tax rate", pc(t)]],
        a, "$", 2,
        [`Intérêts = ${F(nb)} × ${D(par)} × ${P(cpn)} = ${D(interest)} ; après impôt = ${D(addBack)}.`,
          `Actions créées = ${F(nb)} × ${F(ratio)} = ${F(conv)} ; effet par action = ${D(addBack / conv, 2)} < BPA de base ${D(basic, 2)} : dilutif.`,
          `BPA dilué = (${D(ni)} + ${D(addBack)}) / (${F(sh)} + ${F(conv)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const parTot = 5_000_000, rate = 0.07, perTen = 1.2, ni = 4_200_000, sh = 2_000_000;
      const div = parTot * rate;
      const conv = (parTot / 10) * perTen;
      const basic = (ni - div) / sh;
      const a = ni / (sh + conv);
      return q("fsa-deps-m3", "moyen", "Diluted EPS?",
        [["Net income", usd(ni)], ["Common shares outstanding (all year)", E(sh)],
          ["Convertible preferred stock", `${usd(parTot)} par, ${pc(rate)} dividend`], ["Conversion terms", `${E(perTen)} common shares per $10 of par`]],
        a, "$", 2,
        [`Dividendes privilégiés = ${P(rate)} × ${D(parTot)} = ${D(div)} ; BPA de base = (${D(ni)} − ${D(div)}) / ${F(sh)} = ${D(basic, 2)}.`,
          `Actions créées = (${D(parTot)} / 10) × ${F(perTen)} = ${F(conv)} ; effet par action = ${D(div / conv, 2)} : dilutif.`,
          `BPA dilué = ${D(ni)} / (${F(sh)} + ${F(conv)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const earn = 1_000_000, sh = 500_000, interest = 900_000, t = 0.3, conv = 250_000;
      const basic = earn / sh;
      const eff = (interest * (1 - t)) / conv;
      const a = eff < basic ? (earn + interest * (1 - t)) / (sh + conv) : basic;
      return q("fsa-deps-m4", "moyen", "Diluted EPS?",
        [["Earnings available to common shareholders", usd(earn)], ["Common shares outstanding (all year)", E(sh)],
          ["Interest expense on convertible bonds", usd(interest)], ["Tax rate", pc(t)], ["Shares issued on conversion", E(conv)]],
        a, "$", 2,
        [`BPA de base = ${D(earn)} / ${F(sh)} = ${D(basic, 2)}.`,
          `Effet par action des convertibles = ${D(interest)} × (1 − ${F(t)}) / ${F(conv)} = ${D(eff, 2)}.`,
          `${D(eff, 2)} > ${D(basic, 2)} : les obligations sont antidilutives et sont exclues.`,
          `BPA dilué = BPA de base = ${D(a, 2)}.`]);
    })(),
    (() => {
      const nb = 1_000, par = 1_000, cpn = 0.08, ratio = 50, t = 0.25, ni = 2_200_000, wa = 1_000_000, months = 6;
      const interest = (nb * par * cpn * months) / 12;
      const addBack = interest * (1 - t);
      const conv = (nb * ratio * months) / 12;
      const a = (ni + addBack) / (wa + conv);
      return q("fsa-deps-m5", "moyen", "Diluted EPS? (No preferred stock.)",
        [["Net income", usd(ni)], ["Weighted average common shares", E(wa)],
          ["July 1", `Issued ${E(nb)} convertible bonds at par (${usd(par)} par, ${pc(cpn)} annual coupon)`],
          ["Conversion ratio", `${E(ratio)} shares per bond`], ["Tax rate", pc(t)]],
        a, "$", 2,
        [`Obligations en circulation ${months} mois : intérêts de l'exercice = ${D(nb * par)} × ${P(cpn)} × ${months}/12 = ${D(interest)} ; après impôt = ${D(addBack)}.`,
          `Actions créées pondérées = ${F(nb * ratio)} × ${months}/12 = ${F(conv)}.`,
          `Effet par action = ${D(addBack / conv, 2)} < BPA de base ${D(ni / wa, 2)} : dilutif.`,
          `BPA dilué = (${D(ni)} + ${D(addBack)}) / (${F(wa)} + ${F(conv)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const ni = 10_000_000, prefDiv = 1_000_000, prefConv = 800_000, interest = 1_200_000, t = 0.25, bondConv = 600_000;
      const nOpt = 400_000, k = 40, p = 50, wa = 4_000_000;
      const basic = (ni - prefDiv) / wa;
      const opt = tsm(nOpt, k, p);
      const addBack = interest * (1 - t);
      const a = (ni - prefDiv + prefDiv + addBack) / (wa + prefConv + bondConv + opt);
      return q("fsa-deps-d1", "difficile", "Diluted EPS?",
        [["Net income", usd(ni)], ["Weighted average common shares", E(wa)],
          ["Convertible preferred: annual dividend / shares on conversion", lst([usd(prefDiv), E(prefConv)])],
          ["Convertible bonds: interest expense / shares on conversion", lst([usd(interest), E(bondConv)])], ["Tax rate", pc(t)],
          ["Options outstanding all year", `${E(nOpt)} at ${usd(k, 2)} exercise price`], ["Average share price", usd(p, 2)]],
        a, "$", 2,
        [`BPA de base = (${D(ni)} − ${D(prefDiv)}) / ${F(wa)} = ${D(basic, 2)}.`,
          `Privilégiées : ${D(prefDiv)} / ${F(prefConv)} = ${D(prefDiv / prefConv, 2)} ; obligations : ${D(addBack)} / ${F(bondConv)} = ${D(addBack / bondConv, 2)} ; tous deux < ${D(basic, 2)} : dilutifs.`,
          `Options : ${F(nOpt)} × (${F(p)} − ${F(k)}) / ${F(p)} = ${F(opt)} actions nettes.`,
          `Numérateur = ${D(ni - prefDiv)} + ${D(prefDiv)} + ${D(addBack)} = ${D(ni + addBack)}.`,
          `Dénominateur = ${F(wa)} + ${F(prefConv)} + ${F(bondConv)} + ${F(opt)} = ${F(wa + prefConv + bondConv + opt)}.`,
          `BPA dilué = ${D(a, 2)}.`]);
    })(),
    (() => {
      const ni = 6_000_000, pref = 500_000, wa = 2_000_000, interest = 2_000_000, t = 0.3, conv = 400_000;
      const nOpt = 150_000, k = 24, p = 32;
      const basic = (ni - pref) / wa;
      const eff = (interest * (1 - t)) / conv;
      const opt = tsm(nOpt, k, p);
      const a = (ni - pref) / (wa + opt);
      return q("fsa-deps-d2", "difficile", "Diluted EPS?",
        [["Net income", usd(ni)], ["Dividends on nonconvertible preferred stock", usd(pref)], ["Weighted average common shares", E(wa)],
          ["Convertible bonds: interest expense / shares on conversion", lst([usd(interest), E(conv)])], ["Tax rate", pc(t)],
          ["Options outstanding all year", `${E(nOpt)} at ${usd(k, 2)} exercise price`], ["Average share price", usd(p, 2)]],
        a, "$", 2,
        [`BPA de base = (${D(ni)} − ${D(pref)}) / ${F(wa)} = ${D(basic, 2)}.`,
          `Obligations : ${D(interest * (1 - t))} / ${F(conv)} = ${D(eff, 2)} > ${D(basic, 2)} : antidilutives, exclues.`,
          `Options : ${F(nOpt)} × (${F(p)} − ${F(k)}) / ${F(p)} = ${F(opt)} actions nettes (dilutives).`,
          `BPA dilué = ${D(ni - pref)} / (${F(wa)} + ${F(opt)}) = ${D(a, 2)}.`,
          `Piège : inclure les obligations donnerait ${D((ni - pref + interest * (1 - t)) / (wa + opt + conv), 2)}, plus que le BPA de base.`]);
    })(),
    (() => {
      const earn = 2_000_000, wa = 800_000, nOpt = 120_000, k = 18, p = 24, pEnd = 30, months = 9;
      const full = tsm(nOpt, k, p);
      const opt = (full * months) / 12;
      const a = earn / (wa + opt);
      return q("fsa-deps-d3", "difficile", "Diluted EPS?",
        [["Earnings available to common shareholders", usd(earn)], ["Weighted average common shares", E(wa)],
          ["April 1", `Granted ${E(nOpt)} options, exercise price ${usd(k, 2)}`], ["Average share price, April–December", usd(p, 2)],
          ["Year-end share price", usd(pEnd, 2)]],
        a, "$", 2,
        [`Treasury stock method au cours moyen : ${F(nOpt)} × (${F(p)} − ${F(k)}) / ${F(p)} = ${F(full)} actions nettes.`,
          `Options en circulation ${months} mois : ${F(full)} × ${months}/12 = ${F(opt)}.`,
          `BPA dilué = ${D(earn)} / (${F(wa)} + ${F(opt)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const begin = 1_000_000, ni = 3_465_000, nb = 5_000, par = 1_000, cpn = 0.05, ratio = 25, t = 0.4;
      const w = weightedShares(begin, [{ at: 9, issue: 200_000 }]);
      const interest = nb * par * cpn;
      const addBack = interest * (1 - t);
      const conv = nb * ratio;
      const basic = ni / w.wa;
      const a = (ni + addBack) / (w.wa + conv);
      return q("fsa-deps-d4", "difficile", "Diluted EPS? (No preferred stock.)",
        [["Net income", usd(ni)], ["Shares outstanding on January 1", E(begin)], ["October 1", "Issued 200,000 new shares"],
          ["Convertible bonds outstanding all year", `${E(nb)} bonds, ${usd(par)} par, ${pc(cpn)} coupon, issued at par`],
          ["Conversion ratio", `${E(ratio)} shares per bond`], ["Tax rate", pc(t)]],
        a, "$", 2,
        [`Moyenne pondérée = ${waLines(w.segs).join(" ; ")} → ${F(w.wa)} actions ; BPA de base = ${D(basic, 2)}.`,
          `Intérêts après impôt = ${D(interest)} × (1 − ${F(t)}) = ${D(addBack)} ; actions créées = ${F(conv)} ; effet = ${D(addBack / conv, 2)} : dilutif.`,
          `BPA dilué = (${D(ni)} + ${D(addBack)}) / (${F(w.wa)} + ${F(conv)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const ni = 8_000_000, prefDiv = 900_000, prefConv = 250_000, wa = 2_500_000, interest = 1_000_000, t = 0.3, conv = 500_000;
      const basic = (ni - prefDiv) / wa;
      const effPref = prefDiv / prefConv;
      const addBack = interest * (1 - t);
      const effBond = addBack / conv;
      const a = (ni - prefDiv + addBack) / (wa + conv);
      return q("fsa-deps-d5", "difficile", "Diluted EPS?",
        [["Net income", usd(ni)], ["Weighted average common shares", E(wa)],
          ["Convertible preferred: annual dividend / shares on conversion", lst([usd(prefDiv), E(prefConv)])],
          ["Convertible bonds: interest expense / shares on conversion", lst([usd(interest), E(conv)])], ["Tax rate", pc(t)]],
        a, "$", 2,
        [`BPA de base = (${D(ni)} − ${D(prefDiv)}) / ${F(wa)} = ${D(basic, 2)}.`,
          `Privilégiées convertibles : ${D(prefDiv)} / ${F(prefConv)} = ${D(effPref, 2)} > ${D(basic, 2)} : antidilutives, exclues (le dividende reste déduit).`,
          `Obligations : ${D(addBack)} / ${F(conv)} = ${D(effBond, 2)} : dilutives.`,
          `BPA dilué = (${D(ni - prefDiv)} + ${D(addBack)}) / (${F(wa)} + ${F(conv)}) = ${D(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 3 · Stocks : FIFO, LIFO, coût moyen ────────────────────────── */

const INVENTORY: CalcType = {
  key: "inventory-cost-flow",
  topic: "fsa",
  name: "Stocks : FIFO, LIFO et coût moyen pondéré",
  tier: "essentiel",
  top: true,
  source: "LM 6 · Analysis of Inventories",
  formulas: [
    "Marchandises disponibles = stock initial + achats = COGS + stock final",
    "FIFO : COGS = couches les plus anciennes ; stock final = achats les plus récents",
    "LIFO : COGS = achats les plus récents ; stock final = couches les plus anciennes",
    "Coût moyen pondéré = coût total disponible / unités disponibles ; COGS = coût moyen × unités vendues",
    "LIFO reserve : stock FIFO = stock LIFO + reserve ; COGS FIFO = COGS LIFO − hausse de la reserve",
  ],
  traps: [
    "Prix en hausse : LIFO donne le COGS le plus élevé et le stock final le plus bas (l'inverse en déflation).",
    "Système périodique : les coûts sont affectés en fin de période, pas vente par vente.",
    "Le prix de vente ne sert qu'à la marge brute, jamais au COGS.",
  ],
  questions: [
    (() => {
      const ls: Layer[] = [[100, 10], [200, 12], [150, 14]];
      const sold = 250;
      const used = fifoSold(ls, sold);
      const a = costOf(used);
      return q("fsa-inv-f1", "facile", "Cost of goods sold under FIFO?",
        [...layerRows(ls, ["Beginning inventory", "Purchase 1", "Purchase 2"]), ["Units sold", E(sold)]],
        a, "$", 0,
        ["FIFO : les unités vendues sortent d'abord des couches les plus anciennes.",
          `COGS = ${layerText(used)} = ${D(a)}.`]);
    })(),
    (() => {
      const ls: Layer[] = [[200, 5], [300, 6], [100, 7]];
      const sold = 450;
      const end = lifoEnd(ls, sold);
      const a = costOf(end);
      return q("fsa-inv-f2", "facile", "Ending inventory under LIFO?",
        [...layerRows(ls, ["Beginning inventory", "Purchase 1", "Purchase 2"]), ["Units sold", E(sold)]],
        a, "$", 0,
        [`Unités restantes = ${F(unitsOf(ls))} − ${F(sold)} = ${F(unitsOf(end))}.`,
          "LIFO : le stock final est valorisé aux couches les plus anciennes.",
          `Stock final = ${layerText(end)} = ${D(a)}.`]);
    })(),
    (() => {
      const ls: Layer[] = [[400, 20], [600, 25]];
      const a = costOf(ls) / unitsOf(ls);
      return q("fsa-inv-f3", "facile", "Weighted average cost per unit?",
        layerRows(ls, ["Beginning inventory", "Purchases"]),
        a, "$", 2,
        [`Coût total disponible = ${layerText(ls)} = ${D(costOf(ls))}.`,
          `Coût moyen = ${D(costOf(ls))} / ${F(unitsOf(ls))} unités = ${D(a, 2)}.`]);
    })(),
    (() => {
      const beg = 50_000, purch = 320_000, end = 70_000;
      const a = beg + purch - end;
      return q("fsa-inv-f4", "facile", "Cost of goods sold?",
        [["Beginning inventory", usd(beg)], ["Purchases", usd(purch)], ["Ending inventory", usd(end)]],
        a, "$", 0,
        ["COGS = stock initial + achats − stock final.", `= ${D(beg)} + ${D(purch)} − ${D(end)} = ${D(a)}.`]);
    })(),
    (() => {
      const ls: Layer[] = [[80, 30], [120, 33], [100, 36]];
      const sold = 210;
      const end = fifoEnd(ls, sold);
      const a = costOf(end);
      return q("fsa-inv-f5", "facile", "Ending inventory under FIFO?",
        [...layerRows(ls, ["Beginning inventory", "Purchase 1", "Purchase 2"]), ["Units sold", E(sold)]],
        a, "$", 0,
        [`Unités restantes = ${F(unitsOf(ls))} − ${F(sold)} = ${F(unitsOf(end))}.`,
          "FIFO : le stock final est valorisé aux achats les plus récents.",
          `Stock final = ${layerText(end)} = ${D(a)}.`]);
    })(),
    (() => {
      const ls: Layer[] = [[300, 8], [400, 9], [300, 10]];
      const sold = 700, price = 15;
      const used = lifoSold(ls, sold);
      const cogs = costOf(used);
      const a = sold * price - cogs;
      return q("fsa-inv-m1", "moyen", "Gross profit under LIFO?",
        [...layerRows(ls, ["Beginning inventory", "March purchase", "August purchase"]), ["Units sold", E(sold)], ["Selling price per unit", usd(price, 2)]],
        a, "$", 0,
        [`COGS LIFO = ${layerText(used)} = ${D(cogs)}.`,
          `Chiffre d'affaires = ${F(sold)} × ${D(price)} = ${D(sold * price)}.`,
          `Marge brute = ${D(sold * price)} − ${D(cogs)} = ${D(a)}.`]);
    })(),
    (() => {
      const ls: Layer[] = [[1_000, 4], [2_000, 4.6], [2_000, 5.2]];
      const sold = 3_200;
      const unit = costOf(ls) / unitsOf(ls);
      const a = unit * sold;
      return q("fsa-inv-m2", "moyen", "Cost of goods sold under the weighted average cost method?",
        [...layerRows(ls, ["Beginning inventory", "Purchase 1", "Purchase 2"]), ["Units sold", E(sold)]],
        a, "$", 0,
        [`Coût total = ${layerText(ls)} = ${D(costOf(ls))} pour ${F(unitsOf(ls))} unités.`,
          `Coût moyen = ${D(unit, 2)} par unité.`,
          `COGS = ${F(sold)} × ${D(unit, 2)} = ${D(a)}.`,
          "Piège : la moyenne simple des coûts unitaires (sans pondérer par les quantités) ne donne pas le coût moyen pondéré."]);
    })(),
    (() => {
      const ls: Layer[] = [[500, 10], [500, 11], [500, 13]];
      const sold = 1_000;
      const f = costOf(fifoSold(ls, sold));
      const l = costOf(lifoSold(ls, sold));
      const a = l - f;
      return q("fsa-inv-m3", "moyen", "By how much does LIFO cost of goods sold exceed FIFO cost of goods sold?",
        [...layerRows(ls, ["Beginning inventory", "Purchase 1", "Purchase 2"]), ["Units sold", E(sold)]],
        a, "$", 0,
        [`COGS FIFO = ${layerText(fifoSold(ls, sold))} = ${D(f)}.`,
          `COGS LIFO = ${layerText(lifoSold(ls, sold))} = ${D(l)}.`,
          `Écart = ${D(l)} − ${D(f)} = ${D(a)} : en inflation, LIFO pèse davantage sur la marge.`]);
    })(),
    (() => {
      const ls: Layer[] = [[200, 50], [300, 45], [200, 40]];
      const sold = 500, price = 70;
      const used = lifoSold(ls, sold);
      const cogs = costOf(used);
      const a = sold * price - cogs;
      return q("fsa-inv-m4", "moyen", "Gross profit under LIFO? (Purchase costs are falling.)",
        [...layerRows(ls, ["Beginning inventory", "Purchase 1", "Purchase 2"]), ["Units sold", E(sold)], ["Selling price per unit", usd(price, 2)]],
        a, "$", 0,
        [`COGS LIFO = ${layerText(used)} = ${D(cogs)} (les coûts récents, plus bas, passent en charge).`,
          `Marge brute = ${F(sold)} × ${D(price)} − ${D(cogs)} = ${D(a)}.`,
          "En déflation, LIFO donne la marge la plus élevée."]);
    })(),
    (() => {
      const lifoCogs = 3_200_000, resBeg = 180_000, resEnd = 230_000;
      const a = lifoCogs - (resEnd - resBeg);
      return q("fsa-inv-m5", "moyen", "Cost of goods sold restated to FIFO?",
        [["COGS (LIFO)", usd(lifoCogs)], ["LIFO reserve, beginning of year", usd(resBeg)], ["LIFO reserve, end of year", usd(resEnd)]],
        a, "$", 0,
        [`Hausse de la LIFO reserve = ${D(resEnd)} − ${D(resBeg)} = ${D(resEnd - resBeg)}.`,
          `COGS FIFO = COGS LIFO − hausse de la reserve = ${D(lifoCogs)} − ${D(resEnd - resBeg)} = ${D(a)}.`]);
    })(),
    (() => {
      const ls: Layer[] = [[1_000, 20], [500, 24], [2_000, 30]];
      const sold = 3_000, repl = 30;
      const used = lifoSold(ls, sold);
      const purchased = 2_000;
      const liquidated = take([...ls.slice(0, 2)].reverse(), sold - purchased);
      const a = (sold - purchased) * repl - costOf(liquidated);
      return q("fsa-inv-d1", "difficile", "Increase in gross profit caused by the LIFO liquidation (vs. replacing the units at the current cost)?",
        [...layerRows(ls, ["Old LIFO layer (oldest)", "Old LIFO layer (newer)", "Purchases this year"]), ["Units sold", E(sold)],
          ["Current purchase cost per unit", usd(repl, 2)]],
        a, "$", 0,
        [`Ventes ${F(sold)} > achats ${F(purchased)} : ${F(sold - purchased)} unités sortent des anciennes couches LIFO.`,
          `COGS LIFO = ${layerText(used)} = ${D(costOf(used))}.`,
          `Coût des couches liquidées = ${layerText(liquidated)} = ${D(costOf(liquidated))} contre ${F(sold - purchased)} × ${D(repl)} = ${D((sold - purchased) * repl)} au coût actuel.`,
          `Marge brute gonflée de ${D(a)} : profit non récurrent.`]);
    })(),
    (() => {
      const ls: Layer[] = [[400, 15], [600, 18], [400, 21], [600, 24]];
      const sold = 1_500, price = 35, sga = 6_000, repl = 25;
      const unit = costOf(ls) / unitsOf(ls);
      const cogs = unit * sold;
      const rev = sold * price;
      const a = ((rev - cogs) / rev) * 100;
      return q("fsa-inv-d2", "difficile", "Gross profit margin under the weighted average cost method?",
        [...layerRows(ls, ["Beginning inventory", "Purchase 1", "Purchase 2", "Purchase 3"]), ["Units sold", E(sold)],
          ["Selling price per unit", usd(price, 2)], ["SG&A expenses", usd(sga)], ["Year-end replacement cost per unit", usd(repl, 2)]],
        a, "%", 2,
        [`Coût moyen = ${D(costOf(ls))} / ${F(unitsOf(ls))} = ${D(unit, 2)}.`,
          `COGS = ${F(sold)} × ${D(unit, 2)} = ${D(cogs)} ; CA = ${D(rev)}.`,
          `Marge brute = (${D(rev)} − ${D(cogs)}) / ${D(rev)} = ${Pa(a)}.`,
          "Les SG&A et le coût de remplacement ne servent pas : données-pièges."]);
    })(),
    (() => {
      const lifoNi = 1_500_000, resBeg = 300_000, resEnd = 420_000, t = 0.25;
      const a = lifoNi + (resEnd - resBeg) * (1 - t);
      return q("fsa-inv-d3", "difficile", "Net income restated to FIFO?",
        [["Net income (LIFO)", usd(lifoNi)], ["LIFO reserve, beginning / end of year", lst([usd(resBeg), usd(resEnd)])], ["Tax rate", pc(t)]],
        a, "$", 0,
        [`COGS FIFO plus bas de la hausse de la reserve : ${D(resEnd)} − ${D(resBeg)} = ${D(resEnd - resBeg)}.`,
          `Effet après impôt = ${D(resEnd - resBeg)} × (1 − ${F(t)}) = ${D((resEnd - resBeg) * (1 - t))}.`,
          `RN FIFO = ${D(lifoNi)} + ${D((resEnd - resBeg) * (1 - t))} = ${D(a)}.`]);
    })(),
    (() => {
      const lifoCogs = 6_000_000, invBeg = 900_000, resBeg = 200_000, invEnd = 1_100_000, resEnd = 300_000;
      const fifoCogs = lifoCogs - (resEnd - resBeg);
      const avgInv = avg(invBeg + resBeg, invEnd + resEnd);
      const a = fifoCogs / avgInv;
      return q("fsa-inv-d4", "difficile", "Inventory turnover restated to FIFO (average inventory)?",
        [["COGS (LIFO)", usd(lifoCogs)], ["LIFO inventory, beginning / end", lst([usd(invBeg), usd(invEnd)])],
          ["LIFO reserve, beginning / end", lst([usd(resBeg), usd(resEnd)])]],
        a, "x", 2,
        [`COGS FIFO = ${D(lifoCogs)} − (${D(resEnd)} − ${D(resBeg)}) = ${D(fifoCogs)}.`,
          `Stocks FIFO = LIFO + reserve : ${D(invBeg + resBeg)} au début, ${D(invEnd + resEnd)} à la fin ; moyenne = ${D(avgInv)}.`,
          `Rotation FIFO = ${D(fifoCogs)} / ${D(avgInv)} = ${F(a, 2)}x (plus basse qu'en LIFO, ${F(lifoCogs / avg(invBeg, invEnd), 2)}x).`]);
    })(),
    (() => {
      const ls: Layer[] = [[600, 12], [800, 13], [700, 15], [900, 16]];
      const sold = 2_200, price = 25;
      const fe = fifoEnd(ls, sold);
      const le = lifoEnd(ls, sold);
      const a = costOf(fe) - costOf(le);
      return q("fsa-inv-d5", "difficile", "Difference between FIFO and LIFO ending inventory?",
        [...layerRows(ls, ["Beginning inventory", "February purchase", "June purchase", "October purchase"]), ["Units sold", E(sold)],
          ["Selling price per unit", usd(price, 2)]],
        a, "$", 0,
        [`Unités restantes = ${F(unitsOf(ls))} − ${F(sold)} = ${F(unitsOf(fe))}.`,
          `Stock FIFO (achats récents) = ${layerText(fe)} = ${D(costOf(fe))}.`,
          `Stock LIFO (couches anciennes) = ${layerText(le)} = ${D(costOf(le))}.`,
          `Écart = ${D(a)} (c'est la LIFO reserve si les couches LIFO datent de cette année) ; le prix de vente est inutile.`]);
    })(),
  ],
};

/* ────────────────────────── 4 · Stocks : NRV et LCM ────────────────────────── */

/** US GAAP (LIFO ou méthode du détail) : market = coût de remplacement borné entre NRV − marge normale et NRV. */
const lcmMarket = (repl: number, nrv: number, margin: number): number => Math.min(nrv, Math.max(nrv - margin, repl));

const INVENTORY_NRV: CalcType = {
  key: "inventory-nrv",
  topic: "fsa",
  name: "Stocks : dépréciation à la valeur nette de réalisation (NRV, LCM)",
  tier: "annexe",
  source: "LM 6 · Analysis of Inventories",
  formulas: [
    "IFRS (et US GAAP hors LIFO) : stock = min(coût ; NRV), avec NRV = prix de vente estimé − coûts d'achèvement − coûts de vente",
    "US GAAP en LIFO ou méthode du détail : stock = min(coût ; market), market = coût de remplacement borné entre NRV − marge normale et NRV",
    "Dépréciation = valeur comptable − nouvelle valeur (en général dans le COGS)",
    "Reprise : permise en IFRS dans la limite de la dépréciation initiale ; interdite en US GAAP",
  ],
  traps: [
    "Le coût de remplacement ne sert qu'au LCM (US GAAP, LIFO) ; en IFRS seule la NRV compte.",
    "Une reprise IFRS ne peut jamais porter le stock au-dessus de son coût d'origine.",
    "Le test se fait article par article : un gain sur un produit ne compense pas une perte sur un autre.",
  ],
  questions: [
    (() => {
      const cost = 500_000, price = 520_000, sell = 40_000;
      const nrv = price - sell;
      const a = Math.max(0, cost - nrv);
      return q("fsa-nrv-f1", "facile", "Inventory write-down under IFRS?",
        [["Inventory cost", usd(cost)], ["Estimated selling price", usd(price)], ["Estimated selling costs", usd(sell)]],
        a, "$", 0,
        [`NRV = ${D(price)} − ${D(sell)} = ${D(nrv)}.`, `NRV < coût : dépréciation = ${D(cost)} − ${D(nrv)} = ${D(a)}.`]);
    })(),
    (() => {
      const price = 85, comp = 10, sell = 5;
      const a = price - comp - sell;
      return q("fsa-nrv-f2", "facile", "Net realizable value per unit?",
        [["Estimated selling price per unit", usd(price, 2)], ["Estimated completion costs per unit", usd(comp, 2)], ["Estimated selling costs per unit", usd(sell, 2)]],
        a, "$", 2,
        ["NRV = prix de vente estimé − coûts d'achèvement − coûts de vente.", `= ${F(price)} − ${F(comp)} − ${F(sell)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const units = 2_000, cost = 150, price = 160, sell = 18;
      const nrv = price - sell;
      const a = units * Math.min(cost, nrv);
      return q("fsa-nrv-f3", "facile", "Carrying value of the inventory under IFRS?",
        [["Units in inventory", E(units)], ["Cost per unit", usd(cost, 2)], ["Selling price per unit", usd(price, 2)], ["Selling costs per unit", usd(sell, 2)]],
        a, "$", 0,
        [`NRV par unité = ${D(price)} − ${D(sell)} = ${D(nrv)} < coût ${D(cost)}.`,
          `Valeur au bilan = ${F(units)} × ${D(Math.min(cost, nrv))} = ${D(a)}.`]);
    })(),
    (() => {
      const cost = 105, nrv = 100, margin = 15, repl = 92;
      const market = lcmMarket(repl, nrv, margin);
      const a = Math.min(cost, market);
      return q("fsa-nrv-f4", "facile", "Carrying value per unit under lower of cost or market (U.S. GAAP, LIFO)?",
        [["Cost per unit", usd(cost, 2)], ["Net realizable value per unit", usd(nrv, 2)], ["Normal profit margin per unit", usd(margin, 2)],
          ["Replacement cost per unit", usd(repl, 2)]],
        a, "$", 2,
        [`Fourchette du market : NRV − marge = ${D(nrv - margin)} à NRV = ${D(nrv)}.`,
          `Coût de remplacement ${D(repl)} dans la fourchette : market = ${D(market)}.`,
          `Valeur = min(coût ${D(cost)} ; market ${D(market)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const cost = 400_000, written = 360_000, nrvNow = 420_000;
      const a = Math.min(nrvNow, cost) - written;
      return q("fsa-nrv-f5", "facile", "Amount of the write-down reversal recognized this year under IFRS?",
        [["Original cost", usd(cost)], ["Carrying value after last year's write-down", usd(written)], ["Net realizable value this year", usd(nrvNow)]],
        a, "$", 0,
        [`La reprise est plafonnée au coût d'origine : nouvelle valeur = min(${D(nrvNow)} ; ${D(cost)}) = ${D(Math.min(nrvNow, cost))}.`,
          `Reprise = ${D(Math.min(nrvNow, cost))} − ${D(written)} = ${D(a)} (réduit le COGS de l'année).`]);
    })(),
    (() => {
      const units = 5_000, cost = 68, price = 70, sell = 6, margin = 8, repl = 66;
      const nrv = price - sell;
      const market = lcmMarket(repl, nrv, margin);
      const a = units * Math.max(0, cost - Math.min(cost, market));
      return q("fsa-nrv-m1", "moyen", "Total inventory write-down under lower of cost or market (U.S. GAAP, LIFO)?",
        [["Units in inventory", E(units)], ["Cost per unit", usd(cost, 2)], ["Selling price per unit", usd(price, 2)], ["Selling costs per unit", usd(sell, 2)],
          ["Normal profit margin per unit", usd(margin, 2)], ["Replacement cost per unit", usd(repl, 2)]],
        a, "$", 0,
        [`NRV = ${D(price)} − ${D(sell)} = ${D(nrv)} ; plancher = ${D(nrv)} − ${D(margin)} = ${D(nrv - margin)}.`,
          `Remplacement ${D(repl)} > NRV : market plafonné à ${D(market)}.`,
          `Dépréciation = ${F(units)} × (${D(cost)} − ${D(market)}) = ${D(a)}.`]);
    })(),
    (() => {
      const cost = 140, price = 150, sell = 14, margin = 10, repl = 120;
      const nrv = price - sell;
      const market = lcmMarket(repl, nrv, margin);
      const a = Math.min(cost, market);
      return q("fsa-nrv-m2", "moyen", "Carrying value per unit under lower of cost or market (U.S. GAAP, LIFO)?",
        [["Cost per unit", usd(cost, 2)], ["Selling price per unit", usd(price, 2)], ["Selling costs per unit", usd(sell, 2)],
          ["Normal profit margin per unit", usd(margin, 2)], ["Replacement cost per unit", usd(repl, 2)]],
        a, "$", 2,
        [`NRV = ${D(price)} − ${D(sell)} = ${D(nrv)} ; plancher = ${D(nrv)} − ${D(margin)} = ${D(nrv - margin)}.`,
          `Remplacement ${D(repl)} < plancher : market = ${D(market)}.`,
          `Valeur = min(${D(cost)} ; ${D(market)}) = ${D(a, 2)}.`]);
    })(),
    (() => {
      const price = 2_800_000, disp = 60_000, comp = 180_000, cost = 2_640_000, repl = 2_700_000;
      const nrv = price - disp - comp;
      const a = Math.max(0, cost - nrv);
      return q("fsa-nrv-m3", "moyen", "Inventory write-down for an IFRS reporter using FIFO?",
        [["Estimated selling price", usd(price)], ["Estimated disposal costs", usd(disp)], ["Estimated completion costs", usd(comp)],
          ["Original FIFO cost", usd(cost)], ["Replacement cost", usd(repl)]],
        a, "$", 0,
        [`NRV = ${D(price)} − ${D(disp)} − ${D(comp)} = ${D(nrv)}.`,
          `Dépréciation = ${D(cost)} − ${D(nrv)} = ${D(a)} ; le coût de remplacement ne sert pas en IFRS.`]);
    })(),
    (() => {
      const rev = 1_000_000, cogs0 = 640_000, wd = 25_000;
      const a = ((rev - cogs0 - wd) / rev) * 100;
      return q("fsa-nrv-m4", "moyen", "Gross profit margin after the write-down (reported in cost of sales)?",
        [["Revenue", usd(rev)], ["Cost of sales before the write-down", usd(cogs0)], ["Inventory write-down to NRV", usd(wd)]],
        a, "%", 1,
        [`COGS publié = ${D(cogs0)} + ${D(wd)} = ${D(cogs0 + wd)}.`,
          `Marge brute = (${D(rev)} − ${D(cogs0 + wd)}) / ${D(rev)} = ${Pa(a, 1)} (contre ${P((rev - cogs0) / rev, 1)} sans dépréciation).`]);
    })(),
    (() => {
      const cost = 900_000, sell = 45_000, mv1 = 920_000, mv2 = 930_000;
      const nrv1 = mv1 - sell, nrv2 = mv2 - sell;
      const a = Math.min(cost, nrv2);
      return q("fsa-nrv-m5", "moyen", "Carrying value of the inventory after the price recovery (IFRS)?",
        [["Cost", usd(cost)], ["Estimated selling costs", usd(sell)], ["Market value at year-end", usd(mv1)], ["Market value one month later (still unsold)", usd(mv2)]],
        a, "$", 0,
        [`Fin d'exercice : NRV = ${D(mv1)} − ${D(sell)} = ${D(nrv1)} → dépréciation de ${D(cost - nrv1)}.`,
          `Un mois plus tard : NRV = ${D(mv2)} − ${D(sell)} = ${D(nrv2)}, toujours sous le coût.`,
          `Reprise partielle de ${D(a - nrv1)} : valeur = ${D(a)}.`]);
    })(),
    (() => {
      const cost = 600_000, nrv = 560_000, margin = 50_000, repl = 530_000;
      const market = lcmMarket(repl, nrv, margin);
      const wdLcm = cost - Math.min(cost, market);
      const wdNrv = cost - Math.min(cost, nrv);
      const a = wdLcm - wdNrv;
      return q("fsa-nrv-d1", "difficile", "How much larger is the write-down under lower of cost or market than under lower of cost or NRV?",
        [["Inventory cost", usd(cost)], ["Net realizable value", usd(nrv)], ["Normal profit margin", usd(margin)], ["Replacement cost", usd(repl)]],
        a, "$", 0,
        [`Lower of cost or NRV : dépréciation = ${D(cost)} − ${D(nrv)} = ${D(wdNrv)}.`,
          `LCM : fourchette ${D(nrv - margin)} à ${D(nrv)} ; remplacement ${D(repl)} dedans → market = ${D(market)}.`,
          `Dépréciation LCM = ${D(cost)} − ${D(market)} = ${D(wdLcm)}.`,
          `Écart = ${D(a)}.`]);
    })(),
    (() => {
      const items: [string, number, number][] = [["Product A", 120_000, 135_000], ["Product B", 80_000, 62_000], ["Product C", 50_000, 47_500]];
      const wds = items.map(([, c, n]) => Math.max(0, c - n));
      const a = sum(wds);
      return q("fsa-nrv-d2", "difficile", "Total inventory write-down under IFRS (item-by-item)?",
        items.map(([name, c, n]) => [name, `cost ${usd(c)} / NRV ${usd(n)}`] as Row),
        a, "$", 0,
        [...items.map(([name, c, n], i) => `${name} : ${wds[i] > 0 ? `${D(c)} − ${D(n)} = ${D(wds[i])}` : "NRV > coût, rien à déprécier"}.`),
          `Total = ${D(a)} : l'excédent de NRV du produit A ne compense pas les pertes des autres.`]);
    })(),
    (() => {
      const cogs0 = 2_400_000, wd = 60_000, beg = 500_000, end0 = 460_000;
      const cogs = cogs0 + wd, end = end0 - wd;
      const a = cogs / avg(beg, end);
      return q("fsa-nrv-d3", "difficile", "Inventory turnover after the write-down (charged to cost of sales)?",
        [["COGS before the write-down", usd(cogs0)], ["Write-down to NRV at year-end", usd(wd)], ["Beginning inventory", usd(beg)],
          ["Ending inventory before the write-down", usd(end0)]],
        a, "x", 2,
        [`COGS = ${D(cogs0)} + ${D(wd)} = ${D(cogs)} ; stock final = ${D(end0)} − ${D(wd)} = ${D(end)}.`,
          `Stock moyen = (${D(beg)} + ${D(end)}) / 2 = ${D(avg(beg, end))}.`,
          `Rotation = ${D(cogs)} / ${D(avg(beg, end))} = ${F(a, 2)}x : la dépréciation améliore la rotation.`]);
    })(),
    (() => {
      const units = 3_000, price = 120, comp = 15, commRate = 0.05, ship = 4, cost = 98;
      const comm = price * commRate;
      const nrv = price - comp - comm - ship;
      const a = units * Math.max(0, cost - nrv);
      return q("fsa-nrv-d4", "difficile", "Total inventory write-down under IFRS?",
        [["Units in inventory", E(units)], ["Cost per unit", usd(cost, 2)], ["Expected selling price per unit", usd(price, 2)],
          ["Completion costs per unit", usd(comp, 2)], ["Sales commission", `${pc(commRate)} of selling price`], ["Shipping cost per unit sold", usd(ship, 2)]],
        a, "$", 0,
        [`Commission = ${P(commRate)} × ${D(price)} = ${D(comm, 2)}.`,
          `NRV = ${D(price)} − ${D(comp)} − ${D(comm, 2)} − ${D(ship)} = ${D(nrv, 2)} < coût ${D(cost)}.`,
          `Dépréciation = ${F(units)} × (${D(cost)} − ${D(nrv, 2)}) = ${D(a)}.`]);
    })(),
    (() => {
      const cost = 400_000, written = 360_000, nrvNow = 430_000, cogs0 = 1_500_000;
      const rev = Math.min(nrvNow, cost) - written;
      const a = cogs0 - rev;
      return q("fsa-nrv-d5", "difficile", "Reported cost of sales this year under IFRS?",
        [["Original cost of the inventory", usd(cost)], ["Carrying value after last year's write-down", usd(written)],
          ["Net realizable value at this year-end (still held)", usd(nrvNow)], ["Cost of sales before any reversal", usd(cogs0)]],
        a, "$", 0,
        [`Reprise plafonnée au coût : min(${D(nrvNow)} ; ${D(cost)}) − ${D(written)} = ${D(rev)}.`,
          `La reprise réduit le coût des ventes : ${D(cogs0)} − ${D(rev)} = ${D(a)}.`,
          "En US GAAP, aucune reprise ne serait permise."]);
    })(),
  ],
};

/* ────────────────────────── 5 · Capitalisation et intérêts capitalisés ────────────────────────── */

const CAPITALIZATION: CalcType = {
  key: "capitalization",
  topic: "fsa",
  name: "Capitaliser ou passer en charges, intérêts capitalisés",
  tier: "annexe",
  source: "LM 2 · Analyzing Income Statements",
  formulas: [
    "Coût capitalisé = prix d'achat + coûts nécessaires à la mise en service (transport, installation, taxes non récupérables)",
    "En charges : formation, réparations, entretien ; capitalisé : rénovation qui prolonge la durée de vie",
    "Capitaliser : sortie en CFI puis amortissement ; passer en charges : sortie en CFO et résultat plus bas l'année 1",
    "Couverture des intérêts ajustée = (EBIT + amortissement des intérêts capitalisés) / (charge d'intérêts + intérêts capitalisés)",
  ],
  traps: [
    "Les intérêts capitalisés sortent en CFI, pas en CFO : le CFO publié est flatté.",
    "La formation du personnel n'est jamais capitalisée.",
    "Sur toute la vie de l'actif, la charge totale et le cash total sont identiques ; seul le calendrier change.",
  ],
  questions: [
    (() => {
      const price = 180_000, freight = 6_000, install = 9_000, training = 4_000;
      const a = price + freight + install;
      return q("fsa-cap-f1", "facile", "Amount capitalized for the new machine?",
        [["Purchase price", usd(price)], ["Freight", usd(freight)], ["Installation", usd(install)], ["Staff training on the machine", usd(training)]],
        a, "$", 0,
        ["On capitalise tout ce qui est nécessaire pour rendre l'actif utilisable ; la formation est une charge.",
          `Coût capitalisé = ${D(price)} + ${D(freight)} + ${D(install)} = ${D(a)}.`]);
    })(),
    (() => {
      const cost = 120_000, salv = 20_000, life = 5;
      const a = (cost - salv) / life;
      return q("fsa-cap-f2", "facile", "Annual straight-line depreciation of the capitalized asset?",
        [["Capitalized cost", usd(cost)], ["Salvage value", usd(salv)], ["Useful life", `${life} years`]],
        a, "$", 0,
        [`Dotation = (${D(cost)} − ${D(salv)}) / ${life} = ${D(a)}.`]);
    })(),
    (() => {
      const ebit = 300, ie = 60, cap = 15;
      const a = ebit / (ie + cap);
      return q("fsa-cap-f3", "facile", "Interest coverage ratio adjusted for capitalized interest?",
        [["EBIT ($ millions)", E(ebit)], ["Interest expense ($ millions)", E(ie)], ["Interest capitalized this year ($ millions)", E(cap)]],
        a, "x", 2,
        ["Les intérêts capitalisés sont des intérêts payés : on les ajoute au dénominateur.",
          `Couverture = ${F(ebit)} / (${F(ie)} + ${F(cap)}) = ${F(a, 2)}x (contre ${F(ebit / ie, 2)}x publié).`]);
    })(),
    (() => {
      const loan = 10_000_000, r = 0.06;
      const a = loan * r;
      return q("fsa-cap-f4", "facile", "Interest capitalized this year?",
        [["Construction loan outstanding all year", usd(loan)], ["Interest rate", pc(r)], ["Asset under construction all year (for own use)", "Yes"]],
        a, "$", 0,
        ["Les intérêts encourus pendant la construction d'un actif pour usage propre sont capitalisés.",
          `Intérêts capitalisés = ${D(loan)} × ${P(r)} = ${D(a)}.`]);
    })(),
    (() => {
      const cfo = 900, capd = 120;
      const a = cfo - capd;
      return q("fsa-cap-f5", "facile", "CFO if the expenditure had been expensed instead of capitalized, in $ millions? (Ignore taxes.)",
        [["Reported CFO ($ millions)", E(cfo)], ["Expenditure capitalized this year, reported in CFI ($ millions)", E(capd)]],
        a, "$", 0,
        ["Passée en charges, la dépense sortirait du CFO au lieu du CFI.", `CFO = ${F(cfo)} − ${F(capd)} = ${M(a)}.`]);
    })(),
    (() => {
      const cost = 40_000, life = 4;
      const dep = cost / life;
      const a = cost - dep;
      return q("fsa-cap-m1", "moyen", "How much higher is Year-1 pretax income if the cost is capitalized rather than expensed?",
        [["Equipment cost (start of Year 1)", usd(cost)], ["Useful life", `${life} years`], ["Salvage value / depreciation method", "$0 / straight-line"]],
        a, "$", 0,
        [`Capitalisé : charge de l'année 1 = dotation = ${D(cost)} / ${life} = ${D(dep)}.`,
          `En charges : ${D(cost)} d'un coup.`,
          `Résultat avant impôt plus élevé de ${D(cost)} − ${D(dep)} = ${D(a)} en cas de capitalisation.`]);
    })(),
    (() => {
      const rev = 200_000, other = 120_000, cost = 30_000, life = 3, t = 0.25;
      const a = (rev - other - cost) * (1 - t);
      return q("fsa-cap-m2", "moyen", "Year-1 net income if the equipment cost is expensed?",
        [["Revenue", usd(rev)], ["Other operating expenses", usd(other)], ["Equipment cost (start of Year 1)", usd(cost)],
          ["Useful life if capitalized", `${life} years, straight-line`], ["Tax rate (expense is tax deductible)", pc(t)]],
        a, "$", 0,
        [`Résultat avant impôt = ${D(rev)} − ${D(other)} − ${D(cost)} = ${D(rev - other - cost)}.`,
          `RN = ${D(rev - other - cost)} × (1 − ${F(t)}) = ${D(a)}.`,
          `(Capitalisé : ${D((rev - other - cost / life) * (1 - t))}.)`]);
    })(),
    (() => {
      const ebit = 240, ie = 50, cap = 30, depCap = 12;
      const a = (ebit + depCap) / (ie + cap);
      return q("fsa-cap-m3", "moyen", "Interest coverage ratio adjusted for capitalized interest?",
        [["EBIT ($ millions)", E(ebit)], ["Interest expense ($ millions)", E(ie)], ["Interest capitalized this year ($ millions)", E(cap)],
          ["Depreciation of previously capitalized interest ($ millions)", E(depCap)]],
        a, "x", 2,
        [`EBIT ajusté = ${F(ebit)} + ${F(depCap)} (amortissement d'intérêts déjà capitalisés) = ${F(ebit + depCap)}.`,
          `Intérêts totaux = ${F(ie)} + ${F(cap)} = ${F(ie + cap)}.`,
          `Couverture ajustée = ${F(ebit + depCap)} / ${F(ie + cap)} = ${F(a, 2)}x (publiée : ${F(ebit / ie, 2)}x).`]);
    })(),
    (() => {
      const price = 300_000, freight = 8_000, install = 12_000, training = 5_000, maint = 20_000, rebuild = 60_000;
      const a = price + freight + install + rebuild;
      return q("fsa-cap-m4", "moyen", "Total amount capitalized over the equipment's life?",
        [["Purchase price", usd(price)], ["Freight", usd(freight)], ["Installation", usd(install)], ["Employee training", usd(training)],
          ["Repairs and maintenance over the life", usd(maint)], ["Rebuild of the motors that extends the useful life", usd(rebuild)]],
        a, "$", 0,
        ["Capitalisés : prix, transport, installation et la rénovation qui prolonge la vie de l'actif.",
          "En charges : formation et entretien courant.",
          `Total capitalisé = ${D(price)} + ${D(freight)} + ${D(install)} + ${D(rebuild)} = ${D(a)}.`]);
    })(),
    (() => {
      const cfo = 140, cfi = -95, cap = 25;
      const a = cfi + cap;
      return q("fsa-cap-m5", "moyen", "CFI if the capitalized interest had been expensed, in $ millions? (All interest paid; ignore taxes.)",
        [["Reported CFO ($ millions)", E(cfo)], ["Reported CFI ($ millions)", E(cfi)], ["Interest capitalized and paid this year ($ millions)", E(cap)]],
        a, "$", 0,
        ["Capitalisés, les intérêts payés figurent en CFI ; passés en charges, ils iraient en CFO.",
          `CFI = ${F(cfi)} + ${F(cap)} = ${M(a)} (et le CFO tomberait à ${M(cfo - cap)}).`]);
    })(),
    (() => {
      const opInc = 400, capDev = 50, amort = 18;
      const a = opInc - capDev + amort;
      return q("fsa-cap-d1", "difficile", "Operating income restated as if all development costs were expensed, in $ millions?",
        [["Reported operating income, IFRS ($ millions)", E(opInc)], ["Development costs capitalized this year ($ millions)", E(capDev)],
          ["Amortization of development costs capitalized in prior years ($ millions)", E(amort)]],
        a, "$", 0,
        [`On passe en charges les coûts capitalisés cette année : −${F(capDev)}.`,
          `On retire l'amortissement des coûts capitalisés plus tôt (déjà passés en charges dans ce retraitement) : +${F(amort)}.`,
          `Résultat opérationnel retraité = ${F(opInc)} − ${F(capDev)} + ${F(amort)} = ${M(a)}.`]);
    })(),
    (() => {
      const ebit = 520, ie = 90, cap = 40, depCap = 15, div = 60, t = 0.25;
      const a = (ebit + depCap) / (ie + cap);
      return q("fsa-cap-d2", "difficile", "Interest coverage ratio adjusted for capitalized interest?",
        [["EBIT ($ millions)", E(ebit)], ["Interest expense ($ millions)", E(ie)], ["Interest capitalized this year ($ millions)", E(cap)],
          ["Depreciation of previously capitalized interest ($ millions)", E(depCap)], ["Dividends paid ($ millions)", E(div)], ["Tax rate", pc(t)]],
        a, "x", 2,
        [`EBIT ajusté = ${F(ebit)} + ${F(depCap)} = ${F(ebit + depCap)} ; intérêts totaux = ${F(ie)} + ${F(cap)} = ${F(ie + cap)}.`,
          `Couverture ajustée = ${F(ebit + depCap)} / ${F(ie + cap)} = ${F(a, 2)}x, contre ${F(ebit / ie, 2)}x publié.`,
          "Dividendes et taux d'impôt n'interviennent pas : données-pièges."]);
    })(),
    (() => {
      const cost = 90_000, life = 3, t = 0.3;
      const dep = cost / life;
      const a = dep * (1 - t);
      return q("fsa-cap-d3", "difficile", "How much higher is Year-2 net income if the cost was expensed in Year 1 rather than capitalized?",
        [["Software development cost (start of Year 1)", usd(cost)], ["Amortization if capitalized", `straight-line over ${life} years`], ["Tax rate", pc(t)]],
        a, "$", 0,
        [`Capitalisé : l'année 2 supporte un amortissement de ${D(cost)} / ${life} = ${D(dep)}.`,
          "Passé en charges en année 1 : plus aucune charge en année 2.",
          `RN de l'année 2 plus élevé de ${D(dep)} × (1 − ${F(t)}) = ${D(a)} avec la passation en charges.`]);
    })(),
    (() => {
      const cost = 80_000, life = 4, t = 0.25;
      const dep = cost / life;
      const a = (cost - dep) * t;
      return q("fsa-cap-d4", "difficile", "How much higher is Year-1 total cash flow if the cost is expensed rather than capitalized?",
        [["Equipment cost (start of Year 1)", usd(cost)], ["Useful life if capitalized", `${life} years, straight-line, no salvage`],
          ["Tax rate (same treatment for tax and reporting)", pc(t)]],
        a, "$", 0,
        [`La sortie de ${D(cost)} est la même dans les deux cas (en CFO ou en CFI) ; seule l'économie d'impôt diffère.`,
          `Déduction de l'année 1 : ${D(cost)} en charges contre ${D(dep)} d'amortissement.`,
          `Cash supplémentaire = (${D(cost)} − ${D(dep)}) × ${P(t)} = ${D(a)}.`]);
    })(),
    (() => {
      const cfo = 600, intCfo = 40, capInt = 20, taxes = 100;
      const cfoAdj = cfo - capInt;
      const intTot = intCfo + capInt;
      const a = (cfoAdj + intTot + taxes) / intTot;
      return q("fsa-cap-d5", "difficile", "Cash flow interest coverage ratio after reclassifying capitalized interest, (CFO + interest paid + taxes paid) / interest paid?",
        [["Reported CFO ($ millions)", E(cfo)], ["Interest paid, included in CFO ($ millions)", E(intCfo)],
          ["Capitalized interest paid, included in CFI ($ millions)", E(capInt)], ["Income taxes paid ($ millions)", E(taxes)]],
        a, "x", 2,
        [`CFO retraité = ${F(cfo)} − ${F(capInt)} = ${F(cfoAdj)} ; intérêts payés totaux = ${F(intCfo)} + ${F(capInt)} = ${F(intTot)}.`,
          `Couverture = (${F(cfoAdj)} + ${F(intTot)} + ${F(taxes)}) / ${F(intTot)} = ${F(a, 2)}x.`,
          `Sans retraitement : (${F(cfo)} + ${F(intCfo)} + ${F(taxes)}) / ${F(intCfo)} = ${F((cfo + intCfo + taxes) / intCfo, 2)}x, trop flatteur.`]);
    })(),
  ],
};

/* ────────────────────────── 6 · Dépréciation d'actifs et cession ────────────────────────── */

const IMPAIRMENT: CalcType = {
  key: "impairment-derecognition",
  topic: "fsa",
  name: "Dépréciation d'actifs (impairment) et cession (derecognition)",
  tier: "annexe",
  source: "LM 7 · Analysis of Long-Term Assets",
  formulas: [
    "Valeur comptable = coût − amortissements cumulés − dépréciations passées",
    "IFRS : perte = valeur comptable − valeur recouvrable, valeur recouvrable = max(juste valeur − coûts de vente ; valeur d'utilité)",
    "US GAAP : test si valeur comptable > flux futurs NON actualisés ; perte = valeur comptable − juste valeur (ou VA des flux)",
    "Actif détenu en vue de la vente : perte = valeur comptable − (juste valeur − coûts de vente)",
    "Cession : gain (perte) = prix de cession − valeur comptable ; abandon : perte = valeur comptable",
  ],
  traps: [
    "US GAAP : les flux non actualisés servent au test, pas à la mesure de la perte.",
    "IFRS : reprise possible, plafonnée à la perte initiale ; US GAAP : pas de reprise pour les actifs détenus pour usage.",
  ],
  questions: [
    (() => {
      const carrying = 500_000, fvlcs = 440_000, viu = 465_000;
      const rec = Math.max(fvlcs, viu);
      const a = Math.max(0, carrying - rec);
      return q("fsa-imp-f1", "facile", "Impairment loss under IFRS?",
        [["Carrying value", usd(carrying)], ["Fair value less costs to sell", usd(fvlcs)], ["Value in use", usd(viu)]],
        a, "$", 0,
        [`Valeur recouvrable = max(${D(fvlcs)} ; ${D(viu)}) = ${D(rec)}.`, `Perte = ${D(carrying)} − ${D(rec)} = ${D(a)}.`]);
    })(),
    (() => {
      const cost = 250_000, ad = 140_000, proceeds = 95_000;
      const a = proceeds - (cost - ad);
      return q("fsa-imp-f2", "facile", "Gain (loss) on the sale of the machine? (Enter a loss as a negative number.)",
        [["Original cost", usd(cost)], ["Accumulated depreciation", usd(ad)], ["Sale proceeds", usd(proceeds)]],
        a, "$", 0,
        [`Valeur comptable = ${D(cost)} − ${D(ad)} = ${D(cost - ad)}.`, `Résultat de cession = ${D(proceeds)} − ${D(cost - ad)} = ${D(a)} (perte).`]);
    })(),
    (() => {
      const carrying = 800, undisc = 760, fv = 700;
      const a = carrying > undisc ? carrying - fv : 0;
      return q("fsa-imp-f3", "facile", "Impairment loss under U.S. GAAP, in $ thousands?",
        [["Carrying value ($ thousands)", E(carrying)], ["Undiscounted expected future cash flows ($ thousands)", E(undisc)], ["Fair value ($ thousands)", E(fv)]],
        a, "$", 0,
        [`Test : valeur comptable ${F(carrying)} > flux non actualisés ${F(undisc)} → actif déprécié.`,
          `Perte = ${F(carrying)} − juste valeur ${F(fv)} = ${K(a)}.`]);
    })(),
    (() => {
      const cost = 60_000, ad = 45_000;
      const a = cost - ad;
      return q("fsa-imp-f4", "facile", "Loss recognized when the equipment is abandoned?",
        [["Original cost", usd(cost)], ["Accumulated depreciation", usd(ad)], ["Proceeds", "None (abandoned)"]],
        a, "$", 0,
        [`Sans produit de cession, la perte égale la valeur comptable : ${D(cost)} − ${D(ad)} = ${D(a)}.`]);
    })(),
    (() => {
      const cost = 150_000, ad = 90_000, loss = 12_000;
      const a = cost - ad - loss;
      return q("fsa-imp-f5", "facile", "Cash received from the sale?",
        [["Original cost", usd(cost)], ["Accumulated depreciation at the date of sale", usd(ad)], ["Loss recognized on the sale", usd(loss)]],
        a, "$", 0,
        [`Valeur comptable = ${D(cost)} − ${D(ad)} = ${D(cost - ad)}.`, `Prix = valeur comptable − perte = ${D(cost - ad)} − ${D(loss)} = ${D(a)}.`]);
    })(),
    (() => {
      const cost = 1_400_000, ad = 400_000, undisc = 1_050_000, fv = 920_000;
      const carrying = cost - ad;
      const a = carrying > undisc ? carrying - fv : 0;
      return q("fsa-imp-m1", "moyen", "Impairment loss under U.S. GAAP?",
        [["Original cost", usd(cost)], ["Accumulated depreciation", usd(ad)], ["Undiscounted expected future cash flows", usd(undisc)], ["Fair value", usd(fv)]],
        a, "$", 0,
        [`Valeur comptable = ${D(cost)} − ${D(ad)} = ${D(carrying)}.`,
          `Test de recouvrabilité : flux non actualisés ${D(undisc)} > ${D(carrying)} → pas de dépréciation.`,
          `Perte = ${D(a)}, même si la juste valeur (${D(fv)}) est inférieure.`]);
    })(),
    (() => {
      const cost = 600_000, ad = 100_000, fv = 470_000, sell = 15_000, viu = 480_000, undisc = 498_000;
      const carrying = cost - ad;
      const ifrs = Math.max(0, carrying - Math.max(fv - sell, viu));
      const gaap = carrying > undisc ? carrying - fv : 0;
      const a = gaap - ifrs;
      return q("fsa-imp-m2", "moyen", "Difference between the U.S. GAAP and IFRS impairment losses (U.S. GAAP minus IFRS)?",
        [["Original cost", usd(cost)], ["Accumulated depreciation", usd(ad)], ["Fair value", usd(fv)], ["Costs to sell", usd(sell)],
          ["Value in use (present value of cash flows)", usd(viu)], ["Undiscounted expected future cash flows", usd(undisc)]],
        a, "$", 0,
        [`Valeur comptable = ${D(carrying)}.`,
          `IFRS : valeur recouvrable = max(${D(fv - sell)} ; ${D(viu)}) = ${D(Math.max(fv - sell, viu))} → perte ${D(ifrs)}.`,
          `US GAAP : ${D(undisc)} < ${D(carrying)} → déprécié ; perte = ${D(carrying)} − ${D(fv)} = ${D(gaap)}.`,
          `Écart = ${D(gaap)} − ${D(ifrs)} = ${D(a)}.`]);
    })(),
    (() => {
      const cost = 800_000, ad = 320_000, rec = 360_000, remaining = 4;
      const carrying = cost - ad;
      const a = Math.min(carrying, rec) / remaining;
      return q("fsa-imp-m3", "moyen", "Annual depreciation after the impairment? (Straight-line, no salvage.)",
        [["Original cost", usd(cost)], ["Accumulated depreciation", usd(ad)], ["Recoverable amount (IFRS)", usd(rec)], ["Remaining useful life", `${remaining} years`]],
        a, "$", 0,
        [`Valeur comptable = ${D(carrying)} → perte = ${D(carrying - rec)} ; nouvelle base = ${D(rec)}.`,
          `Nouvelle dotation = ${D(rec)} / ${remaining} = ${D(a)} (contre ${D(carrying / remaining)} sans dépréciation).`]);
    })(),
    (() => {
      const carrying = 260_000, fv = 240_000, sell = 12_000;
      const a = Math.max(0, carrying - (fv - sell));
      return q("fsa-imp-m4", "moyen", "Impairment loss when the asset is reclassified as held for sale?",
        [["Carrying value", usd(carrying)], ["Fair value", usd(fv)], ["Costs to sell", usd(sell)]],
        a, "$", 0,
        [`Un actif détenu en vue de la vente est évalué au plus bas de sa valeur comptable et de (juste valeur − coûts de vente) = ${D(fv - sell)}.`,
          `Perte = ${D(carrying)} − ${D(fv - sell)} = ${D(a)} ; l'actif n'est plus amorti ensuite.`]);
    })(),
    (() => {
      const cost = 90_000, ad = 50_000, fvOld = 55_000;
      const a = fvOld - (cost - ad);
      return q("fsa-imp-m5", "moyen", "Gain (loss) recognized on the exchange of assets?",
        [["Old asset: original cost", usd(cost)], ["Old asset: accumulated depreciation", usd(ad)], ["Old asset: fair value", usd(fvOld)]],
        a, "$", 0,
        [`Valeur comptable de l'ancien actif = ${D(cost)} − ${D(ad)} = ${D(cost - ad)}.`,
          `Gain = juste valeur ${D(fvOld)} − ${D(cost - ad)} = ${D(a)} ; le nouvel actif est inscrit à ${D(fvOld)}.`]);
    })(),
    (() => {
      const carrying = 500_000, fvlcs1 = 430_000, fvlcs2 = 520_000;
      const loss = carrying - fvlcs1;
      const a = Math.min(fvlcs2 - fvlcs1, loss);
      return q("fsa-imp-d1", "difficile", "Gain recognized this year on the recovery in value of the asset held for sale?",
        [["Carrying value when reclassified as held for sale (last year)", usd(carrying)], ["Fair value less costs to sell, last year-end", usd(fvlcs1)],
          ["Fair value less costs to sell, this year-end", usd(fvlcs2)]],
        a, "$", 0,
        [`L'an dernier : perte = ${D(carrying)} − ${D(fvlcs1)} = ${D(loss)}.`,
          `Cette année, la valeur remonte de ${D(fvlcs2 - fvlcs1)}, mais la reprise est plafonnée à la perte initiale.`,
          `Gain = ${D(a)} : valeur au bilan ${D(fvlcs1 + a)} (pas ${D(fvlcs2)}).`]);
    })(),
    (() => {
      const cost = 2_000_000, ad = 900_000, imp = 200_000, proceeds = 850_000;
      const carrying = cost - ad - imp;
      const a = proceeds - carrying;
      return q("fsa-imp-d2", "difficile", "Gain (loss) on the sale? (Enter a loss as a negative number.)",
        [["Original cost", usd(cost)], ["Accumulated depreciation", usd(ad)], ["Impairment charge recognized two years ago", usd(imp)], ["Sale proceeds", usd(proceeds)]],
        a, "$", 0,
        [`Valeur comptable = ${D(cost)} − ${D(ad)} − ${D(imp)} = ${D(carrying)}.`,
          `Résultat de cession = ${D(proceeds)} − ${D(carrying)} = ${D(a)}.`,
          "Piège : oublier la dépréciation passée donnerait un gain fictif."]);
    })(),
    (() => {
      const ni = 120, imp = 40, ta = 1_500;
      const a = ((ni - imp) / (ta - imp)) * 100;
      return q("fsa-imp-d3", "difficile", "Return on assets after the impairment, using year-end total assets? (Ignore taxes.)",
        [["Net income before the impairment ($ millions)", E(ni)], ["Impairment charge ($ millions)", E(imp)], ["Year-end total assets before the impairment ($ millions)", E(ta)]],
        a, "%", 2,
        [`RN = ${F(ni)} − ${F(imp)} = ${F(ni - imp)} ; actif = ${F(ta)} − ${F(imp)} = ${F(ta - imp)}.`,
          `ROA = ${F(ni - imp)} / ${F(ta - imp)} = ${Pa(a)} (contre ${P(ni / ta, 2)} sans dépréciation) ; les années suivantes, le ROA sera plus élevé.`]);
    })(),
    (() => {
      const cost = 5_000_000, life = 10, used = 4, cf = 450_000, r = 0.08;
      const carrying = cost - (cost / life) * used;
      const n = life - used;
      const undisc = cf * n;
      const pvcf = annuityPV(cf, r, n);
      const a = undisc < carrying ? carrying - pvcf : 0;
      return q("fsa-imp-d4", "difficile", "Impairment loss under U.S. GAAP? (No reliable fair value is available.)",
        [["Original cost", usd(cost)], ["Useful life / years used", `${life} / ${used} (straight-line, no salvage)`],
          ["Expected cash flow per year, remaining life", usd(cf)], ["Discount rate", pc(r)]],
        a, "$", 0,
        [`Valeur comptable = ${D(cost)} − ${used} × ${D(cost / life)} = ${D(carrying)}.`,
          `Test : flux non actualisés = ${n} × ${D(cf)} = ${D(undisc)} < ${D(carrying)} → déprécié.`,
          `Sans juste valeur fiable, on prend la VA des flux : ${D(cf)} × [1 − ${F(1 + r)}^−${n}] / ${F(r)} = ${D(pvcf, 0)}.`,
          `Perte = ${D(carrying)} − ${D(pvcf, 0)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const carrying = 750_000, fv = 700_000, sell = 30_000, cf = 200_000, n = 4, r = 0.1;
      const viu = annuityPV(cf, r, n);
      const rec = Math.max(fv - sell, viu);
      const a = Math.max(0, carrying - rec);
      return q("fsa-imp-d5", "difficile", "Impairment loss under IFRS?",
        [["Carrying value", usd(carrying)], ["Fair value", usd(fv)], ["Costs to sell", usd(sell)],
          ["Expected cash flows from use", `${usd(cf)} per year for ${n} years`], ["Discount rate", pc(r)]],
        a, "$", 0,
        [`Valeur d'utilité = ${D(cf)} × [1 − ${F(1 + r)}^−${n}] / ${F(r)} = ${D(viu, 0)}.`,
          `Juste valeur − coûts de vente = ${D(fv - sell)}.`,
          `Valeur recouvrable = la plus haute = ${D(rec, 0)} ; perte = ${D(carrying)} − ${D(rec, 0)} = ${D(a, 0)}.`]);
    })(),
  ],
};

/* ────────────────────────── 7 · Âge des immobilisations ────────────────────────── */

const ASSET_AGE: CalcType = {
  key: "asset-age",
  topic: "fsa",
  name: "Âge moyen et durée de vie des immobilisations",
  tier: "annexe",
  source: "LM 7 · Analysis of Long-Term Assets",
  formulas: [
    "Âge moyen ≈ amortissements cumulés / dotation annuelle",
    "Durée de vie totale ≈ immobilisations brutes (coût historique) / dotation annuelle",
    "Durée de vie restante ≈ immobilisations nettes / dotation annuelle = durée totale − âge moyen",
    "Capex / dotation > 1 : l'entreprise renouvelle son outil plus vite qu'elle ne l'use",
  ],
  traps: [
    "Hypothèses : amortissement linéaire et valeur résiduelle nulle ; les terrains (non amortis) sont à retirer du brut.",
    "On utilise les soldes de fin d'exercice, sauf indication contraire.",
  ],
  questions: [
    (() => {
      const ad = 240, dep = 40;
      const a = ad / dep;
      return q("fsa-age-f1", "facile", "Estimated average age of PP&E?",
        [["Accumulated depreciation ($ millions)", E(ad)], ["Annual depreciation expense ($ millions)", E(dep)]],
        a, "years", 1,
        [`Âge moyen = ${F(ad)} / ${F(dep)} = ${F(a, 1)} ans.`]);
    })(),
    (() => {
      const gross = 900, dep = 60;
      const a = gross / dep;
      return q("fsa-age-f2", "facile", "Estimated total useful life of PP&E?",
        [["Gross PP&E (historical cost, $ millions)", E(gross)], ["Annual depreciation expense ($ millions)", E(dep)]],
        a, "years", 1,
        [`Durée de vie totale = ${F(gross)} / ${F(dep)} = ${F(a, 1)} ans.`]);
    })(),
    (() => {
      const gross = 500, ad = 200, dep = 25;
      const a = (gross - ad) / dep;
      return q("fsa-age-f3", "facile", "Estimated remaining useful life of PP&E?",
        [["Gross PP&E ($ millions)", E(gross)], ["Accumulated depreciation ($ millions)", E(ad)], ["Annual depreciation expense ($ millions)", E(dep)]],
        a, "years", 1,
        [`Immobilisations nettes = ${F(gross)} − ${F(ad)} = ${F(gross - ad)}.`, `Durée restante = ${F(gross - ad)} / ${F(dep)} = ${F(a, 1)} ans.`]);
    })(),
    (() => {
      const capex = 180, dep = 120;
      const a = capex / dep;
      return q("fsa-age-f4", "facile", "Ratio of capital expenditures to depreciation?",
        [["Capital expenditures ($ millions)", E(capex)], ["Depreciation expense ($ millions)", E(dep)]],
        a, "x", 2,
        [`Capex / dotation = ${F(capex)} / ${F(dep)} = ${F(a, 2)}x : l'outil est renouvelé plus vite qu'il ne s'use.`]);
    })(),
    (() => {
      const gross = 1_250, ad = 450, dep = 90;
      const a = ad / dep;
      return q("fsa-age-f5", "facile", "Estimated average age of PP&E?",
        [["Gross PP&E ($ millions)", E(gross)], ["Accumulated depreciation ($ millions)", E(ad)], ["Depreciation expense ($ millions)", E(dep)]],
        a, "years", 1,
        [`Âge moyen = amortissements cumulés / dotation = ${F(ad)} / ${F(dep)} = ${F(a, 1)} ans (le brut ne sert pas ici).`]);
    })(),
    (() => {
      const g0 = 410, ad0 = 130, g1 = 450, ad1 = 162, dep = 30;
      const a = (g1 - ad1) / dep;
      return q("fsa-age-m1", "moyen", "Estimated remaining useful life of PP&E at year-end?",
        [["Gross PP&E, beginning / end of year ($ millions)", lst([E(g0), E(g1)])], ["Accumulated depreciation, beginning / end ($ millions)", lst([E(ad0), E(ad1)])],
          ["Depreciation expense for the year ($ millions)", E(dep)]],
        a, "years", 1,
        [`On utilise les soldes de fin : nettes = ${F(g1)} − ${F(ad1)} = ${F(g1 - ad1)}.`, `Durée restante = ${F(g1 - ad1)} / ${F(dep)} = ${F(a, 1)} ans.`]);
    })(),
    (() => {
      const gross = 1_400, land = 200, ad = 480, dep = 80;
      const a = (gross - land) / dep;
      return q("fsa-age-m2", "moyen", "Estimated total useful life of depreciable PP&E?",
        [["Gross PP&E, including land ($ millions)", E(gross)], ["Land ($ millions)", E(land)], ["Accumulated depreciation ($ millions)", E(ad)],
          ["Depreciation expense ($ millions)", E(dep)]],
        a, "years", 1,
        [`Le terrain n'est pas amorti : brut amortissable = ${F(gross)} − ${F(land)} = ${F(gross - land)}.`,
          `Durée totale = ${F(gross - land)} / ${F(dep)} = ${F(a, 1)} ans.`]);
    })(),
    (() => {
      const adA = 300, depA = 50, adB = 210, depB = 70;
      const a = adA / depA - adB / depB;
      return q("fsa-age-m3", "moyen", "How many years older, on average, are Company A's assets than Company B's?",
        [["Company A: accumulated depreciation / depreciation expense ($ millions)", lst([E(adA), E(depA)])],
          ["Company B: accumulated depreciation / depreciation expense ($ millions)", lst([E(adB), E(depB)])]],
        a, "years", 1,
        [`Âge moyen A = ${F(adA)} / ${F(depA)} = ${F(adA / depA, 1)} ans ; B = ${F(adB)} / ${F(depB)} = ${F(adB / depB, 1)} ans.`,
          `Écart = ${F(a, 1)} ans : A devra investir plus tôt.`]);
    })(),
    (() => {
      const gross = 900, ad = 360, dep = 45;
      const a = (ad / gross) * 100;
      return q("fsa-age-m4", "moyen", "Average age as a percentage of total useful life?",
        [["Gross PP&E ($ millions)", E(gross)], ["Accumulated depreciation ($ millions)", E(ad)], ["Depreciation expense ($ millions)", E(dep)]],
        a, "%", 1,
        [`Âge moyen = ${F(ad)} / ${F(dep)} = ${F(ad / dep, 1)} ans ; durée totale = ${F(gross)} / ${F(dep)} = ${F(gross / dep, 1)} ans.`,
          `Part de la vie écoulée = ${F(ad / dep, 1)} / ${F(gross / dep, 1)} = ${Pa(a, 1)} (= cumulés / brut).`]);
    })(),
    (() => {
      const ad0 = 500, ad1 = 580, gross = 1_600;
      const dep = ad1 - ad0;
      const a = (gross - ad1) / dep;
      return q("fsa-age-m5", "moyen", "Estimated remaining useful life of PP&E? (No disposals this year.)",
        [["Accumulated depreciation, beginning / end ($ millions)", lst([E(ad0), E(ad1)])], ["Gross PP&E at year-end ($ millions)", E(gross)]],
        a, "years", 2,
        [`Sans cession, la dotation = hausse des cumulés = ${F(ad1)} − ${F(ad0)} = ${F(dep)}.`,
          `Nettes = ${F(gross)} − ${F(ad1)} = ${F(gross - ad1)} ; durée restante = ${F(gross - ad1)} / ${F(dep)} = ${F(a, 2)} ans.`]);
    })(),
    (() => {
      const ad0 = 620, ad1 = 650, adSold = 70, gross = 2_000;
      const dep = ad1 - ad0 + adSold;
      const a = ad1 / dep;
      return q("fsa-age-d1", "difficile", "Estimated average age of PP&E at year-end?",
        [["Accumulated depreciation, beginning / end ($ millions)", lst([E(ad0), E(ad1)])],
          ["Accumulated depreciation on assets sold during the year ($ millions)", E(adSold)], ["Gross PP&E at year-end ($ millions)", E(gross)]],
        a, "years", 1,
        [`Dotation = ${F(ad1)} − ${F(ad0)} + ${F(adSold)} (cumulés sortis avec l'actif cédé) = ${F(dep)}.`,
          `Âge moyen = ${F(ad1)} / ${F(dep)} = ${F(a, 1)} ans.`]);
    })(),
    (() => {
      const gross = 2_400, land = 240, ad = 1_620, dep = 180;
      const a = (gross - land - ad) / dep;
      return q("fsa-age-d2", "difficile", "Estimated remaining useful life of the depreciable assets?",
        [["Gross PP&E, including land ($ millions)", E(gross)], ["Land ($ millions)", E(land)], ["Accumulated depreciation ($ millions)", E(ad)],
          ["Depreciation expense ($ millions)", E(dep)]],
        a, "years", 1,
        [`Brut amortissable = ${F(gross)} − ${F(land)} = ${F(gross - land)} ; durée totale = ${F((gross - land) / dep, 1)} ans ; âge moyen = ${F(ad / dep, 1)} ans.`,
          `Durée restante = (${F(gross - land)} − ${F(ad)}) / ${F(dep)} = ${F(a, 1)} ans.`,
          `Piège : garder le terrain donnerait ${F((gross - ad) / dep, 1)} ans.`]);
    })(),
    (() => {
      const adB = 400, depB = 40, adE = 360, depE = 90;
      const a = (adB + adE) / (depB + depE);
      return q("fsa-age-d3", "difficile", "Estimated average age of total PP&E (all classes combined)?",
        [["Buildings: accumulated depreciation / depreciation ($ millions)", lst([E(adB), E(depB)])],
          ["Equipment: accumulated depreciation / depreciation ($ millions)", lst([E(adE), E(depE)])]],
        a, "years", 2,
        [`Totaux : cumulés = ${F(adB)} + ${F(adE)} = ${F(adB + adE)} ; dotation = ${F(depB)} + ${F(depE)} = ${F(depB + depE)}.`,
          `Âge moyen global = ${F(adB + adE)} / ${F(depB + depE)} = ${F(a, 2)} ans.`,
          `Par classe : bâtiments ${F(adB / depB, 1)} ans, équipements ${F(adE / depE, 1)} ans : le mix d'actifs biaise la moyenne.`]);
    })(),
    (() => {
      const g0 = 1_500, ad0 = 600, capex = 250, dep = 100, retired = 50;
      const g1 = g0 + capex - retired;
      const ad1 = ad0 + dep - retired;
      const a = ad1 / dep;
      return q("fsa-age-d4", "difficile", "Estimated average age of PP&E at year-end?",
        [["Gross PP&E, beginning of year ($ millions)", E(g0)], ["Accumulated depreciation, beginning of year ($ millions)", E(ad0)],
          ["Capital expenditures ($ millions)", E(capex)], ["Depreciation expense ($ millions)", E(dep)],
          ["Fully depreciated asset retired, original cost ($ millions)", E(retired)]],
        a, "years", 1,
        [`Brut fin = ${F(g0)} + ${F(capex)} − ${F(retired)} = ${F(g1)}.`,
          `Cumulés fin = ${F(ad0)} + ${F(dep)} − ${F(retired)} (actif retiré, entièrement amorti) = ${F(ad1)}.`,
          `Âge moyen = ${F(ad1)} / ${F(dep)} = ${F(a, 1)} ans.`]);
    })(),
    (() => {
      const rate = 0.08, gross = 1_500, ad = 690, capex = 150;
      const dep = rate * gross;
      const a = (gross - ad) / dep;
      return q("fsa-age-d5", "difficile", "Estimated remaining useful life of PP&E?",
        [["Straight-line depreciation rate (on gross PP&E)", pc(rate)], ["Gross PP&E ($ millions)", E(gross)], ["Accumulated depreciation ($ millions)", E(ad)],
          ["Capital expenditures this year ($ millions)", E(capex)]],
        a, "years", 2,
        [`Dotation = ${P(rate)} × ${F(gross)} = ${F(dep)} (durée totale = 1 / ${F(rate)} = ${F(1 / rate, 1)} ans).`,
          `Durée restante = (${F(gross)} − ${F(ad)}) / ${F(dep)} = ${F(a, 2)} ans ; les capex sont une donnée-piège.`]);
    })(),
  ],
};

/* ────────────────────────── 8 · Contrats de location (preneur) ────────────────────────── */

const LEASES: CalcType = {
  key: "leases-lessee",
  topic: "fsa",
  name: "Contrats de location côté preneur (lessee) : IFRS 16 et US GAAP",
  tier: "essentiel",
  source: "LM 8 · Topics in Long-Term Liabilities and Equity",
  formulas: [
    "Dette locative initiale = actif de droit d'utilisation (ROU) = VA des loyers au taux implicite (loyers en fin de période)",
    "Intérêts de l'année = dette en début d'année × taux ; dette fin = dette début + intérêts − loyer",
    "Finance lease (et tout bail IFRS) : charge = intérêts + amortissement linéaire du ROU (VA / durée)",
    "US GAAP operating lease : charge de location = loyer ; ROU = dette locative à chaque date",
    "Flux US GAAP : finance lease → intérêts en CFO, principal en CFF ; operating lease → tout le loyer en CFO",
  ],
  traps: [
    "Finance lease : charge totale plus forte que l'operating lease au début, plus faible à la fin, identique sur la durée.",
    "Le ROU d'un finance lease est inférieur à la dette pendant le bail (amortissement linéaire > principal au début).",
    "IFRS : pas d'operating lease côté preneur, sauf bail court (≤ 12 mois) ou de faible valeur.",
  ],
  questions: [
    (() => {
      const pmt = 20_000, n = 5, r = 0.06;
      const a = annuityPV(pmt, r, n);
      return q("fsa-lease-f1", "facile", "Initial lease liability (and right-of-use asset)?",
        [["Annual lease payment (end of year)", usd(pmt)], ["Lease term", `${n} years`], ["Interest rate implicit in the lease", pc(r)]],
        a, "$", 0,
        [`VA des loyers = ${D(pmt)} × [1 − ${F(1 + r)}^−${n}] / ${F(r)}.`, `= ${D(a, 0)} : montant inscrit en dette locative et en ROU.`]);
    })(),
    (() => {
      const pv = 72_000, n = 6;
      const a = pv / n;
      return q("fsa-lease-f2", "facile", "Annual straight-line amortization of the right-of-use asset (finance lease)?",
        [["Right-of-use asset at inception", usd(pv)], ["Lease term", `${n} years`], ["Asset returned to the lessor at the end", "Yes"]],
        a, "$", 0,
        [`Amortissement = ${D(pv)} / ${n} = ${D(a)} par an.`]);
    })(),
    (() => {
      const l = 50_000, r = 0.08;
      const a = l * r;
      return q("fsa-lease-f3", "facile", "Year-1 interest expense on the lease liability?",
        [["Lease liability at inception", usd(l)], ["Interest rate implicit in the lease", pc(r)]],
        a, "$", 0,
        [`Intérêts = ${D(l)} × ${P(r)} = ${D(a)}.`]);
    })(),
    (() => {
      const l = 100_000, r = 0.07, pmt = 25_000;
      const a = l * (1 + r) - pmt;
      return q("fsa-lease-f4", "facile", "Lease liability at the end of Year 1?",
        [["Lease liability at inception", usd(l)], ["Interest rate", pc(r)], ["Payment at the end of Year 1", usd(pmt)]],
        a, "$", 0,
        [`Intérêts = ${D(l)} × ${P(r)} = ${D(l * r)} ; principal remboursé = ${D(pmt)} − ${D(l * r)} = ${D(pmt - l * r)}.`,
          `Dette fin = ${D(l)} − ${D(pmt - l * r)} = ${D(a)}.`]);
    })(),
    (() => {
      const pmt = 18_000, n = 5, r = 0.06;
      const pv = annuityPV(pmt, r, n);
      const a = pmt;
      return q("fsa-lease-f5", "facile", "Annual lease expense in the income statement (U.S. GAAP operating lease)?",
        [["Annual lease payment (end of year)", usd(pmt)], ["Lease term", `${n} years`], ["Discount rate", pc(r)], ["Lease liability at inception", usd(pv, 0)]],
        a, "$", 0,
        ["Operating lease US GAAP : une seule charge de location, linéaire, égale au loyer.",
          `Charge annuelle = ${D(a)} (intérêts et amortissement ne sont pas présentés séparément).`]);
    })(),
    (() => {
      const pmt = 12_000, n = 4, r = 0.06;
      const s = leaseSchedule(pmt, r, n);
      const am = s.pv / n;
      const a = s.years[0].interest + am;
      return q("fsa-lease-m1", "moyen", "Total Year-1 lease-related expense for a finance lease?",
        [["Annual lease payment (end of year)", usd(pmt)], ["Lease term", `${n} years`], ["Interest rate implicit in the lease", pc(r)]],
        a, "$", 0,
        [`VA = ${D(s.pv, 2)} (ROU et dette).`,
          `Intérêts année 1 = ${D(s.pv, 2)} × ${P(r)} = ${D(s.years[0].interest, 2)} ; amortissement = ${D(s.pv, 2)} / ${n} = ${D(am, 2)}.`,
          `Charge totale = ${D(a, 2)} (> loyer de ${D(pmt)}).`]);
    })(),
    (() => {
      const pmt = 15_000, n = 3, r = 0.05;
      const s = leaseSchedule(pmt, r, n);
      const a = s.years[1].end;
      return q("fsa-lease-m2", "moyen", "Lease liability at the end of Year 2?",
        [["Annual lease payment (end of year)", usd(pmt)], ["Lease term", `${n} years`], ["Interest rate implicit in the lease", pc(r)]],
        a, "$", 0,
        [`Dette initiale = ${D(s.pv, 2)}.`,
          `Fin année 1 = ${D(s.pv, 2)} × ${F(1 + r)} − ${D(pmt)} = ${D(s.years[0].end, 2)}.`,
          `Fin année 2 = ${D(s.years[0].end, 2)} × ${F(1 + r)} − ${D(pmt)} = ${D(a, 2)} (= VA du dernier loyer).`]);
    })(),
    (() => {
      const pmt = 10_000, n = 5, r = 0.08;
      const s = leaseSchedule(pmt, r, n);
      const rou = s.pv - s.pv / n;
      const a = s.years[0].end - rou;
      return q("fsa-lease-m3", "moyen", "By how much does the lease liability exceed the right-of-use asset at the end of Year 1 (finance lease)?",
        [["Annual lease payment (end of year)", usd(pmt)], ["Lease term", `${n} years`], ["Interest rate implicit in the lease", pc(r)]],
        a, "$", 0,
        [`VA = ${D(s.pv, 2)}.`,
          `ROU fin année 1 = ${D(s.pv, 2)} − ${D(s.pv / n, 2)} = ${D(rou, 2)}.`,
          `Dette fin année 1 = ${D(s.pv, 2)} × ${F(1 + r)} − ${D(pmt)} = ${D(s.years[0].end, 2)}.`,
          `Écart = ${D(a, 2)} : le principal remboursé (${D(s.years[0].principal, 2)}) est inférieur à l'amortissement.`]);
    })(),
    (() => {
      const pmt = 25_000, n = 4, r = 0.07;
      const s = leaseSchedule(pmt, r, n);
      const a = s.years[0].principal;
      return q("fsa-lease-m4", "moyen", "Year-1 financing cash outflow for the lease (U.S. GAAP finance lease)?",
        [["Annual lease payment (end of year)", usd(pmt)], ["Lease term", `${n} years`], ["Interest rate implicit in the lease", pc(r)]],
        a, "$", 0,
        [`VA = ${D(s.pv, 2)} ; intérêts année 1 = ${D(s.years[0].interest, 2)} (en CFO en US GAAP).`,
          `Principal = ${D(pmt)} − ${D(s.years[0].interest, 2)} = ${D(a, 2)} : sortie de CFF.`]);
    })(),
    (() => {
      const pmt = 8_000, n = 6, r = 0.06;
      const s = leaseSchedule(pmt, r, n);
      const a = s.years[0].end;
      return q("fsa-lease-m5", "moyen", "Right-of-use asset at the end of Year 1 (U.S. GAAP operating lease)?",
        [["Annual lease payment (end of year)", usd(pmt)], ["Lease term", `${n} years`], ["Discount rate", pc(r)]],
        a, "$", 0,
        [`Dette initiale = ${D(s.pv, 2)}.`,
          `Dette fin année 1 = ${D(s.pv, 2)} × ${F(1 + r)} − ${D(pmt)} = ${D(a, 2)}.`,
          "En operating lease US GAAP, le ROU est ajusté pour rester égal à la dette : ROU = " + D(a, 2) + "."]);
    })(),
    (() => {
      const pmt = 30_000, n = 5, r = 0.09;
      const s = leaseSchedule(pmt, r, n);
      const fin = s.years[0].interest + s.pv / n;
      const a = fin - pmt;
      return q("fsa-lease-d1", "difficile", "How much higher is Year-1 expense if the lease is a finance lease rather than a U.S. GAAP operating lease?",
        [["Annual lease payment (end of year)", usd(pmt)], ["Lease term", `${n} years`], ["Interest rate implicit in the lease", pc(r)]],
        a, "$", 0,
        [`VA = ${D(s.pv, 2)}.`,
          `Finance lease : intérêts ${D(s.years[0].interest, 2)} + amortissement ${D(s.pv / n, 2)} = ${D(fin, 2)}.`,
          `Operating lease : charge = loyer = ${D(pmt)}.`,
          `Écart année 1 = ${D(a, 2)} (il s'inverse en fin de bail).`]);
    })(),
    (() => {
      const pmt = 20_000, n = 5, r = 0.06;
      const s = leaseSchedule(pmt, r, n);
      const a = s.years[2].interest;
      return q("fsa-lease-d2", "difficile", "Interest expense on the lease in Year 3?",
        [["Annual lease payment (end of year)", usd(pmt)], ["Lease term", `${n} years`], ["Interest rate implicit in the lease", pc(r)]],
        a, "$", 0,
        [`Dette initiale = ${D(s.pv, 2)}.`,
          `Fin année 1 = ${D(s.years[0].end, 2)} ; fin année 2 = ${D(s.years[1].end, 2)}.`,
          `Intérêts année 3 = ${D(s.years[1].end, 2)} × ${P(r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const l = 100_000, n = 5, r = 0.08;
      const a = (l * r) / (1 - Math.pow(1 + r, -n));
      return q("fsa-lease-d3", "difficile", "Annual lease payment implied by the lease liability recognized at inception?",
        [["Lease liability at inception", usd(l)], ["Lease term", `${n} years, payments at the end of each year`], ["Interest rate implicit in the lease", pc(r)]],
        a, "$", 2,
        ["La dette est la VA des loyers : loyer = dette × r / [1 − (1 + r)^−n].",
          `Loyer = ${D(l)} × ${F(r)} / [1 − ${F(1 + r)}^−${n}] = ${D(a, 2)}.`]);
    })(),
    (() => {
      const pmt = 12_000, n = 5, r = 0.07;
      const s = leaseSchedule(pmt, r, n);
      const am = s.pv / n;
      const a = s.years[n - 1].interest + am;
      return q("fsa-lease-d4", "difficile", "Total lease-related expense in the final year (Year 5) for a finance lease?",
        [["Annual lease payment (end of year)", usd(pmt)], ["Lease term", `${n} years`], ["Interest rate implicit in the lease", pc(r)]],
        a, "$", 2,
        [`VA = ${D(s.pv, 2)} ; amortissement = ${D(am, 2)} par an.`,
          `Dette au début de l'année 5 = VA du dernier loyer = ${D(pmt)} / ${F(1 + r)} = ${D(s.years[n - 1].begin, 2)}.`,
          `Intérêts année 5 = ${D(s.years[n - 1].begin, 2)} × ${P(r)} = ${D(s.years[n - 1].interest, 2)}.`,
          `Charge totale = ${D(a, 2)} < loyer ${D(pmt)} : la charge du finance lease décroît dans le temps.`]);
    })(),
    (() => {
      const pmt = 40_000, n = 6, r = 0.05;
      const s = leaseSchedule(pmt, r, n);
      const am = s.pv / n;
      const a = pmt - am;
      return q("fsa-lease-d5", "difficile", "How much higher is Year-1 EBIT under a finance lease than under a U.S. GAAP operating lease?",
        [["Annual lease payment (end of year)", usd(pmt)], ["Lease term", `${n} years`], ["Interest rate implicit in the lease", pc(r)],
          ["Classification of expenses", "Interest below EBIT; amortization and lease expense in operating expenses"]],
        a, "$", 0,
        [`VA = ${D(s.pv, 2)} ; amortissement du ROU = ${D(am, 2)}.`,
          `Operating lease : tout le loyer (${D(pmt)}) réduit l'EBIT.`,
          `Finance lease : seul l'amortissement réduit l'EBIT ; les intérêts (${D(s.years[0].interest, 2)}) sont sous l'EBIT.`,
          `EBIT plus élevé de ${D(pmt)} − ${D(am, 2)} = ${D(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 9 · Impôts différés ────────────────────────── */

const DEFERRED_TAXES: CalcType = {
  key: "deferred-taxes",
  topic: "fsa",
  name: "Impôts différés (DTA/DTL) et taux d'imposition effectif",
  tier: "essentiel",
  top: true,
  source: "LM 9 · Analysis of Income Taxes",
  formulas: [
    "Charge d'impôt (income tax expense) = impôt exigible (taxes payable) + ΔDTL − ΔDTA",
    "Actif : valeur comptable > base fiscale → DTL ; valeur comptable < base fiscale → DTA ; solde = écart × taux",
    "Taux effectif = charge d'impôt / résultat avant impôt ; taux « cash » = impôts payés / résultat avant impôt",
    "Changement de taux : DTA et DTL réévalués au nouveau taux ; la variation passe en charge d'impôt",
    "Différence permanente : pas d'impôt différé, mais le taux effectif s'écarte du taux légal",
  ],
  traps: [
    "Amortissement fiscal accéléré (DDB) > amortissement comptable linéaire → DTL.",
    "Hausse du taux : la DTL augmente (charge ↑) et la DTA aussi (charge ↓) : raisonner sur le net.",
    "Une hausse de la provision pour dépréciation de DTA (valuation allowance) augmente la charge d'impôt.",
  ],
  questions: [
    (() => {
      const pay = 840, dDtl = 60, dDta = 20;
      const a = pay + dDtl - dDta;
      return q("fsa-tax-f1", "facile", "Income tax expense, in $ thousands?",
        [["Taxes payable for the year ($ thousands)", E(pay)], ["Increase in deferred tax liabilities ($ thousands)", E(dDtl)], ["Increase in deferred tax assets ($ thousands)", E(dDta)]],
        a, "$", 0,
        ["Charge d'impôt = impôt exigible + ΔDTL − ΔDTA.", `= ${F(pay)} + ${F(dDtl)} − ${F(dDta)} = ${K(a)}.`]);
    })(),
    (() => {
      const cv = 18_000, tb = 10_500, t = 0.3;
      const a = (cv - tb) * t;
      return q("fsa-tax-f2", "facile", "Deferred tax liability related to the asset?",
        [["Carrying value of the equipment", usd(cv)], ["Tax base of the equipment", usd(tb)], ["Tax rate", pc(t)]],
        a, "$", 0,
        [`Valeur comptable > base fiscale : impôt futur à payer, donc DTL.`, `DTL = (${D(cv)} − ${D(tb)}) × ${P(t)} = ${D(a)}.`]);
    })(),
    (() => {
      const pti = 480_000, exp = 132_000;
      const a = (exp / pti) * 100;
      return q("fsa-tax-f3", "facile", "Effective tax rate?",
        [["Pretax income", usd(pti)], ["Income tax expense", usd(exp)]],
        a, "%", 2,
        [`Taux effectif = ${D(exp)} / ${D(pti)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const ti = 1_250_000, t = 0.24;
      const a = ti * t;
      return q("fsa-tax-f4", "facile", "Taxes payable for the year?",
        [["Taxable income (tax return)", usd(ti)], ["Tax rate", pc(t)]],
        a, "$", 0,
        [`Impôt exigible = revenu imposable × taux = ${D(ti)} × ${P(t)} = ${D(a)}.`]);
    })(),
    (() => {
      const liab = 36_800, t = 0.25;
      const a = liab * t;
      return q("fsa-tax-f5", "facile", "Deferred tax asset arising from the warranty provision?",
        [["Warranty liability (carrying value)", usd(liab)], ["Tax treatment", "Deductible only when warranty work is performed"], ["Tax rate", pc(t)]],
        a, "$", 0,
        ["Base fiscale du passif = valeur comptable − montants déductibles plus tard = 0.",
          `Charge comptabilisée avant d'être déductible → DTA = ${D(liab)} × ${P(t)} = ${D(a)}.`]);
    })(),
    (() => {
      const cost = 60_000, life = 3, t = 0.3;
      const book = cost / life;
      const tax = cost * (2 / life);
      const a = ((cost - book) - (cost - tax)) * t;
      return q("fsa-tax-m1", "moyen", "Deferred tax liability at the end of Year 1?",
        [["Equipment cost (start of Year 1)", usd(cost)], ["Useful life / salvage value", `${life} years / $0`],
          ["Depreciation", "Straight-line for reporting; double-declining balance for tax"], ["Tax rate", pc(t)]],
        a, "$", 0,
        [`Comptable : dotation = ${D(book)} → valeur comptable = ${D(cost - book)}.`,
          `Fiscal (DDB, taux 2/${life}) : dotation = ${D(tax)} → base fiscale = ${D(cost - tax)}.`,
          `DTL = (${D(cost - book)} − ${D(cost - tax)}) × ${P(t)} = ${D(a)}.`]);
    })(),
    (() => {
      const rev = 500, bookDep = 100, taxDep = 160, t = 0.25;
      const pti = rev - bookDep, ti = rev - taxDep;
      const pay = ti * t, dDtl = (taxDep - bookDep) * t;
      const a = pay + dDtl;
      return q("fsa-tax-m2", "moyen", "Income tax expense, in $ thousands? (No deferred tax items at the start of the year.)",
        [["Revenue less all expenses other than depreciation ($ thousands)", E(rev)], ["Depreciation for financial reporting ($ thousands)", E(bookDep)],
          ["Depreciation on the tax return ($ thousands)", E(taxDep)], ["Tax rate", pc(t)]],
        a, "$", 0,
        [`Résultat avant impôt = ${F(rev)} − ${F(bookDep)} = ${F(pti)} ; revenu imposable = ${F(rev)} − ${F(taxDep)} = ${F(ti)}.`,
          `Impôt exigible = ${F(ti)} × ${F(t)} = ${F(pay)} ; hausse de la DTL = (${F(taxDep)} − ${F(bookDep)}) × ${F(t)} = ${F(dDtl)}.`,
          `Charge d'impôt = ${F(pay)} + ${F(dDtl)} = ${K(a)} (= ${F(pti)} × ${F(t)}).`]);
    })(),
    (() => {
      const dtl = 800, dta = 200, t0 = 0.25, t1 = 0.3;
      const dtl1 = (dtl * t1) / t0, dta1 = (dta * t1) / t0;
      const a = dtl1 - dtl - (dta1 - dta);
      return q("fsa-tax-m3", "moyen", "Change in income tax expense caused by the newly enacted tax rate, in $ thousands?",
        [["Deferred tax liability at the old rate ($ thousands)", E(dtl)], ["Deferred tax asset at the old rate ($ thousands)", E(dta)],
          ["Old tax rate / newly enacted rate", lst([pc(t0), pc(t1)])]],
        a, "$", 0,
        [`DTL réévaluée = ${F(dtl)} × ${F(t1)} / ${F(t0)} = ${F(dtl1)} (+${F(dtl1 - dtl)}).`,
          `DTA réévaluée = ${F(dta)} × ${F(t1)} / ${F(t0)} = ${F(dta1)} (+${F(dta1 - dta)}).`,
          `Charge d'impôt = +${F(dtl1 - dtl)} − ${F(dta1 - dta)} = +${K(a)} : le résultat net baisse d'autant.`]);
    })(),
    (() => {
      const pti = 900, paid = 198, exp = 225;
      const a = (paid / pti) * 100;
      return q("fsa-tax-m4", "moyen", "Cash tax rate?",
        [["Pretax income ($ thousands)", E(pti)], ["Income tax expense ($ thousands)", E(exp)], ["Income taxes paid in cash ($ thousands)", E(paid)]],
        a, "%", 2,
        [`Taux « cash » = impôts payés / résultat avant impôt = ${F(paid)} / ${F(pti)} = ${Pa(a)}.`,
          `(Le taux effectif serait ${F(exp)} / ${F(pti)} = ${P(exp / pti, 2)}.)`]);
    })(),
    (() => {
      const dom = 300, tDom = 0.25, forI = 200, tFor = 0.15;
      const tax = dom * tDom + forI * tFor;
      const a = (tax / (dom + forI)) * 100;
      return q("fsa-tax-m5", "moyen", "Consolidated effective tax rate?",
        [["Pretax income, domestic ($ millions)", E(dom)], ["Domestic tax rate", pc(tDom)], ["Pretax income, foreign subsidiary ($ millions)", E(forI)],
          ["Foreign tax rate", pc(tFor)]],
        a, "%", 2,
        [`Impôt = ${F(dom)} × ${F(tDom)} + ${F(forI)} × ${F(tFor)} = ${F(dom * tDom)} + ${F(forI * tFor)} = ${F(tax)}.`,
          `Taux effectif = ${F(tax)} / ${F(dom + forI)} = ${Pa(a)} : l'écart au taux légal vient de la juridiction étrangère.`]);
    })(),
    (() => {
      const pti = 1_000, muni = 50, tempDiff = 80, t = 0.3;
      const ti = pti - muni - tempDiff;
      const pay = ti * t, dDtl = tempDiff * t;
      const exp = pay + dDtl;
      const a = (exp / pti) * 100;
      return q("fsa-tax-d1", "difficile", "Effective tax rate?",
        [["Pretax income ($ millions)", E(pti)], ["Tax-exempt interest income included in pretax income ($ millions)", E(muni)],
          ["Excess of tax depreciation over book depreciation ($ millions)", E(tempDiff)], ["Statutory tax rate", pc(t)]],
        a, "%", 2,
        [`Revenu imposable = ${F(pti)} − ${F(muni)} (permanent) − ${F(tempDiff)} (temporaire) = ${F(ti)} → impôt exigible = ${F(pay)}.`,
          `Hausse de la DTL = ${F(tempDiff)} × ${F(t)} = ${F(dDtl)} ; charge d'impôt = ${F(pay)} + ${F(dDtl)} = ${F(exp)}.`,
          `Taux effectif = ${F(exp)} / ${F(pti)} = ${Pa(a)} : seule la différence permanente l'éloigne de ${P(t)}.`]);
    })(),
    (() => {
      const cost = 9_000, life = 3, rev = 20_000, t = 0.3;
      const d1 = cost * (2 / life);
      const d2 = (cost - d1) * (2 / life);
      const a = (rev - d2) * t;
      return q("fsa-tax-d2", "difficile", "Taxes payable in Year 2?",
        [["Equipment cost (start of Year 1)", usd(cost)], ["Useful life / salvage value", `${life} years / $0`],
          ["Revenue less cash expenses, each year", usd(rev)], ["Depreciation", "Straight-line for reporting; double-declining balance for tax"], ["Tax rate", pc(t)]],
        a, "$", 0,
        [`DDB : taux = 2/${life} ; année 1 = ${D(cost)} × 2/${life} = ${D(d1)}.`,
          `Année 2 = (${D(cost)} − ${D(d1)}) × 2/${life} = ${D(d2)}.`,
          `Impôt exigible année 2 = (${D(rev)} − ${D(d2)}) × ${P(t)} = ${D(a)} ; l'amortissement comptable ne sert pas ici.`]);
    })(),
    (() => {
      const cost = 24_000, life = 4, t = 0.25;
      const book = cost / life;
      const d1 = cost * (2 / life), d2 = (cost - d1) * (2 / life);
      const cv = cost - 2 * book, tb = cost - d1 - d2;
      const a = (cv - tb) * t;
      return q("fsa-tax-d3", "difficile", "Deferred tax liability at the end of Year 2?",
        [["Equipment cost (start of Year 1)", usd(cost)], ["Useful life / salvage value", `${life} years / $0`],
          ["Depreciation", "Straight-line for reporting; double-declining balance for tax"], ["Tax rate", pc(t)]],
        a, "$", 0,
        [`Valeur comptable fin année 2 = ${D(cost)} − 2 × ${D(book)} = ${D(cv)}.`,
          `DDB (taux 2/${life}) : ${D(d1)} puis ${D(d2)} → base fiscale = ${D(tb)}.`,
          `DTL = (${D(cv)} − ${D(tb)}) × ${P(t)} = ${D(a)}.`]);
    })(),
    (() => {
      const pay = 300, dDtl = 40, va0 = 50, va1 = 120;
      const dDtaNet = -(va1 - va0);
      const a = pay + dDtl - dDtaNet;
      return q("fsa-tax-d4", "difficile", "Income tax expense, in $ thousands? (U.S. GAAP.)",
        [["Taxes payable ($ thousands)", E(pay)], ["Increase in deferred tax liabilities ($ thousands)", E(dDtl)],
          ["Gross deferred tax assets, unchanged ($ thousands)", E(500)], ["Valuation allowance, beginning / end ($ thousands)", lst([E(va0), E(va1)])]],
        a, "$", 0,
        [`La provision (valuation allowance) passe de ${F(va0)} à ${F(va1)} : la DTA nette baisse de ${F(va1 - va0)}.`,
          `Charge d'impôt = ${F(pay)} + ${F(dDtl)} − (${F(dDtaNet)}) = ${K(a)}.`,
          "Une hausse de la provision signale que la direction doute de pouvoir utiliser ses DTA."]);
    })(),
    (() => {
      const pti = 2_000, pay = 450, dOpen = 1_600, dClose = 1_800, t0 = 0.25, t1 = 0.3;
      const dtl0 = dOpen * t0, dtl1 = dClose * t1;
      const exp = pay + dtl1 - dtl0;
      const a = (exp / pti) * 100;
      return q("fsa-tax-d5", "difficile", "Effective tax rate for the year?",
        [["Pretax income ($ thousands)", E(pti)], [`Taxes payable at the current ${pc(t0)} rate ($ thousands)`, E(pay)],
          ["Cumulative taxable temporary differences, beginning / end ($ thousands)", lst([E(dOpen), E(dClose)])],
          ["Opening DTL measured at", pc(t0)], ["Rate enacted at year-end for future years", pc(t1)]],
        a, "%", 2,
        [`DTL d'ouverture = ${F(dOpen)} × ${F(t0)} = ${F(dtl0)}.`,
          `DTL de clôture au nouveau taux = ${F(dClose)} × ${F(t1)} = ${F(dtl1)} → ΔDTL = ${F(dtl1 - dtl0)}.`,
          `Charge d'impôt = ${F(pay)} + ${F(dtl1 - dtl0)} = ${F(exp)} ; taux effectif = ${F(exp)} / ${F(pti)} = ${Pa(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 10 · CFO méthode indirecte ────────────────────────── */

const CFO_INDIRECT: CalcType = {
  key: "cfo-indirect",
  topic: "fsa",
  name: "CFO par la méthode indirecte",
  tier: "essentiel",
  top: true,
  source: "LM 4 · Analyzing Statements of Cash Flows I",
  formulas: [
    "CFO = RN + charges non monétaires (D&A, dépréciations, paiements en actions) − gains (+ pertes) de cession",
    "− hausse des actifs d'exploitation courants (créances, stocks, charges payées d'avance)",
    "+ hausse des passifs d'exploitation courants (fournisseurs, charges à payer, produits constatés d'avance, impôts à payer)",
    "+ hausse de la DTL ; − hausse de la DTA",
  ],
  traps: [
    "Le gain de cession se retranche : tout le prix de cession va en CFI.",
    "Dividendes versés, remboursements d'emprunt, achats d'immobilisations : hors CFO (US GAAP).",
    "Une baisse des créances apporte du cash ; une baisse des fournisseurs en consomme.",
  ],
  questions: [
    (() => {
      const ni = 500, da = 120, dAR = 40;
      const a = ni + da - dAR;
      return q("fsa-cfoi-f1", "facile", "Cash flow from operations, in $ millions?",
        [["Net income", E(ni)], ["Depreciation and amortization", E(da)], ["Increase in accounts receivable", E(dAR)]],
        a, "$", 0,
        [`CFO = ${F(ni)} + ${F(da)} − ${F(dAR)} = ${M(a)} (la hausse des créances est du chiffre d'affaires non encaissé).`]);
    })(),
    (() => {
      const ni = 300, da = 80, gain = 25;
      const a = ni + da - gain;
      return q("fsa-cfoi-f2", "facile", "Cash flow from operations, in $ millions?",
        [["Net income", E(ni)], ["Depreciation", E(da)], ["Gain on sale of equipment", E(gain)]],
        a, "$", 0,
        [`CFO = ${F(ni)} + ${F(da)} − ${F(gain)} = ${M(a)} : le gain est retiré car le prix de cession est classé en CFI.`]);
    })(),
    (() => {
      const ni = 1_200, da = 250, dInv = -60, dAP = -45;
      const a = ni + da - dInv + dAP;
      return q("fsa-cfoi-f3", "facile", "Cash flow from operations, in $ millions?",
        [["Net income", E(ni)], ["Depreciation and amortization", E(da)], ["Decrease in inventory", E(-dInv)], ["Decrease in accounts payable", E(-dAP)]],
        a, "$", 0,
        [`Baisse des stocks : +${F(-dInv)} ; baisse des fournisseurs : −${F(-dAP)}.`,
          `CFO = ${F(ni)} + ${F(da)} + ${F(-dInv)} − ${F(-dAP)} = ${M(a)}.`]);
    })(),
    (() => {
      const ni = 640, dep = 90, dAcc = 30, dPre = 10;
      const a = ni + dep + dAcc - dPre;
      return q("fsa-cfoi-f4", "facile", "Cash flow from operations, in $ millions?",
        [["Net income", E(ni)], ["Depreciation", E(dep)], ["Increase in accrued liabilities", E(dAcc)], ["Increase in prepaid expenses", E(dPre)]],
        a, "$", 0,
        [`CFO = ${F(ni)} + ${F(dep)} + ${F(dAcc)} − ${F(dPre)} = ${M(a)}.`]);
    })(),
    (() => {
      const ni = 220, da = 70, loss = 15, imp = 40;
      const a = ni + da + loss + imp;
      return q("fsa-cfoi-f5", "facile", "Cash flow from operations, in $ millions?",
        [["Net income", E(ni)], ["Depreciation and amortization", E(da)], ["Loss on sale of a building", E(loss)], ["Impairment charge on goodwill", E(imp)]],
        a, "$", 0,
        [`Perte de cession et dépréciation sont non monétaires : on les rajoute.`, `CFO = ${F(ni)} + ${F(da)} + ${F(loss)} + ${F(imp)} = ${M(a)}.`]);
    })(),
    (() => {
      const ni = 800, da = 150, gain = 30, dAR = 60, dInv = -40, dAP = 25, div = 200;
      const a = ni + da - gain - dAR - dInv + dAP;
      return q("fsa-cfoi-m1", "moyen", "Cash flow from operations, in $ millions? (U.S. GAAP.)",
        [["Net income", E(ni)], ["Depreciation and amortization", E(da)], ["Gain on sale of land", E(gain)], ["Increase in accounts receivable", E(dAR)],
          ["Decrease in inventory", E(-dInv)], ["Increase in accounts payable", E(dAP)], ["Dividends paid", E(div)]],
        a, "$", 0,
        [`CFO = ${terms([ni, da, -gain, -dAR, -dInv, dAP], F)} = ${M(a)}.`,
          "Les dividendes versés sont un flux de financement en US GAAP."]);
    })(),
    (() => {
      const ni = 600, da = 110, ar0 = 400, ar1 = 460, inv0 = 520, inv1 = 500, ap0 = 300, ap1 = 340;
      const a = ni + da - (ar1 - ar0) - (inv1 - inv0) + (ap1 - ap0);
      return q("fsa-cfoi-m2", "moyen", "Cash flow from operations, in $ millions?",
        [["Net income", E(ni)], ["Depreciation and amortization", E(da)], ["Accounts receivable, beginning / end", lst([E(ar0), E(ar1)])],
          ["Inventory, beginning / end", lst([E(inv0), E(inv1)])], ["Accounts payable, beginning / end", lst([E(ap0), E(ap1)])]],
        a, "$", 0,
        [`Créances +${F(ar1 - ar0)} → −${F(ar1 - ar0)} ; stocks ${F(inv1 - inv0)} → +${F(inv0 - inv1)} ; fournisseurs +${F(ap1 - ap0)} → +${F(ap1 - ap0)}.`,
          `CFO = ${terms([ni, da, -(ar1 - ar0), -(inv1 - inv0), ap1 - ap0], F)} = ${M(a)}.`]);
    })(),
    (() => {
      const ni = 450, da = 100, dDtl = 20, dUnearned = -15, dWages = 10;
      const a = ni + da + dDtl + dUnearned + dWages;
      return q("fsa-cfoi-m3", "moyen", "Cash flow from operations, in $ millions?",
        [["Net income", E(ni)], ["Depreciation and amortization", E(da)], ["Increase in deferred tax liability", E(dDtl)],
          ["Decrease in unearned revenue", E(-dUnearned)], ["Increase in wages payable", E(dWages)]],
        a, "$", 0,
        ["Hausse de DTL : impôt comptabilisé non payé (+) ; baisse des produits constatés d'avance : chiffre d'affaires sans encaissement (−).",
          `CFO = ${terms([ni, da, dDtl, dUnearned, dWages], F)} = ${M(a)}.`]);
    })(),
    (() => {
      const cfo = 1_000, da = 200, dAR = 80, dAP = 30, gain = 20;
      const a = cfo - da + dAR - dAP + gain;
      return q("fsa-cfoi-m4", "moyen", "Net income implied, in $ millions?",
        [["Cash flow from operations", E(cfo)], ["Depreciation and amortization", E(da)], ["Increase in accounts receivable", E(dAR)],
          ["Increase in accounts payable", E(dAP)], ["Gain on sale of equipment", E(gain)]],
        a, "$", 0,
        [`CFO = RN + ${F(da)} − ${F(gain)} − ${F(dAR)} + ${F(dAP)}.`,
          `RN = ${F(cfo)} − ${F(da)} + ${F(gain)} + ${F(dAR)} − ${F(dAP)} = ${M(a)}.`]);
    })(),
    (() => {
      const ni = 350, ad0 = 900, ad1 = 960, dAR = -30, dInv = 45, dTax = 12;
      const dep = ad1 - ad0;
      const a = ni + dep - dAR - dInv + dTax;
      return q("fsa-cfoi-m5", "moyen", "Cash flow from operations, in $ millions? (No assets were sold this year.)",
        [["Net income", E(ni)], ["Accumulated depreciation, beginning / end", lst([E(ad0), E(ad1)])], ["Decrease in accounts receivable", E(-dAR)],
          ["Increase in inventory", E(dInv)], ["Increase in income taxes payable", E(dTax)]],
        a, "$", 0,
        [`Sans cession, dotation = ${F(ad1)} − ${F(ad0)} = ${F(dep)}.`,
          `CFO = ${terms([ni, dep, -dAR, -dInv, dTax], F)} = ${M(a)}.`]);
    })(),
    (() => {
      const ni = 1_500, da = 300, gain = 50, ar0 = 900, ar1 = 1_020, inv0 = 700, inv1 = 650, pre0 = 40, pre1 = 55, ap0 = 500, ap1 = 470, acc0 = 120, acc1 = 160;
      const capex = 600, div = 250, debt = 400;
      const parts = [ni, da, -gain, -(ar1 - ar0), -(inv1 - inv0), -(pre1 - pre0), ap1 - ap0, acc1 - acc0];
      const a = sum(parts);
      return q("fsa-cfoi-d1", "difficile", "Cash flow from operations, in $ millions? (U.S. GAAP.)",
        [["Net income", E(ni)], ["Depreciation and amortization", E(da)], ["Gain on sale of equipment", E(gain)],
          ["Accounts receivable, beginning / end", lst([E(ar0), E(ar1)])], ["Inventory, beginning / end", lst([E(inv0), E(inv1)])],
          ["Prepaid expenses, beginning / end", lst([E(pre0), E(pre1)])], ["Accounts payable, beginning / end", lst([E(ap0), E(ap1)])],
          ["Accrued liabilities, beginning / end", lst([E(acc0), E(acc1)])], ["Purchase of equipment", E(capex)], ["Dividends paid", E(div)], ["New long-term debt issued", E(debt)]],
        a, "$", 0,
        [`Ajustements : D&A +${F(da)}, gain −${F(gain)}, créances −${F(ar1 - ar0)}, stocks +${F(inv0 - inv1)}, charges payées d'avance −${F(pre1 - pre0)}, fournisseurs −${F(ap0 - ap1)}, charges à payer +${F(acc1 - acc0)}.`,
          `CFO = ${terms(parts, F)} = ${M(a)}.`,
          "Achats d'équipement (CFI), dividendes et nouvelle dette (CFF) sont des données-pièges."]);
    })(),
    (() => {
      const ni = 900, ad0 = 1_200, ad1 = 1_350, adSold = 100, costSold = 300, proceeds = 180, dAR = 70, dAP = 40;
      const dep = ad1 - ad0 + adSold;
      const loss = costSold - adSold - proceeds;
      const a = ni + dep + loss - dAR + dAP;
      return q("fsa-cfoi-d2", "difficile", "Cash flow from operations, in $ millions?",
        [["Net income", E(ni)], ["Accumulated depreciation, beginning / end", lst([E(ad0), E(ad1)])],
          ["Machine sold: original cost / accumulated depreciation", lst([E(costSold), E(adSold)])], ["Proceeds from the sale", E(proceeds)],
          ["Increase in accounts receivable", E(dAR)], ["Increase in accounts payable", E(dAP)]],
        a, "$", 0,
        [`Dotation = ${F(ad1)} − ${F(ad0)} + ${F(adSold)} = ${F(dep)}.`,
          `Valeur comptable cédée = ${F(costSold)} − ${F(adSold)} = ${F(costSold - adSold)} ; perte = ${F(costSold - adSold)} − ${F(proceeds)} = ${F(loss)} (à rajouter).`,
          `CFO = ${terms([ni, dep, loss, -dAR, dAP], F)} = ${M(a)}.`]);
    })(),
    (() => {
      const ni = 2_000, da = 450, dDta = 30, dDtl = 70, imp = 120, dAR = -50, dInv = 200, dAP = 90, dUn = 35;
      const parts = [ni, da, -dDta, dDtl, imp, -dAR, -dInv, dAP, dUn];
      const a = sum(parts);
      return q("fsa-cfoi-d3", "difficile", "Cash flow from operations, in $ millions?",
        [["Net income", E(ni)], ["Depreciation and amortization", E(da)], ["Increase in deferred tax assets", E(dDta)], ["Increase in deferred tax liabilities", E(dDtl)],
          ["Impairment of PP&E", E(imp)], ["Decrease in accounts receivable", E(-dAR)], ["Increase in inventory", E(dInv)],
          ["Increase in accounts payable", E(dAP)], ["Increase in unearned revenue", E(dUn)]],
        a, "$", 0,
        ["DTA en hausse : impôt payé d'avance (−) ; DTL en hausse : impôt différé non payé (+) ; dépréciation non monétaire (+).",
          `CFO = ${terms(parts, F)} = ${M(a)}.`]);
    })(),
    (() => {
      const cfo = 940, ni = 820, da = 160, dInv = 30, dAP = 20;
      const a = ni + da - dInv + dAP - cfo;
      return q("fsa-cfoi-d4", "difficile", "Change in accounts receivable implied, in $ millions? (Enter an increase as a positive number.)",
        [["Cash flow from operations", E(cfo)], ["Net income", E(ni)], ["Depreciation and amortization", E(da)], ["Increase in inventory", E(dInv)],
          ["Increase in accounts payable", E(dAP)], ["Other operating items", "None"]],
        a, "$", 0,
        [`Sans les créances : ${F(ni)} + ${F(da)} − ${F(dInv)} + ${F(dAP)} = ${F(ni + da - dInv + dAP)}.`,
          `${F(ni + da - dInv + dAP)} − ΔCréances = ${F(cfo)} → ΔCréances = ${M(a)} (hausse).`]);
    })(),
    (() => {
      const ni = 1_100, da = 260, sbc = 45, gain = 60, ar0 = 640, ar1 = 700, inv0 = 880, inv1 = 940, ap0 = 410, ap1 = 455, tax0 = 75, tax1 = 60, div = 300;
      const parts = [ni, da, sbc, -gain, -(ar1 - ar0), -(inv1 - inv0), ap1 - ap0, tax1 - tax0];
      const a = sum(parts);
      return q("fsa-cfoi-d5", "difficile", "Cash flow from operations, in $ millions? (U.S. GAAP.)",
        [["Net income", E(ni)], ["Depreciation and amortization", E(da)], ["Share-based compensation expense", E(sbc)], ["Gain on sale of investments", E(gain)],
          ["Accounts receivable, beginning / end", lst([E(ar0), E(ar1)])], ["Inventory, beginning / end", lst([E(inv0), E(inv1)])],
          ["Accounts payable, beginning / end", lst([E(ap0), E(ap1)])], ["Income taxes payable, beginning / end", lst([E(tax0), E(tax1)])], ["Cash dividends paid", E(div)]],
        a, "$", 0,
        [`Rémunération en actions : charge sans décaissement (+${F(sbc)}) ; gain sur titres retiré (−${F(gain)}).`,
          `BFR : créances −${F(ar1 - ar0)}, stocks −${F(inv1 - inv0)}, fournisseurs +${F(ap1 - ap0)}, impôts à payer −${F(tax0 - tax1)}.`,
          `CFO = ${terms(parts, F)} = ${M(a)} ; les dividendes sont en CFF.`]);
    })(),
  ],
};

/* ────────────────────────── 11 · Méthode directe, CFI et CFF ────────────────────────── */

const CASH_FLOW_DIRECT: CalcType = {
  key: "cash-flow-direct",
  topic: "fsa",
  name: "CFO méthode directe, flux d'investissement et de financement",
  tier: "essentiel",
  source: "LM 4 · Analyzing Statements of Cash Flows I",
  formulas: [
    "Encaissements clients = CA − hausse des créances + hausse des produits constatés d'avance",
    "Décaissements fournisseurs = COGS + hausse des stocks − hausse des dettes fournisseurs (achats = COGS + Δstocks)",
    "Salaires versés = charge − hausse des salaires à payer ; impôts payés = charge d'impôt − Δimpôts à payer − ΔDTL + ΔDTA",
    "Produit de cession = valeur comptable cédée + gain (− perte)",
    "Dividendes versés = RN − hausse des bénéfices non distribués − hausse des dividendes à payer",
  ],
  traps: [
    "La dotation aux amortissements n'apparaît pas dans la méthode directe.",
    "Une hausse des charges payées d'avance augmente les décaissements ; une hausse des charges à payer les réduit.",
    "US GAAP : intérêts versés en CFO, dividendes versés en CFF.",
  ],
  questions: [
    (() => {
      const sales = 5_000, dAR = 200;
      const a = sales - dAR;
      return q("fsa-cfd-f1", "facile", "Cash collected from customers, in $ thousands?",
        [["Revenue ($ thousands)", E(sales)], ["Increase in accounts receivable ($ thousands)", E(dAR)]],
        a, "$", 0,
        [`Encaissements = ${F(sales)} − ${F(dAR)} = ${K(a)}.`]);
    })(),
    (() => {
      const cogs = 3_000, dInv = 150, dAP = 100;
      const a = cogs + dInv - dAP;
      return q("fsa-cfd-f2", "facile", "Cash paid to suppliers, in $ thousands?",
        [["Cost of goods sold ($ thousands)", E(cogs)], ["Increase in inventory ($ thousands)", E(dInv)], ["Increase in accounts payable ($ thousands)", E(dAP)]],
        a, "$", 0,
        [`Achats = ${F(cogs)} + ${F(dInv)} = ${F(cogs + dInv)}.`, `Décaissements = ${F(cogs + dInv)} − ${F(dAP)} (crédit fournisseur) = ${K(a)}.`]);
    })(),
    (() => {
      const wages = 900, dWp = -30;
      const a = wages - dWp;
      return q("fsa-cfd-f3", "facile", "Cash paid to employees, in $ thousands?",
        [["Wages and salaries expense ($ thousands)", E(wages)], ["Decrease in wages payable ($ thousands)", E(-dWp)]],
        a, "$", 0,
        [`La baisse des salaires à payer signifie qu'on a payé plus que la charge.`, `Salaires versés = ${F(wages)} + ${F(-dWp)} = ${K(a)}.`]);
    })(),
    (() => {
      const decl = 120, dDp = 20;
      const a = decl - dDp;
      return q("fsa-cfd-f4", "facile", "Cash dividends paid, in $ thousands?",
        [["Dividends declared ($ thousands)", E(decl)], ["Increase in dividends payable ($ thousands)", E(dDp)]],
        a, "$", 0,
        [`Dividendes versés = ${F(decl)} − ${F(dDp)} = ${K(a)}.`]);
    })(),
    (() => {
      const cogs = 2_400, beg = 500, end = 560;
      const a = cogs + end - beg;
      return q("fsa-cfd-f5", "facile", "Purchases of inventory, in $ thousands?",
        [["Cost of goods sold ($ thousands)", E(cogs)], ["Beginning inventory ($ thousands)", E(beg)], ["Ending inventory ($ thousands)", E(end)]],
        a, "$", 0,
        [`Achats = COGS + stock final − stock initial = ${F(cogs)} + ${F(end)} − ${F(beg)} = ${K(a)}.`]);
    })(),
    (() => {
      const exp = 300, dTp = 25, dDtl = 15;
      const a = exp - dTp - dDtl;
      return q("fsa-cfd-m1", "moyen", "Cash paid for income taxes, in $ thousands?",
        [["Income tax expense ($ thousands)", E(exp)], ["Increase in income taxes payable ($ thousands)", E(dTp)], ["Increase in deferred tax liability ($ thousands)", E(dDtl)]],
        a, "$", 0,
        [`Impôt exigible = charge − ΔDTL = ${F(exp)} − ${F(dDtl)} = ${F(exp - dDtl)}.`,
          `Impôts payés = ${F(exp - dDtl)} − hausse des impôts à payer ${F(dTp)} = ${K(a)}.`]);
    })(),
    (() => {
      const cost = 400, ad = 250, gain = 30;
      const a = cost - ad + gain;
      return q("fsa-cfd-m2", "moyen", "Cash proceeds from the sale of equipment, in $ thousands?",
        [["Original cost of equipment sold ($ thousands)", E(cost)], ["Accumulated depreciation on equipment sold ($ thousands)", E(ad)], ["Gain on sale ($ thousands)", E(gain)]],
        a, "$", 0,
        [`Valeur comptable = ${F(cost)} − ${F(ad)} = ${F(cost - ad)}.`, `Produit = ${F(cost - ad)} + gain ${F(gain)} = ${K(a)} (flux de CFI).`]);
    })(),
    (() => {
      const re0 = 1_800, ni = 500, re1 = 2_050, dDp = 10;
      const decl = re0 + ni - re1;
      const a = decl - dDp;
      return q("fsa-cfd-m3", "moyen", "Cash dividends paid, in $ thousands?",
        [["Retained earnings, beginning of year ($ thousands)", E(re0)], ["Net income ($ thousands)", E(ni)], ["Retained earnings, end of year ($ thousands)", E(re1)],
          ["Increase in dividends payable ($ thousands)", E(dDp)]],
        a, "$", 0,
        [`Dividendes déclarés = ${F(re0)} + ${F(ni)} − ${F(re1)} = ${F(decl)}.`, `Versés = ${F(decl)} − ${F(dDp)} = ${K(a)}.`]);
    })(),
    (() => {
      const sales = 8_000, ar0 = 900, ar1 = 1_050, un0 = 100, un1 = 140;
      const a = sales - (ar1 - ar0) + (un1 - un0);
      return q("fsa-cfd-m4", "moyen", "Cash collected from customers, in $ thousands?",
        [["Revenue ($ thousands)", E(sales)], ["Accounts receivable, beginning / end ($ thousands)", lst([E(ar0), E(ar1)])],
          ["Unearned revenue, beginning / end ($ thousands)", lst([E(un0), E(un1)])]],
        a, "$", 0,
        [`Hausse des créances : −${F(ar1 - ar0)} ; hausse des avances clients : +${F(un1 - un0)} (encaissées avant d'être comptabilisées).`,
          `Encaissements = ${F(sales)} − ${F(ar1 - ar0)} + ${F(un1 - un0)} = ${K(a)}.`]);
    })(),
    (() => {
      const g0 = 3_000, g1 = 3_400, costSold = 250;
      const a = g1 - g0 + costSold;
      return q("fsa-cfd-m5", "moyen", "Cash paid for purchases of PP&E, in $ thousands?",
        [["Gross PP&E, beginning / end ($ thousands)", lst([E(g0), E(g1)])], ["Original cost of PP&E sold during the year ($ thousands)", E(costSold)]],
        a, "$", 0,
        [`Brut fin = brut début + achats − coût des actifs cédés.`, `Achats = ${F(g1)} − ${F(g0)} + ${F(costSold)} = ${K(a)}.`]);
    })(),
    (() => {
      const sales = 10_000, cogs = 6_000, wages = 1_200, other = 800, interest = 150, tax = 400, dep = 500;
      const dAR = 300, dInv = -100, dAP = 50, dWp = 40, dTp = -30;
      const cust = sales - dAR, supp = cogs + dInv - dAP, emp = wages - dWp, taxes = tax - dTp;
      const a = cust - supp - emp - other - interest - taxes;
      return q("fsa-cfd-d1", "difficile", "Cash flow from operations using the direct method, in $ thousands? (U.S. GAAP.)",
        [["Revenue / COGS", lst([E(sales), E(cogs)])], ["Wages / other operating expenses (all paid in cash)", lst([E(wages), E(other)])],
          ["Depreciation", E(dep)], ["Interest expense (paid in cash) / income tax expense", lst([E(interest), E(tax)])],
          ["Change in receivables / inventory / payables", lst([sn(dAR), sn(dInv), sn(dAP)])], ["Change in wages payable / taxes payable", lst([sn(dWp), sn(dTp)])],
          ["All amounts", "$ thousands"]],
        a, "$", 0,
        [`Clients = ${F(sales)} − ${F(dAR)} = ${F(cust)} ; fournisseurs = ${F(cogs)} − ${F(-dInv)} − ${F(dAP)} = ${F(supp)}.`,
          `Salariés = ${F(wages)} − ${F(dWp)} = ${F(emp)} ; impôts = ${F(tax)} + ${F(-dTp)} = ${F(taxes)}.`,
          `CFO = ${F(cust)} − ${F(supp)} − ${F(emp)} − ${F(other)} − ${F(interest)} − ${F(taxes)} = ${K(a)}.`,
          "La dotation aux amortissements n'apparaît pas : donnée-piège."]);
    })(),
    (() => {
      const other = 1_000, pre0 = 60, pre1 = 90, acc0 = 140, acc1 = 120;
      const a = other + (pre1 - pre0) - (acc1 - acc0);
      return q("fsa-cfd-d2", "difficile", "Cash paid for other operating expenses, in $ thousands?",
        [["Other operating expenses ($ thousands)", E(other)], ["Prepaid expenses, beginning / end ($ thousands)", lst([E(pre0), E(pre1)])],
          ["Accrued liabilities, beginning / end ($ thousands)", lst([E(acc0), E(acc1)])]],
        a, "$", 0,
        [`Hausse des charges payées d'avance : +${F(pre1 - pre0)} décaissés en plus.`,
          `Baisse des charges à payer : +${F(acc0 - acc1)} réglés en plus.`,
          `Décaissements = ${F(other)} + ${F(pre1 - pre0)} + ${F(acc0 - acc1)} = ${K(a)}.`]);
    })(),
    (() => {
      const g0 = 5_000, g1 = 5_600, capex = 1_000, ad0 = 2_000, ad1 = 2_250, dep = 400, gain = 25;
      const costSold = g0 + capex - g1;
      const adSold = ad0 + dep - ad1;
      const a = costSold - adSold + gain;
      return q("fsa-cfd-d3", "difficile", "Cash proceeds from the sale of PP&E, in $ thousands?",
        [["Gross PP&E, beginning / end", lst([E(g0), E(g1)])], ["Purchases of PP&E", E(capex)], ["Accumulated depreciation, beginning / end", lst([E(ad0), E(ad1)])],
          ["Depreciation expense", E(dep)], ["Gain on sale of PP&E", E(gain)], ["All amounts", "$ thousands"]],
        a, "$", 0,
        [`Coût des actifs cédés = ${F(g0)} + ${F(capex)} − ${F(g1)} = ${F(costSold)}.`,
          `Cumulés sortis = ${F(ad0)} + ${F(dep)} − ${F(ad1)} = ${F(adSold)} ; valeur comptable = ${F(costSold - adSold)}.`,
          `Produit = ${F(costSold - adSold)} + ${F(gain)} = ${K(a)}.`]);
    })(),
    (() => {
      const issued = 500, repaid = 200, re0 = 3_000, ni = 700, re1 = 3_450, dp0 = 40, dp1 = 55, buyback = 100, interest = 80;
      const decl = re0 + ni - re1;
      const paid = decl - (dp1 - dp0);
      const a = issued - repaid - paid - buyback;
      return q("fsa-cfd-d4", "difficile", "Cash flow from financing activities, in $ thousands? (U.S. GAAP. Enter a net outflow as a negative number.)",
        [["Long-term debt issued / repaid", lst([E(issued), E(repaid)])], ["Retained earnings, beginning / end", lst([E(re0), E(re1)])], ["Net income", E(ni)],
          ["Dividends payable, beginning / end", lst([E(dp0), E(dp1)])], ["Share repurchases", E(buyback)], ["Interest paid", E(interest)], ["All amounts", "$ thousands"]],
        a, "$", 0,
        [`Dividendes déclarés = ${F(re0)} + ${F(ni)} − ${F(re1)} = ${F(decl)} ; versés = ${F(decl)} − ${F(dp1 - dp0)} = ${F(paid)}.`,
          `CFF = ${F(issued)} − ${F(repaid)} − ${F(paid)} − ${F(buyback)} = ${K(a)}.`,
          "En US GAAP, les intérêts versés sont en CFO : donnée-piège."]);
    })(),
    (() => {
      const exp = 520, tp0 = 80, tp1 = 60, dtl0 = 300, dtl1 = 340, dta0 = 50, dta1 = 65;
      const current = exp - (dtl1 - dtl0) + (dta1 - dta0);
      const a = current + (tp0 - tp1);
      return q("fsa-cfd-d5", "difficile", "Cash paid for income taxes, in $ thousands?",
        [["Income tax expense", E(exp)], ["Income taxes payable, beginning / end", lst([E(tp0), E(tp1)])],
          ["Deferred tax liability, beginning / end", lst([E(dtl0), E(dtl1)])], ["Deferred tax asset, beginning / end", lst([E(dta0), E(dta1)])], ["All amounts", "$ thousands"]],
        a, "$", 0,
        [`Charge = exigible + ΔDTL − ΔDTA, donc exigible = ${F(exp)} − ${F(dtl1 - dtl0)} + ${F(dta1 - dta0)} = ${F(current)}.`,
          `Impôts à payer en baisse de ${F(tp0 - tp1)} : on a payé davantage.`,
          `Impôts payés = ${F(current)} + ${F(tp0 - tp1)} = ${K(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 12 · FCFF et FCFE ────────────────────────── */

const FCFF_FCFE: CalcType = {
  key: "fcff-fcfe",
  topic: "fsa",
  name: "Free cash flow : FCFF et FCFE",
  tier: "essentiel",
  source: "LM 5 · Analyzing Statements of Cash Flows II",
  formulas: [
    "FCFF = CFO + intérêts versés × (1 − t) − FCInv",
    "FCFF = RN + charges non monétaires + intérêts × (1 − t) − FCInv − WCInv",
    "FCFE = CFO − FCInv + emprunt net (nouvelles dettes − remboursements)",
    "FCFE = FCFF − intérêts × (1 − t) + emprunt net",
    "FCInv = achats d'immobilisations − produits de cession d'immobilisations",
  ],
  traps: [
    "IFRS : intérêts versés classés en CFF → ne pas les rajouter au CFO ; dividendes classés en CFO → les rajouter.",
    "Le CFI peut contenir des achats ou ventes de titres financiers : FCInv ≠ CFI.",
    "Les dividendes versés ne se retranchent pas : le FCFE mesure ce qui pourrait être distribué.",
  ],
  questions: [
    (() => {
      const cfo = 800, int = 100, t = 0.3, fc = 300;
      const a = cfo + int * (1 - t) - fc;
      return q("fsa-fcf-f1", "facile", "Free cash flow to the firm, in $ millions? (U.S. GAAP.)",
        [["Cash flow from operations", E(cfo)], ["Interest paid", E(int)], ["Tax rate", pc(t)], ["Fixed capital investment", E(fc)]],
        a, "$", 0,
        [`FCFF = ${F(cfo)} + ${F(int)} × (1 − ${F(t)}) − ${F(fc)} = ${F(cfo)} + ${F(int * (1 - t))} − ${F(fc)} = ${M(a)}.`]);
    })(),
    (() => {
      const cfo = 800, fc = 300, nb = 120;
      const a = cfo - fc + nb;
      return q("fsa-fcf-f2", "facile", "Free cash flow to equity, in $ millions?",
        [["Cash flow from operations", E(cfo)], ["Fixed capital investment", E(fc)], ["Net borrowing", E(nb)]],
        a, "$", 0,
        [`FCFE = ${F(cfo)} − ${F(fc)} + ${F(nb)} = ${M(a)}.`]);
    })(),
    (() => {
      const fcff = 900, int = 150, t = 0.25, nb = -100;
      const a = fcff - int * (1 - t) + nb;
      return q("fsa-fcf-f3", "facile", "Free cash flow to equity, in $ millions?",
        [["FCFF", E(fcff)], ["Interest paid", E(int)], ["Tax rate", pc(t)], ["Net borrowing (net debt repaid)", E(nb)]],
        a, "$", 1,
        [`FCFE = FCFF − intérêts × (1 − t) + emprunt net.`, `= ${F(fcff)} − ${F(int * (1 - t))} − ${F(-nb)} = ${M(a, 1)}.`]);
    })(),
    (() => {
      const ni = 400, da = 150, int = 80, t = 0.25, fc = 200, wc = 50;
      const a = ni + da + int * (1 - t) - fc - wc;
      return q("fsa-fcf-f4", "facile", "Free cash flow to the firm, in $ millions?",
        [["Net income", E(ni)], ["Depreciation and amortization", E(da)], ["Interest expense", E(int)], ["Tax rate", pc(t)],
          ["Fixed capital investment", E(fc)], ["Working capital investment", E(wc)]],
        a, "$", 0,
        [`FCFF = ${F(ni)} + ${F(da)} + ${F(int)} × (1 − ${F(t)}) − ${F(fc)} − ${F(wc)} = ${M(a)}.`]);
    })(),
    (() => {
      const cfo = 650, fc = 400, issued = 300, repaid = 180;
      const a = cfo - fc + issued - repaid;
      return q("fsa-fcf-f5", "facile", "Free cash flow to equity, in $ millions?",
        [["Cash flow from operations", E(cfo)], ["Fixed capital investment", E(fc)], ["New debt issued", E(issued)], ["Debt repaid", E(repaid)]],
        a, "$", 0,
        [`Emprunt net = ${F(issued)} − ${F(repaid)} = ${F(issued - repaid)}.`, `FCFE = ${F(cfo)} − ${F(fc)} + ${F(issued - repaid)} = ${M(a)}.`]);
    })(),
    (() => {
      const cfo = 1_000, int = 90, t = 0.3, fc = 350;
      const a = cfo - fc;
      return q("fsa-fcf-m1", "moyen", "Free cash flow to the firm, in $ millions? (IFRS; interest paid is classified in financing activities.)",
        [["Cash flow from operations", E(cfo)], ["Interest paid (reported in CFF)", E(int)], ["Tax rate", pc(t)], ["Fixed capital investment", E(fc)]],
        a, "$", 0,
        ["Les intérêts n'ont pas été déduits du CFO : rien à rajouter.", `FCFF = ${F(cfo)} − ${F(fc)} = ${M(a)}.`,
          `Piège : rajouter ${F(int * (1 - t))} compterait les intérêts deux fois.`]);
    })(),
    (() => {
      const ni = 500, da = 120, gain = 30, int = 60, t = 0.3, capex = 400, proceeds = 90, wc = 40;
      const fc = capex - proceeds;
      const a = ni + da - gain + int * (1 - t) - fc - wc;
      return q("fsa-fcf-m2", "moyen", "Free cash flow to the firm, in $ millions?",
        [["Net income", E(ni)], ["Depreciation", E(da)], ["Gain on sale of equipment", E(gain)], ["Interest expense / tax rate", lst([E(int), pc(t)])],
          ["Capital expenditures / proceeds from equipment sold", lst([E(capex), E(proceeds)])], ["Working capital investment", E(wc)]],
        a, "$", 0,
        [`Charges non monétaires nettes = ${F(da)} − ${F(gain)} = ${F(da - gain)} ; FCInv = ${F(capex)} − ${F(proceeds)} = ${F(fc)}.`,
          `FCFF = ${F(ni)} + ${F(da - gain)} + ${F(int * (1 - t))} − ${F(fc)} − ${F(wc)} = ${M(a)}.`]);
    })(),
    (() => {
      const ni = 700, da = 200, wc = 60, fc = 350, issued = 150, repaid = 50;
      const a = ni + da - wc - fc + issued - repaid;
      return q("fsa-fcf-m3", "moyen", "Free cash flow to equity, in $ millions?",
        [["Net income", E(ni)], ["Depreciation and amortization", E(da)], ["Working capital investment", E(wc)], ["Fixed capital investment", E(fc)],
          ["Debt issued / debt repaid", lst([E(issued), E(repaid)])]],
        a, "$", 0,
        [`CFO = ${F(ni)} + ${F(da)} − ${F(wc)} = ${F(ni + da - wc)}.`, `FCFE = ${F(ni + da - wc)} − ${F(fc)} + (${F(issued)} − ${F(repaid)}) = ${M(a)}.`]);
    })(),
    (() => {
      const cfo = 820, div = 100, int = 50, t = 0.25, fc = 400;
      const a = cfo + div + int * (1 - t) - fc;
      return q("fsa-fcf-m4", "moyen", "Free cash flow to the firm, in $ millions? (IFRS.)",
        [["Cash flow from operations", E(cfo)], ["Dividends paid, classified in CFO", E(div)], ["Interest paid, classified in CFO", E(int)], ["Tax rate", pc(t)],
          ["Fixed capital investment", E(fc)]],
        a, "$", 1,
        ["Dividendes classés en CFO : on les rajoute (ils sont disponibles pour les apporteurs de capitaux).",
          `FCFF = ${F(cfo)} + ${F(div)} + ${F(int)} × (1 − ${F(t)}) − ${F(fc)} = ${M(a, 1)}.`]);
    })(),
    (() => {
      const cfo = 900, int = 80, t = 0.25, capex = 600, proceeds = 50, secSold = 30;
      const cfi = -capex + proceeds + secSold;
      const fc = capex - proceeds;
      const a = cfo + int * (1 - t) - fc;
      return q("fsa-fcf-m5", "moyen", "Free cash flow to the firm, in $ millions? (U.S. GAAP.)",
        [["Cash flow from operations", E(cfo)], ["Interest paid / tax rate", lst([E(int), pc(t)])], ["Cash flow from investing activities", E(cfi)],
          ["CFI detail: capex / PP&E sale proceeds / sale of marketable securities", lst([E(-capex), E(proceeds), E(secSold)])]],
        a, "$", 0,
        [`FCInv = ${F(capex)} − ${F(proceeds)} = ${F(fc)} ; la vente de titres (${F(secSold)}) n'en fait pas partie, donc FCInv ≠ −CFI.`,
          `FCFF = ${F(cfo)} + ${F(int * (1 - t))} − ${F(fc)} = ${M(a)}.`]);
    })(),
    (() => {
      const ni = 1_200, dep = 300, gain = 20, dAR = 80, dInv = 50, dAP = 40, capex = 600, proceeds = 100, issued = 250, repaid = 150, div = 200;
      const cfo = ni + dep - gain - dAR - dInv + dAP;
      const fc = capex - proceeds;
      const a = cfo - fc + issued - repaid;
      return q("fsa-fcf-d1", "difficile", "Free cash flow to equity, in $ millions?",
        [["Net income", E(ni)], ["Depreciation", E(dep)], ["Gain on equipment sold (included in net income)", E(gain)],
          ["Increase in receivables / inventory / payables", lst([E(dAR), E(dInv), E(dAP)])], ["Capital expenditures / proceeds from equipment sold", lst([E(capex), E(proceeds)])],
          ["Debt issued / debt repaid", lst([E(issued), E(repaid)])], ["Dividends paid", E(div)]],
        a, "$", 0,
        [`CFO = ${terms([ni, dep, -gain, -dAR, -dInv, dAP], F)} = ${F(cfo)}.`,
          `FCInv = ${F(capex)} − ${F(proceeds)} = ${F(fc)} ; emprunt net = ${F(issued - repaid)}.`,
          `FCFE = ${F(cfo)} − ${F(fc)} + ${F(issued - repaid)} = ${M(a)} ; les dividendes ne se retranchent pas.`]);
    })(),
    (() => {
      const cfo = 1_500, int = 200, t = 0.3, capex = 700, proceeds = 50, issued = 80, repaid = 200;
      const fc = capex - proceeds;
      const fcff = cfo + int * (1 - t) - fc;
      const a = fcff - int * (1 - t) + (issued - repaid);
      return q("fsa-fcf-d2", "difficile", "Free cash flow to equity, in $ millions? (U.S. GAAP.)",
        [["Cash flow from operations", E(cfo)], ["Interest paid / tax rate", lst([E(int), pc(t)])], ["Capital expenditures / proceeds from PP&E sold", lst([E(capex), E(proceeds)])],
          ["Debt issued / debt repaid", lst([E(issued), E(repaid)])]],
        a, "$", 0,
        [`FCInv = ${F(fc)} ; FCFF = ${F(cfo)} + ${F(int * (1 - t))} − ${F(fc)} = ${F(fcff)}.`,
          `Emprunt net = ${F(issued)} − ${F(repaid)} = ${F(issued - repaid)} (remboursement net).`,
          `FCFE = ${F(fcff)} − ${F(int * (1 - t))} − ${F(repaid - issued)} = ${M(a)} (= CFO − FCInv + emprunt net).`]);
    })(),
    (() => {
      const ni = 800, da = 250, imp = 90, dDtl = 30, wc = 70, int = 100, t = 0.25, fc = 420;
      const a = ni + da + imp + dDtl + int * (1 - t) - wc - fc;
      return q("fsa-fcf-d3", "difficile", "Free cash flow to the firm, in $ millions?",
        [["Net income", E(ni)], ["Depreciation and amortization", E(da)], ["Impairment charge", E(imp)], ["Increase in deferred tax liability", E(dDtl)],
          ["Working capital investment", E(wc)], ["Interest expense / tax rate", lst([E(int), pc(t)])], ["Fixed capital investment", E(fc)]],
        a, "$", 0,
        [`Charges non monétaires = ${F(da)} + ${F(imp)} + ${F(dDtl)} = ${F(da + imp + dDtl)}.`,
          `FCFF = ${F(ni)} + ${F(da + imp + dDtl)} + ${F(int * (1 - t))} − ${F(wc)} − ${F(fc)} = ${M(a)}.`]);
    })(),
    (() => {
      const cfo = 2_400, fc = 1_100, nb = 300, div = 500, shares = 400;
      const fcfe = cfo - fc + nb;
      const a = fcfe / shares;
      return q("fsa-fcf-d4", "difficile", "FCFE per share?",
        [["Cash flow from operations ($ millions)", E(cfo)], ["Fixed capital investment ($ millions)", E(fc)], ["Net borrowing ($ millions)", E(nb)],
          ["Dividends paid ($ millions)", E(div)], ["Weighted average shares outstanding (millions)", E(shares)]],
        a, "$", 2,
        [`FCFE = ${F(cfo)} − ${F(fc)} + ${F(nb)} = ${M(fcfe)}.`, `FCFE par action = ${F(fcfe)} / ${F(shares)} = ${D(a, 2)} ; les dividendes sont une donnée-piège.`]);
    })(),
    (() => {
      const fcff = 1_000, int = 160, t = 0.25, fc = 600;
      const a = fcff - int * (1 - t) + fc;
      return q("fsa-fcf-d5", "difficile", "Cash flow from operations implied, in $ millions? (U.S. GAAP.)",
        [["FCFF", E(fcff)], ["Interest paid", E(int)], ["Tax rate", pc(t)], ["Fixed capital investment", E(fc)]],
        a, "$", 0,
        [`FCFF = CFO + intérêts × (1 − t) − FCInv, donc CFO = FCFF − ${F(int * (1 - t))} + ${F(fc)}.`, `CFO = ${F(fcff)} − ${F(int * (1 - t))} + ${F(fc)} = ${M(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 13 · Ratios d'activité ────────────────────────── */

const ACTIVITY: CalcType = {
  key: "activity-ratios",
  topic: "fsa",
  name: "Ratios d'activité et cycle de conversion du cash",
  tier: "essentiel",
  source: "LM 11 · Financial Analysis Techniques",
  formulas: [
    "Rotation des créances = CA / créances moyennes ; DSO = 365 / rotation",
    "Rotation des stocks = COGS / stock moyen ; DOH = 365 / rotation",
    "Rotation des fournisseurs = achats / fournisseurs moyens ; jours fournisseurs = 365 / rotation ; achats = COGS + Δstocks",
    "Rotation de l'actif = CA / actif total moyen ; immobilisations : CA / immobilisations nettes moyennes ; BFR : CA / BFR moyen",
    "Cycle de conversion du cash = DSO + DOH − jours fournisseurs",
  ],
  traps: [
    "Rotation des stocks : COGS au numérateur, pas le CA.",
    "Fournisseurs : les achats au numérateur (COGS + stock final − stock initial).",
    "Ratio trimestriel : jours du trimestre / rotation trimestrielle.",
  ],
  questions: [
    (() => {
      const rev = 4_800, ar0 = 380, ar1 = 420;
      const a = rev / avg(ar0, ar1);
      return q("fsa-act-f1", "facile", "Receivables turnover?",
        [["Revenue ($ millions)", E(rev)], ["Accounts receivable, beginning / end ($ millions)", lst([E(ar0), E(ar1)])]],
        a, "x", 2,
        [`Créances moyennes = (${F(ar0)} + ${F(ar1)}) / 2 = ${F(avg(ar0, ar1))}.`, `Rotation = ${F(rev)} / ${F(avg(ar0, ar1))} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const cogs = 2_190, inv = 300;
      const turn = cogs / inv;
      const a = 365 / turn;
      return q("fsa-act-f2", "facile", "Days of inventory on hand? (365-day year.)",
        [["Cost of goods sold ($ millions)", E(cogs)], ["Average inventory ($ millions)", E(inv)]],
        a, "", 1,
        [`Rotation des stocks = ${F(cogs)} / ${F(inv)} = ${F(turn, 2)}x.`, `DOH = 365 / ${F(turn, 2)} = ${F(a, 1)} jours.`]);
    })(),
    (() => {
      const purch = 146_000, ap = 16_000;
      const turn = purch / ap;
      const a = 365 / turn;
      return q("fsa-act-f3", "facile", "Number of days of payables? (365-day year.)",
        [["Purchases", usd(purch)], ["Average accounts payable", usd(ap)]],
        a, "", 1,
        [`Rotation des fournisseurs = ${D(purch)} / ${D(ap)} = ${F(turn, 3)}x.`, `Jours fournisseurs = 365 / ${F(turn, 3)} = ${F(a, 1)} jours.`]);
    })(),
    (() => {
      const dso = 45, doh = 60, dpo = 38;
      const a = dso + doh - dpo;
      return q("fsa-act-f4", "facile", "Cash conversion cycle, in days?",
        [["Days of sales outstanding", E(dso)], ["Days of inventory on hand", E(doh)], ["Number of days of payables", E(dpo)]],
        a, "", 0,
        [`Cycle = ${F(dso)} + ${F(doh)} − ${F(dpo)} = ${F(a)} jours.`]);
    })(),
    (() => {
      const rev = 9_000, ta0 = 7_200, ta1 = 7_800;
      const a = rev / avg(ta0, ta1);
      return q("fsa-act-f5", "facile", "Total asset turnover?",
        [["Revenue ($ millions)", E(rev)], ["Total assets, beginning / end ($ millions)", lst([E(ta0), E(ta1)])]],
        a, "x", 2,
        [`Actif moyen = ${F(avg(ta0, ta1))}.`, `Rotation = ${F(rev)} / ${F(avg(ta0, ta1))} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const rev = 12_000, ar0 = 1_400, ar1 = 1_600;
      const turn = rev / avg(ar0, ar1);
      const a = 365 / turn;
      return q("fsa-act-m1", "moyen", "Days of sales outstanding? (365-day year.)",
        [["Revenue ($ millions)", E(rev)], ["Accounts receivable, beginning / end ($ millions)", lst([E(ar0), E(ar1)])]],
        a, "", 1,
        [`Créances moyennes = ${F(avg(ar0, ar1))} ; rotation = ${F(rev)} / ${F(avg(ar0, ar1))} = ${F(turn, 2)}x.`, `DSO = 365 / ${F(turn, 2)} = ${F(a, 1)} jours.`]);
    })(),
    (() => {
      const cogs = 5_400, inv0 = 800, inv1 = 900, ap0 = 600, ap1 = 700;
      const purch = cogs + inv1 - inv0;
      const a = purch / avg(ap0, ap1);
      return q("fsa-act-m2", "moyen", "Payables turnover (based on purchases)?",
        [["Cost of goods sold ($ millions)", E(cogs)], ["Inventory, beginning / end ($ millions)", lst([E(inv0), E(inv1)])],
          ["Accounts payable, beginning / end ($ millions)", lst([E(ap0), E(ap1)])]],
        a, "x", 2,
        [`Achats = ${F(cogs)} + ${F(inv1)} − ${F(inv0)} = ${F(purch)}.`, `Rotation = ${F(purch)} / ${F(avg(ap0, ap1))} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const rev = 7_300, cogs = 4_380, ar = 600, inv = 540, ap = 360, purch = 4_500;
      const dso = 365 / (rev / ar), doh = 365 / (cogs / inv), dpo = 365 / (purch / ap);
      const a = dso + doh - dpo;
      return q("fsa-act-m3", "moyen", "Cash conversion cycle, in days? (365-day year.)",
        [["Revenue / COGS / purchases ($ millions)", lst([E(rev), E(cogs), E(purch)])],
          ["Average receivables / inventory / payables ($ millions)", lst([E(ar), E(inv), E(ap)])]],
        a, "", 1,
        [`DSO = 365 / (${F(rev)} / ${F(ar)}) = ${F(dso, 1)} ; DOH = 365 / (${F(cogs)} / ${F(inv)}) = ${F(doh, 1)}.`,
          `Jours fournisseurs = 365 / (${F(purch)} / ${F(ap)}) = ${F(dpo, 1)}.`,
          `Cycle = ${F(dso, 1)} + ${F(doh, 1)} − ${F(dpo, 1)} = ${F(a, 1)} jours.`]);
    })(),
    (() => {
      const rev = 6_000, n0 = 2_300, n1 = 2_700, gross = 4_000;
      const a = rev / avg(n0, n1);
      return q("fsa-act-m4", "moyen", "Fixed asset turnover?",
        [["Revenue ($ millions)", E(rev)], ["Net PP&E, beginning / end ($ millions)", lst([E(n0), E(n1)])], ["Gross PP&E at year-end ($ millions)", E(gross)]],
        a, "x", 2,
        [`Immobilisations nettes moyennes = ${F(avg(n0, n1))} (le brut ne sert pas).`, `Rotation = ${F(rev)} / ${F(avg(n0, n1))} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const rev = 4_500, ca0 = 1_800, ca1 = 2_000, cl0 = 1_200, cl1 = 1_100;
      const wc0 = ca0 - cl0, wc1 = ca1 - cl1;
      const a = rev / avg(wc0, wc1);
      return q("fsa-act-m5", "moyen", "Working capital turnover?",
        [["Revenue ($ millions)", E(rev)], ["Current assets, beginning / end ($ millions)", lst([E(ca0), E(ca1)])],
          ["Current liabilities, beginning / end ($ millions)", lst([E(cl0), E(cl1)])]],
        a, "x", 2,
        [`BFR (fonds de roulement) : début ${F(wc0)}, fin ${F(wc1)} ; moyenne ${F(avg(wc0, wc1))}.`, `Rotation = ${F(rev)} / ${F(avg(wc0, wc1))} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const rev = 18_250, cogs = 12_775, ar0 = 2_300, ar1 = 2_700, inv0 = 1_900, inv1 = 2_300, ap0 = 1_400, ap1 = 1_600;
      const dso = (avg(ar0, ar1) / rev) * 365, doh = (avg(inv0, inv1) / cogs) * 365;
      const purch = cogs + inv1 - inv0;
      const dpo = (avg(ap0, ap1) / purch) * 365;
      const a = dso + doh - dpo;
      return q("fsa-act-d1", "difficile", "Cash conversion cycle, in days? (365-day year; use average balances.)",
        [["Revenue / COGS ($ millions)", lst([E(rev), E(cogs)])], ["Receivables, beginning / end", lst([E(ar0), E(ar1)])],
          ["Inventory, beginning / end", lst([E(inv0), E(inv1)])], ["Payables, beginning / end", lst([E(ap0), E(ap1)])]],
        a, "", 1,
        [`DSO = ${F(avg(ar0, ar1))} / ${F(rev)} × 365 = ${F(dso, 1)} ; DOH = ${F(avg(inv0, inv1))} / ${F(cogs)} × 365 = ${F(doh, 1)}.`,
          `Achats = ${F(cogs)} + ${F(inv1 - inv0)} = ${F(purch)} ; jours fournisseurs = ${F(avg(ap0, ap1))} / ${F(purch)} × 365 = ${F(dpo, 2)}.`,
          `Cycle = ${F(dso, 1)} + ${F(doh, 1)} − ${F(dpo, 2)} = ${F(a, 1)} jours.`]);
    })(),
    (() => {
      const rev = 2_000, ar = 900, days = 90;
      const turn = rev / ar;
      const a = days / turn;
      return q("fsa-act-d2", "difficile", "Days of sales outstanding for the quarter? (Use a 90-day quarter.)",
        [["Revenue for the quarter ($ millions)", E(rev)], ["Average receivables during the quarter ($ millions)", E(ar)]],
        a, "", 1,
        [`Rotation trimestrielle = ${F(rev)} / ${F(ar)} = ${F(turn, 4)}x.`, `DSO = ${days} / ${F(turn, 4)} = ${F(a, 1)} jours (pas 365 / rotation trimestrielle).`]);
    })(),
    (() => {
      const rev = 7_300, target = 40, cur = 1_000;
      const targetAR = (rev / 365) * target;
      const a = cur - targetAR;
      return q("fsa-act-d3", "difficile", "Cash released if DSO falls to the target, in $ millions? (365-day year.)",
        [["Annual revenue ($ millions)", E(rev)], ["Current average receivables ($ millions)", E(cur)], ["Target days of sales outstanding", E(target)]],
        a, "$", 0,
        [`DSO actuel = ${F(cur)} / ${F(rev)} × 365 = ${F((cur / rev) * 365, 1)} jours.`,
          `Créances visées = ${F(rev)} / 365 × ${target} = ${F(targetAR)}.`, `Cash libéré = ${F(cur)} − ${F(targetAR)} = ${M(a)}.`]);
    })(),
    (() => {
      const doh = 73, inv = 1_200, rev = 9_000;
      const turn = 365 / doh;
      const cogs = turn * inv;
      const a = ((rev - cogs) / rev) * 100;
      return q("fsa-act-d4", "difficile", "Gross profit margin implied? (365-day year.)",
        [["Days of inventory on hand", E(doh)], ["Average inventory ($ millions)", E(inv)], ["Revenue ($ millions)", E(rev)]],
        a, "%", 2,
        [`Rotation = 365 / ${doh} = ${F(turn, 2)}x ; COGS = ${F(turn, 2)} × ${F(inv)} = ${F(cogs)}.`,
          `Marge brute = (${F(rev)} − ${F(cogs)}) / ${F(rev)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const dso1 = 52, doh1 = 70, dpo1 = 35;
      const rev = 14_600, ar = 1_800, cogs = 9_125, inv = 1_625, purch = 9_490, ap = 1_040;
      const ccc1 = dso1 + doh1 - dpo1;
      const dso2 = (ar / rev) * 365, doh2 = (inv / cogs) * 365, dpo2 = (ap / purch) * 365;
      const ccc2 = dso2 + doh2 - dpo2;
      const a = ccc1 - ccc2;
      return q("fsa-act-d5", "difficile", "Reduction in the cash conversion cycle from Year 1 to Year 2, in days? (365-day year.)",
        [["Year 1: DSO / DOH / days of payables", lst([E(dso1), E(doh1), E(dpo1)])], ["Year 2: revenue / average receivables ($ millions)", lst([E(rev), E(ar)])],
          ["Year 2: COGS / average inventory", lst([E(cogs), E(inv)])], ["Year 2: purchases / average payables", lst([E(purch), E(ap)])]],
        a, "", 1,
        [`Année 1 : cycle = ${F(dso1)} + ${F(doh1)} − ${F(dpo1)} = ${F(ccc1)} jours.`,
          `Année 2 : DSO = ${F(dso2, 1)}, DOH = ${F(doh2, 1)}, jours fournisseurs = ${F(dpo2, 1)} → cycle = ${F(ccc2, 1)} jours.`,
          `Amélioration = ${F(ccc1)} − ${F(ccc2, 1)} = ${F(a, 1)} jours.`]);
    })(),
  ],
};

/* ────────────────────────── 14 · Liquidité et solvabilité ────────────────────────── */

const LIQUIDITY_SOLVENCY: CalcType = {
  key: "liquidity-solvency",
  topic: "fsa",
  name: "Ratios de liquidité et de solvabilité",
  tier: "essentiel",
  source: "LM 11 · Financial Analysis Techniques",
  formulas: [
    "Current = actif courant / passif courant ; quick = (cash + titres de placement + créances) / passif courant ; cash = (cash + titres) / passif courant",
    "Defensive interval = (cash + titres + créances) / dépenses cash quotidiennes (charges hors éléments non monétaires / 365)",
    "Debt-to-equity = dette / capitaux propres ; debt-to-capital = dette / (dette + capitaux propres, privilégiées incluses) ; debt-to-assets = dette / actif",
    "Levier financier = actif moyen / capitaux propres moyens ; debt-to-EBITDA = dette / EBITDA",
    "Couverture des intérêts = EBIT / intérêts ; fixed charge coverage = (EBIT + loyers) / (intérêts + loyers)",
  ],
  traps: [
    "Dette = dettes financières portant intérêt (court et long terme) : ni fournisseurs ni charges à payer.",
    "Quick ratio : sans stocks ni charges payées d'avance.",
    "Payer un fournisseur avec du cash fait monter un current ratio supérieur à 1.",
  ],
  questions: [
    (() => {
      const ca = 1_800, cl = 1_200;
      const a = ca / cl;
      return q("fsa-liq-f1", "facile", "Current ratio?",
        [["Current assets ($ millions)", E(ca)], ["Current liabilities ($ millions)", E(cl)]],
        a, "x", 2, [`Current ratio = ${F(ca)} / ${F(cl)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const cash = 150, ms = 50, ar = 300, inv = 400, cl = 500;
      const a = (cash + ms + ar) / cl;
      return q("fsa-liq-f2", "facile", "Quick ratio?",
        [["Cash / marketable securities", lst([E(cash), E(ms)])], ["Accounts receivable", E(ar)], ["Inventory", E(inv)], ["Current liabilities", E(cl)]],
        a, "x", 2,
        [`Quick = (${F(cash)} + ${F(ms)} + ${F(ar)}) / ${F(cl)} = ${F(a, 2)}x (sans les stocks).`]);
    })(),
    (() => {
      const st = 200, lt = 800, eq = 1_250;
      const a = (st + lt) / eq;
      return q("fsa-liq-f3", "facile", "Debt-to-equity ratio?",
        [["Short-term debt ($ millions)", E(st)], ["Long-term debt ($ millions)", E(lt)], ["Total shareholders' equity ($ millions)", E(eq)]],
        a, "x", 2,
        [`Dette = ${F(st)} + ${F(lt)} = ${F(st + lt)}.`, `D/E = ${F(st + lt)} / ${F(eq)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const ebit = 900, int = 150;
      const a = ebit / int;
      return q("fsa-liq-f4", "facile", "Interest coverage ratio?",
        [["EBIT ($ millions)", E(ebit)], ["Interest payments ($ millions)", E(int)]],
        a, "x", 2, [`Couverture = ${F(ebit)} / ${F(int)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const debt = 600, eq = 900;
      const a = (debt / (debt + eq)) * 100;
      return q("fsa-liq-f5", "facile", "Debt-to-capital ratio?",
        [["Total debt ($ millions)", E(debt)], ["Total shareholders' equity ($ millions)", E(eq)]],
        a, "%", 1, [`Debt-to-capital = ${F(debt)} / (${F(debt)} + ${F(eq)}) = ${Pa(a, 1)}.`]);
    })(),
    (() => {
      const cash = 120, ms = 80, ar = 260, inv = 340, pre = 20, cl = 400;
      const a = (cash + ms) / cl;
      return q("fsa-liq-m1", "moyen", "Cash ratio?",
        [["Cash / marketable securities", lst([E(cash), E(ms)])], ["Receivables / inventory / prepaid expenses", lst([E(ar), E(inv), E(pre)])],
          ["Current liabilities", E(cl)]],
        a, "x", 2,
        [`Cash ratio = (${F(cash)} + ${F(ms)}) / ${F(cl)} = ${F(a, 2)}x.`, `(Current = ${F((cash + ms + ar + inv + pre) / cl, 2)}x ; quick = ${F((cash + ms + ar) / cl, 2)}x.)`]);
    })(),
    (() => {
      const cash = 200, ms = 100, ar = 300, opex = 4_250, dep = 230;
      const daily = (opex - dep) / 365;
      const a = (cash + ms + ar) / daily;
      return q("fsa-liq-m2", "moyen", "Defensive interval ratio, in days? (365-day year.)",
        [["Cash / marketable securities / receivables ($ thousands)", lst([E(cash), E(ms), E(ar)])], ["Total operating expenses for the year ($ thousands)", E(opex)],
          ["Depreciation included in operating expenses ($ thousands)", E(dep)]],
        a, "", 1,
        [`Dépenses cash = ${F(opex)} − ${F(dep)} = ${F(opex - dep)} ; par jour = ${F(daily, 2)}.`,
          `Defensive interval = ${F(cash + ms + ar)} / ${F(daily, 2)} = ${F(a, 1)} jours.`]);
    })(),
    (() => {
      const ebit = 500, int = 80, lease = 120;
      const a = (ebit + lease) / (int + lease);
      return q("fsa-liq-m3", "moyen", "Fixed charge coverage ratio?",
        [["EBIT ($ millions)", E(ebit)], ["Interest payments ($ millions)", E(int)], ["Lease payments ($ millions)", E(lease)]],
        a, "x", 2,
        [`Fixed charge coverage = (${F(ebit)} + ${F(lease)}) / (${F(int)} + ${F(lease)}) = ${F(a, 2)}x (couverture des intérêts seule : ${F(ebit / int, 2)}x).`]);
    })(),
    (() => {
      const ap = 300, accr = 100, notes = 150, cur = 50, ltd = 700, eq = 1_600;
      const debt = notes + cur + ltd;
      const a = debt / eq;
      return q("fsa-liq-m4", "moyen", "Debt-to-equity ratio?",
        [["Accounts payable / accrued expenses", lst([E(ap), E(accr)])], ["Short-term notes payable", E(notes)], ["Current portion of long-term debt", E(cur)],
          ["Long-term debt", E(ltd)], ["Total shareholders' equity", E(eq)]],
        a, "x", 2,
        [`Dette financière = ${F(notes)} + ${F(cur)} + ${F(ltd)} = ${F(debt)} (fournisseurs et charges à payer exclus).`, `D/E = ${F(debt)} / ${F(eq)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const ta0 = 4_000, ta1 = 4_400, e0 = 1_500, e1 = 1_700;
      const a = avg(ta0, ta1) / avg(e0, e1);
      return q("fsa-liq-m5", "moyen", "Financial leverage ratio?",
        [["Total assets, beginning / end ($ millions)", lst([E(ta0), E(ta1)])], ["Total equity, beginning / end ($ millions)", lst([E(e0), E(e1)])]],
        a, "x", 2,
        [`Actif moyen = ${F(avg(ta0, ta1))} ; capitaux propres moyens = ${F(avg(e0, e1))}.`, `Levier = ${F(avg(ta0, ta1))} / ${F(avg(e0, e1))} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const ca = 2_000, cl = 1_600, pay = 400;
      const a = (ca - pay) / (cl - pay);
      return q("fsa-liq-d1", "difficile", "Current ratio after the company uses cash to pay accounts payable?",
        [["Current assets ($ millions)", E(ca)], ["Current liabilities ($ millions)", E(cl)], ["Accounts payable paid with cash ($ millions)", E(pay)]],
        a, "x", 2,
        [`Avant : ${F(ca)} / ${F(cl)} = ${F(ca / cl, 2)}x.`, `Le cash et les fournisseurs baissent de ${F(pay)} : (${F(ca)} − ${F(pay)}) / (${F(cl)} − ${F(pay)}) = ${F(a, 2)}x.`,
          "Un ratio supérieur à 1 augmente quand on réduit numérateur et dénominateur du même montant."]);
    })(),
    (() => {
      const ebit = 700, da = 300, st = 250, lt = 1_750, ap = 500, int = 100;
      const a = (st + lt) / (ebit + da);
      return q("fsa-liq-d2", "difficile", "Debt-to-EBITDA ratio?",
        [["EBIT / depreciation and amortization", lst([E(ebit), E(da)])], ["Short-term debt / long-term debt", lst([E(st), E(lt)])], ["Accounts payable", E(ap)],
          ["Interest expense", E(int)]],
        a, "x", 2,
        [`EBITDA = ${F(ebit)} + ${F(da)} = ${F(ebit + da)} ; dette = ${F(st)} + ${F(lt)} = ${F(st + lt)}.`,
          `Debt-to-EBITDA = ${F(st + lt)} / ${F(ebit + da)} = ${F(a, 2)}x ; fournisseurs et intérêts sont des données-pièges.`]);
    })(),
    (() => {
      const cash = 300, ms = 100, ar = 400, inv = 600, cl = 800, buy = 200;
      const a = (cash + ms + ar) / (cl + buy);
      return q("fsa-liq-d3", "difficile", "Quick ratio after purchasing inventory on credit?",
        [["Cash / marketable securities / receivables", lst([E(cash), E(ms), E(ar)])], ["Inventory", E(inv)], ["Current liabilities", E(cl)],
          ["Inventory purchased on credit", E(buy)]],
        a, "x", 2,
        [`Avant : (${F(cash)} + ${F(ms)} + ${F(ar)}) / ${F(cl)} = ${F((cash + ms + ar) / cl, 2)}x.`,
          `L'achat à crédit augmente les stocks (hors quick) et le passif courant de ${F(buy)}.`,
          `Après : ${F(cash + ms + ar)} / ${F(cl + buy)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const st = 350, lt = 1_050, ap = 420, pref = 250, ce = 1_850;
      const debt = st + lt;
      const a = (debt / (debt + pref + ce)) * 100;
      return q("fsa-liq-d4", "difficile", "Debt-to-capital ratio?",
        [["Short-term debt / long-term debt", lst([E(st), E(lt)])], ["Accounts payable", E(ap)], ["Preferred stock", E(pref)], ["Common equity", E(ce)]],
        a, "%", 1,
        [`Dette = ${F(st)} + ${F(lt)} = ${F(debt)} ; capital = dette + privilégiées + capitaux propres ordinaires = ${F(debt + pref + ce)}.`,
          `Debt-to-capital = ${F(debt)} / ${F(debt + pref + ce)} = ${Pa(a, 1)}.`]);
    })(),
    (() => {
      const cogs = 6_000, sga = 1_800, depSga = 150, depCogs = 250, cash = 400, ms = 150, ar = 900, inv = 1_100;
      const cashExp = cogs + sga - depSga - depCogs;
      const daily = cashExp / 365;
      const a = (cash + ms + ar) / daily;
      return q("fsa-liq-d5", "difficile", "Defensive interval ratio, in days? (365-day year.)",
        [["COGS (includes depreciation of 250)", E(cogs)], ["SG&A (includes depreciation of 150)", E(sga)],
          ["Cash / marketable securities / receivables", lst([E(cash), E(ms), E(ar)])], ["Inventory", E(inv)], ["All amounts", "$ thousands"]],
        a, "", 1,
        [`Dépenses cash = ${F(cogs)} + ${F(sga)} − ${F(depCogs)} − ${F(depSga)} = ${F(cashExp)} ; par jour = ${F(daily, 2)}.`,
          `Actifs défensifs = ${F(cash)} + ${F(ms)} + ${F(ar)} = ${F(cash + ms + ar)} (sans les stocks).`,
          `Defensive interval = ${F(cash + ms + ar)} / ${F(daily, 2)} = ${F(a, 1)} jours.`]);
    })(),
  ],
};

/* ────────────────────────── 15 · DuPont ────────────────────────── */

const DUPONT: CalcType = {
  key: "dupont",
  topic: "fsa",
  name: "ROE et décomposition DuPont (3 et 5 facteurs)",
  tier: "essentiel",
  top: true,
  source: "LM 11 · Financial Analysis Techniques",
  formulas: [
    "ROE = RN / capitaux propres moyens",
    "3 facteurs : ROE = marge nette (RN / CA) × rotation de l'actif (CA / actif moyen) × levier (actif moyen / capitaux propres moyens)",
    "5 facteurs : ROE = (RN / EBT) × (EBT / EBIT) × (EBIT / CA) × (CA / actif) × (actif / capitaux propres)",
    "Tax burden = RN / EBT = 1 − taux d'impôt ; interest burden = EBT / EBIT",
    "ROA = marge nette × rotation de l'actif ; ROE = ROA × levier",
  ],
  traps: [
    "Un ROE qui monte grâce au seul levier n'est pas une amélioration opérationnelle.",
    "Tax burden plus élevé = MOINS d'impôt (c'est 1 − t).",
    "Return on common equity : retirer les dividendes privilégiés du numérateur et les privilégiées du dénominateur.",
  ],
  questions: [
    (() => {
      const npm = 0.08, tat = 1.5, lev = 2;
      const a = npm * tat * lev * 100;
      return q("fsa-dup-f1", "facile", "Return on equity?",
        [["Net profit margin", pc(npm)], ["Total asset turnover", mx(tat)], ["Financial leverage (assets / equity)", mx(lev)]],
        a, "%", 2, [`ROE = ${P(npm)} × ${F(tat)} × ${F(lev)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const npm = 0.05, tat = 1.8;
      const a = npm * tat * 100;
      return q("fsa-dup-f2", "facile", "Return on assets?",
        [["Net profit margin", pc(npm)], ["Total asset turnover", mx(tat)]],
        a, "%", 2, [`ROA = marge nette × rotation de l'actif = ${P(npm)} × ${F(tat)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const roa = 0.06, lev = 2.5;
      const a = roa * lev * 100;
      return q("fsa-dup-f3", "facile", "Return on equity?",
        [["Return on assets", pc(roa)], ["Financial leverage (assets / equity)", mx(lev)]],
        a, "%", 2, [`ROE = ROA × levier = ${P(roa)} × ${F(lev)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const ni = 750, ebt = 1_000;
      const a = ni / ebt;
      return q("fsa-dup-f4", "facile", "Tax burden ratio?",
        [["Net income ($ millions)", E(ni)], ["Earnings before tax ($ millions)", E(ebt)]],
        a, "", 2, [`Tax burden = RN / EBT = ${F(ni)} / ${F(ebt)} = ${F(a, 2)} (taux d'impôt de ${P(1 - a)}).`]);
    })(),
    (() => {
      const ni = 480, e0 = 2_800, e1 = 3_200;
      const a = (ni / avg(e0, e1)) * 100;
      return q("fsa-dup-f5", "facile", "Return on equity (average equity)?",
        [["Net income ($ millions)", E(ni)], ["Total equity, beginning / end ($ millions)", lst([E(e0), E(e1)])]],
        a, "%", 2, [`Capitaux propres moyens = ${F(avg(e0, e1))}.`, `ROE = ${F(ni)} / ${F(avg(e0, e1))} = ${Pa(a)}.`]);
    })(),
    (() => {
      const tb = 0.7, ib = 0.85, em = 0.12, tat = 1.2, lev = 2.2;
      const a = tb * ib * em * tat * lev * 100;
      return q("fsa-dup-m1", "moyen", "Return on equity (five-way DuPont)?",
        [["Tax burden (NI / EBT)", E(tb)], ["Interest burden (EBT / EBIT)", E(ib)], ["EBIT margin", pc(em)], ["Total asset turnover", mx(tat)],
          ["Financial leverage", mx(lev)]],
        a, "%", 2, [`ROE = ${F(tb)} × ${F(ib)} × ${F(em)} × ${F(tat)} × ${F(lev)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const ni = 300, rev = 5_000, ta = 4_000, eq = 1_600;
      const npm = ni / rev, tat = rev / ta, lev = ta / eq;
      const a = npm * tat * lev * 100;
      return q("fsa-dup-m2", "moyen", "Return on equity (three-way DuPont)?",
        [["Net income ($ millions)", E(ni)], ["Revenue ($ millions)", E(rev)], ["Average total assets ($ millions)", E(ta)], ["Average total equity ($ millions)", E(eq)]],
        a, "%", 2,
        [`Marge nette = ${F(ni)} / ${F(rev)} = ${P(npm)} ; rotation = ${F(rev)} / ${F(ta)} = ${F(tat, 2)} ; levier = ${F(ta)} / ${F(eq)} = ${F(lev, 2)}.`,
          `ROE = ${P(npm)} × ${F(tat, 2)} × ${F(lev, 2)} = ${Pa(a)} (= ${F(ni)} / ${F(eq)}).`]);
    })(),
    (() => {
      const roe = 0.18, npm = 0.06, tat = 1.2;
      const a = roe / (npm * tat);
      return q("fsa-dup-m3", "moyen", "Financial leverage ratio implied?",
        [["Return on equity", pc(roe)], ["Net profit margin", pc(npm)], ["Total asset turnover", mx(tat)]],
        a, "x", 2,
        [`ROA = ${P(npm)} × ${F(tat)} = ${P(npm * tat, 1)}.`, `Levier = ROE / ROA = ${P(roe)} / ${P(npm * tat, 1)} = ${F(a, 2)}x.`]);
    })(),
    (() => {
      const rev = 10_000, ebit = 1_500, int = 300, t = 0.25, ta = 8_000, eq = 4_000;
      const ebt = ebit - int, ni = ebt * (1 - t);
      const a = (ni / ebt) * (ebt / ebit) * (ebit / rev) * (rev / ta) * (ta / eq) * 100;
      return q("fsa-dup-m4", "moyen", "Return on equity (five-way DuPont)?",
        [["Revenue / EBIT ($ millions)", lst([E(rev), E(ebit)])], ["Interest expense ($ millions)", E(int)], ["Tax rate", pc(t)],
          ["Average total assets / average equity ($ millions)", lst([E(ta), E(eq)])]],
        a, "%", 2,
        [`EBT = ${F(ebit)} − ${F(int)} = ${F(ebt)} ; RN = ${F(ebt)} × (1 − ${F(t)}) = ${F(ni)}.`,
          `Tax burden ${F(ni / ebt, 2)} × interest burden ${F(ebt / ebit, 2)} × marge d'EBIT ${P(ebit / rev)} × rotation ${F(rev / ta, 2)} × levier ${F(ta / eq, 2)}.`,
          `ROE = ${Pa(a)}.`]);
    })(),
    (() => {
      const npm = 0.05, tat = 2, lev0 = 1.8, lev1 = 2.4;
      const a = npm * tat * (lev1 - lev0) * 100;
      return q("fsa-dup-m5", "moyen", "Change in ROE (in percentage points) caused by the higher leverage?",
        [["Net profit margin (both years)", pc(npm)], ["Total asset turnover (both years)", mx(tat)], ["Financial leverage, Year 1 / Year 2", lst([mx(lev0), mx(lev1)])]],
        a, "%", 1,
        [`ROE année 1 = ${P(npm)} × ${F(tat)} × ${F(lev0)} = ${P(npm * tat * lev0)} ; année 2 = ${P(npm * tat * lev1)}.`,
          `Hausse = ${F(a, 1)} points, due uniquement au levier (plus de risque, pas plus de performance).`]);
    })(),
    (() => {
      const rev = 20_000, cogs = 12_000, sga = 4_500, int = 500, t = 0.3, div = 600, ta0 = 15_000, ta1 = 17_000, e0 = 6_000, e1 = 7_000;
      const ebit = rev - cogs - sga, ebt = ebit - int, ni = ebt * (1 - t);
      const ta = avg(ta0, ta1), eq = avg(e0, e1);
      const a = (ni / ebt) * (ebt / ebit) * (ebit / rev) * (rev / ta) * (ta / eq) * 100;
      return q("fsa-dup-d1", "difficile", "Return on equity using the five-way DuPont decomposition?",
        [["Revenue / COGS / SG&A ($ millions)", lst([E(rev), E(cogs), E(sga)])], ["Interest expense ($ millions)", E(int)], ["Tax rate", pc(t)],
          ["Dividends paid ($ millions)", E(div)], ["Total assets, beginning / end", lst([E(ta0), E(ta1)])], ["Total equity, beginning / end", lst([E(e0), E(e1)])]],
        a, "%", 2,
        [`EBIT = ${F(rev)} − ${F(cogs)} − ${F(sga)} = ${F(ebit)} ; EBT = ${F(ebt)} ; RN = ${F(ni)}.`,
          `Facteurs : ${F(ni / ebt, 2)} × ${F(ebt / ebit, 4)} × ${P(ebit / rev, 2)} × ${F(rev / ta, 2)} × ${F(ta / eq, 4)}.`,
          `ROE = ${F(ni)} / ${F(eq)} = ${Pa(a)} ; les dividendes sont une donnée-piège.`]);
    })(),
    (() => {
      const tb = 0.75, ib1 = 0.9, ib2 = 0.8, em = 0.1, tat = 1.5, lev1 = 2, lev2 = 2.5;
      const roe1 = tb * ib1 * em * tat * lev1, roe2 = tb * ib2 * em * tat * lev2;
      const a = tb * ib2 * em * tat * lev1 * 100;
      return q("fsa-dup-d2", "difficile", "Year-2 ROE if financial leverage had stayed at its Year-1 level (all other Year-2 factors unchanged)?",
        [["Tax burden (both years)", E(tb)], ["Interest burden, Year 1 / Year 2", lst([E(ib1), E(ib2)])], ["EBIT margin (both years)", pc(em)],
          ["Total asset turnover (both years)", mx(tat)], ["Financial leverage, Year 1 / Year 2", lst([mx(lev1), mx(lev2)])]],
        a, "%", 2,
        [`ROE publiés : année 1 = ${P(roe1, 2)}, année 2 = ${P(roe2, 2)}.`,
          `Année 2 avec le levier de l'année 1 : ${F(tb)} × ${F(ib2)} × ${F(em)} × ${F(tat)} × ${F(lev1)} = ${Pa(a)}.`,
          "La dette supplémentaire alourdit les intérêts (interest burden ↓) ; sans l'effet de levier, le ROE aurait baissé."]);
    })(),
    (() => {
      const target = 0.2, tat = 1.6, ta = 5_000, eq = 2_000;
      const lev = ta / eq;
      const npm = target / (tat * lev);
      const rev = tat * ta;
      const a = npm * rev;
      return q("fsa-dup-d3", "difficile", "Net income required to reach the target ROE, in $ millions?",
        [["Target ROE", pc(target)], ["Total asset turnover", mx(tat)], ["Average total assets ($ millions)", E(ta)], ["Average total equity ($ millions)", E(eq)]],
        a, "$", 0,
        [`Levier = ${F(ta)} / ${F(eq)} = ${F(lev)} ; marge nette requise = ${P(target)} / (${F(tat)} × ${F(lev)}) = ${P(npm)}.`,
          `CA = ${F(tat)} × ${F(ta)} = ${F(rev)} ; RN = ${P(npm)} × ${F(rev)} = ${M(a)} (= ${P(target)} × ${F(eq)}).`]);
    })(),
    (() => {
      const ta = 10_000, eq = 5_000, ni = 800, borrow = 2_000, r = 0.05, t = 0.25;
      const ni1 = ni - borrow * r * (1 - t);
      const eq1 = eq - borrow;
      const a = (ni1 / eq1) * 100;
      return q("fsa-dup-d4", "difficile", "ROE after a debt-financed share repurchase at the start of the year? (Use equity immediately after the repurchase; assume all net income is paid out as dividends, so assets and equity stay constant.)",
        [["Total assets (unchanged)", E(ta)], ["Equity before the repurchase", E(eq)], ["Net income before the transaction", E(ni)],
          ["New debt used to repurchase shares", E(borrow)], ["Pretax interest rate on the new debt / tax rate", lst([pc(r), pc(t)])], ["All amounts", "$ millions"]],
        a, "%", 2,
        [`Intérêts après impôt = ${F(borrow)} × ${P(r)} × (1 − ${F(t)}) = ${F(borrow * r * (1 - t))} → RN = ${F(ni1)}.`,
          `Capitaux propres = ${F(eq)} − ${F(borrow)} = ${F(eq1)} ; levier = ${F(ta / eq1, 2)}x (contre ${F(ta / eq, 2)}x).`,
          `ROE = ${F(ni1)} / ${F(eq1)} = ${Pa(a)} (contre ${P(ni / eq, 2)}) : le levier fait plus que compenser la baisse de la marge.`]);
    })(),
    (() => {
      const ni = 1_200, prefDiv = 150, totEq = 7_500, prefEq = 1_500;
      const ce = totEq - prefEq;
      const a = ((ni - prefDiv) / ce) * 100;
      return q("fsa-dup-d5", "difficile", "Return on common equity?",
        [["Net income ($ millions)", E(ni)], ["Preferred dividends ($ millions)", E(prefDiv)], ["Average total equity ($ millions)", E(totEq)],
          ["Average preferred equity included in total equity ($ millions)", E(prefEq)]],
        a, "%", 2,
        [`Capitaux propres ordinaires moyens = ${F(totEq)} − ${F(prefEq)} = ${F(ce)}.`,
          `Return on common equity = (${F(ni)} − ${F(prefDiv)}) / ${F(ce)} = ${Pa(a)} (ROE total : ${P(ni / totEq, 2)}).`]);
    })(),
  ],
};

/* ────────────────────────── Catalogue ────────────────────────── */

export const FSA_CALC: CalcCatalog = {
  topic: "fsa",
  types: [
    BASIC_EPS,
    DILUTED_EPS,
    CAPITALIZATION,
    CFO_INDIRECT,
    CASH_FLOW_DIRECT,
    FCFF_FCFE,
    INVENTORY,
    INVENTORY_NRV,
    IMPAIRMENT,
    ASSET_AGE,
    LEASES,
    DEFERRED_TAXES,
    ACTIVITY,
    LIQUIDITY_SOLVENCY,
    DUPONT,
  ],
};
