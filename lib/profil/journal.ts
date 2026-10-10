import type { SupabaseClient } from "@supabase/supabase-js";
import { getRatingHistory, type RatingEvent, type RatingSource } from "@/lib/rating";
import { DEFAULT_ELO, rankFor } from "@/lib/ranks";
import { joursAvant, jourParis } from "@/lib/objectif";
import { decaleJour } from "@/lib/objectif-calc";
import { displayName } from "@/components/classement/format";
import { SCEAUX, type SceauGarde } from "@/lib/profil/sceaux";
import type { ProfilStats } from "@/lib/profil/catalogue";

// Le Journal d'un joueur (onglet du profil, étape 2, sans migration) :
// - la courbe d'ELO sur 90 jours, depuis rating_events (lisible par tous) ;
// - le carnet de jours, depuis joursAvant (déjà lu par statsProfil : React
//   cache, aucune lecture de plus) et les questions du jour ;
// - un fil d'événements dérivé : victoires en duel (client admin, le
//   résultat seulement), nouveaux paliers (rating_events), séries de 7, 30
//   et 100 jours (le carnet), et, avec la base (migration_profil_sceaux.sql),
//   les sceaux gagnés à leur date (pas ceux repris après coup).
// Vie privée : tout est ramené au jour de Paris (AAAA-MM-JJ). Aucune heure ne
// quitte ce module. Module serveur.

/** la fenêtre de la courbe et du fil */
export const JOURS_JOURNAL = 90;
/** les séries notables du fil : les paliers du sceau Assiduité */
const SERIES_NOTABLES = SCEAUX.find((s) => s.cle === "assiduite")?.seuils ?? [7, 30, 100];

export type PointElo = {
  /** jour de Paris */
  jour: string;
  /** rang du match dans sa journée et nombre de matchs ce jour-là (pour les placer sans heure) */
  rang: number;
  surJour: number;
  apres: number;
  delta: number;
  source: RatingSource;
};

export type Courbe = {
  /** premier et dernier jour de la fenêtre */
  debut: string;
  fin: string;
  /** l'ELO au premier jour de la fenêtre */
  depart: number;
  points: PointElo[];
  /** matchs classés depuis toujours (0 : courbe vide) */
  matchs: number;
  /** le meilleur ELO atteint à l'issue d'un match, depuis toujours ; null s'il n'a jamais dépassé l'ELO de départ */
  pic: number | null;
};

export type EvenementJournal =
  | { type: "victoire"; cle: string; jour: string; adversaire: { id: string; nom: string } | null; score: [number, number] | null; delta: number | null }
  | { type: "palier"; cle: string; jour: string; palier: number }
  | { type: "serie"; cle: string; jour: string; jours: number }
  | { type: "sceau"; cle: string; jour: string; sceau: string; palier: number };

export type Journal = {
  aujourdhui: string;
  courbe: Courbe;
  /** questions par jour (Paris), aujourd'hui compris s'il y en a */
  jours: Map<string, number>;
  serie: number;
  record: number;
  /** du plus récent au plus ancien */
  evenements: EvenementJournal[];
};

type LigneDuel = {
  id: string;
  challenger_id: string;
  opponent_id: string | null;
  challenger_score: number | null;
  opponent_score: number | null;
  challenger_delta: number | null;
  opponent_delta: number | null;
  finished_at: string;
};

/** Les victoires en duel depuis `debut` (le résultat seulement), avec le nom de l'adversaire. */
async function victoires(sb: SupabaseClient, id: string, debutIso: string): Promise<{ duel: LigneDuel; nom: string | null }[]> {
  try {
    const { data, error } = await sb
      .from("duels")
      .select("id,challenger_id,opponent_id,challenger_score,opponent_score,challenger_delta,opponent_delta,finished_at")
      .eq("winner_id", id)
      .eq("status", "finished")
      .gte("finished_at", debutIso)
      .order("finished_at", { ascending: false })
      .limit(60);
    if (error || !data) return [];
    const lignes = data as LigneDuel[];
    const autres = [...new Set(lignes.map((d) => (d.challenger_id === id ? d.opponent_id : d.challenger_id)).filter((x): x is string => !!x))];
    const noms = new Map<string, string | null>();
    if (autres.length) {
      const { data: p } = await sb.from("profiles").select("id,username").in("id", autres);
      for (const r of (p ?? []) as { id: string; username: string | null }[]) noms.set(r.id, r.username);
    }
    return lignes.map((d) => {
      const autre = d.challenger_id === id ? d.opponent_id : d.challenger_id;
      return { duel: d, nom: autre ? displayName(noms.get(autre) ?? null, autre) : null };
    });
  } catch {
    return [];
  }
}

