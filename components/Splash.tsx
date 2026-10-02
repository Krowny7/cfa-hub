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

const SEEN_KEY = "rl-splash-seen";
const DURATION_MS = 4900;
const EXIT_MS = 450;

/**
 * Retire le cache du premier affichage. C'est un pseudo-élément piloté par une
 * classe sur <html>, pas un nœud DOM : retirer un nœud rendu côté serveur avant
 * l'hydratation fait abandonner tout l'arbre à React. Appelable plusieurs fois.
 */
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

const [SX, SY] = LOGO_START.split(" ").map(Number);
const [TX, TY, TA] = LOGO_TAIL.split(" ").map(Number);

// Gouttelettes projetées au bout du trait (déterministes : même dessin à chaque fois)
const DROPS = Array.from({ length: 8 }, (_, i) => {
  const a = TA + (((i * 37) % 11) / 11 - 0.5) * 1.1;
  const dist = 22 + ((i * 53) % 17) * 3.6;
  return { r: 1.4 + ((i * 29) % 7) * 0.45, dx: Math.cos(a) * dist, dy: Math.sin(a) * dist, d: 2.02 + (i % 4) * 0.04 };
});

const CSS = `
.rli{position:fixed;inset:0;z-index:400;display:flex;align-items:center;justify-content:center;background:var(--paper);background-image:var(--grain);color:var(--ink);cursor:pointer}
.rli.is-leaving{animation:rliOut ${EXIT_MS}ms ease forwards}
.rli svg{width:min(92vw,1080px);height:auto;max-height:84vh;overflow:visible}
.rli-port{display:none}
@media (max-aspect-ratio:4/5){.rli-land{display:none}.rli-port{display:block}}
.rli-skip{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));right:14px;height:34px;padding:0 14px;border:2px solid var(--ink);border-radius:3px;background:var(--paper);color:var(--ink);font:700 13px var(--font-sans);cursor:pointer}
.rli-pen{stroke-dasharray:100;animation:rliDraw .9s var(--d,0s) cubic-bezier(.4,0,.2,1) backwards,rliGone .6s 2.1s ease forwards}
.rli-track{stroke-dasharray:100;animation:rliDraw 1.6s .5s cubic-bezier(.5,0,.3,1) backwards}
.rli-axis{stroke-dasharray:100;animation:rliDraw 1.5s .5s cubic-bezier(.55,.05,.35,1) backwards}
.rli-blot{transform-box:fill-box;transform-origin:center;animation:rliBlot .45s .3s cubic-bezier(.2,.8,.2,1) backwards}
.rli-drop{animation:rliDrop .55s var(--d) cubic-bezier(.2,.8,.3,1) both}
.rli-stamp{transform-box:fill-box;transform-origin:center;animation:rliStamp .5s var(--d) cubic-bezier(.2,1.4,.4,1) backwards}
.rli-write{animation:rliWrite 1.1s 2.9s cubic-bezier(.4,0,.6,1) backwards}
.rli-under{animation:rliShow .45s 3.95s ease backwards}
@keyframes rliDraw{from{stroke-dashoffset:100}}
@keyframes rliGone{to{opacity:0}}
@keyframes rliShow{from{opacity:0}}
@keyframes rliBlot{0%{opacity:0;transform:scale(.2)}60%{opacity:1;transform:scale(1.12)}100%{opacity:1;transform:scale(1)}}
@keyframes rliDrop{0%{opacity:0;transform:translate(0,0)}15%{opacity:1}100%{opacity:1;transform:translate(var(--dx),var(--dy))}}
@keyframes rliStamp{0%{opacity:0;transform:scale(1.35) rotate(-3deg)}60%{opacity:1}100%{opacity:1;transform:none}}
@keyframes rliWrite{from{width:0}}
@keyframes rliOut{to{opacity:0}}
@media (prefers-reduced-motion:reduce){.rli *{animation:none!important}}
`;

const DISPLAY = "var(--font-display), 'Arial Black', sans-serif";
const HAND = "var(--font-hand), 'Caveat', cursive";

type Layout = {
  viewBox: string;
  ring: { x: number; y: number; s: number };
  words: { x: number; y: number; size: number; anchor: "start" | "middle" }[];
  tagline: { x: number; y: number; size: number; anchor: "start" | "middle"; clipX: number; clipW: number };
  underline: { x: number; y: number; w: number };
  baselines: [number, number, number, number][];
};

const LAND: Layout = {
  viewBox: "0 0 1000 600",
  ring: { x: 140, y: 150, s: 1.25 },
  words: [
    { x: 488, y: 300, size: 104, anchor: "start" },
    { x: 488, y: 405, size: 104, anchor: "start" },
  ],
  tagline: { x: 494, y: 472, size: 46, anchor: "start", clipX: 488, clipW: 420 },
  underline: { x: 490, y: 484, w: 360 },
  baselines: [
    [470, 300, 960, 300],
    [470, 405, 960, 405],
  ],
};

const PORT: Layout = {
  viewBox: "0 0 600 1000",
  ring: { x: 150, y: 170, s: 1.25 },
  words: [
    { x: 300, y: 655, size: 96, anchor: "middle" },
    { x: 300, y: 752, size: 96, anchor: "middle" },
  ],
  tagline: { x: 300, y: 822, size: 44, anchor: "middle", clipX: 90, clipW: 420 },
  underline: { x: 130, y: 836, w: 340 },
  baselines: [
    [60, 655, 540, 655],
    [60, 752, 540, 752],
  ],
};

