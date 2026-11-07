// Moi › Activités : npx tsx --tsconfig ./tsconfig.json scripts/moi/test-activites.ts
import { activitesDe, jourDe, selection, texteRatures } from "@/lib/activites";
import type { AnswerPassage, AnswerSubject } from "@/lib/answer-stats";

let ko = 0;
const check = (nom: string, ok: boolean) => {
  if (!ok) ko++;
  console.log(`${ok ? "ok  " : "KO  "} ${nom}`);
};
const p = (id: string, at: string, n: number, ok: number): AnswerPassage => ({ id, source: "salle", label: "Salle · Test", at, date: "3 oct.", href: `/salles/copie/${id}`, n, ok, ratees: id === "a" ? ["q1", "q2"] : ["q2"] });
const sujet = (key: string, passages: AnswerPassage[]) => ({ key, themes: [{ passages }] }) as unknown as AnswerSubject;

const a = activitesDe({ subjects: [sujet("fsa", [p("a", "2026-10-03", 10, 7), p("b", "2026-10-05", 5, 5)]), sujet("ethics", [p("a", "2026-10-03", 20, 10)])] });
check("une séance sur plusieurs matières se recompose", a.find((x) => x.id === "a")?.n === 30 && a.find((x) => x.id === "a")?.ok === 17);
check("la plus récente d'abord", a[0].id === "b" && a.length === 2);
check("rien de lu : une liste vide", activitesDe(null).length === 0);

check("les ratures suivent la séance", a.find((x) => x.id === "a")?.ratees.join() === "q1,q2");
check("le jour de Paris (minuit passé à Paris, pas à Londres)", jourDe("2026-11-06T23:30:00Z") === "2026-11-07" && jourDe("x") === "");
const s = selection(a, "2026-10-03", null);
check("une sélection par jour : ses séances, son score, ses ratures sans doublon", s.liste.length === 1 && s.n === 30 && s.ok === 17 && s.ratees.join() === "q1,q2");
check("tous les jours d'un type", selection(a, null, "salle").ratees.join() === "q2,q1" && selection(a, null, "duel").liste.length === 0);
const txt = texteRatures("Mes ratures · 7 nov.", [{ prompt: "Which ratio?", choices: ["One", "Two", "Three"], correctIndex: 2, explanation: "Parce que.", lastSelected: 0, setTitle: "FSA" }]);
check("le texte copié : choix en lettres, ta réponse, la bonne, l'explication", txt.includes("1. [FSA] Which ratio?") && txt.includes("C. Three") && txt.includes("Ma réponse : A · Bonne réponse : C") && txt.includes("Explication : Parce que."));

console.log(ko ? `${ko} vérification(s) en échec` : "Tout est vert.");
process.exit(ko ? 1 : 0);
