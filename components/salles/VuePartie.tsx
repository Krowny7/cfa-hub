"use client";

import { useState } from "react";
import { Square } from "lucide-react";
import { CarteQuestion, etiquettesDe, type Repondre } from "@/components/salles/CarteQuestion";
import { ClassementDirect } from "@/components/salles/ClassementDirect";
import { FinPartie } from "@/components/salles/FinPartie";
import { clockDe, horlogeSession, libelleParams, pointsAu } from "@/lib/salles/logique";
import {
  chiffreDecompte,
  correctionVue,
  enUrgence,
  fractionTemps,
  reponseVue,
  secondesAffichees,
  totalPoints,
  type MoiPourClassement,
  type ReponseOk,
} from "@/lib/salles/partie";
import type { SalleClassementLigne, SalleCorrection, SalleItem, SalleMaReponse, SalleSession } from "@/lib/salles/types";
import { PARTIE, SALLES } from "@/lib/voice-salles";
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
};

/** « Arrêter la partie » (admin), avec confirmation : la correction s'ouvre, les points marqués restent. */
function BoutonArreter({ onArreter }: { onArreter: () => Promise<void> }) {
  const [arret, setArret] = useState(false);
  return (
    <button
      type="button"
      className={[s.btn, s.btnDiscret, s.btnDanger].join(" ")}
      disabled={arret}
      onClick={async () => {
        if (!window.confirm(SALLES.arreterConfirme)) return;
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
  );
}

function Decompte({ session, avantMs, onArreter }: { session: SalleSession; avantMs: number; onArreter?: () => Promise<void> }) {
  const secondes = secondesAffichees(avantMs);
  const fin = chiffreDecompte(avantMs) !== null;
  return (
    <section className={s.panneau} aria-label={PARTIE.decompteTitre}>
      <div className={s.panneauTete}>
        <h2 className={s.titrePanneau}>{SALLES.partieTitre(session.numero)}</h2>
        <span className={s.compte}>{session.nb} questions</span>
      </div>
      <div className={p.decompte}>
        <p className={p.decompteTitre}>{PARTIE.decompteTitre}</p>
        {/* la clé relance l'animation à chaque seconde */}
        <p key={secondes} className={p.decompteChiffre} data-fin={fin ? "1" : "0"} aria-live="off">
          {secondes}
        </p>
        <p className={p.decompteParams}>{libelleParams(session.params)}</p>
        <p className={p.decompteRegle}>{PARTIE.decompteRegle}</p>
        {onArreter && <BoutonArreter onArreter={onArreter} />}
      </div>
    </section>
  );
}

export function VuePartie(props: PropsVuePartie) {
  const { session, items, corrections, mesReponses, locales, classement, monClassement, moi, estAdmin, t, repondre, onArreter, onRejouer, onRetour } = props;
  const clock = clockDe(session);
  const h = horlogeSession(clock, t);

  if (h.phase === "fin" || session.statut === "terminee") {
    return <FinPartie session={session} items={items} corrections={corrections} mesReponses={mesReponses} classement={classement} monClassement={monClassement} moiId={moi.userId} estAdmin={estAdmin} onRejouer={onRejouer} onRetour={onRetour} />;
  }
  if (h.phase === "decompte") return <Decompte session={session} avantMs={h.avantProchainMs ?? 0} onArreter={onArreter} />;

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
