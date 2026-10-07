"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Hourglass, ListChecks } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import { NBSP } from "@/lib/voice";
import { PARTIE } from "@/lib/voice-z2";
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
import { PresenceText } from "@/components/presence/Presence";

type Props = {
  state: DuelState;
  /** invite : on te défie ; waiting : ta copie est rendue ; closed : refusé ou expiré */
  variant: "invite" | "waiting" | "closed";
  myMastery?: number | null;
  /** duel clos que tu as joué : ta correction est consultable (?revue=1) */
  reviewable?: boolean;
  demo?: boolean;
};

function dateLabel(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
}

// Les états d'un duel hors partie : défi reçu, attente de l'adversaire,
// duel refusé ou expiré. Une seule carte : les deux joueurs en tête, puis
// le message et l'action.
export function DuelStatusCard({ state, variant, myMastery = null, reviewable = false, demo = false }: Props) {
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
    title = PARTIE.teDefie(theirName);
    body = (
      <>
        {state.questionCount} questions, les mêmes pour vous deux, {Math.round(state.timeLimitSeconds / 60)} min. {PARTIE.invite}
      </>
    );
  } else if (variant === "waiting") {
    kicker = PARTIE.copieRendueTitre.replace(/[.]$/, "");
    if (!them) {
      title = PARTIE.chercheTitre;
      body = (
        <>
          Le prochain joueur qui lance un duel au hasard passera les mêmes questions. Personne avant le {dateLabel(state.expiresAt)}{NBSP}? Le duel
          expire, sans effet sur ton ELO.
        </>
      );
    } else if (state.status === "pending") {
      title = PARTIE.attenteReponse(theirName);
      body = (
        <>
          Résultat dès qu&apos;il aura joué. Sans réponse avant le {dateLabel(state.expiresAt)}, le défi expire sans effet sur l&apos;ELO.
        </>
      );
    } else {
      title = PARTIE.attente(theirName);
      body = (
        <>
          {them.startedAt ? `En cours : ${them.answered}/${state.questionCount}.` : "Pas encore commencé."} S&apos;il ne joue pas avant le{" "}
          {dateLabel(state.expiresAt)}, tu gagnes par forfait.
        </>
      );
    }
  } else {
    kicker = state.status === "declined" ? "Défi refusé" : PARTIE.expireTitre;
    title = state.status === "declined" ? PARTIE.refuseTitre : "Le temps est écoulé";
    body = (
      <>
        {state.status === "declined"
          ? PARTIE.refuse
          : state.me.startedAt
            ? PARTIE.personneAdv
            : PARTIE.expire}
        {reviewable && PARTIE.correctionAttend}
      </>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[760px]">
      <section className="card-hero rl-in overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-line px-5 py-4 md:gap-5 md:px-8 md:py-5">
          <DuelSide
            name="Toi"
            elo={state.me.elo}
            mastery={myMastery}
            badgeSize={44}
            extra={state.me.finishedAt ? "rendu" : state.me.startedAt ? `${state.me.answered}/${state.questionCount}` : undefined}
          />
          <span className="text-muted" role="img" aria-label="contre">
            <Icone nom="duel" size={22} />
          </span>
          <DuelSide
            name={them?.username ?? "À trouver"}
            elo={them ? them.elo : null}
            align="right"
            badgeSize={44}
            extra={them ? (them.finishedAt ? "rendu" : them.startedAt ? "en jeu" : undefined) : undefined}
          />
        </div>

        <div className="grid gap-5 p-6 md:p-8">
          <div>
            <p className="kicker m-0 flex items-center gap-1.5">
              {variant === "waiting" && <Hourglass size={14} aria-hidden />}
              {kicker}
            </p>
            <h1 className="t-h1 m-0 mt-1.5">{title}</h1>
            {variant === "waiting" && them && <PresenceText userId={them.id} className="mt-1.5 text-[14px] font-semibold text-muted" />}
          </div>
          <p className="t-body m-0 max-w-[560px] text-muted">{body}</p>

          {variant === "invite" && stakes && (
            <div className="grid grid-cols-3 gap-2">
              <StakeTile label={PARTIE.enjeu.gagne} value={signed(stakes.win)} />
              <StakeTile label={PARTIE.enjeu.nulle} value={signed(stakes.draw)} />
              <StakeTile label={PARTIE.enjeu.perd} value={signed(stakes.loss)} />
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
                    <Icone nom="duel" size={16} /> {PARTIE.revanche}
                  </button>
                )}
                {reviewable && (
                  <Link href={`/duel/${state.id}?revue=1`} className="btn btn-secondary">
                    <ListChecks size={16} aria-hidden /> {PARTIE.revoirReponses}
                  </Link>
                )}
                <Link href="/duel" className="btn btn-primary">
                  {PARTIE.nouveau} <ArrowRight size={16} aria-hidden />
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
