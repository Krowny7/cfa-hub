// Les données d'exemple de la page Moi « La synthèse » : celles de la maquette
// D (Theo, Platine II, J-110, 1 240 questions sur 3 000, 61 % si l'examen était
// aujourd'hui), avec des variantes pour les cas limites. Toutes les cartes
// sont remplies comme le ferait lireSynthese (donnees.ts) : les mêmes fonctions
// de modele.ts lisent une fausse réponse de maitrise_synthese, de rythme_joueur
// et de activite_depuis (89 réponses ces 3 derniers jours, dans 4 matières).
// Sert aux tests de rendu (scripts/moi/test-synthese.tsx) et à l'aperçu local
// (preview-da/moi-synthese). Aucune lecture, aucun réseau.
import {
  COMPARAISONS,
  JOURS_SYNTHESE,
  RANG_RECENT,
  activiteEn,
  calculSynthese,
  chiffresObjectif,
  globaleSynthese,
  historiqueEn,
  matieresSynthese,
  mesuresCalculDe,
  moyennesDe,
  noteSynthese,
  notionsDe,
  notionsDepuisPointsFaibles,
  progressionSynthese,
  rangSynthese,
  rythmeDe,
  tropheesSynthese,
  type MesureNotion,
} from "@/components/moi/synthese/modele";
import type { ObjectifPlan, SyntheseMoi } from "@/components/moi/synthese/types";
import { maitriseDepuis, type Maitrise } from "@/lib/maitrise";
import { NOTIONS } from "@/lib/notions";
import { decaleJour } from "@/lib/objectif-calc";
import type { LigneTrophee } from "@/lib/trophees";

export type Variante = "base" | "nouveau" | "sansObjectif" | "sansDate" | "placement" | "sansCodex" | "sansTemps" | "sansAdmin" | "atteint" | "pire" | "zero";

export const ID_EXEMPLE = "00000000-0000-4000-8000-0000000000aa";

/** L'objectif de la maquette : 1 240 questions sur 3 000, J-110, 16 par jour, 14 de moyenne, 2 780 au rythme actuel. */
export const PLAN_EXEMPLE: ObjectifPlan = {
  etat: "plan",
  examen: "2027-02-18",
  aujourdhui: "2026-10-31",
  total: 3000,
  avant: 1233,
  jour: 7,
  statut: "actif",
  quotidien: 16,
  joursRestants: 110,
  rythme: 14,
  ideal: 1262,
  projection: 2780,
  serie: [
    { day: "2026-06-16", cumul: 0 },
    { day: "2026-07-01", cumul: 71 },
    { day: "2026-08-01", cumul: 258 },
    { day: "2026-09-01", cumul: 500 },
    { day: "2026-10-01", cumul: 822 },
    { day: "2026-10-31", cumul: 1240 },
  ],
  hrefQuete: "/practice?topic=ethics&n=10&go=1",
};

const LIGNES: LigneTrophee[] = [
  { source: "ciblee", palier: 1, n: 6, dernier: "2026-10-20T10:00:00Z" },
  { source: "ciblee", palier: 2, n: 3, dernier: "2026-10-22T10:00:00Z" },
  { source: "ciblee", palier: 3, n: 1, dernier: "2026-10-25T10:00:00Z" },
  { source: "trente", palier: 1, n: 4, dernier: "2026-10-12T10:00:00Z" },
  { source: "trente", palier: 2, n: 3, dernier: "2026-10-19T10:00:00Z" },
  { source: "trente", palier: 3, n: 2, dernier: "2026-10-29T09:30:00Z" },
  { source: "blanc", palier: 1, n: 2, dernier: "2026-09-30T10:00:00Z" },
  { source: "blanc", palier: 4, n: 1, dernier: "2026-10-28T10:00:00Z" },
  { source: "cinq", palier: 1, n: 1, dernier: "2026-10-10T10:00:00Z" },
];
// 6 + 3 + 1 + 4 + 3 + 2 + 2 + 1 + 1 = 23 trophées : 13 bronze, 6 argent, 3 or, 1 diamant (sur les lignes ci-dessus)

