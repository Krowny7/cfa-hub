"use client";

import { useState } from "react";
import { Hourglass, Square } from "lucide-react";
import { CarteQuestion, etiquettesDe, type Repondre } from "@/components/salles/CarteQuestion";
import { ClassementDirect } from "@/components/salles/ClassementDirect";
import type { RetourRound } from "@/components/salles/ActionsRound";
import { ClassementSerie } from "@/components/salles/ClassementSerie";
import { useConfirmation } from "@/components/salles/Confirmation";
import { FinPartie } from "@/components/salles/FinPartie";
import { TetePanneau } from "@/components/salles/Stage";
import { clockDe, horlogeSession, pointsAu } from "@/lib/salles/logique";
import {
  chiffreDecompte,
  correctionVue,
  enUrgence,
  fractionTemps,
  libelleSession,
  reponseVue,
  secondesAffichees,
  titreSession,
  totalPoints,
  type MoiPourClassement,
  type ReponseOk,
} from "@/lib/salles/partie";
import type { SalleClassementLigne, SalleCorrection, SalleItem, SalleMaReponse, SalleSerie, SalleSession } from "@/lib/salles/types";
import { CONFIRMATION, PARTIE, SALLES } from "@/lib/voice-salles";
import s from "./Salles.module.css";
import p from "./Partie.module.css";

// L'écran de partie, en présentation pure : à l'heure `t` (celle du serveur,
// en ms) et d'après l'état lu, il montre
//   - le décompte (le gros chiffre qui bat, 3-2-1 sur la fin),
//   - la question en cours (barre de temps qui se vide, 4 choix ou champ de
//     calcul, verdict dès que j'ai répondu) puis sa correction pendant la
//     pause, avec le classement en direct à côté,
//   - la fin de partie (podium, bilan, rejouer).
// Aucun accès réseau ni horloge ici : PartieSalle (branché) fournit `t`,
// l'état et `repondre` ; les aperçus (app/preview-da/salles) et le test de
// rendu (scripts/salles/test-partie.tsx) fournissent les leurs.

export type PropsVuePartie = {
  session: SalleSession;
  items: SalleItem[];
  corrections: SalleCorrection[];
  mesReponses: SalleMaReponse[];
  /** les réponses que le serveur vient de me rendre (plus fraîches que l'état lu) */
  locales: Record<number, ReponseOk | undefined>;
  classement: SalleClassementLigne[];
  monClassement: { rang: number; points: number; bonnes: number; repondues: number; tempsMs: number } | null;
  moi: MoiPourClassement;
  estAdmin: boolean;
  /** l'heure du serveur, en ms */
  t: number;
  repondre: (position: number, rep: Parameters<Repondre>[0]) => ReturnType<Repondre>;
  onArreter?: () => Promise<void>;
  onRejouer?: () => Promise<{ ok: boolean; erreur?: string }>;
  onRetour?: () => void;
  serie?: SalleSerie | null;
  onLancerRound?: () => Promise<RetourRound>;
  onTerminerSerie?: () => Promise<RetourRound>;
  /** entre deux rounds : le jeu de la salle d'attente */
  jeu?: React.ReactNode;
};

/** « Arrêter la partie » (admin), avec confirmation : la correction s'ouvre, les points marqués restent. */
export function BoutonArreter({ onArreter }: { onArreter: () => Promise<void> }) {
  const [arret, setArret] = useState(false);
  const { demander, dialogue } = useConfirmation();
  return (
    <>
    {dialogue}
    <button
      type="button"
      className={[s.btn, s.btnDiscret, s.btnDanger].join(" ")}
      disabled={arret}
      onClick={async () => {
        if (!(await demander({ titre: CONFIRMATION.arreterTitre, texte: SALLES.arreterConfirme, confirmer: SALLES.arreter, danger: true }))) return;
        setArret(true);
        try {
          await onArreter();
        } finally {
          setArret(false);
        }
      }}
    >
      <Square size={14} aria-hidden /> {SALLES.arreter}
    </button>
    </>
  );
}

/** Pendant le décompte d'un round : le classement général d'avant lui, pour qui aurait manqué les résultats. */
export function ClassementAvantRound({ serie, moiId }: { serie: SalleSerie | null | undefined; moiId: string }) {
  if (!serie || serie.round <= 1 || serie.classement.length === 0) return null;
  return <ClassementSerie key={`${serie.id}:avant:${serie.round}`} serie={{ ...serie, round: serie.round - 1, finie: false }} moiId={moiId} />;
}

function Decompte({ session, avantMs, onArreter, serie, moiId }: { session: SalleSession; avantMs: number; onArreter?: () => Promise<void>; serie?: SalleSerie | null; moiId: string }) {
  const secondes = secondesAffichees(avantMs);
  const fin = chiffreDecompte(avantMs) !== null;
  return (
    <div className={p.fin}>
    <section className={s.panneau} aria-label={PARTIE.decompteTitre}>
      <TetePanneau icone={<Hourglass size={16} />} droite={<span className={s.compte}>{session.nb} questions</span>}>
        {titreSession(session)}
      </TetePanneau>
      <div className={p.decompte}>
        <p className={p.decompteTitre}>{(session.params.round ?? 1) > 1 ? PARTIE.decompteRound(session.params.round ?? 1) : PARTIE.decompteTitre}</p>
        {/* la clé relance l'animation à chaque seconde */}
        <p key={secondes} className={p.decompteChiffre} data-fin={fin ? "1" : "0"} aria-live="off">
          {secondes}
        </p>
        <p className={p.decompteParams}>{libelleSession(session)}</p>
        <p className={p.decompteRegle}>{PARTIE.decompteRegle}</p>
        {/* un round lancé a déjà sorti ses questions : l'arrêter ici le perdrait sans qu'il soit joué */}
        {onArreter && !session.params.rounds && <BoutonArreter onArreter={onArreter} />}
      </div>
    </section>
    <ClassementAvantRound serie={serie} moiId={moiId} />
    </div>
  );
}

