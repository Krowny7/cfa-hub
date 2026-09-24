import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/OnboardingForm";
import type { Profile } from "@/lib/types";

export default async function OnboardingPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // same-site paths only: "//host" or "/\host" would leave the site
  const target = next && /^\/(?![/\\])/.test(next) ? next : "/dashboard";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("username,avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileData as Pick<Profile, "username" | "avatar_url"> | null;

  // Already complete — nothing to force, send them straight through
  // (someone navigating back here manually, or a stale "next" link).
  if (profile?.username && profile?.avatar_url) {
    redirect(target);
  }

  return (
    <OnboardingForm
      initialUsername={profile?.username ?? null}
      initialAvatarUrl={profile?.avatar_url ?? null}
      next={target}
    />
  );
}
