import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VueCours } from "@/components/reviser/VueCours";
import { COURS_PROGRAMME } from "@/components/reviser/parcours";

export const metadata = { title: "Cours complets · Ranked Lobby" };

// Cours complets : un deck PDF + un audio narré par matière, décrits dans lib/courses.ts (bucket privé
// "courses"). Direction « le lieu, puis l'objet » (2026-11-13) : la bibliothèque à deux étages (chaque
// livre ouvre son cours) et la platine qui joue l'audio sur place. Pour elle, l'audio des dix cours est
// signé ici en un seul aller-retour (six heures, comme la page d'un cours : une longue écoute avec des
// pauses ne tombe pas sur un lien expiré ; sinon la platine en redemande un). L'écoute est gardée sur
// l'appareil : components/reviser/EtagereCours et PlatineEcoute. Les vidéos ont leur page : /videos.
export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const chemins = COURS_PROGRAMME.map((c) => `${c.file}.mp3`);
  const { data } = await supabase.storage.from("courses").createSignedUrls(chemins, 21600);
  const sources = Object.fromEntries(
    COURS_PROGRAMME.map((c) => [c.slug, data?.find((d) => d.path === `${c.file}.mp3` && !d.error)?.signedUrl ?? null]),
  );
  return <VueCours sources={sources} />;
}
