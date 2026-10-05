import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Cote } from "@/components/adn/Cote";
import { SignalLeonard } from "@/components/leonard/SignalLeonard";
import { DefiAiCopy } from "@/components/defi/DefiAiCopy";
import { SceauDefi } from "@/components/defi/SceauDefi";
import { Ticks, reviewMarks } from "@/components/defi/parts";
import { clock } from "@/lib/duels";
import { reviewHref, type DailyBoard, type DailyInfo, type DailyReviewItem } from "@/lib/daily";
import { ratures } from "@/lib/voice";
import { DEFI, rangOrdinal, verdictCopie } from "@/lib/voice-z2c";

type Props = {
  /** le défi, avec ma copie rendue (info.me.finishedAt) */
  info: DailyInfo;
  /** ma correction (coches, nombre de ratures, « Copier pour l'IA ») ; [] si indisponible */
  review: DailyReviewItem[];
  board: DailyBoard | null;
};

const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

// Ma copie rendue : le verdict au mot, le score (le seul grand chiffre), les
// coches question par question (chacune mène à sa correction), rang et
// temps, l'écart à la tête coté comme sur un plan (au stylo rouge : le bout
// qui reste), puis « Revoir ma copie » et « Copier pour l'IA ». Le sceau du
// jour se pose sur la copie (la main du correcteur qui valide) : coup de
// tampon à la première visite, déjà posé ensuite. Rendu côté serveur
// comme côté client (seul le sceau est un îlot client).
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

  // L'écart à la tête, en cote (ou une ligne si tu es devant, ou seul)
  let cote: React.ReactNode;
  if (players <= 1) {
    cote = <p className="t-small m-0">{DEFI.alone(info.isToday)}</p>;
  } else if (rank === 1) {
    cote = <p className="t-small m-0">{DEFI.ahead(info.isToday)}</p>;
  } else if (leader && leader.score > score) {
    cote = <Cote ton="stylo" de={`${score}/${total}`} label={DEFI.ecartPoints(leader.score - score)} a={`${leader.score} · ${DEFI.premiere}`} className="max-w-[460px]" />;
  } else if (leader && me.seconds !== null) {
    cote = (
      <Cote
        ton="stylo"
        de={clock(me.seconds)}
        label={DEFI.ecartTemps(clock(Math.max(0, me.seconds - leader.seconds)))}
        a={`${clock(leader.seconds)} · ${DEFI.premiere}`}
        className="max-w-[460px]"
      />
    );
  } else {
    cote = null;
  }

  const handedAt = me.finishedAt ? timeFmt.format(new Date(me.finishedAt)) : null;

  return (
    <>
      {info.isToday && (
        <SignalLeonard evt={pct >= 70 ? "defi-reussi" : "defi-rate"} vars={{ score: `${score}/${total}`, pct: `${pct} %` }} cle={"defi:" + info.day} delai={1800} />
      )}
    <section className="card-hero grid min-w-0 gap-6 p-6 md:p-8" aria-label="Ta copie">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="kicker m-0">{DEFI.copie(handedAt)}</p>
          <h2 className="t-h1 m-0 mt-1.5">{verdictCopie(score, total)}</h2>
          <p className="t-small m-0 mt-1.5">{DEFI.ligneCopie(pct, errors)}</p>
        </div>
        <p className="m-0 shrink-0 text-right leading-none" aria-label={`${score} sur ${total}`}>
          <span className="t-num text-[52px] sm:text-[60px] md:text-[76px]">{score}</span>
          <span className="font-mono text-[15px] text-muted">/{total}</span>
        </p>
      </div>

      {review.length > 0 && <Ticks marks={reviewMarks(review)} label={DEFI.coches} numbered hrefFor={(p) => reviewHref(info.day, p)} />}

      <dl className="m-0 grid grid-cols-3 gap-3 border-t border-line pt-4">
        <div className="min-w-0">
          <dt className="t-micro">{DEFI.rang}</dt>
          <dd className="m-0 mt-0.5 font-mono text-[17px] font-semibold tabular-nums">
            {rank !== null ? rangOrdinal(rank) : "—"}
            <span className="text-[13px] font-normal text-muted"> / {players}</span>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="t-micro">{DEFI.temps}</dt>
          <dd className="m-0 mt-0.5 font-mono text-[17px] font-semibold tabular-nums">{me.seconds !== null ? clock(me.seconds) : "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="t-micro truncate">{DEFI.meilleurDuJour}</dt>
          <dd className="m-0 mt-0.5 font-mono text-[17px] font-semibold tabular-nums">
            {topScore}
            <span className="text-[13px] font-normal text-muted">/{total}</span>
          </dd>
        </div>
      </dl>

      {cote}

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-4 sm:pr-28">
        <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <Link href={reviewHref(info.day)} className="btn btn-primary">
            {DEFI.revoir}
            {errors > 0 && <span className="text-[13px] font-medium opacity-70">· {ratures(errors)}</span>}
            <ArrowRight size={16} aria-hidden />
          </Link>
          <DefiAiCopy review={review} ctx={{ day: info.day, score, total, rank, players }} layout="single" />
        </div>
        {/* le sceau du jour, au coin de la copie ; sur téléphone, il déborde du
            bas de la carte, comme un tampon posé en bas de page */}
        <SceauDefi day={info.day} taille={88} angle={-6} className="-mb-14 -mt-2 ml-auto mr-1 sm:absolute sm:bottom-5 sm:right-6 sm:m-0 md:bottom-6 md:right-8" />
      </div>
    </section>
    </>
  );
}
