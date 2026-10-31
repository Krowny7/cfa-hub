// Tests des trois cartes « examen » de la page Moi « La synthèse » (lot 6 :
// Calcul ou théorie, Ton rythme d'examen, Ta progression), sans base, réseau ni
// navigateur :
//   npx tsx --tsconfig tsconfig.json scripts/moi/test-synthese-examen.tsx
// Les calculs (les chiffres de la maquette : 71 / 54, 17 points d'écart, 104 s,
// 42 minutes de trop, 70 % vers le 12 décembre ; la pente nulle ou négative, la
// date après l'examen, moins de 3 points) puis le rendu statique (3, 2 ou 1
// cartes selon les sources, la puce « Aucune » en liquide, les boutons d'encre,
// les états vides, la matière choisie ou superposée).
import "../codex/sans-css";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { CalculTheorie } from "@/components/moi/synthese/CalculTheorie";
import { Progression } from "@/components/moi/synthese/Progression";
import { RangeeExamen } from "@/components/moi/synthese/RangeeExamen";
import { Rythme } from "@/components/moi/synthese/Rythme";
import { dateCourte } from "@/components/moi/synthese/modele";
import {
  COURBE_GRANDE,
  COURBE_PETITE,
  ECART_AMBRE,
  ECART_ROUGE,
  HREF_SERIE_CHRONO,
  PUCES_MATIERES,
  X_EXAMEN,
  echelleCourbe,
  geometrieCourbe,
  hrefSessionCalculs,
  legendeProjection,
  legendeSuperposee,
  lectureCourbe,
  lectureMatiere,
  lignesRythme,
  matieresComparables,
  pente,
  phraseGains,
  plusBasses,
  projection,
  resumeCalcul,
  resumeRythme,
  tonEcart,
  tonRythme,
  traceSuperpose,
  xRythme,
  zoneBarre,
} from "@/components/moi/synthese/modele-examen";
import type { CalculSynthese, ProgressionSynthese, RythmeSynthese } from "@/components/moi/synthese/types";
import { decaleJour } from "@/lib/objectif-calc";
import { TOPICS } from "@/lib/practiceTopics";
import { COURTS_FR } from "@/lib/voice-moi";

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
const rendre = (el: React.ReactElement): string => {
  try {
    return renderToStaticMarkup(<AppRouterContext.Provider value={routeur}>{el}</AppRouterContext.Provider>)
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"');
  } catch (e) {
    console.log(e);
    return "";
  }
};

// ── les données de la maquette ──────────────────────────────────────────────

const AUJOURDHUI = "2026-10-31";
const EXAMEN = "2027-02-18";

/** Calcul ou théorie : 71 % sans calcul, 54 % avec, Fixed Income (37) et FSA (40) en bas. */
const AVEC_SANS: Record<string, [number | null, number | null]> = {
  ethics: [62, 72],
  quant: [58, 74],
  economics: [64, 70],
  fsa: [40, 66],
  corporate: [66, 72],
  equity: [55, 71],
  fixed_income: [37, 62],
  derivatives: [null, 68],
  alternatives: [60, 75],
  portfolio: [68, 78],
};
const CALCUL: CalculSynthese = {
  global: { avec: 54, sans: 71 },
  matieres: TOPICS.flatMap((t) => {
    const [avec, sans] = AVEC_SANS[t.key];
    return [{ cle: t.key, court: COURTS_FR[t.key], avec, sans }];
  }),
};

/** Le rythme : secondes par question et questions chronométrées par matière (maquette D). */
const SEC_N: Record<string, [number, number]> = {
  ethics: [71, 412],
  quant: [118, 233],
  economics: [99, 190],
  fsa: [128, 301],
  corporate: [94, 156],
  equity: [108, 248],
  fixed_income: [121, 287],
  derivatives: [119, 121],
  alternatives: [86, 98],
  portfolio: [101, 174],
};
const RYTHME: RythmeSynthese = {
  global: 104,
  questions: 2220,
  matieres: TOPICS.map((t) => ({ cle: t.key, court: COURTS_FR[t.key], secondes: SEC_N[t.key][0], n: SEC_N[t.key][1] })),
};

/** La courbe de la maquette : 38 → 61 en 12 points hebdomadaires, le dernier étant aujourd'hui. */
const G = [38, 42, 45, 47, 50, 51, 54, 55, 57, 58, 60, 61];
const datesDe = (n: number) => Array.from({ length: n }, (_, k) => dateCourte(decaleJour(AUJOURDHUI, -7 * (n - 1 - k))));
const DEBUTS: Record<string, [number, number]> = { ethics: [35, 58], quant: [52, 74], economics: [44, 66], fsa: [26, 49], corporate: [47, 71], equity: [37, 63], fixed_income: [22, 44], derivatives: [30, 52], alternatives: [45, 69], portfolio: [50, 77] };
const PROGRESSION: ProgressionSynthese = {
  points: G,
  dates: datesDe(G.length),
  matieres: TOPICS.map((t) => {
    const [a, b] = DEBUTS[t.key];
    // un trou au début pour l'éthique (pas encore mesurée), le reste est une montée régulière
    return G.map((_, k) => (t.key === "ethics" && k < 3 ? null : Math.round(a + ((b - a) * k) / (G.length - 1))));
  }),
  aujourdhui: AUJOURDHUI,
  examen: EXAMEN,
};

