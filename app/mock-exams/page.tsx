import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MockExamAdmin } from "@/components/MockExamAdmin";

type Exam = {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  question_count: number;
  status: "draft" | "open" | "closed";
};

type RegRow = { exam_id: string };

function statusBadge(status: string) {
  if (status === "open") return <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-300">Ouvert</span>;
  if (status === "closed") return <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/40">Clôturé</span>;
  return <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">À venir</span>;
}

export default async function MockExamsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const [examsRes, regsRes, adminRes] = await Promise.all([
    supabase
      .from("mock_exams")
      .select("id,title,description,scheduled_at,duration_minutes,question_count,status")
      .order("scheduled_at", { ascending: false }),
    supabase
      .from("mock_exam_registrations")
      .select("exam_id")
      .eq("user_id", auth.user.id),
    supabase.rpc("is_app_admin"),
  ]);

  const exams = (examsRes.data ?? []) as Exam[];
  const myRegs = new Set((regsRes.data ?? []).map((r: RegRow) => r.exam_id));
  const isAdmin = adminRes.data === true;

  const upcoming = exams.filter((e) => e.status !== "closed");
  const past = exams.filter((e) => e.status === "closed");

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Examens blancs</h1>
        <p className="mt-1 text-sm text-white/55">
          Sessions officielles chronométrées — résultats et classement partagés entre participants.
        </p>
      </div>

      {isAdmin && <MockExamAdmin exams={exams} />}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="grid gap-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/40">À venir & ouverts</div>
          {upcoming.map((e) => {
            const registered = myRegs.has(e.id);
            const date = new Date(e.scheduled_at);
            return (
              <Link key={e.id} href={`/mock-exams/${e.id}`} className="card group p-5 transition hover:border-blue-400/30 hover:bg-white/[0.02]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{e.title}</span>
                      {statusBadge(e.status)}
                      {registered && (
                        <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-300">Inscrit ✓</span>
                      )}
                    </div>
                    {e.description && (
                      <div className="mt-1 text-sm text-white/50">{e.description}</div>
                    )}
                    <div className="mt-2 text-xs text-white/40">
                      {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      {" · "}{date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      {" · "}{e.duration_minutes}min · {e.question_count} questions
                    </div>
                  </div>
                  <div className="shrink-0 text-white/30 transition group-hover:text-white/70">→</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {upcoming.length === 0 && past.length === 0 && (
        <div className="card p-8 text-center text-sm text-white/40">
          Aucun examen blanc planifié pour le moment.
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div className="grid gap-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/40">Passés</div>
          {past.map((e) => {
            const registered = myRegs.has(e.id);
            const date = new Date(e.scheduled_at);
            return (
              <Link key={e.id} href={`/mock-exams/${e.id}`} className="card group p-5 opacity-70 transition hover:opacity-100 hover:border-white/15">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{e.title}</span>
                      {statusBadge(e.status)}
                      {registered && (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/40">Participé</span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-white/40">
                      {date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      {" · "}{e.question_count} questions
                    </div>
                  </div>
                  <div className="shrink-0 text-white/20 transition group-hover:text-white/50">→</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
