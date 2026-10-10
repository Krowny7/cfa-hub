"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Cote } from "@/components/adn/Cote";
import { createClient } from "@/lib/supabase/browser";
import { Verdict, type DecisiveVerdict, type MarqueCopie } from "@/components/adn/Verdict";
import { CeremonieRang } from "@/components/classement/CeremonieRang";
import { CeremonieSceaux } from "@/components/profil/CeremonieSceaux";
import { DuelAiCopy } from "@/components/duel/DuelAiCopy";
import { PLACEMENT_GAMES } from "@/lib/ranks";
import { CURRENT_DOMAIN, CURRENT_PROGRAM } from "@/lib/domains";
import { encore, signe } from "@/lib/voice";
import type { IssueDuel } from "@/lib/voice";
import { PARTIE } from "@/lib/voice-z2";
import {
  DUEL_REVIEW_DAYS,
  createDuel,
  decisiveQuestion,
  duelErrorMessage,
  duelTopicLabel,
  reviewHasOpponent,
  type DuelReviewItem,
  type DuelState,
} from "@/lib/duels";

type Props = {
  state: DuelState;
  review: DuelReviewItem[];
  /** maîtrise du programme et place au classement, pour le rang après le duel */
  mastery?: number | null;
  leaderboardRank?: number | null;
  /** joueurs au classement (« 4e sur 42 » dans la cérémonie) */
  players?: number | null;
  demo?: boolean;
  /** aperçus : forcer la séquence du verdict, ou sa version figée */
  verdictMode?: "auto" | "sequence" | "fige";
  /** aperçus : rejouer la cérémonie de rang à chaque fois */
  forceCeremonie?: boolean;
};

const LETTERS = ["A", "B", "C", "D", "E"];
const letter = (i: number | null | undefined) => (i === null || i === undefined || i < 0 ? "—" : LETTERS[i] ?? String(i + 1));
/** Une cérémonie de rang ne se joue que pour un résultat récent. */
const CEREMONIE_JOURS = 7;

/** L'énoncé de la question décisive, en une ligne courte. */
function enonceCourt(prompt: string) {
  const t = prompt.replace(/\s+/g, " ").trim();
  return t.length > 220 ? `${t.slice(0, 217).trimEnd()}…` : t;
}

