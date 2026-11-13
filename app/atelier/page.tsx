import Link from "next/link";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnswerStats } from "@/lib/answer-stats";
import { notionParId } from "@/lib/notions";
import { traitsDuJour } from "@/components/adn/AnneauDuJourData";
import { AtelierEcran } from "@/components/atelier/AtelierEcran";
import { ColonneSeance, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import fiche from "@/components/atelier/AtelierOuverture.module.css";
import { construirePointsFaibles, lireBanqueQcm, lireBasePointsFaibles } from "@/components/moi/points-faibles-data";
import { SUBJECTS } from "@/components/reviser/catalog";
import type { NotionProposee } from "@/lib/atelier-seance";
import { POINTS_FAIBLES } from "@/lib/voice-points-faibles";
import { ATELIER } from "@/lib/voice-atelier";
import { RETOUR_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";
import { ATELIER_B } from "@/lib/voice-entrainement-b";
import { lireAtelierCourant, rappelsDes } from "./donnees";

export const metadata = { title: "L'Atelier · Ranked Lobby" };

// L'Atelier : la séance de remise à niveau (environ 15 minutes) sur UNE
// notion, la plus faible (la première de « Tes points faibles »,
// migration_atelier.sql). ?notion=fixed_income:11 : cette notion-là (depuis sa
// ligne de « Tes points faibles »). Un Atelier en cours se reprend. Tant que
// la migration manque, ou que les questions ne portent pas encore leur notion
// (on reste aux thèmes) : « bientôt ». Direction « le lieu, puis l'objet »
// (2026-11-13) : la porte, puis la fiche de la notion dans la colonne des séances
// (AtelierEcran) ; la séance lancée, plus d'en-tête.
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

  if (!courant.disponible || pf.unite !== "notion") {
    return (
      <SousPage entete={<EnTeteSousPage retour={RETOUR_ENTRAINEMENT} titre={ATELIER.nom} ligne={ATELIER.carteSousTitre} illustration={{ nom: "qcm-machines" }} />}>
        <ColonneSeance className={fiche.colonne}>
          <section className={fiche.fiche} aria-label={ATELIER_B.notion}>
            <p className={fiche.etiquette}>{ATELIER_B.notion}</p>
            <p className={fiche.nom}>{ATELIER.bientotTitre}</p>
            <p className={fiche.repere}>{ATELIER.bientotTexte}</p>
            <Link href="/moi?onglet=stats#points-faibles" className="ink-link w-fit">
              {ATELIER.bientotAction}
            </Link>
          </section>
        </ColonneSeance>
      </SousPage>
    );
  }

  const matiere = new Map(SUBJECTS.map((s) => [s.key, s.name]));
  // un bloc Calcul : la notion a un type de calcul, et la clé service note les réponses (actions.ts)
  const aCalcul = (id: string) => !!admin && (notionParId(id)?.calculs.length ?? 0) > 0;
  const proposees: NotionProposee[] = pf.liste
    .filter((p) => p.lm)
    .map((p) => ({
      notion: p.lm as string,
      libelle: p.libelle,
      repere: [p.matiereNom, p.repere].filter(Boolean).join(" · "),
      enCours: p.mesures.enCours,
      calcul: p.calcul,
      aCalcul: aCalcul(p.lm as string),
      pct: p.mesures.n > 0 ? Math.round((p.mesures.ok / p.mesures.n) * 100) : null,
      n: p.mesures.n,
      ok: p.mesures.ok,
    }));
  // le chiffre-héros de la porte : les points faibles mesurés (avant d'y ajouter la notion demandée)
  const nbFaibles = proposees.length;
  // la notion demandée, même hors de la liste
  if (demandee && !proposees.some((p) => p.notion === demandee.id)) {
    proposees.unshift({ notion: demandee.id, libelle: demandee.court, repere: `${matiere.get(demandee.matiere) ?? demandee.matiere} · ${POINTS_FAIBLES.repereLm(demandee.lm)}`, enCours: 0, calcul: demandee.calculs.length > 0, aCalcul: aCalcul(demandee.id) });
  }
  const initiales = demandee ? [demandee.id] : proposees.slice(0, 1).map((p) => p.notion);
  const concepts = Object.fromEntries(pf.liste.filter((p) => p.lm).map((p) => [p.lm as string, p.concepts.map((c) => c.concept)]));
  const ids = [...new Set([...(courant.seance?.notions ?? []), ...proposees.map((p) => p.notion)])];
  const rappels = await rappelsDes(supabase, ids, concepts);

  return <AtelierEcran proposees={proposees} faibles={nbFaibles} initiales={initiales} courant={courant.seance} rappels={rappels} traits={traits} />;
}
