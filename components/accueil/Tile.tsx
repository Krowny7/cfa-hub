import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Tuile « Aujourd'hui » : une surface calme (card-quiet) entièrement
// cliquable, sur la même grille que la tuile du défi du jour (DefiTile) :
// une étiquette discrète (icône, nom, état à droite), un seul élément fort,
// une ligne de détail, puis l'action en toutes lettres.

export function Tile({ href, label, icon, aside, ariaLabel, cta, children }: {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** petite valeur à droite de l'étiquette (compte à rebours, temps restant…) */
  aside?: React.ReactNode;
  ariaLabel?: string;
  /** l'action, en bas (« Les reprendre », « Revoir la partie · 8 ratures ») */
  cta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} aria-label={ariaLabel} className="card-quiet rl-lift group flex h-full min-w-0 flex-col p-5">
      <span className="flex items-center gap-2 text-[12.5px] font-semibold text-muted">
        {icon}
        <span className="truncate">{label}</span>
        {aside != null && <span className="ml-auto shrink-0 font-medium">{aside}</span>}
      </span>
      <span className="mt-3 block min-w-0">{children}</span>
      {cta != null && (
        <span className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold">
          {cta} <ArrowRight size={14} aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
      )}
    </Link>
  );
}
