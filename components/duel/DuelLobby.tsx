"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import { VIDE } from "@/lib/voice";
import { CLASSEMENT, PARTIE, motIssue } from "@/lib/voice-z2";
import { createClient } from "@/lib/supabase/browser";
import { DuelHeading, DuelHowItWorks, PlayerBadge, ReviewDuelRow } from "@/components/duel/parts";
import { HeroEpreuve, ListePodium, RangeeLieu } from "@/components/epreuves/Briques";
import { BandeEncre, RangeeLiens } from "@/components/ui/BandeEncre";
import { CarteLieu } from "@/components/ui/CarteLieu";
import { Illustration } from "@/components/ui/Illustration";
import { Medaillon, Sceau, TuileCalme } from "@/components/ui/Tuiles";
import { rankFor } from "@/lib/ranks";
import { LICE } from "@/lib/voice-epreuves";
import type { DuelSummary } from "@/lib/rating";
import {
  DUEL_MINUTES,
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
import { PresenceText } from "@/components/presence/Presence";
import { LienJoueur } from "@/components/profil/CarteJoueur";
import { PctDuel } from "@/components/adn/PctScore";

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
  /** copies rendues aux 30 du jour aujourd'hui (ligne de la bande vers le défi), null si inconnu */
  defiJoueurs?: number | null;
  /** aperçu : aucune requête, les boutons ne font rien */
  demo?: boolean;
};

const LISTED = 4;

