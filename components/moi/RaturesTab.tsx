"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, PenLine, RotateCcw, X } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { CardLabel } from "@/components/ui/Titles";
import { Icone } from "@/components/adn/icons";
import { CompteurBarre, Rature } from "@/components/adn/Rature";
import { QuestionPrompt } from "@/components/QuestionPrompt";
import { Explanation } from "@/components/session/parts";
import { MarqueQuestion } from "@/components/MarqueQuestion";
import { fmtAgo } from "@/components/classement/format";
import { lireRatures, PAGE_RATURES, type RatureItem, type RaturesPage } from "@/components/moi/ratures-data";
import { MiseAuPropre, type DemoPropre } from "@/components/moi/MiseAuPropre";
import { CARNET, SOURCES_RATURE } from "@/lib/voice-z1";
import { nombre } from "@/lib/voice";
import type { SourceMarque } from "@/lib/marques";

// Moi › Erreurs : le carnet de ratures. Tout ce qui a été manqué, d'où que
// ça vienne (fiches, QCM, sessions, les 30 et les 5 du jour, séries éclair,
// duels, sessions ciblées, examens), reste ici jusqu'à ce que le joueur le
// retire ; une nouvelle erreur ramène la rature. À gauche le compte et les
// sources (filtres) ; à droite la liste, chaque rature s'ouvre sur la
// question, sa réponse, la bonne et l'explication. Pages de 20. « Mettre au
// propre » les fait repasser au hasard (MiseAuPropre) : juste, rayée.

const LETTRES = ["A", "B", "C", "D", "E", "F"];
const NOMS = new Map(SOURCES_RATURE);
const nomSource = (s: string) => NOMS.get(s) ?? s;
const SEMAINE_MS = 7 * 86_400_000;
// la source d'une rature, pour le bouton Marquer
const MARQUE: Record<string, SourceMarque> = {
  fiche: "fiche",
  qcm: "qcm",
  session: "session",
  defi: "defi",
  cinq: "defi",
  eclair: "eclair",
  duel: "duel",
  ciblee: "session",
  blanc: "examen",
  examen: "examen",
};

function clip(text: string, n = 170) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

type Vue = { source: string | null; retirees: boolean };
type Compte = { total: number; retirees: number; semaine: number; sources: Record<string, number> };
/** La liste affichée et la vue à laquelle elle appartient (les actions suivent la liste, pas le filtre en cours de chargement). */
type Liste = { vue: Vue; filtre: number; items: RatureItem[] };

