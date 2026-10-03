// Exercices de calcul pur : Portfolio Management (CFA Level I).
//
// 19 types de calcul, 15 questions chacun (5 faciles, 5 moyennes, 5 difficiles),
// dans l'ordre du curriculum. Chaque réponse est CALCULÉE ci-dessous par les petites
// fonctions de la section « Calculs », à partir des mêmes nombres que les données
// affichées : aucune réponse n'est tapée à la main. Les étapes de la correction
// sont générées avec ces mêmes nombres, et la ligne « Réponse » est ajoutée
// automatiquement avec l'arrondi demandé.
//
// Formules vérifiées dans Schweser Book 4 (Readings 83 à 85 : Portfolio Risk and
// Return I et II, Portfolio Management Overview) et Book 1 (Reading 1, Rates and
// Returns, pour les deux types « rappel Quant »).
//
// Les nombres des corrections sont écrits comme sur la calculatrice (point
// décimal), comme dans les données d'examen.

import type { CalcCatalog, CalcLevel, CalcQuestion, CalcType, CalcUnit } from "./types";

type Datum = [string, string];
type Maker = () => CalcQuestion;

// ---------------------------------------------------------------------------
// Calculs
// ---------------------------------------------------------------------------

const sq = (x: number): number => x * x;
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]): number => sum(xs) / xs.length;
const devs = (xs: number[]): number[] => {
  const m = mean(xs);
  return xs.map((x) => x - m);
};
const sumSqDev = (xs: number[]): number => sum(devs(xs).map(sq));
const sampleVar = (xs: number[]): number => sumSqDev(xs) / (xs.length - 1);
const popVar = (xs: number[]): number => sumSqDev(xs) / xs.length;
const sumCross = (xs: number[], ys: number[]): number => {
  const dx = devs(xs);
  const dy = devs(ys);
  return sum(dx.map((d, i) => d * dy[i]));
};
const sampleCov = (xs: number[], ys: number[]): number => sumCross(xs, ys) / (xs.length - 1);
const wavg = (ws: number[], xs: number[]): number => sum(ws.map((w, i) => w * xs[i]));

// Rendements (rappel Quant, Rates and Returns)
const hpr = (p0: number, p1: number, d = 0): number => (p1 - p0 + d) / p0;
const linked = (rs: number[]): number => rs.reduce((a, r) => a * (1 + r), 1) - 1;
const geoMean = (rs: number[]): number => Math.pow(1 + linked(rs), 1 / rs.length) - 1;
const annualizeDays = (h: number, days: number): number => Math.pow(1 + h, 365 / days) - 1;
const annualizeYears = (h: number, years: number): number => Math.pow(1 + h, 1 / years) - 1;
const realRet = (nominal: number, infl: number): number => (1 + nominal) / (1 + infl) - 1;
const leveraged = (r: number, v0: number, vb: number, rb: number): number => r + (vb / v0) * (r - rb);
const npv = (r: number, cfs: number[]): number =>
  cfs.reduce((a, cf, t) => a + cf / Math.pow(1 + r, t), 0);
/** IRR par dichotomie (flux avec un seul changement de signe). */
function irr(cfs: number[]): number {
  let lo = -0.9;
  let hi = 1;
  const positiveAtLo = npv(lo, cfs) > 0;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid, cfs) > 0 === positiveAtLo) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// Portefeuille
const covOf = (rho: number, s1: number, s2: number): number => rho * s1 * s2;
const corrOf = (c: number, s1: number, s2: number): number => c / (s1 * s2);
/** Variance d'un portefeuille à 2 actifs, avec la corrélation (w2 = 1 − w1). */
const var2 = (w1: number, s1: number, s2: number, rho: number): number => {
  const w2 = 1 - w1;
  return sq(w1) * sq(s1) + sq(w2) * sq(s2) + 2 * w1 * w2 * rho * s1 * s2;
};
/** Variance d'un portefeuille à 2 actifs, avec les variances et la covariance. */
const var2c = (w1: number, v1: number, v2: number, c: number): number => {
  const w2 = 1 - w1;
  return sq(w1) * v1 + sq(w2) * v2 + 2 * w1 * w2 * c;
};
const utility = (er: number, sd: number, a: number): number => er - 0.5 * a * sq(sd);
const yStar = (er: number, rf: number, sd: number, a: number): number => (er - rf) / (a * sq(sd));
/** Rendement d'un mélange actif risqué (poids w) + actif sans risque. */
const mix = (w: number, er: number, rf: number): number => rf + w * (er - rf);
const cmlRet = (rf: number, erm: number, sdm: number, sdp: number): number => rf + ((erm - rf) / sdm) * sdp;
const betaCov = (c: number, sdm: number): number => c / sq(sdm);
const betaRho = (rho: number, sdi: number, sdm: number): number => (rho * sdi) / sdm;
const capm = (rf: number, b: number, erm: number): number => rf + b * (erm - rf);
const sharpe = (rp: number, rf: number, sd: number): number => (rp - rf) / sd;
const treynor = (rp: number, rf: number, b: number): number => (rp - rf) / b;
const m2 = (rp: number, rf: number, sdp: number, sdm: number): number => rf + ((rp - rf) * sdm) / sdp;
const jensen = (rp: number, rf: number, b: number, rm: number): number => rp - capm(rf, b, rm);

// ---------------------------------------------------------------------------
// Mise en forme (affichage des données et des étapes)
// ---------------------------------------------------------------------------

const MINUS = "−";

/** Nombre arrondi à d décimales, zéros inutiles retirés, vrai signe moins. */
function fx(x: number, d = 4): string {
  const f = Math.pow(10, d);
  const v = Math.round(Math.abs(x) * f) / f;
  let s = v.toFixed(d);
  if (s.indexOf(".") >= 0) {
    while (s.endsWith("0")) s = s.slice(0, -1);
    if (s.endsWith(".")) s = s.slice(0, -1);
  }
  return x < 0 && v !== 0 ? MINUS + s : s;
}
/** Taux décimal affiché en % : 0.085 → "8.5%". */
const pc = (x: number, d = 2): string => fx(x * 100, d) + "%";
function commas(s: string): string {
  const [int, dec] = s.split(".");
  let out = "";
  for (let k = 0; k < int.length; k++) {
    if (k > 0 && (int.length - k) % 3 === 0) out += ",";
    out += int[k];
  }
  return dec ? out + "." + dec : out;
}
/** Montant : 1250 → "$1,250" ; 1.2 → "$1.20". */
function usd(x: number): string {
  const v = Math.round(Math.abs(x) * 100) / 100;
  const s = Number.isInteger(v) ? v.toFixed(0) : v.toFixed(2);
  return (x < 0 ? MINUS : "") + "$" + commas(s);
}
/** Montant sans symbole, avec séparateurs : 1280000 → "1,280,000". */
const amt = (x: number): string => usd(x).replace("$", "");
/** Liste de taux : [0.08, -0.04] → "8%, −4%". */
const list = (xs: number[], d = 2): string => xs.map((x) => pc(x, d)).join(", ");
/** Somme lisible de taux en points : [0.08, -0.04, 0.12] → "8 − 4 + 12". */
function sumExpr(xs: number[], d = 2): string {
  return xs
    .map((x, i) => (i === 0 ? fx(x * 100, d) : (x < 0 ? " − " : " + ") + fx(Math.abs(x) * 100, d)))
    .join("");
}
/** Facteurs de capitalisation : [0.1, -0.05] → "1.1 × 0.95". */
const factors = (rs: number[]): string => rs.map((r) => fx(1 + r, 4)).join(" × ");
/** Écarts à la moyenne en points de % : "(10 − 4)² + (−5 − 4)² …". */
function sqDevExpr(xs: number[]): string {
  const m = mean(xs);
  return xs.map((x) => "(" + fx(x * 100, 2) + " − " + fx(m * 100, 2) + ")²").join(" + ");
}
/** Écart affiché avec signe explicite : +2.3 / −4.8. */
const signed = (x: number, d = 2): string => (x > 0 ? "+" : "") + fx(x, d);

function showAnswer(a: number, unit: CalcUnit, d: number): string {
  const neg = a < 0 && Math.round(Math.abs(a) * Math.pow(10, d)) !== 0;
  let s = Math.abs(a).toFixed(d);
  if (unit === "$") s = "$" + commas(s);
  s = (neg ? MINUS : "") + s;
  if (unit === "%") return s + "%";
  if (unit === "x") return s + "x";
  if (unit === "years") return s + " ans";
  if (unit === "bp") return s + " bp";
  return s;
}

/** Corrections en écriture française, comme Equity : 1 234,56 (les données
 *  restent au format d'examen, 1,234.56). */
const NNBSP = String.fromCharCode(0x202f);
const fr = (line: string): string =>
  line.replace(/([0-9]),(?=[0-9]{3}(?![0-9]))/g, "$1" + NNBSP).replace(/([0-9])\.([0-9])/g, "$1,$2");

/** Construit une question ; la dernière étape « Réponse » est ajoutée ici. */
function Q(
  id: string,
  level: CalcLevel,
  prompt: string,
  data: Datum[],
  answer: number,
  unit: CalcUnit,
  decimals: number,
  steps: string[],
  tolerance?: number,
): CalcQuestion {
  const a = Number(answer.toPrecision(12));
  const q: CalcQuestion = {
    id,
    level,
    prompt,
    data: data.map(([label, value]) => ({ label, value })),
    answer: a,
    unit,
    decimals,
    solution: [...steps, "Réponse : " + showAnswer(a, unit, decimals)].map(fr),
  };
  if (tolerance !== undefined) q.tolerance = tolerance;
  return q;
}

const build = (makers: Maker[]): CalcQuestion[] => makers.map((m) => m());

// ===========================================================================
// 1. Mesures de rendement (rappel Quant)
// ===========================================================================

const T_RETURNS: CalcType = {
  key: "return-measures",
  topic: "portfolio",
  name: "Mesures de rendement (HPR, moyennes, annualisation, réel)",
  tier: "annexe",
  source: "Quant LM 1 · Rates and Returns (rappel indispensable en PM)",
  formulas: [
    "HPR = (P1 − P0 + D1) / P0",
    "Sur plusieurs périodes : (1 + R1)(1 + R2)…(1 + Rn) − 1",
    "Moyenne arithmétique = ΣRt / n ; géométrique = [(1 + R1)…(1 + Rn)]^(1/n) − 1",
    "Annualisation : (1 + HPR)^(365/jours) − 1, ou (1 + HPR)^(1/années) − 1",
    "Réel exact : (1 + nominal) / (1 + inflation) − 1",
    "Continu : r = ln(1 + HPR), et les taux continus s'additionnent",
    "Levier : rL = r + (VB / V0)(r − rB)",
  ],
  traps: [
    "La moyenne géométrique est inférieure à l'arithmétique : pour un taux composé, prends la géométrique.",
    "Pour annualiser, la racine se prend en années (365 jours chez Schweser), pas en nombre de périodes.",
    "Le réel exact divise : 1.07 / 1.02 − 1 = 4.90%, pas 7% − 2% = 5%.",
  ],
  questions: build([
    () => {
      const p0 = 40, p1 = 43, d = 1.2;
      const h = hpr(p0, p1, d);
      return Q("pm-ret-f1", "facile", "Holding period return?",
        [["Price at start", usd(p0)], ["Price at end", usd(p1)], ["Dividend received", usd(d)]],
        h * 100, "%", 2, [
          "HPR = (P1 − P0 + D) / P0",
          `= (${fx(p1)} − ${fx(p0)} + ${fx(d)}) / ${fx(p0)} = ${fx(p1 - p0 + d)} / ${fx(p0)} = ${pc(h, 3)}`,
        ]);
    },
    () => {
      const rs = [0.08, -0.04, 0.12, 0.06];
      const m = mean(rs);
      return Q("pm-ret-f2", "facile", "Arithmetic mean return?",
        [["Annual returns", list(rs)]],
        m * 100, "%", 2, [
          "Moyenne arithmétique = somme des rendements / nombre d'années",
          `= (${sumExpr(rs)}) / ${rs.length} = ${fx(sum(rs) * 100)} / ${rs.length} = ${pc(m)}`,
        ]);
    },
    () => {
      const n = 0.07, i = 0.02;
      const r = realRet(n, i);
      return Q("pm-ret-f3", "facile", "Real return (exact)?",
        [["Nominal return", pc(n)], ["Inflation", pc(i)]],
        r * 100, "%", 2, [
          "Réel exact = (1 + nominal) / (1 + inflation) − 1",
          `= ${fx(1 + n)} / ${fx(1 + i)} − 1 = ${pc(r, 3)}`,
          `L'approximation ${pc(n)} − ${pc(i)} = ${pc(n - i)} surestime un peu le réel.`,
        ]);
    },
    () => {
      const rs = [0.1, -0.05, 0.08];
      const t = linked(rs);
      return Q("pm-ret-f4", "facile", "Holding period return over the 3 years?",
        [["Annual returns", list(rs)]],
        t * 100, "%", 2, [
          "Compose les rendements : (1 + R1)(1 + R2)(1 + R3) − 1",
          `= ${factors(rs)} − 1 = ${fx(1 + t, 5)} − 1 = ${pc(t, 3)}`,
        ]);
    },
    () => {
      const h = 0.015, days = 90;
      const a = annualizeDays(h, days);
      return Q("pm-ret-f5", "facile", "Annualized return? (365-day year)",
        [["90-day holding period return", pc(h)]],
        a * 100, "%", 2, [
          "Annualisé = (1 + HPR)^(365/jours) − 1",
          `= ${fx(1 + h)}^(365/${days}) − 1 = ${fx(1 + h)}^${fx(365 / days, 4)} − 1 = ${pc(a, 3)}`,
        ]);
    },
    () => {
      const rs = [0.15, -0.1, 0.12];
      const g = geoMean(rs);
      return Q("pm-ret-m1", "moyen", "Geometric mean annual return?",
        [["Annual returns", list(rs)]],
        g * 100, "%", 2, [
          `Produit des (1 + R) : ${factors(rs)} = ${fx(1 + linked(rs), 5)}`,
          `Racine 3e : ${fx(1 + linked(rs), 5)}^(1/3) − 1 = ${pc(g, 3)}`,
          `La moyenne arithmétique (${pc(mean(rs))}) est plus haute : c'est normal quand les rendements varient.`,
        ]);
    },
    () => {
      const p0 = 962, p1 = 1000, days = 450;
      const h = hpr(p0, p1);
      const a = annualizeDays(h, days);
      return Q("pm-ret-m2", "moyen", "Annualized return? (365-day year)",
        [["Purchase price", usd(p0)], ["Redemption value", usd(p1)], ["Days to maturity", String(days)]],
        a * 100, "%", 2, [
          `HPR = ${fx(p1)} / ${fx(p0)} − 1 = ${pc(h, 3)}`,
          `Annualisé = (1 + HPR)^(365/${days}) − 1 = ${fx(1 + h, 5)}^${fx(365 / days, 4)} − 1 = ${pc(a, 3)}`,
          "Plus d'un an : l'annualisation réduit le rendement affiché.",
        ]);
    },
    () => {
      const rs = [0.03, -0.01, 0.02, 0.015];
      const t = linked(rs);
      const a = annualizeYears(t, 2);
      return Q("pm-ret-m3", "moyen", "Annualized return?",
        [["Four consecutive 6-month returns", list(rs)]],
        a * 100, "%", 2, [
          `Rendement total : ${factors(rs)} − 1 = ${pc(t, 3)}`,
          `4 semestres = 2 ans : (${fx(1 + t, 5)})^(1/2) − 1 = ${pc(a, 3)}`,
          "La racine se prend en années, pas en nombre de périodes.",
        ]);
    },
    () => {
      const v0 = 10000, v1 = 10800, i = 0.03;
      const n = hpr(v0, v1);
      const r = realRet(n, i);
      return Q("pm-ret-m4", "moyen", "Real return (exact)?",
        [["Amount invested", usd(v0)], ["Value one year later", usd(v1)], ["Inflation", pc(i)]],
        r * 100, "%", 2, [
          `Nominal = ${amt(v1)} / ${amt(v0)} − 1 = ${pc(n)}`,
          `Réel = ${fx(1 + n)} / ${fx(1 + i)} − 1 = ${pc(r, 3)}`,
        ]);
    },
    () => {
      const real = 0.04, i = 0.025;
      const n = (1 + real) * (1 + i) - 1;
      return Q("pm-ret-m5", "moyen", "Nominal return required (exact)?",
        [["Target real return", pc(real)], ["Expected inflation", pc(i)]],
        n * 100, "%", 2, [
          "1 + nominal = (1 + réel)(1 + inflation)",
          `= ${fx(1 + real)} × ${fx(1 + i)} = ${fx(1 + n, 5)} ⇒ nominal = ${pc(n, 3)}`,
          `L'addition ${pc(real)} + ${pc(i)} = ${pc(real + i)} oublie le produit croisé.`,
        ]);
    },
    () => {
      const r1 = 0.1, r2 = -0.04, g = 0.06;
      const need = Math.pow(1 + g, 3);
      const done = (1 + r1) * (1 + r2);
      const r3 = need / done - 1;
      return Q("pm-ret-d1", "difficile", "Year 3 return needed?",
        [["Year 1 return", pc(r1)], ["Year 2 return", pc(r2)], ["Target geometric mean (3 years)", pc(g)]],
        r3 * 100, "%", 2, [
          `Il faut (1 + R1)(1 + R2)(1 + R3) = ${fx(1 + g)}³ = ${fx(need, 6)}`,
          `Déjà acquis : ${fx(1 + r1)} × ${fx(1 + r2)} = ${fx(done, 4)}`,
          `1 + R3 = ${fx(need, 6)} / ${fx(done, 4)} = ${fx(need / done, 5)} ⇒ R3 = ${pc(r3, 3)}`,
        ]);
    },
    () => {
      const v0 = 1000000, vb = 500000, rb = 0.05, r = 0.08;
      const rl = leveraged(r, v0, vb, rb);
      return Q("pm-ret-d2", "difficile", "Leveraged return on equity?",
        [["Equity invested", usd(v0)], ["Amount borrowed", usd(vb)], ["Borrowing rate", pc(rb)], ["Return on total assets", pc(r)]],
        rl * 100, "%", 2, [
          "rL = r + (VB / V0)(r − rB)",
          `= ${pc(r)} + (${amt(vb)} / ${amt(v0)}) × (${pc(r)} − ${pc(rb)}) = ${pc(r)} + ${fx(vb / v0)} × ${pc(r - rb)}`,
          `Contrôle en dollars : ${pc(r)} × ${amt(v0 + vb)} − ${pc(rb)} × ${amt(vb)} = ${amt(r * (v0 + vb) - rb * vb)}, soit ${pc(rl, 3)} des fonds propres`,
        ]);
    },
    () => {
      const v0 = 50000, v1 = 64000, years = 4, i = 0.025;
      const t = hpr(v0, v1);
      const na = annualizeYears(t, years);
      const ra = realRet(na, i);
      return Q("pm-ret-d3", "difficile", "Annualized real return?",
        [["Initial value", usd(v0)], ["Value after 4 years", usd(v1)], ["Annual inflation", pc(i)]],
        ra * 100, "%", 2, [
          `Rendement total = ${amt(v1)} / ${amt(v0)} − 1 = ${pc(t)}`,
          `Nominal annualisé = ${fx(1 + t)}^(1/${years}) − 1 = ${pc(na, 3)}`,
          `Réel = ${fx(1 + na, 5)} / ${fx(1 + i)} − 1 = ${pc(ra, 3)}`,
        ]);
    },
    () => {
      const shares = 200, p0 = 50, p1 = 45, d = 1.5, years = 2;
      const h = hpr(p0, p1, d * years);
      const a = annualizeYears(h, years);
      return Q("pm-ret-d4", "difficile", "Annualized holding period return?",
        [["Shares bought", String(shares)], ["Purchase price", usd(p0)], ["Sale price, 2 years later", usd(p1)], ["Dividend per share, each year", usd(d)]],
        a * 100, "%", 2, [
          "Le nombre d'actions ne change rien : raisonne par action.",
          `HPR sur 2 ans = (${fx(p1)} − ${fx(p0)} + 2 × ${fx(d)}) / ${fx(p0)} = ${pc(h)}`,
          `Annualisé = ${fx(1 + h)}^(1/2) − 1 = ${pc(a, 3)}`,
        ]);
    },
    () => {
      const cc = [0.04, -0.015, 0.03];
      const s = sum(cc);
      const h = Math.exp(s) - 1;
      return Q("pm-ret-d5", "difficile", "Holding period return over the 3 years?",
        [["Continuously compounded annual returns", list(cc)]],
        h * 100, "%", 2, [
          `Les taux continus s'additionnent : ${sumExpr(cc)} = ${pc(s)}`,
          `HPR = e^${fx(s)} − 1 = ${pc(h, 3)}`,
        ]);
    },
  ]),
};

// ===========================================================================
// 2. Money-weighted vs time-weighted (rappel Quant)
// ===========================================================================

const T_MWR_TWR: CalcType = {
  key: "mwr-twr",
  topic: "portfolio",
  name: "Money-weighted vs time-weighted return",
  tier: "annexe",
  source: "Quant LM 1 · Rates and Returns (mesure de performance d'un portefeuille)",
  formulas: [
    "TWR : coupe aux dates de flux, HPR par sous-période, puis (1 + HPR1)(1 + HPR2)… − 1",
    "TWR annuel = (1 + TWR total)^(1/années) − 1",
    "MWR = IRR : Σ CFt / (1 + MWR)^t = 0 (apports en −, retraits, dividendes et valeur finale en +)",
  ],
  traps: [
    "Le TWR ignore le montant et le calendrier des flux : c'est la mesure du gérant.",
    "Le MWR pèse plus la période où il y a le plus d'argent : apport avant une mauvaise période ⇒ MWR < TWR.",
    "Une sous-période s'arrête juste AVANT le flux : le dépôt n'est pas un gain.",
  ],
  questions: build([
    () => {
      const rs = [0.15, -0.06];
      const t = linked(rs);
      return Q("pm-mt-f1", "facile", "Time-weighted return for the 2 years (not annualized)?",
        [["Sub-period 1 return", pc(rs[0])], ["Sub-period 2 return", pc(rs[1])]],
        t * 100, "%", 2, [
          "TWR = (1 + HPR1)(1 + HPR2) − 1",
          `= ${factors(rs)} − 1 = ${pc(t, 3)}`,
        ]);
    },
    () => {
      const rs = [0.03, -0.02, 0.04, 0.01];
      const t = linked(rs);
      return Q("pm-mt-f2", "facile", "Annual time-weighted return?",
        [["Quarterly returns", list(rs)]],
        t * 100, "%", 2, [
          `Chaîne les 4 trimestres : ${factors(rs)} − 1`,
          `= ${fx(1 + t, 5)} − 1 = ${pc(t, 3)}`,
        ]);
    },
    () => {
      const p0 = 50, p1 = 54, d = 1;
      const r = irr([-p0, p1 + d]);
      return Q("pm-mt-f3", "facile", "Money-weighted return? (no other cash flows)",
        [["Purchase price, t = 0", usd(p0)], ["Sale price, t = 1", usd(p1)], ["Dividend, t = 1", usd(d)]],
        r * 100, "%", 2, [
          "Sans flux intermédiaire, MWR = TWR = HPR.",
          `IRR : −${fx(p0)} + (${fx(p1)} + ${fx(d)}) / (1 + r) = 0 ⇒ r = ${fx(p1 + d)} / ${fx(p0)} − 1 = ${pc(r, 3)}`,
        ]);
    },
    () => {
      const v0 = 200000, vPre = 214000, dep = 50000;
      const h = hpr(v0, vPre);
      return Q("pm-mt-f4", "facile", "Return of the first sub-period?",
        [["Value at start", usd(v0)], ["Value just before the deposit", usd(vPre)], ["Deposit", usd(dep)]],
        h * 100, "%", 2, [
          "La sous-période s'arrête juste avant le dépôt : le dépôt n'entre pas dans son rendement.",
          `HPR1 = ${amt(vPre)} / ${amt(v0)} − 1 = ${pc(h)}`,
        ]);
    },
    () => {
      const cum = 0.21, years = 2;
      const a = annualizeYears(cum, years);
      return Q("pm-mt-f5", "facile", "Annualized time-weighted return?",
        [["Cumulative TWR over 2 years", pc(cum)]],
        a * 100, "%", 2, [
          "TWR annuel = (1 + TWR cumulé)^(1/années) − 1",
          `= ${fx(1 + cum)}^(1/${years}) − 1 = ${pc(a, 3)}`,
        ]);
    },
    () => {
      const p0 = 25, p1 = 28, p2 = 31, d = 0.5;
      const h1 = hpr(p0, p1, d);
      const h2 = hpr(p1, p2, d);
      const t = annualizeYears(linked([h1, h2]), 2);
      return Q("pm-mt-m1", "moyen", "Annualized time-weighted return?",
        [["t = 0", `Buy 1 share at ${usd(p0)}`], ["t = 1", `Dividend ${usd(d)}/share; buy 1 more share at ${usd(p1)}`], ["t = 2", `Dividend ${usd(d)}/share; sell both shares at ${usd(p2)}`]],
        t * 100, "%", 2, [
          `Année 1 : HPR1 = (${fx(p1)} + ${fx(d)} − ${fx(p0)}) / ${fx(p0)} = ${pc(h1, 3)}`,
          `Année 2, par action : HPR2 = (${fx(p2)} + ${fx(d)} − ${fx(p1)}) / ${fx(p1)} = ${pc(h2, 3)}`,
          `TWR annuel = (${fx(1 + h1, 4)} × ${fx(1 + h2, 4)})^(1/2) − 1 = ${pc(t, 3)}`,
        ]);
    },
    () => {
      const p0 = 40, p1 = 44, p2 = 46, d = 1;
      const cfs = [-p0, -p1 + d, 2 * p2 + 2 * d];
      const r = irr(cfs);
      return Q("pm-mt-m2", "moyen", "Money-weighted return (annual)?",
        [["t = 0", `Buy 1 share at ${usd(p0)}`], ["t = 1", `Dividend ${usd(d)}/share; buy 1 more share at ${usd(p1)}`], ["t = 2", `Dividend ${usd(d)}/share; sell both shares at ${usd(p2)}`]],
        r * 100, "%", 2, [
          `Flux pour toi : t0 = −${fx(p0)} ; t1 = −${fx(p1)} + ${fx(d)} = ${fx(cfs[1])} ; t2 = 2 × ${fx(p2)} + 2 × ${fx(d)} = ${fx(cfs[2])}`,
          `Résous ${fx(cfs[0])} ${MINUS} ${fx(-cfs[1])}/(1 + r) + ${fx(cfs[2])}/(1 + r)² = 0 (CF0 = ${fx(cfs[0])}, C01 = ${fx(cfs[1])}, C02 = ${fx(cfs[2])}, IRR)`,
          `MWR = ${pc(r, 3)}`,
        ]);
    },
    () => {
      const v0 = 1000000, vPre = 1080000, dep = 200000, v1 = 1250000;
      const h1 = hpr(v0, vPre);
      const h2 = hpr(vPre + dep, v1);
      const t = linked([h1, h2]);
      return Q("pm-mt-m3", "moyen", "Time-weighted return for the year?",
        [["Value at start", usd(v0)], ["Value at mid-year, before deposit", usd(vPre)], ["Deposit at mid-year", usd(dep)], ["Value at year-end", usd(v1)]],
        t * 100, "%", 2, [
          `HPR1 = ${amt(vPre)} / ${amt(v0)} − 1 = ${pc(h1)}`,
          `Après le dépôt : ${amt(vPre)} + ${amt(dep)} = ${amt(vPre + dep)} ; HPR2 = ${amt(v1)} / ${amt(vPre + dep)} − 1 = ${pc(h2, 3)}`,
          `TWR = ${fx(1 + h1, 4)} × ${fx(1 + h2, 5)} − 1 = ${pc(t, 3)}`,
        ]);
    },
    () => {
      const c0 = 10000, c1 = 5000, ev = 16500;
      const r = irr([-c0, -c1, ev]);
      return Q("pm-mt-m4", "moyen", "Money-weighted return (annual)?",
        [["Investment at t = 0", usd(c0)], ["Additional investment at t = 1", usd(c1)], ["Value at t = 2", usd(ev)]],
        r * 100, "%", 2, [
          `Flux : CF0 = −${amt(c0)} ; CF1 = −${amt(c1)} ; CF2 = +${amt(ev)}`,
          `Résous −${amt(c0)} − ${amt(c1)}/(1 + r) + ${amt(ev)}/(1 + r)² = 0 (fonction IRR)`,
          `MWR = ${pc(r, 3)}`,
        ]);
    },
    () => {
      const v0 = 500000, vEnd1 = 540000, wd = 100000, vEnd2 = 470000;
      const h1 = hpr(v0, vEnd1);
      const h2 = hpr(vEnd1 - wd, vEnd2);
      const t = annualizeYears(linked([h1, h2]), 2);
      return Q("pm-mt-m5", "moyen", "Annualized time-weighted return?",
        [["Value at start", usd(v0)], ["Value at end of year 1", usd(vEnd1)], ["Withdrawal at end of year 1", usd(wd)], ["Value at end of year 2", usd(vEnd2)]],
        t * 100, "%", 2, [
          `HPR1 = ${amt(vEnd1)} / ${amt(v0)} − 1 = ${pc(h1)}`,
          `Après le retrait : ${amt(vEnd1)} − ${amt(wd)} = ${amt(vEnd1 - wd)} ; HPR2 = ${amt(vEnd2)} / ${amt(vEnd1 - wd)} − 1 = ${pc(h2, 3)}`,
          `TWR annuel = (${fx(1 + h1, 4)} × ${fx(1 + h2, 5)})^(1/2) − 1 = ${pc(t, 3)}`,
        ]);
    },
    () => {
      const p0 = 50, p1 = 60, p2 = 54, d = 2;
      const h1 = hpr(p0, p1, d);
      const h2 = hpr(p1, p2, d);
      const twr = annualizeYears(linked([h1, h2]), 2);
      const cfs = [-p0, -p1 + d, 2 * p2 + 2 * d];
      const mwr = irr(cfs);
      return Q("pm-mt-d1", "difficile", "MWR minus annualized TWR (percentage points)?",
        [["t = 0", `Buy 1 share at ${usd(p0)}`], ["t = 1", `Dividend ${usd(d)}/share; buy 1 more share at ${usd(p1)}`], ["t = 2", `Dividend ${usd(d)}/share; sell both shares at ${usd(p2)}`]],
        (mwr - twr) * 100, "%", 2, [
          `TWR : HPR1 = (${fx(p1)} + ${fx(d)} − ${fx(p0)}) / ${fx(p0)} = ${pc(h1)} ; HPR2 = (${fx(p2)} + ${fx(d)} − ${fx(p1)}) / ${fx(p1)} = ${pc(h2, 3)}`,
          `TWR annuel = (${fx(1 + h1, 4)} × ${fx(1 + h2, 5)})^(1/2) − 1 = ${pc(twr, 3)}`,
          `MWR : flux ${fx(cfs[0])} ; ${fx(cfs[1])} ; +${fx(cfs[2])} ⇒ IRR = ${pc(mwr, 3)}`,
          `Écart = ${pc(mwr, 3)} − ${pc(twr, 3)} : MWR plus bas, car tu as doublé la mise juste avant la mauvaise année 2.`,
        ]);
    },
    () => {
      const cfs = [-100000, -50000, 30000, 140000];
      const r = irr(cfs);
      return Q("pm-mt-d2", "difficile", "Money-weighted return (annual)?",
        [["t = 0", `Invest ${usd(100000)}`], ["t = 1", `Invest ${usd(50000)} more`], ["t = 2", `Withdraw ${usd(30000)}`], ["t = 3", `Ending value ${usd(140000)}`]],
        r * 100, "%", 2, [
          `Flux pour toi : ${cfs.map((c) => (c > 0 ? "+" : "") + amt(c)).join(" ; ")}`,
          "Le retrait est une entrée pour toi (+), comme la valeur finale.",
          `Σ CFt / (1 + r)^t = 0 (CF0 = ${amt(cfs[0])}, C01 = ${amt(cfs[1])}, C02 = ${amt(cfs[2])}, C03 = ${amt(cfs[3])}) ⇒ MWR = ${pc(r, 3)}`,
        ]);
    },
    () => {
      const rs = [0.04, -0.02, 0.05];
      const t = linked(rs);
      const years = 1.5;
      const a = annualizeYears(t, years);
      return Q("pm-mt-d3", "difficile", "Annualized time-weighted return?",
        [["Three consecutive 6-month returns", list(rs)]],
        a * 100, "%", 2, [
          `TWR total : ${factors(rs)} − 1 = ${pc(t, 3)}`,
          `3 semestres = ${fx(years)} an : (${fx(1 + t, 5)})^(1/${fx(years)}) − 1 = ${pc(a, 3)}`,
          "Piège : la racine est le nombre d'années (1.5), pas le nombre de sous-périodes (3).",
        ]);
    },
    () => {
      const c0 = 20000, c1 = 10000, r = 0.08;
      const ev = c0 * sq(1 + r) + c1 * (1 + r);
      return Q("pm-mt-d4", "difficile", "Ending value at t = 2 for an 8% money-weighted return?",
        [["Investment at t = 0", usd(c0)], ["Additional investment at t = 1", usd(c1)], ["Target MWR", pc(r)]],
        ev, "$", 0, [
          "Au taux de l'IRR, la valeur finale égale les apports capitalisés à ce taux.",
          `VF = ${amt(c0)} × ${fx(1 + r)}² + ${amt(c1)} × ${fx(1 + r)}`,
          `= ${amt(c0 * sq(1 + r))} + ${amt(c1 * (1 + r))} = ${amt(ev)}`,
        ]);
    },
    () => {
      const n0 = 100, p0 = 20, n1 = 50, p1 = 22, p2 = 21, d = 0.5;
      const cf0 = -n0 * p0;
      const cf1 = -n1 * p1 + n0 * d;
      const cf2 = (n0 + n1) * p2 + (n0 + n1) * d;
      const r = irr([cf0, cf1, cf2]);
      return Q("pm-mt-d5", "difficile", "Money-weighted return (annual)?",
        [["t = 0", `Buy ${n0} shares at ${usd(p0)}`], ["t = 1", `Dividend ${usd(d)}/share; buy ${n1} shares at ${usd(p1)}`], ["t = 2", `Dividend ${usd(d)}/share; sell ${n0 + n1} shares at ${usd(p2)}`]],
        r * 100, "%", 2, [
          `CF0 = −${n0} × ${fx(p0)} = ${amt(cf0)}`,
          `CF1 = −${n1} × ${fx(p1)} + ${n0} × ${fx(d)} = ${amt(cf1)} (dividende sur les ${n0} actions détenues)`,
          `CF2 = ${n0 + n1} × ${fx(p2)} + ${n0 + n1} × ${fx(d)} = ${amt(cf2)}`,
          `IRR de (${amt(cf0)} ; ${amt(cf1)} ; ${amt(cf2)}) ⇒ MWR = ${pc(r, 3)}`,
        ]);
    },
  ]),
};

