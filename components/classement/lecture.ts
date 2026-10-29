// Petits outils de lecture par pages, côté serveur (client admin ou session) :
// le rival (rival.ts) et les maîtres (maitres.ts) lisent des tables entières,
// et une réponse de l'API s'arrête à 1000 lignes.

/** Les lignes lues par page (le plafond d'une réponse de l'API). */
export const PAGE = 1000;

/**
 * Toutes les lignes d'une requête, par pages de 1000, dans un ordre stable à
 * fournir (`.order(...)` avant `.range(de, a)`). Une erreur : ce qui est déjà lu.
 */
export async function lireTout<T>(page: (de: number, a: number) => PromiseLike<{ data: unknown; error: unknown }>, maxPages = 30): Promise<T[]> {
  const out: T[] = [];
  for (let p = 0; p < maxPages; p++) {
    const { data, error } = await page(p * PAGE, p * PAGE + PAGE - 1);
    if (error || !Array.isArray(data)) break;
    out.push(...(data as T[]));
    if (data.length < PAGE) break;
  }
  return out;
}

/** Une liste découpée en lots (pour un `.in(...)` qui ne dépasse pas la longueur d'une adresse). */
export function morceaux<T>(l: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < l.length; i += n) out.push(l.slice(i, i + n));
  return out;
}
