// Le verso structuré des flashcards officielles, en trois cases. Texte brut
// du champ back :
//
//   Indenture = ==contrat issuer ↔ bondholders==
//   En clair : il fixe les features de la bond, les covenants et le collateral.
//   Piège : le credit rating n'y figure pas.
//
// - les lignes avant « En clair : » : À RETENIR. Une phrase courte avec un
//   passage surligné ==…== ; ou une formule en bloc $$…$$, éventuellement
//   précédée d'une ligne courte qui la nomme ou donne le résultat, et suivie
//   d'une ligne de commentaire ; ou une liste « a · b · c » (elle aussi avec
//   un titre facultatif au-dessus) ;
// - « En clair : … » : une ou deux phrases (formules $…$ permises) ;
// - « Piège : … » : facultatif, en dernier.
//
// Découpe pure, sans React. null quand le texte ne suit pas ce format
// (anciennes cartes, cartes des joueurs) : l'affichage d'avant s'applique.

import { marquesOuvertes, passagesInline } from "@/lib/richtext";

export type Retenir =
  | { forme: "texte"; texte: string }
  /**
   * `titre` : les lignes au-dessus de la formule ; `formule` : les lignes
   * $$…$$ qui se suivent ; `suite` : ce qui vient après (peut être vide)
   */
  | { forme: "formule"; titre: string; formule: string; suite: string }
  | { forme: "liste"; titre: string; items: string[] };

export type VersoStructure = {
  retenir: Retenir;
  clair: string;
  piege: string | null;
};

// \s couvre les espaces insécables (U+00A0, U+202F) de la typographie française
const EN_CLAIR = /^en\s+clair\s*:\s*/i;
const PIEGE = /^pi[eè]ge\s*:\s*/i;
const BLOC = /^\$\$[\s\S]+\$\$$/;
const MATH = /\$[^$\n]+?\$/g;
const POINT = /\s+[·•]\s+/;

/**
 * Les éléments d'une ligne « a · b · c » (les points dans une formule $…$ ne
 * comptent pas) ; null s'il y en a moins de deux. Un ==…== ou **…** qui
 * enjambe des points (« ==Identify · Consider · Reflect== ») est refermé au
 * bout de chaque élément et rouvert au suivant : chacun reste surligné.
 */
export function itemsListe(ligne: string): string[] | null {
  if (ligne.includes("$$")) return null;
  // on cache les formules, on coupe, puis on les remet
  const formules: string[] = [];
  const masque = ligne.replace(MATH, (m) => `\u0000${formules.push(m) - 1}\u0000`);
  const items = masque
    .split(POINT)
    .map((x) => x.replace(/\u0000(\d+)\u0000/g, (_, k: string) => formules[Number(k)]).trim())
    .filter(Boolean);
  if (items.length < 2) return null;
  let ouverts: string[] = [];
  return items.map((it) => {
    const x = ouverts.join("") + it;
    ouverts = marquesOuvertes(x);
    return x + [...ouverts].reverse().join("");
  });
}

/** Vrai si le texte porte un passage surligné ==…== : c'est alors lui, l'idée à retenir. */
export function aSurligne(texte: string): boolean {
  return texte.split("\n").some((l) => passagesInline(l).some((p) => p.surligne));
}

// ——— Largeur d'une formule en bloc ———
// Une estimation, en em de KaTeX, de quoi savoir si une formule tient sur un
// téléphone (et de combien la réduire), pas une mise en page : signes de
// relation et d'opération avec leurs espaces, \text en romain, fractions à
// la largeur de leur plus long étage, indices réduits, limites d'une somme
// sous le signe.

const FRACTIONS = new Set(["frac", "dfrac", "tfrac", "cfrac"]);
const TEXTES = new Set(["text", "mathrm", "textrm", "textbf", "mathbf", "textit", "mathit", "operatorname"]);
const ACCENTS = new Set(["bar", "hat", "tilde", "overline", "vec", "widehat", "widetilde", "underline", "boldsymbol"]);
const SANS_LARGEUR = new Set(["left", "right", "displaystyle", "textstyle", "scriptstyle", "big", "Big", "bigg", "Bigg", "limits", "nolimits"]);
const COMMANDES: Record<string, number> = {
  qquad: 2, quad: 1, ",": 0.17, ":": 0.22, ";": 0.28, "!": -0.17, " ": 0.33, "%": 0.83, "{": 0.5, "}": 0.5, "$": 0.5,
  times: 1.22, cdot: 0.72, pm: 1.22, mp: 1.22, div: 1.22,
  approx: 1.33, leq: 1.33, geq: 1.33, le: 1.33, ge: 1.33, neq: 1.33, ne: 1.33, equiv: 1.33, sim: 1.33, propto: 1.33,
  to: 1.56, rightarrow: 1.56, Rightarrow: 1.56, leftarrow: 1.56, Leftrightarrow: 1.56,
  sum: 1.44, prod: 1.44, int: 0.9,
  dots: 1.17, cdots: 1.17, ldots: 1.17,
};

function largeurCaractere(c: string): number {
  if (/\s/.test(c) || c === "&") return 0;
  if ("=<>".includes(c)) return 1.33;
  if ("+-−".includes(c)) return 1.22;
  if ("()[]|".includes(c)) return 0.39;
  if (",;".includes(c)) return 0.45;
  if (".'".includes(c)) return 0.28;
  if (c === "/") return 0.5;
  if (/[A-Z]/.test(c)) return 0.72;
  if (/[a-z0-9]/.test(c)) return 0.52;
  return 0.75; // Δ, ×, ≈… tapés tels quels
}

const largeurTexte = (t: string) => [...t.replace(/\\(.)/g, "$1")].reduce((a, c) => a + (c === " " ? 0.33 : /[A-Z%]/.test(c) ? 0.72 : 0.5), 0);

