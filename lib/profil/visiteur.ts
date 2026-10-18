import type { SupabaseClient } from "@supabase/supabase-js";
import { traitsDuJour } from "@/components/adn/AnneauDuJourData";
import { joursAvant, jourParis } from "@/lib/objectif";
import { decaleJour } from "@/lib/objectif-calc";
import { getTopicMastery, type TopicMastery } from "@/lib/mastery";
import { SEUIL_JOUR, calculerSerie, joursDePause } from "@/lib/serie-encre";
import { DEFAULT_ELO } from "@/lib/ranks";
import { lireTrophees } from "@/lib/trophees";
import { lireSaisons } from "@/lib/profil/saisons";
import { JOURS_JOURNAL } from "@/lib/profil/journal";
import { FOLIOS } from "@/lib/profil/pieces";
import { PIECES_DEFAUT, STATS_VIDES, piecesVues, type ProfilStats, type VitrineKey } from "@/lib/profil/catalogue";
import { styleDepuis, type LigneStyle } from "@/lib/profil/styles";
import { series, statsProfil, type AmiLite } from "@/lib/profil/donnees";
import { extraitCarnet, joursDuCarnet } from "@/lib/profil/blocs-resumes";
import type { AmiBloc, DonneesBlocs, DonneesVisiteur, ExtraitCarnet, SeanceProgression } from "@/lib/profil/blocs-donnees";

// Ce que la page de profil sait de celui qui regarde (« toi »), chez un
// autre joueur : lu par le serveur (app/people/[id]/page.tsx), une seule
// fois, pour le bandeau « Rapport de force » et les écarts des blocs
// (DonneesVisiteur, lib/profil/blocs-donnees.ts).
// - L'essentiel est toujours lu chez un autre (onglet Profil) : ELO,
//   parties, avatar, couleur et maîtrise viennent de lectures que la page
//   fait déjà (élargies à toi : 0 requête) ; questions, série, record,
//   matières et jours viennent de lectures en cache (la barre du haut les a
//   faites) plus la série d'encre et les jours de pause (2 requêtes).
// - Le reste ne l'est que si le bloc qui s'en sert est posé : stats
//   complètes (vitrine avec Duels, Défis, Calculs ou Examens), trophées,
//   saisons, séances, courbe d'ELO (Journal ouvert), folio.
// - Jamais tes réponses (getAnswerStats : trop lourd).
// Aussi, pour les blocs du joueur regardé : son cercle d'amis par ELO (toi
// compris, amis communs marqués) et son carnet de jours sans journalDe.
// Module serveur ; les fonctions pures (essentielDepuis, serieDepuis,
// cercleDe, choisirAmis, semaines, courbeDepuis, besoinsVisiteur…) se
// testent sans base : scripts/profil/test-visiteur.ts.

// ── L'essentiel : questions, série, record, matières, jours ──────────────

/** Ce que l'essentiel lit, brut. */
export type LecturesEssentiel = {
  /** questions par jour avant aujourd'hui (joursAvant) */
  avant: { day: string; n: number }[];
  /** questions d'aujourd'hui (null : lecture échouée) */
  duJour: number | null;
  topics: TopicMastery[];
  /** la série d'encre (migration collée) et sa meilleure série en base ; null : l'ancien calcul */
  serieLue: { meilleure: number } | null;
  /** jours de repos et de pause (neutres pour la série d'encre) */
  pauses: ReadonlySet<string>;
  aujourdhui: string;
};

export type Essentiel = Pick<DonneesVisiteur, "stats" | "jours" | "aujourdhui">;

/**
 * La série en cours et la meilleure, d'après les questions par jour : le
 * même calcul que statsProfil (la série d'encre quand la migration est
 * collée, recalculée avec les jours de pause ; sinon l'ancien calcul).
 */
export function serieDepuis(parJour: Map<string, number>, aujourdhui: string, serieLue: { meilleure: number } | null, pauses: ReadonlySet<string> = new Set()): { serie: number; meilleure: number } {
  if (serieLue) {
    const c = calculerSerie(parJour, aujourdhui, undefined, pauses);
    return { serie: c.serieAffichee, meilleure: Math.max(c.meilleure, serieLue.meilleure) };
  }
  const { meilleure, enCours } = series([...parJour.keys()], aujourdhui);
  return { serie: enCours, meilleure };
}

