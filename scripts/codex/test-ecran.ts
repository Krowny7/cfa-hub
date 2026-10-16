// Tests légers de ce que l'écran du Codex lit (sans base ni réseau) :
//   npx tsx --tsconfig tsconfig.json scripts/codex/test-ecran.ts
// Vérifie : les identifiants de dévoilement du navigateur (devoile-lite)
// concordent avec DECOUVERTE, la navigation montre ce qu'il faut selon le
// dévoilement, le bilan léger (fanfares, acte, dévoilement), que l'écran
// ne reçoit jamais une quête cachée, le panneau « Tes quêtes » (quatre lignes
// à faire, arcs, « ! » doré, récompenses annoncées une fois, « Une autre
// idée ? », budget) et le réglage du jour avec et sans la §2 (V3 §9.2).
import { DECOUVERTE, ACTES } from "@/lib/codex/catalogue";
import { DEVOILE_DE_L_ESPACE, ID_DEVOILE, devoileLite } from "@/lib/codex/devoile-lite";
import { estDevoile } from "@/lib/codex/moteur";
import { bilanDe } from "@/lib/codex/bilan";
import { readFileSync } from "node:fs";
import { MAX_ARCS, MAX_QUETES, ligneVersees, panneauAcquitte, panneauDe } from "@/lib/codex/panneau";
import { BUDGETS, CAPACITES_VIDE, COLONNES_JOUEUR, COLONNES_V3, budgetParDefaut, ecarter, questionsDes7Jours, reglageDe } from "@/lib/codex/reglage";
import { capacitesDe } from "@/lib/codex/moteur";
import { SPACES, activeSpace } from "@/lib/nav";
import { paletteDeChemin } from "@/lib/palettes";
import { exempleCodex } from "./exemple";
import { vueSansFetes, type VueCodex } from "@/lib/codex/vue";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};

console.log("# devoile-lite concorde avec DECOUVERTE");
check("chaque dévoilement du catalogue a son identifiant côté navigateur", DECOUVERTE.every((d) => ID_DEVOILE[d.quoi] === d.id), DECOUVERTE.filter((d) => ID_DEVOILE[d.quoi] !== d.id).map((d) => d.id).join());
check("devoileLite et estDevoile répondent pareil", DECOUVERTE.every((d) => ["tout", [], [d.id], ["x"]].every((etat) => devoileLite(etat as string[] | "tout", d.quoi) === estDevoile(etat as string[] | "tout", d.quoi))));
check("les trois onglets masquables sont bien dans la table de la navigation", Object.values(DEVOILE_DE_L_ESPACE).every((q) => q && DECOUVERTE.some((d) => d.quoi === q)));

console.log("\n# la navigation");
check("cinq espaces, le Codex en tête", SPACES.length === 5 && SPACES[0].key === "codex");
check("la palette du Codex est « carnet »", paletteDeChemin("/codex")?.key === "carnet");
const visibles = (d: string[] | "tout") => SPACES.filter((s) => s.key === "codex" || s.key === "moi" || !DEVOILE_DE_L_ESPACE[s.key] || devoileLite(d, DEVOILE_DE_L_ESPACE[s.key]!)).map((s) => s.key).join();
check("compte neuf : Codex et Moi seulement", visibles([]) === "codex,moi", visibles([]));
check("après le premier trait : + Réviser", visibles(["reviser", "branches"]) === "codex,reviser,moi");
check("tout dévoilé : les cinq", visibles("tout").split(",").length === 5);

console.log("\n# la vue et le bilan");
for (const sc of ["neuf", "milieu", "fin"] as const) {
  const vue = exempleCodex(sc);
  const b = bilanDe(vue);
  check(`${sc} : la vue est disponible, 10 branches, ${ACTES.length} actes`, vue.disponible && vue.branches.length === 10 && vue.trame.length === ACTES.length);
  const lignes = [...vue.trame.flatMap((a) => a.quetes), ...vue.branches.flatMap((x) => x.etapes), ...vue.longCours.flatMap((c) => c.paliers), ...vue.exploits, ...vue.contrats.map((c) => c.ligne)];
  check(`${sc} : aucune quête cachée dans les exploits montrés`, vue.exploits.every((e) => e.affichage !== "cache"));
  check(`${sc} : toute quête non terminée a une fraction entre 0 et 1`, lignes.every((l) => l.fraction >= 0 && l.fraction <= 1));
  check(`${sc} : le bilan porte la prochaine quête`, !!b.prochaine && b.prochaine.titre.length > 0, b.prochaine?.titre);
}
{
  const b = bilanDe(exempleCodex("milieu"));
  check("milieu : des fanfares à jouer, la plus grande d'abord", b.fetes.length > 0 && b.fetes.every((f, i, t) => i === 0 || t[i - 1].rang <= f.rang));
  const n = bilanDe(exempleCodex("neuf"));
  check("neuf : les contrats du jour restent masqués tant qu'ils ne sont pas dévoilés", n.contrats.length === 0);
  check("milieu : les contrats sont montrés (3)", b.contrats.length === 3, String(b.contrats.length));
}

