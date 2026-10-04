import { createClient } from "@/lib/supabase/server";
import { getLeaderboardRank, getMyRating, getRatingEventFor } from "@/lib/rating";
import { getTopicMastery, programMastery } from "@/lib/mastery";
import { CURRENT_DOMAIN } from "@/lib/domains";
import { countPlayers } from "@/components/classement/data";
import { CeremonieRang } from "@/components/classement/CeremonieRang";
import { momentDeRang } from "@/components/classement/rang-moment";

// La cérémonie de rang d'un examen blanc classé, prête à poser sur la page du
// résultat (app/mock-exams/[id]) : composant serveur, il lit lui-même le
// mouvement d'ELO de l'examen (rating_events), la maîtrise, la place et le
// nombre de joueurs, décide du moment (rang-moment.ts, module neutre), puis
// rend CeremonieRang. Rien si l'ELO de l'examen n'est pas encore appliqué,
// si ce n'est plus le dernier mouvement d'ELO, si le résultat date de plus
// de 7 jours, ou si le rang n'a pas bougé. Une seule fois par examen (clé
// « examen:<id> », mémoire locale du navigateur).
//
//   {myResult && <CeremonieExamen examId={exam.id} userId={user.id} />}
//
// Sans lecture lourde tant qu'il n'y a pas de mouvement : la maîtrise n'est
// lue que si l'examen a bien bougé l'ELO.

const RECENT_MS = 7 * 86_400_000;

export async function CeremonieExamen({ examId, userId, className = "" }: { examId: string; userId: string; className?: string }) {
  try {
    const supabase = await createClient();
    const ev = await getRatingEventFor(supabase, userId, "mock_exam", examId);
    if (!ev || !ev.latest || ev.delta === 0) return null;
    if (Date.now() - Date.parse(ev.createdAt) > RECENT_MS) return null;
    const [rating, topics, place, joueurs] = await Promise.all([
      getMyRating(supabase, userId),
      getTopicMastery(supabase, userId).catch(() => []),
      getLeaderboardRank(supabase, userId),
      countPlayers(supabase),
    ]);
    const maitrise = topics.length ? programMastery(topics) : null;
    const moment = momentDeRang({ avant: ev.eloBefore, apres: ev.eloAfter, maitrise, place, joues: rating.gamesPlayed, dernier: ev.latest });
    if (!moment) return null;
    return (
      <CeremonieRang
        cle={`examen:${examId}`}
        avant={ev.eloBefore}
        apres={ev.eloAfter}
        maitrise={maitrise}
        place={place}
        joueurs={joueurs}
        joues={rating.gamesPlayed}
        dernier={ev.latest}
        domaine={CURRENT_DOMAIN.name}
        className={className}
      />
    );
  } catch {
    return null;
  }
}
