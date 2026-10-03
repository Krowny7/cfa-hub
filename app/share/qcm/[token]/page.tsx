import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { SharedQuizView, type SharedQuestion } from "@/app/share/views";

type PageProps = { params: Promise<{ token: string }> };

export default async function ShareQcmPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();

  // RPC SECURITY DEFINER : lecture par jeton, sans passer par la RLS
  const [setRes, questionsRes] = await Promise.all([
    supabase.rpc("get_quiz_set_by_token", { p_token: token }).maybeSingle(),
    supabase.rpc("get_quiz_questions_by_share_token", { p_token: token }),
  ]);

  if (!setRes.data) notFound();

  const set = setRes.data as { id: string; title: string; visibility: string };
  const questions = (questionsRes.data ?? []) as SharedQuestion[];

  return <SharedQuizView title={set.title} questions={questions} />;
}