// ── les matières, les notions et les cartes « examen » (maquette D) ──────────

const AUJ = PLAN_EXEMPLE.aujourdhui;
/** Les jours de datesSynthese : il y a 30, 60 et 90 jours, chaque semaine sur 12 semaines, puis il y a 3 jours (rang 15). */
const JOURS = JOURS_SYNTHESE.map((j) => decaleJour(AUJ, -j));

/** Ta maîtrise aujourd'hui, il y a 30 / 60 / 90 jours, et tes réponses (61 % de préparation). */
const MATIERES: Record<string, readonly [number, number, number, number, number]> = {
  ethics: [58, 51, 44, 35, 412],
  quant: [74, 70, 62, 52, 233],
  economics: [66, 62, 53, 44, 190],
  fsa: [49, 41, 34, 26, 301],
  corporate: [71, 68, 58, 47, 156],
  equity: [63, 55, 48, 37, 248],
  fixed_income: [44, 36, 29, 22, 287],
  derivatives: [52, 47, 39, 30, 121],
  alternatives: [69, 66, 56, 45, 98],
  portfolio: [77, 71, 62, 50, 174],
};
/** Il y a 3 jours et les réponses depuis : [maîtrise il y a 3 j, réponses en 3 j] (89 en tout). Sans réponse, la maîtrise n'a pas bougé. */
const TROIS_JOURS: Record<string, readonly [number, number]> = {
  ethics: [58, 0],
  quant: [72, 14],
  economics: [66, 0],
  fsa: [45, 25],
  corporate: [71, 0],
  equity: [63, 0],
  fixed_income: [39, 42],
  derivatives: [53, 8],
  alternatives: [69, 0],
  portfolio: [77, 0],
};
/** La part des réponses de chaque matière données depuis 30, 60 et 90 jours. */
const PART_DEPUIS = { 30: 0.3, 60: 0.55, 90: 0.75 } as const;
/** La moyenne des joueurs (même règle), pour les atouts. */
const MOYENNES: Record<string, number> = { quant: 70, portfolio: 63, economics: 59, corporate: 69, alternatives: 62, equity: 60, ethics: 62, fsa: 50, fixed_income: 45, derivatives: 51 };
/** Calcul ou théorie : [avec, sans] par matière (71 % sans calcul, 54 % avec). */
const AVEC_SANS: Record<string, readonly [number | null, number | null]> = {
  ethics: [62, 72],
  quant: [58, 74],
  economics: [64, 70],
  fsa: [40, 66],
  corporate: [66, 72],
  equity: [55, 71],
  fixed_income: [37, 62],
  derivatives: [null, 68],
  alternatives: [60, 75],
  portfolio: [68, 78],
};
/** Le rythme : secondes par question et questions chronométrées (104 s en tout). */
const RYTHME: Record<string, readonly [number, number]> = {
  ethics: [71, 412],
  quant: [118, 233],
  economics: [99, 190],
  fsa: [128, 301],
  corporate: [94, 156],
  equity: [108, 248],
  fixed_income: [121, 287],
  derivatives: [119, 121],
  alternatives: [86, 98],
  portfolio: [101, 174],
};

const maitriseDe = (vide: boolean): Maitrise =>
  maitriseDepuis({ matieres: vide ? {} : Object.fromEntries(Object.entries(MATIERES).map(([k, v]) => [k, { pct: v[0], n: 60, total: v[4] }])) }) as Maitrise;

/** La réponse de maitrise_synthese : les 3 dates de comparaison, 12 semaines (la maîtrise redescend en ligne droite vers celle d'il y a 90 jours), puis il y a 3 jours. */
function historiqueBrut(): unknown[] {
  return JOURS.map((_, k) => {
    const matieres = Object.fromEntries(
      Object.entries(MATIERES).map(([cle, v]) => {
        if (k === RANG_RECENT) return [cle, { pct: TROIS_JOURS[cle][0], n: 60 }];
        if (k < 3) return [cle, { pct: v[k + 1], n: 60 }];
        const t = Math.min(1, (7 * (k - 2)) / 90);
        return [cle, { pct: Math.round(v[0] + (v[3] - v[0]) * t), n: 60 }];
      }),
    );
    return { i: k + 1, matieres };
  });
}

