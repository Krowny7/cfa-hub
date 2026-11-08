// Les règles de la mise en scène des parties, sans base ni navigateur : quel
// écran VS jouer, qui a gagné, quoi montrer à la fin. Testées par
// scripts/arene/test-arene.ts ; les écrans sont dans components/arene/.

import type { Cadre, FormatVideo, VideoVictoire } from "@/lib/arene/perso";

/** L'écran VS dure 6 secondes, sa sortie comprise : il tient dans le décompte de départ des Salles. */
export const VS_DUREE_MS = 6000;
export const VS_SORTIE_MS = 400;
/** La vidéo du vainqueur : 15 secondes au plus. */
export const VIDEO_MAX_MS = 15_000;
/** Une vidéo courte repart du début tant qu'on ne l'a pas vue au moins ce temps-là. */
export const VIDEO_MIN_MS = 10_000;
/** Personne ne reste bloqué : passé ce délai, le résultat s'affiche quoi qu'il arrive. */
export const VIDEO_FILET_MS = 20_000;
/** Vainqueur sans vidéo : sa bannière et son score. */
export const BANNIERE_DUREE_MS = 7000;
/** À la fin de la vidéo : la relancer ? Seulement si elle a duré moins que le minimum. */
export const relancerVideo = (ecouleMs: number): boolean => ecouleMs < VIDEO_MIN_MS;
/** Examen blanc joué seul : réussi à partir de 70 %. */
export const SEUIL_REUSSITE_PCT = 70;
/** Le quinconce va jusqu'à 4 joueurs, la mosaïque montre 8 bannières au plus. */
export const QUINCONCE_MAX = 4;
export const MOSAIQUE_MAX = 8;

export type DispositionVs = "duo" | "quinconce" | "mosaique";

/** La mise en page de l'écran VS selon le nombre de joueurs (moins de 2 : pas d'écran). */
export function dispositionVs(nb: number): DispositionVs | null {
  if (!Number.isInteger(nb) || nb < 2) return null;
  if (nb === 2) return "duo";
  return nb <= QUINCONCE_MAX ? "quinconce" : "mosaique";
}

/** Une donnée manque (identifiant ou pseudo) : l'écran ne s'affiche pas. */
export const joueursComplets = (joueurs: readonly { id?: string | null; pseudo?: string | null }[]): boolean => joueurs.every((j) => !!j.id && !!j.pseudo?.trim());

/** L'écran VS à jouer, ou null : pas en mode discret, une seule fois par partie, jamais une fois la partie démarrée. */
export function planVs(x: { joueurs: readonly { id?: string | null; pseudo?: string | null }[]; discret: boolean; dejaVu: boolean; demarree: boolean }): DispositionVs | null {
  if (x.discret || x.dejaVu || x.demarree || !joueursComplets(x.joueurs)) return null;
  return dispositionVs(x.joueurs.length);
}

/** Les bannières montrées : moi d'abord, puis les autres, 8 au plus. */
export function joueursMontres<T extends { id: string }>(joueurs: readonly T[], moiId: string | null): T[] {
  const moi = joueurs.filter((j) => j.id === moiId);
  return [...moi, ...joueurs.filter((j) => j.id !== moiId)].slice(0, MOSAIQUE_MAX);
}

/** Le vainqueur d'un duel : l'un des deux joueurs ; égalité ou joueur inconnu : null. */
export function vainqueurDuel(winnerId: string | null | undefined, joueurs: readonly (string | null | undefined)[]): string | null {
  return winnerId && joueurs.includes(winnerId) ? winnerId : null;
}

export type LigneFin = { userId: string; rang: number; points: number; bonnes: number; tempsMs: number };

/**
 * Le vainqueur d'une partie à plusieurs : le premier du classement, s'il a
 * marqué et s'il est seul à sa place. Égalité (même rang, ou mêmes points et même
 * temps, le temps départageant les points) ou personne n'a marqué : null.
 */
export function vainqueurSalle(classement: readonly LigneFin[]): string | null {
  const [premier, second] = [...classement].sort((a, b) => a.rang - b.rang);
  if (!premier || premier.points <= 0) return null;
  if (second && (second.rang === premier.rang || (second.points === premier.points && second.tempsMs === premier.tempsMs))) return null;
  return premier.userId;
}

/** Examen blanc joué seul : 70 % de bonnes réponses au moins (compté en entiers : 21 / 30 passe). */
export const examenReussi = (score: number, total: number): boolean => total > 0 && score * 100 >= total * SEUIL_REUSSITE_PCT;

/** Celui dont on joue la vidéo à la fin d'une Salle : le vainqueur ; seul dans la partie, le joueur s'il réussit. */
export function gagnantSalle(classement: readonly LigneFin[], nbQuestions: number, nbJoueurs: number): string | null {
  if (nbJoueurs > 1) return vainqueurSalle(classement);
  const moi = classement[0];
  return moi && examenReussi(moi.bonnes, nbQuestions) ? moi.userId : null;
}

export type SceneFin = "video" | "banniere" | "aucune";

/**
 * Ce qui se joue au clic sur « Voir le résultat ». Sans gagnant (égalité,
 * examen raté) : rien, le résultat. Gagnant sans vidéo : sa bannière. En
 * mouvement réduit, jamais de vidéo qui se lance seule : sa bannière aussi.
 */
export function sceneFin(x: { gagnantId: string | null; aVideo: boolean; reduit: boolean }): SceneFin {
  if (!x.gagnantId) return "aucune";
  return x.aVideo && !x.reduit ? "video" : "banniere";
}

/** Le résultat reste-t-il caché derrière le bouton ? Pas en mode discret, pas si le joueur l'a déjà vu. */
export const rideauFerme = (x: { discret: boolean; dejaVu: boolean }): boolean => !x.discret && !x.dejaVu;

/** Le cadre de départ suit la vidéo : paysage 16:9, carré (vidéo presque carrée) ou vertical 9:16. */
export const formatVideo = (ratio: number): FormatVideo => (ratio >= 0.85 && ratio <= 1.18 ? "carre" : ratio > 1 ? "paysage" : "vertical");

/** Le cadre montré : celui choisi par le joueur, sinon celui qui suit la vidéo. */
export const formatDe = (v: Pick<VideoVictoire, "ratio" | "format">): FormatVideo => v.format ?? formatVideo(v.ratio);

/** Largeur sur hauteur de la fenêtre où passe la vidéo, dans chaque cadre peint. */
const FENETRE: Record<FormatVideo, number> = { paysage: (0.878 * 1170) / (0.802 * 720), carre: 1, vertical: (0.802 * 540) / (0.878 * 877) };

/**
 * Le recadrage après un glissé de (dx, dy), en fraction de la fenêtre : l'image suit
 * le doigt. Ce qui dépasse vient du remplissage (object-fit: cover) et du zoom.
 */
export function deplacerCadre(c: Cadre, dx: number, dy: number, ratioVideo: number, format: FormatVideo): Cadre {
  const f = FENETRE[format];
  const ox = Math.max(0, ratioVideo / f - 1);
  const oy = Math.max(0, f / ratioVideo - 1);
  const pas = (o: number) => Math.max(0.15, c.z - 1 + o * c.z);
  const borne = (n: number) => Math.min(100, Math.max(0, n));
  return { x: borne(c.x - (dx * 100) / pas(ox)), y: borne(c.y - (dy * 100) / pas(oy)), z: c.z };
}
