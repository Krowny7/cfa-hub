"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, Play } from "lucide-react";
import { BoutonEnvoi, PAL } from "@/components/classement/Encre";
import { EncreVive } from "@/components/nav/EncreVive";
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
  SALLE_TEMPS_DEFAUT,
  SALLE_TEMPS_PROPOSES,
  SALLE_TOPIC_KEYS,
  SALLE_TYPE_LABELS,
  ajusterMock,
  chronoGlobalS,
  disponiblesMock,
  dureeEstimee,
  libelleDuree,
  libelleParams,
  paramsParDefaut,
  questionsSession,
  repartirNombre,
  sessionJouable,
  sessionsMock,
  validerParams,
} from "@/lib/salles/logique";
import type { MockDisponible, QuestionsDisponibles, SalleChrono, SalleDifficulte, SalleMock, SalleMockOrdre, SalleMockVersion, SalleParams, SalleSource, TopicKey } from "@/lib/salles/types";
import { flechesOnglets, flechesRadios } from "@/components/salles/radios";
import { MATIERES_COURTES } from "@/lib/voice-classement";
import { REGLAGES } from "@/lib/voice-salles";
import a from "@/components/classement/Affronter.module.css";
import s from "./Salles.module.css";

// Les réglages de l'admin, le formulaire qui lance la partie : une question à
// la fois, dans l'ordre naturel, sous des onglets d'étapes.
//  - Source : banque complète, questions d'examen, mock officiel ou calculs.
//  - Banque, questions d'examen, calculs : Matières, puis Combien.
//  - Mock officiel : Version (d'origine, variantes, les deux, avec leurs
//    effectifs réels), Sessions, puis Combien. Les variantes n'existent que sur
//    certaines sessions : les autres le disent et se désactivent (ajusterMock).
//    Elles ne se jouent qu'ici : les autres sources n'en tirent jamais.
//  - « Plus d'options » (replié) : le chrono, le temps et le reste.
// Le résumé d'une ligne et « Lancer la partie » restent sous les yeux à chaque
// étape : tout a une valeur de départ (10 questions, banque complète, les 10
// matières, difficulté mélangée, 45 s, ou les réglages de la dernière partie).
// Un clic de souris sur une source ou une version passe à l'étape suivante ; au
// clavier, les flèches choisissent sans avancer.
// Le formulaire ne sait pas lancer lui-même : `onLancer` appelle l'action
// serveur (app/salles/actions.ts), qui tire les calculs côté serveur. Les
// effectifs viennent de `chargerDispos` et `chargerMocks` ; sans eux, pas de
// décompte. Les non-admins voient ReglagesLecture.

export type RetourLancement = { ok: true; message?: string } | { ok: false; erreur: string };

/** D'où viennent les questions : les trois sources, et les calculs (qui n'ont pas de source). */
type Origine = SalleSource | "calculs";
type Etape = keyof typeof REGLAGES.etapes;
type Option<T extends string> = { cle: T; nom: string; aide?: string; compte?: string; off?: boolean };

