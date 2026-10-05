"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe2, Lock, Settings2, Trash2, Users } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import { GroupMultiPicker } from "@/components/GroupMultiPicker";
import { DisclosureRow, Field } from "@/components/ContentDetailHeader";
import type { FolderKind } from "@/components/FolderPicker";

export type ShareMode = "private" | "public" | "groups";

type Folder = { id: string; name: string; parent_id: string | null };

type ShareRow = { group_id: string };
type UpdateError = { message: string } | null;

const SHARE_MODES: { key: ShareMode; label: string; Icon: typeof Lock }[] = [
  { key: "private", label: "Privé", Icon: Lock },
  { key: "groups", label: "Groupes", Icon: Users },
  { key: "public", label: "Public", Icon: Globe2 },
];

/** Contrôle segmenté Privé | Groupes | Public (partagé par les formulaires de contenu). */
export function ShareModeSeg({ value, onChange, disabled }: { value: ShareMode; onChange: (m: ShareMode) => void; disabled?: boolean }) {
  const ix = SHARE_MODES.findIndex((m) => m.key === value);
  return (
    <div role="radiogroup" aria-label="Partage" className="seg w-full sm:w-auto sm:justify-self-start" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
      <span aria-hidden className="seg-thumb" style={{ left: `calc(4px + ${ix} * (100% - 8px) / 3)`, width: "calc((100% - 8px) / 3)" }} />
      {SHARE_MODES.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          aria-selected={value === key}
          disabled={disabled}
          onClick={() => onChange(key)}
          className="seg-item px-3 text-[13.5px] sm:px-4"
        >
          <Icon size={14} aria-hidden /> {label}
        </button>
      ))}
    </div>
  );
}

