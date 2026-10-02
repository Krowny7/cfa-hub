"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  INTRO_GUIDE,
  LOGO_AXIS,
  LOGO_BRISTLES,
  LOGO_BRUSH,
  LOGO_SPLAT,
  LOGO_START,
  LOGO_TAIL,
  LOGO_TRACK,
  UNDERLINE,
} from "@/components/ink/paths";

/*
 * Intro « L'encre » — joue une fois par session de navigation, par-dessus la
 * première page chargée :
 *   1. une goutte d'encre tombe et éclabousse le papier ;
 *   2. le pinceau trace l'anneau (gouttelettes projetées à chaque angle,
 *      fibres de pinceau sec à la fin) ;
 *   3. « RANKED LOBBY » se peint d'un large coup de pinceau, le slogan s'écrit ;
 *   4. l'anneau s'envole et se pose sur le logo de la barre du haut pendant que
 *      le papier s'efface et révèle le site.
 * Un clic, une touche ou « Passer » saute directement à l'étape 4.
 * `?splash=1` la rejoue, `?splash=off` la coupe.
 */

const SEEN_KEY = "rl-splash-seen";

// Chronologie (secondes)
const T = {
  guide: 0.05,
  drop: 0.3,
  impact: 0.78,
  brush: 0.85,
  brushDur: 1.5,
  ranked: 2.45,
  lobby: 2.7,
  tagline: 3.3,
  underline: 4.2,
  handoff: 4.75,
};
const FLIGHT_MS = 760;
const FADE_MS = 520;

function dropCover() {
  document.documentElement.classList.remove("rl-booting");
}

function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // stockage bloqué : au pire l'intro rejoue à la prochaine navigation
  }
}

// Courbe d'accélération du pinceau (lent au départ, vif au milieu, posé à la
// fin) — sert aussi à caler les projections d'encre sur le passage aux angles.
const EASE: [number, number, number, number] = [0.55, 0.05, 0.35, 1];
function timeAtProgress(p: number) {
  const [x1, y1, x2, y2] = EASE;
  const bx = (t: number) => 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
  const by = (t: number) => 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (by(m) < p) lo = m;
    else hi = m;
  }
  return bx((lo + hi) / 2);
}

// Petit générateur pseudo-aléatoire déterministe : même dessin à chaque fois
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const [SX, SY] = LOGO_START.split(" ").map(Number);
const [TX, TY, TA] = LOGO_TAIL.split(" ").map(Number);

type Drop = { x: number; y: number; r: number; dx: number; dy: number; d: number };

// Couronne d'éclaboussures à l'impact de la goutte
const CROWN: Drop[] = (() => {
  const r = rng(11);
  return Array.from({ length: 12 }, (_, i) => {
    const a = -Math.PI + (i / 11) * Math.PI + (r() - 0.5) * 0.35;
    const dist = 16 + r() * 34;
    return { x: SX, y: SY, r: 0.9 + r() * 2.4, dx: Math.cos(a) * dist, dy: Math.sin(a) * dist * 0.8, d: T.impact + r() * 0.05 };
  });
})();

// Projections au passage du pinceau dans chaque angle de l'hexagone
const FLICKS: Drop[] = (() => {
  const r = rng(29);
  const out: Drop[] = [];
  [1, 2, 3, 4].forEach((k) => {
    const ang = ((-90 + 60 * k) * Math.PI) / 180;
    const cx = 120 + 92 * Math.cos(ang);
    const cy = 120 + 92 * Math.sin(ang);
    const at = T.brush + T.brushDur * timeAtProgress(k / 6 / 0.745);
    for (let j = 0; j < 3; j++) {
      const a = ang + (r() - 0.5) * 0.9;
      const dist = 14 + r() * 26;
      out.push({ x: cx, y: cy, r: 0.9 + r() * 1.9, dx: Math.cos(a) * dist, dy: Math.sin(a) * dist, d: at + r() * 0.05 });
    }
  });
  return out;
})();

// Fibres et gouttelettes projetées quand le pinceau se lève
const TAIL: Drop[] = (() => {
  const r = rng(53);
  return Array.from({ length: 8 }, () => {
    const a = TA + (r() - 0.5) * 1.1;
    const dist = 18 + r() * 44;
    return { x: TX, y: TY, r: 1 + r() * 2.2, dx: Math.cos(a) * dist, dy: Math.sin(a) * dist, d: T.brush + T.brushDur - 0.12 + r() * 0.1 };
  });
})();

