"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { fmtAgo } from "@/components/classement/format";
import { TwoColumnRows } from "@/components/reviser/SubjectRows";
import type { SessionItem } from "@/components/moi/types";

const SHOWN = 5;
const KIND = { qcm: "QCM", flashcards: "Flashcards", practice: "Entraînement ciblé" } as const;

// Ancien historique gardé dans le navigateur (avant la synchronisation).
type LocalStat = { setId: string; title: string; mode: string; correct: number; total: number; lastStudied: number };

function readLocal(): SessionItem[] {
  try {
    const raw = localStorage.getItem("cfa_session_stats");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, LocalStat>;
    return Object.values(parsed)
      .sort((a, b) => b.lastStudied - a.lastStudied)
      .slice(0, 20)
      .map((s) => {
        const at = new Date(s.lastStudied).toISOString();
        const qcm = s.mode !== "flashcards";
        return {
          id: `l-${s.setId}`,
          kind: qcm ? "qcm" : "flashcards",
          title: s.title,
          correct: Number(s.correct) || 0,
          total: Number(s.total) || 0,
          at,
          ago: fmtAgo(at),
          href: qcm ? `/qcm/${s.setId}` : `/flashcards/${s.setId}`,
        } as SessionItem;
      });
  } catch {
    return [];
  }
}

function Row({ s }: { s: SessionItem }) {
  const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : null;
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold">{s.title}</span>
        <span className="t-micro block">
          {KIND[s.kind]} · {s.ago}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-mono text-[14px] font-semibold tabular-nums">{pct === null ? "—" : `${pct} %`}</span>
        <span className="t-micro block font-mono tabular-nums">
          {s.correct}/{s.total}
        </span>
      </span>
    </>
  );
  const cls = "-mx-2 flex items-center gap-4 rounded-[12px] px-2 py-3";
  return s.href ? (
    <Link href={s.href} className={"rl-row " + cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Dernières sessions terminées, sur deux colonnes (une sur téléphone) ; le reste replié. */
export function SessionHistory({ sessions }: { sessions: SessionItem[] }) {
  const [local, setLocal] = useState<SessionItem[] | null>(null);

  useEffect(() => {
    if (sessions.length === 0) setLocal(readLocal());
  }, [sessions.length]);

  const rows = sessions.length > 0 ? sessions : local ?? [];
  const first = rows.slice(0, SHOWN);
  const rest = rows.slice(SHOWN);

  return (
    <section className="card-quiet flex h-full flex-col gap-3 p-6 md:p-7" aria-labelledby="moi-sessions">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id="moi-sessions" className="m-0 text-[16px] font-bold tracking-[-0.01em]">
          Dernières sessions
        </h3>
        {rows.length > 0 && <span className="t-micro">QCM, flashcards, entraînement ciblé</span>}
      </div>

      {rows.length === 0 ? (
        <p className="t-small">
          Pas encore de session terminée.{" "}
          <Link href="/entrainement" className="ink-link">
            Lancer la première
          </Link>
        </p>
      ) : (
        <>
          <TwoColumnRows items={first} keyOf={(s) => s.id} render={(s) => <Row s={s} />} />
          {rest.length > 0 && (
            <details className="group">
              <summary className="t-small inline-flex cursor-pointer list-none items-center gap-1.5 font-semibold [&::-webkit-details-marker]:hidden">
                <ArrowRight size={14} aria-hidden className="transition-transform group-open:rotate-90" />
                <span className="group-open:hidden">Voir les {rest.length} précédentes</span>
                <span className="hidden group-open:inline">Replier</span>
              </summary>
              <TwoColumnRows className="mt-1" items={rest} keyOf={(s) => s.id} render={(s) => <Row s={s} />} />
            </details>
          )}
        </>
      )}
    </section>
  );
}
