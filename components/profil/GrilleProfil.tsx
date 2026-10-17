import type { CaseGrille, Disposition, PlaceVide } from "@/lib/profil/disposition";
import { cleDe, estLibre, placesVides, rangees } from "@/lib/profil/disposition";
import g from "./GrilleProfil.module.css";

// La grille de la page de profil, sous l'en-tête : les éléments de la liste
// dans l'ordre, rangés tout seuls sur 12 colonnes aux 3 formats du site
// (tuile 4, héros 8, bande 12 : lib/profil/disposition.ts, rangees). Toutes
// les cases d'une rangée ont la même hauteur (les bas s'alignent) ; hors
// bande, une rangée fait au moins 260 px. Sous 1 024 px : une colonne, dans
// le même ordre. Une place libre n'est jamais comblée par un élargissement.
// Vue publique : une case sans contenu garde sa place sur ordinateur (vide)
// et disparaît sur téléphone ; une rangée sans rien à montrer est sautée.
// Personnaliser (`edition`) : aucune rangée sautée, data-case sur chaque
// case (l'index de l'élément), data-place sur chaque fin de rangée (le
// numéro de la rangée), pour viser au glisser ; ses places libres ne
// jouent que dès 1 024 px (une colonne n'en a pas : ni case, ni écart en
// trop au téléphone). Sans état et sans base : la
// page l'emploie par PageProfil (client), l'éditeur directement.

const PORTEE = { tuile: g.p4, heros: g.p8, bande: g.p12 };
/** quelque chose à rendre (ni null, ni undefined, ni false) */
const rendu = (x: React.ReactNode) => x !== null && x !== undefined && x !== false;

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
  /** une place vide (élément « libre » ou fin de rangée) ; absent : rien n'est rendu */
  libre?: (p: PlaceVide) => React.ReactNode;
  /** une rangée de plus, après la liste : une tuile (l'invitation à poser une image, sur sa page par défaut sans place libre) */
  apres?: React.ReactNode;
  /** Personnaliser : aucune rangée sautée, data-case sur chaque case, data-place sur chaque fin de rangée */
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
    const fin = places.find((x) => x.i === null);
    const finRendue = libre && fin ? libre(fin) : null;
    const montre = contenus.some(rendu) || libres.some(rendu) || rendu(finRendue);
    return { r, k, contenus, libres, fin, finRendue, montre };
  });
  return (
    <div className={g.grille}>
      {lignes
        .filter((l) => edition || l.montre)
        .map(({ r, k, contenus, libres, fin, finRendue }) => (
          <div
            key={k}
            className={g.rangee + (r.cases.every((c) => c.f === "bande") ? "" : " " + g.haute) + (edition && r.cases.every((c) => estLibre(c.e)) ? " " + g.placeEdition : "")}
          >
            {r.cases.map((c, n) => {
              const cle = cleDe(c.e, c.i);
              const contenu = estLibre(c.e) ? libres[n] : contenus[n];
              return rendu(contenu) ? (
                <div key={cle} data-case={edition ? c.i : undefined} className={`@container ${g.case} ${PORTEE[c.f]}` + (edition && estLibre(c.e) ? " " + g.placeEdition : "")}>
                  {contenu}
                </div>
              ) : (
                <div key={cle} aria-hidden className={`${g.vide} ${PORTEE[c.f]}`} />
              );
            })}
            {/* la portée par classe (et non en style) : sous 1 024 px, un « span » ouvrirait des colonnes */}
            {fin && rendu(finRendue) && (
              <div key={`fin-${k}`} data-place={edition ? k : undefined} className={`${g.case} ${r.libre === 4 ? g.p4 : g.p8}` + (edition ? " " + g.placeEdition : "")}>
                {finRendue}
              </div>
            )}
          </div>
        ))}
      {rendu(apres) && (
        <div className={g.rangee}>
          <div className={`@container ${g.case} ${g.p4}`}>{apres}</div>
        </div>
      )}
    </div>
  );
}
