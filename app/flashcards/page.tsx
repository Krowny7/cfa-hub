import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContentSetCreator } from "@/components/ContentSetCreator";
import { ContinueReviewing } from "@/components/ContinueReviewing";
import { ContentListPage } from "@/components/ContentListPage";
import { FolderBlocks } from "@/components/ContentFolderBlocks";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { normalizeScope, normalizeView, sectionForVisibility, type ScopeFilter } from "@/lib/content/visibility";
import type { Profile } from "@/lib/types";
import type { ContentSetRow } from "@/components/ContentListPage";

type FlashcardRow = ContentSetRow & {
  is_official?: boolean | null;
  official_published?: boolean | null;
};

type SearchParams = { q?: string; scope?: string; view?: string };
type PageProps = { searchParams?: Promise<SearchParams> };

export default async function FlashcardsPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const q = (sp.q ?? "").trim();
  const scope = normalizeScope(sp.scope) as ScopeFilter;
  const view = normalizeView(sp.view);

  const admin = createAdminClient();

  const [{ data: profileData }, setsRes, systemRes, systemFoldersRes] = await Promise.all([
    supabase.from("profiles").select("active_group_id").eq("id", user.id).maybeSingle(),
    (async () => {
      let query = supabase
        .from("flashcard_sets")
        .select("id,title,visibility,created_at,is_official,official_published,subject,library_folders(name)")
        .order("created_at", { ascending: false });
      if (q) query = query.ilike("title", `%${q}%`);
      return await query;
    })(),
    (async () => {
      let query = admin
        .from("flashcard_sets")
        .select("id,title,visibility,created_at,is_official,official_published,subject,library_folders(name)")
        .eq("is_official", true)
        .eq("official_published", true)
        .order("created_at", { ascending: false })
        .limit(200);
      if (q) query = query.ilike("title", `%${q}%`);
      return await query;
    })(),
    admin.from("library_folders").select("name").eq("kind", "flashcards").ilike("name", "%(Système)%"),
  ]);

  const activeGroupId =
    (profileData as Pick<Profile, "active_group_id"> | null)?.active_group_id ?? null;
  const system = (systemRes.data ?? []) as unknown as FlashcardRow[];
  const systemIds = new Set(system.map((s) => s.id));
  const systemFolderNames = (systemFoldersRes.data ?? []).map((f) => f.name as string);

  // "Communautaire" ne couvre que ce que les utilisateurs créent eux-mêmes —
  // le contenu Système a son propre onglet, plus de double affichage.
  const all = ((setsRes.data ?? []) as unknown as FlashcardRow[]).filter((s) => !systemIds.has(s.id));
  const priv = all.filter((s) => sectionForVisibility(s.visibility) === "private");
  const shared = all.filter((s) => sectionForVisibility(s.visibility) === "shared");
  const pub = all.filter((s) => sectionForVisibility(s.visibility) === "public");

  const displayItems =
    scope === "private" ? priv :
    scope === "shared" ? shared :
    scope === "public" ? pub :
    all;

  const cfaItems = displayItems.filter((s) => (s.subject ?? "cfa") !== "personal");
  const personalItems = displayItems.filter((s) => s.subject === "personal");

  const noFolder = t(locale, "common.noFolder");
  const openLabel = t(locale, "flashcards.open");

  return (
    <ContentListPage
      locale={locale}
      basePath="/flashcards"
      titleKey="flashcards.title"
      i18nPrefix="flashcards"
      view={view}
      scope={scope}
      q={q}
      all={all}
      priv={priv}
      shared={shared}
      pub={pub}
      cfaItems={cfaItems}
      personalItems={personalItems}
      displayItems={displayItems}
      itemUnit="set"
      systemCount={system.length}
      continueReviewingSlot={<ContinueReviewing />}
      creatorSlot={
        <ContentSetCreator
          activeGroupId={activeGroupId}
          table="flashcard_sets"
          shareTable="flashcard_set_shares"
          folderKind="flashcards"
          i18nPrefix="flashcards"
        />
      }
      systemSlot={
        <>
          <p className="text-xs text-white/55">{t(locale, "flashcards.systemNote")}</p>
          <FolderBlocks
            locale={locale}
            items={system}
            rootLabel={noFolder}
            openLabel={openLabel}
            basePath="/flashcards"
            itemUnit="set"
            extraFolderNames={systemFolderNames}
          />
        </>
      }
    />
  );
}
