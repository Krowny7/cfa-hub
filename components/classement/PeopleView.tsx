import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { PageHero } from "@/components/ui/Titles";
import { RankBadge } from "@/components/ui/RankBadge";
import { PlayerRow, type PlayerLite } from "@/components/classement/PlayerRow";
import { LinkSeg } from "@/components/classement/Seg";
import { CURRENT_DOMAIN } from "@/lib/domains";
import { rankFor } from "@/lib/ranks";
import { VIDE } from "@/lib/voice";
import { CLASSEMENT, JOUEURS } from "@/lib/voice-z2a";
import { Avatar } from "@/components/classement/Avatar";
import { AmiBouton } from "@/components/profil/AmiBouton";
import type { AmiLite } from "@/lib/profil/donnees";

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
  demandes = null,
}: {
  rows: PlayerLite[];
  top: TopRow[];
  view: "all" | "groups" | "amis";
  q: string;
  /** je suis dans au moins un groupe */
  hasGroups: boolean;
  /** demandes d'ami reçues et envoyées (null : amis pas encore disponibles) */
  demandes?: { recues: AmiLite[]; envoyees: AmiLite[] } | null;
}) {
  const qs = (v: string) => `/people?view=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="rl-wide flex flex-col gap-10 md:gap-12">
      <PageHero kicker={JOUEURS.kicker} title={JOUEURS.titre} className="w-fit max-w-full" />

      <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
        <section className="flex min-w-0 flex-col gap-5 lg:col-span-8" aria-label="Annuaire des joueurs">
          <div className="flex flex-wrap items-center gap-3">
            <LinkSeg
              label={JOUEURS.filtre}
              active={view}
              items={[
                { key: "all", label: JOUEURS.tous, href: qs("all") },
                { key: "groups", label: JOUEURS.groupes, href: qs("groups") },
                { key: "amis", label: demandes?.recues.length ? `Mes amis · ${demandes.recues.length}` : "Mes amis", href: qs("amis") },
              ]}
            />
            <form className="flex min-w-0 flex-[1_1_260px] gap-2" action="/people" method="get" role="search">
              <input type="hidden" name="view" value={view} />
              <label htmlFor="rl-people-q" className="sr-only">
                {JOUEURS.chercher}
              </label>
              <div className="relative min-w-0 flex-1">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
                <input id="rl-people-q" name="q" defaultValue={q} placeholder={JOUEURS.placeholder} className="input pl-9" />
              </div>
              <button type="submit" className="btn btn-secondary shrink-0">
                {JOUEURS.bouton}
              </button>
            </form>
          </div>

          {view === "amis" && demandes && (demandes.recues.length > 0 || demandes.envoyees.length > 0) && (
            <div className="flex flex-col gap-2">
              {demandes.recues.length > 0 && <p className="t-eyebrow px-2.5">Demandes reçues</p>}
              {demandes.recues.map((a) => (
                <div key={a.id} className="card-quiet flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <Link href={`/people/${a.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar src={a.avatarUrl} name={a.name} size={34} userId={a.id} />
                    <span className="truncate text-[14.5px] font-semibold">{a.name}</span>
                    <span className="t-micro shrink-0">veut être ton ami</span>
                  </Link>
                  <AmiBouton autre={a.id} relation="recue" compact />
                </div>
              ))}
              {demandes.envoyees.length > 0 && <p className="t-eyebrow mt-2 px-2.5">Demandes envoyées</p>}
              {demandes.envoyees.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center gap-3 px-2.5 py-1.5">
                  <Link href={`/people/${a.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar src={a.avatarUrl} name={a.name} size={28} userId={a.id} />
                    <span className="truncate text-[14px] font-medium">{a.name}</span>
                  </Link>
                  <AmiBouton autre={a.id} relation="envoyee" compact />
                </div>
              ))}
            </div>
          )}

          {rows.length === 0 ? (
            <div className="px-2.5 py-4">
              {view === "amis" ? (
                <p className="t-h3">{demandes === null ? "Les amis arrivent bientôt." : q ? JOUEURS.aucun(q) : "Pas encore d'amis. Ouvre le profil d'un joueur et ajoute-le."}</p>
              ) : view === "groups" && !hasGroups ? (
                <>
                  <p className="t-h3">{JOUEURS.sansGroupe}</p>
                  <Link href="/moi?onglet=reglages#reglages" className="ink-link mt-3 inline-block">
                    {JOUEURS.sansGroupeLien}
                  </Link>
                </>
              ) : (
                <p className="t-h3">{q ? JOUEURS.aucun(q) : VIDE.adversaires}</p>
              )}
            </div>
          ) : (
            <ul className="-mt-1 flex flex-col gap-0.5">
              {rows.map((p) => (
                <PlayerRow key={p.id} p={p} presence={view === "amis"} />
              ))}
            </ul>
          )}
          {view === "all" && rows.length > 0 && <p className="t-micro mt-1 px-2.5">{JOUEURS.limite}</p>}
        </section>

        <aside className="card-quiet flex min-w-0 flex-col gap-3 p-5 lg:col-span-4" aria-label={`Top 10 ${CURRENT_DOMAIN.name}`}>
          <p className="t-eyebrow px-1">{JOUEURS.top(CURRENT_DOMAIN.name)}</p>
          {top.length === 0 ? (
            <p className="t-small px-1">{CLASSEMENT.vide}</p>
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
            {JOUEURS.complet} <ArrowRight size={14} aria-hidden />
          </Link>
        </aside>
      </div>
    </div>
  );
}
