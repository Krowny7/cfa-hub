// L'animation des arcs électriques (components/ui/ArcElectrique.tsx) : une
// seule boucle pour toute la page, dans le même esprit que celle des insignes
// (rank-badge-anim.ts).
// - le bruit de l'aura change de graine par à-coups (~11 fois par seconde) ;
// - le tronçon lumineux avance le long du contour, au même rythme ;
// - seuls les arcs visibles bougent (IntersectionObserver) ; la boucle
//   s'arrête d'elle-même quand plus aucun n'est à l'écran.
// Mouvement réduit, ?mouvement=off (data-rl-motion="off") ou onglet caché :
// rien ne bouge, l'arc reste posé.

type Entree = {
  racine: HTMLElement;
  bruit: Element | null;
  /** bornes de la fréquence du bruit : plus haut = plus nerveux */
  freq: [number, number];
  /** tour complet en millisecondes ; 0 = le tronçon ne voyage pas */
  tour: number;
  pos: number;
  visible: boolean;
};

const PAS = 90;
const entrees = new Set<Entree>();
const parElement = new WeakMap<Element, Entree>();
let observateur: IntersectionObserver | null = null;
let raf = 0;
let dernier = 0;

const immobile = () =>
  typeof window === "undefined" ||
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
  document.documentElement.dataset.rlMotion === "off";

function relancer() {
  if (raf || !entrees.size || document.hidden || immobile()) return;
  dernier = performance.now();
  raf = requestAnimationFrame(boucle);
}

function boucle(t: number) {
  raf = 0;
  const actifs = [...entrees].filter((e) => e.visible);
  if (!actifs.length || document.hidden || immobile()) return;
  if (t - dernier >= PAS) {
    const dt = t - dernier;
    dernier = t;
    for (const e of actifs) {
      e.bruit?.setAttribute("seed", String(1 + Math.floor(Math.random() * 400)));
      e.bruit?.setAttribute("baseFrequency", (e.freq[0] + Math.random() * (e.freq[1] - e.freq[0])).toFixed(3));
      if (e.tour > 0) {
        e.pos = (e.pos + (dt / e.tour) * 100) % 100;
        e.racine.style.setProperty("--dec", (-e.pos).toFixed(2));
      }
    }
  }
  raf = requestAnimationFrame(boucle);
}

if (typeof document !== "undefined") document.addEventListener("visibilitychange", relancer);

/** Fait vivre un arc ; renvoie de quoi l'arrêter. */
export function animerArc(racine: HTMLElement, bruit: Element | null, opts: { freq: [number, number]; tour: number }): () => void {
  if (typeof window === "undefined") return () => {};
  const e: Entree = { racine, bruit, freq: opts.freq, tour: opts.tour, pos: Math.random() * 100, visible: false };
  entrees.add(e);
  parElement.set(racine, e);
  if (typeof IntersectionObserver === "undefined") e.visible = true;
  else {
    observateur ??= new IntersectionObserver((list) => {
      for (const it of list) {
        const x = parElement.get(it.target);
        if (!x) continue;
        x.visible = it.isIntersecting;
        // hors écran, l'animation CSS (le souffle de l'aura) attend aussi
        x.racine.dataset.hors = it.isIntersecting ? "0" : "1";
      }
      relancer();
    });
    observateur.observe(racine);
  }
  relancer();
  return () => {
    entrees.delete(e);
    observateur?.unobserve(racine);
  };
}
