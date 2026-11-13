import { ChargementSousPage } from "@/components/ui/ChargementSousPage";

// Le chargement de la sous-page : la porte, puis la rangée face cachée (components/ui/ChargementSousPage).
export default function Loading() {
  return <ChargementSousPage rangee={{ n: 5, taille: [156, 224], arrondi: "78px 78px 3px 3px" }} />;
}
