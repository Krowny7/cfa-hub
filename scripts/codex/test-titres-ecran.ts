// Les titres clairs BRANCHÉS (Codex simplifié, lot d'intégration), sans base :
//   npx tsx --tsconfig tsconfig.json scripts/codex/test-titres-ecran.ts
// Vérifie que l'écran reçoit le titre clair partout où un titre de quête ou
// d'acte s'affiche (la vue, le panneau, la séance, « À récupérer », le bilan,
// la recherche de la carte et Ctrl K sur les deux noms), que les noms imagés
// restent aux exploits et aux pièces, que l'accueil ne montre rien du Codex,
// que le Codex a quitté la barre des espaces et qu'on y arrive par Moi et le
// panneau du sceau.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ACTES, CHAINES, catalogueCodex } from "@/lib/codex/catalogue";
import { CHAPITRES_FIL } from "@/lib/codex/fil-rouge";
import { chercher, quetesDeLaCarte } from "@/lib/codex/carte";
import { panneauDe } from "@/lib/codex/panneau";
import { bilanDe } from "@/lib/codex/bilan";
import { TITRES_CHAINES, TITRES_CHAPITRES_FIL, TITRE_MAX, butActe, enigmeClaire, titreActe, titreClair } from "@/lib/codex/titres-clairs";
import { depuisStockage } from "@/lib/codex/seance";
import type { LigneQuete, VueCodex } from "@/lib/codex/vue";
import { exempleCodex } from "./exemple";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const J = (x: unknown) => JSON.stringify(x);

/** Les mots bannis des titres (proposition §4.5 ; trait, rature et jour d'encre gardés). */
const BANNIS = [
  "bottega", "garzone", "pigments?", "couleurs?", "pots?", "palettes?", "tableaux?", "compas", "cercles?", "vélins?", "grattoirs?",
  "commandes?", "mécènes?", "guildes?", "coups? de pinceau", "tamponné(?:e|es|s)?", "scell(?:er|e|es|é|ée|ées|és)", "sèches?",
  "retouches?", "fuites?", "cap", "chantiers?", "contrats?", "paliers?", "carnets?",
].map((b) => new RegExp(`(?:^|[^\\p{L}])(${b})(?:$|[^\\p{L}])`, "iu"));
const banni = (t: string): string | null => {
  for (const r of BANNIS) {
    const m = r.exec(t);
    if (m) return m[1];
  }
  return null;
};

const CATALOGUE = new Map(catalogueCodex().map((q) => [q.id, q]));

/** Toutes les lignes de quête qu'un écran peut afficher. */
function lignes(v: VueCodex): LigneQuete[] {
  return [
    ...v.trame.flatMap((a) => a.quetes),
    ...v.contrats.map((c) => c.ligne),
    ...v.hebdo,
    ...(v.debrief ? [v.debrief] : []),
    ...v.branches.flatMap((b) => b.etapes),
    ...v.longCours.flatMap((c) => c.paliers),
    ...v.filRouge.chapitres.flatMap((c) => [c.courant, c.suivant].filter((x): x is LigneQuete => !!x)),
    ...v.exploits,
  ];
}