/**
 * Les matchs dans l'ordre où ils se sont enchaînés. Deux matchs réglés dans
 * la même transaction (un examen blanc classé compte deux matchs) ont la même
 * date : on les remet bout à bout, chacun partant de l'ELO où l'autre finit.
 */
function enChaine(historique: RatingEvent[]): RatingEvent[] {
  const out: RatingEvent[] = [];
  for (let i = 0; i < historique.length; ) {
    let j = i;
    while (j < historique.length && historique[j].createdAt === historique[i].createdAt) j++;
    const groupe = historique.slice(i, j);
    while (groupe.length) {
      const avant = out.length ? out[out.length - 1].eloAfter : null;
      // celui qui part de l'ELO précédent, sinon celui qu'aucun autre du groupe n'amène
      let k = avant !== null ? groupe.findIndex((e) => e.eloBefore === avant) : -1;
      if (k < 0) k = groupe.findIndex((e) => !groupe.some((f) => f !== e && f.eloAfter === e.eloBefore));
      out.push(...groupe.splice(Math.max(0, k), 1));
    }
    i = j;
  }
  return out;
}

/** La courbe : les matchs de la fenêtre, placés par jour, et le pic de toujours. */
function courbeDe(historique: RatingEvent[], debut: string, fin: string): Courbe {
  const dans = historique.filter((e) => jourParis(new Date(e.createdAt)) >= debut);
  const avant = historique.length - dans.length;
  const depart = dans.length ? dans[0].eloBefore : avant ? historique[avant - 1].eloAfter : DEFAULT_ELO;
  const parJour = new Map<string, number>();
  const jours = dans.map((e) => jourParis(new Date(e.createdAt)));
  for (const j of jours) parJour.set(j, (parJour.get(j) ?? 0) + 1);
  const vus = new Map<string, number>();
  const points = dans.map((e, i): PointElo => {
    const j = jours[i];
    const rang = vus.get(j) ?? 0;
    vus.set(j, rang + 1);
    return { jour: j, rang, surJour: parJour.get(j) ?? 1, apres: e.eloAfter, delta: e.delta, source: e.source };
  });
  // comme statsProfil : l'ELO de départ n'est pas un pic, seul un match le fait
  const meilleur = historique.reduce((m, e) => Math.max(m, e.eloAfter), -Infinity);
  const pic = historique.length && meilleur > historique[0].eloBefore ? meilleur : null;
  return { debut, fin, depart, points, matchs: historique.length, pic };
}

/** Les nouveaux paliers (jamais atteints avant), dans la fenêtre ; la maîtrise d'aujourd'hui garde les verrous, comme le pic. */
function paliers(historique: RatingEvent[], debut: string, mastery: number | null): EvenementJournal[] {
  if (!historique.length) return [];
  const out: EvenementJournal[] = [];
  let meilleur = rankFor(historique[0].eloBefore, mastery).tierIndex;
  for (const e of historique) {
    const t = rankFor(e.eloAfter, mastery).tierIndex;
    if (t <= meilleur) continue;
    meilleur = t;
    const jour = jourParis(new Date(e.createdAt));
    if (jour >= debut) out.push({ type: "palier", cle: `palier-${e.id}`, jour, palier: t });
  }
  return out.reverse(); // le plus récent d'abord
}

/** Les séries qui atteignent 7, 30 ou 100 jours, dans la fenêtre. */
function seriesNotables(actifs: string[], debut: string): EvenementJournal[] {
  const set = new Set(actifs);
  const out: EvenementJournal[] = [];
  for (const d of actifs) {
    if (set.has(decaleJour(d, -1))) continue; // pas un début de série
    let n = 1;
    let jour = d;
    for (;;) {
      if (SERIES_NOTABLES.includes(n) && jour >= debut) out.push({ type: "serie", cle: `serie-${jour}`, jour, jours: n });
      const suivant = decaleJour(jour, 1);
      if (!set.has(suivant)) break;
      jour = suivant;
      n++;
    }
  }
  return out;
}

