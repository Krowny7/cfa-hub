// Annonce un dévoilement à la barre de navigation (l'onglet s'encre) et à
// Léonard (il dit sa réplique, une fois par pièce). Module client : sans effet
// côté serveur.

import { EVENEMENT_DEVOILE, type Devoile } from "@/lib/codex/devoile-lite";
import { signalerLeonard } from "@/lib/leonard/signal";

export function annoncerDevoile(devoile: Devoile, nouveaux: { id: string; replique: string | null }[] = []) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENEMENT_DEVOILE, { detail: { devoile, nouveaux: devoile === "tout" ? [] : nouveaux.map((n) => n.id) } }));
  // Léonard ne commente que l'ouverture d'un compte neuf (pas « Tout montrer »), une fois par vague, et une vague à la fois
  const premier = devoile === "tout" ? null : nouveaux.find((n) => n.replique);
  if (premier?.replique) signalerLeonard({ evt: "devoile", replique: { texte: premier.replique, pose: "fier" }, delai: 1400 }, `devoile:${premier.id}`);
}
