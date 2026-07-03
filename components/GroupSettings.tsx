"use client";

import { useEffect, useMemo, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";

export type GroupRow = {
  group_id: string;
  study_groups?: {
    id: string;
    name: string;
    invite_code?: string | null;
  } | null;
};

type StudyGroupMeta = {
  id: string;
  owner_id: string | null;
};

function groupIdOf(row: GroupRow): string {
  return row.study_groups?.id ?? row.group_id;
}

function groupNameOf(row: GroupRow): string {
  return row.study_groups?.name ?? "(group)";
}

function groupInviteOf(row: GroupRow): string {
  return row.study_groups?.invite_code ?? "";
}

export function GroupSettings({
  activeGroupId,
  groups,
}: {
  activeGroupId: string | null;
  groups: GroupRow[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [pendingRemove, setPendingRemove] = useState<{ id: string; action: "leave" | "delete" } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [ownerByGroupId, setOwnerByGroupId] = useState<Record<string, string | null>>({});

  const ids = useMemo(() => groups.map(groupIdOf).filter(Boolean), [groups]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  useEffect(() => {
    if (!ids.length) return;
    supabase
      .from("study_groups")
      .select("id,owner_id")
      .in("id", ids)
      .then(({ data, error }) => {
        if (error || !data) return;
        const map: Record<string, string | null> = {};
        (data as StudyGroupMeta[]).forEach((g) => {
          map[g.id] = g.owner_id;
        });
        setOwnerByGroupId(map);
      });
  }, [supabase, ids.join("|")]);

  function isOwner(groupId: string) {
    if (!userId) return false;
    return ownerByGroupId[groupId] === userId;
  }

  function canAttemptDelete(groupId: string) {
    if (!userId) return true;
    const ownerId = ownerByGroupId[groupId];
    if (typeof ownerId === "string") return ownerId === userId;
    return true;
  }

  async function setActive(groupId: string) {
    setRowBusyId(groupId);
    setMsg(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ active_group_id: groupId })
        .select()
        .single();
      if (error) throw error;
      window.location.reload();
    } catch (e: unknown) {
      setMsg(`❌ ${friendlyError(e, t("common.error"))}`);
    } finally {
      setRowBusyId(null);
    }
  }

  function startRename(groupId: string, currentName: string) {
    setMsg(null);
    setEditingId(groupId);
    setEditName(currentName);
  }

  async function saveRename(groupId: string) {
    const next = editName.trim();
    if (!next) return;
    setRowBusyId(groupId);
    setMsg(null);
    try {
      const { error } = await supabase
        .from("study_groups")
        .update({ name: next })
        .eq("id", groupId);
      if (error) throw error;
      setEditingId(null);
      setEditName("");
      window.location.reload();
    } catch (e: unknown) {
      setMsg(`❌ ${friendlyError(e, t("common.error"))}`);
    } finally {
      setRowBusyId(null);
    }
  }

  async function leaveGroup(groupId: string) {
    if (!userId) throw new Error("Not logged in");
    if (activeGroupId === groupId) {
      const { error } = await supabase
        .from("profiles")
        .update({ active_group_id: null })
        .eq("id", userId);
      if (error) throw error;
    }
    const { error } = await supabase
      .from("group_memberships")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);
    if (error) throw error;
  }

  async function deleteGroup(groupId: string) {
    const { error } = await supabase.from("study_groups").delete().eq("id", groupId);
    if (error) throw error;
  }

  async function remove(groupId: string, action: "leave" | "delete") {
    setRowBusyId(groupId);
    setMsg(null);
    try {
      if (action === "delete") {
        await deleteGroup(groupId);
      } else {
        await leaveGroup(groupId);
      }
      window.location.reload();
    } catch (e: unknown) {
      const base = friendlyError(e, t("common.error"));
      if (action === "delete") {
        setMsg(`❌ ${base}. ${t("settings.leave")} : ${t("settings.confirmLeaveGroup")}`);
      } else {
        setMsg(`❌ ${base}`);
      }
    } finally {
      setRowBusyId(null);
      setPendingRemove(null);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-base font-semibold">{t("settings.groupsTitle")}</h2>

      <div className="mt-4 grid gap-2">
        {groups.length === 0 && (
          <div className="text-sm opacity-70">{t("settings.noneGroups")}</div>
        )}

        {groups.map((g) => {
          const id = groupIdOf(g);
          const sgName = groupNameOf(g);
          const inviteCode = groupInviteOf(g);
          const isActive = id === activeGroupId;
          const owner = isOwner(id);
          const showDelete = canAttemptDelete(id);
          const disabled = rowBusyId === id || busy;

          return (
            <div
              key={id}
              className="card-soft flex flex-col justify-between gap-2 px-3 py-2 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                {editingId === id ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      className="input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder={t("settings.groupNamePlaceholder")}
                      disabled={disabled}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => saveRename(id)}
                        disabled={disabled || !editName.trim()}
                      >
                        {t("common.save")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => { setEditingId(null); setEditName(""); }}
                        disabled={disabled}
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="truncate text-sm font-medium">{sgName}</div>
                    {inviteCode && (
                      <div className="text-xs opacity-70">
                        {t("settings.inviteCode")}: <code className="opacity-90">{inviteCode}</code>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                {isActive && <span className="badge badge-public">{t("settings.active")}</span>}

                {!isActive && (
                  <button type="button" className="btn btn-secondary" onClick={() => setActive(id)} disabled={disabled}>
                    {t("settings.setActive")}
                  </button>
                )}

                {editingId !== id && (
                  <button type="button" className="btn btn-secondary" onClick={() => startRename(id, sgName)} disabled={disabled}>
                    {t("settings.rename")}
                  </button>
                )}

                {pendingRemove?.id === id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs opacity-80">
                      {pendingRemove.action === "delete"
                        ? t("settings.confirmDeleteGroup")
                        : t("settings.confirmLeaveGroup")}
                    </span>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => remove(id, pendingRemove.action)}
                      disabled={disabled}
                    >
                      {t("common.confirm")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setPendingRemove(null)}
                      disabled={disabled}
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setPendingRemove({ id, action: "leave" })}
                      disabled={disabled}
                    >
                      {t("settings.leave")}
                    </button>

                    {showDelete && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => setPendingRemove({ id, action: "delete" })}
                        disabled={disabled || (!owner && typeof ownerByGroupId[id] === "string")}
                      >
                        {t("settings.delete")}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card-soft p-4">
          <h3 className="font-semibold">{t("settings.createGroup")}</h3>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("settings.groupNamePlaceholder")}
              disabled={busy}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !name.trim()}
              onClick={async () => {
                setBusy(true);
                setMsg(null);
                try {
                  const { error } = await supabase.rpc("create_group", { group_name: name.trim() });
                  if (error) throw error;
                  setName("");
                  window.location.reload();
                } catch (e: unknown) {
                  setMsg(`❌ ${friendlyError(e, t("common.error"))}`);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? t("common.saving") : t("settings.create")}
            </button>
          </div>
        </div>

        <div className="card-soft p-4">
          <h3 className="font-semibold">{t("settings.joinGroup")}</h3>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              className="input"
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              placeholder={t("settings.joinPlaceholder")}
              disabled={busy}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !invite.trim()}
              onClick={async () => {
                setBusy(true);
                setMsg(null);
                try {
                  const { error } = await supabase.rpc("join_group", { invite: invite.trim() });
                  if (error) throw error;
                  setInvite("");
                  window.location.reload();
                } catch (e: unknown) {
                  setMsg(`❌ ${friendlyError(e, t("common.error"))}`);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? t("common.saving") : t("settings.join")}
            </button>
          </div>
        </div>
      </div>

      {msg && <div className="mt-3 text-sm">{msg}</div>}
    </div>
  );
}
