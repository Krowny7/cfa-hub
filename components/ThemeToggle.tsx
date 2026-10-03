"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "rl_theme";

// Papier (défaut) ou nuit : encre claire sur papier sombre. Le choix est
// mémorisé ; un script dans le layout le réapplique avant le premier
// affichage pour éviter un flash de papier blanc la nuit.
export function ThemeToggle() {
  const [night, setNight] = useState(false);

  useEffect(() => {
    setNight(document.documentElement.dataset.theme === "nuit");
  }, []);

  function toggle() {
    const next = !night;
    if (next) document.documentElement.dataset.theme = "nuit";
    else delete document.documentElement.dataset.theme;
    try {
      if (next) localStorage.setItem(KEY, "nuit");
      else localStorage.removeItem(KEY);
    } catch {}
    setNight(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={night}
      title={night ? "Revenir au papier" : "Mode nuit"}
      aria-label={night ? "Thème papier" : "Thème nuit"}
      className="rl-press grid h-[38px] w-[38px] place-items-center rounded-[12px] border border-line-2 bg-surface hover:bg-surface-2"
    >
      {night ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
