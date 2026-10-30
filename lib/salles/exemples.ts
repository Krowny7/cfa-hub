// Salles : des parties d'exemple, sans base ni réseau, pour les aperçus
// (app/preview-da/salles) et le test de rendu (scripts/salles/test-partie.tsx).
// Chaque exemple donne l'état que etat_salle renverrait à un instant précis de
// la partie (l'heure `t` est fixe : l'écran se lit sans qu'il bouge) ; pour les
// aperçus interactifs, `reponseExemple` joue le rôle du serveur et corrige une
// réponse à la place de repondre_salle. Les bonnes réponses restent ici, dans
// SECRETS, et n'entrent dans l'état qu'une fois la question close — comme
// avec le vrai serveur. Module neutre (pas de "use client").

import { isCorrectValue, parseCalcCandidates } from "@/lib/calc/engine";
import { classer, finTempsQuestion, horlogeSession, ouvertureQuestion, pointsReponse } from "./logique";
import type { EtatSalle, ReponseResultat, SalleClassementLigne, SalleCorrection, SalleItem, SalleMaReponse, SalleMembre, SalleSession } from "./types";

export type EtatExemple = "decompte" | "question" | "calcul" | "juste" | "faux" | "pause" | "fin";
export const ETATS_EXEMPLE: EtatExemple[] = ["decompte", "question", "calcul", "juste", "faux", "pause", "fin"];

const MOI = "u-moi";
const DEBUT = Date.parse("2026-10-30T20:00:00.000Z");
const NB = 10;
const TEMPS = 45;
const PAUSE = 5;
const CYCLE = (TEMPS + PAUSE) * 1000;

const JOUEURS: { nom: string; reussite: number; elo: number | null }[] = [
  { nom: "Inès B.", reussite: 0.92, elo: 1612 },
  { nom: "Marc L.", reussite: 0.84, elo: 1544 },
  { nom: "Sofia R.", reussite: 0.8, elo: 1497 },
  { nom: "Toi", reussite: 0.72, elo: 1388 },
  { nom: "Karim H.", reussite: 0.66, elo: 1450 },
  { nom: "Léa M.", reussite: 0.58, elo: 1402 },
  { nom: "Hugo P.", reussite: 0.46, elo: 1350 },
  { nom: "Nadia T.", reussite: 0.3, elo: null },
];

type Secret = { bonneIndex: number | null; bonneValeur: number | null; tolerance: number; decimales: number; explication: string; etapes: string[] };

