import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PracticeSession } from "@/components/PracticeSession";
import { getTopicMastery } from "@/lib/mastery";

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

  const [{ data }, topics] = await Promise.all([
    supabase
      .from("practice_session_results")
      .select("id,topics,format,question_count,score,total,duration_seconds,completed_at")
      .eq("user_id", auth.user.id)
      .order("completed_at", { ascending: false })
      .limit(20),
    // maîtrise par matière (repli : tout à null si la table manque)
    getTopicMastery(supabase, auth.user.id).catch(() => []),
  ]);

  const pastSessions = (data ?? []) as PastSession[];
  const mastery = Object.fromEntries(topics.map((t) => [t.key, t.pct]));

  // L'en-tête vit dans PracticeSession : il disparaît pendant l'épreuve.
  return <PracticeSession pastSessions={pastSessions} mastery={mastery} />;
}
