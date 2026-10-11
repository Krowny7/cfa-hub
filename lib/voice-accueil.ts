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
    chrono: "Chrono",
    /** « Se fige dans 3 h » : timeLeftLabel dit « encore 3 h », on dit « dans 3 h » */
    dans: "dans",
  },
  cinq: {
    nom: "Les 5 du jour",
    sousTitre: "5 questions de cours, sans calcul, deux minutes",
    duree: "≈ 2 min",
    jouer: "Jouer les 5 du jour",
    revoir: "Revoir mes 5",
  },
  traits: {
    nom: "Tes traits du jour",
    gagner: "Tracer des traits",
  },
  reprise: {
    titre: "Reprendre",
    classement: "Classement du jour",
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

/** Le vainqueur du jour : la meilleure copie des 30 d'hier, sous Les 30 du jour (components/accueil/VainqueurDuJour.tsx). */
export const VAINQUEUR = {
  sur: "Vainqueur des 30 d'hier",
  toi: "Toi",
  /** « devant 13 joueurs » : le gagnant n'est pas compté ; seul, il le dit */
  devant: (joueurs: number) => (joueurs <= 1 ? "seul en lice" : `devant ${joueurs - 1} ${joueurs - 1 === 1 ? "joueur" : "joueurs"}`),
  /** « 31 min 42 s » (sous l'heure), « 1 h 02 » sinon */
  duree: (secondes: number) => {
    const s = Math.max(0, Math.floor(secondes));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min ${String(s % 60).padStart(2, "0")} s`;
  },
  classement: (jour: string) => `Classement du ${jour}`,
  aria: (nom: string, score: string, jour: string) => `Vainqueur des 30 d'hier : ${nom}, ${score}. Voir le classement du ${jour}`,
} as const;
