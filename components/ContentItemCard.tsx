"use client";

import Link from "next/link";
import { VisibilityBadge } from "@/components/ContentFolderBlocks";
import { normalizeVisibility } from "@/lib/content/visibility";
import { EditTagsAction } from "@/components/EditTagsAction";
import type { TagRow } from "@/components/TagMultiSelect";

type RelationConfig = {
  table: "document_tags" | "flashcard_set_tags" | "quiz_set_tags";
  itemColumn: "document_id" | "set_id" | "quiz_set_id";
};

export function ContentItemCard({
  itemId,
  href,
  title,
  visibility,
  openLabel,
  folderLabel,
  rootLabel,
  tags,
  allTags,
  relation
}: {
  itemId: string;
  href: string;
  title: string;
  visibility: string | null;
  openLabel: string;
  folderLabel: string;
  rootLabel: string;
  tags?: string[];
  allTags?: TagRow[];
  relation?: RelationConfig;
}) {
  const vis = normalizeVisibility(visibility);

  return (
    <div className="card-soft group relative p-4 transition hover:bg-white/[0.06]">
      <Link href={href} className="block">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{title}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <VisibilityBadge visibility={vis} />
              {folderLabel !== rootLabel ? (
                <span className="truncate text-xs opacity-60">{folderLabel}</span>
              ) : null}
            </div>

            {tags?.length && allTags?.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags
                  .map((id) => allTags.find((t) => t.id === id))
                  .filter(Boolean)
                  .slice(0, 4)
                  .map((tg: any) => (
                    <span key={tg.id} className="chip text-xs">
                      {tg.name}
                    </span>
                  ))}
                {tags.length > 4 ? <span className="text-xs opacity-60">+{tags.length - 4}</span> : null}
              </div>
            ) : null}
          </div>
          <span className="shrink-0 text-sm opacity-70 group-hover:opacity-100">{openLabel}</span>
        </div>
      </Link>

      {allTags && relation ? (
        <div className="absolute right-2 top-2">
          <EditTagsAction itemId={itemId} allTags={allTags} initial={tags ?? []} relation={relation} />
        </div>
      ) : null}
    </div>
  );
}
