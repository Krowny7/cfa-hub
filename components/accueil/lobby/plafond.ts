// Le filet des lectures lentes de l'accueil : pur, sans accès à la base, pour se
// tester sans elle (scripts/accueil/test-lobby.tsx). Module neutre.

/** Au-delà de ce délai, une lecture lente est abandonnée : sa carte se masque (décision 10 du plan). */
export const PLAFOND_MS = 1500;
/** Le filet des autres cartes : une requête qui ne revient pas ne doit pas bloquer la page. */
export const FILET_MS = 4000;

/**
 * Le résultat de `p`, ou null s'il échoue ou dépasse `ms` (le minuteur est
 * toujours retiré : rien ne reste pendant après la réponse). La lecture
 * abandonnée n'est pas interrompue, seulement ignorée.
 */
export function plafonner<T>(p: Promise<T | null>, ms: number = PLAFOND_MS): Promise<T | null> {
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<null>((fin) => {
    minuteur = setTimeout(() => fin(null), ms);
  });
  return Promise.race([p.catch(() => null), limite]).finally(() => clearTimeout(minuteur));
}
