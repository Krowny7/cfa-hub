import type { SupabaseClient } from "@supabase/supabase-js";

// Les parties de Salle jouées avec un autre joueur : les RENCONTRES des
// Salles, pour « Ton plus grand rival » (components/classement/rival.ts) et
// le Face-à-face du profil (lib/profil/epreuves-communes.ts).
//
// Une rencontre, c'est une partie FINIE (statut 'terminee', ou fin_at passée :
// la base ne met l'état à jour que paresseusement) où les deux joueurs ont
// donné au moins une réponse. Le score de chacun : la somme de ses points ;
// départage par le nombre de bonnes réponses, puis par le temps cumulé sur les
// bonnes réponses (le plus court) : le classement de la partie
// (_salle_classement, migration_salles.sql ; classer, lib/salles/logique.ts).
// Égalité parfaite : nul. La date : fin_at. Une salle supprimée garde ses
// parties (salle_id vide, migration_salles_garder_parties.sql) : elles
// comptent, sans lien ni nom.
//
// Côté serveur seulement, avec le client admin : salle_reponses n'a pas de
// policy de lecture. Migration des Salles absente : aucune partie, sans
// erreur ; une autre lecture en échec : null (l'appelant décide).

/** Ce qu'un joueur a fait dans une partie, comme une ligne du classement de la Salle. */
export type ScoreSalle = {
  points: number;
  bonnes: number;
  /** temps cumulé sur les bonnes réponses (ms) */
  tempsMs: number;
  repondues: number;
};

/** Qui a fait mieux dans la partie, de ton point de vue. */
export type IssueSalle = "moi" | "lui" | "nul";

/** Une partie de Salle finie jouée par toi et par un autre joueur. */
export type PartieCommune = {
  sessionId: string;
  /** la salle ; null : supprimée depuis (la partie compte, sans lien) */
  salleId: string | null;
  /** le nom de la salle, s'il a été demandé et lu ; null sinon */
  nom: string | null;
  /** fin de la partie (ISO) : la date de la rencontre */
  fin: string;
  /** nombre de questions de la partie */
  nb: number;
  autre: string;
  moi: ScoreSalle;
  lui: ScoreSalle;
  issue: IssueSalle;
};

type LigneReponse = { session_id: string; user_id: string; points: number | null; juste: boolean | null; delai_ms: number | null };
type LignePartie = { id: string; salle_id: string | null; statut: string | null; fin_at: string | null; nb: number | null };
type Erreur = { code?: string; message?: string } | null | undefined;

const COLONNES = "session_id,user_id,points,juste,delai_ms";
/** Les lignes lues par page (le plafond d'une réponse de l'API). */
const PAGE = 1000;

/** La migration des Salles manque (table introuvable) : la source reste vide. */
class MigrationAbsente extends Error {}

const estAbsente = (e: Erreur) =>
  !!e && (["PGRST205", "42P01"].includes(e.code ?? "") || /could not find the table|relation .* does not exist|schema cache/i.test(e.message ?? ""));

/** Une erreur de lecture : migration absente (source vide) ou vraie panne (null). */
function echec(e: Erreur): Error {
  return estAbsente(e) ? new MigrationAbsente() : new Error(e?.message ?? "lecture des Salles impossible");
}

/**
 * Toutes les lignes d'une requête, par pages de 1000, dans un ordre stable (la
 * partie d'abord). Une erreur : exception. Plafond de pages atteint : la
 * dernière partie lue peut être coupée en plein milieu (une partie de mock
 * compte jusqu'à 600 questions par joueur) ; elle est écartée : une rencontre
 * en moins plutôt qu'un score faux.
 */
async function pages<T extends { session_id: string }>(page: (de: number, a: number) => PromiseLike<{ data: unknown; error: unknown }>, maxPages = 30): Promise<T[]> {
  const out: T[] = [];
  for (let p = 0; p < maxPages; p++) {
    const { data, error } = await page(p * PAGE, p * PAGE + PAGE - 1);
    if (error) throw echec(error as Erreur);
    if (!Array.isArray(data)) return out;
    out.push(...(data as T[]));
    if (data.length < PAGE) return out;
  }
  const coupee = out[out.length - 1]?.session_id;
  return out.filter((r) => r.session_id !== coupee);
}

/** Une liste découpée en lots (pour un `.in(...)` qui ne dépasse pas la longueur d'une adresse). */
function morceaux<T>(l: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < l.length; i += n) out.push(l.slice(i, i + n));
  return out;
}

/** La partie est finie : close, ou son heure de fin passée (comme lib/answer-stats.ts). */
export function partieFinie(p: Pick<LignePartie, "statut" | "fin_at">, maintenant: number): boolean {
  if (p.statut === "terminee") return true;
  const fin = p.fin_at ? new Date(p.fin_at).getTime() : NaN;
  return Number.isFinite(fin) && fin <= maintenant;
}

