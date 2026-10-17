// Tests légers de ce que l'écran du Codex lit (sans base ni réseau) :
//   npx tsx --tsconfig tsconfig.json scripts/codex/test-ecran.ts
// Vérifie : les identifiants de dévoilement du navigateur (devoile-lite)
// concordent avec DECOUVERTE, la navigation montre ce qu'il faut selon le
// dévoilement, le bilan léger (fanfares, acte, dévoilement), que l'écran
// ne reçoit jamais une quête cachée, le panneau « Tes quêtes » (quatre lignes
// à faire, arcs, « ! » doré, récompenses annoncées une fois, « Une autre
// idée ? », budget) et le réglage du jour avec et sans la §2 (V3 §9.2) ; le
// cap en tête de /codex (préparation, fuites, mesure provisoire, V3 §4.6) ;
// le calendrier (V3 §7) : un cas par moment (J-8, J-7, J-3, J-0, J+1, J+10,
// sans date), la veillée à un seul contrat, la malle, le récap du lendemain ;
// la carte en trois niveaux (V3 §10.1) : niveaux par échelle, texte masqué
// sous 12 px, encre qui pâlit, encre sèche, glyphes, filtres, recherche, ce
// qui manque à une quête verrouillée, pastilles et notions, segments du
// téléphone, palette.
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
import { CASES_MALLE, MALLE_PRETE, QUETE_VEILLE, cochesValides, dateLongue, lireMalle, momentDe, recapDe, tamponsVeillee, texteRecap } from "@/lib/codex/calendrier";
import { DUREE_VEILLEE, LECTURE_VIDE, emplacementsDe, tirerContrats, type Entree } from "@/lib/codex/moteur";
import { MODELES_CONTRATS } from "@/lib/codex/catalogue";
import { decaleJour } from "@/lib/objectif-calc";
import { TEXTES_CAP, aideMatiereCap, capDe, enTeteCap, fraicheurDe, fuites, gainPreparation, ligneFuites, ligneMatiereCap, maitriseDuCodex, pctCap, preparationDe, titreFuites, zoneDe, type MaitriseMatiere } from "@/lib/codex/cap";
import * as MAITRISE_UNIQUE from "@/lib/maitrise";
import * as CAP from "@/lib/codex/cap";
import { ECHELLES, FILTRES, SEGMENTS_TEL, chercher, etatNotion, garde, glypheEtape, lisible, matieresFaibles, niveauDe, normaliser, opaciteFraicheur, pastilleDe, premiereBlanche, quetesDeLaCarte, segmentDe, seche, taillesCachees } from "@/lib/codex/carte";
import { manqueDe } from "@/lib/codex/vue";
import type { EtatQuete } from "@/lib/codex/moteur";

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
  // V3 §1.5 : plus aucune chaîne à proposer → le palier du fil rouge le plus avancé, s'il s'écrit déjà
  const vf = exempleCodex("fin");
  const fil = panneauDe({ ...vf, longCours: [] }).quetes.filter((q) => q.genre === "fil");
  check("chaînes toutes finies : le fil rouge prend la place du long cours (un palier, « Le fil rouge · … », lançable)", fil.length === 1 && fil[0].id.startsWith("fil:") && fil[0].sur.startsWith("Le fil rouge · ") && !!fil[0].destination, JSON.stringify(fil.map((q) => [q.id, q.sur])));
  check("une chaîne en cours : pas de fil rouge dans le panneau", !panneauDe(vf).quetes.some((q) => q.genre === "fil"));
  check("fil rouge « à venir » (la base ne l'écrit pas encore) : jamais dans le panneau", !panneauDe({ ...exempleCodex("milieu"), longCours: [] }).quetes.some((q) => q.genre === "fil"));
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

