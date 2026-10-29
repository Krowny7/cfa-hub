// La voix de la refonte de /classement (« Ton rang ») et de /people
// (« L'annuaire »). Les autres phrases restent dans lib/voice-z2a.ts.

export const CL = {
  kicker: (domaine: string) => `S'affronter · ${domaine}`,
  titre: "Se mesurer aux autres",
  tonRang: (domaine: string) => `Ton rang · ${domaine}`,
  autour: "Autour de toi",
  /** « +112 ELO en 10 parties » */
  bilan: (signe: string, n: number) => `${signe} ELO en ${n} ${n > 1 ? "parties" : "partie"}`,
  plusQue: (phrase: string) => `Plus que ${phrase}.`,
  releverDefi: (nom: string) => `Relever le défi de ${nom}`,
  defier: (nom: string) => `Défier ${nom}`,
  tAdefie: (nom: string, quand: string) => `${nom} t'a défié ${quand}.`,
  devant: (nom: string, ecart: number) => `${nom} est ${ecart} ELO devant toi.`,
  enCours: "Duels en cours",
  aRevoir: "À revoir",
  aucunEnCours: "Aucun duel en cours",
  enCoursVideLigne: "Tes défis envoyés s'affichent ici.",
  pasEncoreJoue: (nom: string) => `${nom} n'a pas encore joué`,
  defiEnvoye: (quand: string) => `Défi envoyé ${quand}.`,
  contre: (nom: string) => `Contre ${nom}`,
  partieOuverte: "Ta partie est ouverte : reprends-la quand tu veux.",
  reprendre: "Reprendre",
  aRelire: (n: number) => `${n} ${n > 1 ? "duels" : "duel"} à relire`,
  rienARevoir: "Rien à revoir",
  aRevoirLigne: (jours: number) => `Tes erreurs de duel restent ouvertes ${jours} jours après chaque partie.`,
  revoirDuels: "Revoir mes duels",
  salle: "La Grande Salle",
  salleSous: (questions: number, duree: string) => `L'examen classé · ${questions} questions · ${duree}`,
  salleVideSous: "L'examen classé",
  voirExamens: "Voir les examens",
  jeMinscris: "Je m'inscris",
  passer: "Passer l'examen",
  inscritVoir: "Inscrit · voir",
  voirExamen: "Voir l'examen",
  ilFaitBouger: "Il fait bouger ton ELO comme un duel.",
  dernierExamen: (score: string, delta: string | null) => `Dernier examen : ${score}${delta ? ` · ${delta} ELO` : ""}.`,
  trouver: "Trouver un adversaire",
  trouverLigne: "Cherche un pseudo, ajoute des amis, défie qui tu veux.",
  /** la bande de recherche : le champ et son bouton */
  trouverChamp: "Pseudo d'un joueur",
  trouverEnvoi: "Chercher",
  suggestions: "Joueurs trouvés",
  aucunJoueur: "Aucun joueur à ce pseudo.",
  general: "Classement général",
  courbe: "Ta courbe",
  courbeDepuis: (signe: string, date: string) => `${signe} ELO depuis le ${date}`,
  courbeHint: (parties: string) => `${parties} · duels et examens`,
  /** la carte « Duels » (partie à reprendre, défi envoyé, duels à relire) */
  duels: "Duels",
  enAttente: "En attente",
  /** l'état d'une barre de progression vers le palier suivant */
  barrePalier: (elo: string, palier: string, cible: string) => `${elo} ELO sur ${cible} pour ${palier}`,
  /** « Léa est 12 ELO devant toi. » en trois morceaux (l'écart se pose sur le surligneur) */
  devantMilieu: "est",
  devantFin: "devant toi.",
  diptyque: "Ton rang et La Grande Salle",
  rangDomaine: "Ton rang",
  /** le grand classement en onglets */
  generalLabel: "Le classement général",
  generalSous: (joueurs: string, domaine: string) => `${joueurs} · ${domaine}`,
  rangsPlacementHint: "Ta place se dessine pendant le placement.",
} as const;

/** Les cinq onglets du classement général (clés = ?onglet=). */
export const ONGLETS_CLASSEMENT = [
  { key: "classement", label: "Classement" },
  { key: "amis", label: "Amis" },
  { key: "courbe", label: "Ta courbe" },
  { key: "rangs", label: "Les 8 rangs" },
  { key: "regles", label: "Comment ça marche" },
] as const;

