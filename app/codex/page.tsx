import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { bilanDe } from "@/lib/codex/bilan";
import { lireCodex } from "@/lib/codex/serveur";
import { CODEX } from "@/lib/voice-codex";
import { CodexEcran } from "@/components/codex/CodexEcran";
import { FeteCodex } from "@/components/codex/FeteCodex";

// Le Codex : « Aujourd'hui » (À récupérer, la séance du jour en étapes, les
// replis) et « Tout le Codex » (la carte). Le calcul est fait côté serveur
// (lib/codex/serveur.ts) ; l'écran ne calcule rien. Sans la migration, un
// message clair, et le reste du site marche comme avant.
// ?vue= : le segment ouvert (« tout » ; les anciens segments y mènent) ;
// ?quete= : la quête à montrer (« Chercher une quête », dans la palette Ctrl K).
export const metadata = { title: "Codex · Ranked Lobby" };

export default async function CodexPage({ searchParams }: { searchParams?: Promise<{ vue?: string; quete?: string }> }) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const vue = await lireCodex(supabase, auth.user);
  if (!vue.disponible) {
    return (
      <div className="rl-wide rl-page">
        <section className="card-quiet mx-auto flex max-w-[620px] flex-col gap-3 p-7">
          <p className="t-eyebrow m-0">{CODEX.nom}</p>
          <h1 className="t-h1 m-0">{CODEX.indisponible.titre}</h1>
          <p className="t-body m-0">{CODEX.indisponible.ligne}</p>
          <Link href="/dashboard" className="btn btn-secondary rl-press mt-2 min-h-[44px] w-fit">
            {CODEX.indisponible.retour}
          </Link>
        </section>
      </div>
    );
  }
  const bilan = bilanDe(vue);
  return (
    <>
      <div className="rl-wide">
        <FeteCodex initial={bilan} persister={!!vue.devoile?.change} className="mb-4" />
      </div>
      <CodexEcran vue={vue} segment={sp.vue} quete={sp.quete} />
    </>
  );
}