/** La réponse de activite_depuis (rang 1 = 3 jours, puis 30, 60, 90) : une matière sans réponse sur la période n'a pas de ligne. */
function activiteBrute(): unknown[] {
  return COMPARAISONS.map((j, k) => {
    const matieres: Record<string, { n: number; justes: number }> = {};
    for (const [cle, v] of Object.entries(MATIERES)) {
      const n = j === 3 ? TROIS_JOURS[cle][1] : Math.round(v[4] * PART_DEPUIS[j]);
      if (n > 0) matieres[cle] = { n, justes: Math.round((n * v[0]) / 100) };
    }
    return { i: k + 1, matieres };
  });
}

/** Les notions : autour de la maîtrise de leur matière (de −25 à +25 points), une sur sept en cours, une sur onze jamais vue. */
function mesuresNotions(): Record<string, MesureNotion> {
  const r: Record<string, MesureNotion> = {};
  NOTIONS.forEach((nt, i) => {
    if (i % 11 === 4) return;
    if (i % 7 === 3) {
      r[nt.id] = { pct: null, n: 1 + (i % 7), total: 1 + (i % 7), derniere: null };
      return;
    }
    const base = MATIERES[nt.matiere]?.[0] ?? 60;
    r[nt.id] = { pct: Math.max(8, Math.min(98, base + ((i * 37) % 51) - 25)), n: 20, total: 20 + (i % 13), derniere: null };
  });
  return r;
}

/** Le même joueur vu par points_faibles (repli sans maitrise_synthese) : 20 réponses récentes au plus, sans pondération. */
function lignesPointsFaibles(): { notion: string; recentes: { ok: boolean }[] }[] {
  return Object.entries(mesuresNotions()).map(([notion, m]) => {
    const justes = m.pct === null ? Math.floor(m.n / 2) : Math.round((m.pct * m.n) / 100);
    return { notion, recentes: Array.from({ length: m.n }, (_, k) => ({ ok: k < justes })) };
  });
}

type Blocs = Pick<SyntheseMoi, "matieres" | "globale" | "notions" | "sourceNotions" | "calcul" | "rythme" | "progression" | "note">;

/** Les blocs des matières et des cartes à sources nouvelles, comme lireSynthese les remplit. */
function blocs(v: Variante, examen: string | null): Blocs {
  const neuf = v === "nouveau";
  const m = maitriseDe(neuf);
  if (v === "sansAdmin") {
    // sans clé de service : ni historique, ni moyennes, ni calcul, ni rythme, ni progression ; les notions par points_faibles (90 jours)
    return {
      matieres: matieresSynthese(m, null, null),
      globale: globaleSynthese(m, null),
      notions: notionsDepuisPointsFaibles(lignesPointsFaibles(), NOTIONS),
      sourceNotions: "90j",
      calcul: null,
      rythme: null,
      progression: null,
      note: noteSynthese(m),
    };
  }
  const histo = historiqueEn(neuf ? [] : historiqueBrut(), JOURS);
  // un joueur neuf : activite_depuis répond, mais sans aucune réponse
  const activite = activiteEn(neuf ? [] : activiteBrute());
  const moyennes = moyennesDe(Object.fromEntries(Object.entries(MOYENNES).map(([k, pct]) => [k, { pct, joueurs: 12 }])));
  const calcul = neuf
    ? {}
    : Object.fromEntries(
        Object.entries(AVEC_SANS).flatMap(([k, [avec, sans]]) => [
          [`${k}:avec`, { pct: avec, n: avec === null ? 4 : 30 }],
          [`${k}:sans`, { pct: sans, n: 30 }],
        ]),
      );
  const rythme = neuf ? { sec: null, n: 0, matieres: {} } : { sec: 104, n: 2220, matieres: Object.fromEntries(Object.entries(RYTHME).map(([k, [sec, n]]) => [k, { sec, n }])) };
  return {
    matieres: matieresSynthese(m, histo, neuf ? null : moyennes, activite),
    globale: globaleSynthese(m, histo, activite),
    notions: notionsDe(NOTIONS, neuf ? {} : mesuresNotions()),
    sourceNotions: "unique",
    calcul: calculSynthese(mesuresCalculDe(calcul), m.matieres),
    rythme: rythmeDe(rythme),
    progression: progressionSynthese(histo, m, AUJ, examen),
    note: noteSynthese(m),
  };
}

