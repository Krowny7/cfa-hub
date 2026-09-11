"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LineChart, ChevronDown, Check } from "lucide-react";

type PastSession = {
  id: string;
  topics: string[];
  format: number;
  score: number;
  total: number;
  completed_at: string;
};

type Point = { x: number; y: number };

function topicLabelFor(labels: Record<string, string>, key: string) {
  return labels[key] ?? key;
}

// Catmull-Rom → Bézier cubique : donne une courbe lissée qui passe par tous
// les points, sans dépendance externe (pas de lib de charting dans ce repo).
function smoothPath(pts: Point[]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function TopicFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const current = options.find((o) => o.value === value)?.label ?? value;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/80 transition hover:bg-white/[0.07]"
      >
        {current}
        <ChevronDown size={13} className={`text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1.5 max-h-64 w-56 overflow-auto rounded-xl border border-white/10 bg-neutral-900 p-1 shadow-xl shadow-black/40">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                o.value === value ? "bg-blue-500/15 text-blue-300" : "text-white/70 hover:bg-white/[0.06]"
              }`}
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && <Check size={13} className="shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
  const H = 200;
  const PAD_X = 16;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 28;

  const avg = points.length > 0 ? Math.round(points.reduce((s, p) => s + p.pct, 0) / points.length) : 0;

  const xFor = (i: number) => (points.length <= 1 ? W / 2 : PAD_X + (i / (points.length - 1)) * (W - 2 * PAD_X));
  const yFor = (pct: number) => PAD_TOP + (1 - pct / 100) * (H - PAD_TOP - PAD_BOTTOM);

  const linePts = points.map((p, i) => ({ x: xFor(i), y: yFor(p.pct) }));
  const lineD = smoothPath(linePts);
  const baseline = H - PAD_BOTTOM;
  const areaD = linePts.length > 0
    ? `${lineD} L ${linePts[linePts.length - 1].x.toFixed(1)},${baseline} L ${linePts[0].x.toFixed(1)},${baseline} Z`
    : "";

  const filterOptions = [
    { value: "all", label: "Tous les topics" },
    ...availableTopics.map((k) => ({ value: k, label: topicLabelFor(topicLabels, k) })),
  ];

  return (
    <div className="card p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <LineChart size={15} /> Progression
        </div>
        {availableTopics.length > 1 && (
          <TopicFilter value={filter} onChange={setFilter} options={filterOptions} />
        )}
      </div>

      {points.length < 2 ? (
        <div className="py-6 text-center text-xs text-white/40">Pas assez de sessions sur ce filtre pour tracer une courbe.</div>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="practiceProgressFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0, 25, 50, 75, 100].map((g) => (
              <g key={g}>
                <line
                  x1={PAD_X} x2={W - PAD_X}
                  y1={yFor(g)} y2={yFor(g)}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={1}
                />
                <text x={2} y={yFor(g) + 3} fontSize={9} fill="rgba(255,255,255,0.28)">{g}</text>
              </g>
            ))}

            <line
              x1={PAD_X} x2={W - PAD_X}
              y1={yFor(70)} y2={yFor(70)}
              stroke="#4ade80"
              strokeOpacity={0.35}
              strokeDasharray="5 4"
              strokeWidth={1.2}
            />
            <line
              x1={PAD_X} x2={W - PAD_X}
              y1={yFor(avg)} y2={yFor(avg)}
              stroke="#60a5fa"
              strokeOpacity={0.5}
              strokeDasharray="2 3"
              strokeWidth={1.2}
            />

            <path d={areaD} fill="url(#practiceProgressFill)" stroke="none" />
            <path d={lineD} fill="none" stroke="#60a5fa" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

            {points.map((p, i) => (
              <circle
                key={p.id}
                cx={linePts[i].x}
                cy={linePts[i].y}
                r={4.5}
                fill={p.pct >= 70 ? "#4ade80" : p.pct >= 50 ? "#facc15" : "#f87171"}
                stroke="#0a0a0a"
                strokeWidth={2}
              >
                <title>{p.date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — {p.pct}%</title>
              </circle>
            ))}
          </svg>

          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-white/40">
            <span>{points[0].date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
            <span className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-0 w-3 border-t border-dashed border-green-400/60" /> Seuil 70%
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-0 w-3 border-t border-dashed border-blue-400/70" /> Moyenne {avg}%
              </span>
            </span>
            <span>{points[points.length - 1].date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
          </div>
        </>
      )}
    </div>
  );
}
