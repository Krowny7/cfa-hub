"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Timer,
  BookOpen,
  Layers,
  ClipboardList,
  Users,
  Settings,
  LayoutDashboard,
  GraduationCap,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  highlight?: boolean;
};

type NavSection = {
  label?: string;
  items: NavItem[];
};

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  if (pathname === href) return true;
  return pathname.startsWith(href + "/");
}

// Entrée active : posée sur un coup de pinceau (.ink-swash). Les autres
// restent du texte d'encre, sans fond.
function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={
        "flex items-center gap-3 px-3 py-2.5 text-[14px] font-bold transition-colors " +
        (active ? "ink-swash" : "text-white/70 hover:text-white")
      }
    >
      <span className="h-4 w-4 shrink-0">{item.icon}</span>
      {item.label}
    </Link>
  );
}

export function SidebarNav({
  sections,
  bottomItems,
}: {
  sections: NavSection[];
  bottomItems: NavItem[];
}) {
  const pathname = usePathname() || "/";

  return (
    <div className="flex h-full flex-col py-5">
      <div className="flex-1 space-y-6 px-3">
        {sections.map((section, i) => (
          <div key={i}>
            {section.label && <div className="kicker mb-2 px-3">{section.label}</div>}
            <div className="space-y-1.5">
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="note rl-deco px-6 pb-4 text-white/55" aria-hidden>
        le savoir se conquiert.
      </p>

      <div className="mx-3 space-y-1.5 border-t-2 border-white pt-3">
        {bottomItems.map((item) => (
          <NavLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
        ))}
      </div>
    </div>
  );
}

export { Timer, BookOpen, Layers, ClipboardList, Users, Settings, LayoutDashboard, GraduationCap };