const POOL: { item: Omit<SalleItem, "position">; secret: Secret }[] = [
  {
    item: {
      origine: "question",
      topic: "ethics",
      difficulte: "moyen",
      libelle: null,
      enonce: "An analyst learns from a friend at a target company that an acquisition will be announced next week. Under the Standard on Material Nonpublic Information, the analyst should most appropriately:",
      choix: ["Buy the target's shares for her own account only", "Tell her clients, since they are paying for her advice", "Refrain from trading and encourage the company to disclose the information", "Trade only after the announcement is rumored in the press"],
      donnees: null,
      unite: null,
      decimales: null,
    },
    secret: {
      bonneIndex: 2,
      bonneValeur: null,
      tolerance: 0,
      decimales: 0,
      explication: "Une information importante et non publique ne doit ni servir à négocier ni être transmise. L'analyste s'abstient et pousse l'émetteur à la rendre publique.",
      etapes: [],
    },
  },
  {
    item: {
      origine: "calcul",
      topic: "quant",
      difficulte: "facile",
      libelle: "Quant · Time value of money",
      enonce: "Calculate the future value of the investment after five years, with annual compounding.",
      choix: null,
      donnees: [
        { label: "Present value", value: "$10,000" },
        { label: "Annual interest rate", value: "6.0%" },
        { label: "Number of years", value: "5" },
      ],
      unite: "$",
      decimales: 2,
    },
    secret: {
      bonneIndex: null,
      bonneValeur: 13382.26,
      tolerance: 0.5,
      decimales: 2,
      explication: "",
      etapes: ["FV = PV × (1 + r)^n", "FV = 10 000 × 1,06^5", "FV ≈ 13 382,26 $"],
    },
  },
  {
    item: {
      origine: "question",
      topic: "fixed_income",
      difficulte: "difficile",
      libelle: null,
      enonce: "A bond has a modified duration of 6.2. If its yield rises by 50 bps, the approximate percentage change in the bond's price is closest to:",
      choix: ["−3.1%", "+3.1%", "−6.2%", "−0.31%"],
      donnees: null,
      unite: null,
      decimales: null,
    },
    secret: {
      bonneIndex: 0,
      bonneValeur: null,
      tolerance: 0,
      decimales: 0,
      explication: "Variation de prix ≈ −durée modifiée × variation de rendement = −6,2 × 0,50 % = −3,1 %. Une hausse de rendement fait baisser le prix.",
      etapes: [],
    },
  },
  {
    item: {
      origine: "calcul",
      topic: "fixed_income",
      difficulte: "moyen",
      libelle: "Fixed Income · Rendement courant",
      enonce: "Compute the bond's current yield.",
      choix: null,
      donnees: [
        { label: "Coupon rate", value: "5.0%" },
        { label: "Face value", value: "$100" },
        { label: "Market price", value: "$96.50" },
      ],
      unite: "%",
      decimales: 2,
    },
    secret: {
      bonneIndex: null,
      bonneValeur: 5.18,
      tolerance: 0.02,
      decimales: 2,
      explication: "",
      etapes: ["Coupon annuel = 5 % × 100 = 5", "Rendement courant = coupon annuel / prix = 5 / 96,50", "Rendement courant ≈ 5,18 %"],
    },
  },
  {
    item: {
      origine: "question",
      topic: "equity",
      difficulte: "facile",
      libelle: null,
      enonce: "Which valuation multiple is least affected by differences in capital structure between two companies?",
      choix: ["Price-to-earnings", "Enterprise value to EBITDA", "Price-to-book", "Dividend yield"],
      donnees: null,
      unite: null,
      decimales: null,
    },
    secret: {
      bonneIndex: 1,
      bonneValeur: null,
      tolerance: 0,
      decimales: 0,
      explication: "La valeur d'entreprise inclut la dette : le multiple VE/EBITDA compare des sociétés quelle que soit la part de dette dans leur financement.",
      etapes: [],
    },
  },
  {
    item: {
      origine: "question",
      topic: "derivatives",
      difficulte: "moyen",
      libelle: null,
      enonce: "The value of a long forward contract at initiation, ignoring transaction costs, is:",
      choix: ["Positive for the buyer", "Zero", "Negative for the buyer", "Equal to the spot price"],
      donnees: null,
      unite: null,
      decimales: null,
    },
    secret: {
      bonneIndex: 1,
      bonneValeur: null,
      tolerance: 0,
      decimales: 0,
      explication: "Un contrat à terme est conclu au prix à terme qui lui donne une valeur nulle pour les deux parties au départ.",
      etapes: [],
    },
  },
];

const parPosition = (p: number) => POOL[p % POOL.length];
const SECRETS = (p: number): Secret => parPosition(p).secret;
const itemDe = (p: number): SalleItem => ({ position: p, ...parPosition(p).item });
const corrDe = (p: number): SalleCorrection => {
  const x = SECRETS(p);
  return { position: p, bonneIndex: x.bonneIndex, bonneValeur: x.bonneValeur, explication: x.explication || null, etapes: x.etapes };
};

/** Le serveur d'aperçu : corrige une réponse à la question `position` comme repondre_salle, à l'heure `t` (ms). */
export function reponseExemple(position: number, rep: { choix: number } | { saisie: string }, t: number): ReponseResultat {
  const x = SECRETS(position);
  const restant = finTempsQuestion({ startedAt: DEBUT, temps: TEMPS, pause: PAUSE, nb: NB }, position) - t;
  const delaiMs = Math.max(0, t - ouvertureQuestion({ startedAt: DEBUT, temps: TEMPS, pause: PAUSE, nb: NB }, position));
  let juste = false;
  let choix: number | null = null;
  let valeur: number | null = null;
  if ("choix" in rep) {
    choix = rep.choix;
    juste = rep.choix === x.bonneIndex;
  } else {
    const lectures = parCand(rep.saisie);
    valeur = lectures[0] ?? null;
    juste = lectures.some((v) => isCorrectValue(v, { answer: x.bonneValeur ?? 0, decimals: x.decimales, tolerance: x.tolerance, strict: false }));
  }
  return {
    ok: true,
    deja: false,
    juste,
    points: juste ? pointsReponse(TEMPS, restant) : 0,
    delaiMs,
    choix,
    valeur,
    bonneIndex: x.bonneIndex,
    bonneValeur: x.bonneValeur,
    explication: x.explication || null,
    etapes: x.etapes,
  };
}
const parCand = (saisie: string) => {
  try {
    return parseCalcCandidates(saisie);
  } catch {
    return [];
  }
};

