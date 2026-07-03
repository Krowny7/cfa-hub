import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { ContentSetCreator } from "@/components/ContentSetCreator";
import { ContinueReviewing } from "@/components/ContinueReviewing";
import { FolderBlocks } from "@/components/ContentFolderBlocks";
import { normalizeScope, sectionForVisibility, type ScopeFilter } from "@/lib/content/visibility";
import type { Profile } from "@/lib/types";

type SetRow = {
  id: string;
  title: string;
  visibility: string | null;
  created_at: string | null;
  is_official?: boolean | null;
  official_published?: boolean | null;
  difficulty?: number | null;
  subject?: string | null;
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

export default async function QcmPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const q = (sp.q ?? "").trim();
  const scope = normalizeScope(sp.scope) as ScopeFilter;

  const admin = createAdminClient();

  const [{ data: profileData }, setsRes, officialRes] = await Promise.all([
    supabase.from("profiles").select("active_group_id").eq("id", user.id).maybeSingle(),
    (async () => {
      let query = supabase
        .from("quiz_sets")
        .select("id,title,visibility,created_at,is_official,official_published,difficulty,subject,library_folders(name)")
        .order("created_at", { ascending: false });
      if (q) query = query.ilike("title", `%${q}%`);
      return await query;
    })(),
    (async () => {
      let query = admin
        .from("quiz_sets")
        .select("id,title,visibility,created_at,is_official,official_published,difficulty,subject")
        .eq("is_official", true)
        .eq("official_published", true)
        .order("created_at", { ascending: false })
        .limit(50);
      if (q) query = query.ilike("title", `%${q}%`);
      return await query;
    })(),
  ]);

  const activeGroupId =
    (profileData as Pick<Profile, "active_group_id"> | null)?.active_group_id ?? null;
  const all = (setsRes.data ?? []) as unknown as SetRow[];
  const official = (officialRes.data ?? []) as unknown as SetRow[];
  const priv = all.filter((s) => sectionForVisibility(s.visibility) === "private");
  const shared = all.filter((s) => sectionForVisibility(s.visibility) === "shared");
  const pub = all.filter((s) => sectionForVisibility(s.visibility) === "public");

  const displayItems =
    scope === "private" ? priv :
    scope === "shared" ? shared :
    scope === "public" ? pub :
    all;

  // Official sets have their own block at the top — exclude from subject sections
  const officialIds = new Set(official.map((s) => s.id));
  const userItems = displayItems.filter((s) => !officialIds.has(s.id));
  const cfaItems = userItems.filter((s) => (s.subject ?? "cfa") !== "personal");
  const personalItems = userItems.filter((s) => s.subject === "personal");

  const noFolder = t(locale, "common.noFolder");
  const openLabel = t(locale, "qcm.open");
  const scopeLink = (v: string) =>
    `/qcm?scope=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="grid gap-4">
      {/* Reprendre où on en était — priorité visuelle sur la création */}
      <ContinueReviewing kind="qcm" basePath="/qcm" />

      {/* Header: title + creator toggle */}
      <details>
        <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight">{t(locale, "qcm.title")}</h1>
          <span className="btn btn-secondary shrink-0 text-sm">
            + {locale === "fr" ? "Créer" : "Create"}
          </span>
        </summary>
        <div className="mt-3 card p-4">
          <ContentSetCreator
            activeGroupId={activeGroupId}
            table="quiz_sets"
            shareTable="quiz_set_shares"
            folderKind="quizzes"
            i18nPrefix="qcm"
          />
        </div>
      </details>

      {/* Official sets — always shown at the top, outside tabs */}
      {official.length > 0 && (
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm font-semibold">{t(locale, "qcm.officialTitle")}</span>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
              ★ Officiel
            </span>
          </div>
          <p className="mb-3 text-xs text-white/55">{t(locale, "qcm.officialXpNote")}</p>
          <FolderBlocks
            locale={locale}
            items={official}
            rootLabel={noFolder}
            openLabel={openLabel}
            basePath="/qcm"
            itemUnit="QCM"
          />
        </div>
      )}

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
      <form className="flex flex-wrap gap-2" action="/qcm" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder={t(locale, "qcm.searchPlaceholder")}
          className="input min-w-0 flex-1 sm:min-w-[220px]"
        />
        <input type="hidden" name="scope" value={scope} />
        <button type="submit" className="btn btn-secondary whitespace-nowrap">
          {t(locale, "common.filter")}
        </button>
        {(q || scope !== "all") && (
          <Link href="/qcm" className="btn btn-ghost whitespace-nowrap">
            {t(locale, "common.reset")}
          </Link>
        )}
      </form>

      {/* Empty state */}
      {displayItems.length === 0 && (
        <p className="text-sm opacity-60">{t(locale, "qcm.empty")}</p>
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
            basePath="/qcm"
            itemUnit="QCM"
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
            basePath="/qcm"
            itemUnit="QCM"
          />
        </div>
      )}
    </div>
  );
}
