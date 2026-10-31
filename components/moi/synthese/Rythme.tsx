"use client";

import { useState } from "react";
import { Timer, Zap } from "lucide-react";
import { Bouton, SceauUni } from "@/components/moi/synthese/Encre";
import { PisteRythme } from "@/components/moi/synthese/graphes/PisteRythme";
import { HREF_SERIE_CHRONO, lignesRythme, resumeRythme } from "@/components/moi/synthese/modele-examen";
import type { RythmeSynthese } from "@/components/moi/synthese/types";
import { EXA } from "@/lib/voice-moi-examen";
import s from "@/components/moi/synthese/Synthese.module.css";
import m from "@/components/moi/synthese/Examen.module.css";

// La carte « Ton rythme d'examen » (petite, 4 colonnes) : tes secondes par
// question, toutes matières ou pour la matière choisie, face aux 90 s de
// l'examen (180 questions en 2 × 2 h 15), une ligne par matière chronométrée au
// moins 20 fois (la plus lente en haut), ce que l'écart veut dire et le bouton
// d'encre « Série chronométrée ». Îlot client : le seul état est la matière
// choisie (cliquer deux fois la rend à « Toutes matières »). Sous 20 questions
// chronométrées : un état vide, avec le même bouton.

const ID = "syn-rythme";
const PASTILLE = { r: m.etatR, e: m.etatE } as const;

function Entete() {
  return (
    <header className={m.entete}>
      <h2 id={ID} className={`font-brand ${s.titreCarte} ${m.titre}`}>
        <SceauUni>
          <Timer size={15} aria-hidden />
        </SceauUni>
        {EXA.rythme.titre}
      </h2>
      <p className={s.sous}>{EXA.rythme.sous}</p>
    </header>
  );
}

/** @param choisieAuDepart la matière (clé) déjà choisie au premier rendu ; aucune par défaut */
export function Rythme({ rythme, choisieAuDepart = null, className }: { rythme: RythmeSynthese; choisieAuDepart?: string | null; className?: string }) {
  const [cle, setCle] = useState<string | null>(choisieAuDepart);
  const lignes = lignesRythme(rythme);
  const actif = lignes.find((l) => l.cle === cle)?.cle ?? null;
  const r = resumeRythme(rythme, actif);
  const classe = [s.carte, s.petite, className].filter(Boolean).join(" ");
  const serie = (
    <Bouton href={HREF_SERIE_CHRONO} className={m.boutonPetit}>
      <Zap size={15} aria-hidden /> {EXA.rythme.serie}
    </Bouton>
  );

  if (!r) {
    return (
      <section className={classe} aria-labelledby={ID}>
        <Entete />
        <p className={m.vide}>{EXA.rythme.vide(rythme.questions)}</p>
        <div className={m.actions}>{serie}</div>
      </section>
    );
  }
  return (
    <section className={classe} aria-labelledby={ID}>
      <Entete />
      <div className={m.rythmeTete}>
        <p className={m.rythmeSur}>
          <span className={`${s.eyebrow} ${m.eyebrowPetit}`}>{r.sur}</span>
          <span className={m.rythmeChiffre}>
            <b className="font-brand">{r.valeur}</b>
            <span>{EXA.rythme.parQuestion}</span>
          </span>
        </p>
        <span className={`${m.etat} ${PASTILLE[r.ton]}`}>{r.ecart}</span>
      </div>
      {lignes.length > 0 && (
        <>
          <div className={m.lignes}>
            {lignes.map((l) => (
              <button
                key={l.cle}
                type="button"
                aria-pressed={actif === l.cle}
                aria-label={l.titre}
                className={actif && actif !== l.cle ? `${m.ligne} ${m.hors}` : m.ligne}
                onClick={() => setCle(actif === l.cle ? null : l.cle)}
              >
                <span>{l.court}</span>
                <PisteRythme ligne={l} />
                <span className={`${s.mono} ${m.valeurLigne}`}>{l.valeur}</span>
              </button>
            ))}
          </div>
          <div className={m.axeLigne} aria-hidden>
            <span />
            <span className={m.axe}>
              {EXA.rythme.axe.map((t) => (
                <span key={t.texte} className={[t.x === 0 ? m.axeDebut : t.x === 100 ? m.axeFin : "", t.gras ? m.axeGras : ""].filter(Boolean).join(" ") || undefined} style={{ left: `${t.x}%` }}>
                  {t.texte}
                </span>
              ))}
            </span>
            <span />
          </div>
        </>
      )}
      <p className={s.pied}>
        <b>{EXA.pied}</b> {r.texte}
      </p>
      <div className={m.actions}>
        {serie}
        {actif && (
          <button type="button" className={m.raz} onClick={() => setCle(null)}>
            {EXA.rythme.toutes}
          </button>
        )}
      </div>
    </section>
  );
}
