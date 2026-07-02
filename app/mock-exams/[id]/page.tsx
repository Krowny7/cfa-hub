import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MockExamRunner } from "@/components/MockExamRunner";
import { MockExamRegistration } from "@/components/MockExamRegistration";

type PageProps = { params: Promise<{ id: string }> };

type Question = {
  id: string;
  position: number;
  prompt: string;
  choices: string[];
  correct_index: number;
  explanation: string | null;
};

type ResultRow = {
  user_id: string;
  score: number;
  total: number;
  duration_seconds: number | null;
  completed_at: string;
  profiles: { username: string | null; avatar_url: string | null } | { username: string | null; avatar_url: string | null }[] | null;
};

export default async function MockExamDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const [examRes, regRes, resultRes, adminRes] = await Promise.all([
    supabase
      .from("mock_exams")
      .select("id,title,description,scheduled_at,duration_minutes,question_count,status")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("mock_exam_registrations")
      .select("id")
      .eq("exam_id", id)
      .eq("user_id", auth.user.id)
      .maybeSingle(),
    supabase
      .from("mock_exam_results")
      .select("user_id,score,total,duration_seconds,completed_at,profiles(username,avatar_url)")
      .eq("exam_id", id)
      .order("score", { ascending: false }),
    supabase.rpc("is_app_admin"),
  ]);

  if (!examRes.data) notFound();

  const exam = examRes.data as {
    id: string; title: string; description: string | null;
    scheduled_at: string; duration_minutes: number; question_count: number;
    status: "draft" | "open" | "closed";
  };
  const isRegistered = Boolean(regRes.data);
  const rawResults = (resultRes.data ?? []) as unknown as ResultRow[];
  const myResult = rawResults.find((r) => r.user_id === auth.user!.id) ?? null;
  const allResults = rawResults;
  const isAdmin = adminRes.data === true;

  const now = new Date();
  const scheduledAt = new Date(exam.scheduled_at);
  const examStarted = now >= scheduledAt;
  const alreadyDone = Boolean(myResult);

  // Fetch questions only if registered + exam started (or closed) + not already done
  let questions: Question[] = [];
  if (isRegistered && (examStarted || exam.status === "closed") && exam.status !== "draft") {
    const { data: qData } = await supabase
      .from("mock_exam_questions")
      .select("position,quiz_questions(id,prompt,choices,correct_index,explanation)")
      .eq("exam_id", id)
      .order("position");

    questions = ((qData ?? []) as unknown as { position: number; quiz_questions: Omit<Question, "position"> }[])
      .map((row) => ({ ...row.quiz_questions, position: row.position }))
      .filter((q): q is Question => Boolean(q.id));
  }

  const showRunner = isRegistered && examStarted && exam.status !== "draft";
  const showLeaderboard = allResults.length > 0;

  const daysUntil = Math.ceil((scheduledAt.getTime() - now.getTime()) / 86_400_000);
  const hoursUntil = Math.ceil((scheduledAt.getTime() - now.getTime()) / 3_600_000);

  return (
    <div className="grid gap-5">
      {/* Header */}
      <div>
        <Link href="/mock-exams" className="text-xs text-white/50 hover:text-white/80">
          ← Examens blancs
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight break-words">{exam.title}</h1>
        {exam.description && (
          <p className="mt-1 text-sm text-white/55">{exam.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/50">
          <span>
            {scheduledAt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            {" à "}{scheduledAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span>·</span>
          <span>{exam.duration_minutes} min</span>
          <span>·</span>
          <span>{exam.question_count} questions</span>
          {exam.status === "open" && !examStarted && (
            <>
              <span>·</span>
              <span className="text-blue-300">
                {hoursUntil < 24 ? `dans ${hoursUntil}h` : `dans ${daysUntil}j`}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Registration card (if exam is open and not yet started) */}
      {exam.status === "open" && !examStarted && (
        <MockExamRegistration
          examId={exam.id}
          isRegistered={isRegistered}
          registrantCount={allResults.length}
        />
      )}

      {/* Exam not yet published */}
      {exam.status === "draft" && !isAdmin && (
        <div className="card p-6 text-center text-sm text-white/40">
          Cet examen n'est pas encore ouvert aux inscriptions.
        </div>
      )}

      {/* Waiting for start */}
      {exam.status === "open" && isRegistered && !examStarted && (
        <div className="card p-5 text-center">
          <div className="text-3xl">⏳</div>
          <div className="mt-2 font-semibold">Tu es inscrit(e)</div>
          <div className="mt-1 text-sm text-white/50">
            L'examen commencera {hoursUntil < 24 ? `dans ${hoursUntil}h` : `dans ${daysUntil}j`}. Reviens à l'heure prévue.
          </div>
        </div>
      )}

      {/* Exam runner */}
      {showRunner && (
        <MockExamRunner
          examId={exam.id}
          durationMinutes={exam.duration_minutes}
          questions={questions}
          alreadyDone={alreadyDone}
        />
      )}

      {/* Leaderboard */}
      {showLeaderboard && (
        <div className="card p-5">
          <div className="mb-4 text-sm font-semibold">Classement ({allResults.length} participant{allResults.length > 1 ? "s" : ""})</div>
          <div className="grid gap-2">
            {allResults.map((r, rank) => {
              const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
              const isMe = r.user_id === auth.user!.id;
              const durationMin = r.duration_seconds ? Math.round(r.duration_seconds / 60) : null;
              return (
                <div
                  key={r.user_id}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3 ${isMe ? "border border-blue-400/30 bg-blue-500/10" : "bg-white/[0.02]"}`}
                >
                  <div className={`w-6 shrink-0 text-center text-sm font-bold ${rank === 0 ? "text-yellow-400" : rank === 1 ? "text-white/60" : rank === 2 ? "text-orange-400/80" : "text-white/30"}`}>
                    {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : rank + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {(Array.isArray(r.profiles) ? r.profiles[0] : r.profiles)?.username ?? "Anonyme"}{isMe && " (moi)"}
                    </div>
                    {durationMin && (
                      <div className="text-xs text-white/40">{durationMin} min</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-base font-bold tabular-nums ${pct >= 70 ? "text-green-400" : pct >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                      {pct}%
                    </div>
                    <div className="text-xs text-white/40">{r.score}/{r.total}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