// ===========================================================================
// 3. Moyenne, variance et écart-type historiques
// ===========================================================================

const T_HIST: CalcType = {
  key: "historical-stats",
  topic: "portfolio",
  name: "Moyenne, variance et écart-type historiques",
  tier: "essentiel",
  source: "LM Portfolio Risk and Return: Part I · LOS d (Schweser R83)",
  formulas: [
    "Moyenne : R̄ = ΣRt / T",
    "Variance d'échantillon : s² = Σ(Rt − R̄)² / (T − 1)",
    "Variance de population : σ² = Σ(Rt − μ)² / T",
    "Écart-type = √variance",
  ],
  traps: [
    "Données historiques = échantillon : divise par T − 1, sauf si l'énoncé dit « population ».",
    "Unités : 20.7 (%²) = 0.00207 en décimal, et √20.7 = 4.55%.",
  ],
  questions: build([
    () => {
      const rs = [0.07, -0.02, 0.04, 0.09, -0.03];
      const m = mean(rs);
      return Q("pm-hs-f1", "facile", "Mean annual return?",
        [["Annual returns", list(rs)]],
        m * 100, "%", 2, [
          `R̄ = (${sumExpr(rs)}) / ${rs.length}`,
          `= ${fx(sum(rs) * 100)} / ${rs.length} = ${pc(m)}`,
        ]);
    },
    () => {
      const v = 0.0324;
      const s = Math.sqrt(v);
      return Q("pm-hs-f2", "facile", "Standard deviation of returns?",
        [["Variance of returns", fx(v)]],
        s * 100, "%", 2, [
          `σ = √variance = √${fx(v)} = ${fx(s, 4)}`,
          `Soit ${pc(s)}`,
        ]);
    },
    () => {
      const s = 0.22;
      const v = sq(s);
      return Q("pm-hs-f3", "facile", "Variance of returns? (decimal)",
        [["Standard deviation of returns", pc(s)]],
        v, "", 4, [
          `Variance = σ² = ${fx(s)}² = ${fx(v, 4)}`,
          "Travaille en décimal : 22% = 0.22.",
        ]);
    },
    () => {
      const ssd = 96, T = 6;
      const v = ssd / (T - 1);
      return Q("pm-hs-f4", "facile", "Sample variance? (in %²)",
        [["Sum of squared deviations from the mean (%²)", fx(ssd)], ["Number of annual observations", String(T)]],
        v, "", 2, [
          "Échantillon : divise par T − 1",
          `s² = ${fx(ssd)} / (${T} − 1) = ${fx(v, 4)} (%²)`,
        ]);
    },
    () => {
      const rs = [0.04, 0.08, 0.06];
      const v = popVar(rs) * 1e4;
      return Q("pm-hs-f5", "facile", "Population variance? (in %²)",
        [["Returns (entire population)", list(rs)]],
        v, "", 2, [
          `μ = (${sumExpr(rs)}) / 3 = ${pc(mean(rs))}`,
          `σ² = [${sqDevExpr(rs)}] / 3 = ${fx(sumSqDev(rs) * 1e4)} / 3 = ${fx(v, 4)} (%²)`,
          "Population : divise par T, pas par T − 1.",
        ]);
    },
    () => {
      const rs = [0.1, -0.05, 0.08, 0.03];
      const s = Math.sqrt(sampleVar(rs));
      return Q("pm-hs-m1", "moyen", "Sample standard deviation?",
        [["Annual returns", list(rs)]],
        s * 100, "%", 2, [
          `R̄ = (${sumExpr(rs)}) / 4 = ${pc(mean(rs))}`,
          `Σ écarts² = ${sqDevExpr(rs)} = ${fx(sumSqDev(rs) * 1e4)}`,
          `s² = ${fx(sumSqDev(rs) * 1e4)} / 3 = ${fx(sampleVar(rs) * 1e4, 3)} (%²) ⇒ s = ${pc(s, 3)}`,
        ]);
    },
    () => {
      const rs = [0.12, -0.06, 0.04, 0.09, -0.04];
      const s = Math.sqrt(sampleVar(rs));
      return Q("pm-hs-m2", "moyen", "Sample standard deviation?",
        [["Annual returns", list(rs)]],
        s * 100, "%", 2, [
          `R̄ = (${sumExpr(rs)}) / 5 = ${pc(mean(rs))}`,
          `Σ écarts² = ${sqDevExpr(rs)} = ${fx(sumSqDev(rs) * 1e4)}`,
          `s² = ${fx(sumSqDev(rs) * 1e4)} / 4 = ${fx(sampleVar(rs) * 1e4, 3)} (%²) ⇒ s = ${pc(s, 3)}`,
        ]);
    },
    () => {
      const rs = [0.15, 0.05, -0.08];
      const v = sampleVar(rs);
      return Q("pm-hs-m3", "moyen", "Sample variance? (decimal)",
        [["Annual returns", list(rs)]],
        v, "", 4, [
          `R̄ = (${fx(rs[0])} + ${fx(rs[1])} ${MINUS} ${fx(-rs[2])}) / 3 = ${fx(mean(rs))}`,
          `Écarts : ${devs(rs).map((d) => fx(d)).join(" ; ")} ⇒ Σ écarts² = ${fx(sumSqDev(rs), 4)}`,
          `s² = ${fx(sumSqDev(rs), 4)} / 2 = ${fx(v, 4)}`,
        ]);
    },
    () => {
      const known = [0.08, -0.02, 0.06];
      const m = 0.05;
      const r4 = 4 * m - sum(known);
      return Q("pm-hs-m4", "moyen", "Year 4 return?",
        [["Years 1 to 3 returns", list(known)], ["Mean return over 4 years", pc(m)]],
        r4 * 100, "%", 2, [
          `Somme des 4 rendements = 4 × ${pc(m)} = ${pc(4 * m)}`,
          `R4 = ${pc(4 * m)} − (${sumExpr(known)}) = ${pc(4 * m)} − ${pc(sum(known))} = ${pc(r4)}`,
        ]);
    },
    () => {
      const rs = [0.06, 0.02, -0.01, 0.09];
      const s = Math.sqrt(popVar(rs));
      return Q("pm-hs-m5", "moyen", "Population standard deviation?",
        [["Returns (entire population)", list(rs)]],
        s * 100, "%", 2, [
          `μ = (${sumExpr(rs)}) / 4 = ${pc(mean(rs))}`,
          `Σ écarts² = ${sqDevExpr(rs)} = ${fx(sumSqDev(rs) * 1e4)}`,
          `σ² = ${fx(sumSqDev(rs) * 1e4)} / 4 = ${fx(popVar(rs) * 1e4, 3)} (%²) ⇒ σ = ${pc(s, 3)}`,
        ]);
    },
    () => {
      const rs = [0.14, -0.06, 0.1, 0.06];
      const s = Math.sqrt(sampleVar(rs));
      const cv = s / mean(rs);
      return Q("pm-hs-d1", "difficile", "Coefficient of variation? (sample σ / mean)",
        [["Annual returns", list(rs)]],
        cv, "", 2, [
          `R̄ = (${sumExpr(rs)}) / 4 = ${pc(mean(rs))}`,
          `Σ écarts² = ${fx(sumSqDev(rs) * 1e4)} ⇒ s² = ${fx(sumSqDev(rs) * 1e4)} / 3 = ${fx(sampleVar(rs) * 1e4, 3)} ⇒ s = ${pc(s, 3)}`,
          `CV = s / R̄ = ${fx(s * 100, 3)} / ${fx(mean(rs) * 100)} = ${fx(cv, 4)}`,
          "Le CV mesure le risque par unité de rendement moyen.",
        ]);
    },
    () => {
      const pv = 18, T = 5;
      const sv = (pv * T) / (T - 1);
      const s = Math.sqrt(sv);
      return Q("pm-hs-d2", "difficile", "Sample standard deviation?",
        [["Variance computed by dividing by T (%²)", fx(pv)], ["Number of observations T", String(T)]],
        s, "%", 2, [
          `Remonte à la somme des écarts² : ${fx(pv)} × ${T} = ${fx(pv * T)}`,
          `Variance d'échantillon : ${fx(pv * T)} / (${T} − 1) = ${fx(sv, 3)} (%²)`,
          `s = √${fx(sv, 3)} = ${fx(s, 3)}%`,
        ]);
    },
    () => {
      const r1 = 0.09, r2 = -0.03, m = 0.05;
      const r3 = 3 * m - r1 - r2;
      const rs = [r1, r2, r3];
      const s = Math.sqrt(sampleVar(rs));
      return Q("pm-hs-d3", "difficile", "Sample standard deviation of the 3 returns?",
        [["Year 1 return", pc(r1)], ["Year 2 return", pc(r2)], ["Mean of the 3 annual returns", pc(m)]],
        s * 100, "%", 2, [
          `R3 = 3 × ${pc(m)} − ${pc(r1)} − (${pc(r2)}) = ${pc(r3)}`,
          `Écarts² : ${sqDevExpr(rs)} = ${fx(sumSqDev(rs) * 1e4)}`,
          `s² = ${fx(sumSqDev(rs) * 1e4)} / 2 = ${fx(sampleVar(rs) * 1e4, 3)} (%²) ⇒ s = ${pc(s, 3)}`,
        ]);
    },
    () => {
      const wA = 0.7;
      const a = [0.1, -0.04, 0.06];
      const b = [0.02, 0.06, 0.04];
      const p = a.map((x, i) => wA * x + (1 - wA) * b[i]);
      const s = Math.sqrt(sampleVar(p));
      return Q("pm-hs-d4", "difficile", "Sample standard deviation of the portfolio's returns?",
        [["Weights A / B", `${pc(wA, 0)} / ${pc(1 - wA, 0)}`], ["Asset A returns", list(a)], ["Asset B returns", list(b)]],
        s * 100, "%", 2, [
          `Rendements du portefeuille, année par année : ${list(p)}`,
          `Moyenne = ${pc(mean(p))} ; Σ écarts² = ${sqDevExpr(p)} = ${fx(sumSqDev(p) * 1e4, 3)}`,
          `s² = ${fx(sumSqDev(p) * 1e4, 3)} / 2 = ${fx(sampleVar(p) * 1e4, 3)} (%²) ⇒ s = ${pc(s, 3)}`,
        ]);
    },
    () => {
      const prices = [50, 55, 52.25, 54.34];
      const rs = [hpr(prices[0], prices[1]), hpr(prices[1], prices[2]), hpr(prices[2], prices[3])];
      const s = Math.sqrt(sampleVar(rs));
      return Q("pm-hs-d5", "difficile", "Sample standard deviation of annual returns?",
        [["Year-end prices, t = 0 to 3", prices.map((x) => usd(x)).join(", ")], ["Dividends", "none"]],
        s * 100, "%", 2, [
          `Rendements : ${fx(prices[1])}/${fx(prices[0])} − 1 = ${pc(rs[0])} ; ${fx(prices[2])}/${fx(prices[1])} − 1 = ${pc(rs[1])} ; ${fx(prices[3])}/${fx(prices[2])} − 1 = ${pc(rs[2])}`,
          `Moyenne = ${pc(mean(rs))} ; Σ écarts² = ${fx(sumSqDev(rs) * 1e4)}`,
          `s² = ${fx(sumSqDev(rs) * 1e4)} / 2 = ${fx(sampleVar(rs) * 1e4, 3)} (%²) ⇒ s = ${pc(s, 3)}`,
        ]);
    },
  ]),
};

// ===========================================================================
// 4. Covariance et corrélation
// ===========================================================================

const T_COV: CalcType = {
  key: "covariance-correlation",
  topic: "portfolio",
  name: "Covariance et corrélation",
  tier: "essentiel",
  source: "LM Portfolio Risk and Return: Part I · LOS d (Schweser R83)",
  formulas: [
    "Cov(1,2) = Σ(R1,t − R̄1)(R2,t − R̄2) / (n − 1)",
    "ρ(1,2) = Cov(1,2) / (σ1 σ2)",
    "Cov(1,2) = ρ(1,2) × σ1 × σ2",
    "−1 ≤ ρ ≤ +1 ; ρ sans unité, Cov en unités au carré (décimal ou %²)",
  ],
  traps: [
    "Si on te donne des variances, prends la racine avant de diviser.",
    "Ne mélange pas %² et décimal : 54 (%²) = 0.0054.",
  ],
  questions: build([
    () => {
      const c = 0.012, sA = 0.25, sB = 0.16;
      const r = corrOf(c, sA, sB);
      return Q("pm-cc-f1", "facile", "Correlation of returns?",
        [["Covariance(A, B)", fx(c)], ["σ of A", pc(sA)], ["σ of B", pc(sB)]],
        r, "", 2, [
          "ρ = Cov / (σA σB)",
          `= ${fx(c)} / (${fx(sA)} × ${fx(sB)}) = ${fx(c)} / ${fx(sA * sB)} = ${fx(r, 4)}`,
        ]);
    },
    () => {
      const r = 0.4, sA = 0.18, sB = 0.3;
      const c = covOf(r, sA, sB);
      return Q("pm-cc-f2", "facile", "Covariance of returns? (decimal)",
        [["Correlation(A, B)", fx(r)], ["σ of A", pc(sA)], ["σ of B", pc(sB)]],
        c, "", 4, [
          "Cov = ρ × σA × σB",
          `= ${fx(r)} × ${fx(sA)} × ${fx(sB)} = ${fx(c, 5)}`,
        ]);
    },
    () => {
      const r = -0.5, sA = 0.2, sB = 0.15;
      const c = covOf(r, sA, sB);
      return Q("pm-cc-f3", "facile", "Covariance of returns? (decimal)",
        [["Correlation(A, B)", fx(r)], ["σ of A", pc(sA)], ["σ of B", pc(sB)]],
        c, "", 4, [
          "Cov = ρ × σA × σB",
          `= (${fx(r)}) × ${fx(sA)} × ${fx(sB)} = ${fx(c, 5)}`,
          "Corrélation négative ⇒ covariance négative.",
        ]);
    },
    () => {
      const c = 0.0168, r = 0.6, sA = 0.2;
      const sB = c / (r * sA);
      return Q("pm-cc-f4", "facile", "Standard deviation of B?",
        [["Covariance(A, B)", fx(c)], ["Correlation(A, B)", fx(r)], ["σ of A", pc(sA)]],
        sB * 100, "%", 2, [
          "Cov = ρ σA σB ⇒ σB = Cov / (ρ σA)",
          `= ${fx(c)} / (${fx(r)} × ${fx(sA)}) = ${fx(c)} / ${fx(r * sA)} = ${fx(sB, 4)}, soit ${pc(sB)}`,
        ]);
    },
    () => {
      const c = 54, s1 = 9, s2 = 12;
      const r = corrOf(c, s1, s2);
      return Q("pm-cc-f5", "facile", "Correlation of returns?",
        [["Covariance (%²)", fx(c)], ["σ of asset 1", `${fx(s1)}%`], ["σ of asset 2", `${fx(s2)}%`]],
        r, "", 2, [
          "Tout est en points de % : ρ = Cov / (σ1 σ2) directement",
          `= ${fx(c)} / (${fx(s1)} × ${fx(s2)}) = ${fx(c)} / ${fx(s1 * s2)} = ${fx(r, 4)}`,
        ]);
    },
    () => {
      const vA = 0.0625, vB = 0.0144, c = 0.0096;
      const r = corrOf(c, Math.sqrt(vA), Math.sqrt(vB));
      return Q("pm-cc-m1", "moyen", "Correlation of returns?",
        [["Variance of A", fx(vA)], ["Variance of B", fx(vB)], ["Covariance(A, B)", fx(c)]],
        r, "", 2, [
          `σA = √${fx(vA)} = ${fx(Math.sqrt(vA))} ; σB = √${fx(vB)} = ${fx(Math.sqrt(vB))}`,
          `ρ = ${fx(c)} / (${fx(Math.sqrt(vA))} × ${fx(Math.sqrt(vB))}) = ${fx(c)} / ${fx(Math.sqrt(vA * vB))} = ${fx(r, 4)}`,
        ]);
    },
    () => {
      const a = [0.04, 0.1, 0.07];
      const b = [0.02, 0.08, 0.11];
      const c = sampleCov(a, b) * 1e4;
      return Q("pm-cc-m2", "moyen", "Sample covariance? (in %²)",
        [["Asset A returns", list(a)], ["Asset B returns", list(b)]],
        c, "", 2, [
          `Moyennes : R̄A = ${pc(mean(a))} ; R̄B = ${pc(mean(b))}`,
          `Écarts A : ${devs(a).map((d) => fx(d * 100)).join(" ; ")} — écarts B : ${devs(b).map((d) => fx(d * 100)).join(" ; ")}`,
          `Σ produits = ${devs(a).map((d, i) => `(${fx(d * 100)})(${fx(devs(b)[i] * 100)})`).join(" + ")} = ${fx(sumCross(a, b) * 1e4)}`,
          `Cov = ${fx(sumCross(a, b) * 1e4)} / (3 − 1) = ${fx(c, 3)} (%²)`,
        ]);
    },
    () => {
      const c = 0.0042, vA = 0.0196, sB = 0.15;
      const r = corrOf(c, Math.sqrt(vA), sB);
      return Q("pm-cc-m3", "moyen", "Correlation of returns?",
        [["Covariance(A, B)", fx(c)], ["Variance of A", fx(vA)], ["σ of B", pc(sB)]],
        r, "", 2, [
          `σA = √${fx(vA)} = ${fx(Math.sqrt(vA))}`,
          `ρ = ${fx(c)} / (${fx(Math.sqrt(vA))} × ${fx(sB)}) = ${fx(c)} / ${fx(Math.sqrt(vA) * sB)} = ${fx(r, 4)}`,
        ]);
    },
    () => {
      const vA = 0.04, vB = 0.0225, r = -0.3;
      const c = covOf(r, Math.sqrt(vA), Math.sqrt(vB));
      return Q("pm-cc-m4", "moyen", "Covariance of returns? (decimal)",
        [["Variance of A", fx(vA)], ["Variance of B", fx(vB)], ["Correlation(A, B)", fx(r)]],
        c, "", 4, [
          `σA = √${fx(vA)} = ${fx(Math.sqrt(vA))} ; σB = √${fx(vB)} = ${fx(Math.sqrt(vB))}`,
          `Cov = (${fx(r)}) × ${fx(Math.sqrt(vA))} × ${fx(Math.sqrt(vB))} = ${fx(c, 5)}`,
        ]);
    },
    () => {
      const c = 0.0144, r = 0.8, vA = 0.0324;
      const sA = Math.sqrt(vA);
      const sB = c / (r * sA);
      return Q("pm-cc-m5", "moyen", "Variance of B? (decimal)",
        [["Covariance(A, B)", fx(c)], ["Correlation(A, B)", fx(r)], ["Variance of A", fx(vA)]],
        sq(sB), "", 4, [
          `σA = √${fx(vA)} = ${fx(sA)}`,
          `σB = Cov / (ρ σA) = ${fx(c)} / (${fx(r)} × ${fx(sA)}) = ${fx(c)} / ${fx(r * sA)} = ${fx(sB, 4)}`,
          `Variance de B = ${fx(sB, 4)}² = ${fx(sq(sB), 5)}`,
        ]);
    },
    () => {
      const a = [0.06, -0.02, 0.08];
      const b = [0.03, 0.05, 0.1];
      const c = sampleCov(a, b);
      const r = c / Math.sqrt(sampleVar(a) * sampleVar(b));
      return Q("pm-cc-d1", "difficile", "Correlation of returns?",
        [["Asset A returns", list(a)], ["Asset B returns", list(b)]],
        r, "", 2, [
          `Moyennes : R̄A = ${pc(mean(a))} ; R̄B = ${pc(mean(b))}`,
          `s²A = ${fx(sumSqDev(a) * 1e4)} / 2 = ${fx(sampleVar(a) * 1e4)} ; s²B = ${fx(sumSqDev(b) * 1e4)} / 2 = ${fx(sampleVar(b) * 1e4)} (%²)`,
          `Cov = ${fx(sumCross(a, b) * 1e4)} / 2 = ${fx(c * 1e4)} (%²)`,
          `ρ = ${fx(c * 1e4)} / √(${fx(sampleVar(a) * 1e4)} × ${fx(sampleVar(b) * 1e4)}) = ${fx(c * 1e4)} / ${fx(Math.sqrt(sampleVar(a) * sampleVar(b)) * 1e4, 3)} = ${fx(r, 4)}`,
        ]);
    },
    () => {
      const r0 = 0.6, sA0 = 0.15, sA1 = 0.2, sB = 0.25;
      const c = covOf(r0, sA0, sB);
      const r1 = corrOf(c, sA1, sB);
      return Q("pm-cc-d2", "difficile", "New correlation?",
        [["Initial correlation(A, B)", fx(r0)], ["σ of A: initial → new", `${pc(sA0)} → ${pc(sA1)}`], ["σ of B (unchanged)", pc(sB)], ["Covariance", "unchanged"]],
        r1, "", 2, [
          `Covariance (inchangée) = ${fx(r0)} × ${fx(sA0)} × ${fx(sB)} = ${fx(c, 5)}`,
          `Nouvelle ρ = ${fx(c, 5)} / (${fx(sA1)} × ${fx(sB)}) = ${fx(c, 5)} / ${fx(sA1 * sB)} = ${fx(r1, 4)}`,
        ]);
    },
    () => {
      const eA = 0.05, eB = 0.12, vA = 0.0016, vB = 0.0225, c = -0.0018;
      const r = corrOf(c, Math.sqrt(vA), Math.sqrt(vB));
      return Q("pm-cc-d3", "difficile", "Correlation of returns?",
        [["E(R) of A / B", `${pc(eA)} / ${pc(eB)}`], ["Variance of A", fx(vA)], ["Variance of B", fx(vB)], ["Covariance(A, B)", fx(c)]],
        r, "", 2, [
          "Les rendements espérés ne servent à rien ici : donnée-piège.",
          `σA = √${fx(vA)} = ${fx(Math.sqrt(vA))} ; σB = √${fx(vB)} = ${fx(Math.sqrt(vB))}`,
          `ρ = ${fx(c)} / (${fx(Math.sqrt(vA))} × ${fx(Math.sqrt(vB))}) = ${fx(c)} / ${fx(Math.sqrt(vA * vB))} = ${fx(r, 4)}`,
        ]);
    },
    () => {
      const a = [0.1, 0.04, -0.02, 0.08, 0.05];
      const b = [0.06, 0.02, 0.01, 0.07, 0.04];
      const c = sampleCov(a, b);
      return Q("pm-cc-d4", "difficile", "Sample covariance? (decimal, 5 decimals)",
        [["Asset A returns", list(a)], ["Asset B returns", list(b)]],
        c, "", 5, [
          `Moyennes : R̄A = ${pc(mean(a))} ; R̄B = ${pc(mean(b))}`,
          `Σ produits des écarts (en points de %) = ${devs(a).map((d, i) => `(${fx(d * 100)})(${fx(devs(b)[i] * 100)})`).join(" + ")} = ${fx(sumCross(a, b) * 1e4)}`,
          `Cov = ${fx(sumCross(a, b) * 1e4)} / 4 = ${fx(c * 1e4, 3)} (%²)`,
          `En décimal : ${fx(c * 1e4, 3)} / 10,000 = ${fx(c, 6)}`,
        ]);
    },
    () => {
      const sA = 0.12, sB = 0.05, sM = 0.04, cAB = 0.0021, cAM = 0.003;
      const r = corrOf(cAB, sA, sB);
      return Q("pm-cc-d5", "difficile", "Correlation between A and B?",
        [["σ of A", pc(sA)], ["σ of B", pc(sB)], ["σ of the market", pc(sM)], ["Covariance(A, B)", fx(cAB)], ["Covariance(A, market)", fx(cAM)]],
        r, "", 2, [
          "Seules Cov(A, B), σA et σB servent : le marché est une donnée-piège.",
          `ρ(A,B) = ${fx(cAB)} / (${fx(sA)} × ${fx(sB)}) = ${fx(cAB)} / ${fx(sA * sB)} = ${fx(r, 4)}`,
        ]);
    },
  ]),
};

// ===========================================================================
// 5. Portefeuille à 2 actifs : rendement espéré et écart-type
// ===========================================================================

