// La boucle « À revoir » des flashcards (lib/flashcards/boucle.ts) : tours,
// entracte, fin à zéro, cartes sautées, mélange, temps actif, stockage,
// réparation quand les cartes changent ; et le gras et le surligné inline de
// RichText (lib/richtext.ts).
// Usage, depuis le dépôt : npx tsx --tsconfig tsconfig.json scripts/flashcards/test-boucle.ts

import {
  PAUSE_MAX,
  aRevoir,
  aller,
  bilan,
  carteCourante,
  cleBoucle,
  demarrer,
  ecrireBoucle,
  ecrireMelange,
  effacerBoucle,
  enCours,
  etatFige,
  lireBoucle,
  lireMelange,
  marquer,
  melanger,
  phase,
  progression,
  reparer,
  repere,
  reprendre,
  tourSuivant,
  valider,
  type EtatBoucle,
  type Stockage,
} from "@/lib/flashcards/boucle";
import { passagesInline } from "@/lib/richtext";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const eq = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Un localStorage en mémoire. */
function memoire(): Stockage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k)! : null),
    setItem: (k, v) => void data.set(k, String(v)),
    removeItem: (k) => void data.delete(k),
  };
}
/** Un stockage qui jette à chaque appel (navigation privée, données bloquées). */
const casse: Stockage = {
  getItem: () => {
    throw new Error("bloqué");
  },
  setItem: () => {
    throw new Error("bloqué");
  },
  removeItem: () => {
    throw new Error("bloqué");
  },
};

const IDS = Array.from({ length: 15 }, (_, i) => `c${i + 1}`);
const T0 = 1_700_000_000_000;

// ---------------------------------------------------------------------------
console.log("— Démarrage");
{
  const e = demarrer(IDS, { maintenant: T0 });
  check("tour 1, toutes les cartes dans l'ordre", e.tour === 1 && eq(e.file, IDS));
  check("phase carte, première carte à l'écran", phase(e) === "carte" && carteCourante(e) === "c1");
  check("parcours [15]", eq(e.parcours, [15]));
  check("pas encore en cours (rien de marqué)", !enCours(e));
  const d = demarrer(["a", "b", "a", "c"]);
  check("doublons retirés", eq(d.file, ["a", "b", "c"]));
  const m = demarrer(IDS, { melanger: true, rng: rng(7) });
  check("mélangé : mêmes cartes", eq([...m.file].sort(), [...IDS].sort()));
  check("mélangé : autre ordre", !eq(m.file, IDS));
  const vide = demarrer([]);
  check("paquet vide : fin d'emblée", phase(vide) === "fin" && carteCourante(vide) === null);
  check("melanger ne modifie pas l'entrée", (() => {
    const xs = ["a", "b", "c", "d"];
    melanger(xs, rng(1));
    return eq(xs, ["a", "b", "c", "d"]);
  })());
}

// ---------------------------------------------------------------------------
console.log("— Tour 1 → entracte → tours suivants → fin");
{
  let e = demarrer(IDS, { maintenant: T0 });
  const revoir1 = new Set(["c2", "c5", "c9", "c11", "c14", "c15"]);
  let t = T0;
  for (const id of IDS) {
    check(`tour 1 : ${id} à l'écran`, carteCourante(e) === id);
    t += 10_000;
    e = marquer(e, !revoir1.has(id), t);
  }
  check("fin du tour 1 : entracte", phase(e) === "entracte");
  check("6 à revoir, dans l'ordre de la file", eq(aRevoir(e), ["c2", "c5", "c9", "c11", "c14", "c15"]));
  check("en cours : à proposer en reprise", enCours(e));
  check("progression du tour 1", eq(progression(e), { total: 15, maitrisees: 9, aRevoir: 6, restantes: 0, rang: 15 }));
  check("marquer hors tour : sans effet", marquer(e, true) === e);
  check("aller hors tour : sans effet", aller(e, -1) === e);
  check("premier tour mémorisé (9 sues)", bilan(e).premierSues === 9);

  const avant = e;
  e = tourSuivant(e, { rng: rng(3), maintenant: t });
  check("l'état d'avant n'est pas modifié", avant.tour === 1 && phase(avant) === "entracte");
  check("tour 2", e.tour === 2 && phase(e) === "carte");
  check("tour 2 : seulement les 6 à revoir", eq([...e.file].sort(), [...revoir1].sort()));
  check("tour 2 : marques remises à zéro", Object.keys(e.marques).length === 0);
  check("tour 2 : ne commence pas par la dernière carte vue (c15)", e.file[0] !== "c15");
  check("parcours [15, 6]", eq(e.parcours, [15, 6]));
  check("tour suivant hors entracte : sans effet", tourSuivant(e) === e);

  // tour 2 : deux restent à revoir
  const revoir2 = new Set([e.file[1], e.file[4]]);
  for (let k = 0; k < 6; k++) {
    t += 8_000;
    e = marquer(e, !revoir2.has(e.file[e.pos]), t);
  }
  check("fin du tour 2 : entracte avec 2", phase(e) === "entracte" && aRevoir(e).length === 2);
  e = tourSuivant(e, { rng: rng(4), maintenant: t });
  check("tour 3 avec 2 cartes", e.tour === 3 && e.file.length === 2 && eq([...e.file].sort(), [...revoir2].sort()));
  t += 5_000;
  e = marquer(e, true, t);
  check("fin non atteinte avec une carte restante", phase(e) === "carte" && e.fin === null);
  t += 5_000;
  e = marquer(e, true, t);
  check("zéro à revoir : fin", phase(e) === "fin" && e.fin === t);
  check("fin : plus en cours", !enCours(e));
  const b = bilan(e);
  check("bilan : 3 tours, 15 cartes", b.tours === 3 && b.cartes === 15);
  check("bilan : parcours 15 → 6 → 2", eq(b.parcours, [15, 6, 2]));
  check("bilan : 23 cartes vues", b.vues === 23);
  check("bilan : premier tour 9 sues", b.premierSues === 9);
  check("bilan : temps actif = somme des gestes", b.dureeMs === 15 * 10_000 + 6 * 8_000 + 2 * 5_000, String(b.dureeMs));
}

