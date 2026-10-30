// Rendu de l'écran « Prépare ta partie », de la carte d'entrée, de la table de
// jeu et du bilan (react-dom/server,
// sans base, réseau ni navigateur) :
//   npx tsx --tsconfig tsconfig.json scripts/flashcards/test-partie-rendu.tsx [dossier-de-sortie]
// Vérifie les matières (puces, cochées, sans cartes grisées), les paquets
// listés, les réglages (3/5/10, cartes par main, interrupteurs), le résumé,
// les jetons, la table (autant de cartes que par main), « Distribuer »
// (actif, grisé, en cours), l'erreur de donne, les phrases de Léonard ; et la
// carte d'entrée (lien avec ou sans matière). Avec un dossier en argument
// (jamais écrit en dur : un chemin du bac à sable dans un fichier du dépôt
// casse le CSS du site), écrit aussi des pages HTML statiques, la feuille de
// style incluse, à regarder dans un navigateur.
import "../codex/sans-css";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppelPartie } from "@/components/flashcards/AppelPartie";
import { ReglagesPartie } from "@/components/flashcards/partie/ReglagesPartie";
import { BilanPartie } from "@/components/flashcards/partie/BilanPartie";
import { TableDeJeu } from "@/components/flashcards/partie/TableDeJeu";
import type { ApercuTable } from "@/components/flashcards/partie/types";
import { partieExemple } from "@/app/preview-da/partie-cartes/data";
import { reglagesInitiaux, type MatierePartie } from "@/lib/flashcards/partie";

(globalThis as { React?: typeof React }).React = React;

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const compte = (html: string, re: RegExp) => (html.match(re) ?? []).length;

const THEMES: Record<string, string[]> = {
  ethics: ["Confiance, Code et Professionalism", "Professionalism, marchés, loyauté client", "Devoirs envers clients et employeur", "Analyse, conflits, titre CFA et GIPS"],
  quant: ["Rendements et valeur temps", "Statistiques, probabilités et portefeuille", "Loi normale, échantillons et tests", "Choix du test, régression et big data"],
  economics: ["Firmes et structures de marché", "Cycles et politique budgétaire", "Politique monétaire et géopolitique", "Commerce et change"],
  corporate: ["Formes juridiques & parties prenantes", "Gouvernance & liquidité", "Capital allocation & coût du capital", "Structure du capital & business models"],
  fsa: ["Cadre d'analyse, résultat & bilan", "Flux de trésorerie & stocks", "Actifs & passifs long terme, impôts", "Qualité de l'information, techniques & modélisation"],
  equity: ["Marchés, marge et ordres", "Indices et efficience des marchés", "Actions, entreprise et secteur", "Dividendes et valorisation"],
  fixed_income: ["Instruments, émission & marchés", "Prix, yields & courbes", "Risque de taux : duration & convexity", "Risque de crédit & titrisation"],
  derivatives: ["Instruments & marchés", "Usages, risques & cost of carry", "Valeur des forwards, FRA, futures & swaps", "Options : payoffs, valeur & binomial"],
  alternatives: ["Structures et frais", "Performance et private capital", "Immobilier, infrastructure et ressources", "Hedge funds et digital assets"],
  portfolio: ["Diversification & frontière efficiente", "CML, CAPM & performance", "Processus, clients & IPS", "Biais & gestion des risques"],
};
const NOMS: Record<string, [string, string]> = {
  ethics: ["Ethics", "ETH"], quant: ["Quant", "QUANT"], economics: ["Economics", "ECO"], corporate: ["Corporate Issuers", "CORP"], fsa: ["FSA", "FSA"],
  equity: ["Equity", "EQ"], fixed_income: ["Fixed Income", "FI"], derivatives: ["Derivatives", "DER"], alternatives: ["Alternatives", "ALT"], portfolio: ["Portfolio Mgmt", "PM"],
};
const MATIERES: MatierePartie[] = Object.keys(THEMES).map((cle) => ({
  cle,
  nom: NOMS[cle][0],
  abrege: NOMS[cle][1],
  paquets: cle === "derivatives" ? [] : THEMES[cle].map((theme, i) => ({ id: `${cle}-${i + 1}`, matiere: cle, numero: i + 1, theme, cartes: Array.from({ length: 15 }, (_, k) => `${cle}-${i + 1}-c${k + 1}`) })),
}));
const aucune = new Set<string>();
const rendre = (o: Partial<React.ComponentProps<typeof ReglagesPartie>> = {}) =>
  renderToStaticMarkup(
    <ReglagesPartie matieres={MATIERES} reglages={reglagesInitiaux(MATIERES, ["economics", "fsa", "fixed_income"])} maitrisees={aucune} occupe={false} erreur={null} onChange={() => undefined} onDistribuer={() => undefined} {...o} />
  );

