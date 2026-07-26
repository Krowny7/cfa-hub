import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Medal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MockExamRunner } from "@/components/MockExamRunner";
import { MockExamRegistration } from "@/components/MockExamRegistration";

type PageProps = { params: Promise<{ id: string }> };

// Question sans correct_index/explanation — c'est tout ce que le client
// reçoit pendant que l'examen est en cours. La correction n'arrive que via
// submit_mock_exam / get_mock_exam_review, entièrement côté serveur (voir
// migration_mock_exam_secure_submit.sql).
type ActiveQuestion = {
  id: string;
  position: number;
  prompt: string;
  choices: string[];
};

type ReviewQuestion = {
  question_id: string;
  prompt: string;
  choices: string[];
  correct_index: number;
  explanation: string | null;
  selected_index: number | null;
  is_correct: boolean;
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
      .select("id,title,description,scheduled_at,duration_minutes,question_count,status,window_days")
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
    scheduled_at: string; duration_minutes: number; question_count: number; window_days: number;
    status: "draft" | "open" | "closed";
  };
  const isRegistered = Boolean(regRes.data);
  const rawResults = (resultRes.data ?? []) as unknown as ResultRow[];
  const myResult = rawResults.find((r) => r.user_id === auth.user!.id) ?? null;
  const allResults = rawResults;
  const isAdmin = adminRes.data === true;

  const now = new Date();
  const scheduledAt = new Date(exam.scheduled_at);
  const windowMs = exam.window_days * 24 * 60 * 60 * 1000;
  const windowStart = new Date(scheduledAt.getTime() - windowMs);
  const windowEnd = new Date(scheduledAt.getTime() + windowMs);
  const withinWindow = now >= windowStart && now <= windowEnd;
  const windowClosed = now > windowEnd;
  const alreadyDone = Boolean(myResult);

  // Pendant l'examen : uniquement id/prompt/choices/position, jamais
  // correct_index/explanation (voir migration_mock_exam_secure_submit.sql).
  let activeQuestions: ActiveQuestion[] = [];
  let review: ReviewQuestion[] = [];

  if (isRegistered && exam.status !== "draft") {
    if (alreadyDone) {
      const { data: reviewData } = await supabase.rpc("get_mock_exam_review", { p_exam_id: id });
      review = (reviewData ?? []) as ReviewQuestion[];
    } else if (withinWindow && exam.status === "open") {
      const { data: qData } = await supabase
        .from("mock_exam_questions")
        .select("position,quiz_questions(id,prompt,choices)")
        .eq("exam_id", id)
        .order("position");

      activeQuestions = ((qData ?? []) as unknown as { position: number; quiz_questions: Omit<ActiveQuestion, "position"> }[])
        .map((row) => ({ ...row.quiz_questions, position: row.position }))
        .filter((q): q is ActiveQuestion => Boolean(q.id));
    }
  }

  const showRunner = isRegistered && exam.status !== "draft" && (alreadyDone || (withinWindow && exam.status === "open"));
  const showLeaderboard = allResults.length > 0;

  const daysUntil = Math.ceil((windowStart.getTime() - now.getTime()) / 86_400_000);
  const hoursUntil = Math.ceil((windowStart.getTime() - now.getTime()) / 3_600_000);

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
          {exam.status === "open" && !withinWindow && !windowClosed && (
            <>
              <span>·</span>
              <span className="text-blue-300">
                fenêtre dans {hoursUntil < 24 ? `${hoursUntil}h` : `${daysUntil}j`}
              </span>
            </>
          )}
          {exam.status === "open" && withinWindow && (
            <>
              <span>·</span>
              <span className="text-green-300">
                fenêtre ouverte jusqu'au {windowEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Registration card — reste disponible tant que la fenêtre n'est pas terminée */}
      {exam.status === "open" && !windowClosed && !alreadyDone && (
        <MockExamRegistration
          examId={exam.id}
          isRegistered={isRegistered}
          registrantCount={allResults.length}
        />
      )}

      {/* Exam not yet published */}
      {exam.status === "draft" && !isAdmin && (
        <div className="card p-6 text-center text-sm text-muted">
          Cet examen n'est pas encore ouvert aux inscriptions.
        </div>
      )}

      {/* Registered, but the ±3-jours window n'a pas encore commencé */}
      {isRegistered && !alreadyDone && !withinWindow && !windowClosed && (
        <div className="card p-5 text-center">
          <div className="text-3xl">⏳</div>
          <div className="mt-2 font-semibold">Tu es inscrit(e)</div>
          <div className="mt-1 text-sm text-white/50">
            Tu pourras passer l'examen à partir du {windowStart.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            {" "}(jusqu'au {windowEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}).
          </div>
        </div>
      )}

      {/* Registered but never attempted, and the window is now over */}
      {isRegistered && !alreadyDone && windowClosed && (
        <div className="card p-5 text-center text-sm text-muted">
          La fenêtre pour passer cet examen (jusqu'au {windowEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}) est terminée.
        </div>
      )}

      {/* Exam runner */}
      {showRunner && (
        <MockExamRunner
          examId={exam.id}
          durationMinutes={exam.duration_minutes}
          questions={activeQuestions}
          review={review}
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
                  <div className={`flex w-6 shrink-0 items-center justify-center text-sm font-bold ${rank === 0 ? "text-yellow-400" : rank === 1 ? "text-white/60" : rank === 2 ? "text-orange-400/80" : "text-white/30"}`}>
                    {rank <= 2 ? <Medal size={16} /> : rank + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {(Array.isArray(r.profiles) ? r.profiles[0] : r.profiles)?.username ?? "Anonyme"}{isMe && " (moi)"}
                    </div>
                    {durationMin && (
                      <div className="text-xs text-muted">{durationMin} min</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-base font-bold tabular-nums ${pct >= 70 ? "text-green-400" : pct >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                      {pct}%
                    </div>
                    <div className="text-xs text-muted">{r.score}/{r.total}</div>
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
