import { ChargementSousPage } from "@/components/ui/ChargementSousPage";

// Le chargement de la sous-page : la porte, puis la rangée face cachée (components/ui/ChargementSousPage).
export default function Loading() {
  return <ChargementSousPage rangee={{ n: 4, taille: [226, 328] }} />;
}
