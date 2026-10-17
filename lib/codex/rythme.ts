// Le rythme long du Codex tel que /codex le montre (V3 §10.2 à §10.5) : le
// plan daté, la carte du lundi, le verdict, la reprise. Les règles sont dans
// lib/codex/plan.ts ; la lecture et l'écriture (codex_semaine, codex_resultat)
// dans lib/codex/rythme-serveur.ts. Module pur : ni base ni réseau.
import { COMMANDES, CIBLES_SEMAINE, type Commande, type ContenuMatiere, type Semaine } from "@/lib/codex/catalogue";
import { maitriseLue } from "@/lib/codex/cap";
import { evaluerObjectifs, lundiDe, objectifsPlan, repriseDuJour, semaineEntamee, type Entree, type ResultatCompteur } from "@/lib/codex/moteur";
import { programmeActif } from "@/lib/codex/programmes";
import { commandesPossibles, jalonsDe, planDe, sessionDe, type Bande, type Plan, type Verdict } from "@/lib/codex/plan";
import type { Moment } from "@/lib/codex/calendrier";
import type { Capacites } from "@/lib/codex/types";
import { decaleJour, joursEntre } from "@/lib/objectif-calc";

// ── Ce que /codex en montre ────────────────────────────────────────────

/** « Léonard relit ta semaine » : la semaine passée, toujours en positif, puis le choix de celle-ci. */
export type VueLundi = {
  lundi: string;
  questions: number;
  joursEncre: number;
  /** la matière qui a le plus monté depuis ses débuts (points) */
  montee: { nom: string; points: number } | null;
  /** la matière la plus pâle (la plus longtemps sans réponse) */
  pale: { nom: string; jours: number } | null;
  cibles: number[];
  commandes: { id: Commande; nom: string; resume: string }[];
};

/** Le verdict à saisir (phase « après ») ; `saisi` : celui de la session, s'il l'est déjà. */
export type VueVerdict = { programme: string; session: string; saisi: Verdict | null; matieres: { cle: string; nom: string }[] };

export type VueRythme = {
  /** la frise du plan daté (CFA I avec un jour J) */
  plan: Plan | null;
  /** la carte du lundi : la semaine n'est pas encore choisie, et la base sait la garder */
  lundi: VueLundi | null;
  /** le choix de la semaine en cours */
  semaine: { cible: number; commande: Commande; nom: string } | null;
  verdict: VueVerdict | null;
  /** le jour du retour après une absence (reprise douce) */
  reprise: boolean;
};

/** La semaine passée lue pour la carte du lundi. */
function relue(e: Entree, contenu: ContenuMatiere[], lundi: string): Pick<VueLundi, "questions" | "joursEncre" | "montee" | "pale"> {
  const de = decaleJour(lundi, -7);
  const jours = (e.lecture.mesures.jours ?? []).filter((j) => j.jour >= de && j.jour < lundi);
  let montee: VueLundi["montee"] = null;
  let pale: VueLundi["pale"] = null;
  for (const m of contenu) {
    const l = maitriseLue(e.lecture.mesures, m.key);
    if (l.pct !== null && l.debut !== null && l.pct - l.debut > (montee?.points ?? 0)) montee = { nom: m.nom, points: Math.round(l.pct - l.debut) };
    if (l.derniere) {
      const j = joursEntre(l.derniere.slice(0, 10), e.jour);
      if (j >= 7 && j > (pale?.jours ?? 0)) pale = { nom: m.nom, jours: j };
    }
  }
  return { questions: jours.reduce((s, j) => s + j.n, 0), joursEncre: jours.filter((j) => j.n >= 10).length, montee, pale };
}

/**
 * Le rythme long tel que /codex le montre. `semaineDispo` : la base garde le
 * choix du lundi (sans la §8 : pas de carte, les contrats de la semaine
 * d'avant) ; `compteurs` : codex_lire indexé (les jalons du plan y sont).
 */
export function vueRythme(
  e: Entree,
  compteurs: Record<string, ResultatCompteur>,
  o: { semaineDispo: boolean; capacites: Capacites; moment: Moment; verdicts: Verdict[] },
): VueRythme {
  const def = programmeActif(e.programmes);
  const contenu = e.contenu ?? def.matieres();
  const lundi = lundiDe(e.jour);
  const calme = o.moment !== "courant" && o.moment !== "apres";
  const jalons = e.jourJ ? jalonsDe(def.cle) : [];
  const plan = e.jourJ && jalons.length && o.moment === "courant" ? planDe(jalons, evaluerObjectifs(e, compteurs, objectifsPlan(e)), e.jour, e.jourJ) : null;
  const choisie = e.semaine && e.semaine.lundi === lundi ? e.semaine : null;
  const possibles = commandesPossibles((r) => (r === "journal3" ? o.capacites.journal === 3 : o.capacites[r]), def.outils);
  // pas de carte du lundi une fois qu'un contrat que la commande remplace a payé cette semaine
  // (calculer() relit les lignes après l'écriture du lot : un contrat payé à ce calcul y est)
  const lundiVue: VueLundi | null =
    o.semaineDispo && !choisie && !calme && !semaineEntamee(e.progression, lundi) && (e.lecture.mesures.jours ?? []).some((j) => j.n > 0)
      ? { lundi, ...relue(e, contenu, lundi), cibles: [...CIBLES_SEMAINE], commandes: COMMANDES.filter((c) => possibles.includes(c.id)).map(({ id, nom, resume }) => ({ id, nom, resume })) }
      : null;
  const session = e.jourJ ? sessionDe(e.jourJ) : null;
  const verdict: VueVerdict | null =
    def.examen && session && o.moment === "apres"
      ? { programme: def.cle, session, saisi: o.verdicts.find((v) => v.programme === def.cle && v.session === session) ?? null, matieres: contenu.map((m) => ({ cle: m.key, nom: m.nom })) }
      : null;
  return {
    plan,
    lundi: lundiVue,
    semaine: choisie ? { cible: choisie.cible, commande: choisie.commande, nom: COMMANDES.find((c) => c.id === choisie.commande)?.nom ?? "" } : null,
    verdict,
    reprise: repriseDuJour(e),
  };
}

const BANDES: Bande[] = ["basse", "moyenne", "haute"];

/** Les bandes reçues du navigateur, gardées si elles ont la bonne forme (une par matière connue). */
export function bandesValides(bandes: unknown, matieres: string[]): Record<string, Bande> {
  const out: Record<string, Bande> = {};
  if (!bandes || typeof bandes !== "object") return out;
  for (const [k, v] of Object.entries(bandes as Record<string, unknown>)) {
    const b = BANDES.find((x) => x === v);
    if (b && matieres.includes(k)) out[k] = b;
  }
  return out;
}

/** Ce que le serveur a lu du rythme long (lib/codex/rythme-serveur.ts). */
export type RythmeLu = { semaine: Semaine | null; semaineDispo: boolean; verdicts: Verdict[] };
