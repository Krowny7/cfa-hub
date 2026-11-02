"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Play } from "lucide-react";
import { BoutonEnvoi } from "@/components/classement/Encre";
import { MIX_DEFAUT } from "@/lib/calc/session";
import {
  SALLE_DIFFICULTES,
  SALLE_DIFFICULTE_LABELS,
  SALLE_NOMBRE_MAX,
  SALLE_NOMBRE_MAX_MOCK,
  SALLE_NOMBRE_MIN,
  SALLE_PART_CALCULS_DEFAUT,
  SALLE_PART_CALCULS_MAX,
  SALLE_PART_CALCULS_MIN,
  SALLE_SOURCES,
  SALLE_TEMPS_DEFAUT,
  SALLE_TEMPS_PROPOSES,
  SALLE_TOPIC_KEYS,
  SALLE_TYPE_LABELS,
  disponiblesMock,
  dureeEstimee,
  libelleDuree,
  libelleParams,
  paramsParDefaut,
  repartirNombre,
  validerParams,
} from "@/lib/salles/logique";
import type { MockDisponible, QuestionsDisponibles, SalleDifficulte, SalleMock, SalleMockOrdre, SalleMockVersion, SalleParams, SalleSource, SalleType, TopicKey } from "@/lib/salles/types";
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
  { cle: "examen", nom: REGLAGES.sourceExamen, aide: REGLAGES.sourceExamenAide },
];
const VERSIONS: { cle: SalleMockVersion; nom: string; aide: string }[] = [
  { cle: "base", nom: REGLAGES.versionBase, aide: REGLAGES.versionBaseAide },
  { cle: "variantes", nom: REGLAGES.versionVariantes, aide: REGLAGES.versionVariantesAide },
  { cle: "tout", nom: REGLAGES.versionTout, aide: REGLAGES.versionToutAide },
];
const ORDRES: { cle: SalleMockOrdre; nom: string; aide: string }[] = [
  { cle: "examen", nom: REGLAGES.ordreExamen, aide: REGLAGES.ordreExamenAide },
  { cle: "melange", nom: REGLAGES.ordreMelange, aide: REGLAGES.ordreMelangeAide },
];
/** Le premier choix d'un mock : la session 1 du mock A, entière, dans l'ordre de l'examen. */
const MOCK_DEFAUT: SalleMock = { examens: ["Mock A — Session 1"], version: "base", complet: true, ordre: "examen" };
/** Le temps du jour J : 90 s par question. */
const TEMPS_EXAMEN = 90;

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
  chargerMocks,
  onLancer,
  desactive = false,
  demoDispos,
  demoMocks,
}: {
  /** les réglages de la dernière partie, s'il y en a une */
  initial?: Partial<SalleParams> | null;
  /** lit les effectifs de la banque par matière pour une source ; null : indisponible */
  chargerDispos?: (source: SalleSource) => Promise<QuestionsDisponibles[] | null>;
  /** lit les mocks officiels proposés (sessions, matières, variantes) ; null : indisponible */
  chargerMocks?: () => Promise<MockDisponible[] | null>;
  onLancer: (params: SalleParams) => Promise<RetourLancement>;
  /** une partie est déjà en cours : on ne lance rien */
  desactive?: boolean;
  /** aperçus : des effectifs d'exemple, sans lecture */
  demoDispos?: Partial<Record<SalleSource, QuestionsDisponibles[]>>;
  demoMocks?: MockDisponible[];
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
  // un mock officiel : les sessions choisies, lues une fois (questions seulement)
  const surMock = params.source === "examen" && params.type !== "calculs";
  const mock = params.mock ?? MOCK_DEFAUT;
  const [mocks, setMocks] = useState<MockDisponible[] | null | undefined>(demoMocks);
  useEffect(() => {
    if (!surMock || !chargerMocks || mocks !== undefined) return;
    let fini = false;
    chargerMocks()
      .then((d) => !fini && setMocks(d))
      .catch(() => !fini && setMocks(null));
    return () => {
      fini = true;
    };
  }, [surMock, chargerMocks, mocks]);
  const examensDispo = useMemo(() => [...new Set((mocks ?? []).map((d) => d.examen))].sort(), [mocks]);
  const lettresMock = useMemo(() => [...new Set(examensDispo.map((e) => e.charAt(5)))], [examensDispo]);
  const dispoMock = surMock ? disponiblesMock(mocks, mock, params.topics) : null;
  const maxPartie = Math.max(SALLE_NOMBRE_MIN, Math.min(SALLE_NOMBRE_MAX_MOCK, dispoMock ?? 90));
  const setMock = (m: Partial<SalleMock>) => set({ mock: { ...mock, ...m } });
  function basculerExamen(e: string) {
    const a = new Set(mock.examens);
    if (a.has(e)) a.delete(e);
    else a.add(e);
    setMock({ examens: examensDispo.filter((x) => a.has(x)) });
  }
  function choisirSource(cle: SalleSource) {
    if (cle !== "examen") return set({ source: cle });
    // un mock : questions seulement, toutes les matières, le temps du jour J si rien n'a été réglé
    set({ source: cle, type: "questions", topics: [...SALLE_TOPIC_KEYS], temps: params.temps === SALLE_TEMPS_DEFAUT ? TEMPS_EXAMEN : params.temps, mock });
  }

  const reel: SalleParams = surMock
    ? {
        ...params,
        type: "questions",
        source: "examen",
        difficulte: "melange",
        partCalculs: 0,
        nombre: mock.complet ? Math.min(SALLE_NOMBRE_MAX_MOCK, Math.max(1, dispoMock ?? 90)) : Math.min(params.nombre, maxPartie),
        mock,
      }
    : {
        ...params,
        partCalculs: params.type === "calculs" ? 100 : params.type === "mixte" ? partMixte : 0,
        source: params.type === "calculs" || params.source === "examen" ? "banque" : params.source,
        mock: undefined,
      };
  const { questions: nbQuestions, calculs: nbCalculs } = repartirNombre(reel);

  // les effectifs de la source choisie, lus une fois par source (sauf calculs seuls et mocks officiels)
  const besoinSource = params.type !== "calculs" && !surMock ? params.source : null;
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
  const dispo = surMock ? dispoMock : nbQuestions > 0 ? disponibles(dispoSource, reel.topics, reel.difficulte) : null;
  /** ce qu'offre une matière : dans la banque (à la difficulté choisie) ou dans les sessions de mock cochées */
  function dispoTopic(k: TopicKey): number | null {
    if (surMock) return mocks ? disponiblesMock(mocks.filter((d) => d.topic === k), mock, [k]) : null;
    const d = dispoSource?.find((x) => x.topic === k);
    return d ? (reel.difficulte === "melange" ? d.total : d[reel.difficulte]) : null;
  }
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
            <button key={t.cle} type="button" role="radio" aria-checked={params.type === t.cle} tabIndex={params.type === t.cle ? 0 : -1} className={s.puce} onClick={() => set(params.source === "examen" && t.cle !== "questions" ? { type: t.cle, source: "banque" } : { type: t.cle })}>
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

      {/* ——— combien (un mock se règle plus bas) ——— */}
      {!surMock && (
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
      )}

      {/* ——— d'où ——— */}
      <fieldset className={s.bloc}>
        <legend className={s.libelle}>{REGLAGES.source}</legend>
        {params.type === "calculs" ? (
          <p className={s.aide}>{REGLAGES.sourceCalculs}</p>
        ) : (
          <div className={s.choix} role="radiogroup" aria-label={REGLAGES.source} onKeyDown={flechesRadios}>
            {SOURCES.map((o) => (
              <button key={o.cle} type="button" role="radio" aria-checked={params.source === o.cle} tabIndex={params.source === o.cle ? 0 : -1} className={s.puce} onClick={() => choisirSource(o.cle)}>
                <b>{o.nom}</b>
                <span>{o.aide}</span>
              </button>
            ))}
          </div>
        )}
        {surMock && <p className={s.aide}>{REGLAGES.sourceExamenType}</p>}
      </fieldset>

      {/* ——— le mock : sessions, questions, combien, ordre ——— */}
      {surMock && (
        <>
          <div className={s.bloc} role="group" aria-labelledby={`${uid}-sessions`}>
            <div className={s.blocTete}>
              <span id={`${uid}-sessions`} className={s.libelle}>
                {REGLAGES.sessions}
              </span>
              <div className={s.raccourcis}>
                {lettresMock.map((l) => {
                  const duMock = examensDispo.filter((e) => e.charAt(5) === l);
                  const pile = duMock.length === mock.examens.length && duMock.every((e) => mock.examens.includes(e));
                  return (
                    <button key={l} type="button" className={[s.btn, s.btnDiscret].join(" ")} aria-pressed={pile} onClick={() => setMock({ examens: duMock })}>
                      {REGLAGES.mockEntier(l)}
                    </button>
                  );
                })}
              </div>
            </div>
            {mocks === undefined && <p className={s.aide}>{REGLAGES.chargementMocks}</p>}
            {mocks === null && <p className={s.erreur}>{REGLAGES.mocksIndispo}</p>}
            {mocks && (
              <div className={[s.topics, s.sessions].join(" ")}>
                {examensDispo.map((e) => {
                  const on = mock.examens.includes(e);
                  const lignes = mocks.filter((d) => d.examen === e);
                  const base = lignes.reduce((n, d) => n + d.base, 0);
                  const variantes = lignes.reduce((n, d) => n + d.variantes, 0);
                  return (
                    <label key={e} className={s.topic} data-on={on ? "1" : "0"}>
                      <input type="checkbox" className={s.coche} checked={on} onChange={() => basculerExamen(e)} />
                      <span className={s.topicNom}>{REGLAGES.sessionNom(e)}</span>
                      <span className={s.topicDispo}>{REGLAGES.sessionDispo(base, variantes)}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <p className={s.aide}>{REGLAGES.sessionsAide}</p>
          </div>

          <fieldset className={s.bloc}>
            <legend className={s.libelle}>{REGLAGES.version}</legend>
            <div className={s.choix} role="radiogroup" aria-label={REGLAGES.version} onKeyDown={flechesRadios}>
              {VERSIONS.map((o) => (
                <button key={o.cle} type="button" role="radio" aria-checked={mock.version === o.cle} tabIndex={mock.version === o.cle ? 0 : -1} className={s.puce} onClick={() => setMock({ version: o.cle })}>
                  <b>{o.nom}</b>
                  <span>{o.aide}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className={s.bloc}>
            <legend className={s.libelle}>{REGLAGES.etendue}</legend>
            <div className={s.choix} role="radiogroup" aria-label={REGLAGES.etendue} onKeyDown={flechesRadios}>
              <button type="button" role="radio" aria-checked={mock.complet} tabIndex={mock.complet ? 0 : -1} className={s.puce} onClick={() => setMock({ complet: true })}>
                <b>{REGLAGES.etendueTout}</b>
                <span>{REGLAGES.etendueToutAide(dispoMock)}</span>
              </button>
              <button type="button" role="radio" aria-checked={!mock.complet} tabIndex={mock.complet ? -1 : 0} className={s.puce} onClick={() => setMock({ complet: false })}>
                <b>{REGLAGES.etenduePartie}</b>
                <span>{REGLAGES.etenduePartieAide}</span>
              </button>
            </div>
            {!mock.complet && (
              <div className={s.bloc}>
                <div className={s.blocTete}>
                  <label htmlFor={`${uid}-nombre-mock`} className={s.libelle}>
                    {REGLAGES.nombre}
                  </label>
                  <span className={s.valeur}>
                    {reel.nombre} <small>{REGLAGES.nombreUnite}</small>
                  </span>
                </div>
                <input
                  id={`${uid}-nombre-mock`}
                  type="range"
                  className={s.curseur}
                  min={SALLE_NOMBRE_MIN}
                  max={maxPartie}
                  step={5}
                  value={reel.nombre}
                  onChange={(e) => set({ nombre: Number(e.target.value) })}
                />
                <div className={s.graduation} aria-hidden>
                  <span>{SALLE_NOMBRE_MIN}</span>
                  <span>{maxPartie}</span>
                </div>
              </div>
            )}
          </fieldset>

          <fieldset className={s.bloc}>
            <legend className={s.libelle}>{REGLAGES.ordre}</legend>
            <div className={s.choix} role="radiogroup" aria-label={REGLAGES.ordre} onKeyDown={flechesRadios}>
              {ORDRES.map((o) => (
                <button key={o.cle} type="button" role="radio" aria-checked={mock.ordre === o.cle} tabIndex={mock.ordre === o.cle ? 0 : -1} className={s.puce} onClick={() => setMock({ ordre: o.cle })}>
                  <b>{o.nom}</b>
                  <span>{o.aide}</span>
                </button>
              ))}
            </div>
          </fieldset>
        </>
      )}

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
            const n = dispoTopic(k);
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

      {/* ——— la difficulté (sans objet pour un mock) ——— */}
      {!surMock && (
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
      )}

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
        {surMock && <p className={s.aide}>{REGLAGES.tempsExamen}</p>}
        <p className={s.aide}>{REGLAGES.pointsAide}</p>
      </div>

      {/* ——— le résumé et le lancement ——— */}
      <div className={s.recap} aria-live="polite">
        <p className={s.recapLigne}>{libelleParams(reel)}</p>
        <p className={s.aide}>{REGLAGES.duree(libelleDuree(dureeS))}</p>
        {reel.topics.length === 0 && <p className={s.erreur}>{REGLAGES.aucuneMatiere}</p>}
        {surMock && mock.examens.length === 0 && <p className={s.erreur}>{REGLAGES.aucuneSession}</p>}
        {dispo !== null && dispo === 0 && reel.topics.length > 0 && <p className={s.erreur}>{REGLAGES.aucune}</p>}
        {dispo !== null && dispo > 0 && dispo < nbQuestions && <p className={s.info}>{REGLAGES.peu(dispo, nbQuestions)}</p>}
        {besoinSource && dispoSource === undefined && chargerDispos && <p className={s.aide}>{REGLAGES.chargement}</p>}
        {surMock && mocks === undefined && chargerMocks && <p className={s.aide}>{REGLAGES.chargementMocks}</p>}
      </div>

      <div className={s.lancement}>
        <BoutonEnvoi surPeinture className={s.pleinMobile} disabled={envoi || desactive || reel.topics.length === 0 || (surMock && (mock.examens.length === 0 || dispoMock === 0))}>
          <Play size={18} aria-hidden /> {envoi ? REGLAGES.lancerEnCours : REGLAGES.lancer}
        </BoutonEnvoi>
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
  if (params.type !== "calculs") lignes.push([REGLAGES.source, params.source === "examen" ? REGLAGES.sourceExamen : params.source === "mocks" ? REGLAGES.sourceMocks : REGLAGES.sourceBanque]);
  const m = params.source === "examen" ? params.mock : undefined;
  if (m) {
    lignes.push(
      [REGLAGES.sessions, m.examens.map(REGLAGES.sessionNom).join(", ")],
      [REGLAGES.version, VERSIONS.find((v) => v.cle === m.version)?.nom ?? m.version],
      [REGLAGES.ordre, ORDRES.find((o) => o.cle === m.ordre)?.nom ?? m.ordre],
    );
  }
  lignes.push([REGLAGES.topics, params.topics.length === SALLE_TOPIC_KEYS.length ? REGLAGES.topicsCompte(params.topics.length, SALLE_TOPIC_KEYS.length) : params.topics.map((k) => MATIERES_COURTES[k] ?? k).join(", ")]);
  if (!m) lignes.push([REGLAGES.difficulte, SALLE_DIFFICULTE_LABELS[params.difficulte]]);
  lignes.push(
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
