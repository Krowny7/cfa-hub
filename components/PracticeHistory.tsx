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

// Encre si c'est réussi, rouge correcteur sous 55 %.
function pctColor(p: number) {
  return p < 55 ? "text-pen" : "";
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
    <div className="card p-5 md:p-7">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="t-h3 m-0">Historique</h2>
        <span className="t-micro">
          {fromSupabase && "synchronisé · "}
          {sessions.length} session{sessions.length > 1 ? "s" : ""}
        </span>
      </div>
      <ul className="m-0 list-none divide-y divide-line p-0">
        {sessions.slice(0, 8).map((s) => {
          const p = pct(s.correct, s.total);
          return (
            <li key={s.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14.5px] font-semibold">{s.set_title}</div>
                <div className="t-micro mt-0.5">
                  {s.mode === "qcm" ? "QCM" : "Flashcards"} · {relDate(s.occurred_at)}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className={`text-[15px] font-semibold tabular-nums ${pctColor(p)}`}>{p} %</div>
                <div className="t-micro tabular-nums">
                  {s.correct}/{s.total}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {sessions.length > 8 && <div className="t-micro mt-2">+ {sessions.length - 8} autre{sessions.length - 8 > 1 ? "s" : ""}</div>}
    </div>
  );
}