// --- le premier rendu : 3 matières cochées, 12 paquets, 3 mains de 3
const html = rendre();
check("10 puces de matière", compte(html, /class="chip"/g) === 10);
check("3 matières cochées", compte(html, /class="chip" aria-pressed="true"/g) === 3);
check("la matière sans carte est grisée (« bientôt »)", /disabled=""[^>]*><span class="case"[^]*?Derivatives<small>bientôt<\/small>/.test(html));
check("12 paquets listés", compte(html, /class="ligne"/g) === 12);
check("un paquet : abréviation, numéro sur total, thème, 15 cartes", /<b>ECO<\/b>1\/4 · Firmes et structures de marché<\/span><span class="nb"[^>]*>15</.test(html));
check("« 12 paquets cochés sur 12 »", html.includes("12 paquets cochés sur 12"));
check("3 mains, 3 cartes par main sur « 3 »", /aria-pressed="true">3<\/button>/.test(html) && /<output[^>]*>3<\/output>/.test(html));
check("résumé : 3 mains de 3 cartes, 9 cartes tirées parmi 180, mélangées", html.includes("3 mains de 3 cartes : 9 cartes tirées parmi 180, mélangées."));
check("jetons : 9", /<b>9<\/b>/.test(html) && html.includes("jetons à gagner,"));
check("la table montre 3 cartes", compte(html, /<i class="carte"><\/i>/g) === 3);
check("Léonard : phrase de départ, pose moqueuse visible", html.includes("Dis-moi ce que tu veux réviser, je distribue.") && /pose-moqueur\.webp"[^>]*class="leo leoOn/.test(html));
check("les quatre poses sont dans la page", ["fier", "moqueur", "etonne", "decu"].every((p) => html.includes(`pose-${p}.webp`)));
check("« Distribuer » actif", /<button type="button" class="encre">Distribuer<\/button>/.test(html));
check("« Seulement non maîtrisées » éteint, « Mélanger » allumé", /aria-pressed="false"><span class="piste"[^>]*><\/span><span>Seulement/.test(html) && /aria-pressed="true"><span class="piste"[^>]*><\/span><span>Mélanger/.test(html));
check("lien de retour vers les flashcards", html.includes('href="/flashcards"'));

// --- cinq cartes par main
const cinq = rendre({ reglages: { ...reglagesInitiaux(MATIERES, ["ethics"]), parMain: 5, mains: 10 } });
check("5 cartes par main : 5 cartes sur la table, 50 jetons", compte(cinq, /<i class="carte"><\/i>/g) === 5 && /<b>50<\/b>/.test(cinq) && cinq.includes("10 mains de 5 cartes : 50 cartes tirées parmi 60"));
check("léonard étonné devant une longue partie", cinq.includes("Une longue partie. J&#x27;aime cette ambition.") || cinq.includes("Une longue partie. J'aime cette ambition."));

