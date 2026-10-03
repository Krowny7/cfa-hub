"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import { GroupMultiPicker } from "@/components/GroupMultiPicker";
import { FolderPicker } from "@/components/FolderPicker";
import { ShareModeSeg, type ShareMode } from "@/components/ContentItemSettings";
import { Field } from "@/components/ContentDetailHeader";

function normalizeDrivePreview(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("drive.google.com")) {
      const m = u.pathname.match(/\/file\/d\/([^/]+)\//);
      if (m?.[1]) return `https://drive.google.com/file/d/${m[1]}/preview`;
      const id = u.searchParams.get("id");
      if (id) return `https://drive.google.com/file/d/${id}/preview`;
    }
    return null;
  } catch {
    return null;
  }
}

// Ajout d'un lien PDF (Drive, OneDrive…) à la bibliothèque : on ne stocke
// pas le fichier, seulement son lien et, pour Drive, un lien d'aperçu.
export function PdfLinkAdder({ activeGroupId }: { activeGroupId: string | null }) {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  const [shareMode, setShareMode] = useState<ShareMode>("private");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="t-h3 m-0">Ajouter un lien PDF</h2>
        <p className="t-small mt-1.5 max-w-[560px]">Le fichier reste dans ton Drive ou ton OneDrive : on n&apos;enregistre que son lien.</p>
      </div>

      <Field label={t("common.title")} htmlFor="pdf-title">
        <input id="pdf-title" className="input" placeholder={t("library.titlePlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>

      <Field label="Lien" htmlFor="pdf-url">
        <input id="pdf-url" className="input" placeholder={t("library.urlPlaceholder")} value={url} onChange={(e) => setUrl(e.target.value)} />
      </Field>

      <FolderPicker kind="documents" value={folderId} onChange={setFolderId} />

      <Field label={t("sharing.title")}>
        <ShareModeSeg value={shareMode} onChange={setShareMode} />
        {shareMode === "groups" && <GroupMultiPicker value={groupIds} onChange={setGroupIds} defaultSelectGroupId={activeGroupId} />}
      </Field>

      <div className="grid gap-2">
        <button
          className="btn btn-primary justify-self-start"
          disabled={busy || !title.trim() || !url.trim() || (shareMode === "groups" && groupIds.length === 0)}
          onClick={async () => {
            setMsg(null);
            setBusy(true);
            try {
              const { data: auth } = await supabase.auth.getUser();
              const user = auth.user;
              if (!user) throw new Error("Not logged in");

              let parsed: URL;
              try {
                parsed = new URL(url.trim());
              } catch {
                throw new Error("Lien invalide.");
              }

              const drivePreview = normalizeDrivePreview(parsed.toString());

              const visibility = shareMode === "groups" ? "groups" : shareMode;

              const insert = await supabase
                .from("documents")
                .insert({
                  title: title.trim(),
                  external_url: parsed.toString(),
                  preview_url: drivePreview,
                  visibility,
                  group_id: null,
                  folder_id: folderId,
                  owner_id: user.id,
                })
                .select("id")
                .maybeSingle();

              if (insert.error) throw insert.error;
              const docId = (insert.data as { id: string } | null)?.id;

              if (shareMode === "groups" && docId) {
                const rows = groupIds.map((gid) => ({ document_id: docId, group_id: gid }));
                const share = await supabase.from("document_shares").insert(rows);
                if (share.error) throw share.error;
              }

              setTitle("");
              setUrl("");
              setShareMode("private");
              setGroupIds([]);
              setFolderId(null);
              setMsg(t("library.added"));
              window.location.reload();
            } catch (e: unknown) {
              setMsg(`${(e as { message?: string })?.message ?? t("common.error")}`);
            } finally {
              setBusy(false);
            }
          }}
          type="button"
        >
          {busy ? t("library.saving") : t("library.saveLink")}
        </button>

        <p className="t-micro max-w-[560px]">{t("library.advice")}</p>

        {msg && (
          <p role="status" className="t-small">
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
