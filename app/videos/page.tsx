import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VIDEOS, videosEnLigne } from "@/lib/videos";
import { VideosView, type SourceVideo } from "@/components/videos/VideosView";

// Vidéos résumé : même architecture que les cours complets (bucket privé "courses", URL signées de six heures,
// pour qu'une heure de lecture avec des pauses ne tombe pas sur un lien expiré). ?v=<slug> choisit la vidéo.
// Un seul aller-retour signe les parties de la vidéo choisie (vidéo et affiche de chacune).
export default async function VideosPage({ searchParams }: { searchParams?: Promise<{ v?: string | string[] }> }) {
  const sp = await (searchParams ?? Promise.resolve(undefined));
  const demande = Array.isArray(sp?.v) ? sp?.v[0] : sp?.v;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const enLigne = videosEnLigne();
  const video = enLigne.find((v) => v.slug === demande) ?? enLigne[0] ?? null;
  const chemins = new Set<string>();
  for (const p of video?.parties ?? []) {
    chemins.add(`${p.fichier}.mp4`);
    chemins.add(`${p.fichier}.jpg`);
  }
  const { data } = chemins.size ? await supabase.storage.from("courses").createSignedUrls([...chemins], 21600) : { data: null };
  const url = (c: string) => data?.find((d) => d.path === c && !d.error)?.signedUrl ?? null;

  const sources: SourceVideo[] = (video?.parties ?? []).map((p) => ({ src: url(`${p.fichier}.mp4`), affiche: url(`${p.fichier}.jpg`) }));
  return <VideosView key={video?.slug ?? "aucune"} videos={VIDEOS} video={video} sources={sources} />;
}
