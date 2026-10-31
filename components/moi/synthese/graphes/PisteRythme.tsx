import type { LigneRythme } from "@/components/moi/synthese/modele-examen";
import m from "@/components/moi/synthese/Examen.module.css";

// La piste d'une ligne de « Ton rythme d'examen » : une règle de 60 à 140 s, le
// repère de 90 s (le rythme de l'examen, en pointillé), la barre entre le point
// et ce repère (rouge pâle si tu es plus lent, grise si tu es plus vite) et le
// point lui-même, dans la couleur de sa zone (vert jusqu'à 90 s, ambre jusqu'à
// 110 s, rouge au-delà). Des aplats, aucun hook : tout vient de modele-examen.ts
// (lignesRythme).

const POINT = { r: m.ptR, a: m.ptA, e: m.ptE } as const;

export function PisteRythme({ ligne }: { ligne: Pick<LigneRythme, "x" | "ton" | "exces"> }) {
  const { exces } = ligne;
  return (
    <span className={m.rt} aria-hidden>
      <span className={exces.vite ? `${m.ex} ${m.exVite}` : m.ex} style={{ left: `${exces.gauche}%`, width: `${exces.largeur}%` }} />
      <span className={m.l90} />
      <i className={`${m.pt} ${POINT[ligne.ton]}`} style={{ left: `${ligne.x}%` }} />
    </span>
  );
}
