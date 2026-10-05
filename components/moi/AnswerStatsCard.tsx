"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ChevronRight, PenLine } from "lucide-react";
import { CardLabel } from "@/components/ui/Titles";
import { fmtInt } from "@/components/classement/format";
import { LEXIQUE } from "@/lib/voice";
import { ANSWER_SOURCES, SOURCE_HREFS, SOURCE_LABELS, tallyOf, type AnswerPassage, type AnswerStats, type AnswerSubject, type AnswerTheme, type SourceFilter, type TallyView } from "@/lib/answer-stats";
import { RECENT_MIN, formeDe, tendance, type Forme } from "@/lib/forme";

// Moi › Stats : le total des questions répondues (« traits tracés »), un
// filtre par source (duels, examens blancs, examens, QCM, sessions ciblées,
// fiches) et le détail dépliable matière → thème → passage, avec pour chaque
// niveau : répondues, précision (moyenne de toujours) et récent (tes
// dernières réponses, flèche si l'écart est net). Sous chaque matière, une
// bougie horizontale : la dispersion de tes séances (25e–75e percentile de
// bonnes réponses, trait fin du 10e au 90e) et un repère sur ton récent
// (lib/forme). Les données arrivent toutes prêtes (lib/answer-stats.ts, côté
// serveur) ; le filtre et la forme se calculent ici.
//
// Props : `stats` (AnswerStats), `initial` (filtre de départ, « all » par
// défaut), `open` (matière et thème dépliés au départ, ex. depuis un lien).

const OPTIONS: SourceFilter[] = ["all", ...ANSWER_SOURCES];
const LABEL = (s: SourceFilter) => (s === "all" ? "Tout" : SOURCE_LABELS[s]);
/** « en duels », « en examens blancs »… */
const IN_SOURCE: Record<SourceFilter, string> = {
  all: "",
  duel: "en duel",
  daily: "au défi du jour",
  mock: "en examen blanc",
  exam: "en examen officiel",
  qcm: "en QCM",
  practice: "en session ciblée",
  calc: "en calcul",
  fiche: "dans les fiches",
};
const ACTION: Record<SourceFilter, string> = {
  all: "S'entraîner",
  duel: "Lancer un duel",
  daily: "Les 30 du jour",
  mock:"Voir les examens blancs",
  exam: "Voir les examens officiels",
  qcm: "Ouvrir les QCM",
  practice: "Lancer une session ciblée",
  calc: "Ouvrir les calculs",
  fiche: "Ouvrir les fiches",
};
const PSEUDO_NOTE: Record<string, string> = {
  mixed: "sans détail par matière",
  other: "QCM perso ou supprimés",
};

/** « Traits tracés » : le total des questions répondues, dans la voix du site */
const TITLE = LEXIQUE.traitsTraces.charAt(0).toUpperCase() + LEXIQUE.traitsTraces.slice(1);

const pad2 = (n: number) => String(n).padStart(2, "0");
const pctLabel = (t: TallyView) => (t.pct === null ? "—" : `${t.pct} %`);

// Colonnes partagées : libellé | répondues | précision | récent (une seule
// colonne de chiffres sur téléphone, le reste passe sous le libellé).
const GRID = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[minmax(0,1fr)_78px_72px_78px]";

/** Le récent, avec une flèche quand il s'écarte nettement de la moyenne. */
function Recent({ f, t, strong = true }: { f: Forme; t: TallyView; strong?: boolean }) {
  const d = tendance(f.recent, t.pct);
  const Icon = d > 0 ? ArrowUpRight : ArrowDownRight;
  const titre =
    f.recent === null
      ? "Pas encore assez de réponses (il en faut une dizaine)"
      : `${f.recent} % sur tes ${f.recentN} dernières réponses${d ? ` (${d > 0 ? "+" : ""}${d} points sur ta moyenne)` : ""}`;
  return (
    <span
      className={"inline-flex items-center justify-end gap-0.5 font-mono tabular-nums " + (strong ? "text-[14px] font-semibold " : "text-[13px] font-medium ") + (d < 0 ? "text-pen" : "")}
      title={titre}
    >
      {f.recent === null ? <span className="text-muted">—</span> : `${f.recent} %`}
      {f.recent !== null && d !== 0 && <Icon size={13} strokeWidth={2.4} aria-hidden />}
    </span>
  );
}