const T_TWO: CalcType = {
  key: "two-asset-portfolio",
  topic: "portfolio",
  name: "Portefeuille à 2 actifs : rendement et écart-type",
  tier: "essentiel",
  source: "LM Portfolio Risk and Return: Part I · LOS e (Schweser R83)",
  formulas: [
    "E(Rp) = w1 E(R1) + w2 E(R2), avec w2 = 1 − w1",
    "σp² = w1²σ1² + w2²σ2² + 2 w1 w2 Cov(1,2)",
    "Avec Cov = ρ σ1 σ2 : σp = √(w1²σ1² + w2²σ2² + 2 w1 w2 ρ σ1 σ2)",
  ],
  traps: [
    "Mets les poids au carré en même temps que les écarts-types.",
    "Le terme croisé compte deux fois : 2 w1 w2 Cov.",
    "Poids = valeur investie / valeur totale (pas le nombre d'actions).",
  ],
  questions: build([
    () => {
      const w = 0.4, eA = 0.14, eB = 0.18;
      const e = wavg([w, 1 - w], [eA, eB]);
      return Q("pm-2a-f1", "facile", "Expected portfolio return?",
        [["Weight in A / B", `${pc(w, 0)} / ${pc(1 - w, 0)}`], ["E(R) of A", pc(eA)], ["E(R) of B", pc(eB)]],
        e * 100, "%", 2, [
          "E(Rp) = wA E(RA) + wB E(RB)",
          `= ${fx(w)} × ${pc(eA)} + ${fx(1 - w)} × ${pc(eB)} = ${pc(w * eA)} + ${pc((1 - w) * eB)} = ${pc(e)}`,
        ]);
    },
    () => {
      const w = 0.6, sA = 0.2, sB = 0.1, r = 0.3;
      const v = var2(w, sA, sB, r);
      return Q("pm-2a-f2", "facile", "Portfolio standard deviation?",
        [["Weight in A / B", `${pc(w, 0)} / ${pc(1 - w, 0)}`], ["σ of A", pc(sA)], ["σ of B", pc(sB)], ["Correlation", fx(r)]],
        Math.sqrt(v) * 100, "%", 2, [
          `σp² = ${fx(w)}² × ${fx(sA)}² + ${fx(1 - w)}² × ${fx(sB)}² + 2 × ${fx(w)} × ${fx(1 - w)} × ${fx(r)} × ${fx(sA)} × ${fx(sB)}`,
          `= ${fx(sq(w * sA), 5)} + ${fx(sq((1 - w) * sB), 5)} + ${fx(2 * w * (1 - w) * r * sA * sB, 5)} = ${fx(v, 5)}`,
          `σp = √${fx(v, 5)} = ${pc(Math.sqrt(v), 3)}`,
        ]);
    },
    () => {
      const w = 0.6, sA = 0.3, sB = 0.2, c = 0.018;
      const v = var2c(w, sq(sA), sq(sB), c);
      return Q("pm-2a-f3", "facile", "Portfolio variance? (decimal)",
        [["Weight in A / B", `${pc(w, 0)} / ${pc(1 - w, 0)}`], ["σ of A", pc(sA)], ["σ of B", pc(sB)], ["Covariance(A, B)", fx(c)]],
        v, "", 4, [
          `σp² = ${fx(w)}² × ${fx(sA)}² + ${fx(1 - w)}² × ${fx(sB)}² + 2 × ${fx(w)} × ${fx(1 - w)} × ${fx(c)}`,
          `= ${fx(sq(w) * sq(sA), 5)} + ${fx(sq(1 - w) * sq(sB), 5)} + ${fx(2 * w * (1 - w) * c, 5)} = ${fx(v, 5)}`,
        ]);
    },
    () => {
      const target = 0.1, eA = 0.08, eB = 0.13;
      const w = (eB - target) / (eB - eA);
      return Q("pm-2a-f4", "facile", "Weight in A for an expected return of 10%?",
        [["E(R) of A", pc(eA)], ["E(R) of B", pc(eB)], ["Target E(Rp)", pc(target)]],
        w * 100, "%", 2, [
          `${pc(target)} = wA × ${pc(eA)} + (1 − wA) × ${pc(eB)}`,
          `wA = (${pc(eB)} − ${pc(target)}) / (${pc(eB)} − ${pc(eA)}) = ${fx((eB - target) * 100)} / ${fx((eB - eA) * 100)} = ${pc(w)}`,
        ]);
    },
    () => {
      const w = 0.5, sA = 0.3, sB = 0.2, r = 0;
      const v = var2(w, sA, sB, r);
      return Q("pm-2a-f5", "facile", "Portfolio standard deviation?",
        [["Weight in A / B", "50% / 50%"], ["σ of A", pc(sA)], ["σ of B", pc(sB)], ["Correlation", "0"]],
        Math.sqrt(v) * 100, "%", 2, [
          "ρ = 0 : le terme croisé disparaît",
          `σp² = ${fx(w)}² × ${fx(sA)}² + ${fx(1 - w)}² × ${fx(sB)}² = ${fx(sq(w * sA), 5)} + ${fx(sq((1 - w) * sB), 5)} = ${fx(v, 5)}`,
          `σp = √${fx(v, 5)} = ${pc(Math.sqrt(v), 3)}`,
        ]);
    },
    () => {
      const w = 0.7, vA = 0.0324, vB = 0.0064, c = 0.005;
      const v = var2c(w, vA, vB, c);
      return Q("pm-2a-m1", "moyen", "Portfolio standard deviation?",
        [["Weight in stocks / bonds", `${pc(w, 0)} / ${pc(1 - w, 0)}`], ["Variance of stocks", fx(vA)], ["Variance of bonds", fx(vB)], ["Covariance", fx(c)]],
        Math.sqrt(v) * 100, "%", 2, [
          `σp² = ${fx(w)}² × ${fx(vA)} + ${fx(1 - w)}² × ${fx(vB)} + 2 × ${fx(w)} × ${fx(1 - w)} × ${fx(c)}`,
          `= ${fx(sq(w) * vA, 6)} + ${fx(sq(1 - w) * vB, 6)} + ${fx(2 * w * (1 - w) * c, 6)} = ${fx(v, 6)}`,
          `σp = √${fx(v, 6)} = ${pc(Math.sqrt(v), 3)} (les variances se prennent telles quelles, sans les remettre au carré)`,
        ]);
    },
    () => {
      const w = 0.35, sA = 0.18, sB = 0.09, r = -0.6;
      const v = var2(w, sA, sB, r);
      return Q("pm-2a-m2", "moyen", "Portfolio standard deviation?",
        [["Weight in A / B", `${pc(w, 0)} / ${pc(1 - w, 0)}`], ["σ of A", pc(sA)], ["σ of B", pc(sB)], ["Correlation", fx(r)]],
        Math.sqrt(v) * 100, "%", 2, [
          `w²σ² : ${fx(w)}² × ${fx(sA)}² = ${fx(sq(w * sA), 6)} ; ${fx(1 - w)}² × ${fx(sB)}² = ${fx(sq((1 - w) * sB), 6)}`,
          `Terme croisé : 2 × ${fx(w)} × ${fx(1 - w)} × (${fx(r)}) × ${fx(sA)} × ${fx(sB)} = ${fx(2 * w * (1 - w) * r * sA * sB, 6)}`,
          `σp² = ${fx(v, 6)} ⇒ σp = ${pc(Math.sqrt(v), 3)}`,
        ]);
    },
    () => {
      const vA$ = 300000, vB$ = 200000, sA = 0.24, sB = 0.14, r = 0.25;
      const w = vA$ / (vA$ + vB$);
      const v = var2(w, sA, sB, r);
      return Q("pm-2a-m3", "moyen", "Portfolio standard deviation?",
        [["Amount in A", usd(vA$)], ["Amount in B", usd(vB$)], ["σ of A", pc(sA)], ["σ of B", pc(sB)], ["Correlation", fx(r)]],
        Math.sqrt(v) * 100, "%", 2, [
          `Poids : wA = ${amt(vA$)} / ${amt(vA$ + vB$)} = ${fx(w)} ; wB = ${fx(1 - w)}`,
          `σp² = ${fx(sq(w * sA), 6)} + ${fx(sq((1 - w) * sB), 6)} + 2 × ${fx(w)} × ${fx(1 - w)} × ${fx(r)} × ${fx(sA)} × ${fx(sB)} = ${fx(v, 6)}`,
          `σp = √${fx(v, 6)} = ${pc(Math.sqrt(v), 3)}`,
        ]);
    },
    () => {
      const amts = [50000, 30000, 20000];
      const es = [0.06, 0.1, 0.14];
      const tot = sum(amts);
      const ws = amts.map((a) => a / tot);
      const e = wavg(ws, es);
      return Q("pm-2a-m4", "moyen", "Expected portfolio return?",
        [["Amounts in A / B / C", amts.map((a) => usd(a)).join(" / ")], ["E(R) of A / B / C", list(es)]],
        e * 100, "%", 2, [
          `Poids : ${ws.map((w) => fx(w)).join(" / ")} (sur ${amt(tot)})`,
          `E(Rp) = ${ws.map((w, i) => `${fx(w)} × ${pc(es[i])}`).join(" + ")} = ${pc(e)}`,
        ]);
    },
    () => {
      const vA = 400, vB = 100, r = 0.2, w = 0.5;
      const v = var2c(w, vA, vB, r * Math.sqrt(vA * vB));
      return Q("pm-2a-m5", "moyen", "Portfolio standard deviation?",
        [["Weight in A / B", "50% / 50%"], ["Variance of A (%²)", fx(vA)], ["Variance of B (%²)", fx(vB)], ["Correlation", fx(r)]],
        Math.sqrt(v), "%", 2, [
          `σA = √${fx(vA)} = ${fx(Math.sqrt(vA))}% ; σB = √${fx(vB)} = ${fx(Math.sqrt(vB))}%`,
          `σp² = ${fx(w)}² × ${fx(vA)} + ${fx(w)}² × ${fx(vB)} + 2 × ${fx(w)} × ${fx(w)} × ${fx(r)} × ${fx(Math.sqrt(vA))} × ${fx(Math.sqrt(vB))} = ${fx(v, 3)} (%²)`,
          `σp = √${fx(v, 3)} = ${fx(Math.sqrt(v), 3)}%`,
        ]);
    },
    () => {
      const sOld = 0.12, wNew = 0.25, sNew = 0.2, c = 0.006;
      const v = var2c(1 - wNew, sq(sOld), sq(sNew), c);
      return Q("pm-2a-d1", "difficile", "Standard deviation of the new portfolio?",
        [["Current portfolio σ", pc(sOld)], ["Share replaced by the new security", pc(wNew, 0)], ["σ of the new security", pc(sNew)], ["Covariance(current, new)", fx(c)]],
        Math.sqrt(v) * 100, "%", 2, [
          `Nouveau portefeuille : ${pc(1 - wNew, 0)} de l'ancien + ${pc(wNew, 0)} du nouveau titre`,
          `σ² = ${fx(1 - wNew)}² × ${fx(sOld)}² + ${fx(wNew)}² × ${fx(sNew)}² + 2 × ${fx(1 - wNew)} × ${fx(wNew)} × ${fx(c)}`,
          `= ${fx(sq((1 - wNew) * sOld), 6)} + ${fx(sq(wNew * sNew), 6)} + ${fx(2 * (1 - wNew) * wNew * c, 6)} = ${fx(v, 6)}`,
          `σ = √${fx(v, 6)} = ${pc(Math.sqrt(v), 3)}`,
        ]);
    },
    () => {
      const w = 0.5, sA = 0.2, sB = 0.3, target = 0.2;
      const base = sq(w * sA) + sq((1 - w) * sB);
      const cross = 2 * w * (1 - w) * sA * sB;
      const r = (sq(target) - base) / cross;
      return Q("pm-2a-d2", "difficile", "Correlation that gives a portfolio σ of 20%?",
        [["Weight in A / B", "50% / 50%"], ["σ of A", pc(sA)], ["σ of B", pc(sB)], ["Target portfolio σ", pc(target)]],
        r, "", 2, [
          `σp² visé = ${fx(target)}² = ${fx(sq(target), 4)}`,
          `Termes sans ρ : ${fx(sq(w * sA), 4)} + ${fx(sq((1 - w) * sB), 4)} = ${fx(base, 4)} ; terme croisé = ρ × 2 × ${fx(w)} × ${fx(1 - w)} × ${fx(sA)} × ${fx(sB)} = ρ × ${fx(cross, 4)}`,
          `ρ = (${fx(sq(target), 4)} − ${fx(base, 4)}) / ${fx(cross, 4)} = ${fx(r, 4)}`,
        ]);
    },
    () => {
      const w = 0.6, sA = 0.2, sB = 0.25, rHi = 0.8, rLo = 0.2;
      const sHi = Math.sqrt(var2(w, sA, sB, rHi));
      const sLo = Math.sqrt(var2(w, sA, sB, rLo));
      return Q("pm-2a-d3", "difficile", "Fall in portfolio σ when correlation drops from 0.8 to 0.2 (percentage points)?",
        [["Weight in A / B", `${pc(w, 0)} / ${pc(1 - w, 0)}`], ["σ of A", pc(sA)], ["σ of B", pc(sB)]],
        (sHi - sLo) * 100, "%", 2, [
          `Termes communs : ${fx(w)}² × ${fx(sA)}² + ${fx(1 - w)}² × ${fx(sB)}² = ${fx(sq(w * sA) + sq((1 - w) * sB), 4)} ; 2 w1 w2 σ1 σ2 = ${fx(2 * w * (1 - w) * sA * sB, 4)}`,
          `ρ = ${fx(rHi)} : σp² = ${fx(var2(w, sA, sB, rHi), 4)} ⇒ σp = ${pc(sHi, 3)}`,
          `ρ = ${fx(rLo)} : σp² = ${fx(var2(w, sA, sB, rLo), 4)} ⇒ σp = ${pc(sLo, 3)}`,
          `Baisse = ${pc(sHi, 3)} − ${pc(sLo, 3)}`,
        ]);
    },
    () => {
      const nA = 1000, pA = 30, nB = 500, pB = 40, eA = 0.12, sA = 0.25, sB = 0.15, r = 0.35;
      const w = (nA * pA) / (nA * pA + nB * pB);
      const v = var2(w, sA, sB, r);
      return Q("pm-2a-d4", "difficile", "Portfolio standard deviation?",
        [["Holding in A", `${amt(nA)} shares at ${usd(pA)}`], ["Holding in B", `${amt(nB)} shares at ${usd(pB)}`], ["E(R) of A", pc(eA)], ["σ of A / B", `${pc(sA)} / ${pc(sB)}`], ["Correlation", fx(r)]],
        Math.sqrt(v) * 100, "%", 2, [
          `Valeurs : ${amt(nA * pA)} et ${amt(nB * pB)} ⇒ wA = ${fx(w)} ; wB = ${fx(1 - w)} (le nombre d'actions ne donne pas le poids)`,
          `σp² = ${fx(sq(w * sA), 5)} + ${fx(sq((1 - w) * sB), 5)} + 2 × ${fx(w)} × ${fx(1 - w)} × ${fx(r)} × ${fx(sA)} × ${fx(sB)} = ${fx(v, 5)}`,
          `σp = √${fx(v, 5)} = ${pc(Math.sqrt(v), 3)} ; E(RA) ne sert pas.`,
        ]);
    },
    () => {
      const target = 0.11, eA = 0.08, sA = 0.1, eB = 0.14, sB = 0.22, r = 0.2;
      const w = (eB - target) / (eB - eA);
      const v = var2(w, sA, sB, r);
      return Q("pm-2a-d5", "difficile", "σ of the portfolio that targets an 11% expected return?",
        [["Asset A: E(R) / σ", `${pc(eA)} / ${pc(sA)}`], ["Asset B: E(R) / σ", `${pc(eB)} / ${pc(sB)}`], ["Correlation", fx(r)], ["Target E(Rp)", pc(target)]],
        Math.sqrt(v) * 100, "%", 2, [
          `Poids : wA = (${pc(eB)} − ${pc(target)}) / (${pc(eB)} − ${pc(eA)}) = ${fx(w)} ; wB = ${fx(1 - w)}`,
          `σp² = ${fx(sq(w * sA), 5)} + ${fx(sq((1 - w) * sB), 5)} + 2 × ${fx(w)} × ${fx(1 - w)} × ${fx(r)} × ${fx(sA)} × ${fx(sB)} = ${fx(v, 5)}`,
          `σp = √${fx(v, 5)} = ${pc(Math.sqrt(v), 3)}`,
        ]);
    },
  ]),
};

// ===========================================================================
// 6. Corrélation et diversification
// ===========================================================================

const T_DIVERS: CalcType = {
  key: "diversification",
  topic: "portfolio",
  name: "Corrélation et diversification (ρ = ±1, ratio de diversification)",
  tier: "annexe",
  source: "LM Portfolio Risk and Return: Part I · LOS f ; Portfolio Management: An Overview (ratio de diversification)",
  formulas: [
    "ρ = +1 : σp = w1σ1 + w2σ2 (simple moyenne pondérée, aucun gain)",
    "ρ = −1 : σp = |w1σ1 − w2σ2| ; σp = 0 si w1 = σ2 / (σ1 + σ2)",
    "ρ = 0 : σp = √(w1²σ1² + w2²σ2²)",
    "Ratio de diversification = σ du portefeuille équipondéré / σ moyen d'un titre seul",
  ],
  traps: [
    "La diversification réduit le risque dès que ρ < +1 ; le portefeuille sans risque n'existe qu'avec ρ = −1.",
    "Plus le ratio de diversification est bas, plus le gain de diversification est grand.",
  ],
  questions: build([
    () => {
      const w = 0.4, sA = 0.15, sB = 0.25;
      const s = w * sA + (1 - w) * sB;
      return Q("pm-dv-f1", "facile", "Portfolio σ if the correlation is +1?",
        [["Weight in A / B", `${pc(w, 0)} / ${pc(1 - w, 0)}`], ["σ of A", pc(sA)], ["σ of B", pc(sB)]],
        s * 100, "%", 2, [
          "ρ = +1 : σp est la moyenne pondérée des σ",
          `σp = ${fx(w)} × ${pc(sA)} + ${fx(1 - w)} × ${pc(sB)} = ${pc(w * sA)} + ${pc((1 - w) * sB)} = ${pc(s)}`,
        ]);
    },
    () => {
      const sEW = 0.168, sAvg = 0.24;
      const dr = sEW / sAvg;
      return Q("pm-dv-f2", "facile", "Diversification ratio?",
        [["σ of the equally weighted portfolio", pc(sEW)], ["Average σ of a single security", pc(sAvg)]],
        dr, "", 2, [
          "Ratio = σ du portefeuille équipondéré / σ moyen d'un titre",
          `= ${pc(sEW)} / ${pc(sAvg)} = ${fx(dr, 4)} : le portefeuille garde ${pc(dr, 0)} du risque d'un titre seul`,
        ]);
    },
    () => {
      const w = 0.5, sA = 0.2, sB = 0.12;
      const s = Math.abs(w * sA - (1 - w) * sB);
      return Q("pm-dv-f3", "facile", "Portfolio σ if the correlation is −1?",
        [["Weight in A / B", "50% / 50%"], ["σ of A", pc(sA)], ["σ of B", pc(sB)]],
        s * 100, "%", 2, [
          "ρ = −1 : σp = |wAσA − wBσB|",
          `= |${fx(w)} × ${pc(sA)} − ${fx(1 - w)} × ${pc(sB)}| = |${pc(w * sA)} − ${pc((1 - w) * sB)}| = ${pc(s)}`,
        ]);
    },
    () => {
      const w = 0.5, sA = 0.12, sB = 0.16;
      const s = Math.sqrt(var2(w, sA, sB, 0));
      return Q("pm-dv-f4", "facile", "Portfolio σ if the correlation is 0?",
        [["Weight in A / B", "50% / 50%"], ["σ of A", pc(sA)], ["σ of B", pc(sB)]],
        s * 100, "%", 2, [
          "ρ = 0 : σp = √(wA²σA² + wB²σB²)",
          `= √(${fx(sq(w * sA), 4)} + ${fx(sq((1 - w) * sB), 4)}) = √${fx(var2(w, sA, sB, 0), 4)} = ${pc(s)}`,
        ]);
    },
    () => {
      const sA = 0.3, sB = 0.2;
      const wA = sB / (sA + sB);
      return Q("pm-dv-f5", "facile", "Weight in A for a zero-variance portfolio? (ρ = −1)",
        [["σ of A", pc(sA)], ["σ of B", pc(sB)], ["Correlation", "−1"]],
        wA * 100, "%", 2, [
          "Variance nulle si wAσA = wBσB, soit wA = σB / (σA + σB)",
          `= ${pc(sB)} / (${pc(sA)} + ${pc(sB)}) = ${pc(wA)}`,
        ]);
    },
    () => {
      const vA = 0.0144, vB = 0.0576, w = 0.3;
      const s = w * Math.sqrt(vA) + (1 - w) * Math.sqrt(vB);
      return Q("pm-dv-m1", "moyen", "Portfolio σ? (perfectly positively correlated)",
        [["Weight in A / B", `${pc(w, 0)} / ${pc(1 - w, 0)}`], ["Variance of A", fx(vA)], ["Variance of B", fx(vB)]],
        s * 100, "%", 2, [
          `σA = √${fx(vA)} = ${pc(Math.sqrt(vA))} ; σB = √${fx(vB)} = ${pc(Math.sqrt(vB))}`,
          `ρ = +1 : σp = ${fx(w)} × ${pc(Math.sqrt(vA))} + ${fx(1 - w)} × ${pc(Math.sqrt(vB))} = ${pc(s)}`,
        ]);
    },
    () => {
      const w = 0.5, sA = 0.25, sB = 0.18, r = 0.3;
      const sHi = w * sA + (1 - w) * sB;
      const sLo = Math.sqrt(var2(w, sA, sB, r));
      return Q("pm-dv-m2", "moyen", "Risk reduction vs. ρ = +1 (percentage points)?",
        [["Weight in A / B", "50% / 50%"], ["σ of A", pc(sA)], ["σ of B", pc(sB)], ["Actual correlation", fx(r)]],
        (sHi - sLo) * 100, "%", 2, [
          `ρ = +1 : σp = ${fx(w)} × ${pc(sA)} + ${fx(1 - w)} × ${pc(sB)} = ${pc(sHi)}`,
          `ρ = ${fx(r)} : σp² = ${fx(sq(w * sA), 6)} + ${fx(sq((1 - w) * sB), 4)} + 2 × ${fx(w)} × ${fx(1 - w)} × ${fx(r)} × ${fx(sA)} × ${fx(sB)} = ${fx(var2(w, sA, sB, r), 6)} ⇒ σp = ${pc(sLo, 3)}`,
          `Gain de diversification = ${pc(sHi)} − ${pc(sLo, 3)}`,
        ]);
    },
    () => {
      const w = 0.5, sA = 0.3, sB = 0.2;
      const hi = w * sA + (1 - w) * sB;
      const lo = Math.abs(w * sA - (1 - w) * sB);
      return Q("pm-dv-m3", "moyen", "σp at ρ = +1 minus σp at ρ = −1 (percentage points)?",
        [["Weight in A / B", "50% / 50%"], ["σ of A", pc(sA)], ["σ of B", pc(sB)]],
        (hi - lo) * 100, "%", 2, [
          `ρ = +1 : σp = ${pc(w * sA)} + ${pc((1 - w) * sB)} = ${pc(hi)}`,
          `ρ = −1 : σp = |${pc(w * sA)} − ${pc((1 - w) * sB)}| = ${pc(lo)}`,
          `Écart = ${pc(hi)} − ${pc(lo)} : toute la plage possible selon la corrélation`,
        ]);
    },
    () => {
      const sA = 0.18, sB = 0.27, eA = 0.07, eB = 0.12;
      const wA = sB / (sA + sB);
      const e = wavg([wA, 1 - wA], [eA, eB]);
      return Q("pm-dv-m4", "moyen", "Expected return of the zero-variance portfolio? (ρ = −1)",
        [["Asset A: E(R) / σ", `${pc(eA)} / ${pc(sA)}`], ["Asset B: E(R) / σ", `${pc(eB)} / ${pc(sB)}`], ["Correlation", "−1"]],
        e * 100, "%", 2, [
          `wA = σB / (σA + σB) = ${pc(sB)} / ${pc(sA + sB)} = ${fx(wA)} ; wB = ${fx(1 - wA)}`,
          `E(R) = ${fx(wA)} × ${pc(eA)} + ${fx(1 - wA)} × ${pc(eB)} = ${pc(e)}`,
        ]);
    },
    () => {
      const dr = 0.65, sAvg = 0.32;
      const s = dr * sAvg;
      return Q("pm-dv-m5", "moyen", "σ of the equally weighted portfolio?",
        [["Diversification ratio", fx(dr)], ["Average σ of a single security", pc(sAvg)]],
        s * 100, "%", 2, [
          "Ratio = σ(équipondéré) / σ moyen ⇒ σ(équipondéré) = ratio × σ moyen",
          `= ${fx(dr)} × ${pc(sAvg)} = ${pc(s)}`,
        ]);
    },
    () => {
      const sA = 0.2, sB = 0.3, r = 0.1, w = 0.5;
      const sEW = Math.sqrt(var2(w, sA, sB, r));
      const sAvg = (sA + sB) / 2;
      const dr = sEW / sAvg;
      return Q("pm-dv-d1", "difficile", "Diversification ratio of the equally weighted portfolio?",
        [["σ of A", pc(sA)], ["σ of B", pc(sB)], ["Correlation", fx(r)]],
        dr, "", 2, [
          `σ équipondéré : σp² = ${fx(sq(w * sA), 4)} + ${fx(sq(w * sB), 4)} + 2 × ${fx(w)} × ${fx(w)} × ${fx(r)} × ${fx(sA)} × ${fx(sB)} = ${fx(var2(w, sA, sB, r), 4)} ⇒ σp = ${pc(sEW, 3)}`,
          `σ moyen d'un titre = (${pc(sA)} + ${pc(sB)}) / 2 = ${pc(sAvg)}`,
          `Ratio = ${pc(sEW, 3)} / ${pc(sAvg)} = ${fx(dr, 4)}`,
        ]);
    },
    () => {
      const sA = 0.24, sB = 0.16, eA = 0.13, eB = 0.08, rf = 0.04;
      const wA = sB / (sA + sB);
      const e = wavg([wA, 1 - wA], [eA, eB]);
      return Q("pm-dv-d2", "difficile", "Expected return of the zero-variance portfolio?",
        [["Asset A: E(R) / σ", `${pc(eA)} / ${pc(sA)}`], ["Asset B: E(R) / σ", `${pc(eB)} / ${pc(sB)}`], ["Correlation", "−1"], ["Risk-free rate", pc(rf)]],
        e * 100, "%", 2, [
          `Poids sans risque : wA = σB / (σA + σB) = ${pc(sB)} / ${pc(sA + sB)} = ${fx(wA)}`,
          `E(R) = ${fx(wA)} × ${pc(eA)} + ${fx(1 - wA)} × ${pc(eB)} = ${pc(e)}`,
          "Le taux sans risque est une donnée-piège (un tel portefeuille rapporterait plus que Rf : opportunité d'arbitrage).",
        ]);
    },
    () => {
      const sA = 0.2, sB = 0.1, target = 0.04;
      const wA = (target + sB) / (sA + sB);
      const w0 = sB / (sA + sB);
      return Q("pm-dv-d3", "difficile", "Weight in A for σp = 4%? (ρ = −1, wA above the zero-variance weight)",
        [["σ of A", pc(sA)], ["σ of B", pc(sB)], ["Correlation", "−1"], ["Target portfolio σ", pc(target)]],
        wA * 100, "%", 2, [
          `Poids de variance nulle : σB / (σA + σB) = ${pc(w0)} ; au-dessus, σp = wAσA − (1 − wA)σB`,
          `${pc(target)} = wA × ${pc(sA)} − (1 − wA) × ${pc(sB)} ⇒ wA × ${pc(sA + sB)} = ${pc(target + sB)}`,
          `wA = ${pc(target + sB)} / ${pc(sA + sB)} = ${pc(wA, 3)}`,
        ]);
    },
    () => {
      const s = 0.2, r = 0.4, w = 0.5;
      const sNew = Math.sqrt(var2(w, s, s, r));
      return Q("pm-dv-d4", "difficile", "Reduction in σ (percentage points)?",
        [["Current portfolio σ", pc(s)], ["New asset σ (same)", pc(s)], ["Correlation(new, current)", fx(r)], ["Share moved into the new asset", "50%"]],
        (s - sNew) * 100, "%", 2, [
          `Nouveau σ² = 2 × ${fx(w)}² × ${fx(s)}² + 2 × ${fx(w)} × ${fx(w)} × ${fx(r)} × ${fx(s)} × ${fx(s)} = ${fx(2 * sq(w * s), 4)} + ${fx(2 * w * w * r * s * s, 4)} = ${fx(sq(sNew), 4)}`,
          `Nouveau σ = √${fx(sq(sNew), 4)} = ${pc(sNew, 3)}`,
          `Baisse = ${pc(s)} − ${pc(sNew, 3)} : même σ, mais ρ < 1, donc le risque baisse`,
        ]);
    },
    () => {
      const w = 0.7, sA = 0.1, sB = 0.3;
      const lo = Math.abs(w * sA - (1 - w) * sB);
      return Q("pm-dv-d5", "difficile", "Lowest portfolio σ possible, whatever the correlation?",
        [["Weight in A / B", `${pc(w, 0)} / ${pc(1 - w, 0)}`], ["σ of A", pc(sA)], ["σ of B", pc(sB)]],
        lo * 100, "%", 2, [
          "À poids fixés, le σ minimal est atteint pour ρ = −1",
          `σp = |${fx(w)} × ${pc(sA)} − ${fx(1 - w)} × ${pc(sB)}| = |${pc(w * sA)} − ${pc((1 - w) * sB)}| = ${pc(lo)}`,
          `Pas zéro : ces poids ne sont pas ceux de variance nulle (${pc(sB / (sA + sB))} dans A).`,
        ]);
    },
  ]),
};

// ===========================================================================
// 7. Utilité et aversion au risque
// ===========================================================================

const T_UTILITY: CalcType = {
  key: "utility",
  topic: "portfolio",
  name: "Utilité et aversion au risque (U = E(R) − ½Aσ²)",
  tier: "annexe",
  source: "LM Portfolio Risk and Return: Part I · LOS b-c (formule du texte CFA ; le résumé Schweser n'en garde que l'intuition)",
  formulas: [
    "U = E(R) − ½ × A × σ² (E(R) et σ en décimal)",
    "A > 0 : averse au risque ; A = 0 : neutre ; A < 0 : preneur de risque",
    "Actif sans risque : U = Rf (σ = 0)",
    "Poids optimal dans l'actif risqué : y* = [E(R) − Rf] / (A σ²)",
  ],
  traps: [
    "Travaille en décimal : 0.12 − 0.5 × 4 × 0.2² = 0.04 (et non 12 − 0.5 × 4 × 20²).",
    "Plus A est grand, plus les courbes d'indifférence sont pentues et moins tu prends de risque.",
  ],
  questions: build([
    () => {
      const er = 0.12, sd = 0.2, A = 4;
      const u = utility(er, sd, A);
      return Q("pm-ut-f1", "facile", "Utility? (decimal)",
        [["Expected return", pc(er)], ["σ", pc(sd)], ["Risk aversion A", fx(A)]],
        u, "", 4, [
          "U = E(R) − ½ A σ²",
          `= ${fx(er)} − 0.5 × ${fx(A)} × ${fx(sd)}² = ${fx(er)} − ${fx(0.5 * A * sq(sd), 4)} = ${fx(u, 4)}`,
        ]);
    },
    () => {
      const er = 0.09, sd = 0.15, A = 2;
      const u = utility(er, sd, A);
      return Q("pm-ut-f2", "facile", "Utility? (decimal)",
        [["Expected return", pc(er)], ["σ", pc(sd)], ["Risk aversion A", fx(A)]],
        u, "", 4, [
          "U = E(R) − ½ A σ²",
          `= ${fx(er)} − 0.5 × ${fx(A)} × ${fx(sd)}² = ${fx(er)} − ${fx(0.5 * A * sq(sd), 4)} = ${fx(u, 4)}`,
        ]);
    },
    () => {
      const rf = 0.035, A = 6;
      const u = utility(rf, 0, A);
      return Q("pm-ut-f3", "facile", "Utility of the risk-free asset? (decimal)",
        [["Risk-free rate", pc(rf)], ["Risk aversion A", fx(A)]],
        u, "", 4, [
          "σ = 0 : la pénalité ½Aσ² est nulle, quel que soit A",
          `U = Rf = ${fx(u, 4)}`,
        ]);
    },
    () => {
      const er = 0.11, sd = 0.25, A = 0;
      const u = utility(er, sd, A);
      return Q("pm-ut-f4", "facile", "Utility of a risk-neutral investor? (decimal)",
        [["Expected return", pc(er)], ["σ", pc(sd)], ["Risk aversion A", "0"]],
        u, "", 4, [
          "A = 0 : le risque ne pèse pas, U = E(R)",
          `U = ${fx(er)} − 0 = ${fx(u, 4)}`,
        ]);
    },
    () => {
      const er = 0.08, sd = 0.3, A = -2;
      const u = utility(er, sd, A);
      return Q("pm-ut-f5", "facile", "Utility of a risk seeker? (decimal)",
        [["Expected return", pc(er)], ["σ", pc(sd)], ["Risk aversion A", fx(A)]],
        u, "", 4, [
          "A < 0 : le risque AJOUTE de l'utilité",
          `U = ${fx(er)} − 0.5 × (${fx(A)}) × ${fx(sd)}² = ${fx(er)} + ${fx(-0.5 * A * sq(sd), 4)} = ${fx(u, 4)}`,
        ]);
    },
    () => {
      const A = 3, x = [0.1, 0.16], y = [0.14, 0.25];
      const ux = utility(x[0], x[1], A);
      const uy = utility(y[0], y[1], A);
      return Q("pm-ut-m1", "moyen", "Utility of the portfolio this investor prefers? (decimal)",
        [["Portfolio X: E(R) / σ", `${pc(x[0])} / ${pc(x[1])}`], ["Portfolio Y: E(R) / σ", `${pc(y[0])} / ${pc(y[1])}`], ["Risk aversion A", fx(A)]],
        Math.max(ux, uy), "", 4, [
          `UX = ${fx(x[0])} − 0.5 × ${fx(A)} × ${fx(x[1])}² = ${fx(ux, 5)}`,
          `UY = ${fx(y[0])} − 0.5 × ${fx(A)} × ${fx(y[1])}² = ${fx(uy, 5)}`,
          `Il choisit ${ux > uy ? "X" : "Y"}, l'utilité la plus haute, même si ${ux > uy ? "Y" : "X"} rapporte plus en moyenne.`,
        ]);
    },
    () => {
      const x = [0.08, 0.1], y = [0.12, 0.2];
      const A = (y[0] - x[0]) / (0.5 * (sq(y[1]) - sq(x[1])));
      return Q("pm-ut-m2", "moyen", "Risk aversion A that makes the investor indifferent between X and Y?",
        [["Portfolio X: E(R) / σ", `${pc(x[0])} / ${pc(x[1])}`], ["Portfolio Y: E(R) / σ", `${pc(y[0])} / ${pc(y[1])}`]],
        A, "", 2, [
          `Égalise : ${fx(x[0])} − 0.5A × ${fx(sq(x[1]), 4)} = ${fx(y[0])} − 0.5A × ${fx(sq(y[1]), 4)}`,
          `0.5A × (${fx(sq(y[1]), 4)} − ${fx(sq(x[1]), 4)}) = ${fx(y[0])} − ${fx(x[0])} ⇒ ${fx(0.5 * (sq(y[1]) - sq(x[1])), 4)} A = ${fx(y[0] - x[0])}`,
          `A = ${fx(y[0] - x[0])} / ${fx(0.5 * (sq(y[1]) - sq(x[1])), 4)} = ${fx(A, 4)}`,
        ]);
    },
    () => {
      const er = 0.13, sd = 0.22, A = 3;
      const ce = utility(er, sd, A);
      return Q("pm-ut-m3", "moyen", "Risk-free rate that gives the same utility (certainty equivalent)?",
        [["Expected return", pc(er)], ["σ", pc(sd)], ["Risk aversion A", fx(A)]],
        ce * 100, "%", 2, [
          "Un placement sans risque a U = Rf : il faut donc Rf = U du portefeuille",
          `U = ${fx(er)} − 0.5 × ${fx(A)} × ${fx(sd)}² = ${fx(er)} − ${fx(0.5 * A * sq(sd), 4)} = ${fx(ce, 4)}`,
          `Équivalent certain = ${pc(ce)}`,
        ]);
    },
    () => {
      const er = 0.1, rf = 0.04, sd = 0.2, A = 4;
      const y = yStar(er, rf, sd, A);
      return Q("pm-ut-m4", "moyen", "Optimal weight in the risky portfolio?",
        [["E(R) of the risky portfolio", pc(er)], ["σ of the risky portfolio", pc(sd)], ["Risk-free rate", pc(rf)], ["Risk aversion A", fx(A)]],
        y * 100, "%", 2, [
          "y* = [E(R) − Rf] / (A σ²)",
          `= (${fx(er)} − ${fx(rf)}) / (${fx(A)} × ${fx(sd)}²) = ${fx(er - rf)} / ${fx(A * sq(sd), 4)} = ${fx(y, 4)}`,
          `Soit ${pc(y)} dans l'actif risqué et ${pc(1 - y)} dans l'actif sans risque`,
        ]);
    },
    () => {
      const uMin = 0.05, er = 0.11, A = 3;
      const sd = Math.sqrt((2 * (er - uMin)) / A);
      return Q("pm-ut-m5", "moyen", "Maximum σ for a utility of at least 0.05?",
        [["Expected return", pc(er)], ["Risk aversion A", fx(A)], ["Minimum utility", fx(uMin)]],
        sd * 100, "%", 2, [
          `${fx(uMin)} = ${fx(er)} − 0.5 × ${fx(A)} × σ² ⇒ σ² = 2 × (${fx(er)} − ${fx(uMin)}) / ${fx(A)} = ${fx(sq(sd), 4)}`,
          `σ = √${fx(sq(sd), 4)} = ${pc(sd)}`,
        ]);
    },
    () => {
      const w = 0.6, er = 0.12, sd = 0.2, rf = 0.04, A = 5;
      const ec = mix(w, er, rf);
      const sc = w * sd;
      const u = utility(ec, sc, A);
      return Q("pm-ut-d1", "difficile", "Utility of the complete portfolio? (decimal)",
        [["Weight in the risky portfolio", pc(w, 0)], ["Risky portfolio: E(R) / σ", `${pc(er)} / ${pc(sd)}`], ["Risk-free rate", pc(rf)], ["Risk aversion A", fx(A)]],
        u, "", 4, [
          `E(R) = ${fx(w)} × ${pc(er)} + ${fx(1 - w)} × ${pc(rf)} = ${pc(ec)}`,
          `σ = ${fx(w)} × ${pc(sd)} = ${pc(sc)} (le sans risque n'ajoute pas de risque)`,
          `U = ${fx(ec)} − 0.5 × ${fx(A)} × ${fx(sc)}² = ${fx(ec)} − ${fx(0.5 * A * sq(sc), 4)} = ${fx(u, 4)}`,
        ]);
    },
    () => {
      const er = 0.11, rf = 0.03, sd = 0.25, A = 2.5;
      const y = yStar(er, rf, sd, A);
      const ec = mix(y, er, rf);
      return Q("pm-ut-d2", "difficile", "Expected return of the investor's optimal portfolio?",
        [["Risky portfolio: E(R) / σ", `${pc(er)} / ${pc(sd)}`], ["Risk-free rate", pc(rf)], ["Risk aversion A", fx(A)]],
        ec * 100, "%", 2, [
          `y* = (${fx(er)} − ${fx(rf)}) / (${fx(A)} × ${fx(sd)}²) = ${fx(er - rf)} / ${fx(A * sq(sd), 5)} = ${fx(y, 4)}`,
          `E(R) = Rf + y* × [E(R) − Rf] = ${pc(rf)} + ${fx(y, 4)} × ${pc(er - rf)} = ${pc(ec, 3)}`,
        ]);
    },
    () => {
      const er = 0.14, rf = 0.04, sd = 0.18, A = 2;
      const y = yStar(er, rf, sd, A);
      return Q("pm-ut-d3", "difficile", "Optimal weight in the risky portfolio?",
        [["Risky portfolio: E(R) / σ", `${pc(er)} / ${pc(sd)}`], ["Risk-free rate", pc(rf)], ["Risk aversion A", fx(A)]],
        y * 100, "%", 2, [
          `y* = (${fx(er)} − ${fx(rf)}) / (${fx(A)} × ${fx(sd)}²) = ${fx(er - rf)} / ${fx(A * sq(sd), 4)} = ${fx(y, 4)}`,
          `Plus de 100% : l'investisseur emprunte ${pc(y - 1)} de sa richesse au taux sans risque.`,
        ]);
    },
    () => {
      const x = [0.09, 0.12], sY = 0.24, A = 4;
      const ux = utility(x[0], x[1], A);
      const eY = ux + 0.5 * A * sq(sY);
      return Q("pm-ut-d4", "difficile", "Expected return Y needs for the same utility as X?",
        [["Portfolio X: E(R) / σ", `${pc(x[0])} / ${pc(x[1])}`], ["σ of portfolio Y", pc(sY)], ["Risk aversion A", fx(A)]],
        eY * 100, "%", 2, [
          `UX = ${fx(x[0])} − 0.5 × ${fx(A)} × ${fx(x[1])}² = ${fx(ux, 4)}`,
          `Même utilité : E(RY) = UX + 0.5 × ${fx(A)} × ${fx(sY)}² = ${fx(ux, 4)} + ${fx(0.5 * A * sq(sY), 4)} = ${fx(eY, 4)}`,
          `Soit ${pc(eY)} : doubler σ coûte bien plus que le double en rendement exigé`,
        ]);
    },
    () => {
      const A = 3, er = 0.1, rf = 0.04, sd = 0.2, sdM = 0.18;
      const y = yStar(er, rf, sd, A);
      const ec = mix(y, er, rf);
      const sc = y * sd;
      const u = utility(ec, sc, A);
      return Q("pm-ut-d5", "difficile", "Utility of the investor's optimal portfolio? (decimal)",
        [["Risky portfolio: E(R) / σ", `${pc(er)} / ${pc(sd)}`], ["Risk-free rate", pc(rf)], ["Market σ", pc(sdM)], ["Risk aversion A", fx(A)]],
        u, "", 4, [
          `y* = (${fx(er)} − ${fx(rf)}) / (${fx(A)} × ${fx(sd)}²) = ${fx(y, 4)} ; le σ du marché est une donnée-piège`,
          `E(R) = ${pc(rf)} + ${fx(y)} × ${pc(er - rf)} = ${pc(ec)} ; σ = ${fx(y)} × ${pc(sd)} = ${pc(sc)}`,
          `U = ${fx(ec)} − 0.5 × ${fx(A)} × ${fx(sc)}² = ${fx(u, 4)}`,
        ]);
    },
  ]),
};

