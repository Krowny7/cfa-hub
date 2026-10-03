"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  ListChecks,
  Lock,
  Maximize2,
  Minimize2,
  Play,
  Shuffle,
  Target,
  Trash2,
} from "lucide-react";
import { FicheQuizRunner, type RunItem } from "@/components/FicheQuizRunner";
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

// Mise en page des fiches : le cours (PDF) à gauche, l'entraînement à droite
// sur grand écran ; deux onglets "Cours / Entraînement" sur mobile. Toute
// réponse est journalisée (quiz_answer_log) : c'est ce qui alimente la
// progression par page, la liste d'erreurs à revoir et le graphique.
export function FicheWorkspace({
  title,
  pdfUrl,
  pdfDownloadName,
  pdfLabel,
  totalPages,
  drillSets,
  api: apiProp,
}: {
  title: string;
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
  // le bouton de l'en-tête permet aussi de le replier à la main.
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
    const direct: Record<string, Tab> = { erreurs: "errors", quiz: "quiz", melange: "mixed", progression: "progress" };
    if (onglet && direct[onglet]) {
      setTab(direct[onglet]);
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
    setTab("quiz");
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

  const tabs: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "quiz", label: "Quiz", icon: <ListChecks size={14} /> },
    { key: "errors", label: "Mes erreurs", icon: <Target size={14} />, badge: poolItems.length },
    { key: "mixed", label: "Bilan", icon: <Shuffle size={14} /> },
    { key: "progress", label: "Progression", icon: <BarChart3 size={14} /> },
  ];

  const activePage = selectedPage ? byPage.get(selectedPage) : undefined;
  const activeProgress = selectedPage ? progressByPage.get(selectedPage) : undefined;

  return (
    <div className="grid gap-3">
      {/* Bascule Cours / Entraînement — mobile uniquement */}
      <div className="grid grid-cols-2 gap-1 rounded-[3px] border-2 border-white p-1 lg:hidden">
        {(["course", "train"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setMobileView(v)}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              mobileView === v ? "bg-white text-black font-bold" : "text-white/65 font-bold"
            }`}
          >
            {v === "course" ? "Cours" : "Entraînement"}
          </button>
        ))}
      </div>

      <div className={wide ? "grid gap-4" : "grid items-start gap-4 lg:grid-cols-2"}>
        {/* ── Cours (PDF) ── */}
        <div
          className={`${mobileView === "course" ? "block" : "hidden"} lg:block ${
            wide ? "lg:order-2" : "lg:sticky lg:top-16"
          }`}
        >
          {!pdfSrc ? (
            <div className="card p-6 text-center text-sm text-muted">
              Impossible de charger la fiche pour le moment. Réessaie dans un instant.
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <div className={"flex flex-wrap items-center justify-between gap-2 p-3 " + (pdfOpen ? "border-b-2 border-white" : "")}>
                <div className="flex items-center gap-1.5 text-xs text-white/50">
                  <BookOpen size={13} />
                  {pdfLabel}
                  {pdfPage && <span className="text-white/35">· synthèse page {selectedPage}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPdfOpen((o) => !o)}
                    aria-expanded={pdfOpen}
                    className="btn btn-secondary inline-flex items-center gap-1.5 text-xs"
                  >
                    {pdfOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    {pdfOpen ? "Masquer le PDF" : "Afficher le PDF"}
                  </button>
                  <a href={pdfUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="btn btn-secondary inline-flex items-center gap-1.5 text-xs">
                    <ExternalLink size={13} /> Ouvrir
                  </a>
                  <a href={pdfUrl ?? "#"} download={pdfDownloadName} className="btn btn-secondary inline-flex items-center gap-1.5 text-xs">
                    <Download size={13} /> Télécharger
                  </a>
                </div>
              </div>
              {pdfOpen && (
                <iframe
                  key={pdfPage ?? 0}
                  src={pdfSrc}
                  title={`${title} — fiche`}
                  className={`w-full ${wide ? "h-[80vh]" : "h-[72vh] lg:h-[calc(100vh-11rem)]"}`}
                />
              )}
            </div>
          )}
        </div>

        {/* ── Entraînement ── */}
        <div
          className={`${mobileView === "train" ? "block" : "hidden"} min-w-0 lg:block ${
            wide ? "lg:order-1 lg:mx-auto lg:w-full lg:max-w-3xl" : ""
          }`}
        >
          <div className="card p-4">
            <div className="mb-3 flex flex-wrap items-center gap-1">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setTab(t.key);
                    setRun(null);
                    setNotice(null);
                    setConfirmReset(null);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${
                    tab === t.key && !run ? "ink-swash font-bold" : "font-bold text-white/65 hover:text-white"
                  }`}
                >
                  {t.icon}
                  {t.label}
                  {!!t.badge && (
                    <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-black text-black">{t.badge}</span>
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={toggleWide}
                className="ml-auto hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white/50 transition hover:bg-white/[0.05] hover:text-white/80 lg:inline-flex"
                title={wide ? "Remettre le cours à côté du quiz" : "Quiz en pleine largeur, cours en dessous"}
              >
                {wide ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                {wide ? "Réduire" : "Agrandir"}
              </button>
            </div>

            {storage === "device" && (
              <div className="mb-3 rounded-xl border border-yellow-400/25 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
                Tes erreurs et ta progression sont bien sauvegardées, mais seulement sur cet appareil : la sauvegarde sur ton
                compte n&apos;est pas encore activée (migration SQL à appliquer). Dès qu&apos;elle le sera, tout ce qui est
                enregistré ici sera envoyé automatiquement sur ton compte.
              </div>
            )}
            {notice && <div className="mb-3 text-xs text-white/60">{notice}</div>}

            {!run && savedRun && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-2.5">
                <div className="min-w-0 text-sm">
                  <div className="truncate font-medium text-blue-100">{savedRun.title}</div>
                  <div className="text-xs text-blue-200/70">
                    {savedRun.done.length >= savedRun.items.length
                      ? "Série terminée — bilan non consulté"
                      : `Série en cours : ${savedRun.done.length}/${savedRun.items.length} questions répondues`}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button type="button" className="btn btn-primary inline-flex items-center gap-1.5 text-xs" onClick={resumeRun}>
                    <Play size={13} />
                    {savedRun.done.length >= savedRun.items.length ? "Voir le bilan" : "Reprendre"}
                  </button>
                  <button type="button" className="text-xs text-white/40 hover:text-white/70" onClick={discardSavedRun}>
                    Abandonner
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
              <div>
                <div className="mb-3 text-xs text-white/50">
                  Choisis une page : la synthèse correspondante s&apos;affiche à côté, et son quiz (5 concepts × 3 variantes)
                  se lance ici.
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    const has = byPage.has(page);
                    const p = progressByPage.get(page);
                    const isActive = selectedPage === page;
                    return (
                      <button
                        key={page}
                        type="button"
                        disabled={!has}
                        onClick={() => selectPage(page)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${
                          !has
                            ? "cursor-not-allowed border-white/[0.06] text-white/25"
                            : isActive
                              ? "border-white bg-white text-black font-bold"
                              : "border-white/40 text-white/80 hover:border-white"
                        }`}
                      >
                        {!has && <Lock size={11} />}
                        Page {page}
                        {p && p.attempts > 0 && (
                          <span className="tabular-nums text-white/45">
                            {p.mastered}/{p.total}
                          </span>
                        )}
                        {p && p.weak > 0 && <span className="h-1.5 w-1.5 rounded-full bg-red-400" title={`${p.weak} à revoir`} />}
                      </button>
                    );
                  })}
                </div>

                {activePage && activeProgress && (
                  <div className="mt-4 card-soft p-4">
                    <div className="text-xs text-white/50">{activePage.title}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span className="text-green-300">{activeProgress.mastered} maîtrisée{activeProgress.mastered > 1 ? "s" : ""}</span>
                      <span className="text-red-300">{activeProgress.weak} à revoir</span>
                      <span className="text-white/45">{activeProgress.unseen} jamais vue{activeProgress.unseen > 1 ? "s" : ""}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-primary text-sm"
                        onClick={() =>
                          startRun(
                            activePage.questions.map((q) => ({ q, page: activePage.page })),
                            "page",
                            `Page ${activePage.page}`
                          )
                        }
                      >
                        Lancer le quiz ({activePage.questions.length} questions)
                      </button>
                      {pdfSrc && (
                        <button type="button" className="btn btn-secondary text-sm lg:hidden" onClick={() => setMobileView("course")}>
                          Voir la synthèse
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : tab === "errors" ? (
              <div>
                {logLoading ? (
                  <div className="text-sm text-white/40">Chargement…</div>
                ) : poolItems.length === 0 ? (
                  <div className="py-6 text-center text-sm text-white/50">
                    {rows.length === 0
                      ? "Aucune réponse enregistrée pour l'instant. Fais un quiz : les questions ratées apparaîtront ici."
                      : "Aucune erreur à revoir : bravo. Elles reviennent ici dès que tu en rates une."}
                  </div>
                ) : (
                  <>
                    <div className="text-sm">
                      <span className="font-semibold text-red-300">{poolItems.length}</span> question{poolItems.length > 1 ? "s" : ""} à
                      revoir. Une question disparaît de la liste après 2 réussites consécutives.
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" className="btn btn-primary text-sm" onClick={startErrors}>
                        Rejouer mes {poolItems.length} erreur{poolItems.length > 1 ? "s" : ""}
                      </button>
                      <button type="button" className="btn btn-secondary inline-flex items-center gap-1.5 text-sm" onClick={copyPoolForAi}>
                        {copied ? <ClipboardCheck size={14} className="text-green-400" /> : <Copy size={14} />}
                        {copied ? "Copié !" : "Copier pour l'IA"}
                      </button>
                    </div>
                    <div className="mt-4 grid gap-1.5">
                      {poolItems.map((it) => {
                        const s = states.get(it.q.id);
                        return (
                          <button
                            key={it.q.id}
                            type="button"
                            onClick={() => selectPage(it.page)}
                            className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-white/70 transition hover:bg-white/[0.05]"
                            title="Afficher la synthèse de cette page"
                          >
                            <span className="mt-px shrink-0 text-white/35">P{it.page}</span>
                            <span className="min-w-0 flex-1 truncate">{it.q.prompt}</span>
                            <span className="shrink-0 text-red-300/80">×{s?.wrong ?? 0}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            ) : tab === "mixed" ? (
              <div>
                <div className="text-sm">
                  {MIXED_SIZE} questions tirées au hasard parmi toutes les pages de la fiche : un bilan pour vérifier que tu
                  retiens vraiment, sans connaître l&apos;ordre ni la page.
                </div>
                <button
                  type="button"
                  className="btn btn-primary mt-3 inline-flex items-center gap-1.5 text-sm"
                  disabled={allItems.length === 0}
                  onClick={startMixed}
                >
                  <Shuffle size={14} /> Lancer un bilan aléatoire
                </button>
                <div className="mt-2 text-xs text-white/40">{allItems.length} questions disponibles sur {drillSets.length} pages.</div>
              </div>
            ) : (
              <div className="grid gap-5">
                {logLoading ? (
                  <div className="text-sm text-white/40">Chargement…</div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="card-soft p-3">
                        <div className="font-display text-2xl tabular-nums text-green-300">{totals.mastered}</div>
                        <div className="text-[11px] text-white/45">maîtrisées / {totals.total}</div>
                      </div>
                      <div className="card-soft p-3">
                        <div className="font-display text-2xl tabular-nums text-red-300">{totals.weak}</div>
                        <div className="text-[11px] text-white/45">à revoir</div>
                      </div>
                      <div className="card-soft p-3">
                        <div className="font-display text-2xl tabular-nums">
                          {totals.attempts > 0 ? Math.round(((totals.attempts - totals.wrong) / totals.attempts) * 100) : 0}%
                        </div>
                        <div className="text-[11px] text-white/45">réussite globale</div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Évolution des scores</div>
                      <FicheProgressChart runs={runs} />
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Pages — des plus faibles aux plus solides</div>
                      <div className="grid gap-2">
                        {[...progress]
                          .sort((a, b) => {
                            const ra = a.attempts > 0 ? a.wrongAttempts / a.attempts : -1;
                            const rb = b.attempts > 0 ? b.wrongAttempts / b.attempts : -1;
                            return rb - ra;
                          })
                          .map((p) => {
                            const errRate = p.attempts > 0 ? Math.round((p.wrongAttempts / p.attempts) * 100) : null;
                            return (
                              <div key={p.page} className="grid gap-1">
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <button type="button" className="text-white/80 hover:text-white" onClick={() => selectPage(p.page)}>
                                    Page {p.page}
                                  </button>
                                  <span className="flex items-center gap-2 text-white/45">
                                    {errRate === null ? "pas encore faite" : `${errRate}% d'erreurs`}
                                    {p.attempts > 0 &&
                                      (confirmReset === p.page ? (
                                        <button type="button" className="text-red-300 hover:text-red-200" onClick={() => doReset(p.page)}>
                                          Confirmer ?
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          className="text-white/30 hover:text-white/70"
                                          onClick={() => setConfirmReset(p.page)}
                                          title="Réinitialiser cette page"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      ))}
                                  </span>
                                </div>
                                <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                                  <div className="bg-green-400/70" style={{ width: `${(p.mastered / Math.max(p.total, 1)) * 100}%` }} />
                                  <div className="bg-red-400/70" style={{ width: `${(p.weak / Math.max(p.total, 1)) * 100}%` }} />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-3">
                      <button
                        type="button"
                        className="btn btn-secondary inline-flex items-center gap-1.5 text-xs"
                        disabled={poolItems.length === 0}
                        onClick={copyPoolForAi}
                      >
                        {copied ? <ClipboardCheck size={14} className="text-green-400" /> : <Copy size={14} />}
                        {copied ? "Copié !" : "Copier mes erreurs pour l'IA"}
                      </button>
                      {confirmReset === "all" ? (
                        <button type="button" className="btn btn-secondary text-xs text-red-300" onClick={() => doReset("all")}>
                          Confirmer : tout effacer
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-ghost inline-flex items-center gap-1.5 text-xs text-white/50"
                          disabled={rows.length === 0}
                          onClick={() => setConfirmReset("all")}
                        >
                          <Trash2 size={13} /> Réinitialiser toute la fiche
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
