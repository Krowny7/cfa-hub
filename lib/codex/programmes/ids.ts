// Le Codex : les ids d'un programme (V3 §1.2). La clé primaire de
// codex_progression est (joueur, quête, période) : un id doit donc être
// unique entre tous les programmes. CFA I garde ses ids publiés tels quels ;
// tout autre programme préfixe les siens de son slug (« cfa-l2/branche:fsa:entree ») ;
// le fil rouge et les exploits sont communs à tous (« global »).
// Ses clés de matière sont qualifiées de la même façon (« cfa-l2:fsa ») : les
// réponses du Niveau I ne comptent jamais pour le Niveau II.
// Module neutre et pur, sans dépendance (le catalogue et le registre l'importent).

/** Le programme historique : ses ids et ses clés de matière restent nus. */
export const PROGRAMME_HISTORIQUE = "finance/cfa-l1";
/** Le programme des quêtes communes à tous (fil rouge, exploits). */
export const PROGRAMME_GLOBAL = "global";

/** Longueur maximale d'un id (CHECK de codex_progression.quete_id). */
export const ID_MAX = 120;

/** « finance/cfa-l2 » → « cfa-l2 ». */
export function slugDe(programme: string): string {
  return programme.slice(programme.indexOf("/") + 1);
}

/** L'id publié d'une quête d'un programme (CFA I et global : l'id local, inchangé). */
export function idDe(programme: string, local: string): string {
  return programme === PROGRAMME_HISTORIQUE || programme === PROGRAMME_GLOBAL ? local : `${slugDe(programme)}/${local}`;
}

/** La clé de matière d'un programme (CFA I : la clé nue). */
export function cleMatiere(programme: string, locale: string): string {
  return programme === PROGRAMME_HISTORIQUE ? locale : `${slugDe(programme)}:${locale}`;
}

/** La clé nue d'une matière (« cfa-l2:fsa » → « fsa ») : ce qui entre dans un id local. */
export const cleLocale = (cle: string) => cle.slice(cle.lastIndexOf(":") + 1);

/** Une quête commune à tous les programmes (fil rouge, exploits). */
export const estGlobal = (id: string) => id.startsWith("fil:") || id.startsWith("exploit:");

/**
 * Le slug du programme d'un id publié : « » pour CFA I et pour les quêtes
 * communes, sinon ce qui précède « / » (« acte:essai/g1 » compris).
 */
export function slugDeId(id: string): string {
  const local = id.startsWith("acte:") ? id.slice(5) : id;
  if (estGlobal(local)) return "";
  const i = local.indexOf("/");
  return i > 0 && !local.slice(0, i).includes(":") ? local.slice(0, i) : "";
}
