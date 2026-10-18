// Vérifie : les couleurs inversées d'un bloc du profil (.rl-inverse) dans
// app/globals.css sont à jour des jetons du jour et de la nuit (sinon :
// node scripts/profil/inverse-css.mjs --ecrire), et posent bien l'autre thème.
// usage : npx tsx scripts/profil/test-inverse.ts

import { readFileSync } from "node:fs";
import { avecInverse, cssInverse } from "./inverse-css.mjs";

let echecs = 0;
const check = (nom: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok " : "KO "}  ${nom}${!ok && detail ? "  " + detail : ""}`);
  if (!ok) echecs++;
};

const texte = readFileSync("app/globals.css", "utf8");
check("globals.css porte la version d'aujourd'hui (sinon : node scripts/profil/inverse-css.mjs --ecrire)", avecInverse(texte) === texte);
const css = cssInverse(texte);
const jour = css.slice(css.indexOf(".rl-inverse {"), css.indexOf('html[data-theme="nuit"] .rl-inverse'));
const nuit = css.slice(css.indexOf('html[data-theme="nuit"] .rl-inverse'));
check("le jour : les jetons de la nuit (fond #161619, texte #f2f2ee), color-scheme sombre", jour.includes("--surface: #161619;") && jour.includes("--ink: #f2f2ee;") && jour.includes("color-scheme: dark;"));
check("la nuit : les jetons du jour (fond #ffffff, texte #111111), color-scheme clair", nuit.includes("--surface: #ffffff;") && nuit.includes("--ink: #111111;") && nuit.includes("color-scheme: light;"));
check("les alias de Tailwind redéclarés (text-white suit le bloc)", jour.includes("--color-white: var(--ink);") && jour.includes("--color-surface: var(--surface);"));
check("le texte du bloc suit ses jetons", jour.includes("color: var(--ink);"));
check("le mode discret vaut dans le bloc (posé après la nuit)", css.indexOf('html[data-discreet="1"] .rl-inverse') > css.indexOf('html[data-theme="nuit"] .rl-inverse') && css.includes("--pen: var(--ink);"));

console.log(echecs ? `\n${echecs} échec(s)` : "\nTout est bon.");
if (echecs) process.exit(1);
