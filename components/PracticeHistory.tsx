"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type SessionRow = {
  id: string;
  set_id: string;
  set_title: string;
  mode: "qcm" | "flashcards";
  correct: number;
  total: number;
  occurred_at: string;
};

function pct(correct: number, total: number) {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

function pctColor(p: number) {
  if (p >= 70) return "text-green-400";
  if (p >= 55) return "text-yellow-400";
  return "text-red-400";
}

function relDate(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const min = Math.floor(d / 60000);
  const h = Math.floor(d / 3600000);
  const days = Math.floor(d / 86400000);
  if (min < 2) return "à l'instant";
  if (min < 60) return `il y a ${min}min`;
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${days}j`;
}

export function PracticeHistory() {
  const supabase = useMemo(() => createClient(), []);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromSupabase, setFromSupabase] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from("practice_sessions")
          .select("id,set_id,set_title,mode,correct,total,occurred_at")
          .order("occurred_at", { ascending: false })
          .limit(20);

        if (!error && data && data.length > 0) {
          setSessions(data as SessionRow[]);
          setFromSupabase(true);
        } else {
          // Fallback: localStorage
          try {
            const raw = localStorage.getItem("cfa_session_stats");
            if (raw) {
              const parsed = JSON.parse(raw) as Record<string, {
                setId: string; title: string; mode: string; correct: number; total: number; lastStudied: number;
              }>;
              const rows: SessionRow[] = Object.values(parsed)
                .sort((a, b) => b.lastStudied - a.lastStudied)
                .map((s) => ({
                  id: s.setId,
                  set_id: s.setId,
                  set_title: s.title,
                  mode: s.mode as "qcm" | "flashcards",
                  correct: s.correct,
                  total: s.total,
                  occurred_at: new Date(s.lastStudied).toISOString(),
                }));
              setSessions(rows);
            }
          } catch {}
        }
      } catch {
        // practice_sessions table might not exist yet — silent fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase]);

  if (loading || sessions.length === 0) return null;

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Historique de pratique</div>
        <div className="flex items-center gap-2">
          {fromSupabase && (
            <span className="text-[10px] text-white/30">synchronisé</span>
          )}
          <span className="text-xs text-white/35">{sessions.length} session(s)</span>
        </div>
      </div>
      <div className="grid gap-2.5">
        {sessions.slice(0, 8).map((s) => {
          const p = pct(s.correct, s.total);
          return (
            <div key={s.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{s.set_title}</div>
                <div className="text-xs text-muted">
                  {s.mode === "qcm" ? "QCM" : "Flashcards"} · {relDate(s.occurred_at)}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className={`text-sm font-semibold tabular-nums ${pctColor(p)}`}>{p}%</div>
                <div className="text-[10px] text-white/35">{s.correct}/{s.total}</div>
              </div>
            </div>
          );
        })}
      </div>
      {sessions.length > 8 && (
        <div className="mt-3 text-xs text-white/35">+ {sessions.length - 8} session(s) supplémentaire(s)</div>
      )}
    </div>
  );
}
