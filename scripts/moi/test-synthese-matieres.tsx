// Test de la carte « Tes matières » de la page Moi « La synthèse » (lot 3),
// react-dom/server, sans base, réseau ni navigateur :
//   npx tsx --tsconfig tsconfig.json scripts/moi/test-synthese-matieres.tsx
// D'abord le calcul (modele.ts : radar, barres, vue d'ensemble, fiche, phrases
// à 30, 60 et 90 jours, avec et sans historique, avec une matière choisie), puis
// le rendu statique (l'îlot dans son état de départ, la fiche, les barres, les
// sélecteurs). Les données sont celles de la maquette D : 61 % de maîtrise
// globale, +6 points sur 30 jours, dix matières en hausse. Les noms de classes
// des modules CSS sont rendus tels quels.
import "../codex/sans-css";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { BarresZones } from "@/components/moi/synthese/graphes/BarresZones";
import { Radar } from "@/components/moi/synthese/graphes/Radar";
import { FicheVue, VueEnsemble } from "@/components/moi/synthese/MatiereFiche";
import { Selecteur } from "@/components/moi/synthese/Selecteur";
import { TesMatieres } from "@/components/moi/synthese/TesMatieres";
import {
  NBSP,
  RADAR_GRAND,
  RADAR_PETIT,
  comparaisonsDispo,
  ecartMatiere,
  ensembleMatieres,
  etiquettesRadar,
  ficheMatiere,
  geometrieRadar,
  globaleSynthese,
  infoMatiere,
  lignesBarres,
  matieresSynthese,
  notionsDe,
  phraseMatieres,
  resumeNotions,
  texteResume,
  valeurMatiere,
  type MesureNotion,
  type PointHistorique,
} from "@/components/moi/synthese/modele";
import type { GlobaleSynthese, MatiereSynthese } from "@/components/moi/synthese/types";
import { maitriseDepuis, type Maitrise } from "@/lib/maitrise";
import { NOTIONS } from "@/lib/notions";

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
const ns = (t: string) => t.split(NBSP).join(" ");
const routeur = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };
const rendre = (el: React.ReactElement): string => {
  try {
    return renderToStaticMarkup(<AppRouterContext.Provider value={routeur}>{el}</AppRouterContext.Provider>)
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&");
  } catch (e) {
    console.log(e);
    return "";
  }
};

// ── les données de la maquette : ta maîtrise, il y a 30 / 60 / 90 jours, réponses ──
const DONNEES: readonly (readonly [string, number, number, number, number, number])[] = [
  ["ethics", 58, 51, 44, 35, 412],
  ["quant", 74, 70, 62, 52, 233],
  ["economics", 66, 62, 53, 44, 190],
  ["fsa", 49, 41, 34, 26, 301],
  ["corporate", 71, 68, 58, 47, 156],
  ["equity", 63, 55, 48, 37, 248],
  ["fixed_income", 44, 36, 29, 22, 287],
  ["derivatives", 52, 47, 39, 30, 121],
  ["alternatives", 69, 66, 56, 45, 98],
  ["portfolio", 77, 71, 62, 50, 174],
];
const maitrise = (surcharge: Record<string, { pct: number | null; n: number; total: number }> = {}): Maitrise =>
  maitriseDepuis({ matieres: { ...Object.fromEntries(DONNEES.map((d) => [d[0], { pct: d[1], n: 60, total: d[5] }])), ...surcharge } }) as Maitrise;
const point = (jour: string, col: 2 | 3 | 4): PointHistorique => ({ jour, matieres: Object.fromEntries(DONNEES.map((d) => [d[0], { pct: d[col], n: 60 }])) });
const histo = (): PointHistorique[] => [point("2026-10-01", 2), point("2026-09-01", 3), point("2026-08-02", 4)];

const M = maitrise();
const mats = matieresSynthese(M, histo(), null);
const glob = globaleSynthese(M, histo());
const sansHisto = matieresSynthese(M, null, null);
const globSans = globaleSynthese(M, null);

// quelques notions mesurées (Fixed Income : une rouge, une ambre, une acquise, une en cours ; le reste jamais vue)
const FI = NOTIONS.filter((n) => n.matiere === "fixed_income");
const mesuresNotions: Record<string, MesureNotion> = {
  [FI[0].id]: { pct: 72, n: 20, total: 40, derniere: null },
  [FI[1].id]: { pct: 48, n: 20, total: 31, derniere: null },
  [FI[2].id]: { pct: 57, n: 12, total: 12, derniere: null },
  [FI[3].id]: { pct: null, n: 3, total: 3, derniere: null },
};
const notions = notionsDe(NOTIONS, mesuresNotions);

// ───────────────────────────────────────────────────────────────────────────
console.log("# la maquette : les chiffres");
check("dix matières, maîtrise globale 61 %, il y a 30 / 60 / 90 jours : 55, 47, 37", mats.length === 10 && glob.auj === 61 && glob.ilYa?.[30] === 55 && glob.ilYa?.[60] === 47 && glob.ilYa?.[90] === 37, JSON.stringify(glob));
check("la comparaison : 30, 60 et 90 jours ; aucune sans historique ; 30 retiré quand elle n'était pas mesurée", comparaisonsDispo(glob).join() === "30,60,90" && comparaisonsDispo(globSans).length === 0 && comparaisonsDispo(null).length === 0 && comparaisonsDispo({ auj: 61, ilYa: { 30: null, 60: 47, 90: 37 } } as GlobaleSynthese).join() === "60,90");

