"use client";

import { useState } from "react";
import { BarChart3, Globe2, Landmark, ScrollText } from "lucide-react";
import { DOMAINS } from "@/lib/domains";
import { DomainTabs } from "@/components/reviser/DomainTabs";

const ICONS = { BarChart3, ScrollText, Globe2, Landmark } as const;

// En-tête d'un espace (Réviser, S'entraîner) : petite ligne, grand titre et
// onglets de domaines. Finance montre le contenu (children) ; les domaines
// pas encore ouverts affichent un état « bientôt », sans rien inventer.
export function DomainSpace({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  const [ix, setIx] = useState(0);
  const domain = DOMAINS[ix];
  const Icon = ICONS[domain.icon];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2.5">
          <span className="text-[14px] font-semibold text-muted">{kicker}</span>
          <h1 className="rl-hero rl-in m-0 font-sans text-[clamp(36px,5.4vw,60px)] font-extrabold leading-none tracking-[-0.035em] [text-wrap:balance]">{title}</h1>
        </div>
        <div className="max-w-full overflow-x-auto [scrollbar-width:none]">
          <DomainTabs active={ix} onChange={setIx} />
        </div>
      </div>

      {domain.ready ? (
        children
      ) : (
        <section key={domain.key} className="rl-in grid place-items-center rounded-[18px] border-[1.5px] border-dashed border-line-2 px-6 py-20 text-center" aria-label={domain.name}>
          <div className="grid justify-items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-[13px] bg-surface-2 text-muted">
              <Icon size={22} />
            </span>
            <div className="flex items-center gap-2 text-[22px] font-extrabold tracking-[-0.02em]">
              {domain.name} <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-[12px] font-semibold text-muted">bientôt</span>
            </div>
            <p className="max-w-[420px] text-[14.5px] leading-[1.5] text-muted">
              Le programme est en préparation. Fiches, cours, entraînement et un rang propre au domaine arriveront à son ouverture.
            </p>
            <button type="button" onClick={() => setIx(0)} className="btn btn-secondary rl-press mt-2">
              Revenir à Finance
            </button>
          </div>
        </section>
      )}
    </>
  );
}
