// Le lien entre le panneau des quêtes (SceauQuetes, lu en flux) et le bouton du joueur de la
// barre du haut (UserMenu) : ils sont voisins, sans parent commun qui porte leur état.

/** Le bouton du joueur demande d'ouvrir le panneau des quêtes. */
export const OUVRIR_QUETES = "rl:quetes-ouvrir";
/** Le panneau dit combien de récompenses sont à récupérer (`detail` : un nombre). */
export const QUETES_A_RECUPERER = "rl:quetes-a-recuperer";
