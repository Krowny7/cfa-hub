import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnswerStats } from "@/lib/answer-stats";
import { notionParId } from "@/lib/notions";
import { traitsDuJour } from "@/components/adn/AnneauDuJourData";
import { AtelierEcran } from "@/components/atelier/AtelierEcran";
import { RegistreCourt } from "@/components/atelier/RegistreCourt";
import { CadreZones, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { construirePointsFaibles, lireBanqueQcm, lireBasePointsFaibles } from "@/components/moi/points-faibles-data";
import { SUBJECTS } from "@/components/reviser/catalog";
import type { NotionProposee } from "@/lib/atelier-seance";
import { POINTS_FAIBLES } from "@/lib/voice-points-faibles";
import { ATELIER } from "@/lib/voice-atelier";
import { RETOUR_ENTRAINEMENT, SOUS_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";
import { lireAtelierCourant, rappelsDes } from "./donnees";

export const metadata = { title: "L'Atelier · Ranked Lobby" };

// L'Atelier : la séance de remise à niveau (environ 15 minutes) sur UNE
// notion, la plus faible (la première de « Tes points faibles »,
// migration_atelier.sql). ?notion=fixed_income:11 : cette notion-là (depuis sa
// ligne de « Tes points faibles »). Un Atelier en cours se reprend. Tant que
// la migration manque, ou que les questions ne portent pas encore leur notion
// (on reste aux thèmes) : « bientôt ». L'écran suit le modèle des sous-pages
// (2026-11-12) : l'en-tête commun, la notion du jour, le registre resserré dans la
// colonne grise (lu en flux) ; la séance lancée, plus d'en-tête.
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

  const registre = (
    <Suspense fallback={null}>
      <RegistreCourt supabase={supabase} admin={admin} userId={userId} />
    </Suspense>
  );

  if (!courant.disponible || pf.unite !== "notion") {
    return (
      <SousPage entete={<EnTeteSousPage retour={RETOUR_ENTRAINEMENT} titre={ATELIER.nom} ligne={ATELIER.carteSousTitre} illustration={{ nom: "qcm-machines" }} />}>
        <CadreZones
          gauche={{
            titre: SOUS_ENTRAINEMENT.atelier.notion,
            contenu: (
              <div className="grid gap-3">
                <p className="m-0 text-[20px] font-bold leading-tight">{ATELIER.bientotTitre}</p>
                <p className="t-body m-0 text-muted">{ATELIER.bientotTexte}</p>
                <Link href="/moi?onglet=stats#points-faibles" className="ink-link w-fit">
                  {ATELIER.bientotAction}
                </Link>
              </div>
            ),
          }}
          droite={{ titre: SOUS_ENTRAINEMENT.atelier.registre, contenu: registre }}
        />
      </SousPage>
    );
  }

  const matiere = new Map(SUBJECTS.map((s) => [s.key, s.name]));
  // un bloc Calcul : la notion a un type de calcul, et la clé service note les réponses (actions.ts)
  const aCalcul = (id: string) => !!admin && (notionParId(id)?.calculs.length ?? 0) > 0;
  const proposees: NotionProposee[] = pf.liste
    .filter((p) => p.lm)
    .map((p) => ({ notion: p.lm as string, libelle: p.libelle, repere: [p.matiereNom, p.repere].filter(Boolean).join(" · "), enCours: p.mesures.enCours, calcul: p.calcul, aCalcul: aCalcul(p.lm as string) }));
  // la notion demandée, même hors de la liste
  if (demandee && !proposees.some((p) => p.notion === demandee.id)) {
    proposees.unshift({ notion: demandee.id, libelle: demandee.court, repere: `${matiere.get(demandee.matiere) ?? demandee.matiere} · ${POINTS_FAIBLES.repereLm(demandee.lm)}`, enCours: 0, calcul: demandee.calculs.length > 0, aCalcul: aCalcul(demandee.id) });
  }
  const initiales = demandee ? [demandee.id] : proposees.slice(0, 1).map((p) => p.notion);
  const concepts = Object.fromEntries(pf.liste.filter((p) => p.lm).map((p) => [p.lm as string, p.concepts.map((c) => c.concept)]));
  const ids = [...new Set([...(courant.seance?.notions ?? []), ...proposees.map((p) => p.notion)])];
  const rappels = await rappelsDes(supabase, ids, concepts);

  return <AtelierEcran proposees={proposees} initiales={initiales} courant={courant.seance} rappels={rappels} traits={traits} registre={registre} />;
}
