"use client";

import { useEffect, useId, useRef, useState } from "react";
import s from "./IllustrationAtelier.module.css";

// Les effets de l'établi, posés sur l'image fixe une fois celle-ci chargée
// dans le navigateur (le serveur ne rend rien ici : pas d'erreur
// d'hydratation). Repère : les pixels de l'image (viewBox 0 0 1024 572).
// Flammes et halos, vapeur de la tasse, chat qui respire (un recadrage de
// l'image réellement chargée, masqué sur son dos), poussière dans le cône de la lanterne (canevas
// 2D, calculée d'après l'horloge), nuages qui dérivent derrière les fers de la
// fenêtre (ciel nettoyé et masque : ciel.webp, nuages-a/b.webp), lueur du
// couchant qui monte, fenêtres de Florence qui s'allument, et toutes les 8 à
// 10 s une ligne du codex rayée en rouge, la correction écrite au-dessus.
// Tout s'arrête hors écran, onglet caché, mouvement réduit, mode discret, ou
// en capture (data-rl-motion).

/** Tirage pseudo-aléatoire à graine fixe : mêmes valeurs à chaque chargement. */
const alea = ((g: number) => () => (g = (g * 16807) % 2147483647) / 2147483647)(7);

// la correction : des boucles de plume, mots séparés d'une espace
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

/** Le trait de rature, en forme pleine : attaque épaisse, fin effilée (ep : épaisseur de l'attaque). */
const rature = (ep: number) => {
  const N = 28, haut: string[] = [], bas: string[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, x = -1 + 37.5 * t;
    const y = -1.3 + 0.4 * Math.sin(t * 6.6 + 0.4);
    const dy = (0.4 * 6.6 * Math.cos(t * 6.6 + 0.4)) / 37.5;
    const n = Math.hypot(1, dy), nx = -dy / n, ny = 1 / n;
    const e = (ep / 2) * Math.min(1, 0.55 + t * 9) * (1.12 - 0.92 * Math.pow(t, 1.25));
    haut.push(`${(x + nx * e).toFixed(2)} ${(y - ny * e).toFixed(2)}`);
    bas.unshift(`${(x - nx * e).toFixed(2)} ${(y + ny * e).toFixed(2)}`);
  }
  return `M${haut.join("L")}L${bas.join("L")}Z`;
};
// trois épaisseurs, choisies par la taille du cadre (≈ 1,4 à 1,8 px à l'écran)
const RATURES = [
  [s.grand, rature(3)],
  [s.moyen, rature(3.8)],
  [s.petit, rature(6.6)],
] as const;

// grains de poussière dans le cône de la lanterne
const GRAINS = Array.from({ length: 26 }, () => ({
  x: 186 + alea() * 116,
  a: 4 + alea() * 8,
  f: 0.15 + alea() * 0.25,
  v: 3.5 + alea() * 4.5,
  p: alea() * 200,
  r: 0.9 + alea() * 1,
  t: alea() * 6,
}));

// fenêtres de Florence : Palazzo Vecchio, sa tour, maisons voisines
const FENETRES = [[284, 246.5], [303.5, 246.5], [287.5, 226], [252, 245.5], [330, 234]];

/** Une flamme en goutte, mèche en (x, y). */
const flamme = (x: number, y: number, w: number, h: number) =>
  `M${x} ${y}C${x + w / 2} ${y} ${x + w / 2} ${y - h * 0.45} ${x} ${y - h}C${x - w / 2} ${y - h * 0.45} ${x - w / 2} ${y} ${x} ${y}Z`;

/** Position d'un calque en % de la scène, d'après un rectangle de l'image. */
const boite = (x0: number, y0: number, x1: number, y1: number) => ({
  left: (x0 / 10.24).toFixed(3) + "%",
  top: ((y0 / 572) * 100).toFixed(3) + "%",
  width: ((x1 - x0) / 10.24).toFixed(3) + "%",
  height: (((y1 - y0) / 572) * 100).toFixed(3) + "%",
});
const img = (f: string) => `url("/atelier/${f}")`;