function Cells({ t, f, strong = true }: { t: TallyView; f: Forme; strong?: boolean }) {
  return (
    <>
      <span className={"hidden text-right font-mono tabular-nums sm:block " + (strong ? "text-[14px] font-semibold" : "text-[13px] font-medium")}>{fmtInt(t.n)}</span>
      <span
        className={"text-right font-mono tabular-nums " + (strong ? "text-[14px] font-semibold" : "text-[13px] font-medium")}
        title={`${fmtInt(t.ok)} juste${t.ok > 1 ? "s" : ""} sur ${fmtInt(t.n)}`}
      >
        {pctLabel(t)}
      </span>
      <span className="hidden text-right sm:block">
        <Recent f={f} t={t} strong={strong} />
      </span>
    </>
  );
}

/** Sous-ligne mobile : « 67 répondues · 41 justes · récent 64 % ». */
function MobileCounts({ t, f }: { t: TallyView; f?: Forme }) {
  return (
    <span className="t-micro mt-0.5 block tabular-nums sm:hidden">
      {fmtInt(t.n)} répondue{t.n > 1 ? "s" : ""} · {fmtInt(t.ok)} juste{t.ok > 1 ? "s" : ""}
      {f && f.recent !== null && (
        <>
          {" "}
          · <span className="whitespace-nowrap">récent {f.recent} %</span>
        </>
      )}
    </span>
  );
}