// ---------------------------------------------------------------------------
console.log("— Tout su au premier tour");
{
  let e = demarrer(["a", "b", "c"], { maintenant: T0 });
  for (let k = 0; k < 3; k++) e = marquer(e, true, T0 + (k + 1) * 1000);
  check("fin directe, un seul tour", phase(e) === "fin" && e.tour === 1);
  check("tourSuivant sans effet", tourSuivant(e) === e);
}

// ---------------------------------------------------------------------------
console.log("— Cartes sautées (→) et retour (←)");
{
  let e = demarrer(["a", "b", "c", "d"], { maintenant: T0 });
  e = aller(e, 1); // saute a
  check("→ : b à l'écran", carteCourante(e) === "b");
  e = marquer(e, true, T0 + 1000); // b
  check("après b : c", carteCourante(e) === "c");
  e = marquer(e, false, T0 + 2000); // c
  e = marquer(e, true, T0 + 3000); // d
  check("la carte sautée revient en fin de tour (a)", carteCourante(e) === "a" && phase(e) === "carte");
  check("le compteur ne recule pas : 4 / 4, comme la reprise", progression(e).rang === 4 && repere(e).rang === 4, String(progression(e).rang));
  e = aller(e, -1);
  check("← depuis le début : reste sur a", carteCourante(e) === "a");
  e = aller(e, 2);
  check("← → bornés : c (déjà marquée, on peut la revoir)", carteCourante(e) === "c");
  e = marquer(e, true, T0 + 4000); // re-marque c : maîtrisée
  check("re-marquer remplace la marque", e.marques.c === true);
  check("puis la carte sans marque (a)", carteCourante(e) === "a");
  e = marquer(e, true, T0 + 5000);
  check("tout maîtrisé : fin", phase(e) === "fin");
  check("aller au-delà de la fin : borné", aller(demarrer(["x"]), 5).pos === 0);
}

// ---------------------------------------------------------------------------
console.log("— Temps actif : pauses plafonnées, reprise");
{
  let e = demarrer(["a", "b", "c"], { maintenant: T0 });
  e = marquer(e, true, T0 + 20_000);
  e = marquer(e, true, T0 + 20_000 + 60 * 60_000); // une heure d'absence
  check("une pause d'une heure compte pour PAUSE_MAX", e.actif === 20_000 + PAUSE_MAX);
  e = reprendre(e, T0 + 5 * 3600_000);
  e = marquer(e, false, T0 + 5 * 3600_000 + 7_000);
  check("après reprise : seul le geste compte", e.actif === 20_000 + PAUSE_MAX + 7_000);
  check("une horloge qui recule ne retire rien", marquer(demarrer(["a"], { maintenant: T0 }), true, T0 - 5000).actif === 0);
}

