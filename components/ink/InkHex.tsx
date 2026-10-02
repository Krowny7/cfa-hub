"use client";

import { useId } from "react";
import { HEX_INNER, HEX_OUTLINE, HEX_RING, HEX_RING_AXIS, HEX_TONE } from "@/components/ink/paths";

export type HexState = "won" | "held" | "front" | "fog";

export function hexStateFromPct(pct: number | null): HexState {
  if (pct === null) return "fog";
  if (pct >= 80) return "won";
  if (pct >= 70) return "held";
  return "front";
}

// Une case de la carte : trame selon l'état (points serrés = conquis, points
// légers = tenu, hachures = front, pointillés = inexploré), anneau au pinceau
// qui fait le tour de la case au prorata de la maîtrise. Le contenu (libellé,
// pourcentage) est posé au centre, sur le papier.
export function InkHex({
  pct,
  state,
  selected = false,
  children,
}: {
  pct: number | null;
  state: HexState;
  selected?: boolean;
  children?: React.ReactNode;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const tone =
    state === "won" ? `url(#${uid}-dense)` : state === "held" ? `url(#${uid}-light)` : state === "front" ? `url(#${uid}-hatch)` : "none";
  const ringColor = state === "front" ? "var(--pen)" : "var(--ink)";
  const value = pct === null ? 0 : Math.max(0, Math.min(100, pct));

  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 240 276" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <defs>
          <pattern id={`${uid}-dense`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <circle cx="4.5" cy="4.5" r="2.6" fill="var(--ink)" />
          </pattern>
          <pattern id={`${uid}-light`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <circle cx="4.5" cy="4.5" r="1.3" fill="var(--ink)" />
          </pattern>
          <pattern id={`${uid}-hatch`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="var(--pen)" strokeWidth="1.6" />
          </pattern>
          <mask id={`${uid}-ring`} maskUnits="userSpaceOnUse" x="-20" y="-20" width="280" height="316">
            <path
              d={HEX_RING_AXIS}
              pathLength={100}
              fill="none"
              stroke="#fff"
              strokeWidth={40}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={100}
              strokeDashoffset={100 - value}
              style={{ transition: "stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1)" }}
            />
          </mask>
        </defs>
        {tone !== "none" && <path d={HEX_TONE} fill={tone} opacity={state === "front" ? 0.55 : 0.9} />}
        <path d={HEX_INNER} fill="var(--paper)" />
        <path
          d={HEX_OUTLINE}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={selected ? 6 : state === "fog" ? 2 : 2.6}
          strokeOpacity={state === "fog" ? 0.35 : 0.8}
          strokeDasharray={state === "fog" ? "6 8" : undefined}
          strokeLinejoin="round"
        />
        {state !== "fog" && value > 0 && (
          <g mask={`url(#${uid}-ring)`}>
            <path d={HEX_RING} fill={ringColor} />
          </g>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
