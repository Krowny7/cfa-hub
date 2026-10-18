// Les textes des blocs Radar, Amis, Folio et Saisons de la page de profil
// (components/profil/blocs/Radar.tsx, Amis.tsx, Folio.tsx, Saisons.tsx),
// dans leur nouvelle grammaire (« toi −6 », « toi 5e », « toi Argent I »).
// Ceux qui existent déjà ne sont pas recopiés : BLOCS_PROFIL (voice-blocs :
// le rendu chez soi, la grammaire des écarts), SAISONS (voice-saisons).
// Jamais « il » ni « elle » pour le joueur : son prénom. Module neutre.

import { nombre } from "@/lib/voice";
import { de } from "@/lib/codex/elision";

/** « 1re », « 5e » : une place (comme le jeton, lib/profil/ecart.ts) */
export const rang = (n: number) => `${nombre(n)}${n === 1 ? "re" : "e"}`;

export const BLOCS_RADAR = {
  // Radar (chez un autre)
  comparer: "Me comparer",
  arreter: "Arrêter",
  /** le bouton grisé de l'aperçu « voir comme les autres » */
  comparerApercu: "Ici, la personne qui regarde peut se comparer",
  /** l'aria-label du radar comparé */
  radarCompare: (nom: string) => `Les 10 matières ${de(nom)}, comparées aux tiennes`,
  /** une étiquette rouge est un lien : « M'entraîner en FI · Inès mène de 14 » */
  entrainer: (code: string, nom: string, points: number) => `M'entraîner en ${code} · ${nom} mène de ${nombre(points)}`,
  matieres: "Matières",

  // Amis (chez un autre : son cercle)
  /** « sur 19 », à droite de la place */
  sur: (n: number) => `sur ${nombre(n)}`,
  /** « Par ELO, dans le cercle d'Inès : Inès 2e · toi 5e sur 19 (si tu en étais) » */
  bulleCercle: (nom: string, lui: number, toi: number | null, taille: number, ami: boolean) =>
    `Par ELO, dans le cercle ${de(nom)} : ${nom} ${rang(lui)}${toi ? ` · toi ${rang(toi)}` : ""} sur ${nombre(taille)}${toi && !ami ? " (si tu en étais)" : ""}`,
  /** « 3 en commun » */
  enCommun: (n: number) => `${nombre(n)} en commun`,
  bulleCommun: (n: number) => `${nombre(n)} ${n > 1 ? "amis" : "ami"} en commun avec toi`,
  /** le point sous un ami commun (l'échelle) */
  amiCommun: "Ami en commun",
  /** l'infobulle d'un avatar : « Léo · 1 520 » */
  pseudo: (nom: string, elo: number | null | undefined) => (elo === null || elo === undefined ? nom : `${nom} · ${nombre(elo)}`),
  toi: "toi",
  /** l'échelle (colonne) : un rang caché entre deux lignes */
  saut: "…",
  /** demi-bande chez soi */
  gerer: "Gérer ›",
  cercle: (nom: string) => `Le cercle ${de(nom)}, par ELO`,
  tesAmis: "Tes amis, par ELO",

  // Folio
  histoire: "L'histoire",
  /** le badge chez un autre : le folio qu'il porte est aussi dans tes pièces, ou pas */
  aToiAussi: "à toi aussi",
  pasAToi: "pas à toi",

  // Saisons (chez un autre)
  /** « Saison 3 » : le nom passe en infobulle */
  saison: (n: number) => `Saison ${nombre(n)}`,
  pasClassee: "Pas classée",
  /** « Pic de saison · Inès Or II, 1 512 · toi Argent I, 1 371 » */
  bullePic: (nom: string, lui: string, eloLui: number, toi: string, eloToi: number) => `Pic de saison · ${nom} ${lui}, ${nombre(eloLui)} · toi ${toi}, ${nombre(eloToi)}`,
  /** « S1 · Or I · 8e sur 230 · toi 41e » */
  bulleGravee: (court: string, palier: string, place: number, joueurs: number | null, toi: number | null) =>
    `${court} · ${palier} · ${rang(place)}${joueurs ? ` sur ${nombre(joueurs)}` : ""}${toi ? ` · toi ${rang(toi)}` : ""}`,
  /** demi-bande chez soi : « pic 1 512 » */
  picElo: (elo: number) => `pic ${nombre(elo)}`,
  sansPic: "pas de match classé",
} as const;
