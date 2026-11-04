"use client";

import { useState, type PointerEvent } from "react";
import s from "./Terminal.module.css";

// Une courbe, une seule série : le tracé s'étire à la largeur du cadre (SVG sans proportions
// fixes, trait constant) et les étiquettes restent du texte à leur vraie taille. Au survol, le
// réticule suit le point le plus proche.

export function Graphique({ points, format, libelle }: { points: { x: string; y: number }[]; format: (y: number) => string; libelle: string }) {
  const [ici, setIci] = useState<number | null>(null);

  const ys = points.map((p) => p.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const marge = (max - min) * 0.14 || 1;
  const bas = min - marge;
  const haut = max + marge;
  const px = (i: number) => (i / (points.length - 1)) * 100;
  const py = (y: number) => 100 - ((y - bas) / (haut - bas)) * 100;
  const graduations = [max, (min + max) / 2, min];

  function survol(e: PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const k = (e.clientX - r.left) / r.width;
    setIci(Math.max(0, Math.min(points.length - 1, Math.round(k * (points.length - 1)))));
  }

  const p = ici === null ? null : points[ici];
  return (
    <div className={s.graphique} role="img" aria-label={libelle}>
      <div className={s.plot} onPointerMove={survol} onPointerLeave={() => setIci(null)}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {graduations.map((y) => (
            <line key={y} x1={0} x2={100} y1={py(y)} y2={py(y)} vectorEffect="non-scaling-stroke" />
          ))}
          <polyline points={points.map((q, i) => `${px(i).toFixed(2)},${py(q.y).toFixed(2)}`).join(" ")} vectorEffect="non-scaling-stroke" />
        </svg>
        {graduations.map((y) => (
          <span key={y} className={s.graduation} style={{ top: `${py(y)}%` }}>
            {format(y)}
          </span>
        ))}
        {p && ici !== null && (
          <>
            <span className={s.reticule} style={{ left: `${px(ici)}%` }} />
            <span className={s.point} style={{ left: `${px(ici)}%`, top: `${py(p.y)}%` }} />
            <span className={s.bulle} style={{ left: `clamp(56px, ${px(ici)}%, calc(100% - 56px))` }}>
              {p.x} : {format(p.y)}
            </span>
          </>
        )}
      </div>
      <div className={s.axeX} aria-hidden>
        <span>{points[0].x}</span>
        <span>{points[points.length - 1].x}</span>
      </div>
    </div>
  );
}
