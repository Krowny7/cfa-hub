"use client";

import { useEffect, useRef, useState } from "react";
import { Illustration } from "@/components/ui/Illustration";

// La peinture de la pêche, animée. Le décor est la peinture vide, les personnages sont
// découpés dans la peinture finie (public/illustrations/peche) : ils respirent, tournent la
// tête, l'écharpe flotte. Le reste est peint ici : les cannes, les fils, les ronds dans l'eau,
// la vapeur du thé, les reflets, et de temps en temps une touche au bout de la ligne.
// Immobile avec prefers-reduced-motion. Les couches ne se chargent qu'à l'approche de la carte,
// et l'animation s'arrête quand elle sort de l'écran : d'ici là, c'est la peinture finie.

const LARGE = 1792;
const HAUT = 592;

type Couche = { nom: string; x: number; y: number; w: number; h: number };
const COUCHES: Couche[] = [
  { nom: "a-corps", x: 909, y: 307, w: 192, h: 188 },
  { nom: "a-tete", x: 949, y: 253, w: 112, h: 72 },
  { nom: "a-echarpe", x: 835, y: 309, w: 179, h: 91 },
  { nom: "b-corps", x: 1095, y: 305, w: 168, h: 183 },
  { nom: "b-tete", x: 1151, y: 231, w: 104, h: 94 },
];

/** Les cannes : le bout tenu, caché par le corps, et la pointe. Puis le point d'entrée du fil dans l'eau. */
const CANNE_A = { pied: { x: 975, y: 330 }, bout: { x: 808, y: 162 }, eau: { x: 768, y: 541 } };
const CANNE_B = { pied: { x: 1166, y: 372 }, bout: { x: 1052, y: 118 }, eau: { x: 1092, y: 433 } };
const ASSISE_A = { x: 1015, y: 470 };
const ASSISE_B = { x: 1178, y: 468 };
const COU_A = { x: 1015, y: 325 };
const COU_B = { x: 1185, y: 322 };
const ANCRE_ECHARPE = 978;
const TASSE = { x: 1392, y: 476 };

type Reflet = { x: number; y: number; l: number; p: number; v: number };

function reflets(): Reflet[] {
  const zones = [
    [110, 470, 760, 586],
    [640, 372, 1000, 452],
    [1380, 440, 1790, 492],
  ];
  const liste: Reflet[] = [];
  let g = 7;
  const hasard = () => {
    g = (g * 16807) % 2147483647;
    return g / 2147483647;
  };
  zones.forEach(([x0, y0, x1, y1]) => {
    for (let i = 0; i < 22; i++) liste.push({ x: x0 + hasard() * (x1 - x0), y: y0 + hasard() * (y1 - y0), l: 10 + hasard() * 34, p: hasard() * 6.28, v: 0.5 + hasard() * 1.1 });
  });
  return liste;
}

/** Une canne de bambou : elle s'affine, ploie un peu, et ses nœuds suivent la courbe. */
function peindreCanne(c: CanvasRenderingContext2D, pied: { x: number; y: number }, bout: { x: number; y: number }, ploie: number) {
  const mx = (pied.x + bout.x) / 2 - ploie * 0.15;
  const my = (pied.y + bout.y) / 2 - 10 + ploie * 0.3;
  const point = (u: number) => ({
    x: (1 - u) * (1 - u) * pied.x + 2 * (1 - u) * u * mx + u * u * bout.x,
    y: (1 - u) * (1 - u) * pied.y + 2 * (1 - u) * u * my + u * u * bout.y,
  });
  const dessiner = (largeur: number, couleur: string) => {
    c.strokeStyle = couleur;
    c.lineCap = "round";
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = point(i / n);
      const b = point((i + 1) / n);
      c.lineWidth = largeur * (1 - (i / n) * 0.72);
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.stroke();
    }
  };
  dessiner(6, "#5f4e2c");
  dessiner(3.8, "#d2bb83");
  c.fillStyle = "#5f4e2c";
  for (const u of [0.18, 0.36, 0.53, 0.69, 0.83]) {
    const q = point(u);
    c.beginPath();
    c.arc(q.x, q.y, 3.2 * (1 - u * 0.7), 0, Math.PI * 2);
    c.fill();
  }
}

