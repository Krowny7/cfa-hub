// Tests de l'Atelier : lib/atelier.ts (poids, plan, blocs absents remplacés
// par des questions neuves, alternance des notions selon leur poids, carte
// Rappel après deux fautes, question plus facile puis plus dure, notion
// tenue, chrono qui commande, plafond, re-test, bilan avant / pendant) et
// une séance entière jouée au hasard (toujours une fin, jamais de question
// introuvable). Sans dépendance de plus : jiti (déjà installé avec
// Tailwind) charge le TypeScript et l'alias « @/ ».
// Usage : node scripts/test-atelier.mjs
import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const jiti = createJiti(import.meta.url, { alias: { "@/": racine + "/" } });
const A = await jiti.import(join(racine, "lib/atelier.ts"));

let ko = 0;
let n = 0;
const check = (libelle, cond, extra = "") => {
  n++;
  console.log((cond ? "ok   " : "KO   ") + libelle + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};

const N1 = "fixed_income:11";
const N2 = "fixed_income:12";
const N3 = "equity:8";
/** Un pool : ratures, neuves (niveaux qui tournent 1, 2, 3), calculs (niveau donné), par notion. */
function pool(spec) {
  const items = [];
  for (const [k, notion, nb, niveau] of spec) for (let x = 0; x < nb; x++) items.push({ i: items.length, k, notion, niveau: niveau ?? (k === "neuve" ? ((x % 3) + 1) : 1) });
  return items;
}
const etat = (items, extra = {}) => ({
  notions: [N1, N2, N3],
  poids: [60, 25, 15],
  items,
  reponses: [],
  rappels: [{ notion: null, apres: 0 }],
  secondes: 0,
  reussiteAvant: { [N1]: 0.4, [N2]: 0.7, [N3]: null },
  ...extra,
});
const PLEIN = pool([
  ["rature", N1, 10],
  ["rature", N2, 4],
  ["rature", N3, 2],
  ["neuve", N1, 12],
  ["neuve", N2, 8],
  ["neuve", N3, 4],
  ["calc", N3, 4, 2],
  ["calc", N3, 2, 1],
]);
const itemDe = (e, i) => e.items.find((x) => x.i === i);
/** Joue l'étape suivante : réponse `ok` (ou une fonction de l'item), un rappel s'enregistre. */
function jouer(e, plan, ok = true) {
  const et = A.prochaineEtape(e, plan);
  if (et.type === "rappel") {
    e.rappels.push({ notion: et.notions.length === 1 && et.raison === "fautes" ? et.notions[0] : null, apres: e.reponses.length });
  } else if (et.type === "question") {
    const it = itemDe(e, et.i);
    e.reponses.push({ i: et.i, ok: typeof ok === "function" ? ok(it, et) : ok, retest: et.retest });
  }
  return et;
}

console.log("# Poids et plan");
check("poids : 100 ; 70/30 ; 60/25/15", A.poidsDe(1).join() === "100" && A.poidsDe(2).join() === "70,30" && A.poidsDe(3).join() === "60,25,15");
let plan = A.planifier(PLEIN);
check("pool plein : 8 ratures, 8 neuves, 4 calculs, 4 re-tests", plan.ratures === 8 && plan.neuves === 8 && plan.calcul === 4 && plan.retest === 4, JSON.stringify(plan));
const peuDeRatures = A.planifier(pool([["rature", N1, 3], ["neuve", N1, 30], ["calc", N1, 6]]));
check("3 ratures seulement : 5 neuves de plus (13)", peuDeRatures.ratures === 3 && peuDeRatures.neuves === 13);
const sansCalcul = A.planifier(pool([["rature", N1, 8], ["neuve", N1, 30]]));
check("sans calcul : 4 neuves de plus (12), bloc calcul vide", sansCalcul.neuves === 12 && sansCalcul.calcul === 0);
const rien = A.planifier(pool([["neuve", N1, 5]]));
check("peu de neuves : la cible suit ce qu'il y a (5)", rien.neuves === 5 && rien.ratures === 0);

console.log("\n# Ouverture et ratures");
let e = etat(PLEIN, { rappels: [] });
let et = A.prochaineEtape(e, plan);
check("d'abord la carte Rappel des trois notions", et.type === "rappel" && et.raison === "ouverture" && et.notions.join() === [N1, N2, N3].join());
e.rappels.push({ notion: null, apres: 0 });
const ordre = [];
for (let k = 0; k < 8; k++) ordre.push(itemDe(e, jouer(e, plan).i));
check("puis 8 ratures, et pas une question de plus dans ce bloc", ordre.every((x) => x.k === "rature"));
const parN = (l, nn) => l.filter((x) => x.notion === nn).length;
check("les notions alternent selon leur poids (5/2/1 sur 8)", parN(ordre, N1) === 5 && parN(ordre, N2) === 2 && parN(ordre, N3) === 1, [parN(ordre, N1), parN(ordre, N2), parN(ordre, N3)].join("/"));
check("dans une notion : l'ordre du pool (vives, les plus anciennes d'abord)", ordre.filter((x) => x.notion === N1).every((x, k, a) => k === 0 || a[k - 1].i < x.i));
check("puis le bloc des questions neuves", A.prochaineEtape(e, plan).type === "question" && A.prochaineEtape(e, plan).bloc === "neuves");

console.log("\n# Niveaux et adaptation");
e = etat(PLEIN);
check("neuves : réussite récente 40 % → niveau visé 2 (angle)", A.niveauCible(e, N1, "neuve") === 2);
check("neuves : réussite récente 70 % → plus dure (3)", A.niveauCible(e, N2, "neuve") === 3);
check("neuves : réussite inconnue → 2", A.niveauCible(e, N3, "neuve") === 2);
check("calcul : le niveau le plus fourni du pool (2)", A.niveauCible(e, N3, "calc") === 2);
// deux fautes de suite sur N1 : rappel, puis plus facile
const neuvesN1 = PLEIN.filter((x) => x.k === "neuve" && x.notion === N1);
e.reponses.push({ i: neuvesN1[1].i, ok: false, retest: false }, { i: neuvesN1[2].i, ok: false, retest: false });
et = A.prochaineEtape(e, plan);
check("deux fautes de suite : une carte Rappel de la notion", et.type === "rappel" && et.raison === "fautes" && et.notions.join() === N1);
e.rappels.push({ notion: N1, apres: e.reponses.length });
check("… une seule fois pour cette série", A.prochaineEtape(e, plan).type === "question");
check("… et la question suivante de la notion est l'officielle (niveau 1)", A.niveauCible(e, N1, "neuve") === 1);
e.reponses.push({ i: neuvesN1[4].i, ok: false, retest: false });
check("une troisième faute : pas de nouveau rappel", A.prochaineEtape(e, plan).type === "question");
e.reponses.push({ i: neuvesN1[0].i, ok: true, retest: false }, { i: neuvesN1[3].i, ok: false, retest: false }, { i: neuvesN1[5].i, ok: false, retest: false });
check("une juste, puis deux nouvelles fautes : un nouveau rappel", A.prochaineEtape(e, plan).type === "rappel");
check("une faute d'une autre notion ne compte pas dans la série", (() => {
  const x = etat(PLEIN);
  const n2 = PLEIN.filter((y) => y.k === "neuve" && y.notion === N2);
  x.reponses.push({ i: neuvesN1[0].i, ok: false, retest: false }, { i: n2[0].i, ok: false, retest: false });
  return A.prochaineEtape(x, plan).type === "question";
})());
check("une faute au re-test ne déclenche pas de rappel", (() => {
  const x = etat(PLEIN);
  x.reponses.push({ i: neuvesN1[0].i, ok: false, retest: false }, { i: neuvesN1[0].i, ok: false, retest: true });
  return A.prochaineEtape(x, plan).type !== "rappel";
})());
e = etat(PLEIN);
e.reponses.push(...neuvesN1.slice(0, 3).map((x) => ({ i: x.i, ok: true, retest: false })));
check("trois justes de suite : plus dure (3)", A.niveauCible(e, N1, "neuve") === 3);
check("le choix suit le niveau visé : une question de niveau 3", (() => {
  const x = etat(PLEIN, { notions: [N1], poids: [100] });
  x.reponses.push(...neuvesN1.slice(0, 3).map((y) => ({ i: y.i, ok: true, retest: false })));
  return itemDe(x, A.choisir(x, "neuves")).niveau === 3;
})());
const calcN3 = PLEIN.filter((x) => x.k === "calc");
e = etat(PLEIN);
e.reponses.push({ i: calcN3[0].i, ok: false, retest: false }, { i: calcN3[1].i, ok: false, retest: false });
check("calcul : deux fautes → un niveau en dessous (1)", A.niveauCible(e, N3, "calc") === 1);
e = etat(pool([["calc", N3, 4, 1]]), { notions: [N3], poids: [100] });
e.reponses.push({ i: 0, ok: false, retest: false }, { i: 1, ok: false, retest: false });
check("calcul déjà au plus bas : il y reste", A.niveauCible(e, N3, "calc") === 1);

console.log("\n# Notion tenue");
e = etat(pool([["neuve", N1, 20], ["neuve", N2, 20]]), { notions: [N1, N2], poids: [70, 30] });
for (const x of e.items.filter((y) => y.notion === N1).slice(0, 6)) e.reponses.push({ i: x.i, ok: true, retest: false });
check("6 sur 6 : tenue, son poids passe à l'autre", A.estTenue(A.compteNotion(e, N1)) && A.poidsEffectifs(e).join() === "0,30");
check("les questions suivantes vont à l'autre notion", [0, 1, 2].every(() => itemDe(e, jouer(e, A.planifier(e.items)).i).notion === N2));
check("5 sur 6 (83 %) : tenue ; 4 sur 6 : non", A.estTenue({ n: 6, ok: 5 }) && !A.estTenue({ n: 6, ok: 4 }) && !A.estTenue({ n: 5, ok: 5 }));
e = etat(pool([["neuve", N1, 20], ["neuve", N2, 1]]), { notions: [N1, N2], poids: [70, 30] });
for (const x of e.items.filter((y) => y.notion === N1).slice(0, 6)) e.reponses.push({ i: x.i, ok: true, retest: false });
e.reponses.push({ i: e.items.find((y) => y.notion === N2).i, ok: false, retest: false });
check("l'autre notion à court : la notion tenue revient (jamais de bloc vide)", itemDe(e, A.choisir(e, "neuves"))?.notion === N1);
check("toutes tenues : les poids d'origine", (() => {
  const x = etat(pool([["neuve", N1, 8]]), { notions: [N1], poids: [100] });
  for (const y of x.items.slice(0, 6)) x.reponses.push({ i: y.i, ok: true, retest: false });
  return A.poidsEffectifs(x).join() === "100";
})());

console.log("\n# Le chrono commande");
e = etat(PLEIN);
for (let k = 0; k < 8; k++) jouer(e, plan, false);
for (let k = 0; k < 3; k++) jouer(e, plan, true);
e.secondes = 19 * 60;
check("19 minutes : toujours les questions neuves", (() => { const t = A.prochaineEtape(e, plan); return t.type === "question" && t.bloc === "neuves"; })());
e.secondes = 20 * 60;
et = A.prochaineEtape(e, plan);
check("20 minutes, neuves pas finies : le re-test (le calcul saute)", et.type === "question" && et.bloc === "retest" && et.retest);
const reposees = [];
for (let k = 0; k < 6; k++) {
  const t = jouer(e, plan, true);
  if (t.type === "question") reposees.push(t.i);
}
check("re-test : 4 questions au plus, toutes manquées, sans doublon", reposees.length === 4 && new Set(reposees).size === 4 && reposees.every((i) => e.reponses.some((r) => r.i === i && !r.retest && !r.ok)));
check("puis le bilan", A.prochaineEtape(e, plan).type === "fin");
check("re-test remélangé, toujours dans le même ordre", JSON.stringify(A.aReposer({ ...e, reponses: e.reponses.filter((r) => !r.retest) })) === JSON.stringify(A.aReposer({ ...e, reponses: e.reponses.filter((r) => !r.retest) })) && A.aReposer({ ...e, reponses: e.reponses.filter((r) => !r.retest) }).join() !== e.reponses.filter((r) => !r.retest && !r.ok).map((r) => r.i).join());
e = etat(PLEIN);
for (let k = 0; k < 11; k++) jouer(e, plan, true);
e.secondes = 21 * 60;
check("20 minutes passées, rien de manqué : le bilan tout de suite", A.prochaineEtape(e, plan).type === "fin");
e = etat(PLEIN);
for (let k = 0; k < 16; k++) jouer(e, plan, true);
e.secondes = 25 * 60;
et = A.prochaineEtape(e, plan);
check("neuves finies avant 20 minutes : le calcul continue après", et.type === "question" && et.bloc === "calcul");
e.secondes = 32 * 60;
check("32 minutes (plafond doux) : le bilan", A.prochaineEtape(e, plan).type === "fin" && A.prochaineEtape(e, plan).raison === "plafond");
e = etat(PLEIN);
e.secondes = 33 * 60;
e.reponses.push({ i: neuvesN1[0].i, ok: false, retest: false }, { i: neuvesN1[1].i, ok: false, retest: false });
check("le rappel d'une faute passe avant le plafond (la carte n'est jamais coupée)", A.prochaineEtape(e, plan).type === "rappel");

console.log("\n# Jamais de bloc vide");
e = etat(pool([["neuve", N1, 20]]), { notions: [N1], poids: [100] });
const p1 = A.planifier(e.items);
et = A.prochaineEtape(e, p1);
check("sans rature : droit aux questions neuves", et.type === "question" && et.bloc === "neuves");
check("20 neuves (8, plus 8 à la place des ratures, plus 4 sans calcul), puis le bilan (tout juste)", (() => {
  let k = 0;
  while (A.prochaineEtape(e, p1).type === "question" && k < 50) { jouer(e, p1, true); k++; }
  return k === 20 && A.prochaineEtape(e, p1).type === "fin";
})(), String(e.reponses.length));
check("pool vide : le bilan d'emblée", A.prochaineEtape(etat([], { notions: [N1], poids: [100] }), A.planifier([])).type === "fin");
const blocs = A.avancement(etat(pool([["neuve", N1, 20]]), { notions: [N1], poids: [100] }), p1, { type: "question", i: 0, bloc: "neuves", retest: false });
check("le plan affiché n'a ni bloc ratures ni bloc calcul vides", blocs.map((b) => b.bloc).join() === "rappel,neuves,retest", blocs.map((b) => b.bloc).join());

console.log("\n# Avancement");
e = etat(PLEIN);
for (let k = 0; k < 10; k++) jouer(e, plan, true);
et = A.prochaineEtape(e, plan);
const av = Object.fromEntries(A.avancement(e, plan, et).map((b) => [b.bloc, b]));
check("rappel et ratures faits, neuves en cours (2/8), calcul et re-test à venir", av.rappel.etat === "fait" && av.ratures.etat === "fait" && av.ratures.fait === 8 && av.neuves.etat === "encours" && av.neuves.fait === 2 && av.neuves.cible === 8 && av.calcul.etat === "avenir" && av.retest.etat === "avenir");
e.secondes = 20 * 60;
e.reponses.push({ i: neuvesN1[11].i, ok: false, retest: false });
et = A.prochaineEtape(e, plan);
const av2 = Object.fromEntries(A.avancement(e, plan, et).map((b) => [b.bloc, b]));
check("bascule : le calcul est sauté, le re-test en cours", av2.calcul.etat === "saute" && av2.retest.etat === "encours", JSON.stringify(av2.calcul) + JSON.stringify(av2.retest));

console.log("\n# Bilan");
const avant = { [N1]: { n: 20, ok: 8, enCours: 12, vives: 8, calc: null }, [N2]: { n: 10, ok: 7, enCours: 4, vives: 2, calc: null }, [N3]: { n: 0, ok: 0, enCours: 2, vives: 2, calc: { n: 10, ok: 3 } } };
e = etat(PLEIN);
const ratN1 = PLEIN.filter((x) => x.k === "rature" && x.notion === N1);
e.reponses.push(
  ...ratN1.slice(0, 5).map((x) => ({ i: x.i, ok: true, retest: false })),
  { i: ratN1[5].i, ok: false, retest: false },
  ...neuvesN1.slice(0, 2).map((x) => ({ i: x.i, ok: false, retest: false })),
  ...neuvesN1.slice(2, 4).map((x) => ({ i: x.i, ok: true, retest: false })),
  { i: calcN3[0].i, ok: true, retest: false },
  { i: calcN3[4].i, ok: true, retest: false },
  { i: neuvesN1[0].i, ok: true, retest: true },
);
let b = A.bilan(e, avant);
const b1 = b.notions.find((x) => x.notion === N1);
check("duration : avant 8/20, pendant 7/10 (questions seulement)", b1.avant.ok === 8 && b1.avant.n === 20 && b1.pendant.ok === 7 && b1.pendant.n === 10);
check("duration : ratures 12 → 9 (5 rayées, 2 nouvelles), sans chiffre du serveur", b1.ratures.avant === 12 && b1.ratures.rayees === 5 && b1.ratures.nouvelles === 2 && b1.ratures.apres === 9);
check("duration : pas de calcul ; equity : calcul 2/2 au niveau 2, avant 3/10", b1.calcul === null && b.notions.find((x) => x.notion === N3).calcul?.pendant.ok === 2 && b.notions.find((x) => x.notion === N3).calcul?.niveau === 2 && b.notions.find((x) => x.notion === N3).calcul?.avant?.ok === 3);
check("score 9/12 au premier passage, re-test 1/1 à part", b.score === 9 && b.total === 12 && b.retest.n === 1 && b.retest.ok === 1, `${b.score}/${b.total}`);
check("convexité sans réponse : pendant 0/0, ratures inchangées", b.notions.find((x) => x.notion === N2).pendant.n === 0 && b.notions.find((x) => x.notion === N2).ratures.apres === 4);
check("à revoir d'abord : la notion la plus basse pendant (seule notion jouée en questions)", b.aRevoir === N1);
check("75 % pendant : prochain Atelier après-demain", b.prochain === "apres-demain");
b = A.bilan(e, avant, { [N1]: { enCours: 8, vives: 3 } });
check("ratures après : le compte du serveur à la clôture l'emporte", b.notions.find((x) => x.notion === N1).ratures.apres === 8);
check("sous 60 % : demain ; 80 % ou plus : dans une semaine ; rien : demain", A.bilan({ ...e, reponses: [{ i: 0, ok: false, retest: false }] }, avant).prochain === "demain" && A.bilan({ ...e, reponses: [{ i: 0, ok: true, retest: false }] }, avant).prochain === "semaine" && A.bilan({ ...e, reponses: [] }, avant).prochain === "demain" && A.bilan({ ...e, reponses: [] }, avant).aRevoir === null);
check("notion tenue au bilan (6/6)", A.bilan({ ...e, reponses: ratN1.slice(0, 6).map((x) => ({ i: x.i, ok: true, retest: false })) }, avant).notions[0].tenue);

console.log("\n# Une séance entière, au hasard (200 tirages)");
let pire = 0;
let toujoursFin = true;
let jamaisIntrouvable = true;
let rappelsOk = true;
for (let s = 0; s < 200; s++) {
  let graine = s + 1;
  const hasard = () => ((graine = (graine * 16807) % 2147483647) / 2147483647);
  const spec = [
    ["rature", N1, Math.floor(hasard() * 12)],
    ["rature", N2, Math.floor(hasard() * 5)],
    ["neuve", N1, Math.floor(hasard() * 14)],
    ["neuve", N2, Math.floor(hasard() * 8)],
    ["neuve", N3, Math.floor(hasard() * 5)],
    ["calc", N3, Math.floor(hasard() * 5), 2],
  ];
  const x = etat(pool(spec), { rappels: [] });
  const p = A.planifier(x.items);
  let pas = 0;
  let t;
  do {
    t = A.prochaineEtape(x, p);
    if (t.type === "question" && !itemDe(x, t.i)) jamaisIntrouvable = false;
    if (t.type === "rappel" && t.raison === "fautes" && x.rappels.some((r) => r.notion === t.notions[0] && r.apres === x.reponses.length)) rappelsOk = false;
    if (t.type !== "fin") jouer(x, p, () => hasard() < 0.55);
    x.secondes += 45 + Math.floor(hasard() * 60);
    pas++;
  } while (t.type !== "fin" && pas < 200);
  if (t.type !== "fin") toujoursFin = false;
  pire = Math.max(pire, x.reponses.length);
}
check("toujours une fin", toujoursFin);
check("jamais une question hors du pool", jamaisIntrouvable);
check("jamais deux fois le même rappel d'affilée", rappelsOk);
check("au plus 24 réponses (20 au premier passage, calculs compris, et 4 re-tests)", pire <= 24, String(pire));

console.log(ko ? `\n${ko} KO sur ${n}` : `\nTOUT OK (${n})`);
process.exit(ko ? 1 : 0);
