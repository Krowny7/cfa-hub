import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReviserView } from "@/components/reviser/ReviserView";
import { loadSubjects } from "@/components/reviser/load";

// Espace « Réviser » : fiches, flashcards, cours complets, et
// les 10 matières avec ce qui existe vraiment pour chacune (?matiere=fsa
// ouvre directement une matière).
export default async function ReviserPage({ searchParams }: { searchParams?: Promise<{ matiere?: string }> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  let admin: SupabaseClient | null = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }

  const [subjects, sp, flashcardSets] = await Promise.all([
    loadSubjects(supabase, admin, auth.user.id),
    searchParams,
    // sets de flashcards officiels publiés (la carte « Flashcards »)
    (async () => {
      if (!admin) return null;
      try {
        const { count, error } = await admin
          .from("flashcard_sets")
          .select("id", { count: "exact", head: true })
          .eq("is_official", true)
          .eq("official_published", true);
        return error ? null : count ?? null;
      } catch {
        return null;
      }
    })(),
  ]);
  return <ReviserView subjects={subjects} matiere={sp?.matiere ?? null} flashcardSets={flashcardSets} />;
}