// --- tout est maîtrisé
const toutes = new Set(MATIERES.flatMap((m) => m.paquets.flatMap((p) => p.cartes)));
const vide = rendre({ maitrisees: toutes, reglages: { ...reglagesInitiaux(MATIERES, ["ethics"]), seulementNonMaitrisees: true } });
check("tout maîtrisé : « Distribuer » grisé", /class="encre" data-off="" disabled="">Distribuer/.test(vide));
check("tout maîtrisé : le résumé le dit et nomme le bout qui reste (le filtre)", vide.includes("Tout est maîtrisé dans cette sélection.") && vide.includes("Seulement les cartes non maîtrisées"));
check("tout maîtrisé : Léonard le dit", vide.includes("Tout est déjà maîtrisé ici."));

// --- aucun paquet
const rien = rendre({ reglages: { ...reglagesInitiaux(MATIERES, ["ethics"]), matieres: [], paquets: [] } });
check("aucune matière : message, Distribuer grisé, Léonard déçu", rien.includes("Coche au moins une matière pour voir ses paquets.") && /data-off="" disabled=""/.test(rien) && /pose-decu\.webp"[^>]*class="leo leoOn/.test(rien) && rien.includes("Sans paquet, je n"));

// --- en cours de donne, erreur
const occupe = rendre({ occupe: true });
check("donne en route : « Léonard bat les cartes… », bouton non actif", occupe.includes("Léonard bat les cartes…") && /disabled="">Léonard bat/.test(occupe));
const err = rendre({ erreur: "Léonard n'a pas pu aller chercher les cartes." });
check("erreur de donne : annoncée", /role="alert"/.test(err) && err.includes("pas pu aller chercher"));

// --- la carte d'entrée
const e1 = renderToStaticMarkup(<AppelPartie />);
const e2 = renderToStaticMarkup(<AppelPartie matiere="fixed_income" matiereNom="Fixed Income" />);
check("entrée : lien vers la partie, toutes matières", e1.includes('href="/flashcards/partie"') && e1.includes("La partie de cartes") && e1.includes("Jouer"));
check("entrée avec matière : pré-cochée dans l'adresse, nommée dans la phrase", e2.includes('href="/flashcards/partie?matiere=fixed_income"') && e2.includes("Une partie sur Fixed Income"));


// --- la table de jeu (états figés : ApercuTable)
const EX = partieExemple();
const id = (k: number) => `ex-${k}`;
const table = (apercu: ApercuTable = {}, partie = EX) => renderToStaticMarkup(<TableDeJeu partie={partie} juger={() => undefined} terminer={() => undefined} abandonner={() => undefined} apercu={apercu} />);
const phases = (h: string) => [...h.matchAll(/class="poste" data-ph="(\d)"/g)].map((m) => m[1]).join("");

const t0 = table();
check("table : 3 cartes face cachée, main 1 sur 3", phases(t0) === "000" && t0.includes("<b class=\"grand\">1</b>") && t0.includes("/ 3</span>"));
check("table : 9 pastilles, aucune jouée", compte(t0, /<i class="pst"/g) === 9 && !/data-r=/.test(t0));
check("table : 3 emplacements, rack plein de 9 jetons (3 colonnes de 3)", compte(t0, /class="empl"/g) === 3 && compte(t0, /class="pileJ"/g) === 3 && compte(t0, /class="col" style="--n:3"/g) === 3 && t0.includes("9 JETONS"));
check("table : le sabot, les deux piles, les deux étiquettes", t0.includes('class="sabot"') && t0.includes("À REVOIR") && t0.includes("MAÎTRISÉES") && t0.includes("emplPile emplKo") && t0.includes("emplPile emplOk"));
check("table : Léonard étonné à la donne, sa phrase", /pose-etonne\.webp"[^>]*class="leo leoOn/.test(t0) && t0.includes("3 cartes, face cachée. Choisis-en une."));
check("table : la consigne et la plaque à zéro", t0.includes("Soulève une carte.") && t0.includes("0 jeton gagné") && !t0.includes('class="vol"') && !t0.includes('class="serie"'));
check("table : chaque carte est un bouton annoncé au lecteur d'écran", compte(t0, /aria-label="Carte \d sur 9 : face cachée, touche pour la soulever"/g) === 3);
check("table : la face avant porte la question, la carte son verso en trois cases", t0.includes("Affirmative covenant vs negative covenant") && t0.includes("En clair") && t0.includes("obligation de faire"));
check("table : le dos de la carte (RL)", compte(t0, /class="dosRL">RL</g) === 3 && t0.includes("Ranked Lobby"));

