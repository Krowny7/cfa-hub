import type { AnswerMode, DrillQuestion, ReviewItem } from "@/lib/ficheLog";

// Série en cours, sauvegardée dans le navigateur pour pouvoir la reprendre
// (changement d'onglet, rechargement, retour le lendemain). Volontairement en
// localStorage et non en base : le tirage d'une série aléatoire n'existe que
// côté client, et reprendre sur un autre appareil n'est pas le besoin.
export type SavedRun = {
  v: 1;
  runId: string;
  mode: AnswerMode;
  title: string;
  items: { id: string; page: number }[];
  done: ReviewItem[];
  savedAt: number;
};

export type RestoredRun = {
  runId: string;
  mode: AnswerMode;
  title: string;
  items: { q: DrillQuestion; page: number }[];
  done: ReviewItem[];
};

const KEY_PREFIX = "cfa_fiche_run:";
const MAX_AGE_MS = 30 * 24 * 3600 * 1000;

export function saveRun(storageKey: string, run: SavedRun): void {
  try {
    localStorage.setItem(KEY_PREFIX + storageKey, JSON.stringify(run));
  } catch {}
}

export function clearRun(storageKey: string): void {
  try {
    localStorage.removeItem(KEY_PREFIX + storageKey);
  } catch {}
}

export function loadRun(storageKey: string): SavedRun | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + storageKey);
    if (!raw) return null;
    const run = JSON.parse(raw) as SavedRun;
    if (run.v !== 1 || !Array.isArray(run.items) || !Array.isArray(run.done)) return null;
    if (Date.now() - run.savedAt > MAX_AGE_MS) return null;
    return run;
  } catch {
    return null;
  }
}

// Reconstruit la série à partir des questions actuelles. Renvoie null si une
// question a disparu (set re-seedé : les ids changent) ou si la série est
// déjà terminée sans rien à reprendre — mieux vaut repartir de zéro que
// reprendre une série incohérente.
export function restoreRun(
  saved: SavedRun,
  allItems: { q: DrillQuestion; page: number }[]
): RestoredRun | null {
  const byId = new Map(allItems.map((it) => [it.q.id, it]));
  const items: RestoredRun["items"] = [];
  for (const ref of saved.items) {
    const found = byId.get(ref.id);
    if (!found) return null;
    items.push(found);
  }
  if (items.length === 0 || saved.done.length > items.length) return null;
  return { runId: saved.runId, mode: saved.mode, title: saved.title, items, done: saved.done };
}
