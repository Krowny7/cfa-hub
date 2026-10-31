import { Play, Target } from "lucide-react";
import { Bouton, Phrase, SceauUni } from "@/components/moi/synthese/Encre";
import { Jauge } from "@/components/moi/synthese/graphes/Jauge";
import { Quete } from "@/components/moi/synthese/graphes/Quete";
import { Trajectoire } from "@/components/moi/synthese/graphes/Trajectoire";
import {
  COUVERTURE_MIN,
  TRAJECTOIRE_COMPACTE,
  TRAJECTOIRE_LARGE,
  chiffresObjectif,
  dateJour,
  dateLongue,
  entier,
  pc,
  phraseObjectif,
} from "@/components/moi/synthese/modele";
import type { NoteSynthese, ObjectifPlan, ObjectifSynthese } from "@/components/moi/synthese/types";
import { SYN } from "@/lib/voice-moi";
import s from "@/components/moi/synthese/Synthese.module.css";

// La carte « Ton objectif » (8 colonnes) : les questions faites sur le total
// visé, la quête du jour et son bouton d'encre (le seul liquide de la carte),
// la trajectoire jusqu'au jour J, la jauge « Si l'examen était aujourd'hui »
// et la phrase « Ce que ça veut dire ». Sans objectif ni date d'examen, la
// carte garde son titre et invite à les fixer. Composant serveur, aucun hook.

const ID = "syn-objectif";
const REGLAGE = "/moi?onglet=reglages#objectif";

/** Le pavé J-n, en aplat noir ; « Jour J » dit « c'est aujourd'hui ». */
function PaveJour({ jn }: { jn: string | null }) {
  if (!jn) return null;
  return (
    <span className={s.jour}>
      <b className="font-brand">{jn}</b>
      <span>{jn === "Jour J" ? SYN.obj.jourJ : SYN.obj.avantExamen}</span>
    </span>
  );
}

/** La colonne de la jauge : la note estimée si au moins la moitié du programme est mesurée, sinon la phrase « Encore tôt ». */
function ColonneJauge({ note }: { note: NoteSynthese }) {
  const prete = note.couverture >= COUVERTURE_MIN;
  const manque = Math.max(0, note.seuil - note.estimee);
  return (
    <div className={s.objColonne + " " + s.objJauge}>
      <p className={s.eyebrow}>{SYN.obj.jauge.titre}</p>
      {prete ? (
        <div className={s.jaugeRang}>
          <div className={s.jaugeBoite}>
            <Jauge note={note.estimee} seuil={note.seuil} />
            <p className={s.jaugeValeur}>
              <b className="font-brand">{pc(note.estimee)}</b>
            </p>
          </div>
          <div className={s.jaugeTexte}>
            <p className={s.jaugeNote}>
              <Phrase segments={SYN.obj.jauge.explication(note.seuil)} />
            </p>
            <p className={s.jaugeManque}>{manque > 0 ? <Phrase segments={SYN.obj.jauge.manque(manque)} /> : SYN.obj.jauge.passe}</p>
            {manque > 0 && (
              <a href="#gagner" className={s.lien}>
                {SYN.obj.jauge.gagner}
              </a>
            )}
          </div>
        </div>
      ) : (
        <p className={s.jaugeNote}>{SYN.obj.jauge.tot(note.couverture)}</p>
      )}
    </div>
  );
}

