"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Timer, BookOpen, Layers, ClipboardList, Users } from "lucide-react";

const items = [
  { href: "/session", label: "Session", icon: Timer },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/flashcards", label: "Flash", icon: Layers },
  { href: "/qcm", label: "QCM", icon: ClipboardList },
  { href: "/people", label: "Profils", icon: Users },
];

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;
  return pathname.startsWith(href + "/");
}

export function MobileBottomNav() {
  const pathname = usePathname() || "/";

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-white/[0.08] bg-neutral-950/90 backdrop-blur"
      aria-label="Mobile navigation"
    >
      <div className="grid h-full grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          const isSession = href === "/session";
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                "flex flex-col items-center justify-center gap-1 text-[10px] transition-all " +
                (active
                  ? isSession
                    ? "text-blue-300"
                    : "text-white"
                  : isSession
                  ? "text-blue-400/60 hover:text-blue-300"
                  : "text-white/40 hover:text-white/70")
              }
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
