import { InkBarCoches } from "@/components/adn/InkBarCoches";
import { PARTIE } from "@/lib/voice-z2";

// Une copie de duel en coches (Épure, InkBarCoches du kit) : un trait d'encre
// par bonne réponse, la croix du correcteur (stylo rouge) par rature, un
// trait de crayon pour une question sans réponse. Chaque coche mène à sa
// correction (bouton posé par-dessus). `entoure` : la question décisive,
// entourée au stylo rouge (la main du correcteur, règle 3).
//
// Sans état ni hook : utilisable depuis un composant client comme serveur
// (onPick n'a de sens que côté client).

export type MarqueDuel = "ok" | "ko" | "none";

export function CopieCoches({
  marks,
  label,
  onPick,
  entoure = null,
  numbered = false,
  height = 26,
  className = "",
}: {
  marks: MarqueDuel[];
  /** nom accessible de la rangée (« Toi, question par question ») */
  label: string;
  /** une coche ouvre sa question */
  onPick?: (index: number) => void;
  /** index de la coche entourée (question décisive) */
  entoure?: number | null;
  /** numéros 1, 5, 10… sous les coches */
  numbered?: boolean;
  height?: number;
  className?: string;
}) {
  const items = marks.map((m) => (m === "ok" ? true : m === "ko" ? false : null));
  const ko = marks.filter((m) => m === "ko").length;
  const ok = marks.filter((m) => m === "ok").length;
  const summary = `${label} : ${ok} sur ${marks.length}${ko ? ` · ${ko} rature${ko > 1 ? "s" : ""}` : ""}`;
  const W = marks.length * 17 + 2;
  return (
    <div className={"min-w-0 " + className}>
      <div className="relative inline-block max-w-full align-top">
        <span aria-hidden={onPick ? true : undefined} className="block">
          <InkBarCoches items={items} height={height} label={summary} />
        </span>
        {onPick && (
          <ol aria-label={label} className="absolute inset-x-0 top-0 m-0 flex list-none p-0" style={{ height }}>
            {marks.map((m, i) => {
              const text = `Question ${i + 1} : ${PARTIE.marque(m)}${i === entoure ? `, ${PARTIE.decisiveMot.toLowerCase()}` : ""}`;
              return (
                <li key={i} className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onPick(i)}
                    aria-label={text}
                    title={text}
                    className="block h-full w-full rounded-[4px] transition-colors hover:bg-[color-mix(in_oklab,var(--ink)_7%,transparent)]"
                  />
                </li>
              );
            })}
          </ol>
        )}
        {entoure !== null && entoure >= 0 && entoure < marks.length && (
          <svg
            aria-hidden
            width={1}
            height={1}
            className="pointer-events-none absolute overflow-visible"
            style={{ left: `${((entoure * 17 + 6) / W) * 100}%`, top: height / 2 }}
          >
            <ellipse cx={0} cy={0} rx={height * 0.34} ry={height * 0.6} fill="none" stroke="var(--pen)" strokeWidth={1.6} transform="rotate(-14)" />
          </svg>
        )}
        {numbered && (
          <div aria-hidden className="mt-1 flex font-mono text-[10px] leading-none text-muted tabular-nums">
            {marks.map((_, i) => (
              <span key={i} className="min-w-0 flex-1 text-center">
                {i === 0 || (i + 1) % 5 === 0 ? i + 1 : ""}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
