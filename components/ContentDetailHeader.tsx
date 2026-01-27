import type { ReactNode } from "react";
import Link from "next/link";
import { VisibilityBadge } from "@/components/ContentFolderBlocks";
import { normalizeVisibility, type Visibility } from "@/lib/content/visibility";

export function ContentDetailHeader({
  backHref,
  backLabel,
  title,
  visibility,
  folderName,
  rightSlot
}: {
  backHref: string;
  backLabel: string;
  title: string;
  visibility: Visibility | string | null | undefined;
  folderName?: string | null;
  rightSlot?: ReactNode;
}) {
  const v = normalizeVisibility(visibility);

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[220px]">
          <Link href={backHref} className="text-sm opacity-80 hover:underline">
            ← {backLabel}
          </Link>

          <h1 className="mt-2 text-2xl font-semibold">{title}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <VisibilityBadge visibility={v} />
            <div className="text-xs opacity-70">{folderName ? `📁 ${folderName}` : "📁 (root)"}</div>
          </div>
        </div>

        {rightSlot ? <div className="flex items-center gap-2">{rightSlot}</div> : null}
      </div>
    </div>
  );
}
