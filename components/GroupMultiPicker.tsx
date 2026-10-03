"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";

export type GroupOption = { id: string; name: string };

function dedupeGroups(input: GroupOption[]): GroupOption[] {
  // Keep first occurrence (we order desc by created_at, so first is the most recent)
  const seen = new Set<string>();
  const out: GroupOption[] = [];
  for (const g of input) {
    if (!g?.id) continue;
    if (seen.has(g.id)) continue;
    seen.add(g.id);
    out.push(g);
  }
  return out;
}

export function GroupMultiPicker({
  value,
  onChange,
  defaultSelectGroupId
}: {
  value: string[];
  onChange: (next: string[]) => void;
  defaultSelectGroupId?: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(true);

  const allSelected = groups.length > 0 && value.length === groups.length;

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setGroups([]);
        setLoading(false);
        return;
      }

      // Get groups the user belongs to
      const { data, error } = await supabase
        .from("group_memberships")
        .select("group_id, study_groups ( id, name )")
        .order("created_at", { ascending: false });

      if (error) {
        setGroups([]);
        setLoading(false);
        return;
      }

      type MembershipRow = {
        group_id: string;
        study_groups?: { id: string; name: string } | null;
      };
      const raw: GroupOption[] = ((data ?? []) as unknown as MembershipRow[])
        .map((row) => ({
          id: row.study_groups?.id ?? row.group_id,
          name: row.study_groups?.name ?? "(group)"
        }))
        .filter((x) => Boolean(x.id));

      const unique = dedupeGroups(raw);

      setGroups(unique);
      setLoading(false);

      // If nothing selected yet, optionally auto-select the active group.
      if (value.length === 0 && defaultSelectGroupId) {
        const exists = unique.some((gg) => gg.id === defaultSelectGroupId);
        if (exists) onChange([defaultSelectGroupId]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Choix des groupes avec qui partager : une case par groupe, plus « tous ».
  return (
    <div className="grid gap-3 rounded-[14px] border border-line p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13.5px] font-semibold">{t("sharing.groups")}</span>
        <label className="t-micro flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 accent-white"
            checked={allSelected}
            disabled={loading || groups.length === 0}
            onChange={(e) => {
              if (e.target.checked) onChange(groups.map((gg) => gg.id));
              else onChange([]);
            }}
          />
          {t("sharing.allMyGroups")}
        </label>
      </div>

      {loading ? (
        <p className="t-micro">{t("common.loading")}</p>
      ) : groups.length === 0 ? (
        <p className="t-micro">Aucun groupe : crée ou rejoins-en un dans Moi → Réglages.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {groups.map((g) => {
            const checked = value.includes(g.id);
            return (
              <label
                key={g.id}
                className={
                  "flex cursor-pointer items-center gap-2.5 rounded-[12px] border px-3 py-2.5 text-[14px] transition-colors " +
                  (checked ? "border-white bg-surface font-semibold" : "border-line-2 hover:bg-surface-2")
                }
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 accent-white"
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked) onChange([...new Set([...value, g.id])]);
                    else onChange(value.filter((x) => x !== g.id));
                  }}
                />
                <span className="truncate">{g.name}</span>
              </label>
            );
          })}
        </div>
      )}

      <p className="t-micro">Un contenu peut être partagé avec un ou plusieurs de tes groupes.</p>
    </div>
  );
}