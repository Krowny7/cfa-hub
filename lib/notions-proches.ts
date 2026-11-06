import { plat, type NotionDispo } from "@/lib/notions-choix";

// Quand les libellés répondent peu ou pas à la recherche : les mots du texte des questions, en anglais
// comme en français, mènent aux concepts où ils reviennent. L'index public/notions-mots.json vient des
// questions (scripts/notions/mots-cles.ts) ; SYNONYMES ne garde que ce qu'elles ne disent jamais.

/** cibles : [notion, concept ou null, questions] ; mots : le mot ou l'expression de deux mots → [cible, questions où il paraît, cible, questions…] */
export type IndexMots = { cibles: [string, string | null, number][]; mots: Record<string, number[]> };
export type NotionProche = { notion: string; concepts: string[] };

const MAX_RESULTATS = 8;
/** une partie seulement des termes est reconnue : moins de résultats, ils sont moins sûrs */
const MAX_RESULTATS_PARTIELS = 4;
/** un concept qui porte le terme dans son libellé passe devant ceux qui le citent en passant */
const BONUS_LIBELLE = 4;
const MAX_PREFIXES = 25;
/** sous cette part du meilleur résultat, le mot n'est plus qu'une rencontre de hasard */
const SEUIL_RELATIF = 0.15;

// ni l'index ni la recherche ne les retiennent
const VIDES = new Set(
  "the and for are was were with from that this these those which what when where who whom whose how why than then its his her their our your not but all any each most more less least some such only into over under about after before between during both can could would should may might must will shall has have had been being does did also very per via the une des les aux dans par pour sur sous avec sans est sont etre avoir qui que quoi dont plus moins tres ces ses leur leurs cette son sa nos vos entre ainsi donc mais car lors comme".split(" "),
);

// Les sigles et les noms français que les questions n'emploient pas → les mots qu'elles emploient.
// Écrits comme motsDe les rend : sans accents, sans s final, sans petits mots.
const SYNONYMES = new Map<string, string>(Object.entries({
  mnpi: "material nonpublic",
  ppp: "purchasing power",
  "r squared": "coefficient determination",
  "r carre": "coefficient determination",
  r2: "coefficient determination",
  "r²": "coefficient determination",
  qe: "monetary policy",
  "quantitative easing": "monetary policy",
  "agency cost": "cout agence",
  "credit bail": "lease",
  "ecart acquisition": "goodwill",
  survaleur: "goodwill",
  "action privilegiee": "preferred stock",
  "fond couverture": "hedge fund",
  "fond speculatif": "hedge fund",
  "taux rendement actuariel": "yield maturity",
  "rendement echeance": "yield maturity",
  "benefice action": "eps",
  bpa: "eps",
  medaf: "capm",
  cmpc: "wacc",
  "cout moyen pondere": "wacc",
  van: "npv",
  tri: "irr",
  pib: "gdp",
  bce: "central bank",
  "capital investissement": "private equity",
  "option achat": "call option",
  "option vente": "put option",
  "seuil rentabilite": "breakeven",
  bfr: "working capital",
  "besoin fond roulement": "working capital",
  dcf: "discounted cash",
  fcf: "free cash",
  "converted method": "convertible bond",
  "short selling": "vente decouvert",
  "short sale": "vente decouvert",
  "ratio sharpe": "sharpe ratio",
  "percentage completion": "revenue recognition",
  heteroskedasticity: "linear regression",
  heteroscedasticity: "linear regression",
  homoskedasticity: "linear regression",
  homoscedasticity: "linear regression",
}));

/** La liste d'un terme : « constructor » ou « __proto__ » tapés dans la recherche ne sont pas des clés de l'index. */
const entree = (terme: string, index: IndexMots): number[] | undefined => (Object.prototype.hasOwnProperty.call(index.mots, terme) ? index.mots[terme] : undefined);