// ---------------------------------------------------------------------------
console.log("— Repère (« tour 2 · carte 4/7 »)");
{
  let e = demarrer(IDS.slice(0, 7), { maintenant: T0 });
  for (let k = 0; k < 7; k++) e = marquer(e, k === 6, T0 + k);
  e = tourSuivant(e, { rng: rng(9) });
  check("tour 2 : 6 cartes", e.file.length === 6);
  e = marquer(marquer(marquer(e, true), false), true);
  check("tour 2 · carte 4/6", eq(repere(e), { tour: 2, rang: 4, total: 6, entracte: false, aRevoir: 1 }));
  let f = demarrer(["a", "b"]);
  f = marquer(marquer(f, false), true);
  check("repère à l'entracte", eq(repere(f), { tour: 1, rang: 2, total: 2, entracte: true, aRevoir: 1 }));
}

// ---------------------------------------------------------------------------
console.log("— Stockage");
{
  const st = memoire();
  let e = demarrer(IDS, { maintenant: T0 });
  e = marquer(marquer(e, true, T0 + 1), false, T0 + 2);
  ecrireBoucle("set-1", e, st);
  check("clé de stockage", st.data.has(cleBoucle("set-1")) && cleBoucle("matiere:fixed_income") === "rl_fc_boucle:matiere:fixed_income");
  const relu = lireBoucle("set-1", IDS, st);
  check("relu à l'identique", eq(relu, e));
  check("autre clé : rien", lireBoucle("set-2", IDS, st) === null);
  effacerBoucle("set-1", st);
  check("effacé", lireBoucle("set-1", IDS, st) === null);
  st.setItem(cleBoucle("x"), "{pas du json");
  check("JSON cassé : null", lireBoucle("x", IDS, st) === null);
  st.setItem(cleBoucle("y"), JSON.stringify({ v: 2, tour: 1 }));
  check("mauvaise version : null", lireBoucle("y", IDS, st) === null);
  st.setItem(cleBoucle("z"), JSON.stringify({ ...e, marques: { c1: "oui" } }));
  check("marques mal formées : null", lireBoucle("z", IDS, st) === null);
  check("valider(null) : null", valider(null) === null && valider(42) === null);
  check("stockage bloqué : lecture null", lireBoucle("set-1", IDS, casse) === null);
  let jete = false;
  try {
    ecrireBoucle("set-1", e, casse);
    effacerBoucle("set-1", casse);
    ecrireMelange(true, casse);
  } catch {
    jete = true;
  }
  check("stockage bloqué : écriture silencieuse", !jete);
  check("pas de stockage (null) : null", lireBoucle("set-1", IDS, null) === null && lireMelange(null) === false);
  check("stockage bloqué : pas de mélange", lireMelange(casse) === false);
  ecrireMelange(true, st);
  check("préférence mélange gardée", lireMelange(st) === true);
  ecrireMelange(false, st);
  check("préférence mélange retirée", lireMelange(st) === false);
  // sans localStorage (Node) : aucune exception
  check("sans localStorage global : null", lireBoucle("set-1", IDS) === null && lireMelange() === false);
}

