// Tests de « Tes points faibles » : lib/points-faibles.ts (score, seuils,
// égalités, phrases, joueur sans données, concepts qui coincent), le tiroir
// d'une ligne (lib/voice-points-faibles.ts), la construction des thèmes
// (components/moi/points-faibles-data.ts : sets supprimés, QCM et pages
// recréés, rayées de la semaine), celle des notions (agrégation par
// Learning Module, calculs rattachés, concepts, liens) et le repli sur les
// thèmes (points_faibles absente, colonnes vides), puis la tuile de l'accueil
// (lecture légère, seuil, Atelier conseillé). Sans dépendance de plus : jiti (déjà
// installé avec Tailwind) charge le TypeScript et l'alias « @/ ».
// Usage : node scripts/test-points-faibles.mjs
import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const jiti = createJiti(import.meta.url, { alias: { "@/": racine + "/" } });
const pf = await jiti.import(join(racine, "lib/points-faibles.ts"));
const voix = await jiti.import(join(racine, "lib/voice-points-faibles.ts"));
const donnees = await jiti.import(join(racine, "components/moi/points-faibles-data.ts"));
const { NOTIONS } = await jiti.import(join(racine, "lib/notions.ts"));

let ko = 0;
let n = 0;
const check = (libelle, cond, extra = "") => {
  n++;
  console.log((cond ? "ok   " : "KO   ") + libelle + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const plat = (s) => s.replace(/ /g, " ");
const JOUR = 86_400_000;
const NOW = Date.parse("2026-10-08T12:00:00Z");
const iso = (jours) => new Date(NOW - jours * JOUR).toISOString();

let compteur = 0;
const notion = (m, extra = {}) => ({
  cle: extra.cle ?? `t:${++compteur}`,
  libelle: extra.libelle ?? `Thème ${compteur}`,
  matiere: "fixed_income",
  matiereNom: "Fixed Income",
  repere: null,
  calcul: !!extra.calcul,
  liens: [],
  lm: null,
  sets: [],
  concepts: [],
  sources: [],
  mesures: { n: 0, ok: 0, enCours: 0, vives: 0, anciennes: 0, rayees7j: 0, aRepasser: 0, derniere: null, ...m },
});

console.log("# La formule (exemples du cahier des charges)");
check("Duration : 8 vives, 4 en voie, 10 justes sur 25 → 63", pf.scoreDe({ n: 25, ok: 10, enCours: 12, vives: 8 }) === 63, String(pf.scoreDe({ n: 25, ok: 10, enCours: 12, vives: 8 })));
check("Crédit souverain : 3 vives, 2 en voie, 14 sur 20 → 32", pf.scoreDe({ n: 20, ok: 14, enCours: 5, vives: 3 }) === 32, String(pf.scoreDe({ n: 20, ok: 14, enCours: 5, vives: 3 })));
check("FCFE en calcul : aucune rature, 3 sur 10 → 28", pf.scoreDe({ n: 10, ok: 3, enCours: 0, vives: 0 }) === 28, String(pf.scoreDe({ n: 10, ok: 3, enCours: 0, vives: 0 })));
check("réussite récente à 85 % ou plus, sans rature : 0", pf.scoreDe({ n: 40, ok: 39, enCours: 0, vives: 0 }) === 0);
check("les vives comptent double : 2 vives = 4 en voie", pf.scoreDe({ n: 20, ok: 12, enCours: 2, vives: 2 }) === pf.scoreDe({ n: 20, ok: 12, enCours: 4, vives: 0 }));
check("plus de ratures en cours : score plus haut", pf.scoreDe({ n: 20, ok: 12, enCours: 6, vives: 6 }) > pf.scoreDe({ n: 20, ok: 12, enCours: 3, vives: 3 }));
check("lissage : un 0 sur 2 pèse moins qu'un 0 sur 20", pf.scoreDe({ n: 2, ok: 0, enCours: 0, vives: 0 }) < pf.scoreDe({ n: 20, ok: 0, enCours: 0, vives: 0 }));
check("borné : 0 sur 1000 et 200 vives restent sous 100", pf.scoreDe({ n: 1000, ok: 0, enCours: 200, vives: 200 }) <= 100);
check("entrées incohérentes bornées (ok > n, vives > en cours)", pf.scoreDe({ n: 5, ok: 9, enCours: 1, vives: 4 }) === pf.scoreDe({ n: 5, ok: 5, enCours: 1, vives: 1 }));
const avecAnciennes = pf.jugerNotion(notion({ n: 20, ok: 10, enCours: 4, vives: 2, anciennes: 50, rayees7j: 9 }));
const sansAnciennes = pf.jugerNotion(notion({ n: 20, ok: 10, enCours: 4, vives: 2 }));
check("les anciennes ne comptent pas dans le score", avecAnciennes.score === sansAnciennes.score);

console.log("\n# Les seuils");
check("7 réponses, 2 ratures : pas éligible", !pf.eligible({ n: 7, enCours: 2 }));
check("8 réponses : éligible", pf.eligible({ n: 8, enCours: 0 }));
check("3 ratures en cours, aucune réponse récente : éligible", pf.eligible({ n: 0, enCours: 3 }));
check("un 0 sur 2 n'est pas un point faible (pas éligible)", pf.pointsFaibles([notion({ n: 2, ok: 0 })]).liste.length === 0);
// cas réels au seuil d'affichage, trouvés dans une grille
let a25 = null;
let a24 = null;
for (let nn = 8; nn <= 40 && !(a25 && a24); nn++)
  for (let ok = 0; ok <= nn; ok++) {
    const s = pf.scoreDe({ n: nn, ok, enCours: 0, vives: 0 });
    if (s === 25 && !a25) a25 = { n: nn, ok };
    if (s === 24 && !a24) a24 = { n: nn, ok };
  }
check("grille : un cas à 25 et un à 24", !!a25 && !!a24, JSON.stringify({ a25, a24 }));
check("score 25 : affiché", pf.pointsFaibles([notion(a25)]).liste.length === 1);
const a24etat = pf.pointsFaibles([notion(a24)]);
check("score 24 : pas affiché, état « rien »", a24etat.liste.length === 0 && a24etat.etat === "rien" && a24etat.eligibles === 1);
check("jauge : 28 → 1, 32 → 2, 63 → 3, 75 → 4", pf.niveauDe(28) === 1 && pf.niveauDe(32) === 2 && pf.niveauDe(63) === 3 && pf.niveauDe(75) === 4 && pf.niveauDe(100) === pf.JAUGE_MAX);
const quinze = Array.from({ length: 15 }, (_, i) => notion({ n: 20, ok: i % 5, enCours: 3 + i, vives: 3 }));
check("au plus 10 points faibles", pf.pointsFaibles(quinze).liste.length === pf.MAX_LISTE);

console.log("\n# Le joueur sans données, puis peu de données");
const vide = pf.pointsFaibles([]);
check("aucune notion : état « peu », liste vide", vide.etat === "peu" && vide.liste.length === 0 && vide.eligibles === 0);
check("réponses éparpillées (7 par thème) : état « peu »", pf.pointsFaibles([notion({ n: 7, ok: 1 }), notion({ n: 7, ok: 2, enCours: 2, vives: 2 })]).etat === "peu");
check("AUCUN_POINT_FAIBLE : état « peu »", pf.AUCUN_POINT_FAIBLE.etat === "peu" && pf.AUCUN_POINT_FAIBLE.liste.length === 0);

console.log("\n# Les égalités");
const memeScore = [
  notion({ n: 20, ok: 10, enCours: 4, vives: 0 }, { libelle: "B", cle: "b" }),
  notion({ n: 20, ok: 10, enCours: 2, vives: 2 }, { libelle: "A", cle: "a" }),
];
check("même score (vérifié)", pf.scoreDe(memeScore[0].mesures) === pf.scoreDe(memeScore[1].mesures));
check("même score : la plus de vives d'abord", pf.pointsFaibles(memeScore).liste[0].cle === "a");
const jumeaux = [notion({ n: 20, ok: 8, enCours: 3, vives: 3 }, { libelle: "Équité", cle: "e" }), notion({ n: 20, ok: 8, enCours: 3, vives: 3 }, { libelle: "Duration", cle: "d" })];
const o1 = pf.pointsFaibles(jumeaux).liste.map((p) => p.cle).join();
const o2 = pf.pointsFaibles([...jumeaux].reverse()).liste.map((p) => p.cle).join();
check("tout égal : l'ordre alphabétique, quel que soit l'ordre d'entrée", o1 === "d,e" && o1 === o2, o1 + " / " + o2);
const plusFort = pf.pointsFaibles([notion({ n: 25, ok: 10, enCours: 12, vives: 8 }, { cle: "dur" }), notion({ n: 20, ok: 14, enCours: 5, vives: 3 }, { cle: "sov" }), notion({ n: 10, ok: 3 }, { cle: "fcfe", calcul: true })]);
check("ordre des exemples : Duration, Crédit souverain, FCFE", plusFort.liste.map((p) => p.cle).join() === "dur,sov,fcfe" && plusFort.etat === "faibles");

console.log("\n# Les phrases");
const [dur, sov, fcfe] = plusFort.liste;
check("Duration", plat(dur.phrase) === "12 ratures en cours, 40 % de réussite sur tes 25 dernières réponses.", dur.phrase);
const sovPeu = pf.jugerNotion(notion({ n: 4, ok: 3, enCours: 5, vives: 3 }));
check("Crédit souverain, peu de réponses récentes", plat(sovPeu.phrase) === "5 ratures en cours, dont 3 jamais reprises.", sovPeu.phrase);
check("calcul sans rature", plat(fcfe.phrase) === "Sur tes 10 derniers calculs : 3 justes.", fcfe.phrase);
check("QCM sans rature", plat(pf.jugerNotion(notion({ n: 10, ok: 1 })).phrase) === "Pas de rature en cours, mais 1 juste sur 10.");
check("toutes vives", plat(pf.jugerNotion(notion({ n: 0, enCours: 3, vives: 3 })).phrase) === "3 ratures en cours, jamais reprises.");
check("toutes déjà reprises", plat(pf.jugerNotion(notion({ n: 0, enCours: 3, vives: 0 })).phrase) === "3 ratures en cours, chacune déjà reprise une fois.");
// ratures par thème illisibles (migration_points_faibles.sql absente) : enCours vaut 0 faute de mieux
const sansR = pf.pointsFaibles([notion({ n: 10, ok: 3 }, { cle: "q" }), notion({ n: 10, ok: 3 }, { cle: "c", calcul: true })], false).liste;
check("ratures inconnues : la réussite seule, aucune mention de rature", plat(sansR.find((p) => p.cle === "q").phrase) === "3 justes sur tes 10 dernières réponses." && sansR.every((p) => !/ratur/.test(p.phrase)), sansR.map((p) => p.phrase).join(" | "));
check("ratures inconnues : le calcul garde sa phrase", plat(sansR.find((p) => p.cle === "c").phrase) === "Sur tes 10 derniers calculs : 3 justes.");
check("ratures inconnues, 1 juste : au singulier", plat(pf.jugerNotion(notion({ n: 9, ok: 1 }), false).phrase) === "1 juste sur tes 9 dernières réponses.");

console.log("\n# La réussite récente (20 réponses, 90 jours)");
const seances = [
  { n: 10, ok: 2, at: iso(1) },
  { n: 6, ok: 6, at: iso(3) },
  { n: 5, ok: 0, at: iso(5) },
  { n: 30, ok: 30, at: iso(10) },
];
const r = pf.recentDe(seances, NOW);
check("séances entières jusqu'à 20 réponses : 10 + 6 + 5", r.n === 21 && r.ok === 8, JSON.stringify(r));
check("l'ordre d'entrée ne compte pas", JSON.stringify(pf.recentDe([...seances].reverse(), NOW)) === JSON.stringify(r));
check("au-delà de 90 jours : ignoré", pf.recentDe([{ n: 10, ok: 0, at: iso(91) }, { n: 4, ok: 4, at: iso(89) }], NOW).n === 4);
check("aucune séance : 0 sur 0", JSON.stringify(pf.recentDe([], NOW)) === JSON.stringify({ n: 0, ok: 0 }));

console.log("\n# Dernier passage");
check("43 jours : 6 semaines", pf.semainesDepuis(iso(43), NOW) === 6);
check("41 jours : rien", pf.semainesDepuis(iso(41), NOW) === null);
check("date absente ou illisible : rien", pf.semainesDepuis(null, NOW) === null && pf.semainesDepuis("x", NOW) === null);

console.log("\n# Le tiroir : seulement ce que la phrase ne dit pas");
const tiroir = (m, sources = []) => voix.detailsPointFaible({ n: 0, ok: 0, enCours: 0, vives: 0, anciennes: 0, rayees7j: 0, ...m, recentSuffisant: (m.n ?? 0) >= pf.MIN_REPONSES, sources }).map(plat);
const tDur = tiroir({ n: 25, ok: 10, enCours: 12, vives: 8, anciennes: 4, rayees7j: 3 }, [{ libelle: "Fiches", n: 31 }, { libelle: "Duels", n: 12 }]);
check("phrase avec la réussite : ni réussite ni total redits ; vives, anciennes (dont les rayées de la semaine), sources", JSON.stringify(tDur) === JSON.stringify(["Ratures : 8 jamais reprises, 4 anciennes, dont 3 rayées cette semaine", "Répondu en : Fiches 31 · Duels 12"]), JSON.stringify(tDur));
const tSov = tiroir({ n: 4, ok: 3, enCours: 5, vives: 3 }, [{ libelle: "Fiches", n: 4 }]);
check("phrase sur les ratures seules : la réussite récente ; une seule source : pas de ligne", JSON.stringify(tSov) === JSON.stringify(["Réussite récente : 75 %, 3 justes sur 4"]), JSON.stringify(tSov));
const tCalc = tiroir({ n: 10, ok: 3 }, [{ libelle: "Calculs", n: 10 }]);
check("calcul : rien à ajouter (ni réussite, ni ratures, ni source unique)", tCalc.length === 0, JSON.stringify(tCalc));
check("sans réponse récente : dit tel quel", tiroir({ n: 0, enCours: 3, vives: 3 })[0] === "Aucune réponse ces 90 derniers jours");
check("dernier passage : sans point final, comme les autres entrées", !voix.POINTS_FAIBLES.dernierPassage(7).endsWith("."));

console.log("\n# La construction des thèmes (sets supprimés, QCM et pages recréés, rayées de la semaine)");
const passage = (id, jours, n, ok) => ({ id, source: "qcm", label: "QCM", at: iso(jours), date: "", href: null, n, ok });
const theme = (key, label, tag, kind, passages, extra = {}) => ({ key, label, tag, kind, by: { qcm: [passages.reduce((s, p) => s + p.n, 0), passages.reduce((s, p) => s + p.ok, 0)] }, passages, more: 0, ...extra });
const stats = {
  available: true,
  missing: [],
  by: {},
  subjects: [
    {
      key: "fixed_income",
      name: "Fixed Income",
      code: "FI",
      pseudo: false,
      by: {},
      themes: [
        // ancienne numérotation, set supprimé depuis : réponses seules
        theme("set:vieux", "Yield Curve Strategies", "R47–R48", "qcm", [passage("s1", 3, 12, 3)], { retired: true }),
        // un QCM recréé : l'ancien set (supprimé) et le nouveau, même repère
        theme("set:ancien", "Duration, Convexity & Empirical Measures", "R59–R61", "qcm", [passage("s2", 4, 10, 4)], { retired: true }),
        theme("set:nouveau", "Duration, Convexity & Empirical Measures", "R59–R61", "qcm", [passage("s3", 2, 10, 4)]),
        // un QCM recréé que le joueur n'a pas encore rejoué : seul l'ancien set dans ses réponses
        theme("set:credit-ancien", "Credit Risk", "R62–R63", "qcm", [passage("s5", 3, 10, 2)], { retired: true }),
        // une page de fiche recréée (seedQuizSets) : l'ancien set seulement
        theme("set:page-ancienne", "Interest Rate Risk & Duration", "p. 4", "fiche", [passage("s4", 5, 12, 3)], { retired: true }),
      ],
    },
  ],
};
const lignes = [
  // ratures d'une question retirée de la vieille numérotation (titre gardé) : 4 en cours
  { setId: null, setTitle: "Yield Curve Strategies — QCM (R47–R48)", folderName: "Fixed Income (Système)", enCours: 4, vives: 4, anciennes: 0, rayees7j: 1, derniere: iso(3) },
  { setId: "nouveau", setTitle: "Duration, Convexity & Empirical Measures — QCM (R59–R61)", folderName: "Fixed Income (Système)", enCours: 5, vives: 3, anciennes: 2, rayees7j: 2, derniere: iso(2) },
  // les ratures de l'ancienne page 4 (questions effacées : titre gardé)
  { setId: null, setTitle: "Fixed Income — Drill Fiche Page 4 (Interest Rate Risk & Duration)", folderName: "Fixed Income (Système)", enCours: 6, vives: 6, anciennes: 0, rayees7j: 0, derniere: iso(5) },
  // un mock officiel : hors notion, mais ses rayées comptent dans le total
  { setId: "mock", setTitle: "Mock A — Session 1", folderName: "CFA Mocks (Système)", enCours: 2, vives: 2, anciennes: 1, rayees7j: 4, derniere: iso(1) },
];
// la banque : le QCM R59–R61 (déjà joué) et le Credit Risk recréé ; plus de R47–R48
const banque = new Map([["qcm:fixed_income:R59–R61", ["nouveau"]], ["qcm:fixed_income:R62–R63", ["credit-neuf"]]]);
const parTheme = (ratures) => ({ notions: null, themes: ratures });
const construit = donnees.construirePointsFaibles(stats, parTheme({ disponible: true, lignes }), { themes: banque, notions: new Map() }, NOW);
check("repli : l'unité est le thème", construit.unite === "theme" && construit.liste.every((p) => p.lm === null && p.concepts.length === 0));
const cles = construit.liste.map((p) => p.cle);
check("thème sans QCM ni page dans la banque : écarté, malgré 4 ratures", !cles.includes("qcm:fixed_income:R47–R48"), cles.join());
const credit = construit.liste.find((p) => p.cle === "qcm:fixed_income:R62–R63");
check("QCM recréé pas encore rejoué : gardé, mène au QCM courant de la banque", !!credit && JSON.stringify(credit.sets) === JSON.stringify(["credit-neuf"]) && credit.liens[0]?.href === "/qcm/credit-neuf", JSON.stringify(credit && { sets: credit.sets, liens: credit.liens }));
const page4 = construit.liste.find((p) => p.cle === "fiche:fixed_income:4");
check("page de fiche recréée : gardée (réponses et ratures), mène à sa page", !!page4 && page4.mesures.n === 12 && page4.mesures.enCours === 6 && page4.liens.length === 1 && /^\/fiches\/[a-z-]+\?page=4$/.test(page4.liens[0].href), JSON.stringify(page4 && { m: page4.mesures, liens: page4.liens }));
check("page recréée : pas de « Mettre au propre » (ses ratures ne sont plus dans un set)", !!page4 && page4.sets.length === 0 && page4.mesures.aRepasser === 0);
const dur2 = construit.liste.find((p) => p.cle === "qcm:fixed_income:R59–R61");
check("QCM recréé : un seul thème, réponses des deux sets", !!dur2 && dur2.mesures.n === 20 && dur2.mesures.ok === 8, JSON.stringify(dur2?.mesures));
check("QCM recréé : seul le set existant sert de lien et de reprise", !!dur2 && JSON.stringify(dur2.sets) === JSON.stringify(["nouveau"]) && dur2.liens.length === 1 && dur2.liens[0].href === "/qcm/nouveau" && dur2.mesures.aRepasser === 5, JSON.stringify(dur2 && { sets: dur2.sets, liens: dur2.liens }));
check("rayées cette semaine : tout le carnet (thème retiré et mock compris), 7", construit.rayeesSemaine === 7, String(construit.rayeesSemaine));
check("rayées du thème : les siennes seulement", dur2?.mesures.rayees7j === 2);
const sansRatures = donnees.construirePointsFaibles(stats, parTheme(donnees.SANS_RATURES_PAR_THEME), { themes: banque, notions: new Map() }, NOW);
check("ratures par thème indisponibles : 0 rayée, pas de reprise", sansRatures.rayeesSemaine === 0 && sansRatures.propre === false);
check("ratures par thème indisponibles : aucune phrase ne parle de rature", sansRatures.liste.length > 0 && sansRatures.liste.every((p) => !/ratur/.test(p.phrase)), sansRatures.liste.map((p) => p.phrase).join(" | "));
const sansBanque = donnees.construirePointsFaibles(stats, parTheme({ disponible: true, lignes }), { themes: new Map(), notions: new Map() }, NOW);
check("banque illisible : le QCM jamais rejoué disparaît, les autres restent", !sansBanque.liste.some((p) => p.cle === "qcm:fixed_income:R62–R63") && sansBanque.liste.some((p) => p.cle === "qcm:fixed_income:R59–R61"));

console.log("\n# Ce qui coince : les concepts");
const cc = pf.conceptsQuiCoincent([
  { concept: "Convexité", ratures: 0, erreurs: 1 },
  { concept: "Duration modifiée", ratures: 1, erreurs: 0 },
  { concept: "Duration gap", ratures: 3, erreurs: 2 },
  { concept: "KRD", ratures: 0, erreurs: 4 },
  { concept: "PVBP", ratures: 1, erreurs: 3 },
]);
check("une rature ou 2 erreurs récentes au moins ; ratures, puis erreurs ; 3 au plus", cc.map((c) => c.concept).join() === "Duration gap,PVBP,Duration modifiée", cc.map((c) => c.concept).join());
check("aucun concept : rien", pf.conceptsQuiCoincent([]).length === 0);
check("concept avec ratures : « · N ratures en cours »", plat(voix.conceptCoince({ concept: "Duration gap", ratures: 3, erreurs: 2 })) === "Duration gap · 3 ratures en cours");
check("concept sans rature : « · N erreurs récentes »", plat(voix.conceptCoince({ concept: "KRD", ratures: 0, erreurs: 1 })) === "KRD · 1 erreur récente");

console.log("\n# Les notions (Learning Modules)");
const DUR = NOTIONS.find((x) => x.id === "fixed_income:11");
const CONV = NOTIONS.find((x) => x.id === "fixed_income:12");
const AVEC_CALC = NOTIONS.find((x) => x.matiere === "equity" && x.calculs.length > 0);
const typeCalc = AVEC_CALC.calculs[0].cle;
const reponses = (k, okSur, debut) => Array.from({ length: k }, (_, i) => ({ at: iso(debut + i), ok: i < okSur }));
const ligneNotion = (notion, extra = {}) => ({ notion, recentes: [], sources: {}, enCours: 0, vives: 0, anciennes: 0, rayees7j: 0, derniere: null, concepts: [], ...extra });
const baseNotions = {
  remplie: true,
  rayeesSemaine: 11,
  lignes: [
    // duration : 20 réponses récentes (8 justes), des ratures, des concepts
    ligneNotion("fixed_income:11", {
      recentes: reponses(20, 8, 1),
      sources: { fiche: 31, duel: 12 },
      enCours: 12,
      vives: 8,
      anciennes: 4,
      rayees7j: 3,
      derniere: iso(1),
      concepts: [
        { concept: "Duration gap", ratures: 4, erreurs: 6 },
        { concept: "Duration modifiée", ratures: 0, erreurs: 1 },
      ],
    }),
    // convexité : 2 réponses seulement (pas éligible)
    ligneNotion("fixed_income:12", { recentes: reponses(2, 0, 2), sources: { fiche: 2 }, derniere: iso(2) }),
    // une notion inconnue du référentiel : ignorée
    ligneNotion("fixed_income:99", { recentes: reponses(10, 0, 1), enCours: 5, vives: 5 }),
  ],
};
// les calculs : un type de calcul d'Equity rattaché à sa notion, plus un type inconnu
const passageCalc = (id, jours, k, ok) => ({ id, source: "calc", label: "Calculs", at: iso(jours), date: "", href: null, n: k, ok });
const statsNotions = {
  available: true,
  missing: [],
  by: {},
  subjects: [
    {
      key: "equity",
      name: "Equity Investments",
      code: "EQ",
      pseudo: false,
      by: {},
      themes: [
        { key: `calc:${typeCalc}`, label: "Calcul", tag: null, kind: "calc", by: { calc: [10, 3] }, passages: [passageCalc("c1", 3, 6, 2), passageCalc("c2", 5, 4, 1)], more: 0 },
        { key: "calc:type-inconnu", label: "Calcul", tag: null, kind: "calc", by: { calc: [9, 0] }, passages: [passageCalc("c3", 3, 9, 0)], more: 0 },
      ],
    },
    {
      key: "fixed_income",
      name: "Fixed Income",
      code: "FI",
      pseudo: false,
      by: {},
      // un thème QCM de l'étape 1 : ignoré dans le décompte par notion (ses réponses sont déjà comptées question par question)
      themes: [theme("set:nouveau", "Duration, Convexity & Empirical Measures", "R59–R61", "qcm", [passage("s9", 1, 30, 0)])],
    },
  ],
};
const banqueN = { themes: new Map(), notions: new Map([["fixed_income:11", ["qcm-r59"]]]) };
const parNotion = donnees.construirePointsFaibles(statsNotions, { notions: baseNotions, themes: donnees.SANS_RATURES_PAR_THEME }, banqueN, NOW);
check("unité : la notion ; reprise ouverte ; rayées de tout le carnet lues dans points_faibles", parNotion.unite === "notion" && parNotion.propre === true && parNotion.rayeesSemaine === 11);
const dN = parNotion.liste.find((p) => p.cle === "fixed_income:11");
check("duration : un seul point faible, libellé court, repère « LM 11 »", !!dN && dN.libelle === DUR.court && plat(dN.repere) === "LM 11" && dN.matiereNom === "Fixed Income", JSON.stringify(dN && { l: dN.libelle, r: dN.repere }));
check("duration : 20 réponses récentes, 8 justes ; ratures du carnet", dN.mesures.n === 20 && dN.mesures.ok === 8 && dN.mesures.enCours === 12 && dN.mesures.vives === 8 && dN.mesures.anciennes === 4 && dN.mesures.rayees7j === 3);
check("duration : même score que l'exemple du cahier des charges (63 sur 25 réponses → ici 20)", dN.score === pf.scoreDe({ n: 20, ok: 8, enCours: 12, vives: 8 }));
check("duration : « Mettre au propre » par la notion (toutes ses ratures en cours)", dN.lm === "fixed_income:11" && dN.sets.length === 0 && dN.mesures.aRepasser === 12);
check("duration : ce qui coince, filtré (Duration modifiée n'a qu'une erreur)", dN.concepts.map((c) => c.concept).join() === "Duration gap", JSON.stringify(dN.concepts));
const naturesD = dN.liens.map((l) => l.nature).join();
check("duration : liens page de fiche, chapitre audio, QCM (pas de calcul rattaché)", naturesD === "fiche,cours,qcm", naturesD);
check("duration : page 4 de la fiche, chapitre audio au module 11, QCM de la banque", dN.liens[0].href === DUR.fiches[0].href && dN.liens[1].href === "/courses/fixed-income?module=11" && dN.liens[2].href === "/qcm/qcm-r59", JSON.stringify(dN.liens));
check("duration : réponses par source, les plus nombreuses d'abord", JSON.stringify(dN.sources) === JSON.stringify([{ libelle: "Fiches", n: 31 }, { libelle: "Duels", n: 12 }]), JSON.stringify(dN.sources));
check("convexité : 2 réponses, pas éligible", !parNotion.liste.some((p) => p.cle === "fixed_income:12") && !!CONV);
check("notion inconnue du référentiel : ignorée", !parNotion.liste.some((p) => p.cle === "fixed_income:99"));
check("thème QCM de l'étape 1 : rien n'en vient en plus", dN.mesures.n === 20);
const cN = parNotion.liste.find((p) => p.cle === AVEC_CALC.id);
check("calcul rattaché à sa notion (lib/notions.ts) : un point faible de la notion", !!cN && cN.mesures.n === 10 && cN.mesures.ok === 3 && cN.calcul === true, JSON.stringify(cN && cN.mesures));
check("notion jouée seulement en calcul : la phrase parle de calculs", !!cN && plat(cN.phrase) === "Sur tes 10 derniers calculs : 3 justes.", cN?.phrase);
check("notion jouée seulement en calcul : le calcul en premier lien", !!cN && cN.liens[0].nature === "calcul" && cN.liens[0].href === AVEC_CALC.calculs[0].href && cN.liens.some((l) => l.nature === "cours"));
check("type de calcul sans notion : ignoré", parNotion.liste.every((p) => p.mesures.n !== 9));

// la même notion jouée en QCM et en calcul : les 20 réponses les plus récentes, toutes confondues
const mixte = donnees.construirePointsFaibles(
  statsNotions,
  { notions: { remplie: true, rayeesSemaine: 0, lignes: [ligneNotion(AVEC_CALC.id, { recentes: reponses(12, 2, 4), sources: { fiche: 12 }, derniere: iso(4) })] }, themes: donnees.SANS_RATURES_PAR_THEME },
  banqueN,
  NOW,
).liste.find((p) => p.cle === AVEC_CALC.id);
// calculs à 3 et 5 jours (6 puis 4 réponses, 3 justes), QCM de 4 à 15 jours (justes à 4 et 5) : 6 + 2 + 4 + 8 = 20 réponses, 3 + 2 justes
check("QCM et calculs mêlés : séances les plus récentes jusqu'à 20 réponses", !!mixte && mixte.mesures.n === 20 && mixte.mesures.ok === 5 && mixte.calcul === false, JSON.stringify(mixte?.mesures));
check("QCM et calculs mêlés : sources des deux, le lien de calcul en dernier", !!mixte && mixte.sources.map((x) => x.libelle).join() === "Fiches,Calculs" && mixte.liens.at(-1).nature === "calcul");

console.log("\n# Les mots de l'unité");
check("rien : « Aucune notion ne ressort »", voix.POINTS_FAIBLES.rienTexte("notion").startsWith("Aucune notion ne ressort") && voix.POINTS_FAIBLES.rienTexte("theme").startsWith("Aucun thème ne ressort"));
check("peu : « sur une même notion »", plat(voix.POINTS_FAIBLES.peuTexte("notion", 8, 3)) === "Il faut 8 réponses sur une même notion, ou 3 ratures en cours.");
check("rattrapé : « sur cette notion »", plat(voix.POINTS_FAIBLES.rattrapeNotion("notion", 2)) === "Rattrapé cette semaine : 2 ratures rayées sur cette notion.");

console.log("\n# Le repli : points_faibles absente ou colonnes vides");
const faux = (reponses) => {
  const appels = [];
  return {
    appels,
    rpc: async (nom) => {
      appels.push(nom);
      return reponses[nom] ?? { data: null, error: { code: "PGRST202", message: "Could not find the function" } };
    },
  };
};
const rpcTheme = { data: [{ set_id: "s", set_title: "T", folder_name: "F", en_cours: 2, vives: 1, anciennes: 0, rayees_7j: 0, derniere: null }], error: null };
const absente = faux({ ratures_par_theme: rpcTheme });
const bAbsente = await donnees.lireBasePointsFaibles(absente);
check("points_faibles absente (PGRST202) : les ratures par thème, sans erreur", bAbsente.notions === null && bAbsente.themes.disponible && bAbsente.themes.lignes.length === 1 && absente.appels.join() === "points_faibles,ratures_par_theme");
const vides = faux({ points_faibles: { data: { remplie: false, rayees_semaine: 0, notions: [] }, error: null }, ratures_par_theme: rpcTheme });
const bVides = await donnees.lireBasePointsFaibles(vides);
check("colonnes vides (remplie faux) : les ratures par thème", bVides.notions === null && bVides.themes.disponible && vides.appels.length === 2);
const rien = faux({});
const bRien = await donnees.lireBasePointsFaibles(rien);
check("aucune des deux fonctions : thèmes indisponibles, sans erreur", bRien.notions === null && !bRien.themes.disponible);
const plein = faux({
  points_faibles: {
    data: { remplie: true, rayees_semaine: 4, notions: [{ notion: "fixed_income:11", recentes: [[iso(1), true], [iso(2), false]], sources: { fiche: 2, inconnue: 5 }, en_cours: "3", vives: 1, anciennes: 0, rayees_7j: 0, derniere: iso(1), concepts: [{ concept: "Duration gap", ratures: 1, erreurs: 0 }] }] },
    error: null,
  },
});
const bPlein = await donnees.lireBasePointsFaibles(plein);
const l0 = bPlein.notions?.lignes[0];
check("colonnes remplies : la notion seule, ratures par thème pas lues", !!bPlein.notions && plein.appels.join() === "points_faibles" && !bPlein.themes.disponible);
check("lecture : réponses, sources connues, nombres", !!l0 && l0.recentes.length === 2 && l0.recentes[0].ok === true && JSON.stringify(l0.sources) === JSON.stringify({ fiche: 2 }) && l0.enCours === 3 && bPlein.notions.rayeesSemaine === 4);
const jette = { rpc: async () => { throw new Error("réseau"); } };
check("exception réseau : repli sans erreur", (await donnees.lireNotionsJoueur(jette)) === null);
const repli = donnees.construirePointsFaibles(stats, bAbsente, { themes: banque, notions: new Map() }, NOW);
check("repli : la construction reste celle des thèmes", repli.unite === "theme");

console.log("\n# La tuile de l'accueil : points_faibles seule, et l'Atelier conseillé");
const leger = donnees.pointsFaiblesLegers(baseNotions, NOW);
check("lecture légère : la duration en tête, mêmes mesures sans les stats", leger.liste[0]?.cle === "fixed_income:11" && leger.liste[0].mesures.n === 20 && leger.liste[0].score === dN.score);
check("lecture légère : la notion jouée seulement en calcul n'y paraît pas", !leger.liste.some((p) => p.cle === AVEC_CALC.id));
const tuile = await jiti.import(join(racine, "components/accueil/point-faible.ts"));
/** Un faux client : rpc points_faibles, et les deux lectures de la table ateliers (en cours : .is ; dernier clos : .not). */
const client = ({ pfData = { remplie: true, rayees_semaine: 0, notions: [] }, enCours = [], dernier = [], tableAbsente = false } = {}) => {
  const absente = { data: null, error: { code: "42P01", message: 'relation "ateliers" does not exist' } };
  const requete = (appels) =>
    new Proxy(
      {},
      {
        get: (_, k) =>
          k === "then"
            ? (res) => res(tableAbsente ? absente : { data: appels.includes("not") ? dernier : enCours, error: null })
            : (...args) => requete([...appels, String(k), ...args.map(String)]),
      },
    );
  return { rpc: async () => ({ data: pfData, error: null }), from: () => requete([]) };
};
const brutDe = (l) => ({ notion: l.notion, recentes: l.recentes.map((r) => [r.at, r.ok]), sources: l.sources, en_cours: l.enCours, vives: l.vives, anciennes: l.anciennes, rayees_7j: l.rayees7j, derniere: l.derniere, concepts: l.concepts });
const pfPlein = { remplie: true, rayees_semaine: 0, notions: baseNotions.lignes.map(brutDe) };
const maintenant = new Date(NOW);
const t1 = await tuile.loadPointFaible(client({ pfData: pfPlein }), "u", maintenant);
check("tuile : la duration, son repère, sa phrase ; aucun Atelier clos : Atelier conseillé", t1?.libelle === DUR.court && plat(t1.repere) === "Fixed Income · LM 11" && t1.phrase === dN.phrase && t1.action === "atelier", JSON.stringify(t1));
check("tuile : colonnes vides (remplie faux) : rien", (await tuile.loadPointFaible(client({ pfData: { remplie: false, rayees_semaine: 0, notions: [] } }), "u", maintenant)) === null);
const faible = { remplie: true, rayees_semaine: 0, notions: [brutDe(ligneNotion("fixed_income:11", { recentes: reponses(10, 4, 1), enCours: 2, vives: 2 }))] };
const scoreFaible = pf.scoreDe({ n: 10, ok: 4, enCours: 2, vives: 2 });
check("tuile : point faible pas assez net (score ≤ 50) : rien", scoreFaible <= pf.SEUIL_ACCUEIL && scoreFaible >= pf.SEUIL_AFFICHAGE && (await tuile.loadPointFaible(client({ pfData: faible }), "u", maintenant)) === null, String(scoreFaible));
check("tuile : table ateliers absente : la carte de Moi", (await tuile.loadPointFaible(client({ pfData: pfPlein, tableAbsente: true }), "u", maintenant))?.action === "voir");
check("tuile : un Atelier en cours : le reprendre", (await tuile.loadPointFaible(client({ pfData: pfPlein, enCours: [{ reponses: [1, 2], vu_at: new Date(Date.now() - 3600_000).toISOString() }] }), "u", maintenant))?.action === "reprendre");
const clos = (jours, score) => [{ finished_at: iso(jours), score, total: 20 }];
check("tuile : Atelier clos hier à 18/20 (une semaine conseillée) : la carte de Moi", (await tuile.loadPointFaible(client({ pfData: pfPlein, dernier: clos(1, 18) }), "u", maintenant))?.action === "voir");
check("tuile : Atelier clos il y a 8 jours à 18/20 : Atelier conseillé", (await tuile.loadPointFaible(client({ pfData: pfPlein, dernier: clos(8, 18) }), "u", maintenant))?.action === "atelier");
check("tuile : Atelier clos hier à 9/20 (demain conseillé) : Atelier conseillé", (await tuile.loadPointFaible(client({ pfData: pfPlein, dernier: clos(1, 9) }), "u", maintenant))?.action === "atelier");
check("tuile : exception réseau : rien, sans erreur", (await tuile.loadPointFaible({ rpc: async () => { throw new Error("réseau"); }, from: () => { throw new Error("réseau"); } }, "u", maintenant)) === null);

console.log(ko ? `\n${ko} KO sur ${n}` : `\nTOUT OK (${n})`);
process.exit(ko ? 1 : 0);