function Plan({ o, note }: { o: ObjectifPlan; note: NoteSynthese | null }) {
  const c = chiffresObjectif(o);
  const phrase = phraseObjectif(o, c);
  const pied = o.statut === "actif" ? SYN.obj.ceQueCaVeutDire(c.rythme, o.projection, dateJour(o.examen), c.ecart, c.deplus) : null;
  return (
    <>
      <header className={s.tete}>
        <div className={s.teteGauche}>
          <SceauUni>
            <Target size={16} aria-hidden />
          </SceauUni>
          <div className={s.teteTexte}>
            <h2 id={ID} className={"font-brand " + s.titreCarte}>
              {SYN.obj.titre}
            </h2>
            <p className={s.sous}>{SYN.obj.sous(o.total, dateLongue(o.examen))}</p>
          </div>
        </div>
        <PaveJour jn={c.jn} />
      </header>
      <div className={s.objCorps} data-colonnes={note ? "3" : "2"}>
        <div className={s.objGauche}>
          <p className={s.objChiffre}>
            <b className="font-brand">{entier(c.fait)}</b>
            <span className="font-brand">/ {entier(c.total)}</span>
          </p>
          <div className={s.objBarre}>
            <span className={s.piste} role="img" aria-label={SYN.obj.faitSur(c.fait, c.total, c.pct)}>
              <i style={{ width: `${c.pct}%` }} />
            </span>
            <span className={s.objLegendeBarre}>
              <span>
                <b className={s.mono}>{pc(c.pct)}</b> {SYN.obj.desQuestions}
              </span>
              <span>
                {SYN.obj.reste} <b className={s.mono}>{entier(c.reste)}</b>
              </span>
            </span>
          </div>
          <p className={s.objPhrase}>
            <Phrase segments={phrase} />
          </p>
          <Quete c={c} jour={o.jour} />
          {o.hrefQuete && (
            <Bouton href={o.hrefQuete} className={s.objAction}>
              <Play size={15} aria-hidden /> {SYN.obj.faire(c.resteJour)}
            </Bouton>
          )}
        </div>
        <div className={s.objColonne}>
          <p className={s.eyebrow}>{SYN.obj.trajectoire}</p>
          <Trajectoire o={o} dims={TRAJECTOIRE_COMPACTE} className={s.trajPetit} />
          <Trajectoire o={o} dims={TRAJECTOIRE_LARGE} className={s.trajGrand} />
          <ul className={s.legende}>
            <li>
              <i className={s.trace} />
              {SYN.obj.legendeFait}
            </li>
            {o.statut === "actif" && (
              <li>
                <i className={s.trace + " " + s.traceObjectif} />
                {SYN.obj.legendeParJour(c.quotidien)}
              </li>
            )}
            <li>
              <i className={s.trace + " " + s.traceRythme} />
              {SYN.obj.legendeRythme(c.rythme)}
            </li>
          </ul>
        </div>
        {note && <ColonneJauge note={note} />}
      </div>
      {pied && (
        <p className={s.pied}>
          <b>{SYN.obj.pied}</b> {pied}
        </p>
      )}
    </>
  );
}

function Sans({ jn, note }: { jn: string | null; note: NoteSynthese | null }) {
  return (
    <>
      <header className={s.tete}>
        <div className={s.teteGauche}>
          <SceauUni>
            <Target size={16} aria-hidden />
          </SceauUni>
          <div className={s.teteTexte}>
            <h2 id={ID} className={"font-brand " + s.titreCarte}>
              {SYN.obj.titre}
            </h2>
          </div>
        </div>
        <PaveJour jn={jn} />
      </header>
      <div className={s.objCorps} data-colonnes={note ? "sans" : "1"}>
        <div className={s.sansObjectif}>
          <p className={"font-brand " + s.sansTitre}>{SYN.obj.sans.titre}</p>
          <p>{SYN.obj.sans.phrase}</p>
          <Bouton href={REGLAGE}>{SYN.obj.sans.action}</Bouton>
        </div>
        {note && <ColonneJauge note={note} />}
      </div>
    </>
  );
}

export function Objectif({ objectif, note, jn, className }: { objectif: ObjectifSynthese; note: NoteSynthese | null; jn: string | null; className?: string }) {
  return (
    <section className={[s.carte, s.moyenne, className].filter(Boolean).join(" ")} aria-labelledby={ID}>
      {objectif.etat === "plan" ? <Plan o={objectif} note={note} /> : <Sans jn={jn} note={note} />}
    </section>
  );
}
