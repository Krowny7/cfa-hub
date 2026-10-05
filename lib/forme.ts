// La « forme » d'un joueur dans une matière, à partir de ses séances (un
// duel, une session, un quiz de fiche… : n répondues, ok justes, date) :
//   - le récent : la précision sur ses dernières réponses (séances entières,
//     des plus récentes aux plus anciennes, jusqu'à RECENT_MIN réponses) ;
//   - la bougie : la dispersion de ses séances, quantiles 10/25/75/90 de la
//     précision par séance, pondérés par le nombre de réponses (une séance de
//     30 questions pèse plus qu'une de 3). Les séances de moins de
//     SEANCE_MIN réponses sont écartées (un 0/1 n'apprend rien), et il en
//     faut BOUGIE_MIN pour tracer une bougie.
// Module pur (client et serveur), testé à part.

export type Seance = { n: number; ok: number; at: string; source: string };

export const RECENT_MIN = 20;
export const SEANCE_MIN = 3;
export const BOUGIE_MIN = 3;

export type Bougie = { p10: number; p25: number; p75: number; p90: number; seances: number };
export type Forme = {
  /** précision récente, en % (null : trop peu de réponses) */
  recent: number | null;
  /** réponses prises en compte pour le récent */
  recentN: number;
  bougie: Bougie | null;
};

/** Quantile pondéré (interpolation sur les poids cumulés, centrés sur chaque séance). */
function quantile(points: { v: number; w: number }[], f: number) {
  const tot = points.reduce((s, p) => s + p.w, 0);
  let cum = 0;
  const pos = points.map((p) => {
    const c = (cum + p.w / 2) / tot;
    cum += p.w;
    return c;
  });
  if (f <= pos[0]) return points[0].v;
  for (let i = 1; i < points.length; i++) {
    if (f <= pos[i]) {
      const t = (f - pos[i - 1]) / (pos[i] - pos[i - 1]);
      return points[i - 1].v + t * (points[i].v - points[i - 1].v);
    }
  }
  return points[points.length - 1].v;
}

/** La forme sur des séances (n'importe quel ordre), filtrées par source si besoin. */
export function formeDe(seances: Seance[] | undefined, source: string = "all"): Forme {
  const liste = (seances ?? []).filter((s) => s.n > 0 && (source === "all" || s.source === source)).sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  let n = 0;
  let ok = 0;
  for (const s of liste) {
    if (n >= RECENT_MIN) break;
    n += s.n;
    ok += s.ok;
  }
  const recent = n >= Math.min(RECENT_MIN, 10) ? Math.round((ok / n) * 100) : null;
  const pts = liste
    .filter((s) => s.n >= SEANCE_MIN)
    .map((s) => ({ v: (s.ok / s.n) * 100, w: s.n }))
    .sort((a, b) => a.v - b.v);
  const bougie =
    pts.length >= BOUGIE_MIN
      ? {
          p10: Math.round(quantile(pts, 0.1)),
          p25: Math.round(quantile(pts, 0.25)),
          p75: Math.round(quantile(pts, 0.75)),
          p90: Math.round(quantile(pts, 0.9)),
          seances: pts.length,
        }
      : null;
  return { recent, recentN: n, bougie };
}

/** Écart notable entre le récent et la moyenne (en points), sinon 0. */
export function tendance(recent: number | null, moyenne: number | null, seuil = 5) {
  if (recent === null || moyenne === null) return 0;
  const d = recent - moyenne;
  return Math.abs(d) >= seuil ? d : 0;
}