/** Questions par jour (n > 0), aujourd'hui compris s'il y en a. */
function parJourDe(avant: { day: string; n: number }[], duJour: number, aujourdhui: string): Map<string, number> {
  const parJour = new Map(avant.filter((j) => j.n > 0 && j.day < aujourdhui).map((j) => [j.day, j.n] as [string, number]));
  if (duJour > 0) parJour.set(aujourdhui, duJour);
  return parJour;
}

/**
 * L'essentiel d'un joueur, d'après ses lectures : ses chiffres (questions,
 * série, record, questions du jour, matières ; duels, défis, calculs et
 * examens restent à 0 : non lus) et ses jours des 52 semaines (n > 0,
 * aujourd'hui compris).
 */
export function essentielDepuis(l: LecturesEssentiel): Essentiel {
  const duJour = Math.max(0, l.duJour ?? 0);
  const parJour = parJourDe(l.avant, duJour, l.aujourdhui);
  const { serie, meilleure } = serieDepuis(parJour, l.aujourdhui, l.serieLue, l.pauses);
  return {
    stats: {
      ...STATS_VIDES,
      questions: l.avant.reduce((s, j) => s + (j.n > 0 ? j.n : 0), 0) + duJour,
      serie,
      meilleureSerie: meilleure,
      serieEncre: !!l.serieLue,
      duJour,
      matieres: l.topics.map((t) => ({ key: t.key, pct: t.pct, answered: t.answered, ...(t.statut ? { statut: t.statut } : {}) })),
    },
    jours: joursDuCarnet(parJour, l.aujourdhui),
    aujourdhui: l.aujourdhui,
  };
}

/** La série d'encre d'un joueur (sa meilleure en base) ; null : table absente, l'ancien calcul. */
async function serieEncreDe(sb: SupabaseClient, userId: string): Promise<{ meilleure: number } | null> {
  try {
    const { data, error } = await sb.from("serie_encre").select("meilleure").eq("user_id", userId).maybeSingle();
    if (error) return null;
    const n = Number((data as { meilleure?: number } | null)?.meilleure ?? 0);
    return { meilleure: Number.isFinite(n) && n > 0 ? Math.floor(n) : 0 };
  } catch {
    return null;
  }
}

/**
 * L'essentiel de celui qui regarde, avec SON client (ses lignes : la RLS
 * les lui ouvre). joursAvant, traitsDuJour et la maîtrise sont en cache
 * (la barre du haut les a lus dans la même requête ; sinon le mémo de 60 s
 * et le cache de 26 h) ; la série d'encre et les pauses : 2 requêtes.
 */
export async function lireEssentiel(sb: SupabaseClient, userId: string, aujourdhui = jourParis()): Promise<Essentiel> {
  const [avant, duJour, topics, serieLue, pauses] = await Promise.all([
    joursAvant(userId, aujourdhui).catch(() => [] as { day: string; n: number }[]),
    traitsDuJour(userId).catch(() => null),
    getTopicMastery(sb, userId).catch(() => [] as TopicMastery[]),
    serieEncreDe(sb, userId),
    joursDePause(sb, userId, aujourdhui).catch(() => new Set<string>()),
  ]);
  return essentielDepuis({ avant, duJour, topics, serieLue, pauses, aujourdhui });
}

/** Les jours (52 semaines) d'un joueur dont les stats complètes sont déjà lues : joursAvant est en cache (statsProfil l'a lu). */
async function joursAvecStats(userId: string, stats: ProfilStats, aujourdhui: string): Promise<Essentiel> {
  const avant = await joursAvant(userId, aujourdhui).catch(() => [] as { day: string; n: number }[]);
  return { stats, jours: joursDuCarnet(parJourDe(avant, stats.duJour ?? 0, aujourdhui), aujourdhui), aujourdhui };
}

// ── Ce que la page lit déjà : élargi à toi ───────────────────────────────

/** La maîtrise du programme mesurée : 0 (rien de mesuré, masteryByUser) devient null. */
export const maitriseMesuree = (m: number | null | undefined): number | null => (typeof m === "number" && Number.isFinite(m) && m > 0 ? m : null);

export type BaseVisiteur = Pick<DonneesVisiteur, "id" | "accent" | "elo" | "parties" | "maitrise"> & { profil: AmiLite; folio: string | null };

