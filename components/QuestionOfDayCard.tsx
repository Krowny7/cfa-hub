"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { RichContent } from "@/components/RichContent";

type LocalizedQ = {
  prompt: string;
  choices: string[];
  correct_index: number;
  explanation?: string | null;
};

type QodPayload = {
  date: string;
  id: string;
  fr: LocalizedQ;
  en: LocalizedQ;
};

export function QuestionOfDayCard() {
  const { locale, t } = useI18n();
  const [data, setData] = useState<QodPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<number | null>(null);
  const [validated, setValidated] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch("/api/qod", { cache: "no-store" });
        if (!res.ok) throw new Error("fetch");
        const json = (await res.json()) as QodPayload;
        if (!alive) return;
        setData(json);
      } catch (e: any) {
        if (!alive) return;
        setErr(String(e?.message ?? "error"));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const q = useMemo(() => {
    if (!data) return null;
    return locale === "en" ? data.en : data.fr;
  }, [data, locale]);

  if (loading) {
    return (
      <div className="card p-6">
        <div className="text-sm font-semibold">{t("qod.title")}</div>
        <div className="mt-2 text-sm opacity-70">{t("qod.loading")}</div>
      </div>
    );
  }

  if (err || !data || !q) {
    return (
      <div className="card p-6">
        <div className="text-sm font-semibold">{t("qod.title")}</div>
        <div className="mt-2 text-sm opacity-70">{t("qod.unavailable")}</div>
      </div>
    );
  }

  const isCorrect = validated && picked != null && picked === q.correct_index;
  const showCorrection = validated && picked != null;

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{t("qod.title")}</div>
          <div className="mt-1 text-xs opacity-70">{t("qod.subtitle", { date: data.date })}</div>
        </div>
        <div className="text-xs opacity-60">#{data.id}</div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-neutral-900/40 p-4">
        <div className="text-sm font-semibold opacity-90">
          <RichContent text={q.prompt} />
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {(q.choices ?? []).map((c, idx) => {
          const pickedThis = picked === idx;
          const correctThis = idx === q.correct_index;
          const base =
            "w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40";
          const state = !showCorrection
            ? pickedThis
              ? "border-blue-500/40 bg-blue-500/10"
              : "border-white/10 bg-neutral-900/40 hover:bg-white/5"
            : pickedThis
              ? correctThis
                ? "border-green-500/40 bg-green-500/15"
                : "border-red-500/40 bg-red-500/15"
              : correctThis
                ? "border-green-500/25 bg-green-500/10"
                : "border-white/10 bg-neutral-900/40";

          return (
            <button
              key={idx}
              type="button"
              aria-pressed={pickedThis}
              className={`${base} ${state}`}
              onClick={() => {
                if (validated) return;
                setPicked(idx);
              }}
            >
              <div className="opacity-90 break-words [overflow-wrap:anywhere]">
                <RichContent text={c} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm opacity-70">
          {validated ? (isCorrect ? t("qod.correct") : t("qod.wrong")) : t("qod.choose")}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          {!validated ? (
            <button
              type="button"
              className="box-border w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50 sm:w-auto"
              disabled={picked == null}
              onClick={() => picked != null && setValidated(true)}
            >
              {t("qod.validate")}
            </button>
          ) : (
            <button
              type="button"
              className="rounded-lg border border-white/10 bg-neutral-900/60 px-4 py-2 text-sm hover:bg-white/5"
              onClick={() => {
                setPicked(null);
                setValidated(false);
              }}
            >
              {t("qod.retry")}
            </button>
          )}
        </div>
      </div>

      {showCorrection && (q.explanation || q.correct_index != null) ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-neutral-900/40 p-4 text-sm">
          <div className="font-semibold">{t("qod.correction")}</div>
          <div className="mt-2 opacity-90">
            ✅ <RichContent text={(q.choices ?? [])[q.correct_index]} />
          </div>
          {q.explanation ? (
            <div className="mt-2 opacity-80">
              <RichContent text={q.explanation} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
