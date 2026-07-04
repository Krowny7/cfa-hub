import Link from "next/link";
import { t } from "@/lib/i18n/core";
import type { Locale } from "@/lib/i18n/core";
import { FolderBlocks } from "@/components/ContentFolderBlocks";
import type { ScopeFilter } from "@/lib/content/visibility";
import type { ReactNode } from "react";

export type ContentSetRow = {
  id: string;
  title: string;
  visibility: string | null;
  created_at: string | null;
  subject?: string | null;
  library_folders?: { name: string | null } | null;
};

function tabCls(active: boolean) {
  return (
    "px-4 py-2.5 text-sm border-b-2 transition-colors whitespace-nowrap " +
    (active
      ? "border-blue-400 text-blue-300 font-medium"
      : "border-transparent text-white/50 hover:text-white/70")
  );
}

// Squelette partagé entre /flashcards et /qcm — les deux pages étaient
// ~90% le même JSX dupliqué (onglets de scope, recherche, sections CFA/
// personnel), risque déjà matérialisé une fois cette session (un correctif
// UX appliqué à l'un et oublié sur l'autre). La récupération des données
// reste dans chaque page.tsx (elle diffère réellement : QCM a un bloc
// "sets officiels" en plus) ; seul le rendu est mutualisé ici.
export function ContentListPage({
  locale,
  basePath,
  titleKey,
  i18nPrefix,
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
  continueReviewingSlot,
  creatorSlot,
  extraTopSlot,
}: {
  locale: Locale;
  basePath: string;
  titleKey: string;
  i18nPrefix: string;
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
  continueReviewingSlot: ReactNode;
  creatorSlot: ReactNode;
  extraTopSlot?: ReactNode;
}) {
  const noFolder = t(locale, "common.noFolder");
  const openLabel = t(locale, `${i18nPrefix}.open`);
  const scopeLink = (v: string) =>
    `${basePath}?scope=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="grid gap-4">
      {/* Reprendre où on en était — priorité visuelle sur la création */}
      {continueReviewingSlot}

      {/* Header: title + creator toggle */}
      <details>
        <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight">{t(locale, titleKey)}</h1>
          <span className="btn btn-secondary shrink-0 text-sm">
            + {locale === "fr" ? "Créer" : "Create"}
          </span>
        </summary>
        <div className="mt-3 card p-4">{creatorSlot}</div>
      </details>

      {extraTopSlot}

      {/* Scope tabs */}
      <div className="flex border-b border-white/[0.07]">
        <Link href={scopeLink("all")} className={tabCls(scope === "all")}>
          {t(locale, "common.all")} · {all.length}
        </Link>
        <Link href={scopeLink("private")} className={tabCls(scope === "private")}>
          {t(locale, "content.sectionPrivate")} · {priv.length}
        </Link>
        <Link href={scopeLink("shared")} className={tabCls(scope === "shared")}>
          {t(locale, "content.sectionShared")} · {shared.length}
        </Link>
        <Link href={scopeLink("public")} className={tabCls(scope === "public")}>
          {t(locale, "content.sectionPublic")} · {pub.length}
        </Link>
      </div>

      {/* Search */}
      <form className="flex flex-wrap gap-2" action={basePath} method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder={t(locale, `${i18nPrefix}.searchPlaceholder`)}
          className="input min-w-0 flex-1 sm:min-w-[220px]"
        />
        <input type="hidden" name="scope" value={scope} />
        <button type="submit" className="btn btn-secondary whitespace-nowrap">
          {t(locale, "common.filter")}
        </button>
        {(q || scope !== "all") && (
          <Link href={basePath} className="btn btn-ghost whitespace-nowrap">
            {t(locale, "common.reset")}
          </Link>
        )}
      </form>

      {/* Empty state */}
      {displayItems.length === 0 && (
        <p className="text-sm opacity-60">{t(locale, `${i18nPrefix}.empty`)}</p>
      )}

      {/* CFA section */}
      {cfaItems.length > 0 && (
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm font-semibold">📊 {t(locale, "subject.cfa")}</span>
            <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-300">
              {cfaItems.length}
            </span>
          </div>
          <FolderBlocks
            locale={locale}
            items={cfaItems}
            rootLabel={noFolder}
            openLabel={openLabel}
            basePath={basePath}
            itemUnit={itemUnit}
          />
        </div>
      )}

      {/* Personal section */}
      {personalItems.length > 0 && (
        <div className="card border-l-2 border-l-violet-400/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm font-semibold">📚 {t(locale, "subject.personal")}</span>
            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-300">
              {personalItems.length}
            </span>
          </div>
          <FolderBlocks
            locale={locale}
            items={personalItems}
            rootLabel={noFolder}
            openLabel={openLabel}
            basePath={basePath}
            itemUnit={itemUnit}
          />
        </div>
      )}
    </div>
  );
}
