import { PiloteScene } from "@/components/ui/peinture/PiloteScene";
import { position as lirePosition } from "@/components/ui/peinture/geometrie";
import type { CSSProperties } from "react";
import s from "./ScenePeinte.module.css";

/**
 * Une peinture animée : l'image et ses effets dans une même « scène » au
 * rapport de l'image, qui couvre le cadre et se place selon le même
 * object-position que le ferait une <img> en object-cover. Les effets
 * (children) sont des calques posés en % de la scène : ils suivent donc le
 * recadrage (carte haute, vignette portrait, bandeau étroit).
 *
 * Le cadre prend la taille de son parent (width/height 100 %) : le parent doit
 * avoir une taille propre, comme pour <Illustration />. Les effets se figent
 * hors écran (PiloteScene) et disparaissent en mouvement réduit, en mode
 * discret et en capture (ScenePeinte.module.css) : reste l'image seule.
 *
 * Pour animer une autre peinture : un composant d'effets (voir
 * EffetsGrandeSalle.tsx) et une ligne dans PeintureAnimee.tsx.
 */
export function ScenePeinte({
  src,
  alt = "",
  largeur,
  hauteur,
  position = "50% 50%",
  eager = false,
  children,
}: {
  src: string;
  alt?: string;
  largeur: number;
  hauteur: number;
  position?: string;
  eager?: boolean;
  children?: React.ReactNode;
}) {
  const [px, py] = lirePosition(position);
  const style = { "--r": (largeur / hauteur).toFixed(5), "--px": px, "--py": py } as CSSProperties;
  return (
    <div className={s.cadre} style={style}>
      <div className={s.scene} data-scene>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} width={largeur} height={hauteur} loading={eager ? "eager" : "lazy"} decoding="async" draggable={false} className={s.fond} />
        <div aria-hidden className={s.effets}>
          {children}
        </div>
        <PiloteScene />
      </div>
    </div>
  );
}
