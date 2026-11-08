import type { ComponentPropsWithRef } from "react";
import { CADRE_CENTRE, type Cadre } from "@/lib/arene/perso";
import s from "./Arene.module.css";

// La vidéo de victoire dans la fenêtre de son cadre peint, recadrée comme le
// joueur l'a réglé dans Personnaliser : le point gardé (object-position) et le
// zoom autour de ce point. La fenêtre coupe ce qui dépasse.

export function VideoCadree({ cadre, ...props }: ComponentPropsWithRef<"video"> & { cadre?: Cadre | null }) {
  const c = cadre ?? CADRE_CENTRE;
  const point = `${c.x}% ${c.y}%`;
  return (
    <div className={s.videoImg}>
      <video {...props} className={s.videoPleine} style={{ objectPosition: point, transformOrigin: point, transform: c.z > 1 ? `scale(${c.z})` : undefined }} />
    </div>
  );
}
