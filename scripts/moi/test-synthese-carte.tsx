// Test de la « Carte du programme » de la page Moi « La synthèse » (lot 5),
// sans base, réseau ni navigateur (calculs purs puis rendu react-dom/server) :
//   npx tsx --tsconfig tsconfig.json scripts/moi/test-synthese-carte.tsx
// Les 93 notions du vrai catalogue, cinq états, les compteurs de la légende
// (rouges + ambres + acquises + en cours + jamais vues = 93), l'isolation d'une
// matière, le repli sur 90 jours, les liens vers /fiches/ ou /courses/, aucune
// encre vive, la carte absente sans source. Les noms de classes des modules CSS
// sont rendus tels quels.
import "../codex/sans-css";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { CarteProgramme } from "@/components/moi/synthese/CarteProgramme";
import { matieresSynthese, mesuresNotionsDe, notionsDe, notionsDepuisPointsFaibles } from "@/components/moi/synthese/modele";
import { caseDe, estompee, panneauCarte, phraseCarte, rangsCarte, resumeCarte } from "@/components/moi/synthese/modele-carte";
import type { MatiereSynthese, NotionSynthese } from "@/components/moi/synthese/types";
import { maitriseDepuis } from "@/lib/maitrise";
import { NOTIONS } from "@/lib/notions";
import { TOPICS } from "@/lib/practiceTopics";

// le JSX des composants (tsconfig « preserve ») attend React en portée
(globalThis as { React?: typeof React }).React = React;

let ko = 0;
const titre = (t: string) => {
  console.log("");
  console.log(t);
};
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const compte = (html: string, re: RegExp) => (html.match(re) ?? []).length;
const NB = String.fromCharCode(160);
const routeur = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };
const rendre = (matieres: MatiereSynthese[] | null, notions: NotionSynthese[] | null, source: "unique" | "90j" | null, iso: number | null = null): string => {
  try {
    return renderToStaticMarkup(
      <AppRouterContext.Provider value={routeur}>
        <CarteProgramme matieres={matieres} notions={notions} sourceNotions={source} isoInitial={iso} />
      </AppRouterContext.Provider>,
    )
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"');
  } catch (e) {
    console.log(e);
    return "";
  }
};

// ── les données : les dix matières (dont une provisoire et une pas mesurée) et les 93 notions ──
const maitrise = maitriseDepuis({
  matieres: {
    ethics: { n: 80, total: 120, pct: 58 },
    quant: { n: 25, total: 30, pct: 52 },
    economics: { n: 4, total: 4 },
    fsa: { n: 60, total: 90, pct: 41 },
    corporate: { n: 45, total: 60, pct: 71 },
    equity: { n: 50, total: 70, pct: 66 },
    fixed_income: { n: 60, total: 200, pct: 38 },
    derivatives: { n: 41, total: 44, pct: 80 },
    alternatives: { n: 40, total: 40, pct: 63 },
    portfolio: { n: 12, total: 12, pct: 55 },
  },
});
if (!maitrise) throw new Error("maîtrise illisible");
const matieres = matieresSynthese(maitrise, null, null);

// la i-ième notion du catalogue prend l'état i % 7 : jamais vue, en cours (1 à 7 réponses), rouge, ambre, acquise (70 et 85), rouge (49)
const mesuresBrutes: Record<string, { pct: number | null; n: number; total: number }> = {};
NOTIONS.forEach((nt, i) => {
  const k = i % 7;
  if (k === 1) mesuresBrutes[nt.id] = { pct: null, n: 1 + (i % 7) + (i % 3), total: 7 };
  else if (k === 2) mesuresBrutes[nt.id] = { pct: 30, n: 20, total: 20 };
  else if (k === 3) mesuresBrutes[nt.id] = { pct: 55, n: 12, total: 12 };
  else if (k === 4) mesuresBrutes[nt.id] = { pct: 70, n: 20, total: 40 };
  else if (k === 5) mesuresBrutes[nt.id] = { pct: 85, n: 9, total: 9 };
  else if (k === 6) mesuresBrutes[nt.id] = { pct: 49, n: 8, total: 8 };
});
// 1 + (i % 7) + (i % 3) peut dépasser 7 : on borne à 7 pour rester « en cours »
for (const v of Object.values(mesuresBrutes)) if (v.pct === null) v.n = Math.min(v.n, 7);
const notions = notionsDe(NOTIONS, mesuresNotionsDe(mesuresBrutes));
const attendu = { r: 0, a: 0, e: 0, encours: 0, jamais: 0 };
NOTIONS.forEach((_, i) => {
  const k = i % 7;
  if (k === 0) attendu.jamais++;
  else if (k === 1) attendu.encours++;
  else if (k === 2 || k === 6) attendu.r++;
  else if (k === 3) attendu.a++;
  else attendu.e++;
});

