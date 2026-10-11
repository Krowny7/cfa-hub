import { pluriel } from "@/lib/voice";

// La voix des pages d'épreuve refaites (refonte des pages) : Le Pupitre (les
// 30 du jour), La Lice (le lobby des duels), La Grande Salle (les examens
// blancs) et le départ minimal des épreuves courtes (séries éclair, 5 du
// jour). Les phrases se composent à partir des données du moment : aucun nom
// ni chiffre écrit en dur.

/** Le Pupitre : /defi (les 30 du jour). */
export const PUPITRE = {
  nom: "Le Pupitre",
  sousTitre: (n: number, min: number) => `Les ${n} du jour · ${min} min · une seule copie`,
  commencer: "Commencer l'épreuve",
  revoir: "Revoir ta copie",
  etatTodo: (reste: string | null, enCours: number) =>
    `${reste ? `Ouvert jusqu'à minuit : ${reste}.` : "Ouvert jusqu'à minuit."}${enCours > 0 ? ` ${pluriel(enCours, "joueur compose", "joueurs composent")} en ce moment.` : ""}`,
  etatDone: "Ta copie est rendue. Prochaine épreuve demain matin ; le classement se fige à minuit.",
  // le héros
  objectif: "Ton objectif du jour",
  copieDuJour: "Ta copie du jour",
  podium: (score: number) => `${score} pour le podium.`,
  podiumLibre: "Le podium est à prendre.",
  rendu: (score: number, total: number, rang: string | null, joueurs: number) => `${score}/${total}${rang ? `, ${rang} sur ${joueurs}` : ""}.`,
  microTodo: (moyenne: number | null, total: number, copies: number) =>
    [moyenne !== null ? `Ta moyenne ${moyenne}/${total}` : null, copies > 0 ? pluriel(copies, "copie rendue", "copies rendues") : null, "se fige à minuit"].filter(Boolean).join(" · "),
  conseilTodo: (moyenne: number, total: number, podium: number | null) => {
    const base = `Tu tournes à ${moyenne}/${total} de moyenne.`;
    if (podium === null) return `${base} Personne n'a encore rendu sa copie : le podium t'attend.`;
    const ecart = podium - moyenne;
    return ecart > 0 ? `${base} Il te faut ${pluriel(ecart, "point", "points")} de plus que d'habitude pour monter sur le podium.` : `${base} Joue comme d'habitude et le podium est à toi.`;
  },
  conseilVide: "Une copie de 30 questions, 45 minutes, sans retour en arrière. Le podium se dessine avec les premières copies.",
  conseilDone: (rang: number | null, manque: number | null, erreurs: number) =>
    `${rang !== null && rang <= 3 ? "Tu es sur le podium. " : manque && manque > 0 ? `Il te manquait ${pluriel(manque, "point", "points")} pour le podium. ` : ""}${erreurs > 0 ? `Tes ${erreurs} erreurs sont dans le carnet de ratures.` : "Aucune erreur : rien à noter au carnet de ratures."}`,
  tout: "Tout le classement",
  podiumTitre: "Le podium, pour l'instant",
  // les tuiles
  autreDefi: (reste: string | null) => `L'autre défi du jour${reste ? ` · ${reste}` : ""}`,
  cinq: "Les 5 du jour",
  cinqLigne: (rendues: number, meilleur: number | null, total: number) =>
    rendues > 0 ? `${pluriel(rendues, "copie rendue", "copies rendues")}${meilleur !== null ? ` · la meilleure : ${meilleur}/${total}` : ""}` : "Personne n'a encore rendu sa copie : lance-toi.",
  cinqLigneNeutre: "Les mêmes 5 questions pour tout le monde, avec classement.",
  eclair: "Séries éclair",
  eclairSur: "À volonté",
  eclairLigne: (aujourdhui: number | null) =>
    `5 questions de cours, sans calcul.${aujourdhui !== null && aujourdhui > 0 ? ` ${pluriel(aujourdhui, "série", "séries")} aujourd'hui.` : ""}`,
  eclairLancer: "Lancer une série",
  // la bande vers le duel
  duelTitre: "La même épreuve, contre quelqu'un",
  duelLigne: "Un duel : 30 questions, 45 min, à jouer sous 48 h. C'est lui qui fait bouger ton ELO.",
  duelAction: "Trouver un adversaire",
  // les liens
  liensLabel: "Autour du défi",
  copiesPassees: "Tes copies passées",
  copiesPasseesDesc: "Chaque jour joué se revoit, question par question.",
  jours: (n: number) => pluriel(n, "jour", "jours"),
  examens: "Examens blancs",
  examensDesc: "90 questions, comme le jour J, avec classement.",
  classement: "Classement général",
  classementDesc: "Ton rang, toutes épreuves confondues.",
  // le bas de page
  classementDuJour: "Le classement du jour",
  seFige: "se fige à minuit",
  voirCopies: (n: number) => `Voir les ${n} copies`,
};