console.log("\n# le panneau « Tes quêtes » (sceau de la barre du haut, V3 §9.2)");
const GENRES = new Set(["principale", "contrat", "longcours", "fil"]);
for (const sc of ["neuf", "milieu", "fin"] as const) {
  const vue = exempleCodex(sc);
  const pn = panneauDe(vue);
  const genres = pn.quetes.map((q) => q.genre);
  check(`${sc} : ${MAX_QUETES} lignes au plus, sans doublon`, pn.quetes.length <= MAX_QUETES && new Set(pn.quetes.map((q) => q.cle)).size === pn.quetes.length, genres.join());
  check(`${sc} : jamais une ligne « récompense », que des choses à faire`, genres.every((g) => GENRES.has(g)) && pn.quetes.every((q) => q.etat !== "terminee"), genres.join());
  check(`${sc} : ta prochaine quête en tête, une seule`, genres.filter((g) => g === "principale").length <= 1 && (!genres.includes("principale") || genres[0] === "principale"), genres.join());
  check(`${sc} : chaque ligne qui mène quelque part dit « Y aller », un lien interne, une durée`, pn.quetes.every((q) => !q.destination || (q.destination.libelle === "Y aller" && q.destination.href.startsWith("/") && !q.destination.href.includes("undefined") && (q.duree ?? 0) > 0)));
  check(`${sc} : jamais « Quête principale » ni « tu es ici »`, pn.quetes.every((q) => !/Quête principale|tu es ici/.test(`${q.sur} ${q.raison ?? ""}`)));
  check(`${sc} : arcs entre 0 et 3, faits ≤ total`, pn.arcs.total >= 0 && pn.arcs.total <= MAX_ARCS && pn.arcs.faits >= 0 && pn.arcs.faits <= pn.arcs.total, JSON.stringify(pn.arcs));
  const actes = vue.trame.some((a) => a.aFeter);
  check(`${sc} : le « ! » doré seulement pour un acte clos ou une pièce gagnée`, pn.rare === null || (pn.rare.quoi === "acte" ? actes : pn.rare.quoi === "piece" && !!pn.versees), JSON.stringify(pn.rare));
  check(`${sc} : jamais un sceau du profil dans les récompenses annoncées`, (pn.versees?.cles ?? []).every((k) => !k.startsWith("exploit:sceau:")));
  check(`${sc} : budget du jour parmi 15/30/60/90`, pn.budget !== null && BUDGETS.includes(pn.budget), String(pn.budget));
}
{
  const n = panneauDe(exempleCodex("neuf"));
  check("neuf : pas de contrat ni d'arc tant que les contrats ne sont pas dévoilés", n.quetes.every((q) => q.genre !== "contrat") && n.arcs.total === 0);
  check("neuf : au calme (rien de rare, rien d'annoncé)", n.rare === null && n.versees === null);
  const m = panneauDe(exempleCodex("milieu"));
  check("milieu : trois arcs (les contrats du jour)", m.arcs.total === 3, JSON.stringify(m.arcs));
  check("milieu : la ligne des récompenses versées", !!m.versees && m.versees.n > 0 && m.versees.xp > 0 && ligneVersees(m.versees).startsWith(`${m.versees.n} quête`) && ligneVersees(m.versees).includes(" tamponnée") && ligneVersees(m.versees).endsWith(" XP"), m.versees ? ligneVersees(m.versees) : "");
  check("ligne des récompenses : singulier, titre", ligneVersees({ n: 1, xp: 40, cles: ["x"], titre: "Garzone" }) === "1 quête tamponnée · +40 XP · titre Garzone");
  check("la semaine : faits ≤ total, une ligne par contrat", m.semaine.faits <= m.semaine.total && m.semaine.quetes.length === m.semaine.total);
  check("vue indisponible : panneau vide", !panneauDe({ ...exempleCodex("milieu"), disponible: false }).disponible);
  const trois = panneauDe({ ...exempleCodex("milieu"), trio: { ...exempleCodex("milieu").trio, faits: 3, total: 3, fait: true } });
  check("3 sur 3 : l'anneau est fermé (arcs pleins)", trois.arcs.faits === 3 && trois.arcs.total === 3);
  const vm = exempleCodex("milieu");
  const ct = vm.contrats.find((c) => c.ligne.etat !== "terminee");
  if (ct && vm.prochaine) {
    const pc = panneauDe({ ...vm, prochaine: { ...vm.prochaine, ligne: ct.ligne } });
    check("un contrat recommandé : en tête, une seule fois, il garde son « Changer »", pc.quetes[0].genre === "principale" && pc.quetes[0].emplacement === ct.emplacement && pc.quetes[0].changeable === ct.changeable && pc.quetes.filter((q) => q.cle === pc.quetes[0].cle).length === 1);
  }
  check("chaque contrat changeable du panneau porte son emplacement (« Changer » par contrat)", m.quetes.filter((q) => q.genre === "contrat").every((q) => !!q.emplacement && typeof q.changeable === "boolean"));
}