// Lobby des duels : les deux façons de jouer (au hasard, défier quelqu'un)
// sont le point focal ; les défis reçus s'affichent en bandeau au-dessus
// seulement s'il y en a ; tes duels en cours et derniers duels viennent
// ensuite, et les règles sont repliées en bas.
export function DuelLobby({ me, suggestions, target, open, recent, reviewable = [], nowIso, defiJoueurs = null, demo = false }: Props) {
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

  // La Lice : le défi reçu (ou à défaut le duel à jouer) fait le héros ; la
  // carte « lieu » lance le duel au hasard ; les autres duels vont à droite.
  const premier = incoming[0] ?? null;
  const aJouer = premier ? null : (ongoing.find((d) => d.status === "active" && !d.myFinished) ?? null);
  const autres = [...incoming.slice(1), ...ongoing.filter((d) => d !== aJouer)];
  const enjeuHasard = LICE.enjeuHasard(`${signed(stakes.win.lo)} à ${signed(stakes.win.hi)}`, `${signed(stakes.loss.hi)} à ${signed(stakes.loss.lo)}`);
  const imageLice = <Illustration nom="duel-lice" position="48% 55%" />;
  const net = recent.length > 0 ? recent.reduce((s, d) => s + (d.myDelta ?? 0), 0) : null;
  const autresListe =
    autres.length > 0 ? (
      <ListePodium
        titre={LICE.autres}
        items={autres.slice(0, 4).map((d) => ({
          nom: d.opponentId ? (d.opponentName ?? "Un joueur") : "Au hasard",
          note: sousDuel(d, nowIso),
          href: `/duel/${d.id}`,
        }))}
      />
    ) : (
      <div className="flex min-w-0 flex-col gap-2">
        <p className="t-eyebrow m-0">{LICE.autres}</p>
        <p className="t-small m-0">{LICE.autresVide}</p>
      </div>
    );
  const stakesPremier = premier ? stakesAgainst(me.elo, me.gamesPlayed, premier.opponentElo ?? me.elo) : null;

  return (
    <div className="rl-page">
      <div className="flex flex-col gap-7 md:gap-10">
        <DuelHeading />

        {error && (
          <p role="alert" className="m-0 rounded-[12px] border border-line-2 bg-surface px-4 py-3 text-sm text-pen">
            {error}
          </p>
        )}

        {/* téléphone : l'action urgente passe avant la Lice, en une ligne */}
        {premier && stakesPremier && (
          <Link href="#duel-recu" className="card-quiet rl-in flex min-w-0 items-center gap-3 px-4 py-3 lg:hidden">
            <Medaillon nom="duel-echecs" taille={40} position="50% 45%" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">{LICE.teDefie(premier.opponentName ?? "Un joueur")}</span>
              <span className="t-micro block truncate">
                expire dans {timeLeftLabel(premier.expiresAt, nowIso)} · <span className="font-mono">{signed(stakesPremier.win)} / {signed(stakesPremier.loss)}</span>
              </span>
            </span>
            <span className="ink-link shrink-0 text-[14px]">{LICE.repondre}</span>
          </Link>
        )}

        <div className="flex flex-col gap-4 md:gap-[18px]">
          <RangeeLieu
            droite={
              <CarteLieu
                visuel={imageLice}
                vignette={imageLice}
                marque={
                  <Sceau>
                    <Icone nom="duel" size={18} />
                  </Sceau>
                }
                nom={LICE.nom}
                sousTitre={LICE.sousTitre}
                etat={
                  <>
                    {LICE.etat(DUEL_QUESTIONS, DUEL_MINUTES, enjeuHasard)}
                    {waitingRandom && <> {waitingRandom.myFinished ? PARTIE.chercheAdv : "En attente d'un adversaire."}</>}
                  </>
                }
                action={{ href: "#", label: busy === "random" ? PARTIE.recherche : waitingRandom ? PARTIE.reprendre : PARTIE.trouver, onClick: launchRandom, disabled: busy === "random" }}
                label={LICE.nom}
              />
            }
            gauche={
              <>
                {premier && stakesPremier ? (
                  <HeroEpreuve
                    id="duel-recu"
                    label="Le duel qui t'attend"
                    arc={rankFor(me.elo).tierIndex}
                    eyebrow={LICE.recu(timeLeftLabel(premier.expiresAt, nowIso))}
                    titre={LICE.teDefie(premier.opponentName ?? "Un joueur")}
                    micro={
                      <>
                        {LICE.recuMicro(premier.opponentElo, premier.theirFinished)}
                        {premier.opponentId && <PresenceText userId={premier.opponentId} court repli="hors ligne" avant=" · " />}
                      </>
                    }
                    texte={LICE.recuEnjeu(signed(stakesPremier.win), signed(stakesPremier.loss), timeLeftLabel(premier.expiresAt, nowIso))}
                    actions={
                      <>
                        <button type="button" className="btn btn-secondary btn-lg rl-press w-full sm:w-auto" disabled={busy === premier.id} onClick={() => respond(premier.id, true)}>
                          {LICE.accepter} <ArrowRight size={17} aria-hidden />
                        </button>
                        <button type="button" className="ink-link" disabled={busy === premier.id} onClick={() => respond(premier.id, false)}>
                          {LICE.refuser}
                        </button>
                      </>
                    }
                    droite={autresListe}
                  />
                ) : aJouer ? (
                  <HeroEpreuve
                    id="duel-recu"
                    label="Le duel qui t'attend"
                    eyebrow={LICE.aToi(timeLeftLabel(aJouer.expiresAt, nowIso))}
                    titre={LICE.contre(aJouer.opponentName ?? "un joueur")}
                    micro={
                      <>
                        {aJouer.opponentElo !== null ? `${aJouer.opponentElo} ELO` : null}
                        {aJouer.opponentId && <PresenceText userId={aJouer.opponentId} court repli="hors ligne" avant={aJouer.opponentElo !== null ? " · " : ""} />}
                      </>
                    }
                    texte={aJouer.theirFinished ? LICE.aToiTexte : PARTIE.aToi(timeLeftLabel(aJouer.expiresAt, nowIso))}
                    actions={
                      <Link href={`/duel/${aJouer.id}`} className="btn btn-primary btn-lg rl-press w-full sm:w-auto">
                        {LICE.jouer} <ArrowRight size={17} aria-hidden />
                      </Link>
                    }
                    droite={autresListe}
                  />
                ) : (
                  <HeroEpreuve
                    id="duel-recu"
                    label={LICE.rang}
                    eyebrow={LICE.rang}
                    titre={`${me.elo} ELO`}
                    micro={LICE.rangMicro(me.gamesPlayed)}
                    texte={LICE.rangTexte(net, recent.length)}
                    actions={
                      <Link href="/classement" className="ink-link">
                        {LICE.classement}
                      </Link>
                    }
                    droite={
                      recent.length > 0 ? (
                        <ListePodium
                          titre={LICE.derniers}
                          items={recent.slice(0, 3).map((d) => ({
                            nom: `${motIssue(d.won)} contre ${d.opponentName ?? "un joueur"}`,
                            note: `${d.myScore ?? 0}–${d.theirScore ?? 0} · ${signed(d.myDelta ?? 0)}`,
                            href: `/duel/${d.id}`,
                          }))}
                        />
                      ) : undefined
                    }
                  />
                )}

                <div className="grid gap-4 md:gap-[18px] xl:grid-cols-2">
                  {/* Défier quelqu'un : la recherche et les suggestions, en tuile */}
                  <section id="defier" className="card-quiet rl-in flex min-w-0 scroll-mt-24 flex-col gap-3 p-5 md:p-6" aria-labelledby="rl-duel-challenge">
                    <div className="flex items-center gap-3">
                      <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-surface">
                        <Search size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="t-micro m-0 truncate">{LICE.defierSur}</p>
                        <h3 id="rl-duel-challenge" className="m-0 text-[16px] font-bold tracking-[-0.01em]">
                          {LICE.defier}
                        </h3>
                      </div>
                      <span aria-hidden className="block h-[56px] w-[72px] shrink-0 overflow-hidden rounded-[14px] border border-line bg-surface-2">
                        <Illustration nom="duel-echecs" position="center 35%" decorative />
                      </span>
                    </div>
                    <label className="flex h-[42px] items-center gap-2.5 rounded-[12px] border border-line-2 bg-black px-3.5 text-muted focus-within:border-white">
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
                              className={"rl-row relative grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[12px] px-2 py-2 sm:grid-cols-[36px_minmax(0,1fr)_auto_auto] " + (isTarget ? "bg-surface-2" : "")}
                            >
                              <PlayerBadge elo={p.elo} size={36} />
                              <div className="min-w-0">
                                {/* toute la ligne ouvre la carte du joueur (Défier et Voir passent au-dessus) */}
                                <LienJoueur
                                  id={p.userId}
                                  nom={p.username ?? "Joueur"}
                                  className="block truncate text-[14.5px] font-semibold after:absolute after:inset-0 after:rounded-[12px] after:content-['']"
                                >
                                  {p.username ?? "Joueur"}
                                </LienJoueur>
                                <div className="t-micro truncate">
                                  {p.elo} ELO
                                  <PresenceText userId={p.userId} court repli={<span className="hidden sm:inline">{activity}</span>} avant=" · " />
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
                                <Link href={`/duel/${existing}`} className="btn btn-sm btn-secondary relative z-[1]">
                                  Voir
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  className={"btn btn-sm relative z-[1] " + (isTarget && !premier ? "btn-primary" : "btn-secondary")}
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
                      <p className="t-small m-0 py-2">{searching ? PARTIE.recherche : results ? PARTIE.aucunJoueur : VIDE.adversaires}</p>
                    )}
                    {!results && (
                      <Link href="/people" className="ink-link mt-auto inline-flex w-fit items-center gap-1.5">
                        <Search size={14} aria-hidden /> {LICE.chercher}
                      </Link>
                    )}
                  </section>

                  <TuileCalme
                    icone={<Icone nom="duel" size={18} />}
                    surTitre={LICE.aRevoirSur(DUEL_REVIEW_DAYS)}
                    titre={LICE.aRevoir}
                    ligne={LICE.aRevoirLigne(toReview.length)}
                    actions={
                      toReview.length > 0 ? (
                        <Link href="#duel-revoir" className="ink-link">
                          {LICE.revoirContre(toReview[0].opponentName ?? "un joueur")}
                        </Link>
                      ) : null
                    }
                  />
                </div>
              </>
            }
          />

          <BandeEncre icone={<Icone nom="examen" size={22} />} titre={LICE.defiTitre} ligne={LICE.defiLigne(defiJoueurs)} action={{ href: "/defi", label: LICE.defiAction }} />
          <RangeeLiens
            label={LICE.liensLabel}
            liens={[
              { href: "/people", icon: <Icone nom="moi" size={20} />, title: LICE.joueurs, desc: LICE.joueursDesc },
              { href: "/classement", icon: <Icone nom="classement" size={20} />, title: "S'affronter", desc: LICE.classementDesc },
              { href: "#duel-revoir", icon: <Icone nom="duel" size={20} />, title: LICE.revoirDuels, desc: LICE.revoirDesc(DUEL_REVIEW_DAYS), meta: toReview.length > 0 ? String(toReview.length) : null },
            ]}
          />
        </div>
      </div>

      <section className="flex flex-col gap-6" aria-labelledby="rl-duel-mine" id="duel-revoir">
        <h2 id="rl-duel-mine" className="t-h2">
          {PARTIE.tesDuels}
        </h2>
        {toReview.length === 0 && older.length === 0 ? (
          <p className="t-small">{recent.length === 0 ? VIDE.duels : `${CLASSEMENT.aRevoirVide(DUEL_REVIEW_DAYS)} ${PARTIE.aRevoirTexte}`}</p>
        ) : (
          <div className="flex min-w-0 flex-col gap-2 md:max-w-[640px]" aria-labelledby="rl-duel-review">
            <p id="rl-duel-review" className="t-eyebrow flex items-baseline justify-between gap-3 px-2">
              <span>
                À revoir{toReview.length > 0 && <span className="font-mono font-normal"> · {toReview.length}</span>}
              </span>
              <span className="font-normal normal-case tracking-normal">{CLASSEMENT.aRevoirSous(DUEL_REVIEW_DAYS)}</span>
            </p>
            {toReview.length === 0 ? (
              <p className="t-small px-2">{`${CLASSEMENT.aRevoirVide(DUEL_REVIEW_DAYS)} ${PARTIE.aRevoirTexte}`}</p>
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
                <p className="t-eyebrow mt-5 px-2">{PARTIE.plusAnciennes}</p>
                <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                  {older.map((d) => {
                    const label = motIssue(d.won);
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
                          <span className="text-right font-mono text-[13px] tabular-nums text-muted">
                            {d.myScore ?? 0} – {d.theirScore ?? 0}
                            <PctDuel a={d.myScore} b={d.theirScore} total={DUEL_QUESTIONS} className="block text-[11px] leading-tight" />
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

/** Le point d'un duel en cours, en quelques mots (liste « Tes autres duels en cours »). */
function sousDuel(d: OpenDuel, nowIso: string): string {
  const reste = timeLeftLabel(d.expiresAt, nowIso);
  if (d.status === "pending" && d.incoming) return reste ? `à accepter · ${reste}` : "à accepter";
  if (d.status === "pending" && !d.opponentId) return d.myFinished ? "on cherche" : "en attente";
  if (d.status === "pending") return d.myFinished ? "copie rendue" : "pas encore accepté";
  if (d.myFinished) return d.theirFinished ? "résultat imminent" : d.theirStarted ? "il joue" : "pas encore joué";
  return reste ? `à toi · ${reste}` : "à toi";
}
