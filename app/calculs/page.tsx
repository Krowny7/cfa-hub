import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calcSubjectCards } from "@/lib/calc/index";
import { CalcHub } from "@/components/calculs/CalcHub";
import { loadCalcProgress } from "./data";

export const metadata = { title: "Calculs · Ranked Lobby" };

// Exercices de calcul pur : les 10 matières (ouvertes ou « bientôt ») et le
// prochain calcul à faire. Rattaché à l'espace S'entraîner (lib/nav.ts).
// Avant migration_calc.sql, la progression vient du navigateur.
export default async function CalculsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const progress = await loadCalcProgress(supabase, null);
  const subjects = calcSubjectCards().map(({ topic, slug, name, short, open, types, questions }) => ({ topic, slug, name, short, open, types, questions }));

  return (
    <div className="rl-wide">
      <CalcHub subjects={subjects} progress={progress} db={progress !== null} owner={auth.user.id} />
    </div>
  );
}