/**
 * Ce que la page a déjà lu de toi en élargissant ses lectures du joueur
 * regardé (0 requête) : ta ligne de `profiles` (avatar), de `ratings` (ELO,
 * parties), de `profile_style` (couleur, folio porté) et ta maîtrise
 * (masteryByUser). Des lignes brutes : rien ne casse si l'une manque.
 */
export function baseDuVisiteur(
  userId: string,
  lu: { profils: readonly unknown[] | null; ratings: readonly unknown[] | null; style: LigneStyle | null | undefined; maitrises: Map<string, number> },
): BaseVisiteur {
  const p = (lu.profils ?? []).find((x) => (x as { id?: unknown })?.id === userId) as { username?: string | null; avatar_url?: string | null } | undefined;
  const r = (lu.ratings ?? []).find((x) => (x as { user_id?: unknown })?.user_id === userId) as { elo?: number | null; games_played?: number | null } | undefined;
  const style = styleDepuis(lu.style ?? null);
  const elo = Number(r?.elo);
  const parties = Number(r?.games_played);
  return {
    id: userId,
    accent: style.accent,
    elo: Number.isFinite(elo) && r?.elo !== null && r?.elo !== undefined ? elo : DEFAULT_ELO,
    parties: Number.isFinite(parties) && parties > 0 ? Math.floor(parties) : 0,
    maitrise: maitriseMesuree(lu.maitrises.get(userId)),
    profil: { id: userId, name: p?.username || "Joueur", avatarUrl: p?.avatar_url ?? null },
    folio: style.folio ?? null,
  };
}

// ── Le reste, si le bloc est posé ────────────────────────────────────────

/** Les pièces de vitrine qui demandent les comptes complets (statsProfil). */
const PIECES_COMPLETES: readonly string[] = ["duels", "defis", "calculs", "examens"];

export type BesoinsVisiteur = { statsCompletes: boolean; trophees: boolean; saisons: boolean; seances: boolean; courbeElo: boolean; folio: boolean };

/**
 * Ce que les blocs posés demandent de plus que l'essentiel. `showcase` :
 * les pièces de vitrine du joueur regardé (vide : celles par défaut), telles
 * que le bloc Chiffres clés les montre à un visiteur (la relève : piecesVues) ;
 * `journalOuvert` : son Journal t'est ouvert (la courbe ne se lit qu'alors) ;
 * `folio` : il porte un folio.
 */
export function besoinsVisiteur(blocs: ReadonlySet<string>, o: { showcase: readonly string[]; journalOuvert: boolean; folio: boolean }): BesoinsVisiteur {
  const pieces = piecesVues((o.showcase.length ? o.showcase : PIECES_DEFAUT) as readonly VitrineKey[], true);
  return {
    statsCompletes: blocs.has("vitrine") && pieces.some((p) => PIECES_COMPLETES.includes(p)),
    trophees: blocs.has("trophees"),
    saisons: blocs.has("saisons"),
    seances: blocs.has("progression"),
    courbeElo: blocs.has("journal") && o.journalOuvert,
    folio: blocs.has("folio") && o.folio,
  };
}

/** Les séances gardées pour comparer : celles des `jours` derniers jours, et au moins les `dernieres` (la moyenne des 5 dernières), de la plus ancienne à la plus récente. */
export function seancesRecentes(s: readonly SeanceProgression[], aujourdhui: string, jours = 60, dernieres = 5): SeanceProgression[] {
  const tri = [...s].sort((a, b) => (a.completed_at < b.completed_at ? -1 : a.completed_at > b.completed_at ? 1 : 0));
  const borne = decaleJour(aujourdhui, -jours);
  return tri.filter((x, i) => jourParis(new Date(x.completed_at)) > borne || i >= tri.length - dernieres);
}

/** Tes séances (la rpc publique get_user_practice_progress) : 1 rpc ; null si elle manque. */
async function lireSeances(sb: SupabaseClient, userId: string, aujourdhui: string): Promise<SeanceProgression[] | null> {
  try {
    const { data, error } = await sb.rpc("get_user_practice_progress", { p_user_id: userId });
    if (error || !Array.isArray(data)) return null;
    return seancesRecentes(data as SeanceProgression[], aujourdhui);
  } catch {
    return null;
  }
}

export type EvenementElo = { avant: number; apres: number; quand: string };