console.log("\n# le cap en tête de /codex (V3 §4.6, §4.7)");
{
  const mm = (cle: string, poids: number, pct: number | null, statut: MaitriseMatiere["statut"], o: Partial<MaitriseMatiere> = {}): MaitriseMatiere =>
    ({ cle, nom: cle, court: cle.toUpperCase(), poids, pct, n: statut === "mesuree" ? 60 : statut === "provisoire" ? 23 : 0, total: 0, statut, derniere: null, debut: null, ancienne: null, zone: zoneDe(pct), ...o });
  // dix matières, 100 points de poids : trois fuites nettes, une matière au repère
  const ms = [mm("fsa", 13, 45, "mesuree"), mm("equity", 12, 50, "mesuree"), mm("ethics", 15, 57, "provisoire"), mm("quant", 8, 70, "mesuree"), mm("economics", 8, 66, "mesuree"),
    mm("corporate", 8, 65, "mesuree"), mm("fixed_income", 11, 62, "mesuree"), mm("derivatives", 6, null, "non_mesuree"), mm("alternatives", 7, 68, "mesuree"), mm("portfolio", 12, 69, "mesuree")];
  const prep = preparationDe(ms);
  const attendu = Math.round(ms.reduce((s, m) => s + m.poids * (m.pct ?? 0), 0) / 100);
  check("la préparation : Σ poids × pct / Σ poids, les non mesurées à 0", prep === attendu, String(prep));
  const f = fuites(ms);
  check("les fuites : (poids / Σ poids) × (70 − pct), au dixième, trois au plus, les plus fortes d'abord", JSON.stringify(f.map((x) => [x.cle, x.points])) === JSON.stringify([["derivatives", 4.2], ["fsa", 3.3], ["equity", 2.4]]), JSON.stringify(f));
  check("… une matière non mesurée fuit de tout son poids (Derivatives, 6 % : 4,2 pts)", f[0].cle === "derivatives");
  check("… une matière au repère ne fuit pas", !fuites(ms, 10).some((x) => x.cle === "quant"));
  check("le gain d'une quête de maîtrise : au dixième, rien au-dessus du seuil", gainPreparation(ms[0], 60, ms) === 2 && gainPreparation(ms[3], 60, ms) === 0);
  check("les zones : basse sous 50, moyenne jusqu'à 69, haute à 70", zoneDe(49) === "basse" && zoneDe(50) === "moyenne" && zoneDe(69) === "moyenne" && zoneDe(70) === "haute" && zoneDe(null) === null);

  const vise: string[] = [];
  const cap = capDe({ matieres: ms, preparation: prep, couverture: 77, source: "unique" }, { jour: "2026-10-16", joursAvant: 27, destination: (m) => (vise.push(m), { href: `/practice?topic=${m}&n=20`, libelle: "Y aller", duree: 25, raison: null, outil: "ciblee" }) });
  check("l'en-tête : « J-27 · Préparation n % · zone … · repère 70 % »", enTeteCap(cap) === `J-27 · Préparation ${prep} % · ${TEXTES_CAP.zone[cap.zone]} · repère 70 %`, enTeteCap(cap));
  check("… sans J-n sans jour J (ou un programme sans examen) ; « Jour J » le jour même", !enTeteCap({ ...cap, joursAvant: null }).includes("J-") && enTeteCap({ ...cap, joursAvant: 0 }).startsWith("Jour J ·") && !enTeteCap({ ...cap, joursAvant: -3 }).includes("J"));
  check("la ligne des fuites : l'unité une fois, après la première", ligneFuites(cap.fuites) === "DERIVATIVES −4,2 pts · FSA −3,3 · EQUITY −2,4" && titreFuites(3) === "Les trois fuites :" && titreFuites(1) === "La fuite :", ligneFuites(cap.fuites));
  check("« Y aller » : la première fuite", vise.join() === "derivatives" && cap.destination?.href === "/practice?topic=derivatives&n=20");
  check("la règle : un segment par matière, larges comme leur poids (100 % en tout)", cap.matieres.length === 10 && Math.abs(cap.matieres.reduce((s, m) => s + m.part, 0) - 100) < 1e-9);
  check("mesure unique : pas de « mesure provisoire »", !cap.provisoire && capDe({ matieres: ms, preparation: prep, couverture: 0, source: "ancienne" }, { jour: "2026-10-16", joursAvant: null, destination: () => null }).provisoire);
  const eth = cap.matieres.find((m) => m.cle === "ethics")!;
  check("une matière provisoire : « ≈ 57 % », l'infobulle « provisoire · 23 réponses sur 40 »", pctCap(eth) === "≈ 57 %" && aideMatiereCap(eth) === "provisoire · 23 réponses sur 40");
  check("une matière non mesurée : « pas encore mesurée », sans zone", ligneMatiereCap(cap.matieres.find((m) => m.cle === "derivatives")!) === "DERIVATIVES · pas encore mesurée");
  check("la fraîcheur : aujourd'hui, hier, il y a n j (jour de Paris), inconnue sans date",
    fraicheurDe("2026-10-16T22:30:00Z", "2026-10-17") === "aujourd'hui" && fraicheurDe("2026-10-16T08:00:00Z", "2026-10-17") === "hier" && fraicheurDe("2026-10-05T08:00:00Z", "2026-10-17") === "il y a 12 j" && fraicheurDe(null, "2026-10-17") === null);
  check("une ligne du détail : « FSA · 45 % · zone basse · touchée il y a 12 j »", ligneMatiereCap({ ...cap.matieres[0], fraicheur: fraicheurDe("2026-10-04T08:00:00Z", "2026-10-16") }) === "FSA · 45 % · zone basse · touchée il y a 12 j");
  check("aucune fuite : une phrase, pas de « Y aller »", capDe({ matieres: ms.map((m) => ({ ...m, pct: 80, statut: "mesuree" as const })), preparation: 80, couverture: 100, source: "unique" }, { jour: "2026-10-16", joursAvant: 20, destination: () => ({ href: "/x", libelle: "Y aller", duree: 1, raison: null, outil: "ciblee" }) }).destination === null);

  // la maîtrise du Codex : unique si la base la rend, sinon l'ancienne (« provisoire »)
  const contenu = exempleCodex("milieu").branches.map((b) => b.contenu);
  const ancienne = maitriseDuCodex(contenu, { maitrise: { fsa: { pct: 64, questions: 41, debut: null }, quant: { pct: 50, questions: 12, debut: null } } });
  check("repli (ancienne mesure) : mesurée à 40 questions, provisoire dès 5, source « ancienne »", ancienne.source === "ancienne" && ancienne.matieres.find((m) => m.cle === "fsa")?.statut === "mesuree" && ancienne.matieres.find((m) => m.cle === "quant")?.statut === "provisoire" && ancienne.matieres.find((m) => m.cle === "ethics")?.statut === "non_mesuree");
  const uni = maitriseDuCodex(contenu, { maitrise: { fsa: { pct: 64, questions: 41, debut: null } }, maitrise_unique: { quant: { pct: 52, questions: 23, total: 23, debut: null, statut: "provisoire", derniere: "2026-10-10T10:00:00Z", ancienne: 48 } } });
  check("maîtrise unique : elle passe devant ; une matière absente n'est pas mesurée", uni.source === "unique" && uni.matieres.find((m) => m.cle === "quant")?.pct === 52 && uni.matieres.find((m) => m.cle === "fsa")?.statut === "non_mesuree");

  // la vue d'exemple (codex_lire seul, sans codex_mesures_v3) : le cap est là, en mesure provisoire
  for (const sc of ["neuf", "milieu", "fin"] as const) {
    const v = exempleCodex(sc);
    check(`${sc} : le cap en tête, sur l'ancienne mesure (« mesure provisoire »), le J-n du joueur`, !!v.cap && v.cap.provisoire && v.cap.matieres.length === 10 && v.cap.joursAvant === v.joursAvant);
  }
  const m = exempleCodex("milieu").cap!;
  check("milieu : trois fuites et « Y aller » vers ce qui coince dans la première", m.fuites.length === 3 && !!m.destination && m.destination.href.startsWith("/") && m.destination.libelle === "Y aller", m.destination?.href);
}

