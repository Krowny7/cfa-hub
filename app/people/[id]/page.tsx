import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowLeft, ChevronRight, Eye, Palette, UserCheck, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PracticeTrophies } from "@/components/PracticeTrophies";
import { PracticeProgressChart } from "@/components/PracticeProgressChart";
import { TOPIC_LABELS } from "@/lib/practiceTopics";
import { levelInfoFromXp } from "@/lib/leveling";
import { getLeaderboardRank, getMyRating } from "@/lib/rating";
import { DEFAULT_ELO, rankFor } from "@/lib/ranks";
import { getTopicAverages } from "@/lib/mastery";
import { masteryByUser, tryAdmin } from "@/components/classement/data";
import { displayName } from "@/components/classement/format";
import { AnswerSummary } from "@/components/moi/AnswerSummary";
import { getAnswerStats } from "@/lib/answer-stats";
import { Icone } from "@/components/adn/icons";
import { EnteteJoueur, type EnteteData } from "@/components/profil/EnteteJoueur";
import { ListeAmis, Vitrine } from "@/components/profil/Vitrine";
import { RadarComparable } from "@/components/profil/RadarComparable";
import { CaseImage, GrilleBlocs } from "@/components/profil/Blocs";
import { AmbianceProfil } from "@/components/profil/Pieces";
import { AmiBouton } from "@/components/profil/AmiBouton";
import { OngletsProfil } from "@/components/profil/OngletsProfil";
import { SceauxPoses } from "@/components/profil/SceauxPoses";
import { Collection } from "@/components/profil/Collection";
import { BatonsDuels, FaceAFace } from "@/components/profil/FaceAFace";
import { Revanche } from "@/components/profil/Revanche";
import { Journal } from "@/components/profil/Journal";
import { amisDe, lireLien, lireNom, lireStyle, relationAvec, statsProfil } from "@/lib/profil/donnees";
import { blocsDe } from "@/lib/profil/disposition";
import { faceAFace, type FaceAFace as Bilan } from "@/lib/profil/face-a-face";
import { journalDe } from "@/lib/profil/journal";
import { hrefOnglet, ongletDepuis, ongletsDe } from "@/lib/profil/onglets";
import { MARCHES, aPortee, marchesGagnees, posesDe, sceauxDe } from "@/lib/profil/sceaux";
import { stakesAgainst } from "@/lib/duels";
import { nombre } from "@/lib/voice";
import { JOUEURS } from "@/lib/voice-z2a";
import { ENTETE, FACE } from "@/lib/voice-profil";
import type { Profile, Rating } from "@/lib/types";

type PageProps = { params: Promise<{ id: string }>; searchParams?: Promise<{ vue?: string; onglet?: string }> };
type ProfileRow = Pick<Profile, "id" | "username" | "avatar_url" | "xp_total">;
type RatingRow = Pick<Rating, "elo" | "games_played">;
type ProgressRow = { id: string; topics: string[]; format: number; score: number; total: number; completed_at: string };

const SANS_DUEL: Bilan = { duels: [], victoires: 0, defaites: 0, nuls: 0, ouvert: null };

async function trophees(sb: SupabaseClient, id: string) {
  try {
    const { data } = await sb.rpc("get_user_practice_trophies", { p_user_id: id });
    return Array.isArray(data) ? data.map((r: { topic_count: number; trophy_count: number }) => ({ topic_count: Number(r.topic_count ?? 0) || 0, trophy_count: Number(r.trophy_count ?? 0) || 0 })) : [];
  } catch {
    return []; // fonction pas encore créée
  }
}

async function progression(sb: SupabaseClient, id: string): Promise<ProgressRow[]> {
  try {
    const { data } = await sb.rpc("get_user_practice_progress", { p_user_id: id });
    return Array.isArray(data) ? (data as ProgressRow[]) : [];
  } catch {
    return []; // fonction pas encore créée
  }
}

