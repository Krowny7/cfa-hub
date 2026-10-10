"use client";

import { useEffect, useId, useRef, useState } from "react";
import s from "./IllustrationAtelier.module.css";

// Les effets de l'établi, posés sur l'image fixe une fois celle-ci chargée
// dans le navigateur (le serveur ne rend rien ici : pas d'erreur
// d'hydratation). Repère : les pixels de l'image (1024 × 572).
// v3 : le mouvement est PEINT. Des variantes du tableau où un seul détail
// change (flammes, vapeur, souffle du chat, nuages, Florence qui s'allume)
// ont été découpées en calques adoucis, réunis dans un atlas
// (public/atelier/etats-1024|512.webp, fabriqué hors du dépôt) ; ils passent
// de l'un à l'autre en fondus d'opacité (Web Animations). Restent dessinés :
// un halo léger qui respire avec les flammes, la poussière dans le cône de la
// lanterne (canevas 2D) et, toutes les 8 à 10 s, une ligne du codex rayée en
// rouge, la correction écrite au-dessus. Tout s'arrête hors écran, onglet
// caché, mouvement réduit, mode discret, ou en capture (data-rl-motion).

/** Tirage pseudo-aléatoire à graine fixe : mêmes valeurs à chaque chargement. */
const graine = (g: number) => () => (g = (g * 16807) % 2147483647) / 2147483647;
const alea = graine(7);

