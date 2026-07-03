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

export function SidebarNav({
  sections,
  bottomItems,
}: {
  sections: NavSection[];
  bottomItems: NavItem[];
}) {
  const pathname = usePathname() || "/";

  return (
    <div className="flex h-full flex-col py-3">
      <div className="flex-1 space-y-5 px-2">
        {sections.map((section, i) => (
          <div key={i}>
            {section.label && (
              <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-faint">
                {section.label}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all " +
                      (active
                        ? item.highlight
                          ? "bg-blue-500/20 text-blue-300 font-medium"
                          : "bg-white/[0.08] text-white font-medium"
                        : "text-white/60 hover:bg-white/[0.05] hover:text-white/90")
                    }
                  >
                    <span className="h-4 w-4 shrink-0">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom items (settings) */}
      <div className="mt-3 border-t border-white/[0.07] px-2 pt-3 space-y-0.5">
        {bottomItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all " +
                (active
                  ? "bg-white/[0.08] text-white font-medium"
                  : "text-white/50 hover:bg-white/[0.05] hover:text-white/80")
              }
            >
              <span className="h-4 w-4 shrink-0">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export { Timer, BookOpen, Layers, ClipboardList, Users, Settings, LayoutDashboard, GraduationCap };
