"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import {
  CAUSES,
  DEBRIEF,
  avecCause,
  etatVide,
  ligneRepartition,
  lireDebrief,
  noterCause,
  repartitionVisible,
  rythme,
  type CauseErreur,
  type EtatDebrief,
  type SourceDebrief,
} from "@/lib/debrief";
import { ancreRevue, type ReviewQuestion } from "@/components/session/review";

// Le débrief d'une copie (V3 §7.6), posé dans la correction (ReviewSection) :
// - en tête, l'avancement (« Débrief : 12/20 erreurs classées »), puis la
//   répartition une fois 80 % classées (« 30 % de lecture ») et le temps par
//   question avec sa cible ; un bouton mène à la première erreur non classée ;
// - sous chaque question ratée, les cinq causes, un toucher, modifiable.
// Le toucher est posé tout de suite, la base confirme (blanc_debrief_noter) ;
// refusé : il est retiré, une ligne le dit. Sans la section §5 (lecture
// impossible, ou fonction absente au premier toucher) : boutons masqués, le
// temps par question reste. `ouvrir` (?debrief=1) : la page s'ouvre sur la
// première erreur non classée.

type Ctx = {
  etat: EtatDebrief;
  actif: boolean;
  noter: (questionId: string, cause: CauseErreur) => void;
  refus: string | null;
  allerPremiere: () => void;
};
const DebriefCtx = createContext<Ctx | null>(null);

/** La copie et ce qu'on en sait déjà. `initial` : lu par le serveur (null : section absente ; absent : à lire ici). */
export type CopieDebrief = {
  source: SourceDebrief;
  /** mock_exams.id ou quiz_attempts.id ; null : pas encore connue (boutons masqués) */
  ref: string | null;
  initial?: EtatDebrief | null;
  /** durée de la copie / questions, quand la base ne le dit pas */
  secondesParQuestion?: number | null;
  ouvrir?: boolean;
};

export function DebriefCopie({
  copie,
  review,
  demo = false,
  children,
}: {
  copie: CopieDebrief;
  review: ReviewQuestion[];
  /** aperçus : aucun appel réseau, les touchers restent locaux */
  demo?: boolean;
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => (demo ? null : createClient()), [demo]);
  const erreurs = useMemo(() => review.filter((q) => !q.is_correct).map((q) => q.question_id), [review]);
  const lu = copie.initial !== undefined;
  const [etat, setEtat] = useState<EtatDebrief>(() => {
    const base = copie.initial ?? etatVide(erreurs.length, copie.secondesParQuestion ?? null);
    return { ...base, secondesParQuestion: base.secondesParQuestion ?? copie.secondesParQuestion ?? null };
  });
  // les boutons ne se montrent qu'une fois la section §5 lue (en aperçu : l'état donné)
  const [actif, setActif] = useState(copie.initial != null && (demo || copie.ref !== null));
  const [refus, setRefus] = useState<string | null>(null);
  const ouvert = useRef(false);

  // copie rendue pendant la visite (ou lue sans le serveur) : l'état se lit ici
  useEffect(() => {
    if (demo || lu || !supabase || !copie.ref) return;
    let fini = false;
    void lireDebrief(supabase, copie.source, copie.ref).then((e) => {
      if (fini) return;
      if (e) {
        setEtat({ ...e, secondesParQuestion: e.secondesParQuestion ?? copie.secondesParQuestion ?? null });
        setActif(true);
      }
    });
    return () => {
      fini = true;
    };
  }, [demo, lu, supabase, copie.source, copie.ref, copie.secondesParQuestion]);

  const allerPremiere = useCallback(() => {
    const cible = erreurs.find((q) => !etat.notes[q]) ?? erreurs[0];
    if (!cible) return;
    // la correction vient peut-être de s'ouvrir : on attend qu'elle soit posée
    window.setTimeout(() => {
      const el = document.getElementById(ancreRevue(cible));
      if (!el) return;
      const reduit = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduit ? "auto" : "smooth", block: "start" });
      el.querySelector<HTMLElement>("[data-debrief] button")?.focus({ preventScroll: true });
    }, 60);
  }, [erreurs, etat.notes]);

  // ?debrief=1 : la première erreur non classée, une fois l'état connu
  useEffect(() => {
    if (!copie.ouvrir || ouvert.current || !actif) return;
    ouvert.current = true;
    allerPremiere();
  }, [copie.ouvrir, actif, allerPremiere]);

  const noter = useCallback(
    (questionId: string, cause: CauseErreur) => {
      const avant = etat;
      setRefus(null);
      setEtat((e) => avecCause(e, questionId, cause));
      if (demo || !supabase || !copie.ref) return;
      void noterCause(supabase, copie.source, copie.ref, questionId, cause).then((r) => {
        if (r.ok) {
          setEtat((e) => ({ ...e, erreurs: r.erreurs || e.erreurs, classees: r.classees }));
          return;
        }
        setEtat(avant);
        if (r.absente) setActif(false);
        else setRefus(questionId);
      });
    },
    [etat, demo, supabase, copie.source, copie.ref],
  );

  const valeur = useMemo<Ctx>(() => ({ etat, actif, noter, refus, allerPremiere }), [etat, actif, noter, refus, allerPremiere]);
  return <DebriefCtx.Provider value={valeur}>{children}</DebriefCtx.Provider>;
}

