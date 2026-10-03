"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Target, Trophy, User } from "lucide-react";
import { SPACES, activeSpace } from "@/lib/nav";

const ICONS = { reviser: BookOpen, entrainer: Target, classement: Trophy, moi: User } as const;

// Les quatre espaces, en contrôle segmenté : l'indicateur blanc glisse
// (avec un léger ressort) sous l'onglet actif.
export function SpaceNav() {
  const pathname = usePathname() || "/";
  const active = activeSpace(pathname);
  const ix = SPACES.findIndex((s) => s.key === active);

  return (
    <nav aria-label="Espaces" className="hidden md:block">
      <div className="seg" style={{ gridTemplateColumns: `repeat(${SPACES.length}, minmax(0, 1fr))` }}>
        <span
          aria-hidden
          className="seg-thumb"
          style={{
            left: `calc(4px + ${Math.max(ix, 0)} * (100% - 8px) / ${SPACES.length})`,
            width: `calc((100% - 8px) / ${SPACES.length})`,
            opacity: ix >= 0 ? 1 : 0,
          }}
        />
        {SPACES.map((s) => {
          const Icon = ICONS[s.key];
          const on = s.key === active;
          return (
            <Link key={s.key} href={s.href} className="seg-item" aria-current={on ? "page" : undefined}>
              <Icon size={16} strokeWidth={on ? 2.2 : 1.8} />
              {s.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
