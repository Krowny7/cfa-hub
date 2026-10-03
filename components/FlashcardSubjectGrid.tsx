import type { FolderJoin } from "@/lib/content/grouping";
import { SubjectBrowser } from "@/components/ContentFolderBlocks";
import { groupBySubject, subjectFromParam, type BrowserGroup, type ItemMeta } from "@/components/ContentDetailHeader";

type Item = FolderJoin & { id: string; title: string; visibility: string | null };

/** Les sets Système rangés par matière (les 10 matières, vides = « bientôt »). */
export function flashcardGroups(items: Item[], counts: Record<string, number> = {}): BrowserGroup[] {
  const meta: Record<string, ItemMeta> = {};
  for (const [id, count] of Object.entries(counts)) meta[id] = { count };
  return groupBySubject(
    items.map((it) => ({ id: it.id, title: it.title, folder: it.library_folders?.name ?? null, visibility: it.visibility })),
    meta
  );
}

// Les flashcards Système, par matière : la matière choisie (?subject=fsa,
// ou l'ancien nom de dossier « Financial Statement Analysis (Système) »)
// s'ouvre directement. La progression de chaque set vient de la répétition
// espacée enregistrée dans le navigateur. Composant serveur sans requête.
export function FlashcardSubjectGrid({
  items,
  counts,
  basePath,
  selectedFolder,
}: {
  locale?: string;
  items: Item[];
  /** nombre de cartes par set */
  counts?: Record<string, number>;
  rootLabel?: string;
  openLabel?: string;
  basePath: string;
  itemUnit?: string;
  selectedFolder?: string;
}) {
  const groups = flashcardGroups(items, counts);
  const initialKey = subjectFromParam(selectedFolder)?.key ?? (selectedFolder && groups.some((g) => g.key === selectedFolder) ? selectedFolder : null);

  return (
    <SubjectBrowser
      groups={groups}
      basePath={basePath}
      unit={["carte", "cartes"]}
      setUnit={["set", "sets"]}
      setLabel="Sets"
      initialKey={initialKey}
      syncParam="subject"
      srs
      progressLabel="vues"
      emptyLabel="Les cartes de cette matière sont en préparation."
      note="Ta répétition espacée est enregistrée sur cet appareil : les cartes à revoir passent en premier."
    />
  );
}
