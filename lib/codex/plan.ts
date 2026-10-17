// Le rythme long du Codex (V3 §10.2 à §10.5) : le plan daté (jalons à
// rebours du jour J et la frise « à l'heure »), le mode sprint, la reprise
// douce après une absence, la semaine choisie le lundi et le verdict.
// Module pur (ni base ni réseau) : le serveur lit les tables (codex_semaine,
// codex_resultat, ou le compte sans elles) et passe les lignes au moteur.
import type { Objectif, Quete } from "@/lib/codex/types";
import { CHAINES, COMMANDES, type Commande, type ContenuMatiere, type Semaine } from "@/lib/codex/catalogue";
import { decaleJour, joursEntre } from "@/lib/objectif-calc";

// ── Le plan daté (§10.2) ───────────────────────────────────────────────

/** Un jalon du plan : `j` jours avant le jour J, un objectif évalué comme ceux des quêtes. */
export type Jalon = { j: number; titre: string; objectif: Objectif };

/** Les jalons de CFA I, du plus lointain au plus proche. */
export const JALONS_CFA_L1: Jalon[] = [
  { j: 120, titre: "Toutes les notions vues", objectif: { k: "mesure", mesure: "notions_vues_pct", seuil: 100 } },
  { j: 90, titre: "Aucune matière sous 40 %", objectif: { k: "mesure", mesure: "matieres_au_dessus", seuil: 10, filtre: { pct: 40 } } },
  { j: 75, titre: "Le premier examen blanc", objectif: { k: "compteur", evenement: "examen_blanc_rendu", seuil: 1 } as Objectif },
  { j: 45, titre: "Ethics en zone haute", objectif: { k: "mesure", mesure: "maitrise", seuil: 70, filtre: { matiere: "ethics" } } },
  { j: 30, titre: "Un examen blanc complet", objectif: { k: "compteur", evenement: "examen_blanc_rendu", seuil: 1, filtre: { questions: { min: 90 } } } as Objectif },
  { j: 10, titre: "Le dernier examen blanc complet", objectif: { k: "compteur", evenement: "examen_blanc_rendu", seuil: 1, filtre: { questions: { min: 90 } }, fenetre: { jours: 30 } } as Objectif },
];

/** Un jalon lu : sa date, fait ou non, et quand (null : une mesure, sans date d'atteinte). */
export type JalonLu = { j: number; titre: string; date: string; fait: boolean; atteint: string | null };

/** La frise en tête du cap : l'écart en jours (positif : d'avance ; négatif : de retard ; 0 : à l'heure). */
export type Plan = { jalons: JalonLu[]; ecart: number; libelle: string; prochain: JalonLu | null };

const jourDe = (iso: string) => iso.slice(0, 10);

/** « à l'heure » · « 5 jours d'avance » · « 1 jour de retard ». */
export function libelleEcart(ecart: number): string {
  if (ecart === 0) return "à l'heure";
  const n = Math.abs(ecart);
  return `${n} jour${n > 1 ? "s" : ""} ${ecart > 0 ? "d'avance" : "de retard"}`;
}

/**
 * La frise : l'écart se lit sur le dernier jalon échu (fait : jours entre sa
 * date d'atteinte et sa date, jamais négatif ; pas fait : jours de retard
 * depuis sa date). Aucun jalon échu : le prochain, s'il est déjà fait, donne
 * l'avance ; sinon on est à l'heure. `evs` : un résultat par jalon, dans l'ordre.
 */
