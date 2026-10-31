import { Coins, Play } from "lucide-react";
import { Bouton, Phrase, SceauUni } from "@/components/moi/synthese/Encre";
import { pc, ton } from "@/components/moi/synthese/modele";
import { MIN_MATIERE, SEUIL, gagner, nombreGain, phraseGagner, texteGain, type PaliersNote } from "@/components/moi/synthese/modele-bilan";
import type { MatiereSynthese, NoteSynthese } from "@/components/moi/synthese/types";
import { BILAN } from "@/lib/voice-moi-bilan";
import b from "@/components/moi/synthese/Bilan.module.css";
import s from "@/components/moi/synthese/Synthese.module.css";

// La carte « Où gagner des points » (petite, 3 colonnes, id="gagner") : chaque
// matière mesurée remontée à 70 %, en points de note (son poids × ce qui lui
// manque), les 3 premières en noir et les suivantes en violet, puis la note
// estimée à trois paliers (aujourd'hui, avec les 3 premières, avec toutes ;
// masquée sous 50 % du programme mesuré). Le seul liquide de la carte est le
// bouton « Commencer par X ». Composant serveur, aucun hook.

const ID = "syn-gagner";
const T = BILAN.gagner;
const P = T.paliers;

const COULEUR: Record<"r" | "a" | "e", string> = { r: b.zr, a: b.za, e: b.ze };

/** La barre des paliers : la préparation dans la couleur de sa zone, puis les gains des trois premières (noir) et des autres (violet). */
function BarrePaliers({ p }: { p: PaliersNote }) {
  const { prep, trois, reste } = p.barre;
  const x = (v: number) => `${Math.max(0, Math.min(100, v)).toFixed(2)}%`;
  return (
    <span className={b.palier} role="img" aria-label={P.aria(p.aujourdhui, p.trois, p.toutes, p.n, SEUIL)}>
      <i className={COULEUR[ton(p.aujourdhui) ?? "r"]} style={{ left: 0, width: x(prep) }} />
      <i className={b.palierNoir} style={{ left: x(prep), width: x(trois) }} />
      {reste > 0 && <i className={b.palierViolet} style={{ left: x(prep + trois), width: x(reste) }} />}
      <span className={b.seuil} />
    </span>
  );
}

export function Gagner({ matieres, note, className }: { matieres: MatiereSynthese[]; note: NoteSynthese | null; className?: string }) {
  const g = gagner(matieres, note);
  const phrase = phraseGagner(g);
  const premiere = g.lignes[0];
  return (
    <section id="gagner" className={[s.carte, s.petite, b.carteBilan, className].filter(Boolean).join(" ")} aria-labelledby={ID}>
      <header>
        <div className={s.teteBloc}>
          <h2 id={ID} className={"font-brand " + s.titreCarte + " " + s.titreSceau}>
            <SceauUni>
              <Coins size={15} aria-hidden />
            </SceauUni>
            {T.titre}
          </h2>
          <p className={s.sous}>{T.sous(SEUIL)}</p>
        </div>
      </header>

      {g.etat === "liste" && (
        <>
          <ol className={b.gains} aria-label={T.liste}>
            {g.lignes.map((l) => (
              <li key={l.cle} className={b.gain}>
                <span className={b.rang + " " + s.mono}>{l.rang}</span>
                <b>{l.court}</b>
                <span className={b.piste + (l.sombre ? "" : " " + b.violet)} aria-hidden>
                  <i style={{ width: `${l.w}%` }} />
                </span>
                <span className={b.gainValeur + " " + s.mono}>{texteGain(l.gain)}</span>
              </li>
            ))}
          </ol>
          {g.paliers && (
            <div className={b.encart}>
              <p className={b.etiquette}>{P.titre}</p>
              <BarrePaliers p={g.paliers} />
              <ul className={b.paliers}>
                <li>
                  <b className={s.mono}>{pc(g.paliers.aujourdhui)}</b>
                  <span>{P.aujourdhui}</span>
                </li>
                {g.paliers.trois !== null && (
                  <li>
                    <b className={s.mono}>{pc(g.paliers.trois)}</b>
                    <span>
                      <Phrase segments={P.trois(SEUIL, g.paliers.passeTrois)} />
                    </span>
                  </li>
                )}
                <li>
                  <b className={s.mono}>{pc(g.paliers.toutes)}</b>
                  <span>
                    <Phrase segments={P.toutes(g.paliers.n, SEUIL, g.paliers.passeToutes)} />
                  </span>
                </li>
              </ul>
            </div>
          )}
          {g.pasMesurees > 0 && <p className={b.note}>{T.pasMesurees(g.pasMesurees)}</p>}
          {phrase && (
            <p className={s.pied}>
              <b>{BILAN.pied}</b> {phrase}
            </p>
          )}
          {g.cible && premiere && (
            <div className={b.bas}>
              <Bouton href={g.cible.href} className={b.action} label={T.commencerAria(g.cible.court, nombreGain(premiere.gain))}>
                <Play size={15} aria-hidden /> {T.commencer(g.cible.court)}
              </Bouton>
            </div>
          )}
        </>
      )}

      {g.etat === "tout70" && (
        <>
          <p className={b.vide}>
            <b>{T.toutes70(SEUIL)}</b>
            <span>{T.toutes70Suite}</span>
          </p>
          {g.pasMesurees > 0 && <p className={b.note}>{T.pasMesurees(g.pasMesurees)}</p>}
        </>
      )}

      {g.etat === "aucune" && (
        <>
          <p className={b.vide}>{T.aucune(MIN_MATIERE)}</p>
          {g.cible && (
            <div className={b.bas}>
              <Bouton href={g.cible.href} className={b.action}>
                <Play size={15} aria-hidden /> {T.faire(g.cible.court)}
              </Bouton>
            </div>
          )}
        </>
      )}
    </section>
  );
}
