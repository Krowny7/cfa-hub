"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { loadSRS, saveSRS, applyReview, sortBySRS, type CardSRS } from "@/lib/srs";

type Card = { id: string; front: string; back: string };

// Carte à retournement 3D : les deux faces sont TOUJOURS dans le DOM, empilées
// en absolute, et c'est le conteneur qui pivote (rotateY) — backface-visibility
// cache la face qui n'est pas tournée vers l'utilisateur. Un simple swap de
// texte (l'ancienne implémentation) n'a pas d'étape intermédiaire animable.
function CardFace({
  text,
  label,
  hint,
  isBack,
  showBottomHint,
}: {
  text: string;
  label: string;
  hint: string;
  isBack: boolean;
  showBottomHint: boolean;
}) {
  const shouldCenter = text.length <= 420 && !text.includes("\n");

  return (
    <div
      className={[
        "absolute inset-0 flex flex-col rounded-2xl border border-white/10 bg-neutral-900/40 p-6 transition-colors hover:bg-neutral-900/60",
        "overflow-auto overflow-x-hidden",
        "[backface-visibility:hidden]",
        isBack ? "[transform:rotateY(180deg)]" : "",
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold tracking-wide opacity-70">{label}</div>
        <div className="text-xs opacity-60 break-words [overflow-wrap:anywhere]">{hint}</div>
      </div>

      <div className={["mt-5 flex-1 min-w-0", shouldCenter ? "flex items-center justify-center" : ""].join(" ")}>
        <div
          className={[
            "whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-lg leading-relaxed",
            shouldCenter ? "text-center max-w-[70ch]" : "text-left w-full",
          ].join(" ")}
        >
          {text}
        </div>
      </div>

      {showBottomHint ? <div className="mt-5 text-xs opacity-60">{hint}</div> : null}
    </div>
  );
}

function CardPanel({
  current,
  flipped,
  onFlip,
  labelFront,
  labelBack,
  labelHint,
  className,
  showBottomHint = true,
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
  return (
    <button
      type="button"
      onClick={onFlip}
      className={["w-full text-left [perspective:1400px]", className || ""].join(" ")}
    >
      <div
        className={[
          "relative h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.4,0.2,0.2,1)] [transform-style:preserve-3d]",
          flipped ? "[transform:rotateY(180deg)]" : "",
        ].join(" ")}
      >
        <CardFace text={current.front} label={labelFront} hint={labelHint} isBack={false} showBottomHint={showBottomHint} />
        <CardFace text={current.back} label={labelBack} hint={labelHint} isBack showBottomHint={showBottomHint} />
      </div>
    </button>
  );
}

export function FlashcardReview({ cards, setId }: { cards: Card[]; setId?: string }) {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [srsState, setSrsState] = useState<Record<string, CardSRS>>({});
  // Marques de cette passe uniquement (pas persistées) : sert à filtrer les
  // "non maîtrisées" pour le mode révision ciblée, sans se substituer au SRS
  // (qui reste la seule source de vérité pour la planification long terme).
  const [sessionMarks, setSessionMarks] = useState<Record<string, boolean>>({});
  const [reviewMode, setReviewMode] = useState<"all" | "unmastered">("all");

  useEffect(() => {
    if (!setId) return;
    setSrsState(loadSRS(setId));
  }, [setId]);

  // Même ordre de priorité que la Session (dues en retard → nouvelles →
  // à venir) quand un setId est fourni, pour que "Reprendre" depuis /flashcards
  // ne fasse pas perdre la planification de répétition espacée construite en
  // Session.
  const orderedCards = useMemo(() => {
    if (!setId) return cards;
    try {
      return sortBySRS(cards, srsState);
    } catch {
      return cards;
    }
  }, [cards, setId, srsState]);

  const workingCards = useMemo(() => {
    if (reviewMode === "all") return orderedCards;
    return orderedCards.filter((c) => sessionMarks[c.id] === false);
  }, [orderedCards, reviewMode, sessionMarks]);

  const notMasteredCount = useMemo(
    () => orderedCards.filter((c) => sessionMarks[c.id] === false).length,
    [orderedCards, sessionMarks]
  );

  const current = workingCards[Math.min(i, workingCards.length - 1)] ?? null;
  const total = workingCards.length;

  // Si une carte marquée "maîtrisée" disparaît de la liste (mode unmastered),
  // l'index peut dépasser la nouvelle longueur — le clamp ci-dessus gère déjà
  // l'affichage, mais on resynchronise l'état pour que goPrev/goNext restent cohérents.
  useEffect(() => {
    if (i > 0 && i >= total) setI(Math.max(0, total - 1));
  }, [i, total]);

  const progress = useMemo(() => (total ? `${Math.min(i + 1, total)}/${total}` : "0/0"), [i, total]);

  const goPrev = () => {
    setI((v) => Math.max(0, v - 1));
    setFlipped(false);
  };
  const goNext = () => {
    setI((v) => Math.min(total - 1, v + 1));
    setFlipped(false);
  };

  function mark(gotIt: boolean) {
    if (!current) return;
    setSessionMarks((prev) => ({ ...prev, [current.id]: gotIt }));
    if (setId) {
      setSrsState((prev) => {
        const next = applyReview(prev, current.id, gotIt);
        saveSRS(setId, next);
        return next;
      });
    }
    // En mode "non maîtrisées", une carte marquée maîtrisée sort de la liste au
    // prochain rendu — rester sur le même index revient donc à avancer.
    if (reviewMode === "unmastered" && gotIt) {
      setFlipped(false);
    } else {
      goNext();
    }
  }

  function startUnmasteredReview() {
    setReviewMode("unmastered");
    setI(0);
    setFlipped(false);
  }

  function backToAll() {
    setReviewMode("all");
    setI(0);
    setFlipped(false);
  }

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

  if (!cards.length) {
    return (
      <div className="rounded-2xl border p-4">
        <h3 className="font-semibold">{t("flashcards.review")}</h3>
        <div className="mt-2 text-sm opacity-70">{t("flashcards.none")}</div>
      </div>
    );
  }

  const pct = total ? Math.round((Math.min(i + 1, total) / total) * 100) : 0;

  const masteryButtons = current && flipped && (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <button
        type="button"
        className="btn btn-secondary justify-center gap-1.5"
        onClick={() => mark(false)}
      >
        <RotateCcw size={15} /> {t("flashcards.notMastered")}
      </button>
      <button
        type="button"
        className="btn btn-primary justify-center gap-1.5"
        onClick={() => mark(true)}
      >
        <CheckCircle2 size={15} /> {t("flashcards.mastered")}
      </button>
    </div>
  );

  const unmasteredBanner = reviewMode === "unmastered" && (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-orange-400/25 bg-orange-500/10 px-3 py-2 text-xs text-orange-200">
      <span>{t("flashcards.unmasteredMode")}</span>
      <button type="button" className="underline hover:no-underline" onClick={backToAll}>
        {t("flashcards.backToAll")}
      </button>
    </div>
  );

  const reviewUnmasteredButton = reviewMode === "all" && notMasteredCount > 0 && (
    <button
      type="button"
      className="btn btn-secondary mt-3 w-full"
      onClick={startUnmasteredReview}
    >
      {t("flashcards.reviewUnmastered")} ({notMasteredCount})
    </button>
  );

  const shell = (
    <>
      {/* Header: stack on mobile to prevent overflow */}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold">{t("flashcards.review")}</h3>
          <div className="mt-1 text-xs opacity-70 break-words [overflow-wrap:anywhere]">{t("flashcards.reviewHint")}</div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-sm opacity-70 tabular-nums">{progress}</span>
          <button
            type="button"
            className="btn btn-secondary w-full sm:w-auto"
            onClick={() => setFullscreen(true)}
          >
            {t("flashcards.fullscreen")}
          </button>
        </div>
      </div>

      {unmasteredBanner}

      {/* Barre de progression — repère visuel rapide dans le set */}
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-emerald-400/70 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {current ? (
        <>
          <div className="mt-4">
            <CardPanel
              current={current}
              flipped={flipped}
              onFlip={() => setFlipped((v) => !v)}
              labelFront={t("flashcards.front")}
              labelBack={t("flashcards.back")}
              labelHint={t("flashcards.tapToFlip")}
              className="min-h-[42vh] sm:min-h-[360px]"
            />
          </div>

          {masteryButtons}

          {/* Nav: stack buttons on mobile */}
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              className="btn btn-ghost w-full sm:w-auto"
              disabled={i === 0}
              onClick={goPrev}
              type="button"
            >
              {t("flashcards.prev")}
            </button>
            <button
              className="btn btn-ghost w-full sm:w-auto"
              disabled={i >= total - 1}
              onClick={goNext}
              type="button"
            >
              {t("flashcards.next")}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-center text-sm text-emerald-200">
          {t("flashcards.allMastered")}
        </div>
      )}

      {reviewUnmasteredButton}
    </>
  );

  return (
    <>
      <div className="rounded-2xl border p-4">{shell}</div>

      {fullscreen && (
        // z-[100] : au-dessus de la bottom nav mobile (z-50) pour qu'elle ne
        // recouvre plus les boutons Précédente/Suivante en bas de l'écran.
        // paddingBottom réserve la zone home-indicator iOS (safe area).
        <div
          className="fixed inset-0 z-[100] bg-black/70 p-3 sm:p-4 backdrop-blur"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
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
                className="w-full rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/5 sm:w-auto"
                onClick={() => setFullscreen(false)}
              >
                {t("common.close")}
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
              <div className="flex h-full min-h-full flex-col">
                {unmasteredBanner}

                {current ? (
                  <>
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
                            "min-h-[38vh] sm:min-h-[68vh]",
                            "p-6 sm:p-10",
                            "text-[17px] sm:text-[22px] leading-relaxed",
                          ].join(" ")}
                        />
                      </div>
                    </div>

                    <div className="mx-auto mt-5 w-full max-w-5xl">
                      {masteryButtons}

                      {/* Fullscreen nav: stack on mobile */}
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <button
                          className="btn btn-ghost w-full sm:w-auto"
                          disabled={i === 0}
                          onClick={goPrev}
                          type="button"
                        >
                          {t("flashcards.prev")}
                        </button>
                        <button
                          className="btn btn-ghost w-full sm:w-auto"
                          disabled={i >= total - 1}
                          onClick={goNext}
                          type="button"
                        >
                          {t("flashcards.next")}
                        </button>
                      </div>

                      {reviewUnmasteredButton}

                      <div className="mt-3 text-center text-xs opacity-60">{t("flashcards.shortcuts")}</div>
                    </div>
                  </>
                ) : (
                  <div className="m-auto max-w-md rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-center text-sm text-emerald-200">
                    {t("flashcards.allMastered")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
