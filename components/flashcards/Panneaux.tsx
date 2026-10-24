import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChevronRight, FileText, Layers } from "lucide-react";
import { InkBarCoches } from "@/components/adn/InkBarCoches";
import { nombre } from "@/lib/voice";
import { BOUCLE, MATIERE_CARTES, cartes as nCartes } from "@/lib/voice-z3c";
import type { EtatListe } from "@/lib/flashcards/progression";
import { EtatPaquetListe } from "./EtatPaquetListe";
import s from "./Revision.module.css";

// Les panneaux de la révision des flashcards, sans état (utilisables côté
// serveur comme dans FlashcardReview) : la barre du tour, l'entracte entre
// deux tours, la reprise d'une boucle entamée, la petite pile de fiches,
// l'appel « Réviser toute la matière », les paquets d'une matière et la
// matière sans cartes.

/** Au-delà, une coche par carte devient illisible : la barre segmentée suffit. */
const MAX_COCHES = 36;

/** La barre du tour : le badge, maîtrisées en encre, à revoir au stylo rouge, le reste au crayon. */
export function BarreTour({ tour, maitrisees, aRevoir, total, rang }: { tour: number; maitrisees: number; aRevoir: number; total: number; rang: number }) {
  const pM = total ? (100 * maitrisees) / total : 0;
  const pR = total ? (100 * aRevoir) / total : 0;
  const reste = Math.max(0, total - maitrisees - aRevoir);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
      <span className={`${s.tour} ${tour > 1 ? s.tourN : ""}`}>{BOUCLE.tour(tour)}</span>
      <div
        className={s.barre}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={maitrisees + aRevoir}
        aria-valuetext={BOUCLE.compte(maitrisees, aRevoir, reste)}
        aria-label={BOUCLE.tour(tour)}
      >
        <span className={`${s.seg} ${s.segSu}`} style={{ transform: `scaleX(${pM / 100})` }} />
        <span className={`${s.seg} ${s.segRevoir}`} style={{ transform: `translateX(${pM}%) scaleX(${pR / 100})` }} />
      </div>
      <span className="t-micro shrink-0 font-mono font-semibold tabular-nums text-[var(--ink)]">
        {nombre(rang)}
        <span className="font-medium text-muted"> / {nombre(total)}</span>
      </span>
    </div>
  );
}

/** La légende de la barre : « 4 maîtrisées · 2 à revoir · 9 restantes », avec ses deux encres. */
export function LegendeTour({ maitrisees, aRevoir, total }: { maitrisees: number; aRevoir: number; total: number }) {
  const reste = Math.max(0, total - maitrisees - aRevoir);
  return (
    <p className="t-micro m-0 flex flex-wrap items-center gap-x-2.5 gap-y-1 tabular-nums">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-[3px] w-3 rounded-full bg-[var(--ink)]" />
        {nombre(maitrisees)} {maitrisees > 1 ? "maîtrisées" : "maîtrisée"}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-[3px] w-3 rounded-full bg-[var(--pen)]" />
        {nombre(aRevoir)} à revoir
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-px w-3 bg-[var(--pencil)]" />
        {nombre(reste)} {reste > 1 ? "restantes" : "restante"}
      </span>
    </p>
  );
}

/** Une petite pile de fiches bristol, le chiffre sur celle du dessus. */
export function PileMini({ n, ton = "pen" }: { n: number; ton?: "pen" | "ink" }) {
  return (
    <span className={s.mini} aria-hidden>
      <span />
      <span />
      <span style={ton === "ink" ? { color: "var(--ink)" } : undefined}>
        <span className="t-num text-[26px] sm:text-[32px]">{nombre(n)}</span>
      </span>
    </span>
  );
}

/** Les coches du tour (une par carte, dans l'ordre de passage), ou la barre si elles sont trop nombreuses. */
function CochesTour({ marques, label }: { marques: (boolean | null)[]; label: string }) {
  if (marques.length === 0) return null;
  if (marques.length <= MAX_COCHES) return <InkBarCoches items={marques} height={26} label={label} />;
  const su = marques.filter((x) => x === true).length;
  return (
    <div className="ink-bar min-w-[140px] max-w-[360px] flex-1" aria-label={label} role="img">
      <span style={{ width: `${Math.round((100 * su) / marques.length)}%` }} />
    </div>
  );
}

