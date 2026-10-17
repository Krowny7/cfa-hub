// Le repos de la série d'encre (V3 §10.4) : des jours posés à l'avance qui
// ne comptent ni pour ni contre la série (un jour « neutre », s'il reste
// sous les 10 questions). Le repos : deux jours par semaine au plus. La
// pause : 14 jours d'affilée au plus, 30 jours sur une année glissante.
// Jamais dans le passé. La base fait foi (serie_pause_poser, migration du
// Codex) ; ces règles, recopiées ici, ne servent qu'à prévenir le joueur
// avant d'envoyer. Les jours sont des jours de Paris (« AAAA-MM-JJ »).
// Module neutre (client et serveur), sans accès à la base.

export type GenrePause = "repos" | "pause";
export type JourPause = { jour: string; genre: GenrePause };
export type PlagePause = { de: string; a: string; genre: GenrePause; n: number };

export const REPOS_PAR_SEMAINE = 2;
export const PAUSE_MAX_AFFILEE = 14;
export const PAUSE_MAX_ANNEE = 30;

const JOUR = /^\d{4}-\d{2}-\d{2}$/;
export const estJour = (v: unknown): v is string => typeof v === "string" && JOUR.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

/** Le jour décalé de n jours (calendrier pur, sans fuseau). */
export function ajouterJours(jour: string, n: number): string {
  const d = new Date(`${jour}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Les jours de `de` à `a` compris (vide si `a` précède `de`). */
export function joursEntre(de: string, a: string): string[] {
  const out: string[] = [];
  for (let j = de; j <= a && out.length < 400; j = ajouterJours(j, 1)) out.push(j);
  return out;
}

/** Le lundi de la semaine d'un jour. */
export function lundiDe(jour: string): string {
  const d = new Date(`${jour}T00:00:00Z`);
  return ajouterJours(jour, -((d.getUTCDay() + 6) % 7));
}

/** Les jours posés, en plages de jours qui se suivent et du même genre (dans l'ordre). */
export function plagesDe(jours: JourPause[]): PlagePause[] {
  const tries = [...jours].sort((x, y) => x.jour.localeCompare(y.jour));
  const out: PlagePause[] = [];
  for (const j of tries) {
    const der = out[out.length - 1];
    if (der && der.genre === j.genre && ajouterJours(der.a, 1) === j.jour) {
      der.a = j.jour;
      der.n++;
    } else out.push({ de: j.jour, a: j.jour, genre: j.genre, n: 1 });
  }
  return out;
}

/**
 * Ce qui empêche de poser ces jours (le message à montrer), ou null : pas
 * dans le passé, la fin après le début, deux jours de repos par semaine,
 * une pause de 14 jours d'affilée et 30 jours par an au plus (en comptant
 * ce qui est déjà posé ; un jour déjà posé n'est pas compté deux fois).
 */
export function refusPose(de: string, a: string, genre: GenrePause, aujourdhui: string, poses: JourPause[]): string | null {
  if (!estJour(de) || !estJour(a)) return "Choisis un jour de début et un jour de fin.";
  if (de < aujourdhui) return "Un repos se pose aujourd'hui ou plus tard, jamais dans le passé.";
  if (a < de) return "La fin vient après le début.";
  const jours = joursEntre(de, a);
  const deja = new Set(poses.map((p) => p.jour));
  const neufs = jours.filter((j) => !deja.has(j));
  if (genre === "repos") {
    const parSemaine = new Map<string, number>();
    for (const j of [...poses.filter((p) => p.genre === "repos").map((p) => p.jour), ...neufs]) parSemaine.set(lundiDe(j), (parSemaine.get(lundiDe(j)) ?? 0) + 1);
    if ([...parSemaine.values()].some((n) => n > REPOS_PAR_SEMAINE)) return `Deux jours de repos par semaine au plus : pour plus long, pose une pause.`;
    return null;
  }
  if (jours.length > PAUSE_MAX_AFFILEE) return `Une pause dure ${PAUSE_MAX_AFFILEE} jours d'affilée au plus.`;
  const debutAnnee = ajouterJours(a, -364);
  const dansLAnnee = poses.filter((p) => p.genre === "pause" && p.jour >= debutAnnee && p.jour <= a).length + neufs.length;
  if (dansLAnnee > PAUSE_MAX_ANNEE) return `${PAUSE_MAX_ANNEE} jours de pause par an au plus.`;
  return null;
}

/** « samedi 25 oct. » ; une plage : « du lundi 3 au vendredi 7 nov. » (l'année seulement si ce n'est pas celle d'aujourd'hui). */
export function libellePlage(p: Pick<PlagePause, "de" | "a">, aujourdhui: string): string {
  const fmt = (j: string, mois: boolean) =>
    new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", ...(mois ? { month: "short" } : {}), ...(j.slice(0, 4) !== aujourdhui.slice(0, 4) ? { year: "numeric" } : {}) }).format(new Date(`${j}T00:00:00Z`));
  if (p.de === p.a) return fmt(p.de, true);
  const memeMois = p.de.slice(0, 7) === p.a.slice(0, 7);
  return `du ${fmt(p.de, !memeMois)} au ${fmt(p.a, true)}`;
}
