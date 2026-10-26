import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboardRank, getMyRating } from "@/lib/rating";
import { getTopicAverages, getTopicMastery, programMastery } from "@/lib/mastery";
import { calcStreakAndToday, levelInfoFromXp, type XpDay } from "@/lib/leveling";
import type { GroupRow } from "@/components/GroupSettings";
import { MoiView } from "@/components/moi/MoiView";
import { SettingsPanel } from "@/components/moi/SettingsPanel";
import { buildTopicStats, parseMoiTab, xpLastDays, xpThisWeek } from "@/components/moi/data";
import { NO_ERRORS, getFicheErrors } from "@/components/moi/errors-data";
import { getRatures } from "@/components/moi/ratures-data";
import { construirePointsFaibles, libellesNotions, lireBanqueQcm, lireBasePointsFaibles } from "@/components/moi/points-faibles-data";
import { avecAtelier, lireEtatAtelier, lireHistoriqueAteliers } from "@/app/atelier/donnees";
import { getMarquees } from "@/components/moi/marquees-data";
import { compterCartesMarquees, lireCartesMarquees } from "@/lib/flashcards/marquees";
import { getSessionHistory } from "@/components/moi/history-data";
import { getAnswerStats } from "@/lib/answer-stats";
import { countPlayers, tryAdmin } from "@/components/classement/data";
import { displayName } from "@/components/classement/format";
import { loadActivity, parisDay, parisHour } from "@/components/accueil/queries";
import { joursEncreUnifies, lireSerieEncre } from "@/lib/serie-encre";
import type { MoiData } from "@/components/moi/types";
import { etatObjectif, reglageInitial } from "@/lib/objectif";
import { lireTrophees } from "@/lib/trophees";
import { lireEtagere } from "@/components/moi/pieces-data";
import { MesPieces } from "@/components/moi/MesPieces";
import { lirePauses } from "@/components/moi/repos-data";
import { lireCodexMoi } from "@/lib/profil/codex-moi";
import { lireSobre } from "@/lib/codex/sobre";
import { lireTempsSite } from "@/lib/temps-site";

export const metadata = { title: "Moi · Ranked Lobby" };

type ProfileRow = {
  username: string | null;
  avatar_url: string | null;
  xp_total: number | null;
  exam_date?: string | null;
  active_group_id: string | null;
} | null;