export function EffetsAtelier() {
  const id = "atelier" + useId().replace(/[^\w-]/g, "");
  const u = (n: string) => `url(#${id}${n})`;
  const racine = useRef<HTMLDivElement>(null);
  const canevas = useRef<HTMLCanvasElement>(null);
  const codex = useRef<SVGGElement>(null);
  // l'adresse de l'image de base une fois chargée (srcset) : les effets
  // peuvent se poser dessus, et le chat en reprend un recadrage
  const [fond, setFond] = useState<string | null>(null);

  useEffect(() => {
    const im = racine.current?.parentElement?.querySelector("img");
    if (!im) return;
    const ok = () => setFond(im.currentSrc || im.src);
    if (im.complete && im.naturalWidth) ok();
    else im.addEventListener("load", ok, { once: true });
    return () => im.removeEventListener("load", ok);
  }, []);

  useEffect(() => {
    const el = racine.current, cv = canevas.current, cx = codex.current;
    const g = cv?.getContext("2d");
    if (!fond || !el || !cv || !cx || !g) return;
    const html = document.documentElement;
    const rm = matchMedia("(prefers-reduced-motion: reduce)");
    let vu = false, raf = 0, dernier = 0, horloge = 0, prochain = 1.5;
    const actif = () =>
      vu && !document.hidden && !rm.matches && html.dataset.discreet !== "1" && html.dataset.rlMotion !== "off";

    const dessiner = (t: number) => {
      const w = el.clientWidth, h = el.clientHeight, dp = devicePixelRatio || 1;
      if (cv.width !== Math.round(w * dp) || cv.height !== Math.round(h * dp)) {
        cv.width = Math.round(w * dp);
        cv.height = Math.round(h * dp);
      }
      const k = (w / 1024) * dp, mini = (0.6 * dp) / k;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, cv.width, cv.height);
      g.setTransform(k, 0, 0, k, 0, 0);
      for (const m of GRAINS) {
        const y = 428 - ((t * m.v + m.p) % 146), x = m.x + m.a * Math.sin(t * m.f + m.t);
        const dx = x - 236, dy = y - 368, e = Math.min(1, (428 - y) / 20, (y - 282) / 20);
        const al = Math.exp(-(dx * dx + dy * dy) / 10500) * e * (0.85 + 0.45 * Math.sin(t * 1.3 + m.t));
        if (al <= 0) continue;
        const r = Math.max(m.r, mini);
        // un léger halo, puis le grain
        g.globalAlpha = Math.min(al, 1) * 0.28;
        g.fillStyle = "#ffd58a";
        g.beginPath();
        g.arc(x, y, r * 2.6, 0, 7);
        g.fill();
        g.globalAlpha = Math.min(al * 1.1, 1);
        g.fillStyle = "#fff0c8";
        g.beginPath();
        g.arc(x, y, r, 0, 7);
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
        prochain = horloge + 8 + alea() * 2;
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
          {/* le ciel de l'arc : nettoyé de ses nuages, troué aux fers et aux tours */}
          <div
            className={s.ciel}
            style={{ ...boite(224, 34, 420, 150), maskImage: img("ciel.webp"), WebkitMaskImage: img("ciel.webp") }}
          >
            <div style={{ backgroundImage: img("ciel.webp") }} />
            <div className={s.nuageA} style={{ backgroundImage: img("nuages-a.webp") }} />
            <div className={s.nuageB} style={{ backgroundImage: img("nuages-b.webp") }} />
            <div className={s.couchant} />
          </div>
          {/* même source et même échantillonnage que l'image de base : net au repos */}
          <div className={s.chat} style={{ ...boite(424, 316, 528, 384), backgroundImage: `url("${fond}")` }} />
          <svg className={s.lumiere} viewBox="0 0 1024 572" preserveAspectRatio="none">
            <defs>
              <radialGradient id={id + "h"}>
                <stop offset="0" stopColor="#ffb24f" stopOpacity=".5" />
                <stop offset=".3" stopColor="#ff9a3c" stopOpacity=".24" />
                <stop offset=".65" stopColor="#ff8a30" stopOpacity=".07" />
                <stop offset="1" stopColor="#ff8a30" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={id + "c"}>
                <stop offset="0" stopColor="#ffe2a8" stopOpacity=".3" />
                <stop offset=".5" stopColor="#ffc56a" stopOpacity=".2" />
                <stop offset="1" stopColor="#ffb04a" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={id + "f"} cx=".5" cy=".75" r=".6">
                <stop offset="0" stopColor="#ffe2a8" />
                <stop offset=".45" stopColor="#ffc46a" stopOpacity=".8" />
                <stop offset="1" stopColor="#ff9b3a" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={id + "w"}>
                <stop offset="0" stopColor="#ffc666" stopOpacity=".9" />
                <stop offset=".35" stopColor="#ffa24a" stopOpacity=".32" />
                <stop offset="1" stopColor="#ff9f45" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={id + "k"}>
                <stop offset="0" stopColor="#ff9c6e" stopOpacity=".55" />
                <stop offset=".55" stopColor="#ff8f6a" stopOpacity=".22" />
                <stop offset="1" stopColor="#ff8f6a" stopOpacity="0" />
              </radialGradient>
              {/* l'intérieur de l'arc, entre ses montants */}
              <clipPath id={id + "a"}>
                <rect x="229" y="110" width="186" height="90" />
              </clipPath>
              <filter id={id + "v"} x="-1" y="-1" width="3" height="3">
                <feGaussianBlur stdDeviation="1.3" />
              </filter>
            </defs>
            {/* le couchant qui rosit l'horizon, au rythme de la lueur du ciel */}
            <ellipse className={s.lueur} clipPath={u("a")} cx="322" cy="170" rx="120" ry="38" fill={u("k")} />
            <ellipse className={`${s.halo} ${s.haloA}`} cx="238" cy="395" rx="170" ry="105" fill={u("h")} />
            <circle className={`${s.halo} ${s.haloB}`} cx="768" cy="236" r="95" fill={u("h")} />
            <circle className={`${s.halo} ${s.haloC}`} cx="597" cy="198" r="48" fill={u("h")} />
            <circle className={`${s.halo} ${s.haloC}`} cx="941" cy="278" r="55" fill={u("h")} />
            <circle className={s.coeur} cx="235" cy="374" r="30" fill={u("c")} />
            <path className={s.flamme} fill={u("f")} d={flamme(234, 388, 9, 22)} />
            <path className={`${s.flamme} ${s.flB}`} fill={u("f")} d={flamme(589, 203, 5, 16)} />
            <path className={`${s.flamme} ${s.flC}`} fill={u("f")} d={flamme(604, 207, 5, 13)} />
            <path className={`${s.flamme} ${s.flD}`} fill={u("f")} d={flamme(768, 246, 10, 22)} />
            <path className={`${s.flamme} ${s.flB}`} fill={u("f")} d={flamme(941, 286, 6, 19)} />
            {FENETRES.map(([x, y], i) => (
              <g key={i} className={s.fenetre} style={{ animationDelay: `${-i * 7.3 - 2}s` }}>
                <circle cx={x} cy={y} r="10" fill={u("w")} />
                <rect x={x - 1.6} y={y - 2.1} width="3.2" height="4.2" fill="#ffd47e" />
              </g>
            ))}
            <g filter={u("v")} fill="none" stroke="#fff6ea" strokeWidth="2.6" strokeLinecap="round">
              <path className={s.vapeur} d="M527 341c-3-5 3-8 0-13s3-8 0-12" />
              <path className={`${s.vapeur} ${s.vapB}`} d="M531 340c3-5-3-8 0-13s-2-9 1-12" />
              <path className={`${s.vapeur} ${s.vapC}`} d="M523 342c-2-5 3-9 1-14" />
              <path className={`${s.vapeur} ${s.vapD}`} d="M529 341c2-4-2-8 1-12s-1-7 1-10" />
            </g>
          </svg>
          <canvas ref={canevas} />
          <svg viewBox="0 0 1024 572" preserveAspectRatio="none">
            <g ref={codex} className={s.codex} transform="matrix(.986 -.168 .73 .44 427 402)">
              <clipPath id={id + "r"}>
                <rect className={`${s.rideau} ${s.rideauRaye}`} x="-4" y="-7" width="44" height="12" />
              </clipPath>
              <clipPath id={id + "e"}>
                {/* repère de la correction (déjà décalée de 6 vers le haut) */}
                <rect className={`${s.rideau} ${s.rideauEcrit}`} x="-4" y="-7" width="44" height="10.5" />
              </clipPath>
              <g className={s.raye} clipPath={u("r")}>
                {RATURES.map(([c, d]) => (
                  <path key={c} className={c} d={d} />
                ))}
              </g>
              <path className={s.ecrit} clipPath={u("e")} transform="translate(0 -6)" d={TRACE} />
            </g>
          </svg>
        </>
      )}
    </div>
  );
}
