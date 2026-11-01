// Les textes de la carte « En ce moment dans le lobby » de l'accueil
// (components/accueil/lobby/EnDirect.tsx) et du personnage du vainqueur.
// Fichier à part des autres cartes de l'accueil : le lot d'assemblage peut le
// laisser ici ou l'ajouter à la voix de l'accueil (lib/voice-accueil.ts), sans
// rien changer d'autre.
// Tutoiement, nombres à l'espace insécable (lib/voice.ts : nombre). Une phrase à
// passages en gras est une liste de segments (lib/voice-moi.ts : Segment) :
// une chaîne simple, ou `{ b }` en gras.

import type { Segment } from "@/lib/voice-moi";

/** Le genre d'un fait de la liste. */
export type GenreFait = "trente" | "cinq" | "duel";

export const DIRECT = {
  titre: "En ce moment dans le lobby",
  /** libellé de la liste des chiffres (lecteurs d'écran) */
  chiffres: "Les chiffres du lobby",
  /** libellé de la liste des faits récents (lecteurs d'écran) */
  fil: "Ce qui vient de se passer",
  enLigne: (n: number) => (n > 1 ? "joueurs en ligne" : "joueur en ligne"),
  duels: (n: number) => (n > 1 ? "duels en cours" : "duel en cours"),
  copies: (n: number) => (n > 1 ? "copies des 30 rendues dans l'heure" : "copie des 30 rendue dans l'heure"),
  /** quand un joueur sans pseudo n'a que son identifiant court */
  inconnu: "Un joueur",
  /**
   * Une ligne du fil. `qui` : le prénom (ou le pseudo) du joueur ; `toi` : c'est
   * toi, la phrase se dit alors à la deuxième personne. `score` : « 28/30 ».
   */
  fait: (genre: GenreFait, qui: string, toi: boolean, score: string): Segment[] => {
    if (genre === "trente") return toi ? ["Tu viens de rendre ta copie : ", { b: score }] : [`${qui} vient de rendre sa copie : `, { b: score }];
    if (genre === "cinq") return toi ? ["Tu as fait ", { b: score }, " aux 5 du jour"] : [`${qui} a fait `, { b: score }, " aux 5 du jour"];
    return toi ? ["Tu as gagné un duel"] : [`${qui} a gagné un duel`];
  },
};
