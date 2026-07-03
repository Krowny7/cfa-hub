"use client";

import { useMemo, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";

export function DocumentActions({
  documentId,
  initialTitle,
  initialExternalUrl,
  initialPreviewUrl,
  afterDeleteRedirect
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
          preview_url: previewUrl.trim() ? previewUrl.trim() : null
        })
        .eq("id", documentId);

      if (error) throw error;

      setMsg(`✅ ${t("common.saved")}`);
      router.refresh();
    } catch (e: unknown) {
      setMsg(`❌ ${friendlyError(e, t("common.error"))}`);
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
      setMsg(`❌ ${friendlyError(e, t("common.error"))}`);
      setBusy(false);
      setShowConfirmDelete(false);
    }
  }

  return (
    <details className="group card-soft">
      <summary className="cursor-pointer list-none select-none rounded-2xl px-4 py-3 text-sm font-semibold transition hover:bg-white/[0.06]">
        <div className="flex items-center justify-between gap-3">
          <span>{t("library.editTitle")}</span>
          <span className="text-xs opacity-60 transition group-open:rotate-180">▼</span>
        </div>
      </summary>

      <div className="space-y-4 p-4">
        <div className="card-soft p-4">
          <div className="text-sm font-medium">{t("common.title")}</div>
          <input
            className="input mt-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="card-soft p-4">
          <div className="text-sm font-medium">{t("library.externalLinkLabel")}</div>
          <input
            className="input mt-2"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="card-soft p-4">
          <div className="text-sm font-medium">{t("library.previewLinkLabel")}</div>
          <input
            className="input mt-2"
            value={previewUrl}
            onChange={(e) => setPreviewUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !title.trim()}
            onClick={save}
          >
            {busy ? t("common.saving") : t("common.save")}
          </button>

          {showConfirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm opacity-80">{t("library.confirmDeleteDocument")}</span>
              <button
                type="button"
                className="btn btn-danger"
                disabled={busy}
                onClick={remove}
              >
                {t("common.confirm")}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => setShowConfirmDelete(false)}
              >
                {t("common.cancel")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-danger"
              disabled={busy}
              onClick={() => setShowConfirmDelete(true)}
            >
              {t("common.delete")}
            </button>
          )}

          {msg ? <span className="text-sm">{msg}</span> : null}
        </div>
      </div>
    </details>
  );
}
