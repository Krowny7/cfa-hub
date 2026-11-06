"use client";

import { MarqueQuestion } from "@/components/MarqueQuestion";
import { memo, useState } from "react";
import { ArrowRight, Check, ListChecks, Minus, X } from "lucide-react";
import { etiquettesDe } from "@/components/salles/CarteQuestion";
import { Enonce } from "@/components/salles/Enonce";
import { TetePanneau } from "@/components/salles/Stage";
import { decimalsOf, formatCalc } from "@/lib/calc/engine";
import type { CalcUnit } from "@/lib/calc/types";
import { debriefExamen, type LigneDebrief } from "@/lib/salles/examen";
import type { SalleCorrection, SalleItem, SalleMaReponse } from "@/lib/salles/types";
import { EXAMEN } from "@/lib/voice-salles";
import s from "./Salles.module.css";
import x from "./Examen.module.css";

// Le débrief d'une partie au chrono global, comme la revue des 30 du jour :
// un résumé (x / nb justes, faux, sans réponse, une case par question qui mène
// à la question), un filtre « Mes erreurs » / « Tout », puis chaque question
// avec mon choix, la bonne réponse, juste / faux et l'explication (ouverte sur
// une erreur, à la demande sur une bonne réponse). Les corrections arrivent
// toutes à la fin du chrono ; tant qu'il en manque, on le dit.

type Filtre = "erreurs" | "tout";
const LETTRES = ["A", "B", "C", "D", "E", "F"];
const lettre = (i: number) => LETTRES[i] ?? String(i + 1);
const ancre = (position: number) => `examen-q-${position + 1}`;

