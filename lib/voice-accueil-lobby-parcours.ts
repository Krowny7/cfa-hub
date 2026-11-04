// La voix des cartes « parcours » de l'accueil « Le lobby » (lot 5) : Tes
// meilleurs scores, Prochain déblocage, Ta prochaine quête, La Grande Salle, Du
// nouveau, Tes amis et Ton carnet de jours. Tutoiement, nombres et pourcentages à
// l'espace insécable (lib/voice.ts), aucune date écrite par le navigateur : tout
// arrive déjà formaté du serveur (pas d'écart d'hydratation). Les choix (quelle
// phrase pour quel cas) se font dans components/accueil/lobby/modele-parcours.ts ;
// ici, seulement les mots.

import { NBSP, nombre, pluriel } from "@/lib/voice";

/** « 9 j » */
const jours = (n: number) => `${nombre(n)}${NBSP}j`;

/** Le nom d'une unité qui se compte, au singulier et au pluriel (le libellé des barres : « duels gagnés »). */
type Unite = readonly [string, string];

export const PARC = {
  // ── Tes meilleurs scores ──
  scores: {
    eyebrow: "Tes records",
    titre: "Tes meilleurs scores",
    lien: "Tout ton parcours dans Moi",
    copie: "Meilleure copie aux 30 du jour",
    maitrise: "Meilleure maîtrise globale",
    examen: "Meilleur examen blanc",
    rang: "Meilleur rang atteint",
    /** la petite ligne d'un record absent */
    vide: {
      copie: "pas encore de copie rendue",
      maitrise: "pas encore mesurée",
      examen: "aucun examen blanc passé",
      rang: "pas encore classé",
    },
    /** « le 12 oct. », ou « aujourd'hui » */
    le: (jourCourt: string) => `le ${jourCourt}`,
    aujourdhui: "aujourd'hui",
    /** « le 28 oct. · meilleure matière : Portefeuille à » (le pourcentage suit, en gras) */
    meilleureMatiere: (quand: string, matiere: string) => `${quand} · meilleure matière : ${matiere} à `,
    /** « examen blanc n° 3, le 19 oct. » */
    examenLe: (titre: string, quand: string) => `${titre}, ${quand}`,
    elo: (n: number) => `${nombre(n)}${NBSP}ELO`,
    pct: (n: number) => `${nombre(n)}${NBSP}%`,
    /** l'étiquette lue à voix haute d'un record : « Meilleure copie aux 30 du jour : 28/30, le 12 oct. » */
    aria: (lib: string, valeur: string, detail: string) => `${lib} : ${valeur}${detail ? `, ${detail}` : ""}`,
  },

  // ── Prochain déblocage ──
  deblocage: {
    eyebrow: "Récompense",
    titre: "Prochain déblocage",
    lien: "Mes pièces",
    /** le type de la pièce, devant son nom : « Ornement « Laurier » » */
    type: { cadre: "Cadre", banniere: "Bannière", titre: "Titre", folio: "Folio", ornement: "Ornement" } as const,
    /** « pour ta bannière : encore 2 duels gagnés » */
    pour: { cadre: "pour ton profil", banniere: "pour ta bannière", titre: "pour ton profil", folio: "pour ton profil", ornement: "pour ta bannière" } as const,
    nom: (type: string, nom: string) => `${type} « ${nom} »`,
    /** « encore 2 duels gagnés » */
    reste: (n: number, unite: string) => `encore ${nombre(n)} ${unite}`,
    aria: (fait: number, total: number, unite: string) => `${nombre(fait)} sur ${nombre(total)} ${unite}`,
    /** ce que compte chaque barre, au singulier et au pluriel */
    unites: {
      jours: ["jour", "jours"],
      questions: ["question", "questions"],
      defis: ["défi tenu", "défis tenus"],
      victoires: ["duel gagné", "duels gagnés"],
      calculs: ["calcul", "calculs"],
      examens: ["examen blanc", "examens blancs"],
      maitrise: ["point de maîtrise", "points de maîtrise"],
      mentions: ["mention", "mentions"],
      ecart: ["palier d'écart", "paliers d'écart"],
      rayees: ["rature rayée", "ratures rayées"],
      sceaux: ["sceau", "sceaux"],
      dorures: ["sceau à la dorure", "sceaux à la dorure"],
      trophees: ["trophée", "trophées"],
      sources: ["source différente", "sources différentes"],
    } satisfies Record<string, Unite>,
  },

  // ── Ta prochaine quête ──
  quete: {
    eyebrow: "Codex",
    titre: "Ta prochaine quête",
    lien: "Ouvrir le Codex",
    nom: (titre: string) => `« ${titre} »`,
    aria: (valeur: number, cible: number) => `${nombre(valeur)} sur ${nombre(cible)}`,
    xp: (n: number) => `+${nombre(n)}${NBSP}XP`,
  },

  // ── La Grande Salle ──
  salle: {
    eyebrow: "La Grande Salle",
    /** « Prochain examen blanc dans 6 jours » */
    dans: (n: number) => (n > 1 ? `Prochain examen blanc dans ${n}${NBSP}jours` : n === 1 ? "Prochain examen blanc demain" : n === 0 ? "Examen blanc aujourd'hui" : "Examen blanc en cours"),
    /** « Examen blanc n° 4, vendredi 7 novembre. » */
    ligne: (titre: string, jourSemaine: string, date: string) => `${titre}, ${jourSemaine} ${date}.`,
    voir: "Voir l'examen blanc",
    ouvrir: "Ouvrir mon examen blanc",
  },

  // ── Du nouveau ──
  nouveau: {
    titre: "Du nouveau",
    lien: "Tout voir",
    revanche: "Revanche",
    profil: "Son profil",
    voir: "Voir",
    defier: "Le défier",
    /** « Marie t'a relancé » (le moment se lit à droite de la ligne) */
    relance: ["t'a relancé"] as (string | { b: string })[],
    /** « Hugo monte en Platine » */
    palier: (palier: string) => ["monte en ", { b: palier }] as (string | { b: string })[],
    /** « Inès t'a battu 23–19 » */
    victoire: (score: [number, number] | null) =>
      (score ? ["t'a battu ", { b: `${nombre(score[0])}–${nombre(score[1])}` }] : ["t'a battu en duel"]) as (string | { b: string })[],
    /** « Sarah t'a dépassé de 8 points » */
    depasse: (ecart: number) => ["t'a dépassé de ", { b: pluriel(ecart, "point", "points") }] as (string | { b: string })[],
    /** « aujourd'hui », « hier », « avant-hier », « il y a 3 j » */
    quand: (ecart: number) => (ecart <= 0 ? "aujourd'hui" : ecart === 1 ? "hier" : ecart === 2 ? "avant-hier" : `il y a ${jours(ecart)}`),
    /** lu à voix haute, sur la ligne : « Hugo monte en Platine. Voir le profil de Hugo » */
    aria: (nom: string, phrase: string) => `${nom} ${phrase}`,
  },

  // ── Tes amis ──
  amis: {
    titre: "Tes amis",
    lien: "Tes amis",
    /** « en ligne sur 14 » */
    enLigneSur: (total: number) => `en ligne sur ${nombre(total)}`,
    /** « amis » / « ami » quand la présence ne se lit pas */
    nombre: (total: number) => (total > 1 ? "amis" : "ami"),
    demandes: (n: number) => (n > 1 ? `${nombre(n)} demandes d'ami` : "1 demande d'ami"),
    premiers: "Ajoute tes premiers amis",
    premiersAide: "Défie-les, suis leurs séries.",
    trouver: "Trouver des joueurs",
    /** lu à voix haute : « Lucas, en ligne » */
    visage: (nom: string, enLigne: boolean) => (enLigne ? `${nom}, en ligne` : nom),
  },

  // ── Ton carnet de jours ──
  carnet: {
    titre: "Ton carnet de jours",
    sous: "Une case par jour sur 52 semaines : plus elle est claire, plus tu as tracé.",
    /** les trois chiffres du haut : une ligne de légende en deux temps (le saut de ligne est posé par la carte) */
    joursLib: ["jours d'encre", "sur 52 semaines"] as readonly [string, string],
    serieLib: ["ta série", "en cours"] as readonly [string, string],
    recordLib: ["ton", "record"] as readonly [string, string],
    j: jours,
    moins: "moins",
    plus: "plus",
    /** les jours de la semaine, sur les lignes 1, 3 et 5 (lundi en haut) */
    jours: ["lun.", "", "mer.", "", "ven.", "", ""] as readonly string[],
    /** lu à voix haute, sur la grille */
    aria: (an: number, serie: number, record: number) =>
      `${pluriel(an, "jour d'encre", "jours d'encre")} sur 52 semaines ; série en cours de ${pluriel(serie, "jour", "jours")}, record de ${pluriel(record, "jour", "jours")}`,
    /**
     * l'infobulle d'une case passée : « jeudi 30 oct. · 42 traits · jour d'encre », « … · 3 traits (jour d'encre dès 10) »,
     * « … · rien tracé » ; `seuil` null (ancien calcul de série) : les traits seuls
     */
    case: (quand: string, traits: number, seuil: number | null) =>
      traits <= 0
        ? `${quand} · rien tracé`
        : `${quand} · ${pluriel(traits, "trait", "traits")}${seuil === null ? "" : traits >= seuil ? " · jour d'encre" : ` (jour d'encre dès ${nombre(seuil)})`}`,
    /** le jour de la semaine devant la date de l'infobulle (getUTCDay : dimanche d'abord) */
    semaine: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] as readonly string[],
    /** la case du jour : « aujourd'hui · 26 traits sur 40, pas encore tenue » */
    examenCase: (quand: string) => `${quand} · jour de l'examen`,
    aujourdhuiCase: (traits: number, objectif: number, tenu: boolean) => `aujourd'hui · ${pluriel(traits, "trait", "traits")} sur ${nombre(objectif)}${tenu ? ", journée tenue" : ", pas encore tenue"}`,
    /** sous la grille : « La case cerclée, c'est aujourd'hui : 26 traits sur 40, pas encore tenue. » */
    legendeAujourdhui: (traits: number, objectif: number, tenu: boolean) =>
      `La case cerclée, c'est aujourd'hui : ${pluriel(traits, "trait", "traits")} sur ${nombre(objectif)}, ${tenu ? "journée tenue" : "pas encore tenue"}.`,
    legendeSimple: "La case cerclée, c'est aujourd'hui.",
    /** les mois sous le titre de la grille */
    mois: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."] as readonly string[],
  },
} as const;