/** Les mots d'un texte : sans accents ni majuscules, au singulier, sans les mots vides ni les nombres. */
export function motsDe(texte: string): string[] {
  const bruts = plat(texte).match(/[a-z0-9]+(?:\/[a-z0-9]+)*/g) ?? [];
  const mots: string[] = [];
  for (const m of bruts) {
    if (m.length < 3 || /^\d/.test(m) || VIDES.has(m)) continue;
    if (m.length > 5 && m.endsWith("ies")) mots.push(`${m.slice(0, -3)}y`);
    else mots.push(m.length > 3 && m.endsWith("s") && !m.endsWith("ss") ? m.slice(0, -1) : m);
  }
  return mots;
}

/** Combien de lettres séparent deux mots (une inversion compte pour une), sans dépasser max. */
export function ecart(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let avant2: number[] = [];
  let avant = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const ligne = [i];
    let mini = i;
    for (let j = 1; j <= b.length; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(avant[j] + 1, ligne[j - 1] + 1, avant[j - 1] + cout);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, avant2[j - 2] + 1);
      ligne.push(d);
      mini = Math.min(mini, d);
    }
    if (mini > max) return max + 1;
    avant2 = avant;
    avant = ligne;
  }
  return avant[b.length];
}

type Vocabulaire = { mots: string[]; expressions: [string, string][] };
const vocabulaires = new WeakMap<IndexMots, Vocabulaire>();
function vocabulaire(index: IndexMots): Vocabulaire {
  let v = vocabulaires.get(index);
  if (!v) {
    const cles = Object.keys(index.mots);
    v = { mots: cles.filter((w) => !w.includes(" ")), expressions: cles.filter((w) => w.includes(" ")).map((w) => w.split(" ") as [string, string]) };
    vocabulaires.set(index, v);
  }
  return v;
}

/** Combien de questions portent ce terme, d'après l'index. */
function frequence(terme: string, index: IndexMots): number {
  const liste = entree(terme, index) ?? [];
  let n = 0;
  for (let i = 1; i < liste.length; i += 2) n += liste[i];
  return n;
}

/** Les mots cherchés, une fois les sigles et les noms français ramenés aux mots des questions. */
function motsCherches(texte: string): string[] {
  const entier = SYNONYMES.get(plat(texte).trim());
  if (entier) return motsDe(entier);
  let suite = ` ${motsDe(texte).join(" ")} `;
  for (const [de, vers] of SYNONYMES) suite = suite.replaceAll(` ${de} `, ` ${vers} `);
  return suite.trim().split(" ").filter(Boolean);
}

/** L'expression que forment deux mots voisins, une faute de frappe comprise : « sharp ratio » pour « sharpe ratio ». */
function expressionDe(a: string, b: string, index: IndexMots): string | null {
  const exacte = `${a} ${b}`;
  if (entree(exacte, index)) return exacte;
  if (Math.min(a.length, b.length) < 4) return null;
  const permis = Math.min(a.length, b.length) >= 6 ? 2 : 1;
  let meilleure: string | null = null;
  let note = -1;
  for (const [x, y] of vocabulaire(index).expressions) {
    const d = ecart(a, x, permis) + ecart(b, y, permis);
    if (d > permis) continue;
    const n = frequence(`${x} ${y}`, index) / (d * d);
    if (n > note) {
      note = n;
      meilleure = `${x} ${y}`;
    }
  }
  return meilleure;
}

/** Les termes à chercher : deux mots voisins que l'index connaît ensemble restent une expression (« carried interest »). */
function termesDe(texte: string, index: IndexMots): string[] {
  const mots = motsCherches(texte);
  const termes: string[] = [];
  for (let i = 0; i < mots.length; i++) {
    const deux = i + 1 < mots.length ? expressionDe(mots[i], mots[i + 1], index) : null;
    if (deux) {
      termes.push(deux);
      i++;
    } else termes.push(mots[i]);
  }
  return [...new Set(termes)];
}