// ── Calcul ou théorie ───────────────────────────────────────────────────────

console.log("# Calcul ou théorie : les chiffres de la maquette");
{
  const r = resumeCalcul(CALCUL)!;
  check("71 % sans calcul, 54 % avec, 17 points d'écart", r.sans === 71 && r.avec === 54 && r.ecart === 17 && r.pastille === "17 points d'écart", `${r.sans}/${r.avec}/${r.ecart}`);
  check("la pastille est ambre (de 5 à 19 points)", r.ton === "a");
  check("les deux matières les plus basses avec calcul : Fixed Income (37), FSA (40)", r.faibles.length === 2 && r.faibles[0].cle === "fixed_income" && r.faibles[1].cle === "fsa" && r.faibles[0].pct === 37);
  check("la phrase : « surtout en Fixed Income (37 %) et en FSA (40 %) »", r.phrase === `tu connais le cours ; ce sont les calculs qui te coûtent des points, surtout en Fixed Income (37${NB}%) et en FSA (40${NB}%).`, r.phrase);
  check("la session : /calculs/session?matieres=fixed-income,fsa&n=10", hrefSessionCalculs(r.faibles) === "/calculs/session?matieres=fixed-income,fsa&n=10", hrefSessionCalculs(r.faibles));
  check("les matières mesurées des deux côtés : 9 (Dérivés n'a pas d'avec)", matieresComparables(CALCUL) === 9);
}
console.log("");
console.log("# Calcul ou théorie : écarts, cas limites");
{
  check("tonEcart : vert sous 5, ambre de 5 à 19, rouge à 20 et plus (dans les deux sens)", tonEcart(0) === "e" && tonEcart(4) === "e" && tonEcart(ECART_AMBRE) === "a" && tonEcart(19) === "a" && tonEcart(ECART_ROUGE) === "r" && tonEcart(-4) === "e" && tonEcart(-25) === "r");
  const g = (avec: number, sans: number): CalculSynthese => ({ ...CALCUL, global: { avec, sans } });
  const egal = resumeCalcul(g(60, 62))!;
  check("2 points d'écart : pastille verte, « se valent »", egal.ton === "e" && egal.pastille === "2 points d'écart" && egal.phrase.includes("se valent"), egal.phrase);
  const un = resumeCalcul(g(60, 61))!;
  const zero = resumeCalcul(g(60, 60))!;
  check("1 point d'écart (singulier), 0 : « Aucun écart »", un.pastille === "1 point d'écart" && zero.pastille === "Aucun écart");
  const inverse = resumeCalcul(g(80, 60))!;
  check("la théorie coûte plus : pastille rouge (20), phrase « plus à l'aise en calcul », les matières sans calcul les plus basses", inverse.ecart === -20 && inverse.ton === "r" && inverse.phrase.includes("plus à l'aise en calcul") && inverse.phrase.includes(`surtout en Fixed Income (62${NB}%) et en Dérivés (68${NB}%)`) === false && inverse.phrase.includes(`en Fixed Income (62${NB}%)`), inverse.phrase);
  check("un seul côté mesuré : « surtout en X (a %) » sans « et »", resumeCalcul({ global: { avec: 50, sans: 70 }, matieres: [{ cle: "quant", court: "Quant", avec: 50, sans: 70 }] })!.phrase.endsWith(`surtout en Quant (50${NB}%).`));
  check("sans global (moins de 3 matières) : null", resumeCalcul({ global: null, matieres: [] }) === null);
  check("hrefSessionCalculs : les slugs de /calculs (corporate-issuers, portfolio-management), « toutes » sans matière", hrefSessionCalculs([{ cle: "corporate" }, { cle: "portfolio" }, { cle: "quant" }], 10) === "/calculs/session?matieres=corporate-issuers,portfolio-management,quant&n=10" && hrefSessionCalculs([]) === "/calculs/session?matieres=toutes&n=10");
  check("plusBasses : ordre du programme à égalité", plusBasses({ global: null, matieres: [{ cle: "quant", court: "Quant", avec: 50, sans: null }, { cle: "fsa", court: "FSA", avec: 50, sans: null }, { cle: "equity", court: "Actions", avec: 49, sans: null }] }, "avec", 2).map((m) => m.cle).join() === "equity,quant");
  check("zoneBarre : 71 vert, 54 ambre, 37 rouge, bornée à 0–100", zoneBarre(71).ton === "e" && zoneBarre(54).ton === "a" && zoneBarre(37).ton === "r" && zoneBarre(150).w === 100 && zoneBarre(-3).w === 0);
}

// ── Ton rythme d'examen ─────────────────────────────────────────────────────

