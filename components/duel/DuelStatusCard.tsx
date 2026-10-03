"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Hourglass, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { DuelSide, StakeTile } from "@/components/duel/parts";
import {
  createDuel,
  duelErrorMessage,
  getDuelState,
  respondDuel,
  signed,
  stakesAgainst,
  timeLeftLabel,
  type DuelState,
} from "@/lib/duels";

type Props = {
  state: DuelState;
  /** invite : on te défie ; waiting : ta copie est rendue ; closed : refusé ou expiré */
  variant: "invite" | "waiting" | "closed";
  myMastery?: number | null;
  demo?: boolean;
};

function dateLabel(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
}

// Les états d'un duel hors partie : défi reçu, attente de l'adversaire,
// duel refusé ou expiré.
export function DuelStatusCard({ state, variant, myMastery = null, demo = false }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => (demo ? null : createClient()), [demo]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const them = state.them;
  const theirName = them?.username ?? "ton adversaire";
  const stakes = them ? stakesAgainst(state.me.elo, state.me.gamesPlayed, them.elo) : null;

  // En attente : on regarde de temps en temps si le résultat est tombé.
  useEffect(() => {
    if (!supabase || variant !== "waiting") return;
    const t = setInterval(async () => {
      const s = await getDuelState(supabase, state.id);
      if (s && (s.status !== state.status || (s.them?.answered ?? 0) !== (state.them?.answered ?? 0) || (!state.them && s.them))) {
        router.refresh();
      }
    }, 30000);
    return () => clearInterval(t);
  }, [router, state.id, state.status, state.them, supabase, variant]);

  async function act(fn: () => Promise<void>) {
    if (!supabase) {
      setError("Aperçu : les boutons ne lancent rien ici.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(duelErrorMessage(e));
      setBusy(false);
    }
  }

  const accept = () =>
    act(async () => {
      await respondDuel(supabase!, state.id, true);
      router.refresh();
    });
  const decline = () =>
    act(async () => {
      await respondDuel(supabase!, state.id, false);
      router.push("/duel");
    });
  const rematch = () =>
    act(async () => {
      const r = await createDuel(supabase!, them?.id ?? null, state.id);
      router.push(`/duel/${r.id}`);
    });

  let kicker: string;
  let title: string;
  let body: React.ReactNode;
  if (variant === "invite") {
    kicker = `Défi reçu · expire dans ${timeLeftLabel(state.expiresAt, state.serverNow)}`;
    title = `${theirName} te défie`;
    body = (
      <>
        {state.questionCount} questions type examen, les mêmes pour vous deux, {Math.round(state.timeLimitSeconds / 60)} min. Tu as 48 h
        pour jouer une fois le défi accepté ; refuser ne coûte rien.
      </>
    );
  } else if (variant === "waiting") {
    kicker = "Copie rendue";
    if (!them) {
      title = "On cherche ton adversaire";
      body = (
        <>
          Le prochain joueur qui lance un duel au hasard passera les mêmes questions. Résultat dès qu&apos;il aura fini. Si personne ne
          se présente avant le {dateLabel(state.expiresAt)}, le duel expire sans effet sur ton ELO.
        </>
      );
    } else if (state.status === "pending") {
      title = `En attente de ${theirName}`;
      body = (
        <>
          {theirName} n&apos;a pas encore accepté ton défi. Résultat dès qu&apos;il aura joué ; sans réponse avant le{" "}
          {dateLabel(state.expiresAt)}, le défi expire sans effet sur l&apos;ELO.
        </>
      );
    } else {
      title = `À ${theirName} de jouer`;
      body = (
        <>
          {them.startedAt ? `${theirName} est en train de jouer (${them.answered}/${state.questionCount}).` : `${theirName} n'a pas encore commencé.`}{" "}
          Résultat dès qu&apos;il aura rendu sa copie. S&apos;il ne joue pas avant le {dateLabel(state.expiresAt)}, tu gagnes par forfait.
        </>
      );
    }
  } else {
    kicker = state.status === "declined" ? "Défi refusé" : "Duel expiré";
    title = state.status === "declined" ? "Pas de duel cette fois" : "Le temps est écoulé";
    body =
      state.status === "declined" ? (
        <>Le défi a été refusé ou annulé : rien ne bouge côté ELO.</>
      ) : (
        <>Personne n&apos;a joué (ou le défi n&apos;a pas été accepté) dans les 48 h : rien ne bouge côté ELO.</>
      );
  }

  return (
    <div className="mx-auto grid w-full max-w-[860px] gap-6">
      <section className="card rl-in p-5 md:p-[26px]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 md:gap-5">
          <DuelSide
            name="Toi"
            elo={state.me.elo}
            mastery={myMastery}
            badgeSize={48}
            extra={state.me.finishedAt ? "copie rendue" : state.me.startedAt ? `${state.me.answered}/${state.questionCount}` : "pas commencé"}
          />
          <Swords size={22} className="text-muted" aria-label="contre" />
          <DuelSide
            name={them?.username ?? "À trouver"}
            elo={them ? them.elo : null}
            align="right"
            badgeSize={48}
            extra={them ? (them.finishedAt ? "copie rendue" : them.startedAt ? "en jeu" : "pas commencé") : "—"}
          />
        </div>
      </section>

      <section className="card rl-in grid gap-5 p-6 md:p-8" style={{ animationDelay: ".08s" }}>
        <div>
          <p className="kicker m-0 flex items-center gap-1.5">
            {variant === "waiting" && <Hourglass size={14} aria-hidden />}
            {kicker}
          </p>
          <h1 className="m-0 mt-1 text-[28px] font-extrabold leading-tight tracking-[-0.02em] md:text-[36px]">{title}</h1>
        </div>
        <p className="m-0 max-w-[620px] text-[15px] leading-normal text-muted">{body}</p>

        {variant === "invite" && stakes && (
          <div className="grid grid-cols-3 gap-2.5">
            <StakeTile label="Si tu gagnes" value={signed(stakes.win)} />
            <StakeTile label="Match nul" value={signed(stakes.draw)} />
            <StakeTile label="Si tu perds" value={signed(stakes.loss)} />
          </div>
        )}

        {error && (
          <p role="alert" className="m-0 text-sm text-pen">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          {variant === "invite" && (
            <>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void decline()}>
                Refuser
              </button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void accept()}>
                Accepter le défi <ArrowRight size={16} aria-hidden />
              </button>
            </>
          )}
          {variant === "waiting" && (
            <>
              {state.status === "pending" && state.iAmChallenger && (
                <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void decline()}>
                  {them ? "Annuler le défi" : "Annuler la recherche"}
                </button>
              )}
              <Link href="/duel" className="btn btn-primary">
                Retour aux duels <ArrowRight size={16} aria-hidden />
              </Link>
            </>
          )}
          {variant === "closed" && (
            <>
              {them && (
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void rematch()}>
                  Redéfier {theirName} <Swords size={15} aria-hidden />
                </button>
              )}
              <Link href="/duel" className="btn btn-primary">
                Nouveau duel <ArrowRight size={16} aria-hidden />
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
