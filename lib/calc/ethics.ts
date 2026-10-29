// Exercices de calcul pur : Ethics and Professional Standards (CFA Level I).
//
// Contenu seulement : le moteur et les pages vivent ailleurs (lib/calc/engine.ts, app/calculs).
// Règle d'or : chaque réponse est CALCULÉE ici, à partir des mêmes nombres que les données
// affichées, par les petites fonctions du haut de fichier. Aucune réponse tapée à la main.
//
// Ethics n'a que deux calculs utiles à l'examen, et c'est voulu (pas de remplissage) :
//   1. l'allocation d'une IPO sursouscrite au prorata des ordres (Standard III(B) Fair Dealing,
//      priorité des clients sur les comptes du gérant, Standard VI(B) Priority of Transactions) ;
//   2. le rendement d'un composite GIPS, moyenne des rendements pondérée par les actifs de début
//      de période (Introduction to the GIPS Standards).
// Comme la matière a moins de 5 types, elle n'a pas de « Top 5 » (voir scripts/calc/valider.ts).
//
// Conventions : énoncés et données en anglais d'examen ; solutions en français, nombres au format
// français. Pour une réponse en %, `answer` vaut déjà le pourcentage (8,5 % → 8.5). Les quantités
// de titres s'écrivent en nombres entiers (unité vide) ; quand l'énoncé demande un arrondi, la
// question est « stricte » (± 0,5 titre) pour refuser une répartition arrondie autrement.

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

/** Nombre au format français (solutions). Sans `d` : jusqu'à 4 décimales, zéros inutiles retirés. */
const F = (x: number, d?: number): string => numStr(x, d, ",", NBSP);
/** Pourcentage à partir d'une fraction (0,085 → « 8,5% »). */
const P = (frac: number, d?: number): string => `${F(frac * 100, d)}%`;
/** Pourcentage déjà exprimé en % (0,085 s'écrit 8,5). */
const Pp = (pct: number, d?: number): string => `${F(pct, d)}%`;
/** Réponse en % (deux décimales). */
const Pa = (pct: number, d = 2): string => `${F(pct, d)}%`;
/** Quantité de titres, format français. */
const T = (x: number): string => `${F(x, 0)} titres`;
/** Montant en millions de dollars, format français. */
const M = (x: number): string => `${F(x)} M$`;

/** Formats anglais (données d'énoncé). */
const E = (x: number, d?: number): string => numStr(x, d, ".", ",");
const shr = (x: number): string => `${E(x, 0)} shares`;
const mil = (x: number): string => `$${E(x)} million`;
const pe = (pct: number, d = 1): string => `${E(pct, d)}%`;

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
  opts?: { tolerance?: number; strict?: boolean },
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
  if (opts?.tolerance !== undefined) out.tolerance = opts.tolerance;
  if (opts?.strict) out.strict = true;
  return out;
}

const sum = (xs: number[]): number => xs.reduce((s, x) => s + x, 0);

/* ────────────────────────── 1 · Allocation d'une IPO ────────────────────────── */

// Standard III(B) Fair Dealing et VI(B) Priority of Transactions : l'IPO sursouscrite se répartit entre
// les CLIENTS au prorata de leurs ordres ; un compte où le gérant a un intérêt (son compte, ou celui d'un
// proche qui ne paie pas de frais) passe après les clients. Un compte de proche qui est un client payant
// reste un client comme les autres. Une limite de la politique d'investissement (IPS) plafonne la demande
// utile d'un client.

type Acct = { name: string; order: number; cap?: number };

/** Demande retenue pour la répartition : l'ordre, plafonné par l'IPS s'il y en a un. */
const eff = (a: Acct): number => (a.cap === undefined ? a.order : Math.min(a.order, a.cap));
const demand = (cl: Acct[]): number => sum(cl.map(eff));
/** Titres exacts (non arrondis) du client i : au prorata de la demande retenue, sans dépasser l'ordre. */
const allocOf = (S: number, cl: Acct[], i: number): number => (S >= demand(cl) ? eff(cl[i]) : (S * eff(cl[i])) / demand(cl));

const orderRow = (a: Acct, label = `${a.name} order`): Row => [
  label,
  a.cap === undefined ? shr(a.order) : `${shr(a.order)} (its IPS limits the position to ${shr(a.cap)})`,
];

