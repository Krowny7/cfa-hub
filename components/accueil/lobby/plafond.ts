// Le filet des lectures lentes de l'accueil : pur, sans accès à la base, pour se
// tester sans elle (scripts/accueil/test-lobby.tsx). Module neutre.

/** Le filet des cartes lues avec la page : une requête qui ne revient pas ne doit pas bloquer la page. */
export const FILET_MS = 4000;
/**
 * Le filet des cinq cartes lues APRÈS la page, en continu (le lobby en direct, le rival, la carte du jour, le
 * déblocage, la quête). Elles ne bloquent rien et leur squelette attend à leur place : le filet est large, pour
 * qu'un démarrage à froid ou plusieurs requêtes en série ne masquent plus une carte qui allait arriver (l'ancien
 * plafond de 1,5 s la faisait disparaître « de temps en temps »). Seule une lecture qui échoue vraiment, ou qui
 * dépasse ce délai, retire la carte.
 */
export const FILET_CARTES_MS = 6000;

/**
 * Le résultat de `p`, ou null s'il échoue ou dépasse `ms` (le minuteur est
 * toujours retiré : rien ne reste pendant après la réponse). La lecture
 * abandonnée n'est pas interrompue, seulement ignorée.
 */
export function plafonner<T>(p: Promise<T | null>, ms: number = FILET_MS): Promise<T | null> {
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<null>((fin) => {
    minuteur = setTimeout(() => fin(null), ms);
  });
  return Promise.race([p.catch(() => null), limite]).finally(() => clearTimeout(minuteur));
}
