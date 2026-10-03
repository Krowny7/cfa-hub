import Link from "next/link";
import { Lock, Shuffle, Swords } from "lucide-react";
import { RankBadge } from "@/components/ui/RankBadge";
import { InkRing } from "@/components/ink/InkRing";
import { PLACEMENT_GAMES, TIERS, rankFor } from "@/lib/ranks";
import { CURRENT_DOMAIN } from "@/lib/domains";
import { fmtInt, ordinal } from "@/components/classement/format";
import type { MyRank } from "@/components/classement/types";

// Héros de l'espace Classement : la carte sombre du rang. Badge grand format
// avec le halo de maîtrise, palier · division, ELO en grand (compteur animé),
// barre vers le palier suivant et, s'il y a lieu, le verrou de maîtrise ou
// les parties de placement restantes.
export function RankHero({ me }: { me: MyRank }) {
  const rank = rankFor(me.elo, me.mastery, me.leaderboardRank);
  const placement = me.gamesPlayed < PLACEMENT_GAMES;
  const [hi, mid] = rank.tier.metal;
  const left = PLACEMENT_GAMES - me.gamesPlayed;
  const nextLock = rank.next && rank.next.lock !== null && me.mastery < rank.next.lock ? rank.next.lock : null;

  return (
    <section className="card-ink rl-lift flex h-full flex-col justify-center p-6 md:p-7" aria-label="Ton rang">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-[340px] w-[340px] rounded-full" style={{ background: `radial-gradient(circle, ${mid}40, transparent 70%)` }} />
      <InkRing size={230} className="pointer-events-none absolute -bottom-20 -right-12 text-[rgba(255,255,255,.06)]" />

      <div className="relative flex flex-wrap items-center gap-x-7 gap-y-5">
        <div className="rl-pop mx-auto sm:mx-0" style={{ animationDelay: ".15s" }}>
          <RankBadge tier={rank.tierIndex} size={138} mastery={me.mastery} division={placement ? null : rank.division} onDark animate gray={placement} />
        </div>

        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-2">
          <span className="text-[13px] font-semibold text-[rgba(255,255,255,.6)]">
            {placement ? `Placement · ${CURRENT_DOMAIN.name}` : `Palier · division · ${CURRENT_DOMAIN.name}`}
          </span>
          <h2 className="text-[clamp(36px,5vw,48px)] font-extrabold leading-none tracking-[-0.04em]">
            {placement ? "En placement" : `${rank.tier.name}${rank.division ? " " + rank.division : ""}`}
          </h2>

          <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="flex items-baseline gap-1.5">
              <span className="rl-count font-brand text-[40px] leading-none" style={{ "--rl-to": Math.max(0, Math.round(me.elo)) } as React.CSSProperties} aria-label={`${me.elo} ELO`} />
              <span className="font-mono text-[13px] text-[rgba(255,255,255,.7)]">{placement ? "ELO provisoire" : "ELO"}</span>
            </span>
            <span className="font-mono text-[13px] tabular-nums text-[rgba(255,255,255,.8)]">
              {me.leaderboardRank !== null ? `${ordinal(me.leaderboardRank)}${me.totalPlayers ? ` / ${me.totalPlayers}` : ""}` : "non classé"}
            </span>
            <span className="font-mono text-[13px] tabular-nums text-[rgba(255,255,255,.8)]">maîtrise {me.mastery} %</span>
          </div>

          {placement ? (
            <>
              <div className="mt-2 grid grid-cols-5 gap-1.5" role="img" aria-label={`${me.gamesPlayed} parties de placement sur ${PLACEMENT_GAMES}`}>
                {Array.from({ length: PLACEMENT_GAMES }, (_, i) => (
                  <span key={i} className={"h-[10px] rounded-[10px] " + (i < me.gamesPlayed ? "bg-[#fff]" : "bg-[rgba(255,255,255,.14)]")} />
                ))}
              </div>
              <p className="text-[13px] text-[rgba(255,255,255,.7)]">
                En placement {me.gamesPlayed}/{PLACEMENT_GAMES} · encore {left} partie{left > 1 ? "s" : ""} (duels ou examens classés) pour révéler ton rang.
              </p>
            </>
          ) : (
            <>
              <div className="mt-2 h-[10px] overflow-hidden rounded-[10px] bg-[rgba(255,255,255,.14)]">
                <div className="rl-grow h-full rounded-[10px]" style={{ width: `${Math.max(3, rank.progress)}%`, background: `linear-gradient(90deg, ${hi}, ${mid})`, animationDelay: ".5s" }} />
              </div>
              {rank.lockedBy ? (
                <p className="flex items-start gap-2 text-[13px] text-[rgba(255,255,255,.75)]">
                  <Lock size={14} className="mt-0.5 shrink-0" aria-hidden />
                  <span>
                    Ton ELO vaut {rank.lockedBy.name}, mais il faut {rank.lockedBy.lock} % de maîtrise pour y entrer : tu es à {me.mastery} %. Travaille les matières faibles pour débloquer le palier.
                  </span>
                </p>
              ) : rank.next && rank.pointsToNext !== null ? (
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[rgba(255,255,255,.7)]">
                  <span>Encore {fmtInt(rank.pointsToNext)} points pour</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#fff]">
                    <RankBadge tier={TIERS.indexOf(rank.next)} size={18} glow={false} />
                    {rank.next.name}
                  </span>
                  {nextLock !== null && (
                    <span className="inline-flex items-center gap-1">
                      <Lock size={12} aria-hidden /> et {nextLock} % de maîtrise
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-[13px] text-[rgba(255,255,255,.7)]">Tu es au sommet du classement. Tiens ta place.</p>
              )}
            </>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/duel" className="rl-press inline-flex h-[42px] items-center gap-2 rounded-[12px] bg-[#fff] px-4 text-[14px] font-bold text-[#111]">
              <Shuffle size={16} aria-hidden /> Duel au hasard
            </Link>
            <Link href="/duel" className="rl-press inline-flex h-[42px] items-center gap-2 rounded-[12px] border border-[rgba(255,255,255,.25)] px-4 text-[14px] font-semibold text-[#fff] hover:bg-[rgba(255,255,255,.08)]">
              <Swords size={16} aria-hidden /> Défier quelqu&apos;un
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
