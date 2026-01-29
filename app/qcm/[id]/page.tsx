import { createClient } from "@/lib/supabase/server";
import { QuizSetView } from "@/components/QuizSetView";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { ContentDetailHeader } from "@/components/ContentDetailHeader";
import { ContentItemSettings } from "@/components/ContentItemSettings";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function isMemberOfGroup(supabase: any, userId: string, groupId: string | null) {
  if (!groupId) return false;
  const { data } = await supabase
    .from("group_memberships")
    .select("group_id")
    .eq("user_id", userId)
    .eq("group_id", groupId)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

async function hasAnyShareRowForSet(supabase: any, setId: string) {
  // RLS: members will only see shares for groups they're in; owners see all.
  const { data } = await supabase.from("quiz_set_shares").select("group_id").eq("set_id", setId).limit(1);
  return (data?.length ?? 0) > 0;
}

export default async function QuizSetPage({ params }: PageProps) {
  const { id } = await params;

  const locale = await getLocale();
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-5xl overflow-x-hidden">
        <h1 className="text-2xl font-semibold">{t(locale, "auth.login")}</h1>
      </div>
    );
  }

  const { data: set } = await supabase
    .from("quiz_sets")
    .select("id,title,owner_id,visibility,folder_id,group_id,library_folders(name)")
    .eq("id", id)
    .maybeSingle();

  if (!set) {
    return (
      <div className="mx-auto w-full max-w-5xl overflow-x-hidden">
        <h1 className="text-2xl font-semibold">{t(locale, "qcm.notFound")}</h1>
        <p className="mt-2 text-sm opacity-70">{t(locale, "qcm.notFoundDesc")}</p>
      </div>
    );
  }

  const folderName = (set as any)?.library_folders?.name ?? null;
  const isOwner = (set as any).owner_id === user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_group_id")
    .eq("id", user.id)
    .maybeSingle();

  const activeGroupId = (profile as any)?.active_group_id ?? null;

  // --- Permissions per your rules:
  // private: owner only
  // public: creator (owner) only
  // groups/group: member OR owner
  const visibility = String((set as any).visibility ?? "private");
  const legacyMember = await isMemberOfGroup(supabase, user.id, (set as any).group_id ?? null);
  const sharedMember = await hasAnyShareRowForSet(supabase, (set as any).id);

  const isGroups = visibility === "group" || visibility === "groups";
  const canEditQuestions = isOwner || (isGroups && (legacyMember || sharedMember));

  // settings panel: keep OWNER-ONLY (avoid share-sync issues for non-owner)
  let sharedGroupIds: string[] = [];
  if (isOwner) {
    const { data: shares } = await supabase.from("quiz_set_shares").select("group_id").eq("set_id", (set as any).id);
    sharedGroupIds = (shares ?? []).map((s: any) => s.group_id).filter(Boolean);
  }

  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id,prompt,choices,correct_index,explanation,position")
    .eq("set_id", (set as any).id)
    .order("position", { ascending: true });

  const initialQuestions = (questions ?? []).map((q: any) => ({
    ...q,
    choices: Array.isArray(q.choices) ? q.choices : []
  }));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 overflow-x-hidden">
      <ContentDetailHeader
        backHref="/qcm"
        backLabel={t(locale, "nav.qcm")}
        title={(set as any).title}
        visibility={(set as any).visibility}
        folderName={folderName}
      />

      {isOwner ? (
        <div>
          <ContentItemSettings
            title={t(locale, "common.settings")}
            subtitle={
              locale === "fr" ? "Renommer, classer et gérer la visibilité." : "Rename, organize and manage visibility."
            }
            itemId={(set as any).id}
            table="quiz_sets"
            visibility={(set as any).visibility}
            folderId={(set as any).folder_id ?? null}
            folderKind="quizzes"
            shareTable="quiz_set_shares"
            shareFk="set_id"
            rootLabel={locale === "fr" ? "Sans dossier" : "No folder"}
            activeGroupId={activeGroupId}
            initialSharedGroupIds={sharedGroupIds}
            legacyGroupId={(set as any).group_id ?? null}
          />
</div>
      ) : null}

      <div>
        {/* IMPORTANT: we pass canEditQuestions into isOwner prop (component uses it as "can edit") */}
        <QuizSetView setId={(set as any).id} isOwner={canEditQuestions} initialQuestions={initialQuestions as any} />
      </div>
    </div>
  );
}