/** Les sceaux gagnés dans la fenêtre : le plus haut palier de chaque jour ; jamais une date rétroactive. */
function sceauxGagnes(gardes: SceauGarde[], debut: string): EvenementJournal[] {
  const out = new Map<string, EvenementJournal>();
  for (const g of gardes) {
    g.dates.forEach((iso, i) => {
      if (g.retro && iso === g.dates[0]) return;
      const jour = jourParis(new Date(iso));
      if (jour < debut) return;
      out.set(`${g.cle}|${jour}`, { type: "sceau", cle: `sceau-${g.cle}-${i + 1}`, jour, sceau: g.cle, palier: i + 1 });
    });
  }
  return [...out.values()].sort((a, b) => (a.jour < b.jour ? 1 : a.jour > b.jour ? -1 : 0));
}

const ORDRE: Record<EvenementJournal["type"], number> = { palier: 0, sceau: 1, victoire: 2, serie: 3 };

/**
 * Le Journal du joueur `id`. `sb` : le client de celui qui regarde (la
 * courbe) ; `admin` : le client admin s'il existe (les victoires : un
 * joueur ne lit que ses propres duels), sinon `sb`. `stats` : celles de
 * l'en-tête (statsProfil), `mastery` : la maîtrise du rang affiché ;
 * `gardes` : ses sceaux gardés en base (null sans la migration).
 */
export async function journalDe({
  id,
  sb,
  admin,
  stats,
  mastery,
  gardes = null,
}: {
  id: string;
  sb: SupabaseClient;
  admin: SupabaseClient | null;
  stats: ProfilStats;
  mastery: number | null;
  gardes?: SceauGarde[] | null;
}): Promise<Journal> {
  const aujourdhui = jourParis();
  const debut = decaleJour(aujourdhui, -(JOURS_JOURNAL - 1));
  // la veille du premier jour, à midi : une marge large, le filtre par jour de Paris fait le reste
  const debutIso = new Date(Date.parse(decaleJour(debut, -1) + "T12:00:00Z")).toISOString();
  const [lus, avant, gagnes] = await Promise.all([
    getRatingHistory(sb, id, 1000),
    joursAvant(id, aujourdhui).catch(() => [] as { day: string; n: number }[]),
    victoires(admin ?? sb, id, debutIso),
  ]);
  const historique = enChaine(lus);

  const jours = new Map(avant.filter((j) => j.n > 0).map((j) => [j.day, j.n]));
  if ((stats.duJour ?? 0) > 0) jours.set(aujourdhui, stats.duJour as number);
  const actifs = [...jours.keys()].sort();

  const evenements: EvenementJournal[] = [
    ...gagnes
      .map(({ duel: d, nom }): EvenementJournal => {
        const mien = d.challenger_id === id;
        const a = mien ? d.challenger_score : d.opponent_score;
        const b = mien ? d.opponent_score : d.challenger_score;
        const autre = mien ? d.opponent_id : d.challenger_id;
        return {
          type: "victoire",
          cle: `duel-${d.id}`,
          jour: jourParis(new Date(d.finished_at)),
          adversaire: autre && nom ? { id: autre, nom } : null,
          score: a !== null && b !== null ? [a, b] : null,
          delta: mien ? d.challenger_delta : d.opponent_delta,
        };
      })
      .filter((e) => e.jour >= debut),
    ...paliers(historique, debut, mastery),
    ...seriesNotables(actifs, debut),
    ...sceauxGagnes(gardes ?? [], debut),
  ];
  // du plus récent au plus ancien ; le même jour : les paliers, les sceaux, les victoires, la série (chacun déjà du plus récent au plus ancien)
  const index = new Map(evenements.map((e, i) => [e.cle, i]));
  evenements.sort((x, y) => (x.jour === y.jour ? ORDRE[x.type] - ORDRE[y.type] || (index.get(x.cle) ?? 0) - (index.get(y.cle) ?? 0) : x.jour < y.jour ? 1 : -1));

  return {
    aujourdhui,
    courbe: courbeDe(historique, debut, aujourdhui),
    jours,
    serie: stats.serie,
    record: stats.meilleureSerie,
    evenements,
  };
}
