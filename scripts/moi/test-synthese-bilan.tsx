// Test du bilan de la page Moi « La synthèse » (lot 4) : Tes lacunes, Tes
// forces, Où gagner des points. Calculs (components/moi/synthese/modele-bilan.ts)
// puis rendu react-dom/server de la rangée (RangeeBilan), sans base, réseau ni
// navigateur :
//   npx tsx --tsconfig tsconfig.json scripts/moi/test-synthese-bilan.tsx
// Les données sont celles de la maquette D (61 % de préparation, Fixed Income
// la pire notion, Quant la plus forte), construites ici avec les vraies
// fonctions de la synthèse (matieresSynthese, notionsDe) et le vrai catalogue.
import "../codex/sans-css";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { NOTIONS, notionsDeMatiere } from "@/lib/notions";
import { couvertureDe, preparationDe, zoneDe, type Maitrise, type MaitriseMatiere } from "@/lib/maitrise";
import { TOPICS } from "@/lib/practiceTopics";
import { RangeeBilan } from "@/components/moi/synthese/RangeeBilan";
import { matieresSynthese, noteSynthese, notionsDe, type MesureNotion } from "@/components/moi/synthese/modele";
import {
  HREF_CARTE,
  atoutsBilan,
  cartesBilan,
  ecartLigne,
  forces,
  gagner,
  hrefAtelier,
  hrefEntretenir,
  lacunes,
  matiereCible,
  phraseForces,
  phraseGagner,
  phraseLacunes,
  premiereAGagner,
  texteGain,
  texteToutesLesNotions,
} from "@/components/moi/synthese/modele-bilan";
import type { MatiereSynthese, NotionSynthese } from "@/components/moi/synthese/types";

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

// ── les données ────────────────────────────────────────────────────────────

/** Les maîtrises de la maquette : 61 % de préparation, Fixed Income la plus faible, Quant la plus forte. */
const PCT: Record<string, number | null> = { ethics: 58, quant: 83, economics: 66, fsa: 49, corporate: 76, equity: 63, fixed_income: 43, derivatives: 51, alternatives: 69, portfolio: 74 };
/** Les moyennes des joueurs : Quant +13, Portefeuille +11, Économie, Entreprise et Alternatifs +7, Actions +3, les autres sous la moyenne. */
const MOY: Record<string, number> = { quant: 70, portfolio: 63, economics: 59, corporate: 69, alternatives: 62, equity: 60, ethics: 62, fsa: 50, fixed_income: 45, derivatives: 51 };

function maitrise(pcts: Record<string, number | null>): Maitrise {
  const matieres = TOPICS.map(
    (t): MaitriseMatiere => {
      const pct = pcts[t.key] ?? null;
      return { cle: t.key, nom: t.label, court: t.label, poids: t.weight, pct, n: pct === null ? 0 : 60, total: pct === null ? 0 : 120, statut: pct === null ? "non_mesuree" : "mesuree", derniere: null, debut: null, ancienne: null, zone: zoneDe(pct) };
    },
  );
  return { matieres, preparation: preparationDe(matieres), couverture: couvertureDe(matieres), source: "unique" };
}
function donnees(pcts: Record<string, number | null> = PCT, moy: Record<string, number> | null = MOY) {
  const m = maitrise(pcts);
  return { m, matieres: matieresSynthese(m, null, moy), note: noteSynthese(m) };
}

type Spec = [matiere: string, index: number, pct: number | null, n: number];
function notionsAvec(specs: Spec[]): NotionSynthese[] {
  const mesures: Record<string, MesureNotion> = {};
  for (const [matiere, i, pct, n] of specs) {
    const nt = notionsDeMatiere(matiere)[i];
    mesures[nt.id] = { pct, n, total: n, derniere: null };
  }
  return notionsDe(NOTIONS, mesures);
}
const id = (matiere: string, i: number) => notionsDeMatiere(matiere)[i].id;

const SPEC_A: Spec[] = [
  ["fixed_income", 0, 31, 20],
  ["equity", 0, 31, 12], // même pct que la première, moins de réponses : passe après
  ["fsa", 0, 38, 20],
  ["ethics", 1, 42, 20],
  ["derivatives", 0, 45, 20],
  ["fsa", 1, 47, 20],
  ["portfolio", 0, 52, 20],
  ["ethics", 2, 56, 20],
  ["equity", 1, 60, 20],
  ["equity", 2, 62, 20],
  ["corporate", 0, 65, 20],
  ["equity", 3, 66, 20],
  ["economics", 0, 68, 20],
  ["alternatives", 0, 69, 20], // 14 notions sous 70
  ["quant", 0, 91, 20],
  ["portfolio", 1, 88, 20],
  ["corporate", 1, 85, 20],
  ["quant", 1, 72, 20],
  ["ethics", 0, 70, 20], // pile au seuil : une force
  ["economics", 1, null, 3], // en cours : ni lacune ni force
];
const SPEC_B: Spec[] = SPEC_A.filter((s) => !(s[0] === "equity" && s[1] === 0)); // FSA deux fois parmi les cinq pires

