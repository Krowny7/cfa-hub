"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { MAITRISE, TEXTES_CAP } from "@/lib/codex/cap";
import { TEXTES_JOUR as T, acteEnCours, compteNeuf, etapesActe, preparationJour, objectifSemaine, resumeFait, resumeQuetesDuJour, resumeSemaine } from "@/lib/codex/aujourdhui";
import { gainsSeance } from "@/lib/codex/seance-etat";
import type { LigneQuete as Ligne, VueCodex } from "@/lib/codex/vue";
import { CODEX } from "@/lib/voice-codex";
import { Fil, FilNeuf } from "@/components/codex/Fil";
import { LigneQuete } from "@/components/codex/LigneQuete";
import { Recuperer } from "@/components/codex/Recuperer";
import { Lundi } from "@/components/codex/Lundi";
import { Plan } from "@/components/codex/Plan";
import { MotsMaison } from "@/components/codex/MotMaison";
import { etiquetteActe } from "@/components/codex/CarteCodex";
import s from "./Aujourdhui.module.css";

// Le segment « Aujourd'hui » de /codex (Codex simplifié, §3.3 et §3.4). Sur
// téléphone, dans l'ordre : « À récupérer » (s'il y a lieu), le fil (la
// séance en étapes, le seul bouton plein, ou « Tout récupérer » s'il y a
// quelque chose à récupérer), puis des replis d'une ligne : Quêtes du jour,
// Fait aujourd'hui, Préparation (dès 3 matières mesurées), l'acte en cours,
// Ta semaine. Sur ordinateur, deux colonnes : le fil à gauche (7/12), une
// colonne calme à droite (5/12) avec « À récupérer » et les replis. Le
// compte neuf n'a qu'une étape. `fil` faux : pas de séance (le jour J et le
// lendemain, on a posé le pinceau). `demo` : aperçus, aucune action serveur.

