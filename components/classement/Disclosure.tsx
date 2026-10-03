import { ChevronDown } from "lucide-react";

// Section repliée, posée sur le papier : une ligne fine, un titre discret et
// un chevron. Sert pour « Les 8 rangs » et « Comment ça marche ». Sans état
// (<details> natif) : fonctionne sans JavaScript.
export function Disclosure({
  title,
  hint,
  children,
  id,
  defaultOpen = false,
}: {
  title: React.ReactNode;
  /** précision courte à droite du titre (t-micro) */
  hint?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
  defaultOpen?: boolean;
}) {
  return (
    <details id={id} open={defaultOpen} className="group scroll-mt-24 border-t border-line last:border-b">
      <summary className="flex cursor-pointer list-none items-center gap-3 py-4 [&::-webkit-details-marker]:hidden">
        <span className="t-h3">{title}</span>
        {hint && <span className="t-micro hidden sm:inline">{hint}</span>}
        <ChevronDown size={18} className="ml-auto shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" aria-hidden />
      </summary>
      <div className="pb-6">{children}</div>
    </details>
  );
}
