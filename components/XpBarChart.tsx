"use client";

import { useMemo } from "react";
import { useI18n } from "@/components/I18nProvider";
import { jourCourt } from "@/lib/voice-profil";

export type XpDay = { day: string; xp: number };

/**
 * Un bâton par jour, de gauche à droite, sur toute la largeur (`data` : un
 * jour par entrée, sans trou). `title` : null quand un titre est déjà
 * au-dessus (le repli de Moi › Stats).
 */
export function XpBarChart({ data, title }: { data: XpDay[]; title?: string | null }) {
  const { t } = useI18n();
  const maxXp = useMemo(() => Math.max(0, ...data.map((d) => d.xp || 0)), [data]);
  const safeMax = maxXp || 1;

  return (
    <div className="card-soft p-4">
      <div className="flex items-center justify-between gap-2">
        {title === null ? <span /> : <div className="text-sm font-semibold">{title ?? t("people.xpDailyChart")}</div>}
        <div className="text-xs opacity-70">{t("people.xpMaxPerDay", { n: maxXp })}</div>
      </div>

      <div className="mt-4 grid items-end gap-px sm:gap-[2px]" style={{ gridTemplateColumns: `repeat(${Math.max(1, data.length)}, minmax(0, 1fr))` }}>
        {data.map((d) => {
          const h = Math.max(2, Math.round((d.xp / safeMax) * 60));
          return (
            <div key={d.day} className="group relative">
              <div
                className="w-full rounded-sm bg-white/70 opacity-70 group-hover:opacity-100"
                style={{ height: `${h}px` }}
                title={`${jourCourt(d.day)} : ${d.xp} XP`}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] opacity-70">
        <span>{data[0] ? jourCourt(data[0].day) : null}</span>
        <span>{data.length ? jourCourt(data[data.length - 1].day) : null}</span>
      </div>
    </div>
  );
}
