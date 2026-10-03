"use client";

import { BarChart3, Globe2, Landmark, Lock, ScrollText } from "lucide-react";
import { DOMAINS } from "@/lib/domains";
import { useSegThumb } from "@/components/reviser/useSegThumb";

const ICONS = { BarChart3, ScrollText, Globe2, Landmark } as const;

// Onglets de domaines en contrôle segmenté. Les domaines pas encore ouverts
// portent un cadenas ; sur téléphone, tant qu'ils ne sont pas sélectionnés,
// ils n'affichent que leur icône (le nom reste lu par les lecteurs d'écran).
export function DomainTabs({ active, onChange, small = false }: { active: number; onChange: (i: number) => void; small?: boolean }) {
  const { refs, box } = useSegThumb(active);
  return (
    <div role="tablist" aria-label="Domaine" className="seg w-max" style={{ gridAutoColumns: "auto", padding: small ? 3 : undefined }}>
      <span
        aria-hidden
        className="seg-thumb"
        style={box ? { left: box.left, width: box.width, top: small ? 3 : undefined, bottom: small ? 3 : undefined } : { opacity: 0 }}
      />
      {DOMAINS.map((d, i) => {
        const Icon = ICONS[d.icon];
        const on = i === active;
        return (
          <button
            key={d.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(i)}
            title={d.ready ? undefined : `${d.name} : bientôt`}
            className={"seg-item gap-1.5 " + (small ? "px-2.5 py-1.5 text-[13px]" : "px-3 sm:px-4") + (on && !box ? " bg-surface" : "")}
          >
            <Icon size={small ? 14 : 15} className="shrink-0" />
            <span className={d.ready || on ? "" : "sr-only sm:not-sr-only"}>{d.name}</span>
            {!d.ready && <Lock size={12} className="shrink-0" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