/** Entre deux tours : combien reviennent, le tour qui vient, Entrée pour continuer. */
export function Entracte({
  tour,
  marques,
  aRevoir,
  big = false,
  focus = false,
  onSuivant,
  onRecommencer,
}: {
  /** le tour qui vient de se terminer */
  tour: number;
  /** les marques du tour, dans l'ordre de passage */
  marques: (boolean | null)[];
  aRevoir: number;
  big?: boolean;
  /** prend le focus (après le dernier geste du tour, pas dans les aperçus) */
  focus?: boolean;
  onSuivant: () => void;
  onRecommencer: () => void;
}) {
  const total = marques.length;
  const sues = marques.filter((x) => x === true).length;
  return (
    <section className={`card-hero rl-in relative grid content-center gap-6 px-6 py-8 sm:px-9 sm:py-10 ${big ? "flex-1" : ""}`} aria-label={BOUCLE.entracteSur(tour)}>
      <div className="flex items-start justify-between gap-5">
        <div className="grid min-w-0 gap-2.5">
          <p className="t-eyebrow m-0">{BOUCLE.entracteSur(tour)}</p>
          <h2 className="t-h1 m-0" aria-live="polite">
            {BOUCLE.entracteTitre(tour + 1, aRevoir)}
          </h2>
          <p className="t-small m-0 max-w-[460px]">{BOUCLE.entracteLigne(sues, total)}</p>
        </div>
        <PileMini n={aRevoir} />
      </div>
      <CochesTour marques={marques} label={`${nombre(sues)} sur ${nombre(total)} · ${nombre(aRevoir)} à revoir`} />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary btn-lg rl-press" onClick={onSuivant} autoFocus={focus}>
            {BOUCLE.entracteAction(tour + 1)} <ArrowRight size={16} aria-hidden />
          </button>
          <button type="button" className="btn btn-secondary btn-lg" onClick={onRecommencer}>
            {BOUCLE.recommencer}
          </button>
        </div>
        <span className="t-micro hidden items-center gap-1.5 sm:inline-flex">
          <span className="kbd">Entrée</span> pour continuer
        </span>
      </div>
    </section>
  );
}

/** Une boucle entamée, retrouvée au retour sur la page : reprendre ou recommencer. */
export function Reprise({
  tour,
  rang,
  total,
  entracte,
  aRevoirTour,
  maitriseesTour,
  maitrisees,
  cartes,
  depuisMs,
  big = false,
  onReprendre,
  onRecommencer,
}: {
  tour: number;
  rang: number;
  total: number;
  entracte: boolean;
  aRevoirTour: number;
  maitriseesTour: number;
  /** maîtrisées depuis le début de la boucle, sur `cartes` */
  maitrisees: number;
  cartes: number;
  depuisMs: number;
  big?: boolean;
  onReprendre: () => void;
  onRecommencer: () => void;
}) {
  return (
    <section className={`card-hero rl-in relative grid content-center gap-6 px-6 py-8 sm:px-9 sm:py-10 ${big ? "flex-1" : ""}`} aria-label={BOUCLE.repriseSur}>
      <div className="flex items-start justify-between gap-5">
        <div className="grid min-w-0 gap-2.5">
          <p className="t-eyebrow m-0">{BOUCLE.repriseSur}</p>
          <h2 className="t-h1 m-0">{BOUCLE.repriseTitre(tour, rang, total, entracte, aRevoirTour)}</h2>
          <p className="t-small m-0 max-w-[460px]">{BOUCLE.repriseLigne(depuisMs, maitrisees, cartes)}</p>
        </div>
        <PileMini n={entracte ? aRevoirTour : Math.max(0, total - maitriseesTour - aRevoirTour)} ton={entracte ? "pen" : "ink"} />
      </div>
      <div className="grid gap-2">
        <BarreTour tour={tour} maitrisees={maitriseesTour} aRevoir={aRevoirTour} total={total} rang={rang} />
        <LegendeTour maitrisees={maitriseesTour} aRevoir={aRevoirTour} total={total} />
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary btn-lg rl-press" onClick={onReprendre}>
            {BOUCLE.reprendre(tour, rang, total, entracte)}
          </button>
          <button type="button" className="btn btn-secondary btn-lg" onClick={onRecommencer}>
            {BOUCLE.recommencer}
          </button>
        </div>
      </div>
    </section>
  );
}

