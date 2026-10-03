import { useLayoutEffect, useRef, useState } from "react";

// Position de l'indicateur glissant d'un contrôle segmenté dont les onglets
// n'ont pas tous la même largeur (sur téléphone, les domaines « bientôt »
// n'affichent que leur icône). Mesuré après rendu ; tant que ce n'est pas
// fait (rendu serveur), `box` vaut null et l'onglet actif porte son propre fond.
// À n'utiliser que dans un composant client.
export function useSegThumb(active: number) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[active];
      if (el) setBox({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active]);

  return { refs, box };
}
