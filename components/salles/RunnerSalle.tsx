"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { QuestionPrompt } from "@/components/QuestionPrompt";
import { ChatSalle } from "@/components/salles/ChatSalle";
import { Ticks, type TickMark } from "@/components/defi/parts";
import type { PropsPartieExamen } from "@/components/salles/PartieExamen";
import { duelTopicLabel } from "@/lib/duels";
import { avancementJoueurs, chronoBas, copieRendue, libelleChrono, positionDeDepart, prochaineNonRepondue, refusCopieRendue, reponsesRetenues } from "@/lib/salles/examen";
import { DEFI } from "@/lib/voice-z2c";
import { EXAMEN, RUNNER_SALLE, SALLES } from "@/lib/voice-salles";

const LETTRES = ["A", "B", "C", "D", "E"];

// La copie d'une partie de Salle en chrono global, avec l'écran des 30 du jour
// (DefiRunner) : en-tête collant (partie, chrono, avancement, coches), une
// question à la fois, les mêmes boutons et raccourcis. En plus des 30 du jour :
// on revient sur n'importe quelle question (coches, « Question précédente », ←)
// et on change sa réponse tant que la copie n'est pas rendue. Rien n'est
// corrigé avant la fin ; « Rendre ma copie » verrouille tout. QCM seulement.
export function RunnerSalle({
  session,
  items,
  mesReponses,
  locales,
  membres,
  moi,
  repondre,
  rendreCopie,
  onArreter,
  restantMs,
  totalMs,
}: PropsPartieExamen & { restantMs: number; totalMs: number }) {
  const nb = session.nb;
  const retenues = useMemo(() => reponsesRetenues(nb, locales, mesReponses), [nb, locales, mesReponses]);
  const [courante, setCourante] = useState(() => positionDeDepart(nb, retenues));
  const [choisi, setChoisi] = useState<number | null>(() => retenues.get(positionDeDepart(nb, retenues))?.choix ?? null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [rendueIci, setRendueIci] = useState(false);
  const rendue = rendueIci || copieRendue(session, moi.userId);
  const q = items.find((i) => i.position === courante) ?? null;
  const dejaChoix = retenues.get(courante)?.choix ?? null;
  const repondues = retenues.size;
  const blanches = nb - repondues;
  const bas = chronoBas(restantMs, totalMs);
  const autres = avancementJoueurs({ session, membres, moiId: moi.userId, mesRepondues: repondues, moiRendu: rendue }).filter((j) => !j.moi);

  const aller = useCallback(
    (p: number) => {
      if (p < 0 || p >= nb) return;
      setErreur(null);
      setCourante(p);
      setChoisi(retenues.get(p)?.choix ?? null);
    },
    [nb, retenues],
  );

  const valider = useCallback(async () => {
    if (choisi === null || envoi || rendue) return;
    // même réponse qu'avant : on passe simplement à la suite
    if (choisi !== dejaChoix) {
      setEnvoi(true);
      setErreur(null);
      try {
        const r = await repondre(courante, { choix: choisi });
        if (!r.ok) {
          setErreur(r.indice);
          return;
        }
      } catch (e) {
        if (refusCopieRendue(e)) setRendueIci(true);
        setErreur(e instanceof Error ? e.message : DEFI.pasPartie);
        return;
      } finally {
        setEnvoi(false);
      }
    }
    const repondueIci = new Set(retenues.keys()).add(courante);
    const suite = prochaineNonRepondue(nb, repondueIci, courante);
    if (suite !== null) aller(suite);
  }, [aller, choisi, courante, dejaChoix, envoi, nb, rendue, repondre, retenues]);

  const passer = useCallback(() => {
    const suite = prochaineNonRepondue(nb, retenues, courante);
    if (suite !== null && suite !== courante) aller(suite);
  }, [aller, courante, nb, retenues]);

  async function rendre() {
    if (rendue || envoi) return;
    if (!window.confirm(RUNNER_SALLE.confirmRendre(blanches))) return;
    setEnvoi(true);
    try {
      await rendreCopie();
      setRendueIci(true);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : DEFI.pasPartie);
    } finally {
      setEnvoi(false);
    }
  }

  async function arreter() {
    if (!onArreter || !window.confirm(SALLES.arreterConfirme)) return;
    await onArreter();
  }

  // Clavier : 1 à 5 ou A à E pour choisir, Entrée pour valider, ← → pour changer de question
  const validerRef = useRef(valider);
  useEffect(() => {
    validerRef.current = valider;
  }, [valider]);
  useEffect(() => {
    if (!q || rendue) return;
    const n = q.choix?.length ?? 0;
    const touche = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const parChiffre = k.length === 1 ? "12345".indexOf(k) : -1;
      const parLettre = k.length === 1 ? "abcde".indexOf(k) : -1;
      const ix = parChiffre >= 0 ? parChiffre : parLettre;
      if (ix >= 0 && ix < n) setChoisi(ix);
      else if (e.key === "Enter") {
        e.preventDefault();
        void validerRef.current();
      } else if (e.key === "ArrowLeft") aller(courante - 1);
      else if (e.key === "ArrowRight") aller(courante + 1);
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [aller, courante, q, rendue]);

  const coches: TickMark[] = Array.from({ length: nb }, (_, i) => (i === courante && !rendue ? "current" : retenues.has(i) ? "done" : "todo"));
  const titre = session.params.mock?.examens.length ? session.params.mock.examens.join(" + ") : SALLES.partieTitre(session.numero);

  return (
    // la salle passe en mode sobre (SalonView) : le papier du site, l'encre du site, thème nuit compris
    <div className="grid gap-6 md:gap-8" style={{ color: "var(--ink)" }}>
      <header className="sticky top-[72px] z-30 rounded-[18px] border border-line bg-surface/90 px-4 py-3 shadow-[var(--shadow-1)] backdrop-blur-md md:px-6 md:py-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 md:gap-5">
          <div className="min-w-0">
            <div className="truncate text-[14px] font-bold md:text-[16px]">{titre}</div>
            <div className="t-micro truncate">{SALLES.partieTitre(session.numero)} · {EXAMEN.kicker}</div>
          </div>
          <span className={"t-num text-[26px] md:text-[38px] " + (bas ? "text-pen" : "")} role="timer" aria-live="off" aria-label={`${EXAMEN.tempsRestant} ${libelleChrono(restantMs)}`}>
            {libelleChrono(restantMs)}
          </span>
          <div className="min-w-0 text-right">
            <div className="font-mono text-[14px] font-semibold tabular-nums md:text-[16px]">
              {repondues}
              <span className="font-normal text-muted">/{nb}</span>
            </div>
            <div className="t-micro truncate">{DEFI.repondues}</div>
          </div>
        </div>
        <Ticks className="mt-3" marks={coches} label={DEFI.avancement} onPick={aller} canPick={() => true} />
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      {rendue ? (
        <section className="card rl-in grid w-full place-items-center gap-2 p-8 text-center">
          <h2 className="t-h2 m-0">{RUNNER_SALLE.rendueTitre}</h2>
          <p className="t-small m-0">{RUNNER_SALLE.rendueTexte}</p>
        </section>
      ) : !q || !q.choix ? null : (
        <div className="grid w-full min-w-0 gap-[22px]">
          <p className="kicker m-0">{DEFI.question(q.position + 1, nb, duelTopicLabel(q.topic))}</p>

          <section className="card flex min-w-0 flex-col gap-6 p-5 md:p-7">
            <div key={q.position} className="rl-in">
              <QuestionPrompt
                text={q.enonce}
                className="text-[17px] font-semibold leading-normal tracking-[-0.01em] break-words [overflow-wrap:anywhere] md:text-[20px]"
              />
            </div>
            <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Réponses">
              {q.choix.map((c, i) => {
                const on = choisi === i;
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setChoisi(i)}
                    className={
                      "btn w-full justify-start gap-3.5 rounded-[14px] px-4 py-3.5 text-left text-[15px] md:px-[18px] md:py-4 md:text-base " +
                      (on ? "btn-primary" : "btn-secondary")
                    }
                  >
                    <span
                      className={
                        "grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] font-mono text-[13px] " + (on ? "bg-black/20" : "bg-surface-2 text-white")
                      }
                    >
                      {LETTRES[i] ?? i + 1}
                    </span>
                    <span className="min-w-0 flex-1 break-words">{c}</span>
                  </button>
                );
              })}
            </div>
            {dejaChoix !== null && <p className="t-small m-0 text-muted">{RUNNER_SALLE.dejaRepondue(LETTRES[dejaChoix] ?? String(dejaChoix + 1))}</p>}
            {erreur && (
              <p role="alert" className="m-0 text-sm text-pen">
                {erreur}
              </p>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-center gap-4 sm:justify-start">
                <button
                  type="button"
                  onClick={() => aller(courante - 1)}
                  disabled={courante === 0}
                  className="inline-flex items-center gap-1 py-1 text-[14px] font-semibold text-muted transition-colors hover:text-white disabled:opacity-40"
                >
                  <ArrowLeft size={15} aria-hidden /> {RUNNER_SALLE.precedente}
                </button>
                <button
                  type="button"
                  onClick={passer}
                  disabled={blanches === 0 || (blanches === 1 && !retenues.has(courante))}
                  className="py-1 text-[14px] font-semibold text-muted transition-colors hover:text-white disabled:opacity-40"
                >
                  {DEFI.passer}
                </button>
              </div>
              <button type="button" className="btn btn-primary w-full sm:w-auto" disabled={choisi === null || envoi} onClick={() => void valider()}>
                {envoi ? DEFI.envoi : dejaChoix !== null && choisi !== dejaChoix ? RUNNER_SALLE.changer : DEFI.valider}
                <ArrowRight size={16} aria-hidden />
              </button>
            </div>
          </section>

          {blanches === 0 && <p className="t-small m-0 text-center font-semibold">{RUNNER_SALLE.toutRepondu}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[13px] text-muted">
            <span>
              {RUNNER_SALLE.modifiable}
              <br />
              <strong className="font-semibold">{DEFI.chronoTourne}</strong>
            </span>
            <div className="flex items-center gap-4">
              {onArreter && (
                <button type="button" onClick={() => void arreter()} className="font-semibold transition-colors hover:text-white">
                  {SALLES.arreter}
                </button>
              )}
              <button type="button" onClick={() => void rendre()} className={"font-semibold transition-colors hover:text-white " + (blanches === 0 ? "text-white underline underline-offset-4" : "")}>
                {DEFI.rendre}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* à droite : toutes les cases (aller à n'importe quelle question), l'avancement des autres et le chat */}
      <aside className="grid gap-4 lg:sticky lg:top-[180px] lg:max-h-[calc(100svh-190px)] lg:overflow-y-auto">
        <section className="card-quiet grid gap-3 p-4" aria-label={RUNNER_SALLE.cases}>
          <p className="t-micro m-0">{RUNNER_SALLE.cases}</p>
          <ol className="m-0 grid max-h-[200px] list-none grid-cols-[repeat(auto-fill,minmax(36px,1fr))] gap-1.5 overflow-y-auto p-0">
            {Array.from({ length: nb }, (_, i) => {
              const fait = retenues.has(i);
              const ici = i === courante && !rendue;
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => aller(i)}
                    aria-current={ici ? "true" : undefined}
                    aria-label={RUNNER_SALLE.caseAria(i + 1, fait)}
                    className={
                      "h-[34px] w-full rounded-[8px] font-mono text-[12px] tabular-nums transition-colors " +
                      (fait ? "bg-[var(--ink)] text-[var(--paper)] " : "bg-surface-2 text-muted hover:text-[var(--ink)] ") +
                      (ici ? "ring-2 ring-[var(--pen)] ring-offset-1 ring-offset-[var(--paper)]" : "")
                    }
                  >
                    {i + 1}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="t-micro m-0">{RUNNER_SALLE.casesLegende}</p>
        </section>
        {autres.length > 0 && (
          <section className="card-quiet grid gap-3 p-4" aria-label={RUNNER_SALLE.joueursTitre}>
            <p className="t-micro m-0">{RUNNER_SALLE.joueursTitre}</p>
            <ul className="m-0 grid list-none gap-2.5 p-0">
              {autres.map((j) => (
                <li key={j.userId} className="grid gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="min-w-0 truncate font-semibold">{j.username?.trim() || "Un joueur"}</span>
                    <span className="shrink-0 font-mono tabular-nums text-muted">
                      {j.rendu ? RUNNER_SALLE.copieRendue + " · " : ""}
                      {j.n}/{nb}
                    </span>
                  </div>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                    <span className="block h-full rounded-full bg-[var(--ink)]" style={{ width: `${Math.round((100 * j.n) / Math.max(1, nb))}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {membres.length > 1 && <ChatSalle canal={session.id} moi={{ userId: moi.userId, nom: membres.find((j) => j.userId === moi.userId)?.username ?? RUNNER_SALLE.chatAnonyme }} />}
      </aside>
      </div>
    </div>
  );
}