const iso = (ms: number) => new Date(ms).toISOString();

/** Les classements après `fermees` questions closes. */
function classementApres(fermees: number): SalleClassementLigne[] {
  const lignes = JOUEURS.map((j, i) => ({
    userId: j.nom === "Toi" ? MOI : `u${i}`,
    username: j.nom,
    avatarUrl: null as string | null,
    points: Math.round(fermees * 1000 * 0.72 * j.reussite),
    bonnes: Math.round(fermees * j.reussite),
    repondues: fermees,
    tempsMs: Math.round(fermees * (9000 + i * 1300)),
  }));
  return classer(lignes).map((l) => ({ rang: l.rang, userId: l.userId, username: l.username ?? null, avatarUrl: l.avatarUrl, points: l.points, bonnes: l.bonnes, repondues: l.repondues, tempsMs: l.tempsMs }));
}

function membres(): SalleMembre[] {
  return JOUEURS.map((j, i) => ({
    userId: j.nom === "Toi" ? MOI : `u${i}`,
    username: j.nom,
    avatarUrl: null,
    role: i === 0 ? "admin" : "membre",
    estAdmin: i === 0,
    elo: j.elo,
    rejointLe: iso(DEBUT - 3_600_000 + i * 60_000),
  }));
}

/**
 * Une partie d'exemple de 10 questions (mixte, 45 s par question) vue à un
 * instant précis. `admin` : le joueur est l'admin de la salle.
 *  - decompte : 2,4 s avant la première question (le « 3 » du décompte)
 *  - question : question 3 (QCM), 12 s écoulées, pas encore répondu
 *  - calcul   : question 2 (un calcul), 20 s écoulées, pas encore répondu
 *  - juste    : question 3, j'ai répondu juste après 9 s (le temps court encore)
 *  - faux     : question 3, j'ai répondu faux après 9 s
 *  - pause    : question 3, le temps est écoulé, correction publique, 2,5 s avant la suite
 *  - fin      : la partie est terminée, classement final
 */
