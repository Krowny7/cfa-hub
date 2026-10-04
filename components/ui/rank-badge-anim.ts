"use client";

import { INSIGNES, LIQUIDE_FRAG, LIQUIDE_VERT, formesDe, liquideFige, type Forme, type Pt } from "@/lib/rank-badge";

// L'animation des insignes de rang, pour tout le site : une seule boucle et
// un seul contexte WebGL, quel que soit le nombre d'insignes à l'écran.
// - le liquide marbré coule (~30 images/s), à partir de l'image figée ;
// - l'aura électrique tremble (le bruit change de graine par à-coups) ;
// - des arcs courent le long des arêtes, par rafales.
// Seuls les insignes visibles bougent (IntersectionObserver). Mouvement
// réduit, ?mouvement=off ou onglet caché : rien ne bouge.

type Entree = {
  palier: number;
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
type Moteur = { peindre: (cible: HTMLCanvasElement, palier: number, t: number) => void };
let moteur: Moteur | null | undefined;
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
function creerMoteur(): Moteur | null {
  try {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 256;
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
    const couleurs = INSIGNES.map((d) => d.liquide.map(rgb));
    return {
      peindre(cible, palier, t) {
        const w = Math.min(256, cible.width), h = Math.min(256, cible.height);
        gl.viewport(0, 0, w, h);
        gl.uniform2f(u.res, w, h);
        gl.uniform1f(u.t, t);
        gl.uniform1f(u.graine, liquideFige(palier).graine);
        couleurs[palier].forEach((c, k) => gl.uniform3fv(u.c[k], c));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        const ctx = cible.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, cible.width, cible.height);
        ctx.drawImage(cv, 0, 256 - h, w, h, 0, 0, cible.width, cible.height);
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

// ── la boucle ─────────────────────────────────────────────────────────────
let dernierLiquide = 0, dernierBruit = 0;
function boucle(t: number) {
  raf = 0;
  if (!entrees.size) return;
  if (!immobile() && !document.hidden) {
    if (t - dernierLiquide > 33) {
      dernierLiquide = t;
      if (moteur === undefined) moteur = creerMoteur();
      if (moteur)
        for (const e of entrees) {
          if (!e.visible || !e.canvas) continue;
          moteur.peindre(e.canvas, e.palier, liquideFige(e.palier).t + ((t - e.depart) / 1000) * e.v);
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
      const el = INSIGNES[e.palier].elec;
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
  const e: Entree = { palier, ...parts, visible: false, depart: performance.now(), v: 0.9 + Math.random() * 0.2, prochain: performance.now() + 600 + Math.random() * 1500, fin: 0, derniere: 0 };
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
