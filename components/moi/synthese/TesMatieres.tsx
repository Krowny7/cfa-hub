"use client";

import { useRef, useState } from "react";
import { Gem, Lightbulb } from "lucide-react";
import { Phrase, SceauUni } from "@/components/moi/synthese/Encre";
import { BarresZones } from "@/components/moi/synthese/graphes/BarresZones";
import { Radar } from "@/components/moi/synthese/graphes/Radar";
import { FicheVue, VueEnsemble } from "@/components/moi/synthese/MatiereFiche";
import { Selecteur, type OptionSelecteur } from "@/components/moi/synthese/Selecteur";
import {
  RADAR_GRAND,
  RADAR_PETIT,
  SEUIL_ACQUIS,
  SEUIL_BAS,
  comparaisonParDefaut,
  comparaisonsDispo,
  ensembleMatieres,
  etiquettesRadar,
  ficheMatiere,
  geometrieRadar,
  lignesBarres,
  phraseMatieres,
  type Comparaison,
  type TriMatieres,
  type VueMatieres,
} from "@/components/moi/synthese/modele";
import type { GlobaleSynthese, MatiereSynthese, NotionSynthese } from "@/components/moi/synthese/types";
import { SYN } from "@/lib/voice-moi";
import s from "@/components/moi/synthese/Synthese.module.css";

// « Tes matières » (grande carte, id="matieres") : la maîtrise des dix matières
// en radar ou en barres, face à « toi il y a 3, 30, 60 ou 90 jours » quand
// l'historique répond (30 jours à l'ouverture), et un panneau qui montre la vue
// d'ensemble ou la fiche de la matière choisie (ses notions, son évolution, quoi
// réviser). Quand activite_depuis répond, le panneau dit aussi, en petit, combien
// de réponses ont été données sur la période, et une matière sans réponse n'a
// pas d'écart (son ±0 ne dirait rien). Îlot client :
// quatre états seulement (la vue, la comparaison, le tri, la matière ouverte),
// ni contexte ni URL. Les nombres et les dates viennent déjà écrits du serveur
// ou de modele.ts (aucun Intl : pas d'écart d'hydratation). L'encre vive n'a que
// trois places ici : l'option active de chaque sélecteur et « Réviser X ».

const ID = "syn-matieres";
const M = SYN.matieres;
const OPT_VUE: OptionSelecteur<VueMatieres>[] = [
  { cle: "radar", libelle: M.affichage.radar },
  { cle: "barres", libelle: M.affichage.barres },
];
const OPT_TRI: OptionSelecteur<TriMatieres>[] = [
  { cle: "programme", libelle: M.tri.programme },
  { cle: "faible", libelle: M.tri.faible },
];
const classes = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export type TesMatieresProps = {
  matieres: MatiereSynthese[];
  globale: GlobaleSynthese | null;
  /** les 93 notions ; null : la fiche n'a pas de colonne de notions */
  notions: NotionSynthese[] | null;
  sourceNotions: "unique" | "90j" | null;
};

