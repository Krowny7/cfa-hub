import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MockExamRunner } from "@/components/MockExamRunner";
import { MockExamRegistration } from "@/components/MockExamRegistration";
import { MockExamRetake } from "@/components/MockExamRetake";
import { applyMockExamElo, getMockExamEloDeltas } from "@/lib/rating";
import { duelsReady } from "@/lib/duels";
import { traitsDuJour } from "@/components/adn/AnneauDuJourData";
import { CeremonieExamen } from "@/components/classement/CeremonieExamen";
import {
  MockExamHeader,
  MockExamLeaderboard,
  MockExamNotice,
  MockExamTopicTable,
  dayMonth,
  type LeaderRow,
  type TopicCell,
} from "@/components/session/MockExamViews";
import { cleanTopic, type ReviewQuestion } from "@/components/session/review";
import { DETAIL, ELO_EXAMEN } from "@/lib/voice-z3b";

type PageProps = { params: Promise<{ id: string }> };

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

export default async function MockExamDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const [examRes, regRes, resultRes, adminRes] = await Promise.all([
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
    supabase.rpc("is_app_admin"),
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
  const isAdmin = adminRes.data === true;

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

  if (isRegistered && exam.status !== "draft") {
    if (alreadyDone) {
      const [{ data: reviewData }, { data: topicData }, { data: attemptsData }] = await Promise.all([
        supabase.rpc("get_mock_exam_review", { p_exam_id: id }),
        supabase.rpc("get_mock_exam_topic_breakdown_all", { p_exam_id: id }),
        supabase
          .from("mock_exam_attempts")
          .select("id,mode,score,total,duration_seconds,completed_at")
          .eq("exam_id", id)
          .eq("user_id", auth.user.id)
          .order("completed_at", { ascending: false }),
      ]);
      review = (reviewData ?? []) as ReviewQuestion[];
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

  const daysUntil = Math.ceil((windowStart.getTime() - now.getTime()) / 86_400_000);

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

  return (
    <div className="rl-page">
      <MockExamHeader exam={exam} eloEnabled={eloEnabled} now={now.getTime()} />

      {/* Examen pas encore publié */}
      {exam.status === "draft" && !isAdmin && (
        <MockExamNotice title={DETAIL.pasOuvertTitre}>{DETAIL.pasOuvertTexte}</MockExamNotice>
      )}

      {/* Inscrit, mais la fenêtre de passage n'a pas encore commencé */}
      {isRegistered && !alreadyDone && !withinWindow && !windowClosed && (
        <MockExamNotice title={DETAIL.bientotTitre} countdown={daysUntil > 0 ? `J-${daysUntil}` : null}>
          {DETAIL.bientotTexte(windowStart.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }), dayMonth(windowEnd))}
        </MockExamNotice>
      )}

      {/* Inscrit sans avoir passé l'examen, et la fenêtre est terminée */}
      {isRegistered && !alreadyDone && windowClosed && (
        <MockExamNotice title={DETAIL.finiTitre}>{DETAIL.finiTexte(dayMonth(windowEnd))}</MockExamNotice>
      )}

      {/* Le rang a bougé avec cet examen : la cérémonie (plein écran pour un
          palier, en ligne pour une division), une seule fois, au-dessus de la
          copie (posée à la revisite : un seul moment fort) */}
      {ceremonie && (
        <Suspense fallback={null}>
          <CeremonieExamen examId={exam.id} userId={auth.user.id} className="mx-auto w-full max-w-[660px]" />
        </Suspense>
      )}

      {/* Passage de l'examen, puis résultat et correction */}
      {showRunner && (
        <MockExamRunner
          examId={exam.id}
          title={exam.title}
          durationMinutes={exam.duration_minutes}
          questions={activeQuestions}
          review={review}
          alreadyDone={alreadyDone}
          elo={eloInfo}
          traitsJour={traitsJour}
        />
      )}

      {/* Inscription — reste disponible tant que la fenêtre n'est pas terminée ;
          une fois inscrit, elle passe sous la copie (le point focal) */}
      {exam.status === "open" && !windowClosed && !alreadyDone && (
        <MockExamRegistration
          examId={exam.id}
          isRegistered={isRegistered}
          registrantCount={registrantCount}
          ranked={eloEnabled}
        />
      )}

      {showLeaderboard && <MockExamLeaderboard rows={leaderRows} meId={auth.user.id} eloDeltas={eloDeltas} />}

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
    </div>
  );
}
