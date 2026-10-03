import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PEN_CHECK, PEN_CROSS } from "@/components/adn/paths-moments";
import { SubjectGlyph } from "@/components/ui/SubjectGlyph";
import { levelState, type LevelState, type TypeProgress } from "@/lib/calc/engine";
import { CALC_LEVELS, type CalcLevel } from "@/lib/calc/types";
import { ETAT_NIVEAU, NIVEAU } from "./voice";

// Petites pièces partagées des écrans de calcul. Sans état ni hook :
// utilisables côté serveur comme côté client.

/**
 * Les trois niveaux d'un type en trois marques (F · M · D) : à l'encre ce qui
 * est tenu, au crayon ce qui est entamé, en pointillé ce qui reste à tracer.
 */
export function LevelMarks({ progress, className = "" }: { progress: TypeProgress | undefined | null; className?: string }) {
  const states = CALC_LEVELS.map((l) => [l, levelState(progress?.levels[l])] as const);
  const label = states.map(([l, s]) => `${NIVEAU[l].label} ${ETAT_NIVEAU[s]}`).join(", ");
  return (
    <span role="img" aria-label={label} className={"inline-flex items-end gap-[5px] " + className}>
      {states.map(([l, s]) => (
        <span key={l} className="grid justify-items-center gap-[4px]">
          <span
            className={
              "font-mono text-[10px] font-semibold leading-none " +
              (s === "tenu" ? "text-white" : s === "entame" ? "text-muted" : "text-[color:var(--ink-3)]")
            }
          >
            {NIVEAU[l].court}
          </span>
          <LevelBar state={s} />
        </span>
      ))}
    </span>
  );
}

function LevelBar({ state }: { state: LevelState }) {
  if (state === "tenu") return <span aria-hidden className="block h-[3px] w-[18px] rounded-full bg-white" />;
  if (state === "entame") return <span aria-hidden className="block h-[3px] w-[18px] rounded-full bg-[color:var(--pencil)]" />;
  return <span aria-hidden className="block h-px w-[18px] bg-[repeating-linear-gradient(90deg,var(--pencil)_0_3px,transparent_3px_6px)]" />;
}

/** La marque du correcteur : coche d'encre (juste) ou croix au stylo rouge (rature), qui se trace. */
export function PenMark({ ok, size = 26, className = "" }: { ok: boolean; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className={"shrink-0 overflow-visible " + (ok ? "text-white " : "text-pen ") + className}>
      <path
        d={ok ? PEN_CHECK : PEN_CROSS}
        className="rl-drawline"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        style={{ animationDelay: "0s", animationDuration: ".45s" }}
      />
    </svg>
  );
}

/** Les données d'un énoncé, façon relevé : libellé, filet pointillé, valeur en chiffres tabulaires. */
export function DataSheet({ data, className = "" }: { data: { label: string; value: string }[]; className?: string }) {
  if (!data.length) return null;
  return (
    <dl className={"grid gap-2.5 " + className}>
      {data.map((d, i) => (
        <div key={i} className="flex min-w-0 items-baseline gap-3">
          <dt className="min-w-0 shrink text-[15px] leading-snug text-muted md:text-[16px]">{d.label}</dt>
          <span aria-hidden className="h-px min-w-6 flex-1 translate-y-[-3px] bg-[repeating-linear-gradient(90deg,var(--pencil)_0_2px,transparent_2px_6px)]" />
          <dd className="m-0 shrink-0 whitespace-nowrap font-mono text-[16px] font-semibold tabular-nums tracking-[-0.01em] md:text-[18px]">{d.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Lien de retour discret, en haut d'écran. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rl-press inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-white">
      <ArrowLeft size={14} aria-hidden />
      {children}
    </Link>
  );
}

/**
 * Le point focal d'une liste : le prochain calcul à faire (une carte héros,
 * une seule action en encre).
 */
export function FocusCard({
  kicker,
  title,
  meta,
  href,
  action,
  progress,
}: {
  kicker: string;
  title: string;
  meta: string;
  href: string;
  action: string;
  progress?: TypeProgress | null;
}) {
  return (
    <section className="card-hero grid gap-5 p-6 sm:p-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-8 md:p-9">
      <div className="min-w-0">
        <p className="t-eyebrow">{kicker}</p>
        <h2 className="t-h1 mt-3 break-words">{title}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="t-small">{meta}</span>
          {progress !== undefined && <LevelMarks progress={progress} />}
        </div>
      </div>
      <Link href={href} className="btn btn-primary btn-lg rl-press w-full justify-center md:w-auto">
        {action}
        <ArrowRight size={17} aria-hidden />
      </Link>
    </section>
  );
}

/** Une matière dont les calculs ne sont pas encore écrits. */
export function CalcSoon({ name, topic }: { name: string; topic: string }) {
  return (
    <div className="grid gap-8">
      <BackLink href="/calculs">Calculs</BackLink>
      <section className="card-quiet grid justify-items-start gap-4 p-7 md:p-10">
        <SubjectGlyph subject={topic} size={34} className="opacity-60" />
        <h1 className="t-h1">{name}</h1>
        <p className="t-body m-0 max-w-[460px] text-muted">Les calculs de cette matière arrivent bientôt. Equity et Portfolio Management sont déjà ouverts.</p>
        <Link href="/calculs" className="btn btn-secondary rl-press mt-2">
          Voir les calculs ouverts
          <ArrowRight size={15} aria-hidden />
        </Link>
      </section>
    </div>
  );
}

/** Cadre d'un état dans la page d'aperçu. */
export function CalcPreviewFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 border-t border-line pt-6">
      <p className="kicker m-0">{label}</p>
      {children}
    </section>
  );
}

/** Le niveau « Moyen » en toutes lettres, en minuscules dans une phrase. */
export const niveauMin = (l: CalcLevel) => NIVEAU[l].label.toLowerCase();
