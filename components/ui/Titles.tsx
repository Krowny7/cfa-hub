import { InkRing } from "@/components/ink/InkRing";
import { INK } from "@/components/ui/InkDefs";
import { Enso } from "@/components/ui/InkRings";

// Titres partagés des pages V2. Sans état : utilisables depuis un composant
// serveur comme depuis un composant client.

/** Trait de pinceau sous un titre ; il se dessine de gauche à droite à l'apparition. */
export function BrushUnderline({ width = 170, height = 16, className = "" }: { width?: number; height?: number; className?: string }) {
  return (
    <svg viewBox="0 0 400 64" width={width} height={height} preserveAspectRatio="none" aria-hidden className={"rl-underline block overflow-visible " + className}>
      <use href={INK.swash} fill="currentColor" />
    </svg>
  );
}

/**
 * En-tête de page : petite ligne d'info (date, espace…), grand titre (.t-hero),
 * trait de pinceau dessous et, en fond, un enso presque transparent.
 * `children` se place sous le titre (pastilles, boutons).
 */
export function PageHero({
  kicker,
  title,
  children,
  enso = true,
  className = "",
}: {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
  enso?: boolean;
  className?: string;
}) {
  return (
    <section className={"relative " + className}>
      {enso && <Enso size={360} opacity={0.045} className="absolute -left-16 -top-24 hidden sm:block" />}
      <div className="relative">
        {kicker && <p className="t-micro font-semibold">{kicker}</p>}
        <h1 className="rl-hero t-hero mt-2.5 font-sans">{title}</h1>
        <BrushUnderline className="ml-[30%] mt-1 text-white" width={160} height={15} />
        {children && <div className="mt-5 flex flex-wrap gap-2">{children}</div>}
      </div>
    </section>
  );
}

/** Titre de section : petit anneau d'encre (qui se trace quand la section
 * arrive à l'écran), titre, sous-titre discret, action à droite.
 * Épure (option) : `num="02"` remplace l'anneau par un numéro de feuille et
 * tire un trait de crayon jusqu'à l'action, comme sur un plan. */
export function SectionTitle({
  title,
  sub,
  action,
  num,
  className = "",
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  num?: string;
  className?: string;
}) {
  if (num)
    return (
      <div className={"flex flex-wrap items-center gap-x-4 gap-y-1 " + className}>
        <span className="font-mono text-[12px] tracking-[0.06em] text-[color:var(--ink-3)]">{num}</span>
        <h2 className="t-h2">{title}</h2>
        {sub && <span className="t-small">{sub}</span>}
        <span aria-hidden className="pencil-line hidden min-w-8 flex-1 sm:block" />
        {action && <div className="ml-auto shrink-0 sm:ml-0">{action}</div>}
      </div>
    );
  return (
    <div className={"flex flex-wrap items-baseline gap-x-3 gap-y-1 " + className}>
      <InkRing size={18} className="rl-deco rl-ink-draw relative top-[2px] shrink-0 self-center" />
      <h2 className="t-h2">{title}</h2>
      {sub && <span className="t-small">{sub}</span>}
      {action && <div className="ml-auto self-center">{action}</div>}
    </div>
  );
}

/** Étiquette de carte : icône + libellé discret, valeur ou lien à droite. */
export function CardLabel({ icon, children, right }: { icon?: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[12.5px] font-semibold tracking-[-0.003em] text-muted">
      {icon && <span className="grid shrink-0 place-items-center opacity-80">{icon}</span>}
      <span>{children}</span>
      {right && <span className="ml-auto font-medium">{right}</span>}
    </div>
  );
}
