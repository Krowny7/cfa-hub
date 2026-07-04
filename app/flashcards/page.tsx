import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContentSetCreator } from "@/components/ContentSetCreator";
import { ContinueReviewing } from "@/components/ContinueReviewing";
import { ContentListPage } from "@/components/ContentListPage";
import { getLocale } from "@/lib/i18n/server";
import { normalizeScope, sectionForVisibility, type ScopeFilter } from "@/lib/content/visibility";
import type { Profile } from "@/lib/types";
import type { ContentSetRow } from "@/components/ContentListPage";

type SearchParams = { q?: string; scope?: string };
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

  const [{ data: profileData }, setsRes] = await Promise.all([
    supabase.from("profiles").select("active_group_id").eq("id", user.id).maybeSingle(),
    (async () => {
      let query = supabase
        .from("flashcard_sets")
        .select("id,title,visibility,created_at,subject,library_folders(name)")
        .order("created_at", { ascending: false });
      if (q) query = query.ilike("title", `%${q}%`);
      return await query;
    })(),
  ]);

  const activeGroupId =
    (profileData as Pick<Profile, "active_group_id"> | null)?.active_group_id ?? null;
  const all = (setsRes.data ?? []) as unknown as ContentSetRow[];
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

  return (
    <ContentListPage
      locale={locale}
      basePath="/flashcards"
      titleKey="flashcards.title"
      i18nPrefix="flashcards"
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
    />
  );
}
