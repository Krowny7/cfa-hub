// Règle du site pour toutes les questions : énoncé et choix en anglais,
// explication en français (même détection que lib/langue-contenu.ts, mêmes
// mots outils : lib/langue-contenu.json). Les scripts d'import refusent une
// question qui l'enfreint nettement.
import mots from "../../lib/langue-contenu.json" with { type: "json" };

export const REGLE_LANGUE = "Règle du site : énoncé et choix en anglais, explication en français.";

export function langueDe(texte) {
  if (!texte || !String(texte).trim()) return "vide";
  const t = String(texte);
  const s = " " + t.toLowerCase().replace(/’/g, "'").replace(/[^a-zàâçéèêëîïôûùüÿœ' ]+/g, " ") + " ";
  const compte = (liste) => liste.reduce((n, m) => n + s.split(m).length - 1, 0);
  const f = compte(mots.fr) + (t.match(/[àâçéèêëîïôûùüœ]/gi) ?? []).length * 0.6;
  const e = compte(mots.en);
  if (f === 0 && e === 0) return "?";
  if (f > e * 1.3) return "fr";
  if (e > f * 1.3) return "en";
  return "mixte";
}

export function ecartsDeLangue({ prompt, choices, explanation }) {
  const ecarts = [];
  if (langueDe(prompt) === "fr") ecarts.push("l'énoncé doit être en anglais");
  if (choices?.length && langueDe(choices.join(" . ")) === "fr") ecarts.push("les choix doivent être en anglais");
  if (langueDe(explanation) === "en") ecarts.push("l'explication doit être en français");
  return ecarts;
}

/** Refuse un lot de séries si une question enfreint la règle (avant toute écriture en base). */
export function exigerLangues(sets) {
  const fautes = [];
  for (const set of sets) {
    set.questions.forEach(([prompt, choices, , explanation], i) => {
      const e = ecartsDeLangue({ prompt, choices, explanation });
      if (e.length) fautes.push(`« ${set.title} » question ${i + 1} : ${e.join(", ")}`);
    });
  }
  if (fautes.length) {
    throw new Error(`${REGLE_LANGUE}\n${fautes.length} question(s) à corriger avant l'import :\n- ${fautes.slice(0, 30).join("\n- ")}`);
  }
}
