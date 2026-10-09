"use client";

import { useState } from "react";
import { TIERS, TOP_TIER } from "@/lib/ranks";
import { joursEntre } from "@/lib/objectif-calc";
import type { Courbe } from "@/lib/profil/journal";
import { nombre } from "@/lib/voice";
import { JOURNAL, jourCourt } from "@/lib/voice-profil";

// La courbe d'ELO du Journal, sur 90 jours : un trait d'encre en marches
// (l'ELO ne bouge qu'aux matchs), les paliers en bandes au crayon derrière,
// une seule échelle. Le dessin s'étire à la largeur (preserveAspectRatio
// « none », traits à épaisseur fixe) ; les chiffres et les noms de palier
// sont en HTML par-dessus, donc lisibles à toute taille, en clair comme en
// nuit (jetons --ink, --ink-3, --pencil). Survol ou toucher : le match le
// plus proche (jour, type, variation, ELO après). Pas d'heure : les matchs
// d'un même jour se partagent la case du jour.

const H = 100;
const haut = (v: number, min: number, max: number) => 6 + (1 - (v - min) / Math.max(1, max - min)) * (H - 12);

export function CourbeElo({ courbe }: { courbe: Courbe }) {
  const [vise, setVise] = useState<number | null>(null);
  const { points, depart } = courbe;
  const jours = joursEntre(courbe.debut, courbe.fin) + 1;
  const valeurs = [depart, ...points.map((p) => p.apres)];
  const lo = Math.min(...valeurs);
  const hi = Math.max(...valeurs);
  // au moins la hauteur d'un palier (150) : quelques points ne font pas une falaise
  const ecart = Math.max(hi - lo, 150);
  const marge = ecart * 0.18 + (ecart - (hi - lo)) / 2;
  const vMin = lo - marge;
  const vMax = hi + marge;
  const y = (v: number) => haut(v, vMin, vMax);
  const x = (p: { jour: string; rang: number; surJour: number }) =>
    ((joursEntre(courbe.debut, p.jour) + (p.rang + 1) / (p.surJour + 1)) / jours) * 1000;
  const xs = points.map(x);

  // le trait : en marches, du premier jour à aujourd'hui
  let d = `M 0 ${y(depart).toFixed(2)}`;
  points.forEach((p, i) => (d += ` H ${xs[i].toFixed(1)} V ${y(p.apres).toFixed(2)}`));
  d += " H 1000";

  // les paliers en vue (Top 10 n'est pas un seuil d'ELO)
  const bandes = TIERS.slice(0, TOP_TIER)
    .map((t, i) => ({ i, nom: t.name, bas: t.min, haut: i + 1 < TOP_TIER ? TIERS[i + 1].min : Infinity }))
    .filter((b) => b.haut > vMin && b.bas < vMax)
    .map((b) => ({ ...b, y0: y(Math.min(b.haut, vMax)), y1: y(Math.max(b.bas, vMin)) }));

  // le plus haut de la fenêtre (le premier atteint, s'il n'est ni le départ
  // ni l'arrivée) et le point d'arrivée, son chiffre du côté opposé au trait
  // qui y mène
  const iMax = valeurs.indexOf(hi);
  const fin = valeurs[valeurs.length - 1];
  const xMax = iMax === 0 ? 0 : xs[iMax - 1];
  const montrerMax = iMax > 0 && iMax !== valeurs.length - 1 && hi > fin;
  const finDessous = valeurs.length > 1 && valeurs[valeurs.length - 2] > fin;

  const viser = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!points.length) return;
    const r = e.currentTarget.getBoundingClientRect();
    const fx = ((e.clientX - r.left) / Math.max(1, r.width)) * 1000;
    let best = 0;
    xs.forEach((v, i) => {
      if (Math.abs(v - fx) < Math.abs(xs[best] - fx)) best = i;
    });
    setVise(best);
  };
  const p = vise !== null ? points[vise] : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="relative h-[164px] touch-pan-y select-none md:h-[196px]"
        onPointerMove={viser}
        onPointerDown={viser}
        onPointerLeave={(e) => e.pointerType === "mouse" && setVise(null)}
        role="img"
        aria-label={JOURNAL.courbeDit(depart, fin, points.length)}
      >
        <svg viewBox={`0 0 1000 ${H}`} preserveAspectRatio="none" className="absolute inset-0 block h-full w-full overflow-visible" aria-hidden>
          {bandes.map((b) => (
            <g key={b.i}>
              {b.i % 2 === 1 && <rect x={0} width={1000} y={b.y0} height={Math.max(0, b.y1 - b.y0)} fill="color-mix(in oklab, var(--ink) 5%, transparent)" />}
              {b.bas > vMin && <line x1={0} x2={1000} y1={b.y1} y2={b.y1} stroke="var(--pencil)" strokeWidth={1} strokeDasharray="2 5" vectorEffect="non-scaling-stroke" />}
            </g>
          ))}
          {p && <line x1={xs[vise as number]} x2={xs[vise as number]} y1={0} y2={H} stroke="var(--pencil)" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
          <path d={d} fill="none" stroke="var(--ink)" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" filter="url(#rl-ink)" />
        </svg>

        {/* les paliers : leur nom en haut de la bande, leur seuil sur la ligne, à gauche tous les deux */}
        {bandes.map((b) =>
          b.y1 - b.y0 >= 14 ? (
            <span key={b.i} aria-hidden className="t-micro pointer-events-none absolute left-0 font-semibold uppercase tracking-[.08em]" style={{ top: `calc(${b.y0}% + 3px)` }}>
              {b.nom}
            </span>
          ) : null,
        )}
        {bandes.map((b) =>
          b.bas > vMin ? (
            <span key={`s${b.i}`} aria-hidden className="pointer-events-none absolute left-0 -translate-y-full pb-0.5 font-mono text-[10.5px] tabular-nums text-muted" style={{ top: `${b.y1}%` }}>
              {nombre(b.bas)}
            </span>
          ) : null,
        )}

        {/* chaque match, le plus haut de la fenêtre, l'arrivée */}
        {points.length <= 60 &&
          points.map((pt, i) => (
            <span
              key={i}
              aria-hidden
              className="pointer-events-none absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--paper)]"
              style={{ left: `${xs[i] / 10}%`, top: `${y(pt.apres)}%` }}
            />
          ))}
        {montrerMax && (
          <span aria-hidden className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+6px)] font-mono text-[11px] font-semibold tabular-nums" style={{ left: `${Math.min(94, Math.max(4, xMax / 10))}%`, top: `${y(hi)}%` }}>
            {nombre(hi)}
          </span>
        )}
        <span aria-hidden className="pointer-events-none absolute right-0 h-[10px] w-[10px] -translate-y-1/2 translate-x-1/2 rounded-full bg-[var(--ink)]" style={{ top: `${y(fin)}%` }} />
        <span
          aria-hidden
          className={
            "pointer-events-none absolute right-2 font-mono text-[13px] font-semibold tabular-nums transition-opacity " +
            (finDessous ? "translate-y-[7px]" : "-translate-y-[calc(100%+7px)]") +
            (p ? " opacity-0" : "")
          }
          style={{ top: `${y(fin)}%` }}
        >
          {nombre(fin)}
        </span>

        {p && (
          <div
            role="status"
            className={
              "pointer-events-none absolute top-0 z-10 w-max rounded-[10px] border border-line bg-surface px-3 py-2 text-[12px] shadow-[var(--shadow-2)] " +
              (xs[vise as number] < 250 ? "translate-x-2" : xs[vise as number] > 750 ? "-translate-x-[calc(100%+8px)]" : "-translate-x-1/2")
            }
            style={{ left: `${xs[vise as number] / 10}%` }}
          >
            <div className="font-semibold">
              {jourCourt(p.jour)} · {JOURNAL.source[p.source] ?? JOURNAL.source.duel}
            </div>
            <div className="mt-0.5 font-mono tabular-nums text-muted">{JOURNAL.variation(p.delta, p.apres)}</div>
          </div>
        )}
      </div>
      <div aria-hidden className="flex justify-between font-mono text-[10.5px] tabular-nums text-muted">
        <span>{jourCourt(courbe.debut)}</span>
        <span>{jourCourt(courbe.fin)}</span>
      </div>
    </div>
  );
}
