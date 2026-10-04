"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { ChoiceButton, Explanation, QuestionCard } from "@/components/session/parts";
import type { ReviewQuestion } from "@/components/session/review";
import { REPRISE } from "@/lib/voice-z3";

// « Reprendre mes ratures » : les questions ratées de la copie, rejouées une
// à une et corrigées tout de suite. La copie est déjà rendue : la bonne
// réponse est connue du navigateur, rien ne part au serveur, rien n'est
// enregistré (ni stats, ni anneau du jour).
//
//   <RepriseRatures ratures={review.filter((q) => !q.is_correct)} numeros={…} onFin={…} />
//
// Props
//   ratures   les questions à reprendre (ReviewQuestion, correction comprise)
//   numeros   numéro d'origine de chaque question dans la copie (« Q7 »)
//   onFin     « Revenir à la copie »

export function RepriseRatures({
  ratures,
  numeros,
  onFin,
}: {
  ratures: ReviewQuestion[];
  numeros?: number[];
  onFin: () => void;
}) {
  // la file de cette reprise (on peut relancer avec les restantes)
  const [file, setFile] = useState(() => ratures.map((q, k) => ({ q, n: numeros?.[k] ?? k + 1 })));
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [valide, setValide] = useState(false);
  const [justes, setJustes] = useState<boolean[]>([]);
  const root = useRef<HTMLElement | null>(null);

  // l'écran arrive en haut, à chaque question
  useEffect(() => {
    root.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [i]);

  const fini = i >= file.length;
  const cur = file[i];
  const ok = valide && cur ? pick === cur.q.correct_index : false;

  function valider() {
    if (pick === null || !cur) return;
    setValide(true);
    setJustes((p) => [...p, pick === cur.q.correct_index]);
  }

  function suivante() {
    setI((v) => v + 1);
    setPick(null);
    setValide(false);
  }

  function relancer() {
    setFile((f) => f.filter((_, k) => !justes[k]));
    setJustes([]);
    setI(0);
    setPick(null);
    setValide(false);
  }

  // Clavier : 1–6 ou A–F pour choisir, Entrée pour valider puis avancer.
  useEffect(() => {
    if (fini) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const n = cur?.q.choices.length ?? 0;
      let p = -1;
      if (/^[1-6]$/.test(k)) p = Number(k) - 1;
      else if (/^[a-f]$/.test(k)) p = k.charCodeAt(0) - 97;
      if (p >= 0) {
        if (p < n && !valide) {
          setPick(p);
          e.preventDefault();
        }
        return;
      }
      if (e.key === "Enter" && tag !== "BUTTON" && tag !== "A") {
        e.preventDefault();
        if (!valide) valider();
        else suivante();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const reprises = justes.filter(Boolean).length;
  const reste = file.length - reprises;

  if (fini) {
    return (
      <section ref={root} className="card-hero rl-in grid scroll-mt-24 gap-5 p-6 md:p-8" aria-label="Fin de la reprise">
        <div>
          <p className="t-eyebrow m-0">{REPRISE.surTitre}</p>
          <h2 className="t-h1 m-0 mt-2">{REPRISE.fin(reprises, file.length)}</h2>
          <p className="t-small m-0 mt-2">{REPRISE.finLigne(reste)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {reste > 0 && (
            <button type="button" className="btn btn-primary btn-lg rl-press" onClick={relancer}>
              {REPRISE.recommencer(reste)} <ArrowRight size={17} aria-hidden />
            </button>
          )}
          <button type="button" className={"btn btn-lg " + (reste > 0 ? "btn-ghost" : "btn-primary rl-press")} onClick={onFin}>
            {REPRISE.retour}
          </button>
        </div>
      </section>
    );
  }

  if (!cur) return null;
  const q = cur.q;

  return (
    <section ref={root} className="grid scroll-mt-24 gap-4" aria-label="Reprendre mes ratures">
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="t-micro shrink-0 font-semibold">
          {REPRISE.surTitre} · <span className="font-mono tabular-nums">{REPRISE.compte(i + 1, file.length)}</span>
        </span>
        <div className="ink-bar flex-1" aria-hidden>
          <span style={{ width: `${Math.round(((i + (valide ? 1 : 0)) / Math.max(1, file.length)) * 100)}%` }} />
        </div>
        <button type="button" className="t-micro shrink-0 font-semibold transition-colors hover:text-white" onClick={onFin}>
          {REPRISE.retour}
        </button>
      </div>

      <QuestionCard
        index={cur.n - 1}
        topic={q.topic}
        prompt={q.prompt}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            {valide ? (
              <p className={"m-0 inline-flex items-center gap-2 text-[15px] font-semibold " + (ok ? "" : "text-pen")} aria-live="polite">
                {ok ? <Check size={17} aria-hidden /> : <X size={17} aria-hidden />}
                {ok ? REPRISE.reprise : q.explanation ? REPRISE.encore : REPRISE.encoreSeule}
              </p>
            ) : (
              <span className="t-micro">{REPRISE.note}</span>
            )}
            {valide ? (
              <button type="button" className="btn btn-primary rl-press" onClick={suivante}>
                {i + 1 >= file.length ? "Terminer" : "Suivante"} <ArrowRight size={16} aria-hidden />
              </button>
            ) : (
              <button type="button" className="btn btn-primary rl-press" disabled={pick === null} onClick={valider}>
                Valider
              </button>
            )}
          </div>
        }
      >
        {q.choices.map((c, ci) => (
          <ChoiceButton
            key={ci}
            index={ci}
            text={c}
            disabled={valide}
            state={valide ? (ci === q.correct_index ? "correct" : ci === pick ? "wrong" : "dim") : ci === pick ? "picked" : "idle"}
            onClick={() => setPick(ci)}
          />
        ))}
        {valide && q.explanation && <Explanation text={q.explanation} className="rl-in mt-2" />}
      </QuestionCard>
    </section>
  );
}
