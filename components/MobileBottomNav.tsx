"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, Target, Trophy, User } from "lucide-react";
import { SPACES, activeSpace } from "@/lib/nav";

const ICONS = { reviser: BookOpen, entrainer: Target, classement: Trophy, moi: User } as const;

// Barre du bas (mobile) : flottante et translucide, l'accueil puis les quatre
// espaces ; l'onglet actif est une pastille d'encre.
export function MobileBottomNav() {
  const pathname = usePathname() || "/";
  if (pathname.startsWith("/login") || pathname.startsWith("/share")) return null;
  const space = activeSpace(pathname);
  const home = pathname === "/" || pathname === "/dashboard";
  const items = [
    { key: "home", label: "Accueil", href: "/dashboard", Icon: Home, on: home },
    ...SPACES.map((s) => ({ key: s.key, label: s.label, href: s.href, Icon: ICONS[s.key], on: s.key === space })),
  ];

  return (
    <nav
      aria-label="Espaces"
      className="fixed inset-x-3 z-50 grid grid-cols-5 rounded-[20px] border border-line p-1.5 md:hidden"
      style={{
        bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        background: "color-mix(in oklab, var(--surface) 92%, transparent)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        boxShadow: "var(--shadow-2)",
      }}
    >
      {items.map(({ key, label, href, Icon, on }) => (
        <Link
          key={key}
          href={href}
          aria-current={on ? "page" : undefined}
          className={
            "rl-press flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-[14px] text-[10.5px] " +
            (on ? "bg-white font-bold text-black" : "font-semibold text-muted")
          }
        >
          <Icon size={19} strokeWidth={on ? 2.3 : 1.9} />
          <span className="max-w-full truncate px-0.5">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
