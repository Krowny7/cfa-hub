"use client";

import { GrilleProfil } from "@/components/profil/GrilleProfil";
import { BlocProfil } from "@/components/profil/BlocsProfil";
import { aDuContenu, type DonneesBlocs } from "@/lib/profil/blocs-donnees";
import type { Bloc, Disposition } from "@/lib/profil/disposition";

// L'onglet Profil d'un joueur, sous l'en-tête : ses blocs dans l'ordre, à
// leurs formats, sur la grille de la page (GrilleProfil). Les données des
// blocs arrivent une seule fois, en un objet sérialisable (DonneesBlocs) :
// le poids de la page n'est pas multiplié par le nombre de blocs. Un bloc
// sans contenu garde sa place vide sur ordinateur ; les places libres ne se
// voient pas, sauf `libre` (sur sa propre page par défaut : l'invitation à
// poser une image), ou `apres` quand cette page n'a pas de place libre.

export function PageProfil({
  disposition,
  donnees,
  libre,
  apres,
}: {
  disposition: Disposition;
  donnees: DonneesBlocs;
  /** ce qu'on pose dans les places vides (le propriétaire, sur la page par défaut : CaseImage) ; absent : rien */
  libre?: React.ReactNode;
  /** une tuile sous la grille (la même invitation, quand la page par défaut est pleine) ; absent : rien */
  apres?: React.ReactNode;
}) {
  return (
    <GrilleProfil
      disposition={disposition}
      rendre={(c) => (aDuContenu(c.e as Bloc, donnees) ? <BlocProfil bloc={c.e as Bloc} f={c.f} d={donnees} /> : null)}
      libre={libre ? () => libre : undefined}
      apres={apres}
    />
  );
}
