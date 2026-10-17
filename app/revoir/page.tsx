import { redirect } from "next/navigation";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { jourParis } from "@/lib/objectif";
import { REVOIR, lireMesRevisions, tailleRevoir } from "@/lib/revisions";
import { BackLink } from "@/components/defi/parts";
import { RevoirRunner } from "@/components/revoir/RevoirRunner";

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
// lien vers « Mettre au propre ».
export default async function RevoirPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const sp = (await searchParams) ?? {};
  const taille = tailleRevoir(sp.n);
  const [file, destination] = await Promise.all([lireMesRevisions(supabase), destinationApres(supabase, user.id)]);

  return (
    <div className="rl-wide grid gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <BackLink href="/dashboard">{REVOIR.retour}</BackLink>
      </div>
      {file.complet ? (
        <RevoirRunner taille={taille} file={file} destination={destination} />
      ) : (
        <section className="card rl-in mx-auto grid w-full max-w-[680px] gap-3 p-6 md:p-8">
          <p className="kicker m-0 flex items-center gap-1.5">
            <RotateCcw size={13} aria-hidden /> {REVOIR.nom}
          </p>
          <h1 className="t-h2 m-0">{REVOIR.soonTitre}</h1>
          <p className="t-body m-0 text-muted">{REVOIR.soonTexte}</p>
          <Link href={MISE_AU_PROPRE} className="btn btn-primary min-h-[44px] w-full sm:w-fit">
            {REVOIR.miseAuPropre}
          </Link>
        </section>
      )}
    </div>
  );
}
