// « Sans calcul » du carnet de ratures (migration_ratures_calcul.sql), mémorisé
// sur cet appareil (« 1 » : actif) : l'interrupteur de Moi › Erreurs
// (components/moi/RaturesTab) et celui de la carte du carnet dans Réviser.
// Module neutre ; les accès au stockage sont protégés (navigation privée…).

export const CLE_SANS_CALCUL = "rl:ratures:sans-calcul";

/** Le choix mémorisé sur l'appareil ; rien de lisible : coupé. */
export function lireSansCalcul(): boolean {
  try {
    return localStorage.getItem(CLE_SANS_CALCUL) === "1";
  } catch {
    return false;
  }
}

/** Mémorise le choix ; stockage indisponible : il vaut pour cette visite. */
export function ecrireSansCalcul(on: boolean) {
  try {
    localStorage.setItem(CLE_SANS_CALCUL, on ? "1" : "0");
  } catch {
    // rien à garder
  }
}
