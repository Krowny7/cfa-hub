"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpen, Check, Circle, X } from "lucide-react";
import { QuestionPrompt } from "@/components/QuestionPrompt";
import { MarqueQuestion } from "@/components/MarqueQuestion";
import { ChoiceButton, Explanation } from "@/components/session/parts";
import { InkProgressRing } from "@/components/ui/InkRings";
import { Feuille } from "@/components/ui/Feuille";
import { poserTrait } from "@/components/adn/AnneauDuJourEvents";
import { AtelierCalcul, type CorrigeCalc } from "@/components/atelier/AtelierCalcul";
import { BlocRappel, CarteRappel } from "@/components/atelier/AtelierRappel";
import { DUREE_S, avancement, compteNotion, planifier, prochaineEtape, type EtatAtelier, type Etape, type RappelVu, type Reponse } from "@/lib/atelier";
import { itemsPool, type ApiAtelier, type ItemCalc, type ItemQcm, type ItemSeance, type RappelNotion, type SeanceAtelier } from "@/lib/atelier-seance";
import { ATELIER as V, BLOC_NOM, NIVEAU_CALCUL, NIVEAU_QUESTION } from "@/lib/voice-atelier";

// Le déroulé d'un Atelier : la carte Rappel, puis les questions une à une,
// corrigées tout de suite (la bonne réponse vient du serveur), le chrono qui
// commande (lib/atelier.ts décide de la suite), et à droite sur ordinateur
// le plan, les notions et le rappel replié. Sur téléphone, une colonne, la
// barre d'action collée en bas au pouce, le rappel dans un tiroir.

type Corrige =
  | { k: "qcm"; juste: boolean; choix: number; bonne: number | null; explication: string | null; statut: string | null; xp: number }
  | ({ k: "calc"; xp: number } & CorrigeCalc);

export type FinSeance = { reponses: Reponse[]; secondes: number; ajoutes: number; vuAt: string | null };