titre("# le radar : dix sommets, l'anneau du seuil à 70, les seuils 49 / 50 / 69 / 70");
{
  const vals = mats.map((m) => m.pct);
  const comp30 = mats.map((m) => m.ilYa?.[30] ?? null);
  for (const [nom, p] of [["grand", RADAR_GRAND], ["petit", RADAR_PETIT]] as const) {
    const g = geometrieRadar(p, vals, comp30, null);
    const sommets = (poly: string) => poly.split(" ").length;
    check(`${nom} : 10 sommets partout (toi, comparaison, anneaux 100 / 70 / 50 / 25)`, [g.toi, g.comp ?? "", g.z100, g.z70, g.z50, g.z25].every((x) => sommets(x) === 10));
    const [x0, y0] = g.z70.split(" ")[0].split(",").map(Number);
    check(`${nom} : l'anneau 70 passe à 70 % du rayon sur l'axe du haut (${p.R * 0.7})`, Math.abs(x0 - p.cx) < 0.11 && Math.abs(p.cy - y0 - p.R * 0.7) < 0.11, `${x0},${y0}`);
    const [xt, yt] = g.toi.split(" ")[0].split(",").map(Number);
    check(`${nom} : le sommet d'Éthique (58 %) est à 58 % du rayon`, Math.abs(xt - p.cx) < 0.11 && Math.abs(p.cy - yt - p.R * 0.58) < 0.11, `${xt},${yt}`);
    check(`${nom} : les repères 50, 70 % et 100 (le seuil marqué)`, g.reperes.length === 3 && ns(g.reperes[1].texte) === "70 %" && g.reperes[1].seuil && g.reperes[0].texte === "50" && g.reperes[2].texte === "100" && !g.reperes[0].seuil);
  }
  const bord = [49, 50, 69, 70, null, 0, 100, 10, 80, 30];
  const g = geometrieRadar(RADAR_GRAND, bord, null, null);
  const points = (d: string) => (d === "M0 0" ? 0 : compte(d, /M/g));
  check("seuils : 49, 0, 10 et 30 rouges ; 50 et 69 ambre ; 70, 80 et 100 acquis ; 1 point creux", points(g.ptsR) === 4 && points(g.ptsA) === 2 && points(g.ptsE) === 3 && points(g.ptsV) === 1, `${points(g.ptsR)} ${points(g.ptsA)} ${points(g.ptsE)} ${points(g.ptsV)}`);
  check("une matière non mesurée est posée à 0 : son sommet est au centre", g.toi.split(" ")[4] === `${RADAR_GRAND.cx},${RADAR_GRAND.cy}`, g.toi.split(" ")[4]);
  check("sans comparaison : ni polygone ni points de comparaison ; sans choix : ni halo ni anneau", g.comp === null && g.compPts === null && g.halo === null && g.sel === null);
  const gs = geometrieRadar(RADAR_GRAND, bord, bord, 0);
  check("matière choisie : le halo de l'axe et l'anneau de sélection sont posés", gs.halo !== null && gs.sel !== null && Math.abs((gs.halo?.x2 ?? 0) - RADAR_GRAND.cx) < 0.11);
  const vide = geometrieRadar(RADAR_GRAND, mats.map(() => null), null, null);
  check("rien de mesuré : dix points creux, aucun autre", points(vide.ptsV) === 10 && points(vide.ptsR) === 0 && points(vide.ptsA) === 0 && points(vide.ptsE) === 0);
}

titre("# les étiquettes du radar : dix boutons, nom court ou mini, côté, place en %");
{
  const e = etiquettesRadar(mats, 30, null);
  check("10 étiquettes, côtés h / d / b / g selon l'axe", e.length === 10 && e[0].cote === "h" && e[5].cote === "b" && [1, 2, 3, 4].every((i) => e[i].cote === "d") && [6, 7, 8, 9].every((i) => e[i].cote === "g"), e.map((x) => x.cote).join(""));
  check("noms courts et mini (Fixed Income / Fixed Inc., Économie / Éco), valeur, écart signé", e[6].court === "Fixed Income" && e[6].mini === "Fixed Inc." && e[2].court === "Économie" && e[2].mini === "Éco" && ns(e[6].valeur) === "44 %" && e[6].ecart?.texte === "+8" && e[6].ecart?.ton === "pos");
  check("sous le seuil : Éthique (58) et Fixed Income (44) ; au-dessus : Quant (74)", e[0].sous && e[6].sous && !e[1].sous);
  check("la phrase lue : « Éthique et Standards Professionnels : 58 %, +7 points face à toi il y a 30 jours. Ouvrir sa fiche. »", ns(e[0].aria) === "Éthique et Standards Professionnels : 58 %, +7 points face à toi il y a 30 jours. Ouvrir sa fiche.", e[0].aria);
  check("la place en % du dessin (grand et petit), le sommet du haut est centré", e[0].xG === `${(100 * RADAR_GRAND.cx) / RADAR_GRAND.larg}%` && e[0].xP.endsWith("%") && e[0].yG.endsWith("%") && parseFloat(e[0].yG) < 20);
  check("la matière choisie est marquée", etiquettesRadar(mats, 30, 3)[3].on && etiquettesRadar(mats, 30, 3).filter((x) => x.on).length === 1);
  const sans = etiquettesRadar(sansHisto, null, null);
  check("sans comparaison : pas d'écart, la phrase lue sans « face à toi »", sans.every((x) => x.ecart === null) && !sans[0].aria.includes("face à toi"));
}

