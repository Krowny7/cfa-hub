"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";

export type FolderKind = "documents" | "flashcards" | "quizzes";
type Folder = { id: string; name: string; parent_id: string | null };

function formatSupabaseError(err: any): string {
  if (!err) return "Unknown error";
  // PostgrestError shape often has these fields
  const msg = err?.message ?? err?.error_description ?? err?.hint ?? err?.details;
  if (typeof msg === "string" && msg.trim().length > 0) return msg;

  // Try a richer fallback (includes non-enumerable sometimes)
  try {
    const parts: string[] = [];
    if (err?.code) parts.push(`code=${err.code}`);
    if (err?.status) parts.push(`status=${err.status}`);
    if (err?.statusText) parts.push(`statusText=${err.statusText}`);
    const s = JSON.stringify(err, Object.getOwnPropertyNames(err));
    if (s && s !== "{}") parts.push(s);
    return parts.length ? parts.join(" | ") : String(err);
  } catch {
    return String(err);
  }
}

export function FolderPicker({
  kind,
  value,
  onChange
}: {
  kind: FolderKind;
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function refresh() {
    setErrorText(null);

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setFolders([]);
        return;
      }

      // order by name (safe even if created_at missing)
      const { data } = await supabase
        .from("library_folders")
        .select("id,name,parent_id")
        .eq("kind", kind)
        .order("name", { ascending: true })
        .throwOnError();

      setFolders((data ?? []) as any);
    } catch (err: any) {
      console.error("FolderPicker.refresh error (raw):", err);
      console.error("FolderPicker.refresh error (message):", err?.message);
      console.error("FolderPicker.refresh error (details):", err?.details);
      console.error("FolderPicker.refresh error (hint):", err?.hint);
      console.error("FolderPicker.refresh error (code):", err?.code);

      setFolders([]);
      setErrorText(formatSupabaseError(err));
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  return (
    <div className="rounded-xl border border-white/10 p-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-[220px]">
          <div className="text-sm font-medium">{t("folders.folder")}</div>
          <select
            className="mt-2 w-full rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm text-white"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value ? e.target.value : null)}
          >
            <option value="">{t("folders.none")}</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-1 flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[220px]">
            <div className="text-xs opacity-70">{t("folders.new")}</div>
            <input
              className="mt-2 w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
              value={newName}
              placeholder={t("folders.newPlaceholder")}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
            disabled={busy || !newName.trim()}
            onClick={async () => {
              setBusy(true);
              setErrorText(null);

              try {
                const { data: auth } = await supabase.auth.getUser();
                const user = auth.user;
                if (!user) {
                  setErrorText("Not authenticated.");
                  return;
                }

                const name = newName.trim();

                await supabase
                  .from("library_folders")
                  .insert({
                    owner_id: user.id,
                    kind,
                    name,
                    parent_id: null
                  })
                  .throwOnError();

                setNewName("");
                await refresh();
              } catch (err: any) {
                console.error("FolderPicker.insert error (raw):", err);
                console.error("FolderPicker.insert error (message):", err?.message);
                console.error("FolderPicker.insert error (details):", err?.details);
                console.error("FolderPicker.insert error (hint):", err?.hint);
                console.error("FolderPicker.insert error (code):", err?.code);

                setErrorText(formatSupabaseError(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? t("common.saving") : t("folders.create")}
          </button>
        </div>
      </div>

      {errorText ? (
        <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {errorText}
        </div>
      ) : null}
    </div>
  );
}