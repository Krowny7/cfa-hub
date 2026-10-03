import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Tuile « Aujourd'hui » : une surface calme (card-quiet) entièrement
// cliquable, une étiquette discrète avec une flèche, puis un seul élément fort.

export function Tile({ href, label, icon, aside, ariaLabel, children }: {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** petite valeur à droite de l'étiquette (compte à rebours…) */
  aside?: React.ReactNode;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} aria-label={ariaLabel} className="card-quiet rl-lift group flex h-full min-w-0 flex-col gap-4 p-5 sm:p-6">
      <span className="t-micro flex items-center gap-1.5 font-semibold">
        {icon}
        <span className="truncate">{label}</span>
        <span className="ml-auto flex items-center gap-2">
          {aside}
          <ArrowRight size={15} aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
      </span>
      {children}
    </Link>
  );
}
