import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Illustration } from "@/components/ui/Illustration";
import type { IllustrationNom } from "@/lib/illustrations";

// Briques communes aux pages d'épreuve refaites (Le Pupitre, La Lice, La
// Grande Salle, départ minimal) : la rangée « lieu à droite, héros à gauche »,
// le héros à deux colonnes, la courte liste classée, et la carte de départ
// des épreuves courtes. Sans état : utilisables côté serveur comme client.

/** Grille 12 colonnes : le lieu à droite (en premier sur téléphone), le héros et les tuiles à gauche. */
export function RangeeLieu({ droite, gauche }: { droite: React.ReactNode; gauche: React.ReactNode }) {
  return (
    <div className="grid gap-4 md:gap-[18px] lg:grid-cols-12">
      <div className="flex min-w-0 flex-col lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:self-start">{droite}</div>
      <div className="flex min-w-0 flex-col gap-4 md:gap-[18px] lg:col-span-8 lg:col-start-1 lg:row-start-1">{gauche}</div>
    </div>
  );
}

/** Le héros : sur-titre, grand titre, ligne de contexte, une phrase, les actions ; une courte liste à droite dès 768 px. */
export function HeroEpreuve({
  label,
  id,
  eyebrow,
  titre,
  micro,
  texte,
  texte2,
  actions,
  droite,
  dataLeonard,
}: {
  label: string;
  id?: string;
  eyebrow: React.ReactNode;
  titre: React.ReactNode;
  micro?: React.ReactNode;
  texte?: React.ReactNode;
  texte2?: React.ReactNode;
  actions?: React.ReactNode;
  droite?: React.ReactNode;
  dataLeonard?: string;
}) {
  return (
    <section
      id={id}
      data-leonard={dataLeonard}
      aria-label={label}
      className={"card-hero rl-in grid min-h-[260px] min-w-0 gap-x-8 gap-y-6 p-6 md:p-8 " + (droite ? "md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" : "")}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="t-eyebrow m-0">{eyebrow}</p>
          <h2 className="t-h1 m-0">{titre}</h2>
          {micro && <p className="t-micro m-0">{micro}</p>}
        </div>
        {texte && <p className="t-body m-0 max-w-[460px] text-muted">{texte}</p>}
        {texte2 && <p className="t-small m-0 max-w-[460px]">{texte2}</p>}
        {actions && <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">{actions}</div>}
      </div>
      {droite && <div className="min-w-0">{droite}</div>}
    </section>
  );
}

/** Mini-barre d'encre (0 à 100). */
export function MiniBarre({ pct, label, className = "" }: { pct: number; label?: string; className?: string }) {
  return (
    <span aria-label={label} className={"relative inline-block h-[6px] w-[56px] shrink-0 overflow-hidden rounded-full bg-surface-2 " + className}>
      <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(4, Math.min(100, pct))}%`, background: "currentColor" }} />
    </span>
  );
}

/**
 * Courte liste classée (1, 2, 3) à l'intérieur d'un héros : nom, note, mini-barre.
 * La colonne suit la place (conteneur) : le nom passe à la ligne au lieu de
 * pousser la note hors de la carte ; la mini-barre s'efface quand la colonne
 * est trop étroite (moins de 19 rem) et revient dès qu'elle a la place.
 */
export function ListePodium({ titre, items }: { titre: string; items: { nom: React.ReactNode; note?: React.ReactNode; pct?: number; moi?: boolean; href?: string }[] }) {
  return (
    <div className="@container flex min-w-0 flex-col gap-2">
      <p className="t-eyebrow m-0">{titre}</p>
      <ol className="m-0 grid list-none grid-cols-[minmax(0,1fr)] gap-0.5 p-0">
        {items.map((it, i) => {
          const corps = (
            <>
              <span className="w-4 shrink-0 font-mono text-[13px] font-semibold text-muted">{i + 1}</span>
              <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug [overflow-wrap:anywhere]">{it.nom}</span>
              {it.note && <span className="shrink-0 font-mono text-[12.5px] tabular-nums text-muted">{it.note}</span>}
              {typeof it.pct === "number" && <MiniBarre pct={it.pct} className="hidden @[19rem]:inline-block" />}
            </>
          );
          const cls = "flex min-w-0 items-center gap-3 rounded-[12px] px-2.5 py-2.5 " + (it.moi ? "bg-surface-2" : i < items.length - 1 ? "border-b border-line" : "");
          return (
            <li key={i} className="min-w-0">
              {it.href ? (
                <Link href={it.href} className={cls + " rl-row"}>
                  {corps}
                </Link>
              ) : (
                <div className={cls}>{corps}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Un bandeau peint (4:1) pleine largeur de la carte de départ : 96 px sur téléphone, 150 px dès 768 px. */
function BandeauDepart({ nom, position }: { nom: IllustrationNom; position: string }) {
  return (
    <div className="h-[96px] w-full overflow-hidden rounded-[18px] border border-line bg-surface-2 md:h-[150px]">
      <Illustration nom={nom} position={position} decorative eager />
    </div>
  );
}

/**
 * La carte de départ minimale des épreuves courtes (séries éclair, 5 du jour) :
 * une seule carte centrée, un bandeau peint, un titre, les traits à poser,
 * trois promesses, un bouton plein, une ligne de résumé. `cta` : un bouton
 * (onClick) ou un lien (href).
 */
export function DepartCarte({
  bandeau,
  position = "center 55%",
  icone,
  kicker,
  titre,
  traits,
  promesses,
  cta,
  resume,
}: {
  bandeau: IllustrationNom;
  position?: string;
  icone: React.ReactNode;
  kicker: React.ReactNode;
  titre: string;
  /** les traits à poser (Ticks), déjà rendus par l'appelant */
  traits: React.ReactNode;
  promesses: [string, string][];
  cta: { label: string; onClick?: () => void; href?: string };
  resume?: string | null;
}) {
  const classes = "btn btn-primary btn-lg rl-press w-full";
  return (
    <section className="card-hero rl-in grid min-w-0 gap-6 p-6 md:p-9" aria-label={titre}>
      <BandeauDepart nom={bandeau} position={position} />
      <div className="grid gap-2">
        <p className="t-eyebrow m-0 inline-flex items-center gap-1.5">
          {icone} {kicker}
        </p>
        <h1 className="t-h1 m-0">{titre}</h1>
      </div>
      {traits}
      <ul className="m-0 grid grid-cols-[minmax(0,1fr)] list-none gap-1.5 p-0 text-[15px] leading-normal text-muted">
        {promesses.map(([b, rest]) => (
          <li key={b}>
            <b className="text-white">{b}</b>
            {rest}
          </li>
        ))}
      </ul>
      {cta.onClick ? (
        <button type="button" className={classes} onClick={cta.onClick} autoFocus>
          {cta.label} <ArrowRight size={17} aria-hidden />
        </button>
      ) : (
        <Link href={cta.href ?? "#"} className={classes}>
          {cta.label} <ArrowRight size={17} aria-hidden />
        </Link>
      )}
      {resume && <p className="t-micro m-0 text-center">{resume}</p>}
    </section>
  );
}

/** Une ligne-lien vers l'autre épreuve, sous la carte de départ. */
export function LigneEpreuve({ href, icone, titre, sous }: { href: string; icone: React.ReactNode; titre: string; sous: string }) {
  return (
    <Link href={href} className="rl-row group flex items-center gap-3 rounded-[14px] border border-line px-4 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-surface-2">{icone}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold">{titre}</span>
        <span className="t-micro block">{sous}</span>
      </span>
      <ArrowRight size={15} aria-hidden className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
