"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import { Field } from "@/components/ContentDetailHeader";

// Import / export au format Quizlet : « terme[TAB]définition », une carte par ligne.
export function FlashcardImporterExporter({ setId }: { setId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [tsv, setTsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function exportTsv() {
    setMsg(null);
    const { data, error } = await supabase.from("flashcards").select("front,back,position").eq("set_id", setId).order("position", { ascending: true });

    if (error) {
      setMsg(`${error.message}`);
      return;
    }

    const out = (data ?? []).map((c) => `${(c.front ?? "").replaceAll("\t", " ")}\t${(c.back ?? "").replaceAll("\t", " ")}`).join("\n");

    try {
      await navigator.clipboard.writeText(out);
      setCopied(true);
      setMsg(`${data?.length ?? 0} cartes copiées (format Quizlet).`);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setMsg("Impossible de copier automatiquement.");
    }
  }

  async function importTsv() {
    setBusy(true);
    setMsg(null);
    try {
      const lines = tsv
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length === 0) throw new Error("Rien à importer.");

      const rows = lines.map((line, i) => {
        const parts = line.split("\t");
        if (parts.length < 2) throw new Error(`Ligne ${i + 1} : il manque une tabulation entre le terme et la définition.`);
        const front = parts[0].trim();
        const back = parts.slice(1).join("\t").trim();
        return { set_id: setId, front, back, position: i + 1 };
      });

      const ins = await supabase.from("flashcards").insert(rows);
      if (ins.error) throw ins.error;

      setTsv("");
      setMsg(t("common.saved"));
      window.location.reload();
    } catch (e: unknown) {
      setMsg(`${friendlyError(e, t("common.error"))}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid w-full min-w-0 gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold">{t("flashcards.importing")}</h3>
          <p className="t-micro mt-1">Compatible Quizlet : terme, tabulation, définition.</p>
        </div>
        <button className="btn btn-secondary shrink-0" type="button" onClick={exportTsv}>
          {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />} {copied ? "Copié" : "Exporter"}
        </button>
      </div>

      <Field label="Importer" hint="une carte par ligne" htmlFor="fc-import">
        <textarea
          id="fc-import"
          className="input box-border h-40 w-full min-w-0 whitespace-pre font-mono text-[13px]"
          value={tsv}
          onChange={(e) => setTsv(e.target.value)}
          placeholder={t("flashcards.importPlaceholder")}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" type="button" disabled={busy || !tsv.trim()} onClick={importTsv}>
          {busy ? t("common.saving") : t("flashcards.import")}
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
