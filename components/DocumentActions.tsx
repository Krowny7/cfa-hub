"use client";

import { useMemo, useState } from "react";
import { Link2, Trash2 } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import { DisclosureRow, Field } from "@/components/ContentDetailHeader";

// Modifier ou supprimer un document partagé (membre d'un groupe qui y a
// accès) : titre, lien du PDF, lien d'aperçu. Une ligne repliable de la
// carte « Gérer ce document ».
export function DocumentActions({
  documentId,
  initialTitle,
  initialExternalUrl,
  initialPreviewUrl,
  afterDeleteRedirect,
}: {
  documentId: string;
  initialTitle: string;
  initialExternalUrl: string;
  initialPreviewUrl: string;
  afterDeleteRedirect: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { t } = useI18n();

  const [title, setTitle] = useState(initialTitle);
  const [externalUrl, setExternalUrl] = useState(initialExternalUrl);
  const [previewUrl, setPreviewUrl] = useState(initialPreviewUrl);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase
        .from("documents")
        .update({
          title: title.trim(),
          external_url: externalUrl.trim() ? externalUrl.trim() : null,
          preview_url: previewUrl.trim() ? previewUrl.trim() : null,
        })
        .eq("id", documentId);

      if (error) throw error;

      setMsg(`${t("common.saved")}`);
      router.refresh();
    } catch (e: unknown) {
      setMsg(`${friendlyError(e, t("common.error"))}`);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.from("documents").delete().eq("id", documentId);
      if (error) throw error;

      window.location.href = afterDeleteRedirect;
    } catch (e: unknown) {
      setMsg(`${friendlyError(e, t("common.error"))}`);
      setBusy(false);
      setShowConfirmDelete(false);
    }
  }

  return (
    <DisclosureRow icon={<Link2 size={18} aria-hidden />} title="Modifier le document" sub="Titre, lien du PDF et lien d'aperçu">
      <div className="grid gap-6">
        <Field label={t("common.title")} htmlFor="doc-title">
          <input id="doc-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <Field label={t("library.externalLinkLabel")} htmlFor="doc-url">
          <input id="doc-url" className="input" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://…" />
        </Field>

        <Field label="Lien d'aperçu" hint="affiché dans la page" htmlFor="doc-preview">
          <input id="doc-preview" className="input" value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} placeholder="https://…" />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <div className="flex items-center gap-3">
            <button type="button" className="btn btn-primary" disabled={busy || !title.trim()} onClick={save}>
              {busy ? t("common.saving") : t("common.save")}
            </button>
            {msg ? (
              <span role="status" className="t-small">
                {msg}
              </span>
            ) : null}
          </div>

          {showConfirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="t-small">{t("library.confirmDeleteDocument")}</span>
              <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={remove}>
                {t("common.confirm")}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setShowConfirmDelete(false)}>
                {t("common.cancel")}
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-ghost text-pen" disabled={busy} onClick={() => setShowConfirmDelete(true)}>
              <Trash2 size={15} aria-hidden /> {t("common.delete")}
            </button>
          )}
        </div>
      </div>
    </DisclosureRow>
  );
}
