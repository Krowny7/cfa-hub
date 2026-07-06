import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PdfLinkAdder } from "@/components/PdfLinkAdder";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { FolderBlocks } from "@/components/ContentFolderBlocks";
import { normalizeScope, sectionForVisibility, type ScopeFilter } from "@/lib/content/visibility";
import type { Profile } from "@/lib/types";

type DocRow = {
  id: string;
  title: string;
  visibility: string | null;
  created_at: string | null;
  library_folders?: { name: string | null } | null;
};

type SearchParams = { q?: string; scope?: string };
type PageProps = { searchParams?: Promise<SearchParams> };

function tabCls(active: boolean) {
  return (
    "px-4 py-2.5 text-sm border-b-2 transition-colors whitespace-nowrap " +
    (active
      ? "border-blue-400 text-blue-300 font-medium"
      : "border-transparent text-white/50 hover:text-white/70")
  );
}

export default async function LibraryPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const q = (sp.q ?? "").trim();
  const scope = normalizeScope(sp.scope) as ScopeFilter;

  const [{ data: profileData }, docsRes] = await Promise.all([
    supabase.from("profiles").select("active_group_id").eq("id", user.id).maybeSingle(),
    (async () => {
      let query = supabase
        .from("documents")
        .select("id,title,visibility,created_at,library_folders(name)")
        .order("created_at", { ascending: false });
      if (q) query = query.ilike("title", `%${q}%`);
      return await query;
    })(),
  ]);

  const activeGroupId =
    (profileData as Pick<Profile, "active_group_id"> | null)?.active_group_id ?? null;
  const all = (docsRes.data ?? []) as unknown as DocRow[];
  const priv = all.filter((d) => sectionForVisibility(d.visibility) === "private");
  const shared = all.filter((d) => sectionForVisibility(d.visibility) === "shared");
  const pub = all.filter((d) => sectionForVisibility(d.visibility) === "public");

  const displayItems =
    scope === "private" ? priv :
    scope === "shared" ? shared :
    scope === "public" ? pub :
    all;

  const noFolder = t(locale, "common.noFolder");
  const openLabel = t(locale, "library.open") || "→";
  const scopeLink = (v: string) =>
    `/library?scope=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="grid min-w-0 gap-4">
      {/* Header: title + creator toggle */}
      <details>
        <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight">{t(locale, "library.title")}</h1>
          <span className="btn btn-secondary shrink-0 text-sm">
            + {locale === "fr" ? "Ajouter" : "Add"}
          </span>
        </summary>
        <div className="mt-3 card p-4">
          <PdfLinkAdder activeGroupId={activeGroupId} />
        </div>
      </details>

      {/* Scope tabs */}
      <div className="flex overflow-x-auto border-b border-white/[0.07] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
      <form className="flex flex-wrap gap-2" action="/library" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder={t(locale, "library.searchPlaceholder")}
          className="input min-w-0 flex-1 sm:min-w-[220px]"
        />
        <input type="hidden" name="scope" value={scope} />
        <button type="submit" className="btn btn-secondary whitespace-nowrap">
          {t(locale, "common.filter")}
        </button>
        {(q || scope !== "all") && (
          <Link href="/library" className="btn btn-ghost whitespace-nowrap">
            {t(locale, "common.reset")}
          </Link>
        )}
      </form>

      {/* Folders — primary grouping, visibility as badge on each item */}
      {displayItems.length > 0 ? (
        <FolderBlocks
          locale={locale}
          items={displayItems}
          rootLabel={noFolder}
          openLabel={openLabel}
          basePath="/library"
          itemUnit="PDF"
        />
      ) : (
        <p className="text-sm opacity-60">{t(locale, "library.empty")}</p>
      )}
    </div>
  );
}
