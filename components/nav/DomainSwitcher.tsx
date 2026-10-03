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
        className="rl-press flex h-[38px] items-center gap-2 rounded-[12px] border border-line-2 bg-surface pl-2 pr-2.5 text-[13px] font-semibold"
      >
        <span className="grid h-6 w-6 place-items-center rounded-[7px] bg-white text-black">
          <Icon size={14} strokeWidth={2.2} />
        </span>
        {compact ? CURRENT_PROGRAM.short : CURRENT_DOMAIN.name}
        {!compact && <span className="font-medium text-muted">· {CURRENT_PROGRAM.name}</span>}
        <ChevronDown size={15} className={"transition-transform " + (open ? "rotate-180" : "")} />
      </button>
      {open && (
        <div role="menu" className="rl-in absolute left-0 top-[calc(100%+8px)] z-[60] w-[300px] rounded-2xl border border-line bg-surface p-2" style={{ boxShadow: "var(--shadow-2)", animationDuration: ".3s" }}>
          {DOMAINS.map((d) => {
            const DIcon = ICONS[d.icon];
            const current = d.key === CURRENT_DOMAIN.key;
            return (
              <div key={d.key} role="menuitem" aria-disabled={!d.ready} className={"flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 " + (current ? "bg-surface-2" : "")}>
                <span className={"grid h-7 w-7 place-items-center rounded-[8px] " + (d.ready ? "bg-white text-black" : "bg-surface-2 text-muted")}>
                  <DIcon size={15} strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className={"text-sm font-semibold " + (d.ready ? "" : "text-muted")}>{d.name}</div>
                  <div className="text-xs text-muted">{d.ready ? d.programs.filter((p) => p.ready).map((p) => p.name).join(" · ") : "bientôt"}</div>
                </div>
                {current ? <Check size={16} strokeWidth={2.4} /> : <Lock size={14} className="text-muted" />}
              </div>
            );
          })}
          <div className="mx-1.5 my-1 h-px bg-line" />
          <div className="flex items-center gap-2.5 px-2.5 py-2 text-[13px] text-muted">
            <Plus size={15} />
            D&apos;autres domaines et programmes arrivent
          </div>
        </div>
      )}
    </div>
  );
}