const base = donnees();
const notionsA = notionsAvec(SPEC_A);
const notionsB = notionsAvec(SPEC_B);

// ═══ Calculs : Tes lacunes ═══
titre("# Tes lacunes : calculs");
{
  const l = lacunes(notionsA, base.matieres);
  check("5 lignes, les plus basses d'abord", l.lignes.length === 5 && l.lignes.map((x) => x.pct).join() === "31,31,38,42,45", l.lignes.map((x) => x.pct).join());
  check("à égalité de pct (31), la notion qui a le plus de réponses passe devant", l.lignes[0].id === id("fixed_income", 0) && l.lignes[1].id === id("equity", 0));
  check("« N sous 70 % » compte toutes les notions mesurées sous 70 (14), pas seulement les 5", l.sous70 === 14, String(l.sous70));
  check("mesurées : 19 (les 14 lacunes, 5 forces) ; la notion « en cours » n'en est pas", l.mesurees === 19, String(l.mesurees));
  check("la pire est Fixed Income 31 %", l.pire?.id === id("fixed_income", 0) && l.pire.matiere === "Fixed Income");
  check("écart au seuil : « à 39 points du seuil »", ecartLigne(l.lignes[0]) === "à 39 points du seuil", ecartLigne(l.lignes[0]));
  check("toutes en zone rouge sous 50 %", l.lignes.every((x) => x.ton === "r"));
  check("la barre est à la valeur du pct", l.lignes[2].w === 38);
  check("« S'entraîner » mène à l'Atelier de la notion (identifiant encodé)", l.lignes[0].hrefAtelier === `/atelier?notion=${encodeURIComponent(id("fixed_income", 0))}` && l.lignes[0].hrefAtelier === hrefAtelier(id("fixed_income", 0)));
  check("« Réviser » : le lien de la notion", l.lignes[0].href === notionsA.find((n) => n.id === id("fixed_income", 0))?.href);
  check("« Les 14 notions → » au-delà de 5, sinon « La carte du programme → »", texteToutesLesNotions(14) === "Les 14 notions →" && texteToutesLesNotions(5) === "La carte du programme →" && HREF_CARTE === "#carte", texteToutesLesNotions(14));
  check("la première matière de « Où gagner » est Fixed Income", premiereAGagner(base.matieres) === "fixed_income");
  check(
    "phrase A : cinq matières différentes, la pire en Fixed Income, qui est aussi la première à gagner",
    phraseLacunes(l, premiereAGagner(base.matieres), base.matieres) === "tes cinq pires notions sont dans cinq matières différentes, la pire en Fixed Income ; c'est aussi la matière où tu peux gagner le plus de points.",
    phraseLacunes(l, premiereAGagner(base.matieres), base.matieres) ?? "null",
  );
  const lb = lacunes(notionsB, base.matieres);
  check(
    "phrase B : deux des cinq pires notions sont en FSA, la pire en Fixed Income (la phrase de la maquette)",
    phraseLacunes(lb, premiereAGagner(base.matieres), base.matieres) === "deux de tes cinq pires notions sont en FSA, la pire en Fixed Income ; c'est aussi la matière où tu peux gagner le plus de points.",
    phraseLacunes(lb, premiereAGagner(base.matieres), base.matieres) ?? "null",
  );
  check("phrase : une autre matière des cinq est la première à gagner → « X est aussi la matière… »", (phraseLacunes(l, "fsa", base.matieres) ?? "").endsWith(" ; FSA est aussi la matière où tu peux gagner le plus de points."));
  check("phrase : la première à gagner n'est pas parmi les cinq → pas de rapprochement", (phraseLacunes(l, "quant", base.matieres) ?? "").endsWith("la pire en Fixed Income."));
  check("phrase : sans matière à gagner, pas de rapprochement", (phraseLacunes(l, null, base.matieres) ?? "").endsWith("la pire en Fixed Income."));
  const toutes = lacunes(notionsAvec([["fsa", 0, 30, 20], ["fsa", 1, 35, 20], ["fsa", 2, 40, 20]]), base.matieres);
  check("trois notions mesurées, toutes en FSA : « toutes en FSA »", (phraseLacunes(toutes, null, base.matieres) ?? "").startsWith("tes trois pires notions sont toutes en FSA"));
  const seule = lacunes(notionsAvec([["fsa", 0, 40, 20]]), base.matieres);
  check("une seule notion mesurée : « ta notion la plus faible est en FSA (40 %) »", phraseLacunes(seule, null, base.matieres) === `ta notion la plus faible est en FSA (40${NB}%).`, phraseLacunes(seule, null, base.matieres) ?? "null");
  const bonnes = lacunes(notionsAvec([["fsa", 0, 80, 20], ["fsa", 1, 75, 20]]), base.matieres);
  check("aucune notion sous 70 : compteur 0, ligne « 5 points au-dessus du seuil », phrase dédiée", bonnes.sous70 === 0 && ecartLigne(bonnes.lignes[0]) === "5 points au-dessus du seuil" && (phraseLacunes(bonnes, null, base.matieres) ?? "").startsWith("aucune notion mesurée n'est sous 70"), ecartLigne(bonnes.lignes[0]));
  const vide = lacunes(notionsAvec([["economics", 1, null, 3]]), base.matieres);
  check("aucune notion mesurée : liste vide, pas de pire, pas de phrase", vide.lignes.length === 0 && vide.pire === null && vide.sous70 === 0 && phraseLacunes(vide, null, base.matieres) === null);
  const cible = matiereCible(base.matieres);
  check("état vide : la matière la plus faible mesurée (Fixed Income) et son lien", cible.cle === "fixed_income" && cible.href === "/practice?topic=fixed_income&go=1", JSON.stringify(cible));
  check("état vide sans aucune matière mesurée : la plus lourde (Éthique)", matiereCible(donnees(Object.fromEntries(Object.keys(PCT).map((k) => [k, null]))).matieres).cle === "ethics");
  check("sans matières du tout : la plus lourde aussi", matiereCible(null).cle === "ethics" && matiereCible(null).href === "/practice?topic=ethics&go=1");
}

