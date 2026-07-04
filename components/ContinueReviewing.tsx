"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { readRecentFlashcardSets, type RecentSetKind } from "@/components/RecentFlashcardSetTracker";
import { useI18n } from "@/components/I18nProvider";

type RecentEntry = { id: string; title: string; ts: number };

// Raccourci "reprendre où j'en étais" — basé sur l'historique local de
// consultation (localStorage), pas de backend nécessaire. N'affiche rien
// tant qu'il n'y a pas d'historique (première visite).
export function ContinueReviewing({
  kind = "flashcards",
  basePath = "/flashcards",
}: {
  kind?: RecentSetKind;
  basePath?: string;
}) {
  const { t } = useI18n();
  const [recent, setRecent] = useState<RecentEntry[] | null>(null);

  useEffect(() => {
    setRecent(readRecentFlashcardSets(kind));
  }, [kind]);

  if (!recent || recent.length === 0) return null;

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <RotateCcw size={15} className="text-emerald-300" />
        {kind === "qcm"
          ? t("qcm.continueReviewing")
          : kind === "exercises"
          ? t("exercises.continueReviewing")
          : t("flashcards.continueReviewing")}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {recent.map((entry) => (
          <Link
            key={entry.id}
            href={`${basePath}/${entry.id}`}
            className="shrink-0 rounded-xl border border-white/[0.10] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white/80 hover:border-emerald-400/30 hover:text-emerald-200 transition-colors max-w-[220px]"
          >
            <div className="truncate">{entry.title}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
