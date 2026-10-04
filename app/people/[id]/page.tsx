import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Eye, Palette, UserCheck, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { XpBarChart, type XpDay } from "@/components/XpBarChart";
import { PracticeTrophies } from "@/components/PracticeTrophies";
import { PracticeProgressChart } from "@/components/PracticeProgressChart";
import { TOPIC_LABELS } from "@/lib/practiceTopics";
import { levelInfoFromXp } from "@/lib/leveling";
import { getLeaderboardRank } from "@/lib/rating";
import { DEFAULT_ELO } from "@/lib/ranks";
import { getTopicAverages } from "@/lib/mastery";
import { masteryByUser, tryAdmin } from "@/components/classement/data";
import { displayName } from "@/components/classement/format";
import { AnswerSummary } from "@/components/moi/AnswerSummary";
import { getAnswerStats } from "@/lib/answer-stats";
import { Icone } from "@/components/adn/icons";
import { EnteteJoueur, type EnteteData } from "@/components/profil/EnteteJoueur";
import { ListeAmis, Vitrine } from "@/components/profil/Vitrine";
import { RadarComparable } from "@/components/profil/RadarComparable";
import { GrilleBlocs } from "@/components/profil/Blocs";
import { rankFor } from "@/lib/ranks";
import { AmiBouton } from "@/components/profil/AmiBouton";
import { amisDe, lireLien, lireNom, lireStyle, relationAvec, statsProfil } from "@/lib/profil/donnees";
import { JOUEURS } from "@/lib/voice-z2a";
import type { Profile, Rating } from "@/lib/types";

type PageProps = { params: Promise<{ id: string }>; searchParams?: Promise<{ vue?: string }> };
type ProfileRow = Pick<Profile, "id" | "username" | "avatar_url" | "xp_total">;
type RatingRow = Pick<Rating, "elo" | "games_played">;