// La bougie : 0 à 100 % de bonnes réponses ; trait fin du 10e au 90e
// percentile de tes séances, corps du 25e au 75e, repère sur ton récent
// (rouge s'il est nettement sous ta moyenne). Sans assez de séances : le
// repère seul.
const BW = 160;
function Bougie({ f, t, className = "" }: { f: Forme; t: TallyView; className?: string }) {
  const x = (v: number) => Math.max(1, Math.min(BW - 1, (v / 100) * BW));
  const b = f.bougie;
  const d = tendance(f.recent, t.pct);
  const titre = [
    b ? `La moitié centrale de tes ${b.seances} séances : entre ${b.p25} % et ${b.p75} % (de ${b.p10} à ${b.p90} % pour 8 sur 10).` : "Encore trop peu de séances pour une bougie.",
    f.recent !== null ? `Récent : ${f.recent} % sur tes ${f.recentN} dernières réponses.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <svg width={BW} height={14} viewBox={`0 0 ${BW} 14`} className={"overflow-visible " + className} role="img" aria-label={titre}>
      <title>{titre}</title>
      <line x1={0} x2={BW} y1={7} y2={7} stroke="var(--line-2)" strokeWidth={1} />
      <line x1={BW / 2} x2={BW / 2} y1={4} y2={10} stroke="var(--line-2)" strokeWidth={1} />
      {b && (
        <>
          <line x1={x(b.p10)} x2={x(b.p90)} y1={7} y2={7} stroke="var(--ink-3)" strokeWidth={1.5} strokeLinecap="round" />
          <rect x={x(b.p25)} y={3} width={Math.max(3, x(b.p75) - x(b.p25))} height={8} rx={2} fill="color-mix(in oklab, var(--ink) 18%, transparent)" stroke="var(--ink-2)" strokeWidth={1} />
        </>
      )}
      {f.recent !== null && <line x1={x(f.recent)} x2={x(f.recent)} y1={0.5} y2={13.5} stroke={d < 0 ? "var(--pen)" : "var(--ink)"} strokeWidth={2.4} strokeLinecap="round" />}
    </svg>
  );
}

const SUMMARY = "cursor-pointer list-none rounded-[10px] outline-offset-2 transition-colors hover:bg-surface-2 [&::-webkit-details-marker]:hidden";

/** Un passage (un duel, une session, un quiz…) : mêmes colonnes que les niveaux du dessus. */
function PassageRow({ p }: { p: AnswerPassage }) {
  const pct = p.n > 0 ? Math.round((p.ok / p.n) * 100) : null;
  const num = "text-right font-mono text-[12.5px] tabular-nums text-muted";
  const body = (
    <>
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="truncate text-[13px]">{p.label}</span>
        {p.date && <span className="t-micro shrink-0 whitespace-nowrap">{p.date}</span>}
      </span>
      <span className={"hidden sm:block " + num}>{p.n}</span>
      <span className={num} title={`${p.ok} juste${p.ok > 1 ? "s" : ""} sur ${p.n}`}>
        <span className="sm:hidden">
          {p.ok}/{p.n}
        </span>
        <span className="hidden sm:inline">{pct === null ? "—" : `${pct} %`}</span>
      </span>
      <span aria-hidden className="hidden sm:block" />
    </>
  );
  const cls = "-mx-2 rounded-[10px] px-2 py-[7px] " + GRID;
  return p.href ? (
    <Link href={p.href} className={"rl-row " + cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const SHOWN = 5;

function ThemeRow({ th, src, open }: { th: AnswerTheme; src: SourceFilter; open?: boolean }) {
  const [all, setAll] = useState(false);
  const t = tallyOf(th.by, src);
  const passages = th.passages.filter((p) => src === "all" || p.source === src);
  const f = formeDe(passages);
  const shown = all ? passages : passages.slice(0, SHOWN);
  return (
    <li>
      <details className="group/t" open={open || undefined}>
        <summary className={SUMMARY + " -mx-2 px-2 py-2 " + GRID}>
          <span className="flex min-w-0 items-start gap-2">
            <ChevronRight size={14} aria-hidden className="mt-[3px] shrink-0 text-muted transition-transform duration-200 group-open/t:rotate-90" />
            <span className="min-w-0">
              <span className="block text-[13.5px] font-medium leading-snug [overflow-wrap:anywhere]">
                {th.label}
                {th.tag && <span className="ml-2 whitespace-nowrap font-mono text-[11px] font-medium text-muted">{th.tag}</span>}
              </span>
              <MobileCounts t={t} f={f} />
            </span>
          </span>
          <Cells t={t} f={f} strong={false} />
        </summary>
        <div className="rl-in pb-2 pl-6">
          {shown.length === 0 ? (
            <p className="t-micro py-2">Passages trop anciens pour être listés.</p>
          ) : (
            <ul className="border-l border-line pl-3">
              {shown.map((p) => (
                <li key={p.id}>
                  <PassageRow p={p} />
                </li>
              ))}
            </ul>
          )}
          {(passages.length > SHOWN || (src === "all" && th.more > 0)) && (
            <div className="pl-3 pt-1">
              {passages.length > SHOWN && (
                <button type="button" onClick={() => setAll((v) => !v)} className="t-micro font-semibold text-white underline decoration-line-2 underline-offset-4 hover:decoration-current">
                  {all ? "Replier" : passages.length - SHOWN === 1 ? "Voir l'autre passage" : `Voir les ${passages.length - SHOWN} autres passages`}
                </button>
              )}
              {src === "all" && th.more > 0 && all && <span className="t-micro ml-2">et {th.more} plus anciens</span>}
            </div>
          )}
        </div>
      </details>
    </li>
  );
}

function SubjectRow({ s, src, index, open }: { s: AnswerSubject; src: SourceFilter; index: number | null; open?: { subject?: string; theme?: string } }) {
  const t = tallyOf(s.by, src);
  const f = formeDe(s.seances, src);
  const themes = s.themes.filter((th) => tallyOf(th.by, src).n > 0);
  const head = (expandable: boolean) => (
    <>
      <span className="flex min-w-0 items-center gap-2.5">
        {expandable ? (
          <ChevronRight size={15} aria-hidden className="shrink-0 transition-transform duration-200 group-open/s:rotate-90" />
        ) : (
          <span aria-hidden className="w-[15px] shrink-0" />
        )}
        <span className="w-5 shrink-0 font-mono text-[11px] tabular-nums text-muted">{index === null ? "··" : pad2(index)}</span>
        <span className="min-w-0">
          <span className={"block truncate text-[14.5px] font-semibold tracking-[-0.006em] " + (t.n === 0 ? "text-muted" : "")}>{s.name}</span>
          {s.pseudo && PSEUDO_NOTE[s.key] && <span className="t-micro block truncate">{PSEUDO_NOTE[s.key]}</span>}
          {t.n > 0 && <MobileCounts t={t} f={f} />}
          {/* la bougie : la dispersion de tes séances et ton récent (le volume reste en chiffres) */}
          {t.n > 0 && !s.pseudo && <Bougie f={f} t={t} className="mt-1.5 hidden sm:block" />}
        </span>
      </span>
      {t.n === 0 ? (
        <>
          <span className="hidden text-right font-mono text-[13px] text-muted sm:block">—</span>
          <span className="text-right font-mono text-[13px] text-muted">—</span>
          <span className="hidden text-right font-mono text-[13px] text-muted sm:block">—</span>
        </>
      ) : (
        <Cells t={t} f={f} />
      )}
    </>
  );

  if (t.n === 0 || themes.length === 0) {
    return (
      <li>
        <div className={"-mx-2 px-2 py-3 " + GRID}>{head(false)}</div>
      </li>
    );
  }
  return (
    <li>
      <details className="group/s" open={open?.subject === s.key || undefined}>
        <summary className={SUMMARY + " -mx-2 px-2 py-3 " + GRID}>{head(true)}</summary>
        <ul className="rl-in mb-3 ml-[34px] border-l border-line pl-3 sm:ml-[42px]">
          {themes.map((th) => (
            <ThemeRow key={th.key} th={th} src={src} open={open?.subject === s.key && open.theme === th.key} />
          ))}
        </ul>
      </details>
    </li>
  );
}

/** La légende, repliée : pour qui veut comprendre la bougie. */
function LireBougies() {
  const exemple: Forme = { recent: 72, recentN: 20, bougie: { p10: 38, p25: 50, p75: 66, p90: 80, seances: 8 } };
  return (
    <details className="group/l mt-4 hidden sm:block">
      <summary className="t-micro inline-flex cursor-pointer list-none items-center gap-1 font-semibold hover:text-white [&::-webkit-details-marker]:hidden">
        <ChevronRight size={13} aria-hidden className="transition-transform group-open/l:rotate-90" />
        Lire les bougies
      </summary>
      <div className="rl-in mt-3 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[12px] bg-surface-2/60 p-4">
        <Bougie f={exemple} t={{ n: 100, ok: 58, pct: 58 }} />
        <p className="t-micro m-0 max-w-[460px] leading-relaxed">
          De 0 à 100 % de bonnes réponses, séance par séance (un duel, une session, un quiz…). Le corps : la moitié centrale de tes séances (25e à 75e percentile) ;
          le trait fin : 8 séances sur 10. Le repère : ton récent, sur tes {RECENT_MIN} dernières réponses environ, en rouge s&apos;il passe nettement sous ta moyenne.
        </p>
      </div>
    </details>
  );
}

export function AnswerStatsCard({ stats, initial = "all", open }: { stats: AnswerStats; initial?: SourceFilter; open?: { subject?: string; theme?: string } }) {
  const [src, setSrc] = useState<SourceFilter>(initial);
  const total = tallyOf(stats.by, "all");
  const cur = tallyOf(stats.by, src);
  const subjects = stats.subjects.filter((s) => !s.pseudo || tallyOf(s.by, src).n > 0);
  const forme = formeDe(stats.seances, src);
  const ecart = tendance(forme.recent, cur.pct);
  const counts = Object.fromEntries(OPTIONS.map((o) => [o, tallyOf(stats.by, o).n])) as Record<SourceFilter, number>;
  const missing = stats.missing.map((m) => SOURCE_LABELS[m].toLowerCase());

  const options = (variant: "list" | "chips") =>
    OPTIONS.map((o) => {
      const on = o === src;
      const n = counts[o];
      return (
        <button
          key={o}
          type="button"
          aria-pressed={on}
          onClick={() => setSrc(o)}
          className={
            variant === "chips"
              ? "chip chip-sm shrink-0 " + (on ? "chip-active" : n === 0 ? "text-muted" : "")
              : "-mx-2 flex items-center justify-between gap-3 rounded-[10px] px-2 py-[7px] text-left text-[13.5px] transition-colors " +
                (on ? "bg-surface-2 font-semibold text-white" : "text-muted hover:bg-surface-2 hover:text-white")
          }
        >
          {variant === "list" ? (
            <>
              <span className="flex items-center gap-2.5">
                <span aria-hidden className={"h-[7px] w-[7px] rounded-full transition-colors " + (on ? "bg-white" : "bg-line-2")} />
                {LABEL(o)}
              </span>
              <span className="font-mono text-[12.5px] tabular-nums">{n ? fmtInt(n) : "—"}</span>
            </>
          ) : (
            <>
              {LABEL(o)}
              <span className={"font-mono text-[11.5px] tabular-nums " + (on ? "opacity-70" : "text-muted")}>{fmtInt(n)}</span>
            </>
          )}
        </button>
      );
    });

  return (
    <section className="card flex min-w-0 flex-col gap-6 p-6 md:p-7" aria-labelledby="moi-traits">
      <CardLabel icon={<PenLine size={15} aria-hidden />} right={<span className="t-micro hidden sm:inline">duels, défi, examens, QCM, sessions, fiches</span>}>
        <span id="moi-traits">{TITLE}</span>
      </CardLabel>

      {!stats.available ? (
        <p className="t-small">
          Tes réponses s&apos;afficheront ici dès qu&apos;elles seront lisibles.{" "}
          <Link href="/entrainement" className="ink-link">
            S&apos;entraîner
          </Link>
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
          <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            <div aria-live="polite">
              <p key={src} className="t-num rl-in m-0 text-[56px] md:text-[64px]">
                {fmtInt(cur.n)}
              </p>
              <p className="t-small mt-3">
                {cur.n === 0 ? (
                  src === "all" ? (
                    "Pas encore de trait : ta première réponse s'inscrira ici."
                  ) : (
                    `Aucune question ${IN_SOURCE[src]} pour l'instant.`
                  )
                ) : (
                  <>
                    question{cur.n > 1 ? "s" : ""} répondue{cur.n > 1 ? "s" : ""}
                    {src !== "all" ? ` ${IN_SOURCE[src]}` : ""}
                    <br />
                    <span className="font-mono tabular-nums">{fmtInt(cur.ok)}</span> juste{cur.ok > 1 ? "s" : ""} · précision{" "}
                    <span className="font-semibold text-white">{pctLabel(cur)}</span>
                    {forme.recent !== null && (
                      <>
                        <br />
                        récemment{" "}
                        <span className={"inline-flex items-center gap-0.5 font-semibold " + (ecart < 0 ? "text-pen" : "text-white")} title={`sur tes ${forme.recentN} dernières réponses`}>
                          {forme.recent} %{ecart > 0 ? <ArrowUpRight size={14} strokeWidth={2.4} aria-hidden /> : ecart < 0 ? <ArrowDownRight size={14} strokeWidth={2.4} aria-hidden /> : null}
                        </span>{" "}
                        <span className="t-micro">· {forme.recentN} dernières</span>
                      </>
                    )}
                  </>
                )}
              </p>
            </div>

            <div role="group" aria-label="Filtrer par source" className={total.n === 0 ? "hidden" : "hidden flex-col gap-0.5 lg:flex"}>
              <p className="t-eyebrow mb-2">Source</p>
              {options("list")}
            </div>
            <div role="group" aria-label="Filtrer par source" className={total.n === 0 ? "hidden" : "-mx-6 -my-1 flex gap-1.5 overflow-x-auto px-6 py-1 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"}>
              {options("chips")}
            </div>
          </div>

          <div className="min-w-0 lg:border-l lg:border-line lg:pl-10">
            {total.n === 0 ? (
              // papier blanc : la structure viendra avec le premier trait
              <div className="flex h-full flex-col items-start justify-center gap-4 py-2 lg:py-6">
                <hr aria-hidden className="pencil-dash w-full max-w-[320px]" />
                <p className="t-small max-w-[440px]">Papier blanc pour l&apos;instant. Chaque question compte ici, d&apos;où qu&apos;elle vienne : duels, défi du jour, examens, QCM, sessions ciblées, fiches.</p>
                <Link href="/entrainement" className="ink-link">
                  {ACTION.all}
                </Link>
              </div>
            ) : cur.n === 0 ? (
              <div className="flex h-full flex-col items-start justify-center gap-3 py-6">
                <p className="t-small">Rien {IN_SOURCE[src]} pour l&apos;instant : les autres sources ont déjà {fmtInt(total.n)} traits.</p>
                {src !== "all" && (
                  <Link href={SOURCE_HREFS[src]} className="ink-link">
                    {ACTION[src]}
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className={"hidden border-b border-line pb-2.5 sm:grid " + GRID}>
                  <span className="t-eyebrow pl-[50px]">Matière</span>
                  <span className="t-eyebrow text-right">Répondues</span>
                  <span className="t-eyebrow text-right" title="moyenne de toutes tes réponses">Précision</span>
                  <span className="t-eyebrow text-right" title={`tes ${RECENT_MIN} dernières réponses environ`}>Récent</span>
                </div>
                <ul className="divide-y divide-line">
                  {subjects.map((s, i) => (
                    <SubjectRow key={s.key} s={s} src={src} index={s.pseudo ? null : i + 1} open={open} />
                  ))}
                </ul>
                <LireBougies />
              </>
            )}
            {missing.length > 0 && <p className="t-micro mt-4">Pas encore comptés ici : {missing.join(", ")}.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
