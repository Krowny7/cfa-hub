"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/I18nProvider";

type Card = { id: string; front: string; back: string };

function CardPanel({
  current,
  flipped,
  onFlip,
  labelFront,
  labelBack,
  labelHint,
  className,
  showBottomHint = true
}: {
  current: Card;
  flipped: boolean;
  onFlip: () => void;
  labelFront: string;
  labelBack: string;
  labelHint: string;
  className?: string;
  showBottomHint?: boolean;
}) {
  const text = flipped ? current.back : current.front;

  // ✅ Center only when it's "short" (otherwise keep top-left + scroll)
  const shouldCenter = text.length <= 140 && !text.includes("\n");

  return (
    <button
      type="button"
      className={[
        "w-full rounded-2xl border border-white/10 bg-neutral-900/40 text-left hover:bg-neutral-900/60",
        "p-6",
        "flex h-full flex-col",
        // ✅ vertical scroll ok, NEVER horizontal overflow
        "overflow-auto overflow-x-hidden",
        className || ""
      ].join(" ")}
      onClick={onFlip}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold tracking-wide opacity-70">
          {flipped ? labelBack : labelFront}
        </div>
        <div className="text-xs opacity-60 break-words [overflow-wrap:anywhere]">{labelHint}</div>
      </div>

      {/* Body zone takes remaining space */}
      <div
        className={["mt-5 flex-1 min-w-0", shouldCenter ? "flex items-center justify-center" : ""].join(" ")}
      >
        {/* ✅ critical: break very long strings without spaces */}
        <div
          className={[
            "whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-lg leading-relaxed",
            shouldCenter ? "text-center max-w-[70ch]" : "text-left w-full"
          ].join(" ")}
        >
          {text}
        </div>
      </div>

      {showBottomHint ? <div className="mt-5 text-xs opacity-60">{labelHint}</div> : null}
    </button>
  );
}

export function FlashcardReview({ cards }: { cards: Card[] }) {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const current = cards[i] ?? null;
  const total = cards.length;

  const progress = useMemo(() => (total ? `${i + 1}/${total}` : "0/0"), [i, total]);

  const goPrev = () => {
    setI((v) => Math.max(0, v - 1));
    setFlipped(false);
  };
  const goNext = () => {
    setI((v) => Math.min(total - 1, v + 1));
    setFlipped(false);
  };

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen, total]);

  if (!current) {
    return (
      <div className="rounded-2xl border p-4">
        <h3 className="font-semibold">{t("flashcards.review")}</h3>
        <div className="mt-2 text-sm opacity-70">{t("flashcards.none")}</div>
      </div>
    );
  }

  const shell = (
    <>
      {/* Header: stack on mobile to prevent overflow */}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold">{t("flashcards.review")}</h3>
          <div className="mt-1 text-xs opacity-70 break-words [overflow-wrap:anywhere]">{t("flashcards.reviewHint")}</div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-sm opacity-70">{progress}</span>
          <button
            type="button"
            className="w-full rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm hover:bg-white/5 sm:w-auto"
            onClick={() => setFullscreen(true)}
          >
            {t("flashcards.fullscreen")}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <CardPanel
          current={current}
          flipped={flipped}
          onFlip={() => setFlipped((v) => !v)}
          labelFront={t("flashcards.front")}
          labelBack={t("flashcards.back")}
          labelHint={t("flashcards.tapToFlip")}
        />
      </div>

      {/* Nav: stack buttons on mobile */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="w-full rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50 sm:w-auto"
          disabled={i === 0}
          onClick={goPrev}
          type="button"
        >
          {t("flashcards.prev")}
        </button>
        <button
          className="w-full rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50 sm:w-auto"
          disabled={i >= total - 1}
          onClick={goNext}
          type="button"
        >
          {t("flashcards.next")}
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="rounded-2xl border p-4">{shell}</div>

      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black/70 p-3 sm:p-4 backdrop-blur">
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl">
            {/* Fullscreen header: stack on mobile */}
            <div className="flex flex-col gap-2 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold">{t("flashcards.review")}</div>
                <div className="text-xs opacity-70 break-words [overflow-wrap:anywhere]">
                  {progress} • {t("flashcards.reviewHint")}
                </div>
              </div>

              <button
                type="button"
                className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5 sm:w-auto"
                onClick={() => setFullscreen(false)}
              >
                {t("common.close")}
              </button>
            </div>

            <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
              <div className="flex h-full flex-col">
                <div className="flex-1">
                  <div className="mx-auto h-full w-full max-w-5xl">
                    <CardPanel
                      current={current}
                      flipped={flipped}
                      onFlip={() => setFlipped((v) => !v)}
                      labelFront={t("flashcards.front")}
                      labelBack={t("flashcards.back")}
                      labelHint={t("flashcards.tapToFlip")}
                      showBottomHint={false}
                      className={[
                        "h-full",
                        "min-h-[62vh] sm:min-h-[68vh]",
                        "p-8 sm:p-10",
                        "text-[20px] sm:text-[22px] leading-relaxed"
                      ].join(" ")}
                    />
                  </div>
                </div>

                <div className="mx-auto mt-5 w-full max-w-5xl">
                  {/* Fullscreen nav: stack on mobile */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      className="w-full rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50 sm:w-auto"
                      disabled={i === 0}
                      onClick={goPrev}
                      type="button"
                    >
                      {t("flashcards.prev")}
                    </button>
                    <button
                      className="w-full rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50 sm:w-auto"
                      disabled={i >= total - 1}
                      onClick={goNext}
                      type="button"
                    >
                      {t("flashcards.next")}
                    </button>
                  </div>

                  <div className="mt-3 text-center text-xs opacity-60">{t("flashcards.shortcuts")}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
