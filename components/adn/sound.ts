"use client";

// Kit sonore des moments : cinq sons, tous issus du monde de l'encre, en
// Web Audio, sans fichier.
//
//   goutte  la touche d'encre de l'objectif (douce) ; « grave » : la goutte
//           de la montée de rang, avec son impact sourd
//   trait   le pinceau sur le papier (mot du verdict, premier trait, nom du rang)
//   tampon  le « toc » du sceau (jour tenu, mentions, division)
//   stylo   le stylo rouge (copie corrigée) ; « tic » : une question du
//           dépouillement ; « rature » : le « scritch » d'une erreur rayée
//   note    la note tenue, à la fin de la cérémonie de rang (seul son musical)
//
// Réglage (Moi › Réglages, phase 2) : « aucun », « ceremonies » (par défaut :
// les cérémonies sonnent, les micro-moments se taisent) ou « tous ». Il vit en
// localStorage (SON_PREF_KEY) ; useSound() le lit et l'écrit, et tous les
// composants ouverts suivent le changement.
//
// Navigateurs : un son n'est joué que si la page a déjà reçu un geste de
// l'utilisateur (règle de lecture automatique). Sinon il est simplement
// omis : jamais de son en retard. Module client : un composant serveur ne
// l'importe pas (il rend un composant client qui, lui, joue le son).

import { useCallback, useEffect, useState } from "react";

export type SonNom = "goutte" | "trait" | "tampon" | "stylo" | "note";
/** micro : moment fréquent (coupé par défaut) · ceremonie : moment rare (actif par défaut) */
export type SonMoment = "micro" | "ceremonie";
export type SonPref = "aucun" | "ceremonies" | "tous";

export type SonOptions = {
  moment?: SonMoment;
  /** goutte : « grave » (montée de rang) ; stylo : « tic » juste / « tac » faux, « rature » */
  variante?: "grave" | "tic" | "tac" | "rature";
  /** durée en secondes (trait, stylo) */
  duree?: number;
  /** 0 à 1 */
  volume?: number;
  /** décalage en secondes */
  dans?: number;
};

export const SON_PREF_KEY = "rl_sons";
export const SON_PREF_DEFAUT: SonPref = "ceremonies";
export const SON_PREF_LABELS: Record<SonPref, string> = {
  aucun: "Aucun son",
  ceremonies: "Les grands moments",
  tous: "Tous les moments",
};
const EVT = "rl-sons";

export function lirePrefSon(): SonPref {
  try {
    const v = localStorage.getItem(SON_PREF_KEY);
    if (v === "aucun" || v === "ceremonies" || v === "tous") return v;
  } catch {
    // stockage bloqué : réglage par défaut
  }
  return SON_PREF_DEFAUT;
}

export function ecrirePrefSon(p: SonPref) {
  try {
    localStorage.setItem(SON_PREF_KEY, p);
  } catch {
    // stockage bloqué : le réglage vaut pour cette page seulement
  }
  memo = p;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVT, { detail: p }));
}

let memo: SonPref | null = null;
const pref = () => memo ?? (memo = lirePrefSon());

/** Le son de ce moment est-il permis par le réglage ? */
export function sonPermis(moment: SonMoment = "micro", p: SonPref = pref()): boolean {
  return p === "tous" || (p === "ceremonies" && moment === "ceremonie");
}

// ---------------------------------------------------------------------------
// Moteur Web Audio

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let noise: AudioBuffer | null = null;
let armed = false;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    return null;
  }
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 10;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.2;
  out = ctx.createGain();
  out.gain.value = 0.62;
  out.connect(comp).connect(ctx.destination);
  // bruit blanc partagé (papier, pinceau, stylo)
  const n = Math.floor(ctx.sampleRate * 2);
  noise = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = noise.getChannelData(0);
  let s = 7;
  for (let i = 0; i < n; i++) {
    s = (s * 16807) % 2147483647;
    data[i] = (s / 2147483647) * 2 - 1;
  }
  return ctx;
}

