import Link from "next/link";
import { Folder, ChevronDown, ArrowRight } from "lucide-react";
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
}: {
  locale: string;
  items: T[];
  rootLabel: string;
  openLabel: string;
  basePath: string;
  itemUnit?: string;
}) {
  const { grouped, folderNames } = groupByFolderName<T>(locale, items, rootLabel);

  return (
    <div className="grid gap-3">
      {folderNames.map((folder) => {
        const folderItems = grouped.get(folder) ?? [];
        return (
          <details key={folder} className="group card-soft overflow-hidden">
            <summary className="flex cursor-pointer list-none select-none items-center gap-3 px-4 py-3.5 transition hover:bg-white/[0.06]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
                <Folder size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{folder}</div>
              </div>
              <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-muted">
                {folderItems.length}{itemUnit ? ` ${itemUnit}` : ""}
              </span>
              <ChevronDown size={16} className="shrink-0 text-white/40 transition group-open:rotate-180" />
            </summary>

            <div className="border-t border-white/[0.07] p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {folderItems.map((it) => {
                  const vis = normalizeVisibility(it.visibility);
                  return (
                    <Link
                      key={it.id}
                      href={`${basePath}/${it.id}`}
                      className="card-soft group/item p-4 transition hover:border-white/20 hover:bg-white/[0.06]"
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
                        <ArrowRight size={15} className="mt-0.5 shrink-0 text-white/40 transition group-hover/item:translate-x-0.5 group-hover/item:text-white/80" />
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
