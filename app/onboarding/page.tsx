import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/OnboardingForm";

export const metadata = { title: "Ton premier trait · Ranked Lobby" };

type ProfileRow = { username: string | null; avatar_url: string | null; exam_date?: string | null } | null;

// Première connexion : le premier trait (pseudo, jour J, sceau ; photo
// facultative). Le middleware y renvoie tant qu'il manque le pseudo.
// ?rejouer=1 : rejoué depuis Moi › Réglages, même si le profil est complet.
export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string; rejouer?: string }> }) {
  const { next, rejouer } = await searchParams;
  const replay = rejouer === "1";
  // same-site paths only: "//host" or "/\host" would leave the site
  const target = next && /^\/(?![/\\])/.test(next) ? next : replay ? "/moi?onglet=reglages" : "/dashboard";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  // exam_date peut manquer sur une ancienne base : repli sans elle
  let profile: ProfileRow = null;
  const full = await supabase.from("profiles").select("username,avatar_url,exam_date").eq("id", user.id).maybeSingle();
  if (!full.error) profile = full.data as ProfileRow;
  else profile = (await supabase.from("profiles").select("username,avatar_url").eq("id", user.id).maybeSingle()).data as ProfileRow;

  // Déjà un pseudo : rien à imposer (retour manuel ici, ou lien « next »
  // périmé), sauf pour rejouer le premier trait.
  if (profile?.username && !replay) redirect(target);

  return (
    <OnboardingForm
      initialUsername={profile?.username ?? null}
      initialAvatarUrl={profile?.avatar_url ?? null}
      initialExamDate={profile?.exam_date ?? null}
      next={target}
      replay={replay && Boolean(profile?.username)}
    />
  );
}
