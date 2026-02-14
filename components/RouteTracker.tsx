"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Stores the last meaningful route in localStorage so we can offer a "Continue" CTA
// on mobile (reduces friction → higher retention).
const KEY = "cfa.lastPath";

function isSkippable(path: string) {
  return (
    path === "/" ||
    path.startsWith("/login") ||
    path.startsWith("/api") ||
    path.startsWith("/_next")
  );
}

export function RouteTracker() {
  const pathname = usePathname();
  const sp = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    if (isSkippable(pathname)) return;

    const qs = sp?.toString();
    const full = qs ? `${pathname}?${qs}` : pathname;

    try {
      // Avoid storing dashboard as a "continue" target.
      if (pathname === "/dashboard") return;
      localStorage.setItem(KEY, full);
    } catch {
      // ignore
    }
  }, [pathname, sp]);

  return null;
}

export function getLastPath(): string | null {
  try {
    const v = localStorage.getItem(KEY);
    return v && typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}
