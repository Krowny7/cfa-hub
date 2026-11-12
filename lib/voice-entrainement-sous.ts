// Voix des sous-pages de S'entraîner refaites sur le modèle validé par Théo (2026-11-12) : l'en-tête
// commun (EnTeteSousPage), le cadre à zones (CadreZones : la bande noire des titres, l'essentiel à
// gauche, la colonne grise à droite). Les titres des zones, les lignes des courtes listes, les
// légendes des chiffres. Module neutre (ni « use client » ni serveur).

import { nombre, pluriel } from "@/lib/voice";

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
    choisir: "Choisis ta matière",
    ouvrir: "Ouvrir une matière",
    session: "Session ciblée",
    toutes: "Toutes les matières",
    aEntamer: "à entamer",
    justes: (pct: number) => `${nombre(pct)} %`,
  },
  calculsMatiere: {
    registres: "Ses calculs",
    reprendre: "À reprendre",
    tenus: (n: number) => (n > 1 ? "niveaux tenus" : "niveau tenu"),
    sur: (tenus: number, total: number) => `${nombre(tenus)} / ${nombre(total)}`,
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
