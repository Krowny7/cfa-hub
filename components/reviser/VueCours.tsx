import { EtagereCours, HerosHeures, HerosLegendeHeures, LigneCours } from "@/components/reviser/EtagereCours";
import { EnTeteSousPage, Scene, SousPage } from "@/components/ui/SousPage";
import type { EcouteCours } from "@/lib/course-ecoute";
import { VIDEOS } from "@/lib/videos";
import { ETAGERE } from "@/lib/voice-reviser-b";
import { RETOUR } from "@/lib/voice-reviser";

// La page /courses sans requête (direction « le lieu, puis l'objet », 2026-11-13) : la porte (la
// bibliothèque, la peinture de la carte « Cours complets » de Réviser ; « 8 H 40 RESTANTES » lu sur
// l'appareil), puis l'étagère : les livrets, la platine, l'action, et le rayon des vidéos de révision
// (/videos y renvoie). `apercu` : une écoute d'exemple (route d'essai) à la place de l'appareil.
export function VueCours({ apercu }: { apercu?: EcouteCours | null }) {
  return (
    <SousPage
      entete={
        <EnTeteSousPage
          retour={RETOUR.reviser}
          titre={ETAGERE.titre}
          ligne={<LigneCours apercu={apercu} />}
          illustration={{ nom: "reviser-bibliotheque", position: "50% 92%" }}
          heros={{ valeur: <HerosHeures apercu={apercu} />, legende: <HerosLegendeHeures apercu={apercu} /> }}
        />
      }
    >
      <Scene>
        <EtagereCours apercu={apercu} videos={VIDEOS} />
      </Scene>
    </SousPage>
  );
}