console.log("");
console.log("# Ton rythme d'examen : les chiffres de la maquette");
{
  const r = resumeRythme(RYTHME, null)!;
  check("104 s par question, « +14 s de trop », pastille rouge", r.secondes === 104 && r.valeur === `104${NB}s` && r.ecart === `+14${NB}s de trop` && r.ton === "r", r.ecart);
  check("42 minutes de trop, environ 24 questions sans réponse", r.trop?.minutes === 42 && r.trop?.questions === 24 && r.texte === "à ce rythme, l'examen te prendrait 42 minutes de trop : environ 24 questions sans réponse.", r.texte);
  check("toutes matières", r.sur === "Toutes matières");
  const l = lignesRythme(RYTHME);
  check("dix lignes, la plus lente en haut (FSA 128 s), la plus rapide en bas (Éthique 71 s)", l.length === 10 && l[0].cle === "fsa" && l[0].secondes === 128 && l[9].cle === "ethics", l.map((x) => x.cle).join());
  check("l'échelle : 90 s à 37,5 %, 60 s à 0 %, 140 s à 100 %, bornée", X_EXAMEN === 37.5 && xRythme(60) === 0 && xRythme(140) === 100 && xRythme(30) === 0 && xRythme(300) === 100);
  check("les couleurs : 90 s vert, 91 ambre, 110 ambre, 111 rouge", tonRythme(90) === "e" && tonRythme(91) === "a" && tonRythme(110) === "a" && tonRythme(111) === "r");
  const eth = l[9];
  check("Éthique (71 s) : en avance, barre grise de 13,8 % sur 23,8 % (jusqu'au repère de 90 s)", eth.exces.vite && eth.exces.gauche === 13.8 && eth.exces.largeur === 23.8 && eth.ton === "e", JSON.stringify(eth.exces));
  const fsa = l[0];
  check("FSA (128 s) : en retard, barre de 37,5 % à 85 %, point rouge", !fsa.exces.vite && fsa.exces.gauche === 37.5 && fsa.exces.largeur === 47.5 && fsa.x === 85 && fsa.ton === "r");
  const q = resumeRythme(RYTHME, "quant")!;
  check("une matière (Quant, 118 s) : « 28 s de plus par question », pas de minutes de trop", q.sur === "Quant" && q.valeur === `118${NB}s` && q.texte.includes(`28${NB}s de plus par question`) && q.trop === null && q.ecart === `+28${NB}s de trop`, q.texte);
  const e = resumeRythme(RYTHME, "ethics")!;
  check("une matière rapide (Éthique, 71 s) : « 19 s d'avance », pastille verte", e.ton === "e" && e.ecart === `19${NB}s d'avance` && e.texte === `en Éthique, 19${NB}s d'avance par question sur le rythme de l'examen.`, e.texte);
  check("une clé inconnue : retombe sur toutes matières", resumeRythme(RYTHME, "nimporte")!.sur === "Toutes matières");
  const vite = resumeRythme({ ...RYTHME, global: 85 }, null)!;
  check("global à 85 s : « tu tiens le rythme de l'examen »", vite.texte === "tu tiens le rythme de l'examen." && vite.ton === "e" && vite.trop === null && vite.ecart === `5${NB}s d'avance`);
  check("global à 90 s : pile, vert", resumeRythme({ ...RYTHME, global: 90 }, null)!.ecart === `pile à 90${NB}s`);
  check("sous 20 questions chronométrées (global null) : null", resumeRythme({ global: null, questions: 7, matieres: [] }, null) === null);
}

// ── Ta progression ──────────────────────────────────────────────────────────

