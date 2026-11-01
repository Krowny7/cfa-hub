// Un faux cache de données de Next, pour tester les lectures gardées (unstable_cache)
// HORS d'une requête : unstable_cache cherche son cache dans globalThis.__incrementalCache
// quand aucune requête ne tourne. Ce faux cache garde les entrées en mémoire, comme le vrai,
// et note ce qu'on lui demande de garder (clé, durée, étiquettes) pour qu'un test le vérifie.
// Sans lui, unstable_cache lève « incrementalCache missing » et les lectures se font sans cache.
// Next attend aussi AsyncLocalStorage en global (il le pose au démarrage du serveur et le lit au
// chargement de ses modules) : cet import le pose AU CHARGEMENT, il doit donc venir AVANT tout import
// de Next dans le test (juste après « ../codex/sans-css »).
// Utilisé par test-lobby-carte.tsx et test-lobby-direct.tsx.
import { AsyncLocalStorage } from "node:async_hooks";

(globalThis as { AsyncLocalStorage?: unknown }).AsyncLocalStorage ??= AsyncLocalStorage;

type Garde = { corps: string; revalidate: unknown; tags: string[] };

export type FauxCache = {
  /** ce qui est gardé, par clé */
  memoire: Map<string, Garde>;
  /** chaque entrée posée, dans l'ordre (une entrée relue sans être reposée n'y figure pas) */
  posees: { cle: string; revalidate: unknown; tags: string[] }[];
  /** combien de fois une entrée a été relue depuis le cache */
  relues: { n: number };
  /** oublie tout (un autre jour, un autre test) */
  vider(): void;
  /** retire le faux cache : unstable_cache redevient indisponible hors requête */
  retirer(): void;
};

/** Pose le faux cache là où unstable_cache le cherche. */
export function poserFauxCache(): FauxCache {
  const memoire = new Map<string, Garde>();
  const posees: FauxCache["posees"] = [];
  const relues = { n: 0 };
  const cache = {
    isOnDemandRevalidate: false,
    async generateCacheKey(cle: string) {
      return cle;
    },
    async get(cle: string) {
      const e = memoire.get(cle);
      if (!e) return null;
      relues.n++;
      return { value: { kind: "FETCH", data: { headers: {}, body: e.corps, status: 200, url: "" } }, isStale: false };
    },
    async set(cle: string, valeur: { data: { body: string }; revalidate?: unknown }, ctx: { tags?: string[] }) {
      const e = { corps: valeur.data.body, revalidate: valeur.revalidate, tags: ctx.tags ?? [] };
      memoire.set(cle, e);
      posees.push({ cle, revalidate: e.revalidate, tags: e.tags });
    },
  };
  (globalThis as { __incrementalCache?: unknown }).__incrementalCache = cache;
  return {
    memoire,
    posees,
    relues,
    vider() {
      memoire.clear();
      posees.length = 0;
      relues.n = 0;
    },
    retirer() {
      delete (globalThis as { __incrementalCache?: unknown }).__incrementalCache;
    },
  };
}
