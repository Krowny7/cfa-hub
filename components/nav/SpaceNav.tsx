"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeSpace } from "@/lib/nav";
import { paletteDeChemin, styleDePalette } from "@/lib/palettes";
import { ICONE_ESPACE, Icone } from "@/components/adn/icons";
import { EncreVive } from "@/components/nav/EncreVive";
import { useSpacesVisibles } from "@/components/nav/DevoileContext";

// Les espaces (cinq, moins ceux que le joueur n'a pas encore découverts : voir
// DevoileContext), en contrôle segmenté : l'indicateur glisse (avec un
// léger ressort) sous l'onglet actif. Il se place par transform (sa largeur
// est celle d'un onglet : translateX(100 %) = un onglet plus loin). Il se
// remplit du liquide des insignes de rang, aux couleurs de la palette de la
// page (lib/palettes.ts, EncreVive ; texture de repli et voile : .rl-encre
// dans globals.css) ; le texte de l'onglet passe en blanc.
// Les onglets s'ajustent à la place que la barre du haut leur laisse (requête
// de conteneur : le parent porte `@container`) : icône et nom à partir de
// 680 px, le nom seul en dessous (marges réduites), l'icône seule sous 450 px
// (le nom reste lu par les lecteurs d'écran). Jamais de chevauchement.
// `chemin` : pour les aperçus, force la route lue.
export function SpaceNav({ chemin }: { chemin?: string } = {}) {
  const courant = usePathname();
  const pathname = chemin ?? courant ?? "/";
  const active = activeSpace(pathname);
  const { spaces: SPACES } = useSpacesVisibles(active);
  const ix = SPACES.findIndex((s) => s.key === active);
  const palette = ix >= 0 ? paletteDeChemin(pathname) : null;

  return (
    <nav aria-label="Espaces" className="hidden md:block">
      <div className="seg" style={{ gridTemplateColumns: `repeat(${SPACES.length}, minmax(0, 1fr))` }}>
        <span
          aria-hidden
          className="seg-thumb rl-encre"
          data-palette={palette?.key}
          style={{
            ...styleDePalette(palette),
            left: 4,
            width: `calc((100% - 8px) / ${SPACES.length})`,
            transform: `translateX(${Math.max(ix, 0) * 100}%)`,
            opacity: ix >= 0 ? 1 : 0,
          }}
        >
          {palette && <EncreVive tons={palette.liquide} />}
        </span>
        {SPACES.map((s) => {
          const on = s.key === active;
          return (
            <Link key={s.key} href={s.href} className={"seg-item gap-0 px-3 text-[13px] @min-[450px]:px-2 @min-[500px]:px-3 @min-[500px]:text-[13.5px] @min-[680px]:gap-[7px] @min-[680px]:px-4" + (on && palette ? " rl-encre-on" : "") + (s.neuf ? " rl-onglet-neuf" : "")} aria-current={on ? "page" : undefined}>
              <Icone nom={ICONE_ESPACE[s.key]} size={17} appui={on ? 1.12 : 0.95} className="hidden @min-[680px]:block @max-[449px]:block" />
              <span className="@max-[449px]:sr-only">{s.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
