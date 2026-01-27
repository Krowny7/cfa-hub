"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { FolderPicker, type FolderKind } from "@/components/FolderPicker";
import { GroupMultiPicker } from "@/components/GroupMultiPicker";
import { normalizeVisibility, type Visibility } from "@/lib/content/visibility";
import { useI18n } from "@/components/I18nProvider";

type ContentType = "documents" | "quizzes";

type Config = {
  baseTable: "documents" | "quiz_sets";
  idColumn: "id";
  titleColumn: "title";
  visibilityColumn: "visibility";
  folderIdColumn: "folder_id";
  legacyGroupIdColumn: "group_id";
  shareTable: "document_shares" | "quiz_set_shares";
  shareFk: "document_id" | "set_id";
  folderKind: FolderKind;
  afterDeleteRedirect: string;
};

const CONFIG: Record<ContentType, Config> = {
  documents: {
    baseTable: "documents",
    idColumn: "id",
    titleColumn: "title",
    visibilityColumn: "visibility",
    folderIdColumn: "folder_id",
    legacyGroupIdColumn: "group_id",
    shareTable: "document_shares",
    shareFk: "document_id",
    folderKind: "documents",
    afterDeleteRedirect: "/library"
  },
  quizzes: {
    baseTable: "quiz_sets",
    idColumn: "id",
    titleColumn: "title",
    visibilityColumn: "visibility",
    folderIdColumn: "folder_id",
    legacyGroupIdColumn: "group_id",
    shareTable: "quiz_set_shares",
    shareFk: "set_id",
    folderKind: "quizzes",
    afterDeleteRedirect: "/qcm"
  }
};

