import { COURSES, type Course } from "@/lib/courses";
import { SUBJECTS, subjectByDrillTitle } from "@/components/reviser/catalog";
import type { EcouteCours } from "@/lib/course-ecoute";

// La page Réviser « le parcours » : ce que reçoivent ses cartes, et les
// calculs purs qui les préparent (testés par scripts/reviser/test-parcours.ts).
// Deux lieux : la Bibliothèque (1 cours complets, 2 fiches, 3 one-pagers et
// flashcards pour la fin) et l'Atelier (carnet de ratures, questions
// marquées, points faibles). Chaque bloc est null quand sa source est
// indisponible : la carte s'affiche alors sans chiffre, jamais avec un
// exemple. Module neutre (pas de "use client").

// ——— Les données du joueur (chargées par components/reviser/parcours-data.ts) ———

/**
 * Une fiche, d'après le journal des quiz de fiche (quiz_answer_log) :
 *   finie    chaque question de chacune de ses pages de drill a reçu au moins
 *            une réponse (aucune « jamais vue » dans l'onglet Progression) ;
 *   entamee  au moins une réponse à une question de ses pages, sans être finie ;
 *   neuve    aucune réponse.
 */
export type EtatFiche = "finie" | "entamee" | "neuve";

export type AvancementFiches = { etats: { key: string; etat: EtatFiche }[]; finies: number; entamees: number; total: number };

export type DonneesFlashcards = {
  /** cartes des paquets officiels publiés (null : compte indisponible) */
  cartes: number | null;
  /** cartes par matière, quand toutes les matières qui en ont en ont autant (null sinon) */
  parMatiere: number | null;
  /** la boucle en cours la plus récente sur le compte (flashcard_progress) : « Tour 2 · 4 à revoir » ; null : aucune */
  boucle: { texte: string; aide: string } | null;
};

export type DonneesRatures = {
  /** ratures en cours au carnet, toutes (avec et sans calcul) */
  enCours: number;
  /** l'énoncé de la rature la plus récente (texte brut, coupé) ; null : aucune lisible */
  derniere: string | null;
  /** « Sans calcul » possible (questions classées) ; masquees : ratures à calcul en cours (null : inconnu) */
  calcul: { masquees: number | null } | null;
};

export type DonneesMarquees = { total: number; apercus: string[] };

export type NotionFaible = { cle: string; libelle: string; matiere: string; pct: number | null; ratures: number };

/** faibles : au moins un point faible ; rien : assez de données, rien de fragile ; peu : pas assez de réponses */
export type DonneesPointsFaibles = { etat: "faibles" | "rien" | "peu"; notions: NotionFaible[] };

export type DonneesReviser = {
  fiches: AvancementFiches | null;
  flashcards: DonneesFlashcards;
  ratures: DonneesRatures | null;
  marquees: DonneesMarquees | null;
  pointsFaibles: DonneesPointsFaibles | null;
};

/** Base injoignable : toutes les cartes, sans chiffre. */
export const DONNEES_INDISPONIBLES: DonneesReviser = {
  fiches: null,
  flashcards: { cartes: null, parMatiere: null, boucle: null },
  ratures: null,
  marquees: null,
  pointsFaibles: null,
};

/**
 * Les fiches finies, entamées et neuves, dans l'ordre du programme (voir
 * EtatFiche). `sets` : les pages de drill et leur nombre de questions ;
 * `vues` : les questions distinctes répondues, par set (les autres sets
 * sont ignorés).
 */
export function avancementFiches(sets: { id: string; title: string; questions: number }[], vues: ReadonlyMap<string, number>): AvancementFiches {
  const parMatiere = new Map<string, { total: number; vues: number }>();
  for (const s of sets) {
    const m = subjectByDrillTitle(s.title);
    if (!m || !/ — Drill Fiche Page [0-9]+/.test(s.title)) continue;
    const c = parMatiere.get(m.key) ?? { total: 0, vues: 0 };
    c.total += s.questions;
    c.vues += Math.min(vues.get(s.id) ?? 0, s.questions);
    parMatiere.set(m.key, c);
  }
  const etats = SUBJECTS.filter((s) => s.fiche).map((s) => {
    const c = parMatiere.get(s.key);
    const etat: EtatFiche = !c || c.vues === 0 ? "neuve" : c.vues >= c.total ? "finie" : "entamee";
    return { key: s.key, etat };
  });
  return {
    etats,
    finies: etats.filter((e) => e.etat === "finie").length,
    entamees: etats.filter((e) => e.etat === "entamee").length,
    total: etats.length,
  };
}