// Profil d'un joueur, façon jeu vidéo : l'en-tête sur toute la largeur
// (bannière du joueur, sceau dans son cadre, pseudo, prénom et nom selon
// leur visibilité, niveau, bio, LinkedIn selon sa visibilité, son rang en
// grand), puis les blocs dans l'ordre et à la largeur choisis par le joueur
// (vitrine, radar des matières, amis, questions répondues, trophées,
// progression, ses images et GIF ; GrilleBlocs). Sur son propre profil : personnaliser, et « voir
// comme les autres » (?vue=inconnu ou ?vue=ami) qui rend la page telle
// qu'un autre joueur la voit, LinkedIn compris.
export default async function PersonProfilePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const vueParam = (await searchParams)?.vue;
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const [{ data: profileData }, { data: ratingData }] = await Promise.all([
    supabase.from("profiles").select("id,username,avatar_url,xp_total").eq("id", id).maybeSingle(),
    supabase.from("ratings").select("elo,games_played").eq("user_id", id).maybeSingle(),
  ]);
  if (!profileData) notFound();

  const isMe = user.id === id;
  // « voir comme les autres » : seulement sur son propre profil
  const vue = isMe && (vueParam === "inconnu" || vueParam === "ami") ? vueParam : null;
  const commeMoi = isMe && !vue;

  const admin = tryAdmin();
  // celui qui regarde le profil d'un autre : ses matières et sa couleur, pour « Me comparer »
  const autreJoueur = !isMe;
  const [leaderboardRank, masteries, answers, { style }, stats, relation, lienBrut, amis, nomBrut, moyennes, mesStats, monStyle] = await Promise.all([
    getLeaderboardRank(supabase, id),
    masteryByUser(admin, [id]),
    // résumé seulement (matières et sources, sans passages) ; les réponses
    // d'un autre joueur ne se lisent qu'avec le client admin
    admin ? getAnswerStats(admin, id, { privileged: true, detail: false }) : isMe ? getAnswerStats(supabase, id, { detail: false }) : Promise.resolve(null),
    lireStyle(supabase, id),
    statsProfil(id, supabase),
    relationAvec(supabase, user.id, id),
    // la base ne rend le LinkedIn que s'il est visible pour moi
    lireLien(supabase, id),
    amisDe(id, supabase, 12),
    // prénom et nom : la base ne les rend que s'ils sont visibles pour moi
    lireNom(supabase, id),
    admin ? getTopicAverages(admin) : Promise.resolve({} as Record<string, number | null>),
    autreJoueur ? statsProfil(user.id, supabase) : Promise.resolve(null),
    autreJoueur ? lireStyle(supabase, user.id) : Promise.resolve(null),
  ]);

  // ce que voit l'autre : le lien public pour un inconnu, public ou « amis » pour un ami
  const visible = (v: string) => (!vue ? true : v === "public" || (vue === "ami" && v === "friends"));
  const lien = lienBrut?.linkedin && visible(lienBrut.visibilite) ? lienBrut.linkedin : null;
  const nomComplet = nomBrut?.nom && visible(nomBrut.visibilite) ? nomBrut.nom : null;

  const profile = profileData as ProfileRow;
  const rating = ratingData as RatingRow | null;
  const display = displayName(profile.username, id);
  const xpTotal = Number(profile.xp_total ?? 0) || 0;
  const lvl = levelInfoFromXp(xpTotal);
  const elo = rating?.elo ?? DEFAULT_ELO;
  const mastery = masteries.get(id) ?? null;
  const rank = rankFor(elo, mastery, leaderboardRank);

  let xpDaily: XpDay[] | null = null;
  if (commeMoi) {
    try {
      const { data } = await supabase.rpc("get_xp_daily", { p_days: 90 });
      if (Array.isArray(data)) xpDaily = data.slice(0, 90).map((d: { day: string; xp: number }) => ({ day: String(d.day), xp: Number(d.xp ?? 0) || 0 }));
    } catch {
      // fonction pas encore créée
    }
  }

  let trophyRows: { topic_count: number; trophy_count: number }[] = [];
  try {
    const { data } = await supabase.rpc("get_user_practice_trophies", { p_user_id: id });
    if (Array.isArray(data)) trophyRows = data.map((r: { topic_count: number; trophy_count: number }) => ({ topic_count: Number(r.topic_count ?? 0) || 0, trophy_count: Number(r.trophy_count ?? 0) || 0 }));
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

  const entete: EnteteData = {
    id,
    name: display,
    nomComplet,
    avatarUrl: profile.avatar_url ?? null,
    style,
    niveau: lvl.level,
    levelPct: Math.round(lvl.progressPct * 100),
    xpTotal,
    elo,
    mastery,
    place: leaderboardRank,
    gamesPlayed: rating?.games_played ?? 0,
    linkedin: lien,
    amis: amis ? amis.total : null,
  };

  // les actions : les miennes, celles d'un autre joueur, ou leur aperçu (inertes)
  let actions: React.ReactNode;
  if (commeMoi) {
    actions = (
      <>
        <Link href="/moi/profil" className="btn btn-primary rl-press">
          <Palette size={15} aria-hidden /> Personnaliser
        </Link>
        <Link href={`/people/${id}?vue=inconnu`} className="btn btn-secondary rl-press">
          <Eye size={15} aria-hidden /> Voir comme les autres
        </Link>
      </>
    );
  } else if (vue) {
    actions = (
      <>
        <span className="btn btn-primary pointer-events-none" aria-disabled>
          <Icone nom="duel" size={17} /> {JOUEURS.defier(display)}
        </span>
        <span className="btn btn-secondary pointer-events-none" aria-disabled>
          {vue === "ami" ? <UserCheck size={15} aria-hidden /> : <UserPlus size={15} aria-hidden />} {vue === "ami" ? "Amis" : "Ajouter en ami"}
        </span>
      </>
    );
  } else {
    actions = (
      <>
        <Link href={`/duel?adversaire=${encodeURIComponent(id)}`} className="btn btn-primary rl-press">
          <Icone nom="duel" size={17} /> {JOUEURS.defier(display)}
        </Link>
        <AmiBouton autre={id} relation={relation} />
      </>
    );
  }

  // le bandeau d'aperçu dit ce qui est visible ou masqué pour cet autre joueur
  const visibles = [
    lienBrut?.linkedin ? (lien ? "ton LinkedIn est visible" : "ton LinkedIn est masqué") : null,
    nomBrut?.nom ? (nomComplet ? "ton prénom et ton nom sont visibles" : "ton prénom et ton nom sont masqués") : null,
  ].filter(Boolean) as string[];

  const retour = (
    <Link href="/people" className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[color-mix(in_oklab,var(--paper)_82%,transparent)] px-3 py-1.5 text-[13px] font-semibold text-muted backdrop-blur hover:text-white">
      <ArrowLeft size={14} aria-hidden /> {JOUEURS.retour}
    </Link>
  );

  return (
    <div className="rl-wide rl-page">
      <div className="flex flex-col gap-6 md:gap-8">
        <EnteteJoueur d={entete} actions={actions} haut={vue ? undefined : retour} kicker={commeMoi ? JOUEURS.kickerMoi : JOUEURS.kickerAutre} rangDe={isMe ? "Ton rang" : "Son rang"} />
        {vue && (
          <div className="card-quiet flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4" role="status">
            <Eye size={17} aria-hidden className="shrink-0" />
            <p className="m-0 min-w-0 flex-[1_1_260px] text-[14px]">
              <b className="font-semibold">Aperçu.</b> Ton profil tel que le voit {vue === "ami" ? "un de tes amis" : "un joueur qui n'est pas ton ami"}
              {visibles.length ? ` : ${visibles.join(", ")}.` : "."}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/people/${id}?vue=${vue === "ami" ? "inconnu" : "ami"}`} className="btn btn-secondary btn-sm">
                Voir comme {vue === "ami" ? "un inconnu" : "un ami"}
              </Link>
              <Link href={`/people/${id}`} className="btn btn-ghost btn-sm">
                Revenir
              </Link>
            </div>
          </div>
        )}
      </div>

      <GrilleBlocs
        disposition={style.disposition}
        rendus={{
          vitrine: <Vitrine style={style} stats={stats} rang={{ tierIndex: rank.tierIndex, division: rank.division, elo, mastery }} />,
          radar: (
            <RadarComparable
              matieres={stats.matieres}
              moyennes={moyennes}
              accent={style.accent}
              nom={display}
              moi={isMe}
              miennes={mesStats ? mesStats.matieres : null}
              monAccent={monStyle ? monStyle.style.accent : null}
            />
          ),
          amis: amis ? <ListeAmis amis={amis.amis} total={amis.total} moi={commeMoi} /> : null,
          reponses: answers?.available ? <AnswerSummary stats={answers} name={display} isMe={commeMoi} /> : null,
          trophees: <PracticeTrophies rows={trophyRows} />,
          progression: <PracticeProgressChart pastSessions={progressSessions} topicLabels={TOPIC_LABELS} />,
        }}
      />

      {/* l'XP par jour : pour soi seulement, hors disposition */}
      {commeMoi && xpDaily && <XpBarChart data={xpDaily} title="XP gagnée par jour (90 jours)" />}
    </div>
  );
}