function peindreFil(c: CanvasRenderingContext2D, bout: { x: number; y: number }, eau: { x: number; y: number }, mou: number) {
  c.strokeStyle = "rgba(244, 241, 226, 0.75)";
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(bout.x, bout.y);
  c.quadraticCurveTo((bout.x + eau.x) / 2 + mou, (bout.y + eau.y) / 2, eau.x, eau.y);
  c.stroke();
}

function peindreRonds(c: CanvasRenderingContext2D, x: number, y: number, t: number, force: number, n: number) {
  c.lineWidth = 2;
  for (let i = 0; i < n; i++) {
    const u = (t * 0.32 + i / n) % 1;
    c.strokeStyle = `rgba(232, 250, 246, ${(1 - u) * 0.6 * force})`;
    c.beginPath();
    c.ellipse(x, y, 7 + u * 50, 2.2 + u * 15, 0, 0, Math.PI * 2);
    c.stroke();
  }
}

function peindreVapeur(c: CanvasRenderingContext2D, t: number) {
  c.lineCap = "round";
  for (let k = 0; k < 3; k++) {
    const phase = k * 2.1;
    const montee = (t * 0.22 + k / 3) % 1;
    for (let i = 0; i < 12; i++) {
      const u = i / 12;
      const v = u + montee * 0.3;
      const x = TASSE.x + (k - 1) * 6 + Math.sin(v * 7 + t * 1.3 + phase) * (2 + v * 10);
      const y = TASSE.y - v * 92;
      const a = Math.sin(Math.min(1, v) * Math.PI) * 0.34;
      c.strokeStyle = `rgba(255, 255, 255, ${a})`;
      c.lineWidth = 2.6 + v * 3.4;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.sin(v * 7 + t * 1.3 + phase + 0.5), y - 8);
      c.stroke();
    }
  }
}