/** Deux matchs réglés au même instant (un examen blanc classé) : remis bout à bout, chacun partant de l'ELO où l'autre finit (comme le Journal). */
function enChaine(ev: EvenementElo[]): EvenementElo[] {
  const out: EvenementElo[] = [];
  for (let i = 0; i < ev.length; ) {
    let j = i;
    while (j < ev.length && ev[j].quand === ev[i].quand) j++;
    const groupe = ev.slice(i, j);
    while (groupe.length) {
      const avant = out.length ? out[out.length - 1].apres : null;
      let k = avant !== null ? groupe.findIndex((e) => e.avant === avant) : -1;
      if (k < 0) k = groupe.findIndex((e) => !groupe.some((f) => f !== e && f.apres === e.avant));
      out.push(...groupe.splice(Math.max(0, k), 1));
    }
    i = j;
  }
  return out;
}

/**
 * Une courbe d'ELO des 90 jours, comme celle du Journal (extraitJournal) :
 * l'ELO au premier jour, puis après chaque match (90 points au plus, les
 * derniers) et le jour de Paris de chaque point. Aucun match dans la
 * fenêtre : la courbe part de l'ELO actuel, sans point.
 */
export function courbeDepuis(evenements: readonly EvenementElo[], debut: string, eloActuel: number): { depart: number; points: number[]; dates: string[] } {
  const tri = [...evenements].sort((a, b) => (a.quand < b.quand ? -1 : a.quand > b.quand ? 1 : 0));
  const dans = enChaine(tri)
    .map((e) => ({ ...e, jour: jourParis(new Date(e.quand)) }))
    .filter((e) => e.jour >= debut);
  return {
    depart: dans.length ? dans[0].avant : eloActuel,
    points: dans.map((e) => e.apres).slice(-90),
    dates: dans.map((e) => e.jour).slice(-90),
  };
}

/** Ta courbe d'ELO des 90 jours (rating_events, lisible par tous) : 1 requête ; null si elle échoue. */
async function lireCourbeElo(sb: SupabaseClient, userId: string, aujourdhui: string, eloActuel: number): Promise<DonneesVisiteur["courbeElo"]> {
  const debut = decaleJour(aujourdhui, -(JOURS_JOURNAL - 1));
  // la veille du premier jour, à midi : une marge large, le filtre par jour de Paris fait le reste
  const depuis = new Date(Date.parse(decaleJour(debut, -1) + "T12:00:00Z")).toISOString();
  try {
    const { data, error } = await sb
      .from("rating_events")
      .select("elo_before,elo_after,created_at")
      .eq("user_id", userId)
      .gte("created_at", depuis)
      .order("created_at", { ascending: true })
      .limit(1000);
    if (error || !Array.isArray(data)) return null;
    const ev = (data as { elo_before: number; elo_after: number; created_at: string }[]).map((r) => ({ avant: Number(r.elo_before), apres: Number(r.elo_after), quand: String(r.created_at) }));
    return courbeDepuis(ev, debut, eloActuel);
  } catch {
    return null;
  }
}

/**
 * Le folio qu'il porte est-il aussi à toi ? Oui si tu le portes, sinon si
 * sa quête du Codex t'a été remise (codex_progression, ta ligne : 1
 * requête). null : pas de folio, ou rien de lisible (alors pas de badge).
 */
async function lireFolioAussi(sb: SupabaseClient, userId: string, sien: string | null, mien: string | null): Promise<boolean | null> {
  if (!sien) return null;
  if (mien === sien) return true;
  const quete = FOLIOS.find((f) => f.nue === sien)?.quete;
  if (!quete) return null;
  try {
    const { data, error } = await sb.from("codex_progression").select("quete_id").eq("user_id", userId).eq("quete_id", quete).eq("etat", "recompensee").limit(1);
    if (error || !Array.isArray(data)) return null;
    return data.length > 0;
  } catch {
    return null;
  }
}

/** Celui qui regarde, tel que les blocs le reçoivent ; `profil` (ton avatar, le cercle d'amis) et `folio` (le badge du Folio) en plus de DonneesVisiteur. */
export type VisiteurLu = DonneesVisiteur & { profil: AmiLite; folio?: boolean | null };

/**
 * Celui qui regarde, chez un autre (onglet Profil) : l'essentiel toujours,
 * le reste si le bloc est posé. `sb` : SON client. `base` : ce que la page
 * a déjà lu de lui (baseDuVisiteur). `folioSien` : le folio que porte le
 * joueur regardé. Les amis communs (`amis`) viennent de lireCercle.
 */
