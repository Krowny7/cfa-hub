"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, Target, Trophy, User } from "lucide-react";
import { SPACES, activeSpace } from "@/lib/nav";

const ICONS = { reviser: BookOpen, entrainer: Target, classement: Trophy, moi: User } as const;

// Barre du bas (mobile) : flottante et translucide, l'accueil puis les quatre
// espaces ; une pastille d'encre glisse sous l'onglet actif (même geste que
// le contrôle segmenté de la barre du haut).
export function MobileBottomNav() {
  const pathname = usePathname() || "/";
  if (pathname.startsWith("/login") || pathname.startsWith("/share")) return null;
  const space = activeSpace(pathname);
  const home = pathname === "/" || pathname === "/dashboard";
  const items = [
    { key: "home", label: "Accueil", href: "/dashboard", Icon: Home, on: home },
    ...SPACES.map((s) => ({ key: s.key, label: s.label, href: s.href, Icon: ICONS[s.key], on: s.key === space })),
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
        className="absolute bottom-1.5 top-1.5 rounded-[16px] bg-white"
        style={{
          left: `calc(6px + ${Math.max(ix, 0)} * (100% - 12px) / ${n})`,
          width: `calc((100% - 12px) / ${n})`,
          opacity: ix >= 0 ? 1 : 0,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.14), 0 4px 12px -4px rgba(0,0,0,.35)",
          transition: "left .42s var(--ease-spring), opacity .2s ease",
        }}
      />
      {items.map(({ key, label, href, Icon, on }) => (
        <Link
          key={key}
          href={href}
          aria-current={on ? "page" : undefined}
          className={
            "relative z-[1] flex min-h-[52px] flex-col items-center justify-center gap-[3px] rounded-[16px] text-[10.5px] tracking-[-0.005em] transition-colors duration-300 active:scale-95 " +
            (on ? "font-semibold text-black" : "font-medium text-muted")
          }
        >
          <Icon size={19} strokeWidth={on ? 2.2 : 1.8} />
          <span className="max-w-full truncate px-0.5">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
