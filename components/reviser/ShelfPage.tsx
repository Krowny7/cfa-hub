import Link from "next/link";
import { ArrowLeft, ArrowRight, FileText, Headphones } from "lucide-react";

// Page d'index d'un format de révision (fiches, cours complets) : une carte
// par matière disponible, les matières à venir en pointillés. Sans requête.

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
      <div className="flex flex-col gap-2.5">
        <Link href="/reviser" className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-white">
          <ArrowLeft size={14} /> {kicker}
        </Link>
        <h1 className="rl-hero rl-in m-0 font-sans text-[clamp(36px,5.4vw,60px)] font-extrabold leading-none tracking-[-0.035em] [text-wrap:balance]">{title}</h1>
        <p className="max-w-[620px] text-[15px] leading-[1.5] text-muted">{desc}</p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-[18px]">
        {items.map((it, i) => (
          <Link key={it.href} href={it.href} className="card rl-lift rl-in flex flex-col gap-3 p-6" style={{ animationDelay: `${i * 0.05}s` }}>
            <span className="flex items-center justify-between gap-3">
              <span className="grid h-[46px] w-[46px] place-items-center rounded-[13px] bg-surface-2">
                <Icon size={20} />
              </span>
              <span className="text-right text-[12.5px] font-semibold text-muted">{it.meta}</span>
            </span>
            <span className="text-[22px] font-extrabold leading-tight tracking-[-0.025em]">{it.title}</span>
            <span className="text-[14.5px] leading-[1.5] text-muted">{it.desc}</span>
            <span className="mt-auto inline-flex items-center gap-1.5 text-[14px] font-[650]">
              Ouvrir <ArrowRight size={15} />
            </span>
          </Link>
        ))}
      </div>

      {upcoming.length > 0 && (
        <section className="flex flex-col gap-3" aria-label="À venir">
          <h2 className="m-0 text-[15px] font-bold text-muted">À venir</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(220px,100%),1fr))] gap-3">
            {upcoming.map((name) => (
              <div key={name} className="flex items-center justify-between gap-2 rounded-[14px] border-[1.5px] border-dashed border-line-2 px-4 py-3">
                <span className="text-[14px] font-semibold leading-tight text-muted">{name}</span>
                <span className="text-[12px] text-muted">bientôt</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
