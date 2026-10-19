// Les textes des blocs Radar, Amis, Folio et Saisons de la page de profil
// (components/profil/blocs/Radar.tsx, Amis.tsx, Folio.tsx, Saisons.tsx).
// Seul le Radar garde une comparaison (« Me comparer ») ; les trois autres
// montrent la même chose chez soi et chez un autre, sans « toi ». Ceux qui
// existent déjà ne sont pas recopiés : BLOCS_PROFIL (voice-blocs), SAISONS
// (voice-saisons). Jamais « il » ni « elle » pour le joueur : son prénom.
// Module neutre.

import { nombre } from "@/lib/voice";
import { de } from "@/lib/codex/elision";

/** « 1re », « 5e » : une place */
export const rang = (n: number) => `${nombre(n)}${n === 1 ? "re" : "e"}`;

export const BLOCS_RADAR = {
  // Radar (la comparaison reste ici)
  comparer: "Me comparer",
  arreter: "Arrêter",
  /** le bouton grisé de l'aperçu « voir comme les autres » */
  comparerApercu: "Ici, la personne qui regarde peut se comparer",
  /** l'aria-label du radar comparé */
  radarCompare: (nom: string) => `Les 10 matières ${de(nom)}, comparées aux tiennes`,
  /** une étiquette rouge est un lien : « M'entraîner en FI · Inès mène de 14 » */
  entrainer: (code: string, nom: string, points: number) => `M'entraîner en ${code} · ${nom} mène de ${nombre(points)}`,
  matieres: "Matières",
  /** le titre du radar */
  statistiques: "Statistiques",
  /** le podium : ses trois matières les plus sûres (chez soi : T.tesPlusSures) */
  sesPlusSures: "Ses plus sûres",
  /** l'infobulle d'une puce du podium : « 1re : Financial Statement Analysis, 82 % » */
  puce: (place: number, matiere: string, valeur: string) => `${rang(place)} : ${matiere}, ${valeur} %`,

  // Amis (le nombre et la pile)
  /** « amis » sous le nombre */
  amisMot: (n: number) => (n > 1 ? "amis" : "ami"),
  /** « 6e » de son cercle (la ligne sous le nombre) */
  deSonCercle: (moi: boolean) => (moi ? "de ton cercle par ELO" : "de son cercle par ELO"),
  /** la cellule de la demi-bande : « 6e de son cercle » */
  deSonCercleCourt: (place: number, moi: boolean) => `${rang(place)} ${moi ? "de ton cercle" : "de son cercle"}`,
  /** « Par ELO, dans le cercle d'Inès : 6e sur 25 » */
  bulleCercle: (nom: string, place: number, taille: number) => `Par ELO, dans le cercle ${de(nom)} : ${rang(place)} sur ${nombre(taille)}`,
  /** la pastille de la pile : « +17 » ; son libellé : « et 17 autres » */
  pastille: (n: number) => `+${nombre(n)}`,
  autres: (n: number) => `et ${nombre(n)} autre${n > 1 ? "s" : ""}`,
  /** l'infobulle d'un avatar : « Léo · 1 520 » */
  pseudo: (nom: string, elo: number | null | undefined) => (elo === null || elo === undefined ? nom : `${nom} · ${nombre(elo)}`),
  /** demi-bande chez soi */
  gerer: "Gérer ›",
  cercle: (nom: string) => `Le cercle ${de(nom)}, par ELO`,
  tesAmis: "Tes amis, par ELO",

  // Folio (au musée)
  histoire: "L'histoire",
  /** la ligne du cartel : l'auteur de la planche */
  auteur: "Léonard de Vinci",

  // Saisons (les écussons)
  /** « Saison 3 » : le nom passe en infobulle */
  saison: (n: number) => `Saison ${nombre(n)}`,
  pasClassee: "Pas classée",
  /** « S1 · Or I · 8e sur 230 » */
  bulleGravee: (court: string, palier: string, place: number, joueurs: number | null) => `${court} · ${palier} · ${rang(place)}${joueurs ? ` sur ${nombre(joueurs)}` : ""}`,
  /** sous un écusson : « 19e / 168 » */
  placeSur: (place: number, joueurs: number | null) => `${rang(place)}${joueurs ? ` / ${nombre(joueurs)}` : ""}`,
  /** l'infobulle de la saison en cours : « Saison 3 · Mai 2027 · en cours, pic Platine II » */
  bulleCourante: (saison: string, pic: string | null) => `${saison} · en cours${pic ? `, pic ${pic}` : ", pas de match classé"}`,
  /** demi-bande : « pic 1 512 » */
  picElo: (elo: number) => `pic ${nombre(elo)}`,
  sansPic: "pas de match classé",
} as const;
