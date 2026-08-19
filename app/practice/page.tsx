import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PracticeSession } from "@/components/PracticeSession";

type PastSession = {
  id: string;
  topics: string[];
  format: number;
  question_count: number;
  score: number;
  total: number;
  duration_seconds: number | null;
  completed_at: string;
};

export default async function PracticePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data } = await supabase
    .from("practice_session_results")
    .select("id,topics,format,question_count,score,total,duration_seconds,completed_at")
    .eq("user_id", auth.user.id)
    .order("completed_at", { ascending: false })
    .limit(20);

  const pastSessions = (data ?? []) as PastSession[];

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Entraînement ciblé</h1>
        <p className="mt-1 text-sm text-white/55">
          Choisis un ou plusieurs topics du curriculum CFA Level I : tu reçois le nombre de questions
          qu'ils représenteraient dans un vrai examen (proportions officielles), pour t'entraîner sur tes points faibles.
        </p>
      </div>

      <PracticeSession pastSessions={pastSessions} />
    </div>
  );
}
