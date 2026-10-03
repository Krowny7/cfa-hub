import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calcCatalog, calcSubjectBySlug } from "@/lib/calc/index";
import { CalcTopicView } from "@/components/calculs/CalcTopicView";
import { CalcSoon } from "@/components/calculs/parts";
import { loadCalcProgress } from "../data";

type Params = { matiere: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const s = calcSubjectBySlug((await params).matiere);
  return { title: s ? `Calculs · ${s.name} · Ranked Lobby` : "Calculs · Ranked Lobby" };
}

// Les types de calcul d'une matière, Essentiels puis Annexes, avec le niveau
// tenu et la précision récente de chacun. Une matière sans catalogue
// s'affiche « bientôt ».
export default async function CalculsMatierePage({ params }: { params: Promise<Params> }) {
  const s = calcSubjectBySlug((await params).matiere);
  if (!s) notFound();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const catalog = calcCatalog(s.topic);
  if (!catalog) {
    return (
      <div className="rl-wide">
        <CalcSoon name={s.name} topic={s.topic} />
      </div>
    );
  }

  const progress = await loadCalcProgress(supabase, s.topic);
  const types = catalog.types.map((t) => ({ key: t.key, name: t.name, tier: t.tier, source: t.source ?? null, questions: t.questions.length }));

  return (
    <div className="rl-wide">
      <CalcTopicView subject={{ topic: s.topic, slug: s.slug, name: s.name }} types={types} progress={progress} db={progress !== null} owner={auth.user.id} />
    </div>
  );
}
