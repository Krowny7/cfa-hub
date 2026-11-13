"use client";

import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { CeremonieSansFaute } from "@/components/adn/CeremonieSansFaute";
import { GoutteVerdict } from "@/components/adn/GoutteVerdict";
import { SignalLeonard } from "@/components/leonard/SignalLeonard";
import { CeremonieSceaux } from "@/components/profil/CeremonieSceaux";
import { SceauDefi } from "@/components/defi/SceauDefi";
import { DefiCalendrier, Entoure, PodiumDuJour, historiqueTronque, joursAffilee, resteAvant } from "@/components/defi/DefiCalendrier";
import type { SerieDuJour } from "@/lib/serie-encre";
import { ActionEncre, EnTeteSousPage, Scene, SousPage } from "@/components/ui/SousPage";
import { dailyPhase, dayHref, reviewHref, type DailyBoard, type DailyHistoryEntry, type DailyInfo, type DailyReviewItem } from "@/lib/daily";
import { nombre, pctScore } from "@/lib/voice";
import { DEPART } from "@/lib/voice-epreuves";
import { CALENDRIER as C } from "@/lib/voice-entrainement-b";
import { RETOUR_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";
import { rangOrdinal, verdictCopie, voixDefi } from "@/lib/voice-z2c";
import css from "./DefiCalendrier.module.css";

// L'accueil des deux défis du jour (/defi : les 30 ; /defi/cinq : les 5), direction « le lieu, puis
// l'objet » (2026-11-13) : la porte (la peinture de la carte des 30 du jour, le chiffre-héros vrai :
// les jours d'affilée, ou la série d'encre des 5), puis UN objet, le calendrier du mois
// (DefiCalendrier) : la feuille du jour avec la date entourée, « SE FIGE DANS n H », l'état et la
// seule action à l'encre (commencer, ou revoir sa copie), le podium du jour ; à côté, le mois, chaque
// jour passé avec son score et le tampon TENU d'un sans-faute (un clic ouvre ce jour : la copie et
// son classement). Plus de bande noire ni de colonne grise. La copie rendue, le sceau du jour se
// tamponne sur la feuille (SceauDefi, une fois) et la case du jour mène au jour (la copie, le temps,
// l'écart au premier). Une seule étiquette rouge : « SE FIGE DANS n H », sur la feuille ; la série
// d'encre des 5 est dans la légende du chiffre-héros. La copie en cours, elle, reste plein écran
// (DefiRunner, sans en-tête).

type Props = {
  info: DailyInfo;
  board: DailyBoard | null;
  history: DailyHistoryEntry[];
  review: DailyReviewItem[];
  nowIso: string;
  /** la série d'encre (les 5 du jour) ; null : illisible, le chiffre-héros prend les jours d'affilée */
  serie: SerieDuJour | null;
  onStart: () => void;
};

const heureFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

export function DefiAccueil({ info, board, history, review, nowIso, serie, onStart }: Props) {
  const DEFI = voixDefi(info.format);
  const phase = dailyPhase(info);
  const cinq = info.format === "cinq";
  const n = info.questionCount;
  const minutes = Math.round(info.timeLimitSeconds / 60);
  const me = info.me;
  const fait = phase === "done" && !!me;
  const total = me?.total ?? n;
  const score = me?.score ?? review.filter((r) => r.isCorrect).length;
  const erreurs = review.length > 0 ? review.filter((r) => !r.isCorrect).length : Math.max(0, total - score);
  const sansFaute = fait && total > 0 && score === total;
  const reste = info.isToday ? resteAvant(info.closesAt, nowIso) : null;

  const parJour = useMemo(() => new Map(history.map((e) => [e.day, e])), [history]);
  // l'historique tronqué au plafond de la base : une série qui en touche le bout s'écrit « 120+ »
  const { jours: affilee, borne } = joursAffilee(info.today, parJour, fait, historiqueTronque(history));
  const heros =
    cinq && serie
      ? serie.jours > 0
        ? { valeur: nombre(serie.jours), legende: C.encre(serie.jours, serie.fait ? 0 : serie.reste) }
        : null
      : affilee > 0
        ? { valeur: `${nombre(affilee)}${borne ? "+" : ""}`, legende: C.affilee(affilee) }
        : null;

  const jj = Number(info.day.slice(8, 10));
  const lundi0 = (new Date(info.day + "T12:00:00Z").getUTCDay() + 6) % 7;
  const joueurs = Math.max(board?.players ?? info.players, fait ? 1 : 0);

  const feuille = (idCercle: string) => (
    <div className={css.feuille} aria-label={C.aujourdhui}>
      {fait && (
        <GoutteVerdict
          cle={`defi:${info.format}:${info.day}`}
          rendueA={me?.finishedAt ?? null}
          mot={verdictCopie(score, total)}
          score={`${score}/${total}`}
          detail={pctScore(score, total) ?? undefined}
          fond="#f3ecdc"
        />
      )}
      <p className={css.feuilleHaut}>
        <span>{fait && me?.finishedAt ? C.rendueA(heureFmt.format(new Date(me.finishedAt))) : C.aujourdhui}</span>
        <span>{C.jourLong(lundi0)}</span>
      </p>
      <div className={css.dateLigne}>
        <p className={css.date}>
          <b>{jj}</b>
          <Entoure id={idCercle} />
        </p>
        {fait && <SceauDefi day={info.day} taille={72} angle={-6} className={css.sceau} />}
      </div>
      {reste && phase !== "unavailable" && !fait && (
        <p className={css.enjeu}>
          <i aria-hidden />
          {C.seFige(reste)}
        </p>
      )}

      {fait ? (
        <>
          <p className={css.etiquette}>{C.taCopie}</p>
          <p className={css.copie}>
            <b>
              {nombre(score)}
              <i>/{nombre(total)}</i>
            </b>
            {me && me.rank !== null && <span>{C.rang(rangOrdinal(me.rank), joueurs)}</span>}
            {sansFaute && <span className={css.tenuGrand}>{C.sansFaute}</span>}
          </p>
          <div className={css.action}>
            <ActionEncre href={reviewHref(info.day, undefined, info.format)}>
              {C.revoir}
              {erreurs > 0 ? ` · ${C.ratures(erreurs)}` : ""} <ArrowRight size={16} aria-hidden />
            </ActionEncre>
          </div>
        </>
      ) : phase === "todo" ? (
        <>
          <p className={css.etat}>{C.copies(info.players, info.topScore, n)}</p>
          <div className={css.action}>
            <ActionEncre onClick={onStart} autoFocus>
              {cinq ? DEPART.cinq.lancer : DEFI.commencer} <ArrowRight size={16} aria-hidden />
            </ActionEncre>
          </div>
        </>
      ) : (
        <p className={css.texte}>
          <b>{DEFI.aucunTitre}</b>
          {DEFI.unavailable}
        </p>
      )}
      {info.exists && <PodiumDuJour board={board} n={n} lien={fait ? dayHref(info.day, info.format) : null} />}
    </div>
  );

  return (
    <>
      {fait && info.isToday && (
        <>
          <SignalLeonard
            evt={score / Math.max(total, 1) >= 0.7 ? "defi-reussi" : "defi-rate"}
            vars={{ score: `${score}/${total}`, pct: `${Math.round((score / Math.max(total, 1)) * 100)} %` }}
            cle={"defi:" + info.day}
            delai={1800}
          />
          <CeremonieSansFaute score={score} total={total} epreuve={cinq ? "Les 5 du jour" : "Défi du jour"} cle={`defi:${info.format}:${info.day}`} rendueA={me?.finishedAt ?? null} />
        </>
      )}
      <SousPage
        entete={
          <EnTeteSousPage
            retour={RETOUR_ENTRAINEMENT}
            titre={DEFI.title}
            ligne={C.ligne(n, minutes, cinq)}
            illustration={{ nom: "accueil-trente-du-jour", position: "50% 44%" }}
            heros={heros}
          />
        }
      >
        <Scene>
          <DefiCalendrier today={info.today} histoire={history} aujourdhui={{ score: fait ? score : null, total }} format={info.format} nowIso={nowIso} feuille={feuille} />
        </Scene>
        {fait && info.isToday && <CeremonieSceaux className="!max-w-none" />}
      </SousPage>
    </>
  );
}
