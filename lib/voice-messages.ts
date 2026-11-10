// La voix des messages entre amis (components/messages/MessagesAmis.tsx). Tutoiement, phrases courtes.

export const MESSAGES = {
  bouton: "Messages",
  boutonAria: (n: number) => (n > 0 ? `Messages, ${n} non ${n > 1 ? "lus" : "lu"}` : "Messages"),
  titre: "Tes amis",
  retour: "Retour à tes amis",
  fermer: "Fermer",
  aucun: "Pas encore de message. Écris le premier.",
  champ: "Ton message…",
  envoyer: "Envoyer",
  envoiRate: "Message pas parti. Réessaie.",
  chargement: "Chargement…",
  chargementRate: "Conversation pas chargée. Ferme et rouvre.",
  toi: "Toi",
  vu: "Vu",
  nouveau: (nom: string) => `${nom} t'écrit`,
  ouvrir: "Ouvrir la conversation",
  joueur: "Un joueur",
} as const;
