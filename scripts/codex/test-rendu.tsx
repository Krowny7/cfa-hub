// Tests de rendu de l'écran du Codex (react-dom/server, sans base, réseau ni
// navigateur) :
//   npx tsx --tsconfig tsconfig.json scripts/codex/test-rendu.tsx
// Vérifie que /codex se rend sans erreur sur les trois scénarios d'exemple,
// avec et sans la maîtrise unique, et ce que la carte en trois niveaux y met
// (V3 §10.1) : le monde au zoom moyen au premier rendu, les dix pastilles,
// les glyphes et les noms d'étapes, la visite de la bottega à côté du
// tronc, les filtres et la recherche, « Tout le Codex » sur téléphone (la
// grille 2 × 5 des matières, ses notions au toucher) ; et le segment
// « Aujourd'hui » (Codex simplifié, §3.3) : un seul bouton plein, « Une
// autre idée ? » sur la seule étape en cours, les replis, le compte neuf.
import "./sans-css";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { CodexEcran } from "@/components/codex/CodexEcran";
import { CodexTel } from "@/components/codex/CarteCodex";
import type { VueCodex } from "@/lib/codex/vue";
import { exempleCodex } from "./exemple";

// le JSX des composants (tsconfig « preserve ») attend React en portée
(globalThis as { React?: typeof React }).React = React;

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const compte = (html: string, re: RegExp) => (html.match(re) ?? []).length;
// le fil et « Récupérer » lisent le routeur (useRouter) : un routeur muet
const routeur = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };
const rendre = (el: React.ReactElement): string | null => {
  try {
    return renderToStaticMarkup(<AppRouterContext.Provider value={routeur}>{el}</AppRouterContext.Provider>);
  } catch (e) {
    console.log(e);
    return null;
  }
};

console.log("# /codex se rend (trois scénarios, avec et sans la maîtrise unique)");
for (const sc of ["neuf", "milieu", "fin"] as const) {
  for (const unique of [false, true]) {
    const jour = rendre(<CodexEcran vue={exempleCodex(sc, { unique })} demo />);
    const tout = rendre(<CodexEcran vue={exempleCodex(sc, { unique })} segment="tout" demo />);
    const carte = rendre(<CodexEcran vue={exempleCodex(sc, { unique })} segment="carte" demo />);
    check(`${sc}${unique ? " (maîtrise unique)" : ""} : rendu sans erreur, deux segments, les replis dans « Tout le Codex », la carte (filtres et recherche) dans « Voir la carte »`,
      !!jour && !!tout && !!carte && compte(jour, /role="tab"/g) === 2 && !jour.includes("Mes faiblesses") && !tout.includes("Mes faiblesses") && tout.includes("Voir la carte") && carte.includes("Mes faiblesses") && carte.includes('placeholder="Chercher une quête"'));
  }
}