// ---------------------------------------------------------------------------
console.log("— Réparation (le paquet a changé entre-temps)");
{
  let e = demarrer(["a", "b", "c", "d", "e"], { maintenant: T0 });
  e = marquer(e, true); // a
  e = marquer(e, false); // b
  check("c à l'écran", carteCourante(e) === "c");
  const r1 = reparer(e, ["a", "c", "d", "e", "nouvelle"])!;
  check("carte disparue retirée de la file et des marques", eq(r1.file, ["a", "c", "d", "e"]) && !("b" in r1.marques));
  check("la carte à l'écran reste c", carteCourante(r1) === "c");
  check("les nouvelles cartes n'entrent pas dans la boucle en cours", !r1.file.includes("nouvelle"));
  check("tout a disparu : null", reparer(e, ["zzz"]) === null);
  // la carte à l'écran disparaît
  const r2 = reparer(e, ["a", "b", "d", "e"])!;
  check("carte à l'écran disparue : la suivante sans marque", carteCourante(r2) === "d");
  // la carte à l'écran disparaît et la carte qui prend sa place est déjà marquée
  {
    let g = demarrer(["a", "b", "c", "d", "e"], { maintenant: T0 });
    g = marquer(g, true); // a, b à l'écran
    g = aller(g, 1); // saute vers c
    g = marquer(g, true); // c, d à l'écran
    g = aller(aller(g, -1), -1); // retour sur b
    check("retour sur b", carteCourante(g) === "b");
    const r = reparer(g, ["a", "c", "d", "e"])!;
    check("b disparue : d (sans marque), pas c (déjà marquée)", carteCourante(r) === "d", String(carteCourante(r)));
  }
  // les tailles des tours suivent les cartes disparues
  {
    const r = reparer(demarrer(["a", "b", "c", "d", "e"], { maintenant: T0 }), ["a", "c", "d", "e"])!;
    check("tour 1 : bilan sur 4 cartes", bilan(r).cartes === 4 && eq(r.parcours, [4]));
    let g = demarrer(["a", "b", "c", "d", "e"], { maintenant: T0 });
    g = marquer(marquer(marquer(marquer(marquer(g, true), false), false), false), false); // 1 maîtrisée, 4 à revoir
    g = tourSuivant(g, { rng: () => 0 });
    check("tour 2 sur 4", g.tour === 2 && eq(g.parcours, [5, 4]));
    const r2b = reparer(g, ["a", "c", "d", "e"])!;
    check("tour 2, b disparue : parcours [4, 3]", eq(r2b.parcours, [4, 3]), String(r2b.parcours));
    check("bilan : 4 cartes", bilan(r2b).cartes === 4);
    check("réparer deux fois ne retire rien de plus", eq(reparer(r2b, ["a", "c", "d", "e"])!.parcours, [4, 3]));
  }
  // l'entracte reste un entracte
  let f = demarrer(["a", "b", "c"]);
  f = marquer(marquer(marquer(f, true), false), true);
  const r3 = reparer(f, ["a", "b", "c"])!;
  check("entracte réparé : entracte", phase(r3) === "entracte" && r3.pos === 3);
  // la seule à revoir disparaît : fin
  const r4 = reparer(f, ["a", "c"])!;
  check("la seule à revoir disparue : fin", phase(r4) === "fin");
  // position hors bornes
  const r5 = reparer({ ...e, pos: 99 }, ["a", "b", "c", "d", "e"])!;
  check("position hors bornes ramenée sur une carte sans marque", carteCourante(r5) === "c");
  // via le stockage
  const st = memoire();
  ecrireBoucle("s", e, st);
  const r6 = lireBoucle("s", ["a", "c", "d", "e"], st)!;
  check("lireBoucle répare", eq(r6.file, ["a", "c", "d", "e"]));
}

// ---------------------------------------------------------------------------
console.log("— Boucle complète au hasard (jusqu'à zéro, toujours)");
{
  const r = rng(42);
  let maxTours = 0;
  for (let essai = 0; essai < 200; essai++) {
    const ids = Array.from({ length: 1 + Math.floor(r() * 60) }, (_, i) => `k${i}`);
    let e: EtatBoucle = demarrer(ids, { melanger: r() < 0.5, rng: r, maintenant: T0 });
    let garde = 0;
    while (phase(e) !== "fin" && garde++ < 10_000) {
      if (phase(e) === "entracte") {
        const n = aRevoir(e).length;
        e = tourSuivant(e, { rng: r });
        if (e.file.length !== n) throw new Error("tour suivant : mauvaise taille");
      } else if (r() < 0.1) e = aller(e, r() < 0.5 ? -1 : 1);
      else e = marquer(e, r() < 0.6 + 0.1 * e.tour);
    }
    maxTours = Math.max(maxTours, e.tour);
    if (phase(e) !== "fin") check(`essai ${essai} : la boucle finit`, false);
    if (e.parcours[0] !== ids.length || e.parcours.some((n, i) => i > 0 && n > e.parcours[i - 1])) check(`essai ${essai} : parcours décroissant`, false, String(e.parcours));
  }
  check("200 boucles au hasard finissent à zéro", true, `jusqu'à ${maxTours} tours`);
}

// ---------------------------------------------------------------------------
console.log("— État figé (aperçus)");
{
  const ids = ["c1", "c2", "c3", "c4", "c5"];
  const a = etatFige({ ids, pos: 1 });
  check("recto : carte 2, tour 1", phase(a) === "carte" && carteCourante(a) === "c2");
  const b = etatFige({ ids, marques: { c1: true, c2: false, c3: true, c4: true, c5: false } });
  check("toutes marquées avec des à revoir : entracte", phase(b) === "entracte" && aRevoir(b).length === 2);
  const c = etatFige({ ids, marques: { c1: true, c2: true, c3: true, c4: true, c5: true } });
  check("toutes maîtrisées : fin", phase(c) === "fin");
  const d = etatFige({ ids, tour: 2, file: ["c5", "c2"], marques: { c5: true }, pos: 1 });
  check("tour 2 en cours", d.tour === 2 && carteCourante(d) === "c2" && eq(d.parcours, [5, 2]));
  const f = etatFige({ ids, marques: { c1: true, c2: false }, pos: 2 });
  check("tour 1 entamé : en cours", enCours(f) && carteCourante(f) === "c3");
}

