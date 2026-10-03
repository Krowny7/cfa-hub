"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Globe2, Landmark, Lock, ScrollText } from "lucide-react";
import { Radar, RadarLegend } from "@/components/ui/Radar";
import { DOMAINS } from "@/lib/domains";
import { DomainTabs } from "@/components/reviser/DomainTabs";
import type { TopicStat } from "@/components/accueil/types";

const ICONS = { BarChart3, ScrollText, Globe2, Landmark } as const;

// Radar par domaine : un onglet par domaine (contrôle segmenté). Finance
// montre les 10 matières du CFA Niveau I, toi contre la moyenne des joueurs ;
// les domaines pas encore ouverts affichent un état « bientôt », sans chiffre.
export function DomainStats({ topics }: { topics: TopicStat[] }) {
  const [ix, setIx] = useState(0);
  const domain = DOMAINS[ix];
  const measured = topics.filter((t) => t.pct !== null).sort((a, b) => (b.pct as number) - (a.pct as number));
  const nStrong = Math.min(3, Math.ceil(measured.length / 2));
  const strong = measured.slice(0, nStrong);
  const weak = measured.slice(nStrong).reverse().slice(0, 3);
  const Icon = ICONS[domain.icon];

  return (
    <section className="card rl-lift flex h-full min-w-0 flex-col gap-4 p-[22px]" aria-label="Tes stats par domaine">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="max-w-full overflow-x-auto [scrollbar-width:none]">
          <DomainTabs active={ix} onChange={setIx} small />
        </div>
        {domain.ready && <RadarLegend />}
      </div>

      {domain.ready ? (
        <>
          <div className="flex flex-1 items-center">
            <Radar
              key={domain.key}
              axes={topics.map((t) => ({ label: t.code, me: t.pct, avg: t.avg }))}
              size={360}
              title={`${domain.name} : tes 10 matières face à la moyenne des joueurs`}
            />
          </div>
          {measured.length === 0 ? (
            <p className="text-[13px] text-muted">
              Fais une session d&apos;entraînement ciblé par matière (au moins 5 questions) pour dessiner ton radar.{" "}
              <Link href="/practice" className="font-semibold text-white underline underline-offset-2">
                Lancer une session
              </Link>
            </p>
          ) : (
            <div className="flex flex-wrap justify-between gap-2 text-[13px]">
              <span>
                <b>Forces :</b> {strong.map((t) => t.name).join(", ")}
              </span>
              {weak.length > 0 && (
                <span className="text-muted">
                  <b className="text-white">À travailler :</b>{" "}
                  {weak.map((t, i) => (
                    <span key={t.key}>
                      {i > 0 && ", "}
                      <Link href={`/practice?topic=${t.key}`} className="underline-offset-2 hover:underline">
                        {t.name}
                      </Link>
                    </span>
                  ))}
                </span>
              )}
            </div>
          )}
        </>
      ) : (
        <div key={domain.key} className="rl-in grid flex-1 place-items-center rounded-[14px] border border-dashed border-line-2 px-6 py-14 text-center">
          <div className="grid justify-items-center gap-2">
            <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-surface-2 text-muted">
              <Icon size={20} />
            </span>
            <div className="flex items-center gap-1.5 text-[17px] font-bold">
              {domain.name} <Lock size={14} className="text-muted" />
            </div>
            <p className="max-w-[340px] text-[13.5px] leading-[1.45] text-muted">
              Bientôt : le programme est en préparation. Ton radar {domain.name} et ton rang s&apos;allumeront à son ouverture.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