// ===========================================================================
// 8. Actif sans risque + portefeuille risqué (CAL)
// ===========================================================================

const T_CAL: CalcType = {
  key: "capital-allocation-line",
  topic: "portfolio",
  name: "Actif sans risque + portefeuille risqué (CAL)",
  tier: "essentiel",
  source: "LM Portfolio Risk and Return: Part II · LOS a-b (Schweser R84) ; Part I · LOS c",
  formulas: [
    "E(Rp) = w E(RA) + (1 − w) Rf = Rf + w [E(RA) − Rf]",
    "σp = w σA (l'actif sans risque a σ = 0 et ρ = 0)",
    "Pente de la CAL = [E(RA) − Rf] / σA ⇒ E(Rp) = Rf + pente × σp",
    "w > 100% : emprunt au taux sans risque (levier)",
  ],
  traps: [
    "σp n'est pas une moyenne avec le σ du sans risque : c'est simplement w × σA.",
    "Avec levier, le poids du sans risque est négatif (ex. 130% / −30%).",
  ],
  questions: build([
    () => {
      const w = 0.7, er = 0.11, rf = 0.03;
      const e = mix(w, er, rf);
      return Q("pm-cal-f1", "facile", "Expected portfolio return?",
        [["Weight in the risky portfolio", pc(w, 0)], ["E(R) of the risky portfolio", pc(er)], ["Risk-free rate", pc(rf)]],
        e * 100, "%", 2, [
          "E(Rp) = w E(RA) + (1 − w) Rf",
          `= ${fx(w)} × ${pc(er)} + ${fx(1 - w)} × ${pc(rf)} = ${pc(w * er)} + ${pc((1 - w) * rf)} = ${pc(e)}`,
        ]);
    },
    () => {
      const w = 0.4, sd = 0.22;
      return Q("pm-cal-f2", "facile", "Portfolio standard deviation?",
        [["Weight in the risky portfolio", pc(w, 0)], ["σ of the risky portfolio", pc(sd)], ["Risk-free rate", "3%"]],
        w * sd * 100, "%", 2, [
          "σp = w × σA (le sans risque n'a ni σ ni corrélation)",
          `= ${fx(w)} × ${pc(sd)} = ${pc(w * sd)}`,
        ]);
    },
    () => {
      const er = 0.12, rf = 0.04, sd = 0.2;
      const slope = sharpe(er, rf, sd);
      return Q("pm-cal-f3", "facile", "Slope of the capital allocation line?",
        [["E(R) of the risky portfolio", pc(er)], ["σ of the risky portfolio", pc(sd)], ["Risk-free rate", pc(rf)]],
        slope, "", 2, [
          "Pente = [E(RA) − Rf] / σA",
          `= (${pc(er)} − ${pc(rf)}) / ${pc(sd)} = ${fx((er - rf) * 100)} / ${fx(sd * 100)} = ${fx(slope, 4)}`,
        ]);
    },
    () => {
      const target = 0.09, sd = 0.15;
      const w = target / sd;
      return Q("pm-cal-f4", "facile", "Weight in the risky portfolio for σp = 9%?",
        [["σ of the risky portfolio", pc(sd)], ["Target portfolio σ", pc(target)]],
        w * 100, "%", 2, [
          "σp = w σA ⇒ w = σp / σA",
          `= ${pc(target)} / ${pc(sd)} = ${pc(w)}`,
        ]);
    },
    () => {
      const w = 1.3, er = 0.1, rf = 0.04;
      const e = mix(w, er, rf);
      return Q("pm-cal-f5", "facile", "Expected return with 130% in the risky portfolio?",
        [["E(R) of the risky portfolio", pc(er)], ["Risk-free rate (borrowing and lending)", pc(rf)]],
        e * 100, "%", 2, [
          `Poids : ${pc(w, 0)} dans le risqué, ${pc(1 - w, 0)} dans le sans risque (emprunt)`,
          `E(Rp) = ${fx(w)} × ${pc(er)} + (${fx(1 - w)}) × ${pc(rf)} = ${pc(w * er)} − ${pc((w - 1) * rf)} = ${pc(e)}`,
        ]);
    },
    () => {
      const target = 0.12, er = 0.11, sd = 0.2, rf = 0.03;
      const w = target / sd;
      const e = mix(w, er, rf);
      return Q("pm-cal-m1", "moyen", "Expected return of the portfolio with σp = 12%?",
        [["Risky portfolio: E(R) / σ", `${pc(er)} / ${pc(sd)}`], ["Risk-free rate", pc(rf)], ["Target σp", pc(target)]],
        e * 100, "%", 2, [
          `w = σp / σA = ${pc(target)} / ${pc(sd)} = ${fx(w)}`,
          `E(Rp) = ${pc(rf)} + ${fx(w)} × (${pc(er)} − ${pc(rf)}) = ${pc(rf)} + ${pc(w * (er - rf))} = ${pc(e)}`,
        ]);
    },
    () => {
      const target = 0.09, er = 0.12, rf = 0.04;
      const w = (target - rf) / (er - rf);
      return Q("pm-cal-m2", "moyen", "Weight in the risky portfolio for an expected return of 9%?",
        [["E(R) of the risky portfolio", pc(er)], ["Risk-free rate", pc(rf)], ["Target E(Rp)", pc(target)]],
        w * 100, "%", 2, [
          `${pc(target)} = ${pc(rf)} + w × (${pc(er)} − ${pc(rf)})`,
          `w = (${pc(target)} − ${pc(rf)}) / (${pc(er)} − ${pc(rf)}) = ${fx((target - rf) * 100)} / ${fx((er - rf) * 100)} = ${pc(w)}`,
        ]);
    },
    () => {
      const target = 0.08, er = 0.13, sd = 0.25, rf = 0.03;
      const w = (target - rf) / (er - rf);
      return Q("pm-cal-m3", "moyen", "σ of the portfolio with an expected return of 8%?",
        [["Risky portfolio: E(R) / σ", `${pc(er)} / ${pc(sd)}`], ["Risk-free rate", pc(rf)], ["Target E(Rp)", pc(target)]],
        w * sd * 100, "%", 2, [
          `w = (${pc(target)} − ${pc(rf)}) / (${pc(er)} − ${pc(rf)}) = ${fx(w)}`,
          `σp = ${fx(w)} × ${pc(sd)} = ${pc(w * sd)}`,
        ]);
    },
    () => {
      const eq = 100000, target = 0.24, sd = 0.2;
      const w = target / sd;
      const borrow = (w - 1) * eq;
      return Q("pm-cal-m4", "moyen", "Amount to borrow at the risk-free rate?",
        [["Investor's equity", usd(eq)], ["σ of the risky portfolio", pc(sd)], ["Target portfolio σ", pc(target)]],
        borrow, "$", 0, [
          `w = σp / σA = ${pc(target)} / ${pc(sd)} = ${fx(w)}, soit ${pc(w, 0)} des fonds propres dans le risqué`,
          `Investi : ${fx(w)} × ${amt(eq)} = ${amt(w * eq)} ⇒ emprunt = ${amt(w * eq)} − ${amt(eq)} = ${amt(borrow)}`,
        ]);
    },
    () => {
      const p1 = [0.07, 0.08], p2 = [0.11, 0.16];
      const slope = (p2[0] - p1[0]) / (p2[1] - p1[1]);
      const rf = p1[0] - slope * p1[1];
      return Q("pm-cal-m5", "moyen", "Risk-free rate implied by the CAL?",
        [["Portfolio 1 on the CAL: E(R) / σ", `${pc(p1[0])} / ${pc(p1[1])}`], ["Portfolio 2 on the CAL: E(R) / σ", `${pc(p2[0])} / ${pc(p2[1])}`]],
        rf * 100, "%", 2, [
          `Pente = (${pc(p2[0])} − ${pc(p1[0])}) / (${pc(p2[1])} − ${pc(p1[1])}) = ${fx((p2[0] - p1[0]) * 100)} / ${fx((p2[1] - p1[1]) * 100)} = ${fx(slope)}`,
          `Ordonnée à l'origine : Rf = ${pc(p1[0])} − ${fx(slope)} × ${pc(p1[1])} = ${pc(rf)}`,
        ]);
    },
    () => {
      const a = [0.12, 0.2], b = [0.15, 0.3], rf = 0.04, target = 0.1;
      const sa = sharpe(a[0], rf, a[1]);
      const sb = sharpe(b[0], rf, b[1]);
      const best = Math.max(sa, sb);
      const e = rf + best * target;
      return Q("pm-cal-d1", "difficile", "Highest expected return achievable with σp = 10%?",
        [["Risky portfolio A: E(R) / σ", `${pc(a[0])} / ${pc(a[1])}`], ["Risky portfolio B: E(R) / σ", `${pc(b[0])} / ${pc(b[1])}`], ["Risk-free rate", pc(rf)], ["Target σp", pc(target)]],
        e * 100, "%", 2, [
          `Pente CAL A = (${pc(a[0])} − ${pc(rf)}) / ${pc(a[1])} = ${fx(sa, 4)} ; pente CAL B = (${pc(b[0])} − ${pc(rf)}) / ${pc(b[1])} = ${fx(sb, 4)}`,
          `Prends la CAL la plus pentue (${sa > sb ? "A" : "B"}), même si ${sa > sb ? "B" : "A"} rapporte plus seul`,
          `E(Rp) = ${pc(rf)} + ${fx(best, 4)} × ${pc(target)} = ${pc(e)}`,
        ]);
    },
    () => {
      const eq = 200000, borrow = 50000, rf = 0.04, er = 0.1;
      const w = (eq + borrow) / eq;
      const e = mix(w, er, rf);
      return Q("pm-cal-d2", "difficile", "Expected return on the investor's equity?",
        [["Investor's equity", usd(eq)], ["Borrowed at the risk-free rate", usd(borrow)], ["Risk-free rate", pc(rf)], ["E(R) of the risky portfolio", pc(er)]],
        e * 100, "%", 2, [
          `Tout est investi dans le risqué : w = (${amt(eq)} + ${amt(borrow)}) / ${amt(eq)} = ${fx(w)}`,
          `E(Rp) = ${pc(rf)} + ${fx(w)} × (${pc(er)} − ${pc(rf)}) = ${pc(e)}`,
          `Contrôle : (${pc(er)} × ${amt(eq + borrow)} − ${pc(rf)} × ${amt(borrow)}) / ${amt(eq)} = ${pc(e)}`,
        ]);
    },
    () => {
      const target = 0.1, sMax = 0.14, er = 0.12, sd = 0.2, rf = 0.04;
      const wNeeded = (target - rf) / (er - rf);
      const wMax = sMax / sd;
      const e = mix(wMax, er, rf);
      return Q("pm-cal-d3", "difficile", "Highest expected return within the σ limit?",
        [["Risky portfolio: E(R) / σ", `${pc(er)} / ${pc(sd)}`], ["Risk-free rate", pc(rf)], ["Client's return target", pc(target)], ["Maximum portfolio σ", pc(sMax)]],
        e * 100, "%", 2, [
          `Pour ${pc(target)} il faudrait w = ${fx(wNeeded)} ⇒ σp = ${pc(wNeeded * sd)} > ${pc(sMax)} : objectif impossible`,
          `Limite de risque : w max = ${pc(sMax)} / ${pc(sd)} = ${fx(wMax)}`,
          `E(Rp) max = ${pc(rf)} + ${fx(wMax)} × ${pc(er - rf)} = ${pc(e)}`,
        ]);
    },
    () => {
      const w = 0.4, er = 0.13, sd = 0.18, rf = 0.04;
      const e = mix(w, er, rf);
      const s = w * sd;
      const sr = sharpe(e, rf, s);
      return Q("pm-cal-d4", "difficile", "Sharpe ratio of the combined portfolio?",
        [["Weight in the risky portfolio", pc(w, 0)], ["Risky portfolio: E(R) / σ", `${pc(er)} / ${pc(sd)}`], ["Risk-free rate", pc(rf)]],
        sr, "", 2, [
          `E(Rp) = ${pc(rf)} + ${fx(w)} × ${pc(er - rf)} = ${pc(e)} ; σp = ${fx(w)} × ${pc(sd)} = ${pc(s)}`,
          `Sharpe = (${pc(e)} − ${pc(rf)}) / ${pc(s)} = ${fx(sr, 4)}`,
          `C'est la pente de la CAL : identique au Sharpe du risqué seul, (${pc(er)} − ${pc(rf)}) / ${pc(sd)} = ${fx(sharpe(er, rf, sd), 4)}`,
        ]);
    },
    () => {
      const v = 0.0625, er = 0.09, target = 0.1;
      const sd = Math.sqrt(v);
      const w = target / sd;
      return Q("pm-cal-d5", "difficile", "Weight in the risk-free asset for σp = 10%?",
        [["Variance of the risky portfolio", fx(v)], ["E(R) of the risky portfolio", pc(er)], ["Target portfolio σ", pc(target)]],
        (1 - w) * 100, "%", 2, [
          `σA = √${fx(v)} = ${pc(sd)}`,
          `Poids risqué = ${pc(target)} / ${pc(sd)} = ${pc(w)} ⇒ poids sans risque = 1 − ${fx(w)} = ${pc(1 - w)}`,
          "E(RA) ne sert pas : donnée-piège.",
        ]);
    },
  ]),
};

// ===========================================================================
// 9. Capital market line (CML)
// ===========================================================================

const T_CML: CalcType = {
  key: "capital-market-line",
  topic: "portfolio",
  name: "Capital market line (CML)",
  tier: "essentiel",
  source: "LM Portfolio Risk and Return: Part II · LOS b (Schweser R84)",
  formulas: [
    "E(Rp) = Rf + [(E(RM) − Rf) / σM] × σp",
    "Pente de la CML = (E(RM) − Rf) / σM = ratio de Sharpe du marché",
    "Sur la CML : poids dans le marché w = σp / σM (w > 1 : emprunt)",
  ],
  traps: [
    "La CML utilise le risque total σ et ne vaut que pour des portefeuilles efficients (pas pour un titre seul).",
    "Distingue le rendement du marché E(RM) et la prime de risque E(RM) − Rf.",
  ],
  questions: build([
    () => {
      const rf = 0.03, erm = 0.09, sdm = 0.15, sdp = 0.1;
      const e = cmlRet(rf, erm, sdm, sdp);
      return Q("pm-cml-f1", "facile", "Expected return of the portfolio on the CML?",
        [["Risk-free rate", pc(rf)], ["E(RM)", pc(erm)], ["σM", pc(sdm)], ["σ of the portfolio", pc(sdp)]],
        e * 100, "%", 2, [
          "E(Rp) = Rf + [(E(RM) − Rf) / σM] × σp",
          `= ${pc(rf)} + (${pc(erm - rf)} / ${pc(sdm)}) × ${pc(sdp)} = ${pc(rf)} + ${fx((erm - rf) / sdm, 4)} × ${pc(sdp)} = ${pc(e)}`,
        ]);
    },
    () => {
      const erm = 0.1, rf = 0.04, sdm = 0.2;
      const slope = sharpe(erm, rf, sdm);
      return Q("pm-cml-f2", "facile", "Slope of the CML?",
        [["E(RM)", pc(erm)], ["Risk-free rate", pc(rf)], ["σM", pc(sdm)]],
        slope, "", 2, [
          "Pente = (E(RM) − Rf) / σM",
          `= (${pc(erm)} − ${pc(rf)}) / ${pc(sdm)} = ${fx((erm - rf) * 100)} / ${fx(sdm * 100)} = ${fx(slope, 4)}`,
        ]);
    },
    () => {
      const rf = 0.02, mrp = 0.06, sdm = 0.18, sdp = 0.24;
      const e = rf + (mrp / sdm) * sdp;
      return Q("pm-cml-f3", "facile", "Expected return of the portfolio on the CML?",
        [["Risk-free rate", pc(rf)], ["Market risk premium", pc(mrp)], ["σM", pc(sdm)], ["σ of the portfolio", pc(sdp)]],
        e * 100, "%", 2, [
          "La prime de risque est déjà E(RM) − Rf : ne retranche pas Rf une seconde fois",
          `E(Rp) = ${pc(rf)} + ${pc(mrp)} × (${pc(sdp)} / ${pc(sdm)}) = ${pc(rf)} + ${pc(mrp)} × ${fx(sdp / sdm, 4)} = ${pc(e)}`,
        ]);
    },
    () => {
      const sdp = 0.12, sdm = 0.16;
      const w = sdp / sdm;
      return Q("pm-cml-f4", "facile", "Weight in the market portfolio?",
        [["σ of the CML portfolio", pc(sdp)], ["σM", pc(sdm)]],
        w * 100, "%", 2, [
          "Sur la CML, σp = w σM ⇒ w = σp / σM",
          `= ${pc(sdp)} / ${pc(sdm)} = ${pc(w)} (le reste, ${pc(1 - w)}, au taux sans risque)`,
        ]);
    },
    () => {
      const target = 0.08, rf = 0.04, slope = 0.25;
      const s = (target - rf) / slope;
      return Q("pm-cml-f5", "facile", "σ of the CML portfolio with E(R) = 8%?",
        [["Risk-free rate", pc(rf)], ["Slope of the CML", fx(slope)], ["Target E(Rp)", pc(target)]],
        s * 100, "%", 2, [
          "E(Rp) = Rf + pente × σp ⇒ σp = (E(Rp) − Rf) / pente",
          `= (${pc(target)} − ${pc(rf)}) / ${fx(slope)} = ${pc(target - rf)} / ${fx(slope)} = ${pc(s)}`,
        ]);
    },
    () => {
      const target = 0.11, rf = 0.03, erm = 0.09, sdm = 0.15;
      const slope = sharpe(erm, rf, sdm);
      const s = (target - rf) / slope;
      return Q("pm-cml-m1", "moyen", "σ of the CML portfolio with E(R) = 11%?",
        [["Risk-free rate", pc(rf)], ["E(RM)", pc(erm)], ["σM", pc(sdm)], ["Target E(Rp)", pc(target)]],
        s * 100, "%", 2, [
          `Pente = (${pc(erm)} − ${pc(rf)}) / ${pc(sdm)} = ${fx(slope, 4)}`,
          `σp = (${pc(target)} − ${pc(rf)}) / ${fx(slope, 4)} = ${pc(s)} (plus que σM : il faut emprunter)`,
        ]);
    },
    () => {
      const rf = 0.04, sdm = 0.2, p = [0.085, 0.15];
      const slope = (p[0] - rf) / p[1];
      const erm = rf + slope * sdm;
      return Q("pm-cml-m2", "moyen", "Expected market return?",
        [["Risk-free rate", pc(rf)], ["σM", pc(sdm)], ["A CML portfolio: E(R) / σ", `${pc(p[0], 1)} / ${pc(p[1])}`]],
        erm * 100, "%", 2, [
          `Pente = (${pc(p[0], 1)} − ${pc(rf)}) / ${pc(p[1])} = ${fx(slope, 4)}`,
          `E(RM) = Rf + pente × σM = ${pc(rf)} + ${fx(slope, 4)} × ${pc(sdm)} = ${pc(erm)}`,
        ]);
    },
    () => {
      const target = 0.06, rf = 0.03, erm = 0.09;
      const w = (target - rf) / (erm - rf);
      return Q("pm-cml-m3", "moyen", "Weight in the risk-free asset for E(R) = 6% on the CML?",
        [["Risk-free rate", pc(rf)], ["E(RM)", pc(erm)], ["Target E(Rp)", pc(target)]],
        (1 - w) * 100, "%", 2, [
          `Poids marché : w = (${pc(target)} − ${pc(rf)}) / (${pc(erm)} − ${pc(rf)}) = ${fx(w)}`,
          `Poids sans risque = 1 − ${fx(w)} = ${pc(1 - w)}`,
        ]);
    },
    () => {
      const rf = 0.025, erm = 0.085, p = [0.065, 0.1];
      const slope = (p[0] - rf) / p[1];
      const sdm = (erm - rf) / slope;
      return Q("pm-cml-m4", "moyen", "σ of the market portfolio?",
        [["Risk-free rate", pc(rf)], ["E(RM)", pc(erm)], ["A CML portfolio: E(R) / σ", `${pc(p[0])} / ${pc(p[1])}`]],
        sdm * 100, "%", 2, [
          `Pente = (${pc(p[0])} − ${pc(rf)}) / ${pc(p[1])} = ${fx(slope, 4)}`,
          `σM = (E(RM) − Rf) / pente = ${pc(erm - rf)} / ${fx(slope, 4)} = ${pc(sdm)}`,
        ]);
    },
    () => {
      const p = [0.09, 0.18], rf = 0.03, erm = 0.1, sdm = 0.2;
      const onCml = cmlRet(rf, erm, sdm, p[1]);
      return Q("pm-cml-m5", "moyen", "CML return at P's σ minus P's expected return (percentage points)?",
        [["Portfolio P: E(R) / σ", `${pc(p[0])} / ${pc(p[1])}`], ["Risk-free rate", pc(rf)], ["E(RM)", pc(erm)], ["σM", pc(sdm)]],
        (onCml - p[0]) * 100, "%", 2, [
          `Sur la CML à σ = ${pc(p[1])} : ${pc(rf)} + (${pc(erm - rf)} / ${pc(sdm)}) × ${pc(p[1])} = ${pc(onCml)}`,
          `Écart = ${pc(onCml)} − ${pc(p[0])} : P est sous la CML, donc inefficient`,
        ]);
    },
    () => {
      const eq = 400000, borrow = 100000, rf = 0.03, erm = 0.09, sdm = 0.16;
      const w = (eq + borrow) / eq;
      return Q("pm-cml-d1", "difficile", "σ of the investor's portfolio?",
        [["Investor's equity", usd(eq)], ["Borrowed at the risk-free rate", usd(borrow)], ["Invested in", "the market portfolio"], ["Risk-free rate / E(RM)", `${pc(rf)} / ${pc(erm)}`], ["σM", pc(sdm)]],
        w * sdm * 100, "%", 2, [
          `w = (${amt(eq)} + ${amt(borrow)}) / ${amt(eq)} = ${fx(w)} dans le marché`,
          `σp = ${fx(w)} × ${pc(sdm)} = ${pc(w * sdm)} (Rf et E(RM) ne servent pas pour le risque)`,
        ]);
    },
    () => {
      const vM = 0.0324, erm = 0.11, rf = 0.02, sdp = 0.09;
      const sdm = Math.sqrt(vM);
      const e = cmlRet(rf, erm, sdm, sdp);
      return Q("pm-cml-d2", "difficile", "Expected return of the CML portfolio?",
        [["Variance of the market", fx(vM)], ["E(RM)", pc(erm)], ["Risk-free rate", pc(rf)], ["σ of the portfolio", pc(sdp)]],
        e * 100, "%", 2, [
          `σM = √${fx(vM)} = ${pc(sdm)}`,
          `Pente = (${pc(erm)} − ${pc(rf)}) / ${pc(sdm)} = ${fx(sharpe(erm, rf, sdm), 4)}`,
          `E(Rp) = ${pc(rf)} + ${fx(sharpe(erm, rf, sdm), 4)} × ${pc(sdp)} = ${pc(e)}`,
        ]);
    },
    () => {
      const a = [0.07, 0.1], b = [0.13, 0.25], sdm = 0.2;
      const slope = (b[0] - a[0]) / (b[1] - a[1]);
      const rf = a[0] - slope * a[1];
      const erm = rf + slope * sdm;
      return Q("pm-cml-d3", "difficile", "Expected market return?",
        [["CML portfolio A: E(R) / σ", `${pc(a[0])} / ${pc(a[1])}`], ["CML portfolio B: E(R) / σ", `${pc(b[0])} / ${pc(b[1])}`], ["σM", pc(sdm)]],
        erm * 100, "%", 2, [
          `Pente = (${pc(b[0])} − ${pc(a[0])}) / (${pc(b[1])} − ${pc(a[1])}) = ${fx(slope, 4)}`,
          `Rf = ${pc(a[0])} − ${fx(slope, 4)} × ${pc(a[1])} = ${pc(rf)}`,
          `E(RM) = ${pc(rf)} + ${fx(slope, 4)} × ${pc(sdm)} = ${pc(erm)}`,
        ]);
    },
    () => {
      const sdp = 0.12, beta = 0.8, erm = 0.1, rf = 0.04, sdm = 0.15;
      const e = cmlRet(rf, erm, sdm, sdp);
      return Q("pm-cml-d4", "difficile", "Expected return of this efficient portfolio?",
        [["Portfolio σ", pc(sdp)], ["Portfolio β", fx(beta)], ["E(RM)", pc(erm)], ["Risk-free rate", pc(rf)], ["σM", pc(sdm)]],
        e * 100, "%", 2, [
          `Sur la CML : E(Rp) = ${pc(rf)} + (${pc(erm - rf)} / ${pc(sdm)}) × ${pc(sdp)} = ${pc(e)}`,
          `Cohérent avec le CAPM : un portefeuille efficient a ρ = 1, donc β = σp / σM = ${fx(sdp / sdm)} et ${pc(rf)} + ${fx(beta)} × ${pc(erm - rf)} = ${pc(capm(rf, beta, erm))}`,
        ]);
    },
    () => {
      const rf = 0.03, erm = 0.11, sdm = 0.15, w0 = 0.7;
      const ex0 = w0 * (erm - rf);
      const w1 = (2 * ex0) / (erm - rf);
      return Q("pm-cml-d5", "difficile", "New σ if the investor doubles the excess return?",
        [["Current allocation", `${pc(w0, 0)} market / ${pc(1 - w0, 0)} risk-free`], ["Risk-free rate", pc(rf)], ["E(RM)", pc(erm)], ["σM", pc(sdm)]],
        w1 * sdm * 100, "%", 2, [
          `Excédent actuel = ${fx(w0)} × (${pc(erm)} − ${pc(rf)}) = ${pc(ex0)} ; visé = ${pc(2 * ex0)}`,
          `Nouveau poids marché = ${pc(2 * ex0)} / ${pc(erm - rf)} = ${fx(w1)} (emprunt de ${pc(w1 - 1, 0)})`,
          `σp = ${fx(w1)} × ${pc(sdm)} = ${pc(w1 * sdm)} : le risque double aussi`,
        ]);
    },
  ]),
};

