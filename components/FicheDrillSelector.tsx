"use client";

import { useState } from "react";
import { ListChecks, Lock } from "lucide-react";
import { QuizSetView } from "@/components/QuizSetView";
import type { QuizQuestion } from "@/lib/types";

export type DrillSet = {
  page: number;
  setId: string;
  title: string;
  isOwner: boolean;
  questions: QuizQuestion[];
};

export function FicheDrillSelector({ totalPages, drillSets }: { totalPages: number; drillSets: DrillSet[] }) {
  const byPage = new Map(drillSets.map((d) => [d.page, d]));
  const [selected, setSelected] = useState<number | null>(null);
  const active = selected !== null ? byPage.get(selected) ?? null : null;

  return (
    <div className="card p-5">
      <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
        <ListChecks size={15} /> Quiz de révision par page
      </div>
      <div className="mb-3 text-xs text-white/50">
        Chaque page de la fiche a son quiz : les concepts clés déclinés en plusieurs variantes,
        pour vérifier que tu maîtrises vraiment le sujet.
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          const has = byPage.has(page);
          const isActive = selected === page;
          return (
            <button
              key={page}
              type="button"
              disabled={!has}
              onClick={() => setSelected(isActive ? null : page)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${
                !has
                  ? "cursor-not-allowed border-white/[0.06] text-white/25"
                  : isActive
                  ? "border-blue-400/50 bg-blue-500/10 text-white"
                  : "border-white/10 text-white/70 hover:bg-white/[0.04]"
              }`}
            >
              {!has && <Lock size={11} />}
              Page {page}
            </button>
          );
        })}
      </div>

      {active && (
        <div className="mt-4 border-t border-white/[0.07] pt-4">
          <div className="mb-3 text-xs font-medium text-white/50">{active.title}</div>
          <QuizSetView setId={active.setId} isOwner={active.isOwner} initialQuestions={active.questions} />
        </div>
      )}
    </div>
  );
}
