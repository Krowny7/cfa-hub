import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ExerciseSetView } from "@/components/ExerciseSetView";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { ContentDetailHeader } from "@/components/ContentDetailHeader";
import { ContentItemSettings } from "@/components/ContentItemSettings";
import { RecentFlashcardSetTracker } from "@/components/RecentFlashcardSetTracker";
import type { ExerciseQuestion, Visibility } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type ExerciseSetRow = {
  id: string;
  title: string;
  owner_id: string;
  visibility: Visibility;
  folder_id: string | null;
  group_id: string | null;
  library_folders: { name: string } | null;
};

type PageProps = { params: Promise<{ id: string }> };

async function isMemberOfGroup(supabase: SupabaseClient, userId: string, groupId: string | null): Promise<boolean> {
  if (!groupId) return false;
  const { data } = await supabase.from("group_memberships").select("group_id").eq("user_id", userId).eq("group_id", groupId).limit(1);
  return (data?.length ?? 0) > 0;
}

async function hasAnyShareRowForSet(supabase: SupabaseClient, setId: string): Promise<boolean> {
  const { data } = await supabase.from("exercise_set_shares").select("group_id").eq("set_id", setId).limit(1);
  return (data?.length ?? 0) > 0;
}

export default async function ExerciseSetPage({ params }: PageProps) {
  const { id } = await params;
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: setData } = await admin
    .from("exercise_sets")
    .select("id,title,owner_id,visibility,folder_id,group_id,is_official,official_published,library_folders(name)")
    .eq("id", id)
    .maybeSingle();

  if (!setData) {
    return (
      <div className="grid gap-3">
        <h1 className="text-xl font-semibold">{t(locale, "exercises.notFound")}</h1>
        <p className="text-sm text-white/60">{t(locale, "exercises.notFoundDesc")}</p>
      </div>
    );
  }

  const set = setData as unknown as ExerciseSetRow & { is_official: boolean; official_published: boolean };
  const folderName = set.library_folders?.name ?? null;
  const isOwner = set.owner_id === user.id;
  const isSystem = set.is_official && set.official_published;
  const isPublic = set.visibility === "public";

  const { data: profile } = await supabase.from("profiles").select("active_group_id").eq("id", user.id).maybeSingle();
  const activeGroupId = (profile as { active_group_id: string | null } | null)?.active_group_id ?? null;

  const visibility = set.visibility ?? "private";
  const isGroups = visibility === "group" || visibility === "groups";

  const [legacyMember, sharedMember] = await Promise.all([
    isMemberOfGroup(supabase, user.id, set.group_id ?? null),
    hasAnyShareRowForSet(supabase, set.id),
  ]);

  const hasAccess = isOwner || isSystem || isPublic || (isGroups && (legacyMember || sharedMember));
  if (!hasAccess) redirect("/exercises");

  const canEditQuestions = isOwner || (isGroups && (legacyMember || sharedMember));

  let sharedGroupIds: string[] = [];
  if (isOwner) {
    const { data: shares } = await supabase.from("exercise_set_shares").select("group_id").eq("set_id", set.id);
    sharedGroupIds = (shares ?? []).map((s: { group_id: string }) => s.group_id).filter(Boolean);
  }

  const qClient = isSystem ? admin : supabase;
  const { data: questionsData } = await qClient
    .from("exercise_questions")
    .select("id,set_id,prompt,correct_answer,tolerance,unit,explanation,position")
    .eq("set_id", set.id)
    .order("position", { ascending: true });

  // correct_answer/tolerance/explanation ne sont envoyés que si le viewer
  // peut éditer les questions (propriétaire) — voir la même remarque dans
  // app/qcm/[id]/page.tsx. Révélés via award_exercise_xp après tentative.
  const initialQuestions: ExerciseQuestion[] = (questionsData ?? []).map((q) => ({
    ...q,
    correct_answer: canEditQuestions ? q.correct_answer : undefined,
    tolerance: canEditQuestions ? q.tolerance : undefined,
    explanation: canEditQuestions ? q.explanation : undefined,
  })) as ExerciseQuestion[];

  return (
    <div className="grid gap-5">
      <RecentFlashcardSetTracker id={set.id} title={set.title} kind="exercises" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <ContentDetailHeader
          backHref="/exercises"
          backLabel={t(locale, "nav.exercises")}
          title={set.title}
          visibility={set.visibility}
          folderName={folderName}
        />
      </div>

      {isOwner && (
        <ContentItemSettings
          title={t(locale, "common.settings")}
          subtitle={t(locale, "exercises.settingsSubtitle")}
          itemId={set.id}
          table="exercise_sets"
          visibility={set.visibility}
          folderId={set.folder_id ?? null}
          folderKind="exercises"
          shareTable="exercise_set_shares"
          shareFk="set_id"
          rootLabel={locale === "fr" ? "Sans dossier" : "No folder"}
          activeGroupId={activeGroupId}
          initialSharedGroupIds={sharedGroupIds}
          legacyGroupId={set.group_id ?? null}
        />
      )}

      <ExerciseSetView setId={set.id} isOwner={canEditQuestions} initialQuestions={initialQuestions} />
    </div>
  );
}