// ===========================================================================
// 10. Risque systématique et spécifique
// ===========================================================================

const T_SYSTEMATIC: CalcType = {
  key: "systematic-risk",
  topic: "portfolio",
  name: "Risque systématique et spécifique",
  tier: "annexe",
  source: "LM Portfolio Risk and Return: Part II · LOS c-d (décomposition du modèle à un indice)",
  formulas: [
    "Variance totale = systématique + spécifique : σi² = βi² σM² + σe²",
    "Part systématique = βi² σM² / σi² = ρ(i,M)²",
    "Seul le risque systématique (β) est rémunéré : le spécifique se diversifie sans coût",
  ],
  traps: [
    "Additionne les variances, jamais les écarts-types.",
    "Un titre très volatil mais peu corrélé au marché a un β faible, donc un rendement exigé faible.",
  ],
  questions: build([
    () => {
      const b = 1.2, sdm = 0.2;
      const v = sq(b) * sq(sdm);
      return Q("pm-sr-f1", "facile", "Systematic variance? (decimal)",
        [["β", fx(b)], ["σM", pc(sdm)]],
        v, "", 4, [
          "Variance systématique = β² σM²",
          `= ${fx(b)}² × ${fx(sdm)}² = ${fx(sq(b), 4)} × ${fx(sq(sdm), 4)} = ${fx(v, 4)}`,
        ]);
    },
    () => {
      const sdi = 0.35, b = 1.1, sdm = 0.18;
      const ve = sq(sdi) - sq(b) * sq(sdm);
      return Q("pm-sr-f2", "facile", "Unsystematic variance? (decimal)",
        [["Total σ of the stock", pc(sdi)], ["β", fx(b)], ["σM", pc(sdm)]],
        ve, "", 4, [
          `Variance spécifique = σi² − β² σM² = ${fx(sdi)}² − ${fx(b)}² × ${fx(sdm)}²`,
          `= ${fx(sq(sdi), 4)} − ${fx(sq(b) * sq(sdm), 6)} = ${fx(ve, 6)}`,
        ]);
    },
    () => {
      const b = 0.9, sdm = 0.2, sde = 0.25;
      const s = Math.sqrt(sq(b * sdm) + sq(sde));
      return Q("pm-sr-f3", "facile", "Total σ of the stock?",
        [["β", fx(b)], ["σM", pc(sdm)], ["σ of residual (firm-specific) returns", pc(sde)]],
        s * 100, "%", 2, [
          `σi² = β² σM² + σe² = ${fx(sq(b * sdm), 4)} + ${fx(sq(sde), 4)} = ${fx(sq(b * sdm) + sq(sde), 4)}`,
          `σi = √${fx(sq(b * sdm) + sq(sde), 4)} = ${pc(s, 3)} (on additionne les variances, pas les σ)`,
        ]);
    },
    () => {
      const r = 0.6;
      return Q("pm-sr-f4", "facile", "Share of total variance that is systematic?",
        [["Correlation with the market", fx(r)]],
        sq(r) * 100, "%", 2, [
          "Part systématique = ρ² (le R² de la régression sur le marché)",
          `= ${fx(r)}² = ${fx(sq(r), 4)}, soit ${pc(sq(r))}`,
        ]);
    },
    () => {
      const b = 1.5, sdm = 0.16;
      return Q("pm-sr-f5", "facile", "Systematic risk, as a σ?",
        [["β", fx(b)], ["σM", pc(sdm)]],
        b * sdm * 100, "%", 2, [
          "σ systématique = β × σM",
          `= ${fx(b)} × ${pc(sdm)} = ${pc(b * sdm)}`,
        ]);
    },
    () => {
      const b = 1.2, sdm = 0.18, sdi = 0.3;
      const share = (sq(b) * sq(sdm)) / sq(sdi);
      return Q("pm-sr-m1", "moyen", "Share of total variance that is systematic?",
        [["β", fx(b)], ["σM", pc(sdm)], ["Total σ of the stock", pc(sdi)]],
        share * 100, "%", 2, [
          `Systématique = ${fx(b)}² × ${fx(sdm)}² = ${fx(sq(b) * sq(sdm), 6)}`,
          `Totale = ${fx(sdi)}² = ${fx(sq(sdi), 4)}`,
          `Part = ${fx(sq(b) * sq(sdm), 6)} / ${fx(sq(sdi), 4)} = ${pc(share)}`,
        ]);
    },
    () => {
      const sdi = 0.4, b = 1.3, sdm = 0.2;
      const sde = Math.sqrt(sq(sdi) - sq(b * sdm));
      return Q("pm-sr-m2", "moyen", "σ of firm-specific returns?",
        [["Total σ of the stock", pc(sdi)], ["β", fx(b)], ["σM", pc(sdm)]],
        sde * 100, "%", 2, [
          `σe² = σi² − β² σM² = ${fx(sq(sdi), 4)} − ${fx(sq(b * sdm), 4)} = ${fx(sq(sdi) - sq(b * sdm), 4)}`,
          `σe = √${fx(sq(sdi) - sq(b * sdm), 4)} = ${pc(sde, 3)}`,
        ]);
    },
    () => {
      const r2 = 0.49, sdi = 0.3, sdm = 0.2;
      const r = Math.sqrt(r2);
      const b = betaRho(r, sdi, sdm);
      return Q("pm-sr-m3", "moyen", "β of the stock? (positive correlation)",
        [["R² of the stock on the market", fx(r2)], ["Total σ of the stock", pc(sdi)], ["σM", pc(sdm)]],
        b, "", 2, [
          `ρ = √R² = √${fx(r2)} = ${fx(r)}`,
          `β = ρ × σi / σM = ${fx(r)} × ${pc(sdi)} / ${pc(sdm)} = ${fx(b, 4)}`,
        ]);
    },
    () => {
      const bp = 0.95, sdm = 0.17;
      return Q("pm-sr-m4", "moyen", "σ of a well-diversified portfolio?",
        [["Portfolio β", fx(bp)], ["σM", pc(sdm)], ["Firm-specific risk", "fully diversified away"]],
        bp * sdm * 100, "%", 2, [
          "Bien diversifié : σe ≈ 0, il ne reste que le risque systématique",
          `σp = βp × σM = ${fx(bp)} × ${pc(sdm)} = ${pc(bp * sdm, 3)}`,
        ]);
    },
    () => {
      const sdi = 0.25, r = 0.8;
      const sde = Math.sqrt((1 - sq(r)) * sq(sdi));
      return Q("pm-sr-m5", "moyen", "σ of firm-specific returns?",
        [["Total σ of the stock", pc(sdi)], ["Correlation with the market", fx(r)]],
        sde * 100, "%", 2, [
          `Part spécifique de la variance = 1 − ρ² = 1 − ${fx(sq(r), 4)} = ${fx(1 - sq(r), 4)}`,
          `σe² = ${fx(1 - sq(r), 4)} × ${fx(sq(sdi), 4)} = ${fx((1 - sq(r)) * sq(sdi), 4)} ⇒ σe = ${pc(sde)}`,
        ]);
    },
    () => {
      const sdX = 0.45, rX = 0.2, sdm = 0.18, rf = 0.03, erm = 0.09;
      const b = betaRho(rX, sdX, sdm);
      const e = capm(rf, b, erm);
      return Q("pm-sr-d1", "difficile", "Required return on stock X (CAPM)?",
        [["Total σ of X", pc(sdX)], ["Correlation of X with the market", fx(rX)], ["σM", pc(sdm)], ["Risk-free rate / E(RM)", `${pc(rf)} / ${pc(erm)}`]],
        e * 100, "%", 2, [
          `β = ρ × σX / σM = ${fx(rX)} × ${pc(sdX)} / ${pc(sdm)} = ${fx(b, 4)}`,
          `E(R) = ${pc(rf)} + ${fx(b, 4)} × (${pc(erm)} − ${pc(rf)}) = ${pc(e)}`,
          `Très volatil (σ ${pc(sdX)}) mais surtout du risque spécifique, non rémunéré : rendement exigé faible.`,
        ]);
    },
    () => {
      const sdi = 0.3, sde = 0.18, b = 1.2;
      const sys = Math.sqrt(sq(sdi) - sq(sde));
      const sdm = sys / b;
      return Q("pm-sr-d2", "difficile", "σ of the market?",
        [["Total σ of the stock", pc(sdi)], ["σ of firm-specific returns", pc(sde)], ["β", fx(b)]],
        sdm * 100, "%", 2, [
          `Variance systématique = ${fx(sq(sdi), 4)} − ${fx(sq(sde), 4)} = ${fx(sq(sdi) - sq(sde), 4)} ⇒ σ systématique = ${pc(sys)}`,
          `β σM = ${pc(sys)} ⇒ σM = ${pc(sys)} / ${fx(b)} = ${pc(sdm)}`,
        ]);
    },
    () => {
      const b = 1.4, sdm = 0.15, r2 = 0.6;
      const vs = sq(b * sdm);
      const vt = vs / r2;
      return Q("pm-sr-d3", "difficile", "Total σ of the stock?",
        [["β", fx(b)], ["σM", pc(sdm)], ["R² of the stock on the market", fx(r2)]],
        Math.sqrt(vt) * 100, "%", 2, [
          `Variance systématique = (${fx(b)} × ${fx(sdm)})² = ${fx(vs, 4)}`,
          `Elle vaut R² = ${pc(r2, 0)} du total ⇒ σi² = ${fx(vs, 4)} / ${fx(r2)} = ${fx(vt, 4)}`,
          `σi = √${fx(vt, 4)} = ${pc(Math.sqrt(vt), 3)}`,
        ]);
    },
    () => {
      const b = 0.8, sdm = 0.2, sde = 0.12;
      const sdi = Math.sqrt(sq(b * sdm) + sq(sde));
      const r = (b * sdm) / sdi;
      return Q("pm-sr-d4", "difficile", "Correlation of the stock with the market?",
        [["β", fx(b)], ["σM", pc(sdm)], ["σ of firm-specific returns", pc(sde)]],
        r, "", 2, [
          `σi² = (${fx(b)} × ${fx(sdm)})² + ${fx(sde)}² = ${fx(sq(b * sdm), 4)} + ${fx(sq(sde), 4)} = ${fx(sq(sdi), 4)} ⇒ σi = ${pc(sdi)}`,
          `ρ = β σM / σi = ${fx(b * sdm, 4)} / ${fx(sdi, 4)} = ${fx(r, 4)}`,
        ]);
    },
    () => {
      const s = 0.3, bA = 1.2, bB = 0.6, sdm = 0.2;
      const eA = Math.sqrt(sq(s) - sq(bA * sdm));
      const eB = Math.sqrt(sq(s) - sq(bB * sdm));
      return Q("pm-sr-d5", "difficile", "B's firm-specific σ minus A's (percentage points)?",
        [["Total σ of A and of B", pc(s)], ["β of A / β of B", `${fx(bA)} / ${fx(bB)}`], ["σM", pc(sdm)]],
        (eB - eA) * 100, "%", 2, [
          `A : σe² = ${fx(sq(s), 4)} − (${fx(bA)} × ${fx(sdm)})² = ${fx(sq(eA), 4)} ⇒ σe = ${pc(eA, 3)}`,
          `B : σe² = ${fx(sq(s), 4)} − (${fx(bB)} × ${fx(sdm)})² = ${fx(sq(eB), 4)} ⇒ σe = ${pc(eB, 3)}`,
          `Écart = ${pc(eB, 3)} − ${pc(eA, 3)} : même risque total, mais B en porte bien plus de non rémunéré`,
        ]);
    },
  ]),
};

// ===========================================================================
// 11. Market model et modèles multifactoriels
// ===========================================================================

const T_MODELS: CalcType = {
  key: "return-generating-models",
  topic: "portfolio",
  name: "Market model et modèles multifactoriels (return generating models)",
  tier: "annexe",
  source: "LM Portfolio Risk and Return: Part II · LOS d (Schweser R84)",
  formulas: [
    "Multifactoriel : E(Ri) − Rf = βi1 × E(F1) + βi2 × E(F2) + … + βik × E(Fk)",
    "Un facteur (marché) : E(Ri) − Rf = βi × [E(RM) − Rf]",
    "Market model : Ri = αi + βi × RM + ei ; rendement anormal ei = Ri − (αi + βi × RM)",
    "Cohérence avec le modèle à un indice : αi = Rf × (1 − βi)",
  ],
  traps: [
    "Le rendement anormal se calcule avec le rendement RÉALISÉ du marché, pas l'espéré.",
    "Un modèle de facteurs donne un rendement excédentaire : ajoute Rf pour avoir E(Ri).",
  ],
  questions: build([
    () => {
      const a = 0.01, b = 1.2, erm = 0.08;
      const e = a + b * erm;
      return Q("pm-rm-f1", "facile", "Expected return from the market model?",
        [["α (intercept)", pc(a)], ["β", fx(b)], ["Expected market return", pc(erm)]],
        e * 100, "%", 2, [
          "E(Ri) = αi + βi × E(RM)",
          `= ${pc(a)} + ${fx(b)} × ${pc(erm)} = ${pc(a)} + ${pc(b * erm)} = ${pc(e)}`,
        ]);
    },
    () => {
      const ri = 0.12, a = 0.005, b = 1.1, rm = 0.09;
      const ab = ri - (a + b * rm);
      return Q("pm-rm-f2", "facile", "Abnormal return?",
        [["Actual stock return", pc(ri)], ["α (intercept)", pc(a)], ["β", fx(b)], ["Actual market return", pc(rm)]],
        ab * 100, "%", 2, [
          `Rendement attendu = ${pc(a)} + ${fx(b)} × ${pc(rm)} = ${pc(a + b * rm)}`,
          `Anormal = ${pc(ri)} − ${pc(a + b * rm)} = ${pc(ab)}`,
        ]);
    },
    () => {
      const rf = 0.03, b1 = 1.1, f1 = 0.05, b2 = 0.4, f2 = 0.02;
      const e = rf + b1 * f1 + b2 * f2;
      return Q("pm-rm-f3", "facile", "Expected return from the two-factor model?",
        [["Risk-free rate", pc(rf)], ["Market factor: β / premium", `${fx(b1)} / ${pc(f1)}`], ["Size factor: β / premium", `${fx(b2)} / ${pc(f2)}`]],
        e * 100, "%", 2, [
          "E(Ri) = Rf + β1 × E(F1) + β2 × E(F2)",
          `= ${pc(rf)} + ${fx(b1)} × ${pc(f1)} + ${fx(b2)} × ${pc(f2)} = ${pc(rf)} + ${pc(b1 * f1)} + ${pc(b2 * f2)} = ${pc(e)}`,
        ]);
    },
    () => {
      const rf = 0.04, b = 1.25;
      const a = rf * (1 - b);
      return Q("pm-rm-f4", "facile", "Intercept α consistent with the single-index model?",
        [["Risk-free rate", pc(rf)], ["β", fx(b)]],
        a * 100, "%", 2, [
          "α = Rf × (1 − β)",
          `= ${pc(rf)} × (1 − ${fx(b)}) = ${pc(rf)} × (${fx(1 - b)}) = ${pc(a)}`,
        ]);
    },
    () => {
      const b = 0.9, mrp = 0.06;
      return Q("pm-rm-f5", "facile", "Expected excess return (above Rf)?",
        [["β", fx(b)], ["Expected market excess return E(RM) − Rf", pc(mrp)]],
        b * mrp * 100, "%", 2, [
          "Modèle à un facteur : E(Ri) − Rf = β × [E(RM) − Rf]",
          `= ${fx(b)} × ${pc(mrp)} = ${pc(b * mrp)}`,
        ]);
    },
    () => {
      const rf = 0.03, b = 1.3, rm = 0.1, ri = 0.14;
      const a = rf * (1 - b);
      const exp = a + b * rm;
      return Q("pm-rm-m1", "moyen", "Abnormal return? (α consistent with the single-index model)",
        [["Risk-free rate", pc(rf)], ["β", fx(b)], ["Actual market return", pc(rm)], ["Actual stock return", pc(ri)]],
        (ri - exp) * 100, "%", 2, [
          `α = Rf × (1 − β) = ${pc(rf)} × (${fx(1 - b)}) = ${pc(a)}`,
          `Attendu = ${pc(a)} + ${fx(b)} × ${pc(rm)} = ${pc(exp)}`,
          `Anormal = ${pc(ri)} − ${pc(exp)} = ${pc(ri - exp)}`,
        ]);
    },
    () => {
      const rf = 0.025, bs = [1.05, 0.3, -0.2], fs = [0.06, 0.025, 0.03];
      const e = rf + wavg(bs, fs);
      return Q("pm-rm-m2", "moyen", "Expected return from the Fama-French model?",
        [["Risk-free rate", pc(rf)], ["Market factor: β / premium", `${fx(bs[0])} / ${pc(fs[0])}`], ["Size (SMB): β / premium", `${fx(bs[1])} / ${pc(fs[1])}`], ["Value (HML): β / premium", `${fx(bs[2])} / ${pc(fs[2])}`]],
        e * 100, "%", 2, [
          `Contributions : ${bs.map((b, i) => `${fx(b)} × ${pc(fs[i])} = ${pc(b * fs[i], 3)}`).join(" ; ")}`,
          `E(Ri) = ${pc(rf)} + ${pc(bs[0] * fs[0], 3)} + ${pc(bs[1] * fs[1], 3)} − ${pc(-bs[2] * fs[2], 3)} = ${pc(e)}`,
          "Une sensibilité négative au facteur value réduit le rendement attendu.",
        ]);
    },
    () => {
      const e = 0.11, rf = 0.03, b1 = 1, f1 = 0.06, f2 = 0.04;
      const b2 = (e - rf - b1 * f1) / f2;
      return Q("pm-rm-m3", "moyen", "Sensitivity (β) to the second factor?",
        [["Expected stock return", pc(e)], ["Risk-free rate", pc(rf)], ["Market factor: β / premium", `${fx(b1)} / ${pc(f1)}`], ["Second factor premium", pc(f2)]],
        b2, "", 2, [
          `Excédent à expliquer : ${pc(e)} − ${pc(rf)} = ${pc(e - rf)}`,
          `Part du marché : ${fx(b1)} × ${pc(f1)} = ${pc(b1 * f1)} ⇒ reste ${pc(e - rf - b1 * f1)}`,
          `β2 = ${pc(e - rf - b1 * f1)} / ${pc(f2)} = ${fx(b2, 4)}`,
        ]);
    },
    () => {
      const ri = 0.076, a = 0.004, b = 0.9;
      const rm = (ri - a) / b;
      return Q("pm-rm-m4", "moyen", "Market return for which the abnormal return is zero?",
        [["Actual stock return", pc(ri, 1)], ["α (intercept)", pc(a, 1)], ["β", fx(b)]],
        rm * 100, "%", 2, [
          `Anormal nul : ${pc(ri, 1)} = ${pc(a, 1)} + ${fx(b)} × RM`,
          `RM = (${pc(ri, 1)} − ${pc(a, 1)}) / ${fx(b)} = ${pc(ri - a, 1)} / ${fx(b)} = ${pc(rm)}`,
        ]);
    },
    () => {
      const rf = 0.02, bs = [1.2, 0.5, 0.3, 0.4], fs = [0.05, 0.02, 0.03, 0.04];
      const e = rf + wavg(bs, fs);
      return Q("pm-rm-m5", "moyen", "Expected return from the Carhart four-factor model?",
        [["Risk-free rate", pc(rf)], ["Market: β / premium", `${fx(bs[0])} / ${pc(fs[0])}`], ["Size: β / premium", `${fx(bs[1])} / ${pc(fs[1])}`], ["Value: β / premium", `${fx(bs[2])} / ${pc(fs[2])}`], ["Momentum: β / premium", `${fx(bs[3])} / ${pc(fs[3])}`]],
        e * 100, "%", 2, [
          `Contributions : ${bs.map((b, i) => `${fx(b)} × ${pc(fs[i])} = ${pc(b * fs[i])}`).join(" ; ")}`,
          `E(Ri) = ${pc(rf)} + ${pc(wavg(bs, fs))} = ${pc(e)} (Carhart ajoute le momentum aux 3 facteurs de Fama-French)`,
        ]);
    },
    () => {
      const a = 0.002, b = 1.4, erm = 0.09, rm = -0.05, ri = -0.04;
      const exp = a + b * rm;
      return Q("pm-rm-d1", "difficile", "Abnormal return this year?",
        [["α (intercept)", pc(a, 1)], ["β", fx(b)], ["Expected market return", pc(erm)], ["Actual market return", pc(rm)], ["Actual stock return", pc(ri)]],
        (ri - exp) * 100, "%", 2, [
          "Le rendement anormal se mesure avec le marché RÉALISÉ : l'espéré (9%) est une donnée-piège.",
          `Attendu sachant le marché = ${pc(a, 1)} + ${fx(b)} × (${pc(rm)}) = ${pc(exp)}`,
          `Anormal = ${pc(ri)} − (${pc(exp)}) = ${pc(ri - exp)} : le titre a mieux résisté que prévu`,
        ]);
    },
    () => {
      const w = [0.6, 0.4], a = [0.005, -0.003], b = [1.2, 0.8], rm = 0.06, r = [0.09, 0.04];
      const ab = r.map((x, i) => x - (a[i] + b[i] * rm));
      const p = wavg(w, ab);
      return Q("pm-rm-d2", "difficile", "Abnormal return of the portfolio?",
        [["Weights A / B", `${pc(w[0], 0)} / ${pc(w[1], 0)}`], ["α of A / B", `${pc(a[0], 1)} / ${pc(a[1], 1)}`], ["β of A / B", `${fx(b[0])} / ${fx(b[1])}`], ["Actual market return", pc(rm)], ["Actual returns of A / B", `${pc(r[0])} / ${pc(r[1])}`]],
        p * 100, "%", 2, [
          `A : attendu = ${pc(a[0], 1)} + ${fx(b[0])} × ${pc(rm)} = ${pc(a[0] + b[0] * rm)} ⇒ anormal = ${pc(ab[0])}`,
          `B : attendu = ${pc(a[1], 1)} + ${fx(b[1])} × ${pc(rm)} = ${pc(a[1] + b[1] * rm)} ⇒ anormal = ${pc(ab[1])}`,
          `Portefeuille = ${fx(w[0])} × ${pc(ab[0])} + ${fx(w[1])} × (${pc(ab[1])}) = ${pc(p)}`,
        ]);
    },
    () => {
      const e = 0.12, rf = 0.03, bm = 1.2, bv = 0.5, fv = 0.02;
      const mrp = (e - rf - bv * fv) / bm;
      return Q("pm-rm-d3", "difficile", "Market risk premium implied by the model?",
        [["Expected stock return", pc(e)], ["Risk-free rate", pc(rf)], ["Market factor β", fx(bm)], ["Value factor: β / premium", `${fx(bv)} / ${pc(fv)}`]],
        mrp * 100, "%", 2, [
          `Excédent total : ${pc(e)} − ${pc(rf)} = ${pc(e - rf)}`,
          `Part du facteur value : ${fx(bv)} × ${pc(fv)} = ${pc(bv * fv)} ⇒ part du marché = ${pc(e - rf - bv * fv)}`,
          `Prime de marché = ${pc(e - rf - bv * fv)} / ${fx(bm)} = ${pc(mrp, 3)}`,
        ]);
    },
    () => {
      const b = 0.8, rf = 0.04, rm = 0.15, ri = 0.13;
      const a = rf * (1 - b);
      const exp = a + b * rm;
      return Q("pm-rm-d4", "difficile", "Abnormal return? (α consistent with the single-index model)",
        [["β", fx(b)], ["Risk-free rate", pc(rf)], ["Actual market return", pc(rm)], ["Actual stock return", pc(ri)]],
        (ri - exp) * 100, "%", 2, [
          `α = ${pc(rf)} × (1 − ${fx(b)}) = ${pc(a)} (positif car β < 1)`,
          `Attendu = ${pc(a)} + ${fx(b)} × ${pc(rm)} = ${pc(exp)}`,
          `Anormal = ${pc(ri)} − ${pc(exp)} = ${pc(ri - exp)}`,
        ]);
    },
    () => {
      const rf = 0.03, bg = 1.5, fg = 0.02, bi = -0.8, fi = 0.015, bm = 1.1;
      const e = rf + bg * fg + bi * fi;
      return Q("pm-rm-d5", "difficile", "Expected return from the macroeconomic factor model?",
        [["Risk-free rate", pc(rf)], ["GDP growth factor: β / premium", `${fx(bg)} / ${pc(fg)}`], ["Inflation factor: β / premium", `${fx(bi)} / ${pc(fi)}`], ["Market β (CAPM)", fx(bm)]],
        e * 100, "%", 2, [
          "On utilise le modèle macro demandé : le β de marché est une donnée-piège.",
          `Contributions : ${fx(bg)} × ${pc(fg)} = ${pc(bg * fg)} ; (${fx(bi)}) × ${pc(fi)} = ${pc(bi * fi)}`,
          `E(Ri) = ${pc(rf)} + ${pc(bg * fg)} − ${pc(-bi * fi)} = ${pc(e)}`,
        ]);
    },
  ]),
};

// ===========================================================================
// 12. Bêta
// ===========================================================================

const T_BETA: CalcType = {
  key: "beta",
  topic: "portfolio",
  name: "Bêta (β = Cov / σM² = ρ σi / σM)",
  tier: "essentiel",
  source: "LM Portfolio Risk and Return: Part II · LOS e (Schweser R84)",
  formulas: [
    "βi = Cov(i,M) / σM²",
    "βi = ρ(i,M) × σi / σM",
    "Cov(i,M) = βi × σM² ; ρ(i,M) = βi × σM / σi",
    "β du marché = 1 ; β du sans risque = 0 ; β = pente de la security characteristic line",
  ],
  traps: [
    "Divise la covariance par la VARIANCE du marché (σM²), pas par σM.",
    "Le σ du titre ne sert que dans la version ρ × σi / σM.",
  ],
  questions: build([
    () => {
      const c = 0.0189, sdm = 0.15;
      const b = betaCov(c, sdm);
      return Q("pm-b-f1", "facile", "Beta of the stock?",
        [["Covariance(stock, market)", fx(c)], ["σM", pc(sdm)]],
        b, "", 2, [
          "β = Cov(i,M) / σM²",
          `= ${fx(c)} / ${fx(sdm)}² = ${fx(c)} / ${fx(sq(sdm), 4)} = ${fx(b, 4)}`,
        ]);
    },
    () => {
      const r = 0.65, sdi = 0.28, sdm = 0.14;
      const b = betaRho(r, sdi, sdm);
      return Q("pm-b-f2", "facile", "Beta of the stock?",
        [["Correlation with the market", fx(r)], ["σ of the stock", pc(sdi)], ["σM", pc(sdm)]],
        b, "", 2, [
          "β = ρ × σi / σM",
          `= ${fx(r)} × ${pc(sdi)} / ${pc(sdm)} = ${fx(r)} × ${fx(sdi / sdm, 4)} = ${fx(b, 4)}`,
        ]);
    },
    () => {
      const b = 0.9, sdm = 0.18;
      const c = b * sq(sdm);
      return Q("pm-b-f3", "facile", "Covariance with the market? (decimal)",
        [["β", fx(b)], ["σM", pc(sdm)]],
        c, "", 4, [
          "Cov(i,M) = β × σM²",
          `= ${fx(b)} × ${fx(sdm)}² = ${fx(b)} × ${fx(sq(sdm), 4)} = ${fx(c, 5)}`,
        ]);
    },
    () => {
      const c = 0.012, vm = 0.016;
      const b = c / vm;
      return Q("pm-b-f4", "facile", "Beta of the stock?",
        [["Covariance(stock, market)", fx(c)], ["Variance of the market", fx(vm)]],
        b, "", 2, [
          "On te donne déjà σM² : pas de mise au carré",
          `β = ${fx(c)} / ${fx(vm)} = ${fx(b, 4)}`,
        ]);
    },
    () => {
      const b = 1.1, sdi = 0.33, sdm = 0.15;
      const r = (b * sdm) / sdi;
      return Q("pm-b-f5", "facile", "Correlation with the market?",
        [["β", fx(b)], ["σ of the stock", pc(sdi)], ["σM", pc(sdm)]],
        r, "", 2, [
          "β = ρ σi / σM ⇒ ρ = β σM / σi",
          `= ${fx(b)} × ${pc(sdm)} / ${pc(sdi)} = ${fx(b * sdm * 100, 2)} / ${fx(sdi * 100)} = ${fx(r, 4)}`,
        ]);
    },
    () => {
      const r = 0.7, vm = 0.0256, vi = 0.0576;
      const b = betaRho(r, Math.sqrt(vi), Math.sqrt(vm));
      return Q("pm-b-m1", "moyen", "Beta of the stock?",
        [["Correlation with the market", fx(r)], ["Variance of the market", fx(vm)], ["Variance of the stock", fx(vi)]],
        b, "", 2, [
          `σM = √${fx(vm)} = ${pc(Math.sqrt(vm))} ; σi = √${fx(vi)} = ${pc(Math.sqrt(vi))}`,
          `β = ${fx(r)} × ${pc(Math.sqrt(vi))} / ${pc(Math.sqrt(vm))} = ${fx(b, 4)}`,
        ]);
    },
    () => {
      const c = 0.024, r = 0.6, sdi = 0.25;
      const sdm = c / (r * sdi);
      const b = betaCov(c, sdm);
      return Q("pm-b-m2", "moyen", "Beta of the stock?",
        [["Covariance(stock, market)", fx(c)], ["Correlation with the market", fx(r)], ["σ of the stock", pc(sdi)]],
        b, "", 2, [
          `σM manque : Cov = ρ σi σM ⇒ σM = ${fx(c)} / (${fx(r)} × ${fx(sdi)}) = ${pc(sdm)}`,
          `β = Cov / σM² = ${fx(c)} / ${fx(sq(sdm), 4)} = ${fx(b, 4)}`,
        ]);
    },
    () => {
      const c = 270, sdm = 15;
      const b = c / sq(sdm);
      return Q("pm-b-m3", "moyen", "Beta of the stock?",
        [["Covariance(stock, market), in %²", fx(c)], ["σM", `${fx(sdm)}%`]],
        b, "", 2, [
          `Même unité partout (%²) : σM² = ${fx(sdm)}² = ${fx(sq(sdm))}`,
          `β = ${fx(c)} / ${fx(sq(sdm))} = ${fx(b, 4)}`,
        ]);
    },
    () => {
      const b = 1.5, r = 0.75, sdm = 0.18;
      const sdi = (b * sdm) / r;
      return Q("pm-b-m4", "moyen", "σ of the stock?",
        [["β", fx(b)], ["Correlation with the market", fx(r)], ["σM", pc(sdm)]],
        sdi * 100, "%", 2, [
          "β = ρ σi / σM ⇒ σi = β σM / ρ",
          `= ${fx(b)} × ${pc(sdm)} / ${fx(r)} = ${pc(b * sdm)} / ${fx(r)} = ${pc(sdi)}`,
        ]);
    },
    () => {
      const c = 0.034, vmPct = 400;
      const vm = vmPct / 1e4;
      const b = c / vm;
      return Q("pm-b-m5", "moyen", "Beta of the stock?",
        [["Covariance(stock, market), decimal", fx(c)], ["Variance of the market, in %²", fx(vmPct)]],
        b, "", 2, [
          `Mets tout en décimal : ${fx(vmPct)} (%²) = ${fx(vmPct)} / 10,000 = ${fx(vm, 4)}`,
          `β = ${fx(c)} / ${fx(vm, 4)} = ${fx(b, 4)}`,
        ]);
    },
    () => {
      const s = [0.06, -0.02, 0.11], m = [0.04, -0.01, 0.06];
      const c = sampleCov(s, m);
      const vm = sampleVar(m);
      const b = c / vm;
      return Q("pm-b-d1", "difficile", "Beta estimated from these returns?",
        [["Stock returns", list(s)], ["Market returns", list(m)]],
        b, "", 2, [
          `Moyennes : stock ${pc(mean(s))} ; marché ${pc(mean(m))}`,
          `Cov = [${devs(s).map((d, i) => `(${fx(d * 100)})(${fx(devs(m)[i] * 100)})`).join(" + ")}] / 2 = ${fx(sumCross(s, m) * 1e4)} / 2 = ${fx(c * 1e4)} (%²)`,
          `σM² = [${devs(m).map((d) => `(${fx(d * 100)})²`).join(" + ")}] / 2 = ${fx(sumSqDev(m) * 1e4)} / 2 = ${fx(vm * 1e4)} (%²)`,
          `β = ${fx(c * 1e4)} / ${fx(vm * 1e4)} = ${fx(b, 4)}`,
        ]);
    },
    () => {
      const sA = 0.1, sB = 0.04, sdm = 0.03, cAB = 0.001, cAM = 0.0018;
      const b = betaCov(cAM, sdm);
      return Q("pm-b-d2", "difficile", "Beta of stock A?",
        [["σ of A", pc(sA)], ["σ of B", pc(sB)], ["σM", pc(sdm)], ["Covariance(A, B)", fx(cAB)], ["Covariance(A, market)", fx(cAM)]],
        b, "", 2, [
          "Seules Cov(A, M) et σM servent : B, Cov(A, B) et σA sont des données-pièges.",
          `β = ${fx(cAM)} / ${fx(sdm)}² = ${fx(cAM)} / ${fx(sq(sdm), 4)} = ${fx(b, 4)}`,
        ]);
    },
    () => {
      const bA = 1.2, sA = 0.24, sB = 0.3, sdm = 0.16;
      const r = (bA * sdm) / sA;
      const bB = betaRho(r, sB, sdm);
      return Q("pm-b-d3", "difficile", "Beta of B? (same correlation with the market as A)",
        [["β of A", fx(bA)], ["σ of A", pc(sA)], ["σ of B", pc(sB)], ["σM", pc(sdm)]],
        bB, "", 2, [
          `ρ de A = β σM / σA = ${fx(bA)} × ${pc(sdm)} / ${pc(sA)} = ${fx(r, 4)}`,
          `βB = ${fx(r, 4)} × ${pc(sB)} / ${pc(sdm)} = ${fx(bB, 4)}`,
        ]);
    },
    () => {
      const p1 = [0.02, 0.015], p2 = [0.1, 0.123];
      const b = (p2[1] - p1[1]) / (p2[0] - p1[0]);
      return Q("pm-b-d4", "difficile", "Beta (slope of the security characteristic line)?",
        [["Market excess return 2% → stock excess return", pc(p1[1], 1)], ["Market excess return 10% → stock excess return", pc(p2[1], 1)]],
        b, "", 2, [
          "β = pente de la droite caractéristique : variation du rendement excédentaire du titre / variation de celui du marché",
          `= (${pc(p2[1], 1)} − ${pc(p1[1], 1)}) / (${pc(p2[0])} − ${pc(p1[0])}) = ${fx((p2[1] - p1[1]) * 100, 2)} / ${fx((p2[0] - p1[0]) * 100)} = ${fx(b, 4)}`,
        ]);
    },
    () => {
      const b0 = 1.2, s0 = 0.15, s1 = 0.2;
      const rhoSigma = b0 * s0;
      const b1 = rhoSigma / s1;
      return Q("pm-b-d5", "difficile", "New beta? (ρ and σ of the stock unchanged)",
        [["Current β", fx(b0)], ["σM: current → new", `${pc(s0)} → ${pc(s1)}`]],
        b1, "", 2, [
          `β = ρ σi / σM ⇒ ρ σi = β × σM = ${fx(b0)} × ${pc(s0)} = ${pc(rhoSigma)} (inchangé)`,
          `Nouveau β = ${pc(rhoSigma)} / ${pc(s1)} = ${fx(b1, 4)}`,
        ]);
    },
  ]),
};

