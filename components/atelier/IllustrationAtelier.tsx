/**
 * L'illustration de la carte de l'Atelier (S'entraîner). En attendant
 * l'établi de Léonard (une image fixe, qu'on animera ensuite), Léonard
 * détouré posé sur un fond calme. Pur décor : alt vide, aria-hidden. Le
 * cadre (taille, arrondi, place dans la grille) vient de className ; l'image
 * se cale en bas, au centre. À remplacer sans toucher à CarteAtelier.
 */
export function IllustrationAtelier({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={"relative overflow-hidden bg-[var(--paper-2)] " + className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/leonard/base.webp"
        alt=""
        width={598}
        height={660}
        loading="eager"
        decoding="async"
        fetchPriority="high"
        draggable={false}
        className="absolute bottom-0 left-1/2 h-[96%] w-auto max-w-none -translate-x-1/2 select-none"
      />
    </div>
  );
}
