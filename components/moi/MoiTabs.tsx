"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart3, Bookmark, Settings2, Target } from "lucide-react";
import { MOI_TABS, parseMoiTab, type MoiTab } from "@/components/moi/data";

const META: Record<MoiTab, { label: string; Icon: typeof BarChart3 }> = {
  stats: { label: "Stats", Icon: BarChart3 },
  erreurs: { label: "Erreurs", Icon: Target },
  marquees: { label: "Marquées", Icon: Bookmark },
  reglages: { label: "Réglages", Icon: Settings2 },
};

// Onglets de l'espace Moi en contrôle segmenté : Stats | Erreurs | Marquées | Réglages.
// Liables avec ?onglet=… (l'URL suit l'onglet choisi, sans recharger) et
// avec les anciens liens #reglages. Les trois vues sont rendues par le
// serveur et seulement masquées : un formulaire en cours garde sa saisie.
export function MoiTabs({
  initial,
  panels,
  asides,
  counts,
}: {
  initial: MoiTab;
  panels: Record<MoiTab, React.ReactNode>;
  /** lien discret à droite des onglets, propre à chaque vue */
  asides?: Partial<Record<MoiTab, React.ReactNode>>;
  /** petit compteur à côté du libellé (ex. erreurs à revoir) */
  counts?: Partial<Record<MoiTab, number>>;
}) {
  const sp = useSearchParams();
  const [tab, setTab] = useState<MoiTab>(initial);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  // Lien interne vers ?onglet=… (navigation douce) : l'onglet suit l'URL.
  useEffect(() => {
    const t = parseMoiTab(sp.get("onglet"));
    if (t) setTab(t);
  }, [sp]);

  // Anciens liens /moi#reglages.
  useEffect(() => {
    const t = parseMoiTab(window.location.hash);
    if (t) setTab(t);
  }, []);

  function select(t: MoiTab, focus = false) {
    setTab(t);
    if (focus) refs.current[MOI_TABS.indexOf(t)]?.focus();
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("onglet", t);
      window.history.replaceState(null, "", url.pathname + url.search);
    } catch {
      // l'onglet change quand même
    }
  }

  function onKey(e: React.KeyboardEvent) {
    const i = MOI_TABS.indexOf(tab);
    const n = MOI_TABS.length;
    if (e.key === "ArrowRight") select(MOI_TABS[(i + 1) % n], true);
    else if (e.key === "ArrowLeft") select(MOI_TABS[(i - 1 + n) % n], true);
    else if (e.key === "Home") select(MOI_TABS[0], true);
    else if (e.key === "End") select(MOI_TABS[n - 1], true);
    else return;
    e.preventDefault();
  }

  const ix = MOI_TABS.indexOf(tab);
  const aside = asides?.[tab];

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div role="tablist" aria-label="Mon espace" onKeyDown={onKey} className="seg w-full sm:w-auto" style={{ gridTemplateColumns: `repeat(${MOI_TABS.length}, minmax(0, 1fr))` }}>
          <span
            aria-hidden
            className="seg-thumb"
            style={{ left: `calc(4px + ${ix} * (100% - 8px) / ${MOI_TABS.length})`, width: `calc((100% - 8px) / ${MOI_TABS.length})` }}
          />
          {MOI_TABS.map((t, i) => {
            const { label, Icon } = META[t];
            const on = t === tab;
            const n = counts?.[t];
            return (
              <button
                key={t}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`moi-tab-${t}`}
                aria-controls={`moi-panel-${t}`}
                aria-selected={on}
                tabIndex={on ? 0 : -1}
                onClick={() => select(t)}
                className="seg-item sm:px-5"
              >
                <Icon size={15} strokeWidth={on ? 2.2 : 1.8} aria-hidden />
                {label}
                {n ? <span className="font-mono text-[12px] font-semibold text-muted tabular-nums">{n}</span> : null}
              </button>
            );
          })}
        </div>
        {aside && <div className="ml-auto">{aside}</div>}
      </div>

      {MOI_TABS.map((t) => (
        <div key={t} role="tabpanel" id={`moi-panel-${t}`} aria-labelledby={`moi-tab-${t}`} hidden={t !== tab} className={t === tab ? "rl-in" : undefined}>
          {panels[t]}
        </div>
      ))}
    </div>
  );
}
