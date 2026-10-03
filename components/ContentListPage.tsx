import Link from "next/link";
import { BookOpen, LineChart, Plus, Search, Sparkles, Users } from "lucide-react";
import { t } from "@/lib/i18n/core";
import type { Locale } from "@/lib/i18n/core";
import { FolderBlocks } from "@/components/ContentFolderBlocks";
import type { ItemMeta } from "@/components/ContentDetailHeader";
import type { ContentView, ScopeFilter } from "@/lib/content/visibility";
import type { ReactNode } from "react";

export type ContentSetRow = {
  id: string;
  title: string;
  visibility: string | null;
  created_at: string | null;
  subject?: string | null;
  library_folders?: { name: string | null } | null;
};

type Unit = [string, string];

// Squelette partagé entre /qcm et /flashcards. En haut : l'espace, le grand
// titre et un contrôle segmenté Système | Communauté ; juste dessous, le
// point focal (« Reprendre », fourni par la page). Puis le contenu :
// - Système : le contenu vérifié par l'équipe, rangé par matière ;
// - Communauté : ce que les utilisateurs créent (tous / privés / groupes /
//   publics), avec une recherche, rangé par dossier.
// Composant sans requête : la page charge, l'aperçu fournit des exemples.
export function ContentListPage({
  locale,
  basePath,
  kicker,
  title,
  titleKey,
  i18nPrefix,
  view,
  scope,
  q,
  all,
  priv,
  shared,
  pub,
  cfaItems,
  personalItems,
  displayItems,
  itemUnit,
  unit,
  setUnit,
  meta,
  continueReviewingSlot,
  creatorSlot,
  systemSlot,
  systemCount,
}: {
  locale: Locale;
  basePath: string;
  /** ligne de contexte au-dessus du titre (« S'entraîner · CFA Niveau I ») */
  kicker?: string;
  /** grand titre ; par défaut, la traduction de titleKey */
  title?: string;
  titleKey: string;
  i18nPrefix: string;
  view: ContentView;
  scope: ScopeFilter;
  q: string;
  all: ContentSetRow[];
  priv: ContentSetRow[];
  shared: ContentSetRow[];
  pub: ContentSetRow[];
  cfaItems: ContentSetRow[];
  personalItems: ContentSetRow[];
  displayItems: ContentSetRow[];
  itemUnit: string;
  /** unité du contenu d'un élément (« question », « carte ») */
  unit?: Unit;
  /** unité d'un élément (« QCM », « set ») */
  setUnit?: Unit;
  meta?: Record<string, ItemMeta>;
  continueReviewingSlot: ReactNode;
  creatorSlot?: ReactNode;
  systemSlot?: ReactNode;
  systemCount: number;
}) {
  const noFolder = t(locale, "common.noFolder");
  const scopeLink = (v: string) => `${basePath}?view=community&scope=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const viewLink = (v: ContentView) => `${basePath}?view=${v}${q && v === "community" ? `&q=${encodeURIComponent(q)}` : ""}`;

  const views = [
    { key: "system" as const, label: "Système", Icon: Sparkles, n: systemCount },
    { key: "community" as const, label: "Communauté", Icon: Users, n: all.length },
  ];
  const ix = view === "system" ? 0 : 1;

  const scopes = [
    { key: "all", label: t(locale, "common.all"), n: all.length },
    { key: "private", label: t(locale, "content.sectionPrivate"), n: priv.length },
    { key: "shared", label: t(locale, "content.sectionShared"), n: shared.length },
    { key: "public", label: t(locale, "content.sectionPublic"), n: pub.length },
  ];

  const folders = (items: ContentSetRow[]) => (
    <FolderBlocks
      items={items}
      rootLabel={noFolder}
      basePath={basePath}
      itemUnit={itemUnit}
      unit={unit}
      setUnit={setUnit}
      meta={meta}
    />
  );

  return (
    <div className="rl-wide rl-page">
      <div className="flex flex-col gap-7 md:gap-10">
        <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div className="flex min-w-0 flex-col gap-3">
            {kicker && <p className="t-small font-semibold">{kicker}</p>}
            <h1 className="t-hero rl-in m-0">{title ?? t(locale, titleKey)}</h1>
          </div>
          <nav
            aria-label="Contenus"
            className="seg w-full sm:w-auto"
            style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
          >
            <span
              aria-hidden
              className="seg-thumb"
              style={{ left: `calc(4px + ${ix} * (100% - 8px) / 2)`, width: "calc((100% - 8px) / 2)" }}
            />
            {views.map(({ key, label, Icon, n }) => (
              <Link
                key={key}
                href={viewLink(key)}
                scroll={false}
                className="seg-item px-4 text-[13.5px]"
                aria-current={view === key ? "page" : undefined}
              >
                <Icon size={15} strokeWidth={view === key ? 2.2 : 1.8} aria-hidden />
                {label}
                <span className="font-mono text-[12px] font-medium tabular-nums text-muted">{n}</span>
              </Link>
            ))}
          </nav>
        </header>

        {continueReviewingSlot}
      </div>

      {view === "system" ? (
        systemSlot ?? (
          <div className="card-quiet grid place-items-center px-6 py-16 text-center">
            <p className="t-small">{t(locale, `${i18nPrefix}.empty`)}</p>
          </div>
        )
      ) : (
        <section className="rl-section" aria-label="Communauté">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <nav
              aria-label="Filtrer par visibilité"
              className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
            >
              {scopes.map((s) => {
                const on = scope === s.key;
                return (
                  <Link
                    key={s.key}
                    href={scopeLink(s.key)}
                    scroll={false}
                    aria-current={on ? "page" : undefined}
                    className={"chip chip-sm shrink-0" + (on ? " chip-active" : "")}
                  >
                    {s.label}
                    <span className={"font-mono text-[11.5px] tabular-nums " + (on ? "opacity-70" : "text-muted")}>{s.n}</span>
                  </Link>
                );
              })}
            </nav>

            <form className="flex w-full gap-2 lg:w-auto" action={basePath} method="get" role="search">
              <label className="relative min-w-0 flex-1 lg:w-[300px] lg:flex-none">
                <span className="sr-only">{t(locale, `${i18nPrefix}.searchPlaceholder`)}</span>
                <Search size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input name="q" defaultValue={q} placeholder={t(locale, `${i18nPrefix}.searchPlaceholder`)} className="input pl-10" />
              </label>
              <input type="hidden" name="view" value="community" />
              <input type="hidden" name="scope" value={scope} />
              <button type="submit" className="btn btn-secondary shrink-0">
                {t(locale, "common.filter")}
              </button>
              {(q || scope !== "all") && (
                <Link href={`${basePath}?view=community`} scroll={false} className="btn btn-ghost shrink-0">
                  Effacer
                </Link>
              )}
            </form>
          </div>

          {creatorSlot && (
            <details className="group">
              <summary className="btn btn-secondary w-fit cursor-pointer list-none">
                <Plus size={16} aria-hidden /> {locale === "fr" ? "Créer" : "Create"}
              </summary>
              <div className="card mt-4 p-6 md:p-7">{creatorSlot}</div>
            </details>
          )}

          {displayItems.length === 0 ? (
            <div className="card-quiet mt-2 grid place-items-center gap-2 px-6 py-16 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-[13px] bg-surface text-muted">
                <Users size={20} aria-hidden />
              </span>
              <p className="t-h3 m-0 mt-1">{q ? "Rien ne correspond" : "Rien ici pour l'instant"}</p>
              <p className="t-small max-w-[380px]">
                {q ? `Aucun résultat pour « ${q} ».` : "Les contenus créés et partagés par les membres apparaîtront ici."}
              </p>
              <Link href={viewLink("system")} scroll={false} className="btn btn-secondary btn-sm mt-3">
                Voir le contenu Système
              </Link>
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-12">
              {cfaItems.length > 0 && (
                <div className="flex flex-col gap-4">
                  {personalItems.length > 0 && (
                    <h2 className="t-h3 m-0 flex items-center gap-2">
                      <LineChart size={16} aria-hidden className="text-muted" />
                      {t(locale, "subject.cfa")}
                      <span className="t-micro font-mono tabular-nums">{cfaItems.length}</span>
                    </h2>
                  )}
                  {folders(cfaItems)}
                </div>
              )}
              {personalItems.length > 0 && (
                <div className="flex flex-col gap-4">
                  <h2 className="t-h3 m-0 flex items-center gap-2">
                    <BookOpen size={16} aria-hidden className="text-muted" />
                    {t(locale, "subject.personal")}
                    <span className="t-micro font-mono tabular-nums">{personalItems.length}</span>
                  </h2>
                  {folders(personalItems)}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