console.log("\n# les récompenses versées s'annoncent une fois (acquittées à l'ouverture)");
{
  const vue = exempleCodex("milieu");
  const lignesDe = (v: typeof vue) => [...v.trame.flatMap((a) => a.quetes), ...v.branches.flatMap((x) => x.etapes), ...v.longCours.flatMap((c) => c.paliers), ...v.exploits, ...v.contrats.map((c) => c.ligne), ...v.hebdo];
  const pn = panneauDe(vue);
  check("milieu : des récompenses à annoncer", !!pn.versees && pn.versees.cles.length > 0);
  const apres = panneauDe(vueSansFetes(vue, pn.versees?.cles ?? []));
  check("acquittées (codexVus(cles)) : la ligne disparaît à la réouverture, le « ! » doré aussi", apres.versees === null && apres.rare === null, JSON.stringify(apres.versees));
  check("et les quêtes à faire restent les mêmes", JSON.stringify(apres.quetes.map((q) => q.cle)) === JSON.stringify(pn.quetes.map((q) => q.cle)));
  check("panneauAcquitte : plus rien à annoncer, le reste intact", panneauAcquitte(pn).versees === null && panneauAcquitte(pn).rare === null && panneauAcquitte(pn).quetes === pn.quetes);
  const toutes = vueSansFetes(vue, lignesDe(vue).filter((l) => l.aFeter).map((l) => l.id));
  check("toutes jouées : plus rien à fêter, le bilan ne garde que les actes", lignesDe(toutes).every((l) => !l.aFeter) && bilanDe(toutes).fetes.every((f) => f.famille === "acte") && toutes.branches.length === vue.branches.length);
  const actes = vue.trame.filter((a) => a.aFeter).map((a) => `acte:${a.acte.id}`);
  check("un id « acte:… » éteint la fanfare de l'acte", vueSansFetes(vue, actes).trame.every((a) => !a.aFeter));
  const avecActe = { ...vue, trame: vue.trame.map((a, i) => (i === 1 ? { ...a, aFeter: true } : a)) };
  const pa = panneauDe(avecActe);
  check("un acte clos à fêter : « ! » doré (acte) et sa clé dans les annonces", pa.rare?.quoi === "acte" && !!pa.versees?.cles.includes(`acte:${vue.trame[1].acte.id}`), JSON.stringify(pa.rare));
}

