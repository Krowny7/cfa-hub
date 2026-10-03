"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChartNoAxesColumn, Swords, X } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { Enso } from "@/components/ui/InkRings";
import { BrushUnderline, CardLabel } from "@/components/ui/Titles";
import { RankBadge } from "@/components/ui/RankBadge";
import { QuestionPrompt } from "@/components/QuestionPrompt";
import { DuelSide, InkWatermark } from "@/components/duel/parts";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import { CURRENT_DOMAIN, CURRENT_PROGRAM } from "@/lib/domains";
import { clock, createDuel, duelErrorMessage, duelTopicLabel, signed, type DuelReviewItem, type DuelState } from "@/lib/duels";

type Props = {
  state: DuelState;
  review: DuelReviewItem[];
  /** maîtrise du programme et place au classement, pour le rang après le duel */
  mastery?: number | null;
  leaderboardRank?: number | null;
  demo?: boolean;
};

const LETTERS = ["A", "B", "C", "D", "E"];

// Résultat d'un duel (maquette V2-Duel-resultat) : verdict, scores, ELO
// avant/après, détail par matière, correction et revanche.
export function DuelResult({ state, review, mastery = null, leaderboardRank = null, demo = false }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => (demo ? null : createClient()), [demo]);
  const [showErrors, setShowErrors] = useState(false);
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
    <div className="mx-auto grid w-full max-w-[1100px] gap-[26px]">
      <div className="relative flex flex-col items-center gap-2.5 pt-4 text-center">
        <div aria-hidden className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2">
          <Enso size={300} opacity={0.09} />
        </div>
        <span className="rl-in relative flex items-center gap-1.5 text-sm font-[650] text-muted">
          <Swords size={15} aria-hidden /> Duel terminé · {CURRENT_DOMAIN.name} · {CURRENT_PROGRAM.name}
        </span>
        <h1 className="rl-pop relative m-0 font-brand text-[clamp(56px,11vw,96px)] leading-none">{verdict}</h1>
        <BrushUnderline width={300} height={18} className="relative text-white" />
      </div>

      <section className="card rl-lift p-5 md:p-[26px]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 md:gap-5">
          <DuelSide
            name="Toi"
            elo={eloBefore}
            mastery={mastery}
            badgeSize={52}
            hideNameOnMobile
            extra={me.seconds !== null ? `en ${clock(me.seconds)}` : "forfait"}
            big={<span className="ml-auto font-brand text-[40px] leading-none tabular-nums md:ml-2 md:text-[56px]">{myScore}</span>}
          />
          <span className="font-mono text-[13px] text-muted md:text-[14px]">sur {state.questionCount}</span>
          <DuelSide
            name={theirName}
            elo={theirBefore}
            align="right"
            badgeSize={52}
            hideNameOnMobile
            extra={them?.seconds != null ? `en ${clock(them.seconds)}` : "forfait"}
            big={<span className="mr-auto font-brand text-[40px] leading-none tabular-nums md:mr-2 md:text-[56px]">{theirScore}</span>}
          />
        </div>
        <div className="mt-3 flex justify-between gap-3 text-[13px] font-bold sm:hidden">
          <span className="truncate">Toi · {me.seconds !== null ? clock(me.seconds) : "forfait"}</span>
          <span className="truncate text-right">
            {theirName} · {them?.seconds != null ? clock(them.seconds) : "forfait"}
          </span>
        </div>
        {reason && <p className="m-0 mt-4 text-center text-[13px] text-muted">{reason}</p>}
      </section>

      <div className="grid gap-[18px] md:grid-cols-12">
        <section className="card-ink rl-lift rl-in flex min-w-0 flex-col gap-4 p-6 md:col-span-5">
          <InkWatermark size={240} className="-bottom-14 -right-10" />
          <span className="relative text-[13px] font-semibold text-[rgba(255,255,255,.6)]">Ton ELO</span>
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
          <div className="relative flex flex-wrap items-center gap-2.5 text-[13px] text-[rgba(255,255,255,.65)]">
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

        <section className="card rl-lift rl-in flex min-w-0 flex-col gap-4 p-[22px] md:col-span-7" style={{ animationDelay: ".08s" }}>
          <CardLabel icon={<ChartNoAxesColumn size={15} aria-hidden />}>Par matière</CardLabel>
          {topics.length === 0 ? (
            <p className="m-0 text-sm text-muted">Le détail par matière n&apos;est pas disponible pour ce duel.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {topics.map((t) => (
                <div key={t.key} className="grid grid-cols-[minmax(0,120px)_minmax(0,1fr)_48px] items-center gap-3">
                  <span className="truncate text-[14px] font-[650]">{duelTopicLabel(t.key)}</span>
                  <div className="h-[7px] overflow-hidden rounded-[7px] bg-surface-2">
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
        <button type="button" className="btn btn-secondary" disabled={errors.length === 0} onClick={() => setShowErrors((v) => !v)} aria-expanded={showErrors}>
          {errors.length === 0 ? "Sans faute !" : showErrors ? "Masquer mes erreurs" : `Revoir mes ${errors.length} erreur${errors.length > 1 ? "s" : ""}`}
        </button>
        {them && (
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void rematch()}>
            Revanche <Swords size={15} aria-hidden />
          </button>
        )}
        <Link href="/duel" className="btn btn-primary">
          Nouveau duel <ArrowRight size={16} aria-hidden />
        </Link>
      </div>

      {showErrors && (
        <div className="grid gap-3">
          {errors.map((r) => (
            <article key={r.position} className="card rl-in grid gap-3 p-5">
              <div className="text-[12.5px] font-semibold text-muted">
                Question {r.position + 1} · {duelTopicLabel(r.topic)} · {r.selectedIndex === null ? "sans réponse" : "ratée"}
              </div>
              <QuestionPrompt text={r.prompt} className="text-[15px] font-semibold leading-normal break-words" compact />
              <div className="grid gap-1.5">
                {r.choices.map((c, i) => {
                  const good = i === r.correctIndex;
                  const mine = i === r.selectedIndex;
                  return (
                    <div
                      key={i}
                      className={
                        "flex items-start gap-2.5 rounded-[12px] border px-3 py-2 text-[14px] " +
                        (good ? "border-white font-bold" : mine ? "border-pen text-pen" : "border-line text-muted")
                      }
                    >
                      <span className="font-mono text-[12.5px]">{LETTERS[i] ?? i + 1}</span>
                      <span className="min-w-0 flex-1 break-words">{c}</span>
                      {good && <Check size={15} className="shrink-0" aria-label="bonne réponse" />}
                      {mine && !good && <X size={15} className="shrink-0" aria-label="ta réponse" />}
                    </div>
                  );
                })}
              </div>
              {r.explanation && <p className="m-0 whitespace-pre-wrap text-[13px] leading-normal text-muted">{r.explanation}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
