// Tests légers de la page Réviser « le parcours », sans navigateur ni réseau :
//   npx tsx --tsconfig tsconfig.json scripts/reviser/test-parcours.ts
// Vérifie : la carte du cours (sans historique, reprise, cours fini → le
// suivant, matières soulignées, onde ; dernier cours noté à la lecture, pas
// à l'ouverture ; cours fini puis repris), l'avancement des fiches (finie,
// entamée, neuve ; sets de réserve écartés), les cartes par matière, le
// texte brut des aperçus, la durée totale réelle des cours.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { COURSES } from "@/lib/courses";
import { SUBJECTS } from "@/components/reviser/catalog";
import { COURS_PROGRAMME, MINUTES_COURS, ONDE, avancementFiches, carteCours, cartesParMatiere, heuresMinutes, mmss, texteBrut } from "@/components/reviser/parcours";

let ko = 0;
function check(nom: string, ok: boolean, detail = "") {
  console.log(`${ok ? "ok " : "KO "} ${nom}${ok || !detail ? "" : ` — ${detail}`}`);
  if (!ok) ko++;
}

console.log("# la carte du cours");
const premier = carteCours(null);
check("sans historique : le premier cours du programme, au début", premier?.slug === SUBJECTS[0].course && premier?.mode === "debut" && premier.position === 0 && premier.barresLues === 0);
check("sans historique : aucune matière soulignée", !!premier && premier.matieres.length === 10 && premier.matieres.every((m) => m.part === 0));
const fi = COURSES.find((c) => c.slug === "fixed-income")!;
const reprise = carteCours({ dernier: "fixed-income", positions: { "fixed-income": 1660 }, finis: [] });
check("reprise : le dernier cours ouvert, à sa position", reprise?.slug === "fixed-income" && reprise.mode === "reprise" && reprise.position === 1660 && reprise.total === fi.minutes * 60);
const iMod = fi.chapters.reduce((a, ch, k) => (1660 >= ch.start ? k : a), 0);
check("reprise : le module en cours", reprise?.module?.n === iMod + 1 && reprise.module.titre === fi.chapters[iMod].title, JSON.stringify(reprise?.module));
check("reprise : l'onde se remplit selon la part écoutée", reprise?.barresLues === Math.round(ONDE.length * (1660 / (fi.minutes * 60))));
check("reprise : la matière du cours est soulignée en partie", (reprise?.matieres.find((m) => m.key === "fixed_income")?.part ?? 0) > 0.3 && (reprise?.matieres.find((m) => m.key === "fixed_income")?.part ?? 1) < 0.4);
const apresFini = carteCours({ dernier: "ethics", positions: {}, finis: ["ethics"] });
check("dernier cours fini : le suivant du programme, au début", apresFini?.slug === SUBJECTS[1].course && apresFini?.mode === "debut");
check("cours fini : sa matière soulignée en entier", apresFini?.matieres.find((m) => m.key === "ethics")?.part === 1);
const tousFinis = carteCours({ dernier: "ethics", positions: {}, finis: COURS_PROGRAMME.map((c) => c.slug) });
check("tout fini : on reste sur le dernier cours, au début", tousFinis?.slug === "ethics" && tousFinis.mode === "debut");
check("un dernier cours inconnu : le premier du programme", carteCours({ dernier: "inconnu", positions: {}, finis: [] })?.slug === SUBJECTS[0].course);
check("lecture lancée, pas encore de position gardée : ce cours-là, au début", carteCours({ dernier: "equity", positions: {}, finis: [] })?.slug === "equity" && carteCours({ dernier: "equity", positions: {}, finis: [] })?.mode === "debut");
// Fixed Income écouté jusqu'à 27:40, puis Equity ouvert pour ses diapositives, sans lecture : le lecteur ne
// note le dernier cours qu'au démarrage de la lecture, l'appareil garde donc Fixed Income
const lecteur = readFileSync(join(process.cwd(), "components/CourseAudioPlayer.tsx"), "utf8");
check(
  "le lecteur note le dernier cours au démarrage de la lecture, pas à l'ouverture",
  (lecteur.match(/noterDernierCours\(/g) ?? []).length === 1 && /const onPlay = \(\) => \{[^}]*noterDernierCours\(storageKey\)/.test(lecteur),
);
const ouvertSansEcoute = carteCours({ dernier: "fixed-income", positions: { "fixed-income": 1660, equity: 0 }, finis: [] });
check("ouvert sans écoute : la carte garde le cours en cours, à sa position", ouvertSansEcoute?.slug === "fixed-income" && ouvertSansEcoute.mode === "reprise" && ouvertSansEcoute.position === 1660);
const reecoute = carteCours({ dernier: "ethics", positions: { ethics: 600 }, finis: ["ethics"] });
check("cours fini puis repris à 600 s : la reprise, et sa matière reste soulignée en entier", reecoute?.slug === "ethics" && reecoute.mode === "reprise" && reecoute.matieres.find((m) => m.key === "ethics")?.part === 1);

console.log("\n# la durée réelle des cours");
check("les 10 cours du programme", COURS_PROGRAMME.length === 10);
check("durée totale = somme de lib/courses.ts", MINUTES_COURS === COURSES.reduce((a, c) => a + c.minutes, 0));
check("« 10 h 55 » pour 655 min", heuresMinutes(655) === "10 h 55" && heuresMinutes(45) === "45 min");
check("mm:ss au-delà de l'heure", mmss(1660) === "27:40" && mmss(74 * 60) === "74:00" && mmss(-3) === "0:00");

console.log("\n# l'avancement des fiches");
// les pages de drill et leur nombre de questions ; les questions distinctes répondues, par set
const sets = [
  { id: "a1", title: "Fixed Income — Drill Fiche Page 1 (Bonds)", questions: 2 },
  { id: "a2", title: "Fixed Income — Drill Fiche Page 2 (Yields)", questions: 1 },
  { id: "b1", title: "Equity — Drill Fiche Page 1 (Markets)", questions: 2 },
  { id: "b2", title: "Equity — Drill Fiche Page 2 (Valuation)", questions: 3 },
  { id: "r1", title: "Réserve — Equity — Drill Fiche Page 2 (Valuation)", questions: 1 },
  { id: "x1", title: "Equity — QCM (R36–R38)", questions: 1 },
];
const vues = new Map([
  ["a1", 2],
  ["a2", 1],
  ["b1", 2],
  ["r1", 1],
  ["x1", 1],
  ["autre", 4],
]);
const av = avancementFiches(sets, vues);
const etat = (k: string) => av.etats.find((e) => e.key === k)?.etat;
check("finie : toutes les questions de toutes ses pages répondues", etat("fixed_income") === "finie");
check("entamée : une page finie, une autre jamais ouverte (la réserve et les QCM ne comptent pas)", etat("equity") === "entamee");
check("neuve : aucune réponse", etat("ethics") === "neuve");
check("les comptes", av.finies === 1 && av.entamees === 1 && av.total === SUBJECTS.filter((s) => s.fiche).length);
check("rien de répondu : 0 finie, 0 entamée", avancementFiches(sets, new Map()).finies === 0 && avancementFiches(sets, new Map()).entamees === 0);
check("plus de vues que de questions (journal en avance) : pas au-delà du total", avancementFiches([sets[2]], new Map([["b1", 9]])).etats.find((e) => e.key === "equity")?.etat === "finie");

console.log("\n# flashcards, aperçus");
check("60 cartes par matière quand toutes en ont autant", cartesParMatiere(new Map([["fsa", 60], ["equity", 60], ["ethics", 60]])) === 60);
check("rien quand elles diffèrent, ou une seule matière", cartesParMatiere(new Map([["fsa", 60], ["equity", 45]])) === null && cartesParMatiere(new Map([["fsa", 60]])) === null);
check("texte brut : sans ** ni ==, formules sans $", texteBrut("What is **the** ==duration== of $D = 5$?") === "What is the duration of D = 5?");
const long = texteBrut("Which statement about repo haircuts is most accurate when collateral quality falls sharply?", 40);
check("texte brut : coupé sur un mot, avec …", long.endsWith("…") && long.length <= 41 && !long.includes("  "), long);

console.log("\n# pièges du dépôt");
const fichiers = ["components/reviser/ReviserView.tsx", "components/reviser/ParcoursClient.tsx", "components/reviser/parcours.ts", "components/reviser/parcours-data.ts", "components/reviser/Parcours.module.css", "lib/course-ecoute.ts", "lib/sans-calcul.ts"];
const cheminWindows = new RegExp("[A-Za-z]:" + String.fromCharCode(92, 92));
const sale = fichiers.filter((f) => /AppData|scratchpad/.test(readFileSync(join(process.cwd(), f), "utf8")) || cheminWindows.test(readFileSync(join(process.cwd(), f), "utf8")));
check("aucun chemin Temp/scratchpad ni chemin Windows dans les fichiers de la page", sale.length === 0, sale.join(", "));
const client = readFileSync(join(process.cwd(), "components/reviser/ParcoursClient.tsx"), "utf8");
check("le localStorage n'est lu qu'après le montage (dans un useEffect)", !/useState\([^)]*lire(Ecoute|SansCalcul)/.test(client) && /useEffect\(\(\) => \{[\s\S]*?lireEcoute/.test(client));

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
