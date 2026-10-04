import { useId } from "react";

// Radar « stats de joueur » : toi contre la moyenne des joueurs. Valeurs
// 0–100 ; null = pas encore mesuré.
// - La forme ne passe que par les matières mesurées : une matière sans
//   donnée ne tire plus la forme jusqu'au centre (elle est marquée « — » et
//   d'un petit rond vide sur son axe).
// - Fond en bandes (20 % chacune), graduations 25/50/75 sur l'axe du haut.
// - Toi : un lavis à ta couleur (plus dense vers le bord), un trait d'encre
//   au pinceau qui se trace à l'apparition, des points.
// - La moyenne : pointillés au crayon. Sous chaque matière, ta valeur et
//   l'écart à la moyenne (en rouge quand tu es en dessous).
// Les axes `soon` (domaines pas encore ouverts) sont en pointillés et
// marqués « bientôt ». `couleur` : la couleur du joueur (encre par défaut).
// `comparaison` : une seconde forme par-dessus (celui qui regarde un autre
// profil : « toi »), d'un trait plein à sa couleur, points vides ; sous
// chaque matière, les deux valeurs et l'écart. La moyenne s'efface pendant
// ce temps, et les lavis laissent place aux zones d'écart : en vert ce que
// ta forme couvre en plus de la sienne (tu fais mieux), en rouge ce que la
// sienne couvre en plus de la tienne, en gris léger ce que vous partagez.
// Ces zones sont des masques SVG des deux formes : rien à calculer.
// Sans état (useId seulement) : utilisable côté serveur comme côté client.

export type RadarAxis = { label: string; me: number | null; avg: number | null; soon?: boolean };
/** Une seconde forme à superposer : une valeur par axe (null : pas mesurée). */
export type RadarComparaison = { valeurs: (number | null)[]; couleur: string; label: string };

const f = (n: number) => n.toFixed(1);

