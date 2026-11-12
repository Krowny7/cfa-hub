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
  ligneExamen,
  type LeaderRow,
  type TopicCell,
} from "@/components/session/MockExamViews";
import { cleanTopic, pctOf, type ReviewQuestion } from "@/components/session/review";
import { ListeCourte, type Ligne } from "@/components/ui/Decors";
import { CadreZones, EnTeteSousPage, SousPage, type Zone } from "@/components/ui/SousPage";
import { DETAIL, ELO_EXAMEN } from "@/lib/voice-z3b";
import { RETOUR_EXAMENS, SOUS_AFFRONTER } from "@/lib/voice-affronter-sous";
import { rangOrdinal } from "@/lib/voice-z2c";
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

  // Sur le modèle des sous-pages (2026-11-12) : l'en-tête commun (retour aux examens blancs, le titre,
  // l'état et le format en une ligne, la peinture de la Grande Salle).
  const entete = (
    <EnTeteSousPage
      retour={RETOUR_EXAMENS}
      titre={exam.title}
      ligne={ligneExamen(exam, eloEnabled, now.getTime())}
      illustration={{ nom: "mock-grande-salle", position: "center 40%" }}
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

  // Hors séance : le cadre à zones. À gauche, où en est l'examen pour toi (pas encore ouvert, ta place
  // à réserver, bientôt ton tour, fenêtre terminée) ; dans la colonne grise, son classement en court.
  const texte = (t: React.ReactNode) => <p className="t-body m-0 max-w-[560px] text-muted">{t}</p>;
  const inscription = <MockExamRegistration examId={exam.id} isRegistered={isRegistered} registrantCount={registrantCount} ranked={eloEnabled} nu />;
  let gauche: Zone;
  if (exam.status === "draft") {
    // Examen pas encore publié
    gauche = { titre: DETAIL.pasOuvertTitre, contenu: texte(DETAIL.pasOuvertTexte) };
  } else if (isRegistered && !alreadyDone && !withinWindow && !windowClosed) {
    // Inscrit, mais la fenêtre de passage n'a pas encore commencé
    gauche = {
      titre: DETAIL.bientotTitre,
      contenu: (
        <div className="grid min-w-0 gap-5">
          <div className="flex flex-wrap items-center justify-between gap-5">
            {texte(DETAIL.bientotTexte(windowStart.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }), dayMonth(windowEnd)))}
            {daysUntil > 0 && <span className="t-num text-[40px]">{`J-${daysUntil}`}</span>}
          </div>
          {inscriptionOuverte && inscription}
        </div>
      ),
    };
  } else if (inscriptionOuverte) {
    // Pas encore inscrit, la fenêtre court encore : ta place à réserver
    gauche = { titre: E.inscription, contenu: inscription };
  } else {
    // Fenêtre terminée (inscrit sans copie, ou examen clos)
    gauche = { titre: DETAIL.finiTitre, contenu: texte(windowClosed ? DETAIL.finiTexte(dayMonth(windowEnd)) : E.clos) };
  }

  // le classement de l'examen, court : les premiers, et ta ligne si tu es plus bas
  const maPlace = leaderRows.findIndex((r) => r.userId === auth.user!.id);
  const tete = maPlace >= 5 ? [...leaderRows.slice(0, 4).map((r, i) => ({ r, i })), { r: leaderRows[maPlace], i: maPlace }] : leaderRows.slice(0, 5).map((r, i) => ({ r, i }));
  const lignes: Ligne[] = tete.map(({ r, i }) => ({
    cle: r.userId,
    titre: `${rangOrdinal(i + 1)} · ${r.userId === auth.user!.id ? E.toi : r.name}`,
    detail: E.pct(pctOf(r.score, r.total)),
    marque: r.userId === auth.user!.id,
  }));

  return (
    <SousPage entete={entete}>
      <CadreZones gauche={gauche} droite={showLeaderboard ? { titre: E.classementExamen, contenu: <ListeCourte lignes={lignes} /> } : undefined} />
    </SousPage>
  );
}
