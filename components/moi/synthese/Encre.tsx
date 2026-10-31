import Link from "next/link";
import { EncreVive } from "@/components/nav/EncreVive";
import { PALETTES } from "@/lib/palettes";
import type { Segment } from "@/lib/voice-moi";
import s from "./Synthese.module.css";

// Les pièces d'encre de la page Moi « La synthèse », calquées sur celles de
// S'affronter (components/classement/Encre.tsx) mais aux couleurs de la palette
// « jade » (noir, améthyste, jade, blanc lilas). Le vrai liquide (EncreVive)
// n'a que deux places : le bouton d'action principal d'une carte (Bouton,
// BoutonAction : un seul par carte) et l'option active d'un sélecteur
// (Selecteur.tsx). Le sceau, lui, est un aplat noir : SceauUni, sans liquide.

/** La palette de la page (lib/palettes.ts). */
export const PAL = PALETTES.jade;

const classes = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Un bouton d'encre qui mène quelque part : le liquide vivant de la palette, texte blanc. */
export function Bouton({ href, children, className, label }: { href: string; children: React.ReactNode; className?: string; label?: string }) {
  return (
    <Link href={href} aria-label={label} className={classes("rl-encre", s.encre, s.bouton, className)} data-palette={PAL.key}>
      <EncreVive tons={PAL.liquide} />
      {children}
    </Link>
  );
}

/** Le même bouton d'encre, pour agir d'un clic (à poser depuis un îlot client). */
export function BoutonAction({
  children,
  className,
  type = "button",
  disabled,
  onClick,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  label?: string;
}) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} aria-label={label} className={classes("rl-encre", s.encre, s.bouton, className)} data-palette={PAL.key}>
      <EncreVive tons={PAL.liquide} />
      {children}
    </button>
  );
}

/** Le sceau d'une carte : une pastille noire unie, l'icône en réserve. Pas de liquide. */
export function SceauUni({ children, grand = false, className }: { children: React.ReactNode; grand?: boolean; className?: string }) {
  return (
    <span className={classes(s.sceau, grand && s.sceauGrand, className)} aria-hidden>
      {children}
    </span>
  );
}

/** Une phrase en segments : du texte, du gras, un passage surligné (violet dilué) ou un chiffre en rouge. */
export function Phrase({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((g, i) =>
        typeof g === "string" ? (
          g
        ) : "b" in g ? (
          <b key={i}>{g.b}</b>
        ) : "marque" in g ? (
          <span key={i} className={s.surligne}>
            {g.marque}
          </span>
        ) : (
          <span key={i} className={s.neg}>
            {g.neg}
          </span>
        ),
      )}
    </>
  );
}
