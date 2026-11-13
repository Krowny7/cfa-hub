import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VueCours } from "@/components/reviser/VueCours";

export const metadata = { title: "Cours complets · Ranked Lobby" };

// Cours complets : un deck PDF + un audio narré par matière, décrits dans lib/courses.ts (bucket privé
// "courses"). Direction « le lieu, puis l'objet » (2026-11-13) : les livrets debout, la platine qui
// reprend le dernier cours écouté, et le rayon des vidéos de révision (/videos redirige ici, le
// lecteur reste sur /videos?v=…). L'écoute est gardée sur l'appareil : components/reviser/EtagereCours.
export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  return <VueCours />;
}