export function PecheAnimee({ className = "", position = "50% 50%" }: { className?: string; position?: string }) {
  const toile = useRef<HTMLCanvasElement | null>(null);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    const el = toile.current;
    const c = el?.getContext("2d");
    if (!el || !c) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let image = 0;
    let visible = false;
    let lancee = false;
    let arret = false;
    const liste = reflets();
    const charger = (src: string) =>
      new Promise<HTMLImageElement>((ok, ko) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = ko;
        i.src = src;
      });

    const lancer = () =>
      Promise.all([charger("/illustrations/peche/fond.webp"), ...COUCHES.map((k) => charger(`/illustrations/peche/${k.nom}.webp`))])
      .then(([fond, ...images]) => {
        if (arret) return;
        const [aCorps, aTete, aEcharpe, bCorps, bTete] = images;
        const [lCorpsA, lTeteA, lEchA, lCorpsB, lTeteB] = COUCHES;
        const debut = performance.now();

        /** Une touche au bout de la ligne, de temps en temps : la pointe plonge, puis l'eau se calme. */
        const touche = (t: number) => {
          const cycle = t % 17;
          if (cycle < 12) return 0;
          const u = (cycle - 12) / 2.6;
          if (u > 1) return 0;
          return Math.abs(Math.sin(u * Math.PI * 3)) * (1 - u);
        };

        const peindre = (ms: number) => {
          image = requestAnimationFrame(peindre);
          if (!visible || document.hidden) return;
          const t = (ms - debut) / 1000;
          c.drawImage(fond, 0, 0, LARGE, HAUT);

          for (const r of liste) {
            const a = Math.sin(t * r.v + r.p);
            if (a <= 0) continue;
            c.strokeStyle = `rgba(236, 252, 250, ${a * a * a * 0.55})`;
            c.lineWidth = 2;
            c.beginPath();
            c.moveTo(r.x, r.y);
            c.lineTo(r.x + r.l, r.y + Math.sin(r.p) * 1.5);
            c.stroke();
          }

          const prise = touche(t);
          peindreRonds(c, CANNE_A.eau.x, CANNE_A.eau.y, t, 0.7 + prise * 0.8, prise > 0.05 ? 4 : 2);
          peindreRonds(c, CANNE_B.eau.x, CANNE_B.eau.y, t + 1.3, 0.45, 2);

          const balanceA = Math.sin(t * 0.8) * 2.2;
          const balanceB = Math.sin(t * 0.7 + 1.2) * 2;
          const boutA = { x: CANNE_A.bout.x + balanceA + prise * 6, y: CANNE_A.bout.y + Math.sin(t * 1.1) * 1.8 + prise * 26 };
          const boutB = { x: CANNE_B.bout.x + balanceB, y: CANNE_B.bout.y + Math.sin(t * 0.9 + 2) * 1.6 };
          peindreFil(c, boutA, CANNE_A.eau, 5 * Math.sin(t * 0.7) * (1 - prise));
          peindreFil(c, boutB, CANNE_B.eau, 4 * Math.sin(t * 0.6 + 1));
          peindreCanne(c, CANNE_A.pied, boutA, 6 + prise * 34);
          peindreCanne(c, CANNE_B.pied, boutB, 6);

          // ils respirent chacun à leur rythme, assis
          const souffleA = Math.sin(t * 1.25);
          const souffleB = Math.sin(t * 1.05 + 1.7);
          const couche = (i: HTMLImageElement, l: Couche, assise: { x: number; y: number }, souffle: number) => {
            c.save();
            c.translate(assise.x, assise.y);
            c.scale(1 + souffle * 0.0028, 1 + souffle * 0.0085);
            c.translate(-assise.x, -assise.y);
            c.drawImage(i, l.x, l.y, l.w, l.h);
            c.restore();
          };
          couche(aCorps, lCorpsA, ASSISE_A, souffleA);
          couche(bCorps, lCorpsB, ASSISE_B, souffleB);

          // de temps en temps, le second parle, et le premier hoche la tête : un mouvement discret
          const parole = t % 11;
          const parle = parole > 5 && parole < 7.2 ? Math.sin((parole - 5) * 9) * 1.4 : 0;
          const hoche = parole > 7.4 && parole < 8.6 ? Math.sin((parole - 7.4) * 5.2) * 1.5 : 0;
          const tete = (i: HTMLImageElement, l: Couche, cou: { x: number; y: number }, angle: number, leve: number) => {
            c.save();
            c.translate(cou.x, cou.y + leve);
            c.rotate((angle * Math.PI) / 180);
            c.translate(-cou.x, -cou.y);
            c.drawImage(i, l.x, l.y, l.w, l.h);
            c.restore();
          };
          tete(aTete, lTeteA, COU_A, Math.sin(t * 0.37) * 1.1 + hoche + prise * 2.5, -souffleA * 1.2);
          tete(bTete, lTeteB, COU_B, Math.sin(t * 0.31 + 1) * 1.3 + parle - prise * 3.5, -souffleB * 1.2);

          // l'écharpe : tranche par tranche, plus elle s'éloigne du cou, plus elle ondule
          const vent = 0.72 + 0.28 * Math.sin(t * 0.27);
          for (let sx = 0; sx < lEchA.w; sx += 2) {
            const x = lEchA.x + sx;
            const d = Math.max(0, Math.min(1, (ANCRE_ECHARPE - x) / (ANCRE_ECHARPE - lEchA.x)));
            const k = d ** 1.35;
            const dy = k * vent * (Math.sin(x * 0.05 + t * 3) * 8.5 + Math.sin(x * 0.11 + t * 4.7) * 3.2) - souffleA * 1.2;
            const dx = k * Math.sin(t * 1.3 + x * 0.02) * 3.5;
            c.drawImage(aEcharpe, sx, 0, 3, lEchA.h, x + dx, lEchA.y + dy, 3, lEchA.h);
          }

          peindreVapeur(c, t);
        };
        image = requestAnimationFrame(peindre);
        setPret(true);
      })
      .catch(() => undefined);

    const regard = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible && !lancee) {
          lancee = true;
          void lancer();
        }
      },
      { rootMargin: "300px" },
    );
    regard.observe(el);
    return () => {
      arret = true;
      cancelAnimationFrame(image);
      regard.disconnect();
    };
  }, []);

  return (
    <>
      <Illustration nom="reviser-peche" position={position} decorative className={className} />
      <canvas ref={toile} width={LARGE} height={HAUT} aria-hidden className={className} style={{ objectFit: "cover", objectPosition: position, opacity: pret ? 1 : 0 }} />
    </>
  );
}
