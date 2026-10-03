import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { ContentDetailHeader, cleanFolderName, visibilityLabel } from "@/components/ContentDetailHeader";
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
      <div className="mx-auto grid max-w-[560px] justify-items-start gap-3 pt-4 md:pt-10">
        <p className="t-eyebrow">Bibliothèque</p>
        <h1 className="t-h1 m-0">Document introuvable</h1>
        <p className="t-small">Il a peut-être été supprimé, ou il n&apos;est pas partagé avec toi.</p>
        <Link href="/library" className="btn btn-secondary mt-3">
          Retour à la bibliothèque
        </Link>
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

  const openLink = doc.external_url ? (
    <a className="btn btn-secondary btn-sm" href={doc.external_url} target="_blank" rel="noreferrer">
      Nouvel onglet <ExternalLink size={14} aria-hidden />
    </a>
  ) : null;

  return (
    <div className="mx-auto flex w-full max-w-[980px] flex-col gap-8 md:gap-10">
      <ContentDetailHeader
        backHref="/library"
        backLabel={t(locale, "nav.library")}
        title={doc.title}
        eyebrow="Document PDF"
        meta={[visibilityLabel(doc.visibility), cleanFolderName(folderName)]}
        rightSlot={openLink}
      />

      {doc.preview_url ? (
        <div className="card overflow-hidden">
          <iframe title={doc.title} src={doc.preview_url} className="block h-[72vh] min-h-[420px] w-full bg-surface-2" allow="autoplay" />
        </div>
      ) : (
        <div className="card-quiet grid place-items-center gap-2 px-6 py-16 text-center">
          <p className="t-h3 m-0">Aperçu indisponible</p>
          <p className="t-small max-w-[380px]">Ce lien ne s&apos;affiche pas ici. Ouvre-le directement.</p>
          {doc.external_url && (
            <a className="btn btn-primary mt-3" href={doc.external_url} target="_blank" rel="noreferrer">
              Ouvrir le document <ExternalLink size={15} aria-hidden />
            </a>
          )}
        </div>
      )}

      {canEditDoc && (
        <section className="rl-section" aria-labelledby="doc-gerer">
          <h2 id="doc-gerer" className="t-h3 m-0">
            Gérer ce document
          </h2>
          <div className="card divide-y divide-line overflow-hidden">
            {!isOwner && (
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
                title="Réglages"
                itemTitle={doc.title}
                subtitle="Titre, dossier et partage"
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
        </section>
      )}
    </div>
  );
}
