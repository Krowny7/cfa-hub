"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export function FlashcardQuickAdd(props: {
  onAdd: (front: string, back: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!front.trim() || !back.trim()) return;
    setSaving(true);
    try {
      await props.onAdd(front.trim(), back.trim());
      setFront("");
      setBack("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-base font-semibold">{t("flashcards.quickAdd")}</h2>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <textarea
          className="h-24 w-full min-w-0 rounded-xl border bg-transparent p-3 text-sm"
          placeholder={t("flashcards.front")}
          value={front}
          onChange={(e) => setFront(e.target.value)}
        />
        <textarea
          className="h-24 w-full min-w-0 rounded-xl border bg-transparent p-3 text-sm"
          placeholder={t("flashcards.back")}
          value={back}
          onChange={(e) => setBack(e.target.value)}
        />
      </div>

      <div className="mt-3 grid">
        <button
          className="w-full rounded-lg bg-white px-4 py-2 text-center text-sm font-medium leading-snug text-black whitespace-normal break-words disabled:opacity-50"
          onClick={handleAdd}
          disabled={saving || !front.trim() || !back.trim()}
        >
          {saving ? t("common.saving") : t("flashcards.addCard")}
        </button>
      </div>
    </section>
  );
}
