// Voix des sous-pages de S'affronter refaites sur le modèle validé par Théo (2026-11-12) : l'en-tête
// commun (EnTeteSousPage), le cadre à zones (CadreZones : la bande noire des titres, l'essentiel à
// gauche, la colonne grise à droite). Les retours, les titres des zones, les lignes des courtes
// listes. Module neutre (ni « use client » ni serveur).

/** Les retours des sous-pages de S'affronter : chacune vers sa vraie page parente. */
export const RETOUR_AFFRONTER = { href: "/classement", label: "S'affronter" } as const;
export const RETOUR_DUEL = { href: "/duel", label: "Duel" } as const;
export const RETOUR_EXAMENS = { href: "/mock-exams", label: "Examens blancs" } as const;
/** /people a rejoint /duel (tant qu'il y a moins de dix joueurs) : le profil d'un joueur revient au duel. */
export const RETOUR_JOUEURS = { href: "/duel", label: "Duel" } as const;
export const RETOUR_SALLES = { href: "/salles", label: "Les Salles" } as const;

export const SOUS_AFFRONTER = {
  duel: {
    titre: "Duel",
    ligne: (n: number, min: number, heures: number) => `${n} questions type examen · ${min} min · à jouer sous ${heures} h`,
    choisir: "Choisis ton adversaire",
    choisirAction: "Choisir un adversaire",
    enCours: "Tes duels en cours",
    enCoursVide: "Aucun duel en cours.",
    defier: (nom: string) => `Défier ${nom}`,
    enjeu: (gagne: string, perd: string) => `${gagne} si tu gagnes · ${perd} si tu perds`,
    hasard: "Au hasard",
    joueur: "Joueur",
    unJoueur: "Un joueur",
    // le face-à-face (2026-11-13) : ta bannière, la sienne, l'ELO en jeu ; /people y est rangé
    tonElo: "Ton ELO",
    formatCourt: (n: number, min: number, heures: number) => `${n} questions · ${min} min · ${heures} h pour jouer`,
    sur: (total: number) => `sur ${total}`,
    pasClasse: "pas encore classé",
    placement: (jouees: number, sur: number) => `placement ${jouees}/${sur}`,
    gagneEtTuPasses: "gagne et tu passes",
    encorePour: (n: number, cible: string) => `encore ${n} pour ${cible}`,
    defisRecus: (n: number) => (n > 1 ? `${n} défis à relever` : "Un défi à relever"),
    vs: "VS",
    face: (a: string, b: string) => `${a} contre ${b}`,
    siGagnes: "si tu gagnes",
    siPerds: "si tu perds",
    reprendreContre: (nom: string) => `Reprendre contre ${nom}`,
    jouerContre: (nom: string) => `Jouer contre ${nom}`,
    releverDefi: (nom: string) => `Relever le défi de ${nom}`,
    voirContre: (nom: string) => `Voir le duel contre ${nom}`,
    hasardOu: "ou un duel au hasard",
    changer: "Changer d'adversaire",
    precedent: "Adversaire précédent",
    suivant: "Adversaire suivant",
    portrait: (nom: string, elo: number, ami: boolean) => `${nom} · ${elo} ELO${ami ? " · ami" : ""}`,
    personne: "Personne à défier pour l'instant.",
    duelsEnCours: "Duels en cours",
    teDefie: (nom: string) => `${nom} te défie`,
    contreNom: (nom: string) => `Contre ${nom}`,
    attente: (nom: string) => `En attente de ${nom}`,
    relever: "Relever",
    jouer: "Jouer",
    reprendre: "Reprendre",
    voir: "Voir",
    autres: (n: number) => `+ ${n} autre${n > 1 ? "s" : ""}`,
    moins: "Replier",
    joueurs: "Joueurs",
    chercher: "Chercher un joueur",
    placeholder: "Un pseudo…",
    resultats: (q: string, n: number) => `« ${q} » · ${n} joueur${n > 1 ? "s" : ""}`,
    aucun: (q: string) => `Personne ne s'appelle « ${q} ».`,
    effacer: "Effacer",
    veutEtreAmi: "veut être ton ami",
    // l'annexe « Joueurs » : tes amis en lignes compactes (le point de présence sur la photo), trois d'abord
    tesAmis: "Tes amis",
    amisEnPlus: (n: number) => `+ ${n}`,
    profilDe: (nom: string) => `Profil de ${nom}`,
    // le point d'un duel en cours, en quelques mots (la ligne de l'annexe)
    etat: {
      aAccepter: (reste?: string | null) => (reste ? `à accepter · ${reste}` : "à accepter"),
      onCherche: "on cherche",
      enAttente: "en attente",
      copieRendue: "copie rendue",
      pasAccepte: "pas encore accepté",
      resultat: "résultat imminent",
      ilJoue: "il joue",
      pasJoue: "pas encore joué",
      aToi: (reste?: string | null) => (reste ? `à toi · ${reste}` : "à toi"),
    },
    apercu: "Aperçu : les boutons ne lancent rien ici.",
    bientotTitre: "Les duels arrivent bientôt",
    bientotTexte: "Dès que la mise en place côté serveur est faite, tu pourras défier un joueur au hasard ou un ami, et ton ELO bougera enfin.",
    // /duel/[id] : l'en-tête de la séance
    contre: (nom: string) => `Contre ${nom}`,
    auHasard: "Duel au hasard",
    format: (n: number, min: number) => `${n} questions · ${min} min`,
    expire: (reste: string) => `Expire dans ${reste}`,
    revue: "Revoir la partie",
    resultat: "Résultat du duel",
    leDuel: "Le duel",
  },
  examens: {
    titre: "Examens blancs",
    prochain: "Le prochain examen",
    ouvrir: "Ouvrir un examen",
    vide: "Aucun examen blanc au calendrier.",
    classement: "Le classement",
    classementVide: "Personne au classement pour l'instant.",
    toi: "Toi",
    elo: (elo: number) => `${elo} ELO`,
    // /mock-exams/[id]
    classementExamen: "Le classement",
    pct: (pct: number) => `${pct} %`,
    inscription: "Réserve ta place",
    clos: "Cet examen est clos.",
  },
  joueurs: {
    titre: "Joueurs",
    trouver: "Trouve un joueur",
    ouvrir: "Ouvrir le profil d'un joueur",
    placeholder: "Un pseudo…",
    chercher: "Chercher",
    amis: "Tes amis",
    amisVide: "Pas encore d'amis. Ouvre le profil d'un joueur et ajoute-le.",
    amisBientot: "Les amis arrivent bientôt.",
    envoyees: "Demandes envoyées",
  },
  salles: {
    ligne: "Des parties à plusieurs, en direct.",
    choisir: "Choisis ta salle",
    ouvrir: "Ouvrir une salle",
    aucune: "Aucune salle pour l'instant. Crée la première.",
    rejoindreOuCreer: "Rejoindre ou créer",
  },
} as const;
