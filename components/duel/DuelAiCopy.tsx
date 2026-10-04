"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { COPIER, PARTIE } from "@/lib/voice-z2";
import { buildDuelAiExport, type DuelAiScope, type DuelReviewItem } from "@/lib/duels";

type Ctx = { myScore: number; theirScore: number | null; total: number };

type Props = {
  review: DuelReviewItem[];
  ctx: Ctx;
  /**
   * block : la carte sombre de la revue (titre, phrase, deux boutons) ;
   * buttons : les deux boutons seuls, sur le papier ;
   * single : un seul bouton « Copier pour l'IA » (mes erreurs, ou tout le
   * duel s'il n'y en a pas).
   */
  layout?: "block" | "buttons" | "single";
};

/** Copie un texte : presse-papiers moderne, puis repli execCommand. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // refusé (cadre, permissions) : on tente le repli
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// « Copier pour l'IA » d'un duel : mes erreurs, ou tout le duel, au format
// des sessions (voir buildDuelAiExport). Si le navigateur refuse la copie,
// le texte s'affiche dans un champ à copier à la main.
export function DuelAiCopy({ review, ctx, layout = "buttons" }: Props) {
  const [copied, setCopied] = useState<DuelAiScope | null>(null);
  const [manual, setManual] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const area = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  useEffect(() => {
    if (manual) area.current?.select();
  }, [manual]);

  const errors = review.filter((q) => !q.isCorrect).length;
  if (review.length === 0) return null;

  async function copy(scope: DuelAiScope) {
    const text = buildDuelAiExport(review, { scope, ...ctx });
    setManual(null);
    if (await copyText(text)) {
      setCopied(scope);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 2600);
    } else {
      setCopied(null);
      setManual(text);
    }
  }

  const onInk = layout === "block";
  const errLabel = COPIER.ratures(errors);
  const done = (
    <>
      <Check size={16} strokeWidth={2.6} aria-hidden /> {COPIER.fait}
    </>
  );

  let buttons: React.ReactNode;
  if (layout === "single") {
    const scope: DuelAiScope = errors > 0 ? "errors" : "all";
    buttons = (
      <button type="button" className="btn btn-secondary" onClick={() => void copy(scope)}>
        {copied ? (
          done
        ) : (
          <>
            <Sparkles size={16} aria-hidden /> {COPIER.label}
          </>
        )}
      </button>
    );
  } else {
    const main = onInk ? "btn btn-lg btn-on-ink" : "btn btn-primary";
    const alt = onInk ? "btn btn-lg btn-on-ink-ghost" : "btn btn-secondary";
    buttons = (
      <div className="grid gap-2.5 sm:flex sm:flex-wrap">
        {errors > 0 && (
          <button type="button" className={main} onClick={() => void copy("errors")}>
            {copied === "errors" ? (
              done
            ) : (
              <>
                <Copy size={16} aria-hidden /> {errLabel}
              </>
            )}
          </button>
        )}
        <button type="button" className={errors > 0 ? alt : main} onClick={() => void copy("all")}>
          {copied === "all" ? (
            done
          ) : (
            <>
              {errors > 0 ? null : <Copy size={16} aria-hidden />}
              {errors > 0 ? PARTIE.iaTout : PARTIE.iaToutSeul}
              <span className={"font-mono text-[12.5px] " + (onInk ? "text-[rgba(255,255,255,.6)]" : "text-muted")}>{review.length}</span>
            </>
          )}
        </button>
      </div>
    );
  }

  const hint = copied ? COPIER.colle : null;

  return (
    <div className={onInk ? "relative grid gap-5" : "grid gap-2.5"}>
      {onInk && (
        <div className="grid gap-1.5">
          <p className="m-0 flex items-center gap-2 text-[19px] font-extrabold tracking-[-0.02em]">
            <Sparkles size={19} aria-hidden /> {COPIER.label}
          </p>
          <p className="m-0 max-w-[520px] text-[14.5px] leading-normal text-[rgba(255,255,255,.68)]">
            {PARTIE.iaTexte}
          </p>
        </div>
      )}
      {buttons}
      <p aria-live="polite" className={onInk ? "m-0 -mt-2 min-h-[1.35em] text-[12.5px] text-[rgba(255,255,255,.62)]" : "sr-only"}>
        {hint}
      </p>
      {manual && (
        <div className="grid gap-2">
          <p className={"m-0 text-[13px] " + (onInk ? "text-[#fff]" : "")}>
            {COPIER.manuel}
          </p>
          <textarea
            ref={area}
            readOnly
            value={manual}
            rows={6}
            aria-label="Texte à copier pour l'IA"
            onFocus={(e) => e.currentTarget.select()}
            className={
              onInk
                ? "w-full resize-y rounded-[12px] border border-[rgba(255,255,255,.2)] bg-[rgba(255,255,255,.06)] p-3 font-mono text-[12px] leading-[1.5] text-[#fff] outline-none"
                : "input resize-y font-mono text-[12px]"
            }
          />
        </div>
      )}
    </div>
  );
}
