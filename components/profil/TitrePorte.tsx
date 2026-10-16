// Le titre porté par un joueur (« Copiste », « Maître de Fixed Income »), sous
// son pseudo : une ligne discrète en petites capitales, 32 caractères au plus
// (au-delà, une ellipse ; le titre entier au survol). Sans titre : rien.
// En-tête du profil, carte de joueur, podium du classement (V3 §3.7). Une
// balise en ligne (rendue en bloc) : elle se pose aussi dans un lien.

/** Les caractères visibles d'un titre, au plus. */
export const TITRE_MAX = 32;

/** Le titre tel qu'il s'affiche : coupé à 32 caractères, avec une ellipse. */
export const titreCourt = (titre: string): string => (titre.length > TITRE_MAX ? `${titre.slice(0, TITRE_MAX - 1).trimEnd()}…` : titre);

export function TitrePorte({ titre, className = "" }: { titre: string | null | undefined; className?: string }) {
  if (!titre) return null;
  return (
    <span className={`t-micro block max-w-full truncate tracking-[0.06em] [font-variant-caps:all-small-caps] ${className}`} title={titre.length > TITRE_MAX ? titre : undefined}>
      {titreCourt(titre)}
    </span>
  );
}