export function Aujourdhui({ vue, fil = true, demo = false, onQuete, onVue }: { vue: VueCodex; fil?: boolean; demo?: boolean; onQuete: (l: Ligne) => void; onVue?: (v: VueCodex) => void }) {
  const seance = fil && vue.seance?.blocs.length ? vue.seance : null;
  const gains = useMemo(() => (seance ? gainsSeance(seance.avant, vue) : []), [seance, vue]);
  const aRecuperer = vue.aRecuperer.length > 0;
  const neuf = compteNeuf(vue);
  const preparation = neuf ? null : preparationJour(vue.cap);
  const acte = acteEnCours(vue.trame);
  const contrats = [...vue.contrats.map((c) => c.ligne), ...(vue.debrief ? [vue.debrief] : [])];
  // « Tout récupérer » fini : le bloc dit lui-même « Fait aujourd'hui » (pas deux fois la même liste)
  const [recupere, setRecupere] = useState(false);

  return (
    <div className={s.grille}>
      {/* toujours monté : la page rafraîchie au clic vide la liste, le geste et les fêtes continuent (vide, il ne rend rien) */}
      <div className={s.zoneRecuperer}>
        <Recuperer items={vue.aRecuperer} jour={vue.jour} fait={vue.faitAujourdhui} sobre={vue.sobre} demo={demo} onFini={() => setRecupere(true)} />
      </div>

      <div className={s.zoneFil}>{neuf ? <FilNeuf plein={!aRecuperer} /> : seance ? <Fil seance={seance} vue={vue} gains={gains} plein={!aRecuperer} demo={demo} /> : null}</div>

      <div className={`card-quiet ${s.replis}`}>
        {contrats.length > 0 && (
          <details className={s.pli}>
            <summary>
              {T.quetesDuJour} <span className={s.val}>{resumeQuetesDuJour(vue.trio, vue.sobre)}</span>
            </summary>
            <div className={s.pliCorps}>
              {contrats.map((l) => (
                <LigneQuete key={l.id + l.periode} l={l} sobre={vue.sobre} onOuvrir={onQuete} />
              ))}
            </div>
          </details>
        )}

        {!recupere && (
        <details className={s.pli}>
          <summary>
            {T.fait} <span className={s.val}>{resumeFait(vue.faitAujourdhui, vue.sobre)}</span>
          </summary>
          <div className={s.pliCorps}>
            {vue.faitAujourdhui.quetes.length ? (
              <ul className={s.faitListe}>
                {vue.faitAujourdhui.quetes.map((q) => (
                  <li key={q.quete + q.periode}>
                    <span className="min-w-0">{q.titre}</span>
                    {!vue.sobre && q.xp > 0 && <span className="t-micro t-num">+{q.xp} XP</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="t-small m-0">{T.rienFait}</p>
            )}
          </div>
        </details>
        )}

        {preparation && (
          <details className={s.pli} data-leonard="cap">
            <summary>
              {T.preparation} <span className={s.val}>{preparation.pct} %</span>
            </summary>
            <div className={s.pliCorps}>
              <ol className={s.regle} aria-hidden>
                {vue.cap!.matieres.map((m) => (
                  <li key={m.cle} data-zone={m.zone ?? "aucune"} data-hachure={m.statut !== "mesuree" ? "1" : undefined} style={{ flexGrow: m.part }} />
                ))}
              </ol>
              <p className="t-micro m-0">{preparation.valeurs}</p>
              <p className="t-micro m-0">Repère : {MAITRISE.REPERE} %</p>
              {preparation.faible && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <p className="t-small m-0">
                    <b>{T.coute}</b> {preparation.faible.texte}
                  </p>
                  {vue.cap!.destination && (
                    <Link href={vue.cap!.destination.href} className="btn btn-secondary btn-sm rl-press min-h-[44px]">
                      {vue.cap!.destination.libelle}
                    </Link>
                  )}
                </div>
              )}
              <p className="t-micro m-0">{TEXTES_CAP.pronostic}</p>
            </div>
          </details>
        )}

        {acte && (
          <details className={s.pli}>
            <summary>
              {etiquetteActe(acte.acte)} · {acte.acte.titre}{" "}
              <span className={s.val}>
                · {acte.faites} sur {acte.total}
              </span>
            </summary>
            <div className={s.pliCorps}>
              {acte.acte.but && <p className="t-small m-0">But : {acte.acte.but}</p>}
              {etapesActe(acte).map((l) => (
                <LigneQuete key={l.id + l.periode} l={l} sobre={vue.sobre} onOuvrir={onQuete} />
              ))}
            </div>
          </details>
        )}

        <TaSemaine vue={vue} demo={demo} onQuete={onQuete} onVue={onVue} />
      </div>
    </div>
  );
}

/**
 * « Ta semaine ▸ » : l'objectif choisi le lundi (la carte du lundi, repliée
 * comme le reste : un écran n'a qu'un bouton plein, celui du fil), le plan, les quêtes de la semaine, « jusqu'à
 * dimanche ». Dans « Aujourd'hui » et dans « Tout le Codex ». Rien à dire :
 * pas de repli.
 */
export function TaSemaine({ vue, demo = false, onQuete, onVue, ligne }: { vue: VueCodex; demo?: boolean; onQuete: (l: Ligne) => void; onVue?: (v: VueCodex) => void; ligne?: (l: Ligne) => React.ReactNode }) {
  const hebdo = vue.hebdo.filter((l) => l.affichage !== "cache");
  const objectif = objectifSemaine(vue.rythme?.semaine);
  if (!(hebdo.length > 0 || !!objectif || !!vue.rythme?.lundi || !!vue.rythme?.plan)) return null;
  return (
    <details className={s.pli}>
      <summary>
        {T.semaine} {hebdo.length > 0 && <span className={s.val}>{resumeSemaine(hebdo)}</span>}
      </summary>
      <div className={s.pliCorps}>
        {objectif && <p className="t-small m-0">{objectif}</p>}
        {/* le choix du lundi se dit en jours d'encre : le mot a sa définition, au doigt (§4.4) */}
        <MotsMaison textes={[objectif, vue.rythme?.lundi ? "jours d'encre" : null]} />
        {vue.rythme?.lundi && <Lundi lundi={vue.rythme.lundi} demo={demo} onVue={onVue} />}
        {vue.rythme?.plan && <Plan plan={vue.rythme.plan} jour={vue.jour} />}
        {hebdo.map((l) => (ligne ? <Fragment key={l.id + l.periode}>{ligne(l)}</Fragment> : <LigneQuete key={l.id + l.periode} l={l} sobre={vue.sobre} onOuvrir={onQuete} />))}
        {hebdo.length > 0 && <p className="t-micro m-0">{CODEX.contrats.semaine} : {T.jusquaDimanche}</p>}
      </div>
    </details>
  );
}
