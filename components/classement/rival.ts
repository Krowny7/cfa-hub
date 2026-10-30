// « Ton plus grand rival » : le joueur que tu as le plus croisé, toutes
// épreuves confondues. Côté serveur uniquement, avec le client admin (les
// copies des autres joueurs ne sont lisibles que par lui) : ne jamais importer
// ce module depuis un composant client. Tout dégrade proprement : pas de clé
// admin, table absente, rien de joué ensemble → null (la carte ne s'affiche
// pas), jamais d'exception.
//
// Une RENCONTRE, c'est deux joueurs qui ont rendu leur copie sur la même
// épreuve :
//   • un duel terminé entre eux (table duels, status = 'finished') : gagne
//     celui du winner_id (meilleur score, puis plus rapide) ; pas de gagnant =
//     égalité ;
//   • un des 30 du jour, ou un des 5 du jour, rendu le même jour par les deux
//     (daily_attempts d'un même défi ; le programme du défi, « cfa-l1 » ou
//     « cfa-l1-cinq », dit lequel) : gagne le meilleur score, puis le plus
//     rapide (comme le classement du jour) ; même score à la même seconde =
//     égalité ;
//   • un examen blanc classé passé par les deux (mock_exam_results, premier
//     essai officiel), une fois l'examen terminé (clos, ou fenêtre ±window_days
//     dépassée : on ne révèle pas un score avant) : gagne le meilleur
//     pourcentage, égalité sinon (comme apply_mock_exam_elo).
// « Qui a fait mieux » compte les victoires de chacun ; les égalités sont des
// rencontres mais ne comptent ni pour toi ni pour lui. Le rival est celui qui a
// le plus de rencontres ; à égalité, celui qu'on a croisé le plus récemment.
// Aucune migration : tout est lu dans les tables existantes.
import type { SupabaseClient } from "@supabase/supabase-js";
import { masteryByUser } from "@/components/classement/data";
import { displayName } from "@/components/classement/format";
import { lireTout, morceaux } from "@/components/classement/lecture";
import type { BilanEpreuve, EpreuveRival, RivalData } from "@/components/classement/types";
import { levelInfoFromXp } from "@/lib/leveling";
import { lireStyle } from "@/lib/profil/donnees";
import { DEFAULT_ELO } from "@/lib/ranks";
import { getLeaderboardRank } from "@/lib/rating";

/** L'ordre des épreuves sur la carte. */
export const EPREUVES_RIVAL: EpreuveRival[] = ["duel", "trente", "cinq", "examen"];

/** Les programmes des défis du jour (migration_cinq_du_jour.sql). */
const PROGRAMME: Record<string, EpreuveRival> = { "cfa-l1": "trente", "cfa-l1-cinq": "cinq" };

/** Une rencontre avec un autre joueur : l'épreuve, qui a fait mieux, et quand (ISO). */
export type Rencontre = { epreuve: EpreuveRival; autre: string; issue: "moi" | "lui" | "nul"; quand: string };

/** Le bilan face à un joueur, toutes épreuves confondues. */
export type BilanRival = {
  autre: string;
  rencontres: number;
  moi: number;
  lui: number;
  nuls: number;
  /** la plus récente des rencontres (ISO) */
  derniere: string;
  epreuves: BilanEpreuve[];
};

/**
 * Le rival parmi toutes les rencontres : le joueur avec le plus de rencontres ;
 * à égalité, la rencontre la plus récente ; à égalité encore, l'identifiant
 * (ordre stable). null s'il n'y a aucune rencontre. Fonction pure.
 */
export function choisirRival(rencontres: Rencontre[]): BilanRival | null {
  const par = new Map<string, Rencontre[]>();
  for (const r of rencontres) {
    if (!r.autre) continue;
    const l = par.get(r.autre);
    if (l) l.push(r);
    else par.set(r.autre, [r]);
  }
  let meilleur: BilanRival | null = null;
  for (const [autre, l] of par) {
    const derniere = l.reduce((m, r) => (r.quand > m ? r.quand : m), "");
    const b: BilanRival = {
      autre,
      rencontres: l.length,
      moi: l.filter((r) => r.issue === "moi").length,
      lui: l.filter((r) => r.issue === "lui").length,
      nuls: l.filter((r) => r.issue === "nul").length,
      derniere,
      epreuves: EPREUVES_RIVAL.map((epreuve) => {
        const e = l.filter((r) => r.epreuve === epreuve);
        return { epreuve, rencontres: e.length, moi: e.filter((r) => r.issue === "moi").length, lui: e.filter((r) => r.issue === "lui").length, nuls: e.filter((r) => r.issue === "nul").length };
      }).filter((e) => e.rencontres > 0),
    };
    if (!meilleur || b.rencontres > meilleur.rencontres || (b.rencontres === meilleur.rencontres && (b.derniere > meilleur.derniere || (b.derniere === meilleur.derniere && b.autre < meilleur.autre)))) meilleur = b;
  }
  return meilleur;
}

