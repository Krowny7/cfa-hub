"use client";

import { useEffect } from "react";

// Une rangée qui défile à plat (téléphone) : au montage, l'objet conseillé (data-conseil) vient au
// centre, sans casser l'ordre du calendrier. Sans effet quand la rangée tient sans défiler.
export function CentrerConseil({ conteneur }: { conteneur: string }) {
  useEffect(() => {
    const ul = document.getElementById(conteneur);
    const el = ul?.querySelector<HTMLElement>("[data-conseil]");
    if (!ul || !el || ul.scrollWidth <= ul.clientWidth + 1) return;
    const r = el.getBoundingClientRect();
    const u = ul.getBoundingClientRect();
    ul.scrollLeft += r.left + r.width / 2 - (u.left + u.width / 2);
  }, [conteneur]);
  return null;
}
