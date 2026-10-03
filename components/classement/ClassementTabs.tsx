"use client";

import { useState } from "react";
import { segThumbStyle } from "@/components/classement/Seg";

export type TabKey = "classement" | "duels" | "examens";

export type TabDef = {
  key: TabKey;
  label: string;
  /** libellé court sous 640 px (sinon `label`) */
  short?: string;
  /** pastille à droite du libellé (défi reçu, J-7…) */
  badge?: string | null;
  panel: React.ReactNode;
};

// Onglets de l'espace Classement (Classement | Duels | Examens classés).
// Les trois panneaux sont rendus côté serveur ; seul le panneau actif est
// visible. L'onglet suit l'adresse (?onglet=duels) pour être partageable,
// sans recharger la page.
export function ClassementTabs({ tabs, initial }: { tabs: TabDef[]; initial: TabKey }) {
  const [active, setActive] = useState<TabKey>(tabs.some((t) => t.key === initial) ? initial : tabs[0].key);
  const ix = tabs.findIndex((t) => t.key === active);

  function pick(key: TabKey) {
    setActive(key);
    try {
      const u = new URL(window.location.href);
      if (key === tabs[0].key) u.searchParams.delete("onglet");
      else u.searchParams.set("onglet", key);
      window.history.replaceState(window.history.state, "", u.toString());
    } catch {
      // adresse non modifiable (aperçu dans un cadre) : l'onglet change quand même
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = tabs[(ix + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    pick(next.key);
    document.getElementById(`rl-tab-${next.key}`)?.focus();
  }

  return (
    <section className="flex min-w-0 flex-col gap-7 md:gap-9" aria-label="Classement, duels et examens">
      <div className="max-w-full overflow-x-auto [scrollbar-width:none]">
        <div role="tablist" aria-label="Vues" className="seg" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }} onKeyDown={onKey}>
          <span aria-hidden className="seg-thumb" style={segThumbStyle(ix, tabs.length)} />
          {tabs.map((t) => {
            const on = t.key === active;
            return (
              <button
                key={t.key}
                id={`rl-tab-${t.key}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`rl-panel-${t.key}`}
                aria-label={t.badge ? `${t.label} (${t.badge})` : t.label}
                tabIndex={on ? 0 : -1}
                onClick={() => pick(t.key)}
                className="seg-item px-3 sm:px-5"
              >
                {t.short ? (
                  <>
                    <span className="sm:hidden">{t.short}</span>
                    <span className="hidden sm:inline">{t.label}</span>
                  </>
                ) : (
                  t.label
                )}
                {t.badge && (
                  <span className="rounded-[6px] bg-white px-1.5 py-px font-mono text-[10.5px] font-semibold leading-[1.5] text-black">{t.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {tabs.map((t) => (
        <div key={t.key} id={`rl-panel-${t.key}`} role="tabpanel" aria-labelledby={`rl-tab-${t.key}`} hidden={t.key !== active} className="min-w-0">
          {t.panel}
        </div>
      ))}
    </section>
  );
}
