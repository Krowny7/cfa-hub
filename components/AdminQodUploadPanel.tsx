"use client";

import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";

export function AdminQodUploadPanel() {
  const { locale } = useI18n();
  const isFR = locale === "fr";

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/qod", { method: "POST", body: fd });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "upload failed");
      }
      setMsg(isFR ? "✅ Upload OK" : "✅ Upload OK");
    } catch (e: any) {
      setMsg(`❌ ${String(e?.message ?? "error")}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="text-sm font-semibold opacity-90">{isFR ? "Question du jour" : "Question of the Day"}</div>
      <div className="text-sm opacity-80">
        {isFR
          ? "Upload un fichier JSON (bilingue FR/EN). Il sera utilisé pour sélectionner la même question pour tous les utilisateurs chaque jour."
          : "Upload a JSON file (bilingual FR/EN). It will be used to select the same question for all users every day."}
      </div>

      <div className="rounded-xl border border-white/10 bg-neutral-900/40 p-4">
        <input
          type="file"
          accept="application/json,.json"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!file || busy}
            onClick={upload}
          >
            {busy ? (isFR ? "Upload…" : "Uploading…") : isFR ? "Uploader" : "Upload"}
          </button>
          {msg ? <div className="text-xs opacity-80">{msg}</div> : null}
        </div>
      </div>

      <details className="rounded-xl border border-white/10 bg-neutral-950/40 p-4">
        <summary className="cursor-pointer select-none text-sm font-semibold">{isFR ? "Format JSON" : "JSON format"}</summary>
        <pre className="mt-3 overflow-auto rounded-lg bg-black/30 p-3 text-xs leading-relaxed">
{`{
  "version": 1,
  "questions": [
    {
      "id": "ethics_001",
      "fr": {
        "prompt": "...",
        "choices": ["A", "B", "C"],
        "correct_index": 1,
        "explanation": "..." 
      },
      "en": {
        "prompt": "...",
        "choices": ["A", "B", "C"],
        "correct_index": 1,
        "explanation": "..." 
      }
    }
  ]
}`}
        </pre>
      </details>
    </div>
  );
}