titre("# les calculs");
const rangs = rangsCarte(matieres, notions, "unique");
const resume = resumeCarte(rangs);
const parMatiere = Object.fromEntries(TOPICS.map((t) => [t.key, NOTIONS.filter((n) => n.matiere === t.key).length]));
check("10 rangées, dans l'ordre du programme, une par matière", rangs.length === 10 && rangs.map((r) => r.cle).join() === TOPICS.map((t) => t.key).join());
check("chaque rangée porte les notions de sa matière (5, 11, 8, 12, 7, 8, 19, 10, 7, 6) : 93 cases", rangs.every((r) => r.cases.length === parMatiere[r.cle]) && rangs.map((r) => r.cases.length).join() === "5,11,8,12,7,8,19,10,7,6" && resume.total === 93);
check(
  "les cinq états : rouges + ambres + acquises + en cours + jamais vues = 93",
  resume.rouges + resume.ambres + resume.acquises + resume.enCours + resume.jamais === 93 && resume.rouges === attendu.r && resume.ambres === attendu.a && resume.acquises === attendu.e && resume.enCours === attendu.encours && resume.jamais === attendu.jamais,
  JSON.stringify(resume),
);
check("« notions sous 70 % » = rouges + ambres ; mesurées = sous + acquises", resume.sous === attendu.r + attendu.a && resume.mesurees === attendu.r + attendu.a + attendu.e);
check("la valeur de la colonne des matières : 58 %, ≈ 52 % (provisoire, infobulle), — (pas mesurée)", rangs[0].valeur === `58${NB}%` && rangs[1].valeur === `≈${NB}52${NB}%` && !!rangs[1].info && rangs[2].valeur === "—" && rangs[2].zone === null && rangs[2].valeurAria === "pas encore mesurée");
check("les zones de la colonne : rouge sous 50, ambre de 50 à 69, vert à 70 et plus", rangs[3].zone === "r" && rangs[0].zone === "a" && rangs[4].zone === "e" && rangs[7].zone === "e");
{
  const eth = notions.find((n) => n.m === 0 && n.etat === "e");
  const nt = (id: string, over: Partial<NotionSynthese>): NotionSynthese => ({ id, m: 0, court: "Code et Standards", pct: null, n: 0, etat: "jamais", href: "/fiches/ethics?page=1", ...over });
  const c45 = caseDe(nt("ethics:2", { pct: 45, n: 20, etat: "a" }), "Éthique", "unique");
  check("une case mesurée : « 45 », titre « Code et Standards (Éthique) : 45 %. Réviser cette notion. »", c45.valeur === "45" && c45.titre === `Code et Standards (Éthique) : 45${NB}%. Réviser cette notion.`, c45.titre);
  const c38 = caseDe(nt("ethics:2", { n: 3, etat: "encours" }), "Éthique", "unique");
  check("une case en cours : « 3/8 », nom lu « en cours, 3 réponses sur 8 »", c38.valeur === "3/8" && c38.titre.includes("en cours, 3 réponses sur 8"), c38.titre);
  check("une réponse : « 1/8 », « 1 réponse » au singulier", caseDe(nt("x", { n: 1, etat: "encours" }), "Éthique", "unique").titre.includes("1 réponse sur 8"));
  const cj = caseDe(nt("ethics:2", {}), "Éthique", "unique");
  check("jamais vue : « — » et « jamais vue »", cj.valeur === "—" && cj.titre.includes("jamais vue"), cj.titre);
  check("repli sur 90 jours : « pas vue depuis 90 jours »", caseDe(nt("ethics:2", {}), "Éthique", "90j").titre.includes("pas vue depuis 90 jours"));
  check("le lien d'une case = celui de la notion (fiche, sinon cours)", !!eth && rangs[0].cases.every((c) => c.href.startsWith("/fiches/") || c.href.startsWith("/courses/")));
}
check("estompee : rien d'estompé sans isolation ; avec l'isolation de la matière 2, seule la 2 reste nette", [0, 1, 2, 9].every((i) => !estompee(i, null)) && !estompee(2, 2) && estompee(0, 2) && estompee(9, 2));

