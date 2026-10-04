// L'objectif de questions d'ici l'examen : calculs purs (client et serveur).
//
// Le joueur fixe un total de questions à avoir posées le jour de l'examen
// (toutes sources, celles d'avant comprises). On en tire chaque matin
// l'objectif du jour : ce qui reste à poser, réparti sur les jours qui
// restent (l'examen lui-même exclu). Il est recalculé chaque jour d'après
// où l'on en est : un jour de retard le relève, un jour d'avance l'abaisse.
//
// La droite de l'objectif part du jour où il a été fixé (`depuis`, avec le
// cumul d'alors) et rejoint la cible le jour de l'examen.
//
// Le réglage vit dans les métadonnées du compte (auth, `rl_objectif`) : pas
// de migration, lisible par le serveur avec l'utilisateur. Module neutre.

/** Recommandation par défaut : environ la banque d'un prep provider et trois examens blancs complets. */
export const OBJECTIF_RECOMMANDE = 2500;
/** Choix rapides proposés à côté du champ. */
export const OBJECTIF_CHOIX = [1500, 2500, 3500] as const;
export const OBJECTIF_MIN = 100;
export const OBJECTIF_MAX = 20000;
/** Au-delà, le rythme n'est plus tenable : on le dit. */
export const RYTHME_LIMITE = 200;

/** Clé des métadonnées du compte. */
export const CLE_OBJECTIF = "rl_objectif";

export type ObjectifMeta = {
  /** total de questions visé le jour de l'examen */
  total: number;
  /** jour où l'objectif a été fixé (AAAA-MM-JJ, Paris) */
  depuis: string;
};

const JOUR = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

export const estJour = (s: unknown): s is string => typeof s === "string" && JOUR.test(s);

/** L'objectif rangé dans user_metadata, validé ; null s'il n'y en a pas. */
export function lireObjectifMeta(meta: unknown): ObjectifMeta | null {
  const o = (meta as Record<string, unknown> | null | undefined)?.[CLE_OBJECTIF] as Record<string, unknown> | null | undefined;
  if (!o || typeof o !== "object") return null;
  const total = Math.round(Number(o.total));
  if (!Number.isFinite(total) || total < OBJECTIF_MIN || total > OBJECTIF_MAX) return null;
  if (!estJour(o.depuis)) return null;
  return { total, depuis: o.depuis };
}

/** Jours de a à b (clés AAAA-MM-JJ) : b − a. */
export function joursEntre(a: string, b: string): number {
  return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86_400_000);
}

