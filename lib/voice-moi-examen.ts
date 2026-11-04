// La voix des trois cartes « examen » de la page Moi « La synthèse » : Calcul ou
// théorie, Ton rythme d'examen, Ta progression. Tutoiement, nombres et
// pourcentages à l'espace insécable (lib/voice.ts). Une phrase à passages en
// gras ou en rouge est une liste de segments (Segment, lib/voice-moi.ts). Les
// choix (quelle phrase pour quel cas) se font dans
// components/moi/synthese/modele-examen.ts ; ici, seulement les mots.

import { NBSP } from "@/lib/voice";
import type { Segment } from "@/lib/voice-moi";

const point = (n: number) => (Math.abs(n) >= 2 ? "points" : "point");
const sec = (n: number) => `${n}${NBSP}s`;

/** Un nombre de questions qu'il manque pour juger : « tu n'en as pas encore », « tu en as une », « tu en as 7 ». */
const tuEnAs = (n: number) => (n <= 0 ? "tu n'en as pas encore" : n === 1 ? "tu en as une" : `tu en as ${n}`);

export const EXA = {
  pied: "Ce que ça veut dire :",

  calcul: {
    titre: "Calcul ou théorie",
    sous: "Ta maîtrise selon le type de question.",
    sans: "Sans calcul",
    avec: "Avec calcul",
    aria: (genre: string, p: number) => `${genre} : ${p}${NBSP}%`,
    /** la pastille : « 17 points d'écart », « 1 point d'écart », « Aucun écart » */
    ecart: (e: number) => (Math.round(Math.abs(e)) === 0 ? "Aucun écart" : `${Math.round(Math.abs(e))} ${point(e)} d'écart`),
    session: "Session de calculs",
    /** moins de 3 matières comparables : combien en as-tu */
    vide: (k: number) => `Il faut 10 réponses de chaque type, avec et sans calcul, dans 3 matières pour les comparer. ${k <= 0 ? "Tu n'en as aucune" : k === 1 ? "Tu en as une" : `Tu en as ${k}`} pour l'instant.`,
    /** « , surtout en Fixed Income (37 %) et en FSA (40 %) » ; rien sans matière */
    surtout: (l: readonly { court: string; pct: number }[]): string =>
      l.length === 0 ? "" : `, surtout ${l.map((m) => `en ${m.court} (${m.pct}${NBSP}%)`).join(" et ")}`,
    calculsCoutent: (surtout: string) => `tu connais le cours ; ce sont les calculs qui te coûtent des points${surtout}.`,
    seValent: "calculs et théorie se valent chez toi : ce n'est pas le type de question qui te coûte des points.",
    coursCoutent: (surtout: string) => `tu es plus à l'aise en calcul qu'en théorie ; ce sont les questions de cours qui te coûtent des points${surtout}.`,
  },

  rythme: {
    titre: "Ton rythme d'examen",
    sous: `Tes secondes par question, face aux 90${NBSP}s de l'examen (180 questions en 2 × 2${NBSP}h${NBSP}15).`,
    toutes: "Toutes matières",
    parQuestion: "par question",
    secondes: sec,
    /** la pastille : « +14 s de trop », « 12 s d'avance », « pile à 90 s » */
    ecart: (rs: number) => (rs > 90 ? `+${sec(rs - 90)} de trop` : rs < 90 ? `${sec(90 - rs)} d'avance` : `pile à ${sec(90)}`),
    ligneAria: (nom: string, s: number) => `${nom} : ${s} s par question, examen 90 s`,
    /** les graduations de l'axe, avec leur position (en %) sur l'échelle de 60 à 140 s */
    axe: [
      { texte: `60${NBSP}s`, x: 0, gras: false },
      { texte: `90${NBSP}s`, x: 37.5, gras: true },
      { texte: "120", x: 75, gras: false },
      { texte: "140", x: 100, gras: false },
    ] as const,
    global: (minutes: number, questions: number) =>
      `à ce rythme, l'examen te prendrait ${minutes} minute${minutes > 1 ? "s" : ""} de trop : environ ${questions} question${questions > 1 ? "s" : ""} sans réponse.`,
    globalTenu: "tu tiens le rythme de l'examen.",
    matierePlus: (court: string, d: number) => `en ${court}, ${sec(d)} de plus par question que le rythme de l'examen : entraîne-toi au chrono sur cette matière.`,
    matiereMoins: (court: string, d: number) => `en ${court}, ${sec(d)} d'avance par question sur le rythme de l'examen.`,
    matierePile: (court: string) => `en ${court}, tu es pile au rythme de l'examen.`,
    serie: "Série chronométrée",
    vide: (q: number) => `Fais une série chronométrée pour mesurer ton rythme : il faut 20 questions chronométrées, ${tuEnAs(q)}.`,
  },

  progression: {
    titre: "Ta progression",
    sousVide: "Ta maîtrise globale, semaine après semaine.",
    vide: "Ta courbe démarre après 3 semaines de réponses.",
    seance: "Faire une séance",
    /** l'en-tête : « … : +23 points en 12 semaines, +6 en 30 jours. » */
    sous: (total: Segment, semaines: number, totalNb: number, recent: { segment: Segment; libelle: string } | null): Segment[] => [
      "Ta maîtrise globale, semaine après semaine : ",
      total,
      ` ${point(totalNb)} en ${semaines} semaines`,
      ...(recent ? [", ", recent.segment, ` en ${recent.libelle}`] : []),
      ".",
    ],
    trente: "30 jours",
    quatreSemaines: "4 semaines",
    auj: "aujourd'hui",
    legendeToi: "Ta maîtrise globale",
    legendeRythme: (date: string) => `À ton rythme : 70${NBSP}% vers le ${date}`,
    legendeApres: `À ton rythme : 70${NBSP}% après l'examen`,
    legendeSeuil: `seuil 70${NBSP}%`,
    constanceTitre: "Ta constance par matière",
    constanceSous: "L'écart de ta réussite d'une semaine à l'autre, sur 12 semaines, en points. Plus il est bas, plus tu es régulier. ↘ : plus régulier que les 6 semaines d'avant.",
    constanceVide: "Elle se mesure à partir de 3 semaines avec au moins 5 réponses dans une matière.",
    constancePlus: "Plus régulier que les 6 semaines d'avant",
    constanceMoins: "Moins régulier que les 6 semaines d'avant",
    superposer: "Superposer une matière",
    aucune: "Aucune",
    aria: (depuis: number, vers: number, semaines: number, projection: string | null, superposee: string | null) =>
      `Ta maîtrise globale sur ${semaines} semaines, de ${depuis} à ${vers}${NBSP}%` +
      (projection ? `, puis la projection jusqu'à 70${NBSP}% ${projection}` : "") +
      (superposee ? `, avec ${superposee} superposée` : ""),
    legendeSuperposee: (court: string, a: number, b: number | null) => (b === null ? `${court} : ${a}${NBSP}%` : `${court} : ${a} → ${b}${NBSP}%`),
    // la phrase « Ce que ça veut dire »
    /** « +1,5 point par semaine sur le dernier mois » (le texte du nombre est déjà écrit, sa valeur dit le pluriel) */
    parSemaine: (texte: string, valeur: number) => `${texte} ${Math.abs(valeur) >= 2 ? "points" : "point"} par semaine sur le dernier mois`,
    lecturePasse: (depuis: number, vers: number, semaines: number) => `Ta maîtrise globale est passée de ${depuis}${NBSP}% à ${vers}${NBSP}% en ${semaines} semaines.`,
    lectureAtteint: `Tu es déjà au-dessus de 70${NBSP}% : l'enjeu est de garder cette note jusqu'à l'examen.`,
    lectureStable: "Ta maîtrise est stable sur le dernier mois : pour la faire monter, travaille les matières où tu perds le plus de points.",
    lectureRecule: (texte: string, valeur: number) => `Ta maîtrise recule de ${texte} ${Math.abs(valeur) >= 2 ? "points" : "point"} par semaine sur le dernier mois : reprends les matières où tu perds le plus de points.`,
    lecturePasseA: (rythme: string, date: string, avant: string | null) => `${rythme} : à ce rythme, tu passes 70${NBSP}% vers le ${date}${avant ? `, ${avant}` : ""}.`,
    lectureApres: (rythme: string, date: string) => `${rythme} : à ce rythme, tu ne passes 70${NBSP}% que vers le ${date}, après l'examen. Il faut accélérer.`,
    avantExamen: (jours: number) => (jours <= 0 ? "le jour de l'examen" : jours < 14 ? `${jours} jour${jours > 1 ? "s" : ""} avant l'examen` : `environ ${Math.round(jours / 7)} semaines avant l'examen`),
    // la matière superposée
    nonMesuree: (court: string) => `${court} n'est pas encore mesurée : il faut 10 réponses récentes pour la tracer.`,
    recente: (court: string, v: number) => `${court} n'est mesurée que depuis peu (${v}${NBSP}%) : sa courbe se dessinera au fil des semaines.`,
    matiere: (court: string, d: number, semaines: number, recent: number | null): string => {
      const duree = `en ${semaines} semaine${semaines > 1 ? "s" : ""}`;
      const base = d > 0 ? `${court} a pris ${d} ${point(d)} ${duree}` : d < 0 ? `${court} a perdu ${-d} ${point(d)} ${duree}` : `${court} n'a pas bougé ${duree}`;
      const dont = recent === null || d === 0 ? "" : `, dont ${recent > 0 ? "+" : recent < 0 ? "−" : ""}${Math.abs(recent)} sur les 4 dernières`;
      return `${base}${dont}.`;
    },
    matiereSous: "Cette matière reste sous ta maîtrise globale : c'est elle qui tire ta note vers le bas.",
    matiereAu: "Cette matière est au-dessus de ta maîtrise globale : elle tire ta note vers le haut.",
  },
} as const;
