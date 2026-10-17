// Le Codex : le segment « Aujourd'hui » de /codex (Codex simplifié, §3.3 et
// §3.4). Ce qu'il montre, calculé ici une fois : la tête du fil (« 1 étape
// faite sur 3 · 25 min »), l'XP des quêtes du jour qu'une étape remplit, la
// mention « fait avancer », le compte neuf, et le résumé d'une ligne de
// chaque repli (quêtes du jour, fait aujourd'hui, préparation, acte, semaine).
// Module neutre et LÉGER : des types, et lib/codex/cap (sans le catalogue),
// pour que l'écran n'en charge pas le poids dans le navigateur.

import { pctCap, type PointFaible, type VueCap } from "@/lib/codex/cap";
import type { FaitAujourdhui } from "@/lib/codex/recuperer";
import type { Bloc, VueSeance } from "@/lib/codex/seance";
import type { LigneQuete, VueActe, VueCodex } from "@/lib/codex/vue";

export const TEXTES_JOUR = {
  titre: "Aujourd'hui",
  budget: "Le temps que tu te donnes aujourd'hui",
  budgetPuce: (b: number) => `${b} min`,
  autre: "Une autre idée ?",
  quetesDuJour: "Quêtes du jour",
  fait: "Fait aujourd'hui",
  rienFait: "Rien de fait pour l'instant aujourd'hui.",
  preparation: "Préparation",
  coute: "Ce qui te coûte le plus :",
  semaine: "Ta semaine",
  jusquaDimanche: "jusqu'à dimanche",
  segments: "Le Codex",
  /** le compte neuf : une seule étape, pas de préparation */
  neuf: { titre: "10 questions pour faire connaissance", duree: 5, raison: "Pour voir où tu en es, matière par matière.", href: "/practice" },
} as const;

// ── Le fil ─────────────────────────────────────────────────────────────

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/** « 3 étapes · 25 min », « 1 étape faite sur 3 · 25 min », « 3 étapes faites sur 3 · 25 min ». */
export function teteFil(s: Pick<VueSeance, "blocs" | "faits" | "duree">): string {
  const total = s.blocs.length;
  const faits = s.blocs.filter((b) => s.faits.includes(b.genre)).length;
  const avance = faits === 0 ? pluriel(total, "étape") : `${pluriel(faits, "étape")} ${faits > 1 ? "faites" : "faite"} sur ${total}`;
  return `${avance} · ${s.duree} min`;
}

/** L'XP des quêtes du jour qu'une étape remplit (`b.contrats`), celles pas encore faites ; 0 : aucune. */
export function xpEtape(b: Pick<Bloc, "contrats">, contrats: VueCodex["contrats"]): number {
  const ids = new Set(b.contrats);
  return contrats.filter((c) => ids.has(c.ligne.id) && c.ligne.etat !== "terminee").reduce((s, c) => s + c.ligne.xp, 0);
}

/** Une quête longue proche du but (80 % ou plus) : l'étape en parle (« fait avancer : … »). */
export const SEUIL_FAIT_AVANCER = 0.8;

/**
 * « fait avancer : FSA à 60 % (51 → 60) » : au plus une mention, la première
 * étape de la branche de la matière visée qui est entamée à 80 % ou plus ;
 * null : l'étape ne vise pas de matière, ou rien n'est si proche.
 */
export function faitAvancer(b: Pick<Bloc, "matiere">, branches: VueCodex["branches"]): string | null {
  if (!b.matiere) return null;
  const l = branches.find((x) => x.contenu.key === b.matiere)?.etapes.find((q) => q.etat === "active" && q.affichage === "complet" && q.fraction >= SEUIL_FAIT_AVANCER);
  return l ? `fait avancer : ${l.titre} (${Math.floor(l.valeur)} → ${Math.floor(l.cible)})` : null;
}

/**
 * Le compte neuf : aucune réponse dans aucune matière et aucune quête faite.
 * Le fil n'a alors qu'une étape (« 10 questions pour faire connaissance ») ;
 * pas de préparation, pas de page blanche.
 */
export function compteNeuf(v: Pick<VueCodex, "cap" | "stats">): boolean {
  return !!v.cap && v.cap.matieres.every((m) => m.n === 0) && v.stats.faites === 0;
}

// ── Les replis ─────────────────────────────────────────────────────────

/** « · 1 sur 3 · +50 XP à 3 sur 3 » (sobre, ou le bonus déjà gagné : sans l'XP). */
export function resumeQuetesDuJour(trio: VueCodex["trio"], sobre: boolean): string {
  const bonus = !sobre && !trio.fait && trio.xp > 0 ? ` · +${trio.xp} XP à ${trio.total} sur ${trio.total}` : "";
  return `· ${trio.faits} sur ${trio.total}${bonus}`;
}

/** « · 4 · +230 XP » (sobre, ou sans XP : le nombre seul). */
export function resumeFait(f: FaitAujourdhui, sobre: boolean): string {
  return `· ${f.n}${!sobre && f.xp > 0 ? ` · +${f.xp} XP` : ""}`;
}

/** La préparation se montre dès 3 matières mesurées (même provisoirement) : avant, elle ne voudrait rien dire. */
export const MATIERES_PREPARATION = 3;

export type PreparationJour = {
  pct: number;
  /** « Ethics 60 % · Quant 50 % · … » : les valeurs de la règle, écrites (pas d'infobulle) */
  valeurs: string;
  /** « Ce qui te coûte le plus : Ethics (−7 pts) » ; null : aucun point faible sous le repère */
  faible: (PointFaible & { texte: string }) | null;
};

/** La préparation du repli ; null : moins de 3 matières mesurées (la ligne est masquée). */
export function preparationJour(cap: VueCap | null): PreparationJour | null {
  if (!cap || cap.matieres.filter((m) => m.statut !== "non_mesuree").length < MATIERES_PREPARATION) return null;
  const f = cap.faible && cap.faible.points > 0 ? cap.faible : null;
  return {
    pct: cap.preparation,
    valeurs: cap.matieres.map((m) => `${m.court} ${pctCap(m)}`).join(" · "),
    faible: f ? { ...f, texte: `${f.court} (−${Math.round(f.points)} pts)` } : null,
  };
}

/** La visite de la bottega (acte I) : des outils facultatifs à côté du tronc, pas l'acte à suivre. */
const estVisite = (a: VueActe) => a.acte.numero === 1 && a.quetes.length > 0 && a.quetes.every((q) => q.optionnelle);

/** L'acte en cours (hors visite) ; null : aucun (le Codex est fini, ou indisponible). */
export const acteEnCours = (trame: VueActe[]): VueActe | null => trame.find((a) => a.courant && !estVisite(a)) ?? null;

/** Les étapes d'un acte à montrer : celles qui se voient (pas les cachées), celles à faire d'abord. */
export function etapesActe(a: VueActe): LigneQuete[] {
  const vues = a.quetes.filter((q) => q.affichage !== "cache");
  return [...vues.filter((q) => q.etat !== "terminee"), ...vues.filter((q) => q.etat === "terminee")];
}

/** « · 4 sur 5 » : les quêtes de la semaine faites. */
export const resumeSemaine = (hebdo: LigneQuete[]): string => `· ${hebdo.filter((l) => l.etat === "terminee").length} sur ${hebdo.length}`;
