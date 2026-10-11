// La voix de l'accueil « Le rendez-vous » (components/accueil/Rendezvous.tsx).
// Le mot « défi » est réservé aux duels : les 30 du jour sont une copie qu'on
// rend. Les autres phrases de l'accueil restent dans lib/voice.ts et
// lib/voice-z1.ts.

export const RDV = {
  trente: {
    nom: "Les 30 du jour",
    sousTitre: "Le même sujet pour tous, une copie par jour",
    joueurs: "Joueurs aujourd'hui",
    meilleure: "Meilleure copie",
    seFige: "Se fige",
    ceSoir: "ce soir",
    rendre: "Rendre ma copie",
    repondues: "Répondues",
    tonScore: "Ta copie",
    tonRang: "Ton rang",
  },
  duel: {
    lancer: "Lance un duel",
    lancerLigne: "Trente questions contre un ami, le classement bouge",
  },
  rang: {
    pasClasse: "Pas encore classé",
    voir: "Voir le classement",
    lancer: "Lancer un duel",
  },
  liens: {
    label: "Le reste de ta journée",
    pointFaible: "Ton point faible",
    pointFaibleAtelier: "l'Atelier t'attend",
    pointFaibleEnCours: "ton Atelier est en cours",
    pointFaibleVide: "Il se dessine avec tes réponses",
    cours: "Écouter le cours",
    coursVide: "Les cours complets, en audio",
    amis: "Tes amis",
    amisLigne: "Défie-les, suis leurs séries",
  },
  liste: {
    aTonTour: "à toi le trait",
    aTerminer: "à terminer",
    repondre: "répondre",
    inscrit: "inscrit",
    inscris: "inscris-toi",
  },
} as const;
