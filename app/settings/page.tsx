import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GroupSettings } from "@/components/GroupSettings";
import { ProfileSettings } from "@/components/ProfileSettings";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";

export default async function SettingsPage() {
  const locale = await getLocale();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/login");

  const [{ data: profile }, { data: groups }] = await Promise.all([
    supabase.from("profiles").select("active_group_id").eq("id", user.id).maybeSingle(),
    supabase.from("group_memberships").select("group_id, study_groups(id,name,invite_code)").eq("user_id", user.id)
  ]);

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border p-6">
        <h1 className="text-xl font-semibold">{t(locale, "settings.title")}</h1>
        <p className="mt-2 text-sm opacity-80">{t(locale, "settings.subtitle")}</p>
      </div>

      <ProfileSettings />

      <GroupSettings activeGroupId={((profile as any)?.active_group_id ?? null) as any} groups={(groups ?? []) as any} />
    </div>
  );
}
