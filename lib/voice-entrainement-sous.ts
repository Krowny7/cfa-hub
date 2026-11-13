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
    composer: "Compose ta séance",
    dernieres: "Tes dernières séances",
    copies: "Tes copies",
  },
  qcm: {
    titre: "QCM par thème",
    ligne: "L'XP se gagne une fois par question, à ta première bonne réponse.",
    choisir: "Choisis ta matière",
    ouvrir: "Ouvrir une matière",
    reprendre: "À reprendre",
    reussies: (fait: number, total: number | null) => `${nombre(fait)}/${total === null ? "?" : nombre(total)}`,
    legendeTotal: (total: number) => `questions réussies sur ${nombre(total)}`,
    communaute: "Communauté",
    lesQcm: (matiere: string) => `Les QCM · ${matiere}`,
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
    choisir: "Choisis ta session",
    ouvrir: "Ouvrir une session",
    scores: "Tes scores",
    pasEncore: "—",
    complete: (n: number) => `Passer la session complète · ${pluriel(n, "question", "questions")}`,
  },
  cas: {
    choisir: "Choisis ton dossier",
    ouvrir: "Ouvrir un dossier",
    ouEnEs: "Où tu en es",
    boucles: (total: number) => (total > 1 ? "dossiers bouclés" : "dossier bouclé"),
  },
  defi: {
    jour: "Le défi du jour",
    classement: "Le classement du jour",
    joursPasses: "Les jours passés",
    serie: "Ta série",
    /** la légende du chiffre de la série d'encre : ce qui manque aujourd'hui, ou le jour qui compte déjà */
    serieLegende: (jours: number, fait: boolean, reste: number) =>
      `${jours > 1 ? "jours d'encre" : "jour d'encre"}${fait ? ", aujourd'hui compris" : reste > 0 ? ` · encore ${pluriel(reste, "question", "questions")} aujourd'hui` : ""}`,
    toi: "toi",
  },
  eclair: {
    lancer: "Lance ta série",
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
  atelier: {
    notion: "La notion du jour",
    registre: "Ton registre",
    ratures: "Ratures en cours",
    marquees: "Questions marquées",
    ateliers: "Ateliers passés",
  },
  terminal: {
    titre: "Le Terminal",
  },
} as const;
