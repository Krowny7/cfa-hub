import { EffetsAtelier } from "@/components/atelier/EffetsAtelier";
import s from "./IllustrationAtelier.module.css";

/**
 * L'illustration de la carte de l'Atelier (S'entraîner) : l'établi de
 * Léonard, la nuit. Le serveur rend l'image fixe ; les effets (EffetsAtelier)
 * naissent après montage, dans le navigateur. Pur décor : alt vide,
 * aria-hidden. Le cadre (taille, arrondi, place dans la grille) vient de
 * className ; l'image le couvre, centrée (carte 16:10), ou décalée vers la
 * lanterne et le chat en vignette portrait (4:5).
 */
export function IllustrationAtelier({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={s.cadre + " " + className}>
      <div className={s.scene}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/atelier/etabli-1024.webp"
          srcSet="/atelier/etabli-640.webp 640w, /atelier/etabli-1024.webp 1024w"
          sizes="(min-width: 1024px) 34vw, 200px"
          alt=""
          width={1024}
          height={572}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          draggable={false}
        />
        <EffetsAtelier />
      </div>
    </div>
  );
}
