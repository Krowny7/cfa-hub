"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  CloudOff,
  Download,
  ExternalLink,
  ListChecks,
  Lock,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Shuffle,
  Target,
  Trash2,
} from "lucide-react";
import { CopyButton, FicheQuizRunner, type RunItem } from "@/components/FicheQuizRunner";
import { FicheProgressChart } from "@/components/FicheProgressChart";
import { createClient } from "@/lib/supabase/browser";
import { createSupabaseFicheApi, type FicheApi, type LogStorage } from "@/lib/ficheApi";
import { clearRun, loadRun, restoreRun, saveRun, type RestoredRun } from "@/lib/ficheRunStore";
import {
  buildErrorPoolExport,
  computePageProgress,
  computeQuestionStates,
  computeRuns,
  pickRandom,
  STREAK_TO_CLEAR,
  type AnswerMode,
  type AnswerRow,
  type DrillQuestion,
  type ReviewItem,
} from "@/lib/ficheLog";

export type DrillSet = {
  page: number;
  setId: string;
  title: string;
  questions: DrillQuestion[];
};

type Tab = "quiz" | "errors" | "mixed" | "progress";
type ActiveRun = {
  key: number;
  items: RunItem[];
  mode: AnswerMode;
  title: string;
  // Renseignés uniquement pour une série reprise.
  runId?: string;
  done?: ReviewItem[];
};

const MIXED_SIZE = 15;
const LAYOUT_KEY = "cfa_fiche_layout";

// Onglets liables avec ?onglet=… (ex. « Revoir » depuis Moi → ?onglet=erreurs).
const TAB_PARAM: Record<Tab, string> = { quiz: "quiz", errors: "erreurs", mixed: "melange", progress: "progression" };
const PARAM_TAB: Record<string, Tab> = { quiz: "quiz", erreurs: "errors", melange: "mixed", bilan: "mixed", progression: "progress" };

/** Thème d'une page, tiré du titre du set : « Equity — Drill Fiche Page 3 (Market Efficiency) ». */
function pageTheme(setTitle: string | undefined): string | null {
  if (!setTitle) return null;
  const m = /\(([^()]+)\)\s*$/.exec(setTitle);
  return m ? m[1].trim() : null;
}

