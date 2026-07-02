import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { LevelBar } from "@/components/LevelBar";
import { XpBarChart, type XpDay } from "@/components/XpBarChart";
import { levelInfoFromXp } from "@/lib/leveling";
import type { Profile, Rating } from "@/lib/types";

type PageProps = { params: Promise<{ id: string }> };
type ProfileRow = Pick<Profile, "id" | "username" | "avatar_url" | "xp_total">;
type RatingRow = Pick<Rating, "elo" | "games_played">;

function shortId(id: string) {
  return id ? id.split("-")[0] : "";
}

function initials(label: string) {
  const base = (label || "U").replace(/[^a-zA-Z0-9]+/g, " ").trim();
  const parts = base.split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "U") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function PersonProfilePage({ params }: PageProps) {
  const { id } = await params;
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const [{ data: profileData }, { data: ratingData }] = await Promise.all([
    supabase.from("profiles").select("id,username,avatar_url,xp_total").eq("id", id).maybeSingle(),
    supabase.from("ratings").select("elo,games_played").eq("user_id", id).maybeSingle(),
  ]);

  if (!profileData) notFound();

  const [{ data: myGroups }, { data: theirGroups }] = await Promise.all([
    supabase.from("group_memberships").select("group_id").eq("user_id", user.id),
    supabase.from("group_memberships").select("group_id").eq("user_id", id),
  ]);

  const myIds = new Set((myGroups ?? []).map((g: { group_id: string }) => g.group_id).filter(Boolean));
  const mutualCount = (theirGroups ?? [])
    .map((g: { group_id: string }) => g.group_id)
    .filter(Boolean)
    .filter((gid) => myIds.has(gid)).length;

  const profile = profileData as ProfileRow;
  const rating = ratingData as RatingRow | null;
  const username = profile.username ?? null;
  const avatarUrl = profile.avatar_url ?? null;
  const display = username || shortId(id);
  const xpTotal = Number(profile.xp_total ?? 0) || 0;
  const lvlInfo = levelInfoFromXp(xpTotal);
  const elo = rating?.elo ?? 1200;
  const games = rating?.games_played ?? 0;
  const isMe = user.id === id;

  let xpDaily: XpDay[] | null = null;
  if (isMe) {
    try {
      const { data } = await supabase.rpc("get_xp_daily", { p_days: 90 });
      if (Array.isArray(data)) {
        xpDaily = data
          .slice(0, 90)
          .map((d: { day: string; xp: number }) => ({ day: String(d.day), xp: Number(d.xp ?? 0) || 0 }));
      }
    } catch {
      // RPC not available yet
    }
  }

  return (
    <div className="grid gap-4">
      {/* Compact header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/people" className="text-xs text-white/50 hover:text-white/80">
          ← {t(locale, "people.backToDirectory")}
        </Link>
        {isMe && (
          <Link href="/settings" className="btn btn-secondary text-xs">
            {t(locale, "nav.settings")}
          </Link>
        )}
      </div>

      {/* Profile card */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="avatar" className="h-14 w-14 rounded-full object-cover shrink-0" />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-medium">
              {initials(display)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {display}
              <span className="ml-2 text-sm font-normal text-white/40">{shortId(id)}</span>
            </h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="badge badge-private">{t(locale, "common.levelN", { n: lvlInfo.level })}</span>
              <span className="badge badge-shared">{xpTotal} XP</span>
              <span className="badge badge-public">Elo {elo}</span>
              <span className="badge badge-shared">{t(locale, "common.gamesN", { n: games })}</span>
              {mutualCount > 0 && (
                <span className="badge badge-private">{t(locale, "common.mutualGroupsN", { n: mutualCount })}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats two-column */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">{t(locale, "people.progress")}</h2>
          <LevelBar xpTotal={xpTotal} />
          <div className="mt-4 grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-white/60">{t(locale, "common.xpTotal")}</span>
              <span className="font-medium">{xpTotal}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">{t(locale, "common.level")}</span>
              <span className="font-medium">{lvlInfo.level}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-white/40">{t(locale, "people.xpNote")}</p>
        </div>

        {isMe && xpDaily ? (
          <XpBarChart data={xpDaily} title={t(locale, "people.xpDailyChart")} />
        ) : (
          <div className="card p-5">
            <h2 className="mb-2 text-sm font-semibold">{t(locale, "people.stats")}</h2>
            <p className="text-sm text-white/60">
              {isMe ? t(locale, "people.chartMine") : t(locale, "people.chartHint")}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold">{t(locale, "people.actions")}</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/people" className="btn btn-secondary text-sm">
            {t(locale, "people.browseProfiles")}
          </Link>
          {!isMe && (
            <button type="button" className="btn btn-ghost text-sm" disabled>
              {t(locale, "people.addFriendSoon")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
