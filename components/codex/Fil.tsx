"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { BUDGETS } from "@/lib/codex/reglage";
import { TEXTES_JOUR as T, faitAvancer, teteFil, xpEtape } from "@/lib/codex/aujourdhui";
import { AvecMots } from "@/components/ui/Mot";
import type { GainSeance, VueSeance } from "@/lib/codex/seance";
import type { VueCodex } from "@/lib/codex/vue";
import { FinDeSeance, ListeGains, TEXTES_SEANCE, useSeanceDuJour } from "@/components/codex/SeanceDuJour";
import s from "./Aujourdhui.module.css";

// Le fil de /codex (Codex simplifié, §2 et §3.3) : la séance du jour en
// étapes (le segment porte déjà « Aujourd'hui » : le titre n'est que lu).
// Une étape faite tient sur une ligne cochée ; l'étape en cours montre sa raison, « +XP » si elle remplit une
// quête du jour, au plus une mention « fait avancer », LE bouton et « Une
// autre idée ? » ; les étapes à venir tiennent sur une ligne, sans bouton.
// Une seule puce « 30 min ▾ » déplie le temps (15, 30, 60, 90). `plein` faux :
// le bouton passe en contour, un autre bouton plein tient l'écran (« Tout
// récupérer »). `demo` : aperçus, aucune action serveur.

export function Fil({ seance: depart, vue, gains, plein, demo = false }: { seance: VueSeance; vue: Pick<VueCodex, "contrats" | "branches" | "sobre">; gains: GainSeance[]; plein: boolean; demo?: boolean }) {
  const { seance, message, occupe, etape, suivant, rang, total, encore, commencer, choisirBudget, autre, finir } = useSeanceDuJour(depart, demo);
  const [temps, setTemps] = useState(false);
  const bouton = `btn ${plein ? "btn-primary" : "btn-secondary"} rl-press min-h-[44px] w-full sm:w-fit`;
  const enCours = etape === "proposee" || etape === "enCours" ? suivant : null;

  return (
    <section aria-labelledby="fil-titre" data-leonard="seance" className={`card ${s.fil}`}>
      <div className={s.filTete}>
        <div className="min-w-0">
          <h2 id="fil-titre" className="sr-only">
            {T.titre}
          </h2>
          <p className="t-small m-0 font-semibold">{etape === "close" ? TEXTES_SEANCE.close : teteFil(seance)}</p>
        </div>
        {etape !== "close" && (
          <div className={s.budget}>
            <button type="button" className={s.puce} aria-expanded={temps} aria-controls="fil-temps" aria-label={`${T.budget} : ${seance.budget} minutes`} onClick={() => setTemps((x) => !x)}>
              {T.budgetPuce(seance.budget)} <ChevronDown size={14} aria-hidden />
            </button>
            {temps && (
              <div id="fil-temps" className={s.budgetChoix} role="group" aria-label={T.budget}>
                {BUDGETS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    aria-pressed={seance.budget === b}
                    aria-label={`${b} minutes`}
                    disabled={occupe}
                    onClick={() => {
                      setTemps(false);
                      choisirBudget(b);
                    }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ol className={s.etapes}>
        {seance.blocs.map((b, i) => {
          const fait = seance.faits.includes(b.genre);
          if (fait) {
            return (
              <li key={b.genre} className={`${s.etape} ${s.faite}`}>
                <span className={s.rang} aria-hidden>
                  <Check size={14} strokeWidth={3} />
                </span>
                <p className={s.etapeNom}>
                  <AvecMots texte={b.titre} /> <span className={s.duree}>{b.duree} min</span>
                  <span className="sr-only">, fait</span>
                </p>
              </li>
            );
          }
          if (b.genre !== enCours?.genre) {
            return (
              <li key={b.genre} className={s.etape}>
                <span className={s.rang} aria-hidden>
                  {i + 1}
                </span>
                <p className={s.etapeNom}>
                  <AvecMots texte={b.titre} /> <span className={s.duree}>{b.duree} min</span>
                </p>
              </li>
            );
          }
          const xp = vue.sobre ? 0 : xpEtape(b, vue.contrats);
          const avance = faitAvancer(b, vue.branches);
          return (
            <li key={b.genre} className={`${s.etape} ${s.enCours}`} aria-current="step">
              <span className={s.rang} aria-hidden>
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                <p className={s.etapeNom}>
                  <AvecMots texte={b.titre} /> <span className={s.duree}>{b.duree} min</span>
                </p>
                {b.raison && <p className="t-small m-0">{b.raison}</p>}
                {(xp > 0 || avance) && (
                  <p className={s.etiquettes}>
                    {xp > 0 && <span className={s.etiquette}>+{xp} XP</span>}
                    {avance && <span className="t-micro">{avance}</span>}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {etape === "proposee" ? (
                    <button type="button" className={bouton} disabled={occupe} onClick={commencer}>
                      {TEXTES_SEANCE.commencer} <ArrowRight size={16} aria-hidden />
                    </button>
                  ) : (
                    <Link href={b.destination.href} className={bouton}>
                      {TEXTES_SEANCE.continuer(rang, total)} <ArrowRight size={16} aria-hidden />
                    </Link>
                  )}
                  <button type="button" className={s.lien} disabled={occupe} onClick={() => autre(b.genre)}>
                    {T.autre}
                  </button>
                  {etape === "enCours" && (
                    <button type="button" className={s.lien} disabled={occupe} onClick={finir}>
                      {TEXTES_SEANCE.arreter}
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {message && (
        <p role="status" className="t-small m-0">
          {message}
        </p>
      )}
      {etape === "tenue" && <FinDeSeance gains={gains} lanceeLe={seance.lanceeLe} demo={demo} occupe={occupe} plein={plein} onAssez={finir} onEncore={encore ? () => choisirBudget(encore) : null} />}
      {etape === "close" && gains.length > 0 && <ListeGains gains={gains} />}
    </section>
  );
}

/** Le fil d'un compte neuf : une seule étape, « 10 questions pour faire connaissance · 5 min ». */
export function FilNeuf({ plein }: { plein: boolean }) {
  return (
    <section aria-labelledby="fil-titre" className={`card ${s.fil}`}>
      <h2 id="fil-titre" className="sr-only">
        {T.titre}
      </h2>
      <ol className={s.etapes}>
        <li className={`${s.etape} ${s.enCours}`} aria-current="step">
          <span className={s.rang} aria-hidden>
            1
          </span>
          <div className="flex min-w-0 flex-col gap-2">
            <p className={s.etapeNom}>
              {T.neuf.titre} <span className={s.duree}>{T.neuf.duree} min</span>
            </p>
            <p className="t-small m-0">{T.neuf.raison}</p>
            <Link href={T.neuf.href} className={`btn ${plein ? "btn-primary" : "btn-secondary"} rl-press min-h-[44px] w-full sm:w-fit`}>
              {TEXTES_SEANCE.commencer} <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </li>
      </ol>
    </section>
  );
}
