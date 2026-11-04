// Voix « Le Trait », morceau Social du profil : « Du nouveau » sur l'accueil et la carte joueur. Même
// esprit que lib/voice.ts : un mot par chose, toujours le chiffre, pas
// d'emphase. Module neutre (ni « use client » ni serveur).

import { NBSP, nombre, pluriel, signe } from "@/lib/voice";

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
