import { geometrieJauge } from "@/components/moi/synthese/modele";
import { SYN } from "@/lib/voice-moi";

// La jauge « Si l'examen était aujourd'hui » : un demi-cercle de 0 à 100, un
// anneau extérieur qui découpe les zones (rouge sous 50, ambre de 50 à 69, neutre
// au-dessus du seuil), la valeur tracée de la couleur de SA zone (rouge, ambre
// ou le vert « acquis »), et le repère du seuil en pointillé. Rendu serveur,
// aucun hook : la géométrie vient de modele.ts (geometrieJauge).

const COULEUR_DE_ZONE = { r: "var(--zone-rouge)", a: "var(--zone-ambre)", e: "var(--acquis)" } as const;
const MONO = "var(--font-mono, ui-monospace, Menlo, monospace)";

export function Jauge({ note, seuil = 70, taille = 176 }: { note: number; seuil?: number; /** largeur affichée, en px */ taille?: number }) {
  const g = geometrieJauge(note, seuil);
  return (
    <svg viewBox="0 0 220 130" width={taille} height={Math.round((taille * 130) / 220)} style={{ display: "block" }} role="img" aria-label={SYN.obj.jauge.aria(note, seuil)}>
      <path d={g.zones[0]} fill="none" stroke="var(--fond-rouge)" strokeWidth={5} />
      <path d={g.zones[1]} fill="none" stroke="var(--fond-ambre)" strokeWidth={5} />
      <path d={g.zones[2]} fill="none" stroke="var(--line-2)" strokeWidth={5} />
      <path d={g.fond} fill="none" stroke="var(--piste)" strokeWidth={14} strokeLinecap="round" />
      {g.valeur && <path d={g.valeur} fill="none" stroke={COULEUR_DE_ZONE[g.zone]} strokeWidth={14} strokeLinecap="round" />}
      <line x1={g.tick.x1} y1={g.tick.y1} x2={g.tick.x2} y2={g.tick.y2} stroke="var(--ink)" strokeWidth={2} strokeDasharray="3 3" />
      <text x={g.seuil.x} y={g.seuil.y} fill="var(--ink)" fontSize={14} fontWeight={700} fontFamily={MONO}>
        {seuil}
      </text>
      <text x={26} y={129} textAnchor="middle" fill="var(--ink-2)" fontSize={14} fontFamily={MONO}>
        0
      </text>
      <text x={194} y={129} textAnchor="middle" fill="var(--ink-2)" fontSize={14} fontFamily={MONO}>
        100
      </text>
    </svg>
  );
}
