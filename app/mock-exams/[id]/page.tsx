import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MockExamRunner } from "@/components/MockExamRunner";
import { MockExamRegistration } from "@/components/MockExamRegistration";
import { MockExamRetake } from "@/components/MockExamRetake";
import { RetestRatures } from "@/components/notions/RetestRatures";
import { applyMockExamElo, getMockExamEloDeltas } from "@/lib/rating";
import { duelsReady } from "@/lib/duels";
import { traitsDuJour } from "@/components/adn/AnneauDuJourData";
import { CeremonieExamen } from "@/components/classement/CeremonieExamen";
import {
  MockExamLeaderboard,
  MockExamTopicTable,
  dayMonth,
  packDe,
  type LeaderRow,
  type TopicCell,
} from "@/components/session/MockExamViews";
import { ClassementCourt, ScenePack } from "@/components/MockExamPacks";
import { cleanTopic, pctOf, type ReviewQuestion } from "@/components/session/review";
import { EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { DETAIL, ELO_EXAMEN } from "@/lib/voice-z3b";
import { RETOUR_EXAMENS, SOUS_AFFRONTER } from "@/lib/voice-affronter-sous";
import { PARAM_DEBRIEF, lireDebrief, secondesDe, type EtatDebrief } from "@/lib/debrief";

const E = SOUS_AFFRONTER.examens;

type PageProps = { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

// Question sans correct_index/explanation — c'est tout ce que le client
// reçoit pendant que l'examen est en cours. La correction n'arrive que via
// submit_mock_exam / get_mock_exam_review, entièrement côté serveur (voir
// migration_mock_exam_secure_submit.sql).
type ActiveQuestion = {
  id: string;
  position: number;
  prompt: string;
  choices: string[];
};


type ResultRow = {
  user_id: string;
  score: number;
  total: number;
  duration_seconds: number | null;
  completed_at: string;
  profiles: { username: string | null; avatar_url: string | null } | { username: string | null; avatar_url: string | null }[] | null;
};

type TopicBreakdownRow = {
  user_id: string;
  username: string | null;
  topic: string | null;
  correct: number;
  total: number;
  pct: number;
};

type PastAttempt = {
  id: string;
  mode: "full" | "wrong_only";
  score: number;
  total: number;
  duration_seconds: number | null;
  completed_at: string;
};

export default async function MockExamDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  // ?debrief=1 (lien du Codex) : la correction s'ouvre sur la première erreur non classée
  const ouvrirDebrief = (await searchParams)?.[PARAM_DEBRIEF] === "1";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const [examRes, regRes, resultRes] = await Promise.all([
    supabase
      .from("mock_exams")
      .select("id,title,description,scheduled_at,duration_minutes,question_count,status,window_days")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("mock_exam_registrations")
      .select("id")
      .eq("exam_id", id)
      .eq("user_id", auth.user.id)
      .maybeSingle(),
    supabase
      .from("mock_exam_results")
      .select("user_id,score,total,duration_seconds,completed_at,profiles(username,avatar_url)")
      .eq("exam_id", id)
      .order("score", { ascending: false }),
  ]);

  if (!examRes.data) notFound();

  // Le nombre d'inscrits (la RLS ne montre que sa propre inscription) : un
  // simple comptage avec le client admin, filtré sur cet examen ; null si
  // indisponible (on n'affiche alors pas de nombre).
  const registrantCount = await (async () => {
    try {
      const { count, error } = await createAdminClient()
        .from("mock_exam_registrations")
        .select("user_id", { count: "exact", head: true })
        .eq("exam_id", id);
      return error ? null : (count ?? 0);
    } catch {
      return null;
    }
  })();

  const exam = examRes.data as {
    id: string; title: string; description: string | null;
    scheduled_at: string; duration_minutes: number; question_count: number; window_days: number;
    status: "draft" | "open" | "closed";
  };
  const isRegistered = Boolean(regRes.data);
  const rawResults = (resultRes.data ?? []) as unknown as ResultRow[];
  const myResult = rawResults.find((r) => r.user_id === auth.user!.id) ?? null;
  const allResults = rawResults;

  const now = new Date();
  const scheduledAt = new Date(exam.scheduled_at);
  const windowMs = exam.window_days * 24 * 60 * 60 * 1000;
  const windowStart = new Date(scheduledAt.getTime() - windowMs);
  const windowEnd = new Date(scheduledAt.getTime() + windowMs);
  const withinWindow = now >= windowStart && now <= windowEnd;
  const windowClosed = now > windowEnd;
  const alreadyDone = Boolean(myResult);

  // Pendant l'examen : uniquement id/prompt/choices/position, jamais
  // correct_index/explanation (voir migration_mock_exam_secure_submit.sql).
  let activeQuestions: ActiveQuestion[] = [];
  let review: ReviewQuestion[] = [];

  let topicBreakdownAll: TopicBreakdownRow[] = [];
  let pastAttempts: PastAttempt[] = [];
  // le débrief de la copie (migration_v3_profil.sql §5) ; null : section absente, boutons masqués
  let debriefLu: EtatDebrief | null = null;

  if (isRegistered && exam.status !== "draft") {
    if (alreadyDone) {
      const [{ data: reviewData }, { data: topicData }, { data: attemptsData }, debriefData] = await Promise.all([
        supabase.rpc("get_mock_exam_review", { p_exam_id: id }),
        supabase.rpc("get_mock_exam_topic_breakdown_all", { p_exam_id: id }),
        supabase
          .from("mock_exam_attempts")
          .select("id,mode,score,total,duration_seconds,completed_at")
          .eq("exam_id", id)
          .eq("user_id", auth.user.id)
          .order("completed_at", { ascending: false }),
        lireDebrief(supabase, "blanc", id),
      ]);
      review = (reviewData ?? []) as ReviewQuestion[];
      debriefLu = debriefData;
      topicBreakdownAll = (topicData ?? []) as TopicBreakdownRow[];
      pastAttempts = (attemptsData ?? []) as PastAttempt[];
    } else if (withinWindow && exam.status === "open") {
      const { data: qData } = await supabase
        .from("mock_exam_questions")
        .select("position,quiz_questions(id,prompt,choices)")
        .eq("exam_id", id)
        .order("position");

      activeQuestions = ((qData ?? []) as unknown as { position: number; quiz_questions: Omit<ActiveQuestion, "position"> }[])
        .map((row) => ({ ...row.quiz_questions, position: row.position }))
        .filter((q): q is ActiveQuestion => Boolean(q.id));
    }
  }

  const showRunner = isRegistered && exam.status !== "draft" && (alreadyDone || (withinWindow && exam.status === "open"));
  const showLeaderboard = allResults.length > 0;

  // Comparaison par thème entre participants — seulement si au moins 2
  // personnes ont déjà soumis (sinon c'est déjà affiché par MockExamRunner).
  const topicUsers = [...new Map(topicBreakdownAll.map((r) => [r.user_id, r.username ?? "Anonyme"])).entries()];
  const topicNames = [...new Set(topicBreakdownAll.map((r) => r.topic ?? "Autre"))];
  const topicMatrix = topicNames
    .map((topic) => ({
      topic,
      byUser: Object.fromEntries(
        topicUsers.map(([uid]) => {
          const row = topicBreakdownAll.find((r) => r.user_id === uid && (r.topic ?? "Autre") === topic);
          return [uid, row ?? null];
        })
      ),
    }))
    .sort((a, b) => {
      const avg = (m: typeof a.byUser) => {
        const vals = Object.values(m).filter((v): v is TopicBreakdownRow => v !== null);
        return vals.length ? vals.reduce((s, v) => s + v.pct, 0) / vals.length : 100;
      };
      return avg(a.byUser) - avg(b.byUser);
    });
  const showTopicComparison = topicUsers.length > 1;

  // Examen blanc classé : une fois l'examen clos (clôture manuelle ou fenêtre
  // terminée), l'ELO de tous les participants est appliqué — paresseusement
  // ici, à la première consultation ; idempotent côté serveur.
  const examClosed = exam.status === "closed" || windowClosed;
  const eloEnabled = exam.status !== "draft" && (await duelsReady(supabase));
  let eloDeltas: Record<string, number> = {};
  let eloTooFew = false;
  if (eloEnabled && examClosed) {
    const applied = await applyMockExamElo(supabase, exam.id);
    eloDeltas = await getMockExamEloDeltas(supabase, exam.id);
    eloTooFew = applied.reason === "too_few" || (applied.reason === "already" && Object.keys(eloDeltas).length === 0);
  }
  const myEloDelta = eloDeltas[auth.user.id] ?? null;

  // La cérémonie de rang au premier affichage du résultat classé, si le rang
  // a bougé avec cet examen : CeremonieExamen (Z2a) lit le mouvement d'ELO de
  // l'examen et joue le moment une seule fois. Seulement une fois l'ELO
  // appliqué, et quand la copie est rendue.
  const ceremonie = alreadyDone && eloEnabled && examClosed && myEloDelta !== null;

  // traits du jour (lecture de la barre du haut, en cache) : l'anneau sous la copie
  const traitsJour = showRunner || alreadyDone ? await traitsDuJour(auth.user.id) : null;
  const eloInfo = !eloEnabled
    ? null
    : myEloDelta !== null
      ? { delta: myEloDelta, note: null }
      : !examClosed
        ? { delta: null, note: ELO_EXAMEN.aLaCloture(dayMonth(windowEnd)) }
        : eloTooFew
          ? { delta: null, note: ELO_EXAMEN.tropPeu }
          : null;

  const leaderRows: LeaderRow[] = allResults.map((r) => {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      userId: r.user_id,
      name: p?.username ?? "Anonyme",
      avatarUrl: p?.avatar_url ?? null,
      score: r.score,
      total: r.total,
      durationSeconds: r.duration_seconds,
    };
  });
  const matrix = topicMatrix.map(({ topic, byUser }) => ({
    topic: cleanTopic(topic),
    byUser: Object.fromEntries(
      Object.entries(byUser).map(([uid, row]) => [uid, row ? { pct: row.pct, correct: row.correct, total: row.total } : null]),
    ) as Record<string, TopicCell>,
  }));

  // L'en-tête commun (retour aux examens blancs, la peinture de la Grande Salle) : la donnée vit sur le
  // pack (date, format, état), l'en-tête dit l'état du joueur (règle 1). La ligne : inscrit ou non,
  // l'ouverture, ta place ; le chiffre-héros ne compte jamais ce qui est listé dessous : ta copie, sinon
  // les inscrits (l'inscription ne les affiche plus), sinon la meilleure copie d'un examen fini.
  const monPct = myResult ? pctOf(myResult.score, myResult.total) : null;
  const heuresAvantFin = Math.ceil((windowEnd.getTime() - now.getTime()) / 3_600_000);
  const maPlace = leaderRows.findIndex((r) => r.userId === auth.user!.id);
  const jourOuverture = windowStart.toLocaleDateString("fr-FR", { weekday: "long", timeZone: "Europe/Paris" });
  const ligne =
    exam.status === "draft"
      ? null
      : alreadyDone
        ? maPlace >= 0 && leaderRows.length > 1
          ? E.placeSur(maPlace + 1, leaderRows.length)
          : E.copieRendue
        : windowClosed || exam.status === "closed"
          ? E.pasDeCopie
          : isRegistered
            ? withinWindow
              ? E.inscritOuvert
              : E.inscritOuverture(jourOuverture)
            : E.pasInscrit;
  const meilleure = leaderRows.length > 0 ? Math.max(...leaderRows.map((r) => pctOf(r.score, r.total))) : null;
  const heros =
    monPct !== null
      ? { valeur: `${monPct} %`, legende: E.taCopie }
      : exam.status !== "draft" && !windowClosed && exam.status !== "closed" && registrantCount
        ? { valeur: registrantCount, legende: E.inscrits(registrantCount) }
        : (windowClosed || exam.status === "closed") && meilleure !== null
          ? { valeur: `${meilleure} %`, legende: E.meilleureCopie }
          : null;
  const enjeu = exam.status === "open" && withinWindow && !alreadyDone && heuresAvantFin <= 48 ? E.seFerme(Math.max(1, heuresAvantFin)) : null;
  const entete = (
    <EnTeteSousPage
      retour={RETOUR_EXAMENS}
      titre={exam.title}
      ligne={ligne}
      illustration={{ nom: "mock-grande-salle", position: "center 40%" }}
      heros={heros}
      enjeu={enjeu}
    />
  );

  // L'inscription — reste disponible tant que la fenêtre n'est pas terminée ;
  // une fois inscrit, elle passe sous la copie (le point focal)
  const inscriptionOuverte = exam.status === "open" && !windowClosed && !alreadyDone;

  // La séance : l'en-tête et la colonne des séances (760 px) avant de commencer et sur la copie
  // rendue ; pendant l'examen, la barre de l'examen seule (MockExamRunner pose l'en-tête et l'annexe).
  if (showRunner) {
    return (
      <SousPage entete={null}>
        <MockExamRunner
          examId={exam.id}
          title={exam.title}
          durationMinutes={exam.duration_minutes}
          questions={activeQuestions}
          review={review}
          alreadyDone={alreadyDone}
          elo={eloInfo}
          traitsJour={traitsJour}
          debrief={{
            source: "blanc",
            ref: exam.id,
            // copie rendue à cette visite : l'état se lit après le rendu
            initial: alreadyDone ? debriefLu : undefined,
            secondesParQuestion: myResult ? secondesDe(myResult.duration_seconds, myResult.total) : null,
            ouvrir: ouvrirDebrief,
          }}
          entete={entete}
          avant={
            // Le rang a bougé avec cet examen : la cérémonie (plein écran pour un palier, en ligne pour
            // une division), une seule fois, au-dessus de la copie (posée à la revisite : un seul moment fort)
            ceremonie ? (
              <Suspense fallback={null}>
                <CeremonieExamen examId={exam.id} userId={auth.user.id} className="mx-auto w-full max-w-[660px]" />
              </Suspense>
            ) : null
          }
          apres={
            <>
              {inscriptionOuverte && <MockExamRegistration examId={exam.id} isRegistered={isRegistered} registrantCount={registrantCount} ranked={eloEnabled} />}

              {/* le classement de l'examen : sous la copie, en entier (ailleurs, la colonne grise en court) */}
              {showLeaderboard && <MockExamLeaderboard rows={leaderRows} meId={auth.user.id} eloDeltas={eloDeltas} />}

              {alreadyDone && <RetestRatures questionIds={review.filter((r) => !r.is_correct && r.selected_index !== null).map((r) => r.question_id)} />}

              {/* Rejouer l'examen en entraînement (score seul conservé, pas les réponses) */}
              {alreadyDone && (
                <MockExamRetake
                  examId={exam.id}
                  title={exam.title}
                  durationMinutes={exam.duration_minutes}
                  wrongCount={review.filter((r) => !r.is_correct).length}
                  totalCount={review.length}
                  pastAttempts={pastAttempts}
                  traitsJour={traitsJour}
                />
              )}

              {/* Comparaison par matière entre participants */}
              {showTopicComparison && <MockExamTopicTable users={topicUsers} matrix={matrix} meId={auth.user.id} />}
            </>
          }
        />
      </SousPage>
    );
  }

  // Hors séance (lot 4 du 2026-11-13) : le pack de l'examen en grand, son état écrit dessus ; à côté,
  // où en est l'examen pour toi (pas encore publié, bientôt ton tour, ta place à réserver, fenêtre
  // terminée) et l'action ; dessous, son classement en court (les premiers, et ta ligne si tu es plus bas).
  const inscription = <MockExamRegistration examId={exam.id} isRegistered={isRegistered} registrantCount={registrantCount} ranked={eloEnabled} nu />;
  // à côté du pack : seulement ce qu'il ne dit pas (l'action d'inscription, le classement)
  let titreEtat: string | null = null;
  let texteEtat: React.ReactNode = null;
  let suite: React.ReactNode = null;
  if (exam.status === "draft") {
    // Examen pas encore publié (le pack dit « en préparation »)
    texteEtat = DETAIL.pasOuvertTexte;
  } else if (isRegistered && !alreadyDone && !withinWindow && !windowClosed) {
    // Inscrit, la fenêtre n'a pas commencé (la ligne dit le jour d'ouverture) : la désinscription
    titreEtat = DETAIL.bientotTitre;
    suite = inscriptionOuverte ? inscription : null;
  } else if (inscriptionOuverte) {
    // Pas encore inscrit, la fenêtre court encore : ta place à réserver
    titreEtat = E.inscription;
    suite = inscription;
  }
  // Fenêtre terminée : le pack dit « manqué » ou « terminé », la ligne « pas de copie » : rien de plus

  // le classement de l'examen, court : les premiers, et ta ligne si tu es plus bas
  const tete = maPlace >= 5 ? [...leaderRows.slice(0, 4).map((r, i) => ({ r, i })), { r: leaderRows[maPlace], i: maPlace }] : leaderRows.slice(0, 5).map((r, i) => ({ r, i }));
  const lignes = tete.map(({ r, i }) => ({
    cle: r.userId,
    rang: i + 1,
    nom: r.userId === auth.user!.id ? E.toi : r.name,
    score: E.pct(pctOf(r.score, r.total)),
    href: `/people/${r.userId}`,
    moi: r.userId === auth.user!.id,
  }));

  return (
    <SousPage entete={entete}>
      <ScenePack
        p={packDe(exam, now.getTime(), monPct)}
        titre={titreEtat}
        texte={texteEtat}
        classement={showLeaderboard ? <ClassementCourt titre={E.classementExamen} lignes={lignes} /> : null}
      >
        {suite}
      </ScenePack>
    </SousPage>
  );
}
