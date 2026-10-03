"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SPACES, activeSpace } from "@/lib/nav";
import { ICONE_ESPACE, Icone, type IconeNom } from "@/components/adn/icons";

// Barre du bas (mobile) : flottante et translucide, l'accueil puis les quatre
// espaces ; une pastille d'encre glisse sous l'onglet actif (même geste que
// le contrôle segmenté de la barre du haut), placée par transform ; l'icône
// qui devient active fait un petit rebond.
export function MobileBottomNav() {
  const pathname = usePathname() || "/";
  if (pathname.startsWith("/login") || pathname.startsWith("/share")) return null;
  const space = activeSpace(pathname);
  const home = pathname === "/" || pathname === "/dashboard";
  const items = [
    { key: "home", label: "Accueil", href: "/dashboard", icone: "accueil" as IconeNom, on: home },
    ...SPACES.map((s) => ({ key: s.key, label: s.label, href: s.href, icone: ICONE_ESPACE[s.key] as IconeNom, on: s.key === space })),
  ];
  const ix = items.findIndex((i) => i.on);
  const n = items.length;

  return (
    <nav
      aria-label="Espaces"
      className="fixed inset-x-3 z-50 grid grid-cols-5 rounded-[22px] border border-line p-1.5 md:hidden"
      style={{
        bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        background: "color-mix(in oklab, var(--surface-3) 86%, transparent)",
        backdropFilter: "blur(18px) saturate(1.5)",
        WebkitBackdropFilter: "blur(18px) saturate(1.5)",
        boxShadow: "var(--edge), var(--shadow-3)",
      }}
    >
      <span
        aria-hidden
        className="absolute bottom-1.5 top-1.5 rounded-[16px] bg-white transition-[transform,opacity] duration-[420ms] ease-[var(--ease-spring)] motion-reduce:transition-none"
        style={{
          left: 6,
          width: `calc((100% - 12px) / ${n})`,
          transform: `translateX(${Math.max(ix, 0) * 100}%)`,
          opacity: ix >= 0 ? 1 : 0,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.14), 0 4px 12px -4px rgba(0,0,0,.35)",
        }}
      />
      {items.map(({ key, label, href, icone, on }) => (
        <Link
          key={key}
          href={href}
          aria-current={on ? "page" : undefined}
          className={
            "relative z-[1] flex min-h-[52px] flex-col items-center justify-center gap-[3px] rounded-[16px] text-[10.5px] tracking-[-0.005em] transition-colors duration-300 active:scale-95 " +
            (on ? "font-semibold text-black" : "font-medium text-muted")
          }
        >
          <Icone nom={icone} size={21} appui={on ? 1.12 : 0.95} className={on ? "rl-nudge" : undefined} />
          <span className="max-w-full truncate px-0.5">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
