"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, Hammer, PenLine } from "lucide-react";
import { CardLabel } from "@/components/ui/Titles";
import { INK } from "@/components/ui/InkDefs";
import { Icone } from "@/components/adn/icons";
import { MiseAuPropre, type DemoPropre } from "@/components/moi/MiseAuPropre";
import { JAUGE_MAX, MIN_RATURES, MIN_REPONSES, semainesDepuis, type PointFaible, type PointsFaiblesData } from "@/lib/points-faibles";
import { POINTS_FAIBLES as V, conceptCoince, detailsPointFaible } from "@/lib/voice-points-faibles";
import { ATELIER } from "@/lib/voice-atelier";

// « Tes points faibles » : en tête de Moi › Stats (la carte) et dans la
// carte héros de S'entraîner. Épuré : trois lignes au plus, chacune une
// notion (un Learning Module ; en repli, un thème), une phrase et une jauge
// (un trait de la longueur du score, jamais le chiffre) ; au toucher, la
// ligne s'ouvre sur ce qui coince (les concepts les plus chargés), ce que la
// phrase ne dit pas, les liens (page de fiche, chapitre audio, QCM, type de
// calcul), « Mettre au propre » limité à la notion et, dès que l'Atelier est
// ouvert, « Atelier sur cette seule notion » ; la carte mène à l'Atelier
// (30 minutes sur les trois premiers). Les données arrivent
// toutes prêtes (components/moi/points-faibles-data.ts,
// côté serveur) ; seul « Dernier passage il y a N semaines » se calcule ici,
// après le montage.

/** La matière la plus fragile, quand il n'y a pas assez de données (comme aujourd'hui). */
export type RepliMatiere = { nom: string; href: string } | null;

const LIGNES = 3;

/** Une petite commande agrandie au toucher (44 px de haut) sans changer son dessin. */
const TOUCHER = "relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']";

/** L'instant, une fois dans le navigateur (rien côté serveur : pas d'écart à l'hydratation). */
function useMaintenant() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  return now;
}

/**
 * « Mettre au propre » d'une notion, ouvert à la place de la liste ; la page se
 * relit à la sortie dès qu'une réponse a été validée : juste, la rature se
 * raye ; fausse, elle redevient vive (score et ordre changent aussi).
 */
function usePropre() {
  const [theme, setTheme] = useState<PointFaible | null>(null);
  const bouge = useRef(false);
  const router = useRouter();
  return {
    theme,
    ouvrir: setTheme,
    onStatut: () => {
      bouge.current = true;
    },
    fermer: () => {
      setTheme(null);
      if (bouge.current) {
        bouge.current = false;
        router.refresh();
      }
    },
  };
}

/** La jauge : un trait de pinceau de la longueur du score, sur le tracé complet en filigrane (comme la maîtrise des matières). */
function Jauge({ p, className = "" }: { p: PointFaible; className?: string }) {
  const pct = Math.max(4, Math.min(100, p.score));
  return (
    <span role="img" aria-label={V.jauge(p.niveau, JAUGE_MAX)} className={"relative block h-[8px] shrink-0 text-white " + className}>
      <svg viewBox="0 0 400 64" preserveAspectRatio="none" aria-hidden className="absolute inset-0 h-full w-full opacity-25">
        <use href={INK.swash} fill="currentColor" />
      </svg>
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }}>
        <svg viewBox="0 0 400 64" preserveAspectRatio="none" aria-hidden className="absolute inset-y-0 left-0 h-full max-w-none" style={{ width: `${10000 / pct}%` }}>
          <use href={INK.swash} fill="currentColor" />
        </svg>
      </span>
    </span>
  );
}

const repereDe = (p: PointFaible) => [p.matiereNom, p.repere].filter(Boolean).join(" · ");
const peutPropre = (p: PointFaible, propre: boolean) => propre && p.mesures.aRepasser > 0 && (p.lm !== null || p.sets.length > 0);
const repriseDe = (p: PointFaible) => ({ notion: p.lm, sets: p.sets, libelle: p.libelle });
const ATELIER_HREF = "/atelier";

/** « Atelier · 30 min », ou « Reprendre l'Atelier » quand un Atelier est en cours. */
function LienAtelier({ d, className }: { d: PointsFaiblesData; className: string }) {
  if (!d.atelier) return null;
  return (
    <Link href={ATELIER_HREF} className={className} data-leonard="atelier">
      <Hammer size={16} aria-hidden /> {d.atelier.enCours ? ATELIER.reprendre : ATELIER.action}
    </Link>
  );
}

