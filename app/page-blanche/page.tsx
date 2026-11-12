import { redirect } from "next/navigation";
import { SUBJECTS } from "@/components/reviser/catalog";
import { pad2 } from "@/components/reviser/rail";
import { Presentoir } from "@/components/ui/Presentoir";
import { CadrePrincipal, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { CATALOGUE, lignesDe } from "@/lib/formules";
import { copiesARendre } from "@/lib/formules/tour";
import { topicLabel } from "@/lib/practiceTopics";
import { createClient } from "@/lib/supabase/server";
import { PB } from "@/lib/voice-page-blanche";
import { RETOUR } from "@/lib/voice-reviser";

/** Le code de chaque matière (ETH, QM…), pour la face des feuilles. */
const CODES: Record<string, string> = Object.fromEntries(SUBJECTS.map((x) => [x.key, x.code]));

export const metadata = { title: "La page blanche · Ranked Lobby" };

// La page blanche : le choix de la matière, avec ce qu'il reste à rendre dans chacune.
// Gabarit A des sous-pages : le cadre d'en-tête (retour à Réviser, peinture du palais blanc
// à droite), puis les matières en feuilles blanches sur le marbre (présentoir commun).
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
    aRendre: copiesARendre(m.copies, maitrisees).length,
  }));
  return (
    <SousPage entete={<EnTeteSousPage retour={RETOUR.reviser} titre={PB.titre} ligne={PB.sous} illustration={{ nom: "reviser-page-blanche", position: "50% 62%" }} />}>
      <CadrePrincipal ambiance="marbre" titre={PB.matieresTitre}>
        <Presentoir
          forme="blanche"
          label={PB.matieresTitre}
          pieces={matieres.map(({ m, total, faites, aRendre }, i) => ({
            cle: m.matiere,
            href: `/page-blanche/${m.matiere}`,
            numero: pad2(i + 1),
            code: CODES[m.matiere] ?? m.matiere.slice(0, 3).toUpperCase(),
            titre: topicLabel(m.matiere),
            ligne: `${PB.copies(aRendre)} · ${PB.maitrisees(faites, total)}`,
            pct: total ? Math.round((faites / total) * 100) : null,
          }))}
        />
      </CadrePrincipal>
    </SousPage>
  );
}
