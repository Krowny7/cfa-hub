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
 * En-tête de page : petite ligne d'info (date, espace…), grand titre, trait de
 * pinceau dessous et, en fond, un enso presque transparent. `children` se
 * place sous le titre (pastilles, boutons).
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
      {enso && <Enso size={380} className="absolute -left-16 -top-24 hidden sm:block" />}
      <div className="relative">
        {kicker && <p className="text-[13px] font-semibold text-muted">{kicker}</p>}
        <h1 className="rl-hero mt-2 font-sans text-[clamp(36px,5.4vw,64px)] font-extrabold leading-none tracking-[-0.035em] [text-wrap:balance]">{title}</h1>
        <BrushUnderline className="ml-[30%] mt-1 text-white" width={170} height={16} />
        {children && <div className="mt-4 flex flex-wrap gap-2">{children}</div>}
      </div>
    </section>
  );
}

/** Titre de section : petit anneau d'encre, titre, sous-titre discret, action à droite. */
export function SectionTitle({ title, sub, action, className = "" }: { title: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={"flex flex-wrap items-center gap-x-3 gap-y-1 " + className}>
      <InkRing size={22} />
      <h2 className="text-[22px] font-bold leading-tight tracking-[-0.02em]">{title}</h2>
      {sub && <span className="text-[13.5px] text-muted">{sub}</span>}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

/** Étiquette de carte : icône + libellé discret, valeur ou lien à droite. */
export function CardLabel({ icon, children, right }: { icon?: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[13px] font-semibold text-muted">
      {icon}
      <span>{children}</span>
      {right && <span className="ml-auto font-medium">{right}</span>}
    </div>
  );
}
