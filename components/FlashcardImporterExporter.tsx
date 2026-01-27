"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";

export function FlashcardImporterExporter({ setId }: { setId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [tsv, setTsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function exportTsv() {
    setMsg(null);
    const { data, error } = await supabase
      .from("flashcards")
      .select("front,back,position")
      .eq("set_id", setId)
      .order("position", { ascending: true });

    if (error) {
      setMsg(`❌ ${error.message}`);
      return;
    }

    const out = (data ?? [])
      .map((c) => `${(c.front ?? "").replaceAll("\t", " ")}\t${(c.back ?? "").replaceAll("\t", " ")}`)
      .join("\n");

    await navigator.clipboard.writeText(out);
    setMsg("✅");
  }

  async function importTsv() {
    setBusy(true);
    setMsg(null);
    try {
      const lines = tsv
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length === 0) throw new Error("Empty");

      const rows = lines.map((line, i) => {
        const parts = line.split("\t");
        if (parts.length < 2) throw new Error(`Line ${i + 1} needs a TAB`);
        const front = parts[0].trim();
        const back = parts.slice(1).join("\t").trim();
        return { set_id: setId, front, back, position: i + 1 };
      });

      const ins = await supabase.from("flashcards").insert(rows);
      if (ins.error) throw ins.error;

      setTsv("");
      setMsg("✅");
      window.location.reload();
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? t("common.error")}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full min-w-0 max-w-full rounded-2xl border p-4">
      {/* Header: stack on mobile to avoid any horizontal overflow */}
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold">{t("flashcards.importing")}</h3>

        <button
          className="box-border w-full rounded-lg border px-3 py-2 text-sm hover:bg-white/5 sm:w-auto sm:whitespace-nowrap"
          type="button"
          onClick={exportTsv}
        >
          {t("flashcards.export")}
        </button>
      </div>

      <p className="mt-1 text-sm opacity-80 break-words [overflow-wrap:anywhere]">{t("flashcards.subtitle")}</p>

      <textarea
        className="box-border mt-3 h-40 w-full min-w-0 max-w-full rounded-xl border bg-transparent p-3 text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
        value={tsv}
        onChange={(e) => setTsv(e.target.value)}
        placeholder={t("flashcards.importPlaceholder")}
      />

      <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        <button
          className="box-border w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-black whitespace-normal disabled:opacity-50 sm:w-auto"
          type="button"
          disabled={busy || !tsv.trim()}
          onClick={importTsv}
        >
          {busy ? t("common.saving") : t("flashcards.import")}
        </button>

        {msg && <div className="text-sm break-words [overflow-wrap:anywhere]">{msg}</div>}
      </div>
    </div>
  );
}
