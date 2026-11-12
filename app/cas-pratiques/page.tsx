import { redirect } from "next/navigation";
import { OuEnEs } from "@/components/cas-fsa/OuEnEs";
import { numeroPiece } from "@/components/entrainement/pieces";
import { Carrousel } from "@/components/ui/Carrousel";
import type { Piece } from "@/components/ui/Presentoir";
import { CadreZones, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { CAS_FSA } from "@/lib/cas-fsa";
import { createClient } from "@/lib/supabase/server";
import { CAS } from "@/lib/voice-cas-fsa";
import { RETOUR_ENTRAINEMENT, SOUS_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";

export const metadata = { title: "Cas pratiques · Ranked Lobby" };

// Les cas pratiques de FSA, sur le modèle des sous-pages validé par Théo (2026-11-12) : l'en-tête
// commun (la peinture du lieu à droite), puis le cadre à zones : les dossiers sur le carrousel à
// gauche (le dossier de devant s'ouvre), les dossiers bouclés dans la colonne grise. Pas d'annexe.
export default async function CasPratiquesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const pieces: Piece[] = CAS_FSA.map((c, i) => ({
    cle: c.id,
    href: `/cas-pratiques/${c.id}`,
    numero: numeroPiece(i),
    code: c.societe,
    titre: c.societe,
  }));

  return (
    <SousPage entete={<EnTeteSousPage retour={RETOUR_ENTRAINEMENT} titre={CAS.titre} ligne={CAS.sous} illustration={{ nom: "practice-studiolo", position: "50% 68%" }} />}>
      <CadreZones
        gauche={{ titre: SOUS_ENTRAINEMENT.cas.choisir, contenu: <Carrousel forme="dossier" pieces={pieces} action={SOUS_ENTRAINEMENT.cas.ouvrir} /> }}
        droite={{ titre: SOUS_ENTRAINEMENT.cas.ouEnEs, contenu: <OuEnEs cas={CAS_FSA.map((c) => ({ id: c.id, etapes: c.etapes.map((e) => e.id) }))} /> }}
      />
    </SousPage>
  );
}
