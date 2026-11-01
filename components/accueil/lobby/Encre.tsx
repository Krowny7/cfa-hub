import Link from "next/link";
import { EncreVive } from "@/components/nav/EncreVive";
import { PALETTES } from "@/lib/palettes";
import type { Segment } from "@/lib/voice-moi";
import s from "./Lobby.module.css";

// Les pièces d'encre de l'accueil « Le lobby », calquées sur celles de la page
// Moi (components/moi/synthese/Encre.tsx et Selecteur.tsx) mais aux couleurs de
// la palette « Florence à l'aube » (terre cuite, ocre rosé, bleu pâle, ivoire).
// Le vrai liquide (EncreVive) n'a que deux places : le bouton d'action
// principal d'une carte (Bouton, BoutonAction : un seul par carte) et l'option
// active d'un sélecteur (Selecteur). Le sceau, lui, est un aplat noir : SceauUni,
// sans liquide. Aucun hook : ces pièces se posent côté serveur comme dans un
// îlot client (le liquide est un EncreVive, enfant direct de l'élément
// .rl-encre positionné).

/** La palette de la page (lib/palettes.ts). */
export const PAL = PALETTES.graphite;

const classes = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Un bouton d'encre qui mène quelque part : le liquide vivant de la palette, texte blanc. */
export function Bouton({
  href,
  children,
  className,
  label,
  taille,
  sur = false,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  label?: string;
  /** « sm » : petit bouton d'une petite carte ; « gd » : grand bouton du héros */
  taille?: "sm" | "gd";
  /** posé sur une peinture : liseré ivoire */
  sur?: boolean;
}) {
  return (
    <Link href={href} aria-label={label} className={classes("rl-encre", s.encre, s.bouton, taille && s[taille], sur && s.sur, className)} data-palette={PAL.key}>
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
  taille,
}: {
  children: React.ReactNode;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  label?: string;
  taille?: "sm" | "gd";
}) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} aria-label={label} className={classes("rl-encre", s.encre, s.bouton, taille && s[taille], className)} data-palette={PAL.key}>
      <EncreVive tons={PAL.liquide} />
      {children}
    </button>
  );
}

/** Un bouton secondaire, à contour : jamais d'encre (l'action qui n'est pas la principale de la carte). */
export function Contour({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={classes(s.contour, className)}>
      {children}
    </Link>
  );
}

/** Le sceau d'une carte : une pastille noire unie, l'icône en réserve. Pas de liquide. */
export function SceauUni({ children, clair = false, className }: { children: React.ReactNode; clair?: boolean; className?: string }) {
  return (
    <span className={classes(s.sceau, clair && s.sceauC, className)} aria-hidden>
      {children}
    </span>
  );
}

/** Une phrase en segments : du texte, du gras, un passage surligné (ocre dilué) ou un chiffre en terre cuite. */
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

// ── Le sélecteur ────────────────────────────────────────────────────────────
// Un groupe de boutons à choix unique (role="group", aria-pressed), jamais un
// menu. SEULE l'option active reçoit le vrai liquide de la palette (rl-encre +
// data-palette + EncreVive, comme les onglets de S'affronter) ; les autres
// restent des aplats clairs. Sans hook : l'état vit chez l'appelant (un îlot
// client).

export type OptionSelecteur<T extends string | number> = { cle: T; libelle: string };

export function Selecteur<T extends string | number>({
  label,
  options,
  valeur,
  onChoisir,
  className,
}: {
  label: string;
  options: readonly OptionSelecteur<T>[];
  valeur: T;
  onChoisir: (cle: T) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={classes(s.seg, className)}>
      {options.map((o) => {
        const on = o.cle === valeur;
        return (
          <button key={String(o.cle)} type="button" aria-pressed={on} className={classes(s.opt, on && "rl-encre", on && s.encre)} data-palette={on ? PAL.key : undefined} onClick={() => onChoisir(o.cle)}>
            {on && <EncreVive tons={PAL.liquide} />}
            {o.libelle}
          </button>
        );
      })}
    </div>
  );
}