function LignePointFaible({
  p,
  rang,
  ouverte,
  onOuvrir,
  propre,
  onPropre,
  atelier,
  now,
}: {
  p: PointFaible;
  rang: number;
  ouverte: boolean;
  onOuvrir: () => void;
  propre: boolean;
  onPropre: () => void;
  /** l'Atelier est ouvert : « Atelier sur cette seule notion » */
  atelier: boolean;
  now: number | null;
}) {
  const id = useId();
  const m = p.mesures;
  const semaines = now === null ? null : semainesDepuis(m.derniere, now);
  const details = detailsPointFaible({ ...m, recentSuffisant: m.n >= MIN_REPONSES, sources: p.sources });
  if (semaines !== null) details.push(V.dernierPassage(semaines));
  return (
    <li className="py-0.5">
      {/* rang, nom (jauge et repère dessous), phrase : en dessous sur téléphone, à droite sur ordinateur */}
      <button
        type="button"
        className="rl-row grid w-full grid-cols-[16px_minmax(0,1fr)_16px] items-start gap-x-3 gap-y-1.5 rounded-[12px] px-2 py-3 text-left md:grid-cols-[16px_minmax(0,1fr)_minmax(0,1.1fr)_16px] md:items-center md:gap-x-5"
        aria-expanded={ouverte}
        aria-controls={id}
        onClick={onOuvrir}
      >
        <span aria-hidden className="pt-[2px] font-mono text-[13px] font-semibold text-muted tabular-nums md:pt-0">
          {rang}
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold leading-snug [overflow-wrap:anywhere]">{p.libelle}</span>
          <span className="t-micro mt-1 flex items-center gap-2.5">
            <Jauge p={p} className="w-12 md:h-[10px] md:w-44" />
            <span className="min-w-0">{repereDe(p)}</span>
          </span>
        </span>
        <span className="t-small col-start-2 row-start-2 md:col-start-3 md:row-start-1">{p.phrase}</span>
        <ChevronDown size={16} aria-hidden className={"col-start-3 row-start-1 mt-0.5 text-muted transition-transform md:col-start-4 md:mt-0 " + (ouverte ? "rotate-180" : "")} />
      </button>

      {ouverte && (
        <div id={id} className="rl-in grid gap-3 pb-4 pl-9 pr-2 pt-0.5 md:pl-11">
          {p.concepts.length > 0 && (
            <div className="grid gap-1">
              <p className="t-eyebrow m-0">{V.coince}</p>
              <ul className="t-small m-0 grid list-none gap-1 p-0">
                {p.concepts.map((c) => (
                  <li key={c.concept}>{conceptCoince(c)}</li>
                ))}
              </ul>
            </div>
          )}
          {details.length > 0 && (
            <ul className="t-small m-0 grid list-none gap-1 p-0">
              {details.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            {peutPropre(p, propre) && (
              <button type="button" className="btn btn-primary btn-sm max-md:min-h-[44px]" onClick={onPropre}>
                <PenLine size={14} aria-hidden /> {V.propre(m.aRepasser)}
              </button>
            )}
            {atelier && p.lm && (
              <Link href={`${ATELIER_HREF}?notion=${encodeURIComponent(p.lm)}`} className={"ink-link inline-flex items-center gap-1 text-[13px] font-semibold " + TOUCHER}>
                {ATELIER.actionSeule} <ArrowRight size={13} aria-hidden />
              </Link>
            )}
            {p.liens.map((l) => (
              <Link key={l.href} href={l.href} className={"ink-link inline-flex items-center gap-1 text-[13px] font-semibold " + TOUCHER}>
                {l.libelle} <ArrowRight size={13} aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}

function Liste({ liste, propre, onPropre, atelier }: { liste: PointFaible[]; propre: boolean; onPropre: (p: PointFaible) => void; atelier: boolean }) {
  const [ouverte, setOuverte] = useState<string | null>(null);
  const now = useMaintenant();
  return (
    <ol className="m-0 flex list-none flex-col divide-y divide-line p-0">
      {liste.map((p, i) => (
        <LignePointFaible
          key={p.cle}
          p={p}
          rang={i + 1}
          ouverte={ouverte === p.cle}
          onOuvrir={() => setOuverte((o) => (o === p.cle ? null : p.cle))}
          propre={propre}
          onPropre={() => onPropre(p)}
          atelier={atelier}
          now={now}
        />
      ))}
    </ol>
  );
}

/** Moi › Stats, en tête : la carte « Tes points faibles ». */
export function PointsFaiblesCarte({ d, repli, demo }: { d: PointsFaiblesData; repli: RepliMatiere; /** aperçus locaux : la mise au propre sans réseau */ demo?: DemoPropre }) {
  const [tous, setTous] = useState(false);
  const propre = usePropre();
  const liste = tous ? d.liste : d.liste.slice(0, LIGNES);
  const voirTous = !propre.theme && d.etat === "faibles" && d.liste.length > LIGNES;

  return (
    <section id="points-faibles" className="card flex min-w-0 scroll-mt-28 flex-col gap-3 p-6 md:p-7" aria-label={V.titre}>
      <CardLabel
        icon={<Icone nom="erreurs" size={15} className="text-pen" />}
        right={
          voirTous ? (
            <button type="button" className={"text-[13px] font-semibold text-muted transition-colors hover:text-white " + TOUCHER} aria-expanded={tous} onClick={() => setTous((t) => !t)}>
              {tous ? V.voirMoins : V.voirTous(d.liste.length)}
            </button>
          ) : undefined
        }
      >
        {V.titre}
      </CardLabel>

      {propre.theme ? (
        <MiseAuPropre
          source={null}
          theme={repriseDe(propre.theme)}
          onStatut={propre.onStatut}
          onFermer={propre.fermer}
          demo={demo}
        />
      ) : d.etat === "faibles" ? (
        <>
          <Liste liste={liste} propre={d.propre} onPropre={propre.ouvrir} atelier={!!d.atelier} />
          {d.atelier && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-2 pt-1">
              <LienAtelier d={d} className="btn btn-primary btn-sm rl-press max-md:min-h-[44px]" />
              {d.atelier.enCours && <span className="t-micro">{ATELIER.enCoursLigne(d.atelier.enCours.faites)}</span>}
            </div>
          )}
          {d.rayeesSemaine > 0 && <p className="t-small m-0 px-2">{V.rattrape(d.rayeesSemaine)}</p>}
        </>
      ) : (
        <div className="grid gap-1.5 px-2 py-1">
          <p className="m-0 text-[15px] font-semibold">{d.etat === "rien" ? V.rien : V.peu}</p>
          <p className="t-small m-0">{d.etat === "peu" ? V.peuTexte(d.unite, MIN_REPONSES, MIN_RATURES) : d.propre ? V.rienTexte(d.unite) : V.rienTexteSansRatures(d.unite)}</p>
          {d.rayeesSemaine > 0 && <p className="t-small m-0">{V.rattrape(d.rayeesSemaine)}</p>}
          {d.etat === "peu" && repli && (
            <p className="t-small m-0 mt-1">
              {V.repli(repli.nom)}{" "}
              <Link href={repli.href} className={"ink-link " + TOUCHER}>
                {V.repliAction}
              </Link>
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/** Les trois points faibles en bref (rang, nom, jauge) : toucher une ligne la met en avant dans le héros. */
function Choix({ liste, choisi, onChoisir }: { liste: PointFaible[]; choisi: number; onChoisir: (i: number) => void }) {
  return (
    <ol className="m-0 flex list-none flex-col divide-y divide-line p-0">
      {liste.map((p, i) => (
        <li key={p.cle}>
          <button
            type="button"
            aria-pressed={i === choisi}
            onClick={() => onChoisir(i)}
            className={
              "rl-row grid min-h-[44px] w-full grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-[12px] px-2 py-2.5 text-left transition-colors " +
              (i === choisi ? "bg-surface-2 text-white" : "text-muted hover:text-white")
            }
          >
            {/* le choisi : fond de ligne et rang à l'encre rouge */}
            <span aria-hidden className={"font-mono text-[13px] font-semibold tabular-nums " + (i === choisi ? "text-pen" : "")}>
              {i + 1}
            </span>
            <span className="min-w-0 text-[14px] font-semibold leading-snug [overflow-wrap:anywhere]">{p.libelle}</span>
            <Jauge p={p} className="w-12" />
          </button>
        </li>
      ))}
    </ol>
  );
}

/**
 * S'entraîner, carte héros : un point faible (le n° 1 d'abord) et son action ; « Mes 3 points faibles » pour en mettre un autre en avant. À n'afficher qu'avec au moins un point faible.
 * sansAtelier : l'Atelier a sa propre carte à côté (components/atelier/CarteAtelier.tsx) ; « Mettre au propre » redevient l'action pleine.
 */
export function PointsFaiblesHeros({ d, className = "", sansAtelier = false }: { d: PointsFaiblesData; className?: string; sansAtelier?: boolean }) {
  const propre = usePropre();
  const [choisi, setChoisi] = useState(0);
  // téléphone : la liste repliée sous l'action ; ordinateur : toujours ouverte, à côté
  const [listeOuverte, setListeOuverte] = useState(false);
  const idListe = useId();
  const trois = d.liste.slice(0, LIGNES);
  // la liste peut raccourcir à la relecture (après « Mettre au propre ») : retour au n° 1
  const rang = choisi < trois.length ? choisi : 0;
  const p = trois[rang];
  if (!p) return null;
  const lien = p.liens[0] ?? { href: `/practice?topic=${p.matiere}`, libelle: V.repliAction };
  const reprise = peutPropre(p, d.propre);
  const atelier = sansAtelier ? undefined : d.atelier;
  // l'action reste le seul point focal : un lien au plus à côté (« Mettre au propre » avec l'Atelier,
  // sinon le premier lien de la notion qui n'est pas déjà l'action) ; les autres sont dans le tiroir de Moi › Stats
  const second = atelier ? (reprise ? null : p.liens[0]) : reprise ? p.liens[0] : p.liens[1];
  const avecListe = !propre.theme && trois.length > 1;

  return (
    <section
      data-leonard="points-faibles"
      className={"card-hero rl-in grid min-h-[260px] min-w-0 gap-x-8 gap-y-4 p-6 md:p-8 " + (avecListe ? "md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] " : "") + className}
      aria-label={V.kicker}
    >
      {propre.theme ? (
        <MiseAuPropre
          source={null}
          theme={repriseDe(propre.theme)}
          onStatut={propre.onStatut}
          onFermer={propre.fermer}
        />
      ) : (
        <>
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex min-w-0 flex-col gap-2">
              <p className="t-eyebrow">{rang > 0 ? V.kickerRang(rang + 1) : V.kicker}</p>
              <h2 className="t-h1 m-0 [overflow-wrap:anywhere]">{p.libelle}</h2>
              <p className="t-micro m-0">{repereDe(p)}</p>
            </div>
            <div className="grid gap-1.5">
              <p className="t-body m-0 max-w-[480px] text-muted">{p.phrase}</p>
              {p.concepts[0] && <p className="t-small m-0 max-w-[480px]">{V.coinceUn(p.concepts[0].concept)}</p>}
              {p.mesures.rayees7j > 0 && <p className="t-micro m-0">{V.rattrapeNotion(d.unite, p.mesures.rayees7j)}</p>}
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
              {atelier ? (
                <>
                  <LienAtelier d={d} className="btn btn-primary rl-press w-fit max-md:min-h-[44px]" />
                  {reprise && (
                    <button type="button" className={"ink-link inline-flex items-center gap-1 text-[13px] font-semibold " + TOUCHER} onClick={() => propre.ouvrir(p)}>
                      <PenLine size={13} aria-hidden /> {V.propre(p.mesures.aRepasser)}
                    </button>
                  )}
                </>
              ) : reprise ? (
                <button type="button" className="btn btn-primary rl-press w-fit max-md:min-h-[44px]" onClick={() => propre.ouvrir(p)}>
                  <PenLine size={16} aria-hidden /> {V.propre(p.mesures.aRepasser)}
                </button>
              ) : (
                <Link href={lien.href} className="btn btn-primary rl-press w-fit max-md:min-h-[44px]">
                  {lien.libelle} <ArrowRight size={16} aria-hidden />
                </Link>
              )}
              {second && (
                <Link href={second.href} className={"ink-link inline-flex items-center gap-1 text-[13px] font-semibold " + TOUCHER}>
                  {second.libelle} <ArrowRight size={13} aria-hidden />
                </Link>
              )}
            </div>
          </div>

          {avecListe && (
            <div className="flex min-w-0 flex-col gap-1 md:gap-2">
              <p className="t-eyebrow hidden px-2 md:block">{V.liste(trois.length)}</p>
              <button
                type="button"
                className="t-small inline-flex min-h-[44px] w-fit items-center gap-1.5 font-semibold hover:text-white md:hidden"
                aria-expanded={listeOuverte}
                aria-controls={idListe}
                onClick={() => setListeOuverte((o) => !o)}
              >
                {V.liste(trois.length)}
                <ChevronDown size={14} aria-hidden className={"transition-transform " + (listeOuverte ? "rotate-180" : "")} />
              </button>
              <div id={idListe} className={"-mx-2 md:mx-0 " + (listeOuverte ? "" : "max-md:hidden")}>
                <Choix liste={trois} choisi={rang} onChoisir={setChoisi} />
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
