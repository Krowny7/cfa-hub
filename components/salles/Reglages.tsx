"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Play } from "lucide-react";
import { MIX_DEFAUT } from "@/lib/calc/session";
import {
  SALLE_DIFFICULTES,
  SALLE_DIFFICULTE_LABELS,
  SALLE_NOMBRE_MAX,
  SALLE_NOMBRE_MIN,
  SALLE_PART_CALCULS_DEFAUT,
  SALLE_PART_CALCULS_MAX,
  SALLE_PART_CALCULS_MIN,
  SALLE_SOURCES,
  SALLE_TEMPS_PROPOSES,
  SALLE_TOPIC_KEYS,
  SALLE_TYPE_LABELS,
  dureeEstimee,
  libelleDuree,
  libelleParams,
  paramsParDefaut,
  repartirNombre,
  validerParams,
} from "@/lib/salles/logique";
import type { QuestionsDisponibles, SalleDifficulte, SalleParams, SalleSource, SalleType, TopicKey } from "@/lib/salles/types";
import { flechesRadios } from "@/components/salles/radios";
import { MATIERES_COURTES } from "@/lib/voice-classement";
import { REGLAGES } from "@/lib/voice-salles";
import s from "./Salles.module.css";

// Les réglages de l'admin, le formulaire qui lance la partie. Tout se règle
// ici, avec des valeurs par défaut sensées (10 questions, banque complète, les
// 10 matières, difficulté mélangée, 45 s) ou, après une première partie, les
// réglages de la dernière :
//  - ce qu'on joue : questions, calculs, ou les deux mêlés (avec la part des
//    calculs) ;
//  - le nombre (5 à 50), la source des questions (banque complète / examens
//    blancs), les matières (cases, « Toutes »), la difficulté (facile, moyen,
//    difficile ou mélangée), le temps par question (15 à 120 s) ;
//  - un résumé en direct (durée estimée, nombre de questions disponibles).
// Le formulaire ne sait pas lancer lui-même : `onLancer` appelle l'action
// serveur (app/salles/actions.ts), qui tire les calculs côté serveur. Les
// effectifs de la banque (par matière) viennent de `chargerDispos` ; sans lui,
// pas de décompte. Les non-admins voient ReglagesLecture.

export type RetourLancement = { ok: true; message?: string } | { ok: false; erreur: string };

const TYPES: { cle: SalleType; nom: string; aide: string }[] = [
  { cle: "questions", nom: REGLAGES.typeQuestions, aide: REGLAGES.typeQuestionsAide },
  { cle: "calculs", nom: REGLAGES.typeCalculs, aide: REGLAGES.typeCalculsAide },
  { cle: "mixte", nom: REGLAGES.typeMixte, aide: REGLAGES.typeMixteAide },
];
const SOURCES: { cle: SalleSource; nom: string; aide: string }[] = [
  { cle: "banque", nom: REGLAGES.sourceBanque, aide: REGLAGES.sourceBanqueAide },
  { cle: "mocks", nom: REGLAGES.sourceMocks, aide: REGLAGES.sourceMocksAide },
];

/** Combien de questions offrent les matières cochées, à la difficulté choisie ; null : pas encore lu. */
export function disponibles(dispos: QuestionsDisponibles[] | null | undefined, topics: TopicKey[], difficulte: SalleDifficulte): number | null {
  if (!dispos) return null;
  return dispos.filter((d) => topics.includes(d.topic)).reduce((t, d) => t + (difficulte === "melange" ? d.total : d[difficulte]), 0);
}

/** Les réglages de départ : ceux de la dernière partie, sinon les valeurs par défaut. */
export function reglagesDeDepart(precedents?: Partial<SalleParams> | null): SalleParams {
  const v = validerParams({ ...paramsParDefaut(), ...(precedents ?? {}) });
  return v.ok ? v.params : paramsParDefaut();
}