/** Au premier geste de l'utilisateur, l'audio s'éveille (si un son est permis). */
function arm() {
  if (armed || typeof window === "undefined") return;
  armed = true;
  const wake = () => {
    if (pref() === "aucun") return;
    const c = audio();
    if (c && c.state !== "running") c.resume().catch(() => {});
  };
  window.addEventListener("pointerdown", wake, { capture: true, passive: true });
  window.addEventListener("keydown", wake, { capture: true });
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function noiseSrc(c: AudioContext, t: number, dur: number) {
  const src = c.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  src.loopStart = Math.random() * 1.5;
  src.start(t, Math.random() * 1.5);
  src.stop(t + dur + 0.05);
  return src;
}

function osc(c: AudioContext, type: OscillatorType, t: number, dur: number) {
  const o = c.createOscillator();
  o.type = type;
  o.start(t);
  o.stop(t + dur + 0.05);
  return o;
}

// Chaque son reçoit son instant de départ et son volume ; il se branche sur `dest`.
const SYNTH: Record<SonNom, (c: AudioContext, dest: AudioNode, t: number, v: number, o: SonOptions) => void> = {
  goutte(c, dest, t, v, o) {
    if (o.variante === "grave") {
      // goutte grave : bulle basse, puis impact sourd et papier éclaboussé
      const b = osc(c, "sine", t, 0.5);
      b.frequency.setValueAtTime(190, t);
      b.frequency.exponentialRampToValueAtTime(420, t + 0.14);
      const bg = c.createGain();
      env(bg, t, 0.32 * v, 0.004, 0.34);
      b.connect(bg).connect(dest);
      const th = osc(c, "sine", t, 0.4);
      th.frequency.setValueAtTime(110, t);
      th.frequency.exponentialRampToValueAtTime(42, t + 0.22);
      const tg = c.createGain();
      env(tg, t, 0.55 * v, 0.003, 0.3);
      th.connect(tg).connect(dest);
      const n = noiseSrc(c, t, 0.2);
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 900;
      const ng = c.createGain();
      env(ng, t, 0.18 * v, 0.002, 0.14);
      n.connect(lp).connect(ng).connect(dest);
      return;
    }
    // goutte douce : une bulle qui monte vite et s'éteint
    const b = osc(c, "sine", t, 0.2);
    b.frequency.setValueAtTime(700, t);
    b.frequency.exponentialRampToValueAtTime(1500, t + 0.055);
    const g = c.createGain();
    env(g, t, 0.5 * v, 0.003, 0.12);
    b.connect(g).connect(dest);
  },

  trait(c, dest, t, v, o) {
    // pinceau sur papier : bruit filtré qui glisse, avec un léger frottement de poils
    const d = Math.max(0.2, o.duree ?? 0.5);
    const n = noiseSrc(c, t, d);
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(1300, t);
    bp.frequency.exponentialRampToValueAtTime(2600, t + d);
    const body = c.createBiquadFilter();
    body.type = "lowpass";
    body.frequency.value = 5200;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2 * v, t + 0.05);
    g.gain.setValueAtTime(0.2 * v, t + d * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    // grain des poils : modulation rapide et irrégulière, sur un étage à part
    const mod = c.createGain();
    mod.gain.value = 0.78;
    const lfo = osc(c, "triangle", t, d);
    lfo.frequency.value = 23;
    const lg = c.createGain();
    lg.gain.value = 0.22;
    lfo.connect(lg).connect(mod.gain);
    n.connect(bp).connect(body).connect(mod).connect(g).connect(dest);
  },

  tampon(c, dest, t, v) {
    // « toc » sourd : un coup bref et grave, le claquement du papier
    const k = osc(c, "sine", t, 0.3);
    k.frequency.setValueAtTime(150, t);
    k.frequency.exponentialRampToValueAtTime(52, t + 0.09);
    const kg = c.createGain();
    env(kg, t, 0.6 * v, 0.002, 0.2);
    k.connect(kg).connect(dest);
    const n = noiseSrc(c, t, 0.08);
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1100;
    bp.Q.value = 0.9;
    const ng = c.createGain();
    env(ng, t, 0.22 * v, 0.001, 0.05);
    n.connect(bp).connect(ng).connect(dest);
  },

  stylo(c, dest, t, v, o) {
    if (o.variante === "tic" || o.variante === "tac") {
      // une question corrigée : tic sec, plus aigu si juste
      const n = noiseSrc(c, t, 0.04);
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = o.variante === "tic" ? 5200 : 2300;
      bp.Q.value = 3;
      const g = c.createGain();
      env(g, t, 0.16 * v, 0.001, 0.025);
      n.connect(bp).connect(g).connect(dest);
      return;
    }
    // stylo sur papier : quelques griffures rapides (« scritch » pour la rature)
    const d = o.duree ?? (o.variante === "rature" ? 0.26 : 0.42);
    const n = noiseSrc(c, t, d);
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2200;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(o.variante === "rature" ? 3200 : 4200, t);
    bp.frequency.linearRampToValueAtTime(o.variante === "rature" ? 5600 : 3600, t + d);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    const strokes = o.variante === "rature" ? 2 : 4;
    const step = d / strokes;
    for (let i = 0; i < strokes; i++) {
      const s = t + i * step;
      const peak = (0.13 + 0.05 * ((i * 37) % 3)) * v;
      g.gain.exponentialRampToValueAtTime(peak, s + step * 0.18);
      g.gain.exponentialRampToValueAtTime(0.004, s + step * 0.92);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.02);
    n.connect(hp).connect(bp).connect(g).connect(dest);
  },

  note(c, dest, t, v) {
    // note tenue : une quinte douce, un peu de battement, qui s'éteint longuement
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2800;
    lp.connect(dest);
    const parts: [number, OscillatorType, number, number][] = [
      [261.63, "sine", 0.1, 2.8],
      [523.25, "sine", 0.17, 2.6],
      [524.1, "sine", 0.07, 2.4],
      [783.99, "sine", 0.1, 2.2],
      [1046.5, "triangle", 0.025, 1.1],
    ];
    for (const [hz, type, peak, decay] of parts) {
      const o2 = osc(c, type, t, decay + 0.1);
      o2.frequency.value = hz;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak * v, t + 0.07);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07 + decay);
      o2.connect(g).connect(lp);
    }
  },
};

