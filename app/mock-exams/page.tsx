import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MockExamAdmin } from "@/components/MockExamAdmin";
import { MockExamListView, type MockExam } from "@/components/session/MockExamViews";
import { duelsReady } from "@/lib/duels";
import { getMockExamEloAppliedAt } from "@/lib/rating";

type RegRow = { exam_id: string };

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

  const exams = (examsRes.data ?? []) as MockExam[];
  const registeredIds = (regsRes.data ?? []).map((r: RegRow) => r.exam_id);
  const isAdmin = adminRes.data === true;
  const eloApplied = eloEnabled ? await getMockExamEloAppliedAt(supabase, exams.map((e) => e.id)) : {};

  return (
    <MockExamListView
      exams={exams}
      registeredIds={registeredIds}
      eloApplied={eloApplied}
      eloEnabled={eloEnabled}
      now={Date.now()}
      admin={isAdmin ? <MockExamAdmin exams={exams} eloAppliedAt={eloApplied} eloEnabled={eloEnabled} /> : undefined}
    />
  );
}
