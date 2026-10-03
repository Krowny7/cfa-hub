import { INK } from "@/components/ui/InkDefs";
import { LOGO_EXTENT } from "@/components/ink/geometry";
import { anneau as voixAnneau, nombre } from "@/lib/voice";
import { VIEW, axis, bristlesTo, brushTo, coteAlong, guides, opening, pencilTrack, ratioTrace } from "@/components/adn/AnneauDuJourGeo";

/**
 * L'anneau du jour (moment 1) : l'anneau du logo, qui se dessine avec toi.
 *
 * - Piste au crayon : le contour entier, ce qui reste à faire.
 * - Pinceau : une touche par question répondue, le long du trait du logo.
 * - Le bout qui reste est coté en rouge, « encore 14 » (règle 2 : il est
 *   toujours nommé).
 * - À l'objectif, l'anneau a exactement la forme du logo (74 %, ouvert) :
 *   journée tenue. L'ouverture accueille le sceau « TENU » (slot `sceau`,
 *   composant de KB) ; sans sceau, elle est cotée au crayon « demain ».
 * - Au-delà : « +6 en bonus », sans jamais se fermer.
 *
 * Deux tailles :
 * - `taille="carte"` (défaut) : tuile ou carte, `size` en px (176 par défaut) ;
 * - `taille="geste"` : le grand anneau de l'accueil (moment 1 de Geste), qui
 *   prend la largeur de son parent (560 px au plus) ; pinceau plus chargé,
 *   fibres sèches au bout, gouttes au départ, repères de construction.
 *
 * Sans état ni hook : utilisable côté serveur comme côté client. Quand
 * `repondues` change (client), le pinceau avance d'une touche (0,45 s). À
 * l'apparition, le trait se trace (le moteur de mouvement le fait attendre
 * s'il naît hors de l'écran) ; `animer={false}` le pose d'emblée.
 *
 * Props :
 * - `repondues` : questions répondues aujourd'hui (toutes sources)
 * - `objectif` : objectif du jour (40 aujourd'hui)
 * - `taille` : "carte" | "geste"
 * - `size` : largeur en px (carte seulement)
 * - `sceau` : nœud posé dans l'ouverture quand la journée est tenue
 * - `children` : remplace le contenu central (chiffre, « /40 »)
 * - `animer` : tracé à l'apparition (défaut true)
 * - `className`
 */
