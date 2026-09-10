"use client";

import { useMemo, useState } from "react";
import { LineChart } from "lucide-react";

type PastSession = {
  id: string;
  topics: string[];
  format: number;
  score: number;
  total: number;
  completed_at: string;
};

function topicLabelFor(labels: Record<string, string>, key: string) {
  return labels[key] ?? key;
}

export function PracticeProgressChart({
  pastSessions,
  topicLabels,
}: {
  pastSessions: PastSession[];
  topicLabels: Record<string, string>;
}) {
  const [filter, setFilter] = useState<string>("all");

  const availableTopics = useMemo(() => {
    const s = new Set<string>();
    for (const sess of pastSessions) for (const t of sess.topics) s.add(t);
    return [...s];
  }, [pastSessions]);

  const points = useMemo(() => {
    const filtered = pastSessions
      .filter((s) => filter === "all" || s.topics.includes(filter))
      .filter((s) => s.total > 0)
      .slice()
      .sort((a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime());
    return filtered.map((s) => ({
      pct: Math.round((s.score / s.total) * 100),
      date: new Date(s.completed_at),
      id: s.id,
    }));
  }, [pastSessions, filter]);

  if (pastSessions.length < 2) return null;

  const W = 600;
  const H = 180;
  const PAD = 24;

  const avg = points.length > 0 ? Math.round(points.reduce((s, p) => s + p.pct, 0) / points.length) : 0;

  const xFor = (i: number) => (points.length <= 1 ? W / 2 : PAD + (i / (points.length - 1)) * (W - 2 * PAD));
  const yFor = (pct: number) => PAD + (1 - pct / 100) * (H - 2 * PAD);

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(p.pct).toFixed(1)}`).join(" ");

  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <LineChart size={15} /> Progression
        </div>
        {availableTopics.length > 1 && (
          <select
            className="input py-1 text-xs"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Tous les topics</option>
            {availableTopics.map((k) => (
              <option key={k} value={k}>{topicLabelFor(topicLabels, k)}</option>
            ))}
          </select>
        )}
      </div>

      {points.length < 2 ? (
        <div className="text-xs text-white/40">Pas assez de sessions sur ce filtre pour tracer une courbe.</div>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
            {[0, 25, 50, 75, 100].map((g) => (
              <line
                key={g}
                x1={PAD} x2={W - PAD}
                y1={yFor(g)} y2={yFor(g)}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={1}
              />
            ))}
            <line
              x1={PAD} x2={W - PAD}
              y1={yFor(70)} y2={yFor(70)}
              stroke="rgba(34,197,94,0.25)"
              strokeDasharray="4 3"
              strokeWidth={1}
            />
            <line
              x1={PAD} x2={W - PAD}
              y1={yFor(avg)} y2={yFor(avg)}
              stroke="rgba(96,165,250,0.4)"
              strokeDasharray="2 2"
              strokeWidth={1}
            />
            <path d={pathD} fill="none" stroke="#60a5fa" strokeWidth={2} />
            {points.map((p, i) => (
              <circle key={p.id} cx={xFor(i)} cy={yFor(p.pct)} r={3.5} fill={p.pct >= 70 ? "#4ade80" : p.pct >= 50 ? "#facc15" : "#f87171"}>
                <title>{p.date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — {p.pct}%</title>
              </circle>
            ))}
          </svg>
          <div className="mt-2 flex items-center justify-between text-[11px] text-white/40">
            <span>{points[0].date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
            <span>Moyenne : {avg}%</span>
            <span>{points[points.length - 1].date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
          </div>
        </>
      )}
    </div>
  );
}
