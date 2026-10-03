"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Users } from "lucide-react";
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
  return row.study_groups?.name ?? "(groupe)";
}

function groupInviteOf(row: GroupRow): string {
  return row.study_groups?.invite_code ?? "";
}

// Tes groupes (Moi → Réglages) : le groupe actif est présélectionné quand tu
// partages un contenu. Renommer, quitter, supprimer (propriétaire), créer ou
// rejoindre avec un code d'invitation.
export function GroupSettings({ activeGroupId, groups }: { activeGroupId: string | null; groups: GroupRow[] }) {
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const { error } = await supabase.from("profiles").update({ active_group_id: groupId }).select().single();
      if (error) throw error;
      window.location.reload();
    } catch (e: unknown) {
      setMsg(`${friendlyError(e, t("common.error"))}`);
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
    const nextName = editName.trim();
    if (!nextName) return;
    setRowBusyId(groupId);
    setMsg(null);
    try {
      const { error } = await supabase.from("study_groups").update({ name: nextName }).eq("id", groupId);
      if (error) throw error;
      setEditingId(null);
      setEditName("");
      window.location.reload();
    } catch (e: unknown) {
      setMsg(`${friendlyError(e, t("common.error"))}`);
    } finally {
      setRowBusyId(null);
    }
  }

  async function leaveGroup(groupId: string) {
    if (!userId) throw new Error("Not logged in");
    if (activeGroupId === groupId) {
      const { error } = await supabase.from("profiles").update({ active_group_id: null }).eq("id", userId);
      if (error) throw error;
    }
    const { error } = await supabase.from("group_memberships").delete().eq("group_id", groupId).eq("user_id", userId);
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
        setMsg(`${base}. ${t("settings.leave")} : ${t("settings.confirmLeaveGroup")}`);
      } else {
        setMsg(`${base}`);
      }
    } finally {
      setRowBusyId(null);
      setPendingRemove(null);
    }
  }

  async function copyInvite(groupId: string, code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(groupId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setMsg("Impossible de copier automatiquement.");
    }
  }

  async function createGroup() {
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.rpc("create_group", { group_name: name.trim() });
      if (error) throw error;
      setName("");
      window.location.reload();
    } catch (e: unknown) {
      setMsg(`${friendlyError(e, t("common.error"))}`);
    } finally {
      setBusy(false);
    }
  }

  async function joinGroup() {
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.rpc("join_group", { invite: invite.trim() });
      if (error) throw error;
      setInvite("");
      window.location.reload();
    } catch (e: unknown) {
      setMsg(`${friendlyError(e, t("common.error"))}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex flex-col gap-5 p-[22px]">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold text-muted">
        <Users size={15} aria-hidden /> Tes groupes
        {groups.length > 0 && <span className="font-mono tabular-nums">{groups.length}</span>}
      </h3>

      {groups.length === 0 ? (
        <p className="t-small">Aucun groupe pour l&apos;instant : crée le tien ou rejoins celui d&apos;un ami avec son code.</p>
      ) : (
        <ul className="-mx-[22px] my-0 list-none divide-y divide-line border-y border-line p-0">
          {groups.map((g) => {
            const id = groupIdOf(g);
            const sgName = groupNameOf(g);
            const inviteCode = groupInviteOf(g);
            const isActive = id === activeGroupId;
            const owner = isOwner(id);
            const showDelete = canAttemptDelete(id);
            const disabled = rowBusyId === id || busy;

            return (
              <li key={id} className="flex flex-col gap-3 px-[22px] py-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  {editingId === id ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        className="input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder={t("settings.groupNamePlaceholder")}
                        disabled={disabled}
                        aria-label="Nouveau nom du groupe"
                      />
                      <div className="flex gap-2">
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => saveRename(id)} disabled={disabled || !editName.trim()}>
                          {t("common.save")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setEditingId(null);
                            setEditName("");
                          }}
                          disabled={disabled}
                        >
                          {t("common.cancel")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="flex items-center gap-2 text-[14.5px] font-semibold">
                        <span className="truncate">{sgName}</span>
                        {isActive && <span className="badge badge-public shrink-0">Actif</span>}
                      </p>
                      {inviteCode && (
                        <p className="t-micro mt-1 flex items-center gap-1.5">
                          Code d&apos;invitation <code className="font-mono font-semibold text-white">{inviteCode}</code>
                          <button
                            type="button"
                            className="grid h-6 w-6 place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-white"
                            onClick={() => copyInvite(id, inviteCode)}
                            aria-label={`Copier le code d'invitation de ${sgName}`}
                            title="Copier"
                          >
                            {copiedId === id ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                          </button>
                        </p>
                      )}
                    </>
                  )}
                </div>

                {editingId !== id && (
                  <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                    {pendingRemove?.id === id ? (
                      <>
                        <span className="t-micro pr-1">
                          {pendingRemove.action === "delete" ? t("settings.confirmDeleteGroup") : t("settings.confirmLeaveGroup")}
                        </span>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(id, pendingRemove.action)} disabled={disabled}>
                          {t("common.confirm")}
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPendingRemove(null)} disabled={disabled}>
                          {t("common.cancel")}
                        </button>
                      </>
                    ) : (
                      <>
                        {!isActive && (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setActive(id)} disabled={disabled}>
                            {t("settings.setActive")}
                          </button>
                        )}
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => startRename(id, sgName)} disabled={disabled}>
                          {t("settings.rename")}
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPendingRemove({ id, action: "leave" })} disabled={disabled}>
                          {t("settings.leave")}
                        </button>
                        {showDelete && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm text-pen"
                            onClick={() => setPendingRemove({ id, action: "delete" })}
                            disabled={disabled || (!owner && typeof ownerByGroupId[id] === "string")}
                          >
                            {t("settings.delete")}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card-quiet grid gap-3 p-4">
          <label htmlFor="grp-create" className="text-[13.5px] font-semibold">
            {t("settings.createGroup")}
          </label>
          <div className="flex gap-2">
            <input
              id="grp-create"
              className="input min-w-0 flex-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("settings.groupNamePlaceholder")}
              disabled={busy}
            />
            <button type="button" className="btn btn-secondary shrink-0" disabled={busy || !name.trim()} onClick={createGroup}>
              {busy ? "…" : t("settings.create")}
            </button>
          </div>
        </div>

        <div className="card-quiet grid gap-3 p-4">
          <label htmlFor="grp-join" className="text-[13.5px] font-semibold">
            {t("settings.joinGroup")}
          </label>
          <div className="flex gap-2">
            <input
              id="grp-join"
              className="input min-w-0 flex-1 font-mono placeholder:font-sans"
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              placeholder={t("settings.joinPlaceholder")}
              disabled={busy}
            />
            <button type="button" className="btn btn-secondary shrink-0" disabled={busy || !invite.trim()} onClick={joinGroup}>
              {busy ? "…" : t("settings.join")}
            </button>
          </div>
        </div>
      </div>

      {msg && (
        <p role="status" className="text-[13px] font-medium">
          {msg}
        </p>
      )}
    </div>
  );
}