export function RaturesTab({ initial, now, demoPropre }: { initial: RaturesPage; now?: number; /** aperçus locaux : la mise au propre sans réseau */ demoPropre?: DemoPropre }) {
  const [vue, setVue] = useState<Vue>({ source: null, retirees: false });
  const [liste, setListe] = useState<Liste>({ vue: { source: null, retirees: false }, filtre: initial.filtre, items: initial.items });
  const [compte, setCompte] = useState<Compte>({ total: initial.total, retirees: initial.retirees, semaine: initial.retireesSemaine, sources: initial.sources });
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [ouverte, setOuverte] = useState<string | null>(null);
  // sorties de la liste pendant cette visite (retirées, ou remises dans « Retirées ») : la carte reste, grisée, avec « Annuler »
  const [bascules, setBascules] = useState<Record<string, boolean>>({});
  // la mise au propre en cours (à la place de la liste)
  const [propre, setPropre] = useState(false);
  const jeton = useRef(0);

  const sb = useMemo(() => createClient(), []);
  // cartes déjà sorties de la vue côté serveur : la page suivante se lit d'autant plus tôt
  const sorties = liste.items.filter((it) => bascules[it.questionId]).length;

  async function charger(v: Vue, offset: number) {
    const moi = ++jeton.current;
    setCharge(true);
    setErreur(false);
    const r = await lireRatures(sb, { source: v.source, retirees: v.retirees, offset }).catch(() => ({ error: true as const }));
    if (moi !== jeton.current) return; // une réponse dépassée par une autre demande
    setCharge(false);
    if ("error" in r) return setErreur(true);
    const p = r.page;
    setCompte({ total: p.total, retirees: p.retirees, semaine: p.retireesSemaine, sources: p.sources });
    if (offset === 0) {
      setListe({ vue: v, filtre: p.filtre, items: p.items });
      setBascules({});
    } else {
      setListe((l) => ({ vue: v, filtre: p.filtre + sorties, items: [...l.items, ...p.items.filter((it) => !l.items.some((x) => x.questionId === it.questionId))] }));
    }
  }

  function choisir(v: Vue) {
    if (v.source === vue.source && v.retirees === vue.retirees && !propre) return;
    setPropre(false);
    setVue(v);
    setOuverte(null);
    void charger(v, 0);
  }

  async function basculer(it: RatureItem) {
    const v = liste.vue;
    const deja = bascules[it.questionId] === true;
    // carnet : basculer = retirer (puis annuler) ; « Retirées » : basculer = remettre (puis annuler)
    const retirer = v.retirees ? deja : !deja;
    // « cette semaine » : une rature retirée maintenant compte ; une remise ne décompte que si elle avait été retirée il y a moins de 7 jours
    const recente = deja || (it.removedAt !== null && Date.now() - new Date(it.removedAt).getTime() < SEMAINE_MS);
    const delta = (signe: 1 | -1) => (c: Compte): Compte => {
      const s = signe * (retirer ? -1 : 1);
      const sources = { ...c.sources };
      for (const k of it.sources.length ? it.sources : [it.lastSource]) sources[k] = Math.max(0, (sources[k] ?? 0) + s);
      return {
        total: c.total + s,
        retirees: c.retirees - s,
        semaine: Math.max(0, c.semaine + (retirer ? signe : recente ? -signe : 0)),
        sources,
      };
    };
    setBascules((b) => ({ ...b, [it.questionId]: !deja }));
    setCompte(delta(1));
    const { error } = await sb.rpc("retirer_rature", { p_question_id: it.questionId, p_retirer: retirer });
    if (error) {
      setBascules((b) => ({ ...b, [it.questionId]: deja }));
      setCompte(delta(-1));
    }
  }

  // une rature rayée pendant la mise au propre : les compteurs suivent
  function rayee(srcs: string[]) {
    setCompte((c) => {
      const sources = { ...c.sources };
      for (const k of srcs) sources[k] = Math.max(0, (sources[k] ?? 0) - 1);
      return { total: Math.max(0, c.total - 1), retirees: c.retirees + 1, semaine: c.semaine + 1, sources };
    });
  }

  const sources = SOURCES_RATURE.filter(([k]) => (compte.sources[k] ?? 0) > 0);
  // ratures à repasser dans le tri en cours
  const aRepasser = liste.vue.retirees ? 0 : liste.vue.source ? (compte.sources[liste.vue.source] ?? 0) : compte.total;
  // ratures de la vue encore à charger
  const reste = liste.filtre - liste.items.length;
  const vide = compte.total === 0 && compte.retirees === 0 && !liste.vue.retirees;

  if (vide && liste.items.length === 0) {
    return (
      <div className="card-quiet flex flex-wrap items-center gap-5 p-6 md:p-7">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-surface">
          <Icone nom="erreurs" size={22} />
        </span>
        <div className="min-w-0 flex-[1_1_240px]">
          <p className="text-[15px] font-semibold">{CARNET.vide}</p>
          <p className="t-small mt-0.5">{CARNET.videTexte}</p>
        </div>
      </div>
    );
  }

  return (
    <section className="card grid min-w-0 overflow-hidden lg:grid-cols-12" aria-label="Mes ratures">
      {/* le compte, la règle, les sources */}
      <div className="flex min-w-0 flex-col gap-4 p-6 md:p-7 lg:col-span-4 lg:border-r lg:border-line">
        <CardLabel icon={<Icone nom="erreurs" size={15} className="text-pen" />}>{CARNET.titre}</CardLabel>
        <div>
          <span className="sr-only">
            {nombre(compte.total)} {CARNET.aRevoir}
          </span>
          <div aria-hidden>
            {compte.semaine > 0 ? (
              <CompteurBarre avant={compte.total + compte.semaine} apres={compte.total} libelle={CARNET.aRevoir} taille={56} />
            ) : (
              <p className="m-0 flex items-baseline gap-2">
                <span className="t-num text-[56px]">{nombre(compte.total)}</span>
                <span className="t-small font-semibold">{CARNET.aRevoir}</span>
              </p>
            )}
          </div>
        </div>
        {(compte.semaine > 0 || compte.retirees > 0) && (
          <p className="t-small m-0 font-medium">
            {[compte.semaine > 0 ? CARNET.retireesSemaine(compte.semaine) : null, compte.retirees > 0 ? CARNET.retireesTotal(compte.retirees) : null].filter(Boolean).join(" · ")}
          </p>
        )}
        {aRepasser > 0 && (
          <div className="grid gap-1.5">
            <button type="button" className="btn btn-primary w-fit" onClick={() => setPropre(true)} disabled={propre} aria-pressed={propre}>
              <PenLine size={16} aria-hidden /> {CARNET.propre} · {nombre(aRepasser)}
            </button>
            <p className="t-micro m-0">{CARNET.propreSous}</p>
          </div>
        )}
        <p className="t-micro m-0">{CARNET.regle}</p>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les ratures">
          <button type="button" className={"chip " + (!vue.retirees && vue.source === null ? "chip-active" : "")} aria-pressed={!vue.retirees && vue.source === null} onClick={() => choisir({ source: null, retirees: false })}>
            {CARNET.toutes} · {nombre(compte.total)}
          </button>
          {sources.map(([k, nom]) => (
            <button key={k} type="button" className={"chip " + (!vue.retirees && vue.source === k ? "chip-active" : "")} aria-pressed={!vue.retirees && vue.source === k} onClick={() => choisir({ source: k, retirees: false })}>
              {nom} · {nombre(compte.sources[k] ?? 0)}
            </button>
          ))}
          {(compte.retirees > 0 || vue.retirees) && (
            <button type="button" className={"chip " + (vue.retirees ? "chip-active" : "")} aria-pressed={vue.retirees} onClick={() => choisir({ source: null, retirees: true })}>
              {CARNET.retirees} · {nombre(compte.retirees)}
            </button>
          )}
        </div>
      </div>

      {/* la liste, ou la mise au propre */}
      <div className="flex min-w-0 flex-col gap-2 border-t border-line p-4 md:p-6 lg:col-span-8 lg:border-t-0" aria-busy={charge}>
        {propre && (
          <MiseAuPropre
            source={liste.vue.source}
            onRayee={rayee}
            demo={demoPropre}
            onFermer={() => {
              setPropre(false);
              void charger(liste.vue, 0);
            }}
          />
        )}
        {!propre && erreur && (
          <p role="alert" className="t-small m-0 px-2 text-pen">
            {CARNET.erreur}
          </p>
        )}
        {propre ? null : liste.items.length === 0 && !charge ? (
          <p className="t-small m-0 px-2 py-6">{liste.vue.retirees ? CARNET.videRetirees : CARNET.videFiltre}</p>
        ) : (
          <ul className={"m-0 flex list-none flex-col divide-y divide-line p-0 transition-opacity " + (charge ? "pointer-events-none opacity-60" : "")}>
            {liste.items.map((it, i) => (
              <LigneRature
                key={it.questionId}
                it={it}
                i={i}
                now={now}
                ouverte={ouverte === it.questionId}
                onOuvrir={() => setOuverte((o) => (o === it.questionId ? null : it.questionId))}
                basculee={bascules[it.questionId] === true}
                vueRetirees={liste.vue.retirees}
                onBasculer={() => void basculer(it)}
              />
            ))}
          </ul>
        )}
        {!propre && reste > 0 && (
          <button type="button" className="btn btn-secondary mt-2 self-center" disabled={charge} onClick={() => void charger(liste.vue, liste.items.length - sorties)}>
            {charge ? CARNET.chargement : CARNET.plus(Math.min(PAGE_RATURES, reste))}
          </button>
        )}
      </div>
    </section>
  );
}

