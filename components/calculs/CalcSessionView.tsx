"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, RotateCcw, SlidersHorizontal } from "lucide-react";
import { CopieCorrigee } from "@/components/adn/CopieCorrigee";
import { poserTrait } from "@/components/adn/AnneauDuJourEvents";
import { Page, EnTete } from "@/components/outils/Gabarit";
import { drawCalcSession, submitCalcAnswer, type SubmitResult } from "@/app/calculs/actions";
import {
  MIX_DEFAUT,
  MIX_PRESETS,
  SESSION_COUNTS,
  configFromStored,
  configToParams,
  configToStored,
  defaultConfig,
  mixOf,
  planSession,
  sessionTypeKey,
  setMixLevel,
  type ParNiveau,
  type SessionConfig,
  type SessionPlan,
  type SessionTypeInfo,
} from "@/lib/calc/session";
import { CALC_LEVELS, type CalcLevel, type CalcTopic } from "@/lib/calc/types";
import { pctScore, questions as nQuestions } from "@/lib/voice";
import { CorrectionCard, RoundScreen, type RoundItem } from "./CalcTypeView";
import { appendLocal } from "./local";
import { BackLink } from "./parts";
import { useLocalImport } from "./useCalc";
import { NIVEAU, SESSION, nbQuestions, phraseAjustement, phraseRepartition } from "./voice";

/** Une matière ouverte, avec son vivier par niveau (lib/calc/session-draw.ts → calcSessionSubjects). */
export type SessionSubjectLite = { topic: CalcTopic; slug: string; name: string; short: string; types: number; counts: ParNiveau };

type Phase = "config" | "tirage" | "round" | "fin";

type Props = {
  subjects: SessionSubjectLite[];
  /** migration_calc.sql appliquée (sinon le suivi reste dans le navigateur) */
  db: boolean;
  owner: string;
  /** les réglages lus dans l'adresse (?matieres=&n=&diff=), ou null */
  initial: SessionConfig | null;
  /** ?go=1 : la session part dès l'arrivée */
  autoStart?: boolean;
  /** aperçu figé : une session en cours ou rendue */
  preset?: { phase: "round" | "fin"; cfg: SessionConfig; items: RoundItem[]; types: Record<string, SessionTypeInfo>; plan: SessionPlan; idx?: number };
};

const STORE = "rl_calc_session_v1:";

/**
 * /calculs/session : la session ciblée de calculs. Réglage (matières, nombre
 * de questions, un niveau ou un mélange de niveaux en pourcentages), tirage
 * côté serveur (drawCalcSession : la bonne réponse ne part pas avec les
 * énoncés), puis les questions une à une avec la même saisie et la même
 * correction qu'un round (RoundScreen, submitCalcAnswer), et le bilan : note,
 * réussite par niveau et par matière, questions manquées corrigées.
 *
 * Les réglages se retrouvent dans l'adresse (pour relancer la même session) et
 * dans le localStorage (lu après le montage : le premier rendu est celui du serveur).
 */