/** Le mot tel quel, sinon ceux qui commencent par lui, sinon son radical (« bootstrapping »), sinon le plus courant à une ou deux lettres près. */
function motsVoisins(mot: string, index: IndexMots): string[] {
  if (entree(mot, index)) return [mot];
  const tous = vocabulaire(index).mots;
  if (mot.length >= 4) {
    const debut = tous.filter((w) => w.startsWith(mot));
    if (debut.length > 0) return debut.sort((a, b) => frequence(b, index) - frequence(a, index)).slice(0, MAX_PREFIXES);
  }
  if (mot.length >= 6) {
    const radicaux = tous.filter((w) => w.length >= 5 && w.length >= mot.length - 4 && mot.startsWith(w)).sort((a, b) => b.length - a.length);
    if (radicaux.length > 0) return [radicaux[0]];
  }
  if (mot.length < 5) return [];
  const max = mot.length >= 8 ? 2 : 1;
  let meilleur: string | null = null;
  let note = -1;
  for (const w of tous) {
    const d = ecart(mot, w, max);
    if (d > max) continue;
    const n = frequence(w, index) / (d * d);
    if (n > note) {
      note = n;
      meilleur = w;
    }
  }
  return meilleur ? [meilleur] : [];
}

/** Pour un terme cherché : la cible → ses questions, parmi les cibles admises. */
function occurrences(terme: string, index: IndexMots, admise: (cible: number) => boolean): Map<number, number> {
  const res = new Map<number, number>();
  for (const w of terme.includes(" ") ? [terme] : motsVoisins(terme, index)) {
    const liste = entree(w, index) ?? [];
    for (let i = 0; i < liste.length; i += 2) {
      if (admise(liste[i])) res.set(liste[i], Math.max(res.get(liste[i]) ?? 0, liste[i + 1]));
    }
  }
  return res;
}

/** Les notions et concepts proches de la recherche, parmi ce que la source propose, les plus nets d'abord. */
export function chercherProches(texte: string, index: IndexMots, dispo: NotionDispo[]): NotionProche[] {
  const notions = new Map(dispo.map((n) => [n.notion, n]));
  const admise = (cible: number) => {
    const c = index.cibles[cible];
    const n = c ? notions.get(c[0]) : undefined;
    return Boolean(n && (!c[1] || n.concepts.some((x) => x.concept === c[1])));
  };
  const termes = termesDe(texte, index);
  const parTerme = termes.map((t) => ({ terme: t, occ: occurrences(t, index, admise) })).filter((x) => x.occ.size > 0);
  if (parTerme.length === 0) return [];

  // une cible qui porte le plus de termes cherchés passe devant ; à égalité, celle où ils sont les plus
  // présents, le terme le plus rare comptant le plus : c'est lui qui dit le sujet
  const plusRare = Math.min(...parTerme.map((x) => x.occ.size));
  const notes = new Map<number, { termes: number; poids: number }>();
  for (const { terme, occ } of parTerme) {
    const rarete = (plusRare / occ.size) ** 2;
    const mots = terme.split(" ");
    for (const [cible, n] of occ) {
      const note = notes.get(cible) ?? { termes: 0, poids: 0 };
      const libelle = motsDe(index.cibles[cible]?.[1] ?? "");
      const bonus = mots.every((m) => libelle.includes(m)) ? BONUS_LIBELLE : 1;
      note.termes++;
      note.poids += (bonus * rarete * n) / Math.sqrt(index.cibles[cible]?.[2] || 1);
      notes.set(cible, note);
    }
  }
  const meilleur = Math.max(...[...notes.values()].map((n) => n.termes));
  const classes = [...notes].filter(([, n]) => n.termes === meilleur).sort((a, b) => b[1].poids - a[1].poids);
  const plancher = (classes[0]?.[1].poids ?? 0) * SEUIL_RELATIF;

  const res = new Map<string, Set<string>>();
  for (const [cible, note] of classes.slice(0, meilleur < termes.length ? MAX_RESULTATS_PARTIELS : MAX_RESULTATS)) {
    if (note.poids < plancher) break;
    const [notion, concept] = index.cibles[cible];
    if (!res.has(notion)) res.set(notion, new Set());
    if (concept) res.get(notion)?.add(concept);
  }
  return [...res].map(([notion, concepts]) => ({ notion, concepts: [...concepts] }));
}
