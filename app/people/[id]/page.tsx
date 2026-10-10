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
import { TamponsCible } from "@/components/profil/Tampons";
import { DepuisVisite } from "@/components/profil/DepuisVisite";
import { Visite } from "@/components/profil/Visite";
import { CarteJoueurHote } from "@/components/profil/CarteJoueur";
import { FamilleSaisons, SaisonRang, SaisonsJournal } from "@/components/profil/Saisons";
import { ChoixSceaux } from "@/components/profil/ChoixSceaux";
import { ModePersonnaliser } from "@/components/profil/ModePersonnaliser";
import { amisDe, datesDuPic, lireLien, lireNom, lireStyle, relationAvec, statsProfil, type Relation } from "@/lib/profil/donnees";
import { blocsDe, estDispositionDefaut, sansCaseVide } from "@/lib/profil/disposition";
import { faceAFace, type FaceAFace as Bilan } from "@/lib/profil/face-a-face";
import { journalDe, type EvenementJournal } from "@/lib/profil/journal";
import { lireTampons, monRetour } from "@/lib/profil/social";
import { lireSaisons } from "@/lib/profil/saisons";
import { CIBLE_PROFIL, cibleEntree } from "@/lib/profil/tampons";
import { hrefOnglet, hrefPersonnaliser, ongletDepuis, ongletsDe } from "@/lib/profil/onglets";
import { aPortee, posesDe, sceauxGagnes, vusParUnAutre } from "@/lib/profil/sceaux";
import { sceauxDuJoueur } from "@/lib/profil/sceaux-base";
import { acquisDe, cadreDe, type Visibilite } from "@/lib/profil/catalogue";
import { stakesAgainst } from "@/lib/duels";
import { nombre } from "@/lib/voice";
import { JOUEURS } from "@/lib/voice-z2a";
import { ENTETE, FACE, JOURNAL, provenances } from "@/lib/voice-profil";
import { SAISONS } from "@/lib/voice-saisons";
import type { Profile, Rating } from "@/lib/types";

