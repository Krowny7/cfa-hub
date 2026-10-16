import { SalleDesTrophees } from "@/components/trophees/SalleDesTrophees";
import { compter, lignesCiblees } from "@/lib/trophees";

type Row = { topic_count: number; trophy_count: number };

// L'ancien bloc « Trophées » (lignes de get_user_practice_trophies), devenu
// un adaptateur : il rend la Salle des trophées réduite à l'entraînement
// ciblé (palier = trophyTier du nombre de matières, comme avant). Le profil et
// Moi lisent maintenant toutes les sources (lireTrophees, SalleDesTrophees).
export function PracticeTrophies({ rows }: { rows: Row[] }) {
  return <SalleDesTrophees compte={compter(lignesCiblees(rows))} complet sources={["ciblee"]} titre="Trophées" />;
}
