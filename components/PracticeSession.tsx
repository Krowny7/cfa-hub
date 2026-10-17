"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, ChevronDown, Hourglass, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { multDuJour, texteGain, xpAvecSerie } from "@/lib/serie-encre";
import { friendlyError } from "@/lib/errors";
import { PracticeProgressChart } from "@/components/PracticeProgressChart";
import { TOPICS, TOPIC_LABELS } from "@/lib/practiceTopics";
import { lireLienPractice, matieresServies, repartir, tirerSeance } from "@/lib/practice-lien";
import { nomPalier, palierCiblee, type TropheeGagne } from "@/lib/trophees";
import { AnnonceTrophee } from "@/components/trophees/AnnonceTrophee";
import { SectionHead } from "@/components/session/ui";
import { Icone } from "@/components/adn/icons";
import { CarteLieu } from "@/components/ui/CarteLieu";
import { Illustration } from "@/components/ui/Illustration";
import { Sceau } from "@/components/ui/Tuiles";
import { Bande, EnTete, Mini, Page, Rangee, Tuile, Vignette } from "@/components/outils/Gabarit";
import { STUDIOLO } from "@/lib/voice-outils";
import {
  ChoiceButton,
  CopyForAi,
  PauseCard,
  PauseToggle,
  QuestionCard,
  QuestionMap,
  QuestionNav,
  ReadyCard,
  ReviewSection,
  RunnerBar,
  Seg,
  TopicBreakdown,
} from "@/components/session/parts";
import { PASS_THRESHOLD, fmtMinutes, pctOf, subjectName, topicsSummary, type ReviewQuestion } from "@/components/session/review";
import { FinDeSession } from "@/components/session/FinDeSession";
import { useTraitsDuJour } from "@/components/session/useTraitsDuJour";
import { poserTrait } from "@/components/adn/AnneauDuJourEvents";
import { surTitreSession } from "@/lib/voice";
import { EPREUVE } from "@/lib/voice-z3";

// Entraînement ciblé : on choisit ses matières, on reçoit le nombre de
// questions qu'elles pèsent dans un vrai examen, chronométré, corrigé à la fin
// (correction entièrement serveur : submit_practice_session). Un lien peut
// demander ses matières, sa taille, ses poids, son format, et la préparer tout
// de suite (lib/practice-lien : topic=a,b,c ou all, n, poids, format, go).
// Le trophée de la séance suit le plafond par taille (palierCiblee) et
// s'annonce en fin de séance (AnnonceTrophee).

type ActiveQuestion = { id: string; position: number; prompt: string; choices: string[] };

type PastSession = {
  id: string;
  topics: string[];
  format: number;
  question_count: number;
  score: number;
  total: number;
  duration_seconds: number | null;
  completed_at: string;
};

type Phase = "builder" | "ready" | "active" | "done";

/** Données d'exemple pour app/preview-da (aucun appel réseau, chrono figé). */
export type PracticeDemo = {
  phase: Phase;
  selected?: string[];
  format?: 90 | 180;
  questions?: ActiveQuestion[];
  answers?: (number | null)[];
  idx?: number;
  secondsLeft?: number;
  paused?: boolean;
  review?: ReviewQuestion[];
  score?: number;
  total?: number;
  xp?: number;
  duration?: number;
  historyReviews?: Record<string, ReviewQuestion[]>;
  expandedHistoryId?: string;
  tab?: "history" | "progress";
};

const MIN_PER_QUESTION_MINUTES = 135 / 90; // même ratio que l'examen officiel (135min/90Q)
const WEAK_BELOW = 50;

const dayLabel = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });

