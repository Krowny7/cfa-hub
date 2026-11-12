"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EncreVive } from "@/components/nav/EncreVive";
import { Illustration } from "@/components/ui/Illustration";
import type { IllustrationNom } from "@/lib/illustrations";
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
 * Le retour vers la page parente (un bouton noir sur papier, blanc la nuit : flèche + nom de la page), seul : pour un
 * écran qui garde son propre décor (la partie de cartes). Il pose lui-même la palette de
 * l'espace, pour que la pastille ait sa couleur hors de SousPage.
 */
export function LienRetour({ retour, className }: { retour: Retour; className?: string }) {
  const p = usePaletteDePage();
  return (
    <Link href={retour.href} className={[s.retour, className].filter(Boolean).join(" ")} style={styleDePalette(p)}>
      <ArrowLeft size={14} aria-hidden />
      <span>{retour.label}</span>
    </Link>
  );
}

/**
 * Le début de toutes les sous-pages : un cadre (choix de Théo, 2026-11-12) avec le retour, le titre et
 * une ligne à gauche, l'illustration du lieu à droite. Aucun bouton dans le cadre, hormis le retour.
 */
export function EnTeteSousPage({
  retour,
  titre,
  ligne,
  illustration,
}: {
  retour: Retour;
  titre: React.ReactNode;
  ligne?: React.ReactNode;
  illustration?: { nom: IllustrationNom; position?: string };
}) {
  return (
    <header className={s.cadre} data-illustre={illustration ? "1" : undefined}>
      <div className={s.contenu}>
        <LienRetour retour={retour} />
        <h1 className={"t-h1 rl-in " + s.titre}>{titre}</h1>
        {ligne && <p className={s.ligne}>{ligne}</p>}
      </div>
      {illustration && (
        <div className={s.image}>
          <Illustration nom={illustration.nom} position={illustration.position} decorative eager />
        </div>
      )}
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

/**
 * Le cadre principal d'une sous-page (choix de Théo, 2026-11-12) : sous l'en-tête, la grande carte
 * qui porte l'essentiel de la page ; l'annexe vient dessous, sans cadre. `ambiance` donne au cadre
 * la matière du lieu, pour qu'on reconnaisse la page d'un coup d'œil : « carnet » (papier
 * quadrillé), « pupitre » (parchemin doré), « tapis » (le tapis vert du casino), « mur » (le
 * mur où l'on épingle), « marbre » (le palais blanc), « papier » (neutre).
 */
export type Ambiance = "papier" | "carnet" | "pupitre" | "tapis" | "mur" | "marbre";

export function CadrePrincipal({
  ambiance = "papier",
  titre,
  aide,
  tete,
  children,
}: {
  ambiance?: Ambiance;
  titre?: React.ReactNode;
  aide?: React.ReactNode;
  /** sous le titre (une légende…) */
  tete?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={s.principal} data-ambiance={ambiance} aria-label={typeof titre === "string" ? titre : undefined}>
      {(titre || aide) && (
        <div className={s.principalTete}>
          {titre && <h2 className={s.principalTitre}>{titre}</h2>}
          {aide && <span className={s.principalAide}>{aide}</span>}
        </div>
      )}
      {tete}
      {children}
    </section>
  );
}

/**
 * Le cadre annexe (choix de Théo, 2026-11-12) : sous le cadre principal, le même cadre classique,
 * sa bande noire de titre en haut (blanche la nuit), puis son contenu. Pour ce qui complète
 * l'essentiel de la page (les paquets d'une matière…).
 */
export function CadreAnnexe({ titre, children, id }: { titre: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className={s.annexe} aria-label={typeof titre === "string" ? titre : undefined}>
      <h2 className={s.annexeBande}>{titre}</h2>
      <div className={s.annexeCorps}>{children}</div>
    </section>
  );
}

/**
 * Le cadre à zones (le modèle des sous-pages validé par Théo sur les flashcards, 2026-11-12) : en
 * haut, la bande noire des titres sur toute la largeur (blanche la nuit) ; dessous, l'essentiel à
 * gauche (plus large) et, s'il y en a une, la colonne grise à droite, du haut en bas du cadre (le
 * complément : un personnage, un mini-décor cliquable, un chiffre, une courte liste). Une zone seule
 * prend toute la largeur. Pas de bouton superflu, pas de texte superflu.
 */
export type Zone = { titre: React.ReactNode; contenu: React.ReactNode };

export function CadreZones({ gauche, droite }: { gauche: Zone; droite?: Zone }) {
  return (
    <section className={s.principal} aria-label={typeof gauche.titre === "string" ? gauche.titre : undefined}>
      <div className={s.zones} data-deux={droite ? "1" : undefined}>
        <div className={s.bandeZones}>
          <h2 className={s.zoneTitre}>{gauche.titre}</h2>
          {droite && <h2 className={s.zoneTitre + " " + s.zoneTitreDroite}>{droite.titre}</h2>}
        </div>
        <div className={s.zoneG}>{gauche.contenu}</div>
        {droite && (
          <div className={s.zoneD}>
            <h2 className={s.zoneTitre + " " + s.zoneTitreMobile}>{droite.titre}</h2>
            {droite.contenu}
          </div>
        )}
      </div>
    </section>
  );
}