export function AnneauDuJour({
  repondues,
  objectif,
  taille = "carte",
  size = 176,
  sceau,
  children,
  animer = true,
  className = "",
}: {
  repondues: number;
  objectif: number;
  taille?: "carte" | "geste";
  size?: number;
  sceau?: React.ReactNode;
  children?: React.ReactNode;
  animer?: boolean;
  className?: string;
}) {
  const geste = taille === "geste";
  const n = Math.max(0, Math.round(repondues));
  const g = Math.max(1, Math.round(objectif));
  const v = voixAnneau(n, g);
  const tenu = n >= g;
  const t = ratioTrace(n, g);
  // part du trait du logo couverte, en % de son axe (pathLength 100)
  const p = tenu ? 100 : (t / LOGO_EXTENT) * 100;
  const mask = `adn-anneau-${geste ? "g" : "c"}-${n}-${g}`;

  // le bout qui reste : de la touche du jour à la fin du trait du logo
  const cote = !tenu && n > 0 ? coteAlong(t, LOGO_EXTENT, geste ? 21 : 25, geste ? 12 : 13) : null;
  // anneau vide : toute la longueur du trait du logo est à conquérir (le
  // libellé seul, la piste au crayon suffit à dire le chemin)
  const coteVide = n === 0 ? coteAlong(0.004, LOGO_EXTENT, geste ? 21 : 25, geste ? 2 : 6) : null;
  // journée tenue, sans sceau : l'ouverture est cotée « demain »
  const coteDemain = tenu && !sceau ? coteAlong(LOGO_EXTENT + 0.012, 0.992, 22, 12) : null;
  const o = opening(geste ? 12 : 10);
  const c = cote ?? coteVide;

  const box: React.CSSProperties = geste
    ? { width: "100%", maxWidth: 560, aspectRatio: "1 / 1" }
    : { width: size, height: size };

  return (
    <div
      role="img"
      aria-label={v.aria + (v.bonus ? `, ${v.bonus}` : "")}
      className={"relative shrink-0 select-none [container-type:inline-size] " + className}
      style={{ ...box, color: "var(--ink)" }}
    >
      <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.w}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <defs>
          <mask id={mask} maskUnits="userSpaceOnUse" x={-40} y={-40} width={320} height={320}>
            {p > 0 && (
              <path
                d={axis()}
                pathLength={100}
                fill="none"
                stroke="#fff"
                strokeWidth={46}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={(animer ? "rl-halo " : "") + "rl-touch"}
                style={{
                  strokeDasharray: `${p.toFixed(2)} 140`,
                  animationDelay: animer ? ".2s" : undefined,
                  animationDuration: animer ? (geste ? ".9s" : ".6s") : undefined,
                }}
              />
            )}
          </mask>
        </defs>

        {/* repères de construction, au crayon (Geste seulement) */}
        {geste && (
          <path className="rl-deco" d={guides()} fill="none" stroke="var(--pencil-2)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        )}

        {/* la piste : tout le chemin, au crayon */}
        <path d={pencilTrack(geste ? 2 : 1)} fill="none" stroke="var(--pencil)" strokeWidth={geste ? 1.1 : 1} strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={geste ? 0.9 : 1} />

        {/* l'encre : ce qui est tracé aujourd'hui */}
        {p > 0 && (
          <g mask={`url(#${mask})`}>
            {tenu ? (
              <>
                <use href={INK.logoBrush} fill="currentColor" />
                <use href={INK.logoBristles} fill="currentColor" />
              </>
            ) : (
              <>
                <path d={brushTo(t, geste, geste ? 260 : 160)} fill="currentColor" />
                {geste && <path d={bristlesTo(t)} fill="currentColor" />}
              </>
            )}
          </g>
        )}
        {/* la goutte du départ : au grand format dès la première touche, sinon à l'objectif */}
        {(tenu || (geste && n > 0)) && <use href={INK.logoSplat} fill="currentColor" className="rl-deco" />}

        {/* la cote du bout qui reste (stylo rouge), ou de l'ouverture (crayon) */}
        {cote && (
          <path
            d={cote.d}
            fill="none"
            stroke="var(--pen)"
            strokeOpacity={0.8}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            className={animer ? "rl-fade" : undefined}
            style={animer ? { animationDelay: geste ? "1s" : ".75s" } : undefined}
          />
        )}
        {coteDemain && (
          <path d={coteDemain.d} fill="none" stroke="var(--pencil)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        )}
      </svg>

      {/* libellé de la cote, en vrai texte (net à toutes les tailles) */}
      {c && v.reste && (
        <CoteLabel x={c.x} y={c.y} ax={c.ax} ay={c.ay} tone="pen" geste={geste} delay={animer ? (geste ? "1s" : ".75s") : undefined}>
          {v.reste}
        </CoteLabel>
      )}
      {coteDemain && (
        <CoteLabel x={coteDemain.x} y={coteDemain.y} ax={coteDemain.ax} ay={coteDemain.ay} tone="pencil" geste={geste}>
          demain
        </CoteLabel>
      )}

      {/* le sceau du jour, dans l'ouverture */}
      {tenu && sceau && (
        <div
          className="absolute grid place-items-center"
          style={{ left: `${o.x}%`, top: `${o.y}%`, width: geste ? "24%" : "30%", aspectRatio: "1 / 1", transform: "translate(-50%, -50%)" }}
        >
          {sceau}
        </div>
      )}

      {/* le centre : le chiffre du jour */}
      <div aria-hidden className="absolute inset-0 grid place-items-center text-center">
        {children ?? (
          <div className="flex flex-col items-center">
            {geste && <span className="t-eyebrow mb-[2cqw] text-[max(10px,2cqw)]">Anneau du jour</span>}
            <span className="flex items-baseline gap-[0.5cqw]">
              <span className={"t-num tabular-nums " + (geste ? "text-[16.5cqw]" : "text-[15.5cqw]")} style={n === 0 ? { color: "var(--ink-3)" } : undefined}>
                {nombre(n)}
              </span>
              <span className={"font-mono font-medium text-[color:var(--ink-3)] " + (geste ? "text-[4.4cqw]" : "text-[6.2cqw]")}>/{nombre(g)}</span>
            </span>
            {v.bonus ? (
              <span className={"mt-[1.4cqw] font-mono font-semibold " + (geste ? "text-[2.6cqw]" : "text-[max(10px,5.4cqw)]")}>{v.bonus}</span>
            ) : geste ? (
              <span className="mt-[1.2cqw] font-mono text-[max(11px,2.6cqw)] text-muted">
                {tenu ? "journée tenue" : n === 0 ? "aucun trait encore" : `trait${n > 1 ? "s" : ""} aujourd'hui`}
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function CoteLabel({
  x,
  y,
  ax,
  ay,
  tone,
  geste,
  delay,
  children,
}: {
  x: number;
  y: number;
  ax: -1 | 0 | 1;
  ay: -1 | 0 | 1;
  tone: "pen" | "pencil";
  geste: boolean;
  delay?: string;
  children: React.ReactNode;
}) {
  const tx = ax === 1 ? "0" : ax === -1 ? "-100%" : "-50%";
  const ty = ay === 1 ? "0" : ay === -1 ? "-100%" : "-50%";
  return (
    <span
      aria-hidden
      className={
        "absolute whitespace-nowrap font-mono font-semibold leading-none tracking-[0.01em] " +
        (geste ? "text-[max(12px,2.5cqw)] " : "text-[11.5px] ") +
        (delay ? "rl-fade " : "")
      }
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(${tx}, ${ty})`,
        color: tone === "pen" ? "var(--pen)" : "var(--ink-2)",
        animationDelay: delay,
      }}
    >
      {children}
    </span>
  );
}
