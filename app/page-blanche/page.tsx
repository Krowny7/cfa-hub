import Link from "next/link";
import { redirect } from "next/navigation";
import { EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { CATALOGUE, lignesDe } from "@/lib/formules";
import { copiesARendre } from "@/lib/formules/tour";
import { topicLabel } from "@/lib/practiceTopics";
import { createClient } from "@/lib/supabase/server";
import { PB } from "@/lib/voice-page-blanche";
import { RETOUR } from "@/lib/voice-reviser";
import s from "@/components/page-blanche/PageBlanche.module.css";

export const metadata = { title: "La page blanche · Ranked Lobby" };

// La page blanche : le choix de la matière, avec ce qu'il reste à rendre dans chacune.
// Gabarit A des sous-pages : le cadre d'en-tête (retour à Réviser, peinture du palais blanc
// à droite), puis la liste des matières.
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
      <ul className={s.matieres}>
        {matieres.map(({ m, total, faites, aRendre }) => (
          <li key={m.matiere}>
            <Link href={`/page-blanche/${m.matiere}`} className={s.matiere}>
              <b>{topicLabel(m.matiere)}</b>
              <span className={s.reste}>{PB.copies(aRendre)}</span>
              <span className={s.jauge} aria-hidden>
                <i style={{ width: `${total ? (faites / total) * 100 : 0}%` }} />
              </span>
              <span className={s.compte}>{PB.maitrisees(faites, total)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </SousPage>
  );
}
