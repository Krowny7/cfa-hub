// Les badges que le joueur peut mettre dans le panneau de sa bannière : ce
// qu'il a gagné, sceaux (au moins l'encre), trophées (un par source et par
// palier) et titres (lib/profil/pieces.ts). Un badge est un identifiant
// (« sceau:assiduite », « trophee:ciblee:3 », « titre:maitre:fsa » : voir
// lib/profil/banniere.ts) ; le serveur refuse tout autre à l'enregistrement
// (validerStyle), l'éditeur propose cette liste.
// Module serveur en pratique : il connaît toutes les pièces (le Codex compris).

import type { Acquis } from "@/lib/profil/acquis";
import { idBadgeSceau, idBadgeTitre, idBadgeTrophee, type GenreBadge } from "@/lib/profil/banniere";
import { piecesDuType, possede } from "@/lib/profil/pieces";
import { nomTrophee } from "@/lib/trophees";
import { titreSceau } from "@/lib/voice-profil";

/** Un badge tel que l'éditeur le propose (données simples, sans catalogue). */
export type BadgeChoix = {
  id: string;
  genre: GenreBadge;
  /** « Assiduité · Encre », « Trophée d'or · Les 30 du jour », « Copiste » */
  nom: string;
  /** une ligne de plus : le nombre de trophées, la description du titre */
  detail: string | null;
};

/** Tout ce que le joueur a gagné et peut afficher : ses sceaux, puis ses trophées, puis ses titres (dans l'ordre de leur catalogue). */
export function badgesGagnes(a: Acquis): BadgeChoix[] {
  const sceaux = a.sceaux.filter((e) => e.palier >= 1).map((e): BadgeChoix => ({ id: idBadgeSceau(e.def.cle), genre: "sceau", nom: titreSceau(e), detail: null }));
  const trophees = (a.trophees?.lignes ?? [])
    .filter((l) => l.n > 0)
    .map((l): BadgeChoix => ({ id: idBadgeTrophee(l.source, l.palier), genre: "trophee", nom: nomTrophee(l), detail: l.n > 1 ? `×${l.n}` : null }));
  const titres = piecesDuType("titre")
    .filter((p) => possede(p, a))
    .map((p): BadgeChoix => ({ id: idBadgeTitre(p.nue), genre: "titre", nom: p.nom, detail: p.description }));
  return [...sceaux, ...trophees, ...titres];
}