// ═══ Calculs : Tes forces ═══
titre("# Tes forces : calculs");
{
  const f = forces(notionsA, base.matieres);
  check("3 forces, les plus hautes d'abord : 91, 88, 85", f.lignes.length === 3 && f.lignes.map((x) => x.pct).join() === "91,88,85", f.lignes.map((x) => x.pct).join());
  check("seulement des notions à 70 % ou plus", f.lignes.every((x) => x.pct >= 70 && !x.sous && x.ton === "e"));
  check("écart au-dessus du seuil : 21, 18, 15", f.lignes.map((x) => x.points).join() === "21,18,15");
  check("matières : Quant, Portefeuille, Entreprise", f.lignes.map((x) => x.matiere).join() === "Quant,Portefeuille,Entreprise", f.lignes.map((x) => x.matiere).join());
  const sans69 = forces(notionsAvec([["quant", 0, 69, 20], ["quant", 1, 70, 20]]), base.matieres);
  check("69 % n'est pas une force, 70 % l'est (pile au seuil)", sans69.lignes.length === 1 && sans69.lignes[0].pct === 70 && sans69.lignes[0].points === 0);
  const egalite = forces(notionsAvec([["quant", 0, 80, 5], ["quant", 1, 80, 20], ["quant", 2, 80, 20]]), base.matieres);
  check("à égalité, le plus de réponses d'abord, puis l'ordre du catalogue", egalite.lignes[0].id === id("quant", 1) && egalite.lignes[1].id === id("quant", 2) && egalite.lignes[2].id === id("quant", 0));
  check("aucune force : liste vide, pas de phrase, pas de lien d'entretien", forces(notionsAvec([["quant", 0, 50, 20]]), base.matieres).lignes.length === 0 && phraseForces(forces(notionsAvec([["quant", 0, 50, 20]]), base.matieres)) === null && hrefEntretenir([]) === null);
  check("« Entretenir mes forces → » : une séance de 20 dans les matières des forces", hrefEntretenir(f.lignes) === "/practice?topic=quant,portfolio,corporate&n=20&go=1", hrefEntretenir(f.lignes) ?? "null");
  check(
    "phrase : où sont les forces + le plus gros avantage sur les joueurs",
    phraseForces(f) === `tes trois notions les plus solides sont en Quant, Portefeuille et Entreprise. Face aux autres joueurs, ton plus gros avantage est en Quant (+13${NB}points).`,
    phraseForces(f) ?? "null",
  );
  check("phrase : toutes les forces dans une même matière", (phraseForces(forces(notionsAvec([["quant", 0, 91, 20], ["quant", 1, 85, 20]]), null)) ?? "") === "tes deux notions les plus solides sont toutes en Quant.");
  check("phrase : une seule force", phraseForces(forces(notionsAvec([["quant", 0, 91, 20]]), null)) === `ta notion la plus solide est en Quant (91${NB}%).`);
  // les atouts face aux joueurs
  const a = atoutsBilan(base.matieres);
  check("atouts : Quant +13, Portefeuille +11, puis +7 (programme), Actions +3 ; 6 au total sur 10 matières comparables", a !== null && a.liste.map((x) => `${x.cle}${x.points}`).join() === "quant13,portfolio11,economics7,corporate7,alternatives7,equity3" && a.total === 6 && a.comparables === 10, a ? a.liste.map((x) => `${x.cle}${x.points}`).join() : "null");
  check("atouts masqués (null) sans aucune moyenne fondée", atoutsBilan(donnees(PCT, null).matieres) === null && atoutsBilan(null) === null);
  const trop: MatiereSynthese[] = base.matieres.map((m) => ({ ...m, moyJoueurs: (m.pct ?? 0) + 30 }));
  const aucun = atoutsBilan(trop);
  check("des moyennes mais aucune avance : [] (l'encart dit « pas encore d'avance »)", aucun !== null && aucun.liste.length === 0 && aucun.total === 0 && aucun.comparables === 10);
  const demi: MatiereSynthese[] = base.matieres.map((m) => (m.cle === "quant" ? { ...m, moyJoueurs: 82.6 } : m));
  check("une avance qui s'arrondit à 0 point n'est pas un atout", !(atoutsBilan(demi)?.liste.some((x) => x.cle === "quant") ?? true));
  check("une matière non mesurée n'est ni atout ni comparable", atoutsBilan(donnees({ ...PCT, quant: null }).matieres)?.comparables === 9 && !(atoutsBilan(donnees({ ...PCT, quant: null }).matieres)?.liste.some((x) => x.cle === "quant") ?? true));
}

