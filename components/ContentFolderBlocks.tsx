"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { loadSRS } from "@/lib/srs";
import type { FolderJoin } from "@/lib/content/grouping";
import {
  VisibilityBadge,
  groupByFolder,
  plural,
  visibilityLabel,
  type BrowserGroup,
  type BrowserRow,
  type ItemMeta,
} from "@/components/ContentDetailHeader";

// Navigation dans les contenus (QCM, sets de flashcards) : à gauche les
// matières ou les dossiers (pastilles qui défilent à l'horizontale sur
// téléphone), à droite les contenus du groupe choisi, en lignes calmes avec
// leur progression. Les données arrivent déjà regroupées (voir
// groupBySubject / groupByFolder dans ContentDetailHeader).

export { VisibilityBadge };

type Unit = [string, string];
export type SrsInfo = { seen: number; due: number };

/** Répétition espacée lue dans le navigateur (localStorage), après le montage. */
export function useSrsProgress(ids: string[] | null) {
  const [map, setMap] = useState<Record<string, SrsInfo>>({});
  const key = ids ? ids.join(",") : "";
  useEffect(() => {
    if (!key) return;
    const now = Date.now();
    const next: Record<string, SrsInfo> = {};
    for (const id of key.split(",")) {
      const vals = Object.values(loadSRS(id));
      if (!vals.length) continue;
      next[id] = { seen: vals.length, due: vals.filter((v) => v.due <= now).length };
    }
    setMap(next);
  }, [key]);
  return map;
}

/** Petite barre de progression + compteur aligné. */
function Progress({ done, total, label, className = "" }: { done: number; total: number; label?: string; className?: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((100 * done) / total)) : 0;
  return (
    <span className={"flex items-center gap-3 " + className} title={label ? `${done}/${total} ${label}` : undefined}>
      <span className="ink-bar flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
        <span style={{ width: `${pct}%` }} />
      </span>
      <span className="t-micro shrink-0 font-mono tabular-nums">
        {done}/{total}
        {label ? <span className="font-sans"> {label}</span> : null}
      </span>
    </span>
  );
}