titre("# les barres : tri du programme ou du plus faible (stable), repère, matières non mesurées");
{
  const prog = lignesBarres(mats, 30, "programme", null);
  check("tri du programme : l'ordre officiel", prog.map((l) => l.i).join() === "0,1,2,3,4,5,6,7,8,9");
  const faible = lignesBarres(mats, 30, "faible", null);
  check("tri du plus faible : Fixed Income (44), FSA (49), Dérivés (52), Éthique (58)…", faible.map((l) => l.court).slice(0, 4).join() === "Fixed Income,FSA,Dérivés,Éthique" && faible[9].court === "Portefeuille", faible.map((l) => l.court).join());
  const egaux: MatiereSynthese[] = mats.map((m, i) => ({ ...m, pct: i === 2 || i === 5 || i === 8 ? 60 : m.pct }));
  check("tri stable : à égalité (60 %), l'ordre du programme", lignesBarres(egaux, null, "faible", null).filter((l) => l.valeur.startsWith("60")).map((l) => l.i).join() === "2,5,8");
  const nm: MatiereSynthese[] = mats.map((m, i) => (i === 1 ? { ...m, pct: null, statut: "non_mesuree", n: 3 } : i === 7 ? { ...m, pct: null, statut: "non_mesuree", n: 0 } : m));
  const tn = lignesBarres(nm, 30, "faible", null);
  check("les non mesurées vont à la fin (dans l'ordre du programme), barre vide « pas encore mesurée »", tn[8].i === 1 && tn[9].i === 7 && tn[8].nonMesuree && tn[8].w === 0 && tn[8].sous === "pas encore mesurée" && tn[8].ton === null && tn[8].valeur === "—" && tn[8].ecart === null);
  check("un 0 % se voit (largeur 1,5) ; 100 % : 100", lignesBarres(mats.map((m, i) => ({ ...m, pct: i === 0 ? 0 : i === 1 ? 100 : m.pct })), null, "programme", null).slice(0, 2).map((l) => l.w).join() === "1.5,100");
  check("zones : 49 rouge, 50 et 69 ambre, 70 acquis", ["r", "a", "a", "e"].join() === [49, 50, 69, 70].map((p) => lignesBarres(mats.map((m) => ({ ...m, pct: p })), null, "programme", null)[0].ton).join());
  check("repère de comparaison = la maîtrise à la date ; aucun sans comparaison", prog[6].repere === 36 && lignesBarres(mats, null, "programme", null)[6].repere === null);
  const sel = lignesBarres(mats, 30, "programme", 6);
  check("matière ouverte : elle est marquée, les neuf autres sont estompées", sel[6].on && !sel[6].off && sel.filter((l) => l.off).length === 9);
  check("« nouvelle » quand la matière n'était pas mesurée à la date, sans écart chiffré", lignesBarres(mats.map((m, i) => (i === 3 ? { ...m, ilYa: { 30: null, 60: null, 90: null } } : m)), 30, "programme", null)[3].ecart?.texte === "nouvelle" && ecartMatiere({ pct: 50, ilYa: { 30: null, 60: 40, 90: 30 } }, 30)?.genre === "nouvelle");
}

titre("# la valeur : « ≈ 52 % » provisoire (avec son infobulle), « — » non mesurée");
{
  const prov = { pct: 52, statut: "provisoire" as const, n: 23 };
  check("provisoire : « ≈ 52 % » et « provisoire · 23 réponses sur 40 »", ns(valeurMatiere(prov)) === "≈ 52 %" && infoMatiere(prov) === "provisoire · 23 réponses sur 40");
  check("mesurée : « 61 % », pas d'infobulle ; non mesurée : « — »", ns(valeurMatiere({ pct: 61, statut: "mesuree" })) === "61 %" && infoMatiere({ statut: "mesuree", n: 60 }) === null && valeurMatiere({ pct: null, statut: "non_mesuree" }) === "—");
  const ps = matieresSynthese(maitrise({ ethics: { pct: 52, n: 23, total: 23 } }), histo(), null);
  check("la matière provisoire garde son statut, et l'étiquette du radar l'écrit « ≈ »", ps[0].statut === "provisoire" && ns(etiquettesRadar(ps, 30, null)[0].valeur) === "≈ 52 %" && etiquettesRadar(ps, 30, null)[0].info === "provisoire · 23 réponses sur 40" && ns(etiquettesRadar(ps, 30, null)[0].aria).includes("environ 52 %, mesure provisoire"));
}