// ——— lectures (client admin) ———

/** Les duels terminés entre toi et un autre joueur. */
async function duelsRencontres(admin: SupabaseClient, moi: string): Promise<Rencontre[]> {
  const lignes = await lireTout<{ challenger_id: string; opponent_id: string | null; winner_id: string | null; finished_at: string | null; created_at: string }>((de, a) =>
    admin.from("duels").select("id,challenger_id,opponent_id,winner_id,finished_at,created_at").eq("status", "finished").or(`challenger_id.eq.${moi},opponent_id.eq.${moi}`).order("id").range(de, a),
  );
  const out: Rencontre[] = [];
  for (const d of lignes) {
    const autre = d.challenger_id === moi ? d.opponent_id : d.challenger_id;
    if (!autre || autre === moi) continue;
    out.push({ epreuve: "duel", autre, issue: d.winner_id === moi ? "moi" : d.winner_id === autre ? "lui" : "nul", quand: d.finished_at ?? d.created_at });
  }
  return out;
}

type Copie = { challenge_id: string; user_id: string; score: number | null; seconds: number | null; finished_at: string | null };

/** Meilleur score, puis plus rapide ; même score à la même seconde (ou temps inconnu) : égalité. */
function issueDefi(mien: Copie, autre: Copie): Rencontre["issue"] {
  const a = mien.score ?? 0;
  const b = autre.score ?? 0;
  if (a !== b) return a > b ? "moi" : "lui";
  if (mien.seconds === null || autre.seconds === null || mien.seconds === autre.seconds) return "nul";
  return mien.seconds < autre.seconds ? "moi" : "lui";
}

/** Les 30 du jour et les 5 du jour rendus le même jour par toi et par un autre joueur. */
async function defisRencontres(admin: SupabaseClient, moi: string): Promise<Rencontre[]> {
  const miennes = await lireTout<Copie>((de, a) =>
    admin.from("daily_attempts").select("challenge_id,user_id,score,seconds,finished_at").eq("user_id", moi).not("finished_at", "is", null).not("score", "is", null).order("challenge_id").range(de, a),
  );
  if (miennes.length === 0) return [];
  const ids = miennes.map((c) => c.challenge_id);
  const [programmes, autres] = await Promise.all([
    Promise.all(
      morceaux(ids, 60).map(async (lot) => {
        const { data, error } = await admin.from("daily_challenges").select("id,program").in("id", lot);
        return error || !data ? [] : (data as Array<{ id: string; program: string }>);
      }),
    ),
    Promise.all(
      morceaux(ids, 25).map((lot) =>
        lireTout<Copie>((de, a) =>
          admin.from("daily_attempts").select("challenge_id,user_id,score,seconds,finished_at").in("challenge_id", lot).neq("user_id", moi).not("finished_at", "is", null).not("score", "is", null).order("challenge_id").order("user_id").range(de, a),
        ),
      ),
    ),
  ]);
  const epreuveDe = new Map(programmes.flat().map((p) => [p.id, PROGRAMME[p.program]]));
  const miennesPar = new Map(miennes.map((c) => [c.challenge_id, c]));
  const out: Rencontre[] = [];
  for (const c of autres.flat()) {
    const epreuve = epreuveDe.get(c.challenge_id);
    const mien = miennesPar.get(c.challenge_id);
    if (!epreuve || !mien) continue;
    out.push({ epreuve, autre: c.user_id, issue: issueDefi(mien, c), quand: mien.finished_at ?? c.finished_at ?? "" });
  }
  return out;
}

type ExamenLu = { id: string; status: string; scheduled_at: string; window_days?: number | null };
type Resultat = { exam_id: string; user_id: string; score: number | null; total: number | null; completed_at: string | null };

/** Les examens terminés parmi ceux que tu as passés : clos, ou fenêtre de passage dépassée (3 jours par défaut, comme data.ts). */
async function examensTermines(admin: SupabaseClient, ids: string[]): Promise<Set<string>> {
  const lus: ExamenLu[] = [];
  for (const lot of morceaux(ids, 60)) {
    const avec = await admin.from("mock_exams").select("id,status,scheduled_at,window_days").in("id", lot);
    if (!avec.error && avec.data) {
      lus.push(...(avec.data as unknown as ExamenLu[]));
      continue;
    }
    // colonne window_days absente (ancienne base)
    const sans = await admin.from("mock_exams").select("id,status,scheduled_at").in("id", lot);
    if (!sans.error && sans.data) lus.push(...(sans.data as unknown as ExamenLu[]));
  }
  const now = Date.now();
  return new Set(lus.filter((e) => e.status === "closed" || new Date(e.scheduled_at).getTime() + (e.window_days ?? 3) * 86_400_000 < now).map((e) => e.id));
}

