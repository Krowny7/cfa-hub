import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MockExamAdmin } from "@/components/MockExamAdmin";
import { MockExamListView, type MockExam } from "@/components/session/MockExamViews";
import type { Ligne } from "@/components/ui/Decors";
import { displayName } from "@/components/classement/format";
import { duelsReady } from "@/lib/duels";
import { getLeaderboard, getLeaderboardRank, getMockExamEloAppliedAt, getMyRating } from "@/lib/rating";
import { SOUS_AFFRONTER } from "@/lib/voice-affronter-sous";
import { rangOrdinal } from "@/lib/voice-z2c";

const E = SOUS_AFFRONTER.examens;

// Les examens blancs : l'en-tête commun, puis le carrousel des examens (ouvert sur le prochain) et,
// dans la colonne grise, le classement général en court (les premiers, et ta ligne si tu es plus bas).
export default async function MockExamsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const uid = auth.user.id;

  const [examsRes, adminRes, eloEnabled, top, mine] = await Promise.all([
    supabase
      .from("mock_exams")
      .select("id,title,description,scheduled_at,duration_minutes,question_count,status,window_days")
      .order("scheduled_at", { ascending: false }),
    supabase.rpc("is_app_admin"),
    duelsReady(supabase),
    getLeaderboard(supabase, 5),
    getMyRating(supabase, uid),
  ]);

  const exams = (examsRes.data ?? []) as MockExam[];
  const isAdmin = adminRes.data === true;
  // hors des cinq premiers : ta place, à la cinquième ligne
  const dedans = top.some((r) => r.userId === uid);
  const [eloApplied, rang] = await Promise.all([
    isAdmin && eloEnabled ? getMockExamEloAppliedAt(supabase, exams.map((e) => e.id)) : Promise.resolve({} as Record<string, string>),
    dedans || top.length === 0 ? Promise.resolve(null) : getLeaderboardRank(supabase, uid, mine.elo),
  ]);

  const classement: Ligne[] = [
    ...(rang !== null ? top.slice(0, 4) : top).map((r) => ({
      cle: r.userId,
      titre: `${rangOrdinal(r.rank)} · ${r.userId === uid ? E.toi : displayName(r.username, r.userId)}`,
      detail: E.elo(r.elo),
      href: `/people/${r.userId}`,
      marque: r.userId === uid,
    })),
    ...(rang !== null ? [{ cle: uid, titre: `${rangOrdinal(rang)} · ${E.toi}`, detail: E.elo(mine.elo), marque: true }] : []),
  ];

  return (
    <MockExamListView
      exams={exams}
      eloEnabled={eloEnabled}
      classement={classement}
      admin={isAdmin ? <MockExamAdmin exams={exams} eloAppliedAt={eloApplied} eloEnabled={eloEnabled} /> : undefined}
    />
  );
}
