"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeSpace } from "@/lib/nav";
import { paletteDeChemin, styleDePalette } from "@/lib/palettes";
import { ICONE_ESPACE, Icone, type IconeNom } from "@/components/adn/icons";
import { EncreVive } from "@/components/nav/EncreVive";
import { useSpacesVisibles } from "@/components/nav/DevoileContext";

// Barre du bas (mobile) : flottante et translucide, les espaces (cinq, moins
// ceux pas encore découverts : DevoileContext). Pas d'onglet « Accueil » : le
// logo de la barre du haut y mène (décision du 16 octobre 2026), et cinq
// onglets laissent leur nom entier même à 360 px. Une pastille d'encre glisse
// sous l'onglet actif (même geste que le contrôle segmenté de la barre du
// haut), placée par transform ; l'icône qui devient active fait un petit
// rebond. La pastille se remplit du liquide des insignes de rang, aux couleurs
// de la palette de la page (lib/palettes.ts, EncreVive ; texture de repli et
// voile : .rl-encre dans globals.css) ; sur l'accueil, aucun onglet n'est
// allumé. `chemin` : pour les aperçus, force la route.
export function MobileBottomNav({ chemin }: { chemin?: string } = {}) {
  const courant = usePathname();
  const pathname = chemin ?? courant ?? "/";
  const space = activeSpace(pathname);
  const { spaces: SPACES } = useSpacesVisibles(space);
  if (pathname.startsWith("/login") || pathname.startsWith("/share")) return null;
  const items = SPACES.map((s) => ({ key: s.key, label: s.label, href: s.href, icone: ICONE_ESPACE[s.key] as IconeNom, on: s.key === space, neuf: s.neuf }));
  if (!items.length) return null;
  const ix = items.findIndex((i) => i.on);
  const n = items.length;
  const palette = ix >= 0 ? paletteDeChemin(pathname) : null;

  return (
    <nav
      aria-label="Espaces"
      className="fixed inset-x-3 z-50 grid rounded-[22px] border border-line p-1.5 md:hidden"
      style={{
        gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
        bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        background: "color-mix(in oklab, var(--surface-3) 86%, transparent)",
        backdropFilter: "blur(18px) saturate(1.5)",
        WebkitBackdropFilter: "blur(18px) saturate(1.5)",
        boxShadow: "var(--edge), var(--shadow-3)",
      }}
    >
      <span
        aria-hidden
        className="rl-encre absolute bottom-1.5 top-1.5 rounded-[16px] bg-white transition-[transform,opacity] duration-[420ms] ease-[var(--ease-spring)] motion-reduce:transition-none"
        data-palette={palette?.key}
        style={{
          ...styleDePalette(palette),
          left: 6,
          width: `calc((100% - 12px) / ${n})`,
          transform: `translateX(${Math.max(ix, 0) * 100}%)`,
          opacity: ix >= 0 ? 1 : 0,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.14), 0 4px 12px -4px rgba(0,0,0,.35)",
        }}
      >
        {palette && <EncreVive tons={palette.liquide} />}
      </span>
      {items.map(({ key, label, href, icone, on, neuf }) => (
        <Link
          key={key}
          href={href}
          aria-current={on ? "page" : undefined}
          className={
            "relative z-[1] flex min-h-[52px] flex-col items-center justify-center gap-[3px] rounded-[16px] text-[10.5px] tracking-[-0.005em] transition-colors duration-300 active:scale-95 " +
            (on ? "font-semibold text-black" : "font-medium text-muted") +
            (on && palette ? " rl-encre-on" : "") +
            (neuf ? " rl-onglet-neuf" : "")
          }
        >
          <Icone nom={icone} size={21} appui={on ? 1.12 : 0.95} className={on ? "rl-nudge" : undefined} />
          <span className="whitespace-nowrap max-[359px]:text-[9.5px] max-[359px]:tracking-[-0.02em]">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
