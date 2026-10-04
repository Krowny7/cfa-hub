"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { stroke, type Pt } from "@/components/ink/geometry";
import { joursEntre, decaleJour, idealAu, type Trajectoire } from "@/lib/objectif-calc";
import { nombre } from "@/lib/voice";

// La trajectoire vers l'objectif de questions (même facture que la courbe
// d'ELO du classement) :
// - ta courbe, au pinceau : le cumul de questions posées, jour après jour,
//   jusqu'à aujourd'hui ;
// - la droite de l'objectif, au crayon : du jour où il a été fixé jusqu'à la
//   cible, le jour de l'examen ;
// - l'objectif recalculé, au stylo rouge : d'aujourd'hui à la cible, avec
//   le rythme qu'il demande (« 14/jour ») ;
// - la projection au rythme des 14 derniers jours, en pointillé léger, si
//   elle s'écarte de la cible.
// Survol : le jour, ses questions, le cumul et la droite. Le repère suit la
// largeur réelle (les chiffres gardent leur taille sur téléphone).

const X0 = 40;
const Y0 = 16;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function pas(range: number) {
  for (const s of [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]) if (range / s <= 5) return s;
  return 10000;
}

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
/** « 15 févr. » (clé AAAA-MM-JJ, sans fuseau : même rendu serveur et navigateur) */
export function jourCourt(k: string) {
  const [, m, d] = k.split("-").map(Number);
  return `${d} ${MOIS[(m || 1) - 1]}`;
}