console.log("");
console.log("# Ta progression : la projection de la maquette");
{
  check("la pente des 4 dernières semaines (5 points) : +1,5 point par semaine", pente(G) === 1.5, String(pente(G)));
  const p = projection(G, AUJOURDHUI, EXAMEN);
  check("la projection atteint 70 dans 42 jours, soit le 12 décembre 2026", p?.genre === "date" && p.jours === 42 && p.date === "2026-12-12", JSON.stringify(p));
  check("avant l'examen (68 jours avant le 18 février), dans l'horizon des 6 semaines", p?.genre === "date" && !p.apresExamen && p.avantExamen === 68 && p.dansHorizon);
  check("la légende : « À ton rythme : 70 % vers le 12 déc. »", legendeProjection(p) === `À ton rythme : 70${NB}% vers le 12 déc.`, String(legendeProjection(p)));
  check("la lecture : +1,5 point par semaine, 12 décembre, environ 10 semaines avant l'examen", lectureCourbe(G, p) === `+1,5 point par semaine sur le dernier mois : à ce rythme, tu passes 70${NB}% vers le 12 décembre, environ 10 semaines avant l'examen.`, lectureCourbe(G, p));
  const gains = phraseGains(G, 55);
  const texte = gains.map((g) => (typeof g === "string" ? g : "b" in g ? g.b : "neg" in g ? g.neg : g.marque)).join("");
  check("l'en-tête : +23 points (12 points : 11 semaines), +6 en 30 jours", texte === "Ta maîtrise globale, semaine après semaine : +23 points en 11 semaines, +6 en 30 jours.", texte);
  const g13 = [36, ...G];
  const t13 = phraseGains(g13, null).map((g) => (typeof g === "string" ? g : "b" in g ? g.b : "neg" in g ? g.neg : g.marque)).join("");
  check("13 points : « en 12 semaines » ; sans la date des 30 jours : « +6 en 4 semaines »", t13 === "Ta maîtrise globale, semaine après semaine : +25 points en 12 semaines, +6 en 4 semaines.", t13);
  const baisse = phraseGains([60, 58, 55], null).find((g) => typeof g !== "string" && "neg" in g);
  check("un recul s'écrit en rouge avec le vrai signe moins : −5", typeof baisse === "object" && "neg" in baisse && baisse.neg === "−5");
}
console.log("");
console.log("# Ta progression : cas limites");
{
  const pn = projection([50, 48, 47, 45, 44], AUJOURDHUI, EXAMEN);
  check("pente négative : pas de date, « recule de 1,5 point par semaine »", pn?.genre === "plate" && pn.pente === -1.5 && lectureCourbe([50, 48, 47, 45, 44], pn).includes("recule de 1,5 point par semaine"));
  const p0 = projection([50, 50, 50, 50, 50], AUJOURDHUI, EXAMEN);
  check("pente nulle : pas de date, « stable »", p0?.genre === "plate" && lectureCourbe([50, 50, 50, 50, 50], p0).includes("stable") && legendeProjection(p0) === null);
  check("une pente trop faible (0,05) ne donne pas de date lointaine", projection([60, 60, 60, 60.2], AUJOURDHUI, EXAMEN)?.genre === "plate");
  const pa = projection([60, 65, 70, 72, 74], AUJOURDHUI, EXAMEN);
  check("déjà à 70 % ou plus : « atteint », pas de légende de rythme", pa?.genre === "atteint" && lectureCourbe([60, 65, 70, 72, 74], pa).includes("au-dessus de 70") && legendeProjection(pa) === null);
  const ap = projection(G, AUJOURDHUI, "2026-12-01");
  check("la date tombe après l'examen : « après l'examen », « Il faut accélérer »", ap?.genre === "date" && ap.apresExamen && ap.avantExamen === null && legendeProjection(ap) === `À ton rythme : 70${NB}% après l'examen` && lectureCourbe(G, ap).includes("après l'examen. Il faut accélérer."), lectureCourbe(G, ap));
  const pe = projection(G, AUJOURDHUI, "2026-10-01");
  check("un examen déjà passé est ignoré", pe?.genre === "date" && !pe.apresExamen && pe.avantExamen === null);
  const sansDate = projection(G, AUJOURDHUI, null);
  check("sans date d'examen : la date de 70 % reste, sans « avant l'examen »", sansDate?.genre === "date" && sansDate.date === "2026-12-12" && !lectureCourbe(G, sansDate).includes("avant l'examen"));
  check("moins de 3 points : pas de projection ni de pente", projection([40, 50], AUJOURDHUI, EXAMEN) === null && pente([40, 50]) === null && projection([], AUJOURDHUI, EXAMEN) === null);
  const p3 = projection([40, 45, 50], AUJOURDHUI, EXAMEN);
  check("3 points seulement : 5 points par semaine, 70 dans 28 jours (28 novembre)", p3?.genre === "date" && p3.jours === 28 && p3.date === "2026-11-28");
  check("sans le jour d'aujourd'hui, une pente positive ne se date pas", projection(G, null, EXAMEN) === null);
  check("une montée en vue : 3 semaines après l'examen proche = « jours avant l'examen » au singulier", lectureCourbe(G, projection(G, AUJOURDHUI, "2026-12-13")).includes("1 jour avant l'examen"));
  check("l'axe des valeurs : 20–80 par défaut, élargi à 0 ou 100 quand la courbe en sort", JSON.stringify(echelleCourbe(G)) === '{"bas":20,"haut":80}' && JSON.stringify(echelleCourbe([10, 50, 90])) === '{"bas":0,"haut":100}');
}
console.log("");
console.log("# La courbe : la géométrie de la maquette (465 × 190)");
{
  const p = projection(G, AUJOURDHUI, EXAMEN);
  const g = geometrieCourbe(COURBE_GRANDE, G, PROGRESSION.dates, p, AUJOURDHUI);
  check("17 semaines sur l'axe (11 de courbe + 6 d'horizon) ; aujourd'hui à x = 304,5 comme la maquette", g.semaines === 17 && g.xAuj === 304.5, String(g.xAuj));
  check("la zone rouge de y = 89 sur 71, l'ambre de y = 41,7 sur 47,3, le haut de y = 18 sur 23,7", g.zones.rouge.y === 89 && g.zones.rouge.h === 71 && g.zones.ambre.y === 41.7 && g.zones.ambre.h === 47.3 && g.zones.haut.y === 18 && g.zones.haut.h === 23.7, JSON.stringify(g.zones));
  check("la droite de 70 % à y = 41,7 ; graduations 20, 50, 80", g.y70 === 41.7 && g.graduations.map((t) => t.texte).join() === "20,50,80");
  check("le dernier point à y = 63 (61 %), le premier à 38 : y = 117,4", g.points.length === 12 && g.points[11].y === 63 && g.points[0].y === 117.4 && g.points[0].x === 34, JSON.stringify([g.points[0], g.points[11]]));
  check("la projection part d'aujourd'hui (304,5 ; 63) et finit à 70 % au bord (452 ; 41,7)", !!g.projection && g.projection.x1 === 304.5 && g.projection.y1 === 63 && g.projection.x2 === 452 && g.projection.y2 === 41.7, JSON.stringify(g.projection));
  check("les valeurs : « 38 » au départ, « 61 % » à gauche du point du jour", g.debut.texte === "38" && g.fin.texte === `61${NB}%` && g.fin.ancre === "end");
  const dates = g.dates.map((d) => d.texte);
  check("les dates : 15 août, 10 oct., 31 oct. (en gras), 21 nov., 12 déc.", ["15 août", "10 oct.", "31 oct.", "21 nov.", "12 déc."].every((d) => dates.includes(d)) && g.dates.find((d) => d.texte === "31 oct.")?.gras === true && g.dates.find((d) => d.texte === "12 déc.")?.ancre === "end" && g.dates.find((d) => d.texte === "21 nov.")?.x === 378.2, dates.join(" | "));
  const pt = geometrieCourbe(COURBE_PETITE, G, PROGRESSION.dates, p, AUJOURDHUI);
  const datesPt = pt.dates.map((d) => d.texte);
  check("le dessin étroit (328 × 186) : quatre dates seulement (15 août, 19 sept., 31 oct., 12 déc.)", datesPt.length === 4 && datesPt.includes("19 sept.") && datesPt.includes("12 déc."), datesPt.join(" | "));
  check("les points et le polygone se ferment sur l'axe du bas", g.aire.endsWith(`304.5,160 34,160`) && g.ligne.split(" ").length === 12);
  const sansJour = geometrieCourbe(COURBE_GRANDE, G, PROGRESSION.dates, projection(G, null, null), null);
  check("sans le jour d'aujourd'hui : ni projection, ni dates au-delà d'aujourd'hui", sansJour.projection === null && sansJour.dates.every((d) => d.x <= sansJour.xAuj));
  const lente = projection([40, 41, 42, 43, 44], AUJOURDHUI, null);
  const gl = geometrieCourbe(COURBE_GRANDE, [40, 41, 42, 43, 44], datesDe(5), lente, AUJOURDHUI);
  check("une projection plus lointaine que l'axe est tracée jusqu'au bord, sans atteindre 70", lente?.genre === "date" && !lente.dansHorizon && !!gl.projection && gl.projection.x2 === 452 && gl.projection.y2 > gl.y70);
  const plongeon = geometrieCourbe(COURBE_GRANDE, [60, 50, 40], datesDe(3), null, AUJOURDHUI);
  check("une courbe qui baisse : la valeur du jour passe sous le point", plongeon.fin.y > plongeon.points[2].y);
  const haut = geometrieCourbe(COURBE_GRANDE, [60, 85, 95], datesDe(3), null, AUJOURDHUI);
  check("une courbe qui dépasse 80 % : l'axe va jusqu'à 100", haut.haut === 100 && haut.graduations[2].texte === "100" && haut.points.every((q) => q.y >= 18));
}
console.log("");
console.log("# La matière superposée");
{
  const g = geometrieCourbe(COURBE_GRANDE, G, PROGRESSION.dates, null, AUJOURDHUI);
  const t = traceSuperpose(g, [null, null, 40, 42, null, 50, 52]);
  check("le tracé : trois segments (M … L … M … L …), les trous cassent la ligne, 4 points", t.points.length === 4 && (t.d.match(/M/g) ?? []).length === 2 && (t.d.match(/L/g) ?? []).length === 2, t.d);
  check("violet à 52 %, rouge sous 50 %", !t.rouge && traceSuperpose(g, [60, 45]).rouge && !traceSuperpose(g, [null, null]).rouge);
  const fi = PROGRESSION.matieres[TOPICS.findIndex((x) => x.key === "fixed_income")];
  check("la légende : « Fixed Income : 22 → 44 % »", legendeSuperposee("Fixed Income", fi) === `Fixed Income : 22 → 44${NB}%`, legendeSuperposee("Fixed Income", fi));
  check("la lecture : a pris 22 points en 11 semaines, dont 8 sur les 4 dernières ; reste sous la globale (61)", lectureMatiere("Fixed Income", fi, 61) === "Fixed Income a pris 22 points en 11 semaines, dont +8 sur les 4 dernières. Cette matière reste sous ta maîtrise globale : c'est elle qui tire ta note vers le bas.", lectureMatiere("Fixed Income", fi, 61));
  check("au-dessus de la globale : « elle tire ta note vers le haut »", lectureMatiere("Portefeuille", PROGRESSION.matieres[9], 61).endsWith("elle tire ta note vers le haut."));
  check("une seule mesure, aucune mesure, une matière qui perd", lectureMatiere("Quant", [null, null, 55], 61).includes("mesurée que depuis peu") && lectureMatiere("Quant", [null, null], 61).includes("pas encore mesurée") && lectureMatiere("Quant", [60, 58, 52], 61).includes("a perdu 8 points en 2 semaines"));
  check("les puces : dix matières, noms très courts, dans l'ordre du programme", PUCES_MATIERES.length === 10 && PUCES_MATIERES[0].libelle === "Éthique" && PUCES_MATIERES[6].libelle === "Fixed Inc." && PUCES_MATIERES[6].court === "Fixed Income" && PUCES_MATIERES[9].libelle === "Portef.");
}

