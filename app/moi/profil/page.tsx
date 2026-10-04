import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/Titles";
import { EditeurProfil } from "@/components/profil/EditeurProfil";
import type { EnteteData } from "@/components/profil/EnteteJoueur";
import { masteryByUser, tryAdmin } from "@/components/classement/data";
import { displayName } from "@/components/classement/format";
import { levelInfoFromXp } from "@/lib/leveling";
import { getLeaderboardRank } from "@/lib/rating";
import { DEFAULT_ELO } from "@/lib/ranks";
import { amisDe, lireLien, lireNom, lireStyle, statsProfil } from "@/lib/profil/donnees";
import { LIEN_DEFAUT, NOM_DEFAUT } from "@/lib/profil/catalogue";

export const metadata = { title: "Personnaliser mon profil · Ranked Lobby" };

// Personnaliser son profil : la carte de joueur en aperçu direct et les
// choix (bannière : image ou motif, couleur, cadre, prénom et nom, vitrine,
// radar, bio, LinkedIn).
export default async function PersonnaliserPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const admin = tryAdmin();
  const [{ data: profile }, { data: rating }, place, masteries, { style, disponible }, lien, stats, amis, nom] = await Promise.all([
    supabase.from("profiles").select("username,avatar_url,xp_total").eq("id", user.id).maybeSingle(),
    supabase.from("ratings").select("elo,games_played").eq("user_id", user.id).maybeSingle(),
    getLeaderboardRank(supabase, user.id),
    masteryByUser(admin, [user.id]),
    lireStyle(supabase, user.id),
    lireLien(supabase, user.id),
    statsProfil(user.id, supabase),
    amisDe(user.id, supabase, 1),
    lireNom(supabase, user.id),
  ]);

  const p = profile as { username: string | null; avatar_url: string | null; xp_total: number | null } | null;
  const r = rating as { elo: number; games_played: number } | null;
  const xpTotal = Number(p?.xp_total ?? 0) || 0;
  const lvl = levelInfoFromXp(xpTotal);
  const elo = r?.elo ?? DEFAULT_ELO;
  const mastery = masteries.get(user.id) ?? null;

  const carte: EnteteData = {
    id: user.id,
    name: displayName(p?.username, user.id),
    nomComplet: nom?.nom ?? null,
    avatarUrl: p?.avatar_url ?? null,
    style,
    niveau: lvl.level,
    levelPct: Math.round(lvl.progressPct * 100),
    xpTotal,
    elo,
    mastery,
    place,
    gamesPlayed: r?.games_played ?? 0,
    linkedin: lien?.linkedin ?? null,
    amis: amis ? amis.total : null,
  };

  return (
    <div className="rl-wide rl-page">
      <div className="flex flex-col gap-4">
        <Link href="/moi" className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-white">
          <ArrowLeft size={14} aria-hidden /> Moi
        </Link>
        <PageHero kicker="Ton profil" title="Personnaliser" className="w-fit max-w-full" />
      </div>
      <EditeurProfil
        carte={carte}
        stats={stats}
        initial={style}
        linkedin={lien?.linkedin ?? null}
        visibilite={lien?.visibilite ?? LIEN_DEFAUT.visibilite}
        nom={nom ?? NOM_DEFAUT}
        disponible={disponible}
      />
    </div>
  );
}