// ═══ Calculs : Où gagner des points ═══
titre("# Où gagner des points : calculs");
{
  const g = gagner(base.matieres, base.note);
  check("la préparation est 61 % (maquette)", base.m.preparation === 61 && g.paliers?.aujourdhui === 61, String(base.m.preparation));
  check("7 matières sous 70, de la plus rentable : Fixed Income, FSA, Éthique, Dérivés, Actions, Économie, Alternatifs", g.lignes.map((l) => l.cle).join() === "fixed_income,fsa,ethics,derivatives,equity,economics,alternatives", g.lignes.map((l) => l.cle).join());
  check("gains (au dixième) : 3,3 / 2,6 / 2,0 / 1,2 / 0,9 / 0,3 / 0,1", g.lignes.map((l) => l.gain).join() === "3.3,2.6,2,1.2,0.9,0.3,0.1", g.lignes.map((l) => l.gain).join());
  check("« +3,3 » : virgule, vrai plus, un décimal", texteGain(g.lignes[0].gain) === "+3,3" && texteGain(2) === "+2,0" && texteGain(0.1) === "+0,1");
  check("le gain suit le contrat (matieres[i].gain) pour chaque matière", g.lignes.every((l) => base.matieres.find((m) => m.cle === l.cle)?.gain === l.gain));
  check("barres relatives au plus grand gain : 100 % en tête, 3 % au minimum, 3 en noir puis violet", g.lignes[0].w === 100 && g.lignes[g.lignes.length - 1].w === 3 && g.lignes.map((l) => l.sombre).join() === "true,true,true,false,false,false,false", g.lignes.map((l) => l.w).join());
  check("rangs 1 à 7", g.lignes.map((l) => l.rang).join() === "1,2,3,4,5,6,7");
  const p = g.paliers;
  check("paliers : 61 % aujourd'hui, 69 % avec les 3 premières, 72 % avec les 7", p?.aujourdhui === 61 && p.trois === 69 && p.toutes === 72 && p.n === 7, p ? `${p.aujourdhui}/${p.trois}/${p.toutes}` : "null");
  check("la somme est exacte : préparation + Σ des gains, sans l'écart des arrondis", p !== null && Math.abs(p.barre.prep + p.barre.trois + p.barre.reste - (6298 / 102.5 + g.lignes.reduce((s, l) => s + l.exact, 0))) < 1e-9);
  check("69 < 70 : les trois premières ne suffisent pas ; les sept, si (« tu passes la barre »)", p?.passeTrois === false && p.passeToutes === true);
  check("la barre : 61,4 de préparation puis 7,9 (3 premières) puis 2,4 (les 4 autres)", p !== null && Math.abs(p.barre.prep - 61.44) < 0.01 && Math.abs(p.barre.trois - 7.9) < 0.01 && Math.abs(p.barre.reste - 2.44) < 0.02, p ? JSON.stringify(p.barre) : "null");
  check("phrase : trois matières valent 7,9 points, commence par Fixed Income", phraseGagner(g) === `trois matières valent 7,9${NB}points de note à elles seules. Commence par Fixed Income.`, phraseGagner(g) ?? "null");
  check("bouton : Commencer par Fixed Income vers /practice?topic=fixed_income&go=1", g.cible?.cle === "fixed_income" && g.cible.href === "/practice?topic=fixed_income&go=1" && g.etat === "liste");
  check("toutes mesurées : aucune « pas encore mesurée »", g.mesurees === 10 && g.pasMesurees === 0);

  // une matière non mesurée sort du calcul des gains (mais pèse 0 dans la préparation)
  const sansDer = donnees({ ...PCT, derivatives: null });
  const gs = gagner(sansDer.matieres, sansDer.note);
  check("Dérivés non mesurée : absente des gains, comptée « pas encore mesurée »", !gs.lignes.some((l) => l.cle === "derivatives") && gs.lignes.length === 6 && gs.pasMesurees === 1 && gs.mesurees === 9);
  check("… la préparation baisse à 58 %, les paliers restent exacts (66 % puis 67 %) : la barre n'est pas franchie", gs.paliers?.aujourdhui === 58 && gs.paliers.trois === 66 && gs.paliers.toutes === 67 && gs.paliers.passeToutes === false, gs.paliers ? `${gs.paliers.aujourdhui}/${gs.paliers.trois}/${gs.paliers.toutes}` : "null");
  check("… et son gain contractuel est 0", sansDer.matieres.find((m) => m.cle === "derivatives")?.gain === 0);

  // trois matières ou moins : pas de palier « 3 premières »
  const une = donnees({ ethics: 40, quant: 80, economics: 80, fsa: 80, corporate: 80, equity: 80, fixed_income: 80, derivatives: 80, alternatives: 80, portfolio: 80 });
  const gu = gagner(une.matieres, une.note);
  check("une seule matière sous 70 : pas de palier « 3 premières », 78 % avec elle", gu.lignes.length === 1 && gu.paliers?.trois === null && gu.paliers.toutes === 78 && gu.paliers.passeToutes === false, gu.paliers ? JSON.stringify(gu.paliers) : "null");
  check("… phrase au singulier : « Éthique pèse 5,1 points de note à elle seule »", (phraseGagner(gu) ?? "").startsWith(`Éthique pèse 5,1${NB}points de note à elle seule`), phraseGagner(gu) ?? "null");

  // la note estimée se masque sous 50 % du programme mesuré
  const peu = donnees({ ethics: 40 });
  const gp = gagner(peu.matieres, peu.note);
  check("sous 50 % du programme mesuré : paliers masqués, mais les gains restent", gp.paliers === null && gp.lignes.length === 1 && (peu.note?.couverture ?? 100) < 50, String(peu.note?.couverture));
  check("sans note : paliers masqués", gagner(base.matieres, null).paliers === null);

  // toutes à 70 % et plus
  const hautes = donnees(Object.fromEntries(Object.keys(PCT).map((k) => [k, 75])));
  const gh = gagner(hautes.matieres, hautes.note);
  check("toutes les matières mesurées à 70 % et plus : état « tout70 », pas de ligne, pas de palier, pas de phrase", gh.etat === "tout70" && gh.lignes.length === 0 && gh.paliers === null && phraseGagner(gh) === null);
  // aucune matière mesurée
  const rien = donnees(Object.fromEntries(Object.keys(PCT).map((k) => [k, null])));
  const gr = gagner(rien.matieres, rien.note);
  check("aucune matière mesurée : état « aucune », 10 pas mesurées, bouton vers 10 questions en Éthique (la plus lourde)", gr.etat === "aucune" && gr.pasMesurees === 10 && gr.cible?.cle === "ethics" && gr.cible.href === "/practice?topic=ethics&n=10&go=1", gr.cible?.href ?? "null");
}