// Éclats en étoile à l'impact
const SPIKES = (() => {
  const r = rng(71);
  return Array.from({ length: 7 }, () => {
    const a = -Math.PI * (0.08 + r() * 0.84);
    const len = 14 + r() * 22;
    const px = -Math.sin(a) * 1.4;
    const py = Math.cos(a) * 1.4;
    const ex = SX + Math.cos(a) * len;
    const ey = SY + Math.sin(a) * len;
    return `M ${(SX + px).toFixed(1)} ${(SY + py).toFixed(1)} L ${ex.toFixed(1)} ${ey.toFixed(1)} L ${(SX - px).toFixed(1)} ${(SY - py).toFixed(1)} Z`;
  });
})();

const DISPLAY = "var(--font-display), 'Arial Black', sans-serif";
const HAND = "var(--font-hand), 'Caveat', cursive";

const CSS = `
.rli{position:fixed;inset:0;z-index:400;cursor:pointer}
.rli-bg{position:absolute;inset:0;background:var(--paper);background-image:var(--grain)}
.rli-bg::after{content:"";position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 45%,transparent 55%,color-mix(in oklab,var(--ink) 7%,transparent))}
.rli-stage{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:clamp(18px,3.5vw,56px);padding:24px;color:var(--ink)}
.rli-ring{width:min(27vw,330px);height:auto;overflow:visible;flex:none}
.rli-words{width:min(46vw,560px);height:auto;overflow:visible}
@media (max-aspect-ratio:4/5){.rli-stage{flex-direction:column;gap:22px}.rli-ring{width:min(50vw,250px)}.rli-words{width:min(86vw,470px)}}
.rli-skip{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));right:14px;height:34px;padding:0 14px;border:2px solid var(--ink);border-radius:3px;background:var(--paper);color:var(--ink);font:700 13px var(--font-sans);cursor:pointer}
.rli-out .rli-skip{opacity:0;transition:opacity .2s}
.rli-pen{stroke-dasharray:100 130;animation:rliDraw .7s var(--d,0s) cubic-bezier(.4,0,.2,1) backwards,rliGone .5s 2.2s ease forwards}
.rli-track{stroke-dasharray:100 130;animation:rliDraw ${T.brushDur}s ${T.brush}s cubic-bezier(${EASE.join(",")}) backwards}
.rli-axis{stroke-dasharray:100 130;animation:rliDraw ${T.brushDur}s ${T.brush}s cubic-bezier(${EASE.join(",")}) backwards}
.rli-fall{transform-box:fill-box;transform-origin:50% 100%;animation:rliFall ${(T.impact - T.drop).toFixed(2)}s ${T.drop}s cubic-bezier(.5,0,.9,.5) both}
.rli-blot{transform-box:fill-box;transform-origin:center;animation:rliBlot .42s ${T.impact}s cubic-bezier(.2,.8,.2,1) backwards}
.rli-spike{transform-box:fill-box;transform-origin:50% 100%;animation:rliSpike .5s ${T.impact}s cubic-bezier(.2,.8,.3,1) both}
.rli-drop{animation:rliFly .55s var(--d) cubic-bezier(.2,.8,.3,1) both}
.rli-breathe{transform-box:fill-box;transform-origin:center;animation:rliBreathe .6s ${(T.brush + T.brushDur - 0.05).toFixed(2)}s ease-in-out both}
.rli-paint{stroke-dasharray:100 130;animation:rliDraw .52s var(--d) cubic-bezier(.6,0,.3,1) backwards}
.rli-write{animation:rliWrite 1.05s ${T.tagline}s cubic-bezier(.4,0,.6,1) backwards}
.rli-under{stroke-dasharray:100 130;animation:rliDraw .38s ${T.underline}s cubic-bezier(.5,0,.3,1) backwards}
.rli-out .rli-fadeaway{opacity:0;transition:opacity .28s ease}
.rli-out .rli-bg{opacity:0;transition:opacity ${FADE_MS}ms ease .18s}
@keyframes rliDraw{from{stroke-dashoffset:100}}
@keyframes rliGone{to{opacity:0}}
@keyframes rliFall{0%{opacity:0;transform:translateY(-190px) scale(.7,1.5)}12%{opacity:1}96%{opacity:1;transform:translateY(-6px) scale(.9,1.35)}100%{opacity:0;transform:translateY(0) scale(1.2,.6)}}
@keyframes rliBlot{0%{opacity:0;transform:scale(.15)}55%{opacity:1;transform:scale(1.18)}100%{opacity:1;transform:scale(1)}}
@keyframes rliSpike{0%{opacity:0;transform:scale(.1)}30%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.15)}}
@keyframes rliFly{0%{opacity:0;transform:translate(0,0)}15%{opacity:1}100%{opacity:1;transform:translate(var(--dx),var(--dy))}}
@keyframes rliBreathe{0%,100%{transform:scale(1)}45%{transform:scale(1.018)}}
@keyframes rliWrite{from{width:0}}
@media (prefers-reduced-motion:reduce){.rli *{animation:none!important}}
`;

