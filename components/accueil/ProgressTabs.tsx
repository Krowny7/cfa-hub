"use client";

import { useState } from "react";

// Carte « Ta progression » : un contrôle segmenté (indicateur glissant) et un
// seul panneau visible à la fois. Les panneaux arrivent tout rendus du
// serveur ; ce composant ne fait que choisir lequel montrer.

export type ProgressTab = { key: string; label: string; meta?: React.ReactNode; panel: React.ReactNode };

/** `initial` : clé de l'onglet ouvert au départ (aperçu, lien direct). */
export function ProgressTabs({ tabs, initial }: { tabs: ProgressTab[]; initial?: string }) {
  const [ix, setIx] = useState(() => Math.max(0, tabs.findIndex((t) => t.key === initial)));
  // Le premier panneau s'affiche sans animation ; les suivants entrent en fondu.
  const [moved, setMoved] = useState(false);
  const n = tabs.length;
  const tab = tabs[ix];

  return (
    <section className="card p-5 sm:p-8" aria-label="Ta progression">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div role="tablist" aria-label="Vue" className="seg w-full sm:w-auto" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          <span aria-hidden className="seg-thumb" style={{ left: `calc(4px + ${ix} * (100% - 8px) / ${n})`, width: `calc((100% - 8px) / ${n})` }} />
          {tabs.map((t, i) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`prog-tab-${t.key}`}
              aria-selected={i === ix}
              aria-controls="prog-panel"
              onClick={() => {
                setIx(i);
                setMoved(true);
              }}
              className="seg-item sm:px-6"
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab.meta && <div className="t-micro">{tab.meta}</div>}
      </div>
      <div key={tab.key} id="prog-panel" role="tabpanel" aria-labelledby={`prog-tab-${tab.key}`} className={"mt-6 sm:mt-8" + (moved ? " rl-in" : "")}>
        {tab.panel}
      </div>
    </section>
  );
}
