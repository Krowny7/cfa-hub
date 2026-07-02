import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { ContentDetailHeader } from "@/components/ContentDetailHeader";
import { ContentItemSettings } from "@/components/ContentItemSettings";
import { DocumentActions } from "@/components/DocumentActions";
import type { Visibility } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type PageProps = { params: Promise<{ id: string }> };

type DocumentRow = {
  id: string;
  title: string;
  external_url: string;
  preview_url: string | null;
  visibility: Visibility;
  owner_id: string;
  group_id: string | null;
  folder_id: string | null;
  library_folders: { name: string } | null;
};

async function isMemberOfGroup(supabase: SupabaseClient, userId: string, groupId: string | null): Promise<boolean> {
  if (!groupId) return false;
  const { data } = await supabase.from("group_memberships").select("group_id").eq("user_id", userId).eq("group_id", groupId).limit(1);
  return (data?.length ?? 0) > 0;
}

async function hasAnyShareRowForDoc(supabase: SupabaseClient, docId: string): Promise<boolean> {
  const { data } = await supabase.from("document_shares").select("group_id").eq("document_id", docId).limit(1);
  return (data?.length ?? 0) > 0;
}

export default async function DocumentPage({ params }: PageProps) {
  const { id } = await params;
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const { data: docData } = await supabase
    .from("documents")
    .select("id,title,external_url,preview_url,visibility,folder_id,group_id,owner_id,library_folders(name)")
    .eq("id", id)
    .maybeSingle();

  if (!docData) {
    return (
      <div className="grid gap-3">
        <h1 className="text-xl font-semibold">{t(locale, "library.empty")}</h1>
      </div>
    );
  }

  const doc = docData as unknown as DocumentRow;
  const folderName = doc.library_folders?.name ?? null;
  const isOwner = doc.owner_id === user.id;
  const isGroups = doc.visibility === "group" || doc.visibility === "groups";

  const [legacyMember, sharedMember, profileData] = await Promise.all([
    isMemberOfGroup(supabase, user.id, doc.group_id),
    hasAnyShareRowForDoc(supabase, doc.id),
    supabase.from("profiles").select("active_group_id").eq("id", user.id).maybeSingle(),
  ]);

  const canEditDoc = isOwner || (isGroups && (legacyMember || sharedMember));
  const activeGroupId = (profileData.data as { active_group_id: string | null } | null)?.active_group_id ?? null;

  let sharedGroupIds: string[] = [];
  if (isOwner) {
    const { data: shares } = await supabase.from("document_shares").select("group_id").eq("document_id", doc.id);
    sharedGroupIds = (shares ?? []).map((s: { group_id: string }) => s.group_id).filter(Boolean);
  }

  return (
    <div className="grid gap-5">
      <ContentDetailHeader
        backHref="/library"
        backLabel={t(locale, "nav.library")}
        title={doc.title}
        visibility={doc.visibility}
        folderName={folderName}
        rightSlot={
          doc.external_url ? (
            <a className="btn btn-secondary whitespace-nowrap" href={doc.external_url} target="_blank" rel="noreferrer">
              {t(locale, "library.openInNewTab")}
            </a>
          ) : null
        }
      />

      <div className="card p-4">
        {doc.preview_url ? (
          <iframe
            title={doc.title}
            src={doc.preview_url}
            className="h-[70vh] w-full rounded-xl border border-white/10 bg-black/20"
            allow="autoplay"
          />
        ) : (
          <div className="text-sm text-white/60">{t(locale, "library.previewUnavailable")}</div>
        )}
      </div>

      {canEditDoc && !isOwner && (
        <DocumentActions
          documentId={doc.id}
          initialTitle={doc.title}
          initialExternalUrl={doc.external_url ?? ""}
          initialPreviewUrl={doc.preview_url ?? ""}
          afterDeleteRedirect="/library"
        />
      )}

      {isOwner && (
        <ContentItemSettings
          title={t(locale, "common.settings")}
          subtitle={t(locale, "qcm.settingsSubtitle")}
          itemId={doc.id}
          table="documents"
          visibility={doc.visibility}
          folderId={doc.folder_id}
          folderKind="documents"
          shareTable="document_shares"
          shareFk="document_id"
          rootLabel={t(locale, "common.noFolder")}
          activeGroupId={activeGroupId}
          initialSharedGroupIds={sharedGroupIds}
          legacyGroupId={doc.group_id}
        />
      )}
    </div>
  );
}