/** Le score de chacun dans chaque partie : clé `session|joueur`. */
export function scoresSalle(reponses: LigneReponse[]): Map<string, ScoreSalle> {
  const out = new Map<string, ScoreSalle>();
  for (const r of reponses) {
    const k = `${r.session_id}|${r.user_id}`;
    const s = out.get(k) ?? { points: 0, bonnes: 0, tempsMs: 0, repondues: 0 };
    s.points += Number(r.points) || 0;
    s.repondues += 1;
    if (r.juste) {
      s.bonnes += 1;
      s.tempsMs += Number(r.delai_ms) || 0;
    }
    out.set(k, s);
  }
  return out;
}

/** Plus de points, puis plus de bonnes réponses, puis le temps le plus court ; tout pareil : nul. */
export function issueSalle(moi: ScoreSalle, lui: ScoreSalle): IssueSalle {
  const d = lui.points - moi.points || lui.bonnes - moi.bonnes || moi.tempsMs - lui.tempsMs;
  return d === 0 ? "nul" : d < 0 ? "moi" : "lui";
}

/**
 * Les parties de Salle finies jouées par toi et par un autre joueur, de la plus
 * récente à la plus ancienne. [] : rien joué ensemble, ou migration absente ;
 * null : une lecture a échoué.
 * @param admin le client admin (salle_reponses n'a pas de policy de lecture)
 * @param opts.autre seulement les parties avec ce joueur (le Face-à-face) ; absent : avec tout le monde (le rival)
 * @param opts.noms lire aussi le nom des salles (sinon `nom` reste null)
 */
export async function lirePartiesCommunes(
  admin: SupabaseClient,
  moi: string,
  opts: { autre?: string; noms?: boolean; maintenant?: number } = {},
): Promise<PartieCommune[] | null> {
  const { autre, noms = false, maintenant = Date.now() } = opts;
  if (autre === moi) return [];
  try {
    const miennes = await pages<LigneReponse>((de, a) => admin.from("salle_reponses").select(COLONNES).eq("user_id", moi).order("session_id").order("position").range(de, a));
    const ids = [...new Set(miennes.map((r) => r.session_id))];
    if (ids.length === 0) return [];
    // les parties et les réponses des autres joueurs, lues en même temps
    const [parties, autres] = await Promise.all([
      Promise.all(
        morceaux(ids, 60).map(async (lot) => {
          const { data, error } = await admin.from("salle_sessions").select("id,salle_id,statut,fin_at,nb").in("id", lot);
          if (error) throw echec(error as Erreur);
          return (data ?? []) as LignePartie[];
        }),
      ),
      Promise.all(
        morceaux(ids, 25).map((lot) =>
          pages<LigneReponse>((de, a) => {
            const q = admin.from("salle_reponses").select(COLONNES).in("session_id", lot);
            return (autre ? q.eq("user_id", autre) : q.neq("user_id", moi)).order("session_id").order("user_id").order("position").range(de, a);
          }),
        ),
      ),
    ]);
    const finies = new Map(
      parties
        .flat()
        .filter((p) => partieFinie(p, maintenant))
        .map((p) => [p.id, p]),
    );
    if (finies.size === 0) return [];

    // le nom des salles : facultatif, une lecture en échec laisse les noms vides
    const nomDe = new Map<string, string>();
    const salleIds = [...new Set([...finies.values()].map((p) => p.salle_id).filter((x): x is string => !!x))];
    if (noms && salleIds.length) {
      const lus = await Promise.all(
        morceaux(salleIds, 60).map(async (lot) => {
          try {
            const { data, error } = await admin.from("salles").select("id,nom").in("id", lot);
            return error || !data ? [] : (data as Array<{ id: string; nom: string | null }>);
          } catch {
            return [];
          }
        }),
      );
      for (const s of lus.flat()) if (s.nom?.trim()) nomDe.set(s.id, s.nom.trim());
    }

    const miens = scoresSalle(miennes);
    const leurs = scoresSalle(autres.flat().filter((r) => r.user_id !== moi && finies.has(r.session_id)));
    const out: PartieCommune[] = [];
    for (const [cle, lui] of leurs) {
      const [sessionId, joueur] = cle.split("|");
      const p = finies.get(sessionId);
      const mien = miens.get(`${sessionId}|${moi}`);
      if (!p || !mien || mien.repondues === 0 || lui.repondues === 0) continue;
      out.push({
        sessionId,
        salleId: p.salle_id ?? null,
        nom: p.salle_id ? (nomDe.get(p.salle_id) ?? null) : null,
        fin: p.fin_at ?? "",
        nb: Number(p.nb) || 0,
        autre: joueur,
        moi: mien,
        lui,
        issue: issueSalle(mien, lui),
      });
    }
    out.sort((x, y) => (x.fin < y.fin ? 1 : x.fin > y.fin ? -1 : x.sessionId < y.sessionId ? -1 : 1));
    return out;
  } catch (e) {
    return e instanceof MigrationAbsente ? [] : null;
  }
}
