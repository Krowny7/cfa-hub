"use client";

// La partition des moments : les gestes (Web Animations) et les sons du kit
// calés sur une même horloge. Verdict, cérémonie de rang, copie corrigée,
// premier trait et rature s'en servent.
//
// Principe : l'état naturel (CSS) de chaque élément est son état FINAL. Les
// gestes partent de leur première image clé (fill « backwards ») et rendent
// la main à l'état naturel. D'où, gratuitement :
//  - mouvement réduit, ?mouvement=off, navigateur sans tête : rien n'est
//    animé, tout est posé ;
//  - « Passer » : on termine chaque geste d'un coup, les sons restants se
//    taisent, les compteurs prennent leur valeur finale ;
//  - version figée (visites suivantes) : on ne crée simplement aucun geste.
//
// Aperçus : figer(t) arrête tout à l'instant t (captures image par image).

import { useEffect, useLayoutEffect, useRef } from "react";
import { jouerSon, type SonNom, type SonOptions } from "./sound";

/** courbes du site (globals.css : --ease-out, --ease-ink) */
export const EASE_OUT = "cubic-bezier(0.2, 0.8, 0.2, 1)";
export const EASE_INK = "cubic-bezier(0.45, 0, 0.2, 1)";
/** chute (goutte, tampon qui descend) */
export const EASE_FALL = "cubic-bezier(0.55, 0, 0.9, 0.45)";
/** tampon : un peu trop grand, il s'écrase d'un cheveu et se pose */
export const STAMP_KF: Keyframe[] = [
  { opacity: 0, transform: "scale(1.32)", offset: 0 },
  { opacity: 1, transform: "scale(0.94)", offset: 0.45 },
  { transform: "scale(1.012)", offset: 0.72 },
  { opacity: 1, transform: "scale(1)", offset: 1 },
];

