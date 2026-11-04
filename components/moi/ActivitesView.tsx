import Link from "next/link";
import { FilMoi } from "@/components/moi/Briques";
import type { Activite } from "@/lib/activites";
import { SOURCE_LABELS } from "@/lib/answer-stats";
import { ACTIVITES } from "@/lib/voice-moi";

// Moi › Activités (?onglet=activites) : tes séances, de la plus récente à la plus
// ancienne, avec leur score et le lien vers ta copie quand elle se relit. Composant
// serveur, sans état.

export function ActivitesView({ activites }: { activites: Activite[] }) {
  return (
    <div className="rl-wide rl-page flex flex-col gap-5">
      <FilMoi />
      <div className="grid gap-1">
        <h1 className="t-h1 m-0">{ACTIVITES.titre}</h1>
        <p className="t-small m-0">{ACTIVITES.sous}</p>
      </div>
      {activites.length === 0 ? (
        <p className="card-quiet m-0 p-6 text-[14px]">{ACTIVITES.vide}</p>
      ) : (
        <ul className="card-quiet m-0 grid list-none divide-y divide-[var(--pencil-2)] p-0">
          {activites.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-[14px] md:px-5">
              <span className="w-[64px] shrink-0 font-mono text-[12.5px] text-[var(--ink-2)]">{a.date}</span>
              <span className="min-w-0 flex-1">
                <b className="font-semibold">{a.label}</b>
                <span className="text-[var(--ink-2)]"> · {SOURCE_LABELS[a.source]}</span>
              </span>
              <span className="font-mono text-[13px] tabular-nums">
                {a.ok}/{a.n}
                {a.n > 0 && <span className="text-[var(--ink-2)]"> · {Math.round((100 * a.ok) / a.n)} %</span>}
              </span>
              {a.href ? (
                <Link href={a.href} className="w-[92px] text-right text-[13px] font-semibold underline underline-offset-4">
                  {ACTIVITES.voir}
                </Link>
              ) : (
                <span className="w-[92px]" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
