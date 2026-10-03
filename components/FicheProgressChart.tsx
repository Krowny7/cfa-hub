"use client";

import { useId } from "react";
import type { Run } from "@/lib/ficheLog";

type Point = { x: number; y: number };

const MODE_LABEL: Record<Run["mode"], string> = {
  page: "Quiz de page",
  errors: "Mes erreurs",
  mixed: "Bilan aléatoire",
};

const THRESHOLD = 70;

// Catmull-Rom → Bézier cubique (même technique que PracticeProgressChart :
// pas de lib de charting dans ce repo).
function smoothPath(pts: Point[]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

const fmtDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

// Courbe des scores par série. Le tracé est un SVG étiré sur toute la largeur
// (repère 0–100) ; les points, la grille et les libellés sont en HTML posés
// en pourcentages, pour rester ronds et lisibles à toutes les largeurs.
export function FicheProgressChart({ runs }: { runs: Run[] }) {
  const gid = "fpc" + useId().replace(/[^a-zA-Z0-9_-]/g, "");

  if (runs.length < 2) {
    return (
      <div className="card-quiet px-5 py-8 text-center t-small">
        {runs.length === 0
          ? "Termine une série (au moins 5 questions) pour voir ta courbe de progression."
          : "Une seule série pour l'instant — il en faut au moins deux pour tracer une courbe."}
      </div>
    );
  }

  const xFor = (i: number) => (i / (runs.length - 1)) * 100;
  const yFor = (pct: number) => 100 - pct;
  const pts = runs.map((r, i) => ({ x: xFor(i), y: yFor(r.pct) }));
  const lineD = smoothPath(pts);
  const areaD = `${lineD} L 100,100 L 0,100 Z`;
  const avg = Math.round(runs.reduce((s, r) => s + r.pct, 0) / runs.length);
  const last = runs[runs.length - 1];

  return (
    <div>
      <div className="relative ml-7 mr-2 mt-2 h-[170px] md:h-[190px]" role="img" aria-label={`Progression des scores sur ${runs.length} séries, moyenne ${avg} %, dernière ${last.pct} %`}>
        {/* grille */}
        {[0, 25, 50, 75, 100].map((g) => (
          <div key={g} className="absolute inset-x-0 border-t border-line" style={{ top: `${yFor(g)}%` }} aria-hidden>
            <span className="absolute -left-7 w-5 -translate-y-1/2 text-right font-mono text-[10.5px] text-muted tabular-nums">{g}</span>
          </div>
        ))}
        {/* seuil */}
        <div
          className="absolute inset-x-0 border-t border-dashed border-[color-mix(in_oklab,var(--ink)_45%,transparent)]"
          style={{ top: `${yFor(THRESHOLD)}%` }}
          aria-hidden
        />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible text-white" aria-hidden>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.13" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill={`url(#${gid})`} stroke="none" />
          <path
            d={lineD}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {runs.map((r, i) => (
          <span
            key={r.runId}
            className="absolute h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
            style={{
              left: `${pts[i].x}%`,
              top: `${pts[i].y}%`,
              background: r.pct >= THRESHOLD ? "var(--ink)" : r.pct >= 50 ? "var(--surface)" : "var(--pen)",
              borderColor: r.pct >= 50 && r.pct < THRESHOLD ? "var(--ink)" : "var(--surface)",
            }}
            title={`${fmtDate(r.date)} — ${MODE_LABEL[r.mode]} — ${r.correct}/${r.total} (${r.pct} %)`}
          />
        ))}
        {/* dernière valeur */}
        <span
          className="absolute -translate-y-1/2 translate-x-[calc(-100%-10px)] whitespace-nowrap rounded-[6px] bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-black tabular-nums"
          style={{ left: `${pts[pts.length - 1].x}%`, top: `${pts[pts.length - 1].y}%` }}
          aria-hidden
        >
          {last.pct} %
        </span>
      </div>
      <div className="ml-7 mr-2 mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12px] text-muted">
        <span>{fmtDate(runs[0].date)}</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0 w-3.5 border-t border-dashed border-[color-mix(in_oklab,var(--ink)_55%,transparent)]" aria-hidden />
          Seuil {THRESHOLD} % · moyenne {avg} % sur {runs.length} séries
        </span>
        <span>{fmtDate(last.date)}</span>
      </div>
    </div>
  );
}