/** Étapes communes : demande retenue, taux de remplissage, titres du client `i`. */
function proRataLines(S: number, cl: Acct[], i: number, round: boolean): string[] {
  const lines: string[] = [];
  for (const a of cl) if (a.cap !== undefined && a.cap < a.order) lines.push(`${a.name} : ordre de ${T(a.order)}, mais son IPS plafonne la position à ${T(a.cap)} ⇒ demande retenue ${T(a.cap)}.`);
  const D = demand(cl);
  lines.push(`Demande des clients = ${cl.map((a) => F(eff(a), 0)).join(" + ")} = ${T(D)}, pour ${T(S)} alloués : l'émission est sursouscrite, on répartit au prorata.`);
  lines.push(`Taux de remplissage = ${F(S, 0)} / ${F(D, 0)} = ${P(S / D)} de chaque demande.`);
  const exact = allocOf(S, cl, i);
  lines.push(`${cl[i].name} = ${F(eff(cl[i]), 0)} × ${F(S, 0)} / ${F(D, 0)} = ${round ? `${F(exact, 2)} ⇒ ${T(Math.round(exact))} (arrondi à l'entier)` : T(exact)}.`);
  return lines;
}

const IPO: CalcType = {
  key: "ipo-allocation",
  topic: "ethics",
  name: "Allocation d'une IPO au prorata (Fair Dealing)",
  tier: "essentiel",
  source: "LM 3 · Guidance for Standards I–VII",
  formulas: [
    "Taux de remplissage = titres alloués à la firme / somme des demandes des clients (si < 100 %, l'émission est sursouscrite)",
    "Allocation du client i = demande du client i × taux de remplissage = S × demande i / Σ demandes",
    "Demande retenue = ordre, plafonné par la limite de l'IPS du client s'il y en a une",
    "Si Σ demandes des clients < S : les clients sont servis en entier, le solde seulement peut aller au compte du gérant",
  ],
  traps: [
    "Le compte du gérant (ou d'un proche qui ne paie pas de frais) passe APRÈS les clients : son ordre est exclu de la base du prorata tant que les clients ne sont pas servis en entier (Standards III(B) et VI(B)).",
    "Le compte d'un proche qui est un client payant (fee-paying) est un client comme un autre : il entre dans la base, sans faveur ni pénalité.",
    "Le prorata se fait sur la demande retenue (après plafond de l'IPS), pas sur l'ordre brut ; et jamais plus que l'ordre.",
  ],
  questions: [
    // ───── Facile : 2 ou 3 clients, chiffres ronds ─────
    (() => {
      const S = 10000;
      const cl: Acct[] = [{ name: "Client A", order: 20000 }, { name: "Client B", order: 30000 }];
      const a = allocOf(S, cl, 0);
      return q("eth-ipo-f1", "facile", "How many shares are allocated to Client A?",
        [["Shares allocated to the firm", shr(S)], orderRow(cl[0]), orderRow(cl[1])],
        a, "", 0, proRataLines(S, cl, 0, false), { tolerance: 0.5, strict: true });
    })(),
    (() => {
      const S = 6000;
      const cl: Acct[] = [{ name: "Client A", order: 5000 }, { name: "Client B", order: 10000 }, { name: "Client C", order: 15000 }];
      const a = allocOf(S, cl, 2);
      return q("eth-ipo-f2", "facile", "How many shares does Client C receive?",
        [["Shares allocated to the firm", shr(S)], orderRow(cl[0]), orderRow(cl[1]), orderRow(cl[2])],
        a, "", 0, proRataLines(S, cl, 2, false), { tolerance: 0.5, strict: true });
    })(),
    (() => {
      const S = 12000;
      const cl: Acct[] = [{ name: "Client A", order: 30000 }, { name: "Client B", order: 50000 }];
      const fill = (S / demand(cl)) * 100;
      return q("eth-ipo-f3", "facile", "What percentage of each client's order is filled?",
        [["Shares allocated to the firm", shr(S)], orderRow(cl[0]), orderRow(cl[1])],
        fill, "%", 2,
        [`Demande des clients = ${F(eff(cl[0]), 0)} + ${F(eff(cl[1]), 0)} = ${T(demand(cl))}.`,
          `Taux de remplissage = ${F(S, 0)} / ${F(demand(cl), 0)} = ${Pa(fill)} : chaque client reçoit la même fraction de son ordre (c'est ça, le prorata).`]);
    })(),
    (() => {
      const S = 4000;
      const cl: Acct[] = [{ name: "Client A", order: 2000 }, { name: "Client B", order: 3000 }, { name: "Client C", order: 5000 }];
      const a = allocOf(S, cl, 1);
      return q("eth-ipo-f4", "facile", "Shares allocated to Client B?",
        [["Shares allocated to the firm", shr(S)], orderRow(cl[0]), orderRow(cl[1]), orderRow(cl[2])],
        a, "", 0, proRataLines(S, cl, 1, false), { tolerance: 0.5, strict: true });
    })(),
    (() => {
      const S = 12000;
      const cl: Acct[] = [{ name: "Client A", order: 4000 }, { name: "Client B", order: 6000 }];
      const own: Acct = { name: "Compte personnel du gérant", order: 5000 };
      const left = Math.max(0, S - demand(cl));
      const a = Math.min(own.order, left);
      return q("eth-ipo-f5", "facile", "Maximum number of shares the manager's personal account may receive?",
        [["Shares allocated to the firm", shr(S)], orderRow(cl[0]), orderRow(cl[1]),
          ["Manager's personal account order (no fee)", shr(own.order)]],
        a, "", 0,
        [`Demande des clients = ${F(eff(cl[0]), 0)} + ${F(eff(cl[1]), 0)} = ${T(demand(cl))} ≤ ${T(S)} alloués : les clients sont servis à 100 %.`,
          `Reste après les clients = ${F(S, 0)} − ${F(demand(cl), 0)} = ${T(left)}.`,
          `Le compte du gérant passe après les clients et ne reçoit que ce reste, dans la limite de son ordre : min(${F(own.order, 0)} ; ${F(left, 0)}) = ${T(a)}.`], { tolerance: 0.5, strict: true });
    })(),

    // ───── Moyen : 4 ou 5 clients, quantités moins rondes, arrondi à l'entier ─────
    (() => {
      const S = 7500;
      const cl: Acct[] = [{ name: "Client A", order: 12400 }, { name: "Client B", order: 8650 }, { name: "Client C", order: 15300 }, { name: "Client D", order: 9950 }];
      const a = Math.round(allocOf(S, cl, 1));
      return q("eth-ipo-m1", "moyen", "Shares allocated to Client B (rounded to the nearest share)?",
        [["Shares allocated to the firm", shr(S)], ...cl.map((c) => orderRow(c))],
        a, "", 0, proRataLines(S, cl, 1, true), { tolerance: 0.5, strict: true });
    })(),
    (() => {
      const S = 18000;
      const cl: Acct[] = [{ name: "Client A", order: 14200 }, { name: "Client B", order: 9800 }, { name: "Client C", order: 22500 }, { name: "Client D", order: 6700 }, { name: "Client E", order: 11300 }];
      const a = Math.round(allocOf(S, cl, 2));
      return q("eth-ipo-m2", "moyen", "Shares allocated to Client C (rounded to the nearest share)?",
        [["Shares allocated to the firm", shr(S)], ...cl.map((c) => orderRow(c))],
        a, "", 0, proRataLines(S, cl, 2, true), { tolerance: 0.5, strict: true });
    })(),
    (() => {
      const S = 9000;
      const cl: Acct[] = [{ name: "Client A", order: 13200 }, { name: "Client B", order: 21500 }, { name: "Client C", order: 8900 }, { name: "Client D", order: 16450 }];
      const fill = (S / demand(cl)) * 100;
      return q("eth-ipo-m3", "moyen", "What percentage of each client's order is filled?",
        [["Shares allocated to the firm", shr(S)], ...cl.map((c) => orderRow(c))],
        fill, "%", 2,
        [`Demande des clients = ${cl.map((c) => F(eff(c), 0)).join(" + ")} = ${T(demand(cl))}.`,
          `Taux de remplissage = ${F(S, 0)} / ${F(demand(cl), 0)} = ${Pa(fill, 4)} ≈ ${Pa(fill)} de chaque ordre.`,
          `Chaque client reçoit la même fraction de son ordre : pas de favori, c'est la définition du traitement équitable.`]);
    })(),
    (() => {
      // ordres exprimés en dollars (prix d'émission donné) : le prorata se fait sur les montants
      const S = 150000;
      const price = 32;
      const dollars = [2_400_000, 3_200_000, 1_600_000, 4_000_000];
      const names = ["Client A", "Client B", "Client C", "Client D"];
      const cl: Acct[] = dollars.map((d, k) => ({ name: names[k], order: d / price }));
      const a = Math.round(allocOf(S, cl, 3));
      const totD = sum(dollars);
      return q("eth-ipo-m4", "moyen", "Shares allocated to Client D (rounded to the nearest share)?",
        [["Shares allocated to the firm", shr(S)], ["IPO price", `$${E(price)} per share`],
          ...dollars.map((d, k): Row => [`${names[k]} order`, `$${E(d)}`])],
        a, "", 0,
        [`Ordres en titres = montant / ${F(price)} $ : ${cl.map((c) => F(c.order, 0)).join(" ; ")} titres, soit ${T(demand(cl))} au total.`,
          `Demande des clients = ${T(demand(cl))} > ${T(S)} alloués : sursouscription, répartition au prorata.`,
          `Client D = ${F(S, 0)} × ${F(dollars[3])} / ${F(totD)} = ${F(allocOf(S, cl, 3), 2)} ⇒ ${T(a)} (arrondi à l'entier).`,
          `Le prix d'émission s'annule : le prorata sur les montants en dollars donne le même résultat que sur les titres.`], { tolerance: 0.5, strict: true });
    })(),
    (() => {
      // allocation de la firme donnée en % de l'émission
      const offering = 4_000_000;
      const pct = 2.5;
      const S = (offering * pct) / 100;
      const cl: Acct[] = [{ name: "Client A", order: 18500 }, { name: "Client B", order: 32000 }, { name: "Client C", order: 27300 }, { name: "Client D", order: 41200 }, { name: "Client E", order: 15000 }];
      const a = Math.round(allocOf(S, cl, 2));
      return q("eth-ipo-m5", "moyen", "Shares allocated to Client C (rounded to the nearest share)?",
        [["IPO size", shr(offering)], ["Firm's allocation", `${pe(pct)} of the offering`], ...cl.map((c) => orderRow(c))],
        a, "", 0,
        [`Titres alloués à la firme = ${F(pct)}% × ${F(offering, 0)} = ${T(S)}.`, ...proRataLines(S, cl, 2, true)], { tolerance: 0.5, strict: true });
    })(),

    // ───── Difficile : compte du gérant à exclure, proche client payant, plafond d'IPS ─────
    (() => {
      const S = 24000;
      const cl: Acct[] = [{ name: "Client A", order: 31000 }, { name: "Client B", order: 44000 }, { name: "Client C", order: 25000 }];
      const own: Acct = { name: "Compte personnel du gérant", order: 12000 };
      const a = Math.round(allocOf(S, cl, 1));
      const faux = (S * cl[1].order) / (demand(cl) + own.order);
      return q("eth-ipo-d1", "difficile", "Under the Standards, how many shares are allocated to Client B?",
        [["Shares allocated to the firm", shr(S)], orderRow(cl[0]), orderRow(cl[1]), orderRow(cl[2]),
          ["Portfolio manager's personal account order (no fee)", shr(own.order)]],
        a, "", 0,
        [`Le compte personnel du gérant (${T(own.order)}) est exclu : il passe après les clients tant qu'ils ne sont pas servis en entier (Standards III(B) et VI(B)).`,
          ...proRataLines(S, cl, 1, true),
          `Piège : inclure l'ordre du gérant donnerait ${F(S, 0)} × ${F(cl[1].order, 0)} / ${F(demand(cl) + own.order, 0)} = ${F(faux, 0)} titres, trop peu pour le client.`], { tolerance: 0.5, strict: true });
    })(),
    (() => {
      const S = 15000;
      const cl: Acct[] = [{ name: "Client A", order: 20000 }, { name: "Client B", order: 35000 }, { name: "Compte du frère du gérant", order: 15000 }];
      const own: Acct = { name: "Compte personnel du gérant", order: 8000 };
      const a = Math.round(allocOf(S, cl, 2));
      return q("eth-ipo-d2", "difficile", "How many shares are allocated to the manager's brother's account?",
        [["Shares allocated to the firm", shr(S)], orderRow(cl[0]), orderRow(cl[1]),
          ["Manager's brother's account order (fee-paying client)", shr(cl[2].order)],
          ["Portfolio manager's personal account order (no fee)", shr(own.order)]],
        a, "", 0,
        [`Le compte du frère paie des frais : c'est un client comme les autres, ni favorisé ni pénalisé. Il entre dans la base du prorata.`,
          `Le compte personnel du gérant (${T(own.order)}, sans frais) est exclu : il passe après les clients.`,
          ...proRataLines(S, cl, 2, true)], { tolerance: 0.5, strict: true });
    })(),
    (() => {
      const S = 10000;
      const cl: Acct[] = [{ name: "Client A", order: 12000 }, { name: "Client B", order: 9000 }, { name: "Client C", order: 14000, cap: 6000 }];
      const a = Math.round(allocOf(S, cl, 0));
      return q("eth-ipo-d3", "difficile", "Shares allocated to Client A (rounded to the nearest share)?",
        [["Shares allocated to the firm", shr(S)], orderRow(cl[0]), orderRow(cl[1]), orderRow(cl[2])],
        a, "", 0,
        [...proRataLines(S, cl, 0, true),
          `Piège : prendre l'ordre brut de Client C (${F(cl[2].order, 0)}) donnerait ${F((S * cl[0].order) / sum(cl.map((c) => c.order)), 0)} titres à Client A.`], { tolerance: 0.5, strict: true });
    })(),
    (() => {
      const S = 30000;
      const cl: Acct[] = [{ name: "Client A", order: 22000 }, { name: "Client B", order: 18000, cap: 10000 }, { name: "Client C", order: 40000 }];
      const own: Acct = { name: "Compte personnel du gérant", order: 5000 };
      const a = Math.round(allocOf(S, cl, 2));
      return q("eth-ipo-d4", "difficile", "Shares allocated to Client C (rounded to the nearest share)?",
        [["Shares allocated to the firm", shr(S)], orderRow(cl[0]), orderRow(cl[1]), orderRow(cl[2]),
          ["Portfolio manager's personal account order (no fee)", shr(own.order)]],
        a, "", 0,
        [`Le compte personnel du gérant (${T(own.order)}) est exclu : les clients passent d'abord.`,
          ...proRataLines(S, cl, 2, true)], { tolerance: 0.5, strict: true });
    })(),
    (() => {
      const S = 18000;
      const cl: Acct[] = [{ name: "Client A", order: 7000 }, { name: "Client B", order: 9000, cap: 4000 }, { name: "Client C", order: 2500 }];
      const own: Acct = { name: "Compte personnel du gérant", order: 6000 };
      const left = Math.max(0, S - demand(cl));
      const a = Math.min(own.order, left);
      return q("eth-ipo-d5", "difficile", "How many shares may the manager's personal account receive?",
        [["Shares allocated to the firm", shr(S)], orderRow(cl[0]), orderRow(cl[1]), orderRow(cl[2]),
          ["Manager's personal account order (no fee)", shr(own.order)]],
        a, "", 0,
        [`${cl[1].name} : ordre de ${T(cl[1].order)}, plafonné à ${T(cl[1].cap as number)} par son IPS ⇒ demande retenue ${T(eff(cl[1]))}.`,
          `Demande des clients = ${cl.map((c) => F(eff(c), 0)).join(" + ")} = ${T(demand(cl))} ≤ ${T(S)} : tous les clients sont servis en entier, il n'y a pas de prorata.`,
          `Reste = ${F(S, 0)} − ${F(demand(cl), 0)} = ${T(left)} ; l'ordre du gérant (${T(own.order)}) est plus grand, il est donc servi à hauteur du reste : ${T(a)}.`,
          `Le gérant passe en dernier : il ne reçoit que ce que les clients ne peuvent pas absorber.`], { tolerance: 0.5, strict: true });
    })(),
  ],
};

/* ────────────────────────── 2 · Rendement d'un composite GIPS ────────────────────────── */

// Un composite regroupe les portefeuilles gérés selon la même stratégie. Son rendement est la moyenne des
// rendements des portefeuilles PONDÉRÉE PAR LES ACTIFS de début de période (asset-weighted) : la moyenne
// simple n'est pas conforme. Un portefeuille entre dans le composite à la première période complète après
// son financement et en sort après sa dernière période complète ; un portefeuille non discrétionnaire
// n'y figure jamais. Les énoncés précisent la règle d'inclusion appliquée à la période de mesure.

type Port = { n: string; mv0: number; r: number; mv1?: number };

/** Rendement du portefeuille en % : donné, ou calculé depuis les valeurs de marché de début et de fin. */
const ret = (p: Port): number => (p.mv1 === undefined ? p.r : (p.mv1 / p.mv0 - 1) * 100);
const tot0 = (ps: Port[]): number => sum(ps.map((p) => p.mv0));
/** Rendement du composite en % : Σ (actifs de début × rendement) / Σ actifs de début. */
const composite = (ps: Port[]): number => sum(ps.map((p) => p.mv0 * ret(p))) / tot0(ps);
const simpleAvg = (ps: Port[]): number => sum(ps.map(ret)) / ps.length;

const portRow = (p: Port): Row => [`Portfolio ${p.n}`, `${mil(p.mv0)} at the start · return ${pe(p.r, 1)}`];
const portRowMv = (p: Port, note = ""): Row => [`Portfolio ${p.n}`, `${mil(p.mv0)} at the start · ${mil(p.mv1 as number)} at the end${note}`];

/** Étapes communes : poids de début de période puis moyenne pondérée. */
function gipsLines(ps: Port[], opts?: { mv?: boolean }): string[] {
  const lines: string[] = [];
  if (opts?.mv) lines.push(`Rendement de chaque portefeuille = valeur de fin / valeur de début − 1 (aucun flux externe) : ${ps.map((p) => `${p.n} = ${F(p.mv1 as number)} / ${F(p.mv0)} − 1 = ${Pp(ret(p))}`).join(" ; ")}.`);
  const T0 = tot0(ps);
  lines.push(`Actifs de DÉBUT de période = ${ps.map((p) => F(p.mv0)).join(" + ")} = ${M(T0)}.`);
  lines.push(`Poids : ${ps.map((p) => `w${p.n} = ${F(p.mv0)} / ${F(T0)} = ${P(p.mv0 / T0)}`).join(" ; ")}.`);
  lines.push(`Rendement du composite = ${ps.map((p) => `${P(p.mv0 / T0)} × ${Pp(ret(p))}`).join(" + ")} = ${Pa(composite(ps))}.`);
  return lines;
}

const GIPS_COMPOSITE: CalcType = {
  key: "gips-composite-return",
  topic: "ethics",
  name: "Rendement d'un composite GIPS (asset-weighted)",
  tier: "essentiel",
  source: "LM 4 · Introduction to the Global Investment Performance Standards (GIPS)",
  formulas: [
    "Poids du portefeuille i = actifs de début de période du portefeuille i / Σ actifs de début de période du composite",
    "Rendement du composite = Σ (poids i × rendement i)  (asset-weighted)",
    "Sans flux externe : rendement d'un portefeuille = valeur de fin / valeur de début − 1",
    "Seuls les portefeuilles discrétionnaires, gérés sur toute la période de mesure, comptent (nouveaux portefeuilles : période suivante)",
  ],
  traps: [
    "Pondérer par les actifs de DÉBUT de période, pas ceux de fin, et pas une moyenne simple (equal-weighted), qui n'est pas conforme.",
    "Un portefeuille non discrétionnaire est exclu du composite ; un portefeuille financé en cours de période n'y entre qu'à la première période complète, et un portefeuille clôturé en sort après sa dernière période complète.",
    "Les actifs d'un portefeuille exclu sortent aussi du dénominateur : on recalcule les poids sur les seuls portefeuilles retenus.",
  ],
  questions: [
    // ───── Facile : 2 portefeuilles ─────
    (() => {
      const ps: Port[] = [{ n: "A", mv0: 100, r: 8 }, { n: "B", mv0: 300, r: 12 }];
      const a = composite(ps);
      return q("eth-gips-f1", "facile", "Composite return for the year (asset-weighted)?",
        ps.map(portRow), a, "%", 2,
        [...gipsLines(ps), `Piège : la moyenne simple donnerait ${Pa(simpleAvg(ps))}, faux : il faut pondérer par les actifs de début.`]);
    })(),
    (() => {
      const ps: Port[] = [{ n: "A", mv0: 60, r: 5 }, { n: "B", mv0: 40, r: 10 }];
      const a = composite(ps);
      return q("eth-gips-f2", "facile", "What is the composite's asset-weighted return for the year?",
        ps.map(portRow), a, "%", 2,
        [...gipsLines(ps), `Piège : la moyenne simple donnerait ${Pa(simpleAvg(ps))}.`]);
    })(),
    (() => {
      const ps: Port[] = [{ n: "A", mv0: 180, r: 6 }, { n: "B", mv0: 420, r: 9 }];
      const a = (ps[1].mv0 / tot0(ps)) * 100;
      return q("eth-gips-f3", "facile", "What weight does Portfolio B carry in the composite return?",
        ps.map(portRow), a, "%", 2,
        [`Actifs de DÉBUT de période = ${F(ps[0].mv0)} + ${F(ps[1].mv0)} = ${M(tot0(ps))}.`,
          `Poids de B = ${F(ps[1].mv0)} / ${F(tot0(ps))} = ${Pa(a)}.`,
          `Le poids se lit sur les actifs de début de période, pas sur les rendements ni sur les actifs de fin.`]);
    })(),
    (() => {
      const ps: Port[] = [{ n: "A", mv0: 50, r: 9 }, { n: "B", mv0: 150, r: 3 }];
      const a = composite(ps);
      return q("eth-gips-f4", "facile", "Composite return for the year?",
        ps.map(portRow), a, "%", 2,
        [...gipsLines(ps), `Piège : la moyenne simple donnerait ${Pa(simpleAvg(ps))}, alors que le gros portefeuille tire le composite vers le bas.`]);
    })(),
    (() => {
      const ps: Port[] = [{ n: "A", mv0: 300, r: -3 }, { n: "B", mv0: 200, r: 7 }];
      const a = composite(ps);
      return q("eth-gips-f5", "facile", "Composite return for the year (asset-weighted)?",
        ps.map(portRow), a, "%", 2,
        [...gipsLines(ps), `Piège : la moyenne simple donnerait ${Pa(simpleAvg(ps))}.`]);
    })(),

    // ───── Moyen : 3 ou 4 portefeuilles ─────
    (() => {
      const ps: Port[] = [{ n: "A", mv0: 120, r: 6.5 }, { n: "B", mv0: 80, r: 9.2 }, { n: "C", mv0: 200, r: 4.1 }];
      const a = composite(ps);
      return q("eth-gips-m1", "moyen", "Composite return for the year (asset-weighted)?",
        ps.map(portRow), a, "%", 2,
        [...gipsLines(ps), `Piège : la moyenne simple donnerait ${Pa(simpleAvg(ps))}.`]);
    })(),
    (() => {
      const ps: Port[] = [{ n: "A", mv0: 75, r: 11.4 }, { n: "B", mv0: 210, r: 7.8 }, { n: "C", mv0: 140, r: 9.6 }, { n: "D", mv0: 35, r: -2.5 }];
      const a = composite(ps);
      return q("eth-gips-m2", "moyen", "Composite return for the year (asset-weighted)?",
        ps.map(portRow), a, "%", 2,
        [...gipsLines(ps), `Piège : la moyenne simple donnerait ${Pa(simpleAvg(ps))}.`]);
    })(),
    (() => {
      const ps: Port[] = [{ n: "A", mv0: 500, r: 4 }, { n: "B", mv0: 150, r: 10 }, { n: "C", mv0: 350, r: 6 }];
      const ecart = (simpleAvg(ps) - composite(ps)) * 100;
      return q("eth-gips-m3", "moyen", "By how many basis points (to the nearest bp) does the asset-weighted composite return fall below the simple average of the three portfolio returns?",
        ps.map(portRow), ecart, "bp", 0,
        [...gipsLines(ps),
          `Moyenne simple = (${ps.map((p) => F(p.r)).join(" + ")}) / ${ps.length} = ${Pa(simpleAvg(ps), 4)}.`,
          `Écart = ${Pa(simpleAvg(ps), 4)} − ${Pa(composite(ps), 4)} = ${F(ecart / 100, 4)} point de % = ${F(ecart, 1)} pb ≈ ${F(ecart, 0)} pb.`,
          `La moyenne simple surestime le composite ici : le portefeuille le plus gros est aussi le moins performant.`]);
    })(),
    (() => {
      // actifs de fin donnés en plus : ils ne servent pas à pondérer
      const ps: Port[] = [
        { n: "A", mv0: 160, r: 12, mv1: 160 * 1.12 },
        { n: "B", mv0: 240, r: 3, mv1: 240 * 1.03 },
        { n: "C", mv0: 100, r: 8, mv1: 100 * 1.08 },
      ];
      const a = composite(ps);
      const T1 = sum(ps.map((p) => p.mv1 as number));
      const faux = sum(ps.map((p) => (p.mv1 as number) * p.r)) / T1;
      return q("eth-gips-m4", "moyen", "Composite return for the year (asset-weighted)?",
        ps.map((p): Row => [`Portfolio ${p.n}`, `${mil(p.mv0)} at the start · ${mil(p.mv1 as number)} at the end · return ${pe(p.r, 1)}`]),
        a, "%", 2,
        [...gipsLines(ps),
          `Piège : les actifs de fin (${M(T1)}) ne servent pas de poids ; les utiliser donnerait ${Pa(faux)}.`]);
    })(),
    (() => {
      const ps: Port[] = [{ n: "A", mv0: 64, r: 12.3 }, { n: "B", mv0: 152, r: 8.6 }, { n: "C", mv0: 91, r: 10.9 }, { n: "D", mv0: 23, r: 15.2 }];
      const a = composite(ps);
      return q("eth-gips-m5", "moyen", "What is the composite return for the year?",
        ps.map(portRow), a, "%", 2,
        [...gipsLines(ps), `Piège : la moyenne simple donnerait ${Pa(simpleAvg(ps))}.`]);
    })(),

    // ───── Difficile : entrée / sortie du composite, poids à calculer depuis les valeurs de marché ─────
    (() => {
      const inc: Port[] = [{ n: "A", mv0: 140, r: 7.2 }, { n: "B", mv0: 260, r: 5.4 }, { n: "C", mv0: 100, r: 9.8 }];
      const nouveau: Port = { n: "D", mv0: 180, r: 14 };
      const a = composite(inc);
      const faux = composite([...inc, nouveau]);
      return q("eth-gips-d1", "difficile", "Composite return for the year, applying the inclusion rule below?",
        [["Inclusion rule", "A portfolio is included only if it was under management for the entire measurement period (one year)"],
          portRow(inc[0]), portRow(inc[1]), portRow(inc[2]),
          ["Portfolio D", `funded on October 1 · ${mil(nouveau.mv0)} · return ${pe(nouveau.r, 1)} since funding`]],
        a, "%", 2,
        [`D a été financé en cours d'année : sous la règle de l'énoncé il n'est pas dans le composite de l'année (GIPS : un nouveau portefeuille entre à la première période de mesure complète qui suit son financement).`,
          ...gipsLines(inc),
          `Piège : inclure D donnerait ${Pa(faux)}.`]);
    })(),
    (() => {
      const inc: Port[] = [{ n: "A", mv0: 90, r: 4.6 }, { n: "B", mv0: 310, r: 8.3 }, { n: "C", mv0: 150, r: 2.9 }];
      const sorti: Port = { n: "D", mv0: 250, r: -6 };
      const a = composite(inc);
      const faux = composite([...inc, sorti]);
      return q("eth-gips-d2", "difficile", "Composite return for the year, applying the inclusion rule below?",
        [["Inclusion rule", "A portfolio is included only if it was under management for the entire measurement period (one year)"],
          portRow(inc[0]), portRow(inc[1]), portRow(inc[2]),
          ["Portfolio D", `terminated on August 31 · ${mil(sorti.mv0)} at the start · return ${pe(sorti.r, 1)} until termination`]],
        a, "%", 2,
        [`D a été clôturé en cours d'année : il n'a pas été géré sur toute la période de mesure, il est donc absent du composite de l'année (GIPS : un portefeuille clôturé reste dans le composite jusqu'à sa dernière période complète).`,
          ...gipsLines(inc),
          `Piège : inclure D donnerait ${Pa(faux)}.`]);
    })(),
    (() => {
      const ps: Port[] = [{ n: "A", mv0: 215, r: 0, mv1: 229.3 }, { n: "B", mv0: 130, r: 0, mv1: 126.1 }, { n: "C", mv0: 355.5, r: 0, mv1: 372.6 }];
      const a = composite(ps);
      const T1 = sum(ps.map((p) => p.mv1 as number));
      return q("eth-gips-d3", "difficile", "Composite return for the year (no external cash flows)?",
        ps.map((p) => portRowMv(p)),
        a, "%", 2,
        [...gipsLines(ps, { mv: true }),
          `Contrôle : sans flux externe, le composite vaut aussi (${F(T1)} − ${F(tot0(ps))}) / ${F(tot0(ps))} = ${Pa(((T1 - tot0(ps)) / tot0(ps)) * 100)}.`]);
    })(),
    (() => {
      const inc: Port[] = [{ n: "A", mv0: 220, r: 9.1 }, { n: "B", mv0: 175, r: 6.3 }, { n: "D", mv0: 105, r: 11.7 }];
      const nouveau: Port = { n: "C", mv0: 300, r: 2.4 };
      const nonDisc: Port = { n: "E", mv0: 160, r: 15.5 };
      const a = composite(inc);
      const faux = composite([...inc, nouveau, nonDisc]);
      return q("eth-gips-d4", "difficile", "Composite return for the year, applying the inclusion rule below?",
        [["Inclusion rule", "Only discretionary portfolios under management for the entire measurement period (one year) are included"],
          portRow(inc[0]), portRow(inc[1]),
          ["Portfolio C", `funded on September 1 · ${mil(nouveau.mv0)} · return ${pe(nouveau.r, 1)} since funding`],
          portRow(inc[2]),
          ["Portfolio E", `non-discretionary (client restrictions) · ${mil(nonDisc.mv0)} at the start · return ${pe(nonDisc.r, 1)}`]],
        a, "%", 2,
        [`C a été financé en cours d'année : il n'est pas dans le composite de l'année.`,
          `E est non discrétionnaire (restrictions du client) : un portefeuille non discrétionnaire ne figure jamais dans un composite.`,
          `Restent A, B et D ; on recalcule les poids sur ces seuls portefeuilles.`,
          ...gipsLines(inc),
          `Piège : prendre les cinq portefeuilles donnerait ${Pa(faux)}.`]);
    })(),
    (() => {
      const inc: Port[] = [{ n: "A", mv0: 410, r: 0, mv1: 438.7 }, { n: "B", mv0: 265, r: 0, mv1: 253.4 }, { n: "C", mv0: 180, r: 0, mv1: 194.4 }];
      const nouveau: Port = { n: "D", mv0: 330, r: 0, mv1: 372.9 };
      const sorti: Port = { n: "E", mv0: 120, r: 0, mv1: 105.6 };
      const a = composite(inc);
      const faux = composite([...inc, nouveau, sorti]);
      return q("eth-gips-d5", "difficile", "Composite return for the year (no external cash flows), applying the inclusion rule below?",
        [["Inclusion rule", "A portfolio is included only if it was under management for the entire measurement period (one year)"],
          portRowMv(inc[0]), portRowMv(inc[1]), portRowMv(inc[2]),
          ["Portfolio D", `funded during the year · ${mil(nouveau.mv0)} at the start · ${mil(nouveau.mv1 as number)} at the end`],
          ["Portfolio E", `terminated during the year · ${mil(sorti.mv0)} at the start · ${mil(sorti.mv1 as number)} at the end`]],
        a, "%", 2,
        [`D (financé en cours d'année) et E (clôturé en cours d'année) n'ont pas été gérés sur toute la période : ils sont exclus du composite de l'année.`,
          ...gipsLines(inc, { mv: true }),
          `Piège : prendre les cinq portefeuilles donnerait ${Pa(faux)}.`]);
    })(),
  ],
};

/* ────────────────────────── Catalogue ────────────────────────── */

export const ETHICS_CALC: CalcCatalog = {
  topic: "ethics",
  types: [
    IPO,
    GIPS_COMPOSITE,
  ],
};