/** Mouvement réduit, ou captures (?mouvement=off, navigateur sans tête). */
export function mouvementReduit(): boolean {
  if (typeof window === "undefined") return false;
  if (document.documentElement.dataset.rlMotion === "off") return true;
  if (/[?&]mouvement=off/.test(location.search) || /Headless/.test(navigator.userAgent)) return true;
  return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

type Appel = { at: number; fn: (silencieux: boolean) => void; fait: boolean };
type Compteur = { el: HTMLElement; de: number; a: number; at: number; dur: number; fmt: (n: number) => string };

export class Partition {
  private anims: Animation[] = [];
  private appels: Appel[] = [];
  private compteurs: Compteur[] = [];
  private fin = 0;
  private t0 = 0;
  private raf = 0;
  private etat: "pret" | "joue" | "fini" = "pret";
  constructor(private onFin?: () => void) {}

  get duree() {
    return this.fin;
  }

  /** Un geste sur `el`, qui commence à `at` secondes et dure `dur`. */
  anime(el: Element | null | undefined, kf: Keyframe[], at: number, dur: number, ease = EASE_OUT, fill: FillMode = "backwards") {
    if (!el || typeof (el as HTMLElement).animate !== "function") return this;
    try {
      const a = (el as HTMLElement).animate(kf, { duration: dur * 1000, delay: at * 1000, easing: ease, fill });
      a.pause();
      this.anims.push(a);
      this.fin = Math.max(this.fin, at + dur);
    } catch {
      // propriété refusée par ce navigateur : l'élément reste dans son état final
    }
    return this;
  }

  /** Une action à l'instant `at` (silencieux = rattrapée après coup : pas de son). */
  appel(at: number, fn: (silencieux: boolean) => void) {
    this.appels.push({ at, fn, fait: false });
    this.fin = Math.max(this.fin, at);
    return this;
  }

  son(at: number, nom: SonNom, o?: SonOptions) {
    return this.appel(at, (silencieux) => {
      if (!silencieux) jouerSon(nom, o);
    });
  }

  /** Compteur : le texte de `el` passe de `de` à `a` (son texte naturel est la valeur finale). */
  compte(el: HTMLElement | null | undefined, de: number, a: number, at: number, dur: number, fmt: (n: number) => string = (n) => String(Math.round(n))) {
    if (!el) return this;
    this.compteurs.push({ el, de, a, at, dur, fmt });
    this.fin = Math.max(this.fin, at + dur);
    return this;
  }

  private majCompteurs(t: number) {
    for (const c of this.compteurs) {
      const u = c.dur <= 0 ? (t >= c.at ? 1 : 0) : Math.max(0, Math.min(1, (t - c.at) / c.dur));
      // départ vif, arrivée posée
      const e = 1 - Math.pow(1 - u, 3);
      const txt = c.fmt(c.de + (c.a - c.de) * e);
      if (c.el.textContent !== txt) c.el.textContent = txt;
    }
  }

  private tirer(t: number, silencieuxAvant: number) {
    for (const ap of this.appels) {
      if (ap.fait || ap.at > t) continue;
      ap.fait = true;
      try {
        ap.fn(t - ap.at > silencieuxAvant);
      } catch {
        // une action ratée n'arrête pas le moment
      }
    }
  }

  jouer() {
    if (this.etat !== "pret") return;
    this.etat = "joue";
    this.t0 = performance.now();
    for (const a of this.anims) a.play();
    this.majCompteurs(0);
    this.tirer(0, 0.25);
    const tick = () => {
      if (this.etat !== "joue") return;
      const t = (performance.now() - this.t0) / 1000;
      this.majCompteurs(t);
      // onglet en arrière-plan : ce qui est rattrapé avec plus de 0,25 s de retard se tait
      this.tirer(t, 0.25);
      if (t >= this.fin + 0.05) return this.clore();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private clore() {
    if (this.etat === "fini") return;
    this.etat = "fini";
    cancelAnimationFrame(this.raf);
    this.onFin?.();
  }

  /** Passer : tout se pose d'un coup, sans les sons restants. */
  terminer() {
    if (this.etat === "fini") return;
    for (const a of this.anims) {
      try {
        a.finish();
      } catch {
        a.cancel();
      }
    }
    this.majCompteurs(Infinity);
    this.tirer(Infinity, -1);
    this.clore();
  }

  /** Aperçus : tout s'arrête à l'instant `t` (secondes). */
  figer(t: number) {
    this.etat = "fini";
    cancelAnimationFrame(this.raf);
    for (const a of this.anims) {
      a.pause();
      a.currentTime = t * 1000;
    }
    this.majCompteurs(t);
    this.tirer(t, -1);
  }

  annuler() {
    this.etat = "fini";
    cancelAnimationFrame(this.raf);
    for (const a of this.anims) a.cancel();
  }
}

/** useLayoutEffect côté navigateur (rien ne clignote avant le premier geste), useEffect côté serveur */
export const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Joue une partition au montage (ou quand `cle` change).
 * - `actif` false : version figée, aucun geste ;
 * - mouvement réduit : version figée aussi, mais `build` est appelée pour
 *   que ses appels (état final) soient faits ;
 * - `figerA` (aperçus) : arrêt sur image à t secondes, même sans mouvement.
 * Renvoie `passer()` (termine) et une ref qui dit si la partition joue.
 */
export function usePartition(
  build: (p: Partition) => void,
  { actif = true, cle = "", figerA = null, onFin }: { actif?: boolean; cle?: string | number; figerA?: number | null; onFin?: () => void } = {},
) {
  const ref = useRef<Partition | null>(null);
  const finRef = useRef(onFin);
  finRef.current = onFin;
  const buildRef = useRef(build);
  buildRef.current = build;

  useIso(() => {
    if (!actif) return;
    const p = new Partition(() => finRef.current?.());
    buildRef.current(p);
    ref.current = p;
    if (figerA !== null && figerA !== undefined) p.figer(figerA);
    else if (mouvementReduit()) p.terminer();
    else p.jouer();
    return () => {
      p.annuler();
      ref.current = null;
    };
    // la partition se reconstruit seulement quand la clé, l'activation ou l'arrêt sur image changent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actif, cle, figerA]);

  return { passer: () => ref.current?.terminer() };
}
