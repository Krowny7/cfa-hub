"use client";

import { useState } from "react";
import { BarChart3, Globe2, Landmark, ScrollText } from "lucide-react";
import { DOMAINS } from "@/lib/domains";
import { DomainTabs } from "@/components/reviser/DomainTabs";

const ICONS = { BarChart3, ScrollText, Globe2, Landmark } as const;

// Squelette d'un espace (Réviser, S'entraîner) : une ligne de contexte
// (espace · programme), le grand titre et les onglets de domaines. `lead`
// suit le titre de près (le point focal) ; `children` vient ensuite, au
// rythme des grandes sections (.rl-page). Les domaines pas encore ouverts
// affichent un état « bientôt », sans rien inventer.
export function DomainSpace({
  kicker,
  title,
  lead,
  children,
}: {
  kicker: string;
  title: string;
  lead: React.ReactNode;
  children?: React.ReactNode;
}) {
  const [ix, setIx] = useState(0);
  const domain = DOMAINS[ix];
  const Icon = ICONS[domain.icon];
  const program = domain.programs.find((p) => p.ready);
  const later = domain.programs.filter((p) => !p.ready);

  return (
    <div className="rl-wide rl-page">
      <div className="flex flex-col gap-7 md:gap-10">
        <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div className="flex min-w-0 flex-col gap-3">
            <p className="t-small font-semibold">
              {kicker} · {program ? program.name : domain.name}
              {later.length > 0 && <span className="text-faint font-medium"> · {later.map((p) => p.name.replace(/^CFA /, "")).join(", ")} bientôt</span>}
            </p>
            <h1 className="t-hero rl-in m-0">{title}</h1>
          </div>
          <div className="max-w-full overflow-x-auto [scrollbar-width:none]">
            <DomainTabs active={ix} onChange={setIx} small />
          </div>
        </header>

        {domain.ready ? (
          lead
        ) : (
          <section key={domain.key} className="card-quiet rl-in grid place-items-center px-6 py-20 text-center" aria-label={domain.name}>
            <div className="grid justify-items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-[13px] bg-surface text-muted">
                <Icon size={22} />
              </span>
              <h2 className="t-h2 m-0 flex items-center gap-2">
                {domain.name} <span className="rounded-lg bg-surface px-2 py-0.5 text-[12px] font-semibold text-muted">bientôt</span>
              </h2>
              <p className="t-small max-w-[400px]">Le programme est en préparation : fiches, cours, entraînement et un rang propre au domaine arriveront à son ouverture.</p>
              <button type="button" onClick={() => setIx(0)} className="btn btn-secondary rl-press mt-2">
                Revenir à Finance
              </button>
            </div>
          </section>
        )}
      </div>

      {domain.ready && children}
    </div>
  );
}