export function Radar({
  axes,
  size = 360,
  title = "Toi face à la moyenne des joueurs",
  couleur = "var(--ink)",
  comparaison = null,
}: {
  axes: RadarAxis[];
  size?: number;
  title?: string;
  couleur?: string;
  comparaison?: RadarComparaison | null;
}) {
  const uid = "rad" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const n = axes.length;
  const c = size / 2;
  const R = size * 0.34;
  const P = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [c + Math.cos(a) * R * (v / 100), c + Math.sin(a) * R * (v / 100)] as const;
  };
  const ring = (lv: number) => axes.map((_, i) => P(i, lv)).map(([x, y], i) => `${i ? "L" : "M"} ${f(x)} ${f(y)}`).join(" ") + " Z";
  const path = (pts: (readonly [number, number])[], close = true) => pts.map(([x, y], i) => `${i ? "L" : "M"} ${f(x)} ${f(y)}`).join(" ") + (close ? " Z" : "");

  const mesures = axes.map((a, i) => ({ i, v: a.me })).filter((m): m is { i: number; v: number } => m.v !== null);
  const mePts = mesures.map((m) => P(m.i, Math.max(2, m.v)));
  const hasAvg = !comparaison && axes.some((a) => a.avg !== null);
  const autrePts = comparaison
    ? comparaison.valeurs.map((v, i) => (v !== null && v !== undefined ? P(i, Math.max(2, v)) : null)).filter((p): p is readonly [number, number] => p !== null)
    : [];
  const avgPts = axes.map((a, i) => (a.avg !== null ? P(i, a.avg) : null)).filter((p): p is readonly [number, number] => p !== null);
  // les zones d'écart : il faut deux vraies formes (3 points chacune)
  const zones = !!comparaison && mePts.length >= 3 && autrePts.length >= 3;
  const dSien = zones ? path(mePts) : "";
  const dAutre = zones ? path(autrePts) : "";

  return (
    <svg
      viewBox={`-108 -18 ${size + 216} ${size + 40}`}
      width="100%"
      role="img"
      aria-label={title}
      style={{ display: "block", maxWidth: size + 216, margin: "0 auto", overflow: "visible", color: couleur }}
    >
      <defs>
        <radialGradient id={`${uid}l`} cx={c} cy={c} r={R} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="currentColor" stopOpacity={0.04} />
          <stop offset="1" stopColor="currentColor" stopOpacity={0.26} />
        </radialGradient>
        {zones && (
          <>
            {/* « hors de sa forme » et « hors de la tienne » */}
            <mask id={`${uid}hs`} maskUnits="userSpaceOnUse" x={0} y={0} width={size} height={size}>
              <rect width={size} height={size} fill="#fff" />
              <path d={dSien} fill="#000" />
            </mask>
            <mask id={`${uid}ha`} maskUnits="userSpaceOnUse" x={0} y={0} width={size} height={size}>
              <rect width={size} height={size} fill="#fff" />
              <path d={dAutre} fill="#000" />
            </mask>
            <clipPath id={`${uid}ca`}>
              <path d={dAutre} />
            </clipPath>
          </>
        )}
      </defs>

      {/* le fond : cinq bandes, la plus extérieure un cran plus nette */}
      {[100, 80, 60, 40, 20].map((lv, k) => (
        <path key={lv} d={ring(lv)} fill="var(--ink)" fillOpacity={k % 2 === 0 ? 0.028 : 0.012} stroke={lv === 100 ? "var(--line-2)" : "var(--line)"} strokeWidth={1} />
      ))}
      {axes.map((a, i) => {
        const [x, y] = P(i, 100);
        return <line key={i} x1={c} y1={c} x2={f(x)} y2={f(y)} stroke="var(--line)" strokeWidth={1} strokeDasharray={a.soon ? "2 4" : undefined} />;
      })}
      {/* graduations sur l'axe du haut */}
      {[25, 50, 75].map((lv) => (
        <text key={lv} x={f(c + 5)} y={f(c - R * (lv / 100) + 3.5)} style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, fill: "var(--ink-3)" }}>
          {lv}
        </text>
      ))}

      {/* la moyenne des joueurs, au crayon */}
      {hasAvg && avgPts.length >= 2 && (
        <path d={path(avgPts, avgPts.length === n)} fill="none" stroke="var(--ink-2)" strokeOpacity={0.75} strokeWidth={1.3} strokeDasharray="3.5 4" strokeLinejoin="round" />
      )}

      {/* les zones d'écart : vert = tu fais mieux, rouge = il fait mieux */}
      {zones && (
        <g className="rl-fade">
          <path d={dSien} fill="var(--ink)" fillOpacity={0.06} clipPath={`url(#${uid}ca)`} />
          <path d={dAutre} fill="var(--gain)" style={{ fillOpacity: "var(--zone-op)" }} mask={`url(#${uid}hs)`} />
          <path d={dSien} fill="var(--perte)" style={{ fillOpacity: "var(--zone-op)" }} mask={`url(#${uid}ha)`} />
        </g>
      )}

      {/* la comparaison (celui qui regarde) : sous la forme du joueur, trait plein, points vides */}
      {comparaison && autrePts.length >= 2 && (
        <g style={{ color: comparaison.couleur }}>
          {autrePts.length >= 3 && !zones && <path d={path(autrePts)} fill="currentColor" fillOpacity={0.1} />}
          <path d={path(autrePts, autrePts.length >= 3)} pathLength={100} className="rl-drawline" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
          {autrePts.map(([x, y], k) => (
            <circle key={k} cx={f(x)} cy={f(y)} r={3.2} fill="var(--surface)" stroke="currentColor" strokeWidth={1.8} />
          ))}
        </g>
      )}

      {/* le joueur : le lavis, le trait au pinceau, les points */}
      <g className="rl-radar">
        {mePts.length >= 3 && !zones && <path d={path(mePts)} fill={`url(#${uid}l)`} />}
        {mePts.length >= 2 && (
          <path d={path(mePts, mePts.length >= 3)} pathLength={100} className="rl-drawline" filter="url(#rl-ink)" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {mePts.map(([x, y], k) => (
          <circle key={k} cx={f(x)} cy={f(y)} r={3.6} fill="currentColor" stroke="var(--surface)" strokeWidth={1.6} />
        ))}
        {/* pas encore mesuré : un rond vide près du centre */}
        {axes.map((a, i) => {
          if (a.me !== null || a.soon) return null;
          const [x, y] = P(i, 12);
          return <circle key={`v${i}`} cx={f(x)} cy={f(y)} r={2.6} fill="var(--surface)" stroke="var(--ink-3)" strokeWidth={1.1} />;
        })}
      </g>

      {axes.map((a, i) => {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const x = c + Math.cos(ang) * (R + 26);
        const y = c + Math.sin(ang) * (R + 22);
        const anchor = Math.abs(Math.cos(ang)) < 0.2 ? "middle" : Math.cos(ang) > 0 ? "start" : "end";
        const ecart = !comparaison && a.me !== null && a.avg !== null ? Math.round(a.me - a.avg) : null;
        const autre = comparaison ? (comparaison.valeurs[i] ?? null) : null;
        return (
          <g key={i}>
            {/* Tailles des étiquettes en CSS (.rl-radar-l / .rl-radar-v) : plus
                grandes sur téléphone, où le radar entier est réduit. */}
            <text x={f(x)} y={f(y + 4)} textAnchor={anchor} className="rl-radar-l" style={{ fontFamily: "var(--font-sans)", fontWeight: 650, fill: a.soon ? "var(--ink-2)" : "var(--ink)" }}>
              {a.label}
              {a.soon ? " · bientôt" : ""}
              <tspan x={f(x)} dy="1.35em" className="rl-radar-v" style={{ fontFamily: "var(--font-mono)", fontWeight: 400, fill: "var(--ink-2)" }}>
                <tspan style={{ fill: "var(--ink)", fontWeight: 600 }}>{a.me === null ? "—" : a.me}</tspan>
                {ecart !== null && ecart !== 0 ? (
                  <tspan style={{ fill: ecart < 0 ? "var(--pen)" : "var(--ink-2)", fontWeight: 600 }}>{` ${ecart > 0 ? "+" : "−"}${Math.abs(ecart)}`}</tspan>
                ) : null}
                {comparaison ? (
                  <>
                    <tspan style={{ fill: comparaison.couleur, fontWeight: 600 }}>{` · ${comparaison.label} ${autre === null ? "—" : autre}`}</tspan>
                    {/* ton écart : vert devant, rouge derrière */}
                    {autre !== null && a.me !== null && Math.round(autre - a.me) !== 0 ? (
                      <tspan style={{ fill: autre > a.me ? "var(--gain)" : "var(--perte)", fontWeight: 650 }}>{` ${autre > a.me ? "+" : "−"}${Math.abs(Math.round(autre - a.me))}`}</tspan>
                    ) : null}
                  </>
                ) : a.avg !== null ? (
                  <tspan fillOpacity={0.85}>{` · moy ${a.avg}`}</tspan>
                ) : (
                  ""
                )}
              </tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Légende « toi / moyenne des joueurs » à poser au-dessus d'un radar. */
export function RadarLegend({ couleur = "var(--ink)" }: { couleur?: string }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 12, fontWeight: 500, color: "var(--ink-2)" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 16, height: 2.5, borderRadius: 2, background: couleur }} />
        toi
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 16, height: 0, borderTop: "1.5px dashed var(--ink-2)" }} />
        moyenne des joueurs
      </span>
    </div>
  );
}
