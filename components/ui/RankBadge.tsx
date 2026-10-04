"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { INK } from "@/components/ui/InkDefs";
import { RING_FULL_AXIS } from "@/components/ink/paths";
import { TIERS } from "@/lib/ranks";
import { INSIGNES, formesDe, pts, chemin } from "@/lib/rank-badge";
import { animerInsigne } from "@/components/ui/rank-badge-anim";
import s from "./RankBadge.module.css";

// Insigne de rang (V2) : une silhouette par palier (chevron, piliers, ailes,
// colonne, cimier), un contour sombre et un liseré de métal, un liquide
// marbré à l'intérieur, et à partir de Platine une aura électrique. Géométrie
// et couleurs : lib/rank-badge.ts.
// - ≤ 36 px : image pré-rendue (public/ranks/v2/petit-<palier>-<w>.png),
//   légère pour les listes ;
// - au-delà : dessin vectoriel, le liquide en image figée
//   (public/ranks/v2/liquide-<palier>.webp) ;
// - ≥ 56 px : le liquide coule, l'aura tremble, des arcs courent sur les
//   arêtes (components/ui/rank-badge-anim.ts, une seule boucle pour le site).
// Le halo de maîtrise (trait d'encre le long de l'hexagone du logo) et la
// division (trois losanges, un par cran : III, II, I) sont conservés.

const PETIT_MAX = 36;
const VIVANT_MIN = 56;
const AURA_MIN = 40;
const HALO_K = 0.8;
const DIV_N: Record<string, number> = { III: 1, II: 2, I: 3 };

const masqueDe = (i: number) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="#fff">${formesDe(INSIGNES[i])
    .map((f) => `<polygon points="${pts(f)}"/>`)
    .join("")}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

