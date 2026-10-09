// Voix « Le Trait », morceau Social du profil : les tampons, « Depuis ta
// dernière visite », « Du nouveau » sur l'accueil et la carte joueur. Même
// esprit que lib/voice.ts : un mot par chose, toujours le chiffre, pas
// d'emphase. Module neutre (ni « use client » ni serveur).

import { NBSP, nombre, pluriel, signe } from "@/lib/voice";
import type { Tampon } from "@/lib/profil/tampons";

// ---------------------------------------------------------------------------
// Les tampons

/** le mot gravé sur chaque tampon */
export const MOTS: Record<Tampon, string> = {
  bravo: "Bravo",
  respect: "Respect",
  revanche: `Revanche${NBSP}?`,
};

export const TAMPONS = {
  /** sur le profil d'un autre : l'invitation */
  tamponner: "Tamponner",
  /** sur son profil : ce qu'on a reçu */
  recus: "Tampons reçus",
  /** lu à voix haute : « Bravo, 3 tampons. Tamponner. » */
  poser: (mot: string, n: number) => `${mot}, ${pluriel(n, "tampon", "tampons")}. Tamponner`,
  retirer: (mot: string, n: number) => `${mot}, ${pluriel(n, "tampon", "tampons")}, dont le tien. Retirer ton tampon`,
  compte: (mot: string, n: number) => `${mot} : ${pluriel(n, "tampon", "tampons")}`,
  /** une entrée du Journal : ouvrir les trois choix */
  ouvrir: "Tamponner cette entrée",
  fermer: "Fermer les tampons",
  aide: "Un tampon par personne. Toucher le tien le retire.",
  plafond: "30 tampons par jour au plus. La suite demain.",
  erreur: "Le tampon n'a pas pris. Réessaie dans un instant.",
} as const;

// ---------------------------------------------------------------------------
// « Depuis ta dernière visite » (son propre profil)

export const RETOUR = {
  titre: "Depuis ta dernière visite",
  tampons: (n: number) => pluriel(n, "tampon reçu", "tampons reçus"),
  visiteurs: (n: number) => `vu par ${pluriel(n, "joueur", "joueurs")}`,
  elo: (delta: number) => `${signe(delta)}${NBSP}ELO`,
  victoires: (n: number) => pluriel(n, "victoire en duel", "victoires en duel"),
  palier: (palier: string) => `monte en ${palier}`,
  /** la ligne de la semaine, quand rien n'est neuf depuis la visite d'avant */
  semaine: (n: number) => `Vu par ${pluriel(n, "joueur", "joueurs")} cette semaine.`,
  anonyme: "Seulement combien, jamais qui.",
} as const;

// ---------------------------------------------------------------------------
// « Du nouveau » (l'accueil)

export const NOUVEAU = {
  titre: "Du nouveau",
  aide: "Tes amis, sur 7 jours.",
  palier: (palier: string) => `monte en ${palier}`,
  /** « t'a battu 23–19 » */
  victoire: (score: [number, number] | null) => (score ? `t'a battu ${nombre(score[0])}–${nombre(score[1])}` : "t'a battu en duel"),
  depasse: (ecart: number) => `t'a dépassé de ${pluriel(ecart, "point", "points")}`,
  /** lu à voix haute, sur le lien : « Voir le profil de Léa » */
  voir: (nom: string) => `Voir le profil de ${nom}`,
} as const;

// ---------------------------------------------------------------------------
// La carte joueur (au toucher : classement, lobby des duels, amis)

export const CARTE = {
  titre: "Joueur",
  ouvrir: (nom: string) => `Carte de ${nom}`,
  defier: "Défier",
  voir: "Voir le profil",
  voirMoi: "Voir mon profil",
  charge: "La carte arrive.",
  erreur: "La carte n'a pas chargé. Le profil reste là.",
  niveau: (n: number) => `Niv. ${nombre(n)}`,
  placement: (joues: number, total: number) => `placement ${nombre(joues)}/${nombre(total)}`,
  pic: (palier: string) => `pic ${palier}`,
  sansSceau: "Pas encore de sceau.",
  fermer: "Fermer",
} as const;
