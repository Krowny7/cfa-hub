// Radar « stats de joueur » : toi (trait d'encre, au pinceau) contre la
// moyenne des joueurs (pointillés). Valeurs 0–100 ; null = pas de donnée
// (compté 0 sur le tracé, affiché « — »). Les axes `soon` (domaines pas encore
// ouverts) sont en pointillés et marqués « bientôt ». Composant sans état ni
// hook : utilisable côté serveur comme côté client.

export type RadarAxis = { label: string; me: number | null; avg: number | null; soon?: boolean };

const f = (n: number) => n.toFixed(1);

export function Radar({ axes, size = 360, title = "Toi face à la moyenne des joueurs" }: { axes: RadarAxis[]; size?: number; title?: string }) {
  const n = axes.length;
  const c = size / 2;
  const R = size * 0.34;
  const P = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [c + Math.cos(a) * R * (v / 100), c + Math.sin(a) * R * (v / 100)] as const;
  };
  const polyOf = (vals: number[]) => vals.map((v, i) => P(i, v)).map(([x, y], i) => `${i ? "L" : "M"} ${f(x)} ${f(y)}`).join(" ") + " Z";
  const me = axes.map((a) => a.me ?? 0);
  const avg = axes.map((a) => a.avg ?? 0);
  const hasAvg = axes.some((a) => a.avg !== null);

  return (
    <svg viewBox={`-104 -16 ${size + 208} ${size + 34}`} width="100%" role="img" aria-label={title} style={{ display: "block", maxWidth: size + 208, margin: "0 auto", overflow: "visible", color: "var(--ink)" }}>
      {/* grille légère : anneaux intérieurs au filet le plus fin, contour un cran plus net */}
      <path d={polyOf(axes.map(() => 100))} fill="currentColor" fillOpacity={0.018} stroke="var(--line-2)" strokeWidth={1} />
      {[25, 50, 75].map((lv) => (
        <path key={lv} d={polyOf(axes.map(() => lv))} fill="none" stroke="var(--line)" strokeWidth={1} />
      ))}
      {axes.map((a, i) => {
        const [x, y] = P(i, 100);
        return <line key={i} x1={c} y1={c} x2={f(x)} y2={f(y)} stroke="var(--line)" strokeWidth={1} strokeDasharray={a.soon ? "2 4" : undefined} />;
      })}
      {hasAvg && <path d={polyOf(avg)} fill="none" stroke="var(--ink-2)" strokeOpacity={0.8} strokeWidth={1.3} strokeDasharray="4 4" strokeLinejoin="round" />}
      <g className="rl-radar">
        <path d={polyOf(me)} fill="currentColor" fillOpacity={0.085} />
        <path d={polyOf(me)} filter="url(#rl-ink)" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinejoin="round" />
        {me.map((v, i) => {
          const [x, y] = P(i, v);
          return <circle key={i} cx={f(x)} cy={f(y)} r={3.4} fill="currentColor" stroke="var(--surface)" strokeWidth={1.6} />;
        })}
      </g>
      {axes.map((a, i) => {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const x = c + Math.cos(ang) * (R + 26);
        const y = c + Math.sin(ang) * (R + 22);
        const anchor = Math.abs(Math.cos(ang)) < 0.2 ? "middle" : Math.cos(ang) > 0 ? "start" : "end";
        return (
          <g key={i}>
            {/* Tailles des étiquettes en CSS (.rl-radar-l / .rl-radar-v) : plus
                grandes sur téléphone, où le radar entier est réduit. */}
            <text x={f(x)} y={f(y + 4)} textAnchor={anchor} className="rl-radar-l" style={{ fontFamily: "var(--font-sans)", fontWeight: 650, fill: a.soon ? "var(--ink-2)" : "var(--ink)" }}>
              {a.label}
              {a.soon ? " · bientôt" : ""}
              <tspan x={f(x)} dy="1.35em" className="rl-radar-v" style={{ fontFamily: "var(--font-mono)", fontWeight: 400, fill: "var(--ink-2)" }}>
                <tspan style={{ fill: "var(--ink)", fontWeight: 600 }}>{a.me === null ? "—" : a.me}</tspan>
                {a.avg !== null ? <tspan fillOpacity={0.85}>{` · moy ${a.avg}`}</tspan> : ""}
              </tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Légende « toi / moyenne des joueurs » à poser au-dessus d'un radar. */
export function RadarLegend() {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 12, fontWeight: 500, color: "var(--ink-2)" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 16, height: 2.5, borderRadius: 2, background: "var(--ink)" }} />
        toi
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 16, height: 0, borderTop: "1.5px dashed var(--ink-2)" }} />
        moyenne des joueurs
      </span>
    </div>
  );
}
