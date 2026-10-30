"use client";

import type { CSSProperties } from "react";
import { bilanDe, poseBilan, type CarteJeu } from "@/lib/flashcards/partie";
import { PARTIE_BILAN as T, PARTIE_REGLAGES } from "@/lib/voice-partie";
import { PortraitLeonard } from "./PanneauCroupier";
import type { PropsBilan } from "./types";
import b from "./Bilan.module.css";

// Le bilan de la partie (d'après la maquette E3) : Léonard le croupier, fier,
// moqueur ou déçu selon le score, sa phrase, le récapitulatif de la partie ;
// la feuille avec les jetons gagnés (un jeton par carte maîtrisée : une pile
// qui monte jeton par jeton, et le grand chiffre), une ligne par matière (une
// pastille par carte), les cartes à revoir, « Nouvelle partie » et « Rejouer
// les non maîtrisées ». Tous les chiffres viennent de bilanDe
// (lib/flashcards/partie.ts), toutes les phrases de lib/voice-partie.ts.

/** La pile de jetons ne dépasse pas 12 de haut (le chiffre dit le reste). */
const PILE_MAX = 12;

const titreDe = (c: CarteJeu): string => c.titre || c.lieu;

export function BilanPartie({ partie, verdicts, historique, nouvellePartie, rejouer }: PropsBilan) {
  const bl = bilanDe(partie, verdicts, historique);
  const pile = Math.min(PILE_MAX, bl.maitrisees);
  const recap = T.recap(bl.mains, bl.total, partie.jetons);
  return (
    <div className={b.page}>
      <div className={b.gauche}>
        <div className={b.leoBox}>
          <PortraitLeonard pose={poseBilan(bl.niveau)} className={b.leoImg} />
          <span className={b.nomLeo}>{PARTIE_REGLAGES.croupier}</span>
        </div>
        <div className={b.bulle} aria-live="polite">
          <p>{T.bulle(bl.niveau, bl.maitrisees, bl.total)}</p>
        </div>
        <div className={b.recap}>
          {recap.map((r) => (
            <span key={r}>{r}</span>
          ))}
        </div>
      </div>

      <div className={b.feuille}>
        <div className={b.titre}>
          <p className="t-eyebrow m-0">{T.surTitre}</p>
          <h1>{T.titre}</h1>
        </div>

        <div className={b.score}>
          <div className={b.pile} role="img" aria-label={T.pileAlt(bl.maitrisees, bl.total)} style={{ "--n": pile } as CSSProperties}>
            {pile > 0 && <i className={b.col} style={{ "--n": pile } as CSSProperties} />}
          </div>
          <div className={b.chiffre}>
            <b>{bl.maitrisees}</b>
            <span>{T.sur(bl.total)}</span>
          </div>
          <div className={b.legende}>
            <b>{T.jetonsGagnes}</b>
            <span>{T.sousScore(bl.pct)}</span>
          </div>
        </div>

        <ul className={b.lignes}>
          {bl.lignes.map((l) => (
            <li key={l.cle} className={b.ligne}>
              <span className={b.nom}>{l.nom}</span>
              <span className={b.pips} role="img" aria-label={T.ligneAlt(l.maitrisees, l.total)} style={l.total > 8 ? ({ "--pw": "13px", "--ph": "18px" } as CSSProperties) : undefined}>
                {l.cartes.map((c) => (
                  <i key={c.id} className={b.pip} data-ok={c.ok === true ? "" : undefined} data-ko={c.ok === false ? "" : undefined} />
                ))}
              </span>
              <span className={b.fr}>{T.fraction(l.maitrisees, l.total)}</span>
              <span className={b.mot}>{T.mot(l.maitrisees, l.total)}</span>
            </li>
          ))}
        </ul>

        <div className={b.revoir}>
          <h2 className="t-eyebrow">{T.aRevoir(bl.aRevoir.length)}</h2>
          {bl.aRevoir.length === 0 ? (
            <p className={b.propre}>{T.rienARevoir}</p>
          ) : (
            <ul>
              {bl.aRevoir.map((c) => (
                <li key={c.id}>
                  <b>{c.abrege}</b>
                  <span>{titreDe(c)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={b.pied}>
          <button type="button" className={b.contour} onClick={nouvellePartie}>
            {T.nouvelle}
          </button>
          {bl.aRevoir.length > 0 && (
            <button type="button" className={b.encre} onClick={rejouer}>
              {T.rejouer(bl.aRevoir.length)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
