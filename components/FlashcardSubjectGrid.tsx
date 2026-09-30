import Link from "next/link";
import { groupByFolderName, type FolderJoin } from "@/lib/content/grouping";
import { normalizeVisibility } from "@/lib/content/visibility";
import { VisibilityBadge } from "@/components/ContentFolderBlocks";

type Item = FolderJoin & { id: string; title: string; visibility: string | null };

// Métadonnées d'affichage par matière — même ordre/couleurs que la grille
// /fiches, pour que les deux écrans se lisent comme un seul système. Le nom
// de dossier est celui réellement utilisé par les scripts de seed pour le
// contenu flashcards de cette matière (voir cfa-hub-flashcards-architecture
// en mémoire) ; une matière sans dossier reconnu retombe dans "À venir".
const SUBJECTS = [
  { folder: "Fixed Income (Système)", label: "Fixed Income", color: "blue" },
  { folder: "Instruments Dérivés (Système)", label: "Derivatives", color: "emerald" },
  { folder: "Equity (Système)", label: "Equity", color: "amber" },
  { folder: "Financial Statement Analysis (Système)", label: "Financial Statement Analysis", color: "violet" },
  { folder: "Portfolio Management (Système)", label: "Portfolio Management", color: "rose" },
] as const;

export function FlashcardSubjectGrid({
  locale,
  items,
  rootLabel,
  openLabel,
  basePath,
  itemUnit,
  selectedFolder,
}: {
  locale: string;
  items: Item[];
  rootLabel: string;
  openLabel: string;
  basePath: string;
  itemUnit: string;
  selectedFolder?: string;
}) {
  const allFolderNames = SUBJECTS.map((s) => s.folder);
  const { grouped } = groupByFolderName(locale, items, rootLabel, allFolderNames);

  if (selectedFolder) {
    const subject = SUBJECTS.find((s) => s.folder === selectedFolder);
    const setsInFolder = grouped.get(selectedFolder) ?? [];
    return (
      <div className="grid gap-4">
        <Link href={basePath} className="flex w-fit items-center gap-1.5 text-sm text-white/50 hover:text-white/80">
          ← Toutes les matières
        </Link>
        <h2 className="font-display text-lg font-medium tracking-tight">{subject?.label ?? selectedFolder}</h2>
        {setsInFolder.length === 0 ? (
          <p className="text-sm text-white/40">Aucun set pour l'instant.</p>
        ) : (
          <div className="grid gap-2">
            {setsInFolder.map((it) => {
              const vis = normalizeVisibility(it.visibility);
              return (
                <Link key={it.id} href={`${basePath}/${it.id}`} className="card-soft card-hover group/item p-3.5" title={openLabel}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{it.title}</div>
                      <div className="mt-1.5">
                        <VisibilityBadge visibility={vis} />
                      </div>
                    </div>
                    <span className="shrink-0 text-white/20 transition-colors group-hover/item:text-white/50">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const withContent = SUBJECTS.filter((s) => (grouped.get(s.folder)?.length ?? 0) > 0);
  const empty = SUBJECTS.filter((s) => (grouped.get(s.folder)?.length ?? 0) === 0);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {withContent.map((s) => {
          const count = grouped.get(s.folder)?.length ?? 0;
          return (
            <Link
              key={s.folder}
              href={`${basePath}?view=system&subject=${encodeURIComponent(s.folder)}`}
              className="card plate card-hover p-5 grid gap-3 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="kicker mb-1">
                    {count} {itemUnit}
                    {count > 1 ? "s" : ""}
                  </div>
                  <div className="font-display text-lg font-medium tracking-tight">{s.label}</div>
                </div>
                <span className="text-white/20 group-hover:text-white/50 transition-colors text-lg mt-0.5">→</span>
              </div>
              <p className="text-[13px] text-white/50 leading-relaxed">
                4 sets de 15 cartes couvrant les notions à plus fort rendement du programme.
              </p>
            </Link>
          );
        })}
      </div>

      {empty.length > 0 && (
        <div className="card p-4">
          <div className="kicker mb-2">À venir</div>
          <div className="grid gap-2 text-[13px] text-muted">
            {empty.map((s) => (
              <div key={s.folder} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                {s.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
