"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, PenLine } from "lucide-react";
import { CardLabel } from "@/components/ui/Titles";
import { Icone } from "@/components/adn/icons";
import { MiseAuPropre, type DemoPropre } from "@/components/moi/MiseAuPropre";
import { JAUGE_MAX, MIN_RATURES, MIN_REPONSES, semainesDepuis, type PointFaible, type PointsFaiblesData } from "@/lib/points-faibles";
import { POINTS_FAIBLES as V } from "@/lib/voice-points-faibles";

// « Tes points faibles » : en tête de Moi › Stats (la carte) et dans la
// carte héros de S'entraîner. Épuré : trois lignes au plus, chacune une
// phrase et une jauge (jamais le score) ; au toucher, la ligne s'ouvre sur
// les chiffres, les liens (page de fiche, QCM, type de calcul) et « Mettre au
// propre » limité au thème. Les données arrivent toutes prêtes
// (components/moi/points-faibles-data.ts, côté serveur) ; seul « Dernier
// passage il y a N semaines » se calcule ici, après le montage.

/** La matière la plus fragile, quand il n'y a pas assez de données (comme aujourd'hui). */
export type RepliMatiere = { nom: string; href: string } | null;

const LIGNES = 3;

/** L'instant, une fois dans le navigateur (rien côté serveur : pas d'écart à l'hydratation). */
function useMaintenant() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  return now;
}