// Profil d'un joueur, façon jeu vidéo : l'en-tête sur toute la largeur
// (bannière, sceau dans son cadre, pseudo, prénom et nom selon leur
// visibilité, rang et pic, niveau, bio, LinkedIn selon sa visibilité, ses 3
// sceaux posés), puis des onglets collants : Profil (les blocs dans l'ordre
// et à la largeur choisis par le joueur, GrilleBlocs), Sceaux (la
// collection), Journal (courbe d'ELO, carnet de jours, fil) et, sur le
// profil d'un autre, Face-à-face. L'onglet est dans l'URL (?onglet=sceaux)
// et chaque onglet ne lit que ses données. Sur son
// propre profil : personnaliser, et « voir comme les autres » (?vue=inconnu
// ou ?vue=ami) qui rend la page telle qu'un autre joueur la voit.
export default async function PersonProfilePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
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
  const vue = isMe && (sp.vue === "inconnu" || sp.vue === "ami") ? sp.vue : null;
  const commeMoi = isMe && !vue;
  // celui qui regarde le profil d'un autre : le face-à-face, ses matières et sa couleur pour comparer
  const autreJoueur = !isMe;
  const onglet = ongletDepuis(sp.onglet, autreJoueur);
  const admin = tryAdmin();

  // l'onglet ouvert : ses lectures seulement (celles de Profil suivent les blocs de la page)
  const styleLu = lireStyle(supabase, id);
  const lecturesOnglet = (async () => {
    const blocs = new Set(onglet === "profil" ? blocsDe((await styleLu).style.disposition).map((b) => b.k) : []);
    const radar = blocs.has("radar") || onglet === "face-a-face";
    const [moyennes, mesStats, monStyle, answers, trophyRows, progressSessions, monRating] = await Promise.all([
      radar && admin ? getTopicAverages(admin) : Promise.resolve({} as Record<string, number | null>),
      radar && autreJoueur ? statsProfil(user.id, supabase) : Promise.resolve(null),
      radar && autreJoueur ? lireStyle(supabase, user.id) : Promise.resolve(null),
      // résumé seulement (matières et sources, sans passages) ; les réponses
      // d'un autre joueur ne se lisent qu'avec le client admin
      !blocs.has("reponses")
        ? Promise.resolve(null)
        : admin
          ? getAnswerStats(admin, id, { privileged: true, detail: false })
          : isMe
            ? getAnswerStats(supabase, id, { detail: false })
            : Promise.resolve(null),
      blocs.has("trophees") ? trophees(supabase, id) : Promise.resolve([]),
      blocs.has("progression") ? progression(supabase, id) : Promise.resolve([] as ProgressRow[]),
      onglet === "face-a-face" ? getMyRating(supabase, user.id) : Promise.resolve(null),
    ]);
    return { moyennes, mesStats, monStyle, answers, trophyRows, progressSessions, monRating };
  })();
  // les exploits (le pic, les sceaux) et la maîtrise du rang : l'en-tête et le Journal
  const statsLues = statsProfil(id, supabase);
  const maitrisesLues = masteryByUser(admin, [id]);
  // le Journal : la courbe avec mon client (rating_events est lisible par tous), les victoires avec le client admin
  const journalLu = (async () => {
    if (onglet !== "journal") return null;
    const [stats, masteries] = await Promise.all([statsLues, maitrisesLues]);
    return journalDe({ id, sb: supabase, admin, stats, mastery: masteries.get(id) ?? null });
  })();

  // l'en-tête, commun aux onglets
  const [leaderboardRank, masteries, { style }, stats, relation, lienBrut, amis, nomBrut, face, o, journal] = await Promise.all([
    getLeaderboardRank(supabase, id),
    maitrisesLues,
    styleLu,
    statsLues,
    relationAvec(supabase, user.id, id),
    // la base ne rend le LinkedIn que s'il est visible pour moi
    lireLien(supabase, id),
    amisDe(id, supabase, 12),
    // prénom et nom : la base ne les rend que s'ils sont visibles pour moi
    lireNom(supabase, id),
    // nos duels, lus avec mon client (je ne lis que les miens)
    autreJoueur ? faceAFace(supabase, user.id, id) : Promise.resolve(null),
    lecturesOnglet,
    journalLu,
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

  // les sceaux : la collection, les 3 posés d'office, le total
  const etats = sceauxDe(stats);
  const gagnees = marchesGagnees(etats);

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
    pic: stats.palierMax,
  };

  const lienFace = `${hrefOnglet(id, "face-a-face")}#profil-onglets`;
  const dernier = face?.duels[0] ?? null;
  const defierLibelle = (
    <>
      <span className="sm:hidden">{ENTETE.defier}</span>
      <span className="max-sm:hidden">{JOUEURS.defier(display)}</span>
    </>
  );

  // les actions : les miennes, celles d'un autre joueur, ou leur aperçu (inertes)
  let actions: React.ReactNode;
  if (commeMoi) {
    actions = (
      <>
        <Link href="/moi/profil" className="btn btn-primary rl-press">
          <Palette size={15} aria-hidden /> Personnaliser
        </Link>
        <Link href={hrefOnglet(id, onglet, "inconnu")} className="btn btn-secondary rl-press">
          <Eye size={15} aria-hidden /> Voir comme les autres
        </Link>
      </>
    );
  } else if (vue) {
    actions = (
      <>
        <span className="btn btn-primary pointer-events-none" aria-disabled>
          <Icone nom="duel" size={17} /> {defierLibelle}
        </span>
        <span className="btn btn-secondary pointer-events-none" aria-disabled>
          {vue === "ami" ? <UserCheck size={15} aria-hidden /> : <UserPlus size={15} aria-hidden />} {vue === "ami" ? "Amis" : "Ajouter en ami"}
        </span>
      </>
    );
  } else {
    actions = (
      <>
        {/* Revanche si mon dernier duel contre lui est perdu, sinon Défier */}
        {dernier && dernier.gagne === false && !face?.ouvert ? (
          <Revanche adversaire={id} duel={dernier.id} />
        ) : (
          <Link href={`/duel?adversaire=${encodeURIComponent(id)}`} className="btn btn-primary rl-press">
            <Icone nom="duel" size={17} /> {defierLibelle}
          </Link>
        )}
        <AmiBouton autre={id} relation={relation} />
        {/* téléphone : le bilan ouvre le Face-à-face (sur ordinateur, il est au pied de la carte du rang) */}
        {face && face.duels.length > 0 && (
          <Link href={lienFace} className="btn btn-secondary rl-press lg:hidden" aria-label={FACE.bilanDit(face.victoires, face.defaites, display, face.nuls)}>
            {FACE.court(face.victoires, face.defaites)} <ChevronRight size={15} aria-hidden />
          </Link>
        )}
      </>
    );
  }

  // sur ordinateur, au pied de la carte du rang : le bilan du face-à-face
  const piedRang = face ? (
    <Link href={lienFace} className="flex min-h-[32px] items-center justify-between gap-3 text-[13px] font-semibold text-[rgba(255,255,255,.85)] hover:text-[#fff]">
      {face.duels.length ? (
        <>
          <span className="truncate">
            {FACE.toi} {nombre(face.victoires)} – {nombre(face.defaites)} {display}
          </span>
          <BatonsDuels duels={face.duels.slice(0, 5)} height={20} className="shrink-0 text-[#fff]" />
        </>
      ) : (
        <span>{FACE.premier}</span>
      )}
      <span className="inline-flex shrink-0 items-center gap-0.5">
        {FACE.voir} <ChevronRight size={15} aria-hidden />
      </span>
    </Link>
  ) : null;

  // le bandeau d'aperçu dit ce qui est visible ou masqué pour cet autre joueur
  const visibles = [
    lienBrut?.linkedin ? (lien ? "LinkedIn visible" : "LinkedIn masqué") : null,
    nomBrut?.nom ? (nomComplet ? "nom visible" : "nom masqué") : null,
  ].filter(Boolean) as string[];

  const retour = (
    <Link href="/people" className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[color-mix(in_oklab,var(--paper)_82%,transparent)] px-3 py-1.5 text-[13px] font-semibold text-muted backdrop-blur hover:text-white">
      <ArrowLeft size={14} aria-hidden /> {JOUEURS.retour}
    </Link>
  );

  const onglets = ongletsDe(autreJoueur).map((cle) => ({
    cle,
    href: hrefOnglet(id, cle, vue),
    ...(cle === "sceaux" ? { compte: nombre(gagnees), compteLarge: `/${nombre(MARCHES)}` } : {}),
    ...(cle === "face-a-face" && face && face.duels.length ? { compte: `${nombre(face.victoires)}–${nombre(face.defaites)}` } : {}),
  }));

  let panneau: React.ReactNode;
  if (onglet === "sceaux") {
    panneau = <Collection etats={etats} portee={commeMoi ? aPortee(stats) : []} proprietaire={commeMoi} />;
  } else if (onglet === "journal" && journal) {
    panneau = <Journal journal={journal} mastery={mastery} moi={commeMoi} />;
  } else if (onglet === "face-a-face") {
    const enjeu = o.monRating ? stakesAgainst(o.monRating.elo, o.monRating.gamesPlayed, elo) : null;
    panneau = (
      <FaceAFace
        autreId={id}
        nom={display}
        bilan={face ?? SANS_DUEL}
        enjeu={enjeu ? { gain: enjeu.win, perte: enjeu.loss } : null}
        matieres={stats.matieres}
        miennes={o.mesStats ? o.mesStats.matieres : null}
        moyennes={o.moyennes}
        accent={style.accent}
        monAccent={o.monStyle ? o.monStyle.style.accent : null}
      />
    );
  } else {
    panneau = (
      <GrilleBlocs
        disposition={style.disposition}
        caseVide={commeMoi ? <CaseImage href="/moi/profil" /> : null}
        rendus={{
          vitrine: <Vitrine style={style} stats={stats} rang={{ tierIndex: rank.tierIndex, division: rank.division, elo, mastery }} />,
          radar: (
            <RadarComparable
              matieres={stats.matieres}
              moyennes={o.moyennes}
              accent={style.accent}
              nom={display}
              moi={commeMoi}
              miennes={o.mesStats ? o.mesStats.matieres : null}
              monAccent={o.monStyle ? o.monStyle.style.accent : null}
            />
          ),
          amis: amis ? <ListeAmis amis={amis.amis} total={amis.total} moi={commeMoi} viewerId={user.id} /> : null,
          reponses: o.answers?.available ? <AnswerSummary stats={o.answers} name={display} isMe={commeMoi} /> : null,
          trophees: <PracticeTrophies rows={o.trophyRows} />,
          progression: <PracticeProgressChart pastSessions={o.progressSessions} topicLabels={TOPIC_LABELS} />,
        }}
      />
    );
  }

  return (
    <div className="rl-wide rl-page relative isolate">
      <AmbianceProfil style={style} />
      <div className="flex flex-col gap-6 md:gap-8">
        <EnteteJoueur
          d={entete}
          actions={actions}
          haut={vue ? undefined : retour}
          kicker={commeMoi ? JOUEURS.kickerMoi : JOUEURS.kickerAutre}
          rangDe={commeMoi ? "Ton rang" : "Son rang"}
          presence={!commeMoi}
          poses={<SceauxPoses poses={posesDe(etats)} label={commeMoi ? ENTETE.posesAideMoi : ENTETE.posesAide} />}
          piedRang={piedRang}
        />
        {/* les onglets restent collés sous la barre du haut tant que leur panneau défile */}
        <div className="flex flex-col gap-6 md:gap-10">
          <OngletsProfil actif={onglet} onglets={onglets} />
          {panneau}
        </div>
      </div>

      {/* l'aperçu « comme les autres » : une barre flottante en bas de l'écran,
          pour que la page se voie telle quelle, sans bandeau au milieu */}
      {vue && (
        <div
          role="status"
          className="fixed inset-x-3 z-40 mx-auto flex max-w-[640px] flex-wrap items-center gap-x-3 gap-y-2 rounded-[18px] border border-line-2 bg-[var(--surface)] py-2 pl-4 pr-2 shadow-[var(--shadow-3)] bottom-[calc(90px+env(safe-area-inset-bottom,0px))] md:bottom-6"
        >
          <Eye size={16} aria-hidden className="shrink-0" />
          <p className="m-0 min-w-0 flex-[1_1_200px] text-[13px] leading-snug">
            <b className="font-semibold">Aperçu</b> · vu par {vue === "ami" ? "un ami" : "un joueur qui n'est pas ton ami"}
            {visibles.length ? <span className="text-muted">{` · ${visibles.join(", ")}`}</span> : null}
          </p>
          <div className="flex items-center gap-1.5">
            <Link href={hrefOnglet(id, onglet, vue === "ami" ? "inconnu" : "ami")} className="btn btn-secondary btn-sm">
              Comme {vue === "ami" ? "un inconnu" : "un ami"}
            </Link>
            <Link href={hrefOnglet(id, onglet)} className="btn btn-primary btn-sm">
              Revenir
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
