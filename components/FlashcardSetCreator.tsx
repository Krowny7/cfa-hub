"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import { GroupMultiPicker } from "@/components/GroupMultiPicker";
import { FolderPicker } from "@/components/FolderPicker";

type ShareMode = "private" | "public" | "groups";

export function FlashcardSetCreator({ activeGroupId }: { activeGroupId: string | null }) {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [title, setTitle] = useState("");
  const [shareMode, setShareMode] = useState<ShareMode>("private");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border p-4">
      <h2 className="font-semibold">{t("flashcards.createTitle")}</h2>

      <div className="mt-4 grid gap-3">
        <input
          className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2"
          placeholder={t("flashcards.setTitlePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <FolderPicker kind="flashcards" value={folderId} onChange={setFolderId} />

        <div className="rounded-xl border border-white/10 p-3">
          <div className="text-sm font-medium">{t("sharing.title")}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5 ${
                shareMode === "private" ? "bg-white/10" : "bg-transparent"
              }`}
              onClick={() => setShareMode("private")}
            >
              {t("common.private")}
            </button>
            <button
              type="button"
              className={`rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5 ${
                shareMode === "groups" ? "bg-white/10" : "bg-transparent"
              }`}
              onClick={() => setShareMode("groups")}
            >
              {t("sharing.someGroups")}
            </button>
            <button
              type="button"
              className={`rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5 ${
                shareMode === "public" ? "bg-white/10" : "bg-transparent"
              }`}
              onClick={() => setShareMode("public")}
            >
              {t("common.public")}
            </button>
          </div>
          {shareMode === "groups" && (
            <div className="mt-3">
              <GroupMultiPicker value={groupIds} onChange={setGroupIds} defaultSelectGroupId={activeGroupId} />
            </div>
          )}
        </div>

        <button
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          disabled={busy || !title.trim() || (shareMode === "groups" && groupIds.length === 0)}
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            try {
              const { data: auth } = await supabase.auth.getUser();
              if (!auth.user) throw new Error("Not logged in");

              const visibility = shareMode === "groups" ? "groups" : shareMode;

              const res = await supabase
                .from("flashcard_sets")
                .insert({
                  title: title.trim(),
                  visibility,
                  group_id: null,
                  folder_id: folderId,
                  owner_id: auth.user.id
                })
                .select("id")
                .maybeSingle();

              if (res.error) throw res.error;
              const setId = (res.data as any)?.id;

              if (shareMode === "groups" && setId) {
                const rows = groupIds.map((gid) => ({ set_id: setId, group_id: gid }));
                const share = await supabase.from("flashcard_set_shares").insert(rows);
                if (share.error) throw share.error;
              }

              setTitle("");
              setShareMode("private");
              setGroupIds([]);
              setFolderId(null);
              setMsg("✅");
              window.location.reload();
            } catch (e: any) {
              setMsg(`❌ ${e?.message ?? t("common.error")}`);
            } finally {
              setBusy(false);
            }
          }}
          type="button"
        >
          {busy ? t("common.saving") : t("flashcards.create")}
        </button>

        {msg && <div className="text-sm">{msg}</div>}
      </div>
    </div>
  );
}
