import { NBSP, nombre } from "@/lib/voice";

// Les mots des cas pratiques de FSA (app/cas-pratiques, components/cas-fsa) et leurs petits
// formats, déterministes : même rendu côté serveur et navigateur.

const pluriel = (n: number, mot: string) => (n > 1 ? `${mot}s` : mot);

/** « 53 528 », « 21,86 », « 66,2 » : deux décimales au plus, sans zéro final. */
export function chiffre(v: number): string {
  const centimes = Math.round(Math.abs(v) * 100);
  const reste = centimes % 100;
  const decimales = reste === 0 ? "" : "," + String(reste).padStart(2, "0").replace(/0$/, "");
  return nombre(Math.floor(centimes / 100)) + decimales;
}

/** Une case d'état financier : les charges entre parenthèses comme dans le document, un tiret pour zéro. */
export function cellule(v: number | null): string {
  if (v === null) return "";
  if (v === 0) return "–";
  return v < 0 ? `(${chiffre(v)})` : chiffre(v);
}

/** « 66,2 % », « 1,58x », « 309,9 jours » */
export function avecUnite(v: number, unite?: string): string {
  const n = (v < 0 ? "−" : "") + chiffre(v);
  if (!unite) return n;
  return unite === "x" ? `${n}x` : `${n}${NBSP}${unite}`;
}

/** Les deux colonnes d'un état, tirées de l'intitulé de l'exercice. */
export function anneesDe(exercice: string): { n: string; n1: string } {
  const an = /[0-9]{4}/.exec(exercice)?.[0];
  return an ? { n: an, n1: String(Number(an) - 1) } : { n: "N", n1: "N-1" };
}

export const CAS = {
  titre: "Cas pratiques",
  kicker: "S'entraîner",
  sous: "De vrais états financiers, et des questions pour y appliquer le programme, avec ou sans tuto.",
  /** la carte de la page S'entraîner */
  carteTexte: "De vrais états financiers, lus question par question.",
  retour: "Tous les cas",
  avancement: (a: number, b: number) => `${nombre(a)} / ${nombre(b)} questions`,
  termine: "Cas terminé",

  etatsLibelle: "Les états financiers",
  etatsOnglets: "Choisir l'état financier",
  onglets: { resultat: "Résultat", bilan: "Bilan", flux: "Flux", extraits: "Extraits" },
  ligne: "Ligne",
  document: "Lire le document original",

  vuesLibelle: "Afficher la question ou les états financiers",
  vueQuestion: "Question",
  vueEtats: "États financiers",

  railLibelle: "Les questions du cas",
  pas: (i: number, notion: string, issue?: "juste" | "revelee") => `Question ${i} : ${notion}${issue === "juste" ? ", trouvée" : issue === "revelee" ? ", révélée" : ""}`,
  questionN: (i: number, n: number) => `Question ${i} sur ${n}`,
  tuto: "Avec tuto",
  saisie: "Ta réponse",
  verifier: "Vérifier",
  reveler: "Révéler la réponse",
  faux: "Ce n'est pas ça. Reprends le calcul, ou révèle la réponse.",
  illisible: "Tape un nombre, par exemple 12,5.",
  juste: "Juste :",
  reponse: "Réponse :",
  corrige: "Le corrigé",
  lecture: "Ce que ça veut dire",
  suivante: "Question suivante",
  voirBilan: "Voir le bilan",

  bilan: (justes: number, revelees: number) => `${nombre(justes)} ${pluriel(justes, "trouvée")}, ${nombre(revelees)} ${pluriel(revelees, "révélée")}`,
  recommencer: "Recommencer le cas",
};
