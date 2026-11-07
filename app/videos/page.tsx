import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VIDEOS, videosEnLigne } from "@/lib/videos";
import { VideosView, type SourceVideo } from "@/components/videos/VideosView";

// Vidéos résumé : même architecture que les cours complets (bucket privé "courses", URL signées de six heures,
// pour qu'une heure de lecture avec des pauses ne tombe pas sur un lien expiré). ?v=<slug> choisit la vidéo.
export default async function VideosPage({ searchParams }: { searchParams?: Promise<{ v?: string | string[] }> }) {
  const sp = await (searchParams ?? Promise.resolve(undefined));
  const demande = Array.isArray(sp?.v) ? sp?.v[0] : sp?.v;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const enLigne = videosEnLigne();
  const video = enLigne.find((v) => v.slug === demande) ?? enLigne[0] ?? null;
  let sources: SourceVideo[] = [];
  if (video) {
    const chemins = video.parties.flatMap((p) => [`${p.fichier}.mp4`, `${p.fichier}.jpg`]);
    const { data } = await supabase.storage.from("courses").createSignedUrls(chemins, 21600);
    const url = (c: string) => data?.find((d) => d.path === c && !d.error)?.signedUrl ?? null;
    sources = video.parties.map((p) => ({ src: url(`${p.fichier}.mp4`), affiche: url(`${p.fichier}.jpg`) }));
  }
  return <VideosView videos={VIDEOS} video={video} sources={sources} />;
}
