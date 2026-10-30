import Link from "next/link";
import { EncreVive } from "@/components/nav/EncreVive";
import { PALETTES, styleDePalette } from "@/lib/palettes";
import s from "./Affronter.module.css";

// Les pièces d'encre de l'espace « S'affronter », partagées par la vue et ses
// cartes : la palette de l'onglet (san-romano), un bouton d'encre et le sceau
// d'une carte en papier, comme sur S'entraîner. `PorteeEncre` pose cette palette
// (et les jetons de l'espace) autour d'une page qui n'est pas la vue S'affronter :
// les Salles y retrouvent les mêmes boutons et sceaux.

/** La palette de l'espace (lib/palettes.ts). */
export const PAL = PALETTES["san-romano"];

/** Un bouton d'encre (le liquide vivant de la palette de l'espace), comme sur S'entraîner ; `surPeinture` : un liseré clair. */
export function Bouton({
  href,
  children,
  surPeinture = false,
  className,
  label,
}: {
  href: string;
  children: React.ReactNode;
  surPeinture?: boolean;
  className?: string;
  /** libellé accessible, si le texte ne suffit pas */
  label?: string;
}) {
  return (
    <Link href={href} aria-label={label} className={["rl-encre", s.encre, s.bouton, surPeinture ? s.surPeinture : "", className ?? ""].filter(Boolean).join(" ")} data-palette={PAL.key}>
      <EncreVive tons={PAL.liquide} />
      {children}
    </Link>
  );
}

/** Le même bouton d'encre, pour envoyer un formulaire (la bande « Trouver un adversaire ») ou, avec `type="button"`, pour agir d'un clic. */
export function BoutonEnvoi({
  children,
  surPeinture = false,
  className,
  type = "submit",
  disabled,
  onClick,
  label,
}: {
  children: React.ReactNode;
  surPeinture?: boolean;
  className?: string;
  type?: "submit" | "button";
  disabled?: boolean;
  onClick?: () => void;
  label?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className={["rl-encre", s.encre, s.bouton, surPeinture ? s.surPeinture : "", className ?? ""].filter(Boolean).join(" ")}
      data-palette={PAL.key}
    >
      <EncreVive tons={PAL.liquide} />
      {children}
    </button>
  );
}

/** Le sceau d'une carte en papier : une pastille d'encre, l'icône au centre. */
export function Sceau({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={["rl-encre", s.encre, s.sceau, className ?? ""].filter(Boolean).join(" ")} data-palette={PAL.key} aria-hidden>
      {children}
    </span>
  );
}

/** La portée d'encre de l'espace pour une page hors de la vue S'affronter : les variables de la palette et les jetons des boutons et des sceaux. */
export function PorteeEncre({ children }: { children: React.ReactNode }) {
  return (
    <div className={s.racine} style={styleDePalette(PAL)}>
      {children}
    </div>
  );
}
