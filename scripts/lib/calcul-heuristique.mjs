// Une question de QCM demande-t-elle un calcul ? Estimation automatique pour
// quiz_questions.calcul (migration_ratures_calcul.sql : le carnet « Sans
// calcul », au téléphone). Utilisée par scripts/lib/seed-core.mjs pour les
// questions seedées dont l'énoncé n'est pas dans scripts/calculs/
// classement.json (le classement de toute la banque, plus fin, posé par
// scripts/calculs/appliquer.mjs).
// Règle : des chiffres dans l'énoncé ET des choix en majorité numériques
// (au moins 2 sur 3) ⇒ calcul ; ou un énoncé de calcul (« closest to »,
// « calculate », « compute ») avec au moins un choix numérique. Sans aucun
// chiffre dans l'énoncé (les données sont dans un tableau, une image, un
// exhibit) : calcul seulement si l'énoncé est un énoncé de calcul ET les
// choix en majorité numériques (« … is closest to: » 1.25 / 1.50 / 2.00) ;
// false voulant dire « sans calcul », pas « inconnu », le doute garde la
// question hors du mode « Sans calcul ». Un choix est
// numérique s'il ne reste que des chiffres une fois retirés devises, unités
// et liaisons (« USD 1.2 million », « 4.25% », « 2.5x », « 3 years »).

// devises, unités, liaisons : ce qui peut entourer un nombre sans en faire un mot
const ENTOURAGE = new RegExp(
  "\\b(?:" +
    [
      "usd", "eur", "gbp", "jpy", "chf", "cad", "aud", "cny", "inr", "hkd", "sgd",
      "millions?", "billions?", "thousands?", "trillions?", "mn", "bn", "mm", "m", "k",
      "years?", "months?", "days?", "weeks?", "quarters?", "times", "bps?", "basis points?", "percent",
      "per share", "per annum", "per year", "annually", "p\\.?a", "shares?", "units?",
      "and", "or", "to", "of", "vs", "both",
    ].join("|") +
    ")\\b",
  "gi",
);

/** Le choix est-il un nombre (avec devise, unité ou pourcentage) ? */
export function choixNumerique(choix) {
  let s = String(choix ?? "").trim();
  if (!/\d/.test(s)) return false;
  s = s
    .replace(/[$€£¥%‰]/g, " ")
    .replace(/(\d)\s*(?:[x×]|bps?|bn|mn|mm|m|k)(?![\p{L}])/giu, "$1 ") // 2.5x, 3×, 25bp, 1.2m, 40k
    .replace(ENTOURAGE, " ");
  // il ne doit plus rester de lettre
  return !/\p{L}/u.test(s);
}

const ENONCE_CALCUL = /\b(?:closest to|calculate[sd]?|compute[sd]?|computation)\b/i;

/**
 * true si la question demande (très probablement) un calcul, false sinon.
 * prompt : l'énoncé ; choices : les choix (texte).
 */
export function estCalcul(prompt, choices) {
  const enonce = String(prompt ?? "");
  const liste = Array.isArray(choices) ? choices : [];
  if (liste.length === 0) return false;
  const numeriques = liste.filter(choixNumerique).length;
  const majorite = numeriques >= Math.ceil((liste.length * 2) / 3);
  // pas de chiffre dans l'énoncé : les données sont ailleurs (tableau, image), ou ce n'est pas un calcul
  if (!/\d/.test(enonce)) return ENONCE_CALCUL.test(enonce) && majorite;
  if (majorite) return true;
  return ENONCE_CALCUL.test(enonce) && numeriques >= 1;
}