export function TesMatieres({ matieres, globale, notions, sourceNotions }: TesMatieresProps) {
  const dispo = comparaisonsDispo(globale);
  const [vue, setVue] = useState<VueMatieres>("radar");
  const [comp, setComp] = useState<Comparaison | null>(comparaisonParDefaut(dispo));
  const [tri, setTri] = useState<TriMatieres>("programme");
  const [mat, setMat] = useState<number | null>(null);
  const panneau = useRef<HTMLElement | null>(null);
  const source = sourceNotions ?? "unique";

  /** Ouvre la fiche d'une matière (ou la referme au second clic) ; sur un écran étroit, le panneau est sous le graphique : on l'amène à l'écran. */
  function choisir(i: number) {
    const ouvre = mat !== i;
    setMat(ouvre ? i : null);
    if (ouvre && typeof window !== "undefined") {
      const calme = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.requestAnimationFrame(() => panneau.current?.scrollIntoView({ block: "nearest", behavior: calme ? "auto" : "smooth" }));
    }
  }

  const valeurs = matieres.map((m) => m.pct);
  const avant = comp !== null ? matieres.map((m) => m.ilYa?.[comp] ?? null) : null;
  const fiche = mat !== null && matieres[mat] ? ficheMatiere(matieres[mat], mat, comp, notions, source) : null;
  const L = M.legende;
  const optComp: OptionSelecteur<Comparaison>[] = dispo.map((j) => ({ cle: j, libelle: M.comparer.option(j) }));

  return (
    <section className={classes(s.carte, s.grande, s.ancre)} id="matieres" aria-labelledby={ID}>
      <header className={classes(s.tete, s.teteMat)}>
        <div className={s.teteBloc}>
          <h2 id={ID} className={classes("font-brand", s.titreCarte, s.titreSceau)}>
            <SceauUni grand>
              <Gem size={18} aria-hidden />
            </SceauUni>
            {M.titre}
          </h2>
          <p className={s.sous}>
            <Phrase segments={M.definition(SEUIL_ACQUIS)} />
          </p>
        </div>
        <Selecteur label={M.affichage.label} options={OPT_VUE} valeur={vue} onChoisir={setVue} className={s.segVue} />
      </header>

      <div className={s.commande}>
        {optComp.length > 0 && comp !== null && (
          <div className={s.comparer}>
            <span className={s.eyebrow}>{M.comparer.eyebrow}</span>
            <span className={s.comparerToi}>{M.comparer.toi}</span>
            <Selecteur label={M.comparer.label} options={optComp} valeur={comp} onChoisir={setComp} mode="etroit" />
          </div>
        )}
        {vue === "radar" ? (
          <ul className={s.legende}>
            <li>
              <i className={s.trace} />
              {L.toi}
            </li>
            {comp !== null && (
              <li>
                <i className={classes(s.trace, s.traceCmp)} />
                {L.avant(comp)}
              </li>
            )}
            <li>
              <i className={classes(s.trace, s.traceSeuil)} />
              {L.seuil(SEUIL_ACQUIS)}
            </li>
            <li>
              <i className={classes(s.sw, s.swZR)} />
              {L.sous50(SEUIL_BAS)}
            </li>
            <li>
              <i className={classes(s.sw, s.swZA)} />
              {L.entre(SEUIL_BAS, SEUIL_ACQUIS)}
            </li>
          </ul>
        ) : (
          <ul className={s.legende}>
            <li>
              <i className={classes(s.sw, s.swR)} />
              {L.sous50(SEUIL_BAS)}
            </li>
            <li>
              <i className={classes(s.sw, s.swA)} />
              {L.entre(SEUIL_BAS, SEUIL_ACQUIS)}
            </li>
            <li>
              <i className={classes(s.sw, s.swE)} />
              {L.acquis}
            </li>
            {comp !== null && (
              <li>
                <i className={s.swRepere} />
                {L.repere(comp)}
              </li>
            )}
            <li>
              <i className={classes(s.trace, s.traceSeuil)} />
              {L.seuil(SEUIL_ACQUIS)}
            </li>
          </ul>
        )}
      </div>

      <div className={s.matCorps}>
        <div className={classes(s.hud, s.matGraphe)}>
          {vue === "radar" ? (
            <Radar
              grand={geometrieRadar(RADAR_GRAND, valeurs, avant, mat)}
              petit={geometrieRadar(RADAR_PETIT, valeurs, avant, mat)}
              etiquettes={etiquettesRadar(matieres, comp, mat)}
              aria={M.radarAria(comp)}
              onChoisir={choisir}
            />
          ) : (
            <div className={s.barresBoite}>
              <div className={s.barresTete}>
                <span className={s.barresAide}>{M.barres.aide}</span>
                <Selecteur label={M.tri.label} options={OPT_TRI} valeur={tri} onChoisir={setTri} />
              </div>
              <BarresZones lignes={lignesBarres(matieres, comp, tri, mat)} onChoisir={choisir} />
            </div>
          )}
        </div>
        <aside ref={panneau} className={s.fiche} aria-label={M.fiche.aria} aria-live="polite">
          {fiche ? (
            <FicheVue f={fiche} comp={comp} source={source} onFermer={() => setMat(null)} />
          ) : (
            <VueEnsemble e={ensembleMatieres(matieres, globale, comp)} comp={comp} avecNotions={!!notions && notions.length > 0} avecEvolution={comp !== null} onOuvrir={choisir} />
          )}
        </aside>
      </div>

      <p className={s.lire}>
        <Lightbulb size={16} aria-hidden />
        <span>
          <b>{M.pied}</b> {phraseMatieres({ matieres, globale, comp, mat, notions })}
        </span>
      </p>
    </section>
  );
}
