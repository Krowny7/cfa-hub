"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { subjectByKey } from "@/components/reviser/catalog";

type PastSession = {
  id: string;
  topics: string[];
  format: number;
  score: number;
  total: number;
  completed_at: string;
};

type Point = { x: number; y: number };

// Nom affiché : celui du site (Réviser, S'entraîner), sinon le libellé fourni.
function topicLabelFor(labels: Record<string, string>, key: string) {
  return subjectByKey(key)?.name ?? labels[key] ?? key;
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
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="chip chip-sm max-w-[220px]">
        <span className="truncate">{current}</span>
        <ChevronDown size={13} aria-hidden className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="listbox" className="menu absolute right-0 z-20 mt-1.5 max-h-72 w-60 overflow-auto">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              data-active={o.value === value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className="menu-item justify-between text-[13.5px]"
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && <Check size={14} className="shrink-0" aria-hidden />}
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
  const PAD_X = 22;
  const PAD_TOP = 14;
  const PAD_BOTTOM = 18;

  const avg = points.length > 0 ? Math.round(points.reduce((s, p) => s + p.pct, 0) / points.length) : 0;
  const lastPct = points.length > 0 ? points[points.length - 1].pct : null;

  const xFor = (i: number) => (points.length <= 1 ? W / 2 : PAD_X + (i / (points.length - 1)) * (W - 2 * PAD_X));
  const yFor = (pct: number) => PAD_TOP + (1 - pct / 100) * (H - PAD_TOP - PAD_BOTTOM);

  const linePts = points.map((p, i) => ({ x: xFor(i), y: yFor(p.pct) }));
  const lineD = smoothPath(linePts);
  const baseline = H - PAD_BOTTOM;
  const areaD = linePts.length > 0
    ? `${lineD} L ${linePts[linePts.length - 1].x.toFixed(1)},${baseline} L ${linePts[0].x.toFixed(1)},${baseline} Z`
    : "";

  const filterOptions = [
    { value: "all", label: "Toutes les matières" },
    ...availableTopics.map((k) => ({ value: k, label: topicLabelFor(topicLabels, k) })),
  ];
  // fuseau fixé : le serveur (UTC) et le navigateur doivent écrire la même date
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });

  return (
    <div className="card p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="t-h3 m-0">Progression</h3>
          {points.length >= 2 && (
            <p className="t-micro m-0 mt-1">
              {points.length} sessions · moyenne {avg} %{lastPct !== null ? ` · dernière ${lastPct} %` : ""}
            </p>
          )}
        </div>
        {availableTopics.length > 1 && <TopicFilter value={filter} onChange={setFilter} options={filterOptions} />}
      </div>

      {points.length < 2 ? (
        <div className="t-small py-10 text-center">Pas assez de sessions sur ce filtre pour tracer une courbe.</div>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-5 block h-auto w-full overflow-visible text-white" preserveAspectRatio="none" role="img" aria-label={`Réussite par session, moyenne ${avg} %`}>
            <defs>
              <linearGradient id="practiceProgressFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0, 50, 100].map((g) => (
              <g key={g}>
                <line x1={PAD_X} x2={W - PAD_X} y1={yFor(g)} y2={yFor(g)} stroke="currentColor" strokeOpacity={0.07} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <text x={0} y={yFor(g) + 3} fontSize={9} fill="currentColor" fillOpacity={0.45}>{g}</text>
              </g>
            ))}

            {/* seuil de réussite (70 %) et moyenne */}
            <line x1={PAD_X} x2={W - PAD_X} y1={yFor(70)} y2={yFor(70)} stroke="currentColor" strokeOpacity={0.4} strokeDasharray="5 4" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <line x1={PAD_X} x2={W - PAD_X} y1={yFor(avg)} y2={yFor(avg)} stroke="currentColor" strokeOpacity={0.22} strokeDasharray="2 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />

            <path d={areaD} fill="url(#practiceProgressFill)" stroke="none" />
            <path d={lineD} pathLength={100} className="rl-drawline" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />

            {points.map((p, i) => (
              <circle
                key={p.id}
                cx={linePts[i].x}
                cy={linePts[i].y}
                r={4}
                style={{
                  fill: p.pct >= 70 ? "var(--ink)" : p.pct >= 50 ? "var(--surface)" : "var(--pen)",
                  stroke: p.pct >= 50 && p.pct < 70 ? "var(--ink)" : "var(--surface)",
                }}
                strokeWidth={2}
              >
                {/* un seul texte : React 19 rend un title à plusieurs morceaux vide côté serveur (hydratation cassée) */}
                <title>{`${fmt(p.date)} — ${p.pct} %`}</title>
              </circle>
            ))}
          </svg>

          <div className="t-micro mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span>{fmt(points[0].date)}</span>
            <span className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-0 w-4 border-t border-dashed border-white/60" aria-hidden /> seuil 70 %
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-0 w-4 border-t border-dotted border-white/40" aria-hidden /> moyenne {avg} %
              </span>
            </span>
            <span>{fmt(points[points.length - 1].date)}</span>
          </div>
        </>
      )}
    </div>
  );
}
