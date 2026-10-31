import type { GeoCourbe, TraceSuperpose } from "@/components/moi/synthese/modele-examen";
import { EXA } from "@/lib/voice-moi-examen";

// « Ta progression » : la maîtrise globale semaine après semaine, sur un fond
// de zones (rouge sous 50 %, ambre de 50 à 69, neutre au-dessus) coupé par la
// droite de 70 %. Le trait noir est ta note, le pointillé noir la projection au
// rythme des 4 dernières semaines, et le tracé améthyste (rouge sous 50 %) la
// matière superposée. Rendu serveur ou client, aucun hook : la géométrie vient
// de modele-examen.ts (geometrieCourbe, traceSuperpose). Deux tailles du même
// dessin : la feuille de style montre l'une ou l'autre selon la largeur du bloc.

const MONO = "var(--font-mono, ui-monospace, Menlo, monospace)";

export function Courbe({ g, aria, superpose, className }: { g: GeoCourbe; aria: string; superpose: TraceSuperpose | null; className?: string }) {
  const d = g.dims;
  const largeur = d.droite - d.gauche;
  const p = g.projection;
  return (
    <svg viewBox={`0 0 ${d.larg} ${d.haut}`} role="img" aria-label={aria} className={className}>
      <rect x={d.gauche} y={g.zones.rouge.y} width={largeur} height={g.zones.rouge.h} fill="var(--fond-rouge)" fillOpacity={0.6} />
      <rect x={d.gauche} y={g.zones.ambre.y} width={largeur} height={g.zones.ambre.h} fill="var(--fond-ambre)" fillOpacity={0.6} />
      <rect x={d.gauche} y={g.zones.haut.y} width={largeur} height={g.zones.haut.h} fill="var(--piste)" />
      <line x1={d.gauche} y1={g.y70} x2={d.droite} y2={g.y70} stroke="var(--ink)" strokeWidth={1.5} strokeDasharray="5 4" strokeOpacity={0.7} />
      <g fontFamily={MONO} fontSize={11} fill="var(--ink-2)" textAnchor="end">
        {g.graduations.map((t) => (
          <text key={t.texte} x={d.gauche - 6} y={t.y + 4}>
            {t.texte}
          </text>
        ))}
      </g>
      <text x={d.gauche - 6} y={g.y70 + 4} textAnchor="end" fontFamily={MONO} fontSize={11} fontWeight={700} fill="var(--ink)">
        {`70${d.suffixe70}`}
      </text>
      {/* aujourd'hui */}
      <line x1={g.xAuj} y1={d.sommet - 4} x2={g.xAuj} y2={d.bas} stroke="var(--ink)" strokeOpacity={0.4} strokeDasharray="3 3" />
      <text x={g.xAuj} y={10} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--ink)">
        {EXA.progression.auj}
      </text>
      <polygon points={g.aire} fill="var(--noir)" fillOpacity={0.07} />
      <polyline points={g.ligne} fill="none" stroke="var(--noir)" strokeWidth={d.trait} strokeLinejoin="round" strokeLinecap="round" />
      <g fill="var(--noir)">
        {g.points.map((q, k) => (
          <circle key={k} cx={q.x} cy={q.y} r={d.rPoint} />
        ))}
      </g>
      {/* la projection au rythme des 4 dernières semaines, jusqu'à 70 % ou jusqu'au bord de l'axe */}
      {p && (
        <>
          <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke="var(--noir)" strokeWidth={d.trait} strokeDasharray="0.5 6" strokeLinecap="round" />
          <circle cx={p.x2} cy={p.y2} r={d.rFin} fill="var(--surface)" stroke="var(--noir)" strokeWidth={2} />
        </>
      )}
      <g fontFamily={MONO} fontSize={11.5} fontWeight={600} fill="var(--ink)">
        <text x={g.debut.x} y={g.debut.y} textAnchor={g.debut.ancre}>
          {g.debut.texte}
        </text>
        <text x={g.fin.x} y={g.fin.y} textAnchor={g.fin.ancre}>
          {g.fin.texte}
        </text>
      </g>
      {/* la matière superposée : sa propre série hebdomadaire */}
      {superpose && (
        <>
          <path d={superpose.d} fill="none" stroke={superpose.rouge ? "var(--zone-rouge)" : "var(--violet)"} strokeWidth={d.trait} strokeLinejoin="round" strokeLinecap="round" />
          <g fill={superpose.rouge ? "var(--zone-rouge)" : "var(--violet)"} stroke="var(--surface)" strokeWidth={1.5}>
            {superpose.points.map((q, k) => (
              <circle key={k} cx={q.x} cy={q.y} r={d.rPoint + 1} />
            ))}
          </g>
        </>
      )}
      <g fontSize={11} fill="var(--ink-2)">
        {g.dates.map((t, k) => (
          <text key={k} x={t.x} y={t.y} textAnchor={t.ancre} fontWeight={t.gras ? 700 : undefined} fill={t.gras ? "var(--ink)" : undefined}>
            {t.texte}
          </text>
        ))}
      </g>
    </svg>
  );
}
