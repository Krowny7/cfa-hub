"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export function ExamDateSettings() {
  const supabase = useMemo(() => createClient(), []);
  const [examDate, setExamDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        const { data } = await supabase
          .from("profiles")
          .select("exam_date")
          .eq("id", auth.user.id)
          .maybeSingle();
        setExamDate((data as { exam_date?: string | null } | null)?.exam_date ?? "");
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Non connecté");
      const { error } = await supabase
        .from("profiles")
        .update({ exam_date: examDate || null })
        .eq("id", auth.user.id);
      if (error) throw new Error(error.message);
      setMsg("✅ Sauvegardé");
    } catch (e: unknown) {
      setMsg(`❌ ${e instanceof Error ? e.message : "Erreur"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        <span className="text-lg">🎓</span>
        <div>
          <div className="text-sm font-semibold">Date d'examen CFA</div>
          <div className="text-xs text-white/50">Affiche un compteur J- sur le dashboard</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          className="input w-auto"
          type="date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          disabled={loading || busy}
        />
        <button
          className="btn btn-primary"
          onClick={save}
          disabled={loading || busy}
          type="button"
        >
          {busy ? "…" : "Sauvegarder"}
        </button>
        {examDate && (
          <button
            className="btn btn-ghost text-xs"
            onClick={() => setExamDate("")}
            type="button"
          >
            Effacer
          </button>
        )}
      </div>

      {msg && <div className="mt-2 text-sm">{msg}</div>}
    </div>
  );
}
