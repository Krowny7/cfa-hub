"use client";

import { useState, type FormEvent } from "react";
import { parseCalcCandidates } from "@/lib/calc/engine";
import { TERMINAL as T } from "@/lib/voice-terminal";
import { EXERCICES, type EtapeQuestion } from "./exercices";
import s from "./Terminal.module.css";

// Le panneau des exercices guidés : la liste, puis les étapes une par une. L'avancement ne se
// garde pas : un exercice tient en quelques minutes.

export type Position = { i: number; pas: number };

function Question({ etape, onAvancer }: { etape: EtapeQuestion; onAvancer: () => void }) {
  const [saisie, setSaisie] = useState("");
  const [etat, setEtat] = useState<"attente" | "faux" | "juste" | "revelee">("attente");

  function verifier(e: FormEvent) {
    e.preventDefault();
    let ok: boolean;
    if (etape.t === "nombre") {
      const { reponse, tolerance } = etape;
      ok = parseCalcCandidates(saisie).some((v) => Math.abs(v - reponse) <= tolerance + 1e-9);
    } else {
      ok = saisie.trim().toUpperCase() === etape.reponse;
    }
    setEtat(ok ? "juste" : "faux");
  }

  if (etat === "juste" || etat === "revelee") {
    return (
      <>
        {etat === "juste" && <p className={s.hausse}>{T.juste}</p>}
        <p>{etape.corrige}</p>
        <button type="button" className={s.action} onClick={onAvancer}>
          {T.continuer}
        </button>
      </>
    );
  }
  return (
    <>
      <form className={s.reponse} onSubmit={verifier}>
        <label className={s.reponseChamp}>
          <span className="sr-only">{T.saisie}</span>
          <input
            value={saisie}
            placeholder={T.saisie}
            autoComplete="off"
            spellCheck={false}
            inputMode={etape.t === "nombre" ? "decimal" : "text"}
            onChange={(e) => {
              setSaisie(e.target.value);
              setEtat("attente");
            }}
          />
          {etape.t === "nombre" && <span className={s.doux}>{etape.unite}</span>}
        </label>
        <button type="submit" className={s.action} disabled={!saisie.trim()}>
          {T.verifier}
        </button>
      </form>
      {etat === "faux" && (
        <p role="alert" className={s.baisse}>
          {T.faux}
        </p>
      )}
      <button type="button" className={s.discret} onClick={() => setEtat("revelee")}>
        {T.voirReponse}
      </button>
    </>
  );
}

export function PanneauExercices({
  position,
  onCommencer,
  onAvancer,
  onQuitter,
}: {
  position: Position | null;
  onCommencer: (i: number) => void;
  onAvancer: () => void;
  onQuitter: () => void;
}) {
  if (!position) {
    return (
      <>
        <h2 className={s.panneauTitre}>{T.exercices}</h2>
        <ul className={s.exercices}>
          {EXERCICES.map((x, i) => (
            <li key={x.id}>
              <b>{x.titre}</b>
              <p className={s.doux}>{x.sous}</p>
              <button type="button" className={s.action} onClick={() => onCommencer(i)}>
                {T.commencer}
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  }

  const x = EXERCICES[position.i];
  const total = x.etapes.length;
  if (position.pas >= total) {
    return (
      <>
        <h2 className={s.panneauTitre}>{x.titre}</h2>
        <p className={s.hausse}>{T.fini}</p>
        <button type="button" className={s.action} onClick={onQuitter}>
          {T.retour}
        </button>
      </>
    );
  }

  const etape = x.etapes[position.pas];
  return (
    <>
      <h2 className={s.panneauTitre}>{x.titre}</h2>
      <p className={s.doux}>{T.etapeN(position.pas + 1, total)}</p>
      <p>{etape.consigne}</p>
      {etape.t === "commande" ? <p className={s.attendu}>{etape.attendu}</p> : <Question key={`${x.id}-${position.pas}`} etape={etape} onAvancer={onAvancer} />}
      <button type="button" className={s.discret} onClick={onQuitter}>
        {T.quitter}
      </button>
    </>
  );
}