export async function lireVisiteur(o: {
  sb: SupabaseClient;
  base: BaseVisiteur;
  blocs: ReadonlySet<string>;
  showcase: readonly string[];
  journalOuvert: boolean;
  folioSien: string | null;
}): Promise<VisiteurLu> {
  const { sb, base } = o;
  const aujourdhui = jourParis();
  const b = besoinsVisiteur(o.blocs, { showcase: o.showcase, journalOuvert: o.journalOuvert, folio: !!o.folioSien });
  const [essentiel, trophees, saisons, seances, courbeElo, folio] = await Promise.all([
    // les comptes complets (≈ 24 requêtes, 0 si le radar ou le face-à-face les a déjà lus) seulement si la vitrine les montre
    b.statsCompletes ? statsProfil(base.id, sb).then((stats) => joursAvecStats(base.id, stats, aujourdhui)) : lireEssentiel(sb, base.id, aujourdhui),
    b.trophees
      ? lireTrophees(sb, base.id)
          .then((t) => ({ parPalier: t.parPalier, total: t.total, complet: t.complet }))
          .catch(() => null)
      : undefined,
    b.saisons ? lireSaisons(sb, base.id).catch(() => null) : undefined,
    b.seances ? lireSeances(sb, base.id, aujourdhui) : undefined,
    b.courbeElo ? lireCourbeElo(sb, base.id, aujourdhui, base.elo) : undefined,
    b.folio ? lireFolioAussi(sb, base.id, o.folioSien, base.folio) : undefined,
  ]);
  return {
    id: base.id,
    accent: base.accent,
    elo: base.elo,
    parties: base.parties,
    maitrise: base.maitrise,
    profil: base.profil,
    ...essentiel,
    ...(trophees !== undefined ? { trophees } : {}),
    ...(saisons !== undefined ? { saisons } : {}),
    ...(seances !== undefined ? { seances } : {}),
    ...(courbeElo !== undefined ? { courbeElo } : {}),
    ...(folio !== undefined ? { folio } : {}),
  };
}

// ── Son cercle d'amis, par ELO ───────────────────────────────────────────

export type MembreCercle = { id: string; elo: number };
/** un membre du cercle, et s'il est l'un de ses amis (lui ne l'est pas ; toi, seulement si tu l'es) */
export type PlaceCercle = MembreCercle & { ami: boolean };
export type Cercle = NonNullable<NonNullable<DonneesBlocs["amis"]>["cercle"]>;

/**
 * Son cercle : ses amis, lui et toi (inséré à ta place si tu n'es pas son
 * ami), par ELO décroissant. Une place se partage à égalité d'ELO (1 + le
 * nombre de ceux qui ont plus). `ordre` : du plus haut au plus bas ; à
 * égalité, lui, puis toi, puis l'ordre de ses amis.
 */
export function cercleDe(lui: MembreCercle, amis: readonly MembreCercle[], toi: MembreCercle | null): { cercle: Cercle; ordre: PlaceCercle[] } {
  const vus = new Set<string>([lui.id]);
  const ids = new Set(amis.map((a) => a.id));
  const membres: PlaceCercle[] = [{ id: lui.id, elo: lui.elo, ami: false }];
  const autre = toi && toi.id !== lui.id ? toi : null;
  if (autre && !ids.has(autre.id)) {
    membres.push({ id: autre.id, elo: autre.elo, ami: false });
    vus.add(autre.id);
  }
  for (const a of amis) {
    if (vus.has(a.id)) continue;
    vus.add(a.id);
    membres.push({ id: a.id, elo: a.elo, ami: true });
  }
  const ordre = membres
    .map((m, i) => ({ m, i }))
    .sort((a, b) => b.m.elo - a.m.elo || a.i - b.i)
    .map((x) => x.m);
  const place = (id: string) => {
    const m = membres.find((x) => x.id === id);
    return m ? 1 + membres.filter((x) => x.elo > m.elo).length : null;
  };
  return { cercle: { lui: place(lui.id) ?? 1, toi: autre ? place(autre.id) : null, taille: membres.length }, ordre };
}

/**
 * Les `n` amis à montrer, dans l'ordre du cercle : une tranche d'un seul
 * tenant de ses amis (toi compris si tu en es). `centre` : la tranche qui
 * contient sa place et la tienne, centrée sur elles (trop loin l'une de
 * l'autre : centrée sur la sienne) ; sinon les n premiers (chez soi : les
 * plus hauts ELO).
 */
