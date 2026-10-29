"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Search } from "lucide-react";
import { Avatar } from "@/components/classement/Avatar";
import { BoutonEnvoi, Sceau } from "@/components/classement/Encre";
import { fmtInt } from "@/components/classement/format";
import { RankBadge } from "@/components/ui/RankBadge";
import { searchDuelPlayers, type DuelPlayerCard } from "@/lib/duels";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import { createClient } from "@/lib/supabase/browser";
import { CL } from "@/lib/voice-classement";
import s from "./Affronter.module.css";

// La bande « Trouver un adversaire » (sous la Grande Salle, à l'encre noire) :
// dès 2 lettres tapées, les joueurs dont le pseudo correspond (duel_search_players,
// comme dans la Lice) s'ouvrent sous le champ : sceau, pseudo, insigne, ELO ; un
// clic (ou ↓ ↑ puis Entrée) mène à son profil. Sans choix, le bouton « Chercher »
// envoie le formulaire vers /people?q=. Le client Supabase n'est créé que dans le
// navigateur ; `demo` (aperçus) : une liste filtrée sur place, sans base.

const DELAI = 250;
const MAX = 6;
const LISTE = "cl-trouver-liste";
const optionId = (i: number) => `${LISTE}-${i}`;
const nomDe = (p: DuelPlayerCard) => p.username?.trim() || "Un joueur";

export function RechercheJoueurs({ demo }: { demo?: DuelPlayerCard[] }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<DuelPlayerCard[]>([]);
  const [cherche, setCherche] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(-1);
  const zone = useRef<HTMLFormElement>(null);
  const client = useRef<SupabaseClient | null>(null);

  // la recherche, avec un léger délai pour ne pas interroger à chaque lettre
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
      let r: DuelPlayerCard[];
      if (demo) r = demo.filter((p) => nomDe(p).toLowerCase().includes(t.toLowerCase()));
      else {
        client.current ??= createClient();
        r = await searchDuelPlayers(client.current, t);
      }
      if (fini) return;
      setRes(r.slice(0, MAX));
      setActif(-1);
      setCherche(false);
    }, DELAI);
    return () => {
      fini = true;
      clearTimeout(minuteur);
    };
  }, [q, demo]);

  // un clic ailleurs referme la liste
  useEffect(() => {
    const ailleurs = (e: MouseEvent) => {
      if (zone.current && !zone.current.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener("mousedown", ailleurs);
    return () => document.removeEventListener("mousedown", ailleurs);
  }, []);

  const montrer = ouvert && q.trim().length >= 2 && !(cherche && res.length === 0);

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && res.length > 0) {
      e.preventDefault();
      setOuvert(true);
      setActif((i) => (i + 1) % res.length);
    } else if (e.key === "ArrowUp" && res.length > 0) {
      e.preventDefault();
      setActif((i) => (i <= 0 ? res.length - 1 : i - 1));
    } else if (e.key === "Enter" && montrer && actif >= 0) {
      // le joueur choisi au clavier : on suit son lien
      e.preventDefault();
      document.getElementById(optionId(actif))?.querySelector("a")?.click();
    } else if (e.key === "Escape") {
      setOuvert(false);
    }
  }

  return (
    <form ref={zone} action="/people" method="get" role="search" className={[s.carte, s.bandeTrouver].join(" ")} aria-label={CL.trouver}>
      <Sceau>
        <Search size={18} />
      </Sceau>
      <label htmlFor="cl-trouver" className={s.bandeTexte}>
        <b>{CL.trouver}</b>
        <span>{CL.trouverLigne}</span>
      </label>
      <div className={s.champZone}>
        <input
          id="cl-trouver"
          name="q"
          type="search"
          autoComplete="off"
          placeholder={CL.trouverChamp}
          className={s.champ}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={montrer}
          aria-controls={LISTE}
          aria-activedescendant={montrer && actif >= 0 ? optionId(actif) : undefined}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOuvert(true);
          }}
          onFocus={() => setOuvert(true)}
          onKeyDown={onKey}
        />
        {montrer && (
          <ul id={LISTE} role="listbox" className={s.suggestions} aria-label={CL.suggestions}>
            {res.length === 0 ? (
              <li role="presentation" className={s.suggestionVide}>
                {CL.aucunJoueur}
              </li>
            ) : (
              res.map((p, i) => {
                const rk = rankFor(p.elo);
                const placement = p.gamesPlayed < PLACEMENT_GAMES;
                return (
                  <li key={p.userId} id={optionId(i)} role="option" aria-selected={i === actif} className={s.suggestion} onMouseEnter={() => setActif(i)}>
                    <Link href={`/people/${p.userId}`} className={s.suggestionLien} tabIndex={-1} onMouseDown={(e) => e.preventDefault()}>
                      <Avatar src={p.avatarUrl} name={nomDe(p)} size={30} />
                      <span className={s.suggestionNom}>{nomDe(p)}</span>
                      <RankBadge tier={rk.tierIndex} size={20} glow={false} gray={placement} />
                      <span className={s.suggestionElo}>{fmtInt(p.elo)} ELO</span>
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
      <BoutonEnvoi surPeinture>
        <Search size={16} aria-hidden /> {CL.trouverEnvoi}
      </BoutonEnvoi>
    </form>
  );
}
