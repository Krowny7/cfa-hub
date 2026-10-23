// Exercices de calcul pur : Derivatives (CFA Level I).
//
// Contenu seulement : le moteur et les pages vivent ailleurs (lib/calc/engine.ts, app/calculs).
// Règle d'or : chaque réponse est CALCULÉE ici, à partir des mêmes nombres que les données
// affichées, par les petites fonctions financières du haut de fichier. Aucune réponse tapée à la main.
// Formules vérifiées dans Schweser Level I, Book 3 (Readings 66 à 75 = LM 1 à 10 du curriculum
// Derivatives) et recoupées avec la banque officielle de practice exams.
//
// Conventions : énoncés et données en anglais d'examen ; solutions en français, nombres au format
// français. Pour une réponse en %, `answer` vaut déjà le pourcentage (8,5 % → 8.5).
// Actualisation : Rf en composition annuelle, (1 + Rf)^T avec T en années (convention CFA Level I),
// sauf mention « continuously compounded ». Les taux de référence (MRR) des FRA, futures de taux et
// swaps sont des taux simples annualisés : intérêt = taux × jours / 360 (ou mois / 12).

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
/** Facteur de capitalisation affiché : (1 + r)^t → « 1,05^0,5 ». */
const pw = (r: number, t: number): string => (t === 1 ? F(1 + r) : `${F(1 + r)}^${F(t)}`);

/** Formats anglais (données d'énoncé). */
const E = (x: number, d?: number): string => numStr(x, d, ".", ",");
const usd = (x: number, d?: number): string => `${x < 0 ? MINUS : ""}$${E(Math.abs(x), d ?? (isInt(x) ? 0 : 2))}`;
const pc = (frac: number, d?: number): string => `${E(frac * 100, d)}%`;
const lst = (xs: string[]): string => xs.join(" / ");
const months = (m: number): string => `${E(m)} month${m === 1 ? "" : "s"}`;
const years = (t: number): string => `${E(t)} year${t === 1 ? "" : "s"}`;

type Row = [string, string];

/**
 * Questions strictes (CalcQuestion.strict) : seule la tolérance absolue compte, pour refuser un
 * raccourci faux qui tombe à moins de 0,2 % de la réponse. `true` = demi-unité de la dernière
 * décimale ; un nombre = tolérance absolue propre. En commentaire : valeurs refusées (réponse).
 * « Raccourci » = S × (1 + écart de taux × T) ; « simple » = (1 + r × T) ; « continu » = e^(rT)
 * appliqué à un taux annuel composé (ou l'inverse) ; « non actualisé » = flux pris pour sa valeur faciale.
 */
