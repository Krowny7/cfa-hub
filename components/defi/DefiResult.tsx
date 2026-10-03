import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DefiAiCopy } from "@/components/defi/DefiAiCopy";
import { Cote, Ticks, reviewMarks } from "@/components/defi/parts";
import { clock } from "@/lib/duels";
import { dailyVerdict, ordinal, reviewHref, type DailyBoard, type DailyInfo, type DailyReviewItem } from "@/lib/daily";

type Props = {
  /** le défi, avec ma copie rendue (info.me.finishedAt) */
  info: DailyInfo;
  /** ma correction (coches, nombre d'erreurs, « Copier pour l'IA ») ; [] si indisponible */
  review: DailyReviewItem[];
  board: DailyBoard | null;
};

const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

// Ma copie rendue : le verdict au mot, le score (le seul grand chiffre), les
// coches question par question (chacune mène à sa correction), rang et
// temps, l'écart à la tête en cote, puis « Revoir ma copie » et « Copier
// pour l'IA ». Sans état : utilisable côté serveur comme côté client.
export function DefiResult({ info, review, board }: Props) {
  const me = info.me;
  if (!me) return null;
  const total = me.total ?? info.questionCount;
  const score = me.score ?? review.filter((r) => r.isCorrect).length;
  const errors = review.length > 0 ? review.filter((r) => !r.isCorrect).length : Math.max(0, total - score);
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const players = Math.max(board?.players ?? info.players, 1);
  const rank = me.rank;
  const leader = board?.rows[0] ?? null;
  const topScore = info.topScore ?? leader?.score ?? score;

  // L'écart à la tête, en cote (ou une ligne si tu es devant / seul)
  let cote: React.ReactNode;
  if (players <= 1) {
    cote = <p className="t-small m-0">{info.isToday ? "Seul en lice pour l'instant : le classement se remplit jusqu'à minuit." : "Seul en lice ce jour-là."}</p>;
  } else if (rank === 1) {
    cote = <p className="t-small m-0">{info.isToday ? "En tête. Tiens ta place jusqu'à minuit." : "En tête ce jour-là."}</p>;
  } else if (leader && leader.score > score) {
    const gap = leader.score - score;
    cote = <Cote value={`${gap} pt${gap > 1 ? "s" : ""}`} to="de la 1re place" />;
  } else if (leader && me.seconds !== null) {
    cote = <Cote value={clock(Math.max(0, me.seconds - leader.seconds))} to="de la 1re place, au temps" />;
  } else {
    cote = null;
  }

  const handedAt = me.finishedAt ? timeFmt.format(new Date(me.finishedAt)) : null;

  return (
    <section className="card-hero grid min-w-0 gap-6 p-6 md:p-8" aria-label="Ta copie">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="kicker m-0">Ta copie{handedAt ? ` · rendue à ${handedAt}` : ""}</p>
          <h2 className="t-h1 m-0 mt-1.5">{dailyVerdict(score, total)}</h2>
          <p className="t-small m-0 mt-1.5">
            {pct} % de précision · {errors === 0 ? "aucune erreur" : `${errors} erreur${errors > 1 ? "s" : ""}`}
          </p>
        </div>
        <p className="m-0 shrink-0 text-right leading-none" aria-label={`${score} sur ${total}`}>
          <span className="t-num text-[52px] sm:text-[60px] md:text-[76px]">{score}</span>
          <span className="font-mono text-[15px] text-muted">/{total}</span>
        </p>
      </div>

      {review.length > 0 && (
        <Ticks marks={reviewMarks(review)} label="Ta copie, question par question" numbered hrefFor={(p) => reviewHref(info.day, p)} />
      )}

      <dl className="m-0 grid grid-cols-3 gap-3 border-t border-line pt-4">
        <div className="min-w-0">
          <dt className="t-micro">Rang</dt>
          <dd className="m-0 mt-0.5 font-mono text-[17px] font-semibold tabular-nums">
            {rank !== null ? ordinal(rank) : "—"}
            <span className="text-[13px] font-normal text-muted"> / {players}</span>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="t-micro">Temps</dt>
          <dd className="m-0 mt-0.5 font-mono text-[17px] font-semibold tabular-nums">{me.seconds !== null ? clock(me.seconds) : "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="t-micro truncate">Meilleur du jour</dt>
          <dd className="m-0 mt-0.5 font-mono text-[17px] font-semibold tabular-nums">
            {topScore}
            <span className="text-[13px] font-normal text-muted">/{total}</span>
          </dd>
        </div>
      </dl>

      {cote}

      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        <Link href={reviewHref(info.day)} className="btn btn-primary">
          Revoir ma copie
          {errors > 0 && (
            <span className="text-[13px] font-medium opacity-70">
              · {errors} erreur{errors > 1 ? "s" : ""}
            </span>
          )}
          <ArrowRight size={16} aria-hidden />
        </Link>
        <DefiAiCopy review={review} ctx={{ day: info.day, score, total, rank, players }} layout="single" />
      </div>
    </section>
  );
}
