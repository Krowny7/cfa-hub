import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { InkProgressRing } from "@/components/ui/InkRings";
import { Illustration } from "@/components/ui/Illustration";
import { FormatRow } from "@/components/reviser/ReviserView";
import type { IllustrationNom } from "@/lib/illustrations";

// Gabarit commun des pages-outils de S'entraîner (Calculs, Calculs d'une
// matière, Entraînement ciblé, QCM par thème, Examens officiels) : un en-tête
// court (retour, grand titre, une ligne), une rangée de 12 colonnes (le héros
// sur 8 + une carte de côté sur 4, des tuiles calmes sous le héros), la bande
// d'encre « la marche suivante », une rangée de liens, puis des sections
// calmes. Les « lieux » illustrés sont la CarteLieu de components/ui. Sans
// état ni hook : utilisable côté serveur comme côté client.

export type Action = { href: string; label: string };
export type Ligne = { label: string; meta?: string; pct: number | null; href?: string; rouge?: boolean };

/** La page : l'en-tête et le point focal en haut, puis les sections. */
export function Page({ entete, lead, children }: { entete: React.ReactNode; lead: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="rl-wide rl-page">
      <div className="flex flex-col gap-7 md:gap-10">
        {entete}
        {lead}
      </div>
      {children}
    </div>
  );
}

/** L'en-tête : le retour, le grand titre, une ligne. `retour` : lien de retour (par défaut S'entraîner). */
export function EnTete({
  icone,
  titre,
  ligne,
  droite,
  retour = { href: "/entrainement", label: "S'entraîner · CFA Niveau I" },
}: {
  icone?: React.ReactNode;
  titre: React.ReactNode;
  ligne?: React.ReactNode;
  droite?: React.ReactNode;
  retour?: Action;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="flex min-w-0 flex-col gap-3">
        <Link href={retour.href} className="t-small inline-flex w-fit items-center gap-2 font-semibold transition-colors hover:text-white">
          <ArrowLeft size={14} aria-hidden />
          {icone}
          <span>{retour.label}</span>
        </Link>
        <h1 className="t-hero rl-in m-0">{titre}</h1>
        {ligne && <p className="t-body m-0 max-w-[560px] text-muted">{ligne}</p>}
      </div>
      {droite}
    </header>
  );
}

export function Mini({ pct, rouge = false }: { pct: number; rouge?: boolean }) {
  return (
    <span className={"ink-bar w-14 shrink-0" + (rouge ? " is-pen" : "")} aria-hidden>
      <span style={{ width: `${Math.max(4, Math.min(100, pct))}%` }} />
    </span>
  );
}

