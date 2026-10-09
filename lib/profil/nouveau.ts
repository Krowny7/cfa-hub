import type { SupabaseClient } from "@supabase/supabase-js";
import { masteryByUser } from "@/components/classement/data";
import { displayName } from "@/components/classement/format";
import { jourParis } from "@/lib/objectif";
import { decaleJour } from "@/lib/objectif-calc";
import { rankFor } from "@/lib/ranks";

// « Du nouveau » sur l'accueil : ce qui s'est passé chez mes amis sur 7
// jours, chacun avec un lien vers son profil :
// - il monte en palier (un palier jamais atteint avant, comme le Journal) ;
// - il m'a battu en duel ;
// - il m'a dépassé (son ELO a franchi le mien par l'un de ses matchs, et il
//   est toujours devant).
// Sans migration : friendships (mes amitiés), rating_events (lisible par
// tous) et duels (je lis les miens). La maîtrise des amis (client admin, s'il
// existe) garde les verrous de palier. Des jours (Paris), jamais d'heures.
// On ne lit que les matchs de la fenêtre (les plus récents d'abord), plus,
// pour chaque ami qui a joué, son meilleur ELO d'avant : la référence du
// « jamais atteint avant ». Module serveur.

export const JOURS_NOUVEAU = 7;
/** au plus, sur l'accueil */
const MAX = 5;

export type Joueur = { id: string; nom: string; avatarUrl: string | null };

export type Nouveaute =
  | { type: "palier"; cle: string; jour: string; joueur: Joueur; palier: number }
  | { type: "victoire"; cle: string; jour: string; joueur: Joueur; duel: string; score: [number, number] | null }
  | { type: "depasse"; cle: string; jour: string; joueur: Joueur; ecart: number };

type Evenement = { id: string; user_id: string; elo_before: number; elo_after: number; created_at: string };
type LigneDuel = { id: string; challenger_id: string; opponent_id: string | null; winner_id: string | null; challenger_score: number | null; opponent_score: number | null; finished_at: string };

/**
 * Les nouveaux paliers de ce joueur (jamais atteints avant) depuis `debut`.
 * `evts` : ses matchs de la fenêtre ; `avant` : son meilleur ELO d'avant
 * (null s'il n'a joué qu'à partir de la fenêtre).
 */
function paliers(evts: Evenement[], avant: number | null, mastery: number | null, debut: string): { jour: string; palier: number; id: string }[] {
  if (!evts.length) return [];
  const out: { jour: string; palier: number; id: string }[] = [];
  let meilleur = rankFor(Math.max(evts[0].elo_before, avant ?? evts[0].elo_before), mastery).tierIndex;
  for (const e of evts) {
    const t = rankFor(e.elo_after, mastery).tierIndex;
    if (t <= meilleur) continue;
    meilleur = t;
    const jour = jourParis(new Date(e.created_at));
    if (jour >= debut) out.push({ jour, palier: t, id: e.id });
  }
  return out;
}

/**
 * L'ami m'a-t-il dépassé depuis `debut` ? On rejoue nos deux historiques
 * de la fenêtre dans l'ordre : le dernier de SES matchs qui le fait passer
 * devant moi, s'il est encore devant aujourd'hui. Son ELO de départ : l'ELO
 * d'avant son premier match de la fenêtre ; le mien : pareil, ou `monElo`
 * (mon ELO actuel) si je n'ai pas joué dans la fenêtre.
 */
function depassement(lui: Evenement[], moi: Evenement[], monElo: number | null, debut: string): { jour: string; ecart: number; id: string } | null {
  if (!lui.length) return null;
  const tous = [...lui.map((e) => ({ e, lui: true })), ...moi.map((e) => ({ e, lui: false }))].sort((a, b) => (a.e.created_at < b.e.created_at ? -1 : a.e.created_at > b.e.created_at ? 1 : 0));
  let eloLui = lui[0].elo_before;
  let eloMoi = moi.length ? moi[0].elo_before : monElo;
  let passe: { jour: string; id: string } | null = null;
  for (const { e, lui: sien } of tous) {
    const devantAvant = eloMoi !== null && eloLui > eloMoi;
    if (sien) eloLui = e.elo_after;
    else eloMoi = e.elo_after;
    const devant = eloMoi !== null && eloLui > eloMoi;
    if (!devant) passe = null;
    else if (!devantAvant && sien) {
      const jour = jourParis(new Date(e.created_at));
      passe = jour >= debut ? { jour, id: e.id } : null;
    }
  }
  return passe && eloMoi !== null ? { ...passe, ecart: eloLui - eloMoi } : null;
}

const ORDRE: Record<Nouveaute["type"], number> = { victoire: 0, depasse: 1, palier: 2 };

