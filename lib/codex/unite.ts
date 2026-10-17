// L'unité de l'avancée d'une quête (Codex simplifié, §4 règle 2 : « sous le
// titre, seulement l'avancée avec son unité »). Elle se lit sur l'objectif du
// catalogue : une maîtrise ou une part se dit en % (« 28 % → 60 % », « Il
// manque : 32 points ») ; un compte dit ce qu'il compte (« 4 sur 30 min »,
// « 3 sur 4 semaines », « 2 sur 5 ratures »). Sans unité sûre (un objectif
// composé, un spécial, un rang) : le nombre nu, comme avant. Module neutre.

import type { Objectif, ObjectifCompteur, TypeEvenement, TypeMesure } from "@/lib/codex/types";

/** « pct » : en % ; sinon le mot compté (singulier, pluriel) ; null : le nombre nu. */
export type Unite = "pct" | readonly [string, string] | null;

const M = (un: string, plusieurs: string) => [un, plusieurs] as const;
const QUESTIONS = M("question", "questions");
const SEANCES = M("séance", "séances");
const RATURES = M("rature", "ratures");
const MATIERES = M("matière", "matières");
const PAGES = M("page", "pages");
const JOURS_ENCRE = M("jour d'encre", "jours d'encre");

const PAR_MESURE: Partial<Record<TypeMesure, Unite>> = {
  maitrise: "pct",
  maitrise_programme: "pct",
  notions_vues_pct: "pct",
  matieres_au_dessus: MATIERES,
  matieres_remontees: MATIERES,
  branches_etape: MATIERES,
  notions_vues: M("notion", "notions"),
  drill_pages_restantes: PAGES,
  drill_pages_reussies: PAGES,
  serie: M("jour", "jours"),
  meilleure_serie: M("jour", "jours"),
  ratures_ouvertes: RATURES,
  ratures_rayees: RATURES,
  semaines_actives: M("semaine", "semaines"),
  semaines_objectif_tenu: M("semaine", "semaines"),
  rappels_espaces: M("bonne réponse", "bonnes réponses"),
  types_calcul_tenus: M("type de calcul", "types de calcul"),
  examens_blancs_au_dessus: M("examen blanc", "examens blancs"),
  questions_total: QUESTIONS,
  duels_joues: M("duel", "duels"),
  amis: M("ami", "amis"),
  quetes_terminees: M("quête", "quêtes"),
};

const PAR_EVENEMENT: Partial<Record<TypeEvenement, Unite>> = {
  question_repondue: QUESTIONS,
  question_marquee: QUESTIONS,
  session_terminee: SEANCES,
  seance_juste: SEANCES,
  revoir_rendue: SEANCES,
  seance_atelier: SEANCES,
  drill_page_terminee: PAGES,
  eclair_rendue: M("série", "séries"),
  duel_termine: M("duel", "duels"),
  examen_blanc_rendu: M("examen blanc", "examens blancs"),
  rature_rayee: RATURES,
  rature_scellee: RATURES,
  calcul_repondu: M("calcul", "calculs"),
  fiche_ouverte: M("fiche", "fiches"),
  jour_encre: JOURS_ENCRE,
};

const PAR_SOMME: Record<string, Unite> = { minutes: M("min", "min"), cartes: M("flashcard", "flashcards"), questions: QUESTIONS, justes: M("bonne réponse", "bonnes réponses") };
const PAR_DISTINCT: Record<string, Unite> = { matiere: MATIERES, page: PAGES, fiche: M("fiche", "fiches"), notion: M("notion", "notions"), type: M("type de calcul", "types de calcul") };

function uniteCompteur(o: ObjectifCompteur): Unite {
  if (o.somme) return PAR_SOMME[o.somme] ?? null;
  if (o.distinct === "jour") return o.evenement === "jour_encre" ? JOURS_ENCRE : M("jour", "jours");
  if (o.distinct) return PAR_DISTINCT[o.distinct] ?? null;
  return PAR_EVENEMENT[o.evenement] ?? null;
}

/** L'unité de l'avancée d'un objectif du catalogue. */
export function uniteDe(o: Objectif): Unite {
  if (o.k === "mesure") return PAR_MESURE[o.mesure] ?? null;
  if (o.k === "compteur") return uniteCompteur(o);
  return null;
}

const n = (x: number) => Math.floor(x).toLocaleString("fr-FR");
const mot = (u: Unite, x: number) => (u && u !== "pct" ? ` ${Math.floor(x) > 1 ? u[1] : u[0]}` : "");

/**
 * L'avancée écrite avec son unité, et ce qui manque : « 28 % → 60 % » et
 * « Il manque : 32 points » ; « 4 sur 30 min » et « Il manque : 26 min » ;
 * sans unité, « 4 sur 30 » et « Il manque : 26 ».
 */
export function texteAvancee(l: { valeur: number; cible: number; unite?: Unite }): { texte: string; manque: string | null } {
  const u = l.unite ?? null;
  const reste = Math.max(0, Math.ceil(l.cible - l.valeur));
  if (u === "pct") return { texte: `${n(l.valeur)} % → ${n(l.cible)} %`, manque: reste > 0 ? `Il manque : ${n(reste)} point${reste > 1 ? "s" : ""}` : null };
  return { texte: `${n(l.valeur)} sur ${n(l.cible)}${mot(u, l.cible)}`, manque: reste > 0 ? `Il manque : ${n(reste)}${mot(u, reste)}` : null };
}

/** À faire baisser : « 120 ratures, à passer sous 50 ». */
export const texteBaisse = (b: { actuel: number; seuil: number }, u: Unite | undefined) => `${n(b.actuel)}${mot(u ?? null, b.actuel)}, à passer sous ${n(b.seuil)}`;
