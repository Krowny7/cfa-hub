"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useI18n } from "@/components/I18nProvider";

type Item = { href: string; label: string; description?: string };

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (pathname === href) return true;
  return pathname.startsWith(href + "/");
}

/**
 * Simple, dependency-free dropdown built with <details>.
 * Works well on mobile + desktop and stays easy to maintain.
 */
export function StudyMenu({ items }: { items: Item[] }) {
  const { t } = useI18n();
  const pathname = usePathname() || "/";
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  // Close dropdown on route change.
  useEffect(() => {
    if (detailsRef.current) detailsRef.current.open = false;
  }, [pathname]);

  const active = items.some((it) => isActivePath(pathname, it.href));

  return (
    <details ref={detailsRef} className="relative">
      <summary
        className={
          "list-none cursor-pointer rounded-full border px-3 py-1.5 text-sm transition select-none " +
          (active
            ? "border-white/15 bg-white/[0.10] text-white"
            : "border-transparent text-white/80 hover:border-white/10 hover:bg-white/[0.06]")
        }
        aria-label={t("nav.study")}
      >
        <span className="inline-flex items-center gap-1.5">
          {t("nav.study")}
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className="h-4 w-4 opacity-70"
            aria-hidden
          >
            <path
              d="M5 7.5 10 12.5 15 7.5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </summary>

      <div className="absolute left-0 mt-2 w-[260px] rounded-2xl border border-white/10 bg-neutral-950/95 p-2 shadow-xl backdrop-blur">
        {items.map((it) => {
          const isActive = isActivePath(pathname, it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={
                "block rounded-xl px-3 py-2 text-sm transition " +
                (isActive
                  ? "bg-white/[0.08] text-white"
                  : "text-white/85 hover:bg-white/[0.06]")
              }
            >
              <div className="font-medium">{it.label}</div>
              {it.description ? (
                <div className="mt-0.5 text-xs text-white/60">{it.description}</div>
              ) : null}
            </Link>
          );
        })}
      </div>
    </details>
  );
}