console.log("\n# la file « À revoir » et le débrief dans le panneau");
{
  const v = exempleCodex("milieu");
  check("repli : la file vient des ratures en cours (14), rien pour demain", JSON.stringify(v.revoir) === JSON.stringify({ aujourdhui: 14, demain: 0 }) && JSON.stringify(panneauDe(v).revoir) === JSON.stringify(v.revoir));
  check("sans débrief en attente : rien dans la vue", v.debrief === null);
  const u = exempleCodex("milieu", { unique: true });
  check("avec revisions_dues : sa file (12, demain 9), portée par le panneau", JSON.stringify(panneauDe(u).revoir) === JSON.stringify({ aujourdhui: 12, demain: 9 }));
  check("avec la maîtrise unique : le cap n'est plus provisoire, les matières disent leur fraîcheur", !!u.cap && !u.cap.provisoire && u.cap.matieres.every((m) => !!m.fraicheur) && u.cap.matieres.some((m) => m.statut === "provisoire"));
}

console.log("\n# le calendrier (V3 §7) : un cas par moment");
{
  const J = "2026-10-16";
  const v = (n: number | null) => exempleCodex("milieu", { jourJ: n === null ? null : decaleJour(J, n) });
  const lignes = (x: VueCodex) => [...x.trame.flatMap((a) => a.quetes), ...x.contrats.map((c) => c.ligne)];

  const j8 = v(8);
  check("J-8 : le cours ordinaire (répétition), trois contrats, ni tampons, ni malle, ni récap", j8.moment === "courant" && j8.phase === "repetition" && j8.contrats.length === 3 && !j8.tampons && !j8.malle && !j8.recap, `${j8.moment} · ${j8.contrats.length}`);

  const j7 = v(7);
  const pn7 = panneauDe(j7);
  check("J-7 : la veillée, sept tampons de J-7 à J-1, aujourd'hui le premier, les autres à venir", j7.moment === "veillee" && j7.tampons?.length === 7 && j7.tampons[0].aujourdhui && j7.tampons.slice(1).every((t) => t.aVenir && !t.encre) && j7.tampons[6].jour === decaleJour(J, 6), JSON.stringify(j7.tampons?.map((t) => t.jour)));
  check("J-7 : un seul contrat, l'entretien, 15 min au plus ; un seul arc autour du sceau", j7.contrats.length <= 1 && j7.contrats.every((c) => c.emplacement === "entretien" && (c.ligne.duree ?? 0) <= DUREE_VEILLEE) && pn7.arcs.total <= 1, JSON.stringify(j7.contrats.map((c) => [c.emplacement, c.ligne.duree])));
  check("J-7 : pas de compte à rebours dans la raison de la prochaine quête", !/Plus que/.test(j7.prochaine?.pourquoi ?? ""), j7.prochaine?.pourquoi);
  check("J-7 : aucune chaîne au long cours à entamer n'est proposée", !(j7.prochaine?.quete.chaine && (j7.prochaine.quete.palier ?? 1) <= 1 && j7.prochaine.avancee === 0));

  const j3 = v(3);
  check("J-3 : la malle (vide), « La veille » ouverte", j3.moment === "malle" && JSON.stringify(j3.malle) === '{"coches":[]}' && lignes(j3).some((l) => l.id === QUETE_VEILLE && l.etat !== "verrouillee") && !j3.tampons, JSON.stringify(j3.malle));
  const malle = lignes(exempleCodex("milieu", { jourJ: decaleJour(J, 3), malle: CASES_MALLE.slice(0, MALLE_PRETE).map((c) => c.id) })).find((l) => l.id === "trame:ep:malle");
  check("J-3 : cinq cases cochées, « La malle est prête » est remplie", malle?.etat === "terminee", malle?.etat);
  const malle4 = lignes(exempleCodex("milieu", { jourJ: decaleJour(J, 3), malle: CASES_MALLE.slice(0, 4).map((c) => c.id) })).find((l) => l.id === "trame:ep:malle");
  check("… quatre ne suffisent pas", !!malle4 && malle4.etat !== "terminee", malle4?.etat);

  const j0 = v(0);
  const pn0 = panneauDe(j0);
  check("J-0 : le jour J, aucune quête recommandée", j0.moment === "jourJ" && j0.prochaine === null);
  check("J-0 : le panneau réduit à « Bonne chance » (rien à faire, rien d'annoncé, ni budget ni séance)", pn0.disponible && pn0.jourJ && pn0.quetes.length === 0 && pn0.versees === null && pn0.arcs.total === 0 && pn0.seance === null && pn0.budget === null);
  check("hors du jour J, le panneau n'est jamais réduit", !panneauDe(j8).jourJ && !pn7.jourJ && !panneauDe(j3).jourJ);

  const j1 = v(-1);
  check("J+1 : le lendemain, le récap de la préparation (questions, jours d'encre, préparation)", j1.moment === "lendemain" && j1.phase === "apres" && !!j1.recap && j1.recap.questions > 0 && j1.recap.joursEncre > 0 && j1.recap.preparation === j1.cap?.preparation && j1.recap.programme === "CFA Niveau I", JSON.stringify(j1.recap));
  check("J+1 : « Pose le pinceau » (trame:ep:lendemain) est ouverte", lignes(j1).some((l) => l.id === "trame:ep:lendemain" && l.etat !== "verrouillee"));

  const j10 = v(-10);
  check("J+10 : après l'épreuve, plus de récap", j10.moment === "apres" && j10.recap === null && j10.phase === "apres");
  const sans = v(null);
  check("sans date : jamais veillée, malle, jour J ni lendemain", sans.moment === "courant" && !sans.tampons && !sans.malle && !sans.recap && !panneauDe(sans).jourJ);
  check("momentDe : les bornes (J-8, J-7, J-4, J-3, J-1, J-0, J+1, J+7, J+8 ; sans date)",
    [8, 7, 4, 3, 1, 0, -1, -7, -8].map((n) => momentDe(n, "repetition")).join() === "courant,veillee,veillee,malle,malle,jourJ,lendemain,lendemain,apres"
      && momentDe(null, "repetition") === "courant" && momentDe(null, "apres") === "apres");
}

