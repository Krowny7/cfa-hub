import type { SupabaseClient } from "@supabase/supabase-js";
import { Personnaliser } from "@/components/profil/Personnaliser";
import type { EnteteData } from "@/components/profil/EnteteJoueur";
import { masteryByUser, tryAdmin } from "@/components/classement/data";
import { displayName } from "@/components/classement/format";
import { AnswerSummary } from "@/components/moi/AnswerSummary";
import { PracticeTrophies } from "@/components/PracticeTrophies";
import { PracticeProgressChart } from "@/components/PracticeProgressChart";
import { TOPIC_LABELS } from "@/lib/practiceTopics";
import { levelInfoFromXp } from "@/lib/leveling";
import { getLeaderboardRank } from "@/lib/rating";
import { DEFAULT_ELO } from "@/lib/ranks";
import { getTopicAverages } from "@/lib/mastery";
import { getAnswerStats } from "@/lib/answer-stats";
import { amisDe, datesDuPic, lireLien, lireNom, lireStyle, statsProfil } from "@/lib/profil/donnees";
import { sceauxDuJoueur } from "@/lib/profil/sceaux-base";
import { posesDe } from "@/lib/profil/sceaux";
import { LIEN_DEFAUT, NOM_DEFAUT, acquisDe } from "@/lib/profil/catalogue";

// Personnaliser, côté serveur (/people/<moi>?personnaliser=1, sur son
// propre profil seulement) : tout ce que l'ancien éditeur /moi/profil
// lisait (le style, le LinkedIn et le nom tels quels, les blocs de la page),
// plus ce qui ouvre les pièces gagnées (questions, pic et sa date, sceaux).

type ProfilLu = { username: string | null; avatar_url: string | null; xp_total: number | null };

async function trophees(sb: SupabaseClient, id: string) {
  try {
    const { data } = await sb.rpc("get_user_practice_trophies", { p_user_id: id });
    return Array.isArray(data) ? data.map((r: { topic_count: number; trophy_count: number }) => ({ topic_count: Number(r.topic_count ?? 0) || 0, trophy_count: Number(r.trophy_count ?? 0) || 0 })) : [];
  } catch {
    return [] as { topic_count: number; trophy_count: number }[];
  }
}

async function progression(sb: SupabaseClient, id: string) {
  try {
    const { data } = await sb.rpc("get_user_practice_progress", { p_user_id: id });
    return Array.isArray(data) ? (data as { id: string; topics: string[]; format: number; score: number; total: number; completed_at: string }[]) : [];
  } catch {
    return [];
  }
}

export async function ModePersonnaliser({ id, supabase, profil, rating }: { id: string; supabase: SupabaseClient; profil: ProfilLu; rating: { elo: number; games_played: number } | null }) {
  const admin = tryAdmin();
  const statsLues = statsProfil(id, supabase);
  const [place, masteries, { style, disponible, pins }, lien, stats, amis, nom, moyennes, answers, trophyRows, progress, sceaux, datesPic] = await Promise.all([
    getLeaderboardRank(supabase, id),
    masteryByUser(admin, [id]),
    lireStyle(supabase, id),
    lireLien(supabase, id),
    statsLues,
    amisDe(id, supabase, 12),
    lireNom(supabase, id),
    // les blocs de la page, comme sur le profil
    admin ? getTopicAverages(admin) : Promise.resolve({} as Record<string, number | null>),
    getAnswerStats(supabase, id, { detail: false }).catch(() => null),
    trophees(supabase, id),
    progression(supabase, id),
    statsLues.then((s) => sceauxDuJoueur(id, s)),
    datesDuPic(supabase, id),
  ]);

  const xpTotal = Number(profil.xp_total ?? 0) || 0;
  const lvl = levelInfoFromXp(xpTotal);
  const elo = rating?.elo ?? DEFAULT_ELO;
  const carte: EnteteData = {
    id,
    name: displayName(profil.username, id),
    nomComplet: nom?.nom ?? null,
    avatarUrl: profil.avatar_url ?? null,
    style,
    niveau: lvl.level,
    levelPct: Math.round(lvl.progressPct * 100),
    xpTotal,
    elo,
    mastery: masteries.get(id) ?? null,
    place,
    gamesPlayed: rating?.games_played ?? 0,
    linkedin: lien?.linkedin ?? null,
    amis: amis ? amis.total : null,
    pic: stats.palierMax,
  };

  return (
    <div className="rl-wide rl-page">
      <Personnaliser
        carte={carte}
        stats={stats}
        acquis={acquisDe(stats, sceaux.etats, datesPic)}
        initial={style}
        pins={posesDe(sceaux.etats, sceaux.base ? pins : null).map((e) => e.def.cle)}
        base={sceaux.base}
        linkedin={lien?.linkedin ?? null}
        visibilite={lien?.visibilite ?? LIEN_DEFAUT.visibilite}
        nom={nom ?? NOM_DEFAUT}
        disponible={disponible}
        moyennes={moyennes}
        amis={amis}
        banqueGifs={!!process.env.KLIPY_API_KEY}
        rendus={{
          reponses: answers?.available ? <AnswerSummary stats={answers} name={carte.name} isMe /> : null,
          trophees: <PracticeTrophies rows={trophyRows} />,
          progression: <PracticeProgressChart pastSessions={progress} topicLabels={TOPIC_LABELS} />,
        }}
      />
    </div>
  );
}
