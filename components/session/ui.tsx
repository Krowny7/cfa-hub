import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrushUnderline } from "@/components/ui/Titles";

// Briques sans état des pages de sessions et d'examens (utilisables depuis un
// composant serveur comme depuis un composant client).

/** En-tête d'un outil : retour discret, titre, trait de pinceau, une ligne. */
export function PageHead({
  back,
  eyebrow,
  title,
  sub,
  right,
}: {
  back?: { href: string; label: string };
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="rl-in flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="t-micro inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-white">
            <ArrowLeft size={13} aria-hidden /> {back.label}
          </Link>
        )}
        {eyebrow && <p className={"t-eyebrow " + (back ? "mt-4" : "")}>{eyebrow}</p>}
        <h1 className={"t-h1 m-0 [overflow-wrap:anywhere] " + (back || eyebrow ? "mt-2" : "")}>{title}</h1>
        <BrushUnderline className="ml-[2px] mt-1.5 text-white" width={92} height={11} />
        {sub && <p className="t-small m-0 mt-3 max-w-[560px]">{sub}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </header>
  );
}

/** Titre de section : titre à gauche, une métadonnée ou une action à droite. */
export function SectionHead({ id, title, meta, action }: { id?: string; title: React.ReactNode; meta?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <h2 id={id} className="t-h2 m-0">
        {title}
      </h2>
      {action ?? (meta && <span className="t-micro">{meta}</span>)}
    </div>
  );
}

/** Variation d'ELO : encre pleine si positive, creux sinon. */
export function EloDelta({ delta, size = "md" }: { delta: number; size?: "sm" | "md" }) {
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "±";
  // dans une liste : du texte seul (encre si positif), sans pastille
  if (size === "sm") {
    return (
      <span title="Variation d'ELO" className={"text-[13px] font-semibold tabular-nums " + (delta > 0 ? "text-white" : "text-muted")}>
        {sign}
        {Math.abs(delta)}
      </span>
    );
  }
  return (
    <span
      title="Variation d'ELO"
      className={
        "inline-flex items-center rounded-[8px] px-2.5 py-1 text-[14px] font-semibold tabular-nums " +
        (delta > 0 ? "bg-white text-black" : "bg-surface-2 text-white")
      }
    >
      <span className="mr-1.5 text-[0.78em] font-medium opacity-70">ELO</span>
      {sign}
      {Math.abs(delta)}
    </span>
  );
}
