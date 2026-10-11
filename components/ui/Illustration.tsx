import { ILLUSTRATIONS, type IllustrationNom } from "@/lib/illustrations";
import s from "./Illustration.module.css";

// Une illustration du site (lib/illustrations.ts) qui couvre son cadre : le
// parent donne la taille (hauteur, rapport, arrondi, overflow-hidden).
// `position` règle le cadrage (object-position), `decorative` vide le texte
// alternatif quand le titre voisin dit déjà tout. Sans état.
export function Illustration({
  nom,
  position = "center",
  decorative = false,
  eager = false,
  className = "",
}: {
  nom: IllustrationNom;
  position?: string;
  decorative?: boolean;
  eager?: boolean;
  className?: string;
}) {
  const i = ILLUSTRATIONS[nom];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={i.src} alt={decorative ? "" : i.alt} loading={eager ? "eager" : "lazy"} decoding="async" className={s.img + " " + className} style={{ objectPosition: position }} />
  );
}
