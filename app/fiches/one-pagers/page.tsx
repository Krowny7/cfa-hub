import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MurOnePagers } from "@/components/reviser/MurOnePagers";
import { onePagerItems } from "@/components/reviser/shelves";
import { EnTeteSousPage, Scene, SousPage } from "@/components/ui/SousPage";
import { OP, RETOUR } from "@/lib/voice-reviser";
import { MUR } from "@/lib/voice-reviser-b";

export const metadata = { title: "One-pagers · Ranked Lobby" };

// Les one-pagers : une page A4 PDF par matière. Même mécanisme que les fiches
// (components/FicheDrillPage.tsx) : les PDF vivent dans le bucket privé « fiches »
// (one-pager-<slug>.pdf, envoyés par scripts/upload-one-pagers.mjs) et chaque lien est une URL
// signée d'une heure, générée ici côté serveur avec la session du joueur — une seule requête pour
// les 10. Un PDF absent du bucket laisse sa feuille en filigrane. Modèle des sous-pages
// (2026-11-12) : l'en-tête (retour aux fiches), puis un cadre à une seule zone, les feuilles épinglées.
// Direction « le lieu, puis l'objet » (2026-11-13) : plus de cadre ; le mur en grand sur la scène, un
// filtre par matière au-dessus (MurOnePagers) ; pas de chiffre-héros : le nombre de PDF n'est pas un
// état du joueur.
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

  const avecUrl = items.map((it) => ({ ...it, url: urls.get(it.file) ?? null }));
  return (
    <SousPage
      entete={
        <EnTeteSousPage
          retour={RETOUR.fiches}
          illustration={{ nom: "reviser-bibliotheque", position: "50% 30%" }}
          titre={OP.titre}
          ligne={MUR.ligne}
        />
      }
    >
      <Scene>
        <MurOnePagers items={avecUrl} />
      </Scene>
    </SousPage>
  );
}
