"use client";

import { useMemo } from "react";
import { useI18n } from "@/components/I18nProvider";

export type XpDay = { day: string; xp: number };

export function XpBarChart({ data, title }: { data: XpDay[]; title?: string }) {
  const { t } = useI18n();
  const maxXp = useMemo(() => Math.max(0, ...data.map((d) => d.xp || 0)), [data]);
  const safeMax = maxXp || 1;

  return (
    <div className="card-soft p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">{title ?? t("people.xpDailyChart")}</div>
        <div className="text-xs opacity-70">{t("people.xpMaxPerDay", { n: maxXp })}</div>
      </div>

      <div className="mt-4 grid grid-cols-[repeat(90,minmax(0,1fr))] items-end gap-[2px]">
        {data.map((d) => {
          const h = Math.max(2, Math.round((d.xp / safeMax) * 60));
          return (
            <div key={d.day} className="group relative">
              <div
                className="w-full rounded-sm bg-white/70 opacity-70 group-hover:opacity-100"
                style={{ height: `${h}px` }}
                title={`${d.day} : ${d.xp} XP`}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] opacity-70">
        <span>{data[0]?.day}</span>
        <span>{data[data.length - 1]?.day}</span>
      </div>
    </div>
  );
}
