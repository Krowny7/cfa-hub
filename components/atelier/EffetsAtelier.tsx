"use client";

import { useEffect, useId, useRef, useState } from "react";
import s from "./IllustrationAtelier.module.css";

// Les effets de l'établi, posés sur l'image fixe une fois celle-ci chargée
// dans le navigateur (le serveur ne rend rien ici : pas d'erreur
// d'hydratation). Repère : les pixels de l'image (viewBox 0 0 1024 572).
// Flammes et halos, vapeur de la tasse, chat qui respire, poussière dans le
// cône de la lanterne (canevas 2D, calculée d'après l'horloge), reflet dans
// le ciel, fenêtres de la ville, et toutes les 12 à 16 s une ligne du codex
// rayée en rouge puis réécrite au propre. Tout s'arrête hors écran, onglet
// caché, mouvement réduit, mode discret, ou en capture (data-rl-motion).

/** Tirage pseudo-aléatoire à graine fixe : mêmes valeurs à chaque chargement. */
const alea = ((g: number) => () => (g = (g * 16807) % 2147483647) / 2147483647)(7);

// la ligne réécrite : des boucles de plume, mots séparés d'une espace
let TRACE = "M0 0";
{
  let x = 0;
  for (const n of [5, 3, 6, 4, 3]) {
    for (let i = 0; i < n; i++) {
      const t = alea();
      const h = t < 0.22 ? 4.3 : t < 0.3 ? -2.6 : 2.1 + alea() * 0.5;
      const w = 1.5 + alea() * 0.7;
      TRACE += `c${(w * 0.15).toFixed(2)} ${(-h).toFixed(2)} ${(w * 0.75).toFixed(2)} ${(-h).toFixed(2)} ${w.toFixed(2)} 0`;
      x += w;
    }
    TRACE += "m2.2 0";
    x += 2.2;
    if (x > 33) break;
  }
}

// grains de poussière dans le cône de la lanterne
const GRAINS = Array.from({ length: 18 }, () => ({
  x: 188 + alea() * 110,
  a: 4 + alea() * 7,
  f: 0.15 + alea() * 0.25,
  v: 3 + alea() * 4,
  p: alea() * 200,
  r: 0.8 + alea() * 0.8,
  t: alea() * 6,
}));

// fenêtres du Palazzo Vecchio et des façades voisines
const FENETRES = [[279, 246], [251, 246], [294, 239], [287, 203], [329, 253], [261, 246], [345, 239], [304, 246], [246, 257], [372, 236]];

/** Une flamme en goutte, mèche en (x, y). */
const flamme = (x: number, y: number, w: number, h: number) =>
  `M${x} ${y}C${x + w / 2} ${y} ${x + w / 2} ${y - h * 0.45} ${x} ${y - h}C${x - w / 2} ${y - h * 0.45} ${x - w / 2} ${y} ${x} ${y}Z`;

