import type { CSSProperties } from "react";
import donnees from "./palettes.json";
import { activeSpace, type Space } from "./nav";

// Une palette par espace du site, toutes dans la même famille chaude. Elles
// servent aux illustrations et à l'encre décorative : chaque page a la sienne,
// ses cinq couleurs nommées (de la plus sombre à la plus claire) et sa texture
// d'encre vivante (public/encres/<palette>.webp, recolorée depuis la texture
// liquide des insignes par scripts/encres/generer.py).
//
// Source unique des couleurs : lib/palettes.json (lue aussi par le script qui
// fabrique les textures). Module neutre (pas de "use client").
//
// Usage : `style={styleDePalette(paletteDeChemin(pathname))}` sur un élément
// expose `--pal-1` … `--pal-N` (du plus sombre au plus clair), `--pal-encre`
// (url de la texture), `--pal-voile-haut` / `--pal-voile-bas` (opacité du voile
// sombre qui garde le texte blanc lisible) et `data-palette` pour les styles.

export type PaletteCle = "san-romano" | "atelier" | "studiolo" | "sanguine" | "florence";

export type CouleurNommee = { nom: string; hex: string };

export type Palette = {
  key: PaletteCle;
  nom: string;
  inspiration: string;
  /** du plus sombre au plus clair */
  couleurs: CouleurNommee[];
  /** texture d'encre (256 × 256, raccord en mosaïque) */
  encre: string;
  /** opacité du voile sombre en haut et en bas de l'onglet */
  voile: [number, number];
};

const luminance = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = c.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
};

export const PALETTES: Record<PaletteCle, Palette> = Object.fromEntries(
  donnees.palettes.map((p) => [
    p.key,
    {
      key: p.key as PaletteCle,
      nom: p.nom,
      inspiration: p.inspiration,
      couleurs: [...p.couleurs].sort((a, b) => luminance(a.hex) - luminance(b.hex)),
      encre: `/encres/${p.key}.webp`,
      voile: p.voile as [number, number],
    },
  ]),
) as Record<PaletteCle, Palette>;

/** Routes de chaque palette (le premier préfixe qui correspond l'emporte). */
const ROUTES: { palette: PaletteCle; prefixes: string[] }[] = [
  { palette: "san-romano", prefixes: ["/classement", "/people", "/duel", "/defi", "/mock-exams", "/eclair"] },
  { palette: "atelier", prefixes: ["/entrainement", "/calculs", "/practice", "/qcm", "/official-exams", "/atelier"] },
  { palette: "studiolo", prefixes: ["/reviser", "/fiches", "/courses", "/flashcards"] },
  { palette: "sanguine", prefixes: ["/moi"] },
  { palette: "florence", prefixes: ["/dashboard"] },
];

/** Repli : une page sans palette propre prend celle de son espace. */
const PALETTE_DE_L_ESPACE: Record<Space["key"], PaletteCle> = {
  reviser: "studiolo",
  entrainer: "atelier",
  classement: "san-romano",
  moi: "sanguine",
};

const sous = (chemin: string, prefixe: string) => chemin === prefixe || chemin.startsWith(prefixe + "/");

/** La palette de la page, ou null hors des espaces (connexion, partage…). */
export function paletteDeChemin(chemin: string): Palette | null {
  if (chemin === "/") return PALETTES.florence;
  for (const r of ROUTES) if (r.prefixes.some((p) => sous(chemin, p))) return PALETTES[r.palette];
  const espace = activeSpace(chemin);
  return espace ? PALETTES[PALETTE_DE_L_ESPACE[espace]] : null;
}

/** Variables CSS d'une palette (à poser en `style`), avec `data-palette` à côté. */
export function styleDePalette(p: Palette | null): CSSProperties | undefined {
  if (!p) return undefined;
  const v: Record<string, string | number> = {
    "--pal-encre": `url(${p.encre})`,
    "--pal-voile-haut": p.voile[0],
    "--pal-voile-bas": p.voile[1],
  };
  p.couleurs.forEach((c, i) => {
    v[`--pal-${i + 1}`] = c.hex;
  });
  return v as CSSProperties;
}

