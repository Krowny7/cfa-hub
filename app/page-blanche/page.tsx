import { redirect } from "next/navigation";
import { SUBJECTS } from "@/components/reviser/catalog";
import { pad2 } from "@/components/reviser/rail";
import { Feuilles, type Feuille } from "@/components/page-blanche/Feuilles";
import { EnTeteSousPage, Scene, SousPage } from "@/components/ui/SousPage";
import { CATALOGUE, lignesDe } from "@/lib/formules";
import { topicLabel } from "@/lib/practiceTopics";
import { createClient } from "@/lib/supabase/server";
import { nombre } from "@/lib/voice";
import { PB } from "@/lib/voice-page-blanche";
import { FEUILLES_PB, POSTE_PB } from "@/lib/voice-postes";
import { RETOUR } from "@/lib/voice-reviser";

/** Le code de chaque matière (ETH, QM…), pour la face des feuilles. */
const CODES: Record<string, string> = Object.fromEntries(SUBJECTS.map((x) => [x.key, x.code]));

export const metadata = { title: "La page blanche · Ranked Lobby" };

// La page blanche (Réviser A, « le lieu, puis l'objet », 2026-11-13) : la porte (retour à Réviser,
// peinture du palais blanc, les formules maîtrisées en chiffre-héros, la ligne d'état), puis UNE scène :
// les dix matières en feuilles nues sur le fond classique (Feuilles), chacune avec ses formules
// maîtrisées écrites sur ses lignes, la feuille conseillée entourée et prise par l'action à l'encre.
// Un nouveau joueur (rien de maîtrisé) : ni chiffre-héros à zéro ni consigne, la ligne du lieu.
export default async function PageBlanchePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data } = await supabase.from("formules_maitrise").select("formule").eq("user_id", auth.user.id).eq("maitrisee", true);
  const maitrisees = new Set((data ?? []).map((r) => r.formule as string));

  const feuilles: Feuille[] = CATALOGUE.map((m, i) => ({
    cle: m.matiere,
    numero: pad2(i + 1),
    code: CODES[m.matiere] ?? m.matiere.slice(0, 3).toUpperCase(),
    nom: topicLabel(m.matiere),
    total: lignesDe(m),
    faites: m.copies.reduce((t, c) => t + c.formules.filter((f) => maitrisees.has(f.id)).length, 0),
  }));
  const total = feuilles.reduce((t, x) => t + x.total, 0);
  const faites = feuilles.reduce((t, x) => t + x.faites, 0);
  const entamees = feuilles.filter((f) => f.faites > 0).length;
  const finies = feuilles.filter((f) => f.total > 0 && f.faites >= f.total).length;
  return (
    <SousPage
      entete={
        <EnTeteSousPage
          retour={RETOUR.reviser}
          titre={PB.titre}
          ligne={faites > 0 ? FEUILLES_PB.ligne(entamees, finies) : PB.sous}
          illustration={{ nom: "reviser-page-blanche", position: "50% 62%" }}
          heros={faites > 0 ? { valeur: nombre(faites), legende: FEUILLES_PB.herosLegende(total) } : null}
        />
      }
    >
      <Scene>
        <Feuilles feuilles={feuilles} rendue={POSTE_PB.rendue} />
      </Scene>
    </SousPage>
  );
}
