"use client";

import { useId } from "react";
import { LOGO_TRACK, RING_FULL, RING_FULL_AXIS } from "@/components/ink/paths";
import { TIERS } from "@/lib/ranks";

// Badge de rang façon Overwatch : un cœur hexagonal (l'hexagone du logo) en
// métal, un chevron, puis ailes, piliers, couronne et lauriers selon le
// palier. Option : le halo à l'encre (l'anneau du logo) qui fait le tour du
// badge au prorata de la maîtrise.

const hexPts = (cx: number, cy: number, r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = ((-90 + 60 * i) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  });
const poly = (pts: readonly (readonly [number, number])[]) => "M " + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ") + " Z";

const CORE = hexPts(100, 92, 36);
const CORE_D = poly(CORE);
const CORE_INNER = poly(hexPts(100, 92, 24));
const WING_LOW = "M 70 104 L 46 96 L 54 112 L 40 112 L 64 128 L 76 120 Z";
const PILLAR = "M 58 64 L 66 58 L 70 64 L 70 118 L 62 126 L 58 118 Z";
const WING_BIG = "M 64 78 L 22 54 L 30 70 L 12 70 L 34 88 L 20 92 L 48 104 L 64 98 Z";
const WING_HIGH = "M 70 62 L 44 24 L 46 44 L 32 36 L 52 66 L 66 74 Z";
const CROWN = "M 80 46 L 84 22 L 92 38 L 100 12 L 108 38 L 116 22 L 120 46 Z";
const CHEVRON = "M 66 118 L 100 146 L 134 118 L 134 132 L 100 162 L 66 132 Z";
const CHEVRON_2 = "M 74 140 L 100 162 L 126 140 L 126 150 L 100 174 L 74 150 Z";
const LAURELS = [-1, 1].flatMap((s) =>
  Array.from({ length: 5 }, (_, k) => {
    const a = (Math.PI / 180) * (s < 0 ? 200 - k * 20 : -20 + k * 20);
    const x = 100 + Math.cos(a) * 84;
    const y = 108 + Math.sin(a) * 84 * 0.9;
    return { x, y, rot: (a * 180) / Math.PI + (s < 0 ? -60 : 60) };
  })
);

export function RankBadge({
  tier,
  size = 48,
  mastery = null,
  division = null,
  onDark = false,
  glow = true,
  animate = false,
  gray = false,
  className,
  title,
}: {
  /** index du palier dans TIERS (0 = Bronze … 7 = Top 10) */
  tier: number;
  size?: number;
  /** maîtrise 0–100 : dessine le halo à l'encre autour du badge */
  mastery?: number | null;
  /** « III », « II », « I » au cœur du badge */
  division?: string | null;
  /** halo blanc (sur une carte sombre) */
  onDark?: boolean;
  glow?: boolean;
  /** le halo se dessine à l'apparition */
  animate?: boolean;
  /** palier pas encore atteint (métal grisé) */
  gray?: boolean;
  className?: string;
  title?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ti = Math.max(0, Math.min(TIERS.length - 1, tier));
  const t = TIERS[ti];
  const [hi, mid, lo] = gray ? ["#F2F2F2", "#C9C9C9", "#8A8A8A"] : t.metal;
  const G = `url(#${uid}g)`;
  const GD = `url(#${uid}d)`;
  const stroke = { stroke: lo, strokeWidth: 1.6, strokeLinejoin: "round" as const };
  const sym = (d: string, fill: string) => (
    <>
      <path d={d} fill={fill} {...stroke} />
      <path d={d} transform="translate(200 0) scale(-1 1)" fill={fill} {...stroke} />
    </>
  );
  const withHalo = mastery !== null && mastery !== undefined;
  const m = withHalo ? Math.max(0, Math.min(100, mastery as number)) : 0;
  const vb = withHalo ? "0 -6 200 212" : "4 4 192 182";
  const height = withHalo ? (size * 212) / 200 : (size * 182) / 192;
  const label = title ?? `${t.name}${division ? " " + division : ""}${withHalo ? `, maîtrise ${m} %` : ""}`;

  return (
    <svg viewBox={vb} width={size} height={height} role="img" aria-label={label} className={className} style={{ display: "block", overflow: "visible", flex: "none" }}>
      <defs>
        <linearGradient id={`${uid}g`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={hi} />
          <stop offset=".45" stopColor={mid} />
          <stop offset="1" stopColor={lo} />
        </linearGradient>
        <linearGradient id={`${uid}d`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mid} />
          <stop offset="1" stopColor={lo} />
        </linearGradient>
        <linearGradient id={`${uid}s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".85" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${uid}r`}>
          <stop offset="0" stopColor={mid} stopOpacity=".55" />
          <stop offset="1" stopColor={mid} stopOpacity="0" />
        </radialGradient>
        {withHalo && (
          <mask id={`${uid}m`} maskUnits="userSpaceOnUse" x="-10" y="-10" width="260" height="260">
            <path
              d={RING_FULL_AXIS}
              pathLength={100}
              className={animate ? "rl-halo" : undefined}
              fill="none"
              stroke="#fff"
              strokeWidth={60}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${m} 140`}
            />
          </mask>
        )}
      </defs>
      {withHalo && (
        <g transform="translate(100 98) scale(.8) translate(-120 -120)">
          <path d={LOGO_TRACK} fill="none" stroke={onDark ? "#fff" : "currentColor"} strokeOpacity={onDark ? 0.18 : 0.1} strokeWidth={9} strokeLinejoin="round" />
          <g mask={`url(#${uid}m)`}>
            <path d={RING_FULL} filter="url(#rl-ink)" fill={onDark ? "#fff" : "currentColor"} />
          </g>
        </g>
      )}
      {glow && ti >= 5 && !gray && <circle cx={100} cy={96} r={ti === 7 ? 96 : 84} fill={`url(#${uid}r)`} />}
      {ti >= 1 && sym(WING_LOW, GD)}
      {ti >= 2 && sym(PILLAR, GD)}
      {ti >= 3 && sym(WING_BIG, GD)}
      {ti >= 5 && sym(WING_HIGH, GD)}
      {ti >= 6 && <path d={CROWN} fill={G} {...stroke} />}
      {ti >= 7 &&
        LAURELS.map((l, i) => (
          <ellipse key={i} cx={l.x} cy={l.y} rx={9} ry={4} transform={`rotate(${l.rot.toFixed(1)} ${l.x.toFixed(1)} ${l.y.toFixed(1)})`} fill={G} stroke={lo} strokeWidth={1} />
        ))}
      <path d={CHEVRON} fill={G} {...stroke} />
      {ti >= 4 && <path d={CHEVRON_2} fill={GD} {...stroke} />}
      <path d={CORE_D} fill={G} {...stroke} />
      {ti >= 4 &&
        CORE.map((p, i) => {
          const q = CORE[(i + 1) % 6];
          return <path key={i} d={`M 100 92 L ${p[0].toFixed(1)} ${p[1].toFixed(1)} L ${q[0].toFixed(1)} ${q[1].toFixed(1)} Z`} fill={i % 2 ? "#fff" : lo} opacity={i % 2 ? 0.28 : 0.18} />;
        })}
      <path d={CORE_INNER} fill="none" stroke={lo} strokeWidth={2.4} opacity={0.55} strokeLinejoin="round" />
      <path d={CORE_D} fill={`url(#${uid}s)`} opacity={0.7} />
      {division && (
        <text x={100} y={101} textAnchor="middle" fill={lo} style={{ fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: 24 }}>
          {division}
        </text>
      )}
    </svg>
  );
}
