"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, ScrollText, Settings } from "lucide-react";
import { Avatar } from "@/components/classement/Avatar";
import { OUVRIR_QUETES, useRecompenses } from "@/components/codex/quetes-evenements";
import { signOutAndLeave } from "@/components/SignOutButton";
import { BOUTON_JOUEUR as T } from "@/lib/voice-codex";
import s from "./Barre.module.css";

// Le bouton du joueur, à droite de la barre du haut : sa photo, avec un « ! » jaune quand une
// récompense de quête attend. Son menu : son profil, ses quêtes (« Récolter » lance la
// récupération dans le panneau de SceauQuetes, voisin dans la barre ; sans récompense, la
// ligne ouvre ce panneau), les réglages (thème nuit et mode discret y sont) et la déconnexion.
export function UserMenu({ id, nom, avatarUrl }: { id: string; nom: string; avatarUrl: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const quetes = useRecompenses();

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

  function ouvrirQuetes(recolter: boolean) {
    setOpen(false);
    window.dispatchEvent(new CustomEvent(OUVRIR_QUETES, { detail: { recolter } }));
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={quetes ? T.ariaRecompenses(quetes) : T.aria}
        data-leonard="sceau-quetes"
        className="rl-press relative grid rounded-full"
      >
        <Avatar src={avatarUrl} name={nom} size={38} />
        {!!quetes && (
          <span aria-hidden className={s.signal + " font-brand"}>
            !
          </span>
        )}
      </button>

      {open && (
        <div role="menu" className="menu absolute right-0 top-[calc(100%+8px)] origin-top-right z-[60] w-[272px]">
          <Link href={`/people/${id}`} role="menuitem" className="menu-item gap-3 py-2.5" onClick={() => setOpen(false)}>
            <Avatar src={avatarUrl} name={nom} size={34} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14.5px] font-semibold leading-tight">{nom}</span>
              <span className="t-micro block">{T.profil}</span>
            </span>
          </Link>
          {quetes !== null && (
            <button type="button" role="menuitem" className="menu-item" onClick={() => ouvrirQuetes(quetes > 0)}>
              <ScrollText size={16} strokeWidth={1.9} className="text-muted" />
              {quetes > 0 ? (
                <>
                  <span className="min-w-0 flex-1 text-left">
                    {T.recompenses}
                    <span className="t-micro block font-normal">{T.aRecolter(quetes)}</span>
                  </span>
                  <span className="btn btn-primary btn-sm pointer-events-none">{T.recolter}</span>
                </>
              ) : (
                T.quetes
              )}
            </button>
          )}
          <div className="menu-sep" />
          <Link href="/moi?onglet=reglages" role="menuitem" className="menu-item" onClick={() => setOpen(false)}>
            <Settings size={16} strokeWidth={1.9} className="text-muted" />
            {T.reglages}
          </Link>
          <button type="button" role="menuitem" className="menu-item text-muted" onClick={signOutAndLeave}>
            <LogOut size={16} strokeWidth={1.9} />
            {T.deconnexion}
          </button>
        </div>
      )}
    </div>
  );
}
