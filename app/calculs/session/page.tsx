import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calcSessionSubjects } from "@/lib/calc/session-draw";
import { configFromParams } from "@/lib/calc/session";
import { CalcSessionView } from "@/components/calculs/CalcSessionView";
import { loadCalcProgress } from "../data";

export const metadata = { title: "Session ciblée · Calculs · Ranked Lobby" };

type Search = { matieres?: string; n?: string; diff?: string; go?: string };

// La session ciblée de calculs : matières, nombre de questions, difficulté
// (un niveau ou un mélange en pourcentages). Les réglages vivent dans l'adresse
// (?matieres=quant,fsa&n=10&diff=50-30-20 ; matieres=toutes ; diff=facile) pour
// relancer la même session ; &go=1 la lance dès l'arrivée. Le tirage et la
// correction passent par les actions serveur de app/calculs/actions.ts.
export default async function CalculsSessionPage({ searchParams }: { searchParams: Promise<Search> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const sp = await searchParams;
  const subjects = calcSessionSubjects();
  const progress = await loadCalcProgress(supabase, null);
  const initial = configFromParams((k) => (sp as Record<string, string | undefined>)[k], subjects.map((s) => s.slug));

  return (
    <CalcSessionView
      subjects={subjects.map(({ topic, slug, name, short, types, counts }) => ({ topic, slug, name, short, types, counts }))}
      db={progress !== null}
      owner={auth.user.id}
      initial={initial}
      autoStart={sp.go === "1" && initial !== null}
    />
  );
}
