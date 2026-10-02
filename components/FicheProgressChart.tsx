"use client";

import type { Run } from "@/lib/ficheLog";

type Point = { x: number; y: number };

const MODE_LABEL: Record<Run["mode"], string> = {
  page: "Quiz de page",
  errors: "Mes erreurs",
  mixed: "Bilan aléatoire",
};

// Catmull-Rom → Bézier cubique (même technique que PracticeProgressChart :
// pas de lib de charting dans ce repo).
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

const fmtDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

export function FicheProgressChart({ runs }: { runs: Run[] }) {
  if (runs.length < 2) {
    return (
      <div className="rounded-xl border border-white/[0.07] py-6 text-center text-xs text-white/40">
        {runs.length === 0
          ? "Termine une série (au moins 5 questions) pour voir ta courbe de progression."
          : "Une seule série pour l'instant — il en faut au moins deux pour tracer une courbe."}
      </div>
    );
  }

  const W = 600;
  const H = 190;
  const PAD_X = 16;
  const PAD_TOP = 14;
  const PAD_BOTTOM = 26;
  const xFor = (i: number) => PAD_X + (i / (runs.length - 1)) * (W - 2 * PAD_X);
  const yFor = (pct: number) => PAD_TOP + (1 - pct / 100) * (H - PAD_TOP - PAD_BOTTOM);

  const pts = runs.map((r, i) => ({ x: xFor(i), y: yFor(r.pct) }));
  const lineD = smoothPath(pts);
  const baseline = H - PAD_BOTTOM;
  const areaD = `${lineD} L ${pts[pts.length - 1].x.toFixed(1)},${baseline} L ${pts[0].x.toFixed(1)},${baseline} Z`;
  const avg = Math.round(runs.reduce((s, r) => s + r.pct, 0) / runs.length);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-white" preserveAspectRatio="none" role="img" aria-label="Progression des scores par série">
        <defs>
          <linearGradient id="ficheProgressFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.14" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={PAD_X} x2={W - PAD_X} y1={yFor(g)} y2={yFor(g)} stroke="currentColor" strokeOpacity={0.12} strokeWidth={1} />
            <text x={2} y={yFor(g) + 3} fontSize={9} fill="currentColor" fillOpacity={0.5}>
              {g}
            </text>
          </g>
        ))}
        <line x1={PAD_X} x2={W - PAD_X} y1={yFor(70)} y2={yFor(70)} stroke="currentColor" strokeOpacity={0.45} strokeDasharray="5 4" strokeWidth={1.2} />
        <path d={areaD} fill="url(#ficheProgressFill)" stroke="none" />
        <path d={lineD} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {runs.map((r, i) => (
          <circle
            key={r.runId}
            cx={pts[i].x}
            cy={pts[i].y}
            r={4.5}
            style={{
              fill: r.pct >= 70 ? "var(--ink)" : r.pct >= 50 ? "var(--paper)" : "var(--pen)",
              stroke: r.pct >= 50 && r.pct < 70 ? "var(--ink)" : "var(--paper)",
            }}
            strokeWidth={2}
          >
            <title>
              {fmtDate(r.date)} — {MODE_LABEL[r.mode]} — {r.correct}/{r.total} ({r.pct}%)
            </title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-white/40">
        <span>{fmtDate(runs[0].date)}</span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-0 w-3 border-t border-dashed border-white/60" /> Seuil 70% · moyenne {avg}% sur {runs.length} séries
        </span>
        <span>{fmtDate(runs[runs.length - 1].date)}</span>
      </div>
    </div>
  );
}
