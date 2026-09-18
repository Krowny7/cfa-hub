"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Users, LayoutDashboard, Target, Settings } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";

// Même 5 entrées que la Sidebar desktop — plus de menu "Plus" à gérer
// depuis que Bibliothèque et Entraînement regroupent ce qui occupait
// auparavant 8 emplacements distincts.
const items = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/library", labelKey: "nav.library", icon: BookOpen },
  { href: "/entrainement", labelKey: "nav.entrainement", icon: Target },
  { href: "/people", labelKey: "nav.people", icon: Users },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
] as const;

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;
  return pathname.startsWith(href + "/");
}

export function MobileBottomNav() {
  const pathname = usePathname() || "/";
  const { t } = useI18n();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-white/[0.08] bg-neutral-950/90 backdrop-blur"
      aria-label="Mobile navigation"
    >
      <div className="grid h-full grid-cols-5">
        {items.map(({ href, labelKey, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                "flex flex-col items-center justify-center gap-1 text-[10px] transition-all " +
                (active ? "text-white" : "text-muted hover:text-white/70")
              }
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              <span className="max-w-full truncate px-0.5">{t(labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
