// Tests de « Tes points faibles » : lib/points-faibles.ts (score, seuils,
// égalités, phrases, joueur sans données), le tiroir d'une ligne
// (lib/voice-points-faibles.ts) et la construction des thèmes
// (components/moi/points-faibles-data.ts : sets supprimés, QCM et pages
// recréés, rayées de la semaine). Sans dépendance de plus : jiti (déjà
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
  sets: [],
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
const construit = donnees.construirePointsFaibles(stats, { disponible: true, lignes }, banque, NOW);
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
const sansRatures = donnees.construirePointsFaibles(stats, donnees.SANS_RATURES_PAR_THEME, banque, NOW);
check("ratures par thème indisponibles : 0 rayée, pas de reprise", sansRatures.rayeesSemaine === 0 && sansRatures.propre === false);
check("ratures par thème indisponibles : aucune phrase ne parle de rature", sansRatures.liste.length > 0 && sansRatures.liste.every((p) => !/ratur/.test(p.phrase)), sansRatures.liste.map((p) => p.phrase).join(" | "));
const sansBanque = donnees.construirePointsFaibles(stats, { disponible: true, lignes }, new Map(), NOW);
check("banque illisible : le QCM jamais rejoué disparaît, les autres restent", !sansBanque.liste.some((p) => p.cle === "qcm:fixed_income:R62–R63") && sansBanque.liste.some((p) => p.cle === "qcm:fixed_income:R59–R61"));

console.log(ko ? `\n${ko} KO sur ${n}` : `\nTOUT OK (${n})`);
process.exit(ko ? 1 : 0);
