// Qui monte sur le podium du Classement : un seul endroit pour le dire, que
// partagent la page (qui charge les bannières et les panneaux des trois
// joueurs : app/classement/page.tsx) et le tableau (qui les dessine :
// Leaderboard.tsx). Les trois meilleurs, dans l'ordre du classement, parmi
// ceux qui ont fait au moins un duel (le placement en cours compte) : un
// joueur qui n'a jamais joué n'y monte pas, et le 6e du classement peut donc
// être le 2e du podium. Module neutre : serveur comme client.

/** Ce qu'il faut savoir d'une ligne du classement pour la placer. */
export type LignePodium = { userId: string; gamesPlayed: number };

/** Les places du podium. */
export const PODIUM_PLACES = 3;

/** Les trois premiers du podium dans l'ordre 1, 2, 3 ; null : place à prendre (moins de trois joueurs ont fait un duel). `classement` : dans l'ordre du classement. */
export function joueursDuPodium<T extends LignePodium>(classement: readonly T[]): [T | null, T | null, T | null] {
  const ont = classement.filter((r) => r.gamesPlayed > 0);
  return [ont[0] ?? null, ont[1] ?? null, ont[2] ?? null];
}

/** Les identifiants des joueurs du podium, dans l'ordre 1, 2, 3 (ceux qui manquent n'y sont pas). */
export function idsDuPodium(classement: readonly LignePodium[]): string[] {
  return joueursDuPodium(classement)
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map((r) => r.userId);
}

// ── Le volet : le panneau de gauche d'une bannière composée, qui sort de derrière elle ──
// Sur le podium, seule la bannière est visible ; au survol (ou au clavier, ou
// au premier toucher) son panneau (pseudo, rang, trois badges, trois chiffres :
// PanneauJoueur) glisse à côté d'elle, par-dessus le reste. Où il se pose se
// décide ici, sur des mesures : de son côté gauche, comme sur la carte
// complète ; à droite si la place manque à gauche (la bannière la plus à
// gauche du podium) ; par-dessus la bannière, centré, quand il ne tient d'aucun
// côté (un téléphone). Le CSS (Podium.module.css) fait le reste.

/** Où se pose le volet par rapport à la bannière. */
export type CoteVolet = "gauche" | "droite" | "dessus";

/** La part du panneau qui passe derrière la bannière, comme sur la carte complète (60 unités sur 470). */
export const RECOUVREMENT_VOLET = 60 / 470;
/** Le panneau a au moins cette largeur en pixels (en dessous, ses textes ne se liraient plus). */
export const VOLET_LARGEUR_MIN = 224;

/**
 * Le côté où poser le volet. `hote` : la boîte de la place sur la page (sa
 * largeur est celle de la scène de la bannière, marges de débordement
 * comprises) ; `bannieres` : où la bannière commence et finit dans cette
 * boîte, en part de sa largeur (SCENE de lib/profil/banniere.ts) ; `largeur` :
 * celle du volet ; `zone` : ce que la page ne coupe pas (de gauche à droite,
 * en pixels de la fenêtre). `dx` : le décalage à ajouter pour rester dans la
 * zone, seulement pour « dessus ».
 */
export function placerVolet(a: { hote: { left: number; width: number }; bannieres: { gauche: number; droite: number }; largeur: number; zone: { left: number; right: number }; marge?: number }): { cote: CoteVolet; dx: number } {
  const marge = a.marge ?? 6;
  const bGauche = a.hote.left + a.hote.width * a.bannieres.gauche;
  const bDroite = a.hote.left + a.hote.width * a.bannieres.droite;
  const sous = a.largeur * RECOUVREMENT_VOLET;
  const xGauche = bGauche + sous - a.largeur;
  if (xGauche >= a.zone.left + marge) return { cote: "gauche", dx: 0 };
  const xDroite = bDroite - sous;
  if (xDroite + a.largeur <= a.zone.right - marge) return { cote: "droite", dx: 0 };
  // ni à gauche ni à droite : centré sur la place, ramené dans la zone
  const centre = a.hote.left + a.hote.width / 2 - a.largeur / 2;
  const x = Math.max(a.zone.left + marge, Math.min(a.zone.right - marge - a.largeur, centre));
  return { cote: "dessus", dx: Math.round(x - centre) };
}
