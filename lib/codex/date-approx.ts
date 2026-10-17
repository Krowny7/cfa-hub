// La date d'examen approximative (V3 §10.2) : « vers mi-novembre » → le 15.
// Module neutre et léger (client et serveur, sans import) : le réglage
// « Ton examen » (components/objectif/ObjectifExamenSettings.tsx) l'emploie
// pendant la saisie ; lib/codex/plan.ts le réexporte.

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