for (const sc of ["neuf", "milieu", "fin"] as const) {
  console.log(`\n# la vue (${sc})`);
  const v = exempleCodex(sc, { devoile: "tout" });
  const toutes = lignes(v).filter((l) => l.affichage !== "cache");

  const imagees = toutes.filter((l) => l.famille !== "exploit" && !l.gelee && banni(l.titre));
  check("aucune ligne de quête n'a de mot banni dans son titre (hors exploits)", imagees.length === 0, J(imagees.slice(0, 5).map((l) => `${l.id} : ${l.titre}`)));
  const consignes = toutes.filter((l) => l.famille !== "exploit" && banni(l.consigne));
  check("aucune consigne de quête n'a de mot banni (hors exploits)", consignes.length === 0, J(consignes.slice(0, 5).map((l) => `${l.id} : ${l.consigne}`)));
  const longues = toutes.filter((l) => l.famille !== "exploit" && l.titre.length > TITRE_MAX);
  check(`aucun titre de quête au-delà de ${TITRE_MAX} caractères (hors exploits)`, longues.length === 0, J(longues.slice(0, 5).map((l) => `${l.id} : ${l.titre}`)));

  const fixes = toutes.filter((l) => CATALOGUE.has(l.id) && l.famille !== "exploit");
  const pasClaires = fixes.filter((l) => l.titre !== titreClair(CATALOGUE.get(l.id)!));
  check("chaque ligne porte le titre clair de sa quête", pasClaires.length === 0, J(pasClaires.slice(0, 5).map((l) => `${l.id} : ${l.titre}`)));
  const sansCatalogue = fixes.filter((l) => l.titre !== CATALOGUE.get(l.id)!.titre && l.titreCatalogue !== CATALOGUE.get(l.id)!.titre);
  check("le titre du catalogue suit la ligne quand il diffère (recherche sur les deux noms)", sansCatalogue.length === 0, J(sansCatalogue.slice(0, 3).map((l) => l.id)));

  const exploits = v.exploits.filter((l) => l.affichage !== "cache");
  check("les exploits gardent leur nom imagé", exploits.every((l) => l.titre === CATALOGUE.get(l.id)?.titre), J(exploits.map((l) => l.titre)));
  check("l'énigme d'un exploit se lit en clair", exploits.filter((l) => l.indice).every((l) => l.indice === enigmeClaire(CATALOGUE.get(l.id)!)));

  check("les actes : titre et but clairs", v.trame.every((a) => {
    const c = ACTES.find((x) => x.id === a.acte.id);
    return !!c && a.acte.titre === titreActe(c) && a.acte.but === butActe(c) && !banni(a.acte.titre);
  }), J(v.trame.map((a) => a.acte.titre)));
  check("les objectifs longs : noms clairs", v.longCours.every((c) => c.chaine.titre === (TITRES_CHAINES[c.chaine.id] ?? CHAINES.find((x) => x.id === c.chaine.id)?.titre)), J(v.longCours.map((c) => c.chaine.titre)));
  check("le fil rouge : chapitres en clair", v.filRouge.chapitres.every((c) => c.titre === (TITRES_CHAPITRES_FIL[c.id] ?? CHAPITRES_FIL.find((x) => x.id === c.id)?.titre)), J(v.filRouge.chapitres.map((c) => c.titre)));

  const miroirs = toutes.filter((l) => l.compteeAvec);
  check("un miroir dit avec quelle quête il compte, sous son titre clair", miroirs.every((l) => !CATALOGUE.has(l.compteeAvec!.id) || l.compteeAvec!.titre === titreClair(CATALOGUE.get(l.compteeAvec!.id)!)), J(miroirs.map((l) => l.compteeAvec)));
  const manques = toutes.flatMap((l) => l.manque ?? []).filter((m) => m.startsWith("D'abord"));
  check("« D'abord : « … » » nomme la quête en clair", manques.every((m) => !banni(m)), J(manques.slice(0, 3)));

  // la séance (le fil, le panneau « La suite », la fin d'outil)
  const blocs = v.seance?.blocs ?? [];
  check("la séance : des étapes aux titres clairs (ni « Retouches », ni « Ce qui coince »…)", blocs.every((b) => !banni(b.titre) && !["Retouches", "Ce qui coince", "Du neuf", "L'épreuve"].includes(b.titre)), J(blocs.map((b) => b.titre)));
  const p = panneauDe(v);
  check("le panneau : « La suite » et « À récupérer » sans titre imagé", (!p.seance?.suivant || !banni(p.seance.suivant.titre)) && p.recuperer.items.every((x) => !banni(x.titre)), J([p.seance?.suivant?.titre, p.recuperer.items.map((x) => x.titre)]));
  check("« À récupérer » et « Fait aujourd'hui » : titres clairs", [...v.aRecuperer, ...v.faitAujourdhui.quetes].every((x) => !banni(x.titre) || x.quete.startsWith("exploit:")), J(v.aRecuperer.map((x) => x.titre)));
  const b = bilanDe(v);
  check("la fin d'outil : « La suite » en clair", !b.suite || !banni(b.suite.titre), J(b.suite));
}

