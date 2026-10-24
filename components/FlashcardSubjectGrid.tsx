import type { FolderJoin } from "@/lib/content/grouping";
import { SubjectBrowser } from "@/components/ContentFolderBlocks";
import { AppelMatiere } from "@/components/flashcards/Panneaux";
import { cleMatiere, cleSet, type EtatListe } from "@/lib/flashcards/progression";
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

/**
 * Les paquets d'une seule matière (la demandée par ?subject=, sinon la
 * première qui en a), pour la liste /flashcards : l'index du programme
 * choisit la matière, cette section montre ses paquets. Renvoie le nom de la
 * matière avec la liste, ou null si aucun paquet n'existe.
 */
export function flashcardPaquets(items: Item[], counts: Record<string, number>, selectedFolder?: string): { name: string; groups: BrowserGroup[] } | null {
  const groups = flashcardGroups(items, counts);
  const key = subjectFromParam(selectedFolder)?.key ?? (selectedFolder && groups.some((g) => g.key === selectedFolder) ? selectedFolder : null);
  const g = (key ? groups.find((x) => x.key === key && x.rows.length > 0) : null) ?? groups.find((x) => x.rows.length > 0);
  return g ? { name: g.name, groups: [g] } : null;
}

/** Les paquets d'une matière qui entrent dans sa révision d'un bloc (/flashcards/matiere/<clé>). */
export function paquetsDeMatiere(g: BrowserGroup | null | undefined): BrowserGroup["rows"] {
  return g && !g.key.startsWith("x-") ? g.rows.filter((r) => r.kind === "set") : [];
}

/**
 * Les paquets d'une matière, avec en tête l'appel « Réviser toute la
 * matière » (/flashcards/matiere/<clé> : les paquets d'un bloc, en boucle).
 * `etats` : où en est chaque boucle, par clé « set:<id> » ou
 * « matiere:<clé> » (lu par le serveur, puis relu sur l'appareil ; absent :
 * rien n'est affiché).
 */
export function FlashcardPaquets({ groups, basePath, etats = {} }: { groups: BrowserGroup[]; basePath: string; etats?: Record<string, EtatListe> }) {
  const g = groups.length === 1 ? groups[0] : null;
  const paquets = paquetsDeMatiere(g);
  const cartes = paquets.reduce((n, r) => n + (r.count ?? 0), 0);
  const parPaquet: Record<string, EtatListe> = {};
  for (const gr of groups) for (const r of gr.rows) if (etats[cleSet(r.id)]) parPaquet[r.id] = etats[cleSet(r.id)];
  return (
    <div className="grid gap-4 md:gap-5">
      {g && paquets.length > 0 && <AppelMatiere cle={g.key} cartes={cartes} paquets={paquets.length} etat={etats[cleMatiere(g.key)] ?? null} />}
      <PaquetsListe groups={groups} basePath={basePath} etats={parPaquet} />
    </div>
  );
}

function PaquetsListe({ groups, basePath, etats }: { groups: BrowserGroup[]; basePath: string; etats: Record<string, EtatListe> }) {
  return (
    <SubjectBrowser
      groups={groups}
      basePath={basePath}
      etats={etats}
      unit={["carte", "cartes"]}
      setUnit={["set", "sets"]}
      setLabel="Sets"
      srs
      progressLabel="vues"
      emptyLabel="Les cartes de cette matière sont en préparation."
      note="Ta répétition espacée est enregistrée sur cet appareil : les cartes à revoir passent en premier."
    />
  );
}
