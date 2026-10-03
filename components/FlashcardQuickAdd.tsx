"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import { Field } from "@/components/ContentDetailHeader";

// Ajout rapide d'une carte (recto, verso) à la fin du set.
export function FlashcardQuickAdd({ setId, nextPosition }: { setId: string; nextPosition: number }) {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="grid w-full min-w-0 gap-4">
      <h3 className="text-[14px] font-semibold">{t("flashcards.quickAddTitle")}</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Recto" htmlFor="qa-front">
          <textarea
            id="qa-front"
            className="input box-border h-28 w-full min-w-0 whitespace-pre-wrap break-words"
            placeholder="Terme, question…"
            value={front}
            onChange={(e) => setFront(e.target.value)}
          />
        </Field>
        <Field label="Verso" htmlFor="qa-back">
          <textarea
            id="qa-back"
            className="input box-border h-28 w-full min-w-0 whitespace-pre-wrap break-words"
            placeholder="Définition, réponse…"
            value={back}
            onChange={(e) => setBack(e.target.value)}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="btn btn-primary"
          disabled={busy || !front.trim() || !back.trim()}
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            try {
              const ins = await supabase.from("flashcards").insert({
                set_id: setId,
                front: front.trim(),
                back: back.trim(),
                position: nextPosition,
              });
              if (ins.error) throw ins.error;
              setFront("");
              setBack("");
              setMsg(t("common.saved"));
              window.location.reload();
            } catch (e: unknown) {
              setMsg(`${friendlyError(e, t("common.error"))}`);
            } finally {
              setBusy(false);
            }
          }}
          type="button"
        >
          <Plus size={16} aria-hidden /> {busy ? t("common.saving") : t("flashcards.addCard")}
        </button>
        {msg && (
          <span role="status" className="t-small break-words">
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