export function Reglages({
  initial,
  chargerDispos,
  onLancer,
  desactive = false,
  demoDispos,
}: {
  /** les réglages de la dernière partie, s'il y en a une */
  initial?: Partial<SalleParams> | null;
  /** lit les effectifs de la banque par matière pour une source ; null : indisponible */
  chargerDispos?: (source: SalleSource) => Promise<QuestionsDisponibles[] | null>;
  onLancer: (params: SalleParams) => Promise<RetourLancement>;
  /** une partie est déjà en cours : on ne lance rien */
  desactive?: boolean;
  /** aperçus : des effectifs d'exemple, sans lecture */
  demoDispos?: Partial<Record<SalleSource, QuestionsDisponibles[]>>;
}) {
  const uid = useId();
  const depart = useMemo(() => reglagesDeDepart(initial), [initial]);
  const [params, setParams] = useState<SalleParams>(depart);
  const [partMixte, setPartMixte] = useState(depart.type === "mixte" ? depart.partCalculs : SALLE_PART_CALCULS_DEFAUT);
  const [dispos, setDispos] = useState<Partial<Record<SalleSource, QuestionsDisponibles[] | null>>>(demoDispos ?? {});
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<RetourLancement | null>(null);

  const set = (p: Partial<SalleParams>) => {
    setParams((prev) => ({ ...prev, ...p }));
    setRetour(null);
  };
  const reel: SalleParams = {
    ...params,
    partCalculs: params.type === "calculs" ? 100 : params.type === "mixte" ? partMixte : 0,
    source: params.type === "calculs" ? "banque" : params.source,
  };
  const { questions: nbQuestions, calculs: nbCalculs } = repartirNombre(reel);

  // les effectifs de la source choisie, lus une fois par source (sauf calculs seuls)
  const besoinSource = params.type !== "calculs" ? params.source : null;
  useEffect(() => {
    if (!besoinSource || !chargerDispos || dispos[besoinSource] !== undefined) return;
    let fini = false;
    chargerDispos(besoinSource)
      .then((d) => !fini && setDispos((prev) => ({ ...prev, [besoinSource]: d })))
      .catch(() => !fini && setDispos((prev) => ({ ...prev, [besoinSource]: null })));
    return () => {
      fini = true;
    };
  }, [besoinSource, chargerDispos, dispos]);

  const dispoSource = besoinSource ? dispos[besoinSource] : undefined;
  const dispo = nbQuestions > 0 ? disponibles(dispoSource, reel.topics, reel.difficulte) : null;
  const toutes = reel.topics.length === SALLE_TOPIC_KEYS.length;

  function basculerTopic(k: TopicKey) {
    const a = new Set(params.topics);
    if (a.has(k)) a.delete(k);
    else a.add(k);
    set({ topics: SALLE_TOPIC_KEYS.filter((x) => a.has(x)) });
  }

  async function lancer(e: React.FormEvent) {
    e.preventDefault();
    if (envoi || desactive) return;
    const v = validerParams(reel);
    if (!v.ok) {
      setRetour({ ok: false, erreur: v.erreurs.map((x) => x.message).join(" ") });
      return;
    }
    setEnvoi(true);
    setRetour(null);
    try {
      setRetour(await onLancer(v.params));
    } catch {
      setRetour({ ok: false, erreur: REGLAGES.erreurReseau });
    }
    setEnvoi(false);
  }

  const dureeS = dureeEstimee(reel);
  return (
    <form className={s.reglages} onSubmit={lancer} aria-label={REGLAGES.titre} noValidate>
      {/* ——— ce qu'on joue ——— */}
      <fieldset className={s.bloc}>
        <legend className={s.libelle}>{REGLAGES.type}</legend>
        <div className={s.choix} role="radiogroup" aria-label={REGLAGES.type} onKeyDown={flechesRadios}>
          {TYPES.map((t) => (
            <button key={t.cle} type="button" role="radio" aria-checked={params.type === t.cle} tabIndex={params.type === t.cle ? 0 : -1} className={s.puce} onClick={() => set({ type: t.cle })}>
              <b>{t.nom}</b>
              <span>{t.aide}</span>
            </button>
          ))}
        </div>
        {params.type === "mixte" && (
          <div className={s.bloc}>
            <div className={s.blocTete}>
              <label htmlFor={`${uid}-part`} className={s.libelle}>
                {REGLAGES.partCalculs}
              </label>
              <span className={s.valeur}>
                {partMixte} <small>%</small>
              </span>
            </div>
            <input
              id={`${uid}-part`}
              type="range"
              className={s.curseur}
              min={SALLE_PART_CALCULS_MIN}
              max={SALLE_PART_CALCULS_MAX}
              step={5}
              value={partMixte}
              aria-valuetext={`${partMixte} %, ${REGLAGES.partCalculsValeur(nbCalculs, nbQuestions)}`}
              onChange={(e) => {
                setPartMixte(Number(e.target.value));
                setRetour(null);
              }}
            />
            <p className={s.aide}>{REGLAGES.partCalculsValeur(nbCalculs, nbQuestions)}</p>
          </div>
        )}
      </fieldset>

      {/* ——— combien ——— */}
      <div className={s.bloc}>
        <div className={s.blocTete}>
          <label htmlFor={`${uid}-nombre`} className={s.libelle}>
            {REGLAGES.nombre}
          </label>
          <span className={s.valeur}>
            {params.nombre} <small>{REGLAGES.nombreUnite}</small>
          </span>
        </div>
        <input
          id={`${uid}-nombre`}
          type="range"
          className={s.curseur}
          min={SALLE_NOMBRE_MIN}
          max={SALLE_NOMBRE_MAX}
          step={5}
          value={params.nombre}
          onChange={(e) => set({ nombre: Number(e.target.value) })}
        />
        <div className={s.graduation} aria-hidden>
          <span>{SALLE_NOMBRE_MIN}</span>
          <span>{SALLE_NOMBRE_MAX}</span>
        </div>
      </div>

      {/* ——— d'où ——— */}
      <fieldset className={s.bloc}>
        <legend className={s.libelle}>{REGLAGES.source}</legend>
        {params.type === "calculs" ? (
          <p className={s.aide}>{REGLAGES.sourceCalculs}</p>
        ) : (
          <div className={s.choix} role="radiogroup" aria-label={REGLAGES.source} onKeyDown={flechesRadios}>
            {SOURCES.map((o) => (
              <button key={o.cle} type="button" role="radio" aria-checked={params.source === o.cle} tabIndex={params.source === o.cle ? 0 : -1} className={s.puce} onClick={() => set({ source: o.cle })}>
                <b>{o.nom}</b>
                <span>{o.aide}</span>
              </button>
            ))}
          </div>
        )}
      </fieldset>

      {/* ——— les matières ——— */}
      <div className={s.bloc} role="group" aria-labelledby={`${uid}-matieres`}>
        <div className={s.blocTete}>
          <span id={`${uid}-matieres`} className={s.libelle}>
            {REGLAGES.topics}
          </span>
          <div className={s.raccourcis}>
            <button type="button" className={[s.btn, s.btnDiscret].join(" ")} aria-pressed={toutes} onClick={() => set({ topics: [...SALLE_TOPIC_KEYS] })}>
              {REGLAGES.topicsToutes}
            </button>
            <button type="button" className={[s.btn, s.btnDiscret].join(" ")} onClick={() => set({ topics: [] })}>
              {REGLAGES.topicsAucune}
            </button>
          </div>
        </div>
        <div className={s.topics}>
          {SALLE_TOPIC_KEYS.map((k) => {
            const on = params.topics.includes(k);
            const d = dispoSource?.find((x) => x.topic === k);
            const n = d ? (reel.difficulte === "melange" ? d.total : d[reel.difficulte]) : null;
            return (
              <label key={k} className={s.topic} data-on={on ? "1" : "0"}>
                <input type="checkbox" className={s.coche} checked={on} onChange={() => basculerTopic(k)} />
                <span className={s.topicNom}>{MATIERES_COURTES[k] ?? k}</span>
                {nbQuestions > 0 && n !== null && <span className={s.topicDispo} title={`${n}`}>{REGLAGES.dispo(n)}</span>}
              </label>
            );
          })}
        </div>
        <p className={s.aide}>{REGLAGES.topicsCompte(reel.topics.length, SALLE_TOPIC_KEYS.length)}</p>
      </div>

      {/* ——— la difficulté ——— */}
      <fieldset className={s.bloc}>
        <legend className={s.libelle}>{REGLAGES.difficulte}</legend>
        <div className={[s.choix, s.choixPetits].join(" ")} role="radiogroup" aria-label={REGLAGES.difficulte} onKeyDown={flechesRadios}>
          {SALLE_DIFFICULTES.map((d) => (
            <button key={d} type="button" role="radio" aria-checked={params.difficulte === d} tabIndex={params.difficulte === d ? 0 : -1} className={[s.puce, s.puceCourte].join(" ")} onClick={() => set({ difficulte: d })}>
              <b>{SALLE_DIFFICULTE_LABELS[d]}</b>
            </button>
          ))}
        </div>
        {params.difficulte === "melange" && <p className={s.aide}>{REGLAGES.melangeAide(MIX_DEFAUT.facile, MIX_DEFAUT.moyen, MIX_DEFAUT.difficile)}</p>}
      </fieldset>

      {/* ——— le temps ——— */}
      <div className={s.bloc} role="group" aria-labelledby={`${uid}-temps`}>
        <div className={s.blocTete}>
          <span id={`${uid}-temps`} className={s.libelle}>
            {REGLAGES.temps}
          </span>
          <span className={s.valeur}>
            {params.temps} <small>s</small>
          </span>
        </div>
        <div className={[s.choix, s.choixPetits].join(" ")} role="radiogroup" aria-label={REGLAGES.temps} onKeyDown={flechesRadios}>
          {SALLE_TEMPS_PROPOSES.map((t) => (
            <button key={t} type="button" role="radio" aria-checked={params.temps === t} tabIndex={params.temps === t ? 0 : -1} className={[s.puce, s.puceCourte].join(" ")} onClick={() => set({ temps: t })}>
              <b>{REGLAGES.tempsValeur(t)}</b>
            </button>
          ))}
        </div>
        <p className={s.aide}>{REGLAGES.pointsAide}</p>
      </div>

      {/* ——— le résumé et le lancement ——— */}
      <div className={s.recap} aria-live="polite">
        <p className={s.recapLigne}>{libelleParams(reel)}</p>
        <p className={s.aide}>{REGLAGES.duree(libelleDuree(dureeS))}</p>
        {reel.topics.length === 0 && <p className={s.erreur}>{REGLAGES.aucuneMatiere}</p>}
        {dispo !== null && dispo === 0 && reel.topics.length > 0 && <p className={s.erreur}>{REGLAGES.aucune}</p>}
        {dispo !== null && dispo > 0 && dispo < nbQuestions && <p className={s.info}>{REGLAGES.peu(dispo, nbQuestions)}</p>}
        {besoinSource && dispoSource === undefined && chargerDispos && <p className={s.aide}>{REGLAGES.chargement}</p>}
      </div>

      <div className={s.lancement}>
        <button type="submit" className={[s.btn, s.btnPrimaire].join(" ")} disabled={envoi || desactive || reel.topics.length === 0}>
          <Play size={20} aria-hidden /> {envoi ? REGLAGES.lancerEnCours : REGLAGES.lancer}
        </button>
        <p className={s.aide}>{REGLAGES.lancerAide}</p>
        {retour && !retour.ok && (
          <p role="alert" className={s.erreur}>
            {retour.erreur}
          </p>
        )}
        {retour && retour.ok && (
          <p role="status" className={s.info}>
            {retour.message ?? REGLAGES.lancee}
          </p>
        )}
      </div>
    </form>
  );
}