export function AtelierSeance({
  seance: initiale,
  api,
  rappels,
  reprise,
  onPause,
  onFin,
  demoEtape,
}: {
  seance: SeanceAtelier;
  api: ApiAtelier;
  rappels: Record<string, RappelNotion>;
  /** reprise : on ne remontre pas le rappel d'ouverture */
  reprise: boolean;
  onPause: (s: FinSeance & { seance: SeanceAtelier }) => void;
  onFin: (s: FinSeance & { seance: SeanceAtelier; ferme?: boolean }) => void;
  /** aperçus : chrono figé, une réponse donnée d'emblée (question corrigée) ou le rappel d'une notion */
  demoEtape?: { secondes?: number; choix?: number; raw?: string; rappelDe?: string };
}) {
  const [seance, setSeance] = useState(initiale);
  const [reponses, setReponses] = useState<Reponse[]>(initiale.ordre);
  const [rappelsVus, setRappelsVus] = useState<RappelVu[]>(() =>
    reprise || initiale.ordre.length > 0 ? [{ notion: null, apres: 0 }] : demoEtape?.rappelDe ? [{ notion: null, apres: 0 }] : [],
  );
  const [secondes, setSecondes] = useState(demoEtape?.secondes ?? initiale.secondes);
  const [etape, setEtape] = useState<Etape | null>(null);
  const [choix, setChoix] = useState<number | null>(null);
  const [corrige, setCorrige] = useState<Corrige | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [rappelOuvert, setRappelOuvert] = useState(false);
  const ajoutes = useRef(0);
  const vuAt = useRef<string | null>(initiale.vuAt || null);
  const haut = useRef<HTMLDivElement | null>(null);

  const pool = useMemo(() => itemsPool(seance), [seance]);
  const plan = useMemo(() => planifier(pool), [pool]);
  const parI = useMemo(() => new Map(seance.items.map((x) => [x.i, x])), [seance.items]);
  const reussiteAvant = useMemo(
    () => Object.fromEntries(seance.notions.map((n) => [n, seance.avant[n] && seance.avant[n].n > 0 ? seance.avant[n].ok / seance.avant[n].n : null])),
    [seance.avant, seance.notions],
  );
  const etat = useCallback(
    (r: Reponse[], vus: RappelVu[], s: number): EtatAtelier => ({ notions: seance.notions, poids: seance.poids, items: pool, reponses: r, rappels: vus, secondes: s, reussiteAvant }),
    [pool, reussiteAvant, seance.notions, seance.poids],
  );

  // le chrono : il tourne tant que la séance est à l'écran (onglet visible)
  useEffect(() => {
    if (demoEtape) return;
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") setSecondes((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(t);
  }, [demoEtape]);

  const suivante = useCallback(
    (r: Reponse[], vus: RappelVu[], s: number) => {
      const e = prochaineEtape(etat(r, vus, s), plan);
      setChoix(null);
      setCorrige(null);
      setMessage(null);
      if (e.type === "fin") {
        onFin({ seance, reponses: r, secondes: s, ajoutes: ajoutes.current, vuAt: vuAt.current });
        return;
      }
      setEtape(e);
      haut.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    },
    [etat, onFin, plan, seance],
  );

  // première étape (une fois)
  useEffect(() => {
    if (demoEtape?.rappelDe) return setEtape({ type: "rappel", notions: [demoEtape.rappelDe], raison: "fautes" });
    const e = prochaineEtape(etat(reponses, rappelsVus, secondes), plan);
    if (e.type === "fin") return onFin({ seance, reponses, secondes, ajoutes: 0, vuAt: vuAt.current });
    setEtape(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const item: ItemSeance | null = etape?.type === "question" ? (parI.get(etape.i) ?? null) : null;
  const retest = etape?.type === "question" && etape.retest;

  // aperçus : la réponse donnée d'emblée, pour montrer la correction
  const demoFaite = useRef(false);
  useEffect(() => {
    if (!item || demoFaite.current || !demoEtape) return;
    if (item.k === "calc" && demoEtape.raw !== undefined) {
      demoFaite.current = true;
      void validerCalc(demoEtape.raw);
    } else if (item.k !== "calc" && demoEtape.choix !== undefined) {
      demoFaite.current = true;
      void validerQcm(demoEtape.choix);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  const noter = (i: number, ok: boolean) => {
    const r = [...reponses, { i, ok, retest: !!retest }];
    setReponses(r);
    ajoutes.current += 1;
    vuAt.current = new Date().toISOString();
    poserTrait(1);
    return r;
  };

  const majItem = (i: number, f: (x: ItemSeance) => ItemSeance) => setSeance((s) => ({ ...s, items: s.items.map((x) => (x.i === i ? f(x) : x)) }));

  const validerQcm = async (donne: number | null = choix) => {
    if (!item || item.k === "calc" || donne === null || corrige || envoi) return;
    setChoix(donne);
    setEnvoi(true);
    setMessage(null);
    try {
      const r = await api.repondre(seance.id, item.i, donne, !!retest, secondes);
      if (r.ferme) return onFin({ seance, reponses, secondes, ajoutes: ajoutes.current, vuAt: vuAt.current, ferme: true });
      noter(item.i, r.juste);
      majItem(item.i, (x) =>
        x.k === "calc" ? x : retest ? { ...x, retest: { choix: r.choix, juste: r.juste } } : { ...x, premier: { choix: r.choix, juste: r.juste, bonne: r.bonne, explication: r.explication, statut: r.statut } },
      );
      setCorrige({ k: "qcm", juste: r.juste, choix: r.choix, bonne: r.bonne, explication: r.explication, statut: r.statut, xp: r.xp });
    } catch {
      setMessage(V.erreurReponse);
    } finally {
      setEnvoi(false);
    }
  };

  const validerCalc = async (raw: string) => {
    if (!item || item.k !== "calc" || corrige || envoi) return;
    setEnvoi(true);
    setMessage(null);
    try {
      const r = await api.repondreCalc(seance.id, item.i, raw, !!retest, secondes);
      if (r.ferme) return onFin({ seance, reponses, secondes, ajoutes: ajoutes.current, vuAt: vuAt.current, ferme: true });
      if (r.status === "format") return setMessage(r.indice);
      if (r.status === "erreur") return setMessage(r.message);
      const juste = r.status === "juste";
      noter(item.i, juste);
      majItem(item.i, (x) => (x.k !== "calc" ? x : retest ? { ...x, retest: { valeur: r.valeur, juste } } : { ...x, premier: { valeur: r.valeur, juste, bonne: r.bonne, solution: r.solution } }));
      setCorrige({ k: "calc", juste, valeur: r.valeur, bonne: r.bonne, solution: r.solution, xp: r.xp });
    } catch {
      setMessage(V.erreurReponse);
    } finally {
      setEnvoi(false);
    }
  };

  const continuerRappel = () => {
    if (etape?.type !== "rappel") return;
    const vus = [...rappelsVus, { notion: etape.raison === "ouverture" ? null : etape.notions[0], apres: reponses.length }];
    setRappelsVus(vus);
    suivante(reponses, vus, secondes);
  };

  // Clavier : A/B/C ou 1/2/3 pour choisir, Entrée pour valider puis passer à la suite
  const actions = useRef({ validerQcm, apres: () => suivante(reponses, rappelsVus, secondes) });
  actions.current = { validerQcm, apres: () => suivante(reponses, rappelsVus, secondes) };
  useEffect(() => {
    if (!item || item.k === "calc") return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const ix = k.length === 1 ? Math.max("12345".indexOf(k), "abcde".indexOf(k)) : -1;
      if (!corrige && ix >= 0 && ix < item.choices.length) setChoix(ix);
      else if (e.key === "Enter" && el?.tagName !== "BUTTON" && el?.tagName !== "A") {
        e.preventDefault();
        if (corrige) actions.current.apres();
        else void actions.current.validerQcm(undefined);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [corrige, item]);

  const e = etat(reponses, rappelsVus, secondes);
  const blocs = etape ? avancement(e, plan, etape) : [];
  const courant = blocs.findIndex((b) => b.etat === "encours");
  const blocCourant = blocs[courant]?.bloc ?? "rappel";
  const libelle = (n: string) => rappels[n]?.libelle ?? n;
  const rappelsListe = seance.notions.map((n) => rappels[n]).filter((r): r is RappelNotion => !!r);

  return (
    <div ref={haut} className="grid scroll-mt-24 gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-6">
      {/* En-tête : le chrono (l'anneau se remplit avec le temps), le bloc, le rappel, l'arrêt */}
      <header className="sticky top-[72px] z-30 flex items-center gap-3 rounded-[18px] border border-line bg-surface/90 px-3 py-2 shadow-[var(--shadow-1)] backdrop-blur-md md:px-4 lg:col-span-2">
        <span role="timer" aria-label={V.chronoLabel(secondes)} className="flex items-center gap-2">
          <InkProgressRing pct={Math.min(100, (secondes / DUREE_S) * 100)} size={34} delay={0} />
          <span className="font-mono text-[14px] font-semibold tabular-nums">{V.chrono(secondes)}</span>
        </span>
        <span className="t-micro min-w-0 flex-1 truncate font-semibold">{blocs.length ? V.etape(Math.max(1, courant + 1), blocs.length, blocCourant) : V.nom}</span>
        <button type="button" className="btn btn-ghost btn-sm !h-11 gap-1.5 px-2.5 lg:hidden" onClick={() => setRappelOuvert(true)} aria-label={V.rappel}>
          <BookOpen size={16} aria-hidden />
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm !h-11 !w-11 !p-0"
          aria-label={V.arreterLabel}
          onClick={() => onPause({ seance, reponses, secondes, ajoutes: ajoutes.current, vuAt: vuAt.current })}
        >
          <X size={18} aria-hidden />
        </button>
      </header>

      <div className="mx-auto grid w-full min-w-0 max-w-[680px] gap-4">
        {etape?.type === "rappel" && (
          <BlocRappel
            rappels={etape.notions.map((n) => rappels[n]).filter((r): r is RappelNotion => !!r)}
            raison={etape.raison}
            libelle={libelle(etape.notions[0])}
            onContinuer={continuerRappel}
          />
        )}

        {item && etape?.type === "question" && (
          <section key={`${item.i}-${retest ? "r" : "p"}`} className="card rl-in flex min-w-0 flex-col gap-5 p-5 md:p-7" aria-label={BLOC_NOM[etape.bloc]}>
            <div className="flex min-h-[26px] items-center justify-between gap-3">
              <p className="kicker m-0 min-w-0 truncate">
                {libelle(item.notion)} · {retest ? V.surRetest : item.k === "rature" ? V.surRature(item.misses) : item.k === "neuve" ? `${V.surNeuve} · ${NIVEAU_QUESTION[item.niveau]}` : `${BLOC_NOM.calcul} · ${(item as ItemCalc).nomType} · ${NIVEAU_CALCUL[item.niveau]}`}
              </p>
              {corrige && item.k !== "calc" && <MarqueQuestion questionId={item.ref} source="atelier" />}
            </div>
            {item.k === "calc" ? (
              <AtelierCalcul
                item={item}
                corrige={corrige?.k === "calc" ? corrige : null}
                envoi={envoi}
                message={message}
                onRepondre={(raw) => void validerCalc(raw)}
              />
            ) : (
              <Qcm item={item} retest={!!retest} choix={choix} corrige={corrige?.k === "qcm" ? corrige : null} envoi={envoi} onChoix={setChoix} />
            )}
            {message && item.k !== "calc" && (
              <p role="alert" className="m-0 text-sm text-pen">
                {message}
              </p>
            )}
            {/* la barre d'action : collée en bas au pouce sur téléphone (au-dessus de la barre des espaces) */}
            <div className="sticky bottom-[calc(88px+env(safe-area-inset-bottom,0px))] z-20 -mx-2 flex items-center justify-between gap-3 rounded-[16px] bg-[var(--surface)] px-2 py-2 md:static md:mx-0 md:bg-transparent md:p-0">
              <span className="t-micro min-w-0 truncate">{corrige && corrige.xp > 0 ? V.xp(corrige.xp) : ""}</span>
              {corrige ? (
                <button type="button" className="btn btn-primary rl-press min-h-[44px] w-full sm:w-auto" onClick={() => suivante(reponses, rappelsVus, secondes)} autoFocus>
                  {V.suivante} <ArrowRight size={16} aria-hidden />
                </button>
              ) : item.k === "calc" ? (
                <button type="submit" form="atelier-calcul" className="btn btn-primary rl-press min-h-[44px] w-full sm:w-auto" disabled={envoi}>
                  {envoi ? V.envoi : V.valider} <ArrowRight size={16} aria-hidden />
                </button>
              ) : (
                <button type="button" className="btn btn-primary rl-press min-h-[44px] w-full sm:w-auto" disabled={choix === null || envoi} onClick={() => void validerQcm()}>
                  {envoi ? V.envoi : V.valider} <ArrowRight size={16} aria-hidden />
                </button>
              )}
            </div>
          </section>
        )}

        <button
          type="button"
          className="w-fit px-1 py-2 text-[13px] font-semibold text-muted transition-colors hover:text-white"
          onClick={() => onPause({ seance, reponses, secondes, ajoutes: ajoutes.current, vuAt: vuAt.current })}
        >
          {V.arreter}
        </button>
      </div>

      {/* Ordinateur : le plan, les notions, le rappel replié */}
      <aside className="card hidden gap-5 p-5 lg:sticky lg:top-[150px] lg:grid" aria-label={V.plan}>
        <div className="grid gap-2">
          <p className="t-eyebrow m-0">{V.plan}</p>
          <ol className="m-0 grid list-none gap-1.5 p-0">
            {blocs.map((b) => (
              <li key={b.bloc} className={"flex items-center gap-2 text-[13.5px] " + (b.etat === "encours" ? "font-semibold text-white" : "text-muted")}>
                {b.etat === "fait" ? <Check size={14} aria-hidden /> : b.etat === "encours" ? <Circle size={10} fill="currentColor" aria-hidden className="mx-0.5" /> : <Circle size={10} aria-hidden className={"mx-0.5 " + (b.etat === "saute" ? "opacity-40" : "")} />}
                <span className={"min-w-0 flex-1 " + (b.etat === "saute" ? "line-through opacity-60" : "")}>{BLOC_NOM[b.bloc]}</span>
                {b.bloc !== "rappel" && (
                  <span className="font-mono text-[12px] tabular-nums">
                    {b.fait}/{b.cible}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
        <div className="grid gap-2">
          <p className="t-eyebrow m-0">{V.notions}</p>
          <ul className="m-0 grid list-none gap-1.5 p-0">
            {seance.notions.map((n) => {
              const c = compteNotion(e, n);
              return (
                <li key={n} className="flex items-center gap-2 text-[13.5px]">
                  <span className="min-w-0 flex-1 truncate">{libelle(n)}</span>
                  <span className="font-mono text-[12px] tabular-nums text-muted">
                    {c.ok}/{c.n}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        {rappelsListe.length > 0 && (
          <div className="grid gap-2">
            <p className="t-eyebrow m-0">{V.rappel}</p>
            {rappelsListe.map((r) => (
              <details key={r.notion} className="group rounded-[12px] border border-line px-3 py-2">
                <summary className="cursor-pointer list-none text-[13.5px] font-semibold">{r.libelle}</summary>
                <div className="mt-3">
                  <CarteRappel r={r} compacte />
                </div>
              </details>
            ))}
          </div>
        )}
      </aside>

      {/* Téléphone : le rappel dans un tiroir du bas */}
      <Feuille ouvert={rappelOuvert} onFermer={() => setRappelOuvert(false)} titre={V.rappel}>
        <div className="grid gap-5 divide-y divide-line pt-2">
          {rappelsListe.map((r) => (
            <div key={r.notion} className="pt-4 first:pt-0">
              <CarteRappel r={r} compacte />
            </div>
          ))}
        </div>
      </Feuille>
    </div>
  );
}

/** Une question à choix : les réponses, puis la correction (statut au carnet, explication). */
function Qcm({
  item,
  retest,
  choix,
  corrige,
  envoi,
  onChoix,
}: {
  item: ItemQcm;
  retest: boolean;
  choix: number | null;
  corrige: Extract<Corrige, { k: "qcm" }> | null;
  envoi: boolean;
  onChoix: (i: number) => void;
}) {
  return (
    <>
      <QuestionPrompt text={item.prompt} className="text-[16.5px] font-semibold leading-[1.6] tracking-[-0.01em] break-words [overflow-wrap:anywhere] md:text-[18px]" />
      <div className="flex flex-col gap-2.5" role="radiogroup" aria-label={V.reponses}>
        {item.choices.map((c, ci) => (
          <ChoiceButton
            key={ci}
            index={ci}
            text={c}
            disabled={!!corrige || envoi}
            state={corrige ? (ci === corrige.bonne ? "correct" : ci === corrige.choix ? "wrong" : "dim") : ci === choix ? "picked" : "idle"}
            onClick={() => onChoix(ci)}
          />
        ))}
      </div>
      {corrige && (
        <div className="rl-in grid gap-3">
          <p className={"m-0 text-[15px] font-bold " + (corrige.juste ? "" : "text-pen")} role="status">
            {retest && !corrige.juste ? V.retestReste : ((corrige.statut ? V.statut[corrige.statut] : null) ?? (corrige.juste ? V.statut.juste : V.statut.reste))}
          </p>
          {corrige.explication && <Explanation text={corrige.explication} />}
        </div>
      )}
    </>
  );
}
