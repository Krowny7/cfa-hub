"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { stroke, type Pt } from "@/components/ink/geometry";
import type { RatingEvent } from "@/lib/rating";
import { fmtInt, fmtShortDate, signed } from "@/components/classement/format";

// La courbe d'ELO, tracée à l'encre (règle 1 : le pinceau dessine ce qui
// bouge chez toi). Un seul coup de pinceau passe par chaque match : appui à
// la première partie, il s'affine jusqu'au présent, où le pinceau se lève.
// Le quadrillage est au crayon ; le prochain palier, s'il est en vue, est
// coté au stylo rouge (règle 2 : le bout qui manque est nommé). Un repère
// par match (point d'encre = duel, losange = examen blanc classé). Survol :
// une ligne au crayon et l'infobulle (date, type, variation, ELO après).
// Le trait se dessine à l'arrivée (masque, .rl-drawline : mouvement réduit
// respecté). `onDark` : posée dans une carte sombre (couleurs fixes).
// Le repère suit la largeur réelle (ResizeObserver) : les chiffres de l'axe
// gardent leur taille sur téléphone au lieu d'être réduits avec le dessin.

const X0 = 36;
const Y0 = 18;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const SOURCE: Record<string, string> = { duel: "Duel", mock_exam: "Examen blanc classé", placement: "Placement" };

function niceStep(range: number) {
  for (const s of [10, 25, 50, 100, 200, 250, 500]) if (range / s <= 4) return s;
  return 1000;
}

export type EloCap = { elo: number; label: string };

