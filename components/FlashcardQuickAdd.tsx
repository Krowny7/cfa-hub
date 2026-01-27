"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";

export function FlashcardQuickAdd({ setId, nextPosition }: { setId: string; nextPosition: number }) {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border p-4 min-w-0 max-w-full overflow-x-hidden">
      <h3 className="font-semibold">{t("flashcards.quickAddTitle")}</h3>
      <div className="mt-3 grid gap-2 min-w-0">
        <textarea
          className="h-24 w-full min-w-0 max-w-full rounded-xl border bg-transparent p-3 text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
          placeholder={t("flashcards.frontPlaceholder")}
          value={front}
          onChange={(e) => setFront(e.target.value)}
        />
        <textarea
          className="h-24 w-full min-w-0 max-w-full rounded-xl border bg-transparent p-3 text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
          placeholder={t("flashcards.backPlaceholder")}
          value={back}
          onChange={(e) => setBack(e.target.value)}
        />
        <button
          className="w-full sm:w-auto rounded-lg bg-white px-4 py-2 text-sm font-medium text-black whitespace-normal disabled:opacity-50"
          disabled={busy || !front.trim() || !back.trim()}
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            try {
              const ins = await supabase.from("flashcards").insert({
                set_id: setId,
                front: front.trim(),
                back: back.trim(),
                position: nextPosition
              });
              if (ins.error) throw ins.error;
              setFront("");
              setBack("");
              setMsg("✅");
              window.location.reload();
            } catch (e: any) {
              setMsg(`❌ ${e?.message ?? t("common.error")}`);
            } finally {
              setBusy(false);
            }
          }}
          type="button"
        >
          {busy ? t("common.saving") : t("flashcards.addCard")}
        </button>
        {msg && <div className="text-sm break-words [overflow-wrap:anywhere]">{msg}</div>}
      </div>
    </div>
  );
}
