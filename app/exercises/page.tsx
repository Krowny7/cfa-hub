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

type ExerciseRow = ContentSetRow & {
  is_official?: boolean | null;
  official_published?: boolean | null;
  difficulty?: number | null;
};

type SearchParams = { q?: string; scope?: string };
type PageProps = { searchParams?: Promise<SearchParams> };

export default async function ExercisesPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const q = (sp.q ?? "").trim();
  const scope = normalizeScope(sp.scope) as ScopeFilter;

  const admin = createAdminClient();

  const [{ data: profileData }, setsRes, systemRes] = await Promise.all([
    supabase.from("profiles").select("active_group_id").eq("id", user.id).maybeSingle(),
    (async () => {
      let query = supabase
        .from("exercise_sets")
        .select("id,title,visibility,created_at,is_official,official_published,difficulty,subject,library_folders(name)")
        .order("created_at", { ascending: false });
      if (q) query = query.ilike("title", `%${q}%`);
      return await query;
    })(),
    (async () => {
      let query = admin
        .from("exercise_sets")
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
  const all = (setsRes.data ?? []) as unknown as ExerciseRow[];
  const system = (systemRes.data ?? []) as unknown as ExerciseRow[];
  const priv = all.filter((s) => sectionForVisibility(s.visibility) === "private");
  const shared = all.filter((s) => sectionForVisibility(s.visibility) === "shared");
  const pub = all.filter((s) => sectionForVisibility(s.visibility) === "public");

  const displayItems =
    scope === "private" ? priv :
    scope === "shared" ? shared :
    scope === "public" ? pub :
    all;

  const systemIds = new Set(system.map((s) => s.id));
  const userItems = displayItems.filter((s) => !systemIds.has(s.id));
  const cfaItems = userItems.filter((s) => (s.subject ?? "cfa") !== "personal");
  const personalItems = userItems.filter((s) => s.subject === "personal");

  const noFolder = t(locale, "common.noFolder");
  const openLabel = t(locale, "exercises.open");

  return (
    <ContentListPage
      locale={locale}
      basePath="/exercises"
      titleKey="exercises.title"
      i18nPrefix="exercises"
      scope={scope}
      q={q}
      all={all}
      priv={priv}
      shared={shared}
      pub={pub}
      cfaItems={cfaItems}
      personalItems={personalItems}
      displayItems={displayItems}
      itemUnit="exercice"
      continueReviewingSlot={<ContinueReviewing kind="exercises" basePath="/exercises" />}
      creatorSlot={
        <ContentSetCreator
          activeGroupId={activeGroupId}
          table="exercise_sets"
          shareTable="exercise_set_shares"
          folderKind="exercises"
          i18nPrefix="exercises"
        />
      }
      extraTopSlot={
        system.length > 0 ? (
          <div className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-semibold">{t(locale, "exercises.systemTitle")}</span>
              <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                <Star size={10} /> Système
              </span>
            </div>
            <p className="mb-3 text-xs text-white/55">{t(locale, "exercises.systemXpNote")}</p>
            <FolderBlocks
              locale={locale}
              items={system}
              rootLabel={noFolder}
              openLabel={openLabel}
              basePath="/exercises"
              itemUnit="exercice"
            />
          </div>
        ) : null
      }
    />
  );
}