/** En tête de la correction : avancement, répartition, temps par question. `ouvrir` déplie la correction. */
export function EnteteDebrief({ ouvrir }: { ouvrir?: () => void }) {
  const ctx = useContext(DebriefCtx);
  if (!ctx) return null;
  const { etat, actif, allerPremiere } = ctx;
  const s = etat.secondesParQuestion;
  if (!actif && s === null) return null;
  const montrer = actif && etat.erreurs > 0;
  const reste = etat.erreurs - etat.classees;
  return (
    <div className="card-quiet flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4" aria-label={DEBRIEF.titre}>
      <div className="grid min-w-0 gap-1">
        {montrer && (
          <p className="m-0 text-[14.5px] font-semibold" aria-live="polite">
            {DEBRIEF.titre} : <span className="tabular-nums">{DEBRIEF.avancement(etat.classees, etat.erreurs)}</span>
          </p>
        )}
        {montrer && (repartitionVisible(etat) ? <p className="t-small m-0">{ligneRepartition(etat)}</p> : <p className="t-micro m-0">{DEBRIEF.aClasser}</p>)}
        {s !== null && (
          <p className="t-small m-0">
            <span className={"tabular-nums " + (rythme(s) === "cible" ? "" : "font-semibold text-white")}>{DEBRIEF.temps(s)}</span>
            <span className="t-micro"> · {DEBRIEF.cible}</span>
          </p>
        )}
      </div>
      {montrer && reste > 0 && (
        <button
          type="button"
          className="btn btn-secondary btn-sm min-h-[44px] shrink-0"
          onClick={() => {
            ouvrir?.();
            allerPremiere();
          }}
        >
          {etat.classees > 0 ? DEBRIEF.reprendre : DEBRIEF.commencer} <ArrowDown size={14} aria-hidden />
        </button>
      )}
      {montrer && reste === 0 && <p className="t-micro m-0 shrink-0">{DEBRIEF.fini}</p>}
    </div>
  );
}

/** Sous une question ratée : les cinq causes, un toucher, modifiable. */
export function CausesErreur({ questionId, compact = false }: { questionId: string; compact?: boolean }) {
  const ctx = useContext(DebriefCtx);
  if (!ctx || !ctx.actif) return null;
  const choisie = ctx.etat.notes[questionId] ?? null;
  return (
    <div data-debrief className={"border-t border-line " + (compact ? "mt-3 pt-3" : "mt-5 pt-4")}>
      <p id={`debrief-${questionId}`} className="t-micro m-0">
        {DEBRIEF.question}
      </p>
      <div role="radiogroup" aria-labelledby={`debrief-${questionId}`} className="mt-2 flex flex-wrap gap-2">
        {CAUSES.map((c) => {
          const oui = choisie === c.cle;
          return (
            <button
              key={c.cle}
              type="button"
              role="radio"
              aria-checked={oui}
              onClick={() => ctx.noter(questionId, c.cle)}
              className={
                "min-h-[44px] rounded-[10px] border px-3 text-[13px] leading-tight transition-colors " +
                (oui
                  ? "border-white bg-surface font-semibold text-white shadow-[inset_0_0_0_1px_var(--ink)]"
                  : "border-line-2 text-muted hover:border-[color-mix(in_oklab,var(--ink)_32%,transparent)] hover:text-white")
              }
            >
              {c.libelle}
            </button>
          );
        })}
      </div>
      {ctx.refus === questionId && (
        <p role="alert" className="t-micro m-0 mt-2 text-pen">
          {DEBRIEF.nonEnregistre}
        </p>
      )}
    </div>
  );
}

/** Le pied d'une question de la correction : les causes, pour une question ratée seulement. */
export const piedDebrief = (q: ReviewQuestion, compact = false) => (q.is_correct ? null : <CausesErreur questionId={q.question_id} compact={compact} />);
