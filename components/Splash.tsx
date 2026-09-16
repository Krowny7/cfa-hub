"use client";

import { useEffect, useRef, useState } from "react";

const SEEN_KEY = "rl-splash-seen";

/** Removes the first-paint cover. Safe to call more than once. */
function dropCover() {
  document.getElementById("rl-precover")?.remove();
}

/**
 * Plays the Ranked Lobby splash once per browser session, over whatever page
 * loaded first. The WebGL engine (and three.js with it) is imported lazily, so
 * returning visitors never download it.
 */
export function Splash() {
  const [active, setActive] = useState(false);
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // private mode or blocked storage: play it, it is only a veil
    }
    if (seen) dropCover();
    else setActive(true);
  }, []);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let stop: (() => void) | undefined;
    let timer = 0;

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    const finish = () => {
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        // nothing to do: worst case it plays again next navigation
      }
      // let the engine's fade finish before the overlay leaves the tree
      timer = window.setTimeout(() => {
        if (!cancelled) setActive(false);
      }, 700);
    };

    import("@/lib/splash/engine")
      .then((mod) => {
        if (cancelled || !hostRef.current) {
          dropCover();
          return;
        }
        stop = mod.mountSplash(hostRef.current, finish);
        dropCover(); // the splash itself covers the app from here on
      })
      .catch(() => {
        // WebGL or the chunk failed: skip straight to the app
        dropCover();
        if (!cancelled) setActive(false);
      });

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      if (stop) stop();
      dropCover();
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [active]);

  if (!active) return null;
  return <div ref={hostRef} aria-hidden />;
}
