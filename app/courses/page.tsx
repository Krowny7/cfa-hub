import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BandeListe, ListeReviser } from "@/components/reviser/ListeReviser";
import { loadSubjectsSafe } from "@/components/reviser/load";

// Cours complets : un deck PDF + un audio narré par matière, décrits dans
// lib/courses.ts (bucket privé "courses") ; celles qui n'y sont pas encore
// apparaissent « à venir ». Gabarit commun des listes de Réviser (carte du
// lieu « Le pupitre »).
export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const subjects = await loadSubjectsSafe(supabase, auth.user.id);
  return <ListeReviser kind="cours" subjects={subjects} bande={<BandeListe kind="cours" subjects={subjects} />} />;
}