/** Les examens blancs terminés passés par toi et par un autre joueur : le meilleur pourcentage gagne. */
async function examensRencontres(admin: SupabaseClient, moi: string): Promise<Rencontre[]> {
  const miens = await lireTout<Resultat>((de, a) => admin.from("mock_exam_results").select("exam_id,user_id,score,total,completed_at").eq("user_id", moi).order("exam_id").range(de, a));
  if (miens.length === 0) return [];
  const termines = await examensTermines(
    admin,
    miens.map((r) => r.exam_id),
  );
  const miensPar = new Map(miens.filter((r) => termines.has(r.exam_id)).map((r) => [r.exam_id, r]));
  if (miensPar.size === 0) return [];
  const autres = await Promise.all(
    morceaux([...miensPar.keys()], 25).map((lot) =>
      lireTout<Resultat>((de, a) => admin.from("mock_exam_results").select("exam_id,user_id,score,total,completed_at").in("exam_id", lot).neq("user_id", moi).order("exam_id").order("user_id").range(de, a)),
    ),
  );
  const pct = (r: Resultat) => ((r.total ?? 0) > 0 ? (r.score ?? 0) / (r.total as number) : 0);
  const out: Rencontre[] = [];
  for (const r of autres.flat()) {
    const mien = miensPar.get(r.exam_id);
    if (!mien) continue;
    const ecart = pct(mien) - pct(r);
    out.push({ epreuve: "examen", autre: r.user_id, issue: Math.abs(ecart) < 1e-9 ? "nul" : ecart > 0 ? "moi" : "lui", quand: r.completed_at ?? mien.completed_at ?? "" });
  }
  return out;
}

/** Une source qui échoue (table absente, réseau) ne compte pas : jamais d'exception. */
const sansErreur = async (lecture: Promise<Rencontre[]>): Promise<Rencontre[]> => {
  try {
    return await lecture;
  } catch {
    return [];
  }
};

/**
 * Ton plus grand rival et le bilan face à lui, ou null (pas de clé admin, rien
 * de joué ensemble, lecture impossible).
 * @param sb la session du joueur (profil, ELO, style du rival)
 * @param admin le client admin (tryAdmin) : sans lui, null
 */
export async function lireRival(sb: SupabaseClient, admin: SupabaseClient | null, moi: string): Promise<RivalData | null> {
  if (!admin) return null;
  try {
    const [duels, defis, examens] = await Promise.all([sansErreur(duelsRencontres(admin, moi)), sansErreur(defisRencontres(admin, moi)), sansErreur(examensRencontres(admin, moi))]);
    const bilan = choisirRival([...duels, ...defis, ...examens]);
    if (!bilan) return null;
    const id = bilan.autre;
    const [{ data: profil }, { data: rating }, { style }, place, maitrises] = await Promise.all([
      sb.from("profiles").select("username,avatar_url,xp_total").eq("id", id).maybeSingle(),
      sb.from("ratings").select("elo,games_played").eq("user_id", id).maybeSingle(),
      lireStyle(sb, id),
      getLeaderboardRank(sb, id),
      masteryByUser(admin, [id]),
    ]);
    const p = profil as { username: string | null; avatar_url: string | null; xp_total: number | null } | null;
    const r = rating as { elo?: number; games_played?: number } | null;
    return {
      userId: id,
      name: displayName(p?.username, id),
      avatarUrl: p?.avatar_url ?? null,
      elo: r?.elo ?? DEFAULT_ELO,
      gamesPlayed: r?.games_played ?? 0,
      rank: place,
      mastery: maitrises.get(id) ?? null,
      niveau: levelInfoFromXp(Number(p?.xp_total ?? 0) || 0).level,
      style: { banner: style.banner, bannerUrl: style.bannerUrl, bannerPos: style.bannerPos, accent: style.accent, frame: style.frame, perso: style.perso, persoTaille: style.persoTaille, persoPos: style.persoPos, ornement: style.ornement },
      rencontres: bilan.rencontres,
      moi: bilan.moi,
      lui: bilan.lui,
      epreuves: bilan.epreuves,
    };
  } catch {
    return null;
  }
}

