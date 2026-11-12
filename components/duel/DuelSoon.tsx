import { EnTeteDuel } from "@/components/duel/DuelLobby";
import { CadreZones, SousPage } from "@/components/ui/SousPage";
import { SOUS_AFFRONTER } from "@/lib/voice-affronter-sous";

// Tant que la migration des duels n'est pas appliquée : un état propre au lieu d'une erreur, sur le
// modèle des sous-pages (l'en-tête commun, puis le cadre, une seule zone).
export function DuelSoon() {
  return (
    <SousPage entete={<EnTeteDuel />}>
      <CadreZones
        gauche={{
          titre: SOUS_AFFRONTER.duel.bientotTitre,
          contenu: <p className="t-body m-0 max-w-[560px] text-muted">{SOUS_AFFRONTER.duel.bientotTexte}</p>,
        }}
      />
    </SousPage>
  );
}
