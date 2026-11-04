"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Search } from "lucide-react";
import { Avatar } from "@/components/classement/Avatar";
import { searchDuelPlayers, type DuelPlayerCard } from "@/lib/duels";
import { createClient } from "@/lib/supabase/browser";
import { CL } from "@/lib/voice-classement";

// La recherche de joueur de la barre du haut : dès 2 lettres, les joueurs dont le pseudo
// correspond, avec leur ELO ; un clic (ou ↓ ↑ puis Entrée) mène à leur profil. Sans choix,
// Entrée ouvre la page des joueurs. Masquée sur téléphone : la place va au reste de la barre.

const DELAI = 250;
const MAX = 6;
const nomDe = (p: DuelPlayerCard) => p.username?.trim() || "Un joueur";

export function RechercheJoueur() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<DuelPlayerCard[]>([]);
  const [cherche, setCherche] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(-1);
  const zone = useRef<HTMLFormElement>(null);
  const client = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) {
      setRes([]);
      setCherche(false);
      return;
    }
    setCherche(true);
    let fini = false;
    const minuteur = setTimeout(async () => {
      client.current ??= createClient();
      const r = await searchDuelPlayers(client.current, t);
      if (fini) return;
      setRes(r.slice(0, MAX));
      setActif(-1);
      setCherche(false);
    }, DELAI);
    return () => {
      fini = true;
      clearTimeout(minuteur);
    };
  }, [q]);

  useEffect(() => {
    const ailleurs = (e: MouseEvent) => {
      if (zone.current && !zone.current.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener("mousedown", ailleurs);
    return () => document.removeEventListener("mousedown", ailleurs);
  }, []);

  function aller(p: DuelPlayerCard) {
    setOuvert(false);
    setQ("");
    router.push(`/people/${p.userId}`);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && res.length > 0) {
      e.preventDefault();
      setOuvert(true);
      setActif((i) => (i + 1) % res.length);
    } else if (e.key === "ArrowUp" && res.length > 0) {
      e.preventDefault();
      setActif((i) => (i <= 0 ? res.length - 1 : i - 1));
    } else if (e.key === "Enter" && ouvert && actif >= 0) {
      e.preventDefault();
      aller(res[actif]);
    } else if (e.key === "Escape") {
      setOuvert(false);
    }
  }

  const montrer = ouvert && q.trim().length >= 2 && !(cherche && res.length === 0);

  return (
    <form ref={zone} action="/people" method="get" role="search" className="relative hidden md:block">
      <Search size={15} strokeWidth={1.9} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        name="q"
        type="search"
        autoComplete="off"
        value={q}
        placeholder={CL.trouverChamp}
        aria-label={CL.trouverChamp}
        onChange={(e) => {
          setQ(e.target.value);
          setOuvert(true);
        }}
        onFocus={() => setOuvert(true)}
        onKeyDown={onKey}
        className="h-[38px] w-[176px] rounded-xl border border-line bg-surface pl-[34px] pr-3 text-[13.5px] transition-[width] duration-200 focus:w-[220px] xl:w-[200px] [&::-webkit-search-cancel-button]:hidden"
      />
      {montrer && (
        <div className="menu absolute right-0 top-[calc(100%+8px)] z-[60] w-[280px]">
          {res.length === 0 ? (
            <p className="t-small m-0 px-3 py-2">{CL.aucunJoueur}</p>
          ) : (
            res.map((p, i) => (
              <button key={p.userId} type="button" className={"menu-item gap-2.5" + (i === actif ? " bg-surface-2" : "")} onMouseEnter={() => setActif(i)} onClick={() => aller(p)}>
                <Avatar src={p.avatarUrl} name={nomDe(p)} size={28} />
                <span className="min-w-0 flex-1 truncate text-left">{nomDe(p)}</span>
                <span className="font-mono text-[12px] text-muted">{p.elo} ELO</span>
              </button>
            ))
          )}
        </div>
      )}
    </form>
  );
}
