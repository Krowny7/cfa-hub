import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { QuizSetView } from "@/components/QuizSetView";
import { ShareButton } from "@/components/ShareButton";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { ContentDetailHeader } from "@/components/ContentDetailHeader";
import { ContentItemSettings } from "@/components/ContentItemSettings";
import type { QuizQuestion, Visibility } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type QuizSetRow = {
  id: string;
  title: string;
  owner_id: string;
  visibility: Visibility;
  folder_id: string | null;
  group_id: string | null;
  share_token: string | null;
  library_folders: { name: string } | null;
};

type PageProps = { params: Promise<{ id: string }> };

async function isMemberOfGroup(supabase: SupabaseClient, userId: string, groupId: string | null): Promise<boolean> {
  if (!groupId) return false;
  const { data } = await supabase.from("group_memberships").select("group_id").eq("user_id", userId).eq("group_id", groupId).limit(1);
  return (data?.length ?? 0) > 0;
}

async function hasAnyShareRowForSet(supabase: SupabaseClient, setId: string): Promise<boolean> {
  const { data } = await supabase.from("quiz_set_shares").select("group_id").eq("set_id", setId).limit(1);
  return (data?.length ?? 0) > 0;
}

export default async function QuizSetPage({ params }: PageProps) {
  const { id } = await params;
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // Fetch with admin client (bypasses RLS), then enforce access manually below.
  const { data: setData } = await admin
    .from("quiz_sets")
    .select("id,title,owner_id,visibility,folder_id,group_id,share_token,is_official,official_published,library_folders(name)")
    .eq("id", id)
    .maybeSingle();

  if (!setData) {
    return (
      <div className="grid gap-3">
        <h1 className="text-xl font-semibold">{t(locale, "qcm.notFound")}</h1>
        <p className="text-sm text-white/60">{t(locale, "qcm.notFoundDesc")}</p>
      </div>
    );
  }

  const set = setData as unknown as QuizSetRow & { is_official: boolean; official_published: boolean };
  const folderName = set.library_folders?.name ?? null;
  const isOwner = set.owner_id === user.id;
  const isOfficial = set.is_official && set.official_published;
  const isPublic = set.visibility === "public";

  const { data: profile } = await supabase.from("profiles").select("active_group_id").eq("id", user.id).maybeSingle();
  const activeGroupId = (profile as { active_group_id: string | null } | null)?.active_group_id ?? null;

  const visibility = set.visibility ?? "private";
  const isGroups = visibility === "group" || visibility === "groups";

  const [legacyMember, sharedMember] = await Promise.all([
    isMemberOfGroup(supabase, user.id, set.group_id ?? null),
    hasAnyShareRowForSet(supabase, set.id),
  ]);

  // Manual access check (mirrors RLS policy)
  const hasAccess = isOwner || isOfficial || isPublic || (isGroups && (legacyMember || sharedMember));
  if (!hasAccess) redirect("/qcm");

  const canEditQuestions = isOwner || (isGroups && (legacyMember || sharedMember));

  let sharedGroupIds: string[] = [];
  if (isOwner) {
    const { data: shares } = await supabase.from("quiz_set_shares").select("group_id").eq("set_id", set.id);
    sharedGroupIds = (shares ?? []).map((s: { group_id: string }) => s.group_id).filter(Boolean);
  }

  // Use admin client for questions when the set is official (questions RLS mirrors set RLS).
  const qClient = isOfficial ? admin : supabase;
  const { data: questionsData } = await qClient
    .from("quiz_questions")
    .select("id,prompt,choices,correct_index,explanation,position")
    .eq("set_id", set.id)
    .order("position", { ascending: true });

  const initialQuestions: QuizQuestion[] = (questionsData ?? []).map((q) => ({
    ...q,
    choices: Array.isArray(q.choices) ? q.choices : [],
  })) as QuizQuestion[];

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <ContentDetailHeader
          backHref="/qcm"
          backLabel={t(locale, "nav.qcm")}
          title={set.title}
          visibility={set.visibility}
          folderName={folderName}
        />
        {set.share_token && (
          <ShareButton token={set.share_token} base="qcm" />
        )}
      </div>

      {isOwner && (
        <ContentItemSettings
          title={t(locale, "common.settings")}
          subtitle={t(locale, "qcm.settingsSubtitle")}
          itemId={set.id}
          table="quiz_sets"
          visibility={set.visibility}
          folderId={set.folder_id ?? null}
          folderKind="quizzes"
          shareTable="quiz_set_shares"
          shareFk="set_id"
          rootLabel={locale === "fr" ? "Sans dossier" : "No folder"}
          activeGroupId={activeGroupId}
          initialSharedGroupIds={sharedGroupIds}
          legacyGroupId={set.group_id ?? null}
        />
      )}

      <QuizSetView setId={set.id} isOwner={canEditQuestions} initialQuestions={initialQuestions} />
    </div>
  );
}
