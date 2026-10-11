// La voix de la refonte de Moi : le cabinet (« Le Cabinet ») et les pages de
// liste du carnet de ratures et des marquées (« Le registre »). Les phrases
// d'ensemble restent dans lib/voice-z1.ts (MOI).

import { fmtInt } from "@/components/classement/format";

const s = (n: number) => (n > 1 ? "s" : "");

export const CAB = {
  surtitre: (domaine: string, programme: string) => `Moi · ${domaine} · ${programme}`,
  // le carnet (héros)
  carnet: "Ton carnet de ratures",
  carnetTitre: (n: number) => `${fmtInt(n)} rature${s(n)}`,
  carnetRepere: (retirees: number, semaine: number) =>
    retirees > 0 ? `en cours · ${retirees} retirée${s(retirees)}${semaine > 0 ? `, dont ${semaine} cette semaine` : ""}` : "en cours · rien de retiré pour l'instant",
  carnetPhrase: (source: string | null, n: number, total: number) =>
    `${source ? `Elles viennent surtout de « ${source} » (${n} sur ${total}). ` : ""}Une rature sort du carnet quand tu la réussis deux fois de suite.`,
  carnetAction: "Reprendre le carnet",
  fragiles: "Les matières les plus fragiles",
  // l'objectif (héros de repli, tuile)
  objectif: "Ton objectif d'ici l'examen",
  objectifRepere: (examen: string | null, jj: string | null) => ["questions posées", examen ? `examen le ${examen}` : null, jj].filter(Boolean).join(" · "),
  objectifRetard: (retard: number, rythme: number, projection: number) =>
    `${fmtInt(retard)} question${s(retard)} de retard sur ta droite. À ton rythme (${rythme} par jour), tu finirais vers ${fmtInt(projection)}.`,
  objectifAvance: (avance: number) => `Tu as ${fmtInt(avance)} question${s(avance)} d'avance sur ta droite.`,
  objectifPlan: (quotidien: number, matiere: string | null) => `Pour tenir : ${quotidien} par jour d'ici l'examen. C'est en ${matiere ?? "ta matière la plus faible"} que tu en gagnes le plus.`,
  travailler: (matiere: string | null) => (matiere ? `Travailler ${matiere}` : "Travailler ta matière faible"),
  ouPrendre: "Où les prendre",
  courbe: "Voir la courbe",
  // sans objectif ni carnet
  sansObjectifTitre: "Fixe ton jour J",
  sansObjectifRepere: "pas encore de date d'examen ni d'objectif",
  sansObjectifPhrase: "Avec une date d'examen et un objectif de questions, ton cabinet te dit chaque jour combien en poser et où les prendre.",
  sansObjectifAction: "Régler mon objectif",
  // le cabinet (carte « lieu »)
  cabinet: "Ton cabinet",
  personnaliser: "Personnaliser mon profil",
  legendeBandeau: (nom: string) => `Ton cabinet · ${nom}`,
  // les tuiles
  tuileObjectif: "Ton objectif",
  objectifLigne: (fait: number, total: number, reste: number) => `${fmtInt(fait)} / ${fmtInt(total)} questions · ${reste > 0 ? `encore ${reste} aujourd'hui` : "ta part du jour est faite"}`,
  objectifSans: "Pas d'objectif ni de date d'examen pour l'instant : fixe-les dans les réglages.",
  objectifSansLien: "Régler",
  tuileCarnet: "Carnet de ratures",
  carnetVide: "Vide pour l'instant : chaque question manquée, d'où qu'elle vienne, s'y inscrit.",
  carnetOuvrir: "Ouvrir le carnet",
  tuileMarquees: "Marquées",
  marqueesLigne: "Les questions que tu as gardées pour plus tard.",
  marqueesVide: "Aucune pour l'instant : touche « Marquer » après une réponse.",
  marqueesLien: "Les revoir",
  // le rang
  rangPlace: (ordinalPlace: string | null, total: number | null) => (ordinalPlace !== null && total !== null ? `${ordinalPlace} sur ${total}` : "pas encore classé"),
  rangLigne: (place: string, mastery: number) => `${place} · maîtrise du programme ${mastery} %`,
  rangAction: "Voir le classement",
  // les liens
  liensLabel: "Ailleurs dans Moi",
  voirCommeLesAutres: "Voir comme les autres",
  voirCommeLesAutresDesc: "Ton profil public, tel qu'il s'affiche.",
  sessions: "Dernières sessions",
  sessionsDesc: (n: number, ago: string | null) => (n > 0 ? `${n} session${s(n)}, la dernière ${ago ?? ""}`.trim() : "Aucune session pour l'instant"),
  reglages: "Réglages",
  reglagesDesc: "Date d'examen, objectif, apparence, groupes.",
  // les sections
  matieres: "Tes matières",
  matieresSous: "ta maîtrise · la moyenne des joueurs",
  legendeCuriosites: "Ton cabinet de curiosités : les dix matières",
  detail: "Le détail",
  detailSous: "trajectoire, activité, questions répondues par source, dernières sessions",
};

export const REG = {
  fil: "Moi",
  ratures: {
    kicker: "Ton carnet de ratures",
    titre: (n: number) => `${fmtInt(n)} rature${s(n)}`,
    repere: (retirees: number, semaine: number) =>
      retirees > 0 ? `en cours · ${retirees} retirée${s(retirees)}${semaine > 0 ? `, dont ${semaine} cette semaine` : ""}` : "en cours · rien de retiré pour l'instant",
    phrase: "Une rature sort du carnet quand tu la réussis deux fois de suite. Commence par celles qui reviennent.",
    phraseVide: "Rien à reprendre pour l'instant : les ratures rayées restent dans les anciennes.",
    action: "Les reprendre une à une",
    liste: "D'où elles viennent",
    listeTitre: "Toutes tes ratures",
    asideKicker: "Mis au propre",
    asideTitre: (n: number) => (n > 0 ? `${n} retirée${s(n)}` : "Rien de retiré"),
    asideLigne: (retirees: number, semaine: number) =>
      retirees > 0 ? `${semaine > 0 ? `${semaine} cette semaine : ` : ""}on raye, on n'efface pas.` : "Une rature sort du carnet quand tu la réussis deux fois de suite.",
    asideLien: "Voir les retirées",
  },
  marquees: {
    kicker: "Tes questions marquées",
    titre: (n: number) => `${fmtInt(n)} marquée${s(n)}`,
    repere: (recente: string, pasRepondues: number) => `la plus récente ${recente}${pasRepondues > 0 ? ` · ${pasRepondues} pas encore répondue${s(pasRepondues)}` : ""}`,
    phrase: "Ce que tu as gardé pour plus tard : l'énoncé, la bonne réponse et l'explication.",
    action: "Les revoir",
    liste: "Par rubrique",
    listeTitre: "Toutes tes marquées",
    asideKicker: "Comment ça marche",
    asideTitre: "Marquer",
    asideLigne: "Le bouton « Marquer » apparaît après chaque réponse, partout.",
    asideLien: "Voir la liste",
  },
  rubriquesEgales: (rubriques: string[], n: number) => `${rubriques.length} rubrique${s(rubriques.length)}, ${n} question${s(n)} chacune : ${rubriques.join(", ")}.`,
  reglagesKicker: "Moi · Réglages",
  reglagesTitre: "Réglages",
  profilPublic: "Mon profil public",
};
