"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Timer, BookOpen, Layers, ClipboardList, MoreHorizontal, BookMarked, Trophy, Users, LayoutDashboard, GraduationCap, Settings, X } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";

const items = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/session", labelKey: "nav.session", icon: Timer },
  { href: "/flashcards", labelKey: "nav.flashcards", icon: Layers },
  { href: "/qcm", labelKey: "nav.qcm", icon: ClipboardList },
] as const;

// Regroupées dans le menu "Plus" : contenu moins consulté quotidiennement,
// mais qui restait invisible sur mobile faute de place dans la barre à 5 slots.
const moreItems = [
  { href: "/library", labelKey: "nav.library", icon: BookOpen },
  { href: "/fiches", labelKey: "nav.fiches", icon: BookMarked },
  { href: "/mock-exams", labelKey: "nav.mockExams", icon: Trophy },
  { href: "/exam", labelKey: "nav.exam", icon: GraduationCap },
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
  const [moreOpen, setMoreOpen] = useState(false);

  const moreActive = moreItems.some((it) => isActivePath(pathname, it.href));

  return (
    <>
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 rounded-t-2xl border-t border-white/[0.08] bg-neutral-950 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">{t("nav.more")}</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="rounded-full p-1 text-white/50 hover:bg-white/5 hover:text-white/80"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {moreItems.map(({ href, labelKey, icon: Icon }) => {
                const active = isActivePath(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-[11px] transition-colors " +
                      (active
                        ? "border-white/15 bg-white/[0.06] text-white"
                        : "border-white/[0.06] text-white/60 hover:bg-white/[0.04]")
                    }
                  >
                    <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                    <span className="max-w-full truncate text-center">{t(labelKey)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-white/[0.08] bg-neutral-950/90 backdrop-blur"
        aria-label="Mobile navigation"
      >
        <div className="grid h-full grid-cols-5">
          {items.map(({ href, labelKey, icon: Icon }) => {
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
                    : "text-muted hover:text-white/70")
                }
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                <span className="max-w-full truncate px-0.5">{t(labelKey)}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label={t("nav.more")}
            className={
              "flex flex-col items-center justify-center gap-1 text-[10px] transition-all " +
              (moreActive ? "text-white" : "text-muted hover:text-white/70")
            }
          >
            <MoreHorizontal size={20} strokeWidth={moreActive ? 2.2 : 1.8} />
            <span className="max-w-full truncate px-0.5">{t("nav.more")}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