// ── le rendu ────────────────────────────────────────────────────────────────

const tout = (): React.ReactElement => <RangeeExamen calcul={CALCUL} rythme={RYTHME} progression={PROGRESSION} aujourdhui={AUJOURDHUI} examen={EXAMEN} ilYa30={55} />;

console.log("");
console.log("# Le rendu : la rangée complète");
const base = rendre(tout());
{
  check("le rendu n'est pas vide, sans NaN ni undefined", base.length > 5000 && !/NaN|undefined|[[]object/.test(base), String(base.length));
  check("trois cartes dans la rangée : data-n=3, calcul, rythme et progression chacun une fois", base.includes('data-n="3"') && compte(base, /id="syn-calcul"/g) === 1 && compte(base, /id="syn-rythme"/g) === 1 && compte(base, /id="syn-progression"/g) === 1 && compte(base, /<section /g) === 3);
  check("l'ordre : Calcul ou théorie, Ton rythme d'examen, Ta progression", base.indexOf("Calcul ou théorie") < base.indexOf("Ton rythme d'examen") && base.indexOf("Ton rythme d'examen") < base.indexOf("Ta progression"));
  check("les largeurs 3 | 4 | 5", base.indexOf("c3") < base.indexOf("c4") && base.indexOf("c4") < base.indexOf("c5"));
  check("trois liquides, un par carte : exactement 3 rl-encre-vif et 3 data-palette jade", compte(base, /class="rl-encre-vif"/g) === 3 && compte(base, /data-palette="jade"/g) === 3 && !/data-palette="(?!jade)/.test(base), String(compte(base, /class="rl-encre-vif"/g)));
  check("le bouton « Session de calculs » vers /calculs/session sur Fixed Income et FSA", base.includes("Session de calculs") && base.includes('href="/calculs/session?matieres=fixed-income,fsa&amp;n=10"'));
  check("le bouton « Série chronométrée » vers " + HREF_SERIE_CHRONO, base.includes("Série chronométrée") && base.includes(`href="${HREF_SERIE_CHRONO}"`));
  check("la puce « Aucune » est la seule choisie, avec aria-pressed et le liquide", /aria-pressed="true" class="puce rl-encre" data-palette="jade"><canvas[^>]*><[/]canvas>Aucune<[/]button>/.test(base) && compte(base, /class="puce[ "]/g) === 11 && compte(base, /class="puce"/g) === 10, String(compte(base, /class="puce"/g)));
  check("calcul : 71 %, 54 %, « 17 points d'écart » (ambre), seuil de 70 %", base.includes(`71${NB}%`) && base.includes(`54${NB}%`) && base.includes("17 points d'écart") && base.includes("etatA") && compte(base, /class="seuil"/g) === 2);
  check("calcul : pistes vert (71) et ambre (54), largeurs 71 % et 54 %", base.includes('class="zE" style="width:71%"') && base.includes('class="zA" style="width:54%"'));
  check("calcul : Sans calcul avant Avec calcul, textes alternatifs des pistes", base.indexOf("Sans calcul") < base.indexOf("Avec calcul") && base.includes(`aria-label="Sans calcul : 71${NB}%"`) && base.includes(`aria-label="Avec calcul : 54${NB}%"`));
  check("rythme : 104 s par question, +14 s de trop, 42 minutes de trop, 24 questions", base.includes(`104${NB}s`) && base.includes("par question") && base.includes(`+14${NB}s de trop`) && base.includes("42 minutes de trop : environ 24 questions"));
  check("rythme : dix lignes-boutons non choisies, dix pistes, axe 60 s / 90 s / 120 / 140", compte(base, /class="ligne"/g) === 10 && compte(base, /class="rt"/g) === 10 && base.includes(`60${NB}s`) && base.includes(`90${NB}s`) && base.includes(">120<") && base.includes(">140<"));
  check("rythme : la ligne FSA en haut avec son nom accessible, pas de « Toutes matières » sans choix", base.indexOf("128") < base.indexOf("71" + NB + "s") && base.includes('aria-label="FSA : 128 s par question, examen 90 s"') && !base.includes('class="raz"'));
  check("progression : « +23 points en 11 semaines, +6 en 30 jours »", base.includes("<b>+23</b> points en 11 semaines, <b>+6</b> en 30 jours"), base.slice(base.indexOf("Ta maîtrise globale, semaine"), base.indexOf("Ta maîtrise globale, semaine") + 160));
  check("progression : deux dessins (grande et petite taille) avec le même texte alternatif et la projection", compte(base, /class="courbe courbeGrande"/g) === 1 && compte(base, /class="courbe courbePetite"/g) === 1 && compte(base, new RegExp(`aria-label="Ta maîtrise globale sur 11 semaines, de 38 à 61${NB}%, puis la projection jusqu'à 70${NB}% vers le 12 décembre"`, "g")) === 2);
  check("progression : légende (ta maîtrise, 70 % vers le 12 déc., seuil), 12 points noirs + projection", base.includes("Ta maîtrise globale</li>") && base.includes(`À ton rythme : 70${NB}% vers le 12 déc.`) && base.includes(`seuil 70${NB}%`));
  check("progression : la phrase « Ce que ça veut dire » de la maquette", base.includes("+1,5 point par semaine sur le dernier mois") && base.includes("environ 10 semaines avant l'examen"));
  check("progression : le texte « aujourd'hui » au-dessus de la ligne du jour, l'étiquette 70 % de l'axe", base.includes(">aujourd'hui<") && base.includes(`>70${NB}%<`));
  check("aucun antislash ni chemin de travail, aucune image de la maquette", !base.includes(String.fromCharCode(92)) && !/scratchpad|AppData|C:[/]|_blob/.test(base));
  console.log("     taille de la rangée : " + base.length + " octets");
  check("la rangée reste légère (piège d'hydratation #418)", base.length < 60_000, String(base.length));
}

console.log("");
console.log("# Le rendu : 3, 2 ou 1 cartes selon les sources");
{
  const sans = (o: { calcul?: boolean; rythme?: boolean; progression?: boolean }) =>
    rendre(<RangeeExamen calcul={o.calcul === false ? null : CALCUL} rythme={o.rythme === false ? null : RYTHME} progression={o.progression === false ? null : PROGRESSION} aujourdhui={AUJOURDHUI} examen={EXAMEN} />);
  const deux = sans({ calcul: false });
  check("sans calcul : 2 cartes (data-n=2), plus de « Session de calculs »", deux.includes('data-n="2"') && compte(deux, /<section /g) === 2 && !deux.includes("syn-calcul") && !deux.includes("Session de calculs") && compte(deux, /class="rl-encre-vif"/g) === 2);
  const deux2 = sans({ rythme: false });
  check("sans rythme : calcul et progression (data-n=2)", deux2.includes('data-n="2"') && deux2.includes("syn-calcul") && deux2.includes("syn-progression") && !deux2.includes("syn-rythme") && !deux2.includes("Série chronométrée"));
  const un = sans({ calcul: false, rythme: false });
  check("la progression seule : data-n=1, un seul liquide (la puce)", un.includes('data-n="1"') && compte(un, /<section /g) === 1 && un.includes("syn-progression") && compte(un, /class="rl-encre-vif"/g) === 1);
  const un2 = sans({ calcul: false, progression: false });
  check("le rythme seul : data-n=1", un2.includes('data-n="1"') && un2.includes("syn-rythme") && compte(un2, /<section /g) === 1);
  const aucune = rendre(<RangeeExamen calcul={null} rythme={null} progression={null} aujourdhui={AUJOURDHUI} examen={EXAMEN} />);
  check("aucune source : rien du tout", aucune === "");
}

console.log("");
console.log("# Le rendu : la matière choisie ou superposée");
{
  const q = rendre(<Rythme rythme={RYTHME} choisieAuDepart="quant" />);
  check("Quant choisie : eyebrow « Quant », 118 s, +28 s de trop, 28 s de plus par question", q.includes(">Quant</span>") && q.includes(`118${NB}s`) && q.includes(`+28${NB}s de trop`) && q.includes(`28${NB}s de plus par question`));
  check("seule la ligne Quant est choisie, les 9 autres sont estompées, « Toutes matières » apparaît", compte(q, /aria-pressed="true"/g) === 1 && compte(q, /class="ligne hors"/g) === 9 && compte(q, /class="ligne"/g) === 1 && q.includes('class="raz"') && q.includes("Toutes matières</button>"));
  check("pas de minutes de trop pour une matière", !q.includes("minutes de trop"));
  const e = rendre(<Rythme rythme={RYTHME} choisieAuDepart="ethics" />);
  check("Éthique choisie : pastille verte « 19 s d'avance »", e.includes(`19${NB}s d'avance</span>`) && e.includes("etatE"));
  const inconnue = rendre(<Rythme rythme={RYTHME} choisieAuDepart="nimporte" />);
  check("une matière inconnue retombe sur toutes matières", inconnue.includes("Toutes matières</span>") && compte(inconnue, /aria-pressed="true"/g) === 0);

  const sup = rendre(<Progression progression={PROGRESSION} aujourdhui={AUJOURDHUI} examen={EXAMEN} ilYa30={55} superposeeAuDepart={6} />);
  check("Fixed Inc. superposée : cette puce est la seule choisie (liquide), « Aucune » ne l'est plus", /aria-pressed="true" class="puce rl-encre" data-palette="jade"><canvas[^>]*><[/]canvas>Fixed Inc[.]<[/]button>/.test(sup) && compte(sup, /rl-encre-vif/g) === 1 && /aria-pressed="false" class="puce">Aucune<[/]button>/.test(sup));
  check("le tracé superposé en rouge (44 %, sous 50) dans les deux dessins et sa légende, la lecture", compte(sup, /stroke="var[(]--zone-rouge[)]"/g) === 3 && sup.includes(`Fixed Income : 22 → 44${NB}%`) && sup.includes("Fixed Income a pris 22 points en 11 semaines") && sup.includes("tire ta note vers le bas"), String(compte(sup, /stroke="var[(]--zone-rouge[)]"/g)));
  check("le texte alternatif cite la matière : « avec Fixed Income superposée »", compte(sup, /avec Fixed Income superposée/g) === 2);
  const eth = rendre(<Progression progression={PROGRESSION} aujourdhui={AUJOURDHUI} examen={EXAMEN} superposeeAuDepart={0} />);
  check("Éthique (58 %, trou au début) : tracé violet dans les deux dessins et la légende, 9 points par dessin, « +6 en 4 semaines » sans la date des 30 jours", compte(eth, /stroke="var[(]--violet[)]"/g) === 3 && compte(eth, /<circle cx="[0-9.]+" cy="[0-9.]+" r="4"/g) === 18 && eth.includes("Éthique a pris 17 points en 8 semaines") && eth.includes("<b>+6</b> en 4 semaines"), `${compte(eth, /stroke="var[(]--violet[)]"/g)} ${compte(eth, /<circle cx="[0-9.]+" cy="[0-9.]+" r="4"/g)}`);
  const horsLimite = rendre(<Progression progression={PROGRESSION} aujourdhui={AUJOURDHUI} examen={EXAMEN} superposeeAuDepart={42} />);
  check("un index hors limites retombe sur « Aucune »", /aria-pressed="true" class="puce rl-encre"[^>]*><canvas[^>]*><[/]canvas>Aucune<[/]button>/.test(horsLimite));
  const sansJour = rendre(<Progression progression={PROGRESSION} aujourdhui={null} examen={null} />);
  check("sans le jour d'aujourd'hui : la courbe se dessine, sans projection ni légende de rythme", sansJour.includes("syn-progression") && !sansJour.includes("À ton rythme") && !sansJour.includes("la projection jusqu'à") && sansJour.includes("est passée de 38"));
}

console.log("");
console.log("# Le rendu : les états vides");
{
  const vide = rendre(<CalculTheorie calcul={{ global: null, matieres: [{ cle: "quant", court: "Quant", avec: 50, sans: 70 }, { cle: "fsa", court: "FSA", avec: 40, sans: null }] }} />);
  check("calcul sous 3 matières : « Il faut 10 réponses de chaque type… Tu en as une », le même bouton, plus de pistes", vide.includes("Il faut 10 réponses de chaque type, avec et sans calcul, dans 3 matières pour les comparer. Tu en as une pour l'instant.") && vide.includes("Session de calculs") && vide.includes('href="/calculs/session?matieres=fsa,quant&amp;n=10"') && !vide.includes('class="zp"') && compte(vide, /rl-encre-vif/g) === 1, vide.slice(vide.indexOf("Il faut"), vide.indexOf("Il faut") + 90));
  const rien = rendre(<CalculTheorie calcul={{ global: null, matieres: [] }} />);
  check("calcul sans aucune mesure : « Tu n'en as aucune », session sur toutes les matières", rien.includes("Tu n'en as aucune pour l'instant.") && rien.includes('href="/calculs/session?matieres=toutes&amp;n=10"'));
  const ry = rendre(<Rythme rythme={{ global: null, questions: 7, matieres: [] }} />);
  check("rythme sous 20 questions : « Fais une série chronométrée pour mesurer ton rythme », tu en as 7, le bouton", ry.includes("Fais une série chronométrée pour mesurer ton rythme") && ry.includes("il faut 20 questions chronométrées, tu en as 7.") && ry.includes("Série chronométrée") && !ry.includes('class="ligne"') && compte(ry, /rl-encre-vif/g) === 1);
  const ry0 = rendre(<Rythme rythme={{ global: null, questions: 0, matieres: [] }} />);
  check("rythme sans aucune question chronométrée : « tu n'en as pas encore »", ry0.includes("tu n'en as pas encore."));
  const pr = rendre(<Progression progression={{ points: [40, 45], dates: datesDe(2), matieres: TOPICS.map(() => []), aujourdhui: AUJOURDHUI, examen: EXAMEN }} aujourdhui={AUJOURDHUI} examen={EXAMEN} />);
  check("progression sous 3 points : « Ta courbe démarre après 3 semaines de réponses », un lien, aucun dessin ni liquide", pr.includes("Ta courbe démarre après 3 semaines de réponses.") && pr.includes('href="/practice"') && !pr.includes('viewBox="0 0 465') && compte(pr, /rl-encre-vif/g) === 0);
  const pr0 = rendre(<Progression progression={{ points: [], dates: [], matieres: TOPICS.map(() => []), aujourdhui: AUJOURDHUI, examen: EXAMEN }} aujourdhui={AUJOURDHUI} examen={EXAMEN} />);
  check("progression sans aucun point (rien de mesuré) : le même état vide", pr0.includes("Ta courbe démarre après 3 semaines"));
}

console.log("");
console.log(ko === 0 ? "Tout est vert." : `${ko} échec(s).`);
process.exit(ko === 0 ? 0 : 1);
