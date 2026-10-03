"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ListChecks, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { Enso } from "@/components/ui/InkRings";
import { BrushUnderline } from "@/components/ui/Titles";
import { RankBadge } from "@/components/ui/RankBadge";
import { DuelAiCopy } from "@/components/duel/DuelAiCopy";
import { DuelSide, InkWatermark } from "@/components/duel/parts";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import { CURRENT_DOMAIN, CURRENT_PROGRAM } from "@/lib/domains";
import {
  DUEL_REVIEW_DAYS,
  clock,
  createDuel,
  decisiveQuestion,
  duelErrorMessage,
  duelTopicLabel,
  reviewHasOpponent,
  signed,
  type DuelReviewItem,
  type DuelState,
} from "@/lib/duels";

type Props = {
  state: DuelState;
  review: DuelReviewItem[];
  /** maîtrise du programme et place au classement, pour le rang après le duel */
  mastery?: number | null;
  leaderboardRank?: number | null;
  demo?: boolean;
};

// Résultat d'un duel (maquette V2-Duel-resultat) : verdict (le ton change
// entre victoire et défaite), scores et, dans la même carte, l'action
// principale « Revoir le duel » + « Copier pour l'IA » ; puis ELO avant /
// après, détail par matière et revanche.
export function DuelResult({ state, review, mastery = null, leaderboardRank = null, demo = false }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => (demo ? null : createClient()), [demo]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const me = state.me;
  const them = state.them;
  const theirName = them?.username ?? "Adversaire";
  const myScore = me.score ?? 0;
  const theirScore = them?.score ?? 0;
  const won = state.winnerId === me.id;
  const draw = state.winnerId === null;
  const verdict = won ? "Victoire" : draw ? "Match nul" : "Défaite";

  const delta = me.delta ?? 0;
  const eloBefore = me.eloBefore ?? me.elo - delta;
  const eloAfter = eloBefore + delta;
  const theirBefore = them ? them.eloBefore ?? them.elo - (them.delta ?? 0) : null;
  const rank = rankFor(eloAfter, mastery, leaderboardRank);
  const placement = me.gamesPlayed < PLACEMENT_GAMES;

  let reason: string | null = null;
  if (them && them.seconds === null && me.seconds !== null) reason = `${theirName} n'a pas joué à temps : victoire par forfait.`;
  else if (me.seconds === null && them && them.seconds !== null) reason = "Tu n'as pas joué à temps : défaite par forfait.";
  else if (myScore === theirScore && !draw && me.seconds !== null && them?.seconds != null)
    reason = `Égalité de bonnes réponses : ${won ? "tu as" : `${theirName} a`} été plus rapide (${clock(won ? me.seconds : them.seconds)} contre ${clock(won ? them.seconds : me.seconds)}).`;
  else if (draw) reason = "Même score, même temps à la seconde près : match nul.";

  const topics = useMemo(() => {
    const m = new Map<string, { correct: number; total: number }>();
    for (const r of review) {
      const k = r.topic ?? "autre";
      const a = m.get(k) ?? { correct: 0, total: 0 };
      a.total += 1;
      if (r.isCorrect) a.correct += 1;
      m.set(k, a);
    }
    return [...m.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
  }, [review]);
  const errors = review.filter((r) => !r.isCorrect);
  const withThem = reviewHasOpponent(review) && !!them;
  const decisive = withThem ? decisiveQuestion(review) : null;
  const decisiveItem = decisive ? review.find((r) => r.position === decisive.position) ?? null : null;

  // Le ton change avec le verdict : une ligne, le trait et l'anneau (plus
  // ouvert après une défaite : il reste un bout à conquérir).
  const margin = Math.abs(myScore - theirScore);
  const q = (n: number) => `${n} question${n > 1 ? "s" : ""}`;
  const forfeit = me.seconds === null || them?.seconds == null;
  const tone = forfeit
    ? won
      ? "Gagné sans combattre. Ta copie mérite quand même une revue."
      : "Le chrono a tranché. La prochaine fois, joue sous 48 h."
    : won
    ? margin > 0
      ? `Tu bats ${theirName} de ${q(margin)}. Revois tes erreurs pour creuser l'écart.`
      : `Même score que ${theirName}, mais plus rapide. Revois tes erreurs pour ne plus dépendre du chrono.`
    : draw
      ? `Rien ne vous sépare, ${theirName} et toi. La revanche tranchera.`
      : margin > 0
        ? `Ça s'est joué à ${q(margin)}. Revois-les, puis prends ta revanche.`
        : `Même score, ${theirName} a été plus rapide. Revois tes erreurs, puis prends ta revanche.`;

  async function rematch() {
    if (!supabase || !them) {
      setError("Aperçu : les boutons ne lancent rien ici.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await createDuel(supabase, them.id, state.id);
      router.push(`/duel/${r.id}`);
    } catch (e) {
      setError(duelErrorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-[1040px] gap-6 md:gap-8">
      <div className="relative flex flex-col items-center gap-2.5 pt-4 text-center">
        <div aria-hidden className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2">
          {won ? <Enso size={300} opacity={0.1} extent={92} /> : <Enso size={300} opacity={0.06} extent={58} rotate={150} />}
        </div>
        <span className="kicker relative flex items-center gap-1.5">
          <Swords size={14} aria-hidden /> Duel · {CURRENT_DOMAIN.name} · {CURRENT_PROGRAM.name}
        </span>
        <h1 className={"rl-in relative m-0 font-brand text-[clamp(56px,11vw,96px)] leading-none " + (won ? "" : "text-body")}>{verdict}</h1>
        {won ? (
          <BrushUnderline width={300} height={18} className="relative text-white" />
        ) : (
          <BrushUnderline width={190} height={10} className="relative text-muted opacity-60" />
        )}
        <p className="t-body relative m-0 mt-1 max-w-[520px] text-balance text-muted">{tone}</p>
      </div>

      <section className="card-hero px-5 py-6 md:px-8 md:py-7">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 md:gap-5">
          <DuelSide
            name="Toi"
            elo={eloBefore}
            mastery={mastery}
            badgeSize={48}
            hideNameOnMobile
            extra={me.seconds !== null ? clock(me.seconds) : "forfait"}
            big={<span className="t-num ml-auto text-[44px] md:ml-3 md:text-[60px]">{myScore}</span>}
          />
          <span className="font-mono text-[13px] text-muted md:text-[14px]">sur {state.questionCount}</span>
          <DuelSide
            name={theirName}
            elo={theirBefore}
            align="right"
            badgeSize={48}
            hideNameOnMobile
            extra={them?.seconds != null ? clock(them.seconds) : "forfait"}
            big={<span className="t-num mr-auto text-[44px] md:mr-3 md:text-[60px]">{theirScore}</span>}
          />
        </div>
        <div className="mt-3 flex justify-between gap-3 text-[13px] font-bold sm:hidden">
          <span className="truncate">Toi · {me.seconds !== null ? clock(me.seconds) : "forfait"}</span>
          <span className="truncate text-right">
            {theirName} · {them?.seconds != null ? clock(them.seconds) : "forfait"}
          </span>
        </div>
        {reason && <p className="t-micro m-0 mt-4 text-center">{reason}</p>}

        {/* L'action principale : revoir le duel, et le copier pour l'IA */}
        <div className="mt-6 flex flex-col gap-4 border-t border-line pt-5 md:flex-row md:items-center md:justify-between md:gap-8">
          <div className="min-w-0">
            <h2 className="t-h3 m-0 flex items-center gap-2">
              <ListChecks size={18} aria-hidden />
              {review.length === 0
                ? "Revue du duel"
                : errors.length === 0
                  ? "Sans faute : revois quand même le duel"
                  : `Revois tes ${errors.length} erreur${errors.length > 1 ? "s" : ""}`}
            </h2>
            <p className="t-small m-0 mt-1.5 max-w-[480px]">
              {decisiveItem && decisive
                ? `Question décisive : Q${decisiveItem.position + 1} (${duelTopicLabel(decisiveItem.topic)}), ${decisive.forMe ? "là où tu es passé devant pour de bon" : `là où ${theirName} est passé devant pour de bon`}. `
                : `Ta réponse${withThem ? `, celle de ${theirName}` : ""}, la bonne et l'explication. `}
              Dans « À revoir » pendant {DUEL_REVIEW_DAYS} jours.
            </p>
          </div>
          <div className="grid shrink-0 gap-2.5 sm:flex sm:flex-wrap">
            {review.length > 0 && <DuelAiCopy review={review} ctx={{ myScore, theirScore, total: state.questionCount }} layout="single" />}
            <Link href={`/duel/${state.id}?revue=1`} className="btn btn-primary">
              Revoir le duel <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-[18px] md:grid-cols-12">
        <section className="card-ink flex min-w-0 flex-col gap-4 p-6 md:col-span-5 md:p-7" style={{ "--tier-glow": rank.tier.metal[1] } as React.CSSProperties}>
          <InkWatermark size={240} className="-bottom-14 -right-10" />
          <span className="relative text-[12.5px] font-semibold text-[rgba(255,255,255,.58)]">Ton ELO</span>
          <div className="relative flex items-baseline gap-3.5">
            <span className="font-brand text-[56px] leading-none tabular-nums">
              <span className="rl-count" style={{ "--rl-to": Math.max(0, eloAfter) } as React.CSSProperties} aria-label={`${eloAfter} ELO`} />
            </span>
            <span
              className={
                "rl-pop rounded-[9px] px-2.5 py-1 font-mono text-[18px] font-semibold tabular-nums " +
                (delta >= 0 ? "bg-[#fff] text-[#111]" : "bg-[rgba(255,255,255,.14)] text-[#fff]")
              }
              style={{ animationDelay: ".6s" }}
            >
              {signed(delta)}
            </span>
          </div>
          <div className="relative flex flex-wrap items-center gap-2 text-[12.5px] text-[rgba(255,255,255,.62)]">
            <RankBadge tier={rank.tierIndex} size={26} onDark glow={false} gray={placement} />
            {placement ? (
              <span>
                En placement {me.gamesPlayed}/{PLACEMENT_GAMES} — ton rang s&apos;affiche après la {PLACEMENT_GAMES}
                <sup>e</sup> partie.
              </span>
            ) : rank.next ? (
              <>
                <span>
                  {rank.tier.name}
                  {rank.division ? ` ${rank.division}` : ""} · encore {rank.pointsToNext} points pour
                </span>
                <RankBadge tier={rank.tierIndex + 1} size={22} onDark glow={false} />
                <span>{rank.next.name}</span>
              </>
            ) : (
              <span>{rank.tier.name} · sommet du classement</span>
            )}
          </div>
          {!placement && (
            <div className="relative h-2 overflow-hidden rounded-[8px] bg-[rgba(255,255,255,.14)]">
              <div
                className="rl-grow h-full rounded-[8px]"
                style={{ width: `${rank.progress}%`, background: `linear-gradient(90deg, ${rank.tier.metal[0]}, ${rank.tier.metal[1]})` }}
              />
            </div>
          )}
        </section>

        <section className="card-quiet flex min-w-0 flex-col gap-4 p-6 md:col-span-7 md:p-7">
          <p className="t-eyebrow m-0">Par matière</p>
          {topics.length === 0 ? (
            <p className="m-0 text-sm text-muted">Le détail par matière n&apos;est pas disponible pour ce duel.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {topics.map((t) => (
                <div key={t.key} className="grid grid-cols-[minmax(0,120px)_minmax(0,1fr)_48px] items-center gap-3">
                  <span className="truncate text-[14px] font-[650]">{duelTopicLabel(t.key)}</span>
                  <div className="h-[7px] overflow-hidden rounded-[7px] bg-line">
                    <div className="rl-grow h-full rounded-[7px] bg-white" style={{ width: `${Math.round((t.correct / t.total) * 100)}%`, animationDelay: ".3s" }} />
                  </div>
                  <span className="text-right font-mono text-[12.5px] tabular-nums">
                    {t.correct}/{t.total}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {error && (
        <p role="alert" className="m-0 text-center text-sm text-pen">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-2.5">
        {them && (
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void rematch()}>
            Revanche <Swords size={15} aria-hidden />
          </button>
        )}
        <Link href="/duel" className="btn btn-secondary">
          Nouveau duel <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
