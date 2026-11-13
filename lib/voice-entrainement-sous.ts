// Voix des sous-pages de S'entraîner refaites sur le modèle validé par Théo (2026-11-12) : l'en-tête
// commun (EnTeteSousPage), le cadre à zones (CadreZones : la bande noire des titres, l'essentiel à
// gauche, la colonne grise à droite). Les titres des zones, les lignes des courtes listes, les
// légendes des chiffres. Module neutre (ni « use client » ni serveur).

import { NBSP, nombre, pluriel } from "@/lib/voice";

/** Le retour de toutes les sous-pages de S'entraîner. */
export const RETOUR_ENTRAINEMENT = { href: "/entrainement", label: "S'entraîner" } as const;

export const SOUS_ENTRAINEMENT = {
  practice: {
    titre: "Entraînement ciblé",
    copies: "Tes copies",
    /** la sélection façon choix de niveau (2026-11-13) : l'étiquette de la scène, ses réglages, le lancement */
    matieres: "Tes matières",
    parMatiere: "Matières",
    parNotion: "Notions",
    questions: "Questions",
    melange: "Mélange",
    examen: "Mode examen",
    /** ce que fait le mode examen (l'infobulle de l'interrupteur) */
    examenAide: "Aux poids de l'examen, sans pause : comme le jour J.",
    melangeAide: "Les matières mêlées dans la séance, plutôt qu'une à la suite de l'autre.",
    lancer: "Lancer",
    /** la première ligne des copies : son pourcentage est déjà le chiffre-héros */
    derniere: "la dernière",
    /** le chiffre-héros : la dernière copie */
    heros: "dernière copie",
    /** la ligne d'état de la porte : les copies rendues et les trophées d'or (la plus fragile reste à la planche) */
    etat: (copies: number, ors: number) =>
      copies === 0
        ? "Aucune copie rendue pour l'instant : la première mesure tes matières."
        : `${pluriel(copies, "copie rendue", "copies rendues")}${ors > 0 ? ` · ${pluriel(ors, "trophée or", "trophées or")}` : ""}`,
    poids: (w: string) => `${w}${NBSP}%`,
    /** les touches à deux valeurs de la barre de réglages */
    melangeOui: "Mêlées",
    melangeNon: "À la suite",
    examenOui: "Oui",
    examenNon: "Non",
    /** une taille au-delà de ce que la base peut servir pour ces matières (l'infobulle de la touche grisée) */
    tropGrand: (n: number) => `Ces matières ne donnent que ${pluriel(n, "question", "questions")} : ajoutes-en une.`,
    /** la ligne Mono sous Lancer : les matières, la durée, le trophée visé */
    note: (matieres: string, minutes: string, palier: string) => `${matieres} — ${minutes} — trophée ${palier}`,
    /** le mode examen allumé : la note sous Lancer */
    noteExamen: (matieres: string, minutes: string) => `${matieres} — ${minutes} — aux poids de l'examen · sans pause`,
    /** la ligne lue d'une matière (lecteur d'écran) */
    lecture: (nom: string, pct: number | null, conseil: boolean) =>
      `${nom}, ${pct === null ? "pas encore mesurée" : `${nombre(pct)}${NBSP}%`}${conseil ? ", conseillée" : ""}`,
    /** l'annexe des copies : trois lignes, puis la suite à la demande */
    autres: (n: number) => (n > 1 ? `Voir les ${nombre(n)} autres` : "Voir la dernière"),
    replier: "Replier",
    progression: "Progression",
    historique: "Copies",
  },
  qcm: {
    titre: "QCM par thème",
    reussies: (fait: number, total: number | null) => `${nombre(fait)}/${total === null ? "?" : nombre(total)}`,
    communaute: "Communauté",
    lesQcm: (matiere: string) => `Les QCM · ${matiere}`,
    /** l'éventail (2026-11-13) : la main des 10 matières, la carte tirée */
    main: "Ta main",
    heros: "réussies",
    /** la ligne d'état de la porte */
    etat: (entames: number, sets: number) =>
      entames === 0 ? `${pluriel(sets, "QCM", "QCM")} à ouvrir · l'XP se gagne à ta première bonne réponse` : `${pluriel(entames, "QCM entamé", "QCM entamés")} sur ${nombre(sets)} · l'XP se gagne à ta première bonne réponse`,
    vide: "Ses QCM arrivent bientôt.",
    /** sur la carte tirée : réussies sur le total de la matière */
    carteReussies: (fait: number, total: number) => `${nombre(fait)}/${nombre(total)} réussies`,
    /** une pastille (infobulle et lecture) */
    pastille: (titre: string, fait: number, total: number | null) => `${titre} · ${nombre(fait)}/${total === null ? "?" : nombre(total)}`,
    reprendreAction: "Reprendre",
    ouvrirAction: "Ouvrir",
    /** la ligne qui regroupe les quiz des fiches d'une matière */
    fiches: "Fiches",
    /** une fiche dans la rangée de petits carrés (lecture) */
    fiche: (n: number, fait: number, total: number | null) => `Fiche ${nombre(n)} · ${nombre(fait)}/${total === null ? "?" : nombre(total)}`,
    /** la carte qui porte le QCM en cours (lecture) */
    enCours: "le QCM en cours",
    /** les séances chronométrées sur tes QCM (l'ancien /session, toujours là) */
    chrono: "Chrono 15 min",
    examenQcm: "Examen sur tes QCM",
    tirer: (matiere: string) => `Tirer la carte ${matiere}`,
  },
  calculs: {
    ouvrir: "Ouvrir une matière",
    session: "Session ciblée",
    aEntamer: "à entamer",
    justes: (pct: number) => `${nombre(pct)}${NBSP}%`,
    /** le chiffre-héros des en-têtes (hub et matière) : les calculs tenus (au moins un niveau tenu, 4 justes sur 5) */
    heros: (n: number) => (n > 1 ? "calculs tenus" : "calcul tenu"),
    /** la ligne d'état des en-têtes : ce qui est entamé, et la réussite sur les derniers essais */
    etat: (entames: number, total: number, pct: number | null) =>
      entames === 0
        ? `${pluriel(total, "calcul", "calculs")} · aucun entamé`
        : `${pluriel(entames, "calcul entamé", "calculs entamés")} sur ${nombre(total)}${pct !== null ? ` · ${nombre(pct)}${NBSP}% de justes sur tes derniers essais` : ""}`,
    /** la légende des bâtons de craie du tableau */
    legende: "= un calcul tenu",
    tenus: (n: number, total: number) => `${pluriel(n, "calcul tenu", "calculs tenus")} sur ${nombre(total)}`,
    /** sous la matière entourée, en petite craie : le calcul qui coince (sous 80 %), sinon celui à reprendre ou le prochain à ouvrir */
    coince: (nom: string, pct: number) => `${nom} coince${NBSP}·${NBSP}${nombre(pct)}${NBSP}%`,
    reprendre: (nom: string) => `à reprendre${NBSP}: ${nom}`,
    prochain: (nom: string) => `à ouvrir${NBSP}: ${nom}`,
    /** la lecture d'une ligne du tableau (lecteur d'écran) */
    lecture: (nom: string, pct: string, tenus: string) => `${nom}, ${pct}, ${tenus}`,
  },
  calculsMatiere: {
    registres: "Ses calculs",
    /** la légende des pastilles du tableau */
    legende: "F, M, D : facile, moyen, difficile",
    session: "Session ciblée",
    /** sous le calcul entouré, en petite craie : où il en est, et ce qui manque pour tenir le niveau */
    raison: (ok: number, n: number, reste: number, niveau: string) =>
      `${pluriel(ok, "juste", "justes")} sur ${nombre(n)}${NBSP}· encore ${nombre(reste)} pour tenir${NBSP}${niveau}`,
    raisonVierge: (niveau: string) => `le ${niveau} reste à entamer`,
    /** sous le calcul entouré d'une matière pas encore ouverte : ce qui attend */
    prochain: (niveau: string) => `à ouvrir${NBSP}· ${niveau}, cinq questions`,
    /** au bas du tableau : le graphique des points faibles */
    faibles: "Tes points faibles",
    seuil: (pct: number) => `tenu · ${nombre(pct)}${NBSP}%`,
    detail: (ok: number, n: number, tenus: number) => `${pluriel(ok, "juste", "justes")} sur les ${nombre(n)} derniers essais · ${nombre(tenus)}/3 niveaux tenus`,
    autres: (n: number) => `+ ${pluriel(n, "autre calcul sous le seuil", "autres calculs sous le seuil")}, plus haut au tableau`,
    lecture: (nom: string, pct: string, niveaux: string) => `${nom}, ${pct}, ${niveaux}`,
    niveaux: (tenus: number) => `${nombre(tenus)} sur 3 niveaux tenus`,
  },
  officiels: {
    complete: (n: number) => `Passer la session complète · ${pluriel(n, "question", "questions")}`,
    /** les packs scellés (2026-11-13) */
    heros: (n: number) => (n > 1 ? "scellés" : "scellé"),
    packs: "Tes packs",
    scelle: "Scellé",
    /** la ligne d'état de la porte */
    etat: (sessions: number, ouvertes: number, jours: number | null) =>
      `${pluriel(sessions, "session", "sessions")} · ${ouvertes === 0 ? "aucune ouverte" : pluriel(ouvertes, "ouverte", "ouvertes")}${jours === null ? "" : jours <= 0 ? " · la dernière aujourd'hui" : jours === 1 ? " · la dernière hier" : ` · la dernière il y a ${nombre(jours)}${NBSP}j`}`,
    /** une tuile de matière sous le pack ouvert */
    tuileQ: (n: number) => `${nombre(n)}${NBSP}Q`,
    variantes: "Variantes",
    /** sur une tuile de matière : le lien de ses variantes, en Mono */
    variantesCourt: "VAR",
    /** la lecture d'un pack (lecteur d'écran) */
    lecture: (nom: string, n: number, pct: number | null) => `${nom}, ${pluriel(n, "question", "questions")}, ${pct === null ? "scellé" : `meilleure copie ${nombre(pct)}${NBSP}%`}`,
  },
  seance: {
    titre: "Séance libre",
    ligne: "Une banque de questions, un chrono, la correction à chaque question ou à la fin.",
    preparer: "Prépare ta séance",
    examen: "Le mode examen",
    interrupteur: "Mode examen",
    examenOui: "Chrono, et aucune correction avant la fin.",
    examenNon: "Corrigée à chaque question.",
  },
  terminal: {
    titre: "Le Terminal",
  },
} as const;
