"use client";

import { Children, isValidElement, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Défilement horizontal réutilisable : une rangée d'éléments qui s'aimantent
// (scroll-snap), qu'on fait glisser au doigt ou à la souris, avec des bords
// fondus (masque : marche sur le papier comme dans une carte), des flèches
// qui apparaissent au survol, la navigation au clavier (flèches, Début, Fin)
// et un fin indicateur de position. Le débordement reste local : la page ne
// défile jamais en largeur.
//
// `bleed` : sur téléphone, la rangée déborde jusqu'aux bords de l'écran
// (« page », dans <main>) ou de la carte qui la contient (« card »), et les
// éléments restent alignés sur la colonne au repos.

const PAD_TOP = 10; // place pour le soulèvement au survol
const PAD_BOTTOM = 32; // place pour l'ombre des cartes (le défilement coupe tout ce qui dépasse)

const BLEED = {
  none: "",
  page: "-mx-4 px-4 scroll-px-4 md:mx-0 md:px-0 md:scroll-px-0",
  card: "-mx-5 px-5 scroll-px-5 sm:-mx-8 sm:px-8 sm:scroll-px-8",
} as const;

const FOCUSABLE = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";

let fadeRegistered = false;
/** Rend les largeurs de fondu animables (transition douce quand un bord apparaît). */
function registerFadeProps() {
  if (fadeRegistered || typeof window === "undefined") return;
  fadeRegistered = true;
  const css = window.CSS as (typeof window.CSS & { registerProperty?: (d: { name: string; syntax: string; inherits: boolean; initialValue: string }) => void }) | undefined;
  if (!css?.registerProperty) return;
  for (const name of ["--hs-l", "--hs-r"]) {
    try {
      css.registerProperty({ name, syntax: "<length>", inherits: false, initialValue: "0px" });
    } catch {
      // déjà déclarée : rien à faire
    }
  }
}

function reducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function HScroll({
  label,
  children,
  itemClassName = "w-[200px]",
  gapClassName = "gap-3 sm:gap-4",
  className = "",
  bleed = "none",
  fade = 36,
  indicator = true,
  focusIndex,
}: {
  /** nom de la rangée pour les lecteurs d'écran (« Les 10 matières ») */
  label: string;
  children: React.ReactNode;
  /** largeur de chaque élément (classes Tailwind) */
  itemClassName?: string;
  gapClassName?: string;
  className?: string;
  /** débord sur téléphone : « page », « card », ou classes sur mesure (marges négatives + padding + scroll-padding) */
  bleed?: keyof typeof BLEED | (string & {});
  /** largeur des bords fondus, en px */
  fade?: number;
  indicator?: boolean;
  /** élément à garder visible (sélection) : la rangée défile jusqu'à lui, sans bouger la page */
  focusIndex?: number;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false, overflow: true });
  // Largeur des bords (fondu et marge de défilement) : la gouttière quand la
  // rangée déborde (téléphone), sinon `fade`, plus court sur un écran étroit.
  // Les positions d'aimantation laissent ainsi chaque élément hors du fondu,
  // et le précédent ou le suivant dépasse en filigrane.
  const [edge, setEdge] = useState({ l: fade, r: fade, padL: 0, padR: 0 });
  const [mounted, setMounted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; x: number; left: number; moved: boolean; lastX: number; lastT: number; v: number } | null>(null);
  const eatClick = useRef(false);
  const raf = useRef(0);
  const pendingReveal = useRef(true);
  const focusRef = useRef(focusIndex);
  const revealRef = useRef<(i: number, smooth: boolean) => void>(() => {});

  // Children.toArray écarte déjà null, undefined et les booléens
  const items = Children.toArray(children);

  /** Bords atteints, débordement et position de l'indicateur. */
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const overflow = max > 2;
    const start = el.scrollLeft <= 2;
    const end = el.scrollLeft >= max - 2;
    setEdges((e) => (e.start === start && e.end === end && e.overflow === overflow ? e : { start, end, overflow }));
    const cs = getComputedStyle(el);
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    const f = Math.round(Math.min(fade, el.clientWidth * 0.06));
    const l = padL > 1 ? padL : f;
    const r = padR > 1 ? padR : f;
    setEdge((e) => (e.l === l && e.r === r && e.padL === padL && e.padR === padR ? e : { l, r, padL, padR }));
    const t = thumb.current;
    if (t && el.scrollWidth > 0) {
      const ratio = Math.min(1, el.clientWidth / el.scrollWidth);
      const pos = max > 0 ? el.scrollLeft / max : 0;
      t.style.width = `${Math.max(18, ratio * 100)}%`;
      t.style.left = `${pos * (100 - Math.max(18, ratio * 100))}%`;
    }
  }, [fade]);

  const onScroll = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(measure);
  }, [measure]);

  useEffect(() => {
    registerFadeProps();
    setMounted(true);
    const el = ref.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(() => {
      measure();
      // rangée d'abord masquée (onglet, chargement en flux) : la sélection
      // est mise en vue dès qu'elle a une largeur
      const i = focusRef.current;
      if (pendingReveal.current && i !== undefined && i >= 0 && el.clientWidth > 0) {
        pendingReveal.current = false;
        revealRef.current(i, false);
      }
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf.current);
    };
  }, [measure, items.length]);

  /** Position d'aimantation de chaque élément (bord gauche, marge de défilement déduite). */
  const snapPoints = useCallback(() => {
    const el = ref.current;
    if (!el) return [0];
    const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
    const max = el.scrollWidth - el.clientWidth;
    const pts = Array.from(el.children).map((li) => Math.min(max, Math.max(0, (li as HTMLElement).offsetLeft - pad)));
    pts.push(max);
    return pts;
  }, []);

  /**
   * Garde l'élément `i` entièrement visible, hors des bords fondus, en
   * s'arrêtant sur une position d'aimantation (défilement horizontal seul :
   * la page ne bouge pas).
   */
  const reveal = useCallback(
    (i: number, smooth: boolean) => {
      const el = ref.current;
      const li = el?.children[i] as HTMLElement | undefined;
      if (!el || !li) return;
      const max = el.scrollWidth - el.clientWidth;
      const a = li.offsetLeft;
      const b = li.offsetLeft + li.offsetWidth;
      const pts = snapPoints();
      // zone nette : hors gouttière au départ, hors fondu ailleurs
      const fits = (p: number) => a >= p + (p > 2 ? edge.l : edge.padL) - 1 && b <= p + el.clientWidth - (p < max - 2 ? edge.r : edge.padR) + 1;
      if (fits(el.scrollLeft)) return;
      // la position la plus proche de l'actuelle qui montre l'élément en entier
      const ok = pts.filter(fits);
      const to = ok.length ? ok.reduce((x, y) => (Math.abs(y - el.scrollLeft) < Math.abs(x - el.scrollLeft) ? y : x)) : Math.max(0, a - edge.l);
      el.scrollTo({ left: to, behavior: smooth && !reducedMotion() ? "smooth" : "auto" });
    },
    [edge, snapPoints],
  );

  // La sélection reste en vue : immédiatement au premier affichage, en douceur ensuite.
  useLayoutEffect(() => {
    revealRef.current = reveal;
    focusRef.current = focusIndex;
    if (focusIndex === undefined || focusIndex < 0) return;
    const el = ref.current;
    if (!el || el.clientWidth === 0) {
      pendingReveal.current = true;
      return;
    }
    reveal(focusIndex, !pendingReveal.current);
    pendingReveal.current = false;
  }, [focusIndex, reveal]);

  function step(dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    // une « page » : la largeur visible, moins un élément pour garder un repère
    const target = el.scrollLeft + dir * Math.max(160, el.clientWidth * 0.82);
    const pts = snapPoints();
    const next = dir > 0 ? (pts.find((p) => p >= target - 4) ?? pts[pts.length - 1]) : ([...pts].reverse().find((p) => p <= target + 4) ?? 0);
    el.scrollTo({ left: next, behavior: reducedMotion() ? "auto" : "smooth" });
  }

  // --- Glisser à la souris (le doigt et le pavé tactile défilent nativement) ---
  function onPointerDown(e: React.PointerEvent<HTMLUListElement>) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = ref.current;
    if (!el || el.scrollWidth - el.clientWidth < 2) return;
    drag.current = { id: e.pointerId, x: e.clientX, left: el.scrollLeft, moved: false, lastX: e.clientX, lastT: performance.now(), v: 0 };
  }

  function onPointerMove(e: React.PointerEvent<HTMLUListElement>) {
    const d = drag.current;
    const el = ref.current;
    if (!d || !el || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x;
    if (!d.moved) {
      if (Math.abs(dx) < 6) return;
      d.moved = true;
      try {
        el.setPointerCapture(e.pointerId);
        window.getSelection()?.removeAllRanges();
      } catch {}
      setDragging(true);
    }
    el.scrollLeft = d.left - dx;
    const now = performance.now();
    const dt = now - d.lastT;
    if (dt > 0) d.v = 0.8 * ((e.clientX - d.lastX) / dt) + 0.2 * d.v;
    d.lastX = e.clientX;
    d.lastT = now;
  }

  function endDrag(e: React.PointerEvent<HTMLUListElement>) {
    const d = drag.current;
    const el = ref.current;
    drag.current = null;
    if (!d || !el || !d.moved) return;
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {}
    eatClick.current = true;
    window.setTimeout(() => (eatClick.current = false), 0);
    // élan : on prolonge le geste, puis on s'aimante sur l'élément le plus proche
    const v = performance.now() - d.lastT > 80 ? 0 : d.v;
    const target = el.scrollLeft - v * 260;
    const pts = snapPoints();
    const to = pts.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a), pts[0]);
    el.scrollTo({ left: to, behavior: reducedMotion() ? "auto" : "smooth" });
    // l'aimantation CSS revient une fois l'animation finie
    window.setTimeout(() => setDragging(false), reducedMotion() ? 0 : 480);
  }

  function onClickCapture(e: React.MouseEvent) {
    if (!eatClick.current) return;
    e.preventDefault();
    e.stopPropagation();
    eatClick.current = false;
  }

  // --- Clavier : flèches gauche / droite d'un élément à l'autre, Début, Fin ---
  function onKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
    const el = ref.current;
    if (!el) return;
    const lis = Array.from(el.children) as HTMLElement[];
    const cur = lis.findIndex((li) => li.contains(document.activeElement));
    if (cur < 0) return;
    const n = lis.length;
    const next = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : e.key === "ArrowRight" ? Math.min(n - 1, cur + 1) : Math.max(0, cur - 1);
    if (next === cur) return;
    e.preventDefault();
    const target = lis[next].querySelector<HTMLElement>(FOCUSABLE) ?? lis[next];
    target.focus({ preventScroll: true });
    reveal(next, true);
  }

  // Un élément qui reçoit le focus (Tab) est ramené en vue sans à-coup.
  function onFocusCapture(e: React.FocusEvent<HTMLUListElement>) {
    const el = ref.current;
    if (!el || drag.current) return;
    const i = (Array.from(el.children) as HTMLElement[]).findIndex((li) => li.contains(e.target as Node));
    if (i >= 0) reveal(i, true);
  }

  const mask = "linear-gradient(to right, transparent 0, #000 var(--hs-l), #000 calc(100% - var(--hs-r)), transparent 100%)";
  const showFadeL = edges.overflow && !edges.start;
  const showFadeR = edges.overflow && !edges.end;

  const arrow = "icon-btn absolute z-[2] hidden h-10 w-10 rounded-full shadow-[var(--shadow-2)] transition-[opacity,transform] duration-300 pointer-fine:grid";

  return (
    <div role="region" aria-roledescription="carrousel" aria-label={label} className={"group/hs relative min-w-0 max-w-full " + className}>
      <div className="relative">
        <ul
          ref={ref}
          onScroll={onScroll}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={onClickCapture}
          onDragStart={(e) => e.preventDefault()}
          onKeyDown={onKeyDown}
          onFocusCapture={onFocusCapture}
          className={
            "relative m-0 flex list-none overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden " +
            gapClassName +
            " " +
            (bleed in BLEED ? BLEED[bleed as keyof typeof BLEED] : bleed) +
            (dragging ? " cursor-grabbing select-none snap-none" : " snap-x snap-mandatory") +
            (edges.overflow && !dragging ? " pointer-fine:cursor-grab" : "")
          }
          style={
            {
              paddingTop: PAD_TOP,
              paddingBottom: PAD_BOTTOM,
              marginTop: -PAD_TOP,
              marginBottom: -PAD_BOTTOM,
              scrollPaddingLeft: edge.l,
              scrollPaddingRight: edge.r,
              "--hs-l": showFadeL ? `${edge.l}px` : "0px",
              "--hs-r": showFadeR ? `${edge.r}px` : "0px",
              transition: "--hs-l 0.3s ease, --hs-r 0.3s ease",
              maskImage: mask,
              WebkitMaskImage: mask,
            } as React.CSSProperties
          }
        >
          {items.map((child, i) => (
            <li key={isValidElement(child) && child.key !== null ? child.key : i} className={"relative shrink-0 snap-start " + itemClassName}>
              {child}
            </li>
          ))}
        </ul>

        <button
          type="button"
          tabIndex={-1}
          aria-label={`${label} : précédents`}
          onClick={() => step(-1)}
          className={arrow + " -left-3 " + (showFadeL ? "opacity-0 group-hover/hs:opacity-100" : "pointer-events-none opacity-0")}
          style={{ top: `calc(50% - ${(PAD_BOTTOM - PAD_TOP) / 2}px)`, translate: "0 -50%" }}
        >
          <ChevronLeft size={18} aria-hidden />
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label={`${label} : suivants`}
          onClick={() => step(1)}
          className={arrow + " -right-3 " + (showFadeR ? "opacity-0 group-hover/hs:opacity-100" : "pointer-events-none opacity-0")}
          style={{ top: `calc(50% - ${(PAD_BOTTOM - PAD_TOP) / 2}px)`, translate: "0 -50%" }}
        >
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>

      {indicator && (
        <div aria-hidden className={"mt-4 flex justify-center transition-opacity duration-300 " + (mounted && edges.overflow ? "opacity-100" : "opacity-0")}>
          <span className="relative block h-[3px] w-16 overflow-hidden rounded-full bg-line-2">
            <span ref={thumb} className="absolute inset-y-0 left-0 block w-1/3 rounded-full bg-white" />
          </span>
        </div>
      )}
    </div>
  );
}
