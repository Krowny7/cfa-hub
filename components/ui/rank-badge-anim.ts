"use client";

import { INSIGNES, LIQUIDE_FRAG, LIQUIDE_VERT, formesDe, liquideFige, type Forme, type Pt } from "@/lib/rank-badge";

// L'animation des insignes de rang, pour tout le site : une seule boucle et
// un seul contexte WebGL, quel que soit le nombre d'insignes à l'écran.
// - le liquide marbré coule lentement (~15 images/s : le mouvement est lent,
//   il reste fluide, et la carte graphique travaille deux fois moins), à
//   partir de l'image figée ;
// - l'aura électrique tremble (le bruit change de graine par à-coups) ;
// - des arcs courent le long des arêtes, par rafales.
// Seuls les insignes visibles bougent (IntersectionObserver). Mouvement
// réduit, ?mouvement=off ou onglet caché : rien ne bouge.
// Le même liquide (même shader, même vitesse, même boucle) remplit aussi
// l'onglet actif des barres de navigation (animerEncre) : aux couleurs de la
// palette de la page, dans un canvas à la taille de l'onglet. Et la grande
// carte « Cours complets » de Réviser (même appel, motif plus large).

type Encre = {
  /** pixels du canvas par « carré de référence » du shader (le motif garde l'échelle des insignes) */
  ref: number;
  courant: number[][];
  fondu: { de: number[][]; vers: number[][]; debut: number } | null;
  cle: string;
  peint: boolean;
};

type Entree = {
  /** -1 pour l'encre d'un onglet */
  palier: number;
  encre?: Encre;
  racine?: HTMLElement;
  canvas: HTMLCanvasElement | null;
  bruit: SVGElement | null;
  eclairs: SVGGElement | null;
  arcs: boolean;
  visible: boolean;
  depart: number;
  v: number;
  prochain: number;
  fin: number;
  derniere: number;
};

const entrees = new Set<Entree>();
let raf = 0;
let observateur: IntersectionObserver | null = null;
const parElement = new WeakMap<Element, Entree>();

const immobile = () =>
  typeof window === "undefined" ||
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
  document.documentElement.dataset.rlMotion === "off";

// ── le liquide : un contexte WebGL partagé, recopié dans chaque canvas ────
type Moteur = { peindre: (cible: HTMLCanvasElement, couleurs: number[][], graine: number, t: number, ref?: number) => void };
let moteur: Moteur | null | undefined;
/** côté du canvas WebGL partagé : 256 px au plus pour un insigne, 512 pour l'encre (une grande carte) */
const GL_COTE = 512;
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const couleursInsignes = INSIGNES.map((d) => d.liquide.map(rgb));
function creerMoteur(): Moteur | null {
  try {
    const cv = document.createElement("canvas");
    cv.width = cv.height = GL_COTE;
    const gl = cv.getContext("webgl", { preserveDrawingBuffer: true, antialias: false });
    if (!gl) return null;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, LIQUIDE_VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, LIQUIDE_FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const u = { res: U("res"), t: U("t"), graine: U("graine"), c: [U("c0"), U("c1"), U("c2"), U("c3")] };
    return {
      // ref : sans lui, le motif remplit tout le canvas (insignes carrés) ; avec
      // lui, il garde son échelle et le canvas en découvre autant que sa forme
      // (l'onglet, bien plus large que haut ; une carte)
      peindre(cible, couleurs, graine, t, ref) {
        const max = ref ? GL_COTE : 256;
        const w = Math.min(max, cible.width), h = Math.min(max, cible.height);
        gl.viewport(0, 0, w, h);
        gl.uniform2f(u.res, ref ?? w, ref ?? h);
        gl.uniform1f(u.t, t);
        gl.uniform1f(u.graine, graine);
        couleurs.forEach((c, k) => gl.uniform3fv(u.c[k], c));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        const ctx = cible.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, cible.width, cible.height);
        ctx.drawImage(cv, 0, GL_COTE - h, w, h, 0, 0, cible.width, cible.height);
      },
    };
  } catch {
    return null;
  }
}

