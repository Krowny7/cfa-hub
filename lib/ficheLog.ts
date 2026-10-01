// Logique pure (sans React ni Supabase) du suivi d'erreurs des fiches : à
// partir du journal des réponses (quiz_answer_log), calcule l'état de
// chaque question, la progression par page, les séries pour le graphique et
// l'export texte pour une IA. Gardée pure pour être testable à part.

export type AnswerMode = "page" | "errors" | "mixed";

export type AnswerRow = {
  question_id: string;
  set_id: string;
  is_correct: boolean;
  selected_index: number;
  run_id: string;
  mode: AnswerMode;
  answered_at: string;
};

export type DrillQuestion = {
  id: string;
  set_id: string;
  prompt: string;
  choices: string[];
  position: number;
};

export type DrillSetLite = {
  page: number;
  setId: string;
  title: string;
  questions: DrillQuestion[];
};

// Une question quitte la liste d'erreurs après ce nombre de réussites
// consécutives (la dernière tentative comprise).
export const STREAK_TO_CLEAR = 2;

export type QuestionState = {
  attempts: number;
  wrong: number;
  trailingCorrect: number;
  lastSelectedWrong: number | null;
  // Raté au moins une fois ET pas encore réussi STREAK_TO_CLEAR fois d'affilée.
  inErrorPool: boolean;
};

export function computeQuestionStates(rows: AnswerRow[]): Map<string, QuestionState> {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.answered_at).getTime() - new Date(b.answered_at).getTime()
  );
  const states = new Map<string, QuestionState>();
  for (const r of sorted) {
    const s =
      states.get(r.question_id) ??
      { attempts: 0, wrong: 0, trailingCorrect: 0, lastSelectedWrong: null, inErrorPool: false };
    s.attempts += 1;
    if (r.is_correct) {
      s.trailingCorrect += 1;
    } else {
      s.wrong += 1;
      s.trailingCorrect = 0;
      s.lastSelectedWrong = r.selected_index;
    }
    s.inErrorPool = s.wrong > 0 && s.trailingCorrect < STREAK_TO_CLEAR;
    states.set(r.question_id, s);
  }
  return states;
}

export type PageProgress = {
  page: number;
  total: number;
  mastered: number;
  weak: number;
  unseen: number;
  attempts: number;
  wrongAttempts: number;
};

export function computePageProgress(
  drillSets: DrillSetLite[],
  states: Map<string, QuestionState>
): PageProgress[] {
  return drillSets.map((d) => {
    let mastered = 0;
    let weak = 0;
    let unseen = 0;
    let attempts = 0;
    let wrongAttempts = 0;
    for (const q of d.questions) {
      const s = states.get(q.id);
      if (!s) {
        unseen += 1;
        continue;
      }
      attempts += s.attempts;
      wrongAttempts += s.wrong;
      if (s.inErrorPool) weak += 1;
      else mastered += 1;
    }
    return { page: d.page, total: d.questions.length, mastered, weak, unseen, attempts, wrongAttempts };
  });
}

export type Run = {
  runId: string;
  mode: AnswerMode;
  date: Date;
  correct: number;
  total: number;
  pct: number;
};

// Une série = toutes les réponses partageant un run_id. Les séries très
// courtes (abandonnées au bout d'une ou deux questions) sont écartées : un
// score sur 1 question ferait des pics trompeurs sur la courbe.
export function computeRuns(rows: AnswerRow[], minAnswers = 5): Run[] {
  const byRun = new Map<string, AnswerRow[]>();
  for (const r of rows) {
    const list = byRun.get(r.run_id) ?? [];
    list.push(r);
    byRun.set(r.run_id, list);
  }
  const runs: Run[] = [];
  for (const [runId, list] of byRun) {
    if (list.length < minAnswers) continue;
    const correct = list.filter((r) => r.is_correct).length;
    const last = list.reduce((m, r) => (r.answered_at > m ? r.answered_at : m), list[0].answered_at);
    runs.push({
      runId,
      mode: list[0].mode,
      date: new Date(last),
      correct,
      total: list.length,
      pct: Math.round((correct / list.length) * 100),
    });
  }
  return runs.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function pickRandom<T>(items: T[], n: number, rand: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

const LETTERS = ["A", "B", "C", "D", "E"];

export type ReviewItem = {
  prompt: string;
  choices: string[];
  selectedIndex: number | null;
  correctIndex: number | null;
  explanation: string | null;
  isCorrect: boolean | null;
  tag?: string;
};

function formatItem(item: ReviewItem, i: number): string {
  const choicesText = item.choices.map((c, ci) => `${LETTERS[ci] ?? ci + 1}) ${c}`).join("\n");
  const fmt = (idx: number | null) =>
    idx === null || idx === undefined ? "Non disponible" : `${LETTERS[idx] ?? idx + 1}) ${item.choices[idx]}`;
  const status = item.isCorrect === null ? "" : item.isCorrect ? " — CORRECT" : " — INCORRECT";
  return (
    `Q${i + 1}${item.tag ? ` [${item.tag}]` : ""}${status}\n` +
    `${item.prompt}\n${choicesText}\n` +
    `Ma réponse : ${fmt(item.selectedIndex)}\n` +
    `Bonne réponse : ${fmt(item.correctIndex)}\n` +
    (item.explanation ? `Explication : ${item.explanation}\n` : "")
  );
}

export function buildRunExport(title: string, items: ReviewItem[], score: number, total: number): string {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const header =
    `SÉRIE D'ENTRAÎNEMENT CFA — ${title} — ${score}/${total} (${pct}%)\n` +
    `Voici mes réponses à une série de questions d'une fiche de révision CFA Level I. ` +
    `Pour chaque question : l'énoncé, les choix, ma réponse, la bonne réponse et l'explication. ` +
    `Peux-tu m'expliquer en détail les questions où je me suis trompé, identifier le(s) concept(s) que je confonds, ` +
    `et me proposer un moyen mnémotechnique ou un exemple pour ne plus refaire ces erreurs ?\n\n`;
  return header + items.map(formatItem).join("\n");
}

export function buildErrorPoolExport(title: string, items: ReviewItem[]): string {
  const header =
    `MES ERREURS À REVOIR — ${title} (${items.length} question${items.length > 1 ? "s" : ""})\n` +
    `Voici les questions d'une fiche de révision CFA Level I que je rate encore ` +
    `(avec ma dernière mauvaise réponse, la bonne réponse et l'explication). ` +
    `Peux-tu regrouper ces erreurs par concept, m'expliquer ce que je confonds, ` +
    `puis me proposer 2-3 questions d'entraînement ciblées sur mes points faibles ?\n\n`;
  return header + items.map(formatItem).join("\n");
}
