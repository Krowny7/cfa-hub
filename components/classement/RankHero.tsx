import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PanneauRang } from "@/components/adn/RankCeremonyPanneau";
import { Icone } from "@/components/adn/icons";
import { EloChart } from "@/components/classement/EloChart";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import { CURRENT_DOMAIN } from "@/lib/domains";
import { VERROU } from "@/lib/voice";
import { CLASSEMENT, coteProchain, ligneRang } from "@/lib/voice-z2a";
import { fmtInt, fmtLongDate, signed } from "@/components/classement/format";
import type { MyRank } from "@/components/classement/types";
import type { RatingEvent } from "@/lib/rating";

const SHOWN = 10;

// Héros de l'espace Classement. À gauche, le panneau du rang (Geste,
// moment 3 : la seule surface d'encre pleine de la page) avec les deux
// actions ; à droite, posée sur le papier, la courbe d'ELO tracée au
// pinceau, le prochain palier coté au stylo rouge.
export function RankHero({ me, history }: { me: MyRank; history: RatingEvent[] }) {
  const rank = rankFor(me.elo, me.mastery, me.leaderboardRank);
  const placement = me.gamesPlayed < PLACEMENT_GAMES;

  const events = history.slice(-SHOWN);
  const total = events.length ? events[events.length - 1].eloAfter - events[0].eloBefore : 0;
  const hasExam = events.some((e) => e.source === "mock_exam");
  const cap = !placement && rank.next && rank.pointsToNext !== null && !rank.lockedBy ? { elo: rank.next.min, label: coteProchain(rank.next.name, rank.pointsToNext) } : null;

  return (
    <section className="grid items-center gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]" aria-label="Ton rang">
      <PanneauRang elo={me.elo} maitrise={me.mastery} place={me.leaderboardRank} domaine={CURRENT_DOMAIN.name} joues={me.gamesPlayed} className="rl-in">
        <p className="m-0 mt-1.5 font-mono text-[12px] tabular-nums opacity-70">{ligneRang({ place: me.leaderboardRank, joueurs: me.totalPlayers, maitrise: me.mastery })}</p>
        {rank.lockedBy && !placement && <p className="m-0 mt-1 text-[13px] font-semibold">{VERROU}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href="/duel" className="btn btn-secondary rl-press">
            <Icone nom="duel" size={17} /> {CLASSEMENT.lancer}
          </Link>
          <Link href="/duel#defier" className="inline-flex items-center gap-1.5 text-[14px] font-semibold underline-offset-4 hover:underline">
            {CLASSEMENT.defier} <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </PanneauRang>

      {/* La courbe d'ELO, au pinceau, sur le papier */}
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="t-micro font-semibold">{events.length ? CLASSEMENT.courbe(events.length) : "Ton ELO"}</span>
          {events.length > 0 && <span className={"font-mono text-[13px] font-semibold tabular-nums " + (total < 0 ? "text-muted" : "")}>{signed(total)}</span>}
        </div>
        {events.length ? (
          <>
            <EloChart events={events} cap={cap} />
            <p className="t-micro m-0 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{CLASSEMENT.depuis(fmtLongDate(events[0].createdAt))}</span>
              {hasExam && (
                <span className="inline-flex items-center gap-3" aria-hidden>
                  <span className="inline-flex items-center gap-1">
                    <svg width="7" height="7" viewBox="0 0 10 10">
                      <circle cx="5" cy="5" r="4" fill="currentColor" />
                    </svg>
                    duel
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <svg width="9" height="9" viewBox="0 0 10 10">
                      <path d="M5 0.5 L9.5 5 L5 9.5 L0.5 5 Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                    examen classé
                  </span>
                </span>
              )}
            </p>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <svg viewBox="0 0 460 60" width="100%" aria-hidden style={{ display: "block", overflow: "visible" }}>
              <line x1={0} x2={460} y1={34} y2={34} stroke="var(--pencil)" strokeWidth={0.8} strokeDasharray="2 5" />
              <text x={0} y={26} style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "var(--ink-3)" }}>
                {fmtInt(me.elo)}
              </text>
              <circle cx={452} cy={34} r={5} fill="currentColor" />
            </svg>
            <p className="t-small m-0">{CLASSEMENT.courbeVide}</p>
          </div>
        )}
      </div>
    </section>
  );
}
