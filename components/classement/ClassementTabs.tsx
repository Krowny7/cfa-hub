"use client";

import { useEffect, useState } from "react";
import { PALETTES } from "@/lib/palettes";
import s from "./Affronter.module.css";

export type TabKey = "classement" | "amis" | "courbe" | "rangs" | "regles";

export type TabDef = {
  key: TabKey;
  label: string;
  panel: React.ReactNode;
};

const PAL = PALETTES["san-romano"];

// Les onglets du Classement général (Classement | Amis | Ta courbe | Les 8
// rangs | Comment ça marche). Les panneaux sont rendus côté serveur ; seul le
// panneau actif est visible. L'onglet suit l'adresse (?onglet=amis) pour être
// partageable, sans recharger la page ; flèches, Début et Fin déplacent le
// choix. L'onglet choisi se remplit de l'encre de la palette de l'espace.
export function ClassementTabs({ tabs, initial, label }: { tabs: TabDef[]; initial: TabKey; label: string }) {
  const [active, setActive] = useState<TabKey>(tabs.some((t) => t.key === initial) ? initial : tabs[0].key);
  const ix = tabs.findIndex((t) => t.key === active);

  function pick(key: TabKey) {
    setActive(key);
    try {
      const u = new URL(window.location.href);
      if (key === tabs[0].key) u.searchParams.delete("onglet");
      else u.searchParams.set("onglet", key);
      window.history.replaceState(window.history.state, "", u.toString());
    } catch {
      // adresse non modifiable (aperçu dans un cadre) : l'onglet change quand même
    }
  }

  // « Toi » (Autour de toi) mène à la liste : si un autre onglet est ouvert, on revient d'abord au Classement
  useEffect(() => {
    const first = tabs[0].key;
    const suit = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href="#joueurs"]');
      if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      pick(first);
      const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      requestAnimationFrame(() => document.getElementById("joueurs")?.scrollIntoView({ behavior: calme ? "auto" : "smooth", block: "start" }));
    };
    // en capture : avant le <Link> de Next, qui laisse la main si le clic est déjà traité
    document.addEventListener("click", suit, true);
    return () => document.removeEventListener("click", suit, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onKey(e: React.KeyboardEvent) {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (ix + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (ix + tabs.length - 1) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    pick(tabs[next].key);
    document.getElementById(`cl-tab-${tabs[next].key}`)?.focus();
  }

  return (
    <>
      <div role="tablist" aria-label={label} className={s.onglets} onKeyDown={onKey}>
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              id={`cl-tab-${t.key}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`cl-panel-${t.key}`}
              tabIndex={on ? 0 : -1}
              onClick={() => pick(t.key)}
              className={s.onglet + (on ? " rl-encre " + s.encre : "")}
              data-palette={on ? PAL.key : undefined}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div key={t.key} id={`cl-panel-${t.key}`} role="tabpanel" aria-labelledby={`cl-tab-${t.key}`} tabIndex={0} hidden={t.key !== active} className={s.panneau}>
          {t.panel}
        </div>
      ))}
    </>
  );
}
