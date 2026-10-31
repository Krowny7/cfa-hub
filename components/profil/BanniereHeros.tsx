import { useId, type ReactNode } from "react";
import { ORNEMENT_DEFAUT } from "@/lib/profil/catalogue";
import { PERSO_POS_DEFAUT, PERSO_TAILLE_DEFAUT, cadragePerso } from "@/lib/profil/perso";
import c from "./BanniereHeros.module.css";

// La bannière verticale « façon jeu » (une bannière de champion d'un jeu
// vidéo, dans le langage du site : papier, encre, dorure sobre) :
//   - OrnementBanniere : le cadre d'ornement, un SVG qui couvre le fanion
//     (viewBox 90 × 150, le même fanion 9 : 15 à pointe que le podium) ; les
//     quatre dessins du lot « ornements » (filet, cartouche, laurier,
//     fronton), un par clé nue de lib/profil/pieces.ts ; une clé inconnue
//     retombe sur le filet ;
//   - PersoBanniere : le personnage du joueur, posé en bas du fanion, qui
//     déborde par le haut (jusqu'à 20 % de la hauteur) et un peu sur les côtés
//     (cadrage : cadragePerso, lib/profil/perso.ts). Décor pur : alt vide,
//     aria-hidden, aucun clic ;
//   - BanniereHeros : le tout, seul (l'aperçu de Personnaliser, les
//     vignettes), avec la bannière du joueur en fond (`fond`) et ses mots
//     (`children` : le pseudo reste du vrai texte) ;
//   - PersoSurBandeau : le personnage sur un bandeau horizontal (l'en-tête du
//     profil, la carte joueur), contenu dans le bandeau.
// Le podium (components/classement/PodiumBannieres.tsx) compose
// OrnementBanniere et PersoBanniere dans sa propre carte (cadre du rang, arc
// électrique, reflet). Sans état ni effet : serveur comme client.
// Pas de personnage : la bannière reste telle qu'elle était, l'ornement seul
// l'habille. Les ornements se gagnent aux sceaux et aux quêtes ; le dessin de
// chacun est volontairement basique, à développer plus tard.

/** Les ornements dessinés, dans l'ordre du catalogue (lib/profil/pieces.ts). */
export const ORNEMENTS_DESSINES = ["filet", "cartouche", "laurier", "fronton"] as const;
export type OrnementDessine = (typeof ORNEMENTS_DESSINES)[number];
const estDessine = (cle: string | null | undefined): cle is OrnementDessine => !!cle && (ORNEMENTS_DESSINES as readonly string[]).includes(cle);

const R = (n: number) => Math.round(n * 100) / 100;
/** Des noms de classes sans blancs en trop. */
const cx = (...l: Array<string | false | null | undefined>) => l.filter(Boolean).join(" ");
/**
 * Le contour du fanion rentré de `d` (en unités du viewBox 90 × 150) : le haut droit, les épaules à 132, la pointe à 150.
 * Le bas est une pente de 0,4 : rentrée de `d`, la pointe remonte de 1,077 d et les épaules de 0,677 d (comme le CSS du podium).
 */
const contour = (d: number) => `M${R(d)},${R(d)}H${R(90 - d)}V${R(132 - 0.677 * d)}L45,${R(150 - 1.077 * d)}L${R(d)},${R(132 - 0.677 * d)}Z`;