function unique(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

export function ContentItemSettings({
  type,
  itemId,
  activeGroupId,
  initialTitle,
  initialVisibility,
  initialFolderId,
  initialSharedGroupIds,
  legacyGroupId
}: {
  type: ContentType;
  itemId: string;
  activeGroupId: string | null;
  initialTitle: string;
  initialVisibility: Visibility | string | null | undefined;
  initialFolderId: string | null;
  initialSharedGroupIds: string[];
  legacyGroupId?: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { locale, t } = useI18n();
  const isFr = locale === "fr";

  const cfg = CONFIG[type];

  const [title, setTitle] = useState(initialTitle);
  const [folderId, setFolderId] = useState<string | null>(initialFolderId);

  // We only use "private" | "groups" | "public" in the UI.
  const [shareMode, setShareMode] = useState<"private" | "groups" | "public">("private");
  const [groupIds, setGroupIds] = useState<string[]>(unique(initialSharedGroupIds));

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const v = normalizeVisibility(initialVisibility);
    if (v === "public") {
      setShareMode("public");
      return;
    }

    if (v === "groups" || v === "group") {
      setShareMode("groups");

      // If it's an old "group" row (single group_id), preselect it.
      if (groupIds.length === 0 && legacyGroupId) {
        setGroupIds([legacyGroupId]);
      }
      return;
    }

    setShareMode("private");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function syncShares(nextVisibility: Visibility, nextGroupIds: string[]) {
    // Keep share table in sync when visibility == "groups".
    // If not groups: delete everything.

    if (nextVisibility !== "groups") {
      await supabase
        .from(cfg.shareTable)
        .delete()
        .eq(cfg.shareFk, itemId)
        .throwOnError();
      return;
    }

    const wanted = unique(nextGroupIds);

    const { data: existingRows } = await supabase
      .from(cfg.shareTable)
      .select("group_id")
      .eq(cfg.shareFk, itemId)
      .throwOnError();

    const existing = unique((existingRows ?? []).map((r: any) => r.group_id));

    const toAdd = wanted.filter((g) => !existing.includes(g));
    const toRemove = existing.filter((g) => !wanted.includes(g));

    if (toRemove.length > 0) {
      await supabase
        .from(cfg.shareTable)
        .delete()
        .eq(cfg.shareFk, itemId)
        .in("group_id", toRemove)
        .throwOnError();
    }

    if (toAdd.length > 0) {
      const rows = toAdd.map((g) => ({ [cfg.shareFk]: itemId, group_id: g }));
      await supabase.from(cfg.shareTable).insert(rows as any).throwOnError();
    }
  }

  async function save() {
    setMsg(null);

    const nextVisibility: Visibility =
      shareMode === "public" ? "public" : shareMode === "groups" ? "groups" : "private";

    const cleanGroups = unique(groupIds);

    if (nextVisibility === "groups" && cleanGroups.length === 0) {
      setMsg(isFr ? "❌ Sélectionne au moins un groupe." : "❌ Select at least one group.");
      return;
    }

    setBusy(true);
    try {
      await supabase
        .from(cfg.baseTable)
        .update({
          [cfg.titleColumn]: title.trim(),
          [cfg.visibilityColumn]: nextVisibility,
          [cfg.folderIdColumn]: folderId,
          // Ensure we don't keep legacy single-group fields around.
          [cfg.legacyGroupIdColumn]: null
        } as any)
        .eq(cfg.idColumn, itemId)
        .throwOnError();

      await syncShares(nextVisibility, cleanGroups);

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
        ? "Supprimer définitivement ? Cette action est irréversible."
        : "Delete permanently? This action cannot be undone."
    );
    if (!ok) return;

    setBusy(true);
    setMsg(null);

    try {
      await supabase.from(cfg.baseTable).delete().eq(cfg.idColumn, itemId).throwOnError();
      window.location.href = cfg.afterDeleteRedirect;
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? t("common.error")}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="rounded-2xl border">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold hover:bg-white/5">
        {isFr ? "Réglages" : "Settings"}
      </summary>

      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-white/10 p-3">
          <div className="text-sm font-medium">{isFr ? "Titre" : "Title"}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              className="box-border w-full min-w-0 flex-1 max-w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm sm:min-w-[240px]"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <button
              type="button"
              className="box-border w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-black whitespace-normal disabled:opacity-50 sm:w-auto sm:whitespace-nowrap"
              disabled={busy || !title.trim()}
              onClick={save}
            >
              {busy ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </div>

        <FolderPicker kind={cfg.folderKind} value={folderId} onChange={setFolderId} />

        <div className="rounded-xl border border-white/10 p-3">
          <div className="text-sm font-medium">{t("sharing.title")}</div>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className={`box-border w-full rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5 sm:w-auto ${
                shareMode === "private" ? "bg-white/10" : "bg-transparent"
              }`}
              onClick={() => setShareMode("private")}
            >
              {t("common.private")}
            </button>

            <button
              type="button"
              className={`box-border w-full rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5 sm:w-auto ${
                shareMode === "groups" ? "bg-white/10" : "bg-transparent"
              }`}
              onClick={() => {
                setShareMode("groups");
                if (groupIds.length === 0 && activeGroupId) setGroupIds([activeGroupId]);
              }}
            >
              {t("sharing.someGroups")}
            </button>

            <button
              type="button"
              className={`box-border w-full rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5 sm:w-auto ${
                shareMode === "public" ? "bg-white/10" : "bg-transparent"
              }`}
              onClick={() => setShareMode("public")}
            >
              {t("common.public")}
            </button>
          </div>

          {shareMode === "groups" ? (
            <div className="mt-3">
              <GroupMultiPicker value={groupIds} onChange={setGroupIds} defaultSelectGroupId={activeGroupId} />
            </div>
          ) : null}

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              className="box-border w-full rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50 sm:w-auto"
              disabled={busy}
              onClick={save}
            >
              {busy ? t("common.saving") : t("common.save")}
            </button>

            <button
              type="button"
              className="box-border w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100 hover:bg-red-500/20 disabled:opacity-50 sm:w-auto"
              disabled={busy}
              onClick={remove}
            >
              {isFr ? "Supprimer" : "Delete"}
            </button>

            {msg ? <span className="w-full text-sm break-words [overflow-wrap:anywhere] sm:w-auto">{msg}</span> : null}
          </div>
        </div>

        <div className="text-xs opacity-70">
          {isFr
            ? "Astuce : en passant un ancien partage “Groupe” en “Certains groupes”, tu migres automatiquement vers le modèle multi-groupes." 
            : "Tip: switching legacy “Group” to “Selected groups” automatically migrates to the multi-group model."}
        </div>
      </div>
    </details>
  );
}
