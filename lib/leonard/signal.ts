// Léonard, la mascotte : les signaux que lui envoient les écrans du site
// (fin de session, verdict de duel, défi du jour, montée de rang, sceau gagné…). Un
// signal ne fait que proposer : c'est l'hôte (components/leonard) qui décide
// s'il apparaît (réglages, mode discret, fréquence, hasard). Un signal avec
// une `cle` n'est émis qu'une fois sur cet appareil (on ne réagit pas deux
// fois au même résultat qu'on revoit). Module client (sans effet à
// l'import : rien ne s'exécute côté serveur).

export type EvenementLeonard =
  | "tuto"
  | "erreurs-serie"
  | "session-ratee"
  | "session-moyenne"
  | "session-reussie"
  | "session-parfaite"
  | "serie-bonnes"
  | "progression"
  | "duel-gagne"
  | "duel-perdu"
  | "duel-ecrase"
  | "duel-nul"
  | "defi-reussi"
  | "defi-rate"
  | "atelier-progres"
  | "atelier-rayees"
  | "atelier-dur"
  | "atelier-fini"
  | "rang-monte"
  | "sceau-gagne"
  | "retour"
  | "tard"
  | "furtif";

export type SignalLeonard = {
  evt: EvenementLeonard;
  /** valeurs des marqueurs {score}, {pct}, {n}, {notion} des répliques */
  vars?: Record<string, string | number>;
  /** attendre avant d'apparaître (laisser un écran de résultat se poser) */
  delai?: number;
};

export const EVENEMENT_LEONARD = "rl:leonard";
const VUS = "rl_leonard_signaux";
const HISTO = "rl_leonard_histo";

function lire<T>(cle: string, defaut: T): T {
  try {
    const v = localStorage.getItem(cle);
    return v ? (JSON.parse(v) as T) : defaut;
  } catch {
    return defaut;
  }
}
function ecrire(cle: string, v: unknown) {
  try {
    localStorage.setItem(cle, JSON.stringify(v));
  } catch {
    // stockage indisponible : tant pis
  }
}

/** Envoie un signal à Léonard (une seule fois par `cle` si elle est donnée). */
export function signalerLeonard(s: SignalLeonard, cle?: string) {
  if (typeof window === "undefined") return;
  if (cle) {
    const vus = lire<string[]>(VUS, []);
    if (vus.includes(cle)) return;
    ecrire(VUS, [cle, ...vus].slice(0, 120));
  }
  window.dispatchEvent(new CustomEvent<SignalLeonard>(EVENEMENT_LEONARD, { detail: s }));
}

/** Une empreinte courte (clé d'un résultat). */
export function empreinte(...parts: (string | number)[]) {
  let h = 2166136261;
  for (const c of parts.join("|")) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(36);
}

/**
 * Ce que Léonard pourrait dire d'une session terminée : sa réussite
 * (raté, moyen, réussi, parfait), une série de 3 erreurs d'affilée, une
 * série de 8 bonnes, une progression (nettement au-dessus de ses dernières
 * sessions sur cet appareil, ou un record), une session après minuit.
 * Retient le pourcentage pour juger les suivantes.
 */
export function analyserSession(reponses: boolean[], score: number, total: number): SignalLeonard | null {
  if (total < 3) return null;
  const pct = Math.round((score / total) * 100);
  let erreurs = 0, bonnes = 0, maxErreurs = 0, maxBonnes = 0;
  for (const ok of reponses) {
    if (ok) {
      bonnes++;
      erreurs = 0;
    } else {
      erreurs++;
      bonnes = 0;
    }
    maxErreurs = Math.max(maxErreurs, erreurs);
    maxBonnes = Math.max(maxBonnes, bonnes);
  }
  const histo = lire<number[]>(HISTO, []);
  ecrire(HISTO, [pct, ...histo].slice(0, 20));
  const moyenne = histo.length ? histo.reduce((a, b) => a + b, 0) / histo.length : null;
  const record = histo.length >= 3 && pct > Math.max(...histo);
  const heure = new Date().getHours();

  let evt: EvenementLeonard;
  if (pct === 100) evt = "session-parfaite";
  else if ((moyenne !== null && histo.length >= 3 && pct >= moyenne + 15 && pct >= 60) || (record && pct >= 70)) evt = "progression";
  else if (maxBonnes >= 8) evt = "serie-bonnes";
  else if (maxErreurs >= 3) evt = "erreurs-serie";
  else if (heure < 5 && Math.random() < 0.5) evt = "tard";
  else if (pct < 40) evt = "session-ratee";
  else if (pct < 70) evt = "session-moyenne";
  else evt = "session-reussie";
  return { evt, vars: { score: `${score}/${total}`, pct: `${pct} %`, n: evt === "erreurs-serie" ? maxErreurs : maxBonnes } };
}

/** Ce que Léonard lit d'un bilan d'Atelier (lib/atelier BilanAtelier, réduit à ce qu'il commente). */
export type BilanPourLeonard = {
  score: number;
  total: number;
  notions: { libelle: string; avant: { n: number; ok: number }; pendant: { n: number; ok: number }; rayees: number; tenue: boolean }[];
  /** la notion la plus basse pendant l'Atelier (null sans question) */
  aRevoir: string | null;
};

/** Points de réussite gagnés sur une notion, entre l'avant et le pendant, pour parler de progrès. */
const PROGRES_POINTS = 20;

/**
 * Ce que Léonard pourrait dire d'un Atelier clos (une seule réaction : elle
 * remplace celle de FinDeSession) : une notion tenue ou nettement au-dessus
 * de son avant (progrès), sinon des ratures rayées (3 au moins), sinon un
 * Atelier difficile (moins de la moitié juste), sinon un Atelier fini.
 */
export function analyserAtelier(b: BilanPourLeonard): SignalLeonard | null {
  if (b.total < 3) return null;
  const taux = (x: { n: number; ok: number }) => (x.n > 0 ? (x.ok / x.n) * 100 : null);
  const progres = b.notions
    .map((x) => ({ x, gain: x.pendant.n >= 3 && x.avant.n >= 3 ? (taux(x.pendant) as number) - (taux(x.avant) as number) : x.tenue ? PROGRES_POINTS : -Infinity }))
    .filter((p) => p.x.tenue || p.gain >= PROGRES_POINTS)
    .sort((a, c) => c.gain - a.gain)[0];
  const rayees = b.notions.reduce((s, x) => s + x.rayees, 0);
  const vars = { score: `${b.score}/${b.total}`, n: rayees };
  if (progres) return { evt: "atelier-progres", vars: { ...vars, notion: progres.x.libelle } };
  if (rayees >= 3) return { evt: "atelier-rayees", vars };
  if (b.score / b.total < 0.5) return { evt: "atelier-dur", vars: { ...vars, notion: b.aRevoir ?? b.notions[0]?.libelle ?? "" } };
  return { evt: "atelier-fini", vars };
}