function Row({
  row,
  href,
  unit,
  srs,
  showVisibility,
  progressLabel,
}: {
  row: BrowserRow;
  href: string;
  unit: Unit;
  srs?: SrsInfo;
  showVisibility: boolean;
  progressLabel: string;
}) {
  const count = row.count;
  const done = srs ? Math.min(srs.seen, count ?? srs.seen) : row.done;
  const showProgress = count !== null && count > 0 && done !== null && done > 0;
  const meta = [
    row.lead,
    count !== null ? plural(count, unit[0], unit[1]) : null,
    showVisibility ? visibilityLabel(row.visibility) : null,
    srs?.due ? `${srs.due} à revoir` : null,
  ].filter(Boolean);

  return (
    <Link href={href} className="rl-row group flex items-center gap-4 px-5 py-4 md:px-6">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-snug tracking-[-0.01em] sm:truncate">{row.main}</span>
        {(meta.length > 0 || showProgress) && (
          <span className="t-micro mt-1 block">
            {meta.join(" · ")}
            {showProgress && (
              <span className="sm:hidden">
                {meta.length ? " · " : ""}
                {done}/{count} {progressLabel}
              </span>
            )}
          </span>
        )}
      </span>
      {showProgress && <Progress done={done!} total={count!} className="hidden w-[140px] shrink-0 sm:flex" />}
      <ChevronRight size={16} aria-hidden className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function Pane({
  group,
  basePath,
  unit,
  setUnit,
  setLabel,
  drillLabel,
  srsMap,
  srs,
  showVisibility,
  emptyLabel,
  note,
  progressLabel,
  showTitle,
}: {
  group: BrowserGroup;
  basePath: string;
  unit: Unit;
  setUnit: Unit;
  setLabel: string;
  drillLabel: string;
  srsMap: Record<string, SrsInfo>;
  srs: boolean;
  showVisibility: boolean;
  emptyLabel: string;
  note?: string;
  progressLabel: string;
  showTitle: boolean;
}) {
  const rows = group.rows;
  const sections = [
    { key: "set", label: setLabel, rows: rows.filter((r) => r.kind === "set") },
    { key: "drill", label: drillLabel, rows: rows.filter((r) => r.kind === "drill") },
  ].filter((s) => s.rows.length > 0);

  const counted = rows.every((r) => r.count !== null);
  const total = counted ? rows.reduce((s, r) => s + (r.count ?? 0), 0) : null;
  const done = rows.reduce((s, r) => s + (srs ? Math.min(srsMap[r.id]?.seen ?? 0, r.count ?? Infinity) : r.done ?? 0), 0);

  return (
    <section className="rl-in flex flex-col gap-6" aria-label={group.name}>
      {showTitle && (
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h2 className="t-h2 m-0">{group.name}</h2>
            {rows.length > 0 && (
              <p className="t-micro mt-1.5">
                {[plural(rows.length, setUnit[0], setUnit[1]), total ? plural(total, unit[0], unit[1]) : null].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          {total && done > 0 ? <Progress done={done} total={total} label={progressLabel} className="w-full sm:w-[280px]" /> : null}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card-quiet grid place-items-center gap-1.5 px-6 py-14 text-center">
          <p className="t-h3 m-0">Bientôt</p>
          <p className="t-small max-w-[360px]">{emptyLabel}</p>
        </div>
      ) : (
        sections.map((sec) => (
          <div key={sec.key} className="flex flex-col gap-2.5">
            {sections.length > 1 && <p className="t-eyebrow">{sec.label}</p>}
            <div className="card divide-y divide-line overflow-hidden">
              {sec.rows.map((r) => (
                <Row
                  key={r.id}
                  row={r}
                  href={`${basePath}/${r.id}`}
                  unit={unit}
                  srs={srs ? srsMap[r.id] : undefined}
                  showVisibility={showVisibility}
                  progressLabel={progressLabel}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {note && rows.length > 0 && <p className="t-micro">{note}</p>}
    </section>
  );
}

/**
 * Le navigateur : rail des groupes + contenu du groupe choisi. `syncParam`
 * reporte le choix dans l'URL (?subject=fsa) sans recharger la page.
 */
export function ContentBrowser({
  groups,
  basePath,
  unit,
  setUnit = ["QCM", "QCM"],
  setLabel = "QCM",
  drillLabel = "Quiz des fiches",
  initialKey = null,
  syncParam = null,
  srs = false,
  showVisibility = false,
  emptyLabel = "Ce contenu arrive bientôt.",
  note,
  progressLabel = "réussies",
  ariaLabel = "Matières",
}: {
  groups: BrowserGroup[];
  basePath: string;
  unit: Unit;
  setUnit?: Unit;
  setLabel?: string;
  drillLabel?: string;
  initialKey?: string | null;
  syncParam?: string | null;
  /** progression lue dans la répétition espacée du navigateur (flashcards) */
  srs?: boolean;
  showVisibility?: boolean;
  emptyLabel?: string;
  note?: string;
  progressLabel?: string;
  ariaLabel?: string;
}) {
  const firstFull = groups.find((g) => g.rows.length > 0)?.key ?? groups[0]?.key ?? null;
  const [active, setActive] = useState<string | null>(
    initialKey && groups.some((g) => g.key === initialKey) ? initialKey : firstFull
  );
  const group = groups.find((g) => g.key === active) ?? groups[0] ?? null;
  const ids = useMemo(() => (srs ? groups.flatMap((g) => g.rows.map((r) => r.id)) : null), [srs, groups]);
  const srsMap = useSrsProgress(ids);
  const railRef = useRef<HTMLDivElement>(null);

  // Sur téléphone, la pastille choisie reste visible dans la bande qui défile.
  useEffect(() => {
    const rail = railRef.current;
    const el = rail?.querySelector<HTMLElement>('[data-on="true"]');
    if (!rail || !el) return;
    const target = el.offsetLeft - rail.clientWidth / 2 + el.clientWidth / 2;
    rail.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [active]);

  function select(key: string) {
    setActive(key);
    if (!syncParam) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set(syncParam, key);
      window.history.replaceState(null, "", url.pathname + url.search);
    } catch {
      // le choix s'affiche quand même
    }
  }

  if (!group) return null;
  const hasRail = groups.length > 1;

  const pane = (
    <Pane
      key={group.key}
      group={group}
      basePath={basePath}
      unit={unit}
      setUnit={setUnit}
      setLabel={setLabel}
      drillLabel={drillLabel}
      srsMap={srsMap}
      srs={srs}
      showVisibility={showVisibility}
      emptyLabel={emptyLabel}
      note={note}
      progressLabel={progressLabel}
      showTitle={hasRail}
    />
  );

  if (!hasRail) return pane;

  return (
    <div className="grid gap-7 md:grid-cols-[208px_minmax(0,1fr)] md:gap-10 lg:grid-cols-[244px_minmax(0,1fr)] lg:gap-14">
      {/* Téléphone : pastilles qui défilent à l'horizontale */}
      <div
        ref={railRef}
        role="tablist"
        aria-label={ariaLabel}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
      >
        {groups.map((g) => {
          const on = g.key === group.key;
          const empty = g.rows.length === 0;
          return (
            <button
              key={g.key}
              type="button"
              role="tab"
              aria-selected={on}
              data-on={on}
              onClick={() => select(g.key)}
              className={"chip chip-sm shrink-0 " + (on ? "chip-active" : empty ? "chip-quiet opacity-60" : "")}
            >
              {g.short}
              {!empty && <span className={"font-mono text-[11.5px] tabular-nums " + (on ? "opacity-70" : "text-muted")}>{g.rows.length}</span>}
            </button>
          );
        })}
      </div>

      {/* Ordinateur : colonne fixe */}
      <nav aria-label={ariaLabel} className="hidden md:block">
        <ul className="sticky top-24 m-0 grid list-none gap-0.5 p-0">
          {groups.map((g) => {
            const on = g.key === group.key;
            const empty = g.rows.length === 0;
            return (
              <li key={g.key}>
                <button
                  type="button"
                  aria-current={on ? "true" : undefined}
                  onClick={() => select(g.key)}
                  className={
                    "flex w-full items-center gap-3 rounded-[11px] px-3 py-2.5 text-left text-[14px] leading-tight transition-colors " +
                    (on
                      ? "bg-surface font-semibold shadow-[var(--shadow-1)] ring-1 ring-line"
                      : empty
                        ? "text-muted opacity-60 hover:bg-surface-2 hover:opacity-100"
                        : "text-muted hover:bg-surface-2 hover:text-white")
                  }
                >
                  <span className="min-w-0 flex-1 truncate">{g.name}</span>
                  <span className={"t-micro shrink-0 tabular-nums " + (empty ? "" : "font-mono")}>{empty ? "bientôt" : g.rows.length}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0">{pane}</div>
    </div>
  );
}

/** Contenus Système rangés par matière (QCM, flashcards). */
export function SubjectBrowser(props: Omit<Parameters<typeof ContentBrowser>[0], "ariaLabel" | "showVisibility">) {
  return <ContentBrowser {...props} ariaLabel="Matières" />;
}

/** Contenus créés par les utilisateurs, rangés par dossier. */
export function FolderBlocks<T extends FolderJoin & { id: string; title: string; visibility: string | null }>({
  items,
  rootLabel,
  basePath,
  itemUnit = "",
  unit,
  setUnit,
  extraFolderNames = [],
  emptyLabel = "À venir",
  meta,
}: {
  locale?: string;
  items: T[];
  rootLabel: string;
  openLabel?: string;
  basePath: string;
  itemUnit?: string;
  unit?: Unit;
  setUnit?: Unit;
  extraFolderNames?: string[];
  emptyLabel?: string;
  meta?: Record<string, ItemMeta>;
}) {
  const groups = useMemo(
    () =>
      groupByFolder(
        items.map((it) => ({ id: it.id, title: it.title, folder: it.library_folders?.name ?? null, visibility: it.visibility })),
        rootLabel,
        meta,
        extraFolderNames
      ),
    [items, rootLabel, meta, extraFolderNames]
  );
  if (groups.length === 0) return null;
  return (
    <ContentBrowser
      groups={groups}
      basePath={basePath}
      unit={unit ?? ["question", "questions"]}
      setUnit={setUnit ?? [itemUnit || "élément", (itemUnit || "élément") + "s"]}
      showVisibility
      emptyLabel={emptyLabel}
      ariaLabel="Dossiers"
    />
  );
}

/** En-tête de section (titre, sous-titre, nombre). */
export function SectionHeader({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle: string;
  count: number;
  tone?: "private" | "shared" | "public";
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="t-h3 m-0">{title}</h2>
        <p className="t-micro mt-1">{subtitle}</p>
      </div>
      <span className="t-micro font-mono tabular-nums">{count}</span>
    </div>
  );
}
