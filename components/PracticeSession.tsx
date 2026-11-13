"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ChevronDown, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { multDuJour, texteGain, xpAvecSerie } from "@/lib/serie-encre";
import { friendlyError } from "@/lib/errors";
import { PracticeProgressChart } from "@/components/PracticeProgressChart";
import { TOPICS, TOPIC_LABELS } from "@/lib/practiceTopics";
import { ChoixNotions, type InfoChoix } from "@/components/notions/ChoixNotions";
import { CHOIX_VIDE, choixVide, type ChoixNotionsValeur } from "@/lib/notions-choix";
import { NOTIONS_CHOIX } from "@/lib/voice-notions";
import { lireLienPractice, matieresServies, melanger, repartir, tirerSeance } from "@/lib/practice-lien";
import { nomPalier, palierCiblee, type TropheeGagne } from "@/lib/trophees";
import { AnnonceTrophee } from "@/components/trophees/AnnonceTrophee";
import { ActionEncre, ColonneSeance, EnTeteSousPage, Scene, SousPage } from "@/components/ui/SousPage";
import { CompteLancer, Lancement, Niveaux, NotePlanche, Onglets, Planche, Reglage, Reglages, TetePlanche, Touches, type LigneNiveau } from "@/components/session/Selection";
import { dejaVu } from "@/components/session/premiere-visite";
import { codeMatiere } from "@/components/entrainement/pieces";
import { NBSP } from "@/lib/voice";
import { STUDIOLO } from "@/lib/voice-outils";
import { RETOUR_ENTRAINEMENT, SOUS_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";
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
  TopicBreakdown,
} from "@/components/session/parts";
import { PASS_THRESHOLD, fmtMinutes, pctOf, subjectName, topicsSummary, type ReviewQuestion } from "@/components/session/review";
import { FinDeSession } from "@/components/session/FinDeSession";
import { useTraitsDuJour } from "@/components/session/useTraitsDuJour";
import { BilanRetest, RetestRatures } from "@/components/notions/RetestRatures";
import { bilanRetest, lireSimilaires, type CibleRetest } from "@/lib/notions-similaires";
import { RETEST } from "@/lib/voice-notions";
import { useEnFrancais } from "@/components/session/EnFrancais";
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
  /** la taille choisie (null : le format) ; le mode examen */
  taille?: number | null;
  examen?: boolean;
};

const MIN_PER_QUESTION_MINUTES = 135 / 90; // même ratio que l'examen officiel (135min/90Q)
/** les tailles de séance proposées par la barre de réglages (le nombre de questions) ; « f180 » : l'examen complet, aux poids officiels */
const TAILLES = ["15", "30", "45", "90"] as const;
/**
 * Ce que la base peut servir par matière sur le chemin « une taille » : chaque matière y est tirée
 * avec p_format 180, et generate_practice_session la limite alors à round(poids × 1,8) questions
 * (DER 12, QM, ECO et CI 14, ALT 15…). Le compte affiché sur Lancer en tient compte.
 */
const DISPO: Record<string, number> = Object.fromEntries(TOPICS.map((t) => [t.key, Math.round(t.weight * 1.8)]));
/** sans mesure, les trois matières les plus lourdes à l'examen sont cochées à l'arrivée (Lancer toujours actif) */
const LOURDES = ["ethics", "fsa", "fixed_income"];
const somme = (parts: Record<string, number>) => Object.values(parts).reduce((a, b) => a + b, 0);
const TAILLES_NOTIONS = ["10", "20", "30", "45", "60"] as const;

/** Les matières conseillées : les trois plus faibles parmi celles qui sont mesurées. */
function plusFaibles(mastery: Record<string, number | null>, n = 3): string[] {
  return TOPICS.filter((t) => typeof mastery[t.key] === "number")
    .sort((a, b) => (mastery[a.key] as number) - (mastery[b.key] as number))
    .slice(0, n)
    .map((t) => t.key);
}

