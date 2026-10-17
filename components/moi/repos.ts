// Le repos de la série d'encre (V3 §10.4) : des jours posés à l'avance qui
// ne comptent ni pour ni contre la série (un jour « neutre », s'il reste
// sous les 10 questions). Le repos : deux jours par semaine au plus. La
// pause : 14 jours d'affilée au plus, 30 jours sur une année glissante.
// Jamais dans le passé. La base fait foi (serie_pause_poser, migration du
// Codex) ; ces règles, recopiées ici à l'identique (jours passés compris),
// ne servent qu'à prévenir le joueur avant d'envoyer. Les jours sont des jours de Paris (« AAAA-MM-JJ »).
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

/** Les refus, dans les mots du réglage (les mêmes pour la vérification d'avant l'envoi et pour la base). */
export const REFUS_POSE = {
  passe: "Un repos se pose aujourd'hui ou plus tard, jamais dans le passé.",
  repos: "Deux jours de repos par semaine au plus : pour plus long, pose une pause.",
  affilee: `Une pause dure ${PAUSE_MAX_AFFILEE} jours d'affilée au plus.`,
  annee: `${PAUSE_MAX_ANNEE} jours de pause par an au plus.`,
} as const;

/**
 * Ce qui empêche de poser ces jours (le message à montrer), ou null. Les
 * règles de serie_pause_poser, sur l'état d'après la pose (un jour déjà posé
 * prend le genre choisi, il n'est pas compté deux fois) et sur TOUS les jours
 * posés qu'elle regarde, passés compris (`poses` : depuis aujourd'hui - 364,
 * lirePauses) : pas dans le passé, la fin après le début ; deux jours de
 * repos dans chaque semaine touchée ; une pause de 14 jours d'affilée au
 * plus, avec les pauses posées autour (±30 jours) ; 30 jours de pause sur
 * toute fenêtre de 365 jours qui touche les jours posés.
 */
export function refusPose(de: string, a: string, genre: GenrePause, aujourdhui: string, poses: JourPause[]): string | null {
  if (!estJour(de) || !estJour(a)) return "Choisis un jour de début et un jour de fin.";
  if (de < aujourdhui) return REFUS_POSE.passe;
  if (a < de) return "La fin vient après le début.";
  const jours = joursEntre(de, a);
  // l'état d'après la pose : la base écrase le genre d'un jour déjà posé
  const apres = new Map(poses.map((p) => [p.jour, p.genre] as const));
  for (const j of jours) apres.set(j, genre);
  const duGenre = [...apres].filter(([, g]) => g === genre).map(([j]) => j).sort();
  if (genre === "repos") {
    const semaines = new Set(jours.map(lundiDe));
    const parSemaine = new Map<string, number>();
    for (const j of duGenre) if (semaines.has(lundiDe(j))) parSemaine.set(lundiDe(j), (parSemaine.get(lundiDe(j)) ?? 0) + 1);
    return [...parSemaine.values()].some((n) => n > REPOS_PAR_SEMAINE) ? REFUS_POSE.repos : null;
  }
  if (jours.length > PAUSE_MAX_AFFILEE) return REFUS_POSE.affilee;
  // les îlots de pause qui se suivent, dans la fenêtre que regarde la base (±30 jours)
  const bas = ajouterJours(de, -30);
  const haut = ajouterJours(a, 30);
  const proches = duGenre.filter((j) => j >= bas && j <= haut).map((jour): JourPause => ({ jour, genre }));
  if (plagesDe(proches).some((p) => p.n > PAUSE_MAX_AFFILEE)) return REFUS_POSE.affilee;
  const compte = (du: string, au: string) => duGenre.filter((j) => j >= du && j <= au).length;
  if (jours.some((j) => compte(ajouterJours(j, -364), j) > PAUSE_MAX_ANNEE || compte(j, ajouterJours(j, 364)) > PAUSE_MAX_ANNEE)) return REFUS_POSE.annee;
  return null;
}

/** Le refus de la base (exception de serie_pause_poser) dans les mots du réglage ; null : un autre souci. */
export function refusDeLaBase(message: string | null | undefined): string | null {
  const m = message ?? "";
  if (/deux jours de repos/i.test(m)) return REFUS_POSE.repos;
  if (/quatorze jours|trop de jours/i.test(m)) return REFUS_POSE.affilee;
  if (/trente jours/i.test(m)) return REFUS_POSE.annee;
  if (/jour passé/i.test(m)) return REFUS_POSE.passe;
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
