"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, Shuffle, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { DuelHeading, DuelHowItWorks, InkWatermark, PlayerBadge, ReviewDuelRow, StakeBox } from "@/components/duel/parts";
import type { DuelSummary } from "@/lib/rating";
import {
  DUEL_QUESTIONS,
  DUEL_REVIEW_DAYS,
  activityLabel,
  createDuel,
  duelErrorMessage,
  randomStakes,
  respondDuel,
  reviewLeftLabel,
  searchDuelPlayers,
  signed,
  stakesAgainst,
  timeLeftLabel,
  type DuelPlayerCard,
  type DuelReviewEntry,
  type OpenDuel,
} from "@/lib/duels";

type Props = {
  me: { elo: number; gamesPlayed: number };
  suggestions: DuelPlayerCard[];
  /** joueur visé par /duel?adversaire=<id> */
  target: DuelPlayerCard | null;
  open: OpenDuel[];
  recent: DuelSummary[];
  /** duels terminés ces 14 derniers jours (liste « À revoir ») */
  reviewable?: DuelReviewEntry[];
  nowIso: string;
  /** aperçu : aucune requête, les boutons ne font rien */
  demo?: boolean;
};

const LISTED = 5;

// Lobby des duels : les deux façons de jouer (au hasard, défier quelqu'un)
// sont le point focal ; les défis reçus s'affichent en bandeau au-dessus
// seulement s'il y en a ; tes duels en cours et derniers duels viennent
// ensuite, et les règles sont repliées en bas.
export function DuelLobby({ me, suggestions, target, open, recent, reviewable = [], nowIso, demo = false }: Props) {
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
  // À revoir : terminés depuis moins de 14 jours ; les plus anciens restent
  // listés à part (leur revue reste ouverte).
  const toReview = (reviewable.length > 0 ? reviewable : recent.map(summaryToEntry)).filter(
    (d) => !!d.finishedAt && reviewLeftLabel(d.finishedAt, nowIso) !== null,
  );
  const reviewIds = new Set(toReview.map((d) => d.id));
  const older = recent.filter((d) => !reviewIds.has(d.id));
  const incoming = open.filter((d) => d.incoming && d.status === "pending");
  // Les défis reçus sont dans le bandeau : pas de doublon dans « En cours »
  const ongoing = open.filter((d) => !(d.incoming && d.status === "pending"));
  const openByOpponent = new Map(open.filter((d) => d.opponentId).map((d) => [d.opponentId as string, d.id]));
  const waitingRandom = open.find((d) => d.mode === "random" && d.status === "pending" && !d.opponentId);

  const listed: DuelPlayerCard[] = (() => {
    const base = results ?? suggestions;
    if (!target || results) return base;
    return [target, ...base.filter((p) => p.userId !== target.userId)];
  })().slice(0, LISTED);

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
    <div className="rl-page">
      <div className="flex flex-col gap-8 md:gap-10">
        <DuelHeading />

        {error && (
          <p role="alert" className="m-0 rounded-[12px] border border-line-2 bg-surface px-4 py-3 text-sm text-pen">
            {error}
          </p>
        )}

        {incoming.length > 0 && (
          <div className="grid gap-2.5" aria-label="Défis reçus">
            {incoming.map((d) => {
              const s = stakesAgainst(me.elo, me.gamesPlayed, d.opponentElo ?? me.elo);
              return (
                <div key={d.id} className="card flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 sm:px-5">
                  <PlayerBadge elo={d.opponentElo ?? me.elo} size={38} />
                  <div className="min-w-0 flex-[1_1_200px]">
                    <div className="truncate text-[15px] font-bold">{d.opponentName ?? "Un joueur"} te défie</div>
                    <div className="t-micro truncate">
                      {d.opponentElo ?? "—"} ELO · <span className="font-mono">{signed(s.win)} / {signed(s.loss)}</span> · expire dans{" "}
                      {timeLeftLabel(d.expiresAt, nowIso)}
                    </div>
                  </div>
                  <div className="ml-auto flex gap-2">
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
          <section className="card-ink rl-in flex min-h-[340px] min-w-0 flex-col gap-5 p-6 md:p-8" aria-labelledby="rl-duel-random">
            <InkWatermark />
            <div className="relative flex items-center gap-2.5">
              <Shuffle size={22} aria-hidden />
              <h2 id="rl-duel-random" className="m-0 text-[26px] font-extrabold tracking-[-0.025em]">
                Au hasard
              </h2>
            </div>
            <p className="relative m-0 max-w-[440px] text-[15px] leading-normal text-[rgba(255,255,255,.68)]">
              Un joueur de ton niveau, les mêmes questions. Personne en vue{" "}? Tu joues tout de suite.
            </p>
            <div className="relative grid grid-cols-3 gap-2">
              <StakeBox label="Si tu gagnes" value={`${signed(stakes.win.lo)} à ${signed(stakes.win.hi)}`} />
              <StakeBox label="Match nul" value={`${signed(stakes.draw.lo)} à ${signed(stakes.draw.hi)}`} />
              <StakeBox label="Si tu perds" value={`${signed(stakes.loss.lo)} à ${signed(stakes.loss.hi)}`} />
            </div>
            <div className="relative mt-auto flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={launchRandom}
                disabled={busy === "random"}
                className="btn btn-lg btn-on-ink"
              >
                {busy === "random" ? "Recherche…" : waitingRandom ? "Reprendre mon duel" : "Lancer la recherche"}
                <ArrowRight size={16} aria-hidden />
              </button>
              {waitingRandom && (
                <span className="text-[12.5px] text-[rgba(255,255,255,.58)]">
                  {waitingRandom.myFinished ? "copie rendue · on cherche ton adversaire" : "en attente d'un adversaire"}
                </span>
              )}
            </div>
          </section>

          {/* Défier quelqu'un */}
          <section id="defier" className="card flex min-w-0 scroll-mt-24 flex-col gap-4 p-6 md:p-8" aria-labelledby="rl-duel-challenge">
            <div className="flex items-center gap-2.5">
              <Swords size={22} aria-hidden />
              <h2 id="rl-duel-challenge" className="m-0 text-[26px] font-extrabold tracking-[-0.025em]">
                Défier quelqu&apos;un
              </h2>
            </div>
            <label className="flex h-[44px] items-center gap-2.5 rounded-[12px] border border-line-2 bg-black px-3.5 text-muted focus-within:border-white">
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
              <ul className="-mx-2 m-0 flex list-none flex-col gap-0.5 p-0">
                {listed.map((p) => {
                  const s = stakesAgainst(me.elo, me.gamesPlayed, p.elo);
                  const isTarget = !!target && target.userId === p.userId;
                  const existing = openByOpponent.get(p.userId);
                  const activity = isTarget && !p.lastActiveAt ? "défi prêt" : activityLabel(p.lastActiveAt, nowIso);
                  return (
                    <li
                      key={p.userId}
                      className={"rl-row grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[12px] px-2 py-2 sm:grid-cols-[36px_minmax(0,1fr)_auto_auto] " + (isTarget ? "bg-surface-2" : "")}
                    >
                      <PlayerBadge elo={p.elo} size={36} />
                      <div className="min-w-0">
                        <div className="truncate text-[14.5px] font-semibold">{p.username ?? "Joueur"}</div>
                        <div className="t-micro truncate">
                          {p.elo} ELO<span className="hidden sm:inline"> · {activity}</span>
                          <span className="font-mono sm:hidden">
                            {" "}
                            · {signed(s.win)} / {signed(s.loss)}
                          </span>
                        </div>
                      </div>
                      <span className="hidden font-mono text-[12px] tabular-nums text-muted sm:inline" title="Enjeu : si tu gagnes / si tu perds">
                        {signed(s.win)} / {signed(s.loss)}
                      </span>
                      {existing ? (
                        <Link href={`/duel/${existing}`} className="btn btn-sm btn-secondary">
                          Voir
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className={"btn btn-sm " + (isTarget && incoming.length === 0 ? "btn-primary" : "btn-secondary")}
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
              <p className="t-small m-0 py-4">
                {searching
                  ? "Recherche…"
                  : results
                    ? "Aucun joueur ne correspond. Essaie son pseudo exact ou son e-mail."
                    : "Pas encore d'autre joueur à défier — invite un ami à s'inscrire."}
              </p>
            )}
            {!results && listed.length > 0 && (
              <Link href="/people" className="mt-auto inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-white">
                Tous les joueurs <ArrowRight size={14} aria-hidden />
              </Link>
            )}
          </section>
        </div>
      </div>

      <section className="flex flex-col gap-6" aria-labelledby="rl-duel-mine">
        <h2 id="rl-duel-mine" className="t-h2">
          Tes duels
        </h2>
        {ongoing.length === 0 && recent.length === 0 && toReview.length === 0 ? (
          <p className="t-small">Pas encore de duel. Lance le premier : au hasard ou contre quelqu&apos;un.</p>
        ) : (
          <div className="grid items-start gap-10 md:grid-cols-2 md:gap-14">
            <div className="flex min-w-0 flex-col gap-2">
              <p className="t-eyebrow px-2">
                En cours{ongoing.length > 0 && <span className="font-mono font-normal"> · {ongoing.length}</span>}
              </p>
              {ongoing.length === 0 ? (
                <p className="t-small px-2">Aucun duel en cours.</p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                  {ongoing.map((d) => (
                    <OpenDuelRow key={d.id} d={d} me={me} nowIso={nowIso} />
                  ))}
                </ul>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-2" aria-labelledby="rl-duel-review">
              <p id="rl-duel-review" className="t-eyebrow flex items-baseline justify-between gap-3 px-2">
                <span>
                  À revoir{toReview.length > 0 && <span className="font-mono font-normal"> · {toReview.length}</span>}
                </span>
                <span className="font-normal normal-case tracking-normal">{DUEL_REVIEW_DAYS} jours après chaque duel</span>
              </p>
              {toReview.length === 0 ? (
                <p className="t-small px-2">
                  {recent.length === 0 ? "Pas encore de duel terminé." : `Aucun duel ces ${DUEL_REVIEW_DAYS} derniers jours.`} Chaque duel terminé
                  arrive ici, avec ses questions corrigées et « Copier pour l&apos;IA ».
                </p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                  {toReview.map((d) => (
                    <ReviewDuelRow
                      key={d.id}
                      id={d.id}
                      name={d.opponentName ?? "Un joueur"}
                      won={d.won}
                      myScore={d.myScore}
                      theirScore={d.theirScore}
                      errors={d.myScore !== null ? Math.max(0, d.total - d.myScore) : null}
                      left={reviewLeftLabel(d.finishedAt, nowIso)}
                    />
                  ))}
                </ul>
              )}

              {older.length > 0 && (
                <>
                  <p className="t-eyebrow mt-5 px-2">Plus anciens</p>
                  <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                  {older.map((d) => {
                    const label = d.won === true ? "Victoire" : d.won === false ? "Défaite" : "Nul";
                    return (
                      <li key={d.id}>
                        <Link href={`/duel/${d.id}`} className="rl-row grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[12px] px-2 py-2.5">
                          <span className="min-w-0">
                            <span className="block truncate text-[14.5px] font-semibold">
                              {label} <span className="font-normal text-muted">contre {d.opponentName ?? "un joueur"}</span>
                            </span>
                            <span className="t-micro block">
                              {d.finishedAt ? new Date(d.finishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }) : ""}
                            </span>
                          </span>
                          <span className="font-mono text-[13px] tabular-nums text-muted">
                            {d.myScore ?? 0} – {d.theirScore ?? 0}
                          </span>
                          <span
                            className={
                              "min-w-[40px] rounded-[8px] px-2 py-0.5 text-center font-mono text-[12px] font-semibold tabular-nums " +
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
                </>
              )}
            </div>
          </div>
        )}
      </section>

      <DuelHowItWorks />
    </div>
  );
}

/** Repli si la liste « À revoir » n'a pas pu être lue : les derniers duels suffisent. */
function summaryToEntry(d: DuelSummary): DuelReviewEntry {
  return {
    id: d.id,
    opponentId: d.opponentId,
    opponentName: d.opponentName,
    myScore: d.myScore,
    theirScore: d.theirScore,
    total: DUEL_QUESTIONS,
    myDelta: d.myDelta,
    won: d.won,
    finishedAt: d.finishedAt ?? "",
  };
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
    <li className="rl-row grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[12px] px-2 py-2">
      <PlayerBadge elo={d.opponentElo ?? me.elo} size={36} gray={!d.opponentId} />
      <div className="min-w-0">
        <div className="truncate text-[14.5px] font-semibold">{title}</div>
        <div className="t-micro truncate">
          {sub}
          {s && (
            <span className="hidden font-mono sm:inline">
              {" "}
              · {signed(s.win)} / {signed(s.loss)}
            </span>
          )}
        </div>
      </div>
      <Link href={`/duel/${d.id}`} className={"btn btn-sm " + (urgent ? "btn-primary" : "btn-secondary")}>
        {action}
      </Link>
    </li>
  );
}