function Liste({ titre, liste }: { titre: string; liste: Ligne[] }) {
  return (
    <ol className="m-0 grid list-none grid-cols-[minmax(0,1fr)] gap-1 p-0">
      {liste.map((l, i) => (
        <li key={`${l.label}-${i}`} className={i > 0 ? "border-t border-line" : ""}>
          <Link
            href={l.href ?? "#"}
            className={"rl-row flex min-h-[52px] items-center gap-3 rounded-[12px] px-3 py-2.5 " + (i === 0 ? "bg-surface" : "")}
            aria-label={`${titre} ${i + 1} : ${l.label}`}
          >
            <span className={"t-num w-4 shrink-0 text-[14px] " + (i === 0 ? "text-pen" : "text-muted")}>{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold leading-tight">{l.label}</span>
              {l.meta && <span className="t-micro mt-0.5 block truncate">{l.meta}</span>}
            </span>
            {l.pct !== null && <Mini pct={l.pct} rouge={l.rouge} />}
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** Le héros : UNE chose, un bouton plein, un lien ; à droite, une courte liste classée (repliée sur téléphone). */
export function Heros({
  eyebrow,
  titre,
  repere,
  phrase,
  detail,
  action,
  lien,
  listeTitre,
  liste,
  className = "",
  dataLeonard,
}: {
  eyebrow: string;
  titre: string;
  repere?: string;
  phrase: string;
  detail?: string;
  action: Action;
  lien?: Action;
  listeTitre?: string;
  liste?: Ligne[];
  className?: string;
  dataLeonard?: string;
}) {
  const avecListe = !!liste && liste.length > 0 && !!listeTitre;
  return (
    <section
      data-leonard={dataLeonard}
      className={"card-hero rl-in grid min-h-[260px] min-w-0 gap-x-8 gap-y-4 p-6 md:p-8 " + (avecListe ? "md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] " : "") + className}
      aria-label={eyebrow}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="t-eyebrow">{eyebrow}</p>
          <h2 className="t-h1 m-0 [overflow-wrap:anywhere]">{titre}</h2>
          {repere && <p className="t-micro m-0">{repere}</p>}
        </div>
        <div className="grid gap-1.5">
          <p className="t-body m-0 max-w-[480px] text-muted">{phrase}</p>
          {detail && <p className="t-small m-0 max-w-[480px]">{detail}</p>}
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
          <Link href={action.href} className="btn btn-primary rl-press w-fit max-md:min-h-[44px]">
            {action.label} <ArrowRight size={16} aria-hidden />
          </Link>
          {lien && (
            <Link href={lien.href} className="ink-link inline-flex min-h-[44px] items-center gap-1 text-[13px] font-semibold md:min-h-0">
              {lien.label} <ArrowRight size={13} aria-hidden />
            </Link>
          )}
        </div>
      </div>
      {avecListe && (
        <div className="flex min-w-0 flex-col gap-1 md:gap-2">
          <p className="t-eyebrow hidden px-2 md:block">{listeTitre}</p>
          <div className="hidden md:block">
            <Liste titre={listeTitre!} liste={liste!} />
          </div>
          <details className="group -mx-2 md:hidden">
            <summary className="t-small flex min-h-[44px] cursor-pointer list-none items-center gap-1.5 px-2 font-semibold">
              {listeTitre}
              <ChevronDown size={14} aria-hidden className="transition-transform group-open:rotate-180" />
            </summary>
            <Liste titre={listeTitre!} liste={liste!} />
          </details>
        </div>
      )}
    </section>
  );
}

/** Le carnet (sans illustration) : un chiffre, un anneau, une ligne ; le détail replié. */
export function CarteCarnet({
  eyebrow,
  pct,
  pctLabel,
  chiffre,
  unite,
  ligne,
  details,
  lien,
  className = "",
  dataLeonard,
}: {
  eyebrow: string;
  pct?: number;
  pctLabel?: string;
  chiffre: string;
  unite: string;
  ligne: string;
  details: { label: string; value: string }[];
  lien?: Action;
  className?: string;
  dataLeonard?: string;
}) {
  return (
    <section data-leonard={dataLeonard} className={"card rl-in flex min-w-0 flex-col gap-5 p-6 lg:h-full lg:p-7 " + className} aria-label={eyebrow}>
      <p className="t-eyebrow m-0">{eyebrow}</p>
      <div className="flex items-center gap-5">
        {pct !== undefined && (
          <InkProgressRing pct={pct} size={104}>
            <span className="flex flex-col items-center gap-0.5">
              <span className="t-num text-[18px]">{pct}%</span>
              <span className="t-micro">{pctLabel}</span>
            </span>
          </InkProgressRing>
        )}
        <div className="min-w-0">
          <p className="m-0 flex flex-wrap items-baseline gap-x-1.5">
            <span className="t-num text-[38px] leading-none">{chiffre}</span>
            <span className="text-[14px] font-semibold">{unite}</span>
          </p>
          <p className="t-small m-0 mt-1.5">{ligne}</p>
        </div>
      </div>
      <details className="group mt-auto border-t border-line pt-1">
        <summary className="t-small flex min-h-[44px] cursor-pointer list-none items-center justify-between font-semibold">
          Le détail
          <ChevronDown size={15} aria-hidden className="transition-transform group-open:rotate-180" />
        </summary>
        <dl className="m-0 grid gap-2.5 pb-1 pt-1">
          {details.map((d) => (
            <div key={d.label} className="flex items-baseline justify-between gap-4">
              <dt className="t-small">{d.label}</dt>
              <dd className="m-0 text-[14px] font-semibold tabular-nums">{d.value}</dd>
            </div>
          ))}
        </dl>
      </details>
      {lien && (
        <Link href={lien.href} className="ink-link w-fit text-[13px] font-semibold">
          {lien.label}
        </Link>
      )}
    </section>
  );
}

/** Tuile calme : icône + titre + une ligne + lien ou bouton secondaire. */
export function Tuile({
  icone,
  titre,
  droite,
  ligne,
  action,
  bouton = false,
  barre,
  dataLeonard,
}: {
  icone: React.ReactNode;
  titre: string;
  droite?: string;
  ligne: string;
  action: Action;
  bouton?: boolean;
  barre?: { pct: number; label: string };
  dataLeonard?: string;
}) {
  return (
    <section data-leonard={dataLeonard} className="card-quiet flex min-w-0 flex-col gap-3 p-6" aria-label={titre}>
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-surface">{icone}</span>
        <h3 className="m-0 min-w-0 flex-1 text-[16px] font-bold tracking-[-0.01em]">{titre}</h3>
        {droite && <span className="t-micro shrink-0 rounded-lg bg-surface px-2 py-1 font-mono font-semibold">{droite}</span>}
      </div>
      <p className="t-small m-0">{ligne}</p>
      {barre && (
        <div className="grid gap-1.5">
          <span className="ink-bar" aria-hidden>
            <span style={{ width: `${Math.max(3, barre.pct)}%` }} />
          </span>
          <span className="t-micro tabular-nums">{barre.label}</span>
        </div>
      )}
      <div className="mt-auto pt-1">
        {bouton ? (
          <Link href={action.href} className="btn btn-secondary rl-press min-h-[40px] px-3.5 text-[13.5px]">
            {action.label} <ArrowRight size={15} aria-hidden />
          </Link>
        ) : (
          <Link href={action.href} className="ink-link inline-flex min-h-[40px] items-center gap-1 text-[14px] font-semibold">
            {action.label} <ArrowRight size={14} aria-hidden />
          </Link>
        )}
      </div>
    </section>
  );
}

/** La bande d'encre : la marche suivante, pleine largeur, avec un médaillon peint (ou une icône). */
export function Bande({
  icone,
  titre,
  ligne,
  action,
  medaillon,
  dataLeonard,
}: {
  icone: React.ReactNode;
  titre: string;
  ligne: string;
  action: Action;
  medaillon?: IllustrationNom;
  dataLeonard?: string;
}) {
  return (
    <section data-leonard={dataLeonard} aria-label={titre} className="card-ink rl-in flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:px-7 sm:py-6" style={{ animationDelay: ".1s" }}>
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {medaillon ? (
          <span aria-hidden className="block h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white/70 md:h-[68px] md:w-[68px]">
            <Illustration nom={medaillon} decorative />
          </span>
        ) : (
          <span aria-hidden className="bande-encre-icone grid h-12 w-12 shrink-0 place-items-center rounded-[14px]">
            {icone}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="m-0 text-[19px] font-bold leading-tight tracking-[-0.015em] md:text-[21px]">{titre}</h2>
          <p className="m-0 mt-1 text-[13.5px] leading-snug opacity-75 md:text-[14.5px]">{ligne}</p>
        </div>
      </div>
      <Link href={action.href} className="btn btn-lg btn-on-ink rl-press w-full shrink-0 sm:w-auto">
        {action.label} <ArrowRight size={17} aria-hidden />
      </Link>
    </section>
  );
}

/** Une rangée de liens (2 ou 3 colonnes dès xl, une colonne sur téléphone). */
export function Liens({ label, items }: { label: string; items: { href: string; icon: React.ReactNode; title: string; desc: string; meta?: string | null }[] }) {
  const cols = items.length === 2 ? "xl:grid-cols-2" : "xl:grid-cols-3";
  return (
    <nav aria-label={label} className="card rl-in overflow-hidden px-1 py-1" style={{ animationDelay: ".14s" }}>
      <ul className={"m-0 grid list-none grid-cols-1 divide-y divide-line p-0 xl:divide-x xl:divide-y-0 " + cols}>
        {items.map((f) => (
          <li key={f.title} className="min-w-0">
            <FormatRow href={f.href} icon={f.icon} title={f.title} desc={f.desc} meta={f.meta} entier />
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Rangée 1 : héros (8 col.) + carte de côté (4 col.) ; `cotePremier` : la carte de côté passe en tête sur téléphone. */
export function Rangee({ heros, cote, tuiles, cotePremier = false }: { heros: React.ReactNode; cote: React.ReactNode; tuiles?: React.ReactNode; cotePremier?: boolean }) {
  const coteBloc = <div className="flex min-w-0 flex-col lg:col-span-4 lg:col-start-9 lg:row-start-1">{cote}</div>;
  return (
    <div className="grid gap-4 md:gap-[18px] lg:grid-cols-12">
      {cotePremier && coteBloc}
      <div className="flex min-w-0 flex-col gap-4 md:gap-[18px] lg:col-span-8 lg:col-start-1 lg:row-start-1 lg:[&>:last-child]:grow">
        {heros}
        {tuiles && (
          <div className="rl-in grid gap-4 md:grid-cols-2 md:gap-[18px] lg:grow" style={{ animationDelay: ".06s" }}>
            {tuiles}
          </div>
        )}
      </div>
      {!cotePremier && coteBloc}
    </div>
  );
}

export function Section({ id, titre, meta, children }: { id: string; titre: string; meta?: string; children: React.ReactNode }) {
  return (
    <section className="rl-section" aria-labelledby={id + "-t"} id={id}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={id + "-t"} className="t-h2 m-0">
          {titre}
        </h2>
        {meta && <span className="t-micro">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

/** Vignette : petite image posée dans une carte calme (format 3:2 ou portrait), légende courte. */
export function Vignette({
  nom,
  position = "center",
  titre,
  ligne,
  action,
  portrait = false,
}: {
  nom: IllustrationNom;
  position?: string;
  titre: string;
  ligne: string;
  action?: Action;
  portrait?: boolean;
}) {
  return (
    <section className="card-quiet flex min-w-0 items-center gap-4 p-4 md:gap-5 md:p-5" aria-label={titre}>
      <span
        aria-hidden
        className={"block shrink-0 overflow-hidden rounded-[12px] border border-line " + (portrait ? "h-[104px] w-[80px] md:h-[124px] md:w-[96px]" : "h-[72px] w-[108px] md:h-[88px] md:w-[132px]")}
      >
        <Illustration nom={nom} position={position} decorative />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="m-0 text-[16px] font-bold tracking-[-0.01em]">{titre}</h3>
        <p className="t-small m-0">{ligne}</p>
        {action && (
          <Link href={action.href} className="ink-link inline-flex min-h-[36px] w-fit items-center gap-1 text-[14px] font-semibold">
            {action.label} <ArrowRight size={14} aria-hidden />
          </Link>
        )}
      </div>
    </section>
  );
}