export function choisirAmis(ordre: readonly PlaceCercle[], luiId: string, toiId: string | null, n: number, centre = true): PlaceCercle[] {
  const liste = ordre.filter((m) => m.ami);
  if (!centre || liste.length <= n) return liste.slice(0, n);
  // la position d'insertion parmi ses amis : combien d'amis passent avant
  const avant = (id: string) => {
    const i = ordre.findIndex((m) => m.id === id);
    return i < 0 ? -1 : ordre.slice(0, i).filter((m) => m.ami).length;
  };
  const p = Math.max(0, avant(luiId));
  let lo = p;
  let hi = p;
  const q = toiId ? avant(toiId) : -1;
  if (q >= 0) {
    // toi, ami : ta propre case tient dans la tranche ; sinon ta place entre deux amis
    const ami = ordre.find((m) => m.id === toiId)?.ami ?? false;
    lo = Math.min(p, q);
    hi = Math.max(p, ami ? q + 1 : q);
  }
  const debut = hi - lo <= n ? lo - Math.floor((n - (hi - lo)) / 2) : p - Math.floor(n / 2);
  const a = Math.max(0, Math.min(debut, liste.length - n));
  return liste.slice(a, a + n);
}

/** Les identifiants des amis d'un joueur (les plus récents d'abord, 500 au plus) ; null : illisible. */
async function idsAmisDe(sb: SupabaseClient, userId: string): Promise<string[] | null> {
  try {
    const { data, error } = await sb
      .from("friendships")
      .select("requester,addressee,responded_at")
      .eq("status", "accepted")
      .or(`requester.eq.${userId},addressee.eq.${userId}`)
      .order("responded_at", { ascending: false })
      .limit(500);
    if (error) return null;
    return ((data ?? []) as { requester: string; addressee: string }[]).map((r) => (r.requester === userId ? r.addressee : r.requester));
  } catch {
    return null;
  }
}

/** L'ELO de chaque joueur (ratings, par lots de 100, en parallèle) ; un joueur sans ligne n'a pas d'entrée. */
async function elosDe(sb: SupabaseClient, ids: string[]): Promise<Map<string, number>> {
  const uniques = [...new Set(ids)];
  const lots: string[][] = [];
  for (let i = 0; i < uniques.length; i += 100) lots.push(uniques.slice(i, i + 100));
  const out = new Map<string, number>();
  await Promise.all(
    lots.map(async (lot) => {
      try {
        const { data, error } = await sb.from("ratings").select("user_id,elo").in("user_id", lot);
        if (error || !data) return;
        for (const r of data as { user_id: string; elo: number | null }[]) if (r.elo !== null && Number.isFinite(Number(r.elo))) out.set(r.user_id, Number(r.elo));
      } catch {
        // ce lot sans ELO : l'ELO de départ
      }
    }),
  );
  return out;
}

/** Les profils à montrer (pseudo, avatar), dans l'ordre demandé : 1 requête. */
async function profilsDe(sb: SupabaseClient, ids: string[]): Promise<AmiLite[]> {
  if (!ids.length) return [];
  const { data } = await sb.from("profiles").select("id,username,avatar_url").in("id", ids);
  const parId = new Map(((data ?? []) as { id: string; username: string | null; avatar_url: string | null }[]).map((p) => [p.id, p]));
  return ids.map((id) => ({ id, name: parId.get(id)?.username || "Joueur", avatarUrl: parId.get(id)?.avatar_url ?? null }));
}

export type AmisDuBloc = NonNullable<DonneesBlocs["amis"]>;

/**
 * Ses amis pour le bloc Amis (à la place d'amisDe, quand le bloc est
 * posé) : leur ELO, sa place dans son cercle et la tienne, les amis
 * communs. Lectures : ses amitiés (1, client admin : sa liste n'est pas
 * lisible autrement), l'ELO de tous (1 par lot de 100), tes amitiés (1,
 * chez un autre) et les `n` profils montrés, choisis après le tri (1).
 * `toi` : celui qui regarde (null chez soi et en aperçu) ; `moi` : chez soi
 * (les n plus hauts ELO, sans cercle). `communs` : ses amis qui sont aussi
 * les tiens (tous, pas seulement ceux montrés) ; null sans toi.
 */