/** Les nouvelles de mes amis (5 au plus, les plus récentes d'abord) ; null si les amis ne se lisent pas. */
export async function nouveautesAmis(sb: SupabaseClient, admin: SupabaseClient | null, moi: string): Promise<Nouveaute[] | null> {
  try {
    const { data: liens, error } = await sb.from("friendships").select("requester,addressee").eq("status", "accepted").or(`requester.eq.${moi},addressee.eq.${moi}`).limit(200);
    if (error) return null;
    const amis = ((liens ?? []) as { requester: string; addressee: string }[]).map((r) => (r.requester === moi ? r.addressee : r.requester));
    if (!amis.length) return [];

    const aujourdhui = jourParis();
    const debut = decaleJour(aujourdhui, -(JOURS_NOUVEAU - 1));
    // la veille du premier jour, à midi : une marge large, le filtre par jour de Paris fait le reste
    const debutIso = new Date(Date.parse(decaleJour(debut, -1) + "T12:00:00Z")).toISOString();

    const [evtsLus, duelsLus, profils, maitrises, monRating] = await Promise.all([
      sb.from("rating_events").select("id,user_id,elo_before,elo_after,created_at").in("user_id", [...amis, moi]).gte("created_at", debutIso).order("created_at", { ascending: false }).limit(1000),
      sb
        .from("duels")
        .select("id,challenger_id,opponent_id,winner_id,challenger_score,opponent_score,finished_at")
        .eq("status", "finished")
        .or(`challenger_id.eq.${moi},opponent_id.eq.${moi}`)
        .in("winner_id", amis)
        .gte("finished_at", debutIso)
        .order("finished_at", { ascending: false })
        .limit(20),
      sb.from("profiles").select("id,username,avatar_url").in("id", amis),
      masteryByUser(admin, amis),
      sb.from("ratings").select("elo").eq("user_id", moi).maybeSingle(),
    ]);

    const joueurs = new Map<string, Joueur>(
      ((profils.data ?? []) as { id: string; username: string | null; avatar_url: string | null }[]).map((p) => [p.id, { id: p.id, nom: displayName(p.username, p.id), avatarUrl: p.avatar_url }]),
    );
    const parJoueur = new Map<string, Evenement[]>();
    for (const e of ((evtsLus.data ?? []) as Evenement[]).reverse()) {
      const liste = parJoueur.get(e.user_id);
      if (liste) liste.push(e);
      else parJoueur.set(e.user_id, [e]);
    }
    const miens = parJoueur.get(moi) ?? [];
    const monElo = (monRating.data as { elo: number } | null)?.elo ?? null;

    // le meilleur ELO d'avant la fenêtre, pour les amis qui y ont joué : le
    // plus haut des ELO d'avant et d'après leurs matchs d'avant (l'ELO de
    // départ compris)
    const actifs = amis.filter((id) => parJoueur.has(id) && joueurs.has(id));
    const plusHaut = (id: string, col: "elo_before" | "elo_after") =>
      sb.from("rating_events").select(col).eq("user_id", id).lt("created_at", debutIso).order(col, { ascending: false }).limit(1).maybeSingle();
    const avants = await Promise.all(
      actifs.map(async (id) => {
        const [b, a] = await Promise.all([plusHaut(id, "elo_before"), plusHaut(id, "elo_after")]);
        const vals = [(b.data as { elo_before: number } | null)?.elo_before, (a.data as { elo_after: number } | null)?.elo_after].filter((v): v is number => typeof v === "number");
        return [id, vals.length ? Math.max(...vals) : null] as const;
      }),
    );
    const meilleurAvant = new Map(avants);

    const out: Nouveaute[] = [];
    for (const id of actifs) {
      const joueur = joueurs.get(id);
      const siens = parJoueur.get(id);
      if (!joueur || !siens) continue;
      for (const p of paliers(siens, meilleurAvant.get(id) ?? null, maitrises.get(id) ?? null, debut)) out.push({ type: "palier", cle: `palier-${p.id}`, jour: p.jour, joueur, palier: p.palier });
      const d = depassement(siens, miens, monElo, debut);
      if (d) out.push({ type: "depasse", cle: `depasse-${d.id}`, jour: d.jour, joueur, ecart: d.ecart });
    }
    for (const d of (duelsLus.data ?? []) as LigneDuel[]) {
      const joueur = d.winner_id ? joueurs.get(d.winner_id) : undefined;
      const jour = jourParis(new Date(d.finished_at));
      if (!joueur || jour < debut) continue;
      const sienChallenger = d.challenger_id === joueur.id;
      const a = sienChallenger ? d.challenger_score : d.opponent_score;
      const b = sienChallenger ? d.opponent_score : d.challenger_score;
      out.push({ type: "victoire", cle: `duel-${d.id}`, jour, joueur, duel: d.id, score: a !== null && b !== null ? [a, b] : null });
    }
    // du plus récent au plus ancien ; le même jour : ses victoires sur moi, puis les dépassements, puis les paliers
    return out.sort((x, y) => (x.jour === y.jour ? ORDRE[x.type] - ORDRE[y.type] : x.jour < y.jour ? 1 : -1)).slice(0, MAX);
  } catch {
    return null;
  }
}