/** La Lice : /duel (le lobby). */
export const LICE = {
  nom: "La Lice",
  sousTitre: "Un adversaire de ton niveau, au hasard",
  etat: (n: number, min: number, enjeu: string) => `Même épreuve pour les deux : ${n} questions, ${min} min. Enjeu : ${enjeu}.`,
  enjeuHasard: (gagne: string, perd: string) => `${gagne} si tu gagnes, ${perd} si tu perds`,
  // le héros : défi reçu
  recu: (reste: string | null) => `Défi reçu${reste ? ` · expire dans ${reste}` : ""}`,
  recuMicro: (elo: number | null, joue: boolean) => [elo !== null ? `${elo} ELO` : null, joue ? "il a déjà rendu sa copie" : null].filter(Boolean).join(" · "),
  recuEnjeu: (gagne: string, perd: string, reste: string | null) =>
    `Enjeu : ${gagne} si tu gagnes, ${perd} si tu perds.${reste ? ` Tu joues quand tu veux sous ${reste}.` : ""}`,
  accepter: "Accepter et jouer",
  refuser: "Refuser",
  autres: "Tes autres duels en cours",
  autresVide: "Aucun autre duel en cours.",
  // le héros : à toi de jouer
  aToi: (reste: string | null) => `À toi de jouer${reste ? ` · sous ${reste}` : ""}`,
  contre: (nom: string) => `Contre ${nom}`,
  aToiTexte: "Il a joué, il attend ta copie.",
  jouer: "Jouer",
  // le héros : rien d'urgent
  rang: "Ton rang en duel",
  rangMicro: (n: number) => `ELO · ${pluriel(n, "duel joué", "duels joués")}`,
  rangTexte: (net: number | null, n: number) =>
    net === null ? "Lance un duel au hasard : l'enjeu est affiché avant de jouer." : `Net ${net > 0 ? "+" : ""}${net} sur ${pluriel(n, "dernier duel", "derniers duels")}.`,
  derniers: "Tes derniers duels",
  classement: "Ton classement",
  // la ligne du téléphone
  teDefie: (nom: string) => `${nom} te défie`,
  repondre: "Répondre",
  // les tuiles
  defier: "Défier quelqu'un",
  defierSur: "Choisis ton adversaire",
  chercher: "Chercher un joueur",
  tousJoueurs: "Tous les joueurs",
  aRevoir: "À revoir",
  aRevoirSur: (jours: number) => `Revue ouverte ${jours} jours`,
  aRevoirLigne: (n: number) => (n > 0 ? `${pluriel(n, "duel terminé", "duels terminés")}, à revoir côte à côte.` : "Aucun duel à revoir pour l'instant."),
  revoirContre: (nom: string) => `Revoir contre ${nom}`,
  // la bande vers le défi
  defiTitre: "Les 30 du jour",
  defiLigne: (copies: number | null) => `La même épreuve pour tout le monde, une copie par jour.${copies && copies > 0 ? ` ${pluriel(copies, "copie rendue", "copies rendues")} aujourd'hui.` : ""}`,
  defiAction: "Voir le défi",
  // les liens
  liensLabel: "Autour des duels",
  joueurs: "Tous les joueurs",
  joueursDesc: "Cherche un pseudo, vois qui est en ligne.",
  classementDesc: "Où te place ton ELO, division par division.",
  revoirDuels: "Duels à revoir",
  revoirDesc: (jours: number) => `Ta copie face à la sienne, ${jours} jours.`,
};

