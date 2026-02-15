"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/I18nProvider";

type Props = {
  defaultDate?: string | null; // YYYY-MM-DD
  defaultLabel?: string | null;
};

type Stored = { date: string; label: string };

const STORAGE_KEY = "cfa_exam_config_v1";

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Force midnight UTC so everyone sees the same countdown regardless of timezone.
  const d = new Date(dateStr + "T00:00:00.000Z");
  if (isNaN(d.getTime())) return null;
  return d;
}

function formatTwo(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export function CountdownCard({ defaultDate, defaultLabel }: Props) {
  const { t } = useI18n();

  const [edit, setEdit] = useState(false);
  const [stored, setStored] = useState<Stored | null>(null);
  const [draftDate, setDraftDate] = useState<string>(defaultDate ?? "");
  const [draftLabel, setDraftLabel] = useState<string>(defaultLabel ?? t("dashboard.countdown.defaultLabel"));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Stored;
        if (parsed?.date) {
          setStored(parsed);
          setDraftDate(parsed.date);
          setDraftLabel(parsed.label || t("dashboard.countdown.defaultLabel"));
        }
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const effective = stored ?? (defaultDate ? { date: defaultDate, label: defaultLabel ?? t("dashboard.countdown.defaultLabel") } : null);
  const target = effective ? parseDate(effective.date) : null;

  const diff = useMemo(() => {
    if (!target) return null;
    const ms = target.getTime() - now;
    return ms;
  }, [target, now]);

  const timeParts = useMemo(() => {
    if (diff === null) return null;
    const ms = diff;
    const past = ms <= 0;
    const abs = Math.abs(ms);
    const totalSeconds = Math.floor(abs / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { past, days, hours, minutes, seconds };
  }, [diff]);

  function save() {
    const d = parseDate(draftDate);
    if (!d) return;
    const next: Stored = {
      date: draftDate,
      label: (draftLabel || t("dashboard.countdown.defaultLabel")).trim()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    setStored(next);
    setEdit(false);
  }

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">{t("dashboard.countdown.title")}</h3>
          <p className="mt-1 text-sm text-white/70">{t("dashboard.countdown.subtitle")}</p>
        </div>

        <button
          type="button"
          onClick={() => setEdit((v) => !v)}
          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs hover:bg-white/[0.06]"
        >
          {t("common.edit")}
        </button>
      </div>

      {!effective || !target ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-sm text-white/80">{t("dashboard.countdown.notSet")}</div>
          <div className="mt-1 text-xs text-white/60">{t("dashboard.countdown.notSetHint")}</div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-white/60">{effective.label}</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">
                {timeParts?.past ? t("dashboard.countdown.past") : t("dashboard.countdown.remaining")}
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <div className="text-center">
                <div className="text-3xl font-semibold">{timeParts?.days ?? 0}</div>
                <div className="text-xs text-white/60">{t("dashboard.countdown.days")}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-semibold">
                  {formatTwo(timeParts?.hours ?? 0)}:{formatTwo(timeParts?.minutes ?? 0)}:{formatTwo(timeParts?.seconds ?? 0)}
                </div>
                <div className="text-xs text-white/60">{t("dashboard.countdown.hms")}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {edit ? (
        <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="text-xs text-white/60">{t("dashboard.countdown.date")}</label>
            <input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2 text-sm outline-none focus:border-white/20"
            />
          </div>
          <div>
            <label className="text-xs text-white/60">{t("dashboard.countdown.label")}</label>
            <input
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              placeholder={t("dashboard.countdown.defaultLabel")}
              className="mt-1 w-full rounded-xl border border-white/10 bg-neutral-950/60 px-3 py-2 text-sm outline-none focus:border-white/20"
            />
          </div>

          <div className="sm:col-span-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEdit(false)}
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm hover:bg-white/[0.06]"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-full border border-white/10 bg-blue-500/90 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-blue-500"
            >
              {t("common.save")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