/** « Mettre au propre » d'un thème, ouvert à la place de la liste ; la page se relit à la sortie si une rature a bougé. */
function usePropre() {
  const [theme, setTheme] = useState<PointFaible | null>(null);
  const bouge = useRef(false);
  const router = useRouter();
  return {
    theme,
    ouvrir: setTheme,
    onStatut: (statut: string) => {
      if (statut === "rayee" || statut === "revenue") bouge.current = true;
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

function Jauge({ niveau, className = "" }: { niveau: number; className?: string }) {
  return (
    <span role="img" aria-label={V.jauge(niveau, JAUGE_MAX)} className={"shrink-0 gap-[3px] " + className}>
      {Array.from({ length: JAUGE_MAX }, (_, i) => (
        <span key={i} className={"block h-[5px] w-[11px] rounded-full " + (i < niveau ? "bg-white" : "bg-line-2")} />
      ))}
    </span>
  );
}

const repereDe = (p: PointFaible) => [p.matiereNom, p.repere].filter(Boolean).join(" · ");
const peutPropre = (p: PointFaible, propre: boolean) => propre && p.mesures.aRepasser > 0 && p.sets.length > 0;

function LignePointFaible({
  p,
  rang,
  ouverte,
  onOuvrir,
  propre,
  onPropre,
  now,
}: {
  p: PointFaible;
  rang: number;
  ouverte: boolean;
  onOuvrir: () => void;
  propre: boolean;
  onPropre: () => void;
  now: number | null;
}) {
  const id = useId();
  const m = p.mesures;
  const semaines = now === null ? null : semainesDepuis(m.derniere, now);
  return (
    <li className="py-0.5">
      {/* téléphone : rang, nom (repère et jauge dessous), phrase en dessous ; ordinateur : une ligne, la phrase au milieu, la jauge à droite */}
      <button
        type="button"
        className="rl-row grid w-full grid-cols-[16px_minmax(0,1fr)_16px] items-start gap-x-3 gap-y-1.5 rounded-[12px] px-2 py-3 text-left md:grid-cols-[16px_minmax(0,1fr)_minmax(0,1.1fr)_auto_16px] md:items-center md:gap-x-5"
        aria-expanded={ouverte}
        aria-controls={id}
        onClick={onOuvrir}
      >
        <span aria-hidden className="pt-[2px] font-mono text-[13px] font-semibold text-muted tabular-nums md:pt-0">
          {rang}
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold leading-snug [overflow-wrap:anywhere]">{p.libelle}</span>
          <span className="t-micro mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {repereDe(p)}
            <Jauge niveau={p.niveau} className="flex md:hidden" />
          </span>
        </span>
        <span className="t-small col-start-2 row-start-2 md:col-start-3 md:row-start-1">{p.phrase}</span>
        <Jauge niveau={p.niveau} className="hidden md:flex" />
        <ChevronDown size={16} aria-hidden className={"col-start-3 row-start-1 mt-0.5 text-muted transition-transform md:col-start-5 md:mt-0 " + (ouverte ? "rotate-180" : "")} />
      </button>

      {ouverte && (
        <div id={id} className="rl-in grid gap-3 pb-4 pl-9 pr-2 pt-0.5 md:pl-11">
          <ul className="t-small m-0 grid list-none gap-1 p-0">
            <li>{V.recente(m.ok, m.n)}</li>
            <li>
              {V.ratures(m.enCours, m.vives, m.anciennes)}
              {m.rayees7j > 0 && ` · ${V.rayeesSemaine(m.rayees7j)}`}
            </li>
            {p.sources.length > 0 && <li>{V.sources(p.sources)}</li>}
            {semaines !== null && <li>{V.dernierPassage(semaines)}</li>}
          </ul>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {peutPropre(p, propre) && (
              <button type="button" className="btn btn-primary btn-sm" onClick={onPropre}>
                <PenLine size={14} aria-hidden /> {V.propre(m.aRepasser)}
              </button>
            )}
            {p.liens.map((l) => (
              <Link key={l.href} href={l.href} className="ink-link inline-flex items-center gap-1 text-[13px] font-semibold">
                {l.libelle} <ArrowRight size={13} aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}

function Liste({ liste, propre, onPropre }: { liste: PointFaible[]; propre: boolean; onPropre: (p: PointFaible) => void }) {
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

  return (
    <section id="points-faibles" className="card flex min-w-0 scroll-mt-28 flex-col gap-3 p-6 md:p-7" aria-label={V.titre}>
      <CardLabel icon={<Icone nom="erreurs" size={15} className="text-pen" />}>{V.titre}</CardLabel>

      {propre.theme ? (
        <MiseAuPropre
          source={null}
          theme={{ sets: propre.theme.sets, libelle: propre.theme.libelle }}
          onStatut={propre.onStatut}
          onFermer={propre.fermer}
          demo={demo}
        />
      ) : d.etat === "faibles" ? (
        <>
          <Liste liste={liste} propre={d.propre} onPropre={propre.ouvrir} />
          {(d.rayeesSemaine > 0 || d.liste.length > LIGNES) && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-2">
              {d.rayeesSemaine > 0 && <p className="t-small m-0">{V.rattrape(d.rayeesSemaine)}</p>}
              {d.liste.length > LIGNES && (
                <button type="button" className="ml-auto text-[13px] font-semibold text-muted transition-colors hover:text-white" aria-expanded={tous} onClick={() => setTous((t) => !t)}>
                  {tous ? V.voirMoins : V.voirTous(d.liste.length)}
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="grid gap-1.5 px-2 py-1">
          <p className="m-0 text-[15px] font-semibold">{d.etat === "rien" ? V.rien : V.peu}</p>
          <p className="t-small m-0">{d.etat === "rien" ? V.rienTexte : V.peuTexte(MIN_REPONSES, MIN_RATURES)}</p>
          {d.rayeesSemaine > 0 && <p className="t-small m-0">{V.rattrape(d.rayeesSemaine)}</p>}
          {d.etat === "peu" && repli && (
            <p className="t-small m-0 mt-1">
              {V.repli(repli.nom)}{" "}
              <Link href={repli.href} className="ink-link">
                {V.repliAction}
              </Link>
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/** S'entraîner, carte héros : le point faible n° 1, son action, et « Mes 3 points faibles » replié. À n'afficher qu'avec au moins un point faible. */
export function PointsFaiblesHeros({ d, className = "" }: { d: PointsFaiblesData; className?: string }) {
  const propre = usePropre();
  const p = d.liste[0];
  if (!p) return null;
  const lien = p.liens[0] ?? { href: `/practice?topic=${p.matiere}`, libelle: V.repliAction };
  const trois = d.liste.slice(0, LIGNES);

  return (
    <section className={"card-hero rl-in flex min-h-[260px] min-w-0 flex-col gap-4 p-6 md:p-8 " + className} aria-label={V.kicker}>
      {propre.theme ? (
        <MiseAuPropre
          source={null}
          theme={{ sets: propre.theme.sets, libelle: propre.theme.libelle }}
          onStatut={propre.onStatut}
          onFermer={propre.fermer}
        />
      ) : (
        <>
          <div className="flex min-w-0 flex-col gap-2">
            <p className="t-eyebrow">{V.kicker}</p>
            <h2 className="t-h1 m-0 [overflow-wrap:anywhere]">{p.libelle}</h2>
            <p className="t-micro m-0">{repereDe(p)}</p>
          </div>
          <div className="grid gap-1.5">
            <p className="t-body m-0 max-w-[480px] text-muted">{p.phrase}</p>
            {d.rayeesSemaine > 0 && <p className="t-micro m-0">{V.rattrape(d.rayeesSemaine)}</p>}
          </div>
          <div className="mt-auto flex flex-col gap-4 pt-1">
            {peutPropre(p, d.propre) ? (
              <button type="button" className="btn btn-primary rl-press w-fit" onClick={() => propre.ouvrir(p)}>
                <PenLine size={16} aria-hidden /> {V.propre(p.mesures.aRepasser)}
              </button>
            ) : (
              <Link href={lien.href} className="btn btn-primary rl-press w-fit">
                {lien.libelle} <ArrowRight size={16} aria-hidden />
              </Link>
            )}
            <details className="group">
              <summary className="t-small inline-flex cursor-pointer list-none items-center gap-1.5 font-semibold hover:text-white [&::-webkit-details-marker]:hidden">
                {V.liste(trois.length)}
                <ChevronDown size={14} aria-hidden className="transition-transform group-open:rotate-180" />
              </summary>
              <div className="-mx-2 mt-2">
                <Liste liste={trois} propre={d.propre} onPropre={propre.ouvrir} />
              </div>
            </details>
          </div>
        </>
      )}
    </section>
  );
}
