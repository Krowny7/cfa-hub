import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VIDEOS, choisirVideo } from "@/lib/videos";
import { VideosView, type SourceVideo } from "@/components/videos/VideosView";

// La page des vidéos (2026-11-13) : la télé et ses trois chaînes (Introduction, Cours, Résumé ; lib/videos).
// Même architecture que les cours complets : bucket privé "courses", URL signées de six heures, pour qu'une heure de
// lecture avec des pauses ne tombe pas sur un lien expiré. ?v=<slug> joue une vidéo (et règle sa chaîne),
// ?chaine=intro|cours|resume choisit une chaîne ; sans rien, la chaîne qui a du contenu. Un seul aller-retour signe
// les parties de la vidéo à l'écran (vidéo et affiche de chacune).
export default async function VideosPage({ searchParams }: { searchParams?: Promise<{ v?: string | string[]; chaine?: string | string[] }> }) {
  const sp = await (searchParams ?? Promise.resolve(undefined));
  const premier = (x?: string | string[]) => (Array.isArray(x) ? x[0] : x);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { chaine, video, choix } = choisirVideo(premier(sp?.v), premier(sp?.chaine));
  const chemins = new Set<string>();
  for (const p of video?.parties ?? []) {
    chemins.add(`${p.fichier}.mp4`);
    chemins.add(`${p.fichier}.jpg`);
  }
  const { data } = chemins.size ? await supabase.storage.from("courses").createSignedUrls([...chemins], 21600) : { data: null };
  const url = (c: string) => data?.find((d) => d.path === c && !d.error)?.signedUrl ?? null;

  const sources: SourceVideo[] = (video?.parties ?? []).map((p) => ({ src: url(`${p.fichier}.mp4`), affiche: url(`${p.fichier}.jpg`) }));
  return <VideosView key={`${chaine}:${video?.slug ?? "-"}`} videos={VIDEOS} chaine={chaine} video={video} sources={sources} choix={choix} />;
}