/** L'ordre du programme d'une matière (sans mélange, la séance les donne l'une après l'autre). */
const rangMatiere = (cle: string) => {
  const i = TOPICS.findIndex((t) => t.key === cle);
  return i < 0 ? TOPICS.length : i;
};

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
  // ?similaires=<ratures> : la séance se prépare tout de suite, sur des questions voisines
  const [similaires] = useState(() => lireSimilaires(searchParams.get("similaires")));
  const [retest, setRetest] = useState<CibleRetest[] | null>(null);
  // les conseillées : les trois matières les plus faibles (cochées et entourées au départ)
  const [conseillees] = useState(() => plusFaibles(mastery));
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (demo?.selected) return new Set(demo.selected);
    if (lien.matieres) return new Set(lien.matieres);
    if (conseillees.length > 0) return new Set(conseillees);
    // un joueur neuf : les dix au mode examen, sinon les trois plus lourdes à l'examen
    return new Set(searchParams.get("mode") === "examen" ? TOPICS.map((t) => t.key) : LOURDES);
  });
  // ?mode=examen : aux poids de l'examen, sans pause (/exam et /session gardent leur propre examen sur tes QCM)
  const [examen, setExamen] = useState(() => demo?.examen ?? searchParams.get("mode") === "examen");
  // le mélange des matières dans la séance (activé par défaut : l'entrelacement aide à retenir)
  const [melange, setMelange] = useState(true);
  // ?format=180 (lien d'une quête du Codex : certaines matières n'atteignent 15 questions qu'en format complet)
  const [format, setFormat] = useState<90 | 180>(demo?.format ?? lien.format ?? 90);
  // ?n= : la taille demandée par le lien ; choisir un format la rend au format
  const [taille, setTaille] = useState<number | null>(demo ? (demo.taille === undefined ? 30 : demo.taille) : lien.taille ?? (lien.format ? null : 30));
  // les matières de la séance tirée (celles qui ont reçu des questions) : la copie, le trophée
  const [tirees, setTirees] = useState<string[]>(demo?.selected ?? []);
  // le choix par notion : au lieu des matières, des notions et des concepts, à parts égales
  const [parNotions, setParNotions] = useState(false);
  const [choix, setChoix] = useState<ChoixNotionsValeur>(CHOIX_VIDE);
  const [infoChoix, setInfoChoix] = useState<InfoChoix>({ topics: [], total: 0 });
  const [tailleNotions, setTailleNotions] = useState(30);
  // l'instant où l'épreuve a commencé : l'annonce des trophées compte depuis lui
  const [debut, setDebut] = useState("");
  // ?go=1 : la séance se prépare dès l'arrivée (le constructeur ne s'affiche qu'en cas d'échec)
  const [enRoute, setEnRoute] = useState(!demo && (lien.go || similaires.length > 0));
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

  // la capacité réelle de la sélection sur le chemin « une taille » (DISPO) : le compte de Lancer ne promet rien de plus
  const capacite = [...selected].reduce((n, k) => n + (DISPO[k] ?? 0), 0);
  const partsTaille = taille !== null ? repartir(taille, [...selected], { poids: lien.poids || examen, dispo: DISPO }) : null;
  const previewCount = parNotions
    ? Math.min(tailleNotions, infoChoix.total)
    : partsTaille
      ? somme(partsTaille)
      : [...selected].reduce((sum, key) => {
          const w = TOPICS.find((t) => t.key === key)?.weight ?? 0;
          return sum + Math.round((w / 100) * format);
        }, 0);
  const previewMinutes = Math.max(5, Math.round(previewCount * MIN_PER_QUESTION_MINUTES));
  // les matières qui recevront des questions (une petite séance aux poids officiels peut en laisser une de côté)
  const previewMatieres = parNotions ? infoChoix.topics.length : partsTaille ? matieresServies(partsTaille).length : selected.size;
  // l'arrivée (cercles tracés) ne se joue qu'à la première visite de la session
  const [calme, setCalme] = useState(false);
  useEffect(() => setCalme(dejaVu("practice")), []);

  const pret = parNotions ? !choixVide(choix) : selected.size > 0;

  async function genererNotions() {
    setBusy(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("generate_practice_notions", { p_notions: choix.notions, p_concepts: choix.concepts, p_n: tailleNotions });
      if (rpcError) throw new Error(rpcError.message);
      const lus = (data ?? []) as (ActiveQuestion & { topic: string })[];
      if (lus.length === 0) {
        setError("Aucune question disponible pour cette sélection.");
        return;
      }
      // mélangées, ou rangées matière par matière (tri stable : l'ordre de chacune est gardé)
      const ranges = melange ? melanger(lus) : [...lus].sort((a, b) => rangMatiere(a.topic) - rangMatiere(b.topic));
      const qs = ranges.map(({ topic: _topic, ...q }, i) => ({ ...q, position: i }));
      setQuestions(qs);
      setAnswers(qs.map(() => null));
      setTirees([...new Set(lus.map((q) => q.topic))]);
      setSecondsLeft(Math.max(5, Math.round(qs.length * MIN_PER_QUESTION_MINUTES)) * 60);
      setPhase("ready");
    } catch (e: unknown) {
      setError(friendlyError(e, "Erreur lors de la génération"));
    } finally {
      setBusy(false);
    }
  }

  async function genererSimilaires(ids: string[]) {
    setBusy(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("generate_similaires", { p_questions: ids });
      if (rpcError) throw new Error(rpcError.message);
      const lus = (data ?? []) as (ActiveQuestion & { topic: string; notion: string; concept: string | null })[];
      if (lus.length === 0) {
        setError(RETEST.erreur);
        return;
      }
      const qs = lus.map(({ id, position, prompt, choices }) => ({ id, position, prompt, choices }));
      setQuestions(qs);
      setAnswers(qs.map(() => null));
      setTirees([...new Set(lus.map((q) => q.topic))]);
      setRetest(lus.map((q) => ({ questionId: q.id, topic: q.topic, notion: q.notion, concept: q.concept })));
      setSecondsLeft(Math.max(5, Math.round(qs.length * MIN_PER_QUESTION_MINUTES)) * 60);
      setPhase("ready");
    } catch (e: unknown) {
      setError(friendlyError(e, "Erreur lors de la génération"));
    } finally {
      setBusy(false);
      setEnRoute(false);
    }
  }

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
        if (melange) qs = melanger(qs).map((q, i) => ({ ...q, position: i }));
      } else {
        // une taille demandée : chaque matière tirée à part, au format complet
        // (sa plus grande réserve), puis la part de chacune, mêlées
        const lus = await Promise.all(cles.map((t) => supabase.rpc("generate_practice_session", { p_topics: [t], p_format: 180 })));
        const rate = lus.find((r) => r.error);
        if (rate?.error) throw new Error(rate.error.message);
        const parMatiere = Object.fromEntries(cles.map((t, i) => [t, (lus[i].data ?? []) as ActiveQuestion[]]));
        const tirage = tirerSeance(parMatiere, n, cles, { poids: lien.poids || examen });
        // sans mélange : les matières l'une après l'autre, dans l'ordre du programme
        const matiereDe = new Map(cles.flatMap((t) => parMatiere[t].map((q) => [q.id, t] as const)));
        const ordre = melange ? tirage.questions : [...tirage.questions].sort((a, b) => rangMatiere(matiereDe.get(a.id) ?? "") - rangMatiere(matiereDe.get(b.id) ?? ""));
        qs = ordre.map((q, i) => ({ ...q, position: i }));
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
    if (similaires.length > 0) {
      // l'adresse se nettoie : un rechargement ne doit pas relancer un tirage ni perdre la copie
      window.history.replaceState(null, "", "/practice");
      void genererSimilaires(similaires);
    }
    else if (selected.size === 0) setEnRoute(false);
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
    setRetest(null);
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

  // « En français » : la question d'Ethics traduite (avant les retours anticipés : c'est un hook)
  const fr = useEnFrancais(tirees.includes("ethics"), questions, questions[idx]);

  // ── COMPOSER LA SESSION : la sélection façon choix de niveau ──
  if (phase === "builder") {
    const P = SOUS_ENTRAINEMENT.practice;
    // le palier visé : celui d'une copie parfaite, donc le plafond de sa taille
    const palier = palierCiblee(previewCount, previewCount, previewMatieres) ?? 1;
    const canChart = pastSessions.length >= 2;
    const history = showAllHistory ? pastSessions : pastSessions.slice(0, 3);

    // ?go=1 : la séance se prépare ; la sélection attend (elle revient si la préparation échoue)
    if (enRoute) {
      return (
        <ColonneSeance className="py-2 md:py-8">
          <p className="card-quiet t-small m-0 px-5 py-4" role="status">
            Préparation de ta séance…
          </p>
        </ColonneSeance>
      );
    }

    // la porte : la dernière copie en chiffre-héros ; la ligne d'état compte les copies et les ors
    // (la plus fragile reste à la planche, entourée : rien de répété entre la porte et l'objet)
    const derniere = pastSessions[0];
    const heros = derniere && derniere.total > 0 ? { valeur: `${pctOf(derniere.score, derniere.total)}${NBSP}%`, legende: P.heros } : null;
    const ors = pastSessions.filter((x) => palierCiblee(x.score, x.total, x.topics.length, x.completed_at) === 3).length;
    const ligne = P.etat(pastSessions.length, ors);

    const lignes: LigneNiveau[] = TOPICS.map((t, i) => {
      const m = mastery[t.key];
      const pct = typeof m === "number" ? m : null;
      const conseil = conseillees.includes(t.key);
      const nom = subjectName(t.key);
      return { cle: t.key, numero: String(i + 1).padStart(2, "0"), nom, poids: P.poids(String(t.weight).replace(".", ",")), pct, conseil, on: selected.has(t.key), lecture: P.lecture(nom, pct, conseil) };
    });

    const basculerExamen = (suivant: boolean) => {
      if (suivant === examen) return;
      setExamen(suivant);
      try {
        const u = new URL(window.location.href);
        if (suivant) u.searchParams.set("mode", "examen");
        else u.searchParams.delete("mode");
        window.history.replaceState(null, "", u.pathname + u.search + u.hash);
      } catch {
        // l'adresse ne suit pas : le mode change quand même
      }
    };

    // « f180 » : l'examen complet aux poids officiels (le chemin « format », un seul appel) ; « format » : le format d'un lien du Codex
    const tailleCle = taille === null ? (format === 180 ? "f180" : "format") : String(taille);
    const optionsTaille = [
      ...(lien.format !== null && lien.format !== 180 ? [{ key: "format", label: String(format) }] : []),
      ...TAILLES.map((k) => ({ key: k as string, label: k, disabled: Number(k) > capacite && selected.size > 0, titre: Number(k) > capacite && selected.size > 0 ? P.tropGrand(capacite) : undefined })),
      { key: "f180", label: "180" },
    ];
    const choisirTaille = (k: string) => {
      if (k === "f180") {
        setTaille(null);
        setFormat(180);
      } else if (k === "format") {
        setTaille(null);
        setFormat(lien.format ?? 90);
      } else {
        setTaille(Number(k));
        setFormat(lien.format === 180 ? 90 : lien.format ?? 90);
      }
    };

    const matieresNote = parNotions ? NOTIONS_CHOIX.resume(choix.notions.length, choix.concepts.length) : [...selected].sort((a, b) => rangMatiere(a) - rangMatiere(b)).map((k) => codeMatiere(k, subjectName(k))).join(" · ");
    const note = examen && !parNotions ? P.noteExamen(matieresNote, fmtMinutes(previewMinutes)) : P.note(matieresNote, fmtMinutes(previewMinutes), nomPalier(palier).toLowerCase());

    const pied = (
      <>
        <Reglages>
          <Reglage nom={P.questions}>
            {parNotions ? (
              <Touches label={NOTIONS_CHOIX.taille} value={String(tailleNotions)} options={TAILLES_NOTIONS.map((k) => ({ key: k as string, label: k }))} onChange={(k) => setTailleNotions(Number(k))} />
            ) : (
              <Touches label={P.questions} value={tailleCle} options={optionsTaille} onChange={choisirTaille} />
            )}
          </Reglage>
          <Reglage nom={P.melange} aide={P.melangeAide}>
            <Touches
              label={P.melange}
              value={melange ? "oui" : "non"}
              options={[
                { key: "oui", label: P.melangeOui },
                { key: "non", label: P.melangeNon },
              ]}
              onChange={(k) => setMelange(k === "oui")}
            />
          </Reglage>
          <Reglage nom={P.examen} aide={P.examenAide}>
            <Touches
              label={P.examen}
              value={examen ? "oui" : "non"}
              options={[
                { key: "oui", label: P.examenOui },
                { key: "non", label: P.examenNon },
              ]}
              onChange={(k) => basculerExamen(k === "oui")}
            />
          </Reglage>
        </Reglages>
        <Lancement>
          <ActionEncre disabled={!pret || busy} onClick={() => void (parNotions ? genererNotions() : generate())}>
            {busy ? (
              "Préparation…"
            ) : (
              <>
                {P.lancer}
                <CompteLancer n={previewCount} />
                <ArrowRight size={19} aria-hidden />
              </>
            )}
          </ActionEncre>
          <NotePlanche alerte={!!error}>{error ?? (pret ? note : parNotions ? NOTIONS_CHOIX.rienChoisi : STUDIOLO.choisir)}</NotePlanche>
        </Lancement>
      </>
    );

    return (
      <SousPage
        entete={
          <EnTeteSousPage retour={RETOUR_ENTRAINEMENT} titre={P.titre} ligne={ligne} heros={heros} illustration={{ nom: "practice-studiolo-porte", position: "50% 50%" }} />
        }
      >
        <Planche
          clair={parNotions}
          calme={calme}
          tete={
            <>
              <TetePlanche titre={P.matieres} compte={parNotions ? (pret ? NOTIONS_CHOIX.resume(choix.notions.length, choix.concepts.length) : null) : `${selected.size}/${TOPICS.length}`} />
              <div className="flex items-center gap-3">
                {parNotions && pret && (
                  <button type="button" className="ink-link min-h-[40px] text-[13px] font-semibold" onClick={() => { setChoix(CHOIX_VIDE); setInfoChoix({ topics: [], total: 0 }); }}>
                    {NOTIONS_CHOIX.effacer}
                  </button>
                )}
                <Onglets
                  label={NOTIONS_CHOIX.parNotion}
                  value={parNotions ? "notion" : "matiere"}
                  onChange={(v) => setParNotions(v === "notion")}
                  options={[
                    { key: "matiere", label: P.parMatiere },
                    { key: "notion", label: P.parNotion },
                  ]}
                />
              </div>
            </>
          }
          pied={pied}
        >
          {parNotions ? (
            <ChoixNotions source="practice" valeur={choix} onChange={(v, info) => { setChoix(v); setInfoChoix(info); }} />
          ) : (
            <Niveaux lignes={lignes} onBascule={toggleTopic} label={P.matieres} poidsVifs={examen} />
          )}
        </Planche>

        {/* l'annexe indispensable : les copies passées et leur correction (on ne les relit nulle part ailleurs) ; trois lignes, la suite à la demande, sans bande noire */}
        {pastSessions.length > 0 && (
          <Scene etiquette={P.copies}>
            <div id="historique" className="min-w-0 scroll-mt-24">
            {historyTab === "progress" && canChart ? (
              <PracticeProgressChart pastSessions={pastSessions} topicLabels={TOPIC_LABELS} />
            ) : (
              <ul className="m-0 min-w-0 list-none divide-y divide-line p-0">
                {history.map((s, rang) => {
                  const pct = pctOf(s.score, s.total);
                  const passed = pct >= PASS_THRESHOLD;
                  const palierS = nomPalier(palierCiblee(s.score, s.total, s.topics.length, s.completed_at) ?? 1).toLowerCase();
                  const expanded = expandedHistoryId === s.id;
                  const rev = historyReviews[s.id];
                  // la première ligne : son pourcentage est déjà le chiffre-héros de la porte
                  const tete = rang === 0 && heros !== null;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-label={tete ? `${topicsSummary(s.topics, 2)}, ${pct}${NBSP}%` : undefined}
                        onClick={() => void toggleHistoryReview(s.id)}
                        className="rl-row flex min-h-[52px] w-full items-center gap-3.5 rounded-[10px] px-2 py-2.5 text-left"
                      >
                        <Trophy size={16} aria-hidden strokeWidth={passed ? 2.4 : 1.5} className={"shrink-0 " + (passed ? "" : "text-muted opacity-50")} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14.5px] font-semibold">{topicsSummary(s.topics, 2)}</span>
                          <span className="t-micro block">
                            {dayLabel(s.completed_at)} · {s.total} questions
                            {s.duration_seconds ? ` · ${fmtMinutes(Math.max(1, Math.round(s.duration_seconds / 60)))}` : ""}
                            {passed ? ` · trophée ${palierS}` : ""}
                          </span>
                        </span>
                        {tete ? (
                          <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{P.derniere}</span>
                        ) : (
                          <span className={"shrink-0 font-mono text-[15px] font-semibold tabular-nums " + (pct < 50 ? "text-pen" : "")}>
                            {pct}
                            {NBSP}%
                          </span>
                        )}
                        <ChevronDown size={16} aria-hidden className={"shrink-0 text-muted transition-transform " + (expanded ? "rotate-180" : "")} />
                      </button>
                      {expanded && (
                        <div className="px-2 pb-4 pt-1">
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
            )}
            {(pastSessions.length > 3 || canChart) && (
              <p className="m-0 flex flex-wrap gap-x-5 gap-y-1">
                {historyTab === "history" && pastSessions.length > 3 && (
                  <button type="button" className="min-h-[40px] text-[13px] font-semibold text-muted transition-colors hover:text-[var(--ink)]" onClick={() => setShowAllHistory((v) => !v)}>
                    {showAllHistory ? P.replier : P.autres(pastSessions.length - 3)}
                  </button>
                )}
                {canChart && (
                  <button type="button" className="min-h-[40px] text-[13px] font-semibold text-muted transition-colors hover:text-[var(--ink)]" onClick={() => setHistoryTab((v) => (v === "history" ? "progress" : "history"))}>
                    {historyTab === "history" ? P.progression : P.historique}
                  </button>
                )}
              </p>
            )}
            </div>
          </Scene>
        )}
      </SousPage>
    );
  }

  const topicNames = topicsSummary(tirees, 3);

  // ── PRÊTE ──
  if (phase === "ready") {
    return (
      <ColonneSeance className="py-2 md:py-8">
        <ReadyCard
          eyebrow={retest ? RETEST.pret : "Entraînement ciblé · session prête"}
          title={`${questions.length} questions`}
          meta={`${fmtMinutes(Math.round(secondsLeft / 60))} · ${topicNames}`}
          rules={[
            ...(retest ? [RETEST.regle] : []),
            "Pas de correction pendant la session : tout arrive à la fin, avec les explications.",
            "Tu peux revenir sur une question et changer ta réponse jusqu'à la fin.",
            examen ? SOUS_ENTRAINEMENT.practice.examenAide : "Pause possible : le chrono s'arrête et la question se cache.",
          ]}
          onCancel={backToBuilder}
          cancelLabel={retest ? RETEST.annuler : "Changer les matières"}
          onStart={start}
        />
      </ColonneSeance>
    );
  }

  // ── RÉSULTAT : la copie corrigée ──
  if (phase === "done") {
    const pct = total > 0 ? Math.round((score / total) * 100) : null;
    const passed = pct !== null && pct >= PASS_THRESHOLD;
    // le trophée de la séance, connu sur place (même règle qu'en base : plafond par taille) ; l'annonce le montre tout de suite
    const palierFin = palierCiblee(score, total, tirees.length);
    const gagne: TropheeGagne[] = palierFin ? [{ source: "ciblee", palier: palierFin, ref: topicsSummary(tirees, 3) }] : [];
    const many = new Set(review.map((q) => q.topic ?? "")).size > 1;
    const minutes = lastDuration ? Math.max(1, Math.round(lastDuration / 60)) : null;
    const meta = xpAwarded > 0 ? texteGain(xpAwarded, xpMult) : "";

    return (
      <ColonneSeance>
        <div className="rl-page">
        <FinDeSession
          epreuve={surTitreSession(retest ? RETEST.epreuve : EPREUVE.practice, total, minutes)}
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
          {retest && <BilanRetest lignes={bilanRetest(retest, review)} />}
          <RetestRatures questionIds={review.filter((q) => !q.is_correct && q.selected_index !== null).map((q) => q.question_id)} onLancer={(ids) => void genererSimilaires(ids)} occupe={busy} erreur={error} />
          {many && <TopicBreakdown review={review} />}
          <ReviewSection review={review} />
        </FinDeSession>
        </div>
      </ColonneSeance>
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
    <ColonneSeance>
      <RunnerBar
        label="Entraînement ciblé"
        index={idx}
        total={questions.length}
        answered={answered}
        secondsLeft={secondsLeft}
        paused={paused}
        actions={
          <>
            {fr.bouton}
            {!examen && <PauseToggle paused={paused} onToggle={() => setPaused((v) => !v)} />}
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
            prompt={fr.prompt ?? current.prompt}
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
            {(fr.choices ?? current.choices).map((c, ci) => (
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
    </ColonneSeance>
  );
}
