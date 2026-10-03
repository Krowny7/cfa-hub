"use client";

import { useState } from "react";
import type { RatingEvent } from "@/lib/rating";
import { fmtInt, fmtShortDate, signed } from "@/components/classement/format";

// Courbe d'ELO (SVG maison) : trait d'encre qui se dessine au pinceau, aire
// teintée du métal du palier, un repère par match (rond = duel, losange =
// examen blanc classé). Survol : ligne verticale + infobulle (date, type,
// variation, ELO après le match).

const W = 460;
const H = 150;
const X0 = 10;
const X1 = W - 10;
const Y0 = 18;
const Y1 = 128;

const SOURCE: Record<string, string> = { duel: "Duel", mock_exam: "Examen blanc classé", placement: "Placement" };

function niceStep(range: number) {
  for (const s of [10, 25, 50, 100, 200, 250, 500]) if (range / s <= 4) return s;
  return 1000;
}

export function EloChart({ events, tint }: { events: RatingEvent[]; tint: string }) {
  const [hover, setHover] = useState<number | null>(null);

  // Le premier point est l'ELO d'avant le premier match affiché.
  const values = [events[0].eloBefore, ...events.map((e) => e.eloAfter)];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const step = niceStep(Math.max(1, hi - lo));
  const vMin = Math.floor((lo - step * 0.25) / step) * step;
  const vMax = Math.max(vMin + step, Math.ceil((hi + step * 0.25) / step) * step);
  const x = (i: number) => X0 + ((X1 - X0) * i) / Math.max(1, values.length - 1);
  const y = (v: number) => Y1 - ((v - vMin) / (vMax - vMin)) * (Y1 - Y0);
  const pts = values.map((v, i) => [x(i), y(v)] as const);
  const line = pts.map(([px, py], i) => `${i ? "L" : "M"} ${px.toFixed(1)} ${py.toFixed(1)}`).join(" ");
  const area = `${line} L ${X1.toFixed(1)} ${H} L ${X0.toFixed(1)} ${H} Z`;
  const ticks: number[] = [];
  for (let v = vMin; v <= vMax; v += step) ticks.push(v);
  const slot = (X1 - X0) / Math.max(1, values.length - 1);

  const h = hover !== null && hover > 0 ? hover : null;
  const ev = h !== null ? events[h - 1] : null;

  return (
    <div className="relative text-white">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`Évolution de ton ELO sur les ${events.length} derniers matchs : de ${values[0]} à ${values[values.length - 1]}`}
        style={{ display: "block", overflow: "visible" }}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={0} x2={W} y1={y(t)} y2={y(t)} stroke="var(--line-2)" strokeDasharray="3 5" />
            <text x={0} y={y(t) - 4} style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "var(--ink-2)" }}>
              {t}
            </text>
          </g>
        ))}
        <path d={area} fill={tint} opacity={0.16} />
        {h !== null && <line x1={pts[h][0]} x2={pts[h][0]} y1={Y0 - 8} y2={H} stroke="var(--ink-2)" strokeWidth={1} />}
        <path d={line} pathLength={100} className="rl-drawline" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map(([px, py], i) => {
          const last = i === pts.length - 1;
          const active = i === h;
          const src = i > 0 ? events[i - 1].source : null;
          const r = last || active ? 5 : 3.2;
          if (src === "mock_exam") {
            const s = r * 1.25;
            return (
              <path
                key={i}
                d={`M ${px} ${py - s} L ${px + s} ${py} L ${px} ${py + s} L ${px - s} ${py} Z`}
                fill={last || active ? "currentColor" : "var(--surface)"}
                stroke="currentColor"
                strokeWidth={2}
              />
            );
          }
          return <circle key={i} cx={px} cy={py} r={r} fill={last || active ? "currentColor" : "var(--surface)"} stroke="currentColor" strokeWidth={2} />;
        })}
        {/* zones de survol, plus larges que les repères */}
        {pts.map(([px], i) =>
          i === 0 ? null : (
            <rect key={i} x={px - slot / 2} y={0} width={slot} height={H} fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
          ),
        )}
      </svg>

      {ev && h !== null && (
        <div
          role="status"
          className={
            "pointer-events-none absolute z-10 w-max -translate-y-full rounded-[10px] border border-line bg-surface px-3 py-2 text-[12px] shadow-[var(--shadow-2)] " +
            (pts[h][0] / W < 0.25 ? "-translate-x-3" : pts[h][0] / W > 0.75 ? "-translate-x-[calc(100%-12px)]" : "-translate-x-1/2")
          }
          style={{ left: `${(pts[h][0] / W) * 100}%`, top: `calc(${(pts[h][1] / H) * 100}% - 12px)` }}
        >
          <div className="font-semibold">
            {SOURCE[ev.source] ?? "Match"} · {fmtShortDate(ev.createdAt)}
          </div>
          <div className="mt-0.5 font-mono tabular-nums text-muted">
            <span className="font-semibold text-white">{signed(ev.delta)}</span> → {fmtInt(ev.eloAfter)}
          </div>
        </div>
      )}

      <ul className="sr-only">
        {events.map((e) => (
          <li key={e.id}>
            {SOURCE[e.source] ?? "Match"} du {fmtShortDate(e.createdAt)} : {signed(e.delta)}, ELO {e.eloAfter}
          </li>
        ))}
      </ul>
    </div>
  );
}