const ORIGINES: Option<Origine>[] = [
  { cle: "banque", nom: REGLAGES.sourceBanque, aide: REGLAGES.sourceBanqueAide },
  { cle: "mocks", nom: REGLAGES.sourceMocks, aide: REGLAGES.sourceMocksAide },
  { cle: "examen", nom: REGLAGES.sourceExamen, aide: REGLAGES.sourceExamenAide },
  { cle: "calculs", nom: REGLAGES.typeCalculs, aide: REGLAGES.typeCalculsAide },
];
const TYPES: Option<"questions" | "mixte">[] = [
  { cle: "questions", nom: REGLAGES.typeQuestions, aide: REGLAGES.typeQuestionsAide },
  { cle: "mixte", nom: REGLAGES.typeMixte, aide: REGLAGES.typeMixteAide },
];
const VERSIONS: Option<SalleMockVersion>[] = [
  { cle: "base", nom: REGLAGES.versionBase, aide: REGLAGES.versionBaseAide },
  { cle: "variantes", nom: REGLAGES.versionVariantes, aide: REGLAGES.versionVariantesAide },
  { cle: "tout", nom: REGLAGES.versionTout, aide: REGLAGES.versionToutAide },
];
/** Le chrono global d'abord : c'est le choix de départ (reglagesDeDepart). */
const CHRONOS: Option<SalleChrono>[] = [
  { cle: "global", nom: REGLAGES.chronoGlobal, aide: REGLAGES.chronoGlobalAide },
  { cle: "question", nom: REGLAGES.chronoQuestion, aide: REGLAGES.chronoQuestionAide },
];
const ORDRES: Option<SalleMockOrdre>[] = [
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

/**
 * Les réglages de départ : ceux de la dernière partie, sinon les valeurs par
 * défaut. Le chrono part sur « global » (correction à la fin, comme les 30 du
 * jour), sauf si la dernière partie a choisi un chrono : une partie d'avant le
 * réglage (chrono absent) part donc aussi sur « global ».
 */
export function reglagesDeDepart(precedents?: Partial<SalleParams> | null): SalleParams {
  const chrono = precedents?.chrono ?? "global";
  const v = validerParams({ ...paramsParDefaut(), ...(precedents ?? {}), chrono });
  return v.ok ? v.params : { ...paramsParDefaut(), chrono: "global" };
}

/** Un groupe de choix uniques ; `souris` : le choix vient d'un vrai clic, pas du clavier. */
function Choix<T extends string>({ titre, options, valeur, onChoix, petits = false }: { titre: string; options: Option<T>[]; valeur: T; onChoix: (cle: T, souris: boolean) => void; petits?: boolean }) {
  // une seule tabulation sur le groupe : le choix coché, ou le premier ouvert si aucun ne l'est
  const entree = options.some((o) => o.cle === valeur && !o.off) ? valeur : options.find((o) => !o.off)?.cle;
  return (
    <div className={[s.choix, petits ? s.choixPetits : ""].filter(Boolean).join(" ")} role="radiogroup" aria-label={titre} onKeyDown={flechesRadios}>
      {options.map((o) => (
        <button
          key={o.cle}
          type="button"
          role="radio"
          aria-checked={o.cle === valeur}
          tabIndex={o.cle === entree ? 0 : -1}
          disabled={o.off}
          className={[s.puce, petits ? s.puceCourte : ""].filter(Boolean).join(" ")}
          onClick={(e) => onChoix(o.cle, e.detail > 0)}
        >
          <b>{o.nom}</b>
          {o.aide && <span>{o.aide}</span>}
          {o.compte && <span className={s.puceCompte}>{o.compte}</span>}
        </button>
      ))}
    </div>
  );
}

/** Un curseur de 5 en 5, sa valeur en grand ; `grand` : le libellé est la question de l'étape. */
function Curseur({ id, titre, valeur, unite, min, max, texte, grand = false, onChange }: { id: string; titre: string; valeur: number; unite: string; min: number; max: number; texte?: string; grand?: boolean; onChange: (n: number) => void }) {
  return (
    <div className={s.bloc}>
      <div className={s.blocTete}>
        <label htmlFor={id} className={grand ? s.question : s.libelle}>
          {titre}
        </label>
        <span className={s.valeur}>
          {valeur} <small>{unite}</small>
        </span>
      </div>
      <input id={id} type="range" className={s.curseur} min={min} max={max} step={5} value={valeur} aria-valuetext={texte} onChange={(e) => onChange(Number(e.target.value))} />
      <div className={s.graduation} aria-hidden>
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

/** Un réglage de « Plus d'options » : son nom et ses choix. */
function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <fieldset className={s.bloc}>
      <legend className={s.libelle}>{titre}</legend>
      {children}
    </fieldset>
  );
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
  const [etape, setEtape] = useState<Etape>("source");
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<RetourLancement | null>(null);

  const set = (p: Partial<SalleParams>) => {
    setParams((prev) => ({ ...prev, ...p }));
    setRetour(null);
  };
  // un mock officiel : les sessions choisies, lues une fois (questions seulement)
  const surMock = params.source === "examen" && params.type !== "calculs";
  const origine: Origine = params.type === "calculs" ? "calculs" : params.source;
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
  const sessions = useMemo(() => sessionsMock(mocks), [mocks]);
  const mock = useMemo(() => ajusterMock(params.mock ?? MOCK_DEFAUT, mocks), [params.mock, mocks]);
  const nomsMock = useMemo(() => [...new Set(sessions.map((x) => x.examen.split(" — ")[0]))], [sessions]);
  const dispoMock = surMock ? disponiblesMock(mocks, mock, params.topics) : null;
  const maxPartie = Math.max(SALLE_NOMBRE_MIN, Math.min(SALLE_NOMBRE_MAX_MOCK, dispoMock ?? 90));
  const setMock = (m: Partial<SalleMock>) => set({ mock: { ...mock, ...m } });

  // les étapes : celles d'un mock, ou celles des autres sources
  const etapes: Etape[] = surMock ? ["source", "version", "sessions", "combien"] : ["source", "matieres", "combien"];
  const courante = etapes.includes(etape) ? etape : "source";
  const rang = etapes.indexOf(courante);
  // Suivant, Retour et le clic sur une source font disparaître l'élément qui a le focus : il passe à la nouvelle étape
  const viser = useRef(false);
  function aller(e: Etape) {
    viser.current = true;
    setEtape(e);
  }
  useEffect(() => {
    if (!viser.current) return;
    viser.current = false;
    document.getElementById(`${uid}-${courante}`)?.focus();
  }, [courante, uid]);

  function choisirOrigine(cle: Origine, souris: boolean) {
    const temps = surMock && params.temps === TEMPS_EXAMEN ? SALLE_TEMPS_DEFAUT : params.temps;
    if (cle === "examen") {
      // un mock : questions seulement, toutes les matières, le temps du jour J si
      // rien n'a été réglé, et le chrono global (comme le jour J) ; l'admin peut
      // encore revenir au chrono par question
      if (!surMock) set({ source: cle, type: "questions", topics: [...SALLE_TOPIC_KEYS], temps: params.temps === SALLE_TEMPS_DEFAUT ? TEMPS_EXAMEN : params.temps, mock, chrono: "global" });
    } else if (cle === "calculs") {
      set({ type: "calculs", source: "banque", temps });
    } else {
      set({ source: cle, type: params.type === "mixte" ? "mixte" : "questions", temps });
    }
    if (souris) aller(cle === "examen" ? "version" : "matieres");
  }
  function choisirVersion(version: SalleMockVersion, souris: boolean) {
    setMock({ version, examens: ajusterMock({ ...mock, version }, mocks).examens });
    if (souris) aller("sessions");
  }
  function basculerExamen(e: string) {
    const choisies = new Set(mock.examens);
    if (choisies.has(e)) choisies.delete(e);
    else choisies.add(e);
    setMock({ examens: sessions.map((x) => x.examen).filter((x) => choisies.has(x)) });
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
        nombre: Math.min(params.nombre, SALLE_NOMBRE_MAX),
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
    const choisies = new Set(params.topics);
    if (choisies.has(k)) choisies.delete(k);
    else choisies.add(k);
    set({ topics: SALLE_TOPIC_KEYS.filter((x) => choisies.has(x)) });
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
  const global = reel.chrono === "global";

  // la version du mock : ses effectifs réels, sur les sessions où elle existe
  const versions = VERSIONS.map((v) => {
    const jouables = sessions.filter((x) => sessionJouable(x, v.cle));
    const n = jouables.reduce((t, x) => t + questionsSession(x, v.cle), 0);
    const off = Boolean(mocks) && jouables.length === 0;
    return { ...v, off, compte: !mocks ? undefined : off ? REGLAGES.versionAucune : REGLAGES.versionCompte(n, jouables.length) };
  });

  const raccourcisMatieres = (
    <div className={s.raccourcis}>
      <button type="button" className={[s.btn, s.btnDiscret].join(" ")} aria-pressed={toutes} onClick={() => set({ topics: [...SALLE_TOPIC_KEYS] })}>
        {REGLAGES.topicsToutes}
      </button>
      <button type="button" className={[s.btn, s.btnDiscret].join(" ")} onClick={() => set({ topics: [] })}>
        {REGLAGES.topicsAucune}
      </button>
    </div>
  );
  const grilleMatieres = (
    <div className={s.topics}>
      {SALLE_TOPIC_KEYS.map((k) => {
        const n = dispoTopic(k);
        const vide = surMock && n === 0;
        const on = params.topics.includes(k) && !vide;
        return (
          <label key={k} className={s.topic} data-on={on ? "1" : "0"} data-off={vide ? "1" : undefined}>
            <input type="checkbox" className={s.coche} checked={on} disabled={vide} onChange={() => basculerTopic(k)} />
            <span className={s.topicNom}>{MATIERES_COURTES[k] ?? k}</span>
            {nbQuestions > 0 && n !== null && <span className={s.topicDispo} title={`${n}`}>{REGLAGES.dispo(n)}</span>}
          </label>
        );
      })}
    </div>
  );

  /** Une étape : sa question et son contenu ; une seule est visible à la fois. */
  const panneau = (e: Etape, contenu: React.ReactNode, tete: React.ReactNode = <h3 className={s.question}>{REGLAGES.questions[e]}</h3>) => (
    <div id={`${uid}-${e}`} role="tabpanel" aria-labelledby={`${uid}-onglet-${e}`} tabIndex={-1} hidden={e !== courante} className={s.etape}>
      {tete}
      {contenu}
    </div>
  );

  return (
    <form className={s.reglages} onSubmit={lancer} aria-label={REGLAGES.titre} noValidate>
      <div role="tablist" aria-label={REGLAGES.etapesAria} className={a.onglets} onKeyDown={flechesOnglets}>
        {etapes.map((e) => {
          const on = e === courante;
          return (
            <button
              key={e}
              id={`${uid}-onglet-${e}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`${uid}-${e}`}
              tabIndex={on ? 0 : -1}
              className={a.onglet + (on ? " rl-encre " + a.encre : "")}
              data-palette={on ? PAL.key : undefined}
              onClick={() => setEtape(e)}
            >
              {on && <EncreVive tons={PAL.liquide} />}
              {REGLAGES.etapes[e]}
            </button>
          );
        })}
      </div>

      {panneau("source", <Choix titre={REGLAGES.source} options={ORIGINES} valeur={origine} onChoix={choisirOrigine} />)}

      {!surMock &&
        panneau(
          "matieres",
          <>
            {grilleMatieres}
            <p className={s.aide}>{REGLAGES.topicsCompte(reel.topics.length, SALLE_TOPIC_KEYS.length)}</p>
          </>,
          <div className={s.blocTete}>
            <h3 className={s.question}>{REGLAGES.questions.matieres}</h3>
            {raccourcisMatieres}
          </div>,
        )}

      {surMock &&
        panneau(
          "version",
          <>
            {mocks === undefined && <p className={s.aide}>{REGLAGES.chargementMocks}</p>}
            {mocks === null && <p className={s.erreur}>{REGLAGES.mocksIndispo}</p>}
            <Choix titre={REGLAGES.version} options={versions} valeur={mock.version} onChoix={choisirVersion} />
          </>,
        )}

      {surMock &&
        panneau(
          "sessions",
          <>
            {mocks === undefined && <p className={s.aide}>{REGLAGES.chargementMocks}</p>}
            {mocks === null && <p className={s.erreur}>{REGLAGES.mocksIndispo}</p>}
            {mocks && (
              <div className={[s.topics, s.sessions].join(" ")}>
                {sessions.map((x) => {
                  const jouable = sessionJouable(x, mock.version);
                  const on = jouable && mock.examens.includes(x.examen);
                  return (
                    <label key={x.examen} className={s.topic} data-on={on ? "1" : "0"} data-off={jouable ? undefined : "1"}>
                      <input type="checkbox" className={s.coche} checked={on} disabled={!jouable} onChange={() => basculerExamen(x.examen)} />
                      <span className={s.topicNom}>{REGLAGES.sessionNom(x.examen)}</span>
                      <span className={s.topicDispo}>{jouable ? REGLAGES.sessionCompte(mock.version, x.base, x.variantes) : REGLAGES.sansVariante}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </>,
          <div className={s.blocTete}>
            <h3 className={s.question}>{REGLAGES.questions.sessions}</h3>
            {mock.version === "base" && (
              <div className={s.raccourcis}>
                {nomsMock.map((l) => {
                  const duMock = sessions.map((x) => x.examen).filter((e) => e.split(" — ")[0] === l);
                  const pile = duMock.length === mock.examens.length && duMock.every((e) => mock.examens.includes(e));
                  return (
                    <button key={l} type="button" className={[s.btn, s.btnDiscret].join(" ")} aria-pressed={pile} onClick={() => setMock({ examens: duMock })}>
                      {REGLAGES.mockEntier(l)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>,
        )}

      {surMock
        ? panneau(
            "combien",
            <>
              <Choix<"tout" | "partie">
                titre={REGLAGES.etendue}
                options={[
                  { cle: "tout", nom: REGLAGES.etendueTout, aide: REGLAGES.etendueToutAide(dispoMock) },
                  { cle: "partie", nom: REGLAGES.etenduePartie, aide: REGLAGES.etenduePartieAide },
                ]}
                valeur={mock.complet ? "tout" : "partie"}
                onChoix={(c) => setMock({ complet: c === "tout" })}
              />
              {!mock.complet && <Curseur id={`${uid}-nombre-mock`} titre={REGLAGES.nombre} valeur={reel.nombre} unite={REGLAGES.nombreUnite} min={SALLE_NOMBRE_MIN} max={maxPartie} onChange={(n) => set({ nombre: n })} />}
            </>,
          )
        : panneau(
            "combien",
            <Curseur id={`${uid}-nombre`} titre={REGLAGES.questions.combien} grand valeur={reel.nombre} unite={REGLAGES.nombreUnite} min={SALLE_NOMBRE_MIN} max={SALLE_NOMBRE_MAX} onChange={(n) => set({ nombre: n })} />,
            null,
          )}

      <div className={s.navEtapes}>
        {rang > 0 && (
          <button type="button" className={[s.btn, s.btnDiscret].join(" ")} onClick={() => aller(etapes[rang - 1])}>
            <ArrowLeft size={16} aria-hidden /> {REGLAGES.retour}
          </button>
        )}
        {rang < etapes.length - 1 && (
          <button type="button" className={[s.btn, s.navSuivant].join(" ")} onClick={() => aller(etapes[rang + 1])}>
            {REGLAGES.suivant} <ArrowRight size={16} aria-hidden />
          </button>
        )}
      </div>

      {/* ——— le reste, replié : le rythme d'abord ——— */}
      <details className={s.options}>
        <summary className={s.optionsTete}>
          <span>{REGLAGES.plusOptions}</span>
          <span className={s.optionsResume}>{REGLAGES.optionsResume(global, reel.temps)}</span>
          <ChevronDown size={16} aria-hidden />
        </summary>
        <div className={s.optionsCorps}>
          <Bloc titre={REGLAGES.chrono}>
            <Choix titre={REGLAGES.chrono} options={CHRONOS} valeur={params.chrono ?? "question"} onChoix={(c) => set({ chrono: c })} />
          </Bloc>
          <Bloc titre={global ? REGLAGES.tempsMoyen : REGLAGES.temps}>
            <Choix petits titre={global ? REGLAGES.tempsMoyen : REGLAGES.temps} options={SALLE_TEMPS_PROPOSES.map((t) => ({ cle: String(t), nom: REGLAGES.tempsValeur(t) }))} valeur={String(params.temps)} onChoix={(t) => set({ temps: Number(t) })} />
            {global && <p className={s.aide}>{REGLAGES.chronoTotalDetail(libelleDuree(chronoGlobalS(reel)), reel.nombre, reel.temps)}</p>}
            {surMock && <p className={s.aide}>{REGLAGES.tempsExamen}</p>}
            <p className={s.aide}>{global ? REGLAGES.pointsGlobalAide : REGLAGES.pointsAide}</p>
          </Bloc>
          {surMock ? (
            <>
              <Bloc titre={REGLAGES.ordre}>
                <Choix titre={REGLAGES.ordre} options={ORDRES} valeur={mock.ordre} onChoix={(o) => setMock({ ordre: o })} />
              </Bloc>
              <div className={s.bloc} role="group" aria-labelledby={`${uid}-matieres`}>
                <div className={s.blocTete}>
                  <span id={`${uid}-matieres`} className={s.libelle}>
                    {REGLAGES.topics}
                  </span>
                  {raccourcisMatieres}
                </div>
                {grilleMatieres}
              </div>
            </>
          ) : (
            <Bloc titre={REGLAGES.difficulte}>
              <Choix petits titre={REGLAGES.difficulte} options={SALLE_DIFFICULTES.map((d) => ({ cle: d, nom: SALLE_DIFFICULTE_LABELS[d] }))} valeur={params.difficulte} onChoix={(d) => set({ difficulte: d })} />
              {params.difficulte === "melange" && <p className={s.aide}>{REGLAGES.melangeAide(MIX_DEFAUT.facile, MIX_DEFAUT.moyen, MIX_DEFAUT.difficile)}</p>}
            </Bloc>
          )}
          {!surMock && origine !== "calculs" && (
            <Bloc titre={REGLAGES.type}>
              <Choix titre={REGLAGES.type} options={TYPES} valeur={params.type === "mixte" ? "mixte" : "questions"} onChoix={(t) => set({ type: t })} />
              {params.type === "mixte" && (
                <>
                  <Curseur
                    id={`${uid}-part`}
                    titre={REGLAGES.partCalculs}
                    valeur={partMixte}
                    unite="%"
                    min={SALLE_PART_CALCULS_MIN}
                    max={SALLE_PART_CALCULS_MAX}
                    texte={`${partMixte} %, ${REGLAGES.partCalculsValeur(nbCalculs, nbQuestions)}`}
                    onChange={(n) => {
                      setPartMixte(n);
                      setRetour(null);
                    }}
                  />
                  <p className={s.aide}>{REGLAGES.partCalculsValeur(nbCalculs, nbQuestions)}</p>
                </>
              )}
            </Bloc>
          )}
        </div>
      </details>

      {/* ——— le résumé et le lancement, toujours sous les yeux ——— */}
      <div className={s.barre}>
        <div className={s.recap} aria-live="polite">
          <p className={s.recapLigne}>{libelleParams(reel)}</p>
          {!global && <p className={s.aide}>{REGLAGES.duree(libelleDuree(dureeS))}</p>}
          {reel.topics.length === 0 && <p className={s.erreur}>{REGLAGES.aucuneMatiere}</p>}
          {surMock && mock.examens.length === 0 && <p className={s.erreur}>{REGLAGES.aucuneSession}</p>}
          {dispo !== null && dispo === 0 && reel.topics.length > 0 && (!surMock || mock.examens.length > 0) && <p className={s.erreur}>{REGLAGES.aucune}</p>}
          {dispo !== null && dispo > 0 && dispo < nbQuestions && <p className={s.info}>{REGLAGES.peu(dispo, nbQuestions)}</p>}
          {besoinSource && dispoSource === undefined && chargerDispos && <p className={s.aide}>{REGLAGES.chargement}</p>}
        </div>
        <BoutonEnvoi className={s.pleinMobile} disabled={envoi || desactive || reel.topics.length === 0 || (surMock && (mock.examens.length === 0 || dispoMock === 0))}>
          <Play size={18} aria-hidden /> {envoi ? REGLAGES.lancerEnCours : REGLAGES.lancer}
        </BoutonEnvoi>
        {retour && !retour.ok && (
          <p role="alert" className={[s.erreur, s.barreRetour].join(" ")}>
            {retour.erreur}
          </p>
        )}
        {retour && retour.ok && (
          <p role="status" className={[s.info, s.barreRetour].join(" ")}>
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
  const global = params.chrono === "global";
  lignes.push(
    [REGLAGES.chrono, global ? `${REGLAGES.chronoGlobal} · ${REGLAGES.chronoGlobalAide.toLowerCase()}` : `${REGLAGES.chronoQuestion} · ${REGLAGES.chronoQuestionAide.toLowerCase()}`],
    [global ? REGLAGES.tempsMoyen : REGLAGES.temps, REGLAGES.tempsValeur(params.temps)],
    [REGLAGES.recap, global ? REGLAGES.chronoTotal(libelleDuree(chronoGlobalS(params))) : REGLAGES.duree(libelleDuree(dureeEstimee(params)))],
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
