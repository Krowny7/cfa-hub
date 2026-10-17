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
import { estDevoile, marqueurDe, nouveautesDe } from "@/lib/codex/moteur";
import { bilanDe } from "@/lib/codex/bilan";
import { existsSync, readFileSync } from "node:fs";
import { VERSION_PANNEAU, panneauAcquitte, panneauDe } from "@/lib/codex/panneau";
import { BUDGETS, CAPACITES_VIDE, COLONNES_JOUEUR, COLONNES_V3, budgetParDefaut, ecarter, questionsDes7Jours, reglageDe } from "@/lib/codex/reglage";
import { capacitesDe } from "@/lib/codex/moteur";
import { SPACES, activeSpace, chiffrePastille, estAccueil, libelleOnglet } from "@/lib/nav";
import { paletteDeChemin } from "@/lib/palettes";
import { exempleCodex } from "./exemple";
import { vueSansFetes, type VueCodex } from "@/lib/codex/vue";
import { CASES_MALLE, MALLE_PRETE, QUETE_VEILLE, cochesValides, dateLongue, lireMalle, momentDe, pinceauPose, recapDe, tamponsVeillee, texteRecap } from "@/lib/codex/calendrier";
import { DUREE_VEILLEE, LECTURE_VIDE, emplacementsDe, tirerContrats, type Entree } from "@/lib/codex/moteur";
import { MODELES_CONTRATS } from "@/lib/codex/catalogue";
import { decaleJour } from "@/lib/objectif-calc";
import { vueRythme } from "@/lib/codex/rythme";
import { contenuDuProgramme } from "@/lib/codex/catalogue";
import { TEXTES_CAP, aideMatiereCap, capDe, enTeteCap, fraicheurDe, fuites, gainPreparation, ligneFuites, ligneMatiereCap, maitriseDuCodex, pctCap, preparationDe, titreFuites, zoneDe, type MaitriseMatiere } from "@/lib/codex/cap";
import * as MAITRISE_UNIQUE from "@/lib/maitrise";
import * as CAP from "@/lib/codex/cap";
import { ECHELLES, FILTRES, SEGMENTS_TEL, chercher, etatNotion, garde, glypheEtape, lisible, matieresFaibles, niveauDe, normaliser, opaciteFraicheur, pastilleDe, quetesDeLaCarte, segmentDe, seche, taillesCachees } from "@/lib/codex/carte";
import { manqueDe } from "@/lib/codex/vue";
import { matiereCoince } from "@/lib/codex/seance";
import { TEXTES_RECUPERER } from "@/lib/codex/recuperer";
import { texteAvancee, uniteDe } from "@/lib/codex/unite";
import { motsMaisonDe } from "@/components/codex/MotMaison";
import { catalogueCodex } from "@/lib/codex/catalogue";
import { MATIERES_PREPARATION, SEUIL_FAIT_AVANCER, TEXTES_JOUR, acteEnCours, compteNeuf, etapesActe, faitAvancer, objectifSemaine, preparationJour, resumeFait, resumeQuetesDuJour, resumeSemaine, teteFil, xpEtape } from "@/lib/codex/aujourdhui";
import type { EtatQuete } from "@/lib/codex/moteur";
import {
  TEXTES_TOUT, aRecupererDe, actesParcours, avanceeActe, avanceeDetail, compteActe, dureeDetail, etapesMontrees, etatClair, exploitsTout, libelleEtat, matieresFinies, matieresTout,
  objectifsLongs, plusDetail, queteParDefaut, recompenseDetail, resumeExploits, resumeMatieres, resumeObjectifs, resumeParcours, retrouver, surTitre, texteExploit, texteGain,
} from "@/lib/codex/tout";

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
check("quatre espaces, sans le Codex (il s'ouvre depuis Moi)", SPACES.length === 4 && SPACES.every((x) => (x.key as string) !== "codex" && x.href !== "/codex"), SPACES.map((x) => x.key).join());
check("/codex et ses liens profonds allument « Moi »", activeSpace("/codex") === "moi" && activeSpace("/codex/x") === "moi");
check("la palette du Codex reste « carnet » (par la route), celle de Moi « ébène »", paletteDeChemin("/codex")?.key === "carnet" && paletteDeChemin("/moi")?.key === "ebene");
check("l'accueil : / et /dashboard, rien d'autre", estAccueil("/") && estAccueil("/dashboard") && !estAccueil("/dashboard/x") && !estAccueil("/codex"));
const visibles = (d: string[] | "tout") => SPACES.filter((s) => s.key === "moi" || !DEVOILE_DE_L_ESPACE[s.key] || devoileLite(d, DEVOILE_DE_L_ESPACE[s.key]!)).map((s) => s.key).join();
check("compte neuf : Moi seulement (l'accueil a le logo, et son onglet sur téléphone)", visibles([]) === "moi", visibles([]));
check("après le premier trait : + Réviser", visibles(["reviser", "branches"]) === "reviser,moi");
check("tout dévoilé : les quatre", visibles("tout").split(",").length === 4);
check("pastilles : rien à zéro, le nombre, « 9+ » au-delà (99+ pour Réviser)", chiffrePastille(0) === null && chiffrePastille(null) === null && chiffrePastille(-2) === null && chiffrePastille(3) === "3" && chiffrePastille(9) === "9" && chiffrePastille(12) === "9+" && chiffrePastille(42, 99) === "42" && chiffrePastille(120, 99) === "99+");
check("« 14 à revoir » se lit dans le nom de l'onglet Réviser, et de lui seul", libelleOnglet("reviser", "Réviser", 14) === "Réviser, 14 à revoir" && libelleOnglet("reviser", "Réviser", 0) === undefined && libelleOnglet("reviser", "Réviser", null) === undefined && libelleOnglet("moi", "Moi", 14) === undefined);
{
  const fichiers = ["components/nav/SpaceNav.tsx", "components/MobileBottomNav.tsx"].map((f) => readFileSync(f, "utf8"));
  check("la pastille « à revoir » est sur Réviser, en haut et en bas", fichiers.every((f) => f.includes('key === "reviser" && <PastilleRevoir')));
  check("la barre du bas rend son onglet « Accueil » (vers /dashboard)", fichiers[1].includes('label: "Accueil", href: "/dashboard"'));
  check("la recherche Ctrl K garde une entrée « Codex »", readFileSync("components/nav/CommandPalette.tsx", "utf8").includes('label: "Codex", hint:'));
  const sceau = readFileSync("components/codex/SceauQuetes.tsx", "utf8");
  check("le sceau : plus de « ! », d'arcs ni de « à revoir » ; « Ouvrir le Codex → » reste", !/SceauBarre|arcPlein|signeReserve|sousSceau|revoir\.aujourdhui\} à revoir/.test(sceau) && sceau.includes("Ouvrir le Codex →") && sceau.includes('data-leonard="sceau-quetes"'));
}

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

