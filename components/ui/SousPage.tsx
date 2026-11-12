"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EncreVive } from "@/components/nav/EncreVive";
import { PALETTES, paletteDeChemin, styleDePalette, type Palette } from "@/lib/palettes";
import s from "./SousPage.module.css";

// Le gabarit commun des sous-pages (chantier du 2026-11-12, plan validé par Théo) :
//  - SousPage : la page en 1 240 px (rl-wide rl-page), aux couleurs de son espace (palette
//    posée d'office selon la route, lib/palettes) ; `premier` met l'en-tête et le premier bloc
//    dans le cadre des pages principales (.rl-cadre) ;
//  - EnTeteSousPage : le seul début de page des sous-pages : un retour vers la vraie page
//    parente (couleur de l'espace), un titre un cran sous celui des pages principales,
//    une ligne au plus, l'action principale à droite ;
//  - ActionEncre / ActionContour : l'action principale à l'encre vive de l'espace, la
//    secondaire à contour (jamais deux encres côte à côte) ;
//  - ColonneSeance : la colonne des questions (760 px), la même pour toutes les séances.

export type Retour = { href: string; label: string };

/** La palette de la page affichée (celle de son espace) ; graphite à défaut. */
export function usePaletteDePage(): Palette {
  return paletteDeChemin(usePathname() ?? "/") ?? PALETTES.graphite;
}

export function SousPage({ entete, premier, children, className }: { entete: React.ReactNode; premier?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  const p = usePaletteDePage();
  return (
    <div className={["rl-wide rl-page", s.page, className].filter(Boolean).join(" ")} style={styleDePalette(p)} data-palette-page={p.key}>
      {premier ? (
        <div className="rl-cadre">
          {entete}
          {premier}
        </div>
      ) : (
        entete
      )}
      {children}
    </div>
  );
}

/**
 * Le retour vers la page parente (flèche, pastille de l'espace, nom de la page), seul : pour un
 * écran qui garde son propre décor (la partie de cartes). Il pose lui-même la palette de
 * l'espace, pour que la pastille ait sa couleur hors de SousPage.
 */
export function LienRetour({ retour, className }: { retour: Retour; className?: string }) {
  const p = usePaletteDePage();
  return (
    <Link href={retour.href} className={[s.retour, className].filter(Boolean).join(" ")} style={styleDePalette(p)}>
      <ArrowLeft size={14} aria-hidden />
      <span className={s.pastille} aria-hidden />
      <span>{retour.label}</span>
    </Link>
  );
}

export function EnTeteSousPage({ retour, titre, ligne, actions }: { retour: Retour; titre: React.ReactNode; ligne?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className={s.entete}>
      <div className={s.gauche}>
        <LienRetour retour={retour} />
        <h1 className={"t-h1 rl-in " + s.titre}>{titre}</h1>
        {ligne && <p className={s.ligne}>{ligne}</p>}
      </div>
      {actions && <div className={s.actions}>{actions}</div>}
    </header>
  );
}

export function ActionEncre({
  href,
  onClick,
  type = "button",
  disabled,
  children,
  label,
}: {
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  children: React.ReactNode;
  label?: string;
}) {
  const p = usePaletteDePage();
  const cls = "rl-encre " + s.action + " " + s.encre;
  if (href)
    return (
      <Link href={href} className={cls} data-palette={p.key} aria-label={label}>
        <EncreVive tons={p.liquide} />
        <span className={s.texte}>{children}</span>
      </Link>
    );
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls} data-palette={p.key} aria-label={label}>
      <EncreVive tons={p.liquide} />
      <span className={s.texte}>{children}</span>
    </button>
  );
}

/** `nouvelOnglet` : un fichier hors du site (PDF signé…), ouvert dans un nouvel onglet ; `aide` : l'infobulle. */
export function ActionContour({
  href,
  onClick,
  children,
  label,
  aide,
  nouvelOnglet,
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  label?: string;
  aide?: string;
  nouvelOnglet?: boolean;
}) {
  const cls = s.action + " " + s.contour;
  if (href && nouvelOnglet)
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} aria-label={label} title={aide}>
        {children}
      </a>
    );
  if (href)
    return (
      <Link href={href} className={cls} aria-label={label} title={aide}>
        {children}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={cls} aria-label={label} title={aide}>
      {children}
    </button>
  );
}

export function ColonneSeance({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={[s.seance, className].filter(Boolean).join(" ")}>{children}</div>;
}
