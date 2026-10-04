import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExamClient, type ExamSetOption } from "@/components/ExamClient";
import { traitsDuJour } from "@/components/adn/AnneauDuJourData";

type SetRow = {
  id: string;
  title: string;
  is_official?: boolean | null;
  official_published?: boolean | null;
};

export default async function ExamPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const [{ data }, traitsJour] = await Promise.all([
    supabase
      .from("quiz_sets")
      .select("id,title,is_official,official_published")
      .order("is_official", { ascending: false })
      .order("created_at", { ascending: false }),
    // traits du jour (lecture de la barre du haut, en cache) : l'anneau sous la copie
    traitsDuJour(auth.user.id),
  ]);

  const sets: ExamSetOption[] = ((data ?? []) as SetRow[])
    .filter(s => s.id && s.title)
    .map(s => ({
      id: s.id,
      title: s.title,
      isOfficial: Boolean(s.is_official && s.official_published),
    }));

  return <ExamClient sets={sets} traitsJour={traitsJour} />;
}
