import { chiffresObjectif, entier, geometrieTrajectoire, signe, type DimsTrajectoire } from "@/components/moi/synthese/modele";
import type { ObjectifPlan } from "@/components/moi/synthese/types";
import { SYN } from "@/lib/voice-moi";
import s from "@/components/moi/synthese/Synthese.module.css";

// « Ta trajectoire jusqu'au jour J » : la courbe des questions faites depuis le
// départ, la droite jusqu'à l'objectif (violet, tirets), la projection au
// rythme actuel (noir, pointillé) et l'écart entre les deux (rouge, une couleur
// de donnée). Rendu serveur, aucun hook : la géométrie vient de modele.ts
// (geometrieTrajectoire). Deux tailles d'un même dessin : les trois colonnes de
// l'ordinateur (compacte) et le téléphone (large), que la feuille de style
// permute selon la largeur du bloc.

const MONO = "var(--font-mono, ui-monospace, Menlo, monospace)";

export function Trajectoire({ o, dims, className }: { o: ObjectifPlan; dims: DimsTrajectoire; className?: string }) {
  const c = chiffresObjectif(o);
  const g = geometrieTrajectoire(o, dims);
  const d = g.dims;
  const aria = SYN.obj.trajectoireAria(g.dates.debut, c.fait, c.quotidien, g.dates.fin, c.rythme, o.projection);
  const axeY = d.bas;
  return (
    <svg viewBox={`0 0 ${d.larg} ${d.haut}`} role="img" aria-label={aria} className={[s.trajSvg, className].filter(Boolean).join(" ")}>
      {/* la part à venir, surlignée */}
      <rect x={g.xAuj} y={d.sommet} width={Math.max(0, g.xFin - g.xAuj)} height={d.bas - d.sommet} fill="var(--violet)" fillOpacity={0.12} />
      <g stroke="var(--line-2)" strokeWidth={1}>
        {g.grille.slice(0, -1).map((l) => (
          <line key={l.texte} x1={d.gauche} y1={l.y} x2={d.droite} y2={l.y} />
        ))}
      </g>
      <line x1={d.gauche} y1={axeY} x2={d.droite} y2={axeY} stroke="var(--pencil)" strokeWidth={1} />
      <g fontFamily={MONO} fontSize={11} fill="var(--ink-2)" textAnchor="end">
        {g.grille.map((l) => (
          <text key={l.texte} x={d.gauche - 4} y={l.y + 3.5}>
            {l.texte}
          </text>
        ))}
      </g>
      {/* aujourd'hui */}
      <line x1={g.xAuj} y1={d.sommet - 6} x2={g.xAuj} y2={axeY} stroke="var(--ink)" strokeOpacity={0.4} strokeDasharray="3 3" />
      <polygon points={g.aire} fill="var(--noir)" fillOpacity={0.08} />
      <polyline points={g.courbe} fill="none" stroke="var(--noir)" strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />
      {/* la droite jusqu'à l'objectif, et la projection au rythme actuel */}
      <line x1={g.xAuj} y1={g.yFait} x2={g.xFin} y2={g.yTotal} stroke="var(--violet)" strokeWidth={2.2} strokeDasharray="6 4" />
      <line x1={g.xAuj} y1={g.yFait} x2={g.xFin} y2={g.yProjection} stroke="var(--noir)" strokeWidth={2.6} strokeDasharray="0.5 5" strokeLinecap="round" />
      {g.ecart < 0 && <line x1={g.xFin} y1={g.yTotal} x2={g.xFin} y2={g.yProjection} stroke="var(--zone-rouge)" strokeWidth={3} />}
      <circle cx={g.xFin} cy={g.yTotal} r={3.5} fill="var(--violet)" />
      <circle cx={g.xFin} cy={g.yProjection} r={3.5} fill="var(--noir)" />
      <circle cx={g.xAuj} cy={g.yFait} r={5} fill="var(--noir)" stroke="var(--surface)" strokeWidth={2} />
      <text x={g.fait.x} y={g.fait.y} textAnchor="end" fontFamily={MONO} fontSize={11} fontWeight={600} fill="var(--ink)">
        {entier(c.fait)}
      </text>
      <g fontFamily={MONO} fontSize={11} fontWeight={600}>
        <text x={g.xFin + 5} y={g.etiquettes.total} fill="var(--violet)">
          {entier(o.total)}
        </text>
        <text x={g.xFin + 5} y={g.etiquettes.projection} fill="var(--ink)">
          {entier(o.projection)}
        </text>
        {g.etiquettes.ecart !== null && (
          <text x={g.xFin + 5} y={g.etiquettes.ecart} fill="var(--zone-rouge)">
            {signe(g.ecart)}
          </text>
        )}
      </g>
      <g fontSize={11} fill="var(--ink-2)">
        {g.xAuj - d.gauche >= 44 && (
          <text x={d.gauche} y={d.bas + 18}>
            {g.dates.debut}
          </text>
        )}
        <text x={g.xAuj} y={d.bas + 18} textAnchor="middle" fontWeight={700} fill="var(--ink)">
          {SYN.obj.auj}
        </text>
        <text x={g.xFin} y={d.bas + 18} textAnchor="middle">
          {g.dates.fin}
        </text>
      </g>
    </svg>
  );
}
