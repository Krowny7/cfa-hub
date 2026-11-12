import { notFound, redirect } from "next/navigation";
import { BoutonRejoindre } from "@/components/salles/BoutonRejoindre";
import { FormCode } from "@/components/salles/FormCode";
import { SalleVue } from "@/components/salles/SalleVue";
import { Stage } from "@/components/salles/Stage";
import { EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { getEtatSalle, getSallesPubliques } from "@/lib/salles/api";
import { createClient } from "@/lib/supabase/server";
import { SALLES } from "@/lib/voice-salles";
import { RETOUR_SALLES } from "@/lib/voice-affronter-sous";
import s from "@/components/salles/Salles.module.css";

export const metadata = { title: "Salle · Ranked Lobby" };

const ILLUSTRATION = { nom: "salles-entree", position: "50% 55%" } as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PageProps = { params: Promise<{ id: string }> };

// Le salon d'une salle (/salles/<id>) : lit l'état une première fois côté
// serveur (membres, dernière partie), puis SalleVue le suit en direct depuis le
// navigateur. Pas membre : si la salle est publique, un bouton pour la
// rejoindre ; sinon le champ du code. Sans la migration : « les salles arrivent ».
// Le haut suit le modèle des sous-pages : le retour commun vers /salles, le nom de la salle en titre
// (une seule fois) ; le salon pose lui-même son en-tête (pas pendant une partie).
export default async function SallePage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const lu = await getEtatSalle(supabase, id, 0);
  if (lu.ok) {
    // decalageMs est celui du serveur Next : le navigateur le remesure dès son arrivée
    const { decalageMs: _decalage, ...etat } = lu.data;
    void _decalage;
    return (
      <SousPage entete={null}>
        <SalleVue salleId={id} initial={etat} />
      </SousPage>
    );
  }

  if (lu.migrationAbsente) {
    return (
      <SousPage entete={<EnTeteSousPage retour={RETOUR_SALLES} titre={SALLES.titre} illustration={ILLUSTRATION} />}>
        <Stage>
          <p className={s.entreeBientot}>
            <i className={[s.point, s.pointVif].join(" ")} aria-hidden style={{ color: "var(--sl-vermillon)" }} />
            {SALLES.bientot}
          </p>
        </Stage>
      </SousPage>
    );
  }

  // pas membre (ou salle supprimée) : une salle publique s'offre à la rejoindre
  const publiques = await getSallesPubliques(supabase);
  const publique = publiques.ok ? publiques.data.find((p) => p.id === id) : undefined;
  return (
    <SousPage entete={<EnTeteSousPage retour={RETOUR_SALLES} titre={publique ? publique.nom : SALLES.introuvable} illustration={ILLUSTRATION} />}>
      <Stage>
        {publique ? (
          <>
            <p className={s.sous}>{SALLES.introuvablePublique}</p>
            <div>
              <BoutonRejoindre salleId={publique.id} nom={publique.nom} />
            </div>
          </>
        ) : (
          <>
            <p className={s.sous}>{SALLES.introuvableTexte}</p>
            <div style={{ maxWidth: 520 }}>
              <FormCode id="salle-introuvable-code" />
            </div>
          </>
        )}
      </Stage>
    </SousPage>
  );
}
