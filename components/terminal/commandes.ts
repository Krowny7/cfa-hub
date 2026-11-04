import { TERMINAL } from "@/lib/voice-terminal";
import { VALEURS } from "./donnees";

// La ligne de commande du Terminal : ce qu'elle comprend. Module sans état.

export const CODES = ["MARCHES", "FICHE", "ETATS", "COMPARER", "COURBE", "AIDE"] as const;
export type Code = (typeof CODES)[number];

export type Ecran = { code: "AIDE" | "MARCHES" | "COMPARER" | "COURBE" } | { code: "FICHE" | "ETATS"; valeur: string };

export type Lecture = { k: "ecran"; ecran: Ecran } | { k: "exercice"; i: number } | { k: "erreur"; message: string };

/** Majuscules, espaces simples ; « MARCHÉS » et « ÉTATS » s'écrivent aussi avec leur accent. */
export const normaliser = (saisie: string) => saisie.trim().toUpperCase().replace(/É/g, "E").split(/ +/).join(" ");

/** La forme écrite d'un écran : « FICHE ORVX ». */
export const cleEcran = (e: Ecran) => ("valeur" in e ? `${e.code} ${e.valeur}` : e.code);

const estValeur = (code: string) => VALEURS.some((v) => v.code === code);

/** Sans valeur, FICHE et ETATS reprennent la dernière ouverte ; un code de valeur seul ouvre sa fiche. */
export function lireCommande(saisie: string, valeurCourante: string, exercices: number): Lecture {
  const [code = "", argument] = normaliser(saisie).split(" ");
  if (code === "FICHE" || code === "ETATS") {
    if (argument && !estValeur(argument)) return { k: "erreur", message: TERMINAL.valeurInconnue(argument, VALEURS.map((v) => v.code).join(", ")) };
    return { k: "ecran", ecran: { code, valeur: argument ?? valeurCourante } };
  }
  if (code === "AIDE" || code === "MARCHES" || code === "COMPARER" || code === "COURBE") return { k: "ecran", ecran: { code } };
  if (estValeur(code)) return { k: "ecran", ecran: { code: "FICHE", valeur: code } };
  if (code === "EXO") {
    const n = Number(argument);
    return Number.isInteger(n) && n >= 1 && n <= exercices ? { k: "exercice", i: n - 1 } : { k: "erreur", message: TERMINAL.exoInconnu(exercices) };
  }
  return { k: "erreur", message: TERMINAL.inconnue(code) };
}

/** Tab : le code complet quand un seul commence ainsi ; sinon rien, et Tab garde son rôle. */
export function completer(saisie: string): string | null {
  const debut = normaliser(saisie);
  const proches = CODES.filter((c) => c.startsWith(debut));
  return debut && proches.length === 1 && proches[0] !== debut ? `${proches[0]} ` : null;
}
