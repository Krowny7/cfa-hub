import type { CSSProperties, ReactNode } from "react";
import { EncreVive } from "@/components/nav/EncreVive";
import { BanniereHeros } from "@/components/profil/BanniereHeros";
import { BANNIERE_H, BANNIERE_L, ENCRES, SCENE, SCENE_H, SCENE_L, adresseImage, hauteurCalque, type Calque, type CleCalque, type Composition } from "@/lib/profil/banniere";
import { PALETTES, styleDePalette, type PaletteCle } from "@/lib/palettes";
import c from "./BanniereComposee.module.css";

// La bannière composée par le joueur (lib/profil/banniere.ts), dessinée : une
// BOÎTE (la « scène ») qui prend la largeur donnée par la page, sa hauteur
// suit (540 × 1105 de référence) ; dedans, la bannière elle-même (360 × 850,
// à 16,7 % du bord gauche et 15,4 % du haut), entourée de la zone de
// débordement transparente où le personnage et les pièces peuvent dépasser.
//   - le FOND (l'image du joueur cadrée par son point de cadrage, sinon le
//     fond du profil : `fond`, par exemple la Banniere du profil) remplit la
//     bannière et rien d'autre : il est coupé aux coins du cadre ;
//   - le CADRE fin, dessiné par le site (contour d'encre, un filet de métal,
//     un trait d'encre dedans : des aplats), est un SVG de même proportion
//     que la bannière ; si le joueur a choisi une couleur (`composition.encre`,
//     une palette), le filet de métal laisse la place au vrai liquide de la
//     palette (EncreVive, sa texture immobile en repli), une bande taillée
//     à la forme du filet, entre les deux traits d'encre ;
//   - les trois CALQUES (personnage, pièce du haut, pièce du bas) sont des
//     images posées en % de la bannière (x, y, largeur, hauteur : `styleCalque`),
//     empilées dans l'ordre de `composition.ordre` (du fond vers l'avant :
//     le cadre y a sa place comme les autres).
// Tout est du décor : la scène est cachée des lecteurs d'écran, les images
// ont un alt vide, rien ne capte un clic (le parent, un lien, les porte).
// La scène est un conteneur (cqw) : le cadre et les ombres suivent sa largeur,
// de la vignette du podium au grand aperçu de l'éditeur. Sans état : serveur
// comme client (le liquide est un composant client, posé dedans).
// Sans composition (null), la bannière reste celle d'avant : BanniereHeros
// (le fanion, son ornement, son personnage), avec `fond`, `ornement`,
// `perso` et `children` (le pseudo).

/** Où poser un calque dans la scène : ses bords en % de la scène (la scène va de SCENE.x0 à SCENE.x1, de SCENE.y0 à SCENE.y1). */
export function styleCalque(k: Calque): CSSProperties {
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return {
    left: `${r(((k.x - SCENE.x0) / SCENE_L) * 100)}%`,
    top: `${r(((k.y - SCENE.y0) / SCENE_H) * 100)}%`,
    width: `${r((k.l / SCENE_L) * 100)}%`,
    height: `${r((hauteurCalque(k) / SCENE_H) * 100)}%`,
  };
}

/** Les coins du haut de la bannière, retaillés (en unités de la bannière : 360 × 850). */
const CHANFREIN = 26;
const ENCRE = "#1a1410";
export const METAL_DEFAUT = "#c9a24a";

/** Le contour de la bannière rentré de `d` : les coins du haut coupés à 45°, le bas droit. */
function contour(d: number): string {
  const k = d * Math.SQRT2 - d;
  const a = Math.round((CHANFREIN + k) * 100) / 100;
  return `M${a},${d}H${BANNIERE_L - a}L${BANNIERE_L - d},${a}V${BANNIERE_H - d}H${d}V${a}Z`;
}

/**
 * L'anneau entre deux contours rentrés de `dehors` et `dedans` (mêmes coins coupés que `contour`), en `clip-path` : les
 * deux polygones, en % de la bannière, réunis par la règle evenodd (le second creuse le premier).
 */
function anneau(dehors: number, dedans: number): string {
  const pts = (d: number) => {
    const a = CHANFREIN + d * Math.SQRT2 - d;
    return [[a, d], [BANNIERE_L - a, d], [BANNIERE_L - d, a], [BANNIERE_L - d, BANNIERE_H - d], [d, BANNIERE_H - d], [d, a]];
  };
  const pc = ([x, y]: number[]) => `${Math.round((x / BANNIERE_L) * 1e6) / 1e4}% ${Math.round((y / BANNIERE_H) * 1e6) / 1e4}%`;
  const e = pts(dehors);
  const i = pts(dedans);
  return `polygon(evenodd, ${[...e, e[0], ...i, i[0]].map(pc).join(", ")})`;
}
/** la bande de liquide : la place du filet de métal (3 à 11), un peu élargie (2,5 à 11,5) pour qu'aucun jour ne passe entre elle et les traits d'encre */
const BANDE = anneau(2.5, 11.5);
/**
 * Le style de la bande pour chaque palette, calculé une fois (rien qui varie d'un rendu à l'autre : l'hydratation est
 * sûre) : les variables de la palette (sa texture de repli), sans voile, et le pas de la texture à l'échelle de la bannière
 * (en ligne : la règle globale .rl-encre pose le sien, plus fort qu'une classe).
 */
