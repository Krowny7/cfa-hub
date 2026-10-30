"use client";

import Link from "next/link";
import { ArrowLeft, Check, Minus, Plus } from "lucide-react";
import {
  MAINS_POSSIBLES,
  PAR_MAIN,
  basculerMatiere,
  basculerPaquet,
  changerParMain,
  choisirMains,
  paquetsVisibles,
  resumer,
  type MatierePartie,
  type ReglagesPartie as Reglages,
} from "@/lib/flashcards/partie";
import { PARTIE_REGLAGES as T, leonardReglages } from "@/lib/voice-partie";
import { PanneauCroupier } from "./PanneauCroupier";
import s from "./Partie.module.css";

// « Prépare ta partie » : les matières et les paquets à tirer, le nombre de
// mains (3, 5, 10), les cartes par main (1 à 5), « seulement les non
// maîtrisées » et « mélanger ». À gauche, Léonard le croupier réagit aux
// choix et la table montre une main de la bonne taille ; en bas, ce qui sera
// distribué, et « Distribuer ». Sans état : tout vient de PartieDeCartes
// (les réglages, la maîtrise du joueur), tout y remonte (onChange,
// onDistribuer).

function Coche() {
  return (
    <span className={s.case} aria-hidden>
      <Check size={12} strokeWidth={3.6} />
    </span>
  );
}

export function ReglagesPartie({
  matieres,
  reglages,
  maitrisees,
  occupe,
  erreur,
  onChange,
  onDistribuer,
}: {
  matieres: MatierePartie[];
  reglages: Reglages;
  /** les cartes que le joueur maîtrise déjà (pour « seulement les non maîtrisées ») */
  maitrisees: ReadonlySet<string>;
  /** la donne est en route (les cartes se chargent) */
  occupe: boolean;
  erreur: string | null;
  onChange: (r: Reglages) => void;
  onDistribuer: () => void;
}) {
  const visibles = paquetsVisibles(reglages, matieres);
  const nomDe = new Map(matieres.map((m) => [m.cle, m]));
  const resume = resumer(reglages, matieres, maitrisees);
  const peutJouer = resume.total > 0 && !occupe;
  const leo = leonardReglages({ total: resume.total, vivier: resume.vivier, paquets: resume.paquets, seulementNon: reglages.seulementNonMaitrisees });
  const toutMaitrise = resume.total === 0 && resume.paquets > 0 && reglages.seulementNonMaitrisees;
  const j = T.jetonsEnJeu(resume.total);

  return (
    <div className={s.page}>
      <PanneauCroupier pose={leo.pose} bulle={leo.bulle}>
        <div className={s.vignette} aria-hidden>
          <div className={s.plan}>
            <span className={s.sigle}>RL</span>
            {Array.from({ length: reglages.parMain }, (_, i) => (
              <i key={i} className={s.carte} />
            ))}
          </div>
        </div>
        <div className={s.jetons} role="img" aria-label={T.jetonsAlt(resume.total)}>
          <b>{j.chiffre}</b>
          <span>
            {j.ligne1}
            <br />
            {j.ligne2}
          </span>
        </div>
      </PanneauCroupier>

      <div className={s.feuille}>
        <Link href="/flashcards" className={s.retour}>
          <ArrowLeft size={15} aria-hidden /> {T.retour}
        </Link>
        <div className={s.titre}>
          <p className="t-eyebrow m-0">{T.surTitre}</p>
          <h1>{T.titre}</h1>
          <p>{T.sous}</p>
        </div>

        <div>
          <div className={s.lab}>
            <span className="t-eyebrow">{T.matieres}</span>
          </div>
          <div className={s.grille}>
            {matieres.map((m) => {
              const vide = !m.paquets.some((p) => p.cartes.length > 0);
              return (
                <button key={m.cle} type="button" className={s.chip} aria-pressed={reglages.matieres.includes(m.cle)} disabled={vide} onClick={() => onChange(basculerMatiere(reglages, matieres, m.cle))}>
                  <Coche />
                  <span>
                    {m.nom}
                    {vide && <small>{T.matiereVide}</small>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className={s.lab}>
            <span className="t-eyebrow">{T.paquets}</span>
            {visibles.length > 0 && <i>{T.paquetsCoches(visibles.filter((p) => reglages.paquets.includes(p.id)).length, visibles.length)}</i>}
          </div>
          <div className={s.listeP}>
            {visibles.length === 0 && <p className={s.vide}>{T.aucunPaquet}</p>}
            {visibles.map((p) => {
              const m = nomDe.get(p.matiere);
              const total = m?.paquets.filter((q) => q.cartes.length > 0).length ?? 4;
              return (
                <button key={p.id} type="button" className={s.ligne} aria-pressed={reglages.paquets.includes(p.id)} onClick={() => onChange(basculerPaquet(reglages, matieres, p.id))}>
                  <Coche />
                  <span className={s.nom} title={`${m?.nom ?? ""} ${T.paquet(p.numero, total, p.theme)}`}>
                    <b>{m?.abrege ?? ""}</b>
                    {T.paquet(p.numero, total, p.theme)}
                  </span>
                  <span className={s.nb} title={T.paquetCartes(p.cartes.length)}>
                    {p.cartes.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={s.deux}>
          <div role="group" aria-labelledby="partie-mains">
            <div className={s.lab}>
              <span id="partie-mains" className="t-eyebrow">
                {T.mains}
              </span>
            </div>
            <div className={s.seg}>
              {MAINS_POSSIBLES.map((n) => (
                <button key={n} type="button" aria-pressed={reglages.mains === n} onClick={() => onChange(choisirMains(reglages, n))}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div role="group" aria-labelledby="partie-par-main">
            <div className={s.lab}>
              <span id="partie-par-main" className="t-eyebrow">
                {T.parMain}
              </span>
            </div>
            <div className={s.pas}>
              <button type="button" aria-label={T.moinsParMain} disabled={reglages.parMain <= PAR_MAIN.min} onClick={() => onChange(changerParMain(reglages, -1))}>
                <Minus size={18} aria-hidden />
              </button>
              <output aria-live="polite">{reglages.parMain}</output>
              <button type="button" aria-label={T.plusParMain} disabled={reglages.parMain >= PAR_MAIN.max} onClick={() => onChange(changerParMain(reglages, 1))}>
                <Plus size={18} aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <div className={s.interrupteurs}>
          <button type="button" className={s.sw} aria-pressed={reglages.seulementNonMaitrisees} onClick={() => onChange({ ...reglages, seulementNonMaitrisees: !reglages.seulementNonMaitrisees })}>
            <span className={s.piste} aria-hidden />
            <span>{T.seulementNon}</span>
          </button>
          <button type="button" className={s.sw} aria-pressed={reglages.melanger} onClick={() => onChange({ ...reglages, melanger: !reglages.melanger })}>
            <span className={s.piste} aria-hidden />
            <span>{T.melanger}</span>
          </button>
        </div>

        <div className={s.pied}>
          <p className={s.resume} aria-live="polite">
            {T.resume({ total: resume.total, mains: resume.mains, parMain: resume.parMain, vivier: resume.vivier, melange: reglages.melanger, toutMaitrise })}
          </p>
          <button type="button" className={s.encre} data-off={peutJouer || occupe ? undefined : ""} disabled={!peutJouer} onClick={onDistribuer}>
            {occupe ? T.distribution : T.distribuer}
          </button>
          {erreur && (
            <p className={s.erreur} role="alert">
              {erreur}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