export function RankBadge({
  tier,
  size = 48,
  mastery = null,
  division = null,
  onDark = false,
  animate = false,
  gray = false,
  fige = false,
  anime = false,
  className,
  title,
}: {
  /** index du palier dans TIERS (0 = Bronze … 7 = Top 10) */
  tier: number;
  size?: number;
  /** maîtrise 0–100 : dessine le halo à l'encre autour du badge */
  mastery?: number | null;
  /** « III », « II », « I » : un, deux ou trois losanges sous l'insigne */
  division?: string | null;
  /** halo blanc (sur une carte sombre) */
  onDark?: boolean;
  /** ancien halo coloré : l'aura électrique le remplace (accepté, sans effet) */
  glow?: boolean;
  /** le halo se dessine à l'apparition */
  animate?: boolean;
  /** palier pas encore atteint (métal grisé, immobile) */
  gray?: boolean;
  /** dessin vectoriel immobile, sans aura (rendu des images pré-calculées) */
  fige?: boolean;
  /** animé même sous 56 px (liquide, aura, arcs) : la vitrine du profil */
  anime?: boolean;
  className?: string;
  title?: string;
}) {
  const uid = "rb" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const ti = Math.max(0, Math.min(TIERS.length - 1, tier));
  const t = TIERS[ti];
  const d = INSIGNES[ti];
  const withHalo = mastery !== null && mastery !== undefined;
  const m = withHalo ? Math.max(0, Math.min(100, mastery as number)) : 0;
  const label = title ?? `${t.name}${division ? " " + division : ""}${withHalo ? `, maîtrise ${m} %` : ""}`;
  const petit = size <= PETIT_MAX && !withHalo && !fige && !anime;
  const vivant = (size >= VIVANT_MIN || anime) && !gray && !fige;
  const aura = !!d.elec && !gray && !fige && (size >= AURA_MIN || anime);
  const calme = gray || fige;

  const racine = useRef<HTMLSpanElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const eclairs = useRef<SVGGElement | null>(null);
  useEffect(() => {
    if (!vivant || !racine.current) return;
    return animerInsigne(racine.current, ti, {
      canvas: canvas.current,
      bruit: racine.current.querySelector("[data-bruit]"),
      eclairs: eclairs.current,
      arcs: true,
    });
  }, [vivant, ti]);
  const masque = useMemo(() => (vivant ? masqueDe(ti) : ""), [vivant, ti]);

  // La boîte fait `size` de large, sauf si la className fixe elle-même la largeur.
  const sized = !!className && /(^|[ :])(w|size|min-w|max-w)-/.test(className);
  const [vx, vy, vw, vh] = withHalo ? [0, -6, 200, 212] : [0, 0, 200, 200];
  const style: React.CSSProperties = { position: "relative", display: "block", flex: "none", width: sized ? undefined : size };

  if (petit) {
    return (
      <span role="img" aria-label={label} className={className} style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element -- insignes pré-rendus, srcset fait main */}
        <img
          src={`/ranks/v2/petit-${ti}-64.png`}
          srcSet={`/ranks/v2/petit-${ti}-64.png 64w, /ranks/v2/petit-${ti}-128.png 128w`}
          sizes={`${size}px`}
          alt=""
          width={size}
          height={size}
          decoding="async"
          draggable={false}
          className={gray ? s.gris : undefined}
          style={{ display: "block", width: "100%", height: "auto", maxWidth: "none", pointerEvents: "none", userSelect: "none", opacity: gray ? (onDark ? 0.62 : 0.72) : undefined }}
        />
      </span>
    );
  }

  const tout = formesDe(d);
  const arriere = [...(d.arriere ?? []), ...(d.cimier ? [d.cimier] : [])];
  const [ml, mm, ms] = d.metal;
  const retard = `${((ti * 0.83) % 5.2).toFixed(2)}s`;
  const e = d.elec;
  const poly = (list: typeof tout) => list.map((f, i) => <polygon key={i} points={pts(f)} />);
  // place de l'insigne dans la boîte (réduit au centre quand le halo l'entoure)
  const k = withHalo ? HALO_K : 1;
  const bx = 100 - 100 * k, by = 98 - 98 * k;
  const boite: React.CSSProperties = {
    position: "absolute",
    left: `${(((bx - vx) / vw) * 100).toFixed(3)}%`,
    top: `${(((by - vy) / vh) * 100).toFixed(3)}%`,
    width: `${((200 * k) / vw) * 100}%`,
  };
  const px = Math.min(256, Math.ceil(size * k * 2));
  // division : trois losanges sous l'insigne, un par cran gagné
  const n = division && ti < TIERS.length - 1 ? DIV_N[division] : 0;
  const basY = Math.max(...tout.flat().map(([, y]) => y));
  const yDiv = Math.min(192, basY + 14);

  return (
    <span ref={racine} role="img" aria-label={label} className={className} style={style}>
      <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} aria-hidden style={{ display: "block", width: "100%", height: "auto", overflow: "visible" }}>
        {withHalo && (
          // halo : un trait d'encre fin le long de l'hexagone du logo, au prorata de la maîtrise
          <g transform="translate(-20 -22)" fill="none" stroke={onDark ? "#fff" : "currentColor"} strokeWidth={((1.3 + size / 100) * vw) / size} strokeLinejoin="round">
            <use href={INK.logoTrack} strokeOpacity={onDark ? 0.13 : 0.1} />
            {m > 0 && (
              <path
                d={RING_FULL_AXIS}
                pathLength={100}
                className={animate ? "rl-halo" : undefined}
                strokeOpacity={onDark ? 0.82 : 0.78}
                strokeLinecap="round"
                filter="url(#rl-ink)"
                strokeDasharray={`${m} 140`}
              />
            )}
          </g>
        )}
      </svg>
      <span className={`${s.boite}${gray ? " " + s.gris : ""}`} style={{ ...boite, opacity: gray ? (onDark ? 0.62 : 0.72) : undefined }}>
        {/* le liquide figé, sous le dessin ; les définitions communes */}
        <svg viewBox="0 0 200 200" aria-hidden>
          <defs>
            <clipPath id={`${uid}c`}>{poly(tout)}</clipPath>
            <g id={`${uid}T`}>{poly(tout)}</g>
            <g id={`${uid}A`}>{poly(arriere)}</g>
            <g id={`${uid}K`}>{poly(d.corps)}</g>
            <linearGradient id={`${uid}m`} x1="0" y1="0" x2=".35" y2="1">
              <stop offset="0" stopColor={ml} />
              <stop offset=".34" stopColor={mm} />
              <stop offset=".5" stopColor={ml} />
              <stop offset=".74" stopColor={mm} />
              <stop offset="1" stopColor={ms} />
            </linearGradient>
            <linearGradient id={`${uid}v`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity=".3" />
              <stop offset=".42" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${uid}r`} x1="0" x2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset=".5" stopColor="#fff" stopOpacity=".55" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <clipPath id={`${uid}d`}>
              <rect x="100" y="0" width="100" height="200" />
            </clipPath>
            {/* le liseré ne couvre que l'extérieur des formes : le liquide remplit l'intérieur */}
            <mask id={`${uid}x`} maskUnits="userSpaceOnUse" x="-20" y="-20" width="240" height="240">
              <rect x="-20" y="-20" width="240" height="240" fill="#fff" />
              <use href={`#${uid}T`} fill="#000" />
            </mask>
            <mask id={`${uid}y`} maskUnits="userSpaceOnUse" x="-20" y="-20" width="240" height="240">
              <rect x="-20" y="-20" width="240" height="240" fill="#fff" />
              <use href={`#${uid}K`} fill="#000" />
            </mask>
            {aura && e && (
              <>
                <mask id={`${uid}z`} maskUnits="userSpaceOnUse" x="-60" y="-60" width="320" height="320">
                  <rect x="-60" y="-60" width="320" height="320" fill="#fff" />
                  <use href={`#${uid}T`} fill="#000" />
                </mask>
                <filter id={`${uid}f`} x="-35%" y="-35%" width="170%" height="170%">
                  <feTurbulence data-bruit="" type="fractalNoise" baseFrequency=".05" numOctaves={2} seed={3 + ti * 11} result="n" />
                  <feDisplacementMap in="SourceGraphic" in2="n" scale={size < VIVANT_MIN ? e.d * 0.6 : e.d} xChannelSelector="R" yChannelSelector="G" result="d" />
                  <feGaussianBlur in="d" stdDeviation="1.6" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="d" />
                  </feMerge>
                </filter>
                <filter id={`${uid}b`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation={size < VIVANT_MIN ? 3 : 6} />
                </filter>
              </>
            )}
          </defs>
          <image href={`/ranks/v2/liquide-${ti}.webp`} x="0" y="0" width="200" height="200" preserveAspectRatio="none" clipPath={`url(#${uid}c)`} />
        </svg>

        {/* le liquide qui coule (≥ 56 px), masqué aux formes */}
        {vivant && (
          <canvas
            ref={canvas}
            width={px}
            height={px}
            aria-hidden
            style={{ WebkitMaskImage: masque, maskImage: masque, WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" }}
          />
        )}

        {/* le dessin : aura, contour et liseré, vernis, ombre, filet de lumière, reflet, division, arcs */}
        <svg viewBox="0 0 200 200" aria-hidden>
          {aura && e && (
            <g mask={`url(#${uid}z)`}>
              <g className={s.auraDouce} style={{ ["--retard" as string]: retard }}>
                <use href={`#${uid}T`} fill="none" stroke={e.c} strokeWidth={e.l * 3} strokeLinejoin="round" opacity=".35" filter={`url(#${uid}b)`} />
              </g>
              <g className={s.auraElec} style={{ ["--retard" as string]: retard, ["--op" as string]: e.op }} filter={`url(#${uid}f)`}>
                <use href={`#${uid}T`} fill="none" stroke={e.c} strokeWidth={e.l} strokeLinejoin="round" opacity=".85" />
                <use href={`#${uid}T`} fill="none" stroke="#fff" strokeWidth={Math.max(1, e.l / 3.5)} strokeLinejoin="round" />
              </g>
            </g>
          )}
          <g className={s.ombre}>
            {arriere.length > 0 && (
              <g mask={`url(#${uid}x)`}>
                <use href={`#${uid}A`} fill="none" stroke="#0d0d12" strokeWidth="11" strokeLinejoin="miter" />
                <use href={`#${uid}A`} fill="none" stroke={`url(#${uid}m)`} strokeWidth="7" strokeLinejoin="miter" />
              </g>
            )}
            <g mask={`url(#${uid}y)`}>
              <use href={`#${uid}K`} fill="none" stroke="#0d0d12" strokeWidth="11" strokeLinejoin="miter" />
              <use href={`#${uid}K`} fill="none" stroke={`url(#${uid}m)`} strokeWidth="7" strokeLinejoin="miter" />
            </g>
          </g>
          <use href={`#${uid}T`} fill={`url(#${uid}v)`} />
          <use href={`#${uid}T`} clipPath={`url(#${uid}d)`} fill="#000" opacity=".14" />
          <use href={`#${uid}T`} fill="none" stroke={ml} strokeOpacity=".55" strokeWidth=".8" strokeLinejoin="miter" transform="translate(0 .9)" />
          {d.course && !calme && (
            <g className={s.course} fill="none" stroke={ml} strokeWidth="1.6" strokeLinecap="round" style={{ ["--retard" as string]: retard }}>
              {d.corps.map((f, i) => (
                <path key={i} d={chemin(f)} pathLength={100} />
              ))}
            </g>
          )}
          {!calme && (
            <g clipPath={`url(#${uid}c)`}>
              <g transform="rotate(24 100 100)">
                <rect className={s.reflet} style={{ ["--retard" as string]: retard }} x="-20" y="-60" width="34" height="320" fill={`url(#${uid}r)`} />
              </g>
            </g>
          )}
          {n > 0 &&
            [86, 100, 114].map((x, i) => (
              <polygon
                key={x}
                points={pts([[x, yDiv - 5.5], [x + 5.5, yDiv], [x, yDiv + 5.5], [x - 5.5, yDiv]])}
                fill={i < n ? `url(#${uid}m)` : "none"}
                stroke={i < n ? ms : mm}
                strokeOpacity={i < n ? 1 : 0.6}
                strokeWidth="1.4"
              />
            ))}
          <g ref={eclairs} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}