export function TrajectoireChart({ t, compact = false }: { t: Trajectoire; compact?: boolean }) {
  const box = useRef<HTMLDivElement | null>(null);
  const [W, setW] = useState(560);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(clamp(e.contentRect.width, 280, 900));
      setW((old) => (Math.abs(old - w) > 2 ? w : old));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = Math.round(clamp(W * (compact ? 0.34 : 0.4), 170, compact ? 230 : 280));
  const X1 = W - 14;
  const Y1 = H - 26;
  const maskId = "rl-traj-" + useId().replace(/[^a-zA-Z0-9]/g, "");

  const debut = t.serie[0]?.day ?? t.aujourdhui;
  const span = Math.max(1, joursEntre(debut, t.examen));
  const actif = t.plan.statut === "actif";
  const maintenant = t.avant + t.jour;

  // une projection très au-dessus de la cible ne doit pas écraser la courbe : elle sort du cadre (la phrase donne le chiffre)
  const top = Math.max(t.total, maintenant, actif ? Math.min(t.projection, t.total * 1.2) : 0);
  const step = pas(Math.max(1, top));
  // un peu d'air au-dessus de la cible, sans monter jusqu'au palier suivant
  const vMax = Math.max(step, top * 1.1);
  const x = (k: number) => X0 + ((X1 - X0) * k) / span;
  const y = (v: number) => Y1 - (clamp(v, 0, vMax) / vMax) * (Y1 - Y0);
  const ticks: number[] = [];
  for (let v = 0; v <= vMax; v += step) ticks.push(v);

  // ta courbe : le cumul en fin de chaque jour (le jour k finit en x(k + 1))
  const avantDebut = (t.serie[0]?.cumul ?? 0) - (t.serie[0]?.n ?? 0);
  const pts: Pt[] = [[x(0), y(avantDebut)], ...t.serie.map((s, k): Pt => [x(k + 1), y(s.cumul)])];
  const key = pts.map((p) => p.join(",")).join(";");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const brushD = useMemo(() => stroke(pts, { w: 6, end: 0.6, attack: 0.05, jitter: 0.07, seed: 23, per: 8 }), [key]);
  const ext: Pt[] = [[pts[0][0] - 12, pts[0][1]], ...pts, [pts[pts.length - 1][0] + 12, pts[pts.length - 1][1]]];
  const axis = ext.map(([px, py], i) => `${i ? "L" : "M"} ${px.toFixed(1)} ${py.toFixed(1)}`).join(" ");

  const kDepuis = joursEntre(debut, t.depuis);
  const ici: Pt = pts[pts.length - 1];
  const cible: Pt = [x(span), y(t.total)];
  const proj: Pt = [x(span), y(t.projection)];
  const montreProj = actif && Math.abs(t.projection - t.total) > Math.max(25, t.total * 0.03);
  // l'étiquette du rythme, au milieu du trait rouge
  const mid: Pt = [(ici[0] + cible[0]) / 2, (ici[1] + cible[1]) / 2];

  const survol = hover !== null ? t.serie[hover] : null;
  const pencil = "var(--pencil)";
  const tickFill = "var(--ink-3)";
  const mono = { fontFamily: "var(--font-mono)", fontSize: 10.5 } as const;

  return (
    <div ref={box} className="relative text-white">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`Trajectoire : ${nombre(maintenant)} questions posées sur ${nombre(t.total)} visées le ${jourCourt(t.examen)}${actif ? `, ${t.plan.quotidien} par jour pour y arriver` : ""}`}
        style={{ display: "block", overflow: "visible" }}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const k = Math.round(((px - X0) / (X1 - X0)) * span - 0.5);
          setHover(k >= 0 && k < t.serie.length ? k : null);
        }}
      >
        {/* quadrillage au crayon */}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={X0 - 6} x2={X1} y1={y(v)} y2={y(v)} stroke={pencil} strokeWidth={0.8} strokeDasharray="2 5" />
            <text x={0} y={y(v) + 3.5} style={{ ...mono, fill: tickFill }}>
              {nombre(v)}
            </text>
          </g>
        ))}

        {/* l'examen : la ligne d'arrivée */}
        <line x1={x(span)} x2={x(span)} y1={Y0 - 6} y2={Y1} stroke={pencil} strokeWidth={1} />
        {/* la droite de l'objectif, au crayon */}
        <line x1={x(kDepuis)} y1={y(t.base)} x2={cible[0]} y2={cible[1]} stroke="var(--ink-3)" strokeWidth={1.3} strokeDasharray="5 4" strokeLinecap="round" />

        {/* la projection au rythme récent */}
        {montreProj && (
          <g>
            <line x1={ici[0]} y1={ici[1]} x2={proj[0]} y2={proj[1]} stroke="var(--ink-3)" strokeOpacity={0.6} strokeWidth={1.1} strokeDasharray="1 4" strokeLinecap="round" />
            <circle cx={proj[0]} cy={proj[1]} r={2.6} fill="var(--ink-3)" />
          </g>
        )}

        {/* l'objectif recalculé, au stylo rouge */}
        {actif && (
          <g>
            <line x1={ici[0]} y1={ici[1]} x2={cible[0]} y2={cible[1]} stroke="var(--pen)" strokeWidth={1.6} strokeDasharray="2 4" strokeLinecap="round" />
            {cible[0] - ici[0] > 70 && (
              // sous le trait rouge quand on est sous la droite (elle passe au-dessus), sinon dessus
              <text x={mid[0]} y={t.avant < t.ideal ? mid[1] + 17 : mid[1] - 9} textAnchor="middle" style={{ ...mono, fontSize: 11, fontWeight: 600, fill: "var(--pen)" }}>
                {nombre(t.plan.quotidien)}/jour
              </text>
            )}
          </g>
        )}

        {/* la cible */}
        <g>
          <path d={`M ${cible[0] - 5} ${cible[1] - 5} L ${cible[0] + 5} ${cible[1] + 5} M ${cible[0] + 5} ${cible[1] - 5} L ${cible[0] - 5} ${cible[1] + 5}`} stroke="var(--pen)" strokeWidth={2} strokeLinecap="round" />
          <text x={cible[0]} y={cible[1] - 10} textAnchor="end" style={{ ...mono, fontSize: 11, fontWeight: 600, fill: "var(--pen)" }}>
            {nombre(t.total)}
          </text>
        </g>

        {hover !== null && <line x1={x(hover + 1)} x2={x(hover + 1)} y1={Y0 - 6} y2={Y1} stroke={pencil} strokeWidth={1} />}

        {/* ta courbe : un coup de pinceau, dévoilé le long de son axe */}
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x={-10} y={-10} width={W + 20} height={H + 20}>
            <path d={axis} pathLength={100} className="rl-drawline" fill="none" stroke="#fff" strokeWidth={22} strokeLinejoin="round" strokeLinecap="butt" />
          </mask>
        </defs>
        <path d={brushD} fill="currentColor" mask={`url(#${maskId})`} filter="url(#rl-ink)" />
        <circle cx={ici[0]} cy={ici[1]} r={5} fill="currentColor" stroke="var(--paper)" strokeWidth={1.8} />

        {/* l'axe des jours : le début, aujourd'hui, l'examen */}
        <text x={X0} y={H - 6} style={{ ...mono, fill: tickFill }}>
          {jourCourt(debut)}
        </text>
        {ici[0] - X0 > 78 && x(span) - ici[0] > 120 && (
          <text x={ici[0]} y={H - 6} textAnchor="middle" style={{ ...mono, fill: tickFill }}>
            aujourd&apos;hui
          </text>
        )}
        <text x={x(span)} y={H - 6} textAnchor="end" style={{ ...mono, fontWeight: 600, fill: "currentColor" }}>
          examen · {jourCourt(t.examen)}
        </text>
      </svg>

      {survol && hover !== null && (
        <div
          role="status"
          className={
            "pointer-events-none absolute z-10 w-max -translate-y-full rounded-[10px] border border-line bg-surface px-3 py-2 text-[12px] text-white shadow-[var(--shadow-2)] " +
            (x(hover + 1) / W < 0.25 ? "-translate-x-3" : x(hover + 1) / W > 0.75 ? "-translate-x-[calc(100%-12px)]" : "-translate-x-1/2")
          }
          style={{ left: `${(x(hover + 1) / W) * 100}%`, top: `calc(${(y(survol.cumul) / H) * 100}% - 12px)` }}
        >
          <div className="font-semibold">
            {survol.day === t.aujourdhui ? "Aujourd'hui" : jourCourt(survol.day)} · {nombre(survol.n)} {survol.n > 1 ? "questions" : "question"}
          </div>
          <div className="mt-0.5 font-mono tabular-nums text-muted">
            cumul {nombre(survol.cumul)}
            {survol.day >= t.depuis ? ` · droite ${nombre(idealAu(decaleJour(survol.day, 1), { depuis: t.depuis, base: t.base, examen: t.examen, total: t.total }))}` : ""}
          </div>
        </div>
      )}
    </div>
  );
}
