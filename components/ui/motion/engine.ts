// Moteur de mouvement du site, démarré une fois par page par app/template.tsx.
// Il ne s'appuie que sur les classes existantes : aucune page n'a besoin
// d'être modifiée pour en profiter.
//
// Le mouvement suit les gestes d'encre du site (voir globals.css) : les
// entrées « sèchent » (l'opacité arrive vite puis se stabilise), les traits
// se tracent, les réussites se tamponnent. Les gestes génériques (onglets)
// restent courts.
//
//  1. Apparitions au défilement. Les blocs d'une page (.rl-page > *,
//     .rl-section > *, .rl-wide > *, .rl-reveal ; les grilles et les
//     carrousels sont pris carte par carte) qui naissent hors de l'écran
//     entrent quand on les atteint, en cascade quand plusieurs arrivent
//     ensemble.
//  2. Entrées différées. Les animations CSS d'entrée et d'encre (.rl-in,
//     .rl-grow, .ink-bar, .rl-count, .rl-halo, .rl-ink-draw…) nées hors de
//     l'écran attendent d'y être, au lieu de jouer sans témoin.
//  3. Onglets. Quand un .seg (ou un role="tablist") change d'onglet, le
//     contenu qui apparaît glisse dans le sens du changement ; un bouton
//     aria-expanded déplie son contenu en fondu, comme un <details>.
//
// Garde-fous : on n'anime que transform (ou translate) et opacity ; rien
// n'est caché sans ce moteur (sans JS, tout est visible) ; s'il s'arrête,
// ou avant une impression, tout redevient visible ; avec le mouvement
// réduit, il ne fait rien. Une zone .rl-still (ou [data-rl-still]) est
// laissée tranquille.

const STILL = ".rl-still, [data-rl-still]";
/** blocs qui apparaissent au défilement */
const REVEAL = ".rl-page > *, .rl-section > *, .rl-wide > *, .rl-reveal";
/** entrées CSS qui attendent d'être à l'écran */
const PLAY = [
  ".rl-in",
  ".rl-fade",
  ".rl-stagger > *",
  ".rl-pop",
  ".rl-stamp",
  ".rl-stamp-blot",
  ".rl-grow",
  ".rl-barup",
  ".rl-halo",
  ".rl-drawline",
  ".rl-underline",
  ".rl-ink-draw",
  ".rl-count",
  ".rl-radar",
  ".rl-enso",
  ".ink-bar > span",
].join(", ");
/** un bloc qui orchestre déjà son entrée garde la sienne */
const OWN_ENTRY = ".rl-in, .rl-fade, .rl-stagger, .rl-rv";
const TAB_ITEM = ".seg-item, [role='tab']";
const BUSY = "[aria-busy='true']";
const TAB_LIST = ".seg, [role='tablist']";
const SCOPE = "section, article, li, .card, .card-hero, .card-quiet, .card-ink, .rl-section";

type Tokens = { d2: number; d3: number; ease: string; stagger: number };
type Pending = { reveal?: Animation; css: Animation[] };

function readTokens(): Tokens {
  const cs = getComputedStyle(document.documentElement);
  const ms = (name: string, fallback: number) => {
    const v = cs.getPropertyValue(name).trim();
    const n = parseFloat(v);
    if (!v || Number.isNaN(n)) return fallback;
    return v.endsWith("ms") ? n : n * 1000;
  };
  return {
    d2: ms("--dur-2", 320),
    d3: ms("--dur-3", 600),
    ease: cs.getPropertyValue("--ease-out").trim() || "cubic-bezier(0.2, 0.8, 0.2, 1)",
    stagger: ms("--stagger", 55),
  };
}

/** Propriété de déplacement libre sur cet élément : `translate` se compose
 * avec un transform posé par la page, et inversement ; null si les deux sont
 * déjà pris (on ne fait alors qu'un fondu). */
function moveProp(el: Element): "transform" | "translate" | null {
  const cs = getComputedStyle(el);
  const hasT = cs.transform && cs.transform !== "none";
  const hasTr = cs.translate && cs.translate !== "none";
  if (hasT && hasTr) return null;
  return hasT ? "translate" : "transform";
}

const FIXED = "[class~='fixed'], [class*=':fixed'], [style*='position:fixed'], [style*='position: fixed']";

/** Entrée « qui sèche » : départ décalé de (dx, dy), 82 % d'opacité au
 * tiers du temps, puis l'état de repos de l'élément (images clés implicites). */
