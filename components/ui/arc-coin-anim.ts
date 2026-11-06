// L'arc du coin (components/ui/ArcCoin.tsx) : un courant électrique qui longe
// le coin bas droit d'une carte, plein près du coin, effilé vers les deux bouts.
// Canvas 2D, une image par rafraîchissement de l'écran, et tout en continu :
// le bruit coule dans le temps au lieu de changer de graine par à-coups.
// - deux fils collés au bord qui se tressent (un principal, un plus fin) ;
// - une vague de lumière parcourt le coin toutes les quelques secondes ;
// - de temps en temps, une courte branche part vers l'intérieur et s'éteint.
// En pause hors écran et onglet caché. Mouvement réduit ou ?mouvement=off
// (data-rl-motion="off") : une seule image, posée.

type Geo = {
  w: number;
  h: number;
  /** arrondi de la carte */
  r: number;
  /** longueur droite le long du bas, puis du quart de cercle, puis du bord droit */
  bas: number;
  quart: number;
  droite: number;
  l: number;
};
type Branche = { s: number; ne: number; vie: number; long: number; angle: number; graine: number };
/** ecart : un sommet tous les `ecart` px, reliés en ligne droite (les angles de l'éclair) */
type Fil = { ampl: number; ecart: number; graine: number; force: number; epais: number };

/** l'instant dessiné quand rien ne bouge */
const POSE = 2.4;
/** un point tous les 2,5 px le long de l'arc */
const PAS = 2.5;
/** l'arc est collé au bord de la carte, il ne s'en écarte que vers l'intérieur */
const RETRAIT = 0.7;
const FILS: Fil[] = [
  { ampl: 3, ecart: 7, graine: 0, force: 1, epais: 1.15 },
  { ampl: 4.2, ecart: 9, graine: 1, force: 0.6, epais: 0.6 },
];
const VAGUE = { periode: 4.2, course: 1.5, largeur: 38 };

/** la présence de l'arc, choisie par Théo le 2026-11-06 : coin chargé, décharge qui parcourt le bord, trait épais */
type ReglageArc = { long: number; gain: number; epais: number; halo: number; vague: number; retrait: number };
const ARC: ReglageArc = { long: 1.25, gain: 1.45, epais: 2, halo: 1.9, vague: 2.1, retrait: RETRAIT };
const FIL_3: Fil = { ampl: 5.4, ecart: 11, graine: 2, force: 0.42, epais: 0.5 };

