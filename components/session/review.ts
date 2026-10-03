// Logique partagée des sessions et des examens (entraînement ciblé, session
// du jour, mode examen, examens blancs et leurs essais) : types de la
// correction, export « Copier pour l'IA », petits calculs d'affichage.
// Module neutre (pas de "use client") : importable côté serveur comme client.

import { subjectByKey } from "@/components/reviser/catalog";
import { topicLabel } from "@/lib/practiceTopics";

/** Nom d'une matière à partir de sa clé (noms anglais du site, comme Réviser). */
export function subjectName(key: string) {
  return subjectByKey(key)?.name ?? topicLabel(key);
}

/** « Fixed Income, Equity Investments + 2 » */
export function topicsSummary(keys: string[], max = 2) {
  const names = keys.map(subjectName);
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} + ${names.length - max}`;
}

/** Une question corrigée, telle que renvoyée par les RPC de correction. */
export type ReviewQuestion = {
  question_id: string;
  prompt: string;
  choices: string[];
  correct_index: number;
  explanation: string | null;
  topic: string | null;
  selected_index: number | null;
  is_correct: boolean;
};

export const PASS_THRESHOLD = 70;

export const letter = (i: number) => String.fromCharCode(65 + i);

export function pctOf(score: number, total: number) {
  return total > 0 ? Math.round((score / total) * 100) : 0;
}

export function fmtClock(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** « 1 h 35 », « 45 min » */
export function fmtMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

/** Nom de matière lisible : les dossiers système portent un suffixe « (Système) ». */
export function cleanTopic(topic: string | null | undefined) {
  if (!topic) return "Autre";
  return topic.replace(/\s*\(Système\)\s*$/, "").trim() || "Autre";
}

export type TopicStat = { topic: string; correct: number; total: number; pct: number };

/** Répartition par matière, de la plus faible à la plus forte (façon relevé CFA). */
export function topicStats(review: ReviewQuestion[]): TopicStat[] {
  const by = new Map<string, { correct: number; total: number }>();
  for (const q of review) {
    const key = cleanTopic(q.topic);
    const e = by.get(key) ?? { correct: 0, total: 0 };
    e.total += 1;
    if (q.is_correct) e.correct += 1;
    by.set(key, e);
  }
  return [...by.entries()]
    .map(([topic, s]) => ({ topic, ...s, pct: Math.round((s.correct / s.total) * 100) }))
    .sort((a, b) => a.pct - b.pct);
}

// ── « Copier pour l'IA » ─────────────────────────────────────────────────────
// Format connu de l'utilisateur (il le colle tel quel dans son IA) : ne pas le
// modifier. Chaque type de session n'a que son titre et sa phrase d'intro.

export type AiExportKind = "practice" | "mock" | "retake" | "exam" | "daily";

const HEADS: Record<AiExportKind, { title: string; what: string }> = {
  practice: { title: "SESSION D'ENTRAÎNEMENT CFA", what: "une session d'entraînement CFA Level I ciblée sur certains topics" },
  mock: { title: "EXAMEN BLANC CFA", what: "un examen blanc CFA Level I" },
  retake: { title: "ESSAI D'ENTRAÎNEMENT CFA", what: "un essai d'entraînement CFA Level I" },
  exam: { title: "EXAMEN D'ENTRAÎNEMENT CFA", what: "un examen d'entraînement CFA Level I (mode examen)" },
  daily: { title: "SESSION DU JOUR CFA", what: "une session de révision CFA Level I (QCM)" },
};

/**
 * Texte à coller dans une IA. `onlyErrors` ne garde que les questions ratées
 * (même format, numéros d'origine conservés, une phrase pour le dire).
 */
export function buildAiExportText(
  review: ReviewQuestion[],
  score: number,
  total: number,
  kind: AiExportKind,
  opts: { onlyErrors?: boolean } = {},
) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const { title, what } = HEADS[kind];
  const header =
    `${title} — ${score}/${total} (${pct}%)\n` +
    `Voici mes réponses à ${what}. Pour chaque question : mon énoncé, mes choix, ma réponse, la bonne réponse et l'explication officielle. ` +
    (opts.onlyErrors ? `Je ne t'envoie que les questions où je me suis trompé. ` : "") +
    `Peux-tu me faire un bilan de mes points faibles par thème, et m'expliquer plus en détail les questions où je me suis trompé ?\n\n`;
  const body = review
    .map((q, i) => {
      if (opts.onlyErrors && q.is_correct) return null;
      const choicesText = q.choices.map((c, ci) => `${letter(ci)}) ${c}`).join("\n");
      const myAnswer = q.selected_index === null ? "Non répondue" : `${letter(q.selected_index)}) ${q.choices[q.selected_index]}`;
      const correctAnswer = `${letter(q.correct_index)}) ${q.choices[q.correct_index]}`;
      return (
        `Q${i + 1} [${q.topic ?? "?"}] — ${q.is_correct ? "CORRECT" : "INCORRECT"}\n` +
        `${q.prompt}\n${choicesText}\n` +
        `Ma réponse : ${myAnswer}\n` +
        `Bonne réponse : ${correctAnswer}\n` +
        (q.explanation ? `Explication : ${q.explanation}\n` : "")
      );
    })
    .filter((x): x is string => x !== null)
    .join("\n");
  return header + body;
}