/**
 * Joue un son du kit, si le réglage le permet (moment « micro » par défaut,
 * donc muet tant que l'utilisateur n'a pas choisi « tous »).
 */
export function jouerSon(nom: SonNom, o: SonOptions = {}) {
  if (typeof window === "undefined") return;
  arm();
  if (!sonPermis(o.moment ?? "micro")) return;
  const c = audio();
  if (!c || !out) return;
  const v = Math.max(0, Math.min(1, o.volume ?? 1));
  const go = () => {
    try {
      SYNTH[nom](c, out as GainNode, c.currentTime + 0.005 + (o.dans ?? 0), v, o);
    } catch {
      // nœud refusé (contexte fermé) : on se tait
    }
  };
  if (c.state === "running") return go();
  // pas encore éveillé : on tente, et on renonce si ça tarde (jamais de son en retard)
  const asked = performance.now();
  c.resume()
    .then(() => {
      if (c.state === "running" && performance.now() - asked < 160) go();
    })
    .catch(() => {});
}

/**
 * Pinceau tenu (premier trait) : un frottement continu dont le volume suit
 * la vitesse du geste. null si le son n'est pas permis ou pas disponible.
 */
export function pinceauTenu(moment: SonMoment = "ceremonie"): { vitesse: (v: number) => void; stop: () => void } | null {
  if (typeof window === "undefined") return null;
  arm();
  if (!sonPermis(moment)) return null;
  const c = audio();
  if (!c || !out || !noise || c.state !== "running") return null;
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  src.start(t);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 0.7;
  bp.frequency.value = 1500;
  const g = c.createGain();
  g.gain.value = 0.0001;
  src.connect(bp).connect(g).connect(out);
  let stopped = false;
  return {
    vitesse(v: number) {
      if (stopped) return;
      const k = Math.max(0, Math.min(1, v));
      g.gain.setTargetAtTime(0.0001 + 0.2 * k, c.currentTime, 0.04);
      bp.frequency.setTargetAtTime(1200 + 1600 * k, c.currentTime, 0.06);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      g.gain.setTargetAtTime(0.0001, c.currentTime, 0.05);
      src.stop(c.currentTime + 0.3);
    },
  };
}

/** Petite vibration (mobile) : impact de la goutte, fin du premier trait. */
export function vibrer(ms = 12) {
  try {
    if (pref() !== "aucun") navigator.vibrate?.(ms);
  } catch {
    // non disponible
  }
}

/**
 * Réglage du son, pour Moi › Réglages et les composants qui jouent un son :
 * `pref` suit le localStorage et les autres onglets, `setPref` l'enregistre.
 */
export function useSound() {
  const [p, setP] = useState<SonPref>(SON_PREF_DEFAUT);
  useEffect(() => {
    setP(pref());
    const onLocal = (e: Event) => setP((e as CustomEvent<SonPref>).detail);
    const onStore = (e: StorageEvent) => {
      if (e.key !== SON_PREF_KEY) return;
      memo = null;
      setP(pref());
    };
    window.addEventListener(EVT, onLocal);
    window.addEventListener("storage", onStore);
    return () => {
      window.removeEventListener(EVT, onLocal);
      window.removeEventListener("storage", onStore);
    };
  }, []);
  const setPref = useCallback((v: SonPref) => ecrirePrefSon(v), []);
  const jouer = useCallback((nom: SonNom, o?: SonOptions) => jouerSon(nom, o), []);
  return { pref: p, setPref, jouer, permis: (m: SonMoment) => sonPermis(m, p), labels: SON_PREF_LABELS };
}