// —— bruit de gradient 2D (espace le long de l'arc × temps), continu partout ——
function hache(i: number, j: number): number {
  let h = Math.imul(i, 374761393) + Math.imul(j, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function pente(i: number, j: number, x: number, y: number): number {
  const a = hache(i, j) * Math.PI * 2;
  return Math.cos(a) * x + Math.sin(a) * y;
}
const lisse = (f: number) => f * f * f * (f * (f * 6 - 15) + 10);
export function bruit(x: number, y: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const u = lisse(fx);
  const v = lisse(fy);
  const a = pente(i, j, fx, fy) + (pente(i + 1, j, fx - 1, fy) - pente(i, j, fx, fy)) * u;
  const b = pente(i, j + 1, fx, fy - 1) + (pente(i + 1, j + 1, fx - 1, fy - 1) - pente(i, j + 1, fx, fy - 1)) * u;
  return (a + (b - a) * v) * 1.4;
}
const palier = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

function geometrie(w: number, h: number, r: number, q: ReglageArc): Geo {
  const bas = Math.max(40, Math.min(w * 0.5 * q.long - r, 280 * q.long));
  const droite = Math.max(30, Math.min(h * 0.72 * q.long - r, 170 * q.long));
  const quart = (Math.PI / 2) * r;
  return { w, h, r, bas, quart, droite, l: bas + quart + droite };
}

/** le point du bord à l'abscisse s, et la normale vers l'intérieur de la carte */
function bord(g: Geo, s: number): [number, number, number, number] {
  if (s <= g.bas) return [g.w - g.r - (g.bas - s), g.h, 0, -1];
  if (s <= g.bas + g.quart) {
    const a = Math.PI / 2 - ((s - g.bas) / g.quart) * (Math.PI / 2);
    const ox = Math.cos(a);
    const oy = Math.sin(a);
    return [g.w - g.r + ox * g.r, g.h - g.r + oy * g.r, -ox, -oy];
  }
  return [g.w, g.h - g.r - (s - g.bas - g.quart), -1, 0];
}

/** 1 près du coin, 0 aux deux bouts ; `plein` règle jusqu'où il reste entier */
function enveloppe(g: Geo, s: number, plein: number): number {
  const c = g.bas + g.quart / 2;
  const u = s < c ? (c - s) / c : (s - c) / (g.l - c);
  return 1 - palier(plein, 1, u);
}

function vague(t: number, l: number): ((s: number) => number) | null {
  const k = Math.floor(t / VAGUE.periode);
  const ph = (t - k * VAGUE.periode) / VAGUE.course;
  if (ph >= 1) return null;
  const e = ph * ph * (3 - 2 * ph);
  const sig = VAGUE.largeur;
  let pos = -1.5 * sig + e * (l + 3 * sig);
  if (k % 2) pos = l - pos;
  const force = Math.sin(Math.PI * ph);
  return (s) => force * Math.exp(-(((s - pos) / sig) ** 2));
}

export function rgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1], 16) : 0x9ff0ff;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function ruban(ctx: CanvasRenderingContext2D, xs: Float32Array, ys: Float32Array, nx: Float32Array, ny: Float32Array, lg: Float32Array, k: number, n: number) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const d = lg[i] * k * 0.5;
    if (i) ctx.lineTo(xs[i] + nx[i] * d, ys[i] + ny[i] * d);
    else ctx.moveTo(xs[i] + nx[i] * d, ys[i] + ny[i] * d);
  }
  for (let i = n - 1; i >= 0; i--) {
    const d = lg[i] * k * 0.5;
    ctx.lineTo(xs[i] - nx[i] * d, ys[i] - ny[i] * d);
  }
  ctx.closePath();
  ctx.fill();
}

/** un tracé lumineux en trois couches : halo flou, cœur coloré, âme blanche */
function lumiere(ctx: CanvasRenderingContext2D, c: [number, number, number], dpr: number, trace: (k: number) => void, epais: number) {
  const [r, v, b] = c;
  ctx.shadowColor = `rgba(${r},${v},${b},0.9)`;
  ctx.shadowBlur = 12 * dpr;
  ctx.fillStyle = `rgba(${r},${v},${b},0.6)`;
  trace(3.2 * epais);
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.fillStyle = `rgba(${(r + 255) >> 1},${(v + 255) >> 1},${(b + 255) >> 1},0.9)`;
  trace(1.45 * epais);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  trace(0.6 * epais);
}

