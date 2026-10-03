import { INK } from "@/components/ui/InkDefs";
import { joursEncre, serie, type EtatJour } from "@/lib/voice";

/**
 * Les bâtons (moment 2) : la série en jours d'encre, comptée comme sur un
 * carnet, 4 traits et une barre en travers.
 *
 * Le bâton du jour suit `jour` :
 * - "fait" : il est tracé (à l'encre, il se dessine à l'apparition) ;
 * - "attente" : pas encore, la journée continue : il attend au crayon ;
 * - "sec" : le soir, rien encore : il est déjà là, mais sec et gris
 *   (« Une question suffit pour garder tes 7 jours. »).
 * `etatDuJour(reponduesAujourdhui, heureParis)` de lib/voice le calcule.
 *
 * Props de `Batons` (le dessin seul) :
 * - `jours` : jours d'encre acquis, aujourd'hui compris s'il est fait
 * - `jour` : "fait" | "attente" | "sec" (défaut "fait")
 * - `height` : hauteur en px (défaut 30) ; la largeur suit
 * - `max` : nombre de bottes visibles au plus (défaut 6, soit 30 jours) ;
 *   au-delà, les plus anciennes se replient en « … » au crayon
 * - `animer` : le bâton du jour se trace à l'apparition (défaut true)
 *
 * `SerieBatons` : le bloc prêt à poser (bâtons + « 6 jours » + la phrase de
 * la voix), avec un emplacement `aside` pour le sceau d'un palier (7, 30, 100).
 * Il montre 4 bottes au plus (20 jours) : le nombre dit le reste.
 *
 * Sans état ni hook : utilisable côté serveur. Les traits viennent d'InkDefs.
 */
export function Batons({
  jours,
  jour = "fait",
  height = 30,
  max = 6,
  animer = true,
  className = "",
}: {
  jours: number;
  jour?: EtatJour;
  height?: number;
  max?: number;
  animer?: boolean;
  className?: string;
}) {
  const acquis = Math.max(0, Math.round(jours));
  // le bâton du jour en attente ou sec s'ajoute aux jours acquis
  const total = acquis + (jour === "fait" ? 0 : 1);
  const today = jour === "fait" ? acquis - 1 : acquis;
  // repli des plus anciennes bottes complètes
  const groupsAll = Math.ceil(Math.max(1, total) / 5);
  const hiddenGroups = Math.max(0, groupsAll - Math.max(1, max));
  const first = hiddenGroups * 5;
  const lead = hiddenGroups > 0 ? 18 : 0;

  const STEP = 13;
  const GROUP = 66;
  const marks: React.ReactNode[] = [];
  for (let i = first; i < Math.max(total, 1); i++) {
    const g = Math.floor(i / 5);
    const k = i % 5;
    const gx = lead + (g - hiddenGroups) * GROUP;
    const isToday = i === today;
    const pencil = (isToday && jour === "attente") || total === 0;
    const dry = isToday && jour === "sec";
    const wet = isToday && jour === "fait" && animer;
    if (k < 4) {
      const x = gx + k * STEP;
      if (pencil) {
        marks.push(
          <path key={i} d={`M ${x + 7.6} 5 L ${x + 6.6} 44`} fill="none" stroke="var(--pencil)" strokeWidth={1.1} strokeLinecap="round" vectorEffect="non-scaling-stroke" />,
        );
      } else {
        marks.push(
          <use
            key={i}
            href={INK.tally[(i * 3 + 1) % 5]}
            x={x}
            y={0}
            fill={dry ? "var(--pencil)" : "currentColor"}
            filter={dry ? INK.dry : undefined}
            className={wet ? "rl-stick" : undefined}
          />,
        );
      }
    } else {
      if (pencil) {
        marks.push(
          <path key={i} d={`M ${gx + 1} 37 L ${gx + 53} 12`} fill="none" stroke="var(--pencil)" strokeWidth={1.1} strokeLinecap="round" vectorEffect="non-scaling-stroke" />,
        );
      } else {
        marks.push(
          <use
            key={i}
            href={INK.tallyBar[g % 2]}
            x={gx}
            y={0}
            fill={dry ? "var(--pencil)" : "currentColor"}
            filter={dry ? INK.dry : undefined}
            className={wet ? "rl-underline" : undefined}
          />,
        );
      }
    }
  }

  const shown = Math.max(total, 1) - first;
  const lastG = Math.floor((first + shown - 1) / 5) - hiddenGroups;
  const lastK = (first + shown - 1) % 5;
  const width = lead + lastG * GROUP + (lastK === 4 ? 56 : lastK * STEP + 14);

  return (
    <svg
      viewBox={`-2 -2 ${width + 4} 52`}
      height={height}
      width={(height * (width + 4)) / 52}
      aria-hidden
      className={"block overflow-visible " + className}
      // se resserre si la place manque (la hauteur suit la largeur)
      style={{ color: "var(--ink)", maxWidth: "100%", height: "auto" }}
    >
      {hiddenGroups > 0 && (
        <g fill="var(--pencil)">
          <circle cx={1.5} cy={40} r={1.6} />
          <circle cx={6.5} cy={40} r={1.6} />
          <circle cx={11.5} cy={40} r={1.6} />
        </g>
      )}
      {marks}
    </svg>
  );
}

/** Le bloc de la série : bâtons, nombre de jours, phrase. */
export function SerieBatons({
  jours,
  jour = "fait",
  height = 30,
  max = 4,
  aside,
  className = "",
}: {
  jours: number;
  jour?: EtatJour;
  height?: number;
  max?: number;
  /** sceau d'un palier (7, 30, 100 jours), à droite */
  aside?: React.ReactNode;
  className?: string;
}) {
  const s = serie(jours, jour);
  return (
    <div className={"flex items-center gap-4 " + className} role="group" aria-label={`${joursEncre(jours)} · ${s.ligne}`}>
      <div className="min-w-[40px] shrink">
        <Batons jours={jours} jour={jour} height={height} max={max} />
      </div>
      <div aria-hidden className="min-w-0 shrink-0 basis-auto" style={{ maxWidth: "62%" }}>
        <p className="t-num whitespace-nowrap text-[22px] leading-none">{s.titre}</p>
        <p className={"t-micro mt-1.5 " + (jour === "sec" ? "text-white" : "")}>{s.ligne}</p>
      </div>
      {aside && <div className="ml-auto shrink-0">{aside}</div>}
    </div>
  );
}