console.log("\n# la recherche de la carte, sur les deux noms");
{
  const v = exempleCodex("milieu", { devoile: "tout" });
  const items = quetesDeLaCarte(v);
  const l = items.find((x) => x.titreCatalogue && x.famille === "trame");
  check("une quête de la trame a un titre clair différent de celui du catalogue", !!l, J(l));
  if (l) {
    check("on la trouve par son titre clair", chercher(items, l.titre, Infinity).some((x) => x.id === l.id), l.titre);
    check("on la trouve par son titre du catalogue", chercher(items, l.titreCatalogue!, Infinity).some((x) => x.id === l.id), l.titreCatalogue);
  }
  check("« Corriger 20 ratures » se trouve par « ratures »", chercher(items, "ratures", Infinity).some((x) => x.id === "trame:a3:ratures"));
  const cp = readFileSync("components/nav/CommandPalette.tsx", "utf8");
  check("Ctrl K : les quêtes affichées sous leur titre clair, cherchées sur les deux noms", cp.includes("clairs.titreClair(q)") && cp.includes("titreCatalogue: q.titre") && cp.includes('"/codex"'));
}

console.log("\n# une séance gardée avant la mise en ligne se relit en clair");
{
  const relus = depuisStockage([
    { genre: "retouches", titre: "Retouches", duree: 14, raison: "x", href: "/revoir", outil: "revoir", n: 14 },
    { genre: "coince", titre: "Ce qui coince", duree: 25, raison: "x", href: "/practice?topic=fsa", outil: "ciblee", matiere: "fsa" },
    { genre: "epreuve", titre: "L'épreuve", duree: 40, raison: "x", href: "/defi", outil: "trente" },
  ]);
  check("« Retouches » → « Corriger 14 ratures », « Ce qui coince » → « Renforcer FSA », « L'épreuve » → les 30 chronométrés",
    J(relus.map((x) => x.titre)) === J(["Corriger 14 ratures", "Renforcer FSA", "Les 30 du jour, chronométrés"]), J(relus.map((x) => x.titre)));
}

console.log("\n# l'accueil, la barre, Moi");
{
  const fichiers = ["app/dashboard/page.tsx", "components/DashboardView.tsx", ...readdirSync("components/accueil").filter((f) => /\.tsx?$/.test(f)).map((f) => join("components/accueil", f))];
  const avecCodex = fichiers.filter((f) => /from "@\/(lib|components)\/codex\//.test(readFileSync(f, "utf8")));
  check("l'accueil n'importe rien du Codex", avecCodex.length === 0, J(avecCodex));
  check("les composants du Codex de l'accueil sont retirés", !existsSync("components/codex/SeanceAccueil.tsx") && !existsSync("components/codex/CodexAccueil.tsx"));
  const nav = readFileSync("lib/nav.ts", "utf8");
  check("le Codex n'est plus un espace de la barre", !/key:\s*"codex"/.test(nav), "lib/nav.ts");
  const bas = readFileSync("components/MobileBottomNav.tsx", "utf8");
  check("la barre du bas n'a pas d'onglet Codex", !/href:\s*"\/codex"/.test(bas) && !/"\/codex"/.test(bas));
  check("le panneau du sceau garde « Ouvrir le Codex »", readFileSync("components/codex/SceauQuetes.tsx", "utf8").includes('"/codex"'));
  const moi = readFileSync("components/moi/CodexMoi.tsx", "utf8");
  check("Moi a sa tuile Codex, avec le lien vers /codex", moi.includes('"/codex"') && moi.includes("moi-codex"));
}

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
