// Moi › Activités : npx tsx --tsconfig ./tsconfig.json scripts/moi/test-activites.ts
import { activitesDe } from "@/lib/activites";
import type { AnswerPassage, AnswerSubject } from "@/lib/answer-stats";

let ko = 0;
const check = (nom: string, ok: boolean) => {
  if (!ok) ko++;
  console.log(`${ok ? "ok  " : "KO  "} ${nom}`);
};
const p = (id: string, at: string, n: number, ok: number): AnswerPassage => ({ id, source: "salle", label: "Salle · Test", at, date: "3 oct.", href: `/salles/copie/${id}`, n, ok });
const sujet = (key: string, passages: AnswerPassage[]) => ({ key, themes: [{ passages }] }) as unknown as AnswerSubject;

const a = activitesDe({ subjects: [sujet("fsa", [p("a", "2026-10-03", 10, 7), p("b", "2026-10-05", 5, 5)]), sujet("ethics", [p("a", "2026-10-03", 20, 10)])] });
check("une séance sur plusieurs matières se recompose", a.find((x) => x.id === "a")?.n === 30 && a.find((x) => x.id === "a")?.ok === 17);
check("la plus récente d'abord", a[0].id === "b" && a.length === 2);
check("rien de lu : une liste vide", activitesDe(null).length === 0);

console.log(ko ? `${ko} vérification(s) en échec` : "Tout est vert.");
process.exit(ko ? 1 : 0);
