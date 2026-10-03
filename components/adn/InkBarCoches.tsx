import { INK } from "@/components/ui/InkDefs";

/**
 * Coches de questions (Épure) : l'avancement d'une série question par
 * question. Un trait d'encre par bonne réponse, la croix du correcteur (stylo
 * rouge) par erreur, un trait de crayon pour ce qui reste. Remplace une barre
 * quand chaque question compte (quiz de fiche, session, plan du duel).
 *
 * Props :
 * - `items` : une entrée par question, dans l'ordre : true (juste),
 *   false (erreur), null (à venir)
 * - `height` : hauteur en px (défaut 24)
 * - `courante` : index de la question en cours (son trait de crayon est
 *   souligné), optionnel
 * - `label` : texte pour les lecteurs d'écran (sinon « 9 sur 15 · 2 erreurs »)
 *
 * Sans état : utilisable côté serveur. Les traits viennent d'InkDefs.
 */
export function InkBarCoches({
  items,
  height = 24,
  courante,
  label,
  className = "",
}: {
  items: (boolean | null)[];
  height?: number;
  courante?: number;
  label?: string;
  className?: string;
}) {
  const STEP = 17;
  const done = items.filter((x) => x !== null).length;
  const err = items.filter((x) => x === false).length;
  const w = items.length * STEP + 2;
  return (
    <svg
      viewBox={`-1 -2 ${w} 52`}
      height={height}
      width={(height * w) / 52}
      role="img"
      aria-label={label ?? `${done} sur ${items.length}${err ? ` · ${err} erreur${err > 1 ? "s" : ""}` : ""}`}
      className={"block max-w-full shrink-0 overflow-visible " + className}
      style={{ color: "var(--ink)" }}
    >
      {items.map((it, i) => {
        const x = i * STEP;
        if (it === true) return <use key={i} href={INK.tally[(i * 2 + 3) % 5]} x={x - 2} y={0} fill="currentColor" transform={`translate(${x + 5} 24) scale(0.95 0.92) translate(${-x - 5} -24)`} />;
        if (it === false)
          return (
            <svg key={i} x={x - 4} y={12} width={18} height={18} viewBox="0 0 14 14" overflow="visible">
              <use href={INK.cross} fill="var(--pen)" />
            </svg>
          );
        return (
          <path
            key={i}
            d={`M ${x + 5.4} ${courante === i ? 6 : 9} L ${x + 4.8} ${courante === i ? 44 : 41}`}
            fill="none"
            stroke={courante === i ? "var(--ink)" : "var(--pencil)"}
            strokeWidth={courante === i ? 1.6 : 1.1}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}
