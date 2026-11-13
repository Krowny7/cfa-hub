"use client";

import { useState } from "react";
import { DefiRunner } from "@/components/defi/DefiRunner";
import { DefiAccueil } from "@/components/defi/DefiAccueil";
import { ColonneSeance } from "@/components/ui/SousPage";
import type { SerieDuJour } from "@/lib/serie-encre";
import { dailyPhase, type DailyBoard, type DailyHistoryEntry, type DailyInfo, type DailyQuestion, type DailyReviewItem } from "@/lib/daily";

type Props = {
  info: DailyInfo;
  board: DailyBoard | null;
  history: DailyHistoryEntry[];
  /** ma correction, si ma copie est rendue */
  review: DailyReviewItem[];
  nowIso: string;
  /** la série d'encre (chiffre-héros de la porte des 5 du jour) ; absente : les jours d'affilée */
  serie?: SerieDuJour | null;
  /** aperçu : la copie en cours avec des questions d'exemple, aucune requête */
  demo?: {
    questions: DailyQuestion[];
    answered: Record<number, number>;
    secondsLeft: number;
  };
};

// /defi et /defi/cinq : le défi du jour selon ma copie.
//   en cours : la copie seule, dans la colonne des séances, sans en-tête (rien d'autre ne bouge) ;
//   à faire, rendue ou indisponible : l'accueil sur le modèle des sous-pages (DefiAccueil) :
//   le départ ou ma copie, le classement du jour (ou ma série), puis les jours passés.
export function DefiToday({ info, board, history, review, nowIso, serie = null, demo }: Props) {
  const phase = dailyPhase(info);
  const [run, setRun] = useState(phase === "playing");

  if (phase === "playing" || (run && phase === "todo")) {
    return (
      <ColonneSeance>
        <DefiRunner
          day={info.day}
          today={info.today}
          questionCount={info.questionCount}
          timeLimitSeconds={info.timeLimitSeconds}
          format={info.format}
          demo={demo}
        />
      </ColonneSeance>
    );
  }

  return <DefiAccueil info={info} board={board} history={history} review={review} nowIso={nowIso} serie={serie} onStart={() => setRun(true)} />;
}