// ── les arcs : partent d'une arête, longent le contour au-dehors ──────────
const aretes: [Pt, Pt][][] = INSIGNES.map((d) => {
  const out: [Pt, Pt][] = [];
  for (const f of formesDe(d) as Forme[]) for (let k = 0; k < f.length; k++) out.push([f[k], f[(k + 1) % f.length]]);
  return out;
});
const dehors = ([x, y]: Pt, d: number): Pt => {
  const dx = x - 100, dy = y - 100, l = Math.hypot(dx, dy) || 1;
  return [x + (dx / l) * d, y + (dy / l) * d];
};
function brise(a: Pt, b: Pt, amp: number, n = 4): Pt[] {
  let p: Pt[] = [a, b];
  for (let s = 0; s < n; s++) {
    const q: Pt[] = [p[0]];
    for (let k = 1; k < p.length; k++) {
      const [x1, y1] = p[k - 1], [x2, y2] = p[k];
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
      const off = (Math.random() - 0.5) * len * amp;
      q.push([(x1 + x2) / 2 - (dy / len) * off, (y1 + y2) / 2 + (dx / len) * off], p[k]);
    }
    p = q;
  }
  return p;
}
const trace = (p: Pt[]) => "M" + p.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L");
function dessinerArcs(g: SVGGElement, palier: number) {
  const e = INSIGNES[palier].elec;
  if (!e) return;
  const A = aretes[palier];
  let h = "";
  for (let k = 0; k < (e.n ?? 1); k++) {
    const i = Math.floor(Math.random() * A.length);
    const [a, b] = A[i];
    const [c, d] = A[(i + 1 + Math.floor(Math.random() * 2)) % A.length];
    const t1 = Math.random(), t2 = Math.random();
    const p1 = dehors([a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1], 4 + Math.random() * 4);
    const p2 = dehors([c[0] + (d[0] - c[0]) * t2, c[1] + (d[1] - c[1]) * t2], 4 + Math.random() * 4);
    const traits = [brise(p1, p2, 0.42)];
    if (Math.random() < 0.6) {
      const m = traits[0][Math.floor(traits[0].length / 2)];
      traits.push(brise(m, dehors(m, 16 + Math.random() * 22), 0.5, 3));
    }
    const col = e.c2 && k % 2 ? e.c2 : e.c;
    for (const tr of traits) {
      const s = trace(tr);
      h += `<path d="${s}" stroke="${col}" stroke-width="4" stroke-opacity=".45" style="filter:blur(1.8px)"/><path d="${s}" stroke="#ffffff" stroke-width="1.1"/>`;
    }
  }
  g.innerHTML = h;
}

// ── l'encre des onglets : le même liquide, aux couleurs de la palette ─────
const ENCRE_GRAINE = 12.4;
const ENCRE_T0 = 9;
const ENCRE_V = 0.5; // la vitesse des insignes (0.45 à 0.55)
const ENCRE_ECHELLE = 96; // px CSS d'un carré de référence (le liquide d'un insigne de 96 px)
const ENCRE_DPR = 1.5;
const ENCRE_MAX = GL_COTE; // px du canvas, au plus, par côté
const ENCRE_FONDU = 450; // ms : changement de palette, calé sur la glissade de la pastille

const lisse = (k: number) => k * k * (3 - 2 * k);
/** Les couleurs affichées à l'instant t (en plein fondu entre deux palettes, ou non). */
function couleursEncre(en: Encre, t: number): number[][] {
  if (!en.fondu) return en.courant;
  const k = Math.max(0, Math.min(1, (t - en.fondu.debut) / ENCRE_FONDU));
  const { de, vers } = en.fondu;
  if (k >= 1) {
    en.courant = vers;
    en.fondu = null;
    return vers;
  }
  return de.map((a, i) => a.map((v, j) => v + (vers[i][j] - v) * lisse(k)));
}
function peindreEncre(e: Entree, t: number) {
  const en = e.encre!;
  // mode discret : l'onglet n'a ni texture ni liquide (le CSS masque le canvas)
  if (!moteur || !e.canvas || !en.ref || document.documentElement.dataset.discreet === "1") return;
  moteur.peindre(e.canvas, couleursEncre(en, t), ENCRE_GRAINE, ENCRE_T0 + ((t - e.depart) / 1000) * ENCRE_V, en.ref);
  if (!en.peint) {
    // dès la première image : le CSS retire la texture de repli
    en.peint = true;
    e.racine?.setAttribute("data-vivant", "1");
  }
}

/**
 * Fait couler le liquide des insignes dans le canvas d'un onglet (`racine` :
 * l'onglet, qui contient le canvas). `tons` : quatre couleurs #rrggbb
 * [fond, principal, bandes, traînées claires], comme `liquide` d'un insigne.
 * `echelle` : px CSS d'un carré de référence du motif (96 par défaut, celle
 * des insignes ; plus grand pour une grande carte : des veines plus calmes).
 */
