"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/** À appeler avant un router.push() : le trait de chargement démarre comme
 * pour un clic sur un lien. */
export function signalNavStart() {
  window.dispatchEvent(new Event("rl:navstart"));
}

// Trait d'encre sous la barre du haut pendant un changement de page : il
// n'apparaît que si la page suivante se fait attendre (plus de 150 ms),
// avance vite puis ralentit, file au bout et s'efface à l'arrivée. Les
// changements d'adresse sans changement de chemin (?onglet=…) comptent aussi.
export function NavProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "load" | "done">("idle");
  const live = useRef(false);
  const timers = useRef<number[]>([]);
  const finishRef = useRef<() => void>(() => {});

  useEffect(() => {
    const clear = () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
    const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

    const finish = () => {
      if (!live.current) return;
      live.current = false;
      clear();
      setState((s) => (s === "load" ? "done" : "idle"));
      later(() => setState("idle"), 800);
    };
    finishRef.current = finish;

    const start = () => {
      clear();
      live.current = true;
      const from = location.href;
      later(() => live.current && setState("load"), 150);
      // filet de sécurité : une navigation annulée ne laisse pas le trait en plan
      later(finish, 9000);
      const poll = () => {
        if (!live.current) return;
        if (location.href !== from) finish();
        else later(poll, 90);
      };
      later(poll, 90);
    };

    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(a instanceof HTMLAnchorElement)) return;
      if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      let u: URL;
      try {
        u = new URL(a.href, location.href);
      } catch {
        return;
      }
      if (u.origin !== location.origin) return;
      // fichiers et routes techniques : pas une page
      if (u.pathname.startsWith("/api/") || u.pathname.startsWith("/auth/") || /[.][a-z0-9]{2,5}$/i.test(u.pathname)) return;
      // même page (ancre, ou lien vers l'endroit où l'on est)
      if (u.pathname === location.pathname && u.search === location.search) return;
      start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("rl:navstart", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("rl:navstart", start);
      clear();
    };
  }, []);

  // la nouvelle page est là
  useEffect(() => {
    finishRef.current();
  }, [pathname]);

  return (
    <span aria-hidden className="rl-navbar" data-state={state}>
      <i />
    </span>
  );
}