// ===========================================================================
// 13. Bêta de portefeuille
// ===========================================================================

const T_PBETA: CalcType = {
  key: "portfolio-beta",
  topic: "portfolio",
  name: "Bêta de portefeuille",
  tier: "essentiel",
  source: "LM Portfolio Risk and Return: Part II · LOS e-h",
  formulas: [
    "βp = Σ wi × βi (poids en valeur de marché)",
    "Bons du Trésor / cash : β = 0 ; indice de marché : β = 1",
    "Actif risqué + sans risque : βp = w × βrisqué ⇒ w = βcible / βrisqué",
  ],
  traps: [
    "Pondère par la valeur investie (nombre d'actions × prix), pas par le nombre d'actions.",
    "Emprunter pour investir plus de 100% porte β au-delà de celui de l'actif.",
  ],
  questions: build([
    () => {
      const w = [0.4, 0.6], b = [1.2, 0.8];
      const bp = wavg(w, b);
      return Q("pm-pb-f1", "facile", "Portfolio beta?",
        [["Weights A / B", `${pc(w[0], 0)} / ${pc(w[1], 0)}`], ["β of A / B", `${fx(b[0])} / ${fx(b[1])}`]],
        bp, "", 2, [
          "βp = Σ wi βi",
          `= ${fx(w[0])} × ${fx(b[0])} + ${fx(w[1])} × ${fx(b[1])} = ${fx(w[0] * b[0])} + ${fx(w[1] * b[1])} = ${fx(bp, 4)}`,
        ]);
    },
    () => {
      const w = [0.5, 0.3, 0.2], b = [1.1, 0.9, 1.5];
      const bp = wavg(w, b);
      return Q("pm-pb-f2", "facile", "Portfolio beta?",
        [["Weights A / B / C", w.map((x) => pc(x, 0)).join(" / ")], ["β of A / B / C", b.map((x) => fx(x)).join(" / ")]],
        bp, "", 2, [
          `βp = ${w.map((x, i) => `${fx(x)} × ${fx(b[i])}`).join(" + ")}`,
          `= ${w.map((x, i) => fx(x * b[i])).join(" + ")} = ${fx(bp, 4)}`,
        ]);
    },
    () => {
      const w = 0.8, b = 1.25;
      return Q("pm-pb-f3", "facile", "Portfolio beta?",
        [["Stocks: weight / β", `${pc(w, 0)} / ${fx(b)}`], ["Treasury bills: weight", pc(1 - w, 0)]],
        w * b, "", 2, [
          "Les T-bills ont β = 0",
          `βp = ${fx(w)} × ${fx(b)} + ${fx(1 - w)} × 0 = ${fx(w * b, 4)}`,
        ]);
    },
    () => {
      const w0 = 0.7, b0 = 1, target = 1.15;
      const bNew = (target - w0 * b0) / (1 - w0);
      return Q("pm-pb-f4", "facile", "Beta needed on the new 30% position?",
        [["Existing holdings: weight / β", `${pc(w0, 0)} / ${fx(b0)}`], ["New position weight", pc(1 - w0, 0)], ["Target portfolio β", fx(target)]],
        bNew, "", 2, [
          `${fx(target)} = ${fx(w0)} × ${fx(b0)} + ${fx(1 - w0)} × βnew`,
          `βnew = (${fx(target)} − ${fx(w0 * b0)}) / ${fx(1 - w0)} = ${fx(bNew, 4)}`,
        ]);
    },
    () => {
      const b = 1.4, target = 0.7;
      const w = target / b;
      return Q("pm-pb-f5", "facile", "Weight in the stock portfolio for a β of 0.7? (rest in T-bills)",
        [["β of the stock portfolio", fx(b)], ["Target β", fx(target)]],
        w * 100, "%", 2, [
          "βp = w × β (les T-bills ont β = 0) ⇒ w = βcible / β",
          `= ${fx(target)} / ${fx(b)} = ${pc(w)}`,
        ]);
    },
    () => {
      const v = [40000, 100000, 60000], b = [1.3, 0.8, 1.1];
      const tot = sum(v);
      const w = v.map((x) => x / tot);
      const bp = wavg(w, b);
      return Q("pm-pb-m1", "moyen", "Portfolio beta?",
        [["Amounts in A / B / C", v.map((x) => usd(x)).join(" / ")], ["β of A / B / C", b.map((x) => fx(x)).join(" / ")]],
        bp, "", 2, [
          `Poids : ${w.map((x) => fx(x)).join(" / ")} (sur ${amt(tot)})`,
          `βp = ${w.map((x, i) => `${fx(x)} × ${fx(b[i])}`).join(" + ")} = ${fx(bp, 4)}`,
        ]);
    },
    () => {
      const n = [1000, 500], p = [40, 120], b = [1.2, 0.9];
      const v = n.map((x, i) => x * p[i]);
      const w = v.map((x) => x / sum(v));
      const bp = wavg(w, b);
      return Q("pm-pb-m2", "moyen", "Portfolio beta?",
        [["Stock A", `${amt(n[0])} shares at ${usd(p[0])}, β ${fx(b[0])}`], ["Stock B", `${amt(n[1])} shares at ${usd(p[1])}, β ${fx(b[1])}`]],
        bp, "", 2, [
          `Valeurs : ${amt(v[0])} et ${amt(v[1])} ⇒ poids ${fx(w[0])} / ${fx(w[1])} (pas 2/3 – 1/3 en nombre d'actions)`,
          `βp = ${fx(w[0])} × ${fx(b[0])} + ${fx(w[1])} × ${fx(b[1])} = ${fx(bp, 4)}`,
        ]);
    },
    () => {
      const v0 = 800000, b0 = 1.1, v1 = 200000, b1 = 1.6;
      const bp = (v0 * b0 + v1 * b1) / (v0 + v1);
      return Q("pm-pb-m3", "moyen", "Portfolio beta after the purchase?",
        [["Existing portfolio: value / β", `${usd(v0)} / ${fx(b0)}`], ["New stock bought with new cash: value / β", `${usd(v1)} / ${fx(b1)}`]],
        bp, "", 2, [
          `Nouveau total = ${amt(v0 + v1)} ⇒ poids ${fx(v0 / (v0 + v1))} / ${fx(v1 / (v0 + v1))}`,
          `βp = ${fx(v0 / (v0 + v1))} × ${fx(b0)} + ${fx(v1 / (v0 + v1))} × ${fx(b1)} = ${fx(bp, 4)}`,
        ]);
    },
    () => {
      const v = 1000000, b0 = 1.2, target = 0.9;
      const w = target / b0;
      const move = (1 - w) * v;
      return Q("pm-pb-m4", "moyen", "Amount to move into T-bills?",
        [["Portfolio value", usd(v)], ["Current β", fx(b0)], ["Target β", fx(target)]],
        move, "$", 0, [
          `Part à garder en actions : w = ${fx(target)} / ${fx(b0)} = ${fx(w)}`,
          `À basculer en T-bills (β = 0) : (1 − ${fx(w)}) × ${amt(v)} = ${amt(move)}`,
        ]);
    },
    () => {
      const b0 = 1.1, w = 0.2, bOut = 1.5, bIn = 0.5;
      const b1 = b0 - w * bOut + w * bIn;
      return Q("pm-pb-m5", "moyen", "New portfolio beta?",
        [["Current portfolio β", fx(b0)], ["Position sold: weight / β", `${pc(w, 0)} / ${fx(bOut)}`], ["Replaced by a stock with β", fx(bIn)]],
        b1, "", 2, [
          `On retire ${fx(w)} × ${fx(bOut)} = ${fx(w * bOut)} et on ajoute ${fx(w)} × ${fx(bIn)} = ${fx(w * bIn)}`,
          `βp = ${fx(b0)} − ${fx(w * bOut)} + ${fx(w * bIn)} = ${fx(b1, 4)}`,
        ]);
    },
    () => {
      const eq = 500000, b = 0.9, target = 1.35;
      const w = target / b;
      const borrow = (w - 1) * eq;
      return Q("pm-pb-d1", "difficile", "Amount to borrow at the risk-free rate?",
        [["Investor's equity", usd(eq)], ["β of the stock portfolio", fx(b)], ["Target β", fx(target)]],
        borrow, "$", 0, [
          `Poids dans le portefeuille d'actions : w = ${fx(target)} / ${fx(b)} = ${fx(w)}`,
          `Investi = ${fx(w)} × ${amt(eq)} = ${amt(w * eq)} ⇒ emprunt = ${amt(w * eq)} − ${amt(eq)} = ${amt(borrow)}`,
        ]);
    },
    () => {
      const w = [0.6, 0.4], c = [0.03, 0.012], sdm = 0.2;
      const b = c.map((x) => betaCov(x, sdm));
      const bp = wavg(w, b);
      return Q("pm-pb-d2", "difficile", "Portfolio beta?",
        [["Weights A / B", `${pc(w[0], 0)} / ${pc(w[1], 0)}`], ["Cov(A, market) / Cov(B, market)", `${fx(c[0])} / ${fx(c[1])}`], ["σM", pc(sdm)]],
        bp, "", 2, [
          `σM² = ${fx(sq(sdm), 4)} ⇒ βA = ${fx(c[0])} / ${fx(sq(sdm), 4)} = ${fx(b[0])} ; βB = ${fx(c[1])} / ${fx(sq(sdm), 4)} = ${fx(b[1])}`,
          `βp = ${fx(w[0])} × ${fx(b[0])} + ${fx(w[1])} × ${fx(b[1])} = ${fx(bp, 4)}`,
        ]);
    },
    () => {
      const bX = 1.6, bY = 0.7, target = 1;
      const wX = (target - bY) / (bX - bY);
      return Q("pm-pb-d3", "difficile", "Weight in X for a portfolio beta of 1? (fully invested in X and Y)",
        [["β of X", fx(bX)], ["β of Y", fx(bY)], ["Target β", fx(target)]],
        wX * 100, "%", 2, [
          `${fx(target)} = wX × ${fx(bX)} + (1 − wX) × ${fx(bY)}`,
          `wX = (${fx(target)} − ${fx(bY)}) / (${fx(bX)} − ${fx(bY)}) = ${fx(target - bY)} / ${fx(bX - bY)} = ${pc(wX, 3)}`,
        ]);
    },
    () => {
      const v0 = [50000, 50000], b = [1.4, 0.6], r = [0.2, -0.1];
      const v1 = v0.map((x, i) => x * (1 + r[i]));
      const bp = wavg(v1.map((x) => x / sum(v1)), b);
      return Q("pm-pb-d4", "difficile", "Portfolio beta at year-end? (no rebalancing)",
        [["Start: amounts in A / B", `${usd(v0[0])} / ${usd(v0[1])}`], ["β of A / B", `${fx(b[0])} / ${fx(b[1])}`], ["Returns of A / B over the year", `${pc(r[0])} / ${pc(r[1])}`]],
        bp, "", 2, [
          `Valeurs en fin d'année : ${amt(v1[0])} et ${amt(v1[1])} (total ${amt(sum(v1))})`,
          `Nouveaux poids : ${fx(v1[0] / sum(v1))} / ${fx(v1[1] / sum(v1))}`,
          `βp = ${fx(v1[0] / sum(v1))} × ${fx(b[0])} + ${fx(v1[1] / sum(v1))} × ${fx(b[1])} = ${fx(bp, 4)} (la dérive des poids a fait monter le β)`,
        ]);
    },
    () => {
      const w = [0.3, 0.7], rho = [0.5, 0.9], sd = [0.4, 0.2], sdm = 0.2;
      const b = rho.map((r, i) => betaRho(r, sd[i], sdm));
      const bp = wavg(w, b);
      return Q("pm-pb-d5", "difficile", "Portfolio beta?",
        [["Weights A / B", `${pc(w[0], 0)} / ${pc(w[1], 0)}`], ["A: σ / correlation with market", `${pc(sd[0])} / ${fx(rho[0])}`], ["B: σ / correlation with market", `${pc(sd[1])} / ${fx(rho[1])}`], ["σM", pc(sdm)]],
        bp, "", 2, [
          `βA = ${fx(rho[0])} × ${pc(sd[0])} / ${pc(sdm)} = ${fx(b[0])} ; βB = ${fx(rho[1])} × ${pc(sd[1])} / ${pc(sdm)} = ${fx(b[1])}`,
          `βp = ${fx(w[0])} × ${fx(b[0])} + ${fx(w[1])} × ${fx(b[1])} = ${fx(bp, 4)}`,
          "A est deux fois plus volatil que B mais à peine plus « bêta » : c'est la corrélation qui compte.",
        ]);
    },
  ]),
};

// ===========================================================================
// 14. CAPM : rendement exigé
// ===========================================================================

const T_CAPM: CalcType = {
  key: "capm",
  topic: "portfolio",
  name: "CAPM : rendement exigé",
  tier: "essentiel",
  source: "LM Portfolio Risk and Return: Part II · LOS f-g (Schweser R84)",
  formulas: [
    "E(Ri) = Rf + βi × [E(RM) − Rf]",
    "Prime de risque du marché (MRP) = E(RM) − Rf ; prime du titre = βi × MRP",
    "Rf nominal ≈ taux réel sans risque + prime d'inflation",
  ],
  traps: [
    "Si on te donne la prime de risque (MRP), ne retranche pas Rf une seconde fois.",
    "β négatif ⇒ rendement exigé inférieur à Rf.",
  ],
  questions: build([
    () => {
      const rf = 0.03, erm = 0.09, b = 1.15;
      const e = capm(rf, b, erm);
      return Q("pm-capm-f1", "facile", "Required return (CAPM)?",
        [["Risk-free rate", pc(rf)], ["Expected market return", pc(erm)], ["β", fx(b)]],
        e * 100, "%", 2, [
          "E(Ri) = Rf + β [E(RM) − Rf]",
          `= ${pc(rf)} + ${fx(b)} × (${pc(erm)} − ${pc(rf)}) = ${pc(rf)} + ${fx(b)} × ${pc(erm - rf)} = ${pc(e)}`,
        ]);
    },
    () => {
      const rf = 0.025, mrp = 0.055, b = 0.8;
      const e = rf + b * mrp;
      return Q("pm-capm-f2", "facile", "Required return (CAPM)?",
        [["Risk-free rate", pc(rf)], ["Market risk premium", pc(mrp)], ["β", fx(b)]],
        e * 100, "%", 2, [
          "La prime de risque est déjà E(RM) − Rf",
          `E(Ri) = ${pc(rf)} + ${fx(b)} × ${pc(mrp)} = ${pc(rf)} + ${pc(b * mrp)} = ${pc(e)}`,
        ]);
    },
    () => {
      const rf = 0.04, erm = 0.1, b = -0.3;
      const e = capm(rf, b, erm);
      return Q("pm-capm-f3", "facile", "Required return (CAPM)?",
        [["Risk-free rate", pc(rf)], ["Expected market return", pc(erm)], ["β", fx(b)]],
        e * 100, "%", 2, [
          `E(Ri) = ${pc(rf)} + (${fx(b)}) × ${pc(erm - rf)} = ${pc(rf)} − ${pc(-b * (erm - rf))} = ${pc(e)}`,
          "β négatif : le titre couvre le portefeuille, on accepte moins que Rf.",
        ]);
    },
    () => {
      const e = 0.11, rf = 0.03, erm = 0.08;
      const b = (e - rf) / (erm - rf);
      return Q("pm-capm-f4", "facile", "Beta implied by the CAPM?",
        [["Required return", pc(e)], ["Risk-free rate", pc(rf)], ["Expected market return", pc(erm)]],
        b, "", 2, [
          "β = [E(Ri) − Rf] / [E(RM) − Rf]",
          `= (${pc(e)} − ${pc(rf)}) / (${pc(erm)} − ${pc(rf)}) = ${fx((e - rf) * 100)} / ${fx((erm - rf) * 100)} = ${fx(b, 4)}`,
        ]);
    },
    () => {
      const b = 1.25, e = 0.12, rf = 0.04;
      const mrp = (e - rf) / b;
      return Q("pm-capm-f5", "facile", "Market risk premium implied by the CAPM?",
        [["β", fx(b)], ["Required return", pc(e)], ["Risk-free rate", pc(rf)]],
        mrp * 100, "%", 2, [
          "MRP = [E(Ri) − Rf] / β",
          `= (${pc(e)} − ${pc(rf)}) / ${fx(b)} = ${pc(e - rf)} / ${fx(b)} = ${pc(mrp)}`,
        ]);
    },
    () => {
      const real = 0.015, infl = 0.025, b = 1.3, mrp = 0.05;
      const rf = real + infl;
      const e = rf + b * mrp;
      return Q("pm-capm-m1", "moyen", "Required return (CAPM)?",
        [["Real risk-free rate", pc(real)], ["Expected inflation premium", pc(infl)], ["β", fx(b)], ["Market risk premium", pc(mrp)]],
        e * 100, "%", 2, [
          `Rf nominal ≈ ${pc(real)} + ${pc(infl)} = ${pc(rf)}`,
          `E(Ri) = ${pc(rf)} + ${fx(b)} × ${pc(mrp)} = ${pc(e)}`,
        ]);
    },
    () => {
      const b = 1.5, e = 0.13, rf = 0.04;
      const erm = rf + (e - rf) / b;
      return Q("pm-capm-m2", "moyen", "Expected market return implied by the CAPM?",
        [["β", fx(b)], ["Required return", pc(e)], ["Risk-free rate", pc(rf)]],
        erm * 100, "%", 2, [
          `MRP = (${pc(e)} − ${pc(rf)}) / ${fx(b)} = ${pc((e - rf) / b)}`,
          `E(RM) = Rf + MRP = ${pc(rf)} + ${pc((e - rf) / b)} = ${pc(erm)}`,
        ]);
    },
    () => {
      const k = 1.5, erm = 0.1, rf = 0.04;
      const e = k * erm;
      const b = (e - rf) / (erm - rf);
      return Q("pm-capm-m3", "moyen", "Beta of a stock whose required return is 1.5 times the market's?",
        [["Expected market return", pc(erm)], ["Risk-free rate", pc(rf)]],
        b, "", 2, [
          `E(Ri) = ${fx(k)} × ${pc(erm)} = ${pc(e)}`,
          `β = (${pc(e)} − ${pc(rf)}) / (${pc(erm)} − ${pc(rf)}) = ${fx((e - rf) * 100)} / ${fx((erm - rf) * 100)} = ${fx(b, 4)}`,
          "β n'est pas 1.5 : c'est la prime, pas le rendement total, qui est proportionnelle à β.",
        ]);
    },
    () => {
      const a = [0.8, 0.08], c = [1.4, 0.11];
      const mrp = (c[1] - a[1]) / (c[0] - a[0]);
      const rf = a[1] - a[0] * mrp;
      return Q("pm-capm-m4", "moyen", "Risk-free rate implied by the SML?",
        [["Stock A: β / required return", `${fx(a[0])} / ${pc(a[1])}`], ["Stock B: β / required return", `${fx(c[0])} / ${pc(c[1])}`]],
        rf * 100, "%", 2, [
          `Pente de la SML (= MRP) = (${pc(c[1])} − ${pc(a[1])}) / (${fx(c[0])} − ${fx(a[0])}) = ${pc(c[1] - a[1])} / ${fx(c[0] - a[0])} = ${pc(mrp)}`,
          `Rf = ${pc(a[1])} − ${fx(a[0])} × ${pc(mrp)} = ${pc(rf)}`,
        ]);
    },
    () => {
      const b = -0.4, e = 0.016, rf = 0.04;
      const mrp = (e - rf) / b;
      return Q("pm-capm-m5", "moyen", "Expected market return implied by the CAPM?",
        [["β", fx(b)], ["Required return", pc(e, 1)], ["Risk-free rate", pc(rf)]],
        (rf + mrp) * 100, "%", 2, [
          `MRP = (${pc(e, 1)} − ${pc(rf)}) / (${fx(b)}) = (${pc(e - rf, 1)}) / (${fx(b)}) = ${pc(mrp)}`,
          `E(RM) = ${pc(rf)} + ${pc(mrp)} = ${pc(rf + mrp)}`,
        ]);
    },
    () => {
      const c = 0.0405, sdm = 0.18, rf = 0.035, erm = 0.105;
      const b = betaCov(c, sdm);
      const e = capm(rf, b, erm);
      return Q("pm-capm-d1", "difficile", "Required return (CAPM)?",
        [["Covariance(stock, market)", fx(c)], ["σM", pc(sdm)], ["Risk-free rate", pc(rf)], ["Expected market return", pc(erm)]],
        e * 100, "%", 2, [
          `β = ${fx(c)} / ${fx(sdm)}² = ${fx(c)} / ${fx(sq(sdm), 4)} = ${fx(b, 4)}`,
          `E(Ri) = ${pc(rf)} + ${fx(b)} × (${pc(erm)} − ${pc(rf)}) = ${pc(e)}`,
        ]);
    },
    () => {
      const r = 0.6, sdi = 0.35, sdm = 0.15, rf = 0.03, erm = 0.09;
      const b = betaRho(r, sdi, sdm);
      const e = capm(rf, b, erm);
      return Q("pm-capm-d2", "difficile", "Required return (CAPM)?",
        [["Correlation with the market", fx(r)], ["σ of the stock", pc(sdi)], ["σM", pc(sdm)], ["Risk-free rate", pc(rf)], ["Expected market return", pc(erm)]],
        e * 100, "%", 2, [
          `β = ${fx(r)} × ${pc(sdi)} / ${pc(sdm)} = ${fx(b, 4)}`,
          `E(Ri) = ${pc(rf)} + ${fx(b)} × ${pc(erm - rf)} = ${pc(e)}`,
        ]);
    },
    () => {
      const rf = 0.03, b0 = 1.1, b1 = 1.4, m0 = 0.05, m1 = 0.06;
      const e0 = rf + b0 * m0;
      const e1 = rf + b1 * m1;
      return Q("pm-capm-d3", "difficile", "Change in the required return (percentage points)?",
        [["Risk-free rate (unchanged)", pc(rf)], ["β: before → after", `${fx(b0)} → ${fx(b1)}`], ["Market risk premium: before → after", `${pc(m0)} → ${pc(m1)}`]],
        (e1 - e0) * 100, "%", 2, [
          `Avant : ${pc(rf)} + ${fx(b0)} × ${pc(m0)} = ${pc(e0)}`,
          `Après : ${pc(rf)} + ${fx(b1)} × ${pc(m1)} = ${pc(e1)}`,
          `Hausse = ${pc(e1)} − ${pc(e0)}`,
        ]);
    },
    () => {
      const b = 0.5, sdp = 0.3, sdm = 0.15, rf = 0.03, erm = 0.09;
      const e = capm(rf, b, erm);
      return Q("pm-capm-d4", "difficile", "Required return on this stock (CAPM)?",
        [["β", fx(b)], ["σ of the stock", pc(sdp)], ["σM", pc(sdm)], ["Risk-free rate", pc(rf)], ["Expected market return", pc(erm)]],
        e * 100, "%", 2, [
          `CAPM : seul β compte ⇒ E(Ri) = ${pc(rf)} + ${fx(b)} × ${pc(erm - rf)} = ${pc(e)}`,
          `Piège : la CML (${pc(rf)} + ${pc(erm - rf)} × ${pc(sdp)} / ${pc(sdm)} = ${pc(cmlRet(rf, erm, sdm, sdp))}) ne s'applique pas à un titre seul, inefficient.`,
        ]);
    },
    () => {
      const w = [0.4, 0.35, 0.25], b = [1.3, 0.8, 0], rf = 0.03, erm = 0.08;
      const bp = wavg(w, b);
      const e = capm(rf, bp, erm);
      return Q("pm-capm-d5", "difficile", "Required return on the portfolio (CAPM)?",
        [["Weights A / B / T-bills", w.map((x) => pc(x, 0)).join(" / ")], ["β of A / B", `${fx(b[0])} / ${fx(b[1])}`], ["Risk-free rate", pc(rf)], ["Expected market return", pc(erm)]],
        e * 100, "%", 2, [
          `βp = ${fx(w[0])} × ${fx(b[0])} + ${fx(w[1])} × ${fx(b[1])} + ${fx(w[2])} × 0 = ${fx(bp, 4)}`,
          `E(Rp) = ${pc(rf)} + ${fx(bp, 4)} × ${pc(erm - rf)} = ${pc(e)}`,
        ]);
    },
  ]),
};

// ===========================================================================
// 15. SML : titre sur- ou sous-évalué
// ===========================================================================

