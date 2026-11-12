import { useSyncExternalStore } from "react";

// L'avancement d'un cas pratique, gardé dans le navigateur. La mémoire de la page fait foi :
// si le stockage est plein ou interdit, le cas se joue quand même jusqu'à la fermeture.
// À n'utiliser que dans un composant client.

/** Une question terminée : le joueur a trouvé, ou il a révélé la réponse. */
export type Issue = "juste" | "revelee";

export type Avancement = {
  /** les questions terminées, par id d'étape */
  etapes: Record<string, Issue>;
  /** le rang de la question ouverte ; le nombre de questions : le bilan */
  ici: number;
  tuto: boolean;
};

const VIDE: Avancement = { etapes: {}, ici: 0, tuto: false };
const cle = (id: string) => `rl_cas_fsa_v1:${id}`;

const memoire = new Map<string, Avancement>();
const abonnes = new Set<() => void>();

function depuisStockage(id: string): Avancement {
  try {
    const brut = window.localStorage.getItem(cle(id));
    const o = brut ? (JSON.parse(brut) as Partial<Avancement> | null) : null;
    if (!o || typeof o !== "object") return VIDE;
    const etapes: Record<string, Issue> = {};
    for (const [k, v] of Object.entries(o.etapes ?? {})) if (v === "juste" || v === "revelee") etapes[k] = v;
    return { etapes, ici: typeof o.ici === "number" && o.ici > 0 ? Math.floor(o.ici) : 0, tuto: o.tuto === true };
  } catch {
    return VIDE;
  }
}

function lire(id: string): Avancement {
  let a = memoire.get(id);
  if (!a) {
    a = depuisStockage(id);
    memoire.set(id, a);
  }
  return a;
}

function abonner(f: () => void) {
  abonnes.add(f);
  return () => {
    abonnes.delete(f);
  };
}

export function majAvancement(id: string, change: (a: Avancement) => Avancement) {
  const a = change(lire(id));
  memoire.set(id, a);
  try {
    window.localStorage.setItem(cle(id), JSON.stringify(a));
  } catch {
    // stockage plein ou interdit : la mémoire de la page suffit
  }
  abonnes.forEach((f) => f());
}

export function viderAvancement(id: string) {
  majAvancement(id, (a) => ({ ...VIDE, tuto: a.tuto }));
}

/** Vide au rendu serveur et à l'hydratation, puis l'avancement du navigateur. */
export function useAvancement(id: string): Avancement {
  return useSyncExternalStore(
    abonner,
    () => lire(id),
    () => VIDE,
  );
}

/** Le nombre de cas bouclés (toutes leurs questions terminées), relu du navigateur ; 0 au rendu serveur et à l'hydratation. */
export function useCasBoucles(cas: { id: string; etapes: string[] }[]): number {
  return useSyncExternalStore(
    abonner,
    () => cas.filter((c) => c.etapes.length > 0 && c.etapes.every((e) => lire(c.id).etapes[e])).length,
    () => 0,
  );
}
