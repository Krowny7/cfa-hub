import Link from "next/link";
import { ArrowLeft, ChevronRight, FileText, Headphones } from "lucide-react";
import { TwoColumnRows } from "@/components/reviser/SubjectRows";

// Page d'index d'un format de révision (fiches, cours complets), dans le
// langage de Réviser : grand titre, une phrase, puis une liste calme (une
// ligne par matière disponible) ; les matières à venir tiennent sur une ligne.
// Sans requête.

export type ShelfItem = { href: string; title: string; meta: string; desc: string };

const ICONS = { fiche: FileText, cours: Headphones } as const;

export function ShelfPage({
  kind,
  kicker,
  title,
  desc,
  items,
  upcoming,
}: {
  kind: keyof typeof ICONS;
  kicker: string;
  title: string;
  desc: string;
  items: ShelfItem[];
  upcoming: string[];
}) {
  const Icon = ICONS[kind];
  return (
    <div className="rl-wide flex flex-col gap-8 md:gap-10">
      <header className="flex flex-col gap-3">
        <Link href="/reviser" className="t-small inline-flex w-fit items-center gap-1.5 font-semibold hover:text-white">
          <ArrowLeft size={14} aria-hidden /> {kicker}
        </Link>
        <h1 className="t-hero rl-in m-0">{title}</h1>
        <p className="t-body max-w-[560px] text-muted">{desc}</p>
      </header>

      <section className="rl-section" aria-label={title}>
        <div className="card px-3 py-2 md:px-4">
          <TwoColumnRows
            items={items}
            keyOf={(it) => it.href}
            render={(it, i) => (
              <Link href={it.href} className="rl-row rl-in group -mx-1 flex items-center gap-4 rounded-[14px] px-3 py-4" style={{ animationDelay: `${i * 0.04}s` }}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-surface-2">
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-bold leading-tight tracking-[-0.01em]">{it.title}</span>
                  <span className="t-small mt-1 line-clamp-2">{it.desc}</span>
                  <span className="t-micro mt-1.5 block font-medium">{it.meta}</span>
                </span>
                <ChevronRight size={16} aria-hidden className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          />
        </div>
        {upcoming.length > 0 && (
          <p className="t-micro">
            <span className="font-semibold">À venir</span> · {upcoming.join(" · ")}
          </p>
        )}
      </section>
    </div>
  );
}
