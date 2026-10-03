"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Eye, LogOut, Moon, Settings } from "lucide-react";
import { RankBadge } from "@/components/ui/RankBadge";
import { useNightTheme } from "@/components/ThemeToggle";
import { useDiscreetMode } from "@/components/DiscreetToggle";
import { signOutAndLeave } from "@/components/SignOutButton";

// Menu du joueur, à droite de la barre du haut : le badge de rang ouvre Moi,
// les réglages d'affichage (thème nuit, mode discret) et la déconnexion.
// Il remplace quatre boutons côte à côte : la barre ne garde que la
// recherche et ce badge. Aussi présent sur mobile, où les deux bascules
// n'avaient pas de place.
export function UserMenu({ tier }: { tier: number }) {
  const [open, setOpen] = useState(false);
  const [night, toggleNight] = useNightTheme();
  const [discreet, toggleDiscreet] = useDiscreetMode();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Mon profil, thème et déconnexion"
        className="icon-btn flex w-auto items-center gap-0.5 pl-[7px] pr-1.5"
      >
        <RankBadge tier={tier} size={24} glow={false} />
        <ChevronDown size={14} strokeWidth={2.2} className={"text-muted transition-transform duration-300 " + (open ? "rotate-180" : "")} />
      </button>

      {open && (
        <div role="menu" className="menu rl-in absolute right-0 top-[calc(100%+8px)] z-[60] w-[272px]" style={{ animationDuration: ".28s" }}>
          <Link href="/moi" role="menuitem" className="menu-item gap-3 py-2.5" onClick={() => setOpen(false)}>
            <RankBadge tier={tier} size={34} glow={false} />
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold leading-tight">Moi</span>
              <span className="t-micro block">Profil, rang, stats et erreurs</span>
            </span>
          </Link>
          <div className="menu-sep" />
          <button type="button" role="menuitemcheckbox" aria-checked={night} className="menu-item" onClick={toggleNight}>
            <Moon size={16} strokeWidth={1.9} className="text-muted" />
            <span className="flex-1">Thème nuit</span>
            <span aria-hidden className={"switch" + (night ? " is-on" : "")} />
          </button>
          <button type="button" role="menuitemcheckbox" aria-checked={discreet} className="menu-item" onClick={toggleDiscreet}>
            <Eye size={16} strokeWidth={1.9} className="text-muted" />
            <span className="flex-1">
              Mode discret
              <span className="t-micro block font-normal">Pour réviser en public</span>
            </span>
            <span aria-hidden className={"switch" + (discreet ? " is-on" : "")} />
          </button>
          <div className="menu-sep" />
          <Link href="/moi?onglet=reglages" role="menuitem" className="menu-item" onClick={() => setOpen(false)}>
            <Settings size={16} strokeWidth={1.9} className="text-muted" />
            Réglages
          </Link>
          <button type="button" role="menuitem" className="menu-item text-muted" onClick={signOutAndLeave}>
            <LogOut size={16} strokeWidth={1.9} />
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
