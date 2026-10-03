import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calcCatalog, calcSubjectBySlug, typeMeta } from "@/lib/calc/index";
import { CALC_LEVELS, type CalcLevel } from "@/lib/calc/types";
import { CalcTypeView } from "@/components/calculs/CalcTypeView";
import { loadCalcProgress } from "../../data";

type Params = { matiere: string; type: string };
type Search = { niveau?: string; go?: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { matiere, type } = await params;
  const s = calcSubjectBySlug(matiere);
  const t = s ? calcCatalog(s.topic)?.types.find((x) => x.key === type) : null;
  return { title: t ? `${t.name} · Calculs · Ranked Lobby` : "Calculs · Ranked Lobby" };
}

// Un type de calcul : rappel des formules, choix du niveau, puis un round de
// 5 questions corrigées côté serveur (app/calculs/actions.ts), et la copie.
// ?niveau=facile|moyen|difficile présélectionne un niveau ; &go=1 lance le
// round dès l'arrivée (liens « Lancer » des listes).
export default async function CalculsTypePage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }) {
  const { matiere, type } = await params;
  const sp = await searchParams;
  const s = calcSubjectBySlug(matiere);
  const catalog = s ? calcCatalog(s.topic) : null;
  const i = catalog ? catalog.types.findIndex((t) => t.key === type) : -1;
  if (!s || !catalog || i < 0) notFound();
  const t = catalog.types[i];
  const next = catalog.types[i + 1] ?? null;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const progress = await loadCalcProgress(supabase, s.topic);
  const niveau = CALC_LEVELS.includes(sp.niveau as CalcLevel) ? (sp.niveau as CalcLevel) : null;

  return (
    <div className="rl-wide">
      <CalcTypeView
        key={t.key}
        subject={{ topic: s.topic, slug: s.slug, name: s.name }}
        meta={typeMeta(t)}
        next={next ? { key: next.key, name: next.name } : null}
        progress={progress}
        db={progress !== null}
        owner={auth.user.id}
        initialLevel={niveau}
        autoStart={sp.go === "1"}
      />
    </div>
  );
}
