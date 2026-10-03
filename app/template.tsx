"use client";

import { useLayoutEffect, useRef } from "react";
import { startMotion } from "@/components/ui/motion/engine";

// Gabarit de page : contrairement au layout, il est remonté à chaque
// changement de page. La nouvelle page y entre en fondu (.rl-route > *, dans
// globals.css), y compris quand elle remplace le squelette de chargement, et
// le moteur de mouvement y tourne : apparitions au défilement, entrées
// différées, onglets qui glissent (components/ui/motion/engine.ts).
//
// Captures et tests : avec ?mouvement=off, ou dans un navigateur sans tête
// (captures Edge headless, où les cadres ne se repeignent pas pendant le
// budget de temps virtuel), tout s'affiche directement dans son état posé.
export default function Template({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  // avant le premier affichage : ce qui naît hors de l'écran attend dès le départ
  useLayoutEffect(() => {
    if (!ref.current) return;
    if (/[?&]mouvement=off/.test(location.search) || /Headless/.test(navigator.userAgent)) {
      document.documentElement.dataset.rlMotion = "off";
      return;
    }
    return startMotion(ref.current);
  }, []);
  return (
    <div ref={ref} className="rl-route">
      {children}
    </div>
  );
}