export function exemplePartie(nom: EtatExemple, opts: { admin?: boolean } = {}): { etat: EtatSalle; t: number } {
  const admin = opts.admin ?? true;
  const clock = { startedAt: DEBUT, temps: TEMPS, pause: PAUSE, nb: NB };
  // position de la question visée et décalage dans son cycle (ms)
  const cible: Record<EtatExemple, { q: number; dans: number }> = {
    decompte: { q: -1, dans: -2400 },
    question: { q: 2, dans: 12_000 },
    calcul: { q: 1, dans: 20_000 },
    juste: { q: 2, dans: 9_000 },
    faux: { q: 2, dans: 9_000 },
    pause: { q: 2, dans: TEMPS * 1000 + 2_500 },
    fin: { q: NB, dans: 4_000 },
  };
  const c = cible[nom];
  const t = c.q < 0 ? DEBUT + c.dans : DEBUT + c.q * CYCLE + c.dans;
  const termine = nom === "fin";
  const h = horlogeSession({ ...clock, terminee: termine }, t);
  const visibles = termine ? NB : h.nbVisibles;
  const fermees = termine ? NB : h.nbFermees;

  const mes: SalleMaReponse[] = [];
  const reponduAvant = (p: number, juste: boolean, choix: number | null, valeur: number | null): SalleMaReponse => ({
    position: p,
    choix,
    valeur,
    juste,
    points: juste ? pointsReponse(TEMPS, 31_000) : 0,
    delaiMs: 14_000,
  });
  if (nom === "question" || nom === "juste" || nom === "faux" || nom === "pause") {
    mes.push(reponduAvant(0, true, 2, null), reponduAvant(1, false, null, 13200));
  }
  if (nom === "calcul") mes.push(reponduAvant(0, true, 2, null));
  if (nom === "juste") mes.push({ position: 2, choix: 0, valeur: null, juste: true, points: pointsReponse(TEMPS, 36_000), delaiMs: 9_000 });
  if (nom === "faux") mes.push({ position: 2, choix: 3, valeur: null, juste: false, points: 0, delaiMs: 9_000 });
  if (nom === "pause") mes.push({ position: 2, choix: 3, valeur: null, juste: false, points: 0, delaiMs: 21_000 });
  if (termine) {
    for (let p = 0; p < NB; p++) {
      const juste = p % 4 !== 3 && p !== 6;
      const sec = SECRETS(p);
      mes.push({ position: p, choix: juste ? sec.bonneIndex : sec.bonneIndex === null ? null : (sec.bonneIndex + 1) % 4, valeur: sec.bonneValeur === null ? null : juste ? sec.bonneValeur : sec.bonneValeur * 0.8, juste, points: juste ? pointsReponse(TEMPS, 40_000 - p * 2_500) : 0, delaiMs: 5_000 + p * 2_500 });
    }
    // un trou : une question sans réponse
    mes.splice(mes.findIndex((m) => m.position === 8), 1);
  }

  const classement = termine ? finalDe(mes) : classementApres(fermees);
  const moi = classement.find((l) => l.userId === MOI) ?? null;

  const session: SalleSession = {
    id: "demo-session",
    numero: 2,
    statut: termine ? "terminee" : h.phase === "decompte" ? "attente" : "en_cours",
    params: { type: "mixte", nombre: NB, source: "banque", topics: ["ethics", "quant", "fixed_income", "equity", "derivatives"], difficulte: "melange", temps: TEMPS, partCalculs: 40, nbQuestions: 6, nbCalculs: 4 },
    nb: NB,
    temps: TEMPS,
    pause: PAUSE,
    startedAt: iso(DEBUT),
    finAt: iso(DEBUT + NB * CYCLE),
    index: h.index,
    phase: h.phase,
    nbVisibles: visibles,
    nbFermees: fermees,
    reponduCourante: 5,
    nbJoueurs: JOUEURS.length,
  };

  const etat: EtatSalle = {
    serverNow: iso(t),
    salle: { id: "demo", nom: "Les révisions du jeudi", description: "Quant et Fixed Income, 10 questions, 45 s chacune.", code: "K7MX2Q", publique: true, adminId: admin ? MOI : "u0", createdAt: iso(DEBUT - 86_400_000) },
    moi: { userId: MOI, estAdmin: admin },
    nbMembres: JOUEURS.length,
    membres: membres().map((m) => ({ ...m, role: admin ? (m.userId === MOI ? "admin" : "membre") : m.role, estAdmin: admin ? m.userId === MOI : m.estAdmin })),
    session,
    items: Array.from({ length: visibles }, (_, p) => itemDe(p)),
    corrections: Array.from({ length: fermees }, (_, p) => corrDe(p)),
    mesReponses: mes,
    classement,
    monClassement: moi ? { rang: moi.rang, points: moi.points, bonnes: moi.bonnes, repondues: moi.repondues, tempsMs: moi.tempsMs } : null,
    historique: [],
  };
  return { etat, t };
}

/** Le classement final d'une partie terminée, avec mes vraies réponses. */
function finalDe(mes: SalleMaReponse[]): SalleClassementLigne[] {
  const base = classementApres(NB);
  const mesPoints = mes.reduce((a, m) => a + m.points, 0);
  const lignes = base.map((l) =>
    l.userId === MOI ? { ...l, points: mesPoints, bonnes: mes.filter((m) => m.juste).length, repondues: mes.length, tempsMs: mes.filter((m) => m.juste).reduce((a, m) => a + m.delaiMs, 0) } : l,
  );
  return classer(lignes).map((l) => ({ rang: l.rang, userId: l.userId, username: l.username ?? null, avatarUrl: l.avatarUrl, points: l.points, bonnes: l.bonnes, repondues: l.repondues, tempsMs: l.tempsMs }));
}