const t1 = table({ ouverte: { id: id(2), face: "recto" } });
check("recto : la carte 2 est soulevée, les autres couchées", phases(t1) === "010" && /data-libre/.test(t1) === false);
check("recto : Léonard moqueur, « Retourner » (Espace), pas de jugement", /pose-moqueur\.webp"[^>]*class="leo leoOn/.test(t1) && t1.includes("Cherche la réponse") && t1.includes('Retourner<span class="kbd">Espace</span>') && !t1.includes('class="encreV"'));
check("recto : les autres cartes ne sont plus cliquables", compte(t1, /aria-disabled="true"/g) === 2);

const t2 = table({ ouverte: { id: id(2), face: "verso" } });
check("verso : phase 2, « Maîtrisée » (1) et « Pas encore » (2)", phases(t2) === "020" && t2.includes('Maîtrisée<span class="kbd">1</span>') && t2.includes('Pas encore<span class="kbd">2</span>'));
check("verso : Léonard étonné, « Tu l'avais ? »", /pose-etonne\.webp"[^>]*class="leo leoOn/.test(t2) && t2.replace(/&#x27;/g, "'").includes("Tu l'avais ?"));

const t3 = table({ jugees: [{ id: id(1), ok: true }, { id: id(2), ok: false }], ouverte: { id: id(3), face: "recto" } });
check("jugées : 1 maîtrisée, 1 pas encore (pastilles, plaque, rack à 8)", phases(t3) === "341" && /data-r="ok"/.test(t3) && /data-r="ko"/.test(t3) && t3.includes("1 jeton gagné") && t3.includes("8 JETONS") && t3.includes("<b class=\"grand\">1</b>"));
check("jugées : la pastille de la carte en cours est cerclée", compte(t3, /data-cur/g) === 1);

const t4 = table({ jugees: [{ id: id(1), ok: true }, { id: id(2), ok: true }, { id: id(3), ok: true }] });
check("main réussie : Léonard fier, « Main suivante », série de 3 sur la plaque", /pose-fier\.webp"[^>]*class="leo leoOn/.test(t4) && t4.includes("Main suivante") && t4.includes("Série ×3") && t4.includes("3 jetons gagnés") && t4.includes("Belle main."));
check("main réussie : rack à 6 jetons (colonnes de 2)", compte(t4, /class="col" style="--n:2"/g) === 3);

const t5 = table({ jugees: [{ id: id(1), ok: false }, { id: id(2), ok: false }, { id: id(3), ok: true }] });
check("main ratée : Léonard déçu", /pose-decu\.webp"[^>]*class="leo leoOn/.test(t5) && t5.includes("Main difficile."));

const t6 = table({ main: 1, jugees: [1, 2, 3].map((k, i) => ({ id: id(k), ok: i !== 1 })), ouverte: { id: id(4), face: "recto" } });
check("main suivante : les 3 cartes de la main 1 sont en piles, 2 maîtrisées et 1 à revoir", compte(t6, /class="cartePile" data-s="ok"/g) === 2 && compte(t6, /class="cartePile" data-s="ko"/g) === 1 && phases(t6) === "100");
check("main 2 : « Main 2 / 3 », les pastilles de la main 1 (ok, ko, ok) puis la main en cours", t6.includes("<b class=\"grand\">2</b>") && compte(t6, /data-r="ok"/g) === 2 && compte(t6, /data-cur/g) === 3);

const t7 = table({ main: 2, jugees: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => ({ id: id(k), ok: true })) });
check("dernière main jouée : « Voir le bilan », sans-faute, rack vide", t7.includes("Voir le bilan") && t7.includes("Fin de partie.") && !t7.includes('class="col"') && t7.includes("0 JETON") && t7.includes("9 jetons gagnés"));

const t8 = table({ jugees: [{ id: id(1), ok: true }], vol: { col: 1 } });
check("jeton en vol : sa colonne, sans animation figée perdue", /class="vol"[^>]*style="--cm:0;animation-play-state:paused/.test(t8) && t8.includes(">RL</i>"));

// --- une main de 5 cartes, une main d'une carte
const cinqCartes = table({}, partieExemple(1, 5));
check("5 cartes par main : 5 emplacements, 5 cartes, --n:5", compte(cinqCartes, /class="empl"/g) === 5 && phases(cinqCartes) === "00000" && cinqCartes.includes("--n:5"));
const uneCarte = table({}, partieExemple(1, 1));
check("1 carte par main : une carte, « 1 carte, face cachée »", phases(uneCarte) === "0" && uneCarte.includes("1 carte, face cachée."));

// --- les raccourcis et l'enregistrement : le composant ne branche les touches que sur sa racine
check("table : racine focalisable (tabindex -1) pour recevoir les raccourcis", /class="fenetre"[^>]*tabindex="-1"/.test(t0));

// --- la distribution animée (sans état figé) : les cartes portent l'animation de donne
const enDonne = renderToStaticMarkup(<TableDeJeu partie={EX} juger={() => undefined} terminer={() => undefined} abandonner={() => undefined} />);
check("donne animée : chaque carte porte data-donne, rang de distribution 0, 1, 2", compte(enDonne, /data-donne=""/g) === 3 && enDonne.includes("--rg:0") && enDonne.includes("--rg:2") && !t0.includes("data-donne"));

// --- le bilan
const VERDICTS_BON = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => [id(k), k !== 3 && k !== 6]));
const bilan = (verdicts: Record<string, boolean>, partie = EX) =>
  renderToStaticMarkup(<BilanPartie partie={partie} verdicts={verdicts} historique={Object.values(verdicts)} nouvellePartie={() => undefined} rejouer={() => undefined} />).replace(/&#x27;/g, "'");
const bon = bilan(VERDICTS_BON);
check("bilan bon (7 / 9) : Léonard fier, sa phrase, le chiffre, la pile de 7 jetons", /pose-fier\.webp"[^>]*class="leo leoOn/.test(bon) && bon.includes("la banque te doit 7 jetons") && bon.includes("<b>7</b>") && bon.includes("/ 9") && bon.includes('class="col" style="--n:7"') && bon.includes("7 jetons gagnés sur 9"));
check("bilan bon : le récapitulatif, un pourcentage, une ligne par matière", bon.includes("3 mains") && bon.includes("9 cartes") && bon.includes("9 jetons en jeu") && bon.includes("soit 78 % de la partie") && compte(bon, /class="ligne"/g) === 3);
check("bilan bon : une pastille par carte (7 pleines, 2 à revoir)", compte(bon, /class="pip"/g) === 9 && compte(bon, /class="pip" data-ok=""/g) === 7 && compte(bon, /data-ko=""/g) === 2);
check("bilan bon : « À revoir (2) », leurs titres, « Rejouer les non maîtrisées (2) » et « Nouvelle partie »", bon.includes("À revoir (2)") && bon.includes("Rejouer les non maîtrisées (2)") && bon.includes("Nouvelle partie") && bon.includes("Quelle règle de production maximise le profit") && bon.includes("Breakeven, short-run shutdown, long-run exit"));
check("bilan bon : « Sans faute » pour la matière FSA et « 2 maîtrisées » pour Fixed Income", bon.includes("Sans faute") && bon.includes("1 maîtrisée") && !bon.includes("À reprendre"));
const VERDICTS_BAS = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => [id(k), k <= 2]));
const bas = bilan(VERDICTS_BAS);
check("bilan faible (2 / 9) : Léonard déçu, « Les cartes ne mentent pas », 7 à revoir", /pose-decu\.webp"[^>]*class="leo leoOn/.test(bas) && bas.includes("Les cartes ne mentent pas.") && bas.includes("À revoir (7)") && bas.includes("Rejouer les non maîtrisées (7)"));
const VERDICTS_MOYEN = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => [id(k), k <= 4]));
const moyen = bilan(VERDICTS_MOYEN);
check("bilan moyen (4 / 9) : Léonard moqueur", /pose-moqueur\.webp"[^>]*class="leo leoOn/.test(moyen) && moyen.includes("4 sur 9."));
const SANS_FAUTE = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => [id(k), true]));
const parfait = bilan(SANS_FAUTE);
check("sans faute : Léonard fier, rien à revoir, pas de « Rejouer »", /pose-fier\.webp"[^>]*class="leo leoOn/.test(parfait) && parfait.includes("Sans faute : 9 jetons pour toi") && parfait.includes("Rien à revoir") && !parfait.includes("Rejouer les non maîtrisées") && parfait.includes("À revoir (0)"));
const grosse = partieExemple(3, 3);
const BEAUCOUP = bilan(Object.fromEntries(grosse.mains.flat().map((c, i) => [c.id, i % 5 !== 0])), grosse);
check("bilan : la pile et sa colonne portent le même nombre de jetons (7)", compte(BEAUCOUP, /--n:7/g) === 2);