function Drops({ list }: { list: Drop[] }) {
  return (
    <>
      {list.map((p, i) => (
        <circle
          key={i}
          className="rli-drop"
          cx={p.x}
          cy={p.y}
          r={p.r}
          fill="currentColor"
          style={{
            ["--dx" as string]: `${p.dx.toFixed(1)}px`,
            ["--dy" as string]: `${p.dy.toFixed(1)}px`,
            ["--d" as string]: `${p.d.toFixed(2)}s`,
          }}
        />
      ))}
    </>
  );
}

export function Splash() {
  const [phase, setPhase] = useState<"off" | "on" | "out">("off");
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ringRef = useRef<SVGSVGElement | null>(null);
  const timers = useRef<number[]>([]);
  const leaving = useRef(false);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("splash");
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // navigation privée : on joue, ce n'est qu'un voile
    }
    if (param === "off" || param === "0" || (!param && seen)) {
      markSeen();
      dropCover();
      return;
    }
    setPhase("on");
  }, []);

  // Étape 4 : l'anneau rejoint le logo de la barre du haut, le papier s'efface.
  const leave = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    markSeen();
    const ring = ringRef.current;
    if (ring) {
      // Si on saute l'intro en cours de route, l'anneau finit de se dessiner d'un coup
      ring.getAnimations({ subtree: true }).forEach((a) => {
        try {
          a.finish();
        } catch {
          // animation infinie : rien à terminer
        }
      });
      const target = document.querySelector("[data-rl-logo]");
      const to = target?.getBoundingClientRect();
      const from = ring.getBoundingClientRect();
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (to && to.width > 0 && from.width > 0 && !reduce) {
        const s = to.width / from.width;
        const dx = to.left + to.width / 2 - (from.left + from.width / 2);
        const dy = to.top + to.height / 2 - (from.top + from.height / 2);
        ring.animate(
          [{ transform: "translate(0,0) scale(1)" }, { transform: `translate(${dx}px, ${dy}px) scale(${s})` }],
          { duration: FLIGHT_MS, easing: "cubic-bezier(.7,0,.2,1)", fill: "forwards" }
        );
      } else {
        ring.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" });
      }
    }
    setPhase("out");
    timers.current.push(window.setTimeout(() => setPhase("off"), Math.max(FLIGHT_MS, FADE_MS + 180) + 60));
  }, []);

  useEffect(() => {
    if (phase !== "on") return;
    dropCover();
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timers.current.push(window.setTimeout(leave, reduce ? 1300 : T.handoff * 1000));
    const onKey = () => leave();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      html.style.overflow = previous;
    };
  }, [phase, leave]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  if (phase === "off") return null;

  const maskRing = `${uid}-ring`;
  const maskRanked = `${uid}-ranked`;
  const maskLobby = `${uid}-lobby`;
  const maskUnder = `${uid}-under`;
  const clipTag = `${uid}-tag`;
  const inkEdge = `${uid}-edge`;

  return (
    <div className={"rli" + (phase === "out" ? " rli-out" : "")} onClick={leave} role="presentation">
      <style>{CSS}</style>
      <div className="rli-bg" />
      <div className="rli-stage">
        {/* L'anneau : goutte, impact, coup de pinceau */}
        <svg ref={ringRef} className="rli-ring" viewBox="0 0 240 240" aria-hidden>
          <defs>
            <filter id={inkEdge} x="-60%" y="-60%" width="220%" height="220%">
              <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="4" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="5" />
            </filter>
            <mask id={maskRing} maskUnits="userSpaceOnUse" x="-40" y="-40" width="320" height="320">
              <path
                className="rli-axis"
                d={LOGO_AXIS}
                pathLength={100}
                fill="none"
                stroke="#fff"
                strokeWidth={66}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </mask>
          </defs>
          <g className="rli-fadeaway">
            <path className="rli-pen" d={INTRO_GUIDE} pathLength={100} fill="none" stroke="currentColor" strokeOpacity={0.24} strokeWidth={0.8} />
          </g>
          <g className="rli-breathe">
            <path
              className="rli-track"
              d={LOGO_TRACK}
              pathLength={100}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeWidth={9}
              strokeLinejoin="round"
            />
            <g mask={`url(#${maskRing})`} fill="currentColor">
              <path d={LOGO_BRUSH} />
              <path d={LOGO_BRISTLES} />
            </g>
            <g className="rli-blot">
              <circle cx={SX} cy={SY} r={14} fill="currentColor" filter={`url(#${inkEdge})`} />
              <path d={LOGO_SPLAT} fill="currentColor" />
            </g>
          </g>
          <path
            className="rli-fall"
            d={`M ${SX} ${SY - 22} C ${SX + 4} ${SY - 12} ${SX + 7} ${SY - 5} ${SX + 7} ${SY - 1} A 7 7 0 1 1 ${SX - 7} ${SY - 1} C ${SX - 7} ${SY - 5} ${SX - 4} ${SY - 12} ${SX} ${SY - 22} Z`}
            fill="currentColor"
          />
          <g className="rli-fadeaway" fill="currentColor">
            {SPIKES.map((d, i) => (
              <path key={i} className="rli-spike" d={d} />
            ))}
          </g>
          <g className="rli-fadeaway">
            <Drops list={CROWN} />
            <Drops list={FLICKS} />
          </g>
          <Drops list={TAIL} />
        </svg>

        {/* Le nom, peint d'un large coup de pinceau, puis le slogan manuscrit */}
        <svg className="rli-words rli-fadeaway" viewBox="0 0 560 320" aria-hidden>
          <defs>
            <mask id={maskRanked} maskUnits="userSpaceOnUse" x="-60" y="-60" width="760" height="460">
              <path
                className="rli-paint"
                style={{ ["--d" as string]: `${T.ranked}s` }}
                d="M -30 72 C 120 58 300 86 620 66"
                pathLength={100}
                fill="none"
                stroke="#fff"
                strokeWidth={140}
                strokeLinecap="round"
              />
            </mask>
            <mask id={maskLobby} maskUnits="userSpaceOnUse" x="-60" y="-60" width="760" height="460">
              <path
                className="rli-paint"
                style={{ ["--d" as string]: `${T.lobby}s` }}
                d="M -30 184 C 140 198 320 170 620 186"
                pathLength={100}
                fill="none"
                stroke="#fff"
                strokeWidth={150}
                strokeLinecap="round"
              />
            </mask>
            <mask id={maskUnder} maskUnits="userSpaceOnUse" x="-60" y="-60" width="760" height="460">
              <path className="rli-under" d="M 4 304 L 380 302" pathLength={100} fill="none" stroke="#fff" strokeWidth={30} strokeLinecap="round" />
            </mask>
            <clipPath id={clipTag}>
              <rect className="rli-write" x={0} y={240} width={560} height={64} />
            </clipPath>
          </defs>
          <text x={0} y={112} mask={`url(#${maskRanked})`} fill="currentColor" style={{ fontFamily: DISPLAY, fontSize: 106, letterSpacing: "-0.01em" }}>
            RANKED
          </text>
          <text x={0} y={222} mask={`url(#${maskLobby})`} fill="currentColor" style={{ fontFamily: DISPLAY, fontSize: 106, letterSpacing: "-0.01em" }}>
            LOBBY
          </text>
          <text x={6} y={284} clipPath={`url(#${clipTag})`} fill="currentColor" style={{ fontFamily: HAND, fontWeight: 700, fontSize: 46 }}>
            le savoir se conquiert.
          </text>
          <g mask={`url(#${maskUnder})`}>
            <g transform="translate(0 296) scale(1.27 1.6)">
              <path d={UNDERLINE} fill="currentColor" />
            </g>
          </g>
        </svg>
      </div>
      <button
        type="button"
        className="rli-skip"
        onClick={(e) => {
          e.stopPropagation();
          leave();
        }}
      >
        Passer ›
      </button>
      <span className="sr-only">Ranked Lobby — le savoir se conquiert.</span>
    </div>
  );
}
