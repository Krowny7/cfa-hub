import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Settings, Sparkles, Swords, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { XpBarChart, type XpDay } from "@/components/XpBarChart";
import { PracticeTrophies } from "@/components/PracticeTrophies";
import { PracticeProgressChart } from "@/components/PracticeProgressChart";
import { TOPIC_LABELS } from "@/lib/practiceTopics";
import { levelInfoFromXp } from "@/lib/leveling";
import { getLeaderboardRank } from "@/lib/rating";
import { DEFAULT_ELO, PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import { CURRENT_DOMAIN } from "@/lib/domains";
import { CardLabel, PageHero } from "@/components/ui/Titles";
import { RankBadge } from "@/components/ui/RankBadge";
import { InkRing } from "@/components/ink/InkRing";
import { Avatar } from "@/components/classement/Avatar";
import { masteryByUser, tryAdmin } from "@/components/classement/data";
import { displayName, fmtInt, ordinal, shortId } from "@/components/classement/format";
import type { Profile, Rating } from "@/lib/types";

type PageProps = { params: Promise<{ id: string }> };
type ProfileRow = Pick<Profile, "id" | "username" | "avatar_url" | "xp_total">;
type RatingRow = Pick<Rating, "elo" | "games_played">;

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex min-h-[32px] items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3 text-[13px] font-semibold shadow-[var(--shadow-1)]">{children}</span>;
}