function LigneRature({
  it,
  i,
  now,
  ouverte,
  onOuvrir,
  basculee,
  vueRetirees,
  onBasculer,
}: {
  it: RatureItem;
  i: number;
  now?: number;
  ouverte: boolean;
  onOuvrir: () => void;
  basculee: boolean;
  vueRetirees: boolean;
  onBasculer: () => void;
}) {
  // rayée : dans le carnet, retirée à l'instant ; dans « Retirées », pas encore remise
  const rayee = vueRetirees ? !basculee : basculee;
  const id = `rature-${it.questionId}`;
  const sources = it.sources.length ? it.sources : [it.lastSource];
  const blanc = it.lastSelected === null;
  return (
    <li className={"py-1 transition-opacity " + (basculee ? "opacity-60" : "")}>
      <button type="button" className="rl-row flex w-full items-start gap-3 rounded-[12px] px-2 py-3 text-left" aria-expanded={ouverte} aria-controls={id} onClick={onOuvrir}>
        <span className="min-w-0 flex-1">
          {/* ouverte : l'énoncé complet suit, on ne le répète pas */}
          {!ouverte && (
            <Rature rayee={rayee} trait={i % 2 ? "b" : "a"} son={false} className="mb-1 block text-[14px] leading-snug">
              {clip(it.prompt)}
            </Rature>
          )}
          <span className="t-micro block">
            {it.rubrique} · {sources.map(nomSource).join(", ")} · {blanc ? CARNET.sansReponse : CARNET.ratee(it.misses)} · {fmtAgo(it.lastMissedAt, now)}
            {it.correctSince > 0 && <span className="font-semibold text-white"> · {CARNET.reussieDepuis(it.correctSince)}</span>}
          </span>
        </span>
        <ChevronDown size={16} aria-hidden className={"mt-0.5 shrink-0 text-muted transition-transform " + (ouverte ? "rotate-180" : "")} />
      </button>

      {ouverte && (
        <div id={id} className="rl-in grid gap-4 px-2 pb-4 pt-1">
          <QuestionPrompt text={it.prompt} className="text-[15.5px] font-semibold leading-[1.6] tracking-[-0.006em] break-words [overflow-wrap:anywhere] md:text-[16px]" />
          <ul className="m-0 grid list-none gap-2 p-0">
            {it.choices.map((c, ci) => {
              const bonne = it.correctIndex === ci;
              const moi = it.lastSelected === ci && !bonne;
              return (
                <li
                  key={ci}
                  className={
                    "flex items-start gap-3 rounded-[12px] border px-3 py-2.5 text-[14.5px] leading-[1.5] " +
                    (bonne ? "border-white bg-surface font-semibold" : moi ? "border-pen/60 bg-pen/[0.04] text-pen" : "border-line text-muted")
                  }
                >
                  <span
                    aria-hidden
                    className={
                      "grid h-6 w-6 shrink-0 place-items-center rounded-[7px] font-mono text-[12px] font-semibold " +
                      (bonne ? "bg-white text-black" : moi ? "bg-pen text-black" : "bg-surface-2")
                    }
                  >
                    {bonne ? <Check size={13} strokeWidth={2.6} /> : moi ? <X size={13} strokeWidth={2.6} /> : LETTRES[ci]}
                  </span>
                  <span className="min-w-0 flex-1 pt-[1px] break-words [overflow-wrap:anywhere]">
                    <span className="sr-only">{LETTRES[ci]}. </span>
                    {c}
                    {(bonne || moi) && <span className="sr-only"> ({bonne ? CARNET.bonneReponse : CARNET.taReponse})</span>}
                  </span>
                  {(bonne || moi) && (
                    <span aria-hidden className="t-micro hidden shrink-0 pt-[3px] font-semibold sm:inline">
                      {bonne ? CARNET.bonneReponse : CARNET.taReponse}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {blanc && <p className="t-small m-0 text-pen">{CARNET.blancTexte}</p>}
          {it.explanation && <Explanation text={it.explanation} />}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onBasculer}>
              {basculee ? (
                <>
                  <RotateCcw size={14} aria-hidden /> {CARNET.annuler}
                </>
              ) : vueRetirees ? (
                <>
                  <RotateCcw size={14} aria-hidden /> {CARNET.remettre}
                </>
              ) : (
                <>
                  <Check size={14} aria-hidden /> {CARNET.retirer}
                </>
              )}
            </button>
            {basculee && (
              <span className="t-micro" role="status">
                {vueRetirees ? CARNET.remise : CARNET.retiree}
              </span>
            )}
            <MarqueQuestion questionId={it.questionId} source={MARQUE[it.lastSource] ?? "session"} variante="lien" />
            {it.href && (
              <Link href={it.href} className="ink-link ml-auto inline-flex items-center gap-1 text-[13px] font-semibold">
                {CARNET.revoirFiche(it.page)} <ArrowRight size={13} aria-hidden />
              </Link>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
