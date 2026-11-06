import type { SupabaseClient } from "@supabase/supabase-js";
import { salleFinie } from "@/lib/answer-stats";
import type { DailyReviewItem } from "@/lib/daily";
import { revueSalle } from "@/lib/salles/examen";
import type { SalleCorrection, SalleItem, SalleMaReponse } from "@/lib/salles/types";
import { PARTIE, RUNNER_SALLE } from "@/lib/voice-salles";

// Ta copie d'une partie de Salle passée, pour la relire après coup (/salles/copie/<id>).
// Lecture côté serveur avec le client admin (salle_items et salle_reponses n'ont pas de
// policy), toujours filtrée sur le joueur connecté : il ne voit que sa copie, d'une partie
// qu'il a jouée et qui est finie (les bonnes réponses restent cachées avant). QCM seulement.

export type CopieSalle = { revue: DailyReviewItem[]; numero: number; titre: string; kicker?: string };

type LigneSession = { id: string; salle_id: string | null; numero: number; statut: string; fin_at: string | null; params: { examens?: string[]; round?: number; rounds?: number } | null };
type LigneItem = Omit<SalleItem, "choix" | "donnees"> & { question_id: string | null; choix: string[] | null; bonne_index: number | null; explication: string | null };
type LigneReponse = { position: number; choix: number | null; valeur: number | null; juste: boolean; points: number; delai_ms: number };

export async function lireCopieSalle(admin: SupabaseClient, sessionId: string, userId: string, now: number): Promise<CopieSalle | null> {
  const [session, items, reponses] = await Promise.all([
    admin.from("salle_sessions").select("id,salle_id,numero,statut,fin_at,params").eq("id", sessionId).maybeSingle(),
    admin.from("salle_items").select("question_id,position,origine,topic,difficulte,libelle,enonce,choix,unite,decimales,bonne_index,explication").eq("session_id", sessionId).order("position"),
    admin.from("salle_reponses").select("position,choix,valeur,juste,points,delai_ms").eq("session_id", sessionId).eq("user_id", userId),
  ]);
  const s = session.data as LigneSession | null;
  const lignes = (reponses.data ?? []) as LigneReponse[];
  if (!s || !lignes.length || !salleFinie(s, now)) return null;

  const qcm = ((items.data ?? []) as LigneItem[]).filter((i) => i.origine === "question" && Array.isArray(i.choix));
  const corrections: SalleCorrection[] = qcm.map((i) => ({ position: i.position, questionId: i.question_id, bonneIndex: i.bonne_index, bonneValeur: null, explication: i.explication, etapes: [] }));
  const mes: SalleMaReponse[] = lignes.map((r) => ({ position: r.position, choix: r.choix, valeur: r.valeur, juste: r.juste, points: r.points, delaiMs: r.delai_ms }));
  const revue = revueSalle(
    qcm.map((i) => ({ ...i, donnees: null })),
    corrections,
    mes,
  );
  if (!revue?.length) return null;
  const round = s.params?.round;
  const rounds = s.params?.rounds;
  return { revue, numero: s.numero, titre: s.params?.examens?.join(" + ") || (round && rounds ? PARTIE.roundTitre(round, rounds) : RUNNER_SALLE.copieTitre), kicker: round && rounds ? PARTIE.revueRound(round, rounds) : undefined };
}