function dessiner(ctx: CanvasRenderingContext2D, g: Geo, dpr: number, t: number, c: [number, number, number], branches: Branche[] | null, q: ReglageArc) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, g.w, g.h);
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(0, 0, g.w, g.h, g.r);
  else ctx.rect(0, 0, g.w, g.h);
  ctx.clip();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.9;

  const souffle = 0.84 + 0.16 * Math.sin(t * 1.7);
  const v = branches ? vague(t, g.l) : null;
  const n = Math.max(24, Math.ceil(g.l / PAS)) + 1;
  const xs = new Float32Array(n);
  const ys = new Float32Array(n);
  const nx = new Float32Array(n);
  const ny = new Float32Array(n);
  const lg = new Float32Array(n);
  const base = new Float32Array(n);
  let pic = 0;
  for (let i = 0; i < n; i++) {
    const s = (i / (n - 1)) * g.l;
    const vg = v ? v(s) * enveloppe(g, s, 0.62) : 0;
    base[i] = enveloppe(g, s, 0.45) ** 1.3 * souffle + vg * 0.95 * q.vague;
    pic = Math.max(pic, vg);
  }

  // la lueur posée sur le noir de la carte, au coin
  const [r, vv, b] = c;
  const halo = ctx.createRadialGradient(g.w - g.r * 0.4, g.h - g.r * 0.4, 0, g.w - g.r * 0.4, g.h - g.r * 0.4, 110 * Math.sqrt(q.halo) * (1 + 0.5 * pic * (q.vague - 1)));
  halo.addColorStop(0, `rgba(${r},${vv},${b},${((0.11 * souffle + 0.07 * pic * q.vague) * q.halo).toFixed(3)})`);
  halo.addColorStop(1, `rgba(${r},${vv},${b},0)`);
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, g.w, g.h);

  const sommets = new Float32Array(Math.ceil(g.l / 6) + 2);
  const pointsFil = (f: Fil) => {
    // les sommets bougent en continu ; entre deux, des segments droits
    const o = f.graine * 37.1;
    const ns = Math.ceil(g.l / f.ecart) + 1;
    for (let j = 0; j < ns; j++) {
      const sj = j * f.ecart;
      sommets[j] = f.ampl * q.gain * (0.55 * bruit(sj / 40 + o, t * 0.7 + o) + 0.45 * bruit(sj / 9 + o + 5.3, t * 3.2 + o));
    }
    for (let i = 0; i < n; i++) {
      const s = (i / (n - 1)) * g.l;
      const [x, y, ax, ay] = bord(g, s);
      const j = Math.min(ns - 2, Math.floor(s / f.ecart));
      const k = s / f.ecart - j;
      const d = (sommets[j] + (sommets[j + 1] - sommets[j]) * k) * (0.45 + 0.55 * base[i]);
      const off = Math.max(0.6, q.retrait + d);
      xs[i] = x + ax * off;
      ys[i] = y + ay * off;
      nx[i] = ax;
      ny[i] = ay;
      // des points chauds qui glissent le long du fil
      lg[i] = base[i] * f.force * (0.72 + 0.28 * bruit(s / 26 + o + 50, t * 2.6));
    }
  };
  for (const f of [...FILS, FIL_3]) {
    pointsFil(f);
    lumiere(ctx, c, dpr, (k) => ruban(ctx, xs, ys, nx, ny, lg, k, n), f.epais * q.epais);
  }

  // les branches partent du fil principal
  if (branches?.length) {
    pointsFil(FILS[0]);
    const m = 7;
    const bx = new Float32Array(m);
    const by = new Float32Array(m);
    const bnx = new Float32Array(m);
    const bny = new Float32Array(m);
    const bl = new Float32Array(m);
    for (const br of branches) {
      const age = (t - br.ne) / br.vie;
      if (age < 0 || age >= 1) continue;
      const i0 = Math.round((br.s / g.l) * (n - 1));
      const [, , ax, ay] = bord(g, br.s);
      // vers l'intérieur, penchée le long du bord
      const tx = -ay;
      const ty = ax;
      const ca = Math.cos(br.angle);
      const sa = Math.sin(br.angle);
      const dx = ax * ca + tx * sa;
      const dy = ay * ca + ty * sa;
      const pousse = Math.min(1, age / 0.3);
      const vie = Math.sin(Math.PI * age);
      for (let j = 0; j < m; j++) {
        const k = j / (m - 1);
        const l = k * br.long * pousse;
        const dev = 2.2 * k * bruit(k * 2.6 + br.graine, t * 4 + br.graine);
        bx[j] = xs[i0] + dx * l - dy * dev;
        by[j] = ys[i0] + dy * l + dx * dev;
        bnx[j] = -dy;
        bny[j] = dx;
        bl[j] = (1 - k) * vie * 0.75;
      }
      lumiere(ctx, c, dpr, (kk) => ruban(ctx, bx, by, bnx, bny, bl, kk, m), 1);
    }
  }
  ctx.restore();
}