export function planDe(jalons: Jalon[], evs: { fait: boolean; atteint: Date | null }[], jour: string, jourJ: string): Plan {
  const lus: JalonLu[] = jalons
    .map((x, i) => ({ j: x.j, titre: x.titre, date: decaleJour(jourJ, -x.j), fait: !!evs[i]?.fait, atteint: evs[i]?.atteint ? jourDe(evs[i].atteint!.toISOString()) : null }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const echus = lus.filter((x) => x.date <= jour);
  const dernier = echus[echus.length - 1];
  const prochain = lus.find((x) => x.date > jour) ?? null;
  let ecart = 0;
  if (dernier) ecart = dernier.fait ? Math.max(0, dernier.atteint ? joursEntre(dernier.atteint, dernier.date) : 0) : -joursEntre(dernier.date, jour);
  else if (prochain?.fait) ecart = Math.max(0, joursEntre(prochain.atteint ?? jour, prochain.date));
  return { jalons: lus, ecart, libelle: libelleEcart(ecart), prochain };
}

/** Les jalons d'un programme daté ; CFA I seulement pour l'instant (les autres n'ont pas de plan). */
export const jalonsDe = (programme: string): Jalon[] => (programme === "finance/cfa-l1" ? JALONS_CFA_L1 : []);

// ── Le mode sprint (§10.2) ─────────────────────────────────────────────

export const SPRINT_SEMAINES = 8;
/** En sprint, les contrats du jour sont courts : 15 minutes au plus chacun, quand l'emplacement en a un. */
export const DUREE_SPRINT = 15;

/** Le sprint : le jour J tombait à moins de 8 semaines du premier calcul du Codex (sans premier calcul : aujourd'hui). */
export function estSprint(jourJ: string | null, premierCalcul: string | null, jour: string): boolean {
  if (!jourJ) return false;
  const debut = premierCalcul ? premierCalcul.slice(0, 10) : jour;
  return joursEntre(debut, jourJ) < SPRINT_SEMAINES * 7;
}

/** Semaines pleines d'ici au jour J (0 le jour J ou après). */
export const semainesRestantes = (jour: string, jourJ: string) => Math.max(0, Math.floor(joursEntre(jour, jourJ) / 7));

const AXE_CHAINE = new Map(CHAINES.map((c) => [c.id, c.axe]));

/**
 * En sprint, un palier d'une chaîne de régularité dont le seuil (en semaines)
 * dépasse les semaines restantes passe « après l'examen » : il n'est plus
 * proposé, il reste visible et peut toujours se remplir.
 */
export function differeeEnSprint(q: Pick<Quete, "famille" | "chaine" | "objectif">, semaines: number): boolean {
  if (q.famille !== "longcours" || !q.chaine || AXE_CHAINE.get(q.chaine) !== "regularite") return false;
  return q.objectif.k === "mesure" && q.objectif.seuil > semaines;
}

// ── La date approximative (§10.2) ──────────────────────────────────────

const MOIS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Une date d'examen à partir d'une saisie approximative : « vers mi-novembre »
 * → le 15, « début décembre » → le 5, « fin novembre » → le 25, « novembre »
 * → le 15 ; une date exacte (« 2026-11-12 », « 12/11/2026 », « 12 novembre »)
 * est gardée. Le mois sans année est le prochain à venir. null : illisible.
 */
export function dateApproximative(saisie: string, aujourdhui: string): string | null {
  const t = sansAccents(saisie).trim();
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return t;
  const fr = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return `${fr[3]}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`;
  const mois = MOIS.findIndex((m) => new RegExp(`\\b${m}\\b`).test(t));
  if (mois < 0) return null;
  const an = t.match(/\b(20\d{2})\b/);
  const jourExact = t.match(/^(?:le\s+)?(\d{1,2})(?:er)?\s/);
  const quantieme = jourExact ? Number(jourExact[1]) : /\bdebut\b/.test(t) ? 5 : /\bfin\b/.test(t) ? 25 : 15;
  const mm = String(mois + 1).padStart(2, "0");
  const jj = String(Math.min(28, Math.max(1, quantieme))).padStart(2, "0");
  let annee = an ? Number(an[1]) : Number(aujourdhui.slice(0, 4));
  if (!an && `${annee}-${mm}-${jj}` < aujourdhui) annee++;
  return `${annee}-${mm}-${jj}`;
}

// ── La reprise douce (§10.4) ───────────────────────────────────────────

/** Jours sans une réponse qui font une absence. */
export const JOURS_ABSENCE = 4;
/** La séance du jour du retour : 15 minutes au plus. */
export const BUDGET_REPRISE = 15;

/**
 * Le retour après une absence : le dernier jour actif avant aujourd'hui est
 * suivi d'au moins 4 jours sans réponse. Calculé sur les jours connus (les
 * questions par jour de codex_lire) ; sans aucun jour actif : pas de reprise
 * (un compte neuf n'est pas un retour).
 */
export function enReprise(jours: { jour: string; n: number }[] | undefined, jour: string): boolean {
  let dernier: string | null = null;
  for (const x of jours ?? []) if (x.n > 0 && x.jour < jour && (dernier === null || x.jour > dernier)) dernier = x.jour;
  return dernier !== null && joursEntre(dernier, jour) - 1 >= JOURS_ABSENCE;
}

// ── La semaine choisie (§10.3) ─────────────────────────────────────────

/** Le choix de la semaine (une ligne de codex_semaine, ou le compte) ; null : pas de choix, ou une autre semaine. */
export function lireSemaine(raw: unknown, lundi: string): Semaine | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const l = typeof r.lundi === "string" ? r.lundi.slice(0, 10) : null;
  const cible = Number(r.cible);
  const commande = COMMANDES.find((c) => c.id === r.commande)?.id;
  if (l !== lundi || !commande || !Number.isInteger(cible) || cible < 3 || cible > 5) return null;
  const p = r.params && typeof r.params === "object" ? (r.params as Record<string, unknown>) : {};
  return {
    lundi: l,
    cible,
    commande,
    params: {
      ...(typeof p.matiere === "string" ? { matiere: p.matiere } : {}),
      ...(typeof p.depart === "number" && Number.isFinite(p.depart) ? { depart: p.depart } : {}),
    },
  };
}

/** La matière du banquier : la plus faible des matières lourdes (10 % de l'examen ou plus) ; jamais mesurée = la plus faible. */
export function matiereBanquier(contenu: ContenuMatiere[], maitrise: (cle: string) => number | null): { matiere: string; depart: number } | null {
  const lourdes = contenu.filter((m) => m.poids >= 10);
  const m = (lourdes.length ? lourdes : contenu)
    .map((x) => ({ x, pct: maitrise(x.key) ?? 0 }))
    .sort((a, b) => a.pct - b.pct || b.x.poids - a.x.poids)[0];
  return m ? { matiere: m.x.key, depart: Math.round(m.pct) } : null;
}

/** Les commandes que la base sait suivre (le copiste attend le journal v3, « À revoir » et les ratures sèches). */
export const commandesPossibles = (ok: (r: NonNullable<(typeof COMMANDES)[number]["requiert"]>[number]) => boolean): Commande[] =>
  COMMANDES.filter((c) => (c.requiert ?? []).every(ok)).map((c) => c.id);

// ── Le verdict (§10.5) ─────────────────────────────────────────────────

export type Bande = "basse" | "moyenne" | "haute";
export type StatutVerdict = "admis" | "pas_cette_fois" | "reporte";
/** Le verdict d'une session (codex_resultat, sinon user_metadata.rl_verdict). */
export type Verdict = { programme: string; session: string; statut: StatutVerdict; bandes: Record<string, Bande>; saisiLe: string };

/** Les bandes basses pèsent ×1,3 dans la faiblesse d'une matière pendant 60 jours. */
export const FACTEUR_BANDE_BASSE = 1.3;
export const JOURS_BANDES = 60;

const BANDES: Bande[] = ["basse", "moyenne", "haute"];
const STATUTS: StatutVerdict[] = ["admis", "pas_cette_fois", "reporte"];

/** « AAAA-MM » : la session d'un jour J. */
export const sessionDe = (jourJ: string) => jourJ.slice(0, 7);

/** Un verdict lu (ligne de codex_resultat ou compte) ; null s'il n'a pas la forme attendue. */
export function lireVerdict(raw: unknown): Verdict | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const statut = STATUTS.find((s) => s === r.statut);
  const session = typeof r.session === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(r.session) ? r.session : null;
  if (!statut || !session || typeof r.programme !== "string") return null;
  const bandes: Record<string, Bande> = {};
  if (r.bandes && typeof r.bandes === "object")
    for (const [k, v] of Object.entries(r.bandes as Record<string, unknown>)) {
      const b = BANDES.find((x) => x === v);
      if (b && /^[a-z0-9:_-]{1,60}$/.test(k)) bandes[k] = b;
    }
  return { programme: r.programme, session, statut, bandes, saisiLe: typeof r.saisi_le === "string" ? r.saisi_le : typeof r.saisiLe === "string" ? r.saisiLe : "" };
}

/** Le poids de faiblesse d'une matière après un « pas cette fois » : ×1,3 en bande basse, 60 jours durant. */
export function facteurBande(v: Verdict | null | undefined, matiere: string, jour: string): number {
  if (!v || v.statut !== "pas_cette_fois" || v.bandes[matiere] !== "basse" || !v.saisiLe) return 1;
  return joursEntre(v.saisiLe.slice(0, 10), jour) <= JOURS_BANDES ? FACTEUR_BANDE_BASSE : 1;
}
