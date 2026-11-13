import { joursAvantExamen } from "@/lib/codex/moteur";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboardRank, getMyRating } from "@/lib/rating";
import { getTopicMastery, programMastery } from "@/lib/mastery";
import { levelInfoFromXp } from "@/lib/leveling";
import type { GroupRow } from "@/components/GroupSettings";
import { MoiView } from "@/components/moi/MoiView";
import { OngletParAncre } from "@/components/moi/Clients";
import { activitesDe } from "@/lib/activites";
import { getAnswerStats } from "@/lib/answer-stats";
import { ActivitesView } from "@/components/moi/ActivitesView";
import { ConstanceAttente, ConstanceMatieres } from "@/components/moi/synthese/ConstanceMatieres";
import { lireSynthese } from "@/components/moi/synthese/donnees";
import { SyntheseView } from "@/components/moi/synthese/SyntheseView";
import { SettingsPanel } from "@/components/moi/SettingsPanel";
import { parseMoiTab } from "@/components/moi/data";
import { NO_ERRORS, getFicheErrors } from "@/components/moi/errors-data";
import { getRatures } from "@/components/moi/ratures-data";
import { libellesNotions } from "@/components/moi/points-faibles-data";
import { getMarquees } from "@/components/moi/marquees-data";
import { lireCartesMarquees } from "@/lib/flashcards/marquees";
import { tryAdmin } from "@/components/classement/data";
import { displayName } from "@/components/classement/format";
import { traitsDuJour } from "@/components/adn/AnneauDuJourData";
import type { MoiData } from "@/components/moi/types";
import { etatObjectif, reglageInitial } from "@/lib/objectif";
import { lireTrophees } from "@/lib/trophees";
import { lireEtagere } from "@/components/moi/pieces-data";
import { MesPieces } from "@/components/moi/MesPieces";
import { lirePauses } from "@/components/moi/repos-data";
import { DOSSIER } from "@/lib/voice-moi";

export const metadata = { title: "Moi · Ranked Lobby" };

type ProfileRow = {
  username: string | null;
  avatar_url: string | null;
  xp_total: number | null;
  exam_date?: string | null;
  active_group_id: string | null;
} | null;

