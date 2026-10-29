import type { CSSProperties } from "react";
import { ChevronDown } from "lucide-react";
import { Section } from "@/components/outils/Gabarit";
import type { CalcCell, CalcCounts } from "@/lib/calc/counts";
import { CALC_LEVELS, type CalcTopic } from "@/lib/calc/types";
import { nombre } from "@/lib/voice";
import { CALC, COMPTE, NIVEAU, calculsRealises, nbCalculs, reussite } from "./voice";

/**
 * « Tes calculs » : le compte des calculs réalisés. Un résumé qui se lit d'un
 * coup d'œil (total, part de justes, un compte par niveau) et, à la demande,
 * le tableau croisé matières × niveaux : « N calculs · xx % » par case, une
 * teinte de fond selon la part de justes (vert dès 80 %, rouge sous 60 %, le
 * seuil du niveau tenu et celui des calculs fragiles du héros).
 *
 * Props : `counts` (lib/calc/counts → calcCounts), `noms` (nom court de chaque
 * matière), `local` (chiffres du navigateur, la base ne répond pas encore),
 * `ouvert` (tableau déplié au départ : aperçu).
 * Sans état : le repli est un <details> natif.
 */
export function TesCalculs({ counts, noms, local = false, ouvert = false }: { counts: CalcCounts; noms: Partial<Record<CalcTopic, string>>; local?: boolean; ouvert?: boolean }) {
  const { total, parNiveau, rows } = counts;
  return (
    <Section id="calc-compte" titre={COMPTE.titre} meta={local ? CALC.local : undefined}>
      <div className="card-quiet p-5 md:p-6">
        {total.n === 0 ? (
          <div>
            <p className="t-h3 m-0">{COMPTE.vide}</p>
            <p className="t-small m-0 mt-1.5">{COMPTE.videAide}</p>
          </div>
        ) : (
          <>
            <p className="t-h2 m-0 tabular-nums">
              {calculsRealises(total.n)}
              <span className="font-normal text-muted"> · {reussite(total.ok, total.n)} de réussite</span>
            </p>
            <ul className="m-0 mt-3 flex list-none flex-wrap items-baseline gap-x-2 gap-y-1 p-0 text-[14px]">
              {CALC_LEVELS.map((l, i) => (
                <li key={l} className="flex items-baseline gap-2">
                  {i > 0 && (
                    <span aria-hidden className="text-muted">
                      ·
                    </span>
                  )}
                  <span>
                    <span className="text-muted">{NIVEAU[l].label}</span> <span className="font-semibold tabular-nums">{nombre(parNiveau[l].n)}</span>
                  </span>
                </li>
              ))}
            </ul>

            <details className="group mt-5 border-t border-line pt-4" open={ouvert}>
              <summary className="flex cursor-pointer list-none items-center gap-2 text-[14px] font-semibold text-muted transition-colors hover:text-white [&::-webkit-details-marker]:hidden">
                {COMPTE.voirTableau}
                <ChevronDown size={16} aria-hidden className="transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="mt-4">
                {/* le tableau défile dans son cadre, pas la page ; focalisable pour défiler au clavier */}
                <div className="overflow-x-auto rounded-[12px] border border-line bg-surface" role="region" aria-label={COMPTE.legende} tabIndex={0}>
                  <table className="w-full min-w-[36rem] border-collapse text-[13.5px] tabular-nums">
                    <caption className="sr-only">{COMPTE.legende}</caption>
                    <thead>
                      <tr className="border-b border-line">
                        <th scope="col" className="sticky left-0 z-[1] bg-surface px-3.5 py-3 text-left text-[12.5px] font-semibold text-muted">
                          {COMPTE.matiere}
                        </th>
                        {CALC_LEVELS.map((l) => (
                          <th key={l} scope="col" className="px-3.5 py-3 text-right text-[12.5px] font-semibold text-muted">
                            {NIVEAU[l].label}
                          </th>
                        ))}
                        <th scope="col" className="border-l border-line px-3.5 py-3 text-right text-[12.5px] font-semibold text-muted">
                          {COMPTE.total}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.topic} className="border-t border-line first:border-t-0">
                          <th scope="row" className="sticky left-0 z-[1] whitespace-nowrap bg-surface px-3.5 py-2.5 text-left font-medium">
                            {noms[r.topic] ?? r.topic}
                          </th>
                          {CALC_LEVELS.map((l) => (
                            <Case key={l} c={r.parNiveau[l]} />
                          ))}
                          <Case c={r.total} total />
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-line-2 font-semibold">
                        <th scope="row" className="sticky left-0 z-[1] whitespace-nowrap bg-surface px-3.5 py-2.5 text-left">
                          {COMPTE.total}
                        </th>
                        {CALC_LEVELS.map((l) => (
                          <Case key={l} c={parNiveau[l]} />
                        ))}
                        <Case c={total} total />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="t-micro m-0 mt-2.5">{COMPTE.teinte}</p>
              </div>
            </details>
          </>
        )}
      </div>
    </Section>
  );
}

/** La teinte d'une case selon sa part de justes ; rien entre 60 et 79 %. */
function teinte(c: CalcCell): CSSProperties | undefined {
  if (c.n === 0) return undefined;
  const p = (c.ok / c.n) * 100;
  const ton = p >= 80 ? "var(--gain)" : p < 60 ? "var(--perte)" : null;
  return ton ? { background: `color-mix(in oklab, ${ton} 15%, transparent)` } : undefined;
}

function Case({ c, total = false }: { c: CalcCell; total?: boolean }) {
  const base = "px-3.5 py-2.5 text-right whitespace-nowrap" + (total ? " border-l border-line font-semibold" : "");
  if (c.n === 0) {
    return (
      <td className={base + " text-muted"}>
        <span aria-hidden>—</span>
        <span className="sr-only">{COMPTE.aucun}</span>
      </td>
    );
  }
  return (
    <td className={base} style={teinte(c)}>
      {nbCalculs(c.n)} · {reussite(c.ok, c.n)}
    </td>
  );
}