// ═══ Calculs : la rangée ═══
titre("# La rangée : cartes présentes");
{
  const c3 = cartesBilan({ matieres: base.matieres, notions: notionsA });
  check("trois cartes quand tout répond", c3.n === 3 && c3.lacunes && c3.forces && c3.gagner);
  check("sans notions : seul « Où gagner »", cartesBilan({ matieres: base.matieres, notions: null }).n === 1);
  check("sans matières : Lacunes et Forces", cartesBilan({ matieres: null, notions: notionsA }).n === 2);
  check("ni l'un ni l'autre : aucune carte", cartesBilan({ matieres: null, notions: null }).n === 0);
}

// ═══ Rendu ═══
const rendre = (matieres: MatiereSynthese[] | null, notions: NotionSynthese[] | null, note = base.note): string => {
  try {
    return renderToStaticMarkup(
      <AppRouterContext.Provider value={routeur}>
        <RangeeBilan matieres={matieres} notions={notions} note={note} />
      </AppRouterContext.Provider>,
    )
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&");
  } catch (e) {
    console.log(e);
    return "";
  }
};
const section = (html: string, ancre: string): string => {
  const debut = html.indexOf(ancre);
  if (debut < 0) return "";
  const fin = html.indexOf("</section>", debut);
  return html.slice(debut, fin);
};

