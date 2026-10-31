// La voix des trois cartes du bilan de la page Moi « La synthèse » : Tes
// lacunes, Tes forces, Où gagner des points. Même règles que lib/voice-moi.ts
// (tutoiement, nombres à l'espace insécable, lib/voice.ts : nombre, pct) ; ces
// textes vivent à part pour que les cartes s'écrivent sans toucher au fichier
// des autres. Les phrases à passages en gras sont des listes de segments
// (Segment, lib/voice-moi.ts), les autres des chaînes.
import { NBSP, nombre, pct, pluriel } from "@/lib/voice";
import type { Segment } from "@/lib/voice-moi";

const enLettres = (n: number) => ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"][n] ?? nombre(n);

/** « A », « A et B », « A, B et C ». */
function enListe(a: readonly string[]): string {
  return a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} et ${a[a.length - 1]}`;
}

/** Des points de note : « 8 points », « 2,5 points », « 1,4 point » (au singulier sous 2). */
export function pointsDeNote(v: number): string {
  const entier = Math.abs(v - Math.round(v)) < 0.05;
  const texte = entier ? String(Math.round(v)) : (Math.round(v * 10) / 10).toString().replace(".", ",");
  return `${texte}${NBSP}${v < 2 ? "point" : "points"}`;
}

export const BILAN = {
  pied: "Ce que ça veut dire :",

  // ── Tes lacunes ──
  lacunes: {
    titre: "Tes lacunes",
    sous: (k: number) => (k > 1 ? `Tes ${enLettres(k)} notions les plus faibles, toutes matières.` : k === 1 ? "Ta seule notion mesurée pour l'instant." : "Tes notions les plus faibles, toutes matières."),
    compteur: (seuil: number) => `sous ${pct(seuil)}`,
    compteurAria: (n: number, seuil: number) => `${pluriel(n, "notion", "notions")} sous ${pct(seuil)}`,
    liste: "Tes notions les plus faibles",
    /** « Fixed Income · à 39 points du seuil » (sous le seuil) ou « … · 3 points au-dessus du seuil » */
    ecartSous: (points: number) => `à ${pluriel(points, "point", "points")} du seuil`,
    ecartAu: (points: number) => (points === 0 ? "pile au seuil" : `${pluriel(points, "point", "points")} au-dessus du seuil`),
    barreAria: (nom: string, valeur: number, seuil: number) => `${nom} : ${pct(valeur)}, seuil ${pct(seuil)}`,
    reviser: "Réviser",
    entrainer: "S'entraîner",
    reviserAria: (nom: string) => `Réviser ${nom}`,
    entrainerAria: (nom: string) => `S'entraîner sur ${nom} : un Atelier d'environ 15 minutes`,
    /** le bouton d'encre : l'Atelier de la notion la plus basse */
    atelier: "Atelier sur ta pire notion",
    atelierDuree: "15 min",
    atelierAria: (nom: string) => `Atelier sur ta pire notion · 15 min : ${nom}`,
    notions: (n: number) => `Les ${nombre(n)} notions →`,
    carte: "La carte du programme →",
    /** aucune notion mesurée */
    vide: (min: number) => `Il faut ${min} réponses récentes à une notion pour la juger : tes lacunes apparaissent ici dès la première.`,
    entrainerEn: (court: string) => `S'entraîner en ${court}`,
    lire: {
      seule: (matiere: string, valeur: number) => `ta notion la plus faible est en ${matiere} (${pct(valeur)})`,
      toutes: (k: number, matiere: string) => `tes ${enLettres(k)} pires notions sont toutes en ${matiere}`,
      groupe: (m: number, k: number, matiere: string, pire: string | null) => `${enLettres(m)} de tes ${enLettres(k)} pires notions sont en ${matiere}${pire ? `, la pire en ${pire}` : ""}`,
      dispersees: (k: number, pire: string) => `tes ${enLettres(k)} pires notions sont dans ${enLettres(k)} matières différentes, la pire en ${pire}`,
      /** la fin de phrase : la matière où l'on gagne le plus de points (celle de la pire notion, une autre des cinq, ou absente) */
      gainPire: " ; c'est aussi la matière où tu peux gagner le plus de points.",
      gainAutre: (matiere: string) => ` ; ${matiere} est aussi la matière où tu peux gagner le plus de points.`,
      fin: ".",
      aucuneSous: (seuil: number, matiere: string, valeur: number) => `aucune notion mesurée n'est sous ${pct(seuil)} ; la plus basse est en ${matiere} (${pct(valeur)}).`,
    },
  },

  // ── Tes forces ──
  forces: {
    titre: "Tes forces",
    sous: (k: number) => (k > 1 ? `Tes ${enLettres(k)} notions les plus solides : à garder au chaud.` : k === 1 ? "Ta notion la plus solide : à garder au chaud." : "Tes notions les plus solides : à garder au chaud."),
    liste: "Tes notions les plus solides",
    auDessus: (points: number) => (points === 0 ? "pile au seuil" : `${pluriel(points, "point", "points")} au-dessus du seuil`),
    barreAria: (nom: string, valeur: number, seuil: number) => `${nom} : ${pct(valeur)}, seuil ${pct(seuil)}`,
    vide: (seuil: number, min: number) => `Ta première force arrive à ${pct(seuil)} sur ${min} réponses récentes.`,
    atouts: {
      titre: "Tes atouts face aux joueurs",
      liste: "Tes avances sur la moyenne des joueurs",
      note: (n: number, sur: number) => `Points d'avance sur la moyenne, dans ${pluriel(n, "matière", "matières")} sur ${nombre(sur)}.`,
      aucun: "Pas encore d'avance sur la moyenne des joueurs, dans aucune matière.",
    },
    defier: "Défier un ami",
    entretenir: "Entretenir mes forces →",
    sEntrainer: "S'entraîner →",
    lire: {
      seule: (matiere: string, valeur: number) => `ta notion la plus solide est en ${matiere} (${pct(valeur)}).`,
      toutes: (k: number, matiere: string) => `tes ${enLettres(k)} notions les plus solides sont toutes en ${matiere}.`,
      liste: (k: number, matieres: readonly string[]) => `tes ${enLettres(k)} notions les plus solides sont en ${enListe(matieres)}.`,
      atout: (matiere: string, points: number) => ` Face aux autres joueurs, ton plus gros avantage est en ${matiere} (+${nombre(points)}${NBSP}points).`,
    },
  },

  // ── Où gagner des points ──
  gagner: {
    titre: "Où gagner des points",
    sous: (seuil: number) => `Chaque matière remontée à ${pct(seuil)}, en points de note : son poids × ce qui lui manque.`,
    liste: "Les matières qui te coûtent le plus de points",
    ligneAria: (rang: number, court: string, gain: string) => `${rang}. ${court} : ${gain} points de note à gagner`,
    paliers: {
      titre: "Ta note estimée, si tu les remontes",
      aujourdhui: "aujourd'hui",
      trois: (seuil: number, passe: boolean): Segment[] => (passe ? ["avec les 3 premières : ", { b: "tu passes la barre" }] : [`avec les 3 premières à ${pct(seuil)}`]),
      /** « avec les 7 à 70 % » ou, une fois la barre franchie, « avec les 7 : tu passes la barre » */
      toutes: (n: number, seuil: number, passe: boolean): Segment[] =>
        n === 1 ? (passe ? ["avec elle : ", { b: "tu passes la barre" }] : [`avec elle à ${pct(seuil)}`]) : passe ? [`avec les ${n} : `, { b: "tu passes la barre" }] : [`avec les ${n} à ${pct(seuil)}`],
      aria: (prep: number, trois: number | null, toutes: number, n: number, seuil: number) =>
        trois === null
          ? `${pct(prep)} aujourd'hui, ${pct(toutes)} avec ${n === 1 ? "elle remontée" : `les ${n} remontées`} à ${pct(seuil)}`
          : `${pct(prep)} aujourd'hui, ${pct(trois)} avec les trois premières, ${pct(toutes)} avec les ${n}`,
    },
    pasMesurees: (n: number) => `${pluriel(n, "matière", "matières")} pas encore mesurée${n > 1 ? "s" : ""}, hors de ce calcul.`,
    lire: {
      une: (court: string, valeur: string) => `${court} pèse ${valeur} de note à elle seule. Commence par elle.`,
      plusieurs: (k: number, valeur: string, court: string) => `${enLettres(k)} matières valent ${valeur} de note à elles seules. Commence par ${court}.`,
    },
    commencer: (court: string) => `Commencer par ${court}`,
    commencerAria: (court: string, gain: string) => `Commencer par ${court} : jusqu'à ${gain} points de note à gagner`,
    /** toutes les matières mesurées passent la barre */
    toutes70: (seuil: number) => `Toutes tes matières mesurées passent ${pct(seuil)}.`,
    toutes70Suite: "Continue d'entretenir les plus basses pour garder de la marge.",
    /** aucune matière mesurée */
    aucune: (min: number) => `Aucune matière n'est encore mesurée : il faut ${min} réponses dans une matière pour la juger.`,
    faire: (court: string) => `Faire 10 questions en ${court}`,
  },
};
