import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ListeReviser } from "@/components/reviser/ListeReviser";
import { loadSubjectsSafe } from "@/components/reviser/load";
import { PlatineReprise } from "@/components/reviser/PlatineReprise";
import { RV } from "@/lib/voice-reviser";

// Cours complets : un deck PDF + un audio narré par matière, décrits dans lib/courses.ts (bucket
// privé "courses") ; celles qui n'y sont pas encore apparaissent en filigrane. Modèle des sous-pages
// (2026-11-12) : l'en-tête (« Le pupitre »), puis le cadre à zones : les cours en livrets sur le
// carrousel à gauche, et dans la colonne grise la platine qui reprend le dernier cours écouté.
export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const subjects = await loadSubjectsSafe(supabase, auth.user.id);
  return <ListeReviser kind="cours" subjects={subjects} droite={{ titre: RV.coursReprise, contenu: <PlatineReprise /> }} />;
}
