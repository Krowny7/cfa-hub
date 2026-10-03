import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShelfPage } from "@/components/reviser/ShelfPage";
import { ficheShelf } from "@/components/reviser/shelves";

export default async function FichesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { items, upcoming } = ficheShelf();
  return (
    <ShelfPage
      kind="fiche"
      kicker="Réviser"
      title="Fiches de révision"
      desc="Une page de synthèse par thème (concepts clés, formules, pièges), puis son quiz corrigé. Tes erreurs restent de côté jusqu'à ce que tu les réussisses."
      items={items}
      upcoming={upcoming}
    />
  );
}
