import type { Zone } from "@/components/moi/synthese/types";
import b from "@/components/moi/synthese/Bilan.module.css";

// La barre fine d'une notion : la valeur dans la couleur de sa zone (rouge sous
// 50 %, ambre de 50 à 69, vert « acquis » à 70 et plus), sur un fond qui
// montre les zones, avec le repère pointillé du seuil à 70 %. Un aplat, aucun
// liquide. Rendu serveur, aucun hook.

const COULEUR: Record<Zone, string> = { r: b.zr, a: b.za, e: b.ze };

export function BarreZone({ valeur, ton, aria }: { /** de 0 à 100 */ valeur: number; ton: Zone; aria: string }) {
  return (
    <span className={b.zone} role="img" aria-label={aria}>
      <i className={COULEUR[ton]} style={{ width: `${valeur}%` }} />
      <span className={b.seuil} />
    </span>
  );
}