titre("# Rendu : la rangée complète");
const page = rendre(base.matieres, notionsA);
{
  check("le rendu n'est pas vide", page.length > 3000, String(page.length));
  check('la rangée porte data-n="3"', page.includes('data-n="3"') && compte(page, /class="rangee"/g) === 1);
  check('les ancres : id="points-faibles" (Lacunes) et id="gagner" (Où gagner), une fois chacune', compte(page, /id="points-faibles"/g) === 1 && compte(page, /id="gagner"/g) === 1);
  check("les trois titres", page.includes("Tes lacunes") && page.includes("Tes forces") && page.includes("Où gagner des points"));
  check("l'ordre : Lacunes, puis Forces, puis Où gagner", page.indexOf("Tes lacunes") < page.indexOf("Tes forces") && page.indexOf("Tes forces") < page.indexOf("Où gagner des points"));
  check("les classes de colonnes c5, c4, c3", page.includes('class="carte petite carteBilan c5"') && page.includes('class="carte petite carteBilan c4"') && page.includes('class="carte petite carteBilan c3"'));
  check("aria-labelledby de chaque carte pointe un titre existant", ["syn-lacunes", "syn-forces", "syn-gagner"].every((i) => page.includes(`aria-labelledby="${i}"`) && page.includes(`id="${i}"`)));
  check("aucun « undefined », « NaN » ou « [object » dans le rendu", !["undefined", "NaN", "[object"].some((x) => page.includes(x)));
  check("poids de la rangée raisonnable (moins de 30 Ko)", page.length < 30000, String(page.length));
}

