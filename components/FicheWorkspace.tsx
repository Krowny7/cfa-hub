"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, CloudOff, ExternalLink, Play, RotateCcw, Shuffle, Trash2 } from "lucide-react";
import { CopyButton, FicheQuizRunner, type CarnetFiche, type RunItem } from "@/components/FicheQuizRunner";
import { Icone } from "@/components/adn/icons";
import { Batons } from "@/components/adn/Batons";
import { CompteurBarre, Rature } from "@/components/adn/Rature";
import { AnneauDuJourLogo } from "@/components/adn/AnneauDuJourLogo";
import { useObjectifDuJour } from "@/components/adn/useObjectifDuJour";
import { createClient } from "@/lib/supabase/browser";
import { createSupabaseFicheApi, type FicheApi, type LogStorage } from "@/lib/ficheApi";
import { clearRun, loadRun, restoreRun, saveRun, type RestoredRun } from "@/lib/ficheRunStore";
import { anneau as voixAnneau, ligneAnneauSession, RATURE, VIDE } from "@/lib/voice";
import { CARNET, FICHE, QUIZ, aReprendre, dateCourte, jourParis, lundiParis, memeJour, rateeFois, reprendreRatures } from "@/lib/voice-z4";
import { RETOUR } from "@/lib/voice-reviser";
import { ActionContour, ActionEncre, EnTeteSousPage, Etiquette, Scene, SousPage } from "@/components/ui/SousPage";
import { SEANCE_FICHE } from "@/lib/voice-reviser-b";
import l from "@/components/reviser/Lecture.module.css";
import {
  buildErrorPoolExport,
  computePageProgress,
  computeQuestionStates,
  computeRatureEvents,
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

// L'onglet « Progression » a été retiré (2026-11-12) : il redisait l'avancement des pages, déjà
// sur chaque page de la grille ; un ancien lien ?onglet=progression ouvre le quiz.
type Tab = "quiz" | "errors" | "mixed";
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

// Onglets liables avec ?onglet=… (ex. « Revoir » depuis Moi → ?onglet=erreurs).
const TAB_PARAM: Record<Tab, string> = { quiz: "quiz", errors: "erreurs", mixed: "melange" };
const PARAM_TAB: Record<string, Tab> = { quiz: "quiz", erreurs: "errors", melange: "mixed", bilan: "mixed", progression: "quiz" };

/** Thème d'une page, tiré du titre du set : « Equity — Drill Fiche Page 3 (Market Efficiency) ». */
function pageTheme(setTitle: string | undefined): string | null {
  if (!setTitle) return null;
  const m = /\(([^()]+)\)\s*$/.exec(setTitle);
  return m ? m[1].trim() : null;
}

/** Énoncé court pour une ligne du carnet (une rature se trace sur des lignes entières). */
function enonceCourt(prompt: string, max = 100): string {
  const t = prompt.split("\n")[0].replace(/\t/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

/** Remplace des paramètres de l'adresse, sans recharger (null = retirer). */
function setUrlParams(params: Record<string, string | null>) {
  try {
    const url = new URL(window.location.href);
    for (const [k, v] of Object.entries(params)) {
      if (v === null) url.searchParams.delete(k);
      else url.searchParams.set(k, v);
    }
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  } catch {
    // l'affichage change quand même
  }
}

// Mise en page des fiches (modèle des sous-pages validé par Théo, 2026-11-12) : l'en-tête commun
// (retour aux fiches), puis le cadre à zones : « Le cours » (le PDF) à gauche, « Le quiz » dans la
// colonne grise à droite ; au téléphone, la bascule « Cours / Entraînement » ne montre qu'une des
// deux zones. Toute réponse est journalisée (quiz_answer_log) : c'est ce qui alimente la
// progression par page et le carnet d'erreurs (et ses ratures).
// Liens directs : ?page=N ouvre la page N, ?onglet=erreurs|melange.
export function FicheWorkspace({
  title,
  description,
  backHref = RETOUR.fiches.href,
  backLabel = RETOUR.fiches.label,
  pdfUrl,
  pdfLabel,
  onePagerUrl = null,
  totalPages,
  drillSets,
  initialPage = null,
  traitsDuJour = null,
  api: apiProp,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  pdfUrl: string | null;
  /** ancien nom du PDF à télécharger : le bouton « Télécharger » a été retiré (2026-11-12, comme pour les cours) */
  pdfDownloadName?: string;
  pdfLabel: string;
  /** URL signée du one-pager de la matière (une page A4), null : pas de lien */
  onePagerUrl?: string | null;
  totalPages: number;
  drillSets: DrillSet[];
  /** page ouverte au départ (lien /fiches/<slug>?page=N) */
  initialPage?: number | null;
  /** questions répondues aujourd'hui, toutes sources, lues par le serveur (null : inconnu) */
  traitsDuJour?: number | null;
  api?: FicheApi;
}) {
  const api = useMemo(() => apiProp ?? createSupabaseFicheApi(createClient()), [apiProp]);
  // l'objectif du jour du joueur (son plan d'ici l'examen, sinon 40)
  const objectifJour = useObjectifDuJour();

  const [mobileView, setMobileView] = useState<"course" | "train">("train");
  const [tab, setTab] = useState<Tab>("quiz");
  const [selectedPage, setSelectedPage] = useState<number | null>(() =>
    initialPage !== null && drillSets.some((d) => d.page === initialPage) ? initialPage : drillSets[0]?.page ?? null,
  );
  // réponses données sur cette page (pour l'anneau du jour sous la copie)
  const [answeredHere, setAnsweredHere] = useState(0);
  // historique des ratures déjà montré (le geste ne joue qu'une fois)
  const ratureVues = useRef<Set<string> | null>(null);
  const [showAllRayees, setShowAllRayees] = useState(false);
  const [run, setRun] = useState<ActiveRun | null>(null);
  const [rows, setRows] = useState<AnswerRow[]>([]);
  const [storage, setStorage] = useState<LogStorage>("account");
  const [logLoading, setLogLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  /** « Réinitialiser toute la fiche » attend sa confirmation */
  const [confirmReset, setConfirmReset] = useState(false);
  const [savedRun, setSavedRun] = useState<RestoredRun | null>(null);
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
    // Liens directs : un onglet (ex. « Revoir » depuis Moi → ?onglet=erreurs)
    // et une page (?page=N, ex. « Reprendre » depuis l'accueil). Le serveur
    // a déjà ouvert la page quand il la connaît (initialPage).
    const params = new URLSearchParams(window.location.search);
    const onglet = params.get("onglet");
    if (onglet && PARAM_TAB[onglet]) {
      setTab(PARAM_TAB[onglet]);
      setMobileView("train");
    }
    const page = Number(params.get("page"));
    if (Number.isInteger(page) && drillSets.some((d) => d.page === page)) setSelectedPage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // L'adresse suit l'onglet (sans recharger) : un rechargement y revient.
  function changeTab(t: Tab) {
    setTab(t);
    setUrlParams({ onglet: t === "quiz" ? null : TAB_PARAM[t] });
  }

  const states = useMemo(() => computeQuestionStates(rows), [rows]);
  const progress = useMemo(() => computePageProgress(drillSets, states), [drillSets, states]);
  const progressByPage = useMemo(() => new Map(progress.map((p) => [p.page, p])), [progress]);

  const allItems: RunItem[] = useMemo(
    () => drillSets.flatMap((d) => d.questions.map((q) => ({ q, page: d.page }))),
    [drillSets]
  );
  const poolItems: RunItem[] = useMemo(
    () => allItems.filter((it) => states.get(it.q.id)?.inErrorPool),
    [allItems, states]
  );

  // Les ratures (moment 6) : une question rayée quitte le carnet mais reste
  // visible. Celles d'aujourd'hui restent dans la liste, rayées ; les plus
  // anciennes forment l'historique.
  const ratures = useMemo(() => {
    const now = new Date();
    const events = computeRatureEvents(rows);
    const lundi = lundiParis(now);
    const rayees = allItems
      .filter((it) => {
        const s = states.get(it.q.id);
        return !!s && s.clears > 0 && !s.inErrorPool && !!s.clearedAt;
      })
      .map((it) => ({ it, at: states.get(it.q.id)!.clearedAt! }));
    const duJour = new Set(rayees.filter((r) => memeJour(r.at, now)).map((r) => r.it.q.id));
    return {
      total: events.length,
      semaine: events.filter((e) => jourParis(e.at) >= lundi).length,
      duJour,
      anciennes: rayees.filter((r) => !duJour.has(r.it.q.id)).sort((a, b) => (a.at < b.at ? 1 : -1)),
    };
  }, [rows, states, allItems]);
  // la liste du carnet : en tête, ce qui a été rayé aujourd'hui (la plus récente
  // d'abord : on la voit se rayer en revenant d'un quiz), puis ce qui reste à reprendre
  const carnetItems: RunItem[] = useMemo(() => {
    const at = (it: RunItem) => states.get(it.q.id)?.clearedAt ?? "";
    const rayees = allItems.filter((it) => ratures.duJour.has(it.q.id)).sort((a, b) => (at(a) < at(b) ? 1 : -1));
    return [...rayees, ...allItems.filter((it) => states.get(it.q.id)?.inErrorPool)];
  }, [allItems, states, ratures]);
  // au premier chargement du journal, les ratures du jour sont déjà « vues » : posées sans geste
  useEffect(() => {
    if (!logLoading && ratureVues.current === null) ratureVues.current = new Set(ratures.duJour);
  }, [logLoading, ratures]);
  const carnet: CarnetFiche = useMemo(() => ({ states, reste: poolItems.length }), [states, poolItems]);

  // Une série par fiche, clé = titre de la fiche.
  const storageKey = title;
  useEffect(() => {
    const saved = loadRun(storageKey);
    setSavedRun(saved ? restoreRun(saved, allItems) : null);
  }, [storageKey, allItems]);

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
    setUrlParams({ onglet: null, page: String(page) });
  }

  function startMixed() {
    startRun(pickRandom(allItems, MIXED_SIZE), "mixed", `Bilan aléatoire (${Math.min(MIXED_SIZE, allItems.length)} questions)`);
  }

  function startErrors() {
    startRun(pickRandom(poolItems, poolItems.length), "errors", QUIZ.titreReprise(poolItems.length));
  }

  const themeOf = (page: number) => pageTheme(byPage.get(page)?.title);

  // Sous la copie corrigée : l'avancée de l'anneau du jour (le logo, en petit).
  function anneauFin(ajoutes: number): React.ReactNode {
    const plus = ajoutes > 0 ? ligneAnneauSession(ajoutes, false) : null;
    if (traitsDuJour === null) return plus ? <p className="t-small m-0">{plus}</p> : null;
    const n = traitsDuJour + answeredHere;
    const v = voixAnneau(n, objectifJour);
    return (
      <>
        <span className="relative inline-grid">
          <AnneauDuJourLogo repondues={n} objectif={objectifJour} size={34} vivant={false} />
        </span>
        <p className="t-small m-0">
          <b className="font-semibold text-white tabular-nums">{v.compte}</b> aujourd&apos;hui
          {ajoutes > 0 ? ` · ${ligneAnneauSession(ajoutes, n >= objectifJour)}` : n >= objectifJour ? " · journée tenue" : ""}
          {v.reste ? (
            <>
              {" · "}
              <span className="font-semibold text-pen">{v.reste}</span>
            </>
          ) : null}
        </p>
      </>
    );
  }

  /** efface l'historique de toute la fiche (sous le bilan, avec confirmation) */
  async function doReset() {
    try {
      await api.resetLog(setIds);
      setRows((prev) => prev.filter((r) => !setIds.includes(r.set_id)));
      setConfirmReset(false);
      setNotice("Historique de la fiche réinitialisé.");
    } catch {
      setNotice("La réinitialisation a échoué. Réessaie dans un instant.");
    }
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

  // la colonne grise est étroite : des onglets sans icône, au nom court
  const tabs: SegItem<Tab>[] = [
    { key: "quiz", label: "Quiz" },
    { key: "errors", label: "Erreurs", badge: poolItems.length },
    { key: "mixed", label: "Bilan" },
  ];

  // les pages faites (chaque question a reçu une réponse) : le chiffre-héros de la porte, la même mesure que les carnets de /fiches
  const pagesFaites = progress.filter((p) => p.total > 0 && p.unseen === 0).length;
  const pagesEntamees = progress.filter((p) => p.total > 0 && p.unseen > 0 && p.unseen < p.total).length;
  const erreurs = progress.reduce((a, p) => a + p.weak, 0);
  const activePage = selectedPage ? byPage.get(selectedPage) : undefined;
  const activeProgress = selectedPage ? progressByPage.get(selectedPage) : undefined;
  const activeTheme = pageTheme(activePage?.title);

  return (
    <SousPage
      entete={
        <EnTeteSousPage
          illustration={{ nom: "reviser-bibliotheque", position: "50% 52%" }}
          retour={{ href: backHref, label: backLabel }}
          titre={title}
          ligne={
            logLoading || totalPages <= 0 ? (
              <i style={{ fontStyle: "normal", opacity: 0 }}>{description}</i>
            ) : (
              SEANCE_FICHE.ligne(pagesFaites, totalPages, pagesEntamees, erreurs)
            )
          }
          heros={
            logLoading || totalPages <= 0
              ? null
              : pagesFaites > 0
                ? { valeur: pagesFaites, legende: SEANCE_FICHE.herosLegende(totalPages) }
                : { valeur: totalPages, legende: SEANCE_FICHE.herosLegendeNeuf }
          }
        />
      }
    >
      <Scene>
        {/* Bascule Cours / Entraînement — téléphone seulement : le cadre ne montre alors qu'une zone (classes hidden min-[980px]) */}
        <SegTabs
          label="Affichage"
          className="w-full min-[980px]:hidden"
          equal
          value={mobileView}
          onChange={setMobileView}
          items={[
            { key: "course", label: "Cours", icon: <Icone nom="cours" size={16} /> },
            { key: "train", label: "Entraînement", icon: <Icone nom="entrainer" size={16} /> },
          ]}
        />

        <div className={l.lecture} data-large="1">
          <section
            aria-label="Cours"
            className={`min-w-0 ${mobileView === "course" ? "" : "hidden min-[980px]:block"}`}
          >
            {!pdfSrc ? (
              <div className={l.document}>
                <p className={l.vide}>Impossible de charger la fiche pour le moment. Réessaie dans un instant.</p>
              </div>
            ) : (
              <div className={l.document} data-ferme={pdfOpen ? undefined : "1"}>
                <div className={l.barreDoc}>
                  {/* sans page choisie : « La fiche en PDF » (le nom de la matière est déjà le titre), le détail en infobulle */}
                  <p title={pdfLabel}>
                    {selectedPage ? `Synthèse · page ${selectedPage}` : FICHE.lePdf}
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
                </div>
                {pdfOpen && (
                  <iframe
                    key={pdfPage ?? 0}
                    src={pdfSrc}
                    title={`${title} — fiche`}
                    className="block h-[72vh] w-full bg-surface-2 min-[980px]:h-[calc(100vh-9.75rem)]"
                  />
                )}
              </div>
            )}
          </section>
          <section
            aria-label="Entraînement"
            className={`min-w-0 flex-col gap-5 ${mobileView === "train" ? "flex" : "hidden min-[980px]:flex"}`}
          >
            <div className={l.onglets} role="group" aria-label={SEANCE_FICHE.onglets}>
              {tabs.map((it) => (
                <button
                  key={it.key}
                  type="button"
                  className={l.onglet}
                  aria-pressed={tab === it.key}
                  onClick={() => {
                    changeTab(it.key);
                    setRun(null);
                    setNotice(null);
                  }}
                >
                  {it.label}
                  {!!it.badge && <b>{it.badge}</b>}
                </button>
              ))}
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
                  <p className="t-eyebrow">{savedRun.done.length >= savedRun.items.length ? QUIZ.termine : QUIZ.enCours}</p>
                  <p className="mt-1 truncate text-[15px] font-semibold tracking-[-0.01em]">{savedRun.title}</p>
                  <p className="t-micro mt-0.5">
                    {savedRun.done.length >= savedRun.items.length
                      ? QUIZ.aRelire
                      : QUIZ.avance(savedRun.done.length, savedRun.items.length)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" className="btn btn-ghost btn-sm text-muted" onClick={discardSavedRun}>
                    Abandonner
                  </button>
                  <ActionContour onClick={resumeRun}>
                    <Play size={14} aria-hidden />
                    {savedRun.done.length >= savedRun.items.length ? QUIZ.voirCopie : QUIZ.reprendre}
                  </ActionContour>
                </div>
              </div>
            )}

            {run ? (
              <FicheQuizRunner
                key={run.key}
                items={run.items}
                mode={run.mode}
                title={run.title}
                fiche={title}
                api={api}
                initialRunId={run.runId}
                initialDone={run.done}
                carnet={carnet}
                themeOf={themeOf}
                anneau={anneauFin}
                onProgress={(done, runId) => persistProgress(run, done, runId)}
                onAnswered={(row) => {
                  setRows((prev) => [...prev, row]);
                  setAnsweredHere((n) => n + 1);
                }}
                onPause={() => setRun(null)}
                onClose={() => {
                  discardSavedRun();
                  setRun(null);
                }}
                onReplay={(items) => {
                  discardSavedRun();
                  startRun(pickRandom(items, items.length), "errors", QUIZ.titreReprise(items.length));
                }}
              />
            ) : tab === "quiz" ? (
              <div className="flex flex-col gap-6">
                <div className="grid gap-3">
                  <Etiquette as="h2">{SEANCE_FICHE.pages}</Etiquette>
                  <ul className={l.cases}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      const set = byPage.get(page);
                      const p = progressByPage.get(page);
                      const theme = pageTheme(set?.title);
                      // pleine : chaque question de la page a reçu une réponse ; entourée : entamée
                      const etat = !set ? null : p && p.total > 0 && p.unseen === 0 ? "faite" : p && p.unseen < p.total ? "entamee" : null;
                      const texte = !set ? SEANCE_FICHE.bientot : etat === "faite" ? SEANCE_FICHE.faite : etat === "entamee" ? SEANCE_FICHE.entamee : SEANCE_FICHE.neuve;
                      return (
                        <li key={page}>
                          <button
                            type="button"
                            disabled={!set}
                            onClick={() => selectPage(page)}
                            aria-pressed={selectedPage === page}
                            className={l.case + " rl-presse"}
                            data-etat={etat ?? undefined}
                            title={SEANCE_FICHE.case(page, theme, texte, p?.weak ?? 0)}
                            aria-label={SEANCE_FICHE.case(page, theme, texte, p?.weak ?? 0)}
                          >
                            {page}
                            {p && p.weak > 0 && (
                              <span className={l.rature} aria-hidden>
                                {p.weak}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                {activePage && activeProgress && (
                  <div className={l.page}>
                    {/* la page choisie, écrite sous les cases : son thème, son avancement en filet de 2 px */}
                    <p className={l.pageKicker}>Page {activePage.page}</p>
                    <h2 className={l.pageTitre}>{activeTheme ?? `Page ${activePage.page}`}</h2>
                    <div className={l.filetPage} aria-hidden>
                      <i style={{ width: `${(activeProgress.mastered / Math.max(1, activeProgress.total)) * 100}%` }} />
                      <i style={{ width: `${(activeProgress.weak / Math.max(1, activeProgress.total)) * 100}%` }} />
                    </div>
                    <ul className={l.legendePage}>
                      <li>
                        <b>{activeProgress.mastered}</b> {FICHE.maitrisees(activeProgress.mastered)}
                      </li>
                      <li>{activeProgress.weak > 0 ? <b>{aReprendre(activeProgress.weak)}</b> : aReprendre(0)}</li>
                      <li>
                        <b>{activeProgress.unseen}</b> {FICHE.jamaisVues(activeProgress.unseen)}
                      </li>
                    </ul>
                    <div className={l.actions}>
                      <ActionEncre
                        onClick={() =>
                          startRun(
                            activePage.questions.map((q) => ({ q, page: activePage.page })),
                            "page",
                            activeTheme ? `Page ${activePage.page} · ${activeTheme}` : `Page ${activePage.page}`
                          )
                        }
                      >
                        {SEANCE_FICHE.lancer}
                        <span style={{ fontWeight: 500, opacity: 0.75 }}>· {SEANCE_FICHE.questions(activePage.questions.length)}</span>
                        <span aria-hidden>→</span>
                      </ActionEncre>
                      {pdfSrc && (
                        <button type="button" className="btn btn-secondary btn-lg min-[980px]:hidden" onClick={() => setMobileView("course")}>
                          Voir la synthèse
                        </button>
                      )}
                    </div>
                  </div>
                )}

              </div>
            ) : tab === "errors" ? (
              logLoading ? (
                <div className="rl-skel h-[260px]" />
              ) : (
                <div className="flex flex-col gap-5">
                  {poolItems.length === 0 && ratures.duJour.size === 0 ? (
                    // carnet vide : page propre
                    <div className="card-quiet flex flex-col items-center px-6 py-14 text-center">
                      <Icone nom="erreurs" size={26} className="text-muted" />
                      <p className="t-h3 mt-4">{VIDE.ratures}</p>
                      <p className="t-small mt-1.5 max-w-[360px]">{rows.length === 0 ? CARNET.videNeuf : CARNET.videPropre}</p>
                      {ratures.total > 0 && <HistoireRatures semaine={ratures.semaine} total={ratures.total} className="mt-6 justify-center" />}
                    </div>
                  ) : (
                    <div className={l.page}>
                      {/* le compteur du carnet : rayé et réécrit quand des ratures sont reprises aujourd'hui */}
                      <CompteurBarre
                        avant={poolItems.length + ratures.duJour.size}
                        apres={poolItems.length}
                        libelle={CARNET.libelle}
                        taille={60}
                        anime={!!ratureVues.current && [...ratures.duJour].some((id) => !ratureVues.current?.has(id))}
                      />
                      <p className="t-micro mt-3">{poolItems.length > 0 ? QUIZ.regle : VIDE.ratures}</p>
                      {poolItems.length > 0 && (
                        <div className="mt-6 flex flex-wrap gap-2">
                          <ActionEncre onClick={startErrors}>
                            <RotateCcw size={16} aria-hidden />
                            {reprendreRatures(poolItems.length)}
                          </ActionEncre>
                          <CopyButton copied={copied} onClick={copyPoolForAi} className="btn-lg">
                            Copier pour l&apos;IA
                          </CopyButton>
                        </div>
                      )}
                      {ratures.total > 0 && (
                        <HistoireRatures semaine={ratures.semaine} total={ratures.total} className="mt-6 border-t border-line pt-5" />
                      )}
                    </div>
                  )}

                  {carnetItems.length > 0 && (
                    <div className="card p-1.5">
                      {carnetItems.map((it) => {
                        const s = states.get(it.q.id);
                        const rayee = ratures.duJour.has(it.q.id);
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
                            {rayee ? (
                              <LigneRayee
                                id={it.q.id}
                                vues={ratureVues}
                                className="min-w-0 flex-1 text-[13.5px] leading-snug text-body"
                              >
                                {enonceCourt(it.q.prompt)}
                              </LigneRayee>
                            ) : (
                              <span className="line-clamp-2 min-w-0 flex-1 text-[13.5px] leading-snug text-body">{it.q.prompt}</span>
                            )}
                            {rayee ? (
                              <span className="mt-px shrink-0 font-mono text-[11.5px] font-semibold text-muted">rayée</span>
                            ) : (
                              <span className="mt-px shrink-0 font-mono text-[12px] font-semibold text-pen tabular-nums" aria-label={rateeFois(s?.wrong ?? 0)}>
                                ×{s?.wrong ?? 0}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* l'historique : on raye, on n'efface pas */}
                  {ratures.anciennes.length > 0 && (
                    <section aria-labelledby="fiche-rayees" className="flex flex-col gap-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 id="fiche-rayees" className="t-eyebrow m-0">
                          {CARNET.rayees} · {ratures.anciennes.length}
                        </h3>
                        {ratures.anciennes.length > 6 && (
                          <button type="button" className="ink-link text-[12.5px] font-semibold" onClick={() => setShowAllRayees((v) => !v)}>
                            {showAllRayees ? "Replier" : `Voir les ${ratures.anciennes.length}`}
                          </button>
                        )}
                      </div>
                      <div className="card-quiet p-1.5">
                        {(showAllRayees ? ratures.anciennes : ratures.anciennes.slice(0, 6)).map(({ it, at }) => (
                          <button
                            key={it.q.id}
                            type="button"
                            onClick={() => selectPage(it.page)}
                            className="rl-row flex w-full items-start gap-3 rounded-[12px] px-3 py-2.5 text-left"
                            title="Afficher la synthèse de cette page"
                          >
                            <span className="mt-px shrink-0 rounded-[7px] px-1.5 py-0.5 font-mono text-[11.5px] font-semibold text-muted">P{it.page}</span>
                            <Rature rayee son={false} trait={it.q.id.length % 2 ? "b" : "a"} className="min-w-0 flex-1 text-[13px] leading-snug">
                              {enonceCourt(it.q.prompt, 90)}
                            </Rature>
                            <span className="mt-px hidden shrink-0 font-mono text-[11px] text-muted sm:inline">{CARNET.rayeeLe(dateCourte(at) ?? "")}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )
            ) : (
              <div className={l.page}>
                <h2 className={l.pageTitre}>Bilan aléatoire</h2>
                <p className="t-small mt-2 max-w-[460px]">
                  {MIXED_SIZE} questions tirées au hasard parmi toutes les pages de la fiche : pour vérifier que tu retiens
                  vraiment, sans connaître l&apos;ordre ni la page.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <ActionEncre disabled={allItems.length === 0} onClick={startMixed}>
                    <Shuffle size={16} aria-hidden /> Lancer un bilan aléatoire
                  </ActionEncre>
                  <span className="t-micro">
                    {allItems.length} questions disponibles sur {drillSets.length} pages
                  </span>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                  {confirmReset ? (
                    <>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => void doReset()}>
                        Confirmer : tout effacer
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmReset(false)}>
                        Annuler
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn btn-ghost btn-sm text-muted" disabled={rows.length === 0} onClick={() => setConfirmReset(true)}>
                      <Trash2 size={13} aria-hidden /> Réinitialiser toute la fiche
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </Scene>
    </SousPage>
  );
}

/** L'historique des ratures : la semaine en bâtons, puis le compte depuis le début. */
function HistoireRatures({ semaine, total, className = "" }: { semaine: number; total: number; className?: string }) {
  return (
    <div className={"flex flex-wrap items-center gap-x-4 gap-y-2 " + className}>
      {semaine > 0 && <Batons jours={semaine} height={20} max={4} animer={false} />}
      <p className="t-micro m-0">
        {semaine > 0 && (
          <>
            <b className="font-semibold text-white">{RATURE.semaine(semaine)}</b>
            {" · "}
          </>
        )}
        {RATURE.depuisToujours(total)}
      </p>
    </div>
  );
}

/**
 * Une ligne du carnet rayée aujourd'hui. Si elle n'a pas encore été vue
 * rayée sur cette page (on revient d'un quiz), le trait se trace sous nos
 * yeux ; sinon elle est posée rayée.
 */
function LigneRayee({
  id,
  vues,
  className,
  children,
}: {
  id: string;
  vues: React.RefObject<Set<string> | null>;
  className?: string;
  children: React.ReactNode;
}) {
  const [rayee, setRayee] = useState(() => vues.current === null || vues.current.has(id));
  useEffect(() => {
    if (rayee) return;
    const t = window.setTimeout(() => {
      setRayee(true);
      vues.current?.add(id);
    }, 380);
    return () => window.clearTimeout(t);
  }, [rayee, id, vues]);
  return (
    <Rature rayee={rayee} className={className}>
      {children}
    </Rature>
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
