"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

const noop = () => () => {};
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

// Nombre qui compte jusqu'à sa valeur quand il arrive à l'écran, puis d'une
// valeur à l'autre quand elle change (XP gagnée, score). Pour un entier
// simple, la classe CSS .rl-count suffit ; ce composant gère les décimales,
// les unités et le format français (espaces fines, virgule).
// Rendu serveur = la valeur finale. Né à l'écran au premier chargement, il
// ne bouge pas (pas de retour à zéro après coup) ; mouvement réduit = valeur
// directe. Le nombre exact est toujours lu par les lecteurs d'écran.
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  from = 0,
  className = "",
  style,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** point de départ du premier comptage */
  from?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const fmt = useMemo(() => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }), [decimals]);
  const hydrating = useSyncExternalStore(noop, () => false, () => true);
  const firstWasHydration = useRef(hydrating);
  const ref = useRef<HTMLSpanElement | null>(null);
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  const raf = useRef(0);
  const started = useRef(false);
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  });

  const tween = (a: number, b: number) => {
    cancelAnimationFrame(raf.current);
    const dur = Math.min(1400, 600 + Math.abs(b - a) * 4);
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const v = a + (b - a) * easeOut(t);
      shownRef.current = v;
      setShown(v);
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  // premier comptage : quand le nombre arrive à l'écran
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const inView = r.top < window.innerHeight && r.bottom > 0;
    if (inView && firstWasHydration.current) {
      started.current = true;
      return;
    }
    shownRef.current = from;
    setShown(from);
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      io.disconnect();
      started.current = true;
      tween(from, latest.current);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf.current);
    };
    // seulement au montage : les changements de valeur passent par l'effet suivant
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // valeur qui change ensuite : on compte depuis la valeur affichée
  useEffect(() => {
    if (!started.current) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    if (shownRef.current !== value) tween(shownRef.current, value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const final = prefix + fmt.format(value) + suffix;
  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums", ...style }}>
      <span className="sr-only">{final}</span>
      <span aria-hidden>{prefix + fmt.format(shown) + suffix}</span>
    </span>
  );
}