/** Fait vivre l'arc du coin dans ce canvas ; renvoie de quoi l'arrêter. */
export function animerArcCoin(toile: HTMLCanvasElement, couleur: string, q: ReglageArc = ARC): () => void {
  const ctx = toile.getContext("2d");
  if (!ctx || typeof window === "undefined") return () => {};
  const c = rgb(couleur);
  const reduit = window.matchMedia("(prefers-reduced-motion: reduce)");
  const immobile = () => reduit.matches || document.documentElement.dataset.rlMotion === "off";
  const branches: Branche[] = [];
  let g: Geo | null = null;
  let dpr = 1;
  let raf = 0;
  let visible = typeof IntersectionObserver === "undefined";
  let prochaine = 0;
  /** taille en px CSS, non arrondie (donnée par le ResizeObserver) */
  let boite: [number, number] = [0, 0];

  const mesurer = () => {
    const w = boite[0] || toile.clientWidth;
    const h = boite[1] || toile.clientHeight;
    if (!w || !h) {
      g = null;
      return;
    }
    dpr = Math.min(2, window.devicePixelRatio || 1);
    // réécrire width ou height vide la toile : seulement si la taille change vraiment
    const lw = Math.round(w * dpr);
    const lh = Math.round(h * dpr);
    if (toile.width !== lw) toile.width = lw;
    if (toile.height !== lh) toile.height = lh;
    const r = parseFloat(getComputedStyle(toile.parentElement ?? toile).borderBottomRightRadius);
    g = geometrie(w, h, Number.isFinite(r) ? r : 16, q);
  };

  const vivre = (t: number) => {
    if (!g) return;
    for (let i = branches.length - 1; i >= 0; i--) if (t - branches[i].ne > branches[i].vie) branches.splice(i, 1);
    if (!prochaine || t - prochaine > 5) prochaine = t + 0.6;
    if (t >= prochaine) {
      // une branche là où l'arc est plein, près du coin
      const c0 = g.bas + g.quart / 2;
      const s = Math.max(0, Math.min(g.l, c0 + (Math.random() - 0.5) * 1.3 * Math.min(g.bas, g.droite)));
      branches.push({
        s,
        ne: t,
        vie: 0.3 + Math.random() * 0.18,
        long: 9 + Math.random() * 11,
        angle: (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.5),
        graine: Math.random() * 100,
      });
      prochaine = t + 0.8 + Math.random() * 1.2;
    }
  };

  const image = (t: number, vivant: boolean) => {
    if (g) dessiner(ctx, g, dpr, t, c, vivant ? branches : null, q);
  };
  const boucle = (ms: number) => {
    raf = 0;
    if (!visible || document.hidden || immobile()) return;
    const t = ms / 1000;
    vivre(t);
    image(t, true);
    raf = requestAnimationFrame(boucle);
  };
  const relancer = () => {
    if (immobile()) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      image(POSE, false);
      return;
    }
    if (!raf && visible && !document.hidden && g) raf = requestAnimationFrame(boucle);
  };

  // après un changement de taille ou de densité, on redessine tout de suite :
  // le ResizeObserver passe après la boucle, juste avant l'affichage
  const redimensionner = () => {
    mesurer();
    image(immobile() ? POSE : performance.now() / 1000, !immobile());
    relancer();
  };
  const taille = new ResizeObserver((l) => {
    const b = l[l.length - 1].contentBoxSize?.[0];
    boite = b ? [b.inlineSize, b.blockSize] : [toile.clientWidth, toile.clientHeight];
    redimensionner();
  });
  taille.observe(toile);
  // zoom du navigateur ou fenêtre passée sur un autre écran : la carte garde sa
  // taille en px CSS, mais la densité change (sinon l'arc deviendrait flou)
  let densite: MediaQueryList | null = null;
  const surDensite = () => {
    redimensionner();
    suivreDensite();
  };
  const suivreDensite = () => {
    densite?.removeEventListener?.("change", surDensite);
    densite = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    densite.addEventListener?.("change", surDensite);
  };
  suivreDensite();
  const vue =
    typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver((l) => {
          visible = l[l.length - 1].isIntersecting;
          relancer();
        });
  vue?.observe(toile);
  document.addEventListener("visibilitychange", relancer);
  reduit.addEventListener?.("change", relancer);
  mesurer();
  relancer();

  return () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    visible = false;
    taille.disconnect();
    vue?.disconnect();
    densite?.removeEventListener?.("change", surDensite);
    document.removeEventListener("visibilitychange", relancer);
    reduit.removeEventListener?.("change", relancer);
  };
}