// ---------------------------------------------------------------------------
console.log("— Gras inline (RichText)");
{
  const txt = (s: string) =>
    passagesInline(s)
      .map((p) => (p.gras ? "<b>" : "") + p.morceaux.map((m) => (m.t === "math" ? `[${m.v}]` : m.v)).join("") + (p.gras ? "</b>" : ""))
      .join("");
  check("sans gras", txt("Plain text") === "Plain text");
  check("gras en tête", txt("**Price falls.** Because yields rise.") === "<b>Price falls.</b> Because yields rise.");
  check("gras au milieu", txt("A **callable** bond") === "A <b>callable</b> bond");
  check("formule à côté du gras", txt("**Macaulay duration** is $D_{mac}$ years") === "<b>Macaulay duration</b> is [D_{mac}] years");
  check("formule dans le gras", txt("**Price change ≈ $-D \\times \\Delta y$** (approx.)") === "<b>Price change ≈ [-D \\times \\Delta y]</b> (approx.)");
  check("** dans une formule : LaTeX intact", txt("$a**b$ and **x**") === "[a**b] and <b>x</b>");
  check("** entre deux espaces : littéral", txt("2 ** 3 and **bold**") === "2 ** 3 and <b>bold</b>", txt("2 ** 3 and **bold**"));
  check("** sans partenaire en fin : littéral", txt("**bold** and x**") === "<b>bold</b> and x**", txt("**bold** and x**"));
  check("un seul ** : littéral", txt("a ** b") === "a ** b");
  check("deux passages gras", txt("**A** or **B**") === "<b>A</b> or <b>B</b>");
  check("gras vide ignoré", txt("****x") === "x");
  const p = passagesInline("**$x$**");
  check("formule seule en gras", p.length === 1 && p[0].gras && p[0].morceaux[0].t === "math");
}

console.log("— Surligné inline ==…== (RichText)");
{
  // <m>…</m> : surligné ; <b>…</b> : gras ; [..] : formule
  const txt = (s: string) =>
    passagesInline(s)
      .map((p) => {
        let x = p.morceaux.map((m) => (m.t === "math" ? `[${m.v}]` : m.v)).join("");
        if (p.gras) x = `<b>${x}</b>`;
        if (p.surligne) x = `<m>${x}</m>`;
        return x;
      })
      .join("");
  const t = (label: string, entree: string, attendu: string) => check(label, txt(entree) === attendu, txt(entree));
  t("surligné au milieu", "Indenture = ==contrat issuer ↔ bondholders==", "Indenture = <m>contrat issuer ↔ bondholders</m>");
  t("surligné en tête", "==Price falls== when yields rise", "<m>Price falls</m> when yields rise");
  t("deux surlignés", "==A== or ==B==", "<m>A</m> or <m>B</m>");
  t("formule dans le surligné", "==Duration ≈ $-\\Delta P / P$== en %", "<m>Duration ≈ [-\\Delta P / P]</m> en %");
  t("formule à côté du surligné", "$D$ = ==temps moyen== pondéré", "[D] = <m>temps moyen</m> pondéré");
  t("== dans une formule : LaTeX intact", "$a == b$ et ==x==", "[a == b] et <m>x</m>");
  t("gras et surligné sur la même ligne", "**Callable** : ==plafond de prix==", "<b>Callable</b> : <m>plafond de prix</m>");
  t("gras dans le surligné", "==le **call** price==", "<m>le </m><m><b>call</b></m><m> price</m>");
  t("surligné dans le gras", "**prix ==plafonné==**", "<b>prix </b><m><b>plafonné</b></m>");
  t("== orphelin : littéral", "a ==b", "a ==b");
  t("== sans partenaire en fin : littéral", "==A== puis x==", "<m>A</m> puis x==");
  t("== entre deux espaces : littéral", "x == y et ==z==", "x == y et <m>z</m>");
  t("=== et ==> : littéraux", "a === b ==> c", "a === b ==> c");
  t("!== et <== : littéraux, le surligné reste", "a !== b <== ==c==", "a !== b <== <m>c</m>");
  t("==== : littéral", "====", "====");
  t("** orphelin à côté d'un surligné", "==A== et 2**", "<m>A</m> et 2**");
  const p = passagesInline("==$x$==");
  check("formule seule surlignée", p.length === 1 && p[0].surligne && !p[0].gras && p[0].morceaux[0].t === "math");
  const q = passagesInline("Plain");
  check("texte simple : ni gras ni surligné", q.length === 1 && !q[0].gras && !q[0].surligne);
}

console.log(ko ? `\n${ko} échec(s)` : "\nTout est vert.");
process.exit(ko ? 1 : 0);
