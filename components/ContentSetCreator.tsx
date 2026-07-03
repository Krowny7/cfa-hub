"use client";

import { useMemo, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import { GroupMultiPicker } from "@/components/GroupMultiPicker";
import { FolderPicker } from "@/components/FolderPicker";

type ShareMode = "private" | "public" | "groups";
type Subject = "cfa" | "personal";

// Formulaire de création d'un set (flashcards ou QCM) — les deux composants
// étaient ~100% identiques à l'exception de la table cible et de 4 clés i18n ;
// factorisés ici pour éviter qu'un correctif appliqué à l'un soit oublié
// sur l'autre (déjà arrivé une fois cette session avec un mismatch de props).
export function ContentSetCreator({
  activeGroupId,
  table,
  shareTable,
  folderKind,
  i18nPrefix,
}: {
  activeGroupId: string | null;
  table: "flashcard_sets" | "quiz_sets";
  shareTable: "flashcard_set_shares" | "quiz_set_shares";
  folderKind: "flashcards" | "quizzes";
  i18nPrefix: "flashcards" | "qcm";
}) {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [subject, setSubject] = useState<Subject>("cfa");
  const [title, setTitle] = useState("");
  const [shareMode, setShareMode] = useState<ShareMode>("private");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="card p-6">
      <h2 className="text-base font-semibold">{t(`${i18nPrefix}.createTitle`)}</h2>

      <div className="mt-4 grid gap-3">
        {/* Subject toggle */}
        <div className="flex gap-1 rounded-xl border border-white/[0.08] p-1">
          <button
            type="button"
            onClick={() => setSubject("cfa")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium transition ${
              subject === "cfa"
                ? "bg-blue-500/20 text-blue-300"
                : "text-muted hover:text-white/70"
            }`}
          >
            📊 {t("subject.cfa")}
          </button>
          <button
            type="button"
            onClick={() => setSubject("personal")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium transition ${
              subject === "personal"
                ? "bg-violet-500/20 text-violet-300"
                : "text-muted hover:text-white/70"
            }`}
          >
            📚 {t("subject.personal")}
          </button>
        </div>

        {subject === "personal" && (
          <p className="text-xs text-violet-300/70">{t("subject.personalHint")}</p>
        )}

        <input
          className="input"
          placeholder={t(`${i18nPrefix}.setTitlePlaceholder`)}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <FolderPicker kind={folderKind} value={folderId} onChange={setFolderId} />

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
                .from(table)
                .insert({
                  title: title.trim(),
                  visibility,
                  subject,
                  group_id: null,
                  folder_id: folderId,
                  owner_id: auth.user.id,
                })
                .select("id")
                .maybeSingle();

              if (res.error) throw res.error;
              const setId = (res.data as { id: string } | null)?.id;

              if (shareMode === "groups" && setId) {
                const rows = groupIds.map((gid) => ({ set_id: setId, group_id: gid }));
                const share = await supabase.from(shareTable).insert(rows);
                if (share.error) throw share.error;
              }

              setTitle("");
              setSubject("cfa");
              setShareMode("private");
              setGroupIds([]);
              setFolderId(null);
              setMsg("✅");
              window.location.reload();
            } catch (e: unknown) {
              setMsg(`❌ ${friendlyError(e, t("common.error"))}`);
            } finally {
              setBusy(false);
            }
          }}
          type="button"
        >
          {busy ? t("common.saving") : t(`${i18nPrefix}.create`)}
        </button>

        {msg && <div className="text-sm">{msg}</div>}
      </div>
    </div>
  );
}
