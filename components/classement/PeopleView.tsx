import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { PageHero } from "@/components/ui/Titles";
import { RankBadge } from "@/components/ui/RankBadge";
import { PlayerRow, type PlayerLite } from "@/components/classement/PlayerRow";
import { LinkSeg } from "@/components/classement/Seg";
import { CURRENT_DOMAIN } from "@/lib/domains";
import { rankFor } from "@/lib/ranks";

export type TopRow = { userId: string; name: string; elo: number; rank: number; mastery: number | null; isMe: boolean };

// Annuaire des joueurs (espace Classement), même langage que /classement :
// onglets Tous | Mes groupes, recherche, liste posée sur le papier et, à
// côté, le Top 10 en carte discrète. Composant de présentation (page serveur
// ou page d'aperçu).
export function PeopleView({
  rows,
  top,
  view,
  q,
  hasGroups,
}: {
  rows: PlayerLite[];
  top: TopRow[];
  view: "all" | "groups";
  q: string;
  /** je suis dans au moins un groupe */
  hasGroups: boolean;
}) {
  const qs = (v: string) => `/people?view=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="rl-wide flex flex-col gap-10 md:gap-12">
      <PageHero kicker="Classement" title="Joueurs" className="w-fit max-w-full" />

      <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
        <section className="flex min-w-0 flex-col gap-5 lg:col-span-8" aria-label="Annuaire des joueurs">
          <div className="flex flex-wrap items-center gap-3">
            <LinkSeg
              label="Quels joueurs"
              active={view}
              items={[
                { key: "all", label: "Tous", href: qs("all") },
                { key: "groups", label: "Mes groupes", href: qs("groups") },
              ]}
            />
            <form className="flex min-w-0 flex-[1_1_260px] gap-2" action="/people" method="get" role="search">
              <input type="hidden" name="view" value={view} />
              <label htmlFor="rl-people-q" className="sr-only">
                Chercher un joueur
              </label>
              <div className="relative min-w-0 flex-1">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
                <input id="rl-people-q" name="q" defaultValue={q} placeholder="Chercher un pseudo…" className="input pl-9" />
              </div>
              <button type="submit" className="btn btn-secondary shrink-0">
                Chercher
              </button>
            </form>
          </div>

          {rows.length === 0 ? (
            <div className="px-2.5 py-4">
              {view === "groups" && !hasGroups ? (
                <>
                  <p className="t-h3">Tu n&apos;es dans aucun groupe</p>
                  <Link href="/moi?onglet=reglages#reglages" className="ink-link mt-3 inline-block">
                    Créer ou rejoindre un groupe
                  </Link>
                </>
              ) : (
                <p className="t-h3">{q ? `Aucun joueur ne correspond à « ${q} »` : "Aucun joueur pour l'instant"}</p>
              )}
            </div>
          ) : (
            <ul className="-mt-1 flex flex-col gap-0.5">
              {rows.map((p) => (
                <PlayerRow key={p.id} p={p} />
              ))}
            </ul>
          )}
          {view === "all" && rows.length > 0 && <p className="t-micro mt-1 px-2.5">Les 200 premiers pseudos, par ordre alphabétique.</p>}
        </section>

        <aside className="card-quiet flex min-w-0 flex-col gap-3 p-5 lg:col-span-4" aria-label={`Top 10 ${CURRENT_DOMAIN.name}`}>
          <p className="t-eyebrow px-1">Top 10 · {CURRENT_DOMAIN.name}</p>
          {top.length === 0 ? (
            <p className="t-small px-1">Le classement se remplit au premier match.</p>
          ) : (
            <ol className="flex flex-col">
              {top.map((r) => {
                const rk = rankFor(r.elo, r.mastery, r.rank);
                return (
                  <li key={r.userId}>
                    <Link href={`/people/${r.userId}`} className={"rl-row flex items-center gap-3 rounded-[10px] px-1.5 py-1.5 " + (r.isMe ? "bg-surface" : "")}>
                      <span className="w-5 font-mono text-[12px] tabular-nums text-muted">{r.rank}</span>
                      <RankBadge tier={rk.tierIndex} size={22} glow={false} />
                      <span className={"min-w-0 flex-1 truncate text-[14px] " + (r.isMe ? "font-bold" : "font-medium")}>{r.isMe ? "Toi" : r.name}</span>
                      <span className="font-mono text-[13px] font-semibold tabular-nums">{r.elo}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
          <Link href="/classement" className="mt-1 inline-flex w-fit items-center gap-1.5 px-1 text-[13px] font-semibold text-muted hover:text-white">
            Classement complet <ArrowRight size={14} aria-hidden />
          </Link>
        </aside>
      </div>
    </div>
  );
}
