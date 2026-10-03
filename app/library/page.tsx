import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUBJECTS } from "@/components/reviser/catalog";
import { LibraryView, type LibraryDoc } from "@/components/DocumentList";

// Bibliothèque n'est plus une liste de liens PDF gérée par les utilisateurs —
// c'est un point d'entrée vers les fonds de contenu Système : Fiches de
// révision, Flashcards, et Cours complets. Le contenu communautaire
// (documents, liens) n'est plus mis en avant ; la table `documents` reste en
// base. Les liens déjà ajoutés par le joueur restent accessibles en bas de
// page (« Tes documents »), seulement s'il en a.
export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const fiches = SUBJECTS.filter((s) => s.fiche).length;
  const courses = SUBJECTS.filter((s) => s.course).length;

  const [setsCount, docs] = await Promise.all([
    (async () => {
      try {
        const admin = createAdminClient();
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
    (async () => {
      try {
        const { data, error } = await supabase
          .from("documents")
          .select("id,title,visibility,created_at,external_url,preview_url,library_folders(name)")
          .eq("owner_id", auth.user!.id)
          .order("created_at", { ascending: false })
          .limit(50);
        return error ? [] : ((data ?? []) as unknown as LibraryDoc[]);
      } catch {
        return [];
      }
    })(),
  ]);

  return <LibraryView fiches={fiches} courses={courses} flashcardSets={setsCount} docs={docs} />;
}
