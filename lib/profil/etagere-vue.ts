// L'étagère « Mes pièces » vue de l'écran : la forme des données que le
// serveur prépare (lib/profil/etagere.ts) et les petites règles d'affichage
// (le résumé, ce qui a le droit de bouger, ce qui se retire). Sans le
// catalogue des pièces : le composant client (components/moi/MesPieces.tsx)
// n'importe que d'ici. Module neutre (client et serveur).

import { STYLE_DEFAUT } from "@/lib/profil/catalogue";
import type { Rarete, TypePiece } from "@/lib/profil/pieces";

/** Une pièce telle que l'étagère la montre (données simples, sérialisables). */
export type PieceEtagere = {
  cle: string;
  type: TypePiece;
  nue: string;
  nom: string;
  description: string;
  obtention: string;
  rarete: Rarete;
  /** elle bouge sur le profil (cadre vivant ou dessiné, bannière vivante ou dessinée) */
  anime: boolean;
  possedee: boolean;
  /** elle est portée en ce moment */
  portee: boolean;
  /** libre : pas une pièce de collection (motifs fixes, cadre au pinceau) ; dessinée, donc comptée */
  libre: boolean;
  /** pas encore à soi et donnée par une quête du Codex : « Voir la quête » dans sa fiche (/codex?quete=<id>) */
  voirQuete: string | null;
  /** le nom court de son programme d'origine (« CFA I ») ; pièce globale : null (V3 §1.6) */
  programme: string | null;
  folio?: { oeuvre: string; image: string | null; anecdote: [string, string] };
};

/** `possedees` / `total` : les pièces dessinées dans le rayon (les libres comprises), pour que le compte dise ce qu'on voit. */
export type Rayon = { type: TypePiece; titre: string; pieces: PieceEtagere[]; possedees: number; total: number };

export type Etagere = {
  rayons: Rayon[];
  /** pièces possédées, dans tous les rayons (la somme de leurs comptes) */
  possedees: number;
  /** pièces dessinées en tout */
  total: number;
  /** folios possédés */
  folios: number;
};

export const RAYONS: Record<TypePiece, string> = { cadre: "Cadres", banniere: "Bannières", titre: "Titres", folio: "Folios" };

/** Sur téléphone, au plus deux pièces animées à l'écran (V3 §3.8). */
export const ANIMEES_TELEPHONE = 2;

/** « 23 pièces sur 61 · 4 folios » */
export function resumeEtagere(e: Pick<Etagere, "possedees" | "total" | "folios">): string {
  const pieces = `${e.possedees} ${e.possedees > 1 ? "pièces" : "pièce"} sur ${e.total}`;
  return e.folios > 0 ? `${pieces} · ${e.folios} ${e.folios > 1 ? "folios" : "folio"}` : pieces;
}

/**
 * Les pièces qui ont le droit de bouger, dans l'ordre de l'étagère : les
 * possédées qui bougent ; sur téléphone, les deux premières seulement ;
 * aucune quand une feuille est ouverte (son aperçu bouge à leur place).
 */
export function piecesAnimees(pieces: PieceEtagere[], o: { telephone: boolean; feuille: boolean }): Set<string> {
  const ok = new Set<string>();
  if (o.feuille) return ok;
  for (const p of pieces) {
    if (!p.possedee || !p.anime) continue;
    if (o.telephone && ok.size >= ANIMEES_TELEPHONE) break;
    ok.add(p.cle);
  }
  return ok;
}

/** On peut retirer ce qui est porté, sauf ce qui est déjà le défaut (le motif par défaut). */
export const retirable = (p: Pick<PieceEtagere, "type" | "nue" | "portee">): boolean => p.portee && !(p.type === "banniere" && p.nue === STYLE_DEFAUT.banner) && !(p.type === "cadre" && p.nue === STYLE_DEFAUT.frame);
