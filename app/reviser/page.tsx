import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApercuCodex, ApercuCodexVide } from "@/components/reviser/ApercuCodex";
import { ReviserView } from "@/components/reviser/ReviserView";
import { subjectByKey } from "@/components/reviser/catalog";
import { chargerReviser } from "@/components/reviser/parcours-data";

// Espace « Réviser » : cours complets, fiches, flashcards, one-pagers, outils et Codex. Les anciens liens « ?matiere=fsa » (la rangée des 10
// matières, retirée) mènent à la fiche de la matière ; une clé inconnue est
// ignorée.
export default async function ReviserPage({ searchParams }: { searchParams?: Promise<{ matiere?: string | string[] }> }) {
  const sp = await searchParams;
  const demandee = Array.isArray(sp?.matiere) ? sp.matiere[0] : sp?.matiere;
  const fiche = demandee ? subjectByKey(demandee)?.fiche : null;
  if (fiche) redirect(`/fiches/${fiche}`);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  let admin: SupabaseClient | null = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }

  const d = await chargerReviser(supabase, admin, auth.user.id);
  return (
    <ReviserView
      d={d}
      codex={
        <Suspense fallback={<ApercuCodexVide />}>
          <ApercuCodex user={auth.user} />
        </Suspense>
      }
    />
  );
}
