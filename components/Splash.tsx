"use client";

import { useEffect, useRef, useState } from "react";

const SEEN_KEY = "rl-splash-seen";

/**
 * Clears the first-paint cover. It is a CSS pseudo-element driven by a class
 * on <html>, not a DOM node: removing a server-rendered node before hydration
 * makes React bail out on the whole tree. Safe to call more than once.
 */
function dropCover() {
  document.documentElement.classList.remove("rl-booting");
}

type Film = "plane" | "nyc";

/**
 * Which film this session gets: New York or the aircraft, drawn at random.
 * `?splash=nyc` / `?splash=plane` forces one (and replays it). Visitors who
 * ask for less motion or less data get the aircraft: it is the lighter one
 * and has a still version.
 */
function pickFilm(forced: string | null): Film {
  if (forced === "nyc" || forced === "plane") return forced;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (reduce || saveData) return "plane";
  return Math.random() < 0.5 ? "nyc" : "plane";
}

/**
 * Plays the Ranked Lobby splash once per browser session, over whatever page
 * loaded first. The WebGL engine (and three.js with it) is imported lazily, so
 * returning visitors never download it.
 */
export function Splash() {
  const [film, setFilm] = useState<Film | null>(null);
  const active = film !== null;
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("splash");
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // private mode or blocked storage: play it, it is only a veil
    }
    if (seen && !forced) dropCover();
    else setFilm(pickFilm(forced));
  }, []);

  useEffect(() => {
    if (!film) return;

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
        if (!cancelled) setFilm(null);
      }, 700);
    };

    const engine = film === "nyc" ? import("@/lib/splash/nyc/engine") : import("@/lib/splash/engine");
    engine
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
        if (!cancelled) setFilm(null);
      });

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      if (stop) stop();
      dropCover();
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [film]);

  if (!active) return null;
  return <div ref={hostRef} aria-hidden />;
}