/** Les données de la maquette, ou une variante. */
export function exemple(v: Variante = "base"): SyntheseMoi {
  const neuf = v === "nouveau";
  const placement = v === "placement" || neuf;
  const rang = rangSynthese({
    elo: placement ? 1200 : 1478,
    gamesPlayed: neuf ? 0 : v === "placement" ? 3 : 24,
    mastery: neuf ? 0 : 65,
    place: neuf ? null : 7,
    joueurs: neuf ? null : 412,
  });
  let objectif: SyntheseMoi["objectif"];
  if (v === "sansObjectif" || v === "sansDate" || neuf) objectif = { etat: "sans" };
  else if (v === "atteint") objectif = { ...PLAN_EXEMPLE, avant: 3050, jour: 0, statut: "atteint", quotidien: 0, hrefQuete: null, projection: 3200, ideal: 2900, serie: PLAN_EXEMPLE.serie.map((p, i, l) => (i === l.length - 1 ? { ...p, cumul: 3050 } : p)) };
  else if (v === "pire")
    objectif = { ...PLAN_EXEMPLE, avant: 0, jour: 0, quotidien: 100, rythme: 0, ideal: 400, projection: 0, hrefQuete: "/practice?topic=ethics&n=90&go=1", serie: [{ day: "2026-10-31", cumul: 0 }] };
  else objectif = PLAN_EXEMPLE;

  const trophees = neuf
    ? tropheesSynthese([], true)
    : v === "sansAdmin"
      ? tropheesSynthese(LIGNES.map(({ dernier: _d, ...l }) => l).filter((l) => l.source === "ciblee"), false)
      : tropheesSynthese(LIGNES, true);

  return {
    joueur: {
      id: ID_EXEMPLE,
      nom: v === "pire" ? "Maximilien-Alexandre de la Rochefoucauld-Montmorency" : neuf ? "Joueur 0000" : "Theo",
      avatar: null,
      jn: v === "sansDate" ? null : neuf ? null : "J-110",
      rang,
      temps: neuf || v === "sansTemps" ? null : { total: "34 h 20", semaine: "4 h 10", depuis: "16 juin" },
      reussite: neuf ? { n: 0, justes: 0 } : { n: 45, justes: 35 },
      codex: neuf ? { faites: 0, xp: 0, aRecuperer: 0 } : v === "sansCodex" ? null : { faites: 37, xp: 2140, aRecuperer: 2 },
      marquees: neuf ? { questions: 0, cartes: 0 } : { questions: 15, cartes: 8 },
    },
    objectif,
    ...blocs(v, v === "sansDate" || neuf ? null : PLAN_EXEMPLE.examen),
    // les cas extrêmes de la jauge : 100 % et 0 % (les cartes gardent les matières de la maquette)
    ...(v === "pire" ? { note: { estimee: 100, couverture: 100, seuil: 70 as const } } : v === "zero" ? { note: { estimee: 0, couverture: 100, seuil: 70 as const } } : {}),
    trophees,
  };
}

/** Un coup d'œil sur les chiffres de l'objectif de la maquette (pour les tests). */
export const CHIFFRES_EXEMPLE = chiffresObjectif(PLAN_EXEMPLE);
