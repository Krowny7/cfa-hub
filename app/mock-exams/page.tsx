import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MockExamAdmin } from "@/components/MockExamAdmin";
import { PageHero, SectionTitle } from "@/components/ui/Titles";
import { duelsReady } from "@/lib/duels";
import { getMockExamEloAppliedAt } from "@/lib/rating";

type Exam = {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  question_count: number;
  status: "draft" | "open" | "closed";
  window_days: number | null;
};

type RegRow = { exam_id: string };

function statusBadge(status: string) {
  if (status === "open") return <span className="badge badge-public">Ouvert</span>;
  if (status === "closed") return <span className="badge badge-neutral">Clôturé</span>;
  return <span className="badge badge-shared">À venir</span>;
}

export default async function MockExamsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const [examsRes, regsRes, adminRes, eloEnabled] = await Promise.all([
    supabase
      .from("mock_exams")
      .select("id,title,description,scheduled_at,duration_minutes,question_count,status,window_days")
      .order("scheduled_at", { ascending: false }),
    supabase
      .from("mock_exam_registrations")
      .select("exam_id")
      .eq("user_id", auth.user.id),
    supabase.rpc("is_app_admin"),
    duelsReady(supabase),
  ]);

  const exams = (examsRes.data ?? []) as Exam[];
  const myRegs = new Set((regsRes.data ?? []).map((r: RegRow) => r.exam_id));
  const isAdmin = adminRes.data === true;
  const eloApplied = eloEnabled ? await getMockExamEloAppliedAt(supabase, exams.map((e) => e.id)) : {};

  const upcoming = exams.filter((e) => e.status !== "closed");
  const past = exams.filter((e) => e.status === "closed");

  return (
    <div className="grid gap-7">
      <PageHero kicker="Classement · examens blancs" title="Examens blancs classés">
        <span className="chip">Chronométrés</span>
        <span className="chip">Classement entre participants</span>
        {eloEnabled && <span className="chip">Comptent pour ton ELO</span>}
      </PageHero>
      <p className="m-0 max-w-[640px] text-[15px] leading-normal text-muted">
        Sessions programmées, chronométrées, au format de l&apos;examen. Résultats et classement sont partagés entre participants
        {eloEnabled ? " ; à la clôture, chacun gagne ou perd de l'ELO selon sa place face aux autres." : "."}
      </p>

      {isAdmin && <MockExamAdmin exams={exams} eloAppliedAt={eloApplied} eloEnabled={eloEnabled} />}

      {upcoming.length > 0 && (
        <section className="grid gap-3">
          <SectionTitle title="À venir et ouverts" />
          {upcoming.map((e, i) => {
            const registered = myRegs.has(e.id);
            const date = new Date(e.scheduled_at);
            return (
              <Link
                key={e.id}
                href={`/mock-exams/${e.id}`}
                className="card rl-lift rl-in group p-5"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[17px] font-bold tracking-[-0.01em]">{e.title}</span>
                      {statusBadge(e.status)}
                      {registered && (
                        <span className="badge badge-shared gap-1">
                          <Check size={11} aria-hidden /> Inscrit
                        </span>
                      )}
                    </div>
                    {e.description && <div className="mt-1 text-sm text-muted">{e.description}</div>}
                    <div className="mt-2 text-[13px] text-muted">
                      {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })}
                      {" · "}
                      {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}
                      {" · "}
                      {e.duration_minutes} min · {e.question_count} questions
                    </div>
                  </div>
                  <ArrowRight size={18} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                </div>
              </Link>
            );
          })}
        </section>
      )}

      {upcoming.length === 0 && past.length === 0 && (
        <div className="card p-8 text-center text-sm text-muted">Aucun examen blanc planifié pour le moment.</div>
      )}

      {past.length > 0 && (
        <section className="grid gap-3">
          <SectionTitle title="Passés" />
          {past.map((e) => {
            const registered = myRegs.has(e.id);
            const date = new Date(e.scheduled_at);
            return (
              <Link key={e.id} href={`/mock-exams/${e.id}`} className="card rl-lift group p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{e.title}</span>
                      {statusBadge(e.status)}
                      {registered && <span className="badge badge-shared">Participé</span>}
                      {eloApplied[e.id] && <span className="badge badge-neutral">ELO appliqué</span>}
                    </div>
                    <div className="mt-1 text-[13px] text-muted">
                      {date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })}
                      {" · "}
                      {e.question_count} questions
                    </div>
                  </div>
                  <ArrowRight size={18} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