export function CalcSessionView({ subjects, db, owner, initial, autoStart, preset }: Props) {
  useLocalImport(db, owner);
  const slugs = useMemo(() => subjects.map((s) => s.slug), [subjects]);
  const [cfg, setCfg] = useState<SessionConfig>(() => preset?.cfg ?? initial ?? defaultConfig(slugs));
  const [restored, setRestored] = useState(false);
  const [phase, setPhase] = useState<Phase>(preset?.phase ?? "config");
  const [items, setItems] = useState<RoundItem[]>(preset?.items ?? []);
  const [types, setTypes] = useState<Record<string, SessionTypeInfo>>(preset?.types ?? {});
  const [plan, setPlan] = useState<SessionPlan | null>(preset?.plan ?? null);
  const [idx, setIdx] = useState(preset?.idx ?? 0);
  const [error, setError] = useState<string | null>(null);
  const run = useRef(0);

  // adresse et mémoire : ce que le joueur règle se retrouve (et se relance) tel quel
  const remember = useCallback(
    (c: SessionConfig) => {
      if (preset || typeof window === "undefined") return;
      try {
        const url = new URL(window.location.href);
        for (const [k, v] of Object.entries(configToParams(c, slugs))) url.searchParams.set(k, v);
        url.searchParams.delete("go");
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
      } catch {
        // adresse non modifiable : tant pis
      }
      try {
        window.localStorage.setItem(STORE + (owner || "anonyme"), JSON.stringify(configToStored(c, slugs)));
      } catch {
        // stockage plein ou interdit : on n'insiste pas
      }
    },
    [owner, preset, slugs],
  );

  const change = useCallback(
    (c: SessionConfig) => {
      setCfg(c);
      setRestored(false);
      remember(c);
    },
    [remember],
  );

  // sans réglages dans l'adresse : les derniers réglages gardés, lus après le montage
  useEffect(() => {
    if (initial || preset) return;
    try {
      const raw = window.localStorage.getItem(STORE + (owner || "anonyme"));
      const c = raw ? configFromStored(JSON.parse(raw), slugs) : null;
      if (c) {
        setCfg(c);
        setRestored(true);
        remember(c);
      }
    } catch {
      // rien de lisible : les réglages par défaut restent
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const topicsOf = useCallback((c: SessionConfig) => subjects.filter((s) => c.matieres.includes(s.slug)).map((s) => s.topic), [subjects]);

  const start = useCallback(
    async (c: SessionConfig) => {
      const id = ++run.current;
      setError(null);
      setPhase("tirage");
      setItems([]);
      setIdx(0);
      remember(c);
      if (typeof window !== "undefined") window.scrollTo({ top: 0 });
      try {
        const r = await drawCalcSession({ topics: topicsOf(c), count: c.count, mix: mixOf(c.diff) });
        if (run.current !== id) return;
        if (!r.ok || !r.items.length) {
          setError(r.ok ? SESSION.tirageRate : r.error);
          setPhase("config");
          return;
        }
        setItems(r.items.map((x) => ({ q: x.q, raw: null, value: null, status: null, answer: null, solution: [], ref: { topic: x.topic, typeKey: x.typeKey } })));
        setTypes(r.types);
        setPlan(r.plan);
        setIdx(0);
        setPhase("round");
      } catch {
        if (run.current !== id) return;
        setError(SESSION.tirageRate);
        setPhase("config");
      }
    },
    [remember, topicsOf],
  );

  // ?go=1 : la session part tout de suite
  const autoRef = useRef(false);
  useEffect(() => {
    if (autoStart && !preset && !autoRef.current) {
      autoRef.current = true;
      void start(cfg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const api = useMemo(
    () => ({
      submit: (q: { id: string }, raw: string, it: RoundItem) =>
        it.ref
          ? submitCalcAnswer({ topic: it.ref.topic, typeKey: it.ref.typeKey, questionId: q.id, raw, db })
          : Promise.resolve<SubmitResult>({ ok: false, error: SESSION.tirageRate }),
    }),
    [db],
  );

  const onAnswered = useCallback(
    (i: number, raw: string, r: Extract<SubmitResult, { ok: true; status: "juste" | "faux" }>) => {
      const it = items[i];
      if (!it?.ref) return;
      if (!r.stored)
        appendLocal(owner, [{ topic: it.ref.topic, typeKey: it.ref.typeKey, questionId: it.q.id, level: it.q.level, value: r.value, correct: r.status === "juste", at: Date.now() }]);
      poserTrait(1);
      setItems((list) => list.map((x, k) => (k === i ? { ...x, raw, value: r.value, status: r.status, answer: r.answer, solution: r.solution } : x)));
    },
    [items, owner],
  );

  const stop = useCallback(() => {
    run.current += 1;
    setPhase("config");
    setItems([]);
    setIdx(0);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }, []);

  if (phase === "tirage" || phase === "round") {
    const cur = items[idx];
    const info = cur?.ref ? types[sessionTypeKey(cur.ref.topic, cur.ref.typeKey)] : undefined;
    return (
      <div className="rl-wide">
        <RoundScreen
          title={info?.name ?? SESSION.nom}
          sub={info && cur ? `${info.subject} · ${NIVEAU[cur.q.level].label}` : nbQuestions(cfg.count)}
          meta={info ? { formulas: info.formulas, traps: info.traps } : null}
          items={items}
          idx={idx}
          loading={phase === "tirage"}
          total={cfg.count}
          mots={{ tirage: SESSION.tirage, progression: SESSION.progression, arreter: SESSION.arreter }}
          api={api}
          onAnswered={onAnswered}
          onNext={() => {
            if (idx < items.length - 1) setIdx(idx + 1);
            else {
              setPhase("fin");
              if (typeof window !== "undefined") window.scrollTo({ top: 0 });
            }
          }}
          onStop={stop}
        />
      </div>
    );
  }

  if (phase === "fin") {
    return (
      <div className="rl-wide">
        <Bilan cfg={cfg} subjects={subjects} items={items} types={types} anime={!preset} onRestart={() => void start(cfg)} onChange={stop} />
      </div>
    );
  }

  return <Reglage subjects={subjects} cfg={cfg} onChange={change} onStart={() => void start(cfg)} error={error} restored={restored} />;
}

// ---------------------------------------------------------------------------
// Le réglage

const chip = (on: boolean, pad = "px-4") => `chip rl-press min-h-[44px] justify-center text-[14.5px] ${pad} ${on ? "chip-active" : ""}`;

function Reglage({
  subjects,
  cfg,
  onChange,
  onStart,
  error,
  restored,
}: {
  subjects: SessionSubjectLite[];
  cfg: SessionConfig;
  onChange: (c: SessionConfig) => void;
  onStart: () => void;
  error: string | null;
  restored: boolean;
}) {
  const allSlugs = subjects.map((s) => s.slug);
  const choisies = subjects.filter((s) => cfg.matieres.includes(s.slug));
  const toutes = choisies.length === subjects.length;
  const dispo: ParNiveau = { facile: 0, moyen: 0, difficile: 0 };
  for (const s of choisies) for (const l of CALC_LEVELS) dispo[l] += s.counts[l];
  const mix = mixOf(cfg.diff);
  const plan = planSession(cfg.count, mix, dispo);
  const ajust = phraseAjustement(cfg.count, plan, dispo);
  const nbTypes = choisies.reduce((n, s) => n + s.types, 0);
  const nbVivier = CALC_LEVELS.reduce((n, l) => n + dispo[l], 0);

  // le dernier mélange réglé : on le retrouve en revenant d'un niveau seul
  const dernierMix = useRef<ParNiveau>(cfg.diff.kind === "melange" ? cfg.diff.mix : MIX_DEFAUT);
  if (cfg.diff.kind === "melange") dernierMix.current = cfg.diff.mix;

  const set = (patch: Partial<SessionConfig>) => onChange({ ...cfg, ...patch });
  const toggle = (slug: string) => {
    if (toutes) return set({ matieres: [slug] });
    const next = cfg.matieres.includes(slug) ? cfg.matieres.filter((x) => x !== slug) : [...cfg.matieres, slug];
    set({ matieres: next.length ? allSlugs.filter((s) => next.includes(s)) : allSlugs });
  };

  const modes = [...CALC_LEVELS.map((l) => ({ key: l as string, label: NIVEAU[l].label })), { key: "melange", label: SESSION.melange }];
  const modeActuel = cfg.diff.kind === "melange" ? "melange" : cfg.diff.level;
  const setMode = (key: string) => {
    if (key === "melange") set({ diff: { kind: "melange", mix: { ...dernierMix.current } } });
    else set({ diff: { kind: "niveau", level: key as CalcLevel } });
  };

  const nomsChoisis = choisies.map((s) => s.short);

  return (
    <Page
      entete={<EnTete icone={<SlidersHorizontal size={16} aria-hidden />} titre={SESSION.nom} ligne={SESSION.ligne} retour={{ href: "/calculs", label: SESSION.retour }} />}
      lead={
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-8">
          <section className="card-hero grid gap-8 p-6 sm:p-7 md:p-8" aria-label={SESSION.nom}>
            {/* matières */}
            <div className="grid gap-3.5" role="group" aria-labelledby="ses-matieres">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p id="ses-matieres" className="t-eyebrow">
                  {SESSION.matieres}
                </p>
                <span className="t-micro">{SESSION.matieresAide}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={chip(toutes)} aria-pressed={toutes} onClick={() => set({ matieres: allSlugs })}>
                  {SESSION.toutes}
                </button>
                {subjects.map((s) => {
                  const on = !toutes && cfg.matieres.includes(s.slug);
                  return (
                    <button key={s.slug} type="button" className={chip(on)} aria-pressed={on} onClick={() => toggle(s.slug)}>
                      {s.short}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* nombre de questions */}
            <div className="grid gap-3.5 border-t border-line pt-7">
              <p id="ses-nombre" className="t-eyebrow">
                {SESSION.nombre}
              </p>
              <div role="radiogroup" aria-labelledby="ses-nombre" className="grid grid-cols-5 gap-2">
                {SESSION_COUNTS.map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={cfg.count === n} className={chip(cfg.count === n, "px-0 font-mono tabular-nums")} onClick={() => set({ count: n })}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* difficulté */}
            <div className="grid gap-4 border-t border-line pt-7">
              <p id="ses-diff" className="t-eyebrow">
                {SESSION.difficulte}
              </p>
              <div role="radiogroup" aria-labelledby="ses-diff" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {modes.map((m) => (
                  <button key={m.key} type="button" role="radio" aria-checked={modeActuel === m.key} className={chip(modeActuel === m.key)} onClick={() => setMode(m.key)}>
                    {m.label}
                  </button>
                ))}
              </div>

              {cfg.diff.kind === "niveau" ? (
                <p className="t-small m-0">{NIVEAU[cfg.diff.level].desc}</p>
              ) : (
                <div className="grid gap-5">
                  <p className="t-small m-0">{SESSION.melangeAide}</p>
                  <div role="group" aria-label={SESSION.preregles} className="flex flex-wrap items-center gap-2">
                    {MIX_PRESETS.map((p) => {
                      const on = CALC_LEVELS.every((l) => p.mix[l] === mix[l]);
                      return (
                        <button key={p.key} type="button" className={chip(on, "gap-2 px-3.5")} aria-pressed={on} onClick={() => set({ diff: { kind: "melange", mix: { ...p.mix } } })}>
                          {p.label}
                          <span className="font-mono text-[12.5px] font-medium tabular-nums opacity-70">
                            {p.mix.facile}/{p.mix.moyen}/{p.mix.difficile}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid gap-3">
                    {CALC_LEVELS.map((l) => (
                      <div key={l} className="grid gap-0.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <label htmlFor={`ses-part-${l}`} className="text-[15px] font-semibold">
                            {NIVEAU[l].label}
                          </label>
                          <span className="font-mono text-[13.5px] tabular-nums text-muted">
                            <span className="font-semibold text-white">{mix[l]} %</span> · {nQuestions(plan.retenu[l])}
                          </span>
                        </div>
                        <input
                          id={`ses-part-${l}`}
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={mix[l]}
                          aria-label={SESSION.partDe(NIVEAU[l].label)}
                          aria-valuetext={`${mix[l]} %, soit ${nQuestions(plan.voulu[l])}`}
                          onChange={(e) => set({ diff: { kind: "melange", mix: setMixLevel(mix, l, Number(e.target.value)) } })}
                          className="h-11 w-full"
                          style={{ accentColor: "var(--ink)" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div role="status" aria-live="polite" className="grid gap-2">
                <p className="m-0 text-[15px] font-semibold tabular-nums">{phraseRepartition(plan.retenu)}</p>
                {ajust && <p className="m-0 border-l-2 border-pen pl-3 text-[13.5px] leading-snug text-muted">{ajust}</p>}
              </div>
            </div>
          </section>

          <aside className="card-quiet grid gap-5 p-6 md:p-7 lg:sticky lg:top-24" aria-label={SESSION.resume}>
            <div>
              <p className="t-eyebrow">{SESSION.resume}</p>
              <h2 className="t-h2 mt-3 [overflow-wrap:anywhere]">{SESSION.matieresTitre(nomsChoisis, toutes)}</h2>
              <p className="t-small mt-2">
                {choisies.length ? `${nbTypes} types de calcul · ${nbQuestions(nbVivier)} au vivier` : SESSION.aucuneMatiere}
              </p>
            </div>
            <button type="button" className="btn btn-primary btn-lg rl-press w-full justify-center" disabled={plan.total === 0} onClick={onStart}>
              {SESSION.lancer(plan.total)}
              <ArrowRight size={17} aria-hidden />
            </button>
            {restored && <p className="t-micro m-0">{SESSION.repriseDernier}</p>}
            {error && (
              <p role="alert" className="t-small m-0 text-pen">
                {error}
              </p>
            )}
          </aside>
        </div>
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Le bilan

type Rangee = { label: string; ok: number; n: number };

function Barres({ id, titre, lignes }: { id: string; titre: string; lignes: Rangee[] }) {
  return (
    <section className="card-quiet p-5 md:p-6" aria-labelledby={id}>
      <h2 id={id} className="t-eyebrow">
        {titre}
      </h2>
      <ul className="m-0 mt-4 grid list-none gap-4 p-0">
        {lignes.map((l) => {
          const pct = l.n > 0 ? Math.round((l.ok / l.n) * 100) : 0;
          return (
            <li key={l.label} className="grid gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-[14.5px]">
                <span className="min-w-0 font-semibold [overflow-wrap:anywhere]">{l.label}</span>
                <span className="shrink-0 font-mono tabular-nums text-muted">
                  {l.ok}/{l.n} · {pctScore(l.ok, l.n)}
                </span>
              </div>
              <span className={"ink-bar" + (pct < 50 ? " is-pen" : "")} role="img" aria-label={`${l.label} : ${l.ok} sur ${l.n}`}>
                <span style={{ width: `${Math.max(3, pct)}%` }} />
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Bilan({
  cfg,
  subjects,
  items,
  types,
  anime,
  onRestart,
  onChange,
}: {
  cfg: SessionConfig;
  subjects: SessionSubjectLite[];
  items: RoundItem[];
  types: Record<string, SessionTypeInfo>;
  anime: boolean;
  onRestart: () => void;
  onChange: () => void;
}) {
  const juste = (it: RoundItem) => it.status === "juste";
  const score = items.filter(juste).length;
  const total = items.length;
  const infoOf = (it: RoundItem) => (it.ref ? types[sessionTypeKey(it.ref.topic, it.ref.typeKey)] : undefined);

  const parNiveau: Rangee[] = CALC_LEVELS.flatMap((l) => {
    const xs = items.filter((it) => it.q.level === l);
    return xs.length ? [{ label: NIVEAU[l].label, ok: xs.filter(juste).length, n: xs.length }] : [];
  });
  const parMatiere: Rangee[] = [];
  for (const it of items) {
    const label = infoOf(it)?.subject ?? "—";
    let r = parMatiere.find((x) => x.label === label);
    if (!r) parMatiere.push((r = { label, ok: 0, n: 0 }));
    r.n += 1;
    if (juste(it)) r.ok += 1;
  }

  const toutes = subjects.length > 0 && subjects.every((s) => cfg.matieres.includes(s.slug));
  const noms = subjects.filter((s) => cfg.matieres.includes(s.slug)).map((s) => s.short);
  const numerotees = items.map((it, i) => ({ it, i }));
  const ratees = numerotees.filter((x) => !juste(x.it));
  const reussies = numerotees.filter((x) => juste(x.it));
  const tag = (it: RoundItem) => {
    const info = infoOf(it);
    return info ? `${info.subject} · ${info.name} · ${NIVEAU[it.q.level].label}` : undefined;
  };

  return (
    <div className="mx-auto grid w-full max-w-[660px] gap-10">
      <BackLink href="/calculs">{SESSION.retour}</BackLink>
      <CopieCorrigee
        className="-mt-4"
        surTitre={SESSION.surTitre}
        titre={SESSION.matieresTitre(noms, toutes)}
        meta={nQuestions(total)}
        score={score}
        total={total}
        questions={items.map((it) => ({ label: it.q.prompt, ok: juste(it) }))}
        matieres={parMatiere.map((m) => ({ label: m.label, ok: m.ok, total: m.n }))}
        anime={anime}
        actions={
          <>
            <button type="button" className="btn btn-primary rl-press" onClick={onRestart}>
              <RotateCcw size={15} aria-hidden />
              {SESSION.recommencer}
            </button>
            <button type="button" className="btn btn-secondary rl-press" onClick={onChange}>
              <SlidersHorizontal size={15} aria-hidden />
              {SESSION.changer}
            </button>
          </>
        }
      />

      <div className="grid gap-4 md:gap-5">
        {parNiveau.length > 0 && <Barres id="ses-bilan-niveau" titre={SESSION.parNiveau} lignes={parNiveau} />}
        {parMatiere.length > 1 && <Barres id="ses-bilan-matiere" titre={SESSION.parMatiere} lignes={parMatiere} />}
      </div>

      <section className="rl-section">
        <h2 className="t-h3">{SESSION.manquees}</h2>
        {ratees.length ? (
          <div className="grid gap-2.5">
            {ratees.map(({ it, i }) => (
              <CorrectionCard key={it.q.id} n={i + 1} it={it} tag={tag(it)} />
            ))}
          </div>
        ) : (
          <p className="t-body m-0 text-muted">{SESSION.toutJuste}</p>
        )}
      </section>

      {reussies.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none text-[14px] font-semibold text-muted transition-colors hover:text-white">
            {SESSION.justes} ({reussies.length})
          </summary>
          <div className="mt-4 grid gap-2.5">
            {reussies.map(({ it, i }) => (
              <CorrectionCard key={it.q.id} n={i + 1} it={it} tag={tag(it)} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
