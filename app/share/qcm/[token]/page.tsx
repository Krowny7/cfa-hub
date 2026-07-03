import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ token: string }> };

export default async function ShareQcmPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();

  const [setRes, questionsRes] = await Promise.all([
    supabase.rpc("get_quiz_set_by_token", { p_token: token }).maybeSingle(),
    supabase.rpc("get_quiz_questions_by_share_token", { p_token: token }),
  ]);

  if (!setRes.data) notFound();

  const set = setRes.data as { id: string; title: string; visibility: string };
  const questions = (questionsRes.data ?? []) as {
    id: string; prompt: string; choices: string[]; correct_index: number; explanation: string | null; position: number;
  }[];

  return (
    <div className="grid gap-4">
      <div className="card p-5">
        <div className="text-xs text-muted mb-1">QCM partagé · lecture seule</div>
        <h1 className="text-xl font-semibold tracking-tight break-words">{set.title}</h1>
        <p className="mt-0.5 text-sm text-white/50">{questions.length} question(s)</p>
      </div>

      <div className="grid gap-3">
        {questions.map((q, idx) => (
          <div key={q.id} className="card p-4">
            <div className="text-xs text-muted mb-1">Q{idx + 1}</div>
            <div className="text-sm font-medium whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {q.prompt}
            </div>
            <div className="mt-3 grid gap-1.5">
              {(Array.isArray(q.choices) ? q.choices : []).map((choice, cidx) => (
                <div
                  key={cidx}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    cidx === q.correct_index
                      ? "border-green-500/40 bg-green-500/10 text-green-300"
                      : "border-white/10 text-white/70"
                  }`}
                >
                  {cidx === q.correct_index && "✓ "}{choice}
                </div>
              ))}
            </div>
            {q.explanation && (
              <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-white/55 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {q.explanation}
              </div>
            )}
          </div>
        ))}
        {questions.length === 0 && (
          <div className="card p-4 text-sm text-white/50">Aucune question.</div>
        )}
      </div>
    </div>
  );
}