type PageProps = { params: Promise<{ id: string }>; searchParams?: Promise<{ vue?: string; onglet?: string; personnaliser?: string }> };
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
// propre profil : personnaliser, choisir ses sceaux posés (dans leur fiche,
// avec la base), et « voir comme les autres » (?vue=inconnu ou ?vue=ami) qui
// rend la page telle qu'un autre joueur la voit. Le Journal suit le réglage
// de son propriétaire (tous, amis, moi seul) : fermé, il n'est pas lu.
// ?personnaliser=1, sur son propre profil : la page se personnalise sur
// place (ModePersonnaliser).
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
  if (isMe && sp.personnaliser === "1" && !sp.vue) return <ModePersonnaliser id={id} supabase={supabase} profil={profileData as ProfileRow} rating={ratingData as RatingRow | null} />;
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
  // les sceaux : gardés en base (et recalculés au plus toutes les 10 min), sinon dérivés ; l'avancée sur le mien seulement
  const sceauxLus = statsLues.then((stats) => sceauxDuJoueur(id, stats, { avancee: commeMoi }));
  const relationLue = relationAvec(supabase, user.id, id);
  // la date du pic, pour dire d'où vient un cadre liquide ou l'aura
  const datesPicLues = styleLu.then(({ style: st }) => (cadreDe(st.frame).condition?.k === "pic" ? datesDuPic(supabase, id) : []));
  // le Journal, s'il m'est ouvert (sur le mien vu comme les autres : comme eux)
  const journalOuvert = (v: Visibilite, rel: Relation | null) =>
    isMe ? !vue || v === "public" || (vue === "ami" && v === "friends") : v === "public" || (v === "friends" && rel === "amis");
  // la courbe avec mon client (rating_events est lisible par tous), les victoires avec le client admin
  const journalLu = (async () => {
    if (onglet !== "journal") return null;
    const [stats, masteries, lu, rel, sceaux] = await Promise.all([statsLues, maitrisesLues, styleLu, relationLue, sceauxLus]);
    if (!journalOuvert(lu.journal, rel)) return null;
    return journalDe({ id, sb: supabase, admin, stats, mastery: masteries.get(id) ?? null, gardes: sceaux.gardes });
  })();
  // les tampons du profil et, sur le Journal, ceux de ses entrées (null sans la migration)
  const tamponsLus = (async () => {
    const j = await journalLu;
    const entrees = j ? j.evenements.map(cibleEntree).filter((c): c is string => !!c) : [];
    return lireTampons(supabase, id, [CIBLE_PROFIL, ...entrees]);
  })();

  // l'en-tête, commun aux onglets
  const [leaderboardRank, masteries, { style, pins, journal: visibiliteJournal }, stats, relation, lienBrut, amis, nomBrut, face, o, journal, sceaux, parCible, depuisVisite, saisons] = await Promise.all([
    getLeaderboardRank(supabase, id),
    maitrisesLues,
    styleLu,
    statsLues,
    relationLue,
    // la base ne rend le LinkedIn que s'il est visible pour moi
    lireLien(supabase, id),
    amisDe(id, supabase, 12),
    // prénom et nom : la base ne les rend que s'ils sont visibles pour moi
    lireNom(supabase, id),
    // nos duels, lus avec mon client (je ne lis que les miens)
    autreJoueur ? faceAFace(supabase, user.id, id) : Promise.resolve(null),
    lecturesOnglet,
    journalLu,
    sceauxLus,
    tamponsLus,
    // « Depuis ta dernière visite » : sur mon profil, hors aperçu (la base note le passage)
    commeMoi ? monRetour(supabase) : Promise.resolve(null),
    // la saison en cours et son palmarès (null sans la migration) ; la lecture clôt les saisons échues
    lireSaisons(supabase, id),
  ]);

  const datesPic = await datesPicLues;

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

  // les sceaux : la collection, les 3 posés (choisis, sinon les plus rares), le total ; un autre
  // ne reçoit ni les mesures ni l'avancée (nombre de mentions, ratures rayées…)
  const etats = commeMoi ? sceaux.etats : vusParUnAutre(sceaux.etats);
  const gagnes = sceauxGagnes(etats);
  const poses = posesDe(etats, sceaux.base ? pins : null);
  const choisis = sceaux.base && pins.some((c) => etats.some((e) => e.def.cle === c && e.palier > 0));

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
    provenance: provenances(style, acquisDe(stats, etats, datesPic)),
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
        <Link href={hrefPersonnaliser(id)} className="btn btn-primary rl-press">
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
    ...(cle === "sceaux" ? { compte: nombre(gagnes), compteLarge: `/${nombre(etats.length)}` } : {}),
    ...(cle === "face-a-face" && face && face.duels.length ? { compte: `${nombre(face.victoires)}–${nombre(face.defaites)}` } : {}),
  }));

  // tamponner : sur le profil d'un autre ; sur le mien (et dans l'aperçu), les comptes seulement
  const peutTamponner = autreJoueur;
  const tamponsProfil = parCible ? <TamponsCible pour={id} cible={CIBLE_PROFIL} comptes={parCible[CIBLE_PROFIL]} peut={peutTamponner} /> : null;

  // « Depuis ta dernière visite » (mon profil seulement ; null sans la migration)
  const retourVu = (className?: string) => (depuisVisite ? <DepuisVisite retour={depuisVisite} elo={elo} mastery={mastery} place={leaderboardRank} className={className} /> : null);

  let panneau: React.ReactNode;
  if (onglet === "sceaux") {
    // les sceaux de saison : ceux gravés et, sur mon profil, la saison en cours (gaufrée)
    const courante = commeMoi ? (saisons?.courante ?? null) : null;
    const famille = saisons && (saisons.palmares.length || courante) ? [{ cle: "saisons", nom: SAISONS.titre, contenu: <FamilleSaisons palmares={saisons.palmares} courante={courante} /> }] : [];
    panneau = <Collection etats={etats} portee={commeMoi ? aPortee(etats) : []} proprietaire={commeMoi} enPlus={famille} />;
  } else if (onglet === "journal") {
    const piedEntree = parCible
      ? (e: EvenementJournal) => {
          const cible = cibleEntree(e);
          return cible ? <TamponsCible key={cible} pour={id} cible={cible} comptes={parCible[cible]} peut={peutTamponner} variante="entree" /> : null;
        }
      : undefined;
    panneau = journal ? (
      <Journal
        journal={journal}
        mastery={mastery}
        moi={commeMoi}
        moiId={user.id}
        piedEntree={piedEntree}
        saisons={saisons && (saisons.courante || saisons.palmares.length) ? <SaisonsJournal saisons={saisons} /> : null}
      />
    ) : (
      // fermé par son propriétaire : rien n'a été lu
      <div className="card flex max-w-[640px] flex-col gap-1 p-5 sm:p-6">
        <p className="m-0 text-[15px] font-semibold">{JOURNAL.ferme}</p>
        <p className="t-small m-0">{visibiliteJournal === "private" ? JOURNAL.fermePrive(display) : JOURNAL.fermeAmis(display)}</p>
        {vue && <p className="t-micro m-0 mt-1">{JOURNAL.fermeApercu}</p>}
      </div>
    );
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
    // la page jamais composée : sa case vide invite le propriétaire à poser une image, et s'efface pour les autres
    const parDefaut = estDispositionDefaut(style.disposition);
    panneau = (
      <GrilleBlocs
        disposition={parDefaut && !commeMoi ? sansCaseVide(style.disposition) : style.disposition}
        caseVide={parDefaut && commeMoi ? <CaseImage href={hrefPersonnaliser(id)} /> : null}
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
      {/* la visite d'un autre joueur, notée dans le navigateur (jamais la sienne, jamais l'aperçu) */}
      {autreJoueur && <Visite pour={id} />}
      {/* la carte d'un ami de sa liste, au toucher */}
      <CarteJoueurHote />
      {/* sur son profil, avec la base : les fiches proposent de poser le sceau */}
      <ChoixSceaux actif={commeMoi && sceaux.base} poses={poses.map((e) => e.def.cle)}>
        <div className="flex flex-col gap-6 md:gap-8">
          <EnteteJoueur
            d={entete}
            actions={actions}
            haut={vue ? undefined : retour}
            kicker={commeMoi ? JOUEURS.kickerMoi : JOUEURS.kickerAutre}
            rangDe={commeMoi ? "Ton rang" : "Son rang"}
            presence={!commeMoi}
            poses={<SceauxPoses poses={poses} label={choisis ? (commeMoi ? ENTETE.posesChoisisMoi : ENTETE.posesChoisis) : commeMoi ? ENTETE.posesAideMoi : ENTETE.posesAide} />}
            piedRang={piedRang}
            saison={saisons?.courante ? <SaisonRang c={saisons.courante} /> : null}
            tampons={tamponsProfil}
            sousRang={retourVu()}
          />
          {/* les onglets restent collés sous la barre du haut tant que leur panneau défile */}
          <div className="flex flex-col gap-6 md:gap-10">
            <OngletsProfil actif={onglet} onglets={onglets} />
            {/* téléphone : « Depuis ta dernière visite » sous les onglets (sur ordinateur, sous la carte du rang) */}
            {retourVu("lg:hidden")}
            {panneau}
          </div>
        </div>
      </ChoixSceaux>

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
