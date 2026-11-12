import { redirect } from "next/navigation";
import { Terminal } from "@/components/terminal/Terminal";
import { EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { createClient } from "@/lib/supabase/server";
import { RETOUR_ENTRAINEMENT, SOUS_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";
import { TERMINAL } from "@/lib/voice-terminal";

export const metadata = { title: "Terminal · Ranked Lobby" };

// Le Terminal : pour découvrir une interface de marché, hors programme. Rien n'y est lu en base.
// L'exception du modèle des sous-pages (2026-11-12) : l'en-tête commun (retour à S'entraîner), puis
// l'écran sombre du terminal, tel quel.
export default async function TerminalPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  return (
    <SousPage entete={<EnTeteSousPage retour={RETOUR_ENTRAINEMENT} titre={SOUS_ENTRAINEMENT.terminal.titre} ligne={TERMINAL.menuSous} />}>
      <Terminal />
    </SousPage>
  );
}
