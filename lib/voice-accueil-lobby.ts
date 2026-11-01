// La voix de l'accueil « Le lobby » (components/accueil/lobby), lot 1 : le
// socle (l'en-tête, les 30 du jour et leur classement, les 5 du jour, les
// traits du jour, le vainqueur d'hier, le rang et la phase de révision).
// Mêmes règles de voix que le reste du site (« Le Trait ») : le mot « défi »
// est réservé aux duels, les 30 du jour sont une copie qu'on rend ; un mot par
// chose, toujours le chiffre, jamais de point d'exclamation. Un module par lot
// (-direct, -rival, -carte, -parcours). Module neutre (ni « use client » ni
// serveur) : il se charge aussi dans un îlot client.

import { NBSP, nombre } from "@/lib/voice";

const pluriel = (n: number, un: string, plusieurs: string) => `${nombre(n)} ${n > 1 ? plusieurs : un}`;

/** « 11 min 40 » sous l'heure, « 1 h 02 » sinon (le temps d'une copie, en abrégé). */
export function minutesSecondes(secondes: number): string {
  const s = Math.max(0, Math.floor(secondes));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}${NBSP}h${NBSP}${String(m).padStart(2, "0")}` : `${m}${NBSP}min${NBSP}${String(s % 60).padStart(2, "0")}`;
}

export const LOBBY = {
  entete: {
    bonRetour: (nom: string | null) => (nom ? `Bon retour, ${nom}` : "Bon retour"),
    bienvenue: (nom: string | null) => (nom ? `Bienvenue, ${nom}` : "Bienvenue"),
    avant: "avant l'examen",
    jourJ: "Jour J",
    passe: "Examen passé",
    fixer: "Fixe ton jour J",
    /** la page des réglages, à l'ancre de l'objectif */
    fixerHref: "/moi?onglet=reglages#objectif",
  },

  /** la carte héros : les 30 du jour (ou, à défaut, les 5 du jour) */
  defi: {
    trente: {
      surTitre: "Le défi phare",
      titre: "Les 30 du jour",
      sous: "Le même sujet pour tous, une seule copie par jour, un classement du jour.",
      rendre: "Rendre ma copie",
      reprendre: "Reprendre ma copie",
      revoir: "Revoir ma copie",
    },
    cinq: {
      surTitre: "Défi éclair",
      titre: "Les 5 du jour",
      sous: "5 questions de cours, sans calcul, deux minutes.",
      rendre: "Jouer les 5 du jour",
      reprendre: "Reprendre mes 5",
      revoir: "Revoir mes 5",
    },
    /** l'état, après la date : « Samedi 1er novembre · à rendre » */
    etat: { todo: "à rendre", playing: "copie en cours", done: "copie rendue" },
    /** la puce : « Se fige dans 5 h » */
    seFige: (reste: string | null) => (reste ? `Se fige dans ${reste}` : "Se fige ce soir"),
    tuiles: {
      joueurs: "joueurs aujourd'hui",
      meilleure: "meilleure copie",
      gel: "avant le gel",
      repondues: "répondues",
      chrono: "de chrono",
      tonScore: "ta copie",
      tonRang: "ton rang",
    },
    classementDuJour: "Le classement du jour",
    progression: (n: number, total: number) => `${n} réponses sur ${total}`,
  },

  /** le classement des 30, accolé au héros */
  classement: {
    titre: "Classement des 30",
    quelJour: "Quel jour",
    aujourdhui: "Aujourd'hui",
    hier: "Hier",
    direct: "En direct",
    fige: "Figé hier soir",
    joueurs: (n: number) => `${nombre(n)} ${n > 1 ? "joueurs" : "joueur"}`,
    toutLeClassement: "Tout le classement →",
    videAujourdhui: "Personne n'a encore rendu sa copie. Le premier trait est à toi.",
    videHier: "Personne n'a rendu de copie hier.",
    /** « en 11 min 40 » */
    en: (secondes: number) => `en ${minutesSecondes(secondes)}`,
    toi: {
      pasRendu: "Toi : pas encore rendu",
      pasRenduSous: "une copie, le même sujet pour tous",
      aRendre: "à rendre",
      enCours: (n: number, total: number) => `Toi : en cours, ${n}/${total}`,
      enCoursSous: "ta copie se rend avant le gel",
      aTerminer: "à terminer",
      rang: (rang: string) => `Toi : ${rang}`,
      pasJoue: "Toi : pas joué",
      pasJoueSous: "le classement d'hier est figé",
      tiret: "—",
    },
    pied: {
      seFige: (reste: string | null) => (reste ? `Se fige dans ${reste}` : "Se fige ce soir"),
      vainqueur: (nom: string) => `Vainqueur : ${nom}`,
      figeAucun: "Classement figé",
    },
    aria: (jour: "auj" | "hier") => (jour === "auj" ? "Classement des 30 d'aujourd'hui" : "Classement des 30 d'hier"),
  },

  /** les 5 du jour, en colonne */
  cinq: {
    surTitre: "Défi éclair classé · 2 min",
    titre: "Les 5 du jour",
    jouer: "Jouer les 5 du jour",
    reprendre: "Reprendre mes 5",
    revoir: "Revoir mes 5",
    joueurs: (n: number) => (n > 1 ? "joueurs" : "joueur"),
    meilleur: "meilleur",
    enCours: (n: number, total: number) => `${n}/${total} répondues`,
    caseAria: (etat: "todo" | "playing" | "done", justes: number, total: number, repondues: number) =>
      etat === "done" ? `${justes} justes sur ${total}` : etat === "playing" ? `${repondues} répondues sur ${total}` : "Pas encore joués aujourd'hui",
  },

  /** tes traits du jour */
  traits: {
    surTitre: "Ta journée",
    titre: "Tes traits du jour",
    sceau: "TENU",
    sceauAria: (objectif: number) => `Sceau TENU : pas encore, il se pose à ${nombre(objectif)} traits`,
    sceauTitre: (objectif: number) => `Le sceau se pose à ${nombre(objectif)} traits`,
    serie: "Série d'encre",
    jours: (n: number) => `${nombre(n)}${NBSP}${n > 1 ? "jours" : "jour"}`,
    joker: "Joker de la semaine",
    jokerDispo: "disponible",
    jokerPris: "utilisé",
    examen: "Examen",
    /** le palier d'XP : « Ta série te vaut ×2 (×1,5 dès 3 j, ×2 dès 7 j). » */
    palier: (mult: string): (string | { b: string })[] => ["Ta série te vaut ", { b: mult }, ` (×1,5 dès 3${NBSP}j, ×2 dès 7${NBSP}j).`],
    palierProche: `Ta série vaut ×1,5 dès 3${NBSP}jours et ×2 dès 7${NBSP}jours.`,
    phraseAFaire: (): (string | { b: string })[] => ["et le sceau ", { b: "TENU" }, " se pose sur ta journée."],
    phraseTenue: "Le sceau est posé : ta série continue demain.",
    gagner: "Tracer des traits",
  },

  /** quand ni les 30 ni les 5 ne sont jouables */
  calme: {
    surTitre: "Défi du jour",
    titre: "Les 30 du jour",
    bientot: "bientôt",
    indispo: "indisponible",
    texteBientot: "Mêmes questions pour tous, chaque jour.",
    texteIndispo: "Pas de défi pour l'instant.",
  },

  /** le vainqueur des 30 d'hier */
  vainqueur: {
    surTitre: "Vainqueur des 30 d'hier",
    toi: "Toi",
    /** « 29/30 en 11 min 40 s, devant 130 joueurs » (le gagnant n'est pas compté ; seul, il le dit) */
    devant: (joueurs: number) => (joueurs <= 1 ? "seul en lice" : `devant ${pluriel(joueurs - 1, "joueur", "joueurs")}`),
    duree: (secondes: number) => {
      const s = Math.max(0, Math.floor(secondes));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      return h > 0 ? `${h}${NBSP}h${NBSP}${String(m).padStart(2, "0")}` : `${m}${NBSP}min${NBSP}${String(s % 60).padStart(2, "0")}${NBSP}s`;
    },
    placement: "Placement",
    classementHier: "Le classement d'hier →",
  },

  /** ton rang et ta phase de révision */
  rang: {
    surTitre: "Ton rang",
    insigne: (palier: string) => `Insigne ${palier}`,
    elo: "ELO",
    place: (joueurs: number | null) => (joueurs === null ? "au classement" : `sur ${nombre(joueurs)} joueurs`),
    dernierDuel: "au dernier duel",
    partiesClassees: "parties classées",
    delta: (d: number) => `${d > 0 ? "+" : "−"}${nombre(Math.abs(d))}`,
    rangEn: (rang: number) => (rang === 1 ? "1er" : `${rang}e`),
  },
  phase: {
    surTitre: "Ta phase de révision",
    sur: (index: number) => `phase ${index + 1} sur 3`,
    libelles: ["Découverte", "Consolidation", "Sprint final"] as [string, string, string],
    aria: (nom: string, libelles: [string, string, string]) => `Phase de révision : ${nom}, entre ${libelles[0]} et ${libelles[2]}`,
    sansDate: "Fixe ton jour J pour suivre ta phase de révision.",
    fixer: "Fixe ton jour J →",
  },
} as const;