console.log("\n# « Une autre idée ? » et « J'ai … min »");
{
  const vue = exempleCodex("milieu");
  const p = vue.prochaine!;
  const autre = exempleCodex("milieu", { ecartees: [p.quete.id] });
  check("la quête écartée n'est plus proposée aujourd'hui", !!autre.prochaine && autre.prochaine.quete.id !== p.quete.id, `${p.quete.id} → ${autre.prochaine?.quete.id}`);
  const lignes = [...autre.trame.flatMap((a) => a.quetes), ...autre.branches.flatMap((x) => x.etapes), ...autre.longCours.flatMap((c) => c.paliers), ...autre.contrats.map((c) => c.ligne)];
  check("elle reste dans l'arbre", lignes.some((l) => l.id === p.quete.id));
  const court = exempleCodex("milieu", { budget: 15 });
  const long = exempleCodex("milieu", { budget: 90 });
  const duree = (v: VueCodex) => v.prochaine?.ligne.destination?.duree ?? 0;
  check("budget choisi : il est celui du panneau", panneauDe(court).budget === 15 && panneauDe(long).budget === 90);
  check("budget 15 : la prochaine quête n'est pas plus longue qu'avec 90", duree(court) <= duree(long) || duree(court) <= 15, `${duree(court)} / ${duree(long)}`);
  check("budget par défaut : 30 sans historique", budgetParDefaut([]) === 30);
  check("budget par défaut : 12 questions par jour → 15 min", budgetParDefaut([10, 12, 14]) === 15);
  check("budget par défaut : 50 par jour → 60 min ; 80 → 90 min", budgetParDefaut([50, 50, 50]) === 60 && budgetParDefaut([80, 80]) === 90);
  check("budget par défaut : les 7 derniers jours actifs, jours vides ignorés", budgetParDefaut([0, 0, 25, 25, 25]) === 30 && JSON.stringify(questionsDes7Jours([{ jour: "2026-10-02", n: 5 }, { jour: "2026-10-01", n: 0 }, { jour: "2026-10-03", n: 9 }])) === "[5,9]");
}

console.log("\n# le réglage du jour, avec et sans la §2 (migration_codex_v3.sql)");
{
  const J = "2026-10-16";
  const meta = { rl_codex_jour: { jour: J, budget: 60, ecartees: ["trame:a2:fiche"] }, rl_codex: { capacites_vues: { fil: true, journal: 3 } } };
  const sans = reglageDe({ ligne: null, absente: true }, meta, J);
  check("sans §2 : le budget et les quêtes écartées viennent du compte", sans.ou === "compte" && sans.budget === 60 && JSON.stringify(sans.ecartees) === '["trame:a2:fiche"]' && sans.capacitesVues?.fil === true && sans.capacitesVues.journal === 3);
  check("sans §2 : le lendemain, tout revient", reglageDe({ ligne: null, absente: true }, meta, "2026-10-17").budget === null && reglageDe({ ligne: null, absente: true }, meta, "2026-10-17").ecartees.length === 0);
  const avec = reglageDe({ ligne: { budget_min: 90, budget_jour: J, ecartees: { jour: J, ids: ["a", 3, "b"] }, capacites_vues: null }, absente: false }, meta, J);
  check("avec §2 : la ligne prime sur le compte (valeurs invalides écartées)", avec.ou === "base" && avec.budget === 90 && JSON.stringify(avec.ecartees) === '["a","b"]' && avec.capacitesVues === null);
  check("avec §2 : un budget d'un autre jour ne vaut plus", reglageDe({ ligne: { budget_min: 90, budget_jour: "2026-10-15", ecartees: null, capacites_vues: null }, absente: false }, meta, J).budget === null);
  check("avec §2, pas encore de ligne : rien de réglé", reglageDe({ ligne: null, absente: false }, meta, J).budget === null);
  check("écarter : sans doublon, 30 au plus", JSON.stringify(ecarter({ ...sans, ecartees: ["a", "b"] }, "a")) === '["b","a"]' && ecarter({ ...sans, ecartees: Array.from({ length: 30 }, (_, i) => `q${i}`) }, "z").length === 30);
  check("la lecture principale de codex_joueur ne lit aucune colonne v3", !COLONNES_V3.split(",").some((c) => COLONNES_JOUEUR.includes(c)));
  const src = readFileSync("lib/codex/serveur.ts", "utf8");
  check("serveur.ts : codex_joueur lu par COLONNES_JOUEUR, les colonnes v3 par une requête à part", src.includes(`from("codex_joueur").select(COLONNES_JOUEUR)`) && src.includes(`from("codex_joueur").select(COLONNES_V3)`) && !/select\("[^"]*budget_min/.test(src));
  check("capacités : toutes fausses par défaut, journal 2", Object.entries(CAPACITES_VIDE).every(([k, v]) => (k === "journal" ? v === 2 : v === false)) && capacitesDe({}) === CAPACITES_VIDE);
}

console.log("\n# la navigation : les pages nouvelles allument leur onglet");
check("/eclair dans « S'entraîner », comme /defi", activeSpace("/eclair") === "entrainer" && activeSpace("/defi") === "entrainer");
check("/revoir dans « Moi », comme le carnet", activeSpace("/revoir") === "moi" && activeSpace("/moi") === "moi");

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
