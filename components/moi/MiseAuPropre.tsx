"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { QuestionPrompt } from "@/components/QuestionPrompt";
import { Explanation } from "@/components/session/parts";
import { Rature } from "@/components/adn/Rature";
import { rubriqueDe } from "@/components/moi/marquees-data";
import { CARNET, SOURCES_RATURE } from "@/lib/voice-z1";

// « Mettre au propre » (Moi › Erreurs) : les ratures en cours repassées une
// à une, au hasard (rature_suivante), dans le tri choisi. Juste : rayée (elle
// rejoint les anciennes) ; faux : elle reste (rature_repondre). Même chose
// pour « Rejouer les anciennes », une révision : juste, elle reste rayée ;
// faux, elle revient en cours. La correction ne vient qu'après la réponse.
// On s'arrête quand on veut, on revient plus tard. Avec `theme` (« Tes points
// faibles »), seules les ratures des sets du thème (p_sets,
// migration_points_faibles.sql) ; les autres appels n'envoient pas p_sets.

const LETTRES = ["A", "B", "C", "D", "E", "F"];
const NOMS = new Map(SOURCES_RATURE);

/** La fonction appelée n'existe pas (encore) en base : migration pas collée. */
const fonctionAbsente = (e: { code?: string; message?: string }) =>
  ["PGRST202", "PGRST205", "42883", "42P01", "42703"].includes(e.code ?? "") || /could not find the function/i.test(e.message ?? "");

type Tiree = {
  questionId: string;
  prompt: string;
  choices: string[];
  sources: string[];
  rubrique: string;
};

type Resultat = {
  juste: boolean;
  bonne: number;
  explication: string | null;
  choisi: number;
  /** rayee, reste (en cours) ; ancienne, revenue (anciennes) */
  statut: string;
};

type QuestionTiree = { question_id: string; prompt: string; choices: string[]; sources: string[]; set_title: string | null; folder_name: string | null };

/** Aperçus locaux : des ratures d'exemple, corrigées sur place (sans réseau). */
export type DemoPropre = { questions: (QuestionTiree & { bonne: number; explication: string })[] };