titre("# la phrase « Ce que ça veut dire »");
{
  const p = phraseCarte(rangs, resume, null, "unique");
  check("l'ensemble : « N notions sous 70 %, dont M sous 50 % »", p.includes(`${resume.sous} notions sous 70${NB}%, dont ${resume.rouges} sous 50${NB}%.`), p);
  check("l'ensemble : les matières qui comptent le plus de notions sous 70 %", / en compte \d+\.| en comptent \d+ chacune\./.test(p), p);
  check("l'ensemble : les notions en cours et jamais vues, avec le conseil", p.includes(`${resume.enCours} notions en cours : encore quelques réponses et elles comptent.`) && p.includes(`${resume.jamais} notions jamais vues : ouvre-les avant qu'elles ne te coûtent des points le jour J.`), p);
  check("le repli sur 90 jours dit « pas vues depuis 90 j »", phraseCarte(rangs, resume, null, "90j").includes(`notions pas vues depuis 90${NB}j : ouvre-les`));
  const i1 = phraseCarte(rangs, resume, 1, "unique");
  const r1 = rangs[1];
  check("une matière isolée : son nom, ses notions sous 70 %, ses jamais vues et en cours", i1.startsWith(`Quant : ${r1.sous} notions sous 70${NB}%`) && i1.includes("Commence par la case la plus rouge."), i1);
  const vide = { total: 0, rouges: 0, ambres: 0, acquises: 0, enCours: 0, jamais: 0, sous: 0, mesurees: 0 };
  check("rien de mesuré : « il faut 8 réponses récentes à une notion pour la juger »", phraseCarte([], vide, null, "unique").includes("il faut 8 réponses récentes"));
  // une matière sans retard : « Rien à rattraper ici. » ; une seule notion jamais vue : singulier
  const calme = rangsCarte([matieres[0]], [{ id: "a", m: 0, court: "A", pct: 90, n: 20, etat: "e", href: "/fiches/x" }], "unique");
  check("tout acquis : « aucune notion sous 70 % … Rien à rattraper ici. »", phraseCarte(calme, resumeCarte(calme), 0, "unique").includes("aucune notion sous 70") && phraseCarte(calme, resumeCarte(calme), 0, "unique").endsWith("Rien à rattraper ici."));
  const un = rangsCarte([matieres[0]], [{ id: "a", m: 0, court: "A", pct: 90, n: 20, etat: "e", href: "/fiches/x" }, { id: "b", m: 0, court: "B", pct: null, n: 0, etat: "jamais", href: "/fiches/x" }], "unique");
  const pu = phraseCarte(un, resumeCarte(un), null, "unique");
  check("une seule jamais vue : singulier (« 1 notion jamais vue : ouvre-la avant qu'elle ne te coûte »)", pu.includes("1 notion jamais vue : ouvre-la avant qu'elle ne te coûte"), pu);
  check("aucune notion sous 70 % dans l'ensemble : « Aucune notion mesurée sous 70 % »", pu.startsWith(`Aucune notion mesurée sous 70${NB}%.`), pu);
}

titre("# le panneau du téléphone");
{
  const pan = panneauCarte(rangs[6], "unique");
  check("une ligne par notion de Fixed Income (19), dans l'ordre", pan.lignes.length === 19 && pan.lignes.map((l) => l.id).join() === rangs[6].cases.map((c) => c.id).join() && pan.nom === rangs[6].nom);
  const mesuree = pan.lignes.find((l) => l.pct !== null);
  const enCours = pan.lignes.find((l) => l.etat === "encours");
  const jamais = pan.lignes.find((l) => l.etat === "jamais");
  check("valeurs : « 55 % », « 3/8 » (en cours), « jamais vue » ; barres : largeur ≥ 1,5 et zone", !!mesuree && mesuree.valeur === `${mesuree.pct}${NB}%` && mesuree.w >= 1.5 && mesuree.ton !== null && !!enCours && /^\d\/8$/.test(enCours.valeur) && enCours.w === 0 && !!jamais && jamais.valeur === "jamais vue" && jamais.ton === null);
  check("le résumé : « N sous 70 % · N en cours · N jamais vues »", /^\d+ sous 70 % · \d+ en cours · \d+ jamais vues?$/.test(pan.resume.replace(new RegExp(NB, "g"), " ")), pan.resume);
  check("repli sur 90 jours : « pas vue » dans le panneau", panneauCarte(rangs[6], "90j").lignes.find((l) => l.etat === "jamais")?.valeur === "pas vue");
}

