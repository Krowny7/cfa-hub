// Tests de rendu de l'écran du Codex (react-dom/server, sans base, réseau ni
// navigateur) :
//   npx tsx --tsconfig tsconfig.json scripts/codex/test-rendu.tsx
// Vérifie que /codex se rend sans erreur sur les trois scénarios d'exemple,
// avec et sans la maîtrise unique, et ce que la carte en trois niveaux y met
// (V3 §10.1) : le monde au zoom moyen au premier rendu, les dix pastilles,
// les glyphes et les noms d'étapes, la visite de la bottega à côté du
// tronc, les filtres et la recherche, les cinq segments du téléphone et le
// corps de chacun (la grille 2 × 5 des matières, ses notions au toucher).
import "./sans-css";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CodexEcran } from "@/components/codex/CodexEcran";
import { CodexTel } from "@/components/codex/CarteCodex";
import { SEGMENTS_TEL } from "@/lib/codex/carte";
import { exempleCodex } from "./exemple";

// le JSX des composants (tsconfig « preserve ») attend React en portée
(globalThis as { React?: typeof React }).React = React;

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const compte = (html: string, re: RegExp) => (html.match(re) ?? []).length;
const rendre = (el: React.ReactElement): string | null => {
  try {
    return renderToStaticMarkup(el);
  } catch (e) {
    console.log(e);
    return null;
  }
};

console.log("# /codex se rend (trois scénarios, avec et sans la maîtrise unique)");
for (const sc of ["neuf", "milieu", "fin"] as const) {
  for (const unique of [false, true]) {
    const html = rendre(<CodexEcran vue={exempleCodex(sc, { unique })} demo />);
    check(`${sc}${unique ? " (maîtrise unique)" : ""} : rendu sans erreur, cinq segments, filtres et recherche`, !!html && compte(html, /role="tab"/g) === 5 && html.includes("Mes faiblesses") && html.includes('placeholder="Chercher une quête"'));
  }
}

console.log("\n# la carte en trois niveaux");
{
  const html = rendre(<CodexEcran vue={exempleCodex("milieu", { unique: true })} demo />) ?? "";
  check("le monde s'ouvre au zoom moyen (niveau 2)", html.includes('data-niveau="2"'));
  check("dix pastilles de matière, pour le niveau dézoomé", compte(html, /class="pastille pastilleCarte/g) === 10);
  const glyphes = ["F", "D", "◎", "S", "♛"].map((g) => compte(html, new RegExp(`>${g}</text>`, "g")));
  // (le drill n'est pas une étape de l'exemple : aucune fiche n'y a de pages de drill branchées)
  check("les étapes portent leur glyphe (F, ◎, S, ♛) et leur nom (zoom fort)", glyphes[0] > 0 && glyphes[2] > 0 && glyphes[3] > 0 && glyphes[4] > 0 && compte(html, /class="nomEtape"/g) > 20, `${glyphes.join(" ")} · ${compte(html, /class="nomEtape"/g)} noms`);
  check("les textes de taille fixe sont marqués pour être masqués sous 12 px", html.includes('data-px="13"') && html.includes('data-px="24"'));
  check("la visite de la bottega se tient à côté du tronc", compte(html, /class="outilsActe"/g) === 1);
  check("une quête verrouillée dit ce qui manque (libellé lu)", /aria-label="[^"]*\. (D'abord|Clore|Séance|S'ouvre)/.test(html.replace(/&#x27;/g, "'")));
  const neuf = rendre(<CodexEcran vue={exempleCodex("neuf")} demo />) ?? "";
  check("compte neuf : pas de pastille tant que les branches ne sont pas dévoilées", compte(neuf, /pastilleCarte/g) === 0);
}

console.log("\n# le téléphone : cinq segments");
{
  const vue = exempleCodex("milieu", { unique: true });
  const corps = (cle: (typeof SEGMENTS_TEL)[number]["cle"]) => rendre(<CodexTel segment={cle} vue={vue} montre={() => true} onQuete={() => {}} onChanger={() => {}} occupe={false} />) ?? "";
  check("Aujourd'hui : les contrats du jour", corps("aujourdhui").includes('id="tel-jour"') && compte(corps("aujourdhui"), /class="compacte"/g) === vue.contrats.length, `${vue.contrats.length} contrats`);
  check("Parcours : le chemin d'un acte et son sélecteur", corps("parcours").includes('aria-label="Les actes"') && corps("parcours").includes("data-ici"));
  const m = corps("matieres");
  check("Matières : la grille 2 × 5 des pastilles", compte(m, /pastilleGrille/g) === 10 && m.includes('aria-label="Les matières"'));
  check("Chantiers : le long cours", corps("chantiers").includes(vue.longCours[0].chaine.titre.replace(/'/g, "&#x27;")));
  check("Exploits : les exploits en chemin", corps("exploits").includes('class="chemin"') && compte(corps("exploits"), /aria-haspopup="dialog"/g) === vue.exploits.filter((l) => l.affichage !== "cache").length);
}

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
