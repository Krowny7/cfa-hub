// Génère les tracés « encre » du site (components/ink/paths.ts) et la feuille
// de style globale (app/globals.css) qui en dépend.
// Usage : node scripts/ink/generate.cjs
//
// Attention : aucun antislash dans ce fichier ni dans ce qu'il produit.
// Tailwind v4 lit tous les fichiers du dépôt, et un antislash suivi de
// caractères hexadécimaux y est interprété comme un échappement CSS — ce qui a
// déjà cassé toute la génération des classes du site.
const fs = require("fs");
const path = require("path");
const { f, mulberry, ringPts, hexPts, circlePts, sampler, poly, brush, bristles, centerline, splatter, sk, skEllipse } = require("./ink-lib.cjs");

const root = path.join(__dirname, "..", "..");
const NL = String.fromCharCode(10);

function circlesToPath(svg) {
  let d = "";
  const re = new RegExp('<circle cx="([0-9.-]+)" cy="([0-9.-]+)" r="([0-9.-]+)"></circle>', "g");
  let m;
  while ((m = re.exec(svg))) {
    const x = +m[1], y = +m[2], r = +m[3];
    d += "M" + f(x - r) + " " + f(y) + "a" + f(r) + " " + f(r) + " 0 1 0 " + f(2 * r) + " 0a" + f(r) + " " + f(r) + " 0 1 0 " + f(-2 * r) + " 0";
  }
  return d;
}

function buildPaths() {
  const out = {};
  // Logo : anneau hexagonal à 74 %, pinceau sec — viewBox 0 0 240 240
  const lg = ringPts(120, 120, 92);
  const S = sampler(lg);
  out.LOGO_TRACK = poly(lg);
  out.LOGO_BRUSH = brush(lg, 0, 0.66, 25, 7, { outT: 0.22 });
  out.LOGO_BRISTLES = bristles(lg, 0.59, 0.745, 25, 8, 10);
  out.LOGO_AXIS = centerline(lg, 0, 0.745, 140);
  const p0 = S(0.004), tail = S(0.745);
  out.LOGO_SPLAT = circlesToPath(splatter(p0.x - 5, p0.y - 4, 8, 20, 5));
  out.LOGO_START = f(p0.x) + " " + f(p0.y);
  out.LOGO_TAIL = f(tail.x) + " " + f(tail.y) + " " + Math.atan2(tail.ty, tail.tx).toFixed(3);
  // Repères au crayon de l'intro (cercle de construction + axes), même repère que le logo
  const rg = mulberry(5);
  out.INTRO_GUIDE =
    skEllipse(120, 120, 124, 124, rg, { passes: 1, j: 2.5 }) +
    sk([-30, 120], [270, 120], rg, { passes: 1, over: 0 }) +
    sk([120, -30], [120, 270], rg, { passes: 1, over: 0 });
  // Case hexagonale (progression) — viewBox 0 0 240 276
  out.HEX_OUTLINE = poly(hexPts(120, 138, 116));
  out.HEX_TONE = poly(hexPts(120, 138, 110));
  out.HEX_INNER = poly(hexPts(120, 138, 80));
  const hr = ringPts(120, 138, 113);
  out.HEX_RING = brush(hr, 0, 1, 13, 101, { inT: 0.03, outT: 0.004, var: 0.1 });
  out.HEX_RING_AXIS = centerline(hr, 0, 1, 140);
  // Anneau circulaire (objectifs) — viewBox 0 0 240 240
  const cp = circlePts(120, 120, 100, 120);
  out.CIRCLE_RING = brush(cp, 0, 0.999, 16, 201, { inT: 0.04, outT: 0.01, var: 0.1 });
  out.CIRCLE_AXIS = centerline(cp, 0, 0.999, 120);
  // Coups de pinceau horizontaux — SWASH 0 0 400 64 · BAR 0 0 400 20 · UNDERLINE 0 0 300 14
  out.SWASH = brush([[10, 32], [390, 30], [390, 31], [10, 33]], 0, 0.49, 48, 9, { inT: 0.04, outT: 0.07, var: 0.06, wobble: 0.8 });
  out.BAR = brush([[6, 10], [394, 9], [394, 10], [6, 11]], 0, 0.495, 15, 77, { inT: 0.025, outT: 0.012, var: 0.08, wobble: 0.5 });
  out.UNDERLINE = brush([[4, 7], [296, 6], [296, 7], [4, 8]], 0, 0.48, 6, 21, { inT: 0.1, outT: 0.4, wobble: 0.6 });
  return out;
}