/** « 60 cartes par matière » si toutes les matières qui ont des cartes en ont autant ; null sinon. */
export function cartesParMatiere(parMatiere: ReadonlyMap<string, number>): number | null {
  const n = [...parMatiere.values()].filter((x) => x > 0);
  return n.length > 1 && n.every((x) => x === n[0]) ? n[0] : null;
}

/** Un énoncé en texte simple, pour un aperçu d'une ligne : sans gras ni surligné (** ==), formules sans leurs $, coupé à `max` caractères sur un mot. */
export function texteBrut(s: string, max = 120): string {
  const t = s
    .replace(/\$\$?([^$]*)\$\$?/g, "$1")
    .replace(/\*\*|==/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= max) return t;
  const coupe = t.slice(0, max);
  const espace = coupe.lastIndexOf(" ");
  return (espace > max * 0.6 ? coupe.slice(0, espace) : coupe).replace(/[\s,;:.]+$/, "") + "…";
}

// ——— Le cours à reprendre (carte 1, lue sur l'appareil après le montage) ———

/** Les cours complets, dans l'ordre du programme. */
export const COURS_PROGRAMME: Course[] = SUBJECTS.flatMap((s) => COURSES.filter((c) => c.slug === s.course));

/** La durée de tous les cours, en minutes (lib/courses.ts). */
export const MINUTES_COURS = COURS_PROGRAMME.reduce((a, c) => a + c.minutes, 0);

/** « 10 h 55 » */
export function heuresMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}

/** « 27:40 » (minutes au-delà de l'heure : « 74:00 ») */
export function mmss(sec: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Les hauteurs (px) des barres de l'onde du lecteur : fixes, le même dessin partout. */
export const ONDE = [8, 14, 20, 12, 22, 16, 26, 18, 10, 24, 20, 14, 26, 22, 12, 18, 24, 16, 10, 20, 26, 14, 18, 22, 12, 24, 16, 20, 10, 18, 22, 14, 26, 12, 20, 16];

export type CarteCours = {
  slug: string;
  titre: string;
  href: string;
  /** reprise : une position gardée ; debut : rien d'écouté (ou cours fini, on passe au suivant) */
  mode: "reprise" | "debut";
  /** secondes écoutées, et durée du cours (secondes) */
  position: number;
  total: number;
  /** 0 à 1 */
  part: number;
  /** le module où l'on s'est arrêté (reprise) */
  module: { n: number; titre: string } | null;
  modules: number;
  minutes: number;
  /** barres de l'onde déjà écoutées */
  barresLues: number;
  /** les 10 matières : part écoutée (0 à 1 ; 1 pour un cours fini) */
  matieres: { key: string; code: string; nom: string; part: number }[];
};

/**
 * Le cours que propose la carte. Le dernier cours écouté (lecture lancée ;
 * ouvrir un cours pour en lire les diapositives ne compte pas), à sa position
 * s'il en a une ; s'il a été fini depuis, le suivant du programme qui ne
 * l'est pas ; sans historique (ou stockage illisible) : le premier cours du
 * programme, au début.
 */
export function carteCours(e: EcouteCours | null): CarteCours | null {
  const liste = COURS_PROGRAMME;
  if (!liste.length) return null;
  const finis = new Set(e?.finis ?? []);
  const pos = (slug: string) => e?.positions[slug] ?? 0;
  let c = liste.find((x) => x.slug === e?.dernier) ?? null;
  if (c && pos(c.slug) <= 5 && finis.has(c.slug)) {
    const i = liste.indexOf(c);
    c = [...liste.slice(i + 1), ...liste.slice(0, i)].find((x) => !finis.has(x.slug)) ?? c;
  }
  c ??= liste[0];
  const total = c.minutes * 60;
  const position = Math.min(pos(c.slug), total);
  const mode = position > 5 ? "reprise" : "debut";
  const part = mode === "reprise" && total > 0 ? position / total : 0;
  const i = c.chapters.reduce((acc, ch, k) => (position >= ch.start ? k : acc), 0);
  return {
    slug: c.slug,
    titre: c.title,
    href: `/courses/${c.slug}`,
    mode,
    position: mode === "reprise" ? position : 0,
    total,
    part,
    module: mode === "reprise" && c.chapters[i] ? { n: i + 1, titre: c.chapters[i].title } : null,
    modules: c.chapters.length,
    minutes: c.minutes,
    barresLues: Math.round(ONDE.length * part),
    matieres: SUBJECTS.map((s) => {
      const k = liste.find((x) => x.slug === s.course);
      // un cours fini le reste, même repris depuis (le marqueur rl_course_fini ne s'efface pas)
      const p = k ? (finis.has(k.slug) ? 1 : Math.min(1, pos(k.slug) / (k.minutes * 60))) : 0;
      return { key: s.key, code: s.code, nom: s.name, part: Math.round(p * 100) / 100 };
    }),
  };
}
