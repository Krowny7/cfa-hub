import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { jourParis } from "@/lib/objectif";
import { REVOIR, lireMesRevisions, tailleRevoir } from "@/lib/revisions";
import { EnTeteRevoir, RevoirRunner } from "@/components/revoir/RevoirRunner";
import { CadreZones, SousPage } from "@/components/ui/SousPage";
import { SOUS_MOI } from "@/lib/voice-moi";

export const metadata = { title: "À revoir · Ranked Lobby" };

/** La reprise du carnet : là où « À revoir » renvoie tant que la section §3b n'est pas collée. */
const MISE_AU_PROPRE = "/moi?onglet=erreurs&reprise=1";

/**
 * Après la séance, « C'est assez pour aujourd'hui » ramène au Codex si une
 * séance du jour y est lancée et pas finie (codex_seances, V3 §6.2), sinon à
 * l'accueil. Table absente ou illisible : l'accueil, sans bruit.
 */
async function destinationApres(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string> {
  try {
    const { data, error } = await supabase.from("codex_seances").select("lancee_le,finie_le").eq("user_id", userId).eq("jour", jourParis(Date.now())).maybeSingle();
    if (!error && data?.lancee_le && !data.finie_le) return "/codex";
  } catch {
    // table pas encore collée : l'accueil
  }
  return "/dashboard";
}

// « À revoir » (V3 §5.2) : la file des révisions du jour, en une séance de 15
// questions (?n=10..25), sur le moteur des séries éclair
// (migration_v3_profil.sql §3b : mes_revisions_dues, revoir_lancer,
// revoir_repondre). Tant que la section n'est pas collée : « bientôt », et le
// lien vers « Mettre au propre ». Le retour mène à Moi ; l'écran de départ, la
// séance et le bilan sont posés par RevoirRunner (en-tête et cadre à zones).
export default async function RevoirPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const sp = (await searchParams) ?? {};
  const taille = tailleRevoir(sp.n);
  const [file, destination] = await Promise.all([lireMesRevisions(supabase), destinationApres(supabase, user.id)]);

  if (file.complet) return <RevoirRunner taille={taille} file={file} destination={destination} />;

  return (
    <SousPage entete={<EnTeteRevoir />}>
      <CadreZones
        gauche={{
          titre: SOUS_MOI.revoir.zone,
          contenu: (
            <div className="grid justify-items-start gap-3">
              <p className="m-0 text-[17px] font-semibold">{REVOIR.soonTitre}</p>
              <p className="t-body m-0 text-muted">{REVOIR.soonTexte}</p>
              <Link href={MISE_AU_PROPRE} className="btn btn-primary min-h-[44px] w-full sm:w-fit">
                {REVOIR.miseAuPropre}
              </Link>
            </div>
          ),
        }}
      />
    </SousPage>
  );
}
