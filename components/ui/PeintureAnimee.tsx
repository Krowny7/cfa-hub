import { Illustration } from "@/components/ui/Illustration";
import { EffetsGrandeSalle, SALLE } from "@/components/ui/peinture/EffetsGrandeSalle";
import { EffetsLice, LICE } from "@/components/ui/peinture/EffetsLice";
import { ScenePeinte } from "@/components/ui/peinture/ScenePeinte";
import { ILLUSTRATIONS, type IllustrationNom } from "@/lib/illustrations";

// Une illustration du site (lib/illustrations.ts), animée quand elle a des
// effets ; sinon une <Illustration /> ordinaire. Même usage qu'elle : le
// parent donne la taille (hauteur, rapport, arrondi, overflow-hidden),
// `position` règle le cadrage (object-position), `decorative` vide le texte
// alternatif. Les effets restent calés sur l'image quel que soit le
// recadrage (peinture/ScenePeinte.tsx).
//
// Animer une autre peinture : un composant d'effets dans components/ui/
// peinture/ (calques en pixels de l'image, voir EffetsGrandeSalle.tsx) et une
// ligne ici.
const ANIMEES: Partial<Record<IllustrationNom, { largeur: number; hauteur: number; Effets: () => React.ReactNode }>> = {
  "classement-grande-salle": { largeur: SALLE.largeur, hauteur: SALLE.hauteur, Effets: EffetsGrandeSalle },
  "classement-lice": { largeur: LICE.largeur, hauteur: LICE.hauteur, Effets: EffetsLice },
};

export function PeintureAnimee({
  nom,
  position = "center",
  decorative = false,
  eager = false,
}: {
  nom: IllustrationNom;
  position?: string;
  decorative?: boolean;
  eager?: boolean;
}) {
  const a = ANIMEES[nom];
  if (!a) return <Illustration nom={nom} position={position} decorative={decorative} eager={eager} />;
  const i = ILLUSTRATIONS[nom];
  return (
    <ScenePeinte src={i.src} alt={decorative ? "" : i.alt} largeur={a.largeur} hauteur={a.hauteur} position={position} eager={eager}>
      <a.Effets />
    </ScenePeinte>
  );
}
