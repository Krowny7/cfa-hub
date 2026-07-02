import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GroupSettings, type GroupRow } from "@/components/GroupSettings";
import { ProfileSettings } from "@/components/ProfileSettings";
import { ExamDateSettings } from "@/components/ExamDateSettings";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import type { Profile } from "@/lib/types";

export default async function SettingsPage() {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const [{ data: profileData }, { data: groupsData }] = await Promise.all([
    supabase.from("profiles").select("active_group_id").eq("id", user.id).maybeSingle(),
    supabase.from("group_memberships").select("group_id, study_groups(id,name,invite_code)").eq("user_id", user.id),
  ]);

  const activeGroupId =
    (profileData as Pick<Profile, "active_group_id"> | null)?.active_group_id ?? null;

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t(locale, "settings.title")}</h1>
        <p className="mt-1 text-sm text-white/60">{t(locale, "settings.subtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <ProfileSettings />
        <GroupSettings
          activeGroupId={activeGroupId}
          groups={(groupsData ?? []) as unknown as GroupRow[]}
        />
      </div>

      <ExamDateSettings />
    </div>
  );
}
