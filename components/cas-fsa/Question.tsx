"use client";

import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { parseCalcCandidates } from "@/lib/calc/engine";
import type { EtapeCas } from "@/lib/cas-fsa/types";
import { CAS, avecUnite } from "@/lib/voice-cas-fsa";
import type { Issue } from "./avancement";
import s from "./CasFsa.module.css";

// Une question du cas. Chiffrée : le joueur tape sa réponse, autant de fois qu'il veut, ou la
// révèle. Rédigée : il la révèle. Terminée, elle montre le corrigé puis la lecture.

export function Question({
  etape,
  issue,
  tuto,
  onTermine,
  onSuivante,
  suivante,
}: {
  etape: EtapeCas;
  issue: Issue | undefined;
  tuto: boolean;
  onTermine: (issue: Issue) => void;
  onSuivante: () => void;
  /** le libellé du bouton qui suit le corrigé */
  suivante: string;
}) {
  const [saisie, setSaisie] = useState("");
  const [retour, setRetour] = useState<"faux" | "illisible" | null>(null);
  const attendu = etape.reponse;

  function verifier(e: FormEvent) {
    e.preventDefault();
    if (attendu === null) return;
    const lus = parseCalcCandidates(saisie);
    if (lus.length === 0) {
      setRetour("illisible");
      return;
    }
    // la marge couvre les arrondis du flottant, pas plus
    if (lus.some((v) => Math.abs(v - attendu) <= (etape.tolerance ?? 0) + 1e-9)) onTermine("juste");
    else setRetour("faux");
  }

  return (
    <>
      <p className={s.enonce} lang="en">
        {etape.enonce}
      </p>

      {tuto && <p className={s.guide}>{etape.guide}</p>}

      {!issue &&
        (attendu === null ? (
          <button type="button" className="btn btn-primary rl-press w-fit" onClick={() => onTermine("revelee")}>
            {CAS.reveler}
          </button>
        ) : (
          <>
            <form className={s.saisie} onSubmit={verifier}>
              <label className={s.champ}>
                <span className="sr-only">{CAS.saisie}</span>
                <input
                  className="input"
                  inputMode="decimal"
                  autoComplete="off"
                  value={saisie}
                  placeholder={CAS.saisie}
                  aria-invalid={retour !== null}
                  onChange={(e) => {
                    setSaisie(e.target.value);
                    setRetour(null);
                  }}
                />
                {etape.unite && <span className={s.unite}>{etape.unite}</span>}
              </label>
              <button type="submit" className="btn btn-primary rl-press" disabled={!saisie.trim()}>
                {CAS.verifier}
              </button>
            </form>
            {retour && (
              <p role="alert" className={s.faux}>
                {retour === "faux" ? CAS.faux : CAS.illisible}
              </p>
            )}
            <button type="button" className="btn btn-secondary btn-sm rl-press w-fit" onClick={() => onTermine("revelee")}>
              {CAS.reveler}
            </button>
          </>
        ))}

      {issue && (
        <>
          {attendu !== null ? (
            <p className={s.reponse} data-issue={issue}>
              {issue === "juste" && <Check size={17} strokeWidth={2.6} aria-hidden />}
              {issue === "juste" ? CAS.juste : CAS.reponse} {avecUnite(attendu, etape.unite)}
            </p>
          ) : (
            etape.reponseTexte && <p className={s.reponseTexte}>{etape.reponseTexte}</p>
          )}
          <section className={s.bloc}>
            <h3 className={s.blocTitre}>{CAS.corrige}</h3>
            <p>{etape.corrige}</p>
          </section>
          <section className={s.bloc}>
            <h3 className={s.blocTitre}>{CAS.lecture}</h3>
            <p>{etape.lecture}</p>
          </section>
          <button type="button" className="btn btn-primary rl-press w-fit" onClick={onSuivante}>
            {suivante}
          </button>
        </>
      )}
    </>
  );
}