/** Clé du jour décalée de n jours. */
export function decaleJour(jour: string, n: number): string {
  return new Date(Date.parse(jour + "T12:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
}

export type StatutPlan = "actif" | "atteint" | "passe";

export type PlanDuJour = {
  statut: StatutPlan;
  /** jours restants, aujourd'hui compris, l'examen exclu */
  jours: number;
  /** questions qui restent à poser (avant celles d'aujourd'hui) */
  restant: number;
  /** objectif du jour (questions) ; 0 si le plan n'est plus actif */
  quotidien: number;
};

/**
 * L'objectif du jour : ce qui reste (au matin) réparti sur les jours qui
 * restent. `avant` : questions posées avant aujourd'hui, toutes sources.
 */
export function planDuJour({ total, examen, aujourdhui, avant }: { total: number; examen: string; aujourdhui: string; avant: number }): PlanDuJour {
  const jours = joursEntre(aujourdhui, examen);
  const restant = Math.max(0, total - avant);
  if (jours <= 0) return { statut: "passe", jours: Math.max(0, jours), restant, quotidien: 0 };
  if (restant <= 0) return { statut: "atteint", jours, restant: 0, quotidien: 0 };
  return { statut: "actif", jours, restant, quotidien: Math.max(1, Math.ceil(restant / jours)) };
}

/** Cumul attendu sur la droite de l'objectif au début du jour `jour`. */
export function idealAu(jour: string, { depuis, base, examen, total }: { depuis: string; base: number; examen: string; total: number }): number {
  const span = Math.max(1, joursEntre(depuis, examen));
  const t = Math.min(1, Math.max(0, joursEntre(depuis, jour) / span));
  return base + (total - base) * t;
}

/** Rythme moyen des `n` derniers jours avant aujourd'hui (questions par jour). */
export function rythmeRecent(jours: { day: string; n: number }[], aujourdhui: string, n = 14): number {
  const from = decaleJour(aujourdhui, -n);
  const sum = jours.filter((j) => j.day >= from && j.day < aujourdhui).reduce((s, j) => s + j.n, 0);
  return sum / n;
}

/**
 * La trajectoire complète, pour la courbe : le cumul jour par jour, la droite
 * de l'objectif, le plan du jour et la projection au rythme récent.
 */
export type Trajectoire = {
  aujourdhui: string;
  examen: string;
  total: number;
  depuis: string;
  /** cumul avant `depuis` (point de départ de la droite) */
  base: number;
  /** cumul à la fin de chaque jour, du début du cadre à aujourd'hui compris */
  serie: { day: string; cumul: number; n: number }[];
  /** posées avant aujourd'hui, et aujourd'hui */
  avant: number;
  jour: number;
  plan: PlanDuJour;
  /** questions par jour, moyenne des 14 derniers jours */
  rythme: number;
  /** cumul attendu ce matin sur la droite (écart = avant − ideal) */
  ideal: number;
  /** cumul projeté le jour de l'examen au rythme récent */
  projection: number;
};

/** Jours affichés avant le départ de la droite (contexte), au plus. */
const AVANT_DEPART = 14;

export function construireTrajectoire({
  objectif,
  examen,
  aujourdhui,
  jours,
  jour,
}: {
  objectif: ObjectifMeta;
  examen: string;
  aujourdhui: string;
  /** questions par jour, avant aujourd'hui */
  jours: { day: string; n: number }[];
  /** questions posées aujourd'hui */
  jour: number;
}): Trajectoire {
  const tri = [...jours].filter((j) => j.day < aujourdhui && j.n > 0).sort((a, b) => (a.day < b.day ? -1 : 1));
  const avant = tri.reduce((s, j) => s + j.n, 0);
  const base = tri.filter((j) => j.day < objectif.depuis).reduce((s, j) => s + j.n, 0);
  // le cadre : un peu d'histoire avant le départ (pas avant le premier jour actif)
  const premier = tri[0]?.day ?? aujourdhui;
  let debut = decaleJour(objectif.depuis, -AVANT_DEPART);
  if (debut < premier) debut = premier < objectif.depuis ? premier : objectif.depuis;
  if (debut > aujourdhui) debut = aujourdhui;
  const parJour = new Map(tri.map((j) => [j.day, j.n]));
  let cumul = tri.filter((j) => j.day < debut).reduce((s, j) => s + j.n, 0);
  const serie: Trajectoire["serie"] = [];
  for (let d = debut; d <= aujourdhui; d = decaleJour(d, 1)) {
    const n = d === aujourdhui ? jour : parJour.get(d) ?? 0;
    cumul += n;
    serie.push({ day: d, cumul, n });
  }
  const plan = planDuJour({ total: objectif.total, examen, aujourdhui, avant });
  const rythme = rythmeRecent(tri, aujourdhui);
  const ideal = idealAu(aujourdhui, { depuis: objectif.depuis, base, examen, total: objectif.total });
  const projection = Math.round(avant + jour + rythme * Math.max(0, plan.jours - 1));
  return { aujourdhui, examen, total: objectif.total, depuis: objectif.depuis, base, serie, avant, jour, plan, rythme, ideal, projection };
}

/** Ce qu'il faut au réglage « Ton examen » pour calculer le rythme pendant la saisie. */
export type ObjectifInitial = {
  examen: string | null;
  meta: ObjectifMeta | null;
  /** questions posées avant aujourd'hui, et aujourd'hui (toutes sources) */
  avant: number;
  jour: number;
  aujourdhui: string;
};
