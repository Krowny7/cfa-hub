"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";

export type FolderKind = "documents" | "flashcards" | "quizzes" | "exercises";
type Folder = { id: string; name: string; parent_id: string | null };

function formatSupabaseError(err: unknown): string {
  if (!err) return "Unknown error";
  if (err instanceof Error) return err.message;
  if (typeof err !== "object") return String(err);
  const e = err as Record<string, unknown>;
  const msg = e["message"] ?? e["error_description"] ?? e["hint"] ?? e["details"];
  if (typeof msg === "string" && msg.trim().length > 0) return msg;
  try {
    const parts: string[] = [];
    if (e["code"]) parts.push(`code=${e["code"]}`);
    if (e["status"]) parts.push(`status=${e["status"]}`);
    if (e["statusText"]) parts.push(`statusText=${e["statusText"]}`);
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

      setFolders((data ?? []) as Folder[]);
    } catch (err: unknown) {
      setFolders([]);
      setErrorText(formatSupabaseError(err));
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  // Dossier d'un contenu : liste déroulante + création d'un dossier à la volée.
  return (
    <div className="grid gap-2">
      <label htmlFor={`folder-${kind}`} className="text-[13.5px] font-semibold leading-tight">
        {t("folders.folder")}
      </label>
      <select
        id={`folder-${kind}`}
        className="select"
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

      <div className="flex gap-2">
          <input
            className="input min-w-0 flex-1"
            value={newName}
            placeholder={t("folders.newPlaceholder")}
            aria-label={t("folders.new")}
            onChange={(e) => setNewName(e.target.value)}
          />

          <button
            type="button"
            className="btn btn-secondary shrink-0 whitespace-nowrap"
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
              } catch (err: unknown) {
                setErrorText(formatSupabaseError(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? t("common.saving") : "Nouveau dossier"}
          </button>
      </div>

      {errorText ? (
        <p role="alert" className="rounded-[12px] border border-pen/30 bg-pen/5 px-3.5 py-2.5 text-[13.5px] text-pen">
          {errorText}
        </p>
      ) : null}
    </div>
  );
}