/** L'onglet « Amis » du classement général. */
export const AMIS = {
  /** « 6 amis » */
  nombre: (n: number) => `${n} ${n > 1 ? "amis" : "ami"}`,
  enLigne: (n: number) => `${n} en ligne`,
  /** « tu es 3e parmi eux » : l'ordinal se glisse entre les deux */
  tuEs: "tu es",
  parmiEux: "parmi eux",
  ajouter: "Ajouter un ami",
  colPlace: "Place",
  colAmi: "Ami",
  colRang: "Rang",
  colElo: "ELO",
  defier: "Défier",
  defierNom: (nom: string) => `Défier ${nom}`,
  toi: "toi",
  placement: "Placement",
  videTitre: "Pas encore d'amis",
  videTexte: "Ajoute des joueurs : tu les retrouveras ici, avec leur place, leur rang et un bouton pour les défier.",
  chercher: "Chercher un joueur",
  suivants: (n: number) => `Voir les ${n} suivants`,
  replier: "Replier",
  liste: "Tes amis, classés par place générale",
  horsLigne: "hors ligne",
} as const;

export const PJ = {
  kicker: "S'affronter · Joueurs",
  titre: "Trouver qui défier",
  annuaire: (domaine: string) => `L'annuaire · ${domaine}`,
  joueurs: (n: number) => `${n} ${n > 1 ? "joueurs" : "joueur"}`,
  placeholder: "Un pseudo…",
  aTaMesure: "À ta mesure",
  veutEtreAmi: "veut être ton ami",
} as const;

/**
 * La carte « Ton plus grand rival » : le joueur le plus croisé, toutes
 * épreuves confondues (components/classement/rival.ts). Le verdict et les
 * lignes disent le nom plutôt que « il » : le rival peut être une joueuse.
 */
export const RIVAL = {
  titre: "Ton plus grand rival",
  sous: "Le joueur que tu as le plus croisé, toutes épreuves confondues.",
  /** « Croisé 23 fois » : le nombre se pose sur le surligneur, entre les deux */
  croise: "Croisé",
  fois: "fois",
  /** « Tu mènes 14–9 », « Léa mène 14–9 », « À égalité 9–9 » : le score du meneur d'abord */
  verdict: (nom: string, moi: number, lui: number) => (moi > lui ? `Tu mènes ${moi}–${lui}` : lui > moi ? `${nom} mène ${lui}–${moi}` : `À égalité ${moi}–${lui}`),
  epreuves: "Le détail par épreuve",
  /** les quatre épreuves où l'on se croise */
  duel: "Duels",
  trente: "Défi du jour (les 30)",
  cinq: "Les 5 du jour",
  examen: "Examens blancs",
  /** « 4–2 pour toi », « 2–4 pour Léa », « 3–3, égalité » ; les égalités s'ajoutent : « · 1 nul » */
  ligne: (moi: number, lui: number, nom: string) => (moi > lui ? `${moi}–${lui} pour toi` : lui > moi ? `${moi}–${lui} pour ${nom}` : `${moi}–${lui}, égalité`),
  nuls: (n: number) => `${n} ${n > 1 ? "nuls" : "nul"}`,
  profil: "Profil",
  niveau: (n: number) => `Niveau ${n}`,
  placement: "Placement",
  carte: (nom: string) => `Ton plus grand rival : ${nom}`,
} as const;

/** Les 10 matières du programme, en libellés courts (la maquette : « Corporate Issuers », « Portfolio Management »). */
export const MATIERES_COURTES: Record<string, string> = {
  ethics: "Ethics",
  quant: "Quant",
  economics: "Economics",
  fsa: "FSA",
  corporate: "Corporate Issuers",
  equity: "Equity",
  fixed_income: "Fixed Income",
  derivatives: "Derivatives",
  alternatives: "Alternatives",
  portfolio: "Portfolio Management",
};

/** Réponses minimum dans une matière (séances ciblées) pour être classé parmi ses maîtres. */
export const SEUIL_MAITRE = 20;

/** La carte « Les maîtres de chaque matière ». */
export const MAITRES = {
  titre: "Les maîtres de chaque matière",
  sous: (seuil: number) => `Le meilleur en maîtrise dans chacune des 10 matières, classé dès ${seuil} réponses.`,
  cestToi: "C'est toi",
  /** « toi 3e · 68 % » */
  toi: (place: string, pct: string) => `toi ${place} · ${pct}`,
  toiSansPlace: "toi · non classé",
  pasDeMaitre: "Pas encore de maître",
  /** l'infobulle quand tu n'es pas classé : « Il faut 20 réponses dans la matière pour être classé (tu en as 12). » */
  pasClasse: (seuil: number, n: number) => `Il faut ${seuil} réponses dans la matière pour être classé (tu en as ${n}).`,
  liste: "Un maître par matière",
} as const;