// la correction : des boucles de plume, mots séparés d'une espace, de hauteur
// irrégulière (±30 %, tirage à part pour ne pas déplacer la poussière)
let TRACE = "M0 0";
{
  const main = graine(11);
  let x = 0;
  for (const n of [5, 3, 6, 4, 3]) {
    for (let i = 0; i < n; i++) {
      const t = alea();
      const h = (t < 0.22 ? 4.3 : t < 0.3 ? -2.6 : 2.1 + alea() * 0.5) * (0.7 + main() * 0.6);
      const w = 1.8 + alea() * 0.8;
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

// Les états peints : [x, y, largeur, hauteur] dans l'atlas, puis [x, y] dans
// l'image. L'atlas existe en deux tailles : 1024 (repère de l'image) et 512.
const ATLAS = [640, 338] as const;
const ETATS: Record<string, readonly [number, number, number, number, number, number]> = {
  "ciel": [182, 0, 204, 128, 224, 22],
  "ville": [390, 0, 200, 128, 224, 138],
  "chat-1": [304, 158, 102, 84, 416, 308],
  "chat-2": [82, 158, 106, 90, 414, 308],
  "chat-3": [192, 158, 108, 90, 412, 308],
  "vapeur-3": [0, 158, 78, 122, 490, 230],
  "vapeur-1": [102, 0, 76, 146, 494, 208],
  "vapeur-2": [0, 0, 98, 154, 490, 200],
  "flamme-lanterne-1": [410, 158, 50, 76, 214, 328],
  "flamme-lanterne-2": [464, 158, 50, 76, 214, 328],
  "flamme-lanterne-3": [518, 158, 50, 76, 214, 328],
  "flamme-etageres-1": [80, 284, 50, 50, 572, 174],
  "flamme-etageres-2": [134, 284, 50, 50, 572, 174],
  "flamme-etageres-3": [188, 284, 50, 50, 572, 174],
  "flamme-lampe-1": [572, 158, 36, 54, 750, 212],
  "flamme-lampe-2": [0, 284, 36, 54, 750, 212],
  "flamme-lampe-3": [40, 284, 36, 54, 750, 212],
  "flamme-bougie-1": [242, 284, 26, 42, 930, 258],
  "flamme-bougie-2": [272, 284, 26, 42, 930, 258],
  "flamme-bougie-3": [302, 284, 26, 42, 930, 258],
};

// les quatre groupes de flammes : graine de l'enchaînement, et leur halo
const FLAMMES = [
  { g: "lanterne", graine: 3 },
  { g: "etageres", graine: 5 },
  { g: "lampe", graine: 13 },
  { g: "bougie", graine: 29 },
] as const;

/** Position d'un calque en % de la scène, d'après un rectangle de l'image. */
const boite = (x0: number, y0: number, x1: number, y1: number) => ({
  left: (x0 / 10.24).toFixed(3) + "%",
  top: ((y0 / 572) * 100).toFixed(3) + "%",
  width: ((x1 - x0) / 10.24).toFixed(3) + "%",
  height: (((y1 - y0) / 572) * 100).toFixed(3) + "%",
});

/** Un état peint : sa place dans la scène, son morceau de l'atlas. */
const calque = (n: string, url: string) => {
  const [ax, ay, w, h, x, y] = ETATS[n];
  const [AW, AH] = ATLAS;
  return {
    ...boite(x, y, x + w, y + h),
    backgroundImage: `url("${url}")`,
    backgroundSize: `${((AW / w) * 100).toFixed(3)}% ${((AH / h) * 100).toFixed(3)}%`,
    backgroundPosition: `${((ax / (AW - w)) * 100).toFixed(3)}% ${((ay / (AH - h)) * 100).toFixed(3)}%`,
  };
};

/**
 * Vacillement d'un groupe de flammes : la base et ses trois formes peintes
 * s'enchaînent dans un ordre pseudo-aléatoire (graine fixe), tenues brèves,
 * fondus de 0,25 à 0,6 s ; la boucle revient à la base. Rend les images-clés
 * d'opacité des trois formes et celles du halo (la forme 3, haute, éclaire plus).
 */
function vacillement(g: number) {
  const r = graine(g);
  r();
  const ev: { t: number; f: number; de: number; a: number }[] = [];
  let t = 0, cur = 0;
  for (let i = 0; i < 24 || cur !== 0; i++) {
    t += 0.08 + r() * r() * 1.1;
    let a = r() < 0.2 ? 0 : 1 + Math.floor(r() * 3);
    if (i >= 24) a = 0;
    if (a === cur) a = cur === 0 ? 1 + Math.floor(r() * 3) : 0;
    const f = 0.25 + r() * 0.35;
    ev.push({ t, f, de: cur, a });
    t += f;
    cur = a;
  }
  const T = t + 0.15 + r() * 0.3;
  const cles = (val: (etat: number) => number) => {
    const k: Keyframe[] = [{ offset: 0, opacity: val(0) }];
    for (const e of ev) {
      k.push({ offset: e.t / T, opacity: val(e.de), easing: "ease-in-out" });
      k.push({ offset: (e.t + e.f) / T, opacity: val(e.a) });
    }
    k.push({ offset: 1, opacity: val(0) });
    return k;
  };
  const LUM = [0.6, 0.48, 0.54, 1];
  return { T, formes: [1, 2, 3].map((j) => cles((e) => (e === j ? 1 : 0))), halo: cles((e) => LUM[e]) };
}

/** Une bouffée de vapeur : entre par le bas, tient en montant un peu, s'en va plus haut. */
const bouffee = (T: number, entre: number, plein: number, quitte: number, fin: number): Keyframe[] => [
  { offset: 0, opacity: 0, transform: "translateY(4%)" },
  { offset: entre / T, opacity: 0, transform: "translateY(4%)", easing: "ease-out" },
  { offset: plein / T, opacity: 1, transform: "translateY(0%)" },
  { offset: quitte / T, opacity: 1, transform: "translateY(-1%)", easing: "ease-in" },
  { offset: fin / T, opacity: 0, transform: "translateY(-5%)" },
  { offset: 1, opacity: 0, transform: "translateY(-5%)" },
];

/** Un fondu lent aller-retour (ciel, ville), avec des paliers aux deux bouts. */
const lent = (a: number, b: number, c: number, d: number): Keyframe[] => [
  { offset: 0, opacity: 0 },
  { offset: a, opacity: 0, easing: "ease-in-out" },
  { offset: b, opacity: 1 },
  { offset: c, opacity: 1, easing: "ease-in-out" },
  { offset: d, opacity: 0 },
  { offset: 1, opacity: 0 },
];

export function EffetsAtelier() {
  const id = "atelier" + useId().replace(/[^\w-]/g, "");
  const u = (n: string) => `url(#${id}${n})`;
  const racine = useRef<HTMLDivElement>(null);
  const canevas = useRef<HTMLCanvasElement>(null);
  const codex = useRef<SVGGElement>(null);
  const anims = useRef<Animation[]>([]);
  const marche = useRef(false);
  // l'image de base est chargée : les effets peuvent se poser dessus
  const [pret, setPret] = useState(false);
  // l'atlas des états peints, chargé seulement quand l'animation démarre
  const [atlas, setAtlas] = useState<string | null>(null);

  useEffect(() => {
    const im = racine.current?.parentElement?.querySelector("img");
    if (!im) return;
    const ok = () => setPret(true);
    if (im.complete && im.naturalWidth) ok();
    else im.addEventListener("load", ok, { once: true });
    return () => im.removeEventListener("load", ok);
  }, []);

  useEffect(() => {
    const el = racine.current, cv = canevas.current, cx = codex.current;
    const g = cv?.getContext("2d");
    if (!pret || !el || !cv || !cx || !g) return;
    const html = document.documentElement;
    const rm = matchMedia("(prefers-reduced-motion: reduce)");
    let vu = false, raf = 0, dernier = 0, horloge = 0, prochain = 1.5, demande = false;
    const actif = () =>
      vu && !document.hidden && !rm.matches && html.dataset.discreet !== "1" && html.dataset.rlMotion !== "off";

    const dessiner = (t: number) => {
      const w = el.clientWidth, h = el.clientHeight, dp = devicePixelRatio || 1;
      if (cv.width !== Math.round(w * dp) || cv.height !== Math.round(h * dp)) {
        cv.width = Math.round(w * dp);
        cv.height = Math.round(h * dp);
      }
      // vignette (téléphone) : un grain sur deux, sans halo, plus fins
      const vignette = w < 160;
      const k = (w / 1024) * dp, mini = ((vignette ? 0.45 : 0.6) * dp) / k;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, cv.width, cv.height);
      g.setTransform(k, 0, 0, k, 0, 0);
      for (let i = 0; i < GRAINS.length; i += vignette ? 2 : 1) {
        const m = GRAINS[i];
        const y = 428 - ((t * m.v + m.p) % 146), x = m.x + m.a * Math.sin(t * m.f + m.t);
        const dx = x - 236, dy = y - 368, e = Math.min(1, (428 - y) / 20, (y - 282) / 20);
        // pas de poussière dans le verre de la lanterne (237, 370) : elle flotte autour
        const v = ((x - 237) / 40) ** 2 + ((y - 370) / 44) ** 2;
        const al =
          Math.exp(-(dx * dx + dy * dy) / 10500) * e * Math.min(1, Math.max(0, (v - 0.85) / 0.6)) * (0.85 + 0.45 * Math.sin(t * 1.3 + m.t));
        if (al <= 0) continue;
        const r = Math.max(m.r, mini);
        // un léger halo (sauf en vignette), puis le grain
        if (!vignette) {
          g.globalAlpha = Math.min(al, 1) * 0.28;
          g.fillStyle = "#ffd58a";
          g.beginPath();
          g.arc(x, y, r * 2.6, 0, 7);
          g.fill();
        }
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
      marche.current = a;
      if (a) delete el.dataset.arret;
      else el.dataset.arret = "1";
      for (const x of anims.current) {
        if (a) x.play();
        else x.pause();
      }
      if (a && !raf) raf = requestAnimationFrame(tic);
      // l'atlas des états peints : à la première mise en route, à la taille utile
      if (a && !demande) {
        demande = true;
        const url = el.clientWidth * (devicePixelRatio || 1) > 560 ? "/atelier/etats-1024.webp" : "/atelier/etats-512.webp";
        const im = new Image();
        im.decoding = "async";
        im.onload = () => setAtlas(url);
        im.src = url;
      }
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
  }, [pret]);

  // les fondus des états peints (Web Animations), en pause tant que l'animation est arrêtée
  useEffect(() => {
    const el = racine.current;
    if (!atlas || !el) return;
    const liste: Animation[] = [];
    const joue = (n: string, k: Keyframe[], T: number, avance = 0) => {
      const e = el.querySelector(`[data-n="${n}"]`);
      if (!e) return;
      const a = e.animate(k, { duration: T * 1000, iterations: Infinity, delay: -avance * 1000 });
      a.pause();
      liste.push(a);
    };
    // flammes : chaque groupe a son enchaînement, sa durée, son départ
    FLAMMES.forEach(({ g, graine: gr }, i) => {
      const v = vacillement(gr);
      v.formes.forEach((k, j) => joue(`flamme-${g}-${j + 1}`, k, v.T, i * 1.7));
      joue(`halo-${g}`, v.halo, v.T, i * 1.7);
    });
    // vapeur : naissante, deux volutes à gauche, deux à droite, puis rien que la tasse
    const TV = 10.4;
    joue("vapeur-3", bouffee(TV, 0.2, 1.8, 2.8, 4.4), TV);
    joue("vapeur-1", bouffee(TV, 2.8, 4.4, 5.6, 7.2), TV);
    joue("vapeur-2", bouffee(TV, 5.6, 7.2, 8.2, 10), TV);
    // chat : trois degrés du même souffle, posés l'un sur l'autre (pas de double contour)
    const TC = 4.8;
    const souffle = (a: number, b: number, c: number, d: number, max = 1): Keyframe[] => [
      { offset: 0, opacity: 0 },
      { offset: a, opacity: 0, easing: "ease-in-out" },
      { offset: b, opacity: max },
      { offset: c, opacity: max, easing: "ease-in-out" },
      { offset: d, opacity: 0 },
      { offset: 1, opacity: 0 },
    ];
    joue("chat-1", souffle(0.04, 0.24, 0.84, 0.98), TC, 0.6);
    joue("chat-2", souffle(0.18, 0.38, 0.72, 0.87), TC, 0.6);
    joue("chat-3", souffle(0.32, 0.5, 0.6, 0.76, 0.92), TC, 0.6);
    // ciel et ville : lents, désaccordés
    joue("ciel", lent(0.08, 0.42, 0.56, 0.92), 72, 20);
    joue("ville", lent(0.1, 0.4, 0.58, 0.9), 96, 64);
    anims.current = liste;
    if (marche.current) liste.forEach((a) => a.play());
    return () => {
      anims.current = [];
      liste.forEach((a) => a.cancel());
    };
  }, [atlas]);

  return (
    <div ref={racine} className={s.effets} data-arret="1">
      {pret && (
        <>
          {atlas &&
            Object.keys(ETATS).map((n) => <div key={n} data-n={n} className={s.etat} style={calque(n, atlas)} />)}
          <svg className={s.lumiere} viewBox="0 0 1024 572" preserveAspectRatio="none">
            <defs>
              <radialGradient id={id + "h"}>
                <stop offset="0" stopColor="#ffb24f" stopOpacity=".3" />
                <stop offset=".3" stopColor="#ff9a3c" stopOpacity=".14" />
                <stop offset=".65" stopColor="#ff8a30" stopOpacity=".04" />
                <stop offset="1" stopColor="#ff8a30" stopOpacity="0" />
              </radialGradient>
              {/* halo de la lanterne : centre creux, il éclaire le bureau sans brûler le verre */}
              <radialGradient id={id + "l"}>
                <stop offset="0" stopColor="#ffb24f" stopOpacity=".03" />
                <stop offset=".3" stopColor="#ffa448" stopOpacity=".07" />
                <stop offset=".45" stopColor="#ff9a3c" stopOpacity=".16" />
                <stop offset=".7" stopColor="#ff8a30" stopOpacity=".05" />
                <stop offset="1" stopColor="#ff8a30" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* un halo très léger par groupe de flammes, qui suit leur vacillement */}
            <ellipse data-n="halo-lanterne" className={s.halo} cx="238" cy="395" rx="170" ry="105" fill={u("l")} />
            <circle data-n="halo-lampe" className={s.halo} cx="768" cy="236" r="95" fill={u("h")} />
            <circle data-n="halo-etageres" className={s.halo} cx="597" cy="198" r="48" fill={u("h")} />
            <circle data-n="halo-bougie" className={s.halo} cx="941" cy="278" r="55" fill={u("h")} />
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
              {/* deux passes de plume, la seconde décalée et plus légère : pleins et déliés */}
              <g className={s.ecrit} clipPath={u("e")}>
                <path transform="translate(0 -6)" d={TRACE} />
                <path className={s.ecrit2} transform="translate(.3 -6.25)" d={TRACE} />
              </g>
            </g>
          </svg>
        </>
      )}
    </div>
  );
}
