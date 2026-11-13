"use client";

import { useState } from "react";
import { OnePagersGrille } from "@/components/reviser/OnePagers";
import type { OnePagerItem } from "@/components/reviser/shelves";
import { MUR } from "@/lib/voice-reviser-b";
import s from "./MurOnePagers.module.css";

// /fiches/one-pagers (direction « le lieu, puis l'objet », 2026-11-13) : le mur épinglé en grand
// (OnePagersGrille, le présentoir « epingle ») et, au-dessus, un filtre par matière : une pastille
// Mono par code ; une matière choisie ne laisse que sa feuille au mur. Le choix vit dans la page
// (aucun stockage) : rien ne change entre le serveur et le premier rendu.

export function MurOnePagers({ items }: { items: (OnePagerItem & { url: string | null })[] }) {
  const [choix, setChoix] = useState<string | null>(null);
  const visibles = choix ? items.filter((it) => it.key === choix) : items;
  return (
    <div className={s.mur}>
      <div className={s.filtre} role="group" aria-label={MUR.filtre}>
        <button type="button" className={s.pastille + " rl-presse"} aria-pressed={choix === null} onClick={() => setChoix(null)}>
          {MUR.toutes}
        </button>
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            className={s.pastille + " rl-presse"}
            aria-pressed={choix === it.key}
            onClick={() => setChoix(choix === it.key ? null : it.key)}
            title={it.name}
            disabled={!it.url}
          >
            {it.code}
          </button>
        ))}
      </div>
      <div className={s.feuilles} data-seule={choix ? "1" : undefined}>
        <OnePagersGrille key={choix ?? "toutes"} items={visibles} />
      </div>
    </div>
  );
}