// --- des pages statiques à regarder (si un dossier est donné)
const sortie = process.argv[2];
if (sortie) {
  fs.mkdirSync(sortie, { recursive: true });
  const globals = fs.readFileSync("app/globals.css", "utf8");
  // les jetons clairs et sombres du site (le premier bloc :root, puis le mode nuit)
  const racine = /:root\s*\{[^}]*\}/.exec(globals)?.[0] ?? "";
  const nuit = /html\[data-theme="nuit"\]\s*\{[^}]*\}/.exec(globals)?.[0] ?? "";
  // les modules CSS tels quels, sans :global(…) (le navigateur ne le connaît pas)
  const lireCss = (f: string) => fs.readFileSync(f, "utf8").replace(/:global\(([^()]*)\)/g, "$1");
  // les noms de classes de deux modules peuvent se ressembler (.bulle, .carte) : chaque page ne reçoit que les feuilles de ses écrans
  const partieCss = lireCss("components/flashcards/partie/Partie.module.css");
  const poses = (partieCss.match(/\.leo \{[^}]*\}/) ?? [""])[0] + (partieCss.match(/\.leoOn \{[^}]*\}/) ?? [""])[0];
  const cssReglages = partieCss;
  const cssTable = [poses, lireCss("components/flashcards/partie/Table.module.css"), lireCss("components/flashcards/Verso.module.css"), lireCss("components/RichText.module.css")].join("\n");
  const cssBilan = [partieCss, lireCss("components/flashcards/partie/Bilan.module.css")].join("\n");
  // les images du site (public/) : chemins absolus du dossier de travail, jamais écrits dans un fichier du dépôt
  const publicUrl = "file:///" + path.resolve("public").split(path.sep).join("/") + "/";
  const reecrire = (s: string) => s.replace(/(src="|url\(")\/(leonard|encres)\//g, `$1${publicUrl}$2/`);
  // ce que font les composants au navigateur (échelle de la scène, taille du texte des cartes) : la même règle, sans React
  const script = `(function(){function echelle(){var el=document.querySelector('.fenetre'),sc=document.querySelector('.scene');if(!el||!sc)return;var cs=getComputedStyle(el),W=parseFloat(cs.getPropertyValue('--W')),H=parseFloat(cs.getPropertyValue('--H'));var v=sc.clientWidth/W;if(innerWidth>=768)v=Math.min(v,(innerHeight-250)/H);v=Math.max(.42,Math.min(1.3,v));el.style.setProperty('--k',v)}
function fit(){document.querySelectorAll('.fit').forEach(function(el){var min=parseFloat(el.dataset.min)||7,f=parseFloat(el.style.fontSize)||12,g=0;while(el.scrollHeight>el.clientHeight+1&&f>min&&g++<60){f=Math.max(min,f-.5);el.style.fontSize=f+'px'}})}
addEventListener('load',function(){(document.fonts&&document.fonts.ready||Promise.resolve()).then(function(){echelle();fit()})})})();`;
  const page = (corps: string, theme: "clair" | "nuit", largeur: number, css: string, fige = true) =>
    `<!doctype html><html lang="fr"${theme === "nuit" ? ' data-theme="nuit"' : ""}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@500;600&family=Dela+Gothic+One&display=swap">` +
    `<style>${racine}\n${nuit}\n:root{--font-brand:"Dela Gothic One";--font-mono:"Geist Mono";--font-sans:"Geist"}body{margin:0;background:var(--paper);color:var(--ink);font-family:"Geist",system-ui,sans-serif;-webkit-font-smoothing:antialiased}` +
    `.t-eyebrow{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2)}.m-0{margin:0}*,*::before,*::after{box-sizing:border-box}button{font:inherit}${fige ? "*{animation:none!important;transition:none!important}" : "*{transition:none!important}"}\n${reecrire(css)}</style></head>` +
    `<body><main style="width:${largeur}px;max-width:100%;margin:0 auto;padding:20px 16px">${reecrire(corps)}</main><script>${script}</script></body></html>`;
  fs.writeFileSync(path.join(sortie, "reglages.html"), page(html, "clair", 1180, cssReglages));
  fs.writeFileSync(path.join(sortie, "reglages-nuit.html"), page(html, "nuit", 1180, cssReglages));
  fs.writeFileSync(path.join(sortie, "reglages-mobile.html"), page(cinq, "clair", 390, cssReglages));
  fs.writeFileSync(path.join(sortie, "reglages-vide.html"), page(vide, "clair", 1180, cssReglages));
  fs.writeFileSync(path.join(sortie, "entree.html"), page(`<div style="display:grid;gap:16px;padding:8px">${e1}${e2}</div>`, "clair", 900, cssReglages));
  fs.writeFileSync(path.join(sortie, "entree-mobile.html"), page(`<div style="display:grid;gap:16px">${e2}</div>`, "clair", 390, cssReglages));
  // la table
  const tables: Record<string, string> = { "table-donne": t0, "table-recto": t1, "table-verso": t2, "table-jugees": t3, "table-main-reussie": t4, "table-main2": t6, "table-fin": t7, "table-5": table({ ouverte: { id: id(2), face: "recto" } }, partieExemple(1, 5)) };
  for (const [nom, h] of Object.entries(tables)) {
    fs.writeFileSync(path.join(sortie, nom + ".html"), page(h, "clair", 1180, cssTable));
    fs.writeFileSync(path.join(sortie, nom + "-mobile.html"), page(h, "clair", 390, cssTable));
  }
  fs.writeFileSync(path.join(sortie, "table-anim.html"), page(enDonne, "clair", 1180, cssTable, false));
  // le bilan
  const pagesBilan: Record<string, string> = { "bilan-bon": bon, "bilan-bas": bas, "bilan-moyen": moyen, "bilan-parfait": parfait };
  for (const [nom, h] of Object.entries(pagesBilan)) {
    fs.writeFileSync(path.join(sortie, nom + ".html"), page(h, "clair", 1180, cssBilan));
    fs.writeFileSync(path.join(sortie, nom + "-mobile.html"), page(h, "clair", 390, cssBilan));
  }
  fs.writeFileSync(path.join(sortie, "bilan-nuit.html"), page(bon, "nuit", 1180, cssBilan));
  fs.writeFileSync(path.join(sortie, "table-vol.html"), page(t8, "clair", 1180, cssTable, false));
  fs.writeFileSync(path.join(sortie, "table-nuit.html"), page(t2, "nuit", 1180, cssTable));
  console.log("pages écrites dans " + sortie);
}

console.log(ko ? `\n${ko} échec(s)` : "\nTout est vert.");
process.exit(ko ? 1 : 0);
