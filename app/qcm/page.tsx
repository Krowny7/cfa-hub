import { redirect } from "next/navigation";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { ContentSetCreator } from "@/components/ContentSetCreator";
import { ContinueReviewing } from "@/components/ContinueReviewing";
import { ContentListPage } from "@/components/ContentListPage";
import { FolderBlocks } from "@/components/ContentFolderBlocks";
import { normalizeScope, sectionForVisibility, type ScopeFilter } from "@/lib/content/visibility";
import type { Profile } from "@/lib/types";
import type { ContentSetRow } from "@/components/ContentListPage";

type OfficialRow = ContentSetRow & {
  is_official?: boolean | null;
  official_published?: boolean | null;
  difficulty?: number | null;
};

type SearchParams = { q?: string; scope?: string };
type PageProps = { searchParams?: Promise<SearchParams> };

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
  const all = (setsRes.data ?? []) as unknown as OfficialRow[];
  const official = (officialRes.data ?? []) as unknown as OfficialRow[];
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

  return (
    <ContentListPage
      locale={locale}
      basePath="/qcm"
      titleKey="qcm.title"
      i18nPrefix="qcm"
      scope={scope}
      q={q}
      all={all}
      priv={priv}
      shared={shared}
      pub={pub}
      cfaItems={cfaItems}
      personalItems={personalItems}
      displayItems={displayItems}
      itemUnit="QCM"
      continueReviewingSlot={<ContinueReviewing kind="qcm" basePath="/qcm" />}
      creatorSlot={
        <ContentSetCreator
          activeGroupId={activeGroupId}
          table="quiz_sets"
          shareTable="quiz_set_shares"
          folderKind="quizzes"
          i18nPrefix="qcm"
        />
      }
      extraTopSlot={
        official.length > 0 ? (
          <div className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-semibold">{t(locale, "qcm.officialTitle")}</span>
              <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                <Star size={10} /> Officiel
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
        ) : null
      }
    />
  );
}