console.log("\n# la veillée, la malle, le récap (V3 §7.2, §7.3, §7.5)");
{
  const t = tamponsVeillee("2026-11-07", 5, [{ jour: "2026-11-05", n: 12 }, { jour: "2026-11-06", n: 9 }, { jour: "2026-11-07", n: 30 }]);
  const motif = t.map((x) => (x.encre ? "e" : x.aVenir ? "v" : "s")).join("");
  check("tampons : de J-7 à J-1, remplis à 10 questions, un jour à venir n'est jamais rempli", t.length === 7 && t[0].jour === "2026-11-05" && t[6].jour === "2026-11-11" && motif === "esevvvv" && t[2].aujourdhui, motif);
  check("cases de la malle : sept, une facultative, prête à cinq", CASES_MALLE.length === 7 && CASES_MALLE.filter((c) => c.facultative).length === 1 && MALLE_PRETE === 5);
  check("cases cochées : connues, sans doublon, dans l'ordre de la malle", JSON.stringify(cochesValides(["pause", "x", "convocation", "pause", 3])) === '["convocation","pause"]' && cochesValides("non").length === 0);
  check("la malle se lit dans le compte, pour son programme seulement", lireMalle({ rl_malle: { programme: "finance/cfa-l1", coches: ["trajet"] } }, "finance/cfa-l1").join() === "trajet" && lireMalle({ rl_malle: { programme: "histoire/essai", coches: ["trajet"] } }, "finance/cfa-l1").length === 0 && lireMalle(null, "finance/cfa-l1").length === 0);
  const contenu = exempleCodex("milieu").branches.map((b) => b.contenu);
  const e0: Entree = { contenu, now: new Date("2026-11-07T10:00:00Z"), jour: "2026-11-07", jourJ: "2026-11-12", objectif: null, visiteVue: true, progression: [], contrats: [], premier: false, dernierCalcul: null, lecture: { ...LECTURE_VIDE, mesures: { ratures_ouvertes: { total: 30, matieres: {} }, jours: [{ jour: "2026-10-01", n: 400 }] } } };
  const tires = tirerContrats(e0, "joueur");
  check("veillée : le tirage ne garde que l'entretien, 15 min au plus", emplacementsDe("veillee").join() === "entretien" && tires.length === 1 && tires.every((c) => c.emplacement === "entretien" && (MODELES_CONTRATS.find((m) => m.id === c.modele)?.duree ?? 99) <= DUREE_VEILLEE), JSON.stringify(tires));
  check("hors veillée : les trois emplacements", emplacementsDe("repetition").length === 3 && tirerContrats({ ...e0, jourJ: "2026-12-20" }, "joueur").length === 3);
  const mm = (cle: string, debut: number | null, pct: number | null) => ({ cle, nom: cle, court: cle.toUpperCase(), poids: 10, pct, n: 60, total: 200, statut: "mesuree" as const, derniere: null, debut, ancienne: null, zone: null });
  const r = recapDe({
    programme: "CFA Niveau I", debut: "2026-09-02T08:00:00Z", jourJ: "2026-11-12",
    jours: [{ jour: "2026-09-01", n: 50 }, { jour: "2026-09-02", n: 40 }, { jour: "2026-10-10", n: 8 }, { jour: "2026-11-12", n: 2 }, { jour: "2026-11-13", n: 30 }],
    maitrise: { matieres: [mm("quant", 37, 62), mm("fsa", 40, 52), mm("ethics", 55, 50), mm("equity", 30, 70), mm("pm", null, 66), mm("alt", 20, 31)], preparation: 61 },
    trophees: [{ n: 2 }, { n: 3 }],
  });
  check("récap : de l'inscription au jour J compris (ni avant, ni après)", r.depuis === "2026-09-02" && r.questions === 50 && r.joursEncre === 1, JSON.stringify(r));
  check("récap : heures = questions × 1,2 min, arrondies ; trophées additionnés ; ratures scellées inconnues → null", r.heures === 1 && r.trophees === 5 && r.raturesScellees === null && r.preparation === 61);
  check("récap : les trois matières qui ont le plus monté (une qui baisse ou sans début n'y est pas)", r.matieres.map((m) => m.cle).join() === "equity,quant,fsa", r.matieres.map((m) => m.cle).join());
  check("récap sans inscription connue : depuis la première réponse", recapDe({ programme: "x", debut: null, jourJ: null, jours: [{ jour: "2026-08-03", n: 4 }, { jour: "2026-08-01", n: 0 }], maitrise: { matieres: [], preparation: 0 } }).depuis === "2026-08-03");
  const texte = texteRecap({ ...r, questions: 6240, heures: 125, joursEncre: 64 });
  check("le texte partagé : les chiffres du travail, en français", texte === `Ma préparation · CFA Niveau I : ${(6240).toLocaleString("fr-FR")} questions, ≈ 125 h de travail, 64 jours d'encre. Le pinceau est posé.`, texte);
  check("une date longue : « 1er novembre 2026 », « 12 août 2026 »", dateLongue("2026-11-01") === "1er novembre 2026" && dateLongue("2026-08-12T10:00:00Z") === "12 août 2026");
  const src = readFileSync("lib/codex/serveur.ts", "utf8");
  check("serveur.ts : un seul contrat tiré en veillée, rien ne se dévoile les derniers jours, la malle lue dans le compte",
    /contrats\.length < emplacementsDe\(phaseJoueur\(/.test(src) && /momentCalme\(momentDe\(/.test(src) && src.includes("malleCoches: malle.length"));
  check("data-jour-j (lu par Léonard) : sur le sceau de la barre du haut et sur « Bonne chance »",
    readFileSync("components/codex/SceauQuetes.tsx", "utf8").includes("data-jour-j={panneau.jourJ || undefined}") && readFileSync("components/codex/BonneChance.tsx", "utf8").includes("data-jour-j"));
}

console.log("\n# la carte en trois niveaux (V3 §10.1)");
{
  check("niveaux : dézoomé sous 0,55, moyen jusqu'à 1,1, fort au-dessus",
    niveauDe(0.4) === 1 && niveauDe(0.549) === 1 && niveauDe(ECHELLES.moyen) === 2 && niveauDe(0.66) === 2 && niveauDe(ECHELLES.fort) === 2 && niveauDe(1.11) === 3 && niveauDe(1.6) === 3);
  check("aucun texte sous 12 px à l'écran : 13 px lisible dès 0,93, 24 px dès 0,5", lisible(13, 0.93) && !lisible(13, 0.92) && lisible(24, 0.5) && !lisible(22, 0.5));
  check("les tailles fixes masquées (pas réduites) selon l'échelle", taillesCachees(0.5, [13, 22, 24]).join() === "13,22" && taillesCachees(1.1, [13, 22, 24]).join() === "" && taillesCachees(0.4, [13, 22, 24]).join() === "13,22,24");
  check("l'encre qui pâlit : 1 − min(0,6 ; jours / 30), pleine si inconnue",
    opaciteFraicheur(0) === 1 && opaciteFraicheur(3) === 0.9 && opaciteFraicheur(15) === 0.5 && opaciteFraicheur(18) === 0.4 && opaciteFraicheur(90) === 0.4 && opaciteFraicheur(null) === 1);
  const t = (termineeLe: string | null, etat: "terminee" | "active" = "terminee") => ({ etat, termineeLe });
  check("l'encre sèche après 14 jours, jamais sur une quête pas faite", seche(t("2026-10-01T10:00:00Z"), "2026-10-16") && !seche(t("2026-10-02T10:00:00Z"), "2026-10-16") && !seche(t(null), "2026-10-16") && !seche(t("2026-09-01T10:00:00Z", "active"), "2026-10-16"));
  check("les glyphes : F fiche, D drill, ◎ séance ciblée (ou série juste), S signature, ♛ Maître",
    glypheEtape("fiche") === "F" && glypheEtape("drill") === "D" && glypheEtape("ciblee") === "◎" && glypheEtape("serie") === "◎" && glypheEtape("signature") === "S" && glypheEtape("maitre") === "♛" && glypheEtape("cours") === undefined);
  check("une notion : vue à 5 réponses, tenue à 3 justes sur les 5 dernières", etatNotion(4, 4) === "non_vue" && etatNotion(5, null) === "vue" && etatNotion(5, 2) === "vue" && etatNotion(9, 3) === "tenue");

  // les filtres
  const faibles = new Set(["fsa"]);
  check("filtres : Tout, À faire, Mes faiblesses", FILTRES.map((f) => f.libelle).join(" · ") === "Tout · À faire · Mes faiblesses");
  check("« À faire » : ouvertes et pas faites", garde({ etat: "disponible" }, "afaire", faibles) && garde({ etat: "active" }, "afaire", faibles) && !garde({ etat: "terminee" }, "afaire", faibles) && !garde({ etat: "verrouillee" }, "afaire", faibles));
  check("« Mes faiblesses » : les matières en zone basse", garde({ etat: "terminee", matiere: "fsa" }, "faiblesses", faibles) && !garde({ etat: "disponible", matiere: "quant" }, "faiblesses", faibles) && !garde({ etat: "disponible" }, "faiblesses", faibles) && garde({ etat: "verrouillee" }, "tout", faibles));
  const u = exempleCodex("milieu", { unique: true });
  const zb = u.cap!.matieres.filter((m) => m.zone === "basse").map((m) => m.cle).sort().join();
  check("les faiblesses viennent du cap (zone basse)", [...matieresFaibles(u.cap)].sort().join() === zb && matieresFaibles(null).size === 0, zb);

  // la recherche
  check("recherche : sans accents ni casse, « Œ » comme « oe »", normaliser("Élève ŒUVRE") === "eleve oeuvre");
  const items = [{ titre: "Première fiche", consigne: "Ouvre une fiche" }, { titre: "Le drill", consigne: "Finis une page de fiche" }, { titre: "Séance ciblée", consigne: "Dix questions" }];
  check("recherche : tous les mots, le titre d'abord, la consigne ensuite", chercher(items, "fiche").map((x) => x.titre).join() === "Première fiche,Le drill" && chercher(items, "seance ciblee").length === 1 && chercher(items, "f").length === 0);
  check("recherche : 8 résultats au plus", chercher(Array.from({ length: 20 }, (_, i) => ({ titre: `Quête ${i}` })), "quete").length === 8);
  const cherchables = quetesDeLaCarte(exempleCodex("milieu"));
  check("recherche : jamais une énigme ni une quête cachée, une fois chacune", cherchables.length > 50 && cherchables.every((l) => l.affichage !== "cache" && !(l.affichage === "indice" && l.etat !== "terminee")) && new Set(cherchables.map((l) => l.id)).size === cherchables.length);

  // les pastilles et les notions (la vue les porte)
  const b = u.branches.find((x) => x.maitrise.statut !== "non_mesuree") ?? u.branches[0];
  const p = pastilleDe(b);
  check("une pastille : sigle, pourcentage (≈ si provisoire), anneau = étapes faites / total, encre selon la fraîcheur",
    p.court === b.contenu.court && p.pct === pctCap(b.maitrise) && p.fraction === (b.total ? b.faites / b.total : 0) && p.opacite === opaciteFraicheur(b.maitrise.jours), JSON.stringify(p));
  check("dix pastilles, chacune avec ses notions en feuilles", u.branches.length === 10 && u.branches.every((x) => x.notions.length > 0 && x.notions.every((n) => ["non_vue", "vue", "tenue"].includes(n.etat))));
  check("sans maîtrise unique : la fraîcheur est inconnue, l'encre reste pleine", exempleCodex("milieu").branches.every((x) => x.maitrise.jours === null && pastilleDe(x).opacite === 1));

  // ce qui manque à une quête verrouillée
  const v = exempleCodex("milieu");
  const verrouillees = [...v.trame.flatMap((a) => a.quetes), ...v.branches.flatMap((x) => x.etapes)].filter((l) => l.etat === "verrouillee" && l.affichage !== "cache" && l.affichage !== "indice");
  check("chaque quête verrouillée visible dit ce qui lui manque", verrouillees.length > 0 && verrouillees.every((l) => !!l.manque?.length), `${verrouillees.filter((l) => l.manque?.length).length}/${verrouillees.length}`);
  const contenu = v.branches.map((x) => x.contenu);
  const etat = (id: string, o: Omit<Partial<EtatQuete>, "quete"> & { quete: Partial<EtatQuete["quete"]> }) => ({ periode: "", ouverte: true, ouverteLe: null, fait: false, atteint: null, ev: null, ligne: null, retro: false, horsJeu: false, masquee: false, ...o, quete: { id, titre: id, ...o.quete } }) as unknown as EtatQuete;
  const etats = contenu.map((m, i) => etat(`branche:${m.key}:ciblee`, { fait: i < 7, quete: { famille: "branche", matiere: m.key, etape: "ciblee" } }));
  const r = { etats: [...etats, etat("trame:a4:x", { quete: { titre: "La grande revue" } })], actesClos: ["prologue"] };
  const m8 = manqueDe({ prerequis: [{ k: "branches", etape: "ciblee", n: 8 }] }, r, contenu, { apres: false, joursAvant: 30 });
  check("« Séance ciblée : 7 matières sur 8, encore 1 parmi … » et les trois étapes allumées", m8.manque[0] === `Séance ciblée : 7 matières sur 8, encore 1 parmi ${contenu.slice(7).map((m) => m.court).join(", ")}` && m8.allume.length === 3, m8.manque[0]);
  const m10 = manqueDe({ prerequis: [{ k: "toutesBranches", etape: "ciblee" }] }, r, contenu, { apres: false, joursAvant: 30 });
  check("toutes les branches : « il manque … »", m10.manque[0] === `Séance ciblée : 7 matières sur 10, il manque ${contenu.slice(7).map((m) => m.court).join(", ")}`, m10.manque[0]);
  const autres = manqueDe({ prerequis: [{ k: "quete", id: "trame:a4:x" }, { k: "acte", id: "acte3" }, { k: "acte", id: "prologue" }, { k: "joursAvantExamen", max: 7 }, { k: "apresExamen" }, { k: "quete", id: "trame:a4:x", souple: true }] }, r, contenu, { apres: false, joursAvant: 30 });
  check("une quête, un acte, une fenêtre, l'après-examen ; un acte clos et une quête souple ne manquent pas",
    autres.manque.join(" | ") === "D'abord : « La grande revue » | Clore l'acte III | S'ouvre à J-7 | S'ouvre après l'examen" && autres.allume.join() === "trame:a4:x,acte:acte3", autres.manque.join(" | "));
  check("sans date d'examen : la fenêtre le dit", manqueDe({ prerequis: [{ k: "joursAvantExamen", max: 7 }] }, r, contenu, { apres: false, joursAvant: null }).manque[0] === "S'ouvre à J-7, une fois ta date d'examen posée");

  // le téléphone : cinq segments, gardés dans l'URL
  check("cinq segments : Aujourd'hui · Parcours · Matières · Chantiers · Exploits", SEGMENTS_TEL.map((s) => s.libelle).join(" · ") === "Aujourd'hui · Parcours · Matières · Chantiers · Exploits");
  check("le segment lu dans ?vue= ; inconnu ou absent : Aujourd'hui", segmentDe("matieres") === "matieres" && segmentDe("xyz") === "aujourdhui" && segmentDe(undefined) === "aujourdhui");

  // la page blanche : la phrase entière une fois par écran (V3 §11.3)
  const montreSauf = (...caches: string[]) => (q: string) => !caches.includes(q);
  check("page blanche : la première famille masquée dans l'ordre de lecture (carte, puis colonne)", premiereBlanche(montreSauf("codex:longcours", "codex:contrats")) === "codex:contrats" && premiereBlanche(montreSauf("codex:longcours")) === "codex:longcours" && premiereBlanche(montreSauf("codex:branches", "codex:longcours")) === "codex:branches");
  check("page blanche : rien de masqué, personne ne la dit", premiereBlanche(() => true) === null);
  const carteSrc = readFileSync("components/codex/CarteCodex.tsx", "utf8");
  check("page blanche : la colonne (contrats, long cours) passe par PageBlanche", carteSrc.includes('<PageBlanche quoi="codex:longcours"') && carteSrc.includes('<PageBlanche quoi="codex:contrats"'));

  // la maîtrise unique : cap.ts réexporte lib/maitrise.ts (après F2)
  check("cap.ts réexporte la maîtrise unique (mêmes fonctions, mêmes constantes)", CAP.fuites === MAITRISE_UNIQUE.fuites && CAP.preparationDe === MAITRISE_UNIQUE.preparationDe && CAP.zoneDe === MAITRISE_UNIQUE.zoneDe && CAP.gainPreparation === MAITRISE_UNIQUE.gainPreparation && CAP.MAITRISE === MAITRISE_UNIQUE.MAITRISE);

  // les écrans : les niveaux posés par la caméra, la palette qui cherche les quêtes
  const carte = readFileSync("components/codex/CarteCodex.tsx", "utf8");
  check("CarteCodex : niveau et textes masqués posés sur le monde à chaque mouvement", carte.includes("m.dataset.niveau = String(niveauDe(k.z))") && carte.includes("taillesCachees(k.z, TAILLES_FIXES)"));
  const palette = readFileSync("components/nav/CommandPalette.tsx", "utf8");
  check("palette : « Quêtes du Codex », 8 au plus, vers /codex?quete=…", palette.includes('"Quêtes du Codex"') && palette.includes("chercher(toutes, q, 8)") && palette.includes("/codex?quete="));
}

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
