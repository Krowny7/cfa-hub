import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import { RankBadge } from "@/components/ui/RankBadge";
import { Illustration } from "@/components/ui/Illustration";
import { PlayerRow, type PlayerLite } from "@/components/classement/PlayerRow";
import { LinkSeg } from "@/components/classement/Seg";
import { CURRENT_DOMAIN } from "@/lib/domains";
import { rankFor } from "@/lib/ranks";
import { VIDE } from "@/lib/voice";
import { CLASSEMENT, JOUEURS } from "@/lib/voice-z2a";
import { PJ } from "@/lib/voice-classement";
import { Avatar } from "@/components/classement/Avatar";
import { AmiBouton } from "@/components/profil/AmiBouton";
import { LienJoueur } from "@/components/profil/CarteJoueur";
import type { AmiLite } from "@/lib/profil/donnees";

export type TopRow = { userId: string; name: string; elo: number; rank: number; mastery: number | null; isMe: boolean };

// Annuaire des joueurs (espace Classement), refonte « L'annuaire » : la page
// reste un outil. Un héros pleine largeur (bandeau peint, nombre de joueurs,
// filtres Tous | Mes groupes | Mes amis, grand champ de recherche, les joueurs
// « à ta mesure » avec leur bouton de défi), puis la liste ; à droite le Top
// 10 sur l'encre. Composant de présentation (page serveur ou page d'aperçu).
export function PeopleView({
  rows,
  top,
  view,
  q,
  hasGroups,
  demandes = null,
  total = null,
  aTaMesure = [],
}: {
  rows: PlayerLite[];
  top: TopRow[];
  view: "all" | "groups" | "amis";
  q: string;
  /** je suis dans au moins un groupe */
  hasGroups: boolean;
  /** demandes d'ami reçues et envoyées (null : amis pas encore disponibles) */
  demandes?: { recues: AmiLite[]; envoyees: AmiLite[] } | null;
  /** joueurs au classement du domaine (null : inconnu, on compte la liste) */
  total?: number | null;
  /** les joueurs dont l'ELO est le plus proche du tien (hors toi) */
  aTaMesure?: PlayerLite[];
}) {
  const dom = CURRENT_DOMAIN.name;
  const qs = (v: string) => `/people?view=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const recues = view === "groups" ? [] : (demandes?.recues ?? []);
  const envoyees = view === "amis" ? (demandes?.envoyees ?? []) : [];
  const compte = view === "all" && !q ? (total ?? rows.length) : rows.length;
  const etiquette = q ? `Recherche · ${dom}` : view === "groups" ? `Mes groupes · ${dom}` : view === "amis" ? `Mes amis · ${dom}` : PJ.annuaire(dom);

  return (
    <div className="rl-wide rl-page">
      <div className="flex flex-col gap-7 md:gap-10">
        <header className="flex min-w-0 flex-col gap-3">
          <p className="t-small flex items-center gap-2 font-semibold">
            <Icone nom="classement" size={18} />
            <span>{PJ.kicker}</span>
          </p>
          <h1 className="t-hero rl-in m-0">{PJ.titre}</h1>
        </header>

        <section className="card-hero rl-in flex min-w-0 flex-col gap-5 overflow-hidden p-6 md:p-8" aria-label={JOUEURS.chercher}>
          <div className="-mx-6 -mt-6 h-[84px] overflow-hidden md:-mx-8 md:-mt-8 md:h-[112px]">
            <Illustration nom="joueurs-seigneurie" position="50% 60%" decorative />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <div className="flex min-w-0 flex-col gap-2">
              <p className="t-eyebrow">{etiquette}</p>
              <h2 className="font-brand m-0 text-[48px] leading-[0.95] md:text-[64px]">{PJ.joueurs(compte)}</h2>
            </div>
            <LinkSeg
              label={JOUEURS.filtre}
              active={view}
              items={[
                { key: "all", label: JOUEURS.tous, href: qs("all") },
                { key: "groups", label: JOUEURS.groupes, href: qs("groups") },
                { key: "amis", label: recues.length ? `Mes amis · ${recues.length}` : "Mes amis", href: qs("amis") },
              ]}
            />
          </div>
          <form className="flex w-full min-w-0 max-w-[640px] gap-2" action="/people" method="get" role="search">
            <input type="hidden" name="view" value={view} />
            <label htmlFor="rl-people-q" className="sr-only">
              {JOUEURS.chercher}
            </label>
            <div className="relative min-w-0 flex-1">
              <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
              <input id="rl-people-q" name="q" defaultValue={q} placeholder={PJ.placeholder} className="input h-[52px] pl-11 text-[16px]" />
            </div>
            <button type="submit" className="btn btn-primary rl-press h-[52px] shrink-0 px-5">
              {JOUEURS.bouton}
            </button>
          </form>
          {aTaMesure.length > 0 && !q && (
            <p className="t-micro m-0 flex flex-wrap items-center gap-x-1 gap-y-1">
              {PJ.aTaMesure} :{" "}
              {aTaMesure.map((p, i) => (
                <span key={p.id}>
                  {i > 0 && " · "}
                  <LienJoueur id={p.id} nom={p.name} className="font-semibold underline-offset-4 hover:underline">
                    {p.name}
                  </LienJoueur>{" "}
                  <span className="font-mono">{p.elo}</span>
                  <Link
                    href={`/duel?adversaire=${encodeURIComponent(p.id)}`}
                    aria-label={`Défier ${p.name}`}
                    title={`Défier ${p.name}`}
                    className="ml-1 inline-grid size-7 place-items-center rounded-[8px] align-middle text-muted hover:bg-surface-2 hover:text-white"
                  >
                    <Icone nom="duel" size={15} />
                  </Link>
                </span>
              ))}
            </p>
          )}
        </section>

        <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
          <section className="flex min-w-0 flex-col gap-3 lg:col-span-8" aria-label="Annuaire des joueurs">
            {recues.map((a) => (
              <div key={a.id} className="card-quiet flex flex-wrap items-center gap-3 px-3 py-2.5">
                <Link href={`/people/${a.id}`} className="flex min-w-[190px] flex-1 items-center gap-3">
                  <Avatar src={a.avatarUrl} name={a.name} size={34} userId={a.id} />
                  <span className="min-w-0">
                    <span className="block truncate text-[14.5px] font-semibold">{a.name}</span>
                    <span className="t-micro block">{PJ.veutEtreAmi}</span>
                  </span>
                </Link>
                <AmiBouton autre={a.id} relation="recue" compact />
              </div>
            ))}
            {envoyees.length > 0 && <p className="t-eyebrow mt-1 px-2.5">Demandes envoyées</p>}
            {envoyees.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 px-2.5 py-1.5">
                <Link href={`/people/${a.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar src={a.avatarUrl} name={a.name} size={28} userId={a.id} />
                  <span className="truncate text-[14px] font-medium">{a.name}</span>
                </Link>
                <AmiBouton autre={a.id} relation="envoyee" compact />
              </div>
            ))}

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
              <ul className="flex flex-col gap-0.5">
                {rows.map((p) => (
                  <PlayerRow key={p.id} p={p} presence={view === "amis"} />
                ))}
              </ul>
            )}
            {view === "all" && rows.length > 0 && <p className="t-micro mt-1 px-2.5">{JOUEURS.limite}</p>}
          </section>

          <aside className="card-ink flex min-w-0 flex-col gap-3 p-5 lg:col-span-4" aria-label={JOUEURS.top(dom)}>
            <p className="m-0 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] opacity-70">{JOUEURS.top(dom)}</p>
            {top.length === 0 ? (
              <p className="m-0 px-1 text-[14px] opacity-80">{CLASSEMENT.vide}</p>
            ) : (
              <ol className="m-0 flex list-none flex-col p-0">
                {top.map((r) => {
                  const rk = rankFor(r.elo, r.mastery, r.rank);
                  return (
                    <li key={r.userId}>
                      <LienJoueur id={r.userId} nom={r.name} className={"flex items-center gap-3 rounded-[10px] px-1.5 py-1.5 " + (r.isMe ? "bg-[rgba(255,255,255,.1)]" : "")}>
                        <span className="w-5 font-mono text-[12px] tabular-nums opacity-60">{r.rank}</span>
                        <RankBadge tier={rk.tierIndex} size={22} onDark />
                        <span className={"min-w-0 flex-1 truncate text-[14px] " + (r.isMe ? "font-bold" : "font-medium")}>{r.isMe ? "Toi" : r.name}</span>
                        <span className="font-mono text-[13px] font-semibold tabular-nums">{r.elo}</span>
                      </LienJoueur>
                    </li>
                  );
                })}
              </ol>
            )}
            <Link href="/classement" className="btn btn-on-ink rl-press mt-1 w-full">
              {JOUEURS.complet} <ArrowRight size={15} aria-hidden />
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