titre("# la vue d'ensemble : comptes par zone, plus forte et plus faible, évolution");
{
  const e = ensembleMatieres(mats, glob, 30);
  check("globale 61 %, il y a 30 j : 55 %, +6 points", e.globale === 61 && e.avant?.pct === 55 && e.avant.j === 30 && e.avant.ecart === "+6" && e.avant.points === "+6 points" && e.avant.ton === "pos", JSON.stringify(e.avant));
  check("3 à 70 % et plus, 5 de 50 à 69, 2 sous 50, aucune non mesurée (total 10)", e.haute === 3 && e.moyenne === 5 && e.basse === 2 && e.nonMesurees === 0 && e.total === 10);
  check("10 matières sur 10 en hausse", e.hausse?.n === 10 && e.hausse?.sur === 10);
  check("la plus forte : Portefeuille · 77 % ; la plus faible : Fixed Income · 44 % (ouvre l'index 6)", e.fort?.court === "Portefeuille" && ns(e.fort.valeur) === "77 %" && e.faible?.court === "Fixed Income" && ns(e.faible.valeur) === "44 %" && e.faible.i === 6);
  check("l'évolution : classée du plus fort gain au plus faible, à égalité l'ordre du programme (FSA, Actions, Fixed Income à +8)", e.genre === "ecart" && e.evolution.slice(0, 4).map((l) => l.court).join() === "FSA,Actions,Fixed Income,Éthique" && e.evolution[0].texte === "+8" && e.evolution[0].w === 100 && e.evolution.every((l) => !l.neg), e.evolution.map((l) => `${l.court}${l.texte}`).join(" "));
  const ee = ensembleMatieres(mats.map((m, i) => (i === 4 ? { ...m, ilYa: { 30: 75, 60: 60, 90: 50 } } : m)), glob, 30);
  check("une baisse : signe moins vrai, barre rouge", ee.evolution.at(-1)?.texte === "−4" && ee.evolution.at(-1)?.neg === true, JSON.stringify(ee.evolution.at(-1)));
  const sh = ensembleMatieres(sansHisto, globSans, null);
  check("sans historique : classées par maîtrise, ni « avant » ni « hausse » ; la globale se calcule quand même (61)", sh.genre === "classement" && sh.avant === null && sh.hausse === null && sh.globale === 61 && sh.evolution[0].court === "Portefeuille" && ns(sh.evolution[0].texte) === "77 %" && sh.evolution[9].court === "Fixed Income");
  const nm = ensembleMatieres(mats.map((m, i) => (i < 3 ? { ...m, pct: null, statut: "non_mesuree" as const, n: 2 } : m)), glob, 30);
  check("3 matières non mesurées : comptées à part, rangées à la fin, sans « — » compté dans les zones", nm.nonMesurees === 3 && nm.haute + nm.moyenne + nm.basse === 7 && nm.evolution.slice(-3).every((l) => l.texte === "—" && l.w === 0));
  const une = ensembleMatieres(mats.map((m, i) => (i === 0 ? m : { ...m, pct: null, statut: "non_mesuree" as const, n: 0 })), null, null);
  check("une seule matière mesurée : forte oui, faible non (pas de bouton « Ouvrir »)", une.fort?.court === "Éthique" && une.faible === null);
}

titre("# la fiche d'une matière");
{
  const f = ficheMatiere(mats[6], 6, 30, notions, "unique");
  check("Fixed Income : 44 %, +8 en 30 jours, poids 12,5 %, 287 réponses, il y a 30 j : 36 %, à gagner +3,2 pts", ns(f.valeur) === "44 %" && f.ecart?.genre === "ecart" && f.ecart.texte === "+8" && ns(f.poids) === "12,5 %" && f.reponses === "287" && f.avant?.j === 30 && ns(f.avant.valeur) === "36 %" && ns(f.gain) === "+3,2 pts", JSON.stringify({ gain: f.gain, poids: f.poids }));
  check("son évolution : 90, 60, 30 jours puis aujourd'hui (22, 29, 36, 44), « auj. » en dernier", f.evolution?.map((p) => `${ns(p.libelle)}:${ns(p.valeur)}`).join() === "90 j:22 %,60 j:29 %,30 j:36 %,auj.:44 %", f.evolution?.map((p) => `${ns(p.libelle)}:${ns(p.valeur)}`).join());
  check("l'option 30 j est marquée, auj. aussi (aujourd'hui)", f.evolution?.[2].actif === true && f.evolution?.filter((p) => p.actif).length === 1 && f.evolution?.[3].auj === true);
  check("ses notions : toutes celles de Fixed Income (dans l'ordre), les états rouge / ambre / acquise / en cours / jamais vue", f.notions?.length === FI.length && f.notions?.[0].ton === "e" && f.notions[1].ton === "r" && f.notions[2].ton === "a" && f.notions[3].etat === "encours" && ns(f.notions[3].valeur) === "3/8" && f.notions[3].ton === null && f.notions.at(-1)?.valeur === "jamais vue", f.notions?.slice(0, 5).map((n) => `${n.etat}:${n.valeur}`).join());
  check("le résumé : 1 sous 70 %, 1 en cours, le reste jamais vues", ns(texteResume(f.resume!, "unique")) === `2 sous 70 % · 1 en cours · ${FI.length - 4} jamais vues`, texteResume(f.resume!, "unique"));
  check("source « 90j » : « pas vue » au lieu de « jamais vue »", ficheMatiere(mats[6], 6, 30, notions, "90j").notions?.at(-1)?.valeur === "pas vue" && ns(texteResume(f.resume!, "90j")).includes("pas vues depuis 90 j"));
  check("réviser et s'entraîner : liens de la matière", f.hrefReviser.startsWith("/fiches/") && f.hrefEntrainer === "/practice?topic=fixed_income&go=1");
  const fs = ficheMatiere(mats[6], 6, null, null, "unique");
  check("sans notions : pas de colonne de notions ; sans comparaison : pas d'« avant » mais l'évolution reste", fs.notions === null && fs.resume === null && fs.avant === null && fs.ecart === null && fs.evolution !== null);
  const fh = ficheMatiere(sansHisto[6], 6, null, notions, "unique");
  check("sans historique : ni évolution ni écart", fh.evolution === null && fh.ecart === null && fh.avant === null);
  const fa = ficheMatiere(mats[9], 9, 30, null, "unique");
  check("une matière acquise (77 %) : « acquise » à gagner", fa.gain === "acquise");
  const fn = ficheMatiere({ ...mats[3], pct: null, statut: "non_mesuree", n: 4, gain: 0 }, 3, 30, null, "unique");
  check("une matière non mesurée : « — », « pas encore mesurée », rien à gagner", fn.valeur === "—" && fn.nonMesuree && fn.gain === "—" && fn.ecart === null);
  const fnv = ficheMatiere({ ...mats[3], ilYa: { 30: null, 60: 34, 90: 26 } }, 3, 30, null, "unique");
  check("« nouvelle » quand elle n'était pas mesurée à la date comparée", fnv.ecart?.genre === "nouvelle" && fnv.avant?.valeur === "—");
  const r = resumeNotions(notions.filter((n) => n.m === 6));
  check("resumeNotions : total, mesurées, sous 70, en cours, jamais", r.total === FI.length && r.mesurees === 3 && r.sous === 2 && r.enCours === 1 && r.jamais === FI.length - 4, JSON.stringify(r));
}