export function EffetsAtelier() {
  const id = "atelier" + useId().replace(/[^\w-]/g, "");
  const u = (n: string) => `url(#${id}${n})`;
  const racine = useRef<HTMLDivElement>(null);
  const canevas = useRef<HTMLCanvasElement>(null);
  const codex = useRef<SVGGElement>(null);
  // l'adresse de l'image réellement chargée (srcset), pour la copie du chat
  const [fond, setFond] = useState<string | null>(null);

  useEffect(() => {
    const img = racine.current?.parentElement?.querySelector("img");
    if (!img) return;
    const pret = () => setFond(img.currentSrc || img.src);
    if (img.complete && img.naturalWidth) pret();
    else img.addEventListener("load", pret, { once: true });
    return () => img.removeEventListener("load", pret);
  }, []);

  useEffect(() => {
    const el = racine.current, cv = canevas.current, cx = codex.current;
    const g = cv?.getContext("2d");
    if (!fond || !el || !cv || !cx || !g) return;
    const html = document.documentElement;
    const rm = matchMedia("(prefers-reduced-motion: reduce)");
    let vu = false, raf = 0, dernier = 0, horloge = 0, prochain = 3;
    const actif = () =>
      vu && !document.hidden && !rm.matches && html.dataset.discreet !== "1" && html.dataset.rlMotion !== "off";

    const dessiner = (t: number) => {
      const w = el.clientWidth, h = el.clientHeight, dp = devicePixelRatio || 1;
      if (cv.width !== Math.round(w * dp) || cv.height !== Math.round(h * dp)) {
        cv.width = Math.round(w * dp);
        cv.height = Math.round(h * dp);
      }
      const k = (w / 1024) * dp;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, cv.width, cv.height);
      g.setTransform(k, 0, 0, k, 0, 0);
      g.fillStyle = "#ffe6b0";
      for (const m of GRAINS) {
        const y = 425 - ((t * m.v + m.p) % 140), x = m.x + m.a * Math.sin(t * m.f + m.t);
        const dx = x - 236, dy = y - 365, e = Math.min(1, (425 - y) / 20, (y - 285) / 20);
        const al = Math.exp(-(dx * dx + dy * dy) / 9000) * e * (0.7 + 0.5 * Math.sin(t * 1.3 + m.t));
        if (al <= 0) continue;
        g.globalAlpha = Math.min(al, 1);
        g.beginPath();
        g.arc(x, y, Math.max(m.r, (0.55 * dp) / k), 0, 7);
        g.fill();
      }
    };
    const tic = (now: number) => {
      raf = 0;
      if (!actif()) {
        dernier = 0;
        return;
      }
      horloge += dernier ? Math.min((now - dernier) / 1e3, 0.1) : 0;
      dernier = now;
      if (horloge >= prochain) {
        prochain = horloge + 12 + alea() * 4;
        cx.classList.remove(s.go);
        cx.getBBox(); // relance l'animation du codex
        cx.classList.add(s.go);
      }
      dessiner(horloge);
      raf = requestAnimationFrame(tic);
    };
    const maj = () => {
      const a = actif();
      if (a) delete el.dataset.arret;
      else el.dataset.arret = "1";
      if (a && !raf) raf = requestAnimationFrame(tic);
    };
    const io = new IntersectionObserver((es) => {
      vu = es[es.length - 1].isIntersecting;
      maj();
    });
    // la scène, toujours affichée (le calque d'effets passe en display: none en mode discret)
    io.observe(el.parentElement ?? el);
    const mo = new MutationObserver(maj);
    mo.observe(html, { attributes: true, attributeFilter: ["data-discreet", "data-rl-motion"] });
    document.addEventListener("visibilitychange", maj);
    rm.addEventListener?.("change", maj);
    maj();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", maj);
      rm.removeEventListener?.("change", maj);
    };
  }, [fond]);

  return (
    <div ref={racine} className={s.effets} data-arret="1">
      {fond && (
        <>
          <div className={s.chat} style={{ backgroundImage: `url("${fond}")` }} />
          <svg className={s.lumiere} viewBox="0 0 1024 572" preserveAspectRatio="none">
            <defs>
              <radialGradient id={id + "h"}>
                <stop offset="0" stopColor="#ffb24f" stopOpacity=".5" />
                <stop offset=".3" stopColor="#ff9a3c" stopOpacity=".24" />
                <stop offset=".65" stopColor="#ff8a30" stopOpacity=".07" />
                <stop offset="1" stopColor="#ff8a30" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={id + "c"}>
                <stop offset="0" stopColor="#fff2c8" stopOpacity=".55" />
                <stop offset=".5" stopColor="#ffc56a" stopOpacity=".3" />
                <stop offset="1" stopColor="#ffb04a" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={id + "f"} cx=".5" cy=".75" r=".6">
                <stop offset="0" stopColor="#fffbe8" />
                <stop offset=".45" stopColor="#ffd27a" stopOpacity=".8" />
                <stop offset="1" stopColor="#ff9b3a" stopOpacity="0" />
              </radialGradient>
              <linearGradient id={id + "b"} x2="1">
                <stop offset="0" stopColor="#fff6dc" stopOpacity="0" />
                <stop offset=".5" stopColor="#fff3d6" stopOpacity=".26" />
                <stop offset="1" stopColor="#fff6dc" stopOpacity="0" />
              </linearGradient>
              <linearGradient id={id + "p"} x2="1">
                <stop offset="0" stopColor="#d7b98d" />
                <stop offset=".22" stopColor="#ebcda2" />
                <stop offset=".6" stopColor="#f2d4a9" />
                <stop offset="1" stopColor="#eccea3" />
              </linearGradient>
              <clipPath id={id + "a"}>
                <path d="M226 186V100Q236 26 320 22Q404 26 470 106V186Z" />
              </clipPath>
              <filter id={id + "v"} x="-1" y="-1" width="3" height="3">
                <feGaussianBlur stdDeviation="1.4" />
              </filter>
              <filter id={id + "s"} x="-.2" y="-1" width="1.4" height="3">
                <feGaussianBlur stdDeviation=".9" />
              </filter>
            </defs>
            <g clipPath={u("a")}>
              <rect className={s.reflet} x="40" y="0" width="190" height="190" fill={u("b")} />
            </g>
            <ellipse className={s.halo} cx="238" cy="382" rx="170" ry="125" fill={u("h")} />
            <circle className={`${s.halo} ${s.haloB}`} cx="768" cy="236" r="95" fill={u("h")} />
            <circle className={`${s.halo} ${s.haloC}`} cx="597" cy="198" r="48" fill={u("h")} />
            <circle className={`${s.halo} ${s.haloC}`} cx="941" cy="278" r="55" fill={u("h")} />
            <circle className={s.coeur} cx="235" cy="372" r="30" fill={u("c")} />
            <path className={s.flamme} fill={u("f")} d={flamme(234, 388, 11, 28)} />
            <path className={`${s.flamme} ${s.flB}`} fill={u("f")} d={flamme(589, 203, 5, 16)} />
            <path className={`${s.flamme} ${s.flC}`} fill={u("f")} d={flamme(604, 207, 5, 13)} />
            <path className={`${s.flamme} ${s.flD}`} fill={u("f")} d={flamme(768, 246, 10, 22)} />
            <path className={`${s.flamme} ${s.flB}`} fill={u("f")} d={flamme(941, 286, 6, 19)} />
            {FENETRES.map(([x, y], i) => (
              <rect key={i} className={s.fenetre} x={x - 0.8} y={y - 1.2} width="1.6" height="2.4" fill="#ffc768" style={{ animationDelay: `${i * 3.1 - 6}s` }} />
            ))}
            <g filter={u("v")} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <path className={s.vapeur} d="M527 341c-3-5 3-8 0-13s3-8 0-12" />
              <path className={`${s.vapeur} ${s.vapB}`} d="M531 340c3-5-3-8 0-13s-2-9 1-12" />
              <path className={`${s.vapeur} ${s.vapC}`} d="M523 342c-2-5 3-9 1-14" />
            </g>
          </svg>
          <canvas ref={canevas} />
          <svg viewBox="0 0 1024 572" preserveAspectRatio="none">
            <g ref={codex} className={s.codex} transform="matrix(.986 -.168 .73 .44 427 402)">
              <clipPath id={id + "r"}>
                <rect className={`${s.rideau} ${s.rideauRaye}`} x="-4" y="-8" width="44" height="13" />
              </clipPath>
              <clipPath id={id + "e"}>
                <rect className={`${s.rideau} ${s.rideauEcrit}`} x="-4" y="-8" width="44" height="13" />
              </clipPath>
              <rect className={s.gratte} x="-2.5" y="-5.4" width="40" height="7.6" rx="2.5" fill={u("p")} filter={u("s")} />
              <path className={s.raye} clipPath={u("r")} d="M-1-1C7-2.6 15-.2 24-1.6S33-2.4 36.5-1.2" />
              <path className={s.ecrit} clipPath={u("e")} d={TRACE} />
            </g>
          </svg>
        </>
      )}
    </div>
  );
}
