import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { GroupRow } from "@/components/GroupSettings";
import { PageHero } from "@/components/ui/Titles";
import { SettingsPanel } from "@/components/moi/SettingsPanel";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Réglages · Ranked Lobby" };

// Réglages (espace Moi) : profil, date d'examen, apparence, groupes,
// déconnexion. Le même panneau est repris en bas de /moi.
export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const [{ data: profileData }, { data: groupsData }] = await Promise.all([
    supabase.from("profiles").select("active_group_id").eq("id", user.id).maybeSingle(),
    supabase.from("group_memberships").select("group_id, study_groups(id,name,invite_code)").eq("user_id", user.id),
  ]);

  const activeGroupId = (profileData as Pick<Profile, "active_group_id"> | null)?.active_group_id ?? null;

  return (
    <div className="rl-wide flex flex-col gap-8">
      <PageHero kicker="Moi" title="Réglages">
        <Link href="/moi" className="chip rl-press">
          ← Retour à mon espace
        </Link>
      </PageHero>
      <SettingsPanel activeGroupId={activeGroupId} groups={(groupsData ?? []) as unknown as GroupRow[]} />
    </div>
  );
}
