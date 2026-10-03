import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { QuizSetView } from "@/components/QuizSetView";
import { ShareButton } from "@/components/ShareButton";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import {
  ContentDetailHeader,
  cleanFolderName,
  plural,
  splitTitle,
  subjectOfFolder,
  subjectOfTitle,
  visibilityLabel,
} from "@/components/ContentDetailHeader";
import { ContentItemSettings } from "@/components/ContentItemSettings";
import { RecentFlashcardSetTracker } from "@/components/RecentFlashcardSetTracker";
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

/** Questions de ce QCM déjà réussies par le joueur (repli : null). */
async function countDone(supabase: SupabaseClient, userId: string, questionIds: string[]): Promise<number | null> {
  if (!questionIds.length) return null;
  try {
    const { data, error } = await supabase.from("quiz_question_progress").select("question_id").eq("user_id", userId).in("question_id", questionIds);
    if (error) return null;
    return data?.length ?? 0;
  } catch {
    return null;
  }
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
      <div className="mx-auto grid max-w-[560px] justify-items-start gap-3 pt-4 md:pt-10">
        <p className="t-eyebrow">QCM</p>
        <h1 className="t-h1 m-0">{t(locale, "qcm.notFound")}</h1>
        <p className="t-small">Il a peut-être été supprimé, ou il n&apos;est pas partagé avec toi.</p>
        <Link href="/qcm" className="btn btn-secondary mt-3">
          Retour aux QCM
        </Link>
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

  // correct_index/explanation ne sont envoyés que si le viewer peut éditer
  // les questions (propriétaire) — sinon un visiteur qui répond au quiz
  // verrait la bonne réponse dans le payload avant même d'avoir répondu.
  // Révélés autrement via award_quiz_question_xp après tentative.
  const initialQuestions: QuizQuestion[] = (questionsData ?? []).map((q) => ({
    ...q,
    choices: Array.isArray(q.choices) ? q.choices : [],
    correct_index: canEditQuestions ? q.correct_index : undefined,
    explanation: canEditQuestions ? q.explanation : undefined,
  })) as QuizQuestion[];

  const done = isOfficial ? await countDone(supabase, user.id, initialQuestions.map((q) => q.id)) : null;

  const parts = splitTitle(set.title);
  const subject = subjectOfFolder(folderName) ?? subjectOfTitle(set.title);
  const eyebrow = [subject?.name, parts.lead].filter(Boolean).join(" · ") || null;
  const meta = [
    plural(initialQuestions.length, "question", "questions"),
    isOfficial ? "Système" : visibilityLabel(set.visibility),
    !isOfficial && !subject ? cleanFolderName(folderName) : null,
  ];

  return (
    <div className="mx-auto flex w-full max-w-[780px] flex-col gap-8 md:gap-10">
      <RecentFlashcardSetTracker id={set.id} title={set.title} kind="qcm" />

      <ContentDetailHeader
        backHref="/qcm"
        backLabel={t(locale, "nav.qcm")}
        title={parts.main}
        eyebrow={eyebrow}
        meta={meta}
        rightSlot={set.share_token ? <ShareButton token={set.share_token} base="qcm" /> : null}
      />

      <QuizSetView
        setId={set.id}
        isOwner={canEditQuestions}
        initialQuestions={initialQuestions}
        title={set.title}
        official={isOfficial}
        done={done}
        settingsSlot={
          isOwner ? (
            <ContentItemSettings
              title="Réglages"
              itemTitle={set.title}
              subtitle="Titre, dossier et partage"
              itemId={set.id}
              table="quiz_sets"
              visibility={set.visibility}
              folderId={set.folder_id ?? null}
              folderKind="quizzes"
              shareTable="quiz_set_shares"
              shareFk="set_id"
              rootLabel={t(locale, "common.noFolder")}
              activeGroupId={activeGroupId}
              initialSharedGroupIds={sharedGroupIds}
              legacyGroupId={set.group_id ?? null}
            />
          ) : null
        }
      />
    </div>
  );
}