/** Les réglages d'une partie en lecture seule (les membres, l'historique). */
export function ReglagesLecture({ params, titre }: { params: SalleParams; titre?: string }) {
  const lignes: [string, string][] = [
    [REGLAGES.type, SALLE_TYPE_LABELS[params.type]],
    [REGLAGES.nombre, params.type === "mixte" ? `${params.nombre} (${REGLAGES.partCalculsValeur(repartirNombre(params).calculs, repartirNombre(params).questions)})` : String(params.nombre)],
  ];
  if (params.type !== "calculs") lignes.push([REGLAGES.source, params.source === "mocks" ? REGLAGES.sourceMocks : REGLAGES.sourceBanque]);
  lignes.push(
    [REGLAGES.topics, params.topics.length === SALLE_TOPIC_KEYS.length ? REGLAGES.topicsCompte(params.topics.length, SALLE_TOPIC_KEYS.length) : params.topics.map((k) => MATIERES_COURTES[k] ?? k).join(", ")],
    [REGLAGES.difficulte, SALLE_DIFFICULTE_LABELS[params.difficulte]],
    [REGLAGES.temps, REGLAGES.tempsValeur(params.temps)],
    [REGLAGES.recap, REGLAGES.duree(libelleDuree(dureeEstimee(params)))],
  );
  return (
    <dl className={s.lecture} aria-label={titre ?? REGLAGES.lectureTitre}>
      {lignes.map(([k, v]) => (
        <div key={k} className={s.lectureLigne}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
