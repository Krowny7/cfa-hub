"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export function FlashcardImporterExporter(props: {
  onImport: (rows: { front: string; back: string }[]) => Promise<void>;
  onExport: () => Promise<string>;
}) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  function parse(): { front: string; back: string }[] {
    return text
      .split("\n")
      .map((l) => l.trimEnd())
      .filter(Boolean)
      .map((line) => {
        const [front, back] = line.split("\t");
        return { front: (front ?? "").trim(), back: (back ?? "").trim() };
      })
      .filter((r) => r.front && r.back);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Import / Export</h2>
        <button
          className="w-full sm:w-auto rounded-lg border border-white/15 px-3 py-1 text-sm hover:bg-white/5"
          onClick={async () => {
            setExporting(true);
            try {
              const out = await props.onExport();
              await navigator.clipboard.writeText(out);
              alert(t("flashcards.copied"));
            } finally {
              setExporting(false);
            }
          }}
          disabled={exporting}
        >
          {exporting ? t("common.loading") : t("flashcards.exportCopy")}
        </button>
      </div>

      <textarea
        className="mt-3 h-40 w-full min-w-0 max-w-full rounded-xl border border-white/15 bg-transparent p-3 text-sm"
        placeholder={t("flashcards.importPlaceholder")}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          className="w-full sm:w-auto rounded-lg bg-white px-4 py-2 text-center text-sm font-medium leading-snug text-black whitespace-normal break-words disabled:opacity-50"
          onClick={async () => {
            const rows = parse();
            if (!rows.length) return;
            setBusy(true);
            try {
              await props.onImport(rows);
              setText("");
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
        >
          {busy ? t("common.loading") : t("flashcards.import")}
        </button>
        <div className="text-xs text-white/60">
          {t("flashcards.importHint")}
        </div>
      </div>
    </section>
  );
}
