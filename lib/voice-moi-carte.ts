// Les textes de la « Carte du programme » de la page Moi « La synthèse »
// (components/moi/synthese/CarteProgramme.tsx). Fichier à part des autres
// cartes : l'agent de branchement peut le laisser ici ou l'ajouter à `SYN`
// (lib/voice-moi.ts) sous la clé `carte`, sans rien changer d'autre.
// Tutoiement, nombres à l'espace insécable (lib/voice.ts : nombre, pct).

import { NBSP, nombre, pct } from "@/lib/voice";

const pluriel = (n: number, un: string, plusieurs: string) => `${nombre(n)} ${n > 1 ? plusieurs : un}`;

/** « A », « A et B », « A, B et C ». */
function enListe(a: readonly string[]): string {
  return a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} et ${a[a.length - 1]}`;
}

/** Le repli sur 90 jours (sans maitrise_synthese) dit « pas vue depuis 90 j » là où la mesure unique dit « jamais vue ». */
type Source = "unique" | "90j";
const pasVue = `pas vue depuis 90${NBSP}j`;

export const CARTE = {
  titre: "Carte du programme",
  /** ordinateur : on clique une case ou une matière */
  sous: (total: number) => `${nombre(total)} notions, une case chacune. La couleur dit où tu en es ; clique une case pour la réviser, une matière pour l'isoler.`,
  /** téléphone : on touche une matière, ses notions s'ouvrent dessous */
  sousTel: (total: number) => `${nombre(total)} notions, une case chacune. La couleur dit où tu en es ; touche une matière pour lire ses notions juste dessous.`,
  compteur: (n: number, seuil: number) => `${n > 1 ? "notions" : "notion"} sous ${pct(seuil)}`,
  legende: {
    aria: "Légende des couleurs",
    rouge: (bas: number) => `sous ${pct(bas)}`,
    ambre: (bas: number, seuil: number) => `${bas} à ${pct(seuil)}`,
    acquise: "acquise",
    enCours: (min: number) => `en cours (moins de ${min} réponses)`,
    jamais: (source: Source) => (source === "90j" ? pasVue : "jamais vue"),
  },
  /** le lien texte qui lève l'isolation d'une matière */
  raz: (matieres: number) => `Revoir les ${matieres} matières`,
  grille: { aria: "Les notions du programme, matière par matière", notionsDe: (court: string) => `Notions de ${court}` },
  /** la colonne des matières */
  matiere: {
    /** « Éthique : 58 %. Isoler ses notions. » ; une fois isolée : « … Revoir les 10 matières. » */
    titre: (court: string, valeur: string, isolee: boolean, matieres: number) => `${court} : ${valeur}. ${isolee ? `Revoir les ${matieres} matières.` : "Isoler ses notions."}`,
    valeurAria: (p: number | null, provisoire: boolean) => (p === null ? "pas encore mesurée" : provisoire ? `environ ${pct(p)}, mesure provisoire` : pct(p)),
  },
  /** les cases : le chiffre écrit, et le nom lu / l'infobulle */
  cases: {
    tiret: "—",
    valeurEnCours: (n: number, min: number) => `${n}/${min}`,
    mesuree: (nom: string, matiere: string, p: number) => `${nom} (${matiere}) : ${pct(p)}. Réviser cette notion.`,
    enCours: (nom: string, matiere: string, n: number, min: number) => `${nom} (${matiere}) : en cours, ${n} réponse${n > 1 ? "s" : ""} sur ${min}. Réviser cette notion.`,
    jamais: (nom: string, matiere: string, source: Source) => `${nom} (${matiere}) : ${source === "90j" ? "pas vue depuis 90 jours" : "jamais vue"}. Ouvrir cette notion.`,
  },
  /** le panneau qui s'ouvre sous la grille au téléphone */
  panneau: {
    kicker: "Ses notions",
    astuce: "Touche une matière pour lire ses notions juste dessous.",
    aria: "Notions de la matière choisie",
    valeurJamais: (source: Source) => (source === "90j" ? "pas vue" : "jamais vue"),
    /** « 3 sous 70 % · 1 en cours · 2 jamais vues » ; « aucune notion mesurée » quand il n'y a rien d'autre à dire */
    resume: (sous: number, mesurees: number, enCours: number, jamais: number, source: Source, seuil: number) => {
      const morceaux = [
        mesurees > 0 ? `${nombre(sous)} sous ${pct(seuil)}` : null,
        enCours > 0 ? `${nombre(enCours)} en cours` : null,
        jamais > 0 ? (source === "90j" ? `${nombre(jamais)} pas vue${jamais > 1 ? "s" : ""} depuis 90${NBSP}j` : `${nombre(jamais)} jamais vue${jamais > 1 ? "s" : ""}`) : null,
      ].filter((x): x is string => x !== null);
      return morceaux.length ? morceaux.join(" · ") : "aucune notion mesurée";
    },
  },
  /** « Ce que ça veut dire » */
  lire: {
    pied: "Ce que ça veut dire :",
    aucune: (min: number) => `Aucune notion n'est encore mesurée : il faut ${min} réponses récentes à une notion pour la juger.`,
    global: {
      sous: (n: number, rouges: number, seuil: number, bas: number) =>
        n > 0 ? `${pluriel(n, "notion", "notions")} sous ${pct(seuil)}, dont ${nombre(rouges)} sous ${pct(bas)}.` : `Aucune notion mesurée sous ${pct(seuil)}.`,
      tops: (liste: string[], max: number) => `${enListe(liste)} en ${liste.length > 1 ? `comptent ${nombre(max)} chacune` : `compte ${nombre(max)}`}.`,
      jamais: (n: number, source: Source) => {
        const les = n > 1;
        const suite = `ouvre-${les ? "les" : "la"} avant qu'${les ? "elles ne te coûtent" : "elle ne te coûte"} des points le jour J.`;
        return source === "90j" ? `${nombre(n)} ${les ? "notions pas vues" : "notion pas vue"} depuis 90${NBSP}j : ${suite}` : `${nombre(n)} ${les ? "notions jamais vues" : "notion jamais vue"} : ${suite}`;
      },
      enCours: (n: number) => `${pluriel(n, "notion", "notions")} en cours : encore quelques réponses et ${n > 1 ? "elles comptent" : "elle compte"}.`,
    },
    iso: {
      tete: (court: string, sous: number, jamais: number, enCours: number, source: Source, seuil: number) =>
        `${court} : ${sous > 0 ? `${pluriel(sous, "notion", "notions")} sous ${pct(seuil)}` : `aucune notion sous ${pct(seuil)}`}` +
        (jamais > 0 ? `, ${nombre(jamais)} ${source === "90j" ? `pas vue${jamais > 1 ? "s" : ""} depuis 90${NBSP}j` : `jamais vue${jamais > 1 ? "s" : ""}`}` : "") +
        (enCours > 0 ? `, ${nombre(enCours)} en cours` : "") +
        ".",
      suite: (sous: number, jamais: number, enCours: number, source: Source) =>
        sous > 0
          ? "Commence par la case la plus rouge."
          : jamais > 0
            ? source === "90j"
              ? `Ouvre ${jamais > 1 ? "celles" : "celle"} que tu n'as pas vue${jamais > 1 ? "s" : ""} depuis 90${NBSP}j pour avancer.`
              : `Ouvre ${jamais > 1 ? "les notions jamais vues" : "la notion jamais vue"} pour avancer.`
            : enCours > 0
              ? `Encore quelques réponses et ${enCours > 1 ? "elles comptent" : "elle compte"}.`
              : "Rien à rattraper ici.",
    },
  },
};
