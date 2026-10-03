"use client";

import { useId } from "react";
import { INK } from "@/components/ui/InkDefs";
import { RING_FULL_AXIS } from "@/components/ink/paths";
import { TIERS } from "@/lib/ranks";

// Badge de rang : rendu 3D pré-calculé (métal biseauté, gemme ou métal au
// cœur, l'hexagone du logo), images WebP de public/ranks. L'outil de rendu
// vit hors dépôt (cfa-work/badges). Le cadre rendu couvre [-4, 204]² dans le
// repère de l'ancien badge SVG (cœur en 100, 92) : le halo de maîtrise, en
// SVG, se pose au même endroit qu'avant. En petit (≤ 36 px), une variante
// simplifiée, recadrée et cernée plus fort, reste lisible.
//
// Fichiers : <palier>-<w>.webp ; <palier>-<3|2|1>-<w>.webp (divisions III,
// II, I gravées au rendu) ; <palier>-s-<w>.webp (petite taille).

const SMALL_MAX = 36;
const FRAME_X = -4;
const FRAME_W = 208;
const W_FULL = [64, 128, 256, 512];
const W_DIV = [128, 256, 512];
const W_SMALL = [32, 64, 96];
const DIV_N: Record<string, number> = { III: 3, II: 2, I: 1 };
const GRAY = "grayscale(1) brightness(1.04) contrast(.9)";
// avec le halo : l'anneau d'encre entoure tout le badge, réduit d'autant autour de (100, 98)
const HALO_K = 0.84;

const srcSet = (base: string, ws: number[]) => ws.map((w) => `/ranks/${base}-${w}.webp ${w}w`).join(", ");

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
  const withHalo = mastery !== null && mastery !== undefined;
  const m = withHalo ? Math.max(0, Math.min(100, mastery as number)) : 0;
  const [vx, vy, vw, vh] = withHalo ? [0, -6, 200, 212] : [4, 4, 192, 182];
  const height = (size * vh) / vw;
  const label = title ?? `${t.name}${division ? " " + division : ""}${withHalo ? `, maîtrise ${m} %` : ""}`;
  const showGlow = glow && ti >= 5 && !gray;

  // petite taille : variante simplifiée qui remplit sa case ; sinon, le cadre complet
  const small = size <= SMALL_MAX && !withHalo;
  const n = division && ti < TIERS.length - 1 ? DIV_N[division] : undefined;
  const base = small ? `${t.key}-s` : n ? `${t.key}-${n}` : t.key;
  const widths = small ? W_SMALL : n ? W_DIV : W_FULL;
  const hk = withHalo ? HALO_K : 1;
  // place de l'image dans le repère du viewBox, en unités puis en % de la boîte
  const u = small
    ? { x: 0, y: (vh - vw) / 2, w: vw }
    : { x: 100 + (FRAME_X - 100) * hk - vx, y: 98 + (FRAME_X - 98) * hk - vy, w: FRAME_W * hk };
  const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;
  const imgPx = Math.ceil((u.w / vw) * size);
  const haloW = ((1.3 + size / 100) * vw) / size; // en unités du repère : ~2,2 px à 78 px, ~2,8 px à 148 px

  // La boîte fait `size` de large, sauf si la className fixe elle-même la
  // largeur (ex. « h-auto w-[60px] sm:w-[96px] ») : le <svg> du halo suit la
  // boîte (largeur 100 %, hauteur au ratio du viewBox) et l'image la suit en
  // pourcentages. La className porte sur tout le badge (effets compris).
  const sized = !!className && /(^|[ :])(w|size|min-w|max-w)-/.test(className);
  return (
    <span role="img" aria-label={label} className={className} style={{ position: "relative", display: "block", flex: "none", width: sized ? undefined : size }}>
      <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} width={size} height={height} aria-hidden style={{ display: "block", width: "100%", height: "auto", overflow: "visible" }}>
        {showGlow && (
          <defs>
            <radialGradient id={`${uid}r`}>
              <stop offset="0" stopColor={t.metal[1]} stopOpacity={onDark ? 0.45 : 0.28} />
              <stop offset="1" stopColor={t.metal[1]} stopOpacity="0" />
            </radialGradient>
          </defs>
        )}
        {showGlow && <circle cx={100} cy={withHalo ? 96 : 94} r={(ti === 7 ? 100 : 88) * hk} fill={`url(#${uid}r)`} />}
        {withHalo && (
          // halo : un trait d'encre fin le long de l'hexagone du logo, au prorata de la maîtrise ;
          // l'épaisseur reste autour de 2 à 3 px quelle que soit la taille (le badge reste la vedette)
          <g transform="translate(-20 -22)" fill="none" stroke={onDark ? "#fff" : "currentColor"} strokeWidth={haloW} strokeLinejoin="round">
            <use href={INK.logoTrack} strokeOpacity={onDark ? 0.13 : 0.1} />
            {/* tracé animé en ligne (2 Ko) : une animation CSS sur un <use> ne repeint pas toujours dans Chrome */}
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
      {/* eslint-disable-next-line @next/next/no-img-element -- images pré-calculées, srcset fait main */}
      <img
        src={`/ranks/${base}-${small ? 64 : 256}.webp`}
        srcSet={srcSet(base, widths)}
        sizes={`${imgPx}px`}
        alt=""
        width={imgPx}
        height={imgPx}
        loading={small ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        style={{
          position: "absolute",
          left: pct(u.x, vw),
          top: pct(u.y, vh),
          width: pct(u.w, vw),
          height: pct(u.w, vh),
          maxWidth: "none",
          display: "block",
          pointerEvents: "none",
          userSelect: "none",
          filter: gray ? GRAY : undefined,
          opacity: gray ? (onDark ? 0.62 : 0.72) : undefined,
        }}
      />
    </span>
  );
}