// ——— le laurier : une branche (courbe de Bézier) portant des feuilles, de la pointe vers le haut ———
type Pt = { x: number; y: number };
const BRANCHE: [Pt, Pt, Pt, Pt] = [
  { x: 31, y: 140 },
  { x: 6, y: 122 },
  { x: 4, y: 46 },
  { x: 41, y: 7 },
];
const bez = (t: number): Pt => {
  const u = 1 - t;
  const [p0, p1, p2, p3] = BRANCHE;
  return { x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x, y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y };
};
const tangente = (t: number): number => {
  const u = 1 - t;
  const [p0, p1, p2, p3] = BRANCHE;
  const dx = 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
  const dy = 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
};
type Feuille = { cx: number; cy: number; rx: number; ry: number; rot: number; dehors: boolean };
/** Onze paires de feuilles qui rapetissent vers le haut, plus la feuille du bout : calculées une fois. */
const FEUILLES: Feuille[] = (() => {
  const l: Feuille[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = 0.04 + i * 0.088;
    const p = bez(t);
    const th = tangente(t);
    const rx = 4.7 - 2.3 * t;
    const ry = 1.8 - 0.55 * t;
    for (const cote of [-1, 1]) {
      const phi = th + cote * 48;
      const a = (phi * Math.PI) / 180;
      l.push({ cx: R(p.x + Math.cos(a) * rx * 0.92), cy: R(p.y + Math.sin(a) * rx * 0.92), rx: R(rx), ry: R(ry), rot: R(phi), dehors: cote === -1 });
    }
  }
  const bout = bez(1);
  const th = tangente(0.97);
  const a = (th * Math.PI) / 180;
  l.push({ cx: R(bout.x + Math.cos(a) * 2.1), cy: R(bout.y + Math.sin(a) * 2.1), rx: 2.8, ry: 1.2, rot: R(th), dehors: false });
  return l;
})();
const TIGE = `M${BRANCHE[0].x},${BRANCHE[0].y}C${BRANCHE[1].x},${BRANCHE[1].y} ${BRANCHE[2].x},${BRANCHE[2].y} ${BRANCHE[3].x},${BRANCHE[3].y}`;

function Branche() {
  return (
    <>
      <path d={TIGE} className={c.dore} strokeWidth={1.4} strokeLinecap="round" />
      {FEUILLES.map((f, i) => (
        <ellipse key={i} cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} transform={`rotate(${f.rot} ${f.cx} ${f.cy})`} className={f.dehors ? c.pleinOr : c.pleinClair} stroke="rgba(8,8,10,0.5)" strokeWidth={0.5} />
      ))}
    </>
  );
}

/**
 * Le cadre d'ornement du fanion : un SVG qui couvre la boîte qui le porte (position: absolute, inset 0 ; viewBox 90 × 150, étiré à la boîte :
 * le fanion du podium est 15 % moins haut que 9 : 15, son ornement s'écrase d'autant).
 * Les clés sont celles de profile_style.ornement (« filet », « cartouche », « laurier », « fronton ») ; absente ou
 * inconnue : le filet d'encre. Décor pur (aria-hidden), aucun clic.
 */
