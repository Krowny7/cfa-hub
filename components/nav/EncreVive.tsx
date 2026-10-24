"use client";

import { useEffect, useRef } from "react";
import { animerEncre } from "@/components/ui/rank-badge-anim";

// Le liquide des insignes de rang (même shader, même vitesse, même boucle et
// même contexte WebGL : components/ui/rank-badge-anim.ts) dans la pastille de
// l'onglet actif, aux couleurs de la palette de la page. À poser dans l'élément
// .rl-encre (le parent) : le canvas en occupe tout le fond. Tant qu'il n'a pas
// peint (sans WebGL, mouvement réduit, data-rl-motion="off", écran où l'onglet
// est caché), la texture de repli du CSS reste en place ; en mode discret, le
// CSS le masque. Sert aussi ailleurs (la carte « Cours complets » de Réviser) :
// `echelle`, en px CSS, élargit le motif sur une grande surface (96 par défaut).
export function EncreVive({ tons, echelle }: { tons: readonly string[]; echelle?: number }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const encre = useRef<ReturnType<typeof animerEncre> | null>(null);
  const initiaux = useRef(tons);
  const echelleInitiale = useRef(echelle);
  useEffect(() => {
    const cv = canvas.current;
    const racine = cv?.parentElement;
    if (!cv || !racine) return;
    const h = animerEncre(racine, cv, initiaux.current, echelleInitiale.current);
    encre.current = h;
    return () => {
      h.arreter();
      encre.current = null;
    };
  }, []);
  const cle = tons.join();
  useEffect(() => {
    encre.current?.regler(cle.split(","));
  }, [cle]);
  return <canvas ref={canvas} aria-hidden className="rl-encre-vif" />;
}
