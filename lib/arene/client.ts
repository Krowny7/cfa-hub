// Ce que la mise en scène demande au navigateur : le mode discret, le mouvement
// réduit, ce qui a déjà été joué (recharger ne rejoue rien), la lecture de la
// vidéo. Tout tolère un stockage bloqué : au pire, un écran se rejoue.

const VUS = "arene-vus";
const VUS_MAX = 80;

export const modeDiscret = (): boolean => typeof document !== "undefined" && document.documentElement.dataset.discreet === "1";

export const mouvementReduit = (): boolean => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function vus(): string[] {
  try {
    const l: unknown = JSON.parse(localStorage.getItem(VUS) || "[]");
    return Array.isArray(l) ? l.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

export const dejaJoue = (cle: string): boolean => vus().includes(cle);

export function marquerJoue(cle: string) {
  try {
    localStorage.setItem(VUS, JSON.stringify([cle, ...vus().filter((k) => k !== cle)].slice(0, VUS_MAX)));
  } catch {
    // stockage bloqué
  }
}

/** Lance la vidéo avec le son, en muet si le navigateur refuse ; faux si elle ne part pas du tout. */
export async function lancerVideo(v: HTMLVideoElement): Promise<boolean> {
  v.muted = false;
  try {
    await v.play();
    return true;
  } catch {
    v.muted = true;
  }
  try {
    await v.play();
    return true;
  } catch {
    return false;
  }
}

/** Charge des images avant de les montrer, sans jamais attendre plus que `delaiMs`. */
export function precharger(urls: string[], delaiMs: number): Promise<void> {
  const charges = urls.map(
    (src) =>
      new Promise<void>((fin) => {
        const i = new Image();
        i.onload = i.onerror = () => fin();
        i.src = src;
      }),
  );
  return Promise.race([Promise.all(charges).then(() => undefined), new Promise<void>((fin) => setTimeout(fin, delaiMs))]);
}