export function VuePartie(props: PropsVuePartie) {
  const { session, items, corrections, mesReponses, locales, classement, monClassement, moi, estAdmin, t, repondre, onArreter, onRejouer, onRetour, serie, onLancerRound, onTerminerSerie, jeu } = props;
  const clock = clockDe(session);
  const h = horlogeSession(clock, t);

  if (h.phase === "fin" || session.statut === "terminee") {
    // le dernier round : on attend le classement général avant d'ouvrir le rideau de toute la partie
    if (serie?.finie && serie.classement.length === 0 && session.statut !== "terminee") {
      return (
        <section className={s.panneau} aria-label={PARTIE.synchro}>
          <div className={p.synchro} role="status">
            <span className={s.barres} aria-hidden>
              <i />
              <i />
              <i />
            </span>
            <span>{PARTIE.synchro}</span>
          </div>
        </section>
      );
    }
    return <FinPartie session={session} items={items} corrections={corrections} mesReponses={mesReponses} classement={classement} monClassement={monClassement} moiId={moi.userId} estAdmin={estAdmin} onRejouer={onRejouer} onRetour={onRetour} serie={serie} onLancerRound={onLancerRound} onTerminerSerie={onTerminerSerie} jeu={jeu} />;
  }
  if (h.phase === "decompte") return <Decompte session={session} avantMs={h.avantProchainMs ?? 0} onArreter={onArreter} serie={serie} moiId={moi.userId} />;

  const index = h.index;
  const ouverte = h.phase === "question";
  const item = items.find((i) => i.position === index) ?? null;
  const reponse = reponseVue(index, locales, mesReponses);
  const correction = ouverte ? null : correctionVue(index, corrections, locales);
  const restantMs = ouverte ? h.restantMs : 0;
  const urgence = ouverte && enUrgence(restantMs);
  const derniere = index >= session.nb - 1;
  const etiquettes = etiquettesDe(item);
  const mesPoints = totalPoints(session.nb, locales, mesReponses);
  const vautMaintenant = ouverte && !reponse ? pointsAu(clock, index, t) : null;

  return (
    <div className={p.ecran}>
      <div className={p.grille}>
        <div className={p.principal}>
          <section className={s.panneau} aria-labelledby="partie-question">
            <div className={p.tete}>
              <div>
                <h2 id="partie-question" className={p.numero}>
                  {PARTIE.question} <b>{index + 1}</b> {PARTIE.sur(session.nb)}
                  {session.params.rounds && session.params.round ? ` · ${PARTIE.roundCourt(session.params.round, session.params.rounds)}` : ""}
                </h2>
                {etiquettes.length > 0 && (
                  <div className={p.etiquettes}>
                    {etiquettes.map((e, i) => (
                      <span key={i} className={[s.etiquette, e.metal ? s.etiquetteMetal : ""].filter(Boolean).join(" ")}>
                        {e.texte}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className={[p.chrono, urgence ? p.chronoUrgence : "", ouverte ? "" : p.chronoPause].filter(Boolean).join(" ")}>
                <span className={p.chronoNombre} role="timer" aria-label={`${PARTIE.tempsRestant} : ${secondesAffichees(restantMs)} s`}>
                  {secondesAffichees(restantMs)}
                </span>
                <span className={p.chronoLegende}>{ouverte ? PARTIE.tempsRestant : PARTIE.verdictSans}</span>
              </div>
            </div>
            <div className={[p.piste, urgence ? p.pisteUrgence : "", ouverte ? "" : p.pistePause].filter(Boolean).join(" ")} aria-hidden>
              <i style={{ transform: `scaleX(${fractionTemps(restantMs, session.temps)})` }} />
            </div>

            <CarteQuestion
              key={index}
              item={item}
              ouverte={ouverte}
              reponse={reponse}
              correction={correction}
              repondre={(rep) => repondre(index, rep)}
              repondus={{ n: session.reponduCourante, total: session.nbJoueurs }}
            />

            <div className={p.pied}>
              <span className={p.suivante}>
                {ouverte ? (
                  vautMaintenant !== null ? (
                    <>
                      {PARTIE.vaut} <b>{vautMaintenant.toLocaleString("fr-FR")}</b> {PARTIE.points}
                    </>
                  ) : (
                    ""
                  )
                ) : (
                  <>
                    {derniere ? PARTIE.resultats : PARTIE.suivante} <b>{PARTIE.secondes(secondesAffichees(h.avantProchainMs ?? 0))}</b>
                  </>
                )}
              </span>
              {onArreter && <BoutonArreter onArreter={onArreter} />}
            </div>
          </section>
        </div>

        <div className={p.cote}>
          <ClassementDirect classement={classement} monClassement={monClassement} moi={moi} mesPoints={mesPoints} nbFermees={h.nbFermees} nb={session.nb} />
        </div>
      </div>
    </div>
  );
}