export function animerEncre(racine: HTMLElement, canvas: HTMLCanvasElement, tons: readonly string[], echelle = ENCRE_ECHELLE) {
  if (typeof window === "undefined") return { regler: (_: readonly string[]) => {}, arreter: () => {} };
  const en: Encre = { ref: 0, courant: tons.map(rgb), fondu: null, cle: tons.join(), peint: false };
  const e: Entree = { palier: -1, encre: en, racine, canvas, bruit: null, eclairs: null, arcs: false, visible: false, depart: performance.now(), v: ENCRE_V, prochain: 0, fin: 0, derniere: 0 };
  entrees.add(e);
  parElement.set(racine, e);
  // canvas à la taille de l'onglet (devicePixelRatio plafonné, ENCRE_MAX px au
  // plus par côté) : une seule échelle pour les deux côtés, le motif ne se
  // déforme pas sur une carte large (le navigateur l'agrandit, il reste net :
  // le liquide est flou par nature)
  const mesurer = (w: number, h: number) => {
    if (w < 2 || h < 2) return;
    const k = Math.min(window.devicePixelRatio || 1, ENCRE_DPR, ENCRE_MAX / w, ENCRE_MAX / h);
    const cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    en.ref = echelle * k;
  };
  // la boîte de padding (clientWidth/clientHeight) : celle que couvre le canvas
  // (inset: 0) ; contentRect, sans le padding, étirerait le motif sur une carte
  // à marges intérieures. Observée en border-box : un changement de padding
  // seul relance aussi la mesure.
  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(() => mesurer(racine.clientWidth, racine.clientHeight));
    ro.observe(racine, { box: "border-box" });
  } else mesurer(racine.clientWidth, racine.clientHeight);
  if (typeof IntersectionObserver === "undefined") e.visible = true;
  else {
    observateur ??= new IntersectionObserver((list) => {
      for (const it of list) {
        const x = parElement.get(it.target);
        if (x) x.visible = it.isIntersecting;
      }
    });
    observateur.observe(racine);
  }
  if (!raf) raf = requestAnimationFrame(boucle);
  return {
    /** change de palette : les couleurs se fondent de l'une à l'autre */
    regler(nouveaux: readonly string[]) {
      const cle = nouveaux.join();
      if (cle === en.cle) return;
      en.cle = cle;
      const t = performance.now();
      en.courant = couleursEncre(en, t);
      en.fondu = { de: en.courant, vers: nouveaux.map(rgb), debut: t };
    },
    arreter() {
      entrees.delete(e);
      ro?.disconnect();
      observateur?.unobserve(racine);
      racine.removeAttribute("data-vivant");
    },
  };
}

// ── la boucle ─────────────────────────────────────────────────────────────
let dernierLiquide = 0, dernierBruit = 0;
function boucle(t: number) {
  raf = 0;
  if (!entrees.size) return;
  if (!immobile() && !document.hidden) {
    if (t - dernierLiquide > 66) {
      dernierLiquide = t;
      if (moteur === undefined) moteur = creerMoteur();
      if (moteur)
        for (const e of entrees) {
          if (!e.visible || !e.canvas) continue;
          if (e.encre) peindreEncre(e, t);
          else {
            const f = liquideFige(e.palier);
            moteur.peindre(e.canvas, couleursInsignes[e.palier], f.graine, f.t + ((t - e.depart) / 1000) * e.v);
          }
        }
    }
    if (t - dernierBruit > 70) {
      dernierBruit = t;
      for (const e of entrees) {
        if (!e.visible || !e.bruit) continue;
        e.bruit.setAttribute("seed", String(1 + Math.floor(Math.random() * 400)));
        e.bruit.setAttribute("baseFrequency", (0.04 + Math.random() * 0.025).toFixed(3));
      }
    }
    for (const e of entrees) {
      const el = e.palier >= 0 ? INSIGNES[e.palier].elec : undefined;
      if (!e.visible || !e.arcs || !e.eclairs || !el || !el.arcs) continue;
      if (t > e.prochain) {
        e.fin = t + 220 + Math.random() * 260;
        e.prochain = t + el.arcs * (0.6 + Math.random() * 0.8);
      }
      if (t < e.fin) {
        if (t - e.derniere > 55) {
          dessinerArcs(e.eclairs, e.palier);
          e.derniere = t;
        }
      } else if (e.eclairs.firstChild) e.eclairs.innerHTML = "";
    }
  }
  raf = requestAnimationFrame(boucle);
}

/** Fait vivre un insigne ; renvoie de quoi l'arrêter. */
export function animerInsigne(
  racine: HTMLElement,
  palier: number,
  parts: { canvas: HTMLCanvasElement | null; bruit: SVGElement | null; eclairs: SVGGElement | null; arcs: boolean },
): () => void {
  if (typeof window === "undefined") return () => {};
  const e: Entree = { palier, ...parts, visible: false, depart: performance.now(), v: 0.45 + Math.random() * 0.1, prochain: performance.now() + 600 + Math.random() * 1500, fin: 0, derniere: 0 };
  entrees.add(e);
  parElement.set(racine, e);
  if (typeof IntersectionObserver === "undefined") e.visible = true;
  else {
    observateur ??= new IntersectionObserver((list) => {
      for (const it of list) {
        const x = parElement.get(it.target);
        if (x) x.visible = it.isIntersecting;
      }
    });
    observateur.observe(racine);
  }
  if (!raf) raf = requestAnimationFrame(boucle);
  return () => {
    entrees.delete(e);
    observateur?.unobserve(racine);
    if (e.eclairs) e.eclairs.innerHTML = "";
  };
}
