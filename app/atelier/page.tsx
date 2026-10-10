import Link from "next/link";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnswerStats } from "@/lib/answer-stats";
import { notionParId } from "@/lib/notions";
import { traitsDuJour } from "@/components/adn/AnneauDuJourData";
import { BackLink } from "@/components/defi/parts";
import { AtelierEcran } from "@/components/atelier/AtelierEcran";
import { construirePointsFaibles, lireBanqueQcm, lireBasePointsFaibles } from "@/components/moi/points-faibles-data";
import { SUBJECTS } from "@/components/reviser/catalog";
import type { NotionProposee } from "@/lib/atelier-seance";
import { POINTS_FAIBLES } from "@/lib/voice-points-faibles";
import { ATELIER } from "@/lib/voice-atelier";
import { lireAtelierCourant, rappelsDes } from "./donnees";

export const metadata = { title: "L'Atelier · Ranked Lobby" };

// L'Atelier : la séance de remise à niveau (environ 30 minutes) sur ses
// points faibles (migration_atelier.sql). ?notion=fixed_income:11 : une
// seule notion (depuis sa ligne de « Tes points faibles »). Un Atelier en
// cours se reprend. Tant que la migration manque, ou que les questions ne
// portent pas encore leur notion (on reste aux thèmes) : « bientôt ».
export default async function AtelierPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const userId = auth.user.id;

  let admin: SupabaseClient | null = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }
  const now = Date.now();
  const sp = (await searchParams) ?? {};
  const demandee = notionParId(Array.isArray(sp.notion) ? sp.notion[0] : sp.notion);

  const [courant, answers, base, banque, traits] = await Promise.all([
    lireAtelierCourant(supabase),
    getAnswerStats(admin ?? supabase, userId, { privileged: !!admin, now }),
    lireBasePointsFaibles(supabase),
    lireBanqueQcm(admin ?? supabase),
    traitsDuJour(userId),
  ]);
  const pf = construirePointsFaibles(answers, base, banque, now);

  const entete = (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <BackLink href="/entrainement">{ATELIER.retour}</BackLink>
    </div>
  );

  if (!courant.disponible || pf.unite !== "notion") {
    return (
      <div className="rl-wide grid gap-5">
        {entete}
        <section className="card rl-in mx-auto grid w-full max-w-[760px] gap-3 p-6 md:p-8">
          <h1 className="t-h2 m-0">{ATELIER.bientotTitre}</h1>
          <p className="t-body m-0 text-muted">{ATELIER.bientotTexte}</p>
          <Link href="/moi?onglet=stats#points-faibles" className="ink-link w-fit">
            {ATELIER.bientotAction}
          </Link>
        </section>
      </div>
    );
  }

  const matiere = new Map(SUBJECTS.map((s) => [s.key, s.name]));
  // un bloc Calcul : la notion a un type de calcul, et la clé service note les réponses (actions.ts)
  const aCalcul = (id: string) => !!admin && (notionParId(id)?.calculs.length ?? 0) > 0;
  const proposees: NotionProposee[] = pf.liste
    .filter((p) => p.lm)
    .map((p) => ({ notion: p.lm as string, libelle: p.libelle, repere: [p.matiereNom, p.repere].filter(Boolean).join(" · "), enCours: p.mesures.enCours, calcul: p.calcul, aCalcul: aCalcul(p.lm as string) }));
  // une seule notion demandée, même hors de la liste
  if (demandee && !proposees.some((p) => p.notion === demandee.id)) {
    proposees.unshift({ notion: demandee.id, libelle: demandee.court, repere: `${matiere.get(demandee.matiere) ?? demandee.matiere} · ${POINTS_FAIBLES.repereLm(demandee.lm)}`, enCours: 0, calcul: demandee.calculs.length > 0, aCalcul: aCalcul(demandee.id) });
  }
  const initiales = demandee ? [demandee.id] : proposees.slice(0, 3).map((p) => p.notion);
  const concepts = Object.fromEntries(pf.liste.filter((p) => p.lm).map((p) => [p.lm as string, p.concepts.map((c) => c.concept)]));
  const ids = [...new Set([...(courant.seance?.notions ?? []), ...proposees.map((p) => p.notion)])];
  const rappels = await rappelsDes(supabase, ids, concepts);

  return (
    <div className="rl-wide grid gap-5">
      {entete}
      <AtelierEcran proposees={proposees} initiales={initiales} courant={courant.seance} rappels={rappels} traits={traits} />
    </div>
  );
}
