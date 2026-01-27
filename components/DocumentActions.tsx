"use client";

import { useMemo, useState } from "react";
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
  const { locale, t } = useI18n();
  const isFr = locale === "fr";

  const [title, setTitle] = useState(initialTitle);
  const [externalUrl, setExternalUrl] = useState(initialExternalUrl);
  const [previewUrl, setPreviewUrl] = useState(initialPreviewUrl);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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

      setMsg(isFr ? "✅ Enregistré." : "✅ Saved.");
      router.refresh();
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? t("common.error")}`);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = window.confirm(
      isFr
        ? "Supprimer définitivement ce document ? Cette action est irréversible."
        : "Delete this document permanently? This action cannot be undone."
    );
    if (!ok) return;

    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.from("documents").delete().eq("id", documentId);
      if (error) throw error;

      window.location.href = afterDeleteRedirect;
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? t("common.error")}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="rounded-2xl border">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold hover:bg-white/5">
        {isFr ? "Modifier / supprimer" : "Edit / delete"}
      </summary>

      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-white/10 p-3">
          <div className="text-sm font-medium">{isFr ? "Titre" : "Title"}</div>
          <input
            className="mt-2 w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="rounded-xl border border-white/10 p-3">
          <div className="text-sm font-medium">{isFr ? "Lien (PDF)" : "External link"}</div>
          <input
            className="mt-2 w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="rounded-xl border border-white/10 p-3">
          <div className="text-sm font-medium">{isFr ? "Lien d'aperçu (iframe)" : "Preview link (iframe)"}</div>
          <input
            className="mt-2 w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
            value={previewUrl}
            onChange={(e) => setPreviewUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            disabled={busy || !title.trim()}
            onClick={save}
          >
            {busy ? t("common.saving") : t("common.save")}
          </button>

          <button
            type="button"
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100 hover:bg-red-500/20 disabled:opacity-50"
            disabled={busy}
            onClick={remove}
          >
            {isFr ? "Supprimer" : "Delete"}
          </button>

          {msg ? <span className="text-sm">{msg}</span> : null}
        </div>
      </div>
    </details>
  );
}