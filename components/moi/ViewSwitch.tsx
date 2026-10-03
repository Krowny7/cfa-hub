"use client";

import { useState } from "react";

// Petit contrôle segmenté pour basculer entre deux ou trois vues d'une même
// carte (ex. Radar | Détail). Les vues arrivent toutes faites (rendues par
// le serveur) ; seule la vue choisie est affichée.
export function ViewSwitch({ label, title, views }: { label: string; title: React.ReactNode; views: { key: string; label: string; node: React.ReactNode }[] }) {
  const [ix, setIx] = useState(0);
  const n = views.length;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {title}
        <div role="tablist" aria-label={label} className="seg" style={{ padding: 3, gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          <span aria-hidden className="seg-thumb" style={{ top: 3, bottom: 3, left: `calc(3px + ${ix} * (100% - 6px) / ${n})`, width: `calc((100% - 6px) / ${n})` }} />
          {views.map((v, i) => (
            <button key={v.key} type="button" role="tab" aria-selected={i === ix} onClick={() => setIx(i)} className="seg-item px-3 py-1.5 text-[13px]">
              {v.label}
            </button>
          ))}
        </div>
      </div>
      {views.map((v, i) => (
        <div key={v.key} role="tabpanel" aria-label={v.label} hidden={i !== ix} className="min-w-0">
          {v.node}
        </div>
      ))}
    </>
  );
}
