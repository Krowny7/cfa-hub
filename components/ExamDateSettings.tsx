"use client";

import { useEffect, useMemo, useState } from "react";
import { GraduationCap } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";

// Date d'examen : alimente le compte à rebours J-xx de l'accueil et de Moi.
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
      setMsg("Sauvegardé");
    } catch (e: unknown) {
      setMsg(`${friendlyError(e, "Erreur")}`);
    } finally {
      setBusy(false);
    }
  }

  // Aperçu du compte à rebours pendant la saisie (dates en UTC, comme en base).
  const days = examDate ? Math.ceil((new Date(examDate + "T00:00:00Z").getTime() - Date.now()) / 86_400_000) : null;

  return (
    <div className="card flex flex-col gap-4 p-[22px]">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold text-muted">
        <GraduationCap size={15} aria-hidden />
        Date d&apos;examen
        {days !== null && !Number.isNaN(days) && (
          <span className="ml-auto rounded-[8px] border border-line-2 px-2 py-[2px] font-mono text-[12px] text-white">
            {days > 0 ? `J-${days}` : days === 0 ? "Jour J" : "passée"}
          </span>
        )}
      </h3>
      <p className="text-[13px] text-muted">Affiche le compte à rebours J-xx sur l&apos;accueil et dans ton espace.</p>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="rl-exam-date" className="sr-only">
          Date de ton examen CFA
        </label>
        <input
          id="rl-exam-date"
          className="input w-auto"
          type="date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          disabled={loading || busy}
        />
        <button className="btn btn-primary" onClick={save} disabled={loading || busy} type="button">
          {busy ? "…" : "Sauvegarder"}
        </button>
        {examDate && (
          <button className="btn btn-ghost text-[13px]" onClick={() => setExamDate("")} type="button">
            Effacer
          </button>
        )}
      </div>

      {msg && (
        <div role="status" className="text-[13px] font-medium">
          {msg}
        </div>
      )}
    </div>
  );
}
