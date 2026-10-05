// Règle du site pour toutes les questions (fiches, banque, défi du jour,
// duels, sessions, examens blancs) : l'énoncé et les choix en anglais, comme
// à l'examen ; l'explication en français. Détection simple par mots outils :
// seuls les écarts nets sont signalés (un texte court ou ambigu passe).
// Même règle pour les scripts d'import : scripts/lib/langue.mjs.
import mots from "./langue-contenu.json";

export type Langue = "fr" | "en" | "mixte" | "?" | "vide";

export const REGLE_LANGUE = "Règle du site : énoncé et choix en anglais, explication en français.";

/** La langue dominante d'un texte (« ? » : pas de mot outil, un calcul seul par exemple). */
export function langueDe(texte: string | null | undefined): Langue {
  if (!texte || !texte.trim()) return "vide";
  const s = " " + texte.toLowerCase().replace(/’/g, "'").replace(/[^a-zàâçéèêëîïôûùüÿœ' ]+/g, " ") + " ";
  const compte = (liste: string[]) => liste.reduce((n, m) => n + s.split(m).length - 1, 0);
  const f = compte(mots.fr) + (texte.match(/[àâçéèêëîïôûùüœ]/gi) ?? []).length * 0.6;
  const e = compte(mots.en);
  if (f === 0 && e === 0) return "?";
  if (f > e * 1.3) return "fr";
  if (e > f * 1.3) return "en";
  return "mixte";
}

/** Ce qui enfreint la règle dans une question (tableau vide : rien à redire). */
export function ecartsDeLangue(q: { prompt?: string | null; choices?: string[] | null; explanation?: string | null }): string[] {
  const ecarts: string[] = [];
  if (langueDe(q.prompt) === "fr") ecarts.push("l'énoncé doit être en anglais");
  if (q.choices?.length && langueDe(q.choices.join(" . ")) === "fr") ecarts.push("les choix doivent être en anglais");
  if (langueDe(q.explanation) === "en") ecarts.push("l'explication doit être en français");
  return ecarts;
}
