"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { DefiRunner } from "@/components/defi/DefiRunner";
import { DefiResult } from "@/components/defi/DefiResult";
import { DefiBoard, DefiHeading, DefiHistory } from "@/components/defi/parts";
import {
  DAILY_VOICE,
  dailyPhase,
  timeLeftLabel,
  type DailyBoard,
  type DailyHistoryEntry,
  type DailyInfo,
  type DailyQuestion,
  type DailyReviewItem,
} from "@/lib/daily";

type Props = {
  info: DailyInfo;
  board: DailyBoard | null;
  history: DailyHistoryEntry[];
  /** ma correction, si ma copie est rendue */
  review: DailyReviewItem[];
  nowIso: string;
  /** aperçu : la copie en cours avec des questions d'exemple, aucune requête */
  demo?: {
    questions: DailyQuestion[];
    answered: Record<number, number>;
    secondsLeft: number;
  };
};

// /defi : le défi du jour selon ma copie.
//   à faire : « À toi le trait. » (le point focal) + le classement du jour ;
//   en cours : la copie seule, plein écran (rien d'autre ne bouge) ;
//   rendue : ma copie (verdict, score, coches, rang) + le classement ;
// puis les jours passés (à revoir 14 jours, puis plus anciens).
export function DefiToday({
  info,
  board,
  history,
  review,
  nowIso,
  demo,
}: Props) {
  const phase = dailyPhase(info);
  const [run, setRun] = useState(phase === "playing");

  if (phase === "playing" || (run && phase === "todo")) {
    return (
      <DefiRunner
        day={info.day}
        today={info.today}
        questionCount={info.questionCount}
        timeLimitSeconds={info.timeLimitSeconds}
        demo={demo}
      />
    );
  }

  const left = timeLeftLabel(info.closesAt, nowIso);

  return (
    <div className="rl-page">
      <DefiHeading day={info.day} today={info.today} isToday={info.isToday} />

      {/* Ordinateur : la copie puis les jours passés à gauche, le classement
          accroché à droite. Mobile : copie, classement, jours passés. */}
      <div className="grid items-start gap-x-6 gap-y-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-y-16">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          {phase === "done" ? (
            <DefiResult info={info} review={review} board={board} />
          ) : phase === "todo" ? (
            <section
              className="card-hero rl-in grid min-w-0 gap-6 p-6 md:p-8"
              aria-label="Commencer le défi du jour"
            >
              <div>
                <p className="kicker m-0">
                  {info.players > 0
                    ? `${info.players} copie${info.players > 1 ? "s" : ""} rendue${info.players > 1 ? "s" : ""}${info.topScore !== null ? ` · meilleur ${info.topScore}/${info.questionCount}` : ""}`
                    : `${info.questionCount} questions · ${Math.round(info.timeLimitSeconds / 60)} min`}
                </p>
                <h2 className="t-h1 m-0 mt-1.5">{DAILY_VOICE.start}</h2>
              </div>
              <ul className="m-0 grid list-none gap-1.5 p-0 text-[15px] leading-normal text-muted">
                <li>
                  <b className="text-white">{info.questionCount} questions</b>,
                  les mêmes et dans le même ordre pour tout le monde.
                </li>
                <li>
                  <b className="text-white">
                    {Math.round(info.timeLimitSeconds / 60)} min, une seule
                    copie
                  </b>{" "}
                  : le chrono ne s&apos;arrête plus, même si tu fermes la page.
                </li>
                <li>
                  <b className="text-white">Réponses définitives</b> ; tu peux
                  passer et revenir. La correction s&apos;ouvre dès ta copie
                  rendue.
                </li>
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="t-micro">
                  {left
                    ? `Ouvert jusqu'à minuit · ${left}`
                    : "Ouvert jusqu'à minuit"}
                </span>
                <button
                  type="button"
                  className="btn btn-primary btn-lg w-full sm:w-auto"
                  onClick={() => setRun(true)}
                >
                  Commencer <ArrowRight size={16} aria-hidden />
                </button>
              </div>
            </section>
          ) : (
            <section className="card-hero grid min-w-0 gap-3 p-6 md:p-8">
              <p className="kicker m-0">Défi du jour</p>
              <h2 className="t-h2 m-0">Pas de défi pour l&apos;instant</h2>
              <p className="t-body m-0 max-w-[480px] text-muted">
                {DAILY_VOICE.unavailable}
              </p>
            </section>
          )}
        </div>

        {/* L'accroche se pose sur une enveloppe : .card impose position: relative */}
        <div className="min-w-0 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <DefiBoard board={board} isToday={info.isToday} closesAt={info.closesAt} nowIso={nowIso} />
        </div>

        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <DefiHistory entries={history} today={info.today} nowIso={nowIso} />
        </div>
      </div>
    </div>
  );
}