titre("# « Ce que ça veut dire » : à 30, 60 et 90 jours, sans historique, avec une matière choisie");
{
  const p30 = ns(phraseMatieres({ matieres: mats, globale: glob, comp: 30, mat: null, notions: null }));
  check("30 j : « en 30 jours, tu as pris 6 points (55 → 61 %) et progressé dans les 10 matières. »", p30.startsWith("en 30 jours, tu as pris 6 points (55 → 61 %) et progressé dans les 10 matières."), p30);
  check("30 j : plus forte hausse (FSA, Actions et Fixed Income, +8) ; les deux sous 50 % progressent mais restent sous 50 %", p30.includes("Plus forte hausse : FSA, Actions et Fixed Income (+8).") && p30.includes("Fixed Income (36 → 44 %) et FSA (41 → 49 %) progressent, mais restent sous 50 % : c'est là que ça se joue."), p30);
  const p60 = ns(phraseMatieres({ matieres: mats, globale: glob, comp: 60, mat: null, notions: null }));
  const p90 = ns(phraseMatieres({ matieres: mats, globale: glob, comp: 90, mat: null, notions: null }));
  check("60 j : +14 points (47 → 61 %) ; 90 j : +24 points (37 → 61 %)", p60.startsWith("en 60 jours, tu as pris 14 points (47 → 61 %)") && p90.startsWith("en 90 jours, tu as pris 24 points (37 → 61 %)"), `${p60.slice(0, 70)} | ${p90.slice(0, 70)}`);
  check("90 j : Fixed Income a presque doublé (22 → 44) ; FSA aussi (26 → 49) : « ont doublé ou presque »", p90.includes("ont doublé ou presque"), p90);
  const baisse = ns(phraseMatieres({ matieres: mats.map((m, i) => (i === 4 ? { ...m, ilYa: { 30: 80, 60: 60, 90: 50 } } : m)), globale: { auj: 61, ilYa: { 30: 66, 60: 47, 90: 37 } }, comp: 30, mat: null, notions: null }));
  check("une baisse : « tu as perdu 5 points » et « mais » devant le progrès", baisse.includes("tu as perdu 5 points (66 → 61 %), mais progressé dans 9 matières sur 10") || baisse.includes("tu as perdu 5 points (66 → 61 %), mais progressé"), baisse.slice(0, 160));
  const sans = ns(phraseMatieres({ matieres: sansHisto, globale: globSans, comp: null, mat: null, notions: null }));
  check("sans historique : la phrase ne parle pas du temps (« tu es à 61 % … 3 sur 10 matières mesurées passent le seuil de 70 % »)", sans.startsWith("tu es à 61 % de maîtrise globale : 3 sur 10 matières mesurées passent le seuil de 70 %.") && !sans.includes("jours") && sans.includes("Fixed Income (44 %) et FSA (49 %) restent sous 50 %"), sans);
  const aucune = phraseMatieres({ matieres: mats.map((m) => ({ ...m, pct: null, statut: "non_mesuree" as const, n: 0, ilYa: null })), globale: null, comp: null, mat: null, notions: null });
  check("rien de mesuré : « il faut 10 réponses dans une matière pour la juger »", aucune.includes("aucune matière n'est encore mesurée") && aucune.includes("10 réponses"), aucune);
  const fi = ns(phraseMatieres({ matieres: mats, globale: glob, comp: 30, mat: 6, notions: null }));
  check("matière choisie : « Fixed Income : de 36 à 44 % en 30 jours (+8). Encore 26 points avant le seuil. »", fi === "Fixed Income : de 36 à 44 % en 30 jours (+8). Encore 26 points avant le seuil.", fi);
  const fin = ns(phraseMatieres({ matieres: mats, globale: glob, comp: 30, mat: 6, notions }));
  check("avec les notions : « 2 de ses notions sont sous 70 % sur 3 mesurées : la fiche te dit lesquelles. »", fin.includes("Encore 26 points avant le seuil ; 2 de ses notions sont sous 70 % sur 3 mesurées : la fiche te dit lesquelles."), fin);
  const pt = ns(phraseMatieres({ matieres: mats, globale: glob, comp: 30, mat: 9, notions: null }));
  check("une matière au-dessus du seuil : « Au-dessus du seuil. »", pt.includes("Portefeuille : de 71 à 77 % en 30 jours (+6). Au-dessus du seuil."), pt);
  const sh = ns(phraseMatieres({ matieres: sansHisto, globale: globSans, comp: null, mat: 6, notions: null }));
  check("matière choisie sans historique : « Fixed Income : 44 %. Encore 26 points… »", sh === "Fixed Income : 44 %. Encore 26 points avant le seuil.", sh);
  const nouv = ns(phraseMatieres({ matieres: mats.map((m, i) => (i === 3 ? { ...m, ilYa: { 30: null, 60: 34, 90: 26 } } : m)), globale: glob, comp: 30, mat: 3, notions: null }));
  check("matière nouvelle : « mesurée depuis moins de 30 jours »", nouv.includes("FSA : 49 %, mesurée depuis moins de 30 jours."), nouv);
  const nmes = ns(phraseMatieres({ matieres: mats.map((m, i) => (i === 3 ? { ...m, pct: null, statut: "non_mesuree" as const, n: 4 } : m)), globale: glob, comp: 30, mat: 3, notions: null }));
  check("matière non mesurée : « encore 6 réponses et elle compte »", nmes.includes("FSA n'est pas encore mesurée : encore 6 réponses et elle compte."), nmes);
  const prov = ns(phraseMatieres({ matieres: matieresSynthese(maitrise({ ethics: { pct: 52, n: 23, total: 23 } }), histo(), null), globale: glob, comp: 30, mat: 0, notions: null }));
  check("matière provisoire : « Mesure provisoire (23 réponses sur 40). »", prov.includes("Mesure provisoire (23 réponses sur 40)."), prov);
  const defi = ns(phraseMatieres({ matieres: mats.map((m) => ({ ...m, pct: 75, ilYa: { 30: 70, 60: 60, 90: 50 } })), globale: { auj: 75, ilYa: { 30: 70, 60: 60, 90: 50 } }, comp: 30, mat: null, notions: null }));
  check("aucune sous 50 % : « vise maintenant le seuil de 70 % »", defi.includes("Aucune matière sous 50 % : vise maintenant le seuil de 70 %."), defi);
}

