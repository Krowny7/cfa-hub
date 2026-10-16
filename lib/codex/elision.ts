// L'élision devant un nom de matière : « Le tour d'Ethics », « Maître
// d'Equity », « Une page d'Economics », « le cours d'Économie ». Les noms
// viennent des catalogues (anglais court ou français long) : la règle se
// fait sur la première lettre, sans liste à tenir. Pas de h aspiré dans le
// programme ; s'il en vient un, l'ajouter à H_ASPIRES.
// Module neutre, sans dépendance.

const VOYELLE = /^[aeiouyàâäéèêëîïôöùûüœæ]/i;
/** Les mots en h muet élident (« l'histoire ») ; ceux-ci non (« la Hongrie »). */
const H_ASPIRES = new Set(["hongrie", "hollande", "hausse", "haut"]);

/** Le mot appelle-t-il l'élision (voyelle ou h muet) ? */
export function elide(mot: string): boolean {
  const m = mot.trim();
  if (VOYELLE.test(m)) return true;
  if (/^h/i.test(m)) return !H_ASPIRES.has(m.split(/[\s-]/)[0].toLowerCase());
  return false;
}

/** « de FSA », « d'Ethics ». */
export const de = (nom: string) => (elide(nom) ? `d'${nom}` : `de ${nom}`);
/** « De FSA », « D'Ethics » (en début de phrase). */
export const De = (nom: string) => (elide(nom) ? `D'${nom}` : `De ${nom}`);
/** « le FSA », « l'Equity ». */
export const le = (nom: string) => (elide(nom) ? `l'${nom}` : `le ${nom}`);
/** « la Finance », « l'Économie ». */
export const la = (nom: string) => (elide(nom) ? `l'${nom}` : `la ${nom}`);

const ARTICLES: Record<string, (nom: string) => string> = { de, De, le, la, Le: (n) => (elide(n) ? `L'${n}` : `Le ${n}`), La: (n) => (elide(n) ? `L'${n}` : `La ${n}`) };

/**
 * Remplace les {cle} d'un gabarit, en élidant l'article qui les précède :
 * gabarit("Le tour de {matiere}", { matiere: "Ethics" }) → « Le tour d'Ethics ».
 */
export function gabarit(texte: string, valeurs: Record<string, string | undefined>): string {
  return texte
    .replace(/\b(de|De|le|Le|la|La) \{(\w+)\}/g, (tout, art: string, cle: string) => (valeurs[cle] === undefined ? tout : ARTICLES[art](valeurs[cle]!)))
    .replace(/\{(\w+)\}/g, (tout, cle: string) => valeurs[cle] ?? tout);
}