console.log("\n# la carte en trois niveaux");
{
  const html = rendre(<CodexEcran vue={exempleCodex("milieu", { unique: true })} segment="carte" demo />) ?? "";
  check("le monde s'ouvre au zoom moyen (niveau 2)", html.includes('data-niveau="2"'));
  check("dix pastilles de matière, pour le niveau dézoomé", compte(html, /class="pastille pastilleCarte/g) === 10);
  const glyphes = ["F", "D", "◎", "S", "♛"].map((g) => compte(html, new RegExp(`>${g}</text>`, "g")));
  // (le drill n'est pas une étape de l'exemple : aucune fiche n'y a de pages de drill branchées)
  check("les étapes portent leur glyphe (F, ◎, S, ♛) et leur nom (zoom fort)", glyphes[0] > 0 && glyphes[2] > 0 && glyphes[3] > 0 && glyphes[4] > 0 && compte(html, /class="nomEtape"/g) > 20, `${glyphes.join(" ")} · ${compte(html, /class="nomEtape"/g)} noms`);
  check("les textes de taille fixe sont marqués pour être masqués sous 12 px", html.includes('data-px="13"') && html.includes('data-px="24"'));
  check("la visite de la bottega se tient à côté du tronc", compte(html, /class="outilsActe"/g) === 1);
  check("une quête verrouillée dit ce qui manque (libellé lu)", /aria-label="[^"]*\. (D'abord|Clore|Séance|S'ouvre)/.test(html.replace(/&#x27;/g, "'")));
  const neuf = rendre(<CodexEcran vue={exempleCodex("neuf")} segment="carte" demo />) ?? "";
  check("compte neuf : pas de pastille tant que les branches ne sont pas dévoilées", compte(neuf, /pastilleCarte/g) === 0);
}

console.log("\n# la carte sur téléphone");
{
  const vue = exempleCodex("milieu", { unique: true });
  const corps = rendre(<CodexTel vue={vue} montre={() => true} onQuete={() => {}} />) ?? "";
  check("le parcours : le chemin d'un acte et son sélecteur", corps.includes('aria-label="Les actes"') && corps.includes("data-ici"));
  check("les matières : la grille 2 × 5 des pastilles", compte(corps, /pastilleGrille/g) === 10 && corps.includes('aria-label="Les matières"'));
  check("la légende complète, sous les chemins", corps.includes('aria-label="Légende"') && corps.includes("à récupérer") && corps.includes("séance ciblée"));
  check("ni réplique ni sous-titre d'acte", !corps.includes("repliqueChemin") && !vue.trame.some((a) => a.replique.texte && corps.includes(a.replique.texte.replace(/'/g, "&#x27;").slice(0, 30))));
}

console.log("\n# /codex « Tout le Codex » (Codex simplifié, §3.3)");
{
  const vue = exempleCodex("milieu", { unique: true });
  const html = rendre(<CodexEcran vue={vue} segment="tout" demo />) ?? "";
  const replis = ["Parcours", "Matières", "Objectifs longs", "Exploits"];
  check("quatre replis, dans l'ordre, puis « Voir la carte »", replis.every((r) => html.includes(`<summary>${r} `)) && replis.map((r) => html.indexOf(`<summary>${r} `)).every((x, i, t) => i === 0 || t[i - 1] < x) && html.indexOf("Voir la carte") > html.indexOf("<summary>Exploits "));
  check("chaque repli résumé en une ligne (« · Acte … », « · n validée(s) sur 10 », « · n en cours », « · n sur m »)", /<summary>Parcours <span[^>]*>· Acte /.test(html) && /<summary>Matières <span[^>]*>· \d+ validées? sur 10/.test(html) && /<summary>Objectifs longs <span[^>]*>· \d+ en cours/.test(html) && /<summary>Exploits <span[^>]*>· \d+ sur \d+/.test(html));
  check("des lignes de quête, pas de carte ni de « Y aller » dans les listes", compte(html, /class="ligne"/g) > 10 && !html.includes("Mes faiblesses") && !html.includes("Y aller"));
  check("ni « page encore blanche », ni « tamponnée »", !html.includes("encore blanche") && !/[Tt]amponnée/.test(html));
  const aRec = vue.trame.flatMap((a) => a.quetes).find((q) => q.affichage !== "cache") ?? vue.exploits[0];
  const recup = { ...vue, exploits: vue.exploits.map((q, i) => (i === 0 ? { ...q, etat: "terminee" as const, aRecuperer: true as const, affichage: "complet" as const } : q)) };
  const h = rendre(<CodexEcran vue={recup} segment="tout" demo />) ?? "";
  check("une quête à récupérer porte son bouton « Récupérer », à côté de la ligne", !!aRec && /class="ligneAvecAction"/.test(h) && /<button[^>]*class="btn btn-primary[^"]*"[^>]*>Récupérer<\/button>/.test(h));
  const sobre = rendre(<CodexEcran vue={{ ...vue, sobre: true }} segment="tout" demo />) ?? "";
  check("le mode sobre tait l'XP des lignes", !/\+\d+ XP/.test(sobre));
}

console.log("\n# /codex « Aujourd'hui » (Codex simplifié, §3.3)");
{
  const jour = (v: VueCodex) => rendre(<CodexEcran vue={v} demo />) ?? "";
  const pleins = (html: string) => compte(html, /class="btn btn-primary/g);
  const milieu = exempleCodex("milieu", { unique: true, seance: "proposee" });
  const sans = { ...milieu, aRecuperer: [] };
  const html = jour(sans);
  check("le titre : « Codex », sans phase ni « Le carnet de Léonard »", /<h1 class="t-h3 font-brand m-0">Codex<\/h1>/.test(html) && !html.includes("Le carnet de Léonard") && !html.includes(milieu.phaseNom));
  check("deux segments, « Aujourd'hui » choisi", compte(html, /role="tab"/g) === 2 && /aria-selected="true"[^>]*>Aujourd&#x27;hui</.test(html));
  check("le fil : la séance en étapes, un seul bouton plein", !!milieu.seance && milieu.seance.blocs.every((b) => html.includes(b.titre.replace(/'/g, "&#x27;"))) && pleins(html) === 1, `${pleins(html)} bouton(s) plein(s)`);
  check("« Une autre idée ? » sur la seule étape en cours", compte(html, /Une autre idée \?/g) === 1 && compte(html, /aria-current="step"/g) === 1);
  check("une seule puce de temps (« 30 min ▾ »), le choix replié", compte(html, /aria-expanded="false" aria-controls="fil-temps"/g) === 1 && !html.includes('id="fil-temps"'));
  check("les replis : Quêtes du jour, Fait aujourd'hui, l'acte en cours", html.includes("Quêtes du jour") && html.includes("Fait aujourd&#x27;hui") && /<details[^>]*><summary>Acte /.test(html));
  check("ni la carte, ni la prochaine quête au « ! », ni le cap en bloc dans « Aujourd'hui »", !html.includes("Mes faiblesses") && !html.includes("Ta prochaine quête") && !html.includes('aria-label="Le cap"'));
  if (milieu.aRecuperer.length) {
    const h = jour(milieu);
    check("quelque chose à récupérer : le bouton du bloc est le seul plein, le fil passe en contour", pleins(h) === 1 && !/class="btn btn-primary[^"]*"[^>]*>Commencer/.test(h) && /class="btn btn-secondary[^"]*"[^>]*>Commencer/.test(h), `${pleins(h)} bouton(s) plein(s)`);
  } else check("l'exemple « milieu » a quelque chose à récupérer", false);
  check("rien à récupérer : le bloc reste monté, vide (le geste survit au rafraîchissement de la page)", html.includes('<div class="zoneRecuperer"></div>'));
  const neuf = jour(exempleCodex("neuf"));
  check("le compte neuf : une étape, « 10 questions pour faire connaissance », pas de préparation", compte(neuf, /aria-current="step"/g) === 1 && neuf.includes("10 questions pour faire connaissance") && !neuf.includes("Préparation") && !neuf.includes("Une autre idée"));
  const sobre = jour({ ...sans, sobre: true });
  check("le mode sobre tait l'XP des replis et des étapes", !/\+\d+ XP/.test(sobre));
}

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
