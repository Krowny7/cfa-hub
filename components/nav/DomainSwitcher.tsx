"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart3, Check, ChevronDown, Globe2, Landmark, Lock, Plus, ScrollText } from "lucide-react";
import { CURRENT_DOMAIN, CURRENT_PROGRAM, DOMAINS } from "@/lib/domains";

const ICONS = { BarChart3, ScrollText, Globe2, Landmark } as const;

// Sélecteur Domaine → programme de la barre du haut. Seul Finance · CFA
// Niveau I est ouvert : les autres domaines sont listés « bientôt », pour que
// la structure du site soit déjà en place.
export function DomainSwitcher({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const Icon = ICONS[CURRENT_DOMAIN.icon];

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
        aria-label="Changer de domaine"
        className="icon-btn flex w-auto items-center gap-2 pl-[7px] pr-2.5 text-[13px] font-semibold tracking-[-0.006em]"
      >
        <span className="grid h-6 w-6 place-items-center rounded-[7px] bg-white text-black shadow-[inset_0_1px_0_rgba(255,255,255,.14)]">
          <Icon size={14} strokeWidth={2.2} />
        </span>
        {compact ? CURRENT_PROGRAM.short : CURRENT_DOMAIN.name}
        {!compact && <span className="font-medium text-muted">{CURRENT_PROGRAM.name}</span>}
        <ChevronDown size={14} strokeWidth={2.2} className={"text-muted transition-transform duration-300 " + (open ? "rotate-180" : "")} />
      </button>
      {open && (
        <div role="menu" className="menu absolute left-0 top-[calc(100%+8px)] origin-top-left z-[60] w-[300px]">
          <div className="t-eyebrow px-2.5 pb-1.5 pt-2">Domaines</div>
          {DOMAINS.map((d) => {
            const DIcon = ICONS[d.icon];
            const current = d.key === CURRENT_DOMAIN.key;
            return (
              <div key={d.key} role="menuitem" aria-disabled={!d.ready} data-active={current} className={"menu-item cursor-default gap-2.5 " + (current ? "" : "hover:bg-transparent")}>
                <span className={"grid h-7 w-7 place-items-center rounded-[8px] " + (d.ready ? "bg-white text-black" : "bg-surface-2 text-muted")}>
                  <DIcon size={15} strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className={"text-sm font-semibold " + (d.ready ? "" : "text-muted")}>{d.name}</div>
                  <div className="text-xs font-normal text-muted">{d.ready ? d.programs.filter((p) => p.ready).map((p) => p.name).join(" · ") : "bientôt"}</div>
                </div>
                {current ? <Check size={16} strokeWidth={2.4} /> : <Lock size={14} className="text-muted" />}
              </div>
            );
          })}
          <div className="menu-sep" />
          <div className="flex items-center gap-2.5 px-2.5 py-2 text-[12.5px] text-muted">
            <Plus size={15} />
            D&apos;autres domaines et programmes arrivent
          </div>
        </div>
      )}
    </div>
  );
}