const STRICT: Record<string, true | number> = {
  // Prix forward
  "dv-fwd-f1": true, // continu 49,96 (49,92)
  "dv-fwd-f2": true, // continu 1 268,89 ; simple 1 268,75 (1 268,61)
  "dv-fwd-f3": true, // discret 2 423,53 ou 2 423,88 ; simple 2 424,00 (2 424,12)
  "dv-fwd-f4": true, // continu 78,45 ; simple 78,38 (78,35)
  "dv-fwd-f5": true, // discret 84,80 ou 84,86 (84,95)
  "dv-fwd-m1": true, // dividende non actualisé 61,74 ou 61,80 ; continu 61,85 (61,77)
  "dv-fwd-m2": true, // coût non actualisé 1 991,60 ou 1 991,00 ; continu 1 993,00 (1 991,45)
  "dv-fwd-m3": true, // coupon non actualisé 102,96 ou 103,08 ; continu 103,10 (103,02)
  "dv-fwd-m4": true, // dividendes non actualisés 46,64 ou 46,70 ; continu 46,75 (46,67)
  "dv-fwd-m5": true, // simple ou discret 65,97 ; 65,96 (65,98)
  "dv-fwd-d1": true, // coûts non actualisés 531,30 ou 530,80 ; continu 531,56 (530,92)
  "dv-fwd-d2": true, // coupons non actualisés 97,18 ou 97,41 ; continu 97,40 (97,30)
  "dv-fwd-d4": true, // 4 % pris comme continu 3 248,36 ; discret 3 246,94 ; mixte 3 246,09 (3 246,46)
  "dv-fwd-d5": true, // continu 122,45 ; simple 122,33 ; dividendes non actualisés 122,30 ou 122,44 (122,37)
  // Valeur d'un forward
  "dv-fval-d5": true, // dividende non actualisé 80,25 ; simple 80,22 ; continu 80,17 (80,24)
  // Forward de change
  "dv-fx-f1": true, // raccourci 1,1013 ; continu 1,1014 (1,1008)
  "dv-fx-f2": true, // continu 143,40 (143,57)
  "dv-fx-f3": true, // raccourci ou continu 1,2668 ; simple 1,2669 (1,2670)
  "dv-fx-f4": true, // discret 0,9316 ; raccourci 0,9310 (0,9312)
  "dv-fx-m3": true, // raccourci 1,1546 ; continu 1,1547 ; simple 1,1552 (1,1553)
  "dv-fx-m5": true, // raccourci 0,8909 ; continu 0,8911 (0,8918)
  "dv-fx-d3": true, // raccourci 87,15 (87,02)
  // FRA : forward « arithmétique » et règlement actualisé au taux fixe au lieu du MRR
  "dv-fra-f1": true, // 2 × z2 − z1 = 5,00 (5,01)
  "dv-fra-f5": true, // 3 × z3 − 2 × z2 = 5,00 (5,01)
  "dv-fra-m1": true, // (4 × z4 − 2 × z2) / 2 = 4,40 (4,41)
  "dv-fra-d2": true, // (3 × z3 − z1) / 2 = 4,45 (4,46)
  "dv-fra-f4": true, // actualisé au taux fixe 4 950 (4 955)
  "dv-fra-m3": true, // actualisé au taux fixe 49 603 (49 652)
  "dv-fra-m5": true, // actualisé au taux fixe 14 907 (14 922)
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

/** Tolérance relative (pour les calculs en plusieurs étapes sensibles aux arrondis intermédiaires). */
const rel = (a: number, frac: number): number => Math.abs(a) * frac;
/** Arrondi à 4 décimales : pour des données affichées arrondies ET utilisées telles quelles dans le calcul. */
const r4 = (x: number): number => Math.round(x * 1e4) / 1e4;

/* ────────────────────────── Fonctions financières ────────────────────────── */

const sum = (xs: number[]): number => xs.reduce((s, x) => s + x, 0);
/** Facteur de capitalisation (1 + r)^t et d'actualisation (1 + r)^−t. */
const grow = (r: number, t: number): number => Math.pow(1 + r, t);
const disc = (r: number, t: number): number => Math.pow(1 + r, -t);

// LM 4 · Arbitrage, Replication, and the Cost of Carry
/** F0(T) = [S0 + PV0(coûts) − PV0(revenus)] × (1 + Rf)^T */
const fwdPrice = (s0: number, r: number, t: number, pvCost = 0, pvBen = 0): number => (s0 + pvCost - pvBen) * grow(r, t);
/** Taux continus : F0(T) = S0 × e^((r + c − b)T) */
const fwdCont = (s0: number, r: number, t: number, c = 0, b = 0): number => s0 * Math.exp((r + c - b) * t);
/** Forward de change (prix/base) : F = S × [(1 + r_prix) / (1 + r_base)]^T */
const fxForward = (s: number, rPrice: number, rBase: number, t: number): number => s * Math.pow((1 + rPrice) / (1 + rBase), t);

// LM 5 · Pricing and Valuation of Forward Contracts
/** Vt(T) (long) = St + PVt(coûts) − PVt(revenus) − F0(T) / (1 + Rf)^(T − t) */
const fwdValueLong = (st: number, f0: number, r: number, tau: number, pvCost = 0, pvBen = 0): number =>
  st + pvCost - pvBen - f0 * disc(r, tau);
/** Taux forward implicite entre t1 et t2 à partir de deux MRR (intérêt simple). */
const fraRate = (r1: number, t1: number, r2: number, t2: number): number => ((1 + r2 * t2) / (1 + r1 * t1) - 1) / (t2 - t1);
/** Taux forward annuel implicite entre n1 et n2 ans à partir de deux taux zéro (composition annuelle). */
const fwdZero = (z1: number, n1: number, z2: number, n2: number): number =>
  Math.pow(grow(z2, n2) / grow(z1, n1), 1 / (n2 - n1)) - 1;
/** Règlement d'un FRA pour le long (payeur fixe), versé au début de la période d'emprunt. */
const fraSettle = (notional: number, mrr: number, k: number, tau: number): number => (notional * (mrr - k) * tau) / (1 + mrr * tau);

// LM 2 · Futures : appels de marge quotidiens
type MarginDay = { price: number; pnl: number; before: number; call: number; after: number };
/** Marque au marché jour par jour. `size` = taille d'un contrat × nombre de contrats ; marges pour toute la position. */
function marginPath(o: { initial: number; maint: number; size: number; long: boolean; prices: number[] }) {
  let bal = o.initial;
  let deposits = 0;
  const days: MarginDay[] = [];
  for (let i = 1; i < o.prices.length; i++) {
    const pnl = (o.prices[i] - o.prices[i - 1]) * o.size * (o.long ? 1 : -1);
    const before = bal + pnl;
    const call = before < o.maint ? o.initial - before : 0;
    bal = before + call;
    deposits += call;
    days.push({ price: o.prices[i], pnl, before, call, after: bal });
  }
  return { days, deposits, balance: bal };
}

// LM 6 · Futures de taux
const bpv = (notional: number, period: number): number => notional * period * 0.0001;

// LM 7 · Swaps
/** Facteurs d'actualisation à partir de taux spot annualisés composés `m` fois par an (une période = 1/m an). */
const dfsFromSpots = (spots: number[], m = 1): number[] => spots.map((z, i) => Math.pow(1 + z / m, -(i + 1)));
/** Taux de swap par période : (1 − DF_N) / Σ DF. */
const parSwap = (dfs: number[]): number => (1 - dfs[dfs.length - 1]) / sum(dfs);
/** Facteurs d'actualisation à partir de taux forward périodiques successifs. */
function dfsFromForwards(fwds: number[]): number[] {
  const out: number[] = [];
  let df = 1;
  for (const f of fwds) {
    df /= 1 + f;
    out.push(df);
  }
  return out;
}

// LM 2 et 8 · Options
const callPay = (s: number, x: number): number => Math.max(0, s - x);
const putPay = (s: number, x: number): number => Math.max(0, x - s);

// LM 9 · Put–call parity
const pcpCall = (s: number, p: number, x: number, r: number, t: number): number => s + p - x * disc(r, t);
const pcpPut = (s: number, c: number, x: number, r: number, t: number): number => c - s + x * disc(r, t);

// LM 10 · Binomial à une période
const rnProb = (u: number, d: number, r: number): number => (1 + r - d) / (u - d);
const binom = (pi: number, up: number, dn: number, r: number): number => (pi * up + (1 - pi) * dn) / (1 + r);

/* ────────────────────────── 1 · Prix forward sans arbitrage ────────────────────────── */

const FORWARD_PRICE: CalcType = {
  key: "forward-price",
  topic: "derivatives",
  name: "Prix forward sans arbitrage (cost of carry)",
  tier: "essentiel",
  top: true,
  source: "LM 4 · Arbitrage, Replication, and the Cost of Carry in Pricing Derivatives",
  formulas: [
    "Sans revenu ni coût : F0(T) = S0 × (1 + Rf)^T",
    "Avec portage : F0(T) = [S0 + PV0(coûts) − PV0(revenus)] × (1 + Rf)^T",
    "PV d'un flux versé en t : CF / (1 + Rf)^t",
    "Taux continus : F0(T) = S0 × e^((r + c − b) × T), c = coûts, b = revenus (dividend / convenience yield)",
  ],
  traps: [
    "Les revenus (dividendes, coupons, convenience yield) baissent le prix forward ; les coûts (stockage, assurance) l'augmentent.",
    "Chaque flux s'actualise sur SA date ; un flux versé après l'échéance du forward ne compte pas.",
    "Le prix forward n'est pas une prévision du prix futur : c'est le coût du portage sans arbitrage.",
  ],
  questions: [
    (() => {
      const s0 = 48, r = 0.04, t = 1;
      const a = fwdPrice(s0, r, t);
      return q("dv-fwd-f1", "facile", "No-arbitrage price of a 1-year forward on a non-dividend-paying stock?",
        [["Spot price", usd(s0, 2)], ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", years(t)]],
        a, "$", 2,
        ["Sans revenu ni coût de portage : F0(T) = S0 × (1 + Rf)^T.",
          `F0 = ${F(s0)} × ${F(1 + r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 1250, r = 0.03, t = 0.5;
      const a = fwdPrice(s0, r, t);
      return q("dv-fwd-f2", "facile", "No-arbitrage 6-month forward price of the index? (Ignore dividends.)",
        [["Index level", E(s0)], ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", months(6)]],
        a, "", 2,
        ["F0(T) = S0 × (1 + Rf)^T avec T = 6/12 = 0,5 an.",
          `F0 = ${F(s0)} × ${pw(r, t)} = ${F(s0)} × ${F(grow(r, t), 6)} = ${F(a, 2)} points.`]);
    })(),
    (() => {
      const s0 = 2400, r = 0.035, b = 0.015, t = 0.5;
      const a = fwdCont(s0, r, t, 0, b);
      return q("dv-fwd-f3", "facile", "No-arbitrage 6-month forward price of the stock index?",
        [["Index level", E(s0)], ["Risk-free rate (continuously compounded)", pc(r)],
          ["Dividend yield (continuously compounded)", pc(b)], ["Time to expiration", months(6)]],
        a, "", 2,
        ["Taux continus : F0(T) = S0 × e^((r − b) × T).",
          `F0 = ${F(s0)} × e^((${F(r)} − ${F(b)}) × 0,5) = ${F(s0)} × e^${F((r - b) * t, 4)} = ${F(a, 2)} points.`]);
    })(),
    (() => {
      const s0 = 75, r = 0.06, t = 0.75;
      const a = fwdPrice(s0, r, t);
      return q("dv-fwd-f4", "facile", "No-arbitrage price of a 9-month forward on the stock? (No dividends.)",
        [["Spot price", usd(s0, 2)], ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", months(9)]],
        a, "$", 2,
        ["T = 9/12 = 0,75 an.",
          `F0 = ${F(s0)} × ${pw(r, t)} = ${F(s0)} × ${F(grow(r, t), 6)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 80, r = 0.04, c = 0.02, t = 1;
      const a = fwdCont(s0, r, t, c);
      return q("dv-fwd-f5", "facile", "No-arbitrage 1-year forward price of the commodity?",
        [["Spot price per barrel", usd(s0, 2)], ["Risk-free rate (continuously compounded)", pc(r)],
          ["Storage costs (continuously compounded rate)", pc(c)], ["Time to expiration", years(t)]],
        a, "$", 2,
        ["Les coûts de stockage s'ajoutent au taux : F0(T) = S0 × e^((r + c) × T).",
          `F0 = ${F(s0)} × e^${F(r + c)} = ${F(s0)} × ${F(Math.exp(r + c), 6)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 60, div = 1.2, td = 0.5, r = 0.05, t = 1;
      const pvd = div * disc(r, td);
      const a = fwdPrice(s0, r, t, 0, pvd);
      return q("dv-fwd-m1", "moyen", "No-arbitrage price of a 1-year forward on the stock?",
        [["Spot price", usd(s0, 2)], ["Dividend expected in 6 months", usd(div, 2)],
          ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", years(t)]],
        a, "$", 2,
        [`PV du dividende = ${F(div, 2)} / ${pw(r, td)} = ${D(pvd, 4)}.`,
          `F0 = (${F(s0)} − ${F(pvd, 4)}) × ${F(1 + r)} = ${F(s0 - pvd, 4)} × ${F(1 + r)} = ${D(a, 2)}.`,
          "Le dividende abaisse le prix forward : l'acheteur à terme ne le touche pas."]);
    })(),
    (() => {
      const s0 = 1900, cost = 15, tc = 0.25, r = 0.04, t = 1;
      const pvc = cost * disc(r, tc);
      const a = fwdPrice(s0, r, t, pvc);
      return q("dv-fwd-m2", "moyen", "No-arbitrage 1-year forward price of gold, per ounce?",
        [["Spot price per ounce", usd(s0, 2)], ["Storage and insurance cost, paid in 3 months", usd(cost, 2)],
          ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", years(t)]],
        a, "$", 2,
        [`PV du coût de stockage = ${F(cost)} / ${pw(r, tc)} = ${D(pvc, 4)}.`,
          `F0 = (${F(s0)} + ${F(pvc, 4)}) × ${F(1 + r)} = ${F(s0 + pvc, 4)} × ${F(1 + r)} = ${D(a, 2)}.`,
          "Les coûts de portage augmentent le prix forward."]);
    })(),
    (() => {
      const b0 = 102, cpn = 3, tc = 0.5, r = 0.04, t = 1;
      const pvc = cpn * disc(r, tc);
      const a = fwdPrice(b0, r, t, 0, pvc);
      return q("dv-fwd-m3", "moyen", "No-arbitrage price of a 1-year forward on the bond?",
        [["Current bond price (per 100 par)", E(b0, 2)], ["Coupon paid in 6 months", E(cpn, 2)],
          ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", years(t)]],
        a, "", 2,
        [`PV du coupon = ${F(cpn)} / ${pw(r, tc)} = ${F(pvc, 4)}.`,
          `F0 = (${F(b0)} − ${F(pvc, 4)}) × ${F(1 + r)} = ${F(b0 - pvc, 4)} × ${F(1 + r)} = ${F(a, 2)} (pour 100 de nominal).`]);
    })(),
    (() => {
      const s0 = 45, div = 0.5, r = 0.06, t = 1;
      const pv1 = div * disc(r, 0.25), pv2 = div * disc(r, 0.75);
      const a = fwdPrice(s0, r, t, 0, pv1 + pv2);
      return q("dv-fwd-m4", "moyen", "No-arbitrage price of a 1-year forward on the stock?",
        [["Spot price", usd(s0, 2)], ["Dividends", "$0.50 in 3 months and $0.50 in 9 months"],
          ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", years(t)]],
        a, "$", 2,
        [`PV des dividendes = ${F(div, 2)} / ${pw(r, 0.25)} + ${F(div, 2)} / ${pw(r, 0.75)} = ${F(pv1, 4)} + ${F(pv2, 4)} = ${D(pv1 + pv2, 4)}.`,
          `F0 = (${F(s0)} − ${F(pv1 + pv2, 4)}) × ${F(1 + r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 65, r = 0.04, c = 0.015, b = 0.025, t = 0.5;
      const a = fwdCont(s0, r, t, c, b);
      return q("dv-fwd-m5", "moyen", "No-arbitrage 6-month forward price of the commodity?",
        [["Spot price", usd(s0, 2)], ["Risk-free rate (continuously compounded)", pc(r)],
          ["Storage costs (continuously compounded rate)", pc(c)], ["Convenience yield (continuously compounded rate)", pc(b)],
          ["Time to expiration", months(6)]],
        a, "$", 2,
        ["F0(T) = S0 × e^((r + c − b) × T) : les coûts s'ajoutent, la convenience yield se retranche.",
          `Exposant = (${F(r)} + ${F(c)} − ${F(b)}) × 0,5 = ${F((r + c - b) * t, 4)}.`,
          `F0 = ${F(s0)} × e^${F((r + c - b) * t, 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 500, cost = 5, ben = 4, r = 0.05, t = 1;
      const pvc = cost * disc(r, 0.5) + cost * disc(r, 1);
      const a = fwdPrice(s0, r, t, pvc, ben);
      return q("dv-fwd-d1", "difficile", "No-arbitrage 1-year forward price of the commodity?",
        [["Spot price", usd(s0, 2)], ["Storage costs", "$5 paid in 6 months and $5 paid in 12 months"],
          ["Present value of the convenience yield", usd(ben, 2)], ["Risk-free rate (annual compounding)", pc(r)],
          ["Time to expiration", years(t)]],
        a, "$", 2,
        [`PV des coûts = ${F(cost)} / ${pw(r, 0.5)} + ${F(cost)} / ${F(1 + r)} = ${F(cost * disc(r, 0.5), 4)} + ${F(cost * disc(r, 1), 4)} = ${D(pvc, 4)}.`,
          `La convenience yield est déjà en valeur actuelle : ${D(ben)} à retrancher.`,
          `F0 = (${F(s0)} + ${F(pvc, 4)} − ${F(ben)}) × ${F(1 + r)} = ${F(s0 + pvc - ben, 4)} × ${F(1 + r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const b0 = 98, cpn = 2.5, r = 0.045, t = 1;
      const pv1 = cpn * disc(r, 0.25), pv2 = cpn * disc(r, 0.75);
      const a = fwdPrice(b0, r, t, 0, pv1 + pv2);
      return q("dv-fwd-d2", "difficile", "No-arbitrage price of a 1-year forward on the bond?",
        [["Current bond price (per 100 par)", E(b0, 2)], ["Coupons", "2.50 in 3 months and 2.50 in 9 months"],
          ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", years(t)]],
        a, "", 2,
        [`PV des coupons = ${F(cpn)} / ${pw(r, 0.25)} + ${F(cpn)} / ${pw(r, 0.75)} = ${F(pv1, 4)} + ${F(pv2, 4)} = ${F(pv1 + pv2, 4)}.`,
          `F0 = (${F(b0)} − ${F(pv1 + pv2, 4)}) × ${F(1 + r, 3)} = ${F(b0 - pv1 - pv2, 4)} × ${F(1 + r, 3)} = ${F(a, 2)}.`,
          "Les deux coupons tombent avant l'échéance : ils réduisent tous deux le prix forward."]);
    })(),
    (() => {
      const s0 = 50, f0 = 50.4, r = 0.04, t = 0.5;
      const a = s0 - f0 * disc(r, t);
      return q("dv-fwd-d3", "difficile", "Present value of the holding benefits implied by the forward price?",
        [["Spot price", usd(s0, 2)], ["Quoted 6-month forward price (no arbitrage)", usd(f0, 2)],
          ["Risk-free rate (annual compounding)", pc(r)], ["Holding costs", "None"]],
        a, "$", 3,
        ["F0 = (S0 − PV(revenus)) × (1 + Rf)^T, donc PV(revenus) = S0 − F0 / (1 + Rf)^T.",
          `F0 actualisé = ${F(f0, 2)} / ${pw(r, t)} = ${F(f0 * disc(r, t), 4)}.`,
          `PV(revenus) = ${F(s0)} − ${F(f0 * disc(r, t), 4)} = ${D(a, 3)}.`]);
    })(),
    (() => {
      const s0 = 3200, rEff = 0.04, b = 0.02, t = 0.75;
      const rc = Math.log(1 + rEff);
      const a = fwdCont(s0, rc, t, 0, b);
      return q("dv-fwd-d4", "difficile", "No-arbitrage 9-month forward price of the index?",
        [["Index level", E(s0)], ["Risk-free rate (effective annual)", pc(rEff)],
          ["Dividend yield (continuously compounded)", pc(b)], ["Time to expiration", months(9)]],
        a, "", 2,
        [`Les taux doivent être homogènes : taux continu sans risque = ln(${F(1 + rEff)}) = ${P(rc, 4)}.`,
          `Exposant = (${F(rc, 6)} − ${F(b)}) × 0,75 = ${F((rc - b) * t, 6)}.`,
          `F0 = ${F(s0)} × e^${F((rc - b) * t, 6)} = ${F(a, 2)} points.`,
          `Piège : prendre 4 % comme taux continu donnerait ${F(fwdCont(s0, rEff, t, 0, b), 2)}.`]);
    })(),
    (() => {
      const s0 = 120, div = 1.5, r = 0.03, t = 1.5;
      const pv1 = div * disc(r, 0.5), pv2 = div * disc(r, 1);
      const a = fwdPrice(s0, r, t, 0, pv1 + pv2);
      return q("dv-fwd-d5", "difficile", "No-arbitrage price of an 18-month forward on the stock?",
        [["Spot price", usd(s0, 2)], ["Dividends of $1.50 each", "in 6, 12 and 24 months"],
          ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", months(18)]],
        a, "$", 2,
        ["Le dividende de 24 mois tombe après l'échéance (18 mois) : on l'écarte.",
          `PV des dividendes = ${F(div, 2)} / ${pw(r, 0.5)} + ${F(div, 2)} / ${F(1 + r)} = ${F(pv1, 4)} + ${F(pv2, 4)} = ${D(pv1 + pv2, 4)}.`,
          `F0 = (${F(s0)} − ${F(pv1 + pv2, 4)}) × ${pw(r, t)} = ${F(s0 - pv1 - pv2, 4)} × ${F(grow(r, t), 6)} = ${D(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 2 · Valeur d'un forward en cours de vie ────────────────────────── */

const FORWARD_VALUE: CalcType = {
  key: "forward-value",
  topic: "derivatives",
  name: "Valeur d'un forward en cours de vie",
  tier: "essentiel",
  top: true,
  source: "LM 5 · Pricing and Valuation of Forward Contracts and for an Underlying with Varying Maturities",
  formulas: [
    "À l'initiation : V0 = 0 (le prix F0 est fixé pour cela)",
    "En t (long) : Vt = St − F0(T) / (1 + Rf)^(T − t)",
    "Avec portage : Vt = St + PVt(coûts) − PVt(revenus) − F0(T) / (1 + Rf)^(T − t)",
    "À l'échéance : VT = ST − F0(T) ; pour le vendeur (short), valeur opposée",
  ],
  traps: [
    "Actualiser F0 sur la durée RESTANTE (T − t), pas sur la durée initiale.",
    "Seuls les revenus et coûts encore à venir après t comptent ; un dividende déjà versé ne compte plus.",
    "La valeur pour le short est l'opposée de celle du long.",
  ],
  questions: [
    (() => {
      const f0 = 50, st = 56, n = 100;
      const a = (st - f0) * n;
      return q("dv-fval-f1", "facile", "Value at expiration of the long forward position?",
        [["Forward price", usd(f0, 2)], ["Spot price at expiration", usd(st, 2)], ["Shares covered by the contract", E(n)]],
        a, "$", 0,
        ["À l'échéance : VT = ST − F0 pour l'acheteur.",
          `Par action : ${F(st)} − ${F(f0)} = ${D(st - f0)} ; pour ${F(n)} actions : ${D(a)}.`]);
    })(),
    (() => {
      const f0 = 1920, st = 1870, n = 100;
      const a = (f0 - st) * n;
      return q("dv-fval-f2", "facile", "Value at expiration of the short forward position?",
        [["Forward price per ounce", usd(f0, 2)], ["Spot price at expiration", usd(st, 2)], ["Ounces covered", E(n)]],
        a, "$", 0,
        ["Pour le vendeur : VT = F0 − ST.",
          `Par once : ${F(f0)} − ${F(st)} = ${D(f0 - st)} ; pour ${F(n)} onces : ${D(a)}.`]);
    })(),
    (() => {
      const st = 52, f0 = 51, r = 0.04, tau = 0.5;
      const a = fwdValueLong(st, f0, r, tau);
      return q("dv-fval-f3", "facile", "Current value of the long forward position, per share? (No dividends.)",
        [["Current spot price", usd(st, 2)], ["Forward price", usd(f0, 2)], ["Risk-free rate (annual compounding)", pc(r)],
          ["Time remaining to expiration", months(6)]],
        a, "$", 2,
        ["Vt = St − F0 / (1 + Rf)^(T − t).",
          `PV de F0 = ${F(f0)} / ${pw(r, tau)} = ${F(f0 * disc(r, tau), 4)}.`,
          `Vt = ${F(st)} − ${F(f0 * disc(r, tau), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const st = 47, f0 = 50, r = 0.05, tau = 0.25;
      const a = fwdValueLong(st, f0, r, tau);
      return q("dv-fval-f4", "facile", "Current value of the long forward position, per share? (Negative if a liability.)",
        [["Current spot price", usd(st, 2)], ["Forward price", usd(f0, 2)], ["Risk-free rate (annual compounding)", pc(r)],
          ["Time remaining to expiration", months(3)]],
        a, "$", 2,
        [`PV de F0 = ${F(f0)} / ${pw(r, tau)} = ${F(f0 * disc(r, tau), 4)}.`,
          `Vt = ${F(st)} − ${F(f0 * disc(r, tau), 4)} = ${D(a, 2)} : le long perd, le prix au comptant est trop bas.`]);
    })(),
    (() => {
      const f0 = 105, st = 101, r = 0.03, tau = 1;
      const a = -fwdValueLong(st, f0, r, tau);
      return q("dv-fval-f5", "facile", "Current value of the short forward position, per unit?",
        [["Current spot price", usd(st, 2)], ["Forward price", usd(f0, 2)], ["Risk-free rate (annual compounding)", pc(r)],
          ["Time remaining to expiration", years(tau)]],
        a, "$", 2,
        ["Pour le short : Vt = F0 / (1 + Rf)^(T − t) − St.",
          `Vt = ${F(f0)} / ${F(1 + r)} − ${F(st)} = ${F(f0 * disc(r, tau), 4)} − ${F(st)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 40, r = 0.05, t = 1, st = 43, el = 0.25;
      const f0 = fwdPrice(s0, r, t);
      const a = fwdValueLong(st, f0, r, t - el);
      return q("dv-fval-m1", "moyen", "Value of the long forward position 3 months after initiation, per share?",
        [["Spot price at initiation", usd(s0, 2)], ["Original term of the forward", years(t)],
          ["Risk-free rate (annual compounding, unchanged)", pc(r)], ["Spot price 3 months later", usd(st, 2)], ["Dividends", "None"]],
        a, "$", 2,
        [`Prix forward fixé à l'initiation : F0 = ${F(s0)} × ${F(1 + r)} = ${D(f0, 2)}.`,
          `Durée restante = 1 − 0,25 = 0,75 an : PV de F0 = ${F(f0, 2)} / ${pw(r, 0.75)} = ${F(f0 * disc(r, 0.75), 4)}.`,
          `Vt = ${F(st)} − ${F(f0 * disc(r, 0.75), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const st = 62, f0 = 60, r = 0.04, tau = 0.5, div = 1, td = 2 / 12;
      const pvd = div * disc(r, td);
      const a = fwdValueLong(st, f0, r, tau, 0, pvd);
      return q("dv-fval-m2", "moyen", "Current value of the long forward position, per share?",
        [["Current spot price", usd(st, 2)], ["Forward price", usd(f0, 2)], ["Dividend expected in 2 months", usd(div, 2)],
          ["Risk-free rate (annual compounding)", pc(r)], ["Time remaining to expiration", months(6)]],
        a, "$", 2,
        [`PV du dividende à venir = ${F(div)} / ${F(1 + r)}^(2/12) = ${F(pvd, 4)}.`,
          `PV de F0 = ${F(f0)} / ${pw(r, tau)} = ${F(f0 * disc(r, tau), 4)}.`,
          `Vt = ${F(st)} − ${F(pvd, 4)} − ${F(f0 * disc(r, tau), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const n = 1000, f0 = 75, st = 70, r = 0.06, tau = 0.75;
      const per = -fwdValueLong(st, f0, r, tau);
      const a = per * n;
      return q("dv-fval-m3", "moyen", "Current value of the short forward position on 1,000 shares?",
        [["Current spot price", usd(st, 2)], ["Forward price", usd(f0, 2)], ["Risk-free rate (annual compounding)", pc(r)],
          ["Time remaining to expiration", months(9)], ["Dividends", "None"]],
        a, "$", 0,
        [`PV de F0 = ${F(f0)} / ${pw(r, tau)} = ${F(f0 * disc(r, tau), 4)}.`,
          `Par action (short) : ${F(f0 * disc(r, tau), 4)} − ${F(st)} = ${D(per, 4)}.`,
          `Pour ${F(n)} actions : ${D(a, 0)}.`]);
    })(),
    (() => {
      const st = 1880, f0 = 1950, pvc = 8, r = 0.04, tau = 0.5;
      const a = fwdValueLong(st, f0, r, tau, pvc);
      return q("dv-fval-m4", "moyen", "Current value of the long gold forward, per ounce? (Negative if a liability.)",
        [["Current spot price", usd(st, 2)], ["Forward price", usd(f0, 2)], ["PV of remaining storage costs", usd(pvc, 2)],
          ["Risk-free rate (annual compounding)", pc(r)], ["Time remaining to expiration", months(6)]],
        a, "$", 2,
        ["Vt = St + PVt(coûts) − F0 / (1 + Rf)^(T − t).",
          `PV de F0 = ${F(f0)} / ${pw(r, tau)} = ${F(f0 * disc(r, tau), 4)}.`,
          `Vt = ${F(st)} + ${F(pvc)} − ${F(f0 * disc(r, tau), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 100, r = 0.04, st = 97;
      const f0 = fwdPrice(s0, r, 1);
      const a = fwdValueLong(st, f0, r, 0.5);
      return q("dv-fval-m5", "moyen", "Value of the long forward position today, per share? (Negative if a liability.)",
        [["Contract", "1-year forward entered 6 months ago at the no-arbitrage price"], ["Spot price 6 months ago", usd(s0, 2)],
          ["Current spot price", usd(st, 2)], ["Risk-free rate (annual compounding, unchanged)", pc(r)], ["Dividends", "None"]],
        a, "$", 2,
        [`F0 = ${F(s0)} × ${F(1 + r)} = ${D(f0, 2)}.`,
          `Il reste 6 mois : PV de F0 = ${F(f0)} / ${pw(r, 0.5)} = ${F(f0 * disc(r, 0.5), 4)}.`,
          `Vt = ${F(st)} − ${F(f0 * disc(r, 0.5), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 50, div = 1, r = 0.05, st = 53;
      const f0 = fwdPrice(s0, r, 1, 0, div * disc(r, 0.5));
      const pvd = div * disc(r, 0.25);
      const a = fwdValueLong(st, f0, r, 0.75, 0, pvd);
      return q("dv-fval-d1", "difficile", "Value of the long forward position 3 months after initiation, per share?",
        [["Contract", "1-year forward priced at no arbitrage at initiation"], ["Spot price at initiation", usd(s0, 2)],
          ["Dividend paid 6 months after initiation", usd(div, 2)], ["Risk-free rate (annual compounding, unchanged)", pc(r)],
          ["Spot price 3 months after initiation", usd(st, 2)]],
        a, "$", 2,
        [`Initiation : PV du dividende = ${F(div)} / ${pw(r, 0.5)} = ${F(div * disc(r, 0.5), 4)} ; F0 = (${F(s0)} − ${F(div * disc(r, 0.5), 4)}) × ${F(1 + r)} = ${D(f0, 4)}.`,
          `3 mois plus tard, le dividende tombe dans 3 mois : PV = ${F(div)} / ${pw(r, 0.25)} = ${F(pvd, 4)}.`,
          `PV de F0 sur 9 mois = ${F(f0, 4)} / ${pw(r, 0.75)} = ${F(f0 * disc(r, 0.75), 4)}.`,
          `Vt = ${F(st)} − ${F(pvd, 4)} − ${F(f0 * disc(r, 0.75), 4)} = ${D(a, 2)}.`],
        rel(a, 0.005));
    })(),
    (() => {
      const st = 48, f0 = 51, r = 0.045, tau = 4 / 12, div = 0.8;
      const a = fwdValueLong(st, f0, r, tau);
      return q("dv-fval-d2", "difficile", "Current value of the long forward position, per share? (Negative if a liability.)",
        [["Contract", "1-year forward entered 8 months ago"], ["Forward price", usd(f0, 2)], ["Current spot price", usd(st, 2)],
          ["Dividend paid 2 months ago (month 6)", usd(div, 2)], ["Risk-free rate (annual compounding)", pc(r)]],
        a, "$", 2,
        ["Le dividende a déjà été versé : il ne réduit plus la valeur (donnée à écarter).",
          `Durée restante = 12 − 8 = 4 mois = 4/12 an : PV de F0 = ${F(f0)} / ${F(1 + r)}^(4/12) = ${F(f0 * disc(r, tau), 4)}.`,
          `Vt = ${F(st)} − ${F(f0 * disc(r, tau), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const f0 = 4500, mult = 250, st = 4420, pvd = 15, r = 0.04, tau = 0.5;
      const longPts = fwdValueLong(st, f0, r, tau, 0, pvd);
      const a = -longPts * mult;
      return q("dv-fval-d3", "difficile", "Current value of the short index forward contract, in dollars?",
        [["Forward price (index points)", E(f0)], ["Contract multiplier", `${usd(mult)} per index point`], ["Current index level", E(st)],
          ["PV of dividends until expiration (index points)", E(pvd)], ["Risk-free rate (annual compounding)", pc(r)],
          ["Time remaining to expiration", months(6)]],
        a, "$", 0,
        [`PV de F0 = ${F(f0)} / ${pw(r, tau)} = ${F(f0 * disc(r, tau), 4)} points.`,
          `Valeur du long = ${F(st)} − ${F(pvd)} − ${F(f0 * disc(r, tau), 4)} = ${F(longPts, 4)} points.`,
          `Valeur du short = ${F(-longPts, 4)} points × ${D(mult)} = ${D(a, 0)}.`],
        rel(a, 0.01));
    })(),
    (() => {
      const f0 = 99, b0 = 101, cpn = 2.5, r = 0.04, tau = 0.5;
      const pvc = cpn * disc(r, 0.25);
      const a = fwdValueLong(b0, f0, r, tau, 0, pvc);
      return q("dv-fval-d4", "difficile", "Current value of the long bond forward, per 100 par?",
        [["Forward price (per 100 par)", E(f0, 2)], ["Current bond price (per 100 par)", E(b0, 2)],
          ["Coupon paid in 3 months (before expiration)", E(cpn, 2)], ["Risk-free rate (annual compounding)", pc(r)],
          ["Time remaining to expiration", months(6)]],
        a, "", 2,
        [`PV du coupon = ${F(cpn)} / ${pw(r, 0.25)} = ${F(pvc, 4)}.`,
          `PV de F0 = ${F(f0)} / ${pw(r, tau)} = ${F(f0 * disc(r, tau), 4)}.`,
          `Vt = ${F(b0)} − ${F(pvc, 4)} − ${F(f0 * disc(r, tau), 4)} = ${F(a, 2)}.`],
        rel(a, 0.005));
    })(),
    (() => {
      const f0 = 82, r = 0.05, tau = 0.75, div = 1.2, td = 0.25;
      const pvF = f0 * disc(r, tau), pvd = div * disc(r, td);
      const a = pvF + pvd;
      return q("dv-fval-d5", "difficile", "Spot price today at which the long forward position has zero value?",
        [["Forward price", usd(f0, 2)], ["Time remaining to expiration", months(9)], ["Dividend expected in 3 months", usd(div, 2)],
          ["Risk-free rate (annual compounding)", pc(r)]],
        a, "$", 2,
        ["Vt = St − PV(dividende) − PV(F0) = 0, donc St = PV(F0) + PV(dividende).",
          `PV(F0) = ${F(f0)} / ${pw(r, tau)} = ${F(pvF, 4)} ; PV(dividende) = ${F(div)} / ${pw(r, td)} = ${F(pvd, 4)}.`,
          `St = ${F(pvF, 4)} + ${F(pvd, 4)} = ${D(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 3 · Arbitrage sur forward mal coté ────────────────────────── */

const FORWARD_ARBITRAGE: CalcType = {
  key: "forward-arbitrage",
  topic: "derivatives",
  name: "Arbitrage sur forward (cash-and-carry)",
  tier: "annexe",
  source: "LM 4 · Arbitrage, Replication, and the Cost of Carry in Pricing Derivatives",
  formulas: [
    "Prix sans arbitrage : F* = [S0 + PV(coûts) − PV(revenus)] × (1 + Rf)^T",
    "F marché > F* : vendre le forward, emprunter pour acheter le sous-jacent (cash-and-carry) ; profit en T = F − F*",
    "F marché < F* : acheter le forward, vendre à découvert et placer (reverse cash-and-carry) ; profit en T = F* − F",
    "Valeur aujourd'hui du profit = profit en T / (1 + Rf)^T",
  ],
  traps: [
    "Forward trop cher → on le vend ; trop bon marché → on l'achète.",
    "Le profit d'arbitrage se mesure à l'échéance, sauf si l'on demande sa valeur actuelle.",
  ],
  questions: [
    (() => {
      const s0 = 40, r = 0.04, fm = 42;
      const fs = fwdPrice(s0, r, 1);
      const a = fm - fs;
      return q("dv-arb-f1", "facile", "Arbitrage profit per share at expiration?",
        [["Spot price", usd(s0, 2)], ["Quoted 1-year forward price", usd(fm, 2)], ["Risk-free rate (annual compounding)", pc(r)], ["Dividends", "None"]],
        a, "$", 2,
        [`F* = ${F(s0)} × ${F(1 + r)} = ${D(fs, 2)} < ${D(fm, 2)} : le forward est trop cher.`,
          `Cash-and-carry : emprunter ${D(s0)}, acheter l'action, vendre le forward. En T : livrer l'action, recevoir ${D(fm)}, rembourser ${D(fs, 2)}.`,
          `Profit = ${F(fm)} − ${F(fs, 2)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 60, r = 0.03, fm = 61;
      const fs = fwdPrice(s0, r, 1);
      const a = fs - fm;
      return q("dv-arb-f2", "facile", "Arbitrage profit per share at expiration?",
        [["Spot price", usd(s0, 2)], ["Quoted 1-year forward price", usd(fm, 2)], ["Risk-free rate (annual compounding)", pc(r)], ["Dividends", "None"]],
        a, "$", 2,
        [`F* = ${F(s0)} × ${F(1 + r)} = ${D(fs, 2)} > ${D(fm, 2)} : le forward est trop bon marché.`,
          `Reverse cash-and-carry : vendre l'action à découvert, placer ${D(s0)}, acheter le forward. En T : toucher ${D(fs, 2)}, racheter l'action ${D(fm)}.`,
          `Profit = ${F(fs, 2)} − ${F(fm)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 2000, r = 0.04, t = 0.5, fm = 2050;
      const fs = fwdPrice(s0, r, t);
      const a = fm - fs;
      return q("dv-arb-f3", "facile", "Arbitrage profit at expiration, in index points?",
        [["Index level", E(s0)], ["Quoted 6-month forward price", E(fm)], ["Risk-free rate (annual compounding)", pc(r)], ["Dividends", "None"]],
        a, "", 2,
        [`F* = ${F(s0)} × ${pw(r, t)} = ${F(fs, 2)} < ${F(fm)} : vendre le forward, acheter l'indice à crédit.`,
          `Profit = ${F(fm)} − ${F(fs, 2)} = ${F(a, 2)} points.`]);
    })(),
    (() => {
      const s0 = 25, r = 0.06, fm = 27, n = 500;
      const fs = fwdPrice(s0, r, 1);
      const a = (fm - fs) * n;
      return q("dv-arb-f4", "facile", "Total arbitrage profit at expiration on 500 shares?",
        [["Spot price", usd(s0, 2)], ["Quoted 1-year forward price", usd(fm, 2)], ["Risk-free rate (annual compounding)", pc(r)], ["Shares", E(n)]],
        a, "$", 0,
        [`F* = ${F(s0)} × ${F(1 + r)} = ${D(fs, 2)} : le forward coté (${D(fm)}) est trop cher.`,
          `Profit par action = ${F(fm)} − ${F(fs, 2)} = ${D(fm - fs, 2)} ; × ${F(n)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const s0 = 80, r = 0.05, fm = 85;
      const fs = fwdPrice(s0, r, 1);
      const a = (fm - fs) * disc(r, 1);
      return q("dv-arb-f5", "facile", "Present value today of the arbitrage profit, per share?",
        [["Spot price", usd(s0, 2)], ["Quoted 1-year forward price", usd(fm, 2)], ["Risk-free rate (annual compounding)", pc(r)], ["Dividends", "None"]],
        a, "$", 2,
        [`F* = ${F(s0)} × ${F(1 + r)} = ${D(fs, 2)} ; profit en T = ${F(fm)} − ${F(fs)} = ${D(fm - fs, 2)}.`,
          `Valeur actuelle = ${F(fm - fs, 2)} / ${F(1 + r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 50, div = 1, r = 0.04, fm = 51.5;
      const pvd = div * disc(r, 0.5);
      const fs = fwdPrice(s0, r, 1, 0, pvd);
      const a = fm - fs;
      return q("dv-arb-m1", "moyen", "Arbitrage profit per share at expiration?",
        [["Spot price", usd(s0, 2)], ["Dividend in 6 months", usd(div, 2)], ["Quoted 1-year forward price", usd(fm, 2)],
          ["Risk-free rate (annual compounding)", pc(r)]],
        a, "$", 2,
        [`PV du dividende = ${F(div)} / ${pw(r, 0.5)} = ${F(pvd, 4)}.`,
          `F* = (${F(s0)} − ${F(pvd, 4)}) × ${F(1 + r)} = ${D(fs, 4)} < ${D(fm, 2)} : vendre le forward, acheter l'action à crédit.`,
          `Profit = ${F(fm, 2)} − ${F(fs, 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 1500, pvc = 20, r = 0.03, fm = 1530;
      const fs = fwdPrice(s0, r, 1, pvc);
      const a = fs - fm;
      return q("dv-arb-m2", "moyen", "Arbitrage profit per unit at expiration?",
        [["Commodity spot price", usd(s0)], ["PV of storage costs over the year", usd(pvc)], ["Quoted 1-year forward price", usd(fm)],
          ["Risk-free rate (annual compounding)", pc(r)]],
        a, "$", 2,
        [`F* = (${F(s0)} + ${F(pvc)}) × ${F(1 + r)} = ${D(fs, 2)} > ${D(fm)} : le forward est trop bon marché.`,
          "Reverse cash-and-carry : vendre le sous-jacent (on économise le stockage), placer le produit, acheter le forward.",
          `Profit = ${F(fs, 2)} − ${F(fm)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 1950, r = 0.04, t = 0.5, fm = 2000, n = 100;
      const fs = fwdPrice(s0, r, t);
      const a = (fm - fs) * n;
      return q("dv-arb-m3", "moyen", "Arbitrage profit at expiration on one forward contract for 100 ounces?",
        [["Gold spot price per ounce", usd(s0)], ["Quoted 6-month forward price", usd(fm)], ["Risk-free rate (annual compounding)", pc(r)],
          ["Storage costs", "Ignore"]],
        a, "$", 0,
        [`F* = ${F(s0)} × ${pw(r, t)} = ${D(fs, 2)} < ${D(fm)} : vendre le forward, acheter l'or à crédit.`,
          `Profit par once = ${F(fm)} − ${F(fs, 2)} = ${D(fm - fs, 2)} ; × ${F(n)} onces = ${D(a, 0)}.`]);
    })(),
    (() => {
      const s0 = 4000, r = 0.04, b = 0.02, t = 0.25, fm = 4035;
      const fs = fwdCont(s0, r, t, 0, b);
      const a = fm - fs;
      return q("dv-arb-m4", "moyen", "Arbitrage profit at expiration, in index points?",
        [["Index level", E(s0)], ["Risk-free rate (continuously compounded)", pc(r)], ["Dividend yield (continuously compounded)", pc(b)],
          ["Quoted 3-month forward price", E(fm)]],
        a, "", 2,
        [`F* = ${F(s0)} × e^((${F(r)} − ${F(b)}) × 0,25) = ${F(s0)} × e^${F((r - b) * t, 4)} = ${F(fs, 2)}.`,
          `${F(fm)} > ${F(fs, 2)} : vendre le forward, acheter l'indice. Profit = ${F(a, 2)} points.`]);
    })(),
    (() => {
      const s0 = 72, r = 0.05, t = 0.75, fm = 73;
      const fs = fwdPrice(s0, r, t);
      const a = fs - fm;
      return q("dv-arb-m5", "moyen", "Arbitrage profit per share at expiration?",
        [["Spot price", usd(s0, 2)], ["Quoted 9-month forward price", usd(fm, 2)], ["Risk-free rate (annual compounding)", pc(r)], ["Dividends", "None"]],
        a, "$", 2,
        [`F* = ${F(s0)} × ${pw(r, t)} = ${D(fs, 2)} > ${D(fm)} : le forward est trop bon marché.`,
          "Acheter le forward, vendre l'action à découvert et placer le produit sur 9 mois.",
          `Profit = ${F(fs, 2)} − ${F(fm)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 100, div = 2, r = 0.05, fm = 98;
      const pvd = div * disc(r, 0.25) + div * disc(r, 0.75);
      const fs = fwdPrice(s0, r, 1, 0, pvd);
      const a = fs - fm;
      return q("dv-arb-d1", "difficile", "Arbitrage profit per share at expiration?",
        [["Spot price", usd(s0, 2)], ["Dividends", "$2 in 3 months and $2 in 9 months"], ["Quoted 1-year forward price", usd(fm, 2)],
          ["Risk-free rate (annual compounding)", pc(r)]],
        a, "$", 2,
        [`PV des dividendes = 2 / ${pw(r, 0.25)} + 2 / ${pw(r, 0.75)} = ${F(pvd, 4)}.`,
          `F* = (${F(s0)} − ${F(pvd, 4)}) × ${F(1 + r)} = ${D(fs, 4)} > ${D(fm)} : le forward est trop bon marché.`,
          "Acheter le forward, vendre l'action à découvert (en reversant les dividendes) et placer le produit.",
          `Profit = ${F(fs, 4)} − ${F(fm)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 45, fm = 47.25, t = 0.5, r = 0.06;
      const a = (Math.pow(fm / s0, 1 / t) - 1) * 100;
      return q("dv-arb-d2", "difficile", "Effective annual return (compounded) earned by buying the stock and selling it forward?",
        [["Spot price", usd(s0, 2)], ["Quoted 6-month forward price", usd(fm, 2)], ["Risk-free rate (annual compounding)", pc(r)], ["Dividends", "None"]],
        a, "%", 2,
        [`Rendement sur 6 mois = ${F(fm)} / ${F(s0)} − 1 = ${P(fm / s0 - 1, 2)}.`,
          `Annualisé en composé : (${F(fm / s0, 4)})^(1/0,5) − 1 = ${Pa(a)} (l'annualisation simple, ${P(fm / s0 - 1, 2)} × 2 = ${P(2 * (fm / s0 - 1), 2)}, ignore la capitalisation).`,
          `${Pa(a)} > ${P(r)} : le cash-and-carry bat le taux sans risque, le forward est trop cher (prix sans arbitrage ${D(fwdPrice(s0, r, t), 2)}).`]);
    })(),
    (() => {
      const s0 = 70, cost = 1.5, r = 0.04, fm = 74.5, n = 1000;
      const fs = s0 * grow(r, 1) + cost;
      const a = (fm - fs) * n;
      return q("dv-arb-d3", "difficile", "Total arbitrage profit at expiration on 1,000 units?",
        [["Commodity spot price", usd(s0, 2)], ["Storage cost, paid at expiration", `${usd(cost, 2)} per unit`],
          ["Quoted 1-year forward price", usd(fm, 2)], ["Risk-free rate (annual compounding)", pc(r)], ["Units", E(n)]],
        a, "$", 0,
        [`Le stockage est payé en T : on l'ajoute sans le capitaliser. F* = ${F(s0)} × ${F(1 + r)} + ${F(cost)} = ${D(fs, 2)}.`,
          `(Équivalent : PV du coût = ${F(cost * disc(r, 1), 4)}, et (${F(s0)} + ${F(cost * disc(r, 1), 4)}) × ${F(1 + r)} = ${F(fs, 2)}.)`,
          `${D(fm)} > ${D(fs, 2)} : vendre le forward, acheter et stocker. Profit = ${D(fm - fs, 2)} × ${F(n)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const s0 = 60, r = 0.05, fm = 63.8, tc = 0.3, n = 2000;
      const fs = fwdPrice(s0, r, 1);
      const a = (fm - fs - tc) * n;
      return q("dv-arb-d4", "difficile", "Total net arbitrage profit at expiration on 2,000 shares, after transaction costs?",
        [["Spot price", usd(s0, 2)], ["Quoted 1-year forward price", usd(fm, 2)], ["Risk-free rate (annual compounding)", pc(r)],
          ["Total transaction costs (paid at expiration)", `${usd(tc, 2)} per share`], ["Shares", E(n)]],
        a, "$", 0,
        [`F* = ${F(s0)} × ${F(1 + r)} = ${D(fs, 2)} : profit brut = ${F(fm, 2)} − ${F(fs, 2)} = ${D(fm - fs, 2)} par action.`,
          `Net des frais : ${F(fm - fs, 2)} − ${F(tc, 2)} = ${D(fm - fs - tc, 2)} par action.`,
          `Total = ${F(fm - fs - tc, 2)} × ${F(n)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const s0 = 55, div = 0.6, r = 0.04, t = 1.5, fm = 56;
      const pvd = div * disc(r, 0.5) + div * disc(r, 1);
      const fs = fwdPrice(s0, r, t, 0, pvd);
      const a = fs - fm;
      return q("dv-arb-d5", "difficile", "Arbitrage profit per share at expiration?",
        [["Spot price", usd(s0, 2)], ["Dividends", "$0.60 in 6 months and $0.60 in 12 months"], ["Quoted 18-month forward price", usd(fm, 2)],
          ["Risk-free rate (annual compounding)", pc(r)]],
        a, "$", 2,
        [`PV des dividendes = 0,6 / ${pw(r, 0.5)} + 0,6 / ${F(1 + r)} = ${F(pvd, 4)}.`,
          `F* = (${F(s0)} − ${F(pvd, 4)}) × ${pw(r, t)} = ${F(s0 - pvd, 4)} × ${F(grow(r, t), 6)} = ${D(fs, 4)}.`,
          `${D(fs, 2)} > ${D(fm)} : acheter le forward, vendre l'action à découvert. Profit = ${D(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 4 · Forward de change ────────────────────────── */

const FX_FORWARD: CalcType = {
  key: "currency-forward",
  topic: "derivatives",
  name: "Forward de change (parité couverte des taux)",
  tier: "annexe",
  source: "LM 4 · Arbitrage, Replication, and the Cost of Carry in Pricing Derivatives",
  formulas: [
    "Cotation prix/base (USD/EUR = USD pour 1 EUR) : F = S × [(1 + r_prix) / (1 + r_base)]^T",
    "Taux continus : F = S × e^((r_prix − r_base) × T)",
    "Points de terme (pips) = (F − S) × 10 000 (× 100 pour les paires cotées en JPY)",
    "La devise au taux le plus élevé cote en déport (forward discount)",
  ],
  traps: [
    "Le taux de la devise de cotation (price currency) va au numérateur.",
    "Inverser la cotation inverse aussi le rapport des taux.",
  ],
  questions: [
    (() => {
      const s = 1.085, rp = 0.045, rb = 0.03;
      const a = fxForward(s, rp, rb, 1);
      return q("dv-fx-f1", "facile", "No-arbitrage 1-year USD/EUR forward rate?",
        [["Spot rate (USD/EUR)", E(s, 4)], ["USD risk-free rate", pc(rp)], ["EUR risk-free rate", pc(rb)]],
        a, "", 4,
        ["USD/EUR : l'USD est la devise de cotation (numérateur), l'EUR la devise de base.",
          `F = ${F(s, 4)} × ${F(1 + rp, 3)} / ${F(1 + rb)} = ${F(a, 4)}.`]);
    })(),
    (() => {
      const s = 150, rp = 0.005, rb = 0.05;
      const a = fxForward(s, rp, rb, 1);
      return q("dv-fx-f2", "facile", "No-arbitrage 1-year JPY/USD forward rate?",
        [["Spot rate (JPY/USD)", E(s, 2)], ["JPY risk-free rate", pc(rp)], ["USD risk-free rate", pc(rb)]],
        a, "", 2,
        ["JPY/USD : yens pour 1 USD, le JPY est au numérateur.",
          `F = ${F(s)} × ${F(1 + rp, 3)} / ${F(1 + rb)} = ${F(a, 2)} : l'USD, à taux plus élevé, cote en déport.`]);
    })(),
    (() => {
      const s = 1.27, rp = 0.04, rb = 0.045, t = 0.5;
      const a = fxForward(s, rp, rb, t);
      return q("dv-fx-f3", "facile", "No-arbitrage 6-month USD/GBP forward rate?",
        [["Spot rate (USD/GBP)", E(s, 4)], ["USD risk-free rate (annual)", pc(rp)], ["GBP risk-free rate (annual)", pc(rb)]],
        a, "", 4,
        [`F = ${F(s, 4)} × (${F(1 + rp)} / ${F(1 + rb, 3)})^0,5 = ${F(s, 4)} × ${F(Math.pow((1 + rp) / (1 + rb), t), 6)} = ${F(a, 4)}.`]);
    })(),
    (() => {
      const s = 0.95, rp = 0.01, rb = 0.03;
      const a = s * Math.exp(rp - rb);
      return q("dv-fx-f4", "facile", "No-arbitrage 1-year CHF/EUR forward rate?",
        [["Spot rate (CHF/EUR)", E(s, 4)], ["CHF risk-free rate (continuously compounded)", pc(rp)], ["EUR risk-free rate (continuously compounded)", pc(rb)]],
        a, "", 4,
        ["Taux continus : F = S × e^((r_CHF − r_EUR) × T).",
          `F = ${F(s, 4)} × e^(${F(rp)} − ${F(rb)}) = ${F(s, 4)} × e^${F(rp - rb)} = ${F(a, 4)}.`]);
    })(),
    (() => {
      const s = 17, rp = 0.1, rb = 0.05;
      const a = fxForward(s, rp, rb, 1);
      return q("dv-fx-f5", "facile", "No-arbitrage 1-year MXN/USD forward rate?",
        [["Spot rate (MXN/USD)", E(s, 4)], ["MXN risk-free rate", pc(rp)], ["USD risk-free rate", pc(rb)]],
        a, "", 4,
        [`F = ${F(s)} × ${F(1 + rp)} / ${F(1 + rb)} = ${F(a, 4)} : le peso, à taux plus élevé, se déprécie à terme.`]);
    })(),
    (() => {
      const s = 1.36, rp = 0.03, rb = 0.045;
      const f = fxForward(s, rp, rb, 1);
      const a = (f - s) * 10000;
      return q("dv-fx-m1", "moyen", "1-year forward points (in pips) on CAD/USD? (Negative if the forward rate is below the spot rate.)",
        [["Spot rate (CAD/USD)", E(s, 4)], ["CAD risk-free rate", pc(rp)], ["USD risk-free rate", pc(rb)]],
        a, "", 0,
        [`F = ${F(s, 4)} × ${F(1 + rp)} / ${F(1 + rb, 3)} = ${F(f, 6)}.`,
          `Points = (${F(f, 6)} − ${F(s, 4)}) × 10 000 = ${F(a, 1)} pips (l'USD cote en déport).`]);
    })(),
    (() => {
      const s = 1.1, rp = 0.02, rb = 0.03, fm = 1.095, loan = 1000000;
      const eur = (loan / s) * (1 + rb);
      const a = eur * fm - loan * (1 + rp);
      return q("dv-fx-m2", "moyen", "Covered interest arbitrage profit in USD at the end of the year?",
        [["Spot rate (USD/EUR)", E(s, 4)], ["Quoted 1-year forward rate (USD/EUR)", E(fm, 4)], ["USD interest rate", pc(rp)],
          ["EUR interest rate", pc(rb)], ["Amount borrowed", "USD 1,000,000"]],
        a, "$", 0,
        [`Forward sans arbitrage = ${F(s, 2)} × ${F(1 + rp)} / ${F(1 + rb)} = ${F(fxForward(s, rp, rb, 1), 4)} < ${F(fm, 4)} : l'EUR est trop cher à terme, on le vend à terme.`,
          `Emprunter 1 000 000 USD, convertir en ${F(loan / s, 2)} EUR, placer à ${P(rb)} → ${F(eur, 2)} EUR.`,
          `Vendre ces EUR à terme : ${F(eur, 2)} × ${F(fm, 4)} = ${F(eur * fm, 2)} USD ; rembourser ${F(loan * (1 + rp))} USD.`,
          `Profit = ${D(a, 0)}.`]);
    })(),
    (() => {
      const s = 1.17, rp = 0.03, rb = 0.0475, t = 0.75;
      const a = fxForward(s, rp, rb, t);
      return q("dv-fx-m3", "moyen", "No-arbitrage 9-month EUR/GBP forward rate?",
        [["Spot rate (EUR/GBP)", E(s, 4)], ["EUR risk-free rate (annual)", pc(rp)], ["GBP risk-free rate (annual)", pc(rb)]],
        a, "", 4,
        ["EUR/GBP : euros pour 1 GBP, l'EUR est au numérateur. T = 9/12 = 0,75.",
          `F = ${F(s, 4)} × (${F(1 + rp)} / ${F(1 + rb)})^0,75 = ${F(s, 4)} × ${F(Math.pow((1 + rp) / (1 + rb), t), 6)} = ${F(a, 4)}.`]);
    })(),
    (() => {
      const s = 1.08, f = 1.095, rb = 0.03;
      const a = ((f / s) * (1 + rb) - 1) * 100;
      return q("dv-fx-m4", "moyen", "USD interest rate implied by the 1-year USD/EUR forward rate?",
        [["Spot rate (USD/EUR)", E(s, 4)], ["1-year forward rate (USD/EUR, no arbitrage)", E(f, 4)], ["EUR risk-free rate", pc(rb)]],
        a, "%", 2,
        ["F / S = (1 + r_USD) / (1 + r_EUR), donc 1 + r_USD = (F / S) × (1 + r_EUR).",
          `= (${F(f, 4)} / ${F(s, 2)}) × ${F(1 + rb)} = ${F(f / s, 6)} × ${F(1 + rb)} = ${F((f / s) * (1 + rb), 6)}.`,
          `r_USD = ${Pa(a)}.`]);
    })(),
    (() => {
      const s = 1.1, rUsd = 0.05, rEur = 0.03;
      const inv = 1 / s;
      const a = fxForward(inv, rEur, rUsd, 1);
      return q("dv-fx-m5", "moyen", "No-arbitrage 1-year EUR/USD forward rate (euros per dollar)?",
        [["Spot rate (USD/EUR)", E(s, 4)], ["USD risk-free rate", pc(rUsd)], ["EUR risk-free rate", pc(rEur)]],
        a, "", 4,
        [`On inverse la cotation : EUR/USD au comptant = 1 / ${F(s, 2)} = ${F(inv, 6)} ; l'EUR devient la devise de cotation.`,
          `F = ${F(inv, 6)} × ${F(1 + rEur)} / ${F(1 + rUsd)} = ${F(a, 4)} euros par dollar.`]);
    })(),
    (() => {
      const s = 1.08, rp = 0.05, rb = 0.035, t = 0.5;
      const f = fxForward(s, rp, rb, t);
      const a = (f - s) * 10000;
      return q("dv-fx-d1", "difficile", "6-month forward points (in pips) on USD/EUR?",
        [["Spot rate (USD/EUR)", E(s, 4)], ["USD risk-free rate (annual)", pc(rp)], ["EUR risk-free rate (annual)", pc(rb)]],
        a, "", 0,
        [`F = ${F(s, 2)} × (${F(1 + rp)} / ${F(1 + rb, 3)})^0,5 = ${F(s, 2)} × ${F(Math.pow((1 + rp) / (1 + rb), t), 6)} = ${F(f, 6)}.`,
          `Points = (${F(f, 6)} − ${F(s, 4)}) × 10 000 = ${F(a, 1)} pips : l'EUR, à taux plus bas, cote en report.`],
        1);
    })(),
    (() => {
      const s = 1.1, rp = 0.04, rb = 0.02, fm = 1.125, eurAmt = 1000000;
      const usdLoan = eurAmt * s;
      const eurEnd = eurAmt * (1 + rb);
      const a = eurEnd * fm - usdLoan * (1 + rp);
      return q("dv-fx-d2", "difficile", "Covered interest arbitrage profit in USD at the end of the year?",
        [["Spot rate (USD/EUR)", E(s, 4)], ["Quoted 1-year forward rate (USD/EUR)", E(fm, 4)], ["USD interest rate", pc(rp)],
          ["EUR interest rate", pc(rb)], ["Trade size", "EUR 1,000,000 bought spot"]],
        a, "$", 0,
        [`Forward sans arbitrage = ${F(s, 2)} × ${F(1 + rp)} / ${F(1 + rb)} = ${F(fxForward(s, rp, rb, 1), 5)} < ${F(fm, 4)} : vendre l'EUR à terme.`,
          `Emprunter ${F(usdLoan)} USD à ${P(rp)}, acheter 1 000 000 EUR, les placer à ${P(rb)} → ${F(eurEnd)} EUR.`,
          `Vente à terme : ${F(eurEnd)} × ${F(fm, 4)} = ${F(eurEnd * fm, 2)} USD ; remboursement = ${F(usdLoan * (1 + rp), 2)} USD.`,
          `Profit = ${D(a, 0)}.`]);
    })(),
    (() => {
      const s = 83, rp = 0.07, rb = 0.045, t = 2, expected = 88;
      const a = fxForward(s, rp, rb, t);
      return q("dv-fx-d3", "difficile", "No-arbitrage 2-year INR/USD forward rate?",
        [["Spot rate (INR/USD)", E(s, 2)], ["INR risk-free rate (annual)", pc(rp)], ["USD risk-free rate (annual)", pc(rb)],
          ["Analyst's expected spot rate in 2 years", E(expected, 2)]],
        a, "", 2,
        ["Le prix à terme sans arbitrage ne dépend pas de la prévision de l'analyste (donnée à écarter).",
          `F = ${F(s)} × (${F(1 + rp)} / ${F(1 + rb, 3)})² = ${F(s)} × ${F(Math.pow((1 + rp) / (1 + rb), t), 6)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const s = 1.25, rp = 0.05, rb = 0.04, fm = 1.255, gbp = 800000;
      const usdInv = gbp * s * (1 + rp);
      const cost = gbp * (1 + rb) * fm;
      const a = usdInv - cost;
      return q("dv-fx-d4", "difficile", "Covered interest arbitrage profit in USD at the end of the year?",
        [["Spot rate (USD/GBP)", E(s, 4)], ["Quoted 1-year forward rate (USD/GBP)", E(fm, 4)], ["USD interest rate", pc(rp)],
          ["GBP interest rate", pc(rb)], ["Trade size", "GBP 800,000 borrowed"]],
        a, "$", 0,
        [`Forward sans arbitrage = ${F(s, 2)} × ${F(1 + rp)} / ${F(1 + rb)} = ${F(fxForward(s, rp, rb, 1), 5)} > ${F(fm, 4)} : le GBP est bon marché à terme, on l'achète à terme.`,
          `Emprunter 800 000 GBP (à rembourser ${F(gbp * (1 + rb))} GBP), convertir en ${F(gbp * s)} USD placés à ${P(rp)} → ${F(usdInv)} USD.`,
          `Acheter à terme les ${F(gbp * (1 + rb))} GBP : ${F(gbp * (1 + rb))} × ${F(fm, 4)} = ${F(cost)} USD.`,
          `Profit = ${F(usdInv)} − ${F(cost)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const s = 1.1, pts = 75, rp = 0.05;
      const f = s + pts / 10000;
      const a = ((s / f) * (1 + rp) - 1) * 100;
      return q("dv-fx-d5", "difficile", "EUR interest rate implied by the 1-year forward quote?",
        [["Spot rate (USD/EUR)", E(s, 4)], ["1-year forward points", `+${E(pts)} pips`], ["USD risk-free rate", pc(rp)]],
        a, "%", 2,
        [`Forward = ${F(s, 4)} + 0,0075 = ${F(f, 4)}.`,
          "F / S = (1 + r_USD) / (1 + r_EUR), donc 1 + r_EUR = (S / F) × (1 + r_USD).",
          `= (${F(s, 4)} / ${F(f, 4)}) × ${F(1 + rp)} = ${F((s / f) * (1 + rp), 6)}, soit r_EUR = ${Pa(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 5 · FRA et taux forward implicites ────────────────────────── */

const FRA: CalcType = {
  key: "fra",
  topic: "derivatives",
  name: "FRA et taux forward implicites",
  tier: "essentiel",
  source: "LM 5 · Pricing and Valuation of Forward Contracts and for an Underlying with Varying Maturities",
  formulas: [
    "Taux zéro (composition annuelle) : (1 + Z_n)^n = (1 + Z_m)^m × (1 + F)^(n − m)",
    "MRR (intérêt simple) : 1 + R_long × t_long = (1 + R_court × t_court) × (1 + F × (t_long − t_court))",
    "Règlement du FRA pour le long (payeur fixe) = notionnel × (MRR − taux FRA) × période / (1 + MRR × période)",
    "Période = jours / 360 ou mois / 12 ; notation 3m6m (ou 3 × 9) : départ dans 3 mois, durée 6 mois",
  ],
  traps: [
    "Le règlement a lieu au DÉBUT de la période d'emprunt : on actualise au MRR réalisé.",
    "Le long (payeur fixe) reçoit quand le MRR réalisé dépasse le taux du FRA.",
    "Les MRR sont des taux annualisés : les multiplier par la durée (0,25 pour 3 mois).",
  ],
  questions: [
    (() => {
      const z1 = 0.03, z2 = 0.04;
      const a = fwdZero(z1, 1, z2, 2) * 100;
      return q("dv-fra-f1", "facile", "Implied 1-year forward rate one year from now (1y1y)?",
        [["1-year zero-coupon rate", pc(z1)], ["2-year zero-coupon rate", pc(z2)]],
        a, "%", 2,
        ["(1 + Z2)² = (1 + Z1) × (1 + F1,1).",
          `1 + F1,1 = ${F(1 + z2)}² / ${F(1 + z1)} = ${F(grow(z2, 2), 4)} / ${F(1 + z1)} = ${F(grow(z2, 2) / (1 + z1), 6)}.`,
          `F1,1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const n = 10e6, k = 0.03, m = 0.035, tau = 0.5;
      const a = fraSettle(n, m, k, tau);
      return q("dv-fra-f2", "facile", "Settlement payment received by the long (fixed-rate payer)?",
        [["Notional principal", usd(n)], ["FRA rate", pc(k)], ["Realized 6-month MRR at settlement", pc(m)], ["Day count", "180/360"]],
        a, "$", 0,
        [`Écart d'intérêt en fin de période = ${F(n)} × (${F(m)} − ${F(k)}) × 0,5 = ${D(n * (m - k) * tau)}.`,
          `Réglé au début de la période, on actualise : ${F(n * (m - k) * tau)} / (1 + ${F(m)} × 0,5) = ${D(a, 0)}.`]);
    })(),
    (() => {
      const r1 = 0.02, r2 = 0.025;
      const a = fraRate(r1, 0.25, r2, 0.75) * 100;
      return q("dv-fra-f3", "facile", "Implied 3m6m forward rate (annualized)?",
        [["3-month MRR (annualized)", pc(r1)], ["9-month MRR (annualized)", pc(r2)], ["Convention", "Simple interest, months/12"]],
        a, "%", 2,
        ["(1 + R9 × 9/12) = (1 + R3 × 3/12) × (1 + F × 6/12).",
          `1 + F × 0,5 = ${F(1 + r2 * 0.75, 6)} / ${F(1 + r1 * 0.25, 4)} = ${F((1 + r2 * 0.75) / (1 + r1 * 0.25), 6)}.`,
          `F = ${F((1 + r2 * 0.75) / (1 + r1 * 0.25) - 1, 6)} / 0,5 = ${Pa(a)}.`]);
    })(),
    (() => {
      const n = 5e6, k = 0.04, m = 0.036, tau = 0.25;
      const a = -fraSettle(n, m, k, tau);
      return q("dv-fra-f4", "facile", "Settlement payment made by the long (fixed-rate payer)?",
        [["Notional principal", usd(n)], ["FRA rate", pc(k)], ["Realized 3-month MRR at settlement", pc(m)], ["Day count", "90/360"]],
        a, "$", 0,
        [`MRR réalisé < taux FRA : le long paie. Écart = ${F(n)} × (${F(k)} − ${F(m)}) × 0,25 = ${D(n * (k - m) * tau)}.`,
          `Actualisé au MRR réalisé : ${F(n * (k - m) * tau)} / (1 + ${F(m)} × 0,25) = ${D(a, 0)}.`]);
    })(),
    (() => {
      const z2 = 0.035, z3 = 0.04;
      const a = fwdZero(z2, 2, z3, 3) * 100;
      return q("dv-fra-f5", "facile", "Implied 1-year forward rate two years from now (2y1y)?",
        [["2-year zero-coupon rate", pc(z2)], ["3-year zero-coupon rate", pc(z3)]],
        a, "%", 2,
        ["(1 + Z3)³ = (1 + Z2)² × (1 + F2,1).",
          `1 + F2,1 = ${F(grow(z3, 3), 6)} / ${F(grow(z2, 2), 6)} = ${F(grow(z3, 3) / grow(z2, 2), 6)}.`,
          `F2,1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const z2 = 0.028, z4 = 0.036;
      const a = fwdZero(z2, 2, z4, 4) * 100;
      return q("dv-fra-m1", "moyen", "Implied 2-year forward rate two years from now (2y2y), annualized?",
        [["2-year zero-coupon rate", pc(z2)], ["4-year zero-coupon rate", pc(z4)]],
        a, "%", 2,
        ["(1 + Z4)⁴ = (1 + Z2)² × (1 + F2,2)².",
          `(1 + F2,2)² = ${F(grow(z4, 4), 6)} / ${F(grow(z2, 2), 6)} = ${F(grow(z4, 4) / grow(z2, 2), 6)}.`,
          `F2,2 = ${F(grow(z4, 4) / grow(z2, 2), 6)}^(1/2) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const r6 = 0.03, r12 = 0.034, m = 0.042, n = 20e6;
      const k = fraRate(r6, 0.5, r12, 1);
      const a = fraSettle(n, m, k, 0.5);
      return q("dv-fra-m2", "moyen", "Settlement payment to the long in a 6×12 FRA priced today at the implied forward rate?",
        [["6-month MRR today (annualized)", pc(r6)], ["12-month MRR today (annualized)", pc(r12)],
          ["6-month MRR realized in 6 months", pc(m)], ["Notional principal", usd(n)], ["Convention", "Simple interest, months/12"]],
        a, "$", 0,
        [`Taux du FRA : 1 + F × 0,5 = ${F(1 + r12)} / ${F(1 + r6 * 0.5, 4)} = ${F((1 + r12) / (1 + r6 * 0.5), 6)}, donc F = ${P(k, 4)}.`,
          `Écart en fin de période = ${F(n)} × (${P(m)} − ${P(k, 4)}) × 0,5 = ${D(n * (m - k) * 0.5, 0)}.`,
          `Actualisé : / (1 + ${F(m)} × 0,5) = ${D(a, 0)}.`],
        rel(a, 0.01));
    })(),
    (() => {
      const k = 0.032, m = 0.028, n = 50e6, tau = 0.25;
      const a = -fraSettle(n, m, k, tau);
      return q("dv-fra-m3", "moyen", "Settlement payment received by the short (fixed-rate receiver) in a 1×4 FRA?",
        [["FRA rate", pc(k)], ["Realized 90-day MRR at settlement", pc(m)], ["Notional principal", usd(n)], ["Day count", "90/360"]],
        a, "$", 0,
        ["1 × 4 : départ dans 1 mois, fin dans 4 mois, soit un taux 3 mois (90 jours).",
          `MRR < taux FRA : le short reçoit ${F(n)} × (${F(k)} − ${F(m)}) × 0,25 = ${D(n * (k - m) * tau)} en fin de période.`,
          `Réglé d'avance : ${F(n * (k - m) * tau)} / (1 + ${F(m)} × 0,25) = ${D(a, 0)}.`]);
    })(),
    (() => {
      const r1 = 0.04, r2 = 0.044;
      const a = fraRate(r1, 30 / 360, r2, 120 / 360) * 100;
      return q("dv-fra-m4", "moyen", "Implied 90-day forward rate starting in 30 days (annualized)?",
        [["30-day MRR (annualized)", pc(r1)], ["120-day MRR (annualized)", pc(r2)], ["Day count", "Actual/360, simple interest"]],
        a, "%", 2,
        ["(1 + R120 × 120/360) = (1 + R30 × 30/360) × (1 + F × 90/360).",
          `= ${F(1 + r2 * 120 / 360, 6)} / ${F(1 + r1 * 30 / 360, 6)} = ${F((1 + r2 * 120 / 360) / (1 + r1 * 30 / 360), 6)}.`,
          `F = (${F((1 + r2 * 120 / 360) / (1 + r1 * 30 / 360), 6)} − 1) × 360/90 = ${Pa(a)}.`]);
    })(),
    (() => {
      const n = 15e6, k = 0.025, m = 0.021, tau = 0.25;
      const a = -fraSettle(n, m, k, tau);
      return q("dv-fra-m5", "moyen", "Settlement payment to the short (fixed-rate receiver)?",
        [["Notional principal", usd(n)], ["FRA rate", pc(k)], ["Realized 3-month MRR at settlement", pc(m)], ["Day count", "90/360"]],
        a, "$", 0,
        [`Le short reçoit le fixe et paie le MRR : gain = ${F(n)} × (${F(k)} − ${F(m)}) × 0,25 = ${D(n * (k - m) * tau)} en fin de période.`,
          `Règlement d'avance = ${F(n * (k - m) * tau)} / (1 + ${F(m)} × 0,25) = ${D(a, 0)}.`]);
    })(),
    (() => {
      const r3 = 0.04, r9 = 0.044, m = 0.041, n = 25e6;
      const k = fraRate(r3, 0.25, r9, 0.75);
      const a = -fraSettle(n, m, k, 0.5);
      return q("dv-fra-d1", "difficile", "Settlement payment made by the long in a 3×9 FRA priced at the implied forward rate?",
        [["3-month MRR today (annualized)", pc(r3)], ["9-month MRR today (annualized)", pc(r9)],
          ["6-month MRR realized in 3 months", pc(m)], ["Notional principal", usd(n)], ["Convention", "Simple interest, months/12"]],
        a, "$", 0,
        [`Taux du FRA : 1 + F × 0,5 = ${F(1 + r9 * 0.75, 4)} / ${F(1 + r3 * 0.25, 2)} = ${F((1 + r9 * 0.75) / (1 + r3 * 0.25), 6)}, donc F = ${P(k, 4)}.`,
          `MRR réalisé (${P(m)}) < F : le long paie ${F(n)} × (${P(k, 4)} − ${P(m)}) × 0,5 = ${D(n * (k - m) * 0.5, 0)} en fin de période.`,
          `Règlement d'avance = / (1 + ${F(m)} × 0,5) = ${D(a, 0)}.`],
        rel(a, 0.01));
    })(),
    (() => {
      const z1 = 0.025, z2 = 0.032, z3 = 0.038;
      const a = fwdZero(z1, 1, z3, 3) * 100;
      return q("dv-fra-d2", "difficile", "Implied 2-year forward rate one year from now (1y2y), annualized?",
        [["Zero-coupon rates (1 / 2 / 3 years)", lst([pc(z1), pc(z2), pc(z3)])]],
        a, "%", 2,
        ["1y2y relie le zéro 1 an au zéro 3 ans ; le taux 2 ans ne sert pas.",
          `(1 + F1,2)² = ${F(1 + z3, 3)}³ / ${F(1 + z1, 3)} = ${F(grow(z3, 3), 6)} / ${F(1 + z1, 3)} = ${F(grow(z3, 3) / (1 + z1), 6)}.`,
          `F1,2 = ${F(grow(z3, 3) / (1 + z1), 6)}^(1/2) − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const loan = 40e6, k = 0.036, m = 0.044, tau = 0.5;
      const settle = fraSettle(loan, m, k, tau);
      const fvSettle = settle * (1 + m * tau);
      const interest = loan * m * tau;
      const a = interest - fvSettle;
      return q("dv-fra-d3", "difficile", "Net interest cost of the hedged loan, at the end of the borrowing period?",
        [["Planned loan", "USD 40 million, in 3 months, for 6 months, at the 6-month MRR"], ["Hedge", "Long 3×9 FRA at 3.6%"],
          ["6-month MRR realized in 3 months", pc(m)], ["Convention", "Simple interest, months/12"]],
        a, "$", 0,
        [`Règlement du FRA reçu dans 3 mois = ${F(loan)} × (${F(m)} − ${F(k)}) × 0,5 / (1 + ${F(m)} × 0,5) = ${D(settle, 2)}.`,
          `Placé au MRR jusqu'à la fin de l'emprunt : ${F(settle, 2)} × ${F(1 + m * tau)} = ${D(fvSettle, 0)}.`,
          `Intérêts payés = ${F(loan)} × ${F(m)} × 0,5 = ${D(interest)} ; coût net = ${D(interest)} − ${D(fvSettle, 0)} = ${D(a, 0)}.`,
          `C'est ${F(loan)} × ${P(k)} × 0,5 : le FRA verrouille le taux de ${P(k)}.`]);
    })(),
    (() => {
      const r12 = 0.038, r18 = 0.041, m = 0.04, n = 10e6;
      const k = fraRate(r12, 1, r18, 1.5);
      const a = -fraSettle(n, m, k, 0.5);
      return q("dv-fra-d4", "difficile", "Settlement payment made by the long in a 12×18 FRA priced at the implied forward rate?",
        [["12-month MRR today (annualized)", pc(r12)], ["18-month MRR today (annualized)", pc(r18)],
          ["6-month MRR realized in 12 months", pc(m)], ["Notional principal", usd(n)], ["Convention", "Simple interest, months/12"]],
        a, "$", 0,
        [`Taux du FRA : 1 + F × 0,5 = ${F(1 + r18 * 1.5, 4)} / ${F(1 + r12, 3)} = ${F((1 + r18 * 1.5) / (1 + r12), 6)}, donc F = ${P(k, 4)}.`,
          `MRR réalisé (${P(m)}) < F : le long paie ${F(n)} × (${P(k, 4)} − ${P(m)}) × 0,5 = ${D(n * (k - m) * 0.5, 0)} en fin de période.`,
          `Règlement d'avance = / (1 + ${F(m)} × 0,5) = ${D(a, 0)}.`],
        rel(a, 0.01));
    })(),
    (() => {
      const n = 20e6, k = 0.03, tau = 0.25, pay = 50000;
      const a = ((pay + n * k * tau) / (tau * (n - pay))) * 100;
      return q("dv-fra-d5", "difficile", "Realized 3-month MRR for which the long receives exactly $50,000 at settlement?",
        [["Notional principal", usd(n)], ["FRA rate", pc(k)], ["Settlement payment to the long", usd(pay)], ["Day count", "90/360"]],
        a, "%", 2,
        ["N × (M − K) × τ / (1 + M × τ) = P, donc M × τ × (N − P) = P + N × K × τ.",
          `M = (${F(pay)} + ${F(n * k * tau)}) / (0,25 × (${F(n)} − ${F(pay)})) = ${F(pay + n * k * tau)} / ${F(tau * (n - pay))}.`,
          `M = ${Pa(a, 4)}.`]);
    })(),
  ],
};

/* ────────────────────────── 6 · Futures : marque au marché et appels de marge ────────────────────────── */

const FUTURES_MARGIN: CalcType = {
  key: "futures-margin",
  topic: "derivatives",
  name: "Futures : mark-to-market et appels de marge",
  tier: "essentiel",
  source: "LM 2 · Forward Commitment and Contingent Claim Features and Instruments",
  formulas: [
    "Gain du jour (long) = (cours de compensation du jour − cours de la veille) × taille du contrat × nombre de contrats",
    "Le short a le gain opposé",
    "Solde = solde de la veille + gain du jour",
    "Si solde < marge de maintenance : appel (variation margin) pour revenir à la marge INITIALE",
  ],
  traps: [
    "En futures, l'appel de marge ramène le compte à la marge initiale, pas à la maintenance (≠ achat d'actions sur marge).",
    "Un solde égal à la marge de maintenance ne déclenche pas d'appel : il faut passer en dessous.",
    "Pas de prêt, donc pas d'intérêts sur la marge.",
  ],
  questions: [
    (() => {
      const o = { initial: 6000, maint: 4500, size: 100, long: true, prices: [1960, 1952] };
      const r = marginPath(o);
      const a = r.balance;
      return q("dv-mtm-f1", "facile", "Margin balance of the long at the end of day 1?",
        [["Position", "Long 1 gold futures contract (100 oz)"], ["Entry price", usd(1960)], ["Settlement price, day 1", usd(1952)],
          ["Initial margin", usd(o.initial)], ["Maintenance margin", usd(o.maint)]],
        a, "$", 0,
        [`Perte du jour = (${F(1952)} − ${F(1960)}) × 100 = ${D(r.days[0].pnl)}.`,
          `Solde = ${D(o.initial)} ${MINUS} ${D(-r.days[0].pnl)} = ${D(a)} ≥ ${D(o.maint)} : pas d'appel de marge.`]);
    })(),
    (() => {
      const p0 = 6.2, p1 = 6.05, size = 5000, n = 2;
      const a = (p0 - p1) * size * n;
      return q("dv-mtm-f2", "facile", "Mark-to-market gain of the short at the end of the day?",
        [["Position", "Short 2 wheat futures (5,000 bushels each)"], ["Previous settlement price", `${usd(p0, 2)} per bushel`],
          ["Today's settlement price", `${usd(p1, 2)} per bushel`]],
        a, "$", 0,
        [`Le short gagne quand le cours baisse : (${F(p0, 2)} − ${F(p1, 2)}) × ${F(size)} × ${F(n)}.`,
          `Gain = ${F(p0 - p1, 2)} × ${F(size * n)} = ${D(a)}.`]);
    })(),
    (() => {
      const bal = 2650, initial = 3500, maint = 2800;
      const a = bal < maint ? initial - bal : 0;
      return q("dv-mtm-f3", "facile", "Variation margin the trader must deposit?",
        [["Margin balance after today's settlement", usd(bal)], ["Initial margin", usd(initial)], ["Maintenance margin", usd(maint)]],
        a, "$", 0,
        [`${D(bal)} < ${D(maint)} : appel de marge.`,
          `En futures, on revient à la marge INITIALE : ${D(initial)} − ${D(bal)} = ${D(a)}.`]);
    })(),
    (() => {
      const p0 = 78.4, p1 = 79.1, size = 1000, n = 3;
      const a = (p1 - p0) * size * n;
      return q("dv-mtm-f4", "facile", "Mark-to-market gain of the long at the end of the day?",
        [["Position", "Long 3 crude oil futures (1,000 barrels each)"], ["Previous settlement price", usd(p0, 2)], ["Today's settlement price", usd(p1, 2)]],
        a, "$", 0,
        [`Gain = (${F(p1, 2)} − ${F(p0, 2)}) × ${F(size)} × ${F(n)} = ${F(p1 - p0, 2)} × ${F(size * n)} = ${D(a)}.`]);
    })(),
    (() => {
      const entry = 1950, initial = 6000, maint = 4500, size = 100;
      const a = entry - (initial - maint) / size;
      return q("dv-mtm-f5", "facile", "Settlement price below which the long receives a margin call?",
        [["Position", "Long 1 gold futures contract (100 oz)"], ["Entry price", usd(entry)], ["Initial margin", usd(initial)], ["Maintenance margin", usd(maint)]],
        a, "$", 2,
        [`Perte tolérée avant l'appel = ${D(initial)} − ${D(maint)} = ${D(initial - maint)}, soit ${F((initial - maint) / size)} $ par once.`,
          `Appel sous ${F(entry)} − ${F((initial - maint) / size)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const o = { initial: 4000, maint: 3000, size: 1000, long: true, prices: [80, 79.4, 78.9] };
      const r = marginPath(o);
      const a = r.days[1].call;
      return q("dv-mtm-m1", "moyen", "Variation margin deposit required at the end of day 2?",
        [["Position", "Long 1 crude oil futures (1,000 barrels)"], ["Entry price", usd(80, 2)], ["Settlement prices, days 1 and 2", lst([usd(79.4, 2), usd(78.9, 2)])],
          ["Initial margin", usd(o.initial)], ["Maintenance margin", usd(o.maint)]],
        a, "$", 0,
        [`Jour 1 : perte = 0,60 × 1 000 = ${D(-r.days[0].pnl)} → solde ${D(r.days[0].after)} (≥ ${D(o.maint)}).`,
          `Jour 2 : perte = 0,50 × 1 000 = ${D(-r.days[1].pnl)} → solde ${D(r.days[1].before)} < ${D(o.maint)} : appel.`,
          `Dépôt = ${D(o.initial)} − ${D(r.days[1].before)} = ${D(a)}.`]);
    })(),
    (() => {
      const n = 4, mult = 50;
      const o = { initial: 12000 * n, maint: 11000 * n, size: mult * n, long: false, prices: [4500, 4530] };
      const r = marginPath(o);
      const a = r.days[0].call;
      return q("dv-mtm-m2", "moyen", "Variation margin deposit required of the short at the end of the day?",
        [["Position", "Short 4 index futures, $50 multiplier"], ["Entry price", E(4500)], ["Settlement price", E(4530)],
          ["Initial margin per contract", usd(12000)], ["Maintenance margin per contract", usd(11000)]],
        a, "$", 0,
        [`Marges du compte : initiale ${D(o.initial)}, maintenance ${D(o.maint)}.`,
          `Hausse de 30 points : perte du short = 30 × 50 × 4 = ${D(-r.days[0].pnl)} → solde ${D(r.days[0].before)} < ${D(o.maint)}.`,
          `Dépôt = ${D(o.initial)} − ${D(r.days[0].before)} = ${D(a)}.`]);
    })(),
    (() => {
      const o = { initial: 4000, maint: 3000, size: 10000, long: true, prices: [4.5, 4.42, 4.47, 4.38] };
      const r = marginPath(o);
      const a = r.days[2].call;
      return q("dv-mtm-m3", "moyen", "Variation margin deposit required at the end of day 3?",
        [["Position", "Long 2 corn futures (5,000 bushels each)"], ["Entry price", usd(4.5, 2)],
          ["Settlement prices, days 1 to 3", lst([usd(4.42, 2), usd(4.47, 2), usd(4.38, 2)])],
          ["Initial margin per contract", usd(2000)], ["Maintenance margin per contract", usd(1500)]],
        a, "$", 0,
        [`Compte : initiale ${D(o.initial)}, maintenance ${D(o.maint)} ; 1 cent = ${D(100)} sur 10 000 boisseaux.`,
          `Jour 1 : ${D(r.days[0].pnl)} → ${D(r.days[0].after)} ; jour 2 : +${D(r.days[1].pnl)} → ${D(r.days[1].after)}.`,
          `Jour 3 : ${D(r.days[2].pnl)} → ${D(r.days[2].before)} < ${D(o.maint)} : dépôt = ${D(o.initial)} − ${D(r.days[2].before)} = ${D(a)}.`]);
    })(),
    (() => {
      const p0 = 2000, chg = 0.02, size = 100, im = 10000;
      const gain = p0 * chg * size;
      const a = (gain / im) * 100;
      return q("dv-mtm-m4", "moyen", "Return on the initial margin for the long after the price move?",
        [["Position", "Long 1 gold futures contract (100 oz)"], ["Entry price", usd(p0)], ["Futures price change", "+2%"], ["Initial margin", usd(im)]],
        a, "%", 1,
        [`Valeur notionnelle = ${F(p0)} × 100 = ${D(p0 * size)} ; gain = 2 % × ${D(p0 * size)} = ${D(gain)}.`,
          `Rendement sur marge = ${D(gain)} / ${D(im)} = ${Pa(a, 1)} : effet de levier de ${F((p0 * size) / im)}x.`]);
    })(),
    (() => {
      const entry = 4200, mult = 50, initial = 15000, maint = 12000;
      const a = entry + (initial - maint) / mult;
      return q("dv-mtm-m5", "moyen", "Settlement price above which the short receives a margin call?",
        [["Position", "Short 1 index futures, $50 multiplier"], ["Entry price", E(entry)], ["Initial margin", usd(initial)], ["Maintenance margin", usd(maint)]],
        a, "", 2,
        ["Le short perd quand l'indice monte.",
          `Perte tolérée = ${D(initial)} − ${D(maint)} = ${D(initial - maint)}, soit ${F((initial - maint) / mult)} points.`,
          `Appel au-dessus de ${F(entry)} + ${F((initial - maint) / mult)} = ${F(a, 2)} points.`]);
    })(),
    (() => {
      const o = { initial: 7000, maint: 5500, size: 100, long: true, prices: [2000, 1985, 1970, 1990] };
      const r = marginPath(o);
      const a = r.balance;
      return q("dv-mtm-d1", "difficile", "Margin account balance at the end of day 3, after any required deposits?",
        [["Position", "Long 1 gold futures contract (100 oz)"], ["Entry price", usd(2000)],
          ["Settlement prices, days 1 to 3", lst([usd(1985), usd(1970), usd(1990)])], ["Initial margin", usd(o.initial)], ["Maintenance margin", usd(o.maint)]],
        a, "$", 0,
        [`Jour 1 : ${D(r.days[0].pnl)} → ${D(r.days[0].after)}, égal à la maintenance : pas d'appel (il faut passer en dessous).`,
          `Jour 2 : ${D(r.days[1].pnl)} → ${D(r.days[1].before)} < ${D(o.maint)} : dépôt de ${D(r.days[1].call)} pour revenir à ${D(o.initial)}.`,
          `Jour 3 : +${D(r.days[2].pnl)} → ${D(a)}.`]);
    })(),
    (() => {
      const o = { initial: 6000, maint: 4400, size: 2000, long: false, prices: [75, 75.5, 76.2, 75.9, 76.8] };
      const r = marginPath(o);
      const a = r.deposits;
      return q("dv-mtm-d2", "difficile", "Total variation margin deposited by the short over the four days?",
        [["Position", "Short 2 crude oil futures (1,000 barrels each)"], ["Entry price", usd(75, 2)],
          ["Settlement prices, days 1 to 4", lst([usd(75.5, 2), usd(76.2, 2), usd(75.9, 2), usd(76.8, 2)])],
          ["Initial margin per contract", usd(3000)], ["Maintenance margin per contract", usd(2200)]],
        a, "$", 0,
        [`Compte : initiale ${D(o.initial)}, maintenance ${D(o.maint)} ; 1 $ de hausse = −${D(o.size)} pour le short.`,
          ...r.days.map((d, i) => `Jour ${i + 1} : ${d.pnl >= 0 ? "+" : ""}${D(d.pnl)} → ${D(d.before)}${d.call > 0 ? ` < ${D(o.maint)} : dépôt ${D(d.call)} → ${D(d.after)}` : ""}.`),
          `Total déposé = ${D(a)}.`]);
    })(),
    (() => {
      const n = 5, mult = 50;
      const o = { initial: 10000 * n, maint: 8000 * n, size: mult * n, long: true, prices: [4000, 3950] };
      const r = marginPath(o);
      const a = r.days[0].call;
      return q("dv-mtm-d3", "difficile", "Variation margin deposit required at the end of the day?",
        [["Position", "Long 5 index futures, $50 multiplier"], ["Entry price", E(4000)], ["Settlement price", E(3950)],
          ["Initial margin per contract", usd(10000)], ["Maintenance margin per contract", usd(8000)]],
        a, "$", 0,
        [`Compte : initiale ${D(o.initial)}, maintenance ${D(o.maint)}.`,
          `Perte = 50 points × 50 × 5 = ${D(-r.days[0].pnl)} → solde ${D(r.days[0].before)} < ${D(o.maint)}.`,
          `Dépôt jusqu'à la marge initiale = ${D(o.initial)} − ${D(r.days[0].before)} = ${D(a)} (et non ${D(o.maint - r.days[0].before)}, qui ne ramènerait qu'à la maintenance).`]);
    })(),
    (() => {
      const p0 = 6.1, p1 = 5.95, size = 5000, n = 3, deposits = 1800;
      const a = (p1 - p0) * size * n;
      return q("dv-mtm-d4", "difficile", "Total profit on the futures position when it is closed? (Negative if a loss.)",
        [["Position", "Long 3 soybean futures (5,000 bushels each)"], ["Entry price", usd(p0, 2)], ["Price when closed", usd(p1, 2)],
          ["Initial margin per contract", usd(3000)], ["Variation margin deposited during the life of the trade", usd(deposits)]],
        a, "$", 0,
        ["Les marges sont des dépôts de garantie : elles ne changent pas le profit (données à écarter).",
          `Profit = (${F(p1, 2)} − ${F(p0, 2)}) × ${F(size)} × ${F(n)} = ${D(a)}.`]);
    })(),
    (() => {
      const initial = 6000, maint = 4500, size = 100, p0 = 2000, p1 = 1990;
      const bal1 = initial + (p1 - p0) * size;
      const a = p1 - (bal1 - maint) / size;
      return q("dv-mtm-d5", "difficile", "Day-2 settlement price below which the long receives a margin call?",
        [["Position", "Long 1 gold futures contract (100 oz)"], ["Entry price", usd(p0)], ["Settlement price, day 1", usd(p1)],
          ["Initial margin", usd(initial)], ["Maintenance margin", usd(maint)]],
        a, "$", 2,
        [`Solde après le jour 1 = ${D(initial)} − ${F(p0 - p1)} × 100 = ${D(bal1)}.`,
          `Marge restante avant l'appel = ${D(bal1)} − ${D(maint)} = ${D(bal1 - maint)}, soit ${F((bal1 - maint) / size)} $ par once.`,
          `Appel si le cours du jour 2 passe sous ${F(p1)} − ${F((bal1 - maint) / size)} = ${D(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 7 · Futures de taux ────────────────────────── */

const IR_FUTURES: CalcType = {
  key: "interest-rate-futures",
  topic: "derivatives",
  name: "Futures de taux : cotation et BPV",
  tier: "annexe",
  source: "LM 6 · Pricing and Valuation of Futures Contracts",
  formulas: [
    "Cours = 100 − (100 × MRR) ; MRR implicite = (100 − cours) %",
    "BPV = notionnel × période × 0,01 %",
    "Gain du long = (hausse du cours en points de base) × BPV × nombre de contrats",
    "FRA équivalent : règlement = BPV × écart en pb / (1 + MRR × période) (convexité)",
  ],
  traps: [
    "Le long d'un futures de taux gagne quand les taux BAISSENT (le cours monte).",
    "La période est la durée du taux sous-jacent (3 mois = 0,25), pas l'échéance du contrat.",
  ],
  questions: [
    (() => {
      const p = 96.25;
      const a = 100 - p;
      return q("dv-irf-f1", "facile", "Market reference rate implied by the futures price?",
        [["Futures price on 3-month MRR", E(p, 2)]],
        a, "%", 2,
        [`MRR implicite = 100 − ${F(p, 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const m = 0.042;
      const a = 100 - m * 100;
      return q("dv-irf-f2", "facile", "Futures price consistent with the expected 3-month MRR?",
        [["Expected 3-month MRR", pc(m)]],
        a, "", 2,
        [`Cours = 100 − ${F(m * 100, 2)} = ${F(a, 2)}.`]);
    })(),
    (() => {
      const n = 1e6, per = 0.25;
      const a = bpv(n, per);
      return q("dv-irf-f3", "facile", "Basis point value (BPV) of one contract?",
        [["Notional principal", usd(n)], ["Underlying rate", "3-month MRR"]],
        a, "$", 2,
        [`BPV = ${F(n)} × 0,25 × 0,0001 = ${D(a, 2)} par point de base.`]);
    })(),
    (() => {
      const n = 5e6, per = 0.5;
      const a = bpv(n, per);
      return q("dv-irf-f4", "facile", "Basis point value (BPV) of one contract?",
        [["Notional principal", usd(n)], ["Underlying rate", "6-month MRR"]],
        a, "$", 2,
        [`BPV = ${F(n)} × 0,5 × 0,0001 = ${D(a, 2)}.`]);
    })(),
    (() => {
      const p0 = 95.5, p1 = 95.62;
      const bp = Math.round((p1 - p0) * 100);
      const a = bp * bpv(1e6, 0.25);
      return q("dv-irf-f5", "facile", "Gain on one long contract?",
        [["Contract", "3-month MRR futures, $1,000,000 notional"], ["Purchase price", E(p0, 2)], ["Current price", E(p1, 2)]],
        a, "$", 0,
        [`Hausse du cours = ${F(bp)} pb (le MRR implicite baisse de ${P((100 - p0) / 100, 2)} à ${P((100 - p1) / 100, 2)}).`,
          `BPV = 1 000 000 × 0,25 × 0,0001 = 25 $ ; gain = ${F(bp)} × 25 = ${D(a)}.`]);
    })(),
    (() => {
      const n = 10, m0 = 0.04, m1 = 0.0415;
      const bp = Math.round((m1 - m0) * 10000);
      const a = -bp * bpv(1e6, 0.25) * n;
      return q("dv-irf-m1", "moyen", "Gain or loss on the long futures position? (Negative if a loss.)",
        [["Position", "Long 10 contracts on 3-month MRR, $1,000,000 notional each"], ["Implied MRR at purchase", pc(m0)], ["Implied MRR now", pc(m1, 2)]],
        a, "$", 0,
        [`Le MRR monte de ${F(bp)} pb : le cours baisse d'autant, le long perd.`,
          `Perte = ${F(bp)} × 25 $ × ${F(n)} = ${D(a)}.`]);
    })(),
    (() => {
      const n = 20, p0 = 96.1, p1 = 95.85;
      const bp = Math.round((p0 - p1) * 100);
      const a = bp * bpv(1e6, 0.25) * n;
      return q("dv-irf-m2", "moyen", "Gain on the short futures position?",
        [["Position", "Short 20 contracts on 3-month MRR, $1,000,000 notional each"], ["Price at entry", E(p0, 2)], ["Current price", E(p1, 2)]],
        a, "$", 0,
        [`Le cours baisse de ${F(bp)} pb (taux en hausse) : le short gagne.`,
          `Gain = ${F(bp)} × 25 $ × ${F(n)} = ${D(a)}.`]);
    })(),
    (() => {
      const p0 = 97, p1 = 96.4;
      const bp = Math.round((p0 - p1) * 100);
      const b = bpv(1e6, 0.5);
      const a = -bp * b;
      return q("dv-irf-m3", "moyen", "Gain or loss on one long contract? (Negative if a loss.)",
        [["Contract", "6-month MRR futures, $1,000,000 notional"], ["Purchase price", E(p0, 2)], ["Current price", E(p1, 2)]],
        a, "$", 0,
        [`Le MRR implicite passe de ${P((100 - p0) / 100)} à ${P((100 - p1) / 100)} : +${F(bp)} pb.`,
          `BPV d'un taux 6 mois = 1 000 000 × 0,5 × 0,0001 = ${D(b)} ; perte = ${F(bp)} × ${F(b)} = ${D(a)}.`]);
    })(),
    (() => {
      const n = 10e6, k = 0.03, m = 0.0301, per = 0.5;
      const a = fraSettle(n, m, k, per);
      return q("dv-irf-m4", "moyen", "Settlement payment to the long of the equivalent 6m6m FRA if the MRR ends 1 bp above the FRA rate?",
        [["Notional principal", usd(n)], ["FRA rate", pc(k)], ["Realized 6-month MRR", pc(m, 2)]],
        a, "$", 2,
        [`Écart d'intérêt = BPV × 1 pb = ${F(n)} × 0,5 × 0,0001 = ${D(bpv(n, per), 2)}, dû en fin de période.`,
          `Le FRA règle d'avance : ${F(bpv(n, per))} / (1 + ${F(m)} × 0,5) = ${D(a, 2)}, moins que le futures (${D(bpv(n, per), 2)}).`]);
    })(),
    (() => {
      const n = 100, p0 = 94.85, p1 = 95.1;
      const bp = Math.round((p1 - p0) * 100);
      const a = bp * bpv(1e6, 0.25) * n;
      return q("dv-irf-m5", "moyen", "Change in value of the long position?",
        [["Position", "Long 100 contracts on 3-month MRR, $1,000,000 notional each"], ["Price at entry", E(p0, 2)], ["Current price", E(p1, 2)]],
        a, "$", 0,
        [`Hausse du cours = ${F(bp)} pb ; BPV = 25 $.`,
          `Gain = ${F(bp)} × 25 × ${F(n)} = ${D(a)}.`]);
    })(),
    (() => {
      const n = 10e6, k = 0.03, per = 0.5, d = 0.001;
      const up = fraSettle(n, k + d, k, per);
      const dn = -fraSettle(n, k - d, k, per);
      const a = dn - up;
      return q("dv-irf-d1", "difficile", "By how much does the FRA payment for a 10 bp fall in MRR exceed the payment for a 10 bp rise?",
        [["Contract", "6m6m FRA, $10,000,000 notional"], ["FRA rate", pc(k)], ["Scenarios at settlement", "MRR = 2.90% or 3.10%"]],
        a, "$", 2,
        [`Écart non actualisé = ${F(n)} × 0,001 × 0,5 = ${D(n * d * per)} dans les deux cas (c'est ce que paierait un futures).`,
          `MRR à 3,10 % : le long reçoit ${F(n * d * per)} / (1 + 0,031 × 0,5) = ${D(up, 2)}.`,
          `MRR à 2,90 % : le long paie ${F(n * d * per)} / (1 + 0,029 × 0,5) = ${D(dn, 2)}.`,
          `Différence = ${D(a, 2)} : c'est la convexité du FRA (convexity bias).`],
        0.02);
    })(),
    (() => {
      const loan = 50e6, rise = 40;
      const contracts = loan / 1e6;
      const a = rise * bpv(1e6, 0.25) * contracts;
      const extra = loan * (rise / 10000) * 0.25;
      return q("dv-irf-d2", "difficile", "Gain on the futures hedge if the 3-month MRR rises by 40 bp?",
        [["Planned borrowing", "USD 50 million for 3 months, starting in 3 months"], ["Hedge", "Short 3-month MRR futures, $1,000,000 notional each, one per $1 million"],
          ["Change in 3-month MRR", "+40 bp"]],
        a, "$", 0,
        [`Nombre de contrats = 50 000 000 / 1 000 000 = ${F(contracts)} ; BPV = 25 $.`,
          `Gain du short = 40 × 25 × ${F(contracts)} = ${D(a)}.`,
          `Surcoût d'intérêts de l'emprunt = 50 000 000 × 0,004 × 0,25 = ${D(extra)} : la couverture compense.`]);
    })(),
    (() => {
      const n = 30, p0 = 95.75, p1 = 95.52, margin = 1500;
      const bp = Math.round((p0 - p1) * 100);
      const a = -bp * bpv(1e6, 0.25) * n;
      return q("dv-irf-d3", "difficile", "Gain or loss on the long position when closed? (Negative if a loss.)",
        [["Position", "Long 30 contracts on 3-month MRR, $1,000,000 notional each"], ["Purchase price", E(p0, 2)], ["Closing price", E(p1, 2)],
          ["Initial margin per contract", usd(margin)]],
        a, "$", 0,
        ["La marge initiale ne change pas le résultat (donnée à écarter).",
          `Baisse du cours = ${F(bp)} pb ; perte = ${F(bp)} × 25 $ × ${F(n)} = ${D(a)}.`]);
    })(),
    (() => {
      const n = 8, p0 = 97, m = 0.026;
      const p1 = 100 - m * 100;
      const bp = Math.round((p1 - p0) * 100);
      const b = bpv(1e6, 0.5);
      const a = bp * b * n;
      return q("dv-irf-d4", "difficile", "Gain on the long position at settlement?",
        [["Position", "Long 8 contracts on 6-month MRR, $1,000,000 notional each"], ["Purchase price", E(p0, 2)], ["6-month MRR at settlement", pc(m)]],
        a, "$", 0,
        [`Cours final = 100 − ${F(m * 100, 1)} = ${F(p1, 2)} : hausse de ${F(bp)} pb.`,
          `BPV (6 mois) = 1 000 000 × 0,5 × 0,0001 = ${D(b)}.`,
          `Gain = ${F(bp)} × ${F(b)} × ${F(n)} = ${D(a)}.`]);
    })(),
    (() => {
      const p = 95.8, loan = 20e6;
      const m = (100 - p) / 100;
      const a = loan * m * 0.25;
      return q("dv-irf-d5", "difficile", "Interest cost locked in on the 3-month loan by the futures price?",
        [["3-month MRR futures price", E(p, 2)], ["Loan", "USD 20 million for 3 months, starting at futures expiration"]],
        a, "$", 0,
        [`MRR implicite = 100 − ${F(p, 2)} = ${P(m, 2)}.`,
          `Intérêts sur 3 mois = ${F(loan)} × ${F(m, 4)} × 0,25 = ${D(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 8 · Taux de swap (par swap rate) ────────────────────────── */

const SWAP_RATE: CalcType = {
  key: "swap-rate",
  topic: "derivatives",
  name: "Taux de swap (par swap rate)",
  tier: "essentiel",
  source: "LM 7 · Pricing and Valuation of Interest Rate and Other Swaps",
  formulas: [
    "Facteur d'actualisation DF_i = 1 / (1 + z_i / m)^i (z_i spot annualisé, m périodes par an)",
    "Taux fixe par période = (1 − DF_N) / (DF_1 + … + DF_N)",
    "Équivalent : Σ (MRR forward_i − taux fixe) × DF_i = 0, soit taux fixe = Σ MRR forward_i × DF_i / Σ DF_i",
    "Taux de swap annualisé = taux par période × m",
  ],
  traps: [
    "À l'initiation le swap vaut zéro : son prix est le taux fixe qui égalise les deux jambes.",
    "Swap trimestriel ou semestriel : passer en taux par période, puis annualiser.",
  ],
  questions: [
    (() => {
      const dfs = [0.97, 0.94];
      const a = parSwap(dfs) * 100;
      return q("dv-swr-f1", "facile", "Fixed rate of a 2-year swap with annual payments?",
        [["Discount factors (years 1 / 2)", lst(dfs.map((x) => E(x, 4)))]],
        a, "%", 2,
        ["Taux fixe = (1 − DF_N) / Σ DF.",
          `= (1 − ${F(dfs[1], 2)}) / (${F(dfs[0], 2)} + ${F(dfs[1], 2)}) = ${F(1 - dfs[1], 2)} / ${F(sum(dfs), 2)} = ${Pa(a)}.`]);
    })(),
    (() => {
      const z = [0.02, 0.025];
      const dfs = dfsFromSpots(z);
      const a = parSwap(dfs) * 100;
      return q("dv-swr-f2", "facile", "Fixed rate of a 2-year swap with annual payments?",
        [["Spot rates (years 1 / 2, annual compounding)", lst(z.map((x) => pc(x)))]],
        a, "%", 3,
        [`DF1 = 1 / ${F(1 + z[0])} = ${F(dfs[0], 6)} ; DF2 = 1 / ${F(1 + z[1], 3)}² = ${F(dfs[1], 6)}.`,
          `Taux fixe = (1 − ${F(dfs[1], 6)}) / (${F(dfs[0], 6)} + ${F(dfs[1], 6)}) = ${F(1 - dfs[1], 6)} / ${F(sum(dfs), 6)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const fw = [0.03, 0.04];
      const dfs = dfsFromForwards(fw);
      const a = (sum(fw.map((f, i) => f * dfs[i])) / sum(dfs)) * 100;
      return q("dv-swr-f3", "facile", "Fixed rate of the 2-year annual swap, as a weighted average of the forward rates?",
        [["Expected 1-year MRR for years 1 / 2 (forward rates)", lst(fw.map((x) => pc(x)))], ["Discount factors (years 1 / 2)", lst(dfs.map((x) => E(x, 6)))]],
        a, "%", 3,
        ["Taux fixe = Σ forward_i × DF_i / Σ DF_i (moyenne des forwards pondérée par les DF).",
          `= (${F(fw[0])} × ${F(dfs[0], 6)} + ${F(fw[1])} × ${F(dfs[1], 6)}) / (${F(dfs[0], 6)} + ${F(dfs[1], 6)}).`,
          `= ${F(sum(fw.map((f, i) => f * dfs[i])), 6)} / ${F(sum(dfs), 6)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const z = [0.04, 0.05];
      const dfs = dfsFromSpots(z);
      const a = parSwap(dfs) * 100;
      return q("dv-swr-f4", "facile", "Fixed rate of a 2-year swap with annual payments?",
        [["Spot rates (years 1 / 2, annual compounding)", lst(z.map((x) => pc(x)))]],
        a, "%", 3,
        [`DF1 = 1 / ${F(1 + z[0])} = ${F(dfs[0], 6)} ; DF2 = 1 / ${F(1 + z[1])}² = ${F(dfs[1], 6)}.`,
          `Taux fixe = ${F(1 - dfs[1], 6)} / ${F(sum(dfs), 6)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const dfs = [0.995, 0.989, 0.982, 0.974];
      const per = parSwap(dfs);
      const a = per * 4 * 100;
      return q("dv-swr-f5", "facile", "Annualized fixed rate of a 1-year swap with quarterly payments?",
        [["Discount factors (quarters 1 to 4)", lst(dfs.map((x) => E(x, 3)))]],
        a, "%", 3,
        [`Taux par trimestre = (1 − ${F(dfs[3], 3)}) / (${dfs.map((x) => F(x, 3)).join(" + ")}) = ${F(1 - dfs[3], 3)} / ${F(sum(dfs), 3)} = ${P(per, 4)}.`,
          `Annualisé : ${P(per, 4)} × 4 = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const z = [0.02, 0.022, 0.024, 0.026];
      const dfs = dfsFromSpots(z, 4);
      const per = parSwap(dfs);
      const a = per * 4 * 100;
      return q("dv-swr-m1", "moyen", "Annualized fixed rate of a 1-year swap with quarterly payments?",
        [["Spot rates for 3 / 6 / 9 / 12 months (annualized, quarterly compounding)", lst(z.map((x) => pc(x)))]],
        a, "%", 3,
        [`DF_i = 1 / (1 + z_i / 4)^i : ${dfs.map((x) => F(x, 6)).join(" ; ")}.`,
          `Taux par trimestre = (1 − ${F(dfs[3], 6)}) / ${F(sum(dfs), 6)} = ${P(per, 4)}.`,
          `Annualisé = ${P(per, 4)} × 4 = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const fw = [0.02, 0.03, 0.04];
      const dfs = dfsFromForwards(fw);
      const a = parSwap(dfs) * 100;
      return q("dv-swr-m2", "moyen", "Fixed rate of a 3-year swap with annual payments?",
        [["1-year rate today", pc(fw[0])], ["1-year forward rate in 1 year (1y1y)", pc(fw[1])], ["1-year forward rate in 2 years (2y1y)", pc(fw[2])]],
        a, "%", 3,
        [`DF1 = 1 / ${F(1 + fw[0])} = ${F(dfs[0], 6)} ; DF2 = DF1 / ${F(1 + fw[1])} = ${F(dfs[1], 6)} ; DF3 = DF2 / ${F(1 + fw[2])} = ${F(dfs[2], 6)}.`,
          `Taux fixe = (1 − ${F(dfs[2], 6)}) / ${F(sum(dfs), 6)} = ${Pa(a, 3)}.`,
          `(C'est aussi Σ forward × DF / Σ DF = ${F(sum(fw.map((f, i) => f * dfs[i])), 6)} / ${F(sum(dfs), 6)}.)`]);
    })(),
    (() => {
      const z = [0.03, 0.032, 0.034, 0.036];
      const dfs = dfsFromSpots(z, 2);
      const per = parSwap(dfs);
      const a = per * 2 * 100;
      return q("dv-swr-m3", "moyen", "Annualized fixed rate of a 2-year swap with semiannual payments?",
        [["Spot rates for 0.5 / 1 / 1.5 / 2 years (annualized, semiannual compounding)", lst(z.map((x) => pc(x)))]],
        a, "%", 3,
        [`DF_i = 1 / (1 + z_i / 2)^i : ${dfs.map((x) => F(x, 6)).join(" ; ")}.`,
          `Taux par semestre = (1 − ${F(dfs[3], 6)}) / ${F(sum(dfs), 6)} = ${P(per, 4)}.`,
          `Annualisé = ${P(per, 4)} × 2 = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const z = [0.03, 0.035], n = 50e6;
      const dfs = dfsFromSpots(z);
      const s = parSwap(dfs);
      const a = s * n;
      return q("dv-swr-m4", "moyen", "Annual fixed payment on the 2-year swap priced at the par swap rate?",
        [["Notional principal", usd(n)], ["Spot rates (years 1 / 2, annual compounding)", lst(z.map((x) => pc(x)))], ["Payments", "Annual"]],
        a, "$", 0,
        [`DF1 = ${F(dfs[0], 6)} ; DF2 = ${F(dfs[1], 6)}.`,
          `Taux de swap = (1 − ${F(dfs[1], 6)}) / ${F(sum(dfs), 6)} = ${P(s, 6)}.`,
          `Paiement fixe annuel = ${P(s, 6)} × ${F(n)} = ${D(a, 0)}.`],
        rel(a, 0.003));
    })(),
    (() => {
      const z = [0.015, 0.022, 0.029];
      const dfs = dfsFromSpots(z);
      const a = parSwap(dfs) * 100;
      return q("dv-swr-m5", "moyen", "Fixed rate of a 3-year swap with annual payments?",
        [["Spot rates (years 1 / 2 / 3, annual compounding)", lst(z.map((x) => pc(x)))]],
        a, "%", 3,
        [`DF : ${dfs.map((x, i) => `DF${i + 1} = ${F(x, 6)}`).join(" ; ")}.`,
          `Taux fixe = (1 − ${F(dfs[2], 6)}) / ${F(sum(dfs), 6)} = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const z = [0.02, 0.026, 0.031, 0.035];
      const dfs = dfsFromSpots(z);
      const a = parSwap(dfs) * 100;
      return q("dv-swr-d1", "difficile", "Fixed rate of a 4-year swap with annual payments?",
        [["Spot rates (years 1 to 4, annual compounding)", lst(z.map((x) => pc(x)))]],
        a, "%", 3,
        [`DF : ${dfs.map((x, i) => `DF${i + 1} = ${F(x, 6)}`).join(" ; ")} ; Σ DF = ${F(sum(dfs), 6)}.`,
          `Taux fixe = (1 − ${F(dfs[3], 6)}) / ${F(sum(dfs), 6)} = ${Pa(a, 3)}.`,
          "Le taux de swap est proche (un peu sous) le taux spot le plus long : c'est un rendement au pair."]);
    })(),
    (() => {
      const z1 = 0.02, z2 = 0.025, s = 0.029;
      const df1 = disc(z1, 1), df2 = disc(z2, 2);
      const df3 = (1 - s * (df1 + df2)) / (1 + s);
      const a = (Math.pow(df3, -1 / 3) - 1) * 100;
      return q("dv-swr-d2", "difficile", "3-year spot rate implied by the 3-year par swap rate (bootstrapping)?",
        [["1-year spot rate", pc(z1)], ["2-year spot rate", pc(z2)], ["3-year par swap rate (annual payments)", pc(s)]],
        a, "%", 3,
        [`DF1 = ${F(df1, 6)} ; DF2 = ${F(df2, 6)}.`,
          `s × (DF1 + DF2 + DF3) = 1 − DF3, donc DF3 = (1 − s × (DF1 + DF2)) / (1 + s) = (1 − ${F(s, 3)} × ${F(df1 + df2, 6)}) / ${F(1 + s, 3)} = ${F(df3, 6)}.`,
          `Z3 = ${F(df3, 6)}^(−1/3) − 1 = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const days = [90, 180, 270, 360];
      const m = [0.03, 0.032, 0.034, 0.036];
      const dfs = m.map((x, i) => 1 / (1 + (x * days[i]) / 360));
      const per = parSwap(dfs);
      const a = per * 4 * 100;
      return q("dv-swr-d3", "difficile", "Annualized fixed rate of a 1-year swap with quarterly payments?",
        [["MRR for 90 / 180 / 270 / 360 days (annualized)", lst(m.map((x) => pc(x)))], ["Convention", "Simple interest, actual/360"]],
        a, "%", 3,
        [`DF_i = 1 / (1 + MRR_i × jours / 360) : ${dfs.map((x) => F(x, 6)).join(" ; ")}.`,
          `Taux par trimestre = (1 − ${F(dfs[3], 6)}) / ${F(sum(dfs), 6)} = ${P(per, 4)}.`,
          `Annualisé = × 4 = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const fwAnn = [0.03, 0.034, 0.038];
      const fw = fwAnn.map((x) => x / 2);
      const dfs = dfsFromForwards(fw);
      const per = sum(fw.map((f, i) => f * dfs[i])) / sum(dfs);
      const a = per * 2 * 100;
      return q("dv-swr-d4", "difficile", "Annualized fixed rate of an 18-month swap with semiannual payments?",
        [["6-month MRR today (annualized)", pc(fwAnn[0])], ["6-month forward MRR starting in 6 / 12 months (annualized)", lst([pc(fwAnn[1]), pc(fwAnn[2])])],
          ["Convention", "Simple interest, months/12"]],
        a, "%", 3,
        [`Taux par semestre : ${fw.map((x) => P(x, 2)).join(" ; ")}.`,
          `DF1 = 1 / ${F(1 + fw[0], 4)} = ${F(dfs[0], 6)} ; DF2 = DF1 / ${F(1 + fw[1], 4)} = ${F(dfs[1], 6)} ; DF3 = DF2 / ${F(1 + fw[2], 4)} = ${F(dfs[2], 6)}.`,
          `Taux par semestre = Σ f × DF / Σ DF = ${F(sum(fw.map((f, i) => f * dfs[i])), 6)} / ${F(sum(dfs), 6)} = ${P(per, 4)}.`,
          `Annualisé = × 2 = ${Pa(a, 3)}.`]);
    })(),
    (() => {
      const z = [0.032, 0.037, 0.041], n = 80e6, bond = 0.06;
      const dfs = dfsFromSpots(z);
      const s = parSwap(dfs);
      const a = s * n;
      return q("dv-swr-d5", "difficile", "Annual fixed payment on the 3-year swap priced at the par swap rate?",
        [["Notional principal", usd(n)], ["Spot rates (years 1 / 2 / 3, annual compounding)", lst(z.map((x) => pc(x)))],
          ["Company's own bond yield", pc(bond)], ["Payments", "Annual"]],
        a, "$", 0,
        ["Le taux de swap se tire de la courbe sans risque de référence : le rendement obligataire de l'entreprise ne sert pas.",
          `DF : ${dfs.map((x) => F(x, 6)).join(" ; ")} ; taux de swap = (1 − ${F(dfs[2], 6)}) / ${F(sum(dfs), 6)} = ${P(s, 6)}.`,
          `Paiement fixe = ${P(s, 6)} × ${F(n)} = ${D(a, 0)}.`],
        rel(a, 0.003));
    })(),
  ],
};

/* ────────────────────────── 9 · Paiement net et valeur d'un swap ────────────────────────── */

const SWAP_VALUE: CalcType = {
  key: "swap-value",
  topic: "derivatives",
  name: "Paiement net et valeur d'un swap de taux",
  tier: "essentiel",
  source: "LM 7 · Pricing and Valuation of Interest Rate and Other Swaps",
  formulas: [
    "Paiement net reçu par le payeur fixe = notionnel × (MRR − taux fixe) × période",
    "Valeur pour le payeur fixe = PV(jambe flottante attendue) − PV(jambe fixe)",
    "Par les forwards : V (payeur fixe) = notionnel × période × Σ (forward_i − taux fixe) × DF_i",
    "Après variation des taux : V (payeur fixe) = (taux de swap actuel − taux du contrat) × période × notionnel × Σ DF restants",
  ],
  traps: [
    "Le flottant versé en fin de période est fixé au MRR du DÉBUT de la période (set in advance, paid in arrears).",
    "Une hausse des taux attendus profite au payeur fixe (receveur flottant) ; la valeur du receveur fixe est l'opposée.",
    "Seul le montant net est échangé à chaque date.",
  ],
  questions: [
    (() => {
      const n = 20e6, k = 0.03, m = 0.034;
      const a = n * (m - k) * 0.25;
      return q("dv-swv-f1", "facile", "Net quarterly payment received by the fixed-rate payer?",
        [["Notional principal", usd(n)], ["Swap fixed rate (annualized)", pc(k)], ["MRR set at the start of the quarter (annualized)", pc(m)], ["Payments", "Quarterly (period = 0.25)"]],
        a, "$", 0,
        [`Jambe flottante = ${F(n)} × ${F(m)} × 0,25 = ${D(n * m * 0.25)} ; jambe fixe = ${F(n)} × ${F(k)} × 0,25 = ${D(n * k * 0.25)}.`,
          `Le payeur fixe reçoit le net : ${D(a)}.`]);
    })(),
    (() => {
      const n = 25e6, k = 0.04;
      const a = n * k * 0.25;
      return q("dv-swv-f2", "facile", "Quarterly fixed-rate payment on the swap?",
        [["Notional principal", usd(n)], ["Swap fixed rate (annualized)", pc(k)], ["Payments", "Quarterly"]],
        a, "$", 0,
        [`Paiement fixe = ${F(n)} × ${F(k)} / 4 = ${D(a)}.`]);
    })(),
    (() => {
      const n = 50e6, k = 0.025, m = 0.021;
      const a = n * (k - m) * 0.5;
      return q("dv-swv-f3", "facile", "Net semiannual payment received by the floating-rate payer?",
        [["Notional principal", usd(n)], ["Swap fixed rate (annualized)", pc(k)], ["MRR set at the start of the period (annualized)", pc(m)], ["Payments", "Semiannual"]],
        a, "$", 0,
        ["Le payeur flottant reçoit le fixe.",
          `Net = ${F(n)} × (${F(k)} − ${F(m)}) × 0,5 = ${D(a)}.`]);
    })(),
    (() => {
      const pvFl = 10.35e6, pvFx = 10.2e6;
      const a = pvFl - pvFx;
      return q("dv-swv-f4", "facile", "Value of the swap to the fixed-rate payer?",
        [["PV of expected floating-rate payments", usd(pvFl)], ["PV of remaining fixed-rate payments", usd(pvFx)]],
        a, "$", 0,
        ["Le payeur fixe reçoit le flottant et paie le fixe.",
          `V = ${D(pvFl)} − ${D(pvFx)} = ${D(a)}.`]);
    })(),
    (() => {
      const n = 1e6, k = 0.03, r1 = 0.04;
      const a = ((r1 - k) * n) / (1 + r1);
      return q("dv-swv-f5", "facile", "Value of the swap to the fixed-rate payer, with one annual payment left?",
        [["Notional principal", usd(n)], ["Swap fixed rate", pc(k)], ["MRR set for the final period (= 1-year rate)", pc(r1)], ["Time to final payment", "1 year"]],
        a, "$", 0,
        [`Dernier paiement net connu = (${F(r1)} − ${F(k)}) × ${F(n)} = ${D((r1 - k) * n)}, versé dans 1 an.`,
          `Valeur = ${F((r1 - k) * n)} / ${F(1 + r1)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const n = 20e6, k = 0.035, s = 0.045;
      const dfs = dfsFromSpots([s, s]).map(r4);
      const a = (s - k) * n * sum(dfs);
      return q("dv-swv-m1", "moyen", "Current value of the swap to the fixed-rate payer?",
        [["Notional principal", usd(n)], ["Contract fixed rate", pc(k)], ["Current 2-year par swap rate", pc(s)],
          ["Discount factors for the remaining annual dates", lst(dfs.map((x) => E(x, 4)))]],
        a, "$", 0,
        ["Le payeur fixe paie 3,5 % alors que le marché demande 4,5 % : il gagne 1 % par an.",
          `V = (${F(s)} − ${F(k)}) × ${F(n)} × (${F(dfs[0], 4)} + ${F(dfs[1], 4)}) = ${D((s - k) * n)} × ${F(sum(dfs), 4)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const n = 10e6, k = 0.05, s = 0.042;
      const dfs = dfsFromSpots([s, s, s]).map(r4);
      const a = (k - s) * n * sum(dfs);
      return q("dv-swv-m2", "moyen", "Current value of the swap to the fixed-rate receiver?",
        [["Notional principal", usd(n)], ["Contract fixed rate", pc(k)], ["Current 3-year par swap rate", pc(s)],
          ["Discount factors for the remaining annual dates", lst(dfs.map((x) => E(x, 4)))]],
        a, "$", 0,
        ["Les taux ont baissé : le receveur fixe touche 5 % au lieu de 4,2 %.",
          `V = (${F(k)} − ${F(s)}) × ${F(n)} × ${F(sum(dfs), 4)} = ${D((k - s) * n)} × ${F(sum(dfs), 4)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const n = 40e6, k = 0.032, m1 = 0.028, m2 = 0.035, m3 = 0.039;
      const a = n * (m2 - k) * 0.25;
      return q("dv-swv-m3", "moyen", "Net payment received by the fixed-rate payer at the end of quarter 2?",
        [["Notional principal", usd(n)], ["Swap fixed rate (annualized)", pc(k)], ["MRR at the start of quarter 1", pc(m1)],
          ["MRR at the start of quarter 2 (end of quarter 1)", pc(m2)], ["MRR at the end of quarter 2", pc(m3)]],
        a, "$", 0,
        ["Le paiement de fin de trimestre 2 utilise le MRR fixé au DÉBUT du trimestre 2 ; les deux autres MRR ne servent pas.",
          `Net = ${F(n)} × (${F(m2)} − ${F(k)}) × 0,25 = ${D(a)} reçus par le payeur fixe.`]);
    })(),
    (() => {
      const n = 10e6, k = 0.03, fw = [0.035, 0.04];
      const dfs = dfsFromForwards(fw).map(r4);
      const a = n * sum(fw.map((f, i) => (f - k) * dfs[i]));
      return q("dv-swv-m4", "moyen", "Current value of the swap to the fixed-rate payer?",
        [["Notional principal", usd(n)], ["Contract fixed rate (annual payments)", pc(k)], ["Expected MRR for years 1 / 2 (forward rates)", lst(fw.map((x) => pc(x)))],
          ["Discount factors (years 1 / 2)", lst(dfs.map((x) => E(x, 4)))]],
        a, "$", 0,
        [`Flux nets attendus : (${F(fw[0])} − ${F(k)}) × ${F(n)} = ${D((fw[0] - k) * n)} puis (${F(fw[1])} − ${F(k)}) × ${F(n)} = ${D((fw[1] - k) * n)}.`,
          `V = ${F((fw[0] - k) * n)} × ${F(dfs[0], 4)} + ${F((fw[1] - k) * n)} × ${F(dfs[1], 4)} = ${D(a, 0)}.`],
        rel(a, 0.003));
    })(),
    (() => {
      const n = 50e6, k = 0.03, s = 0.036;
      const dfs = dfsFromSpots([s, s, s, s], 2).map(r4);
      const a = ((s - k) / 2) * n * sum(dfs);
      return q("dv-swv-m5", "moyen", "Current value of the swap to the fixed-rate payer?",
        [["Notional principal", usd(n)], ["Contract fixed rate (annualized)", pc(k)], ["Current par swap rate for the remaining term (annualized)", pc(s)],
          ["Discount factors, 4 remaining semiannual dates", lst(dfs.map((x) => E(x, 4)))]],
        a, "$", 0,
        [`Écart par semestre = (${F(s)} − ${F(k)}) / 2 = ${P((s - k) / 2, 2)} ; × ${F(n)} = ${D(((s - k) / 2) * n)} par date.`,
          `Σ DF = ${F(sum(dfs), 4)} ; V = ${F(((s - k) / 2) * n)} × ${F(sum(dfs), 4)} = ${D(a, 0)}.`]);
    })(),
    (() => {
      const n = 100e6, k = 0.025, z = [0.03, 0.034];
      const dfs = dfsFromSpots(z);
      const s = parSwap(dfs);
      const a = (s - k) * n * sum(dfs);
      return q("dv-swv-d1", "difficile", "Value of the swap to the fixed-rate payer one year after initiation?",
        [["Contract", "3-year annual-pay swap, fixed rate 2.5%"], ["Notional principal", usd(n)], ["Remaining term", "2 years"],
          ["Current spot rates (years 1 / 2, annual compounding)", lst(z.map((x) => pc(x)))]],
        a, "$", 0,
        [`DF1 = ${F(dfs[0], 6)} ; DF2 = ${F(dfs[1], 6)}.`,
          `Taux de swap 2 ans actuel = (1 − ${F(dfs[1], 6)}) / ${F(sum(dfs), 6)} = ${P(s, 7)}.`,
          `V = (${P(s, 7)} − ${P(k)}) × ${F(n)} × ${F(sum(dfs), 6)} = ${D(a, 0)}.`],
        rel(a, 0.01));
    })(),
    (() => {
      const n = 30e6, k = 0.04, z = [0.032, 0.034, 0.036];
      const dfs = dfsFromSpots(z, 2);
      const sPer = parSwap(dfs);
      const a = (k / 2 - sPer) * n * sum(dfs);
      return q("dv-swv-d2", "difficile", "Value of the swap to the fixed-rate receiver six months after initiation?",
        [["Contract", "2-year semiannual-pay swap, fixed rate 4%"], ["Notional principal", usd(n)], ["Remaining payments", "3 (in 0.5, 1 and 1.5 years)"],
          ["Current spot rates for 0.5 / 1 / 1.5 years (annualized, semiannual compounding)", lst(z.map((x) => pc(x)))]],
        a, "$", 0,
        [`DF_i = 1 / (1 + z_i / 2)^i : ${dfs.map((x) => F(x, 6)).join(" ; ")}.`,
          `Taux de swap actuel par semestre = (1 − ${F(dfs[2], 6)}) / ${F(sum(dfs), 6)} = ${P(sPer, 7)} (soit ${P(sPer * 2, 4)} annualisé).`,
          `Le receveur fixe touche ${P(k / 2)} par semestre : V = (${P(k / 2)} − ${P(sPer, 7)}) × ${F(n)} × ${F(sum(dfs), 6)} = ${D(a, 0)}.`,
          "La valeur est un petit écart entre deux taux proches : garder au moins 4 décimales sur le taux par semestre (arrondir à 1,80 % décale le résultat d'environ 1 %)."],
        rel(a, 0.015));
    })(),
    (() => {
      const n = 25e6, k = 0.02, z = [0.025, 0.03, 0.034];
      const dfs = dfsFromSpots(z);
      const fw = [z[0], fwdZero(z[0], 1, z[1], 2), fwdZero(z[1], 2, z[2], 3)];
      const a = n * sum(fw.map((f, i) => (f - k) * dfs[i]));
      return q("dv-swv-d3", "difficile", "Value of the swap to the fixed-rate payer, using implied forward rates?",
        [["Notional principal", usd(n)], ["Contract fixed rate (annual payments, 3 years left)", pc(k)],
          ["Current spot rates (years 1 / 2 / 3, annual compounding)", lst(z.map((x) => pc(x)))]],
        a, "$", 0,
        [`Forwards implicites : f1 = ${P(fw[0], 2)} ; f2 = ${F(1 + z[1])}² / ${F(1 + z[0], 3)} − 1 = ${P(fw[1], 4)} ; f3 = ${F(1 + z[2], 3)}³ / ${F(1 + z[1])}² − 1 = ${P(fw[2], 4)}.`,
          `DF : ${dfs.map((x) => F(x, 6)).join(" ; ")}.`,
          `V = ${F(n)} × Σ (f_i − ${F(k)}) × DF_i = ${D(a, 0)}.`,
          `Contrôle : taux de swap actuel ${P(parSwap(dfs), 4)} ; (${P(parSwap(dfs), 4)} − 2 %) × ${F(n)} × ${F(sum(dfs), 6)} donne le même montant.`],
        rel(a, 0.01));
    })(),
    (() => {
      const n = 75e6, k = 0.041, m = 0.0385, mEnd = 0.043, days = 92;
      const a = n * (k - m) * (days / 360);
      return q("dv-swv-d4", "difficile", "Net payment made by the fixed-rate payer on the quarterly payment date?",
        [["Notional principal", usd(n)], ["Swap fixed rate (annualized)", pc(k, 2)], ["MRR set at the start of the period", pc(m, 2)],
          ["MRR on the payment date", pc(mEnd)], ["Days in the period", `${days} (actual/360)`]],
        a, "$", 2,
        ["Le flottant est fixé en début de période : le MRR du jour de paiement ne sert pas.",
          `Net payé = ${F(n)} × (${F(k, 4)} − ${F(m, 4)}) × ${F(days)}/360 = ${D(a, 2)}.`]);
    })(),
    (() => {
      const n = 200e6, k = 0.028, z = [0.031, 0.0315, 0.032, 0.0325, 0.033];
      const dfs = dfsFromSpots(z);
      const s = parSwap(dfs);
      const a = (k - s) * n * sum(dfs);
      return q("dv-swv-d5", "difficile", "Value of the swap to the fixed-rate receiver? (Negative if a liability.)",
        [["Notional principal", usd(n)], ["Contract fixed rate (annual payments, 5 years left)", pc(k)],
          ["Current spot rates (years 1 to 5, annual compounding)", lst(z.map((x) => pc(x)))]],
        a, "$", 0,
        [`DF : ${dfs.map((x) => F(x, 6)).join(" ; ")} ; Σ DF = ${F(sum(dfs), 6)}.`,
          `Taux de swap 5 ans actuel = (1 − ${F(dfs[4], 6)}) / ${F(sum(dfs), 6)} = ${P(s, 7)}.`,
          `Le receveur fixe touche ${P(k)} au lieu de ${P(s, 7)} : V = (${P(k)} − ${P(s, 7)}) × ${F(n)} × ${F(sum(dfs), 6)} = ${D(a, 0)}.`],
        rel(a, 0.01));
    })(),
  ],
};

/* ────────────────────────── 10 · Payoffs et profits d'options ────────────────────────── */

const OPTION_PAYOFF: CalcType = {
  key: "option-payoff",
  topic: "derivatives",
  name: "Payoff et profit d'options (long / short, call / put)",
  tier: "essentiel",
  top: true,
  source: "LM 2 · Forward Commitment and Contingent Claim Features and Instruments",
  formulas: [
    "Call : payoff = Max(0, S_T − X) ; put : payoff = Max(0, X − S_T)",
    "Profit de l'acheteur = payoff − prime ; profit du vendeur (writer) = prime − payoff",
    "Point mort : call X + prime ; put X − prime",
    "Perte max de l'acheteur = prime ; gain max d'un put acheté = X − prime ; perte d'un call vendu illimitée",
  ],
  traps: [
    "Ne pas confondre payoff (valeur à l'échéance) et profit (net de la prime).",
    "Un contrat porte en général sur 100 actions : multiplier les montants par action.",
    "Le cours au comptant à l'achat ne sert pas à calculer le profit à l'échéance.",
  ],
  questions: [
    (() => {
      const x = 50, c = 5, s = 58;
      const a = callPay(s, x) - c;
      return q("dv-opt-f1", "facile", "Profit per share to the call buyer at expiration?",
        [["Exercise price", usd(x, 2)], ["Call premium", usd(c, 2)], ["Stock price at expiration", usd(s, 2)]],
        a, "$", 2,
        [`Payoff = Max(0, ${F(s)} − ${F(x)}) = ${D(callPay(s, x))}.`, `Profit = ${F(callPay(s, x))} − ${F(c)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const x = 40, p = 2.5, s = 34;
      const a = putPay(s, x);
      return q("dv-opt-f2", "facile", "Payoff per share of the long put at expiration?",
        [["Exercise price", usd(x, 2)], ["Put premium", usd(p, 2)], ["Stock price at expiration", usd(s, 2)]],
        a, "$", 2,
        [`Payoff = Max(0, ${F(x)} − ${F(s)}) = ${D(a, 2)} (la prime n'entre pas dans le payoff).`]);
    })(),
    (() => {
      const x = 60, c = 4, s = 57;
      const a = c - callPay(s, x);
      return q("dv-opt-f3", "facile", "Profit per share to the call writer at expiration?",
        [["Exercise price", usd(x, 2)], ["Call premium received", usd(c, 2)], ["Stock price at expiration", usd(s, 2)]],
        a, "$", 2,
        [`S_T < X : le call expire sans valeur, payoff = 0.`, `Profit du vendeur = ${F(c)} − 0 = ${D(a, 2)} (son gain maximal).`]);
    })(),
    (() => {
      const x = 45, p = 3.2;
      const a = x - p;
      return q("dv-opt-f4", "facile", "Breakeven stock price at expiration for the put buyer?",
        [["Exercise price", usd(x, 2)], ["Put premium", usd(p, 2)]],
        a, "$", 2,
        [`Point mort du put = X − prime = ${F(x)} − ${F(p, 2)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const x = 55, p = 2.4, s = 50;
      const a = p - putPay(s, x);
      return q("dv-opt-f5", "facile", "Profit per share to the put writer at expiration? (Negative if a loss.)",
        [["Exercise price", usd(x, 2)], ["Put premium received", usd(p, 2)], ["Stock price at expiration", usd(s, 2)]],
        a, "$", 2,
        [`Payoff du put = Max(0, ${F(x)} − ${F(s)}) = ${D(putPay(s, x))}, payé par le vendeur.`,
          `Profit = ${F(p, 2)} − ${F(putPay(s, x))} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const n = 10, x = 75, c = 3.1, s = 81;
      const per = callPay(s, x) - c;
      const a = per * n * 100;
      return q("dv-opt-m1", "moyen", "Total profit on the long call position at expiration?",
        [["Position", "Long 10 call contracts (100 shares each)"], ["Exercise price", usd(x, 2)], ["Premium per share", usd(c, 2)], ["Stock price at expiration", usd(s, 2)]],
        a, "$", 0,
        [`Par action : payoff = ${F(s)} − ${F(x)} = ${D(callPay(s, x))} ; profit = ${F(callPay(s, x))} − ${F(c, 2)} = ${D(per, 2)}.`,
          `${F(n)} contrats × 100 actions = ${F(n * 100)} actions : profit = ${D(a)}.`]);
    })(),
    (() => {
      const x = 30, p = 1.8;
      const a = x - p;
      return q("dv-opt-m2", "moyen", "Maximum profit per share for the put buyer?",
        [["Exercise price", usd(x, 2)], ["Put premium", usd(p, 2)], ["Current stock price", usd(31.5, 2)]],
        a, "$", 2,
        ["Le gain maximal est atteint si l'action tombe à zéro : payoff = X.",
          `Profit max = ${F(x)} − ${F(p, 2)} = ${D(a, 2)} (le cours actuel ne sert pas).`]);
    })(),
    (() => {
      const n = 5, x = 120, c = 6.5, s = 131;
      const per = c - callPay(s, x);
      const a = per * n * 100;
      return q("dv-opt-m3", "moyen", "Total profit on the short call position at expiration? (Negative if a loss.)",
        [["Position", "Short 5 call contracts (100 shares each)"], ["Exercise price", usd(x, 2)], ["Premium received per share", usd(c, 2)],
          ["Stock price at expiration", usd(s, 2)]],
        a, "$", 0,
        [`Payoff du call = ${F(s)} − ${F(x)} = ${D(callPay(s, x))}, à la charge du vendeur.`,
          `Par action : ${F(c, 2)} − ${F(callPay(s, x))} = ${D(per, 2)} ; × ${F(n * 100)} actions = ${D(a)}.`]);
    })(),
    (() => {
      const x = 50, c = 2, loss = 3;
      const a = x + c + loss;
      return q("dv-opt-m4", "moyen", "Stock price at expiration at which the call writer loses $3 per share?",
        [["Exercise price", usd(x, 2)], ["Call premium received", usd(c, 2)], ["Target loss per share", usd(loss, 2)]],
        a, "$", 2,
        ["Profit du vendeur = prime − (S_T − X) = −3.",
          `${F(c)} − (S_T − ${F(x)}) = −${F(loss)}, donc S_T = ${F(x)} + ${F(c)} + ${F(loss)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const n = 20, x = 25, p = 0.9, s = 27.4;
      const a = (putPay(s, x) - p) * n * 100;
      return q("dv-opt-m5", "moyen", "Total profit on the long put position at expiration? (Negative if a loss.)",
        [["Position", "Long 20 put contracts (100 shares each)"], ["Exercise price", usd(x, 2)], ["Premium per share", usd(p, 2)], ["Stock price at expiration", usd(s, 2)]],
        a, "$", 0,
        [`S_T > X : le put expire sans valeur, l'acheteur perd la prime.`,
          `Profit = −${F(p, 2)} × ${F(n * 100)} actions = ${D(a)}.`]);
    })(),
    (() => {
      const x = 65, c = 4.2, p = 1.35, s0 = 66, s = 59.5;
      const a = p - putPay(s, x);
      return q("dv-opt-d1", "difficile", "Profit per share to the put writer at expiration? (Negative if a loss.)",
        [["Exercise price (call and put)", usd(x, 2)], ["Call premium", usd(c, 2)], ["Put premium", usd(p, 2)],
          ["Stock price when the options were written", usd(s0, 2)], ["Stock price at expiration", usd(s, 2)]],
        a, "$", 2,
        ["Seuls X, la prime du put et S_T servent ; la prime du call et le cours initial sont à écarter.",
          `Payoff du put = ${F(x)} − ${F(s, 2)} = ${D(putPay(s, x), 2)}.`,
          `Profit du vendeur = ${F(p, 2)} − ${F(putPay(s, x), 2)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const x = 50, c = 4, target = 0.2;
      const a = x + c * (1 + target);
      return q("dv-opt-d2", "difficile", "Stock price at expiration the call buyer needs to earn a 20% return on the premium?",
        [["Exercise price", usd(x, 2)], ["Call premium", usd(c, 2)], ["Target return on premium", pc(target)]],
        a, "$", 2,
        [`Profit visé = 20 % × ${D(c)} = ${D(c * target, 2)} ; payoff nécessaire = ${F(c)} + ${F(c * target, 2)} = ${D(c * (1 + target), 2)}.`,
          `S_T − ${F(x)} = ${F(c * (1 + target), 2)}, donc S_T = ${D(a, 2)}.`]);
    })(),
    (() => {
      const nc = 3, xc = 80, c = 2.5, np = 2, xp = 75, p = 1.8, s = 72;
      const calls = (callPay(s, xc) - c) * nc * 100;
      const puts = (p - putPay(s, xp)) * np * 100;
      const a = calls + puts;
      return q("dv-opt-d3", "difficile", "Total profit on the combined option position at expiration? (Negative if a loss.)",
        [["Long 3 call contracts", `X = ${usd(xc)}, premium ${usd(c, 2)}`], ["Short 2 put contracts", `X = ${usd(xp)}, premium ${usd(p, 2)}`],
          ["Shares per contract", "100"], ["Stock price at expiration", usd(s, 2)]],
        a, "$", 0,
        [`Calls : S_T < ${F(xc)}, payoff 0 → profit = −${F(c, 2)} × 300 = ${D(calls)}.`,
          `Puts vendus : payoff = ${F(xp)} − ${F(s)} = ${D(putPay(s, xp))} → profit = (${F(p, 2)} − ${F(putPay(s, xp))}) × 200 = ${D(puts)}.`,
          `Total = ${D(calls)} ${puts < 0 ? MINUS : "+"} ${D(Math.abs(puts))} = ${D(a)}.`]);
    })(),
    (() => {
      const n = 4, x = 35, p = 2.1;
      const a = (x - p) * n * 100;
      return q("dv-opt-d4", "difficile", "Maximum possible loss on the short put position?",
        [["Position", "Short 4 put contracts (100 shares each)"], ["Exercise price", usd(x, 2)], ["Premium received per share", usd(p, 2)]],
        a, "$", 0,
        ["Pire cas : l'action tombe à zéro, le vendeur paie X par action.",
          `Perte max par action = ${F(x)} − ${F(p, 2)} = ${D(x - p, 2)} ; × 400 actions = ${D(a)}.`]);
    })(),
    (() => {
      const x = 50, c = 4, p = 2.5;
      const a = x + c - p;
      return q("dv-opt-d5", "difficile", "Stock price at expiration at which a long call and a long put (same strike) have equal profits?",
        [["Exercise price (both options)", usd(x, 2)], ["Call premium", usd(c, 2)], ["Put premium", usd(p, 2)]],
        a, "$", 2,
        [`Au-dessus de X, le put vaut 0 : son profit est −${F(p, 2)} ; le call rapporte S_T − ${F(x)} − ${F(c)}.`,
          `Égalité : S_T − ${F(x)} − ${F(c)} = −${F(p, 2)}, soit S_T = ${F(x)} + ${F(c)} − ${F(p, 2)} = ${D(a, 2)} (bien > X).`,
          `Contrôle : profit du call = ${F(a - x - c, 2)}, profit du put = ${F(-p, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 11 · Valeur intrinsèque, valeur temps, bornes ────────────────────────── */

const OPTION_BOUNDS: CalcType = {
  key: "option-value-bounds",
  topic: "derivatives",
  name: "Valeur intrinsèque, valeur temps et bornes d'options",
  tier: "essentiel",
  source: "LM 8 · Pricing and Valuation of Options",
  formulas: [
    "Valeur d'exercice (intrinsèque) : call Max(0, S − X) ; put Max(0, X − S)",
    "Valeur temps = prime − valeur d'exercice (nulle à l'échéance)",
    "Call européen : Max[0, S − X / (1 + Rf)^T] ≤ c ≤ S",
    "Put européen : Max[0, X / (1 + Rf)^T − S] ≤ p ≤ X / (1 + Rf)^T",
  ],
  traps: [
    "Une option hors de la monnaie n'a que de la valeur temps.",
    "La borne haute du put européen est X ACTUALISÉ, pas X.",
    "En cours de vie, actualiser X sur la durée restante (T − t).",
  ],
  questions: [
    (() => {
      const x = 40, s = 37;
      const a = putPay(s, x);
      return q("dv-obd-f1", "facile", "Exercise (intrinsic) value of the put?",
        [["Exercise price", usd(x, 2)], ["Current stock price", usd(s, 2)]],
        a, "$", 2,
        [`Put dans la monnaie : X − S = ${F(x)} − ${F(s)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const c = 6.2, s = 54, x = 50;
      const a = c - callPay(s, x);
      return q("dv-obd-f2", "facile", "Time value of the call?",
        [["Call premium", usd(c, 2)], ["Current stock price", usd(s, 2)], ["Exercise price", usd(x, 2)]],
        a, "$", 2,
        [`Valeur d'exercice = ${F(s)} − ${F(x)} = ${D(callPay(s, x))}.`, `Valeur temps = ${F(c, 2)} − ${F(callPay(s, x))} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const x = 60, r = 0.04, t = 1;
      const a = x * disc(r, t);
      return q("dv-obd-f3", "facile", "Upper bound on the value of the European put?",
        [["Exercise price", usd(x, 2)], ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", "1 year"]],
        a, "$", 2,
        [`Borne haute = X / (1 + Rf)^T = ${F(x)} / ${F(1 + r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const p = 1.1, s = 52, x = 50;
      const a = p - putPay(s, x);
      return q("dv-obd-f4", "facile", "Time value of the put?",
        [["Put premium", usd(p, 2)], ["Current stock price", usd(s, 2)], ["Exercise price", usd(x, 2)]],
        a, "$", 2,
        [`S > X : le put est hors de la monnaie, valeur d'exercice = 0.`, `Valeur temps = toute la prime = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s = 55, x = 50, r = 0.05, t = 1;
      const a = Math.max(0, s - x * disc(r, t));
      return q("dv-obd-f5", "facile", "Lower bound on the value of the European call?",
        [["Current stock price", usd(s, 2)], ["Exercise price", usd(x, 2)], ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", "1 year"]],
        a, "$", 2,
        [`Borne basse = Max[0, S − X / (1 + Rf)^T] = ${F(s)} − ${F(x)} / ${F(1 + r)} = ${F(s)} − ${F(x * disc(r, t), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s = 42, x = 50, r = 0.04, t = 0.5;
      const a = Math.max(0, x * disc(r, t) - s);
      return q("dv-obd-m1", "moyen", "Lower bound on the value of the 6-month European put?",
        [["Current stock price", usd(s, 2)], ["Exercise price", usd(x, 2)], ["Risk-free rate (annual compounding)", pc(r)]],
        a, "$", 2,
        [`PV(X) = ${F(x)} / ${pw(r, t)} = ${F(x * disc(r, t), 4)}.`, `Borne basse = ${F(x * disc(r, t), 4)} − ${F(s)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s = 64, x = 60, r = 0.05, t = 0.75;
      const a = Math.max(0, s - x * disc(r, t));
      return q("dv-obd-m2", "moyen", "Minimum value of the 9-month European call?",
        [["Current stock price", usd(s, 2)], ["Exercise price", usd(x, 2)], ["Risk-free rate (annual compounding)", pc(r)]],
        a, "$", 2,
        [`PV(X) = ${F(x)} / ${pw(r, t)} = ${F(x * disc(r, t), 4)}.`,
          `Borne basse = ${F(s)} − ${F(x * disc(r, t), 4)} = ${D(a, 2)}, au-dessus de la valeur d'exercice (${D(s - x)}).`]);
    })(),
    (() => {
      const s = 48, x = 50, r = 0.06, t = 1;
      const raw = x * disc(r, t) - s;
      const a = Math.max(0, raw);
      return q("dv-obd-m3", "moyen", "Lower bound on the value of the European put?",
        [["Current stock price", usd(s, 2)], ["Exercise price", usd(x, 2)], ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", "1 year"]],
        a, "$", 2,
        [`PV(X) = ${F(x)} / ${F(1 + r)} = ${F(x * disc(r, t), 4)}.`,
          `PV(X) − S = ${F(raw, 4)} < 0, donc la borne basse est Max(0 ; ${F(raw, 4)}) = ${D(a, 2)}.`,
          "Piège : le put est dans la monnaie (X > S) mais sa borne basse européenne est nulle."]);
    })(),
    (() => {
      const c = 3.4, p = 1.2, s = 47.5, x = 45;
      const tvC = c - callPay(s, x), tvP = p - putPay(s, x);
      const a = tvC + tvP;
      return q("dv-obd-m4", "moyen", "Total time value of the call and the put?",
        [["Call premium", usd(c, 2)], ["Put premium", usd(p, 2)], ["Current stock price", usd(s, 2)], ["Exercise price (both options)", usd(x, 2)]],
        a, "$", 2,
        [`Call : valeur d'exercice ${D(callPay(s, x), 2)} → valeur temps ${F(c, 2)} − ${F(callPay(s, x), 2)} = ${D(tvC, 2)}.`,
          `Put hors de la monnaie : valeur temps = prime = ${D(tvP, 2)}.`,
          `Total = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s = 70, x = 65, r = 0.05, t = 1, c = 6;
      const lb = s - x * disc(r, t);
      const a = lb - c;
      return q("dv-obd-m5", "moyen", "Immediate arbitrage profit per call if the call trades below its lower bound?",
        [["European call price", usd(c, 2)], ["Current stock price", usd(s, 2)], ["Exercise price", usd(x, 2)],
          ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", "1 year"]],
        a, "$", 2,
        [`Borne basse = ${F(s)} − ${F(x)} / ${F(1 + r)} = ${F(s)} − ${F(x * disc(r, t), 4)} = ${D(lb, 4)} > ${D(c, 2)}.`,
          `Acheter le call, vendre l'action, placer PV(X) : encaissement immédiat = ${F(s)} − ${F(c)} − ${F(x * disc(r, t), 4)} = ${D(a, 2)}.`,
          "À l'échéance, la position ne peut pas perdre."]);
    })(),
    (() => {
      const x = 80, st = 72, r = 0.045, tau = 8 / 12;
      const a = Math.max(0, x * disc(r, tau) - st);
      return q("dv-obd-d1", "difficile", "Lower bound on the value of the European put today?",
        [["Option", "1-year European put bought 4 months ago"], ["Exercise price", usd(x, 2)], ["Current stock price", usd(st, 2)],
          ["Risk-free rate (annual compounding)", pc(r)]],
        a, "$", 2,
        [`Durée restante = 12 − 4 = 8 mois = 8/12 an.`,
          `PV(X) = ${F(x)} / ${F(1 + r, 3)}^(8/12) = ${F(x * disc(r, tau), 4)}.`,
          `Borne basse = ${F(x * disc(r, tau), 4)} − ${F(st)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const x = 120, r = 0.03, tau = 1.5;
      const a = x * disc(r, tau);
      return q("dv-obd-d2", "difficile", "Upper bound on the value of the European put today?",
        [["Option", "2-year European put bought 6 months ago"], ["Exercise price", usd(x, 2)], ["Current stock price", usd(95, 2)],
          ["Risk-free rate (annual compounding)", pc(r)]],
        a, "$", 2,
        ["La borne haute ne dépend pas du cours de l'action (donnée à écarter).",
          `Durée restante = 1,5 an : borne haute = ${F(x)} / ${pw(r, tau)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const x = 60, r = 0.05, t = 1, p = 58;
      const ub = x * disc(r, t);
      const a = p - ub;
      return q("dv-obd-d3", "difficile", "Immediate arbitrage profit per put if the put trades above its upper bound?",
        [["European put price", usd(p, 2)], ["Exercise price", usd(x, 2)], ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", "1 year"]],
        a, "$", 2,
        [`Borne haute = ${F(x)} / ${F(1 + r)} = ${D(ub, 4)} < ${D(p, 2)} : le put est trop cher.`,
          `Vendre le put et placer ${D(ub, 4)} au taux sans risque (qui vaudra ${D(x)} à l'échéance, de quoi honorer l'exercice).`,
          `Gain immédiat = ${F(p)} − ${F(ub, 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s = 52, x = 50, r = 0.05, t = 0.25;
      const a = Math.max(0, s - x * disc(r, t));
      return q("dv-obd-d4", "difficile", "Minimum value of the 3-month European call?",
        [["Current stock price", usd(s, 2)], ["Exercise price", usd(x, 2)], ["Risk-free rate (annual compounding)", pc(r)],
          ["Put price (same strike and expiration)", usd(1.5, 2)], ["Volatility of the stock", "30%"]],
        a, "$", 2,
        ["La borne basse ne dépend ni du put ni de la volatilité (données à écarter).",
          `PV(X) = ${F(x)} / ${pw(r, t)} = ${F(x * disc(r, t), 4)}.`,
          `Borne basse = ${F(s)} − ${F(x * disc(r, t), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const p = 4.6, x = 70, s = 66.8;
      const per = p - putPay(s, x);
      const a = per * 100;
      return q("dv-obd-d5", "difficile", "Time value of one put contract (100 shares)?",
        [["Put premium per share", usd(p, 2)], ["Exercise price", usd(x, 2)], ["Current stock price", usd(s, 2)]],
        a, "$", 0,
        [`Valeur d'exercice = ${F(x)} − ${F(s, 2)} = ${D(putPay(s, x), 2)} par action.`,
          `Valeur temps = ${F(p, 2)} − ${F(putPay(s, x), 2)} = ${D(per, 2)} par action ; × 100 = ${D(a)}.`]);
    })(),
  ],
};

/* ────────────────────────── 12 · Parité put-call ────────────────────────── */

const PUT_CALL_PARITY: CalcType = {
  key: "put-call-parity",
  topic: "derivatives",
  name: "Parité put-call (put–call parity)",
  tier: "essentiel",
  top: true,
  source: "LM 9 · Option Replication Using Put–Call Parity",
  formulas: [
    "S0 + p0 = c0 + X / (1 + Rf)^T (protective put = fiduciary call)",
    "c0 = S0 + p0 − X / (1 + Rf)^T ; p0 = c0 − S0 + X / (1 + Rf)^T",
    "Synthétiques : action = c − p + X / (1 + Rf)^T ; obligation sans risque = S + p − c",
    "Actions = call sur la valeur de la firme (X = dette) ; dette = obligation sans risque − put",
  ],
  traps: [
    "Options européennes de même sous-jacent, même prix d'exercice et même échéance.",
    "On actualise X, pas le cours de l'action.",
    "Option trop chère par rapport à la parité : la vendre et acheter son équivalent synthétique.",
  ],
  questions: [
    (() => {
      const s = 45, x = 45, p = 2.1, r = 0.04, t = 0.5;
      const a = pcpCall(s, p, x, r, t);
      return q("dv-pcp-f1", "facile", "Price of the 6-month European call implied by put–call parity?",
        [["Stock price", usd(s, 2)], ["Exercise price", usd(x, 2)], ["Put price", usd(p, 2)], ["Risk-free rate (annual compounding)", pc(r)]],
        a, "$", 2,
        [`PV(X) = ${F(x)} / ${pw(r, t)} = ${F(x * disc(r, t), 4)}.`,
          `c = S + p − PV(X) = ${F(s)} + ${F(p, 2)} − ${F(x * disc(r, t), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s = 60, x = 55, c = 7.8, r = 0.03, t = 1;
      const a = pcpPut(s, c, x, r, t);
      return q("dv-pcp-f2", "facile", "Price of the 1-year European put implied by put–call parity?",
        [["Stock price", usd(s, 2)], ["Exercise price", usd(x, 2)], ["Call price", usd(c, 2)], ["Risk-free rate (annual compounding)", pc(r)]],
        a, "$", 2,
        [`PV(X) = ${F(x)} / ${F(1 + r)} = ${F(x * disc(r, t), 4)}.`,
          `p = c − S + PV(X) = ${F(c, 2)} − ${F(s)} + ${F(x * disc(r, t), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const c = 5.2, x = 50, r = 0.04, t = 1;
      const a = c + x * disc(r, t);
      return q("dv-pcp-f3", "facile", "Value today of the fiduciary call?",
        [["Call price", usd(c, 2)], ["Exercise price (= face value of the zero-coupon bond)", usd(x, 2)],
          ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", "1 year"]],
        a, "$", 2,
        ["Fiduciary call = call + obligation zéro-coupon qui paie X à l'échéance.",
          `= ${F(c, 2)} + ${F(x)} / ${F(1 + r)} = ${F(c, 2)} + ${F(x * disc(r, t), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const x = 45, st = 41;
      const a = st + putPay(st, x);
      return q("dv-pcp-f4", "facile", "Payoff at expiration of the protective put (one share plus one put)?",
        [["Exercise price", usd(x, 2)], ["Stock price at expiration", usd(st, 2)]],
        a, "$", 2,
        [`Action = ${D(st)} ; put = Max(0, ${F(x)} − ${F(st)}) = ${D(putPay(st, x))}.`,
          `Protective put = ${D(a, 2)}, soit X : le put garantit le plancher.`]);
    })(),
    (() => {
      const s = 70, p = 3, c = 6.5;
      const a = s + p - c;
      return q("dv-pcp-f5", "facile", "Value of the synthetic risk-free bond built from the stock and the options?",
        [["Stock price", usd(s, 2)], ["Put price", usd(p, 2)], ["Call price", usd(c, 2)], ["Options", "European, same strike and expiration"]],
        a, "$", 2,
        ["Obligation synthétique = S + p − c (long action, long put, short call).",
          `= ${F(s)} + ${F(p)} − ${F(c, 2)} = ${D(a, 2)}, valeur actuelle de X.`]);
    })(),
    (() => {
      const c = 5.4, p = 3.1, x = 100, r = 0.04, t = 0.5;
      const a = c - p + x * disc(r, t);
      return q("dv-pcp-m1", "moyen", "Value of the synthetic stock position?",
        [["Call price", usd(c, 2)], ["Put price", usd(p, 2)], ["Exercise price", usd(x, 2)], ["Risk-free rate (annual compounding)", pc(r)],
          ["Time to expiration", months(6)]],
        a, "$", 2,
        ["Action synthétique = long call + short put + obligation qui paie X.",
          `PV(X) = ${F(x)} / ${pw(r, t)} = ${F(x * disc(r, t), 4)}.`,
          `S = ${F(c, 2)} − ${F(p, 2)} + ${F(x * disc(r, t), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s = 50, x = 50, c = 3.2, p = 2;
      const pvx = s + p - c;
      const a = (x / pvx - 1) * 100;
      return q("dv-pcp-m2", "moyen", "Risk-free rate implied by put–call parity?",
        [["Stock price", usd(s, 2)], ["Exercise price", usd(x, 2)], ["Call price", usd(c, 2)], ["Put price", usd(p, 2)], ["Time to expiration", "1 year"]],
        a, "%", 2,
        [`PV(X) = S + p − c = ${F(s)} + ${F(p)} − ${F(c, 2)} = ${D(pvx, 2)}.`,
          `${F(x)} / (1 + Rf) = ${F(pvx, 2)}, donc Rf = ${F(x)} / ${F(pvx, 2)} − 1 = ${Pa(a)}.`]);
    })(),
    (() => {
      const s = 52, x = 50, r = 0.05, t = 0.25, p = 1.5, cm = 4.6;
      const cth = pcpCall(s, p, x, r, t);
      const a = cm - cth;
      return q("dv-pcp-m3", "moyen", "Arbitrage profit per share today from the call mispricing?",
        [["Stock price", usd(s, 2)], ["Exercise price", usd(x, 2)], ["Put price", usd(p, 2)], ["Market price of the call", usd(cm, 2)],
          ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", months(3)]],
        a, "$", 2,
        [`Call de parité = ${F(s)} + ${F(p, 2)} − ${F(x)} / ${pw(r, t)} = ${F(s + p)} − ${F(x * disc(r, t), 4)} = ${D(cth, 4)}.`,
          `Le call coté (${D(cm, 2)}) est trop cher : le vendre et acheter le call synthétique (action + put − emprunt de PV(X)).`,
          `Gain immédiat = ${F(cm, 2)} − ${F(cth, 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s = 85, x = 90, p = 7.2, r = 0.045, t = 0.75;
      const a = pcpCall(s, p, x, r, t);
      return q("dv-pcp-m4", "moyen", "Price of the 9-month European call implied by put–call parity?",
        [["Stock price", usd(s, 2)], ["Exercise price", usd(x, 2)], ["Put price", usd(p, 2)], ["Risk-free rate (annual compounding)", pc(r)]],
        a, "$", 2,
        [`PV(X) = ${F(x)} / ${pw(r, t)} = ${F(x * disc(r, t), 4)}.`,
          `c = ${F(s)} + ${F(p, 2)} − ${F(x * disc(r, t), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const c = 6, p = 2, x = 40, r = 0.05, t = 1;
      const a = c - p + x * disc(r, t);
      return q("dv-pcp-m5", "moyen", "Stock price consistent with put–call parity?",
        [["Call price", usd(c, 2)], ["Put price", usd(p, 2)], ["Exercise price", usd(x, 2)], ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", "1 year"]],
        a, "$", 2,
        ["S = c − p + X / (1 + Rf)^T.",
          `= ${F(c)} − ${F(p)} + ${F(x)} / ${F(1 + r)} = ${F(c - p)} + ${F(x * disc(r, t), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s = 30, x = 30, r = 0.06, t = 0.5, c = 2.1, pm = 1.6;
      const pth = pcpPut(s, c, x, r, t);
      const a = pm - pth;
      return q("dv-pcp-d1", "difficile", "Arbitrage profit per share today from the put mispricing?",
        [["Stock price", usd(s, 2)], ["Exercise price", usd(x, 2)], ["Call price", usd(c, 2)], ["Market price of the put", usd(pm, 2)],
          ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", months(6)]],
        a, "$", 2,
        [`Put de parité = c − S + PV(X) = ${F(c, 2)} − ${F(s)} + ${F(x)} / ${pw(r, t)} = ${F(c - s, 2)} + ${F(x * disc(r, t), 4)} = ${D(pth, 4)}.`,
          `Le put coté (${D(pm, 2)}) est trop cher : vendre le put, acheter le put synthétique (call + vente à découvert de l'action + placement de PV(X)).`,
          `Gain immédiat = ${F(pm, 2)} − ${F(pth, 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const d = 80, r = 0.04, t = 2, put = 3.5;
      const a = d * disc(r, t) - put;
      return q("dv-pcp-d2", "difficile", "Market value of the firm's debt, in $ millions?",
        [["Debt", "Zero-coupon, face value $80 million, due in 2 years"], ["Risk-free rate (annual compounding)", pc(r)],
          ["Value of a 2-year European put on the firm's assets, strike $80 million ($ millions)", E(put, 1)], ["Current value of the firm's assets ($ millions)", E(110)]],
        a, "$", 2,
        ["Créanciers = obligation sans risque qui paie D, moins un put vendu sur la valeur de la firme (au défaut, ils ne touchent que V_T).",
          `Obligation sans risque = ${F(d)} / ${F(1 + r)}² = ${F(d * disc(r, t), 4)} M$.`,
          `Dette = ${F(d * disc(r, t), 4)} − ${F(put)} = ${F(a, 2)} M$.`]);
    })(),
    (() => {
      const v = 150, d = 100, r = 0.05, t = 3, put = 6;
      const a = v + put - d * disc(r, t);
      return q("dv-pcp-d3", "difficile", "Market value of the firm's equity, in $ millions?",
        [["Current value of the firm's assets ($ millions)", E(v)], ["Debt", "Zero-coupon, face value $100 million, due in 3 years"],
          ["Risk-free rate (annual compounding)", pc(r)], ["Value of a 3-year European put on the firm's assets, strike $100 million ($ millions)", E(put)]],
        a, "$", 2,
        ["Actionnaires = call sur la valeur de la firme, de prix d'exercice D : par la parité, c = V + p − PV(D).",
          `PV(D) = ${F(d)} / ${F(1 + r)}³ = ${F(d * disc(r, t), 4)} M$.`,
          `Actions = ${F(v)} + ${F(put)} − ${F(d * disc(r, t), 4)} = ${F(a, 2)} M$.`]);
    })(),
    (() => {
      const s = 102, x = 100, c = 5.8, r = 0.042, days = 73;
      const t = days / 365;
      const a = pcpPut(s, c, x, r, t);
      return q("dv-pcp-d4", "difficile", "Price of the European put implied by put–call parity?",
        [["Stock price", usd(s, 2)], ["Exercise price", usd(x, 2)], ["Call price", usd(c, 2)], ["Risk-free rate (annual compounding)", pc(r, 1)],
          ["Days to expiration", `${days} (365-day year)`]],
        a, "$", 2,
        [`T = ${F(days)} / 365 = ${F(t, 4)} an ; PV(X) = ${F(x)} / ${F(1 + r, 3)}^${F(t, 2)} = ${F(x * disc(r, t), 4)}.`,
          `p = ${F(c, 2)} − ${F(s)} + ${F(x * disc(r, t), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s = 75, x = 70, r = 0.05, t = 1, p = 2.4, cm = 8.1, n = 10;
      const cth = pcpCall(s, p, x, r, t);
      const a = (cth - cm) * n * 100;
      return q("dv-pcp-d5", "difficile", "Total arbitrage profit today on 10 call contracts (100 shares each)?",
        [["Stock price", usd(s, 2)], ["Exercise price", usd(x, 2)], ["Put price", usd(p, 2)], ["Market price of the call", usd(cm, 2)],
          ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", "1 year"]],
        a, "$", 0,
        [`Call de parité = ${F(s)} + ${F(p, 2)} − ${F(x)} / ${F(1 + r)} = ${F(s + p, 2)} − ${F(x * disc(r, t), 4)} = ${D(cth, 4)}.`,
          `Le call coté (${D(cm, 2)}) est trop bon marché : l'acheter et vendre le call synthétique (vendre l'action et le put, placer PV(X)).`,
          `Gain = (${F(cth, 4)} − ${F(cm, 2)}) × 1 000 = ${D(a, 0)}.`],
        rel(a, 0.005));
    })(),
  ],
};

/* ────────────────────────── 13 · Parité put-call-forward ────────────────────────── */

const PUT_CALL_FORWARD: CalcType = {
  key: "put-call-forward-parity",
  topic: "derivatives",
  name: "Parité put-call-forward",
  tier: "annexe",
  source: "LM 9 · Option Replication Using Put–Call Parity",
  formulas: [
    "F0(T) / (1 + Rf)^T + p0 = c0 + X / (1 + Rf)^T",
    "c0 − p0 = (F0(T) − X) / (1 + Rf)^T",
    "F0(T) = [S0 + PV(coûts) − PV(revenus)] × (1 + Rf)^T",
  ],
  traps: [
    "Si X = F0(T), le call et le put européens ont la même valeur.",
    "F0 et X s'actualisent tous deux au taux sans risque sur la même durée.",
  ],
  questions: [
    (() => {
      const f = 105, x = 100, r = 0.05, t = 1, p = 3;
      const a = p + (f - x) * disc(r, t);
      return q("dv-pcf-f1", "facile", "Price of the European call implied by put–call–forward parity?",
        [["Forward price of the underlying", usd(f, 2)], ["Exercise price", usd(x, 2)], ["Put price", usd(p, 2)],
          ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", "1 year"]],
        a, "$", 2,
        ["c = p + (F0 − X) / (1 + Rf)^T.",
          `= ${F(p)} + (${F(f)} − ${F(x)}) / ${F(1 + r)} = ${F(p)} + ${F((f - x) * disc(r, t), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const f = 52, x = 50, r = 0.04, t = 0.5;
      const a = (f - x) * disc(r, t);
      return q("dv-pcf-f2", "facile", "Difference between the call price and the put price (c − p)?",
        [["Forward price", usd(f, 2)], ["Exercise price (call and put)", usd(x, 2)], ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", months(6)]],
        a, "$", 2,
        [`c − p = (${F(f)} − ${F(x)}) / ${pw(r, t)} = ${F(f - x)} / ${F(grow(r, t), 6)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const f = 98, x = 100, c = 4.1, r = 0.03, t = 1;
      const a = c - (f - x) * disc(r, t);
      return q("dv-pcf-f3", "facile", "Price of the European put implied by put–call–forward parity?",
        [["Forward price", usd(f, 2)], ["Exercise price", usd(x, 2)], ["Call price", usd(c, 2)], ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", "1 year"]],
        a, "$", 2,
        ["p = c − (F0 − X) / (1 + Rf)^T.",
          `= ${F(c, 2)} − (${F(f)} − ${F(x)}) / ${F(1 + r)} = ${F(c, 2)} + ${F((x - f) * disc(r, t), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const c = 6.2, p = 4.5, x = 80, r = 0.05, t = 1;
      const a = x + (c - p) * grow(r, t);
      return q("dv-pcf-f4", "facile", "Forward price implied by the option prices?",
        [["Call price", usd(c, 2)], ["Put price", usd(p, 2)], ["Exercise price", usd(x, 2)], ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", "1 year"]],
        a, "$", 2,
        ["(F0 − X) = (c − p) × (1 + Rf)^T.",
          `F0 = ${F(x)} + (${F(c, 2)} − ${F(p, 2)}) × ${F(1 + r)} = ${F(x)} + ${F((c - p) * grow(r, t), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const f = 1250, x = 1200, r = 0.02, t = 0.25, p = 18;
      const a = p + (f - x) * disc(r, t);
      return q("dv-pcf-f5", "facile", "Price of the European index call implied by put–call–forward parity, in index points?",
        [["Index forward price", E(f)], ["Exercise price", E(x)], ["Put price (index points)", E(p)], ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", months(3)]],
        a, "", 2,
        [`(F0 − X) actualisé = ${F(f - x)} / ${pw(r, t)} = ${F((f - x) * disc(r, t), 4)}.`, `c = ${F(p)} + ${F((f - x) * disc(r, t), 4)} = ${F(a, 2)} points.`]);
    })(),
    (() => {
      const s = 50, r = 0.04, t = 1, x = 50, p = 2.6;
      const f = fwdPrice(s, r, t);
      const a = p + (f - x) * disc(r, t);
      return q("dv-pcf-m1", "moyen", "Price of the European call using put–call–forward parity?",
        [["Spot price (no dividends)", usd(s, 2)], ["Exercise price", usd(x, 2)], ["Put price", usd(p, 2)], ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", "1 year"]],
        a, "$", 2,
        [`Prix forward = ${F(s)} × ${F(1 + r)} = ${D(f, 2)}.`,
          `c = ${F(p, 2)} + (${F(f)} − ${F(x)}) / ${F(1 + r)} = ${F(p, 2)} + ${F((f - x) * disc(r, t), 4)} = ${D(a, 2)}.`,
          "On retrouve la parité put-call classique, puisque F0 / (1 + Rf)^T = S0."]);
    })(),
    (() => {
      const s = 80, pvd = 1.5, r = 0.05, t = 0.5, x = 80, p = 4;
      const f = fwdPrice(s, r, t, 0, pvd);
      const a = p + (f - x) * disc(r, t);
      return q("dv-pcf-m2", "moyen", "Price of the 6-month European call using put–call–forward parity?",
        [["Spot price", usd(s, 2)], ["PV of dividends before expiration", usd(pvd, 2)], ["Exercise price", usd(x, 2)], ["Put price", usd(p, 2)],
          ["Risk-free rate (annual compounding)", pc(r)]],
        a, "$", 2,
        [`F0 = (${F(s)} − ${F(pvd)}) × ${pw(r, t)} = ${D(f, 4)}.`,
          `c = ${F(p)} + (${F(f, 4)} − ${F(x)}) / ${pw(r, t)} = ${F(p)} + ${F((f - x) * disc(r, t), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const f = 110, x = 100, c = 12, p = 2.6;
      const a = ((f - x) / (c - p) - 1) * 100;
      return q("dv-pcf-m3", "moyen", "Risk-free rate implied by put–call–forward parity?",
        [["Forward price", usd(f, 2)], ["Exercise price", usd(x, 2)], ["Call price", usd(c, 2)], ["Put price", usd(p, 2)], ["Time to expiration", "1 year"]],
        a, "%", 2,
        ["c − p = (F0 − X) / (1 + Rf), donc 1 + Rf = (F0 − X) / (c − p).",
          `= ${F(f - x)} / ${F(c - p, 2)} = ${F((f - x) / (c - p), 6)}, soit Rf = ${Pa(a)}.`]);
    })(),
    (() => {
      const c = 7, p = 5.5, x = 90, r = 0.04, t = 0.75;
      const a = x + (c - p) * grow(r, t);
      return q("dv-pcf-m4", "moyen", "Forward price implied by the options (9-month expiration)?",
        [["Call price", usd(c, 2)], ["Put price", usd(p, 2)], ["Exercise price", usd(x, 2)], ["Risk-free rate (annual compounding)", pc(r)]],
        a, "$", 2,
        [`Long call + short put = forward synthétique de prix X : il vaut c − p = ${D(c - p, 2)}.`,
          `F0 = X + (c − p) × ${pw(r, t)} = ${F(x)} + ${F(c - p, 2)} × ${F(grow(r, t), 6)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const f = 105, x = 100, r = 0.05, t = 1, c = 8, p = 3;
      const th = (f - x) * disc(r, t);
      const a = c - p - th;
      return q("dv-pcf-m5", "moyen", "Arbitrage profit today per unit, by selling the call and buying the put?",
        [["Forward price", usd(f, 2)], ["Exercise price", usd(x, 2)], ["Call price", usd(c, 2)], ["Put price", usd(p, 2)],
          ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", "1 year"]],
        a, "$", 2,
        [`Parité : c − p doit valoir (${F(f)} − ${F(x)}) / ${F(1 + r)} = ${D(th, 4)} ; le marché donne ${D(c - p, 2)}.`,
          `Vendre le call et acheter le put (forward synthétique vendu à X), acheter le forward à F0 : en T, on doit F0 − X = ${D(f - x)}, couverts en plaçant ${D(th, 4)} aujourd'hui.`,
          `Gain immédiat = ${F(c - p, 2)} − ${F(th, 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s = 70, pvc = 1.2, r = 0.04, t = 1, x = 75, c = 5.6;
      const f = fwdPrice(s, r, t, pvc);
      const a = c - (f - x) * disc(r, t);
      return q("dv-pcf-d1", "difficile", "Price of the European put on the commodity?",
        [["Commodity spot price", usd(s, 2)], ["PV of storage costs until expiration", usd(pvc, 2)], ["Exercise price", usd(x, 2)], ["Call price", usd(c, 2)],
          ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", "1 year"]],
        a, "$", 2,
        [`F0 = (${F(s)} + ${F(pvc)}) × ${F(1 + r)} = ${D(f, 4)}.`,
          `p = c − (F0 − X) / (1 + Rf) = ${F(c)} − (${F(f, 4)} − ${F(x)}) / ${F(1 + r)} = ${F(c)} + ${F((x - f) * disc(r, t), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s = 4000, pvd = 40, r = 0.04, t = 0.5, x = 4000, p = 95;
      const f = fwdPrice(s, r, t, 0, pvd);
      const a = p + (f - x) * disc(r, t);
      return q("dv-pcf-d2", "difficile", "Price of the 6-month European index call, in index points?",
        [["Index level", E(s)], ["PV of dividends until expiration (index points)", E(pvd)], ["Exercise price", E(x)], ["Put price (index points)", E(p)],
          ["Risk-free rate (annual compounding)", pc(r)]],
        a, "", 2,
        [`F0 = (${F(s)} − ${F(pvd)}) × ${pw(r, t)} = ${F(f, 2)}.`,
          `c = ${F(p)} + (${F(f, 2)} − ${F(x)}) / ${pw(r, t)} = ${F(p)} + ${F((f - x) * disc(r, t), 2)} = ${F(a, 2)} points.`]);
    })(),
    (() => {
      const f = 48, x = 50, r = 0.06, t = 0.5, c = 1.9, pm = 4.1;
      const pth = c - (f - x) * disc(r, t);
      const a = pm - pth;
      return q("dv-pcf-d3", "difficile", "Arbitrage profit today per unit from the put mispricing?",
        [["Forward price", usd(f, 2)], ["Exercise price", usd(x, 2)], ["Call price", usd(c, 2)], ["Market price of the put", usd(pm, 2)],
          ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", months(6)]],
        a, "$", 2,
        [`Put de parité = c − (F0 − X) / (1 + Rf)^T = ${F(c, 2)} + ${F(x - f)} / ${pw(r, t)} = ${F(c, 2)} + ${F((x - f) * disc(r, t), 4)} = ${D(pth, 4)}.`,
          "Le put coté est trop cher : le vendre, acheter le call, vendre le forward et placer PV(X − F0).",
          `Gain immédiat = ${F(pm, 2)} − ${F(pth, 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const c = 6.1, p = 5.2, x = 100, s = 101.5, r = 0.04, t = 1;
      const f = x + (c - p) * grow(r, t);
      const a = s - f * disc(r, t);
      return q("dv-pcf-d4", "difficile", "Present value of the dividends implied by the option prices?",
        [["Stock price", usd(s, 2)], ["Call price", usd(c, 2)], ["Put price", usd(p, 2)], ["Exercise price", usd(x, 2)],
          ["Risk-free rate (annual compounding)", pc(r)], ["Time to expiration", "1 year"]],
        a, "$", 2,
        [`Forward implicite : F0 = ${F(x)} + (${F(c, 2)} − ${F(p, 2)}) × ${F(1 + r)} = ${D(f, 4)}.`,
          `F0 = (S0 − PV(div)) × (1 + Rf), donc PV(div) = S0 − F0 / (1 + Rf) = ${F(s, 2)} − ${F(f * disc(r, t), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const x = 95, f1 = 99, r = 0.05, tau = 0.5, n = 100;
      const per = (f1 - x) * disc(r, tau);
      const a = per * n;
      return q("dv-pcf-d5", "difficile", "Current value of a position long 1 call and short 1 put contract (100 shares each)?",
        [["Exercise price (call and put)", usd(x, 2)], ["Current forward price for the same expiration", usd(f1, 2)],
          ["Risk-free rate (annual compounding)", pc(r)], ["Time remaining to expiration", months(6)]],
        a, "$", 0,
        ["Long call + short put de même X = forward synthétique de prix X : c − p = (F0 − X) / (1 + Rf)^(T − t).",
          `Par action : (${F(f1)} − ${F(x)}) / ${pw(r, tau)} = ${D(per, 4)} ; × 100 = ${D(a, 0)}.`]);
    })(),
  ],
};

/* ────────────────────────── 14 · Binomial à une période : probabilité risque-neutre ────────────────────────── */

const BINOMIAL: CalcType = {
  key: "binomial-risk-neutral",
  topic: "derivatives",
  name: "Modèle binomial à une période (probabilité risque-neutre)",
  tier: "essentiel",
  top: true,
  source: "LM 10 · Valuing a Derivative Using a One-Period Binomial Model",
  formulas: [
    "u = S⁺ / S0 ; d = S⁻ / S0",
    "Probabilité risque-neutre π = (1 + Rf − d) / (u − d)",
    "Valeur = [π × payoff⁺ + (1 − π) × payoff⁻] / (1 + Rf)",
    "Payoffs : call Max(0, S − X), put Max(0, X − S), dans chaque état",
  ],
  traps: [
    "Les probabilités réelles ne servent pas : seuls u, d et Rf comptent.",
    "Rf est le taux de la PÉRIODE : convertir un taux annuel si la période dure 3 ou 6 mois.",
    "Ne pas oublier d'actualiser l'espérance risque-neutre.",
  ],
  questions: [
    (() => {
      const u = 1.2, d = 0.85, r = 0.05;
      const a = rnProb(u, d, r);
      return q("dv-bin-f1", "facile", "Risk-neutral probability of an up-move? (As a decimal, e.g. 0.45.)",
        [["Up factor (u)", E(u, 2)], ["Down factor (d)", E(d, 2)], ["Risk-free rate per period", pc(r)]],
        a, "", 4,
        [`π = (1 + Rf − d) / (u − d) = (${F(1 + r)} − ${F(d)}) / (${F(u)} − ${F(d)}) = ${F(1 + r - d)} / ${F(u - d)} = ${F(a, 4)}.`]);
    })(),
    (() => {
      const pi = 0.6, up = 8, dn = 0, r = 0.04;
      const a = binom(pi, up, dn, r);
      return q("dv-bin-f2", "facile", "Value of the call today?",
        [["Risk-neutral probability of an up-move", E(pi, 2)], ["Call payoff after an up-move", usd(up, 2)], ["Call payoff after a down-move", usd(dn, 2)],
          ["Risk-free rate per period", pc(r)]],
        a, "$", 2,
        [`Espérance risque-neutre = ${F(pi)} × ${F(up)} + ${F(1 - pi)} × 0 = ${D(pi * up, 2)}.`, `Valeur = ${F(pi * up, 2)} / ${F(1 + r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const pi = 0.55, up = 0, dn = 6, r = 0.03;
      const a = binom(pi, up, dn, r);
      return q("dv-bin-f3", "facile", "Value of the put today?",
        [["Risk-neutral probability of an up-move", E(pi, 2)], ["Put payoff after an up-move", usd(up, 2)], ["Put payoff after a down-move", usd(dn, 2)],
          ["Risk-free rate per period", pc(r)]],
        a, "$", 2,
        [`Probabilité de baisse = 1 − ${F(pi)} = ${F(1 - pi)}.`, `Valeur = ${F(1 - pi)} × ${F(dn)} / ${F(1 + r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const up = 0.1, dn = 0.1, r = 0.02;
      const a = rnProb(1 + up, 1 - dn, r);
      return q("dv-bin-f4", "facile", "Risk-neutral probability of an up-move? (As a decimal, e.g. 0.45.)",
        [["Stock move over the period", "Up 10% or down 10%"], ["Risk-free rate per period", pc(r)]],
        a, "", 4,
        [`u = ${F(1 + up)} ; d = ${F(1 - dn)}.`, `π = (${F(1 + r)} − ${F(1 - dn)}) / (${F(1 + up)} − ${F(1 - dn)}) = ${F(1 + r - (1 - dn))} / ${F(up + dn)} = ${F(a, 4)}.`]);
    })(),
    (() => {
      const pi = 0.65, sUp = 33, sDn = 27, x = 31, r = 0.03;
      const a = binom(pi, callPay(sUp, x), callPay(sDn, x), r);
      return q("dv-bin-f5", "facile", "Value of the call today?",
        [["Stock price after an up / down move", lst([usd(sUp), usd(sDn)])], ["Exercise price", usd(x, 2)], ["Risk-neutral probability of an up-move", E(pi, 2)],
          ["Risk-free rate per period", pc(r)]],
        a, "$", 2,
        [`Payoffs : Max(0, ${F(sUp)} − ${F(x)}) = ${D(callPay(sUp, x))} ; Max(0, ${F(sDn)} − ${F(x)}) = 0.`,
          `Valeur = ${F(pi)} × ${F(callPay(sUp, x))} / ${F(1 + r)} = ${D(a, 2)} (sans actualiser, on trouverait ${D(pi * callPay(sUp, x), 2)}).`]);
    })(),
    (() => {
      const s0 = 60, u = 1.2, d = 1 / 1.2, r = 0.04, x = 62;
      const sUp = s0 * u, sDn = s0 * d;
      const pi = rnProb(u, d, r);
      const a = binom(pi, callPay(sUp, x), callPay(sDn, x), r);
      return q("dv-bin-m1", "moyen", "Value of the call today?",
        [["Current stock price", usd(s0, 2)], ["Up factor (u)", E(u, 2)], ["Down factor", "d = 1 / u"], ["Exercise price", usd(x, 2)], ["Risk-free rate per period", pc(r)]],
        a, "$", 2,
        [`d = 1 / ${F(u)} = ${F(d, 4)} ; S⁺ = ${D(sUp, 2)} ; S⁻ = ${D(sDn, 2)}.`,
          `π = (${F(1 + r)} − ${F(d, 4)}) / (${F(u)} − ${F(d, 4)}) = ${F(pi, 4)}.`,
          `Payoffs : ${D(callPay(sUp, x), 2)} et 0 ; valeur = ${F(pi, 4)} × ${F(callPay(sUp, x))} / ${F(1 + r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 80, sUp = 96, sDn = 68, r = 0.05, x = 82;
      const u = sUp / s0, d = sDn / s0;
      const pi = rnProb(u, d, r);
      const a = binom(pi, putPay(sUp, x), putPay(sDn, x), r);
      return q("dv-bin-m2", "moyen", "Value of the put today?",
        [["Current stock price", usd(s0, 2)], ["Stock price after an up / down move", lst([usd(sUp), usd(sDn)])], ["Exercise price", usd(x, 2)],
          ["Risk-free rate per period", pc(r)]],
        a, "$", 2,
        [`u = ${F(sUp)} / ${F(s0)} = ${F(u)} ; d = ${F(sDn)} / ${F(s0)} = ${F(d)}.`,
          `π = (${F(1 + r)} − ${F(d)}) / (${F(u)} − ${F(d)}) = ${F(pi, 4)}.`,
          `Payoffs du put : 0 en hausse, ${F(x)} − ${F(sDn)} = ${D(putPay(sDn, x))} en baisse.`,
          `Valeur = ${F(1 - pi, 4)} × ${F(putPay(sDn, x))} / ${F(1 + r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 25, up = 0.2, dn = 0.15, r = 0.03, x = 24;
      const u = 1 + up, d = 1 - dn;
      const pi = rnProb(u, d, r);
      const a = binom(pi, callPay(s0 * u, x), callPay(s0 * d, x), r);
      return q("dv-bin-m3", "moyen", "Value of the call today?",
        [["Current stock price", usd(s0, 2)], ["Stock move over the period", "Up 20% or down 15%"], ["Exercise price", usd(x, 2)], ["Risk-free rate per period", pc(r)]],
        a, "$", 2,
        [`S⁺ = ${D(s0 * u, 2)} ; S⁻ = ${D(s0 * d, 2)} ; payoffs : ${D(callPay(s0 * u, x), 2)} et ${D(callPay(s0 * d, x), 2)}.`,
          `π = (${F(1 + r)} − ${F(d)}) / (${F(u)} − ${F(d)}) = ${F(pi, 4)}.`,
          `Valeur = ${F(pi, 4)} × ${F(callPay(s0 * u, x))} / ${F(1 + r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 100, u = 1.25, d = 0.8, r = 0.06, x = 95;
      const pi = rnProb(u, d, r);
      const a = binom(pi, putPay(s0 * u, x), putPay(s0 * d, x), r);
      return q("dv-bin-m4", "moyen", "Value of the put today?",
        [["Current stock price", usd(s0, 2)], ["Up factor / down factor", lst([E(u, 2), E(d, 2)])], ["Exercise price", usd(x, 2)], ["Risk-free rate per period", pc(r)]],
        a, "$", 2,
        [`S⁺ = ${D(s0 * u)} ; S⁻ = ${D(s0 * d)} ; payoffs du put : 0 et ${D(putPay(s0 * d, x))}.`,
          `π = (${F(1 + r)} − ${F(d)}) / (${F(u)} − ${F(d)}) = ${F(pi, 4)} ; 1 − π = ${F(1 - pi, 4)}.`,
          `Valeur = ${F(1 - pi, 4)} × ${F(putPay(s0 * d, x))} / ${F(1 + r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 40, u = 1.3, d = 0.9, r = 0.05, x = 30;
      const pi = rnProb(u, d, r);
      const cu = callPay(s0 * u, x), cd = callPay(s0 * d, x);
      const a = binom(pi, cu, cd, r);
      return q("dv-bin-m5", "moyen", "Value of the call today?",
        [["Current stock price", usd(s0, 2)], ["Up factor / down factor", lst([E(u, 2), E(d, 2)])], ["Exercise price", usd(x, 2)], ["Risk-free rate per period", pc(r)]],
        a, "$", 2,
        [`S⁺ = ${D(s0 * u)} ; S⁻ = ${D(s0 * d)} : le call est dans la monnaie dans les deux états (payoffs ${D(cu)} et ${D(cd)}).`,
          `π = (${F(1 + r)} − ${F(d)}) / (${F(u)} − ${F(d)}) = ${F(pi, 4)}.`,
          `Valeur = (${F(pi, 4)} × ${F(cu)} + ${F(1 - pi, 4)} × ${F(cd)}) / ${F(1 + r)} = ${D(a, 2)}.`,
          `Contrôle : c = S0 − X / (1 + Rf) = ${F(s0)} − ${F(x * disc(r, 1), 4)} = ${D(s0 - x * disc(r, 1), 2)}, l'option se comporte comme un forward.`]);
    })(),
    (() => {
      const s0 = 70, u = 1.15, d = 0.88, rAnn = 0.05, x = 72;
      const r = Math.sqrt(1 + rAnn) - 1;
      const pi = rnProb(u, d, r);
      const a = binom(pi, callPay(s0 * u, x), callPay(s0 * d, x), r);
      return q("dv-bin-d1", "difficile", "Value of the 6-month call today?",
        [["Current stock price", usd(s0, 2)], ["Up factor / down factor over 6 months", lst([E(u, 2), E(d, 2)])], ["Exercise price", usd(x, 2)],
          ["Risk-free rate (annual, annual compounding)", pc(rAnn)], ["Model", "One period of 6 months"]],
        a, "$", 2,
        [`Taux de la période = ${F(1 + rAnn)}^0,5 − 1 = ${P(r, 4)}.`,
          `π = (${F(1 + r, 6)} − ${F(d)}) / (${F(u)} − ${F(d)}) = ${F(pi, 4)}.`,
          `S⁺ = ${D(s0 * u, 2)} → payoff ${D(callPay(s0 * u, x), 2)} ; S⁻ = ${D(s0 * d, 2)} → 0.`,
          `Valeur = ${F(pi, 4)} × ${F(callPay(s0 * u, x), 2)} / ${F(1 + r, 6)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 45, sUp = 54, sDn = 38, real = 0.7, r = 0.04, x = 44;
      const u = sUp / s0, d = sDn / s0;
      const pi = rnProb(u, d, r);
      const a = binom(pi, putPay(sUp, x), putPay(sDn, x), r);
      return q("dv-bin-d2", "difficile", "Value of the put today?",
        [["Current stock price", usd(s0, 2)], ["Stock price after an up / down move", lst([usd(sUp), usd(sDn)])], ["Analyst's probability of an up-move", pc(real)],
          ["Exercise price", usd(x, 2)], ["Risk-free rate per period", pc(r)]],
        a, "$", 2,
        ["La probabilité de l'analyste ne sert pas : on valorise avec la probabilité risque-neutre.",
          `u = ${F(sUp)} / ${F(s0)} = ${F(u, 4)} ; d = ${F(sDn)} / ${F(s0)} = ${F(d, 4)} ; π = (${F(1 + r)} − ${F(d, 4)}) / (${F(u, 4)} − ${F(d, 4)}) = ${F(pi, 4)}.`,
          `Payoffs du put : 0 et ${D(putPay(sDn, x))}.`,
          `Valeur = ${F(1 - pi, 4)} × ${F(putPay(sDn, x))} / ${F(1 + r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 60, sUp = 72, sDn = 51, r = 0.04, x = 60, cm = 7;
      const pi = rnProb(sUp / s0, sDn / s0, r);
      const c = binom(pi, callPay(sUp, x), callPay(sDn, x), r);
      const a = cm - c;
      return q("dv-bin-d3", "difficile", "By how much does the market price of the call exceed its binomial value?",
        [["Current stock price", usd(s0, 2)], ["Stock price after an up / down move", lst([usd(sUp), usd(sDn)])], ["Exercise price", usd(x, 2)],
          ["Risk-free rate per period", pc(r)], ["Market price of the call", usd(cm, 2)]],
        a, "$", 2,
        [`u = ${F(sUp / s0)} ; d = ${F(sDn / s0)} ; π = (${F(1 + r)} − ${F(sDn / s0)}) / (${F(sUp / s0)} − ${F(sDn / s0)}) = ${F(pi, 4)}.`,
          `Valeur binomiale = ${F(pi, 4)} × ${F(callPay(sUp, x))} / ${F(1 + r)} = ${D(c, 4)}.`,
          `Écart = ${F(cm, 2)} − ${F(c, 4)} = ${D(a, 2)} : le call est trop cher, on le vend et on achète sa réplique (h actions financées par emprunt).`]);
    })(),
    (() => {
      const s0 = 48, u = 1.12, d = 0.9, rAnn = 0.06, x = 50;
      const r = Math.pow(1 + rAnn, 0.25) - 1;
      const pi = rnProb(u, d, r);
      const a = binom(pi, putPay(s0 * u, x), putPay(s0 * d, x), r);
      return q("dv-bin-d4", "difficile", "Value of the 3-month put today?",
        [["Current stock price", usd(s0, 2)], ["Up factor / down factor over 3 months", lst([E(u, 2), E(d, 2)])], ["Exercise price", usd(x, 2)],
          ["Risk-free rate (annual, annual compounding)", pc(rAnn)], ["Model", "One period of 3 months"]],
        a, "$", 2,
        [`Taux de la période = ${F(1 + rAnn)}^0,25 − 1 = ${P(r, 4)}.`,
          `S⁺ = ${D(s0 * u, 2)} → payoff 0 ; S⁻ = ${D(s0 * d, 2)} → payoff ${D(putPay(s0 * d, x), 2)}.`,
          `π = (${F(1 + r, 6)} − ${F(d)}) / (${F(u)} − ${F(d)}) = ${F(pi, 4)} ; 1 − π = ${F(1 - pi, 4)}.`,
          `Valeur = ${F(1 - pi, 4)} × ${F(putPay(s0 * d, x), 2)} / ${F(1 + r, 6)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 100, sUp = 110, sDn = 92, r = 0.03, pay = 10, real = 0.5;
      const pi = rnProb(sUp / s0, sDn / s0, r);
      const a = binom(pi, pay, 0, r);
      return q("dv-bin-d5", "difficile", "Value today of a contract that pays $10 if the stock rises and nothing otherwise?",
        [["Current stock price", usd(s0, 2)], ["Stock price after an up / down move", lst([usd(sUp), usd(sDn)])], ["Actual probability of an up-move", pc(real)],
          ["Risk-free rate per period", pc(r)]],
        a, "$", 2,
        ["Le modèle binomial valorise tout dérivé dont on connaît les payoffs dans chaque état.",
          `π = (${F(1 + r)} − ${F(sDn / s0)}) / (${F(sUp / s0)} − ${F(sDn / s0)}) = ${F(pi, 4)} (la probabilité réelle de 50 % ne sert pas).`,
          `Valeur = ${F(pi, 4)} × ${F(pay)} / ${F(1 + r)} = ${D(a, 2)}.`]);
    })(),
  ],
};

/* ────────────────────────── 15 · Binomial : hedge ratio et réplication ────────────────────────── */

const HEDGE_RATIO: CalcType = {
  key: "binomial-hedge-ratio",
  topic: "derivatives",
  name: "Hedge ratio et réplication (binomial à une période)",
  tier: "essentiel",
  source: "LM 10 · Valuing a Derivative Using a One-Period Binomial Model",
  formulas: [
    "Call : h = (c⁺ − c⁻) / (S⁺ − S⁻) actions achetées par call vendu",
    "Portefeuille h × S − c sans risque : V1 = h × S⁺ − c⁺ = h × S⁻ − c⁻ ; c0 = h × S0 − V1 / (1 + Rf)",
    "Put : h = (p⁻ − p⁺) / (S⁺ − S⁻) actions détenues avec un put acheté ; p0 = V1 / (1 + Rf) − h × S0",
    "Réplication du call : acheter h actions, emprunter V1 / (1 + Rf)",
  ],
  traps: [
    "Couvrir un call vendu : acheter h actions ; couvrir avec un put : long actions ET long puts.",
    "Le portefeuille couvert rapporte le taux sans risque : actualiser V1 à Rf.",
  ],
  questions: [
    (() => {
      const sUp = 66, sDn = 48, x = 55;
      const a = (callPay(sUp, x) - callPay(sDn, x)) / (sUp - sDn);
      return q("dv-hdg-f1", "facile", "Hedge ratio (shares per call written)?",
        [["Stock price after an up / down move", lst([usd(sUp), usd(sDn)])], ["Call exercise price", usd(x, 2)]],
        a, "", 4,
        [`Payoffs du call : ${D(callPay(sUp, x))} et 0.`, `h = (${F(callPay(sUp, x))} − 0) / (${F(sUp)} − ${F(sDn)}) = ${F(a, 4)} action par call vendu.`]);
    })(),
    (() => {
      const sUp = 60, sDn = 42, x = 48;
      const a = (putPay(sDn, x) - putPay(sUp, x)) / (sUp - sDn);
      return q("dv-hdg-f2", "facile", "Hedge ratio for the put (shares held per put bought)?",
        [["Stock price after an up / down move", lst([usd(sUp), usd(sDn)])], ["Put exercise price", usd(x, 2)]],
        a, "", 4,
        [`Payoffs du put : 0 en hausse, ${F(x)} − ${F(sDn)} = ${D(putPay(sDn, x))} en baisse.`,
          `h = (${F(putPay(sDn, x))} − 0) / (${F(sUp)} − ${F(sDn)}) = ${F(a, 4)}.`]);
    })(),
    (() => {
      const sUp = 110, sDn = 90, x = 100, calls = 1000;
      const h = (callPay(sUp, x) - callPay(sDn, x)) / (sUp - sDn);
      const a = h * calls;
      return q("dv-hdg-f3", "facile", "Number of shares to buy to hedge 1,000 calls written?",
        [["Stock price after an up / down move", lst([usd(sUp), usd(sDn)])], ["Call exercise price", usd(x, 2)], ["Calls written", E(calls)]],
        a, "", 0,
        [`h = (${F(callPay(sUp, x))} − 0) / (${F(sUp)} − ${F(sDn)}) = ${F(h, 2)}.`, `Actions = ${F(h, 2)} × ${F(calls)} = ${F(a, 0)}.`]);
    })(),
    (() => {
      const sUp = 22, sDn = 14, x = 18;
      const h = (callPay(sUp, x) - callPay(sDn, x)) / (sUp - sDn);
      const a = h * sUp - callPay(sUp, x);
      return q("dv-hdg-f4", "facile", "Value at expiration of the hedged portfolio (h shares, one short call)?",
        [["Stock price after an up / down move", lst([usd(sUp), usd(sDn)])], ["Call exercise price", usd(x, 2)]],
        a, "$", 2,
        [`h = (${F(callPay(sUp, x))} − 0) / (${F(sUp)} − ${F(sDn)}) = ${F(h, 2)}.`,
          `En hausse : ${F(h, 2)} × ${F(sUp)} − ${F(callPay(sUp, x))} = ${D(a, 2)} ; en baisse : ${F(h, 2)} × ${F(sDn)} − 0 = ${D(h * sDn, 2)}. Même valeur : portefeuille sans risque.`]);
    })(),
    (() => {
      const v1 = 24, r = 0.04;
      const a = v1 / (1 + r);
      return q("dv-hdg-f5", "facile", "Value today of the hedged portfolio?",
        [["Certain portfolio value at expiration", usd(v1, 2)], ["Risk-free rate per period", pc(r)]],
        a, "$", 2,
        ["Le portefeuille couvert est sans risque : on l'actualise au taux sans risque.",
          `V0 = ${F(v1)} / ${F(1 + r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 40, sUp = 50, sDn = 32, x = 42, r = 0.04;
      const h = (callPay(sUp, x) - callPay(sDn, x)) / (sUp - sDn);
      const v1 = h * sDn - callPay(sDn, x);
      const v0 = v1 / (1 + r);
      const a = h * s0 - v0;
      return q("dv-hdg-m1", "moyen", "Value of the call today, using the hedged portfolio?",
        [["Current stock price", usd(s0, 2)], ["Stock price after an up / down move", lst([usd(sUp), usd(sDn)])], ["Exercise price", usd(x, 2)],
          ["Risk-free rate per period", pc(r)]],
        a, "$", 2,
        [`h = (${F(callPay(sUp, x))} − 0) / (${F(sUp)} − ${F(sDn)}) = ${F(h, 4)}.`,
          `V1 = h × S⁻ − 0 = ${F(h, 4)} × ${F(sDn)} = ${D(v1, 4)} ; V0 = ${F(v1, 4)} / ${F(1 + r)} = ${D(v0, 4)}.`,
          `c0 = h × S0 − V0 = ${F(h * s0, 4)} − ${F(v0, 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 80, sUp = 92, sDn = 70, x = 78, r = 0.05;
      const h = (putPay(sDn, x) - putPay(sUp, x)) / (sUp - sDn);
      const v1 = h * sUp + putPay(sUp, x);
      const v0 = v1 / (1 + r);
      const a = v0 - h * s0;
      return q("dv-hdg-m2", "moyen", "Value of the put today, using the hedged portfolio?",
        [["Current stock price", usd(s0, 2)], ["Stock price after an up / down move", lst([usd(sUp), usd(sDn)])], ["Exercise price", usd(x, 2)],
          ["Risk-free rate per period", pc(r)]],
        a, "$", 2,
        [`Payoffs du put : 0 et ${D(putPay(sDn, x))} ; h = ${F(putPay(sDn, x))} / (${F(sUp)} − ${F(sDn)}) = ${F(h, 4)}.`,
          `Portefeuille long h actions + long put : V1 = ${F(h, 4)} × ${F(sUp)} + 0 = ${D(v1, 4)} (= ${F(h, 4)} × ${F(sDn)} + ${F(putPay(sDn, x))}).`,
          `V0 = ${F(v1, 4)} / ${F(1 + r)} = ${D(v0, 4)} ; p0 = V0 − h × S0 = ${F(v0, 4)} − ${F(h * s0, 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 30, sUp = 36, sDn = 25, x = 31, r = 0.04;
      const h = (callPay(sUp, x) - callPay(sDn, x)) / (sUp - sDn);
      const v1 = h * sDn;
      const a = v1 / (1 + r);
      return q("dv-hdg-m3", "moyen", "Value today of the hedged portfolio (long h shares, short one call)?",
        [["Current stock price", usd(s0, 2)], ["Stock price after an up / down move", lst([usd(sUp), usd(sDn)])], ["Call exercise price", usd(x, 2)],
          ["Risk-free rate per period", pc(r)]],
        a, "$", 2,
        [`h = (${F(callPay(sUp, x))} − 0) / (${F(sUp)} − ${F(sDn)}) = ${F(h, 4)}.`,
          `V1 = ${F(h, 4)} × ${F(sDn)} = ${D(v1, 4)} dans les deux états.`,
          `V0 = ${F(v1, 4)} / ${F(1 + r)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const sUp = 120, sDn = 90, x = 100, contracts = 25;
      const h = (callPay(sUp, x) - callPay(sDn, x)) / (sUp - sDn);
      const a = h * contracts * 100;
      return q("dv-hdg-m4", "moyen", "Number of shares to buy to hedge 25 written call contracts (100 shares each)?",
        [["Stock price after an up / down move", lst([usd(sUp), usd(sDn)])], ["Call exercise price", usd(x, 2)], ["Call contracts written", E(contracts)]],
        a, "", 0,
        [`h = (${F(callPay(sUp, x))} − 0) / (${F(sUp)} − ${F(sDn)}) = ${F(h, 4)}.`,
          `Calls vendus = 25 × 100 = 2 500 ; actions = ${F(h, 4)} × 2 500 = ${F(a, 0)}.`]);
    })(),
    (() => {
      const s0 = 40, sUp = 48, sDn = 34, x = 40, r = 0.05;
      const h = (callPay(sUp, x) - callPay(sDn, x)) / (sUp - sDn);
      const a = (h * sDn - callPay(sDn, x)) / (1 + r);
      return q("dv-hdg-m5", "moyen", "Amount borrowed in the portfolio that replicates the call?",
        [["Current stock price", usd(s0, 2)], ["Stock price after an up / down move", lst([usd(sUp), usd(sDn)])], ["Exercise price", usd(x, 2)],
          ["Risk-free rate per period", pc(r)]],
        a, "$", 2,
        [`h = (${F(callPay(sUp, x))} − 0) / (${F(sUp)} − ${F(sDn)}) = ${F(h, 4)}.`,
          `Le call = h actions − un emprunt B remboursé V1 = h × S⁻ − c⁻ = ${F(h * sDn, 4)} à l'échéance.`,
          `B = ${F(h * sDn, 4)} / ${F(1 + r)} = ${D(a, 2)} ; d'où c0 = ${F(h * s0, 4)} − ${F(a, 4)} = ${D(h * s0 - a, 2)}.`]);
    })(),
    (() => {
      const s0 = 60, sUp = 75, sDn = 54, x = 50, r = 0.04;
      const cu = callPay(sUp, x), cd = callPay(sDn, x);
      const h = (cu - cd) / (sUp - sDn);
      const v1 = h * sDn - cd;
      const a = h * s0 - v1 / (1 + r);
      return q("dv-hdg-d1", "difficile", "Value of the call today, using the hedged portfolio?",
        [["Current stock price", usd(s0, 2)], ["Stock price after an up / down move", lst([usd(sUp), usd(sDn)])], ["Exercise price", usd(x, 2)],
          ["Risk-free rate per period", pc(r)]],
        a, "$", 2,
        [`Le call est dans la monnaie dans les deux états : payoffs ${D(cu)} et ${D(cd)}.`,
          `h = (${F(cu)} − ${F(cd)}) / (${F(sUp)} − ${F(sDn)}) = ${F(h, 4)} : une action par call.`,
          `V1 = ${F(h)} × ${F(sDn)} − ${F(cd)} = ${D(v1)} ; V0 = ${F(v1)} / ${F(1 + r)} = ${D(v1 / (1 + r), 4)}.`,
          `c0 = ${F(h * s0)} − ${F(v1 / (1 + r), 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 100, sUp = 125, sDn = 80, x = 105, r = 0.06, real = 0.6;
      const h = (putPay(sDn, x) - putPay(sUp, x)) / (sUp - sDn);
      const v1 = h * sUp + putPay(sUp, x);
      const a = v1 / (1 + r) - h * s0;
      return q("dv-hdg-d2", "difficile", "Value of the put today, using the hedged portfolio?",
        [["Current stock price", usd(s0, 2)], ["Stock price after an up / down move", lst([usd(sUp), usd(sDn)])], ["Probability of an up-move", pc(real)],
          ["Exercise price", usd(x, 2)], ["Risk-free rate per period", pc(r)]],
        a, "$", 2,
        ["La probabilité de hausse ne sert pas : la couverture élimine le risque.",
          `Payoffs du put : 0 et ${D(putPay(sDn, x))} ; h = ${F(putPay(sDn, x))} / ${F(sUp - sDn)} = ${F(h, 4)}.`,
          `V1 = ${F(h, 4)} × ${F(sUp)} = ${D(v1, 4)} ; V0 = ${F(v1, 4)} / ${F(1 + r)} = ${D(v1 / (1 + r), 4)}.`,
          `p0 = ${F(v1 / (1 + r), 4)} − ${F(h, 4)} × ${F(s0)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 50, sUp = 60, sDn = 42, x = 52, r = 0.03, cm = 4.8;
      const h = (callPay(sUp, x) - callPay(sDn, x)) / (sUp - sDn);
      const v1 = h * sDn;
      const c = h * s0 - v1 / (1 + r);
      const a = cm - c;
      return q("dv-hdg-d3", "difficile", "Arbitrage profit per call today from writing the call and replicating it?",
        [["Current stock price", usd(s0, 2)], ["Stock price after an up / down move", lst([usd(sUp), usd(sDn)])], ["Exercise price", usd(x, 2)],
          ["Risk-free rate per period", pc(r)], ["Market price of the call", usd(cm, 2)]],
        a, "$", 2,
        [`h = ${F(callPay(sUp, x))} / ${F(sUp - sDn)} = ${F(h, 4)} ; V1 = ${F(h, 4)} × ${F(sDn)} = ${D(v1, 4)}.`,
          `Valeur du call = ${F(h, 4)} × ${F(s0)} − ${F(v1, 4)} / ${F(1 + r)} = ${F(h * s0, 4)} − ${F(v1 / (1 + r), 4)} = ${D(c, 4)}.`,
          `Vendre le call à ${D(cm, 2)}, acheter ${F(h, 4)} action et emprunter ${D(v1 / (1 + r), 4)} : gain immédiat = ${F(cm, 2)} − ${F(c, 4)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const s0 = 25, sUp = 28, sDn = 22.5, x = 26, rAnn = 0.06;
      const r = Math.pow(1 + rAnn, 0.25) - 1;
      const h = (putPay(sDn, x) - putPay(sUp, x)) / (sUp - sDn);
      const v1 = h * sUp + putPay(sUp, x);
      const a = v1 / (1 + r) - h * s0;
      return q("dv-hdg-d4", "difficile", "Value of the 3-month put today, using the hedged portfolio?",
        [["Current stock price", usd(s0, 2)], ["Stock price in 3 months, up / down", lst([usd(sUp, 2), usd(sDn, 2)])], ["Exercise price", usd(x, 2)],
          ["Risk-free rate (annual, annual compounding)", pc(rAnn)]],
        a, "$", 2,
        [`Taux de la période = ${F(1 + rAnn)}^0,25 − 1 = ${P(r, 4)}.`,
          `Payoffs du put : 0 et ${D(putPay(sDn, x), 2)} ; h = ${F(putPay(sDn, x), 2)} / ${F(sUp - sDn, 2)} = ${F(h, 4)}.`,
          `V1 = ${F(h, 4)} × ${F(sUp)} = ${D(v1, 4)} ; V0 = ${F(v1, 4)} / ${F(1 + r, 6)} = ${D(v1 / (1 + r), 4)}.`,
          `p0 = ${F(v1 / (1 + r), 4)} − ${F(h, 4)} × ${F(s0)} = ${D(a, 2)}.`]);
    })(),
    (() => {
      const shares = 3000, sUp = 66, sDn = 54, x = 60;
      const h = (putPay(sDn, x) - putPay(sUp, x)) / (sUp - sDn);
      const puts = shares / h;
      const a = puts / 100;
      return q("dv-hdg-d5", "difficile", "Number of put contracts (100 shares each) needed to make the 3,000-share position riskless?",
        [["Shares held", E(shares)], ["Stock price after an up / down move", lst([usd(sUp), usd(sDn)])], ["Put exercise price", usd(x, 2)]],
        a, "", 0,
        [`Payoffs du put : 0 et ${D(putPay(sDn, x))} ; h = ${F(putPay(sDn, x))} / ${F(sUp - sDn)} = ${F(h, 4)} action par put.`,
          `Puts nécessaires = ${F(shares)} / ${F(h, 4)} = ${F(puts, 0)}, soit ${F(a, 0)} contrats.`,
          `Contrôle : en baisse, ${F(shares)} × ${F(sDn)} + ${F(puts)} × ${F(putPay(sDn, x))} = ${D(shares * sDn + puts * putPay(sDn, x))} = ${F(shares)} × ${F(sUp)}.`]);
    })(),
  ],
};

/* ────────────────────────── Catalogue ────────────────────────── */

export const DERIVATIVES_CALC: CalcCatalog = {
  topic: "derivatives",
  types: [
    FORWARD_PRICE,
    FORWARD_VALUE,
    FORWARD_ARBITRAGE,
    FX_FORWARD,
    FRA,
    FUTURES_MARGIN,
    IR_FUTURES,
    SWAP_RATE,
    SWAP_VALUE,
    OPTION_PAYOFF,
    OPTION_BOUNDS,
    PUT_CALL_PARITY,
    PUT_CALL_FORWARD,
    BINOMIAL,
    HEDGE_RATIO,
  ],
};