// ───────────────────────────────────────────────────────────────────────────
titre("# le rendu : l'îlot dans son état de départ (radar, 30 j)");
const carte = rendre(<TesMatieres matieres={mats} globale={glob} notions={notions} sourceNotions="unique" />);
{
  check("rendu non vide, id matieres une fois, titre « Tes matières »", carte.length > 4000 && compte(carte, /id="matieres"/g) === 1 && carte.includes("Tes matières"), String(carte.length));
  check("la définition unique : 60 dernières par matière, 20 par notion, acquis à 70 %", ns(carte).includes("60 dernières par matière, 20 par notion") && ns(carte).includes("Acquis à 70 %"));
  check("deux groupes : « Affichage » et « Se comparer à toi il y a » (30 j / 60 j / 90 j)", carte.includes('role="group" aria-label="Affichage"') && carte.includes('role="group" aria-label="Se comparer à toi il y a"') && ns(carte).includes(">30 j<") && ns(carte).includes(">90 j<"));
  const pressed = (re: RegExp) => new RegExp('aria-pressed="true"[^>]*>(?:<canvas[^>]*></canvas>)?' + re.source).test(carte);
  check('aria-pressed="true" sur « Radar » et sur « 30 j » (et sur eux seuls dans les sélecteurs)', pressed(/Radar/) && pressed(/30 j/) && compte(carte, /class="opt[^"]*" aria-pressed="true"/g) + compte(carte, /aria-pressed="true" class="opt/g) === 2 && !pressed(/Barres/) && !pressed(/60 j/), String(compte(carte, /aria-pressed="true"/g)));
  check("liquides : exactement 2 options actives (Radar, 30 j), data-palette jade, aucun autre bouton d'encre", compte(carte, /class="rl-encre-vif"/g) === 2 && compte(carte, /data-palette="jade"/g) === 2 && !carte.includes("Réviser"), String(compte(carte, /class="rl-encre-vif"/g)));
  check("le radar : deux dessins, role=img, 10 étiquettes-boutons, polygone « toi » et polygone de comparaison", compte(carte, /Radar de ta maîtrise dans les 10 matières, aujourd'hui et il y a 30 jours/g) === 2 && compte(carte, /<button type="button" class="rlab /g) === 10 && compte(carte, /class="rtoi"/g) === 2 && compte(carte, /class="rcmp"/g) === 2);
  check("la légende du radar : toi aujourd'hui, toi il y a 30 j, seuil 70 %, sous 50 %, 50 à 70 %", ns(carte).includes("Toi aujourd'hui") && ns(carte).includes("Toi il y a 30 j") && ns(carte).includes("seuil 70 %") && ns(carte).includes("sous 50 %") && ns(carte).includes("50 à 70 %"));
  check("la vue d'ensemble : 61 %, « Toi il y a 30 j : 55 % +6 points », 3 / 5 / 2 sur 10, 10 sur 10 en hausse, Portefeuille · 77 %, Fixed Income · 44 %", ns(carte).includes("Vue d'ensemble") && ns(carte).includes(">61 %<") && ns(carte).includes("55 %</b>") && ns(carte).includes("+6 points") && ns(carte).includes("3 sur 10") && ns(carte).includes("5 sur 10") && ns(carte).includes("2 sur 10") && ns(carte).includes("10 sur 10") && ns(carte).includes("Portefeuille · 77 %") && ns(carte).includes("Fixed Income · 44 %"));
  check("« Ouvrir Fixed Income » reste un bouton à contour (jamais d'encre)", carte.includes("Ouvrir Fixed Income") && /class="contour contourPetit ensAction"[^>]*>Ouvrir Fixed Income/.test(carte));
  check("l'évolution matière par matière : 10 lignes-boutons, la première +8", compte(carte, /class="ev( evNeg)?"/g) === 10 && ns(carte).includes("En 30 jours, matière par matière"));
  check("« Ce que ça veut dire » : la phrase de la maquette", ns(carte).includes("Ce que ça veut dire :") && ns(carte).includes("tu as pris 6 points (55 → 61 %) et progressé dans les 10 matières"));
  check("aucune fiche ouverte au départ ; le panneau est annoncé (aria-live)", !carte.includes("Fiche matière") && carte.includes('aria-live="polite"') && carte.includes(`aria-label="Vue d'ensemble ou fiche de la matière"`));
  check("aucune trace d'ébène, d'image de la maquette, d'antislash, de NaN ou d'undefined", !/ebene/i.test(carte) && !carte.includes("/_blob/") && !carte.includes(String.fromCharCode(92)) && !/NaN|undefined|[[]object/.test(carte));
  check("l'îlot reste léger (les 93 notions ne sont pas recopiées dans le HTML de départ)", carte.length < 30_000, String(carte.length));
}

titre("# le rendu sans historique (migration non collée) : ni sélecteur de comparaison, ni polygone");
{
  const h = rendre(<TesMatieres matieres={sansHisto} globale={globSans} notions={null} sourceNotions={null} />);
  check("pas de groupe « Se comparer à », pas de polygone ni de points de comparaison", !h.includes("Se comparer à") && !h.includes('class="rcmp"') && !h.includes('rcmpPts"') && !h.includes("Toi il y a"));
  check("un seul liquide : l'option « Radar »", compte(h, /class="rl-encre-vif"/g) === 1 && compte(h, /aria-pressed="true"/g) === 1);
  check("la vue d'ensemble classe par maîtrise (« Du plus fort au plus faible »), sans « En hausse » ni évolution", h.includes("Du plus fort au plus faible") && !h.includes("En hausse") && !h.includes("matière par matière"));
  check("la légende ne parle pas de la comparaison ; l'aide ne cite pas la fiche « son évolution »", !h.includes("Toi il y a") && !ns(h).includes("son évolution") && !ns(h).includes("ses notions"));
  check("la phrase de la maquette sans historique : situation en un coup d'œil", ns(h).includes("tu es à 61 % de maîtrise globale"));
  check("l'étiquette du radar ne porte pas d'écart ; le nom lu non plus", !h.includes("face à toi"));
}

titre("# le rendu : rien de mesuré (joueur neuf)");
{
  const vide: MatiereSynthese[] = mats.map((m) => ({ ...m, pct: null, statut: "non_mesuree" as const, n: 0, total: 0, ilYa: null, gain: 0 }));
  const h = rendre(<TesMatieres matieres={vide} globale={{ auj: 0, ilYa: null }} notions={null} sourceNotions={null} />);
  check("rendu sans erreur, dix points creux, dix « — », la phrase d'attente", h.length > 3000 && compte(h, /class="rV"/g) === 2 && ns(h).includes("aucune matière n'est encore mesurée") && !/NaN|undefined/.test(h));
  check("pas de « plus forte » ni de bouton « Ouvrir X »", !h.includes("Ta plus forte") && !h.includes("ensAction"));
}

titre("# le rendu : la fiche d'une matière");
{
  const f = ficheMatiere(mats[6], 6, 30, notions, "unique");
  const h = rendre(<FicheVue f={f} comp={30} source="unique" onFermer={() => {}} />);
  check("« Fiche matière », le nom, 44 %, « +8 en 30 jours », bouton « Fermer la fiche »", h.includes("Fiche matière") && h.includes("Fixed Income") && ns(h).includes(">44 %<") && h.includes("+8 en 30 jours") && h.includes('aria-label="Fermer la fiche"'));
  check("poids 12,5 %, réponses 287, il y a 30 j : 36 %, à gagner +3,2 pts", ns(h).includes(">12,5 %<") && h.includes(">287<") && ns(h).includes("Il y a 30 j") && ns(h).includes(">36 %<") && ns(h).includes("+3,2 pts"));
  check("son évolution : 4 cases, « 30 j » encadrée (pasOn), « auj. » en noir (pasAuj)", compte(h, /<li class="[^"]*">(?:<span>)/g) >= 4 && h.includes("pasOn") && h.includes("pasAuj") && ns(h).includes("auj.") && ns(h).includes(">22 %<") && ns(h).includes(">29 %<"));
  check("« Réviser Fixed Income » : le seul bouton d'encre (1 liquide), vers /fiches/…", compte(h, /class="rl-encre-vif"/g) === 1 && /<a [^>]*href="[/]fiches[/][^"]+"[^>]*class="rl-encre encre bouton boutonPetit"|class="rl-encre encre bouton boutonPetit"[^>]*href="[/]fiches[/]/.test(h) && h.includes("Réviser Fixed Income"));
  check("« S'entraîner → » vers /practice?topic=fixed_income&go=1", h.includes('href="/practice?topic=fixed_income&go=1"') && h.includes("S'entraîner →"));
  check("ses notions : une ligne par notion, piste fine, état vide pour jamais vue et en cours (« 3/8 »)", compte(h, /class="fn( fnJamais)?"/g) === FI.length && compte(h, /class="zp zpFin/g) === FI.length && h.includes("zpVide") && ns(h).includes(">3/8<") && h.includes(">jamais vue<"));
  check("la liste des notions défile au clavier (tabindex=0) et porte un nom", h.includes('tabindex="0"') && h.includes('aria-label="Notions de la matière"'));
  check("le titre des notions : « Ses notions · 2 sous 70 % · 1 en cours · N jamais vues »", ns(h).includes(`Ses notions · 2 sous 70 % · 1 en cours · ${FI.length - 4} jamais vues`), h.slice(h.indexOf("Ses notions"), h.indexOf("Ses notions") + 90));
  check("légende : sous 50 %, 50 à 70 %, acquise, en cours, jamais vue", ns(h).includes("sous 50 %") && ns(h).includes("50 à 70 %") && ns(h).includes(">acquise<") && h.includes(">en cours<") && h.includes(">jamais vue<"));
  check("le piège du 70 % : le seuil pointillé n'est pas posé dans les pistes vides par le HTML, seulement par le CSS", compte(h, /class="seuil"/g) === FI.length);
  check("à deux colonnes quand il y a des notions", h.includes('data-colonnes="2"'));
  const sans = rendre(<FicheVue f={ficheMatiere(mats[6], 6, null, null, "unique")} comp={null} source="unique" onFermer={() => {}} />);
  check("sans notions : une colonne, ni « Ses notions » ni legende, mais le rappel pour revenir", sans.includes('data-colonnes="1"') && !sans.includes("Ses notions") && sans.includes("pour revenir à la vue d'ensemble") && compte(sans, /class="rl-encre-vif"/g) === 1);
  const nm = rendre(<FicheVue f={ficheMatiere({ ...mats[3], pct: null, statut: "non_mesuree", n: 4, gain: 0 }, 3, 30, null, "unique")} comp={30} source="unique" onFermer={() => {}} />);
  check("matière non mesurée : « — » et « pas encore mesurée », « à gagner » : —", nm.includes(">—<") && nm.includes("pas encore mesurée") && !/NaN|undefined/.test(nm));
  const nv = rendre(<FicheVue f={ficheMatiere({ ...mats[3], ilYa: { 30: null, 60: 34, 90: 26 } }, 3, 30, null, "unique")} comp={30} source="unique" onFermer={() => {}} />);
  check("matière nouvelle : « nouvelle » à la place de l'écart", nv.includes(">nouvelle<") && !nv.includes("en 30 jours</span>"));
  const nj = rendre(<FicheVue f={ficheMatiere(mats[6], 6, 30, notions, "90j")} comp={30} source="90j" onFermer={() => {}} />);
  check("source 90 j : « pas vue » et « pas vue depuis 90 j »", nj.includes(">pas vue<") && ns(nj).includes("pas vue depuis 90 j") && !nj.includes("jamais vue"));
}

titre("# le rendu : les barres et les sélecteurs");
{
  const h = rendre(<BarresZones lignes={lignesBarres(mats, 30, "programme", 6)} onChoisir={() => {}} />);
  check("10 lignes-boutons, 9 estompées, 1 marquée (aria-pressed), le nom lu, le poids sous le nom", compte(h, /<button type="button" class="bl/g) === 10 && compte(h, / blOff/g) === 9 && compte(h, /class="bl blOn"/g) === 1 && compte(h, /aria-pressed="true"/g) === 1 && ns(h).includes("poids 12,5 %") && h.includes("Ouvrir sa fiche."));
  check("repère de comparaison sur chaque piste, seuil à 70 %, axe 0 / 50 / 70 / 100 %", compte(h, /class="rep"/g) === 10 && compte(h, /class="seuil"/g) === 10 && h.includes(">0<") && h.includes(">50<") && h.includes(">70<") && ns(h).includes(">100 %<") && h.includes("axeSeuil"));
  check("la largeur et la zone de la barre : Fixed Income 44 % rouge, Portefeuille 77 % acquise", h.includes('class="zpR" style="width:44%"') && h.includes('class="zpE" style="width:77%"'));
  const sans = rendre(<BarresZones lignes={lignesBarres(sansHisto, null, "faible", null)} onChoisir={() => {}} />);
  check("sans comparaison : aucun repère ; tri du plus faible : Fixed Income d'abord", !sans.includes('class="rep"') && sans.indexOf("Fixed Income") < sans.indexOf("Portefeuille"));
  const nm = rendre(<BarresZones lignes={lignesBarres(mats.map((m, i) => (i === 1 ? { ...m, pct: null, statut: "non_mesuree" as const, n: 2, ilYa: null } : m)), 30, "programme", null)} onChoisir={() => {}} />);
  check("une matière non mesurée : piste vide, « pas encore mesurée », « — »", nm.includes("zpVide") && nm.includes("pas encore mesurée") && nm.includes(">—<"));
  const tri = rendre(
    <Selecteur
      label="Trier"
      options={[
        { cle: "programme", libelle: "Programme" },
        { cle: "faible", libelle: "Du plus faible" },
      ]}
      valeur="programme"
      onChoisir={() => {}}
    />,
  );
  check("le sélecteur : role=group, un seul bouton actif avec le liquide, l'autre en aplat", tri.includes('role="group" aria-label="Trier"') && compte(tri, /class="rl-encre-vif"/g) === 1 && compte(tri, /aria-pressed="true"/g) === 1 && compte(tri, /aria-pressed="false"/g) === 1 && compte(tri, /data-palette="jade"/g) === 1);
  const puces = rendre(<Selecteur label="Matière" options={[{ cle: "a", libelle: "A" }, { cle: "b", libelle: "B" }]} valeur="b" onChoisir={() => {}} mode="puces" />);
  check("mode puces et mode étroit : la classe change, jamais un menu déroulant", puces.includes("segPuces") && !puces.includes("<select") && rendre(<Selecteur label="x" options={[{ cle: 1, libelle: "1" }]} valeur={1} onChoisir={() => {}} mode="etroit" />).includes("segEtroit"));
  const rad = rendre(<Radar grand={geometrieRadar(RADAR_GRAND, mats.map((m) => m.pct), null, 6)} petit={geometrieRadar(RADAR_PETIT, mats.map((m) => m.pct), null, 6)} etiquettes={etiquettesRadar(mats, null, 6)} aria="x" onChoisir={() => {}} />);
  check("le radar seul : la matière choisie a l'étiquette active et le halo ; la place est posée en variables CSS", compte(rad, /rlabOn/g) === 1 && compte(rad, /class="rhalo"/g) === 2 && compte(rad, /class="rsel"/g) === 2 && rad.includes("--xg:") && rad.includes("--yp:") && compte(rad, /aria-pressed="true"/g) === 1);
  const ens = rendre(<VueEnsemble e={ensembleMatieres(mats, glob, 30)} comp={30} avecNotions avecEvolution onOuvrir={() => {}} />);
  check("la vue d'ensemble seule : l'astuce cite les notions et l'évolution", ens.includes("ses notions, son évolution, quoi réviser"));
}

console.log("");
console.log(ko === 0 ? "Tout est vert." : `${ko} échec(s).`);
process.exit(ko === 0 ? 0 : 1);
