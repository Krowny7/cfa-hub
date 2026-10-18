// L'étagère « Mes pièces » (Moi › Mes pièces, V3 §3.8) : toutes les pièces
// de collection rangées en quatre rayons (cadres, bannières, titres,
// folios), celles qu'on possède d'abord, puis les silhouettes avec leur
// consigne en clair et, si une quête du Codex les donne, le lien vers elle
// (dans la fiche de la pièce). Ce module
// prépare des données simples pour l'écran (leur forme : etagere-vue.ts ;
// components/moi/MesPieces.tsx ne charge pas le catalogue) et calcule le style
// qui résulte de « Porter » ou « Retirer » (app/moi/profil/actions.ts).
// Module serveur en pratique : il connaît toutes les pièces (le Codex compris).

import { STYLE_DEFAUT, type StyleProfil } from "@/lib/profil/catalogue";
import { avecBlocFolio } from "@/lib/profil/disposition";
import { PIECES, TYPES_PIECE, possede, programmeCourt, queteDe, type Acquis, type TypePiece } from "@/lib/profil/pieces";
import { RAYONS, type Etagere, type PieceEtagere, type Rayon } from "@/lib/profil/etagere-vue";
import { banniereBouge, cadreBouge } from "@/lib/profil/rendus";
import type { Porte } from "@/lib/profil/styles";

export { RAYONS, resumeEtagere, type Etagere, type PieceEtagere, type Rayon } from "@/lib/profil/etagere-vue";

/** « Sans cadre » n'est pas une pièce : c'est ce que « Retirer » remet. */
const HORS_ETAGERE = new Set(["cadre:aucun"]);

/** La valeur portée d'un type (clé nue), d'après ce qu'enregistre profile_style. */
const porteeDu = (type: TypePiece, porte: Porte): string | null =>
  type === "cadre" ? porte.frame : type === "banniere" ? porte.banner : type === "titre" ? porte.titre : porte.folio;

/** Le lien « Voir la quête » vers la quête du Codex qui donne la pièce. */
export const hrefQuete = (id: string) => `/codex?quete=${encodeURIComponent(id)}`;

/**
 * L'étagère d'un joueur : ce qu'il possède (Acquis complet, lireAcquis) et
 * ce qu'il porte. Dans chaque rayon, les pièces possédées d'abord (dans
 * l'ordre du catalogue), puis les silhouettes. Ce qui est porté compte comme
 * possédé (rien de gagné n'est repris). Les comptes disent ce qui est
 * dessiné : les pièces libres (motifs fixes) comprises.
 */
export function etagere(a: Acquis, porte: Porte, bannerUrl: string | null = null): Etagere {
  const rayons = TYPES_PIECE.map((type): Rayon => {
    const portee = porteeDu(type, porte);
    const pieces = PIECES.filter((p) => p.type === type && !HORS_ETAGERE.has(p.cle)).map((p): PieceEtagere => {
      const estPortee = p.nue === portee && !(type === "banniere" && bannerUrl);
      const possedee = possede(p, a) || p.nue === portee;
      const quete = possedee ? null : queteDe(p);
      return {
        cle: p.cle,
        type,
        nue: p.nue,
        nom: p.nom,
        description: p.description,
        obtention: p.obtention,
        rarete: p.rarete,
        anime: type === "cadre" ? cadreBouge(p.nue) : type === "banniere" ? banniereBouge(p.nue) : false,
        possedee,
        portee: estPortee,
        libre: p.condition === null,
        voirQuete: quete ? hrefQuete(quete) : null,
        programme: programmeCourt(p),
        ...(p.folio ? { folio: { oeuvre: p.folio.oeuvre, image: p.folio.image, anecdote: p.folio.anecdote } } : {}),
      };
    });
    const triees = [...pieces.filter((p) => p.possedee), ...pieces.filter((p) => !p.possedee)];
    return { type, titre: RAYONS[type], pieces: triees, possedees: pieces.filter((p) => p.possedee).length, total: pieces.length };
  });
  return {
    rayons,
    possedees: rayons.reduce((n, r) => n + r.possedees, 0),
    total: rayons.reduce((n, r) => n + r.total, 0),
    folios: rayons.find((r) => r.type === "folio")?.possedees ?? 0,
  };
}

/**
 * Le style après « Porter » (nue) ou « Retirer » (null) une pièce : le
 * cadre revient à « Sans cadre », la bannière au motif par défaut ; porter
 * une bannière retire l'image du joueur (le motif prend sa place) ; porter
 * un folio pose son bloc sur la page s'il n'y est pas (avecBlocFolio : à la
 * première place libre, sinon en tuile).
 */
export function stylePorte(style: StyleProfil, type: TypePiece, nue: string | null): StyleProfil {
  switch (type) {
    case "cadre":
      return { ...style, frame: nue ?? STYLE_DEFAUT.frame };
    case "banniere":
      return nue ? { ...style, banner: nue, bannerUrl: null } : { ...style, banner: STYLE_DEFAUT.banner };
    case "titre":
      return { ...style, titre: nue };
    case "folio":
      return nue ? { ...style, folio: nue, disposition: avecBlocFolio(style.disposition) } : { ...style, folio: null };
  }
}

/** Le folio porté, pour le bloc « Folio » de la page de profil ; aucun, ou inconnu : null. */
export function folioPorte(nue: string | null | undefined): { nom: string; oeuvre: string; image: string | null; anecdote: [string, string]; obtention: string } | null {
  const p = nue ? PIECES.find((x) => x.type === "folio" && x.nue === nue) : null;
  return p?.folio ? { nom: p.nom, oeuvre: p.folio.oeuvre, image: p.folio.image, anecdote: p.folio.anecdote, obtention: p.obtention } : null;
}
