import { brush, ringPts, stroke, type Pt } from "@/components/ink/geometry";

/**
 * Icônes maison, tracées au pinceau : chaque trait a son appui (attaque
 * ronde) et sa levée (pointe effilée), dans une grille de 24. Elles prennent
 * la couleur du texte (currentColor) et restent lisibles dès 16 px.
 *
 * Douze icônes aux endroits clés : l'accueil (l'anneau du logo), les quatre
 * espaces (réviser, s'entraîner, classement, moi), puis duel, examen, fiche,
 * cours, flashcards, erreurs (la rature) et série (les bâtons).
 *
 * Props :
 * - `nom` : IconeNom
 * - `size` : px (défaut 20)
 * - `appui` : épaisseur relative (1 au repos ; 1.15 pour un onglet actif)
 * - `title` : libellé (sinon l'icône est décorative, aria-hidden)
 * - `className`
 *
 * Sans état ni hook : utilisable côté serveur. Les tracés sont calculés une
 * fois par module (graines fixes, même rendu partout), quelques centaines
 * d'octets chacun.
 */
export type IconeNom =
  | "accueil"
  | "reviser"
  | "entrainer"
  | "classement"
  | "moi"
  | "duel"
  | "examen"
  | "fiche"
  | "cours"
  | "flashcards"
  | "erreurs"
  | "serie";

export const ICONES: IconeNom[] = ["accueil", "reviser", "entrainer", "classement", "moi", "duel", "examen", "fiche", "cours", "flashcards", "erreurs", "serie"];

/** Icône de chaque espace (lib/nav.ts) */
export const ICONE_ESPACE = { reviser: "reviser", entrainer: "entrainer", classement: "classement", moi: "moi" } as const satisfies Record<string, IconeNom>;

type S = { p: Pt[]; w: number; end?: number; attack?: number; per?: number };

// Un trait : points de passage, épaisseur d'appui, épaisseur relative à la levée.
const s = (p: Pt[], w = 2.5, end = 0.42, attack = 0.14): S => ({ p, w, end, attack });

/** Arc de cercle de a0 à a1 (degrés, 0 = droite, sens horaire). */
function arc(cx: number, cy: number, r: number, a0: number, a1: number, n = 9): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / (n - 1)) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Pt;
  });
}