const T_SML: CalcType = {
  key: "sml-valuation",
  topic: "portfolio",
  name: "SML : titre sur- ou sous-évalué",
  tier: "essentiel",
  source: "LM Portfolio Risk and Return: Part II · LOS h (Schweser R84)",
  formulas: [
    "Rendement prévu (forecast) = (P1 − P0 + D1) / P0",
    "Rendement exigé (SML) = Rf + β × [E(RM) − Rf]",
    "Écart = prévu − exigé : > 0 ⇒ au-dessus de la SML, sous-évalué (achète) ; < 0 ⇒ surévalué (vends)",
    "Prix juste aujourd'hui = (P1 + D1) / (1 + rendement exigé)",
  ],
  traps: [
    "Au-dessus de la SML = SOUS-évalué : le rendement prévu dépasse ce que son β exige.",
    "N'oublie pas le dividende dans le rendement prévu.",
  ],
  questions: build([
    () => {
      const p0 = 25, p1 = 27, d = 1;
      const f = hpr(p0, p1, d);
      return Q("pm-sml-f1", "facile", "Forecast return?",
        [["Price today", usd(p0)], ["Expected price in 1 year", usd(p1)], ["Expected dividend", usd(d)]],
        f * 100, "%", 2, [
          "Rendement prévu = (P1 − P0 + D1) / P0",
          `= (${fx(p1)} − ${fx(p0)} + ${fx(d)}) / ${fx(p0)} = ${fx(p1 - p0 + d)} / ${fx(p0)} = ${pc(f)}`,
        ]);
    },
    () => {
      const f = 0.175, b = 0.8, rf = 0.07, erm = 0.15;
      const req = capm(rf, b, erm);
      return Q("pm-sml-f2", "facile", "Forecast minus required return (percentage points)?",
        [["Forecast return", pc(f, 1)], ["β", fx(b)], ["Risk-free rate", pc(rf)], ["Expected market return", pc(erm)]],
        (f - req) * 100, "%", 2, [
          `Exigé = ${pc(rf)} + ${fx(b)} × (${pc(erm)} − ${pc(rf)}) = ${pc(req)}`,
          `Écart = ${pc(f, 1)} − ${pc(req)} = ${signed((f - req) * 100)} points : au-dessus de la SML, sous-évalué ⇒ achète`,
        ]);
    },
    () => {
      const p0 = 20, p1 = 26;
      const f = hpr(p0, p1);
      return Q("pm-sml-f3", "facile", "Forecast return? (no dividend)",
        [["Price today", usd(p0)], ["Expected price in 1 year", usd(p1)]],
        f * 100, "%", 2, [
          `Rendement prévu = (${fx(p1)} − ${fx(p0)}) / ${fx(p0)} = ${pc(f)}`,
        ]);
    },
    () => {
      const f = 0.2, b = 1.5, rf = 0.05, erm = 0.15;
      const req = capm(rf, b, erm);
      return Q("pm-sml-f4", "facile", "Forecast minus required return (percentage points)?",
        [["Forecast return", pc(f)], ["β", fx(b)], ["Risk-free rate", pc(rf)], ["Expected market return", pc(erm)]],
        (f - req) * 100, "%", 2, [
          `Exigé = ${pc(rf)} + ${fx(b)} × ${pc(erm - rf)} = ${pc(req)}`,
          `Écart = ${pc(f)} − ${pc(req)} = 0 : sur la SML, correctement évalué`,
        ]);
    },
    () => {
      const p0 = 40, d = 1, f = 0.1;
      const p1 = p0 * (1 + f) - d;
      return Q("pm-sml-f5", "facile", "Expected price in one year?",
        [["Price today", usd(p0)], ["Expected dividend", usd(d)], ["Forecast return", pc(f)]],
        p1, "$", 2, [
          "P0 × (1 + rendement) = P1 + D1",
          `P1 = ${fx(p0)} × ${fx(1 + f)} − ${fx(d)} = ${fx(p0 * (1 + f))} − ${fx(d)} = ${fx(p1)}`,
        ]);
    },
    () => {
      const p0 = 40, p1 = 44, d = 1.2, b = 1.1, rf = 0.03, erm = 0.1;
      const f = hpr(p0, p1, d);
      const req = capm(rf, b, erm);
      return Q("pm-sml-m1", "moyen", "Forecast minus required return (percentage points)?",
        [["Price today / in 1 year", `${usd(p0)} / ${usd(p1)}`], ["Expected dividend", usd(d)], ["β", fx(b)], ["Risk-free rate / E(RM)", `${pc(rf)} / ${pc(erm)}`]],
        (f - req) * 100, "%", 2, [
          `Prévu = (${fx(p1)} − ${fx(p0)} + ${fx(d)}) / ${fx(p0)} = ${pc(f)}`,
          `Exigé = ${pc(rf)} + ${fx(b)} × ${pc(erm - rf)} = ${pc(req)}`,
          `Écart = ${signed((f - req) * 100)} points : au-dessus de la SML ⇒ sous-évalué, achète`,
        ]);
    },
    () => {
      const p0 = 50, p1 = 54, d = 0.5, b = 1.4, rf = 0.04, erm = 0.11;
      const f = hpr(p0, p1, d);
      const req = capm(rf, b, erm);
      return Q("pm-sml-m2", "moyen", "Forecast minus required return (percentage points)?",
        [["Price today / in 1 year", `${usd(p0)} / ${usd(p1)}`], ["Expected dividend", usd(d)], ["β", fx(b)], ["Risk-free rate / E(RM)", `${pc(rf)} / ${pc(erm)}`]],
        (f - req) * 100, "%", 2, [
          `Prévu = (${fx(p1)} − ${fx(p0)} + ${fx(d)}) / ${fx(p0)} = ${pc(f)}`,
          `Exigé = ${pc(rf)} + ${fx(b)} × ${pc(erm - rf)} = ${pc(req)}`,
          `Écart = ${signed((f - req) * 100)} points : sous la SML ⇒ surévalué, vends (ou vends à découvert)`,
        ]);
    },
    () => {
      const p1 = 33, d = 1.5, rf = 0.03, erm = 0.09, b = 1;
      const req = capm(rf, b, erm);
      const p0 = (p1 + d) / (1 + req);
      return Q("pm-sml-m3", "moyen", "Fair price today?",
        [["Expected price in 1 year", usd(p1)], ["Expected dividend", usd(d)], ["β", fx(b)], ["Risk-free rate / E(RM)", `${pc(rf)} / ${pc(erm)}`]],
        p0, "$", 2, [
          `Rendement exigé = ${pc(rf)} + ${fx(b)} × ${pc(erm - rf)} = ${pc(req)} (β = 1 : celui du marché)`,
          `Prix juste = (${fx(p1)} + ${fx(d)}) / ${fx(1 + req)} = ${fx(p1 + d)} / ${fx(1 + req)} = ${fx(p0, 4)}`,
        ]);
    },
    () => {
      const p0 = 60, d = 2, b = 0.9, rf = 0.04, erm = 0.1;
      const req = capm(rf, b, erm);
      const p1 = p0 * (1 + req) - d;
      return Q("pm-sml-m4", "moyen", "Expected price in 1 year that would make the stock fairly priced?",
        [["Price today", usd(p0)], ["Expected dividend", usd(d)], ["β", fx(b)], ["Risk-free rate / E(RM)", `${pc(rf)} / ${pc(erm)}`]],
        p1, "$", 2, [
          `Rendement exigé = ${pc(rf)} + ${fx(b)} × ${pc(erm - rf)} = ${pc(req)}`,
          `P1 = ${fx(p0)} × ${fx(1 + req)} − ${fx(d)} = ${fx(p0 * (1 + req))} − ${fx(d)} = ${fx(p1)}`,
        ]);
    },
    () => {
      const p0 = 30, p1 = 33, d = 0.9, rf = 0.04, erm = 0.1;
      const f = hpr(p0, p1, d);
      const b = (f - rf) / (erm - rf);
      return Q("pm-sml-m5", "moyen", "Beta at which the stock would plot on the SML?",
        [["Price today / in 1 year", `${usd(p0)} / ${usd(p1)}`], ["Expected dividend", usd(d)], ["Risk-free rate / E(RM)", `${pc(rf)} / ${pc(erm)}`]],
        b, "", 2, [
          `Prévu = (${fx(p1)} − ${fx(p0)} + ${fx(d)}) / ${fx(p0)} = ${pc(f)}`,
          `Sur la SML : ${pc(f)} = ${pc(rf)} + β × ${pc(erm - rf)} ⇒ β = ${pc(f - rf)} / ${pc(erm - rf)} = ${fx(b, 4)}`,
        ]);
    },
    () => {
      const c = 0.052, sdm = 0.2, sdi = 0.38, p0 = 35, p1 = 39, d = 1.5, rf = 0.045, erm = 0.12;
      const b = betaCov(c, sdm);
      const f = hpr(p0, p1, d);
      const req = capm(rf, b, erm);
      return Q("pm-sml-d1", "difficile", "Forecast minus required return (percentage points)?",
        [["Price today / in 1 year", `${usd(p0)} / ${usd(p1)}`], ["Expected dividend", usd(d)], ["Covariance(stock, market)", fx(c)], ["σ of the stock / σM", `${pc(sdi)} / ${pc(sdm)}`], ["T-bill rate / E(RM)", `${pc(rf, 1)} / ${pc(erm)}`]],
        (f - req) * 100, "%", 2, [
          `β = ${fx(c)} / ${fx(sdm)}² = ${fx(b, 4)} (le σ du titre ne sert pas)`,
          `Prévu = (${fx(p1)} − ${fx(p0)} + ${fx(d)}) / ${fx(p0)} = ${pc(f, 3)}`,
          `Exigé = ${pc(rf, 1)} + ${fx(b)} × ${pc(erm - rf, 1)} = ${pc(req)}`,
          `Écart = ${signed((f - req) * 100, 3)} points : au-dessus de la SML ⇒ sous-évalué`,
        ]);
    },
    () => {
      const p0 = 24, p1 = 25.8, b = -0.4, rf = 0.03, erm = 0.09;
      const f = hpr(p0, p1);
      const req = capm(rf, b, erm);
      return Q("pm-sml-d2", "difficile", "Forecast minus required return (percentage points)?",
        [["Price today / in 1 year", `${usd(p0)} / ${usd(p1)}`], ["Dividend", "none"], ["β", fx(b)], ["Risk-free rate / E(RM)", `${pc(rf)} / ${pc(erm)}`]],
        (f - req) * 100, "%", 2, [
          `Prévu = (${fx(p1)} − ${fx(p0)}) / ${fx(p0)} = ${pc(f)}`,
          `Exigé = ${pc(rf)} + (${fx(b)}) × ${pc(erm - rf)} = ${pc(req)} (β négatif : exigé < Rf)`,
          `Écart = ${signed((f - req) * 100)} points ⇒ sous-évalué, alors même que ${pc(f)} < E(RM)`,
        ]);
    },
    () => {
      const r = 0.5, sdi = 0.36, sdm = 0.15, rf = 0.03, erm = 0.08, p1 = 45, d = 1.8;
      const b = betaRho(r, sdi, sdm);
      const req = capm(rf, b, erm);
      const p0 = (p1 + d) / (1 + req);
      return Q("pm-sml-d3", "difficile", "Fair price today?",
        [["Expected price in 1 year", usd(p1)], ["Expected dividend", usd(d)], ["Correlation with the market", fx(r)], ["σ of the stock / σM", `${pc(sdi)} / ${pc(sdm)}`], ["Risk-free rate / E(RM)", `${pc(rf)} / ${pc(erm)}`]],
        p0, "$", 2, [
          `β = ${fx(r)} × ${pc(sdi)} / ${pc(sdm)} = ${fx(b, 4)}`,
          `Exigé = ${pc(rf)} + ${fx(b)} × ${pc(erm - rf)} = ${pc(req)}`,
          `Prix juste = (${fx(p1)} + ${fx(d)}) / ${fx(1 + req)} = ${fx(p1 + d)} / ${fx(1 + req)} = ${fx(p0, 4)}`,
        ]);
    },
    () => {
      const f = 0.13, w = [0.6, 0.4], bs = [1.2, 0.7], rf = 0.03, erm = 0.11;
      const bp = wavg(w, bs);
      const req = capm(rf, bp, erm);
      return Q("pm-sml-d4", "difficile", "Portfolio forecast minus required return (percentage points)?",
        [["Forecast portfolio return", pc(f)], ["Weights A / B", `${pc(w[0], 0)} / ${pc(w[1], 0)}`], ["β of A / B", `${fx(bs[0])} / ${fx(bs[1])}`], ["Risk-free rate / E(RM)", `${pc(rf)} / ${pc(erm)}`]],
        (f - req) * 100, "%", 2, [
          `βp = ${fx(w[0])} × ${fx(bs[0])} + ${fx(w[1])} × ${fx(bs[1])} = ${fx(bp, 4)}`,
          `Exigé = ${pc(rf)} + ${fx(bp)} × ${pc(erm - rf)} = ${pc(req)}`,
          `Écart = ${pc(f)} − ${pc(req)} = ${signed((f - req) * 100)} points : au-dessus de la SML`,
        ]);
    },
    () => {
      const p0 = 80, p1 = 84, dq = 0.5, b = 0.8, rf = 0.035, erm = 0.095;
      const d = 4 * dq;
      const f = hpr(p0, p1, d);
      const req = capm(rf, b, erm);
      return Q("pm-sml-d5", "difficile", "Forecast minus required return (percentage points)?",
        [["Price today / in 1 year", `${usd(p0)} / ${usd(p1)}`], ["Quarterly dividend", usd(dq)], ["β", fx(b)], ["Risk-free rate / E(RM)", `${pc(rf, 1)} / ${pc(erm, 1)}`]],
        (f - req) * 100, "%", 2, [
          `Dividendes sur l'année : 4 × ${fx(dq)} = ${fx(d)}`,
          `Prévu = (${fx(p1)} − ${fx(p0)} + ${fx(d)}) / ${fx(p0)} = ${pc(f)}`,
          `Exigé = ${pc(rf, 1)} + ${fx(b)} × ${pc(erm - rf)} = ${pc(req)}`,
          `Écart = ${signed((f - req) * 100)} points : sous la SML ⇒ surévalué`,
        ]);
    },
  ]),
};

// ===========================================================================
// 16. Ratio de Sharpe
// ===========================================================================

const T_SHARPE: CalcType = {
  key: "sharpe-ratio",
  topic: "portfolio",
  name: "Ratio de Sharpe",
  tier: "essentiel",
  source: "LM Portfolio Risk and Return: Part II · LOS i (Schweser R84)",
  formulas: [
    "Sharpe = (Rp − Rf) / σp : rendement excédentaire par unité de risque TOTAL",
    "Pente d'une CAL = Sharpe du portefeuille risqué ; pente de la CML = Sharpe du marché",
    "Prêter ou emprunter au taux sans risque ne change pas le Sharpe",
  ],
  traps: [
    "Sharpe utilise σ, pas β (β, c'est Treynor).",
    "Si on te donne une variance, prends d'abord la racine.",
  ],
  questions: build([
    () => {
      const rp = 0.12, rf = 0.03, sd = 0.18;
      const s = sharpe(rp, rf, sd);
      return Q("pm-sh-f1", "facile", "Sharpe ratio?",
        [["Portfolio return", pc(rp)], ["Risk-free rate", pc(rf)], ["Portfolio σ", pc(sd)]],
        s, "", 2, [
          "Sharpe = (Rp − Rf) / σp",
          `= (${pc(rp)} − ${pc(rf)}) / ${pc(sd)} = ${fx((rp - rf) * 100)} / ${fx(sd * 100)} = ${fx(s, 4)}`,
        ]);
    },
    () => {
      const rp = 0.104, rf = 0.028, sd = 0.19;
      const s = sharpe(rp, rf, sd);
      return Q("pm-sh-f2", "facile", "Sharpe ratio?",
        [["Portfolio return", pc(rp, 1)], ["Risk-free rate", pc(rf, 1)], ["Portfolio σ", pc(sd)]],
        s, "", 2, [
          "Sharpe = (Rp − Rf) / σp",
          `= (${pc(rp, 1)} − ${pc(rf, 1)}) / ${pc(sd)} = ${fx((rp - rf) * 100, 2)} / ${fx(sd * 100)} = ${fx(s, 4)}`,
        ]);
    },
    () => {
      const target = 0.4, rf = 0.03, sd = 0.2;
      const rp = rf + target * sd;
      return Q("pm-sh-f3", "facile", "Return needed for a Sharpe ratio of 0.4?",
        [["Target Sharpe ratio", fx(target)], ["Risk-free rate", pc(rf)], ["Portfolio σ", pc(sd)]],
        rp * 100, "%", 2, [
          "Rp = Rf + Sharpe × σp",
          `= ${pc(rf)} + ${fx(target)} × ${pc(sd)} = ${pc(rf)} + ${pc(target * sd)} = ${pc(rp)}`,
        ]);
    },
    () => {
      const s = 0.6, rp = 0.13, rf = 0.04;
      const sd = (rp - rf) / s;
      return Q("pm-sh-f4", "facile", "Portfolio σ?",
        [["Sharpe ratio", fx(s)], ["Portfolio return", pc(rp)], ["Risk-free rate", pc(rf)]],
        sd * 100, "%", 2, [
          "σp = (Rp − Rf) / Sharpe",
          `= (${pc(rp)} − ${pc(rf)}) / ${fx(s)} = ${pc(rp - rf)} / ${fx(s)} = ${pc(sd)}`,
        ]);
    },
    () => {
      const v = 0.0625, rp = 0.11, rf = 0.03;
      const sd = Math.sqrt(v);
      const s = sharpe(rp, rf, sd);
      return Q("pm-sh-f5", "facile", "Sharpe ratio?",
        [["Portfolio return", pc(rp)], ["Risk-free rate", pc(rf)], ["Variance of portfolio returns", fx(v)]],
        s, "", 2, [
          `σp = √${fx(v)} = ${pc(sd)}`,
          `Sharpe = (${pc(rp)} − ${pc(rf)}) / ${pc(sd)} = ${fx(s, 4)}`,
        ]);
    },
    () => {
      const rf = 0.03, f: Array<[string, number, number]> = [["A", 0.11, 0.15], ["B", 0.14, 0.22], ["C", 0.09, 0.1]];
      const ss = f.map(([, r, s]) => sharpe(r, rf, s));
      const best = Math.max(...ss);
      return Q("pm-sh-m1", "moyen", "Highest Sharpe ratio among the three funds?",
        [...f.map(([n, r, s]): Datum => [`Fund ${n}: return / σ`, `${pc(r)} / ${pc(s)}`]), ["Risk-free rate", pc(rf)]],
        best, "", 2, [
          f.map(([n, r, s], i) => `${n} : (${pc(r)} − ${pc(rf)}) / ${pc(s)} = ${fx(ss[i], 4)}`).join(" ; "),
          `Le meilleur est ${f[ss.indexOf(best)][0]}, qui n'est pas le fonds au rendement le plus élevé.`,
        ]);
    },
    () => {
      const rs = [0.1, -0.04, 0.12, 0.06], rf = 0.02;
      const m = mean(rs);
      const sd = Math.sqrt(sampleVar(rs));
      const s = sharpe(m, rf, sd);
      return Q("pm-sh-m2", "moyen", "Ex post Sharpe ratio? (sample σ)",
        [["Annual returns", list(rs)], ["Average risk-free rate", pc(rf)]],
        s, "", 2, [
          `Moyenne = (${sumExpr(rs)}) / 4 = ${pc(m)}`,
          `s² = ${fx(sumSqDev(rs) * 1e4)} / 3 = ${fx(sampleVar(rs) * 1e4, 3)} (%²) ⇒ s = ${pc(sd, 3)}`,
          `Sharpe = (${pc(m)} − ${pc(rf)}) / ${pc(sd, 3)} = ${fx(s, 4)}`,
        ]);
    },
    () => {
      const w = 0.6, er = 0.13, sd = 0.25, rf = 0.04;
      const e = mix(w, er, rf);
      const s = sharpe(e, rf, w * sd);
      return Q("pm-sh-m3", "moyen", "Sharpe ratio of the combined portfolio?",
        [["Weight in the risky portfolio", pc(w, 0)], ["Risky portfolio: E(R) / σ", `${pc(er)} / ${pc(sd)}`], ["Risk-free rate", pc(rf)]],
        s, "", 2, [
          `E(Rp) = ${pc(rf)} + ${fx(w)} × ${pc(er - rf)} = ${pc(e)} ; σp = ${fx(w)} × ${pc(sd)} = ${pc(w * sd)}`,
          `Sharpe = (${pc(e)} − ${pc(rf)}) / ${pc(w * sd)} = ${fx(s, 4)}, le même que le risqué seul`,
        ]);
    },
    () => {
      const rp = 0.15, sd = 0.24, rm = 0.1, sdm = 0.16, rf = 0.02;
      const sp = sharpe(rp, rf, sd);
      const sm = sharpe(rm, rf, sdm);
      return Q("pm-sh-m4", "moyen", "Portfolio Sharpe minus market Sharpe? (3 decimals)",
        [["Portfolio: return / σ", `${pc(rp)} / ${pc(sd)}`], ["Market: return / σ", `${pc(rm)} / ${pc(sdm)}`], ["Risk-free rate", pc(rf)]],
        sp - sm, "", 3, [
          `Portefeuille : (${pc(rp)} − ${pc(rf)}) / ${pc(sd)} = ${fx(sp, 4)}`,
          `Marché : (${pc(rm)} − ${pc(rf)}) / ${pc(sdm)} = ${fx(sm, 4)}`,
          `Écart = ${fx(sp, 4)} − ${fx(sm, 4)} = ${fx(sp - sm, 4)} : le portefeuille est au-dessus de la CML`,
        ]);
    },
    () => {
      const rp = 0.12, rf = 0.04, b = 1.2, sd = 0.18;
      const s = sharpe(rp, rf, sd);
      return Q("pm-sh-m5", "moyen", "Sharpe ratio?",
        [["Portfolio return", pc(rp)], ["Risk-free rate", pc(rf)], ["Portfolio β", fx(b)], ["Portfolio σ", pc(sd)]],
        s, "", 2, [
          "Sharpe utilise σ : le β ne sert pas ici",
          `Sharpe = (${pc(rp)} − ${pc(rf)}) / ${pc(sd)} = ${fx((rp - rf) * 100)} / ${fx(sd * 100)} = ${fx(s, 4)}`,
        ]);
    },
    () => {
      const w = 0.5, eA = 0.08, eB = 0.12, sA = 0.1, sB = 0.2, r = 0.2, rf = 0.02;
      const e = wavg([w, 1 - w], [eA, eB]);
      const sd = Math.sqrt(var2(w, sA, sB, r));
      const s = sharpe(e, rf, sd);
      return Q("pm-sh-d1", "difficile", "Sharpe ratio of the 50/50 portfolio?",
        [["Asset A: E(R) / σ", `${pc(eA)} / ${pc(sA)}`], ["Asset B: E(R) / σ", `${pc(eB)} / ${pc(sB)}`], ["Correlation", fx(r)], ["Risk-free rate", pc(rf)]],
        s, "", 2, [
          `E(Rp) = ${fx(w)} × ${pc(eA)} + ${fx(1 - w)} × ${pc(eB)} = ${pc(e)}`,
          `σp² = ${fx(sq(w * sA), 4)} + ${fx(sq((1 - w) * sB), 4)} + 2 × ${fx(w)} × ${fx(1 - w)} × ${fx(r)} × ${fx(sA)} × ${fx(sB)} = ${fx(var2(w, sA, sB, r), 4)} ⇒ σp = ${pc(sd, 3)}`,
          `Sharpe = (${pc(e)} − ${pc(rf)}) / ${pc(sd, 3)} = ${fx(s, 4)} (mieux que A seul, ${fx(sharpe(eA, rf, sA))}, et que B seul, ${fx(sharpe(eB, rf, sB))})`,
        ]);
    },
    () => {
      const w = 1.5, er = 0.1, sd = 0.16, rf = 0.03;
      const e = mix(w, er, rf);
      const s = sharpe(e, rf, w * sd);
      return Q("pm-sh-d2", "difficile", "Sharpe ratio of the leveraged position?",
        [["Investment in P (borrowing at Rf)", pc(w, 0)], ["Portfolio P: return / σ", `${pc(er)} / ${pc(sd)}`], ["Risk-free rate", pc(rf)]],
        s, "", 2, [
          `Rendement = ${pc(rf)} + ${fx(w)} × ${pc(er - rf)} = ${pc(e)} ; σ = ${fx(w)} × ${pc(sd)} = ${pc(w * sd)}`,
          `Sharpe = (${pc(e)} − ${pc(rf)}) / ${pc(w * sd)} = ${fx(s, 4)}`,
          "Le levier multiplie excédent et risque par 1.5 : le Sharpe ne bouge pas.",
        ]);
    },
    () => {
      const rf = 0.03, rm = 0.09, sdm = 0.15, ef = 0.12;
      const sm = sharpe(rm, rf, sdm);
      const sMax = (ef - rf) / sm;
      return Q("pm-sh-d3", "difficile", "Maximum σ for the fund to match the market's Sharpe ratio?",
        [["Fund expected return", pc(ef)], ["Market: return / σ", `${pc(rm)} / ${pc(sdm)}`], ["Risk-free rate", pc(rf)]],
        sMax * 100, "%", 2, [
          `Sharpe du marché = (${pc(rm)} − ${pc(rf)}) / ${pc(sdm)} = ${fx(sm, 4)}`,
          `Il faut (${pc(ef)} − ${pc(rf)}) / σ ≥ ${fx(sm, 4)} ⇒ σ ≤ ${pc(ef - rf)} / ${fx(sm, 4)} = ${pc(sMax)}`,
        ]);
    },
    () => {
      const rs = [0.08, 0.14, -0.06, 0.1, 0.04], rf = 0.025;
      const m = mean(rs);
      const sd = Math.sqrt(sampleVar(rs));
      const s = sharpe(m, rf, sd);
      return Q("pm-sh-d4", "difficile", "Ex post Sharpe ratio? (sample σ)",
        [["Annual returns", list(rs)], ["Average risk-free rate", pc(rf, 1)]],
        s, "", 2, [
          `Moyenne = (${sumExpr(rs)}) / 5 = ${pc(m)}`,
          `Σ écarts² = ${sqDevExpr(rs)} = ${fx(sumSqDev(rs) * 1e4)}`,
          `s² = ${fx(sumSqDev(rs) * 1e4)} / 4 = ${fx(sampleVar(rs) * 1e4)} (%²) ⇒ s = ${pc(sd, 3)}`,
          `Sharpe = (${pc(m)} − ${pc(rf, 1)}) / ${pc(sd, 3)} = ${fx(s, 4)}`,
        ]);
    },
    () => {
      const mm = 0.11, rf = 0.03, sdm = 0.16;
      const s = (mm - rf) / sdm;
      return Q("pm-sh-d5", "difficile", "Sharpe ratio of portfolio P?",
        [["M² of P", pc(mm)], ["Risk-free rate", pc(rf)], ["σM", pc(sdm)]],
        s, "", 2, [
          "M² = Rf + Sharpe × σM ⇒ Sharpe = (M² − Rf) / σM",
          `= (${pc(mm)} − ${pc(rf)}) / ${pc(sdm)} = ${pc(mm - rf)} / ${pc(sdm)} = ${fx(s, 4)}`,
        ]);
    },
  ]),
};

// ===========================================================================
// 17. Ratio de Treynor
// ===========================================================================

const T_TREYNOR: CalcType = {
  key: "treynor-measure",
  topic: "portfolio",
  name: "Ratio de Treynor",
  tier: "essentiel",
  source: "LM Portfolio Risk and Return: Part II · LOS i (Schweser R84)",
  formulas: [
    "Treynor = (Rp − Rf) / βp : rendement excédentaire par unité de risque SYSTÉMATIQUE",
    "Treynor du marché = E(RM) − Rf (β = 1)",
    "Treynor > E(RM) − Rf ⇔ au-dessus de la SML ⇔ alpha de Jensen > 0",
  ],
  traps: [
    "Treynor utilise β : il convient aux portefeuilles bien diversifiés.",
    "Le résultat s'exprime en % par unité de β : (12 − 4) / 1.2 = 6.67%.",
  ],
  questions: build([
    () => {
      const rp = 0.12, rf = 0.04, b = 1.2;
      const t = treynor(rp, rf, b);
      return Q("pm-tr-f1", "facile", "Treynor measure?",
        [["Portfolio return", pc(rp)], ["Risk-free rate", pc(rf)], ["Portfolio β", fx(b)]],
        t * 100, "%", 2, [
          "Treynor = (Rp − Rf) / βp",
          `= (${pc(rp)} − ${pc(rf)}) / ${fx(b)} = ${pc(rp - rf)} / ${fx(b)} = ${pc(t, 3)}`,
        ]);
    },
    () => {
      const rm = 0.09, rf = 0.03;
      return Q("pm-tr-f2", "facile", "Treynor measure of the market portfolio?",
        [["Market return", pc(rm)], ["Risk-free rate", pc(rf)]],
        treynor(rm, rf, 1) * 100, "%", 2, [
          "Le marché a β = 1 : Treynor = RM − Rf",
          `= ${pc(rm)} − ${pc(rf)} = ${pc(rm - rf)}`,
        ]);
    },
    () => {
      const t = 0.05, rp = 0.11, rf = 0.03;
      const b = (rp - rf) / t;
      return Q("pm-tr-f3", "facile", "Portfolio β?",
        [["Treynor measure", pc(t)], ["Portfolio return", pc(rp)], ["Risk-free rate", pc(rf)]],
        b, "", 2, [
          "β = (Rp − Rf) / Treynor",
          `= (${pc(rp)} − ${pc(rf)}) / ${pc(t)} = ${fx((rp - rf) * 100)} / ${fx(t * 100)} = ${fx(b, 4)}`,
        ]);
    },
    () => {
      const t = 0.07, b = 0.9, rf = 0.025;
      const rp = rf + t * b;
      return Q("pm-tr-f4", "facile", "Portfolio return?",
        [["Treynor measure", pc(t)], ["Portfolio β", fx(b)], ["Risk-free rate", pc(rf)]],
        rp * 100, "%", 2, [
          "Rp = Rf + Treynor × β",
          `= ${pc(rf)} + ${pc(t)} × ${fx(b)} = ${pc(rf)} + ${pc(t * b)} = ${pc(rp)}`,
        ]);
    },
    () => {
      const rp = 0.075, rf = 0.03, b = 0.6;
      const t = treynor(rp, rf, b);
      return Q("pm-tr-f5", "facile", "Treynor measure?",
        [["Portfolio return", pc(rp)], ["Risk-free rate", pc(rf)], ["Portfolio β", fx(b)]],
        t * 100, "%", 2, [
          `Treynor = (${pc(rp)} − ${pc(rf)}) / ${fx(b)} = ${pc(rp - rf)} / ${fx(b)} = ${pc(t)}`,
          "Un β faible gonfle le Treynor d'un rendement modeste.",
        ]);
    },
    () => {
      const c = 0.0288, sdm = 0.16, rp = 0.12, rf = 0.03;
      const b = betaCov(c, sdm);
      const t = treynor(rp, rf, b);
      return Q("pm-tr-m1", "moyen", "Treynor measure?",
        [["Portfolio return", pc(rp)], ["Risk-free rate", pc(rf)], ["Cov(portfolio, market)", fx(c)], ["σM", pc(sdm)]],
        t * 100, "%", 2, [
          `β = ${fx(c)} / ${fx(sdm)}² = ${fx(c)} / ${fx(sq(sdm), 4)} = ${fx(b, 4)}`,
          `Treynor = ${pc(rp - rf)} / ${fx(b, 4)} = ${pc(t)}`,
        ]);
    },
    () => {
      const rf = 0.05, f: Array<[string, number, number]> = [["P", 0.13, 1.2], ["Q", 0.15, 1.4], ["R", 0.18, 1.8]];
      const ts = f.map(([, r, b]) => treynor(r, rf, b));
      const best = Math.max(...ts);
      return Q("pm-tr-m2", "moyen", "Highest Treynor measure among the three funds?",
        [...f.map(([n, r, b]): Datum => [`Fund ${n}: return / β`, `${pc(r)} / ${fx(b)}`]), ["Risk-free rate", pc(rf)]],
        best * 100, "%", 2, [
          f.map(([n, r, b], i) => `${n} : ${pc(r - rf)} / ${fx(b)} = ${pc(ts[i], 3)}`).join(" ; "),
          `Le meilleur par unité de β est ${f[ts.indexOf(best)][0]}.`,
        ]);
    },
    () => {
      const rp = 0.13, b = 1.3, rf = 0.03, rm = 0.1;
      const t = treynor(rp, rf, b);
      const tm = rm - rf;
      return Q("pm-tr-m3", "moyen", "Portfolio Treynor minus market Treynor (percentage points)?",
        [["Portfolio: return / β", `${pc(rp)} / ${fx(b)}`], ["Market return", pc(rm)], ["Risk-free rate", pc(rf)]],
        (t - tm) * 100, "%", 2, [
          `Portefeuille : ${pc(rp - rf)} / ${fx(b)} = ${pc(t, 3)}`,
          `Marché (β = 1) : ${pc(rm)} − ${pc(rf)} = ${pc(tm)}`,
          `Écart = ${signed((t - tm) * 100, 3)} : au-dessus de la SML`,
        ]);
    },
    () => {
      const w = [0.5, 0.5], bs = [1.4, 0.8], rp = 0.107, rf = 0.025;
      const bp = wavg(w, bs);
      const t = treynor(rp, rf, bp);
      return Q("pm-tr-m4", "moyen", "Treynor measure of the portfolio?",
        [["Portfolio return", pc(rp, 1)], ["Risk-free rate", pc(rf, 1)], ["Two stocks, 50% each: β", `${fx(bs[0])} / ${fx(bs[1])}`]],
        t * 100, "%", 2, [
          `βp = 0.5 × ${fx(bs[0])} + 0.5 × ${fx(bs[1])} = ${fx(bp)}`,
          `Treynor = (${pc(rp, 1)} − ${pc(rf, 1)}) / ${fx(bp)} = ${pc(rp - rf, 1)} / ${fx(bp)} = ${pc(t, 3)}`,
        ]);
    },
    () => {
      const r = 0.9, sdp = 0.24, sdm = 0.18, rp = 0.114, rf = 0.03;
      const b = betaRho(r, sdp, sdm);
      const t = treynor(rp, rf, b);
      return Q("pm-tr-m5", "moyen", "Treynor measure?",
        [["Portfolio return", pc(rp, 1)], ["Risk-free rate", pc(rf)], ["Correlation with the market", fx(r)], ["Portfolio σ / σM", `${pc(sdp)} / ${pc(sdm)}`]],
        t * 100, "%", 2, [
          `β = ${fx(r)} × ${pc(sdp)} / ${pc(sdm)} = ${fx(b, 4)}`,
          `Treynor = (${pc(rp, 1)} − ${pc(rf)}) / ${fx(b, 4)} = ${pc(rp - rf, 1)} / ${fx(b, 4)} = ${pc(t)}`,
        ]);
    },
    () => {
      const w = 1.2, rP = 0.1, bP = 1.1, rf = 0.03;
      const rL = mix(w, rP, rf);
      const bL = w * bP;
      const t = treynor(rL, rf, bL);
      return Q("pm-tr-d1", "difficile", "Treynor measure of the leveraged position?",
        [["Investment in P (borrowing at Rf)", pc(w, 0)], ["Portfolio P: return / β", `${pc(rP)} / ${fx(bP)}`], ["Risk-free rate", pc(rf)]],
        t * 100, "%", 2, [
          `Rendement = ${pc(rf)} + ${fx(w)} × ${pc(rP - rf)} = ${pc(rL)} ; β = ${fx(w)} × ${fx(bP)} = ${fx(bL)} (l'emprunt a β = 0)`,
          `Treynor = (${pc(rL)} − ${pc(rf)}) / ${fx(bL)} = ${pc(t, 3)}`,
          `Identique à P seul (${pc(rP - rf)} / ${fx(bP)}) : le levier ne change pas le Treynor.`,
        ]);
    },
    () => {
      const b = 1.3, rf = 0.03, rm = 0.09;
      const rp = rf + b * (rm - rf);
      return Q("pm-tr-d2", "difficile", "Minimum return for a Treynor measure at least equal to the market's?",
        [["Portfolio β", fx(b)], ["Risk-free rate", pc(rf)], ["Market return", pc(rm)]],
        rp * 100, "%", 2, [
          `Treynor du marché = ${pc(rm)} − ${pc(rf)} = ${pc(rm - rf)}`,
          `(Rp − ${pc(rf)}) / ${fx(b)} ≥ ${pc(rm - rf)} ⇒ Rp ≥ ${pc(rf)} + ${fx(b)} × ${pc(rm - rf)} = ${pc(rp)}`,
          "C'est exactement le rendement de la SML : Treynor > marché ⇔ alpha > 0.",
        ]);
    },
    () => {
      const a = 0.018, b = 1.2, rf = 0.03, rm = 0.09;
      const rp = capm(rf, b, rm) + a;
      const t = treynor(rp, rf, b);
      return Q("pm-tr-d3", "difficile", "Treynor measure?",
        [["Jensen's alpha", pc(a, 1)], ["Portfolio β", fx(b)], ["Risk-free rate", pc(rf)], ["Market return", pc(rm)]],
        t * 100, "%", 2, [
          `Rendement SML = ${pc(rf)} + ${fx(b)} × ${pc(rm - rf)} = ${pc(capm(rf, b, rm))}`,
          `Rp = ${pc(capm(rf, b, rm))} + α ${pc(a, 1)} = ${pc(rp)}`,
          `Treynor = (${pc(rp)} − ${pc(rf)}) / ${fx(b)} = ${pc(t)}`,
        ]);
    },
    () => {
      const w = [0.6, 0.4], r = [0.12, 0.08], b = [1.3, 0.7], rf = 0.03;
      const rp = wavg(w, r);
      const bp = wavg(w, b);
      const t = treynor(rp, rf, bp);
      return Q("pm-tr-d4", "difficile", "Treynor measure of the combined fund?",
        [["Manager weights 1 / 2", `${pc(w[0], 0)} / ${pc(w[1], 0)}`], ["Returns 1 / 2", `${pc(r[0])} / ${pc(r[1])}`], ["β 1 / 2", `${fx(b[0])} / ${fx(b[1])}`], ["Risk-free rate", pc(rf)]],
        t * 100, "%", 2, [
          `Rp = ${fx(w[0])} × ${pc(r[0])} + ${fx(w[1])} × ${pc(r[1])} = ${pc(rp)}`,
          `βp = ${fx(w[0])} × ${fx(b[0])} + ${fx(w[1])} × ${fx(b[1])} = ${fx(bp)}`,
          `Treynor = (${pc(rp)} − ${pc(rf)}) / ${fx(bp)} = ${pc(t, 3)}`,
        ]);
    },
    () => {
      const a: [number, number] = [0.1, 1.2], c: [number, number] = [0.075, 0.7];
      const rf = (c[0] * a[1] - a[0] * c[1]) / (a[1] - c[1]);
      return Q("pm-tr-d5", "difficile", "Risk-free rate if both portfolios have the same Treynor measure?",
        [["Portfolio A: return / β", `${pc(a[0])} / ${fx(a[1])}`], ["Portfolio B: return / β", `${pc(c[0], 1)} / ${fx(c[1])}`]],
        rf * 100, "%", 2, [
          `(${pc(a[0])} − Rf) / ${fx(a[1])} = (${pc(c[0], 1)} − Rf) / ${fx(c[1])}`,
          `${fx(c[1])} × (${fx(a[0] * 100)} − Rf) = ${fx(a[1])} × (${fx(c[0] * 100)} − Rf) ⇒ ${fx(c[1] * a[0] * 100)} − ${fx(c[1])}Rf = ${fx(a[1] * c[0] * 100)} − ${fx(a[1])}Rf`,
          `${fx(a[1] - c[1])} Rf = ${fx((a[1] * c[0] - c[1] * a[0]) * 100)} ⇒ Rf = ${pc(rf)}`,
        ]);
    },
  ]),
};