const STYLES_BANDE = Object.fromEntries(
  ENCRES.map((k) => [k, { ...styleDePalette(PALETTES[k]), "--pal-voile-haut": 0, "--pal-voile-bas": 0, "--encre-pas": "calc(var(--s) * 300)", clipPath: BANDE } as CSSProperties]),
) as Record<PaletteCle, CSSProperties>;

/**
 * Le cadre de la bannière : un contour d'encre, un filet de métal à reflet, un trait d'encre dedans. Avec une couleur
 * choisie (`encre`) : les deux traits d'encre, et entre eux le vrai liquide de la palette à la place du métal.
 */
function Cadre({ metal, encre }: { metal: string; encre: PaletteCle | null }) {
  const p = encre ? PALETTES[encre] : null;
  if (p && STYLES_BANDE[p.key]) {
    return (
      <span aria-hidden className={c.cadre} data-encre={p.key}>
        <svg viewBox={`0 0 ${BANNIERE_L} ${BANNIERE_H}`} className={c.trait} aria-hidden focusable="false" data-calque="cadre">
          <path d={contour(7)} fill="none" stroke={ENCRE} strokeWidth={14} strokeLinejoin="round" />
          <path d={contour(14.6)} fill="none" stroke={ENCRE} strokeWidth={3} strokeLinejoin="round" />
        </svg>
        {/* le liquide : EncreVive en enfant direct de l'élément .rl-encre[data-palette] (le canvas le remplit, la bande le taille) */}
        <span className={"rl-encre " + c.bande} data-palette={p.key} style={STYLES_BANDE[p.key]}>
          <EncreVive tons={p.liquide} echelle={120} />
        </span>
      </span>
    );
  }
  return (
    <svg viewBox={`0 0 ${BANNIERE_L} ${BANNIERE_H}`} className={c.cadre} aria-hidden focusable="false" data-calque="cadre" style={{ ["--metal" as string]: metal }}>
      <path d={contour(7)} fill="none" stroke={ENCRE} strokeWidth={14} strokeLinejoin="round" />
      <path d={contour(7)} fill="none" stroke="var(--metal)" strokeWidth={8} strokeLinejoin="round" />
      <path d={contour(7)} fill="none" stroke="#000" strokeOpacity={0.22} strokeWidth={8} strokeLinejoin="round" />
      <path d={contour(6)} fill="none" stroke="var(--metal)" strokeWidth={5} strokeLinejoin="round" />
      <path d={contour(5.4)} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={1.6} strokeLinejoin="round" />
      <path d={contour(14.6)} fill="none" stroke={ENCRE} strokeWidth={3} strokeLinejoin="round" />
    </svg>
  );
}

/** Une image de calque, ou rien (calque sans image, préréglage inconnu). */
function CalqueImage({ cle, k, charge }: { cle: CleCalque; k: Calque; charge: "lazy" | "eager" }) {
  const src = adresseImage(cle, k.image);
  // un préréglage qu'on ne connaît plus : adresseImage rend sa valeur telle quelle, qui n'est pas une adresse
  if (!src || src.startsWith("piece:")) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={c.calque} data-calque={cle} draggable={false} loading={charge} decoding="async" style={styleCalque(k)} />;
}

export function BanniereComposee({
  composition,
  fond,
  metal = METAL_DEFAUT,
  ornement,
  perso = null,
  persoTaille,
  persoPos,
  children,
  charge = "lazy",
  className = "",
}: {
  /** la bannière composée du joueur ; null : la bannière d'avant (BanniereHeros) */
  composition: Composition | null;
  /** le fond du profil (sa bannière : <Banniere … className="h-full w-full" />), quand le joueur n'a pas envoyé le sien */
  fond?: ReactNode;
  /** le métal du cadre (la teinte du rang, par exemple), quand le joueur n'a pas choisi de couleur (composition.encre) */
  metal?: string;
  /** sans composition : l'ornement, le personnage (l'ancien) et le pseudo du fanion */
  ornement?: string | null;
  perso?: string | null;
  persoTaille?: number;
  persoPos?: number;
  children?: ReactNode;
  /** « eager » : l'image se charge tout de suite (la carte du haut de la page) */
  charge?: "lazy" | "eager";
  className?: string;
}) {
  if (!composition) {
    return (
      <BanniereHeros fond={fond ?? <span className={c.fondNeutre} />} ornement={ornement} perso={perso} persoTaille={persoTaille} persoPos={persoPos} className={className}>
        {children}
      </BanniereHeros>
    );
  }
  const f = composition.fond;
  return (
    <span aria-hidden className={className ? `${c.scene} ${className}` : c.scene} data-composee="" data-fond={f.image ? "image" : "profil"}>
      <span className={c.banniere}>
        <span className={c.fond}>
          {f.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.image} alt="" className={c.fondImg} draggable={false} loading={charge} decoding="async" style={{ objectPosition: `${f.px}% ${f.py}%` }} />
          ) : (
            (fond ?? <span className={c.fondNeutre} />)
          )}
        </span>
      </span>
      {composition.ordre.map((k) => (k === "cadre" ? <Cadre key={k} metal={metal} encre={composition.encre ?? null} /> : <CalqueImage key={k} cle={k} k={composition[k]} charge={charge} />))}
    </span>
  );
}
