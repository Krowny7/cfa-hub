import Link from "next/link";
import { EncreVive } from "@/components/nav/EncreVive";
import { PALETTES } from "@/lib/palettes";
import s from "./Affronter.module.css";

// Les pièces d'encre de l'espace « S'affronter », partagées par la vue et ses
// cartes : la palette de l'onglet (san-romano), un bouton d'encre et le sceau
// d'une carte en papier, comme sur S'entraîner.

/** La palette de l'espace (lib/palettes.ts). */
export const PAL = PALETTES["san-romano"];

/** Un bouton d'encre (le liquide vivant de la palette de l'espace), comme sur S'entraîner ; `surPeinture` : un liseré clair. */
export function Bouton({ href, children, surPeinture = false }: { href: string; children: React.ReactNode; surPeinture?: boolean }) {
  return (
    <Link href={href} className={["rl-encre", s.encre, s.bouton, surPeinture ? s.surPeinture : ""].filter(Boolean).join(" ")} data-palette={PAL.key}>
      <EncreVive tons={PAL.liquide} />
      {children}
    </Link>
  );
}

/** Le même bouton d'encre, pour envoyer un formulaire (la bande « Trouver un adversaire »). */
export function BoutonEnvoi({ children, surPeinture = false }: { children: React.ReactNode; surPeinture?: boolean }) {
  return (
    <button type="submit" className={["rl-encre", s.encre, s.bouton, surPeinture ? s.surPeinture : ""].filter(Boolean).join(" ")} data-palette={PAL.key}>
      <EncreVive tons={PAL.liquide} />
      {children}
    </button>
  );
}

/** Le sceau d'une carte en papier : une pastille d'encre, l'icône au centre. */
export function Sceau({ children }: { children: React.ReactNode }) {
  return (
    <span className={["rl-encre", s.encre, s.sceau].join(" ")} data-palette={PAL.key} aria-hidden>
      {children}
    </span>
  );
}