function DebriefExamenBase({ nb, items, corrections, mesReponses }: { nb: number; items: SalleItem[]; corrections: SalleCorrection[]; mesReponses: SalleMaReponse[] }) {
  const d = debriefExamen(nb, items, corrections, mesReponses);
  const erreurs = d.lignes.filter((l) => l.verdict !== "juste");
  const [choisi, setFiltre] = useState<Filtre | null>(null);
  const filtre: Filtre = choisi ?? (erreurs.length > 0 ? "erreurs" : "tout");
  const lignes = filtre === "tout" ? d.lignes : erreurs;

  function allerA(position: number) {
    const cible = d.lignes.find((l) => l.position === position);
    if (!cible) return;
    if (filtre === "erreurs" && cible.verdict === "juste") setFiltre("tout");
    requestAnimationFrame(() => {
      const el = document.getElementById(ancre(position));
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      el?.focus({ preventScroll: true });
    });
  }

  return (
    <section className={s.panneau} aria-labelledby="examen-debrief">
      <TetePanneau id="examen-debrief" icone={<ListChecks size={16} />} droite={<span className={s.compte}>{EXAMEN.debriefKicker}</span>}>
        {EXAMEN.debriefTitre}
      </TetePanneau>

      <div className={x.resume}>
        <p className={x.resumeScore}>
          {d.justes}
          <small>
            {" "}
            / {d.nb} {EXAMEN.debriefJustes}
          </small>
        </p>
        <p className={x.resumeDetail}>{EXAMEN.debriefDetail(d.faux, d.sans)}</p>
      </div>

      <ol className={x.serie} aria-label={EXAMEN.debriefSerie}>
        {Array.from({ length: d.nb }, (_, pos) => {
          const l = d.lignes.find((y) => y.position === pos);
          const v = l?.verdict ?? "sans";
          return (
            <li key={pos}>
              <button
                type="button"
                className={x.serieCase}
                data-v={v}
                aria-label={`${pos + 1} · ${v === "juste" ? EXAMEN.juste : v === "faux" ? EXAMEN.faux : EXAMEN.sans}`}
                title={`${pos + 1} · ${v === "juste" ? EXAMEN.juste : v === "faux" ? EXAMEN.faux : EXAMEN.sans}`}
                onClick={() => allerA(pos)}
              >
                {v === "juste" ? <Check size={11} strokeWidth={3} aria-hidden /> : v === "faux" ? <X size={11} strokeWidth={3} aria-hidden /> : null}
              </button>
            </li>
          );
        })}
      </ol>

      {!d.complet && (
        <p className={x.attente} role="status">
          <span className={s.barres} aria-hidden>
            <i />
            <i />
            <i />
          </span>
          {EXAMEN.debriefAttente}
        </p>
      )}

      <div className={x.filtres} role="group" aria-label={EXAMEN.filtreAria}>
        {(
          [
            ["erreurs", EXAMEN.filtreErreurs, erreurs.length],
            ["tout", EXAMEN.filtreTout, d.lignes.length],
          ] as const
        ).map(([cle, libelle, n]) => (
          <button key={cle} type="button" className={x.filtre} aria-pressed={filtre === cle} onClick={() => setFiltre(cle)}>
            {libelle} <span className={x.filtreN}>{n}</span>
          </button>
        ))}
      </div>

      {lignes.length === 0 ? (
        <div className={x.propre}>
          <p className={x.propreTitre}>{EXAMEN.pagePropre}</p>
          <p className={x.propreTexte}>{EXAMEN.pagePropreTexte}</p>
        </div>
      ) : (
        <div className={x.cartes}>
          {lignes.map((l) => (
            <CarteDebrief key={l.position} l={l} nb={d.nb} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Une question corrigée : mon choix, la bonne réponse, le verdict, l'explication. */
function CarteDebrief({ l, nb }: { l: LigneDebrief; nb: number }) {
  const { item, correction: c, reponse: r, verdict } = l;
  const calcul = item.origine === "calcul";
  const unite = (item.unite ?? "") as CalcUnit;
  const decimales = item.decimales ?? 2;
  const etiquettes = etiquettesDe(item).slice(1);
  const explication = c?.explication?.trim() ? c.explication : null;
  const etapes = calcul && c ? c.etapes : [];
  const detail = (
    <>
      {explication && <Enonce texte={explication} className={x.explicationTexte} />}
      {etapes.length > 0 && (
        <>
          <p className={s.libelle}>{EXAMEN.etapes}</p>
          <ol className={x.etapes}>
            {etapes.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ol>
        </>
      )}
    </>
  );
  const aDuDetail = Boolean(explication) || etapes.length > 0;

  return (
    <article id={ancre(l.position)} tabIndex={-1} className={x.carte} data-v={verdict} aria-label={EXAMEN.carteAria(l.position + 1, nb)}>
      <div className={x.carteTete}>
        <p className={x.carteNum}>
          Q{l.position + 1}
          {etiquettes.map((e, i) => (
            <span key={i}> · {e.texte}</span>
          ))}
        </p>
        <span className="flex shrink-0 items-center gap-1.5">
          {item.origine === "question" && c?.questionId && <MarqueQuestion questionId={c.questionId} source="examen" />}
          <span className={x.verdict} data-v={verdict}>
          {verdict === "juste" ? <Check size={13} aria-hidden /> : verdict === "faux" ? <X size={13} aria-hidden /> : <Minus size={13} aria-hidden />}
          {verdict === "juste" ? EXAMEN.juste : verdict === "faux" ? EXAMEN.faux : EXAMEN.sans}
        </span>
        </span>
      </div>

      <Enonce texte={item.enonce} className={x.carteEnonce} />

      {calcul && item.donnees && item.donnees.length > 0 && (
        <dl className={x.donnees}>
          {item.donnees.map((dd, i) => (
            <div key={i}>
              <dt>{dd.label}</dt>
              <dd>{dd.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {!calcul && item.choix && (
        <ul className={x.choixListe}>
          {item.choix.map((texte, i) => {
            const bonne = c?.bonneIndex === i;
            const mien = r?.choix === i;
            const etat = bonne ? "bonne" : mien ? "faux" : "estompe";
            return (
              <li key={i} className={x.choixLigne} data-etat={etat}>
                <span className={x.choixLettre} aria-label={bonne ? `${lettre(i)}, ${EXAMEN.bonneReponse.toLowerCase()}` : lettre(i)}>
                  {bonne ? <Check size={13} strokeWidth={2.6} aria-hidden /> : mien ? <X size={13} strokeWidth={2.6} aria-hidden /> : lettre(i)}
                </span>
                <span className={x.choixTexte}>{texte}</span>
                <span className={x.choixTags}>
                  {bonne && <span className={x.tagBonne}>{EXAMEN.bonneReponse}</span>}
                  {mien && <span className={x.tagToi}>{EXAMEN.toi}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {calcul && (
        <div className={x.valeurs}>
          <div className={x.valeur} data-v={verdict}>
            <span className={s.libelle}>{EXAMEN.taReponse}</span>
            <span className={x.valeurNombre}>{r?.valeur != null ? formatCalc(r.valeur, unite, decimalsOf(r.valeur)) : EXAMEN.pasDeReponse}</span>
          </div>
          {c?.bonneValeur != null && (
            <div className={x.valeur}>
              <span className={s.libelle}>{EXAMEN.bonneReponse}</span>
              <span className={x.valeurNombre}>{formatCalc(c.bonneValeur, unite, decimales)}</span>
            </div>
          )}
        </div>
      )}

      {!calcul && !r && <p className={x.sansReponse}>{EXAMEN.pasDeReponse}</p>}

      {!c ? (
        <p className={x.attente}>{EXAMEN.debriefAttente}</p>
      ) : aDuDetail ? (
        verdict === "juste" ? (
          <details className={x.explication}>
            <summary>
              {EXAMEN.voirExplication} <ArrowRight size={13} aria-hidden />
            </summary>
            <div className={x.explicationCorps}>{detail}</div>
          </details>
        ) : (
          <div className={x.explication}>
            <p className={s.libelle}>{EXAMEN.explication}</p>
            <div className={x.explicationCorps}>{detail}</div>
          </div>
        )
      ) : null}
    </article>
  );
}

/** Mémorisé : l'écran se redessine cinq fois par seconde, pas le débrief. */
export const DebriefExamen = memo(DebriefExamenBase);
