"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import { GroupMultiPicker } from "@/components/GroupMultiPicker";
import { FolderPicker } from "@/components/FolderPicker";
import { TagPicker } from "@/components/TagPicker";

type ShareMode = "private" | "public" | "groups";

export function QuizSetCreator({ activeGroupId }: { activeGroupId: string | null }) {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [title, setTitle] = useState("");
  const [shareMode, setShareMode] = useState<ShareMode>("private");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="grid gap-3">
        <input
          className="input"
          placeholder={t("qcm.setTitlePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <FolderPicker kind="quizzes" value={folderId} onChange={setFolderId} />

        <TagPicker value={tagIds} onChange={setTagIds} />

        <div className="card-soft p-4">
          <div className="text-sm font-medium">{t("sharing.title")}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className={`chip ${shareMode === "private" ? "chip-active" : ""}`}
              onClick={() => setShareMode("private")}
            >
              {t("common.private")}
            </button>
            <button
              type="button"
              className={`chip ${shareMode === "groups" ? "chip-active" : ""}`}
              onClick={() => setShareMode("groups")}
            >
              {t("sharing.someGroups")}
            </button>
            <button
              type="button"
              className={`chip ${shareMode === "public" ? "chip-active" : ""}`}
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
          className="btn btn-primary"
          disabled={busy || !title.trim() || (shareMode === "groups" && groupIds.length === 0)}
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            try {
              const { data: auth } = await supabase.auth.getUser();
              if (!auth.user) throw new Error("Not logged in");

              const visibility = shareMode === "groups" ? "groups" : shareMode;

              const res = await supabase
                .from("quiz_sets")
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
              const setId = (res.data as any)?.id as string | undefined;

              if (setId && tagIds.length) {
                const rows = tagIds.map((tid) => ({ owner_id: auth.user.id, quiz_set_id: setId, tag_id: tid }));
                const tagRes = await supabase.from("quiz_set_tags").insert(rows);
                if (tagRes.error) throw tagRes.error;
              }

              if (shareMode === "groups" && setId) {
                const rows = groupIds.map((gid) => ({ set_id: setId, group_id: gid }));
                const share = await supabase.from("quiz_set_shares").insert(rows);
                if (share.error) throw share.error;
              }

              setTitle("");
              setShareMode("private");
              setGroupIds([]);
              setFolderId(null);
              setTagIds([]);
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
          {busy ? t("common.saving") : t("qcm.create")}
        </button>

        {msg && <div className="text-sm">{msg}</div>}
    </div>
  );
}
