import type { CaseGrille, Disposition, PlaceVide } from "@/lib/profil/disposition";
import { cleDe, estLibre, hauteur, placesVides, portee, rangees } from "@/lib/profil/disposition";
import g from "./GrilleProfil.module.css";

// La grille de la page de profil, sous l'en-tête : les éléments de la liste
// dans l'ordre, rangés tout seuls sur 12 colonnes aux 4 formats du site
// (tuile 4, héros 8, bande 12, colonne 4 sur deux lignes :
// lib/profil/disposition.ts, rangees). Chaque case est posée à sa place
// (colonne et ligne de départ, portée) dès 1 024 px ; une rangée double
// (une colonne) a deux lignes. Toutes les cases d'une ligne ont la même
// hauteur (les bas s'alignent) ; hors bande, une ligne fait au moins
// 260 px. Sous 1 024 px : une colonne, dans le même ordre. Une place libre
// n'est jamais comblée par un élargissement.
// Vue publique : une case sans contenu garde sa place sur ordinateur (vide)
// et disparaît sur téléphone ; une rangée sans rien à montrer est sautée ;
// dans une rangée double, une ligne qui n'a rien à montrer tombe : la
// colonne se pose alors sur une seule ligne (sinon elle dépasserait de
// l'autre, ou commencerait trop haut).
// Personnaliser (`edition`) : aucune rangée sautée, data-case sur chaque
// case (l'index de l'élément), data-place sur chaque fin de ligne
// (« rangée:ligne »), pour viser au glisser ; ses places libres ne jouent
// que dès 1 024 px (une colonne n'en a pas : ni case, ni écart en trop au
// téléphone). Sans état et sans base : la page l'emploie par PageProfil
// (client), l'éditeur directement.

/** quelque chose à rendre (ni null, ni undefined, ni false) */
const rendu = (x: React.ReactNode) => x !== null && x !== undefined && x !== false;
/** la place d'une case dès 1 024 px, en variables (sous 1 024 px, rien ne les lit : pas de colonnes ouvertes) */
const placeDe = (col: number, ligne: number, span: number, haut: number) =>
  ({ ["--c" as string]: col, ["--l" as string]: ligne, ["--s" as string]: span, ["--h" as string]: haut }) as React.CSSProperties;

export function GrilleProfil({
  disposition,
  rendre,
  libre,
  apres,
  edition = false,
}: {
  disposition: Disposition;
  /** le contenu d'une case : un bloc à son format ; null : rien à montrer (la case garde sa place, vide, sur ordinateur) */
  rendre: (c: CaseGrille) => React.ReactNode;
  /** une place vide (élément « libre » ou fin de ligne) ; absent : rien n'est rendu */
  libre?: (p: PlaceVide) => React.ReactNode;
  /** une rangée de plus, après la liste : une tuile (l'invitation à poser une image, sur sa page par défaut sans place libre) */
  apres?: React.ReactNode;
  /** Personnaliser : aucune rangée sautée, data-case sur chaque case, data-place sur chaque fin de ligne */
  edition?: boolean;
}) {
  const lignes = rangees(disposition).map((r, k) => {
    const places = placesVides(r, k);
    const contenus = r.cases.map((c) => (estLibre(c.e) ? null : rendre(c)));
    const libres = r.cases.map((c) => {
      if (!estLibre(c.e) || !libre) return null;
      const p = places.find((x) => x.i === c.i);
      return p ? libre(p) : null;
    });
    const fins = r.fins.map((fin) => {
      const p = places.find((x) => x.i === null && x.ligne === fin.ligne);
      return { fin, rendue: libre && p ? libre(p) : null };
    });
    const montre = contenus.some(rendu) || libres.some(rendu) || fins.some((f) => rendu(f.rendue));
    // rangée double, vue publique : quelles lignes montrent quelque chose (hors la colonne elle-même)
    const rend = (l: 1 | 2) =>
      r.cases.some((c, n) => c.ligne === l && c.f !== "colonne" && rendu(estLibre(c.e) ? libres[n] : contenus[n])) || fins.some((f) => f.fin.ligne === l && rendu(f.rendue));
    const lignesVues = r.lignes === 2 && !edition ? { 1: rend(1), 2: rend(2) } : null;
    return { r, k, contenus, libres, fins, montre, lignesVues };
  });
  return (
    <div className={g.grille}>
      {lignes
        .filter((l) => edition || l.montre)
        .map(({ r, k, contenus, libres, fins, lignesVues }) => (
          <div
            key={k}
            className={g.rangee + (r.cases.every((c) => c.f === "bande") ? "" : " " + g.haute) + (edition && r.cases.every((c) => estLibre(c.e)) ? " " + g.placeEdition : "")}
          >
            {r.cases.map((c, n) => {
              const cle = cleDe(c.e, c.i);
              const contenu = estLibre(c.e) ? libres[n] : contenus[n];
              // vue publique, rangée double : une ligne vide tombe (ses cases vides avec elle), la colonne tient une ligne
              const seule = lignesVues && !(lignesVues[1] && lignesVues[2]);
              if (seule && c.f !== "colonne" && !lignesVues[c.ligne]) return null;
              const ligne = seule ? 1 : c.ligne;
              const place = placeDe(c.col, ligne, portee(c.f), seule ? 1 : hauteur(c.f));
              return rendu(contenu) ? (
                <div key={cle} data-case={edition ? c.i : undefined} style={place} className={`@container ${g.case}` + (edition && estLibre(c.e) ? " " + g.placeEdition : "")}>
                  {contenu}
                </div>
              ) : (
                <div key={cle} aria-hidden style={place} className={g.vide} />
              );
            })}
            {fins.map(
              ({ fin, rendue }) =>
                rendu(rendue) && (
                  <div
                    key={`fin-${k}-${fin.ligne}`}
                    data-place={edition ? `${k}:${fin.ligne}` : undefined}
                    style={placeDe(fin.col, lignesVues && !(lignesVues[1] && lignesVues[2]) ? 1 : fin.ligne, fin.portee, 1)}
                    className={g.case + (edition ? " " + g.placeEdition : "")}
                  >
                    {rendue}
                  </div>
                ),
            )}
          </div>
        ))}
      {rendu(apres) && (
        <div className={g.rangee}>
          <div className={`@container ${g.case}`} style={placeDe(1, 1, 4, 1)}>
            {apres}
          </div>
        </div>
      )}
    </div>
  );
}
