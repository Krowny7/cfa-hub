"use client";

import { DefiResult } from "@/components/defi/DefiResult";
import { DefiHistory, Ticks } from "@/components/defi/parts";
import { ChiffreSerie, DepartZone, type SerieDuJour } from "@/components/epreuves/DepartZone";
import { ListeCourte, type Ligne } from "@/components/ui/Decors";
import { CadreAnnexe, CadreZones, EnTeteSousPage, SousPage, type Zone } from "@/components/ui/SousPage";
import { dailyPhase, dayLabel, timeLeftLabel, type DailyBoard, type DailyHistoryEntry, type DailyInfo, type DailyReviewItem } from "@/lib/daily";
import { DEPART } from "@/lib/voice-epreuves";
import { RETOUR_ENTRAINEMENT, SOUS_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";
import { rangOrdinal, voixDefi } from "@/lib/voice-z2c";

// L'accueil des deux défis du jour (/defi : les 30 ; /defi/cinq : les 5), sur le modèle des
// sous-pages validé par Théo (2026-11-12) : l'en-tête commun (retour à S'entraîner, la peinture du
// lieu à droite), puis le cadre à zones : le défi du jour à gauche (le départ, ou ta copie rendue),
// et dans la colonne grise le classement du jour (les 30), une seule fois, ou ta série d'encre (les
// 5). Dessous, la seule annexe : les jours passés (on n'y revoit ses copies que là). La copie en
// cours, elle, reste plein écran (DefiRunner, sans en-tête).

const S = SOUS_ENTRAINEMENT.defi;

type Props = {
  info: DailyInfo;
  board: DailyBoard | null;
  history: DailyHistoryEntry[];
  review: DailyReviewItem[];
  nowIso: string;
  /** la série d'encre (les 5 du jour) ; null : illisible, la colonne grise ne s'affiche pas */
  serie: SerieDuJour | null;
  onStart: () => void;
};

/** Le classement du jour en courte liste : les premiers, et ma ligne si je suis plus bas. */
function lignesClassement(board: DailyBoard | null, n: number): Ligne[] {
  const rows = board?.rows ?? [];
  const me = board?.me ?? null;
  const tete = me && !rows.slice(0, 5).some((r) => r.isMe) ? [...rows.slice(0, 4), me] : rows.slice(0, 5);
  return tete.map((r) => ({
    cle: r.userId,
    titre: `${rangOrdinal(r.rank)} · ${r.isMe ? S.toi : r.username ?? "Joueur"}`,
    detail: `${r.score}/${r.total || n}`,
    marque: r.isMe,
  }));
}

export function DefiAccueil({ info, board, history, review, nowIso, serie, onStart }: Props) {
  const DEFI = voixDefi(info.format);
  const phase = dailyPhase(info);
  const cinq = info.format === "cinq";
  const n = info.questionCount;
  const minutes = Math.round(info.timeLimitSeconds / 60);
  const left = timeLeftLabel(info.closesAt, nowIso);

  const essentiel =
    phase === "done" ? (
      <DefiResult info={info} review={review} board={board} />
    ) : phase === "todo" ? (
      <DepartZone
        ligne={info.players > 0 ? DEFI.rendues(info.players, info.topScore, n) : DEFI.format(n, minutes)}
        traits={<Ticks marks={Array.from({ length: n }, () => "todo" as const)} label={DEFI.aTracer(n)} />}
        regles={DEFI.rules(n, minutes)}
        action={cinq ? DEPART.cinq.lancer : DEFI.commencer}
        onStart={onStart}
        pied={DEFI.ouvert(left)}
      />
    ) : (
      <div className="grid gap-2">
        <p className="m-0 text-[20px] font-bold leading-tight">{DEFI.aucunTitre}</p>
        <p className="t-body m-0 max-w-[480px] text-muted">{DEFI.unavailable}</p>
      </div>
    );

  const droite: Zone | undefined = cinq
    ? serie
      ? { titre: S.serie, contenu: <ChiffreSerie serie={serie} /> }
      : undefined
    : info.exists
      ? { titre: S.classement, contenu: <ListeCourte lignes={lignesClassement(board, n)} vide={DEFI.boardEmpty} /> }
      : undefined;

  return (
    <SousPage
      entete={
        <EnTeteSousPage
          retour={RETOUR_ENTRAINEMENT}
          titre={info.isToday ? DEFI.title : DEFI.titleDay(dayLabel(info.day, "day", info.today))}
          ligne={DEFI.kicker(dayLabel(info.day, "long", info.today))}
          illustration={cinq ? { nom: "cinq-depart", position: "18% 22%" } : { nom: "defi-pupitre", position: "85% 40%" }}
        />
      }
    >
      <CadreZones gauche={{ titre: S.jour, contenu: essentiel }} droite={droite} />
      <CadreAnnexe titre={S.joursPasses}>
        <DefiHistory entries={history} today={info.today} nowIso={nowIso} visible={cinq ? 3 : 6} format={info.format} entete={false} />
      </CadreAnnexe>
    </SousPage>
  );
}