// Espace « Moi » : en-tête (profil, rang compact) puis des onglets liables
// avec ?onglet=stats|erreurs|marquees|pieces|reglages. Chaque lecture dégrade
// proprement. L'étagère « Mes pièces » n'est lue que sur son onglet.
export default async function MoiPage({ searchParams }: { searchParams?: Promise<{ onglet?: string; vue?: string }> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const tab = parseMoiTab((await searchParams)?.onglet) ?? "stats";
  // Moi › Marquées : questions ou flashcards (?vue=questions|flashcards, sinon au choix de la page)
  const vueParam = (await searchParams)?.vue;
  const vueMarquees = vueParam === "flashcards" || vueParam === "questions" ? vueParam : undefined;
  const admin = tryAdmin();
  const now = Date.now();

  const profileCall = (async (): Promise<ProfileRow> => {
    const full = await supabase.from("profiles").select("username,avatar_url,xp_total,exam_date,active_group_id").eq("id", user.id).maybeSingle();
    if (!full.error) return full.data as ProfileRow;
    // colonne exam_date absente (ancienne base)
    const basic = await supabase.from("profiles").select("username,avatar_url,xp_total,active_group_id").eq("id", user.id).maybeSingle();
    return basic.data as ProfileRow;
  })();

  // les trophées : seulement sur Stats (la Salle des trophées) et Mes pièces (l'étagère les reprend)
  const tropheesLus = tab === "stats" || tab === "pieces" ? lireTrophees(supabase, user.id).catch(() => null) : Promise.resolve(null);

  const xpCall = (async (): Promise<XpDay[]> => {
    try {
      const { data } = await supabase.rpc("get_xp_daily", { p_days: 90 });
      if (!Array.isArray(data)) return [];
      return data.map((d: { day: string; xp: number }) => ({ day: String(d.day).slice(0, 10), xp: Number(d.xp ?? 0) || 0 }));
    } catch {
      return [];
    }
  })();

  const [profile, rating, topics, averages, myRank, totalPlayers, xpDays, carnet, groupsRes, sessions, answers, activity, marquees, basePointsFaibles, banqueQcm, atelier, ateliers, serieBase, trophees, pieces, repos, codex, cartesMarquees, nCartesMarquees, temps] = await Promise.all([
    profileCall,
    getMyRating(supabase, user.id),
    getTopicMastery(supabase, user.id),
    admin ? getTopicAverages(admin) : Promise.resolve({} as Record<string, number | null>),
    getLeaderboardRank(supabase, user.id),
    countPlayers(supabase),
    xpCall,
    // le carnet de ratures (toutes sources, et par notion) ; sans la migration, l'ancien carnet des fiches
    (async () => {
      const ratures = await getRatures(supabase, libellesNotions);
      return { ratures, errors: ratures.available ? NO_ERRORS : await getFicheErrors(supabase, admin ?? supabase, user.id, now) };
    })(),
    supabase.from("group_memberships").select("group_id, study_groups(id,name,invite_code)").eq("user_id", user.id),
    getSessionHistory(supabase, user.id, now),
    // questions répondues, toutes sources : le client admin lit aussi les
    // réponses de duels (sans policy), toujours filtrées sur ce joueur
    getAnswerStats(admin ?? supabase, user.id, { privileged: !!admin, now }),
    // questions répondues par jour : la série compte aussi les jours sans XP
    // (même calcul que l'accueil)
    loadActivity(supabase, user.id, new Date(now)),
    // les questions marquées (Moi › Marquées)
    getMarquees(supabase),
    // « Tes points faibles » : par notion (migration_notions.sql), sinon les ratures par thème (vide tant que migration_points_faibles.sql manque)
    lireBasePointsFaibles(supabase),
    // les QCM de la banque (un QCM recréé retrouve son thème ; les QCM d'une notion)
    lireBanqueQcm(admin ?? supabase),
    // l'Atelier : ouvert (migration_atelier.sql) et, s'il y en a un, celui en cours
    lireEtatAtelier(supabase, user.id),
    // les Ateliers clos (historique, Stats)
    lireHistoriqueAteliers(supabase, user.id),
    // la série d'encre (null tant que migration_serie_encre.sql n'est pas collée : l'ancien calcul)
    lireSerieEncre(supabase),
    // la Salle des trophées : toutes les sources, sinon l'entraînement ciblé seul (repli sans bruit) ;
    // lue une fois, seulement sur les onglets qui la montrent (Stats, Mes pièces)
    tropheesLus,
    // Mes pièces : l'étagère et ce qu'il porte (sur son onglet seulement), avec les mêmes trophées
    tab === "pieces" ? lireEtagere(supabase, admin, user.id, tropheesLus).catch(() => null) : Promise.resolve(null),
    // les jours de repos de la série déjà posés (Réglages ; null sans la migration du Codex §8)
    tab === "reglages" ? lirePauses(supabase, new Date(now)) : Promise.resolve(null),
    // le Codex vu de Moi (la tuile d'entrée et l'historique) : une lecture légère, sur Stats seulement
    tab === "stats" ? lireCodexMoi(supabase, user.id, { sobre: lireSobre(user) }) : Promise.resolve(null),
    // les flashcards marquées (Moi › Marquées), sur leur onglet seulement
    tab === "marquees" ? lireCartesMarquees(supabase) : Promise.resolve(null),
    // leur nombre, pour la tuile « Marquées » de Stats (un comptage léger ; null sans la table)
    tab === "stats" ? compterCartesMarquees(supabase) : Promise.resolve(null),
    // le temps sur le site, ses totaux (tuile de Stats ; null sans migration_temps_site.sql)
    tab === "stats" ? lireTempsSite(supabase, user.id) : Promise.resolve(null),
  ]);

  // l'objectif de questions d'ici l'examen : la courbe (Stats) et le réglage
  const objectif = await etatObjectif(user, activity.today);

  const xpTotal = Number(profile?.xp_total ?? 0) || 0;
  const lvl = levelInfoFromXp(xpTotal);
  // UNE seule série : celle d'encre (10 questions, joker) quand la migration est collée, l'ancien calcul sinon
  const ancien = calcStreakAndToday(xpDays, { today: parisDay(new Date(now)), actifs: activity.activeDays });
  const { streak, dayState, serie: serieEncre, reste: serieReste } = joursEncreUnifies(serieBase, activity.today, parisHour(new Date(now)), ancien);
  const last30 = xpLastDays(xpDays, 30, new Date(now));

  const d: MoiData = {
    userId: user.id,
    name: displayName(profile?.username, user.id),
    avatarUrl: profile?.avatar_url ?? null,
    examDate: profile?.exam_date ?? null,
    streak,
    dayState,
    serieReste,
    serieSeuil: serieEncre?.seuil ?? null,
    serieJoker: serieEncre && serieEncre.serieAffichee > 0 ? serieEncre.joker : null,
    xpTotal,
    level: lvl.level,
    levelPct: Math.round(lvl.progressPct * 100),
    xpToNextLevel: lvl.xpToNextLevel,
    xpWeek: xpThisWeek(xpDays),
    xp30: last30.xp,
    activeDays30: last30.active,
    xpDays,
    me: { elo: rating.elo, gamesPlayed: rating.gamesPlayed, mastery: programMastery(topics), leaderboardRank: myRank, totalPlayers },
    topics: buildTopicStats(topics, averages),
    errors: carnet.errors,
    ratures: carnet.ratures,
    marquees,
    ...(cartesMarquees ? { cartesMarquees } : {}),
    ...(nCartesMarquees !== null ? { nCartesMarquees } : {}),
    sessions,
    answers,
    objectif,
    pointsFaibles: avecAtelier(construirePointsFaibles(answers, basePointsFaibles, banqueQcm, now), atelier, !!admin),
    ateliers,
    ...(trophees ? { trophees: { lignes: trophees.lignes, complet: trophees.complet } } : {}),
    ...(codex ? { codex } : {}),
    ...(temps ? { temps } : {}),
  };

  const etagere = pieces ? (
    <MesPieces
      etagere={pieces.etagere}
      disponible={pieces.disponible}
      carte={{
        id: user.id,
        name: d.name,
        nomComplet: pieces.nomComplet,
        titre: pieces.titre,
        avatarUrl: d.avatarUrl,
        style: pieces.style,
        niveau: d.level,
        levelPct: d.levelPct,
        xpTotal,
        elo: rating.elo,
        mastery: d.me.mastery,
        place: myRank,
        gamesPlayed: rating.gamesPlayed,
        linkedin: null,
        amis: null,
        pic: pieces.stats.palierMax,
      }}
    />
  ) : null;

  return (
    <MoiView
      d={d}
      tab={tab}
      vueMarquees={vueMarquees}
      now={now}
      pieces={etagere}
      settings={
        <SettingsPanel
          activeGroupId={profile?.active_group_id ?? null}
          groups={(groupsRes.data ?? []) as unknown as GroupRow[]}
          objectif={reglageInitial(objectif)}
          sobre={user.user_metadata?.rl_sobre === true}
          repos={repos}
        />
      }
    />
  );
}