/** Le lien vers le one-pager de la matière (PDF, nouvel onglet). */
export function LienOnePager({ href, className = "btn btn-secondary btn-lg" }: { href: string; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} title={BOUCLE.onePagerAide}>
      <FileText size={16} aria-hidden /> {BOUCLE.onePager} <ArrowUpRight size={14} aria-hidden className="text-muted" />
    </a>
  );
}

/**
 * « Réviser toute la matière · 60 cartes » : en tête des paquets d'une matière
 * (cartes 0 : compte inconnu, pas de chiffre). `etat` : où en est la boucle
 * de la matière (sur le compte, puis l'appareil), rien si elle n'est pas commencée.
 */
export function AppelMatiere({ cle, cartes, paquets, etat = null }: { cle: string; cartes: number; paquets: number; etat?: EtatListe | null }) {
  return (
    <Link href={`/flashcards/matiere/${cle}`} className="card-hero rl-lift group flex items-center gap-4 px-5 py-4 sm:gap-6 sm:px-7 sm:py-5">
      <PileMini n={cartes || paquets} ton="ink" />
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-bold leading-tight tracking-[-0.012em] sm:text-[19px]">
          {MATIERE_CARTES.appelTitre}
          {cartes > 0 && <span className="whitespace-nowrap font-mono text-[14px] font-semibold text-muted"> · {MATIERE_CARTES.appelCompte(cartes)}</span>}
        </span>
        <span className="t-small mt-1.5 block max-w-[520px]">{MATIERE_CARTES.appelLigne(paquets)}</span>
        <EtatPaquetListe etat={etat} className="mt-2.5" />
      </span>
      <span className="icon-btn h-11 w-11 shrink-0 rounded-[13px] transition-transform group-hover:translate-x-0.5" aria-hidden>
        <ArrowRight size={17} />
      </span>
    </Link>
  );
}

/** Une matière sans cartes (pas encore) : la page reste propre, le one-pager à portée. */
export function MatiereVide({ matiere, onePager }: { matiere: string; onePager: string | null }) {
  return (
    <section className="card-quiet rl-in grid justify-items-start gap-4 px-6 py-10 sm:px-9 sm:py-12" aria-label={MATIERE_CARTES.vide}>
      <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-surface-2 text-muted" aria-hidden>
        <Layers size={19} />
      </span>
      <div className="grid gap-2">
        <h2 className="t-h2 m-0">{MATIERE_CARTES.vide}</h2>
        <p className="t-small m-0 max-w-[460px]">{onePager ? MATIERE_CARTES.videLigne(matiere) : MATIERE_CARTES.videLigneSansOnePager(matiere)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onePager && <LienOnePager href={onePager} className="btn btn-primary rl-press" />}
        <Link href="/flashcards" className="btn btn-secondary">
          {MATIERE_CARTES.autresMatieres}
        </Link>
      </div>
    </section>
  );
}

/** Sous la révision d'une matière : ses paquets, un par ligne (et où en est chacun), pour en réviser un seul. */
export function PaquetsDeLaMatiere({ paquets }: { paquets: { id: string; theme: string; cartes: number; etat?: EtatListe | null }[] }) {
  if (paquets.length === 0) return null;
  return (
    <section className="rl-section mt-6 md:mt-10" aria-labelledby="paquets-matiere">
      <h2 id="paquets-matiere" className="t-h3 m-0">
        {MATIERE_CARTES.lesPaquets}
      </h2>
      <div className="card divide-y divide-line overflow-hidden">
        {paquets.map((p, i) => (
          <Link key={p.id} href={`/flashcards/${p.id}`} className="rl-row group flex min-h-[52px] items-center gap-4 px-5 py-3 md:px-6">
            <span className="w-5 shrink-0 font-mono text-[12px] font-semibold tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold tracking-[-0.01em]">{p.theme}</span>
              {/* téléphone : sous le thème, qui garde toute la largeur */}
              <EtatPaquetListe etat={p.etat} className="mt-1.5 sm:hidden" />
            </span>
            <EtatPaquetListe etat={p.etat} className="hidden sm:inline-flex" />
            <span className="t-micro shrink-0 tabular-nums">{nCartes(p.cartes)}</span>
            <ChevronRight size={16} aria-hidden className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </section>
  );
}
