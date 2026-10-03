import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReviserView } from "@/components/reviser/ReviserView";
import { loadSubjects } from "@/components/reviser/load";

// Espace « Réviser » : fiches, cours complets, flashcards, bibliothèque, et
// les 10 matières avec ce qui existe vraiment pour chacune.
export default async function ReviserPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  let admin: SupabaseClient | null = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }

  const subjects = await loadSubjects(supabase, admin, auth.user.id);
  return <ReviserView subjects={subjects} />;
}
