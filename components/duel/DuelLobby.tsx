"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, Shuffle, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { SectionTitle } from "@/components/ui/Titles";
import { DuelHeading, DuelHowItWorks, InkWatermark, PlayerBadge, StakeBox } from "@/components/duel/parts";
import type { DuelSummary } from "@/lib/rating";
import {
  activityLabel,
  createDuel,
  duelErrorMessage,
  randomStakes,
  respondDuel,
  searchDuelPlayers,
  signed,
  stakesAgainst,
  timeLeftLabel,
  type DuelPlayerCard,
  type OpenDuel,
} from "@/lib/duels";

type Props = {
  me: { elo: number; gamesPlayed: number };
  suggestions: DuelPlayerCard[];
  /** joueur visé par /duel?adversaire=<id> */
  target: DuelPlayerCard | null;
  open: OpenDuel[];
  recent: DuelSummary[];
  nowIso: string;
  /** aperçu : aucune requête, les boutons ne font rien */
  demo?: boolean;
};

// Lobby des duels (maquette V2-Duel-lobby) : au hasard à gauche, défier
// quelqu'un à droite, puis duels en cours et derniers duels.
export function DuelLobby({ me, suggestions, target, open, recent, nowIso, demo = false }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => (demo ? null : createClient()), [demo]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DuelPlayerCard[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Recherche avec un léger délai, pour ne pas interroger à chaque lettre
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      if (!supabase) {
        setResults(suggestions.filter((s) => (s.username ?? "").toLowerCase().includes(q.toLowerCase())));
      } else {
        setResults(await searchDuelPlayers(supabase, q));
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, supabase, suggestions]);

  const stakes = randomStakes(me.elo, me.gamesPlayed);
  const incoming = open.filter((d) => d.incoming && d.status === "pending");
  const openByOpponent = new Map(open.filter((d) => d.opponentId).map((d) => [d.opponentId as string, d.id]));
  const waitingRandom = open.find((d) => d.mode === "random" && d.status === "pending" && !d.opponentId);

  const listed: DuelPlayerCard[] = (() => {
    const base = results ?? suggestions;
    if (!target || results) return base;
    return [target, ...base.filter((p) => p.userId !== target.userId)];
  })().slice(0, 6);

  async function run(key: string, action: () => Promise<void>) {
    if (demo) {
      setError("Aperçu : les boutons ne lancent rien ici.");
      return;
    }
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(duelErrorMessage(e));
      setBusy(null);
    }
  }

  const launchRandom = () =>
    run("random", async () => {
      const r = await createDuel(supabase!, null);
      router.push(`/duel/${r.id}`);
    });

  const challenge = (userId: string) =>
    run(userId, async () => {
      const r = await createDuel(supabase!, userId);
      router.push(`/duel/${r.id}`);
    });

  const respond = (duelId: string, accept: boolean) =>
    run(duelId, async () => {
      await respondDuel(supabase!, duelId, accept);
      if (accept) router.push(`/duel/${duelId}`);
      else {
        setBusy(null);
        router.refresh();
      }
    });

  return (
    <div className="grid gap-8 md:gap-10">
      <DuelHeading />

      {error && (
        <p role="alert" className="m-0 rounded-[12px] border border-line-2 bg-surface px-4 py-3 text-sm text-pen">
          {error}
        </p>
      )}

      {incoming.length > 0 && (
        <div className="grid gap-2.5">
          {incoming.map((d, i) => {
            const s = stakesAgainst(me.elo, me.gamesPlayed, d.opponentElo ?? me.elo);
            return (
              <div key={d.id} className="card rl-in flex flex-wrap items-center gap-3 p-4" style={{ animationDelay: `${i * 0.06}s` }}>
                <PlayerBadge elo={d.opponentElo ?? me.elo} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold">{d.opponentName ?? "Un joueur"} te défie</div>
                  <div className="text-[13px] text-muted">
                    {d.opponentElo ?? "—"} ELO · enjeu <span className="font-mono tabular-nums">{signed(s.win)} / {signed(s.loss)}</span> · expire
                    dans {timeLeftLabel(d.expiresAt, nowIso)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-ghost" disabled={busy === d.id} onClick={() => respond(d.id, false)}>
                    Refuser
                  </button>
                  <button type="button" className="btn btn-primary" disabled={busy === d.id} onClick={() => respond(d.id, true)}>
                    Accepter <ArrowRight size={16} aria-hidden />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-[18px] md:grid-cols-2">
        {/* Au hasard */}
        <section className="card-ink rl-lift rl-in flex min-h-[360px] min-w-0 flex-col gap-4 p-6">
          <InkWatermark />
          <div className="relative flex items-center gap-2.5">
            <Shuffle size={24} aria-hidden />
            <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.02em]">Au hasard</h2>
          </div>
          <p className="relative m-0 text-[15px] leading-normal text-[rgba(255,255,255,.7)]">
            On te met face au joueur de ton niveau qui cherche aussi un duel. Personne en vue ? Tu joues tout de suite : le
            prochain à chercher passera les mêmes questions, sous 48 h.
          </p>
          <div className="relative grid grid-cols-3 gap-2.5">
            <StakeBox label="Si tu gagnes" value={`${signed(stakes.win.lo)} à ${signed(stakes.win.hi)}`} />
            <StakeBox label="Match nul" value={`${signed(stakes.draw.lo)} à ${signed(stakes.draw.hi)}`} />
            <StakeBox label="Si tu perds" value={`${signed(stakes.loss.lo)} à ${signed(stakes.loss.hi)}`} />
          </div>
          {waitingRandom && (
            <p className="relative m-0 text-[13px] text-[rgba(255,255,255,.65)]">
              Ton duel au hasard attend encore un adversaire{waitingRandom.myFinished ? " — ta copie est rendue." : "."}
            </p>
          )}
          <div className="relative mt-auto">
            <button
              type="button"
              onClick={launchRandom}
              disabled={busy === "random"}
              className="rl-press inline-flex h-12 items-center gap-2 rounded-[12px] bg-[#fff] px-[22px] text-[15px] font-bold text-[#111] disabled:opacity-60"
            >
              {busy === "random" ? "Recherche…" : waitingRandom ? "Reprendre mon duel" : "Lancer la recherche"}
              <ArrowRight size={16} aria-hidden />
            </button>
          </div>
        </section>

        {/* Défier quelqu'un */}
        <section className="card rl-lift rl-in flex min-w-0 flex-col gap-4 p-[22px]" style={{ animationDelay: ".08s" }}>
          <div className="flex items-center gap-2.5">
            <Swords size={24} aria-hidden />
            <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.02em]">Défier quelqu&apos;un</h2>
          </div>
          <label className="flex h-[46px] items-center gap-2.5 rounded-[12px] border border-line-2 bg-black px-3.5 text-muted">
            <Search size={16} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pseudo ou e-mail d'un joueur"
              aria-label="Chercher un joueur"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-white outline-none"
            />
          </label>

          {listed.length > 0 ? (
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {listed.map((p) => {
                const s = stakesAgainst(me.elo, me.gamesPlayed, p.elo);
                const isTarget = !!target && target.userId === p.userId;
                const existing = openByOpponent.get(p.userId);
                const meta = `${p.elo} ELO · ${isTarget && !p.lastActiveAt ? "défi prêt" : activityLabel(p.lastActiveAt, nowIso)}`;
                return (
                  <li
                    key={p.userId}
                    className={
                      "rl-row grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-[12px] px-2.5 py-2 sm:grid-cols-[40px_minmax(0,1fr)_auto_auto] " +
                      (isTarget ? "bg-surface-2" : "")
                    }
                  >
                    <PlayerBadge elo={p.elo} size={40} />
                    <div className="min-w-0">
                      <div className="truncate text-[14.5px] font-bold">{p.username ?? "Joueur"}</div>
                      <div className="truncate text-[12px] text-muted">
                        {meta}
                        <span className="font-mono sm:hidden">
                          {" "}
                          · {signed(s.win)} / {signed(s.loss)}
                        </span>
                      </div>
                    </div>
                    <span className="hidden font-mono text-[12px] tabular-nums text-muted sm:inline">
                      {signed(s.win)} / {signed(s.loss)}
                    </span>
                    {existing ? (
                      <Link href={`/duel/${existing}`} className="btn btn-secondary">
                        Voir
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className={isTarget ? "btn btn-primary" : "btn btn-secondary"}
                        disabled={busy === p.userId}
                        onClick={() => challenge(p.userId)}
                        aria-label={`Défier ${p.username ?? "ce joueur"}`}
                      >
                        {busy === p.userId ? "…" : "Défier"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="m-0 rounded-[12px] bg-surface-2 px-4 py-5 text-center text-sm text-muted">
              {searching
                ? "Recherche…"
                : results
                  ? "Aucun joueur ne correspond. Essaie son pseudo exact ou son e-mail."
                  : "Pas encore d'autre joueur à défier — invite un ami à s'inscrire."}
            </p>
          )}
        </section>
      </div>

      <div className="grid gap-[18px] md:grid-cols-2">
        <section className="card flex min-w-0 flex-col gap-3 p-[22px]">
          <SectionTitle title="En cours" sub={open.length ? `${open.length} duel${open.length > 1 ? "s" : ""}` : undefined} />
          {open.length === 0 ? (
            <p className="m-0 text-sm text-muted">Aucun duel en cours — lance le premier.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {open.map((d) => (
                <OpenDuelRow key={d.id} d={d} me={me} nowIso={nowIso} />
              ))}
            </ul>
          )}
        </section>

        <section className="card flex min-w-0 flex-col gap-3 p-[22px]">
          <SectionTitle title="Derniers duels" />
          {recent.length === 0 ? (
            <p className="m-0 text-sm text-muted">Pas encore de duel terminé — lance le premier.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {recent.map((d) => {
                const label = d.won === true ? "Victoire" : d.won === false ? "Défaite" : "Nul";
                return (
                  <li key={d.id}>
                    <Link href={`/duel/${d.id}`} className="rl-row grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[12px] px-2.5 py-2">
                      <span className="min-w-0">
                        <span className="block truncate text-[14.5px] font-bold">
                          {label} <span className="font-medium text-muted">contre {d.opponentName ?? "un joueur"}</span>
                        </span>
                        <span className="block text-[12px] text-muted">
                          {d.finishedAt ? new Date(d.finishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }) : ""}
                        </span>
                      </span>
                      <span className="font-mono text-[13px] tabular-nums">
                        {d.myScore ?? 0} – {d.theirScore ?? 0}
                      </span>
                      <span
                        className={
                          "rounded-[8px] px-2 py-0.5 font-mono text-[12px] font-semibold tabular-nums " +
                          ((d.myDelta ?? 0) > 0 ? "bg-white text-black" : "bg-surface-2")
                        }
                      >
                        {signed(d.myDelta ?? 0)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <DuelHowItWorks />
    </div>
  );
}

function OpenDuelRow({ d, me, nowIso }: { d: OpenDuel; me: { elo: number; gamesPlayed: number }; nowIso: string }) {
  const name = d.opponentName ?? "un joueur";
  let title: string;
  let sub: string;
  let action = d.myFinished ? "Voir" : "Jouer";
  if (d.status === "pending" && d.incoming) {
    title = `${name} te défie`;
    sub = `à accepter · expire dans ${timeLeftLabel(d.expiresAt, nowIso)}`;
    action = "Voir";
  } else if (d.status === "pending" && !d.opponentId) {
    title = "Duel au hasard";
    sub = d.myFinished ? "copie rendue · on cherche ton adversaire" : "en attente d'un adversaire · tu peux déjà jouer";
  } else if (d.status === "pending") {
    title = `Défi envoyé à ${name}`;
    sub = d.myFinished ? "copie rendue · en attente de sa réponse" : "pas encore accepté · tu peux déjà jouer";
  } else {
    title = `Contre ${name}`;
    sub = d.myFinished
      ? `copie rendue · ${d.theirFinished ? "résultat imminent" : d.theirStarted ? "il joue" : "pas encore joué"}`
      : `à toi de jouer · expire dans ${timeLeftLabel(d.expiresAt, nowIso)}`;
  }
  const urgent = action === "Jouer" && d.status === "active";
  const s = d.opponentElo !== null ? stakesAgainst(me.elo, me.gamesPlayed, d.opponentElo) : null;
  return (
    <li className="rl-row grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-[12px] px-2.5 py-2">
      <PlayerBadge elo={d.opponentElo ?? me.elo} size={40} gray={!d.opponentId} />
      <div className="min-w-0">
        <div className="truncate text-[14.5px] font-bold">{title}</div>
        <div className="truncate text-[12px] text-muted">
          {sub}
          {s && (
            <span className="font-mono">
              {" "}
              · {signed(s.win)} / {signed(s.loss)}
            </span>
          )}
        </div>
      </div>
      <Link href={`/duel/${d.id}`} className={urgent ? "btn btn-primary" : "btn btn-secondary"}>
        {action}
      </Link>
    </li>
  );
}
