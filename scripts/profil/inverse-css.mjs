// Les couleurs inversées d'un bloc du profil (.rl-inverse, components/profil/BlocsProfil.tsx) :
// sur le bloc, les jetons de l'autre thème (le jour : ceux de la nuit ; la nuit : ceux du jour).
// Les alias de Tailwind (@theme : --color-white: var(--ink)…) se résolvent à la racine : ils
// sont redéclarés sur le bloc pour suivre ses jetons. Tout est lu dans app/globals.css (le bloc
// :root, le bloc html[data-theme="nuit"], le bloc @theme) et écrit entre deux repères, juste
// après le bloc de la nuit.
// usage : node scripts/profil/inverse-css.mjs [--ecrire]   (sans --ecrire : dit si c'est à jour)
// scripts/profil/test-inverse.ts vérifie que globals.css porte bien la sortie d'aujourd'hui.

import { readFileSync, writeFileSync } from "node:fs";

export const DEBUT = "/* ── .rl-inverse : début (généré par scripts/profil/inverse-css.mjs, ne pas modifier à la main) ── */";
export const FIN = "/* ── .rl-inverse : fin ── */";

/** Les lignes d'un bloc CSS ouvert à la ligne `i` (jusqu'à son accolade fermante). */
function bloc(lignes, i) {
  const out = [];
  let prof = 0;
  for (let j = i; j < lignes.length; j++) {
    prof += (lignes[j].match(/{/g) || []).length - (lignes[j].match(/}/g) || []).length;
    out.push(lignes[j]);
    if (prof === 0 && j > i) break;
  }
  return out;
}

/** Les jetons d'un bloc : { nom: valeur } (une déclaration par ligne). */
function jetons(lignes) {
  const out = new Map();
  for (const l of lignes) {
    const m = /^\s*(--[a-z0-9-]+):\s*(.+);\s*$/.exec(l);
    if (m) out.set(m[1], m[2]);
  }
  return out;
}

/** Le CSS des couleurs inversées, tiré du texte de globals.css (sans la partie déjà générée). */
export function cssInverse(texte) {
  const sans = texte.includes(DEBUT) ? texte.slice(0, texte.indexOf(DEBUT)) + texte.slice(texte.indexOf(FIN) + FIN.length) : texte;
  const lignes = sans.split(/\r?\n/);
  const ouvre = (prefixe) => {
    const i = lignes.findIndex((l) => l.startsWith(prefixe));
    if (i < 0) throw new Error(`bloc introuvable : ${prefixe}`);
    return bloc(lignes, i);
  };
  const jour = jetons(ouvre(":root {"));
  const nuit = jetons(ouvre('html[data-theme="nuit"] {'));
  const alias = [...jetons(ouvre("@theme")).entries()].filter(([nom, v]) => nom.startsWith("--color-") && v.includes("var(--"));
  const d = (m) => [...m].map(([nom, v]) => `  ${nom}: ${v};`);
  const versJour = new Map([...nuit.keys()].filter((nom) => jour.has(nom)).map((nom) => [nom, jour.get(nom)]));
  // le mode discret (html[data-discreet="1"] : le rouge redevient l'encre) vaut aussi dans le bloc : posé après, à égalité de poids
  const discret = lignes.some((l) => l.startsWith('html[data-discreet="1"] {'))
    ? new Map([...jetons(ouvre('html[data-discreet="1"] {')).entries()].filter(([nom]) => nuit.has(nom)))
    : new Map();
  return [
    DEBUT,
    "/* Couleurs inversées d'un bloc du profil : le jour, les jetons de la nuit ; la nuit, ceux du jour.",
    "   Les alias de Tailwind sont redéclarés ici pour suivre les jetons du bloc. */",
    ".rl-inverse {",
    ...d(nuit),
    ...d(alias),
    "  color: var(--ink);",
    "  color-scheme: dark;",
    "}",
    'html[data-theme="nuit"] .rl-inverse {',
    ...d(versJour),
    "  color-scheme: light;",
    "}",
    ...(discret.size ? ['html[data-discreet="1"] .rl-inverse {', ...d(discret), "}"] : []),
    FIN,
  ].join("\n");
}

/** globals.css avec la partie générée à jour (remplacée, ou posée après le bloc de la nuit). */
export function avecInverse(texte) {
  const nl = texte.includes("\r\n") ? "\r\n" : "\n";
  const css = cssInverse(texte).split("\n").join(nl);
  if (texte.includes(DEBUT)) return texte.slice(0, texte.indexOf(DEBUT)) + css + texte.slice(texte.indexOf(FIN) + FIN.length);
  const lignes = texte.split(/\r?\n/);
  const i = lignes.findIndex((l) => l.startsWith('html[data-theme="nuit"] {'));
  const fin = i + bloc(lignes, i).length;
  return [...lignes.slice(0, fin), "", ...css.split(nl), ...lignes.slice(fin)].join(nl);
}

if (process.argv[1] && /inverse-css[.]mjs$/.test(process.argv[1])) {
  const chemin = "app/globals.css";
  const texte = readFileSync(chemin, "utf8");
  const neuf = avecInverse(texte);
  if (process.argv.includes("--ecrire")) {
    if (neuf !== texte) writeFileSync(chemin, neuf);
    console.log(neuf === texte ? "déjà à jour" : "écrit");
  } else console.log(neuf === texte ? "à jour" : "à régénérer : node scripts/profil/inverse-css.mjs --ecrire");
}