export function PracticeSession({
  pastSessions: initialPast,
  mastery = {},
  traitsJour = null,
  demo,
}: {
  pastSessions: PastSession[];
  /** maîtrise par matière (clé → %, null si pas assez de réponses) */
  mastery?: Record<string, number | null>;
  /** traits du jour lus par le serveur (anneau du jour sous la copie) ; null : inconnu */
  traitsJour?: number | null;
  demo?: PracticeDemo;
}) {
  const supabase = useMemo(() => createClient(), []);
  const traits = useTraitsDuJour(traitsJour);

  const [phase, setPhase] = useState<Phase>(demo?.phase ?? "builder");
  // Ce que demande le lien (ex: « S'entraîner sur X » depuis les points
  // faibles, un bloc de la séance du jour) : les matières sont pré-cochées
  // sans forcer le choix, l'utilisateur peut toujours en enlever ou en ajouter.
  const searchParams = useSearchParams();
  const [lien] = useState(() => lireLienPractice((k) => searchParams.get(k)));
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (demo?.selected) return new Set(demo.selected);
    if (lien.matieres) return new Set(lien.matieres);
    // sans thème demandé, la session conseillée : les matières mesurées sous 50 %
    return new Set(TOPICS.filter((t) => typeof mastery[t.key] === "number" && (mastery[t.key] as number) < WEAK_BELOW).map((t) => t.key));
  });
  // ?format=180 (lien d'une quête du Codex : certaines matières n'atteignent 15 questions qu'en format complet)
  const [format, setFormat] = useState<90 | 180>(demo?.format ?? lien.format ?? 90);
  // ?n= : la taille demandée par le lien ; choisir un format la rend au format
  const [taille, setTaille] = useState<number | null>(demo ? null : lien.taille);
  // les matières de la séance tirée (celles qui ont reçu des questions) : la copie, le trophée
  const [tirees, setTirees] = useState<string[]>(demo?.selected ?? []);
  // l'instant où l'épreuve a commencé : l'annonce des trophées compte depuis lui
  const [debut, setDebut] = useState("");
  // ?go=1 : la séance se prépare dès l'arrivée (le constructeur ne s'affiche qu'en cas d'échec)
  const [enRoute, setEnRoute] = useState(!demo && lien.go);
  const [questions, setQuestions] = useState<ActiveQuestion[]>(demo?.questions ?? []);
  const [answers, setAnswers] = useState<(number | null)[]>(demo?.answers ?? (demo?.questions ?? []).map(() => null));
  const [idx, setIdx] = useState(demo?.idx ?? 0);
  const [secondsLeft, setSecondsLeft] = useState(demo?.secondsLeft ?? 0);
  const [review, setReview] = useState<ReviewQuestion[]>(demo?.review ?? []);
  const [score, setScore] = useState(demo?.score ?? 0);
  const [total, setTotal] = useState(demo?.total ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [xpAwarded, setXpAwarded] = useState(demo?.xp ?? 0);
  const [xpMult, setXpMult] = useState(1);
  const [lastDuration, setLastDuration] = useState<number | null>(demo?.duration ?? null);
  // traits posés par la copie rendue (l'anneau du jour sous la copie)
  const [ajoutes, setAjoutes] = useState(demo?.phase === "done" ? demo?.total ?? 0 : 0);
  const [pastSessions, setPastSessions] = useState<PastSession[]>(initialPast);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(demo?.expandedHistoryId ?? null);
  const [historyReviews, setHistoryReviews] = useState<Record<string, ReviewQuestion[]>>(demo?.historyReviews ?? {});
  const [historyErrors, setHistoryErrors] = useState<Record<string, string>>({});
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);
  const [historyTab, setHistoryTab] = useState<"history" | "progress">(demo?.tab ?? "history");
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [paused, setPaused] = useState(demo?.paused ?? false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittingRef = useRef(false);
  // Le timeout auto-submit garde une closure figée sur `answers` tel qu'il
  // était au montage du timer — sans ce ref à jour, l'auto-submit renvoyait
  // toujours le tableau initial (tout à null), écrasant les vraies réponses
  // par un score de 0.
  const answersRef = useRef<(number | null)[]>(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  const pausedRef = useRef(false);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  // Durée réellement passée sur la session, incrémentée uniquement quand ce
  // n'est pas en pause — sert de source pour duration_seconds au lieu d'un
  // simple Date.now() - début, qui compterait aussi le temps de pause.
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (phase !== "active" || demo) return;
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return;
      elapsedRef.current += 1;
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          void submit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Chaque changement d'écran repart du haut de la page.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [phase]);

  function toggleTopic(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const previewCount =
    taille ??
    [...selected].reduce((sum, key) => {
      const w = TOPICS.find((t) => t.key === key)?.weight ?? 0;
      return sum + Math.round((w / 100) * format);
    }, 0);
  const previewMinutes = Math.max(5, Math.round(previewCount * MIN_PER_QUESTION_MINUTES));
  // les matières qui recevront des questions (une petite séance aux poids officiels peut en laisser une de côté)
  const previewMatieres = taille !== null ? matieresServies(repartir(taille, [...selected], { poids: lien.poids })).length : selected.size;

  async function generate(topics: Set<string> = selected, fmt: 90 | 180 = format, n: number | null = taille) {
    if (topics.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const cles = [...topics];
      let qs: ActiveQuestion[];
      let servies = cles;
      if (n === null) {
        const { data, error: rpcError } = await supabase.rpc("generate_practice_session", {
          p_topics: cles,
          p_format: fmt,
        });
        if (rpcError) throw new Error(rpcError.message);
        qs = (data ?? []) as ActiveQuestion[];
      } else {
        // une taille demandée : chaque matière tirée à part, au format complet
        // (sa plus grande réserve), puis la part de chacune, mêlées
        const lus = await Promise.all(cles.map((t) => supabase.rpc("generate_practice_session", { p_topics: [t], p_format: 180 })));
        const rate = lus.find((r) => r.error);
        if (rate?.error) throw new Error(rate.error.message);
        const tirage = tirerSeance(Object.fromEntries(cles.map((t, i) => [t, (lus[i].data ?? []) as ActiveQuestion[]])), n, cles, { poids: lien.poids });
        qs = tirage.questions.map((q, i) => ({ ...q, position: i }));
        servies = tirage.matieres;
      }
      if (qs.length === 0) {
        setError("Aucune question disponible pour cette sélection.");
        return;
      }
      setQuestions(qs);
      setAnswers(qs.map(() => null));
      setTirees(servies);
      setSecondsLeft(Math.max(5, Math.round(qs.length * MIN_PER_QUESTION_MINUTES)) * 60);
      setPhase("ready");
    } catch (e: unknown) {
      setError(friendlyError(e, "Erreur lors de la génération"));
    } finally {
      setBusy(false);
      setEnRoute(false);
    }
  }

  // ?go=1 : une seule préparation, à l'arrivée
  const parti = useRef(false);
  useEffect(() => {
    if (!enRoute || parti.current) return;
    parti.current = true;
    if (selected.size === 0) setEnRoute(false);
    else void generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function start() {
    setDebut(new Date().toISOString());
    setIdx(0);
    elapsedRef.current = 0;
    setPaused(false);
    setConfirmEnd(false);
    setPhase("active");
  }

  async function submit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError(null);
    setConfirmEnd(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const duration = elapsedRef.current;
    const payload = questions.map((q, i) => ({ question_id: q.id, selected_index: answersRef.current[i] }));
    const topicsArr = tirees;

    try {
      const { data, error: rpcError } = await supabase.rpc("submit_practice_session", {
        p_topics: topicsArr,
        p_format: format,
        p_answers: payload,
        p_duration_seconds: duration,
      });
      if (rpcError) throw new Error(rpcError.message);
      setReview((data?.review ?? []) as ReviewQuestion[]);
      setScore(data?.score ?? 0);
      setTotal(data?.total ?? 0);
      // la fonction rend l'XP de base (somme de la session) ; le trigger de la série d'encre y ajoute le bonus en base
      const xpBase = Number(data?.xp_awarded ?? 0) || 0;
      const mult = xpBase > 0 ? await multDuJour(supabase) : 1;
      setXpAwarded(xpAvecSerie(xpBase, mult));
      setXpMult(mult);
      setLastDuration(duration);
      // la copie rendue d'un bloc : autant de traits que de questions (comme l'anneau du jour)
      const n = Number(data?.total ?? 0) || 0;
      setAjoutes(n);
      poserTrait(n);
      setPastSessions((prev) => [
        { id: data?.id ?? crypto.randomUUID(), topics: topicsArr, format, question_count: data?.total ?? 0, score: data?.score ?? 0, total: data?.total ?? 0, duration_seconds: duration, completed_at: new Date().toISOString() },
        ...prev,
      ]);
      setPhase("done");
    } catch (e: unknown) {
      setError(friendlyError(e, "Erreur lors de la soumission"));
    } finally {
      setBusy(false);
      submittingRef.current = false;
    }
  }

  function backToBuilder() {
    setPhase("builder");
    setReview([]);
    setQuestions([]);
    setError(null);
    setXpAwarded(0);
  }

  async function toggleHistoryReview(sessionId: string) {
    if (expandedHistoryId === sessionId) {
      setExpandedHistoryId(null);
      return;
    }
    setExpandedHistoryId(sessionId);
    if (historyReviews[sessionId] || historyErrors[sessionId]) return;
    setLoadingHistoryId(sessionId);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_practice_session_review", {
        p_session_id: sessionId,
      });
      if (rpcError) throw new Error(rpcError.message);
      setHistoryReviews((prev) => ({ ...prev, [sessionId]: (data ?? []) as ReviewQuestion[] }));
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e ?? "");
      const msg = raw.toLowerCase().includes("no stored answers")
        ? "Session réalisée avant l'activation de la sauvegarde des corrections — indisponible pour celle-ci."
        : friendlyError(e, "Erreur lors du chargement de la correction.");
      setHistoryErrors((prev) => ({ ...prev, [sessionId]: msg }));
    } finally {
      setLoadingHistoryId(null);
    }
  }

  // ── COMPOSER LA SESSION ──
  if (phase === "builder") {
    const measured = TOPICS.filter((t) => mastery[t.key] !== null && mastery[t.key] !== undefined);
    const weak = measured.filter((t) => (mastery[t.key] as number) < WEAK_BELOW).map((t) => t.key);
    const palier = palierCiblee(previewMatieres, previewCount);
    const history = showAllHistory ? pastSessions : pastSessions.slice(0, 6);
    const canChart = pastSessions.length >= 2;
    const last5 = pastSessions.slice(0, 5);
    const avg5 = last5.length ? Math.round(last5.reduce((n, s) => n + pctOf(s.score, s.total), 0) / last5.length) : 0;
    const trophees = pastSessions.filter((s) => pctOf(s.score, s.total) >= PASS_THRESHOLD).length;
    const entiers = pastSessions.filter((s) => s.topics.length >= TOPICS.length);
    const meilleurEntier = entiers.length ? Math.max(...entiers.map((s) => pctOf(s.score, s.total))) : null;
    // les matières faibles d'abord (ordre fixe : une case cochée ne fait pas sauter la liste)
    const rangees = [...TOPICS].sort((a, b) => Number(weak.includes(b.key)) - Number(weak.includes(a.key)));
    // l'examen entier = le format demi-examen sur les dix matières (90 questions, 2 h 15)
    const nbEntier = 90;
    const tenterEntier = () => {
      const tout = new Set(TOPICS.map((t) => t.key));
      setSelected(tout);
      setFormat(90);
      setTaille(null);
      void generate(tout, 90, null);
    };

    // ?go=1 : la séance se prépare ; le constructeur attend (il revient si elle échoue)
    if (enRoute) {
      return (
        <div className="grid gap-6 py-2 md:py-8">
          <p className="card-quiet t-small m-0 px-5 py-4" role="status">
            Préparation de ta séance…
          </p>
        </div>
      );
    }

    return (
      <Page
        entete={<EnTete icone={<Icone nom="entrainer" size={16} />} titre="Entraînement ciblé" ligne={STUDIOLO.ligne} />}
        lead={
          <div className="flex flex-col gap-4 md:gap-[18px]">
            <Rangee
              tuiles={
                <>
                  {pastSessions.length > 0 && (
                    <Tuile
                      icone={<Trophy size={20} aria-hidden />}
                      titre={STUDIOLO.sessionsTitre}
                      ligne={STUDIOLO.sessionsLigne(pastSessions.length, trophees, avg5, last5.length)}
                      action={{ href: "#historique", label: STUDIOLO.sessionsAction }}
                    />
                  )}
                  <Vignette portrait nom="practice-corrige" titre={STUDIOLO.corrigeTitre} ligne={STUDIOLO.corrigeLigne} />
                </>
              }
              cote={
                <CarteLieu
                  label={STUDIOLO.nom}
                  ratio="16 / 10"
                  visuel={<Illustration nom="practice-studiolo" position="50% 60%" />}
                  vignette={<Illustration nom="practice-studiolo" position="50% 60%" decorative />}
                  marque={
                    <Sceau>
                      <Hourglass size={19} aria-hidden />
                    </Sceau>
                  }
                  nom={STUDIOLO.nom}
                  tailleNom="text-[28px] lg:text-[36px] xl:text-[40px]"
                  sousTitre={STUDIOLO.sous(fmtMinutes(Math.round(nbEntier * MIN_PER_QUESTION_MINUTES)))}
                  etat={STUDIOLO.etat(nbEntier, TOPICS.length, meilleurEntier)}
                  secondaire
                  action={{ href: "/practice", label: STUDIOLO.action(nbEntier), onClick: tenterEntier, disabled: busy }}
                />
              }
              heros={
                <section className="card-hero rl-in grid min-w-0 gap-x-8 gap-y-5 p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:p-8" aria-label={STUDIOLO.composer}>
                  <div className="flex min-w-0 flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <p className="t-eyebrow">{STUDIOLO.composer}</p>
                      <h2 className="t-h1 m-0 flex items-baseline gap-3" aria-live="polite">
                        <span>{previewCount}</span>
                        <span className="text-[0.5em] font-semibold">{previewCount > 1 ? "questions" : "question"}</span>
                      </h2>
                      <p className="t-micro m-0 inline-flex items-center gap-1.5">
                        {selected.size > 0 ? (
                          <>
                            <Trophy size={13} aria-hidden /> {fmtMinutes(previewMinutes)} · trophée {nomPalier(palier).toLowerCase()} à 70 % ou plus
                          </>
                        ) : (
                          STUDIOLO.choisir
                        )}
                      </p>
                    </div>
                    <p className="t-body m-0 max-w-[420px] text-muted">{STUDIOLO.phrase(weak.length)}</p>
                    {taille !== null ? (
                      <p className="t-small m-0 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>
                          Séance de {taille} questions{selected.size > 1 ? (lien.poids ? ", mêlées aux poids officiels de l'examen" : ", à parts égales entre tes matières") : ""}.
                        </span>
                        <button type="button" className="ink-link min-h-[44px] text-[13px] font-semibold md:min-h-0" onClick={() => setTaille(null)}>
                          Choisir un format
                        </button>
                      </p>
                    ) : (
                      <Seg
                        label="Format"
                        value={String(format) as "90" | "180"}
                        onChange={(v) => setFormat(Number(v) as 90 | 180)}
                        options={[
                          { key: "90", label: "Demi-examen · 90" },
                          { key: "180", label: "Complet · 180" },
                        ]}
                      />
                    )}
                    <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
                      <button type="button" className="btn btn-primary rl-press w-fit max-md:min-h-[44px]" disabled={selected.size === 0 || busy} onClick={() => void generate()}>
                        {busy ? "Préparation…" : "Générer la session"} {!busy && <ArrowRight size={16} aria-hidden />}
                      </button>
                      {selected.size > 0 && selected.size < TOPICS.length && (
                        <button type="button" className="ink-link min-h-[44px] text-[13px] font-semibold md:min-h-0" onClick={() => setSelected(new Set())}>
                          Effacer
                        </button>
                      )}
                    </div>
                    {error && (
                      <p role="alert" className="m-0 text-sm text-pen">
                        {error}
                      </p>
                    )}
                  </div>
                  <ul className="m-0 grid grid-cols-[minmax(0,1fr)] list-none content-start gap-0.5 p-0" aria-label="Tes matières">
                    {rangees.map((t) => {
                      const on = selected.has(t.key);
                      const m = mastery[t.key];
                      return (
                        <li key={t.key}>
                          <button
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleTopic(t.key)}
                            className={"rl-row flex min-h-[40px] w-full items-center gap-3 rounded-[10px] px-2.5 py-1.5 text-left " + (on ? "bg-surface" : "")}
                          >
                            <span aria-hidden className={"grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] " + (on ? "bg-white text-black" : "shadow-[inset_0_0_0_1.5px_var(--line-2)]")}>
                              {on && <Check size={12} strokeWidth={3} />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14px] font-semibold">{subjectName(t.key)}</span>
                              <span className="t-micro block">{String(t.weight).replace(".", ",")} % de l&apos;examen</span>
                            </span>
                            <span className="t-micro shrink-0 tabular-nums">{m !== null && m !== undefined ? `${m} %` : "—"}</span>
                            {m !== null && m !== undefined ? <Mini pct={m} rouge={m < WEAK_BELOW} /> : <span className="w-14 shrink-0" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              }
            />
            <Bande icone={<Icone nom="examen" size={22} />} titre={STUDIOLO.suiteTitre} ligne={STUDIOLO.suiteLigne} action={{ href: "/official-exams", label: STUDIOLO.suiteAction }} medaillon="exams-sceau" />
          </div>
        }
      >
        {pastSessions.length > 0 && (
          <section className="rl-section" id="historique" aria-label={STUDIOLO.copies}>
            <SectionHead
              title={STUDIOLO.copies}
              action={
                canChart ? (
                  <Seg
                    label="Affichage"
                    value={historyTab}
                    onChange={setHistoryTab}
                    options={[
                      { key: "history", label: "Historique" },
                      { key: "progress", label: "Progression" },
                    ]}
                  />
                ) : undefined
              }
              meta={`${pastSessions.length} session${pastSessions.length > 1 ? "s" : ""}`}
            />

            {historyTab === "progress" && canChart ? (
              <PracticeProgressChart pastSessions={pastSessions} topicLabels={TOPIC_LABELS} />
            ) : (
              <div className="card overflow-hidden">
                <ul className="m-0 list-none divide-y divide-line p-0">
                  {history.map((s) => {
                    const pct = pctOf(s.score, s.total);
                    const passed = pct >= PASS_THRESHOLD;
                    const palierS = nomPalier(palierCiblee(s.topics.length, s.total, s.completed_at)).toLowerCase();
                    const expanded = expandedHistoryId === s.id;
                    const rev = historyReviews[s.id];
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          aria-expanded={expanded}
                          onClick={() => void toggleHistoryReview(s.id)}
                          className="rl-row flex w-full items-center gap-3.5 px-4 py-3.5 text-left md:px-5"
                        >
                          <span
                            className={"grid h-9 w-9 shrink-0 place-items-center rounded-[11px] " + (passed ? "bg-white text-black" : "bg-surface-2 text-muted")}
                            title={passed ? `Trophée ${palierS}` : "Sous 70 %"}
                          >
                            <Trophy size={16} aria-hidden strokeWidth={passed ? 2.2 : 1.6} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14.5px] font-semibold">{topicsSummary(s.topics, 2)}</span>
                            <span className="t-micro mt-0.5 block">
                              {dayLabel(s.completed_at)} · {s.total} questions
                              {s.duration_seconds ? ` · ${fmtMinutes(Math.max(1, Math.round(s.duration_seconds / 60)))}` : ""}
                              {passed ? ` · trophée ${palierS}` : ""}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className={"block text-[15px] font-semibold tabular-nums " + (pct < 50 ? "text-pen" : "")}>{pct} %</span>
                            <span className="t-micro block tabular-nums">
                              {s.score}/{s.total}
                            </span>
                          </span>
                          <ChevronDown size={16} aria-hidden className={"shrink-0 text-muted transition-transform " + (expanded ? "rotate-180" : "")} />
                        </button>
                        {expanded && (
                          <div className="border-t border-line bg-surface-2/30 px-4 py-4 md:px-5">
                            {loadingHistoryId === s.id && <p className="t-small m-0">Chargement de la correction…</p>}
                            {historyErrors[s.id] && <p className="t-small m-0">{historyErrors[s.id]}</p>}
                            {rev && (
                              <ReviewSection
                                review={rev}
                                compact
                                action={<CopyForAi review={rev} score={s.score} total={s.total} kind="practice" size="sm" onError={setError} />}
                              />
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {pastSessions.length > history.length && (
                  <div className="border-t border-line px-4 py-3 md:px-5">
                    <button type="button" className="text-[13px] font-semibold text-muted transition-colors hover:text-white" onClick={() => setShowAllHistory(true)}>
                      {pastSessions.length - history.length > 1 ? `Voir les ${pastSessions.length - history.length} autres` : "Voir la dernière"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </Page>
    );
  }

  const topicNames = topicsSummary(tirees, 3);

  // ── PRÊTE ──
  if (phase === "ready") {
    return (
      <div className="grid gap-6 py-2 md:py-8">
        <ReadyCard
          eyebrow="Entraînement ciblé · session prête"
          title={`${questions.length} questions`}
          meta={`${fmtMinutes(Math.round(secondsLeft / 60))} · ${topicNames}`}
          rules={[
            "Pas de correction pendant la session : tout arrive à la fin, avec les explications.",
            "Tu peux revenir sur une question et changer ta réponse jusqu'à la fin.",
            "Pause possible : le chrono s'arrête et la question se cache.",
          ]}
          onCancel={backToBuilder}
          cancelLabel="Changer les matières"
          onStart={start}
        />
      </div>
    );
  }

  // ── RÉSULTAT : la copie corrigée ──
  if (phase === "done") {
    const pct = total > 0 ? Math.round((score / total) * 100) : null;
    const passed = pct !== null && pct >= PASS_THRESHOLD;
    // le trophée de la séance, connu sur place (même règle qu'en base : plafond par taille) ; l'annonce le montre tout de suite
    const gagne: TropheeGagne[] = passed ? [{ source: "ciblee", palier: palierCiblee(tirees.length, total), ref: topicsSummary(tirees, 3) }] : [];
    const many = new Set(review.map((q) => q.topic ?? "")).size > 1;
    const minutes = lastDuration ? Math.max(1, Math.round(lastDuration / 60)) : null;
    const meta = xpAwarded > 0 ? texteGain(xpAwarded, xpMult) : "";

    return (
      <div className="rl-page">
        <FinDeSession
          epreuve={surTitreSession(EPREUVE.practice, total, minutes)}
          titre={topicsSummary(tirees, 2) || EPREUVE.practice}
          meta={meta || undefined}
          score={score}
          total={total}
          review={review}
          jour={traits}
          ajoutes={ajoutes}
          ia={total > 0 ? <CopyForAi review={review} score={score} total={total} kind="practice" size="action" onError={setError} /> : null}
          liens={
            <>
              <button type="button" className="ink-link" onClick={backToBuilder}>
                Nouvelle session
              </button>
              <Link href="/entrainement" className="text-[13.5px] font-semibold text-muted transition-colors hover:text-white">
                Retour à S&apos;entraîner
              </Link>
            </>
          }
          notes={
            // une séance ciblée ne donne que son propre trophée : sans lui, pas d'annonce (ni de ligne vide)
            gagne.length > 0 || error ? (
              <>
                {gagne.length > 0 && <AnnonceTrophee depuis={debut} connus={gagne} className="pt-1" />}
                {error && (
                  <p role="alert" className="m-0 text-sm text-pen">
                    {error}
                  </p>
                )}
              </>
            ) : null
          }
        >
          {many && <TopicBreakdown review={review} />}
          <ReviewSection review={review} />
        </FinDeSession>
      </div>
    );
  }

  // ── EN COURS ──
  const answered = answers.filter((a) => a !== null).length;
  const current = questions[idx];
  const last = idx === questions.length - 1;
  const unanswered = questions.length - answered;

  function askEnd() {
    if (unanswered > 0) setConfirmEnd(true);
    else void submit();
  }

  return (
    <div className="mx-auto grid w-full max-w-[820px] gap-5 md:gap-6">
      <RunnerBar
        label="Entraînement ciblé"
        index={idx}
        total={questions.length}
        answered={answered}
        secondsLeft={secondsLeft}
        paused={paused}
        actions={
          <>
            <PauseToggle paused={paused} onToggle={() => setPaused((v) => !v)} />
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={askEnd}>
              {busy ? "Envoi…" : "Terminer"}
            </button>
          </>
        }
      />

      {confirmEnd && (
        <div role="alert" className="card-quiet rl-in flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="m-0 text-[14px]">
            Encore <b>{unanswered}</b> question{unanswered > 1 ? "s" : ""} sans réponse. Remettre ta copie quand même ?
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmEnd(false)}>
              Continuer
            </button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void submit()}>
              Remettre ma copie
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="m-0 text-sm text-pen">
          {error}
        </p>
      )}

      {paused ? (
        <PauseCard onResume={() => setPaused(false)} />
      ) : (
        current && (
          <QuestionCard
            index={idx}
            total={questions.length}
            prompt={current.prompt}
            footer={
              <QuestionNav
                onPrev={() => setIdx((i) => i - 1)}
                prevDisabled={idx === 0}
                next={
                  last ? (
                    <button type="button" className="btn btn-primary rl-press" disabled={busy} onClick={askEnd}>
                      Remettre ma copie <ArrowRight size={16} aria-hidden />
                    </button>
                  ) : (
                    <button type="button" className="btn btn-primary rl-press" onClick={() => setIdx((i) => i + 1)}>
                      Suivante <ArrowRight size={16} aria-hidden />
                    </button>
                  )
                }
              />
            }
          >
            {current.choices.map((c, ci) => (
              <ChoiceButton
                key={ci}
                index={ci}
                text={c}
                state={answers[idx] === ci ? "picked" : "idle"}
                onClick={() => {
                  setAnswers((prev) => {
                    const next = [...prev];
                    next[idx] = ci;
                    return next;
                  });
                }}
              />
            ))}
          </QuestionCard>
        )
      )}

      {!paused && (
        <QuestionMap total={questions.length} current={idx} isAnswered={(i) => answers[i] !== null && answers[i] !== undefined} onJump={setIdx} />
      )}
    </div>
  );
}