export async function lireCercle(o: {
  id: string;
  toi: string | null;
  sb: SupabaseClient;
  admin: SupabaseClient | null;
  n?: number;
  moi?: boolean;
}): Promise<{ amis: AmisDuBloc; communs: string[] | null } | null> {
  const sb = o.admin ?? o.sb;
  const n = o.n ?? 12;
  const toi = o.toi && o.toi !== o.id ? o.toi : null;
  try {
    const ids = await idsAmisDe(sb, o.id);
    if (!ids) return null;
    const [elos, tiens] = await Promise.all([elosDe(sb, [...ids, o.id, ...(toi ? [toi] : [])]), toi ? idsAmisDe(sb, toi) : Promise.resolve(null)]);
    const elo = (x: string) => elos.get(x) ?? DEFAULT_ELO;
    const { cercle, ordre } = cercleDe({ id: o.id, elo: elo(o.id) }, ids.map((x) => ({ id: x, elo: elo(x) })), toi ? { id: toi, elo: elo(toi) } : null);
    const choisis = choisirAmis(ordre, o.id, toi, n, !o.moi);
    const profils = await profilsDe(sb, choisis.map((c) => c.id));
    const mesAmis = tiens ? new Set(tiens) : null;
    const amis: AmiBloc[] = profils.map((p, i) => ({ ...p, elo: choisis[i].elo, ...(mesAmis ? { commun: mesAmis.has(p.id) } : {}) }));
    return {
      amis: { amis, total: ids.length, ...(o.moi ? {} : { cercle: { ...cercle, toiAmi: !!toi && ids.includes(toi) } }) },
      communs: mesAmis ? ids.filter((x) => mesAmis.has(x)) : null,
    };
  } catch {
    return null;
  }
}

// ── Les carnets : le sien (bloc Carnet) et les semaines comparées ────────

/** Le lundi de la semaine d'un jour (AAAA-MM-JJ). */
const lundiDe = (jour: string) => decaleJour(jour, -((new Date(jour + "T12:00:00Z").getUTCDay() + 6) % 7));

/**
 * Les semaines comparées de deux carnets (le ruban) : [lundi, ses
 * questions, les tiennes], de la plus ancienne à la plus récente ; `n`
 * semaines (52 : la grille du carnet), la dernière étant celle
 * d'aujourd'hui. Les jours hors des n semaines ou après aujourd'hui ne
 * comptent pas. Fonction pure, sans dépendance au serveur : elle peut
 * passer telle quelle dans un module neutre si un bloc client en a besoin.
 */
export function semaines(lui: readonly [string, number][], toi: readonly [string, number][], aujourdhui: string, n = 52): [string, number, number][] {
  const premier = decaleJour(lundiDe(aujourdhui), -7 * (n - 1));
  const t0 = Date.parse(premier + "T12:00:00Z");
  const out = Array.from({ length: n }, (_, i): [string, number, number] => [decaleJour(premier, 7 * i), 0, 0]);
  const ajoute = (jours: readonly [string, number][], col: 1 | 2) => {
    for (const [j, v] of jours) {
      if (j > aujourdhui || !(v > 0)) continue;
      const i = Math.floor((Date.parse(j + "T12:00:00Z") - t0) / (7 * 86_400_000));
      if (i >= 0 && i < n) out[i][col] += v;
    }
  };
  ajoute(lui, 1);
  ajoute(toi, 2);
  return out;
}

/** Son carnet de jours (bloc Carnet), d'après ses questions par jour avant aujourd'hui et ses stats (série, record, questions du jour, série d'encre). */
export function carnetDepuis(avant: { day: string; n: number }[], stats: ProfilStats, aujourdhui: string): ExtraitCarnet {
  return extraitCarnet({
    jours: parJourDe(avant, stats.duJour ?? 0, aujourdhui),
    aujourdhui,
    serie: stats.serie,
    record: stats.meilleureSerie,
    seuil: stats.serieEncre ? SEUIL_JOUR : null,
  });
}

/**
 * Son carnet de jours sans journalDe (ni rating_events, ni duels) :
 * joursAvant est déjà lu par statsProfil (en cache : 0 requête). À
 * n'appeler que si son Journal est ouvert à celui qui regarde.
 */
export async function lireCarnet(id: string, stats: ProfilStats, aujourdhui = jourParis()): Promise<ExtraitCarnet> {
  const avant = await joursAvant(id, aujourdhui).catch(() => [] as { day: string; n: number }[]);
  return carnetDepuis(avant, stats, aujourdhui);
}