function largeurTex(s: string): number {
  let i = 0;
  let w = 0;
  // les limites d'une somme en bloc se posent dessous et dessus, pas à côté
  let limites = 0;
  const blancs = () => {
    while (i < s.length && /\s/.test(s[i])) i++;
  };
  // un argument : {…} ou un seul jeton
  const argument = (): string => {
    blancs();
    if (s[i] === "{") {
      const debut = ++i;
      for (let prof = 1; i < s.length; i++) {
        if (s[i] === "\\") i++;
        else if (s[i] === "{") prof++;
        else if (s[i] === "}" && --prof === 0) return s.slice(debut, i++);
      }
      return s.slice(debut);
    }
    if (s[i] === "\\") {
      const m = /^\\([a-zA-Z]+|[\s\S])/.exec(s.slice(i));
      i += m ? m[0].length : 1;
      return m ? m[0] : "";
    }
    return s[i++] ?? "";
  };
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === "_" || c === "^") {
      i++;
      let script = largeurTex(argument()) * 0.7;
      blancs();
      // indice et exposant superposés : le plus large des deux
      if ((s[i] === "_" || s[i] === "^") && s[i] !== c) {
        i++;
        script = Math.max(script, largeurTex(argument()) * 0.7);
      }
      w += limites ? Math.max(0, script - limites) : script;
      limites = 0;
      continue;
    }
    limites = 0;
    if (c === "{") {
      w += largeurTex(argument());
      continue;
    }
    if (c !== "\\") {
      i++;
      w += largeurCaractere(c);
      continue;
    }
    const m = /^\\([a-zA-Z]+|[\s\S])/.exec(s.slice(i));
    const nom = m ? m[1] : "";
    i += m ? m[0].length : 1;
    if (FRACTIONS.has(nom)) {
      const haut = largeurTex(argument());
      const bas = largeurTex(argument());
      w += Math.max(haut, bas) * (nom === "tfrac" ? 0.7 : 1) + 0.24;
    } else if (TEXTES.has(nom)) w += largeurTexte(argument());
    else if (ACCENTS.has(nom)) w += largeurTex(argument());
    else if (nom === "sqrt") w += largeurTex(argument()) + 0.85;
    else if (nom === "begin" || nom === "end") argument();
    else if (SANS_LARGEUR.has(nom)) continue;
    else if (nom in COMMANDES) {
      w += COMMANDES[nom];
      if (nom === "sum" || nom === "prod") limites = COMMANDES[nom];
    } else w += 0.62; // lettre grecque, symbole
  }
  return w;
}

/** Largeur estimée d'une formule (lignes $$…$$, lignes d'un aligned), en em de KaTeX : celle de sa plus longue ligne. */
export function largeurFormule(formule: string): number {
  return Math.max(
    0,
    ...formule
      .split("\n")
      .flatMap((l) => l.replace(/^\s*\$\$|\$\$\s*$/g, "").split(/\\\\/))
      .map(largeurTex)
  );
}

// Sur téléphone, la case d'une fiche laisse environ 235 px à une formule
// (séance : 255 px moins le blanc de fondu ; la pile en laisse un peu plus),
// soit 11,5 em de KaTeX à 17 px. Au-delà, la formule est réduite d'autant,
// jusqu'à 70 % ; plus large encore, elle défile, son bout fondu le signale.
const LARGEUR_TELEPHONE = 11.5;
const REDUCTION_MAX = 0.7;

/** Le facteur de taille d'une formule sur téléphone : 1 si elle tient, sinon de quoi la faire tenir (0,7 au moins). */
export function echelleFormule(formule: string): number {
  const l = largeurFormule(formule);
  if (l <= LARGEUR_TELEPHONE) return 1;
  return Math.max(REDUCTION_MAX, Math.floor((LARGEUR_TELEPHONE / l) * 100) / 100);
}

function lireRetenir(lignes: string[]): Retenir {
  const iBloc = lignes.findIndex((l) => BLOC.test(l));
  if (iBloc !== -1) {
    let fin = iBloc;
    while (fin < lignes.length && BLOC.test(lignes[fin])) fin++;
    return {
      forme: "formule",
      titre: lignes.slice(0, iBloc).join("\n"),
      formule: lignes.slice(iBloc, fin).join("\n"),
      suite: lignes.slice(fin).join("\n"),
    };
  }
  const items = itemsListe(lignes[lignes.length - 1]);
  if (items) return { forme: "liste", titre: lignes.slice(0, -1).join("\n"), items };
  return { forme: "texte", texte: lignes.join("\n") };
}

/** Le verso découpé en { retenir, clair, piege }, ou null s'il ne suit pas le format. */
export function decouperVerso(back: string | null | undefined): VersoStructure | null {
  const lignes = (back ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trim());
  const iClair = lignes.findIndex((l) => EN_CLAIR.test(l));
  if (iClair === -1) return null;

  const avant = lignes.slice(0, iClair).filter(Boolean);
  // rien à retenir, ou un piège avant l'explication : pas notre format
  if (!avant.length || avant.some((l) => PIEGE.test(l))) return null;

  const iPiege = lignes.findIndex((l, i) => i > iClair && PIEGE.test(l));
  const fin = iPiege === -1 ? lignes.length : iPiege;
  const clair = [lignes[iClair].replace(EN_CLAIR, ""), ...lignes.slice(iClair + 1, fin)].filter(Boolean).join("\n");
  if (!clair) return null;
  const piege = iPiege === -1 ? "" : [lignes[iPiege].replace(PIEGE, ""), ...lignes.slice(iPiege + 1)].filter(Boolean).join("\n");

  return { retenir: lireRetenir(avant), clair, piege: piege || null };
}