// Réglages d'un contenu dont on est propriétaire : titre, dossier, partage,
// suppression. Une ligne repliable « Réglages » à poser dans la carte
// « Gérer » de la page (QCM, document).
export function ContentItemSettings({
  title,
  subtitle,
  itemId,
  table,
  visibility,
  folderId,
  folderKind,
  shareTable,
  shareFk,
  rootLabel,
  activeGroupId,
  initialSharedGroupIds = [],
  legacyGroupId = null,
  itemTitle,
  onDeleted,
  onUpdated,
}: {
  /** libellé de la ligne (« Réglages ») */
  title: string;
  subtitle: string;
  itemId: string;
  table: "documents" | "flashcard_sets" | "quiz_sets" | "exercise_sets";
  visibility: string | null;
  folderId: string | null;
  folderKind: FolderKind;
  shareTable: "document_shares" | "flashcard_set_shares" | "quiz_set_shares" | "exercise_set_shares";
  shareFk: "document_id" | "set_id";
  rootLabel: string;
  activeGroupId: string | null;
  initialSharedGroupIds?: string[];
  legacyGroupId?: string | null;
  /** titre actuel du contenu (champ « Titre ») ; à défaut, `title` */
  itemTitle?: string;
  onDeleted?: () => void;
  onUpdated?: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  // Dynamic table names can't be narrowed by Supabase's generated types.
  // We use a single cast here; result shapes are annotated explicitly below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawSb = supabase as any;

  const defaultRedirect = table === "documents" ? "/reviser" : table === "flashcard_sets" ? "/flashcards" : "/qcm";
  const startTitle = itemTitle ?? title;

  const [draftTitle, setDraftTitle] = useState(startTitle);
  const [shareMode, setShareMode] = useState<ShareMode>(
    visibility === "public" ? "public" : visibility === "group" || visibility === "groups" ? "groups" : "private"
  );
  const [groupIds, setGroupIds] = useState<string[]>(() => {
    const base = [...(initialSharedGroupIds ?? []), ...(legacyGroupId ? [legacyGroupId] : [])].filter(Boolean) as string[];
    return Array.from(new Set(base));
  });
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(folderId);
  const [newFolderName, setNewFolderName] = useState("");

  const [loadingShares, setLoadingShares] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    setDraftTitle(startTitle);
  }, [startTitle]);

  useEffect(() => {
    setSelectedFolderId(folderId);
  }, [folderId]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("library_folders")
          .select("id,name,parent_id")
          .eq("kind", folderKind)
          .order("name", { ascending: true });
        setFolders((data ?? []) as Folder[]);
      } catch {
        setFolders([]);
      }
    })();
  }, [supabase, folderKind]);

  useEffect(() => {
    if (shareMode !== "groups") return;
    (async () => {
      setLoadingShares(true);
      try {
        const { data, error } = (await rawSb.from(shareTable).select("group_id").eq(shareFk, itemId)) as {
          data: ShareRow[] | null;
          error: UpdateError;
        };
        if (error) throw new Error(error.message);
        const ids = (data ?? []).map((r) => r.group_id).filter(Boolean) as string[];
        setGroupIds((prev) => Array.from(new Set([...prev, ...ids])));
      } catch {
        // Keep current selection if reading shares fails.
      } finally {
        setLoadingShares(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareMode, itemId, shareTable]);

  async function createFolder() {
    setErrorText(null);
    setMsg(null);

    const name = newFolderName.trim();
    if (!name) return;

    setCreatingFolder(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("library_folders")
        .insert({ owner_id: auth.user.id, kind: folderKind, name, parent_id: null })
        .select("id,name,parent_id")
        .maybeSingle();

      if (error) throw error;

      setNewFolderName("");
      if (data?.id) {
        setFolders((prev) => [...prev, data as Folder].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedFolderId(data.id);
      }
    } catch (e: unknown) {
      setErrorText(friendlyError(e, t("common.error")));
    } finally {
      setCreatingFolder(false);
    }
  }

  async function saveAll() {
    setErrorText(null);
    setMsg(null);
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");

      const normalizedVisibility = shareMode === "groups" ? "groups" : shareMode;

      const { error: upErr } = (await rawSb
        .from(table)
        .update({ title: draftTitle.trim(), visibility: normalizedVisibility, folder_id: selectedFolderId })
        .eq("id", itemId)) as { error: UpdateError };
      if (upErr) throw new Error(upErr.message);

      await rawSb.from(shareTable).delete().eq(shareFk, itemId);
      if (shareMode === "groups" && groupIds.length) {
        const rows = groupIds.map((gid) => ({ [shareFk]: itemId, group_id: gid }));
        const { error } = (await rawSb.from(shareTable).insert(rows)) as { error: UpdateError };
        if (error) throw new Error(error.message);
      }

      setMsg(t("common.saved"));
      onUpdated?.();
    } catch (e: unknown) {
      setErrorText(friendlyError(e, t("common.error")));
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem() {
    setErrorText(null);
    setMsg(null);
    setSaving(true);
    try {
      await rawSb.from(shareTable).delete().eq(shareFk, itemId);
      const { error } = (await rawSb.from(table).delete().eq("id", itemId)) as { error: UpdateError };
      if (error) throw new Error(error.message);

      setMsg(t("common.deleted"));
      if (onDeleted) onDeleted();
      else window.location.href = defaultRedirect;
    } catch (e: unknown) {
      setErrorText(friendlyError(e, t("common.error")));
    } finally {
      setSaving(false);
      setShowConfirmDelete(false);
    }
  }

  const fid = `set-${itemId}`;

  return (
    <DisclosureRow icon={<Settings2 size={18} aria-hidden />} title={itemTitle ? title : t("common.settings")} sub={subtitle}>
      <div className="grid gap-6">
        <Field label={t("common.title")} htmlFor={`${fid}-title`}>
          <input id={`${fid}-title`} className="input" value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder={t("common.title")} />
        </Field>

        <Field label={t("folders.folder")} htmlFor={`${fid}-folder`}>
          <select
            id={`${fid}-folder`}
            className="select"
            value={selectedFolderId ?? ""}
            onChange={(e) => setSelectedFolderId(e.target.value ? e.target.value : null)}
          >
            <option value="">{rootLabel}</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              className="input min-w-0 flex-1"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder={t("folders.newPlaceholder")}
              aria-label={t("folders.new")}
            />
            <button type="button" className="btn btn-secondary shrink-0" onClick={createFolder} disabled={creatingFolder || !newFolderName.trim()}>
              {creatingFolder ? t("common.saving") : "Nouveau dossier"}
            </button>
          </div>
        </Field>

        <Field label={t("sharing.title")}>
          <ShareModeSeg value={shareMode} onChange={setShareMode} disabled={saving} />
          {shareMode === "groups" ? (
            <div className="grid gap-2">
              {loadingShares ? <p className="t-micro">{t("common.loading")}</p> : null}
              <GroupMultiPicker value={groupIds} onChange={setGroupIds} defaultSelectGroupId={activeGroupId} />
            </div>
          ) : null}
        </Field>

        {errorText ? (
          <p role="alert" className="rounded-[12px] border border-pen/30 bg-pen/5 px-4 py-3 text-[13.5px] text-pen">
            {errorText}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn btn-primary"
              onClick={saveAll}
              disabled={saving || !draftTitle.trim() || (shareMode === "groups" && groupIds.length === 0)}
            >
              {saving ? t("common.saving") : t("common.save")}
            </button>
            {msg ? (
              <span role="status" className="t-small">
                {msg}
              </span>
            ) : null}
          </div>

          {showConfirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="t-small">{t("common.confirmDelete")}</span>
              <button type="button" className="btn btn-danger btn-sm" onClick={deleteItem} disabled={saving}>
                {t("common.confirm")}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowConfirmDelete(false)} disabled={saving}>
                {t("common.cancel")}
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-ghost text-pen" onClick={() => setShowConfirmDelete(true)} disabled={saving}>
              <Trash2 size={15} aria-hidden /> {t("common.delete")}
            </button>
          )}
        </div>
      </div>
    </DisclosureRow>
  );
}
