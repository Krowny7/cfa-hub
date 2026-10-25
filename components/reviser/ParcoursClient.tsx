"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { COURS_PROGRAMME, MINUTES_COURS, ONDE, carteCours, heuresMinutes, mmss } from "@/components/reviser/parcours";
import { EncreVive } from "@/components/nav/EncreVive";
import { lireEcoute, type EcouteCours } from "@/lib/course-ecoute";
import { PALETTES } from "@/lib/palettes";
import { ecrireSansCalcul, lireSansCalcul } from "@/lib/sans-calcul";
import { CARNET } from "@/lib/voice-z1";
import { RV } from "@/lib/voice-reviser";
import s from "./Parcours.module.css";

// Les deux morceaux de la page Réviser qui lisent l'appareil (localStorage) :
// la carte « Cours complets » (le dernier cours ouvert et sa position) et,
// dans le registre de l'Atelier, la jauge et l'interrupteur « Sans calcul » du carnet. Le serveur rend l'état sans
// historique ; l'appareil n'est lu qu'après le montage (pas d'écart de rendu).
// `apercu` : l'écoute d'exemple des aperçus, à la place de l'appareil.
// La carte du cours est une carte sombre unie (noyer ; pas d'encre : demande
// de l'utilisateur). Son bouton est rempli du vrai fluide de l'onglet
// « Réviser » (EncreVive, palette studiolo ; texture de repli et voile :
// .rl-encre de globals.css) ; sa pastille d'étape, de la texture qui dérive.
// Les variables --pal-* viennent de la racine de la page (ReviserView). La
// carte garde .card-ink : en mode discret, la carte sombre neutre du site.

const SLUGS = COURS_PROGRAMME.map((c) => c.slug);
const PAL = PALETTES.studiolo;

export function CarteCoursComplets({ apercu }: { apercu?: EcouteCours | null }) {
  const [ecoute, setEcoute] = useState<EcouteCours | null>(apercu ?? null);
  const [depuisAppareil, setDepuisAppareil] = useState(false);
  useEffect(() => {
    if (apercu !== undefined) return;
    const e = lireEcoute(SLUGS);
    const avant = carteCours(null);
    const apres = carteCours(e);
    setEcoute(e);
    // un court fondu seulement si la carte change (un cours repris, des matières soulignées)
    if (JSON.stringify(avant) !== JSON.stringify(apres)) setDepuisAppareil(true);
  }, [apercu]);

  const c = carteCours(ecoute);
  if (!c) return null;
  const ou = c.mode === "reprise" ? `${mmss(c.position)} / ${mmss(c.total)}` : `${c.minutes} min`;
  const action = c.mode === "reprise" ? RV.coursReprendre : RV.coursCommencer;

  return (
    <li className={"card-ink " + s.carte + " " + s.c1} data-leonard="cours">
      <div className={s.haut}>
        <span className={"rl-encre " + s.etape + " " + s.encre + " t-num"} data-palette={PAL.key} aria-hidden>
          1
        </span>
        <span className={s.eyebrow}>{RV.coursEtape}</span>
        <span className={s.droite + " " + s.mono}>{RV.coursAudio(heuresMinutes(MINUTES_COURS))}</span>
      </div>
      <div>
        <h3 className={s.c1Titre}>{RV.coursTitre}</h3>
        <p className={s.sous}>{RV.coursSous}</p>
      </div>
      <div key={c.slug + c.mode} className={s.c1Corps + (depuisAppareil ? " " + s.arrive : "")}>
        {/* le lecteur : ouvre le cours en cours (ou le premier) ; le bouton du bas mène à la page des cours */}
        <Link href={c.href} className={s.lecteur} aria-label={RV.coursLecteur(action, `${c.titre}, ${ou}`)}>
          <span className={s.play}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M6 4l14 8-14 8z" />
            </svg>
          </span>
          <span className={s.piste}>
            <span className={s.l1}>
              <b>{c.titre}</b>
              <span className={s.temps + " " + s.mono}>{ou}</span>
            </span>
            <span className={s.chap}>{c.module ? RV.coursModule(c.module.n, c.module.titre) : RV.coursModules(c.modules)}</span>
            <span className={s.onde}>
              {ONDE.map((h, i) => (
                <i key={i} style={{ height: h }} className={i < c.barresLues ? s.lu : undefined} />
              ))}
            </span>
          </span>
        </Link>
        <ul className={s.matieres} aria-label={RV.coursMatieres}>
          {c.matieres.map((m) => {
            const pct = Math.round(m.part * 100);
            return (
              <li key={m.key} className={pct > 0 ? s.fait : undefined} style={pct > 0 ? ({ "--p": m.part } as React.CSSProperties) : undefined} title={RV.coursMatiere(m.nom, pct)}>
                <span aria-hidden>{m.code}</span>
                <span className="sr-only">{RV.coursMatiere(m.nom, pct)}</span>
              </li>
            );
          })}
        </ul>
        <div className={s.bas}>
          <Link href="/courses" className={"rl-encre " + s.bouton + " " + s.encre} data-palette={PAL.key} aria-label={`${RV.coursOuvrir} (${RV.coursTous(COURS_PROGRAMME.length)})`}>
            <EncreVive tons={PAL.liquide} />
            {RV.coursOuvrir}
          </Link>
        </div>
      </div>
    </li>
  );
}

/**
 * La ligne du carnet, côté appareil : la jauge « sans calcul / à calcul » des
 * ratures en cours et l'interrupteur « Sans calcul » de cet appareil (la même
 * clé que Moi › Erreurs), qui partagent leur état : allumé, la part « à
 * calcul » s'efface. Coupé au rendu serveur, relu après le montage.
 * `masquees` : les ratures à calcul en cours (null : inconnu, pas de jauge).
 */
export function CalculCarnet({ enCours, masquees, apercu }: { enCours: number; masquees: number | null; apercu?: boolean }) {
  const [on, setOn] = useState(apercu ?? false);
  useEffect(() => {
    if (apercu === undefined) setOn(lireSansCalcul());
  }, [apercu]);
  const etat = !on ? RV.carnetCalculCoupe : masquees === null ? RV.carnetCalculActif : masquees > 0 ? CARNET.calculMasquees(masquees) : CARNET.sansCalculAucune;
  const aCalcul = masquees === null ? 0 : Math.min(masquees, enCours);
  const sansCalcul = enCours - aCalcul;
  return (
    <>
      {masquees !== null && enCours > 0 && (
        <span className={s.calcul} data-on={on ? "1" : undefined}>
          <span className={s.calculBarre} aria-hidden>
            {sansCalcul > 0 && <i className={s.partSans} style={{ flexGrow: sansCalcul }} />}
            {aCalcul > 0 && <i className={s.partAvec} style={{ flexGrow: aCalcul }} />}
          </span>
          <span className={s.calculLegende}>
            <span className={s.calculSans}>{RV.carnetSansCalcul(sansCalcul)}</span>
            <span aria-hidden> · </span>
            <span className={s.calculAvec}>{RV.carnetACalcul(aCalcul)}</span>
          </span>
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        className={s.bascule}
        title={CARNET.sansCalculSous}
        onClick={() => {
          const v = !on;
          setOn(v);
          if (apercu === undefined) ecrireSansCalcul(v);
        }}
      >
        <span aria-hidden className={"switch" + (on ? " is-on" : "")} />
        <span>
          <b>{CARNET.sansCalcul}</b> · {etat}
        </span>
      </button>
    </>
  );
}