// Mise en page des fiches : le cours (PDF) à gauche, l'entraînement à droite
// sur grand écran ; deux onglets "Cours / Entraînement" sur mobile. Toute
// réponse est journalisée (quiz_answer_log) : c'est ce qui alimente la
// progression par page, la liste d'erreurs à revoir et le graphique.
export function FicheWorkspace({
  title,
  description,
  backHref = "/fiches",
  backLabel = "Fiches de révision",
  pdfUrl,
  pdfDownloadName,
  pdfLabel,
  totalPages,
  drillSets,
  api: apiProp,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  pdfUrl: string | null;
  pdfDownloadName: string;
  pdfLabel: string;
  totalPages: number;
  drillSets: DrillSet[];
  api?: FicheApi;
}) {
  const api = useMemo(() => apiProp ?? createSupabaseFicheApi(createClient()), [apiProp]);

  const [mobileView, setMobileView] = useState<"course" | "train">("train");
  const [tab, setTab] = useState<Tab>("quiz");
  const [selectedPage, setSelectedPage] = useState<number | null>(drillSets[0]?.page ?? null);
  const [run, setRun] = useState<ActiveRun | null>(null);
  const [rows, setRows] = useState<AnswerRow[]>([]);
  const [storage, setStorage] = useState<LogStorage>("account");
  const [logLoading, setLogLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<"all" | number | null>(null);
  const [savedRun, setSavedRun] = useState<RestoredRun | null>(null);
  // Quiz en pleine largeur, PDF en dessous (au lieu de côte à côte).
  const [wide, setWide] = useState(false);
  // PDF replié ou non. Suit le mode discret (replié dès qu'il s'active) ;
  // le bouton de la barre du PDF permet aussi de le replier à la main.
  const [pdfOpen, setPdfOpen] = useState(true);

  useEffect(() => {
    const html = document.documentElement;
    const sync = () => setPdfOpen(html.dataset.discreet !== "1");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(html, { attributes: true, attributeFilter: ["data-discreet"] });
    return () => obs.disconnect();
  }, []);

  const setIds = useMemo(() => drillSets.map((d) => d.setId), [drillSets]);
  const byPage = useMemo(() => new Map(drillSets.map((d) => [d.page, d])), [drillSets]);

  useEffect(() => {
    let alive = true;
    api.fetchLog(setIds).then((r) => {
      if (!alive) return;
      setRows(r.rows);
      setStorage(r.storage);
      setLogLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [api, setIds]);

  useEffect(() => {
    try {
      setWide(localStorage.getItem(LAYOUT_KEY) === "wide");
    } catch {}
    // Lien direct vers un onglet (ex. « Revoir » depuis Moi → ?onglet=erreurs)
    const onglet = new URLSearchParams(window.location.search).get("onglet");
    if (onglet && PARAM_TAB[onglet]) {
      setTab(PARAM_TAB[onglet]);
      setMobileView("train");
    }
  }, []);

  function toggleWide() {
    setWide((w) => {
      try {
        localStorage.setItem(LAYOUT_KEY, w ? "split" : "wide");
      } catch {}
      return !w;
    });
  }

  // L'adresse suit l'onglet (sans recharger) : un rechargement y revient.
  function changeTab(t: Tab) {
    setTab(t);
    try {
      const url = new URL(window.location.href);
      if (t === "quiz") url.searchParams.delete("onglet");
      else url.searchParams.set("onglet", TAB_PARAM[t]);
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    } catch {
      // l'onglet change quand même
    }
  }

  const states = useMemo(() => computeQuestionStates(rows), [rows]);
  const progress = useMemo(() => computePageProgress(drillSets, states), [drillSets, states]);
  const progressByPage = useMemo(() => new Map(progress.map((p) => [p.page, p])), [progress]);
  const runs = useMemo(() => computeRuns(rows), [rows]);

  const allItems: RunItem[] = useMemo(
    () => drillSets.flatMap((d) => d.questions.map((q) => ({ q, page: d.page }))),
    [drillSets]
  );
  const poolItems: RunItem[] = useMemo(
    () => allItems.filter((it) => states.get(it.q.id)?.inErrorPool),
    [allItems, states]
  );

  // Une série par fiche, clé = titre de la fiche.
  const storageKey = title;
  useEffect(() => {
    const saved = loadRun(storageKey);
    setSavedRun(saved ? restoreRun(saved, allItems) : null);
  }, [storageKey, allItems]);

  const totals = useMemo(
    () =>
      progress.reduce(
        (acc, p) => ({
          total: acc.total + p.total,
          mastered: acc.mastered + p.mastered,
          weak: acc.weak + p.weak,
          attempts: acc.attempts + p.attempts,
          wrong: acc.wrong + p.wrongAttempts,
        }),
        { total: 0, mastered: 0, weak: 0, attempts: 0, wrong: 0 }
      ),
    [progress]
  );

  // Page PDF de synthèse correspondant à la page de quiz choisie : le PDF
  // alterne synthèse / QCM (synthèse 1 = page 1, synthèse 2 = page 3, …).
  const pdfPage = selectedPage ? selectedPage * 2 - 1 : null;
  const pdfSrc = pdfUrl ? (pdfPage ? `${pdfUrl}#page=${pdfPage}` : pdfUrl) : null;

  function startRun(items: RunItem[], mode: AnswerMode, runTitle: string) {
    if (items.length === 0) return;
    setNotice(null);
    setRun({ key: Date.now(), items, mode, title: runTitle });
    setMobileView("train");
  }

  // Appelé après chaque réponse : la série est sauvegardée telle quelle, ce
  // qui permet de la reprendre après un changement d'onglet, un rechargement
  // ou plusieurs jours plus tard.
  function persistProgress(current: ActiveRun, done: ReviewItem[], runId: string) {
    saveRun(storageKey, {
      v: 1,
      runId,
      mode: current.mode,
      title: current.title,
      items: current.items.map((it) => ({ id: it.q.id, page: it.page })),
      done,
      savedAt: Date.now(),
    });
    setSavedRun({ runId, mode: current.mode, title: current.title, items: current.items, done });
  }

  function resumeRun() {
    if (!savedRun) return;
    setNotice(null);
    setRun({
      key: Date.now(),
      items: savedRun.items,
      mode: savedRun.mode,
      title: savedRun.title,
      runId: savedRun.runId,
      done: savedRun.done,
    });
    setMobileView("train");
  }

  function discardSavedRun() {
    clearRun(storageKey);
    setSavedRun(null);
  }

  function selectPage(page: number) {
    setSelectedPage(page);
    setRun(null);
    changeTab("quiz");
  }

  function startMixed() {
    startRun(pickRandom(allItems, MIXED_SIZE), "mixed", `Bilan aléatoire (${Math.min(MIXED_SIZE, allItems.length)} questions)`);
  }

  function startErrors() {
    startRun(pickRandom(poolItems, poolItems.length), "errors", "Mes erreurs à revoir");
  }

  async function copyPoolForAi() {
    try {
      const review = await api.fetchReview(poolItems.map((it) => it.q.id));
      const items: ReviewItem[] = poolItems.map((it) => {
        const s = states.get(it.q.id);
        const r = review[it.q.id];
        return {
          prompt: it.q.prompt,
          choices: it.q.choices,
          selectedIndex: s?.lastSelectedWrong ?? null,
          correctIndex: r?.correctIndex ?? null,
          explanation: r?.explanation ?? null,
          isCorrect: false,
          tag: `Page ${it.page}`,
        };
      });
      await navigator.clipboard.writeText(buildErrorPoolExport(title, items));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setNotice("Impossible de copier automatiquement.");
    }
  }

  async function doReset(scope: "all" | number) {
    try {
      const ids = scope === "all" ? setIds : [byPage.get(scope)?.setId].filter((x): x is string => !!x);
      await api.resetLog(ids);
      setRows((prev) => prev.filter((r) => !ids.includes(r.set_id)));
      setConfirmReset(null);
      setNotice(scope === "all" ? "Historique de la fiche réinitialisé." : `Historique de la page ${scope} réinitialisé.`);
    } catch {
      setNotice("La réinitialisation a échoué. Réessaie dans un instant.");
    }
  }

  const tabs: SegItem<Tab>[] = [
    { key: "quiz", label: "Quiz", icon: <ListChecks size={15} /> },
    { key: "errors", label: "Mes erreurs", short: "Erreurs", icon: <Target size={15} />, badge: poolItems.length },
    { key: "mixed", label: "Bilan", icon: <Shuffle size={15} /> },
    { key: "progress", label: "Progression", short: "Progrès", icon: <BarChart3 size={15} /> },
  ];

  const activePage = selectedPage ? byPage.get(selectedPage) : undefined;
  const activeProgress = selectedPage ? progressByPage.get(selectedPage) : undefined;
  const activeTheme = pageTheme(activePage?.title);
  const successPct = totals.attempts > 0 ? Math.round(((totals.attempts - totals.wrong) / totals.attempts) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* ── En-tête : retour, titre, une ligne ; à droite l'état global de la fiche ── */}
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <div className="min-w-0">
          <Link href={backHref} className="t-small inline-flex items-center gap-1.5 font-semibold hover:text-white">
            <ArrowLeft size={14} aria-hidden /> {backLabel}
          </Link>
          <h1 className="t-h1 mt-3">{title}</h1>
          {description && <p className="t-small mt-2 max-w-[560px]">{description}</p>}
        </div>
        <div className="w-full md:w-[300px]">
          {logLoading ? (
            <div className="rl-skel h-[38px]" />
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-3 text-[12.5px] text-muted">
                <span>
                  <span className="font-mono text-[13px] font-semibold text-white tabular-nums">{totals.mastered}</span>
                  <span className="font-mono tabular-nums">/{totals.total}</span> maîtrisées
                </span>
                {totals.weak > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRun(null);
                      changeTab("errors");
                      setMobileView("train");
                    }}
                    className="font-semibold text-pen underline-offset-4 hover:underline"
                  >
                    {totals.weak} à revoir
                  </button>
                ) : (
                  <span>{rows.length === 0 ? "pas encore commencée" : "rien à revoir"}</span>
                )}
              </div>
              <StackBar className="mt-2.5" mastered={totals.mastered} weak={totals.weak} total={totals.total} />
            </>
          )}
        </div>
      </header>

      {/* Bascule Cours / Entraînement — mobile uniquement */}
      <SegTabs
        label="Affichage"
        className="w-full lg:hidden"
        equal
        value={mobileView}
        onChange={setMobileView}
        items={[
          { key: "course", label: "Cours", icon: <BookOpen size={15} /> },
          { key: "train", label: "Entraînement", icon: <ListChecks size={15} /> },
        ]}
      />

      <div className={wide ? "grid gap-6" : "grid items-start gap-6 lg:grid-cols-2 xl:gap-8"}>
        {/* ── Cours (PDF) ── */}
        <section
          aria-label="Cours"
          className={`${mobileView === "course" ? "block" : "hidden"} min-w-0 lg:block ${
            wide ? "lg:order-2" : "lg:sticky lg:top-[84px]"
          }`}
        >
          {!pdfSrc ? (
            <div className="card-quiet px-6 py-12 text-center">
              <BookOpen size={20} className="mx-auto text-muted" aria-hidden />
              <p className="t-small mt-3">Impossible de charger la fiche pour le moment. Réessaie dans un instant.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className={"flex items-center gap-2 py-2 pl-4 pr-2 " + (pdfOpen ? "border-b border-line" : "")}>
                <BookOpen size={15} className="shrink-0 text-muted" aria-hidden />
                <p className="min-w-0 flex-1 truncate text-[13px] font-semibold" title={pdfLabel}>
                  {selectedPage ? `Synthèse · page ${selectedPage}` : pdfLabel}
                </p>
                <button
                  type="button"
                  onClick={() => setPdfOpen((o) => !o)}
                  aria-expanded={pdfOpen}
                  className="btn btn-ghost btn-sm shrink-0"
                >
                  {pdfOpen ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
                  <span>
                    {pdfOpen ? "Masquer" : "Afficher"}
                    <span className="hidden sm:inline"> le PDF</span>
                  </span>
                </button>
                <a
                  href={pdfUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm shrink-0 px-2.5"
                  aria-label="Ouvrir le PDF dans un nouvel onglet"
                  title="Ouvrir dans un nouvel onglet"
                >
                  <ExternalLink size={15} aria-hidden />
                  <span className="hidden xl:inline">Ouvrir</span>
                </a>
                <a
                  href={pdfUrl ?? "#"}
                  download={pdfDownloadName}
                  className="btn btn-ghost btn-sm shrink-0 px-2.5"
                  aria-label="Télécharger le PDF"
                  title="Télécharger"
                >
                  <Download size={15} aria-hidden />
                  <span className="hidden xl:inline">Télécharger</span>
                </a>
              </div>
              {pdfOpen && (
                <iframe
                  key={pdfPage ?? 0}
                  src={pdfSrc}
                  title={`${title} — fiche`}
                  className={`block w-full bg-surface-2 ${wide ? "h-[80vh]" : "h-[72vh] lg:h-[calc(100vh-9.75rem)]"}`}
                />
              )}
            </div>
          )}
        </section>

        {/* ── Entraînement ── */}
        <section
          aria-label="Entraînement"
          className={`${mobileView === "train" ? "flex" : "hidden"} min-w-0 flex-col gap-5 lg:flex ${
            wide ? "lg:order-1 lg:mx-auto lg:w-full lg:max-w-3xl" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            <SegTabs
              label="Entraînement"
              className="min-w-0 flex-1 sm:flex-none"
              value={tab}
              onChange={(t) => {
                changeTab(t);
                setRun(null);
                setNotice(null);
                setConfirmReset(null);
              }}
              items={tabs}
            />
            <button
              type="button"
              onClick={toggleWide}
              className="icon-btn ml-auto hidden lg:inline-grid"
              aria-label={wide ? "Remettre le cours à côté du quiz" : "Quiz en pleine largeur, cours en dessous"}
              title={wide ? "Remettre le cours à côté du quiz" : "Quiz en pleine largeur, cours en dessous"}
            >
              {wide ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>

          {storage === "device" && (
            <div className="card-quiet flex gap-3 px-4 py-3.5" role="note">
              <CloudOff size={16} className="mt-0.5 shrink-0 text-muted" aria-hidden />
              <p className="t-small">
                Tes erreurs et ta progression sont bien sauvegardées, mais seulement sur cet appareil : la sauvegarde sur ton
                compte n&apos;est pas encore activée (migration SQL à appliquer). Dès qu&apos;elle le sera, tout ce qui est
                enregistré ici sera envoyé automatiquement sur ton compte.
              </p>
            </div>
          )}
          {notice && (
            <p className="t-small" role="status">
              {notice}
            </p>
          )}

          {!run && savedRun && (
            <div className="card flex flex-wrap items-center gap-x-4 gap-y-3 py-3.5 pl-5 pr-3.5">
              <div className="min-w-0 flex-1">
                <p className="t-eyebrow">{savedRun.done.length >= savedRun.items.length ? "Série terminée" : "Série en cours"}</p>
                <p className="mt-1 truncate text-[15px] font-semibold tracking-[-0.01em]">{savedRun.title}</p>
                <p className="t-micro mt-0.5">
                  {savedRun.done.length >= savedRun.items.length
                    ? "Bilan non consulté"
                    : `${savedRun.done.length}/${savedRun.items.length} questions répondues`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" className="btn btn-ghost btn-sm text-muted" onClick={discardSavedRun}>
                  Abandonner
                </button>
                <button type="button" className="btn btn-primary" onClick={resumeRun}>
                  <Play size={14} aria-hidden />
                  {savedRun.done.length >= savedRun.items.length ? "Voir le bilan" : "Reprendre"}
                </button>
              </div>
            </div>
          )}

          {run ? (
            <FicheQuizRunner
              key={run.key}
              items={run.items}
              mode={run.mode}
              title={run.title}
              api={api}
              initialRunId={run.runId}
              initialDone={run.done}
              onProgress={(done, runId) => persistProgress(run, done, runId)}
              onAnswered={(row) => setRows((prev) => [...prev, row])}
              onPause={() => setRun(null)}
              onClose={() => {
                discardSavedRun();
                setRun(null);
              }}
              onReplay={(items) => {
                discardSavedRun();
                startRun(pickRandom(items, items.length), "errors", "Rejouer mes ratées");
              }}
            />
          ) : tab === "quiz" ? (
            <div className="flex flex-col gap-6">
              {activePage && activeProgress && (
                <div className="card-hero p-6 md:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <p className="t-eyebrow">
                      Page {activePage.page}
                      {pdfPage ? ` · synthèse p. ${pdfPage}` : ""}
                    </p>
                    {activeProgress.attempts > 0 && (
                      <span className="font-mono text-[12.5px] text-muted tabular-nums">
                        <span className="font-semibold text-white">{activeProgress.mastered}</span>/{activeProgress.total}
                      </span>
                    )}
                  </div>
                  <h2 className="t-h2 mt-2">{activeTheme ?? `Page ${activePage.page}`}</h2>
                  <StackBar
                    className="mt-5"
                    mastered={activeProgress.mastered}
                    weak={activeProgress.weak}
                    total={activeProgress.total}
                  />
                  <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
                    <li className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-white" aria-hidden />
                      {activeProgress.mastered} maîtrisée{activeProgress.mastered > 1 ? "s" : ""}
                    </li>
                    <li className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-pen" aria-hidden />
                      {activeProgress.weak} à revoir
                    </li>
                    <li className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full ring-1 ring-inset ring-line-2" aria-hidden />
                      {activeProgress.unseen} jamais vue{activeProgress.unseen > 1 ? "s" : ""}
                    </li>
                  </ul>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`btn btn-lg ${savedRun ? "btn-secondary" : "btn-primary"}`}
                      onClick={() =>
                        startRun(
                          activePage.questions.map((q) => ({ q, page: activePage.page })),
                          "page",
                          activeTheme ? `Page ${activePage.page} · ${activeTheme}` : `Page ${activePage.page}`
                        )
                      }
                    >
                      Lancer le quiz
                      <span className="font-normal opacity-70">· {activePage.questions.length} questions</span>
                      <ArrowRight size={16} aria-hidden />
                    </button>
                    {pdfSrc && (
                      <button type="button" className="btn btn-secondary btn-lg lg:hidden" onClick={() => setMobileView("course")}>
                        Voir la synthèse
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div>
                <h2 className="t-eyebrow mb-3">Toutes les pages</h2>
                <div className="@container">
                  <div className="grid grid-cols-2 gap-2 @sm:grid-cols-3 @xl:grid-cols-4">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      const set = byPage.get(page);
                      const p = progressByPage.get(page);
                      const isActive = selectedPage === page;
                      const theme = pageTheme(set?.title);
                      const allMastered = !!p && p.attempts > 0 && p.unseen === 0 && p.weak === 0;
                      return (
                        <button
                          key={page}
                          type="button"
                          disabled={!set}
                          onClick={() => selectPage(page)}
                          aria-pressed={isActive}
                          title={theme ? `Page ${page} — ${theme}` : `Page ${page}`}
                          className={`flex min-h-[96px] flex-col rounded-[14px] p-3 text-left transition-[background-color,box-shadow] duration-200 ${
                            !set
                              ? "card-quiet cursor-not-allowed opacity-50"
                              : isActive
                                ? "bg-surface shadow-[var(--shadow-1)] ring-[1.5px] ring-white"
                                : "card-quiet"
                          }`}
                        >
                          <span className="flex items-center justify-between gap-2 font-mono text-[11.5px] font-semibold text-muted">
                            P{page}
                            {!set ? (
                              <Lock size={12} aria-label="Bientôt" />
                            ) : p && p.weak > 0 ? (
                              <span className="inline-flex items-center gap-1 text-pen" aria-label={`${p.weak} à revoir`}>
                                <span className="h-1.5 w-1.5 rounded-full bg-pen" aria-hidden />
                                {p.weak}
                              </span>
                            ) : allMastered ? (
                              <Check size={13} strokeWidth={2.6} className="text-white" aria-label="Page maîtrisée" />
                            ) : null}
                          </span>
                          <span className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-snug tracking-[-0.006em] text-white">
                            {set ? theme ?? `Page ${page}` : "Bientôt"}
                          </span>
                          {set && p && (
                            <span className="mt-auto block pt-3">
                              <StackBar thin mastered={p.mastered} weak={p.weak} total={p.total} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : tab === "errors" ? (
            logLoading ? (
              <div className="rl-skel h-[260px]" />
            ) : poolItems.length === 0 ? (
              <div className="card-quiet flex flex-col items-center px-6 py-14 text-center">
                <Target size={22} className="text-muted" aria-hidden />
                <p className="t-h3 mt-4">{rows.length === 0 ? "Rien à revoir pour l'instant" : "Aucune erreur à revoir"}</p>
                <p className="t-small mt-1.5 max-w-[360px]">
                  {rows.length === 0
                    ? "Aucune réponse enregistrée pour l'instant. Fais un quiz : les questions ratées apparaîtront ici."
                    : "Bravo. Elles reviennent ici dès que tu en rates une."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="card-hero p-6 md:p-7">
                  <div className="flex items-end gap-3">
                    <span className="t-num text-[56px] md:text-[64px]">{poolItems.length}</span>
                    <span className="pb-1.5 text-[16px] font-semibold tracking-[-0.01em]">
                      question{poolItems.length > 1 ? "s" : ""} à revoir
                    </span>
                  </div>
                  <p className="t-micro mt-3">
                    Une question disparaît de la liste après {STREAK_TO_CLEAR} réussites consécutives.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <button type="button" className="btn btn-primary btn-lg" onClick={startErrors}>
                      <RotateCcw size={16} aria-hidden />
                      Rejouer mes {poolItems.length} erreur{poolItems.length > 1 ? "s" : ""}
                    </button>
                    <CopyButton copied={copied} onClick={copyPoolForAi} className="btn-lg">
                      Copier pour l&apos;IA
                    </CopyButton>
                  </div>
                </div>

                <div className="card p-1.5">
                  {poolItems.map((it) => {
                    const s = states.get(it.q.id);
                    return (
                      <button
                        key={it.q.id}
                        type="button"
                        onClick={() => selectPage(it.page)}
                        className="rl-row flex w-full items-start gap-3 rounded-[12px] px-3 py-3 text-left"
                        title="Afficher la synthèse de cette page"
                      >
                        <span className="mt-px shrink-0 rounded-[7px] bg-surface-2 px-1.5 py-0.5 font-mono text-[11.5px] font-semibold text-muted">
                          P{it.page}
                        </span>
                        <span className="line-clamp-2 min-w-0 flex-1 text-[13.5px] leading-snug text-body">{it.q.prompt}</span>
                        <span
                          className="mt-px shrink-0 font-mono text-[12px] font-semibold text-pen tabular-nums"
                          aria-label={`ratée ${s?.wrong ?? 0} fois`}
                        >
                          ×{s?.wrong ?? 0}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          ) : tab === "mixed" ? (
            <div className="card-hero p-6 md:p-7">
              <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-surface-2" aria-hidden>
                <Shuffle size={19} />
              </span>
              <h2 className="t-h2 mt-5">Bilan aléatoire</h2>
              <p className="t-small mt-2 max-w-[460px]">
                {MIXED_SIZE} questions tirées au hasard parmi toutes les pages de la fiche : pour vérifier que tu retiens
                vraiment, sans connaître l&apos;ordre ni la page.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
                <button type="button" className="btn btn-primary btn-lg" disabled={allItems.length === 0} onClick={startMixed}>
                  <Shuffle size={16} aria-hidden /> Lancer un bilan aléatoire
                </button>
                <span className="t-micro">
                  {allItems.length} questions disponibles sur {drillSets.length} pages
                </span>
              </div>
            </div>
          ) : logLoading ? (
            <div className="rl-skel h-[420px]" />
          ) : (
            <div className="card p-5 md:p-7">
              <dl className="grid grid-cols-3 gap-3">
                <Stat label="Maîtrisées" value={String(totals.mastered)} sub={`/${totals.total}`} />
                <Stat label="À revoir" value={String(totals.weak)} pen={totals.weak > 0} />
                <Stat label="Réussite" value={`${successPct} %`} />
              </dl>

              <hr className="rule my-6" />
              <h3 className="t-h3">Évolution des scores</h3>
              <div className="mt-4">
                <FicheProgressChart runs={runs} />
              </div>

              <hr className="rule my-6" />
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="t-h3">Par page</h3>
                <span className="t-micro">des plus faibles aux plus solides</span>
              </div>
              <div className="mt-4 grid gap-4">
                {[...progress]
                  .sort((a, b) => {
                    const ra = a.attempts > 0 ? a.wrongAttempts / a.attempts : -1;
                    const rb = b.attempts > 0 ? b.wrongAttempts / b.attempts : -1;
                    return rb - ra;
                  })
                  .map((p) => {
                    const errRate = p.attempts > 0 ? Math.round((p.wrongAttempts / p.attempts) * 100) : null;
                    const theme = pageTheme(byPage.get(p.page)?.title);
                    return (
                      <div key={p.page} className="grid gap-2">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="min-w-0 flex-1 truncate text-left text-[14px] font-semibold tracking-[-0.006em] underline-offset-4 hover:underline"
                            onClick={() => selectPage(p.page)}
                            title="Afficher cette page"
                          >
                            <span className="mr-2 font-mono text-[12px] font-semibold text-muted">P{p.page}</span>
                            {theme ?? `Page ${p.page}`}
                          </button>
                          <span className={`shrink-0 text-[12.5px] tabular-nums ${errRate !== null && errRate >= 30 ? "text-pen" : "text-muted"}`}>
                            {errRate === null ? "pas encore faite" : `${errRate} % d'erreurs`}
                          </span>
                          {p.attempts > 0 &&
                            (confirmReset === p.page ? (
                              <button
                                type="button"
                                className="shrink-0 text-[12.5px] font-semibold text-pen hover:underline"
                                onClick={() => doReset(p.page)}
                              >
                                Confirmer ?
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] text-muted transition-colors hover:bg-surface-2 hover:text-white"
                                onClick={() => setConfirmReset(p.page)}
                                aria-label={`Réinitialiser la page ${p.page}`}
                                title="Réinitialiser cette page"
                              >
                                <Trash2 size={13} />
                              </button>
                            ))}
                        </div>
                        <StackBar mastered={p.mastered} weak={p.weak} total={p.total} />
                      </div>
                    );
                  })}
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-line pt-5">
                <CopyButton copied={copied} onClick={copyPoolForAi} disabled={poolItems.length === 0} className="btn-sm">
                  Copier mes erreurs pour l&apos;IA
                </CopyButton>
                {confirmReset === "all" ? (
                  <>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => doReset("all")}>
                      Confirmer : tout effacer
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmReset(null)}>
                      Annuler
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-muted"
                    disabled={rows.length === 0}
                    onClick={() => setConfirmReset("all")}
                  >
                    <Trash2 size={13} aria-hidden /> Réinitialiser toute la fiche
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/** Barre empilée : maîtrisées (encre) puis à revoir (rouge correcteur) sur le total. */
function StackBar({
  mastered,
  weak,
  total,
  thin = false,
  className = "",
}: {
  mastered: number;
  weak: number;
  total: number;
  thin?: boolean;
  className?: string;
}) {
  const t = Math.max(total, 1);
  return (
    <div
      className={`flex overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--ink)_9%,transparent)] ${thin ? "h-1" : "h-1.5"} ${className}`}
      role="img"
      aria-label={`${mastered} maîtrisées et ${weak} à revoir sur ${total}`}
    >
      <span className="h-full bg-white transition-[width] duration-700" style={{ width: `${(mastered / t) * 100}%` }} />
      {/* en mode discret, le rouge devient de l'encre : on l'éclaircit pour garder la distinction */}
      <span
        className="h-full bg-pen transition-[width] duration-700 [html[data-discreet='1']_&]:opacity-40"
        style={{ width: `${(weak / t) * 100}%` }}
      />
    </div>
  );
}

function Stat({ label, value, sub, pen = false }: { label: string; value: string; sub?: string; pen?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="t-eyebrow">{label}</dt>
      <dd className={`mt-2 text-[24px] font-bold leading-none tracking-[-0.03em] tabular-nums md:text-[28px] ${pen ? "text-pen" : ""}`}>
        {value}
        {sub && <span className="text-[14px] font-semibold tracking-normal text-muted">{sub}</span>}
      </dd>
    </div>
  );
}

type SegItem<K extends string> = { key: K; label: string; short?: string; icon?: React.ReactNode; badge?: number };

/**
 * Contrôle segmenté (.seg) dont les onglets n'ont pas tous la même largeur :
 * l'indicateur glissant est mesuré après rendu. Flèches gauche/droite au clavier.
 */
function SegTabs<K extends string>({
  items,
  value,
  onChange,
  label,
  equal = false,
  className = "",
}: {
  items: SegItem<K>[];
  value: K;
  onChange: (k: K) => void;
  label: string;
  equal?: boolean;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const refs = useRef<Partial<Record<K, HTMLButtonElement | null>>>({});
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);
  const sig = items.map((i) => `${i.key}:${i.badge ?? ""}`).join("|");

  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[value];
      if (el && el.offsetWidth > 0) setBox({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && listRef.current) {
      ro.observe(listRef.current);
      for (const b of Object.values(refs.current) as (HTMLButtonElement | null)[]) if (b) ro.observe(b);
    }
    return () => ro?.disconnect();
  }, [value, sig]);

  function onKey(e: React.KeyboardEvent) {
    const i = items.findIndex((it) => it.key === value);
    const n = items.length;
    let next: K | null = null;
    if (e.key === "ArrowRight") next = items[(i + 1) % n].key;
    else if (e.key === "ArrowLeft") next = items[(i - 1 + n) % n].key;
    else if (e.key === "Home") next = items[0].key;
    else if (e.key === "End") next = items[n - 1].key;
    if (next === null) return;
    e.preventDefault();
    onChange(next);
    refs.current[next]?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKey}
      className={`seg ${className}`}
      style={equal ? { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` } : { gridAutoColumns: "auto" }}
    >
      <span
        aria-hidden
        className="seg-thumb"
        style={box ? { left: box.left, width: box.width } : { opacity: 0 }}
      />
      {items.map((it) => {
        const on = it.key === value;
        return (
          <button
            key={it.key}
            ref={(el) => {
              refs.current[it.key] = el;
            }}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(it.key)}
            className="seg-item px-2.5 text-[13.5px] sm:px-4 sm:text-[14px]"
          >
            {it.icon && <span className="hidden sm:inline-flex" aria-hidden>{it.icon}</span>}
            {it.short ? (
              <>
                <span className="sm:hidden">{it.short}</span>
                <span className="hidden sm:inline">{it.label}</span>
              </>
            ) : (
              it.label
            )}
            {!!it.badge && <span className="font-mono text-[12px] font-semibold text-pen tabular-nums">{it.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
