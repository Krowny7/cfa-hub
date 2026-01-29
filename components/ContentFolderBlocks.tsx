import Link from "next/link";
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
  basePath
}: {
  locale: string;
  items: T[];
  rootLabel: string;
  openLabel: string;
  basePath: string; // e.g. "/flashcards" | "/qcm" | "/library"
}) {
  const { grouped, folderNames } = groupByFolderName<T>(locale, items, rootLabel);

  return (
    <div className="grid gap-3">
      {folderNames.map((folder) => {
        const folderItems = grouped.get(folder) ?? [];
        return (
          <details key={folder} className="group card-soft">
            <summary className="cursor-pointer list-none select-none rounded-xl px-4 py-3 transition hover:bg-white/[0.06]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{folder}</div>
                  <div className="text-xs opacity-70">{folderItems.length}</div>
                </div>
                <div className="text-xs opacity-60 transition group-open:rotate-180">▼</div>
              </div>
            </summary>

            <div className="border-t border-white/10 p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {folderItems.map((it) => {
                  const vis = normalizeVisibility(it.visibility);
                  return (
                    <Link
                      key={it.id}
                      href={`${basePath}/${it.id}`}
                      className="card-soft group p-4 transition hover:bg-white/[0.06]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{it.title}</div>
                          <div className="mt-2 flex items-center gap-2">
                            <VisibilityBadge visibility={vis} />
                            {folder !== rootLabel ? (
                              <span className="truncate text-xs opacity-60">{folder}</span>
                            ) : null}
                          </div>
                        </div>
                        <span className="shrink-0 text-sm opacity-70 group-hover:opacity-100">{openLabel}</span>
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