console.log("\n# le panneau « Aujourd'hui » (sceau de la barre du haut, Codex simplifié)");
for (const sc of ["neuf", "milieu", "fin"] as const) {
  const vue = exempleCodex(sc);
  const pn = panneauDe(vue);
  const attente = vue.aRecuperer ?? [];
  check(`${sc} : plus de liste de quêtes, d'arcs, de « ! » ni de budget`, ["quetes", "arcs", "rare", "budget", "semaine"].every((k) => !(k in pn)), Object.keys(pn).join());
  check(`${sc} : « À récupérer » compte tout ce qui attend (la pastille), en montre trois au plus`, pn.recuperer.n === attente.length && pn.recuperer.items.length === Math.min(3, attente.length), `${pn.recuperer.n}`);
  check(`${sc} : « Fait aujourd'hui » est celui de la vue`, JSON.stringify(pn.fait) === JSON.stringify(vue.faitAujourdhui ?? { n: 0, xp: 0, quetes: [] }));
  check(`${sc} : « 14 à revoir » vient de la vue (la pastille de Réviser)`, JSON.stringify(pn.revoir) === JSON.stringify(vue.revoir));
  const suite = pn.seance?.suivant;
  check(`${sc} : « La suite » mène quelque part, avec une durée`, !suite || (suite.href.startsWith("/") && !suite.href.includes("undefined") && suite.duree > 0 && suite.xp >= 0), JSON.stringify(suite));
  check(`${sc} : jamais un sceau du profil dans les récompenses acquittées`, (pn.versees?.cles ?? []).every((k) => !k.startsWith("exploit:sceau:")));
}
check("la forme gardée du panneau change de version (un instantané d'avant n'est jamais relu)", VERSION_PANNEAU === 4);
{
  const n = panneauDe(exempleCodex("neuf"));
  check("neuf : au calme (rien à récupérer, rien à acquitter)", n.recuperer.n === 0 && n.versees === null);
  const m = panneauDe(exempleCodex("milieu"));
  // l'exemple « milieu » : des récompenses déjà versées, pas encore vues (le repli sans la §9) : elles attendent « Récupérer »
  check("milieu : déjà versées, pas vues : elles attendent « Récupérer », l'ouverture ne les acquitte pas", m.recuperer.n > 0 && m.recuperer.xp === 0 && m.versees === null, JSON.stringify(m.recuperer.n));
  // ce qui n'attend pas « Récupérer » (le mode sobre : versées d'office) est acquitté sans bruit à l'ouverture
  const mv = panneauDe({ ...exempleCodex("milieu"), aRecuperer: [] });
  check("milieu, rien en attente : les récompenses versées d'office à acquitter", !!mv.versees && mv.versees.n > 0 && mv.versees.xp > 0 && mv.recuperer.n === 0);
  const ms = panneauDe({ ...exempleCodex("milieu"), sobre: true, aRecuperer: [] });
  check("mode sobre : les mêmes quêtes à acquitter, sans XP ; le panneau le sait (ni « +n XP » ni fête)", !!ms.versees && ms.versees.n === mv.versees?.n && JSON.stringify(ms.versees.cles) === JSON.stringify(mv.versees?.cles) && ms.versees.xp === 0 && ms.sobre && !mv.sobre);
  check("vue indisponible : panneau vide", !panneauDe({ ...exempleCodex("milieu"), disponible: false }).disponible);
}

