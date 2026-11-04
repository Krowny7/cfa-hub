"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye, LogOut, Moon, ScrollText, Settings } from "lucide-react";
import { Avatar } from "@/components/classement/Avatar";
import { OUVRIR_QUETES, QUETES_A_RECUPERER } from "@/components/codex/quetes-evenements";
import { BOUTON_JOUEUR } from "@/lib/voice-codex";
import { useNightTheme } from "@/components/ThemeToggle";
import { useDiscreetMode } from "@/components/DiscreetToggle";
import { signOutAndLeave } from "@/components/SignOutButton";

// Le bouton du joueur, à droite de la barre du haut : sa photo, avec un « ! » quand une
// récompense de quête est à récupérer. Il ouvre Moi, ses quêtes (le panneau de SceauQuetes,
// voisin dans la barre), les réglages d'affichage (thème nuit, mode discret) et la
// déconnexion. Aussi présent sur mobile.
export function UserMenu({ nom, avatarUrl }: { nom: string; avatarUrl: string | null }) {
  const [open, setOpen] = useState(false);
  const [night, toggleNight] = useNightTheme();
  const [discreet, toggleDiscreet] = useDiscreetMode();
  const ref = useRef<HTMLDivElement | null>(null);
  // null : le panneau des quêtes n'a rien dit (pas de Codex, ou pas encore lu)
  const [quetes, setQuetes] = useState<number | null>(null);

  useEffect(() => {
    const suivre = (e: Event) => setQuetes((e as CustomEvent<number>).detail);
    window.addEventListener(QUETES_A_RECUPERER, suivre);
    return () => window.removeEventListener(QUETES_A_RECUPERER, suivre);
  }, []);

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
        aria-label={quetes ? BOUTON_JOUEUR.ariaRecompenses(quetes) : BOUTON_JOUEUR.aria}
        data-leonard="sceau-quetes"
        className="rl-press relative block rounded-full"
      >
        <Avatar src={avatarUrl} name={nom} size={38} />
        {!!quetes && (
          <span aria-hidden className="absolute -right-1 -top-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-[var(--pen)] text-[12px] font-bold leading-none text-white ring-2 ring-[var(--paper)]">
            !
          </span>
        )}
      </button>

      {open && (
        <div role="menu" className="menu absolute right-0 top-[calc(100%+8px)] origin-top-right z-[60] w-[272px]">
          <Link href="/moi" role="menuitem" className="menu-item gap-3 py-2.5" onClick={() => setOpen(false)}>
            <Avatar src={avatarUrl} name={nom} size={34} />
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold leading-tight">{nom}</span>
              <span className="t-micro block">Profil, rang, stats et erreurs</span>
            </span>
          </Link>
          {quetes !== null && (
            <button
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={() => {
                setOpen(false);
                window.dispatchEvent(new Event(OUVRIR_QUETES));
              }}
            >
              <ScrollText size={16} strokeWidth={1.9} className="text-muted" />
              <span className="flex-1">{BOUTON_JOUEUR.quetes}</span>
              {quetes > 0 && <span className="rounded-full bg-[var(--pen)] px-1.5 text-[12px] font-bold text-white">{quetes}</span>}
            </button>
          )}
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