function Art({ layout, uid, className }: { layout: Layout; uid: string; className: string }) {
  const maskId = `${uid}-m-${className}`;
  const clipId = `${uid}-c-${className}`;
  const { ring, words, tagline, underline } = layout;
  return (
    <svg className={className} viewBox={layout.viewBox} aria-hidden>
      {layout.baselines.map(([x1, y1, x2, y2], i) => (
        <path
          key={i}
          className="rli-pen"
          d={`M ${x1} ${y1} L ${x2} ${y2 + 1}`}
          pathLength={100}
          style={{ ["--d" as string]: `${0.15 + i * 0.1}s` }}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.22}
          strokeWidth={1}
        />
      ))}
      <g transform={`translate(${ring.x} ${ring.y}) scale(${ring.s})`}>
        <path className="rli-pen" d={INTRO_GUIDE} pathLength={100} fill="none" stroke="currentColor" strokeOpacity={0.25} strokeWidth={0.8} />
        <path className="rli-track" d={LOGO_TRACK} pathLength={100} fill="none" stroke="currentColor" strokeOpacity={0.14} strokeWidth={7} strokeLinejoin="round" />
        <g className="rli-blot">
          <circle cx={SX} cy={SY} r={13} fill="currentColor" />
          <path d={LOGO_SPLAT} fill="currentColor" />
        </g>
        <mask id={maskId} maskUnits="userSpaceOnUse" x={-40} y={-40} width={320} height={320}>
          <path className="rli-axis" d={LOGO_AXIS} pathLength={100} fill="none" stroke="#fff" strokeWidth={66} strokeLinecap="round" strokeLinejoin="round" />
        </mask>
        <g mask={`url(#${maskId})`} fill="currentColor">
          <path d={LOGO_BRUSH} />
          <path d={LOGO_BRISTLES} />
        </g>
        {DROPS.map((p, i) => (
          <circle
            key={i}
            className="rli-drop"
            cx={TX}
            cy={TY}
            r={p.r}
            fill="currentColor"
            style={{ ["--dx" as string]: `${p.dx.toFixed(1)}px`, ["--dy" as string]: `${p.dy.toFixed(1)}px`, ["--d" as string]: `${p.d}s` }}
          />
        ))}
      </g>
      {["RANKED", "LOBBY"].map((w, i) => (
        <g key={w} className="rli-stamp" style={{ ["--d" as string]: `${2.3 + i * 0.22}s` }}>
          <text x={words[i].x} y={words[i].y} textAnchor={words[i].anchor} fill="currentColor" style={{ fontFamily: DISPLAY, fontSize: words[i].size, letterSpacing: "-0.01em" }}>
            {w}
          </text>
        </g>
      ))}
      <clipPath id={clipId}>
        <rect className="rli-write" x={tagline.clipX} y={tagline.y - tagline.size} width={tagline.clipW} height={tagline.size * 1.5} />
      </clipPath>
      <text
        x={tagline.x}
        y={tagline.y}
        textAnchor={tagline.anchor}
        clipPath={`url(#${clipId})`}
        fill="currentColor"
        style={{ fontFamily: HAND, fontWeight: 700, fontSize: tagline.size }}
      >
        le savoir se conquiert.
      </text>
      <g className="rli-under" transform={`translate(${underline.x} ${underline.y}) scale(${underline.w / 300} 1.4)`}>
        <path d={UNDERLINE} fill="currentColor" />
      </g>
    </svg>
  );
}

/**
 * Intro « Le trait » : joue une fois par session de navigation, par-dessus la
 * première page chargée. Un clic, une touche ou « Passer » l'interrompt.
 * Ne joue pas en mode discret. `?splash=1` la rejoue, `?splash=off` la coupe.
 */
export function Splash() {
  const [phase, setPhase] = useState<"off" | "on" | "leaving">("off");
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("splash");
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // navigation privée : on joue, ce n'est qu'un voile
    }
    const discreet = document.documentElement.dataset.discreet === "1";
    if (param === "off" || param === "0" || (!param && (seen || discreet))) {
      markSeen();
      dropCover();
      return;
    }
    setPhase("on");
  }, []);

  const leave = useCallback(() => {
    setPhase((p) => (p === "on" ? "leaving" : p));
  }, []);

  useEffect(() => {
    if (phase === "on") {
      dropCover();
      const previous = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      timers.current.push(window.setTimeout(leave, reduce ? 1400 : DURATION_MS));
      const onKey = () => leave();
      window.addEventListener("keydown", onKey);
      return () => {
        window.removeEventListener("keydown", onKey);
        document.documentElement.style.overflow = previous;
      };
    }
    if (phase === "leaving") {
      markSeen();
      timers.current.push(window.setTimeout(() => setPhase("off"), EXIT_MS));
    }
  }, [phase, leave]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  if (phase === "off") return null;
  return (
    <div className={"rli" + (phase === "leaving" ? " is-leaving" : "")} onClick={leave} role="presentation">
      <style>{CSS}</style>
      <Art layout={LAND} uid={uid} className="rli-land" />
      <Art layout={PORT} uid={uid} className="rli-port" />
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
