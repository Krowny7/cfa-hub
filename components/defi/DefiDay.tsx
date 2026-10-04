import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DefiResult } from "@/components/defi/DefiResult";
import { BackLink, DefiBoard, DefiHeading } from "@/components/defi/parts";
import { DAILY_HREF, dailyPhase, type DailyBoard, type DailyInfo, type DailyReviewItem } from "@/lib/daily";
import { DEFI } from "@/lib/voice-z2c";

type Props = {
  info: DailyInfo;
  board: DailyBoard | null;
  /** ma correction, si j'ai rendu ma copie ce jour-là */
  review: DailyReviewItem[];
  nowIso: string;
};

// /defi/<jour> : un jour passé (ou aujourd'hui, une fois ma copie rendue) :
// ma copie et sa revue, et le classement figé.
export function DefiDay({ info, board, review, nowIso }: Props) {
  const phase = dailyPhase(info);
  return (
    <div className="rl-page">
      <div className="grid gap-5">
        <BackLink href={DAILY_HREF}>{info.isToday ? DEFI.tuile.label : DEFI.aujourdhui}</BackLink>
        <DefiHeading day={info.day} today={info.today} isToday={info.isToday} />
      </div>

      {!info.exists ? (
        <section className="card-quiet grid max-w-[640px] gap-3 p-6 md:p-8">
          <h2 className="t-h2 m-0">{DEFI.jourSansTitre}</h2>
          <p className="t-body m-0 text-muted">{DEFI.jourSansTexte}</p>
          <Link href={DAILY_HREF} className="btn btn-primary w-fit">
            {DEFI.aujourdhui} <ArrowRight size={16} aria-hidden />
          </Link>
        </section>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-6">
          {phase === "done" ? (
            <DefiResult info={info} review={review} board={board} />
          ) : (
            <section className="card-quiet grid min-w-0 gap-3 p-6 md:p-8">
              <h2 className="t-h2 m-0">{DEFI.missed}</h2>
              <p className="t-body m-0 text-muted">{DEFI.missedText}</p>
              <Link href={DAILY_HREF} className="btn btn-primary w-fit">
                {DEFI.aujourdhui} <ArrowRight size={16} aria-hidden />
              </Link>
            </section>
          )}
          <DefiBoard board={board} isToday={info.isToday} closesAt={info.closesAt} nowIso={nowIso} limit={50} />
        </div>
      )}
    </div>
  );
}
