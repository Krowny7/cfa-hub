import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { CardLabel } from "@/components/ui/Titles";
import { EloChart } from "@/components/classement/EloChart";
import { fmtInt, fmtLongDate, signed } from "@/components/classement/format";
import type { RatingEvent } from "@/lib/rating";

const SHOWN = 10;

// Carte « ELO — n derniers matchs ». Sans historique (pas encore de match,
// ou table pas encore créée) : un état vide qui invite au premier duel.
export function EloCard({ history, elo, tint }: { history: RatingEvent[]; elo: number; tint: string }) {
  const events = history.slice(-SHOWN);
  const last = events[events.length - 1];
  const total = events.length ? events[events.length - 1].eloAfter - events[0].eloBefore : 0;
  const hasExam = events.some((e) => e.source === "mock_exam");

  return (
    <section className="card rl-lift flex h-full min-w-0 flex-col gap-4 p-[22px]">
      <CardLabel
        icon={<BarChart3 size={15} aria-hidden />}
        right={last ? <span className="rounded-[8px] bg-white px-2 py-[3px] font-mono text-[12px] text-black">{signed(last.delta)}</span> : undefined}
      >
        {events.length ? `ELO — ${events.length === 1 ? "dernier match" : `${events.length} derniers matchs`}` : "ELO — tes matchs classés"}
      </CardLabel>

      {events.length ? (
        <>
          <EloChart events={events} tint={tint} />
          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[13px] text-muted">
            <span>
              {hasExam ? "duels et examens classés" : "duels classés"}, depuis le {fmtLongDate(events[0].createdAt)}
            </span>
            <span className="font-mono tabular-nums text-white">{signed(total)}</span>
          </div>
          {hasExam && (
            <div className="-mt-2 flex gap-4 text-[12px] text-muted" aria-hidden>
              <span className="inline-flex items-center gap-1.5">
                <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
                duel
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1 L9 5 L5 9 L1 5 Z" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
                examen blanc
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-1 flex-col justify-center gap-3">
          <svg viewBox="0 0 460 70" width="100%" aria-hidden style={{ display: "block", overflow: "visible" }}>
            <line x1={0} x2={460} y1={40} y2={40} stroke="var(--line-2)" strokeDasharray="3 5" />
            <text x={0} y={34} style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "var(--ink-2)" }}>
              {fmtInt(elo)}
            </text>
            <circle cx={450} cy={40} r={5} fill="currentColor" className="text-white" />
          </svg>
          <div>
            <p className="text-[15px] font-semibold">Pas encore de match classé</p>
            <p className="mt-1 text-[13.5px] text-muted">Ta courbe démarre à ton premier duel ou examen blanc classé. Chaque match fait bouger ton ELO.</p>
          </div>
          <Link href="/duel" className="ink-link w-fit">
            Lancer le premier duel
          </Link>
        </div>
      )}
    </section>
  );
}