// ===========================================================================
// 18. M² et M² alpha
// ===========================================================================

const T_M2: CalcType = {
  key: "m-squared",
  topic: "portfolio",
  name: "M² (M-squared) et M² alpha",
  tier: "essentiel",
  source: "LM Portfolio Risk and Return: Part II · LOS i (Schweser R84)",
  formulas: [
    "M² = Rf + (σM / σP) × (RP − Rf) = Rf + Sharpe_P × σM",
    "M² alpha = M² − RM (> 0 : P bat le marché à risque total égal)",
    "P* : poids σM / σP dans P, le reste au taux sans risque (emprunt si > 100%)",
    "M² classe les portefeuilles comme le ratio de Sharpe",
  ],
  traps: [
    "Schweser appelle M² le rendement de P* ; certains énoncés appellent M² l'écart avec RM (le M² alpha) : lis bien la question.",
    "C'est σM / σP (on ramène P au risque du marché), pas l'inverse.",
  ],
  questions: build([
    () => {
      const rp = 0.12, sdp = 0.24, rf = 0.03, sdm = 0.16;
      const m = m2(rp, rf, sdp, sdm);
      return Q("pm-m2-f1", "facile", "M² of the portfolio?",
        [["Portfolio: return / σ", `${pc(rp)} / ${pc(sdp)}`], ["Risk-free rate", pc(rf)], ["σM", pc(sdm)]],
        m * 100, "%", 2, [
          "M² = Rf + (σM / σP)(RP − Rf)",
          `= ${pc(rf)} + (${pc(sdm)} / ${pc(sdp)}) × ${pc(rp - rf)} = ${pc(rf)} + ${fx(sdm / sdp, 4)} × ${pc(rp - rf)} = ${pc(m)}`,
        ]);
    },
    () => {
      const s = 0.45, sdm = 0.18, rf = 0.02;
      const m = rf + s * sdm;
      return Q("pm-m2-f2", "facile", "M² of the portfolio?",
        [["Sharpe ratio of P", fx(s)], ["σM", pc(sdm)], ["Risk-free rate", pc(rf)]],
        m * 100, "%", 2, [
          "M² = Rf + Sharpe × σM",
          `= ${pc(rf)} + ${fx(s)} × ${pc(sdm)} = ${pc(rf)} + ${pc(s * sdm)} = ${pc(m)}`,
        ]);
    },
    () => {
      const sdm = 0.18, sdp = 0.12;
      const w = sdm / sdp;
      return Q("pm-m2-f3", "facile", "Weight in P needed to build P* (same σ as the market)?",
        [["σ of P", pc(sdp)], ["σM", pc(sdm)]],
        w * 100, "%", 2, [
          "Poids dans P = σM / σP",
          `= ${pc(sdm)} / ${pc(sdp)} = ${pc(w)} : P* emprunte ${pc(w - 1)} au taux sans risque`,
        ]);
    },
    () => {
      const rp = 0.08, sdp = 0.1, rf = 0.02, sdm = 0.15;
      const m = m2(rp, rf, sdp, sdm);
      return Q("pm-m2-f4", "facile", "M² of the portfolio?",
        [["Portfolio: return / σ", `${pc(rp)} / ${pc(sdp)}`], ["Risk-free rate", pc(rf)], ["σM", pc(sdm)]],
        m * 100, "%", 2, [
          "M² = Rf + (σM / σP)(RP − Rf)",
          `= ${pc(rf)} + (${pc(sdm)} / ${pc(sdp)}) × ${pc(rp - rf)} = ${pc(rf)} + ${fx(sdm / sdp)} × ${pc(rp - rf)} = ${pc(m)}`,
        ]);
    },
    () => {
      const m = 0.104, rm = 0.095;
      return Q("pm-m2-f5", "facile", "M² alpha?",
        [["M² of P", pc(m, 1)], ["Market return", pc(rm, 1)]],
        (m - rm) * 100, "%", 2, [
          "M² alpha = M² − RM",
          `= ${pc(m, 1)} − ${pc(rm, 1)} = ${pc(m - rm)} : P bat le marché à risque total égal`,
        ]);
    },
    () => {
      const rp = 0.14, sdp = 0.25, rf = 0.04, rm = 0.1, sdm = 0.2;
      const m = m2(rp, rf, sdp, sdm);
      return Q("pm-m2-m1", "moyen", "M² alpha?",
        [["Portfolio: return / σ", `${pc(rp)} / ${pc(sdp)}`], ["Market: return / σ", `${pc(rm)} / ${pc(sdm)}`], ["Risk-free rate", pc(rf)]],
        (m - rm) * 100, "%", 2, [
          `M² = ${pc(rf)} + (${pc(sdm)} / ${pc(sdp)}) × ${pc(rp - rf)} = ${pc(rf)} + ${fx(sdm / sdp)} × ${pc(rp - rf)} = ${pc(m)}`,
          `M² alpha = ${pc(m)} − ${pc(rm)} = ${pc(m - rm)}`,
        ]);
    },
    () => {
      const v = 0.0441, rp = 0.13, rf = 0.02, sdm = 0.14;
      const sdp = Math.sqrt(v);
      const m = m2(rp, rf, sdp, sdm);
      return Q("pm-m2-m2", "moyen", "M² of the portfolio?",
        [["Portfolio return", pc(rp)], ["Variance of portfolio returns", fx(v)], ["Risk-free rate", pc(rf)], ["σM", pc(sdm)]],
        m * 100, "%", 2, [
          `σP = √${fx(v)} = ${pc(sdp)}`,
          `M² = ${pc(rf)} + (${pc(sdm)} / ${pc(sdp)}) × ${pc(rp - rf)} = ${pc(rf)} + ${fx(sdm / sdp, 4)} × ${pc(rp - rf)} = ${pc(m, 3)}`,
        ]);
    },
    () => {
      const rm = 0.1, sdm = 0.16, rf = 0.03, sdp = 0.2;
      const rp = rf + ((rm - rf) * sdp) / sdm;
      return Q("pm-m2-m3", "moyen", "Return P needs for an M² alpha of zero?",
        [["Market: return / σ", `${pc(rm)} / ${pc(sdm)}`], ["Risk-free rate", pc(rf)], ["σ of P", pc(sdp)]],
        rp * 100, "%", 2, [
          "M² alpha nul ⇔ Sharpe de P = Sharpe du marché",
          `(RP − ${pc(rf)}) / ${pc(sdp)} = (${pc(rm)} − ${pc(rf)}) / ${pc(sdm)} = ${fx(sharpe(rm, rf, sdm), 4)}`,
          `RP = ${pc(rf)} + ${fx(sharpe(rm, rf, sdm), 4)} × ${pc(sdp)} = ${pc(rp)}`,
        ]);
    },
    () => {
      const rf = 0.03, sdm = 0.16, f: Array<[string, number, number]> = [["A", 0.12, 0.2], ["B", 0.09, 0.12]];
      const ms = f.map(([, r, s]) => m2(r, rf, s, sdm));
      const best = Math.max(...ms);
      return Q("pm-m2-m4", "moyen", "M² of the better fund?",
        [...f.map(([n, r, s]): Datum => [`Fund ${n}: return / σ`, `${pc(r)} / ${pc(s)}`]), ["Risk-free rate", pc(rf)], ["σM", pc(sdm)]],
        best * 100, "%", 2, [
          f.map(([n, r, s], i) => `${n} : ${pc(rf)} + (${pc(sdm)} / ${pc(s)}) × ${pc(r - rf)} = ${pc(ms[i])}`).join(" ; "),
          `Le meilleur est ${f[ms.indexOf(best)][0]}, malgré un rendement brut plus faible.`,
        ]);
    },
    () => {
      const sp = 0.55, sm = 0.45, sdm = 0.18;
      const a = (sp - sm) * sdm;
      return Q("pm-m2-m5", "moyen", "M² alpha?",
        [["Sharpe ratio of P", fx(sp)], ["Sharpe ratio of the market", fx(sm)], ["σM", pc(sdm)]],
        a * 100, "%", 2, [
          "M² alpha = M² − RM = (Rf + SP σM) − (Rf + SM σM) = (SP − SM) × σM",
          `= (${fx(sp)} − ${fx(sm)}) × ${pc(sdm)} = ${fx(sp - sm)} × ${pc(sdm)} = ${pc(a)}`,
        ]);
    },
    () => {
      const rp = 0.11, sdp = 0.15, b = 0.9, rf = 0.03, rm = 0.09, sdm = 0.18;
      const m = m2(rp, rf, sdp, sdm);
      return Q("pm-m2-d1", "difficile", "M² alpha?",
        [["Portfolio: return / σ / β", `${pc(rp)} / ${pc(sdp)} / ${fx(b)}`], ["Market: return / σ", `${pc(rm)} / ${pc(sdm)}`], ["Risk-free rate", pc(rf)]],
        (m - rm) * 100, "%", 2, [
          "M² repose sur le risque total : β est une donnée-piège.",
          `M² = ${pc(rf)} + (${pc(sdm)} / ${pc(sdp)}) × ${pc(rp - rf)} = ${pc(rf)} + ${fx(sdm / sdp)} × ${pc(rp - rf)} = ${pc(m)}`,
          `M² alpha = ${pc(m)} − ${pc(rm)} = ${pc(m - rm)}`,
        ]);
    },
    () => {
      const sdm = 0.2, sdp = 0.16;
      const w = sdm / sdp;
      return Q("pm-m2-d2", "difficile", "Amount borrowed per $100 of equity to build P*?",
        [["σ of P", pc(sdp)], ["σM", pc(sdm)]],
        (w - 1) * 100, "$", 0, [
          `P* doit avoir σ = σM : poids dans P = ${pc(sdm)} / ${pc(sdp)} = ${fx(w)}`,
          `Pour ${usd(100)} de fonds propres : ${usd(w * 100)} investis dans P, donc ${usd((w - 1) * 100)} empruntés au taux sans risque`,
        ]);
    },
    () => {
      const w = 0.5, rp = 0.12, sdp = 0.2, rf = 0.04, sdm = 0.15;
      const rc = mix(w, rp, rf);
      const sc = w * sdp;
      const m = m2(rc, rf, sc, sdm);
      return Q("pm-m2-d3", "difficile", "M² of the 50/50 mix of P and T-bills?",
        [["Portfolio P: return / σ", `${pc(rp)} / ${pc(sdp)}`], ["Mix", "50% P, 50% T-bills"], ["Risk-free rate", pc(rf)], ["σM", pc(sdm)]],
        m * 100, "%", 2, [
          `Mix : rendement = ${pc(rc)} ; σ = ${pc(sc)} ⇒ Sharpe = ${pc(rc - rf)} / ${pc(sc)} = ${fx(sharpe(rc, rf, sc), 4)}`,
          `M² = ${pc(rf)} + ${fx(sharpe(rc, rf, sc), 4)} × ${pc(sdm)} = ${pc(m)}`,
          "Même M² que P seul : mélanger avec le sans risque ne change ni le Sharpe ni le M².",
        ]);
    },
    () => {
      const rs = [0.12, -0.04, 0.1], rf = 0.02, sdm = 0.1;
      const m = mean(rs);
      const sd = Math.sqrt(sampleVar(rs));
      const mm = m2(m, rf, sd, sdm);
      return Q("pm-m2-d4", "difficile", "Ex post M² of P? (sample σ)",
        [["Annual returns of P", list(rs)], ["Average risk-free rate", pc(rf)], ["σM over the period", pc(sdm)]],
        mm * 100, "%", 2, [
          `Moyenne = (${sumExpr(rs)}) / 3 = ${pc(m)}`,
          `s² = ${fx(sumSqDev(rs) * 1e4)} / 2 = ${fx(sampleVar(rs) * 1e4)} (%²) ⇒ σP = ${pc(sd, 3)}`,
          `M² = ${pc(rf)} + (${pc(sdm)} / ${pc(sd, 3)}) × ${pc(m - rf)} = ${pc(mm, 3)}`,
        ]);
    },
    () => {
      const mm = 0.094, rp = 0.11, rf = 0.03, sdm = 0.15;
      const s = (mm - rf) / sdm;
      const sdp = (rp - rf) / s;
      return Q("pm-m2-d5", "difficile", "σ of portfolio P?",
        [["M² of P", pc(mm, 1)], ["Return of P", pc(rp)], ["Risk-free rate", pc(rf)], ["σM", pc(sdm)]],
        sdp * 100, "%", 2, [
          `Sharpe de P = (M² − Rf) / σM = (${pc(mm, 1)} − ${pc(rf)}) / ${pc(sdm)} = ${fx(s, 5)}`,
          `σP = (RP − Rf) / Sharpe = ${pc(rp - rf)} / ${fx(s, 5)} = ${pc(sdp, 3)}`,
        ]);
    },
  ]),
};

// ===========================================================================
// 19. Alpha de Jensen
// ===========================================================================

const T_JENSEN: CalcType = {
  key: "jensens-alpha",
  topic: "portfolio",
  name: "Alpha de Jensen",
  tier: "essentiel",
  source: "LM Portfolio Risk and Return: Part II · LOS i (Schweser R84)",
  formulas: [
    "αP = RP − [Rf + βP × (RM − Rf)]",
    "α > 0 : au-dessus de la SML (surperformance ajustée du β) ; α < 0 : en dessous",
    "Ex post : utilise le rendement RÉALISÉ du marché",
  ],
  traps: [
    "Jensen utilise β, pas σ.",
    "Ne confonds pas alpha de Jensen (risque β) et M² alpha (risque total).",
  ],
  questions: build([
    () => {
      const rp = 0.12, rf = 0.03, b = 1.2, rm = 0.09;
      const a = jensen(rp, rf, b, rm);
      return Q("pm-ja-f1", "facile", "Jensen's alpha?",
        [["Portfolio return", pc(rp)], ["Risk-free rate", pc(rf)], ["Portfolio β", fx(b)], ["Market return", pc(rm)]],
        a * 100, "%", 2, [
          `Rendement SML = ${pc(rf)} + ${fx(b)} × (${pc(rm)} − ${pc(rf)}) = ${pc(capm(rf, b, rm))}`,
          `α = ${pc(rp)} − ${pc(capm(rf, b, rm))} = ${pc(a)}`,
        ]);
    },
    () => {
      const rp = 0.07, rf = 0.02, b = 1.1, rm = 0.08;
      const a = jensen(rp, rf, b, rm);
      return Q("pm-ja-f2", "facile", "Jensen's alpha?",
        [["Portfolio return", pc(rp)], ["Risk-free rate", pc(rf)], ["Portfolio β", fx(b)], ["Market return", pc(rm)]],
        a * 100, "%", 2, [
          `Rendement SML = ${pc(rf)} + ${fx(b)} × ${pc(rm - rf)} = ${pc(capm(rf, b, rm))}`,
          `α = ${pc(rp)} − ${pc(capm(rf, b, rm))} = ${pc(a)} : sous la SML, sous-performance`,
        ]);
    },
    () => {
      const rp = 0.105, rf = 0.03, b = 1, rm = 0.098;
      const a = jensen(rp, rf, b, rm);
      return Q("pm-ja-f3", "facile", "Jensen's alpha?",
        [["Portfolio return", pc(rp, 1)], ["Risk-free rate", pc(rf)], ["Portfolio β", fx(b)], ["Market return", pc(rm, 1)]],
        a * 100, "%", 2, [
          "β = 1 : le rendement exigé est celui du marché, Rf s'annule",
          `α = ${pc(rp, 1)} − ${pc(rm, 1)} = ${pc(a)}`,
        ]);
    },
    () => {
      const a = 0.015, rf = 0.04, b = 0.9, rm = 0.1;
      const rp = capm(rf, b, rm) + a;
      return Q("pm-ja-f4", "facile", "Portfolio return?",
        [["Jensen's alpha", pc(a, 1)], ["Risk-free rate", pc(rf)], ["Portfolio β", fx(b)], ["Market return", pc(rm)]],
        rp * 100, "%", 2, [
          "RP = Rf + β (RM − Rf) + α",
          `= ${pc(rf)} + ${fx(b)} × ${pc(rm - rf)} + ${pc(a, 1)} = ${pc(capm(rf, b, rm))} + ${pc(a, 1)} = ${pc(rp)}`,
        ]);
    },
    () => {
      const rp = 0.115, rf = 0.025, mrp = 0.06, b = 1.3;
      const a = rp - (rf + b * mrp);
      return Q("pm-ja-f5", "facile", "Jensen's alpha?",
        [["Portfolio return", pc(rp, 1)], ["Risk-free rate", pc(rf, 1)], ["Market risk premium", pc(mrp)], ["Portfolio β", fx(b)]],
        a * 100, "%", 2, [
          `Rendement SML = ${pc(rf, 1)} + ${fx(b)} × ${pc(mrp)} = ${pc(rf + b * mrp)} (la prime est déjà RM − Rf)`,
          `α = ${pc(rp, 1)} − ${pc(rf + b * mrp)} = ${pc(a)}`,
        ]);
    },
    () => {
      const c = 0.0216, sdm = 0.12, rp = 0.13, rf = 0.03, rm = 0.08;
      const b = betaCov(c, sdm);
      const a = jensen(rp, rf, b, rm);
      return Q("pm-ja-m1", "moyen", "Jensen's alpha?",
        [["Portfolio return", pc(rp)], ["Risk-free rate", pc(rf)], ["Market return", pc(rm)], ["Cov(portfolio, market)", fx(c)], ["σM", pc(sdm)]],
        a * 100, "%", 2, [
          `β = ${fx(c)} / ${fx(sdm)}² = ${fx(c)} / ${fx(sq(sdm), 4)} = ${fx(b, 4)}`,
          `Rendement SML = ${pc(rf)} + ${fx(b)} × ${pc(rm - rf)} = ${pc(capm(rf, b, rm))}`,
          `α = ${pc(rp)} − ${pc(capm(rf, b, rm))} = ${pc(a)}`,
        ]);
    },
    () => {
      const w = [0.7, 0.3], bs = [1.2, 0.5], rp = 0.1, rf = 0.03, rm = 0.09;
      const bp = wavg(w, bs);
      const a = jensen(rp, rf, bp, rm);
      return Q("pm-ja-m2", "moyen", "Jensen's alpha of the portfolio?",
        [["Portfolio return", pc(rp)], ["Weights A / B", `${pc(w[0], 0)} / ${pc(w[1], 0)}`], ["β of A / B", `${fx(bs[0])} / ${fx(bs[1])}`], ["Risk-free rate / market return", `${pc(rf)} / ${pc(rm)}`]],
        a * 100, "%", 2, [
          `βp = ${fx(w[0])} × ${fx(bs[0])} + ${fx(w[1])} × ${fx(bs[1])} = ${fx(bp, 4)}`,
          `Rendement SML = ${pc(rf)} + ${fx(bp)} × ${pc(rm - rf)} = ${pc(capm(rf, bp, rm))}`,
          `α = ${pc(rp)} − ${pc(capm(rf, bp, rm))} = ${pc(a)}`,
        ]);
    },
    () => {
      const a = 0.02, rp = 0.14, rf = 0.04, rm = 0.1;
      const b = (rp - a - rf) / (rm - rf);
      return Q("pm-ja-m3", "moyen", "Portfolio β?",
        [["Jensen's alpha", pc(a)], ["Portfolio return", pc(rp)], ["Risk-free rate", pc(rf)], ["Market return", pc(rm)]],
        b, "", 2, [
          `Rendement SML = RP − α = ${pc(rp)} − ${pc(a)} = ${pc(rp - a)}`,
          `${pc(rp - a)} = ${pc(rf)} + β × ${pc(rm - rf)} ⇒ β = ${pc(rp - a - rf)} / ${pc(rm - rf)} = ${fx(b, 4)}`,
        ]);
    },
    () => {
      const a = -0.01, rp = 0.09, b = 1.25, rf = 0.02;
      const rm = rf + (rp - a - rf) / b;
      return Q("pm-ja-m4", "moyen", "Market return over the period?",
        [["Jensen's alpha", pc(a)], ["Portfolio return", pc(rp)], ["Portfolio β", fx(b)], ["Risk-free rate", pc(rf)]],
        rm * 100, "%", 2, [
          `Rendement SML = RP − α = ${pc(rp)} − (${pc(a)}) = ${pc(rp - a)}`,
          `${pc(rp - a)} = ${pc(rf)} + ${fx(b)} × (RM − ${pc(rf)}) ⇒ RM − ${pc(rf)} = ${pc(rp - a - rf)} / ${fx(b)} = ${pc((rp - a - rf) / b)}`,
          `RM = ${pc(rm)}`,
        ]);
    },
    () => {
      const real = 0.01, infl = 0.02, b = 0.8, rm = 0.08, rp = 0.075;
      const rf = real + infl;
      const a = jensen(rp, rf, b, rm);
      return Q("pm-ja-m5", "moyen", "Jensen's alpha?",
        [["Real risk-free rate", pc(real)], ["Inflation premium", pc(infl)], ["Portfolio β", fx(b)], ["Market return", pc(rm)], ["Portfolio return", pc(rp, 1)]],
        a * 100, "%", 2, [
          `Rf nominal ≈ ${pc(real)} + ${pc(infl)} = ${pc(rf)}`,
          `Rendement SML = ${pc(rf)} + ${fx(b)} × ${pc(rm - rf)} = ${pc(capm(rf, b, rm))}`,
          `α = ${pc(rp, 1)} − ${pc(capm(rf, b, rm))} = ${pc(a)}`,
        ]);
    },
    () => {
      const rp = 0.085, b = 1.2, rf = 0.02, erm = 0.09, rm = 0.06;
      const a = jensen(rp, rf, b, rm);
      return Q("pm-ja-d1", "difficile", "Ex post Jensen's alpha?",
        [["Portfolio return", pc(rp, 1)], ["Portfolio β", fx(b)], ["Risk-free rate", pc(rf)], ["Expected market return (start of year)", pc(erm)], ["Actual market return", pc(rm)]],
        a * 100, "%", 2, [
          "Évaluation ex post : prends le marché RÉALISÉ ; l'espéré est une donnée-piège.",
          `Rendement SML = ${pc(rf)} + ${fx(b)} × (${pc(rm)} − ${pc(rf)}) = ${pc(capm(rf, b, rm))}`,
          `α = ${pc(rp, 1)} − ${pc(capm(rf, b, rm))} = ${pc(a)}`,
        ]);
    },
    () => {
      const w = 1.3, rP = 0.1, bP = 1, rf = 0.03, rm = 0.09;
      const rL = mix(w, rP, rf);
      const bL = w * bP;
      const a = jensen(rL, rf, bL, rm);
      return Q("pm-ja-d2", "difficile", "Jensen's alpha of the leveraged position?",
        [["Investment in fund F (borrowing at Rf)", pc(w, 0)], ["Fund F: return / β", `${pc(rP)} / ${fx(bP)}`], ["Risk-free rate", pc(rf)], ["Market return", pc(rm)]],
        a * 100, "%", 2, [
          `Position : rendement = ${pc(rf)} + ${fx(w)} × ${pc(rP - rf)} = ${pc(rL)} ; β = ${fx(w)} × ${fx(bP)} = ${fx(bL)}`,
          `Rendement SML = ${pc(rf)} + ${fx(bL)} × ${pc(rm - rf)} = ${pc(capm(rf, bL, rm))}`,
          `α = ${pc(rL)} − ${pc(capm(rf, bL, rm))} = ${pc(a)}, soit ${fx(w)} × l'alpha du fonds seul (${pc(jensen(rP, rf, bP, rm))}) : contrairement à Sharpe et Treynor, l'alpha grossit avec le levier`,
        ]);
    },
    () => {
      const t = 0.076, b = 1.25, rf = 0.03, rm = 0.09;
      const rp = rf + t * b;
      const a = jensen(rp, rf, b, rm);
      return Q("pm-ja-d3", "difficile", "Jensen's alpha?",
        [["Treynor measure", pc(t, 1)], ["Portfolio β", fx(b)], ["Risk-free rate", pc(rf)], ["Market return", pc(rm)]],
        a * 100, "%", 2, [
          `RP = Rf + Treynor × β = ${pc(rf)} + ${pc(t, 1)} × ${fx(b)} = ${pc(rp)}`,
          `Rendement SML = ${pc(rf)} + ${fx(b)} × ${pc(rm - rf)} = ${pc(capm(rf, b, rm))}`,
          `α = ${pc(rp)} − ${pc(capm(rf, b, rm))} = ${pc(a)} (= β × (Treynor − ${pc(rm - rf)}))`,
        ]);
    },
    () => {
      const v0 = 1000000, v1 = 1060000, inc = 30000, b = 0.8, rf = 0.02, rm = 0.07;
      const rp = hpr(v0, v1, inc);
      const a = jensen(rp, rf, b, rm);
      return Q("pm-ja-d4", "difficile", "Jensen's alpha for the year?",
        [["Portfolio value: start / end", `${usd(v0)} / ${usd(v1)}`], ["Income received during the year", usd(inc)], ["Portfolio β", fx(b)], ["Risk-free rate / market return", `${pc(rf)} / ${pc(rm)}`]],
        a * 100, "%", 2, [
          `RP = (${amt(v1)} − ${amt(v0)} + ${amt(inc)}) / ${amt(v0)} = ${pc(rp)}`,
          `Rendement SML = ${pc(rf)} + ${fx(b)} × ${pc(rm - rf)} = ${pc(capm(rf, b, rm))}`,
          `α = ${pc(rp)} − ${pc(capm(rf, b, rm))} = ${pc(a)}`,
        ]);
    },
    () => {
      const A: [number, number] = [0.12, 1.3], B: [number, number] = [0.09, 0.7], rf = 0.03, rm = 0.09;
      const aA = jensen(A[0], rf, A[1], rm);
      const aB = jensen(B[0], rf, B[1], rm);
      return Q("pm-ja-d5", "difficile", "Alpha of A minus alpha of B (percentage points)?",
        [["Fund A: return / β", `${pc(A[0])} / ${fx(A[1])}`], ["Fund B: return / β", `${pc(B[0])} / ${fx(B[1])}`], ["Risk-free rate / market return", `${pc(rf)} / ${pc(rm)}`]],
        (aA - aB) * 100, "%", 2, [
          `αA = ${pc(A[0])} − (${pc(rf)} + ${fx(A[1])} × ${pc(rm - rf)}) = ${pc(A[0])} − ${pc(capm(rf, A[1], rm))} = ${pc(aA)}`,
          `αB = ${pc(B[0])} − (${pc(rf)} + ${fx(B[1])} × ${pc(rm - rf)}) = ${pc(B[0])} − ${pc(capm(rf, B[1], rm))} = ${pc(aB)}`,
          `Écart = ${pc(aA)} − ${pc(aB)} : B, au rendement brut plus faible, a le meilleur alpha`,
        ]);
    },
  ]),
};

// ===========================================================================
// Catalogue (ordre du curriculum)
// ===========================================================================

export const PORTFOLIO_CALC: CalcCatalog = {
  topic: "portfolio",
  types: [
    T_RETURNS,
    T_MWR_TWR,
    T_HIST,
    T_COV,
    T_TWO,
    T_DIVERS,
    T_UTILITY,
    T_CAL,
    T_CML,
    T_SYSTEMATIC,
    T_MODELS,
    T_BETA,
    T_PBETA,
    T_CAPM,
    T_SML,
    T_SHARPE,
    T_TREYNOR,
    T_M2,
    T_JENSEN,
  ],
};
