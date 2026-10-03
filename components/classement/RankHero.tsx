import Link from "next/link";
import { ArrowRight, Lock, Swords } from "lucide-react";
import { RankBadge } from "@/components/ui/RankBadge";
import { EloChart } from "@/components/classement/EloChart";
import { PLACEMENT_GAMES, TIERS, rankFor } from "@/lib/ranks";
import { CURRENT_DOMAIN } from "@/lib/domains";
import { fmtInt, fmtLongDate, ordinal, signed } from "@/components/classement/format";
import type { MyRank } from "@/components/classement/types";
import type { RatingEvent } from "@/lib/rating";

const SHOWN = 10;
const DIM = "text-[rgba(255,255,255,.58)]";

// Héros de l'espace Classement : la seule carte sombre de la page. À gauche
// le badge (halo de maîtrise), le palier, l'ELO, la barre vers le palier
// suivant et les deux actions ; à droite, dans la même carte, la courbe
// d'ELO des derniers matchs classés.
export function RankHero({ me, history }: { me: MyRank; history: RatingEvent[] }) {
  const rank = rankFor(me.elo, me.mastery, me.leaderboardRank);
  const placement = me.gamesPlayed < PLACEMENT_GAMES;
  const [hi, mid] = rank.tier.metal;
  const left = PLACEMENT_GAMES - me.gamesPlayed;
  const nextLock = rank.next && rank.next.lock !== null && me.mastery < rank.next.lock ? rank.next.lock : null;

  const events = history.slice(-SHOWN);
  const total = events.length ? events[events.length - 1].eloAfter - events[0].eloBefore : 0;
  const hasExam = events.some((e) => e.source === "mock_exam");

  const meta = [
    me.leaderboardRank !== null ? `${ordinal(me.leaderboardRank)}${me.totalPlayers ? ` sur ${fmtInt(me.totalPlayers)}` : ""}` : "non classé",
    `maîtrise ${me.mastery} %`,
  ].join(" · ");

  return (
    <section
      className="card-ink rl-in grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,430px)] lg:gap-0 lg:p-10"
      style={{ "--tier-glow": mid } as React.CSSProperties}
      aria-label="Ton rang"
    >

      {/* Rang */}
      <div className="relative flex flex-col items-center gap-x-9 gap-y-6 text-center sm:flex-row sm:items-center sm:text-left lg:pr-10">
        <span className="shrink-0">
          <RankBadge tier={rank.tierIndex} size={148} mastery={me.mastery} division={placement ? null : rank.division} onDark animate gray={placement} />
        </span>

        <div className="flex min-w-0 flex-1 flex-col items-center gap-3 sm:items-start">
          <p className={"text-[12.5px] leading-[1.4] " + DIM}>{placement ? `Placement · ${CURRENT_DOMAIN.name}` : `Ton rang · ${CURRENT_DOMAIN.name}`}</p>
          <h2 className="-mt-1 text-[clamp(34px,4vw,46px)] font-extrabold leading-none tracking-[-0.035em]">
            {placement ? "En placement" : `${rank.tier.name}${rank.division ? " " + rank.division : ""}`}
          </h2>

          <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 sm:justify-start">
            <span className="flex items-baseline gap-1.5">
              <span className="t-num rl-count text-[40px]" style={{ "--rl-to": Math.max(0, Math.round(me.elo)) } as React.CSSProperties} aria-label={`${me.elo} ELO`} />
              <span className={"font-mono text-[12px] " + DIM}>{placement ? "ELO provisoire" : "ELO"}</span>
            </span>
            <span className={"text-[12.5px] leading-[1.4] font-mono tabular-nums " + DIM}>{meta}</span>
          </div>

          <div className="w-full max-w-[420px]">
            {placement ? (
              <>
                <div className="grid grid-cols-5 gap-1.5" role="img" aria-label={`${me.gamesPlayed} parties de placement sur ${PLACEMENT_GAMES}`}>
                  {Array.from({ length: PLACEMENT_GAMES }, (_, i) => (
                    <span key={i} className={"h-[6px] rounded-[6px] " + (i < me.gamesPlayed ? "bg-[#fff]" : "bg-[rgba(255,255,255,.14)]")} />
                  ))}
                </div>
                <p className={"text-[12.5px] leading-[1.4] mt-2.5 " + DIM}>
                  {me.gamesPlayed}/{PLACEMENT_GAMES} · encore {left} partie{left > 1 ? "s" : ""} pour révéler ton rang
                </p>
              </>
            ) : (
              <>
                <div className="h-[6px] overflow-hidden rounded-[6px] bg-[rgba(255,255,255,.14)]">
                  <div className="rl-grow h-full rounded-[6px]" style={{ width: `${Math.max(3, rank.progress)}%`, background: `linear-gradient(90deg, ${hi}, ${mid})`, animationDelay: ".4s" }} />
                </div>
                {rank.lockedBy ? (
                  <p className={"text-[12.5px] leading-[1.4] mt-2.5 flex items-center justify-center gap-1.5 sm:justify-start " + DIM}>
                    <Lock size={12} className="shrink-0" aria-hidden />
                    {rank.lockedBy.name} verrouillé : {rank.lockedBy.lock} % de maîtrise requis (tu es à {me.mastery} %)
                  </p>
                ) : rank.next && rank.pointsToNext !== null ? (
                  <p className={"text-[12.5px] leading-[1.4] mt-2.5 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 sm:justify-start " + DIM}>
                    encore {fmtInt(rank.pointsToNext)} points pour
                    <span className="inline-flex items-center gap-1 font-semibold text-[#fff]">
                      <RankBadge tier={TIERS.indexOf(rank.next)} size={16} glow={false} />
                      {rank.next.name}
                    </span>
                    {nextLock !== null && (
                      <span className="inline-flex items-center gap-1">
                        · <Lock size={11} aria-hidden /> {nextLock} % de maîtrise
                      </span>
                    )}
                  </p>
                ) : (
                  <p className={"text-[12.5px] leading-[1.4] mt-2.5 " + DIM}>Tu es au sommet. Tiens ta place.</p>
                )}
              </>
            )}
          </div>

          <div className="mt-2 flex flex-wrap justify-center gap-2.5 sm:justify-start">
            <Link href="/duel" className="btn btn-on-ink">
              Lancer un duel <ArrowRight size={16} aria-hidden />
            </Link>
            <Link href="/duel#defier" className="btn btn-on-ink-ghost">
              <Swords size={15} aria-hidden /> Défier quelqu&apos;un
            </Link>
          </div>
        </div>
      </div>

      {/* Courbe d'ELO */}
      <div className="relative flex min-w-0 flex-col gap-3 border-t border-[rgba(255,255,255,.1)] pt-7 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
        <div className="flex items-baseline justify-between gap-3">
          <span className={"text-[12.5px] leading-[1.4] font-semibold " + DIM}>
            {events.length ? `ELO · ${events.length === 1 ? "dernier match" : `${events.length} derniers matchs`}` : "ELO · tes matchs classés"}
          </span>
          {events.length > 0 && <span className="font-mono text-[13px] font-semibold tabular-nums">{signed(total)}</span>}
        </div>
        {events.length ? (
          <>
            <div className="my-auto">
              <EloChart events={events} tint={mid} onDark />
            </div>
            <p className={"text-[12.5px] leading-[1.4] flex flex-wrap items-center gap-x-3 gap-y-1 " + DIM}>
              <span>depuis le {fmtLongDate(events[0].createdAt)}</span>
              {hasExam && (
                <span className="inline-flex items-center gap-3" aria-hidden>
                  <span className="inline-flex items-center gap-1">
                    <svg width="8" height="8" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="currentColor" /></svg>
                    duel
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <svg width="9" height="9" viewBox="0 0 10 10"><path d="M5 0.5 L9.5 5 L5 9.5 L0.5 5 Z" fill="currentColor" /></svg>
                    examen classé
                  </span>
                </span>
              )}
            </p>
          </>
        ) : (
          <div className="my-auto flex flex-col gap-3">
            <svg viewBox="0 0 460 60" width="100%" aria-hidden style={{ display: "block", overflow: "visible" }}>
              <line x1={0} x2={460} y1={34} y2={34} stroke="rgba(255,255,255,.18)" strokeDasharray="3 6" />
              <text x={0} y={26} style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "rgba(255,255,255,.45)" }}>
                {fmtInt(me.elo)}
              </text>
              <circle cx={452} cy={34} r={5} fill="#fff" />
            </svg>
            <p className={"text-[13.5px] leading-[1.45] " + DIM}>Ta courbe démarre à ton premier duel ou examen classé.</p>
          </div>
        )}
      </div>
    </section>
  );
}