titre("# Rendu : Tes lacunes");
{
  const lac = section(page, 'id="points-faibles"');
  check("5 lignes de lacunes", compte(lac, /class="lacune"/g) === 5, String(compte(lac, /class="lacune"/g)));
  check(`compteur « 14 sous 70 % »`, lac.includes(`>14</b><span>sous 70${NB}%</span>`));
  check("la pire d'abord, avec son écart : Fixed Income · à 39 points du seuil", lac.indexOf("<b>" + notionsA.find((n) => n.id === id("fixed_income", 0))!.court + "</b>") > 0 && lac.includes("Fixed Income · à 39 points du seuil"));
  check("deux liens par ligne : Réviser (fiche) et S'entraîner (Atelier)", compte(lac, />Réviser</g) === 5 && compte(lac, />S'entraîner</g) === 5 && lac.includes(`href="${hrefAtelier(id("fixed_income", 0))}"`));
  check("« Réviser » mène à la fiche de la notion", lac.includes(`href="${notionsA.find((n) => n.id === id("fixed_income", 0))!.href}"`));
  check("le bouton d'encre : « Atelier sur ta pire notion · 15 min » vers l'Atelier de la pire", lac.includes("Atelier sur ta pire notion") && lac.includes("15 min") && lac.includes('class="rl-encre encre bouton action"'));
  check("un bouton d'encre (un liquide) au plus dans la carte", compte(lac, /class="rl-encre-vif"/g) === 1 && compte(lac, /data-palette="jade"/g) === 1);
  check("« Les 14 notions → » vers #carte", lac.includes('href="#carte"') && lac.includes("Les 14 notions →"));
  check("« Ce que ça veut dire » calculée", lac.includes("Ce que ça veut dire :") && lac.includes("tes cinq pires notions sont dans cinq matières différentes"));
  check("barre à zones : repère du seuil et lecture « Duration… 31 %, seuil 70 % »", compte(lac, /class="seuil"/g) === 5 && lac.includes(`: 31${NB}%, seuil 70${NB}%`));
}

titre("# Rendu : Tes forces");
{
  const frc = section(page, 'id="syn-forces"');
  check("3 forces", compte(frc, /class="force"/g) === 3);
  check("la plus haute d'abord : 91 % et « 21 points au-dessus du seuil »", frc.includes(`91${NB}%`) && frc.includes("21 points au-dessus du seuil"));
  check("barres vertes « acquis » (classe ze), aucune rouge ni ambre", compte(frc, /class="ze"/g) === 3 && !frc.includes('class="zr"') && !frc.includes('class="za"'));
  check("encart des atouts : 6 pastilles « Quant +13 »…", frc.includes("Tes atouts face aux joueurs") && compte(frc, /class="atout"/g) === 6 && frc.includes('<b>Quant</b><span class="mono">+13</span>'));
  check("… et « dans 6 matières sur 10 »", frc.includes("Points d'avance sur la moyenne, dans 6 matières sur 10."), frc.slice(frc.indexOf("Points d'avance"), frc.indexOf("Points d'avance") + 90));
  check("« Défier un ami » (contour) vers /duel, sans liquide", frc.includes('href="/duel"') && frc.includes("Défier un ami") && frc.includes('class="plus"'));
  check("« Entretenir mes forces → » vers /practice?topic=quant,portfolio,corporate&n=20&go=1", frc.includes('href="/practice?topic=quant,portfolio,corporate&n=20&go=1"') && frc.includes("Entretenir mes forces →"));
  check("aucun bouton d'encre dans Tes forces", !frc.includes("rl-encre"));
  check("phrase calculée", frc.includes("tes trois notions les plus solides sont en Quant, Portefeuille et Entreprise."));
}

titre("# Rendu : Où gagner des points");
{
  const gag = section(page, 'id="gagner"');
  check("7 lignes de gains, les trois premières en noir, les autres en violet", compte(gag, /class="gain"/g) === 7 && compte(gag, /class="piste"/g) === 3 && compte(gag, /class="piste violet"/g) === 4, `${compte(gag, /class="piste"/g)}/${compte(gag, /class="piste violet"/g)}`);
  check("« +3,3 » pour Fixed Income, en tête, largeur 100 %", gag.includes("+3,3") && gag.includes('style="width:100%"'));
  check("le palier de note : 61 %, 69 %, 72 % et « tu passes la barre » (à 72 seulement : 69 < 70)", gag.includes(`61${NB}%`) && gag.includes(`69${NB}%`) && gag.includes(`72${NB}%`) && compte(gag, /tu passes la barre/g) === 1, String(compte(gag, /tu passes la barre/g)));
  check("… « avec les 3 premières à 70 % » (sans le passage) et « avec les 7 : tu passes la barre »", gag.includes(`avec les 3 premières à 70${NB}%`) && gag.includes("avec les 7 : <b>tu passes la barre</b>"));
  check("la barre des paliers est lue : « 61 % aujourd'hui, 69 % avec les trois premières, 72 % avec les 7 »", gag.includes(`61${NB}% aujourd'hui, 69${NB}% avec les trois premières, 72${NB}% avec les 7`));
  check("phrase calculée et bouton « Commencer par Fixed Income » vers /practice?topic=fixed_income&go=1", gag.includes("trois matières valent 7,9") && gag.includes("Commencer par Fixed Income") && gag.includes('href="/practice?topic=fixed_income&go=1"'));
  check("un bouton d'encre (un liquide) au plus dans la carte", compte(gag, /class="rl-encre-vif"/g) === 1);
  check("deux liquides en tout dans la rangée : Lacunes et Où gagner", compte(page, /class="rl-encre-vif"/g) === 2 && compte(page, /data-palette="jade"/g) === 2 && !/data-palette="(?!jade)/.test(page));
  const cartes = page.split("<section").slice(1);
  check("jamais plus d'un bouton d'encre par carte", cartes.length === 3 && cartes.every((c) => compte(c, /class="rl-encre-vif"/g) <= 1), cartes.map((c) => compte(c, /class="rl-encre-vif"/g)).join());
}

titre("# Rendu : variantes");
{
  const sansMat = rendre(null, notionsA);
  check('sans matières : Lacunes et Forces seulement, data-n="2", pas d ancre #gagner', sansMat.includes('data-n="2"') && !sansMat.includes('id="gagner"') && sansMat.includes("Tes lacunes") && sansMat.includes("Tes forces"));
  check("… sans matières, pas d'atouts (pas de moyennes) et la matière vient du catalogue", !sansMat.includes("Tes atouts face aux joueurs") && sansMat.includes("Fixed Income · à 39 points du seuil"));
  const sansNot = rendre(base.matieres, null);
  check('sans notions : « Où gagner » seul, data-n="1", l ancre #points-faibles sur la rangée (une fois)', sansNot.includes('data-n="1"') && compte(sansNot, /id="points-faibles"/g) === 1 && /<div[^>]*data-n="1"[^>]*id="points-faibles"/.test(sansNot) && sansNot.includes('id="gagner"') && !sansNot.includes("Tes lacunes"));
  check("sans matières : pas de lien vers #carte (la carte du programme se masque)", !sansMat.includes('href="#carte"'));
  check("ni l'un ni l'autre : rien du tout", rendre(null, null) === "");

  const sansAtouts = rendre(donnees(PCT, null).matieres, notionsA);
  check("sans moyennes des joueurs : l'encart « atouts » est masqué, la carte reste", !sansAtouts.includes("Tes atouts face aux joueurs") && sansAtouts.includes("Tes forces") && compte(sansAtouts, /class="force"/g) === 3);
  const sansAvance = rendre(base.matieres.map((m) => ({ ...m, moyJoueurs: (m.pct ?? 0) + 30 })), notionsA);
  check("des moyennes mais aucune avance : « Pas encore d'avance sur la moyenne des joueurs »", sansAvance.includes("Pas encore d'avance sur la moyenne des joueurs, dans aucune matière.") && compte(sansAvance, /class="atout"/g) === 0);

  // joueur tout neuf : rien de mesuré, aucune notion vue
  const neuf = donnees(Object.fromEntries(Object.keys(PCT).map((k) => [k, null])));
  const nouveau = rendre(neuf.matieres, notionsAvec([]), neuf.note);
  check('joueur neuf : les trois cartes restent (data-n="3") avec leur état vide', nouveau.includes('data-n="3"') && compte(nouveau, /class="vide"/g) === 3, String(compte(nouveau, /class="vide"/g)));
  check("… Lacunes : « Il faut 8 réponses récentes » et « S'entraîner en Éthique » (la matière la plus lourde)", nouveau.includes("Il faut 8 réponses récentes à une notion pour la juger") && nouveau.includes("S'entraîner en Éthique") && nouveau.includes('href="/practice?topic=ethics&go=1"'));
  check("… Forces : « Ta première force arrive à 70 % sur 8 réponses récentes », pas de duel, lien « S'entraîner → »", nouveau.includes(`Ta première force arrive à 70${NB}% sur 8 réponses récentes.`) && !nouveau.includes("Défier un ami") && nouveau.includes("S'entraîner →"));
  check("… Où gagner : « Aucune matière n'est encore mesurée » et « Faire 10 questions en Éthique »", nouveau.includes("Aucune matière n'est encore mesurée : il faut 10 réponses") && nouveau.includes("Faire 10 questions en Éthique") && nouveau.includes('href="/practice?topic=ethics&n=10&go=1"'));
  check("… sans compteur « sous 70 % » ni « pas encore mesurée » superflu", !nouveau.includes("sous 70") && !nouveau.includes("pas encore mesurée, hors"));
  const cartesNeuf = nouveau.split("<section").slice(1);
  check("… toujours un bouton d'encre au plus par carte (Lacunes et Où gagner : 1 chacun, Forces : 0)", cartesNeuf.map((c) => compte(c, /class="rl-encre-vif"/g)).join() === "1,0,1", cartesNeuf.map((c) => compte(c, /class="rl-encre-vif"/g)).join());

  // toutes à 70 % et plus
  const hautes = donnees(Object.fromEntries(Object.keys(PCT).map((k) => [k, 78])));
  const haut = rendre(hautes.matieres, notionsA, hautes.note);
  check("toutes les matières à 70 % et plus : « Toutes tes matières mesurées passent 70 % », pas de bouton Commencer", haut.includes(`Toutes tes matières mesurées passent 70${NB}%.`) && !haut.includes("Commencer par"));

  // peu de programme mesuré : paliers masqués, gains gardés
  const peu = donnees({ ethics: 40, quant: 60 });
  const bas = rendre(peu.matieres, notionsA, peu.note);
  check("sous 50 % du programme mesuré : pas de palier de note, les gains restent", !bas.includes("Ta note estimée, si tu les remontes") && bas.includes("+") && bas.includes("8 matières pas encore mesurées, hors de ce calcul."), String(peu.note?.couverture));
}

// ═══ Hygiène des fichiers ═══
titre("# Hygiène : hydratation et chemins");
{
  const racine = process.cwd();
  const fichiers = [
    "components/moi/synthese/modele-bilan.ts",
    "components/moi/synthese/BarreZone.tsx",
    "components/moi/synthese/Lacunes.tsx",
    "components/moi/synthese/Forces.tsx",
    "components/moi/synthese/Gagner.tsx",
    "components/moi/synthese/RangeeBilan.tsx",
    "components/moi/synthese/Bilan.module.css",
    "lib/voice-moi-bilan.ts",
  ];
  const sources = fichiers.map((f) => [f, fs.readFileSync(path.join(racine, f), "utf8")] as const);
  check("aucun Intl ni toLocaleString (pas d'écart d'hydratation)", sources.every(([f, t]) => f.endsWith(".css") || !t.includes("Intl.") && !t.includes("toLocaleString")));
  check("aucun chemin Temp ou scratchpad et aucun antislash (piège Tailwind)", sources.every(([, t]) => !/scratchpad|AppData/i.test(t) && !t.includes(String.fromCharCode(92))));
  check("aucun « use client » : trois cartes de papier rendues côté serveur", sources.every(([, t]) => !t.includes('"use client"')));
  check("aucune fonction passée à un îlot client (aucun hook ni useState)", sources.every(([, t]) => !/use(State|Effect|Memo|Id|Ref)[(]/.test(t)));
  const css = sources.find(([f]) => f.endsWith(".css"))![1];
  check("le CSS : #22643f n'apparaît pas en dur (le vert vient de --acquis)", !css.includes("#22643f") && css.includes("var(--acquis)"));
}

console.log("");
console.log(ko === 0 ? "TOUT EST VERT" : `${ko} échec(s)`);
if (ko > 0) process.exit(1);
