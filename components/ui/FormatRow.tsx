import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** Ligne d'un format secondaire (S'entraîner, les gabarits, RangeeLiens). entier : la description passe à la ligne au lieu d'être coupée (colonnes étroites), les titres restent alignés en haut. */
export function FormatRow({ href, icon, title, desc, meta, entier = false }: { href: string; icon: React.ReactNode; title: string; desc: string; meta?: string | null; entier?: boolean }) {
  return (
    <Link href={href} className={"rl-row group flex h-full gap-4 px-5 py-[18px] md:px-6 " + (entier ? "items-start" : "items-center")}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-surface-2">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-bold leading-tight tracking-[-0.01em]">{title}</span>
        <span className={"t-micro mt-1 block " + (entier ? "" : "sm:truncate")}>{desc}</span>
      </span>
      {meta && <span className="t-micro hidden shrink-0 font-semibold sm:inline">{meta}</span>}
      <ChevronRight size={16} aria-hidden className="shrink-0 self-center text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
