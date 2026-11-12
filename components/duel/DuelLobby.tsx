"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Carrousel } from "@/components/ui/Carrousel";
import { ListeCourte, type Ligne } from "@/components/ui/Decors";
import type { Piece } from "@/components/ui/Presentoir";
import { ActionContour, ActionEncre, CadreZones, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { createClient } from "@/lib/supabase/browser";
import { VIDE } from "@/lib/voice";
import { PARTIE } from "@/lib/voice-z2";
import { RETOUR_AFFRONTER, SOUS_AFFRONTER } from "@/lib/voice-affronter-sous";
import {
  DUEL_MINUTES,
  DUEL_QUESTIONS,
  DUEL_WINDOW_HOURS,
  createDuel,
  duelErrorMessage,
  randomStakes,
  signed,
  stakesAgainst,
  timeLeftLabel,
  type DuelPlayerCard,
  type OpenDuel,
} from "@/lib/duels";

const D = SOUS_AFFRONTER.duel;

type Props = {
  me: { elo: number; gamesPlayed: number };
  suggestions: DuelPlayerCard[];
  /** joueur visé par /duel?adversaire=<id> */
  target: DuelPlayerCard | null;
  open: OpenDuel[];
  nowIso: string;
  /** aperçu : aucune requête, les boutons ne font rien */
  demo?: boolean;
};

/** L'en-tête du lieu (le lobby, et l'état « bientôt »). */
export function EnTeteDuel() {
  return (
    <EnTeteSousPage
      retour={RETOUR_AFFRONTER}
      titre={D.titre}
      ligne={D.ligne(DUEL_QUESTIONS, DUEL_MINUTES, DUEL_WINDOW_HOURS)}
      illustration={{ nom: "duel-lice", position: "50% 70%" }}
    />
  );
}

// Le lobby des duels, sur le modèle des sous-pages validé par Théo (2026-11-12) : l'en-tête commun
// (retour à S'affronter, la peinture de la Lice), puis le cadre à zones. À gauche, les adversaires en
// carrousel de portraits : « Défier X » vise le portrait de devant (un clic dessus ouvre son profil, ou
// le duel déjà en cours contre lui) ; dessous, l'action : défier ce joueur, ou un duel au hasard, et
// l'enjeu. Dans la colonne grise, tes duels en cours (les défis reçus et ceux où c'est à
// toi d'abord) : chacun s'ouvre sur sa page, où l'on accepte, joue ou attend. Les duels terminés se
// revoient depuis S'affronter ; la recherche est dans la barre du haut.
export function DuelLobby({ me, suggestions, target, open, nowIso, demo = false }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => (demo ? null : createClient()), [demo]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** le portrait de devant dans le carrousel : c'est lui que vise « Défier X » */
  const [devant, setDevant] = useState(0);

  const stakes = randomStakes(me.elo, me.gamesPlayed);
  const openByOpponent = new Map(open.filter((d) => d.opponentId).map((d) => [d.opponentId as string, d.id]));
  const waitingRandom = open.find((d) => d.mode === "random" && d.status === "pending" && !d.opponentId);

  async function run(key: string, action: () => Promise<void>) {
    if (busy) return;
    if (demo) {
      setError("Aperçu : les boutons ne lancent rien ici.");
      return;
    }
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(duelErrorMessage(e));
      setBusy(null);
    }
  }

  const launchRandom = () =>
    run("random", async () => {
      const r = await createDuel(supabase!, null);
      router.push(`/duel/${r.id}`);
    });

  const challenge = (userId: string) =>
    run(userId, async () => {
      const r = await createDuel(supabase!, userId);
      router.push(`/duel/${r.id}`);
    });

  // les adversaires : celui que vise /duel?adversaire=<id> devant, puis les suggestions
  const joueurs = target ? [target, ...suggestions.filter((p) => p.userId !== target.userId)] : suggestions;
  const pieces: Piece[] = joueurs.map((p, i) => {
    const existant = openByOpponent.get(p.userId);
    const nom = p.username ?? D.joueur;
    return {
      cle: p.userId,
      href: existant ? `/duel/${existant}` : `/people/${encodeURIComponent(p.userId)}`,
      numero: String(i + 1).padStart(2, "0"),
      code: nom,
      titre: nom,
      image: p.avatarUrl,
    };
  });

  // le joueur de devant (sans duel déjà en cours contre lui) : son défi passe devant le duel au hasard
  const auMilieu = joueurs[devant] ?? null;
  const cible = auMilieu && !openByOpponent.has(auMilieu.userId) ? auMilieu : null;
  const enjeuCible = cible ? stakesAgainst(me.elo, me.gamesPlayed, cible.elo) : null;
  const enjeu = enjeuCible
    ? D.enjeu(signed(enjeuCible.win), signed(enjeuCible.loss))
    : D.enjeu(`${signed(stakes.win.lo)} à ${signed(stakes.win.hi)}`, `${signed(stakes.loss.hi)} à ${signed(stakes.loss.lo)}`);
  const libelleHasard = busy === "random" ? PARTIE.recherche : waitingRandom ? PARTIE.reprendre : PARTIE.trouver;

  // tes duels en cours : les défis reçus, puis ceux où c'est à toi, puis les autres
  const urgence = (d: OpenDuel) => (d.incoming && d.status === "pending" ? 0 : d.status === "active" && !d.myFinished ? 1 : 2);
  const lignes: Ligne[] = [...open]
    .sort((a, b) => urgence(a) - urgence(b))
    .map((d) => ({
      cle: d.id,
      titre: d.opponentId ? (d.opponentName ?? D.unJoueur) : D.hasard,
      detail: sousDuel(d, nowIso),
      href: `/duel/${d.id}`,
      marque: urgence(d) < 2,
    }));

  return (
    <SousPage entete={<EnTeteDuel />}>
      <CadreZones
        gauche={{
          titre: D.choisir,
          contenu: (
            <div className="grid min-w-0 gap-4">
              {pieces.length > 0 ? (
                <Carrousel key={target?.userId ?? "aucun"} forme="portrait" pieces={pieces} action={D.choisirAction} onActif={setDevant} />
              ) : (
                <p className="t-small m-0">{VIDE.adversaires}</p>
              )}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                {cible ? (
                  <>
                    <ActionEncre onClick={() => void challenge(cible.userId)} disabled={busy !== null}>
                      {busy === cible.userId ? "…" : D.defier(cible.username ?? D.joueur)} <ArrowRight size={16} aria-hidden />
                    </ActionEncre>
                    <ActionContour onClick={() => void launchRandom()}>{busy === "random" ? PARTIE.recherche : D.hasard}</ActionContour>
                  </>
                ) : (
                  <ActionEncre onClick={() => void launchRandom()} disabled={busy !== null}>
                    {libelleHasard} <ArrowRight size={16} aria-hidden />
                  </ActionEncre>
                )}
              </div>
              <p className="t-micro m-0 text-center">{enjeu}</p>
              {error && (
                <p role="alert" className="m-0 text-center text-sm text-pen">
                  {error}
                </p>
              )}
            </div>
          ),
        }}
        droite={{ titre: D.enCours, contenu: <ListeCourte lignes={lignes} vide={D.enCoursVide} /> }}
      />
    </SousPage>
  );
}

/** Le point d'un duel en cours, en quelques mots (la colonne « Tes duels en cours »). */
function sousDuel(d: OpenDuel, nowIso: string): string {
  const reste = timeLeftLabel(d.expiresAt, nowIso);
  if (d.status === "pending" && d.incoming) return reste ? `à accepter · ${reste}` : "à accepter";
  if (d.status === "pending" && !d.opponentId) return d.myFinished ? "on cherche" : "en attente";
  if (d.status === "pending") return d.myFinished ? "copie rendue" : "pas encore accepté";
  if (d.myFinished) return d.theirFinished ? "résultat imminent" : d.theirStarted ? "il joue" : "pas encore joué";
  return reste ? `à toi · ${reste}` : "à toi";
}