export function OrnementBanniere({ cle = ORNEMENT_DEFAUT, className = "" }: { cle?: string | null; className?: string }) {
  const id = useId().replace(/:/g, "");
  const o: OrnementDessine = estDessine(cle) ? cle : "filet";
  return (
    <svg viewBox="0 0 90 150" preserveAspectRatio="none" className={cx(c.orn, className)} aria-hidden focusable="false" data-ornement={o}>
      {o === "filet" && (
        <>
          {/* un filet d'encre tiré à la règle, doublé d'un filet de papier : rien de plus */}
          <path d={contour(3.4)} className={c.encre} strokeWidth={1.3} strokeLinejoin="miter" />
          <path d={contour(5)} className={c.papier} strokeWidth={0.8} strokeOpacity={0.82} strokeLinejoin="miter" />
        </>
      )}
      {o === "cartouche" && (
        <>
          {/* un double filet de laiton, aux coins du haut retaillés en quart de rond, comme au pied d'une planche de la bottega */}
          <path d="M3.5,10A6.5,6.5 0 0 0 10,3.5H80A6.5,6.5 0 0 0 86.5,10V129.5L45,146.2L3.5,129.5Z" className={c.dore} strokeWidth={2} strokeLinejoin="round" />
          <path d="M7.4,12.4A4.6,4.6 0 0 0 12,7.8H78A4.6,4.6 0 0 0 82.6,12.4V126.6L45,141.6L7.4,126.6Z" className={c.doreClair} strokeWidth={0.9} strokeOpacity={0.9} strokeLinejoin="round" />
          {/* un losange à chaque bout, et une petite pastille aux épaules */}
          <path d="M45,0.6L50.4,4.6L45,8.6L39.6,4.6Z" className={c.pleinOr} stroke="rgba(8,8,10,0.7)" strokeWidth={0.8} />
          <path d="M45,141.4L49.6,145.2L45,149L40.4,145.2Z" className={c.pleinOr} stroke="rgba(8,8,10,0.7)" strokeWidth={0.8} />
          <circle cx={6} cy={128.4} r={1.7} className={c.pleinClair} />
          <circle cx={84} cy={128.4} r={1.7} className={c.pleinClair} />
        </>
      )}
      {o === "laurier" && (
        <>
          {/* deux branches de laurier qui montent de la pointe et se rejoignent au-dessus du personnage */}
          <Branche />
          <g transform="translate(90 0) scale(-1 1)">
            <Branche />
          </g>
          <circle cx={45} cy={143.4} r={2.5} className={c.pleinOr} stroke="rgba(8,8,10,0.7)" strokeWidth={0.8} />
          <path d="M45,1.4L48.4,5L45,8.6L41.6,5Z" className={c.pleinClair} stroke="rgba(8,8,10,0.7)" strokeWidth={0.7} />
        </>
      )}
      {o === "fronton" && (
        <>
          <defs>
            <linearGradient id={`${id}-or`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f0dca0" />
              <stop offset="0.5" stopColor="#c9a45a" />
              <stop offset="1" stopColor="#8d6a2b" />
            </linearGradient>
            <linearGradient id={`${id}-ar`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#8d6a2b" />
              <stop offset="0.45" stopColor="#e2c47e" />
              <stop offset="1" stopColor="#a47e36" />
            </linearGradient>
          </defs>
          {/* les deux pilastres, du fronton à la pointe */}
          <rect x={3.4} y={23.4} width={2.9} height={104} fill={`url(#${id}-ar)`} stroke="rgba(8,8,10,0.55)" strokeWidth={0.5} />
          <rect x={83.7} y={23.4} width={2.9} height={104} fill={`url(#${id}-ar)`} stroke="rgba(8,8,10,0.55)" strokeWidth={0.5} />
          {/* le socle : un chevron de laiton qui suit la pointe, une pastille au milieu */}
          <path d="M3.4,127L45,144.2L86.6,127" className={c.dore} strokeWidth={4.2} strokeLinejoin="miter" />
          <path d="M3.4,125.4L45,142.6L86.6,125.4" className={c.doreClair} strokeWidth={0.8} strokeOpacity={0.85} />
          <circle cx={45} cy={141.6} r={2.5} className={c.pleinClair} stroke="rgba(8,8,10,0.7)" strokeWidth={0.8} />
          {/* le fronton : la corniche, le triangle, son tympan sombre et le médaillon */}
          <rect x={3.2} y={19.4} width={83.6} height={4.2} fill={`url(#${id}-or)`} stroke="rgba(8,8,10,0.6)" strokeWidth={0.6} />
          <path d="M3.6,19.4L45,2.6L86.4,19.4Z" fill={`url(#${id}-or)`} stroke="rgba(8,8,10,0.6)" strokeWidth={0.6} strokeLinejoin="miter" />
          <path d="M10.5,17.4L45,5.6L79.5,17.4Z" fill="rgba(14,12,9,0.62)" stroke="#ecd9a4" strokeOpacity={0.7} strokeWidth={0.6} />
          <circle cx={45} cy={13.6} r={4.9} fill={`url(#${id}-or)`} stroke="rgba(8,8,10,0.65)" strokeWidth={0.6} />
          <circle cx={45} cy={13.6} r={3.2} fill="#17140f" stroke="#ecd9a4" strokeWidth={0.5} />
          <path d="M45,10.9L47.3,13.6L45,16.3L42.7,13.6Z" className={c.pleinClair} />
        </>
      )}
    </svg>
  );
}

/** La vignette d'un ornement : le fanion nu (sans bannière du joueur, sans personnage), pour les listes. */
export function VignetteOrnement({ cle, className = "" }: { cle?: string | null; className?: string }) {
  return (
    <span aria-hidden className={cx(c.vignette, className)}>
      <BanniereHeros ornement={cle} fond={<span className={c.fondNeutre} />} />
    </span>
  );
}

/**
 * Le personnage du joueur, posé en bas du fanion qui le porte (position: absolute, inset 0 ; le fanion est son cadre) :
 * il déborde par le haut (jusqu'à 20 %) et, très peu, sur les côtés (--dx) ; le bas suit la pointe. `taille` et `pos`
 * sont ceux de profile_style (cadragePerso : un transform posé en ligne). Décor pur : alt vide, aria-hidden, aucun clic.
 * `className` règle la boîte (la CSS du podium y pose ses propres bornes).
 */
export function PersoBanniere({ perso, taille = PERSO_TAILLE_DEFAUT, pos = PERSO_POS_DEFAUT, className = "" }: { perso: string; taille?: number; pos?: number; className?: string }) {
  const { echelle, decalageY } = cadragePerso(taille, pos);
  return (
    <span aria-hidden className={cx(c.persoBoite, className)} data-perso="">
      <span className={c.persoMasque}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={perso} alt="" className={c.perso} draggable={false} loading="lazy" decoding="async" style={{ transform: `translateY(${decalageY}%) scale(${echelle})` }} />
      </span>
    </span>
  );
}

/**
 * La bannière verticale seule : la bannière du joueur en fond (`fond`, par exemple <Banniere … className="h-full w-full" />),
 * l'ornement, le personnage qui déborde, puis `children` (le pseudo, un titre…), en bas, lisible sur le voile.
 * Le parent donne la largeur ; la hauteur suit (9 : 15). Avec un personnage, la boîte réserve au-dessus la place de son débordement.
 * Sans personnage, la bannière est celle d'avant : seul l'ornement l'habille.
 */
export function BanniereHeros({
  fond,
  perso = null,
  persoTaille = PERSO_TAILLE_DEFAUT,
  persoPos = PERSO_POS_DEFAUT,
  ornement = ORNEMENT_DEFAUT,
  children,
  anime = false,
  className = "",
}: {
  fond: ReactNode;
  perso?: string | null;
  persoTaille?: number;
  persoPos?: number;
  ornement?: string | null;
  children?: ReactNode;
  /** le personnage respire à peine (l'aperçu de Personnaliser) */
  anime?: boolean;
  className?: string;
}) {
  return (
    <span className={cx(c.boite, className)} data-perso={perso ? "1" : "0"}>
      <span className={cx(c.heros, anime && c.anime)}>
        <span aria-hidden className={c.cadre} />
        <span aria-hidden className={c.forme}>
          {fond}
          <span className={c.ombre} />
        </span>
        <OrnementBanniere cle={ornement} />
        {perso && <PersoBanniere perso={perso} taille={persoTaille} pos={persoPos} />}
        {children && <span className={c.contenu}>{children}</span>}
      </span>
    </span>
  );
}

/** Le pseudo, dans la bannière (du vrai texte, lisible, pas un décor). */
export function PseudoBanniere({ children }: { children: ReactNode }) {
  return <span className={cx(c.pseudo, "font-brand")}>{children}</span>;
}

/**
 * Le personnage sur un bandeau horizontal (l'en-tête du profil, la carte joueur) : posé en bas du bandeau, contenu par ses
 * bords (le bandeau coupe ; le débordement par le haut est celui du fanion vertical, pas d'ici). `className` pose `--x`
 * (le centre du personnage, en % de la largeur ; 50 % par défaut), par exemple « [--x:70%] ». Décor pur.
 */
export function PersoSurBandeau({ perso, taille = PERSO_TAILLE_DEFAUT, pos = PERSO_POS_DEFAUT, className = "" }: { perso: string; taille?: number; pos?: number; className?: string }) {
  const { echelle, decalageY } = cadragePerso(taille, pos);
  return (
    <span aria-hidden className={cx(c.bandeau, className)} data-perso-bandeau="">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={perso} alt="" className={c.bandeauImg} draggable={false} loading="lazy" decoding="async" style={{ transform: `translateY(${decalageY}%) scale(${echelle})` }} />
    </span>
  );
}
