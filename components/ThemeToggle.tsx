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
      className="flex h-8 items-center gap-1.5 rounded-[3px] border-[1.5px] border-white/70 px-2.5 text-xs font-bold hover:bg-white/[0.07]"
    >
      {night ? <Sun size={14} /> : <Moon size={14} />}
      <span className="hidden md:inline">{night ? "Papier" : "Nuit"}</span>
    </button>
  );
}
