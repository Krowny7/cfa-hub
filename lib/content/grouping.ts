export type FolderJoin = { library_folders?: { name: string | null } | null };

/**
 * Groups items by folder name, with a stable and locale-aware sort.
 * Items with no folder are grouped under `rootLabel`.
 */
export function groupByFolderName<T extends FolderJoin>(locale: string, items: T[], rootLabel: string) {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const folderName = (item.library_folders?.name ?? null) || rootLabel;
    if (!grouped.has(folderName)) grouped.set(folderName, []);
    grouped.get(folderName)!.push(item);
  }

  const folderNames = Array.from(grouped.keys()).sort((a, b) => {
    if (a === rootLabel) return -1;
    if (b === rootLabel) return 1;
    return a.localeCompare(b, locale);
  });

  return { grouped, folderNames };
}
