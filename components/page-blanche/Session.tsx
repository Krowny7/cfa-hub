"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import katex from "katex";
import { ArrowLeft, Check, X } from "lucide-react";
import { enregistrerTour, recommencerMatiere } from "@/app/page-blanche/actions";
import { copiesARendre, lignesDesCopies } from "@/lib/formules/tour";
import type { Copie, Formule } from "@/lib/formules/types";
import { PB } from "@/lib/voice-page-blanche";
import s from "./PageBlanche.module.css";

// Un tour de la page blanche. Les copies : le joueur avance une par une et écrit sur son
// papier. Le corrigé : tout est révélé d'un coup, il note chaque ligne en vert ou en rouge.
// Le bilan : ce qu'il a raté forme les copies du tour suivant.

type Phase = "copies" | "corrige" | "bilan";

function Reponse({ f }: { f: Formule }) {
  const html = useMemo(() => (f.latex ? katex.renderToString(f.latex, { throwOnError: false, displayMode: false }) : null), [f.latex]);
  if (html) return <span className={s.formule} dangerouslySetInnerHTML={{ __html: html }} />;
  return (
    <span className={s.texteReponse} lang="en">
      {f.texte}
    </span>
  );
}

export function SessionPageBlanche({
  matiere,
  nom,
  copies,
  maitrisees,
  tourDepart,
}: {
  matiere: string;
  nom: string;
  copies: Copie[];
  maitrisees: string[];
  tourDepart: number;
}) {
  const [acquises, setAcquises] = useState(() => new Set(maitrisees));
  const [tour, setTour] = useState(tourDepart);
  const [aRendre, setARendre] = useState(() => copiesARendre(copies, new Set(maitrisees)));
  const [phase, setPhase] = useState<Phase>("copies");
  const [ici, setIci] = useState(0);
  const [notes, setNotes] = useState<Record<string, boolean>>({});
  const [echec, setEchec] = useState(false);
  const [occupe, demarrer] = useTransition();

  const lignes = lignesDesCopies(aRendre);
  const notees = Object.keys(notes).length;
  const reussies = Object.values(notes).filter(Boolean).length;

  const retour = (
    <Link href="/page-blanche" className={s.retour}>
      <ArrowLeft size={15} aria-hidden /> {PB.retour}
    </Link>
  );

  function valider() {
    setEchec(false);
    demarrer(async () => {
      const r = await enregistrerTour(matiere, Object.entries(notes).map(([id, ok]) => ({ id, ok })));
      if (!r.ok) {
        setEchec(true);
        return;
      }
      setAcquises((avant) => new Set([...avant, ...Object.keys(notes).filter((id) => notes[id])]));
      setPhase("bilan");
      window.scrollTo({ top: 0 });
    });
  }

  function tourSuivant() {
    setARendre(copiesARendre(copies, acquises));
    setNotes({});
    setIci(0);
    setTour((t) => t + 1);
    setPhase("copies");
    window.scrollTo({ top: 0 });
  }

  function recommencer() {
    setEchec(false);
    demarrer(async () => {
      const r = await recommencerMatiere(matiere);
      if (!r.ok) {
        setEchec(true);
        return;
      }
      setAcquises(new Set());
      setARendre(copies);
      setNotes({});
      setIci(0);
      setTour(1);
      setPhase("copies");
    });
  }

  if (aRendre.length === 0 || phase === "bilan") {
    const reste = copiesARendre(copies, acquises);
    return (
      <div className={s.colonne}>
        {retour}
        <h1 className="t-h1 m-0">{nom}</h1>
        {phase === "bilan" && <p className={s.bilan}>{PB.bilan(reussies, notees)}</p>}
        {reste.length > 0 ? (
          <button type="button" className="btn btn-primary rl-press w-fit" onClick={tourSuivant}>
            {PB.suite(lignesDesCopies(reste))}
          </button>
        ) : (
          <>
            <p className={s.bilan}>{PB.fini}</p>
            <button type="button" className="btn btn-secondary rl-press w-fit" disabled={occupe} onClick={recommencer}>
              {PB.recommencer}
            </button>
          </>
        )}
        {echec && (
          <p role="alert" className="t-small m-0">
            {PB.echec}
          </p>
        )}
      </div>
    );
  }

  if (phase === "corrige") {
    return (
      <div className={s.colonne}>
        <header className={s.tete}>
          <h1 className="t-h1 m-0">{PB.corrige}</h1>
          <p className="t-small m-0">{PB.corrigeSous}</p>
        </header>
        {aRendre.map((c) => (
          <section key={c.id} className={s.feuille} aria-label={c.titre}>
            <h2 className={s.titreCopie}>{c.titre}</h2>
            <ol className={s.lignes}>
              {c.formules.map((f) => (
                <li key={f.id} className={s.ligneCorrige}>
                  <div className={s.contenu}>
                    <span className={s.nom} lang="en">
                      {f.nom}
                      {f.latex ? " =" : " :"}
                    </span>{" "}
                    <Reponse f={f} />
                    {f.note && <p className={s.note}>{f.note}</p>}
                  </div>
                  <div className={s.choix}>
                    <button type="button" className={s.rouge} aria-pressed={notes[f.id] === false} aria-label={`${f.nom} : ${PB.aRevoir}`} title={PB.aRevoir} onClick={() => setNotes((n) => ({ ...n, [f.id]: false }))}>
                      <X size={18} aria-hidden />
                    </button>
                    <button type="button" className={s.vert} aria-pressed={notes[f.id] === true} aria-label={`${f.nom} : ${PB.maitrisee}`} title={PB.maitrisee} onClick={() => setNotes((n) => ({ ...n, [f.id]: true }))}>
                      <Check size={18} aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
        <div className={s.barre}>
          <span className={s.compte}>{PB.notees(notees, lignes)}</span>
          {echec && (
            <span role="alert" className="t-small">
              {PB.echec}
            </span>
          )}
          <button type="button" className="btn btn-primary rl-press" disabled={notees < lignes || occupe} onClick={valider}>
            {occupe ? PB.enregistrement : PB.valider}
          </button>
        </div>
      </div>
    );
  }

  const c = aRendre[ici];
  const derniere = ici === aRendre.length - 1;
  return (
    <div className={s.colonne}>
      {retour}
      <header className={s.tete}>
        <h1 className="t-h1 m-0">{nom}</h1>
        <p className={s.compte}>
          {PB.tour(tour)} · {PB.copies(aRendre.length)}
        </p>
      </header>
      <section className={s.feuille} aria-label={c.titre}>
        <p className={s.numero}>{PB.copie(ici + 1, aRendre.length)}</p>
        <h2 className={s.titreCopie}>{c.titre}</h2>
        <ol className={s.lignes}>
          {c.formules.map((f) => (
            <li key={f.id} className={s.ligneVide} lang="en">
              {f.nom}
              {f.latex ? " =" : " :"}
            </li>
          ))}
        </ol>
      </section>
      <p className="t-small m-0">{PB.consigne}</p>
      <div className={s.barre}>
        {ici > 0 ? (
          <button type="button" className="btn btn-secondary rl-press" onClick={() => setIci((i) => i - 1)}>
            {PB.precedente}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="btn btn-primary rl-press"
          onClick={() => {
            if (derniere) setPhase("corrige");
            else setIci((i) => i + 1);
            window.scrollTo({ top: 0 });
          }}
        >
          {derniere ? PB.reveler : PB.suivante}
        </button>
      </div>
    </div>
  );
}