const GLYPHS: Record<Exclude<IconeNom, "accueil">, S[]> = {
  // un livre ouvert : deux pages tracées depuis le dos, puis le dos
  reviser: [
    s([[11.6, 6.6], [8, 5.2], [3.6, 5.6], [3.4, 11.5], [3.6, 17.6], [8, 17.3], [11.6, 19]], 2.3, 0.5),
    s([[12.4, 6.6], [16, 5.2], [20.4, 5.6], [20.6, 11.5], [20.4, 17.6], [16, 17.3], [12.4, 19]], 2.3, 0.5),
    s([[12, 7.4], [12, 18.2]], 1.5, 0.6, 0.2),
  ],
  // la cible : un cercle presque fermé, le point au centre
  entrainer: [
    s(arc(12, 12, 8.3, -70, 248, 12), 2.5, 0.35),
  ],
  // deux chevrons de rang
  classement: [
    s([[4.6, 12.8], [9.2, 8.4], [12, 6], [14.8, 8.4], [19.4, 12.8]], 2.6, 0.45),
    s([[4.6, 19.2], [9.2, 14.8], [12, 12.4], [14.8, 14.8], [19.4, 19.2]], 2.6, 0.45),
  ],
  // une tête, des épaules
  moi: [
    s(arc(12, 8, 3.9, -80, 262, 11), 2.3, 0.45),
    s([[4.4, 20.4], [5.8, 16.3], [9, 14.4], [12, 14], [15, 14.4], [18.2, 16.3], [19.6, 20.4]], 2.5, 0.4),
  ],
  // deux lames croisées, avec leurs gardes
  // (la lame part de la garde et s'affine vers la pointe ; la poignée dépasse
  // la garde, pour ne pas lire une croix aux petites tailles)
  duel: [
    s([[7.6, 16.4], [14, 10], [20.4, 3.6]], 2.2, 0.25, 0.1),
    s([[16.4, 16.4], [10, 10], [3.6, 3.6]], 2.2, 0.25, 0.1),
    s([[5.7, 14.5], [9.5, 18.3]], 1.9, 0.85, 0.3),
    s([[18.3, 14.5], [14.5, 18.3]], 1.9, 0.85, 0.3),
    s([[7.4, 16.6], [4.4, 19.6]], 2.3, 0.9, 0.2),
    s([[16.6, 16.6], [19.6, 19.6]], 2.3, 0.9, 0.2),
  ],
  // le sablier de l'épreuve chronométrée
  examen: [
    s([[5.4, 3.8], [18.6, 3.8]], 2.3, 0.55, 0.2),
    s([[5.4, 20.2], [18.6, 20.2]], 2.3, 0.55, 0.2),
    s([[7.2, 4.6], [8.4, 8.8], [12, 12], [15.6, 15.2], [16.8, 19.4]], 2.1, 0.55),
    s([[16.8, 4.6], [15.6, 8.8], [12, 12], [8.4, 15.2], [7.2, 19.4]], 2.1, 0.55),
  ],
  // une page au coin plié, deux lignes
  fiche: [
    s([[18.4, 8.8], [18.5, 14.5], [18.3, 20.3], [12, 20.5], [5.8, 20.4], [5.6, 12], [5.9, 3.7], [10.5, 3.6], [14.2, 3.6], [18.2, 8.1]], 2.2, 0.55),
    s([[14.2, 4.2], [14.3, 8.5], [17.8, 8.6]], 1.5, 0.6, 0.2),
    s([[8.8, 12.6], [15.2, 12.4]], 1.9, 0.5, 0.2),
    s([[8.8, 16.2], [13.2, 16.1]], 1.9, 0.5, 0.2),
  ],
  // le tableau du cours, sur son chevalet, et la lecture
  cours: [
    s([[3.8, 4.6], [12, 4.4], [20.2, 4.6], [20.2, 10], [20, 15], [12, 15.2], [4, 15], [3.8, 9.6], [3.9, 5.2]], 2.2, 0.55),
    s([[8.8, 15.6], [6.8, 20.6]], 2, 0.5, 0.2),
    s([[15.2, 15.6], [17.2, 20.6]], 2, 0.5, 0.2),
    s([[10.5, 7.2], [15, 9.8], [10.5, 12.4], [10.4, 7.8]], 1.8, 0.7, 0.2),
  ],
  // deux cartes, l'une derrière l'autre
  flashcards: [
    s([[8, 3.6], [14, 3.4], [20.2, 3.6], [20.4, 9.5], [20.2, 15.6]], 2, 0.45),
    s([[4, 8], [10, 7.8], [16, 8], [16.2, 14.2], [16, 20.4], [10, 20.6], [4, 20.4], [3.8, 14.2], [4, 8.6]], 2.3, 0.55),
  ],
  // la rature : un mot rayé d'un trait sûr, la ligne suivante intacte
  erreurs: [
    s([[4, 10.2], [12, 9.9], [20, 10.1]], 2.3, 0.6, 0.18),
    s([[3.4, 14.4], [12, 9.9], [20.8, 5.4]], 2.5, 0.3),
    s([[4, 17], [9, 16.8], [14, 17]], 2.2, 0.55, 0.18),
  ],
  // les bâtons : quatre traits, une barre en travers
  serie: [
    s([[5.6, 4.4], [5.5, 19.6]], 2.2, 0.45, 0.18),
    s([[9.6, 4.2], [9.7, 19.8]], 2.2, 0.45, 0.18),
    s([[13.6, 4.4], [13.4, 19.6]], 2.2, 0.45, 0.18),
    s([[17.6, 4.2], [17.8, 19.6]], 2.2, 0.45, 0.18),
    s([[2.6, 16.4], [12, 11.8], [21.4, 7]], 2.4, 0.35),
  ],
};

/** Points d'encre ronds (cx, cy, r), en plus des traits. */
const DOTS: Partial<Record<IconeNom, [number, number, number][]>> = {
  entrainer: [[12, 12, 2.1]],
};
const dot = ([cx, cy, r]: [number, number, number]) => `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;

const cache = new Map<string, string[]>();

// Un <path> par trait : deux traits qui se croisent dans un même tracé
// pourraient s'annuler (règle de remplissage) et laisser un trou.
function pathsFor(nom: IconeNom, appui: number): string[] {
  const key = nom + ":" + appui.toFixed(2);
  let d = cache.get(key);
  if (d) return d;
  if (nom === "accueil") {
    // l'anneau du logo, en miniature : trait à 74 %, pointe sèche
    d = [brush(ringPts(12, 12, 8.3), 0, 0.745, 3.1 * appui, 7, { inT: 0.05, outT: 0.26, var: 0.08, wobble: 0.12, n: 90 })];
  } else {
    d = GLYPHS[nom].map((g, i) => stroke(g.p, { w: g.w * appui, end: g.end, attack: g.attack, jitter: 0.06, seed: 17 + i * 13, per: g.per ?? 7 }));
    for (const p of DOTS[nom] ?? []) d.push(dot([p[0], p[1], p[2] * appui]));
  }
  cache.set(key, d);
  return d;
}

export function Icone({
  nom,
  size = 20,
  appui = 1,
  title,
  className = "",
}: {
  nom: IconeNom;
  size?: number;
  appui?: number;
  title?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      className={"shrink-0 " + className}
    >
      {title ? <title>{title}</title> : null}
      {pathsFor(nom, appui).map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
