"use client";

import { useState } from "react";
import Link from "next/link";
import { Folder, FolderOpen, ChevronRight } from "lucide-react";
import { groupByFolderName, type FolderJoin } from "@/lib/content/grouping";
import { normalizeVisibility, type Visibility } from "@/lib/content/visibility";

type BaseItem = FolderJoin & {
  id: string;
  title: string;
  visibility: string | null;
};

function labelForVisibility(v: Visibility) {
  switch (v) {
    case "private":
      return "PRIVATE";
    case "public":
      return "PUBLIC";
    case "group":
      return "GROUP";
    case "groups":
      return "GROUPS";
  }
}

export function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  const label = labelForVisibility(visibility);
  const cls =
    visibility === "private" ? "badge-private" : visibility === "public" ? "badge-public" : "badge-shared";

  return <span className={`badge ${cls}`}>{label}</span>;
}

export function SectionHeader({
  title,
  subtitle,
  count,
  tone
}: {
  title: string;
  subtitle: string;
  count: number;
  tone: "private" | "shared" | "public";
}) {
  const accent =
    tone === "private"
      ? "border-l-2 border-l-white/30"
      : tone === "shared"
      ? "border-l-2 border-l-blue-400/70"
      : "border-l-2 border-l-emerald-400/70";

  return (
    <div className={`card-soft ${accent} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-1 text-xs opacity-70">{subtitle}</div>
        </div>
        <div className="text-xs opacity-70">{count}</div>
      </div>
    </div>
  );
}

// Arborescence latérale : dossiers dans une colonne fixe à gauche (style
// Notion/VS Code), contenu du dossier sélectionné à droite. Remplace
// l'ancien pattern en accordéons empilés (details/summary), qui poussait
// la page à des hauteurs ingérables dès que plusieurs dossiers étaient
// dépliés. Les dossiers vides (extraFolderNames pas encore peuplés)
// apparaissent grisés et non cliquables dans la même liste, plutôt que
// dans un bloc "À venir" séparé.
export function FolderBlocks<T extends BaseItem>({
  locale,
  items,
  rootLabel,
  openLabel,
  basePath,
  itemUnit = "",
  extraFolderNames = [],
  emptyLabel = "À venir",
}: {
  locale: string;
  items: T[];
  rootLabel: string;
  openLabel: string;
  basePath: string;
  itemUnit?: string;
  extraFolderNames?: string[];
  emptyLabel?: string;
}) {
  const { grouped, folderNames } = groupByFolderName<T>(locale, items, rootLabel, extraFolderNames);
  const defaultFolder = folderNames.find((f) => (grouped.get(f)?.length ?? 0) > 0) ?? null;
  const [active, setActive] = useState<string | null>(defaultFolder);

  if (folderNames.length === 0) return null;

  const selected = active ?? defaultFolder;
  const selectedItems = selected ? grouped.get(selected) ?? [] : [];

  return (
    <div className="flex h-[380px] flex-col overflow-hidden rounded-2xl border border-white/10 sm:flex-row">
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/[0.07] bg-white/[0.02] p-2 [scrollbar-width:none] sm:w-56 sm:flex-col sm:gap-0.5 sm:overflow-x-visible sm:overflow-y-auto sm:border-b-0 sm:border-r [&::-webkit-scrollbar]:hidden">
        {folderNames.map((folder) => {
          const count = grouped.get(folder)?.length ?? 0;
          const isSelected = folder === selected;
          const isEmpty = count === 0;
          return (
            <button
              key={folder}
              type="button"
              disabled={isEmpty}
              onClick={() => setActive(folder)}
              title={isEmpty ? emptyLabel : undefined}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-2 text-left text-sm transition-colors sm:w-full sm:whitespace-normal ${
                isSelected
                  ? "bg-blue-500/15 text-blue-200"
                  : isEmpty
                  ? "cursor-default text-white/25"
                  : "text-white/70 hover:bg-white/[0.05] hover:text-white/90"
              }`}
            >
              {isSelected ? (
                <FolderOpen size={15} className="shrink-0 text-blue-300" />
              ) : (
                <Folder size={15} className={`shrink-0 ${isEmpty ? "text-white/20" : "text-white/40"}`} />
              )}
              <span className="truncate">{folder}</span>
              <span className={`ml-auto shrink-0 text-xs ${isSelected ? "text-blue-300" : "text-white/30"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto p-4">
        {selected ? (
          <>
            <div className="mb-3 flex items-center gap-1.5 text-xs text-white/40">
              <span className="truncate">{selected}</span>
              <ChevronRight size={12} className="shrink-0" />
              <span className="shrink-0">
                {selectedItems.length}
                {itemUnit ? ` ${itemUnit}` : ""}
              </span>
            </div>

            {selectedItems.length === 0 ? (
              <p className="text-sm text-white/40">{emptyLabel}</p>
            ) : (
              <div className="grid gap-2">
                {selectedItems.map((it) => {
                  const vis = normalizeVisibility(it.visibility);
                  return (
                    <Link
                      key={it.id}
                      href={`${basePath}/${it.id}`}
                      className="card-soft card-hover group/item p-3.5"
                      title={openLabel}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{it.title}</div>
                          <div className="mt-1.5">
                            <VisibilityBadge visibility={vis} />
                          </div>
                        </div>
                        <span className="shrink-0 text-white/20 transition-colors group-hover/item:text-white/50">
                          →
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-white/40">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}