const uri = (svg) => 'url("data:image/svg+xml,' + svg.split('"').join("'").split("#").join("%23").split("<").join("%3C").split(">").join("%3E") + '")';
const svgPath = (vb, d, fill) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" preserveAspectRatio="none"><path fill="' + (fill || "#000") + '" d="' + d + '"/></svg>';
const grain = (rgb, a) =>
  '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/>' +
  '<feColorMatrix values="0 0 0 0 ' + rgb + '  0 0 0 0 ' + rgb + '  0 0 0 0 ' + rgb + '  0 0 0 ' + a + ' 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>';

function buildTheme() {
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const inkFamilies = ["blue", "sky", "indigo", "violet", "purple", "cyan", "teal", "green", "emerald", "lime", "yellow", "amber", "orange", "slate", "gray", "zinc", "stone"];
  const penFamilies = ["red", "rose", "pink", "fuchsia"];
  let t = "";
  for (const fam of inkFamilies) for (const s of shades) t += "  --color-" + fam + "-" + s + ": var(--ink);" + NL;
  for (const fam of penFamilies) for (const s of shades) t += "  --color-" + fam + "-" + s + ": var(--pen);" + NL;
  for (const s of [50, 100, 200, 300, 400]) t += "  --color-neutral-" + s + ": var(--ink);" + NL;
  t += "  --color-neutral-500: color-mix(in oklab, var(--ink) 60%, var(--paper));" + NL;
  t += "  --color-neutral-600: color-mix(in oklab, var(--ink) 45%, var(--paper));" + NL;
  t += "  --color-neutral-700: color-mix(in oklab, var(--ink) 30%, var(--paper));" + NL;
  t += "  --color-neutral-800: color-mix(in oklab, var(--ink) 14%, var(--paper));" + NL;
  t += "  --color-neutral-900: var(--paper-2);" + NL;
  t += "  --color-neutral-950: var(--paper);" + NL;
  return t;
}

function buildCss(p) {
  const tokens = {
    SWASH: uri(svgPath("0 0 400 64", p.SWASH)),
    BAR: uri(svgPath("0 0 400 20", p.BAR)),
    UNDER_DARK: uri(svgPath("0 0 300 14", p.UNDERLINE, "#141414")),
    UNDER_LIGHT: uri(svgPath("0 0 300 14", p.UNDERLINE, "#ECEAE4")),
    GRAIN_DARK: uri(grain(0, 0.045)),
    GRAIN_LIGHT: uri(grain(1, 0.035)),
    THEME: buildTheme(),
  };
  const tpl = fs.readFileSync(path.join(__dirname, "globals.template.css"), "utf8");
  return tpl.replace(/@@([A-Z_]+)@@/g, (_, k) => tokens[k]);
}

const paths = buildPaths();
let ts =
  "// Tracés « encre » — générés par scripts/ink/generate.cjs, ne pas éditer à la main." + NL +
  "// viewBox : LOGO_* et CIRCLE_* 0 0 240 240 · HEX_* 0 0 240 276 · SWASH 0 0 400 64 · BAR 0 0 400 20 · UNDERLINE 0 0 300 14" + NL +
  "// LOGO_START = « x y » du départ du trait ; LOGO_TAIL = « x y angle » du bout du pinceau." + NL + NL;
for (const [k, v] of Object.entries(paths)) ts += "export const " + k + " =" + NL + '  "' + v.replace(/ +/g, " ").trim() + '";' + NL + NL;
fs.writeFileSync(path.join(root, "components/ink/paths.ts"), ts);
const css = buildCss(paths);
fs.writeFileSync(path.join(root, "app/globals.css"), css);
const bs = (ts + css).split("").filter((c) => c.charCodeAt(0) === 92).length;
console.log("paths.ts", ts.length, "· globals.css", css.length, "· antislashs :", bs);
