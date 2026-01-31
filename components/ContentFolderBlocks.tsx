import { ContentItemCard } from "@/components/ContentItemCard";
import type { TagRow } from "@/components/TagMultiSelect";
import { groupByFolderName, type FolderJoin } from "@/lib/content/grouping";
import { normalizeVisibility, type Visibility } from "@/lib/content/visibility";

type BaseItem = FolderJoin & {
  id: string;
  title: string;
  visibility: string | null;
  tag_ids?: string[] | null;
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
  const border =
    tone === "private"
      ? "border-white/10"
      : tone === "shared"
      ? "border-blue-400/25"
      : "border-emerald-400/25";

  const bg =
    tone === "private"
      ? "bg-white/0"
      : tone === "shared"
      ? "bg-blue-400/5"
      : "bg-emerald-400/5";

  return (
    <div className={`card-soft ${border} ${bg} p-4`}>
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
  allTags,
  tagRelation
}: {
  locale: string;
  items: T[];
  rootLabel: string;
  openLabel: string;
  basePath: string; // e.g. "/flashcards" | "/qcm" | "/library"
  allTags?: TagRow[];
  tagRelation?: {
    table: "document_tags" | "flashcard_set_tags" | "quiz_set_tags";
    itemColumn: "document_id" | "set_id" | "quiz_set_id";
  };
}) {
  // folderNames are user-facing labels; folderIds are stable keys
  const { grouped, folderNames, folderIds } = groupByFolderName<T>(locale, items, rootLabel);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {folderIds.map((folderId, idx) => {
        const group = grouped.get(folderId);
        const folderLabel = folderNames[idx] ?? rootLabel;
        const folderItems = group?.items ?? [];
        return (
          <details key={folderId} className="group card-soft h-full">
            <summary className="cursor-pointer list-none select-none rounded-xl px-4 py-3 transition hover:bg-white/[0.06]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 opacity-70">📁</span>
                    <div className="truncate text-sm font-semibold">{folderLabel}</div>
                  </div>
                  <div className="text-xs opacity-70">{folderItems.length}</div>
                </div>
                <div className="text-sm opacity-60 transition group-open:rotate-180">▼</div>
              </div>
            </summary>

            <div className="border-t border-white/10 p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {folderItems.map((it) => (
                  <ContentItemCard
                    key={it.id}
                    itemId={it.id}
                    href={`${basePath}/${it.id}`}
                    title={it.title}
                    visibility={it.visibility}
                    openLabel={openLabel}
                    folderLabel={folderLabel}
                    rootLabel={rootLabel}
                    tags={(it.tag_ids ?? []) as any}
                    allTags={allTags}
                    relation={tagRelation as any}
                  />
                ))}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