function dryIn(el: Element, dx: number, dy: number, ease: string): Keyframe[] {
  // un élément fixe à l'intérieur serait déplacé par la transformation : fondu seul
  const prop = (dx === 0 && dy === 0) || el.querySelector(FIXED) ? null : moveProp(el);
  // courbe par segment, comme les @keyframes CSS (l'effet lui-même est linéaire)
  const k: Keyframe = { opacity: 0, offset: 0, easing: ease };
  if (prop === "translate") k.translate = `${dx}px ${dy}px`;
  else if (prop === "transform") k.transform = `translate(${dx}px, ${dy}px)`;
  return [k, { opacity: 0.82, offset: 0.35, easing: ease }];
}

/** Élément à mesurer : un tracé SVG (souvent dans un masque, sans boîte
 * propre) se mesure par son <svg>. */
function anchorOf(el: Element): Element {
  if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) return el.ownerSVGElement ?? el;
  return el;
}

function cssAnimations(el: Element): Animation[] {
  if (typeof el.getAnimations !== "function") return [];
  // seulement les animations CSS de l'élément (pas les transitions, pas les nôtres)
  return el.getAnimations().filter((a) => "animationName" in a);
}

export function startMotion(root: HTMLElement): () => void {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return () => {};
  if (typeof root.animate !== "function") return () => {};
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return () => {};

  const T = readTokens();
  const pending = new Map<Element, Pending>();
  const heldAnims = new WeakSet<Animation>();
  const off: (() => void)[] = [];

  // ---------- 1 & 2 : attendre l'écran ----------

  const io = new IntersectionObserver(
    (entries) => {
      const hits = entries.filter((e) => e.isIntersecting && pending.has(e.target));
      // ceux qui arrivent ensemble entrent en cascade, dans l'ordre de lecture
      hits.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
      let i = 0;
      for (const e of hits) {
        const p = pending.get(e.target)!;
        pending.delete(e.target);
        io.unobserve(e.target);
        if (p.reveal) {
          try {
            p.reveal.effect?.updateTiming({ delay: Math.min(i, 6) * T.stagger });
          } catch {
            // délai non modifiable : l'entrée part tout de suite
          }
          p.reveal.play();
          i++;
        }
        for (const a of p.css) a.play();
      }
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0 },
  );

  function release(el: Element, finish: boolean) {
    const p = pending.get(el);
    if (!p) return;
    pending.delete(el);
    io.unobserve(el);
    try {
      if (finish) p.reveal?.cancel();
      else p.reveal?.play();
      for (const a of p.css) (finish ? a.finish() : a.play());
    } catch {
      p.reveal?.cancel();
    }
  }

  function releaseAll(finish: boolean) {
    for (const el of Array.from(pending.keys())) release(el, finish);
  }

  /** hors de l'écran (sous la ligne de flottaison, ou de côté dans un carrousel) ;
   * un élément invisible (display: none) n'est jamais retenu */
  function whereOff(el: Element, vw: number, vh: number): [number, number] | null {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    if (r.left >= vw - 1) return [16, 0];
    if (r.right <= 1) return [-16, 0];
    if (r.top > vh * 0.94) return [0, 10];
    return null;
  }

  function hasPendingAncestor(el: Element) {
    for (let n = el.parentElement; n && n !== root.parentElement; n = n.parentElement) if (pending.has(n)) return true;
    return false;
  }

  /** cibles d'apparition sous `node` (lui compris), grilles et carrousels
   * remplacés par leurs cartes */
  function revealTargets(node: Element): Element[] {
    const raw: Element[] = [];
    if (node.matches(REVEAL)) raw.push(node);
    node.querySelectorAll(REVEAL).forEach((n) => raw.push(n));
    const out: Element[] = [];
    for (const el of raw) {
      if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "contents" || cs.display === "none" || cs.position === "fixed" || cs.position === "sticky") continue;
      const kids = el.children.length;
      const grid = cs.display.endsWith("grid");
      const rail = cs.display.endsWith("flex") && (cs.overflowX === "auto" || cs.overflowX === "scroll");
      if ((grid || rail) && kids >= 2 && kids <= 24) out.push(...Array.from(el.children));
      else out.push(el);
    }
    return out;
  }

  function scan(node: Element) {
    if (!node.isConnected || node.closest(STILL)) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    for (const el of revealTargets(node)) {
      if (pending.has(el) || el.closest(STILL) || hasPendingAncestor(el)) continue;
      if (el.matches(OWN_ENTRY) || el.querySelector(OWN_ENTRY)) continue;
      if (/^(SCRIPT|STYLE|TEMPLATE|LINK|META)$/.test(el.tagName)) continue;
      const where = whereOff(el, vw, vh);
      if (!where) continue;
      // dans un conteneur qui défile (carrousel), un déplacement ferait
      // apparaître une barre de défilement : fondu seul
      const pcs = el.parentElement ? getComputedStyle(el.parentElement) : null;
      const still = !!pcs && [pcs.overflowX, pcs.overflowY].some((o) => o === "auto" || o === "scroll");
      try {
        const a = el.animate(dryIn(el, still ? 0 : where[0], still ? 0 : where[1], T.ease), { duration: T.d3, fill: "backwards" });
        a.pause();
        pending.set(el, { reveal: a, css: [] });
        io.observe(el);
      } catch {
        // pas d'animation possible : le bloc reste simplement visible
      }
    }

    const plays: Element[] = node.matches(PLAY) ? [node] : [];
    node.querySelectorAll(PLAY).forEach((n) => plays.push(n));
    for (const el of plays) {
      if (el.closest(STILL)) continue;
      const anchor = anchorOf(el);
      const held = pending.get(anchor);
      if (!held && !hasPendingAncestor(anchor) && !whereOff(anchor, vw, vh)) continue;
      const css = cssAnimations(el).filter((a) => !heldAnims.has(a));
      if (!css.length) continue;
      for (const a of css) {
        heldAnims.add(a);
        a.pause();
        a.currentTime = 0;
      }
      if (held) held.css.push(...css);
      else {
        pending.set(anchor, { css });
        io.observe(anchor);
      }
    }
  }

  // ---------- 3 : onglets et contenus dépliés ----------

  function enter(el: HTMLElement, dx: number, dy: number) {
    try {
      el.animate(dryIn(el, dx, dy, T.ease), { duration: T.d2 });
    } catch {
      // rien
    }
  }

  /** Observe `scope` un court instant après un geste ; anime ce qui apparaît
   * (nœuds ajoutés, panneaux qui perdent `hidden`), hors du contrôle lui-même. */
  function watchAppear(scope: Element, control: Element, ms: number, onFound: (els: HTMLElement[]) => void) {
    let done = false;
    const mo = new MutationObserver((recs) => {
      const found = new Set<HTMLElement>();
      for (const r of recs) {
        if (r.type === "childList") {
          r.addedNodes.forEach((n) => {
            if (n instanceof HTMLElement && !control.contains(n) && !n.contains(control)) found.add(n);
          });
        } else if (r.target instanceof HTMLElement && !control.contains(r.target)) {
          const t = r.target;
          const shown =
            r.attributeName === "hidden"
              ? !t.hidden
              : (r.oldValue || "").split(" ").includes("hidden") && !t.classList.contains("hidden");
          if (shown) found.add(t);
        }
      }
      // la page entière a été remplacée (lien vers une autre adresse) : le
      // gabarit fait déjà entrer la nouvelle page
      if (!control.isConnected) return stop();
      const tops = Array.from(found).filter((n) => n.isConnected && !n.closest(STILL) && !Array.from(found).some((o) => o !== n && o.contains(n)));
      if (!tops.length) return;
      stop();
      onFound(tops.slice(0, 40));
    });
    const stop = () => {
      if (done) return;
      done = true;
      mo.disconnect();
      clearTimeout(timer);
    };
    mo.observe(scope, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden", "class"], attributeOldValue: true });
    const timer = window.setTimeout(stop, ms);
    off.push(stop);
  }

  const isOn = (x: Element) => x.getAttribute("aria-selected") === "true" || x.getAttribute("aria-current") === "page";

  function onTab(item: Element, key: string | null) {
    const list = item.closest(TAB_LIST) ?? item.parentElement;
    if (!list || !root.contains(list)) return;
    if (item instanceof HTMLAnchorElement) {
      let u: URL;
      try {
        u = new URL(item.href, location.href);
      } catch {
        return;
      }
      // changement de page : c'est le gabarit qui fait la transition
      if (u.origin !== location.origin || u.pathname !== location.pathname || u.search === location.search) return;
    }
    if (!key && isOn(item)) return;
    const items = () => Array.from(list.querySelectorAll(TAB_ITEM));
    const before = items().findIndex(isOn);
    let scope: Element | null = null;
    for (let n = list.parentElement; n && root.contains(n); n = n.parentElement) {
      if (n.querySelector("[role='tabpanel']")) {
        scope = n;
        break;
      }
    }
    scope = scope ?? list.parentElement?.closest(SCOPE) ?? root;
    watchAppear(scope, list, item instanceof HTMLAnchorElement ? 4000 : 700, (els) => {
      const after = items().findIndex(isOn);
      const dir = before >= 0 && after >= 0 ? Math.sign(after - before) : 0;
      for (const el of els) enter(el, dir * 10, dir ? 0 : 4);
    });
  }

  function onDisclosure(btn: Element) {
    if (btn.getAttribute("aria-expanded") !== "false" || btn.closest(TAB_LIST)) return;
    const id = btn.getAttribute("aria-controls");
    const target = id ? document.getElementById(id) : null;
    const scope = (target && root.contains(target) ? target.parentElement : null) ?? btn.parentElement?.closest(SCOPE) ?? btn.parentElement ?? root;
    watchAppear(scope, btn, 700, (els) => {
      for (const el of els) enter(el, 0, -4);
    });
  }

  const onClick = (e: MouseEvent) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t || !root.contains(t) || t.closest(STILL)) return;
    const item = t.closest(TAB_ITEM);
    if (item) return onTab(item, null);
    const disc = t.closest("[aria-expanded]");
    if (disc) onDisclosure(disc);
  };
  const onKey = (e: KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
    const t = e.target instanceof Element ? e.target : null;
    const item = t?.closest(TAB_ITEM);
    if (item && root.contains(item)) onTab(item, e.key);
  };

  // <details> ouvert à la main : le contenu se déplie en fondu
  let lastSummary = 0;
  const onSummary = (e: Event) => {
    if (e.target instanceof Element && e.target.closest("summary")) lastSummary = performance.now();
  };
  const onToggle = (e: Event) => {
    const d = e.target;
    if (!(d instanceof HTMLDetailsElement) || !d.open || !root.contains(d) || d.closest(STILL)) return;
    if (performance.now() - lastSummary > 800) return;
    for (const c of Array.from(d.children)) if (c instanceof HTMLElement && c.tagName !== "SUMMARY") enter(c, 0, -4);
  };

  // capture : on regarde l'état des onglets avant que React ne le change
  window.addEventListener("click", onClick, true);
  window.addEventListener("keydown", onKey, true);
  document.addEventListener("pointerdown", onSummary, true);
  document.addEventListener("keydown", onSummary, true);
  document.addEventListener("toggle", onToggle, true);

  // ---------- contenu qui arrive après coup (chargement, onglets, listes) ----------

  const mo = new MutationObserver((recs) => {
    const nodes = new Set<Element>();
    let removed = false;
    let loaded = false;
    for (const r of recs) {
      if (r.type === "childList") {
        r.addedNodes.forEach((n) => n instanceof Element && nodes.add(n));
        r.removedNodes.forEach((n) => {
          removed = true;
          if (n instanceof Element && (n.matches(BUSY) || n.querySelector(BUSY))) loaded = true;
        });
      } else if (r.target instanceof Element && !(r.target as HTMLElement).hidden) nodes.add(r.target);
    }
    // ce qui a quitté la page n'attend plus rien
    if (removed) for (const el of Array.from(pending.keys())) if (!el.isConnected) release(el, true);
    // un squelette (aria-busy) vient d'être remplacé par son contenu : le
    // contenu entre (les enfants directs du gabarit entrent déjà par le CSS)
    if (loaded) {
      for (const n of nodes) {
        if (!(n instanceof HTMLElement) || n.parentElement === root || !n.isConnected || n.closest(STILL)) continue;
        if (Array.from(nodes).some((o) => o !== n && o.contains(n))) continue;
        enter(n, 0, 8);
      }
    }
    for (const n of nodes) {
      let inner = false;
      for (const o of nodes) if (o !== n && o.contains(n)) inner = true;
      if (!inner) scan(n);
    }
  });

  const beforePrint = () => releaseAll(true);
  window.addEventListener("beforeprint", beforePrint);

  try {
    scan(root);
    mo.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden"] });
  } catch {
    releaseAll(true);
  }

  return () => {
    mo.disconnect();
    io.disconnect();
    off.forEach((f) => f());
    window.removeEventListener("click", onClick, true);
    window.removeEventListener("keydown", onKey, true);
    document.removeEventListener("pointerdown", onSummary, true);
    document.removeEventListener("keydown", onSummary, true);
    document.removeEventListener("toggle", onToggle, true);
    window.removeEventListener("beforeprint", beforePrint);
    // tout ce qui attendait redevient visible
    releaseAll(true);
  };
}
