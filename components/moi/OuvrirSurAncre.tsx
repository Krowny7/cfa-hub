"use client";

import { useEffect } from "react";

/**
 * Ouvre le repli <details id={id}> quand l'adresse vise son ancre (#id) :
 * à l'arrivée sur la page, et à chaque lien de la page qui y mène
 * (hashchange). Sans JavaScript, le repli reste simplement fermé.
 */
export function OuvrirSurAncre({ id }: { id: string }) {
  useEffect(() => {
    const ouvrir = () => {
      if (window.location.hash !== `#${id}`) return;
      const el = document.getElementById(id);
      if (el instanceof HTMLDetailsElement) el.open = true;
    };
    ouvrir();
    window.addEventListener("hashchange", ouvrir);
    return () => window.removeEventListener("hashchange", ouvrir);
  }, [id]);
  return null;
}
