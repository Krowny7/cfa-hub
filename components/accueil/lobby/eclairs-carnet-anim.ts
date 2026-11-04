import { bruit, rgb } from "@/components/ui/arc-coin-anim";

// Les éclairs du carnet de jours (EclairsCarnet.tsx) : le courant de la carte des 5
// (arc-coin-anim.ts), en tour complet autour de chaque case [data-eclair]. Une seule
// toile pour toute la grille, deux fils qui se tressent par case, le bruit coule dans
// le temps. 30 images par seconde suffisent à cette taille. En pause hors écran et
// onglet caché ; mouvement réduit ou ?mouvement=off : une seule image, posée.

/** l'instant dessiné quand rien ne bouge */
const POSE = 2.4;
const POINTS = 44;
/** l'écart entre la case et le courant, en px */
const RETRAIT = 1.6;
const IMAGE_MS = 33;
const FILS = [
  { ampl: 1.9, graine: 0, epais: 1, force: 1 },
  { ampl: 2.6, graine: 7.3, epais: 0.6, force: 0.6 },
];
type Rect = { x: number; y: number; w: number; h: number };

/** le contour de la case, déformé par le bruit : sur un cercle de bruit, il se referme sans couture */
function tracer(ctx: CanvasRenderingContext2D, q: Rect, t: number, graine: number, ampl: number) {
  ctx.beginPath();
  for (let i = 0; i < POINTS; i++) {
    const a = (i / POINTS) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const carre = 1 / Math.max(Math.abs(c), Math.abs(s));
    const d = ampl * (0.6 * bruit(c * 1.3 + graine, s * 1.3 + t * 1.1) + 0.4 * bruit(c * 3.1 + graine + 5, s * 3.1 + t * 3.2));
    const x = q.x + q.w / 2 + (q.w / 2 + RETRAIT + d) * c * carre;
    const y = q.y + q.h / 2 + (q.h / 2 + RETRAIT + d) * s * carre;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

function dessiner(ctx: CanvasRenderingContext2D, cases: Rect[], w: number, h: number, dpr: number, t: number, [r, v, b]: [number, number, number]) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineJoin = "round";
  cases.forEach((q, i) => {
    const o = i * 11.7;
    ctx.globalAlpha = 0.82 + 0.18 * Math.sin(t * 1.7 + i * 1.3);
    for (const f of FILS) {
      tracer(ctx, q, t, f.graine + o, f.ampl);
      // halo flou, cœur coloré, âme blanche : les trois couches de l'arc du coin
      ctx.shadowColor = `rgba(${r},${v},${b},0.9)`;
      ctx.shadowBlur = 7 * dpr;
      ctx.strokeStyle = `rgba(${r},${v},${b},${0.6 * f.force})`;
      ctx.lineWidth = 2.4 * f.epais;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = `rgba(${(r + 255) >> 1},${(v + 255) >> 1},${(b + 255) >> 1},${0.9 * f.force})`;
      ctx.lineWidth = 1.1 * f.epais;
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${0.85 * f.force})`;
      ctx.lineWidth = 0.45 * f.epais;
      ctx.stroke();
    }
  });
}

export function animerEclairsCases(toile: HTMLCanvasElement, couleur: string): () => void {
  const ctx = toile.getContext("2d");
  const grille = toile.parentElement;
  if (!ctx || !grille) return () => {};
  const c = rgb(couleur);
  const reduit = window.matchMedia("(prefers-reduced-motion: reduce)");
  const immobile = () => reduit.matches || document.documentElement.dataset.rlMotion === "off";
  let cases: Rect[] = [];
  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let derniere = 0;
  let visible = typeof IntersectionObserver === "undefined";

  const mesurer = () => {
    const b = toile.getBoundingClientRect();
    w = b.width;
    h = b.height;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const lw = Math.round(w * dpr);
    const lh = Math.round(h * dpr);
    if (toile.width !== lw) toile.width = lw;
    if (toile.height !== lh) toile.height = lh;
    // au téléphone, les vieilles semaines sont masquées : leurs cases n'ont pas de taille
    cases = [...grille.querySelectorAll("[data-eclair]")]
      .map((e) => e.getBoundingClientRect())
      .filter((q) => q.width > 0)
      .map((q) => ({ x: q.left - b.left, y: q.top - b.top, w: q.width, h: q.height }));
  };
  const image = (t: number) => dessiner(ctx, cases, w, h, dpr, t, c);
  const boucle = (ms: number) => {
    raf = 0;
    if (!visible || document.hidden || immobile()) return;
    if (ms - derniere >= IMAGE_MS) {
      derniere = ms;
      image(ms / 1000);
    }
    raf = requestAnimationFrame(boucle);
  };
  const relancer = () => {
    if (immobile()) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      image(POSE);
      return;
    }
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(boucle);
  };
  const taille = new ResizeObserver(() => {
    mesurer();
    image(immobile() ? POSE : performance.now() / 1000);
    relancer();
  });
  taille.observe(grille);
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
    document.removeEventListener("visibilitychange", relancer);
    reduit.removeEventListener?.("change", relancer);
  };
}