export function MiseAuPropre({
  source,
  theme,
  anciennes = false,
  onStatut,
  onFermer,
  demo,
}: {
  /** le tri du carnet (null : toutes les ratures) */
  source: string | null;
  /** un thème (« Tes points faibles ») : ses sets et son nom */
  theme?: { sets: string[]; libelle: string };
  /** rejouer les anciennes (rayées) plutôt que mettre au propre celles en cours */
  anciennes?: boolean;
  /** ce qui est arrivé à la rature (rayee, reste, ancienne, revenue) et ses sources, pour les compteurs du carnet */
  onStatut: (statut: string, sources: string[]) => void;
  onFermer: () => void;
  demo?: DemoPropre;
}) {
  const sb = useMemo(() => createClient(), []);
  const [tiree, setTiree] = useState<Tiree | null>(null);
  const [reste, setReste] = useState<number | null>(null);
  const [fini, setFini] = useState<"vide" | "tour" | null>(null);
  const [choix, setChoix] = useState<number | null>(null);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(false);
  // la reprise par thème demande migration_points_faibles.sql
  const [indisponible, setIndisponible] = useState(false);
  // les sets du thème, en clé stable (le tirage ne se relance pas à chaque rendu du parent)
  const cleSets = theme ? theme.sets.join(",") : null;
  const [bilan, setBilan] = useState({ rayees: 0, restees: 0 });
  const vues = useRef<string[]>([]);
  const haut = useRef<HTMLDivElement>(null);

  const tirer = useCallback(async () => {
    setEnvoi(true);
    setErreur(false);
    setChoix(null);
    setResultat(null);
    const restantes = demo?.questions.filter((q) => !vues.current.includes(q.question_id));
    const { data, error } = demo
      ? { data: { carnet: demo.questions.length, reste: restantes?.length ?? 0, question: restantes?.[0] ?? null }, error: null }
      : await sb.rpc("rature_suivante", {
          p_source: source,
          p_exclure: vues.current,
          p_anciennes: anciennes,
          // le filtre de thème seulement quand il y en a un : les appels du carnet restent à 3 arguments
          ...(cleSets === null ? {} : { p_sets: cleSets ? cleSets.split(",") : [] }),
        });
    setEnvoi(false);
    if (error) return cleSets !== null && fonctionAbsente(error) ? setIndisponible(true) : setErreur(true);
    const r = data as { carnet: number; reste: number; question: null | QuestionTiree };
    setReste(Number(r.reste) || 0);
    if (!r.question) {
      setTiree(null);
      setFini(Number(r.carnet) > 0 ? "tour" : "vide");
      return;
    }
    setFini(null);
    setTiree({
      questionId: r.question.question_id,
      prompt: r.question.prompt,
      choices: r.question.choices ?? [],
      sources: r.question.sources ?? [],
      rubrique: rubriqueDe(r.question.set_title, r.question.folder_name).rubrique,
    });
    haut.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [anciennes, cleSets, demo, sb, source]);

  useEffect(() => {
    void tirer();
  }, [tirer]);

  const valider = useCallback(async () => {
    if (!tiree || choix === null || resultat || envoi) return;
    setEnvoi(true);
    setErreur(false);
    const exemple = demo?.questions.find((q) => q.question_id === tiree.questionId);
    const { data, error } = exemple
      ? {
          data: {
            is_correct: choix === exemple.bonne,
            correct_index: exemple.bonne,
            explanation: exemple.explication,
            selected_index: choix,
            statut: choix === exemple.bonne ? (anciennes ? "ancienne" : "rayee") : anciennes ? "revenue" : "reste",
          },
          error: null,
        }
      : await sb.rpc("rature_repondre", {
          p_question_id: tiree.questionId,
          p_choice: choix,
        });
    setEnvoi(false);
    if (error) return setErreur(true);
    const r = data as {
      is_correct: boolean;
      correct_index: number;
      explanation: string | null;
      selected_index: number;
      statut: string;
    };
    vues.current = [...vues.current, tiree.questionId];
    setResultat({
      juste: r.is_correct,
      bonne: r.correct_index,
      explication: r.explanation,
      choisi: r.selected_index,
      statut: r.statut,
    });
    setReste((n) => (n === null ? n : Math.max(0, n - 1)));
    setBilan((b) => (r.is_correct ? { ...b, rayees: b.rayees + 1 } : { ...b, restees: b.restees + 1 }));
    onStatut(r.statut, tiree.sources);
  }, [anciennes, choix, demo, envoi, onStatut, resultat, sb, tiree]);

  // Clavier : A/B/C ou 1/2/3 pour choisir, Entrée pour valider puis passer à la suivante
  const actions = useRef({ valider, tirer });
  useEffect(() => {
    actions.current = { valider, tirer };
  }, [valider, tirer]);
  useEffect(() => {
    if (!tiree) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const ix = k.length === 1 ? Math.max("12345".indexOf(k), "abcde".indexOf(k)) : -1;
      if (!resultat && ix >= 0 && ix < tiree.choices.length) setChoix(ix);
      else if (e.key === "Enter") {
        e.preventDefault();
        if (resultat) void actions.current.tirer();
        else void actions.current.valider();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resultat, tiree]);

  const nomFiltre = theme ? theme.libelle : source ? (NOMS.get(source) ?? source) : null;

  return (
    <div ref={haut} className="grid scroll-mt-28 gap-4 px-2 py-1" aria-live="polite">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="kicker m-0">{anciennes ? CARNET.rejouerFiltre(nomFiltre) : CARNET.propreFiltre(nomFiltre)}</p>
        <p className="t-micro m-0 font-mono">
          {anciennes ? CARNET.rejouerBilan(bilan.rayees, bilan.restees) : CARNET.propreBilan(bilan.rayees, bilan.restees)}
          {reste !== null && !fini ? ` · ${anciennes ? CARNET.rejouerRestantes(reste) : CARNET.propreRestantes(reste)}` : ""}
        </p>
      </div>

      {erreur && (
        <p role="alert" className="t-small m-0 text-pen">
          {CARNET.erreur}
        </p>
      )}

      {indisponible ? (
        <div className="grid gap-3 py-4">
          <p className="t-small m-0">{CARNET.propreThemeIndisponible}</p>
          <button type="button" className="btn btn-secondary w-fit" onClick={onFermer}>
            {CARNET.propreThemeRetour}
          </button>
        </div>
      ) : fini ? (
        <div className="grid gap-3 py-4">
          <p className="t-h3 m-0">{fini === "vide" ? (anciennes ? CARNET.rejouerFini : CARNET.propreFini) : CARNET.propreFiniVue}</p>
          <div className="flex flex-wrap gap-2">
            {fini === "tour" && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  vues.current = [];
                  void tirer();
                }}
              >
                {CARNET.propreEncore} <ArrowRight size={15} aria-hidden />
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onFermer}>
              {theme ? CARNET.propreThemeRetour : CARNET.propreRetour}
            </button>
          </div>
        </div>
      ) : !tiree ? (
        <div className="grid gap-2.5 py-2" aria-busy>
          <span className="block h-5 w-4/5 rounded-[8px] bg-surface-2" />
          <span className="block h-5 w-3/5 rounded-[8px] bg-surface-2" />
          <span className="mt-2 block h-11 rounded-[14px] border border-dashed border-line-2" />
          <span className="block h-11 rounded-[14px] border border-dashed border-line-2" />
        </div>
      ) : (
        <div key={tiree.questionId} className="rl-in grid gap-4">
          <p className="t-micro m-0">
            {tiree.rubrique} · {tiree.sources.map((s) => NOMS.get(s) ?? s).join(", ")}
          </p>
          {/* juste : l'énoncé se raye d'un trait de pinceau (un tableau, lui, reste tel quel) */}
          {tiree.prompt.includes("\t") ? (
            <QuestionPrompt text={tiree.prompt} className="text-[16px] font-semibold leading-[1.6] tracking-[-0.006em] break-words [overflow-wrap:anywhere] md:text-[17px]" />
          ) : (
            <Rature
              rayee={!!resultat?.juste}
              son={resultat?.juste ? "micro" : false}
              className="block whitespace-pre-line text-[16px] font-semibold leading-[1.6] tracking-[-0.006em] break-words [overflow-wrap:anywhere] md:text-[17px]"
            >
              {tiree.prompt}
            </Rature>
          )}

          {resultat ? (
            <ul className="m-0 grid list-none gap-2 p-0" aria-label="Correction">
              {tiree.choices.map((c, ci) => {
                const bonne = ci === resultat.bonne;
                const moi = ci === resultat.choisi && !bonne;
                return (
                  <li
                    key={ci}
                    className={
                      "flex items-start gap-3 rounded-[14px] border px-4 py-3 text-[15px] leading-[1.5] " +
                      (bonne ? "border-white bg-surface font-semibold" : moi ? "border-pen/60 bg-pen/[0.04] text-pen" : "border-line text-muted")
                    }
                  >
                    <span
                      aria-hidden
                      className={
                        "grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[8px] font-mono text-[12.5px] font-semibold " +
                        (bonne ? "bg-white text-black" : moi ? "bg-pen text-black" : "bg-surface-2")
                      }
                    >
                      {bonne ? <Check size={14} strokeWidth={2.6} /> : moi ? <X size={14} strokeWidth={2.6} /> : LETTRES[ci]}
                    </span>
                    <span className="min-w-0 flex-1 pt-[1px] break-words [overflow-wrap:anywhere]">
                      <span className="sr-only">{LETTRES[ci]}. </span>
                      {c}
                      {(bonne || moi) && <span className="sr-only"> ({bonne ? CARNET.bonneReponse : CARNET.taReponse})</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Réponses">
              {tiree.choices.map((c, i) => {
                const on = choix === i;
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setChoix(i)}
                    className={"btn w-full justify-start gap-3.5 rounded-[14px] px-4 py-3.5 text-left text-[15px] " + (on ? "btn-primary" : "btn-secondary")}
                  >
                    <span className={"grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] font-mono text-[13px] " + (on ? "bg-black/20" : "bg-surface-2 text-white")}>{LETTRES[i]}</span>
                    <span className="min-w-0 flex-1 break-words">{c}</span>
                  </button>
                );
              })}
            </div>
          )}

          {resultat && (
            <p className={"m-0 text-[15px] font-bold " + (resultat.juste ? "" : "text-pen")} role="status">
              {{ rayee: CARNET.propreRayee, reste: CARNET.propreReste, ancienne: CARNET.rejouerAcquise, revenue: CARNET.rejouerRevenue }[resultat.statut] ??
                (resultat.juste ? CARNET.propreRayee : CARNET.propreReste)}
            </p>
          )}
          {resultat?.explication && <Explanation text={resultat.explication} />}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" className="py-1 text-[14px] font-semibold text-muted transition-colors hover:text-white" onClick={onFermer}>
              {CARNET.propreArreter}
            </button>
            {resultat ? (
              <button type="button" className="btn btn-primary" onClick={() => void tirer()} disabled={envoi} autoFocus>
                {CARNET.propreSuivante} <ArrowRight size={16} aria-hidden />
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => void valider()} disabled={choix === null || envoi}>
                {CARNET.propreValider} <ArrowRight size={16} aria-hidden />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