// Profil d'un joueur (espace Classement) : rang, niveau, trophées et
// progression ; « Défier » pour lancer un duel contre lui.
export default async function PersonProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const [{ data: profileData }, { data: ratingData }] = await Promise.all([
    supabase.from("profiles").select("id,username,avatar_url,xp_total").eq("id", id).maybeSingle(),
    supabase.from("ratings").select("elo,games_played").eq("user_id", id).maybeSingle(),
  ]);

  if (!profileData) notFound();

  const [{ data: myGroups }, { data: theirGroups }, leaderboardRank, masteries] = await Promise.all([
    supabase.from("group_memberships").select("group_id").eq("user_id", user.id),
    supabase.from("group_memberships").select("group_id").eq("user_id", id),
    getLeaderboardRank(supabase, id),
    masteryByUser(tryAdmin(), [id]),
  ]);

  const myIds = new Set((myGroups ?? []).map((g: { group_id: string }) => g.group_id).filter(Boolean));
  const mutualCount = (theirGroups ?? [])
    .map((g: { group_id: string }) => g.group_id)
    .filter(Boolean)
    .filter((gid) => myIds.has(gid)).length;

  const profile = profileData as ProfileRow;
  const rating = ratingData as RatingRow | null;
  const display = displayName(profile.username, id);
  const xpTotal = Number(profile.xp_total ?? 0) || 0;
  const lvl = levelInfoFromXp(xpTotal);
  const elo = rating?.elo ?? DEFAULT_ELO;
  const games = rating?.games_played ?? 0;
  const isMe = user.id === id;
  const mastery = masteries.get(id) ?? null;
  const rank = rankFor(elo, mastery, leaderboardRank);
  const placement = games < PLACEMENT_GAMES;

  let xpDaily: XpDay[] | null = null;
  if (isMe) {
    try {
      const { data } = await supabase.rpc("get_xp_daily", { p_days: 90 });
      if (Array.isArray(data)) {
        xpDaily = data.slice(0, 90).map((d: { day: string; xp: number }) => ({ day: String(d.day), xp: Number(d.xp ?? 0) || 0 }));
      }
    } catch {
      // fonction pas encore créée
    }
  }

  let trophyRows: { topic_count: number; trophy_count: number }[] = [];
  try {
    const { data } = await supabase.rpc("get_user_practice_trophies", { p_user_id: id });
    if (Array.isArray(data)) {
      trophyRows = data.map((r: { topic_count: number; trophy_count: number }) => ({
        topic_count: Number(r.topic_count ?? 0) || 0,
        trophy_count: Number(r.trophy_count ?? 0) || 0,
      }));
    }
  } catch {
    // fonction pas encore créée
  }

  type ProgressRow = { id: string; topics: string[]; format: number; score: number; total: number; completed_at: string };
  let progressSessions: ProgressRow[] = [];
  try {
    const { data } = await supabase.rpc("get_user_practice_progress", { p_user_id: id });
    if (Array.isArray(data)) progressSessions = data as ProgressRow[];
  } catch {
    // fonction pas encore créée
  }

  return (
    <div className="rl-wide flex flex-col gap-8">
      <Link href="/people" className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-white">
        <ArrowLeft size={14} aria-hidden /> Joueurs
      </Link>

      <div className="grid items-center gap-6 lg:grid-cols-12">
        <div className="flex min-w-0 items-center gap-5 lg:col-span-8">
          <div className="rl-pop hidden sm:block">
            <Avatar src={profile.avatar_url} name={display} size={84} className="shadow-[var(--shadow-2)]" />
          </div>
          <PageHero kicker={isMe ? "Ton profil public" : `Joueur · ${shortId(id)}`} title={<span className="[overflow-wrap:anywhere]">{display}</span>} className="min-w-0 flex-1">
            <Pill>
              <Sparkles size={14} aria-hidden /> Niveau {lvl.level} · {fmtInt(xpTotal)} XP
            </Pill>
            {mutualCount > 0 && (
              <Pill>
                <Users size={14} aria-hidden /> {mutualCount} groupe{mutualCount > 1 ? "s" : ""} en commun
              </Pill>
            )}
            {isMe ? (
              <Link href="/moi#reglages" className="btn btn-secondary rl-press min-h-[34px] px-3 text-[13px]">
                <Settings size={14} aria-hidden /> Mes réglages
              </Link>
            ) : (
              <Link href={`/duel?adversaire=${encodeURIComponent(id)}`} className="btn btn-primary rl-press min-h-[34px] px-3.5 text-[13px]">
                <Swords size={14} aria-hidden /> Défier {display}
              </Link>
            )}
          </PageHero>
        </div>

        <section className="card-ink rl-in flex items-center gap-4 p-5 lg:col-span-4" style={{ animationDelay: ".1s" }} aria-label={`Rang de ${display}`}>
          <InkRing size={170} className="pointer-events-none absolute -bottom-14 -right-10 text-[rgba(255,255,255,.06)]" />
          <span className="relative shrink-0">
            <RankBadge tier={rank.tierIndex} size={78} mastery={mastery} division={placement ? null : rank.division} onDark animate gray={placement} />
          </span>
          <span className="relative flex min-w-0 flex-col gap-1">
            <span className="text-[12.5px] font-semibold text-[rgba(255,255,255,.6)]">Rang · {CURRENT_DOMAIN.name}</span>
            <span className="text-[22px] font-extrabold leading-none tracking-[-0.02em]">
              {placement ? `En placement ${games}/${PLACEMENT_GAMES}` : `${rank.tier.name}${rank.division ? " " + rank.division : ""}`}
            </span>
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-brand text-[26px] leading-tight">{elo}</span>
              <span className="font-mono text-[12px] text-[rgba(255,255,255,.7)]">
                ELO{leaderboardRank !== null ? ` · ${ordinal(leaderboardRank)}` : ""}
                {mastery !== null ? ` · maîtrise ${mastery} %` : ""}
              </span>
            </span>
            <span className="text-[12.5px] text-[rgba(255,255,255,.7)]">
              {games} partie{games > 1 ? "s" : ""} classée{games > 1 ? "s" : ""}
            </span>
          </span>
        </section>
      </div>

      <div className="grid gap-[18px] lg:grid-cols-2">
        <section className="card flex flex-col gap-4 p-[22px]">
          <CardLabel icon={<Sparkles size={15} aria-hidden />} right={<span className="font-mono text-[12px] tabular-nums">{fmtInt(xpTotal)} XP</span>}>
            Progression
          </CardLabel>
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[15px] font-bold">Niveau {lvl.level}</span>
              <span className="font-mono text-[12px] tabular-nums text-muted">
                {lvl.xpIntoLevel}/{lvl.xpForNextLevel} XP
              </span>
            </div>
            <div className="ink-bar" role="progressbar" aria-valuenow={Math.round(lvl.progressPct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Niveau ${lvl.level}`}>
              <span className="rl-grow" style={{ width: `${Math.round(lvl.progressPct * 100)}%` }} />
            </div>
            <p className="mt-2 text-[12.5px] text-muted">encore {fmtInt(lvl.xpToNextLevel)} XP avant le niveau {lvl.level + 1}</p>
          </div>
          <p className="text-[12.5px] text-muted">L&apos;XP se gagne en révisant (fiches, QCM, flashcards) ; l&apos;ELO, en duel et aux examens blancs classés.</p>
        </section>

        {isMe && xpDaily ? (
          <XpBarChart data={xpDaily} title="XP gagnée par jour (90 jours)" />
        ) : (
          <section className="card flex flex-col gap-2 p-[22px]">
            <CardLabel>Statistiques</CardLabel>
            <p className="text-[13.5px] text-muted">
              {isMe ? "Le graphique d'XP quotidienne apparaîtra dès que la fonction de suivi sera activée." : "Le détail de l'activité quotidienne n'est visible que sur ton propre profil."}
            </p>
            {!isMe && (
              <Link href={`/duel?adversaire=${encodeURIComponent(id)}`} className="ink-link mt-1 w-fit">
                Mesure-toi à {display} en duel
              </Link>
            )}
          </section>
        )}
      </div>

      <PracticeTrophies rows={trophyRows} />

      <PracticeProgressChart pastSessions={progressSessions} topicLabels={TOPIC_LABELS} />
    </div>
  );
}
