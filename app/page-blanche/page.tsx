import { redirect } from "next/navigation";
import { SUBJECTS } from "@/components/reviser/catalog";
import { pad2 } from "@/components/reviser/rail";
import { Carrousel } from "@/components/ui/Carrousel";
import { Chiffre } from "@/components/ui/Decors";
import { CadreZones, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { CATALOGUE, lignesDe } from "@/lib/formules";
import { topicLabel } from "@/lib/practiceTopics";
import { createClient } from "@/lib/supabase/server";
import { nombre } from "@/lib/voice";
import { PB } from "@/lib/voice-page-blanche";
import { RETOUR } from "@/lib/voice-reviser";

/** Le code de chaque matière (ETH, QM…), pour la face des feuilles. */
const CODES: Record<string, string> = Object.fromEntries(SUBJECTS.map((x) => [x.key, x.code]));

export const metadata = { title: "La page blanche · Ranked Lobby" };

// La page blanche (modèle des sous-pages, 2026-11-12) : l'en-tête (retour à Réviser, peinture du
// palais blanc à droite), puis le cadre à zones : les matières en feuilles blanches sur le carrousel à
// gauche (la feuille de devant ouvre sa séance), et dans la colonne grise les formules maîtrisées sur
// le total.
export default async function PageBlanchePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data } = await supabase.from("formules_maitrise").select("formule").eq("user_id", auth.user.id).eq("maitrisee", true);
  const maitrisees = new Set((data ?? []).map((r) => r.formule as string));

  const matieres = CATALOGUE.map((m) => ({
    m,
    total: lignesDe(m),
    faites: m.copies.reduce((t, c) => t + c.formules.filter((f) => maitrisees.has(f.id)).length, 0),
  }));
  const total = matieres.reduce((t, x) => t + x.total, 0);
  const faites = matieres.reduce((t, x) => t + x.faites, 0);
  return (
    <SousPage entete={<EnTeteSousPage retour={RETOUR.reviser} titre={PB.titre} ligne={PB.sous} illustration={{ nom: "reviser-page-blanche", position: "50% 62%" }} />}>
      <CadreZones
        gauche={{
          titre: PB.choisir,
          contenu: (
            <Carrousel
              forme="blanche"
              action={PB.ouvrir}
              pieces={matieres.map(({ m }, i) => ({
                cle: m.matiere,
                href: `/page-blanche/${m.matiere}`,
                numero: pad2(i + 1),
                code: CODES[m.matiere] ?? m.matiere.slice(0, 3).toUpperCase(),
                titre: topicLabel(m.matiere),
              }))}
            />
          ),
        }}
        droite={{ titre: PB.tesFormules, contenu: <Chiffre valeur={nombre(faites)} legende={PB.formulesSur(total)} /> }}
      />
    </SousPage>
  );
}
