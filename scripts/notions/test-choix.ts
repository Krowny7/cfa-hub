// Le calcul du choix par notion. Lancer : npx tsx --tsconfig ./tsconfig.json scripts/notions/test-choix.ts
import { choixDisponible, choixVide, matiereDeNotion, matieresDuChoix, plat, questionsDuChoix, type NotionDispo } from "@/lib/notions-choix";
import { paramsDepuisJson, paramsParDefaut, paramsVersJson } from "@/lib/salles/logique";

let ko = 0;
const check = (label: string, cond: boolean) => {
  console.log((cond ? "ok   " : "KO   ") + label);
  if (!cond) ko++;
};

const dispo: NotionDispo[] = [
  { notion: "fsa:3", total: 80, concepts: [{ concept: "EPS", total: 20 }, { concept: "Revenus", total: 10 }] },
  { notion: "alternatives:2", total: 70, concepts: [{ concept: "Frais", total: 30 }] },
  { notion: "ethics:3", total: 400, concepts: [] },
];

check("la matière d'une notion", matiereDeNotion("fixed_income:11") === "fixed_income");
check("un choix vide", choixVide({ notions: [], concepts: [] }) && !choixVide({ notions: ["fsa:3"], concepts: [] }));
check("les matières viennent des notions et des concepts", matieresDuChoix({ notions: ["ethics:3"], concepts: ["Frais"] }, dispo).sort().join() === "alternatives,ethics");
check("les questions s'additionnent", questionsDuChoix({ notions: ["ethics:3"], concepts: ["EPS", "Frais"] }, dispo) === 450);
check("une notion cochée compte déjà ses concepts", questionsDuChoix({ notions: ["fsa:3"], concepts: ["EPS"] }, dispo) === 80);
check("la recherche ignore accents et majuscules", plat("Éthique") === "ethique");
const reste = choixDisponible({ notions: ["fsa:3", "quant:4"], concepts: ["Frais", "Absent"] }, dispo);
check("un choix perd ce que la source ne propose plus", reste.notions.join() === "fsa:3" && reste.concepts.join() === "Frais");

const p = { ...paramsParDefaut(), notions: ["fsa:3"], concepts: ["EPS"] };
const json = paramsVersJson(p);
check("les réglages envoient les notions", JSON.stringify(json.notions) === '["fsa:3"]' && JSON.stringify(json.concepts) === '["EPS"]');
check("sans choix, rien n'est envoyé", !("notions" in paramsVersJson(paramsParDefaut())));
const relu = paramsDepuisJson({ ...json });
check("les réglages relus gardent les notions", relu.notions?.[0] === "fsa:3" && relu.concepts?.[0] === "EPS");

const surMock = paramsVersJson({ ...paramsParDefaut(), source: "examen", mock: { examens: ["Mock A — Session 1"], version: "base", complet: true, ordre: "examen" }, notions: ["fsa:3"], concepts: [] });
check("un mock envoie aussi les notions", JSON.stringify(surMock.notions) === '["fsa:3"]');

console.log(ko ? `${ko} vérification(s) en échec` : "tout est vert");
process.exit(ko ? 1 : 0);
