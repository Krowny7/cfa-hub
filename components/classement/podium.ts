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

/** La part du panneau qui passe derrière la bannière (60 unités sur 360 : le volet seul a les proportions de la bannière, 360 × 850). */
export const RECOUVREMENT_VOLET = 60 / 360;
/** Le panneau a au moins cette largeur en pixels (Podium.module.css, --pw) : ses textes font alors 10 px au moins (28 unités sur 360) ; en dessous, ils ne se liraient plus. */
export const VOLET_LARGEUR_MIN = 129;
/**
 * La marge intérieure du panneau du côté de la bannière, où son texte commence
 * (PanneauJoueur.module.css : 104 unités sur 360). Assez pour que le texte
 * passe le bout des pièces qui débordent de 20 % : le volet, aussi haut que la
 * bannière, a son pseudo à hauteur de la pièce du haut, et l'écart (pousse)
 * ne dépasse pas ce qu'il garde sous elle (le pire cas, 202 px de place :
 * 129 px de volet, 37,3 px de marge pour 36,9 px de pièce et de garde).
 */
export const TEXTE_VOLET = 104 / 360;
/** Ce que le volet garde au moins sous la bannière quand on l'écarte (pixels) : il sort toujours de derrière elle. */
const SOUS_MIN = 6;
/** L'écart entre le bout des calques qui débordent et le texte du volet (pixels). */
const GARDE_TEXTE = 4;

/**
 * Ce qui déborde de la bannière à gauche et à droite (son personnage, ses
 * pièces), en part de sa largeur : ces calques passent devant le volet. Sans
 * en tenir compte, la pièce du haut (140 % de large par défaut : 20 % de
 * chaque côté) cachait le début du pseudo du volet ouvert à droite.
 * `calques` : x et l en % de la largeur de la bannière (lib/profil/banniere.ts) ;
 * un calque sans image ne compte pas.
 */
export function debordCalques(calques: ReadonlyArray<{ image: string | null; x: number; l: number }>): { gauche: number; droite: number } {
  let gauche = 0;
  let droite = 0;
  for (const k of calques) {
    if (!k.image || !Number.isFinite(k.x) || !Number.isFinite(k.l)) continue;
    gauche = Math.max(gauche, -k.x / 100);
    droite = Math.max(droite, (k.x + k.l - 100) / 100);
  }
  return { gauche, droite };
}

/**
 * Le côté où poser le volet. `hote` : la boîte de la place sur la page (sa
 * largeur est celle de la scène de la bannière, marges de débordement
 * comprises) ; `bannieres` : où la bannière commence et finit dans cette
 * boîte, en part de sa largeur (SCENE de lib/profil/banniere.ts) ; `largeur` :
 * celle du volet ; `zone` : ce que la page ne coupe pas (de gauche à droite,
 * en pixels de la fenêtre) ; `debord` : ce qui dépasse de la bannière de
 * chaque côté (debordCalques). `dx` : le décalage à ajouter pour rester dans
 * la zone, seulement pour « dessus ». `pousse` : de combien écarter le volet
 * de la bannière (pixels, vers l'extérieur) pour que les calques qui
 * débordent ne cachent pas son texte, dans la place qu'il reste ; il garde
 * toujours un bord sous la bannière.
 */
export function placerVolet(a: {
  hote: { left: number; width: number };
  bannieres: { gauche: number; droite: number };
  largeur: number;
  zone: { left: number; right: number };
  debord?: { gauche: number; droite: number };
  marge?: number;
}): { cote: CoteVolet; dx: number; pousse: number } {
  const marge = a.marge ?? 6;
  const bGauche = a.hote.left + a.hote.width * a.bannieres.gauche;
  const bDroite = a.hote.left + a.hote.width * a.bannieres.droite;
  const largeBanniere = a.hote.width * (a.bannieres.droite - a.bannieres.gauche);
  const sous = a.largeur * RECOUVREMENT_VOLET;
  // l'écart voulu d'un côté : le bout des calques et la garde, moins ce que la marge du texte dépasse déjà de la bannière
  const veut = (d: number) => Math.max(0, Math.min(sous - SOUS_MIN, Math.max(0, d) * largeBanniere + GARDE_TEXTE - (TEXTE_VOLET - RECOUVREMENT_VOLET) * a.largeur));
  const placeGauche = bGauche + sous - a.largeur - (a.zone.left + marge);
  if (placeGauche >= 0) return { cote: "gauche", dx: 0, pousse: Math.round(Math.min(veut(a.debord?.gauche ?? 0), placeGauche)) };
  const placeDroite = a.zone.right - marge - (bDroite - sous + a.largeur);
  if (placeDroite >= 0) return { cote: "droite", dx: 0, pousse: Math.round(Math.min(veut(a.debord?.droite ?? 0), placeDroite)) };
  // ni à gauche ni à droite : centré sur la place, ramené dans la zone
  const centre = a.hote.left + a.hote.width / 2 - a.largeur / 2;
  const x = Math.max(a.zone.left + marge, Math.min(a.zone.right - marge - a.largeur, centre));
  return { cote: "dessus", dx: Math.round(x - centre), pousse: 0 };
}

/**
 * Le décalage vertical du volet (pixels, vers le bas si positif) pour qu'il
 * tienne dans la bande que la page ne coupe pas : plus haut que la bannière et
 * centré sur elle, il dépassait du bas de la carte « Classement général »
 * (overflow: hidden) quand le podium en touche le bas. `haut` : son bord haut
 * sans décalage ; `hauteur` : la sienne ; `zone` : de haut en bas, en pixels de
 * la fenêtre (±Infinity : rien ne coupe). Plus haut que la zone : collé en haut.
 */
export function decalerVolet(a: { haut: number; hauteur: number; zone: { top: number; bottom: number }; marge?: number }): number {
  const marge = a.marge ?? 6;
  const min = a.zone.top + marge;
  const max = a.zone.bottom - marge;
  if (!Number.isFinite(a.haut) || !Number.isFinite(a.hauteur)) return 0;
  if (a.hauteur > max - min || a.haut < min) return Number.isFinite(min) ? Math.round(min - a.haut) : 0;
  if (a.haut + a.hauteur > max) return Math.round(max - a.hauteur - a.haut);
  return 0;
}
