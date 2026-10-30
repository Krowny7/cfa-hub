// L'ancien personnage de la bannière verticale (que la bannière composée
// remplace : lib/profil/banniere.ts, compositionDepuisAncien) : l'image que le
// joueur envoyait (un PNG détouré), dans son dossier
// du bucket public « profil-medias » (même dossier, mêmes règles que les
// médias de sa page : migration_profil_medias.sql). Son nom est exact :
// `perso-<instant>.<ext>`, ni « .. » ni « %2e » (le navigateur le ramènerait
// chez un autre joueur). Un seul personnage par joueur : l'ancien fichier part
// au ménage de l'enregistrement (fichiersGardesStyle).
// La taille et la position verticale sont deux réglages simples, enregistrés
// avec l'image (profile_style.perso_taille / perso_pos,
// migration_bannieres_perso.sql).
// Module neutre (client et serveur) : pas d'accès à la base ici.

import { fichiersComposition, type Composition } from "@/lib/profil/banniere";
import { BUCKET_MEDIAS, fichiersGardes, type Disposition } from "@/lib/profil/disposition";

/** poids du personnage envoyé (après réduction éventuelle dans le navigateur) */
export const PERSO_MAX_OCTETS = 4 * 1024 * 1024;
/** poids de l'image choisie, avant réduction : au-delà, on ne tente même pas */
export const PERSO_BRUT_MAX_OCTETS = 20 * 1024 * 1024;
/** côté le plus long, après réduction : assez pour une bannière haute, sur écran dense */
export const PERSO_MAX_PX = 1800;
/** PNG ou WebP (la transparence), JPG accepté (fond plein) */
export const PERSO_TYPES = ["image/png", "image/webp", "image/jpeg"];

/** taille du personnage, en % de sa taille de base (100 : il remplit la bannière) */
export const PERSO_TAILLE_MIN = 50;
export const PERSO_TAILLE_MAX = 160;
export const PERSO_TAILLE_DEFAUT = 100;
/** position verticale : 50 posé à sa place (en bas du cadre), 0 remonté, 100 descendu */
export const PERSO_POS_DEFAUT = 50;

/**
 * Le cadrage du personnage dans le cadre de la bannière, pour qui le dessine
 * (l'aperçu de Personnaliser, la bannière du profil, du podium, de la carte) :
 * posé en bas du cadre, centré, agrandi depuis le bas ; `echelle` multiplie sa
 * taille de base (transform-origin : 50% 100%), `decalageY` le déplace en % de
 * sa propre hauteur (translateY ; négatif : vers le haut ; −25 à +25).
 * Taille 100 et position 50 : le personnage à sa place.
 */
export const cadragePerso = (taille: number, pos: number): { echelle: number; decalageY: number } => ({ echelle: bornerPersoTaille(taille) / 100, decalageY: (bornerPersoPos(pos) - 50) / 2 });

const NOM = /^perso-[0-9]{9,16}[.](?:png|webp|jpe?g)$/i;
/** Relu de la base : le bucket, un dossier de joueur (son uuid), puis ce nom exact. */
const ADRESSE_RELUE = new RegExp(`^https?:[/][/][A-Za-z0-9.:-]+[/]storage[/]v1[/]object[/]public[/]${BUCKET_MEDIAS}[/][0-9a-f-]{36}[/](perso-[0-9]{9,16}[.](?:png|webp|jpe?g))$`, "i");

/** Le nom d'un fichier de personnage envoyé maintenant. */
export const nomFichierPerso = (ext: string, quand: number = Date.now()) => `perso-${quand}.${ext}`;

/** Le personnage lu en base (ou venu d'un brouillon) : une adresse de son dossier de profil-medias, sinon null. */
export function persoDepuis(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 500) return null;
  return ADRESSE_RELUE.test(raw.trim()) ? raw.trim() : null;
}

/** Le personnage voulu à l'enregistrement : un fichier du dossier du joueur (`prefixe`), sous son nom exact. */
export function persoValide(raw: unknown, prefixe: string | null): string | null {
  const url = typeof raw === "string" ? raw.trim() : "";
  if (!url || !prefixe || url.length > 500 || !url.startsWith(prefixe)) return null;
  return NOM.test(url.slice(prefixe.length)) ? url : null;
}

/** Le nom de fichier d'un personnage (le dernier segment de son adresse) ; aucun : null. */
export const fichierPerso = (url: string | null | undefined): string | null => (url ? (url.split("/").pop() ?? null) : null);

/** Taille et position, ramenées dans leurs bornes. */
export const bornerPersoTaille = (v: unknown): number => {
  const n = v === null || v === undefined || v === "" ? NaN : Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(PERSO_TAILLE_MIN, Math.min(PERSO_TAILLE_MAX, n)) : PERSO_TAILLE_DEFAUT;
};
export const bornerPersoPos = (v: unknown): number => {
  const n = v === null || v === undefined || v === "" ? NaN : Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : PERSO_POS_DEFAUT;
};

/**
 * Les fichiers du joueur dont son style se sert dans profil-medias : les médias
 * et les images en haut de sa page, son personnage (l'ancien) et les images de
 * sa bannière composée (fond, personnage, pièces : lib/profil/banniere.ts). Le
 * ménage de l'enregistrement supprime tout le reste : un fichier remplacé part
 * à l'enregistrement qui ne le garde plus.
 */
export function fichiersGardesStyle(s: { disposition: Disposition; perso: string | null; banniere?: Composition | null }): Set<string> {
  const gardes = fichiersGardes(s.disposition);
  const nom = fichierPerso(s.perso);
  if (nom) gardes.add(nom);
  for (const f of fichiersComposition(s.banniere)) gardes.add(f);
  return gardes;
}
