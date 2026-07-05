import Link from "next/link";
import { ChevronDown } from "lucide-react";
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

  return (
    <div className="grid gap-3">
      {folderNames.map((folder) => {
        const folderItems = grouped.get(folder) ?? [];
        const isEmpty = folderItems.length === 0;

        if (isEmpty) {
          // Dossier préparé à l'avance, pas encore de contenu — pas de
          // <details>/chevron puisqu'il n'y a rien à déplier.
          return (
            <div key={folder} className="card p-5 opacity-60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-white/30">
                    {emptyLabel}
                  </div>
                  <div className="text-lg font-semibold tracking-tight">{folder}</div>
                </div>
              </div>
            </div>
          );
        }

        return (
          <details key={folder} className="group card card-hover overflow-hidden">
            <summary className="cursor-pointer list-none select-none p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-white/30">
                    {folderItems.length}{itemUnit ? ` ${itemUnit}` : ""}
                  </div>
                  <div className="text-lg font-semibold tracking-tight">{folder}</div>
                </div>
                <ChevronDown size={18} className="mt-0.5 shrink-0 text-white/20 transition-colors group-hover:text-white/50 group-open:rotate-180" />
              </div>
            </summary>

            <div className="border-t border-white/[0.07] p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {folderItems.map((it) => {
                  const vis = normalizeVisibility(it.visibility);
                  return (
                    <Link
                      key={it.id}
                      href={`${basePath}/${it.id}`}
                      className="card-soft card-hover group/item p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{it.title}</div>
                          <div className="mt-2 flex items-center gap-2">
                            <VisibilityBadge visibility={vis} />
                            {folder !== rootLabel ? (
                              <span className="truncate text-xs text-faint">{folder}</span>
                            ) : null}
                          </div>
                        </div>
                        <span className="mt-0.5 shrink-0 text-white/20 transition-colors group-hover/item:text-white/50">
                          →
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