// Espace « Moi » : des onglets liables avec ?onglet=stats|erreurs|marquees|pieces|reglages.
// L'onglet stats (par défaut) est « La synthèse » (maquette D) : une branche à part,
// qui ne lit que ses propres sources (components/moi/synthese/donnees.ts). Les autres
// onglets lisent ici ce qu'ils montrent ; chaque lecture dégrade proprement. L'étagère
// « Mes pièces », les jours de repos et les flashcards marquées ne sont lus que sur leur onglet.
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

  if (tab === "activites") {
    const stats = await getAnswerStats(admin ?? supabase, user.id, { privileged: !!admin, now, ratees: true }).catch(() => null);
    return <ActivitesView activites={activitesDe(stats)} now={now} />;
  }

  if (tab === "stats") {
    return (
      <>
        <OngletParAncre />
        <SyntheseView
          s={await lireSynthese(supabase, admin, user, now)}
          constance={
            <Suspense fallback={<ConstanceAttente />}>
              <ConstanceMatieres lire={() => getAnswerStats(admin ?? supabase, user.id, { privileged: !!admin, now })} now={now} />
            </Suspense>
          }
        />
      </>
    );
  }

  const profileCall = (async (): Promise<ProfileRow> => {
    const full = await supabase.from("profiles").select("username,avatar_url,xp_total,exam_date,active_group_id").eq("id", user.id).maybeSingle();
    if (!full.error) return full.data as ProfileRow;
    // colonne exam_date absente (ancienne base)
    const basic = await supabase.from("profiles").select("username,avatar_url,xp_total,active_group_id").eq("id", user.id).maybeSingle();
    return basic.data as ProfileRow;
  })();

  // les trophées : seulement sur Mes pièces (l'étagère les reprend)
  const tropheesLus = tab === "pieces" ? lireTrophees(supabase, user.id).catch(() => null) : Promise.resolve(null);

  const [profile, rating, topics, myRank, carnet, groupsRes, marquees, pieces, repos, cartesMarquees, objectif] = await Promise.all([
    profileCall,
    getMyRating(supabase, user.id),
    getTopicMastery(supabase, user.id),
    getLeaderboardRank(supabase, user.id),
    // le carnet de ratures (toutes sources, et par notion) ; sans la migration, l'ancien carnet des fiches
    (async () => {
      const ratures = await getRatures(supabase, libellesNotions);
      return { ratures, errors: ratures.available ? NO_ERRORS : await getFicheErrors(supabase, admin ?? supabase, user.id, now) };
    })(),
    supabase.from("group_memberships").select("group_id, study_groups(id,name,invite_code)").eq("user_id", user.id),
    // les questions marquées (Moi › Marquées)
    getMarquees(supabase),
    // Mes pièces : l'étagère et ce qu'il porte (sur son onglet seulement), avec les mêmes trophées
    tab === "pieces" ? lireEtagere(supabase, admin, user.id, tropheesLus).catch(() => null) : Promise.resolve(null),
    // les jours de repos de la série déjà posés (Réglages ; null sans la migration du Codex §8)
    tab === "reglages" ? lirePauses(supabase, new Date(now)) : Promise.resolve(null),
    // les flashcards marquées (Moi › Marquées), sur leur onglet seulement
    tab === "marquees" ? lireCartesMarquees(supabase) : Promise.resolve(null),
    // l'objectif de questions d'ici l'examen (le réglage « Ton examen ») ; le jour vient de la même lecture que la barre du haut
    traitsDuJour(user.id).then((jour) => etatObjectif(user, jour ?? 0)),
  ]);

  const xpTotal = Number(profile?.xp_total ?? 0) || 0;
  const lvl = levelInfoFromXp(xpTotal);

  const d: MoiData = {
    userId: user.id,
    name: displayName(profile?.username, user.id),
    avatarUrl: profile?.avatar_url ?? null,
    examDate: profile?.exam_date ?? null,
    xpTotal,
    level: lvl.level,
    levelPct: Math.round(lvl.progressPct * 100),
    xpToNextLevel: lvl.xpToNextLevel,
    me: { elo: rating.elo, gamesPlayed: rating.gamesPlayed, mastery: programMastery(topics), leaderboardRank: myRank, totalPlayers: null },
    errors: carnet.errors,
    ratures: carnet.ratures,
    marquees,
    ...(cartesMarquees ? { cartesMarquees } : {}),
    objectif,
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

  // les réglages : le chiffre-héros de la porte, les jours avant l'examen (jour de Paris, comme l'objectif)
  const reglage = tab === "reglages" ? reglageInitial(objectif) : null;
  const joursAvant = reglage?.examen ? joursAvantExamen(reglage.aujourdhui.slice(0, 10), reglage.examen.slice(0, 10)) : null;
  // la ligne d'état des réglages : l'objectif et ce qui est déjà posé (sans J-n : il est en héros)
  const ligneReglages = reglage?.meta ? DOSSIER.reglages.ligne(reglage.meta.total, reglage.avant + reglage.jour) : null;
  const herosReglages =
    joursAvant === null || Number.isNaN(joursAvant)
      ? null
      : joursAvant >= 0
        ? { valeur: `J-${joursAvant}`, legende: DOSSIER.reglages.herosJ }
        : { valeur: `J+${-joursAvant}`, legende: DOSSIER.reglages.herosPasse };

  return (
    <MoiView
      d={d}
      tab={tab}
      herosReglages={herosReglages}
      ligneReglages={ligneReglages}
      vueMarquees={vueMarquees}
      now={now}
      pieces={etagere}
      settings={
        <SettingsPanel
          activeGroupId={profile?.active_group_id ?? null}
          groups={(groupsRes.data ?? []) as unknown as GroupRow[]}
          objectif={reglage ?? reglageInitial(objectif)}
          sobre={user.user_metadata?.rl_sobre === true}
          repos={repos}
        />
      }
    />
  );
}