/** La Grande Salle : /mock-exams. */
export const SALLE = {
  nom: "La Grande Salle",
  kicker: "Examens blancs",
  titre: "Comme le jour J.",
  // le héros
  progression: "Ta progression · examens blancs",
  titreScore: (score: number, total: number, mois: string) => `${score}/${total} en ${mois}`,
  micro: (pct: number, rang: number | null, joueurs: number, elo: number | null) =>
    [`${pct} %`, rang !== null ? `${rang === 1 ? "1er" : `${rang}e`} sur ${joueurs}` : null, elo !== null ? `${elo > 0 ? "+" : ""}${elo} ELO` : null].filter(Boolean).join(" · "),
  ecart: (points: number, mois: string) =>
    points > 0 ? `${pluriel(points, "point", "points")} de mieux qu'en ${mois}.` : points < 0 ? `${pluriel(-points, "point", "points")} de moins qu'en ${mois}.` : `Autant qu'en ${mois}.`,
  premier: "Ta première copie d'examen blanc. La suivante te dira si tu progresses.",
  aTravailler: (matiere: string) => `À travailler avant le prochain : ${matiere}, la matière qui t'a coûté le plus.`,
  faibles: "Tes matières les plus faibles",
  revoirCopie: "Revoir ta copie",
  // sans copie rendue
  debutTitre: "Ton premier examen blanc.",
  debutMicro: "Aucune copie rendue pour l'instant",
  debutTexte: "90 questions au format de l'examen, chronométrées. Ton score, ta place et tes matières faibles s'afficheront ici dès la première copie.",
  // la carte lieu
  etatOuvre: (jours: number, jour: string) => (jours <= 0 ? `Ouvre aujourd'hui, le ${jour}.` : jours === 1 ? `Ouvre demain, le ${jour}.` : `Ouvre dans ${pluriel(jours, "jour", "jours")}, le ${jour}.`),
  etatOuvert: (jour: string) => `Ouvert jusqu'au ${jour}.`,
  etatFini: "La fenêtre est terminée.",
  etatPrepa: "En préparation.",
  inscrit: "Tu es inscrit.",
  // la tuile suivante
  ensuite: (jours: number) => (jours <= 0 ? "Ensuite · aujourd'hui" : jours === 1 ? "Ensuite · demain" : `Ensuite · dans ${pluriel(jours, "jour", "jours")}`),
  inscrire: "Je m'inscris",
  // la bande
  bandeTitre: "D'ici là, les 30 du jour",
  bandeLigne: "30 questions, 45 min, chaque jour : le format de l'examen, en plus court.",
  bandeAction: "Voir le défi",
  // les liens
  liensLabel: "Autres épreuves",
  officiels: "Examens officiels",
  officielsDesc: "Les sessions officielles, rejouées question par question.",
  examen: "Mode examen",
  examenDesc: "Compose ton examen à partir des QCM, chrono compris.",
  classement: "Classement",
  classementDesc: "Ce que tes examens blancs ont fait à ton ELO.",
};

/** Le départ minimal des épreuves courtes (séries éclair, 5 du jour). */
export const DEPART = {
  eclair: {
    kicker: (n: number) => `Séries éclair · ta ${n === 1 ? "1re" : `${n}e`} aujourd'hui`,
    titre: "5 questions, 2 minutes.",
    lancer: "Lancer la série",
    promesses: [
      ["Questions de cours", ", sans calcul, tirées pour toi."],
      ["Correction tout de suite", ", question par question."],
      ["Tes erreurs", " partent dans ton carnet de ratures."],
    ] as [string, string][],
    aSaVolonte: "À volonté",
    resume: (aujourdhui: number, pct: number | null) =>
      [aujourdhui > 0 ? `Aujourd'hui : ${pluriel(aujourdhui, "série rendue", "séries rendues")}` : null, pct !== null ? `${pct} % sur tes 20 dernières séries` : null].filter(Boolean).join(" · "),
  },
  cinq: {
    kicker: "Les 5 du jour",
    titre: "5 questions, 2 minutes.",
    lancer: "Lancer les 5 du jour",
    promesses: [
      ["Les mêmes 5 questions", " pour tout le monde, une seule copie par jour."],
      ["Correction tout de suite", " une fois la copie rendue."],
      ["Ta place au classement", " du jour, et tes erreurs au carnet de ratures."],
    ] as [string, string][],
  },
  retour: "S'entraîner",
  lienCinq: (statut: string) => `Les 5 du jour : ${statut}`,
  lienCinqSous: (reste: string | null) => `Les mêmes 5 pour tout le monde, avec classement${reste ? ` · ${reste}` : ""}`,
  lienEclair: "Séries éclair",
  lienEclairSous: "5 questions de cours, à volonté, rien que pour toi",
};