// Résultat d'un duel : le verdict (moment 3) en séquence la première fois
// (dépouillement des deux copies, le mot au pinceau, l'ELO, les mentions, la
// question décisive), figé ensuite. Ses actions : « Revoir la partie »,
// « Copier pour l'IA », « Revanche ». Puis, si le palier ou la division a
// bougé, la cérémonie de rang ; un sceau gagné (Duelliste, une mention,
// Coup d'éclat), la sienne ; et, plus bas, le détail par matière.
export function DuelResult({ state, review, mastery = null, leaderboardRank = null, players = null, demo = false, verdictMode = "auto", forceCeremonie = false }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => (demo ? null : createClient()), [demo]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fini, setFini] = useState(false);

  const me = state.me;
  const them = state.them;
  const theirName = them?.username ?? "Adversaire";
  const myScore = me.score ?? 0;
  const theirScore = them?.score ?? 0;
  const won = state.winnerId === me.id;
  const draw = state.winnerId === null;
  const issue: IssueDuel = won ? "victoire" : draw ? "nulle" : "defaite";

  const delta = me.delta ?? 0;
  const eloBefore = me.eloBefore ?? me.elo - delta;
  const eloAfter = eloBefore + delta;
  const theirBefore = them ? them.eloBefore ?? them.elo - (them.delta ?? 0) : null;
  const placement = me.gamesPlayed < PLACEMENT_GAMES;

  // forfait : l'un des deux n'a pas rendu sa copie à temps
  const theyForfeit = !!them && them.seconds === null && me.seconds !== null;
  const iForfeit = me.seconds === null && !!them && them.seconds !== null;

  const sorted = useMemo(() => [...review].sort((a, b) => a.position - b.position), [review]);
  const errors = sorted.filter((r) => !r.isCorrect).length;
  const withThem = reviewHasOpponent(sorted) && !!them;

  // Les deux copies, question par question (null : sans réponse)
  const copies = useMemo(() => {
    if (!sorted.length) return null;
    const moi: MarqueCopie[] = sorted.map((r) => (r.isCorrect ? true : r.selectedIndex === null ? null : false));
    // forfait adverse : sa copie est blanche, on ne la dépouille pas
    const eux: MarqueCopie[] | null = withThem && !theyForfeit ? sorted.map((r) => (r.theirIsCorrect ? true : r.theirAnswered ? false : null)) : null;
    return { moi, eux, matieres: sorted.map((r) => duelTopicLabel(r.topic)) };
  }, [sorted, withThem, theyForfeit]);

  // La question qui a fait basculer la partie (position 1-based pour le verdict)
  const decisive = useMemo<DecisiveVerdict | null>(() => {
    if (!withThem) return null;
    const d = decisiveQuestion(sorted);
    if (!d) return null;
    const ix = sorted.findIndex((r) => r.position === d.position);
    const item = sorted[ix];
    if (!item) return null;
    return {
      position: ix + 1,
      matiere: duelTopicLabel(item.topic),
      enonce: enonceCourt(item.prompt),
      moi: `${letter(item.selectedIndex)} ${item.isCorrect ? "✓" : "✗"}`,
      eux: `${letter(item.theirSelectedIndex)} ${item.theirIsCorrect ? "✓" : "✗"}`,
      note: PARTIE.decisive(d.forMe, theirName),
    };
  }, [sorted, withThem, theirName]);

  const topics = useMemo(() => {
    const m = new Map<string, { correct: number; total: number }>();
    for (const r of sorted) {
      const k = r.topic ?? "autre";
      const a = m.get(k) ?? { correct: 0, total: 0 };
      a.total += 1;
      if (r.isCorrect) a.correct += 1;
      m.set(k, a);
    }
    return [...m.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
  }, [sorted]);

  // La cérémonie : une fois, pour un résultat récent, quand le verdict a fini
  const recent =
    !!state.finishedAt && Date.parse(state.serverNow) - Date.parse(state.finishedAt) < CEREMONIE_JOURS * 86_400_000;
  const dernier = me.elo === eloAfter;

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

  const actions = (
    <>
      <Link href={`/duel/${state.id}?revue=1`} className="btn btn-primary">
        {sorted.length ? PARTIE.revue(errors) : PARTIE.revoir} <ArrowRight size={16} aria-hidden />
      </Link>
      {sorted.length > 0 && <DuelAiCopy review={sorted} ctx={{ myScore, theirScore: them ? theirScore : null, total: state.questionCount }} layout="single" />}
      {them && (
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void rematch()}>
          {PARTIE.revanche}
        </button>
      )}
    </>
  );

  return (
    <div className="grid w-full gap-10 md:gap-14">
      <div className="grid gap-4">
        <Verdict
          issue={issue}
          forfait={theyForfeit}
          moi={{ nom: "Toi", score: myScore, temps: me.seconds, elo: eloBefore }}
          eux={them ? { nom: theirName, score: theirScore, temps: them.seconds, elo: theirBefore } : null}
          total={state.questionCount}
          copies={copies}
          enjeu={placement ? null : { avant: eloBefore, apres: eloAfter, maitrise: mastery, place: leaderboardRank }}
          decisive={decisive}
          ratures={errors}
          contexte={`Duel · ${CURRENT_DOMAIN.name} · ${CURRENT_PROGRAM.name}`}
          actions={placement ? undefined : actions}
          cle={state.id}
          mode={verdictMode}
          onFin={() => setFini(true)}
        />
        {iForfeit && <p className="t-small m-0">{PARTIE.forfaitMoi}</p>}
        {placement && (
          // Le placement : pas encore de rang, la place se dessine. Le bout
          // qui reste est coté au stylo rouge (« encore 2 »), règle 2. Le
          // verdict n'a pas d'enjeu à montrer : ses actions viennent ici, à
          // côté, et apparaissent à la fin de la séquence (comme dans le verdict).
          <div className="grid items-start gap-x-9 gap-y-6 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="grid gap-1.5" aria-label={PARTIE.placement(me.gamesPlayed, PLACEMENT_GAMES)}>
              <p className="t-eyebrow m-0">{PARTIE.placementTitre}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-brand text-[44px] leading-none tabular-nums">
                  {Math.min(me.gamesPlayed, PLACEMENT_GAMES)}
                  <span className="text-[22px] text-muted">/{PLACEMENT_GAMES}</span>
                </span>
                <Cote forme="marque" ton="stylo" label={encore(PLACEMENT_GAMES - me.gamesPlayed)} />
              </div>
              <p className="t-small m-0">
                {PARTIE.placementLigne} · {PARTIE.eloProvisoire}{" "}
                <b className="font-mono font-semibold tabular-nums text-white">{eloAfter}</b>{" "}
                <span className="font-mono tabular-nums">({signe(delta)})</span>
              </p>
            </div>
            <div className={"flex flex-wrap items-center gap-2.5 md:col-start-3 " + (fini ? "rl-in" : "invisible")}>{actions}</div>
          </div>
        )}
        {error && (
          <p role="alert" className="m-0 text-sm text-pen">
            {error}
          </p>
        )}
      </div>

      <CeremonieRang
        cle={`duel:${state.id}`}
        avant={eloBefore}
        apres={eloAfter}
        maitrise={mastery}
        place={leaderboardRank}
        joueurs={players}
        joues={me.gamesPlayed}
        dernier={dernier}
        actif={fini && (recent || forceCeremonie)}
        force={forceCeremonie}
        domaine={CURRENT_DOMAIN.name}
        compact
        className="max-w-[620px]"
      />

      {/* un résultat récent, une fois le verdict joué : le sceau gagné s'il y en a un */}
      {!demo && recent && fini && <CeremonieSceaux className="!mx-0" />}

      <section className="grid gap-x-14 gap-y-10 border-t border-line pt-8 md:grid-cols-12" aria-label="Le détail de la partie">
        <div className="flex min-w-0 flex-col gap-4 md:col-span-7">
          <p className="t-eyebrow m-0">Par matière</p>
          {topics.length === 0 ? (
            <p className="m-0 text-sm text-muted">Le détail par matière n&apos;est pas disponible pour cette partie.</p>
          ) : (
            <ul className="m-0 grid list-none gap-3 p-0">
              {topics.map((t) => {
                const p = Math.round((t.correct / t.total) * 100);
                return (
                  <li key={t.key} className="grid grid-cols-[minmax(0,130px)_minmax(0,1fr)_48px] items-center gap-3">
                    <span className="truncate text-[14px] font-[650]">{duelTopicLabel(t.key)}</span>
                    <span className={"ink-bar " + (p < 50 ? "is-pen" : "")} aria-hidden>
                      <span className="rl-grow" style={{ width: `${Math.max(4, p)}%`, animationDelay: ".2s" }} />
                    </span>
                    <span className="text-right font-mono text-[12.5px] tabular-nums">
                      {t.correct}/{t.total}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-3 md:col-span-5">
          <p className="t-eyebrow m-0">Et maintenant</p>
          <p className="t-small m-0">{PARTIE.fenetre(DUEL_REVIEW_DAYS)}</p>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/duel" className="btn btn-secondary">
              {PARTIE.nouveau} <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
