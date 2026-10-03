import { createElement } from "react";

// Apparition explicite, pour un bloc que les règles globales ne prennent pas
// (elles visent déjà .rl-page > *, .rl-section > *, .rl-wide > * et les
// grilles de cartes). Sans état : utilisable côté serveur.
//  - par défaut, le bloc entre quand on le fait défiler jusqu'à lui (moteur
//    components/ui/motion/engine.ts) ; né à l'écran, il est simplement là ;
//  - `stagger` : ses enfants entrent en cascade, à l'écran comme au défilement
//    (classe .rl-stagger), après `delay` secondes.
// Sans JavaScript ou avec le mouvement réduit, tout est visible tout de suite.

type Tag = "div" | "section" | "article" | "ul" | "ol" | "li" | "span" | "aside";

export function Reveal({
  as = "div",
  stagger = false,
  delay,
  className = "",
  style,
  children,
  ...rest
}: {
  as?: Tag;
  stagger?: boolean;
  /** décalage de départ de la cascade, en secondes */
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "style" | "children">) {
  const cls = (stagger ? "rl-stagger" : "rl-reveal") + (className ? " " + className : "");
  const st = delay ? ({ ...style, "--rl-stagger-from": `${delay}s` } as React.CSSProperties) : style;
  return createElement(as, { className: cls, style: st, ...rest }, children);
}
