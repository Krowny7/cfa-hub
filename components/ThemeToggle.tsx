"use client";

import { useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "rl_theme";

/**
 * État du thème nuit et sa bascule, partagés par le bouton ci-dessous et par
 * le menu du profil (components/nav/UserMenu.tsx).
 */
export function useNightTheme() {
  const [night, setNight] = useState(false);

  useEffect(() => {
    // Filet de sécurité : si React a dû reconstruire la page (erreur
    // d'hydratation), l'attribut posé par le script du layout a disparu.
    let n = document.documentElement.dataset.theme === "nuit";
    try {
      if (!n && localStorage.getItem(KEY) === "nuit") {
        document.documentElement.dataset.theme = "nuit";
        n = true;
      }
    } catch {}
    setNight(n);
    // Un autre bouton (barre du haut, réglages) a changé le thème
    const obs = new MutationObserver(() => setNight(document.documentElement.dataset.theme === "nuit"));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const toggle = useCallback(() => {
    const next = document.documentElement.dataset.theme !== "nuit";
    if (next) document.documentElement.dataset.theme = "nuit";
    else delete document.documentElement.dataset.theme;
    try {
      if (next) localStorage.setItem(KEY, "nuit");
      else localStorage.removeItem(KEY);
    } catch {}
    setNight(next);
  }, []);

  return [night, toggle] as const;
}

// Papier (défaut) ou nuit : encre claire sur papier sombre. Le choix est
// mémorisé ; un script dans le layout le réapplique avant le premier
// affichage pour éviter un flash de papier blanc la nuit.
export function ThemeToggle() {
  const [night, toggle] = useNightTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={night}
      title={night ? "Revenir au papier" : "Mode nuit"}
      aria-label={night ? "Thème papier" : "Thème nuit"}
      className="icon-btn"
    >
      {night ? <Sun size={16} strokeWidth={1.9} /> : <Moon size={16} strokeWidth={1.9} />}
    </button>
  );
}
