import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MockExamAdmin } from "@/components/MockExamAdmin";
import { MockExamListView, type MockExam } from "@/components/session/MockExamViews";
import { pctOf } from "@/components/session/review";
import { duelsReady } from "@/lib/duels";
import { getMockExamEloAppliedAt } from "@/lib/rating";

// Les examens blancs (lot 4 du 2026-11-13) : la porte, puis la vitrine des packs scellés (un par
// examen, le prochain entouré, tes copies rendues tamponnées de leur score) et l'action à l'encre
// qui ouvre le prochain. Le classement général est sur /classement.
export default async function MockExamsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const uid = auth.user.id;

  const [examsRes, adminRes, eloEnabled, mesRes, inscRes] = await Promise.all([
    supabase
      .from("mock_exams")
      .select("id,title,description,scheduled_at,duration_minutes,question_count,status,window_days")
      .order("scheduled_at", { ascending: false }),
    supabase.rpc("is_app_admin"),
    duelsReady(supabase),
    // tes copies rendues (la RLS les rend lisibles), tamponnées sur leur pack
    supabase.from("mock_exam_results").select("exam_id,score,total").eq("user_id", uid),
    // tes inscriptions (la RLS ne montre que les tiennes) : la ligne d'état de la porte
    supabase.from("mock_exam_registrations").select("exam_id").eq("user_id", uid),
  ]);

  const exams = (examsRes.data ?? []) as MockExam[];
  const isAdmin = adminRes.data === true;
  const scores: Record<string, number> = {};
  for (const r of (mesRes.data ?? []) as { exam_id: string; score: number; total: number }[]) scores[r.exam_id] = pctOf(r.score, r.total);
  const eloApplied = isAdmin && eloEnabled ? await getMockExamEloAppliedAt(supabase, exams.map((e) => e.id)) : ({} as Record<string, string>);

  return (
    <MockExamListView
      exams={exams}
      eloEnabled={eloEnabled}
      scores={scores}
      now={Date.now()}
      inscrits={((inscRes.data ?? []) as { exam_id: string }[]).map((r) => r.exam_id)}
      admin={isAdmin ? <MockExamAdmin exams={exams} eloAppliedAt={eloApplied} eloEnabled={eloEnabled} /> : undefined}
    />
  );
}
