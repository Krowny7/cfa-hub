"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { readRecentFlashcardSets, type RecentSetKind } from "@/components/RecentFlashcardSetTracker";
import { useSrsProgress } from "@/components/ContentFolderBlocks";
import { plural, splitTitle, subjectOfTitle } from "@/components/ContentDetailHeader";

type RecentEntry = { id: string; title: string; ts: number };
export type ResumeSuggestion = { id: string; title: string; subject?: string | null };

function ago(ts: number, now: number) {
  const m = Math.max(0, Math.round((now - ts) / 60000));
  if (m < 2) return "ouvert à l'instant";
  if (m < 60) return `ouvert il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `ouvert il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `ouvert il y a ${d} j`;
  return `ouvert le ${new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" })}`;
}

// Le point focal des pages QCM et Flashcards : « Reprendre » le dernier
// contenu ouvert (historique local du navigateur, voir
// RecentFlashcardSetTracker), sinon la suggestion du serveur (« Ta suite »,
// « Pour commencer »). Rendu serveur = la suggestion, pour que la carte ne
// saute pas à l'hydratation ; les autres contenus récents suivent en
// pastilles discrètes. N'affiche rien sans historique ni suggestion.
export function ContinueReviewing({
  kind = "flashcards",
  basePath = "/flashcards",
  fallback = null,
  counts,
  done,
  subjects,
  srs = false,
  unit = ["carte", "cartes"],
  sample,
}: {
  kind?: RecentSetKind;
  basePath?: string;
  /** suggestion du serveur quand le navigateur n'a pas d'historique */
  fallback?: ResumeSuggestion | null;
  /** taille de chaque contenu connu (id → nombre de questions ou de cartes) */
  counts?: Record<string, number>;
  /** progression connue côté serveur (id → questions réussies) */
  done?: Record<string, number>;
  /** matière de chaque contenu connu (id → nom) */
  subjects?: Record<string, string>;
  /** progression lue dans la répétition espacée du navigateur (flashcards) */
  srs?: boolean;
  unit?: [string, string];
  /** historique d'exemple (aperçu uniquement) */
  sample?: RecentEntry[];
}) {
  const [recent, setRecent] = useState<RecentEntry[] | null>(sample ?? null);

  useEffect(() => {
    if (!sample) setRecent(readRecentFlashcardSets(kind));
  }, [kind, sample]);

  const list = recent ?? [];
  const head: RecentEntry | null = list[0] ?? (fallback ? { id: fallback.id, title: fallback.title, ts: 0 } : null);
  const srsIds = useMemo(() => (srs && head ? [head.id] : null), [srs, head?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const srsMap = useSrsProgress(srsIds);

  if (!head) return null;

  const fromHistory = list.length > 0;
  const others = list.slice(1, 6);
  const parts = splitTitle(head.title);
  const subject = subjects?.[head.id] ?? (fromHistory ? null : fallback?.subject) ?? subjectOfTitle(head.title)?.name ?? null;
  const count = counts?.[head.id] ?? null;
  const progressed = srs ? srsMap[head.id]?.seen ?? null : done?.[head.id] ?? null;
  const doneN = count !== null && progressed !== null ? Math.min(progressed, count) : null;
  const pct = count && doneN ? Math.round((100 * doneN) / count) : null;

  const eyebrow = fromHistory ? "Reprendre" : doneN ? "Ta suite" : "Pour commencer";
  const cta = fromHistory || doneN ? "Reprendre" : "Commencer";
  const metaLine = [parts.lead, count !== null ? plural(count, unit[0], unit[1]) : null, fromHistory && head.ts ? ago(head.ts, Date.now()) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="card-hero rl-in overflow-hidden p-6 sm:p-7 md:p-9" aria-label={eyebrow}>
      <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between md:gap-12">
        <div className="min-w-0 flex-1">
          <p className="t-eyebrow">
            {eyebrow}
            {subject && subject !== parts.main ? <span className="text-faint"> · {subject}</span> : null}
          </p>
          <h2 className="t-h1 mt-3 line-clamp-2 break-words">{parts.main}</h2>
          {metaLine && <p className="t-small mt-2.5">{metaLine}</p>}
          {pct !== null && doneN !== null && count !== null && (
            <div className="mt-5 flex max-w-[440px] items-center gap-3">
              <div className="ink-bar flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                <span className="rl-grow" style={{ width: `${pct}%` }} />
              </div>
              <span className="t-micro shrink-0 font-mono tabular-nums">
                {doneN}/{count} <span className="font-sans">{srs ? "vues" : "réussies"}</span>
              </span>
            </div>
          )}
        </div>
        <Link href={`${basePath}/${head.id}`} className="btn btn-primary btn-lg rl-press w-full shrink-0 md:w-auto">
          {cta} <ArrowRight size={17} aria-hidden />
        </Link>
      </div>

      {others.length > 0 && (
        <div className="mt-7 flex items-center gap-3 border-t border-line pt-5">
          <span className="t-micro shrink-0 font-semibold">Récents</span>
          <div className="-my-1 flex min-w-0 gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {others.map((o) => (
              <Link key={o.id} href={`${basePath}/${o.id}`} className="chip chip-sm chip-quiet max-w-[260px] shrink-0">
                <span className="truncate">{splitTitle(o.title).main}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
