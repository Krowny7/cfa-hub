import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnePagersGrille } from "@/components/reviser/OnePagers";
import { onePagerItems } from "@/components/reviser/shelves";
import { EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { OP, RETOUR } from "@/lib/voice-reviser";

export const metadata = { title: "One-pagers · Ranked Lobby" };

// Les one-pagers : une page A4 PDF par matière, en grille. Même mécanisme que
// les fiches (components/FicheDrillPage.tsx) : les PDF vivent dans le bucket
// privé « fiches » (one-pager-<slug>.pdf, envoyés par
// scripts/upload-one-pagers.mjs) et chaque lien est une URL signée d'une heure,
// générée ici côté serveur avec la session du joueur — une seule requête
// pour les 10. Un PDF absent du bucket laisse sa carte en filigrane.
// Gabarit A des sous-pages, sans rangée héros (rien à reprendre) : l'en-tête
// (retour aux fiches), puis la grille.
export default async function OnePagersPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const items = onePagerItems();
  const { data: signed } = await supabase.storage.from("fiches").createSignedUrls(
    items.map((it) => it.file),
    3600,
  );
  const urls = new Map<string, string>();
  for (const x of signed ?? []) {
    if (!x.error && x.path && x.signedUrl) urls.set(x.path, x.signedUrl);
  }

  return (
    <SousPage entete={<EnTeteSousPage retour={RETOUR.fiches} illustration={{ nom: "reviser-peche" }} titre={OP.titre} ligne={OP.desc} />}>
      <section className="rl-section rl-in" aria-label={OP.grille}>
        <OnePagersGrille items={items.map((it) => ({ ...it, url: urls.get(it.file) ?? null }))} />
        <p className="t-micro m-0">{OP.impression}</p>
      </section>
    </SousPage>
  );
}
