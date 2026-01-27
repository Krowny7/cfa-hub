"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";

export function GroupSettings({ activeGroupId, groups }: { activeGroupId: string | null; groups: any[] }) {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border p-4">
      <h2 className="font-semibold">{t("settings.groupsTitle")}</h2>

      <div className="mt-4 grid gap-2">
        {groups.length === 0 && <div className="text-sm opacity-70">{t("settings.noneGroups")}</div>}
        {groups.map((g) => {
          const sg = g.study_groups;
          const isActive = sg.id === activeGroupId;
          return (
            <div
              key={sg.id}
              className="flex flex-col justify-between gap-2 rounded-xl border px-3 py-2 sm:flex-row sm:items-center"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{sg.name}</div>
                <div className="text-xs opacity-70">
                  {t("settings.inviteCode")}: <code className="opacity-90">{sg.invite_code}</code>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isActive && <span className="text-xs rounded-md border px-2 py-1">{t("settings.active")}</span>}
                {!isActive && (
                  <button
                    className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
                    onClick={async () => {
                      setBusy(true);
                      setMsg(null);
                      try {
                        const res = await supabase.from("profiles").update({ active_group_id: sg.id }).select().single();
                        if (res.error) throw res.error;
                        window.location.reload();
                      } catch (e: any) {
                        setMsg(`❌ ${e?.message ?? t("common.error")}`);
                      } finally {
                        setBusy(false);
                      }
                    }}
                    type="button"
                  >
                    {t("settings.setActive")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border p-4">
          <h3 className="font-semibold">{t("settings.createGroup")}</h3>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("settings.groupNamePlaceholder")}
            />
            <button
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
              disabled={busy || !name.trim()}
              onClick={async () => {
                setBusy(true);
                setMsg(null);
                try {
                  const res = await supabase.rpc("create_group", { group_name: name.trim() });
                  if (res.error) throw res.error;
                  setName("");
                  window.location.reload();
                } catch (e: any) {
                  setMsg(`❌ ${e?.message ?? t("common.error")}`);
                } finally {
                  setBusy(false);
                }
              }}
              type="button"
            >
              {busy ? t("common.saving") : t("settings.create")}
            </button>
          </div>
        </div>

        <div className="rounded-xl border p-4">
          <h3 className="font-semibold">{t("settings.joinGroup")}</h3>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              placeholder={t("settings.joinPlaceholder")}
            />
            <button
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
              disabled={busy || !invite.trim()}
              onClick={async () => {
                setBusy(true);
                setMsg(null);
                try {
                  const res = await supabase.rpc("join_group", { invite: invite.trim() });
                  if (res.error) throw res.error;
                  setInvite("");
                  window.location.reload();
                } catch (e: any) {
                  setMsg(`❌ ${e?.message ?? t("common.error")}`);
                } finally {
                  setBusy(false);
                }
              }}
              type="button"
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