export function EloChart({
  events,
  cap = null,
  onDark = false,
}: {
  events: RatingEvent[];
  /** le prochain palier (ELO et libellé « Platine · encore 88 ») : coté s'il est en vue */
  cap?: EloCap | null;
  onDark?: boolean;
  /** ancienne teinte du dégradé, ignorée (la courbe est à l'encre) */
  tint?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement | null>(null);
  // largeur du repère : 460 au rendu serveur, puis la largeur réelle
  const [W, setW] = useState(460);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(clamp(e.contentRect.width, 280, 820));
      setW((old) => (Math.abs(old - w) > 2 ? w : old));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = Math.round(clamp(W * 0.3, 150, 190));
  const X1 = W - 12;
  const Y1 = H - 22;
  const maskId = "rl-elo-" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const pencil = onDark ? "rgba(255,255,255,.16)" : "var(--pencil)";
  const tickFill = onDark ? "rgba(255,255,255,.42)" : "var(--ink-3)";
  const hollow = onDark ? "#111" : "var(--paper)";

  // Le premier point est l'ELO d'avant le premier match affiché.
  const values = useMemo(() => [events[0].eloBefore, ...events.map((e) => e.eloAfter)], [events]);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  // le palier suivant n'entre dans le cadre que s'il est proche
  const showCap = !!cap && cap.elo > hi && cap.elo - hi <= Math.max(60, (hi - lo) * 1.2);
  const top = showCap && cap ? cap.elo : hi;
  const step = niceStep(Math.max(1, top - lo));
  const vMin = Math.floor((lo - step * 0.25) / step) * step;
  const vMax = Math.max(vMin + step, Math.ceil((top + step * 0.25) / step) * step);
  const x = (i: number) => X0 + ((X1 - X0) * i) / Math.max(1, values.length - 1);
  const y = (v: number) => Y1 - ((v - vMin) / (vMax - vMin)) * (Y1 - Y0);
  const pts: Pt[] = values.map((v, i) => [x(i), y(v)]);
  const ticks: number[] = [];
  for (let v = vMin; v <= vMax; v += step) ticks.push(v);
  const slot = (X1 - X0) / Math.max(1, values.length - 1);

  // le coup de pinceau (contour plein) et son axe (masque qui le dévoile)
  const key = pts.map((p) => p.join(",")).join(";");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const brushD = useMemo(() => stroke(pts, { w: 6.4, end: 0.55, attack: 0.05, jitter: 0.08, seed: 11, per: 10 }), [key]);
  // axe du masque prolongé de 12 px aux deux bouts, à bouts droits : avant
  // le tracé, aucun bout arrondi ne laisse voir une tache d'encre
  const ext: Pt[] = [[pts[0][0] - 12, pts[0][1]], ...pts, [pts[pts.length - 1][0] + 12, pts[pts.length - 1][1]]];
  const axis = ext.map(([px, py], i) => `${i ? "L" : "M"} ${px.toFixed(1)} ${py.toFixed(1)}`).join(" ");

  const h = hover !== null && hover > 0 ? hover : null;
  const ev = h !== null ? events[h - 1] : null;
  const capY = showCap && cap ? y(cap.elo) : null;

  return (
    <div ref={box} className={"relative " + (onDark ? "text-[#fff]" : "text-white")}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`Évolution de ton ELO sur les ${events.length} derniers matchs : de ${values[0]} à ${values[values.length - 1]}`}
        style={{ display: "block", overflow: "visible" }}
        onMouseLeave={() => setHover(null)}
      >
        {/* quadrillage au crayon */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={0} x2={W} y1={y(t)} y2={y(t)} stroke={pencil} strokeWidth={0.8} strokeDasharray="2 5" />
            <text x={0} y={y(t) - 4} style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: tickFill }}>
              {t}
            </text>
          </g>
        ))}

        {/* le prochain palier, au stylo rouge */}
        {capY !== null && cap && (
          <g>
            <line x1={X0} x2={W} y1={capY} y2={capY} stroke="var(--pen)" strokeOpacity={0.7} strokeWidth={0.9} strokeDasharray="1.5 3.5" />
            <text x={W} y={capY - 5} textAnchor="end" style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 600, fill: "var(--pen)" }}>
              {cap.label}
            </text>
          </g>
        )}

        {h !== null && <line x1={pts[h][0]} x2={pts[h][0]} y1={Y0 - 8} y2={H} stroke={pencil} strokeWidth={1} />}

        {/* la courbe : un coup de pinceau, dévoilé le long de son axe */}
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x={-10} y={-10} width={W + 20} height={H + 20}>
            <path d={axis} pathLength={100} className="rl-drawline" fill="none" stroke="#fff" strokeWidth={22} strokeLinejoin="round" strokeLinecap="butt" />
          </mask>
        </defs>
        <path d={brushD} fill="currentColor" mask={`url(#${maskId})`} filter="url(#rl-ink)" />

        {pts.map(([px, py], i) => {
          const last = i === pts.length - 1;
          const active = i === h;
          const src = i > 0 ? events[i - 1].source : null;
          if (i === 0) return null;
          if (src === "mock_exam") {
            const s = last || active ? 5.4 : 4;
            return (
              <path
                key={i}
                d={`M ${px} ${py - s} L ${px + s} ${py} L ${px} ${py + s} L ${px - s} ${py} Z`}
                fill={last || active ? "currentColor" : hollow}
                stroke="currentColor"
                strokeWidth={1.6}
              />
            );
          }
          return <circle key={i} cx={px} cy={py} r={last ? 5.4 : active ? 4.6 : 3.2} fill="currentColor" stroke={hollow} strokeWidth={last ? 1.8 : 1.3} />;
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
            "pointer-events-none absolute z-10 w-max -translate-y-full rounded-[10px] border border-line bg-surface px-3 py-2 text-[12px] text-white shadow-[var(--shadow-2)] " +
            (pts[h][0] / W < 0.25 ? "-translate-x-3" : pts[h][0] / W > 0.75 ? "-translate-x-[calc(100%-12px)]" : "-translate-x-1/2")
          }
          style={{ left: `${(pts[h][0] / W) * 100}%`, top: `calc(${(pts[h][1] / H) * 100}% - 12px)` }}
        >
          <div className="font-semibold">
            {SOURCE[ev.source] ?? "Match"} · {fmtShortDate(ev.createdAt)}
          </div>
          <div className="mt-0.5 font-mono tabular-nums text-muted">
            <span className={"font-semibold " + (ev.delta < 0 ? "text-muted" : "text-white")}>{signed(ev.delta)}</span> → {fmtInt(ev.eloAfter)}
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