titre("# le repli sur 90 jours (points_faibles)");
{
  const lig = (id: string, ok: number, n: number) => ({ notion: id, recentes: Array.from({ length: n }, (_, i) => ({ ok: i < ok })) });
  const notions90 = notionsDepuisPointsFaibles([lig(NOTIONS[0].id, 7, 10), lig(NOTIONS[1].id, 2, 5), lig(NOTIONS[11].id, 18, 20)], NOTIONS);
  const r90 = rangsCarte(matieres, notions90, "90j");
  const s90 = resumeCarte(r90);
  check("93 cases : 2 mesurées (70 % et 90 %), 1 en cours (5 réponses), 90 pas vues", s90.total === 93 && s90.acquises === 2 && s90.enCours === 1 && s90.jamais === 90 && s90.rouges + s90.ambres === 0, JSON.stringify(s90));
  const html = rendre(matieres, notions90, "90j");
  check("la légende et les noms lus disent « pas vue depuis 90 j(ours) », jamais « jamais vue »", html.includes(`pas vue depuis 90${NB}j`) && html.includes("pas vue depuis 90 jours") && !html.includes("jamais vue"));
  check("la phrase du repli parle de 90 j", html.includes(`notions pas vues depuis 90${NB}j : ouvre-les`));
}

titre("# le rendu");
const html = rendre(matieres, notions, "unique");
check("la carte est rendue (id=\"carte\", titre « Carte du programme », une seule fois)", compte(html, /id="carte"/g) === 1 && html.includes("Carte du programme") && compte(html, /<section/g) === 1, String(html.length));
check("93 liens <a> dans la carte, aucun autre (le panneau n'est pas ouvert)", compte(html, /<a /g) === 93);
check("chaque lien mène à /fiches/ ou à /courses/", [...html.matchAll(/<a [^>]*href="([^"]*)"/g)].every((m) => m[1].startsWith("/fiches/") || m[1].startsWith("/courses/")) && compte(html, /href="\/fiches\//g) + compte(html, /href="\/courses\//g) === 93);
check("cases acquises : autant de .acq que le compteur « acquise » de la légende", compte(html, /class="cel acq"/g) === resume.acquises && html.includes(`acquise · <b class="mono">${resume.acquises}</b>`), `${compte(html, /class="cel acq"/g)} / ${resume.acquises}`);
check(
  "les cinq classes de cases = les compteurs : rou + amb + acq + enc + jam = 93",
  compte(html, /class="cel rou"/g) === resume.rouges &&
    compte(html, /class="cel amb"/g) === resume.ambres &&
    compte(html, /class="cel acq"/g) === resume.acquises &&
    compte(html, /class="cel enc"/g) === resume.enCours &&
    compte(html, /class="cel jam"/g) === resume.jamais &&
    compte(html, /class="cel (rou|amb|acq|enc|jam)"/g) === 93,
);
check("la légende : cinq entrées avec leurs compteurs, dont « en cours (moins de 8 réponses) » et « jamais vue »", html.includes(`sous 50${NB}% · <b class="mono">${resume.rouges}</b>`) && html.includes(`50 à 70${NB}% · <b class="mono">${resume.ambres}</b>`) && html.includes("en cours (moins de 8 réponses)") && html.includes(`jamais vue · <b class="mono">${resume.jamais}</b>`));
check("le compteur de l'en-tête : « N notions sous 70 % »", html.includes(`>${resume.sous}</b><span>notions sous 70${NB}%</span>`));
check("les chiffres des cases : « 30 », « 3/8 » ou plus, « — »", html.includes("<b>30</b>") && /<b>[1-7]\/8<\/b>/.test(html) && html.includes("<b>—</b>"));
check("titre et nom lu de chaque case (infobulle = aria-label)", compte(html, /title="[^"]+\. (Réviser|Ouvrir) cette notion\."/g) === 93 && compte(html, /aria-label="[^"]+\. (Réviser|Ouvrir) cette notion\."/g) === 93);
check("les phrases : sous-titre (ordinateur) et sous-titre (téléphone), « Ce que ça veut dire »", html.includes("93 notions, une case chacune") && html.includes("clique une case pour la réviser, une matière pour l'isoler") && html.includes("touche une matière pour lire ses notions juste dessous") && html.includes("Ce que ça veut dire :"));
check("sans isolation : aucune case ni matière estompée, pas de « Revoir », pas de panneau, l'astuce du téléphone", !/class="[^"]*\boff\b/.test(html) && !html.includes("Revoir les 10 matières</button>") && !html.includes("Ses notions") && html.includes('class="astuceTel"'));
check("10 boutons de matière, aucun enfoncé ; valeur « 58 % » et « — » dans la colonne", compte(html, /<button[^>]*aria-pressed="false"/g) === 10 && !html.includes('aria-pressed="true"') && html.includes(`58${NB}%`));
check("aucune encre vive : 0 rl-encre-vif, 0 rl-encre, 0 data-palette (tout en aplats)", !html.includes("rl-encre-vif") && !html.includes("rl-encre") && !html.includes("data-palette"));
check("aucun antislash ni chemin de travail dans le rendu", !html.includes(String.fromCharCode(92)) && !/scratchpad|AppData|C:[/]/.test(html));
check("sans NaN, undefined ni [object]", !/NaN|undefined|\[object/.test(html));
check("le poids du rendu reste raisonnable (hydratation #418 : pas de tracé recopié, une icône de 4 rectangles)", html.length < 60_000 && compte(html, /<svg/g) <= 4, String(html.length));

titre("# l'isolation d'une matière");
{
  const iso = rendre(matieres, notions, "unique", 6);
  const dehors = 93 - rangs[6].cases.length;
  check("Fixed Income isolée : 74 cases estompées (.off), les 19 siennes nettes", compte(iso, /class="cel (rou|amb|acq|enc|jam) off"/g) === dehors && dehors === 74 && compte(iso, /class="cel (rou|amb|acq|enc|jam)"/g) === 19);
  check("les 9 autres boutons de matière sont estompés, le sien est enfoncé (.on, aria-pressed)", compte(iso, /class="lm off"/g) === 9 && compte(iso, /class="lm on"/g) === 1 && compte(iso, /aria-pressed="true"/g) === 1);
  check("« Revoir les 10 matières » apparaît (bouton texte), le nom lu du bouton propose de revenir", iso.includes(`class="raz"`) && iso.includes("Revoir les 10 matières") && iso.includes("Fixed Income : 38"));
  check("le panneau du téléphone s'ouvre sous la grille : 19 liens de plus, « Ses notions », le nom complet", iso.includes("Ses notions") && iso.includes('<h3 class="font-brand">Fixed Income</h3>') && compte(iso, /<a /g) === 93 + 19 && iso.includes('class="panneau"') && !iso.includes('class="astuceTel"'));
  check("la phrase devient celle de la matière : « Fixed Income : N notions sous 70 % … »", iso.includes("Fixed Income : ") && iso.includes("Commence par la case la plus rouge."));
  check("toujours aucune encre vive", !iso.includes("rl-encre"));
}

titre("# la carte se masque sans source");
check("sans source de notions (sourceNotions null) : rien du tout", rendre(matieres, notions, null) === "");
check("sans notions (null) ou liste vide : rien du tout", rendre(matieres, null, "unique") === "" && rendre(matieres, [], "unique") === "");
check("sans matières : rien du tout", rendre(null, notions, "unique") === "");
check("notions d'une matière inconnue seulement : rien du tout", rendre(matieres, [{ id: "z", m: -1, court: "Z", pct: 80, n: 20, etat: "e", href: "/fiches/z" }], "unique") === "");

titre("# conventions du dépôt");
{
  const fichiers = ["components/moi/synthese/CarteProgramme.tsx", "components/moi/synthese/modele-carte.ts", "components/moi/synthese/CarteProgramme.module.css", "lib/voice-moi-carte.ts"];
  const textes = fichiers.map((f) => fs.readFileSync(f, "utf8"));
  check("aucun Intl ni toLocaleString dans les fichiers de la carte (hydratation)", textes.every((t) => !/Intl\.|toLocaleString|toLocaleDateString/.test(t)));
  check("aucun antislash ni chemin Temp / scratchpad dans les fichiers de la carte", textes.every((t) => !t.includes(String.fromCharCode(92)) && !/scratchpad|AppData|C:[/]/.test(t)));
  check("aucune encre vive importée (ni EncreVive, ni Bouton) dans la carte", !/EncreVive|BoutonAction|\bBouton\b/.test(textes[0]));
  check("les cases acquises sont en --acquis, texte blanc", /\.acq\s*\{[^}]*var\(--acquis\)[^}]*#fff/.test(textes[2]));
  check("trois seuils de colonnes : 10, 8 et 6", textes[2].includes("repeat(10,") && textes[2].includes("repeat(8,") && textes[2].includes("repeat(6,"));
}

console.log("");
console.log(ko === 0 ? "Tout est vert." : `${ko} échec(s).`);
process.exit(ko === 0 ? 0 : 1);
