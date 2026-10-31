"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { PAL, Phrase, SceauUni } from "@/components/moi/synthese/Encre";
import { Courbe } from "@/components/moi/synthese/graphes/Courbe";
import {
  COURBE_GRANDE,
  COURBE_PETITE,
  POINTS_MIN_COURBE,
  PUCES_MATIERES,
  ariaCourbe,
  geometrieCourbe,
  legendeProjection,
  legendeSuperposee,
  lectureCourbe,
  lectureMatiere,
  phraseGains,
  projection,
  traceSuperpose,
  type GeoCourbe,
} from "@/components/moi/synthese/modele-examen";
import type { ProgressionSynthese } from "@/components/moi/synthese/types";
import { EncreVive } from "@/components/nav/EncreVive";
import { EXA } from "@/lib/voice-moi-examen";
import s from "@/components/moi/synthese/Synthese.module.css";
import m from "@/components/moi/synthese/Examen.module.css";

// La carte « Ta progression » (petite, 5 colonnes) : la maîtrise globale de
// chacune des 12 dernières semaines puis d'aujourd'hui, sur un fond de zones, la
// projection au rythme des 4 dernières semaines (« 70 % vers le 12 déc. »),
// la superposition d'une matière (puces ; l'active porte le vrai liquide) et la
// phrase « Ce que ça veut dire ». Îlot client : le seul état est la matière
// superposée (l'index dans `progression.matieres`, null pour « Aucune »). Sous
// 3 points : un état vide qui invite à répondre.

const ID = "syn-progression";

/**
 * @param aujourdhui le jour (AAAA-MM-JJ, Paris) : sans lui, pas de date de projection ni de dates au-delà d'aujourd'hui
 * @param examen le jour de l'examen (null sans date ou une fois passé) : dit si le passage à 70 % tombe avant ou après
 * @param ilYa30 la maîtrise globale il y a 30 jours (`globale.ilYa[30]`) pour « +Y en 30 jours » ; null : les 4 dernières semaines
 * @param superposeeAuDepart l'index de la matière déjà superposée au premier rendu ; aucune par défaut
 */
export function Progression({
  progression,
  aujourdhui,
  examen,
  ilYa30 = null,
  superposeeAuDepart = null,
  className,
}: {
  progression: ProgressionSynthese;
  aujourdhui: string | null;
  examen: string | null;
  ilYa30?: number | null;
  superposeeAuDepart?: number | null;
  className?: string;
}) {
  const [sup, setSup] = useState<number | null>(superposeeAuDepart);
  const { points, dates, matieres } = progression;
  const classe = [s.carte, s.petite, className].filter(Boolean).join(" ");
  const titre = (
    <h2 id={ID} className={`font-brand ${s.titreCarte} ${m.titre}`}>
      <SceauUni>
        <TrendingUp size={15} aria-hidden />
      </SceauUni>
      {EXA.progression.titre}
    </h2>
  );

  if (points.length < POINTS_MIN_COURBE) {
    return (
      <section className={classe} aria-labelledby={ID}>
        <header className={m.entete}>
          {titre}
          <p className={s.sous}>{EXA.progression.sousVide}</p>
        </header>
        <p className={m.vide}>{EXA.progression.vide}</p>
        <Link href="/practice" className={`${s.lien} ${m.bas}`}>
          {EXA.progression.seance} →
        </Link>
      </section>
    );
  }

  const choix = sup !== null && sup >= 0 && sup < PUCES_MATIERES.length ? sup : null;
  const serie = choix !== null ? (matieres[choix] ?? []) : null;
  const court = choix !== null ? PUCES_MATIERES[choix].court : null;
  const proj = projection(points, aujourdhui, examen);
  const grande = geometrieCourbe(COURBE_GRANDE, points, dates, proj, aujourdhui);
  const petite = geometrieCourbe(COURBE_PETITE, points, dates, proj, aujourdhui);
  const tracer = (g: GeoCourbe) => (serie ? traceSuperpose(g, serie) : null);
  const traceGrande = tracer(grande);
  const aria = ariaCourbe(points, proj, court);
  const legendeRythme = legendeProjection(proj);
  const lecture = serie && court ? lectureMatiere(court, serie, points[points.length - 1]) : lectureCourbe(points, proj);

  return (
    <section className={classe} aria-labelledby={ID}>
      <header className={m.entete}>
        {titre}
        <p className={s.sous}>
          <Phrase segments={phraseGains(points, ilYa30)} />
        </p>
      </header>
      <Courbe g={grande} aria={aria} superpose={traceGrande} className={`${m.courbe} ${m.courbeGrande}`} />
      <Courbe g={petite} aria={aria} superpose={tracer(petite)} className={`${m.courbe} ${m.courbePetite}`} />
      <ul className={s.legende}>
        <li>
          <i className={s.trace} />
          {EXA.progression.legendeToi}
        </li>
        {legendeRythme && (
          <li>
            <i className={`${s.trace} ${s.traceRythme}`} />
            {legendeRythme}
          </li>
        )}
        <li>
          <i className={m.traitSeuil} />
          {EXA.progression.legendeSeuil}
        </li>
        {serie && court && (
          <li className={m.legendeSup}>
            <svg width="18" height="8" viewBox="0 0 18 8" aria-hidden style={{ flex: "none" }}>
              <line x1="1" y1="4" x2="17" y2="4" stroke={traceGrande?.rouge ? "var(--zone-rouge)" : "var(--violet)"} strokeWidth={3} strokeLinecap="round" />
            </svg>
            {legendeSuperposee(court, serie)}
          </li>
        )}
      </ul>
      <div className={m.puces}>
        <p className={`${s.eyebrow} ${m.eyebrowPetit}`}>{EXA.progression.superposer}</p>
        <div role="group" aria-label={EXA.progression.superposer} className={m.pucesListe}>
          {[{ cle: null as number | null, libelle: EXA.progression.aucune }, ...PUCES_MATIERES.map((p, i) => ({ cle: i as number | null, libelle: p.libelle }))].map((p) => {
            const on = p.cle === choix;
            return (
              <button key={p.cle ?? "aucune"} type="button" aria-pressed={on} className={on ? `${m.puce} rl-encre` : m.puce} data-palette={on ? PAL.key : undefined} onClick={() => setSup(p.cle)}>
                {on && <EncreVive tons={PAL.liquide} />}
                {p.libelle}
              </button>
            );
          })}
        </div>
      </div>
      <p className={`${s.pied} ${m.bas}`}>
        <b>{EXA.pied}</b> {lecture}
      </p>
    </section>
  );
}