console.log("\n# les récompenses versées s'annoncent une fois (acquittées à l'ouverture)");
{
  // ce qui n'attend pas « Récupérer » (le mode sobre : versées d'office)
  const vue: VueCodex = { ...exempleCodex("milieu"), aRecuperer: [] };
  const lignesDe = (v: typeof vue) => [...v.trame.flatMap((a) => a.quetes), ...v.branches.flatMap((x) => x.etapes), ...v.longCours.flatMap((c) => c.paliers), ...v.exploits, ...v.contrats.map((c) => c.ligne), ...v.hebdo];
  const pn = panneauDe(vue);
  check("milieu : des récompenses à annoncer", !!pn.versees && pn.versees.cles.length > 0);
  const apres = panneauDe(vueSansFetes(vue, pn.versees?.cles ?? []));
  check("acquittées (codexVus(cles)) : plus rien à acquitter à la réouverture", apres.versees === null, JSON.stringify(apres.versees));
  check("et « La suite » reste la même", JSON.stringify(apres.seance) === JSON.stringify(pn.seance));
  check("panneauAcquitte : plus rien à acquitter, le reste intact", panneauAcquitte(pn).versees === null && panneauAcquitte(pn).seance === pn.seance && panneauAcquitte(pn).recuperer === pn.recuperer);
  const toutes = vueSansFetes(vue, lignesDe(vue).filter((l) => l.aFeter).map((l) => l.id));
  check("toutes jouées : plus rien à fêter, le bilan ne garde que les actes", lignesDe(toutes).every((l) => !l.aFeter) && bilanDe(toutes).fetes.every((f) => f.famille === "acte") && toutes.branches.length === vue.branches.length);
  const actes = vue.trame.filter((a) => a.aFeter).map((a) => `acte:${a.acte.id}`);
  check("un id « acte:… » éteint la fanfare de l'acte", vueSansFetes(vue, actes).trame.every((a) => !a.aFeter));
  const avecActe = { ...vue, trame: vue.trame.map((a, i) => (i === 1 ? { ...a, aFeter: true } : a)) };
  const pa = panneauDe(avecActe);
  check("un acte clos versé d'office : sa clé à acquitter, son XP comptée", !!pa.versees?.cles.includes(`acte:${vue.trame[1].acte.id}`) && pa.versees.xp >= vue.trame[1].acte.recompense.xp, JSON.stringify(pa.versees));
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
  check("budget choisi : il est celui de la vue", court.budget === 15 && long.budget === 90);
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
  // le marqueur du rattrapage ne retombe jamais à « jamais vu » sur une panne (tout le nouveau passerait en rétro)
  const panne = reglageDe({ ligne: null, absente: false, panne: true }, meta, J);
  const leve = reglageDe({ ligne: null, absente: true, panne: true }, meta, J);
  check("lecture en panne (réseau, délai) ou qui lève : marqueur inconnu (undefined), ni rattrapage ni marqueur écrit",
    panne.capacitesVues === undefined && panne.ou === "base" && leve.capacitesVues === undefined && leve.budget === 60
      && nouveautesDe({ capacites: CAPACITES_VIDE, capacitesVues: panne.capacitesVues }) === null && marqueurDe({ capacites: CAPACITES_VIDE, capacitesVues: panne.capacitesVues }) === null);
  check("« Tout montrer » garde le reste de rl_codex (capacites_vues)", /rl_codex: \{ \.\.\.avant, devoile: "tout", jours: \[\] \}/.test(readFileSync("lib/codex/actions.ts", "utf8")));
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
  // le point faible, la définition unique : poids × (1 − maîtrise), inconnue à 20 % (FSA : 13 × 0,55 = 7,15, devant Ethics 6,45 et Equity 6)
  check("le point faible : le plus fort poids × (1 − maîtrise), et les points qu'il coûte sous le repère", cap.faible?.cle === "fsa" && cap.faible.points === 3.3 && CAP.scoreFaiblesse({ poids: 6, pct: null }) === 6 * 0.8, JSON.stringify(cap.faible));
  check("« Y aller » : le point faible (pas la première fuite)", vise.join() === "fsa" && cap.destination?.href === "/practice?topic=fsa&n=20");
  check("le fil vise le même point faible (« ce qui coince », hors veillée)", matiereCoince({ matieres: ms, preparation: prep, couverture: 77, source: "unique" }, false)?.cle === cap.faible?.cle);
  check("la règle : un segment par matière, larges comme leur poids (100 % en tout)", cap.matieres.length === 10 && Math.abs(cap.matieres.reduce((s, m) => s + m.part, 0) - 100) < 1e-9);
  check("mesure unique : pas de « mesure provisoire »", !cap.provisoire && capDe({ matieres: ms, preparation: prep, couverture: 0, source: "ancienne" }, { jour: "2026-10-16", joursAvant: null, destination: () => null }).provisoire);
  const eth = cap.matieres.find((m) => m.cle === "ethics")!;
  check("une matière provisoire : « ≈ 57 % », l'infobulle « provisoire · 23 réponses sur 40 »", pctCap(eth) === "≈\u00a057\u00a0%" && aideMatiereCap(eth) === "provisoire · 23 réponses sur 40");
  check("une matière non mesurée : « pas encore mesurée », sans zone", ligneMatiereCap(cap.matieres.find((m) => m.cle === "derivatives")!) === "DERIVATIVES · pas encore mesurée");
  check("la fraîcheur : aujourd'hui, hier, il y a n j (jour de Paris), inconnue sans date",
    fraicheurDe("2026-10-16T22:30:00Z", "2026-10-17") === "aujourd'hui" && fraicheurDe("2026-10-16T08:00:00Z", "2026-10-17") === "hier" && fraicheurDe("2026-10-05T08:00:00Z", "2026-10-17") === "il y a 12 j" && fraicheurDe(null, "2026-10-17") === null);
  check("une ligne du détail : « FSA · 45 % · zone basse · touchée il y a 12 j »", ligneMatiereCap({ ...cap.matieres[0], fraicheur: fraicheurDe("2026-10-04T08:00:00Z", "2026-10-16") }) === "FSA · 45\u00a0% · zone basse · touchée il y a 12 j");
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
  check("J-7 : un seul contrat, l'entretien, 15 min au plus", j7.contrats.length <= 1 && j7.contrats.every((c) => c.emplacement === "entretien" && (c.ligne.duree ?? 0) <= DUREE_VEILLEE), JSON.stringify(j7.contrats.map((c) => [c.emplacement, c.ligne.duree])));
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
  check("J-0 : le panneau réduit à « Bonne chance » (rien à récupérer, rien à acquitter, ni séance ni « à revoir »)", pn0.disponible && pn0.jourJ && pn0.recuperer.n === 0 && pn0.versees === null && pn0.seance === null && pn0.revoir === null);
  check("hors du jour J, le panneau n'est jamais réduit", !panneauDe(j8).jourJ && !pn7.jourJ && !panneauDe(j3).jourJ);

  const j1 = v(-1);
  check("J+1 : le lendemain, le récap de la préparation (questions, jours d'encre, préparation)", j1.moment === "lendemain" && j1.phase === "apres" && !!j1.recap && j1.recap.questions > 0 && j1.recap.joursEncre > 0 && j1.recap.preparation === j1.cap?.preparation && j1.recap.programme === "CFA Niveau I", JSON.stringify(j1.recap));
  check("J+1 : « Pose le pinceau » (trame:ep:lendemain) est ouverte", lignes(j1).some((l) => l.id === "trame:ep:lendemain" && l.etat !== "verrouillee"));
  // le verdict se saisit dès J+1 (V3 §7.1), « reporté » ou « admis » compris : rendu sous « Pose le pinceau »
  const entreeJ1: Entree = { contenu: contenuDuProgramme(), now: new Date(`${J}T10:00:00Z`), jour: J, jourJ: decaleJour(J, -1), objectif: null, visiteVue: true, progression: [], contrats: [], premier: false, dernierCalcul: null, lecture: LECTURE_VIDE };
  const rythmeJ1 = vueRythme(entreeJ1, {}, { semaineDispo: true, capacites: CAPACITES_VIDE, moment: j1.moment, verdicts: [] });
  const ecran = readFileSync("components/codex/CodexEcran.tsx", "utf8");
  check("J+1 : le verdict (session de l'examen d'hier) est proposé, et /codex le rend après « Pose le pinceau »",
    rythmeJ1.verdict?.session === decaleJour(J, -1).slice(0, 7) && rythmeJ1.verdict.saisi === null && ecran.indexOf("<PoseLePinceau") < ecran.indexOf("<Verdict ") && !/moment === "apres" && vue\.rythme\?\.verdict/.test(ecran), JSON.stringify(rythmeJ1.verdict?.session));

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
  check("la malle n'invite pas à apporter une montre : elle reste au casier (Prometric)", CASES_MALLE.every((c) => !/montre (analogique|non connectée)/i.test(c.libelle)) && /casier/i.test(CASES_MALLE.find((c) => c.id === "montre")?.libelle ?? ""));
  check("cases cochées : connues, sans doublon, dans l'ordre de la malle", JSON.stringify(cochesValides(["pause", "x", "convocation", "pause", 3])) === '["convocation","pause"]' && cochesValides("non").length === 0);
  check("la malle se lit dans le compte, pour son programme seulement", lireMalle({ rl_malle: { programme: "finance/cfa-l1", coches: ["trajet"] } }, "finance/cfa-l1").join() === "trajet" && lireMalle({ rl_malle: { programme: "histoire/essai", coches: ["trajet"] } }, "finance/cfa-l1").length === 0 && lireMalle(null, "finance/cfa-l1").length === 0);
  const contenu = exempleCodex("milieu").branches.map((b) => b.contenu);
  const e0: Entree = { contenu, now: new Date("2026-11-07T10:00:00Z"), jour: "2026-11-07", jourJ: "2026-11-12", objectif: null, visiteVue: true, progression: [], contrats: [], premier: false, dernierCalcul: null, lecture: { ...LECTURE_VIDE, mesures: { ratures_ouvertes: { total: 30, matieres: {} }, jours: [{ jour: "2026-10-01", n: 400 }, { jour: "2026-11-06", n: 12 }] } } };
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
  // J+1 (et jusqu'à J+7) : on a posé le pinceau, une seule règle pour l'accueil, la pastille et /codex
  check("pinceau posé : le jour J et de J+1 à J+7 ; pas à J-1 ni à J+8, ni sans jour J",
    pinceauPose(momentDe(0, "repetition")) && pinceauPose(momentDe(-1, "apres")) && pinceauPose(momentDe(-7, "apres")) && !pinceauPose(momentDe(1, "veillee")) && !pinceauPose(momentDe(-8, "apres")) && !pinceauPose(momentDe(null, "apres")));
  check("serveur.ts : à J+1, aucune séance composée ni écrite, aucun bonus du trio pour une séance tenue",
    /const sansSeance = pinceauPose\(momentDe\(/.test(src) && src.includes("tenue: !sansSeance && seanceLus.tenue") && src.includes("seance = sansSeance ? null : await seanceDuJour("));
  check("serveur.ts : la séance et le rythme long ont chacun leur try (consigné une fois) : leur panne ne fait plus servir le repli",
    /try \{\s*seance = sansSeance \? null : await seanceDuJour\([^]*?\} catch \(x\) \{\s*await consigner\(a, user\.id, "", `seance : /.test(src) && /try \{\s*rythme = vueRythme\([^]*?\} catch \(x\) \{\s*await consigner\(a, user\.id, "", `rythme : /.test(src));
  // l'accueil ne montre plus rien du Codex (Codex simplifié, ajustement A) : ses deux composants sont retirés
  check("/codex suit la règle (pinceauPose) ; l'accueil n'a plus de composant du Codex",
    readFileSync("components/codex/CodexEcran.tsx", "utf8").includes("const avecSeance = !pinceauPose(moment);") && !existsSync("components/codex/SeanceAccueil.tsx") && !existsSync("components/codex/CodexAccueil.tsx"));
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

  // deux segments, sur téléphone comme sur ordinateur, gardés dans l'URL (Codex simplifié, §3.3)
  check("deux segments : Aujourd'hui · Tout le Codex", SEGMENTS_TEL.map((s) => s.libelle).join(" · ") === "Aujourd'hui · Tout le Codex");
  check("le segment lu dans ?vue= ; inconnu ou absent : Aujourd'hui", segmentDe("tout") === "tout" && segmentDe("xyz") === "aujourdhui" && segmentDe(undefined) === "aujourdhui" && segmentDe("") === "aujourdhui");
  check("les anciens segments (liens profonds) mènent à « Tout le Codex »", ["parcours", "matieres", "chantiers", "exploits"].every((v) => segmentDe(v) === "tout"));
  check("?vue=carte : la carte en plein écran", segmentDe("carte") === "carte");

  // la page blanche a quitté l'écran (Codex simplifié, §6) : une famille pas encore dévoilée n'a pas de repli
  const carteSrc = readFileSync("components/codex/CarteCodex.tsx", "utf8");
  const toutSrc = readFileSync("components/codex/ToutLeCodex.tsx", "utf8");
  check("plus de « page encore blanche » sur la carte ni dans « Tout le Codex »", !carteSrc.includes("pageBlanche") && !carteSrc.includes("PageBlanche") && !toutSrc.includes("pageBlanche"));

  // la maîtrise unique : cap.ts réexporte lib/maitrise.ts (après F2)
  check("cap.ts réexporte la maîtrise unique (mêmes fonctions, mêmes constantes)", CAP.fuites === MAITRISE_UNIQUE.fuites && CAP.preparationDe === MAITRISE_UNIQUE.preparationDe && CAP.zoneDe === MAITRISE_UNIQUE.zoneDe && CAP.gainPreparation === MAITRISE_UNIQUE.gainPreparation && CAP.MAITRISE === MAITRISE_UNIQUE.MAITRISE);

  // les écrans : les niveaux posés par la caméra, la palette qui cherche les quêtes
  const carte = readFileSync("components/codex/CarteCodex.tsx", "utf8");
  check("CarteCodex : niveau et textes masqués posés sur le monde à chaque mouvement", carte.includes("m.dataset.niveau = String(niveauDe(k.z))") && carte.includes("taillesCachees(k.z, TAILLES_FIXES)"));
  const palette = readFileSync("components/nav/CommandPalette.tsx", "utf8");
  check("palette : « Quêtes du Codex », 8 au plus, vers /codex?quete=…", palette.includes('"Quêtes du Codex"') && palette.includes("chercher(toutes, q, 8)") && palette.includes("/codex?quete="));
  // la grille des matières du téléphone : la pastille déplie sa branche (aria-expanded, aria-controls), la page y défile, le focus suit
  const pastille = readFileSync("components/codex/PastilleMatiere.tsx", "utf8");
  check("pastille de la grille : aria-expanded et aria-controls, plus d'aria-pressed", pastille.includes('aria-expanded={forme === "grille" ? !!presse : undefined}') && pastille.includes('aria-controls={forme === "grille" ? controle : undefined}') && !pastille.includes("aria-pressed"));
  const matieresTel = carte.slice(carte.indexOf("function MatieresTel"), carte.indexOf("function BrancheChemin"));
  check("branche ouverte : défilement (mouvement réduit respecté) puis focus sur son titre (tabIndex -1)",
    matieresTel.includes("controle={idBranche}") && matieresTel.includes("id={idBranche}") && /scrollIntoView\(\{ block: "start", behavior: doux \? "smooth" : "auto" \}\)/.test(matieresTel)
      && matieresTel.includes('querySelector<HTMLElement>("h2")?.focus({ preventScroll: true })') && carte.includes("tabIndex={focusable ? -1 : undefined}"));
}

console.log("\n# /codex « Aujourd'hui » (Codex simplifié, §3.3)");
{
  const v = exempleCodex("milieu", { unique: true });
  const blocs = (n: number) => Array.from({ length: n }, (_, i) => ({ genre: (["cinq", "retouches", "coince", "nouveau"] as const)[i], duree: 5 }));
  check("la tête du fil : « 3 étapes · 25 min », puis « 1 étape faite sur 3 », « 2 étapes faites sur 3 »",
    teteFil({ blocs: blocs(3) as never, faits: [], duree: 25 }) === "3 étapes · 25 min" && teteFil({ blocs: blocs(3) as never, faits: ["cinq"], duree: 25 }) === "1 étape faite sur 3 · 25 min" && teteFil({ blocs: blocs(3) as never, faits: ["cinq", "retouches"], duree: 25 }) === "2 étapes faites sur 3 · 25 min");
  const ct = v.contrats.find((c) => c.ligne.etat !== "terminee" && c.ligne.xp > 0);
  check("« +XP » : l'XP des quêtes du jour que l'étape remplit (b.contrats), pas encore faites", !!ct && xpEtape({ contrats: [ct.ligne.id] }, v.contrats) === ct.ligne.xp && xpEtape({ contrats: [] }, v.contrats) === 0 && xpEtape({ contrats: [ct.ligne.id] }, v.contrats.map((c) => ({ ...c, ligne: { ...c.ligne, etat: "terminee" as const } }))) === 0);
  const b0 = v.branches[0];
  const proche = { ...b0, etapes: b0.etapes.map((l, i) => (i === 0 ? { ...l, etat: "active" as const, affichage: "complet" as const, fraction: SEUIL_FAIT_AVANCER, valeur: 51, cible: 60, titre: "FSA à 60 % de maîtrise" } : l)) };
  check("« fait avancer » : une étape de la matière à 80 % ou plus, « (51 → 60) »", faitAvancer({ matiere: b0.contenu.key }, [proche]) === "fait avancer : FSA à 60 % de maîtrise (51 → 60)");
  check("… rien sous 80 %, ni sans matière", faitAvancer({ matiere: b0.contenu.key }, [{ ...proche, etapes: proche.etapes.map((l, i) => (i === 0 ? { ...l, fraction: 0.79 } : l)) }]) === null && faitAvancer({}, [proche]) === null);
  check("le compte neuf : aucune réponse et aucune quête faite", compteNeuf(exempleCodex("neuf")) && !compteNeuf(v) && !compteNeuf({ ...exempleCodex("neuf"), stats: { faites: 1, total: 10, xpCodex: 10 } }));
  check("le compte neuf a une étape, « 10 questions pour faire connaissance · 5 min »", TEXTES_JOUR.neuf.titre === "10 questions pour faire connaissance" && TEXTES_JOUR.neuf.duree === 5);
  check("Quêtes du jour : « · 1 sur 3 · +50 XP à 3 sur 3 » ; sobre ou bonus gagné : sans l'XP",
    resumeQuetesDuJour({ fait: false, xp: 50, faits: 1, total: 3, changementPossible: true }, false) === "· 1 sur 3 · +50 XP à 3 sur 3" && resumeQuetesDuJour({ fait: false, xp: 50, faits: 1, total: 3, changementPossible: true }, true) === "· 1 sur 3" && resumeQuetesDuJour({ fait: true, xp: 50, faits: 3, total: 3, changementPossible: false }, false) === "· 3 sur 3");
  check("Fait aujourd'hui : « : 4 · +230 XP » (comme le bloc Récupérer replié) ; sobre : le nombre seul", resumeFait({ n: 4, xp: 230, quetes: [] }, false) === ": 4 · +230 XP" && resumeFait({ n: 4, xp: 230, quetes: [] }, true) === ": 4" && resumeFait({ n: 0, xp: 0, quetes: [] }, false) === ": 0" && `Fait aujourd'hui ${resumeFait({ n: 4, xp: 230, quetes: [] }, false)}` === TEXTES_RECUPERER.fait({ n: 4, xp: 230 }));
  const auj = readFileSync("components/codex/Aujourdhui.tsx", "utf8");
  check("Aujourd'hui : « Ta semaine » repliée (un seul bouton plein) ; « Fait aujourd'hui » une seule fois après « Tout récupérer »", !auj.includes("open={!!vue.rythme?.lundi") && auj.includes("onFini={() => setRecupere(true)}") && auj.includes("{!recupere && ("));
  const capV = v.cap!;
  const avecMesures = (n: number) => ({ ...capV, matieres: capV.matieres.map((m, i) => ({ ...m, statut: (i < n ? "mesuree" : "non_mesuree") as typeof m.statut, pct: i < n ? 50 : null })) });
  check(`Préparation : masquée sous ${MATIERES_PREPARATION} matières mesurées, montrée dès ${MATIERES_PREPARATION}`, preparationJour(avecMesures(MATIERES_PREPARATION - 1)) === null && preparationJour(avecMesures(MATIERES_PREPARATION)) !== null && preparationJour(null) === null);
  const p = preparationJour({ ...avecMesures(10), faible: { cle: "ethics", nom: "Ethics", court: "Ethics", points: 7.2 } });
  check("… ses valeurs écrites (« Ethics 50 % · … »), « Ce qui te coûte le plus : Ethics (−7 pts) »", !!p && p.valeurs.split(" · ").length === 10 && p.valeurs.includes("50\u00a0%") && p.faible?.texte === "Ethics (−7 pts)", p?.valeurs);
  check("… un point faible au repère n'est pas « ce qui coûte »", preparationJour({ ...avecMesures(10), faible: { cle: "ethics", nom: "Ethics", court: "Ethics", points: 0 } })?.faible === null);
  const a = acteEnCours(v.trame);
  check("l'acte en cours : le courant, jamais la visite de la bottega", !!a && a.courant && !(a.acte.numero === 1 && a.quetes.every((q) => q.optionnelle)), a?.acte.id);
  const etapes = a ? etapesActe(a) : [];
  check("… ses étapes : à faire d'abord, puis faites, sans les cachées", etapes.every((l) => l.affichage !== "cache") && etapes.findIndex((l) => l.etat === "terminee") >= etapes.filter((l) => l.etat !== "terminee").length - (etapes.some((l) => l.etat === "terminee") ? 0 : etapes.length));
  check("Ta semaine : l'objectif du lundi, « Ton objectif : 4 jours d'encre · Le banquier » ; rien sans choix", objectifSemaine({ cible: 4, nom: "Le banquier" }) === "Ton objectif : 4 jours d'encre · Le banquier" && objectifSemaine({ cible: 1, nom: "" }) === "Ton objectif : 1 jour d'encre" && objectifSemaine(null) === null);
  check("Ta semaine : « · 1 sur 2 »", resumeSemaine([{ etat: "terminee" }, { etat: "active" }] as never) === "· 1 sur 2");
}

console.log("\n# /codex « Tout le Codex », la ligne et le détail (Codex simplifié, §2, §3.3, §3.4, §3.6)");
{
  const v = exempleCodex("milieu", { unique: true });
  const l0 = v.branches[0].etapes[0];
  const avec = (o: Partial<typeof l0>) => ({ ...l0, ...o });
  check("quatre états : à faire (verrouillée comprise), en cours, à récupérer, faite",
    etatClair(avec({ etat: "disponible" })) === "afaire" && etatClair(avec({ etat: "verrouillee" })) === "afaire" && etatClair(avec({ etat: "active" })) === "encours" && etatClair(avec({ etat: "terminee", aRecuperer: true })) === "recuperer" && etatClair(avec({ etat: "terminee", aRecuperer: undefined })) === "faite");
  check("« Faite le 12 oct. », « À récupérer », « En cours », « À faire » ; jamais « tamponnée »",
    libelleEtat(avec({ etat: "terminee", aRecuperer: undefined, termineeLe: "2026-10-12T10:00:00Z" })) === "Faite le 12 oct." && libelleEtat(avec({ etat: "terminee", aRecuperer: true })) === "À récupérer" && libelleEtat(avec({ etat: "active" })) === "En cours" && libelleEtat(avec({ etat: "verrouillee" })) === "À faire" && libelleEtat(avec({ etat: "terminee", aRecuperer: undefined, termineeLe: null })) === "Faite");

  // les replis
  const etiq = (a: { numero: number }) => `Acte ${a.numero}`;
  const courant = v.trame.find((a) => a.courant && !(a.acte.numero === 1 && a.quetes.every((q) => q.optionnelle)));
  check("Parcours : « · Acte n · 4 sur 5 », l'acte en cours (jamais la visite)", !!courant && resumeParcours(v.trame, etiq) === `· Acte ${courant.acte.numero} · ${avanceeActe(courant)}`, resumeParcours(v.trame, etiq) ?? "");
  check("Parcours : rien quand aucun acte n'est en cours", resumeParcours(v.trame.map((a) => ({ ...a, courant: false })), etiq) === null);
  check("Parcours : un acte sans étape à montrer n'a pas de ligne", actesParcours(v.trame).every((a) => a.quetes.some((q) => q.affichage !== "cache")));
  const q = (etat: "terminee" | "active" | "disponible", optionnelle = false) => ({ ...l0, id: Math.random().toString(36), etat, optionnelle, affichage: "complet" as const });
  const sansClos: (typeof v.trame)[number]["acte"] = { ...v.trame[0].acte, closAvec: undefined };
  const acte = { ...v.trame[0], acte: sansClos, faites: 1, total: 5, quetes: [q("terminee"), q("active"), q("disponible"), q("disponible"), q("disponible"), q("terminee", true), q("disponible", true)] };
  check("un acte : le compte du moteur, les facultatives à part, « 1 sur 5 + 2 facultatives »", avanceeActe(acte) === "1 sur 5 + 2 facultatives" && compteActe(acte).facultatives === 2);
  const visite = { ...acte, acte: { ...sansClos, closAvec: { n: 4 } }, faites: 2, total: 4, quetes: [q("terminee", true), q("terminee", true), q("disponible", true)] };
  check("la visite (close par 4 outils au choix) : « 2 sur 4 », rien à part", avanceeActe(visite) === "2 sur 4");
  const long = { ...v.trame[0], quetes: [q("terminee"), q("terminee"), q("terminee"), q("terminee"), q("active")] };
  const m = etapesMontrees(long);
  check("les étapes d'un acte : à faire d'abord, deux faites au plus, « et 2 autres faites »", m.lignes.length === 3 && m.lignes[0].etat === "active" && m.autres === 2 && TEXTES_TOUT.autresFaites(m.autres) === "et 2 autres faites");

  const cap = v.cap!;
  const matieres = matieresTout(v.branches, cap);
  check("Matières : une ligne par matière pas finie, avec son étape suivante", matieres.length === v.branches.length - matieresFinies(v.branches) && matieres.every((x) => x.etape.etat !== "terminee"));
  check("… triées par gain de préparation, du plus grand au plus petit", matieres.every((x, i) => i === 0 || matieres[i - 1].gain >= x.gain), matieres.map((x) => `${x.b.contenu.court} ${x.gain}`).join(", "));
  const total = cap.matieres.reduce((sm, x) => sm + x.poids, 0);
  const premiere = cap.matieres.find((x) => x.cle === matieres[0]?.b.contenu.key);
  const pct = premiere?.pct ?? 0;
  const seuil = matieres[0]?.etape.etape === "maitrise60" ? 60 : matieres[0]?.etape.etape === "maitrise75" ? 75 : pct < 60 ? 60 : pct < 75 ? 75 : 0;
  check("… le gain : poids × points jusqu'au seuil que vise l'étape (60 puis 75 %), au dixième", !!premiere && matieres[0].gain === Math.round((premiere.poids / total) * Math.max(0, seuil - pct) * 10) / 10, `${matieres[0]?.gain}`);
  check("« +1,2 pt » ; rien sans gain", texteGain(1.2) === "+1,2 pt" && texteGain(0) === null, String(texteGain(1.2)));
  check("Matières : « · 2 validées sur 10 », « · 1 validée sur 10 »", resumeMatieres(v.branches.map((b, i) => ({ ...b, maitre: i < 2 }))) === `· 2 validées sur ${v.branches.length}` && resumeMatieres(v.branches.map((b, i) => ({ ...b, maitre: i < 1 }))) === `· 1 validée sur ${v.branches.length}`);

  const chaines = v.longCours.map((c, i) => ({ ...c, courant: c.courant ? { ...c.courant, fraction: [0.2, 0.9, 0.5, 0.7][i % 4] } : null }));
  const obj = objectifsLongs(chaines, { chapitres: [], aVenir: false });
  check("Objectifs longs : une ligne par chaîne en cours, la plus proche de la fin d'abord", obj.length === chaines.filter((c) => !!c.courant).length && obj.every((o, i) => i === 0 || obj[i - 1].ligne.fraction >= o.ligne.fraction));
  check("… « étape 2 sur 5 » sous chacune", obj.every((o) => /^étape \d+ sur \d+$/.test(o.sous)), obj[0]?.sous);
  const fil = { chapitres: [{ id: "f1", titre: "Le métier", pourquoi: "", faits: 1, courant: { ...l0, id: "fil:1", famille: "fil" as const }, suivant: null, recents: [] }], aVenir: false };
  const avecFil = objectifsLongs(chaines, fil);
  check("… le fil rouge vient en dernier, « Fil rouge · Le métier »", avecFil[avecFil.length - 1].sous === "Fil rouge · Le métier" && avecFil.length === obj.length + 1);
  check("Objectifs longs : « · n en cours »", resumeObjectifs(chaines) === `· ${chaines.filter((c) => !!c.courant).length} en cours`);

  const ex = [{ ...l0, id: "e1", famille: "exploit" as const, etat: "terminee" as const, aRecuperer: true as const }, { ...l0, id: "e2", famille: "exploit" as const, etat: "disponible" as const, affichage: "indice" as const, indice: "Un sans-faute sur une séance de 20 questions" }, { ...l0, id: "e3", famille: "exploit" as const, etat: "terminee" as const, aRecuperer: undefined }, { ...l0, id: "e4", famille: "exploit" as const, affichage: "cache" as const }];
  const tri = exploitsTout(ex);
  check("Exploits : à récupérer, puis à trouver, puis trouvés ; jamais un caché", tri.aRecuperer.map((x) => x.id).join() === "e1" && tri.aTrouver.map((x) => x.id).join() === "e2" && tri.trouves.map((x) => x.id).join() === "e3");
  check("… « · 2 sur 3 » (les trouvés, récupérés ou non)", resumeExploits(ex) === "· 2 sur 3");
  check("… une énigme se lit (son indice) sous le nom de l'exploit", texteExploit(ex[1]) === "Un sans-faute sur une séance de 20 questions" && texteExploit({ ...ex[1], etat: "terminee" }) === ex[1].consigne);

  check("le détail d'office : la première à récupérer, sinon la première en cours", queteParDefaut([q("disponible"), q("active"), { ...q("terminee"), aRecuperer: true as const }])?.aRecuperer === true && queteParDefaut([q("disponible"), q("active")])?.etat === "active" && queteParDefaut([q("terminee")]) === null);

  // le détail allégé
  check("sur-titre : famille · matière, deux informations au plus", surTitre({ famille: "branche" }, { matiere: "FSA" }) === "Matière · FSA" && surTitre({ famille: "contrat" }) === "Quête du jour" && surTitre({ famille: "contrat" }, { semaine: true }) === "Quête de la semaine" && surTitre({ famille: "longcours" }) === "Objectif long");
  check("avancée : « 51 sur 60 » et « Il manque : 9 » ; rien une fois faite", JSON.stringify(avanceeDetail({ etat: "active", valeur: 51, cible: 60, affichage: "complet" })) === JSON.stringify({ texte: "51 sur 60", manque: "Il manque : 9" }) && avanceeDetail({ etat: "terminee", valeur: 60, cible: 60, affichage: "complet" }) === null);
  check("… à faire baisser : « 120, à passer sous 50 »", avanceeDetail({ etat: "active", valeur: 120, cible: 50, affichage: "complet", baisse: { actuel: 120, seuil: 50 } })?.texte === "120, à passer sous 50");
  // l'avancée avec son unité (§4 règle 2, §3.6.3)
  check("unité : une maîtrise « 51 % → 60 % » et « Il manque : 9 points »", JSON.stringify(avanceeDetail({ etat: "active", valeur: 51, cible: 60, affichage: "complet", unite: "pct" })) === JSON.stringify({ texte: "51 % → 60 %", manque: "Il manque : 9 points" }));
  check("unité : « 3 sur 4 semaines » et « Il manque : 1 semaine » ; « 4 sur 30 min »", JSON.stringify(texteAvancee({ valeur: 3, cible: 4, unite: ["semaine", "semaines"] })) === JSON.stringify({ texte: "3 sur 4 semaines", manque: "Il manque : 1 semaine" }) && texteAvancee({ valeur: 4, cible: 30, unite: ["min", "min"] }).texte === "4 sur 30 min");
  check("unité : à faire baisser, « 120 ratures, à passer sous 50 »", avanceeDetail({ etat: "active", valeur: 120, cible: 50, affichage: "complet", baisse: { actuel: 120, seuil: 50 }, unite: ["rature", "ratures"] })?.texte === "120 ratures, à passer sous 50");
  const cat = catalogueCodex();
  const maitriseCat = cat.find((q) => q.objectif.k === "mesure" && q.objectif.mesure === "maitrise");
  const minutesCat = cat.find((q) => q.objectif.k === "compteur" && q.objectif.somme === "minutes");
  const encreCat = cat.find((q) => q.objectif.k === "mesure" && q.objectif.mesure === "semaines_actives");
  check("unité lue sur le catalogue : maîtrise en %, minutes, semaines", uniteDe(maitriseCat!.objectif) === "pct" && JSON.stringify(uniteDe(minutesCat!.objectif)) === JSON.stringify(["min", "min"]) && JSON.stringify(uniteDe(encreCat!.objectif)) === JSON.stringify(["semaine", "semaines"]));
  const lignesUnite = [...v.branches.flatMap((b) => b.etapes)].filter((l) => l.etat !== "terminee" && l.cible > 1);
  check("la vue porte l'unité des étapes de matière (maîtrise : %)", lignesUnite.length > 0 && lignesUnite.some((l) => l.unite === "pct"), JSON.stringify(lignesUnite.slice(0, 2).map((l) => [l.id, l.unite])));
  // les mots maison : une définition au premier usage, au doigt (§4.4)
  check("mots maison : rature, jour d'encre, notion tenue, trait ; « traité » n'est pas un trait", JSON.stringify(motsMaisonDe(["Corriger 14 ratures"])) === JSON.stringify(["rature"]) && JSON.stringify(motsMaisonDe(["Ton objectif : 4 jours d'encre", "Corriger 5 ratures"])) === JSON.stringify(["rature", "jourEncre"]) && JSON.stringify(motsMaisonDe(["2 notions tenues"])) === JSON.stringify(["notionTenue"]) && JSON.stringify(motsMaisonDe(["Tes traits du jour"])) === JSON.stringify(["trait"]) && motsMaisonDe(["Un traité", null, "Réviser 40 flashcards"]).length === 0);
  const motSrc = readFileSync("components/codex/MotMaison.tsx", "utf8");
  check("mots maison : un repli de 44 px, sans infobulle title=, branché sur le fil, « La suite » du panneau et « Ta semaine »", motSrc.includes("min-h-[44px]") && !motSrc.includes(" title={") && !motSrc.includes(" title=\"") && readFileSync("components/codex/Fil.tsx", "utf8").includes("<MotsMaison") && readFileSync("components/codex/SceauQuetes.tsx", "utf8").includes("<MotsMaison") && readFileSync("components/codex/Aujourdhui.tsx", "utf8").includes("<MotsMaison"));
  const ligneUnite = readFileSync("components/codex/LigneQuete.tsx", "utf8");
  check("la ligne écrit l'avancée avec le même formateur que le détail, et sans aria-label qui la remplace", ligneUnite.includes("texteAvancee(l).texte") && !ligneUnite.includes("aria-label={libelleSceau(l)}") && ligneUnite.includes('className="sr-only"'));
  check("récompense sur une ligne : « +40 XP · Titre : Apprenti » ; sobre : rien", recompenseDetail({ ...l0, xp: 40, xpVersee: null, etat: "active", titreGagne: "t", titreNom: "Apprenti", cosmetique: undefined, folio: undefined }, false) === "+40 XP · Titre : Apprenti" && recompenseDetail({ ...l0, xp: 40 }, true) === null);
  check("durée honnête : « ≈ 10 min » si elle se finit aujourd'hui", dureeDetail({ ...l0, etat: "disponible", aRecuperer: undefined, famille: "contrat", etape: undefined, duree: 10, destination: undefined, affichage: "complet" }) === "≈ 10 min");
  check("… « jusqu'à dimanche » pour une quête de la semaine, « sur plusieurs semaines » pour une maîtrise ou un objectif long",
    dureeDetail({ ...l0, etat: "disponible", famille: "contrat", duree: 10, affichage: "complet" }, { semaine: true }) === "jusqu'à dimanche" && dureeDetail({ ...l0, etat: "active", famille: "branche", etape: "maitrise60", duree: 25, affichage: "complet" }) === "sur plusieurs semaines" && dureeDetail({ ...l0, etat: "active", famille: "longcours", duree: 5, affichage: "complet" }) === "sur plusieurs semaines");
  check("… rien pour une quête faite ou à récupérer", dureeDetail({ ...l0, etat: "terminee", duree: 10 }) === null && dureeDetail({ ...l0, etat: "active", aRecuperer: true, duree: 10 }) === null);
  const b = v.branches.find((x) => x.etapes.filter((e) => e.affichage !== "cache").length > 1)!;
  const etape = b.etapes.filter((e) => e.affichage !== "cache")[1];
  check("« Plus » : « Matière FSA · étape 2 sur 6 »", plusDetail({ ...etape, famille: "branche", matiere: b.contenu.key }, v).includes(`Matière ${b.contenu.court} · étape 2 sur ${b.etapes.filter((e) => e.affichage !== "cache").length}`), plusDetail(etape, v).join(" | "));
  const ch = v.longCours.find((c) => c.paliers.length > 1)!;
  check("« Plus » : la chaîne et la place de l'étape", plusDetail({ ...ch.paliers[1], chaine: ch.chaine.id }, v)[0] === `${ch.chaine.titre} · étape 2 sur ${ch.paliers.length}`);
  check("« Plus » : « comptée avec » et la date", plusDetail({ ...l0, famille: "exploit", chaine: undefined, compteeAvec: { id: "x", titre: "Un mois" }, etat: "terminee", termineeLe: "2026-10-12T10:00:00Z", retro: false }, v).join(" | ") === "Comptée avec « Un mois » : une seule récompense pour les deux. | Faite le 12 octobre 2026");

  const item = { quete: l0.id, periode: l0.periode, titre: "x" };
  check("la ligne « À récupérer » d'une quête : même id, même période", aRecupererDe([item], l0) === item && aRecupererDe([{ ...item, periode: "autre" }], l0) === null);
  check("une quête ouverte se relit dans la vue nouvelle (même id, même période)", retrouver(v, l0)?.id === l0.id && retrouver(v, { id: "inconnue", periode: "" }) === null);

  // la ligne et le détail : un seul composant, sans réplique de Léonard ni police manuscrite
  const carteSrc = readFileSync("components/codex/CarteCodex.tsx", "utf8");
  const ligneSrc = readFileSync("components/codex/LigneQuete.tsx", "utf8");
  const detailSrc = readFileSync("components/codex/DetailQuete.tsx", "utf8");
  check("le détail : ni réplique de Léonard, ni « Réclamer la récompense », ni double pourquoi", !detailSrc.includes("choisirReplique") && !detailSrc.includes("leonardLigne") && !detailSrc.includes("reclamer") && (detailSrc.match(/T\.pourquoi/g) ?? []).length === 1);
  check("la ligne : jamais un bouton dans un bouton (« Récupérer » à côté)", ligneSrc.includes("ligneAvecAction") && ligneSrc.includes("{bouton}"));
  const filSrc = readFileSync("components/codex/FilRouge.tsx", "utf8");
  check("une seule ligne de quête partout : la galerie des exploits et le fil rouge aussi", !carteSrc.includes("LigneCompacte") && !carteSrc.includes("c.compacte") && carteSrc.includes("<Ligne key={q.id + q.periode}") && filSrc.includes("<LigneQuete l={ch.courant}") && !filSrc.includes("c.compacte"));
  check("plus de police manuscrite ni de réplique dans les titres de chemin", !/className=\{`\$\{c\.plume\} \$\{c\.titreChemin\}`\}/.test(carteSrc) && !carteSrc.includes("repliqueChemin") && !carteSrc.includes("acte.replique"));
  check("la carte : « À faire » d'office, la légende complète (glyphes et quatre états)", carteSrc.includes('useState<FiltreCarte>(cible ? "tout" : "afaire")') && ["à faire", "en cours", "à récupérer", "faite", "séance ciblée", "Maître"].every((x) => carteSrc.includes(x)));
}

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
