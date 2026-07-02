import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SessionClient, type SetOption } from "@/components/SessionClient";

type SetRow = {
  id: string;
  title: string;
  is_official?: boolean | null;
  official_published?: boolean | null;
};

export default async function SessionPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const [qcmRes, flashRes] = await Promise.all([
    supabase
      .from("quiz_sets")
      .select("id,title,is_official,official_published")
      .order("is_official", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("flashcard_sets")
      .select("id,title")
      .order("created_at", { ascending: false }),
  ]);

  const qcmSets: SetOption[] = ((qcmRes.data ?? []) as SetRow[])
    .filter((s) => s.id && s.title)
    .map((s) => ({
      id: s.id,
      title: s.title,
      isOfficial: Boolean(s.is_official && s.official_published),
    }));

  const flashSets: SetOption[] = ((flashRes.data ?? []) as SetRow[])
    .filter((s) => s.id && s.title)
    .map((s) => ({ id: s.id, title: s.title, isOfficial: false }));

  return (
    <div className="mx-auto max-w-2xl">
      <SessionClient qcmSets={qcmSets} flashSets={flashSets} />
    </div>
  );
}
