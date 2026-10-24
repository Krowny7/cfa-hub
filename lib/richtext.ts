// Découpe d'une ligne de texte enrichi (components/RichText.tsx), sans React :
// formules inline $…$, gras **…** et surligné ==…==, sur la même ligne, le
// gras et le surligné pouvant contenir une formule (« **Duration = $D$** »)
// ou s'imbriquer (« ==**callable**== »). Les ** et == à l'intérieur d'une
// formule restent du LaTeX ; un marqueur entre deux espaces, ou sans
// partenaire, reste tel quel. Un == collé à un autre signe (« === »,
// « ==> », « <== », « !== ») n'est pas un surligné.
// Contenu de confiance (nos seeds), pas de markdown complet.

export type Morceau = { t: "texte"; v: string } | { t: "math"; v: string };
export type Passage = { gras: boolean; surligne: boolean; morceaux: Morceau[] };

const INLINE_MATH_RE = /\$([^$\n]+?)\$/g;
const MARQUE_RE = /\*\*|==/g;

export type Marque = "**" | "==";
type JetonMarque = { t: "marque"; m: Marque; actif: boolean };
type Jeton = Morceau | JetonMarque;

/** Les jetons d'une ligne : texte, formules et marqueurs, chaque marqueur dit actif ou non (avant appariement). */
function jetonsInline(line: string): Jeton[] {
  // 1. les formules d'abord : leur contenu est protégé
  const bruts: Morceau[] = [];
  let last = 0;
  INLINE_MATH_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE_MATH_RE.exec(line))) {
    if (m.index > last) bruts.push({ t: "texte", v: line.slice(last, m.index) });
    bruts.push({ t: "math", v: m[1] });
    last = INLINE_MATH_RE.lastIndex;
  }
  if (last < line.length) bruts.push({ t: "texte", v: line.slice(last) });

  // 2. les marqueurs du texte. Entouré d'espaces des deux côtés (« 2 ** 3 »),
  // un marqueur ne peut ni ouvrir ni fermer (comme en CommonMark) : il reste
  // littéral. Parmi les autres, s'il en reste un nombre impair d'une sorte,
  // le dernier de cette sorte n'a pas de partenaire.
  const blanc = (c: string | undefined) => c !== undefined && /\s/.test(c);
  const jetons: Jeton[] = [];
  for (const j of bruts) {
    if (j.t === "math") {
      jetons.push(j);
      continue;
    }
    let pos = 0;
    MARQUE_RE.lastIndex = 0;
    let x: RegExpExecArray | null;
    while ((x = MARQUE_RE.exec(j.v))) {
      const mq = x[0] as Marque;
      const avant: string | undefined = j.v[x.index - 1];
      const apres: string | undefined = j.v[x.index + 2];
      let actif = !(blanc(avant) && blanc(apres));
      if (mq === "==" && ((avant !== undefined && "=<>!".includes(avant)) || (apres !== undefined && "=>".includes(apres)))) actif = false;
      if (x.index > pos) jetons.push({ t: "texte", v: j.v.slice(pos, x.index) });
      jetons.push({ t: "marque", m: mq, actif });
      pos = x.index + 2;
    }
    if (pos < j.v.length) jetons.push({ t: "texte", v: j.v.slice(pos) });
  }
  return jetons;
}

const actifs = (jetons: Jeton[], mq: Marque) => jetons.filter((j): j is JetonMarque => j.t === "marque" && j.m === mq && j.actif);

/**
 * Les marqueurs laissés ouverts au bout d'un bout de ligne (« ==Identify »
 * laisse « == » ouvert), selon les mêmes règles que le rendu : ceux d'une
 * formule, entre deux espaces ou collés à un signe (« ==> ») ne comptent pas.
 */
export function marquesOuvertes(texte: string): Marque[] {
  const jetons = jetonsInline(texte);
  return (["**", "=="] as const).filter((mq) => actifs(jetons, mq).length % 2 === 1);
}

/** Les passages d'une ligne, gras ou surlignés ou non, chacun fait de texte et de formules. */
export function passagesInline(line: string): Passage[] {
  const jetons = jetonsInline(line);
  for (const mq of ["**", "=="] as const) {
    const a = actifs(jetons, mq);
    if (a.length % 2 === 1) a[a.length - 1].actif = false;
  }

  // 3. les passages
  const out: Passage[] = [];
  let gras = false;
  let surligne = false;
  const pousser = (mo: Morceau) => {
    if (mo.t === "texte" && mo.v === "") return;
    const der = out[out.length - 1];
    if (der && der.gras === gras && der.surligne === surligne) {
      const fin = der.morceaux[der.morceaux.length - 1];
      if (fin && fin.t === "texte" && mo.t === "texte") fin.v += mo.v;
      else der.morceaux.push({ ...mo });
    } else out.push({ gras, surligne, morceaux: [{ ...mo }] });
  };
  for (const j of jetons) {
    if (j.t !== "marque") pousser(j);
    else if (!j.actif) pousser({ t: "texte", v: j.m });
    else if (j.m === "**") gras = !gras;
    else surligne = !surligne;
  }
  return out;
}
